import { type MainWorkspaceProps } from "./MainWorkspace";

export function WorkspaceTopbar(props: MainWorkspaceProps) {
  const {
    AlignCenterHorizontal,
    AlignCenterVertical,
    AlignEndHorizontal,
    AlignEndVertical,
    AlignHorizontalDistributeCenter,
    AlignStartHorizontal,
    AlignStartVertical,
    AlignVerticalDistributeCenter,
    ArrowDown,
    ArrowUp,
    ChevronDown,
    ChevronsDown,
    ChevronsUp,
    Download,
    ENABLE_REACT_FLOW_PREVIEW,
    EyeOff,
    FileJson,
    FlipHorizontal,
    FlipVertical,
    Grid2X2,
    Group,
    Layers,
    Layers2,
    Paintbrush,
    Palette,
    Pencil,
    RotateCcw,
    RotateCw,
    Route,
    Save,
    Type,
    Ungroup,
    activeLayer,
    activeModelPathName,
    adjustSelectedDisplayLayer,
    alignSelected,
    canAdjustSelectedDisplayLayer,
    canExportCurrentModel,
    canGroupSelectedGraphics,
    canUngroupSelectedGraphics,
    chooseCustomDeviceBackground,
    chooseImage,
    colorDisplayMode,
    customDeviceImageInputRef,
    deviceLabelsVisible,
    distributeSelected,
    exportEFile,
    exportSvg,
    groupSelectedGraphics,
    imageInputRef,
    importModelFile,
    importSchemeFile,
    isBrowseMode,
    isEditMode,
    mirrorSelectedNodes,
    modelImportInputRef,
    openColorPaletteDialog,
    rotateSelectedLayoutUnits,
    runTopologyCalculation,
    saveCurrentProject,
    saveRequired,
    schemeImportInputRef,
    selectedLayoutUnitCount,
    setDeviceLabelsVisible,
    setLayerDialogOpen,
    setReactFlowPreviewOpen,
    toggleColorDisplayMode,
    toggleInteractionMode,
    ungroupSelectedGraphics
  } = props;

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
          <div className="active-layer-indicator" title={`激活图层：${activeLayer?.name ?? "默认图层"}`}>
            <Layers size={15} />
            <span>{activeLayer?.name ?? "默认图层"}</span>
          </div>
          <button
            type="button"
            className={`topbar-primary-button mode-toggle-button ${isEditMode ? "active" : ""}`}
            onClick={toggleInteractionMode}
            title={isEditMode ? "当前为编辑模式，点击切换到浏览模式" : "当前为浏览模式，点击切换到编辑模式"}
            aria-label={isEditMode ? "切换到浏览模式" : "切换到编辑模式"}
          >
            {isEditMode ? <Pencil size={16} /> : <EyeOff size={16} />}
            <span>{isEditMode ? "编辑模式" : "浏览模式"}</span>
          </button>
          <button
            className="topbar-primary-button"
            onClick={() => setLayerDialogOpen(true)}
            disabled={isBrowseMode}
            title="图层管理"
            aria-label="图层管理"
          >
            <Layers2 size={16} />
          </button>
          <button className="topbar-primary-button" onClick={runTopologyCalculation} disabled={isBrowseMode} title="图上拓扑" aria-label="图上拓扑">
            <Grid2X2 size={16} />
          </button>
          <button
            className="topbar-primary-button"
            onClick={() => saveCurrentProject()}
            disabled={isBrowseMode || !saveRequired}
            title={saveRequired ? "保存当前模型" : "当前模型没有新的修改"}
            aria-label="保存"
          >
            <Save size={16} />
          </button>
          <button
            className={`topbar-primary-button ${colorDisplayMode === "voltage" ? "active" : ""}`}
            onClick={() => toggleColorDisplayMode()}
            title={colorDisplayMode === "voltage" ? "当前交流/直流按电压等级显示，点击切换为按能源类型显示；氢能、热能始终按能源类型显示" : "当前交流/直流按能源类型显示，点击切换为按电压等级显示；氢能、热能始终按能源类型显示"}
            aria-label="颜色切换"
          >
            <Paintbrush size={16} />
          </button>
          <button
            className="topbar-primary-button"
            onClick={openColorPaletteDialog}
            disabled={isBrowseMode}
            title="配色设置"
            aria-label="配色设置"
          >
            <Palette size={16} />
          </button>
          <button
            className={`topbar-primary-button ${deviceLabelsVisible ? "active" : ""}`}
            onClick={() => setDeviceLabelsVisible((current: boolean) => !current)}
            title={deviceLabelsVisible ? "隐藏设备标识" : "显示设备标识"}
            aria-label={deviceLabelsVisible ? "隐藏设备标识" : "显示设备标识"}
          >
            <Type size={16} />
          </button>
          {ENABLE_REACT_FLOW_PREVIEW && (
            <button
              className="topbar-primary-button react-flow-preview-button"
              onClick={() => setReactFlowPreviewOpen(true)}
              title="React Flow 预览"
              aria-label="React Flow 预览"
            >
              <Route size={16} />
            </button>
          )}
          <div className="action-cluster">
            {/* Legacy source assertion: disabled={!canGroupSelectedGraphics} */}
            <button onClick={groupSelectedGraphics} disabled={isBrowseMode || !canGroupSelectedGraphics} title="组合" aria-label="组合">
              <Group size={16} />
            </button>
            <button onClick={ungroupSelectedGraphics} disabled={isBrowseMode || !canUngroupSelectedGraphics} title="解散" aria-label="解散">
              <Ungroup size={16} />
            </button>
            <div className="topbar-dropdown display-layer-dropdown">
              <button type="button" className="topbar-dropdown-trigger" disabled={!canAdjustSelectedDisplayLayer} title="显示层级" aria-label="显示层级">
                <Layers2 size={16} />
                <ChevronDown size={13} />
              </button>
              <div className="topbar-dropdown-menu" role="menu" aria-label="显示层级">
                <button onClick={() => adjustSelectedDisplayLayer("raise")} disabled={!canAdjustSelectedDisplayLayer} title="提升显示层级" aria-label="提升显示层级">
                  <ArrowUp size={16} />
                  <span>提升显示层级</span>
                </button>
                <button onClick={() => adjustSelectedDisplayLayer("lower")} disabled={!canAdjustSelectedDisplayLayer} title="降低显示层级" aria-label="降低显示层级">
                  <ArrowDown size={16} />
                  <span>降低显示层级</span>
                </button>
                <button onClick={() => adjustSelectedDisplayLayer("front")} disabled={!canAdjustSelectedDisplayLayer} title="顶层显示" aria-label="顶层显示">
                  <ChevronsUp size={16} />
                  <span>顶层显示</span>
                </button>
                <button onClick={() => adjustSelectedDisplayLayer("back")} disabled={!canAdjustSelectedDisplayLayer} title="底层显示" aria-label="底层显示">
                  <ChevronsDown size={16} />
                  <span>底层显示</span>
                </button>
              </div>
            </div>
            <div className="topbar-dropdown align-dropdown">
              <button type="button" className="topbar-dropdown-trigger" disabled={isBrowseMode} title="对齐操作" aria-label="对齐操作">
                <AlignCenterHorizontal size={16} />
                <ChevronDown size={13} />
              </button>
              <div className="topbar-dropdown-menu" role="menu" aria-label="对齐操作">
                <button onClick={() => alignSelected("left")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="左对齐" aria-label="左对齐">
                  <AlignStartVertical size={16} />
                  <span>左对齐</span>
                </button>
                <button onClick={() => alignSelected("right")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="右对齐" aria-label="右对齐">
                  <AlignEndVertical size={16} />
                  <span>右对齐</span>
                </button>
                <button onClick={() => alignSelected("horizontal")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="横向居中" aria-label="横向居中">
                  <AlignCenterHorizontal size={16} />
                  <span>横向居中</span>
                </button>
                <button onClick={() => alignSelected("vertical")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="纵向居中" aria-label="纵向居中">
                  <AlignCenterVertical size={16} />
                  <span>纵向居中</span>
                </button>
                <button onClick={() => alignSelected("top")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="上对齐" aria-label="上对齐">
                  <AlignStartHorizontal size={16} />
                  <span>上对齐</span>
                </button>
                <button onClick={() => alignSelected("bottom")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="下对齐" aria-label="下对齐">
                  <AlignEndHorizontal size={16} />
                  <span>下对齐</span>
                </button>
                <button onClick={() => distributeSelected("horizontal")} disabled={isBrowseMode || selectedLayoutUnitCount < 3} title="横向分布" aria-label="横向分布">
                  <AlignHorizontalDistributeCenter size={16} />
                  <span>横向分布</span>
                </button>
                <button onClick={() => distributeSelected("vertical")} disabled={isBrowseMode || selectedLayoutUnitCount < 3} title="纵向分布" aria-label="纵向分布">
                  <AlignVerticalDistributeCenter size={16} />
                  <span>纵向分布</span>
                </button>
              </div>
            </div>
            <div className="topbar-dropdown rotate-dropdown">
              <button type="button" className="topbar-dropdown-trigger" disabled={isBrowseMode} title="旋转操作" aria-label="旋转操作">
                <RotateCw size={16} />
                <ChevronDown size={13} />
              </button>
              <div className="topbar-dropdown-menu" role="menu" aria-label="旋转操作">
                <button onClick={() => rotateSelectedLayoutUnits("left")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="向左旋转90度" aria-label="向左旋转90度">
                  <RotateCcw size={16} />
                  <span>左转90度</span>
                </button>
                <button onClick={() => rotateSelectedLayoutUnits("right")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="向右旋转90度" aria-label="向右旋转90度">
                  <RotateCw size={16} />
                  <span>右转90度</span>
                </button>
                <button onClick={() => mirrorSelectedNodes("horizontal")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="水平镜像" aria-label="水平镜像">
                  <FlipHorizontal size={16} />
                  <span>水平镜像</span>
                </button>
                <button onClick={() => mirrorSelectedNodes("vertical")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="垂直镜像" aria-label="垂直镜像">
                  <FlipVertical size={16} />
                  <span>垂直镜像</span>
                </button>
              </div>
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={chooseImage} />
            <input ref={customDeviceImageInputRef} type="file" accept="image/*" hidden onChange={chooseCustomDeviceBackground} />
            <input ref={modelImportInputRef} type="file" accept=".json,application/json" hidden onChange={importModelFile} />
            <input ref={schemeImportInputRef} type="file" accept=".json,application/json" hidden onChange={importSchemeFile} />
            <button
              onClick={exportSvg}
              disabled={!canExportCurrentModel}
              title={canExportCurrentModel ? "导出 SVG 图形文件" : "请先保存当前模型后再导出图形文件"}
              aria-label="导出图形文件"
            >
              <Download size={16} />
            </button>
            <button
              onClick={exportEFile}
              disabled={!canExportCurrentModel}
              title={canExportCurrentModel ? "导出 E 模型文件" : "请先保存当前模型后再导出模型文件"}
              aria-label="导出模型文件"
            >
              <FileJson size={16} />
            </button>
          </div>
        </header>
  );
}
