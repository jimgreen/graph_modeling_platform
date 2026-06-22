import { describe, expect, test } from "vitest";
import { sendV1Json, sendV1JsonNoStore, sendV1Error, sendV1Wrapped } from "./v1Response.mjs";

// 构造 mock response：捕获 writeHead/end，提供 if-none-match 头注入
function createMockResponse() {
  const chunks = [];
  return {
    statusCode: 0,
    headers: {},
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers ?? {};
    },
    end(data) {
      if (data) chunks.push(data);
    },
    body() {
      return Buffer.concat(chunks.map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(c)))).toString("utf-8");
    },
    jsonBody() {
      return JSON.parse(this.body());
    }
  };
}

function createMockRequest(headers = {}) {
  return { headers };
}

describe("v1Response sendV1Json", () => {
  test("成功响应包装信封 {ok:true,data}", async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    await sendV1Json(req, res, { schemes: [{ name: "方案A" }] });
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody()).toEqual({ ok: true, data: { schemes: [{ name: "方案A" }] } });
    expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(res.headers["cache-control"]).toBe("no-cache");
    expect(res.headers.etag).toBeTruthy();
  });

  test("If-None-Match 命中 ETag 返回 304", async () => {
    const req1 = createMockRequest();
    const res1 = createMockResponse();
    await sendV1Json(req1, res1, { a: 1 });
    const etag = res1.headers.etag;

    const req2 = createMockRequest({ "if-none-match": etag });
    const res2 = createMockResponse();
    await sendV1Json(req2, res2, { a: 1 });
    expect(res2.statusCode).toBe(304);
    expect(res2.body()).toBe("");
  });

  test("accept-encoding gzip 且响应足够大时 gzip 压缩", async () => {
    const req = createMockRequest({ "accept-encoding": "gzip" });
    const res = createMockResponse();
    const big = { data: "x".repeat(2048) };
    await sendV1Json(req, res, big);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(res.headers.vary).toBe("Accept-Encoding");
  });
});

describe("v1Response sendV1JsonNoStore", () => {
  test("运行时态响应 no-store 且无 ETag", async () => {
    const res = createMockResponse();
    await sendV1JsonNoStore(res, { clientId: "c1" });
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody()).toEqual({ ok: true, data: { clientId: "c1" } });
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers.etag).toBeUndefined();
  });
});

describe("v1Response sendV1Error", () => {
  test("错误响应信封 {ok:false,error:{code,message}}", () => {
    const res = createMockResponse();
    sendV1Error(res, "not-found", "模型不存在。");
    expect(res.statusCode).toBe(404);
    expect(res.jsonBody()).toEqual({ ok: false, error: { code: "not-found", message: "模型不存在。" } });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  test("错误码映射 HTTP 状态", () => {
    const cases = [
      ["bad-request", 400],
      ["not-found", 404],
      ["no-online-client", 503],
      ["no-active-model", 404],
      ["no-selection", 404],
      ["ws-timeout", 503],
      ["internal", 500],
      ["unknown-code", 500]
    ];
    for (const [code, status] of cases) {
      const res = createMockResponse();
      sendV1Error(res, code, "msg");
      expect(res.statusCode).toBe(status);
    }
  });

  test("statusOverride 覆盖映射", () => {
    const res = createMockResponse();
    sendV1Error(res, "not-found", "msg", 422);
    expect(res.statusCode).toBe(422);
  });
});

describe("v1Response sendV1Wrapped", () => {
  test("成功包装旧产出", async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    await sendV1Wrapped(req, res, async () => ({ ok: true, schemes: [] }));
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody()).toEqual({ ok: true, data: { ok: true, schemes: [] } });
  });

  test("produce 抛错转 internal 错误信封", async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    await sendV1Wrapped(req, res, async () => { throw new Error("boom"); });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody()).toEqual({ ok: false, error: { code: "internal", message: "boom" } });
  });

  test("noStore 选项走不缓存路径", async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    await sendV1Wrapped(req, res, async () => ({ clientId: "c1" }), { noStore: true });
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers.etag).toBeUndefined();
  });
});
