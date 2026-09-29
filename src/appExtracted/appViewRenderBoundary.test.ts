// areViewSectionPropsEqual：视图分段的 memo 比较器。
// 此前零测试，而它是「数据不变就不重渲染」的唯一闸门 —— 比较放宽会漏更新（画面停在
// 旧数据），比较收紧则整段白重渲（每帧重建 JSX）。两种错都只表现为「有点不对」。
import { describe, expect, it } from "vitest";
import { areViewSectionPropsEqual, type ViewSectionProps } from "./appViewRenderBoundary";

const props = (overrides: Partial<ViewSectionProps> = {}): ViewSectionProps => ({
  section: "canvas",
  inputs: [],
  render: () => null,
  ...overrides
});

describe("areViewSectionPropsEqual", () => {
  it("section 与 inputs 都相同 ⇒ 相等（走 memo，跳过重渲）", () => {
    const render = () => null;
    expect(areViewSectionPropsEqual(props({ render }), props({ render }))).toBe(true);
  });

  it("render 回调不同但数据相同 ⇒ 仍相等（这是本比较器的设计意图）", () => {
    // render 被刻意排除在比较之外：闭包里读的是 __appScope 的最新值，
    // 数据没变时保留已提交的 JSX 树即可。把它纳入比较会让每帧都重渲。
    expect(areViewSectionPropsEqual(props({ render: () => 1 }), props({ render: () => 2 }))).toBe(true);
  });

  it("section 不同 ⇒ 不等（不同分段不能互相顶替）", () => {
    expect(areViewSectionPropsEqual(props({ section: "canvas" }), props({ section: "topbar" }))).toBe(false);
  });

  it("inputs 长度不同 ⇒ 不等", () => {
    expect(areViewSectionPropsEqual(props({ inputs: [1] }), props({ inputs: [1, 2] }))).toBe(false);
  });

  it("inputs 逐项相同（引用相等）⇒ 相等", () => {
    const a = { id: 1 };
    expect(areViewSectionPropsEqual(props({ inputs: [a, "x"] }), props({ inputs: [a, "x"] }))).toBe(true);
  });

  it("inputs 任一项引用不同 ⇒ 不等", () => {
    expect(areViewSectionPropsEqual(props({ inputs: [{ id: 1 }] }), props({ inputs: [{ id: 1 }] }))).toBe(false);
  });

  it("内容相同但引用不同 ⇒ 不等（浅比较，不做深比较）", () => {
    // 同理：数据每帧新建对象是常态，深比较反而会把更新吃掉
    expect(areViewSectionPropsEqual(props({ inputs: [1, 2] }), props({ inputs: [1, 2] }))).toBe(true);
    expect(areViewSectionPropsEqual(props({ inputs: [{ a: 1 }] }), props({ inputs: [{ a: 1 }] }))).toBe(false);
  });

  it("用 Object.is 比较 ⇒ NaN 与 NaJ 相等（两者本就是同一值）", () => {
    expect(areViewSectionPropsEqual(props({ inputs: [NaN] }), props({ inputs: [NaN] }))).toBe(true);
  });

  it("用 Object.is 比较 ⇒ +0 与 -0 不等（两轴判断都靠这个区分）", () => {
    // Object.is 的关键用途：若用 === ，0 与 -0 会被当成相同而漏掉符号翻转
    expect(areViewSectionPropsEqual(props({ inputs: [0] }), props({ inputs: [-0] }))).toBe(false);
    expect(0 === -0).toBe(true);
  });

  it("顺序不同 ⇒ 不等（inputs 是有序的位置契约，不是集合）", () => {
    expect(areViewSectionPropsEqual(props({ inputs: [1, 2] }), props({ inputs: [2, 1] }))).toBe(false);
  });

  it("空 inputs 恒相等（不依赖 section 之外的东西）", () => {
    expect(areViewSectionPropsEqual(props({ inputs: [] }), props({ inputs: [] }))).toBe(true);
    expect(areViewSectionPropsEqual(props({ section: "a" }), props({ section: "a" }))).toBe(true);
  });

  it("长度相同但只差最后一项 ⇒ 不等（不能提前 return 漏掉尾部）", () => {
    const shared = [1, 2, 3];
    expect(areViewSectionPropsEqual(props({ inputs: [...shared, 4] }), props({ inputs: [...shared, 5] }))).toBe(false);
  });
});
