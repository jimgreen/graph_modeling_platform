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
});
