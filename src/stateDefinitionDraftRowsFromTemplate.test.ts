// `createDefinitionStateDraftRows` 的零覆盖补齐。
//
// 此前全仓 7 处 `createDefinitionStateDraftRows` 命中里，6 处是 `stateIconDrawing.test.ts`
// 的 `vi.mock` 桩（`() => [...]`），第 7 处是 `appDeviceDefinitionFactories.tsx` 的转发壳
// —— 真实实现（src/stateIconDrawing.tsx 第 254 行）从未被任何用例调用过。
// 于是「打开器件定义面板、按模板铺出状态行」这条链路一次都没跑过真代码。
//
// 源实现只有一行，但链路有三段，缺一段就整条塌：
//   1. `getTemplateStateDefinitions`（model.ts）：`stateDefinitions` 是数组才走归一化，
//      **否则回落到二元状态默认值**（开关/断路器类 kind 得「打开/开断 + 闭合」两行）；
//   2. `normalizeDeviceStateDefinitions`：按 value 去重、丢空 value、逐字段 trim，
//      且**新建对象**（这就是下面「不就地修改」那条断言的承重处）；
//   3. `createStateDraftRow`：每行现调 `stateDraftRowId()` = `randomId("state-")`，
//      即每行一个全新 UUID —— 这是 id 两两不同的唯一来源。
//
// 注意第 1 段的回落：判据是 kind 是否开关类，所以「无 stateDefinitions 返回空数组」
// 那条必须用非开关 kind（此处 static-text），否则会拿到二元默认两行而误判成 bug。
import { describe, expect, test } from "vitest";
import { createDefinitionStateDraftRows } from "./stateIconDrawing";
import type { DeviceStateDefinition, DeviceTemplate } from "./model";

/**
 * 造一个最小可用的模板。
 *
 * kind 固定为 static-text：它既不是容器，也不含 switch / breaker / disconnector / valve
 * 子串，E 段表里也没有 status 列，于是 `isDefaultBinaryStateDeviceKind` 为 false。
 * 这条是「无 stateDefinitions 回落为空数组」那条用例成立的前提。
 *
 * `stateDefinitions` 缺省时**整个键不写**（而不是写 undefined）：
 * `getTemplateStateDefinitions` 判的是 `Array.isArray`，两者结果相同，
 * 但保持「键不存在」这个真实形状，免得读用例的人误以为在测 undefined 分支。
 */
function makeTemplate(stateDefinitions?: DeviceStateDefinition[]): DeviceTemplate {
  const template: DeviceTemplate = {
    kind: "static-text",
    label: "状态草稿行模板",
    categoryLibrary: "Static",
    size: { width: 60, height: 60 },
    params: {},
    terminalType: "ac",
    terminalCount: 1
  };
  if (stateDefinitions) {
    template.stateDefinitions = stateDefinitions;
  }
  return template;
}

describe("行数与顺序", () => {
  test("模板带 3 条状态定义时返回恰好 3 行，顺序与模板一致", () => {
    // 故意用 2 / 0 / 1 这个非递增顺序：若有人在链路上插了排序或去重后重排，
    // 断言的 name 序列会立刻对不上。
    const template = makeTemplate([
      { value: "2", name: "第三" },
      { value: "0", name: "第一" },
      { value: "1", name: "第二" }
    ]);

    const rows = createDefinitionStateDraftRows(template);

    expect(rows).toHaveLength(3);
    // 顺序用 name 序列钉：value 序列与 name 序列一一对应，但 name 语义更直观。
    expect(rows.map((row) => row.name)).toEqual(["第三", "第一", "第二"]);
    expect(rows.map((row) => row.value)).toEqual(["2", "0", "1"]);
  });

  test("模板给 5 条时同样一行不多一行不少", () => {
    const template = makeTemplate(
      Array.from({ length: 5 }, (_, index) => ({ value: String(index), name: `状态${index}` }))
    );

    expect(createDefinitionStateDraftRows(template)).toHaveLength(5);
  });
});

describe("业务字段搬运", () => {
  test("名称与值经 trim 后落到草稿，icon / 颜色 / 文本一并搬过来", () => {
    const template = makeTemplate([
      // 首尾各留空白：归一化会 trim，若哪天 trim 被删，这里的期望值就变红。
      { value: " 0 ", name: " 合闸 ", icon: "icon-close", color: "#ff0000" },
      { value: "1", name: "分闸", icon: "icon-open", fillColor: "#00ff00" },
      { value: "7", name: "中间态", text: "MID" }
    ]);

    const rows = createDefinitionStateDraftRows(template);

    expect(rows.map((row) => row.value)).toEqual(["0", "1", "7"]);
    expect(rows.map((row) => row.name)).toEqual(["合闸", "分闸", "中间态"]);
    // 第三行模板没给 icon，空串是 createStateDraftRow 的默认值 —— 也钉住「不串行」。
    expect(rows.map((row) => row.icon)).toEqual(["icon-close", "icon-open", ""]);
    expect(rows[0].color).toBe("#ff0000");
    expect(rows[1].fillColor).toBe("#00ff00");
    expect(rows[2].text).toBe("MID");
  });

  test("带图片资源的状态定义落到 fixed 适配模式，无图的落到 cover", () => {
    // fallbackImageFit 由 hasImage 决定，所以这两个期望值不同，
    // 断言有判别力（若 hasImage 判据被删，两行会同值而红）。
    const template = makeTemplate([
      { value: "0", name: "无图" },
      { value: "1", name: "有图", imageAssetId: "asset-1" }
    ]);

    const rows = createDefinitionStateDraftRows(template);

    expect(rows.map((row) => row.imageFit)).toEqual(["cover", "fixed"]);
    expect(rows[1].imageAssetId).toBe("asset-1");
  });
});

describe("草稿 id", () => {
  test("每行 id 都是非空字符串，且行与行之间两两不同", () => {
    // 本文件的核心断言。id 由 createStateDraftRow 现调 stateDraftRowId()（UUID）产生；
    // 若有人改成常量、或用行序号以外的共享值，Set 长度就小于行数 → 红。
    const template = makeTemplate([
      { value: "0", name: "第一" },
      { value: "1", name: "第二" },
      { value: "2", name: "第三" }
    ]);

    const rows = createDefinitionStateDraftRows(template);
    const ids = rows.map((row) => row.id);

    for (const id of ids) {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    }
    expect(new Set(ids).size).toBe(3);
  });

  test("两次调用同一模板，六行 id 互不相同（id 不跨调用复用）", () => {
    // 上一条只管住单次调用内部。这里管住「id 是否每次现生成」：
    // 若改成按 value 缓存 id，两次调用的 id 就会两两重合 → Set 长度 3 ≠ 6 → 红。
    const template = makeTemplate([
      { value: "0", name: "第一" },
      { value: "1", name: "第二" },
      { value: "2", name: "第三" }
    ]);

    const first = createDefinitionStateDraftRows(template);
    const second = createDefinitionStateDraftRows(template);

    expect(new Set([...first, ...second].map((row) => row.id)).size).toBe(6);
  });
});

describe("空模板", () => {
  test("模板缺 stateDefinitions 时返回空数组", () => {
    // 走到 defaultDeviceStateDefinitionsForTemplate，static-text 非开关类 → 空数组。
    expect(createDefinitionStateDraftRows(makeTemplate())).toEqual([]);
  });

  test("模板给空数组时返回空数组", () => {
    // 与上一条结果相同但入口不同：Array.isArray 为真，直接归一化空数组。
    // 两条分开写，是为了让「回落分支」与「显式空数组分支」任一被改都还有一条能红。
    expect(createDefinitionStateDraftRows(makeTemplate([]))).toEqual([]);
  });
});

describe("空值与重复值的剔除", () => {
  test("纯空白的状态值整条被丢掉，不产生空行", () => {
    // 判据是 `!stateValue`，而 stateValue 已经 trim 过：`"   "` 归一成 `""` → 丢弃。
    // 若去掉 trim，`"   "` 是真值 → 这条会变成一行，而 createStateDraftRow 会把它的
    // value 再 trim 回空串，于是面板上多出一行「有行无值」的状态。故期望必须是零行。
    const template = makeTemplate([
      { value: "   ", name: "空白值" },
      { value: "0", name: "合闸" }
    ]);

    const rows = createDefinitionStateDraftRows(template);

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("合闸");
  });

  test("仅首尾空白不同的两个状态值算同一个，只留先到的那条", () => {
    // 去重键是 trim 后的 value。若去掉 trim，`" 1 "` 与 `"1"` 就是两个键 → 多出一行。
    const template = makeTemplate([
      { value: " 1 ", name: "分闸" },
      { value: "1", name: "分闸副本" },
      { value: " 0 ", name: " 合闸 " }
    ]);

    const rows = createDefinitionStateDraftRows(template);

    expect(rows).toHaveLength(2);
    // 去重保留的是**先到**那条，名字即第一条的名字。
    expect(rows.map((row) => row.name)).toEqual(["分闸", "合闸"]);
  });
});

describe("入参不被就地修改", () => {
  test("调用后模板对象与调用前的深快照完全相等", () => {
    const template = makeTemplate([
      { value: " 0 ", name: " 合闸 ", icon: "icon-close", imageAssetId: "asset-1" },
      { value: "1", name: "分闸" },
      { value: "7", name: "中间态" }
    ]);
    const before = structuredClone(template);

    createDefinitionStateDraftRows(template);

    // 若 normalizeDeviceStateDefinitions 改成在源对象上写回（比如给 item 补默认字段），
    // 这里就会红 —— 模板是 App 侧的活对象，就地改会连带污染图元库里的模板。
    expect(template).toEqual(before);
    expect(template.stateDefinitions).toHaveLength(3);
  });

  test("返回的行是新建对象，不是模板状态定义本身", () => {
    const template = makeTemplate([{ value: "0", name: "第一" }, { value: "1", name: "第二" }]);
    const definitions = template.stateDefinitions as DeviceStateDefinition[];

    const rows = createDefinitionStateDraftRows(template);

    // 引用相等断言：上面那条深相等挡不住「返回的就是源数组元素」这种别名，
    // 因为源对象没被改时深相等照样通过，但面板里编辑一行就会写穿到模板上。
    expect(rows[0]).not.toBe(definitions[0]);
    expect(rows[1]).not.toBe(definitions[1]);
    // 且行里多一个模板没有的 id 字段，别名的话这行不存在。
    expect(rows[0].id).toBeTruthy();
  });
});