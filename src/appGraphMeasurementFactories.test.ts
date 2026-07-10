import { readFileSync } from "node:fs";
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";

import {
  createBeginMeasurementDrag,
  createBuildMeasurementGroupMarkup,
  createRenderMultiNodeDragOverlay,
  createUpdateMeasurementDrag,
  measurementProfileItemsComplianceMessage,
  measurementTypeComplianceMessage
} from "./appExtracted/appGraphMeasurementFactories";
import { createRenderDeviceDefinitionMeasurementPanel } from "./appExtracted/appProjectCanvasFactories";
import {
  createBuildSingleNodeDragPreviewNodeMarkup,
  createSetImperativeSingleNodeDragOrigin
} from "./appExtracted/appSelectionDragFactories";
import { createRenderMeasurementGroup } from "./appExtracted/appToolbarHookFactories";
import { exportMeasurementItemMetadataAttributes } from "./svgExportUtils";

describe("measurement canvas interactions", () => {
  test("validates measurement type and profile compliance", () => {
    const typeMessage = measurementTypeComplianceMessage([
      {
        id: "activePower",
        key: "activePower",
        name: "有功功率",
        shortLabel: "P",
        defaultUnit: "kW",
        valueType: "number",
        defaultDecimals: 2,
        defaultColor: "#334155",
        defaultFontFamily: "Arial",
        defaultFontSize: 14,
        defaultFontWeight: "500",
        defaultVisible: true
      },
      {
        id: "activePower2",
        key: "activePower2",
        name: "有功功率",
        shortLabel: "",
        defaultUnit: "kW",
        valueType: "number",
        defaultDecimals: 9,
        defaultColor: "#334155",
        defaultFontFamily: "Arial",
        defaultFontSize: 4,
        defaultFontWeight: "500",
        defaultVisible: true
      }
    ] as any);

    expect(typeMessage).toContain("量测类型第 2 行：标签不能为空。");
    expect(typeMessage).toContain("量测类型第 2 行：默认小数位必须是0到8之间的整数。");
    expect(typeMessage).toContain("量测类型第 2 行：默认字号必须是6到96之间的数字。");
    expect(typeMessage).toContain("量测类型名称不能重复：有功功率");

    const profileMessage = measurementProfileItemsComplianceMessage([
      { name: "有功功率", measurementTypeId: "activePower", position: "device", associatedField: "missingField" },
      { name: "有功功率", measurementTypeId: "activePower", position: "device", associatedField: "missingField" },
      { name: "未知", measurementTypeId: "missingType", position: "device", associatedField: "activePower" }
    ] as any, {
      measurementTypes: [{ id: "activePower", name: "有功功率" }] as any,
      parameterDefinitions: [{ cnName: "有功功率", enName: "activePower" }] as any,
      targetLabel: "测试元件"
    });

    expect(profileMessage).toContain("测试元件量测第 1 行：关联字段 missingField 不在元件属性名称列表中。");
    expect(profileMessage).toContain("测试元件量测第 2 行：与第 1 行量测重复。");
    expect(profileMessage).toContain("测试元件量测第 3 行：量测类型 missingType 不存在。");
  });

  test("renders associated field as a parameter-name dropdown in device definition measurements", () => {
    const updateMeasurementProfileItem = vi.fn();
    const panel = createRenderDeviceDefinitionMeasurementPanel({
      BufferedTextInput: (props: any) => createElement("input", props),
      addMeasurementProfileItem: vi.fn(),
      deleteMeasurementProfileItem: vi.fn(),
      editableMeasurementProfileByKind: new Map([
        [
          "CustomDevice",
          {
            items: [
              { name: "有功功率", measurementTypeId: "activePower", position: "device", associatedField: "activePower" },
              { name: "旧字段", measurementTypeId: "activePower", position: "device", associatedField: "legacyField" }
            ]
          }
        ]
      ]),
      editableMeasurementTypeById: new Map([["activePower", { id: "activePower", name: "有功功率", defaultVisible: true }]]),
      isBrowseMode: false,
      measurementConfig: {
        measurementTypes: [{ id: "activePower", name: "有功功率", defaultVisible: true }],
        deviceProfiles: []
      },
      measurementConfigDraft: null,
      measurementConfigSaveStatus: "idle",
      moveMeasurementProfileItem: vi.fn(),
      normalizeComponentLibraryName: (value: string) => value,
      updateMeasurementProfileItem
    } as any)({
      deviceKind: "CustomDevice",
      label: "自定义元件",
      terminalCount: 0,
      parameterDefinitions: [
        { cnName: "有功功率", enName: "activePower", valueType: "float", typicalValue: "0" },
        { cnName: "额定功率", enName: "ratedPower", valueType: "float", typicalValue: "0" }
      ]
    });

    const selects: ReactElement[] = [];
    const collectAssociatedSelects = (node: ReactNode) => {
      Children.forEach(node, (child) => {
        if (!isValidElement(child)) {
          return;
        }
        if (child.type === "select" && String((child as ReactElement<any>).props.title ?? "").includes("关联")) {
          selects.push(child as ReactElement);
        }
        collectAssociatedSelects((child as ReactElement<{ children?: ReactNode }>).props.children);
      });
    };
    collectAssociatedSelects(panel);

    expect(selects).toHaveLength(2);
    const elementText = (node: ReactNode): string =>
      Children.toArray(node).map((child) =>
        isValidElement(child)
          ? elementText((child as ReactElement<{ children?: ReactNode }>).props.children)
          : String(child)
      ).join("");
    const firstOptionText = Children.toArray((selects[0] as ReactElement<{ children: ReactNode }>).props.children)
      .filter(isValidElement)
      .map((option) => elementText((option as ReactElement<{ children: ReactNode }>).props.children));
    expect(firstOptionText).toContain("有功功率 (activePower)");
    expect(firstOptionText).toContain("额定功率 (ratedPower)");
    const secondOptionText = Children.toArray((selects[1] as ReactElement<{ children: ReactNode }>).props.children)
      .filter(isValidElement)
      .map((option) => elementText((option as ReactElement<{ children: ReactNode }>).props.children));
    expect(secondOptionText).toContain("legacyField（未在属性中）");

    (selects[0] as ReactElement<{ onChange: (event: any) => void }>).props.onChange({ target: { value: "ratedPower" } });

    expect(updateMeasurementProfileItem).toHaveBeenCalledWith("CustomDevice", 0, { associatedField: "ratedPower" });
  });

  test("selects the owning device when pressing a measurement group", () => {
    const selectCanvasGraphics = vi.fn();
    const setMeasurementDrag = vi.fn();
    const setPointerCapture = vi.fn();
    const beginMeasurementDrag = createBeginMeasurementDrag({
      isBrowseMode: false,
      screenToSvgPoint: vi.fn(() => ({ x: 120, y: 80 })),
      selectCanvasGraphics,
      setMeasurementDrag,
      svgRef: { current: {} }
    });

    beginMeasurementDrag(
      {
        button: 0,
        clientX: 12,
        clientY: 34,
        currentTarget: { setPointerCapture },
        pointerId: 7,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any,
      {
        id: "measurement-group-1",
        nodeId: "node-42",
        offset: { x: 8, y: -4 }
      } as any
    );

    expect(selectCanvasGraphics).toHaveBeenCalledWith(["node-42"], [], { scope: "direct" });
    expect(setMeasurementDrag).toHaveBeenCalledWith({
      groupId: "measurement-group-1",
      historyCaptured: false,
      pointerId: 7,
      startOffset: { x: 8, y: -4 },
      startPoint: { x: 120, y: 80 }
    });
    expect(setPointerCapture).toHaveBeenCalledWith(7);
  });

  test("moves a routable line measurement group by updating its offset", () => {
    const pushUndoSnapshot = vi.fn();
    const setMeasurementDrag = vi.fn();
    let projectMeasurements: any = {
      version: 1,
      groups: [
        {
          id: "line-measurement",
          nodeId: "line-node",
          anchor: "custom",
          offset: { x: 12, y: -8 },
          visible: true,
          items: []
        }
      ]
    };
    const setProjectMeasurements = vi.fn((updater: any) => {
      projectMeasurements = typeof updater === "function" ? updater(projectMeasurements) : updater;
    });
    const updateMeasurementDrag = createUpdateMeasurementDrag({
      measurementDrag: {
        groupId: "line-measurement",
        historyCaptured: false,
        pointerId: 9,
        startOffset: { x: 12, y: -8 },
        startPoint: { x: 100, y: 100 }
      },
      measurementOffsetScaleForNode: () => ({ x: 2, y: 4 }),
      nodeById: new Map([
        [
          "line-node",
          {
            id: "line-node",
            kind: "ac-routable-line",
            params: {},
            position: { x: 200, y: 160 },
            size: { width: 160, height: 80 }
          }
        ]
      ]),
      projectMeasurements,
      pushUndoSnapshot,
      screenToSvgPoint: vi.fn(() => ({ x: 140, y: 180 })),
      setMeasurementDrag,
      setProjectMeasurements,
      svgRef: { current: {} }
    });

    const moved = updateMeasurementDrag({
      pointerId: 9,
      clientX: 20,
      clientY: 30,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as any);

    expect(moved).toBe(true);
    expect(pushUndoSnapshot).toHaveBeenCalledTimes(1);
    expect(setMeasurementDrag).toHaveBeenCalledWith(expect.objectContaining({ historyCaptured: true }));
    expect(projectMeasurements.groups[0]).toMatchObject({
      anchor: "custom",
      offset: { x: 32, y: 12 }
    });
  });

  test("builds live measurement markup with the current compact item metadata signature", () => {
    const item = {
      id: "m-active",
      measurementTypeId: "activePower",
      sourcePoint: "node-42.activePower",
      role: "value"
    };
    const buildMeasurementGroupMarkup = createBuildMeasurementGroupMarkup({
      escapeXml: (value: string) => value.replaceAll("&", "&amp;"),
      exportMeasurementGroupMetadataAttributes: () => 'mg="measurement-group-1"',
      exportMeasurementItemMetadataAttributes,
      formatSvgNumber: (value: number) => String(value),
      measurementGroupAnchorPoint: () => ({ x: 100, y: 60 }),
      measurementGroupBackgroundColor: () => "#ffffff",
      measurementGroupBorderColor: () => "#64748b",
      measurementGroupBorderDashArray: () => undefined,
      measurementGroupBorderWidth: () => 1,
      measurementGroupLocalOffset: () => ({ x: 0, y: 0 }),
      measurementGroupRenderMetrics: () => ({
        columnWidth: 80,
        columns: 1,
        height: 24,
        lineHeight: 24,
        rows: [
          {
            item,
            display: {
              color: "#334155",
              fontFamily: "Arial",
              fontStyle: "normal",
              fontWeight: "500",
              textDecoration: "none"
            },
            fontSize: 14,
            text: "P -- MW"
          }
        ],
        width: 80
      }),
      selectedMeasurementGroupIdSet: new Set<string>()
    } as any);

    expect(() => buildMeasurementGroupMarkup(
      {
        id: "node-42",
        kind: "ac-load",
        name: "负荷-1",
        params: {},
        position: { x: 100, y: 60 },
        size: { width: 80, height: 80 },
        terminals: []
      } as any,
      { id: "measurement-group-1", nodeId: "node-42", items: [item] } as any
    )).not.toThrow();
  });

  test("builds single node drag measurement markup from the original node position", () => {
    const currentNode = {
      id: "line-node",
      name: "交流线路（自适应）",
      kind: "ac-routable-line",
      params: {},
      position: { x: 360, y: 240 },
      size: { width: 180, height: 60 },
      terminals: []
    };
    const buildMeasurementGroupsMarkup = vi.fn(() => "<g class=\"measurement-group\"></g>");
    const buildSingleNodeDragPreviewNodeMarkup = createBuildSingleNodeDragPreviewNodeMarkup({
      DeviceGlyph: () => null,
      buildMeasurementGroupsMarkup,
      buildNodePreviewImageMarkup: () => "",
      buildSvgNodeLabelMarkup: () => "",
      buildSvgTerminalMarkup: () => "",
      colorDisplayMode: "default",
      colorPalette: {},
      escapeXml: (value: string) => value,
      formatSvgNumber: (value: number) => String(value),
      isBusNode: () => false,
      isMultiNodeMoveState: () => false,
      isStaticNode: () => false,
      nodeById: new Map([["line-node", currentNode]]),
      nodeGeometryTransform: () => "",
      renderSvgElementMarkup: () => "",
      resolveNodeStateVisual: () => null,
      visibleNodeIdSet: new Set(["line-node"])
    } as any);

    const markup = buildSingleNodeDragPreviewNodeMarkup({
      nodeIds: ["line-node"],
      originalPositions: { "line-node": { x: 120, y: 80 } }
    } as any);

    expect(markup).toContain('class="single-node-drag-preview-node');
    expect(buildMeasurementGroupsMarkup).toHaveBeenCalledWith(
      expect.objectContaining({ position: { x: 120, y: 80 } })
    );
  });

  test("builds multi node drag measurement markup from each original node position", () => {
    const currentNode = {
      id: "line-node",
      name: "交流线路（自适应）",
      kind: "ac-routable-line",
      params: {},
      position: { x: 360, y: 240 },
      size: { width: 180, height: 60 },
      terminals: []
    };
    const buildMeasurementGroupsMarkup = vi.fn(() => "<g class=\"measurement-group\"></g>");
    const renderMultiNodeDragOverlay = createRenderMultiNodeDragOverlay({
      MemoDeviceGlyph: () => null,
      buildMeasurementGroupsMarkup,
      circle: "circle",
      clipPath: "clipPath",
      colorDisplayMode: "default",
      colorPalette: {},
      connectionLineStyle: () => undefined,
      dragging: {
        nodeIds: ["line-node"],
        originalPositions: { "line-node": { x: 120, y: 80 } },
        overlayPreview: {
          bounds: null,
          edgeRoutes: [],
          ghostRoutes: [],
          dynamicEdgePreviewEdges: [],
          movedNodeIds: new Set(["line-node"]),
          draggedEdgeIds: new Set(),
          movedBusNodeIds: new Set()
        }
      },
      draggingRef: { current: null },
      g: "g",
      getNodeScaleX: () => 1,
      getNodeScaleY: () => 1,
      getTerminalDisplayColor: () => "#111827",
      image: "image",
      isBusNode: () => false,
      isMultiNodeMoveState: () => true,
      isRoutableLineDeviceKind: () => true,
      isStaticNode: () => false,
      line: "line",
      multiNodeDragOverlayDeltaRef: { current: { x: 0, y: 0 } },
      multiNodeDragOverlayRef: { current: null },
      nodeById: new Map([["line-node", currentNode]]),
      nodeForegroundImage: () => "",
      nodeGeometryTransform: () => "",
      nodeImage: () => "",
      nodeImageContentTransform: () => "",
      path: "path",
      rect: "rect",
      resolveNodeStateVisual: () => null,
      svgStrokeDashArray: () => "",
      terminalRenderLocalPoint: () => ({ x: 0, y: 0 }),
      terminalStubSegment: () => ({ from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }),
      terminalStubStrokeWidth: () => 1,
      title: "title",
      updateMultiNodeDragOverlayTransform: vi.fn(),
      visibleNodeIdSet: new Set(["line-node"])
    } as any);

    const overlay = renderMultiNodeDragOverlay();

    expect(overlay).not.toBeNull();
    expect(buildMeasurementGroupsMarkup).toHaveBeenCalledWith(
      expect.objectContaining({ position: { x: 120, y: 80 } })
    );
  });

  test("renders dragged origin measurement groups as non-interactive ghosts", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const originRule = styles.match(/\.measurement-group\.drag-origin\s*\{[\s\S]*?\}/u)?.[0] ?? "";
    const originBoxRule = styles.match(/\.measurement-group\.drag-origin\s+\.measurement-group-bg\s*\{[\s\S]*?\}/u)?.[0] ?? "";
    const originTextRule = styles.match(/\.measurement-group\.drag-origin\s+\.measurement-item\s*\{[\s\S]*?\}/u)?.[0] ?? "";

    expect(originRule).toContain("pointer-events: none");
    expect(originRule).toContain("mix-blend-mode: multiply");
    expect(originBoxRule).toContain("filter: none");
    expect(originBoxRule).toContain("stroke-dasharray");
    expect(originTextRule).toContain("opacity");
  });

  const createMeasurementGroupRenderer = (overrides: Record<string, any> = {}) =>
    createRenderMeasurementGroup({
      beginMeasurementDrag: vi.fn(),
      dragging: { historyCaptured: true },
      draggingNodeIdSet: new Set(["node-42"]),
      formatSvgNumber: (value: number) => String(value),
      measurementGroupBackgroundColor: () => "#ffffff",
      measurementGroupBorderColor: () => "#64748b",
      measurementGroupBorderDashArray: () => undefined,
      measurementGroupBorderWidth: () => 1,
      measurementGroupCanvasPosition: () => ({ x: 100, y: 60 }),
      measurementGroupRenderMetrics: () => ({
        columnWidth: 64,
        columns: 1,
        height: 32,
        lineHeight: 16,
        rows: [],
        width: 80
      }),
      selectedMeasurementGroup: null,
      visibleNodeById: new Map([
        [
          "node-42",
          {
            id: "node-42",
            kind: "ac-load",
            name: "负荷-1",
            params: {}
          }
        ]
      ]),
      ...overrides
    });
  const draggedMeasurementGroup = {
    id: "measurement-group-1",
    nodeId: "node-42",
    visible: true
  } as any;

  test("hides the normal measurement layer for a single dragged node", () => {
    const renderMeasurementGroup = createMeasurementGroupRenderer({ singleNodeDragging: true });

    expect(renderMeasurementGroup(draggedMeasurementGroup)).toBeNull();
  });

  test("hides the normal measurement layer for every dragged node", () => {
    const renderMeasurementGroup = createMeasurementGroupRenderer({ singleNodeDragging: false });

    expect(renderMeasurementGroup(draggedMeasurementGroup)).toBeNull();
  });

  test("keeps the normal measurement layer before a drag ghost is available", () => {
    const renderMeasurementGroup = createMeasurementGroupRenderer({
      dragging: { historyCaptured: false },
      singleNodeDragging: false
    });

    expect(renderMeasurementGroup(draggedMeasurementGroup)).not.toBeNull();
  });

  test("renders measurement markup inside the single node origin ghost", () => {
    const canvasSource = readFileSync(new URL("./appExtracted/appCanvasArea.tsx", import.meta.url), "utf8");

    expect(canvasSource).toContain("drag-origin-measurement-layer");
    expect(canvasSource).toContain('buildMeasurementGroupsMarkup(ghostNode, { absolute: true, className: "drag-origin" })');
  });

  test("marks measurement groups through the imperative single-node drag origin path", () => {
    const nodeClassList = { add: vi.fn(), remove: vi.fn() };
    const measurementClassList = { add: vi.fn(), remove: vi.fn() };
    const svg = {
      classList: { toggle: vi.fn() },
      querySelectorAll: vi.fn((selector: string) =>
        selector.includes('data-export-device-id="node-42"') ? [{ classList: measurementClassList }] : []
      )
    };
    const setImperativeSingleNodeDragOrigin = createSetImperativeSingleNodeDragOrigin({
      canvasNodeElementRefs: { current: new Map([["node-42", { classList: nodeClassList }]]) },
      clearImperativeSingleNodeDragOriginLines: vi.fn(),
      cssSelectorEscape: (value: string) => value,
      imperativeSingleNodeDragOriginNodeIdRef: { current: null },
      svgRef: { current: svg }
    });

    setImperativeSingleNodeDragOrigin("node-42");

    expect(nodeClassList.add).toHaveBeenCalledWith("single-drag-origin");
    expect(measurementClassList.add).toHaveBeenCalledWith("drag-origin");
    expect(svg.querySelectorAll).toHaveBeenCalledWith('.measurement-group[data-export-device-id="node-42"]');
  });

  test("clears measurement group origin ghosts when the imperative single-node drag origin is cleared", () => {
    const nodeClassList = { add: vi.fn(), remove: vi.fn() };
    const measurementClassList = { add: vi.fn(), remove: vi.fn() };
    const clearImperativeSingleNodeDragOriginLines = vi.fn();
    const svg = {
      classList: { toggle: vi.fn() },
      querySelectorAll: vi.fn((selector: string) =>
        selector.includes('data-export-device-id="node-42"') ? [{ classList: measurementClassList }] : []
      )
    };
    const setImperativeSingleNodeDragOrigin = createSetImperativeSingleNodeDragOrigin({
      canvasNodeElementRefs: { current: new Map([["node-42", { classList: nodeClassList }]]) },
      clearImperativeSingleNodeDragOriginLines,
      cssSelectorEscape: (value: string) => value,
      imperativeSingleNodeDragOriginNodeIdRef: { current: "node-42" },
      svgRef: { current: svg }
    });

    setImperativeSingleNodeDragOrigin(null);

    expect(nodeClassList.remove).toHaveBeenCalledWith("single-drag-origin");
    expect(measurementClassList.remove).toHaveBeenCalledWith("drag-origin");
    expect(clearImperativeSingleNodeDragOriginLines).toHaveBeenCalled();
  });
});
