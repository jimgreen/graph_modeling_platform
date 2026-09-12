// createCurrentProject 输出 backgroundProjectIdx：服务端靠它定位背景模型（前端 id 服务端无法解析）
import { describe, expect, test } from "vitest";
import { createCurrentProject } from "./appSelectionDragFactories";

function makeScope(overrides: Record<string, unknown> = {}) {
  return {
    activeLayerId: "default",
    allowAutoExpandCanvas: true,
    backgroundLayerIds: ["default"],
    backgroundProjectId: "project-bg",
    canvasBackgroundColor: "#ffffff",
    canvasBackgroundImage: "",
    canvasBackgroundImageAssetId: "",
    canvasBackgroundImageFit: "cover",
    canvasWidth: 800,
    canvasHeight: 400,
    currentUnit: "A",
    deviceIndexCounters: {},
    edgeWithCurrentRouteGeometryForSave: (edge: unknown) => edge,
    edges: [],
    groups: [],
    layers: [{ id: "default", name: "默认图层", visible: true }],
    lockProjectEdgeTerminals: (project: unknown) => project,
    nodes: [],
    normalizeModelGroups: (groups: unknown) => groups,
    normalizeProjectLayers: (project: unknown) => project,
    normalizeProjectMeasurements: (measurements: unknown) => measurements,
    powerBaseValue: 100,
    powerUnit: "MW",
    projectMeasurements: { version: 1, groups: [] },
    projectName: "宿主模型",
    projectIdx: 7,
    voltageUnit: "kV",
    ...overrides
  };
}

describe("createCurrentProject 背景页引用键", () => {
  // 模型全局 idx 落在 record.project.idx（SavedProjectRecord 顶层无 idx，
  // 与 nextGlobalProjectIndex 读 record.project.idx 同口径）
  test("背景记录有 idx 时输出 backgroundProjectIdx", () => {
    const project = createCurrentProject(makeScope({ backgroundProjectRecord: { project: { idx: 3 } } }))();
    expect(project.backgroundProjectIdx).toBe(3);
  });

  // 引用键必须落进最终 ProjectFile：只解构不写出时，服务端永远拿不到背景模型
  test("backgroundProjectIdx 不因 lockProjectEdgeTerminals / normalizeProjectLayers 透传而丢失", () => {
    const project = createCurrentProject(makeScope({ backgroundProjectRecord: { project: { idx: 11 } } }))();
    expect(project.backgroundProjectIdx).toBe(11);
    expect(project.backgroundProjectId).toBe("project-bg");
    expect(project.backgroundLayerIds).toEqual(["default"]);
  });

  test("无背景记录或 idx 非法时不输出", () => {
    expect(createCurrentProject(makeScope({ backgroundProjectRecord: undefined }))().backgroundProjectIdx).toBeUndefined();
    expect(createCurrentProject(makeScope({ backgroundProjectRecord: { project: { idx: 0 } } }))().backgroundProjectIdx).toBeUndefined();
    expect(createCurrentProject(makeScope({ backgroundProjectRecord: { idx: 3 } }))().backgroundProjectIdx).toBeUndefined();
  });
});
