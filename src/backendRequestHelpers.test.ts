// 后端请求助手一簇（此前全部零直呼）：
//   backendJsonRequest    19 处生产调用
//   fetchBackendJson      38 处生产调用
//   backendErrorMessage   由 fetchBackendJson 内部调用
//   backendJsonHeaders    被 backendJsonRequest 引用
//
// 这是**整个前端与服务端唯一的通信出口**。判错的后果分两类：
//   - 错误消息算错 → 界面弹出空白 / 带空白 / 与服务端说法不一致
//   - headers 被共享污染 → 19 个调用点的 content-type 同时失效
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  backendErrorMessage,
  backendJsonHeaders,
  backendJsonRequest,
  fetchBackendJson
} from "./appExtracted/appCoreCanvasUtilities";

const FALLBACK = "回退消息";

/** 造一个只提供 `json()` 的最小 Response 替身。 */
const responseOf = (payload: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => {
    if (payload === THROW_IN_JSON) throw new SyntaxError("Unexpected token");
    return payload;
  }
}) as unknown as Response;

/** 哨兵：让 `json()` 抛错，模拟响应体不是 JSON。 */
const THROW_IN_JSON = Symbol("throw-in-json");

describe("backendJsonRequest：输出形状", () => {
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    test(`${method} → { method, headers, body } 三键`, () => {
      const init = backendJsonRequest(method, '{"a":1}');
      expect(Object.keys(init).sort()).toEqual(["body", "headers", "method"]);
      expect(init.method).toBe(method);
      expect(init.body).toBe('{"a":1}');
    });
  }

  test("★ 每次调用返回**新对象**（但 headers 是共享的，见下一条）", () => {
    const a = backendJsonRequest("POST", "1");
    const b = backendJsonRequest("POST", "2");
    expect(a).not.toBe(b);
    expect(a.body).toBe("1");
    expect(b.body).toBe("2");
  });

  test("★ 三个方法的 headers **同引用**（不是拷贝）", () => {
    // 这就是「headers 共享」这条守卫要钉住的事实。
    expect(backendJsonRequest("POST", "a").headers).toBe(backendJsonRequest("PUT", "b").headers);
  });

  test("body 原样透传，不校验是否合法 JSON", () => {
    for (const body of ["", "not json", "{", "null", "[]", '"str"', "0", "  "]) {
      expect(backendJsonRequest("POST", body).body, JSON.stringify(body)).toBe(body);
    }
  });

  test("★ method 原样透传：不大写、不校验（类型面外）", () => {
    // 形参类型是 `"POST" | "PUT" | "DELETE"`，不拦 GET 是**故意的** ——
    // 带 body 的请求本来就不该是 GET。运行时传非法值也原样透传。
    for (const m of ["GET", "PATCH", "post", "", "DeLeTe"] as never[]) {
      expect(backendJsonRequest(m, "b").method, JSON.stringify(m)).toBe(m);
    }
  });
});

describe("★ backendJsonHeaders 是模块级**共享可变对象**（判定不修 + 守卫）", () => {
  // 探针实测：`backendJsonRequest(...)` 返回的 `headers` **就是** `backendJsonHeaders` 本身
  // （`a.headers === backendJsonHeaders` 为真）。所以任何一个调用点改了它，
  // 19 个调用点的 content-type 会同时变成被改后的值。
  //
  // **判定不修**（三个理由）：
  // ① 改成 `{ ...backendJsonHeaders }` 每次请求多一次对象分配 —— 在图片上传、
  //    图标库导入这类**大文件**请求上省下来的那次分配毫无意义；
  // ② `fetch` 自身会把 headers 规范化，自己拷贝，不依赖调用方不改动；
  // ③ 改成 `Object.freeze` 会让**误写**变成运行时抛错，把静默 bug 换成崩溃 ——
  //    在没有先修掉误写之前，那不是修复是换故障模式。
  //
  // 现状钉进测试：日后若有人改成拷贝或冻结，这三条会转红提醒同步核对 19 个调用点。
  afterEach(() => {
    // 无论如何复原，避免污染同文件里的其它测试
    (backendJsonHeaders as Record<string, string>)["content-type"] = "application/json";
  });

  test("返回值与常量同引用", () => {
    expect(backendJsonRequest("POST", "x").headers).toBe(backendJsonHeaders);
    expect(backendJsonRequest("DELETE", "y").headers).toBe(backendJsonHeaders);
  });

  test("常量当前值是 application/json", () => {
    expect(backendJsonHeaders).toEqual({ "content-type": "application/json" });
  });

  test("★ 改一个返回值会污染常量与其它返回值（**这是风险本身**）", () => {
    const a = backendJsonRequest("POST", "x");
    const b = backendJsonRequest("PUT", "y");
    (a.headers as Record<string, string>)["content-type"] = "text/plain";
    expect((backendJsonHeaders as Record<string, string>)["content-type"], "常量被改").toBe("text/plain");
    expect((b.headers as Record<string, string>)["content-type"], "另一个请求也被改").toBe("text/plain");
  });

  test("实现里没有 spread / freeze（不修的依据）", () => {
    // 这里只断言「现状」，因为判定是不修。若将来有人改成拷贝 / 冻结，
    // 上面三条同引用断言会先转红，这里是第二道提示。
    expect(Object.isFrozen(backendJsonHeaders), "未冻结").toBe(false);
  });
});

describe("backendErrorMessage：两种信封形态", () => {
  const cases: Array<[string, unknown, string]> = [
    // v1 信封（server sendError 带 code 时发这个）
    ["v1 完整信封", { error: { code: "not-found", message: "模型不存在。" } }, "模型不存在。"],
    ["v1 无 code", { error: { message: "出错了" } }, "出错了"],
    ["v1 message 前后空白（trim）", { error: { message: "  出错了  " } }, "出错了"],
    ["v1 message 纯空白 → fallback", { error: { code: "X", message: "   " } }, FALLBACK],
    ["v1 无 message → fallback", { error: { code: "X" } }, FALLBACK],
    ["v1 error 空对象 → fallback", { error: {} }, FALLBACK],
    // 旧式（server sendError 不带 code 时发这个）
    ["旧式字符串", { error: "出错了" }, "出错了"],
    ["旧式前后空白（trim）", { error: "  出错了  " }, "出错了"],
    ["旧式纯空白 → fallback", { error: "   " }, FALLBACK],
    ["★ 旧式空串 → fallback", { error: "" }, FALLBACK],
    // 各种非字符串 error
    ["error 为 null", { error: null }, FALLBACK],
    ["error 为 0", { error: 0 }, FALLBACK],
    ["error 为 false", { error: false }, FALLBACK],
    ["error 为数组", { error: ["a"] }, FALLBACK],
    // 整体形态
    ["无 error 字段", { foo: 1 }, FALLBACK],
    ["payload 为 null", null, FALLBACK],
    ["payload 为字符串", "出错了", FALLBACK],
    ["payload 为数组", [{ error: "a" }], FALLBACK],
    ["payload 为空对象", {}, FALLBACK]
  ];

  for (const [label, payload, expected] of cases) {
    test(label, async () => {
      expect(await backendErrorMessage(responseOf(payload), FALLBACK)).toBe(expected);
    });
  }

  test("★ 响应体不是 JSON → fallback（`.catch(() => ({}))`）", async () => {
    expect(await backendErrorMessage(responseOf(THROW_IN_JSON), FALLBACK)).toBe(FALLBACK);
  });

  test("★ 旧式与 v1 两个分支现在**同样 trim**（本次修复点）", async () => {
    // 修复前：旧式分支直接 `return payload.error`，不 trim 也不落 fallback。
    // 实测三处不一致：{ error: "  x  " } / { error: "   " } / { error: "" }。
    // 现在两个分支走同一条归一路径。
    const legacy = await backendErrorMessage(responseOf({ error: "  出错了  " }), FALLBACK);
    const v1 = await backendErrorMessage(responseOf({ error: { message: "  出错了  " } }), FALLBACK);
    expect(legacy).toBe("出错了");
    expect(legacy).toBe(v1);
  });

  test("★ 空串 error 不再产生 `new Error(\"\")`（界面上什么都看不到）", async () => {
    // 修复前 `fetchBackendJson` 在 { error: "" } 时会 `throw new Error("")`。
    vi.stubGlobal("fetch", vi.fn(async () => responseOf({ error: "" }, false, 400)));
    await expect(fetchBackendJson("/x", FALLBACK)).rejects.toThrow(FALLBACK);
    vi.unstubAllGlobals();
  });
});

describe("fetchBackendJson：成功与失败路径", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("200 + 合法 JSON → 原样返回（不做任何形状校验）", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => responseOf({ hello: "world" })));
    expect(await fetchBackendJson("/x", FALLBACK)).toEqual({ hello: "world" });
  });

  test("★ 200 + JSON 是字符串也原样返回（泛型 T 不做运行时校验）", async () => {
    // `as T` 是纯编译期断言。T 形如 `ImageFolder[]` 时，收到字符串不会被拦。
    vi.stubGlobal("fetch", vi.fn(async () => responseOf("plain string")));
    expect(await fetchBackendJson("/x", FALLBACK)).toBe("plain string");
  });

  test("★ 200 + 响应体非 JSON → 抛原始 SyntaxError（**不**被 fallback 包住）", async () => {
    // 如实记录：成功路径上的 `response.json()` 没有 `.catch`，
    // 所以调用方拿到的是 `Unexpected token` 这类解析错误而非那句 fallback 文案。
    // 判定不修：加 catch 需要为「响应体损坏」单独选一句提示文案，
    // 而 38 个调用点的 fallback 文案都是「…失败。」，语义上本来就涵盖这种情况。
    vi.stubGlobal("fetch", vi.fn(async () => responseOf(THROW_IN_JSON)));
    await expect(fetchBackendJson("/x", FALLBACK)).rejects.toThrow(SyntaxError);
  });

  test("非 2xx + error 字段 → 抛该消息", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => responseOf({ error: "服务器说不行" }, false, 500)));
    await expect(fetchBackendJson("/x", FALLBACK)).rejects.toThrow("服务器说不行");
  });

  test("非 2xx + 无 error 字段 → 抛 fallback", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => responseOf({}, false, 404)));
    await expect(fetchBackendJson("/x", FALLBACK)).rejects.toThrow(FALLBACK);
  });

  test("非 2xx + 响应体非 JSON → 抛 fallback", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => responseOf(THROW_IN_JSON, false, 502)));
    await expect(fetchBackendJson("/x", FALLBACK)).rejects.toThrow(FALLBACK);
  });

  test("★ fetch 本身抛错 → **原样透传**（不包装）", async () => {
    // 网络断开时 fetch 抛 TypeError("Failed to fetch")。
    // 不包装是有意的：包装成一句中文提示会丢掉「这是网络问题还是服务端问题」的区分。
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const error = await fetchBackendJson("/x", FALLBACK).then(() => null, (e: unknown) => e);
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe("Failed to fetch");
  });

  test("★ init 原样透传给 fetch（url + init 两个参数都在）", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      return responseOf({ ok: true });
    }));
    const init = backendJsonRequest("POST", '{"n":"新"}');
    await fetchBackendJson("/api/x", FALLBACK, init);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("/api/x");
    expect(calls[0][1]).toBe(init);
    expect(calls[0][1]?.method).toBe("POST");
    expect(calls[0][1]?.body).toBe('{"n":"新"}');
  });

  test("init 省略时传 undefined（不是 {}）", async () => {
    const calls: Array<RequestInit | undefined> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      calls.push(init);
      return responseOf({ ok: true });
    }));
    await fetchBackendJson("/x", FALLBACK);
    expect(calls[0]).toBeUndefined();
  });
});
