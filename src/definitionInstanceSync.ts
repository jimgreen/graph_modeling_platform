import {
  TERMINAL_TYPE_LIBRARY_LABELS,
  createTerminals,
  getTemplateParameterDefinitions,
  reconcileNodeParamsWithTemplateDefinitions,
  type DeviceParameterDefinition,
  type DeviceTemplate,
  type ModelNode,
  type Point,
  type Terminal,
  type TerminalType
} from "./model";

export type DefinitionSyncTemplate = Pick<DeviceTemplate, "parameterDefinitions"> &
  Partial<Pick<
    DeviceTemplate,
    | "kind"
    | "label"
    | "categoryLibrary"
    | "params"
    | "size"
    | "terminalType"
    | "terminalCount"
    | "terminalTypes"
    | "terminalLabels"
    | "terminalAnchors"
    | "terminalRoles"
    | "terminalAssociations"
    | "isContainer"
    | "stateDefinitions"
  >>;

const DEFINITION_OWNED_PARAM_KEYS = new Set([
  "component_type",
  "icon",
  "image",
  "imageAssetId",
  "imageFit",
  "backgroundImage",
  "backgroundImageAssetId",
  "backgroundImageCleared",
  "backgroundImageFit",
  "foregroundColor",
  "foregroundImage",
  "foregroundImageAssetId",
  "foregroundImageFit",
  "fillColor",
  "strokeColor",
  "textColor",
  "lineWidth",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "strokeStyle",
  "text",
  "cornerRadius",
  "accentColor",
  "shadowEnabled",
  "padding",
  "textAlign",
  "verticalAlign",
  "markerStart",
  "markerEnd",
  "arrowSize",
  "handleColor",
  "handleSize",
  "routeAvoidance",
  "staticWidth",
  "staticHeight"
]);

const DEFINITION_OWNED_PARAM_PREFIXES = ["button"];

function isDefinitionOwnedParam(key: string) {
  return DEFINITION_OWNED_PARAM_KEYS.has(key) ||
    DEFINITION_OWNED_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function isCompleteTemplate(template: DefinitionSyncTemplate): template is DeviceTemplate {
  return Boolean(
    template.kind &&
    template.label !== undefined &&
    template.categoryLibrary !== undefined &&
    template.params &&
    template.size &&
    template.terminalType &&
    Number.isFinite(Number(template.terminalCount))
  );
}

function effectiveParameterDefinitions(template: DefinitionSyncTemplate) {
  if (Array.isArray(template.parameterDefinitions)) {
    return template.parameterDefinitions;
  }
  return isCompleteTemplate(template) ? getTemplateParameterDefinitions(template) : undefined;
}

function syncDefinitionParams(node: ModelNode, template: DefinitionSyncTemplate): ModelNode {
  if (!template.params || typeof template.params !== "object") {
    return node;
  }
  let nextParams = node.params;
  const templateParamKeys = new Set(Object.keys(template.params));
  for (const key of Object.keys(node.params)) {
    if (!isDefinitionOwnedParam(key) || templateParamKeys.has(key)) {
      continue;
    }
    if (nextParams === node.params) {
      nextParams = { ...node.params };
    }
    delete nextParams[key];
  }
  for (const [key, rawValue] of Object.entries(template.params)) {
    if (!isDefinitionOwnedParam(key)) {
      continue;
    }
    const value = String(rawValue ?? "");
    if (nextParams[key] === value) {
      continue;
    }
    if (nextParams === node.params) {
      nextParams = { ...node.params };
    }
    nextParams[key] = value;
  }
  return nextParams === node.params ? node : { ...node, params: nextParams };
}

function syncDefinitionSize(node: ModelNode, template: DefinitionSyncTemplate): ModelNode {
  const width = Number(template.size?.width);
  const height = Number(template.size?.height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return node;
  }
  const size = {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  };
  return size.width === node.size.width && size.height === node.size.height
    ? node
    : { ...node, size };
}

const DEFAULT_TERMINAL_ANCHORS: Point[] = [
  { x: -0.5, y: 0 },
  { x: 0.5, y: 0 },
  { x: 0, y: -0.5 },
  { x: 0, y: 0.5 },
  { x: -0.5, y: -0.25 },
  { x: 0.5, y: -0.25 },
  { x: -0.5, y: 0.25 },
  { x: 0.5, y: 0.25 }
];

function defaultTerminalAnchor(count: number, index: number): Point {
  if (count === 1) {
    return { x: 0.5, y: 0 };
  }
  if (count === 2) {
    return index === 0 ? { x: -0.5, y: 0 } : { x: 0.5, y: 0 };
  }
  return DEFAULT_TERMINAL_ANCHORS[index] ?? { x: 0, y: 0 };
}

function terminalLabel(type: TerminalType, index: number) {
  return `${TERMINAL_TYPE_LIBRARY_LABELS[type] ?? type}端${index + 1}`;
}

function samePoint(left: Point, right: Point) {
  return left.x === right.x && left.y === right.y;
}

function sameTerminal(left: Terminal | undefined, right: Terminal) {
  return Boolean(left) &&
    left?.id === right.id &&
    left.label === right.label &&
    left.type === right.type &&
    left.nodeNumber === right.nodeNumber &&
    left.vbase === right.vbase &&
    samePoint(left.anchor, right.anchor);
}

function syncDefinitionTerminals(node: ModelNode, template: DefinitionSyncTemplate): ModelNode {
  if (!Number.isFinite(Number(template.terminalCount))) {
    return node;
  }
  const terminalCount = Math.max(0, Math.min(8, Math.round(Number(template.terminalCount) || 0)));
  const fallbackType = template.terminalType ?? template.terminalTypes?.[0] ?? node.terminals[0]?.type ?? "ac";
  const generated = createTerminals(fallbackType, terminalCount);
  const terminals = generated.map((terminal, index) => {
    const current = node.terminals[index];
    const type = template.terminalTypes?.[index] ?? fallbackType;
    const anchor = template.terminalAnchors?.[index] ?? defaultTerminalAnchor(terminalCount, index);
    return {
      ...terminal,
      id: `t${index + 1}`,
      label: template.terminalLabels?.[index] ?? terminalLabel(type, index),
      type,
      anchor: { ...anchor },
      nodeNumber: current?.nodeNumber ?? terminal.nodeNumber,
      vbase: current?.type === type ? current.vbase : terminal.vbase
    };
  });
  const changed = terminals.length !== node.terminals.length ||
    terminals.some((terminal, index) => !sameTerminal(node.terminals[index], terminal));
  return changed ? { ...node, terminals } : node;
}

export function reconcileNodeWithDefinition(
  node: ModelNode,
  template: DefinitionSyncTemplate,
  previousDefinitions?: readonly DeviceParameterDefinition[]
): ModelNode {
  const definitions = effectiveParameterDefinitions(template);
  let reconciled = definitions
    ? reconcileNodeParamsWithTemplateDefinitions(node, { parameterDefinitions: [...definitions] }, previousDefinitions)
    : node;
  reconciled = syncDefinitionParams(reconciled, template);
  reconciled = syncDefinitionSize(reconciled, template);
  return syncDefinitionTerminals(reconciled, template);
}
