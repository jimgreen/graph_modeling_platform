// appRenderPanels 的面板渲染工厂：disabled 守卫、图元树展开集与虚拟窗口切片。
//
// 手段说明：本仓 vitest 是 `environment: "node"`（**无 jsdom**），所以这里只用
// `renderToStaticMarkup` 取静态标记，不做任何 DOM 查询 / 事件派发。
// 读法：先按容器 class 把标记切成片段，再在片段里定位带 title 的 <button>，
// 这样「每行一个按钮」的多行结构也能逐行断言，而不必依赖整串标记的位置。

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { clampNumber } from "../canvasViewport";
import { BufferedTextInput } from "../components/InputComponents";
import { MODEL_TYPES } from "../model";
import type { ElementTreeDeviceGroup, ElementTreeGroup, ElementTreeItem, ModelLayer } from "../model";
import {
  createRenderElementTreePanel,
  createRenderGraphTemplateButton,
  createRenderGraphTemplateFlyout,
  createRenderLayerManager,
  createRenderLibraryDefinitionActions,
  createRenderProjectPanel
} from "./appRenderPanels";
import type { GraphTemplate } from "./appCoreCanvasUtilities";

/* ---------- 通用标记工具 ---------- */

/** 取出标记里第一个带该 title 的 <button> 开标签（找不到返回空串）。 */
const buttonTagByTitle = (html: string, title: string): string => {
  const matched = html.match(new RegExp(`<button[^>]*title="${title}"[^>]*>`));
  return matched ? matched[0] : "";
};

/** 该 <button> 是否带 disabled 属性（React 对布尔属性渲染成 `disabled=""`）。 */
const isDisabled = (buttonTag: string): boolean => /\sdisabled(=|\s|>|$)/.test(buttonTag);

/** 图层管理器：按 class="layer-row..." 切成一行一段。 */
const layerRows = (html: string): string[] => html.split('<div class="layer-row').slice(1);

/** 图元树：所有带 aria-expanded 的 <button> 开标签，按出现顺序。 */
const treeitemTags = (html: string): string[] =>
  Array.from(html.matchAll(/<button[^>]*aria-expanded="(?:true|false)"[^>]*>/g)).map((m) => m[0]);

/** 图元树：虚拟占位块的高度（px），按出现顺序。 */
const spacerHeights = (html: string): number[] =>
  Array.from(html.matchAll(/class="element-tree-virtual-spacer"[^>]*style="height:(\d+)px"/g)).map((m) => Number(m[1]));

/* ---------- 图层管理器 ---------- */

const layer = (id: string, name: string): ModelLayer => ({ id, name, visible: true });

const renderLayerManager = (layers: ModelLayer[], overrides: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(
      createRenderLayerManager({
        layers,
        activeLayerId: layers[0]?.id ?? "",
        setActiveLayer: () => undefined,
        isBrowseMode: false,
        addModelLayer: () => undefined,
        setAllModelLayersVisibility: () => undefined,
        toggleModelLayerVisibility: () => undefined,
        commitModelLayerName: () => undefined,
        moveModelLayer: () => undefined,
        deleteModelLayer: () => undefined,
        BufferedTextInput,
        ...overrides
      })
    )
  );

const UP = "图层上移";
const DOWN = "图层下移";
const DEL = "删除图层";

/** 取出第 index 行的上移 / 下移 / 删除按钮是否 disabled。 */
const rowDisabled = (html: string, index: number) => {
  const row = layerRows(html)[index] ?? "";
  return {
    up: isDisabled(buttonTagByTitle(row, UP)),
    down: isDisabled(buttonTagByTitle(row, DOWN)),
    del: isDisabled(buttonTagByTitle(row, DEL))
  };
};

describe("图层管理器三档 disabled 守卫", () => {
  // 单层：上移、下移、删除三个按钮同时 disabled。三档必须同时在场——
  // 只测一档的话，把 `index === 0` 写成 `index < 1`、或把 `layers.length <= 1`
  // 写成 `layers.length < 1`，都会从别的断言缝隙里滑过去。
  test("只有一层时上移、下移、删除三个按钮同时为 disabled", () => {
    const html = renderLayerManager([layer("L1", "底层")]);
    expect(layerRows(html)).toHaveLength(1);
    expect(rowDisabled(html, 0)).toEqual({ up: true, down: true, del: true });
  });

  // 三层：逐行断言三档，覆盖首 / 中 / 尾三种位置。
  // 这一条是 `index === 0` 与 `index === layers.length - 1` 的双向断言：
  // 首行必须只有上移 disabled（若写成 `index < 1` 仍会绿，故这里靠首/中/尾三行互相卡住），
  // 尾行必须只有下移 disabled，末行的 `length - 1` 若被误写成 `length` 也会被首行之外的位置卡出。
  test("三层时首行只禁上移、中间行三档全开、末行只禁下移", () => {
    const html = renderLayerManager([layer("L1", "底层"), layer("L2", "中层"), layer("L3", "顶层")]);
    expect(layerRows(html)).toHaveLength(3);
    expect(rowDisabled(html, 0)).toEqual({ up: true, down: false, del: false });
    expect(rowDisabled(html, 1)).toEqual({ up: false, down: false, del: false });
    expect(rowDisabled(html, 2)).toEqual({ up: false, down: true, del: false });
  });

  // 删除档与位置无关：多层时每一行的删除都必须可用。
  // 上面那条里 del 全为 false，但只有当 layers.length > 1 时才是对的；
  // 若把 `layers.length <= 1` 误改成 `layers.length <= 3`，三层场景就会误禁删除 ——
  // 故这里显式复核「多层 → 删除不因位置而禁」。
  test("多层时每一行的删除按钮都可用，与该行是否为首层无关", () => {
    const html = renderLayerManager([layer("L1", "底层"), layer("L2", "中层")]);
    expect(isDisabled(buttonTagByTitle(layerRows(html)[0], DEL))).toBe(false);
    expect(isDisabled(buttonTagByTitle(layerRows(html)[1], DEL))).toBe(false);
  });

  // 拖拽排序守卫（上移方向）：首层不可再上移，非首层可上移。
  // 与上一条互补：若把 `index === 0` 写成恒 false，首行会从 disabled 变可用而红；
  // 若写成恒 true，中间行会红。
  test("上移按钮在首层为 disabled、在非首层可用", () => {
    const html = renderLayerManager([layer("L1", "底层"), layer("L2", "中层")]);
    const [first, second] = layerRows(html);
    expect(isDisabled(buttonTagByTitle(first, UP))).toBe(true);
    expect(isDisabled(buttonTagByTitle(second, UP))).toBe(false);
  });

  // 浏览态：图层名输入框随 isBrowseMode 变 disabled（BufferedTextInput 的 disabled 透传）。
  test("浏览态下图层名称输入框为 disabled、编辑态下可用", () => {
    const browse = renderLayerManager([layer("L1", "底层")], { isBrowseMode: true });
    const edit = renderLayerManager([layer("L1", "底层")], { isBrowseMode: false });
    const inputTag = (html: string) => html.match(/<input[^>]*aria-label="图层名称：底层"[^>]*>/)?.[0] ?? "";
    expect(isDisabled(inputTag(browse))).toBe(true);
    expect(isDisabled(inputTag(edit))).toBe(false);
  });
});

/* ---------- 图元树 ---------- */

const treeItem = (id: string, name: string): ElementTreeItem => ({ kind: "node", id, name });

const buildItems = (count: number, prefix = "图元"): ElementTreeItem[] =>
  Array.from({ length: count }, (_, i) => treeItem(`${prefix}-${i}`, `${prefix}-${i}`));

/** 类型分组，内含一个设备分组（设备分组里才是真正渲染 item 的层级）。 */
const buildGroup = (
  typeKey: string,
  deviceKey: string,
  itemCount: number,
  deepItems: ElementTreeItem[] = []
): ElementTreeGroup => ({
  typeKey,
  typeLabel: `${typeKey} 类型`,
  items: buildItems(1, `${typeKey}-组内`),
  deviceGroups: [
    {
      deviceKey,
      deviceLabel: `${deviceKey} 设备`,
      items: deepItems.length ? deepItems : buildItems(itemCount, deviceKey)
    } as ElementTreeDeviceGroup
  ]
});

const treeScope = (overrides: Record<string, unknown> = {}) => ({
  Search: () => createElement("span", { "data-icon": "search" }),
  X: () => createElement("span", { "data-icon": "x" }),
  Grid2X2: () => createElement("span", { "data-icon": "grid" }),
  ChevronDown: () => createElement("span", { "data-icon": "chevron-down" }),
  ChevronRight: () => createElement("span", { "data-icon": "chevron-right" }),
  LocateFixed: () => createElement("span", { "data-icon": "locate" }),
  BufferedTextInput,
  clampNumber,
  ELEMENT_TREE_INITIAL_ITEM_LIMIT: 2,
  ELEMENT_TREE_ITEM_LIMIT_STEP: 2,
  elementTreeSearchQuery: "",
  setElementTreeSearchQuery: () => undefined,
  elementTree: [],
  filteredElementTree: [],
  elementTreeSearchNeedle: "",
  collapsedElementTreeGroups: [],
  collapsedElementTreeDeviceGroups: [],
  toggleElementTreeGroup: () => undefined,
  toggleElementTreeDeviceGroup: () => undefined,
  elementTreeItemLimits: {},
  setElementTreeItemLimits: () => undefined,
  elementTreeItemWindows: {},
  elementTreeItemHeights: {},
  activeLayerNodeIdSet: new Set<string>(),
  activeLayerEdgeIdSet: new Set<string>(),
  selectedNodeIdSet: new Set<string>(),
  activeSelectedEdgeSet: new Set<string>(),
  elementTreeItemChildren: () => [],
  selectCanvasGraphics: () => undefined,
  clearRecordSelection: () => undefined,
  focusElementTreeItem: () => undefined,
  jumpToElementTreeItem: () => undefined,
  openElementTreeItemContextMenu: () => undefined,
  elementTreeItemRefs: { current: {} as Record<string, unknown> },
  isBrowseMode: false,
  commitElementTreeNodeIdentity: () => undefined,
  commitElementTreeContainerChildParam: () => undefined,
  ...overrides
});

const renderElementTree = (overrides: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(createRenderElementTreePanel(treeScope(overrides))));

describe("图元树展开集", () => {
  // 空搜索：展开与否完全由折叠集合决定（expanded = !collapsed.includes(typeKey)）。
  // 折叠命中 → aria-expanded="false" 且不渲染 item 列表。
  const group = buildGroup("T1", "D1", 3);
  const emptyNeedleScope = {
    elementTree: [group],
    filteredElementTree: [group],
    elementTreeSearchNeedle: "",
    collapsedElementTreeGroups: ["T1"]
  };

  test("空搜索时，命中折叠集合的类型分组渲染为 aria-expanded false 且不列出图元", () => {
    const html = renderElementTree(emptyNeedleScope);
    const [typeTag] = treeitemTags(html);
    expect(typeTag).toContain('aria-expanded="false"');
    expect(html).not.toContain("D1-0");
    expect(html).not.toContain("element-tree-items");
  });

  test("空搜索时，未命中折叠集合的类型分组渲染为 aria-expanded true 并列出设备分组", () => {
    const html = renderElementTree({ ...emptyNeedleScope, collapsedElementTreeGroups: [] });
    const [typeTag] = treeitemTags(html);
    expect(typeTag).toContain('aria-expanded="true"');
    expect(html).toContain("D1 设备");
    expect(html).toContain("D1-0");
  });

  // 有搜索命中：needle 非空时展开与折叠集合无关（Boolean(needle) || ...），
  // 即命中链上的类型层与设备层祖先被强制展开。
  // 判别输入 = 折叠集合里同时含 typeKey 与 deviceKey：若实现退化成「全展开」以外的
  // 「不看折叠集合」以外的路径，或 needle 分支被删，这两条断言（needle 非空 → true、
  // needle 为空 → false）会同时变红。
  test("needle 命中深层图元时，折叠集合内的类型层与设备层祖先被强制展开", () => {
    const deep = treeItem("deep-1", "深层命中图元");
    const deepGroup = buildGroup("T2", "D2", 0, [deep]);
    const html = renderElementTree({
      elementTree: [deepGroup],
      filteredElementTree: [deepGroup],
      elementTreeSearchNeedle: "深层命中图元",
      collapsedElementTreeGroups: ["T2"],
      collapsedElementTreeDeviceGroups: ["D2"]
    });
    const tags = treeitemTags(html);
    // 第 1 个是类型层（无 aria-level），第 2 个是设备层（aria-level="2"）。
    expect(tags).toHaveLength(2);
    expect(tags[0]).toContain('aria-expanded="true"');
    expect(tags[0]).not.toContain('aria-level="2"');
    expect(tags[1]).toContain('aria-level="2"');
    expect(tags[1]).toContain('aria-expanded="true"');
    expect(html).toContain("深层命中图元");
  });

  test("同一棵树在 needle 为空时祖先保持折叠，证明上条确实是 needle 强制展开而非恒展开", () => {
    const deep = treeItem("deep-1", "深层命中图元");
    const deepGroup = buildGroup("T2", "D2", 0, [deep]);
    const html = renderElementTree({
      elementTree: [deepGroup],
      filteredElementTree: [deepGroup],
      elementTreeSearchNeedle: "",
      collapsedElementTreeGroups: ["T2"],
      collapsedElementTreeDeviceGroups: ["D2"]
    });
    const tags = treeitemTags(html);
    // 类型层折叠 → 设备层按钮整段不渲染，故只剩 1 个 treeitem。
    expect(tags).toHaveLength(1);
    expect(tags[0]).toContain('aria-expanded="false"');
    expect(html).not.toContain("element-tree-device-group");
    expect(html).not.toContain("深层命中图元");
  });
});

describe("图元树虚拟窗口切片", () => {
  const DEV = "D3";
  const HEIGHT = 40;
  const TOTAL = 6;
  const group = buildGroup("T3", DEV, TOTAL);
  const windowScope = (windowState: { start: number; end: number } | null, needle = "") => ({
    elementTree: [group],
    filteredElementTree: [group],
    elementTreeSearchNeedle: needle,
    elementTreeItemWindows: windowState ? { [DEV]: windowState } : {},
    elementTreeItemHeights: { [DEV]: HEIGHT }
  });

  // 有窗口态：渲染受 windowStart / windowEnd 影响 ——
  // 前占位高度 = windowStart * 行高，后占位高度 = (total - windowEnd) * 行高。
  test("窗口态生效时按 windowStart 与 windowEnd 切出前后占位块并只渲染窗口内图元", () => {
    const html = renderElementTree(windowScope({ start: 2, end: 5 }));
    expect(spacerHeights(html)).toEqual([2 * HEIGHT, (TOTAL - 5) * HEIGHT]);
    expect(html).not.toContain(`${DEV}-0`);
    expect(html).not.toContain(`${DEV}-1`);
    expect(html).toContain(`${DEV}-2`);
    expect(html).toContain(`${DEV}-4`);
    expect(html).not.toContain(`${DEV}-5`);
    // windowActive 时隐藏数按 0 计，不再出现「显示更多」。
    expect(html).not.toContain("显示更多");
  });

  // 无窗口态：退回 visibleLimit 前缀切片（默认 ELEMENT_TREE_INITIAL_ITEM_LIMIT = 2）。
  test("无窗口态时退回按 visibleLimit 取前缀，并给出剩余数量的显示更多按钮", () => {
    const html = renderElementTree(windowScope(null));
    expect(spacerHeights(html)).toEqual([]);
    expect(html).toContain(`${DEV}-0`);
    expect(html).toContain(`${DEV}-1`);
    expect(html).not.toContain(`${DEV}-2`);
    expect(html).toContain("显示更多（还有 4 个）");
  });

  // 行高兜底：deviceKey 没有测得高度时用默认行高（32）。
  // 这一条**必须不传 elementTreeItemHeights** —— 上面几条都显式给了高度，
  // `?? 32` 的兜底分支从未被执行过，注入「?? 0」会全绿。
  test("未提供该设备组的行高时占位块按默认行高 32 计算", () => {
    const html = renderElementTree({
      elementTree: [group],
      filteredElementTree: [group],
      elementTreeSearchNeedle: "",
      elementTreeItemWindows: { [DEV]: { start: 2, end: 5 } },
      elementTreeItemHeights: {}
    });
    expect(spacerHeights(html)).toEqual([2 * 32, (TOTAL - 5) * 32]);
  });

  // needle 非空时 windowEffective 恒 false（`!needle && Boolean(windowState)`）：
  // 即使窗口态存在，也不再有占位块，且列出全部图元。
  test("needle 非空时窗口态被忽略，不产生占位块且列出全部图元", () => {
    const html = renderElementTree(windowScope({ start: 2, end: 5 }, "图元"));
    expect(spacerHeights(html)).toEqual([]);
    expect(html).toContain(`${DEV}-0`);
    expect(html).toContain(`${DEV}-5`);
  });

  // 下界钳制：start 与 end 同为 0 时窗口仍保底 1 项（Math.max(windowStart + 1, end)）。
  // 若该 max 被删，slice(0, 0) 会渲染 0 项而红。
  // 占位块只在高度 > 0 时渲染：windowStart = 0 → 无前占位块，只剩 (6 - 1) * 40 = 200px 后占位块。
  test("窗口 start 与 end 同为 0 时仍保底渲染 1 项", () => {
    const html = renderElementTree(windowScope({ start: 0, end: 0 }));
    expect(html).toContain(`${DEV}-0`);
    expect(html).not.toContain(`${DEV}-1`);
    expect(spacerHeights(html)).toEqual([(TOTAL - 1) * HEIGHT]);
  });

  // 上界钳制：windowStart 经 clampNumber(totalItems, 0, start) 收敛到 [0, total]。
  // 传 start = -5 若未经钳制，slice(-5, 2) 会退化成「从倒数第 5 项起」的错误切片。
  test("窗口 start 为负时先被钳到 0 再切片", () => {
    const html = renderElementTree(windowScope({ start: -5, end: 2 }));
    // windowStart 被钳到 0 → 无前占位块；windowEnd = 2 → 后占位块 (6 - 2) * 40 = 160px。
    expect(spacerHeights(html)).toEqual([(TOTAL - 2) * HEIGHT]);
    expect(html).toContain(`${DEV}-0`);
    expect(html).toContain(`${DEV}-1`);
    expect(html).not.toContain(`${DEV}-2`);
  });
});

/* ---------- 六个面板工厂冒烟 ---------- */

const stubTemplate: GraphTemplate = {
  id: "TPL1",
  typeName: "两室三回路",
  name: "标准主变模板",
  sourceSize: { width: 320, height: 240 },
  clipboard: { nodes: [], edges: [], groups: [] },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const noop = () => undefined;

describe("面板工厂冒烟", () => {
  test("createRenderLayerManager 可渲染且带图层管理容器", () => {
    const html = renderLayerManager([layer("L1", "底层")]);
    expect(html).toContain('class="layer-manager"');
    expect(html).toContain("新增图层");
  });

  test("createRenderLibraryDefinitionActions 可渲染且带两个定义入口", () => {
    const html = renderToStaticMarkup(
      createElement(
        createRenderLibraryDefinitionActions({
          isBrowseMode: false,
          openMeasurementConfigDialog: noop,
          openDeviceDefinitionDialog: noop
        })
      )
    );
    expect(html).toContain("量测定义");
    expect(html).toContain("元件定义");
    expect(html).not.toContain("disabled");
  });

  test("createRenderGraphTemplateButton 可渲染单个模板按钮并带预览插槽", () => {
    const renderTemplateButton = createRenderGraphTemplateButton({
      isEditMode: true,
      isBrowseMode: false,
      templateLibraryDisplayMode: "left",
      startLibraryGraphTemplatePlacement: noop,
      cancelLibraryPlacement: noop,
      setContextMenu: noop,
      setProjectMenu: noop,
      setTemplateMenu: noop,
      clearLibraryFlyoutCloseTimer: noop,
      setHoveredGraphTemplateType: noop,
      hideLibraryFlyout: noop,
      renderGraphTemplatePreview: () => createElement("span", { "data-preview": "TPL1" })
    });
    const html = renderToStaticMarkup(createElement("div", null, renderTemplateButton(stubTemplate)));
    expect(html).toContain('class="template-library-item"');
    expect(html).toContain('data-preview="TPL1"');
    expect(html).toContain("标准主变模板");
    expect(html).toContain("320×240");
  });

  test("createRenderGraphTemplateFlyout 在无 document 环境直接返回飞行面板而非 portal", () => {
    const renderFlyout = createRenderGraphTemplateFlyout({
      setLibraryComponentListRef: () => ({ current: null }),
      libraryFlyoutStyle: () => ({ width: 240 }),
      clearLibraryFlyoutCloseTimer: noop,
      setHoveredGraphTemplateType: noop,
      scheduleGraphTemplateFlyoutClose: noop,
      renderGraphTemplateButton: (template: GraphTemplate) =>
        createElement("button", { key: template.id, title: "模板项" }, template.name)
    });
    const flyout = renderFlyout("FLY1", "两室三回路", [stubTemplate]);
    // typeof document === "undefined" 时源码返回元素本身（SSR 分支）。
    expect(typeof flyout).toBe("object");
    const html = renderToStaticMarkup(flyout as never);
    expect(html).toContain("flyout-library-group");
    expect(html).toContain("模板项");
  });

  test("createRenderProjectPanel 可渲染且带模型库搜索框", () => {
    const html = renderToStaticMarkup(
      createElement(
        createRenderProjectPanel({
          Search: () => createElement("span", { "data-icon": "search" }),
          X: () => createElement("span", { "data-icon": "x" }),
          MODEL_TYPES,
          openBlankProjectLibraryContextMenu: noop,
          projectSearchQuery: "",
          setProjectSearchQuery: noop,
          projectModelTypeFilter: [],
          setProjectModelTypeFilter: noop,
          projectListPointerInsideRef: { current: false },
          backendSchemesLoadedRef: { current: true },
          schemes: [],
          filteredProjectSchemes: [],
          renderProjectSchemeNode: () => null
        })
      )
    );
    expect(html).toContain('class="project-panel"');
    expect(html).toContain('aria-label="搜索模型库"');
  });

  test("createRenderElementTreePanel 在空树时给出空状态，且搜索无命中时给出搜索空状态", () => {
    const empty = renderElementTree({ elementTree: [], filteredElementTree: [] });
    expect(empty).toContain("当前画布暂无图元。");
    const noHit = renderElementTree({ elementTree: [buildGroup("T9", "D9", 1)], filteredElementTree: [] });
    expect(noHit).toContain("未找到匹配图元。");
  });
});

/* ---------- 项目面板：搜索清空按钮 / 类型筛选高亮 / 两种空态文案 ---------- */

const CLEAR_PROJECT_SEARCH = 'aria-label="清空模型库搜索"';

const renderProjectPanel = (overrides: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(
      createRenderProjectPanel({
        Search: () => createElement("span", { "data-icon": "search" }),
        X: () => createElement("span", { "data-icon": "x" }),
        MODEL_TYPES,
        openBlankProjectLibraryContextMenu: noop,
        projectSearchQuery: "",
        setProjectSearchQuery: noop,
        projectModelTypeFilter: [],
        setProjectModelTypeFilter: noop,
        projectListPointerInsideRef: { current: false },
        backendSchemesLoadedRef: { current: true },
        schemes: [],
        filteredProjectSchemes: [],
        renderProjectSchemeNode: () => null,
        ...overrides
      })
    )
  );

/** 取模型类型筛选按钮的开标签（按 title 定位）。 */
const modelTypeButtonTag = (html: string, type: string): string =>
  html.match(new RegExp(`<button[^>]*title="${type}"[^>]*>`))?.[0] ?? "";

describe("项目面板搜索清空按钮只在有搜索词时出现", () => {
  // L203：`projectSearchQuery &&` 两侧都要断。
  // 只断「非空 → 有」的话，把条件换成恒真表达式（如 `projectSearchQuery !== undefined`）
  // 一样是绿的 —— 所以「空串不渲染」与「undefined 不渲染」两条负向断言是承重的。
  test("搜索词非空时渲染清空按钮，空串与 undefined 时都不渲染", () => {
    expect(renderProjectPanel({ projectSearchQuery: "主变" })).toContain(CLEAR_PROJECT_SEARCH);
    expect(renderProjectPanel({ projectSearchQuery: "" })).not.toContain(CLEAR_PROJECT_SEARCH);
    expect(renderProjectPanel({ projectSearchQuery: undefined })).not.toContain(CLEAR_PROJECT_SEARCH);
  });
});

describe("项目面板模型类型筛选高亮", () => {
  // L214：`projectModelTypeFilter?.includes(type) ? " active" : ""`。
  // 命中侧断「馈线带 active」，未命中侧断「厂站不带 active」，两侧互证；
  // 再断筛选集合为 undefined（可选链左操作数为 nullish）时全都不带 active。
  test("命中筛选集合的类型按钮带 active，未命中与筛选集合缺失时都不带", () => {
    const html = renderProjectPanel({ projectModelTypeFilter: ["馈线"] });
    expect(modelTypeButtonTag(html, "馈线")).toContain('class="project-model-type-btn active"');
    expect(modelTypeButtonTag(html, "厂站")).toContain('class="project-model-type-btn"');
    expect(modelTypeButtonTag(html, "厂站")).not.toContain("active");

    const noFilter = renderProjectPanel({ projectModelTypeFilter: undefined });
    expect(noFilter).not.toContain("project-model-type-btn active");
  });
});

describe("项目面板方案空态文案按后端加载态二分", () => {
  // L237：ternary 两侧互斥 —— 两侧文案互为负向判据，
  // 交换两个分支（把「已加载」写成「正在连接」）会立刻红。
  test("方案列表为空时，后端已加载与仍在加载给出两种互斥文案", () => {
    const loaded = renderProjectPanel({ schemes: [], backendSchemesLoadedRef: { current: true } });
    const loading = renderProjectPanel({ schemes: [], backendSchemesLoadedRef: { current: false } });
    expect(loaded).toContain("暂无方案，右键此处创建方案");
    expect(loaded).not.toContain("正在连接模型库");
    expect(loading).toContain("正在连接模型库，恢复后将自动加载...");
    expect(loading).not.toContain("暂无方案");
  });

  // 顺带把「有方案但筛选后为空」那条空态也钉住（与上面两条文案互斥）。
  test("有方案但筛选后为空时给出未找到匹配文案", () => {
    const html = renderProjectPanel({
      schemes: [{ id: "S1" }],
      filteredProjectSchemes: []
    });
    expect(html).toContain("未找到匹配方案或模型");
    expect(html).not.toContain("正在连接模型库");
  });
});

/* ---------- 图元树：搜索清空 / 英文标签 / 缺 deviceGroups 兜底 / 设备折叠 ---------- */

const CLEAR_TREE_SEARCH = 'aria-label="清空图元树搜索"';

describe("图元树搜索清空按钮只在有搜索词时出现", () => {
  // L280：与项目面板那条同构 —— 负向断言（空串不渲染）是承重的一侧。
  test("搜索词非空时渲染清空图元树按钮，空串与 undefined 时都不渲染", () => {
    expect(renderElementTree({ elementTreeSearchQuery: "断路器" })).toContain(CLEAR_TREE_SEARCH);
    expect(renderElementTree({ elementTreeSearchQuery: "" })).not.toContain(CLEAR_TREE_SEARCH);
    expect(renderElementTree({ elementTreeSearchQuery: undefined })).not.toContain(CLEAR_TREE_SEARCH);
  });
});

/** 带英文标签的类型分组 + 一个设备分组（英文标签齐全 / 全缺两态由入参决定）。 */
const labeledGroup = (withEnglish: boolean): ElementTreeGroup => ({
  typeKey: "TX",
  typeLabel: "变压器 类型",
  ...(withEnglish ? { typeEnglishLabel: "Transformer" } : {}),
  items: buildItems(1, "TX-组内"),
  deviceGroups: [
    {
      deviceKey: "DX",
      deviceLabel: "DX 设备",
      ...(withEnglish ? { deviceEnglishLabel: "Device X" } : {}),
      items: buildItems(2, "DX")
    } as ElementTreeDeviceGroup
  ]
});

describe("图元树类型层与设备层的英文小标签", () => {
  // L313 / L358：两个可选字段各自独立控制一处 `<small>`。
  // 英文标签齐全时两处都在；两处都缺时整串标记里不应出现任何 `<small>` ——
  // 设备分组里的图元走 `<span>{item.name}</span>` 而非 `<small>`，故这个负向断言无歧义。
  test("英文标签存在时类型层与设备层各渲染一处 small，两个标签都缺失时整串无 small", () => {
    const labeled = renderElementTree({
      elementTree: [labeledGroup(true)],
      filteredElementTree: [labeledGroup(true)]
    });
    expect(labeled).toContain("<small>Transformer</small>");
    expect(labeled).toContain("<small>Device X</small>");

    const plain = renderElementTree({
      elementTree: [labeledGroup(false)],
      filteredElementTree: [labeledGroup(false)]
    });
    expect(plain).not.toContain("<small>");
    expect(plain).toContain("变压器 类型");
    expect(plain).toContain("DX 设备");
  });
});

describe("图元树类型分组缺少 deviceGroups 时按空列表兜底", () => {
  // L299：`group.deviceGroups ?? []`。
  // 兜底产物是空数组 → 类型行照常渲染（class/标题/条目数都在），但没有设备分组区块。
  // 变异方向：把 `?? []` 换成一个「凭空造一个设备分组」的兜底，
  // 就会出现 element-tree-device-group / element-tree-items，于是本条转红。
  test("缺 deviceGroups 的类型分组仍渲染类型行，但不带任何设备分组区块", () => {
    const bare = {
      typeKey: "T0",
      typeLabel: "空设备组 类型",
      items: buildItems(2, "T0-组内")
    } as ElementTreeGroup;
    const html = renderElementTree({ elementTree: [bare], filteredElementTree: [bare] });
    expect(html).toContain('class="element-tree-type"');
    expect(html).toContain("空设备组 类型");
    expect(html).toContain("<strong>2</strong>");
    // 兜底是空数组 → 设备分组区块整段不存在；类型层的容器 div 仍在，但里面没有任何设备分组。
    expect(html).not.toContain("element-tree-device-group");
    expect(html).not.toContain("element-tree-device-type");
    // 组内那 2 个图元只在设备分组层级渲染，故兜底下不出现在标记里。
    expect(html).not.toContain("T0-组内-0");
  });
});

describe("图元树设备分组折叠时用 chevron-right 且不展开图元列表", () => {
  // L355：设备层 chevron 的 false 侧。
  // 既有的「命中折叠集合」那条把类型层也折叠了，设备按钮压根不渲染，
  // 所以这里的判别输入是「类型层展开 + 设备层折叠」这一组合。
  test("设备分组折叠时渲染 chevron-right、aria-expanded false 且不列出图元", () => {
    const group = buildGroup("T1", "D1", 3);
    const html = renderElementTree({
      elementTree: [group],
      filteredElementTree: [group],
      elementTreeSearchNeedle: "",
      collapsedElementTreeGroups: [],
      collapsedElementTreeDeviceGroups: ["D1"]
    });
    const tags = treeitemTags(html);
    expect(tags).toHaveLength(2);
    expect(tags[0]).toContain('aria-expanded="true"');
    expect(tags[1]).toContain('aria-level="2"');
    expect(tags[1]).toContain('aria-expanded="false"');
    // 两层 chevron 图标按「类型层 → 设备层」顺序各一枚：类型层展开是 down，
    // 设备层折叠是 right。若 355 行的两臂对调，这里会变成 down,down。
    expect(html.match(/data-icon="chevron-(?:down|right)"/g)).toEqual([
      'data-icon="chevron-down"',
      'data-icon="chevron-right"'
    ]);
    // 设备层的图元容器整段不渲染（类型层的容器仍在，所以不能只断言 element-tree-items）。
    expect(html).not.toContain("element-tree-device-items");
    expect(html).not.toContain("D1-0");
  });
});

describe("图元树窗口态恰好覆盖全部图元", () => {
  // L336 真臂 `deviceGroup.items`：只有「窗口态恰好覆盖全部图元」这一种输入会走它 ——
  // 其余用例要么走 `slice(windowStart, windowEnd)`，要么没有窗口态退回 `slice(0, visibleLimit)`。
  //
  // ⚠️ 注意这个 ternary 的两臂在**真臂触发时输出恒等**（windowEnd 已经过
  // `Math.min(totalItems, ...)`，故 windowStart===0 && windowEnd===totalItems 时
  // `items.slice(0, totalItems)` 与 `items` 逐元素相同）。所以「直接对调两臂」这类变异
  // 单靠本条抓不到 —— 实测把条件取反（等价于让部分窗口场景改走真臂）会红 3 条，
  // 说明**条件本身**被既有窗口用例钉住，而**真臂与 slice 的区别**由下面这条钉住：
  // 注入「真臂改为 items.slice(0, visibleLimit)」后 D3-3..D3-5 消失，本条转红。
  // 记录在案是为了下一个改这里的人不必重新调查这两个变异方向的不同结论。
  test("窗口 start=0 且 end=total 时列出全部图元、无占位块且不出现显示更多按钮", () => {
    const DEV = "D3";
    const TOTAL = 6;
    const group = buildGroup("T3", DEV, TOTAL);
    const html = renderElementTree({
      elementTree: [group],
      filteredElementTree: [group],
      elementTreeSearchNeedle: "",
      elementTreeItemWindows: { [DEV]: { start: 0, end: TOTAL } }
    });
    expect(spacerHeights(html)).toEqual([]);
    expect(html).toContain(`${DEV}-0`);
    expect(html).toContain(`${DEV}-5`);
    expect(html).not.toContain("显示更多");
  });
});