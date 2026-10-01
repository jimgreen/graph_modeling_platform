// createSetOperationLogText：ref 总是写，DOM 只在 status 元素已挂载时写。
// 早于挂载调用是真实时序（ref 先于渲染建立），必须静默跳过而不是抛。
import { describe, expect, test, vi } from "vitest";

import { createSetOperationLogText } from "./appExtracted/appGraphMeasurementFactories";

describe("createSetOperationLogText", () => {
  test("元素已挂载时同时写 title 与 textContent", () => {
    const operationLogRef: { current: any } = { current: "" };
    const element = { title: "", textContent: "" } as any;
    const operationLogStatusRef = { current: element };

    createSetOperationLogText({ operationLogRef, operationLogStatusRef })("对齐 3 个节点");

    expect(operationLogRef.current).toBe("对齐 3 个节点");
    expect(element.title).toBe("对齐 3 个节点");
    expect(element.textContent).toBe("日志 对齐 3 个节点");
  });

  test("元素未挂载时只写 ref，不抛", () => {
    const operationLogRef: { current: any } = { current: "" };
    const operationLogStatusRef = { current: null as any };

    expect(() => createSetOperationLogText({ operationLogRef, operationLogStatusRef })("先到")).not.toThrow();
    expect(operationLogRef.current).toBe("先到");
  });

  test("空串也会照常落 ref", () => {
    const operationLogRef: { current: any } = { current: "旧" };
    const element = { title: "x", textContent: "y" } as any;

    createSetOperationLogText({ operationLogRef, operationLogStatusRef: { current: element } })("");

    expect(operationLogRef.current).toBe("");
    expect(element.textContent).toBe("日志 ");
  });

  test("读取时用的是同一个 DOM 桩（不新建元素）", () => {
    const element = { title: "", textContent: "" } as any;
    const spy = vi.fn();
    Object.defineProperty(element, "title", {
      get: () => "",
      set: spy,
      configurable: true
    });
    const operationLogRef: { current: any } = { current: "" };

    createSetOperationLogText({ operationLogRef, operationLogStatusRef: { current: element } })("a");

    expect(spy).toHaveBeenCalledWith("a");
  });
});
