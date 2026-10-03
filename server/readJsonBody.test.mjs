import { describe, expect, test } from "vitest";
import { DEFAULT_JSON_BODY_LIMIT_BYTES, readJsonBody } from "./readJsonBody.mjs";

function requestFrom(...chunks) {
  return (async function* () {
    for (const chunk of chunks) yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
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
});
