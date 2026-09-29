// 电源（风光火柴水核储）派生元件库信息（`src/model.ts`）
//   ELECTRIC_GENERATION_FAMILY_SPECS          7 个电源族的规格
//   ELECTRIC_GENERATION_TERMINAL_TYPES        ["ac", "dc"]
//   electricGenerationDerivedInfoForFamily    由「端子类型 × 族」拼出信息
//   electricGenerationDerivedComponentLibraryInfo  由 kind 反查上面的信息
//
// 判错的后果：电源图元被归到**错误的元件库**（比如直流风机进了 ACGenerator），
// 于是图库里加载不到对应 SVG，节点画成空白框 —— 不报错。
//
// ★ 这些字段是**拼字符串**拼出来的，不是查表：
//   derivedComponentLibrary = terminalType.toUpperCase() + family.derivedComponentSuffix
//   label / categoryLibrary  = (terminalType === "ac" ? "交流" : "直流") + …
// 拼错的直接后果是图库键不存在，所以每个字段都单独钉住。
import { describe, expect, test } from "vitest";
import {
  ELECTRIC_GENERATION_FAMILY_SPECS,
  ELECTRIC_GENERATION_TERMINAL_TYPES,
  baseDeviceKind,
  electricGenerationDerivedComponentLibraryInfo,
  electricGenerationDerivedInfoForFamily
} from "./model";
// `FamilySpec` 在 model.ts 里**未导出**，只能从数组元素反推类型
type FamilySpec = (typeof ELECTRIC_GENERATION_FAMILY_SPECS)[number];

const FAMILIES = ELECTRIC_GENERATION_FAMILY_SPECS;
const TERMINALS = ELECTRIC_GENERATION_TERMINAL_TYPES;
const info = (terminalType: "ac" | "dc", family: FamilySpec) =>
  electricGenerationDerivedInfoForFamily(terminalType, family);
const lookup = (kind: string) => electricGenerationDerivedComponentLibraryInfo(kind);

// 全部 14 个 kind 的期望表（探针实测后写成字面量，而不是从族表推导 ——
// 推导写法会让「族表改了但期望没改」这条断言恒绿）
const EXPECTED = [
  { kind: "ac-wind-source", derived: "ACWindGen", label: "交流风力发电机", category: "交流设备", base: "ACGenerator" },
  { kind: "dc-wind-source", derived: "DCWindGen", label: "直流风力发电机", category: "直流设备", base: "DCGenerator" },
  { kind: "ac-pv-source", derived: "ACPVGen", label: "交流光伏发电机", category: "交流设备", base: "ACGenerator" },
  { kind: "dc-pv-source", derived: "DCPVGen", label: "直流光伏发电机", category: "直流设备", base: "DCGenerator" },
  { kind: "ac-thermal-source", derived: "ACThermalGen", label: "交流火力发电机", category: "交流设备", base: "ACGenerator" },
  { kind: "dc-thermal-source", derived: "DCThermalGen", label: "直流火力发电机", category: "直流设备", base: "DCGenerator" },
  { kind: "ac-diesel-source", derived: "ACDieselGen", label: "交流柴油发电机", category: "交流设备", base: "ACGenerator" },
  { kind: "dc-diesel-source", derived: "DCDieselGen", label: "直流柴油发电机", category: "直流设备", base: "DCGenerator" },
  { kind: "ac-hydro-source", derived: "ACHydroGen", label: "交流水力发电机", category: "交流设备", base: "ACGenerator" },
  { kind: "dc-hydro-source", derived: "DCHydroGen", label: "直流水力发电机", category: "直流设备", base: "DCGenerator" },
  { kind: "ac-nuclear-source", derived: "ACNuclearGen", label: "交流核能发电机", category: "交流设备", base: "ACGenerator" },
  { kind: "dc-nuclear-source", derived: "DCNuclearGen", label: "直流核能发电机", category: "直流设备", base: "DCGenerator" },
  { kind: "ac-storage", derived: "ACStorageGen", label: "交流电化学储能", category: "交流设备", base: "ACGenerator" },
  { kind: "dc-storage", derived: "DCStorageGen", label: "直流电化学储能", category: "直流设备", base: "DCGenerator" }
] as const;

describe("族表与端子类型表", () => {
  test("7 个族、2 个端子类型 = 14 个 kind", () => {
    expect(FAMILIES.length).toBe(7);
    expect(TERMINALS).toEqual(["ac", "dc"]);
    expect(FAMILIES.length * TERMINALS.length).toBe(EXPECTED.length);
  });

  test("★ 族表内容（kindSuffix / label / derivedComponentSuffix）", () => {
    // 逐字钉住 —— 改族表等于改图库键，必须是显式决策。
    expect(FAMILIES.map((f) => f.kindSuffix)).toEqual([
      "wind-source", "pv-source", "thermal-source", "diesel-source",
      "hydro-source", "nuclear-source", "storage"
    ]);
    expect(FAMILIES.map((f) => f.derivedComponentSuffix)).toEqual([
      "WindGen", "PVGen", "ThermalGen", "DieselGen",
      "HydroGen", "NuclearGen", "StorageGen"
    ]);
  });

  test("★ 14 个 kind 互不重复", () => {
    const kinds = FAMILIES.flatMap((f) => TERMINALS.map((t) => `${t}-${f.kindSuffix}`));
    expect(new Set(kinds).size, "★ 有重复 kind").toBe(kinds.length);
    const derived = FAMILIES.flatMap((f) => TERMINALS.map((t) => `${t.toUpperCase()}${f.derivedComponentSuffix}`));
    expect(new Set(derived).size, "★ 有重复 derivedComponentLibrary").toBe(derived.length);
  });
});

describe("★ electricGenerationDerivedInfoForFamily：14 个组合逐字段核对", () => {
  for (const expected of EXPECTED) {
    const terminalType = expected.kind.startsWith("ac-") ? "ac" : "dc";
    const suffix = expected.kind.slice(3);
    const family = FAMILIES.find((f) => f.kindSuffix === suffix)!;

    test(`${expected.kind}`, () => {
      const out = info(terminalType, family);
      expect(out.kind).toBe(expected.kind);
      expect(out.derivedComponentLibrary).toBe(expected.derived);
      expect(out.label).toBe(expected.label);
      expect(out.categoryLibrary).toBe(expected.category);
      expect(out.componentLibrary).toBe(expected.base);
      expect(out.baseComponentLibrary).toBe(expected.base);
      expect(out.terminalType).toBe(terminalType);
      expect(out.isContainer).toBe(false);
    });
  }

  test("★ 返回结构恒为 8 个键（顺序固定）", () => {
    expect(Object.keys(info("ac", FAMILIES[0]))).toEqual([
      "kind", "componentLibrary", "derivedComponentLibrary", "label",
      "categoryLibrary", "terminalType", "baseComponentLibrary", "isContainer"
    ]);
  });

  test("★ 每次调用返回**新对象**（不共享）", () => {
    const a = info("ac", FAMILIES[0]);
    const b = info("ac", FAMILIES[0]);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  test("★ `derivedComponentLibrary` = `terminalType.toUpperCase()` + suffix", () => {
    for (const family of FAMILIES) {
      for (const terminalType of TERMINALS) {
        const out = info(terminalType, family);
        expect(out.derivedComponentLibrary).toBe(
          `${terminalType.toUpperCase()}${family.derivedComponentSuffix}`
        );
        // ★ 前两字符恒是 AC / DC
        expect(out.derivedComponentLibrary.slice(0, 2), out.kind).toBe(terminalType.toUpperCase());
      }
    }
  });

  test("★ `categoryLibrary` 只有两个取值", () => {
    const categories = new Set(FAMILIES.flatMap((f) => TERMINALS.map((t) => info(t, f).categoryLibrary)));
    expect([...categories].sort()).toEqual(["交流设备", "直流设备"]);
  });

  test("★ `label` = 前缀 + `family.label`（前缀只有交流/直流）", () => {
    for (const family of FAMILIES) {
      expect(info("ac", family).label).toBe(`交流${family.label}`);
      expect(info("dc", family).label).toBe(`直流${family.label}`);
    }
  });

  test("★ `componentLibrary` 与 `baseComponentLibrary` 恒相等", () => {
    for (const family of FAMILIES) {
      for (const terminalType of TERMINALS) {
        const out = info(terminalType, family);
        expect(out.componentLibrary, out.kind).toBe(out.baseComponentLibrary);
        expect(out.baseComponentLibrary, out.kind).toBe(terminalType === "ac" ? "ACGenerator" : "DCGenerator");
      }
    }
  });

  test("★ `isContainer` 恒为 `false`（电源不是容器）", () => {
    for (const family of FAMILIES) {
      for (const terminalType of TERMINALS) {
        expect(info(terminalType, family).isContainer, `${terminalType}-${family.kindSuffix}`).toBe(false);
      }
    }
  });

  test("★ 同一族的 ac / dc 只差三处（terminalType / 两个库名 / 两个 label）", () => {
    for (const family of FAMILIES) {
      const ac = info("ac", family);
      const dc = info("dc", family);
      expect(ac.terminalType).not.toBe(dc.terminalType);
      expect(ac.derivedComponentLibrary).not.toBe(dc.derivedComponentLibrary);
      expect(ac.label).not.toBe(dc.label);
      // 族相关的部分完全相同
      expect(ac.kind.slice(3)).toBe(dc.kind.slice(3));
      expect(ac.isContainer).toBe(dc.isContainer);
    }
  });
});

describe("★ electricGenerationDerivedComponentLibraryInfo：14 个 kind 全部命中", () => {
  for (const expected of EXPECTED) {
    test(`${expected.kind} → 自身信息`, () => {
      const out = lookup(expected.kind);
      expect(out, "★ 查得到").not.toBeNull();
      expect(out!.kind).toBe(expected.kind);
      expect(out!.derivedComponentLibrary).toBe(expected.derived);
      expect(out!.label).toBe(expected.label);
      expect(out!.categoryLibrary).toBe(expected.category);
      expect(out!.baseComponentLibrary).toBe(expected.base);
      expect(out!.terminalType).toBe(expected.kind.startsWith("ac-") ? "ac" : "dc");
    });
  }

  test("★ 反查结果与直接构造**逐字段相等**", () => {
    for (const family of FAMILIES) {
      for (const terminalType of TERMINALS) {
        const direct = info(terminalType, family);
        const found = lookup(direct.kind)!;
        expect(found, direct.kind).toEqual(direct);
        // 但**不是同一引用**（查表每次新建）
        expect(found).not.toBe(direct);
      }
    }
  });

  test("★ `-vertical` 变体也能查到（`baseDeviceKind` 剥后缀）", () => {
    for (const expected of EXPECTED) {
      const out = lookup(`${expected.kind}-vertical`);
      expect(out?.kind, `${expected.kind}-vertical`).toBe(expected.kind);
    }
    // 前提：baseDeviceKind 只剥 -vertical
    expect(baseDeviceKind("ac-wind-source-vertical")).toBe("ac-wind-source");
    expect(baseDeviceKind("ac-wind-source")).toBe("ac-wind-source");
  });
});

describe("★ 查不到的 kind → `null`（不做模糊匹配）", () => {
  test("未知 / 残缺 / 多余后缀", () => {
    for (const kind of [
      "", "nope", "acline", "ac-", "-source", "ac-wind", "wind-source",
      "ac-wind-sourcex", "ac-wind-source-", "ac-storage-extra", "ac-STORAGE"
    ]) {
      expect(lookup(kind), JSON.stringify(kind)).toBeNull();
    }
  });

  test("★ 区分大小写、**不 trim**", () => {
    // `baseDeviceKind` 只剥 `-vertical`，既不 trim 也不改大小写。
    for (const kind of [
      "AC-WIND-SOURCE", "AC-Wind-Source", "ac-Wind-source",
      "ac-wind-source ", " ac-wind-source", "\tac-wind-source", "ac-wind-source\n"
    ]) {
      expect(lookup(kind), JSON.stringify(kind)).toBeNull();
    }
    // 前提
    expect(baseDeviceKind("AC-Wind-Source")).toBe("AC-Wind-Source");
    expect(baseDeviceKind(" ac-wind-source")).toBe(" ac-wind-source");
  });

  test("★ 只接受完整的 `ac-` / `dc-` 前缀", () => {
    expect(lookup("ac-wind-source")).not.toBeNull();
    expect(lookup("AC-wind-source"), "★ 大写前缀查不到").toBeNull();
    expect(lookup("dc-wind-source")).not.toBeNull();
    expect(lookup("wind-source"), "★ 缺前缀").toBeNull();
  });

  test("返回类型恒为 object 或 null（不是 undefined）", () => {
    for (const kind of ["ac-wind-source", "nope", ""]) {
      const out = lookup(kind);
      expect(out === null || typeof out === "object", kind).toBe(true);
      expect(out, kind).not.toBeUndefined();
    }
  });

  test("★ 查表是 O(族 × 端子) 的**线性扫描**，找不到就返回 null", () => {
    // 用一个「只在族表里存在、但 kind 拼不出来」的组合验证不泄漏
    const notInTable = `${TERMINALS[0]}-zz-source`;
    expect(lookup(notInTable)).toBeNull();
  });
});

describe("★ 直接调 `electricGenerationDerivedInfoForFamily` 的非法入参（不修，如实记录）", () => {
  const family = FAMILIES[0];

  test("★ 非法 `terminalType` 拼出**自相矛盾**的信息（不抛、不校验）", () => {
    // 判定只有 `=== "ac"` 一处是严格相等，其余全走 else 分支：
    //   · `componentLibrary` → DCGenerator（else）
    //   · `derivedComponentLibrary` → `"AC".toUpperCase() + suffix` = ACWindGen
    //   · `label` / `categoryLibrary` → 「直流」（else）
    // ⇒ 三个字段互相矛盾（DC 库 + AC 派生名 + 直流标签）。
    //
    // **判定不修**：形参类型是 `"ac" | "dc"`，任何其它值都是调用方违背契约。
    // 抛错会打断正常渲染；静默兜成 ac/dc 会掩盖「谁传错了」。
    const out = electricGenerationDerivedInfoForFamily("AC" as never, family);
    expect(out.terminalType, "★ 原样透出").toBe("AC");
    expect(out.kind).toBe("AC-wind-source");
    expect(out.componentLibrary, "★ 走 else → DCGenerator").toBe("DCGenerator");
    expect(out.derivedComponentLibrary, "★ 但 toUpperCase 仍得 AC 前缀").toBe("ACWindGen");
    expect(out.label, "★ 走 else → 直流").toBe("直流风力发电机");
    expect(out.categoryLibrary).toBe("直流设备");
    // 前提：判定是严格相等（用 string 变量避免 TS 字面量收窄）
    const upper: string = "AC";
    const lower: string = "ac";
    expect(upper === lower).toBe(false);
    expect(upper.toUpperCase()).toBe("AC");
  });

  test("带空格的 terminalType 会在派生名里留下空格", () => {
    const out = electricGenerationDerivedInfoForFamily("ac " as never, family);
    expect(out.derivedComponentLibrary).toBe("AC WindGen");
    expect(out.kind).toBe("ac -wind-source");
  });

  test("空串 terminalType → 空前缀", () => {
    const out = electricGenerationDerivedInfoForFamily("" as never, family);
    expect(out.kind).toBe("-wind-source");
    expect(out.derivedComponentLibrary).toBe("WindGen");
    expect(out.label, "★ 走 else → 直流").toBe("直流风力发电机");
  });

  test("★ `undefined` / `null` terminalType → 抛 TypeError（`.toUpperCase()`）", () => {
    // **判定不修**：同上，类型已排除；抛错信息直指「传了 nullish」。
    expect(() => electricGenerationDerivedInfoForFamily(undefined as never, family)).toThrow(TypeError);
    expect(() => electricGenerationDerivedInfoForFamily(null as never, family)).toThrow(TypeError);
    // 前提
    expect(() => (null as never as { toUpperCase(): string }).toUpperCase()).toThrow(TypeError);
  });

  test("★ 自定义族：直接构造能出信息，但**查表查不到**", () => {
    const custom = {
      kindSuffix: "zz-source", label: "测试", sourceType: "X",
      derivedComponentSuffix: "ZzGen", parameterDefinitions: [],
      commonParams: {}, defaultsByTerminalType: { ac: {}, dc: {} }
    } as unknown as FamilySpec;
    const out = electricGenerationDerivedInfoForFamily("ac", custom);
    expect(out.kind).toBe("ac-zz-source");
    expect(out.derivedComponentLibrary).toBe("ACZzGen");
    // ★ 查表只扫族表里的 7 个族
    expect(lookup("ac-zz-source")).toBeNull();
  });

  test("★ 空 suffix 产生 `ac-`（不是双横线）", () => {
    const odd = {
      kindSuffix: "", label: "", sourceType: "X", derivedComponentSuffix: "",
      parameterDefinitions: [], commonParams: {}, defaultsByTerminalType: { ac: {}, dc: {} }
    } as unknown as FamilySpec;
    const out = electricGenerationDerivedInfoForFamily("ac", odd);
    expect(out.kind).toBe("ac-");
    expect(out.derivedComponentLibrary).toBe("AC");
    expect(out.label).toBe("交流");
  });

  test("★ 等价变异 ⑪：`componentLibrary` 内联三元是恒等的", () => {
    // 变异：`componentLibrary: baseComponentLibrary` 改成
    //   `componentLibrary: terminalType === "ac" ? "ACGenerator" : "DCGenerator"`
    // 首轮全绿。
    //   —— `baseComponentLibrary` 本身就是**同一个**变量、同一个三元算出来的，
    //      把它内联回去逐位相同。
    //   ⚠ 什么会让它失效：若 `baseComponentLibrary` 的计算被改成别的东西
    //      （例如带上默认值、或者从 family 读），两处就会分道扬镳。
    const pick = (terminalType: string) => (terminalType === "ac" ? "ACGenerator" : "DCGenerator");
    for (const terminalType of ["ac", "dc", "AC", "", "nope"]) {
      const viaVariable = pick(terminalType);
      const inlined = terminalType === "ac" ? "ACGenerator" : "DCGenerator";
      expect(inlined, terminalType).toBe(viaVariable);
      // 与生产实现一致
      const family = FAMILIES[0];
      expect(electricGenerationDerivedInfoForFamily(terminalType as never, family).componentLibrary, terminalType)
        .toBe(viaVariable);
      expect(electricGenerationDerivedInfoForFamily(terminalType as never, family).baseComponentLibrary, terminalType)
        .toBe(viaVariable);
    }
  });
});
