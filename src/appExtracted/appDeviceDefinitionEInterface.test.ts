// appDeviceDefinitionEInterface 的状态图标草稿判定（此前零直呼测试）。
//
// stateIconDrawingFrameHasPersistedContent 决定「草稿里有没有用户改过的东西」——
// 决定离开编辑器时要不要提示未保存。判定写错不报错：漏判就是「白丢用户画的图」，
// 误判就是「明明没改却一直拦着不让走」。
import { describe, expect, it } from "vitest";
import {
  STATE_ICON_CLOSED_SHAPE_KINDS,
  STATE_ICON_DRAWING_FRAME_HEIGHT,
  STATE_ICON_DRAWING_FRAME_WIDTH,
  STATE_ICON_LINE_SHAPE_KINDS,
  STATE_ICON_STATIC_TEMPLATE_SECTIONS_COVERED_BY_BASIC_TOOLS,
  STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER,
  STATE_ICON_DRAFT_FRAME,
  stateIconDrawingFrameHasPersistedContent as hasContent
} from "./appDeviceDefinitionEInterface";

describe("stateIconDrawingFrameHasPersistedContent", () => {
  it("空值与空草稿都算「没内容」", () => {
    expect(hasContent(undefined)).toBe(false);
    expect(hasContent(null)).toBe(false);
    expect(hasContent({})).toBe(false);
  });

  it("与默认草稿逐字段相同 ⇒ 没内容", () => {
    expect(hasContent({ ...STATE_ICON_DRAFT_FRAME })).toBe(false);
  });

  it("只多出草稿不认识的字段 ⇒ 仍算没内容（白名单语义）", () => {
    // 判定是白名单式的：只比对那 6 个字段，其余一律不看。
    // 反过来说，往 frame 里塞无关字段不该被判成「有内容」而误拦用户。
    expect(hasContent({ 随便什么字段: 1 })).toBe(false);
    expect(hasContent({ ...STATE_ICON_DRAFT_FRAME, 另一个: "x" })).toBe(false);
  });

  it("设了背景图或背景图资源 id ⇒ 有内容", () => {
    expect(hasContent({ backgroundImage: "a.png" })).toBe(true);
    expect(hasContent({ backgroundImageAssetId: "asset-1" })).toBe(true);
  });

  it("背景图只有空白 ⇒ 没内容（trim 后为空）", () => {
    expect(hasContent({ backgroundImage: "" })).toBe(false);
    expect(hasContent({ backgroundImage: "   " })).toBe(false);
    expect(hasContent({ backgroundImageAssetId: "  " })).toBe(false);
  });

  it("颜色改了 ⇒ 有内容；大小写不同但语义相同 ⇒ 仍算没内容", () => {
    expect(hasContent({ fillColor: "#ff0000" })).toBe(true);
    expect(hasContent({ strokeColor: "#ff0000" })).toBe(true);
    // 比较前统一小写（normalizeStateIconFrameText 里 toLowerCase）：
    // 默认值本身是小写，用户填大写同色不该被当成改动
    expect(hasContent({ fillColor: String(STATE_ICON_DRAFT_FRAME.fillColor).toUpperCase() })).toBe(false);
    expect(hasContent({ fillColor: `  ${STATE_ICON_DRAFT_FRAME.fillColor}  ` })).toBe(false);
  });

  it("描边样式改了 ⇒ 有内容", () => {
    expect(hasContent({ strokeStyle: "dashed" })).toBe(true);
  });

  it("线宽按数值比较：0、负数、字符串 0 都与默认相同", () => {
    // normalizeStateIconFrameNumber 是 Math.max(0, Number(v) || 0)：
    // -3 被夹成 0，"0" 经 Number 得 0，都与草稿默认的 0 相同 ⇒ 不算改动
    expect(hasContent({ strokeWidth: 0 })).toBe(false);
    expect(hasContent({ strokeWidth: -3 })).toBe(false);
    expect(hasContent({ strokeWidth: "0" })).toBe(false);
    expect(hasContent({ strokeWidth: String(STATE_ICON_DRAFT_FRAME.strokeWidth) })).toBe(false);
    expect(hasContent({ strokeWidth: undefined })).toBe(false);
  });

  it("线宽改成非零值 ⇒ 有内容", () => {
    expect(hasContent({ strokeWidth: 5 })).toBe(true);
    expect(hasContent({ strokeWidth: "2" })).toBe(true);
    expect(hasContent({ strokeWidth: 0.5 })).toBe(true);
  });

  it("backgroundImageFit 不参与判定（草稿里有它但改它不算内容）", () => {
    // fit 是布局参数不是用户画的内容，改它不该触发未保存提示
    expect(hasContent({ backgroundImageFit: "contain" })).toBe(false);
  });
});

describe("状态图元常量", () => {
  it("线形状与闭合形状互斥且覆盖常见类型", () => {
    // semicircle 同时出现在两个集合里：它既能当线也能当闭合形
    expect(STATE_ICON_LINE_SHAPE_KINDS.has("line")).toBe(true);
    expect(STATE_ICON_LINE_SHAPE_KINDS.has("polyline")).toBe(true);
    expect(STATE_ICON_CLOSED_SHAPE_KINDS.has("circle")).toBe(true);
    expect(STATE_ICON_CLOSED_SHAPE_KINDS.has("rectangle")).toBe(true);
    expect(STATE_ICON_LINE_SHAPE_KINDS.has("circle")).toBe(false);
    expect(STATE_ICON_CLOSED_SHAPE_KINDS.has("line")).toBe(false);
  });

  it("静态模板段顺序固定且无重复", () => {
    expect(STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER[0]).toBe("StaticTextSymbol");
    expect(STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER).toHaveLength(8);
    expect(new Set(STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER).size).toBe(
      STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.length
    );
  });

  it("基础工具覆盖的段都出现在段顺序里（否则覆盖率对不上账）", () => {
    for (const section of STATE_ICON_STATIC_TEMPLATE_SECTIONS_COVERED_BY_BASIC_TOOLS) {
      expect(STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER, section).toContain(section);
    }
  });

  it("绘制画布尺寸是 240×160", () => {
    expect(STATE_ICON_DRAWING_FRAME_WIDTH).toBe(240);
    expect(STATE_ICON_DRAWING_FRAME_HEIGHT).toBe(160);
  });

  it("默认草稿的线宽为 0、颜色全透明（新建即「无内容」的基线）", () => {
    expect(STATE_ICON_DRAFT_FRAME.strokeWidth).toBe(0);
    expect(STATE_ICON_DRAFT_FRAME.fillColor).toBe("transparent");
    expect(STATE_ICON_DRAFT_FRAME.strokeColor).toBe("transparent");
    expect(STATE_ICON_DRAFT_FRAME.backgroundImage).toBe("");
    expect(STATE_ICON_DRAFT_FRAME.backgroundImageAssetId).toBe("");
  });
});
