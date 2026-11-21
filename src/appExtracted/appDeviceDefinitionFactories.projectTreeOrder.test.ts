import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  createStartProjectTreeSortDrag,
  createEndProjectTreeSortDrag,
  createHandleProjectTreeDragLeave,
  createHandleProjectTreeDragOver,
  createHandleProjectTreeDrop,
  projectTreeDragLayer,
  projectTreeParentKey,
  projectTreeSchemeContainsId,
  projectTreeSiblingIds,
  projectTreeModelIds,
  projectTreeModelOwnerKey,
  PROJECT_TREE_DRAG_TYPE_SCHEME,
  PROJECT_TREE_DRAG_TYPE_MODEL,
  PROJECT_TREE_ROOT_END_KEY
} from "./appDeviceDefinitionFactories";
import { createMoveProjectRecordToScheme } from "./appProjectCanvasFactories";

// 模型库方案树拖动排序：顺序只存本机偏好（libraryTreeOrder.projectSchemes / projectModels），
// 不写回后端。拖动键直接用记录 id（本身已带 "scheme:" / "model:" 前缀）。

const SCHEME_A = "scheme:根/甲";
const SCHEME_B = "scheme:根/乙";
const CHILD = "scheme:根/甲/子一";
// 运行期模型记录使用 `project:` 前缀；这是模型树真实拖拽会传入的键形态。
const MODEL_A = "project:根/甲/模型一";
const MODEL_B = "project:根/甲/模型二";
const EMPTY_ROOT_SCHEME = "scheme:空方案";
const TARGET_MODEL = "project:根/乙/目标模型";

const schemes = [
  {
    id: "scheme:根",
    name: "根",
    projects: [],
    children: [
      { id: SCHEME_A, name: "甲", projects: [{ id: MODEL_A }, { id: MODEL_B }], children: [{ id: CHILD, name: "子一", projects: [] }] },
      { id: SCHEME_B, name: "乙", projects: [], children: [] }
    ]
  }
];

const schemesWithEmptyRoot = [
  ...schemes,
  { id: EMPTY_ROOT_SCHEME, name: "空方案", projects: [], children: [] }
];

const schemesWithTargetModel = [
  {
    ...schemes[0],
    children: [
      schemes[0].children[0],
      { id: SCHEME_B, name: "乙", projects: [{ id: TARGET_MODEL, name: "目标模型" }], children: [] }
    ]
  }
];

const createScope = (overrides: Record<string, unknown> = {}) => ({
  schemes,
  libraryTreeOrder: { categoryLibraries: [], componentLibraries: {}, templateTypes: [], templates: {}, projectSchemes: {}, projectModels: {} },
  setProjectTreeDragKey: vi.fn(),
  setProjectTreeDropKey: vi.fn(),
  setLibraryTreeOrder: vi.fn(),
  ...overrides
});

const makeDragEvent = (overrides: Record<string, unknown> = {}) => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  clientY: 10,
  currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 40 }) },
  dataTransfer: { setData: vi.fn(), getData: vi.fn(() => ""), effectAllowed: "", dropEffect: "" },
  ...overrides
}) as unknown as DragEvent;

describe("方案树层级键：父级、同级清单、模型归属", () => {
  test("数字 schemeId 仍被识别为方案拖动层级", () => {
    expect(projectTreeDragLayer("42")).toBe("scheme");
    expect(projectTreeDragLayer("project:根/模型")).toBe("model");
  });

  test("数字方案 ID 用树结构阻止拖进自己的子方案", () => {
    const numericSchemes = [{
      id: "10",
      schemeId: 10,
      children: [{ id: "11", schemeId: 11, children: [] }]
    }];
    expect(projectTreeSchemeContainsId(numericSchemes, "10", "11")).toBe(true);
    expect(projectTreeSchemeContainsId(numericSchemes, "11", "10")).toBe(false);
  });

  test("顶层方案的父键是空串，嵌套方案取直接父级 id", () => {
    expect(projectTreeParentKey(schemes as never, "scheme:根")).toBe("");
    expect(projectTreeParentKey(schemes as never, SCHEME_A)).toBe("scheme:根");
    expect(projectTreeParentKey(schemes as never, CHILD)).toBe(SCHEME_A);
    expect(projectTreeParentKey(schemes as never, "scheme:不存在")).toBe("");
  });

  test("同级清单：顶层取顶层方案，父级下取其子方案", () => {
    expect(projectTreeSiblingIds(schemes as never, "")).toEqual(["scheme:根"]);
    expect(projectTreeSiblingIds(schemes as never, "scheme:根")).toEqual([SCHEME_A, SCHEME_B]);
  });

  test("模型清单与归属：模型 id 解析到所属方案", () => {
    expect(projectTreeModelIds(schemes as never, SCHEME_A)).toEqual([MODEL_A, MODEL_B]);
    expect(projectTreeModelOwnerKey(schemes as never, MODEL_A)).toBe(SCHEME_A);
    expect(projectTreeModelOwnerKey(schemes as never, "model:不存在")).toBe("");
  });
});

describe("方案树拖动：把手登记拖动键", () => {
  test("从把手发起时写自定义 MIME 并记录拖动键", () => {
    const scope = createScope();
    const start = createStartProjectTreeSortDrag(scope as never);
    const event = makeDragEvent({
      target: { closest: () => ({ className: "project-tree-drag-handle" }) }
    });
    start(event as never, SCHEME_A);

    expect((event as any).dataTransfer.setData).toHaveBeenCalledWith(PROJECT_TREE_DRAG_TYPE_SCHEME, SCHEME_A);
    expect(scope.setProjectTreeDragKey).toHaveBeenCalledWith(SCHEME_A);
  });

  test("模型行用各自的 MIME", () => {
    const scope = createScope();
    const start = createStartProjectTreeSortDrag(scope as never);
    const event = makeDragEvent({ target: { closest: () => ({}) } });
    start(event as never, MODEL_A);

    expect((event as any).dataTransfer.setData).toHaveBeenCalledWith(PROJECT_TREE_DRAG_TYPE_MODEL, MODEL_A);
  });

  test("不是从把手发起（本体拖动）时不登记排序拖动", () => {
    const scope = createScope();
    const start = createStartProjectTreeSortDrag(scope as never);
    const event = makeDragEvent({ target: { closest: () => null } });
    start(event as never, SCHEME_A);

    expect(scope.setProjectTreeDragKey).not.toHaveBeenCalled();
    expect((event as any).dataTransfer.setData).not.toHaveBeenCalled();
  });

  test("dragend 清空拖动键与落点键", () => {
    const scope = createScope();
    createEndProjectTreeSortDrag(scope as never)();
    expect(scope.setProjectTreeDragKey).toHaveBeenCalledWith("");
    expect(scope.setProjectTreeDropKey).toHaveBeenCalledWith("");
  });
});

describe("方案树拖动：插入位指示与落点结算", () => {
  test("dragover：同层的插入边由**指针位置**决定（目标行下半区 = after）", () => {
    const scope = createScope({
      projectTreeDragKey: SCHEME_A,
      libraryTreeOrder: {
        categoryLibraries: [], componentLibraries: {}, templateTypes: [], templates: {},
        projectSchemes: { "scheme:根": [SCHEME_A, SCHEME_B] },
        projectModels: {}
      }
    });
    const over = createHandleProjectTreeDragOver(scope as never);
    // 指针在目标行下半区 → after（插到目标之后）。
    const event = makeDragEvent({
      clientY: 34,
      currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 40 }) }
    });
    over(event as never, SCHEME_B);

    expect(event.preventDefault).toHaveBeenCalled();
    const updater = scope.setProjectTreeDropKey.mock.calls[0][0] as (current: string) => string;
    expect(updater("")).toBe(`${SCHEME_B}|after`);
  });

  test("dragover：同层时指针在目标行上半区 → before（插到目标之前）", () => {
    const scope = createScope({ projectTreeDragKey: SCHEME_A });
    const over = createHandleProjectTreeDragOver(scope as never);
    const event = makeDragEvent({
      clientY: 6,
      currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 40 }) }
    });
    over(event as never, SCHEME_B);

    const updater = scope.setProjectTreeDropKey.mock.calls[0][0] as (current: string) => string;
    expect(updater("")).toBe(`${SCHEME_B}|before`);
  });

  test("dragover：空方案占位区域可强制使用 inside 落点", () => {
    const scope = createScope({ projectTreeDragKey: MODEL_A });
    const over = createHandleProjectTreeDragOver(scope as never);
    over(makeDragEvent({ clientY: 38 }) as never, SCHEME_B, "inside");

    const updater = scope.setProjectTreeDropKey.mock.calls[0][0] as (current: string) => string;
    expect(updater("")).toBe(`${SCHEME_B}|inside`);
  });

  test("dragover：跨层（方案↔模型）不放行", () => {
    const scope = createScope({ projectTreeDragKey: SCHEME_A });
    const over = createHandleProjectTreeDragOver(scope as never);
    const event = makeDragEvent();
    over(event as never, MODEL_A);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(scope.setProjectTreeDropKey).not.toHaveBeenCalled();
  });

  test("drop：同层重排写进本机偏好（不落库）", () => {
    const scope = createScope({
      projectTreeDragKey: SCHEME_A,
      libraryTreeOrder: {
        categoryLibraries: [], componentLibraries: {}, templateTypes: [], templates: {},
        projectSchemes: { "scheme:根": [SCHEME_A, SCHEME_B] },
        projectModels: {}
      }
    });
    const drop = createHandleProjectTreeDrop(scope as never);
    // 指针在目标行下半区 → after（插到目标之后）→ [B, A]。
    (scope as any).projectTreeDropKey = `${SCHEME_B}|after`;
    drop(makeDragEvent() as never, SCHEME_B);

    expect(scope.setLibraryTreeOrder).toHaveBeenCalledTimes(1);
    const next = scope.setLibraryTreeOrder.mock.calls[0][0] as any;
    expect(next.projectSchemes["scheme:根"]).toEqual([SCHEME_B, SCHEME_A]);
  });

  test("drop：覆盖表与数据顺序分叉时，按显示顺序插入（不是按数据顺序）", () => {
    // 回归：显示顺序是 [B, A]（用户拖过一次），数据顺序仍是 [A, B]。
    // 若结算用数据顺序，重排结果是 [B, A]（等于没动），渲染出来却像「两项互换」。
    const scope = createScope({
      projectTreeDragKey: SCHEME_A,
      libraryTreeOrder: {
        categoryLibraries: [], componentLibraries: {}, templateTypes: [], templates: {},
        projectSchemes: { "scheme:根": [SCHEME_B, SCHEME_A] },
        projectModels: {}
      }
    });
    const drop = createHandleProjectTreeDrop(scope as never);
    // 拖到 B 之前（上方虚线 = before）→ 显示顺序应变成 [A, B]。
    (scope as any).projectTreeDropKey = `${SCHEME_B}|before`;
    drop(makeDragEvent() as never, SCHEME_B);

    const next = scope.setLibraryTreeOrder.mock.calls[0][0] as any;
    expect(next.projectSchemes["scheme:根"]).toEqual([SCHEME_A, SCHEME_B]);
  });

  test("drop：模型同层重排写进该方案的模型桶", () => {
    const scope = createScope({
      projectTreeDragKey: MODEL_A,
      libraryTreeOrder: {
        categoryLibraries: [], componentLibraries: {}, templateTypes: [], templates: {},
        projectSchemes: {},
        projectModels: { [SCHEME_A]: [MODEL_A, MODEL_B] }
      }
    });
    const drop = createHandleProjectTreeDrop(scope as never);
    // 指针在目标行下半区 → after（插到目标之后）→ [B, A]。
    (scope as any).projectTreeDropKey = `${MODEL_B}|after`;
    drop(makeDragEvent() as never, MODEL_B);

    const next = scope.setLibraryTreeOrder.mock.calls[0][0] as any;
    expect(next.projectModels[SCHEME_A]).toEqual([MODEL_B, MODEL_A]);
  });

  test("drop：没有拖动键时不结算", () => {
    const scope = createScope({ projectTreeDragKey: "" });
    const drop = createHandleProjectTreeDrop(scope as never);
    drop(makeDragEvent() as never, SCHEME_B);

    expect(scope.setLibraryTreeOrder).not.toHaveBeenCalled();
  });
});

describe("方案树跨层级拖动：落在目标行上半区 = 成为目标的子方案", () => {
  const makeHalfEvent = (ratio: number) => makeDragEvent({
    clientY: 40 * ratio,
    currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 40 }) }
  });

  test("dragover：跨层（父子不同）时指针在目标行上半区 → inside", () => {
    // SCHEME_B 的父是「scheme:根」，SCHEME_A 的父也是「scheme:根」→ 同层；
    // 用 CHILD（父为 SCHEME_A）拖到 SCHEME_B（父为「scheme:根」）上才是跨层。
    const scope = createScope({ projectTreeDragKey: CHILD });
    const over = createHandleProjectTreeDragOver(scope as never);
    over(makeHalfEvent(0.25) as never, SCHEME_B);

    const updater = scope.setProjectTreeDropKey.mock.calls[0][0] as (current: string) => string;
    expect(updater("")).toBe(`${SCHEME_B}|inside`);
  });

  test("dragover：跨层时指针在目标行下半区 → after（成为目标的后继兄弟）", () => {
    const scope = createScope({ projectTreeDragKey: CHILD });
    const over = createHandleProjectTreeDragOver(scope as never);
    over(makeHalfEvent(0.8) as never, SCHEME_B);

    const updater = scope.setProjectTreeDropKey.mock.calls[0][0] as (current: string) => string;
    expect(updater("")).toBe(`${SCHEME_B}|after`);
  });

  test("dragover：同层时指针在目标行上半区 → before（插到目标之前，本机覆盖）", () => {
    const scope = createScope({ projectTreeDragKey: SCHEME_B });
    const over = createHandleProjectTreeDragOver(scope as never);
    over(makeHalfEvent(0.25) as never, SCHEME_A);

    const updater = scope.setProjectTreeDropKey.mock.calls[0][0] as (current: string) => string;
    expect(updater("")).toBe(`${SCHEME_A}|before`);
  });

  test("drop：inside 调既有跨层级移动（落库），不写本机顺序", () => {
    const moveSchemeRecordToScheme = vi.fn();
    const scope = createScope({
      projectTreeDragKey: CHILD,
      projectTreeDropKey: `${SCHEME_B}|inside`,
      moveSchemeRecordToScheme
    });
    const drop = createHandleProjectTreeDrop(scope as never);
    drop(makeDragEvent() as never, SCHEME_B);

    // 目标行 id 即新归属的父 id —— 「成为 SCHEME_B 的子方案」。
    expect(moveSchemeRecordToScheme).toHaveBeenCalledWith(CHILD, SCHEME_B);
    expect(scope.setLibraryTreeOrder).not.toHaveBeenCalled();
  });

  test("drop：跨层 + after → 移到目标所在父级、插到目标之后（落库）", () => {
    const moveSchemeRecordToPosition = vi.fn();
    const scope = createScope({
      projectTreeDragKey: CHILD,
      projectTreeDropKey: `${SCHEME_B}|after`,
      moveSchemeRecordToPosition
    });
    const drop = createHandleProjectTreeDrop(scope as never);
    drop(makeDragEvent() as never, SCHEME_B);

    // 目标 SCHEME_B 的父是「scheme:根」；SCHEME_B 是该父下第 2 项 → 插到其后 = 无 insertBeforeId。
    expect(moveSchemeRecordToPosition).toHaveBeenCalledWith(CHILD, "scheme:根", "");
  });

  test("drop：模型落在方案行 → 移进该方案（跨层级，落库）", () => {
    const moveProjectRecordToScheme = vi.fn();
    const scope = createScope({
      projectTreeDragKey: MODEL_A,
      projectTreeDropKey: `${SCHEME_A}|inside`,
      moveProjectRecordToScheme
    });
    const drop = createHandleProjectTreeDrop(scope as never);
    drop(makeDragEvent() as never, SCHEME_A);

    expect(moveProjectRecordToScheme).toHaveBeenCalledWith(MODEL_A, SCHEME_A);
  });

  test("drop：空顶层方案下方的虚线仍把模型放进该空方案", () => {
    const moveProjectRecordToScheme = vi.fn();
    const scope = createScope({
      schemes: schemesWithEmptyRoot,
      projectTreeDragKey: MODEL_A,
      projectTreeDropKey: `${EMPTY_ROOT_SCHEME}|after`,
      moveProjectRecordToScheme
    });
    const drop = createHandleProjectTreeDrop(scope as never);
    drop(makeDragEvent() as never, EMPTY_ROOT_SCHEME);

    expect(moveProjectRecordToScheme).toHaveBeenCalledWith(MODEL_A, EMPTY_ROOT_SCHEME);
  });

  test("drop：模型落到其他方案的模型行上半区，目标仍是该模型所属方案", () => {
    const moveProjectRecordToScheme = vi.fn();
    const scope = createScope({
      schemes: schemesWithTargetModel,
      projectTreeDragKey: MODEL_A,
      projectTreeDropKey: `${TARGET_MODEL}|inside`,
      moveProjectRecordToScheme
    });
    const drop = createHandleProjectTreeDrop(scope as never);
    drop(makeDragEvent() as never, TARGET_MODEL);

    expect(moveProjectRecordToScheme).toHaveBeenCalledWith(MODEL_A, SCHEME_B);
  });
});

describe("方案树末尾落点：拖到列表空白 = 移到顶层末尾", () => {
  test("dragover：末尾落点放行并给出 after 边", () => {
    const scope = createScope({ projectTreeDragKey: SCHEME_B });
    const over = createHandleProjectTreeDragOver(scope as never);
    over(makeDragEvent() as never, PROJECT_TREE_ROOT_END_KEY);

    expect(scope.setProjectTreeDropKey).toHaveBeenCalledTimes(1);
    const updater = scope.setProjectTreeDropKey.mock.calls[0][0] as (current: string) => string;
    expect(updater("")).toBe(`${PROJECT_TREE_ROOT_END_KEY}|after`);
  });

  test("drop：末尾落点把方案移到顶层末尾（落库）", () => {
    const moveSchemeRecordToPosition = vi.fn();
    const scope = createScope({
      projectTreeDragKey: SCHEME_B,
      projectTreeDropKey: `${PROJECT_TREE_ROOT_END_KEY}|after`,
      moveSchemeRecordToPosition
    });
    const drop = createHandleProjectTreeDrop(scope as never);
    drop(makeDragEvent() as never, PROJECT_TREE_ROOT_END_KEY);

    // 目标父级空串 = 根层；无插入位 = 追加到根层末尾。
    expect(moveSchemeRecordToPosition).toHaveBeenCalledWith(SCHEME_B, "", "");
    expect(scope.setLibraryTreeOrder).not.toHaveBeenCalled();
  });
});

describe("方案树插入线：每个可落点的行都要有指示（不被列表末尾落点覆盖）", () => {
  test("行内落点与末尾落点产生不同的 dropKey（行内的边不会被末尾落点覆盖）", () => {
    const scope = createScope({ projectTreeDragKey: CHILD });
    const over = createHandleProjectTreeDragOver(scope as never);

    // 行内（跨层，上半区）→ inside
    over(makeDragEvent({ clientY: 10, currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 40 }) } }) as never, SCHEME_B);
    const rowUpdater = scope.setProjectTreeDropKey.mock.calls[0][0] as (current: string) => string;
    const rowKey = rowUpdater("");

    // 末尾落点（列表空白）→ after，且键与行内的不同。
    over(makeDragEvent() as never, PROJECT_TREE_ROOT_END_KEY);
    const endUpdater = scope.setProjectTreeDropKey.mock.calls[1][0] as (current: string) => string;
    const endKey = endUpdater("");

    expect(rowKey).toBe(`${SCHEME_B}|inside`);
    expect(endKey).toBe(`${PROJECT_TREE_ROOT_END_KEY}|after`);
    expect(rowKey).not.toBe(endKey);
  });
});

describe("模型库方案树：只有把手能拖（行本体不可拖）", () => {
  test("方案行与模型行的 draggable 均为 false，行上不再有 onDragStart", () => {
    // 契约：行本体可拖会把把手的拖动顶掉（浏览器从可拖祖先发起拖拽），
    // 且用户要求「只有拖把手才响应拖动」。
    const source = readFileSync(
      new URL("./appDeviceDefinitionFactories.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("draggable={false}");
    // 行本体不再有 onDragStart（跨层级移动改由把手通道承担）。
    expect(source).not.toContain("startSchemeRecordDrag(event");
    expect(source).not.toContain("startProjectRecordDrag(event");
  });

  test("方案行的 drop 通道同时接收模型拖拽 MIME", () => {
    const source = readFileSync(
      new URL("./appDeviceDefinitionFactories.tsx", import.meta.url),
      "utf8"
    );
    const schemeDropStart = source.indexOf("const sortSchemeId = event.dataTransfer.getData(PROJECT_TREE_DRAG_TYPE_SCHEME)");
    const schemeDropEnd = source.indexOf("onContextMenu={(event) => {", schemeDropStart);
    expect(schemeDropStart).toBeGreaterThanOrEqual(0);
    expect(schemeDropEnd).toBeGreaterThan(schemeDropStart);
    expect(source.slice(schemeDropStart, schemeDropEnd)).toContain("PROJECT_TREE_DRAG_TYPE_MODEL");
  });
});

describe("模型拖动到方案：落点提示与自动展开", () => {
  test("收缩方案上的模型拖动落点需要覆盖模型连接线伪元素", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    expect(css).toContain(".scheme-projects > .project-option.library-tree-drop-line-before::before");
    expect(css).toContain(".scheme-projects > .project-option.library-tree-drop-line-after::after");
  });

  test("模型停留在收缩方案上 1 秒后自动展开", () => {
    vi.useFakeTimers();
    try {
      const setExpandedSchemeIds = vi.fn();
      const scope = createScope({
        projectTreeDragKey: MODEL_A,
        expandedSchemeIds: [],
        setExpandedSchemeIds,
        projectTreeDragExpandTimerRef: { current: null }
      });
      const over = createHandleProjectTreeDragOver(scope as never);

      over(makeDragEvent({ clientY: 10 }) as never, SCHEME_B);
      vi.advanceTimersByTime(999);
      expect(setExpandedSchemeIds).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(setExpandedSchemeIds).toHaveBeenCalledTimes(1);
      const updater = setExpandedSchemeIds.mock.calls[0][0] as (current: string[]) => string[];
      expect(updater([])).toEqual([SCHEME_B]);
      expect(updater([SCHEME_B])).toEqual([SCHEME_B]);
    } finally {
      vi.useRealTimers();
    }
  });

  test("离开收缩方案后取消自动展开计时", () => {
    vi.useFakeTimers();
    try {
      const setExpandedSchemeIds = vi.fn();
      const scope = createScope({
        projectTreeDragKey: MODEL_A,
        expandedSchemeIds: [],
        setExpandedSchemeIds,
        projectTreeDragExpandTimerRef: { current: null }
      });
      const over = createHandleProjectTreeDragOver(scope as never);
      over(makeDragEvent({ clientY: 10 }) as never, SCHEME_B);

      const leave = createHandleProjectTreeDragLeave(scope as never);
      leave({
        currentTarget: { contains: () => false },
        relatedTarget: null
      } as never);
      vi.advanceTimersByTime(1000);

      expect(setExpandedSchemeIds).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("跨方案移动模型：摘要记录先读取完整内容", () => {
  test("目录摘要模型移动前读取完整模型，再提交后台移动", async () => {
    const sourceScheme = {
      id: SCHEME_A,
      name: "甲",
      projects: [{ id: MODEL_A, name: "模型一", project: { __summaryOnly: true, name: "模型一" } }],
      children: []
    };
    const targetScheme = { id: SCHEME_B, name: "乙", projects: [], children: [] };
    const fullProject = {
      id: MODEL_A,
      name: "模型一",
      project: { name: "模型一", nodes: [], edges: [] }
    };
    const fetchBackendProjectRecord = vi.fn().mockResolvedValue(fullProject);
    const commitProjectRecordMove = vi.fn();
    const scope = {
      schemes: [sourceScheme, targetScheme],
      findSchemeForProject: () => sourceScheme,
      findSavedSchemeById: (all: any[], id: string) => all.find((scheme) => scheme.id === id),
      hasSameName: () => false,
      schemePathForRecord: (scheme: any) => [scheme.name],
      fetchBackendProjectRecord,
      commitProjectRecordMove,
      setPendingRecordPasteConflict: vi.fn()
    };
    const move = createMoveProjectRecordToScheme(scope as never);

    await move(MODEL_A, SCHEME_B);

    expect(fetchBackendProjectRecord).toHaveBeenCalledWith(["甲"], "模型一");
    expect(commitProjectRecordMove).toHaveBeenCalledWith(MODEL_A, SCHEME_B, {}, fullProject);
  });
});
