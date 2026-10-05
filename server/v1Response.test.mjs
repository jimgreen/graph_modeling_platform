import { describe, expect, test } from "vitest";
import { gunzipSync } from "node:zlib";
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
    // 原始字节（gzip 用例必须 gunzip 才能断言，字符串化会破坏字节）
    rawBody() {
      return Buffer.concat(chunks.map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(c))));
    },
    body() {
      return this.rawBody().toString("utf-8");
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

// ── gzip 支持判定：Accept-Encoding 的 q 权重 ────────────────
//
// 判定原本是一句 `/\bgzip\b/iu.test(header)` —— 它只看有没有出现过 gzip 这个词，
// 把 `;q=` 整个丢掉。于是 `Accept-Encoding: gzip;q=0`（RFC 9110 §12.5.3 明确表示
// 「这个编码不接受」）的客户端照样收到 gzip 字节流，只能拿到一坨解不开的东西。
//
// 下面每条用例都盯住**判定函数本身**，而不是端到端顺带看一眼 —— 阈值常量
// （GZIP_MIN_BYTES=1024）与比较符（>=）一旦被改动，这些边界会先红。
const GZIP_MIN_BYTES = 1024;

// 造出 raw body 长度**精确等于** targetBytes 的 data（阈值边界用）。
// 信封 `{"ok":true,"data":<data>}` 的骨架（去掉 data 值）是 19 字节；
// data 取 {x:"…"} 时，值本身 `{"x":"…"}` 除引号内容外固定 8 字节。
// 造完立刻核对长度 —— 长度对不上就直接抛，不让边界用例悄悄退化成「随便一个大 body」。
function dataForRawLength(targetBytes) {
  const envelopeSkeleton = Buffer.byteLength('{"ok":true,"data":}', "utf-8");
  const valueWrapperOverhead = Buffer.byteLength('{"x":""}', "utf-8");
  const data = { x: "x".repeat(targetBytes - envelopeSkeleton - valueWrapperOverhead) };
  const actual = Buffer.byteLength(JSON.stringify({ ok: true, data }), "utf-8");
  if (actual !== targetBytes) throw new Error(`造长度失败：期望 ${targetBytes}，实际 ${actual}`);
  return data;
}

describe("sendV1Json —— gzip 支持判定尊重 q 权重", () => {
  test("gzip;q=0 → 不压缩：既无 content-encoding，body 也是明文", async () => {
    // 变异目标：把 acceptsGzipEncoding 换回不带 q 的子串判定，这条必须变红。
    const req = createMockRequest({ "accept-encoding": "gzip;q=0" });
    const res = createMockResponse();
    const data = { data: "x".repeat(2048) };
    await sendV1Json(req, res, data);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-encoding"]).toBeUndefined();
    expect(res.headers.vary).toBeUndefined();
    // 未压缩的硬证据：能直接 JSON.parse，且 content-length 等于明文长度
    expect(res.jsonBody()).toEqual({ ok: true, data });
    expect(res.headers["content-length"]).toBe(Buffer.byteLength(JSON.stringify({ ok: true, data }), "utf-8"));
  });

  test("gzip 无 q 参数 → 仍压缩（回归防护：缺省 q 等价于 q=1）", async () => {
    // 这是防误伤的核心：把默认路径也一起判成不支持，会让所有 gzip 客户端回归。
    const req = createMockRequest({ "accept-encoding": "gzip" });
    const res = createMockResponse();
    const data = { data: "x".repeat(2048) };
    await sendV1Json(req, res, data);
    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(res.headers.vary).toBe("Accept-Encoding");
    expect(res.headers["content-length"]).toBe(res.rawBody().length);
    // 解压后与未压缩信封逐字节相同
    expect(gunzipSync(res.rawBody()).toString("utf-8")).toBe(JSON.stringify({ ok: true, data }));
  });

  test("q 大于 0 即压缩；identity、缺省头、空头一律不压缩", async () => {
    const data = { data: "x".repeat(2048) };
    const encodingFor = async (acceptEncoding) => {
      const headers = acceptEncoding === undefined ? {} : { "accept-encoding": acceptEncoding };
      const res = createMockResponse();
      await sendV1Json(createMockRequest(headers), res, data);
      return res.headers["content-encoding"];
    };
    // q > 0 即视为支持；多个编码并列 / x-gzip 旧别名都仍认
    expect(await encodingFor("gzip;q=0.001")).toBe("gzip");
    expect(await encodingFor("gzip;q=1.0")).toBe("gzip");
    expect(await encodingFor("deflate, gzip;q=0.5")).toBe("gzip");
    expect(await encodingFor("x-gzip")).toBe("gzip");
    expect(await encodingFor("x-gzip;q=0")).toBeUndefined();
    // 不支持 gzip 的三种形态
    expect(await encodingFor("identity")).toBeUndefined();
    expect(await encodingFor("")).toBeUndefined();
    expect(await encodingFor(undefined)).toBeUndefined();
    // 别名式误伤防护：gzip2 不是 gzip
    expect(await encodingFor("gzip2, deflate")).toBeUndefined();
  });

  test(`压缩阈值边界：raw 恰好 ${GZIP_MIN_BYTES} 字节压缩，少 1 字节不压缩`, async () => {
    // 判定是 `raw.length >= GZIP_MIN_BYTES`，比较符任一边改动都会红。
    const req = createMockRequest({ "accept-encoding": "gzip" });
    const atThreshold = dataForRawLength(GZIP_MIN_BYTES);
    const belowThreshold = dataForRawLength(GZIP_MIN_BYTES - 1);

    const at = createMockResponse();
    const below = createMockResponse();
    await sendV1Json(req, at, atThreshold);
    await sendV1Json(req, below, belowThreshold);

    expect(Buffer.byteLength(JSON.stringify({ ok: true, data: atThreshold }), "utf-8")).toBe(GZIP_MIN_BYTES);
    expect(Buffer.byteLength(JSON.stringify({ ok: true, data: belowThreshold }), "utf-8")).toBe(GZIP_MIN_BYTES - 1);
    expect(at.headers["content-encoding"]).toBe("gzip");
    expect(gunzipSync(at.rawBody()).toString("utf-8")).toBe(JSON.stringify({ ok: true, data: atThreshold }));
    expect(below.headers["content-encoding"]).toBeUndefined();
    expect(below.headers["content-length"]).toBe(GZIP_MIN_BYTES - 1);
    expect(below.jsonBody()).toEqual({ ok: true, data: belowThreshold });
  });
});

// ── ETag / If-None-Match ────────────────────────────────
//
// 判等是**严格相等**（`ifNoneMatch === prepared.etag`），不是按列表解析 `If-None-Match`。
// 这条用例盯的是「不匹配时别误 304」，不是要求改成列表匹配 —— 那属于改语义。
describe("sendV1Json —— If-None-Match 不匹配时的响应", () => {
  test("If-None-Match 与当前 ETag 不同 → 回 200 完整 body 且仍带 ETag", async () => {
    // body 必须够大才会进 gzip 分支，否则这条只会验到未压缩路径。
    const data = { data: "x".repeat(2048) };
    const first = createMockResponse();
    await sendV1Json(createMockRequest(), first, data);
    const currentEtag = first.headers.etag;
    expect(currentEtag).toBeTruthy();

    const staleEtag = '"stale-etag-from-another-payload"';
    expect(staleEtag).not.toBe(currentEtag);
    const res = createMockResponse();
    await sendV1Json(createMockRequest({ "if-none-match": staleEtag, "accept-encoding": "gzip" }), res, data);

    expect(res.statusCode).toBe(200);
    expect(res.headers.etag).toBe(currentEtag);
    // body 走的是 gzip 分支：解压后仍是同一个信封，ETag 与内容绑定没丢
    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(gunzipSync(res.rawBody()).toString("utf-8")).toBe(JSON.stringify({ ok: true, data }));
  });

  test("If-None-Match 命中 → 304 且带 ETag（判定在 gzip 之前，不受 q 影响）", async () => {
    const data = { data: "x".repeat(2048) };
    const first = createMockResponse();
    await sendV1Json(createMockRequest({ "accept-encoding": "gzip" }), first, data);
    expect(first.headers["content-encoding"]).toBe("gzip");

    // 即便这一轮客户端声明 gzip;q=0，命中 ETag 仍应 304：304 本就没有实体可压缩
    const res = createMockResponse();
    await sendV1Json(createMockRequest({ "if-none-match": first.headers.etag, "accept-encoding": "gzip;q=0" }), res, data);
    expect(res.statusCode).toBe(304);
    expect(res.headers.etag).toBe(first.headers.etag);
    expect(res.headers["content-encoding"]).toBeUndefined();
    expect(res.body()).toBe("");
  });
});
