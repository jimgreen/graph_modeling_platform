import { readFileSync } from "node:fs";
import { Children, Fragment, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";

import {
  createBeginMeasurementDrag,
  createBuildMeasurementGroupMarkup,
  createMeasurementGroupRenderMetrics,
  createRenderSelectedNodeMeasurementTable,
  createRenderMultiNodeDragOverlay,
  createSaveMeasurementConfigDialog,
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
import { createDefinitionDraftRows } from "./customDeviceUtils";
import * as measurementDefinitions from "./measurements";
import { DEVICE_LIBRARY, getTemplateParameterDefinitions } from "./model";
import { exportMeasurementItemMetadataAttributes } from "./svgExportUtils";

describe("measurement canvas interactions", () => {
  test("migrates current measurement instances before saving a new measurement definition", async () => {
    const previousConfig = measurementDefinitions.normalizeMeasurementConfig(measurementDefinitions.DEFAULT_MEASUREMENT_CONFIG);
    const nextConfig = measurementDefinitions.normalizeMeasurementConfig({
      ...previousConfig,
      groupDefaults: { ...previousConfig.groupDefaults, backgroundColor: "#f8fafc" }
    });
    const projectMeasurements = { version: 1 as const, groups: [] };
    const migratedMeasurements = { version: 1 as const, groups: [{ id: "migrated" }] } as any;
    const reconcileProjectMeasurementsWithConfig = vi.fn(() => migratedMeasurements);
    const pushUndoSnapshot = vi.fn();
    const setProjectMeasurements = vi.fn();
    const saveMeasurementConfigDialog = createSaveMeasurementConfigDialog({
      backendMeasurementConfigLoadedRef: { current: false },
      flushMeasurementConfigDialogDraftInputs: vi.fn(),
      lastPersistedMeasurementConfigPayloadRef: { current: "" },
      measurementConfig: previousConfig,
      measurementConfigDraft: nextConfig,
      measurementConfigDraftRef: { current: nextConfig },
      nodes: [{ id: "node-1" }],
      normalizeMeasurementConfig: measurementDefinitions.normalizeMeasurementConfig,
      projectMeasurements,
      pushUndoSnapshot,
      reconcileProjectMeasurementsWithConfig,
      saveBackendMeasurementConfigPayload: vi.fn(async () => undefined),
      serializeMeasurementConfigForStorage: JSON.stringify,
      setMeasurementConfig: vi.fn(),
      setMeasurementConfigDraft: vi.fn(),
      setMeasurementConfigSaveStatus: vi.fn(),
      setProjectMeasurements,
      writeMeasurementConfig: vi.fn(),
      writeOperationLog: vi.fn()
    } as any);

    await saveMeasurementConfigDialog();

    expect(reconcileProjectMeasurementsWithConfig).toHaveBeenCalledWith(
      projectMeasurements,
      [{ id: "node-1" }],
      nextConfig,
      previousConfig
    );
    expect(pushUndoSnapshot).toHaveBeenCalledTimes(1);
    expect(setProjectMeasurements).toHaveBeenCalledWith(migratedMeasurements);
  });

  test("does not create a measurement undo snapshot when definition migration is unchanged", async () => {
    const config = measurementDefinitions.normalizeMeasurementConfig(measurementDefinitions.DEFAULT_MEASUREMENT_CONFIG);
    const projectMeasurements = { version: 1 as const, groups: [] };
    const pushUndoSnapshot = vi.fn();
    const setProjectMeasurements = vi.fn();
    const saveMeasurementConfigDialog = createSaveMeasurementConfigDialog({
      backendMeasurementConfigLoadedRef: { current: false },
      lastPersistedMeasurementConfigPayloadRef: { current: "" },
      measurementConfig: config,
      measurementConfigDraft: config,
      measurementConfigDraftRef: { current: config },
      nodes: [],
      normalizeMeasurementConfig: measurementDefinitions.normalizeMeasurementConfig,
      projectMeasurements,
      pushUndoSnapshot,
      reconcileProjectMeasurementsWithConfig: vi.fn(() => projectMeasurements),
      saveBackendMeasurementConfigPayload: vi.fn(async () => undefined),
      serializeMeasurementConfigForStorage: JSON.stringify,
      setMeasurementConfig: vi.fn(),
      setMeasurementConfigDraft: vi.fn(),
      setMeasurementConfigSaveStatus: vi.fn(),
      setProjectMeasurements,
      writeMeasurementConfig: vi.fn(),
      writeOperationLog: vi.fn()
    } as any);

    await saveMeasurementConfigDialog();

    expect(pushUndoSnapshot).not.toHaveBeenCalled();
    expect(setProjectMeasurements).not.toHaveBeenCalled();
  });

  test("places automatically added device measurements below the device label by default", () => {
    const config = measurementDefinitions.normalizeMeasurementConfig(measurementDefinitions.DEFAULT_MEASUREMENT_CONFIG);
    const node = {
      id: "ac-source-1",
      kind: "ac-source",
      name: "交流电源-1",
      position: { x: 0, y: 0 },
      size: { width: 104, height: 72 },
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      terminals: [],
      params: {
        _labelY: "58",
        _labelFontSize: "14"
      }
    };

    const [group] = measurementDefinitions.createDefaultMeasurementGroupsForNode(node as any, config);

    expect(group).toBeTruthy();
    expect(group.offset.y).toBeGreaterThanOrEqual(92);
  });

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

  test("validates associated fields against the selected measurement position", () => {
    const profileMessage = measurementProfileItemsComplianceMessage([
      { name: "首端电阻", measurementTypeId: "activePower", position: "t1", associatedField: "r" },
      { name: "本体电阻", measurementTypeId: "activePower", position: "device", associatedField: "r" }
    ] as any, {
      measurementTypes: [{ id: "activePower", name: "有功功率" }] as any,
      parameterDefinitions: [{ cnName: "父设备字段", enName: "parentOnly" }] as any,
      positionDefinitions: [
        {
          value: "device",
          label: "设备本体",
          parameterDefinitions: [{ cnName: "父设备字段", enName: "parentOnly" }]
        },
        {
          value: "t1",
          label: "端1（双绕组主变首端）",
          parameterDefinitions: [{ cnName: "电阻", enName: "r" }]
        }
      ],
      targetLabel: "三绕组主变"
    } as any);

    expect(profileMessage).not.toContain("三绕组主变量测第 1 行：关联字段 r 不在元件属性名称列表中。");
    expect(profileMessage).toContain("三绕组主变量测第 2 行：关联字段 r 不在元件属性名称列表中。");
  });

  test("offers only the device body position for non-container devices", () => {
    const buildMeasurementProfilePositionDefinitions = (measurementDefinitions as any).buildMeasurementProfilePositionDefinitions;
    expect(buildMeasurementProfilePositionDefinitions).toBeTypeOf("function");
    const transformer = DEVICE_LIBRARY.find((template) => template.kind === "ac-transformer")!;

    const positions = buildMeasurementProfilePositionDefinitions({
      source: transformer,
      parameterDefinitions: getTemplateParameterDefinitions(transformer),
      libraryTemplates: DEVICE_LIBRARY
    });

    expect(positions.map((position: any) => ({ value: position.value, label: position.label }))).toEqual([
      { value: "device", label: "设备本体" }
    ]);
  });

  test("treats the built-in three-winding transformer as an independent measurement device", () => {
    const buildMeasurementProfilePositionDefinitions = (measurementDefinitions as any).buildMeasurementProfilePositionDefinitions;
    expect(buildMeasurementProfilePositionDefinitions).toBeTypeOf("function");
    const transformer = DEVICE_LIBRARY.find((template) => template.kind === "ac-three-winding-transformer")!;

    const positions = buildMeasurementProfilePositionDefinitions({
      source: transformer,
      parameterDefinitions: getTemplateParameterDefinitions(transformer),
      libraryTemplates: DEVICE_LIBRARY
    });

    expect(positions.map((position: any) => ({ value: position.value, label: position.label }))).toEqual([
      { value: "device", label: "设备本体" }
    ]);
    expect(positions[0].parameterDefinitions.map((definition: any) => definition.enName)).toContain("highResistancePu");
    expect(positions[0].parameterDefinitions.map((definition: any) => definition.enName)).not.toContain("idx_xf_t1");
  });

  test("offers base fields before derived fields for derived device measurements", () => {
    const buildMeasurementProfilePositionDefinitions = (measurementDefinitions as any).buildMeasurementProfilePositionDefinitions;
    expect(buildMeasurementProfilePositionDefinitions).toBeTypeOf("function");
    const nuclear = DEVICE_LIBRARY.find((template) => template.kind === "ac-nuclear-source")!;
    const derivedRows = createDefinitionDraftRows(nuclear);

    const positions = buildMeasurementProfilePositionDefinitions({
      source: nuclear,
      parameterDefinitions: derivedRows,
      libraryTemplates: DEVICE_LIBRARY
    });

    const fieldNames = positions[0].parameterDefinitions.map((definition: any) => definition.enName);
    expect(fieldNames).toContain("p_set");
    expect(fieldNames).toContain("run_stat");
    expect(fieldNames).toContain("nuclearUnitModel");
    expect(fieldNames.indexOf("p_set")).toBeLessThan(fieldNames.indexOf("nuclearUnitModel"));
    expect(fieldNames.indexOf("run_stat")).toBeLessThan(fieldNames.indexOf("nuclearUnitModel"));
    expect(fieldNames.filter((name: string) => name === "p_set")).toHaveLength(1);
  });

  test("offers base fields before custom derived draft fields for measurements", () => {
    const buildMeasurementProfilePositionDefinitions = (measurementDefinitions as any).buildMeasurementProfilePositionDefinitions;
    expect(buildMeasurementProfilePositionDefinitions).toBeTypeOf("function");

    const positions = buildMeasurementProfilePositionDefinitions({
      source: {
        kind: "custom-ACGenerator",
        label: "新交流发电机",
        categoryLibrary: "交流设备",
        params: {
          component_type: "ACGenerator",
          derived_from_component_type: "ACGenerator",
          derived_component_type: "NewACGen",
          derived_component_library_label: "新交流发电机2",
          is_derived_component_library: "1"
        },
        terminalType: "ac",
        terminalCount: 1,
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        derivedComponentLibrary: "NewACGen",
        derivedComponentLibraryLabel: "新交流发电机2",
        parameterDefinitions: [
          { cnName: "派生字段A", enName: "a", valueType: "string", typicalValue: "" },
          { cnName: "派生字段B", enName: "bbbb", valueType: "string", typicalValue: "" }
        ]
      },
      parameterDefinitions: [
        { cnName: "派生字段A", enName: "a", valueType: "string", typicalValue: "" },
        { cnName: "派生字段B", enName: "bbbb", valueType: "string", typicalValue: "" }
      ],
      libraryTemplates: DEVICE_LIBRARY
    });

    const fieldNames = positions[0].parameterDefinitions.map((definition: any) => definition.enName);
    expect(fieldNames).toEqual(expect.arrayContaining(["p_set", "run_stat", "a", "bbbb"]));
    expect(fieldNames.indexOf("p_set")).toBeLessThan(fieldNames.indexOf("a"));
    expect(fieldNames.indexOf("run_stat")).toBeLessThan(fieldNames.indexOf("bbbb"));
    expect(fieldNames.filter((name: string) => name === "p_set")).toHaveLength(1);
  });

  test("shows the legacy two-winding transformer profile in the ACTransformer definition", () => {
    const config = measurementDefinitions.normalizeMeasurementConfig(measurementDefinitions.DEFAULT_MEASUREMENT_CONFIG);
    const updateMeasurementProfileItem = vi.fn();
    const transformer = DEVICE_LIBRARY.find((template) => template.kind === "ac-transformer")!;
    const panel = createRenderDeviceDefinitionMeasurementPanel({
      BufferedTextInput: (props: any) => createElement("input", props),
      addMeasurementProfileItem: vi.fn(),
      deleteMeasurementProfileItem: vi.fn(),
      editableMeasurementProfileByKind: new Map(config.deviceProfiles.map((profile) => [profile.deviceKind, profile])),
      editableMeasurementTypeById: new Map(config.measurementTypes.map((type) => [type.id, type])),
      isBrowseMode: false,
      measurementConfig: config,
      measurementConfigDraft: null,
      measurementConfigSaveStatus: "idle",
      moveMeasurementProfileItem: vi.fn(),
      normalizeComponentLibraryName: (value: string) => value,
      updateMeasurementProfileItem
    } as any)({
      deviceKind: "ACTransformer",
      label: transformer.label,
      terminalCount: transformer.terminalCount,
      parameterDefinitions: getTemplateParameterDefinitions(transformer)
    });

    const elementText = (node: ReactNode): string =>
      Children.toArray(node).map((child) =>
        isValidElement(child)
          ? elementText((child as ReactElement<{ children?: ReactNode }>).props.children)
          : String(child)
      ).join("");
    const selects: ReactElement<any>[] = [];
    const collectSelects = (node: ReactNode) => {
      Children.forEach(node, (child) => {
        if (!isValidElement(child)) {
          return;
        }
        if (child.type === "select") {
          selects.push(child as ReactElement<any>);
        }
        collectSelects((child as ReactElement<{ children?: ReactNode }>).props.children);
      });
    };
    collectSelects(panel);

    expect(elementText(panel)).toContain("有功功率");
    expect(elementText(panel)).not.toContain("当前元件库还没有默认量测模板");
    const measurementTypeSelect = selects.find((selectElement) => {
      const values = Children.toArray(selectElement.props.children)
        .filter(isValidElement)
        .map((option) => String((option as ReactElement<any>).props.value ?? ""));
      return values.includes("activePower") && values.includes("reactivePower");
    });
    expect(measurementTypeSelect).toBeDefined();
    measurementTypeSelect!.props.onChange({ target: { value: "reactivePower" } });
    expect(updateMeasurementProfileItem).toHaveBeenCalledWith("ac-transformer", 0, {
      measurementTypeId: "reactivePower",
      name: "无功功率"
    });
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

  test("switches associated fields with the selected container terminal", () => {
    const updateMeasurementProfileItem = vi.fn();
    const parentDefinitions = [
      { cnName: "容器字段", enName: "parentOnly", valueType: "float", typicalValue: "0" }
    ];
    const terminalDefinitions = [
      { cnName: "电阻", enName: "r", valueType: "float", typicalValue: "0" },
      { cnName: "电抗", enName: "x", valueType: "float", typicalValue: "0" }
    ];
    const panel = createRenderDeviceDefinitionMeasurementPanel({
      BufferedTextInput: (props: any) => createElement("input", props),
      addMeasurementProfileItem: vi.fn(),
      deleteMeasurementProfileItem: vi.fn(),
      editableMeasurementProfileByKind: new Map([
        [
          "ACTransfomer3",
          {
            items: [
              { name: "本体有功", measurementTypeId: "activePower", position: "device", associatedField: "parentOnly" },
              { name: "首端有功", measurementTypeId: "activePower", position: "t1", associatedField: "r" }
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
      deviceKind: "ACTransfomer3",
      label: "三绕组主变",
      terminalCount: 3,
      parameterDefinitions: parentDefinitions,
      positionDefinitions: [
        { value: "device", label: "设备本体", parameterDefinitions: parentDefinitions },
        { value: "t1", label: "端1（双绕组主变首端）", parameterDefinitions: terminalDefinitions },
        { value: "t2", label: "端2（双绕组主变首端）", parameterDefinitions: terminalDefinitions },
        { value: "t3", label: "端3（双绕组主变首端）", parameterDefinitions: terminalDefinitions }
      ]
    });

    const elementText = (node: ReactNode): string =>
      Children.toArray(node).map((child) =>
        isValidElement(child)
          ? elementText((child as ReactElement<{ children?: ReactNode }>).props.children)
          : String(child)
      ).join("");
    const selects: ReactElement<any>[] = [];
    const collectSelects = (node: ReactNode) => {
      Children.forEach(node, (child) => {
        if (!isValidElement(child)) {
          return;
        }
        if (child.type === "select") {
          selects.push(child as ReactElement<any>);
        }
        collectSelects((child as ReactElement<{ children?: ReactNode }>).props.children);
      });
    };
    collectSelects(panel);
    const positionSelects = selects.filter((selectElement) => {
      const values = Children.toArray(selectElement.props.children)
        .filter(isValidElement)
        .map((option) => String((option as ReactElement<any>).props.value ?? ""));
      return ["device", "t1", "t2", "t3"].every((value) => values.includes(value));
    });

    expect(positionSelects).toHaveLength(2);
    const positionOptions = Children.toArray(positionSelects[0].props.children)
      .filter(isValidElement)
      .map((option) => ({
        value: String((option as ReactElement<any>).props.value ?? ""),
        label: elementText((option as ReactElement<any>).props.children)
      }));
    expect(positionOptions).toEqual([
      { value: "device", label: "设备本体" },
      { value: "t1", label: "端1（双绕组主变首端）" },
      { value: "t2", label: "端2（双绕组主变首端）" },
      { value: "t3", label: "端3（双绕组主变首端）" }
    ]);
    const associatedFieldSelects = selects.filter((selectElement) => String(selectElement.props.title ?? "").includes("关联"));
    expect(associatedFieldSelects).toHaveLength(2);
    const terminalFieldValues = Children.toArray(associatedFieldSelects[1].props.children)
      .filter(isValidElement)
      .map((option) => String((option as ReactElement<any>).props.value ?? ""));
    expect(terminalFieldValues).toContain("r");
    expect(terminalFieldValues).not.toContain("parentOnly");

    positionSelects[0].props.onChange({ target: { value: "t1" } });

    expect(updateMeasurementProfileItem).toHaveBeenCalledWith("ACTransfomer3", 0, {
      position: "t1",
      associatedField: undefined
    });
  });

  test("keeps only the measurement-group add action in the selected-node measurement panel", () => {
    const renderSelectedNodeMeasurementTable = createRenderSelectedNodeMeasurementTable({
      BufferedTextInput: (props: any) => createElement("input", props),
      DeferredColorInput: (props: any) => createElement("input", { ...props, type: "color" }),
      Fragment,
      addDefaultMeasurementsToNode: vi.fn(),
      addMeasurementItemToGroup: vi.fn(),
      addMeasurementItemToNode: vi.fn(),
      button: "button",
      div: "div",
      isBrowseMode: false,
      measurementConfig: { measurementTypes: [] },
      measurementGroupBackgroundColor: () => "transparent",
      measurementTypeById: new Map(),
      measurementTypeOptionsForMeasurementGroup: () => [],
      option: "option",
      removeMeasurementItem: vi.fn(),
      removeMeasurementsFromNode: vi.fn(),
      select: "select",
      selectedMeasurementGroups: [
        {
          id: "measurement-group-1",
          nodeId: "node-1",
          visible: true,
          layout: "vertical",
          items: []
        }
      ],
      span: "span",
      table: "table",
      tbody: "tbody",
      td: "td",
      th: "th",
      tr: "tr",
      updateMeasurementItem: vi.fn(),
      updateSelectedMeasurementGroups: vi.fn()
    } as any);

    const panel = renderSelectedNodeMeasurementTable({
      id: "node-1",
      name: "测试设备",
      kind: "custom-device",
      params: {},
      position: { x: 0, y: 0 },
      size: { width: 80, height: 80 },
      terminals: []
    } as any);

    const buttonTexts: string[] = [];
    const collectButtonTexts = (node: ReactNode) => {
      Children.forEach(node, (child) => {
        if (!isValidElement(child)) {
          return;
        }
        if (child.type === "button") {
          buttonTexts.push(Children.toArray((child as ReactElement<{ children?: ReactNode }>).props.children).join(""));
        }
        collectButtonTexts((child as ReactElement<{ children?: ReactNode }>).props.children);
      });
    };
    collectButtonTexts(panel);

    expect(buttonTexts).toContain("添加默认量测");
    expect(buttonTexts).toContain("添加到本组");
    expect(buttonTexts).toContain("删除量测");
    expect(buttonTexts).not.toContain("添加量测项");
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
              label: "P",
              unit: "MW",
              color: "#334155",
              fontFamily: "Arial",
              fontStyle: "normal",
              fontWeight: "500",
              textDecoration: "none"
            },
            fontSize: 14,
            labelText: "P",
            valueText: "--",
            unitText: "MW",
            text: "P -- MW"
          }
        ],
        width: 80
      }),
      selectedMeasurementGroupIdSet: new Set<string>()
    } as any);

    const markup = buildMeasurementGroupMarkup(
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
    );

    expect(markup).toContain('<text class="measurement-item mi" mt="activePower" mr="value"');
    expect(markup).not.toContain(' mid=');
    expect(markup).not.toContain(' mf=');
    expect(markup).toContain('<tspan class="measurement-label ml">P</tspan>');
    expect(markup).toContain('<tspan class="measurement-value mv"');
    expect(markup).toContain('>--</tspan>');
    expect(markup).toContain('<tspan class="measurement-unit mu" dx="');
    expect(markup).toContain('>MW</tspan>');
    expect(markup).not.toContain('id="mv-m-active"');
    expect(markup).not.toContain('<text class="measurement-unit mu"');
    expect(markup).not.toContain('>P -- MW</text>');
  });

  test("splits measurement row metrics into label value and unit fragments", () => {
    const item = {
      id: "current-1",
      measurementTypeId: "current",
      sourcePoint: "node-42.current"
    };
    const measurementGroupRenderMetrics = createMeasurementGroupRenderMetrics({
      formatMeasurementDisplayValue: (_value: unknown, _decimals: number, unit: string) => unit ? `-- ${unit}` : "--",
      measurementConfig: {},
      measurementFontScaleForNode: () => 1,
      resolveMeasurementItemDisplay: () => ({
        label: "I",
        unit: "A",
        decimals: 2,
        color: "#334155",
        fontFamily: "Arial",
        fontSize: 14,
        fontWeight: "500",
        fontStyle: "normal",
        textDecoration: "none",
        visible: true
      })
    } as any);

    const metrics = measurementGroupRenderMetrics(
      { id: "node-42" } as any,
      {
        id: "measurement-group-1",
        nodeId: "node-42",
        visible: true,
        labelVisible: true,
        unitVisible: true,
        layout: "vertical",
        items: [item]
      } as any
    );

    expect(metrics?.rows[0]).toMatchObject({
      labelText: "I",
      valueText: "--",
      unitText: "A",
      text: "I -- A"
    });
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
      openMeasurementEditorForNode: vi.fn(),
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

  test("renders an addressable live measurement value without splitting group interaction", () => {
    const item = {
      id: "current-1",
      measurementTypeId: "current",
      sourcePoint: "node-42.current",
      role: "value"
    };
    const renderMeasurementGroup = createMeasurementGroupRenderer({
      dragging: null,
      draggingNodeIdSet: new Set<string>(),
      measurementGroupRenderMetrics: () => ({
        columnWidth: 96,
        columns: 1,
        height: 24,
        lineHeight: 24,
        rows: [{
          item,
          display: {
            label: "I",
            unit: "A",
            color: "#334155",
            fontFamily: "Arial",
            fontStyle: "normal",
            fontWeight: "500",
            textDecoration: "none"
          },
          fontSize: 14,
          labelText: "I",
          valueText: "--",
          unitText: "A",
          text: "I -- A"
        }],
        width: 96
      })
    });

    const rendered = renderMeasurementGroup(draggedMeasurementGroup);
    const elements: ReactElement<any>[] = [];
    const textNodes: string[] = [];
    const collect = (node: ReactNode) => {
      Children.forEach(node, (child) => {
        if (typeof child === "string") {
          textNodes.push(child);
          return;
        }
        if (!isValidElement(child)) {
          return;
        }
        elements.push(child as ReactElement<any>);
        collect((child as ReactElement<any>).props.children);
      });
    };
    collect(rendered);

    const row = elements.find((element) => String(element.props.className ?? "").split(" ").includes("mi"));
    const value = elements.find((element) => String(element.props.className ?? "").split(" ").includes("mv"));
    const unit = elements.find((element) => String(element.props.className ?? "").split(" ").includes("mu"));
    expect(row?.type).toBe("text");
    expect(row?.props).toMatchObject({ mid: "current-1", mt: "current", mf: "node-42.current" });
    expect(value?.type).toBe("tspan");
    expect(value?.props).toMatchObject({ id: "mv-current-1" });
    expect(unit?.type).toBe("tspan");
    expect(unit?.props.x).toBeUndefined();
    expect(Number(unit?.props.dx)).toBeGreaterThan(0);
    expect(textNodes).toContain("I");
    expect(textNodes).toContain("--");
    expect(textNodes).toContain("A");
    expect(textNodes).not.toContain("I -- A");
  });

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

  test("opens the measurement display editor from a measurement group double click", () => {
    const openMeasurementEditorForNode = vi.fn();
    const renderMeasurementGroup = createMeasurementGroupRenderer({
      dragging: null,
      draggingNodeIdSet: new Set<string>(),
      openMeasurementEditorForNode
    });
    const rendered = renderMeasurementGroup(draggedMeasurementGroup) as ReactElement<any>;
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    };

    rendered.props.onDoubleClick(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(openMeasurementEditorForNode).toHaveBeenCalledWith(expect.objectContaining({ id: "node-42" }));
  });

  test("renders measurement markup inside the single node origin ghost", () => {
    const canvasSource = readFileSync(new URL("./appExtracted/appCanvasArea.tsx", import.meta.url), "utf8");

    expect(canvasSource).toContain("drag-origin-measurement-layer");
    expect(canvasSource).toContain('buildMeasurementGroupsMarkup(ghostNode, { absolute: true, className: "drag-origin" })');
  });

  test("exposes group font color and size controls in both measurement editors", () => {
    const selectedMeasurementSource = readFileSync(
      new URL("./appExtracted/appGraphMeasurementFactories.tsx", import.meta.url),
      "utf8"
    );
    const measurementDialogSource = readFileSync(
      new URL("./appExtracted/appProjectCanvasFactories.tsx", import.meta.url),
      "utf8"
    );

    for (const source of [selectedMeasurementSource, measurementDialogSource]) {
      expect(source).toContain('aria-label="量测组字体颜色"');
      expect(source).toContain('aria-label="量测组字体大小"');
      expect(source).toContain("groupStyleOverride");
    }
  });

  test("allows the measurement display editor dialog to be dragged by its title", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const coreSource = readFileSync(new URL("./appExtracted/appCoreCanvasUtilities.tsx", import.meta.url), "utf8");
    const measurementDialogSource = readFileSync(
      new URL("./appExtracted/appProjectCanvasFactories.tsx", import.meta.url),
      "utf8"
    );
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(coreSource).toContain('"measurementConfig" | "measurementEditor"');
    expect(coreSource).toContain("measurementEditor:");
    expect(appSource).toContain("measurementEditorDialogRef");
    expect(appSource).toContain('kind === "measurementEditor"');
    expect(measurementDialogSource).toContain('deviceLibraryDialogStyle("measurementEditor")');
    expect(measurementDialogSource).toContain('startDeviceLibraryDialogDrag("measurementEditor", event)');
    expect(styles).toContain(".measurement-editor-dialog.floating");
  });

  test("renders draggable column width handles in the measurement display editor table", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const measurementDialogSource = readFileSync(
      new URL("./appExtracted/appProjectCanvasFactories.tsx", import.meta.url),
      "utf8"
    );
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(appSource).toContain("measurementEditorColumnWidths");
    expect(appSource).toContain("startMeasurementEditorTableColumnResize");
    expect(measurementDialogSource).toContain("<colgroup>");
    expect(measurementDialogSource).toContain("measurementEditorColumns.map");
    expect(measurementDialogSource).toContain("measurement-editor-column-resize");
    expect(styles).toContain("cursor: col-resize");
    expect(styles).toContain(".measurement-editor-column-resize");
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
