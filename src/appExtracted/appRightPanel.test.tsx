import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { ContainerKindSelectValue, voltageBaseSideKeyForTerminal } from "./appRightPanel";
import { MODEL_TYPES } from "../model";
import { getTerminalVoltageLevel, voltageBaseSettingModeForNode } from "../model-routing";

const renderValue = (props: Record<string, unknown>) =>
  renderToStaticMarkup(
    createElement(ContainerKindSelectValue, { disabled: false, onCommitKind: () => {}, ...props } as any)
  );

describe("容器「设备类型」行下拉", () => {
  test("显示当前 kind 的中文名,候选值 = 三容器英文 kind(实际值仍是英文)", () => {
    const html = renderValue({ kind: "ac-switch-box" });
    expect(html).toContain("开关箱");
    expect(html).toContain('data-inline-option-values="ac-vpp-box|ac-switch-box|ac-distribution-box"');
  });

  test("三 kind 中文名与图元库单源一致", () => {
    expect(renderValue({ kind: "ac-vpp-box" })).toContain("虚拟电厂");
    expect(renderValue({ kind: "ac-distribution-box" })).toContain("配变箱");
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
    expect(guard).toContain("isAcContainerNode");
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
    expect(dialogSource).toContain("__appScope.MODEL_TYPES.map((modelType) =>");
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
