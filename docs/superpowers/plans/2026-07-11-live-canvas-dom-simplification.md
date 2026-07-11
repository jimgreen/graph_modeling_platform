# Live Canvas DOM Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the live canvas SVG DOM without changing edge selection, wide hit targets, context menus, bend editing, dragging, rewiring, layer state, or LOD behavior.

**Architecture:** Keep one state-owning `connection-group` for detailed editable edges, but centralize its two path children so only the transparent hit path owns events. Avoid rendering the selected edge twice when its topmost edit overlay is active. Flatten read-only background routes to direct paths while leaving the already-flat LOD and preview paths unchanged.

**Tech Stack:** React 19, TypeScript/TSX, SVG, CSS, Vitest, Vite, agent-browser.

---

## File Map

- Create `src/liveCanvasDom.test.tsx`: focused React-element and source-contract tests for detailed edge paths, selected-edge deduplication, background route flattening, and pointer-event CSS.
- Modify `src/appExtracted/appCanvasArea.tsx`: add reusable detailed edge path markup, calculate topmost selected-edge visibility once, and suppress the duplicate base route.
- Modify `src/appExtracted/appToolbarHookFactories.tsx`: flatten each read-only background edge from `g > path` to one direct `path`.
- Modify `src/styles.css`: route detailed-edge pointer events through the transparent hit path and simplify the background edge selector.
- Preserve `src/appExtracted/appSelectionDragFactories.tsx`: `data-edge-id` remains on detailed groups and LOD paths because imperative drag-origin queries still depend on it.

### Task 1: Add Failing DOM Contract Tests

**Files:**
- Create: `src/liveCanvasDom.test.tsx`
- Read: `src/appExtracted/appCanvasArea.tsx`
- Read: `src/appExtracted/appToolbarHookFactories.tsx`
- Read: `src/styles.css`

- [ ] **Step 1: Add tests for detailed edge event ownership and selected-edge deduplication**

Create `src/liveCanvasDom.test.tsx` with these imports and tests:

```tsx
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
```

- [ ] **Step 2: Run the tests and verify the RED state**

Run:

```powershell
npm test -- src/liveCanvasDom.test.tsx --maxWorkers=1 --fileParallelism=false
```

Expected: FAIL because `CanvasConnectionPaths` and `shouldRenderBaseCanvasEdge` do not exist.

### Task 2: Centralize Detailed Edge Paths and Remove Duplicate Selected Routes

**Files:**
- Modify: `src/appExtracted/appCanvasArea.tsx:1-15`
- Modify: `src/appExtracted/appCanvasArea.tsx:230-260`
- Modify: `src/appExtracted/appCanvasArea.tsx:610-660`
- Modify: `src/appExtracted/appCanvasArea.tsx:1120-1160`
- Test: `src/liveCanvasDom.test.tsx`

- [ ] **Step 1: Run GitNexus impact analysis before editing**

Run:

```powershell
node .gitnexus/run.cjs impact MemoizedCanvasArea --direction upstream --repo graph_modeling_platform --file src/appExtracted/appCanvasArea.tsx --depth 3 --include-tests
```

Expected: report the direct canvas consumers and test blast radius. Stop and warn before editing if risk is HIGH or CRITICAL.

- [ ] **Step 2: Add reusable detailed edge path markup and the base-route predicate**

Add above `MemoizedCanvasArea`:

```tsx
export function CanvasConnectionPaths({
  d,
  onContextMenu,
  onDoubleClick,
  onPointerDown
}: {
  d: string;
  onContextMenu?: (event: any) => void;
  onDoubleClick?: (event: any) => void;
  onPointerDown?: (event: any) => void;
}) {
  return (
    <>
      <path
        d={d}
        className="connection-hitline"
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
        onPointerDown={onPointerDown}
      />
      <path d={d} className="connection-line" />
    </>
  );
}

export function shouldRenderBaseCanvasEdge(
  edgeId: string,
  selectedEdgeId: string | null,
  selectedEdgeTopmostVisible: boolean
) {
  return !(selectedEdgeTopmostVisible && edgeId === selectedEdgeId);
}
```

- [ ] **Step 3: Calculate the topmost selected-edge state once**

Immediately before the component `return`, add:

```tsx
const selectedEdgeTopmostVisible = Boolean(
  selectedEdge &&
  !dragGhostEdgeIdSet.has(selectedEdge.id) &&
  !(singleNodeDragging && dragAffectedEdgeIdSet.has(selectedEdge.id)) &&
  !(draggingDelta && dragPreviewEdgeIdSet.has(selectedEdge.id)) &&
  !(multiNodeDragging && dragOverlayEdgeIdSet.has(selectedEdge.id)) &&
  !groupTransformPreviewEdgeIdSet.has(selectedEdge.id) &&
  !terminalPressPreviewEdgeIdSet.has(selectedEdge.id) &&
  rewiring?.edgeId !== selectedEdge.id
);
```

Replace the later repeated condition with:

```tsx
{selectedEdgeTopmostVisible && selectedEdge && (() => {
```

- [ ] **Step 4: Skip the duplicate base route and use the shared path component**

After resolving `edge` in `renderViewportRoutedEdges.map`, add:

```tsx
if (!shouldRenderBaseCanvasEdge(edge.id, selectedEdge?.id ?? null, selectedEdgeTopmostVisible)) {
  return null;
}
```

Replace both repeated hitline/visible-line pairs with:

```tsx
<CanvasConnectionPaths
  d={route.path}
  onContextMenu={editable ? (event) => openEdgeContextMenu(event, edge.id, route.points) : undefined}
  onDoubleClick={editable ? (event) => insertManualBendFromEdgePath(event, edge.id, route.points) : undefined}
  onPointerDown={editable ? (event) => handleEdgePathPointerDown(event, edge.id, route.points) : undefined}
/>
```

For the topmost editor, use `displayPath`, `isEditMode`, and `routePoints` in the same component props.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
npm test -- src/liveCanvasDom.test.tsx src/appView.test.tsx --maxWorkers=1 --fileParallelism=false
```

Expected: all tests in `src/liveCanvasDom.test.tsx` PASS.

- [ ] **Step 6: Commit the detailed-edge change**

Stage only:

```powershell
git add -- src/appExtracted/appCanvasArea.tsx src/liveCanvasDom.test.tsx
```

Before committing, run:

```powershell
node .gitnexus/run.cjs detect_changes --scope staged --repo graph_modeling_platform --limit 80
```

Then commit:

```powershell
git commit -m "refactor: simplify live edge DOM"
```

### Task 3: Flatten Read-Only Background Routes and Update CSS

**Files:**
- Modify: `src/appExtracted/appToolbarHookFactories.tsx:476-525`
- Modify: `src/styles.css:1682-1687`
- Modify: `src/styles.css:1814-1837`
- Test: `src/liveCanvasDom.test.tsx`

- [ ] **Step 1: Add the failing background-page and CSS contract tests**

Add these imports:

```tsx
import { readFileSync } from "node:fs";
import { createRenderReadonlyBackgroundPage } from "./appExtracted/appToolbarHookFactories";
```

Then append:

```tsx
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
```

- [ ] **Step 2: Run the new tests and verify the RED state**

Run:

```powershell
npm test -- src/liveCanvasDom.test.tsx --maxWorkers=1 --fileParallelism=false
```

Expected: the two newly added tests FAIL because background routes still render as `g > path` and the detailed pointer-event CSS rule is absent.

- [ ] **Step 3: Run GitNexus impact analysis before editing**

Run:

```powershell
node .gitnexus/run.cjs impact createRenderReadonlyBackgroundPage --direction upstream --repo graph_modeling_platform --file src/appExtracted/appToolbarHookFactories.tsx --depth 3 --include-tests
```

Expected: report background rendering callers and affected processes. Stop and warn before editing if risk is HIGH or CRITICAL.

- [ ] **Step 4: Replace each background edge wrapper with a direct path**

Replace:

```tsx
<g key={`background-edge-${edge.id}`} className="connection-group background-page-edge" style={backgroundConnectionLineStyle(edge)}>
  <path d={route.path} className="connection-line" />
</g>
```

with:

```tsx
<path
  key={`background-edge-${edge.id}`}
  d={route.path}
  className="connection-line background-page-edge"
  style={backgroundConnectionLineStyle(edge)}
/>
```

Keep the outer `<g className="background-page-edges">` because it is the semantic background route layer.

- [ ] **Step 5: Route detailed pointer events through the hit path**

Add after the existing `.connection-line` rule:

```css
.connection-group > .connection-line {
  pointer-events: none;
}
```

Change the background pointer-events selector from:

```css
.background-page-edge,
.background-page-edge .connection-line,
.background-page-node,
.background-page-node .terminal-dot {
  pointer-events: none;
}
```

to:

```css
.background-page-edge,
.background-page-node,
.background-page-node .terminal-dot {
  pointer-events: none;
}
```

- [ ] **Step 6: Run the focused DOM tests and verify GREEN**

Run:

```powershell
npm test -- src/liveCanvasDom.test.tsx --maxWorkers=1 --fileParallelism=false
```

Expected: all tests in `src/liveCanvasDom.test.tsx` PASS.

- [ ] **Step 7: Commit the background/CSS change**

Stage only:

```powershell
git add -- src/appExtracted/appToolbarHookFactories.tsx src/styles.css src/liveCanvasDom.test.tsx
```

Before committing, run:

```powershell
node .gitnexus/run.cjs detect_changes --scope staged --repo graph_modeling_platform --limit 80
```

Then commit:

```powershell
git commit -m "refactor: flatten background edge DOM"
```

### Task 4: Regression, DOM Inspection, and Interaction Verification

**Files:**
- Verify: `src/appExtracted/appCanvasArea.tsx`
- Verify: `src/appExtracted/appToolbarHookFactories.tsx`
- Verify: `src/appExtracted/appSelectionDragFactories.tsx`
- Verify: `src/styles.css`

- [ ] **Step 1: Run focused canvas and drag regressions**

Run:

```powershell
npm test -- src/liveCanvasDom.test.tsx src/appView.test.tsx src/appGraphMeasurementFactories.test.ts src/model.test.ts --maxWorkers=1 --fileParallelism=false
```

Expected: all selected test files PASS with zero failures.

- [ ] **Step 2: Run SVG export and backend persistence regressions**

Run:

```powershell
npm test -- src/svgExport.test.tsx server/image-server.test.mjs server/apiV1Schemes.handlers.test.mjs server/apiV1Schemes.test.mjs --maxWorkers=1 --fileParallelism=false
```

Expected: all selected test files PASS; live DOM simplification does not change exported SVG or persisted project data.

- [ ] **Step 3: Build and validate the diff**

Run:

```powershell
npm run build
```

Expected: TypeScript and Vite build complete successfully. The existing large-chunk warning is acceptable; new compile errors are not.

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 4: Run GitNexus final change detection**

Run:

```powershell
node .gitnexus/run.cjs detect_changes --scope unstaged --repo graph_modeling_platform --limit 80
```

Expected: changed symbols are limited to live canvas rendering, background rendering, CSS/tests, plus the already-present uncommitted SVG compacting work. Investigate any unrelated execution flow before completion.

- [ ] **Step 5: Verify the running WEB application**

Confirm:

```powershell
Invoke-WebRequest http://127.0.0.1:5173/ -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:5174/api/schemes -UseBasicParsing
```

Expected: both return HTTP 200. Restart `npm run dev` only if either process is stale or unavailable.

Use agent-browser to open `http://127.0.0.1:5173/`, select a model containing editable routes, and verify:

- A normal edge still selects through its wide hit area.
- Right-click still opens the edge menu.
- Double-click still inserts a bend in edit mode.
- Endpoint handles still start rewiring.
- A selected edge has one active `connection-group.selected.topmost`, without a second base `connection-group` carrying the same `data-edge-id`.
- `.background-page-edges` contains direct `path.background-page-edge` children and no per-edge `g` wrappers when a background page is active.
- No Vite overlay or browser console errors appear.

- [ ] **Step 6: Report the measured simplification**

Report these concrete results:

- One fewer DOM element for every rendered background edge.
- Three duplicate React event props removed from every detailed visible edge path.
- One duplicate detailed edge group removed whenever the selected topmost editor is visible.
- `data-edge-id` retained only where live drag-origin lookup requires it.
- Exported SVG behavior unchanged by this live-DOM task.
