import { Fragment, isValidElement, memo, type CSSProperties, type ReactNode } from "react";
import {
  CONVERTER_GLYPH_BORDER_INSET,
  CUSTOM_DEVICE_TEMPLATE_KEY,
  DEFAULT_COLOR_PALETTE,
  STATIC_DRAW_POINTS_PARAM,
  getDeviceGlyphVariant,
  getDeviceStrokeColor,
  getDeviceStrokeWidth,
  getNodeScaleX,
  getNodeScaleY,
  getSwitchVisualState,
  getTerminalDisplayColor,
  isBusNode,
  isRoutableLineDeviceKind,
  isStaticNode,
  parseStaticDrawPoints,
  pointsToOrthogonalPath,
  routableLineDeviceLocalPoints,
  terminalRenderLocalPoint,
  terminalStubSegment,
  terminalStubStrokeWidth,
  type ColorDisplayMode,
  type ColorPalette,
  type DeviceTemplate,
  type Edge,
  type ModelNode,
  type Point
} from "./model";

export function svgStrokeDashArray(style?: string) {
  if (style === "dashed") {
    return "10 6";
  }
  if (style === "dotted") {
    return "2 6";
  }
  return undefined;
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SVG_ATTRIBUTE_NAMES: Record<string, string> = {
  className: "class",
  dominantBaseline: "dominant-baseline",
  fillOpacity: "fill-opacity",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontStyle: "font-style",
  fontWeight: "font-weight",
  strokeDasharray: "stroke-dasharray",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeWidth: "stroke-width",
  textAnchor: "text-anchor",
  textDecoration: "text-decoration"
};

function styleObjectToSvgAttribute(style: Record<string, string | number>) {
  return Object.entries(style)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${String(value)}`)
    .join(";");
}

export function renderSvgElementMarkup(value: unknown): string {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return escapeXml(String(value));
  }
  if (Array.isArray(value)) {
    return value.map(renderSvgElementMarkup).join("");
  }
  if (!isValidElement(value)) {
    return "";
  }
  const props = value.props as Record<string, unknown>;
  if (value.type === Fragment) {
    return renderSvgElementMarkup(props.children);
  }
  if (typeof value.type !== "string") {
    return "";
  }
  const attrs = Object.entries(props)
    .filter(([key, attrValue]) => key !== "children" && key !== "key" && key !== "ref" && attrValue !== undefined && attrValue !== null && attrValue !== false)
    .map(([key, attrValue]) => {
      const attrName = SVG_ATTRIBUTE_NAMES[key] ?? key;
      const renderedValue =
        key === "style" && typeof attrValue === "object" && !Array.isArray(attrValue)
          ? styleObjectToSvgAttribute(attrValue as Record<string, string | number>)
          : attrValue === true
            ? "true"
            : String(attrValue);
      return ` ${attrName}="${escapeXml(renderedValue)}"`;
    })
    .join("");
  return `<${value.type}${attrs}>${renderSvgElementMarkup(props.children)}</${value.type}>`;
}

export type DeviceGlyphMode = "full" | "geometry" | "text";
export type DeviceGlyphProps = {
  node: ModelNode;
  miniature?: boolean;
  mode?: DeviceGlyphMode;
  colorDisplayMode?: ColorDisplayMode;
  colorPalette?: ColorPalette;
};

export function formatSvgNumber(value: number) {
  const rounded = Math.round(value * 100000) / 100000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

export function nodeGeometryTransform(node: ModelNode) {
  return `rotate(${formatSvgNumber(node.rotation)}) scale(${formatSvgNumber(getNodeScaleX(node))} ${formatSvgNumber(getNodeScaleY(node))})`;
}

export function nodeUprightScaleTransform(node: ModelNode) {
  return `scale(${formatSvgNumber(Math.abs(getNodeScaleX(node)) || 1)} ${formatSvgNumber(Math.abs(getNodeScaleY(node)) || 1)})`;
}


export function nodeCounterTransformMatrix(node: ModelNode, preserveScale = true) {
  const scaleX = getNodeScaleX(node) || 1;
  const scaleY = getNodeScaleY(node) || 1;
  const desiredScale = preserveScale ? Math.sqrt((Math.abs(scaleX) || 1) * (Math.abs(scaleY) || 1)) : 1;
  const desiredScaleX = desiredScale;
  const desiredScaleY = desiredScale;
  const radians = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const a = (cos * desiredScaleX) / scaleX;
  const b = (-sin * desiredScaleX) / scaleY;
  const c = (sin * desiredScaleY) / scaleX;
  const d = (cos * desiredScaleY) / scaleY;
  return `matrix(${formatSvgNumber(a)} ${formatSvgNumber(b)} ${formatSvgNumber(c)} ${formatSvgNumber(d)} 0 0)`;
}

function uprightText(
  node: ModelNode,
  x: number,
  y: number,
  props: Record<string, string | number | CSSProperties | undefined>,
  children: ReactNode
) {
  const { style, ...textProps } = props;
  return (
    <g transform={`translate(${formatSvgNumber(x)} ${formatSvgNumber(y)}) ${nodeCounterTransformMatrix(node)}`}>
      <text x="0" y="0" {...textProps} style={style as CSSProperties | undefined}>
        {children}
      </text>
    </g>
  );
}

function staticNumericParam(node: ModelNode, key: string, fallback: number, min = 0): number {
  const parsed = Number(node.params[key]);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, parsed);
}

function staticSymbolShadowStyle(node: ModelNode): CSSProperties | undefined {
  return node.params.shadowEnabled === "1"
    ? { filter: "drop-shadow(0 4px 8px rgba(15, 23, 42, 0.18))" }
    : undefined;
}

export function staticSymbolTextValue(node: ModelNode, fallback: string): string {
  return node.params.text ?? fallback;
}

function staticSymbolMiniatureTextValue(node: ModelNode, fallback: string): string {
  return node.params.text === undefined ? fallback : node.params.text.slice(0, 2);
}

function staticShapeText(node: ModelNode, width: number, height: number, miniature = false) {
  const fontSize = miniature ? 12 : staticNumericParam(node, "fontSize", 16, 8);
  const padding = Math.min(staticNumericParam(node, "padding", 12, 0), Math.max(0, Math.min(width, height) / 2 - 2));
  const align = node.params.textAlign || "center";
  const verticalAlign = node.params.verticalAlign || "middle";
  const textAnchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  const x = align === "left" ? -width / 2 + padding : align === "right" ? width / 2 - padding : 0;
  const y =
    verticalAlign === "top"
      ? -height / 2 + padding + fontSize / 2
      : verticalAlign === "bottom"
        ? height / 2 - padding - fontSize / 2
        : 0;
  const text = miniature ? staticSymbolMiniatureTextValue(node, "图元") : staticSymbolTextValue(node, node.name);
  const lines = text.split(/\r?\n/);
  return uprightText(
    node,
    x,
    y - ((lines.length - 1) * fontSize * 0.6),
    {
      fill: node.params.textColor || "#111827",
      fontSize,
      fontFamily: node.params.fontFamily || "Arial",
      fontWeight: node.params.fontWeight || "500",
      fontStyle: node.params.fontStyle || "normal",
      textDecoration: node.params.textDecoration || "none",
      textAnchor,
      dominantBaseline: "middle",
      style: { userSelect: "none", pointerEvents: "none" }
    },
    <>
      {lines.map((line, index) => (
        <tspan key={index} x="0" dy={index === 0 ? 0 : fontSize * 1.2}>
          {line || " "}
        </tspan>
      ))}
    </>
  );
}

function estimateSvgTextWidth(text: string, fontSize: number): number {
  return Array.from(text).reduce((total, char) => total + (/^[\u0000-\u00ff]$/.test(char) ? 0.56 : 1), 0) * fontSize;
}

function staticConnectorMarker(
  marker: string,
  x: number,
  y: number,
  directionX: number,
  directionY: number,
  size: number,
  color: string,
  lineWidth: number
): ReactNode {
  if (marker === "dot") {
    return <circle cx={x} cy={y} r={Math.max(size * 0.36, lineWidth * 1.4)} fill={color} stroke={color} />;
  }
  if (marker !== "arrow") {
    return null;
  }
  const length = Math.hypot(directionX, directionY) || 1;
  const ux = directionX / length;
  const uy = directionY / length;
  const px = -uy;
  const py = ux;
  const baseX = x - ux * size;
  const baseY = y - uy * size;
  const halfWidth = size * 0.42;
  const points = `${x},${y} ${baseX + px * halfWidth},${baseY + py * halfWidth} ${baseX - px * halfWidth},${baseY - py * halfWidth}`;
  return <polygon points={points} fill={color} stroke={color} strokeLinejoin="round" />;
}

function staticConnectorPath(
  node: ModelNode,
  points: Point[],
  stroke: string,
  lineWidth: number,
  dashArray: string | undefined
) {
  const markerStart = node.params.markerStart || "none";
  const markerEnd = node.params.markerEnd || "none";
  const arrowSize = staticNumericParam(node, "arrowSize", 10, 4);
  const pathData = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const first = points[0];
  const second = points[1] ?? first;
  const previous = points[points.length - 2] ?? first;
  const last = points[points.length - 1] ?? first;
  return (
    <g>
      <path d={pathData} fill="none" stroke={stroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" strokeLinejoin="round" />
      {staticConnectorMarker(markerStart, first.x, first.y, first.x - second.x, first.y - second.y, arrowSize, stroke, lineWidth)}
      {staticConnectorMarker(markerEnd, last.x, last.y, last.x - previous.x, last.y - previous.y, arrowSize, stroke, lineWidth)}
    </g>
  );
}

export function staticDrawPointsForNode(node: ModelNode, fallback: Point[]) {
  const customPoints = parseStaticDrawPoints(node.params[STATIC_DRAW_POINTS_PARAM]);
  return customPoints.length >= 2 ? customPoints : fallback;
}

function staticHandleDot(node: ModelNode, x: number, y: number, stroke = "#ffffff") {
  const size = staticNumericParam(node, "handleSize", 8, 3);
  const color = node.params.handleColor || node.params.accentColor || "#2563eb";
  return <circle cx={x} cy={y} r={size / 2} fill={color} stroke={stroke} strokeWidth="2" />;
}

function staticFrameHandles(node: ModelNode, width: number, height: number) {
  return (
    <>
      {[
        [-width / 2, -height / 2],
        [0, -height / 2],
        [width / 2, -height / 2],
        [width / 2, 0],
        [width / 2, height / 2],
        [0, height / 2],
        [-width / 2, height / 2],
        [-width / 2, 0]
      ].map(([x, y], index) => (
        <g key={index}>{staticHandleDot(node, x, y, node.params.accentColor || "#2563eb")}</g>
      ))}
    </>
  );
}

export function buildSvgTerminalMarkup(node: ModelNode, colorDisplayMode: ColorDisplayMode = "energy", colorPalette: ColorPalette = DEFAULT_COLOR_PALETTE) {
  if (isBusNode(node) || isStaticNode(node) || isRoutableLineDeviceKind(node.kind)) {
    return "";
  }
  const nodeScaleX = getNodeScaleX(node);
  const nodeScaleY = getNodeScaleY(node);
  const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
  const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
  const dashArray = svgStrokeDashArray(node.params.strokeStyle);
  const dashAttribute = dashArray ? ` stroke-dasharray="${escapeXml(dashArray)}"` : "";
  return node.terminals
    .map((terminal) => {
      const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size);
      const strokeWidth = terminalStubStrokeWidth(node, terminal);
      const terminalColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
      const label = `${terminal.label} / ${terminal.type.toUpperCase()}`;
      return `<g class="export-terminal ${terminal.type}" transform="translate(${formatSvgNumber(renderPoint.x)} ${formatSvgNumber(renderPoint.y)}) scale(${inverseScaleX} ${inverseScaleY})">
  <line class="export-terminal-stub ${terminal.type}" x1="${stub.from.x}" y1="${stub.from.y}" x2="${stub.to.x}" y2="${stub.to.y}" stroke="${terminalColor}" stroke-width="${formatSvgNumber(strokeWidth)}" stroke-linecap="round"${dashAttribute}/>
  <circle class="export-terminal-dot ${terminal.type}" cx="0" cy="0" r="6" fill="${terminalColor}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke"><title>${escapeXml(label)}</title></circle>
</g>`;
    })
    .join("\n");
}

const DEVICE_GLYPH_DESIGN_LONGEST_SIDE = 100;

function renderBusGlyphRect(width: number, height: number, color: string) {
  const thickness = Math.max(8, height / 3);
  return <rect className="bus-glyph" x={-width / 2} y={-thickness / 2} width={width} height={thickness} fill={color} stroke={color} strokeWidth="0" />;
}

export function DeviceGlyph({ node, miniature = false, mode = "full", colorDisplayMode = "energy", colorPalette = DEFAULT_COLOR_PALETTE }: DeviceGlyphProps) {
  const rawW = miniature ? 58 : node.size.width;
  const rawH = miniature ? 38 : node.size.height;
  const isStaticGlyph = isStaticNode(node);
  const glyphContentScale = miniature || isStaticGlyph
    ? 1
    : Math.max(1, Math.max(rawW, rawH) / DEVICE_GLYPH_DESIGN_LONGEST_SIDE);
  const w = rawW / glyphContentScale;
  const h = rawH / glyphContentScale;
  const glyphVariant = getDeviceGlyphVariant(node.kind);
  const renderGeometry = mode !== "text";
  const renderText = mode !== "geometry";
  const stroke = getDeviceStrokeColor(node, colorDisplayMode, colorPalette);
  const fill = glyphVariant.includes("converter")
    ? "#ecfeff"
    : glyphVariant === "ac-generator"
      ? "#eff6ff"
      : glyphVariant === "dc-generator"
        ? "#ecfdf5"
        : glyphVariant === "battery-storage"
          ? "#f0fdf4"
          : glyphVariant.startsWith("hydrogen")
            ? "#faf5ff"
            : glyphVariant.startsWith("heat")
              ? "#fff1f2"
              : glyphVariant === "switch" || glyphVariant === "disconnector"
                ? "#fff7ed"
                : glyphVariant === "ground-disconnector" || glyphVariant === "ground-disconnector-vertical"
                  ? "#fff7ed"
                  : glyphVariant === "terminal-transformer-load"
                    ? "#f8fafc"
                    : glyphVariant === "box-breaker"
                      ? "#f8fafc"
                      : glyphVariant === "breaker"
                      ? "#eef2ff"
                      : "#ffffff";

  const renderDeviceGlyphContent = (): ReactNode => {
    if (isRoutableLineDeviceKind(node.kind)) {
      if (mode === "text") {
        return null;
      }
      const routePoints = miniature
        ? [{ x: -w / 2 + 6, y: 0 }, { x: w / 2 - 6, y: 0 }]
        : routableLineDeviceLocalPoints(node);
      if (routePoints.length < 2) {
        return null;
      }
      const inverseGlyphScaleTransform = glyphContentScale === 1 || miniature
        ? undefined
        : `scale(${formatSvgNumber(1 / glyphContentScale)})`;
      return (
        <g
          className="routable-line-device-glyph"
          transform={inverseGlyphScaleTransform}
          fill="none"
          stroke={stroke}
          strokeWidth={getDeviceStrokeWidth(node)}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={pointsToOrthogonalPath(routePoints)} />
        </g>
      );
    }
    if (isStaticGlyph) {
    const staticStroke = node.params.strokeColor || stroke;
    const staticFill = node.params.fillColor || "transparent";
    const lineWidth = Number(node.params.lineWidth || 2);
    const dashArray = svgStrokeDashArray(node.params.strokeStyle);
    const cornerRadius = staticNumericParam(node, "cornerRadius", 8, 0);
    const accentColor = node.params.accentColor || staticStroke;
    const hasStaticText = Boolean(node.params.text?.trim());
    if (node.kind === "static-text") {
      if (!renderText) {
        return null;
      }
      const fontSize = miniature ? 18 : Number(node.params.fontSize || 24);
      const textLines = (miniature ? "文" : staticSymbolTextValue(node, node.name)).split(/\r?\n/);
      return uprightText(
        node,
        0,
        -((textLines.length - 1) * fontSize * 0.6),
        {
          fill: node.params.textColor || staticStroke,
          fontSize,
          fontFamily: node.params.fontFamily || "Arial",
          fontWeight: node.params.fontWeight || "400",
          fontStyle: node.params.fontStyle || "normal",
          textDecoration: node.params.textDecoration || "none",
          textAnchor: "middle",
          dominantBaseline: "middle",
          style: { userSelect: "none" }
        },
        <>
          {textLines.map((line, index) => (
            <tspan key={index} x="0" dy={index === 0 ? 0 : fontSize * 1.2}>
              {line || " "}
            </tspan>
          ))}
        </>
      );
    }
    if (node.kind === "static-line") {
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }]);
      return renderGeometry ? staticConnectorPath(node, points, staticStroke, lineWidth, dashArray) : null;
    }
    if (node.kind === "static-polyline") {
      const points = staticDrawPointsForNode(node, [
        { x: -w / 2, y: h / 3 },
        { x: 0, y: -h / 3 },
        { x: w / 2, y: h / 3 }
      ]);
      return renderGeometry ? staticConnectorPath(node, points, staticStroke, lineWidth, dashArray) : null;
    }
    if (node.kind === "static-circle") {
      return renderGeometry ? <circle cx="0" cy="0" r={Math.min(w, h) / 2} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} /> : null;
    }
    if (node.kind === "static-ellipse") {
      return renderGeometry ? <ellipse cx="0" cy="0" rx={w / 2} ry={h / 2} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} /> : null;
    }
    if (node.kind === "static-image") {
      if (mode === "text") {
        return !node.params.backgroundImage
          ? uprightText(
              node,
              0,
              0,
              {
                fill: node.params.textColor || "#64748b",
                fontSize: miniature ? 14 : Number(node.params.fontSize || 16),
                textAnchor: "middle",
                dominantBaseline: "middle"
              },
              "图片"
            )
          : null;
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && !node.params.backgroundImage && uprightText(node, 0, 0, { fill: node.params.textColor || "#64748b", fontSize: miniature ? 14 : Number(node.params.fontSize || 16), textAnchor: "middle", dominantBaseline: "middle" }, "图片")}
        </g>
      );
    }
    if (node.kind === "static-rounded-rect") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-diamond") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const points = `0,${-h / 2} ${w / 2},0 0,${h / 2} ${-w / 2},0`;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <polygon points={points} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {renderText && staticShapeText(node, w * 0.7, h * 0.7, miniature)}
        </g>
      );
    }
    if (node.kind === "static-pill") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-database") {
      if (mode === "text") {
        return staticShapeText(node, w, h * 0.72, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const capHeight = Math.max(14, h * 0.22);
      return (
        <g style={staticSymbolShadowStyle(node)} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round">
          <path d={`M ${-w / 2} ${-h / 2 + capHeight / 2} V ${h / 2 - capHeight / 2} C ${-w / 2} ${h / 2 + capHeight * 0.22}, ${w / 2} ${h / 2 + capHeight * 0.22}, ${w / 2} ${h / 2 - capHeight / 2} V ${-h / 2 + capHeight / 2}`} />
          <ellipse cx="0" cy={-h / 2 + capHeight / 2} rx={w / 2} ry={capHeight / 2} />
          <path d={`M ${-w / 2} ${-h / 2 + capHeight / 2} C ${-w / 2} ${-h / 2 + capHeight * 1.22}, ${w / 2} ${-h / 2 + capHeight * 1.22}, ${w / 2} ${-h / 2 + capHeight / 2}`} fill="none" stroke={accentColor} />
          {renderText && staticShapeText(node, w, h * 0.68, miniature)}
        </g>
      );
    }
    if (node.kind === "static-document") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const fold = Math.min(24, Math.min(w, h) * 0.22);
      return (
        <g style={staticSymbolShadowStyle(node)} strokeLinejoin="round">
          <path d={`M ${-w / 2} ${-h / 2} H ${w / 2 - fold} L ${w / 2} ${-h / 2 + fold} V ${h / 2} H ${-w / 2} Z`} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <path d={`M ${w / 2 - fold} ${-h / 2} V ${-h / 2 + fold} H ${w / 2}`} fill="none" stroke={accentColor} strokeWidth={lineWidth} />
          <path d={`M ${-w / 2 + 16} ${-h / 2 + 34} H ${w / 2 - 16} M ${-w / 2 + 16} ${-h / 2 + 50} H ${w / 2 - 16} M ${-w / 2 + 16} ${-h / 2 + 66} H ${w / 2 - 28}`} stroke={accentColor} strokeWidth={Math.max(1, lineWidth * 0.8)} strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-note") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const fold = Math.min(22, Math.min(w, h) * 0.24);
      return (
        <g style={staticSymbolShadowStyle(node)} strokeLinejoin="round">
          <path d={`M ${-w / 2} ${-h / 2} H ${w / 2} V ${h / 2 - fold} L ${w / 2 - fold} ${h / 2} H ${-w / 2} Z`} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <path d={`M ${w / 2} ${h / 2 - fold} H ${w / 2 - fold} V ${h / 2}`} fill="none" stroke={accentColor} strokeWidth={lineWidth} />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-group-box") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const fontSize = miniature ? 12 : staticNumericParam(node, "fontSize", 16, 8);
      const padding = Math.min(staticNumericParam(node, "padding", 12, 0), Math.max(0, Math.min(w, h) / 2 - 2));
      const title = (miniature ? staticSymbolMiniatureTextValue(node, "图元") : staticSymbolTextValue(node, node.name)).split(/\r?\n/)[0]?.trim() ?? "";
      const titleWidth = title ? estimateSvgTextWidth(title, fontSize) : 0;
      const ruleLeft = -w / 2 + padding + titleWidth + Math.max(12, fontSize * 0.6);
      const ruleRight = w / 2 - 12;
      const ruleY = -h / 2 + 24;
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray || "6 4"} />
          {ruleLeft < ruleRight - 8 && (
            <path className="static-group-box-header-rule" d={`M ${ruleLeft} ${ruleY} H ${ruleRight}`} stroke={accentColor} strokeWidth={Math.max(1, lineWidth)} strokeLinecap="round" />
          )}
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-swimlane") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const headerHeight = Math.max(28, Math.min(h * 0.32, 42));
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <rect x={-w / 2} y={-h / 2} width={w} height={headerHeight} rx={cornerRadius} fill={accentColor} stroke="none" />
          <path d={`M ${-w / 2} ${-h / 2 + headerHeight} H ${w / 2}`} stroke={staticStroke} strokeWidth={lineWidth} />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-point") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const radius = Math.max(4, Math.min(w, h) / 2 - lineWidth / 2);
      return (
        <g>
          <circle cx="0" cy="0" r={radius} fill={staticFill || accentColor} stroke={staticStroke} strokeWidth={lineWidth} />
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-ring") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const radius = Math.max(5, Math.min(w, h) / 2 - lineWidth / 2);
      return (
        <g>
          <circle cx="0" cy="0" r={radius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <circle cx="0" cy="0" r={Math.max(1.8, radius * 0.28)} fill={accentColor} stroke="none" />
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-circle-node") {
      if (mode === "text") {
        return staticShapeText(node, Math.min(w, h), Math.min(w, h), miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const radius = Math.max(8, Math.min(w, h) / 2 - lineWidth / 2);
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <circle cx="0" cy="0" r={radius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && staticShapeText(node, radius * 1.45, radius * 1.45, miniature)}
        </g>
      );
    }
    if (node.kind === "static-straight-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }]);
      return (
        <g>
          {staticConnectorPath(node, points, staticStroke, lineWidth, dashArray)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-arrow-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }]);
      return (
        <g>
          {staticConnectorPath(node, points, staticStroke, lineWidth, dashArray)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-double-arrow-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }]);
      return (
        <g>
          {staticConnectorPath(node, points, staticStroke, lineWidth, dashArray)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-elbow-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [
        { x: -w / 2, y: h / 3 },
        { x: -w / 6, y: h / 3 },
        { x: -w / 6, y: -h / 3 },
        { x: w / 2, y: -h / 3 }
      ]);
      return (
        <g>
          {staticConnectorPath(node, points, staticStroke, lineWidth, dashArray)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-hexagon") {
      if (mode === "text") {
        return staticShapeText(node, w * 0.78, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const inset = w * 0.18;
      const points = `${-w / 2 + inset},${-h / 2} ${w / 2 - inset},${-h / 2} ${w / 2},0 ${w / 2 - inset},${h / 2} ${-w / 2 + inset},${h / 2} ${-w / 2},0`;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <polygon points={points} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {renderText && staticShapeText(node, w * 0.78, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-parallelogram") {
      if (mode === "text") {
        return staticShapeText(node, w * 0.76, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const skew = w * 0.18;
      const points = `${-w / 2 + skew},${-h / 2} ${w / 2},${-h / 2} ${w / 2 - skew},${h / 2} ${-w / 2},${h / 2}`;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <polygon points={points} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {renderText && staticShapeText(node, w * 0.72, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-triangle") {
      if (mode === "text") {
        return staticShapeText(node, w * 0.66, h * 0.66, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const points = `0,${-h / 2} ${w / 2},${h / 2} ${-w / 2},${h / 2}`;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <polygon points={points} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {renderText && staticShapeText(node, w * 0.66, h * 0.58, miniature)}
        </g>
      );
    }
    if (node.kind === "static-callout") {
      if (mode === "text") {
        return staticShapeText(node, w, h * 0.82, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const tail = Math.min(24, h * 0.26);
      const bodyBottom = h / 2 - tail;
      const path = `M ${-w / 2 + cornerRadius} ${-h / 2} H ${w / 2 - cornerRadius} Q ${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + cornerRadius} V ${bodyBottom - cornerRadius} Q ${w / 2} ${bodyBottom} ${w / 2 - cornerRadius} ${bodyBottom} H ${w * 0.1} L ${-w * 0.08} ${h / 2} L ${-w * 0.08} ${bodyBottom} H ${-w / 2 + cornerRadius} Q ${-w / 2} ${bodyBottom} ${-w / 2} ${bodyBottom - cornerRadius} V ${-h / 2 + cornerRadius} Q ${-w / 2} ${-h / 2} ${-w / 2 + cornerRadius} ${-h / 2} Z`;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <path d={path} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          <path d={`M ${-w / 2 + 14} ${-h / 2 + 24} H ${w / 2 - 14}`} stroke={accentColor} strokeWidth={Math.max(1, lineWidth)} strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h * 0.82, miniature)}
        </g>
      );
    }
    if (node.kind === "static-default-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {staticHandleDot(node, -w / 2, 0)}
          {staticHandleDot(node, w / 2, 0)}
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-input-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <path d={`M ${-w / 2 + 14} ${-h / 2} H ${w / 2} V ${h / 2} H ${-w / 2 + 14} L ${-w / 2} 0 Z`} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {staticHandleDot(node, w / 2, 0)}
          {renderText && staticShapeText(node, w * 0.78, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-output-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <path d={`M ${-w / 2} ${-h / 2} H ${w / 2 - 14} L ${w / 2} 0 L ${w / 2 - 14} ${h / 2} H ${-w / 2} Z`} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {staticHandleDot(node, -w / 2, 0)}
          {renderText && staticShapeText(node, w * 0.78, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-port-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {staticHandleDot(node, -w / 2, 0)}
          {staticHandleDot(node, w / 2, 0)}
          {staticHandleDot(node, 0, -h / 2)}
          {staticHandleDot(node, 0, h / 2)}
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-card-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const headerHeight = Math.max(24, Math.min(36, h * 0.32));
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <rect x={-w / 2} y={-h / 2} width={w} height={headerHeight} rx={cornerRadius} fill={accentColor} opacity="0.14" stroke="none" />
          <path d={`M ${-w / 2 + 12} ${-h / 2 + headerHeight + 14} H ${w / 2 - 12} M ${-w / 2 + 12} ${-h / 2 + headerHeight + 30} H ${w / 2 - 32}`} stroke={accentColor} strokeWidth={Math.max(1, lineWidth * 0.75)} strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-toolbar-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h * 0.7, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const toolbarY = -h / 2 - 18;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <rect x={-52} y={toolbarY} width="104" height="24" rx="6" fill={accentColor} stroke={staticStroke} strokeWidth="1" opacity="0.92" />
          <circle cx="-28" cy={toolbarY + 12} r="4" fill="#ffffff" />
          <rect x="-4" y={toolbarY + 8} width="8" height="8" rx="2" fill="#ffffff" />
          <path d={`M 24 ${toolbarY + 16} L 32 ${toolbarY + 8} M 24 ${toolbarY + 8} L 32 ${toolbarY + 16}`} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h * 0.7, miniature)}
        </g>
      );
    }
    if (node.kind === "static-resizer-frame") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray || "6 4"} />
          {staticFrameHandles(node, w, h)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-subflow-box") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const headerHeight = Math.max(26, Math.min(38, h * 0.28));
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <rect x={-w / 2} y={-h / 2} width={w} height={headerHeight} rx={cornerRadius} fill={accentColor} stroke="none" />
          <path d={`M ${-w / 2} ${-h / 2 + headerHeight} H ${w / 2}`} stroke={staticStroke} strokeWidth={lineWidth} />
          <rect x={-w / 2 + 16} y={-h / 2 + headerHeight + 22} width={w * 0.34} height={h * 0.28} rx="6" fill="#ffffff" stroke={accentColor} strokeWidth="1.5" />
          <rect x={w / 2 - w * 0.34 - 16} y={h / 2 - h * 0.28 - 16} width={w * 0.34} height={h * 0.28} rx="6" fill="#ffffff" stroke={accentColor} strokeWidth="1.5" />
          <path d={`M ${-w * 0.08} ${-h * 0.02} H ${w * 0.08}`} stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-bezier-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: h / 4 }, { x: w / 2, y: -h / 4 }]);
      const start = points[0];
      const end = points[points.length - 1];
      const controlDx = Math.max(24, Math.abs(end.x - start.x) * 0.5);
      const direction = end.x >= start.x ? 1 : -1;
      return (
        <g>
          <path d={`M ${start.x} ${start.y} C ${start.x + controlDx * direction} ${start.y}, ${end.x - controlDx * direction} ${end.y}, ${end.x} ${end.y}`} fill="none" stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" />
          {staticConnectorMarker(node.params.markerStart || "none", start.x, start.y, -1, 0.4, staticNumericParam(node, "arrowSize", 10, 4), staticStroke, lineWidth)}
          {staticConnectorMarker(node.params.markerEnd || "none", end.x, end.y, 1, -0.4, staticNumericParam(node, "arrowSize", 10, 4), staticStroke, lineWidth)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-smoothstep-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: h / 4 }, { x: w / 2, y: -h / 2 }]);
      const start = points[0];
      const end = points[points.length - 1];
      const midX = (start.x + end.x) / 2;
      const path = points.length > 2
        ? points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
        : `M ${start.x} ${start.y} H ${midX} V ${end.y} H ${end.x}`;
      return (
        <g>
          <path d={path} fill="none" stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" strokeLinejoin="round" />
          {staticConnectorMarker(node.params.markerStart || "none", start.x, start.y, -1, 0, staticNumericParam(node, "arrowSize", 10, 4), staticStroke, lineWidth)}
          {staticConnectorMarker(node.params.markerEnd || "none", end.x, end.y, 1, 0, staticNumericParam(node, "arrowSize", 10, 4), staticStroke, lineWidth)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-self-loop") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const rx = w * 0.32;
      const ry = h * 0.32;
      const endX = w * 0.18;
      const endY = h * 0.2;
      return (
        <g>
          <path d={`M ${-endX} ${endY} C ${-w / 2} ${h / 2}, ${-w / 2} ${-h / 2}, 0 ${-h / 2} C ${w / 2} ${-h / 2}, ${w / 2} ${h / 2}, ${endX} ${endY}`} fill="none" stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" />
          <ellipse cx="0" cy="-3" rx={rx} ry={ry} fill="none" stroke={accentColor} strokeWidth="1" opacity="0.16" />
          {staticConnectorMarker(node.params.markerEnd || "arrow", endX, endY, 0.7, 0.7, staticNumericParam(node, "arrowSize", 10, 4), staticStroke, lineWidth)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-edge-label") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <path d={`M ${-w / 2 - 22} 0 H ${-w / 2} M ${w / 2} 0 H ${w / 2 + 22}`} stroke={accentColor} strokeWidth={Math.max(1, lineWidth)} strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-web") {
      if (mode === "text") {
        return uprightText(node, 0, 12, { fill: node.params.textColor || "#334155", fontSize: miniature ? 10 : 13, textAnchor: "middle" }, miniature ? "WEB" : staticSymbolTextValue(node, "https://"));
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <rect x={-w / 2} y={-h / 2} width={w} height="22" rx="4" fill="#e2e8f0" />
          {renderText && uprightText(node, 0, 12, { fill: node.params.textColor || "#334155", fontSize: miniature ? 10 : 13, textAnchor: "middle" }, miniature ? "WEB" : staticSymbolTextValue(node, "https://"))}
        </g>
      );
    }
    if (["static-date", "static-time", "static-datetime", "static-input"].includes(node.kind)) {
      if (mode === "text") {
        return uprightText(node, -w / 2 + 10, 0, { fill: node.params.textColor || "#111827", fontSize: miniature ? 11 : Number(node.params.fontSize || 16), dominantBaseline: "middle" }, miniature ? "控件" : staticSymbolTextValue(node, node.name));
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="5" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && uprightText(node, -w / 2 + 10, 0, { fill: node.params.textColor || "#111827", fontSize: miniature ? 11 : Number(node.params.fontSize || 16), dominantBaseline: "middle" }, miniature ? "控件" : staticSymbolTextValue(node, node.name))}
        </g>
      );
    }
    if (node.kind === "static-button") {
      if (mode === "text") {
        return uprightText(node, 0, 0, { fill: node.params.textColor || "#111827", fontSize: miniature ? 12 : Number(node.params.fontSize || 16), textAnchor: "middle", dominantBaseline: "middle" }, miniature ? "按钮" : staticSymbolTextValue(node, node.name));
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="6" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && uprightText(node, 0, 0, { fill: node.params.textColor || "#111827", fontSize: miniature ? 12 : Number(node.params.fontSize || 16), textAnchor: "middle", dominantBaseline: "middle" }, miniature ? "按钮" : staticSymbolTextValue(node, node.name))}
        </g>
      );
    }
    return renderGeometry ? <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} /> : null;
  }

  if (glyphVariant === "ac-generator" || glyphVariant === "dc-generator") {
    const radius = miniature ? 15 : Math.min(w, h) * 0.37;
    const markerTextSize = miniature ? 7 : 10;
    const symbolY = miniature ? 2 : 1;
    const markerText = glyphVariant === "ac-generator" ? "AC" : "DC";
    if (mode === "text") {
      return uprightText(node, radius + 9, -radius * 0.42, { fill: stroke, stroke: "none", fontSize: markerTextSize, fontWeight: "800", textAnchor: "middle" }, markerText);
    }
    if (!renderGeometry) {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r={radius} fill={fill} />
        {glyphVariant === "ac-generator" ? (
          <>
            <path d={`M ${-radius * 0.58} ${symbolY} C ${-radius * 0.35} ${symbolY - radius * 0.42}, ${-radius * 0.12} ${symbolY - radius * 0.42}, 0 ${symbolY} C ${radius * 0.14} ${symbolY + radius * 0.42}, ${radius * 0.38} ${symbolY + radius * 0.42}, ${radius * 0.6} ${symbolY}`} />
            {renderText && uprightText(node, radius + 9, -radius * 0.42, { fill: stroke, stroke: "none", fontSize: markerTextSize, fontWeight: "800", textAnchor: "middle" }, "AC")}
          </>
        ) : (
          <>
            <path d={`M ${-radius * 0.58} ${symbolY - radius * 0.18} H ${radius * 0.58} M ${-radius * 0.42} ${symbolY + radius * 0.28} H ${radius * 0.42} M ${radius * 0.24} ${symbolY + radius * 0.12} V ${symbolY + radius * 0.44}`} />
            {renderText && uprightText(node, radius + 9, -radius * 0.42, { fill: stroke, stroke: "none", fontSize: markerTextSize, fontWeight: "800", textAnchor: "middle" }, "DC")}
          </>
        )}
        <path d={`M ${radius * 0.58} ${-radius * 0.76} L ${radius * 0.96} ${-radius * 0.76} L ${radius * 0.72} ${-radius * 0.28} L ${radius * 1.08} ${-radius * 0.28}`} />
      </g>
    );
  }

  if (glyphVariant === "battery-storage") {
    if (mode === "text") {
      return null;
    }
    const bodyWidth = miniature ? 34 : Math.min(w * 0.68, 56);
    const bodyHeight = miniature ? 20 : Math.min(h * 0.58, 32);
    const capWidth = miniature ? 4 : 6;
    const capHeight = bodyHeight * 0.44;
    const cellGap = bodyWidth / 6;
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-bodyWidth / 2} y={-bodyHeight / 2} width={bodyWidth} height={bodyHeight} rx="4" fill={fill} />
        <rect x={bodyWidth / 2} y={-capHeight / 2} width={capWidth} height={capHeight} rx="1.5" fill={fill} />
        <path d={`M ${-bodyWidth / 2 + cellGap * 2} ${-bodyHeight / 2 + 5} V ${bodyHeight / 2 - 5}`} />
        <path d={`M ${-bodyWidth / 2 + cellGap * 4} ${-bodyHeight / 2 + 5} V ${bodyHeight / 2 - 5}`} />
        <path d={`M ${-bodyWidth / 2 + 7} 0 H ${-bodyWidth / 2 + 15} M ${bodyWidth / 2 - 15} 0 H ${bodyWidth / 2 - 7} M ${bodyWidth / 2 - 11} -4 V 4`} />
      </g>
    );
  }

  if (glyphVariant === "hydrogen-source") {
    const radius = miniature ? 15 : Math.min(w, h) * 0.35;
    if (mode === "text") {
      return uprightText(node, 0, 1, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r={radius} fill={fill} />
        {renderText && uprightText(node, 0, 1, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2")}
        <path d={`M ${radius * 0.8} ${-radius * 0.65} H ${radius * 1.22} M ${radius * 1.02} ${-radius * 0.85} L ${radius * 1.22} ${-radius * 0.65} L ${radius * 1.02} ${-radius * 0.45}`} />
      </g>
    );
  }

  if (glyphVariant === "hydrogen-load") {
    if (mode === "text") {
      return uprightText(node, 0, -4, { fill: stroke, stroke: "none", fontSize: miniature ? 8 : 12, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${-w / 3} ${-h / 3} L ${w / 3} ${-h / 3} L 0 ${h / 3} Z`} fill={fill} />
        {renderText && uprightText(node, 0, -4, { fill: stroke, stroke: "none", fontSize: miniature ? 8 : 12, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2")}
      </g>
    );
  }

  if (
    glyphVariant === "hydrogen-electrolyzer" ||
    glyphVariant === "ac-hydrogen-electrolyzer" ||
    glyphVariant === "dc-hydrogen-electrolyzer"
  ) {
    if (mode === "text") {
      return uprightText(node, 11, 1, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    const electrolyzerClass =
      glyphVariant === "ac-hydrogen-electrolyzer"
        ? "ac-electrolyzer-glyph"
        : glyphVariant === "dc-hydrogen-electrolyzer"
          ? "dc-electrolyzer-glyph"
          : "hydrogen-electrolyzer-glyph";
    return (
      <g className={electrolyzerClass} fill="none" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-w / 2 + 6} y={-h / 2 + 5} width={w - 12} height={h - 10} rx="6" fill={fill} />
        <path d="M -24 0 H -12 M 12 0 H 24" />
        {glyphVariant === "ac-hydrogen-electrolyzer" && (
          <path className="ac-wave-marker" d="M -29 -13 C -25 -19 -20 -19 -16 -13 S -7 -7 -3 -13" />
        )}
        {glyphVariant === "dc-hydrogen-electrolyzer" && (
          <g className="dc-battery-marker">
            <rect x="-32" y="-18" width="20" height="12" rx="2" />
            <path d="M -10 -14 H -7" />
            <path d="M -28 -12 H -24 M -26 -14 V -10 M -20 -12 H -15" />
          </g>
        )}
        <path d="M -7 -12 L -1 -2 H -7 L -1 12" />
        {renderText && uprightText(node, 11, 1, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2")}
      </g>
    );
  }

  if (
    glyphVariant === "hydrogen-fuel-cell" ||
    glyphVariant === "ac-hydrogen-fuel-cell" ||
    glyphVariant === "dc-hydrogen-fuel-cell"
  ) {
    if (mode === "text") {
      return uprightText(node, -20, -12, { fill: stroke, stroke: "none", fontSize: miniature ? 7 : 10, fontWeight: "800", textAnchor: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    const fuelCellClass =
      glyphVariant === "ac-hydrogen-fuel-cell"
        ? "ac-fuel-cell-glyph"
        : glyphVariant === "dc-hydrogen-fuel-cell"
          ? "dc-fuel-cell-glyph"
          : "hydrogen-fuel-cell-glyph";
    return (
      <g className={fuelCellClass} fill="none" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-w / 2 + 7} y={-h / 2 + 6} width={w - 14} height={h - 12} rx="6" fill={fill} />
        <path d="M -24 0 H -12 M 12 0 H 24" />
        {glyphVariant === "ac-hydrogen-fuel-cell" && (
          <path className="fuel-cell-ac-wave-marker" d="M -35 -13 C -31 -19 -26 -19 -22 -13 S -13 -7 -9 -13" />
        )}
        {glyphVariant === "dc-hydrogen-fuel-cell" && (
          <g className="fuel-cell-dc-battery-marker">
            <rect x="-36" y="-18" width="20" height="12" rx="2" />
            <path d="M -14 -14 H -11" />
            <path d="M -32 -12 H -28 M -30 -14 V -10 M -24 -12 H -19" />
          </g>
        )}
        <path d="M -10 -10 H 8 M -10 0 H 8 M -10 10 H 8" />
        <path d="M 13 -8 L 20 0 L 13 8" />
        {renderText && uprightText(node, -20, -12, { fill: stroke, stroke: "none", fontSize: miniature ? 7 : 10, fontWeight: "800", textAnchor: "middle" }, "H2")}
      </g>
    );
  }

  if (glyphVariant === "hydrogen-storage") {
    if (mode === "text") {
      return uprightText(node, 0, 4, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${-w / 2 + 10} ${-h / 4} C ${-w / 3} ${-h / 2}, ${w / 3} ${-h / 2}, ${w / 2 - 10} ${-h / 4} V ${h / 4} C ${w / 3} ${h / 2}, ${-w / 3} ${h / 2}, ${-w / 2 + 10} ${h / 4} Z`} fill={fill} />
        <path d={`M ${-w / 2 + 10} ${-h / 4} C ${-w / 3} 0, ${w / 3} 0, ${w / 2 - 10} ${-h / 4}`} />
        {renderText && uprightText(node, 0, 4, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2")}
      </g>
    );
  }

  if (glyphVariant === "hydrogen-storage-horizontal") {
    if (mode === "text") {
      return uprightText(node, 0, 4, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    const radius = Math.min(h / 2, w / 4);
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={radius} fill={fill} />
        <path d={`M ${-w / 2 + radius} ${-h / 2} C ${-w / 2 + radius * 0.35} ${-h / 2} ${-w / 2} ${-h / 4} ${-w / 2} 0 C ${-w / 2} ${h / 4} ${-w / 2 + radius * 0.35} ${h / 2} ${-w / 2 + radius} ${h / 2}`} />
        <path d={`M ${w / 2 - radius} ${-h / 2} C ${w / 2 - radius * 0.35} ${-h / 2} ${w / 2} ${-h / 4} ${w / 2} 0 C ${w / 2} ${h / 4} ${w / 2 - radius * 0.35} ${h / 2} ${w / 2 - radius} ${h / 2}`} />
        <path d={`M ${-w / 2 + radius + 8} ${-h / 4} H ${w / 2 - radius - 8} M ${-w / 2 + radius + 8} ${h / 4} H ${w / 2 - radius - 8}`} opacity="0.7" />
        {renderText && uprightText(node, 0, 4, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2")}
      </g>
    );
  }

  if (glyphVariant === "hydrogen-storage-container") {
    if (mode === "text") {
      return uprightText(node, 0, 4, { fill: stroke, stroke: "none", fontSize: miniature ? 8 : 12, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    const innerLeft = -w / 2 + 9;
    const innerRight = w / 2 - 9;
    const tankTop = -h / 2 + 14;
    const tankGap = miniature ? 8 : 10;
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="2" fill={fill} />
        <path d={`M ${-w / 2 + 8} ${-h / 2} V ${h / 2} M ${w / 2 - 8} ${-h / 2} V ${h / 2}`} />
        <path d={`M ${innerLeft} ${tankTop} H ${innerRight} M ${innerLeft} ${tankTop + tankGap} H ${innerRight} M ${innerLeft} ${tankTop + tankGap * 2} H ${innerRight}`} />
        <path d={`M ${-w / 2 + 18} ${-h / 2 + 8} V ${h / 2 - 8} M ${w / 2 - 18} ${-h / 2 + 8} V ${h / 2 - 8}`} opacity="0.65" />
        {renderText && uprightText(node, 0, h / 2 - (miniature ? 9 : 12), { fill: stroke, stroke: "none", fontSize: miniature ? 7 : 10, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2")}
      </g>
    );
  }

  if (glyphVariant === "hydrogen-bus") {
    if (mode === "text") {
      return null;
    }
    return renderBusGlyphRect(w, h, stroke);
  }

  if (glyphVariant === "hydrogen-pipeline") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="-5" x2={w / 2 - 8} y2="-5" />
        <line x1={-w / 2 + 8} y1="5" x2={w / 2 - 8} y2="5" />
        <path d="M -20 -10 V 10 M 0 -10 V 10 M 20 -10 V 10" strokeWidth="1.6" />
      </g>
    );
  }

  if (glyphVariant === "hydrogen-compressor") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r={miniature ? 15 : 20} fill={fill} />
        <path d="M -24 0 H -9 M 10 0 H 24" />
        <path d="M -5 -10 L 10 0 L -5 10 Z" fill={fill} />
      </g>
    );
  }

  if (glyphVariant === "hydrogen-regulator" || glyphVariant === "hydrogen-valve") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -28 0 H -12 M 12 0 H 28" />
        <path d="M -12 -12 L 0 0 L -12 12 Z M 12 -12 L 0 0 L 12 12 Z" fill={fill} />
        {glyphVariant === "hydrogen-regulator" ? <path d="M 0 -20 V -8 M -6 -14 H 6 M -5 10 H 5" /> : <path d="M 0 -18 V -3 M -8 -18 H 8" />}
      </g>
    );
  }

  if (
    glyphVariant === "heat-boiler" ||
    glyphVariant === "single-heat-boiler" ||
    glyphVariant === "two-port-heat-boiler" ||
    glyphVariant === "heat-source" ||
    glyphVariant === "single-heat-source" ||
    glyphVariant === "two-port-heat-source"
  ) {
    if (mode === "text") {
      return null;
    }
    const isSourceGlyph = glyphVariant === "heat-source" || glyphVariant === "single-heat-source" || glyphVariant === "two-port-heat-source";
    const isTwoPortGlyph = glyphVariant === "two-port-heat-boiler" || glyphVariant === "two-port-heat-source";
    const heatGlyphClass =
      glyphVariant === "two-port-heat-boiler"
        ? "two-port-heat-boiler-glyph"
        : glyphVariant === "two-port-heat-source"
          ? "two-port-heat-source-glyph"
          : isSourceGlyph
            ? "single-heat-source-glyph"
            : "single-heat-boiler-glyph";
    const bodyWidth = miniature ? 34 : Math.min(w * 0.66, 58);
    const bodyHeight = miniature ? 26 : Math.min(h * 0.66, 40);
    const sourceRadius = miniature ? 15 : Math.min(w, h) * 0.27;
    return (
      <g className={heatGlyphClass} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {isSourceGlyph ? (
          <circle cx="0" cy="2" r={sourceRadius} fill={fill} />
        ) : (
          <rect x={-bodyWidth / 2} y={-bodyHeight / 2 + 5} width={bodyWidth} height={bodyHeight} rx="6" fill={fill} />
        )}
        <path d="M -8 2 C -16 -8 -2 -13 -6 -24 C 4 -17 13 -10 6 2 C 3 8 -4 8 -8 2 Z" fill={fill} />
        {isSourceGlyph ? <path d="M -11 16 H 11" /> : <path d="M -18 18 H 18" />}
        {isTwoPortGlyph ? (
          <>
            <path className="two-port-heat-flow-marker" d="M -30 -12 H -18 M -25 -16 L -31 -12 L -25 -8" />
            <path className="two-port-heat-return-marker" d="M 18 12 H 30 M 25 8 L 19 12 L 25 16" />
          </>
        ) : (
          <path d="M 20 -8 H 30 M 26 -12 L 31 -8 L 26 -4" />
        )}
      </g>
    );
  }

  if (
    glyphVariant === "heat-electric-heater" ||
    glyphVariant === "ac-heat-electric-heater" ||
    glyphVariant === "ac-two-port-heat-electric-heater" ||
    glyphVariant === "dc-heat-electric-heater" ||
    glyphVariant === "dc-two-port-heat-electric-heater"
  ) {
    if (mode === "text") {
      return null;
    }
    const isAcHeater = glyphVariant === "ac-heat-electric-heater" || glyphVariant === "ac-two-port-heat-electric-heater";
    const isDcHeater = glyphVariant === "dc-heat-electric-heater" || glyphVariant === "dc-two-port-heat-electric-heater";
    const isTwoPortHeater = glyphVariant === "ac-two-port-heat-electric-heater" || glyphVariant === "dc-two-port-heat-electric-heater";
    const heaterClass =
      glyphVariant === "ac-heat-electric-heater"
        ? "ac-heat-electric-heater-glyph"
        : glyphVariant === "ac-two-port-heat-electric-heater"
          ? "ac-two-port-heat-electric-heater-glyph"
          : glyphVariant === "dc-heat-electric-heater"
            ? "dc-heat-electric-heater-glyph"
            : glyphVariant === "dc-two-port-heat-electric-heater"
              ? "dc-two-port-heat-electric-heater-glyph"
              : "heat-electric-heater-glyph";
    const heaterPortY = miniature ? 13 : h * 0.25;
    return (
      <g className={heaterClass} fill="none" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-w / 2 + 7} y={-h / 2 + 6} width={w - 14} height={h - 12} rx="6" fill={fill} />
        <path d="M -28 0 H -16 M 16 0 H 28" />
        {isAcHeater && <path className="heater-ac-wave-marker" d="M -36 -14 C -32 -20 -27 -20 -23 -14 S -14 -8 -10 -14" />}
        {isDcHeater && (
          <g className="heater-dc-battery-marker">
            <rect x="-37" y="-19" width="20" height="12" rx="2" />
            <path d="M -15 -15 H -12" />
            <path d="M -33 -13 H -29 M -31 -15 V -11 M -25 -13 H -20" />
          </g>
        )}
        <path d="M -8 -13 L -1 -2 H -8 L -1 13" />
        <path d="M 9 -12 C 15 -7 15 -2 9 3 C 15 8 15 13 9 18" />
        {isTwoPortHeater ? (
          <g className="heater-two-port-heat-marker">
            <path className="heater-two-port-supply-marker" d={`M 23 ${-heaterPortY} H 34 M 29 ${-heaterPortY - 4} L 35 ${-heaterPortY} L 29 ${-heaterPortY + 4}`} />
            <path className="heater-two-port-return-marker" d={`M 23 ${heaterPortY} H 34 M 29 ${heaterPortY - 4} L 23 ${heaterPortY} L 29 ${heaterPortY + 4}`} />
          </g>
        ) : (
          <path d="M 25 -11 H 34 M 30 -15 L 35 -11 L 30 -7" />
        )}
      </g>
    );
  }

  if (glyphVariant === "heat-exchanger-two" || glyphVariant === "heat-exchanger-three" || glyphVariant === "heat-exchanger-four") {
    const exchangerKind = glyphVariant === "heat-exchanger-two" ? "two" : glyphVariant === "heat-exchanger-three" ? "three" : "four";
    const tag = exchangerKind === "two" ? "2" : exchangerKind === "three" ? "3" : "4";
    if (mode === "text") {
      return uprightText(node, 0, miniature ? 15 : 23, { fill: stroke, stroke: "none", fontSize: miniature ? 7 : 10, fontWeight: "800", textAnchor: "middle" }, `${tag}P`);
    }
    if (!renderGeometry) {
      return null;
    }
    const coilRadius = miniature ? 10 : 16;
    const branchY = miniature ? 11 : h * 0.25;
    return (
      <g className={`heat-exchanger-${exchangerKind}-glyph`} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="-13" cy="0" r={coilRadius} fill={fill} />
        <circle cx="13" cy="0" r={coilRadius} fill={fill} />
        {exchangerKind === "two" && <path d="M -28 0 H -23 M 23 0 H 28" />}
        {exchangerKind === "three" && (
          <>
            <path d="M -30 0 H -23" />
            <path className="three-port-heat-exchanger-branch" d={`M 23 0 H 30 V ${-branchY} H 36 M 30 0 V ${branchY} H 36`} />
            <path className="three-port-heat-exchanger-supply-arrow" d={`M 31 ${-branchY} H 38 M 32 ${-branchY - 4} L 38 ${-branchY} L 32 ${-branchY + 4}`} />
            <path className="three-port-heat-exchanger-return-arrow" d={`M 31 ${branchY} H 38 M 34 ${branchY - 4} L 28 ${branchY} L 34 ${branchY + 4}`} />
          </>
        )}
        {exchangerKind === "four" && (
          <>
            <path className="four-port-heat-exchanger-left-branch" d={`M -23 0 H -30 V ${-branchY} H -36 M -30 0 V ${branchY} H -36`} />
            <path className="four-port-heat-exchanger-right-branch" d={`M 23 0 H 30 V ${-branchY} H 36 M 30 0 V ${branchY} H 36`} />
            <path className="four-port-heat-exchanger-left-supply-arrow" d={`M -38 ${-branchY} H -31 M -37 ${-branchY - 4} L -31 ${-branchY} L -37 ${-branchY + 4}`} />
            <path className="four-port-heat-exchanger-left-return-arrow" d={`M -31 ${branchY} H -38 M -32 ${branchY - 4} L -38 ${branchY} L -32 ${branchY + 4}`} />
            <path className="four-port-heat-exchanger-right-supply-arrow" d={`M 31 ${-branchY} H 38 M 32 ${-branchY - 4} L 38 ${-branchY} L 32 ${-branchY + 4}`} />
            <path className="four-port-heat-exchanger-right-return-arrow" d={`M 31 ${branchY} H 38 M 34 ${branchY - 4} L 28 ${branchY} L 34 ${branchY + 4}`} />
          </>
        )}
        <path d="M -15 -9 C -6 -3 -22 3 -13 9 M 15 -9 C 6 -3 22 3 13 9" />
        {renderText && uprightText(node, 0, miniature ? 15 : 23, { fill: stroke, stroke: "none", fontSize: miniature ? 7 : 10, fontWeight: "800", textAnchor: "middle" }, `${tag}P`)}
      </g>
    );
  }

  if (glyphVariant === "heat-storage") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${-w / 2 + 10} ${-h / 4} C ${-w / 3} ${-h / 2}, ${w / 3} ${-h / 2}, ${w / 2 - 10} ${-h / 4} V ${h / 4} C ${w / 3} ${h / 2}, ${-w / 3} ${h / 2}, ${-w / 2 + 10} ${h / 4} Z`} fill={fill} />
        <path d={`M ${-w / 2 + 10} ${-h / 4} C ${-w / 3} 0, ${w / 3} 0, ${w / 2 - 10} ${-h / 4}`} />
        <path d="M -10 -1 C -4 4 -4 9 -10 14 M 3 -1 C 9 4 9 9 3 14" />
      </g>
    );
  }

  if (glyphVariant === "heat-load" || glyphVariant === "single-heat-load" || glyphVariant === "two-port-heat-load") {
    if (mode === "text") {
      return null;
    }
    const isTwoPortLoad = glyphVariant === "two-port-heat-load";
    const loadClass =
      glyphVariant === "two-port-heat-load"
        ? "two-port-heat-load-glyph"
        : glyphVariant === "single-heat-load"
          ? "single-heat-load-glyph"
          : "heat-load-glyph";
    return (
      <g className={loadClass} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {isTwoPortLoad ? (
          <rect x={-w / 2 + 10} y={-h / 2 + 8} width={w - 20} height={h - 16} rx="5" fill={fill} />
        ) : (
          <path d={`M ${-w / 3} ${-h / 3} L ${w / 3} ${-h / 3} L 0 ${h / 3} Z`} fill={fill} />
        )}
        <path d="M -13 -4 H 13 M -10 3 H 10 M -7 10 H 7" />
        {isTwoPortLoad ? (
          <path className="heat-load-two-port-marker" d="M -30 -13 H -17 M -23 -17 L -17 -13 L -23 -9 M 17 13 H 30 M 24 9 L 31 13 L 24 17" />
        ) : (
          <path className="heat-load-single-marker" d="M 18 -10 H 30 M 25 -14 L 31 -10 L 25 -6" />
        )}
      </g>
    );
  }

  if (glyphVariant === "heat-bus") {
    if (mode === "text") {
      return null;
    }
    return renderBusGlyphRect(w, h, stroke);
  }

  if (glyphVariant === "heat-pipeline") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="-5" x2={w / 2 - 8} y2="-5" />
        <line x1={-w / 2 + 8} y1="5" x2={w / 2 - 8} y2="5" />
        <path d="M -24 0 C -18 -8 -12 8 -6 0 C 0 -8 6 8 12 0 C 18 -8 24 8 30 0" strokeWidth="1.6" />
      </g>
    );
  }

  if (glyphVariant === "heat-pump") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r={miniature ? 15 : 20} fill={fill} />
        <path d="M -24 0 H -10 M 10 0 H 24" />
        <path d="M -5 -11 L 12 0 L -5 11 Z" fill={fill} />
        <path d="M -3 -15 C 5 -20 15 -13 15 -4" />
      </g>
    );
  }

  if (glyphVariant === "heat-valve") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -28 0 H -12 M 12 0 H 28" />
        <path d="M -12 -12 L 0 0 L -12 12 Z M 12 -12 L 0 0 L 12 12 Z" fill={fill} />
        <path d="M 0 -18 V -3 M -8 -18 H 8" />
      </g>
    );
  }

  if (node.kind.includes("wind-source")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r={miniature ? 4 : 6} />
        <path d="M 0 0 L 0 -18 M 0 0 L 16 10 M 0 0 L -16 10" />
        <path d="M 0 6 V 22" />
      </g>
    );
  }

  if (node.kind.includes("pv-source")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round">
        <path d="M -22 -12 H 22 V 14 H -22 Z" />
        <path d="M -7 -12 V 14 M 8 -12 V 14 M -22 1 H 22" />
        <path d="M 0 -22 V -17 M -18 -20 L -14 -16 M 18 -20 L 14 -16" />
      </g>
    );
  }

  if (node.kind.includes("thermal-source")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -20 18 H 20 V -4 L 8 4 V -4 L -4 4 V -4 L -20 8 Z" />
        <path d="M -6 -12 C -12 -22 6 -22 0 -32 M 10 -12 C 4 -22 22 -22 16 -32" fill="none" />
      </g>
    );
  }

  if (node.kind.includes("hydro-source")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -20 -12 C -8 -24 8 -24 20 -12 C 12 10 4 20 0 22 C -4 20 -12 10 -20 -12 Z" fill={fill} />
        <path d="M -16 6 C -8 0 -2 12 6 6 C 12 1 15 5 18 8" />
      </g>
    );
  }

  if (node.kind.includes("nuclear-source")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.2">
        <circle cx="0" cy="0" r={miniature ? 16 : 22} />
        <ellipse cx="0" cy="0" rx="6" ry="20" fill="none" transform="rotate(0)" />
        <ellipse cx="0" cy="0" rx="6" ry="20" fill="none" transform="rotate(60)" />
        <ellipse cx="0" cy="0" rx="6" ry="20" fill="none" transform="rotate(120)" />
        <circle cx="0" cy="0" r="3" fill={stroke} />
      </g>
    );
  }

  if (node.kind.includes("bus")) {
    if (mode === "text") {
      return null;
    }
    return renderBusGlyphRect(w, h, stroke);
  }

  if (glyphVariant === "ac-line") {
    if (mode === "text") {
      return null;
    }
    const left = -w / 2 + 8;
    const right = w / 2 - 8;
    const symbolWidth = Math.min(Math.max(w - 24, 34), miniature ? 36 : 54);
    const symbolLeft = -symbolWidth / 2;
    const resistorWidth = symbolWidth * 0.34;
    const resistorLeft = symbolLeft;
    const resistorRight = resistorLeft + resistorWidth;
    const coilGap = 4;
    const coilStart = resistorRight + coilGap;
    const coilEnd = symbolLeft + symbolWidth;
    const loopWidth = (coilEnd - coilStart) / 3;
    const resistorHeight = miniature ? 9 : 12;
    const coilHeight = miniature ? 8 : 11;
    return (
      <g fill="none" stroke={stroke} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1={left} y1="0" x2={resistorLeft} y2="0" />
        <rect x={resistorLeft} y={-resistorHeight / 2} width={resistorWidth} height={resistorHeight} rx="1.5" />
        <line x1={resistorRight} y1="0" x2={coilStart} y2="0" />
        <path
          d={[
            `M ${coilStart} 0`,
            `C ${coilStart + loopWidth * 0.25} ${-coilHeight} ${coilStart + loopWidth * 0.75} ${-coilHeight} ${coilStart + loopWidth} 0`,
            `C ${coilStart + loopWidth * 1.25} ${-coilHeight} ${coilStart + loopWidth * 1.75} ${-coilHeight} ${coilStart + loopWidth * 2} 0`,
            `C ${coilStart + loopWidth * 2.25} ${-coilHeight} ${coilStart + loopWidth * 2.75} ${-coilHeight} ${coilEnd} 0`
          ].join(" ")}
        />
        <line x1={coilEnd} y1="0" x2={right} y2="0" />
      </g>
    );
  }

  if (glyphVariant === "dc-line") {
    if (mode === "text") {
      return null;
    }
    const left = -w / 2 + 8;
    const right = w / 2 - 8;
    const resistorWidth = Math.min(Math.max(w * 0.32, 20), miniature ? 22 : 34);
    const resistorLeft = -resistorWidth / 2;
    const resistorHeight = miniature ? 9 : 12;
    return (
      <g fill="none" stroke={stroke} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1={left} y1="0" x2={resistorLeft} y2="0" />
        <rect x={resistorLeft} y={-resistorHeight / 2} width={resistorWidth} height={resistorHeight} rx="1.5" />
        <line x1={resistorWidth / 2} y1="0" x2={right} y2="0" />
      </g>
    );
  }

  if (glyphVariant === "line") {
    if (mode === "text") {
      return null;
    }
    return (
      <g stroke={stroke} strokeWidth="4" strokeLinecap="round">
        <line x1={-w / 2 + 8} y1="0" x2={w / 2 - 8} y2="0" />
        <line x1={-w / 4} y1="-10" x2={w / 4} y2="10" />
      </g>
    );
  }

  if (node.kind === "ac-three-winding-transformer" || node.kind === "ac-three-winding-transformer-neutral") {
    if (mode === "text") {
      return null;
    }
    const hasNeutralTerminal = node.kind === "ac-three-winding-transformer-neutral";
    const windingRadius = miniature ? 9 : hasNeutralTerminal ? 14 : 15;
    const topY = miniature ? -5 : -8;
    const bottomY = miniature ? 10 : hasNeutralTerminal ? 16 : 14;
    const sideX = miniature ? 10 : hasNeutralTerminal ? 17 : 16;
    const neutralLeadTop = topY - windingRadius - (miniature ? 6 : 20);
    return (
      <g className={`three-winding-transformer-glyph${hasNeutralTerminal ? " three-winding-transformer-neutral-glyph" : ""}`} fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle className="transformer-winding" cx={-sideX} cy={topY} r={windingRadius} />
        <circle className="transformer-winding" cx={sideX} cy={topY} r={windingRadius} />
        <circle className="transformer-winding" cx="0" cy={bottomY} r={windingRadius} />
        <path d={`M ${-sideX - windingRadius - 8} ${topY} H ${-sideX - windingRadius} M ${sideX + windingRadius} ${topY} H ${sideX + windingRadius + 8} M 0 ${bottomY + windingRadius} V ${bottomY + windingRadius + 10}`} />
        <path d={`M ${-sideX + windingRadius * 0.55} ${topY + windingRadius * 0.55} L ${-windingRadius * 0.28} ${bottomY - windingRadius * 0.72} M ${sideX - windingRadius * 0.55} ${topY + windingRadius * 0.55} L ${windingRadius * 0.28} ${bottomY - windingRadius * 0.72}`} strokeWidth="1.6" />
        {hasNeutralTerminal && (
          <>
            <path d={`M 0 ${neutralLeadTop} V ${topY - windingRadius}`} />
            <circle cx="0" cy={topY - windingRadius} r={miniature ? 2.2 : 3.2} fill={stroke} stroke="none" />
          </>
        )}
      </g>
    );
  }

  if (glyphVariant === "terminal-transformer-load") {
    if (mode === "text") {
      return null;
    }
    const windingRadius = miniature ? 11 : 18;
    const leftCoilX = miniature ? -11 : -14;
    const rightCoilX = miniature ? 11 : 14;
    const loadTop = miniature ? 1 : 5;
    const loadWidth = miniature ? 11 : 15;
    const loadHeight = miniature ? 10 : 13;
    return (
      <g className="terminal-transformer-load-glyph" fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx={leftCoilX} cy="0" r={windingRadius} />
        <circle cx={rightCoilX} cy="0" r={windingRadius} />
        <path
          d={`M ${-loadWidth / 2} ${loadTop} H ${loadWidth / 2} L 0 ${loadTop + loadHeight} Z`}
          fill="#ffffff"
        />
      </g>
    );
  }

  if (node.kind.includes("transformer")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.5">
        <circle cx="-14" cy="0" r={miniature ? 11 : 18} />
        <circle cx="14" cy="0" r={miniature ? 11 : 18} />
      </g>
    );
  }

  if (glyphVariant === "switch" || glyphVariant === "disconnector") {
    if (mode === "text") {
      return null;
    }
    const closed = getSwitchVisualState(node) === "closed";
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="0" x2="-13" y2="0" />
        <line x1="13" y1="0" x2={w / 2 - 8} y2="0" />
        <circle cx="-13" cy="0" r="3.2" fill="#ffffff" />
        <circle cx="13" cy="0" r="3.2" fill="#ffffff" />
        <line x1="-13" y1="0" x2={closed ? "13" : "10"} y2={closed ? "0" : "-15"} />
        {!closed && <line x1="8" y1="-15" x2="16" y2="-15" />}
      </g>
    );
  }

  if (glyphVariant === "ground-disconnector") {
    if (mode === "text") {
      return null;
    }
    const closed = getSwitchVisualState(node) === "closed";
    return (
      <g className="ground-disconnector-glyph" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="0" x2="-18" y2="0" />
        <circle cx="-18" cy="0" r="3.2" fill="#ffffff" />
        <circle cx="8" cy="0" r="3.2" fill="#ffffff" />
        <line x1="-18" y1="0" x2={closed ? "8" : "2"} y2={closed ? "0" : "-15"} />
        {!closed && <line x1="0" y1="-15" x2="12" y2="-15" />}
        <path d="M 8 0 H 18 V 15 M 18 15 V 20 M 8 20 H 28 M 11 24 H 25 M 14 28 H 22" />
      </g>
    );
  }

  if (glyphVariant === "ground-disconnector-vertical") {
    if (mode === "text") {
      return null;
    }
    const closed = getSwitchVisualState(node) === "closed";
    return (
      <g className="ground-disconnector-vertical-glyph" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="0" y1={-h / 2 + 8} x2="0" y2="-18" />
        <circle cx="0" cy="-18" r="3.2" fill="#ffffff" />
        <circle cx="0" cy="8" r="3.2" fill="#ffffff" />
        <line x1="0" y1="-18" x2={closed ? "0" : "14"} y2={closed ? "8" : "-6"} />
        {!closed && <line x1="14" y1="-8" x2="14" y2="0" />}
        <path d="M 0 8 V 18 M 0 18 V 24 M -10 24 H 10 M -7 28 H 7 M -4 32 H 4" />
      </g>
    );
  }

  if (glyphVariant === "breaker") {
    if (mode === "text") {
      return null;
    }
    const closed = getSwitchVisualState(node) === "closed";
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="0" x2="-20" y2="0" />
        <line x1="20" y1="0" x2={w / 2 - 8} y2="0" />
        <rect x="-20" y="-15" width="40" height="30" rx="5" fill={fill} />
        <path d="M -10 -8 V 8 M 10 -8 V 8" />
        {closed ? <path d="M -10 0 H 10" /> : <path d="M -8 8 L 8 -8" />}
      </g>
    );
  }

  if (glyphVariant === "box-breaker") {
    if (mode === "text") {
      return null;
    }
    const closed = getSwitchVisualState(node) === "closed";
    const boxWidth = Math.min(Math.max(w * 0.42, 34), miniature ? 36 : 48);
    const boxHeight = miniature ? 16 : 20;
    const leftWireEnd = -boxWidth / 2;
    const rightWireStart = boxWidth / 2;
    return (
      <g className="box-breaker-glyph" fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="0" x2={leftWireEnd} y2="0" />
        <line x1={rightWireStart} y1="0" x2={w / 2 - 8} y2="0" />
        <rect
          x={-boxWidth / 2}
          y={-boxHeight / 2}
          width={boxWidth}
          height={boxHeight}
          rx="2"
          fill={closed ? stroke : "#ffffff"}
        />
      </g>
    );
  }

  if (glyphVariant === "load") {
    if (mode === "text") {
      return null;
    }
    const bodyHalfWidth = w * 2 / 9;
    const bodyHalfHeight = h * 2 / 9;
    return (
      <g className="electric-load-glyph" fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round">
        <path d={`M ${-bodyHalfWidth} ${-bodyHalfHeight} L ${bodyHalfWidth} ${-bodyHalfHeight} L 0 ${bodyHalfHeight} Z`} />
      </g>
    );
  }

  if (glyphVariant === "dcdc-converter" || glyphVariant === "acdc-converter" || glyphVariant === "acac-converter") {
    if (mode === "text") {
      return null;
    }
    const borderInset = CONVERTER_GLYPH_BORDER_INSET;
    const borderX = -w / 2 + borderInset;
    const borderY = -h / 2 + borderInset;
    const borderWidth = Math.max(2, w - borderInset * 2);
    const borderHeight = Math.max(2, h - borderInset * 2);
    const leftX = -w / 2 + borderInset + 2;
    const rightX = w / 2 - borderInset - 24;
    const symbolY = 0;
    const dcSymbol = (x: number) => (
      <g>
        <path d={`M ${x} ${symbolY - 7} H ${x + 14} M ${x + 3} ${symbolY + 7} H ${x + 11}`} />
        <path d={`M ${x + 7} ${symbolY - 7} V ${symbolY + 7}`} strokeWidth="1.4" />
      </g>
    );
    const acSymbol = (x: number) => (
      <path d={`M ${x} ${symbolY} C ${x + 3} ${symbolY - 9}, ${x + 8} ${symbolY - 9}, ${x + 11} ${symbolY} C ${x + 14} ${symbolY + 9}, ${x + 19} ${symbolY + 9}, ${x + 22} ${symbolY}`} />
    );
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x={borderX} y={borderY} width={borderWidth} height={borderHeight} rx="6" fill={fill} />
        {glyphVariant === "dcdc-converter" ? dcSymbol(leftX) : acSymbol(leftX - 1)}
        {glyphVariant === "acdc-converter" ? dcSymbol(rightX + 4) : glyphVariant === "acac-converter" ? acSymbol(rightX) : dcSymbol(rightX + 4)}
        <path d={glyphVariant === "acac-converter" ? "M -5 -8 L 0 0 L -5 8 M 5 -8 L 0 0 L 5 8" : "M -7 0 H 7 M 2 -5 L 7 0 L 2 5"} />
      </g>
    );
  }

  if (glyphVariant === "custom-device" || node.params[CUSTOM_DEVICE_TEMPLATE_KEY] === "1") {
    const label = node.name || node.kind;
    const abbreviation = label.slice(0, 4).toUpperCase();
    if (mode === "text") {
      return uprightText(node, 0, -2, { fill: stroke, fontSize: miniature ? 10 : 15, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, abbreviation);
    }
    if (!renderGeometry) {
      return null;
    }
    return (
      <g fill="none" stroke="none">
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="6" fill={node.params.fillColor || "#f8fafc"} />
        {renderText && uprightText(node, 0, -2, { fill: stroke, fontSize: miniature ? 10 : 15, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, abbreviation)}
      </g>
    );
  }

  if (mode === "text") {
    return null;
  }
  return (
    <g>
      <circle cx="0" cy="0" r={miniature ? 16 : 24} fill={fill} stroke={stroke} strokeWidth="2.5" />
      <path d="M -10 0 H 10 M 0 -10 V 10" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
  };

  const content = renderDeviceGlyphContent();
  if (!content || glyphContentScale === 1) {
    return content;
  }
  return (
    <g transform={`scale(${formatSvgNumber(glyphContentScale)})`}>
      {content}
    </g>
  );
}

export const MemoDeviceGlyph = memo(
  DeviceGlyph,
  (previous, next) =>
    previous.node === next.node &&
    previous.miniature === next.miniature &&
    previous.mode === next.mode &&
    previous.colorDisplayMode === next.colorDisplayMode &&
    previous.colorPalette === next.colorPalette
);

type SvgMarkupChunkProps = {
  className: string;
  markup: string;
};

export const SvgMarkupChunk = memo(function SvgMarkupChunk({ className, markup }: SvgMarkupChunkProps) {
  return <g className={className} dangerouslySetInnerHTML={{ __html: markup }} />;
});

export type StableSvgMarkupChunk = {
  key: string;
  markup: string;
};

export type CachedStableSvgMarkupChunk = StableSvgMarkupChunk & {
  itemKeys: string[];
  tokens: unknown[];
};

export type StableSvgMarkupChunkCache = {
  chunks: CachedStableSvgMarkupChunk[];
};

export type ConnectionStrokeColorCache = {
  nodeById: ReadonlyMap<string, Pick<ModelNode, "kind" | "terminals" | "params">> | null;
  token: string;
  colors: Map<string, { edge: Edge; color: string }>;
};

export type ElementTreeSource = {
  revision: number;
  layerSignature: string;
  nodes: ModelNode[];
  edges: Edge[];
};

function tokenArraysEqual(first: readonly unknown[], second: readonly unknown[]) {
  if (first.length !== second.length) {
    return false;
  }
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return false;
    }
  }
  return true;
}

export function customSingleTerminalAnchorToken(node: ModelNode, template?: DeviceTemplate): string {
  if (isBusNode(node) || isStaticNode(node) || node.terminals.length !== 1) {
    return "";
  }
  const anchor = node.terminals[0]?.anchor;
  const templateAnchor = template?.terminalAnchors?.[0] ?? { x: 0.5, y: 0 };
  return anchor && (anchor.x !== templateAnchor.x || anchor.y !== templateAnchor.y)
    ? `${formatSvgNumber(anchor.x)},${formatSvgNumber(anchor.y)}`
    : "";
}

export function stableSvgMarkupChunks<T>(
  items: readonly T[],
  cache: StableSvgMarkupChunkCache,
  options: {
    chunkSize: number;
    keyPrefix: string;
    itemKey: (item: T, index: number) => string;
    itemTokens: (item: T, index: number) => readonly unknown[];
    itemMarkup: (item: T, index: number) => string;
  }
): StableSvgMarkupChunk[] {
  if (items.length === 0) {
    cache.chunks = [];
    return [];
  }
  const nextChunks: CachedStableSvgMarkupChunk[] = [];
  for (let start = 0; start < items.length; start += options.chunkSize) {
    const end = Math.min(items.length, start + options.chunkSize);
    const chunkIndex = nextChunks.length;
    const itemKeys: string[] = [];
    const tokens: unknown[] = [];
    for (let index = start; index < end; index += 1) {
      const item = items[index];
      itemKeys.push(options.itemKey(item, index));
      tokens.push(...options.itemTokens(item, index));
    }
    const key = `${options.keyPrefix}-${chunkIndex}-${itemKeys[0] ?? "empty"}-${itemKeys[itemKeys.length - 1] ?? "empty"}`;
    const previous = cache.chunks[chunkIndex];
    if (
      previous &&
      previous.key === key &&
      tokenArraysEqual(previous.itemKeys, itemKeys) &&
      tokenArraysEqual(previous.tokens, tokens)
    ) {
      nextChunks.push(previous);
      continue;
    }
    let markup = "";
    for (let index = start; index < end; index += 1) {
      markup += options.itemMarkup(items[index], index);
    }
    nextChunks.push({ key, itemKeys, tokens, markup });
  }
  cache.chunks = nextChunks;
  return nextChunks.map(({ key, markup }) => ({ key, markup }));
}

