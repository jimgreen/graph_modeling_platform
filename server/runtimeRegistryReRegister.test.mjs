// 同 clientId 重复注册 / 注销的身份语义（回归守卫）。
//
// **实测缺陷（已修）**：clientId 持久化在 localStorage（见 runtimeWsClient 的
// getOrCreateClientId），所以同一浏览器开两个标签页会拿到**同一个 clientId**。
// 两个连接都注册后第二次会顶掉第一条；此后任一标签页关闭时 ws.on("close") 调
// unregister(clientId) 只按 id 查 —— 取到的是**另一条**，把它也注销了。
//
// 实测复现：两个标签页都连上 → 关掉其中一个 → 另一个仍在正常渲染，
// 但 /v1/runtime/model 立刻返回 503 no-online-client。
//
// 修法：unregister 支持传 entry 做身份比对，旧连接的 close 变成空操作；
// 重复 register 时也立即拒绝旧条目的挂起请求（否则只能等超时）。
import { describe, expect, test, vi } from "vitest";
import { createRuntimeRegistry, NoOnlineClientError } from "./runtimeRegistry.mjs";

describe("同 clientId 的重复注册与注销", () => {
  test("旧连接的注销不影响新连接（回归：曾把仍在线的那条误删）", () => {
    const reg = createRuntimeRegistry();
    const first = reg.register("shared-id", () => {}, "空间A");
    const second = reg.register("shared-id", () => {}, "空间A");

    // 第二次注册顶掉了第一条
    expect(reg.listClients()).toHaveLength(1);

    // 第一个标签页关闭 → 带上它自己的 entry 注销 → 应为空操作
    reg.unregister("shared-id", first);
    expect(reg.listClients(), "新连接不应被旧连接的 close 误删").toHaveLength(1);

    // 新连接仍可被正常寻址
    expect(reg.getClient("shared-id")).toBe(second);
  });

  test("新连接自己关闭时才真正注销", () => {
    const reg = createRuntimeRegistry();
    reg.register("shared-id", () => {}, "空间A");
    const second = reg.register("shared-id", () => {}, "空间A");

    reg.unregister("shared-id", second);
    expect(reg.listClients()).toHaveLength(0);
  });

  test("不带 entry 的旧调用仍按 id 注销（保持向后兼容）", () => {
    const reg = createRuntimeRegistry();
    reg.register("c1", () => {}, "空间A");
    reg.unregister("c1");
    expect(reg.listClients()).toHaveLength(0);
  });

  test("重复注册时旧条目的挂起 fetch/command 立即被拒（不再白等一个超时周期）", async () => {
    vi.useFakeTimers();
    try {
      const reg = createRuntimeRegistry();
      const mockSend = { send: () => {} };
      reg.register("c1", () => {}, "空间A");

      // 在旧条目上挂两个等待中的请求
      const fetchPromise = reg.fetchFromClient("c1", "req-1", "runtime.model", {}, mockSend.send, "空间A");
      const commandPromise = reg.commandFromClient("c1", "req-2", "control.device.add", {}, mockSend.send, "空间A");

      // 同 id 再注册一次 —— 旧条目的挂起请求必须立刻以 no-online-client 结束
      reg.register("c1", () => {}, "空间A");

      await expect(fetchPromise).rejects.toThrow(NoOnlineClientError);
      await expect(commandPromise).rejects.toThrow(NoOnlineClientError);
    } finally {
      vi.useRealTimers();
    }
  });

  test("超时清理按身份注销：旧条目超时不影响同 id 的新连接", () => {
    // runtimeWs 的 sweep 定时器遍历 _clients 并逐条注销；若只传 id，
    // 一条「已被顶替但仍留在遍历快照里」的旧条目会误删新连接。
    const reg = createRuntimeRegistry();
    const stale = reg.register("shared-id", () => {}, "空间A");
    const fresh = reg.register("shared-id", () => {}, "空间A");

    // 模拟 sweep 拿到旧条目后调用（带 entry）
    reg.unregister("shared-id", stale);
    expect(reg.getClient("shared-id")).toBe(fresh);
  });
});
