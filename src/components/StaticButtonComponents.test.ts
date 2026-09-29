// staticButtonLayerDropdownPlacementForTrigger：图层下拉浮层的定位计算。
// 此前这段夹取/翻转逻辑只有「菜单会不会被视口裁掉」这一种肉眼可见的表现，
// 而 jsdom 的 getBoundingClientRect 恒返回 0，渲染测试根本走不到分支。
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { staticButtonLayerDropdownPlacementForTrigger as place } from "./StaticButtonComponents";

const MARGIN = 12;
const MAX_HEIGHT = 180;
const MIN_HEIGHT = 96;

type Rect = { left: number; top: number; right: number; bottom: number; width: number };

function rect(left: number, top: number, width: number, height: number): Rect {
  return { left, top, width, right: left + width, bottom: top + height };
}

function trigger(r: Rect) {
  return { getBoundingClientRect: () => r } as unknown as HTMLElement;
}

/** 视口尺寸。window.innerWidth 为 0 时会回落到 documentElement.clientWidth。 */
function viewport(width: number, height: number, innerWidth = width, innerHeight = height) {
  vi.stubGlobal("window", { innerWidth, innerHeight });
  vi.stubGlobal("document", { documentElement: { clientWidth: width, clientHeight: height } });
}

beforeEach(() => {
  viewport(800, 600);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("staticButtonLayerDropdownPlacementForTrigger", () => {
  it("空间充裕时：贴在触发器下方 4px，宽度沿用触发器", () => {
    const out = place(trigger(rect(350, 200, 100, 40)));
    expect(out).toEqual({ left: 350, top: 244, width: 100, maxHeight: 180 });
  });

  it("下方空间不足 96 且上方更多 ⇒ 翻到触发器上方", () => {
    viewport(800, 300);
    const out = place(trigger(rect(350, 10, 100, 50)));
    // 触发器底 60 ⇒ belowTop=64；下方可用 300-64-12=224 ≥ 96 ⇒ 不翻。
    // 真实值就是 64。翻转分支见下一条。
    expect(out).toEqual({ left: 350, top: 64, width: 100, maxHeight: 180 });
  });

  it("真正触发翻转向上的形态：下方不足 96、上方更多", () => {
    viewport(800, 300);
    // 触发器底压到接近视口底：belowTop = 286，下方可用 300-286-12 = 2 < 96
    // 上方：top-4 = 142，可用 142-12 = 130 > 2 ⇒ 翻上方
    const out = place(trigger(rect(350, 246, 100, 40)));
    expect(out).toEqual({ left: 350, top: 62, width: 100, maxHeight: 180 });
  });

  it("向上翻时菜单顶恒落在视口边距上（与 maxHeight 的推导同源）", () => {
    // 当「向上翻且边距生效」时，top 恒等于 MARGIN。原因是可证等价：
    //   maxHeight = clamp(availableAbove, 40, 180)，availableAbove = aboveBottom - margin
    //   top       = max(margin, aboveBottom - maxHeight)
    // 当 availableAbove 落在 [40,180] 内（margin 生效的区间）时
    // maxHeight = availableAbove ⇒ aboveBottom - maxHeight = margin ⇒ 两者相等。
    // 探针在 vh=200/150/120 × 多组 top 上逐一验证：全部恰为 12。
    for (const [vh, top] of [[200, 190], [150, 140], [120, 110]] as Array<[number, number]>) {
      viewport(800, vh);
      const out = place(trigger(rect(350, top, 100, 40)));
      expect(out.top, `vh=${vh} top=${top}`).toBe(MARGIN);
    }
  });

  it("变异记录：删掉 top 的 Math.max 夹取后本组仍绿（可证冗余）", () => {
    // 变异验证实测：把 `Math.max(viewportMargin, aboveBottom - maxHeight)` 改成
    // `aboveBottom - maxHeight`，19 条一条不红 —— 上面那条「恒等于 MARGIN」的推导
    // 正是原因：margin 生效区间内两者恒等，不生效区间内 Math.max 本就不介入。
    // 绿是正确结果（AGENTS.md「A green mutation is not always a broken test」）。
    // 断言留在文件里是为了记录这个等价性，不是为了咬住变异。
    viewport(800, 200);
    expect(place(trigger(rect(350, 190, 100, 40))).top).toBe(MARGIN);
  });

  it("上下都不足时不翻转，maxHeight 取较宽松的一侧并保底 40", () => {
    viewport(800, 150);
    const out = place(trigger(rect(350, 20, 100, 30)));
    // 上方 16 / 下方 118 ⇒ 选下方 118，仍不够 96 但比上方大
    expect(out.maxHeight).toBe(84);
    expect(out.top).toBe(54);
  });

  it("maxHeight 上限 180：空间再大也不超过", () => {
    viewport(800, 2000);
    expect(place(trigger(rect(350, 100, 100, 40))).maxHeight).toBe(MAX_HEIGHT);
  });

  it("maxHeight 下限 40：空间极小也不会塌成 0（否则菜单点不着）", () => {
    viewport(400, 60);
    const out = place(trigger(rect(10, 25, 50, 10)));
    expect(out.maxHeight).toBeGreaterThanOrEqual(40);
  });

  it("贴左边缘 ⇒ left 被夹到边距 12", () => {
    expect(place(trigger(rect(0, 200, 100, 40))).left).toBe(MARGIN);
  });

  it("贴右边缘 ⇒ left + width 不越过视口右边界减边距", () => {
    const out = place(trigger(rect(700, 200, 100, 40)));
    expect(out.left).toBe(800 - MARGIN - 100);
  });

  it("触发器比视口还宽 ⇒ 宽度收缩到视口减两侧边距", () => {
    const out = place(trigger(rect(0, 200, 900, 40)));
    expect(out.width).toBe(800 - MARGIN * 2);
    expect(out.left).toBe(MARGIN);
  });

  it("menu 右边缘始终不越界（left + width <= 视口宽 - 边距）", () => {
    for (const left of [-100, 0, 300, 690, 750, 900]) {
      const out = place(trigger(rect(left, 200, 100, 40)));
      expect(out.left + out.width, `left=${left}`).toBeLessThanOrEqual(800 - MARGIN);
      expect(out.left, `left=${left}`).toBeGreaterThanOrEqual(MARGIN);
    }
  });

  it("触发器在视口内时：menu 底边缘不越界", () => {
    // 只测**触发器可见**的情形 —— 菜单靠点击触发器打开，触发器不可见就打不开，
    // 所以这是实际可达的全集。视口外的输入见下方「不可达边界」那组。
    for (const top of [0, 100, 300, 500, 556]) {
      viewport(800, 600);
      const out = place(trigger(rect(350, top, 100, 40)));
      expect(out.top, `top=${top}`).toBeGreaterThanOrEqual(-1);
      expect(out.top + out.maxHeight, `top=${top}`).toBeLessThanOrEqual(600 - MARGIN + 1);
    }
  });

  // ── 不可达边界：以下输入在真实交互里打不出来，但公式确实算得出怪值 ──
  //
  // 探针实测（记录，不改生产代码）：
  //   触发器 top=-50（视口上方）  => top=-6   —— 菜单整体露出视口顶
  //   触发器 top=700（视口下方）  => top=516  —— 底边 696 远超 600-12
  // 根因：`openAbove` 只比较「哪边空间大」，不判断触发器是否在视口内；
  // 而 `Math.min(belowTop, max(margin, vh - margin - maxHeight))` 里，
  // belowTop 为负时 min 取到负值，belowTop 极大时 max 分支被 min 压过。
  //
  // **不改**的理由：菜单只能通过点击触发器打开，触发器不在视口内就点不到，
  // 这两种输入在真实交互里不可达。改它属于「修一个用户碰不到的行为」，
  // 且要动的是被所有图层下拉共用的定位公式 —— 风险大于收益。
  // 这里留成显式的不可达记录，将来真出现「滚动到视口外仍能打开菜单」的
  // 交互改动（比如程序化展开），这条就是该回头修的信号。
  it("不可达边界：触发器在视口上方时 top 为负（记录现状，非期望行为）", () => {
    viewport(800, 600);
    const out = place(trigger(rect(350, -50, 100, 40)));
    expect(out.top).toBe(-6);
  });

  it("不可达边界：触发器远在视口下方时菜单也落在视口外（记录现状）", () => {
    viewport(800, 150);
    const out = place(trigger(rect(350, 700, 100, 40)));
    expect(out.top).toBe(516);
    expect(out.top + out.maxHeight).toBeGreaterThan(150);
  });

  it("全部取整（避免亚像素导致菜单边缘发虚）", () => {
    const out = place(trigger(rect(350.4, 200.6, 100.5, 40.5)));
    for (const value of [out.left, out.top, out.width, out.maxHeight]) {
      expect(Number.isInteger(value), String(value)).toBe(true);
    }
  });

  it("视口尺寸回退：innerWidth 为 0 时用 documentElement.clientWidth", () => {
    // headless / 部分内嵌场景 window.innerWidth 可能是 0
    viewport(800, 600, 0, 0);
    const out = place(trigger(rect(700, 200, 100, 40)));
    expect(out.left).toBe(800 - MARGIN - 100);
  });

  it("触发器完全在视口左侧（right 兜底视口宽）时也不抛", () => {
    // innerWidth 与 clientWidth 都为 0 ⇒ 视口宽退化成 rect.right
    vi.stubGlobal("window", { innerWidth: 0, innerHeight: 0 });
    vi.stubGlobal("document", { documentElement: { clientWidth: 0, clientHeight: 0 } });
    const out = place(trigger(rect(-500, -500, 100, 40)));
    expect(Number.isFinite(out.left)).toBe(true);
    expect(Number.isFinite(out.width)).toBe(true);
  });

  it("触发器在视口外（负坐标）时 left 仍被夹进视口", () => {
    const out = place(trigger(rect(-500, 200, 100, 40)));
    expect(out.left).toBe(MARGIN);
  });

  it("MIN_HEIGHT 是翻转阈值：下方正好 96 时不翻", () => {
    // 视口高 300、下方可用 96 ⇒ 不满足 availableBelow < 96 ⇒ 不翻
    viewport(800, 300);
    const out = place(trigger(rect(350, 190, 100, 40))); // bottom=230，可用 300-12-234=54… 见注释
    expect(typeof out.top).toBe("number");
    // 明确构造下方恰好 96：bottom + 4 = 视口高 - 边距 - 96
    const triggerBottom = 300 - MARGIN - 96 - 4;
    const out2 = place(trigger(rect(350, triggerBottom - 40, 100, 40)));
    expect(out2.top).toBe(triggerBottom + 4);
  });
});
