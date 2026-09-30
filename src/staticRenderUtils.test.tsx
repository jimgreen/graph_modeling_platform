import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import type { ModelNode, Point } from "./model";

import {
  deviceStateVisualToken,
  estimateSvgTextWidth,
  nodeCounterTransformMatrix,
  renderBusGlyphRect,
  resolveStateVisualImageHref,
  staticConnectorMarker,
  staticDrawPointsForNode,
  staticHandleDot,
  staticNumericParam,
  staticSymbolMiniatureTextValue,
  staticSymbolShadowStyle,
  staticSymbolTextValue,
  stateVisualText
} from "./staticRenderUtils";
import { decodeSvgImageSource } from "./svgUtils";
import { apiPath } from "./config";

// 只带上被测纯函数读到的字段：params / name / scale / rotation。
// 走 createDefaultNode 会把 model-node-ops 拉进 import 链、绕回 model.ts 形成循环依赖。
const node = (params: Record<string, string> = {}, over: Partial<ModelNode> = {}): ModelNode =>
  ({
    id: "n1",
    kind: "static-symbol",
    name: "图元",
    params,
    terminals: [],
    rotation: 0,
    ...over
  }) as unknown as ModelNode;

const markup = (element: ReactNode) => (element ? renderToStaticMarkup(element) : "");

/** 取属性并转成数字：这些函数的坐标/半径是裸浮点拼串（size*0.36 得 3.5999999999999996），
 *  直接比对字面量会把浮点噪声误判成回归。 */
const numAttr = (html: string, name: string) => Number(new RegExp(`${name}="([^"]+)"`).exec(html)?.[1]);

describe("state visual image href resolution", () => {
  test("inlines cached backend image refs before terminal and canvas rendering", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">',
      '<image href="' + apiPath('/images/state-icon') + '" x="1" y="2" width="8" height="6"/>',
      "</svg>"
    ].join("");
    const visual = {
      value: "1",
      name: "运行",
      image: `data:image/svg+xml;utf8,${encodeURIComponent(source)}`
    };

    const href = resolveStateVisualImageHref(visual, {
      "state-icon": "data:image/png;base64,c3RhdGUtaWNvbg=="
    });
    const decoded = decodeSvgImageSource(href);

    expect(decoded).toContain('href="data:image/png;base64,c3RhdGUtaWNvbg=="');
    expect(decoded).not.toContain(apiPath("/images/state-icon"));
  });
});

// 以下是「静态图元渲染」那一层的纯计算部分。此前整个文件只有上面那一条用例，
// 而这些函数被 App / DeviceGlyph / export-svg / 四个 batch 模块共用 —— 它们出错时
// 不抛异常，只是图元尺寸塌成 0、文字跑位、连接标记消失，所以只能靠断言钉住。

describe("staticNumericParam", () => {
  test("键缺失或非数字时用 fallback", () => {
    expect(staticNumericParam(node(), "fontSize", 16)).toBe(16);
    expect(staticNumericParam(node({ fontSize: "abc" }), "fontSize", 16)).toBe(16);
  });

  // 记下来是因为它反直觉且**不是缺陷**：空串经 Number() 得 0（有限），于是走
  // clamp 分支而不是 fallback 分支。视觉上等于「参数为 0」，与「未填」不同。
  test("空串走 clamp 分支（得 min）而非 fallback 分支", () => {
    expect(staticNumericParam(node({ fontSize: "" }), "fontSize", 16)).toBe(0);
    expect(staticNumericParam(node({ fontSize: "" }), "fontSize", 16, 8)).toBe(8);
  });

  test("正常值透传，并被 min 夹住", () => {
    expect(staticNumericParam(node({ fontSize: "12.5" }), "fontSize", 16)).toBe(12.5);
    expect(staticNumericParam(node({ fontSize: "3" }), "fontSize", 16, 8)).toBe(8);
    expect(staticNumericParam(node({ padding: "-5" }), "padding", 12)).toBe(0);
  });
});

describe("静态图元文字取值", () => {
  test("text 未填时用 fallback", () => {
    expect(staticSymbolTextValue(node(), "线路A")).toBe("线路A");
    expect(staticSymbolMiniatureTextValue(node(), "图元")).toBe("图元");
  });

  test("text 为空串时空串赢过 fallback（刻意：允许「只显形状不显字」）", () => {
    expect(staticSymbolTextValue(node({ text: "" }), "线路A")).toBe("");
    expect(staticSymbolMiniatureTextValue(node({ text: "" }), "图元")).toBe("");
  });

  test("缩略字只取前两个字符", () => {
    expect(staticSymbolMiniatureTextValue(node({ text: "开关柜" }), "图元")).toBe("开关");
    expect(staticSymbolMiniatureTextValue(node({ text: "A" }), "图元")).toBe("A");
  });
});

describe("estimateSvgTextWidth", () => {
  test("空串宽 0", () => {
    expect(estimateSvgTextWidth("", 16)).toBe(0);
  });

  test("半角按 0.56 字宽、全角按 1 字宽", () => {
    expect(estimateSvgTextWidth("AB", 10)).toBeCloseTo(11.2, 10);
    expect(estimateSvgTextWidth("线路", 10)).toBe(20);
    expect(estimateSvgTextWidth("A线", 10)).toBeCloseTo(15.6, 10);
  });

  test("按码点而非 UTF-16 码元计宽（emoji 不算两格）", () => {
    expect(estimateSvgTextWidth("😀", 10)).toBe(10);
  });
});

describe("deviceStateVisualToken", () => {
  test("空视觉返回空串", () => {
    expect(deviceStateVisualToken(null)).toBe("");
    expect(deviceStateVisualToken(undefined)).toBe("");
  });

  test("只 value 不同即 token 不同（缓存键的前提）", () => {
    const base = { value: "1", name: "运行" };
    expect(deviceStateVisualToken(base)).toBe(deviceStateVisualToken({ ...base }));
    expect(deviceStateVisualToken(base)).not.toBe(deviceStateVisualToken({ ...base, value: "0" }));
    expect(deviceStateVisualToken(base)).not.toBe(deviceStateVisualToken({ ...base, color: "#f00" }));
  });

  test("字段之间用 \\u001f 分隔，避免跨字段拼接歧义", () => {
    // 若分隔符是空串，{value:"1",name:"23"} 与 {value:"12",name:"3"} 会撞 token。
    expect(deviceStateVisualToken({ value: "1", name: "23" })).not.toBe(
      deviceStateVisualToken({ value: "12", name: "3" })
    );
    expect(deviceStateVisualToken({ value: "1", name: "运行" })).toContain("\u001f");
  });
});

describe("stateVisualText", () => {
  test("空视觉返回空串", () => {
    expect(stateVisualText(null)).toBe("");
  });

  test("text 优先于 icon，都没有则空串", () => {
    expect(stateVisualText({ text: " 合 ", icon: "分" } as never)).toBe("合");
    expect(stateVisualText({ icon: "分" } as never)).toBe("分");
    expect(stateVisualText({ text: "  " } as never)).toBe("");
    expect(stateVisualText({} as never)).toBe("");
  });
});

describe("staticSymbolShadowStyle", () => {
  test("仅 shadowEnabled === '1' 时给阴影样式", () => {
    expect(staticSymbolShadowStyle(node({ shadowEnabled: "1" }))).toEqual({
      filter: "drop-shadow(0 4px 8px rgba(15, 23, 42, 0.18))"
    });
    expect(staticSymbolShadowStyle(node({ shadowEnabled: "0" }))).toBeUndefined();
    expect(staticSymbolShadowStyle(node())).toBeUndefined();
  });
});

describe("nodeCounterTransformMatrix", () => {
  test("无旋转无缩放时是单位矩阵", () => {
    expect(nodeCounterTransformMatrix(node())).toBe("matrix(1 0 0 1 0 0)");
  });

  test("默认把各向异性缩放折成几何平均再均摊回去", () => {
    // sqrt(2*8) = 4 → x 侧 4/2 = 2，y 侧 4/8 = 0.5
    expect(nodeCounterTransformMatrix(node({}, { scale: 1, scaleX: 2, scaleY: 8 }))).toBe("matrix(2 0 0 0.5 0 0)");
  });

  test("preserveScale=false 时只留旋转、不折算缩放", () => {
    expect(nodeCounterTransformMatrix(node({}, { scale: 1, scaleX: 2, scaleY: 8 }), false)).toBe(
      "matrix(0.5 0 0 0.125 0 0)"
    );
  });

  test("旋转 90° 输出正交矩阵（浮点余弦被 formatSvgNumber 抹平）", () => {
    expect(nodeCounterTransformMatrix(node({}, { scale: 1, rotation: 90 }))).toBe("matrix(0 -1 1 0 0 0)");
    expect(nodeCounterTransformMatrix(node({}, { scale: 1, rotation: 180 }))).toBe("matrix(-1 0 0 -1 0 0)");
  });

  test("缩放为 0 时按 1 处理，不产出 NaN/Infinity", () => {
    const matrix = nodeCounterTransformMatrix(node({}, { scale: 1, scaleX: 0, scaleY: 0 }));
    expect(matrix).toBe("matrix(1 0 0 1 0 0)");
    expect(matrix).not.toContain("NaN");
  });
});

describe("staticDrawPointsForNode", () => {
  const fallback: Point[] = [
    { x: 1, y: 2 },
    { x: 3, y: 4 }
  ];

  test("未填 / 非法 JSON / 只给一个点都用 fallback", () => {
    expect(staticDrawPointsForNode(node(), fallback)).toBe(fallback);
    expect(staticDrawPointsForNode(node({ drawPoints: "not json" }), fallback)).toBe(fallback);
    expect(staticDrawPointsForNode(node({ drawPoints: '[{"x":0,"y":0}]' }), fallback)).toBe(fallback);
  });

  test("两个及以上点时用自定义折线", () => {
    const custom = staticDrawPointsForNode(node({ drawPoints: '[{"x":0,"y":0},{"x":10,"y":5}]' }), fallback);
    expect(custom).toHaveLength(2);
    expect(custom[0]).toEqual({ x: 0, y: 0 });
    expect(custom[1]).toEqual({ x: 10, y: 5 });
  });

  test("相邻重复点先被折叠，再判是否够两个点", () => {
    // 折叠后只剩 1 个点 → 退回 fallback；这是 normalizeStaticDrawingPoints 与
    // 「length >= 2」两道闸叠加出来的结果，不是 bug，但很容易写重后误判。
    const collapsed = staticDrawPointsForNode(node({ drawPoints: '[{"x":0,"y":0},{"x":0,"y":0}]' }), fallback);
    expect(collapsed).toBe(fallback);
    const kept = staticDrawPointsForNode(node({ drawPoints: '[{"x":0,"y":0},{"x":0,"y":0},{"x":5,"y":5}]' }), fallback);
    expect(kept).toHaveLength(2);
  });
});

describe("staticConnectorMarker", () => {
  test("dot 半径取 size*0.36 与 lineWidth*1.4 的较大者", () => {
    // size=10, lineWidth=1 → max(3.6, 1.4) = 3.6
    expect(numAttr(markup(staticConnectorMarker("dot", 0, 0, 1, 0, 10, "#f00", 1)), "r")).toBeCloseTo(3.6, 10);
    // size=10, lineWidth=5 → max(3.6, 7) = 7（线宽盖过尺寸时以线宽为准）
    expect(numAttr(markup(staticConnectorMarker("dot", 0, 0, 1, 0, 10, "#f00", 5)), "r")).toBeCloseTo(7, 10);
  });

  test("arrow 渲染成以端点为尖的三点多边形", () => {
    const html = markup(staticConnectorMarker("arrow", 10, 0, 1, 0, 10, "#0f0", 1));
    expect(html).toContain("<polygon");
    // 尖端落在端点 (10,0)，底边沿反方向退 size、半宽 size*0.42 撑开
    const points = /points="([^"]+)"/.exec(html)![1].split(" ").map((pair) => pair.split(",").map(Number));
    expect(points[0]).toEqual([10, 0]);
    expect(points[1][0]).toBeCloseTo(0, 10);
    expect(points[2][0]).toBeCloseTo(0, 10);
    expect(points[1][1]).toBeCloseTo(4.2, 10);
    expect(points[2][1]).toBeCloseTo(-4.2, 10);
  });

  test("方向向量为零向量时按长度 1 处理，不产出 NaN", () => {
    const html = markup(staticConnectorMarker("arrow", 0, 0, 0, 0, 10, "#0f0", 1));
    expect(html).not.toContain("NaN");
  });

  test("未知标记名返回 null（不画任何东西）", () => {
    expect(staticConnectorMarker("none", 0, 0, 1, 0, 10, "#f00", 1)).toBeNull();
    expect(markup(staticConnectorMarker("", 0, 0, 1, 0, 10, "#f00", 1))).toBe("");
  });
});

describe("staticHandleDot", () => {
  test("默认半径 4（handleSize 8 的一半）", () => {
    expect(markup(staticHandleDot(node(), 0, 0))).toContain('r="4"');
  });

  test("handleSize 可调且被 min=3 夹住", () => {
    expect(markup(staticHandleDot(node({ handleSize: "20" }), 0, 0))).toContain('r="10"');
    expect(markup(staticHandleDot(node({ handleSize: "1" }), 0, 0))).toContain('r="1.5"');
  });

  test("颜色 handleColor → accentColor → 默认蓝", () => {
    expect(markup(staticHandleDot(node({ handleColor: "#111", accentColor: "#222" }), 0, 0))).toContain('fill="#111"');
    expect(markup(staticHandleDot(node({ accentColor: "#222" }), 0, 0))).toContain('fill="#222"');
    expect(markup(staticHandleDot(node(), 0, 0))).toContain('fill="#2563eb"');
  });
});

describe("renderBusGlyphRect", () => {
  test("厚度取 max(8, height/3)，且居中（y 取负半厚）", () => {
    expect(markup(renderBusGlyphRect(60, 30, "#111"))).toContain('y="-5"');
    expect(markup(renderBusGlyphRect(60, 30, "#111"))).toContain('height="10"');
    expect(markup(renderBusGlyphRect(60, 12, "#111"))).toContain('height="8"');
    expect(markup(renderBusGlyphRect(60, 12, "#111"))).toContain('y="-4"');
  });
});
