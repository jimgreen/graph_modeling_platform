import { describe, expect, test, vi } from "vitest";
import { createProgrammaticAddDevice } from "./appControlFactories";
import { DEVICE_LIBRARY_BY_KIND } from "../model";

// mock __appScope：捕获 pushUndoSnapshot 调用与 setNodes 追加的节点
function createMockScope() {
  const calls: { undo: boolean; added: any[] } = { undo: false, added: [] };
  return {
    scope: {
      pushUndoSnapshot: () => {
        calls.undo = true;
      },
      setNodes: (updater: any) => {
        // setNodes 接收 updater 函数，用空数组 prev 触发追加
        const prev: any[] = [];
        const next = typeof updater === "function" ? updater(prev) : updater;
        calls.added = next;
      }
    },
    calls
  };
}

describe("programmaticAddDevice", () => {
  test("合法 kind 返回 id 且追加节点 + 压栈", () => {
    const { scope, calls } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    // 取一个真实存在的 DeviceKind
    const kind = DEVICE_LIBRARY_BY_KIND.keys().next().value as string;
    const result = addDevice(kind, 100, 200);
    expect(result.id).toBeTruthy();
    expect(calls.undo).toBe(true);
    expect(calls.added).toHaveLength(1);
    expect(calls.added[0].id).toBe(result.id);
    expect(calls.added[0].kind).toBe(kind);
    expect(calls.added[0].position).toEqual({ x: 100, y: 200 });
  });

  test("缺省位置默认 {0,0}", () => {
    const { scope, calls } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    const kind = DEVICE_LIBRARY_BY_KIND.keys().next().value as string;
    addDevice(kind);
    expect(calls.added[0].position).toEqual({ x: 0, y: 0 });
  });

  test("kind 缺省抛 bad-request", () => {
    const { scope } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    expect(() => addDevice("", 0, 0)).toThrow(/kind 必填/);
    try {
      addDevice("");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  test("未知 kind 抛 bad-request", () => {
    const { scope } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    expect(() => addDevice("nonexistent-kind", 0, 0)).toThrow(/未知图元类型/);
    try {
      addDevice("nonexistent-kind");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  test("attrs override 合并到节点（顶层字段 + params 深合）", () => {
    const { scope, calls } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    const kind = DEVICE_LIBRARY_BY_KIND.keys().next().value as string;
    addDevice(kind, 10, 20, { name: "自定义名", rotation: 45, params: { extra: "x" } });
    const node = calls.added[0];
    expect(node.name).toBe("自定义名");
    expect(node.rotation).toBe(45);
    expect(node.params).toHaveProperty("extra", "x");
    // params 原有默认字段保留
    expect(node.params).toBeDefined();
  });

  test("节点含 terminals（createDefaultNode 已构造端子）", () => {
    const { scope, calls } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    const kind = DEVICE_LIBRARY_BY_KIND.keys().next().value as string;
    addDevice(kind, 0, 0);
    expect(Array.isArray(calls.added[0].terminals)).toBe(true);
  });
});
