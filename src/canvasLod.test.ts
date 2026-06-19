import { describe, expect, test } from "vitest";

import { createAppHookCallback134 } from "./appExtracted/appToolbarHookFactories";
import { APP_STATIC_SCOPE } from "./appExtracted/appStaticScope";
import { DEFAULT_COLOR_PALETTE, DEVICE_LIBRARY, createNodeFromTemplate } from "./model";

describe("canvas LOD rendering", () => {
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
