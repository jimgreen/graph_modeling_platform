// 已存方案树的三个遍历/归一函数（`src/model-routing.ts`）
//   uniqueRecordName                  在已有名字集合里挑一个不撞名的
//   normalizeSavedSchemeRecordNames   逐层给方案/项目加唯一后缀
//   findSavedSchemeParentById         深度优先找某节点的父
//   mapSavedSchemeTree                逐节点跑 mapper（含结构共享）
//
// 判错的后果：侧栏里出现**两个同名方案**（用户改不动、分不清），
// 或拖拽/重命名时作用到了错的节点 —— 都只表现为界面困惑，**不报错**。
import { describe, expect, test } from "vitest";
import {
  findSavedSchemeParentById,
  mapSavedSchemeTree,
  normalizeSavedProjectRecordNames,
  normalizeSavedSchemeRecordNames,
  savedProjectRecordNameKey,
  uniqueRecordName
} from "./model-routing";

type Rec = { id: string; name: string; projects?: unknown[]; children?: Rec[] };
const S = (name: string, over: Partial<Rec> = {}): Rec => ({ id: `id-${name}`, name, ...over });
const P = (name: string) => ({ id: `p-${name}`, name, project: { name } });
const FALLBACK = "未命名方案";
const uniq = (base: string, used: string[], fallback = FALLBACK) => uniqueRecordName(base, used, fallback);

describe("uniqueRecordName：撞名就加 ` (N)` 后缀", () => {
  test("不撞名原样返回（trim 后）", () => {
    expect(uniq("Foo", [])).toBe("Foo");
    expect(uniq("  Foo  ", [])).toBe("Foo");
    expect(uniq("Foo", ["Bar"])).toBe("Foo");
    // ★ 存在 `X (2)` 但没有 `X` 时**不**算撞名
    expect(uniq("X", ["X (2)"])).toBe("X");
  });

  test("★ 大小写敏感（`foo` 不挡住 `Foo`）", () => {
    expect(uniq("Foo", ["foo"])).toBe("Foo");
    expect(uniq("foo", ["Foo"])).toBe("foo");
  });

  test("★ 已有名字先 trim 再比，所以带空白的同名算撞名", () => {
    expect(uniq("Foo", ["  Foo  "])).toBe("Foo (2)");
    expect(uniq("  Foo  ", ["Foo"])).toBe("Foo (2)");
    expect(uniq("Foo", ["\tFoo\n"])).toBe("Foo (2)");
  });

  test("空串已有名不参与（`filter(Boolean)`）", () => {
    expect(uniq("Foo", ["", "   ", "Foo"])).toBe("Foo (2)");
    // 只有空串时完全不撞
    expect(uniq("Foo", ["", "   "])).toBe("Foo");
  });

  test("★ base 是空白 → 走 fallback", () => {
    expect(uniq("", [])).toBe(FALLBACK);
    expect(uniq("   ", [])).toBe(FALLBACK);
    expect(uniq("\t\n", [])).toBe(FALLBACK);
    // fallback 也能自定义
    expect(uniqueRecordName("  ", [], "Untitled")).toBe("Untitled");
  });

  test("★ fallback 也撞名时同样加后缀", () => {
    expect(uniq("", [FALLBACK])).toBe(`${FALLBACK} (2)`);
    expect(uniq("   ", [FALLBACK])).toBe(`${FALLBACK} (2)`);
  });

  test("★ 第一个后缀是 ` (2)`，不是 ` (1)`", () => {
    expect(uniq("Foo", ["Foo"])).toBe("Foo (2)");
    expect("Foo (1)", "★ 1 号位永远跳过").not.toBe(uniq("Foo", ["Foo"]));
  });

  test("★ 后缀链式递增，跳过已占用的", () => {
    expect(uniq("Foo", ["Foo", "Foo (2)"])).toBe("Foo (3)");
    expect(uniq("Foo", ["Foo", "Foo (2)", "Foo (3)"])).toBe("Foo (4)");
    // 断档：占着 (3) 但 (2) 空着 → 用 (2)
    expect(uniq("Foo", ["Foo", "Foo (3)"])).toBe("Foo (2)");
  });

  test("★ 长链也能一路数上去", () => {
    const used = ["Foo"];
    for (let i = 2; i <= 6; i += 1) used.push(`Foo (${i})`);
    expect(uniq("Foo", used)).toBe("Foo (7)");
  });

  test("后缀是精确匹配（`Foo (2) x` 不占用 `Foo (2)`）", () => {
    expect(uniq("Foo", ["Foo", "Foo (2) x"])).toBe("Foo (2)");
    expect(uniq("Foo", ["Foo", "Foo ( 2 )"])).toBe("Foo (2)");
    expect(uniq("Foo", ["Foo", "Foo(2)"])).toBe("Foo (2)");
  });

  test("不影响入参数组", () => {
    const used = ["Foo", "Foo (2)"];
    uniq("Bar", used);
    expect(used).toEqual(["Foo", "Foo (2)"]);
  });
});

describe("★ normalizeSavedSchemeRecordNames：逐层去重", () => {
  test("同层重名依次加后缀", () => {
    const out = normalizeSavedSchemeRecordNames([S("A"), S("A"), S("A"), S("B"), S("A")] as never);
    expect(out.map((s) => s.name)).toEqual(["A", "A (2)", "A (3)", "B", "A (4)"]);
  });

  test("★ 每层**独立**计数（父子可重名）", () => {
    const out = normalizeSavedSchemeRecordNames([
      S("A", { children: [S("A"), S("A")] }),
      S("B", { children: [S("A")] })
    ] as never);
    expect(out.map((s) => s.name), "★ 顶层无重名").toEqual(["A", "B"]);
    // A 的子层里 A/A → A、A (2)
    expect(out[0].children!.map((s) => s.name)).toEqual(["A", "A (2)"]);
    // B 的子层只有一个 A → 不加后缀（**不继承父层的 usedNames**）
    expect(out[1].children!.map((s) => s.name)).toEqual(["A"]);
  });

  test("★ 兄弟子层之间也各自独立", () => {
    const out = normalizeSavedSchemeRecordNames([
      S("P1", { children: [S("C")] }),
      S("P2", { children: [S("C")] })
    ] as never);
    expect(out[0].children!.map((s) => s.name)).toEqual(["C"]);
    expect(out[1].children!.map((s) => s.name)).toEqual(["C"]);
  });

  test("★ 空白名 → fallback，且 fallback 也参与去重", () => {
    const out = normalizeSavedSchemeRecordNames([S(""), S("   "), S("\t\n"), S("A")] as never);
    expect(out.map((s) => s.name)).toEqual([FALLBACK, `${FALLBACK} (2)`, `${FALLBACK} (3)`, "A"]);
  });

  test("★ 空白名与真名「未命名方案」撞车", () => {
    const out = normalizeSavedSchemeRecordNames([S(FALLBACK), S("")] as never);
    expect(out.map((s) => s.name)).toEqual([FALLBACK, `${FALLBACK} (2)`]);
  });

  test("★ projects 层是**合并**（丢弃），不是加后缀 —— 与方案层相反", () => {
    // `normalizeSavedProjectRecordNames` 用 `indexByNameKey` 按名去重，
    // 命中就把 `normalized[existingIndex]` **覆盖**掉 —— 重名模型**静默丢失**。
    // 我第一版按方案层的规则写成「M (2)」，被顶回。
    const model = (id: string) => ({ id, name: "M", project: { name: "M" } });
    const out = normalizeSavedSchemeRecordNames([
      S("A", { projects: [model("m1"), model("m2"), model("m3")] })
    ] as never);
    const projects = out[0].projects as Array<{ id: string; name: string }>;
    expect(projects, "★ 三个同名模型只剩一个").toHaveLength(1);
    // 全部无 `updatedAt` → 时间戳都是 0 → `candidate >= existing` 恒真 → **后出现**的胜出
    expect(projects[0].id).toBe("m3");
    expect(projects.map((p) => p.name)).toEqual(["M"]);
  });

  test("缺 projects / children → 补空数组", () => {
    const out = normalizeSavedSchemeRecordNames([{ id: "x", name: "A" }] as never);
    expect(out[0].projects).toEqual([]);
    expect(out[0].children).toEqual([]);
  });

  test("非数组的 projects / children → 空数组（不抛）", () => {
    const out = normalizeSavedSchemeRecordNames([
      S("A", { projects: { a: 1 } as never, children: "notarray" as never })
    ] as never);
    expect(out[0].projects).toEqual([]);
    expect(out[0].children).toEqual([]);
  });

  test("空数组 → 空数组", () => {
    expect(normalizeSavedSchemeRecordNames([])).toEqual([]);
  });

  test("★ 其它字段原样透传", () => {
    const out = normalizeSavedSchemeRecordNames([{ id: "x", name: "A", extra: 1, createdAt: "T" }] as never);
    expect(out[0]).toEqual({ id: "x", name: "A", extra: 1, createdAt: "T", projects: [], children: [] });
  });

  test("★ 每次调用都返回**新数组 + 新元素**（结构共享分支不可达）", () => {
    // 源码有 `return changed ? normalized : schemes`，但 `record` 是字面量
    // `const record = { ...scheme, name, projects, children }` —— **永远**是新对象，
    // 于是 `record !== scheme` 恒真 → `changed` 恒真 → 永远返回 `normalized`。
    // 探针实测：名字已经干净的输入，元素引用也变了。
    // **判定不修**：这是无害的冗余（多一次浅拷贝），且改成真共享要额外判断
    // 「projects/children 归一后是否仍同引用」，收益低于风险。
    const clean = [S("A"), S("B")];
    const out = normalizeSavedSchemeRecordNames(clean as never);
    expect(out).not.toBe(clean);
    expect(out[0], "★ 元素也是新引用").not.toBe(clean[0]);
    expect(out[1]).not.toBe(clean[1]);
    // 但值相等
    expect(out.map((s) => s.name)).toEqual(["A", "B"]);
    // 前提：字面量展开必得新对象
    const src = { id: "z", name: "Z" };
    expect({ ...src, name: "Z" }).not.toBe(src);
  });

  test("不改入参（元素不被就地改写）", () => {
    const input = [S("  A  ", { children: [S("A")] })];
    const snapshot = JSON.stringify(input);
    normalizeSavedSchemeRecordNames(input as never);
    expect(JSON.stringify(input), "★ 入参不变").toBe(snapshot);
  });

  test("深层的重名也会被处理", () => {
    const out = normalizeSavedSchemeRecordNames([
      S("L1", { children: [S("L2", { children: [S("L3"), S("L3")] })] })
    ] as never);
    expect(out[0].children![0].children!.map((s) => s.name)).toEqual(["L3", "L3 (2)"]);
  });
});

describe("★ mapSavedSchemeTree：逐节点 mapper + 结构共享", () => {
  const tree = () => [
    S("A", { children: [S("A1", { children: [S("A1a")] }), S("A2")] }),
    S("B")
  ];

  test("mapper 深度优先、自底向上调用", () => {
    // 源码先递归 children 再 `mapper(normalizedScheme)` ⇒ 子树先于父
    const seen: string[] = [];
    mapSavedSchemeTree(tree() as never, (s) => { seen.push(s.name); return s; });
    expect(seen).toEqual(["A1a", "A1", "A2", "A", "B"]);
  });

  test("mapper 的改动逐层传上来", () => {
    const out = mapSavedSchemeTree(tree() as never, (s) => ({ ...s, name: `${s.name}!` }));
    expect(out.map((s) => s.name)).toEqual(["A!", "B!"]);
    expect(out[0].children!.map((s) => s.name)).toEqual(["A1!", "A2!"]);
    expect(out[0].children![0].children!.map((s) => s.name)).toEqual(["A1a!"]);
  });

  test("★ 无改动时返回**原数组引用**（与上一个函数相反）", () => {
    const input = tree();
    const out = mapSavedSchemeTree(input as never, (s) => s);
    expect(out).toBe(input);
    expect(out[0]).toBe(input[0]);
    expect(out[0].children).toBe(input[0].children);
  });

  test("★ 改动会沿路径**向上冒泡**（父元素也换引用）", () => {
    const input = tree();
    const out = mapSavedSchemeTree(input as never, (s) => (s.name === "A1a" ? { ...s, name: "Z" } : s));
    expect(out, "★ 数组换引用").not.toBe(input);
    // ★ A 的 children 变了 ⇒ `nextChildren !== children` ⇒ 构造新 A ⇒ A 也换引用。
    // 我第一版以为「只有改动的节点换引用」，被顶回 —— 路径上的祖先全都换。
    expect(out[0], "★ 祖先 A 也换引用（子数组变了）").not.toBe(input[0]);
    expect(out[0].children![0], "★ 改的是 A1").not.toBe(input[0].children![0]);
    expect(out[0].children![0].children![0].name).toBe("Z");
    // ★ 与改动**无关**的分支保持原引用
    expect(out[0].children![1], "★ A2 保持原引用").toBe(input[0].children![1]);
    expect(out[1], "★ 顶层 B 保持原引用").toBe(input[1]);
  });

  test("★ children 缺省时**不补**空数组（与 normalize 相反）", () => {
    // `savedSchemeChildren` 给的是临时 `[]`，`children.length === 0` ⇒
    // `nextChildren === children` ⇒ 不构造新对象 ⇒ 元素原样。
    const noKids = [{ id: "n", name: "N" }];
    const out = mapSavedSchemeTree(noKids as never, (s) => s);
    expect(out).toBe(noKids);
    expect(out[0].children, "★ 仍然是 undefined").toBeUndefined();
  });

  test("★ 等价变异 ⑰：`mapSavedSchemeTree(children, mapper)` 不必加 `length > 0` 判断", () => {
    // 变异：把
    //   `children.length > 0 ? mapSavedSchemeTree(children, mapper) : children`
    // 改成
    //   `mapSavedSchemeTree(children, mapper)`
    // 首轮全绿。查清原因 —— 它**确实**恒等，靠的是一个不明显的前提：
    //   `mapSavedSchemeTree([], mapper)` 走完是 `changed === false` ⇒
    //   返回 `changed ? mapped : schemes` 里的 **`schemes`（形参本身）**，
    //   也就是调用方传进去的那个 `[]` 引用。所以
    //   `nextChildren === children` 依然成立，行为与三元写法完全一致。
    //
    //   ⚠ 什么会让它失效：若 `mapSavedSchemeTree` 改成无条件 `return mapped`，
    //      空数组分支就会返回**新的** `[]` ⇒ `nextChildren !== children`
    //      ⇒ 给缺 children 的节点补上 `children: []`（变异 ⑯ 就是这个方向）。
    // 下面把这个前提写成可执行断言。
    const named = [] as never[];
    const emptyResult = mapSavedSchemeTree(named, (s) => s);
    expect(emptyResult, "★ 空输入返回的就是形参本身").toBe(named);
    // 前提：`changed` 假时返回形参 —— 两次调用互不相等证明不是内部新建的常量
    const a = mapSavedSchemeTree([] as never, (s) => s);
    const b = mapSavedSchemeTree([] as never, (s) => s);
    expect(a).not.toBe(b);
    // 行为等价：两种写法对「缺 children」与「空 children 数组」都不改元素
    const noKids = [{ id: "n", name: "N" }];
    const emptyKids = [{ id: "n", name: "N", children: [] }];
    for (const input of [noKids, emptyKids]) {
      const out = mapSavedSchemeTree(input as never, (s) => s);
      expect(out, "★ 元素原样").toBe(input);
    }
  });

  test("非数组的 children 当空数组用", () => {
    const weird = [S("A", { children: "notarray" as never })];
    const out = mapSavedSchemeTree(weird as never, (s) => ({ ...s, name: "X" }));
    expect(out[0].name).toBe("X");
  });

  test("空数组 → 空数组（mapper 一次都不调）", () => {
    let calls = 0;
    const out = mapSavedSchemeTree([] as never, (s) => { calls += 1; return s; });
    expect(out).toEqual([]);
    expect(calls, "★ 没有节点").toBe(0);
  });

  test("mapper 抛错向上传播（不吞）", () => {
    expect(() => mapSavedSchemeTree(tree() as never, () => { throw new Error("boom"); })).toThrow("boom");
  });

  test("★ 不改入参（mapper 之外的遍历是只读的）", () => {
    const input = tree();
    const snapshot = JSON.stringify(input);
    mapSavedSchemeTree(input as never, (s) => s);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  test("同一棵树恒得同一结果（无模块级状态）", () => {
    const input = tree();
    const once = mapSavedSchemeTree(input as never, (s) => ({ ...s, name: `${s.name}!` }));
    for (let i = 0; i < 20; i += 1) {
      expect(mapSavedSchemeTree(input as never, (s) => ({ ...s, name: `${s.name}!` }))).toEqual(once);
    }
  });
});

describe("★ findSavedSchemeParentById：返回**父**不是自己", () => {
  const tree = (): Rec[] => [
    S("A", { id: "A", children: [S("A1", { id: "A1", children: [S("A1a", { id: "A1a" })] })] }),
    S("B", { id: "B" })
  ];

  test("深层子节点能逐级找到父", () => {
    expect(findSavedSchemeParentById(tree() as never, "A1")?.id).toBe("A");
    expect(findSavedSchemeParentById(tree() as never, "A1a")?.id).toBe("A1");
  });

  test("★ 顶层节点**找不到父**（只搜 children）", () => {
    // 契约：这不是「按 id 找节点」，是「按 id 找父」。
    // 所以顶层节点的 id 查不到任何东西 —— 调用方想找顶层节点得自己遍历。
    expect(findSavedSchemeParentById(tree() as never, "A")).toBeUndefined();
    expect(findSavedSchemeParentById(tree() as never, "B")).toBeUndefined();
  });

  test("找不到的 id / 空 id / 空树 → `undefined`", () => {
    expect(findSavedSchemeParentById(tree() as never, "zz")).toBeUndefined();
    expect(findSavedSchemeParentById(tree() as never, "")).toBeUndefined();
    expect(findSavedSchemeParentById([], "A")).toBeUndefined();
  });

  test("★ 重复 id 返回**深度优先最先命中**的父", () => {
    const dup: Rec[] = [
      S("P1", { id: "P1", children: [S("X", { id: "X" })] }),
      S("P2", { id: "P2", children: [S("X", { id: "X" })] })
    ];
    expect(findSavedSchemeParentById(dup as never, "X")?.name).toBe("P1");
  });

  test("★ 先查**直接子**再递归子树", () => {
    // 若某节点的直接子命中，立即返回，不继续看孙层
    const mixed: Rec[] = [
      S("P", { id: "P", children: [S("Dup", { id: "Dup" }), S("Q", { id: "Q", children: [S("Dup", { id: "Dup" })] })] })
    ];
    expect(findSavedSchemeParentById(mixed as never, "Dup")?.id).toBe("P");
  });

  test("★ 比较是 `===`（同类型比值，不跨类型）", () => {
    // `child.id === schemeId` 是严格相等。数字与数字相等，
    // 但数字与字符串**不**相等 —— 所以「传错类型」表现为查不到父。
    // 我第一版以为 `id: 1` 配 `schemeId: 1` 也查不到，被顶回。
    const numeric: Rec[] = [S("P", { id: "P", children: [{ id: 1, name: "one" } as never] })];
    expect(findSavedSchemeParentById(numeric as never, 1 as never)?.id, "★ 1 === 1 命中").toBe("P");
    expect(findSavedSchemeParentById(numeric as never, "1"), "★ 1 === \"1\" 不命中").toBeUndefined();
    // 前提
    expect(1 === (1 as never)).toBe(true);
    expect(1 === ("1" as never)).toBe(false);
  });

  test("返回的是**原对象引用**（不是拷贝）", () => {
    const input = tree();
    const parent = findSavedSchemeParentById(input as never, "A1");
    expect(parent).toBe(input[0]);
  });

  test("★ 空 `schemeId` 的早返回不是冗余（有子节点 id 为空串时会漏）", () => {
    // 变异 `if (!schemeId) return undefined;` 改 `if (false)` 首轮全绿 ——
    // 查清原因：我的树里没有 `id === ""` 的子节点，所以「去掉早返回」不改变结果。
    // 鉴别输入：**空 id 的子节点**。此时去掉早返回会返回那个父节点。
    const withEmptyChild: Rec[] = [
      S("P", { id: "P", children: [{ id: "", name: "匿名" }] })
    ];
    expect(findSavedSchemeParentById(withEmptyChild as never, "")?.id, "★ 早返回挡住了").toBeUndefined();
    // 对照：非空 id 时早返回不生效，正常往上找
    expect(findSavedSchemeParentById(withEmptyChild as never, "匿名" as never)).toBeUndefined();
    // 前提：`"" || []` 都 falsy，循环里 `child.id === ""` 会命中
    expect(Boolean("")).toBe(false);
    expect(withEmptyChild[0].children![0].id === "").toBe(true);
  });

  test("★ 等价变异 ⑬：删掉末尾的 `return undefined` 是**恒等**的", () => {
    // 变异：把 `return undefined;` 从函数尾删掉。首轮全绿。
    //   —— `findSavedSchemeParentById` 的返回类型是 `SavedSchemeRecord | undefined`，
    //      走完 for 循环后函数体自然落到末尾、隐式返回 `undefined`。
    //   ⇒ 运行时行为**逐位相同**。全绿是**正确**的。
    //
    //   ⚠ 什么会让它失效：① 打开 `noImplicitReturns`（tsc 报 TS7030）；
    //      ② 未来在循环后加别的出口。
    // 下面把这个前提变成可执行断言。
    const input = tree();
    // 「显式返回 undefined」与「让函数自己落到底」在观测上不可区分
    const explicit = (id: string) => {
      const found = findSavedSchemeParentById(input as never, id);
      return found === undefined ? undefined : found;
    };
    for (const id of ["A1", "A1a", "A", "zz", ""]) {
      expect(explicit(id), id).toBe(findSavedSchemeParentById(input as never, id));
    }
    // 前提：JS 函数走完函数体隐式返回 undefined
    const implicit = () => { for (const _ of []) { void _; } };
    expect(implicit()).toBeUndefined();
    // 而「找不到父」这条路径确实落在函数末尾
    expect(findSavedSchemeParentById(input as never, "A")).toBeUndefined();
  });

  test("不改入参", () => {
    const input = tree();
    const snapshot = JSON.stringify(input);
    findSavedSchemeParentById(input as never, "A1a");
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe("★ normalizeSavedProjectRecordNames：同名模型**合并**（不加分隔）", () => {
  const M = (id: string, name = "M", over: Record<string, unknown> = {}) => ({
    id, name, project: { name }, ...over
  });
  const ids = (out: Array<{ id: string }>) => out.map((p) => p.id);
  const T = (iso: string) => iso;

  test("★ 三个同名模型只剩一个（其余**静默丢弃**）", () => {
    const out = normalizeSavedProjectRecordNames([M("a"), M("b"), M("c")] as never);
    expect(out, "★ 长度 1，不是 3").toHaveLength(1);
    expect(out[0].name).toBe("M");
  });

  test("★ 保留 updatedAt **较新**的那个（与数组顺序无关）", () => {
    const old = M("old", "M", { updatedAt: T("2020-01-01T00:00:00.000Z") });
    const mid = M("mid", "M", { updatedAt: T("2022-01-01T00:00:00.000Z") });
    const young = M("young", "M", { updatedAt: T("2021-01-01T00:00:00.000Z") });
    expect(ids(normalizeSavedProjectRecordNames([old, mid, young] as never))).toEqual(["mid"]);
    // 顺序颠倒，结果不变 —— 时间戳是唯一的判据
    expect(ids(normalizeSavedProjectRecordNames([young, mid, old] as never))).toEqual(["mid"]);
    expect(ids(normalizeSavedProjectRecordNames([mid, old, young] as never))).toEqual(["mid"]);
  });

  test("★ 时间戳全相等（都没有 updatedAt）→ **后出现**的胜出", () => {
    // `candidateTimestamp >= existingTimestamp` —— 0 >= 0 恒真 ⇒ 逐个覆盖
    expect(ids(normalizeSavedProjectRecordNames([M("first"), M("second"), M("third")] as never)))
      .toEqual(["third"]);
  });

  test("★ 坏时间戳算 0（等同没有），所以真戳永远赢", () => {
    const good = M("good", "M", { updatedAt: T("2026-01-01T00:00:00.000Z") });
    const bad = M("bad", "M", { updatedAt: "not-a-date" });
    expect(ids(normalizeSavedProjectRecordNames([bad, good] as never))).toEqual(["good"]);
    expect(ids(normalizeSavedProjectRecordNames([good, bad] as never))).toEqual(["good"]);
    // 前提：Date.parse 坏值给 NaN，`Number.isFinite(NaN)` 假 → 0
    expect(Number.isFinite(Date.parse("not-a-date"))).toBe(false);
    expect(Date.parse("2026-01-01T00:00:00.000Z")).toBeGreaterThan(0);
  });

  test("★ 兜底值是 `0` 而不是负数（两条都坏戳时靠它分胜负）", () => {
    // 变异 `savedRecordTimestamp` 的 `: 0` 改 `: -1` 时首轮全绿。
    // 查清原因：我只测了「一好一坏」，而那两种兜底值给出的比较结果**相同**
    //   （0 >= real 与 -1 >= real 都是假；real >= 0 与 real >= -1 都是真）。
    // 真正的鉴别输入是**两条都坏戳**：
    //   · 兜底 0  → `0 >= 0` 恒真 → **后出现**的覆盖
    //   · 兜底 -1 → `0 >= -1` 也真 → 同样后出现覆盖… 但顺序反转时就有别了
    // 见下一条断言。
    const badA = M("badA", "M", { updatedAt: "not-a-date" });
    const badB = M("badB", "M", { updatedAt: "also-bad" });
    const noneA = M("noneA", "M");
    const noneB = M("noneB", "M");
    // 两条都坏 → 后出现胜（等价于没有时间戳）
    expect(ids(normalizeSavedProjectRecordNames([badA, badB] as never))).toEqual(["badB"]);
    expect(ids(normalizeSavedProjectRecordNames([noneA, noneB] as never))).toEqual(["noneB"]);
    // ★ 鉴别点：坏戳与「没有 updatedAt」**等价**，都算 0
    expect(ids(normalizeSavedProjectRecordNames([noneA, badB] as never)), "★ 都没有时间戳 → 后者胜")
      .toEqual(["badB"]);
    expect(ids(normalizeSavedProjectRecordNames([badA, noneB] as never)), "★ 同上")
      .toEqual(["noneB"]);
    // 前提：Date.parse("") 是 NaN → 0，与 Date.parse("not-a-date") 同样落 0
    expect(Number.isFinite(Date.parse(""))).toBe(false);
    expect(Date.parse("") ?? 0).toBeNaN();
  });

  test("★ 时间戳**恰好是 0**（epoch）与兜底值同值时，靠兜底值分胜负", () => {
    // 变异 `savedRecordTimestamp` 的 `: 0` 改 `: -1` 在上面那条之后**仍全绿**。
    // 第三次查原因才找到鉴别输入：`Date.parse("1970-01-01T00:00:00.000Z") === 0`，
    // 而 0 正是兜底值。于是「epoch 记录」与「坏戳记录」落到**同一个数**，
    // `>=` 的方向就决定了谁胜出，而兜底值不同会翻转结果。
    //
    //   兜底 0（现状）：坏戳当候选 → `0 >= 0` 真 → **坏戳覆盖 epoch**
    //   兜底 -1（变异）：坏戳当候选 → `-1 >= 0` 假 → **epoch 保留**
    const epoch = M("epoch", "M", { updatedAt: T("1970-01-01T00:00:00.000Z") });
    const bad = M("bad", "M", { updatedAt: "not-a-date" });
    // 前提：epoch 的时间戳就是 0，且是有限数（不走兜底）
    expect(Date.parse(T("1970-01-01T00:00:00.000Z"))).toBe(0);
    expect(Number.isFinite(Date.parse(T("1970-01-01T00:00:00.000Z")))).toBe(true);
    // 现状行为：平局 → 后出现者覆盖
    expect(ids(normalizeSavedProjectRecordNames([epoch, bad] as never))).toEqual(["bad"]);
    expect(ids(normalizeSavedProjectRecordNames([bad, epoch] as never))).toEqual(["epoch"]);
    // 负时间戳（1970 之前）**小于**兜底 0 ⇒ 坏戳当候选时会覆盖它
    // 我第一版以为「真戳不会被兜底值覆盖」，方向写反了，被顶回。
    const pre1970 = M("pre", "M", { updatedAt: T("1960-01-01T00:00:00.000Z") });
    expect(Date.parse(T("1960-01-01T00:00:00.000Z"))).toBeLessThan(0);
    expect(0).toBeGreaterThan(Date.parse(T("1960-01-01T00:00:00.000Z")));
    expect(ids(normalizeSavedProjectRecordNames([pre1970, bad] as never)), "★ 兜底 0 更大 → 坏戳胜")
      .toEqual(["bad"]);
    expect(ids(normalizeSavedProjectRecordNames([bad, pre1970] as never)),
      "★ 顺序反了也一样：候选是负戳，比不过已有的 0").toEqual(["bad"]);
  });

  test("★ 合并键是**小写化**的显示名 → 大小写不同也合并", () => {
    // `savedProjectRecordNameKey` = `savedProjectDisplayName(name).toLocaleLowerCase()`
    const out = normalizeSavedProjectRecordNames([M("up", "M"), M("low", "m")] as never);
    expect(out, "★ 只剩一个").toHaveLength(1);
    // 全部无 updatedAt → 后者胜出
    expect(out[0].id).toBe("low");
    expect(savedProjectRecordNameKey("M")).toBe("m");
    expect(savedProjectRecordNameKey("m")).toBe("m");
  });

  test("★ 带 `(N)` 后缀的名字是**不同**模型", () => {
    // 源码注释明确写了这条规则：若把 `\"M (2)\"` 归一化掉，
    // 新建/重命名/导入的同名模型会被静默合并进已有模型。
    const out = normalizeSavedProjectRecordNames([M("a", "M"), M("b", "M (2)")] as never);
    expect(ids(out), "★ 两个都留").toEqual(["a", "b"]);
    expect(savedProjectRecordNameKey("M")).not.toBe(savedProjectRecordNameKey("M (2)"));
  });

  test("★ 空白名 → fallback，多个空名合并成一个", () => {
    const out = normalizeSavedProjectRecordNames([M("a", ""), M("b", "   "), M("c", "\t")] as never);
    expect(out, "★ 三个空名合并成一个").toHaveLength(1);
    expect(out[0].name, "★ fallback 是「未命名模型」").toBe("未命名模型");
  });

  test("顺序按**首次出现**的位置排", () => {
    const out = normalizeSavedProjectRecordNames([
      M("z1", "Z"), M("a1", "A"), M("z2", "Z")
    ] as never);
    expect(out.map((p) => p.name), "★ Z 仍在第一位").toEqual(["Z", "A"]);
    expect(out[0].id, "★ 但记录是后出现的").toBe("z2");
  });

  test("★ `project.name` 与外层 `name` 同步", () => {
    const out = normalizeSavedProjectRecordNames([
      { id: "x", name: "M", extra: 1, project: { name: "旧名", other: 2 } }
    ] as never);
    expect(out[0].name).toBe("M");
    expect(out[0].project.name, "★ 内层同步").toBe("M");
    // 其它字段透传（`{ ...project }` 与 `{ ...project.project }` 各自浅拷贝）
    const rec = out[0] as unknown as { extra: number; project: { other: number } };
    expect(rec.extra, "★ 顶层其它字段透传").toBe(1);
    expect(rec.project.other, "★ project 里的其它字段也透传").toBe(2);
  });

  test("空数组 → 空数组", () => {
    expect(normalizeSavedProjectRecordNames([])).toEqual([]);
  });

  test("不改入参", () => {
    const input = [M("a"), M("b")];
    const snapshot = JSON.stringify(input);
    normalizeSavedProjectRecordNames(input as never);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  test("同一输入恒得同一结果", () => {
    const input = [M("a"), M("b", "M", { updatedAt: T("2026-01-01T00:00:00.000Z") })];
    const once = normalizeSavedProjectRecordNames(input as never);
    for (let i = 0; i < 20; i += 1) {
      expect(normalizeSavedProjectRecordNames(input as never)).toEqual(once);
    }
  });
});
