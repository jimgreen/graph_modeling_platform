// /webgrp/v1/receive 联调接收端测试：
// tmpdir → GRAPH_MODEL_DATA_DIR → 起真实 server（端口 0），用真实 fetch 发 multipart，
// 断言字段/文件名/字节数与 GBK 回显，以及 GET 回看、DELETE 清空。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import iconv from "iconv-lite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";

installDomShim();

const receivePath = apiPath("/v1/receive");

let dataDir;
let server;
let baseUrl;

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "v1-receive-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

function postMultipart() {
  const form = new FormData();
  form.append("model_id", "7");
  form.append("model_name", "厂站模型");
  form.append("scheme_path", JSON.stringify(["发送方案"]));
  form.append(
    "e_file",
    new Blob([iconv.encode("<Section>母线一</Section>", "gbk")], { type: "text/plain; charset=gbk" }),
    "厂站模型.e"
  );
  form.append(
    "json_file",
    new Blob([Buffer.from('{"name":"厂站模型"}', "utf-8")], { type: "application/json; charset=utf-8" }),
    "厂站模型.json"
  );
  return fetch(`${baseUrl}${receivePath}`, { method: "POST", body: form });
}

function fieldOf(payload, name) {
  return payload.data.received.fields.find((field) => field.name === name);
}

describe(`${receivePath} 接收`, () => {
  test("multipart：解析字段名/文件名/字节数，并按 charset 回显内容", async () => {
    const res = await postMultipart();
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);

    const received = payload.data.received;
    expect(received.contentType).toContain("multipart/form-data; boundary=");
    expect(received.totalBytes).toBeGreaterThan(0);

    // 文本字段：直接可读
    expect(fieldOf(payload, "model_id").text).toBe("7");
    expect(fieldOf(payload, "model_name").text).toBe("厂站模型");
    expect(fieldOf(payload, "scheme_path").text).toBe('["发送方案"]');

    // 文件字段：文件名、MIME、字节数与解码回显
    const eFile = fieldOf(payload, "e_file");
    expect(eFile.kind).toBe("file");
    expect(eFile.filename).toBe("厂站模型.e");
    expect(eFile.contentType).toContain("charset=gbk");
    expect(eFile.bytes).toBe(iconv.encode("<Section>母线一</Section>", "gbk").length);
    // GBK 字节按 charset=gbk 解码，中文不乱码
    expect(eFile.preview).toContain("母线一");

    const jsonFile = fieldOf(payload, "json_file");
    expect(jsonFile.filename).toBe("厂站模型.json");
    expect(jsonFile.preview).toContain("厂站模型");
  });

  test("非 multipart：按原样收下并给出文本回显", async () => {
    const res = await fetch(`${baseUrl}${receivePath}`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ hello: "世界" })
    });
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.data.received.fields).toHaveLength(1);
    expect(payload.data.received.fields[0].kind).toBe("raw");
    expect(payload.data.received.fields[0].text).toContain("世界");
  });

  test("GET 回看最近一次，DELETE 清空", async () => {
    await fetch(`${baseUrl}${receivePath}`, { method: "POST", body: "x" });
    const latest = await (await fetch(`${baseUrl}${receivePath}`)).json();
    expect(latest.data.count).toBeGreaterThan(0);
    expect(latest.data.latest).not.toBeNull();

    const cleared = await (await fetch(`${baseUrl}${receivePath}`, { method: "DELETE" })).json();
    expect(cleared.data.cleared).toBeGreaterThan(0);

    const after = await (await fetch(`${baseUrl}${receivePath}`)).json();
    expect(after.data.count).toBe(0);
    expect(after.data.latest).toBeNull();
  });

  test("内存只留最近 5 次：淘汰的是最旧的（文档承诺的 MAX_RECORDS，此前无覆盖）", async () => {
    // apiV1Receive.mjs 的模块注释与 server/CLAUDE.md 都写明「内存留最近 5 次」。
    // 越界淘汰靠 `records.splice(0, records.length - MAX_RECORDS)` 手工维护：
    //   - 漏掉 → 内存随联调次数无限增长（无鉴权端点，任何跨源请求都能灌）
    //   - 起点写成 1 → 8 条里 splice(1,3) 后**长度仍恰好是 5**，而且最新那条
    //     恰好还在，只有最旧那条被错留下。`count` 与 `latest` 都区分不出来，
    //     必须靠 receivedAtList 里有没有「第一次投递之前」的时间戳来判。
    //
    // receivedAt 是毫秒精度，故每次投递之间留 gap，避免同毫秒导致时间戳不可比。
    const gap = () => new Promise((r) => setTimeout(r, 5));
    await fetch(`${baseUrl}${receivePath}`, { method: "DELETE" });

    let beforeFourth = 0;
    for (let i = 0; i < 8; i += 1) {
      if (i === 3) {
        // 第 4 次投递（index 3）之前的时间戳：留下的 5 条应当都晚于它
        beforeFourth = Date.now();
      }
      await fetch(`${baseUrl}${receivePath}`, { method: "POST", body: `payload-${i}` });
      await gap();
    }

    const view = await (await fetch(`${baseUrl}${receivePath}`)).json();
    expect(view.data.count, "超过上限后应淘汰到只剩 5 条").toBe(5);
    expect(view.data.receivedAtList).toHaveLength(5);

    // latest 是最后一次投递
    expect(view.data.latest.fields[0]?.text).toBe("payload-7");

    // 关键判据：不该残留任何早于第 4 次投递的记录（起点写成 1 时会留下第 1 次）
    const stale = view.data.receivedAtList.filter((t) => new Date(t).getTime() < beforeFourth);
    expect(stale, "残留了早于第 4 次投递的记录 —— 淘汰起点写错").toEqual([]);

    // 清空后计数归零，且不残留
    await fetch(`${baseUrl}${receivePath}`, { method: "DELETE" });
    const after = await (await fetch(`${baseUrl}${receivePath}`)).json();
    expect(after.data.count).toBe(0);
  });
});

// 本端点数据是进程内全局的（内存留最近 5 次、不落盘、handler 不接 ctx），故派发层把
// /v1/receive 与 /spaces、/exports/native/* 一并短路：不解析空间、不注入空间上下文。
describe(`${receivePath} 与空间无关`, () => {
  test("未知/缺失空间标识都不拦，也不写回空间 Cookie", async () => {
    // 鉴别力：把本端点从派发层短路名单里去掉 —— 第一条会变成 400 SPACE_UNKNOWN；
    // 第二条虽仍 200，但会多出 X-Space-Fallback（无来源时回退首空间并写回 Cookie）。
    const unknown = await fetch(`${baseUrl}${receivePath}?space=${encodeURIComponent("不存在的空间")}`);
    expect(unknown.status).toBe(200);
    expect(unknown.headers.get("x-space-fallback")).toBeNull();

    const bare = await fetch(`${baseUrl}${receivePath}`);
    expect(bare.status).toBe(200);
    expect(bare.headers.get("x-space-fallback")).toBeNull();
  });
});

// 把记录清零，使「本轮投递有没有落记录」不依赖前面用例留下的条数。
function resetRecords() {
  return fetch(`${baseUrl}${receivePath}`, { method: "DELETE" });
}

// 此前无覆盖的分支：L44/L50（超限）、L87（缺 content-type 头）、L104（catch）。
//
// 另记一条**判为不可达**的：L21 的 `String(contentTypeText ?? "")` 右臂。
//   - `charsetOf` 只有两个调用点：`decodePreview(bytes, value.type)` 与
//     `decodeFields` 尾部的 `decodePreview(raw, contentTypeText)`。
//   - 前者的 `value.type` 恒为非空字符串：multipart 里不带 Content-Type 的 part，
//     undici 的 formData() 也会补成 `text/plain`（实测确认）。
//   - 后者拿到的就是 L87 归一后的 `String(...)` 结果，本身恒为字符串。
//   即两头都喂不进 null/undefined，右臂无从求值。
//   退一步说即便喂进去也不可观测：`String(undefined)`="undefined"、`String(null)`="null"，
//   两者都不含 `charset` 子串，`/charset\s*=\s*"?([^";]+)"?/iu.exec` 必然不匹配，
//   于是 `name` 都是 `""`、返回都是 `"utf-8"` —— 与 `?? ""` 逐字符等价（可证前提：
//   函数体只有这一个消费点）。所以不为它写恒绿断言。
describe(`${receivePath} 此前未覆盖的分支`, () => {
  test("请求体超过 32MB 接收上限：413 + 本端点自己的上限文案，且不留记录", async () => {
    // L44 `total > MAX_RECEIVE_BYTES` 与 L50 `if (oversize)` 同一条路径，一起覆盖。
    // 上限是模块常量 32 * 1024 * 1024，只能真发一个超限体（实测 ~90ms）。
    //
    // 附带契约（模块注释：超限时**读完整个流但不再累积**）：提前中断会让 Node 在
    // 响应写出前重置连接，客户端只看到 ECONNRESET。所以这里 fetch 必须正常拿到
    // 响应而不是抛 "fetch failed" —— 上限被改成提前 destroy 时这条断言就红。
    await resetRecords();
    const res = await fetch(`${baseUrl}${receivePath}`, {
      method: "POST",
      body: Buffer.alloc(33 * 1024 * 1024, 0x61)
    });
    expect(res.status, "超限应回 413，而不是断开连接").toBe(413);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("payload-too-large");
    // 文案要点名 33554432：派发层 server.mjs 另有一个 PayloadTooLargeError，
    // 文案是「请求体过大。」。若上限被挪到别处/派发层先动手，这条 toContain 会红。
    expect(payload.error.message).toContain("33554432");

    // 抛在 records.push 之前：这次投递不留痕
    const view = await (await fetch(`${baseUrl}${receivePath}`)).json();
    expect(view.data.count, "超限的投递不该进记录").toBe(0);
    expect(view.data.latest).toBeNull();
  });

  test("请求未带 content-type 头：contentType 归一成空串（不是字符串 undefined）", async () => {
    // L87 的 `?? ""`：右臂要的是「头字段不存在」。undici 只有在 body 是
    // ArrayBuffer/TypedArray 时才不发 content-type —— 字符串、FormData、Blob
    // 都会被自动补上，所以必须传字节数组，否则右臂从未求值、断言恒绿。
    await resetRecords();
    const text = "无头裸字节 body";
    const bytes = new TextEncoder().encode(text);
    const res = await fetch(`${baseUrl}${receivePath}`, { method: "POST", body: bytes });
    expect(res.status).toBe(200);
    const received = (await res.json()).data.received;
    // 判别点：`??` 被删后这里是 String(undefined) 的产物 "undefined"
    expect(received.contentType, "缺头时 contentType 必须是空串").toBe("");
    expect(received.totalBytes).toBe(bytes.byteLength);
    expect(received.fields).toHaveLength(1);
    expect(received.fields[0].name).toBe("(raw)");
    expect(received.fields[0].kind).toBe("raw");
    expect(received.fields[0].text).toBe(text);
  });

  test("声明 multipart 却给不出合法正文：catch 回 400 bad-request 并透出原始 error.message", async () => {
    // L104 的 catch：undici 的 formData() 抛 TypeError("Failed to parse body as FormData.")。
    // 文案只断言含 "FormData"：措辞随 undici 版本变，但「透出 error.message」这条
    // 契约稳定 —— 若走了 `: "请求体解析失败。"` 那一臂（error 不是 Error，或三元写反），
    // 下面两条断言都会红。
    await resetRecords();
    const res = await fetch(`${baseUrl}${receivePath}`, {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=ZZZBOUNDARY" },
      body: "这不是 multipart 的正文"
    });
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("bad-request");
    expect(payload.error.message).toContain("FormData");
    expect(payload.error.message, "error 是 Error 实例，不该走固定文案兜底").not.toBe("请求体解析失败。");

    // catch 发生在 records.push 之前：解析失败这次投递不留痕
    const view = await (await fetch(`${baseUrl}${receivePath}`)).json();
    expect(view.data.count, "解析失败的投递不该进记录").toBe(0);
  });
});
