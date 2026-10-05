import { afterEach, describe, expect, test, vi } from "vitest";
import { createMeasurementEditorGroupId, randomSource, useRenderBatch } from "./appRenderBatch";
import type { LibraryPackageScope } from "./appPersistenceLibraryExport";
import { APP_STATIC_SCOPE } from "./appStaticScope";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// 审计对象：appRenderBatch.tsx 里原先内联的
//   `measurement-${nodeId}${terminalId ? `-${terminalId}` : ""}-group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
//
// 分级结论（去向追踪，见 appRenderBatch.tsx 中该函数上方的注释）：
//   它**不是**纯视觉/临时 id，而是 MeasurementGroup.id，会经
//   confirmMeasurementEditorDialog 的 cloneMeasurementGroupForDraft({ ...group }) 原样带走，
//   落进 projectMeasurements → 持久化方案/工程 + runtimeSnapshot 的 measurements 输出，
//   并作为 DOM 的 data-export-measurement-group-id 与 React key 参与渲染。
//   故必须可注入随机源，下面这些断言就是为「收敛真的生效」准备的。
//
// 断言取值的纪律：固定随机源刻意**不取 0.5 / 0 这类易被硬编码猜中的值** ——
// 若生产代码被改成写死某个常量，用 0.5 会假绿，用下面的值就会红。

const FIXED_RANDOM = 0.123456789;
const OTHER_RANDOM = 0.987654321;
const FIXED_EPOCH_MS = Date.UTC(2024, 0, 2, 3, 4, 5);
const FIXED_EPOCH_BASE36 = FIXED_EPOCH_MS.toString(36);

const suffixOf = (value: number) => value.toString(36).slice(2, 6);

// globalThis 逐键还原：appRenderBatch 里 showGlobalMessage / showGlobalConfirm 是**裸标识符**
// （不是从 __appScope 解构来的），实际解析到 globalThis 上由 src/test-setup.ts 装的那两个桩。
// 探针要断言「装配期不弹全局提示」，就得能观测并替换它们；afterEach 逐键还原，
// 避免把替换态漏给同 worker 后续文件（vitest isolate=true 时同进程内仍可能有残留）。
const GLOBAL_STUB_DESCRIPTORS = new Map<string, PropertyDescriptor | undefined>();

const stubGlobal = (key: string, value: unknown) => {
  if (!GLOBAL_STUB_DESCRIPTORS.has(key)) {
    GLOBAL_STUB_DESCRIPTORS.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  }
  (globalThis as Record<string, unknown>)[key] = value;
};

afterEach(() => {
  for (const [key, descriptor] of GLOBAL_STUB_DESCRIPTORS) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      delete (globalThis as Record<string, unknown>)[key];
    }
  }
  GLOBAL_STUB_DESCRIPTORS.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("量测编辑组 id 的随机源已收敛为可注入依赖", () => {
  test("注入固定随机源时，同一输入产出同一个 id（可复现）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    const first = createMeasurementEditorGroupId("n1", undefined, () => FIXED_RANDOM);
    const second = createMeasurementEditorGroupId("n1", undefined, () => FIXED_RANDOM);

    expect(first).toBe(second);
    expect(first).toBe(`measurement-n1-group-${FIXED_EPOCH_BASE36}-${suffixOf(FIXED_RANDOM)}`);
  });

  test("随机源不同则 id 不同（否则说明随机值没被真正接进去）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    expect(createMeasurementEditorGroupId("n1", undefined, () => FIXED_RANDOM))
      .not.toBe(createMeasurementEditorGroupId("n1", undefined, () => OTHER_RANDOM));
  });

  test("注入的随机值按 base36 取前 4 位进入 id", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    const id = createMeasurementEditorGroupId("n1", undefined, () => FIXED_RANDOM);

    expect(id.endsWith(`-${suffixOf(FIXED_RANDOM)}`)).toBe(true);
    expect(suffixOf(FIXED_RANDOM)).toHaveLength(4);
    expect(id).toMatch(/^measurement-n1-group-[a-z0-9]+-[a-z0-9]{4}$/);
  });

  test("terminalId 有无两种形态都保持原有前缀拼接", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    expect(createMeasurementEditorGroupId("n1", "t1", () => FIXED_RANDOM))
      .toBe(`measurement-n1-t1-group-${FIXED_EPOCH_BASE36}-${suffixOf(FIXED_RANDOM)}`);
    // 空串 terminalId 与 undefined 同形（沿用原先的真值判断，不改语义）
    expect(createMeasurementEditorGroupId("n1", "", () => FIXED_RANDOM))
      .toBe(createMeasurementEditorGroupId("n1", undefined, () => FIXED_RANDOM));
  });

  test("不传随机源时默认走 randomSource，且它转发调用那一刻的 Math.random", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    const mathRandomStub = vi.spyOn(Math, "random").mockReturnValue(FIXED_RANDOM);

    // 默认参数是 randomSource 本身，所以先 stub 再调用照样生效（读取时机在调用那一刻）
    expect(createMeasurementEditorGroupId("n1"))
      .toBe(`measurement-n1-group-${FIXED_EPOCH_BASE36}-${suffixOf(FIXED_RANDOM)}`);
    expect(randomSource()).toBe(FIXED_RANDOM);
    expect(mathRandomStub).toHaveBeenCalled();
  });

  test("每个 id 只消耗一次随机数", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    const mathRandomStub = vi.spyOn(Math, "random").mockReturnValue(FIXED_RANDOM);
    mathRandomStub.mockClear();

    createMeasurementEditorGroupId("n1");

    expect(mathRandomStub).toHaveBeenCalledTimes(1);
  });

  test("默认实现保持非确定性（未被写死），钉住 Math.random 后随机项随之改变", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    vi.spyOn(Math, "random").mockReturnValue(FIXED_RANDOM);
    const withFirstStub = createMeasurementEditorGroupId("n1");
    vi.spyOn(Math, "random").mockReturnValue(OTHER_RANDOM);
    const withSecondStub = createMeasurementEditorGroupId("n1");

    expect(withFirstStub).not.toBe(withSecondStub);
    expect(withSecondStub).toBe(`measurement-n1-group-${FIXED_EPOCH_BASE36}-${suffixOf(OTHER_RANDOM)}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 以下覆盖另两个审计对象：库文件弹窗的 scope 白名单，以及 useRenderBatch 的装配形态。
//
// 两者都不靠「读源码字符串」来钉，理由：
//   · LIBRARY_PACKAGE_DIALOG_SCOPES 是**模块内私有常量**（没有 export）。它在生产代码里
//     唯一的消费点是 `libraryPackageDialogScopeOptions = LIBRARY_PACKAGE_DIALOG_SCOPES.map(...)`，
//     而那行紧跟着 `Object.assign(__appScope, { libraryPackageDialogScopeOptions })` ——
//     所以白名单的键集在**运行期**就能从 __appScope 上读到，不必改生产代码加 export。
//   · useRenderBatch 是纯 void hook（无 return，见下），装配物同样落在 __appScope 上。
// 于是「白名单边界」测的是**真实行为**，不是源码文本匹配。
//
// 环境说明：本仓 vitest 是 environment: "node"，**没有 jsdom**。所以探针用
// react-dom/server 的 renderToStaticMarkup 承载 hook —— 它会执行 hook 体（useMemo/useState
// 会真算），只是不跑 useEffect（服务端渲染本来就不跑 effect，这恰好让这条用例不必构造 DOM）。
// useRenderBatch 顶层那 30 多个 useEffect 因此不会触发副作用，探针是干净的。
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 白名单键集（连顺序）。这是**契约**：下拉框的选项、导出的库文件作用域都按它渲染，
 * 增删一项等于改了产品行为。
 *
 * 注意它与 LibraryPackageScope 联合类型的关系被下面那条用例钉住：EXPECTED_SCOPES 一旦
 * 漏了联合类型里的某个成员，那条用例会红 —— 于是「白名单比类型窄」这个洞是**可执行**的。
 */
const EXPECTED_SCOPES: readonly LibraryPackageScope[] = [
  "all",
  "component-library",
  "measurement",
  "device-library",
  "template-library",
  "icon-library",
];

/**
 * 编译期锚点。写成 `Record<LibraryPackageScope, string>` 后：
 *   · LibraryPackageScope 新增成员时**本文件 tsc 直接报错**（缺成员），不是运行时才发现；
 *   · 写了联合类型里没有的 key 也会报（多余属性检查）。
 * 于是 Object.keys 的结果**在编译期就等于联合类型的成员集**，可以拿它当「类型侧的真值」
 * 去和运行期的白名单比对，而不用手抄第二份名单。
 */
const LABELS_BY_SCOPE: Record<LibraryPackageScope, string> = {
  all: "全部库",
  "component-library": "元件相关库",
  measurement: "量测定义",
  "device-library": "类",
  "template-library": "模板库",
  "icon-library": "图标库",
};

/** 不在白名单内的具体一个 scope —— 集合外那一侧的探针。刻意起个绝不可能被写进白名单的名字。 */
const SCOPE_NOT_IN_WHITELIST = "__not_in_list__";

/**
 * 构造 useRenderBatch 需要的 __appScope。
 *
 * 以 APP_STATIC_SCOPE 打底 —— App.tsx 本身就是 `Object.assign(__appScope, APP_STATIC_SCOPE)`
 * 之后才调 useRenderBatch（App.tsx:649 / 1558），所以这不是为了让探针好过而虚构的输入，
 * 而是复刻真实装配的前半段。剩下的 App.tsx 里来自 useState/useRef 的槽位按「空工程」取值补齐。
 */
const createProbeScope = (overrides: Record<string, unknown> = {}): Record<string, any> => ({
  ...APP_STATIC_SCOPE,
  // React ref 槽位：只需 { current } 形状，统一先置 null。
  ...Object.fromEntries([
    "connectPreviewDomRef", "customDeviceDialogRef", "measurementConfigDialogRef",
    "measurementConfigDraftRef", "measurementEditorDialogRef", "libraryPackageImportInputRef",
    "libraryPackageImportScopeRef", "nodeDragMoveFrameRef", "pendingNodeDragMoveRef",
    "leftPanelRef", "rightPanelRef", "libraryScrollRef", "libraryComponentListRefKey",
    "backendMeasurementConfigLoadedRef", "lastPersistedMeasurementConfigPayloadRef",
    "customMeasurementSelectionAnchorRef", "stateIconDrawingHistoryRef",
    "stateIconDrawingInitialImageRef", "deviceDefinitionDialogRef",
    "backendSchemesLoadedRef",
  ].map((key) => [key, { current: null }])),
  // canvasLOD / 小地图的缓存 ref 需要 current 是对象，且简化模式要关掉才会走清缓存早退。
  lodCanvasRouteChunkCacheRef: { current: { chunks: [] } },
  lodCanvasNodeChunkCacheRef: { current: { chunks: [] } },
  minimapSampleCacheRef: { current: { nodes: [], routes: [] } },
  useSimplifiedCanvasRoutes: false,
  useSimplifiedCanvasNodes: false,
  // 由 App.tsx 其他批次装配、本 hook 内没有定义的几个 helper。
  schemePathForScheme: () => "",
  findSavedSchemeById: () => undefined,
  writeOperationLog: vi.fn(),
  // 弹窗 setter 默认就给桩，免得用例只为断言其中一个 setter 时忘了另外两个 —— 调用它们
  // 的闭包（openLibraryPackageDialog）三个 setter 都会碰。
  setLibraryPackageDialogScope: vi.fn(),
  setLibraryPackageDialogMode: vi.fn(),
  setLibraryPackageDialogOpen: vi.fn(),
  isEditMode: true,
  // 弹窗/草稿态：全部取「未打开」形态。
  customDeviceDraft: {
    terminalTypes: [],
    terminalCount: 0,
    terminalAssociations: [],
    terminalLabels: [],
    terminalRoles: [],
    size: { width: 104, height: 64 },
    componentKind: "generic-device",
    componentLibrary: "generic-device",
    componentName: "探针元件",
    params: [],
  },
  definitionVisualDraft: null,
  definitionStateDraftRows: [],
  nodeDoubleClickDraft: null,
  measurementConfigDraft: null,
  stateIconDrawingDialog: null,
  // 图元状态。
  graphStore: { topologyRevision: 0 },
  topologyStatus: { state: "idle" },
  topologyErrors: [],
  inspectorTopologyErrors: [],
  topology: { nodes: [], edges: [] },
  nodes: [],
  edges: [],
  groups: [],
  layers: [],
  schemes: [],
  projectMeasurements: [],
  activeLayerEdges: [],
  activeLayerNodes: [],
  activeLayerGroups: [],
  activeLayerNodeIdSet: new Set<string>(),
  activeSelectedNodeIds: [],
  activeSelectedEdgeIds: [],
  selectedNodeIdsWithMeasurementGroups: [],
  selectedLayoutUnits: [],
  batchCommonGraphicParamRows: [],
  batchCommonModelParamRows: [],
  batchCommonMeasurementGroupRows: [],
  nodeById: new Map<string, any>(),
  edgeById: new Map<string, any>(),
  projectById: new Map<string, any>(),
  routedEdgeById: new Map<string, any>(),
  visibleNodeById: new Map<string, any>(),
  measurementTypeById: new Map<string, any>(),
  libraryTemplateByKind: new Map<string, any>(),
  // 画布尺寸与视口（viewBoxZoomPercent / canvasPointToSurfaceCss 等按 width/height 计算）。
  viewBox: { x: 0, y: 0, width: 1200, height: 800 },
  canvasVisibleViewBox: { x: 0, y: 0, width: 1200, height: 800 },
  canvasBounds: { x: 0, y: 0, width: 1200, height: 800 },
  canvasRenderBounds: { x: 0, y: 0, width: 1200, height: 800 },
  canvasScrollScale: { x: 1, y: 1 },
  canvasWidth: 1200,
  canvasHeight: 800,
  // 库 / 图标库 / 模板库。
  visibleNodes: [],
  viewportNodes: [],
  routedEdges: [],
  viewportRoutedEdges: [],
  customCategoryLibraries: [],
  customComponentLibraries: [],
  customDeviceTemplates: [],
  customGraphTemplates: [],
  customGraphTemplateTypes: [],
  deviceDefinitionOverrides: {},
  eDeviceDefinitionLabels: {},
  eDeviceDefinitionClassExportEnabled: {},
  eDeviceDefinitionFieldOrder: {},
  eDeviceDefinitionTemplateFields: {},
  eDeviceDefinitionTableIds: {},
  imageFolders: [],
  imageAssets: {},
  imageAssetList: [],
  backgroundLayerIds: [],
  filteredGroupedGraphTemplates: {},
  displayedGraphTemplateTypes: [],
  groupedCategoryLibraryByComponentLibrary: [],
  filteredCategoryLibraryByComponentLibrary: [],
  displayedCategoryLibraries: [],
  iconLibraryPicker: {
    catalog: null,
    selectedLibraryId: "",
    entries: [],
    loadedLibraryIds: [],
    loadingLibraryIds: [],
    status: "idle",
    error: "",
  },
  ...overrides,
});

/** 哨兵：区分「探针根本没跑」与「跑完了并返回 undefined」。这两者断言起来完全不同。 */
const HOOK_NOT_INVOKED = Symbol("hook-not-invoked");

/** 渲染一个只调用 useRenderBatch 的探针组件，回传返回值与装配后的 __appScope。 */
const renderRenderBatchProbe = (overrides: Record<string, unknown> = {}) => {
  const scope = createProbeScope(overrides);
  let returned: unknown = HOOK_NOT_INVOKED;
  const Probe = () => {
    returned = useRenderBatch(scope);
    return createElement("div", null, "probe");
  };
  const markup = renderToStaticMarkup(createElement(Probe));
  return { scope, returned, markup };
};

describe("库文件弹窗的 scope 白名单（LIBRARY_PACKAGE_DIALOG_SCOPES）", () => {
  test("键集与顺序被钉死，且与 LibraryPackageScope 联合类型完全对齐", () => {
    const { scope } = renderRenderBatchProbe();
    const options = scope.libraryPackageDialogScopeOptions as Array<{ scope: string; label: string }>;

    // 白名单 → 弹窗选项是唯一的运行期出口。toEqual 逐项逐序比对，键集变了（增/删/换序）都红。
    expect(options.map((option) => option.scope)).toEqual([...EXPECTED_SCOPES]);

    // 类型侧锚点：LABELS_BY_SCOPE 的键集在编译期就等于联合类型成员集（少一个成员 tsc 就红）。
    // 于是这条断言把「白名单 ⊆ 联合类型」钉成可执行 —— 白名单漏了某个成员就红。
    expect([...options.map((option) => option.scope)].sort())
      .toEqual(Object.keys(LABELS_BY_SCOPE).sort());
    expect(Object.keys(LABELS_BY_SCOPE).length).toBe(EXPECTED_SCOPES.length);
  });

  test("每个 scope 都是非空字符串、互不相同，且都配有非空中文标签", () => {
    const { scope } = renderRenderBatchProbe();
    const options = scope.libraryPackageDialogScopeOptions as Array<
      { scope: LibraryPackageScope; label: string }
    >;

    for (const option of options) {
      expect(typeof option.scope, "scope 必须是字符串").toBe("string");
      expect(option.scope.trim(), "scope 不允许为空或纯空白").not.toBe("");
      expect(option.label.trim(), "scope 必须有非空标签").not.toBe("");
    }
    // 互不相同：重复项会让下拉出现两个同 scope 选项，第二个 export/import 永远选不中。
    expect(new Set(options.map((option) => option.scope)).size).toBe(options.length);

    // 标签表逐项对齐（挂不上标签时代码会回落成 scope 本身，这里逐项钉住映射结果）。
    const labels = scope.libraryPackageScopeLabels as Record<string, string>;
    for (const option of options) {
      expect(labels[option.scope], `scope ${option.scope} 缺标签`).toBe(LABELS_BY_SCOPE[option.scope]);
      expect(option.label).toBe(LABELS_BY_SCOPE[option.scope]);
    }
  });

  test("白名单边界：集合内每个成员都被认可，集合外的那一个不被认可", () => {
    const { scope } = renderRenderBatchProbe();
    const options = scope.libraryPackageDialogScopeOptions as Array<{ scope: string }>;
    const recognized = (candidate: string) => options.some((option) => option.scope === candidate);

    // 集合内 —— 逐个点名，且名单来自**测试侧的常量**而不是被测的白名单本身。
    // 若名单改成从 options 反推，白名单被清空时循环体一次都不跑，这里就变成空断言恒绿。
    expect(EXPECTED_SCOPES.length, "集合内断言不能为空转").toBeGreaterThan(0);
    for (const candidate of EXPECTED_SCOPES) {
      expect(recognized(candidate), `集合内成员 ${candidate} 应被认可`).toBe(true);
    }

    // 集合外 —— 两侧同场：只测集合内的话，把白名单整体删掉也会全绿。
    expect(recognized(SCOPE_NOT_IN_WHITELIST)).toBe(false);
    expect(options.map((option) => option.scope)).not.toContain(SCOPE_NOT_IN_WHITELIST);
  });

  test("scope 匹配规则：all 是通配符且方向不对称（all 包住一切，反之不成立）", () => {
    const { scope } = renderRenderBatchProbe();
    const matches = scope.libraryPackageScopeMatches as (
      packageScope: string,
      targetScope: string
    ) => boolean;

    // 同名恒真。
    expect(matches("measurement", "measurement")).toBe(true);
    // 不同名恒假。
    expect(matches("measurement", "icon-library")).toBe(false);
    // all 作为**包**能匹配任意目标 —— 这一侧若被删，上面两条都还是绿的（默认 false 恰好吻合）。
    expect(matches("all", "measurement")).toBe(true);
    expect(matches("all", "icon-library")).toBe(true);
    // 反方向必须为假：all 是具体库，不能被当作「包」去匹配「全部库」这个目标。
    // 这条是本用例的承重侧 —— 只断言前两条的话，把 || packageScope === "all" 整段删掉照样全绿。
    expect(matches("measurement", "all")).toBe(false);
    expect(matches("icon-library", "all")).toBe(false);
  });
});

describe("useRenderBatch 的装配形态", () => {
  test("它是 void hook：返回 undefined，装配物全部回写进传入的 __appScope", () => {
    const { scope, returned, markup } = renderRenderBatchProbe();

    // 返回值形态：源码里 useRenderBatch **没有任何 return**，纯 Object.assign 副作用。
    // 这条钉的是「调用方不能指望返回值」（App.tsx:1558 也就是 `useRenderBatch(__appScope);` 裸调）。
    // 若哪天有人加了 return，这里立刻红 —— 那属于需要重新评审的契约变更。
    expect(returned, "useRenderBatch 应返回 undefined").not.toBe(HOOK_NOT_INVOKED);
    expect(returned).toBeUndefined();
    expect(markup).toBe("<div>probe</div>");

    // 装配物落在**同一个对象**上，不是副本：App.tsx 每帧重建 __appScope 正是靠这个就地回写。
    expect(typeof scope.libraryPackageDialogScopeOptions).toBe("object");
    for (const key of [
      "openLibraryPackageDialog", "closeLibraryPackageDialog",
      "openLibraryPackageImportFilePicker", "exportLibraryPackage",
      "libraryPackageScopeLabels", "libraryPackageScopeMatches",
      "libraryPackageDialogScopeOptions", "createMeasurementEditorGroupId",
    ]) {
      expect(scope[key], `__appScope 上应装配出 ${key}`).toBeDefined();
    }
    expect(typeof scope.openLibraryPackageDialog).toBe("function");
    expect(typeof scope.exportLibraryPackage).toBe("function");
    expect(typeof scope.closeLibraryPackageDialog).toBe("function");
    expect(typeof scope.openLibraryPackageImportFilePicker).toBe("function");
  });

  test("传入 scope 的 props 被正确透传：弹窗 setter 收到的就是探针给的那几个", () => {
    const setLibraryPackageDialogScope = vi.fn();
    const setLibraryPackageDialogMode = vi.fn();
    const setLibraryPackageDialogOpen = vi.fn();
    const { scope } = renderRenderBatchProbe({
      setLibraryPackageDialogScope,
      setLibraryPackageDialogMode,
      setLibraryPackageDialogOpen,
    });

    scope.openLibraryPackageDialog("icon-library");

    // 断言的是**探针自己传进去的那个函数对象**被调到了 —— 若 hook 内部改从别处取 setter
    // （例如换成 scope 上另一个同名 key），这里收到的是另一个 mock，toHaveBeenCalledWith 就会红。
    expect(setLibraryPackageDialogScope).toHaveBeenCalledTimes(1);
    expect(setLibraryPackageDialogScope).toHaveBeenCalledWith("icon-library");
    expect(setLibraryPackageDialogMode).toHaveBeenCalledWith("export");
    expect(setLibraryPackageDialogOpen).toHaveBeenCalledWith(true);

    // 透传的另一半：ref 也是探针给的那个对象，hook 必须**原地写**它，
    // 而不是换成自己的新 ref（换了的话导入文件 picker 就找不到目标 scope）。
    const { scope: scope2 } = renderRenderBatchProbe();
    const importScopeRef = scope2.libraryPackageImportScopeRef;
    scope2.openLibraryPackageImportFilePicker("template-library");
    expect(importScopeRef.current).toBe("template-library");
  });

  test("openLibraryPackageDialog 未传 scope 时按真实行为回落到 all，显式传入则原样透传", () => {
    const setScope = vi.fn();
    const { scope } = renderRenderBatchProbe({ setLibraryPackageDialogScope: setScope });

    // ① 未传 scope —— 源码签名是 (scope: LibraryPackageScope = "all")，默认参数是全部库。
    scope.openLibraryPackageDialog();
    expect(setScope).toHaveBeenLastCalledWith("all");

    // ② 显式传入 —— 取一个默认参数**不可能**被硬编码猜中的值（默认是 all，不是它）。
    //    只留 ① 的话，把默认值改成 measurement 也可能混过去；两边的值必须不同才有鉴别力。
    scope.openLibraryPackageDialog("device-library");
    expect(setScope).toHaveBeenLastCalledWith("device-library");
    expect(setScope).toHaveBeenCalledTimes(2);
  });

  test("探针未传 scope 时按真实行为抛 TypeError（无默认参数，解构 undefined 即失败）", () => {
    const NoScopeProbe = () => {
      useRenderBatch(undefined as unknown as Record<string, any>);
      return createElement("div", null, "probe");
    };

    // 签名是 `useRenderBatch(__appScope: Record<string, any>)`，**没有** = {} 兜底。
    // 所以漏传是立刻炸，而不是静默拿空对象往下跑 —— 这正是要钉住的行为。
    expect(() => renderToStaticMarkup(createElement(NoScopeProbe))).toThrow(TypeError);
    // 消息里必须点名 __appScope：否则无法区分「漏传 scope」与「scope 内部某个字段缺失」。
    expect(() => renderToStaticMarkup(createElement(NoScopeProbe)))
      .toThrow(/__appScope/);
  });

  test("装配期不弹全局提示（showGlobalMessage / showGlobalConfirm 一次都没被调）", () => {
    const showGlobalMessage = vi.fn();
    const showGlobalConfirm = vi.fn(() => Promise.resolve(true));
    stubGlobal("showGlobalMessage", showGlobalMessage);
    stubGlobal("showGlobalConfirm", showGlobalConfirm);

    renderRenderBatchProbe();

    // 空工程装配一次不该有任何面向用户的弹窗/确认。若哪天有条派生路径在渲染期调了
    // showGlobalMessage（例如读不到后台就报错），这里会红 —— 那类调用必须挪进事件处理器。
    expect(showGlobalMessage).not.toHaveBeenCalled();
    expect(showGlobalConfirm).not.toHaveBeenCalled();
  });
});
