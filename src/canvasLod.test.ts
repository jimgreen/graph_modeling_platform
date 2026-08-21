import { describe, expect, test, vi } from "vitest";

import { createAppHookCallback128, createAppHookCallback134 } from "./appExtracted/appToolbarHookFactories";
import { CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT, CANVAS_LOD_MAX_NODE_SCREEN_SIZE, CANVAS_LOD_NODE_DETAIL_LIMIT } from "./appExtracted/appCoreCanvasUtilities";
import { APP_STATIC_SCOPE } from "./appExtracted/appStaticScope";
import { DEFAULT_COLOR_PALETTE, DEVICE_LIBRARY, createNodeFromTemplate } from "./model";

describe("canvas LOD rendering", () => {
  test("uses the same large-model threshold for initial and persistent low-zoom LOD", () => {
    expect(CANVAS_LOD_NODE_DETAIL_LIMIT).toBe(CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT);
    expect(CANVAS_LOD_MAX_NODE_SCREEN_SIZE).toBeGreaterThanOrEqual(24);
  });

  test("stops initial detail hydration when persistent LOD already owns the viewport", () => {
    const scheduleIdleWork = vi.fn();
    const setInitialCanvasDetailHydrationLimit = vi.fn();
    const setInitialCanvasLodActive = vi.fn();

    createAppHookCallback128({
      CANVAS_INITIAL_LOD_DETAIL_CHUNK_SIZE: 192,
      CANVAS_INITIAL_LOD_FIRST_DETAIL_DELAY_MS: 360,
      CANVAS_INITIAL_LOD_NEXT_DETAIL_DELAY_MS: 90,
      initialCanvasDetailHydrationLimit: 0,
      initialCanvasDetailHydrationTarget: 458,
      initialCanvasLodActive: true,
      scheduleIdleWork,
      setInitialCanvasDetailHydrationLimit,
      setInitialCanvasLodActive,
      usePersistentCanvasLod: true
    })();

    expect(scheduleIdleWork).not.toHaveBeenCalled();
    expect(setInitialCanvasDetailHydrationLimit).not.toHaveBeenCalled();
    expect(setInitialCanvasLodActive).toHaveBeenCalledWith(false);
  });

  test("keeps progressive initial detail hydration when persistent LOD is inactive", () => {
    const scheduledCallbacks: Array<() => void> = [];
    const setInitialCanvasDetailHydrationLimit = vi.fn((updater: (limit: number) => number) => updater(0));

    createAppHookCallback128({
      CANVAS_INITIAL_LOD_DETAIL_CHUNK_SIZE: 192,
      CANVAS_INITIAL_LOD_FIRST_DETAIL_DELAY_MS: 360,
      CANVAS_INITIAL_LOD_NEXT_DETAIL_DELAY_MS: 90,
      initialCanvasDetailHydrationLimit: 0,
      initialCanvasDetailHydrationTarget: 458,
      initialCanvasLodActive: true,
      scheduleIdleWork: (callback: () => void) => {
        scheduledCallbacks.push(callback);
        return vi.fn();
      },
      setInitialCanvasDetailHydrationLimit,
      setInitialCanvasLodActive: vi.fn(),
      usePersistentCanvasLod: false
    })();

    expect(scheduledCallbacks).toHaveLength(1);
    scheduledCallbacks[0]?.();
    expect(setInitialCanvasDetailHydrationLimit).toHaveReturnedWith(192);
  });

  test("uses the canonical node fill color for custom-anchor LOD bodies", () => {
    const baseTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-load");
    expect(baseTemplate).toBeTruthy();
    if (!baseTemplate) {
      return;
    }

    const template = {
      ...baseTemplate,
      kind: "custom-ac-load",
      custom: true,
      terminalAnchors: [{ x: 0.5, y: 0 }],
      params: { ...baseTemplate.params, fillColor: "#123456" }
    };
    const node = createNodeFromTemplate(template, { x: 120, y: 80 });
    node.terminals[0] = { ...node.terminals[0], anchor: { x: 0.25, y: -0.5 } };
    const scope = {
      ...APP_STATIC_SCOPE,
      CANVAS_LOD_MARKUP_CHUNK_SIZE: 64,
      activeLayerNodeIdSet: new Set([node.id]),
      colorDisplayMode: "energy",
      colorPalette: DEFAULT_COLOR_PALETTE,
      dragGhostRoutableLineNodeIdSet: new Set(),
      groupTransformPreviewNodeIdSet: new Set(),
      imageAssets: [],
      initialCanvasDetailedNodeIdSet: new Set(),
      isEditMode: true,
      libraryTemplateByKind: new Map([[template.kind, template]]),
      lodCanvasNodeChunkCacheRef: { current: { chunks: [] } },
      nodeLabelDrag: null,
      nodeLabelRotateDrag: null,
      resolveNodeStateVisual: () => null,
      routableLineEndpointDrag: null,
      transformDrag: null,
      useSimplifiedCanvasNodes: true,
      viewportNodes: [node]
    };

    const chunks = createAppHookCallback134(scope)();
    const markup = (chunks as Array<{ markup: string }>).map((chunk) => chunk.markup).join("");

    expect(markup).toContain("custom-terminal-lod-node");
    expect(markup).toContain('fill="#123456"');
  });

  test("renders device glyph markup instead of only a rectangle for regular devices", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-load");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }

    const node = createNodeFromTemplate(template, { x: 120, y: 80 });
    const scope = {
      ...APP_STATIC_SCOPE,
      CANVAS_LOD_MARKUP_CHUNK_SIZE: 64,
      activeLayerNodeIdSet: new Set([node.id]),
      colorDisplayMode: "energy",
      colorPalette: DEFAULT_COLOR_PALETTE,
      dragGhostRoutableLineNodeIdSet: new Set(),
      groupTransformPreviewNodeIdSet: new Set(),
      imageAssets: [],
      initialCanvasDetailedNodeIdSet: new Set(),
      isEditMode: true,
      libraryTemplateByKind: new Map(DEVICE_LIBRARY.map((item) => [item.kind, item])),
      lodCanvasNodeChunkCacheRef: { current: { chunks: [] } },
      nodeLabelDrag: null,
      nodeLabelRotateDrag: null,
      resolveNodeStateVisual: () => null,
      routableLineEndpointDrag: null,
      transformDrag: null,
      useSimplifiedCanvasNodes: true,
      viewportNodes: [node]
    };

    const chunks = createAppHookCallback134(scope)();
    const markup = (chunks as Array<{ markup: string }>).map((chunk) => chunk.markup).join("");

    expect(markup).toContain("lod-node");
    expect(markup).toContain("electric-load-glyph");
    expect(markup).not.toContain("class=\"lod-node-body\"");
  });
});
