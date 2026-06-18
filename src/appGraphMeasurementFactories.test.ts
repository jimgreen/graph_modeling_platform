import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createAddMeasurementType,
  createFlushMeasurementConfigDialogDraftInputs,
  createSaveMeasurementConfigDialog,
  createUpdateMeasurementConfig
} from "./appExtracted/appGraphMeasurementFactories";

describe("measurement config factories", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
  });

  test("persists a newly added measurement type when saving immediately", async () => {
    const initialConfig = {
      measurementTypes: [{ id: "activePower", key: "p", name: "有功功率" }],
      deviceProfiles: []
    };
    const measurementConfigDraftRef = { current: initialConfig };
    const savedPayloads: string[] = [];

    const scope: Record<string, any> = {
      backendMeasurementConfigLoadedRef: { current: false },
      lastPersistedMeasurementConfigPayloadRef: { current: null },
      measurementConfig: initialConfig,
      measurementConfigDraft: initialConfig,
      measurementConfigDraftRef,
      normalizeMeasurementConfig: (config: typeof initialConfig) => config,
      saveBackendMeasurementConfigPayload: vi.fn(async (payload: string) => {
        savedPayloads.push(payload);
      }),
      serializeMeasurementConfigForStorage: JSON.stringify,
      setMeasurementConfig: vi.fn((config) => {
        scope.measurementConfig = config;
      }),
      setMeasurementConfigDraft: vi.fn((config) => {
        scope.measurementConfigDraft = config;
      }),
      setMeasurementConfigSaveStatus: vi.fn(),
      writeMeasurementConfig: vi.fn(),
      writeOperationLog: vi.fn()
    };
    Object.assign(scope, {
      flushMeasurementConfigDialogDraftInputs: createFlushMeasurementConfigDialogDraftInputs(scope),
      updateMeasurementConfig: createUpdateMeasurementConfig(scope)
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { prompt: vi.fn(() => "新量测类型") }
    });

    createAddMeasurementType(scope)();
    await createSaveMeasurementConfigDialog(scope)();

    expect(JSON.parse(savedPayloads[0]).measurementTypes).toContainEqual(
      expect.objectContaining({ name: "新量测类型", shortLabel: "新量测类型" })
    );
  });

  test("does not add a measurement type with a duplicate name", () => {
    const initialConfig = {
      measurementTypes: [{ id: "activePower", key: "p", name: "有功功率" }],
      deviceProfiles: []
    };
    const measurementConfigDraftRef = { current: initialConfig };
    const scope: Record<string, any> = {
      measurementConfig: initialConfig,
      measurementConfigDraft: initialConfig,
      measurementConfigDraftRef,
      normalizeMeasurementConfig: (config: typeof initialConfig) => config,
      setMeasurementConfigDraft: vi.fn((config) => {
        scope.measurementConfigDraft = config;
      }),
      setMeasurementConfigSaveStatus: vi.fn()
    };
    Object.assign(scope, {
      updateMeasurementConfig: createUpdateMeasurementConfig(scope)
    });
    const alert = vi.fn();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { alert, prompt: vi.fn(() => "有功功率") }
    });

    createAddMeasurementType(scope)();

    expect(alert).toHaveBeenCalledWith(expect.stringContaining("量测类型名称不能重复"));
    expect(measurementConfigDraftRef.current.measurementTypes).toHaveLength(1);
  });

  test("blocks saving measurement config when IDs or names are duplicated", async () => {
    const duplicateConfig = {
      measurementTypes: [
        { id: "activePower", key: "p", name: "有功功率" },
        { id: "activePower", key: "custom", name: "新量测" },
        { id: "customMeasurementUnique", key: "unique", name: "有功功率" }
      ],
      deviceProfiles: []
    };
    const alert = vi.fn();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { alert }
    });
    const scope = {
      backendMeasurementConfigLoadedRef: { current: false },
      lastPersistedMeasurementConfigPayloadRef: { current: null },
      measurementConfig: duplicateConfig,
      measurementConfigDraft: duplicateConfig,
      measurementConfigDraftRef: { current: duplicateConfig },
      normalizeMeasurementConfig: (config: typeof duplicateConfig) => config,
      saveBackendMeasurementConfigPayload: vi.fn(),
      serializeMeasurementConfigForStorage: JSON.stringify,
      setMeasurementConfig: vi.fn(),
      setMeasurementConfigDraft: vi.fn(),
      setMeasurementConfigSaveStatus: vi.fn(),
      writeMeasurementConfig: vi.fn(),
      writeOperationLog: vi.fn()
    };
    Object.assign(scope, {
      flushMeasurementConfigDialogDraftInputs: createFlushMeasurementConfigDialogDraftInputs(scope)
    });

    await createSaveMeasurementConfigDialog(scope)();

    expect(alert).toHaveBeenCalledWith(expect.stringContaining("量测类型ID不能重复"));
    expect(alert).toHaveBeenCalledWith(expect.stringContaining("量测类型名称不能重复"));
    expect(scope.saveBackendMeasurementConfigPayload).not.toHaveBeenCalled();
    expect(scope.writeMeasurementConfig).not.toHaveBeenCalled();
  });

  test("commits the focused measurement dialog input before saving the draft", async () => {
    const initialConfig = {
      measurementTypes: [{ id: "activePower", key: "p", name: "有功功率" }],
      deviceProfiles: []
    };
    const editedConfig = {
      measurementTypes: [
        ...initialConfig.measurementTypes,
        { id: "customMeasurement-test", key: "customMeasurement-test", name: "新量测" }
      ],
      deviceProfiles: []
    };
    const measurementConfigDraftRef = { current: initialConfig };
    const activeElement = {
      blur: vi.fn(() => {
        measurementConfigDraftRef.current = editedConfig;
      })
    };
    const measurementConfigDialogRef = {
      current: {
        contains: vi.fn((element: unknown) => element === activeElement)
      }
    };
    const savedPayloads: string[] = [];

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { activeElement }
    });

    const scope = {
      backendMeasurementConfigLoadedRef: { current: false },
      lastPersistedMeasurementConfigPayloadRef: { current: null },
      measurementConfig: initialConfig,
      measurementConfigDraft: initialConfig,
      measurementConfigDraftRef,
      measurementConfigDialogRef,
      flushSync: (callback: () => void) => callback(),
      normalizeMeasurementConfig: (config: typeof initialConfig) => config,
      saveBackendMeasurementConfigPayload: vi.fn(async (payload: string) => {
        savedPayloads.push(payload);
      }),
      serializeMeasurementConfigForStorage: JSON.stringify,
      setMeasurementConfig: vi.fn(),
      setMeasurementConfigDraft: vi.fn(),
      setMeasurementConfigSaveStatus: vi.fn(),
      writeMeasurementConfig: vi.fn(),
      writeOperationLog: vi.fn()
    };
    Object.assign(scope, {
      flushMeasurementConfigDialogDraftInputs: createFlushMeasurementConfigDialogDraftInputs(scope)
    });
    const saveMeasurementConfigDialog = createSaveMeasurementConfigDialog(scope);

    await saveMeasurementConfigDialog();

    expect(activeElement.blur).toHaveBeenCalledTimes(1);
    expect(measurementConfigDialogRef.current.contains).toHaveBeenCalledWith(activeElement);
    expect(JSON.parse(savedPayloads[0]).measurementTypes).toContainEqual(
      expect.objectContaining({ id: "customMeasurement-test" })
    );
  });
});
