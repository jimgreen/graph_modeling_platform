// stateIconCanvasTerminalContent 的尺寸守卫（appDeviceDefinitionRenderers.tsx:548-553）
//
// 本文件**不设**断言，原因见下方「为什么没有守卫测试」。这里只留说明，避免后人再花一遍同样的功夫。
//
// 修复本身：原写法 `Math.max(1, Number(size.width) * scaleX)` 是**假 NaN 守卫**——
// `Math.max(1, NaN) === NaN`。NaN 不会被挡成 1，会原样穿过 rotated/viewBox 算到 scale。
// 现改为先做有限性判定，非有限时给 1。回退 1 与下游同源约定一致
// （同文件 stateIconMapCanvasTerminalPoint 用 `atLeastOneNumber(node.size?.width, 1)`）。
//
// 为什么没有守卫测试（已实测，结论是「该分支在渲染输出里不可观测」）：
//   能到达 :548 的非有限来源只有两个，二者都**同时**喂给下游另外的独立消费点，
//   于是「:548 的守卫是否生效」在下游坐标上被完全抹平：
//     · size.width = NaN → terminalRenderLocalPoint（model-routing.ts:2321/2322
//       直接用 size.width/height）→ renderPoint.x = NaN
//     · getNodeScaleX = NaN → stateIconMapCanvasTerminalPoint（:634 自己再读一次
//       getNodeScaleX）→ local.x = NaN
//   实测：把 :548 改回 `Math.max(1, …)` 与保留有限性判定，两次渲染树
//   所有数值 prop（x1/y1/x2/y2 等）逐字节相同，x1 都是 NaN。
//   换言之，非有限值无论经由哪个来源进来，最终 connector 坐标恒为 NaN，
//   本守卫单独改与不改在输出上无差别 —— 这不是「分支不可达」，而是「效果被同源污染遮蔽」。
//
//   真正能消除 NaN 的做法是给三个消费点各自加守卫
//   （:548 / :634 / model-routing.ts:2321），那是独立于本任务的改动，未在本次范围内。
import { describe, expect, test } from "vitest";
import { atLeastOneNumber } from "../canvasViewport";

describe("尺寸守卫：非有限时回退 1 的约定", () => {
  // 本文件唯一保留的断言锁的是「回退值取 1」这条约定本身（与 :553 的新守卫同源），
  // 不是 :548 那个分支能否被观测。atLeastOneNumber 是 :642-643 对 node.size 用的同一函数：
  // 它对 NaN 退回 fallback(=1)，正是新守卫选择 1 的依据。
  test("atLeastOneNumber 对 NaN 回退 1，而裸 Math.max 不回退", () => {
    expect(atLeastOneNumber(NaN, 1)).toBe(1);
    expect(atLeastOneNumber("abc", 1)).toBe(1);
    // 这就是原 :548 写法的失效点：Math.max 自己挡不住 NaN。
    expect(Math.max(1, NaN)).toBeNaN();
    // 合法数值必须逐字不变（新守卫的前提）。
    expect(atLeastOneNumber(120, 1)).toBe(120);
    expect(Math.max(1, 120)).toBe(120);
  });
});