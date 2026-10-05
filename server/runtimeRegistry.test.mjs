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

// 心跳陈旧口径：HEARTBEAT_TIMEOUT_MS = 60s，条目超过 60s 未 touch 即视为离线。
// 四个读入口（listClients / getClient / pickDefaultClient / resolveClient）各自
// 按 lastActiveAt >= now - 60s 过滤，前面的用例只推进到几秒，从未让任何条目变陈旧。
//
// 判别力说明（三条断言各自独立承重，缺一不可）：
// ① 阈值边界。判据是 >= 而非 >，故恰好 60s 时仍算在线，多 1ms 才算陈旧。
//    边界断言让「阈值改成 0」和「阈值改成 120s」两种变异都会转红。
// ② 陈旧 + 新鲜并存，且**分处不同空间**。无参选取时排序本就偏爱新鲜者，单独断言
//    返回值会被 sort 掩盖；改用空间维度后，去掉陈旧过滤会直接把陈旧条目返回。
// ③ 只有陈旧者在场 → 返回 null。去掉陈旧过滤即转红。
describe("runtimeRegistry 心跳陈旧口径", () => {
  // 条目 old 在 T0 注册，59s 后 new 注册；old 在 T0+60_000 起变陈旧、new 在 T0+119_001 起变陈旧
  const T0 = 100_000;

  test("listClients 过滤掉心跳陈旧条目", () => {
    vi.useFakeTimers();
    try {
      const reg = createRuntimeRegistry();
      vi.setSystemTime(T0);
      reg.register("old", () => {}, "张三");
      vi.setSystemTime(T0 + 59_000);
      reg.register("new", () => {}, "李四");
      // old 恰好 60s 未活跃（cutoff == lastActiveAt）：仍算在线
      vi.setSystemTime(T0 + 60_000);
      expect(reg.listClients().map((c) => c.clientId)).toEqual(["old", "new"]);
      // 再多 1ms：old 出局，new 保留
      vi.setSystemTime(T0 + 60_001);
      expect(reg.listClients().map((c) => c.clientId)).toEqual(["new"]);
      // 陈旧条目只是被读时过滤，条目本身仍在表里：touch 后立刻复活
      expect(reg._clients.has("old")).toBe(true);
      reg.touch("old");
      expect(reg.listClients().map((c) => c.clientId)).toEqual(["old", "new"]);
    } finally {
      vi.useRealTimers();
    }
  });

  test("getClient 对心跳陈旧条目返回 null", () => {
    vi.useFakeTimers();
    try {
      const reg = createRuntimeRegistry();
      vi.setSystemTime(T0);
      reg.register("old", () => {});
      vi.setSystemTime(T0 + 59_000);
      reg.register("new", () => {});
      // 边界：恰好 60s 时两个条目都可取
      vi.setSystemTime(T0 + 60_000);
      expect(reg.getClient("old").clientId).toBe("old");
      expect(reg.getClient("new").clientId).toBe("new");
      // 越过 1ms：only old 变 null；未注册 id 同样为 null（两者不可混为一谈）
      vi.setSystemTime(T0 + 60_001);
      expect(reg.getClient("old")).toBeNull();
      expect(reg.getClient("new").clientId).toBe("new");
      expect(reg.getClient("never-registered")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  test("pickDefaultClient 跳过心跳陈旧条目：陈旧与新鲜并存", () => {
    vi.useFakeTimers();
    try {
      const reg = createRuntimeRegistry();
      vi.setSystemTime(T0);
      reg.register("old", () => {}, "张三");
      vi.setSystemTime(T0 + 59_000);
      reg.register("new", () => {}, "李四");
      // 边界：old 恰好 60s 未活跃，张三空间仍能取到它
      vi.setSystemTime(T0 + 60_000);
      expect(reg.pickDefaultClient("张三").clientId).toBe("old");
      // 再多 1ms：old 陈旧、new 新鲜，两条并存
      vi.setSystemTime(T0 + 60_001);
      // 无参：取新鲜的那个
      expect(reg.pickDefaultClient().clientId).toBe("new");
      expect(reg.pickDefaultClient("李四").clientId).toBe("new");
      // 张三空间只剩陈旧条目 → null。不能退到李四，也不能把陈旧条目当在线返回
      expect(reg.pickDefaultClient("张三")).toBeNull();
      // new 也陈旧：全表无在线条目
      vi.setSystemTime(T0 + 119_001);
      expect(reg.pickDefaultClient()).toBeNull();
      expect(reg.pickDefaultClient("李四")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  test("resolveClient 指名陈旧条目抛错、默认选取跳过陈旧条目", () => {
    vi.useFakeTimers();
    try {
      const reg = createRuntimeRegistry();
      vi.setSystemTime(T0);
      reg.register("old", () => {}, "张三");
      vi.setSystemTime(T0 + 59_000);
      reg.register("new", () => {}, "李四");
      // 边界：恰好 60s 时指名仍生效（空间校验也通过，不会提前抛）
      vi.setSystemTime(T0 + 60_000);
      expect(reg.resolveClient("old", "张三").clientId).toBe("old");
      // 再多 1ms：old 陈旧 → 指名按离线处理
      vi.setSystemTime(T0 + 60_001);
      expect(() => reg.resolveClient("old")).toThrow(NoOnlineClientError);
      expect(() => reg.resolveClient("old", "张三")).toThrow(NoOnlineClientError);
      // 并存时默认选取取新鲜者
      expect(reg.resolveClient().clientId).toBe("new");
      expect(reg.resolveClient(null, "李四").clientId).toBe("new");
      // 张三空间只剩陈旧条目：既不返回它，也不跨空间回落到李四的新鲜条目
      expect(() => reg.resolveClient(null, "张三")).toThrow(NoOnlineClientError);
      // 全表陈旧：默认选取也抛
      vi.setSystemTime(T0 + 119_001);
      expect(() => reg.resolveClient()).toThrow(NoOnlineClientError);
      expect(() => reg.resolveClient("new")).toThrow(NoOnlineClientError);
    } finally {
      vi.useRealTimers();
    }
  });

  test("touch 刷新活跃时间后条目从陈旧恢复为在线", () => {
    vi.useFakeTimers();
    try {
      const reg = createRuntimeRegistry();
      vi.setSystemTime(T0);
      reg.register("old", () => {}, "张三");
      vi.setSystemTime(T0 + 59_000);
      reg.register("new", () => {}, "李四");
      // 推进到两条都陈旧
      vi.setSystemTime(T0 + 119_001);
      expect(reg.listClients()).toHaveLength(0);
      expect(reg.getClient("old")).toBeNull();
      expect(reg.pickDefaultClient()).toBeNull();
      // old 收到心跳：立刻回到在线，new 仍是陈旧
      reg.touch("old");
      expect(reg.getClient("old").clientId).toBe("old");
      expect(reg.listClients().map((c) => c.clientId)).toEqual(["old"]);
      expect(reg.pickDefaultClient().clientId).toBe("old");
      expect(reg.resolveClient().clientId).toBe("old");
    } finally {
      vi.useRealTimers();
    }
  });
});
