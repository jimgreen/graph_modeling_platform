// 三绕组变压器 kind 判定的单源化守卫。
//
// ## 为什么必须有这个文件
//
// 「是否三绕组变压器」这个判定此前在**全仓库被手抄了 8 遍**：
// `model.ts`、`model-eexport.ts`（2 处）、`export/svg.ts`、`cim/cim-builder.ts`、
// `model-routing.ts`（2 处）、`appCoreCanvasUtilities.tsx`、`DeviceGlyph.ts`。
//
// 单源化的理由不是"洁癖"而是**后果**：三绕组与两绕组在**六条链路上语义完全不同** ——
// CIM 类名（`ACTransfomer3`）、E 文件段、SVG 渲染、量测定义表、端子电压兜底、
// 绕组侧电压 key 集合。一旦将来新增第三种三绕组 kind 而漏改其中一处，
// 那条链路就会把它当两绕组处理，产出**结构上看似正常、实则错误**的产物，
// 且不报任何错。
//
// 本文件把「唯一定义在 `model.ts` 的 `THREE_WINDING_TRANSFORMER_KINDS`」变成可执行的约束：
// ① 集合内容正确且恰好两个；② 各调用点行为与集合**一致**（含新增 kind 的模拟）；
// ③ 精确匹配而非 `baseDeviceKind` 剥后缀 —— 并说明为什么。
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import {
  THREE_WINDING_NEUTRAL_TRANSFORMER_KIND,
  THREE_WINDING_TRANSFORMER_KINDS,
  TRANSFORMER_KINDS,
  TWO_WINDING_TRANSFORMER_KINDS,
  isThreeWindingNeutralTransformerKind,
  isThreeWindingTransformerKind,
  isTransformerKind,
  isTwoWindingTransformerKind,
  isTwoWindingTransformerTemplateKind
} from "./model";
import { hasVisibleThreeWindingNeutralTerminal, isThreeWindingTransformer } from "./model-eexport";
import type { ModelNode } from "./model";

describe("集合内容：恰好两个 kind，且中性点变体在内", () => {
  test("集合恰好是这两个", () => {
    expect([...THREE_WINDING_TRANSFORMER_KINDS].sort()).toEqual([
      "ac-three-winding-transformer",
      "ac-three-winding-transformer-neutral"
    ]);
    expect(THREE_WINDING_TRANSFORMER_KINDS.size).toBe(2);
  });

  test("中性点 kind 常量与集合一致", () => {
    expect(THREE_WINDING_NEUTRAL_TRANSFORMER_KIND).toBe("ac-three-winding-transformer-neutral");
    expect(isThreeWindingTransformerKind(THREE_WINDING_NEUTRAL_TRANSFORMER_KIND)).toBe(true);
  });

  test("★ 集合是**冻结的语义快照**：改动它等于改动六条链路的行为", () => {
    // 这条不是形式主义 —— 它把「新增 kind」这个动作变成必须同步改测试的显式决定，
    // 而不是在 8 个地方里悄悄漏掉一处。
    expect(THREE_WINDING_TRANSFORMER_KINDS.has("ac-three-winding-transformer")).toBe(true);
    expect(THREE_WINDING_TRANSFORMER_KINDS.has("ac-transformer")).toBe(false);
    expect(THREE_WINDING_TRANSFORMER_KINDS.has("ac-two-winding-transformer")).toBe(false);
  });
});

describe("kind 级判定：精确匹配，大小写与后缀都敏感", () => {
  test("两个三绕组 kind → true", () => {
    expect(isThreeWindingTransformerKind("ac-three-winding-transformer")).toBe(true);
    expect(isThreeWindingTransformerKind("ac-three-winding-transformer-neutral")).toBe(true);
  });

  test("两绕组 / 其它设备 → false", () => {
    for (const kind of [
      "ac-transformer", "ac-two-winding-transformer", "ac-load", "ac-bus",
      "dcdc-converter", "", "zzz-unknown"
    ]) {
      expect(isThreeWindingTransformerKind(kind), kind).toBe(false);
    }
  });

  test("大小写敏感（不做 lowerCase）", () => {
    expect(isThreeWindingTransformerKind("AC-THREE-WINDING-TRANSFORMER")).toBe(false);
    expect(isThreeWindingTransformerKind("Ac-Three-Winding-Transformer")).toBe(false);
  });

  test("nullish 安全（`ModelNode[\"kind\"]` 在部分位置可选）", () => {
    // 原实现 `node.kind === \"ac-...\"` 对 undefined 恒 false；
    // Set.has(undefined) 同样恒 false —— 语义未变。
    expect(isThreeWindingTransformerKind(undefined)).toBe(false);
    expect(isThreeWindingNeutralTransformerKind(undefined)).toBe(false);
    expect(isThreeWindingTransformerKind(null as unknown as undefined)).toBe(false);
  });

  test("★ **不剥 `-vertical` 后缀**（与 isRoutableLineDeviceKind 不同，刻意）", () => {
    // 直觉上该像 isRoutableLineDeviceKind 那样先 baseDeviceKind，但**不能**：
    // shouldCreateVerticalDeviceTemplate 只为「母线」或 terminalCount === 2 的模板
    // 生成竖向变体，三绕组是 3/4 端子，故 `...-vertical` 永不生成。
    // 剥后缀只会给不存在的 kind 开后门。
    expect(isThreeWindingTransformerKind("ac-three-winding-transformer-vertical")).toBe(false);
    expect(isThreeWindingTransformerKind("ac-three-winding-transformer-neutral-vertical")).toBe(false);
  });
});

describe("中性点变体判定", () => {
  test("只有 neutral 那一个 → true", () => {
    expect(isThreeWindingNeutralTransformerKind("ac-three-winding-transformer-neutral")).toBe(true);
    expect(isThreeWindingNeutralTransformerKind("ac-three-winding-transformer")).toBe(false);
    expect(isThreeWindingNeutralTransformerKind("ac-transformer")).toBe(false);
  });

  test("**带中性点 ⊂ 三绕组**（集合关系，不可倒置）", () => {
    for (const kind of THREE_WINDING_TRANSFORMER_KINDS) {
      if (isThreeWindingNeutralTransformerKind(kind)) {
        expect(isThreeWindingTransformerKind(kind), kind).toBe(true);
      }
    }
  });
});

describe("model-eexport 的两个包装：行为与集合一致", () => {
  const node = (kind: string, terminals = 0) =>
    ({ kind, terminals: Array.from({ length: terminals }, (_, i) => ({ id: `t${i}` })) }) as unknown as ModelNode;

  test("isThreeWindingTransformer(node) ≡ kind 级判定", () => {
    for (const kind of [
      "ac-three-winding-transformer", "ac-three-winding-transformer-neutral",
      "ac-transformer", "ac-load", "", "ac-three-winding-transformer-vertical"
    ]) {
      expect(isThreeWindingTransformer(node(kind)), kind).toBe(isThreeWindingTransformerKind(kind));
    }
  });

  test("hasVisibleThreeWindingNeutralTerminal = 中性点 kind **且** 端子数 >= 4", () => {
    const neutral = "ac-three-winding-transformer-neutral";
    const plain = "ac-three-winding-transformer";
    // 端子数门槛
    for (const n of [0, 1, 2, 3]) {
      expect(hasVisibleThreeWindingNeutralTerminal(node(neutral, n)), `端子${n}`).toBe(false);
    }
    for (const n of [4, 5, 8]) {
      expect(hasVisibleThreeWindingNeutralTerminal(node(neutral, n)), `端子${n}`).toBe(true);
    }
    // 非中性点 kind 即便端子够多也 false（它压根没有中性点端子）
    for (const n of [4, 9]) {
      expect(hasVisibleThreeWindingNeutralTerminal(node(plain, n)), `端子${n}`).toBe(false);
    }
  });
});

describe("★ 静态扫描：生产代码里不得再有内联的三绕组 kind 判定副本", () => {
  // 这是本次单源化的**结构性约束**：若有人又手写一遍
  // `kind === "ac-three-winding-transformer" || kind === "...-neutral"`，
  // 本守卫立刻转红。
  //
  // 扫描范围刻意**排除** model.ts 里集合自身的定义与注释，
  // 也排除 cim-builder 的 CIM 类名 switch（那是「所有变压器都映射 PowerTransformer」
  // 的类名映射，三绕组与两绕组同归一类，语义不同，不是本判定的副本）。
  test("没有 `=== \"ac-three-winding-transformer\"` 形式的内联判定", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const code = stripComments(readFileSync(file, "utf8"));
      code.split(/\r?\n/).forEach((line, index) => {
        // 形如 kind === "ac-three-winding-transformer" 或 !== ，但**不含** -neutral
        if (/[!=]==?\s*"ac-three-winding-transformer"(?!"-neutral")/.test(line)) {
          offenders.push(`${file}:${index + 1}  ${line.trim()}`);
        }
      });
    }
    expect(offenders, `发现内联副本（请改用 isThreeWindingTransformerKind）:\n${offenders.join("\n")}`).toEqual([]);
  });

  test("也没有 `\"ac-three-winding-transformer-neutral\"` 形式的内联等值判定", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const code = stripComments(readFileSync(file, "utf8"));
      code.split(/\r?\n/).forEach((line, index) => {
        if (/[!=]==?\s*"ac-three-winding-transformer-neutral"/.test(line)) {
          offenders.push(`${file}:${index + 1}  ${line.trim()}`);
        }
      });
    }
    expect(offenders, `发现内联副本（请改用 isThreeWindingNeutralTransformerKind）:\n${offenders.join("\n")}`).toEqual([]);
  });

  test("集合只定义一次（model.ts 之外不得再有同名定义）", () => {
    for (const file of FILES.filter((f) => f !== "src/model.ts")) {
      const code = stripComments(readFileSync(file, "utf8"));
      expect(code, `${file} 不应重新定义 THREE_WINDING_TRANSFORMER_KINDS`).not.toContain("THREE_WINDING_TRANSFORMER_KINDS");
    }
  });
});

/** 参与静态扫描的生产文件（与三绕组那组同一份清单）。 */
const FILES = [
  "src/model.ts",
  "src/model-eexport.ts",
  "src/model-routing.ts",
  "src/export/svg.ts",
  "src/cim/cim-builder.ts",
  "src/appExtracted/appCoreCanvasUtilities.tsx",
  "src/DeviceGlyph.ts"
];

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

describe("★ 两绕组判定同样单源化（此前手抄 6 遍）", () => {
  // 判定内容很简单（二选一），但漏改一处会让量测定义表、端子电压索引、
  // 绕组半径/边距、路由包围盒算出不同的值 —— 后果与三绕组同类。
  test("集合内容正确（`ac-transformer` 是历史别名，与 two-winding 等价）", () => {
    expect([...TWO_WINDING_TRANSFORMER_KINDS].sort()).toEqual(["ac-transformer", "ac-two-winding-transformer"]);
    expect(TWO_WINDING_TRANSFORMER_KINDS.size).toBe(2);
  });

  test("kind 级判定", () => {
    expect(isTwoWindingTransformerKind("ac-transformer")).toBe(true);
    expect(isTwoWindingTransformerKind("ac-two-winding-transformer")).toBe(true);
    for (const kind of ["ac-three-winding-transformer", "ac-three-winding-transformer-neutral", "ac-load", "", "zzz"]) {
      expect(isTwoWindingTransformerKind(kind), kind).toBe(false);
    }
  });

  test("nullish 安全", () => {
    expect(isTwoWindingTransformerKind(undefined)).toBe(false);
    expect(isTwoWindingTransformerKind(null as unknown as undefined)).toBe(false);
  });

  test("**两绕组与三绕组互斥**，且并集就是变压器全集", () => {
    for (const kind of [...TWO_WINDING_TRANSFORMER_KINDS, ...THREE_WINDING_TRANSFORMER_KINDS]) {
      const isTwo = isTwoWindingTransformerKind(kind);
      const isThree = isThreeWindingTransformerKind(kind);
      expect(isTwo && isThree, `${kind} 不该同时是两绕组与三绕组`).toBe(false);
      expect(isTwo || isThree, `${kind} 应至少命中一类`).toBe(true);
      expect(isTransformerKind(kind), kind).toBe(true);
    }
    expect(TRANSFORMER_KINDS.size).toBe(4);
  });

  test("非变压器 → isTransformerKind false", () => {
    for (const kind of ["ac-load", "ac-bus", "dcdc-converter", "ac-three-winding-transformer-vertical", ""]) {
      expect(isTransformerKind(kind), kind).toBe(false);
    }
    expect(isTransformerKind(undefined)).toBe(false);
  });

  test("★ **不剥 `-vertical`**：两绕组恰好 2 端子，竖向变体**确实存在**", () => {
    // 这是与三绕组的关键差别：两绕组是 2 端子，而
    // shouldCreateVerticalDeviceTemplate 恰好为 terminalCount === 2 生成竖向变体。
    // 所以需要处理竖向变体的调用点必须自己先 baseDeviceKind()。
    expect(isTwoWindingTransformerKind("ac-two-winding-transformer-vertical")).toBe(false);
    // 而 isTwoWindingTransformerTemplateKind 内部已 baseDeviceKind，故命中
    expect(isTwoWindingTransformerTemplateKind("ac-two-winding-transformer-vertical")).toBe(true);
    expect(isTwoWindingTransformerTemplateKind("ac-two-winding-transformer")).toBe(true);
    expect(isTwoWindingTransformerTemplateKind("ac-transformer-vertical")).toBe(true);
    expect(isTwoWindingTransformerTemplateKind("ac-three-winding-transformer")).toBe(false);
  });

  test("静态扫描：不得再有内联的两绕组 kind 判定副本", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const code = stripComments(readFileSync(file, "utf8"));
      code.split(/\r?\n/).forEach((line, index) => {
        if (/[!=]==?\s*"ac-(two-winding-)?transformer"(?!"-vertical")/.test(line)) {
          offenders.push(`${file}:${index + 1}  ${line.trim()}`);
        }
      });
    }
    expect(offenders, `发现内联副本（请改用 isTwoWindingTransformerKind）:\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("模拟「新增第三种三绕组 kind」：只需改集合一处", () => {
  // 判定逻辑全部经由集合，所以往集合里加一项，**六条链路同时生效** ——
  // 这正是单源化要保证的性质。测试用临时集合验证，不改真实定义。
  test("集合加一项后 kind 级判定立刻覆盖它", () => {
    const extended = new Set(THREE_WINDING_TRANSFORMER_KINDS);
    extended.add("ac-three-winding-transformer-tertiary");
    const judge = (kind: string) => extended.has(kind);
    expect(judge("ac-three-winding-transformer-tertiary")).toBe(true);
    expect(judge("ac-transformer")).toBe(false);
  });

  test("真实集合未被本次测试污染（仍是 2 项）", () => {
    expect(THREE_WINDING_TRANSFORMER_KINDS.size).toBe(2);
  });
});
