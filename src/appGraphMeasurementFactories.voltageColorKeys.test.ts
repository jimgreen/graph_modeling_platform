// createCollectCurrentModelVoltageColorKeys / createNearestVoltageColor：
// 收集模型里出现过的电压配色键，以及为缺失键派生一个「未被占用」的颜色。
// 派生逻辑的重点是「不与已用色重复」—— 用例直接断言新色不在已用色集合里。
import { describe, expect, test, vi } from "vitest";

import {
  createCollectCurrentModelVoltageColorKeys,
  createNearestVoltageColor
} from "./appExtracted/appGraphMeasurementFactories";

const node = (id: string, terminals: any[]) => ({ id, terminals });

describe("createCollectCurrentModelVoltageColorKeys", () => {
  test("按 node/terminalIndex 收集非空键并去重", () => {
    const scope = {
      nodes: [],
      voltageColorKeyForTerminal: vi.fn((n: any, t: any, index: number) => (t.v ? `${n.id}:${t.v}:${index}` : ""))
    };
    const nodes = [
      node("n1", [{ v: "220" }, { v: "220" }]),
      node("n2", [{ v: "110" }, {}])
    ];

    const keys = createCollectCurrentModelVoltageColorKeys(scope)(nodes);

    expect([...keys].sort()).toEqual(["n1:220:0", "n1:220:1", "n2:110:0"]);
  });

  test("端子索引按在数组中的位置传入", () => {
    const scope = {
      nodes: [],
      voltageColorKeyForTerminal: vi.fn(() => "k")
    };

    createCollectCurrentModelVoltageColorKeys(scope)([node("n1", [{}, {}])]);

    expect((scope.voltageColorKeyForTerminal.mock.calls as any[]).map((c: any[]) => c[2])).toEqual([0, 1]);
  });

  test("不传 sourceNodes 时用 scope.nodes", () => {
    const nodes = [node("n1", [{ v: "220" }])];
    const scope = { nodes, voltageColorKeyForTerminal: () => "ac:220" };

    expect([...createCollectCurrentModelVoltageColorKeys(scope)()]).toEqual(["ac:220"]);
  });

  test("没有可用键时返回空 Set", () => {
    const scope = { nodes: [], voltageColorKeyForTerminal: () => "" };

    expect(createCollectCurrentModelVoltageColorKeys(scope)([node("n1", [{}])]).size).toBe(0);
  });
});

describe("createNearestVoltageColor", () => {
  const scope = { DEFAULT_COLOR_PALETTE: { voltage: { "ac:0": "#000000" } } };
  const nearest = createNearestVoltageColor(scope);

  test("同类型有可用电压时，派生色不与任何已用色相同", () => {
    const used = { "ac:220": "#ff0000", "ac:110": "#00ff00" };
    const color = nearest("ac:220", used);

    expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(Object.values(used)).not.toContain(color);
  });

  test("目标键本身已存在时也派生出新色而不是原样返回", () => {
    const used = { "ac:220": "#ff0000" };

    expect(nearest("ac:220", used)).not.toBe("#ff0000");
  });

  test("同类型无可用电压 → 退回 <type>:0 的默认色再派生", () => {
    const color = nearest("dc:35", { "ac:220": "#ff0000" });

    expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(color).not.toBe("#ff0000");
  });

  test("默认色也没有 → 退回灰底 #64748b 的派生色", () => {
    const color = nearest("hv:99", {});

    expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(color).not.toBe("#64748b");
  });

  test("电压值非数值的键不参与候选", () => {
    // "ac:abc" 解析不出电压 → 走 fallback 分支
    const color = nearest("ac:abc", { "ac:abc": "#123456" });

    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("已用色把黄金角 12 步全占满时仍能派生出不重复的色", () => {
    // 极端构造：把 12 个黄金角派生色全占掉，函数必须落到明度/饱和度兜底而不是返回重复值
    const used: Record<string, string> = {};
    const probe = nearest("ac:220", used);
    for (let i = 0; i < 12; i += 1) {
      used[`ac:${220 + i}`] = nearest(`ac:${220 + i}`, used);
    }
    const fresh = nearest("ac:500", used);

    expect(Object.values(used)).not.toContain(fresh);
    expect(fresh).toMatch(/^#[0-9a-f]{6}$/);
    expect(probe).toMatch(/^#[0-9a-f]{6}$/);
  });
});

// parseColorToHsl 的 hsl 分支：分量正则 `([0-9.]+)` 会匹配到只含小数点的串，parseFloat → NaN。
// 若不做有限性校验，返回的 `{ h: NaN, ... }` 对象仍 truthy，会绕过 deriveUnusedColor 的
// `if (!base)` 早退，hslToHex 随后产出 `#NaNNaNNaN`（或 `#bfNaN40`）这类垃圾 hex。
// 修复后：畸形输入解析失败 → 返回 null → 调用方走既有的 `!base` 分支原样返回基准色。
describe("createNearestVoltageColor 遇到 hsl() 畸形分量", () => {
  const scope = { DEFAULT_COLOR_PALETTE: { voltage: { "ac:0": "#000000" } } };
  const nearest = createNearestVoltageColor(scope);

  const cases: Array<[string, string]> = [
    // ① 色相分量正则后面没有强制的 `%`，裸 "." 直接可匹配 —— 这条是守卫真正承重的地方。
    ["色相位是裸小数点", "hsl(., 50%, 50%)"],
    ["hsla 别名 + 裸小数点", "hsla(., 50%, 50%)"],
    // ② s/l 分量的正则带强制 `%`，单个 "." 匹配不上（"hsl(0, ., 50%)" 会被正则整体拒绝），
    //    但 `[0-9.]+` 贪婪吃掉多个点后接 `%` 仍然合法 → parseFloat("..") 也是 NaN。
    ["饱和度是多点串", "hsl(0, ..%, 50%)"],
    ["明度是多点串", "hsl(0, 50%, ..%)"],
    // ③ 正则本就拒绝的输入：锁对外契约，但去掉守卫也照样绿，勿拿它们当守卫生效的证据。
    ["明度裸小数点且漏了百分号", "hsl(0, 50%, .)"],
    ["饱和度裸小数点且漏了百分号", "hsl(0, ., 50%)"]
  ];

  for (const [label, color] of cases) {
    test(`${label}：解析失败并原样返回基准色，不产出含 NaN 的 hex`, () => {
      // 形状①：畸形色作为**调色板兜底基准色**，已用色集合里只有正常 hex。
      // 这条形状才真正承重 —— 若把畸形色本身放进 voltageColors，它会经 colorToHex
      // 产出同一个垃圾 hex 占住 usedSet，12 步黄金角 + 明度/饱和度兜底全部撞车，
      // 旧实现最终也会 `return baseColor`，断言就恒绿了（绿得毫无意义）。
      const fallbackScope = { DEFAULT_COLOR_PALETTE: { voltage: { "dc:35": color } } };
      const fromPalette = createNearestVoltageColor(fallbackScope)("dc:35", { "ac:220": "#123456" });

      expect(fromPalette).toBe(color);
      expect(fromPalette).not.toMatch(/NaN/i);

      // 形状②：畸形色作为已有电压色的基准色（真实数据里 voltageColors 的条目就是这种形态）。
      const asCandidate = createNearestVoltageColor({
        DEFAULT_COLOR_PALETTE: { voltage: { "ac:0": "#000000" } }
      })("ac:220", { "ac:220": color });

      expect(asCandidate).toBe(color);
      expect(asCandidate).not.toMatch(/NaN/i);
    });
  }

  test("正常 hsl() 输入仍按黄金角旋转一步，产出与旧实现逐位一致", () => {
    // 基准色解析为 h=210 s=0.6 l=0.5（等价 hex #3380cc，进入占用集合），
    // 黄金角 137.508 旋转一步 → h=347.508 落到 sector≥300 分支。
    // 注意 hslToHex 的 300–360 分支是 `{ r = c; b = x }`（g 留 0，与标准 HSL 转换不同），
    // 这是既有实现的特征值，本任务不改业务语义，只把它钉住。
    const derived = nearest("ac:220", { "ac:220": "hsl(210, 60%, 50%)" });

    expect(derived).toBe("#cc3353");
  });

  test("正常 hsl() 基准色本身进入占用集合：派生色不是基准色的 hex", () => {
    const derived = nearest("ac:220", { "ac:220": "hsl(210, 60%, 50%)" });

    expect(derived).toMatch(/^#[0-9a-f]{6}$/);
    expect(derived).not.toBe("#3380cc");
  });
});
