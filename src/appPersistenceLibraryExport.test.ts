import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  filterGraphTemplatesByType,
  graphTemplateTypeList,
  groupGraphTemplatesByType,
  normalizeCustomDeviceTemplates
} from "./appExtracted/appPersistenceLibraryExport";
import { svgSourceFromDataUrl } from "./stateIconDrawing";

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

  test("merges terminal anchors into the state icon editor base layer", () => {
    const appViewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const appCoreSource = readFileSync(new URL("./appExtracted/appCoreCanvasUtilities.tsx", import.meta.url), "utf8");
    const deviceDefinitionSource = readFileSync(new URL("./appExtracted/appDeviceDefinitionFactories.tsx", import.meta.url), "utf8");

    expect(appCoreSource).toContain('export type CustomDeviceDialogView = "icon" | "parameters" | "measurements"');
    expect(appViewSource).not.toContain("setCustomDeviceDialogView(\"terminals\")");
    expect(appViewSource).not.toContain(">端子定义<");
    expect(appViewSource).toContain('visibleCustomDeviceDialogView === "icon" ?');
    expect(appViewSource).toContain("customDeviceDraft.terminalCount > 0 && <div className=\"custom-terminal-grid\"");
    expect(deviceDefinitionSource).toContain("const stateIconTerminalFrame = {");
    expect(deviceDefinitionSource).toContain("x: STATE_ICON_DRAWING_FRAME_WIDTH / 8");
    expect(deviceDefinitionSource).toContain("width: STATE_ICON_DRAWING_FRAME_WIDTH * 3 / 4");
    expect(deviceDefinitionSource).toContain("const renderStateIconOuterFrameLayer = () =>");
    expect(deviceDefinitionSource).toContain("const renderStateIconTerminalBaseLayer = () =>");
    expect(deviceDefinitionSource).toContain("className=\"state-icon-drawing-icon-frame state-icon-drawing-inner-frame\"");
    expect(deviceDefinitionSource).toContain("className=\"state-icon-drawing-icon-frame state-icon-drawing-outer-frame\"");
    expect(deviceDefinitionSource).toContain("className=\"custom-device-terminal-connector state-icon-terminal-connector\"");
    expect(deviceDefinitionSource).toContain("className={`custom-device-terminal-anchor state-icon-terminal-anchor");
    expect(deviceDefinitionSource.indexOf("{renderStateIconOuterFrameLayer()}")).toBeLessThan(
      deviceDefinitionSource.indexOf("{renderStateIconTerminalBaseLayer()}")
    );
    expect(deviceDefinitionSource.indexOf("{renderStateIconTerminalBaseLayer()}")).toBeLessThan(
      deviceDefinitionSource.indexOf("directPreviewElements ? previewElements.map")
    );
    expect(deviceDefinitionSource).toContain("definitionVisualDraft.terminalCount > 0 && <div className=\"custom-terminal-grid device-definition-terminal-grid\"");
  });

  test("normalizes saved custom device templates with persisted terminal connector lines", () => {
    const [template] = normalizeCustomDeviceTemplates([
      {
        kind: "custom-existing",
        label: "Existing",
        attributeLibrary: "交流设备",
        size: { width: 104, height: 64 },
        params: {
          component_type: "Existing",
          backgroundImage: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160"/></svg>'
          ),
          backgroundImageAssetId: ""
        },
        terminalType: "ac",
        terminalCount: 2,
        terminalTypes: ["ac", "dc"],
        terminalAnchors: [
          { x: -0.5, y: 0 },
          { x: 0.5, y: 0 }
        ]
      }
    ]);
    const source = svgSourceFromDataUrl(template.params.backgroundImage);

    expect(source).toContain('data-custom-device-persisted-terminal-connectors="true"');
    expect(source).toContain('x1="0" y1="80" x2="30" y2="80"');
    expect(source).toContain('x1="240" y1="80" x2="210" y2="80"');
    expect(source).not.toContain("<circle");
  });
});
