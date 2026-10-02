// 活动模型指针：记录「上次打开的是哪个模型、在哪个方案路径下」，供下次启动时恢复现场。
// 两条契约：① 找不到模型就返回 null（不要写一个指向不存在模型的指针，否则启动后跳空）；
// ② 找不到方案路径时用方案名兜底成单元素路径（不是空数组 —— 空数组会被当成「无路径」）。
import { describe, expect, test } from "vitest";

import { activeProjectPointerPayload, findSavedSchemeByPath } from "./appExtracted/appCoreCanvasUtilities";

const project = (id: string, name: string) => ({ id, name, project: {} }) as any;
const scheme = (id: string, name: string, projects: any[], children: any[] = []) => ({ id, name, projects, children }) as any;

describe("activeProjectPointerPayload", () => {
  test("找到模型时给出名字与方案路径", () => {
    const schemes = [scheme("s1", "顶层", [project("p1", "模型A")])];

    expect(activeProjectPointerPayload(schemes, "p1", "s1")).toEqual({
      activeProjectName: "模型A",
      activeSchemePath: ["顶层"]
    });
  });

  test("模型在子方案里时路径包含整条链", () => {
    const schemes = [scheme("s1", "顶层", [], [scheme("s2", "子", [project("p1", "模型A")])])];

    expect(activeProjectPointerPayload(schemes, "p1", "s2")?.activeSchemePath).toEqual(["顶层", "子"]);
  });

  test("找不到模型时返回 null", () => {
    const schemes = [scheme("s1", "顶层", [project("p1", "模型A")])];

    expect(activeProjectPointerPayload(schemes, "不存在", "s1")).toBeNull();
  });

  test("空方案树返回 null", () => {
    expect(activeProjectPointerPayload([], "p1", "")).toBeNull();
  });

  test("指定的方案 id 不对时仍能全树找到（按 id 找模型，与方案提示无关）", () => {
    const schemes = [scheme("s1", "顶层", [project("p1", "模型A")])];

    expect(activeProjectPointerPayload(schemes, "p1", "错误的方案")?.activeProjectName).toBe("模型A");
  });

  test("返回的是新对象（不泄漏内部记录引用）", () => {
    const schemes = [scheme("s1", "顶层", [project("p1", "模型A")])];

    const pointer = activeProjectPointerPayload(schemes, "p1", "s1")!;
    pointer.activeProjectName = "改了";

    expect(schemes[0].projects[0].name).toBe("模型A");
  });
});

describe("findSavedSchemeByPath", () => {
  test("空路径返回 undefined", () => {
    expect(findSavedSchemeByPath([scheme("s1", "顶层", [])], [])).toBeUndefined();
  });

  test("单段路径命中顶层方案", () => {
    expect(findSavedSchemeByPath([scheme("s1", "顶层", [])], ["顶层"])?.id).toBe("s1");
  });

  test("多段路径逐级下钻", () => {
    const schemes = [scheme("s1", "顶层", [], [scheme("s2", "子", [])])];

    expect(findSavedSchemeByPath(schemes, ["顶层", "子"])?.id).toBe("s2");
  });

  test("名字两端空白被裁掉再比对", () => {
    expect(findSavedSchemeByPath([scheme("s1", "顶层", [])], ["  顶层  "])?.id).toBe("s1");
  });

  test("路径中断时返回 undefined", () => {
    const schemes = [scheme("s1", "顶层", [], [scheme("s2", "子", [])])];

    expect(findSavedSchemeByPath(schemes, ["顶层", "缺失"])).toBeUndefined();
  });

  test("首段命中但没有后续段时返回该方案", () => {
    const schemes = [scheme("s1", "顶层", [])];

    expect(findSavedSchemeByPath(schemes, ["顶层"])?.id).toBe("s1");
  });

  test("方案没有 children 字段时中断返回 undefined", () => {
    const schemes = [{ id: "s1", name: "顶层", projects: [] } as any];

    expect(findSavedSchemeByPath(schemes, ["顶层", "子"])).toBeUndefined();
  });
});
