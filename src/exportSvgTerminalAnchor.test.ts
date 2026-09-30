// src/export/svg.ts 的 buildSymbolTerminalAnchorMarkup：导出图元时给每个端子画的隐藏锚点圆。
// 第三方拿导出的 SVG 建图元库，锚点位置 / terminal-index / terminal-id 就是他们接线的依据；
// 画错一个坐标，导出的图元接不上线，而导出流程不报任何错。
// 此前该函数只有间接覆盖（symbolExportSvg 走它、svg.golden 里提到它），本身零直呼断言。
//
// 17 处变异跑过、15 处转红。两处**源码等价**（写不出能证伪它们的用例，代码不动）：
// ① 缺 nodeNumber 时把 `?? ""` 去掉 —— escapeXml 自己就有 `String(value ?? "")` 兜底，结果同样是空串；
// ② 少传 node.kind（外延长度那一个参数）—— 本用例的 kind（ac-breaker）在外延计算里与不传 kind
//    同为 4，观察不到差别；要区分得另找一个外延长度随 kind 变的器件。
import { describe, expect, test } from "vitest";

import { buildSymbolTerminalAnchorMarkup } from "./export/svg";
import type { ModelNode, Terminal } from "./model";

const terminal = (id: string, type: Terminal["type"], x: number, y: number, nodeNumber = ""): Terminal =>
  ({ id, type, label: id, anchor: { x, y }, nodeNumber, direction: "out" }) as unknown as Terminal;

const node = (over: Partial<ModelNode> = {}): ModelNode =>
  ({
    id: "n1",
    kind: "ac-breaker",
    name: "断路器",
    nodeNumber: "N1",
    position: { x: 0, y: 0 },
    size: { width: 100, height: 60 },
    rotation: 0,
    scale: 1,
    params: {},
    terminals: [terminal("t1", "ac", -1, 0, "N1"), terminal("t2", "ac", 1, 0, "N2")],
    ...over
  }) as unknown as ModelNode;

const circles = (markup: string): string[] => markup.match(/<circle[^>]*\/>/g) ?? [];
const attr = (markup: string, name: string): string[] =>
  circles(markup).map((tag) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? "");

describe("buildSymbolTerminalAnchorMarkup：端子锚点", () => {
  test("★ 每个电端子一个隐藏锚点圆（class 固定两个名）", () => {
    const markup = buildSymbolTerminalAnchorMarkup(node());
    expect(circles(markup)).toHaveLength(2);
    for (const tag of circles(markup)) {
      expect(tag).toContain('class="terminal terminal-anchor"');
      expect(tag).toContain('r="4"');
      expect(tag).toContain('display="none"');
    }
  });

  test("★ 坐标由端子锚点 × 节点尺寸算出（局部坐标，不是屏幕坐标）", () => {
    const markup = buildSymbolTerminalAnchorMarkup(node());
    // anchor.x = -1 / +1，size.width = 100 → 局部 x 落在负半 / 正半
    // anchor.x = ∓1 × size.width = 100 → ∓100，再各向外扩 4（端子外延长度）
    expect(attr(markup, "cx")).toEqual(["-104", "104"]);
    // anchor.y = 0，左右向端子不做纵向偏移
    expect(attr(markup, "cy")).toEqual(["0", "0"]);
  });

  test("★ terminal-index 从 1 起，按输出顺序连续", () => {
    expect(attr(buildSymbolTerminalAnchorMarkup(node()), "terminal-index")).toEqual(["1", "2"]);
  });

  test("terminal-id 原样带出（供第三方接线用）", () => {
    expect(attr(buildSymbolTerminalAnchorMarkup(node()), "terminal-id")).toEqual(["t1", "t2"]);
  });

  test("★ 默认带 node-number；options.nodeNumber = false 时不带该属性", () => {
    expect(attr(buildSymbolTerminalAnchorMarkup(node()), "node-number")).toEqual(["N1", "N2"]);
    const without = buildSymbolTerminalAnchorMarkup(node(), { nodeNumber: false });
    expect(without).not.toContain("node-number=");
  });

  test("★ 默认只画电端子（ac / dc），氢能 / 热能端子不画", () => {
    const mixed = node({
      terminals: [terminal("t1", "ac", -1, 0), terminal("t2", "dc", 1, 0), terminal("t3", "h2", 0, 1), terminal("t4", "heat", 0, -1)]
    });
    expect(attr(buildSymbolTerminalAnchorMarkup(mixed), "terminal-id")).toEqual(["t1", "t2"]);
  });

  test("★ terminalScope: \"all\" 时画全部端子（symbolExportSvg 就是这么传的）", () => {
    const mixed = node({
      terminals: [terminal("t1", "ac", -1, 0), terminal("t2", "dc", 1, 0), terminal("t3", "h2", 0, 1)]
    });
    expect(attr(buildSymbolTerminalAnchorMarkup(mixed, { terminalScope: "all" }), "terminal-id")).toEqual(["t1", "t2", "t3"]);
    expect(attr(buildSymbolTerminalAnchorMarkup(mixed, { terminalScope: "all" }), "terminal-index")).toEqual(["1", "2", "3"]);
  });

  test("★ 静态图元不画锚点（它没有端子接线概念）", () => {
    expect(buildSymbolTerminalAnchorMarkup(node({ kind: "static-rect" }))).toBe("");
  });

  test("没有端子时返回空串", () => {
    expect(buildSymbolTerminalAnchorMarkup(node({ terminals: [] }))).toBe("");
  });

  test("★ 端子 id 里的引号被转义（否则属性被截断）", () => {
    const quoted = node({ terminals: [terminal('a" onload="x', "ac", -1, 0)] });
    const markup = buildSymbolTerminalAnchorMarkup(quoted);
    expect(markup).toContain("&quot;");
    expect(markup).not.toContain('onload="x"');
  });

  test("缺失 nodeNumber 时给空串而不是 undefined", () => {
    const withoutNumber = { id: "t1", type: "ac", label: "t1", anchor: { x: -1, y: 0 }, direction: "out" };
    const markup = buildSymbolTerminalAnchorMarkup(node({ terminals: [withoutNumber as unknown as Terminal] }));
    expect(markup).toContain('node-number=""');
    expect(markup).not.toContain("undefined");
  });

  test("★ node-number 里的引号同样被转义", () => {
    const markup = buildSymbolTerminalAnchorMarkup(node({ terminals: [terminal("t1", "ac", -1, 0, 'N" onload="x')] }));
    expect(markup).toContain("&quot;");
    expect(markup).not.toContain('onload="x"');
  });
});
