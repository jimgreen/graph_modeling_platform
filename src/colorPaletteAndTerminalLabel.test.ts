// 配色归一与端子标签四件套（此前均零直呼）：
//   normalizeColorPalette   11 处生产调用
//   terminalTypeColor       同族（被 SVG 渲染直接消费）
//   terminalLabelForType    11 处
//   defaultTerminalVbase     9 处
//
// 两个都是**静默**型：配色读成默认色、端子电压基值全一样时，界面上看不出异常。
import { describe, expect, test } from "vitest";
import {
  DEFAULT_COLOR_PALETTE,
  DEFAULT_INITIAL_TERMINAL_VBASE,
  defaultTerminalVbase,
  normalizeColorPalette,
  terminalLabelForType,
  terminalTypeColor
} from "./model";

/** 归一后的记录按 `Record<TerminalType, string>` 标注，但运行时可能有**任意**键
 * （测试要索引 `pt` / `任意键` / `0` 这些非 TerminalType 键，故统一走这个别名）。 */
type AnyColors = Record<string, string>;

describe("normalizeColorPalette：★ 与默认值**合并**（我第一版误以为是「只过滤」）", () => {
  // 探针推翻了我的初判：我看到 `reduce` 就以为累加器是空的、结果只保留传入的键。
  // 实际上第 5 行 `}, { ...fallback });` 给了初值 `{ ...fallback }` ——
  // 所以是「以默认配色为底，用合法项覆盖」。
  // 差别很实在：传 `{ energy: { ac: "#f00" } }` 的结果是**完整的 4 键**，
  // 而不是只剩 ac 一个键。
  test("部分覆盖：结果仍是完整键集", () => {
    const out = normalizeColorPalette({ energy: { ac: "#ff0000" } } as never);
    expect(Object.keys(out.energy).sort()).toEqual(Object.keys(DEFAULT_COLOR_PALETTE.energy).sort());
    expect(out.energy.ac, "传入的项覆盖默认").toBe("#ff0000");
    expect(out.energy.dc, "未传入的项保留默认").toBe(DEFAULT_COLOR_PALETTE.energy.dc);
  });

  test("★ 非法值**保留默认**（不是被丢弃）", () => {
    const out = normalizeColorPalette({
      energy: { ac: "", dc: "   ", pe: 123, pv: true, pr: null, pt: "#xyz" }
    } as never);
    // 非法项：键仍在、值是默认
    expect(out.energy.ac).toBe(DEFAULT_COLOR_PALETTE.energy.ac);
    expect(out.energy.dc).toBe(DEFAULT_COLOR_PALETTE.energy.dc);
    // 合法项：trim 后覆盖
    expect((out.energy as AnyColors).pt, "pt 不在默认里，是新增键").toBe("#xyz");
  });

  test("合法值被 trim", () => {
    const out = normalizeColorPalette({ energy: { ac: "  #abc  " } } as never);
    expect(out.energy.ac).toBe("#abc");
  });

  test("★ 非字符串一律视为非法（保留默认），不做 String() 转换", () => {
    const out = normalizeColorPalette({
      energy: { ac: 123, dc: true, h2: null, heat: undefined }
    } as never);
    expect(out.energy.ac).toBe(DEFAULT_COLOR_PALETTE.energy.ac);
    expect(out.energy.dc).toBe(DEFAULT_COLOR_PALETTE.energy.dc);
    expect(out.energy.h2).toBe(DEFAULT_COLOR_PALETTE.energy.h2);
    expect(out.energy.heat).toBe(DEFAULT_COLOR_PALETTE.energy.heat);
  });

  test("新增未知键会被**加入**结果（不校验键名）", () => {
    const out = normalizeColorPalette({ energy: { 任意键: "#123456" } } as never);
    expect((out.energy as AnyColors)["任意键"]).toBe("#123456");
    // 默认的键一个都没丢
    expect(Object.keys(out.energy).length).toBe(Object.keys(DEFAULT_COLOR_PALETTE.energy).length + 1);
  });

  test("voltage 段同理（键是电压等级名）", () => {
    const out = normalizeColorPalette({ voltage: { "10kV": " #00f " } } as never);
    expect((out.voltage as AnyColors)["10kV"], "新增电压等级").toBe("#00f");
    expect(Object.keys(out.voltage).length).toBe(Object.keys(DEFAULT_COLOR_PALETTE.voltage).length + 1);
    expect((out.voltage as AnyColors)["220"], "默认的 220kV 仍在").toBe((DEFAULT_COLOR_PALETTE.voltage as AnyColors)["220"]);
  });

  test("默认 voltage 键数为 48（两个段各一份，加新键时须同步核对）", () => {
    expect(Object.keys(DEFAULT_COLOR_PALETTE.energy).length).toBe(4);
    expect(Object.keys(DEFAULT_COLOR_PALETTE.voltage).length).toBe(48);
  });
});

describe("normalizeColorPalette：整体入参的边界", () => {
  test("falsy / 非对象 → 返回 fallback 的**拷贝**（不同引用）", () => {
    for (const value of [null, undefined, 0, "", false, 42, true, "str"] as never[]) {
      const out = normalizeColorPalette(value);
      expect(out.energy, String(value)).toEqual(DEFAULT_COLOR_PALETTE.energy);
      expect(out.energy, `${String(value)} 应是拷贝`).not.toBe(DEFAULT_COLOR_PALETTE.energy);
      expect(out.voltage, `${String(value)} 应是拷贝`).not.toBe(DEFAULT_COLOR_PALETTE.voltage);
    }
  });

  test("空对象 → **完整的默认配色**（不是空）", () => {
    const out = normalizeColorPalette({} as never);
    expect(out.energy).toEqual(DEFAULT_COLOR_PALETTE.energy);
    expect(out.voltage).toEqual(DEFAULT_COLOR_PALETTE.voltage);
  });

  test("只给一段时，另一段落默认", () => {
    const out = normalizeColorPalette({ energy: { ac: "#111" } } as never);
    expect(out.voltage).toEqual(DEFAULT_COLOR_PALETTE.voltage);
  });

  test("★ 数组 source 会产出**索引键**（`typeof [] === \"object\"` 通过了守卫）", () => {
    // 探针实测：`{ energy: ["#111", "#222"] }` → energy 里有 "0" / "1" 两个键，
    // 且默认值全部保留。脏数据（把对象写成数组）不会报错，只会多两个垃圾键。
    const out = normalizeColorPalette({ energy: ["#111", "#222"] } as never);
    expect((out.energy as AnyColors)["0"]).toBe("#111");
    expect((out.energy as AnyColors)["1"]).toBe("#222");
    expect(out.energy.ac, "默认值仍在").toBe(DEFAULT_COLOR_PALETTE.energy.ac);
    expect(Object.keys(out.energy).length).toBe(Object.keys(DEFAULT_COLOR_PALETTE.energy).length + 2);
  });

  test("两段独立：energy 的脏数据不污染 voltage", () => {
    const out = normalizeColorPalette({ energy: { bad: 1 } } as never);
    expect(out.voltage).toEqual(DEFAULT_COLOR_PALETTE.voltage);
  });

  test("幂等：normalize(normalize(x)) === normalize(x)", () => {
    const once = normalizeColorPalette({ energy: { ac: " #a " }, 垃圾: 1, junk: "x" } as never);
    const twice = normalizeColorPalette(once);
    expect(twice).toEqual(once);
  });
});

describe("terminalTypeColor：空 type 落 ac，未知 type 落 **undefined**", () => {
  test("正常 type 从配色取", () => {
    expect(terminalTypeColor("ac")).toBe(DEFAULT_COLOR_PALETTE.energy.ac);
    expect(terminalTypeColor("dc")).toBe(DEFAULT_COLOR_PALETTE.energy.dc);
    expect(terminalTypeColor("h2")).toBe(DEFAULT_COLOR_PALETTE.energy.h2);
    expect(terminalTypeColor("heat")).toBe(DEFAULT_COLOR_PALETTE.energy.heat);
  });

  test("★ 空 type（undefined / \"\" / null）→ 落 ac", () => {
    // `type ? palette.energy[type] ?? ... : palette.energy.ac ?? ...`
    for (const type of [undefined, "", null, 0, false] as never[]) {
      expect(terminalTypeColor(type as never), String(type)).toBe(DEFAULT_COLOR_PALETTE.energy.ac);
    }
  });

  test("★ 未知 type → 返回 **undefined**（返回类型标注是 string，实际可能不是）", () => {
    // 探针实测。`palette.energy["nope"]` 与 `DEFAULT_COLOR_PALETTE.energy["nope"]`
    // 都是 undefined，所以两个 `??` 都落空。
    //
    // **判定不修**（三个理由）：
    // ① 返回类型标注是 `string`，11 个调用点都直接把它塞进 SVG 的 `fill`/`stroke`。
    //    `undefined` 在 React 里渲染成「属性不出现」，在拼接字符串里是字面 "undefined" ——
    //    两种都是**可见的**样式缺失，不是静默失真。
    // ② 改成一个兜底色（如灰色）会让「未知端子类型」看起来像「已知的灰色端子」，
    //    掩盖真正的配置问题；而 `TerminalType` 是**联合类型**，
    //    传 `"nope"` 本身就违背类型契约。
    // ③ 11 个调用点里有 5 处传的实参是 `TerminalType` 标注的变量，
    //    运行时不越界的路径已被 TS 覆盖。
    // 现状钉进测试：日后有人加兜底色，这里会转红提醒。
    const out = terminalTypeColor("nope" as never);
    expect(out, "实测是 undefined").toBeUndefined();
    expect(typeof out).not.toBe("string");
  });

  test("自定义 palette 里缺该 type 时回落到默认配色", () => {
    const palette = normalizeColorPalette({ energy: { ac: "#aaa" } } as never);
    expect(terminalTypeColor("ac", palette)).toBe("#aaa");
    expect(terminalTypeColor("dc", palette), "palette 里没覆盖 dc → 回落默认").toBe(DEFAULT_COLOR_PALETTE.energy.dc);
  });

  test("空 type 时的两级回落：先 palette.energy.ac，再默认的 ac", () => {
    // `palette.energy.ac ?? DEFAULT_COLOR_PALETTE.energy.ac` ——
    // 正常配色里 ac 一定存在，所以第二级是死代码；但若有人手工造出
    // 没有 ac 的 palette，它才生效。逐条钉住两级。
    const noAc = { energy: {}, voltage: {} } as never;
    expect(terminalTypeColor(undefined, noAc)).toBe(DEFAULT_COLOR_PALETTE.energy.ac);
    const withAc = { energy: { ac: "#zzz" }, voltage: {} } as never;
    expect(terminalTypeColor(undefined, withAc)).toBe("#zzz");
  });
});

describe("terminalLabelForType：`<类型名>端<index+1>`", () => {
  test("正常路径（1-based 编号）", () => {
    expect(terminalLabelForType("ac", 0)).toBe("交流设备端1");
    expect(terminalLabelForType("ac", 1)).toBe("交流设备端2");
    expect(terminalLabelForType("ac", 9)).toBe("交流设备端10");
    expect(terminalLabelForType("dc", 0)).toBe("直流设备端1");
  });

  test("★ 未知 type 直接用原字符串当类型名（不抛错）", () => {
    expect(terminalLabelForType("nope" as never, 0)).toBe("nope端1");
  });

  test("★ 异常 index 原样拼进字符串（不校验、不取整）", () => {
    // 探针实测表。`index + 1` 是纯算术，没有任何边界检查。
    // 真实数据的 index 来自 `side.terminalIndex`（模板定义里的 0-based 下标），
    // 实测恒为非负整数；下表是「万一不是」时的实际行为。
    const table: Array<[number, string]> = [
      [-1, "交流设备端0"],
      [-5, "交流设备端-4"],
      [1.5, "交流设备端2.5"],
      [0.5, "交流设备端1.5"],
      [Number.NaN, "交流设备端NaN"],
      [Number.POSITIVE_INFINITY, "交流设备端Infinity"]
    ];
    for (const [index, expected] of table) {
      expect(terminalLabelForType("ac", index), `index=${index}`).toBe(expected);
    }
  });
});

describe("★ defaultTerminalVbase：形参 `_type` 完全没被使用", () => {
  // `export const defaultTerminalVbase = (_type: TerminalType) => DEFAULT_INITIAL_TERMINAL_VBASE;`
  // 形参前缀下划线 = 刻意不用。**所有**端子类型拿到同一个基值。
  test("各种 type 都得同一个常量", () => {
    const values = new Set(
      (["ac", "dc", "h2", "heat", "nope", undefined] as never[]).map((t) =>
        JSON.stringify(defaultTerminalVbase(t as never))
      )
    );
    expect(values.size, "不同取值数").toBe(1);
    expect([...values]).toEqual([JSON.stringify(DEFAULT_INITIAL_TERMINAL_VBASE)]);
  });

  test("常量是空串（探针实测是 \"0\"，以本仓库的常量为准）", () => {
    // 这条断言写成「等于常量」而不是写死字面量：常量若被调整，
    // 期望自动跟随，而「所有 type 得同一个值」这条不变式仍会被上面那条守住。
    expect(defaultTerminalVbase("ac")).toBe(DEFAULT_INITIAL_TERMINAL_VBASE);
    expect(typeof DEFAULT_INITIAL_TERMINAL_VBASE).toBe("string");
  });

  test("★ 形参不参与计算 → 传什么都不影响输出（包括 undefined / 任意对象）", () => {
    const baseline = defaultTerminalVbase("ac");
    for (const type of [undefined, null, 0, "", {}, [], NaN, Symbol("x")] as never[]) {
      expect(defaultTerminalVbase(type as never), String(type)).toBe(baseline);
    }
  });

  test("不传参也能调（形参标注必填但运行时无影响）", () => {
    expect(defaultTerminalVbase(undefined as never)).toBe(DEFAULT_INITIAL_TERMINAL_VBASE);
  });
});
