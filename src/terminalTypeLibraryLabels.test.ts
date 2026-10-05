// 端子类型库中文名映射（此前零直呼）：
//   TERMINAL_TYPE_LIBRARY_LABELS 在 src/model.ts 约 7070 行，被 terminalTypeLabel /
//   terminalPortLabel / terminalLabelForType 以及各处端子标签渲染消费。
//
// 全仓其它 14 处引用**全是 vi.mock 桩值**（`{ac:"交流"}` 或 `{}`），
// 真实字面量从没被任何用例读过 —— 桩值断言的是「桩自己」。
// 本文件因此直呼源文件，不 mock 任何东西。
//
// 这四个值是**静默**型：写错一个字（氢 → 氢能不换、热 → 熟）不抛错，
// 只在界面上把端子类型名显示错；`?? type` 兜底也只在键缺失时才生效，
// 键存在但值写错时照样原样渲染。
//
// 变异验证（注入 src/model.ts 后跑本文件，四条全红）：
//   ① h2 值改错字（氢能设备 → 氢能器材）   → 2 failed（逐键 + 整体 toEqual）
//   ② 删掉 heat 整个键                       → 4 failed（含 typeof 守卫）
//   ③ dc 值改成与 ac 相同（交流设备）          → 3 failed（互不相同那条自己响了）
//   ④ heat 值改成纯空格                      → 3 failed（trim 后非空那条自己响了）
import { describe, expect, test } from "vitest";
import { TERMINAL_TYPE_LIBRARY_LABELS, type TerminalType } from "./model";

/** 期望键集。用 `TerminalType[]` 标注，让 TS 负责发现源码新增/删除端子类型。 */
const EXPECTED_KEYS: readonly TerminalType[] = ["ac", "dc", "h2", "heat"];

/** 期望映射，逐字抄自 src/model.ts 的真实字面量（非记忆、非推测）。 */
const EXPECTED_LABELS: Record<TerminalType, string> = {
  ac: "交流设备",
  dc: "直流设备",
  h2: "氢能设备",
  heat: "热能设备"
};

/** 该常量标注为 `Record<TerminalType, string>`，但断言要按任意键索引，故走别名。 */
type AnyLabels = Record<string, string>;
const LABELS = TERMINAL_TYPE_LIBRARY_LABELS as AnyLabels;

describe("TERMINAL_TYPE_LIBRARY_LABELS：端子类型库中文名映射", () => {
  test("键集恰为 ac / dc / h2 / heat：多一个或少一个都判失败", () => {
    // 排序后比数组：删键会让长度变短、加键会让长度变长，两种改法都会红。
    expect(Object.keys(LABELS).sort()).toEqual([...EXPECTED_KEYS].sort());
    expect(Object.keys(LABELS)).toHaveLength(EXPECTED_KEYS.length);
  });

  test("每个键映射到对应的中文设备名", () => {
    // 逐键断言而非只比整体：某一键被换成别的键值时，整体比法与逐键法同样能红，
    // 但逐键法在失败时直接指明是哪一类端子被改。
    expect(LABELS.ac, "交流端子").toBe(EXPECTED_LABELS.ac);
    expect(LABELS.dc, "直流端子").toBe(EXPECTED_LABELS.dc);
    expect(LABELS.h2, "氢能端子").toBe(EXPECTED_LABELS.h2);
    expect(LABELS.heat, "热能端子").toBe(EXPECTED_LABELS.heat);
  });

  test("四个值都是非空字符串，且互不相同", () => {
    for (const key of EXPECTED_KEYS) {
      const value = LABELS[key];
      expect(typeof value, `${key} 应为字符串`).toBe("string");
      // trim 后仍非空：漏写成空串或纯空格同样静默，界面上端子名会整段消失。
      expect(value.trim(), `${key} 不应为空串或纯空格`).not.toBe("");
    }
    // 重复值会让两种端子在界面上显示同一个名字，属真 bug，必须钉死。
    expect(new Set(EXPECTED_KEYS.map((key) => LABELS[key])).size).toBe(EXPECTED_KEYS.length);
  });

  test("整体对象与源码映射逐字一致", () => {
    // 兜住「键值都在但顺序/内容整体被替换」这一类改法。
    expect(TERMINAL_TYPE_LIBRARY_LABELS).toEqual(EXPECTED_LABELS);
  });
});