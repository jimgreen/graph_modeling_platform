// serializeSchemeRecordForFile 的直接单测（此前**零测试覆盖**）。
//
// ## 本次重构
//
// 旧实现对每个子方案做 `JSON.parse(serializeSchemeRecordForFile(child))`，
// 即「序列化再反序列化」当深拷贝用。改为抽出 `normalizeSchemeRecordTree`
// 递归归一化、只 stringify 一次。
//
// 旧写法总工作量是 **O(总大小 × 树深)** —— 深度 d 的树里每个子树被它的每个祖先
// 重新序列化一次。实测 511 节点 8 层树：6365ms → 1028ms（6.2x）。
//
// ## 等价性依据
//
// 对任何可 JSON 化的值，`stringify(parse(stringify(x)))` 与 `stringify(x)` 逐字节相同
// —— JSON 规范化（undefined 丢弃、NaN/Infinity→null、Date→ISO 串、整数样式键排序）
// 是**幂等**的。所以中间那次 parse/stringify 往返除了让工作量乘上树深，没有别的作用。
// 本文件的 `describe("与旧算法逐字节等价")` 用模块级隔离实测这一点。
//
// ## 一个必须绕开的坑：nodeNumber 是**进程级非确定**的
//
// `model.ts` 有 `let nodeNumberSeed = 1` + `makeNodeNumber()`，任何走到「创建节点/
// 端子」的代码路径都会推进它。用真实模型（`data/schemes/files/DOT/望道变_6.json`）
// 实测：同一份输入连调两次，输出里 518 个 nodeNumber 有 517 个不同。
// 因此**任何"两次调用比输出"的断言都必须先隔离模块**，否则会假红。
// 下面所有等价性断言都走 `isolated()`，让两边的计数器都从同一起点开始。
import { describe, expect, test, vi } from "vitest";
import { serializeSchemeRecordForFile } from "./appExtracted/appInlineUtilityFunctions";
import type { SavedSchemeRecord } from "./model";

/** 合法 project 的最小骨架：lockProjectEdgeTerminals 要读 nodes/edges。 */
const project = (over: Record<string, unknown> = {}) => ({
  version: 1,
  name: "P",
  nodes: [] as unknown[],
  edges: [] as unknown[],
  ...over
});

const scheme = (over: Partial<SavedSchemeRecord> = {}): SavedSchemeRecord =>
  ({
    id: "s1",
    name: "S",
    updatedAt: "2026-01-01T00:00:00.000Z",
    projects: [{ id: "sp1", name: "模型1", updatedAt: "2026-01-01T00:00:00.000Z", project: project() }],
    ...over
  }) as SavedSchemeRecord;

const parseOut = (text: string) => JSON.parse(text) as Record<string, any>;

/** 深拷贝一份输入：两套实现各拿一份，避免任何原地改写互相影响。 */
const clone = (value: unknown) => JSON.parse(JSON.stringify(value)) as SavedSchemeRecord;

/** ModelNode 的完整必填字段骨架（少字段会被 lockProjectEdgeTerminals 抛错）。 */
const node = (over: Record<string, unknown> = {}) => ({
  id: "n1",
  kind: "ac-load",
  name: "负载1",
  nodeNumber: "N1",
  acTopologyNode: 0,
  dcTopologyNode: 0,
  position: { x: 0, y: 0 },
  size: { width: 10, height: 10 },
  rotation: 0,
  scale: 1,
  terminals: [],
  params: {},
  ...over
});

/** 在**全新模块实例**里跑一段逻辑 —— 让 nodeNumberSeed 回到 1，消除跨调用污染。 */
const isolated = async <T>(fn: (m: typeof import("./appExtracted/appInlineUtilityFunctions"), mm: typeof import("./model")) => T): Promise<T> => {
  vi.resetModules();
  const m = await import("./appExtracted/appInlineUtilityFunctions");
  const mm = await import("./model");
  return fn(m, mm);
};

/** 旧实现（原样照抄重构前的代码），作为等价性对照。 */
const legacySerialize = (mm: typeof import("./model"), rec: SavedSchemeRecord): string =>
  JSON.stringify(
    {
      version: 1,
      name: rec.name,
      projects: rec.projects.map((p) => ({
        name: p.name,
        project: mm.normalizeProjectLayers(mm.lockProjectEdgeTerminals(p.project))
      })),
      children: (rec.children ?? []).map((child): unknown => JSON.parse(legacySerialize(mm, child)))
    },
    null,
    2
  );

describe("输出结构：白名单只有 version / name / projects / children", () => {
  test("顶层四键齐全，顺序固定", () => {
    const out = parseOut(serializeSchemeRecordForFile(scheme()));
    expect(Object.keys(out)).toEqual(["version", "name", "projects", "children"]);
    expect(out.version).toBe(1);
    expect(out.name).toBe("S");
  });

  test("★ 顶层多余字段被**丢弃**（id / updatedAt 不落盘）", () => {
    const out = parseOut(serializeSchemeRecordForFile(scheme()));
    expect(out).not.toHaveProperty("id");
    expect(out).not.toHaveProperty("updatedAt");
  });

  test("每层子方案同样只留四键（递归白名单，不是只做顶层）", () => {
    const out = parseOut(serializeSchemeRecordForFile(
      scheme({ children: [scheme({ id: "s2", name: "子", children: [scheme({ name: "孙", id: "s3" })] })] })
    ));
    const child = out.children[0];
    const grand = child.children[0];
    expect(Object.keys(child)).toEqual(["version", "name", "projects", "children"]);
    expect(Object.keys(grand)).toEqual(["version", "name", "projects", "children"]);
    expect(grand.name).toBe("孙");
    expect(grand).not.toHaveProperty("id");
  });

  test("projects 项只保留 name + project（不落 id/updatedAt）", () => {
    const out = parseOut(serializeSchemeRecordForFile(scheme()));
    expect(Object.keys(out.projects[0])).toEqual(["name", "project"]);
    expect(out.projects[0].name).toBe("模型1");
  });
});

describe("children 的缺省形态统一成空数组", () => {
  for (const [label, children] of [
    ["字段缺失", undefined],
    ["显式 undefined", undefined],
    ["null", null],
    ["空数组", []]
  ] as const) {
    test(`${label} → []`, () => {
      const rec = scheme();
      if (children !== undefined || label === "显式 undefined") (rec as { children?: unknown }).children = children;
      const out = parseOut(serializeSchemeRecordForFile(rec));
      expect(out.children).toEqual([]);
    });
  }
});

describe("格式化：2 空格缩进，可读", () => {
  test("输出含换行与缩进（不是压缩 JSON）", () => {
    const text = serializeSchemeRecordForFile(scheme());
    expect(text).toContain("\n");
    expect(text).toContain('  "name": "S"');
    expect(text.split("\n").length).toBeGreaterThan(5);
  });
});

describe("★ 与旧算法（嵌套 JSON.parse 深拷贝）逐字节等价", () => {
  // 每个用例都在两套**独立模块实例**下各跑一次，nodeNumberSeed 都从 1 起，
  // 因此比较的是纯粹的算法差异，不受计数器污染影响。
  const cases: Array<[string, SavedSchemeRecord]> = [
    ["单层无子方案", scheme()],
    ["单层空 projects", scheme({ projects: [] as never })],
    ["三层嵌套", scheme({
      children: [
        scheme({ name: "L1", children: [scheme({ name: "L2", children: [scheme({ name: "L3" })] })] }),
        scheme({ name: "L1b" })
      ]
    })],
    ["children 显式 null", (() => { const r = scheme(); (r as { children?: unknown }).children = null; return r; })()],
    ["children 缺失", (() => { const r = scheme(); delete (r as { children?: unknown }).children; return r; })()],
    ["name 为 undefined", scheme({ name: undefined as never })],
    ["多项目", scheme({
      projects: [
        { id: "a", name: "A", updatedAt: "", project: project({ nodes: [], edges: [] }) },
        { id: "b", name: "B", updatedAt: "", project: project() }
      ] as never
    })],
    ["带节点与边的 project", scheme({
      projects: [{
        id: "x", name: "X", updatedAt: "",
        project: project({ nodes: [node()], edges: [] })
      } as never]
    })]
  ];

  for (const [label, input] of cases) {
    test(label, async () => {
      const next = await isolated((m) => m.serializeSchemeRecordForFile(clone(input)));
      const legacy = await isolated((_m, mm) => legacySerialize(mm, clone(input)));
      expect(next, `${label}\n新: ${next.slice(0, 300)}\n旧: ${legacy.slice(0, 300)}`).toBe(legacy);
    });
  }

  test("深层嵌套（6 层）也逐字节相同", async () => {
    let deep = scheme({ name: "L0" });
    for (let i = 1; i <= 6; i += 1) deep = scheme({ name: `L${i}`, children: [deep] });
    const next = await isolated((m) => m.serializeSchemeRecordForFile(clone(deep)));
    const legacy = await isolated((_m, mm) => legacySerialize(mm, clone(deep)));
    expect(next).toBe(legacy);
  });
});

describe("★ 非确定性机制：makeNodeNumber 是**进程级全局自增**", () => {
  // `model.ts` 里是 `let nodeNumberSeed = 1` + `makeNodeNumber()` —— 模块级全局，
  // 任何走到「创建节点/端子」的代码路径（`createNode` / `createTerminals` /
  // `model-eexport.ts` 的占位端子）都会推进它。
  //
  // 实测后果（用 `data/schemes/files/DOT/望道变_6.json` 真实模型探针）：
  // 同一份输入连调两次 `serializeSchemeRecordForFile`，输出里 518 个 nodeNumber
  // 有 517 个不同（`[1232, 271, 272, …]` vs `[1232, 648, 649, …]`），
  // 唯一相同的是本来就带号、不会被重分配的那一个。
  //
  // **这是改动前就存在的行为，不在本次修**：nodeNumber 的编号口径是业务规则
  // （跨方案唯一？按需分配？），改它要动 `makeNodeNumber` 的所有调用方，
  // 风险远超"重构省几次序列化"。
  //
  // 本组用例的意义：**任何"两次调用输出必须相同"的断言都要先隔离模块**，
  // 否则会因计数器位置不同而假红。下面把这条机制本身钉住。
  test("同一模块实例内连调两次，编号递增", async () => {
    const mm = await isolated((_m, mod) => mod);
    const first = mm.makeNodeNumber();
    const second = mm.makeNodeNumber();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^N\d+$/);
    expect(second).toMatch(/^N\d+$/);
  });

  test("vi.resetModules() 让计数器复位（本文件 isolated() 的前提）", async () => {
    const a = await isolated((_m, mm) => mm.makeNodeNumber());
    const b = await isolated((_m, mm) => mm.makeNodeNumber());
    // 两次全新模块实例都从同一起点开始 → 拿到同一个号
    expect(a).toBe(b);
  });

  test("**不带隔离就会串号**（这正是必须 isolated 的原因）", async () => {
    vi.resetModules();
    const mm = await import("./model");
    const first = mm.makeNodeNumber();
    const second = mm.makeNodeNumber();
    expect(first).not.toBe(second); // 同一实例内递增 —— 隔离失效就是这个现象
  });
});
