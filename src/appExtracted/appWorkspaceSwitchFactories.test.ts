// programmaticSwitchSpace / programmaticSwitchModel 的单测。
//
// 这两条是「改当前打开的是哪个空间 / 哪个模型」，与 appControlFactories.test.tsx 里
// 那 9 条「改当前模型的图元」不同，故单独一个文件，不去动既有的那套 mock。
//
// 三条要害：
//   ① 有未保存修改必须**同步抛 bad-request**（不弹模态框 —— 程序化调用方点不了确认框）；
//   ② 切空间必须**先回执再 reload**（否则 WS 被页面卸载掐断，调用方只拿到 ws-timeout）；
//   ③ 定位不到的模型/空间必须报错并给出可用值，**不回退**到「打开第一个」。
import { describe, expect, test, vi } from "vitest";
import { createProgrammaticSwitchSpace, createProgrammaticSwitchModel } from "./appControlFactories";

/** 假的方案树：方案A / 方案A/子方案B，各自挂一个模型 */
function createSchemes() {
  return [
    {
      id: "scheme:A",
      name: "方案A",
      projects: [{ id: "project:A/模型1", project: { idx: 11 }, name: "模型1" }],
      children: [
        {
          id: "scheme:A/B",
          name: "子方案B",
          projects: [{ id: "project:A/B/模型2", project: { idx: 22 }, name: "模型2" }],
          children: []
        }
      ]
    }
  ];
}

describe("programmaticSwitchSpace", () => {
  test("无未保存修改 → 回执 scheduled=true，且切换在下一个宏任务才启动", () => {
    const switchToSpace = vi.fn();
    const scheduled: Array<() => void> = [];
    const scope = {
      spaces: [
        { id: "default", name: "默认空间" },
        { id: "zhangsan", name: "张三" }
      ],
      currentSpaceId: "default",
      saveRequired: false
    };
    const swap = createProgrammaticSwitchSpace(scope, {
      switchToSpace,
      schedule: (fn) => scheduled.push(fn)
    });
    const result = swap("zhangsan");
    expect(result).toEqual({ scheduled: true, alreadyCurrent: false, spaceId: "zhangsan", spaceName: "张三" });
    // 关键：回执已经拿到，但切换还没发生 —— 否则 location.reload() 会掐断 WS
    expect(switchToSpace).not.toHaveBeenCalled();
    scheduled.forEach((fn) => fn());
    expect(switchToSpace).toHaveBeenCalledWith("zhangsan");
  });

  test("已在目标空间 → scheduled=false 且不排期", () => {
    const switchToSpace = vi.fn();
    const scheduled: Array<() => void> = [];
    const scope = {
      spaces: [{ id: "default", name: "默认空间" }],
      currentSpaceId: "default",
      saveRequired: false
    };
    const swap = createProgrammaticSwitchSpace(scope, { switchToSpace, schedule: (fn) => scheduled.push(fn) });
    const result = swap("default");
    expect(result.scheduled).toBe(false);
    expect(result.alreadyCurrent).toBe(true);
    expect(scheduled).toHaveLength(0);
    expect(switchToSpace).not.toHaveBeenCalled();
  });

  test("有未保存修改 → bad-request，且不排期（不静默丢草稿）", () => {
    const switchToSpace = vi.fn();
    const scheduled: Array<() => void> = [];
    const scope = {
      spaces: [{ id: "default", name: "默认空间" }, { id: "zhangsan", name: "张三" }],
      currentSpaceId: "default",
      saveRequired: true
    };
    const swap = createProgrammaticSwitchSpace(scope, { switchToSpace, schedule: (fn) => scheduled.push(fn) });
    expect(() => swap("zhangsan")).toThrow(/未保存修改/u);
    try {
      swap("zhangsan");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
    expect(scheduled).toHaveLength(0);
    expect(switchToSpace).not.toHaveBeenCalled();
  });

  test("未知空间 → bad-request 且列出可用空间（让调用方能自我纠正）", () => {
    const scope = {
      spaces: [{ id: "default", name: "默认空间" }],
      currentSpaceId: "default",
      saveRequired: false
    };
    const swap = createProgrammaticSwitchSpace(scope, { switchToSpace: vi.fn(), schedule: vi.fn() });
    expect(() => swap("nobody")).toThrow(/未知空间：nobody/u);
    try {
      swap("nobody");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
      expect(e.message).toContain("default");
    }
  });

  test("spaceId 为空 → bad-request", () => {
    const scope = { spaces: [], currentSpaceId: "", saveRequired: false };
    const swap = createProgrammaticSwitchSpace(scope, { switchToSpace: vi.fn(), schedule: vi.fn() });
    expect(() => swap("  ")).toThrow(/spaceId 必填/u);
  });
});

describe("programmaticSwitchModel", () => {
  test("按 modelId（稳定序号 idx）定位并加载", async () => {
    const loadSavedProjectRecord = vi.fn(async (_record: any, _schemeId?: string) => true);
    const scope = {
      schemes: createSchemes(),
      activeProjectKey: "project:A/模型1",
      saveRequired: false,
      loadSavedProjectRecord
    };
    const swap = createProgrammaticSwitchModel(scope);
    const result = await swap({ modelId: 22 });
    expect(loadSavedProjectRecord).toHaveBeenCalledTimes(1);
    // 必须传方案**运行期 id**（scheme:A/B），不是 slug —— 传错会解析不出磁盘路径
    expect(loadSavedProjectRecord.mock.calls[0][1]).toBe("scheme:A/B");
    expect(result.alreadyOpen).toBe(false);
    expect(result.modelId).toBe(22);
    expect(result.name).toBe("模型2");
  });

  test("按 schemePath + name 定位并加载", async () => {
    const loadSavedProjectRecord = vi.fn(async () => true);
    const scope = {
      schemes: createSchemes(),
      activeProjectKey: "",
      saveRequired: false,
      loadSavedProjectRecord
    };
    const swap = createProgrammaticSwitchModel(scope);
    const result = await swap({ schemePath: ["方案A", "子方案B"], name: "模型2" });
    expect(loadSavedProjectRecord).toHaveBeenCalledTimes(1);
    expect(result.modelId).toBe(22);
    expect(result.schemePath).toEqual(["方案A", "子方案B"]);
  });

  test("已经是当前模型 → alreadyOpen=true 且不重复加载", async () => {
    const loadSavedProjectRecord = vi.fn(async () => true);
    const scope = {
      schemes: createSchemes(),
      activeProjectKey: "project:A/模型1",
      saveRequired: false,
      loadSavedProjectRecord
    };
    const swap = createProgrammaticSwitchModel(scope);
    const result = await swap({ modelId: 11 });
    expect(result.alreadyOpen).toBe(true);
    expect(result.modelId).toBe(11);
    expect(loadSavedProjectRecord).not.toHaveBeenCalled();
  });

  test("有未保存修改 → bad-request，且不加载", async () => {
    const loadSavedProjectRecord = vi.fn(async () => true);
    const scope = {
      schemes: createSchemes(),
      activeProjectKey: "project:A/模型1",
      saveRequired: true,
      loadSavedProjectRecord
    };
    const swap = createProgrammaticSwitchModel(scope);
    await expect(swap({ modelId: 22 })).rejects.toThrow(/未保存修改/u);
    expect(loadSavedProjectRecord).not.toHaveBeenCalled();
  });

  test("定位不到模型 → bad-request 且不回退打开别的模型", async () => {
    const loadSavedProjectRecord = vi.fn(async () => true);
    const scope = {
      schemes: createSchemes(),
      activeProjectKey: "project:A/模型1",
      saveRequired: false,
      loadSavedProjectRecord
    };
    const swap = createProgrammaticSwitchModel(scope);
    await expect(swap({ modelId: 999 })).rejects.toThrow(/未找到 modelId 为 999/u);
    await expect(swap({ schemePath: ["方案A"], name: "不存在的模型" })).rejects.toThrow(/未找到模型/u);
    await expect(swap({ schemePath: ["没有的方案"], name: "模型1" })).rejects.toThrow(/未找到方案路径/u);
    expect(loadSavedProjectRecord).not.toHaveBeenCalled();
  });

  test("不给任何定位参数 → bad-request", async () => {
    const scope = {
      schemes: createSchemes(),
      activeProjectKey: "",
      saveRequired: false,
      loadSavedProjectRecord: vi.fn()
    };
    const swap = createProgrammaticSwitchModel(scope);
    await expect(swap({})).rejects.toThrow(/modelId、modelKey 或 schemePath/u);
  });

  test("加载失败（读盘错误）→ internal，不假装成功", async () => {
    const scope = {
      schemes: createSchemes(),
      activeProjectKey: "project:A/模型1",
      saveRequired: false,
      loadSavedProjectRecord: vi.fn(async () => false)
    };
    const swap = createProgrammaticSwitchModel(scope);
    await expect(swap({ modelId: 22 })).rejects.toMatchObject({ code: "internal" });
  });
});
