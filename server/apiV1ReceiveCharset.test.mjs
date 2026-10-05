// server/apiV1Receive.mjs 的编码判定与内存记录行为 —— charsetOf 未导出，经 POST 端点观测。
//
// ## 为什么这层值得测
//
// `/v1/receive` 是「发送模型」链路的联调接收端：把目标 URL 指到这里，就能看到
// 整条发送链发过来的原始字节。它的价值全在**如实回显**上 —— 回显错了，联调时
// 看到的就是「对方发错了」，而不是「我们的接收端解错了」。
//
// 编码判定（charsetOf）决定回显时按 GBK 还是 UTF-8 解字节：
//   - 判错的后果是**回显乱码**，而联调者会误判成对端编码不对；
//   - 而且乱码只在真发 GBK 字节时才出现，发 UTF-8 时两者结果一样 —— 所以这条
//     分支在「只测 UTF-8」的测试里永远绿。
//
// ## 内存记录
//
// records 是模块级数组，保留最近 5 条。这个「只留 5 条」的行为此前无测试：
// 联调者发第 6 条后回看，期望前 5 条还在、第 1 条已被挤掉。
//
// 注意：`.test.mjs` 必须是纯 JS —— 不要写 `as never` / 类型标注 / 非空断言，
// 那些会触发 RollupError: Parse failure，表现为「Tests: no tests」（看着像通过，实际没跑）。
import { describe, expect, test, beforeEach } from "vitest";
import iconv from "iconv-lite";
import {
  handleV1ReceiveDelete,
  handleV1ReceiveGet,
  handleV1ReceivePost
} from "./apiV1Receive.mjs";
import { fakeRequest, fakeResponse, fakeUrl } from "./handlerTestHarness.mjs";

/** POST 一段原始字节，观察回显里解出来的文本。 */
async function postRaw(bytes, contentType) {
  const response = fakeResponse();
  const request = fakeRequest({ body: bytes });
  request.headers = { "content-type": contentType };
  // path 会原样进回执，故传真实路径而非 fakeUrl 的默认占位
  const url = new URL("http://127.0.0.1/webgrp/v1/receive?probe=1");
  await handleV1ReceivePost({ request, response, url });
  return response.json();
}

async function clear() {
  const response = fakeResponse();
  await handleV1ReceiveDelete({ request: fakeRequest({}), response });
  return response.json();
}

async function peek() {
  const response = fakeResponse();
  await handleV1ReceiveGet({ request: fakeRequest({}), response });
  return response.json().data;
}

const TEXT = "1号主变压器 断路器";
const GBK_BYTES = iconv.encode(TEXT, "gbk");

beforeEach(async () => {
  await clear();
});

describe("charsetOf：经 POST 回显观测", () => {
  test("charset=gbk 按 GBK 解（UTF-8 解同一段字节会是乱码）", async () => {
    const payload = await postRaw(GBK_BYTES, "text/plain; charset=gbk");
    expect(payload.ok).toBe(true);
    // 关键断言：UTF-8 解这段 GBK 字节不会得到原文，故这是真的走了 GBK 分支
    expect(GBK_BYTES.toString("utf-8")).not.toBe(TEXT);
    expect(payload.data.received.fields[0].text).toContain(TEXT);
  });

  test("charset=gb2312 / gb18030 都归一到 GBK", async () => {
    for (const charset of ["gb2312", "gb18030"]) {
      const payload = await postRaw(GBK_BYTES, `text/plain; charset=${charset}`);
      expect(payload.data.received.fields[0].text, charset).toContain(TEXT);
    }
  });

  test("charset 大小写不敏感", async () => {
    for (const charset of ["GBK", "Gbk", "gBk"]) {
      const payload = await postRaw(GBK_BYTES, `text/plain; charset=${charset}`);
      expect(payload.data.received.fields[0].text, charset).toContain(TEXT);
    }
  });

  test("charset 带引号与多余空白也能提取", async () => {
    for (const charset of ['"gbk"', " gbk ", '"GBK"']) {
      const payload = await postRaw(GBK_BYTES, `text/plain; charset=${charset}`);
      expect(payload.data.received.fields[0].text, charset).toContain(TEXT);
    }
  });

  test("charset 缺省按 UTF-8", async () => {
    const utf8 = new TextEncoder().encode(TEXT);
    for (const contentType of ["text/plain", "application/octet-stream", ""]) {
      const payload = await postRaw(utf8, contentType);
      expect(payload.data.received.fields[0].text, contentType).toContain(TEXT);
    }
  });

  test("未知 charset 按 UTF-8（不是猜错编码后静默乱码）", async () => {
    for (const charset of ["utf-16", "latin1", "big5", "乱写"]) {
      const payload = await postRaw(new TextEncoder().encode(TEXT), `text/plain; charset=${charset}`);
      expect(payload.data.received.fields[0].text, charset).toContain(TEXT);
    }
  });

  test("utf-8 显式声明时按 UTF-8", async () => {
    const payload = await postRaw(new TextEncoder().encode(TEXT), "text/plain; charset=utf-8");
    expect(payload.data.received.fields[0].text).toContain(TEXT);
  });
});

describe("回显的其它字段", () => {
  test("raw body 归一成一个 (raw) 字段，带字节数与原 path", async () => {
    const payload = await postRaw(new TextEncoder().encode(TEXT), "text/plain");
    const received = payload.data.received;
    expect(received.fields).toHaveLength(1);
    expect(received.fields[0].name).toBe("(raw)");
    expect(received.fields[0].kind).toBe("raw");
    // byteLength 是**字节数**不是字符数 —— 中文 2 字节
    expect(received.fields[0].bytes).toBe(Buffer.byteLength(TEXT, "utf-8"));
    expect(received.totalBytes).toBe(Buffer.byteLength(TEXT, "utf-8"));
    expect(received.method).toBe("POST");
    expect(received.contentType).toBe("text/plain");
    // path 含 query（原样回显，便于联调时确认打到了哪个 URL）
    expect(received.path).toBe("/webgrp/v1/receive?probe=1");
  });

  test("空 body 不产出字段（而不是造一个空 (raw)）", async () => {
    const response = fakeResponse();
    await handleV1ReceivePost({
      request: fakeRequest({ body: undefined }),
      response,
      url: new URL("http://127.0.0.1/webgrp/v1/receive")
    });
    const payload = response.json();
    expect(payload.data.received.fields).toEqual([]);
    expect(payload.data.received.totalBytes).toBe(0);
  });

  test("multipart 的文本字段按 UTF-8 计数并截断回显", async () => {
    const boundary = "----probe123";
    const long = "A".repeat(300);
    const body = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="note"\r\n\r\n${long}\r\n--${boundary}--\r\n`,
      "utf-8"
    );
    const payload = await postRaw(body, `multipart/form-data; boundary=${boundary}`);
    const field = payload.data.received.fields[0];
    expect(field.name).toBe("note");
    expect(field.kind).toBe("text");
    // 字节数是全量，回显截到 200 字符
    expect(field.bytes).toBe(Buffer.byteLength(long, "utf-8"));
    expect(field.text.length).toBe(200);
  });

  test("multipart 的文件字段按自身 content-type 判编码", async () => {
    const boundary = "----probe456";
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="model"; filename="a.e"\r\nContent-Type: application/octet-stream; charset=gbk\r\n\r\n`,
        "utf-8"
      ),
      GBK_BYTES,
      Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8")
    ]);
    const payload = await postRaw(body, `multipart/form-data; boundary=${boundary}`);
    const field = payload.data.received.fields[0];
    expect(field.kind).toBe("file");
    expect(field.filename).toBe("a.e");
    // 字段自带 charset=gbk ⇒ 按 GBK 解出原文
    expect(field.preview).toContain(TEXT);
  });

  test("回显上限 512 字节，超长只截断不影响 totalBytes", async () => {
    const long = "B".repeat(2000);
    const payload = await postRaw(new TextEncoder().encode(long), "text/plain");
    const field = payload.data.received.fields[0];
    // 文本字段再截到 200 字符
    expect(field.text.length).toBe(200);
    expect(payload.data.received.totalBytes).toBe(2000);
  });

  test("receivedAt 是合法 ISO 时间戳", async () => {
    const payload = await postRaw(new TextEncoder().encode("x"), "text/plain");
    expect(Number.isFinite(Date.parse(payload.data.received.receivedAt))).toBe(true);
  });
});

// ─── 512 字节截点落在多字节字符中间 ─────────────────────────
//
// 预览按**字节**硬截在 512（`subarray(0, PREVIEW_BYTES)`），而中文在 UTF-8 里 3 字节、
// 在 GBK 里 2 字节 ⇒ 截点有相当概率落在字符中间。直接 toString 会把残缺字节解成
// U+FFFD（GBK 则吐替换字形），联调者看到的是「对方发错字节」，而不是「截断了」。
//
// 契约：截点回退到合法字符边界，**只丢半个字符，绝不多丢一个完整字符**。所以每条
// 用例都断言到「字节/字符确切等于某个值」：
//   - 只断言「不含 U+FFFD」分不出「回退过头」（少吐一个完整字符照样不含 U+FFFD）；
//   - 只断言「长度 ≤ 上限」分不出「没回退」（多一个 U+FFFD 字符照样 ≤ 上限）。
// 两个方向的失败必须能被各自的断言抓住，故都用 toBe 钉死完整文本。
//
// 用 **multipart 文件字段**观测：raw body 那条路径额外做了 `slice(0, 200)` 的字符
// 二次截断（TEXT_FIELD_PREVIEW_CHARS），会把 512 字节处的尾巴切掉，字节级断言不可见；
// 文件字段的 preview 只经 decodePreview，截断点即所见即所测。
async function postFilePart(bytes, partContentType) {
  const boundary = "----probeBoundary";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="model"; filename="a.e"\r\nContent-Type: ${partContentType}\r\n\r\n`,
      "utf-8"
    ),
    Buffer.from(bytes),
    Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8")
  ]);
  return postRaw(body, `multipart/form-data; boundary=${boundary}`);
}

/** postFilePart 的预览文本。 */
async function previewOf(bytes, partContentType) {
  const payload = await postFilePart(bytes, partContentType);
  expect(payload.ok).toBe(true);
  const field = payload.data.received.fields[0];
  expect(field.kind, "应落在文件字段而不是文本字段").toBe("file");
  return field.preview;
}

describe("512 字节截断回退到字符边界", () => {
  test("UTF-8：截点切在三字节「中」的第 2 字节后 → 丢半个字符，不回显 U+FFFD", async () => {
    // 填充 510 字节 ⇒ 「中」占 510-512，subarray(0,512) 只拿到它的前 2 字节。
    // 正确结果：510 个 A，一个中文字都不留（半个字符不配进文本）。
    // 回退过头会变成 509 个 A；不回退则是 510 个 A + 「\uFFFD」。
    const preview = await previewOf(
      Buffer.from(`${"A".repeat(510)}中TAIL`, "utf-8"),
      "application/octet-stream"
    );
    expect(preview, "截断处不许出现替换字符").not.toContain("\uFFFD");
    expect(preview).toBe("A".repeat(510));
    expect(preview).toHaveLength(510);
    expect(preview).not.toContain("中");
    expect(preview).not.toContain("TAIL");
  });

  test("UTF-8：四字节字符（emoji）被切在第 3 字节后 → 回退 3 字节到位", async () => {
    // 😀 占 509-512（4 字节），512 截点落在它的最后一个字节之前：
    // 边界回退的搜索窗口必须够 4 字节（前导字节 + 3 个续字节），否则会把半个
    // emoji 当成一个完整字符留下 U+FFFD。
    const preview = await previewOf(
      Buffer.from(`${"A".repeat(509)}\u{1F600}TAIL`, "utf-8"),
      "application/octet-stream"
    );
    expect(preview, "截断处不许出现替换字符").not.toContain("\uFFFD");
    expect(preview).toBe("A".repeat(509));
    expect(preview).not.toContain("\u{1F600}");
  });

  test("UTF-8：恰好 512 字节且末字符完整 → 一个字节都不多丢", async () => {
    // 509 + 3 = 512：截点正好落在「中」的**末尾**，是合法边界。
    // 这条专门抓「回退过头」——无条件砍掉尾字符的实现会少掉这个「中」而输出 509 个 A。
    const exact = `${"A".repeat(509)}中`;
    expect(Buffer.byteLength(exact, "utf-8"), "fixture 必须恰好 512 字节").toBe(512);
    const preview = await previewOf(Buffer.from(exact, "utf-8"), "application/octet-stream");
    expect(preview).toBe(exact);
    expect(preview.endsWith("中"), "合法的尾部字符必须留着").toBe(true);
    expect(preview).toHaveLength(510);
    expect(preview).not.toContain("\uFFFD");
  });

  test("GBK：截点切在双字节「中」的前导字节之后 → 只丢那 1 字节", async () => {
    // 「中」在 GBK 里是 D6 D0（2 字节）。填充 511 字节 ⇒ 前导字节落在 511 位，
    // 512 截点把它切成孤零零一个前导字节，丢掉它即可（GBK 回退恒 ≤1 字节）。
    // 不回退时 iconv 解出来是一个替换字形；回退过头则只剩 510 个 B。
    const preview = await previewOf(
      iconv.encode(`${"B".repeat(511)}中TAIL`, "gbk"),
      "application/octet-stream; charset=gbk"
    );
    expect(preview, "截断处不许出现替换字符").not.toContain("\uFFFD");
    expect(preview).toBe("B".repeat(511));
    expect(preview).toHaveLength(511);
    expect(preview).not.toContain("中");
    expect(preview).not.toContain("TAIL");
  });

  test("GBK：恰好 512 字节且末字符完整 → 不许丢「中」的续字节", async () => {
    // 「中」= D6 D0，续字节 0xD0 **本身也落在 GBK 前导区间 0x81-0xFE 内**。
    // 所以「看末字节是不是前导字节就砍掉」这种实现会把这条的正确输出砍成
    // 510 个 B（少一个完整字符）—— 这条用例就是那道判别题。
    const exact = "B".repeat(510) + "中";
    expect(iconv.encode(exact, "gbk").length, "fixture 必须恰好 512 字节").toBe(512);
    const preview = await previewOf(
      iconv.encode(exact, "gbk"),
      "application/octet-stream; charset=gbk"
    );
    expect(preview).toBe(exact);
    expect(preview.endsWith("中")).toBe(true);
    expect(preview).not.toContain("\uFFFD");
  });

  test("raw body：整段中文也能看到同样的回退（不经 200 字符二次截断）", async () => {
    // raw body 的 preview 之后还要 slice(0, 200) 字符，所以要用「中文占比高」的
    // payload：200 个中文字 = 600 字节，512 截点落在第 171 个字的第 2 字节后，
    // 回退后剩 170 个中文字（170 < 200，二次截断不动它），字节级断言仍然可见。
    const payload = await postRaw(new TextEncoder().encode("中".repeat(200)), "text/plain");
    const field = payload.data.received.fields[0];
    expect(field.kind).toBe("raw");
    expect(field.text, "截断处不许出现替换字符").not.toContain("\uFFFD");
    expect(field.text).toBe("中".repeat(170));
    // 不回退时是 170 个中文字 + 1 个 U+FFFD（171 字符）；回退过头则是 169 个。
    expect(field.text).toHaveLength(170);
  });
});

describe("内存记录：只留最近 5 条", () => {
  test("第 6 条挤掉第 1 条（不是无上限增长）", async () => {
    for (let index = 1; index <= 6; index += 1) {
      await postRaw(new TextEncoder().encode(`第${index}条`), "text/plain");
    }
    const snapshot = await peek();
    expect(snapshot.count).toBe(5);
    expect(snapshot.receivedAtList).toHaveLength(5);
    // latest 是最后一条
    expect(snapshot.latest.fields[0].text).toContain("第6条");
  });

  test("latest 始终是最近一次，GET 不消费记录", async () => {
    await postRaw(new TextEncoder().encode("第一条"), "text/plain");
    await postRaw(new TextEncoder().encode("第二条"), "text/plain");
    const first = await peek();
    expect(first.latest.fields[0].text).toContain("第二条");
    const second = await peek();
    expect(second.latest.fields[0].text).toContain("第二条");
    expect(second.count).toBe(2);
  });

  test("DELETE 回清空条数，GET 的 latest 变 null", async () => {
    await postRaw(new TextEncoder().encode("x"), "text/plain");
    await postRaw(new TextEncoder().encode("y"), "text/plain");
    expect((await clear()).data.cleared).toBe(2);
    const after = await peek();
    expect(after.count).toBe(0);
    expect(after.latest).toBeNull();
    expect(after.receivedAtList).toEqual([]);
  });

  test("空表时 DELETE 回 cleared:0（不是负数）", async () => {
    expect((await clear()).data.cleared).toBe(0);
  });
});
