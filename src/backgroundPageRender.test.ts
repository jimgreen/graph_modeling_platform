import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";

import { createAppHookCallback140 } from "./appExtracted/appToolbarHookFactories";

describe("background page rendering", () => {
  test("keeps background page content ready when only visible layer selection changes", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const dependencyMatch = appSource.match(/useEffect\(createAppHookCallback140\(__appScope\), \[([^\]]*)\]\);/u);

    expect(dependencyMatch).toBeTruthy();
    expect(dependencyMatch?.[1] ?? "").not.toMatch(/\bbackgroundLayerIds\b/u);
  });

  test("marks a valid background page ready immediately", () => {
    const setBackgroundPageRenderReady = vi.fn();
    const scheduleIdleWork = vi.fn();

    createAppHookCallback140({
      activeProjectKey: "project-a",
      backgroundProjectId: "project-b",
      backgroundProjectRecord: { project: {} },
      scheduleIdleWork,
      setBackgroundPageRenderReady
    })();

    expect(setBackgroundPageRenderReady).toHaveBeenCalledWith(true);
    expect(scheduleIdleWork).not.toHaveBeenCalled();
  });

  test("loads a summary background page record before rendering its graphics", async () => {
    const setBackgroundPageRenderReady = vi.fn();
    const writeOperationLog = vi.fn();
    const upsertSavedProjectInScheme = vi.fn((current, schemeId, record) => ({
      current,
      schemeId,
      record
    }));
    const setSchemes = vi.fn((updater) => updater(["existing-scheme"]));
    const fetchBackendProjectRecord = vi.fn().mockResolvedValue({
      id: "loaded-id",
      name: "背景页",
      updatedAt: "2026-06-21T00:00:00.000Z",
      project: {
        name: "背景页",
        nodes: [{ id: "node-1" }],
        edges: []
      }
    });
    const suppressNextBackendSchemeSyncRef = { current: false };

    const cleanup = createAppHookCallback140({
      activeProjectKey: "active-project",
      backgroundProjectId: "background-project",
      backgroundProjectRecord: {
        id: "background-project",
        name: "背景页",
        project: { __summaryOnly: true }
      },
      fetchBackendProjectRecord,
      findSchemeForProject: vi.fn(() => ({ id: "scheme-1" })),
      savedProjectRecordIsSummary: vi.fn(() => true),
      schemePathForProject: vi.fn(() => ["方案A"]),
      setBackgroundPageRenderReady,
      setSchemes,
      suppressNextBackendSchemeSyncRef,
      upsertSavedProjectInScheme,
      writeOperationLog
    })();

    expect(setBackgroundPageRenderReady).toHaveBeenCalledWith(false);
    expect(fetchBackendProjectRecord).toHaveBeenCalledWith(["方案A"], "背景页");

    await Promise.resolve();

    expect(suppressNextBackendSchemeSyncRef.current).toBe(true);
    expect(setSchemes).toHaveBeenCalledTimes(1);
    expect(upsertSavedProjectInScheme).toHaveBeenCalledWith(
      ["existing-scheme"],
      "scheme-1",
      expect.objectContaining({
        id: "background-project",
        name: "背景页",
        project: expect.objectContaining({
          nodes: [{ id: "node-1" }]
        })
      })
    );
    expect(writeOperationLog).toHaveBeenCalledWith("加载背景页面：背景页");

    if (typeof cleanup === "function") {
      cleanup();
    }
  });
});
