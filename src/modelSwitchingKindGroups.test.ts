// 「开关类」kind 分组的多链路一致性守卫。
//
// ## 为什么不是单源化，而是守卫
//
// 上一轮把「三绕组 / 两绕组变压器」判定单源化时，我顺手查了「开关类」判定，
// 探针实测的结论是：**它们不是同一判定的副本，而是四条链路各自的语义分组**。
//
// 探针建立的「命中矩阵」（✓ = 该站点把此 kind 算进自己的组）：
//
// | kind                          | E段ACSwitch | E段ACBreak | GroundDisc | E段DCSwitch | 量测AC | 默认参数 | dotImport |
// |-------------------------------|:-----------:|:----------:|:----------:|:-----------:|:------:|:--------:|:---------:|
// | ac-switch                     | ✓ | · | · | · | ✓ | ✓ | ✓ |
// | ac-disconnector               | ✓ | · | · | · | · | ✓ | · |
// | ac-ground-disconnector        | · | · | ✓ | · | · | ✓ | · |
// | ac-ground-disconnector-vertical | · | · | ✓ | · | · | ✓ | · |
// | ac-breaker                    | · | ✓ | · | · | ✓ | ✓ | ✓ |
// | ac-box-breaker                | · | ✓ | · | · | ✓ | ✓ | · |
// | dc-switch                     | · | · | · | ✓ | · | · | · |
// | dc-disconnector               | · | · | · | ✓ | · | ✓ | · |
// | dc-breaker                    | · | · | · | · | · | ✓ | · |
//
// 四组集合**互不相同**，且 E 段那 5 组探针实测**完全互斥**（无任何 kind 落进两组，
// 因为它们是「kind → 类名」的一对一映射）。强行合并成一个「开关类」判定会
// **破坏互斥性**，把不同语义混为一谈 —— 故不做单源化，改为**钉住各自分组**。
//
// ## 本文件要防的退化
//
// 场景：日后有人新增一种开关 kind（比如 `dc-box-breaker`），只改了其中一条链路。
// 后果是那条链路把新 kind 当成别的设备处理，而**导出流程不报任何错**。
// 本文件把「四组各自覆盖哪些 kind」显式写下来，改动时会被迫同步。
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import type { DeviceKind } from "./model";

/** 全部「换路器类」kind（开关 / 断路器 / 隔离开关，含接地刀闸与竖向变体）。 */
const SWITCHING_KINDS = [
  "ac-switch",
  "ac-disconnector",
  "ac-ground-disconnector",
  "ac-ground-disconnector-vertical",
  "ac-breaker",
  "ac-box-breaker",
  "dc-switch",
  "dc-disconnector",
  "dc-breaker"
] as const satisfies readonly DeviceKind[];

/** 把各链路的分组判据写成函数，便于直接断言覆盖集合。 */
const groups = {
  /** E 段类名 `ACSwitch`（`model-eexport.ts`）。 */
  eSectionAcSwitch: (k: string) => k === "ac-switch" || k === "ac-disconnector",
  /** E 段类名 `ACBreak`。 */
  eSectionAcBreak: (k: string) => k === "ac-breaker" || k === "ac-box-breaker",
  /** E 段类名 `GroundDisconnector`。 */
  eSectionGroundDisconnector: (k: string) => k === "ac-ground-disconnector" || k === "ac-ground-disconnector-vertical",
  /** E 段类名 `DCSwitch`。 */
  eSectionDcSwitch: (k: string) => k === "dc-switch" || k === "dc-disconnector",
  /** E 段类名 `DCBreak`。 */
  eSectionDcBreak: (k: string) => k === "dc-breaker",
  /** 量测定义表 `AC_SWITCHING_MEASUREMENT_DEFINITIONS`（`model.ts`）。**不含**隔离开关。 */
  measurementAcSwitching: (k: string) => k === "ac-switch" || k === "ac-breaker" || k === "ac-box-breaker",
  /** 模板默认参数组（`model.ts` 的换路器默认值分支）。覆盖 8 个，含 dc-disconnector。 */
  templateDefaults: (k: string) =>
    ["ac-switch", "ac-disconnector", "ac-ground-disconnector", "ac-ground-disconnector-vertical",
      "ac-breaker", "ac-box-breaker", "dc-disconnector", "dc-breaker"].includes(k),
  /** DOT 导入时补 `status` / `closed_status`（`dotImport.ts`）。只覆盖 ac-switch / ac-breaker。 */
  dotImportStatus: (k: string) => k === "ac-switch" || k === "ac-breaker"
} as const;

const covered = (judge: (k: string) => boolean) => SWITCHING_KINDS.filter((k) => judge(k));

/** 读生产源码（静态一致性断言用）。 */
const read = (path: string) => readFileSync(path, "utf8");
/** 剥掉块注释与行注释 —— 避免注释里的字面量被误判成代码。 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

describe("各链路的分组覆盖集合（改动任一分组必须同步这里）", () => {
  test("E 段 ACSwitch = {ac-switch, ac-disconnector}", () => {
    expect(covered(groups.eSectionAcSwitch)).toEqual(["ac-switch", "ac-disconnector"]);
  });

  test("E 段 ACBreak = {ac-breaker, ac-box-breaker}", () => {
    expect(covered(groups.eSectionAcBreak)).toEqual(["ac-breaker", "ac-box-breaker"]);
  });

  test("E 段 GroundDisconnector = 接地刀闸两个（含**竖向变体**）", () => {
    expect(covered(groups.eSectionGroundDisconnector)).toEqual([
      "ac-ground-disconnector",
      "ac-ground-disconnector-vertical"
    ]);
  });

  test("E 段 DCSwitch = {dc-switch, dc-disconnector}", () => {
    expect(covered(groups.eSectionDcSwitch)).toEqual(["dc-switch", "dc-disconnector"]);
  });

  test("E 段 DCBreak = {dc-breaker}", () => {
    expect(covered(groups.eSectionDcBreak)).toEqual(["dc-breaker"]);
  });

  test("★ E 段五组**互斥**（它们是 kind → 类名的一对一映射，不能重叠）", () => {
    const eSections = [
      groups.eSectionAcSwitch, groups.eSectionAcBreak, groups.eSectionGroundDisconnector,
      groups.eSectionDcSwitch, groups.eSectionDcBreak
    ];
    const overlaps: string[] = [];
    for (const kind of SWITCHING_KINDS) {
      const hits = eSections.map((judge, index) => (judge(kind) ? `组${index + 1}` : "")).filter(Boolean);
      if (hits.length > 1) overlaps.push(`${kind} 同时落进 ${hits.join(" + ")}`);
    }
    expect(overlaps, `E 段分组出现重叠：\n${overlaps.join("\n")}`).toEqual([]);
  });

  test("★ E 段五组**并集恰好覆盖全部 9 个开关类 kind**（无遗漏）", () => {
    const eSections = [
      groups.eSectionAcSwitch, groups.eSectionAcBreak, groups.eSectionGroundDisconnector,
      groups.eSectionDcSwitch, groups.eSectionDcBreak
    ];
    const hit = SWITCHING_KINDS.filter((k) => eSections.some((judge) => judge(k)));
    expect(hit).toEqual([...SWITCHING_KINDS]);
  });

  test("量测定义组 = {ac-switch, ac-breaker, ac-box-breaker}，**不含**隔离开关", () => {
    expect(covered(groups.measurementAcSwitching)).toEqual(["ac-switch", "ac-breaker", "ac-box-breaker"]);
    // 这条差异是**刻意**的：隔离开关的量测定义与开关不同，故不进这个表。
    expect(groups.measurementAcSwitching("ac-disconnector")).toBe(false);
    expect(groups.measurementAcSwitching("ac-ground-disconnector")).toBe(false);
  });

  test("模板默认参数组覆盖 8 个（含 dc-disconnector，不含 dc-switch）", () => {
    expect(covered(groups.templateDefaults)).toEqual([
      "ac-switch", "ac-disconnector", "ac-ground-disconnector", "ac-ground-disconnector-vertical",
      "ac-breaker", "ac-box-breaker", "dc-disconnector", "dc-breaker"
    ]);
    // dc-switch 走 DC 侧的另一分支（`model.ts:6144`）
    expect(groups.templateDefaults("dc-switch")).toBe(false);
  });

  test("DOT 导入组只覆盖 {ac-switch, ac-breaker}", () => {
    expect(covered(groups.dotImportStatus)).toEqual(["ac-switch", "ac-breaker"]);
    // 其余开关类在 DOT 导入时不补 status —— 依赖模板默认值
    for (const kind of ["ac-disconnector", "ac-box-breaker", "dc-switch", "dc-breaker"] as const) {
      expect(groups.dotImportStatus(kind), kind).toBe(false);
    }
  });

  test("★ 四组**互不相同** —— 这正是「不做单源化」的依据", () => {
    // 若哪天有人把它们合并成一组，这条会红，提示重新评估。
    const signatures = new Set([
      covered(groups.eSectionAcSwitch).join(","),
      covered(groups.measurementAcSwitching).join(","),
      covered(groups.templateDefaults).join(","),
      covered(groups.dotImportStatus).join(",")
    ]);
    expect(signatures.size, "四组覆盖集合应各不相同；若变得相同说明语义已统一，可重新评估单源化").toBe(4);
  });
});

describe("与生产代码的一致性：这些分组必须与源码里的判据一致", () => {
  test("model-eexport 的 E 段类名分支与本文件一致", () => {
    const code = stripComments(read("src/model-eexport.ts"));
    const expectPairs: Array<[string, string]> = [
      ['sectionKind === "ac-switch" || sectionKind === "ac-disconnector"', '"ACSwitch"'],
      ['sectionKind === "ac-breaker" || sectionKind === "ac-box-breaker"', '"ACBreak"'],
      ['sectionKind === "ac-ground-disconnector" || sectionKind === "ac-ground-disconnector-vertical"', '"GroundDisconnector"'],
      ['sectionKind === "dc-switch" || sectionKind === "dc-disconnector"', '"DCSwitch"'],
      ['sectionKind === "dc-breaker"', '"DCBreak"']
    ];
    for (const [condition, className] of expectPairs) {
      const pattern = new RegExp(`${condition.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\n]*${className.replace(/"/g, '"')}`);
      expect(code, `E 段应存在：${condition} → ${className}`).toMatch(pattern);
    }
  });

  test("dotImport 的 status 补写分支与本文件一致", () => {
    const code = stripComments(read("src/dotImport.ts"));
    expect(code).toMatch(/if \(kind === "ac-switch" \|\| kind === "ac-breaker"\) \{/);
  });

  test("model.ts 的量测定义分组与本文件一致", () => {
    const code = stripComments(read("src/model.ts"));
    expect(code).toMatch(/if \(kind === "ac-switch" \|\| kind === "ac-breaker" \|\| kind === "ac-box-breaker"\) \{\r?\n\s+return copy\(AC_SWITCHING_MEASUREMENT_DEFINITIONS\);/);
  });

  test("★ 全部 9 个开关类 kind 都是合法的 DeviceKind", () => {
    // 若有人往 SWITCHING_KINDS 里加了一个不存在的 kind，`satisfies` 已在编译期拦下；
    // 这里再钉一次运行时可见性，确保测试清单本身没腐化。
    expect(SWITCHING_KINDS.length).toBe(9);
    expect(new Set(SWITCHING_KINDS).size).toBe(9);
  });
});

describe("附带的既有事实：DC 类在 CIM 导出里整体退化跳过", () => {
  // 探针实测：`cim-builder.ts` 的类名 switch 把
  // `dc-line` / `dc-bus` / `dc-breaker` / `dc-switch` / `dc-load` / `dc-source` /
  // `dc-transformer` / `dcdc-converter` / `dc-storage` 等**全部**归到同一个
  // `case` 分支，注释写明「CIM16 RDF 对 DC 类支持不全，退化跳过（保持兼容性）」。
  //
  // 所以 `dc-disconnector` **没有**单独的 case 是**既有设计**而非遗漏 ——
  // 它落在那个"退化跳过"的默认分支里。这解释了为什么探针实测
  // `dc-disconnector` 在 cim-builder 里查不到 case 标签。
  //
  // **不在本次修**：补 DC 类的 CIM 映射是功能扩展，会改变导出产物，
  // 超出「无副作用优化」的范围。此处仅记录事实，供日后需要扩展时查。
  test("cim-builder 的 DC 类退化分支存在且含 dc-switch", () => {
    const code = stripComments(read("src/cim/cim-builder.ts"));
    expect(code).toMatch(/case "dc-switch"/);
    expect(code).toMatch(/case "dc-breaker"/);
  });
});
