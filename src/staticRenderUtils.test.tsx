import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import type { ModelNode, Point } from "./model";

import {
  DEVICE_GLYPH_DESIGN_LONGEST_SIDE,
  deviceStateVisualToken,
  estimateSvgTextWidth,
  nodeCounterTransformMatrix,
  renderBusGlyphRect,
  resolveStateVisualImageHref,
  routableLineDeviceRenderLocalPoints,
  staticConnectorMarker,
  staticConnectorPath,
  staticDrawPointsForNode,
  staticFrameHandles,
  staticHandleDot,
  staticNumericParam,
  staticShapeText,
  staticSymbolMiniatureTextValue,
  staticSymbolShadowStyle,
  staticSymbolTextValue,
  stateVisualText,
  uprightText
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

  // 下面这条钉的是本文件里 5 处 split(" ")（243/432/444/450/458 行）能**按位置取值**的前提，
  // 它们切的都是 staticConnectorMarker 产出的 points 属性（staticConnectorPath 的两端箭头
  // 也走这个函数）。实测过：这里没有 E 文件那种「定宽空格填充 + filter(Boolean)」的串列缺陷，
  // 因为 points 由 staticRenderUtils.ts:143 的模板串拼出 —— 分隔符是两个字面空格、段数恒为 3、
  // 坐标是 ${number} 插值（连非有限数也插成 "NaN"/"Infinity" 而不是空串），压根不存在空单元格。
  // 但 split(" ") 的安全性完全押在「无空槽」上：分隔符一旦可变宽（多空格 join、按列宽填充、
  // 空值渲染成空格），空槽要么留下空串 token（Number("") 得 0 → 断言红）、
  // 要么整段消失（下标左移一列 → 读到邻槽的值）。两种都是真故障，故在此钉死。
  test("points 属性恒为 3 段、无空槽 —— 这是 5 处按单个空格切分取值的根据", () => {
    const arrowPoints = (element: ReactNode) => /points="([^"]+)"/.exec(markup(element))![1];
    const cases: Array<[string, ReactNode]> = [
      ["常规", staticConnectorMarker("arrow", 10, 0, 1, 0, 10, "#0f0", 1)],
      // 零方向向量走 Math.hypot(...)||1 兜底，三段仍然齐全（不塌成两段）
      ["零方向向量", staticConnectorMarker("arrow", 0, 0, 0, 0, 10, "#0f0", 1)],
      // 非有限方向插值成字面量 NaN，仍是实打实的一段，不是空串
      ["非有限方向", staticConnectorMarker("arrow", 3, 4, NaN, -Infinity, 10, "#0f0", 1)],
      ["负坐标 + size 被夹到 min=4", staticConnectorMarker("arrow", -12.5, -7.25, -3, 4, 1, "#0f0", 1)]
    ];
    for (const [name, element] of cases) {
      const attr = arrowPoints(element);
      const tokens = attr.split(" ");
      expect(tokens, `${name} 的 points 段数：${JSON.stringify(attr)}`).toHaveLength(3);
      expect(
        tokens.map((token, index) => (token === "" ? index : -1)).filter((index) => index >= 0),
        `${name} 的 points 含空槽：${JSON.stringify(attr)}`
      ).toEqual([]);
    }
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

// ─── 以下是还没被上面几组覆盖到的那一半 ───────────────────────────────────────
// staticShapeText / staticConnectorPath / staticFrameHandles / uprightText /
// routableLineDeviceRenderLocalPoints 这几个此前零直接测试，它们出的问题都不抛异常：
// 文字跑出图元框、连线两端箭头朝向反了、控制点少一个，统统只在画布上看得出来。

/** 抽出 <g> 上的 transform 里的 translate 部分。 */
const translateOf = (html: string) => /transform="translate\(([^ )]+) ([^)]+)\)/.exec(html)?.[0] ?? "";

/** 抽出所有 tspan 的 dy 与文本。 */
const tspans = (html: string) =>
  [...html.matchAll(/<tspan x="0" dy="([^"]+)">([^<]*)<\/tspan>/g)].map((m) => ({ dy: m[1], text: m[2] }));

describe("staticShapeText", () => {
  test("默认居中：translate 落在原点，anchor=middle", () => {
    const html = markup(staticShapeText(node(), 100, 40));
    expect(translateOf(html)).toBe('transform="translate(0 0)');
    expect(html).toContain('text-anchor="middle"');
  });

  test("左对齐贴左边距、右对齐贴右边距，anchor 同步切换", () => {
    // w=100 padding=12 → 左 -50+12=-38，右 50-12=38
    const left = markup(staticShapeText(node({ textAlign: "left" }), 100, 40));
    expect(translateOf(left)).toBe('transform="translate(-38 0)');
    expect(left).toContain('text-anchor="start"');

    const right = markup(staticShapeText(node({ textAlign: "right" }), 100, 40));
    expect(translateOf(right)).toBe('transform="translate(38 0)');
    expect(right).toContain('text-anchor="end"');
  });

  test("认不出的 textAlign 落回居中，而不是变成没锚点的 start", () => {
    const html = markup(staticShapeText(node({ textAlign: "justify" }), 100, 40));
    expect(html).toContain('text-anchor="middle"');
    expect(translateOf(html)).toBe('transform="translate(0 0)');
  });

  test("上/下对齐把文字推到框内边缘", () => {
    // h=100 padding=12 fontSize=16 → 上 -50+12+8=-30，下 50-12-8=30
    expect(translateOf(markup(staticShapeText(node({ verticalAlign: "top" }), 100, 100)))).toBe(
      'transform="translate(0 -30)'
    );
    expect(translateOf(markup(staticShapeText(node({ verticalAlign: "bottom" }), 100, 100)))).toBe(
      'transform="translate(0 30)'
    );
  });

  test("padding 被夹到 min(w,h)/2 - 2，字不会顶出图元框", () => {
    // 20x20 的框 padding 填 999：真按 999 算 x 会跑到 -1009，文字整个飞出去
    const html = markup(staticShapeText(node({ textAlign: "left", padding: "999" }), 20, 20));
    expect(translateOf(html)).toBe('transform="translate(-2 0)');
  });

  test("多行：每行一个 tspan，整体按行数上移半高", () => {
    // 3 行 → 上移 (3-1) * 16 * 0.6 = 19.2
    const html = markup(staticShapeText(node({ text: "A\nB\nC" }), 100, 40));
    expect(translateOf(html)).toBe('transform="translate(0 -19.2)');
    expect(tspans(html)).toEqual([
      { dy: "0", text: "A" },
      { dy: "19.2", text: "B" },
      { dy: "19.2", text: "C" }
    ]);
  });

  test("CRLF 也算换行", () => {
    const html = markup(staticShapeText(node({ text: "A\r\nB" }), 100, 40));
    expect(tspans(html).map((row) => row.text)).toEqual(["A", "B"]);
  });

  test("空行渲染成一个空格，不塌成零高行", () => {
    // 直接给空串的话，SVG 里这一行没有内容、上下行会贴在一起
    expect(tspans(markup(staticShapeText(node({ text: "A\n\nB" }), 100, 40))).map((r) => r.text)).toEqual([
      "A",
      " ",
      "B"
    ]);
  });

  test("缩略图：字号锁 12、只显前两个字", () => {
    const html = markup(staticShapeText(node({ text: "开关柜", fontSize: "40" }), 100, 40, true));
    expect(html).toContain('font-size="12"');
    expect(tspans(html).map((r) => r.text)).toEqual(["开关"]);
  });

  test("文字样式逐项可覆盖，未覆盖的走默认值", () => {
    const html = markup(
      staticShapeText(
        node({ textColor: "#f00", fontFamily: "SimSun", fontWeight: "700", fontStyle: "italic", textDecoration: "underline" }),
        100,
        40
      )
    );
    expect(html).toContain('fill="#f00"');
    expect(html).toContain('font-family="SimSun"');
    expect(html).toContain('font-weight="700"');
    expect(html).toContain('font-style="italic"');
    expect(html).toContain('text-decoration="underline"');

    const fallback = markup(staticShapeText(node(), 100, 40));
    expect(fallback).toContain('fill="#111827"');
    expect(fallback).toContain('font-family="Arial"');
    expect(fallback).toContain('font-weight="500"');
  });

  test("文字挂逆变换矩阵：节点转了字仍水平", () => {
    // 少了这个矩阵，旋转 90° 的节点上的字会跟着侧躺
    expect(markup(staticShapeText(node({}, { rotation: 90 }), 100, 40))).toContain("matrix(0 -1 1 0 0 0)");
  });

  test("文字不可选中也不吃指针事件，且按字高中线对齐", () => {
    const html = markup(staticShapeText(node(), 100, 40));
    expect(html).toContain("user-select:none");
    expect(html).toContain("pointer-events:none");
    // 没有 dominant-baseline 时 y=0 指的是基线，整块文字会整体下沉半行
    expect(html).toContain('dominant-baseline="middle"');
  });
});

describe("uprightText", () => {
  test("translate 之后紧跟逆变换矩阵", () => {
    const html = markup(uprightText(node({}, { rotation: 90 }), 3, 4, {}, "x"));
    expect(html).toContain('transform="translate(3 4) matrix(0 -1 1 0 0 0)"');
  });

  test("style 落在 text 上，其余 props 原样透传", () => {
    const html = markup(uprightText(node(), 0, 0, { fill: "#111", title: "提示", style: { pointerEvents: "none" } }, "hi"));
    expect(html).toContain('fill="#111"');
    expect(html).toContain('title="提示"');
    expect(html).toContain("pointer-events:none");
  });
});

describe("staticConnectorPath", () => {
  const path = (points: Point[], params: Record<string, string> = {}, dashArray?: string) =>
    markup(staticConnectorPath(node(params), points, "#111", 2, dashArray));

  test("点列拼成 M/L 折线，线帽与拐角都是圆角", () => {
    const html = path([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }]);
    expect(html).toContain('d="M 0 0 L 10 0 L 10 20"');
    expect(html).toContain('stroke-linecap="round"');
    expect(html).toContain('stroke-linejoin="round"');
  });

  test("两端标记：尖端分别落在首末点上", () => {
    const html = path([{ x: 0, y: 0 }, { x: 10, y: 0 }], { markerStart: "arrow", markerEnd: "arrow" });
    const tips = [...html.matchAll(/<polygon points="([^"]+)"/g)].map((m) => m[1].split(" ")[0]);
    expect(tips).toEqual(["0,0", "10,0"]);
  });

  test("起点箭头背离连线、终点箭头顺着连线（各取相邻点，不跨到折线另一头）", () => {
    // 起点方向 = first - second，终点方向 = last - previous。刻意用三个点：
    // 两点时 second 与 last 是同一个点，写错邻居也看不出来。
    // 底边 = 端点 - 单位方向 * size，size 默认 10。
    const start = /<polygon points="([^"]+)"/.exec(
      path([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }], { markerStart: "arrow" })
    )![1];
    // 起点方向是 (-10,0) → 单位 (-1,0)，底边退到 x=+10
    expect(Number(start.split(" ")[1].split(",")[0])).toBeCloseTo(10, 10);

    const end = /<polygon points="([^"]+)"/.exec(
      path([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }], { markerEnd: "arrow" })
    )![1];
    // 终点方向是 (0,20) → 单位 (0,1)，底边退到 y=+10
    expect(Number(end.split(" ")[1].split(",")[1])).toBeCloseTo(10, 10);
  });

  test("arrowSize 被 min=4 夹住", () => {
    // 填 1 会被夹到 4，底边落在 x=10-4=6
    const end = /<polygon points="([^"]+)"/.exec(
      path([{ x: 0, y: 0 }, { x: 10, y: 0 }], { markerEnd: "arrow", arrowSize: "1" })
    )![1];
    expect(Number(end.split(" ")[1].split(",")[0])).toBeCloseTo(6, 10);
  });

  test("点列不足两个时标记退化成一点，但不产出 NaN", () => {
    const html = path([{ x: 3, y: 4 }], { markerStart: "arrow", markerEnd: "arrow" });
    expect(html).not.toContain("NaN");
    expect((html.match(/<polygon/g) ?? []).length).toBe(2);
  });

  test("虚线参数透传；未给时不输出该属性", () => {
    expect(path([{ x: 0, y: 0 }, { x: 1, y: 0 }], {}, "4 2")).toContain('stroke-dasharray="4 2"');
    expect(path([{ x: 0, y: 0 }, { x: 1, y: 0 }])).not.toContain("stroke-dasharray");
  });

  test("markerStart/markerEnd 缺省都是 none，此时只画线", () => {
    const html = path([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
    expect(html).not.toContain("<polygon");
    expect(html).not.toContain("<circle");
  });

  test("空点集会抛错 —— 现状记录，不是契约", () => {
    // DeviceGlyph 的调用点都先过 staticDrawPointsForNode(..., 至少两个点的兜底)，
    // 所以这条路走不到。记下来是为了：哪天有人给它加兜底，这条会红并逼人想清楚
    // 「没有点该画什么」；而不是让崩溃在别处以别的形式冒出来。
    expect(() => staticConnectorPath(node(), [], "#111", 2, undefined)).toThrow();
  });
});

describe("staticFrameHandles", () => {
  test("八个控制点分布在框边与四角", () => {
    const html = markup(staticFrameHandles(node(), 100, 40));
    expect((html.match(/<circle/g) ?? []).length).toBe(8);
    const centers = [...html.matchAll(/cx="(-?\d+(?:\.\d+)?)" cy="(-?\d+(?:\.\d+)?)"/g)].map((m) => [m[1], m[2]]);
    expect(centers).toEqual([
      ["-50", "-20"], ["0", "-20"], ["50", "-20"], ["50", "0"],
      ["50", "20"], ["0", "20"], ["-50", "20"], ["-50", "0"]
    ]);
  });

  test("描边色取 accentColor，半径随 handleSize 变化", () => {
    const html = markup(staticFrameHandles(node({ accentColor: "#abc", handleSize: "20" }), 100, 40));
    expect(html).toContain('stroke="#abc"');
    expect(html).toContain('r="10"');
  });
});

describe("routableLineDeviceRenderLocalPoints", () => {
  // 这几个函数要 size / position，上面的 node() 故意只带纯计算用字段，
  // 所以这里单独给一个带几何的夹具。
  const routable = (params: Record<string, string> = {}, over: Partial<ModelNode> = {}): ModelNode =>
    node(params, { kind: "ac-routable-line", size: { width: 100, height: 40 }, position: { x: 100, y: 50 }, ...over });

  test("非可路由 kind 返回空数组", () => {
    expect(routableLineDeviceRenderLocalPoints(node())).toEqual([]);
  });

  test("没存折线时按 size.width 的两端取默认点（height 不参与）", () => {
    expect(routableLineDeviceRenderLocalPoints(routable())).toEqual([
      { x: -50, y: 0 },
      { x: 50, y: 0 }
    ]);
  });

  test("旋转跟着搬：外层几何变换对可路由线路是恒等的（rotate(0) scale(1 1)），旋转只在这里发生一次", () => {
    // 少了 nodeGeometryTransform 里那个恒等分支，或者这里不转，都会变成转两次 / 一次不转
    expect(routableLineDeviceRenderLocalPoints(routable({}, { rotation: 90 }))).toEqual([
      { x: 0, y: -50 },
      { x: 0, y: 50 }
    ]);
  });

  test("存了折线就用存的（_routableLinePoints）", () => {
    expect(
      routableLineDeviceRenderLocalPoints(
        routable({ _routableLinePoints: '[{"x":0,"y":0},{"x":20,"y":0}]' })
      )
    ).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 }
    ]);
  });

  test("结果是相对节点原点的，节点挪到哪儿都不影响", () => {
    const moved = routable({}, { position: { x: -800, y: 1200 } });
    expect(routableLineDeviceRenderLocalPoints(moved)).toEqual(
      routableLineDeviceRenderLocalPoints(routable())
    );
  });

  test("坐标经 formatSvgNumber 收敛，不带浮点尾巴", () => {
    const points = routableLineDeviceRenderLocalPoints(
      routable({}, { rotation: 30, scaleX: 1.5, scaleY: 1.5 })
    );
    for (const point of points) {
      expect(String(point.x), JSON.stringify(point)).not.toMatch(/\.\d{7,}/);
      expect(String(point.y), JSON.stringify(point)).not.toMatch(/\.\d{7,}/);
    }
  });
});

describe("DEVICE_GLYPH_DESIGN_LONGEST_SIDE", () => {
  test("图元设计基准恒为 100", () => {
    // DeviceGlyph 用它算非静态图元的等比缩放：改这个数等于把画布上所有
    // 非静态图元一起缩放，描边粗细与字号全变 —— 属于需要被看见的变更。
    expect(DEVICE_GLYPH_DESIGN_LONGEST_SIDE).toBe(100);
  });
});
