import { Children, isValidElement, type ReactElement } from "react";
import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import {
  adjustGeneratedStateIconTerminalStub,
  areCanvasPropsEqual,
  CanvasConnectionPaths,
  shouldRenderBaseCanvasEdge,
  staticDrawingContextMenuFinalPoint
} from "./appExtracted/appCanvasArea";
import { createRenderReadonlyBackgroundPage } from "./appExtracted/appToolbarHookFactories";

type AnyReactElement = ReactElement<any>;

const reactChildren = (element: AnyReactElement) =>
  Children.toArray(element.props.children).filter(isValidElement) as AnyReactElement[];

describe("live canvas edge DOM", () => {
  test("binds detailed edge interactions only to the wide hit path", () => {
    const onContextMenu = vi.fn();
    const onDoubleClick = vi.fn();
    const onPointerDown = vi.fn();
    const rendered = CanvasConnectionPaths({
      d: "M 0 0 L 100 0",
      onContextMenu,
      onDoubleClick,
      onPointerDown
    }) as AnyReactElement;
    const [hitline, line] = reactChildren(rendered);

    expect(hitline.props.className).toBe("connection-hitline");
    expect(hitline.props).toMatchObject({ onContextMenu, onDoubleClick, onPointerDown });
    expect(line.props.className).toBe("connection-line");
    expect(line.props.onContextMenu).toBeUndefined();
    expect(line.props.onDoubleClick).toBeUndefined();
    expect(line.props.onPointerDown).toBeUndefined();
  });

  test("omits a base route only while the same selected edge has a topmost editor", () => {
    expect(shouldRenderBaseCanvasEdge("edge-1", "edge-1", true)).toBe(false);
    expect(shouldRenderBaseCanvasEdge("edge-1", "edge-1", false)).toBe(true);
    expect(shouldRenderBaseCanvasEdge("edge-1", "edge-2", true)).toBe(true);
  });

  test("finishes static polyline drawing at the last confirmed point on right click", () => {
    const firstPoint = { x: 100, y: 120 };
    const lastConfirmedPoint = { x: 180, y: 160 };
    const rightClickPreviewPoint = { x: 260, y: 220 };

    expect(staticDrawingContextMenuFinalPoint({
      points: [firstPoint, lastConfirmedPoint],
      previewPoint: rightClickPreviewPoint
    } as any)).toBe(lastConfirmedPoint);
  });

  test("cancels an unfinished static drawing that has fewer than two confirmed points", () => {
    expect(staticDrawingContextMenuFinalPoint({
      points: [{ x: 100, y: 120 }],
      previewPoint: { x: 260, y: 220 }
    } as any)).toBeNull();
  });

  test("renders each read-only background edge as a direct path", () => {
    const edge = { id: "background-edge-1" };
    const render = createRenderReadonlyBackgroundPage({
      DEFAULT_CANVAS_BACKGROUND: "#ffffff",
      backgroundPageRender: {
        transform: "translate(0 0)",
        backgroundBounds: { width: 320, height: 180 },
        backgroundColor: "#ffffff",
        backgroundImageUrl: "",
        routes: [{ edgeId: edge.id, path: "M 0 0 L 100 0" }],
        edgeById: new Map([[edge.id, edge]]),
        nodeById: new Map(),
        nodes: []
      },
      colorDisplayMode: "energy",
      colorPalette: {},
      getConnectionStrokeColor: () => "#123456",
      g: "g",
      rect: "rect",
      image: "image",
      path: "path"
    });
    const layer = render() as AnyReactElement;
    const edgesLayer = reactChildren(layer).find((element) => element.props.className === "background-page-edges");
    const routes = edgesLayer ? reactChildren(edgesLayer) : [];

    expect(routes).toHaveLength(1);
    expect(routes[0].type).toBe("path");
    expect(routes[0].props.className).toBe("connection-line background-page-edge");
    expect(routes[0].props.style).toEqual({ "--connection-color": "#123456" });
  });

  test("routes detailed edge pointer events through the hit path", () => {
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(css).toMatch(/\.connection-group\s*>\s*\.connection-line\s*\{[^}]*pointer-events:\s*none;/s);
    expect(css).not.toContain(".background-page-edge .connection-line");
  });

  test("keeps model-association source and load hit areas borderless", () => {
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(css).toMatch(/\.diagram-node:has\(\.model-association-glyph\)[\s\S]*?\.node-hitbox[\s\S]*?stroke:\s*transparent\s*!important;[\s\S]*?filter:\s*none\s*!important;/);
  });

  test("maps generated state-icon terminal stubs through the inverse signed node scale", () => {
    const source = readFileSync(new URL("./appExtracted/appCanvasArea.tsx", import.meta.url), "utf8");

    expect(source).toContain("renderPoint.x + stub.from.x * inverseScaleX");
    expect(source).toContain("renderPoint.y + stub.from.y * inverseScaleY");
  });

  test("keeps a mirrored state-icon terminal stub pointed toward the device body", () => {
    const terminal = { anchor: { x: -0.5, y: -0.032 } };
    const renderPoint = { x: -79, y: -3.008 };
    const visualTransform = { x: 0, y: -2.279329, scale: 0.798496, rotation: 0 };
    const normal = adjustGeneratedStateIconTerminalStub(
      terminal,
      renderPoint,
      { from: { x: 46, y: 0 }, to: { x: 0, y: 0 } },
      1,
      1,
      visualTransform
    );
    const mirrored = adjustGeneratedStateIconTerminalStub(
      terminal,
      renderPoint,
      { from: { x: -46, y: 0 }, to: { x: 0, y: 0 } },
      -1,
      1,
      visualTransform
    );

    expect(normal.from.x).toBeGreaterThan(0);
    expect(mirrored.from.x).toBeLessThan(0);
    expect(mirrored.from.x).toBeCloseTo(-normal.from.x);
  });

  test("rerenders the canvas when a terminal press starts", () => {
    const terminalPress = {
      nodeId: "node-1",
      terminalId: "t1",
      pointerId: 7,
      startPoint: { x: 10, y: 20 },
      currentPoint: { x: 10, y: 20 },
      moved: false
    };

    expect(
      areCanvasPropsEqual(
        { scope: { terminalPress: null } },
        { scope: { terminalPress } }
      )
    ).toBe(false);
  });

  test("rerenders the canvas when smart alignment guides change during an imperative node drag", () => {
    const guide = {
      id: "vertical-240",
      orientation: "vertical",
      position: 240,
      start: 80,
      end: 320
    };

    expect(
      areCanvasPropsEqual(
        { scope: { smartAlignmentGuides: [] } },
        { scope: { smartAlignmentGuides: [guide] } }
      )
    ).toBe(false);
  });

  test("maps the live pointer and device-body stub point into terminal-layer coordinates", async () => {
    const canvasModule = await import("./appExtracted/appCanvasArea");
    const previewGeometry = (canvasModule as any).singleTerminalPointerPreviewGeometry;

    expect(previewGeometry).toBeTypeOf("function");
    expect(
      previewGeometry({
        nodePosition: { x: 100, y: 100 },
        nodeRotation: 0,
        nodeScaleX: 1,
        nodeScaleY: 1,
        pointer: { x: 150, y: 75 },
        terminalRenderPoint: { x: 54, y: 0 },
        stubFrom: { x: -20, y: 0 }
      })
    ).toEqual({
      bodyPoint: { x: 34, y: 0 },
      pointerPoint: { x: 50, y: -25 }
    });
  });

  test("shows a hand cursor and a pointer-following terminal extension while dragging", () => {
    const source = readFileSync(new URL("./appExtracted/appCanvasArea.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(source).toContain('terminalPress?.moved ? "terminal-dragging" : ""');
    expect(source).toContain('className="terminal-drag-overlay"');
    expect(source).toContain('className="terminal-drag-preview-line"');
    expect(source).toContain('terminal-drag-preview-dot');
    expect(source).toContain('terminal-drag-active');
    expect(source).not.toContain('className="terminal-drag-trajectory"');
    expect(source).not.toContain('terminal-drag-origin');
    expect(css).toMatch(/\.diagram-canvas\.terminal-dragging[\s\S]*cursor:\s*grabbing\s*!important/);
    expect(css).not.toContain(".terminal-drag-trajectory");
  });

  test("keeps the regular arrow over modal popups while canvas drawing mode is active", () => {
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const drawingCursorRule = "body.canvas-drawing-mode:not(.canvas-connect-drop-ready) *";
    const popupCursorRule = "body.canvas-drawing-mode .image-picker-backdrop *";

    expect(css).toContain(drawingCursorRule);
    expect(css).toContain(popupCursorRule);
    expect(css).toMatch(
      /body\.canvas-drawing-mode \.image-picker-backdrop,[\s\S]*body\.canvas-drawing-mode \.image-picker-backdrop \*[\s\S]*cursor:\s*default\s*!important/
    );
    expect(css.indexOf(popupCursorRule)).toBeGreaterThan(css.indexOf(drawingCursorRule));
  });
});
