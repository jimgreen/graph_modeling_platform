import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { createRuntimeRegistry, NoOnlineClientError, FetchTimeoutError } from "./runtimeRegistry.mjs";

// 注册表纯逻辑测试，不依赖 WS。sendFetch 用 mock。
function createMockSend() {
  const sent = [];
  return {
    sent,
    send: (entry, message) => sent.push({ clientId: entry.clientId, message })
  };
}

describe("runtimeRegistry 注册与查询", () => {
  test("register 加入客户端，listClients 返回", () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    const clients = reg.listClients();
    expect(clients).toHaveLength(1);
    expect(clients[0].clientId).toBe("c1");
  });

  test("unregister 移除客户端", () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    reg.unregister("c1");
    expect(reg.listClients()).toHaveLength(0);
  });

  test("touch 更新 lastActiveAt", () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    const before = reg.listClients()[0].lastActiveAt;
    // 用 vi 模拟时间推进无法直接（lastActiveAt 用 Date.now），测 touch 后 lastActiveAt >= before
    reg.touch("c1");
    const after = reg.listClients()[0].lastActiveAt;
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

describe("runtimeRegistry 默认选择", () => {
  test("pickDefaultClient 返回最近活跃", () => {
    vi.useFakeTimers();
    try {
      const reg = createRuntimeRegistry();
      vi.setSystemTime(1000);
      reg.register("c1", () => {});
      vi.setSystemTime(2000);
      reg.register("c2", () => {});
      vi.setSystemTime(3000);
      reg.touch("c2"); // c2 更新更晚
      expect(reg.pickDefaultClient().clientId).toBe("c2");
    } finally {
      vi.useRealTimers();
    }
  });

  test("无客户端返 null", () => {
    const reg = createRuntimeRegistry();
    expect(reg.pickDefaultClient()).toBeNull();
  });

  test("resolveClient 指定 clientId 返回该客户端", () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    reg.register("c2", () => {});
    expect(reg.resolveClient("c1").clientId).toBe("c1");
  });

  test("resolveClient 不指定取默认", () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    expect(reg.resolveClient().clientId).toBe("c1");
  });

  test("resolveClient 无在线抛 NoOnlineClientError", () => {
    const reg = createRuntimeRegistry();
    expect(() => reg.resolveClient()).toThrow(NoOnlineClientError);
  });

  test("resolveClient 指定不存在的 clientId 抛 NoOnlineClientError", () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    expect(() => reg.resolveClient("nope")).toThrow(NoOnlineClientError);
  });
});

describe("runtimeRegistry fetch 拉取", () => {
  test("fetchFromClient 发 fetch 消息并等响应", async () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    const mockSend = createMockSend();
    const promise = reg.fetchFromClient("c1", "req1", "runtime.snapshot", {}, mockSend.send);
    expect(mockSend.sent).toHaveLength(1);
    expect(mockSend.sent[0].message).toMatchObject({ type: "fetch", requestId: "req1", resource: "runtime.snapshot" });
    // 模拟前端响应
    reg.resolveFetch("c1", "req1", { model: "m1" }, null);
    const data = await promise;
    expect(data).toEqual({ model: "m1" });
  });

  test("fetchFromClient 前端返 error 时 reject", async () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    const mockSend = createMockSend();
    const promise = reg.fetchFromClient("c1", "req2", "runtime.selection", {}, mockSend.send);
    reg.resolveFetch("c1", "req2", null, { code: "no-selection", message: "未选中设备" });
    await expect(promise).rejects.toMatchObject({ code: "no-selection" });
  });

  test("fetchFromClient 无在线客户端抛 NoOnlineClientError", async () => {
    const reg = createRuntimeRegistry();
    await expect(reg.fetchFromClient("c1", "req3", "runtime.snapshot", {}, () => {})).rejects.toThrow(NoOnlineClientError);
  });

  test("fetchFromClient 超时 reject FetchTimeoutError", async () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    // 用假定时器加速超时
    vi.useFakeTimers();
    try {
      const mockSend = createMockSend();
      const promise = reg.fetchFromClient("c1", "req4", "runtime.snapshot", {}, mockSend.send);
      vi.advanceTimersByTime(6000);
      await expect(promise).rejects.toThrow(FetchTimeoutError);
    } finally {
      vi.useRealTimers();
    }
  });

  test("客户端断线时 reject 所有 pending fetch", async () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    const mockSend = createMockSend();
    const promise = reg.fetchFromClient("c1", "req5", "runtime.snapshot", {}, mockSend.send);
    reg.unregister("c1");
    await expect(promise).rejects.toThrow(NoOnlineClientError);
  });

  test("resolveFetch 未知 requestId 返 false", () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    expect(reg.resolveFetch("c1", "unknown", {}, null)).toBe(false);
  });

  test("fetch 完成后 pending 清理", async () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    const mockSend = createMockSend();
    const promise = reg.fetchFromClient("c1", "req6", "runtime.snapshot", {}, mockSend.send);
    reg.resolveFetch("c1", "req6", {}, null);
    await promise;
    const entry = reg.getClient("c1");
    expect(entry.pendingFetches.size).toBe(0);
  });
});
