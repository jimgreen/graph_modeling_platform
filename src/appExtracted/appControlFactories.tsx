// @ts-nocheck
// swigger 控制台写操作程序化方法工厂。
// 与 UI 写方法隔离：参数显式传入，复用底层 setter，绕过 prompt/alert/draft/editMode。
// 经 WS control 指令调用（App.tsx commandHandler 分发）。
import { createDefaultNode, DEVICE_LIBRARY_BY_KIND } from "../model";

// 新增图元：kind 限 DeviceKind 枚举，attrs 从 deviceDefinition 取默认（createDefaultNode 内部完成），
// 调用方可 override（position/params 等）。压 undo 栈（C-5），不落盘（D-3）。
export function createProgrammaticAddDevice(__appScope: Record<string, any>) {
  return (kind: string, x?: number, y?: number, attrs?: Record<string, any>) => {
    const { pushUndoSnapshot, setNodes } = __appScope;
    if (!kind || typeof kind !== "string") {
      const e: any = new Error("kind 必填。");
      e.code = "bad-request";
      throw e;
    }
    if (!DEVICE_LIBRARY_BY_KIND.has(kind)) {
      const e: any = new Error(`未知图元类型：${kind}`);
      e.code = "bad-request";
      throw e;
    }
    const position = { x: Number(x) || 0, y: Number(y) || 0 };
    const node = createDefaultNode(kind as any, position);
    // attrs override：浅合并到节点顶层字段（如 name/rotation/scale/layerId/params）
    if (attrs && typeof attrs === "object") {
      for (const key of Object.keys(attrs)) {
        const value = (attrs as any)[key];
        if (key === "params" && node.params && typeof value === "object") {
          (node as any).params = { ...node.params, ...value };
        } else {
          (node as any)[key] = value;
        }
      }
    }
    pushUndoSnapshot();
    setNodes((prev: any[]) => [...prev, node]);
    return { id: node.id };
  };
}
