// `validateStateDraftRows` 的零覆盖补齐。
//
// 此前全仓 9 处 `validateStateDraftRows` 命中全在 `appDeviceDefinitionFactories.test.ts`
// 的 mock 桩里（`() => ({ states, error: "" })`），真实实现从未被调用过 ——
// 于是这四条判据（空值、重复、全空行忽略、返回形状）一条都没有守卫。
//
// 源实现要点（src/stateIconDrawing.tsx 第 280 行起，共 4 段）：
//   1. populatedRows = 14 个字段里任一 `String(v ?? "").trim()` 非空的行；
//   2. 遍历 populatedRows，`!row.value.trim() || !row.name.trim()` 即返回
//      `{ states: [], error: "状态值和状态名称不能为空。" }`；
//   3. 按 `row.value.trim()` 去重，撞了就返回 `{ states: [], error: "状态值重复：<key>" }`；
//   4. 全部通过才返回 `{ states: normalizeStateDraftRows(populatedRows), error: "" }`。
//
// 注意判据 2 是**一条合并分支**：value 空与 name 空共用同一句文案，
// 源里不存在两套独立文案。所以下面两条用例钉的是同一条消息的两个入口。
import { describe, expect, test } from "vitest";
import {
  createStateDraftRow,
  validateStateDraftRows,
  type DeviceDefinitionStateDraftRow
} from "./stateIconDrawing";

const EMPTY_ERROR = "状态值和状态名称不能为空。";

/**
 * 造一行草稿：以 `createStateDraftRow()` 的默认值为底，再覆盖需要的字段。
 *
 * 不用裸对象字面量有两个原因：
 *   · `DeviceDefinitionStateDraftRow` 有 16 个字段（含 `id`），裸字面量必然带 `as any`；
 *   · `createStateDraftRow` 对 `name` 有 `definition.name ?? value` 的兜底，
 *     传 `{ value: "0" }` 会让 `name` 悄悄变成 `"0"`，
 *     于是想测「name 为空」的那条用例会被兜底悄悄填上，永远测不到目标分支。
 * 所以先造空行再显式覆盖，覆盖后的值是原样落地的（`row()` 不做任何 trim）。
 */
function row(patch: Partial<DeviceDefinitionStateDraftRow> = {}): DeviceDefinitionStateDraftRow {
  return { ...createStateDraftRow(), ...patch };
}

/**
 * 一行 14 个判据字段全空的草稿。
 *
 * 必须显式清空，不能直接用 `createStateDraftRow()`：它在无图时把 imageFit
 * 默认成 cover，于是每一行天生都「已填写」，永远进不了「整行皆空被忽略」那条路径。
 */
function blankRow(patch: Partial<DeviceDefinitionStateDraftRow> = {}): DeviceDefinitionStateDraftRow {
  return row({
    value: "",
    name: "",
    icon: "",
    image: "",
    imageAssetId: "",
    imageFit: "",
    text: "",
    color: "",
    fillColor: "",
    strokeColor: "",
    textColor: "",
    backgroundImage: "",
    backgroundImageAssetId: "",
    backgroundImageFit: "",
    imageCleared: "",
    ...patch
  });
}

describe("全部合法行", () => {
  test("不报错，states 按输入顺序给出归一后的 value 与 name", () => {
    const result = validateStateDraftRows([
      row({ value: "0", name: " 状态0 " }),
      row({ value: "1", name: "状态1" }),
      row({ value: "2", name: "状态2" })
    ]);

    expect(result.error).toBe("");
    // 断言在 states 上而不是只断言 error：删掉最后的正常返回分支改回 `states: []` 时，
    // 只钉 `error === ""` 会照样绿（空串既是成功默认值、也是任何「提前 return states: []」的产物）。
    expect(result.states.map((state) => state.value)).toEqual(["0", "1", "2"]);
    expect(result.states.map((state) => state.name)).toEqual(["状态0", "状态1", "状态2"]);
  });
});

describe("状态值与状态名称不能为空", () => {
  test("状态值为空串但其余字段有内容的行走空值报错分支", () => {
    // value 为空，但 name 非空 → 过滤器判定这行「已填写」，所以它能进入判据 2。
    // 若删掉 `!row.value.trim()`，本例会落到去重循环：key 为空串且只有一个候选 → 不重复 →
    // 走正常返回，error 变空串 → 红。
    const result = validateStateDraftRows([row({ value: "", name: "状态0" })]);

    expect(result.error).toBe(EMPTY_ERROR);
    expect(result.states).toEqual([]);
  });

  test("状态名称为空串但其余字段有内容的行走空值报错分支", () => {
    // 与上一条对称：name 为空，value 非空。
    // 若删掉 `|| !row.name.trim()`，本行走去重循环且不重复 → error 空串 → 红。
    const result = validateStateDraftRows([row({ value: "0", name: "" })]);

    expect(result.error).toBe(EMPTY_ERROR);
    expect(result.states).toEqual([]);
  });

  test("仅靠颜色或资源 id 填充的行也算已填写，故仍触发空值报错", () => {
    // 这条钉的是过滤器的字段覆盖面：value 与 name 双空，但 color / imageAssetId 非空。
    // 若过滤器只认 value 与 name，这两行会被整行丢掉 → error 空串 → 红。
    const onlyColor = validateStateDraftRows([row({ value: "", name: "", color: "#ff0000" })]);
    expect(onlyColor.error).toBe(EMPTY_ERROR);

    const onlyAssetId = validateStateDraftRows([row({ value: "", name: "", imageAssetId: "asset-1" })]);
    expect(onlyAssetId.error).toBe(EMPTY_ERROR);
  });
});

describe("状态值重复", () => {
  test("两条 trim 后相同的非空状态值报重复，文案带出该状态值", () => {
    // 故意让两条的 value 只有首尾空白之差：去重的 key 是 `row.value.trim()`，
    // 未经 trim 的 key 会漏判 → error 空串 → 红。
    const result = validateStateDraftRows([
      row({ value: " 1 ", name: "状态1" }),
      row({ value: "1", name: "状态1副本" })
    ]);

    expect(result.error).toBe("状态值重复：1");
    expect(result.states).toEqual([]);
  });

  test("重复判据不负责空值：两条空状态值先由空值判据拦下", () => {
    // 两行 value 都为空 → 判据 2 先返回，永远轮不到去重循环。
    // 这条把「先空值、后重复」的优先级钉死，防止有人调换两段循环顺序。
    const result = validateStateDraftRows([
      row({ value: "", name: "无名" }),
      row({ value: "", name: "无名2" })
    ]);

    expect(result.error).toBe(EMPTY_ERROR);
  });
});

describe("整行皆空", () => {
  test("全空白字段的行被忽略，既不报错也不进入 states", () => {
    const result = validateStateDraftRows([blankRow({ value: "   ", name: " \t " })]);

    // 只断言 error === "" 是空的 —— 它就是成功默认值。真正的判别力来自
    // error 与 states.length 的组合：整行忽略时二者是「无错误 + 零状态」，
    // 若过滤器被删掉，这行会进判据 2 变成「有错误 + 零状态」，
    // 而「有错误」那侧恰是断言钉住的值，故删除过滤器必然转红。
    expect(result.error).toBe("");
    expect(result.states).toEqual([]);
  });

  test("全空白行与合法行混排时被跳过，合法行照常归一", () => {
    const result = validateStateDraftRows([
      blankRow({ value: "  ", name: "  " }),
      row({ value: "0", name: "状态0" }),
      blankRow({ value: " ", name: "" })
    ]);

    expect(result.error).toBe("");
    expect(result.states.map((state) => state.value)).toEqual(["0"]);
  });
});

describe("报错时的返回形状", () => {
  test("对象只有 states 与 error 两个键，且 states 为空数组", () => {
    const emptyResult = validateStateDraftRows([row({ value: "", name: "状态0" })]);
    const duplicateResult = validateStateDraftRows([
      row({ value: "1", name: "状态1" }),
      row({ value: "1", name: "状态1副本" })
    ]);

    // 排序后比较，避免依赖字面量的键书写顺序。
    expect(Object.keys(emptyResult).sort()).toEqual(["error", "states"]);
    expect(emptyResult.states).toEqual([]);
    // 两条报错路径形状必须一致：调用方只读 .error 与 .states，不该有第三种形状。
    expect(Object.keys(duplicateResult).sort()).toEqual(["error", "states"]);
    expect(duplicateResult.states).toEqual([]);
  });
});