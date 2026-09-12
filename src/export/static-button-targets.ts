// 静态按钮图层目标解析（纯函数，Node 可直载）。
// 来源：appCoreCanvasUtilities.tsx（.tsx）——Task 13 单源迁移：
// 原 .tsx 侧仅保留 `export * from` 转发，本模块为唯一定义（用户规则：单一概念单源）。
import type { ModelLayer, ModelNode } from "../model";

export const parseStaticButtonTargetLayerValues = (value?: string) => {
  const text = value?.trim();
  if (!text) {
    return [];
  }
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.map((item) => String(item).trim()).filter(Boolean)));
      }
    } catch {
      // Fall through to legacy delimiter parsing.
    }
  }
  return Array.from(new Set(text.split(/[,\n;|]/).map((item) => item.trim()).filter(Boolean)));
};

export const resolveStaticButtonTargetLayers = (node: ModelNode, availableLayers: ModelLayer[]) => {
  const layerById = new Map(availableLayers.map((layer) => [layer.id, layer]));
  const layerByName = new Map(availableLayers.map((layer) => [layer.name.trim(), layer]));
  const targetLayerIds = parseStaticButtonTargetLayerValues(node.params.buttonTargetLayerIds);
  const targetLayerNames = parseStaticButtonTargetLayerValues(node.params.buttonTargetLayerNames);
  const legacyTargetLayerId = node.params.buttonTargetLayerId?.trim();
  const legacyTargetLayerName = node.params.buttonTargetLayerName?.trim();
  const idCandidates = targetLayerIds.length > 0 ? targetLayerIds : legacyTargetLayerId ? [legacyTargetLayerId] : [];
  const nameCandidates = targetLayerNames.length > 0 ? targetLayerNames : legacyTargetLayerName ? [legacyTargetLayerName] : [];
  const selectedLayers: ModelLayer[] = [];
  const selectedLayerIds = new Set<string>();
  const addLayer = (layer?: ModelLayer) => {
    if (!layer || selectedLayerIds.has(layer.id)) {
      return;
    }
    selectedLayerIds.add(layer.id);
    selectedLayers.push(layer);
  };
  for (const layerId of idCandidates) {
    addLayer(layerById.get(layerId));
  }
  for (const layerName of nameCandidates) {
    addLayer(layerByName.get(layerName));
  }
  return selectedLayers;
};
