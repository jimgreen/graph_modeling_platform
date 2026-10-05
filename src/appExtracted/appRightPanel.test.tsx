import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { ContainerKindSelectValue, voltageBaseSideKeyForTerminal } from "./appRightPanel";
import { CONTAINER_KIND_LABELS } from "../acContainer";
import { MODEL_TYPES } from "../model";
import { getTerminalVoltageLevel, voltageBaseSettingModeForNode } from "../model-routing";

const renderValue = (props: Record<string, unknown>) =>
  renderToStaticMarkup(
    createElement(ContainerKindSelectValue, { disabled: false, onCommitKind: () => {}, ...props } as any)
  );

describe("容器「设备类型」行下拉", () => {
  test("显示当前 kind 的中文名,候选值 = 全部容器英文 kind(实际值仍是英文)", () => {
    const html = renderValue({ kind: "ac-switch-box" });
    expect(html).toContain("开关箱");
    expect(html).toContain(
      'data-inline-option-values="ac-vpp-box|ac-switch-box|ac-distribution-box|dc-vpp-box|hydrogen-vpp-box|heat-vpp-box"'
    );
  });

  test("kind 中文名与图元库单源一致(含非交流能流的虚拟电厂)", () => {
    expect(renderValue({ kind: "ac-vpp-box" })).toContain("虚拟电厂");
    expect(renderValue({ kind: "ac-distribution-box" })).toContain("配变箱");
    for (const kind of ["dc-vpp-box", "hydrogen-vpp-box", "heat-vpp-box"]) {
      expect(renderValue({ kind }), kind).toContain("虚拟电厂");
    }
  });

  test("浏览态显示中文名文本,不可点开下拉", () => {
    const html = renderValue({ kind: "ac-vpp-box", disabled: true });
    expect(html).toContain("虚拟电厂");
    expect(html).not.toContain("<button");
  });

  test("面板渲染点:仅容器 dev_type 行走下拉,普通设备仍走原编辑器", () => {
    const source = readFileSync(new URL("./appRightPanel.tsx", import.meta.url), "utf8");
    // 容器 dev_type 行被显式换成下拉组件(条件里同时含容器判定与 dev_type 键)
    const index = source.indexOf("<ContainerKindSelectValue");
    expect(index).toBeGreaterThan(-1);
    const guardIndex = source.indexOf("const isContainerDevTypeRow");
    expect(guardIndex).toBeGreaterThan(-1);
    const guard = source.slice(guardIndex, index);
    expect(guard).toContain("isContainerNode");
    expect(guard).toContain("dev_type");
    // 仅一处调用点,避免「只改一个入口」的分叉
    expect(source.match(/<ContainerKindSelectValue/g)?.length).toBe(1);
  });
});

describe("模型属性「模型类型」行下拉", () => {
  test("候选清单与「新建模型」弹窗逐项一致(model.ts MODEL_TYPES 单源),不再硬编码三项", () => {
    const source = readFileSync(new URL("./appRightPanel.tsx", import.meta.url), "utf8");
    // 从 model.ts 单源导入(与新建模型弹窗的 __appScope.MODEL_TYPES 是同一个常量)
    expect(source).toMatch(/import \{[^}]*MODEL_TYPES[^}]*\} from "\.\.\/model"/);
    // 候选值由 MODEL_TYPES 全量展开(轮 20 裁决:去掉「请选择」空项,两侧逐项一致)
    expect(source).toContain("...MODEL_TYPES.map((type) => ({ value: type, label: type }))");
    // 反证:旧硬编码三项与空项都不得残留(否则将来 MODEL_TYPES 变更时本行又落后于弹窗)
    for (const type of ["厂站", "馈线", "台区"]) {
      expect(source).not.toContain(`{ value: "${type}", label: "${type}" }`);
    }
    expect(source).not.toContain('{ value: "", label: "请选择" }');
  });

  test("新建模型弹窗与右侧面板读同一常数 —— 两侧守卫", () => {
    // 弹窗侧(新建模型):直接展开 __appScope.MODEL_TYPES
    const dialogSource = readFileSync(new URL("./appDeviceDefinitionDialogs.tsx", import.meta.url), "utf8");
    // 允许回调形参带上 ModelType 注解，仍必须读 __appScope.MODEL_TYPES
    expect(dialogSource).toMatch(/__appScope\.MODEL_TYPES\.map\(\(modelType(?::\s*ModelType)?\)\s*=>/);
    // 常数本身:五项清单(改动此处即同时改两侧)
    expect([...MODEL_TYPES]).toEqual(["厂站", "馈线", "台区", "微网", "其他"]);
  });
});

describe("变流器等分压设备的按端子电压等级行", () => {
  const panelledNode = (kind: string, params: Record<string, string> = {}) =>
    ({
      id: "n1",
      kind,
      name: "变流器",
      params,
      terminals: [
        { id: "t1", type: "dc", label: "直流设备端1", vbase: "" },
        { id: "t2", type: "dc", label: "直流设备端2", vbase: "" }
      ]
    }) as any;

  test("端子索引 → 侧电压 E 键:变流器走 source/target,变压器走 i/j/k", () => {
    // 变流器四种能流方向共用 DCACConverter/DCDCConverter/ACACConverter 段,两端各一列侧电压键
    for (const kind of ["dcdc-converter", "acdc-converter", "dcac-converter", "acac-converter"]) {
      expect(voltageBaseSideKeyForTerminal({ kind, params: {} }, 0)).toBe("source_vbase");
      expect(voltageBaseSideKeyForTerminal({ kind, params: {} }, 1)).toBe("target_vbase");
    }
    expect(voltageBaseSideKeyForTerminal({ kind: "ac-transformer", params: {} }, 0)).toBe("i_vbase");
    expect(voltageBaseSideKeyForTerminal({ kind: "ac-transformer", params: {} }, 1)).toBe("j_vbase");
    expect(voltageBaseSideKeyForTerminal({ kind: "ac-three-winding-transformer", params: {} }, 0)).toBe("i_vbase");
    expect(voltageBaseSideKeyForTerminal({ kind: "ac-three-winding-transformer", params: {} }, 1)).toBe("k_vbase");
    expect(voltageBaseSideKeyForTerminal({ kind: "ac-three-winding-transformer", params: {} }, 2)).toBe("j_vbase");
  });

  test("变流器两端能读回各自电压等级 —— 两行数据各取一端,互不串值", () => {
    const node = panelledNode("dcdc-converter", { source_vbase: "500", target_vbase: "220" });
    // 按端子分行渲染的判据
    expect(voltageBaseSettingModeForNode(node)).toBe("terminal");
    expect(Number(getTerminalVoltageLevel(node, "t1"))).toBe(500);
    expect(Number(getTerminalVoltageLevel(node, "t2"))).toBe(220);
  });

  test("面板接线:按端子分派、标签取端名、提交只落该端电压岛", () => {
    const source = readFileSync(new URL("./appRightPanel.tsx", import.meta.url), "utf8");
    // 分派:多电气端子 + terminal 模式才逐端分行(线路/负荷等 uniform 仍单行)
    expect(source).toContain('voltageBaseSettingModeForNode(node) === "terminal"');
    expect(source).toContain("electricalTerminals.length > 1");
    const rowStart = source.indexOf("const renderVoltageBaseTerminalRow");
    expect(rowStart).toBeGreaterThan(-1);
    const rowsStart = source.indexOf("const renderVoltageBaseRows");
    expect(rowsStart).toBeGreaterThan(rowStart);
    const rowSource = source.slice(rowStart, rowsStart);
    // 标签来源 = 端子 label(E 模板端名),与「设置电压基值」弹框同一口径
    expect(rowSource).toContain("terminal.label");
    expect(rowSource).toContain("电压等级");
    // 提交:按端写入 + 岛内扩散,不再把整设备当成一个电压等级
    expect(rowSource).toContain("setVoltageBaseTerminalValuesForScope(");
    expect(rowSource).toContain("{ [node.id]: { [terminal.id]: nextValue } }");
    expect(rowSource).toContain('"island"');
    // 两处调用点(容器参数表 / 通用参数表)都切到多行版本,旧单数调用不得残留
    expect(source.match(/renderVoltageBaseRows\(\)/g)?.length).toBe(2);
    expect(source.match(/renderVoltageBaseRow\(/g)).toBeNull();
  });
});

/**
 * 目标分支：`src/appExtracted/appRightPanel.tsx` L120（`keys[terminalIndex] ?? "vbase"`）
 * 与 L142（`CONTAINER_KIND_LABELS[kind] ?? kind`）。
 *
 * 两条都是**导出函数/组件内的 `??` 右臂**，不需要渲染整面板、直接调即可：
 *   · L120 —— `voltageBaseSideKeyForTerminal` 是纯函数，端子索引给超界值即可；
 *   · L142 —— `ContainerKindSelectValue` 是个无状态组件，`kind` 给一个不在
 *     CONTAINER_KIND_LABELS 里的英文 kind 即可（`CONTAINER_KIND_LABELS` 只覆盖
 *     CONTAINER_KINDS 六种容器），渲染出的 displayValue 会走右臂回落到 kind 本身。
 */
describe("分压设备的侧电压 E 键兜底（超界索引 → vbase）", () => {
  test("端子索引超出 keys 长度时回落到 vbase（变流器 / 双端 / 三绕组三条 keys 分支各测一次）", () => {
    // 变流器：keys = [source_vbase, target_vbase]（长度 2），索引 2 越界
    expect(voltageBaseSideKeyForTerminal({ kind: "dcdc-converter", params: {} }, 2)).toBe("vbase");
    // 双端变压器：keys = [i_vbase, j_vbase]（长度 2），索引 2 越界
    expect(voltageBaseSideKeyForTerminal({ kind: "ac-transformer", params: {} }, 2)).toBe("vbase");
    // 三绕组变压器：keys = [i_vbase, k_vbase, j_vbase]（长度 3），索引 3 越界
    expect(voltageBaseSideKeyForTerminal({ kind: "ac-three-winding-transformer", params: {} }, 3)).toBe("vbase");
  });

  test("负索引同样落空并回落到 vbase（不是 undefined）", () => {
    // Array[-1] === undefined，右臂必须生效
    expect(voltageBaseSideKeyForTerminal({ kind: "ac-transformer", params: {} }, -1)).toBe("vbase");
    expect(voltageBaseSideKeyForTerminal({ kind: "dcdc-converter", params: {} }, -1)).toBe("vbase");
  });

  test("索引在界内时不得走右臂（防兜底值恰好等于某个真键导致断言无鉴别力）", () => {
    // 显式反证：界内索引命中真键，不是 "vbase"
    expect(voltageBaseSideKeyForTerminal({ kind: "dcdc-converter", params: {} }, 0)).toBe("source_vbase");
    expect(voltageBaseSideKeyForTerminal({ kind: "ac-transformer", params: {} }, 1)).toBe("j_vbase");
    expect(voltageBaseSideKeyForTerminal({ kind: "ac-three-winding-transformer", params: {} }, 2)).toBe("j_vbase");
    // "vbase" 不在任何分支的 keys 里
    for (const key of ["source_vbase", "target_vbase", "i_vbase", "j_vbase", "k_vbase"]) {
      expect(key).not.toBe("vbase");
    }
  });
});

/**
 * ⚠ 这批断言**必须**走 `disabled` 渲染：`disabled` 时 `InlineEditableValue` 只输出
 * displayValue 的纯文本、不渲染候选清单。而候选清单里必然出现全部英文 kind
 * （`data-inline-option-values="ac-vpp-box|ac-switch-box|..."`），于是 enabled 渲染下
 * `toContain("ac-unknown-box")` 命中的其实是**候选项**而不是显示值 ——
 * 变异验证实测：把 L142 的 `?? kind` 整段删掉（displayValue 变 undefined）时，
 * enabled 版断言**全绿**。
 *
 * 变异验证补记（L142 的 `?? kind` 是**可证明的等价变异**，绿是正确结果）：
 *   · 删掉 `?? kind` ⇒ displayValue 为 undefined，而子组件自己带兜底
 *     `shownValue = displayValue ?? currentOption?.label ?? normalizedValue`
 *     （InputComponents.tsx L324）⇒ 未登记 kind 时 currentOption 为 undefined，
 *     于是 shownValue = normalizedValue = String(kind) = kind —— 与兜底臂**逐字相同**。
 *   · 可证明的前提：`containerKindOptions()` 的候选值集与 `CONTAINER_KIND_LABELS`
 *     的键集都派生自 `CONTAINER_KINDS`（acContainer.ts L572/L585），两集恒相等。
 *     故「在候选里」⟺「在标签表里」，不存在「有候选但没标签」那种能分辨两臂的 kind。
 *   · 什么会让它不再等价：`InlineEditableValue` 的 `?? currentOption?.label` 被删，
 *     或 `containerKindOptions()` 的候选集合扩到 `CONTAINER_KINDS` 之外 ——
 *     那时右臂就成了唯一承重的一层。
 *   · 另一条「右臂的**取值**确实承重」的证据：把 `kind` 换成字面量 "WRONG_LABEL" ⇒ 转红。
 */
describe("容器「设备类型」行的显示值兜底（未登记 kind → 回落到 kind 本身）", () => {
  const text = (kind: string) => renderValue({ kind, disabled: true });

  /** disabled 渲染的正文：`<span class="inline-property-value read-only">显示值</span>` */
  const displayText = (kind: string) => {
    const matched = /^<span class="inline-property-value read-only">([^<]*)<\/span>$/.exec(text(kind));
    expect(matched, `未渲染出只读显示值：${text(kind)}`).not.toBeNull();
    return matched![1];
  };

  test("未登记的英文 kind：displayValue 回落到 kind 本身而不是空串", () => {
    // 前提断言：确保传入的 kind 确实不在 CONTAINER_KIND_LABELS 里
    expect(CONTAINER_KIND_LABELS["ac-unknown-box"]).toBeUndefined();
    expect(displayText("ac-unknown-box")).toBe("ac-unknown-box");
  });

  test("非容器 kind（如变压器）：同样回落到 kind 本身", () => {
    // 变压器不是容器 kind ⇒ 不在 CONTAINER_KIND_LABELS 里
    expect(CONTAINER_KIND_LABELS["ac-transformer"]).toBeUndefined();
    expect(displayText("ac-transformer")).toBe("ac-transformer");
  });

  test("已登记的容器 kind 走中文名，右臂不得被误触发（双侧断言）", () => {
    // 显式反证：界内时走左臂（中文名）——纯文本里既没有英文 kind，也没有 <button> 候选清单
    const html = text("ac-switch-box");
    expect(html).not.toContain("<button");
    expect(displayText("ac-switch-box")).toBe("开关箱");
    expect(html).not.toContain("ac-switch-box");
  });

  test("兜底值必须逐字等于 kind 本身（防「恰好也是中文名」导致断言无鉴别力）", () => {
    // 登记表里 6 个 kind 的中文名两两与英文 kind 不同 ⇒ 回落值不可能碰巧等于任一中文名
    for (const kind of Object.keys(CONTAINER_KIND_LABELS)) {
      expect(displayText(kind), kind).toBe(CONTAINER_KIND_LABELS[kind]);
    }
    // 未登记的一律逐字回落（这三个共用中文名「虚拟电厂」，不能拿中文名当回落值的证据）
    for (const kind of ["ac-unknown-box", "ac-transformer", "dc-unknown-box", "ac-vpp-box-legacy"]) {
      expect(CONTAINER_KIND_LABELS[kind], kind).toBeUndefined();
      expect(displayText(kind), kind).toBe(kind);
    }
  });
});

/**
 * 纯数值的小数格式化已收拢到 `appInlineUtilityFunctions.formatNumericAtMostThreeDecimals`
 * （与批量编辑器共用）。右臂面板只保留它独有的 %/° 后缀分支。
 *
 * 这条是**静态接线守卫**：`formatAtMostThreeDecimals` 未导出，后缀分支无法用输出断言覆盖 ——
 * 把后缀分支误删掉时渲染路径不变，只有源码形态能看出来。
 */
describe("右臂面板的小数格式化：后缀分支留在本地，纯数值分支走共享函数", () => {
  const source = readFileSync(new URL("./appRightPanel.tsx", import.meta.url), "utf8");

  test("后缀分支（%/°）仍是本文件的实现", () => {
    expect(source).toContain("const NUMERIC_SUFFIX_VALUE_PATTERN = /^([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))([%°])$/;");
    expect(source).toContain("${numericValue.toFixed(3).replace(/\\.?(0+)$/, \"\")}${suffixMatch[2]}");
  });

  test("纯数值分支委派给共享函数，本地不再留正则/toFixed 副本", () => {
    expect(source).toMatch(
      /import \{ formatNumericAtMostThreeDecimals \} from "\.\/appInlineUtilityFunctions";/
    );
    expect(source).toContain("return formatNumericAtMostThreeDecimals(text);");
    // 反证：本地那份「纯数值正则 + toFixed(3)」不得复活（那正是本次收拢掉的重复）
    expect(source).not.toContain("PLAIN_NUMERIC_VALUE_PATTERN");
    // toFixed(3) 只允许出现在后缀分支那一行
    expect(source.match(/toFixed\(3\)/g)?.length).toBe(1);
  });
});
