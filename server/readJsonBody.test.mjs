import { describe, expect, test } from "vitest";
import { DEFAULT_JSON_BODY_LIMIT_BYTES, readJsonBody } from "./readJsonBody.mjs";

function requestFrom(...chunks) {
  return (async function* () {
    for (const chunk of chunks) yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  })();
}

/** 与 requestFrom 不同：把 chunk 原样 yield，不补 Buffer —— 用来喂非 Buffer chunk。 */
function rawRequestFrom(...chunks) {
  return (async function* () {
    for (const chunk of chunks) yield chunk;
  })();
}

describe("readJsonBody", () => {
  test("空 body 返回空对象", async () => {
    await expect(readJsonBody(requestFrom())).resolves.toEqual({});
  });

  test("合法 JSON 正常解析", async () => {
    await expect(readJsonBody(requestFrom('{"name":"模型","count":2}')))
      .resolves.toEqual({ name: "模型", count: 2 });
  });

  test("非 JSON body 抛 SyntaxError", async () => {
    await expect(readJsonBody(requestFrom("not-json"))).rejects.toThrow(SyntaxError);
  });

  test("超过 limitBytes 抛 payload-too-large", async () => {
    await expect(readJsonBody(requestFrom("{}"), { limitBytes: 1 }))
      .rejects.toMatchObject({ code: "payload-too-large" });
  });

  test("超限后仍读完整个流", async () => {
    const chunks = [Buffer.from("{}"), Buffer.from("x"), Buffer.from("y")];
    let consumed = 0;
    const request = (async function* () {
      for (const chunk of chunks) {
        consumed += 1;
        yield chunk;
      }
    })();

    await expect(readJsonBody(request, { limitBytes: 2 }))
      .rejects.toMatchObject({ code: "payload-too-large" });
    expect(consumed).toBe(chunks.length);
  });

  test("body 恰好等于 limitBytes 时不超限", async () => {
    await expect(readJsonBody(requestFrom("{}"), { limitBytes: 2 })).resolves.toEqual({});
  });

  test("缺省 limitLabel 使用 formatBytes 的 MB 与 KB 文案", async () => {
    await expect(readJsonBody(requestFrom(Buffer.alloc(DEFAULT_JSON_BODY_LIMIT_BYTES + 1))))
      .rejects.toMatchObject({
        code: "payload-too-large",
        message: "请求体超过 1MB 上限。"
      });
    await expect(readJsonBody(requestFrom(Buffer.alloc(1024 + 1)), { limitBytes: 1024 }))
      .rejects.toMatchObject({
        code: "payload-too-large",
        message: "请求体超过 1KB 上限。"
      });
  });

  test("传入 limitLabel 时使用自定义文案", async () => {
    await expect(readJsonBody(requestFrom("123"), { limitBytes: 2, limitLabel: "自定义容量" }))
      .rejects.toMatchObject({ message: "请求体超过 自定义容量 上限。" });
  });

  test("跨 chunk 拼接 JSON 后解析", async () => {
    await expect(readJsonBody(requestFrom(Buffer.from('{"value":'), Buffer.from("42}"))))
      .resolves.toEqual({ value: 42 });
  });

  // ── 以下四组是边界口径的钉子，先读源码确认过行为再写的 ──────────────────

  test("body 前置 UTF-8 BOM 时当前不剥 BOM 直接抛 SyntaxError", async () => {
    // 源码只做 Buffer.concat(...).toString("utf-8")，没有剥 BOM；
    // 于是 body 非空 → 走 JSON.parse → V8 拒绝 U+FEFF 前缀。
    // 这是**现状契约**：若将来在读取层剥 BOM，这条会红，届时同步改实现与断言。
    const bomBody = Buffer.from('﻿{"a":1}', "utf-8");
    expect(bomBody.toString("utf-8").charCodeAt(0)).toBe(0xfeff); // 前置 BOM 确实进了 chunk
    await expect(readJsonBody(requestFrom(bomBody))).rejects.toThrow(SyntaxError);
    // 对照：无 BOM 的同一份 JSON 正常解析（证明红的只有 BOM，不是 JSON 本身）
    await expect(readJsonBody(requestFrom(Buffer.from('{"a":1}', "utf-8"))))
      .resolves.toEqual({ a: 1 });
  });

  test("纯空白 body 走 JSON.parse 抛错分支而不是返回空对象", async () => {
    // 分支判据是 body 字符串自身的真值，不是 trim 后是否为空：
    // 空白是非空字符串 → truthy → 进 JSON.parse → SyntaxError；
    // 只有真正的零长度 body（Buffer.alloc(0)）才落到 {} 分支。
    await expect(readJsonBody(requestFrom(Buffer.from("   ")))).rejects.toThrow(SyntaxError);
    await expect(readJsonBody(requestFrom(Buffer.from("\n\t ")))).rejects.toThrow(SyntaxError);
    await expect(readJsonBody(requestFrom(Buffer.alloc(0)))).resolves.toEqual({});
  });

  test("字符串 chunk 的长度判定按 UTF-16 字符数计而非字节数", async () => {
    // total += chunk.length 对字符串取的是 UTF-16 单元数，不是 UTF-8 字节数。
    // 可观测差异：同一个内容，中文两字 = 2 个字符 / 6 个字节，limitBytes 3 卡在中间。
    //   - 字符串 chunk：total = 2，不超限 → 进 Buffer.concat → 因非 Buffer 抛 TypeError
    //   - Buffer chunk：total = 6，超限 → payload-too-large
    // 若哪天改成按字节计，下面第二条会翻脸，第一条也不再抛 TypeError。
    await expect(readJsonBody(rawRequestFrom("数据"), { limitBytes: 3 }))
      .rejects.toMatchObject({ code: "ERR_INVALID_ARG_TYPE" });
    await expect(readJsonBody(requestFrom(Buffer.from("数据", "utf-8")), { limitBytes: 3 }))
      .rejects.toMatchObject({ code: "payload-too-large" });
  });

  test("缺省 limitLabel 时 formatBytes 输出未取整的小数 KB 文案", async () => {
    // formatBytes 只做整除阈值判断，不做四舍五入：100 < 1MB → 100/1024 完整小数。
    await expect(readJsonBody(requestFrom(Buffer.alloc(101)), { limitBytes: 100 }))
      .rejects.toMatchObject({
        code: "payload-too-large",
        message: "请求体超过 0.09765625KB 上限。"
      });
    // 1.5MB 侧：MB 分支同样是原样小数，不补零、不缩写
    await expect(readJsonBody(requestFrom(Buffer.alloc(1536 * 1024 + 1)), { limitBytes: 1536 * 1024 }))
      .rejects.toMatchObject({ message: "请求体超过 1.5MB 上限。" });
  });
});
