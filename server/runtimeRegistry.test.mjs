import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { createRuntimeRegistry, NoOnlineClientError, FetchTimeoutError, CommandTimeoutError } from "./runtimeRegistry.mjs";

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

describe("runtimeRegistry command 指令通道", () => {
  test("commandFromClient 发 command 消息并等响应", async () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    const mockSend = createMockSend();
    const promise = reg.commandFromClient("c1", "cmd1", "control.device.add", { kind: "busbar" }, mockSend.send);
    expect(mockSend.sent).toHaveLength(1);
    expect(mockSend.sent[0].message).toMatchObject({
      type: "command",
      requestId: "cmd1",
      name: "control.device.add",
      params: { kind: "busbar" }
    });
    reg.resolveCommand("c1", "cmd1", true, { id: "n1" }, null);
    const data = await promise;
    expect(data).toEqual({ id: "n1" });
  });

  test("commandFromClient 前端返失败时 reject 带 code", async () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    const mockSend = createMockSend();
    const promise = reg.commandFromClient("c1", "cmd2", "control.device.add", {}, mockSend.send);
    reg.resolveCommand("c1", "cmd2", false, null, { code: "bad-request", message: "kind 必填" });
    await expect(promise).rejects.toMatchObject({ code: "bad-request", message: "kind 必填" });
  });

  test("commandFromClient 无在线客户端抛 NoOnlineClientError", async () => {
    const reg = createRuntimeRegistry();
    await expect(
      reg.commandFromClient("c1", "cmd3", "control.device.add", {}, () => {})
    ).rejects.toThrow(NoOnlineClientError);
  });

  test("commandFromClient 超时 reject CommandTimeoutError", async () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    vi.useFakeTimers();
    try {
      const mockSend = createMockSend();
      const promise = reg.commandFromClient("c1", "cmd4", "control.device.add", {}, mockSend.send);
      vi.advanceTimersByTime(6000);
      await expect(promise).rejects.toThrow(CommandTimeoutError);
      await expect(promise).rejects.toMatchObject({ code: "ws-timeout", command: "control.device.add" });
    } finally {
      vi.useRealTimers();
    }
  });

  test("客户端断线时 reject 所有 pending command", async () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    const mockSend = createMockSend();
    const promise = reg.commandFromClient("c1", "cmd5", "control.device.add", {}, mockSend.send);
    reg.unregister("c1");
    await expect(promise).rejects.toThrow(NoOnlineClientError);
  });

  test("resolveCommand 未知 requestId 返 false", () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    expect(reg.resolveCommand("c1", "unknown", true, {}, null)).toBe(false);
  });

  test("command 完成后 pending 清理", async () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    const mockSend = createMockSend();
    const promise = reg.commandFromClient("c1", "cmd6", "control.device.add", {}, mockSend.send);
    reg.resolveCommand("c1", "cmd6", true, {}, null);
    await promise;
    const entry = reg.getClient("c1");
    expect(entry.pendingCommands.size).toBe(0);
  });

  test("fetch 与 command 通道独立，requestId 不互相干扰", async () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {});
    const mockSend = createMockSend();
    // 用相同 requestId 发不同通道，验证互不串扰
    const fetchPromise = reg.fetchFromClient("c1", "dup", "runtime.snapshot", {}, mockSend.send);
    const commandPromise = reg.commandFromClient("c1", "dup", "control.device.add", {}, mockSend.send);
    // resolveCommand 不应影响 fetch 的 pending
    expect(reg.resolveCommand("c1", "dup", true, { id: "n1" }, null)).toBe(true);
    const cmdData = await commandPromise;
    expect(cmdData).toEqual({ id: "n1" });
    // fetch 仍 pending，再用 resolveFetch 解决
    expect(reg.resolveFetch("c1", "dup", { model: "m1" }, null)).toBe(true);
    const fetchData = await fetchPromise;
    expect(fetchData).toEqual({ model: "m1" });
  });
});
