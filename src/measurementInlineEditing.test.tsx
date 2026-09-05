import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { createRenderSelectedNodeMeasurementTable } from "./appExtracted/appGraphMeasurementFactories";
import { InlineEditableValue } from "./components/InputComponents";

function measurementEditors(overrides: Record<string, unknown> = {}, terminalId?: string) {
  const item = { id: "item", measurementTypeId: "q", sourcePoint: "", ...overrides };
  const group = { id: "group", nodeId: "node", terminalId, layout: "vertical", items: [item] };
  const type = { id: "q", name: "无功功率", shortLabel: "Q", defaultUnit: "Mvar", valueType: "number", defaultDecimals: 3 };
  const update = vi.fn();
  const panel = createRenderSelectedNodeMeasurementTable({
    Fragment, DeferredColorInput: () => null, isBrowseMode: false,
    measurementConfig: { measurementTypes: [type] },
    measurementTypeById: new Map([["q", type]]),
    measurementTypeOptionsForMeasurementGroup: () => [type],
    measurementGroupBackgroundColor: () => "transparent",
    selectedMeasurementGroups: [group], updateMeasurementItem: update,
  })({ id: "node", terminals: [] } as any);
  const editors: ReactElement<any>[] = [];
  const visit = (children: ReactNode) => Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<any>;
    if (element.type === InlineEditableValue) editors.push(element);
    visit(element.props.children);
  });
  visit(panel);
  return { item, update, editors, field: (label: string) => editors.find((editor) => editor.props["aria-label"] === label)!.props };
}

test("measurement editors start with inherited label, format, unit and source point", () => {
  const { editors, field, update } = measurementEditors();
  expect(field("量测标签").value).toBe("Q");
  expect(field("量测显示格式").value).toBe("%.3f");
  expect(field("量测单位").value).toBe("Mvar");
  const source = editors.find((editor) => editor.props.value === "node.q")!;
  expect(source).toBeDefined();
  for (const label of ["量测标签", "量测显示格式", "量测单位"]) {
    field(label).onCommit(field(label).value);
  }
  source.props.onCommit("node.q");
  expect(update).not.toHaveBeenCalled();
  expect(measurementEditors({}, "t1").editors.some((editor) => editor.props.value === "node.t1.q")).toBe(true);
});

test("measurement editors retain explicit overrides including empty labels and units", () => {
  const { field } = measurementEditors({ labelOverride: "", unitOverride: "", formatOverride: "%.1f" });
  expect(field("量测标签").value).toBe("");
  expect(field("量测单位").value).toBe("");
  expect(field("量测显示格式").value).toBe("%.1f");
});

test("measurement editors commit edits, explicit clears and format reset", () => {
  const { field, update, item } = measurementEditors();
  field("量测标签").onCommit("");
  expect(update.mock.calls.at(-1)![2](item).labelOverride).toBe("");
  field("量测单位").onCommit("kvar");
  expect(update.mock.calls.at(-1)![2](item).unitOverride).toBe("kvar");
  field("量测显示格式").onCommit(" %.2f ");
  expect(update.mock.calls.at(-1)![2](item).formatOverride).toBe("%.2f");
  field("量测显示格式").onCommit("");
  expect(update.mock.calls.at(-1)![2](item).formatOverride).toBeUndefined();
});
