// 左侧资源库面板的外壳渲染。此前零直接测试。
//
// 它本身很薄，但有两处口径容易写错且写错不报错：
//   · 「模型库」tab 的高亮与 aria-selected 取 `effectiveLeftPanelTab`，
//     而「图元库」「模板库」取 `leftPanelTab` —— 不是笔误：前者在非编辑模式下
//     会被强制回落成 projects，用 effective 才能让高亮跟着回落走。
//   · 底部「模型ID」按 `projectIdx > 0` 显示，新建模型 idx 还是 0 时显示破折号
//     而不是 0（0 是「后端还没分配编号」，不是「模型 0」）。
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLeftPanel } from "./appLeftPanel";

const makeScope = (over: Record<string, unknown> = {}) => ({
  effectiveLeftPanelTab: "projects",
  handleSidePanelPointerLeave: () => {},
  isEditMode: false,
  leftPanelContent: null,
  leftPanelRef: null,
  leftPanelTab: "library",
  leftPanelVisible: true,
  projectIdx: 3,
  renderSidePanelModeControls: () => null,
  setLeftPanelTab: () => {},
  startSidePanelResize: () => {},
  stopSidePanelEventPropagation: () => {},
  updateAutoPanelVisibility: () => {},
  ...over
});

const render = (over: Record<string, unknown> = {}) =>
  renderToStaticMarkup(<AppLeftPanel scope={makeScope(over)} inputs={[]}/>);

describe("显隐", () => {
  test("leftPanelVisible 决定 visible / hidden 类", () => {
    expect(render()).toContain("library-panel floating-side-panel visible");
    expect(render({ leftPanelVisible: false })).toContain("library-panel floating-side-panel hidden");
  });

  test("面板是 aside 且带左栏语义标签", () => {
    const html = render();
    expect(html).toContain("<aside");
    expect(html).toContain('aria-label="调整左侧栏宽度"');
    expect(html).toContain('role="tablist"');
  });
});

describe("tab 高亮口径", () => {
  test("模型库取 effectiveLeftPanelTab：它回落到 projects 时高亮也跟着回落", () => {
    // 非编辑模式下 leftPanelTab 停在 library，但实际展示的是 projects，
    // 高亮必须跟着 effective 走，否则用户看到「图元库」被高亮而内容是模型库。
    const html = render({ leftPanelTab: "library", effectiveLeftPanelTab: "projects" });
    expect(html).toContain('aria-selected="true"');
    expect(html).toMatch(/class="active"[^>]*aria-selected="true"[^>]*>模型库/u);
  });

  test("模型库未激活时 active 类不落在它身上", () => {
    const html = render({ effectiveLeftPanelTab: "library" });
    expect(html).toMatch(/class=""[^>]*aria-selected="false"[^>]*>模型库/u);
  });

  test("图元库 / 模板库取 leftPanelTab（不是 effective）", () => {
    const html = render({
      isEditMode: true,
      leftPanelTab: "templates",
      effectiveLeftPanelTab: "projects"
    });
    expect(html).toMatch(/class="active"[^>]*aria-selected="true"[^>]*>模板库/u);
    expect(html).toMatch(/aria-selected="false"[^>]*>图元库/u);
  });
});

describe("编辑模式专属 tab", () => {
  test("非编辑模式只渲染模型库", () => {
    const html = render({ isEditMode: false });
    expect(html).toContain("模型库");
    expect(html).not.toContain("图元库");
    expect(html).not.toContain("模板库");
  });

  test("编辑模式补上图元库与模板库", () => {
    const html = render({ isEditMode: true });
    expect(html).toContain("图元库");
    expect(html).toContain("模板库");
  });
});

describe("底部模型 ID", () => {
  test("idx 大于 0 时显示编号", () => {
    expect(render({ projectIdx: 12 })).toContain("12");
  });

  test("idx 为 0（新模型尚未分配）显示破折号，不显示 0", () => {
    const html = render({ projectIdx: 0 });
    expect(html).toContain("模型ID：");
    expect(html).toMatch(/id-copy-cell[^>]*>—</u);
  });

  test("idx 缺失 / 负数也走破折号分支", () => {
    expect(render({ projectIdx: undefined })).toMatch(/id-copy-cell[^>]*>—</u);
    expect(render({ projectIdx: -1 })).toMatch(/id-copy-cell[^>]*>—</u);
  });

  test("复制格带说明性 title", () => {
    expect(render()).toContain('title="点击复制模型 ID（model_id）"');
  });
});
