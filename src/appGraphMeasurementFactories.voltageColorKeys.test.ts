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
