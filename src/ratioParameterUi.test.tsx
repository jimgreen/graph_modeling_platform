import type { ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";

import { renderTypicalValueEditor } from "./appExtracted/appPersistenceLibraryExport";
import type { DeviceParameterDefinition } from "./model";

describe("ratio parameter definition editor", () => {
  test("shows percentage text and commits a decimal default value", () => {
    const row: DeviceParameterDefinition & { id: string } = {
      id: "efficiency",
      cnName: "充放电效率",
      enName: "charge_discharge_efficiency",
      valueType: "float",
      typicalValue: "0.9"
    };
    const updateRow = vi.fn();
    const editor = renderTypicalValueEditor(row, updateRow) as ReactElement<{
      value: string;
      onCommit: (value: string) => void;
    }>;

    expect(editor.props.value).toBe("90%");
    editor.props.onCommit("99%");
    expect(updateRow).toHaveBeenCalledWith("efficiency", { typicalValue: "0.99" });
  });

  test("does not commit an invalid percentage", () => {
    const row: DeviceParameterDefinition & { id: string } = {
      id: "soc",
      cnName: "SOC",
      enName: "soc",
      valueType: "float",
      typicalValue: "0.5"
    };
    const updateRow = vi.fn();
    const editor = renderTypicalValueEditor(row, updateRow) as ReactElement<{
      onCommit: (value: string) => void;
    }>;

    editor.props.onCommit("not-a-percent");
    expect(updateRow).not.toHaveBeenCalled();
  });
});
