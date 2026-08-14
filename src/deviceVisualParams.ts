export const DEVICE_DEFINITION_VISUAL_PARAM_KEYS = new Set([
  "icon",
  "image",
  "imageAssetId",
  "imageCleared",
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

export const DEVICE_INSTANCE_GRAPH_PARAM_KEYS = new Set([
  "layerId",
  "rotation",
  "scaleX",
  "scaleY"
]);

export const DEVICE_VISUAL_PARAM_KEYS = new Set([
  ...DEVICE_DEFINITION_VISUAL_PARAM_KEYS,
  ...DEVICE_INSTANCE_GRAPH_PARAM_KEYS
]);

export const DEVICE_VISUAL_PARAM_PREFIXES = ["button"];

export function isCanonicalDeviceVisualParamName(key: string) {
  return DEVICE_VISUAL_PARAM_KEYS.has(key) ||
    DEVICE_VISUAL_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix));
}
