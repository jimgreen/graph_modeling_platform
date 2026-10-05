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

// ── Accept-Encoding 的参数解析：gzipQualityFromParams 的三条跳过/兜底 ────
//
// gzipQualityFromParams 是**私有**函数（未 export），只能经 sendV1Json 传的
// accept-encoding 头触达。既有测试的 q 参数一律「带 = 且名字恰好是 q」，于是下面
// 三条从未被走到：
//   L46  参数里没有 "="                        → continue（跳过该参数）
//   L47  参数名不是 q                          → continue
//   L49  q 解析不出有限数（NaN / ±Infinity）    → 兜底 0，即「不接受 gzip」
//
// 每条都配了**判别输入**，并且只靠 content-encoding 头观测「压不压缩」——
// 不解压 body，所以变异后的失败是毫秒级的 AssertionError，而不是 zlib 抛错。
const GZIP_PROBE_DATA = { data: "x".repeat(2048) };   // raw ≈ 2KB > GZIP_MIN_BYTES(1024)

// 探针：跑一次 sendV1Json 并把 mock response 交回，便于同时看头与原始字节
async function probeV1Gzip(acceptEncoding) {
  const res = createMockResponse();
  await sendV1Json(createMockRequest({ "accept-encoding": acceptEncoding }), res, GZIP_PROBE_DATA);
  return res;
}

describe("sendV1Json —— Accept-Encoding 参数解析的跳过与兜底分支", () => {
  test("★ L46：gzip 后跟不含 = 的参数 → 该参数被跳过，仍按缺省 q=1 压缩", async () => {
    // 自然形态：q 没给取值。
    expect((await probeV1Gzip("gzip;q")).headers["content-encoding"]).toBe("gzip");

    // ★ 判别输入是 "qq" 而不是 "q"：把 L46 的 continue 删掉后
    // `"qq".slice(0, -1) === "q"` → 名字判定误命中 → 解析 "qq" 得 NaN → 0 → 拒绝压缩。
    // 用 "q" 测不到这一点（`"q".slice(0,-1)` 得 "" ，仍不等于 q，两条路径都 continue）。
    const res = await probeV1Gzip("gzip;qq");
    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(gunzipSync(res.rawBody()).toString("utf-8")).toBe(JSON.stringify({ ok: true, data: GZIP_PROBE_DATA }));
  });

  test("★ L47：参数名不是 q 就跳过，level=0 不会被当成 q=0", async () => {
    // 关键在那个 "0"：删掉 L47 后 level=0 被当成 q=0 → 拒绝压缩 → 本条转红。
    // 既有用例的参数名恰好都是 q，删掉这一行对它们**无影响** —— 判别力全在这里。
    const res = await probeV1Gzip("gzip;level=0");
    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(gunzipSync(res.rawBody()).toString("utf-8")).toBe(JSON.stringify({ ok: true, data: GZIP_PROBE_DATA }));

    // 同一分支的另外两侧：名字确实是 q（大小写与空白都被归一）时按 q 解析，
    // q=0 → 拒绝压缩。少了 toLowerCase 或少了 trim，这两条会各自转红。
    expect((await probeV1Gzip("gzip;Q=0")).headers["content-encoding"]).toBeUndefined();
    expect((await probeV1Gzip("gzip; q =0")).headers["content-encoding"]).toBeUndefined();
  });

  test("★ L49：q 解析不出有限数 → 按 q=0 处理，不压缩", async () => {
    // 兜底 0 与「正常 q=0」产出相同，因此每条都靠 body 明文可解来确认
    // 「这是真的没压缩」，并用末尾的对照组证明差别来自解析结果而非这个头不认 gzip。
    for (const header of ["gzip;q=abc", "gzip;q=", "gzip;q=NaN", "gzip;q=Infinity"]) {
      const res = await probeV1Gzip(header);
      expect(res.headers["content-encoding"], header).toBeUndefined();
      expect(res.headers.vary, header).toBeUndefined();
      expect(res.jsonBody(), header).toEqual({ ok: true, data: GZIP_PROBE_DATA });
    }
    // 对照组：同一位置换成能解析且 >0 的 q，立刻压缩
    expect((await probeV1Gzip("gzip;q=0.5")).headers["content-encoding"]).toBe("gzip");

    // 不为「值上的 .trim()」写断言，理由可证：Number.parseFloat 按 spec 跳过前导
    // 空白、且只解析前缀，故 `parseFloat(x.trim())` 在全域与 `parseFloat(x)` 相等。
    // 写成断言只会给人「trim 被守卫着」的错觉。
  });
});

// ── sendV1Wrapped 的 catch：非 Error 抛出的兜底文案 ────────────
//
// L182 是 `error instanceof Error ? error.message : "后端处理失败。"`。
// 兜底文案与 Error 分支的 message 在本测试里**刻意不同**（同一段文本，
// 一次裸抛、一次包成 Error 抛）—— 响应封装类模块最常见的假绿就是
// 两条 catch 产出逐字节相同的文案，那样任何一条都咬不住。
describe("sendV1Wrapped —— produce 抛非 Error 时的兜底文案", () => {
  const TEXT = "设备未上线，控制指令没能下发（这段文本被裸抛，不是 Error 实例）";

  test("★ 抛非 Error → 固定兜底文案；同样文本包成 Error 抛则原样透出", async () => {
    const plain = createMockResponse();
    await sendV1Wrapped(createMockRequest(), plain, async () => { throw TEXT; });
    expect(plain.statusCode).toBe(500);
    expect(plain.jsonBody()).toEqual({ ok: false, error: { code: "internal", message: "后端处理失败。" } });
    expect(plain.headers["cache-control"]).toBe("no-store");

    // 对照侧：Error 分支必须原样透出 message。两条产出不同，
    // 才证明上一条真的走进了兜底，而不是「两边恰好同文案」。
    const wrapped = createMockResponse();
    await sendV1Wrapped(createMockRequest(), wrapped, async () => { throw new Error(TEXT); });
    expect(wrapped.statusCode).toBe(500);
    expect(wrapped.jsonBody()).toEqual({ ok: false, error: { code: "internal", message: TEXT } });
    // 夹具自检：若 TEXT 恰好等于兜底文案，上面两条断言互为恒等，判别力归零
    expect(TEXT).not.toBe("后端处理失败。");
  });

  test("★ 带 message 字段的普通对象仍走兜底：判据是 instanceof，不是取 .message", async () => {
    // 把右臂改成 error.message（或去掉 instanceof）都会让本条转红。
    const res = createMockResponse();
    await sendV1Wrapped(createMockRequest(), res, async () => {
      throw { code: "ERR_FAKE", message: "长得像错误的普通对象" };
    });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody()).toEqual({ ok: false, error: { code: "internal", message: "后端处理失败。" } });
  });
});

// ── no-store 响应与 ETag/304 互斥 ────────────────────────
//
// 说明：`sendPreparedV1` 里 L85 的 `if (prepared.noStore)` **true 分支在本模块
// 不可达** —— 它只在 L117 被调用且第二实参写死 false（sendV1JsonNoStore 走的是
// 自己那条 writeHead，根本不经 sendPreparedV1）。全仓 grep 也没有别的调用点。
// 下面这条锁的是同一条语义在**可达路径**上的表现：no-store 响应即便与某个
// 可缓存响应字节相同，也不带 ETag、不参与 304。
describe("v1Response —— no-store 与可缓存响应的差异", () => {
  test("同一份 data：可缓存路径带 ETag，no-store 路径字节相同但刻意不带", async () => {
    const cached = createMockResponse();
    await sendV1Json(createMockRequest(), cached, GZIP_PROBE_DATA);
    const fresh = createMockResponse();
    await sendV1JsonNoStore(fresh, GZIP_PROBE_DATA);

    // 字节相同 → ETag 本可复用；不发它是有意的策略（运行时态不该被缓存）
    expect(fresh.rawBody()).toEqual(cached.rawBody());
    expect(cached.headers.etag).toBeTruthy();
    expect(fresh.statusCode).toBe(200);
    expect(fresh.headers.etag).toBeUndefined();
    expect(fresh.headers["cache-control"]).toBe("no-store");
    expect(cached.headers["cache-control"]).toBe("no-cache");
    expect(fresh.headers["content-type"]).toBe("application/json; charset=utf-8");
  });
});
