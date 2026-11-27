import { useEffect, useMemo, useState } from "react";
import { Modal, Tree } from "antd";
import type { TreeProps } from "antd/es/tree";
import { Check, Eye, EyeOff, Folder, Layers2 } from "lucide-react";
import { createNodeFromTemplate } from "./model-node-ops";
import { MemoDeviceGlyph } from "./DeviceGlyph";
import {
  deviceLibraryComponentKey,
  deviceLibraryTemplateKey,
  isDeviceLibraryCategoryVisible,
  isDeviceLibraryComponentVisible,
  isDeviceLibraryTemplateVisible,
  type DeviceLibraryCategoryEntry,
  type DeviceLibraryComponentEntry,
  type DeviceLibraryHierarchy
} from "./deviceLibraryCustomization";
import type { DeviceLibraryCustomizationConfig } from "./interfaceCustomization";
import type { DeviceTemplate } from "./model";
import type { LibraryTreeOrderState } from "./libraryTreeOrder";
import { moveKeyToEdge } from "./libraryTreeOrder";
import { DEFAULT_COLOR_PALETTE, type ColorPalette } from "./model";

type DeviceLibraryDisplayDialogProps = {
  open: boolean;
  hierarchy: DeviceLibraryHierarchy;
  config: DeviceLibraryCustomizationConfig;
  order: LibraryTreeOrderState;
  busy?: boolean;
  colorDisplayMode?: "energy" | "voltage";
  colorPalette?: ColorPalette;
  themeMode?: "light" | "dark";
  onConfigChange: (config: DeviceLibraryCustomizationConfig) => void;
  onOrderChange: (order: LibraryTreeOrderState) => void;
  onClose: () => void;
};

function orderFor(order: readonly string[] | undefined, keys: readonly string[]): string[] {
  const current = Array.isArray(order) ? order : [];
  return [...current.filter((key) => keys.includes(key)), ...keys.filter((key) => !current.includes(key))];
}

function treeKeyForCategory(name: string) {
  return `category:${name}`;
}

function treeKeyForComponent(category: string, section: string) {
  return `component:${deviceLibraryComponentKey(category, section)}`;
}

export function buildDeviceLibraryPreview(template: DeviceTemplate) {
  return {
    node: createNodeFromTemplate(template, { x: 0, y: 0 }),
    miniature: true,
    scale: 2
  } as const;
}

export function reorderDeviceLibraryKeys(keys: readonly string[], dragKind: string, dropKind: string, before: boolean): string[] | null {
  return moveKeyToEdge(keys, dragKind, dropKind, before ? "before" : "after");
}

function ComponentTitle({ component, visible, disabled, onVisibleChange }: { category: string; component: DeviceLibraryComponentEntry; visible: boolean; disabled: boolean; onVisibleChange: (visible: boolean) => void }) {
  return <span className="device-library-tree-title"><Layers2 size={14} aria-hidden="true"/><input type="checkbox" checked={visible} disabled={disabled} onClick={(event) => event.stopPropagation()} onChange={(event) => onVisibleChange(event.target.checked)} aria-label={`显示${component.label}`}/><span className="device-library-display-label">{component.label}</span><span className="device-library-display-count">{component.templates.length}</span></span>;
}

function CategoryTitle({ category, visible, onVisibleChange }: { category: DeviceLibraryCategoryEntry; visible: boolean; onVisibleChange: (visible: boolean) => void }) {
  return <span className="device-library-tree-title device-library-tree-category-title"><Folder size={14} aria-hidden="true"/><input type="checkbox" checked={visible} onClick={(event) => event.stopPropagation()} onChange={(event) => onVisibleChange(event.target.checked)} aria-label={`显示${category.name}`}/><strong className="device-library-display-label">{category.name}</strong><span className="device-library-display-count">{category.components.length}</span></span>;
}

export function DeviceLibraryDisplayDialog({ open, hierarchy, config, order, busy = false, colorDisplayMode = "energy", colorPalette = DEFAULT_COLOR_PALETTE, themeMode = "light", onConfigChange, onOrderChange, onClose }: DeviceLibraryDisplayDialogProps) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedComponentKey, setSelectedComponentKey] = useState("");
  const categoryKeys = useMemo(() => hierarchy.categories.map((category) => category.name), [hierarchy.categories]);
  const orderedCategoryNames = useMemo(() => orderFor(order.categoryLibraries, categoryKeys), [categoryKeys, order.categoryLibraries]);
  const categoryByName = useMemo(() => new Map(hierarchy.categories.map((category) => [category.name, category])), [hierarchy.categories]);
  const componentByKey = useMemo(() => {
    const result = new Map<string, { category: DeviceLibraryCategoryEntry; component: DeviceLibraryComponentEntry }>();
    for (const category of hierarchy.categories) for (const component of category.components) result.set(deviceLibraryComponentKey(category.name, component.section), { category, component });
    return result;
  }, [hierarchy.categories]);
  const selectedCategory = categoryByName.get(selectedCategoryName) ?? categoryByName.get(orderedCategoryNames[0] ?? "");
  const selectedComponent = componentByKey.get(selectedComponentKey)?.component ?? selectedCategory?.components[0];
  const selectedComponentCategory = selectedComponentKey ? componentByKey.get(selectedComponentKey)?.category : selectedCategory;

  useEffect(() => {
    if (open) setExpandedKeys([]);
  }, [open]);

  useEffect(() => {
    setExpandedKeys((current) => current.filter((key) => orderedCategoryNames.some((name) => key === treeKeyForCategory(name))).slice(-1));
    if (!categoryByName.has(selectedCategoryName)) setSelectedCategoryName(orderedCategoryNames[0] ?? "");
  }, [categoryByName, orderedCategoryNames, selectedCategoryName]);

  useEffect(() => {
    const category = categoryByName.get(selectedCategoryName);
    const component = category?.components[0];
    if (!selectedComponentKey || !componentByKey.has(selectedComponentKey)) setSelectedComponentKey(component ? deviceLibraryComponentKey(category.name, component.section) : "");
  }, [categoryByName, componentByKey, selectedCategoryName, selectedComponentKey]);

  const updateVisibility = (kind: "category" | "component" | "device", key: string, visible: boolean) => {
    const mapKey = kind === "category" ? "categories" : kind === "component" ? "componentLibraries" : "devices";
    onConfigChange({ ...config, [mapKey]: { ...config[mapKey], [key]: visible } });
  };
  const updateTreeOrder = (dragKey: string, dropKey: string, before: boolean) => {
    if (dragKey.startsWith("category:") && dropKey.startsWith("category:")) {
      const next = moveKeyToEdge(categoryKeys, dragKey.slice(9), dropKey.slice(9), before ? "before" : "after");
      if (next) onOrderChange({ ...order, categoryLibraries: next });
      return;
    }
    if (dragKey.startsWith("device:") && dropKey.startsWith("device:")) {
      const dragKind = dragKey.slice(7);
      const dropKind = dropKey.slice(7);
      if (!selectedComponentKeyValue) return;
      const next = reorderDeviceLibraryKeys(deviceKeys, dragKind, dropKind, before);
      if (next) onOrderChange({
        ...order,
        deviceTemplates: { ...order.deviceTemplates, [selectedComponentKeyValue]: next }
      });
      return;
    }
    if (!dragKey.startsWith("component:") || !dropKey.startsWith("component:")) return;
    const dragComponentKey = dragKey.slice(10);
    const dropComponentKey = dropKey.slice(10);
    const dragMeta = componentByKey.get(dragComponentKey);
    const dropMeta = componentByKey.get(dropComponentKey);
    if (!dragMeta || !dropMeta || dragMeta.category.name !== dropMeta.category.name) return;
    const sections = dragMeta.category.components.map((component) => component.section);
    const next = moveKeyToEdge(sections, dragMeta.component.section, dropMeta.component.section, before ? "before" : "after");
    if (next) onOrderChange({ ...order, componentLibraries: { ...order.componentLibraries, [dragMeta.category.name]: next } });
    return;
  };
  const treeData = useMemo<any[]>(() => orderedCategoryNames.map((categoryName) => {
    const category = categoryByName.get(categoryName)!;
    const categoryVisible = isDeviceLibraryCategoryVisible(config, categoryName);
    const componentKeys = category.components.map((component) => component.section);
    const orderedComponents = orderFor(order.componentLibraries?.[categoryName], componentKeys);
    const componentBySection = new Map(category.components.map((component) => [component.section, component]));
    return {
      key: treeKeyForCategory(categoryName),
      title: <CategoryTitle category={category} visible={categoryVisible} onVisibleChange={(visible) => updateVisibility("category", categoryName, visible)} />,
      children: orderedComponents.map((section) => {
        const component = componentBySection.get(section)!;
        const componentKey = deviceLibraryComponentKey(categoryName, section);
        return { key: treeKeyForComponent(categoryName, section), isLeaf: true, disabled: !categoryVisible, title: <ComponentTitle category={categoryName} component={component} visible={isDeviceLibraryComponentVisible(config, componentKey)} disabled={busy || !categoryVisible} onVisibleChange={(visible) => updateVisibility("component", componentKey, visible)} /> };
      })
    };
  }), [busy, categoryByName, config, order.componentLibraries, orderedCategoryNames]);
  const onDrop: TreeProps["onDrop"] = (info) => {
    if (info.dropToGap === false) return;
    updateTreeOrder(String(info.dragNode.key), String(info.node.key), info.dropPosition < 0);
  };
  const selectedComponentKeyValue = selectedComponentCategory && selectedComponent ? deviceLibraryComponentKey(selectedComponentCategory.name, selectedComponent.section) : "";
  const selectedCategoryVisible = selectedComponentCategory ? isDeviceLibraryCategoryVisible(config, selectedComponentCategory.name) : false;
  const selectedComponentVisible = selectedComponent ? isDeviceLibraryComponentVisible(config, selectedComponentKeyValue) : false;
  const deviceKeys = selectedComponent?.templates.map((template) => template.kind) ?? [];
  const orderedDeviceKeys = orderFor(order.deviceTemplates?.[selectedComponentKeyValue], deviceKeys);
  const deviceByKind = new Map((selectedComponent?.templates ?? []).map((template) => [template.kind, template]));
  const handleDeviceDragStart = (event: any, kind: string) => {
    event.dataTransfer?.setData("application/device-library-kind", kind);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  };
  const handleDeviceDrop = (event: any, dropKind: string) => {
    event.preventDefault();
    const dragKind = String(event.dataTransfer?.getData("application/device-library-kind") ?? "");
    if (!dragKind || dragKind === dropKind) return;
    const rect = event.currentTarget?.getBoundingClientRect?.();
    const before = rect ? event.clientY < rect.top + rect.height / 2 : false;
    updateTreeOrder(`device:${dragKind}`, `device:${dropKind}`, before);
  };

  return <Modal className="device-library-display-modal" open={open} title="图元库显示范围" width={980} footer={null} destroyOnHidden onCancel={onClose}><div className="device-library-display-dialog"><p className="device-library-display-intro">左侧选择分类库和类/组件库，拖动树节点调整顺序；右侧管理当前类下的具体图元。父级隐藏时子级整体隐藏；新图元没有配置记录时默认显示。</p><div className="device-library-display-toolbar"><span><Eye size={14}/> 勾选显示</span><span><EyeOff size={14}/> 取消显示</span><span>分类库：{hierarchy.categories.length}</span></div><div className="device-library-display-columns"><section className="device-library-display-pane device-library-display-navigation" aria-label="分类库和组件库"><header className="device-library-display-pane-title">分类库 / 类</header><div className="device-library-display-tree device-library-ant-tree"><Tree treeData={treeData} blockNode draggable showLine selectable autoExpandParent={false} onExpand={(keys) => setExpandedKeys(keys.map(String).slice(-1))} expandedKeys={expandedKeys} selectedKeys={selectedComponentKey ? [treeKeyForComponent(selectedComponentCategory?.name ?? "", selectedComponent?.section ?? "")] : []} onSelect={(keys) => { const key = String(keys[0] ?? ""); if (key.startsWith("component:")) { const value = key.slice(10); setSelectedComponentKey(value); setSelectedCategoryName(componentByKey.get(value)?.category.name ?? ""); } }} onDrop={onDrop} allowDrop={({ dropPosition }) => dropPosition !== 0} /></div></section><section className="device-library-display-pane device-library-display-devices" aria-label="具体图元"><header className="device-library-display-pane-title">{selectedComponentCategory && selectedComponent ? `${selectedComponentCategory.name} / ${selectedComponent.label}` : "选择一个类/组件库"}</header><div className="device-library-display-tree">{selectedComponent && orderedDeviceKeys.length > 0 ? orderedDeviceKeys.map((kind) => { const template = deviceByKind.get(kind); if (!template) return null; const key = deviceLibraryTemplateKey(selectedComponentCategory!.name, selectedComponent!.section, kind); const visible = isDeviceLibraryTemplateVisible(config, key); const effectiveVisible = visible && selectedCategoryVisible && selectedComponentVisible; const preview = buildDeviceLibraryPreview(template.template); return <label className={`device-library-display-device-row${effectiveVisible ? " selected" : ""}${!selectedCategoryVisible || !selectedComponentVisible ? " inherited-hidden" : ""}`} key={key} draggable={!busy && selectedCategoryVisible && selectedComponentVisible} onDragStart={(event) => handleDeviceDragStart(event, kind)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDeviceDrop(event, kind)}><input className="device-library-display-card-checkbox" type="checkbox" checked={visible} disabled={busy || !selectedCategoryVisible || !selectedComponentVisible} onChange={(event) => updateVisibility("device", key, event.target.checked)} aria-label={`显示${template.label}`}/><span className={`device-library-card-selection-corner${effectiveVisible ? " is-visible" : " is-hidden"}`} aria-hidden="true">{effectiveVisible ? <Check size={12} strokeWidth={3} /> : <EyeOff size={12} strokeWidth={2.5} />}</span><span className="device-library-display-icon" aria-hidden="true"><svg viewBox="-60 -45 120 90" focusable="false"><g transform={`scale(${preview.scale})`}><MemoDeviceGlyph node={preview.node} miniature={preview.miniature} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} /></g></svg></span><span className="device-library-display-device-name" title={template.label || kind}>{template.label || kind}</span><code>{kind}</code></label>; }) : <div className="device-library-display-empty">请在左侧选择一个类/组件库。</div>}</div></section></div><div className="device-library-display-footer"><button type="button" onClick={onClose}>关闭</button></div></div></Modal>;
}
