# SVG Model Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scheme context-menu SVG model generation with semantic platform parsing and single-static-node generic fallback.

**Architecture:** Parse SVG into a standard `ProjectFile` in a focused module, then reuse existing model import, conflict, persistence and loading flows. The parser uses an injected DOM adapter in tests and browser-native `DOMParser`/`XMLSerializer` in production, sanitizes before interpretation, restores platform semantics in batches, and degrades unsupported content to sanitized static SVG nodes.

**Tech Stack:** React 19, TypeScript, browser DOMParser/XMLSerializer, Vitest, Vite.

---

## File Map

- Create `src/svgModelImport.ts`: public import types, SVG sanitization, platform detection, semantic parsing, generic fallback, batching and result statistics.
- Create `src/svgModelImport.test.ts`: parser security, generic fallback, platform restoration, fallback, round-trip and batching tests.
- Modify `package.json`, `package-lock.json`, `pnpm-lock.yaml`: add test-only `@xmldom/xmldom` DOM implementation.
- Modify `src/appExtracted/appCoreCanvasUtilities.tsx`: allow model-import conflicts to carry completion feedback for SVG imports.
- Modify `src/appExtracted/appDeviceDefinitionFactories.tsx`: add SVG picker/import factories and complete success feedback after direct or conflict-resolved imports.
- Modify `src/appDeviceDefinitionFactories.test.ts`: cover SVG picker targeting, direct import, conflict metadata and completion feedback.
- Modify `src/App.tsx`: create the SVG file input ref and wire the new factories into `__appScope`.
- Modify `src/appExtracted/appView.tsx`: add the hidden SVG input and the scheme context-menu command.

## Task 1: Establish The XML Harness And Generic SVG Fallback

**Files:**
- Create: `src/svgModelImport.ts`
- Create: `src/svgModelImport.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add the test-only XML dependency**

Run:

```powershell
npm install --save-dev @xmldom/xmldom@0.9.10
pnpm install --lockfile-only
```

Expected: `@xmldom/xmldom` appears only in `devDependencies`, and both lock files record version `0.9.10`.

- [ ] **Step 2: Write failing tests for validation, sanitization and the one-node generic fallback**

Create `src/svgModelImport.test.ts` with the adapter and initial cases:

```ts
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { describe, expect, test } from "vitest";

import { DEVICE_LIBRARY } from "./model";
import { parseSvgModel, type SvgDomAdapter } from "./svgModelImport";

const dom: SvgDomAdapter = {
  parse(source) {
    const errors: string[] = [];
    const document = new DOMParser({
      errorHandler: {
        warning: () => undefined,
        error: (message) => errors.push(String(message)),
        fatalError: (message) => errors.push(String(message))
      }
    }).parseFromString(source, "image/svg+xml");
    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }
    return document as unknown as Document;
  },
  serialize(node) {
    return new XMLSerializer().serializeToString(node as never);
  }
};

const parse = (source: string, name = "普通图") => parseSvgModel(source, {
  name,
  templates: DEVICE_LIBRARY,
  dom,
  yieldToMain: async () => undefined,
  batchSize: 2
});

describe("parseSvgModel generic fallback", () => {
  test("imports an ordinary SVG as exactly one sanitized static-image node", async () => {
    const result = await parse(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 320 180">
        <script>alert(1)</script>
        <foreignObject><div>unsafe</div></foreignObject>
        <rect x="10" y="20" width="320" height="180" fill="#0ea5e9" onclick="alert(1)"/>
        <image href="javascript:alert(1)" width="10" height="10"/>
      </svg>
    `);

    expect(result.mode).toBe("generic");
    expect(result.project.canvasWidth).toBe(320);
    expect(result.project.canvasHeight).toBe(180);
    expect(result.project.nodes).toHaveLength(1);
    expect(result.project.edges).toEqual([]);
    expect(result.stats).toEqual({ nodes: 0, edges: 0, measurementGroups: 0, staticNodes: 1 });

    const node = result.project.nodes[0];
    expect(node.kind).toBe("static-image");
    expect(node.position).toEqual({ x: 160, y: 90 });
    expect(node.size).toEqual({ width: 320, height: 180 });
    expect(node.params.backgroundImageFit).toBe("stretch");

    const decoded = decodeURIComponent(node.params.backgroundImage.split(",", 2)[1]);
    expect(decoded).not.toContain("<script");
    expect(decoded).not.toContain("foreignObject");
    expect(decoded).not.toContain("onclick");
    expect(decoded).not.toContain("javascript:");
  });

  test("rejects malformed XML and non-SVG roots", async () => {
    await expect(parse("<svg><g></svg>")).rejects.toThrow(/SVG|XML|解析/u);
    await expect(parse("<html></html>")).rejects.toThrow(/SVG/u);
  });

  test("uses width and height when viewBox is absent", async () => {
    const result = await parse('<svg xmlns="http://www.w3.org/2000/svg" width="640px" height="360px"><circle cx="20" cy="20" r="10"/></svg>');
    expect(result.project.canvasWidth).toBe(640);
    expect(result.project.canvasHeight).toBe(360);
  });
});
```

- [ ] **Step 3: Run the new test and verify the red state**

Run:

```powershell
npx vitest run src/svgModelImport.test.ts
```

Expected: FAIL because `./svgModelImport` does not exist.

- [ ] **Step 4: Implement the public parser boundary, DOM helpers, sanitization and generic fallback**

Create `src/svgModelImport.ts` with these public types and concrete defaults:

```ts
import {
  DEFAULT_MODEL_LAYER_ID,
  DEFAULT_MODEL_LAYER_NAME,
  DEVICE_LIBRARY,
  createNodeFromTemplate,
  type DeviceTemplate,
  type ModelNode,
  type ProjectFile
} from "./model";

export type SvgModelImportMode = "platform" | "generic";

export type SvgModelImportStats = {
  nodes: number;
  edges: number;
  measurementGroups: number;
  staticNodes: number;
};

export type SvgModelImportResult = {
  mode: SvgModelImportMode;
  project: ProjectFile;
  stats: SvgModelImportStats;
  warnings: string[];
};

export type SvgDomAdapter = {
  parse: (source: string) => Document;
  serialize: (node: Node) => string;
};

export type SvgModelImportOptions = {
  name: string;
  templates?: readonly DeviceTemplate[];
  dom?: SvgDomAdapter;
  batchSize?: number;
  yieldToMain?: () => Promise<void>;
};

const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_HEIGHT = 800;
const DANGEROUS_ELEMENT_NAMES = new Set(["script", "foreignobject", "iframe", "object", "embed"]);
const URL_ATTRIBUTE_NAMES = new Set(["href", "xlink:href", "src", "action", "formaction", "poster"]);

const browserDomAdapter = (): SvgDomAdapter => ({
  parse(source) {
    if (typeof DOMParser === "undefined") {
      throw new Error("当前环境不支持 SVG XML 解析。");
    }
    const document = new DOMParser().parseFromString(source, "image/svg+xml");
    if (document.getElementsByTagName("parsererror").length > 0) {
      throw new Error("SVG XML 解析失败。");
    }
    return document;
  },
  serialize(node) {
    if (typeof XMLSerializer === "undefined") {
      throw new Error("当前环境不支持 SVG XML 序列化。");
    }
    return new XMLSerializer().serializeToString(node);
  }
});

function childElements(node: Node): Element[] {
  const result: Element[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child?.nodeType === 1) result.push(child as Element);
  }
  return result;
}

function walkElements(root: Node): Element[] {
  const result: Element[] = [];
  const pending = [...childElements(root)];
  while (pending.length > 0) {
    const element = pending.shift()!;
    result.push(element);
    pending.unshift(...childElements(element));
  }
  return result;
}

function safeUrl(value: string) {
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f\s]+/g, "").toLowerCase();
  if (!normalized) return true;
  if (normalized.startsWith("#") || normalized.startsWith("/") || normalized.startsWith("./") || normalized.startsWith("../")) return true;
  if (normalized.startsWith("http:") || normalized.startsWith("https:")) return true;
  return normalized.startsWith("data:image/");
}

function sanitizeDocument(document: Document, warnings: string[]) {
  const root = document.documentElement;
  for (const element of [root, ...walkElements(root)]) {
    const name = String(element.localName || element.nodeName).toLowerCase();
    if (DANGEROUS_ELEMENT_NAMES.has(name)) {
      element.parentNode?.removeChild(element);
      continue;
    }
    for (let index = element.attributes.length - 1; index >= 0; index -= 1) {
      const attribute = element.attributes.item(index);
      if (!attribute) continue;
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value;
      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);
      } else if (URL_ATTRIBUTE_NAMES.has(attributeName) && !safeUrl(attributeValue)) {
        element.removeAttribute(attribute.name);
      } else if (attributeName === "style" && /javascript:|vbscript:|expression\s*\(|@import/iu.test(attributeValue)) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  warnings.push("已对导入 SVG 执行安全清理。");
  return document;
}

function svgViewport(root: Element, warnings: string[]) {
  const viewBox = String(root.getAttribute("viewBox") || "").trim().split(/[\s,]+/u).map(Number);
  if (viewBox.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0) {
    return { width: viewBox[2], height: viewBox[3] };
  }
  const length = (name: string) => Number.parseFloat(String(root.getAttribute(name) || ""));
  const width = length("width");
  const height = length("height");
  if (width > 0 && height > 0) return { width, height };
  warnings.push(`SVG 未提供有效画布尺寸，使用默认尺寸 ${DEFAULT_CANVAS_WIDTH} x ${DEFAULT_CANVAS_HEIGHT}。`);
  return { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT };
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function staticImageNode(template: DeviceTemplate, id: string, name: string, svg: string, width: number, height: number): ModelNode {
  const node = createNodeFromTemplate(template, { x: width / 2, y: height / 2 });
  return {
    ...node,
    id,
    name,
    size: { width, height },
    params: {
      ...node.params,
      backgroundImage: svgDataUrl(svg),
      backgroundImageAssetId: "",
      backgroundImageFit: "stretch",
      fillColor: "transparent",
      strokeColor: "transparent",
      lineWidth: "0",
      allowResizeTransform: "1"
    }
  };
}
```

Complete `parseSvgModel` so it validates the root, sanitizes before detection, delegates platform files to the Task 2 parser, and otherwise returns one `static-image` node using the sanitized serialized document.

- [ ] **Step 5: Run the generic tests and verify the green state**

Run:

```powershell
npx vitest run src/svgModelImport.test.ts
```

Expected: PASS for the generic fallback suite.

- [ ] **Step 6: Run GitNexus change detection and commit**

Run:

```powershell
node .gitnexus/run.cjs detect-changes --scope working -r graph_modeling_platform
git add package.json package-lock.json pnpm-lock.yaml src/svgModelImport.ts src/svgModelImport.test.ts
node .gitnexus/run.cjs detect-changes --scope staged -r graph_modeling_platform
git commit -m "feat: add sanitized generic SVG model import"
```

Expected: only the new parser/test and dependency files are reported; commit succeeds.

## Task 2: Restore Platform Canvas, Layers And Devices

**Files:**
- Modify: `src/svgModelImport.ts`
- Modify: `src/svgModelImport.test.ts`

- [ ] **Step 1: Add a failing platform fixture test**

Append a fixture that mirrors current export semantics:

```ts
const PLATFORM_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,900,600" active-layer-id="layer-operating">
  <defs id="svg_defs">
    <symbol id="symbol_ACBreaker_ac-breaker_state_0" viewBox="-40 -30 80 60">
      <g transform="rotate(90) scale(-1 1.5)"><path d="M -20 0 L 20 0"/></g>
    </symbol>
    <symbol id="symbol_ACBus_ac-bus_default" viewBox="-100 -10 200 20">
      <g transform="rotate(0) scale(1 1)"><path d="M -100 0 L 100 0"/></g>
    </symbol>
  </defs>
  <g id="root_g">
    <g class="export-layer-definitions" style="display:none">
      <g layer-id="layer-default" name="默认图层" visible="1" active="0"/>
      <g layer-id="layer-operating" name="运行层" visible="0" active="1"/>
    </g>
    <g id="Background_Layer">
      <rect width="100%" height="100%" fill="#f8fafc"/>
    </g>
    <g id="Segment_Layer"/>
    <g id="ACBreaker_Layer" device-type="ACBreaker">
      <use id="ACBreaker-7" layer-id="layer-operating" idx="7" name="开关-7"
        dev-id="ACBreaker-7" dev-kind="ac-breaker" node-1="101" node-2="102"
        voltage-type-1="ac" vbase-1="220" voltage-type-2="ac" vbase-2="220"
        href="#symbol_ACBreaker_ac-breaker_state_0" x="160" y="120" width="80" height="60"/>
    </g>
    <g id="ACBus_Layer" device-type="ACBus">
      <use id="ACNode-3" layer-id="layer-default" idx="3" name="母线-3"
        dev-id="ACNode-3" dev-kind="ac-bus" node="101" voltage-type="ac" vbase="220"
        href="#symbol_ACBus_ac-bus_default" x="300" y="240" width="200" height="20"/>
    </g>
    <g id="Text_Layer"/><g id="Measurement_Layer"/><g id="Other_Layer"/>
  </g>
</svg>`;

test("restores platform canvas, layers, device transforms, states and terminal metadata", async () => {
  const result = await parse(PLATFORM_SVG, "平台恢复");
  expect(result.mode).toBe("platform");
  expect(result.project).toMatchObject({
    name: "平台恢复",
    canvasWidth: 900,
    canvasHeight: 600,
    canvasBackgroundColor: "#f8fafc",
    activeLayerId: "layer-operating"
  });
  expect(result.project.layers).toEqual([
    { id: "layer-default", name: "默认图层", visible: true },
    { id: "layer-operating", name: "运行层", visible: false }
  ]);

  const breaker = result.project.nodes.find((node) => node.id === "ACBreaker-7")!;
  expect(breaker).toMatchObject({
    kind: "ac-breaker",
    name: "开关-7",
    layerId: "layer-operating",
    position: { x: 200, y: 150 },
    size: { width: 80, height: 60 },
    rotation: 90,
    scaleX: -1,
    scaleY: 1.5
  });
  expect(breaker.params).toMatchObject({ idx: "7", status: "0" });
  expect(breaker.terminals.map((terminal) => ({ id: terminal.id, nodeNumber: terminal.nodeNumber, type: terminal.type, vbase: terminal.vbase }))).toEqual([
    { id: "t1", nodeNumber: "101", type: "ac", vbase: "220" },
    { id: "t2", nodeNumber: "102", type: "ac", vbase: "220" }
  ]);
});
```

- [ ] **Step 2: Run the platform test and verify it fails**

Run:

```powershell
npx vitest run src/svgModelImport.test.ts -t "restores platform canvas"
```

Expected: FAIL because the file still takes the generic path.

- [ ] **Step 3: Implement platform detection and semantic device restoration**

Add concrete helpers to `src/svgModelImport.ts`:

```ts
function hasClass(element: Element, className: string) {
  return String(element.getAttribute("class") || "").split(/\s+/u).includes(className);
}

function findById(root: Element, id: string) {
  return [root, ...walkElements(root)].find((element) => element.getAttribute("id") === id);
}

function platformSvg(root: Element) {
  const all = [root, ...walkElements(root)];
  const hasRoot = all.some((element) => element.getAttribute("id") === "root_g");
  const semanticLayerIds = new Set(["Segment_Layer", "Text_Layer", "Measurement_Layer", "Other_Layer"]);
  const hasLayer = all.some((element) => semanticLayerIds.has(String(element.getAttribute("id") || "")));
  const hasMetadata = all.some((element) => ["dev-kind", "dev-id", "source-dev-id", "target-dev-id"].some((name) => element.hasAttribute(name)));
  return hasRoot && hasLayer && hasMetadata;
}

function uniqueModelId(raw: string, fallback: string, used: Set<string>, warnings: string[]) {
  const normalized = raw.trim().replace(/[^A-Za-z0-9_.:-]+/gu, "-").replace(/^[^A-Za-z_]+/u, "");
  const base = normalized || fallback;
  let candidate = base;
  let index = 2;
  while (used.has(candidate)) candidate = `${base}_${index++}`;
  used.add(candidate);
  if (candidate !== raw.trim()) warnings.push(`SVG 标识“${raw || fallback}”已规范化为“${candidate}”。`);
  return candidate;
}

function parseGeometryTransform(symbol: Element | undefined) {
  const transformed = symbol ? [symbol, ...walkElements(symbol)].find((element) => /\b(?:rotate|scale)\s*\(/u.test(String(element.getAttribute("transform") || ""))) : undefined;
  const transform = String(transformed?.getAttribute("transform") || "");
  const rotation = Number(/rotate\s*\(\s*([-+\d.eE]+)/u.exec(transform)?.[1] || 0);
  const scale = /scale\s*\(\s*([-+\d.eE]+)(?:[\s,]+([-+\d.eE]+))?/u.exec(transform);
  const scaleX = Number(scale?.[1] || 1);
  const scaleY = Number(scale?.[2] || scale?.[1] || 1);
  return {
    rotation: Number.isFinite(rotation) ? rotation : 0,
    scaleX: Number.isFinite(scaleX) && scaleX !== 0 ? scaleX : 1,
    scaleY: Number.isFinite(scaleY) && scaleY !== 0 ? scaleY : 1
  };
}

function stateFromHref(href: string) {
  const match = /_state_([^#]+)$/u.exec(href.replace(/^#/, ""));
  return match?.[1] && match[1] !== "default" ? match[1] : "";
}
```

Implement `parsePlatformSvg` to:

1. Read `export-layer-definitions`, normalize missing layer references to `layer-default`, and restore `active-layer-id`.
2. Read the background rect and background image class/pattern.
3. Build `templateByKind` from `options.templates`.
4. Process semantic `<use>` elements outside `<defs>` in batches.
5. Create known non-static devices with `createNodeFromTemplate`, then override ID, name, layer, center position, base size, rotation, scale, `idx`, `status`, terminal node numbers/types/voltage bases and topology fields.
6. Record original `dev-id` and element `id` aliases in `nodeIdBySvgId` for later edge/text/measurement resolution.
7. Add one summarized warning that restored devices use current template defaults for static parameters not present in SVG.

- [ ] **Step 4: Run all parser tests**

Run:

```powershell
npx vitest run src/svgModelImport.test.ts
```

Expected: generic and platform-device tests PASS.

- [ ] **Step 5: Detect changes and commit**

Run:

```powershell
node .gitnexus/run.cjs detect-changes --scope working -r graph_modeling_platform
git add src/svgModelImport.ts src/svgModelImport.test.ts
node .gitnexus/run.cjs detect-changes --scope staged -r graph_modeling_platform
git commit -m "feat: restore platform SVG devices and layers"
```

Expected: only parser symbols and tests are affected.

## Task 3: Restore Connections, Labels, Measurements And Static Fallbacks

**Files:**
- Modify: `src/svgModelImport.ts`
- Modify: `src/svgModelImport.test.ts`

- [ ] **Step 1: Add failing tests for edges, labels and measurements**

Extend `PLATFORM_SVG` with a second device and these semantic layers:

```xml
<g id="Segment_Layer">
  <path id="edge-1" source-dev-id="ACBreaker-7" target-dev-id="ACNode-3" d="M 240 150 L 350 150 L 350 240"/>
</g>
<g id="Text_Layer">
  <text id="label_ACBreaker-7" layer-id="layer-operating" dev-id="ACBreaker-7"
    x="230" y="205" text-anchor="start" fill="#dc2626" font-family="Microsoft YaHei"
    font-size="21" font-weight="700" font-style="italic" text-decoration="underline">主开关</text>
</g>
<g id="Measurement_Layer">
  <g class="mg" layer-id="layer-operating" transform="translate(265 125)" dev="ACBreaker-7" term="t1">
    <rect x="-48" y="-15" width="96" height="30" rx="4" fill="transparent" stroke="#64748b" stroke-width="2" stroke-dasharray="10 6"/>
    <text x="-41" y="0" dominant-baseline="middle" fill="#0f766e" font-family="Arial" font-size="18" font-weight="500" font-style="normal" text-decoration="none">
      <tspan>有功</tspan><tspan id="mv-ACBreaker-7-t1-activePower-0" class="mv" mt="activePower" mf="t1.r" dx="5">--</tspan><tspan dx="5">MW</tspan>
    </text>
  </g>
</g>
```

Assert exact reconstruction:

```ts
test("restores routed edges, label styles and terminal-owned measurements", async () => {
  const result = await parse(PLATFORM_SVG, "平台恢复");
  expect(result.project.edges).toHaveLength(1);
  expect(result.project.edges[0]).toMatchObject({
    id: "edge-1",
    sourceId: "ACBreaker-7",
    targetId: "ACNode-3",
    routePoints: [{ x: 240, y: 150 }, { x: 350, y: 150 }, { x: 350, y: 240 }]
  });

  const breaker = result.project.nodes.find((node) => node.id === "ACBreaker-7")!;
  expect(breaker.params).toMatchObject({
    _labelText: "主开关",
    _labelColor: "#dc2626",
    _labelFontFamily: "Microsoft YaHei",
    _labelFontWeight: "700",
    _labelFontStyle: "italic",
    _labelTextDecoration: "underline",
    _labelTextAnchor: "start"
  });

  expect(result.project.measurements?.groups).toHaveLength(1);
  expect(result.project.measurements?.groups[0]).toMatchObject({
    nodeId: "ACBreaker-7",
    terminalId: "t1",
    backgroundColor: "transparent",
    borderColor: "#64748b",
    borderStyle: "dashed",
    borderWidth: 2,
    items: [{
      id: "measurement-ACBreaker-7-t1-activePower-0",
      measurementTypeId: "activePower",
      sourcePoint: "ACBreaker-7.t1.r",
      labelOverride: "有功",
      unitOverride: "MW"
    }]
  });
});
```

- [ ] **Step 2: Add failing tests for static and unsupported-content fallbacks**

Add a platform SVG containing:

```xml
<symbol id="symbol_CustomThing_unknown-device_default" viewBox="-30 -20 60 40"><g><polygon points="0,-20 30,20 -30,20" fill="#f59e0b"/></g></symbol>
<g id="Unknown_Layer" device-type="Unknown">
  <use id="CustomThing-4" dev-id="CustomThing-4" dev-kind="unknown-device" layer-id="layer-default" href="#symbol_CustomThing_unknown-device_default" x="100" y="80" width="60" height="40"/>
</g>
<g id="Other_Layer"><path d="M 10 10 C 20 80 80 20 120 90" stroke="#7c3aed" fill="none"/></g>
```

Assert that the unknown device and unsupported extra content remain visible as `static-image` nodes, their SVG data contains the polygon/path, and warnings describe the fallback.

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

```powershell
npx vitest run src/svgModelImport.test.ts -t "restores routed|static and unsupported"
```

Expected: FAIL because edges, labels, measurements and fallbacks are not yet restored.

- [ ] **Step 4: Implement path parsing and terminal matching**

Add an absolute/relative `M/L/H/V/Z` parser. It must reject `A/C/Q/S/T` rather than inventing topology:

```ts
function parsePolylinePath(data: string) {
  const tokens = data.match(/[MLHVZmlhvz]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/giu) ?? [];
  const unsupported = data.replace(/[MLHVZmlhvz\d\s,.+-]/giu, "");
  if (unsupported.trim()) return null;
  const points: Array<{ x: number; y: number }> = [];
  let command = "";
  let x = 0;
  let y = 0;
  let index = 0;
  const number = () => Number(tokens[index++]);
  while (index < tokens.length) {
    if (/^[A-Za-z]$/u.test(tokens[index])) command = tokens[index++];
    if (!command || /[Zz]/u.test(command)) break;
    const relative = command === command.toLowerCase();
    if (/[MmLl]/u.test(command)) {
      const nextX = number();
      const nextY = number();
      if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return null;
      x = relative ? x + nextX : nextX;
      y = relative ? y + nextY : nextY;
      points.push({ x, y });
      if (/[Mm]/u.test(command)) command = relative ? "l" : "L";
    } else if (/[Hh]/u.test(command)) {
      const nextX = number();
      if (!Number.isFinite(nextX)) return null;
      x = relative ? x + nextX : nextX;
      points.push({ x, y });
    } else if (/[Vv]/u.test(command)) {
      const nextY = number();
      if (!Number.isFinite(nextY)) return null;
      y = relative ? y + nextY : nextY;
      points.push({ x, y });
    } else {
      return null;
    }
  }
  return points.filter((point, pointIndex) => pointIndex === 0 || point.x !== points[pointIndex - 1].x || point.y !== points[pointIndex - 1].y);
}
```

For each semantic path, map `source-dev-id` and `target-dev-id`, choose the nearest terminal using `getTerminalPoint`, preserve all parsed points in `routePoints`, set bus endpoint `sourcePoint`/`targetPoint`, warn on distant/tied matches, and use deterministic edge IDs.

- [ ] **Step 5: Implement device-label restoration**

Group `Text_Layer` text elements by mapped `dev-id`. Recover `_labelText`, relative `_labelX`/`_labelY`, base font size after reversing node scale, color, family, weight, style, decoration, anchor, visibility and vertical rotation. Convert unmatched text into `static-text` nodes so it remains editable and visible.

- [ ] **Step 6: Implement measurement restoration**

For each `g.mg`:

1. Resolve `dev` and optional `term`; skip with a warning when either target is invalid.
2. Parse group translation, subtract the device/terminal anchor point, and reverse node scale to recover `offset`.
3. Parse the background rect into `backgroundColor`, `borderColor`, `borderWidth` and `borderStyle`.
4. Parse each `text` row and its `tspan.mv`; rebuild stable item IDs as `measurement-${mvIdWithoutPrefix}`, `measurementTypeId`, role, source point, label, unit and per-item font style.
5. Infer `vertical`, `horizontal` or `grid` layout from row coordinates.
6. Preserve label/unit visibility and add the group to `project.measurements.groups`.

- [ ] **Step 7: Implement symbol and unsupported-content static fallbacks**

Serialize referenced symbol content into a standalone sanitized SVG with its own `viewBox` and shared non-symbol definitions. Restore exported static `<use>` elements and unknown `dev-kind` elements as positioned `static-image` nodes. Serialize unsupported edge paths and `Other_Layer` children into full-canvas static overlays rather than dropping them.

- [ ] **Step 8: Run parser tests and commit**

Run:

```powershell
npx vitest run src/svgModelImport.test.ts
node .gitnexus/run.cjs detect-changes --scope working -r graph_modeling_platform
git add src/svgModelImport.ts src/svgModelImport.test.ts
node .gitnexus/run.cjs detect-changes --scope staged -r graph_modeling_platform
git commit -m "feat: restore SVG topology labels and measurements"
```

Expected: all parser tests PASS; GitNexus reports only parser flows.

## Task 4: Integrate The Scheme Context Menu And Existing Conflict Flow

**Files:**
- Modify: `src/appExtracted/appCoreCanvasUtilities.tsx:1000`
- Modify: `src/appExtracted/appDeviceDefinitionFactories.tsx:2024-2359`
- Modify: `src/appDeviceDefinitionFactories.test.ts`
- Modify: `src/App.tsx:615-630,4551-4565`
- Modify: `src/appExtracted/appView.tsx:563-571,1588-1599`

- [ ] **Step 1: Run mandatory GitNexus impact analysis before existing-symbol edits**

Run:

```powershell
$env:GITNEXUS_MAX_FILE_SIZE='1024'
node .gitnexus/run.cjs impact "Type:src/appExtracted/appCoreCanvasUtilities.tsx:PendingModelImportConflict" -r graph_modeling_platform --direction upstream
node .gitnexus/run.cjs impact "Function:src/appExtracted/appDeviceDefinitionFactories.tsx:createResolveDuplicateModelImport" -r graph_modeling_platform --direction upstream
node .gitnexus/run.cjs impact "Function:src/App.tsx:App" -r graph_modeling_platform --direction upstream
node .gitnexus/run.cjs impact "Function:src/appExtracted/appView.tsx:renderAppView" -r graph_modeling_platform --direction upstream
```

Expected: report direct callers and affected flows before editing. If any result is HIGH or CRITICAL, explicitly warn the user before proceeding.

- [ ] **Step 2: Write failing factory tests**

Import the new factories in `src/appDeviceDefinitionFactories.test.ts` and add:

```ts
test("opens the SVG model picker for the right-clicked scheme", () => {
  const click = vi.fn();
  const target = { current: "" };
  const open = createOpenSvgModelImportFilePicker({
    requireEditMode: vi.fn(() => true),
    svgModelImportInputRef: { current: { value: "old", click } },
    modelImportTargetSchemeIdRef: target
  });
  open("scheme-2");
  expect(target.current).toBe("scheme-2");
  expect(click).toHaveBeenCalledOnce();
});

test("imports SVG into the target scheme and reports semantic statistics", async () => {
  const targetScheme = { id: "scheme-2", name: "目标方案", projects: [] };
  const commitImportedModelRecord = vi.fn();
  const completeImportedModelFeedback = vi.fn();
  const importedProject = { version: 1, name: "一次图", nodes: [], edges: [] };
  const parseSvgModel = vi.fn(async () => ({
    mode: "platform",
    project: importedProject,
    stats: { nodes: 5, edges: 6, measurementGroups: 2, staticNodes: 1 },
    warnings: ["参数使用模板默认值。"]
  }));
  const importFile = createImportSvgModelFile({
    activeSchemeRecord: null,
    selectedSchemeRecord: null,
    schemes: [targetScheme],
    libraryTemplates: [],
    modelImportTargetSchemeIdRef: { current: "scheme-2" },
    requireEditMode: vi.fn(() => true),
    findSavedSchemeById: (_schemes: unknown, id: string) => id === "scheme-2" ? targetScheme : null,
    createSavedScheme: vi.fn(),
    createSavedProject: (name: string, project: unknown) => ({ id: "project-new", name, project }),
    commitImportedModelRecord,
    completeImportedModelFeedback,
    setPendingModelImportConflict: vi.fn(),
    parseSvgModel
  });
  const input = { files: [{ name: "一次图.svg", text: async () => "<svg/>" }], value: "chosen" };
  await importFile({ currentTarget: input } as never);
  expect(parseSvgModel).toHaveBeenCalled();
  expect(commitImportedModelRecord).toHaveBeenCalledWith(targetScheme, expect.objectContaining({ name: "一次图" }));
  expect(completeImportedModelFeedback).toHaveBeenCalledWith(expect.objectContaining({ successMessage: expect.stringContaining("设备：5") }));
  expect(input.value).toBe("");
});
```

Add a duplicate-name case asserting that `setPendingModelImportConflict` receives `completionFeedback` and direct commit does not run. Add a completion helper test asserting all warnings are written to the operation log while the alert contains at most 20.

- [ ] **Step 3: Run the factory tests and verify the red state**

Run:

```powershell
npx vitest run src/appDeviceDefinitionFactories.test.ts -t "SVG model picker|imports SVG"
```

Expected: FAIL because the factories and feedback metadata do not exist.

- [ ] **Step 4: Extend conflict metadata without changing JSON-import behavior**

Update `PendingModelImportConflict`:

```ts
export type ModelImportCompletionFeedback = {
  successMessage: string;
  warnings: string[];
};

export type PendingModelImportConflict = {
  targetSchemeId: string;
  importedProject: ProjectFile;
  importedName: string;
  duplicateProjectId: string;
  duplicateProjectName: string;
  completionFeedback?: ModelImportCompletionFeedback;
} | null;
```

- [ ] **Step 5: Add SVG picker, feedback and file-import factories**

Add these exports to `src/appExtracted/appDeviceDefinitionFactories.tsx`:

```ts
export function createOpenSvgModelImportFilePicker(__appScope: Record<string, any>) {
  return (targetSchemeId = "") => {
    const { modelImportTargetSchemeIdRef, requireEditMode, svgModelImportInputRef } = __appScope;
    if (!requireEditMode("从 SVG 生成模型")) return;
    modelImportTargetSchemeIdRef.current = targetSchemeId;
    if (svgModelImportInputRef.current) {
      svgModelImportInputRef.current.value = "";
      svgModelImportInputRef.current.click();
    }
  };
}

export function createCompleteImportedModelFeedback(__appScope: Record<string, any>) {
  return (feedback?: { successMessage: string; warnings: string[] }) => {
    if (!feedback) return;
    const { writeOperationLog } = __appScope;
    for (const warning of feedback.warnings) writeOperationLog(`SVG 导入警告：${warning}`);
    window.alert(feedback.successMessage);
  };
}

export function createImportSvgModelFile(__appScope: Record<string, any>) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const {
      activeSchemeRecord, commitImportedModelRecord, completeImportedModelFeedback,
      createSavedProject, createSavedScheme, findSavedSchemeById, libraryTemplates,
      modelImportTargetSchemeIdRef, parseSvgModel, requireEditMode, schemes,
      selectedSchemeRecord, setPendingModelImportConflict, writeOperationLog
    } = __appScope;
    if (!requireEditMode("从 SVG 生成模型")) {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
      return;
    }
    const file = input.files?.[0];
    if (!file) return;
    try {
      writeOperationLog(`正在从 SVG 生成模型：${file.name}`);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      const importedName = file.name.replace(/\.svg$/iu, "").trim() || "SVG 导入模型";
      const result = await parseSvgModel(await file.text(), { name: importedName, templates: libraryTemplates });
      const targetScheme = findSavedSchemeById(schemes, modelImportTargetSchemeIdRef.current)
        ?? activeSchemeRecord ?? selectedSchemeRecord ?? schemes[0] ?? createSavedScheme("默认方案");
      const modeLabel = result.mode === "platform" ? "平台语义恢复" : "普通 SVG 静态图元";
      const warningLines = result.warnings.slice(0, 20).map((warning: string, index: number) => `${index + 1}. ${warning}`);
      const successMessage = [
        `从 SVG 生成模型成功：${importedName}`,
        `解析方式：${modeLabel}`,
        `设备：${result.stats.nodes}`,
        `连接线：${result.stats.edges}`,
        `量测组：${result.stats.measurementGroups}`,
        `静态图元：${result.stats.staticNodes}`,
        `警告：${result.warnings.length}`,
        ...(warningLines.length > 0 ? ["", ...warningLines] : [])
      ].join("\n");
      const completionFeedback = { successMessage, warnings: result.warnings };
      const duplicate = targetScheme.projects.find((project: any) => project.name.trim() === importedName);
      if (duplicate) {
        setPendingModelImportConflict({
          targetSchemeId: targetScheme.id,
          importedProject: result.project,
          importedName,
          duplicateProjectId: duplicate.id,
          duplicateProjectName: duplicate.name,
          completionFeedback
        });
        return;
      }
      commitImportedModelRecord(targetScheme, createSavedProject(importedName, result.project));
      completeImportedModelFeedback(completionFeedback);
    } catch (error) {
      window.alert(error instanceof Error ? `从 SVG 生成模型失败：${error.message}` : "从 SVG 生成模型失败。");
    } finally {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
    }
  };
}
```

Inject `parseSvgModel` through `__appScope` for factory testing. Update `createResolveDuplicateModelImport` so both rename and overwrite branches call `completeImportedModelFeedback(conflict.completionFeedback)` immediately after `commitImportedModelRecord`; JSON imports have no feedback and remain unchanged.

- [ ] **Step 6: Wire App refs and factories**

In `src/App.tsx`, import `parseSvgModel`, assign it to scope, create:

```ts
const svgModelImportInputRef = useRef<HTMLInputElement | null>(null);
Object.assign(__appScope, { svgModelImportInputRef, parseSvgModel });
```

Wire:

```ts
const openSvgModelImportFilePicker = createOpenSvgModelImportFilePicker(__appScope);
Object.assign(__appScope, { openSvgModelImportFilePicker });
const completeImportedModelFeedback = createCompleteImportedModelFeedback(__appScope);
Object.assign(__appScope, { completeImportedModelFeedback });
const importSvgModelFile = createImportSvgModelFile(__appScope);
Object.assign(__appScope, { importSvgModelFile });
```

- [ ] **Step 7: Add the hidden input and context-menu item**

In `src/appExtracted/appView.tsx`, add:

```tsx
<input
  ref={svgModelImportInputRef}
  type="file"
  accept=".svg,image/svg+xml"
  hidden
  onChange={importSvgModelFile}
/>
```

Beside “模型导入”, add:

```tsx
{isEditMode && (
  <button onClick={() => runContextMenuAction(() => openSvgModelImportFilePicker(projectMenu.schemeId ?? ""))}>
    <FileInput size={14}/>
    从 SVG 生成模型
  </button>
)}
```

- [ ] **Step 8: Run focused tests and commit**

Run:

```powershell
npx vitest run src/appDeviceDefinitionFactories.test.ts src/svgModelImport.test.ts
npm run build
node .gitnexus/run.cjs detect-changes --scope working -r graph_modeling_platform
git add src/appExtracted/appCoreCanvasUtilities.tsx src/appExtracted/appDeviceDefinitionFactories.tsx src/appDeviceDefinitionFactories.test.ts src/App.tsx src/appExtracted/appView.tsx
node .gitnexus/run.cjs detect-changes --scope staged -r graph_modeling_platform
git commit -m "feat: add scheme SVG model import command"
```

Expected: tests and build PASS; affected flow is limited to model-library import/context-menu behavior.

## Task 5: Add Round-Trip And Large-Import Regression Coverage

**Files:**
- Modify: `src/svgModelImport.test.ts`
- Test: `src/svgExport.test.tsx`
- Manual fixture: `C:\Users\wangbin\Desktop\速度.svg`

- [ ] **Step 1: Add an export/import semantic round-trip test**

Use `buildSvgDocument` to export a small project with two devices, one routed edge, labels and one measurement group. Parse it with `parseSvgModel` and assert canvas size, device kinds/count, terminal node numbers, edge count/route, label text and measurement type/source field. Re-export the parsed project and assert the semantic attributes `dev-kind`, `source-dev-id`, `target-dev-id`, `class="mg"`, `mt` and `mf` remain present.

- [ ] **Step 2: Add a 1000-device batching test**

Generate 1000 `<use dev-kind="ac-breaker">` entries and 999 paths. Inject a `yieldToMain` spy with `batchSize: 100`:

```ts
test("yields between batches while importing a large platform SVG", async () => {
  let yields = 0;
  const result = await parseSvgModel(buildLargePlatformSvg(1000), {
    name: "大型模型",
    templates: DEVICE_LIBRARY,
    dom,
    batchSize: 100,
    yieldToMain: async () => { yields += 1; }
  });
  expect(result.stats.nodes).toBe(1000);
  expect(result.stats.edges).toBe(999);
  expect(yields).toBeGreaterThanOrEqual(10);
});
```

- [ ] **Step 3: Run parser, export and factory regression suites**

Run:

```powershell
npx vitest run src/svgModelImport.test.ts src/svgExport.test.tsx src/appDeviceDefinitionFactories.test.ts
npm run build
```

Expected: all tests and TypeScript/Vite build PASS.

- [ ] **Step 4: Validate the real platform SVG from disk**

Add a temporary one-line Node/Vitest invocation or a local test helper that reads `C:\Users\wangbin\Desktop\速度.svg` without committing the absolute path. Verify:

```text
canvas: 1923 x 1242
devices: 5
connections: 6
three-winding transformer present
measurement groups > 0
```

Remove the temporary helper after validation.

- [ ] **Step 5: Detect changes and commit regression coverage**

Run:

```powershell
node .gitnexus/run.cjs detect-changes --scope working -r graph_modeling_platform
git add src/svgModelImport.test.ts
node .gitnexus/run.cjs detect-changes --scope staged -r graph_modeling_platform
git commit -m "test: cover SVG model import round trips"
```

Expected: only regression tests are staged.

## Task 6: Browser Verification And Final Review

**Files:**
- No planned source edits unless verification reveals a defect.

- [ ] **Step 1: Run the complete relevant verification set**

Run:

```powershell
npx vitest run src/svgModelImport.test.ts src/appDeviceDefinitionFactories.test.ts src/svgExport.test.tsx
npm run build
git status --short
```

Expected: all tests PASS, build succeeds, and only unrelated pre-existing untracked files remain.

- [ ] **Step 2: Start or restart WEB**

Run the project’s existing development launcher and keep both frontend and backend sessions alive. Confirm the frontend URL is `http://127.0.0.1:5173` or report the alternate port selected by Vite.

- [ ] **Step 3: Verify the end-to-end browser flow**

Using browser automation:

1. Open the model library.
2. Right-click a scheme and confirm “从 SVG 生成模型” is present.
3. Import `C:\Users\wangbin\Desktop\速度.svg`.
4. Confirm the model opens with 5 devices, 6 connections, labels and measurements.
5. Confirm the success alert reports platform semantic mode and counts.
6. Repeat with a small ordinary SVG and confirm exactly one `static-image` node.
7. Repeat with a duplicate filename and verify overwrite, rename and cancel.
8. Confirm no framework error overlay and no related console errors.

- [ ] **Step 4: Run mandatory final GitNexus change detection**

Run:

```powershell
node .gitnexus/run.cjs detect-changes --scope compare --base-ref main -r graph_modeling_platform
node .gitnexus/run.cjs detect-changes --scope working -r graph_modeling_platform
git log --oneline -6
```

Expected: the affected scope matches parser/import UI/test flows described in this plan, with no unrelated tracked changes.

- [ ] **Step 5: Report completion**

Report parser modes, restored counts for `速度.svg`, security behavior, focused/full verification results, commit IDs and the running WEB URL. Do not push unless the user explicitly asks for remote submission.
