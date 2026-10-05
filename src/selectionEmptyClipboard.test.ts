/**
 * `EMPTY_CANVAS_CLIPBOARD` 的三数组独立引用守卫。
 *
 * 唯一真实消费点：`src/App.tsx` 的
 *   `useState<CanvasClipboard>(EMPTY_CANVAS_CLIPBOARD)`
 * —— 状态初值就是**这个对象本身**（useState 不复制），此后 `canvasClipboard`
 * 与本模块常量长期同一引用。`src/appExtracted/appStateBatch.tsx` /
 * `appCanvasViewportBatch.tsx` 也 import 了它，但两处均只出现在 import 列表里、
 * 文件内无第二次出现（两者带 `// @ts-nocheck`，未用导入不报错），属死导入。
 *
 * ⚠️ 实测结论，与「这是个冻结常量」的直觉相反：
 *   `Object.isFrozen` 对容器与三个成员**全是 false**，`push` **不抛错且写入成功**。
 *   所以这里断言的是「当前未冻结」这一事实，并把冻结做成**双向 tripwire**：
 *   日后有人给容器或**任意单个成员**加 `Object.freeze`，本文件会立刻变红，
 *   逼着做决定而不是让行为悄悄变掉。
 *
 * 判别力说明（对照仓库 AGENTS.md）：
 *  - 「三成员互不共享引用」配一条**行为对照**：真写进一个成员、在**撤销之前**
 *    就断言另两个成员的长度没变。只断言 `!==` 的话，别名变异靠 `!==` 也能抓；
 *    但反过来，若只写行为断言而把撤销放在断言之前，「三成员同数组」的变异会被
 *    撤销动作把三个长度一起清成 0，于是恒绿。两条都在，才两头都咬得住。
 *  - 「成员为空」一律配 `Array.isArray`：`expect(x ?? []).toEqual([])` 那种写法
 *    会把 `undefined` / `null` 一起算成空，成员被删或改名时恒绿。
 *  - 「多次读取恒等」在本文件里只能被 getter / 工厂式重构打红（模块级 `const`
 *    在单次模块求值内本就同一引用），所以它的承重兄弟是上面的行为对照；
 *    此处如实标注，不假装它能覆盖「每次读取新建」。
 *  - 属性书写顺序**不作**断言：全仓无消费点遍历 `Object.keys(本常量)`
 *    （grep `Object.(keys|entries|values)(clipboard|canvasClipboard|EMPTY_CANVAS_CLIPBOARD)`
 *    只命中本文件自己），三键调换顺序是等价变异，见下方变异记录 ⑨。
 *
 * 变异记录（12 条，注入 `src/selectionActions.ts`，副本跑在仓库外）：
 *   ① 三成员指向同一数组        RED failed=2
 *   ② nodes 与 edges 共享      RED failed=2
 *   ③ 容器 + 三成员全冻结       RED failed=1（只有冻结那条 tripwire，别名那条仍绿 —— 正是设计意图）
 *   ④ 冻结容器 + 两个成员、漏 groups  RED failed=1
 *   ⑤ buildCanvasClipboard 空选早退复用常量        RED failed=1
 *   ⑥ cloneCanvasClipboard 空 bounds 早退共享 nodes 数组  RED failed=1
 *   ⑦ nodes 预填一项            RED failed=5
 *   ⑧ nodes 不是数组（null）     RED failed=5
 *   ⑨ 三个键书写顺序调换         GREEN —— **等价变异**，非覆盖不足
 *   ⑩ 漏掉 groups 成员并改名      RED failed=4
 *   ⑪ 只冻结两个成员（容器与 groups 仍可写）  RED failed=1（证明逐成员检查独立承重）
 *   ⑫ 只冻结容器（三成员仍可写）  RED failed=1（证明容器检查独立承重）
 *
 * ⑨ 为什么 GREEN 是正确结果：它唯一可观测的差别是 `Object.keys()` 的插入顺序。
 * 三个成员的值、引用关系、冻结状态、可写性全都不变；而上面已记录全仓没有任何
 * 消费点遍历这个对象的键（三个成员一律按名字取 `.nodes` / `.edges` / `.groups`），
 * 它也不进任何 JSON 序列化路径。因此键序不是契约 —— 这是能说出「为什么在整个
 * 定义域上等价」的那一类 GREEN，与「输入没覆盖到」的 GREEN 不同，无需补断言。
 */

import { describe, expect, test } from "vitest";
import {
  EMPTY_CANVAS_CLIPBOARD,
  buildCanvasClipboard,
  canvasClipboardBounds,
  cloneCanvasClipboard,
  type CanvasClipboard
} from "./selectionActions";

const CLIPBOARD_MEMBERS = ["nodes", "edges", "groups"] as const;
type ClipboardMember = (typeof CLIPBOARD_MEMBERS)[number];

/** 记录成员数组当前长度；用于「写入是否真的发生 / 是否被拦下」的实测。 */
function memberLengths(clipboard: CanvasClipboard): Record<ClipboardMember, number> {
  return {
    nodes: clipboard.nodes.length,
    edges: clipboard.edges.length,
    groups: clipboard.groups.length
  };
}

/**
 * 尝试往成员数组写一项，返回「是否抛错」与「写后长度」。
 * 供 Object.isFrozen 之外的 push 实测使用（当前实现下不抛错、长度 +1）。
 */
function writeMember(clipboard: CanvasClipboard, member: ClipboardMember): { threw: boolean; after: number } {
  const before = memberLengths(clipboard);
  let threw = false;
  try {
    clipboard[member].push({} as never);
  } catch {
    threw = true;
  }
  const after = clipboard[member].length;
  if (after !== before[member]) {
    clipboard[member].length = before[member];
  }
  return { threw, after };
}

describe("EMPTY_CANVAS_CLIPBOARD 三数组独立引用", () => {
  test("容器恰好三个自有可枚举键, 且每个成员都是真数组且为空", () => {
    const clipboard = EMPTY_CANVAS_CLIPBOARD;

    // 只比键的集合，不比顺序：见文件头「属性书写顺序不作断言」。
    expect(Object.keys(clipboard).sort()).toEqual(["edges", "groups", "nodes"]);

    for (const member of CLIPBOARD_MEMBERS) {
      // Array.isArray 是「非 undefined / 非 null」的排他判据 —— 见文件头。
      expect(Array.isArray(clipboard[member])).toBe(true);
      expect(clipboard[member]).toHaveLength(0);
    }
  });

  test("三个数组成员两两不共享引用", () => {
    const { nodes, edges, groups } = EMPTY_CANVAS_CLIPBOARD;

    expect(nodes).not.toBe(edges);
    expect(edges).not.toBe(groups);
    expect(nodes).not.toBe(groups);
  });

  test("写入一个成员, 另两个成员不受影响（别名断言的行为对照, 且在撤销之前断言）", () => {
    const { nodes, edges, groups } = EMPTY_CANVAS_CLIPBOARD;
    const before = memberLengths(EMPTY_CANVAS_CLIPBOARD);
    let pushed = false;
    try {
      nodes.push({ id: "__probe__" } as never);
      pushed = true;
    } catch {
      // 写入被拒（frozen）时同样合法：本用例只管「别名」，不管冻结，放 Test 4 管。
    }

    try {
      // 这两条是本用例的承重处：若三成员指向同一数组，push 后 edges/groups 也会 +1。
      expect(edges).toHaveLength(before.edges);
      expect(groups).toHaveLength(before.groups);
      // 写入若「成功」就必须真的多了一项 —— push 被静默吞掉的话契约不成立。
      expect(nodes).toHaveLength(pushed ? before.nodes + 1 : before.nodes);
    } finally {
      if (nodes.length !== before.nodes) {
        nodes.length = before.nodes;
      }
    }

    // 撤销之后仍是空剪贴板，供后续用例使用。
    expect(nodes).toHaveLength(0);
  });

  test("容器与三个成员当前均未冻结, push 写入不抛错且生效（冻结的双向 tripwire）", () => {
    // 本组断言刻意锁住「当前未冻结」：日后有人 Object.freeze 容器、或只冻结其中
    // 一个成员（漏网的正是最危险的一档），下面任意一条都会变红。
    expect(Object.isFrozen(EMPTY_CANVAS_CLIPBOARD)).toBe(false);

    for (const member of CLIPBOARD_MEMBERS) {
      expect(Object.isFrozen(EMPTY_CANVAS_CLIPBOARD[member])).toBe(false);

      const { threw, after } = writeMember(EMPTY_CANVAS_CLIPBOARD, member);
      expect(threw).toBe(false);
      expect(after).toBe(1);
    }

    // 三个成员都已撤销回空。
    expect(memberLengths(EMPTY_CANVAS_CLIPBOARD)).toEqual({ nodes: 0, edges: 0, groups: 0 });
  });

  test("生产消费点跑一遍后, 常量仍是空剪贴板且成员引用未变", () => {
    const before = memberLengths(EMPTY_CANVAS_CLIPBOARD);
    const refs: Record<ClipboardMember, unknown> = {
      nodes: EMPTY_CANVAS_CLIPBOARD.nodes,
      edges: EMPTY_CANVAS_CLIPBOARD.edges,
      groups: EMPTY_CANVAS_CLIPBOARD.groups
    };

    // 三条真实读路径：量边界、克隆、构建。
    expect(canvasClipboardBounds(EMPTY_CANVAS_CLIPBOARD)).toBeNull();
    expect(cloneCanvasClipboard(EMPTY_CANVAS_CLIPBOARD, { x: 0, y: 0 }, () => "n", () => "e", () => "g")).toEqual({
      nodes: [],
      edges: [],
      groups: []
    });
    expect(buildCanvasClipboard([], [], [], [], [])).toEqual({ nodes: [], edges: [], groups: [] });

    for (const member of CLIPBOARD_MEMBERS) {
      expect(EMPTY_CANVAS_CLIPBOARD[member]).toHaveLength(before[member]);
      expect(EMPTY_CANVAS_CLIPBOARD[member]).toBe(refs[member]);
    }
  });

  test("空结果的产出方不复用常量的三个数组", () => {
    const built = buildCanvasClipboard([], [], [], [], []);
    expect(built.nodes).not.toBe(EMPTY_CANVAS_CLIPBOARD.nodes);
    expect(built.edges).not.toBe(EMPTY_CANVAS_CLIPBOARD.edges);
    expect(built.groups).not.toBe(EMPTY_CANVAS_CLIPBOARD.groups);

    const cloned = cloneCanvasClipboard(EMPTY_CANVAS_CLIPBOARD, { x: 0, y: 0 }, () => "n", () => "e", () => "g");
    expect(cloned.nodes).not.toBe(EMPTY_CANVAS_CLIPBOARD.nodes);
    expect(cloned.edges).not.toBe(EMPTY_CANVAS_CLIPBOARD.edges);
    expect(cloned.groups).not.toBe(EMPTY_CANVAS_CLIPBOARD.groups);
  });

  test("浅拷贝不提供隔离：三个成员仍与源共享（已知 hazard, 显式记录）", () => {
    // source 未冻结 ⇒ 展开出的副本挡不住写：往 copy.nodes 推一项 = 往常量里推一项。
    // 这条断言的用处是让「展开一下就安全了」这个误解在代码里可见、可被变异打红。
    const copy: CanvasClipboard = { ...EMPTY_CANVAS_CLIPBOARD };

    expect(copy.nodes).toBe(EMPTY_CANVAS_CLIPBOARD.nodes);
    expect(copy.edges).toBe(EMPTY_CANVAS_CLIPBOARD.edges);
    expect(copy.groups).toBe(EMPTY_CANVAS_CLIPBOARD.groups);
  });

  test("多次读取 / 再次 import 模块恒等同一对象与同一组成员", async () => {
    // 说明：本条只能被「const 改成 getter / 工厂」这类重构打红（模块级 const 在
    // 单次模块求值内本就同一引用）；别名与冻结的承重守卫在前面的用例里。
    const reimported = await import("./selectionActions");

    expect(reimported.EMPTY_CANVAS_CLIPBOARD).toBe(EMPTY_CANVAS_CLIPBOARD);
    expect(reimported.EMPTY_CANVAS_CLIPBOARD.nodes).toBe(EMPTY_CANVAS_CLIPBOARD.nodes);
    expect(reimported.EMPTY_CANVAS_CLIPBOARD.edges).toBe(EMPTY_CANVAS_CLIPBOARD.edges);
    expect(reimported.EMPTY_CANVAS_CLIPBOARD.groups).toBe(EMPTY_CANVAS_CLIPBOARD.groups);
  });
});