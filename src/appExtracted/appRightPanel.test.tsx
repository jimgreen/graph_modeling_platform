import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { ContainerKindSelectValue } from "./appRightPanel";

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
