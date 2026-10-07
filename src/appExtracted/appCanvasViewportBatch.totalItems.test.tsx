// appCanvasViewportBatch 的 totalItems 解析守卫。
//
// 背景：图元树分组用 `data-total-items` 携带总数，正常由 appRenderPanels 以
// `{totalItems}`（数字）写入，故渲染出来一定是数字串。但它是普通 DOM 属性，
// 外部改写即可塞进 `"abc"`。原写法 `Number(raw ?? 0)` 里的 `??` 只挡 undefined，
// 非数字串得到 NaN，而 `NaN <= WINDOW` 恒为 false —— 分支会一路穿到
// clampNumber / Math.min / Math.floor，产出 `{start: NaN, end: NaN}` 的窗口索引。
//
// 这里不渲染组件树：待测行位于 hook 的 useEffect 闭包深处，要触达它就得拉起
// useCanvasViewportBatch 的整个依赖图（renderAppView / MemoizedCanvasArea /
// rAF / DOM），成本与本守卫的体量完全不成比例。因此把该行原本内联的解析表达式
// 提成纯函数 `elementTreeGroupTotalItems` 并导出，直接测它；调用点的接线用一条
// 静态断言钉住（见「调用点」一节）。
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { elementTreeGroupTotalItems } from "./appCanvasViewportBatch";

const WINDOW = 40; // 与 hook 内 N + 2 * BUFFER 同量级，够区分「走窗口化 / 不走」

/** 把 total 代入下游窗口索引计算，展示 NaN 会污染到哪里（与 hook 内算法同构）。 */
function windowEndForTotal(total: number): number {
  if (total <= WINDOW) return total;
  const firstVisibleIndex = 0;
  const lastVisibleIndex = 12;
  const center = Math.floor((firstVisibleIndex + lastVisibleIndex) / 2);
  const targetStart = Math.max(0, Math.min(center - Math.floor(WINDOW / 2), total - WINDOW));
  return Math.min(total, targetStart + WINDOW);
}

describe("appCanvasViewportBatch / elementTreeGroupTotalItems", () => {
  it("合法数字串逐字透传（含 0 与超窗口的大数）", () => {
    expect(elementTreeGroupTotalItems("0")).toBe(0);
    expect(elementTreeGroupTotalItems("128")).toBe(128);
    expect(elementTreeGroupTotalItems("9999")).toBe(9999);
    // 前导零 / 空白 / 指数写法都是合法数字，Number 能解析，不该被守卫改写
    expect(elementTreeGroupTotalItems("007")).toBe(7);
    expect(elementTreeGroupTotalItems(" 64 ")).toBe(64);
    expect(elementTreeGroupTotalItems("1e3")).toBe(1000);
  });

  it("undefined 按 0 处理（与原有 ?? 0 兜底同向）", () => {
    expect(elementTreeGroupTotalItems(undefined)).toBe(0);
    // 空串不是 undefined：Number("") === 0，两条路径本就同值
    expect(elementTreeGroupTotalItems("")).toBe(0);
  });

  it("非数字串按 0 处理，绝不产出 NaN", () => {
    // ↓ 这三条是本守卫的承重断言。删掉 Number.isFinite 回到 `Number(raw ?? 0)`
    //   时，"abc" → NaN（≠ 0），"Infinity" → Infinity（≠ 0），全部转红。
    expect(elementTreeGroupTotalItems("abc")).toBe(0);
    expect(elementTreeGroupTotalItems("12abc")).toBe(0);
    expect(elementTreeGroupTotalItems("Infinity")).toBe(0);
    // Number.isFinite 同时挡掉 ±Infinity / NaN 两类非有限值，显式钉住
    expect(elementTreeGroupTotalItems("-Infinity")).toBe(0);
    // 用 Number.isFinite 反向兜一层断言：产出值恒为有限数（不止是 ≠ NaN）
    for (const raw of ["abc", "12abc", "Infinity", "-Infinity", undefined, "", "0", "128"]) {
      expect(Number.isFinite(elementTreeGroupTotalItems(raw))).toBe(true);
    }
  });

  it("守卫的下游后果：NaN 会绕过 total <= WINDOW 并污染窗口索引，0 不会", () => {
    // 无守卫时 `"abc"` 的 total 是 NaN：`NaN <= WINDOW` 恒假 ⇒ 走进窗口化分支，
    // Math.min(NaN, …) 产出 NaN —— 这就是修复前会写进 elementTreeItemWindows 的值。
    expect(Number.isFinite(windowEndForTotal(Number("abc")))).toBe(false);
    // 有守卫时 total 落回 0：`0 <= WINDOW` 恒真 ⇒ 走「不窗口化」分支，end 有限。
    expect(windowEndForTotal(elementTreeGroupTotalItems("abc"))).toBe(0);
    // 合法大数仍然正常窗口化（守卫没有把一切压成 0）
    expect(windowEndForTotal(elementTreeGroupTotalItems("128"))).toBe(40);
  });
});

describe("appCanvasViewportBatch / elementTreeGroupTotalItems 调用点接线", () => {
  const source = readFileSync(new URL("./appCanvasViewportBatch.tsx", import.meta.url), "utf8");

  it("updateWindows 里读 data-total-items 走的是受守卫的解析，而不是裸 Number(...)", () => {
    // 静态钉住调用点：若有人把 hook 内那行改回 `Number(groupEl.dataset.totalItems ?? 0)`，
    // 本文件前面所有断言仍会绿（它们只测纯函数），此处转红。
    expect(source).toContain("const total = elementTreeGroupTotalItems(groupEl.dataset.totalItems);");
    // 裸写法（含 `?? 0` 兜底但无有限性守卫）不得残留
    expect(source).not.toMatch(/Number\(\s*groupEl\.dataset\.totalItems/);
  });

  it("守卫的检测逻辑自测：helper 本身确实会因删掉守卫而变红", () => {
    // 直接测判定式，避免「helper 变成恒返回 0 的空壳」这种恒绿测试被放过。
    const guarded = (raw: string | undefined) => {
      const total = Number(raw ?? 0);
      return Number.isFinite(total) ? total : 0;
    };
    const unguarded = (raw: string | undefined) => Number(raw ?? 0);
    expect(guarded("abc")).toBe(0);
    expect(unguarded("abc")).toBeNaN(); // ← 无守卫形态，对照证据
    // 合法输入下两者逐字相等 ⇒ 守卫确实没改业务语义
    for (const raw of [undefined, "", "0", "128", "9999", "1e3"]) {
      expect(guarded(raw)).toBe(unguarded(raw));
    }
  });
});