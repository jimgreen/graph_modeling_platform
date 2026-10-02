// createMergeUniqueEdgesById / createCompleteNodeListForPartialPatch：按 id 合表。
// 共同点是「保序 + 后者覆盖前者」；差别在 partial patch 那条还要处理
// 「patch 里出现了原列表没有的新节点」——必须追加，不能静默丢掉。
import { describe, expect, test } from "vitest";

import {
  createCompleteNodeListForPartialPatch,
  createMergeUniqueEdgesById
} from "./appExtracted/appSelectionDragFactories";

const edge = (id: string): any => ({ id });
const node = (id: string): any => ({ id });

describe("createMergeUniqueEdgesById", () => {
  const merge = createMergeUniqueEdgesById({});

  test("第一组为空时原样返回第二组", () => {
    const second = [edge("e1")];

    expect(merge([], second)).toBe(second);
  });

  test("第二组为空时原样返回第一组", () => {
    const first = [edge("e1")];

    expect(merge(first, [])).toBe(first);
  });

  test("不重复时按顺序拼接", () => {
    expect(merge([edge("e1")], [edge("e2")]).map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  test("同 id 时后者覆盖前者且位置不变", () => {
    const first = edge("e1");
    const second = { ...edge("e1"), tag: "新" };

    const merged = merge([first], [second]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toBe(second);
  });

  test("覆盖不改变原有顺序", () => {
    const merged = merge([edge("e1"), edge("e2")], [{ ...edge("e2") }, edge("e3")]);

    expect(merged.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });

  test("两组都为空时返回空数组", () => {
    expect(merge([], [])).toEqual([]);
  });
});

describe("createCompleteNodeListForPartialPatch", () => {
  const complete = createCompleteNodeListForPartialPatch({});

  test("patch 不短于原列表时原样返回 patch", () => {
    const previous = [node("n1")];
    const next = [node("n1"), node("n2")];

    expect(complete(previous, next)).toBe(next);
  });

  test("等长时也原样返回", () => {
    const next = [node("n1")];

    expect(complete([node("n1")], next)).toBe(next);
  });

  test("纯 patch：按原顺序替换对应节点", () => {
    const previous = [node("n1"), node("n2")];
    const patched = { ...node("n2"), tag: "新" };

    const result = complete(previous, [patched]);

    expect(result[0].id).toBe("n1");
    expect(result[1]).toBe(patched);
  });

  test("patch 为空时返回原列表引用", () => {
    const previous = [node("n1")];

    expect(complete(previous, [])).toBe(previous);
  });

  test("patch 里出现原列表没有的节点时追加到末尾", () => {
    // patch 必须比原列表短才会走合并分支
    const previous = [node("n1"), node("n2")];
    const extra = node("n9");

    const result = complete(previous, [extra]);

    expect(result.map((n) => n.id)).toEqual(["n1", "n2", "n9"]);
  });

  test("同时有替换与新增时两者都生效", () => {
    const previous = [node("n1"), node("n2"), node("n3")];
    const patched = { ...node("n1"), tag: "新" };
    const extra = node("n9");

    const result = complete(previous, [patched, extra]);

    expect(result[0]).toBe(patched);
    expect(result[1].id).toBe("n2");
    expect(result[2].id).toBe("n3");
    expect(result[3]).toBe(extra);
  });
});
