// staticRenderUtils 的纯函数层测试。
//
// 该模块（11.8KB / 19 个导出）此前**零直接测试**：所有函数都是 DeviceGlyph 的内部件，
// 而 DeviceGlyph.ts（96.5KB）本身也无独立测试文件。换句话说「静态图元渲染」这条路径
// 的取数逻辑从没被执行过 —— 一旦某个 fallback 写错，画布上表现为图元文字/连线错位，
// 且全程不报错。
//
// 这里覆盖的是**取数与几何**，不断言 React 元素树结构（那受 createElement 版本影响）。
import { describe, expect, test } from "vitest";
import type { CSSProperties } from "react";
import {
  DEVICE_GLYPH_DESIGN_LONGEST_SIDE,
  deviceStateVisualToken,
  estimateSvgTextWidth,
  nodeCounterTransformMatrix,
  renderBusGlyphRect,
  resolveStateVisualImageHref,
  stateVisualText,
  staticDrawPointsForNode,
  staticFrameHandles,
  staticHandleDot,
  staticNumericParam,
  staticShapeText,
  staticSymbolMiniatureTextValue,
  staticSymbolShadowStyle,
  staticSymbolTextValue,
  uprightText
} from "./staticRenderUtils";
import type { DeviceStateVisual, ModelNode, Point } from "./model";
import { STATIC_DRAW_POINTS_PARAM } from "./model.ts";

const node = (over: Partial<ModelNode> = {}): ModelNode =>
  ({
    id: "n1",
    kind: "static-text",
    name: "文字1",
    position: { x: 100, y: 100 },
    size: { width: 80, height: 40 },
    rotation: 0,
    params: {},
    terminals: [],
    ...over
  }) as unknown as ModelNode;

// 数值参数兜底：非有限退回 fallback，其余被 max(min, x) 夹住。
// 判错的后果是 radius="NaN" 这类无效 SVG 属性 —— 浏览器静默忽略该属性。
describe("staticNumericParam", () => {
  test("缺值 / NaN / 非数值字符串退回 fallback", () => {
    // undefined → Number(undefined) 是 NaN ⇒ 唯一会走 fallback 的「缺值」形态
    expect(staticNumericParam(node(), "missing", 8)).toBe(8);
    expect(staticNumericParam(node({ params: { v: "abc" } }), "v", 8)).toBe(8);
    expect(staticNumericParam(node({ params: { v: Number.NaN as never } }), "v", 8)).toBe(8);
  });

  test("空串与 null 被 Number() 折成 0，是有效值而非缺值（走 min 夹取）", () => {
    // Number("") === 0、Number(null) === 0 —— 不是 NaN，故**不会**退回 fallback。
    // 若日后有人改成 `node.params[key] == null || node.params[key] === ""` 判缺值，
    // 本条即红：那会让「参数清空」被误当成「没填」而用 fallback。
    expect(staticNumericParam(node({ params: { v: "" } }), "v", 8)).toBe(0);
    expect(staticNumericParam(node({ params: { v: null as never } }), "v", 8)).toBe(0);
    // 带非零 min 时这两个形态同样被抬到 min
    expect(staticNumericParam(node({ params: { v: "" } }), "v", 8, 3)).toBe(3);
  });

  test("有效值被 min 夹住（默认下限 0）", () => {
    expect(staticNumericParam(node({ params: { v: "16" } }), "v", 8)).toBe(16);
    expect(staticNumericParam(node({ params: { v: "-5" } }), "v", 8)).toBe(0);
    expect(staticNumericParam(node({ params: { v: "-5" } }), "v", 8, 3)).toBe(3);
  });

  test("±Infinity 退回 fallback（Number.isFinite 拦得住它，不会漏进 SVG）", () => {
    // 实现：`!Number.isFinite(parsed)` 才退回。±Infinity 的 isFinite 是 false ⇒ 走 fallback。
    // 若这条红了而代码没改，多半是有人把判据放宽成了 `Number.isNaN` —— 那会让
    // radius="Infinity" 这类无效属性进到导出 SVG 里（浏览器静默忽略该属性）。
    expect(staticNumericParam(node({ params: { v: String(Number.POSITIVE_INFINITY) } }), "v", 8)).toBe(8);
    expect(staticNumericParam(node({ params: { v: String(Number.NEGATIVE_INFINITY) } }), "v", 8)).toBe(8);
  });

  test("字符串数值被解析（前端参数全是字符串，这里是主路径）", () => {
    expect(staticNumericParam(node({ params: { v: "12.7" } }), "v", 8)).toBe(12.7);
  });
});

// 文字取值：主值 vs 缩略图值（缩略图只取前 2 字，且 undefined 与空串走不同分支）。
describe("staticSymbolTextValue / staticSymbolMiniatureTextValue", () => {
  test("主值缺省时用 fallback，params.text 优先", () => {
    expect(staticSymbolTextValue(node(), "图元")).toBe("图元");
    expect(staticSymbolTextValue(node({ params: { text: "主变#1" } }), "图元")).toBe("主变#1");
    // 空串是有效值，不退回
    expect(staticSymbolTextValue(node({ params: { text: "" } }), "图元")).toBe("");
  });

  test("缩略图值：undefined 走 fallback，空串切出空串，两字截断", () => {
    expect(staticSymbolMiniatureTextValue(node(), "图元")).toBe("图元");
    expect(staticSymbolMiniatureTextValue(node({ params: { text: "" } }), "图元")).toBe("");
    expect(staticSymbolMiniatureTextValue(node({ params: { text: "母线" } }), "图元")).toBe("母线");
    expect(staticSymbolMiniatureTextValue(node({ params: { text: "1号主变" } }), "图元")).toBe("1号");
  });
});

// 阴影：只有 "1" 才开。参数是字符串，故 "0"/"true" 都不该开。
describe("staticSymbolShadowStyle", () => {
  test("仅 shadowEnabled === \"1\" 开启，其余（含 1 数字、true、\"true\"）都关", () => {
    expect(staticSymbolShadowStyle(node())).toBeUndefined();
    expect(staticSymbolShadowStyle(node({ params: { shadowEnabled: "0" } }))).toBeUndefined();
    expect(staticSymbolShadowStyle(node({ params: { shadowEnabled: "true" } }))).toBeUndefined();
    expect(staticSymbolShadowStyle(node({ params: { shadowEnabled: 1 as never } }))).toBeUndefined();
    const on = staticSymbolShadowStyle(node({ params: { shadowEnabled: "1" } }));
    expect(on?.filter).toContain("drop-shadow");
  });
});

// 文字宽度估算：ASCII/拉丁-1 按 0.56 字宽，其余（含中文）按 1 整字宽。
// 用于排版时决定换行与包围盒，故与真实字体的偏差会体现为「标签框算小了」。
describe("estimateSvgTextWidth", () => {
  test("全 ASCII 逐字 0.56", () => {
    expect(estimateSvgTextWidth("abcd", 10)).toBeCloseTo(4 * 0.56 * 10, 6);
    expect(estimateSvgTextWidth("", 10)).toBe(0);
  });

  test("中文按整字宽 1", () => {
    expect(estimateSvgTextWidth("母线", 10)).toBeCloseTo(20, 6);
  });

  test("中英混排逐字累加", () => {
    // "A母" = 0.56 + 1
    expect(estimateSvgTextWidth("A母", 10)).toBeCloseTo(15.6, 6);
  });

  test("拉丁-1 扩展字符（é / ÿ）算 0.56，CJK 与全角标点算 1", () => {
    // 正则 /[\x00-ÿ]/ 覆盖 Latin-1，故 "é" 与 "ÿ" 都算窄字符
    expect(estimateSvgTextWidth("é", 10)).toBeCloseTo(5.6, 6);
    expect(estimateSvgTextWidth("ÿ", 10)).toBeCloseTo(5.6, 6);
    // 超出 Latin-1 的（如 "Ā" U+0100、"，") 按整字宽
    expect(estimateSvgTextWidth("Ā", 10)).toBeCloseTo(10, 6);
    expect(estimateSvgTextWidth("，", 10)).toBeCloseTo(10, 6);
  });

  test("按码点遍历，代理对（emoji）算一个字而非两个", () => {
    // Array.from 按码点切分 ⇒ "😀" 是 1 个元素、宽 1 整字
    expect(estimateSvgTextWidth("😀", 10)).toBeCloseTo(10, 6);
  });

  test("fontSize 线性缩放", () => {
    expect(estimateSvgTextWidth("母线", 20)).toBeCloseTo(2 * estimateSvgTextWidth("母线", 10), 6);
    expect(estimateSvgTextWidth("母线", 0)).toBe(0);
  });
});

// 绘制点：用户自定义点集 ≥ 2 才生效，否则用兜底。
// 判错的后果是「画布上手绘的折线形状与保存后重载不一致」。
describe("staticDrawPointsForNode", () => {
  const fallback: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 10 }];

  test("两个及以上自定义点生效（走 STATIC_DRAW_POINTS_PARAM 的真键名）", () => {
    // 键名是 model.ts 的 STATIC_DRAW_POINTS_PARAM = "drawPoints"，不是 "staticDrawPoints"。
    // 写错键名的话这里会静默退回兜底 —— 故显式引用常量而不是硬编码字符串。
    const two: Point[] = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
    const param = JSON.stringify(two);
    expect(staticDrawPointsForNode(node({ params: { [STATIC_DRAW_POINTS_PARAM]: param } }), fallback)).toEqual(two);
  });

  test("点集会被归一：非有限点丢弃、坐标按 0.1 精度取整、相邻重复点合并", () => {
    // parseStaticDrawPoints → normalizeStaticDrawingPoints：这是「画出来的」与
    // 「保存后重载的」形状一致的关键。取整精度是 1 位小数（roundStaticDrawingCoordinate），
    // 不是 SVG 的 5 位 —— 钉住这点以免日后有人按 formatSvgNumber 的精度去改。
    const messy = JSON.stringify([
      { x: 1.23456, y: 2.04 },
      // 用字符串而非 NaN 字面量：JSON.stringify(NaN) 会写成 null，而 Number(null) 是 0
      // ——那会变成一个真实的原点点、**不被丢弃**。这本身也是个值得钉住的事实。
      { x: "不是数字", y: 3 },
      { x: 1.21, y: 2.01 },
      { x: 10, y: 20 }
    ]);
    const out = staticDrawPointsForNode(node({ params: { [STATIC_DRAW_POINTS_PARAM]: messy } }), fallback);
    // 非数值点被丢弃；剩下前两点取整后都落到 (1.2, 2) ⇒ 合并成一个
    expect(out).toEqual([{ x: 1.2, y: 2 }, { x: 10, y: 20 }]);
  });

  test("归一后不足两个点时退回兜底（单点/全重复画不出形状）", () => {
    const single = JSON.stringify([{ x: 1, y: 2 }]);
    expect(staticDrawPointsForNode(node({ params: { [STATIC_DRAW_POINTS_PARAM]: single } }), fallback)).toBe(fallback);
    // 两个完全相同的点会被合并成一个 ⇒ 长度 1 ⇒ 退回兜底
    const dup = JSON.stringify([{ x: 1, y: 2 }, { x: 1, y: 2 }]);
    expect(staticDrawPointsForNode(node({ params: { [STATIC_DRAW_POINTS_PARAM]: dup } }), fallback)).toBe(fallback);
  });

  test("不足两个点退回兜底（单点画不出形状）", () => {
    expect(staticDrawPointsForNode(node(), fallback)).toBe(fallback);
    expect(staticDrawPointsForNode(node({ params: { [STATIC_DRAW_POINTS_PARAM]: "[]" } }), fallback)).toBe(fallback);
    expect(
      staticDrawPointsForNode(node({ params: { [STATIC_DRAW_POINTS_PARAM]: JSON.stringify([{ x: 1, y: 2 }]) } }), fallback)
    ).toBe(fallback);
  });

  test("无法解析的点集退回兜底（不抛错）", () => {
    expect(staticDrawPointsForNode(node({ params: { [STATIC_DRAW_POINTS_PARAM]: "不是 JSON" } }), fallback)).toBe(fallback);
    // 非数组 JSON 也退回
    expect(staticDrawPointsForNode(node({ params: { [STATIC_DRAW_POINTS_PARAM]: '{"x":1}' } }), fallback)).toBe(fallback);
  });
});

// 状态视觉：token 作 memo 键（字段顺序变了就整棵子树重渲染），
// text 回落 icon，image href 优先用 assetId 走资产表。
describe("状态视觉取数", () => {
  test("token 拼接全部字段，顺序固定（少一个字段 ⇒ memo 失效、整树重渲染）", () => {
    const visual: DeviceStateVisual = {
      value: "1",
      name: "合",
      icon: "icon-a",
      image: "img-a",
      imageAssetId: "asset-a",
      imageFit: "contain",
      backgroundImage: "bg-a",
      backgroundImageAssetId: "bg-asset-a",
      backgroundImageFit: "cover",
      text: "合闸",
      color: "#111",
      fillColor: "#222",
      strokeColor: "#333",
      textColor: "#444"
    } as DeviceStateVisual;
    const token = deviceStateVisualToken(visual);
    // 用 U+001F 作分隔符，保证 "a"+"bc" 与 "ab"+"c" 不会撞成同一个 token
    expect(token.split("\u001f")).toHaveLength(14);
    expect(token).not.toBe(deviceStateVisualToken({ ...visual, color: "#999" }));
    // 缺字段时用空串占位，位置不变
    expect(deviceStateVisualToken({ value: "1" } as DeviceStateVisual).split("\u001f")).toHaveLength(14);
  });

  test("token 对 null / undefined 返回空串", () => {
    expect(deviceStateVisualToken(null)).toBe("");
    expect(deviceStateVisualToken(undefined)).toBe("");
  });

  test("显示文本 text 优先于 icon，两者都空则空串（并去空白）", () => {
    expect(stateVisualText({ text: " 合闸 ", icon: "i" } as DeviceStateVisual)).toBe("合闸");
    expect(stateVisualText({ icon: " i " } as DeviceStateVisual)).toBe("i");
    expect(stateVisualText({} as DeviceStateVisual)).toBe("");
    expect(stateVisualText(null)).toBe("");
  });

  test("图片 href 优先 assetId，其次 backgroundImageAssetId，最后内联 url", () => {
    const assets = { "asset-a": "/api/images/asset-a", "bg-asset": "/api/images/bg" };
    expect(resolveStateVisualImageHref({ imageAssetId: "asset-a", image: "inline" } as DeviceStateVisual, assets))
      .not.toBe("");
    // assetId 命中资产表时优先用它
    expect(resolveStateVisualImageHref({ imageAssetId: "asset-a" } as DeviceStateVisual, assets))
      .toBe(resolveStateVisualImageHref({ imageAssetId: "asset-a" } as DeviceStateVisual, assets));
    expect(resolveStateVisualImageHref({ imageAssetId: "missing", image: "inline-x" } as DeviceStateVisual, assets))
      .toContain("inline-x");
    expect(resolveStateVisualImageHref({ backgroundImageAssetId: "bg-asset" } as DeviceStateVisual, assets))
      .not.toBe("");
  });

  test("无图 / 空 assets 时不抛错", () => {
    expect(resolveStateVisualImageHref(null, {})).toBe("");
    expect(resolveStateVisualImageHref({} as DeviceStateVisual, {})).toBe("");
    expect(resolveStateVisualImageHref({ imageAssetId: "nope" } as DeviceStateVisual, {})).toBe("");
  });
});

/** 取 createElement 产物的 props。React 的元素类型带 SVGAttributes 而无索引签名，
 *  故必须经 unknown 中转（直接 as 会报 TS2352）。 */
const propsOf = (element: unknown): Record<string, unknown> =>
  (element as { props: Record<string, unknown> }).props;

// 母线图元：条形厚度 = max(8, 高/3)，永远居中。
describe("renderBusGlyphRect", () => {
  test("高图元取高/3，最小 8", () => {
    expect(propsOf(renderBusGlyphRect(100, 60, "#111")).height).toBe(20);
    expect(propsOf(renderBusGlyphRect(100, 60, "#111")).y).toBe(-10);

    expect(propsOf(renderBusGlyphRect(100, 12, "#111")).height).toBe(8);
    expect(propsOf(renderBusGlyphRect(100, 12, "#111")).y).toBe(-4);
  });

  test("宽度沿用传入值，x 居中于原点", () => {
    const rect = propsOf(renderBusGlyphRect(100, 60, "#111"));
    expect(rect.x).toBe(-50);
    expect(rect.width).toBe(100);
    expect(rect.fill).toBe("#111");
  });
});

// 图元设计常量：设备库按它归一尺寸，改正它会让全部图元缩放。
describe("DEVICE_GLYPH_DESIGN_LONGEST_SIDE", () => {
  test("为正数且是设计基准边长", () => {
    expect(Number.isFinite(DEVICE_GLYPH_DESIGN_LONGEST_SIDE)).toBe(true);
    expect(DEVICE_GLYPH_DESIGN_LONGEST_SIDE).toBeGreaterThan(0);
    expect(DEVICE_GLYPH_DESIGN_LONGEST_SIDE).toBe(100);
  });
});

// 旋转/缩放矩阵：文字与图元共用同一个「反向补偿」矩阵，保证标签不随图元变形。
describe("nodeCounterTransformMatrix", () => {
  test("无旋转无缩放时是单位矩阵", () => {
    expect(nodeCounterTransformMatrix(node())).toBe("matrix(1 0 0 1 0 0)");
  });

  test("90° 旋转产生交换项", () => {
    const matrix = nodeCounterTransformMatrix(node({ rotation: 90 }));
    // cos90≈0、sin90≈1 ⇒ a≈0 b≈-1/scaleY c≈1/scaleX d≈0
    expect(matrix.startsWith("matrix(")).toBe(true);
    const [a, b, c, d] = matrix.slice(7, -1).split(" ").map(Number);
    expect(a).toBeCloseTo(0, 5);
    expect(b).toBeCloseTo(-1, 5);
    expect(c).toBeCloseTo(1, 5);
    expect(d).toBeCloseTo(0, 5);
  });

  test("反向缩放：矩阵除以负 scale 才能把变形抵消", () => {
    const matrix = nodeCounterTransformMatrix(node({ scaleX: -1, scaleY: 1 }));
    const [a, b, c, d] = matrix.slice(7, -1).split(" ").map(Number);
    // desiredScale = sqrt(|-1| * |1|) = 1；a = cos*1/(-1) = -1；c = sin*1/(-1) = 0
    expect(a).toBeCloseTo(-1, 5);
    expect(b).toBeCloseTo(0, 5);
    expect(c).toBeCloseTo(0, 5);
    expect(d).toBeCloseTo(1, 5);
  });

  test("scale 为 0 时按 1 处理（不产出 Infinity/NaN 矩阵）", () => {
    const matrix = nodeCounterTransformMatrix(node({ scaleX: 0, scaleY: 0, rotation: 45 }));
    const values = matrix.slice(7, -1).split(" ").map(Number);
    for (const value of values) {
      expect(Number.isFinite(value), matrix).toBe(true);
    }
  });

  test("preserveScale=false 时目标缩放为 1（不引入几何平均）", () => {
    const matrix = nodeCounterTransformMatrix(node({ scaleX: 2, scaleY: 8 }), false);
    const [a, b, c, d] = matrix.slice(7, -1).split(" ").map(Number);
    // desiredScale=1 ⇒ a = 1/2、d = 1/8
    expect(a).toBeCloseTo(0.5, 5);
    expect(d).toBeCloseTo(0.125, 5);
  });
});

// 上方 4 处按位置解构矩阵，安全性完全依赖一个**未写进任何地方**的契约：
// `matrix(${a} ${b} ${c} ${d} 0 0)` 里的分隔空格是模板字面量，而每个插值都来自
// formatSvgNumber —— 它对任何输入都返回非空、不含空格的十进制串。
// **这不是 E 文件那种形态**：那边是数据行按列宽左对齐填充，空单元格是一整串空格，
// 解析器若用 `split(/\s+/).filter(Boolean)` 就会把它整格丢掉、令其后每格左移一列
// （src/encoding/rdf-id-export.test.ts 记录了实测后果：dms_def_node 的 rdf_id
// 被读成 basevoltage 的 id）。矩阵串没有「空单元格」这个概念 —— 每个槽位都必有一个值。
//
// 契约一旦被破坏，后果与那边同形且更隐蔽：`filter(Boolean)` 会塌掉空槽静默左移，
// 而裸 `split(" ")` 留下 `""`、被 `Number("")` 折成 **0 而非 NaN** ——
// 若被破坏的位置恰好期望 0，后续列照样会静默错位而不报错。
//
// ⚠️ 上方 4 处断言**盖不住**这一类：实测把 formatSvgNumber 改成「零值返回空串」后，
// `90° 旋转产生交换项` 仍是绿的 —— 该用例期望 a≈0、d≈0，而 `Number("")` 正是 0，
// 空槽被期望值吸收，看不出任何异常（与 AGENTS.md「断言值等于兜底值」同一形态）。
// 故下面把它钉成可执行断言，而不是留作注释。
const MATRIX_TOKEN_COUNT = 6;
/** 与上方 4 处完全同口径的切分：裸 split(" ")，不 filter。 */
const matrixTokens = (matrix: string): string[] => matrix.slice(7, -1).split(" ");
/** 空槽位（切分出 ""）的下标 —— E 文件那种「空单元格塌格」的残留形态。 */
const blankMatrixSlots = (matrix: string): number[] =>
  matrixTokens(matrix).flatMap((token, index) => (token === "" ? [index] : []));

describe("矩阵串切分不变量（上方 4 处按位置解构的安全依据）", () => {
  test("检测逻辑自测：连续空格必须被抓住，合法形态不得误报", () => {
    // 变异形态①：模板里多打一个空格 ⇒ 第 1 槽变空
    expect(blankMatrixSlots("matrix(1  2 3 4 0 0)")).toEqual([1]);
    // 变异形态②：formatSvgNumber 返回空串（有人把零值写成 ""）
    expect(blankMatrixSlots("matrix( 1 2 3 4 0 0)")).toEqual([0]);
    // 变异形态③：尾部多空格（末两槽塌进一个）
    expect(blankMatrixSlots("matrix(1 2 3 4 0  0)")).toEqual([5]);
    // 合法形态不得误报：负数、负零归零、小数都要放行
    expect(blankMatrixSlots("matrix(1 -1 0 0.125 0 0)")).toEqual([]);
    expect(blankMatrixSlots("matrix(0.5 0 0 1 0 0)")).toEqual([]);
    // 只看 matrix 前缀的串不产生误报
    expect(matrixTokens("matrix(0 0 1 0 0 0)")).toHaveLength(MATRIX_TOKEN_COUNT);
  });

  test("生产矩阵串恒为 6 个非空 token ⇒ 按位置解构不会位移", () => {
    // 覆盖负缩放（会产生负值）、零缩放（走 `|| 1` 兜底）、非有限与非数值形态
    const scales = [1, -1, 0, 0.5, 2, 8, -0.001, 1e-7, NaN, Infinity, -Infinity];
    const rotations = [0, 45, 90, 180, 270, 360, -90, 359.99];
    let scanned = 0;
    for (const rotation of rotations) {
      for (const scaleX of scales) {
        for (const preserveScale of [true, false]) {
          const matrix = nodeCounterTransformMatrix(
            node({ rotation, scaleX, scaleY: scaleX }),
            preserveScale
          );
          const where = `rotation=${rotation} scaleX=${String(scaleX)} preserveScale=${String(preserveScale)}`;
          // ① 前缀后缀恒定 —— slice(7, -1) 的边界假设
          expect(matrix.startsWith("matrix("), where).toBe(true);
          expect(matrix.endsWith(")"), where).toBe(true);
          // ② 槽位数恒定：不多不少，否则解构 [a,b,c,d] 会整体错位
          expect(matrixTokens(matrix), where).toHaveLength(MATRIX_TOKEN_COUNT);
          // ③ 无空槽位 ⇒ filter(Boolean) 是恒等操作，不存在塌格左移
          expect(blankMatrixSlots(matrix), where).toEqual([]);
          // ④ 每个槽位都能被 Number 解析（无 "NaN" 混进 SVG 属性）
          expect(matrixTokens(matrix).every((token) => Number.isFinite(Number(token))), where).toBe(true);
          scanned += 1;
        }
      }
    }
    expect(scanned, "扫描样本数不为 0（否则本条是恒绿守卫）").toBeGreaterThan(0);
  });

  test("filter(Boolean) 与裸 split 等价 —— 两者可互换的前提是恒无空槽位", () => {
    // 这条直接钉住「不得把上方 4 处改成 split(' ').filter(Boolean) 的理由」：
    // 一旦生产串出现空槽，filter 会塌掉它并令其后每格左移（E 文件同形的列位移）。
    for (const rotation of [0, 45, 90, 180, 270]) {
      for (const scaleX of [1, -1, 0, 2, 8]) {
        const matrix = nodeCounterTransformMatrix(node({ rotation, scaleX, scaleY: scaleX }));
        expect(matrixTokens(matrix).filter(Boolean), matrix).toEqual(matrixTokens(matrix));
      }
    }
  });
});

// 文本容器：位移 + 同一个反向补偿矩阵，且 style 从 props 里摘出来单独传给 text。
describe("uprightText", () => {
  test("产出 g[transform] 包裹 text，且 transform 以 translate 开头", () => {
    const group = propsOf(uprightText(node(), 12.34, 56.78, { fill: "#111" }, "文字"));
    expect(String(group.transform).startsWith("translate(12.34 56.78)")).toBe(true);
    expect(propsOf(group.children).fill).toBe("#111");
  });

  test("style 不留在 g 上（被摘给 text），其余 props 透传", () => {
    const style: CSSProperties = { userSelect: "none" };
    const group = propsOf(uprightText(node(), 0, 0, { style, fill: "#111" }, "x"));
    expect(group.style).toBeUndefined();
    expect(propsOf(group.children).style).toBe(style);
  });

  test("坐标按 5 位小数格式化（与 export 的 formatSvgNumber 同口径）", () => {
    const group = propsOf(uprightText(node(), 1.234567, 0, {}, "x"));
    expect(String(group.transform)).toContain("1.23457");
  });
});

// 形状内文字：多行按行距展开，对齐九宫格，padding 不得超过半边。
describe("staticShapeText", () => {
  const serialize = (element: unknown): string => JSON.stringify(element);

  test("居中时 x/y 均为 0（偏移交给 transform 与 text-anchor）", () => {
    const markup = serialize(staticShapeText(node(), 80, 40));
    expect(markup).toContain('"x":"0"');
  });

  test("左对齐时 x = -宽/2 + padding，右对齐时 x = +宽/2 - padding", () => {
    const left = serialize(staticShapeText(node({ params: { textAlign: "left", padding: "10" } }), 80, 40));
    expect(left).toContain("-30");
    const right = serialize(staticShapeText(node({ params: { textAlign: "right", padding: "10" } }), 80, 40));
    expect(right).toContain("30");
  });

  test("上下对齐把 y 压到半高内，且受 padding 夹取", () => {
    const top = serialize(staticShapeText(node({ params: { verticalAlign: "top", padding: "8", fontSize: "16" } }), 80, 40));
    // y = -20 + 8 + 16/2 = -4，再减去 (行数-1)*fontSize*0.6
    expect(top).toContain("-4");
    const bottom = serialize(staticShapeText(node({ params: { verticalAlign: "bottom", padding: "8", fontSize: "16" } }), 80, 40));
    expect(bottom).toContain("4");
  });

  test("多行文本按 fontSize*0.6 展开，且行数写进 tspan 的 dy", () => {
    const markup = serialize(staticShapeText(node({ params: { text: "a\nb\nc", fontSize: "20" } }), 80, 40));
    expect(markup).toContain('"dy":0');
    expect(markup).toContain('"dy":24');
    // 三行 ⇒ 整体上移 (3-1)*20*0.6 = 24
    expect(markup).toContain("-24");
  });

  test("空行渲染成空格（不塌成零宽行使行高错乱）", () => {
    const markup = serialize(staticShapeText(node({ params: { text: "a\n\nb" } }), 80, 40));
    expect(markup).toContain('" "');
  });

  test("padding 超过半边时被夹到 min(宽,高)/2 - 2（文字不会跑出图元外）", () => {
    const markup = serialize(staticShapeText(node({ params: { textAlign: "left", padding: "999" } }), 80, 40));
    // min(80,40)/2 - 2 = 18 ⇒ x = -40 + 18 = -22
    expect(markup).toContain("-22");
  });

  test("未知对齐值回落 center / middle", () => {
    const markup = serialize(staticShapeText(node({ params: { textAlign: "???", verticalAlign: "???" } }), 80, 40));
    expect(markup).toContain('"textAnchor":"middle"');
  });

  test("fontSize 走 staticNumericParam 的 min=8 夹取", () => {
    const markup = serialize(staticShapeText(node({ params: { fontSize: "2" } }), 80, 40));
    expect(markup).toContain('"fontSize":8');
  });

  test("miniature 模式固定 12px 且文字截到 2 字", () => {
    const markup = serialize(staticShapeText(node({ params: { text: "1号主变" } }), 80, 40, true));
    expect(markup).toContain('"fontSize":12');
    expect(markup).toContain("1号");
    expect(markup).not.toContain("主变");
  });
});

// 交互手柄：8 个边框控制点 + 半径由 handleSize 决定。
describe("staticHandleDot / staticFrameHandles", () => {
  test("handleSize 缺省 8、最小 3（半径是它的一半）", () => {
    expect(propsOf(staticHandleDot(node(), 0, 0)).r).toBe(4);
    expect(propsOf(staticHandleDot(node({ params: { handleSize: "1" } }), 0, 0)).r).toBe(1.5);
  });

  test("颜色取 handleColor，回落 accentColor，再回落蓝", () => {
    const pick = (params: Record<string, string>) =>
      propsOf(staticHandleDot(node({ params }), 0, 0)).fill;
    expect(pick({ handleColor: "#111", accentColor: "#222" })).toBe("#111");
    expect(pick({ accentColor: "#222" })).toBe("#222");
    expect(pick({})).toBe("#2563eb");
  });

  test("八边框控制点，四角 + 四边中点", () => {
    const frames = JSON.stringify(staticFrameHandles(node(), 80, 40));
    // 四角与四边中点各一个，共 8 个 circle
    for (const marker of ["-40", "-20", "0", "20", "40"]) {
      expect(frames).toContain(marker);
    }
  });
});

// ─── 防御性守卫 ①：assets 键存在性 ────────────────────────────────────────────
//
// 修复前是裸索引 `assets[assetId]`。普通对象字面量的原型链上恒有
// constructor / __proto__ / toString / hasOwnProperty / valueOf，
// 这些键**查得到且为真值** ⇒ 取到的是 Object、Object.prototype 或函数本身，
// 再经 inlineBackendImageRefsInSvgDataUrl 的 String() 原样吐出，
// 画布上会出现 "function Object() { [native code] }" 这样的死链 href。
// Object.hasOwn 只认自有属性 ⇒ 这些键与「查不到」同结果。
describe("assets 键存在性守卫", () => {
  const assets = { "asset-a": "/uploads/pic.svg" };
  const hrefOf = (imageAssetId: unknown) =>
    resolveStateVisualImageHref({ imageAssetId } as unknown as DeviceStateVisual, assets);

  test("原型链成员名与资源不存在同结果（不能吐成 native code 串）", () => {
    // 基准：查不到的资产 id 在没有 inline image 时返回空串
    const missing = hrefOf("asset-missing");
    expect(missing).toBe("");
    for (const key of ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf"]) {
      expect(hrefOf(key), key).toBe(missing);
    }
  });

  test("空串 / undefined / null / 0 / 数字 assetId 不落到原型链成员", () => {
    // 这些形态走 `visual.imageAssetId || visual.backgroundImageAssetId` 的 falsy 分支
    // 或查不到自有键 ⇒ 结果与「没填」一致
    expect(hrefOf("")).toBe("");
    expect(hrefOf(undefined)).toBe("");
    expect(hrefOf(null)).toBe("");
    expect(hrefOf(0)).toBe("");
    // 非零数字会被当成键去查（hasOwn 内部转成 "42"），查不到 ⇒ 空串
    expect(hrefOf(42)).toBe("");
    // 有 inline image 时，上述任一形态都应回落到 inline image 而非原型链成员
    const inline = { imageAssetId: "constructor", image: "/uploads/inline.svg" } as unknown as DeviceStateVisual;
    expect(resolveStateVisualImageHref(inline, assets)).toBe("/uploads/inline.svg");
    const backgroundOnly = {
      imageAssetId: "",
      backgroundImageAssetId: "toString",
      backgroundImage: "/uploads/bg.svg"
    } as unknown as DeviceStateVisual;
    expect(resolveStateVisualImageHref(backgroundOnly, assets)).toBe("/uploads/bg.svg");
  });

  test("回归：合法资产 id 与 inline image 的产出逐字节不变", () => {
    // 裸索引与 hasOwn 对**自有**键完全等价 ⇒ 合法路径不受守卫影响
    expect(resolveStateVisualImageHref({ imageAssetId: "asset-a" } as DeviceStateVisual, assets)).toBe("/uploads/pic.svg");
    expect(resolveStateVisualImageHref({ backgroundImageAssetId: "asset-a" } as DeviceStateVisual, assets)).toBe("/uploads/pic.svg");
    // 资产缺失时仍优先 inline image（既有优先级语义）
    expect(resolveStateVisualImageHref({ imageAssetId: "asset-missing", image: "/uploads/inline.svg" } as DeviceStateVisual, assets))
      .toBe("/uploads/inline.svg");
    expect(resolveStateVisualImageHref({ image: "  /uploads/padded.svg  " } as DeviceStateVisual, assets)).toBe("/uploads/padded.svg");
  });
});

// ─── 防御性守卫 ②：params.text 非字符串 ───────────────────────────────────────
//
// params 来自后端，落盘前不做运行时校验（ModelNode.params 只是**声明**为
// Record<string, string>）。修复前 staticSymbolTextValue 用 `?? fallback`
// 放行数字/布尔/对象/数组，staticSymbolMiniatureTextValue 更只判 undefined ⇒
// 数字会一路走到 staticShapeText 的 text.split 上抛 TypeError，
// 而 null.slice 直接在取值函数里抛。
describe("params.text 非字符串守卫", () => {
  const nonStrings: Array<[string, unknown]> = [
    ["数字", 123],
    ["null", null],
    ["undefined", undefined],
    ["对象", { a: 1 }],
    ["数组", ["a", "b"]],
    ["布尔 false", false],
    ["布尔 true", true]
  ];
  const withText = (value: unknown) => node({ params: { text: value } as never });

  test("staticSymbolTextValue 对非字符串回落 fallback", () => {
    for (const [label, value] of nonStrings) {
      expect(staticSymbolTextValue(withText(value), "图元"), label).toBe("图元");
    }
  });

  test("staticSymbolMiniatureTextValue 对非字符串回落 fallback（原先 null.slice 即抛）", () => {
    for (const [label, value] of nonStrings) {
      expect(staticSymbolMiniatureTextValue(withText(value), "图元"), label).toBe("图元");
    }
  });

  test("staticShapeText 不抛错且标签确定：主标签回落节点名，缩略标签回落图元", () => {
    for (const [label, value] of nonStrings) {
      const target = withText(value);
      expect(() => staticShapeText(target, 80, 40), `${label} 主标签`).not.toThrow();
      expect(JSON.stringify(staticShapeText(target, 80, 40)).includes("文字1"), `${label} 主标签内容`).toBe(true);
      expect(() => staticShapeText(target, 80, 40, true), `${label} 缩略标签`).not.toThrow();
      expect(JSON.stringify(staticShapeText(target, 80, 40, true)).includes("图元"), `${label} 缩略标签内容`).toBe(true);
    }
  });

  test("回归：合法字符串（含空串、多行）的取值与排版逐字节不变", () => {
    expect(staticSymbolTextValue(node({ params: { text: "主变#1" } }), "图元")).toBe("主变#1");
    // 空串是有效值，不退回 —— 若守卫写成 `!text` 会让这条红
    expect(staticSymbolTextValue(node({ params: { text: "" } }), "图元")).toBe("");
    expect(staticSymbolMiniatureTextValue(node({ params: { text: "" } }), "图元")).toBe("");
    expect(staticSymbolMiniatureTextValue(node({ params: { text: "1号主变" } }), "图元")).toBe("1号");
    expect(staticSymbolMiniatureTextValue(node({ params: { text: "ab\ncd" } }), "图元")).toBe("ab");
    // 多行排版：三行 ⇒ (3-1)*20*0.6 = 24 的整体上移，且第 2/3 个 tspan 的 dy=24
    const markup = JSON.stringify(staticShapeText(node({ params: { text: "a\nb\nc", fontSize: "20" } }), 80, 40));
    expect(markup).toContain('"dy":0');
    expect(markup).toContain('"dy":24');
    expect(markup).toContain("-24");
    // 缩略图路径取前 2 字
    expect(JSON.stringify(staticShapeText(node({ params: { text: "1号主变" } }), 80, 40, true)).includes("主变")).toBe(false);
  });
});

describe("params 容器本身的边界", () => {
  test("params 为空对象时两个取值函数都回落 fallback，staticShapeText 走默认排版", () => {
    expect(staticSymbolTextValue(node({ params: {} }), "图元")).toBe("图元");
    expect(staticSymbolMiniatureTextValue(node({ params: {} }), "图元")).toBe("图元");
    const markup = JSON.stringify(staticShapeText(node({ params: {} }), 80, 40));
    expect(markup).toContain('"textAnchor":"middle"');
    expect(markup).toContain('"fontSize":16');
    expect(markup).toContain("文字1");
  });

  test("params 整个缺失仍抛 TypeError：本轮守卫只覆盖 text 的类型，不覆盖 params 的存在性", () => {
    // 如实记录既有边界，不假装已修。ModelNode.params 是必填字段，
    // 且 staticShapeText 还有 textAlign / fontColor 等十几处裸读，
    // 单给这两个取值函数加 `?.` 只会制造「已加固」的错觉。
    // 若日后统一给 params 补存在性兜底，本条会红 —— 那是提醒，不是回归。
    const bare = node({ params: undefined as never });
    expect(() => staticSymbolTextValue(bare, "图元")).toThrow(TypeError);
    expect(() => staticSymbolMiniatureTextValue(bare, "图元")).toThrow(TypeError);
    expect(() => staticShapeText(bare, 80, 40)).toThrow(TypeError);
  });
});
