import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { bindUserSpaceToSession, filterSpacesForCurrentUser } from "./qiankunUserSpace";
import { readSpaceCookie, writeSpaceCookie } from "./spaceClient";

// node 测试环境无 document：手搓 cookie jar 桩（同名 Cookie 按浏览器行为**覆盖**而非追加，
// 绑定会重写同一个 gmp_space；writes 用来断言「这次到底写没写」）
function installMockDocument() {
  let header = "";
  const writes: string[] = [];
  (globalThis as any).document = {
    get cookie() {
      return header;
    },
    set cookie(raw: string) {
      writes.push(raw);
      const pair = raw.split(";")[0].trim();
      const eq = pair.indexOf("=");
      if (eq <= 0) return;
      const name = pair.slice(0, eq).trim();
      const kept = header
        .split(";")
        .map((part) => part.trim())
        .filter((part) => {
          const at = part.indexOf("=");
          return at > 0 && part.slice(0, at).trim() !== name;
        });
      header = [...kept, pair].join("; ");
    }
  };
  return {
    writes,
    setHeader: (value: string) => {
      header = value;
    }
  };
}

const space = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  createdAt: "2026-09-17T00:00:00.000Z",
  ...extra
});

/** 按 method + url 路由的 fetch 桩：记录调用，便于断言「该发的发了、不该发的没发」 */
function mockRouter(routes: Record<string, unknown>) {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    const payload = routes[`${method} ${url}`];
    if (payload === undefined) throw new Error(`未桩定的请求：${method} ${url}`);
    return { ok: true, json: async () => payload };
  });
  (globalThis as any).fetch = fetchMock;
  return calls;
}

let mockDoc: ReturnType<typeof installMockDocument>;
let originalDocument: any;
let originalFetch: any;
let originalWindow: any;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  originalDocument = (globalThis as any).document;
  originalFetch = (globalThis as any).fetch;
  originalWindow = (globalThis as any).window;
  mockDoc = installMockDocument();
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  // 渲染期 currentQiankunUser() 读的就是这份 window
  (globalThis as any).window = { __POWERED_BY_QIANKUN__: true, __QIANKUN_PROPS__: { user: "张三" } };
});

afterEach(() => {
  (globalThis as any).document = originalDocument;
  (globalThis as any).fetch = originalFetch;
  (globalThis as any).window = originalWindow;
  warnSpy.mockRestore();
});

describe("bindUserSpaceToSession", () => {
  test("没有自己的空间 → 建一个带归属的同名空间并写 Cookie", async () => {
    const calls = mockRouter({
      "GET /webgrp/spaces": { spaces: [space("default", "默认空间")], current: "default" },
      "POST /webgrp/spaces": space("张三", "张三", { owner: "张三" })
    });

    await bindUserSpaceToSession("张三");

    expect(readSpaceCookie()).toBe("张三");
    const post = calls.find((item) => item.method === "POST");
    // 归属随创建一起落库：没有它，这个空间下次进来就找不回来
    expect(post?.body).toBe(JSON.stringify({ name: "张三", owner: "张三" }));
  });

  test("一个用户多个空间 → 进最近访问过的那个，不新建", async () => {
    const calls = mockRouter({
      "GET /webgrp/spaces": {
        spaces: [
          space("default", "默认空间"),
          space("方案A", "方案A", { owner: "张三", lastAccessAt: "2026-09-01T00:00:00.000Z" }),
          space("方案B", "方案B", { owner: "张三", lastAccessAt: "2026-09-10T00:00:00.000Z" }),
          space("别人的", "别人的", { owner: "李四", lastAccessAt: "2026-09-30T00:00:00.000Z" })
        ],
        current: "default"
      }
    });

    await bindUserSpaceToSession("张三");

    // 李四的空间再新也不进（归属过滤），自己两个里取 lastAccessAt 最新的
    expect(readSpaceCookie()).toBe("方案B");
    expect(calls.some((item) => item.method === "POST")).toBe(false);
  });

  test("Cookie 指的正是自己的空间 → 沿用，不重写 Cookie", async () => {
    writeSpaceCookie("方案A");
    mockDoc.writes.length = 0;
    mockRouter({
      "GET /webgrp/spaces": {
        spaces: [space("default", "默认空间"), space("方案A", "方案A", { owner: "张三" })],
        current: "方案A"
      }
    });

    await bindUserSpaceToSession("张三");

    expect(readSpaceCookie()).toBe("方案A");
    // 沿用 = 一次都不写：写了就等于每次进页面都把用户按在「最近访问」上，手动选择失效
    expect(mockDoc.writes).toHaveLength(0);
  });

  test("旧版留下的无主同名空间 → 直接沿用，不建第二个", async () => {
    const calls = mockRouter({
      "GET /webgrp/spaces": {
        spaces: [space("default", "默认空间"), space("tsysmart", "tsysmart")],
        current: "default"
      }
    });

    await bindUserSpaceToSession("tsysmart");

    expect(readSpaceCookie()).toBe("tsysmart");
    expect(calls.some((item) => item.method === "POST")).toBe(false);
  });

  test("宿主没传用户：不发请求、不写 Cookie（独立运行/未登录时行为不变）", async () => {
    const calls = mockRouter({});

    await bindUserSpaceToSession(undefined);

    expect(calls).toHaveLength(0);
    expect(readSpaceCookie()).toBe("");
  });

  test("后端报错：吞掉异常不阻断启动，且不动已有 Cookie", async () => {
    writeSpaceCookie("default");
    (globalThis as any).fetch = vi.fn(async () => {
      throw new Error("后端未起");
    });

    await expect(bindUserSpaceToSession("张三")).resolves.toBeUndefined();

    expect(readSpaceCookie()).toBe("default");
    expect(warnSpy).toHaveBeenCalled();
  });

  test("新建撞名（并发）：回读认领同名空间，不把异常抛给启动流程", async () => {
    let listCalls = 0;
    (globalThis as any).fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "GET") {
        listCalls += 1;
        const spaces =
          listCalls === 1
            ? [space("default", "默认空间")]
            : [space("default", "默认空间"), space("张三", "张三", { owner: "张三" })];
        return { ok: true, json: async () => ({ spaces, current: "default" }) };
      }
      return {
        ok: false,
        status: 409,
        json: async () => ({ error: { code: "SPACE_NAME_DUPLICATE", message: "空间名「张三」已存在。" } })
      };
    });

    await bindUserSpaceToSession("张三");

    expect(readSpaceCookie()).toBe("张三");
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("filterSpacesForCurrentUser", () => {
  const spaces = [
    space("default", "默认空间"),
    space("张三", "张三", { owner: "张三" }),
    space("张三的另一个", "另一个", { owner: "张三" }),
    space("李四", "李四", { owner: "李四" }),
    space("老空间", "张三") // 无主但同名：旧版绑定的遗留
  ];

  test("qiankun 下只留自己的（owner 命中 + 无主同名）", () => {
    expect(filterSpacesForCurrentUser(spaces)?.map((item) => item.id)).toEqual(["张三", "张三的另一个", "老空间"]);
  });

  test("非 qiankun：原样返回（独立运行的顶栏不受影响）", () => {
    (globalThis as any).window = { __POWERED_BY_QIANKUN__: false };

    expect(filterSpacesForCurrentUser(spaces)).toBe(spaces);
  });

  test("宿主没传用户：原样返回", () => {
    (globalThis as any).window = { __POWERED_BY_QIANKUN__: true, __QIANKUN_PROPS__: {} };

    expect(filterSpacesForCurrentUser(spaces)).toBe(spaces);
  });
});
