import { Children, isValidElement, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import {
  CanvasConnectionPaths,
  shouldRenderBaseCanvasEdge
} from "./appExtracted/appCanvasArea";

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
});
