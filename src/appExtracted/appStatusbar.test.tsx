// 底部状态栏的渲染契约。
//
// 状态栏是常驻可见的一行字，写错不需要造数据就能被用户看见，但此前零直接测试
// （只有 e2e 截图式的间接覆盖）。这里用 renderToStaticMarkup 钉住几条真实契约，
// 重点是**空间 id 与显示名会分叉**那条：目录名恒为 id，改名只改 spaces.json 里的
// name，所以正文必须显示 id、把 name 放进 title —— 写反了用户会拿着显示名去
// 找目录，找不到。
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppStatusbar } from "./appStatusbar";

const makeScope = (over: Record<string, unknown> = {}) => ({
  Grid2X2: () => null,
  connectSource: null,
  currentSpaceId: "space-abc",
  currentZoomPercent: 100,
  edges: [{}, {}],
  mode: "select",
  mousePositionTextRef: { current: null },
  nodes: [{}, {}, {}],
  operationLogRef: { current: "就绪" },
  operationLogStatusRef: { current: null },
  resetViewportZoom: () => {},
  saveRequired: false,
  selectedCount: 0,
  selectedNodeTransformStatus: null,
  setTopologyWarningPanelClosed: () => {},
  setUnsavedChangesDialogOpen: () => {},
  spaces: [{ id: "space-abc", name: "我的工作空间" }],
  startStatusbarResize: () => {},
  topologyErrors: [] as unknown[],
  topologyStatus: { state: "idle", message: "正常" },
  warningStatusText: "无告警",
  warningStatusTitle: "拓扑告警",
  ...over
});

const render = (over: Record<string, unknown> = {}) =>
  renderToStaticMarkup(<AppStatusbar scope={makeScope(over)} inputs={[]}/>);

describe("空间 ID：正文显示 id，名字只进 title", () => {
  test("正文里出现 id，不出现显示名", () => {
    const html = render();
    expect(html).toContain("space-abc");
    // 显示名只允许出现在 title 属性里，不能占正文（栏宽有限，且名字会与目录名分叉）
    const body = html.replace(/title="[^"]*"/gu, "");
    expect(body).not.toContain("我的工作空间");
  });

  test("title 同时给出名字与 id，并说明目录名就是 id", () => {
    const html = render();
    expect(html).toContain("当前工作空间：我的工作空间（id：space-abc）");
    expect(html).toContain("目录名就是 id");
  });

  test("id 缺失时显示破折号占位，不显示 undefined/null", () => {
    const html = render({ currentSpaceId: "", spaces: [] });
    expect(html).toContain("空间ID");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
  });

  test("spaces 缺失或当前 id 不在其中时，title 退化为破折号", () => {
    expect(render({ spaces: undefined })).toContain("当前工作空间：—（id：space-abc）");
    expect(render({ spaces: [{ id: "other", name: "别的空间" }] })).toContain("当前工作空间：—（id：space-abc）");
  });

  test("复制单元格带无障碍标签（读屏可识别）", () => {
    expect(render()).toContain('aria-label="复制工作空间 ID"');
  });
});

describe("计数与缩放", () => {
  test("元件/联络线/选中 三项计数取自 scope", () => {
    const html = render({ nodes: [{}], edges: [{}, {}, {}], selectedCount: 2 });
    expect(html).toContain("元件 1");
    expect(html).toContain("联络线 3");
    expect(html).toContain("选中 2");
  });

  test("缩放 pill 文案与 title 一致，且提示可点击回 100%", () => {
    const html = render({ currentZoomPercent: 62.5 });
    expect(html).toContain("缩放 62.5%");
    expect(html).toContain("当前视图缩放比 62.5%，点击回到 100%");
  });

  test("日志区显示 operationLogRef 的当前值", () => {
    expect(render()).toContain("日志 就绪");
    expect(render({ operationLogRef: { current: "已保存" } })).toContain("日志 已保存");
  });
});

describe("条件区块", () => {
  test("未保存标记仅在 saveRequired 时出现", () => {
    expect(render()).not.toContain("未保存");
    expect(render({ saveRequired: true })).toContain("未保存");
  });

  test("图元变换状态仅在有值时出现", () => {
    expect(render()).not.toContain("图元 缩放");
    const html = render({ selectedNodeTransformStatus: { title: "t", scaleText: "150%", rotationText: "30°" } });
    expect(html).toContain("图元 缩放 150% 旋转 30°");
  });

  test("connect 模式按有无起点给出不同提示", () => {
    expect(render({ mode: "connect", connectSource: null })).toContain("选择起点端子");
    expect(render({ mode: "connect", connectSource: { node: {} } })).toContain("选择同类型目标端子");
  });

  test("static-draw 模式给出操作提示，其他模式不出现", () => {
    expect(render({ mode: "static-draw" })).toContain("点击落点，双击或 Enter 完成，Esc 取消");
    expect(render({ mode: "select" })).not.toContain("Esc 取消");
  });
});

describe("拓扑与告警 pill", () => {
  test("拓扑 pill 的 class 跟随状态、title 带消息", () => {
    const html = render({ topologyStatus: { state: "error", message: "有孤立节点" } });
    expect(html).toContain("topology-error");
    expect(html).toContain("有孤立节点");
  });

  test("无告警时 pill 为 idle，只显示标题不带「点击打开」", () => {
    const html = render({ topologyErrors: [], warningStatusTitle: "拓扑告警", warningStatusText: "无告警" });
    expect(html).toContain("warning-idle");
    expect(html).toContain("无告警");
    expect(html).not.toContain("点击打开拓扑告警窗口");
  });

  test("有告警时 pill 为 active，title 追加点击提示", () => {
    const html = render({ topologyErrors: [{ message: "x" }], warningStatusTitle: "拓扑告警" });
    expect(html).toContain("warning-active");
    expect(html).toContain("点击打开拓扑告警窗口");
  });
});
