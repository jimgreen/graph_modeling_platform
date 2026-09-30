// src/stateIconDrawing.tsx 的纯函数部分（DOM 无关的那几项）
//   parseSvgStyleAttribute        SVG style 属性 → React CSSProperties
//   visibleStateIconColor         逐个跳过透明色取第一个可见色
//   stateIconDrawingFrameRect     两套固定 frame 矩形
//   DEFAULT_STATE_ICON_DRAWING_FRAME / DEFAULT_STATE_*  常量与键序
//   isDefaultStatePageId          默认状态页判定
//   customParamId / deviceDefinitionRowId / stateDraftRowId / stateIconDrawingElementId
//
// 这些函数此前测试零直呼。解析与取色判错的后果：导入的 SVG 样式丢一半、
// 或者本该透出的颜色被当成透明而露出兜底色 —— 都**零报错**。
import { describe, expect, test } from "vitest";
import { DEFAULT_SHAPE_STROKE_COLOR } from "./svgUtils";
import type {
  DeviceDefinitionStateDraftRow,
  StateIconDrawingElement,
  StateIconDrawingToImageOptions,
  StateVisualShapeKind
} from "./stateIconDrawing";
import {
  DEFAULT_STATE_ICON_DRAWING_FRAME,
  DEFAULT_STATE_NAME,
  DEFAULT_STATE_PAGE_ID,
  DEFAULT_STATE_VALUE,
  customParamId,
  deviceDefinitionRowId,
  generateStateVisualShapeImage,
  isDefaultStatePageId,
  stateIconDrawingElementMarkup,
  parseSvgStyleAttribute,
  stateDraftRowId,
  stateIconDrawingElementId,
  stateIconDrawingFrameRect,
  visibleStateIconColor
} from "./stateIconDrawing";

describe("parseSvgStyleAttribute：基本形态", () => {
  test("kebab-case → camelCase", () => {
    expect(parseSvgStyleAttribute("fill:red;stroke-width:2")).toEqual({ fill: "red", strokeWidth: "2" });
  });

  test("★ 名字与值两侧空白都被 trim（空格放在冒号前后都行）", () => {
    expect(parseSvgStyleAttribute("  fill : red ; stroke-width : 2  ")).toEqual({
      fill: "red",
      strokeWidth: "2"
    });
  });

  test("★ 空声明被跳过：空串、连续分号、尾分号", () => {
    expect(parseSvgStyleAttribute("")).toEqual({});
    expect(parseSvgStyleAttribute(";;;"), "只有分号").toEqual({});
    expect(parseSvgStyleAttribute("fill:red;")).toEqual({ fill: "red" });
    expect(parseSvgStyleAttribute("fill:red;;stroke:blue")).toEqual({ fill: "red", stroke: "blue" });
  });

  test("★ 缺名字或缺值都跳过（`if (!name || !propertyValue) continue`）", () => {
    expect(parseSvgStyleAttribute("nocolon"), "没有冒号").toEqual({});
    expect(parseSvgStyleAttribute("novalue:"), "冒号后为空").toEqual({});
    expect(parseSvgStyleAttribute(":red"), "冒号前为空").toEqual({});
    expect(parseSvgStyleAttribute("  :  red  "), "全空白名字").toEqual({});
  });

  test("★ 值只 trim，不做引号剥离 / 大小写 / 颜色归一", () => {
    expect(parseSvgStyleAttribute("fill:  red  ")).toEqual({ fill: "red" });
    expect(parseSvgStyleAttribute("fill:RED")).toEqual({ fill: "RED" });
    expect(parseSvgStyleAttribute("fill:#FFF")).toEqual({ fill: "#FFF" });
    // 函数内部的空格保留
    expect(parseSvgStyleAttribute("fill:rgb( 1 , 2 )")).toEqual({ fill: "rgb( 1 , 2 )" });
  });

  test("重复键后者覆盖前者（对象赋值语义）", () => {
    expect(parseSvgStyleAttribute("fill:red;fill:blue")).toEqual({ fill: "blue" });
  });

  test("★ 值里的**冒号**被完整保留（`split(':')` 后 `join(':')` 还原）", () => {
    // 这是实现里那对 split/join 的存在理由 —— `url(...)` 与 `rgb(...)` 都带冒号。
    expect(parseSvgStyleAttribute("x:a:b:c")).toEqual({ x: "a:b:c" });
    expect(parseSvgStyleAttribute("fill:rgb(1,2,3)")).toEqual({ fill: "rgb(1,2,3)" });
    expect(parseSvgStyleAttribute("background-image:url(https://e.com/a.png?x=1&y=2)")).toEqual({
      backgroundImage: "url(https://e.com/a.png?x=1&y=2)"
    });
  });

  test("★ 值里的**分号**会把声明切断（已知的解析上限）", () => {
    // 探针实测：`background:url(data:image/png;base64,AAA)` → `url(data:image/png`
    // —— `;base64,AAA)` 连同后半段一起丢失。
    // **判定不修**：SVG 的 style 里 `fill:url(#grad)` 之类不含分号；真正会带分号的
    // 是 data URL，而 data URL 用作 `fill` 在 SVG 里本就非法（只对 CSS `background` 有效）。
    // 修它需要引号感知的分号扫描器，而输入是浏览器导出的 SVG —— 浏览器自己也不会
    // 在 SVG style 里产出 data URL。已把「探针实测的截断形态」写在这里备查。
    expect(parseSvgStyleAttribute("background:url(a;b)")).toEqual({ background: "url(a" });
    expect(parseSvgStyleAttribute("background:url(data:image/png;base64,AAA)")).toEqual({
      background: "url(data:image/png"
    });
  });

  test("★ 驼峰转换只认 `-` + **小写字母**", () => {
    // 正则是 `-([a-z])`，所以大写字母不参与。
    const table: Array<[string, string[]]> = [
      ["stroke-width:2", ["strokeWidth"]],
      ["font-size:12", ["fontSize"]],
      ["mix-blend-mode:x", ["mixBlendMode"]],
      ["stroke-linecap:round", ["strokeLinecap"]],
      ["x-y-z:1", ["xYZ"]],
      // 厂商前缀：`-` 后的字母大写化
      ["-webkit-foo:1", ["WebkitFoo"]],
      ["-ms-x:1", ["MsX"]],
      // ★ 大写字母不匹配 → 原样保留
      ["FOO-BAR:1", ["FOO-BAR"]],
      // ★ 部分匹配：`a-B-c` 只转换了第二段
      ["a-B-c:1", ["a-BC"]],
      // ★ 两个连字符 → 只吃掉第一个
      ["--custom:1", ["-Custom"]],
      // ★ 连字符后是大写 → 不动
      ["-A:1", ["-A"]]
    ];
    for (const [input, expectedKeys] of table) {
      expect(Object.keys(parseSvgStyleAttribute(input)), input).toEqual(expectedKeys);
    }
  });

  test("多声明的键序 = 出现顺序（不排序）", () => {
    expect(Object.keys(parseSvgStyleAttribute("b:1;a:2;c:3"))).toEqual(["b", "a", "c"]);
  });

  test("★ 换行**不**是声明分隔符（按 `split(\";\")` 而非 `split(/[;\\n]/)`）", () => {
    // 这条一开始缺失，导致变异 ③（分隔符改成 `[;\n]`）全绿 —— 变异在我没有的
    // 输入上等价，我看不到它。补上换行输入后 ③ 转红，等价性变成可证伪的。
    // 换行的真实后果：`fill:red\nstroke:blue` 被当作**一个**声明，
    // 值变成 `"red\nstroke:blue"`（trim 只去两端）。
    expect(parseSvgStyleAttribute("fill:red\nstroke:blue")).toEqual({ fill: "red\nstroke:blue" });
    // 半角分号 + 换行混合：换行那部分与下一个声明粘在一起
    expect(parseSvgStyleAttribute("a:1;\nb:2")).toEqual({ a: "1", b: "2" });
  });

  test("不改入参（形参是 string，无引用可改）", () => {
    const input = "fill:red;stroke:blue";
    parseSvgStyleAttribute(input);
    expect(input).toBe("fill:red;stroke:blue");
  });

  test("每次返回新对象", () => {
    expect(parseSvgStyleAttribute("fill:red")).not.toBe(parseSvgStyleAttribute("fill:red"));
    expect(parseSvgStyleAttribute("fill:red")).toEqual(parseSvgStyleAttribute("fill:red"));
  });
});

describe("visibleStateIconColor：跳过空 / transparent / none，取第一个可见色", () => {
  const FALLBACK = "#fbbf24";

  test("无候选 → fallback", () => {
    expect(visibleStateIconColor(FALLBACK), "无参数").toBe(FALLBACK);
  });

  test("空 / 纯空白 / null / undefined 一律跳过", () => {
    expect(visibleStateIconColor(FALLBACK, "", null, undefined, "   ", "blue")).toBe("blue");
  });

  test("★ `transparent` 与 `none` 都算透明（大小写不敏感、带空白也认）", () => {
    for (const transparent of ["transparent", "TRANSPARENT", "Transparent", "TrAnSpArEnT", "  transparent  "]) {
      expect(visibleStateIconColor(FALLBACK, transparent, "blue"), JSON.stringify(transparent)).toBe("blue");
    }
    for (const none of ["none", "NONE", "None", "  none  "]) {
      expect(visibleStateIconColor(FALLBACK, none, "blue"), JSON.stringify(none)).toBe("blue");
    }
  });

  test("★ 只认这两个关键字 —— `rgba(0,0,0,0)` 这种全透明色**不算**", () => {
    // 判定是精确字符串比较，不解析颜色。所以全透明 rgba 会被当成可见色返回。
    expect(visibleStateIconColor(FALLBACK, "rgba(0,0,0,0)", "blue")).toBe("rgba(0,0,0,0)");
    // 记这条是因为「透明」的直觉与实现的差距：只有 transparent / none / 空白
    expect(visibleStateIconColor(FALLBACK, "rgba(0,0,0,0)")).toBe("rgba(0,0,0,0)");
  });

  test("全部候选都透明 → fallback", () => {
    expect(visibleStateIconColor(FALLBACK, "transparent", "none", "", "  ")).toBe(FALLBACK);
  });

  test("★ 判定大小写不敏感，但**返回原样大小写**（不返回小写化后的值）", () => {
    expect(visibleStateIconColor(FALLBACK, "ReD", "blue")).toBe("ReD");
    expect(visibleStateIconColor(FALLBACK, "  ReD  ", "blue"), "两侧空白被 trim").toBe("ReD");
  });

  test("fallback 本身不参与 trim / 归一（原样返回）", () => {
    expect(visibleStateIconColor("  FALLBACK  ")).toBe("  FALLBACK  ");
    // 即使 fallback 本身是 transparent 也照返 —— 它是「没有可见色」的最终答案
    expect(visibleStateIconColor("transparent")).toBe("transparent");
  });
});

describe("stateIconDrawingFrameRect：两套固定矩形", () => {
  test("有端子 → 内缩 + 小圆角；无端子 → 满幅 + 大圆角", () => {
    expect(stateIconDrawingFrameRect(true)).toEqual({ x: 30, y: 20, width: 180, height: 120, rx: 8 });
    expect(stateIconDrawingFrameRect(false)).toEqual({ x: 0, y: 0, width: 240, height: 160, rx: 10 });
  });

  test("两次调用返回**不同对象**（调用方可就地改）", () => {
    const a = stateIconDrawingFrameRect(true);
    const b = stateIconDrawingFrameRect(true);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  test("★ 只接受布尔语义：`hasTerminals` 传真值/假值按真值处理，无强转", () => {
    expect(stateIconDrawingFrameRect(1 as never)).toEqual(stateIconDrawingFrameRect(true));
    expect(stateIconDrawingFrameRect(0 as never)).toEqual(stateIconDrawingFrameRect(false));
    expect(stateIconDrawingFrameRect("" as never)).toEqual(stateIconDrawingFrameRect(false));
  });
});

describe("状态页 / frame 常量", () => {
  test("DEFAULT_STATE_* 的字面量", () => {
    expect(DEFAULT_STATE_PAGE_ID).toBe("__default-state__");
    expect(DEFAULT_STATE_VALUE).toBe("0");
    expect(DEFAULT_STATE_NAME).toBe("状态0");
  });

  test("★ `DEFAULT_STATE_ICON_DRAWING_FRAME` 的值与**键序**", () => {
    // 键序被逐字节比对：这份对象会被序列化进存盘 / E 文件，键序变了就是
    // 存量数据的 diff 噪声。
    expect(Object.keys(DEFAULT_STATE_ICON_DRAWING_FRAME)).toEqual([
      "strokeStyle",
      "strokeWidth",
      "strokeColor",
      "fillColor",
      "backgroundImage",
      "backgroundImageAssetId",
      "backgroundImageFit"
    ]);
    expect(DEFAULT_STATE_ICON_DRAWING_FRAME).toEqual({
      strokeStyle: "solid",
      strokeWidth: 0,
      // ★ 默认色是 transparent —— 正是 `visibleStateIconColor` 要跳过的那两个关键字之一
      strokeColor: "transparent",
      fillColor: "transparent",
      backgroundImage: "",
      backgroundImageAssetId: "",
      backgroundImageFit: "cover"
    });
  });
});

describe("isDefaultStatePageId：`!rowId || rowId === DEFAULT_STATE_PAGE_ID`", () => {
  test("默认页的两种写法", () => {
    expect(isDefaultStatePageId(DEFAULT_STATE_PAGE_ID)).toBe(true);
    expect(isDefaultStatePageId("")).toBe(true);
  });

  test("★ falsy 值一律算默认页（`!rowId` 不看类型）", () => {
    for (const value of [undefined, null, 0, false, Number.NaN] as never[]) {
      expect(isDefaultStatePageId(value as never), String(value)).toBe(true);
    }
  });

  test("非空且不等于默认页 → false", () => {
    expect(isDefaultStatePageId("x")).toBe(false);
    // ★ 精确相等，不 trim
    expect(isDefaultStatePageId("__default-state__ "), "带尾空格").toBe(false);
    expect(isDefaultStatePageId(" __default-state__")).toBe(false);
    expect(isDefaultStatePageId("DEFAULT-STATE")).toBe(false);
  });

  test("返回真布尔（非真值）", () => {
    expect(typeof isDefaultStatePageId("")).toBe("boolean");
    expect(typeof isDefaultStatePageId("x")).toBe("boolean");
  });
});

describe("四种 id 生成器：前缀固定 + 互不碰撞", () => {
  const generators: Array<[string, () => string, string]> = [
    ["customParamId", customParamId, "param-"],
    ["deviceDefinitionRowId", deviceDefinitionRowId, "def-"],
    ["stateDraftRowId", stateDraftRowId, "state-"],
    ["stateIconDrawingElementId", stateIconDrawingElementId, "state-icon-element-"]
  ];

  for (const [label, fn, prefix] of generators) {
    test(`${label}：前缀固定`, () => {
      for (let i = 0; i < 20; i += 1) {
        expect(fn().startsWith(prefix), fn()).toBe(true);
      }
    });

    test(`${label}：同一前缀下 200 次不重复`, () => {
      const ids = Array.from({ length: 200 }, () => fn());
      expect(new Set(ids).size, `${label} 出现重复`).toBe(200);
    });

    test(`${label}：后缀长度在 1..36 之间`, () => {
      // 前三者走 `randomId`（UUID 形态，36 字符）；
      // 第四个是 `Math.random().toString(36).slice(2, 9)`，
      // `toString(36)` 恒以 "0." 开头，slice 从索引 2 取 —— 所以后缀**可能短于 7**
      // （`Math.random()` 恰为 0.5 时 toString(36) 是 "0.i"，切出 1 个字符）。
      // 这里只钉住「非空且不超过 36」，不去假设具体长度。
      for (let i = 0; i < 50; i += 1) {
        const suffix = fn().slice(prefix.length);
        expect(suffix.length, `${label} -> ${suffix}`).toBeGreaterThan(0);
        expect(suffix.length, `${label} -> ${suffix}`).toBeLessThanOrEqual(36);
      }
    });
  }

  test("★ 四种前缀互不重叠（`state-` 与 `state-icon-element-` 需要前缀完整匹配）", () => {
    // `stateDraftRowId` 的前缀 `state-` 是 `state-icon-element-` 的**前缀**，
    // 所以不能用 startsWith 来判断归属，得比较完整前缀串。
    const prefixes = generators.map(([, , p]) => p);
    expect(new Set(prefixes).size).toBe(4);
    expect(stateIconDrawingElementId().startsWith("state-icon-element-")).toBe(true);
  });

  test("不同生成器的 id 不会互相误认", () => {
    expect(deviceDefinitionRowId().startsWith("param-")).toBe(false);
    expect(customParamId().startsWith("def-")).toBe(false);
  });
});

// generateStateVisualShapeImage：状态视觉的 16 种预置形状 → data:image/svg+xml URL。
// 纯字符串拼装（不碰 canvas / DOM），此前零断言，是 stateIconDrawing 里最大的一块未覆盖面。
// 判错的后果：状态预览图形状不对、颜色串到别的图形上，或者行里的文字没转义就把 SVG 撑坏 ——
// 都不抛错，只在设备库里那个小图上看得出来。
//
// 34 处变异逐条跑过，31 处转红。剩下 3 处：两处 data URL 前缀 / encodeURIComponent 的锚点在文件里
// 出现两次写不唯一，改用「URL 里不能有裸 < 与 #」这条断言覆盖（# 不编码会被浏览器当片段截断）；
// circle 分支与 default 分支的 r="48" 同一段文本，改一处另一个也变，两条用例各自盯着。
// 过程中补的真缺口：strokeColor 与 color 同时给时的优先级、arc 不能是实心圆、关键几何数值、
// 文字颜色的三级回退。
const SHAPE_KINDS: StateVisualShapeKind[] = ["switch-open", "switch-closed", "valve-open", "valve-closed",
  "line", "polyline", "point", "triangle", "rectangle", "square", "hexagon", "polygon", "circle", "semicircle", "ellipse", "arc", "text"];

describe("generateStateVisualShapeImage：预置形状图", () => {
  const row = (extra: Partial<DeviceDefinitionStateDraftRow> = {}) =>
    ({
      id: "r1",
      value: "0",
      name: "分",
      icon: "",
      image: "",
      imageAssetId: "",
      imageFit: "",
      text: "",
      color: "",
      fillColor: "",
      strokeColor: "",
      textColor: "",
      ...extra
    }) as unknown as DeviceDefinitionStateDraftRow;

  /** 把 data URL 解回 SVG 源码。 */
  const svgOf = (kind: StateVisualShapeKind, draft = row()): string => {
    const url = generateStateVisualShapeImage(kind, draft);
    expect(url.startsWith("data:image/svg+xml;utf8,"), kind).toBe(true);
    return decodeURIComponent(url.slice("data:image/svg+xml;utf8,".length));
  };

  test("★ 统一外壳：240 × 160、viewBox 一致、以 </svg> 收尾", () => {
    for (const kind of SHAPE_KINDS) {
      const svg = svgOf(kind);
      expect(svg, kind).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">');
      expect(svg, kind).toContain('<rect width="240" height="160" fill="none"/>');
      expect(svg.endsWith("</svg>"), kind).toBe(true);
    }
  });

  test("★ 十六种形状两两不同（每个 case 分支都真产出自己的 body）", () => {
    const bodies = SHAPE_KINDS.map((kind) => svgOf(kind));
    expect(new Set(bodies).size, "有形状撞了").toBe(SHAPE_KINDS.length);
  });

  test("开关两态的差别落在那条斜线 / 横线上", () => {
    expect(svgOf("switch-open")).toContain("M 84 72 L 154 38");
    expect(svgOf("switch-closed")).toContain("M 84 80 H 156");
  });

  test("阀门两态：开是竖线加横杠，闭是交叉", () => {
    expect(svgOf("valve-open")).toContain("M 120 34 V 126");
    expect(svgOf("valve-closed")).toContain("M 76 36 L 164 124");
  });

  test("★ text 形状只出文字，坐标与字号固定", () => {
    const svg = svgOf("text", row({ text: "合" }));
    expect(svg).toContain('<text x="120" y="94" text-anchor="middle" dominant-baseline="middle"');
    expect(svg).toContain('font-size="54"');
    expect(svg).toContain(">合</text>");
  });

  test("★ 描边色与 color 同时给时 strokeColor 赢", () => {
    expect(svgOf("circle", row({ strokeColor: "#123456", color: "#654321" }))).toContain('stroke="#123456"');
    expect(svgOf("circle", row({ strokeColor: "#123456", color: "#654321" }))).not.toContain("#654321");
  });

  test("★ 几个形状的关键几何就是图标本身的一部分", () => {
    expect(svgOf("point")).toContain('<circle cx="120" cy="80" r="18"');
    expect(svgOf("circle")).toContain('<circle cx="120" cy="80" r="48"');
    expect(svgOf("arc")).toContain("M 58 112 A 72 72 0 0 1 182 112");
    expect(svgOf("triangle")).toContain("M 120 34 L 190 122 H 50 Z");
    expect(svgOf("line")).toContain("M 42 80 H 198");
  });

  test("★ data URL 是百分号编码过的：里面不能出现裸的 < 与 #", () => {
    // 颜色里的 # 若不编码，浏览器会当成片段分隔符，颜色直接被截断
    const url = generateStateVisualShapeImage("circle", row({ strokeColor: "#123456" }));
    expect(url).not.toContain("<");
    expect(url).not.toContain("#");
    expect(url).toContain("%23");
  });

  test("★ 文字颜色：textColor 优先，没有就跟描边色", () => {
    expect(svgOf("text", row({ strokeColor: "#123456" }))).toContain('font-weight="800" fill="#123456"');
    expect(svgOf("text", row({ strokeColor: "#123456", textColor: "#654321" }))).toContain('fill="#654321"');
    // 描边色透明时文字跟 color
    expect(svgOf("text", row({ strokeColor: "transparent", color: "#654321" }))).toContain('fill="#654321"');
    // textColor 与 color 同时给时 textColor 赢（两者都可见，顺序才有意义）
    expect(svgOf("text", row({ color: "#aaaaaa", textColor: "#654321" }))).toContain('fill="#654321"');
    expect(svgOf("text", row({ color: "#aaaaaa", textColor: "#654321" }))).not.toContain("#aaaaaa");
  });

  test("★ arc 是开口弧，不是实心圆", () => {
    expect(svgOf("arc")).not.toContain("<circle");
  });

  test("★ 未知 kind 落到默认圆（不抛异常、不出空图）", () => {
    const svg = svgOf("nope" as StateVisualShapeKind);
    expect(svg).toContain('<circle cx="120" cy="80" r="48"');
  });

  test("★ 描边色：strokeColor 优先，其次 color，都没有用默认蓝", () => {
    expect(svgOf("circle", row({ strokeColor: "#123456" }))).toContain('stroke="#123456"');
    expect(svgOf("circle", row({ color: "#654321" }))).toContain('stroke="#654321"');
    expect(svgOf("circle", row())).toContain(`stroke="${DEFAULT_SHAPE_STROKE_COLOR}"`);
    // 透明色不算数：透明时继续往后找，再没有才落默认
    expect(svgOf("circle", row({ strokeColor: "transparent", color: "#654321" }))).toContain('stroke="#654321"');
  });

  test("★ 填充色：空 / 只有空白 → transparent，别的按原样转义写入", () => {
    expect(svgOf("rectangle", row())).toContain('fill="transparent"');
    expect(svgOf("rectangle", row({ fillColor: "   " }))).toContain('fill="transparent"');
    expect(svgOf("rectangle", row({ fillColor: " #abcdef " }))).toContain('fill="#abcdef"');
  });

  test("★ 文字回退链：text → icon → name → value → 状态", () => {
    expect(svgOf("text", row({ text: "T", icon: "I", name: "N", value: "V" }))).toContain(">T</text>");
    expect(svgOf("text", row({ text: "", icon: "I", name: "N", value: "V" }))).toContain(">I</text>");
    expect(svgOf("text", row({ text: "", icon: "", name: "N", value: "V" }))).toContain(">N</text>");
    expect(svgOf("text", row({ text: "", icon: "", name: "", value: "V" }))).toContain(">V</text>");
    expect(svgOf("text", row({ text: "", icon: "", name: "", value: "" }))).toContain(">状态</text>");
  });

  test("★ 文字里的 XML 特殊字符被转义（否则 SVG 结构被撑坏）", () => {
    const svg = svgOf("text", row({ text: '<script>&"' }));
    expect(svg).toContain("&lt;script&gt;&amp;&quot;");
    expect(svg).not.toContain("<script>");
  });

  test("颜色值里的引号也被转义（防属性截断）", () => {
    expect(svgOf("circle", row({ strokeColor: '" onload="x' }))).toContain('&quot;');
  });
});

// stateIconDrawingElementMarkup：用户在状态图标编辑器里画的每一个图元 → 一段 <g> 标记。
// 纯字符串拼装（不碰 canvas / DOM），此前零断言。
// 判错的后果：画布上看到的形状和导出的不一致（图元跑位、线型丢失、组选不中）—— 都不抛错。
//
// 20 处变异跑过，19 处转红。一处**源码等价**：`stateIconStrokeDashArray(style, element.strokeWidth)`
// 传未夹的线宽 —— 那个函数内部自己 `Math.max(1, strokeWidth)`，两种写法结果一样。
// 过程中补的真缺口：文字色回落描边色、虚线按至少 1 的线宽算、polyline/text 那两组 data 属性看的是
// kind 而不是「有没有 points / 有没有文字」、以及 rectangle 与 square 在非正方尺寸上才是同一条。
const DRAWING_KINDS: StateVisualShapeKind[] = ["switch-open", "switch-closed", "valve-open", "valve-closed",
  "line", "polyline", "point", "triangle", "rectangle", "square", "hexagon", "polygon", "circle", "semicircle",
  "ellipse", "arc", "text", "imported-svg", "image"];

describe("stateIconDrawingElementMarkup：画出来的图元标记", () => {
  const element = (over: Partial<StateIconDrawingElement> = {}) =>
    ({
      id: "e1",
      kind: "circle",
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      rotation: 0,
      strokeWidth: 2,
      strokeColor: "#123456",
      fillColor: "#abcdef",
      textColor: "",
      text: "",
      ...over
    }) as unknown as StateIconDrawingElement;

  const markupOf = (over: Partial<StateIconDrawingElement> = {}, options?: StateIconDrawingToImageOptions) =>
    stateIconDrawingElementMarkup(element(over), options);

  test("★ 外壳：<g> + translate/rotate，几何以原点为中心", () => {
    expect(markupOf({ x: 10, y: 20, rotation: 30 })).toContain('transform="translate(10 20) rotate(30)"');
    expect(markupOf({})).toMatch(/^<g transform="translate\(0 0\) rotate\(0\)">/);
  });

  const filled = (kind: StateVisualShapeKind) =>
    markupOf({
      kind,
      points: [{ x: -10, y: 0 }, { x: 0, y: -10 }, { x: 10, y: 0 }],
      svgSource: '<path d="M 0 0 L 10 10"/>',
      imageHref: "img.png"
    });

  test("★ 每种 kind 都产出非空 body（不会画出空图元）", () => {
    const empty = '<g transform="translate(0 0) rotate(0)"></g>';
    for (const kind of DRAWING_KINDS) {
      expect(filled(kind), kind).not.toBe(empty);
      expect(filled(kind).length, kind).toBeGreaterThan(empty.length);
    }
  });

  test("★ rectangle 与 square 在标记层是同一个图元（正方只是数据层的尺寸约束）", () => {
    // 用非正方尺寸看：两者都按元素自己的 w / h 画，不做 min(w,h)
    const wide = { width: 40, height: 24 };
    expect(markupOf({ kind: "square", ...wide })).toBe(markupOf({ kind: "rectangle", ...wide }));
  });

  test("★ image 走 resolveImageHref：给了解析函数就用它给的地址", () => {
    const resolved = markupOf({ kind: "image", imageHref: "asset-1" }, { resolveImageHref: () => "data:image/png;base64,AAA" });
    expect(resolved).toContain("data:image/png;base64,AAA");
    expect(resolved).toContain("<clipPath");
    // 没有解析函数时用原始 href
    expect(markupOf({ kind: "image", imageHref: "asset-1" })).toContain("asset-1");
  });

  test("未知 kind 落到默认圆（不抛错、不出空图）", () => {
    expect(markupOf({ kind: "nope" as StateVisualShapeKind })).toContain("<circle");
  });

  test("★ 描边色 / 填充色 / 线宽都从元素上取，并被转义", () => {
    const markup = markupOf({ strokeColor: '" onload="x', fillColor: "#fff", strokeWidth: 3 });
    expect(markup).toContain("&quot;");
    expect(markup).not.toContain('onload="x"');
    expect(markup).toContain('stroke-width="3"');
    expect(markup).toContain('fill="#fff"');
  });

  test("描边色为空时用默认蓝、填充为空时 transparent", () => {
    const markup = markupOf({ strokeColor: "", fillColor: "" });
    expect(markup).toContain(`stroke="${DEFAULT_SHAPE_STROKE_COLOR}"`);
    expect(markup).toContain('fill="transparent"');
  });

  test("负线宽夹到 0，宽高至少按 1 算", () => {
    expect(markupOf({ strokeWidth: -5, kind: "rectangle" })).toContain('stroke-width="0"');
    expect(markupOf({ width: 0, height: 0, kind: "rectangle" })).toContain('width="1"');
  });

  test("★ 线型写进 stroke-dasharray，solid 不写该属性", () => {
    expect(markupOf({ kind: "line", strokeStyle: "dashed", strokeWidth: 4 })).toContain("stroke-dasharray=");
    expect(markupOf({ kind: "line", strokeStyle: "solid" })).not.toContain("stroke-dasharray=");
  });

  test("★ groupId 有值才写 data-state-icon-group-id（组选中的依据）", () => {
    expect(markupOf({ groupId: "g1" })).toContain('data-state-icon-group-id="g1"');
    expect(markupOf({ groupId: "  " })).not.toContain("data-state-icon-group-id");
    expect(markupOf({})).not.toContain("data-state-icon-group-id");
  });

  test("★ terminalIndex 是非负整数才写端子属性", () => {
    expect(markupOf({ terminalIndex: 0 })).toContain('data-terminal-index="0"');
    expect(markupOf({ terminalIndex: 2 })).toContain('data-terminal-index="2"');
    expect(markupOf({ terminalIndex: -1 })).not.toContain("data-terminal-index");
    expect(markupOf({ terminalIndex: 1.5 })).not.toContain("data-terminal-index");
    expect(markupOf({})).not.toContain("data-terminal-index");
  });

  test("★ polyline 才有 data-polyline-* 那组属性（看的是 kind，不是有没有 points）", () => {
    const points = [{ x: -10, y: 0 }, { x: 0, y: -10 }, { x: 10, y: 0 }];
    const polyline = markupOf({ kind: "polyline", points });
    expect(polyline).toContain("data-polyline-points=");
    expect(polyline).toContain('data-start-cap="');
    // 非 polyline 即便带 points 也不写那组属性
    expect(markupOf({ kind: "line", points })).not.toContain("data-polyline-points");
  });

  test("★ text 才有 data-state-icon-* 那组属性，且文字被转义", () => {
    const text = markupOf({ kind: "text", text: '<b>&"' });
    expect(text).toContain('data-state-icon-kind="text"');
    expect(text).toContain("&lt;b&gt;&amp;&quot;");
    expect(text).not.toContain("<b>");
    // 非 text 即便有文字内容也不写那组属性
    expect(markupOf({ kind: "circle", text: "不是文字图元" })).not.toContain("data-state-icon-kind");
  });

  test("★ 文字色：textColor 优先，没有就沿用描边色", () => {
    expect(markupOf({ kind: "text", textColor: "#654321", strokeColor: "#123456" })).toContain('fill="#654321"');
    expect(markupOf({ kind: "text", textColor: "", strokeColor: "#123456" })).toContain('fill="#123456"');
  });

  test("★ 线型按**至少 1** 的线宽算（负线宽不会算出负的虚线）", () => {
    expect(markupOf({ kind: "line", strokeStyle: "dashed", strokeWidth: -5 })).toContain('stroke-dasharray="3 1.8"');
    expect(markupOf({ kind: "line", strokeStyle: "dashed", strokeWidth: 0 })).toContain('stroke-dasharray="3 1.8"');
    expect(markupOf({ kind: "line", strokeStyle: "dotted", strokeWidth: -5 })).toContain('stroke-dasharray="0.2 1.8"');
  });

  test("文字为空时用占位「文字」，字号有下限 8", () => {
    expect(markupOf({ kind: "text", text: "" })).toContain(">文字</text>");
    expect(markupOf({ kind: "text", fontSize: 2 })).toContain('font-size="8"');
  });

  test("★ text 的底框：填充透明时不画框，填了色才画", () => {
    expect(markupOf({ kind: "text", fillColor: "transparent" })).not.toContain("<rect");
    expect(markupOf({ kind: "text", fillColor: "#eeeeee" })).toContain("<rect");
  });
});
