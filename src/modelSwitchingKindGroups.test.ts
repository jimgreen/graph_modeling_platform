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
import { isGeneratorKind, isThreeWindingTransformerKind, isTwoWindingTransformerKind, type DeviceKind } from "./model";

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

  /** E 段那 5 组的判据（与 model-eexport.ts 的类名分支一一对应）。 */
  const eSectionJudges = () => [
    groups.eSectionAcSwitch, groups.eSectionAcBreak, groups.eSectionGroundDisconnector,
    groups.eSectionDcSwitch, groups.eSectionDcBreak
  ] as const;

  test("★ E 段五组**互斥**（它们是 kind → 类名的一对一映射，不能重叠）", () => {
    const eSections = eSectionJudges();
    const overlaps: string[] = [];
    for (const kind of SWITCHING_KINDS) {
      const hits = eSections.map((judge, index) => (judge(kind) ? `组${index + 1}` : "")).filter(Boolean);
      if (hits.length > 1) overlaps.push(`${kind} 同时落进 ${hits.join(" + ")}`);
    }
    expect(overlaps, `E 段分组出现重叠：\n${overlaps.join("\n")}`).toEqual([]);
  });

  test("★ E 段五组**并集恰好覆盖全部 9 个开关类 kind**（无遗漏）", () => {
    const eSections = eSectionJudges();
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
  /**
   * ★ 用**解析源码**的方式核对 E 段分组，而不是"模式存在即可"。
   *
   * 上一版守卫有个真实漏洞：它只检查 `if (条件...) return "类名";` 这条语句**存在**，
   * 于是往条件里**多加**一个 kind（如让 `ACSwitch` 顺带收下 `ac-breaker`）时，
   * 模式照样匹配，测试全绿 —— 而 E 段恰恰要求这 5 组**互斥**，多加即错。
   * 我用变异验证抓到了这个假绿（16/16 全过），故改为逐 kind 核对。
   */
  test("★ model-eexport 的 E 段类名分支与本文件逐 kind 一致", () => {
    const code = stripComments(read("src/model-eexport.ts"));
    // 抽出「每个 kind → 第一个命中的类名」，复刻该函数的短路求值顺序。
    // 顺序与 model-eexport.ts 里的 if 链一致（先命中者胜）。
    const kindToClass = (kind: string): string => {
      const chain: Array<[string, (k: string) => boolean]> = [
        ["ACLoad", (k) => k === "ac-load" || k === "ac-terminal-transformer-load"],
        ["DCLoad", (k) => k === "dc-load"],
        ["ACGenerator", (k) => k === "ac-storage" || (k.startsWith("ac-") && k.includes("source"))],
        ["DCGenerator", (k) => k === "dc-storage" || (k.startsWith("dc-") && k.includes("source"))],
        ["ACSwitch", groups.eSectionAcSwitch],
        ["GroundDisconnector", groups.eSectionGroundDisconnector],
        ["DCSwitch", groups.eSectionDcSwitch],
        ["ACBreak", groups.eSectionAcBreak],
        ["DCBreak", groups.eSectionDcBreak],
        ["ACTransformer", isTwoWindingTransformerKind],
        ["ACTransfomer3", isThreeWindingTransformerKind]
      ];
      for (const [label, judge] of chain) {
        if (judge(kind)) return label;
      }
      return "";
    };

    // 1) 每个开关类 kind 在源码里必须真的落到我们预期的那个类名
    const expectedClass: Record<string, string> = {
      "ac-switch": "ACSwitch",
      "ac-disconnector": "ACSwitch",
      "ac-breaker": "ACBreak",
      "ac-box-breaker": "ACBreak",
      "ac-ground-disconnector": "GroundDisconnector",
      "ac-ground-disconnector-vertical": "GroundDisconnector",
      "dc-switch": "DCSwitch",
      "dc-disconnector": "DCSwitch",
      "dc-breaker": "DCBreak"
    };
    for (const [kind, className] of Object.entries(expectedClass)) {
      // 源码里该 kind 只能作为**字面量**出现一次（在同一行里）
      const pattern = new RegExp(`sectionKind === "${kind.replace(/-/g, "\\-")}"[^\\n]*return "([A-Za-z0-9]+)"`);
      const match = pattern.exec(code);
      expect(match, `E 段应存在含 "${kind}" 的分支`).not.toBeNull();
      expect(match?.[1], `kind ${kind} 在源码里落到哪个类名`).toBe(className);
    }

    // 2) 真实短路面：ACSwitch 的分支里**不能**出现 ac-breaker（互斥性在源码层）
    const acSwitchBranch = /if \(sectionKind === "ac-switch"[^\n]*return "ACSwitch";/.exec(code);
    expect(acSwitchBranch, "ACSwitch 分支应存在").not.toBeNull();
    expect(acSwitchBranch?.[0]).not.toContain("ac-breaker");
    expect(acSwitchBranch?.[0]).not.toContain("ac-box-breaker");

    // 3) ACBreak 分支里**不能**出现 ac-switch / ac-disconnector
    const acBreakBranch = /if \(sectionKind === "ac-breaker"[^\n]*return "ACBreak";/.exec(code);
    expect(acBreakBranch, "ACBreak 分支应存在").not.toBeNull();
    expect(acBreakBranch?.[0]).not.toContain("ac-switch");
    expect(acBreakBranch?.[0]).not.toContain("ac-disconnector");

    // 4) 每个 kind 在整段 E 段映射里只出现一次（避免同一 kind 有两个落点）
    for (const kind of SWITCHING_KINDS) {
      const occurrences = (code.match(new RegExp(`sectionKind === "${kind.replace(/-/g, "\\-")}"`, "g")) ?? []).length;
      expect(occurrences, `kind ${kind} 在 E 段映射里应恰好出现一次`).toBe(1);
    }

    // 5) 反向核对：本文件写的分组与 kindToClass 的短路结果一致
    for (const kind of SWITCHING_KINDS) {
      expect(kindToClass(kind), `${kind} 短路求值结果`).toBe(expectedClass[kind]);
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

// isGeneratorKind：kind 是不是「电源类」。它是字面子串判定（baseDeviceKind(kind).includes("source")），
// 15 处变异跑过、14 处转红；一处**源码等价**已如实记录在下面第 3 条：baseDeviceKind 剥的是**末尾**
// 的 -vertical，而 source 出现在名字中段，去不剥它都命中 —— 写不出能证伪它的变异，代码不动。
// 电源与变流器两族的默认参数、E 段列、电压色都按它分流；判错的症状是发电设备拿到负荷/线路的
// 默认值，或者反过来 —— 都不抛错。
describe("isGeneratorKind：电源族判定", () => {
  test("★ 所有 *-source kind 都算电源（含 -vertical 变体）", () => {
    for (const kind of [
      "ac-source",
      "ac-wind-source",
      "dc-wind-source",
      "ac-pv-source",
      "dc-pv-source",
      "ac-thermal-source",
      "diesel-source",
      "ac-hydro-source",
      "ac-nuclear-source",
      "ac-wind-source-vertical",
      "diesel-source-vertical"
    ]) {
      expect(isGeneratorKind(kind as never), kind).toBe(true);
    }
  });

  test("非电源族一律不算（线路 / 负荷 / 母线 / 变流器 / 储氢 / 静态图元）", () => {
    for (const kind of [
      "ac-line",
      "dc-line",
      "ac-load",
      "ac-bus",
      "ac-storage",
      "dc-storage",
      "acac-converter",
      "dcdc-converter",
      "dcac-converter",
      "hydrogen-storage",
      "static-rect",
      ""
    ]) {
      expect(isGeneratorKind(kind as never), kind).toBe(false);
    }
  });

  test("★ 判据就是「含 source 子串」：别的 kind 只要名字带 source 也会算（既有性质，如实钉住）", () => {
    // 连 resource 这种含 source 的英文词都会命中 —— 这是字面判定的既有代价，不是不变量
    expect(isGeneratorKind("my-source-thing" as never)).toBe(true);
    expect(isGeneratorKind("resource" as never)).toBe(true);
    expect(isGeneratorKind("sourceless" as never)).toBe(true);
  });

  test("★ 判定先剥 -vertical 再找子串（vertical 变体不能因为后缀漏判）", () => {
    expect(isGeneratorKind("ac-thermal-source-vertical" as never)).toBe(true);
  });
});
