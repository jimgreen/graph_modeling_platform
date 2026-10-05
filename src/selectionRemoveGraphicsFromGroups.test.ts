// `removeGraphicsFromGroups` 的真实实现此前零覆盖：
// 全仓仅两处命中 `removeGraphicsFromGroups`，都是 `__appScope` 的 stub 赋值
// `removeGraphicsFromGroups: (g: any) => g`，所以 `selectionActions.test.ts` 里
// 那些用例走的是「原样返回」，一个分支都没验证过。
//
// 实现（src/selectionActions.ts，约 497 行）只有四件事，测试逐条钉死：
//   1. 节点与边是**两套独立**的 id 集合：nodeIds 只按 removedNodeIds 过滤，
//      edgeIds 只按 removedEdgeIds 过滤；
//   2. 门槛是 `nodeIds + edgeIds + childGroupIds < 2` 就整组丢弃 —— 子组数**计入**门槛；
//   3. 子组 id 原样保留（既不因成员被删而剔除，也不校验子组是否存在），
//      只经过 `uniqueIds` 去重/去空串；
//   4. 返回全新数组与全新组对象，不就地改输入。
//
// 本文件每个断言都挑了「删掉某个分支就会变红」的输入。特别注意门槛那一族：
// 只断言「剩 1 项被丢」杀不掉 `< 1` 的变异，只断言「剩 2 项保留」杀不掉 `< 3`
// 的变异，所以 0 / 1 / 2 三档必须同时在场。
import { describe, expect, test } from "vitest";
import type { ModelGroup } from "./model";
import { removeGraphicsFromGroups } from "./selectionActions";

const group = (id: string, nodeIds: string[], edgeIds: string[] = [], childGroupIds?: string[]): ModelGroup => ({
  id,
  name: `${id}-name`,
  nodeIds,
  edgeIds,
  ...(childGroupIds ? { childGroupIds } : {})
});

describe("成员移除的作用范围", () => {
  test("成员只从命中的那个组里移除，其余组逐字段原样保留", () => {
    const hit = group("hit", ["a", "b", "c"]);
    const miss = group("miss", ["x", "y"], ["e1"]);
    const untouchedMiss = structuredClone(miss);

    const result = removeGraphicsFromGroups([hit, miss], ["b"], []);

    expect(result.map((g) => g.id)).toEqual(["hit", "miss"]);
    // 精确到「恰好移掉 b」：少移或多移都会红
    expect(result[0].nodeIds).toEqual(["a", "c"]);
    // 顺序保持原样（实现是 filter，不是重建集合）
    expect(result[0].edgeIds).toEqual([]);
    expect(result[0].name).toBe("hit-name");
    // 未命中的组连 name/edgeIds 都不能动
    expect(result[1]).toEqual(untouchedMiss);
  });

  test("节点与边是两套独立集合：被删节点不会牵连同名的边", () => {
    // 用同一个 id "x" 同时当节点和边。如果实现把两个集合并成一个 Set，
    // edgeIds 里的 "x" 会被一起删掉，这条断言转红。
    const target = group("g", ["x", "n2"], ["x", "e2"]);

    const result = removeGraphicsFromGroups([target], ["x"], []);

    expect(result).toHaveLength(1);
    expect(result[0].nodeIds).toEqual(["n2"]);
    expect(result[0].edgeIds).toEqual(["x", "e2"]);
  });

  test("接受 Set 形式的待删 id 集合", () => {
    // 形参是 Iterable<string>。若实现被改成对入参直接 `.includes()`，
    // 这里传 Set 会在运行时抛错，而不是静默通过。
    const target = group("g", ["a", "b", "c"], ["e1", "e2"]);

    const result = removeGraphicsFromGroups([target], new Set(["a"]), new Set(["e2"]));

    expect(result[0].nodeIds).toEqual(["b", "c"]);
    expect(result[0].edgeIds).toEqual(["e1"]);
  });
});

describe("剩不足两项的组被丢弃", () => {
  test("剩 0 项丢弃、剩 1 项丢弃、剩 2 项保留，三档同时在场", () => {
    // 门槛是「剩余成员 + 子组数 < 2」。三档一起断言才能把边界钉死：
    //   · 只断言剩 0 项被丢 → `< 1` 的变异照样绿（剩 1 项会被留下）
    //   · 只断言剩 1 项被丢 → `<= 0` 的变异照样绿
    //   · 只断言剩 2 项保留 → `< 3` / `<= 2` 的变异照样绿
    const emptied = group("emptied", ["a", "b"]);
    const oneLeft = group("one-left", ["c", "d"]);
    const twoLeft = group("two-left", ["e", "f", "g"]);

    const result = removeGraphicsFromGroups([emptied, oneLeft, twoLeft], ["a", "b", "c", "g"], []);

    expect(result.map((g) => g.id)).toEqual(["two-left"]);
    expect(result[0].nodeIds).toEqual(["e", "f"]);
  });

  test("删除使原本刚好够门槛的组跌破门槛，整组随之消失", () => {
    // 这条同时覆盖两件事：成员确实被移出了 nodeIds，以及移出后整组被丢。
    // 只断言「组没了」会漏掉「成员没被移出但整组被丢」的错误实现。
    const groupAtThreshold = group("g", ["keep", "drop"]);

    const result = removeGraphicsFromGroups([groupAtThreshold], ["drop"], []);

    expect(result).toEqual([]);
  });

  test("子组个数计入门槛：2 个子组的空组保留，1 个子组的空组丢弃", () => {
    // 把 `childGroupIds.length +` 从门槛里删掉，前两个组都会被丢，这条断言转红。
    // 反过来只留「子组多的保留」也够：默认无子组时长度为 0，
    // 与「子组项被忽略」的默认值一致，只有 1/2 这个分界能区分。
    const twoChildren = group("two-children", [], [], ["c1", "c2"]);
    const oneChild = group("one-child", [], [], ["c3"]);
    const mixed = group("mixed", ["n1"], [], ["c4"]);

    const result = removeGraphicsFromGroups([twoChildren, oneChild, mixed], [], []);

    expect(result.map((g) => g.id)).toEqual(["two-children", "mixed"]);
  });
});

describe("子组 id 的保留", () => {
  test("成员被移出后子组 id 仍在结果里，且只被 uniqueIds 去重去空串", () => {
    // 实现是 `uniqueIds(group.childGroupIds ?? [])`：既不剔除，也不查子组是否存在
    // （"k1"/"k2" 在 groups 里查不到，仍原样保留）。
    //
    // 变异记录（别再重查一遍）：这一族去重做了两次 —— `groupChildIds` 里一次，
    // `withChildGroupIds` 里又一次。任删其中一处，本用例都仍然绿，而且
    // **绿是正确结果**：`uniqueIds` 是幂等的（去空串 + 首次出现去重），
    // 两处互相兜底，单删一处观察不到差异。真正承重的是「输出去重过」这个结果 ——
    // 三处 `uniqueIds` 全删（`groupChildIds`、`withChildGroupIds` 两处）时，
    // 重复项与空串会留在输出里，本用例转红。
    const target = group("g", ["n1", "n2"], [], ["k1", "k1", "", "k2"]);

    const result = removeGraphicsFromGroups([target], ["n1"], []);

    expect(result).toHaveLength(1);
    expect(result[0].nodeIds).toEqual(["n2"]);
    expect(result[0].childGroupIds).toEqual(["k1", "k2"]);
  });

  test("子组 id 不按节点删除集合过滤", () => {
    // 与 `dissolveSelectedCanvasGroups` 的对照：那里会剔除已被解散的子组 id，
    // 这里只删图元、不删组，所以子组 id 一律原样带过。
    // 形参允许这么写（子组 id 与节点 id 都是 string），所以这条是钉得住的契约。
    const target = group("g", ["n1", "n2"], [], ["n1"]);

    const result = removeGraphicsFromGroups([target], ["n1"], []);

    expect(result[0].nodeIds).toEqual(["n2"]);
    expect(result[0].childGroupIds).toEqual(["n1"]);
  });

  test("保留下来时 childGroupIds 为空数组的组，输出上不再带这个键", () => {
    // `withChildGroupIds` 在 ids 为空时直接返回不含该键的对象字面量。
    // 这条对 JSON 导出可见（空数组会消失），按真实行为钉住。
    const target = group("g", ["n1", "n2"], [], []);

    const result = removeGraphicsFromGroups([target], [], []);

    expect(result).toHaveLength(1);
    expect(result[0].childGroupIds).toBeUndefined();
    expect("childGroupIds" in result[0]).toBe(false);
  });
});

describe("不修改输入", () => {
  test("返回新数组与新组对象，输入的组对象、成员数组、子组数组都保持调用前的样子", () => {
    const kept = group("kept", ["a", "b", "c"], ["e1"], ["k1", "k1"]);
    const dropped = group("dropped", [], [], ["k2"]);
    const input = [kept, dropped];
    const before = structuredClone(input);

    const result = removeGraphicsFromGroups(input, ["a"], []);

    expect(result.map((g) => g.id)).toEqual(["kept"]);
    // 输入深度不变（含子组数组的重复项）
    expect(kept).toEqual(before[0]);
    expect(dropped).toEqual(before[1]);
    // 引用也不共享：实现里 nodeIds/childGroupIds 都来自 filter / uniqueIds 的新数组
    expect(result).not.toBe(input);
    expect(result[0]).not.toBe(kept);
    expect(result[0].nodeIds).not.toBe(kept.nodeIds);
    expect(result[0].childGroupIds).not.toBe(kept.childGroupIds);
  });
});
