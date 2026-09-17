import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { ContainerKindSelectValue } from "./appRightPanel";
import { MODEL_TYPES } from "../model";

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
  test("候选清单与「新建模型」弹窗同源(model.ts MODEL_TYPES 单源),不再硬编码三项", () => {
    const source = readFileSync(new URL("./appRightPanel.tsx", import.meta.url), "utf8");
    // 从 model.ts 单源导入(与新建模型弹窗的 __appScope.MODEL_TYPES 是同一个常量)
    expect(source).toMatch(/import \{[^}]*MODEL_TYPES[^}]*\} from "\.\.\/model"/);
    // 候选值由 MODEL_TYPES 展开(「请选择」空项除外)
    expect(source).toContain("...MODEL_TYPES.map((type) => ({ value: type, label: type }))");
    // 反证:旧硬编码三项不得残留(否则将来 MODEL_TYPES 变更时本行又落后于弹窗)
    for (const type of ["厂站", "馈线", "台区"]) {
      expect(source).not.toContain(`{ value: "${type}", label: "${type}" }`);
    }
  });

  test("新建模型弹窗与右侧面板读同一常数 —— 两侧守卫", () => {
    // 弹窗侧(新建模型):直接展开 __appScope.MODEL_TYPES
    const dialogSource = readFileSync(new URL("./appDeviceDefinitionDialogs.tsx", import.meta.url), "utf8");
    expect(dialogSource).toContain("__appScope.MODEL_TYPES.map((modelType) =>");
    // 常数本身:五项清单(改动此处即同时改两侧)
    expect([...MODEL_TYPES]).toEqual(["厂站", "馈线", "台区", "微网", "其他"]);
  });
});
