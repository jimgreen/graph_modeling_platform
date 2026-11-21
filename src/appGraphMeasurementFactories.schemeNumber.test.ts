import { describe, expect, test, vi } from "vitest";

import { createSaveSchemeTreeToBackend } from "./appExtracted/appGraphMeasurementFactories";
import type { SavedSchemeRecord } from "./model";
import { findSavedSchemeById, replaceSavedSchemeById } from "./model-routing";

describe("createSaveSchemeTreeToBackend 方案编号回执", () => {
  test("嵌套方案保存回执按运行时 id 回写到本地方案树", async () => {
    const root: SavedSchemeRecord = {
      id: "runtime-root",
      name: "主方案",
      updatedAt: "",
      projects: [],
      children: [
        { id: "runtime-east", name: "东区", updatedAt: "", projects: [] },
        { id: "runtime-west", name: "西区", updatedAt: "", projects: [] }
      ]
    };
    let schemes = [root];
    const setSchemes = (update: (current: SavedSchemeRecord[]) => SavedSchemeRecord[]) => {
      schemes = update(schemes);
    };
    const schemeIdByName: Record<string, number> = { "主方案": 70, "东区": 11, "西区": 23 };
    const saveBackendSchemeRecord = vi.fn(async (path: string[], _previousPath?: string[], requestedSchemeId?: number) => ({
      schemeId: schemeIdByName[path[path.length - 1]],
      requestedSchemeId
    }));
    const saveBackendProjectRecord = vi.fn(async () => undefined);

    await createSaveSchemeTreeToBackend({
      findSavedSchemeById,
      replaceSavedSchemeById,
      saveBackendProjectRecord,
      saveBackendSchemeRecord,
      setSchemes
    })(root, []);

    expect(schemes[0].schemeId).toBe(70);
    expect(schemes[0].children?.map(({ id, schemeId }) => [id, schemeId])).toEqual([
      ["11", 11],
      ["23", 23]
    ]);
    expect(saveBackendSchemeRecord.mock.calls.map(([, , requestedSchemeId]) => requestedSchemeId)).toEqual([undefined, undefined, undefined]);
  });
});
