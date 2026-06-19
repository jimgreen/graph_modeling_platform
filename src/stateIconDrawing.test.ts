import { describe, expect, test } from "vitest";

import {
  DEFAULT_STATE_NAME,
  DEFAULT_STATE_PAGE_ID,
  DEFAULT_STATE_VALUE,
  appendNonDefaultStateDraftRow,
  createStateDraftRow,
  createStateDraftRowFromDefaultVisual,
  defaultStateDraftRow,
  nextNonDefaultStateIndex,
  nonDefaultStateDraftRows,
  normalizeStatePageId,
  upsertDefaultStateDraftRow
} from "./stateIconDrawing";
import { DEVICE_LIBRARY } from "./model";
import { APP_STATIC_SCOPE } from "./appExtracted/appStaticScope";
import { createCustomDeviceDefaultStateVisualDraft, createSelectCustomComponentTemplate } from "./appExtracted/appDeviceDefinitionFactories";
import { createCustomDeviceDraftFromTemplate, generateCustomDeviceImage, resolveTemplateComponentType } from "./customDeviceUtils";

describe("default device state draft rows", () => {
  test("uses a synthetic default row when no state definitions exist", () => {
    const row = defaultStateDraftRow([], { image: "default.svg" });

    expect(row.id).toBe(DEFAULT_STATE_PAGE_ID);
    expect(row.value).toBe(DEFAULT_STATE_VALUE);
    expect(row.name).toBe(DEFAULT_STATE_NAME);
    expect(row.image).toBe("default.svg");
  });

  test("keeps the first state definition as the editable default state", () => {
    const first = createStateDraftRow({ value: "1", name: "运行", image: "run.svg" });
    const second = createStateDraftRow({ value: "0", name: "停运" });
    const row = defaultStateDraftRow([first, second], { image: "fallback.svg" });

    expect(row.id).toBe(first.id);
    expect(row.value).toBe("1");
    expect(row.name).toBe("运行");
    expect(row.image).toBe("run.svg");
    expect(nonDefaultStateDraftRows([first, second])).toEqual([second]);
    expect(normalizeStatePageId([first, second], first.id)).toBe(DEFAULT_STATE_PAGE_ID);
  });

  test("inherits the default visual when the first state has no explicit icon", () => {
    const first = createStateDraftRow({ value: "0", name: "默认" });
    const row = defaultStateDraftRow([first], {
      image: "default.svg",
      text: "D",
      strokeColor: "#123456"
    });

    expect(row.value).toBe("0");
    expect(row.name).toBe("默认");
    expect(row.image).toBe("default.svg");
    expect(row.text).toBe("D");
    expect(row.strokeColor).toBe("#123456");
  });

  test("upserts the default row before non-default state pages", () => {
    const second = createStateDraftRow({ value: "1", name: "状态1" });
    const withDefault = appendNonDefaultStateDraftRow([], { image: "default.svg" }, second);
    const updated = upsertDefaultStateDraftRow(withDefault, { image: "fallback.svg" }, { value: "2", name: "默认运行" });

    expect(withDefault).toHaveLength(2);
    expect(withDefault[0].value).toBe(DEFAULT_STATE_VALUE);
    expect(withDefault[0].name).toBe(DEFAULT_STATE_NAME);
    expect(withDefault[0].image).toBe("default.svg");
    expect(withDefault[1]).toBe(second);
    expect(updated[0].id).toBe(withDefault[0].id);
    expect(updated[0].value).toBe("2");
    expect(updated[0].name).toBe("默认运行");
    expect(updated[1]).toBe(second);
  });

  test("numbers new states from state 1 and copies the default state visual", () => {
    const defaultRow = createStateDraftRow({
      value: "0",
      name: "状态0",
      image: "default-state.svg",
      text: "默认",
      strokeColor: "#0f172a"
    });
    const firstIndex = nextNonDefaultStateIndex([defaultRow]);
    const firstState = createStateDraftRowFromDefaultVisual(defaultStateDraftRow([defaultRow]), {
      value: String(firstIndex),
      name: `状态${firstIndex}`
    });
    const secondIndex = nextNonDefaultStateIndex([defaultRow, firstState]);

    expect(firstIndex).toBe(1);
    expect(firstState.value).toBe("1");
    expect(firstState.name).toBe("状态1");
    expect(firstState.image).toBe("default-state.svg");
    expect(firstState.text).toBe("默认");
    expect(firstState.strokeColor).toBe("#0f172a");
    expect(secondIndex).toBe(2);
  });

  test("uses the selected template glyph instead of the generated placeholder for an edited component default state", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-load");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    const customDeviceDraft = createCustomDeviceDraftFromTemplate(template);
    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
    const placeholderImage = generateCustomDeviceImage(template.label, terminalTypes);
    const defaultVisual = createCustomDeviceDefaultStateVisualDraft({
      ...APP_STATIC_SCOPE,
      customDeviceDraft,
      customDevicePreviewLabel: template.label,
      customDraftTerminalTypes: terminalTypes,
      selectedCustomComponentTemplate: template,
      selectedDefinitionTemplate: template,
      colorDisplayMode: "energy"
    })();

    expect(defaultVisual.image).toMatch(/^data:image\/svg\+xml/);
    expect(defaultVisual.image).not.toBe(placeholderImage);
  });

  test("selecting a component template immediately replaces the edited device draft", () => {
    const staticTextTemplate = DEVICE_LIBRARY.find((item) => item.kind === "static-text");
    const hydrogenCompressorTemplate = DEVICE_LIBRARY.find((item) => item.kind === "hydrogen-compressor");
    expect(staticTextTemplate).toBeTruthy();
    expect(hydrogenCompressorTemplate).toBeTruthy();
    if (!staticTextTemplate || !hydrogenCompressorTemplate) {
      return;
    }

    let draft = createCustomDeviceDraftFromTemplate(staticTextTemplate);
    let treeSelection: any = { kind: "component", attributeLibraryName: staticTextTemplate.attributeLibrary, section: "StaticTextSymbol", templateKind: staticTextTemplate.kind };
    let selectedDefinitionKind = staticTextTemplate.kind;
    let definitionDraftSection = "StaticTextSymbol";
    let editingCustomDeviceKind = "";
    let customDeviceStatePageId = "old";
    let saveMessage = "old message";
    const expandedRequests: Array<[string, string]> = [];
    const pendingFrames: Array<() => void> = [];
    const previousWindow = (globalThis as any).window;
    (globalThis as any).window = {
      requestAnimationFrame: (callback: () => void) => {
        pendingFrames.push(callback);
        return pendingFrames.length;
      },
      cancelAnimationFrame: () => {}
    };

    try {
      const selectTemplate = createSelectCustomComponentTemplate({
        DEFAULT_STATE_PAGE_ID,
        createCustomDeviceDraftFromTemplate,
        customComponentSelectionFrameRef: { current: null },
        customComponentSelectionRequestRef: { current: 0 },
        customDeviceDefinitionMode: "edit",
        ensureCustomComponentTreeExpanded: (attributeLibraryName: string, section: string) => {
          expandedRequests.push([attributeLibraryName, section]);
        },
        normalizeAttributeLibraryName: (value: string) => value,
        normalizeComponentTypeName: (value: string) => value,
        resolveTemplateComponentType,
        setCustomComponentTreeSelection: (next: any) => {
          treeSelection = next;
        },
        setCustomDeviceDraft: (next: any) => {
          draft = typeof next === "function" ? next(draft) : next;
        },
        setCustomDeviceSaveMessage: (next: string) => {
          saveMessage = next;
        },
        setCustomDeviceStatePageId: (next: any) => {
          customDeviceStatePageId = typeof next === "function" ? next(customDeviceStatePageId) : next;
        },
        setDefinitionDraftSection: (next: string) => {
          definitionDraftSection = next;
        },
        setEditingCustomDeviceKind: (next: any) => {
          editingCustomDeviceKind = typeof next === "function" ? next(editingCustomDeviceKind) : next;
        },
        setSelectedDefinitionKind: (next: any) => {
          selectedDefinitionKind = next;
        },
        startCustomComponentSelectionTransition: (callback: () => void) => callback()
      });

      selectTemplate(hydrogenCompressorTemplate);

      expect(pendingFrames).toHaveLength(0);
      expect(saveMessage).toBe("");
      expect(expandedRequests).toEqual([["氢能设备", "HydroCompressor"]]);
      expect(selectedDefinitionKind).toBe("hydrogen-compressor");
      expect(definitionDraftSection).toBe("HydroCompressor");
      expect(treeSelection).toEqual({
        kind: "component",
        attributeLibraryName: "氢能设备",
        section: "HydroCompressor",
        templateKind: "hydrogen-compressor"
      });
      expect(editingCustomDeviceKind).toBe("");
      expect(customDeviceStatePageId).toBe(DEFAULT_STATE_PAGE_ID);
      expect(draft.componentName).toBe("氢压机");
      expect(draft.componentType).toBe("HydroCompressor");
      expect(draft.terminalCount).toBe(2);
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = previousWindow;
      }
    }
  });
});
