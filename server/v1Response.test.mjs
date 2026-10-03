import { describe, expect, test } from "vitest";
import { sendV1Json, sendV1JsonNoStore, sendV1Error, sendV1PayloadTooLarge, sendV1Wrapped } from "./v1Response.mjs";

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

// ---------------------------------------------------------------------------
// sendV1PayloadTooLarge：全仓唯一的「读请求体体积超限」分支（此前 13 处手抄）
// ---------------------------------------------------------------------------
describe("sendV1PayloadTooLarge", () => {
  test("code 是 payload-too-large → 回 413 + v1 信封 + 原 message，且返回 true", () => {
    const res = createMockResponse();
    const error = Object.assign(new Error("请求体超过 1MB 上限"), { code: "payload-too-large" });
    expect(sendV1PayloadTooLarge(res, error)).toBe(true);
    expect(res.statusCode).toBe(413);
    expect(res.jsonBody()).toEqual({
      ok: false,
      error: { code: "payload-too-large", message: "请求体超过 1MB 上限" }
    });
  });

  test("★ 其它 code → **不**应答任何东西，返回 false", () => {
    for (const code of ["ENOENT", "ETIMEDOUT", "bad-request", "internal"]) {
      const res = createMockResponse();
      const handled = sendV1PayloadTooLarge(res, Object.assign(new Error("别的错"), { code }));
      expect(handled, code).toBe(false);
      // 关键：不能已经写了响应头 —— 否则调用点自己的 bad-request 分支会撞上
      // "Cannot set headers after they are sent"
      expect(res.statusCode, `${code} 不该写响应`).toBe(0);
      expect(res.body(), `${code} 不该写响应体`).toBe("");
    }
  });

  test("没有 code / code 不是字符串 / error 为 null / undefined → 返回 false", () => {
    for (const error of [
      new Error("裸错误"),
      { code: 123 },
      { code: null },
      { code: undefined },
      null,
      undefined,
      {}
    ]) {
      const res = createMockResponse();
      expect(sendV1PayloadTooLarge(res, error), String(error)).toBe(false);
      expect(res.statusCode).toBe(0);
    }
  });

  test("★ 严格相等（大小写敏感）：PAYLOAD-TOO-LARGE 不算", () => {
    // 与原实现 `error?.code === "payload-too-large"` 逐字一致 —— 抽函数时
    // 若误改成 toLowerCase() 比较，13 个端点的 413 判定会一起变松。
    const res = createMockResponse();
    expect(sendV1PayloadTooLarge(res, { code: "PAYLOAD-TOO-LARGE" })).toBe(false);
    expect(sendV1PayloadTooLarge(res, { code: "Payload-Too-Large" })).toBe(false);
    expect(res.statusCode).toBe(0);
  });

  test("headersSent 时不写响应（与 sendV1Error 同一保护），仍返回 true", () => {
    // 语义：分支**已被识别**，返回 true 让调用点 return；
    // 是否真能写出去交给 sendV1Error 自己的 headersSent 守卫决定。
    const res = createMockResponse();
    res.headersSent = true;
    const error = Object.assign(new Error("超限"), { code: "payload-too-large" });
    expect(sendV1PayloadTooLarge(res, error)).toBe(true);
    expect(res.statusCode, "headersSent 后不该再写").toBe(0);
  });
});

// ── 错误码 → HTTP 状态映射 ────────────────────────────────
//
// 映射表（server/v1Response.mjs:27）是第三方判断「重试 / 不重试」的唯一依据：
// 4xx 表示请求本身的问题（改了再来），503 表示服务端暂时不可用（该重试）。
// **未登记的码一律回落 500** —— 而前端确实会抛两个没登记的码：
//   - unknown-command（App.tsx 遇到不认识的指令名）
//   - not-implemented（量测属性修改等未实现的能力）
// 第三方拿到 500 会当成「服务端故障」而重试，而这两类其实是「请求做不了」。
//
// 这里**只记录现状**、不改映射：改它等于改对外 API 契约，需要先确认在跑的
// 第三方脚本是按 500 重试还是按 4xx 放弃。写成测试是为了让「要不要改」这个决定
// 有据可依，而不是靠记忆。

describe("sendV1Error —— 错误码到状态的映射", () => {
  const statusOf = (code) => {
    const response = createMockResponse();
    sendV1Error(response, code, "测试");
    return response.statusCode;
  };

  test("已登记的码各映射到约定的状态", () => {
    expect(statusOf("bad-request")).toBe(400);
    expect(statusOf("payload-too-large")).toBe(413);
    expect(statusOf("not-found")).toBe(404);
    expect(statusOf("no-active-model")).toBe(404);
    expect(statusOf("no-selection")).toBe(404);
    expect(statusOf("no-online-client")).toBe(503);
    expect(statusOf("ws-timeout")).toBe(503);
    expect(statusOf("internal")).toBe(500);
  });

  test("★ 前端会抛、但表里没有的两个码 → 回落 500（记录现状）", () => {
    // unknown-command / not-implemented 都属「请求做不了」，却拿到 5xx。
    // 若将来决定登记，用例应随之更新 —— 这正是把它写成测试的目的。
    expect(statusOf("unknown-command")).toBe(500);
    expect(statusOf("not-implemented")).toBe(500);
  });

  test("任意未登记码与空值都回落 500（不抛）", () => {
    expect(statusOf("随便什么码")).toBe(500);
    expect(statusOf("")).toBe(500);
    expect(statusOf(undefined)).toBe(500);
  });

  test("statusOverride 优先于映射表（调用方可以自己定状态）", () => {
    const response = createMockResponse();
    sendV1Error(response, "not-found", "测试", 410);
    expect(response.statusCode).toBe(410);
  });

  test("错误响应体仍是信封格式，且带 no-store（实时错误不该被缓存）", () => {
    const response = createMockResponse();
    const chunks = [];
    const original = response.end.bind(response);
    response.end = (data) => { if (data) chunks.push(data); original(data); };
    sendV1Error(response, "bad-request", "参数不对");
    expect(JSON.parse(String(chunks[0]))).toEqual({
      ok: false,
      error: { code: "bad-request", message: "参数不对" }
    });
    expect(response.headers["cache-control"]).toBe("no-store");
  });
});
