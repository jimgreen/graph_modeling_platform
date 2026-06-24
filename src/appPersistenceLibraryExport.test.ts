import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  filterGraphTemplatesByType,
  graphTemplateTypeList,
  groupGraphTemplatesByType
} from "./appExtracted/appPersistenceLibraryExport";

const sampleGraphTemplate = (id: string, typeName: string, name: string) => ({
  id,
  typeName,
  name,
  sourceSize: { width: 120, height: 80 },
  clipboard: { nodes: [{}], edges: [], groups: [] },
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:00.000Z"
});

describe("graph template library filtering", () => {
  test("filters template groups by type name or template name", () => {
    const templates = [
      sampleGraphTemplate("source-template", "一次设备", "电源组合"),
      sampleGraphTemplate("load-template", "一次设备", "负荷组合"),
      sampleGraphTemplate("monitor-template", "量测模板", "遥测显示")
    ];
    const typeNames = graphTemplateTypeList(["量测模板"], templates);
    const grouped = groupGraphTemplatesByType(templates as any, typeNames);

    expect(filterGraphTemplatesByType(grouped, "电源")).toEqual({
      一次设备: [templates[0]]
    });
    expect(filterGraphTemplatesByType(grouped, "量测")).toEqual({
      量测模板: [templates[2]]
    });
  });

  test("opens the right-floating template group flyout when the pointer enters the type row", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const sectionMatch = appSource.match(
      /className=\{`library-group-section template-library-type-section[\s\S]*?onMouseLeave=\{\(\) => \{/u
    );

    expect(sectionMatch?.[0]).toContain('templateLibraryDisplayMode === "right"');
    expect(sectionMatch?.[0]).toContain("setHoveredGraphTemplateType(typeName)");
  });

  test("keeps the right-floating template flyout open while the template context menu is hovered", () => {
    const appViewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const templateMenuMatch = appViewSource.match(
      /\{templateMenu && \(\(\) => \{[\s\S]*?\{renderMeasurementConfigDialog\(\)\}/u
    );

    expect(appViewSource).toContain("const keepTemplateContextMenuFlyoutOpen");
    expect(appViewSource).toContain("clearLibraryFlyoutCloseTimer()");
    expect(appViewSource).toContain("setHoveredGraphTemplateType(typeName)");
    expect(templateMenuMatch?.[0]).toContain("onMouseEnter");
    expect(templateMenuMatch?.[0]).toContain("keepTemplateContextMenuFlyoutOpen");
  });

  test("keeps the right-floating template flyout open when opening a template item context menu", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const templateButtonMatch = appSource.match(
      /const renderGraphTemplateButton = \(template: GraphTemplate\) => \([\s\S]*?onDragStart=\{\(event\) => \{/u
    );

    expect(templateButtonMatch?.[0]).toContain("clearLibraryFlyoutCloseTimer()");
    expect(templateButtonMatch?.[0]).toContain("setHoveredGraphTemplateType(template.typeName)");
  });

  test("keeps the custom terminal preview icon scale independent from terminal handles", () => {
    const appViewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const terminalPreviewMatch = appViewSource.match(
      /const customDeviceTerminalPreviewViewBox = \{[\s\S]*?height: customDevicePreviewHeight \+ CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN \* 2\s*\};/u
    );

    expect(appViewSource).toContain("customDeviceTerminalPreviewClipId");
    expect(appViewSource).toContain("renderCustomDevicePreviewContent(customDeviceTerminalPreviewClipId)");
    expect(terminalPreviewMatch?.[0]).toContain("-customDevicePreviewWidth / 2 - CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN");
    expect(terminalPreviewMatch?.[0]).not.toContain("customDeviceTerminalConnectorSegment(anchor)");
  });
});
