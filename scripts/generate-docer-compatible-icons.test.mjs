import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import {
  cleanReusableSvgInnerContent,
  compactDocerHas,
  compactDocerLabel,
  formatSvgNumber,
  gCircle,
  gLine,
  gPath,
  gRect,
  gText,
  parseSvgViewBox,
  renderSvg,
  wrapReusableSvg,
} from "./generate-docer-compatible-icons.mjs";

describe("generate-docer-compatible-icons 纯函数", () => {
  test("按图标条目长度选择紧凑标签，并支持大小写不敏感关键词匹配", () => {
    expect(compactDocerLabel(["wind", "风力发电机", "wind", "turbine", "风机"])).toBe("风机");
    expect(compactDocerLabel(["bus", "母线"])).toBe("母线");
    expect(compactDocerLabel(["bus", "母线"])).toHaveLength(2);
    expect(compactDocerHas(["solar", "PV panel"], "pv")).toBe(true);
    expect(compactDocerHas(["solar", "PV panel"], "WIND")).toBe(false);
  });

  test("组装基础 SVG 图元时保留坐标和属性", () => {
    expect(gPath("M0 0h1")).toContain('<path d="M0 0h1"');
    expect(gLine(1, 2, 3, 4)).toContain('<path d="M1 2L3 4"');
    expect(gRect(4, 5, 6, 7, 2)).toContain('x="4" y="5" width="6" height="7" rx="2"');
    expect(gCircle(8, 9, 3)).toContain('cx="8" cy="9" r="3"');
    expect(gText("A&B", 10, 11, 12)).toContain(">A&amp;B</text>");
  });

  test("解析有效 viewBox，缺失或非法尺寸时回退到宽高", () => {
    expect(parseSvgViewBox('viewBox="1, 2, 80, 40"')).toEqual({
      x: 1,
      y: 2,
      width: 80,
      height: 40,
    });
    expect(parseSvgViewBox('width="120" height="32"')).toEqual({
      x: 0,
      y: 0,
      width: 120,
      height: 32,
    });
    expect(parseSvgViewBox('viewBox="0 0 0 10" width="90" height="0"')).toEqual({
      x: 0,
      y: 0,
      width: 90,
      height: 64,
    });
    expect(parseSvgViewBox("width=\"invalid\" height=\"invalid\"")).toEqual({
      x: 0,
      y: 0,
      width: 64,
      height: 64,
    });
  });

  test("格式化 SVG 数字时按四位小数舍入并去除多余零", () => {
    expect(formatSvgNumber(1.23456)).toBe("1.2346");
    expect(formatSvgNumber(2)).toBe("2");
    expect(formatSvgNumber(-0.00004)).toBe("0");
  });

  test("清理复用 SVG 的无障碍元数据和固定颜色", () => {
    const cleaned = cleanReusableSvgInnerContent(`
      <title>remove</title>
      <desc>remove</desc>
      <path color="#123" aria-labelledby="title" role="img" fill="#abc" stroke="#def" d="M0 0" />
      <path fill="none" stroke="currentColor" />
      <path fill="transparent" stroke="transparent" />
    `);

    expect(cleaned).not.toContain("<title");
    expect(cleaned).not.toContain("<desc");
    expect(cleaned).not.toContain("aria-labelledby");
    expect(cleaned).not.toContain("role=");
    expect(cleaned).toContain('fill="currentColor"');
    expect(cleaned).toContain('stroke="currentColor"');
    expect(cleaned).toContain('fill="none"');
    expect(cleaned).toContain('fill="transparent"');
  });

  test("渲染普通图标并转义标题、描述和正文", () => {
    const svg = renderSvg(
      { id: "demo", name: "A&B", color: "#123456", tags: ["x", "y"], body: "  <path d=\"M0 0\" />  " },
      { id: "category", label: "分类", description: "" },
    );

    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('viewBox="0 0 64 64"');
    expect(svg).toContain("<title id=\"demo-title\">A&amp;B</title>");
    expect(svg).toContain("分类 - x, y");
    expect(svg).toContain('<path d="M0 0" />');
  });

  test("复用 SVG 时按尺寸居中缩放、清理内容并生成稳定输出", () => {
    const source = '<svg viewBox="10 20 100 50"><title>old</title><path fill="#abc" d="M0 0" /></svg>';
    const icon = { id: "demo", name: "图标 &", color: "#123456" };
    const category = { id: "category", label: "分类" };

    const first = wrapReusableSvg(source, icon, category, "Source <x>");
    const second = wrapReusableSvg(source, icon, category, "Source <x>");

    expect(first).toBe(second);
    expect(first).toContain('transform="translate(3.2 10.4) scale(0.48)"');
    expect(first).toContain("<title id=\"demo-title\">图标 &amp;</title>");
    expect(first).toContain("分类 - 复用 Source &lt;x&gt;");
    expect(first).not.toContain("<title>old</title>");
    expect(first).toContain('fill="currentColor"');
    expect(first).toContain('M46 46h14v14H46z');
  });

  test("源 SVG 缺少根元素时拒绝复用", () => {
    expect(() => wrapReusableSvg("<path />", { id: "demo", name: "图标", color: "#000" }, { id: "category", label: "分类" }, "source"))
      .toThrow("Invalid reusable SVG for category/demo");
  });

  // ---- L1180：`item.length > 4 ? String(item[item.length - 1]) : String(item[1] || "").slice(0, 2)`
  //
  // 既有用例只喂了 item[1] 为真值的输入（`["bus","母线"]`），`|| ""` 的右臂从未被求值。
  // 夹具的关键（§6.18b）：兜底值就是 `""`，所以 `""` 与 `undefined` 都不能区分
  // `||` 和 `??`（两臂同产 `""`）。必须喂「falsy 且非 nullish 且 ≠ ""」的值 ——
  // 这里取 `0` / `false` / `NaN`。
  //
  // 三种 `||` 变异各自被哪条断言咬住（变异表见文件末尾注释）：
  //   `||` -> `??`          ：0 -> "0"，false -> "fa"，NaN -> "Na"，全部与 "" 不同
  //   `|| ""` -> `|| "XX"`  ：0 / NaN -> "XX"
  //   `> 4` -> `> 3`        ：仅长度恰好为 4 的条目受影响（故专门断 4 与 5 这对边界）
  test("紧凑标签在条目不足五项时把 falsy 的第二项归一化为空串", () => {
    // 三档 falsy-but-not-nullish：与 `||` 右臂同产 ""，与 `??` 左臂各自产出不同字符串。
    expect(compactDocerLabel(["bus", 0])).toBe("");
    expect(compactDocerLabel(["bus", false])).toBe("");
    expect(compactDocerLabel(["bus", NaN])).toBe("");

    // 对照档：第二项为真值时必须走左臂，且仍只取前两字 ——
    // 若没有这条，上面三条可能因为「右臂恒为 ""」而恒绿。
    expect(compactDocerLabel(["bus", "母线设备"])).toBe("母线");
    expect(compactDocerLabel(["bus", "母线"])).toBe("母线");
  });

  test("紧凑标签按条目长度取末项或次项，并区分四与五项的边界", () => {
    // 长度恰好 4：走次项臂。`> 4` 被改成 `> 3` 时这里会变成 "d" 而不是 "b"。
    expect(compactDocerLabel(["a", "b", "c", "d"])).toBe("b");
    // 长度恰好 5：走末项臂。两侧断言合起来才锁住 "> 4" 这个严格不等式。
    expect(compactDocerLabel(["a", "b", "c", "d", "e"])).toBe("e");

    // 非 ASCII 末项：确认末项臂没有走 slice(0, 2) 截断（else 臂才截断）。
    expect(compactDocerLabel(["a", "b", "c", "d", "风机"])).toBe("风机");
  });

  // ---- L2612：`Number.isFinite(width) && width > 0 ? width : 64`
  //
  // 这个守卫是两项合取，两个析取项各有独立的「逃逸输入」，缺一不可：
  //
  //   析取项 `Number.isFinite(width)`：只有 **Infinity** 能咬住它。
  //     `Number.isFinite(Infinity)` 与 `Number.isFinite(NaN)` 同为 false，
  //     但把守卫改成 `!Number.isNaN(width) && width > 0` 时 NaN 仍被挡住
  //     （isNaN(NaN)=true -> 取 64），**只有 Infinity 会变成 Infinity**。
  //     宽度正则只收 `[0-9.]`，所以 Infinity 只能靠 400 位数字构造。
  //
  //   析取项 `width > 0`：只有 **0** 能咬住它。
  //     改成 `width >= 0` 后 0 不再回退；NaN 与 Infinity 在两种写法下都回退，
  //     所以只断 NaN/Infinity 的话这条变异恒绿。
  //
  // 另外每条断言都带「另一轴对照」：宽度非法时高度必须保持原值，
  // 证明坏掉的是 width 那一路而不是两个字段一起塌成 64。
  test("viewBox 缺失时按宽高回退：零宽与非有限宽都退回 64 且互不污染", () => {
    const HUGE = "9".repeat(400); // Number(...) === Infinity

    // 析取项一 + 析取项二（真值侧）：有限且为正 -> 原样透传。
    expect(parseSvgViewBox('width="40" height="50"')).toEqual({ x: 0, y: 0, width: 40, height: 50 });

    // 析取项二（假值侧）：有限但恰好为 0 -> 回退 64；高度另一轴保持 50。
    expect(parseSvgViewBox('width="0" height="50"')).toEqual({ x: 0, y: 0, width: 64, height: 50 });
    // 边界值 0.0 与 0 同档，且与「恰好等于兜底值 64」无关，故断言有鉴别力。
    expect(parseSvgViewBox('width="0.0" height="50"')).toEqual({ x: 0, y: 0, width: 64, height: 50 });

    // 析取项一（假值侧）之 NaN：Number(".") === NaN -> 回退 64。
    expect(parseSvgViewBox('width="." height="50"')).toEqual({ x: 0, y: 0, width: 64, height: 50 });

    // 析取项一（假值侧）之 Infinity：与 NaN 分开断言 ——
    // 把守卫换成 !Number.isNaN(width) 时只有这条会红（期望 64，实得 Infinity）。
    expect(parseSvgViewBox(`width="${HUGE}" height="50"`)).toEqual({ x: 0, y: 0, width: 64, height: 50 });

    // 反向对照：宽度合法、高度非法，确认高度臂独立回退而不牵连宽度。
    expect(parseSvgViewBox('width="40" height="0"')).toEqual({ x: 0, y: 0, width: 40, height: 64 });
  });

  // ---- L1210 / L1233：`const id = String(item[0] || "");`
  //
  // 这两行分属 compactDocerIdentityMark 与 compactDocerSymbol，**都没有被导出**
  // （见文件末尾 export 名单），且 `item[0]` 恒为真值：全部 5 处调用点传入的
  // 都是硬编码 id 字面量，或 `` `${category.id}/${icon.id}/reused` `` 这类模板串
  // （即使 category.id 与 icon.id 同为空串，结果也是非空的 "//reused"）。
  // 因此 `|| ""` 的右臂在运行时**没有任何可达路径** —— 喂不出 falsy 的 item[0]。
  //
  // 触达它的代价：要么把这两个函数加进 export（改公开 API），要么写一条静态源码守卫。
  // 按 AGENTS.md「行为断言看不到契约时退化为静态守卫」这条，本文件选后者，
  // 并且给检测逻辑本身配了自测（第 66 条 lane 的做法），以免它变成恒绿断言。
  //
  // 变异：任一行的 `||` 改成 `??`，本守卫即 RED。
  const COMPACT_ID_GUARD_LINE = '  const id = String(item[0] || "");';
  const COMPACT_ID_UNGUARDED_RE = /^\s*const id = String\(item\[0\]\s*(?:\|\||\?\?)\s*""\);/;

  function compactIdGuardStatus(source, functionName) {
    const lines = source.split(/\r?\n/);
    const declIndex = lines.findIndex((line) => line.startsWith(`function ${functionName}(`));
    if (declIndex < 0) {
      return "function-missing";
    }
    // 按**行**过滤（而非整文件），否则注入点若与函数定义同文件会被整段跳过。
    for (let i = declIndex + 1; i < lines.length; i += 1) {
      if (lines[i] === COMPACT_ID_GUARD_LINE) {
        return "guarded";
      }
      if (COMPACT_ID_UNGUARDED_RE.test(lines[i])) {
        return "unguarded";
      }
    }
    return "no-id-read";
  }

  test("紧凑 id 读取的源码守卫：检测逻辑先自测（含本次变异的字面量）", () => {
    // 变异 `||` -> `??` 后源码的确切形态，必须被识别成 unguarded，否则守卫恒绿。
    expect(compactIdGuardStatus('function f(item) {\n  const id = String(item[0] ?? "");\n}', "f")).toBe("unguarded");
    // 合法形态不得误报。
    expect(compactIdGuardStatus('function f(item) {\n  const id = String(item[0] || "");\n}', "f")).toBe("guarded");
    // 函数改名/删除时必须响亮失败，而不是静默判定通过。
    expect(compactIdGuardStatus('function f(item) {\n  const id = String(item[0] || "");\n}', "missing")).toBe("function-missing");
    // 函数体里彻底没有这行时也必须暴露，不能当成 guarded。
    expect(compactIdGuardStatus('function f(item) {\n  return 1;\n}', "f")).toBe("no-id-read");
  });

  test("compactDocerIdentityMark 与 compactDocerSymbol 保留 item[0] 的空串兜底", () => {
    const source = readFileSync(new URL("./generate-docer-compatible-icons.mjs", import.meta.url), "utf8");

    expect(compactIdGuardStatus(source, "compactDocerIdentityMark")).toBe("guarded");
    expect(compactIdGuardStatus(source, "compactDocerSymbol")).toBe("guarded");
  });

  test("viewBox 非法时回退到宽高，且缺失属性与非法数值的兜底同为 64", () => {
    // 两个兜底值恰好相同（都是 64），所以必须靠「另一轴取非兜底值」来获得鉴别力：
    // 下面三条里 height/width 都取 48 或 50，若守卫整体塌成 {64,64} 会立刻露馅。
    expect(parseSvgViewBox('viewBox="0 0 0 10" width="48" height="50"')).toEqual({
      x: 0,
      y: 0,
      width: 48,
      height: 50,
    });
    expect(parseSvgViewBox('width="48" height="."')).toEqual({ x: 0, y: 0, width: 48, height: 64 });
    expect(parseSvgViewBox('width="." height="50"')).toEqual({ x: 0, y: 0, width: 64, height: 50 });
    // 属性整体缺失：widthMatch/heightMatch 为 null -> 走 `? :` 的 64 分支。
    expect(parseSvgViewBox("<svg>")).toEqual({ x: 0, y: 0, width: 64, height: 64 });
  });
});
