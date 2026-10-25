import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  createStartProjectTreeSortDrag,
  createEndProjectTreeSortDrag,
  createHandleProjectTreeDragOver,
  createHandleProjectTreeDrop,
  projectTreeParentKey,
  projectTreeSiblingIds,
  projectTreeModelIds,
  projectTreeModelOwnerKey,
  PROJECT_TREE_DRAG_TYPE_SCHEME,
  PROJECT_TREE_DRAG_TYPE_MODEL,
  PROJECT_TREE_ROOT_END_KEY
} from "./appDeviceDefinitionFactories";

// 模型库方案树拖动排序：顺序只存本机偏好（libraryTreeOrder.projectSchemes / projectModels），
// 不写回后端。拖动键直接用记录 id（本身已带 "scheme:" / "model:" 前缀）。

const SCHEME_A = "scheme:根/甲";
const SCHEME_B = "scheme:根/乙";
const CHILD = "scheme:根/甲/子一";
const MODEL_A = "model:根/甲/模型一";
const MODEL_B = "model:根/甲/模型二";

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
});
