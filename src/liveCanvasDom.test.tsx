import { Children, isValidElement, type ReactElement } from "react";
import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import {
  CanvasConnectionPaths,
  shouldRenderBaseCanvasEdge
} from "./appExtracted/appCanvasArea";
import { createRenderReadonlyBackgroundPage } from "./appExtracted/appToolbarHookFactories";

const reactChildren = (element: ReactElement) =>
  Children.toArray(element.props.children).filter(isValidElement) as ReactElement[];

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
    }) as ReactElement;
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
    const layer = render() as ReactElement;
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
});
