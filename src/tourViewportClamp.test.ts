import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const reactHarness = vi.hoisted(() => {
  let activeRunner: HookRunner | null = null;

  const runner = () => {
    if (!activeRunner) {
      throw new Error("React hook called outside test runner");
    }
    return activeRunner;
  };

  const useState = <T,>(initial: T) => {
    const current = runner();
    const index = current.stateCursor++;
    if (!(index in current.states)) {
      current.states[index] = initial;
    }
    const setState = (next: T | ((previous: T) => T)) => {
      current.states[index] =
        typeof next === "function"
          ? (next as (previous: T) => T)(current.states[index] as T)
          : next;
      current.dirty = true;
    };
    return [current.states[index] as T, setState] as const;
  };

  const useRef = <T,>(initial: T) => {
    const current = runner();
    const index = current.refCursor++;
    if (!(index in current.refs)) {
      current.refs[index] = { current: initial };
    }
    return current.refs[index] as { current: T };
  };

  const useCallback = <T,>(callback: T) => callback;

  const useEffect = (effect: () => (() => void) | undefined, deps: unknown[]) => {
    const current = runner();
    current.pendingEffects[current.effectCursor++] = { effect, deps };
  };

  return {
    useState,
    useRef,
    useCallback,
    useEffect,
    setActiveRunner: (current: HookRunner | null) => {
      activeRunner = current;
    }
  };
});

vi.mock("react", () => reactHarness);

import {
  TOUR_TOOLTIP_VIEWPORT_MARGIN,
  clampTourTooltipOffset,
  isZeroTourTooltipOffset,
  readTourTooltipViewport,
  tourTooltipTransform,
  tourTooltipViewportBounds,
  useTourTooltipViewportClamp
} from "./tourViewportClamp";

type HookEffect = {
  effect: () => (() => void) | undefined;
  deps: unknown[];
  cleanup?: () => void;
};

type HookRunner = {
  states: unknown[];
  refs: unknown[];
  effects: Array<HookEffect | undefined>;
  pendingEffects: Array<HookEffect | undefined>;
  stateCursor: number;
  refCursor: number;
  effectCursor: number;
  dirty: boolean;
  value: ReturnType<typeof useTourTooltipViewportClamp>;
  render: (resetKey: unknown) => void;
  unmount: () => void;
};

function createHookRunner(): HookRunner {
  const current = {
    states: [],
    refs: [],
    effects: [],
    pendingEffects: [],
    stateCursor: 0,
    refCursor: 0,
    effectCursor: 0,
    dirty: false,
    value: undefined as unknown as ReturnType<typeof useTourTooltipViewportClamp>,
    render(resetKey: unknown) {
      current.stateCursor = 0;
      current.refCursor = 0;
      current.effectCursor = 0;
      current.pendingEffects = [];
      reactHarness.setActiveRunner(current);
      current.value = useTourTooltipViewportClamp(resetKey);
      reactHarness.setActiveRunner(null);

      for (const [index, next] of current.pendingEffects.entries()) {
        const previous = current.effects[index];
        const changed =
          !previous ||
          previous.deps.length !== next!.deps.length ||
          next!.deps.some((dependency, dependencyIndex) => dependency !== previous.deps[dependencyIndex]);
        if (changed) {
          previous?.cleanup?.();
          const cleanup = next!.effect();
          current.effects[index] = { ...next!, cleanup };
        }
      }
      current.dirty = false;
    },
    unmount() {
      for (const effect of current.effects) {
        effect?.cleanup?.();
        if (effect) {
          effect.cleanup = undefined;
        }
      }
    }
  } as HookRunner;
  return current;
}

function createFrameHarness() {
  let nextId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  const allCallbacks: FrameRequestCallback[] = [];
  const request = vi.fn((callback: FrameRequestCallback) => {
    const id = ++nextId;
    callbacks.set(id, callback);
    allCallbacks.push(callback);
    return id;
  });
  const cancel = vi.fn((id: number) => {
    callbacks.delete(id);
  });
  return {
    request,
    cancel,
    allCallbacks,
    flush() {
      const next = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!next) {
        throw new Error("no animation frame scheduled");
      }
      callbacks.delete(next[0]);
      next[1](0);
    }
  };
}

function createTooltipElement(rect: TourTooltipMeasureLike) {
  const style = {
    transform: "",
    removeProperty: vi.fn((property: string) => {
      if (property === "transform") {
        style.transform = "";
      }
    })
  };
  return {
    style,
    getBoundingClientRect: vi.fn(() => rect)
  } as unknown as HTMLElement & { style: typeof style };
}

type TourTooltipMeasureLike = { top: number; left: number; width: number; height: number };

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly callback: ResizeObserverCallback;
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

// 视口 1280×800、无缩放；边界 = 12px 安全边距 → {top:12,left:12,right:1268,bottom:788}
const VIEWPORT = { offsetTop: 0, offsetLeft: 0, width: 1280, height: 800 };
const BOUNDS = tourTooltipViewportBounds(VIEWPORT);

describe("tourTooltipViewportBounds", () => {
  test("在视口四周各让出 12px 安全边距", () => {
    expect(BOUNDS).toEqual({ top: 12, left: 12, right: 1268, bottom: 788 });
  });

  test("安全边距常量与 CSS 的 calc(100vh - 24px) 同口径（2 × margin）", () => {
    expect(TOUR_TOOLTIP_VIEWPORT_MARGIN * 2).toBe(24);
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    expect(css).toContain("max-height: calc(100vh - 24px)");
  });

  test("带 offset 的视觉视口（页面被缩放 / 软键盘）会平移边界", () => {
    const bounds = tourTooltipViewportBounds({
      offsetTop: 100,
      offsetLeft: 50,
      width: 400,
      height: 300
    });
    expect(bounds).toEqual({ top: 112, left: 62, right: 438, bottom: 388 });
  });
});

describe("clampTourTooltipOffset", () => {
  const rect = (top: number, left: number, width = 360, height = 200) => ({
    top,
    left,
    width,
    height
  });

  test("完全在界内 → 精确的零位移（不写无意义的 transform）", () => {
    expect(clampTourTooltipOffset(rect(300, 400), BOUNDS)).toEqual({ x: 0, y: 0 });
  });

  test("右侧越界 → 向左推，右边缘刚好贴住边界", () => {
    const offset = clampTourTooltipOffset(rect(300, 1200), BOUNDS);
    expect(offset).toEqual({ x: 1268 - (1200 + 360), y: 0 });
    expect(1200 + 360 + offset.x).toBe(BOUNDS.right);
  });

  test("左侧越界（负 left）→ 向右推，左边缘贴住边界", () => {
    const offset = clampTourTooltipOffset(rect(300, -80), BOUNDS);
    expect(offset).toEqual({ x: 12 - -80, y: 0 });
    expect(-80 + offset.x).toBe(BOUNDS.left);
  });

  test("下方越界 → 向上推，下边缘贴住边界", () => {
    const offset = clampTourTooltipOffset(rect(700, 400), BOUNDS);
    expect(offset).toEqual({ x: 0, y: 788 - (700 + 200) });
    expect(700 + 200 + offset.y).toBe(BOUNDS.bottom);
  });

  test("上方越界（负 top）→ 向下推，上边缘贴住边界", () => {
    const offset = clampTourTooltipOffset(rect(-60, 400), BOUNDS);
    expect(offset).toEqual({ x: 0, y: 12 - -60 });
    expect(-60 + offset.y).toBe(BOUNDS.top);
  });

  test("只夹超出的一侧：贴顶时不会同时被下边界推回去", () => {
    // top=-60 时 rect 的下边缘在界内，夹取结果必须是非负（只往下推）。
    const offset = clampTourTooltipOffset(rect(-60, 400), BOUNDS);
    expect(offset.y).toBeGreaterThan(0);
    expect(offset.x).toBe(0);
  });

  test("盒子比可视区域还宽时不夹取（硬夹只会把气泡推离目标）", () => {
    const wide = { top: 300, left: -200, width: 2000, height: 200 };
    expect(clampTourTooltipOffset(wide, BOUNDS)).toEqual({ x: 0, y: 0 });
  });

  test("盒子比可视区域还高时不夹取", () => {
    const tall = { top: -100, left: 400, width: 360, height: 1200 };
    expect(clampTourTooltipOffset(tall, BOUNDS)).toEqual({ x: 0, y: 0 });
  });

  test("极端：气泡刚好等于可视区域宽度 → 不夹取（maxX === minX）", () => {
    const exact = { top: 300, left: 0, width: BOUNDS.right - BOUNDS.left, height: 200 };
    expect(clampTourTooltipOffset(exact, BOUNDS)).toEqual({ x: 0, y: 0 });
  });

  test("窄窗口（375×667，移动端）下气泡宽度小于可用宽度时仍能压回界内", () => {
    const bounds = tourTooltipViewportBounds({
      offsetTop: 0,
      offsetLeft: 0,
      width: 375,
      height: 667
    });
    // 可用宽度 = 375 - 24 = 351；这里气泡略窄一点，横向仍有余量可夹取。
    const bubble = { top: 600, left: 300, width: 330, height: 180 };
    const offset = clampTourTooltipOffset(bubble, bounds);
    expect(bubble.left + offset.x).toBeGreaterThanOrEqual(bounds.left);
    expect(bubble.left + bubble.width + offset.x).toBeLessThanOrEqual(bounds.right);
    expect(bubble.left + bubble.width + offset.x).toBe(bounds.right);
    // 高度 180 < 643，纵向能完整放下。
    expect(bubble.top + offset.y).toBeGreaterThanOrEqual(bounds.top);
    expect(bubble.top + bubble.height + offset.y).toBeLessThanOrEqual(bounds.bottom);
  });

  test("气泡宽度恰好等于可用宽度时横向不夹取（只有唯一合法位置，坐标由 floating-ui 决定）", () => {
    // `maxX === minX` 的退化情形：此时 `clampTourTooltipOffset` 返回 x = 0，
    // 因为左右两侧都没有可移动的余量。真实链路上这一档由 CSS 的 max-width 保证：
    // 宽度贴合可用宽度时 bubble.left 与 bounds.left 天然一致。
    const bounds = tourTooltipViewportBounds({
      offsetTop: 0,
      offsetLeft: 0,
      width: 375,
      height: 667
    });
    const exactFit = { top: 300, left: bounds.left, width: 351, height: 180 };
    expect(clampTourTooltipOffset(exactFit, bounds)).toEqual({ x: 0, y: 0 });
  });
});

describe("tourTooltipTransform", () => {
  test("零位移返回 null（调用方省略内联 transform，保留 CSS 入场动画）", () => {
    expect(tourTooltipTransform({ x: 0, y: 0 })).toBeNull();
    expect(isZeroTourTooltipOffset({ x: 0, y: -0 })).toBe(true);
  });

  test("非零位移生成 translate3d", () => {
    expect(tourTooltipTransform({ x: -20, y: 36 })).toBe("translate3d(-20px, 36px, 0)");
  });
});

describe("readTourTooltipViewport", () => {
  test("window 不可用（node 环境）→ null，调用方跳过夹取", () => {
    expect(readTourTooltipViewport(null)).toBeNull();
  });

  test("未传 target 且 node 环境没有 window → null", () => {
    expect(readTourTooltipViewport()).toBeNull();
  });

  test("优先使用 visualViewport（软键盘 / 缩放下才准确）", () => {
    const fake = {
      innerWidth: 1280,
      innerHeight: 800,
      visualViewport: { offsetTop: 40, offsetLeft: 10, width: 900, height: 600 }
    } as unknown as Window;
    expect(readTourTooltipViewport(fake)).toEqual({
      offsetTop: 40,
      offsetLeft: 10,
      width: 900,
      height: 600
    });
  });

  test("visualViewport 尺寸为 0（未就绪）时回落到 window.inner*", () => {
    const fake = {
      innerWidth: 1280,
      innerHeight: 800,
      visualViewport: { offsetTop: 0, offsetLeft: 0, width: 0, height: 0 }
    } as unknown as Window;
    expect(readTourTooltipViewport(fake)).toEqual({
      offsetTop: 0,
      offsetLeft: 0,
      width: 1280,
      height: 800
    });
  });

  test("尺寸属性缺失时也安全回落为 null", () => {
    const fake = { innerWidth: undefined, innerHeight: undefined } as unknown as Window;
    expect(readTourTooltipViewport(fake)).toBeNull();
  });

  test("两者都拿不到尺寸 → null", () => {
    const fake = { innerWidth: 0, innerHeight: 0 } as unknown as Window;
    expect(readTourTooltipViewport(fake)).toBeNull();
  });
});

describe("useTourTooltipViewportClamp", () => {
  beforeEach(() => {
    FakeResizeObserver.instances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("挂载后用 ResizeObserver 量测、夹取，并在重复清理时保持幂等", () => {
    const frame = createFrameHarness();
    vi.stubGlobal("requestAnimationFrame", frame.request);
    vi.stubGlobal("cancelAnimationFrame", frame.cancel);
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    vi.stubGlobal("window", { innerWidth: 1280, innerHeight: 800 });

    const runner = createHookRunner();
    runner.render(0);
    const element = createTooltipElement({ top: 700, left: 1200, width: 360, height: 200 });
    runner.value.clampRef(element);
    runner.render(0);

    expect(frame.request).toHaveBeenCalledTimes(1);
    const observer = FakeResizeObserver.instances[0];
    expect(observer.observe).toHaveBeenCalledWith(element);
    observer.trigger();
    expect(frame.request).toHaveBeenCalledTimes(1);

    frame.flush();
    runner.render(0);
    expect(runner.value.shiftStyle).toEqual({ transform: "translate3d(-292px, -112px, 0)" });
    expect(observer.disconnect).toHaveBeenCalledTimes(1);

    frame.flush();
    expect(element.style.removeProperty).toHaveBeenCalledWith("transform");
    expect(element.style.transform).toBe("translate3d(-292px, -112px, 0)");

    runner.unmount();
    runner.unmount();
    expect(FakeResizeObserver.instances[1].disconnect).toHaveBeenCalledTimes(1);
    expect(element.style.removeProperty).toHaveBeenCalledWith("transform");
  });

  test("缺失 ResizeObserver 时退化为 window resize 订阅并可取消", () => {
    const frame = createFrameHarness();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal("requestAnimationFrame", frame.request);
    vi.stubGlobal("cancelAnimationFrame", frame.cancel);
    vi.stubGlobal("ResizeObserver", undefined);
    vi.stubGlobal("window", {
      innerWidth: 1280,
      innerHeight: 800,
      addEventListener,
      removeEventListener
    });

    const runner = createHookRunner();
    runner.render(0);
    const element = createTooltipElement({ top: 300, left: 400, width: 360, height: 200 });
    runner.value.clampRef(element);
    runner.render(0);

    expect(addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    const onResize = addEventListener.mock.calls[0][1] as () => void;
    onResize();
    onResize();
    expect(frame.request).toHaveBeenCalledTimes(1);
    frame.flush();
    runner.unmount();
    expect(removeEventListener).toHaveBeenCalledWith("resize", onResize);
  });

  test("没有 window 时跳过量测与订阅；清理后迟到的 frame 不再执行", () => {
    const frame = createFrameHarness();
    vi.stubGlobal("requestAnimationFrame", frame.request);
    vi.stubGlobal("cancelAnimationFrame", frame.cancel);
    vi.stubGlobal("ResizeObserver", undefined);
    vi.stubGlobal("window", undefined);

    const runner = createHookRunner();
    runner.render(0);
    const element = createTooltipElement({ top: 300, left: 400, width: 360, height: 200 });
    runner.value.clampRef(element);
    runner.render(0);
    frame.flush();
    expect(element.getBoundingClientRect).not.toHaveBeenCalled();

    runner.render(1);
    const lateFrame = frame.allCallbacks.at(-1);
    expect(lateFrame).toBeDefined();
    runner.unmount();
    lateFrame?.(0);
    expect(frame.cancel).toHaveBeenCalledTimes(1);
  });
});

// ---------- 装配契约（源码扫描）----------
//
// 夹取依赖「包装层 + hook + CSS」三处装配，任一断裂都会静默失效：
// 没有包装层 → 没有可施加位移的元素；没有 hook → 不求解；没有 CSS → 包装层可能被
// 尺寸约束拉宽导致量测口径错误。组件渲染边界在 node 环境下测不出来，用源码扫描钉住
// （仓库先例：windowCloseCoverage.test.ts、appTour.test.ts 的 wiring describe）。

describe("tour tooltip viewport clamp wiring (source contract)", () => {
  const readSource = (relativePath: string) =>
    readFileSync(new URL(relativePath, import.meta.url), "utf8");

  /**
   * 源码扫描断言的前置守卫：`String.prototype.indexOf` 未命中返回 **-1**，
   * 命中位置可以是 **0**（目标选择器 / 属性恰好就是文件的第一段）。
   *
   * 所以它守的是「存在」，**不是「靠后」** —— 判据只能是 `index < 0`。
   * `x.toBeGreaterThanOrEqual(0)` 在这里并不是无条件恒真（`undefined >= 0` 为 false、
   * `indexOf` 未命中时返回 -1 同样为 false），因此它有鉴别力；
   * 反过来把判据加严成 `toBeGreaterThan(0)` 才会引入假阳性：
   * 「`.tour-tooltip {` 恰好是 styles.css 的第一条规则」「组件文件第一行就是包装层」
   * 都是完全合法的布局，此时 index === 0 而 `> 0` 会误报。
   *
   * 换成抛错而非断言，是为了让失败信息指名道姓地带上 needle，
   * 而不是让下游 `slice` 先产出垃圾文本、再报一句误导性的「"" 里找不到 …」。
   */
  const expectFoundInSource = (index: number, needle: string): number => {
    if (index < 0) {
      throw new Error(`源码扫描未命中 ${needle}（indexOf 返回 ${index}）`);
    }
    return index;
  };

  test("扫描守卫自测：-1（未命中）必须报错，0（命中在首字节）必须放行", () => {
    // 判据是 `< 0` 而**不是** `<= 0`。若有人把这三处「加严」成
    // `toBeGreaterThan(0)`（语义上就是 `index <= 0` 即报错），本用例转红。
    // 这是这三处存在性检查唯一可在不动 appTour.tsx / styles.css 的前提下
    // 做出的变异验证 —— 它们扫描的是另外两个文件，而本守卫的判据就在本文件里。
    expect(expectFoundInSource(0, ".sel {")).toBe(0);
    expect(() => expectFoundInSource(-1, ".sel {")).toThrow(/源码扫描未命中 \.sel \{/);
  });

  test("TourTooltip 用包装层承载位移，而不是直接放在 .tour-tooltip 上", () => {
    const source = readSource("./appTour.tsx");
    expect(source).toContain("useTourTooltipViewportClamp");
    expect(source).toContain('className="tour-tooltip-floater"');
    expect(source).toContain("ref={clamp.clampRef}");
    expect(source).toContain("style={clamp.shiftStyle ?? undefined}");
    // 位移必须写在包装层上：写在 .tour-tooltip 自身会因内联 transform 优先级高于
    // keyframes 而压掉入场动画。
    //
    // 【此处原本是 `expect(floaterIndex).toBeGreaterThanOrEqual(0)`，判定：保留其鉴别力】
    // floaterIndex = source.indexOf('className="tour-tooltip-floater"')，当前命中
    // appTour.tsx:297，全文唯一。-1 是可达的（包装层改名 / 被挪进抽出的组件文件），
    // 所以这一句不是恒真。
    //
    // 它还是下面顺序断言的**承重行**：tooltipIndex 以 floaterIndex 为起点继续找，
    // 而 `indexOf(needle, -1)` 会被规范成 `indexOf(needle, 0)`（等价于 fromIndex 夹到 0），
    // floaterIndex 一旦为 -1，tooltipIndex 仍会从文件头找到气泡本体 →
    // `tooltipIndex > floaterIndex` 变成「任意正数 > -1」的恒真，
    // 「包装层包在气泡外面」这条契约会静默失效。
    // 因此上面那行 `toContain` 之外仍需这一句；不能用 `> 0` 代替（0 是合法命中位置）。
    const floaterIndex = expectFoundInSource(
      source.indexOf('className="tour-tooltip-floater"'),
      'className="tour-tooltip-floater"'
    );
    const tooltipIndex = source.indexOf('className="tour-tooltip"', floaterIndex);
    expect(tooltipIndex).toBeGreaterThan(floaterIndex);
  });

  test("resetKey 用当前步骤索引，换步时重新求解", () => {
    const source = readSource("./appTour.tsx");
    expect(source).toContain("useTourTooltipViewportClamp(index)");
  });

  test("styles.css 定义了包装层，且不引入尺寸约束", () => {
    const css = readSource("./styles.css");
    // 【此处原本是 `expect(start).toBeGreaterThanOrEqual(0)`，判定：保留其鉴别力】
    // start = css.indexOf(...) → -1 可达（规则改名 / 被删），所以不是恒真。
    // 它承的是**诊断质量**：命中失败时 `slice(-1, css.indexOf("}", -1))` 不抛错
    // （slice 的 -1 按「倒数第 1 个字符」起算），会静默产出一段垃圾文本，
    // 后面 4 条 toContain / not.toContain 只能报出「"" 里找不到 transform-origin」
    // 这种把「规则不存在」说成「声明缺失」的误导性失败；先在这里报错才指名道姓。
    // 不能加严成 `> 0`：`.tour-tooltip-floater {` 恰好是 styles.css 第一条规则
    // （例如把引导样式单独拆文件）就是合法布局。
    // needle 带上 `{`：排除将来的 `.tour-tooltip-floater-wide {` 抢走整个切片。
    const start = expectFoundInSource(
      css.indexOf(".tour-tooltip-floater {"),
      ".tour-tooltip-floater {"
    );
    const block = css.slice(start, css.indexOf("}", start));
    expect(block).toContain("transform-origin: left top");
    expect(block).toContain("will-change: transform");
    // 包装层一旦有 padding / border / 固定宽高，量到的 rect 就不再等于气泡的 rect。
    expect(block).not.toContain("padding");
    expect(block).not.toContain("border");
    expect(block).not.toContain("width");
    expect(block).not.toContain("height");
  });

  test("styles.css 给 .tour-tooltip 加了竖向滚动兜底", () => {
    const css = readSource("./styles.css");
    // 【此处原本是 `expect(start).toBeGreaterThanOrEqual(0)`，判定：保留其鉴别力】
    // 同上：-1 可达（规则改名），判据 `< 0` 而非 `<= 0`（0 是合法命中位置）。
    // needle `.tour-tooltip {` 带空格+花括号，因此天然排除 `.tour-tooltip__title {`
    // 这类 BEM 元素规则 —— 这是它和上面那个 needle 一样必须带 `{` 的原因。
    // 本仓库该 needle 命中 2 处（styles.css:16748 主规则、16770 `@media
    // prefers-reduced-motion` 覆盖块），`indexOf` 取第一处 = 主规则，符合本用例意图。
    const start = expectFoundInSource(css.indexOf(".tour-tooltip {"), ".tour-tooltip {");
    const block = css.slice(start, css.indexOf("}", start));
    expect(block).toContain("max-height: calc(100vh - 24px)");
    expect(block).toContain("overflow-y: auto");
  });
});
