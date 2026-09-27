// shared/deviceParameterChineseNames.mjs 的契约测试 —— 此前零覆盖。
//
// 它决定 E 文件 / CIM 导出的**字段中文表头**。表头错了不会让导出失败，
// 只会在下游系统里显示成一列乱码或错误的列名 —— 属于静默劣化，
// 端到端导出测试（用的都是已知字段）抓不到。
//
// 这里只测「契约」而非逐条查表内容：一批代表性字段的映射、通用名识别、
// 以及 meaningfulDeviceParameterChineseName 的取舍优先级。
import { describe, expect, test } from "vitest";
import {
  normalizeDeviceParameterEnglishName,
  isGenericCustomParameterChineseName,
  inferDeviceParameterChineseName,
  meaningfulDeviceParameterChineseName
} from "./deviceParameterChineseNames.mjs";

describe("normalizeDeviceParameterEnglishName", () => {
  test("去空白并把中文名规范成英文（空则空串）", () => {
    expect(typeof normalizeDeviceParameterEnglishName("  rdf_id  ")).toBe("string");
    expect(normalizeDeviceParameterEnglishName("")).toBe("");
    expect(normalizeDeviceParameterEnglishName(null)).toBe("");
    expect(normalizeDeviceParameterEnglishName(undefined)).toBe("");
  });
});

describe("isGenericCustomParameterChineseName", () => {
  test("识别含「自定义参数」的占位名（含带序号的变体）", () => {
    // 实现是 /自定义参数/ 包含匹配，故「自定义参数1」也算占位
    expect(isGenericCustomParameterChineseName("自定义参数")).toBe(true);
    expect(isGenericCustomParameterChineseName("自定义参数1")).toBe(true);
  });

  test("不含该四字的「自定义」不算占位", () => {
    // 钉住真实语义：正则是「自定义参数」四字整体，不是「自定义」
    expect(isGenericCustomParameterChineseName("自定义")).toBe(false);
  });

  test("真实业务名不算通用名", () => {
    expect(isGenericCustomParameterChineseName("额定容量")).toBe(false);
    expect(isGenericCustomParameterChineseName("有功值")).toBe(false);
  });
});

describe("inferDeviceParameterChineseName", () => {
  test("核心 E 字段给出确定的中文名", () => {
    const cases = [
      ["rdf_id", "原始标识"],
      ["idx", "设备序号"],
      ["name", "设备名称"],
      ["dev_type", "设备类型"],
      ["i_node", "首端节点号"],
      ["j_node", "末端节点号"],
      ["parent", "所属模型"]
    ];
    for (const [en, expected] of cases) {
      expect(inferDeviceParameterChineseName(en), `${en} 的中文名`).toBe(expected);
    }
  });

  test("多端设备的第 N 端关联序号能推出来", () => {
    const label = inferDeviceParameterChineseName("idx_ac_load_t1");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  test("未登记的字段返回 undefined（调用方据此回落到兜底文案）", () => {
    // 实现的返回类型是 string | undefined（不是 null）—— 钉住这一点，
    // 因为 meaningfulDeviceParameterChineseName 靠 `?? 兜底` 接住它。
    for (const en of ["zzz_unknown_field", "", "   ", "___"]) {
      expect(inferDeviceParameterChineseName(en)).toBeUndefined();
    }
  });
});

describe("meaningfulDeviceParameterChineseName", () => {
  test("传入有效中文名时优先用它", () => {
    expect(meaningfulDeviceParameterChineseName("rated_capacity", "额定容量")).toBe("额定容量");
  });

  test("中文名与英文名相同时视为无效，回落到推断", () => {
    // en === cn 不算「有意义的中文名」
    const out = meaningfulDeviceParameterChineseName("rated_capacity", "rated_capacity");
    expect(out).not.toBe("rated_capacity");
  });

  test("中文名是通用占位（自定义参数）时回落到推断", () => {
    const out = meaningfulDeviceParameterChineseName("rated_capacity", "自定义参数");
    expect(out).not.toBe("自定义参数");
  });

  test("中文名无汉字时视为无效，回落到推断", () => {
    const out = meaningfulDeviceParameterChineseName("rated_capacity", "abc");
    expect(out).not.toBe("abc");
  });

  test("中文名为空时回落到推断", () => {
    const out = meaningfulDeviceParameterChineseName("rated_capacity", "");
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  test("两参都空时给出可读的兜底文案，不返回空串", () => {
    const out = meaningfulDeviceParameterChineseName("", "");
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  test("结果非 nullish 恒成立（导出表头不允许空）", () => {
    for (const [en, cn] of [["", ""], ["x", null], [undefined, undefined], ["a", "中"]]) {
      const out = meaningfulDeviceParameterChineseName(en, cn);
      expect(typeof out).toBe("string");
      expect(out.length).toBeGreaterThan(0);
    }
  });
});
