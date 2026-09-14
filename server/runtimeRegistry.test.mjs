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

// 空间归属：客户端上线时带上所属空间（WS 层按握手 Cookie 解析并归位），
// 选默认客户端时严格按空间筛，跨空间指名与跨空间回退都不允许。
describe("runtimeRegistry 空间归属", () => {
  test("register 记录 workspaceId，未传则为空串", () => {
    const reg = createRuntimeRegistry();
    reg.register("a", () => {}, "张三");
    reg.register("b", () => {});
    expect(reg.listClients().map((c) => [c.clientId, c.workspaceId])).toEqual([
      ["a", "张三"],
      ["b", ""]
    ]);
  });

  test("pickDefaultClient 按空间筛选，不被更活跃的其它空间客户端抢走", () => {
    vi.useFakeTimers();
    try {
      const reg = createRuntimeRegistry();
      vi.setSystemTime(1000);
      reg.register("a", () => {}, "张三");
      vi.setSystemTime(2000);
      reg.register("b", () => {}, "李四");
      vi.setSystemTime(3000);
      reg.touch("b"); // b 更活跃：不按空间筛时两个空间都会取到 b
      expect(reg.pickDefaultClient("张三").clientId).toBe("a");
      expect(reg.pickDefaultClient("李四").clientId).toBe("b");
      // 该空间无在线客户端：不得跨空间回落到 a / b
      expect(reg.pickDefaultClient("王五")).toBeNull();
      expect(() => reg.resolveClient(null, "王五")).toThrow(NoOnlineClientError);
      // 不传空间：保持既有行为（活跃者通吃）
      expect(reg.pickDefaultClient().clientId).toBe("b");
    } finally {
      vi.useRealTimers();
    }
  });

  test("pickDefaultClient 严格按空间：空间未知的客户端不会被别的空间选中", () => {
    vi.useFakeTimers();
    try {
      const reg = createRuntimeRegistry();
      vi.setSystemTime(1000);
      reg.register("known", () => {}, "张三");
      vi.setSystemTime(2000);
      reg.register("unknown", () => {}); // 未注入 store 的单测路径：空间未知
      vi.setSystemTime(3000);
      reg.touch("unknown"); // 空间未知者更活跃
      // 张三有客户端 → 取张三的，即使空间未知者更活跃
      expect(reg.pickDefaultClient("张三").clientId).toBe("known");
      // 李四空间无人在线 → 不得退到空间未知者（线上不存在空间未知的条目：注册时已归位）
      expect(reg.pickDefaultClient("李四")).toBeNull();
      expect(() => reg.resolveClient(null, "李四")).toThrow(NoOnlineClientError);
      // 无参调用（老行为）仍取最近活跃
      expect(reg.pickDefaultClient().clientId).toBe("unknown");
    } finally {
      vi.useRealTimers();
    }
  });

  test("resolveClient 校验客户端所属空间", () => {
    const reg = createRuntimeRegistry();
    reg.register("a", () => {}, "张三");
    expect(reg.resolveClient("a", "张三").clientId).toBe("a");
    // 不传空间：保持既有行为（按 id 直取）
    expect(reg.resolveClient("a").clientId).toBe("a");
    // 跨空间指名：拒绝
    expect(() => reg.resolveClient("a", "李四")).toThrow(NoOnlineClientError);
  });

  test("resolveClient 严格校验空间：空间未知的客户端同样不放行", () => {
    const reg = createRuntimeRegistry();
    reg.register("a", () => {});
    expect(() => reg.resolveClient("a", "张三")).toThrow(NoOnlineClientError);
  });

  test("fetchFromClient 传空间时只在该空间内取默认客户端", async () => {
    vi.useFakeTimers();
    try {
      const reg = createRuntimeRegistry();
      vi.setSystemTime(1000);
      reg.register("mine", () => {}, "张三");
      vi.setSystemTime(2000);
      reg.register("other", () => {}, "李四"); // 更活跃：不按空间筛必取到它
      const mockSend = createMockSend();
      const promise = reg.fetchFromClient(null, "req-space", "runtime.snapshot", {}, mockSend.send, "张三");
      expect(mockSend.sent[0].clientId).toBe("mine");
      reg.resolveFetch("mine", "req-space", { ok: 1 }, null);
      await expect(promise).resolves.toEqual({ ok: 1 });
      // 空间无匹配客户端、也没有空间未知客户端 → 抛（不得跨空间回落）
      await expect(
        reg.fetchFromClient(null, "req-none", "runtime.snapshot", {}, mockSend.send, "王五")
      ).rejects.toThrow(NoOnlineClientError);
    } finally {
      vi.useRealTimers();
    }
  });
});
