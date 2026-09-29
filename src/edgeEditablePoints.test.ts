// cloneEdgeEditablePoints（model.ts，此前 8 处手抄同一段三行）
//
// ## 它决定什么
//
// 「一条边里哪些字段算**用户可编辑点位**」只有这一份定义。8 个调用点分布在
// 拖拽、渲染快照、撤销栈、模型保存四条路径上：
//
//   appCanvasInteractionFactories ×2  originalEdgePoints（拖拽前快照）
//   appProjectCanvasFactories         originalEdgePoints
//   appRenderBatch                    snapshotEdgePoints
//   selectionActions                  选中边的快照
//   autoAlignPlan                     私有 cloneEdge
//   model-routing                     另存模型时的整项目拷贝
//   appPersistenceLibraryExport       整项目拷贝
//
// ## 本文件守什么
//
// 主要不是「助手本身对不对」（那很简单），而是
// **「8 个调用点改用它之后，产出的对象与原手写形式逐字节相同」** ——
// 尤其**键序**。E 文件与 SVG 的输出对 `JSON.stringify` 的键序敏感，
// 展开顺序一旦变化就会造成字节级 diff（改前改后导出的文件不再一致）。
// 下面每条测试都是拿「原始手写实现」作对照做逐字节比对。
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { cloneEdgeEditablePoints, type Edge } from "./model";

/** ★ 8 个调用点改前的原始手写形态（逐字节照抄，含缩进无关的对象字面量） */
const legacyEditablePoints = (edge: Edge) => ({
  sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
  targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
  manualPoints: edge.manualPoints?.map((point) => ({ ...point }))
});

/** 4 个「带 routePoints 的整边拷贝」调用点改前的形态 */
const legacyFullClone = (edge: Edge) => ({
  ...edge,
  sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
  targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
  manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
  routePoints: edge.routePoints?.map((point) => ({ ...point }))
});

/** 4 个「只含点位、不含 …edge」调用点改前的形态 */
const legacyPointsSnapshot = (edge: Edge) => ({
  sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
  targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
  manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
  routePoints: edge.routePoints?.map((point) => ({ ...point }))
});

const EDGES: Array<[string, Edge]> = [
  ["三个点位齐全", { id: "e1", sourceId: "a", targetId: "b", sourcePoint: { x: 1, y: 2 }, targetPoint: { x: 3, y: 4 }, manualPoints: [{ x: 5, y: 6 }] }],
  ["只有 sourcePoint", { id: "e1", sourceId: "a", targetId: "b", sourcePoint: { x: 1, y: 2 } }],
  ["只有 targetPoint", { id: "e1", sourceId: "a", targetId: "b", targetPoint: { x: 3, y: 4 } }],
  ["都没有点位", { id: "e1", sourceId: "a", targetId: "b" }],
  ["manualPoints 是空数组（**不是** undefined）", { id: "e1", sourceId: "a", targetId: "b", manualPoints: [] }],
  ["带端子 id", { id: "e1", sourceId: "a", targetId: "b", sourceTerminalId: "t1", targetTerminalId: "t2" }],
  ["带 routePoints", { id: "e1", sourceId: "a", targetId: "b", sourcePoint: { x: 1, y: 2 }, routePoints: [{ x: 7, y: 8 }] }],
  ["四个字段齐全", { id: "e1", sourceId: "a", targetId: "b", sourcePoint: { x: 1, y: 2 }, targetPoint: { x: 3, y: 4 }, manualPoints: [{ x: 5, y: 6 }], routePoints: [{ x: 7, y: 8 }] }],
  ["★ 键序非典型（targetPoint 在 sourcePoint 之前）", { id: "e1", sourceId: "a", targetId: "b", targetPoint: { x: 3, y: 4 }, sourcePoint: { x: 1, y: 2 } }],
  ["★ 点位是 0（**不是**假值陷阱）", { id: "e1", sourceId: "a", targetId: "b", sourcePoint: { x: 0, y: 0 } }],
  ["负坐标 / 小数", { id: "e1", sourceId: "a", targetId: "b", sourcePoint: { x: -1.5, y: -0.25 } }]
];

describe("★ 键序与输出：改用助手后与原手写形式**逐字节相同**", () => {
  for (const [label, edge] of EDGES) {
    test(`整边拷贝：${label}`, () => {
      const actual = { ...edge, ...cloneEdgeEditablePoints(edge), routePoints: edge.routePoints?.map((point) => ({ ...point })) };
      expect(JSON.stringify(actual), label).toBe(JSON.stringify(legacyFullClone(edge)));
    });

    test(`点位快照：${label}`, () => {
      const actual = { ...cloneEdgeEditablePoints(edge), routePoints: edge.routePoints?.map((point) => ({ ...point })) };
      expect(JSON.stringify(actual), label).toBe(JSON.stringify(legacyPointsSnapshot(edge)));
    });
  }

  test("★ 键序本身（不只看值相等）：三种改法都保持原键序", () => {
    // 这一条是「展开不会移动已存在的键」这条推理的机器证明。
    // ① edge 三个点位键都在 → 展开只换值，键**留在原位**
    const full: Edge = { id: "e", sourceId: "a", targetId: "b", sourcePoint: { x: 1, y: 1 }, targetPoint: { x: 2, y: 2 }, manualPoints: [{ x: 3, y: 3 }] };
    expect(Object.keys({ ...full, ...cloneEdgeEditablePoints(full) })).toEqual([
      "id", "sourceId", "targetId", "sourcePoint", "targetPoint", "manualPoints"
    ]);
    // ② edge 缺 manualPoints 键 → 展开把它**追加**到末尾（与原手写形式一致）
    const bare: Edge = { id: "e", sourceId: "a", targetId: "b" };
    expect(Object.keys({ ...bare, ...cloneEdgeEditablePoints(bare) })).toEqual([
      "id", "sourceId", "targetId", "sourcePoint", "targetPoint", "manualPoints"
    ]);
    // ③ 与原手写形式的键序逐条相同（这才是真正要保证的）
    // 注意：4 个「整边拷贝」调用点在展开之后**还有一行显式的 routePoints**，
    // 那是它们各自保留的部分（与助手的 3 字段区分开），比对时必须带上。
    const withRoute = <T extends Edge>(edge: T) => edge.routePoints?.map((point) => ({ ...point }));
    expect(Object.keys(legacyFullClone(bare))).toEqual(
      Object.keys({ ...bare, ...cloneEdgeEditablePoints(bare), routePoints: withRoute(bare) })
    );
    expect(Object.keys(legacyFullClone(full))).toEqual(
      Object.keys({ ...full, ...cloneEdgeEditablePoints(full), routePoints: withRoute(full) })
    );
    // 「只含点位」的快照形态：没有 ...edge，但同样带显式的 routePoints
    expect(Object.keys(legacyPointsSnapshot(full))).toEqual(
      Object.keys({ ...cloneEdgeEditablePoints(full), routePoints: withRoute(full) })
    );
  });
});

describe("深拷贝语义：三个点字段各自建新对象 / 新数组", () => {
  test("sourcePoint / targetPoint 不是同一引用", () => {
    const edge: Edge = { id: "e", sourceId: "a", targetId: "b", sourcePoint: { x: 1, y: 1 }, targetPoint: { x: 2, y: 2 } };
    const out = cloneEdgeEditablePoints(edge);
    expect(out.sourcePoint).not.toBe(edge.sourcePoint);
    expect(out.targetPoint).not.toBe(edge.targetPoint);
    expect(out.sourcePoint).not.toBe(out.targetPoint);
  });

  test("manualPoints 是新数组，且每个元素是新对象", () => {
    const edge: Edge = { id: "e", sourceId: "a", targetId: "b", manualPoints: [{ x: 1, y: 1 }, { x: 2, y: 2 }] };
    const out = cloneEdgeEditablePoints(edge);
    expect(out.manualPoints).not.toBe(edge.manualPoints);
    for (let i = 0; i < 2; i += 1) {
      expect(out.manualPoints![i]).not.toBe(edge.manualPoints![i]);
      expect(out.manualPoints![i]).toEqual(edge.manualPoints![i]);
    }
  });

  test("改克隆结果**不影响**原 edge", () => {
    const edge: Edge = { id: "e", sourceId: "a", targetId: "b", sourcePoint: { x: 1, y: 1 }, manualPoints: [{ x: 2, y: 2 }] };
    const out = cloneEdgeEditablePoints(edge);
    out.sourcePoint!.x = 999;
    out.manualPoints![0].y = 999;
    expect(edge.sourcePoint!.x).toBe(1);
    expect(edge.manualPoints![0].y).toBe(2);
  });

  test("★ 恰好取两个字段，不多不少（`Point` 只有 x / y）", () => {
    // 若有人日后给 Point 加 z 坐标，这里会提醒同步核对这 8 个调用点。
    const edge: Edge = { id: "e", sourceId: "a", targetId: "b", sourcePoint: { x: 1, y: 2 } };
    expect(Object.keys(cloneEdgeEditablePoints(edge).sourcePoint!)).toEqual(["x", "y"]);
  });

  test("★ 等价变异记录：`{ x: p.x, y: p.y }` 改成 `{ ...p }`，35 条测试**全绿**（正确的）", () => {
    // 变异验证时我把助手里的显式两字段改成对象展开，测试**全绿**。
    // 查证后确认是**等价改写**：`Point` 当前只有 x / y 两个字段，
    // 展开与显式取键结果相同、键序也相同。
    //
    // 记下来的价值：让后人看到这次全绿不必重新怀疑；
    // 同时标出**什么改动会让它开始有事** —— 给 `Point` 加第三个字段（如 z）时，
    // 展开会把 z 一起带上（可能正是想要的），而显式取键会静默丢掉它。
    // 上面那条「恰好取两个字段」的断言就是为那一刻准备的：它会先转红。
    const edge: Edge = { id: "e", sourceId: "a", targetId: "b", sourcePoint: { x: 1, y: 2 }, targetPoint: { x: 3, y: 4 } };
    const explicit = {
      sourcePoint: { x: edge.sourcePoint!.x, y: edge.sourcePoint!.y },
      targetPoint: { x: edge.targetPoint!.x, y: edge.targetPoint!.y }
    };
    const spread = { sourcePoint: { ...edge.sourcePoint! }, targetPoint: { ...edge.targetPoint! } };
    expect(JSON.stringify(spread)).toBe(JSON.stringify(explicit));
    expect(Object.keys(spread.sourcePoint)).toEqual(Object.keys(explicit.sourcePoint));
  });
});

describe("缺失 / 假值边界的精确语义", () => {
  test("缺失的点位字段 → 键存在但值为 undefined（`JSON.stringify` 会跳过）", () => {
    const out = cloneEdgeEditablePoints({ id: "e", sourceId: "a", targetId: "b" });
    expect(Object.keys(out)).toEqual(["sourcePoint", "targetPoint", "manualPoints"]);
    expect(out.sourcePoint).toBeUndefined();
    expect(out.targetPoint).toBeUndefined();
    expect(out.manualPoints).toBeUndefined();
    expect(JSON.stringify(out)).toBe("{}");
  });

  test("★ `{ x: 0, y: 0 }` 是有效点位，**不**被当成缺失", () => {
    const out = cloneEdgeEditablePoints({ id: "e", sourceId: "a", targetId: "b", sourcePoint: { x: 0, y: 0 } });
    expect(out.sourcePoint).toEqual({ x: 0, y: 0 });
    expect(out.sourcePoint).not.toBeUndefined();
  });

  test("空数组保留为空数组（**不是** undefined）", () => {
    const out = cloneEdgeEditablePoints({ id: "e", sourceId: "a", targetId: "b", manualPoints: [] });
    expect(out.manualPoints).toEqual([]);
    expect(Array.isArray(out.manualPoints)).toBe(true);
  });

  test("★ 不含 `routePoints`（那是派生点位，各调用点自己决定要不要克隆）", () => {
    const edge: Edge = { id: "e", sourceId: "a", targetId: "b", routePoints: [{ x: 1, y: 1 }] };
    const out = cloneEdgeEditablePoints(edge);
    expect(Object.keys(out)).not.toContain("routePoints");
    expect(JSON.stringify(out)).toBe("{}");
    // 而 routePoints 本身**不被克隆** —— 与原手写形式一致（同引用）
    const full = { ...edge, ...cloneEdgeEditablePoints(edge), routePoints: edge.routePoints };
    expect(full.routePoints).toBe(edge.routePoints);
    expect(JSON.stringify(full)).toBe(JSON.stringify(legacyFullClone(edge)));
  });

  test("不改动 edge 自身的键集合（只产出新的点字段对象）", () => {
    const edge: Edge = { id: "e", sourceId: "a", targetId: "b" };
    const before = Object.keys(edge);
    cloneEdgeEditablePoints(edge);
    expect(Object.keys(edge)).toEqual(before);
  });
});

describe("★ 静态守卫：8 个调用点都改用了助手，且没有残留手抄", () => {
  const srcDir = new URL("./", import.meta.url);
  const allSources = (() => {
    const files: Array<{ name: string; text: string }> = [];
    const walk = (dir: URL, prefix: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(new URL(`${rel}/`, srcDir), rel);
        else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
          files.push({ name: rel, text: readFileSync(new URL(rel, srcDir), "utf8") });
        }
      }
    };
    walk(srcDir, "");
    return files;
  })();

  test("扫到了足够的文件（防止守卫变空洞）", () => {
    expect(allSources.length).toBeGreaterThan(100);
  });

  test("★ 8 个调用点：一个不多一个不少", () => {
    const hits = allSources
      .filter((f) => f.name !== "model.ts")
      .flatMap((f) =>
        f.text.split("\n")
          .map((line, index) => ({ file: f.name, line: index + 1, text: line }))
          .filter((r) => /\.\.\.cloneEdgeEditablePoints\(edge\)/.test(r.text))
      );
    const byFile: Record<string, number> = {};
    for (const hit of hits) byFile[hit.file] = (byFile[hit.file] ?? 0) + 1;
    expect(byFile, `实际 ${hits.length} 处`).toEqual({
      "appExtracted/appCanvasInteractionFactories.tsx": 2,
      "appExtracted/appProjectCanvasFactories.tsx": 1,
      "appExtracted/appPersistenceLibraryExport.tsx": 1,
      "appExtracted/appRenderBatch.tsx": 1,
      "autoAlign/autoAlignPlan.ts": 1,
      "model-routing.ts": 1,
      "selectionActions.ts": 1
    });
    expect(hits.length, "合计 8 处").toBe(8);
  });

  test("★ 全 src 再无「可编辑点位」的手抄三行", () => {
    // 守卫自身用的是 `…edge.sourcePoint` 这种形状，所以只查**不带 …edge** 的手抄
    const legacy = /^([ \t]*)sourcePoint: edge\.sourcePoint \? \{ \.\.\.edge\.sourcePoint \} : undefined,/gm;
    const offenders: string[] = [];
    for (const file of allSources) {
      if (file.name === "model.ts") continue;
      file.text.split("\n").forEach((line, index) => {
        if (legacy.test(line)) offenders.push(`${file.name}:${index + 1}`);
        legacy.lastIndex = 0;
      });
    }
    expect(offenders, `这些地方又手抄了一遍：\n${offenders.join("\n")}`).toEqual([]);
  });
});
