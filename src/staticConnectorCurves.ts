import type { DeviceKind, Point } from "./model";

const CURVE_EPSILON = 1e-6;
const EXPLICIT_FINISH_KINDS = new Set<DeviceKind>([
  "static-polyline",
  "static-elbow-connector",
  "static-bezier-connector",
  "static-smoothstep-connector",
  "static-self-loop"
]);

function svgNumber(value: number) {
  const normalized = Math.abs(value) < CURVE_EPSILON ? 0 : Math.round(value * 1000) / 1000;
  return String(normalized);
}

function pointCommand(command: string, point: Point) {
  return `${command} ${svgNumber(point.x)} ${svgNumber(point.y)}`;
}

function polylinePath(points: readonly Point[]) {
  return points.map((point, index) => pointCommand(index === 0 ? "M" : "L", point)).join(" ");
}

function twoPointBezierPath(start: Point, end: Point) {
  const controlDx = Math.max(24, Math.abs(end.x - start.x) * 0.5);
  const direction = end.x >= start.x ? 1 : -1;
  return [
    pointCommand("M", start),
    "C",
    svgNumber(start.x + controlDx * direction),
    svgNumber(start.y),
    svgNumber(end.x - controlDx * direction),
    svgNumber(end.y),
    svgNumber(end.x),
    svgNumber(end.y)
  ].join(" ");
}

function interpolatingBezierPath(points: readonly Point[], tangentScale = 1 / 6) {
  if (points.length < 2) {
    return "";
  }
  if (points.length === 2) {
    return twoPointBezierPath(points[0], points[1]);
  }
  const commands = [pointCommand("M", points[0])];
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const start = points[index];
    const end = points[index + 1];
    const next = points[index + 2] ?? end;
    const firstControl = {
      x: start.x + (end.x - previous.x) * tangentScale,
      y: start.y + (end.y - previous.y) * tangentScale
    };
    const secondControl = {
      x: end.x - (next.x - start.x) * tangentScale,
      y: end.y - (next.y - start.y) * tangentScale
    };
    commands.push([
      "C",
      svgNumber(firstControl.x),
      svgNumber(firstControl.y),
      svgNumber(secondControl.x),
      svgNumber(secondControl.y),
      svgNumber(end.x),
      svgNumber(end.y)
    ].join(" "));
  }
  return commands.join(" ");
}

function twoPointSelfLoopPath(start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / distance, y: dx / distance };
  const loopDepth = Math.max(24, distance * 0.7);
  const firstControl = {
    x: start.x + dx * 0.25 + normal.x * loopDepth,
    y: start.y + dy * 0.25 + normal.y * loopDepth
  };
  const secondControl = {
    x: start.x + dx * 0.75 + normal.x * loopDepth,
    y: start.y + dy * 0.75 + normal.y * loopDepth
  };
  return [
    pointCommand("M", start),
    "C",
    svgNumber(firstControl.x),
    svgNumber(firstControl.y),
    svgNumber(secondControl.x),
    svgNumber(secondControl.y),
    svgNumber(end.x),
    svgNumber(end.y)
  ].join(" ");
}

export function staticConnectorDrawingPath(kind: DeviceKind, points: readonly Point[]) {
  if (points.length < 2) {
    return "";
  }
  if (kind === "static-bezier-connector") {
    return interpolatingBezierPath(points);
  }
  if (kind === "static-smoothstep-connector") {
    return interpolatingBezierPath(points, 0.1);
  }
  if (kind === "static-self-loop") {
    return points.length === 2 ? twoPointSelfLoopPath(points[0], points[1]) : interpolatingBezierPath(points);
  }
  return polylinePath(points);
}

export function staticConnectorDrawingNeedsExplicitFinish(kind: DeviceKind) {
  return EXPLICIT_FINISH_KINDS.has(kind);
}
