// 交流容器数据模型测试(Task 1)+ 图元绘制与命中策略(Task 2)
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, test, expect } from "vitest";
import {
  DEVICE_LIBRARY_BY_KIND,
  AC_CONTAINER_KINDS,
  createDefaultNode,
  isAcContainerKind,
  type DeviceKind,
  type ModelNode,
} from "./model";
import { DeviceGlyph } from "./DeviceGlyph";
import { nodeLabelShouldRender } from "./nodeLabelUtils";

describe("交流容器数据模型", () => {
  test("3 个容器 kind 已注册且分类为交流容器", () => {
    expect(AC_CONTAINER_KINDS).toEqual([
      "ac-vpp-box",
      "ac-switch-box",
      "ac-distribution-box",
    ]);
    for (const kind of AC_CONTAINER_KINDS) {
      const tpl = DEVICE_LIBRARY_BY_KIND.get(kind);
      expect(tpl, `${kind} 未注册`).toBeTruthy();
      expect(tpl!.categoryLibrary).toBe("交流容器");
    }
  });

  test("容器不进 static 家族(不写 component_type)", () => {
    for (const kind of AC_CONTAINER_KINDS) {
      const tpl = DEVICE_LIBRARY_BY_KIND.get(kind)!;
      // 字段名照抄真实模板结构:style 参数扁平在 params 上(非 defaults.params)
      const params = tpl.params;
      expect(params.component_type).toBeUndefined();
      expect(isAcContainerKind(kind)).toBe(true);
    }
    expect(isAcContainerKind("static-group-box")).toBe(false);
  });
});

// ─── Task 2: 容器图元绘制与命中策略 ──────────────────────────────────────────

function makeContainerNode(kind: DeviceKind, name: string): ModelNode {
  const base = createDefaultNode(kind, { x: 0, y: 0 });
  return {
    ...base,
    name,
    size: { width: 180, height: 112 },
    params: { ...base.params, strokeColor: "#64748b", cornerRadius: "8", strokeStyle: "dashed" },
  };
}

function renderGlyph(node: ModelNode, mode?: "full" | "geometry" | "text") {
  return renderToStaticMarkup(
    createElement("svg", null, createElement(DeviceGlyph, { node, ...(mode ? { mode } : {}) })),
  );
}

/** 取首个命中标记的标签原文,避免断言跨标签误配 */
function tagOf(html: string, marker: string) {
  return html.match(new RegExp(`<(?:rect|g)[^>]*${marker}[^>]*>`))?.[0] ?? "";
}

describe("容器图元绘制", () => {
  test("容器输出 pointer-events:none 填充与加宽命中带", () => {
    const html = renderGlyph(makeContainerNode("ac-vpp-box", "虚拟电厂1"));

    expect(html).toContain("ac-container-fill");
    expect(html).toContain("pointer-events:none");
    expect(html).toContain("ac-container-stroke-hit");
    expect(html).toContain("虚拟电厂1");

    // 填充不可命中(点内部空白穿透到下层)
    expect(tagOf(html, "ac-container-fill")).toContain("pointer-events:none");
    // 命中带:透明描边 + 加宽 8
    const hit = tagOf(html, "ac-container-stroke-hit");
    expect(hit).toContain('stroke="transparent"');
    expect(hit).toContain('stroke-width="8"');
    // 名称可命中(spec「点描边或名称 → 选中容器」):text 不得带 pointer-events:none
    // —— 计划草图给 text 加了 pointerEvents:"none",照抄会让需求静默失效而其余断言全绿
    expect(html.match(/<text[^>]*>/)?.[0] ?? "").not.toContain("pointer-events");
    // 容器标记与名称
    expect(html).toContain('data-container-box="1"');
  });

  test("三个容器 kind 均走容器分支(ac-switch-box 不被 switch 变体启发式劫持)", () => {
    for (const kind of AC_CONTAINER_KINDS) {
      const html = renderGlyph(makeContainerNode(kind, `${kind}-名称`));
      expect(html, `${kind} 未走容器分支`).toContain('data-container-box="1"');
      expect(html).toContain("ac-container-fill");
      expect(html).toContain("ac-container-stroke-hit");
      expect(html).toContain(`${kind}-名称`);
    }
  });

  test("画布分层渲染:geometry 只画框,text 只画名称", () => {
    const node = makeContainerNode("ac-distribution-box", "配变箱1");
    const geometry = renderGlyph(node, "geometry");
    expect(geometry).toContain("ac-container-fill");
    expect(geometry).toContain("ac-container-stroke-hit");
    expect(geometry).not.toContain("配变箱1");

    const text = renderGlyph(node, "text");
    expect(text).toContain("配变箱1");
    expect(text).not.toContain("ac-container-fill");
  });

  test("名称取自 node.name,不吃 params.text(模板已删死参数)", () => {
    const node = makeContainerNode("ac-vpp-box", "虚拟电厂A");
    const html = renderGlyph({
      ...node,
      params: { ...node.params, text: "旧死参数文本" },
    });
    expect(html).toContain("虚拟电厂A");
    expect(html).not.toContain("旧死参数文本");
  });

  test("容器模板与新建节点保持 180×112(spec 默认尺寸不被图元归一化)", () => {
    for (const kind of AC_CONTAINER_KINDS) {
      expect(DEVICE_LIBRARY_BY_KIND.get(kind)!.size, `${kind} 模板尺寸被归一化`).toEqual({ width: 180, height: 112 });
      expect(createDefaultNode(kind, { x: 0, y: 0 }).size, `${kind} 新建节点尺寸被归一化`).toEqual({ width: 180, height: 112 });
    }
  });

  test("容器不叠加设备标签(名称只出自容器绘制分支)", () => {
    expect(nodeLabelShouldRender(makeContainerNode("ac-vpp-box", "虚拟电厂1"), true)).toBe(false);
    // 排除须是容器专属:普通设备照常渲染标签
    expect(nodeLabelShouldRender(createDefaultNode("ac-source", { x: 0, y: 0 }), true)).toBe(true);
  });

  test("容器按节点真实尺寸绘制(不被图元设计基准缩放)", () => {
    // 180×112 容器若走 glyphContentScale,描边/命中带/字号会被等比放大
    const html = renderGlyph(makeContainerNode("ac-vpp-box", "尺寸检查"));
    expect(html).toContain('width="180"');
    expect(html).toContain('height="112"');
    expect(html).not.toContain("scale(");
  });
});
