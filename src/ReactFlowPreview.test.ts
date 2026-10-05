// pathMidpoint：保存路径边的标签锚点。
//
// 这是 ReactFlowPreview 里唯一有真正算法的一段 —— 按**弧长**（不是按点序号）
// 取折线中点，位置用来放「保存路径」标签和边工具栏。取错的表现是标签挂在
// 折线的几何中心而非长度中心：路径一端长一端短时标签明显偏，视觉上像 bug。
// 组件其余部分是 ReactFlow 拼装（且整包还被 ENABLE_REACT_FLOW_PREVIEW 门控、
// 走 lazy 动态 import），不铺渲染环境；这里只测这段纯计算。
import { describe, expect, test } from "vitest";
import { pathMidpoint } from "./ReactFlowPreview";

const p = (x: number, y: number) => ({ x, y });

describe("pathMidpoint", () => {
  test("空点列退回原点（而不是抛错或 undefined）", () => {
    expect(pathMidpoint([])).toEqual(p(0, 0));
  });

  test("单点：就是那一点本身", () => {
    expect(pathMidpoint([p(12, 34)])).toEqual(p(12, 34));
  });

  test("两点：几何中点", () => {
    expect(pathMidpoint([p(0, 0), p(10, 20)])).toEqual(p(5, 10));
  });

  test("多段折线按弧长取中点，不是按点序号", () => {
    // 三段等长 0→10→20→30：弧长中点在 15，即第二段正中。
    // 按「取中间那个点」实现会得到 (10,0) 或 (20,0)，本例能区分两者。
    expect(pathMidpoint([p(0, 0), p(10, 0), p(20, 0), p(30, 0)])).toEqual(p(15, 0));
  });

  test("段长悬殊时中点仍按弧长：短段 + 长段", () => {
    // 总长 10 + 290 = 300，半程 150 落在长段里：短段走完后已 10，
    // 还差 140 → y = 10 + 140 = 150
    expect(pathMidpoint([p(0, 0), p(0, 10), p(0, 300)])).toEqual(p(0, 150));
  });

  test("零长线段不产生 NaN（重复点）", () => {
    // 首段长度为 0，若不做除零保护会得到 NaN 或 Infinity
    expect(pathMidpoint([p(0, 0), p(0, 0), p(10, 0)])).toEqual(p(5, 0));
  });

  test("所有点重合：退化成那一点，不返回 NaN", () => {
    expect(pathMidpoint([p(5, 5), p(5, 5), p(5, 5)])).toEqual(p(5, 5));
  });

  test("负坐标与斜线段", () => {
    expect(pathMidpoint([p(-10, -10), p(10, 10)])).toEqual(p(0, 0));
  });

  test("结果不与输入点共享引用（调用方会拿它做 transform 运算）", () => {
    const points = [p(0, 0), p(4, 4)];
    const result = pathMidpoint(points);
    expect(result).toEqual(p(2, 2));
    result.x = 999;
    expect(points[0].x).toBe(0);
    expect(points[1].x).toBe(4);
  });

  // ---- 边界一：半程恰好落在分段点上（`cursor + length >= halfLength`）----
  //
  // 注意「恰好落在分段点」这件事在坐标上是**不可区分**的：折线里第 i 段的末端
  // 就是第 i+1 段的起点，ratio=1（走完第 i 段）与 ratio=0（从第 i+1 段起步）
  // 产出同一个坐标。所以把 `>=` 改成 `>` 对下面这些输入**同样绿**——这是折线
  // 几何本身决定的等价，不是用例没覆盖。真正能区分的是下面第 2、3 例：
  // 分段点后面还挂着别的段，边界判定或 cursor 记账一旦出错，结果会滑进下一段
  // 内部（如 (3.5, 3)），断言立刻转红。
  test("半程恰好落在分段点：返回该分段点本身，不被后续段带走", () => {
    // 两段等长 5（3-4-5 对角线，避免轴互换蒙混过关）：总长 10，半程 5 = 第 0 段末端。
    expect(pathMidpoint([p(0, 0), p(3, 4), p(6, 8)])).toEqual(p(3, 4));

    // 段长 2 / 3 / 5：总长 10，半程 5 = 第 1 段末端，后面还挂着一条 5 长的第 2 段。
    expect(pathMidpoint([p(0, 0), p(2, 0), p(2, 3), p(7, 3)])).toEqual(p(2, 3));

    // 段长非二进制可表示（0.1/0.1/0.2）：半程落在第 0 段末端，ratio 恰为 1，
    // 坐标必须严格等于 0.1，不允许 0.10000000000000002 这类漂移。
    expect(pathMidpoint([p(0, 0), p(0, 0.1), p(0, 0.2)])).toEqual(p(0, 0.1));
  });

  // ---- 边界二：路径点里混入非有限坐标 ----
  test("路径点含 NaN：不抛异常，退回末点", () => {
    // hypot 遇 NaN → 段长 NaN → 累计与半程全为 NaN；`cursor + length >= NaN`
    // 恒为 false，循环走空，落到函数末尾的 `return points[points.length - 1]`
    // 即末点。这就是「含 NaN 时返回哪个确定点」的答案：不抛，返末点。
    expect(pathMidpoint([p(0, 0), p(NaN, 0), p(10, 10)])).toEqual(p(10, 10));
    expect(pathMidpoint([p(NaN, NaN), p(10, 10), p(20, 20)])).toEqual(p(20, 20));
    expect(pathMidpoint([p(0, 0), p(0, NaN), p(10, 10)])).toEqual(p(10, 10));

    // NaN 落在末点：进循环前就被末点分支返回，NaN 原样带出（仍不抛）。
    // 这里 toEqual 对 NaN 用 SameValueZero 语义，NaN 等于 NaN。
    expect(pathMidpoint([p(0, 0), p(10, 0), p(NaN, NaN)])).toEqual(p(NaN, NaN));
  });

  test("路径点含 Infinity：不抛异常，但插值比值退化成 NaN", () => {
    // 与 NaN 走的**不是**同一条路：Infinity >= Infinity 为 true，会进插值分支；
    // 而段长是 Infinity，比值 (Infinity - cursor) / Infinity = Infinity / Infinity
    // = NaN，段上没有 Number.isFinite 保护 → 坐标整体变 NaN。
    // 钉的是这个「与 NaN 走不同分支」的现状，不是期望行为。
    expect(() => pathMidpoint([p(0, 0), p(Infinity, 0), p(10, 10)])).not.toThrow();
    expect(pathMidpoint([p(0, 0), p(Infinity, 0), p(10, 10)])).toEqual({ x: NaN, y: NaN });
    expect(pathMidpoint([p(0, 0), p(10, 0), p(10, Infinity)])).toEqual({ x: NaN, y: NaN });

    // 单点分支在进循环前返回：Infinity 原样带出，不被插值成 NaN。
    expect(pathMidpoint([p(Infinity, Infinity)])).toEqual(p(Infinity, Infinity));
  });
});
