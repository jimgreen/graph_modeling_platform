import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Tooltip } from "antd";
import { MemoizedViewSection } from "./appViewRenderBoundary";
import { createNodeFromTemplate } from "../model-node-ops";
import { MemoDeviceGlyph } from "../DeviceGlyph";

type AppTopbarProps = {
  scope: Record<string, any>;
  inputs: readonly unknown[];
};

export function AppTopbar({ scope, inputs }: AppTopbarProps) {
  return (
    <MemoizedViewSection
      section="topbar"
      inputs={inputs}
      render={() => <AppTopbarContent scope={scope} />}
    />
  );
}

function RuntimeWsIndicator({ scope }: { scope: Record<string, any> }) {
  const status = scope.runtimeWsStatus ?? "connecting";
  const blinkSeq = scope.runtimeWsBlinkSeq ?? 0;
  const clientId = scope.runtimeWsClientId ?? "";
  const [copied, setCopied] = useState(false);
  const color = status === "open" ? "#22c55e" : status === "connecting" ? "#f59e0b" : "#9ca3af";
  const label = status === "open" ? "运行时态 WS 已连接" : status === "connecting" ? "运行时态 WS 连接中" : "运行时态 WS 已断开";
  const copyClientId = async () => {
    if (!clientId) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(clientId);
      ok = true;
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = clientId;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        ok = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        // Clipboard access is optional for the runtime status indicator.
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 10, padding: "0 8px", fontSize: 12, color: "#6b7280", cursor: clientId ? "pointer" : "default", userSelect: "none", position: "relative" }}
      title={clientId ? `点击复制 clientId：${clientId}` : label}
      onClick={copyClientId}
    >
      <span key={blinkSeq} style={{
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
        animation: "runtime-ws-blink 0.6s ease-out"
      }}/>
      <span>RT-WS</span>
      {copied && (
        <span style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 6,
          background: "#22c55e",
          color: "#fff",
          padding: "3px 10px",
          borderRadius: 4,
          fontSize: 12,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 1000,
          pointerEvents: "none"
        }}>已复制</span>
      )}
      <style>{`@keyframes runtime-ws-blink { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.8); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }`}</style>
    </span>
  );
}

function AppTopbarContent({ scope }: { scope: Record<string, any> }) {
  const {
    AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical,
    AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical,
    AlignVerticalDistributeCenter, ArrowDown, ArrowUp, Bell, Cable, ChevronDown,
    ChevronRight, ChevronsDown, ChevronsUp, Download, FileJson, FlipHorizontal,
    FlipVertical, FolderOpen, Grid2X2, Group, Layers, Layers2, Network, Paintbrush,
    Palette, Pencil, RotateCcw, RotateCw, Save, Settings2, Type, Ungroup, Zap,
    activeLayer, activeModelPathName, adjustSelectedDisplayLayer, alignSelected,
    canAdjustSelectedDisplayLayer, canGroupSelectedGraphics, canUngroupSelectedGraphics,
    chooseCustomDeviceBackground, chooseDefinitionTemplateIcon, chooseImage,
    chooseStateIconDrawingImport, chooseStateVisualImage, colorDisplayMode,
    customComponentSvgImportInputRef, customDeviceImageInputRef,
    definitionTemplateIconInputRef, deviceLabelsVisible, deviceMeasurementsVisible, distributeSelected,
    eDeviceDefinitionInterfaceDialogOpen,
    exportEFile, exportJsonFile, exportSvg, exportSvgFile, groupSelectedGraphics,
    imageInputRef, importCustomComponentSvg, importModelFile, importSchemeFile,
    isBrowseMode, isEditMode, layerManagementDropdownRef, mirrorSelectedNodes,
    modelImportInputRef, openColorPaletteDialog, openTopologyWarningPanel,
    openUserCustomizationManager, requestEncodedExport, renderLayerManager,
    rotateSelectedLayoutUnits, runTopologyCalculation, saveCurrentProject,
    saveRequired, schemeImportInputRef, selectedLayoutUnitCount,
    setDeviceLabelsVisible, setDeviceMeasurementsVisible, setEDeviceDefinitionInterfaceDialogOpen, setImageTarget,
    setSmartAlignmentEnabled, setVoltageLevelDialogOpen, smartAlignmentEnabled,
    stateIconDrawingImportInputRef, stateVisualImageInputRef, toggleColorDisplayMode,
    toggleInteractionMode, topologyErrors, topologyWarningPanelClosed,
    ungroupSelectedGraphics
  } = scope;

  // 即时 tooltip 包装：鼠标进入立刻显示，离开立刻消失
  const T = (title: string, child: React.ReactNode, extra?: Record<string, any>) => (
    <Tooltip title={title} mouseEnterDelay={0} mouseLeaveDelay={0}>
      {child}
    </Tooltip>
  );

  return (
    <header className="topbar">
      <div className="brand topbar-brand">
        <div className="brand-mark">PS</div>
        <div>
          <h1>电力能源系统图上建模平台</h1>
          <p>拖拽建模、拓扑关联、参数维护</p>
        </div>
      </div>
      <div className="topbar-model" title={`当前模型：${activeModelPathName}`}>
        <span>当前模型</span>
        <strong>{activeModelPathName}</strong>
      </div>
      <div ref={layerManagementDropdownRef} className="topbar-dropdown layer-management-dropdown">
        {T(`激活图层：${activeLayer?.name ?? "默认图层"}`, <button type="button" className="topbar-dropdown-trigger layer-management-trigger" disabled={isBrowseMode} aria-label="图层管理">
          <Layers size={15}/>
          <span>{activeLayer?.name ?? "默认图层"}</span>
          <ChevronDown size={13}/>
        </button>)}
        <div className="topbar-dropdown-menu layer-management-dropdown-menu" role="menu" aria-label="图层管理">
          {renderLayerManager()}
        </div>
      </div>
      {T(isEditMode ? "当前为编辑模式，点击切换到浏览模式" : "当前为浏览模式，点击切换到编辑模式", <button type="button" className={`topbar-primary-button ${isEditMode ? "active" : "browse-mode-toggle"}`} onClick={toggleInteractionMode} aria-label={isEditMode ? "切换到浏览模式" : "切换到编辑模式"}>
        {isEditMode ? <Pencil size={16}/> : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <line x1="2" y1="2" x2="22" y2="22"/>
          </svg>
        )}
      </button>)}
      {T(smartAlignmentEnabled ? "对齐到标线已开启，点击关闭" : "对齐到标线已关闭，点击开启", <button type="button" className={`topbar-primary-button ${smartAlignmentEnabled ? "active" : ""}`} onClick={() => setSmartAlignmentEnabled((current: boolean) => !current)} aria-label={smartAlignmentEnabled ? "关闭对齐到标线" : "开启对齐到标线"}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="2" y="5" width="12" height="6" rx="1"/>
          <line x1="8" y1="0" x2="8" y2="16" strokeDasharray="2 2"/>
        </svg>
      </button>)}
      {T("图上拓扑", <button className="topbar-primary-button" onClick={runTopologyCalculation} disabled={isBrowseMode} aria-label="图上拓扑">
        <Grid2X2 size={16}/>
      </button>)}
      {T(scope.globalLineListOpen ? "隐藏全局线路列表" : "显示全局线路列表", <button className={`topbar-primary-button ${scope.globalLineListOpen ? "active" : ""}`} onClick={() => scope.setGlobalLineListOpen((current: boolean) => !current)} aria-label="全局线路" aria-pressed={Boolean(scope.globalLineListOpen)}>
        <Cable size={16}/>
      </button>)}
      {T(scope.allNetworkTopologyDialogOpen ? "隐藏全网拓扑窗口" : "显示全网拓扑窗口", <button className={`topbar-primary-button ${scope.allNetworkTopologyDialogOpen ? "active" : ""}`} onClick={() => scope.setAllNetworkTopologyDialogOpen((current: boolean) => !current)} aria-label="全网拓扑" aria-pressed={Boolean(scope.allNetworkTopologyDialogOpen)}>
        <Network size={16}/>
      </button>)}
      {T(topologyErrors.length > 0 ? "显示告警窗口" : "当前没有拓扑告警", <button className={`topbar-primary-button ${topologyErrors.length > 0 && !topologyWarningPanelClosed ? "active" : ""}`} onClick={openTopologyWarningPanel} disabled={topologyErrors.length === 0} aria-label="告警窗口">
        <Bell size={16}/>
      </button>)}
      {T(colorDisplayMode === "voltage" ? "当前交流/直流按电压等级显示，点击切换为按能源类型显示；氢能、热能始终按能源类型显示" : "当前交流/直流按能源类型显示，点击切换为按电压等级显示；氢能、热能始终按能源类型显示", <button className={`topbar-primary-button ${colorDisplayMode === "voltage" ? "active" : ""}`} onClick={() => toggleColorDisplayMode()} aria-label="颜色切换">
        <Paintbrush size={16}/>
      </button>)}
      {T("配色设置", <button className="topbar-primary-button" onClick={openColorPaletteDialog} disabled={isBrowseMode} aria-label="配色设置"><Palette size={16}/></button>)}
      {T("电压等级设置", <button className="topbar-primary-button" onClick={() => setVoltageLevelDialogOpen(true)} disabled={isBrowseMode} aria-label="电压等级设置"><Zap size={16}/></button>)}
      {T(deviceLabelsVisible ? "隐藏设备标识" : "显示设备标识", <button className={`topbar-primary-button ${deviceLabelsVisible ? "active" : ""}`} onClick={() => setDeviceLabelsVisible((current: boolean) => !current)} aria-label={deviceLabelsVisible ? "隐藏设备标识" : "显示设备标识"}><Type size={16}/></button>)}
      {T(deviceMeasurementsVisible ? "隐藏设备量测" : "显示设备量测", <button className={`topbar-primary-button ${deviceMeasurementsVisible ? "active" : ""}`} onClick={() => setDeviceMeasurementsVisible((current: boolean) => !current)} aria-label={deviceMeasurementsVisible ? "隐藏设备量测" : "显示设备量测"} style={{ fontWeight: 700, fontSize: 16, fontFamily: "'Times New Roman', Times, serif" }}>M</button>)}
      {T("分类图标库", <button className="topbar-primary-button" onClick={() => setImageTarget({ kind: "canvasIcon" })} disabled={isBrowseMode} aria-label="分类图标库"><FolderOpen size={16}/></button>)}
      <div className="topbar-center-actions">
        {T("用户自定义修改管理", <button className="topbar-primary-button" onClick={() => void openUserCustomizationManager()} disabled={isBrowseMode} aria-label="用户自定义修改管理"><Settings2 size={16}/></button>)}
        {T(saveRequired ? "保存当前模型" : "当前模型没有新的修改", <button className="topbar-primary-button" onClick={() => void saveCurrentProject()} disabled={isBrowseMode || !saveRequired} aria-label="保存"><Save size={16}/></button>)}
        {T("打开 E 文件接口定义", <button className={`topbar-primary-button ${eDeviceDefinitionInterfaceDialogOpen ? "active" : ""}`} onClick={() => setEDeviceDefinitionInterfaceDialogOpen(true)} aria-label="打开 E 文件接口定义" aria-pressed={Boolean(eDeviceDefinitionInterfaceDialogOpen)}><FileJson size={16}/></button>)}
        <div className="topbar-dropdown export-dropdown">
          {T("导出文件", <button type="button" className="topbar-primary-button" aria-label="导出文件" aria-haspopup="menu"><Download size={16}/></button>)}
          <div className="topbar-dropdown-menu" role="menu" aria-label="导出选项">
            {[
              { key: "bundle", label: "导出 E、JSON 和 SVG", icon: <Download size={16}/>, action: exportSvg, validatesEInterface: true },
              { key: "e", label: "导出 E 文件", icon: <FileJson size={16}/>, action: exportEFile, validatesEInterface: true },
              { key: "svg", label: "导出 SVG", icon: <Download size={16}/>, action: exportSvgFile, validatesEInterface: false },
              { key: "json", label: "导出 JSON", icon: <Download size={16}/>, action: exportJsonFile, validatesEInterface: false }
            ].map((item) => (
              <div className="export-menu-item" key={item.key}>
                <button type="button" className="export-menu-trigger" title={item.label} aria-label={item.label} aria-haspopup="menu">{item.icon}<span>{item.label}</span><ChevronRight className="export-submenu-chevron" size={14}/></button>
                <div className="export-encoding-submenu" role="menu" aria-label={`${item.label}字符编码`}>
                  <button type="button" role="menuitem" onClick={() => requestEncodedExport(item.action, "utf-8", item.validatesEInterface)} aria-label={`${item.label}，UTF-8 编码`}>UTF-8</button>
                  <button type="button" role="menuitem" onClick={() => requestEncodedExport(item.action, "gbk", item.validatesEInterface)} aria-label={`${item.label}，GBK 编码`}>GBK</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="action-cluster">
        <div className="topbar-dropdown group-dropdown">
          {T("组合操作", <button type="button" className="topbar-dropdown-trigger" disabled={isBrowseMode || (!canGroupSelectedGraphics && !canUngroupSelectedGraphics)} aria-label="组合操作"><Group size={16}/><ChevronDown size={13}/></button>)}
          <div className="topbar-dropdown-menu" role="menu" aria-label="组合操作">
            <button onClick={groupSelectedGraphics} disabled={isBrowseMode || !canGroupSelectedGraphics} title="组合" aria-label="组合"><Group size={16}/><span>组合</span></button>
            <button onClick={ungroupSelectedGraphics} disabled={isBrowseMode || !canUngroupSelectedGraphics} title="解除组合" aria-label="解除组合"><Ungroup size={16}/><span>解除组合</span></button>
          </div>
        </div>
        <div className="topbar-dropdown display-layer-dropdown">
          {T("显示层级", <button type="button" className="topbar-dropdown-trigger" disabled={!canAdjustSelectedDisplayLayer} aria-label="显示层级"><Layers2 size={16}/><ChevronDown size={13}/></button>)}
          <div className="topbar-dropdown-menu" role="menu" aria-label="显示层级">
            <button onClick={() => adjustSelectedDisplayLayer("raise")} disabled={!canAdjustSelectedDisplayLayer} title="提升显示层级" aria-label="提升显示层级"><ArrowUp size={16}/><span>提升显示层级</span></button>
            <button onClick={() => adjustSelectedDisplayLayer("lower")} disabled={!canAdjustSelectedDisplayLayer} title="降低显示层级" aria-label="降低显示层级"><ArrowDown size={16}/><span>降低显示层级</span></button>
            <button onClick={() => adjustSelectedDisplayLayer("front")} disabled={!canAdjustSelectedDisplayLayer} title="顶层显示" aria-label="顶层显示"><ChevronsUp size={16}/><span>顶层显示</span></button>
            <button onClick={() => adjustSelectedDisplayLayer("back")} disabled={!canAdjustSelectedDisplayLayer} title="底层显示" aria-label="底层显示"><ChevronsDown size={16}/><span>底层显示</span></button>
          </div>
        </div>
        <div className="topbar-dropdown align-dropdown">
          {T("对齐操作", <button type="button" className="topbar-dropdown-trigger" disabled={isBrowseMode} aria-label="对齐操作"><AlignCenterHorizontal size={16}/><ChevronDown size={13}/></button>)}
          <div className="topbar-dropdown-menu" role="menu" aria-label="对齐操作">
            <button onClick={() => alignSelected("left")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="左对齐" aria-label="左对齐"><AlignStartVertical size={16}/><span>左对齐</span></button>
            <button onClick={() => alignSelected("right")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="右对齐" aria-label="右对齐"><AlignEndVertical size={16}/><span>右对齐</span></button>
            <button onClick={() => alignSelected("horizontal")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="横向居中" aria-label="横向居中"><AlignCenterHorizontal size={16}/><span>横向居中</span></button>
            <button onClick={() => alignSelected("vertical")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="纵向居中" aria-label="纵向居中"><AlignCenterVertical size={16}/><span>纵向居中</span></button>
            <button onClick={() => alignSelected("top")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="上对齐" aria-label="上对齐"><AlignStartHorizontal size={16}/><span>上对齐</span></button>
            <button onClick={() => alignSelected("bottom")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="下对齐" aria-label="下对齐"><AlignEndHorizontal size={16}/><span>下对齐</span></button>
            <button onClick={() => distributeSelected("horizontal")} disabled={isBrowseMode || selectedLayoutUnitCount < 3} title="横向分布" aria-label="横向分布"><AlignHorizontalDistributeCenter size={16}/><span>横向分布</span></button>
            <button onClick={() => distributeSelected("vertical")} disabled={isBrowseMode || selectedLayoutUnitCount < 3} title="纵向分布" aria-label="纵向分布"><AlignVerticalDistributeCenter size={16}/><span>纵向分布</span></button>
          </div>
        </div>
        <div className="topbar-dropdown rotate-dropdown">
          {T("旋转操作", <button type="button" className="topbar-dropdown-trigger" disabled={isBrowseMode} aria-label="旋转操作"><RotateCw size={16}/><ChevronDown size={13}/></button>)}
          <div className="topbar-dropdown-menu" role="menu" aria-label="旋转操作">
            <button onClick={() => rotateSelectedLayoutUnits("left")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="向左旋转90度" aria-label="向左旋转90度"><RotateCcw size={16}/><span>左转90度</span></button>
            <button onClick={() => rotateSelectedLayoutUnits("right")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="向右旋转90度" aria-label="向右旋转90度"><RotateCw size={16}/><span>右转90度</span></button>
            <button onClick={() => mirrorSelectedNodes("horizontal")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="水平镜像" aria-label="水平镜像"><FlipHorizontal size={16}/><span>水平镜像</span></button>
            <button onClick={() => mirrorSelectedNodes("vertical")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="垂直镜像" aria-label="垂直镜像"><FlipVertical size={16}/><span>垂直镜像</span></button>
          </div>
        </div>
        <input ref={imageInputRef} type="file" accept="image/*,.svg,image/svg+xml" data-image-import-kind="image" hidden multiple onChange={chooseImage}/>
        <input ref={scope.imageArchiveInputRef} type="file" accept=".docx,.docm,.pptx,.pptm,.ppsx,.ppsm,.xlsx,.xlsm,.vsdx,.wps,.dps,.zip" data-image-import-kind="archive" hidden multiple onChange={chooseImage}/>
        <input ref={customDeviceImageInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseCustomDeviceBackground}/>
        <input ref={customComponentSvgImportInputRef} type="file" accept=".svg,image/svg+xml" hidden onChange={importCustomComponentSvg}/>
        <input ref={definitionTemplateIconInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseDefinitionTemplateIcon}/>
        <input ref={stateVisualImageInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseStateVisualImage}/>
        <input ref={stateIconDrawingImportInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseStateIconDrawingImport}/>
        <input ref={modelImportInputRef} type="file" accept=".json,application/json" hidden onChange={importModelFile}/>
        <input ref={scope.svgModelImportInputRef} type="file" accept=".svg,image/svg+xml" hidden onChange={scope.importSvgModelFile}/>
        <input ref={schemeImportInputRef} type="file" accept=".zip,application/zip,.json,application/json" hidden onChange={importSchemeFile}/>
        <input ref={scope.libraryPackageImportInputRef} type="file" accept=".json,application/json" hidden onChange={scope.importLibraryPackageFile}/>
        <input ref={scope.userCustomizationImportInputRef} type="file" accept=".json,application/json" hidden onChange={scope.importUserCustomizationFile}/>
      </div>
      <RuntimeWsIndicator scope={scope}/>
    </header>
  );
}

type RecentGlyphsToolbarProps = {
  scope: Record<string, any>;
};

export const RecentGlyphsToolbar = memo(function RecentGlyphsToolbar({ scope }: RecentGlyphsToolbarProps) {
  const recentGlyphKinds: string[] = scope.recentGlyphKinds ?? [];
  const libraryTemplates: readonly any[] = scope.libraryTemplates ?? [];
  const [offsetX, setOffsetX] = useState(0);
  const dragRef = useRef<{ startX: number; startOffsetX: number } | null>(null);
  const offsetXRef = useRef(offsetX);
  offsetXRef.current = offsetX;

  const templateByKind = useMemo(() => {
    const map = new Map<string, any>();
    for (const t of libraryTemplates) map.set(t.kind, t);
    return map;
  }, [libraryTemplates]);

  const nodesByKind = useMemo(() => {
    const map = new Map<string, any>();
    for (const kind of recentGlyphKinds) {
      const template = templateByKind.get(kind);
      if (template) map.set(kind, createNodeFromTemplate(template, { x: 0, y: 0 }));
    }
    return map;
  }, [templateByKind, recentGlyphKinds]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startOffsetX: offsetXRef.current };
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      setOffsetX(dragRef.current.startOffsetX + (ev.clientX - dragRef.current.startX));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  if (recentGlyphKinds.length === 0) return null;

  return (
    <div
      className="recent-glyphs-toolbar"
      style={{ "--rg-drag-x": `${offsetX}px` } as React.CSSProperties}
    >
      <div className="recent-glyphs-items">
        {recentGlyphKinds.map((kind) => {
          const template = templateByKind.get(kind);
          if (!template) return null;
          const node = nodesByKind.get(kind);
          if (!node) return null;
          const tw = template.size?.width ?? 40;
          const th = template.size?.height ?? 40;
          const maxDim = Math.max(tw, th);
          const pad = maxDim * 0.15;
          const vb = `${-tw / 2 - pad} ${-th / 2 - pad} ${tw + pad * 2} ${th + pad * 2}`;
          return (
            <button
              key={kind}
              type="button"
              className="recent-glyph-item"
              title={template.label}
              aria-label={template.label}
              onClick={() => scope.startLibraryDevicePlacement?.(template)}
            >
              <svg width="28" height="28" viewBox={vb}>
                <MemoDeviceGlyph node={node} colorDisplayMode={scope.colorDisplayMode} colorPalette={scope.colorPalette} />
              </svg>
            </button>
          );
        })}
      </div>
      <div
        className="recent-glyphs-drag-handle"
        onPointerDown={handleDragStart}
        title="拖动工具栏"
        aria-label="拖动工具栏"
      >
        <svg width="8" height="16" viewBox="0 0 8 16">
          <circle cx="2" cy="3" r="1.2" fill="currentColor" />
          <circle cx="6" cy="3" r="1.2" fill="currentColor" />
          <circle cx="2" cy="8" r="1.2" fill="currentColor" />
          <circle cx="6" cy="8" r="1.2" fill="currentColor" />
          <circle cx="2" cy="13" r="1.2" fill="currentColor" />
          <circle cx="6" cy="13" r="1.2" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
});
