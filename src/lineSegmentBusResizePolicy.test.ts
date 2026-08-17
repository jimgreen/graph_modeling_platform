import { describe, expect, test, vi } from "vitest";

import { createStartSingleTransformDrag } from "./appExtracted/appCanvasInteractionFactories";
import { createDefaultNode, isLineSegmentBusNode } from "./model";

describe("line-segment bus resize policy", () => {
  test.each(["ACRealBs", "DCRealBs"])(
    "allows an independent geometry-axis drag for a derived %s node even when generic transform resizing is disabled",
    (componentType) => {
      const node = {
        ...createDefaultNode(componentType === "ACRealBs" ? "ac-bus" : "dc-bus", { x: 100, y: 100 }),
        kind: `derived-${componentType.toLowerCase()}`,
        params: { component_type: componentType }
      };
      const setTransformDrag = vi.fn();
      const setPointerCapture = vi.fn();
      const scope = {
        TRANSFORM_ROTATE_HANDLE_GAP: 32,
        TRANSFORM_ROTATE_STEM_END: 24,
        TRANSFORM_ROTATE_STEM_START: 12,
        clampPointToCanvas: (point: unknown) => point,
        hasCanvasSelectionModifier: () => false,
        isLineSegmentBusNode,
        nodeForegroundImage: () => "",
        nodeImage: () => "",
        nodeKindAllowsResizeTransform: () => false,
        nodeRotateHandleControlPoints: () => ({ handle: { x: 0, y: -50 } }),
        nodeUprightRotateHandleControlPoints: () => ({ handle: { x: 0, y: -50 } }),
        nodeUsesUprightStaticSelectionOutline: () => false,
        requireEditMode: () => true,
        screenToSvgPoint: (_svg: unknown, x: number, y: number) => ({ x, y }),
        setTransformDrag,
        snapshotSingleTransformNode: (current: typeof node) => ({
          position: { ...current.position },
          rotation: current.rotation,
          scale: current.scale,
          scaleX: current.scaleX,
          scaleY: current.scaleY
        }),
        startModifierSelectionPress: vi.fn(),
        svgRef: { current: {} },
        transformDragChangedRef: { current: true }
      };

      createStartSingleTransformDrag(scope as any)(
        {
          clientX: 100,
          clientY: 40,
          currentTarget: { setPointerCapture },
          pointerId: 7,
          stopPropagation: vi.fn()
        } as any,
        node,
        "scale-y",
        {
          id: "north",
          kind: "scale-y",
          xDirection: 0,
          yDirection: -1,
          className: "vertical"
        }
      );

      expect(setTransformDrag).toHaveBeenCalledWith(expect.objectContaining({
        kind: "scale-y",
        nodeId: node.id,
        originalSize: node.size,
        handleXDirection: 0,
        handleYDirection: -1
      }));
      expect(setPointerCapture).toHaveBeenCalledWith(7);
    }
  );

  test("keeps the generic resize permission for a non-bus node", () => {
    const node = createDefaultNode("ac-load", { x: 100, y: 100 });
    const setTransformDrag = vi.fn();
    const setPointerCapture = vi.fn();
    const scope = {
      TRANSFORM_ROTATE_HANDLE_GAP: 32,
      TRANSFORM_ROTATE_STEM_END: 24,
      TRANSFORM_ROTATE_STEM_START: 12,
      clampPointToCanvas: (point: unknown) => point,
      hasCanvasSelectionModifier: () => false,
      isLineSegmentBusNode,
      nodeForegroundImage: () => "",
      nodeImage: () => "",
      nodeKindAllowsResizeTransform: () => false,
      nodeRotateHandleControlPoints: () => ({ handle: { x: 0, y: -50 } }),
      nodeUprightRotateHandleControlPoints: () => ({ handle: { x: 0, y: -50 } }),
      nodeUsesUprightStaticSelectionOutline: () => false,
      requireEditMode: () => true,
      screenToSvgPoint: (_svg: unknown, x: number, y: number) => ({ x, y }),
      setTransformDrag,
      snapshotSingleTransformNode: vi.fn(),
      startModifierSelectionPress: vi.fn(),
      svgRef: { current: {} },
      transformDragChangedRef: { current: true }
    };

    createStartSingleTransformDrag(scope as any)(
      {
        clientX: 100,
        clientY: 40,
        currentTarget: { setPointerCapture },
        pointerId: 9,
        stopPropagation: vi.fn()
      } as any,
      node,
      "scale-y",
      {
        id: "north",
        kind: "scale-y",
        xDirection: 0,
        yDirection: -1,
        className: "vertical"
      }
    );

    expect(setTransformDrag).not.toHaveBeenCalled();
    expect(setPointerCapture).not.toHaveBeenCalled();
  });
});
