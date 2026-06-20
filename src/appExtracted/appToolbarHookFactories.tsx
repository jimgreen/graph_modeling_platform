// @ts-nocheck
import { clampNumber } from "../canvasViewport";

export function createOpenNodeDoubleClickEditor(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { NODE_DOUBLE_CLICK_DIALOG_DEDUPE_MS, activeLayerNodeIdSet, cloneNodeForDoubleClickDraft, doubleClickDialogKindForNode, flushSync, isEditMode, nodeDoubleClickCloseSuppressUntilRef, nodeDoubleClickDialog, nodeDoubleClickOpenGuardRef, selectCanvasGraphics, setContextMenu, setImageTarget, setNodeDoubleClickDialog, setNodeDoubleClickDraft } = __appScope;
    if (!isEditMode || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    const editorKind = doubleClickDialogKindForNode(node);
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    const guardKey = `${node.id}:${editorKind}`;
    if (now < nodeDoubleClickCloseSuppressUntilRef.current) {
      return;
    }
    if (
      nodeDoubleClickOpenGuardRef.current?.key === guardKey &&
      now - nodeDoubleClickOpenGuardRef.current.time < NODE_DOUBLE_CLICK_DIALOG_DEDUPE_MS
    ) {
      return;
    }
    if (
      nodeDoubleClickDialog?.kind === editorKind &&
      nodeDoubleClickDialog.nodeId === node.id
    ) {
      nodeDoubleClickOpenGuardRef.current = { key: guardKey, time: now };
      return;
    }
    nodeDoubleClickOpenGuardRef.current = { key: guardKey, time: now };
    flushSync(() => {
      selectCanvasGraphics([node.id], []);
    });
    setContextMenu(null);
    setImageTarget(null);
    setNodeDoubleClickDialog(null);
    setNodeDoubleClickDraft(null);
    if (editorKind === "image") {
      setImageTarget({ kind: "node", nodeId: node.id });
      return;
    }
    if (editorKind === "interaction" || editorKind === "text" || editorKind === "device") {
      setNodeDoubleClickDraft({ nodeId: node.id, node: cloneNodeForDoubleClickDraft(node) });
      setNodeDoubleClickDialog({ kind: editorKind, nodeId: node.id });
      return;
    }
    window.alert("当前图元没有双击定义。");
  };
}

export function createHandleLodNodeDoubleClick(__appScope: Record<string, any>) {
  return (event: MouseEvent<SVGGElement>) => {
  const { lodNodeFromEvent, openNodeDoubleClickEditor } = __appScope;
    const node = lodNodeFromEvent(event);
    if (!node) {
      return;
    }
    event.stopPropagation();
    openNodeDoubleClickEditor(node);
  };
}

export function createClampFloatingToolbarPosition(__appScope: Record<string, any>) {
  return (x: number, y: number, width: number, height: number) => {
  const { clampNumber, floatingToolbarPadding, floatingToolbarViewport } = __appScope;
    const minX = floatingToolbarViewport.left + floatingToolbarPadding;
    const minY = floatingToolbarViewport.top + floatingToolbarPadding;
    const maxX = Math.max(minX, floatingToolbarViewport.right - width - floatingToolbarPadding);
    const maxY = Math.max(minY, floatingToolbarViewport.bottom - height - floatingToolbarPadding);
    return {
      x: clampNumber(x, minX, maxX),
      y: clampNumber(y, minY, maxY)
    };
  };
}

export function createToolbarOverlapArea(__appScope: Record<string, any>) {
  return (first: RenderViewportBounds, second: RenderViewportBounds) => {
  const { boxesIntersect } = __appScope;
    if (!boxesIntersect(first, second)) {
      return 0;
    }
    return Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left)) *
      Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
  };
}

export function createCanvasRectToSurfaceCssRect(__appScope: Record<string, any>) {
  return (rect: RenderViewportBounds, padding = 0): RenderViewportBounds => {
  const { canvasPointToSurfaceCss } = __appScope;
    const topLeft = canvasPointToSurfaceCss({ x: rect.left, y: rect.top });
    const bottomRight = canvasPointToSurfaceCss({ x: rect.right, y: rect.bottom });
    return {
      left: Math.min(topLeft.x, bottomRight.x) - padding,
      right: Math.max(topLeft.x, bottomRight.x) + padding,
      top: Math.min(topLeft.y, bottomRight.y) - padding,
      bottom: Math.max(topLeft.y, bottomRight.y) + padding
    };
  };
}

export function createRotateControlAvoidRectFromCanvasPoints(__appScope: Record<string, any>) {
  return (points: Point[]): RenderViewportBounds => {
  const { canvasRectToSurfaceCssRect, floatingToolbarScreenScale } = __appScope;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return canvasRectToSurfaceCssRect({
      left: Math.min(...xs) - 12,
      right: Math.max(...xs) + 12,
      top: Math.min(...ys) - 12,
      bottom: Math.max(...ys) + 12
    }, Math.max(4, Math.round(6 * floatingToolbarScreenScale)));
  };
}

export function createPlaceFloatingToolbar(__appScope: Record<string, any>) {
  return (
    candidates: Point[],
    width: number,
    height: number,
    avoidRects: RenderViewportBounds[] = []
  ): FloatingToolbarPlacement => {
  const { clampFloatingToolbarPosition, floatingToolbarScreenScale, toolbarOverlapArea } = __appScope;
    const placements = candidates.map((candidate, index) => {
      const point = clampFloatingToolbarPosition(candidate.x, candidate.y, width, height);
      const rect = { left: point.x, right: point.x + width, top: point.y, bottom: point.y + height };
      return {
        ...point,
        index,
        overlap: avoidRects.reduce((total, avoidRect) => total + toolbarOverlapArea(rect, avoidRect), 0),
        drift: Math.abs(point.x - candidate.x) + Math.abs(point.y - candidate.y)
      };
    });
    const chosen = [...placements].sort(
      (first, second) => first.overlap - second.overlap || first.drift - second.drift || first.index - second.index
    )[0];
    return {
      x: Math.round(chosen.x),
      y: Math.round(chosen.y),
      width,
      height,
      scale: floatingToolbarScreenScale
    };
  };
}

export function createRenderMeasurementGroup(__appScope: Record<string, any>) {
  return (group: MeasurementGroup) => {
  const { beginMeasurementDrag, dragging, draggingNodeIdSet, formatSvgNumber, g, measurementGroupBackgroundColor, measurementGroupBorderColor, measurementGroupBorderDashArray, measurementGroupBorderWidth, measurementGroupCanvasPosition, measurementGroupRenderMetrics, rect, selectedMeasurementGroup, text, title, visibleNodeById } = __appScope;
    const node = visibleNodeById.get(group.nodeId);
    if (!node || !group.visible) {
      return null;
    }
    const draggingOrigin = draggingNodeIdSet.has(group.nodeId);
    if (dragging?.historyCaptured && draggingOrigin) {
      return null;
    }
    const metrics = measurementGroupRenderMetrics(node, group);
    if (!metrics) {
      return null;
    }
    const position = measurementGroupCanvasPosition(node, group);
    return (
      <g
        key={group.id}
        className={`measurement-group ${selectedMeasurementGroup?.id === group.id ? "selected" : ""} ${draggingOrigin ? "drag-origin" : ""}`}
        transform={`translate(${formatSvgNumber(position.x)} ${formatSvgNumber(position.y)})`}
        data-export-measurement-group-id={group.id}
        data-export-device-id={node.id}
        data-export-device-idx={node.params.idx ?? ""}
        data-export-device-name={node.name}
        data-export-device-kind={node.kind}
        data-export-measurement-terminal-id={group.terminalId ?? ""}
        onPointerDown={(event) => beginMeasurementDrag(event, group)}
      >
        <title>{`${node.name} 动态量测；拖拽可调整位置`}</title>
        <rect
          className="measurement-group-bg"
          x={formatSvgNumber(-metrics.width / 2)}
          y={formatSvgNumber(-metrics.height / 2)}
          width={formatSvgNumber(metrics.width)}
          height={formatSvgNumber(metrics.height)}
          rx="4"
          fill={measurementGroupBackgroundColor(group)}
          stroke={measurementGroupBorderColor(group)}
          strokeWidth={measurementGroupBorderWidth(group)}
          strokeDasharray={measurementGroupBorderDashArray(group)}
        />
        {metrics.rows.map((row, index) => {
          const col = metrics.columns <= 1 ? 0 : index % metrics.columns;
          const rowIndex = metrics.columns <= 1 ? index : Math.floor(index / metrics.columns);
          const textX = -metrics.width / 2 + col * metrics.columnWidth + 7;
          const textY = -metrics.height / 2 + rowIndex * metrics.lineHeight + metrics.lineHeight / 2;
          return (
            <text
              key={row.item.id}
              className="measurement-item"
              x={formatSvgNumber(textX)}
              y={formatSvgNumber(textY)}
              dominantBaseline="middle"
              fill={row.display.color}
              fontFamily={row.display.fontFamily}
              fontSize={row.fontSize}
              fontWeight={row.display.fontWeight}
              fontStyle={row.display.fontStyle}
              textDecoration={row.display.textDecoration}
              data-export-measurement-item-id={row.item.id}
              data-export-measurement-name={(row.item.name ?? row.display.label ?? row.item.measurementTypeId).trim()}
              data-export-measurement-type-id={row.item.measurementTypeId}
              data-export-measurement-source-point={row.item.sourcePoint}
              data-export-measurement-role={row.item.role ?? ""}
              data-export-measurement-unit={row.display.unit}
              data-export-measurement-group-id={group.id}
              data-export-device-id={node.id}
              data-export-device-idx={node.params.idx ?? ""}
              data-export-device-name={node.name}
              data-export-device-kind={node.kind}
            >
              {row.text}
            </text>
          );
        })}
      </g>
    );
  };
}

export function createHandleMinimapNavigate(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGSVGElement>) => {
  const { canvasHeight, canvasWidth, centerViewBoxOnPoint, clampNumber, minimapOffsetX, minimapOffsetY, minimapScale } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const canvasPoint = {
      x: clampNumber((event.clientX - rect.left - minimapOffsetX) / minimapScale, 0, canvasWidth),
      y: clampNumber((event.clientY - rect.top - minimapOffsetY) / minimapScale, 0, canvasHeight)
    };
    centerViewBoxOnPoint(canvasPoint);
  };
}

export function createCenterSelectedInView(__appScope: Record<string, any>) {
  return () => {
  const { centerViewBoxOnPoint, selectedCanvasBounds, selectionRectCenter } = __appScope;
    if (!selectedCanvasBounds) {
      return;
    }
    centerViewBoxOnPoint(selectionRectCenter(selectedCanvasBounds));
  };
}

export function createFitViewToSelection(__appScope: Record<string, any>) {
  return () => {
  const { FIT_SELECTION_MAX_ZOOM_PERCENT, fitViewToBounds, selectedCanvasBounds } = __appScope;
    fitViewToBounds(selectedCanvasBounds, 80, FIT_SELECTION_MAX_ZOOM_PERCENT);
  };
}

export function createClearStaticButtonFeedbackTimer(__appScope: Record<string, any>) {
  return () => {
  const { staticButtonFeedbackTimeoutRef } = __appScope;
    if (staticButtonFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(staticButtonFeedbackTimeoutRef.current);
      staticButtonFeedbackTimeoutRef.current = null;
    }
  };
}

export function createSetStaticButtonFeedback(__appScope: Record<string, any>) {
  return (nodeId: string, state: StaticButtonVisualState) => {
  const { clearStaticButtonFeedbackTimer, setStaticButtonVisual } = __appScope;
    clearStaticButtonFeedbackTimer();
    setStaticButtonVisual({ nodeId, state });
  };
}

export function createClearStaticButtonFeedback(__appScope: Record<string, any>) {
  return (nodeId?: string) => {
  const { clearStaticButtonFeedbackTimer, setStaticButtonVisual } = __appScope;
    clearStaticButtonFeedbackTimer();
    setStaticButtonVisual((current) => (!current || (nodeId && current.nodeId !== nodeId) ? current : null));
  };
}

export function createBeginStaticButtonPointerFeedback(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement>, node: ModelNode) => {
  const { connectSource, isBrowseMode, isStaticButtonEnabledForNode, mode, setStaticButtonFeedback, staticButtonPointerRef, staticDrawing } = __appScope;
    if (!isBrowseMode || !isStaticButtonEnabledForNode(node) || staticDrawing || connectSource || mode === "connect") {
      return;
    }
    staticButtonPointerRef.current = {
      nodeId: node.id,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: false
    };
    setStaticButtonFeedback(node.id, "pressed");
  };
}

export function createResolveStaticButtonTargetProject(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { flattenSavedSchemes, schemes } = __appScope;
    const targetProjectId = node.params.buttonTargetProjectId?.trim();
    if (targetProjectId) {
      for (const scheme of flattenSavedSchemes(schemes)) {
        const project = scheme.projects.find((item) => item.id === targetProjectId);
        if (project) {
          return { scheme, project };
        }
      }
    }
    const targetName = node.params.buttonTargetProjectName?.trim();
    if (targetName) {
      for (const scheme of flattenSavedSchemes(schemes)) {
        const project = scheme.projects.find((item) => item.name.trim() === targetName);
        if (project) {
          return { scheme, project };
        }
      }
    }
    return null;
  };
}

export function createExecuteStaticButtonCommand(__appScope: Record<string, any>) {
  return (command: string) => {
  const { centerSelectedInView, fitViewToSelection, fitWholeCanvasToFrame, resetViewportZoom, runTopologyCalculation, saveCurrentProject, selectedCanvasBounds, zoomViewportAtCenter } = __appScope;
    if (command === "save") {
      void saveCurrentProject();
      return true;
    }
    if (command === "fitCanvas") {
      fitWholeCanvasToFrame();
      return true;
    }
    if (command === "centerSelected") {
      if (!selectedCanvasBounds) {
        window.alert("当前没有选中图元，无法居中选中。");
        return false;
      }
      centerSelectedInView();
      return true;
    }
    if (command === "fitSelection") {
      if (!selectedCanvasBounds) {
        window.alert("当前没有选中图元，无法缩放到选中区域。");
        return false;
      }
      fitViewToSelection();
      return true;
    }
    if (command === "runTopology") {
      runTopologyCalculation();
      return true;
    }
    if (command === "zoomIn") {
      zoomViewportAtCenter(0.82);
      return true;
    }
    if (command === "zoomOut") {
      zoomViewportAtCenter(1.18);
      return true;
    }
    if (command === "resetZoom") {
      resetViewportZoom();
      return true;
    }
    return false;
  };
}

export function createExecuteStaticButtonAction(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { STATIC_BUTTON_COMMAND_LABELS, executeStaticButtonCommand, isStaticButtonEnabledForNode, layers, requestLoadSavedProject, resolveStaticButtonTargetLayers, resolveStaticButtonTargetProject, setActiveLayerId, setLayers, writeOperationLog } = __appScope;
    if (!isStaticButtonEnabledForNode(node)) {
      return;
    }
    const actionType = node.params.buttonActionType || "none";
    if (actionType === "project") {
      const target = resolveStaticButtonTargetProject(node);
      if (!target) {
        window.alert("按钮动作未找到目标模型，请在右侧图元参数中重新选择。");
        return;
      }
      writeOperationLog(`按钮切换模型：${target.project.name}`);
      requestLoadSavedProject(target.project, target.scheme.id);
      return;
    }
    if (actionType === "layer") {
      const targetLayers = resolveStaticButtonTargetLayers(node, layers);
      if (targetLayers.length === 0) {
        window.alert("按钮动作未找到目标图层，请在右侧图元参数中重新选择。");
        return;
      }
      const targetLayerIdSet = new Set(targetLayers.map((layer) => layer.id));
      setActiveLayerId(targetLayers[0].id);
      setLayers((current) => current.map((item) => ({ ...item, visible: targetLayerIdSet.has(item.id) })));
      writeOperationLog(`按钮切换图层：${targetLayers.map((layer) => layer.name).join("、")}`);
      return;
    }
    if (actionType === "command") {
      const command = node.params.buttonCommand || "none";
      if (!executeStaticButtonCommand(command)) {
        window.alert("按钮动作未配置有效命令，请在右侧图元参数中重新选择。");
      } else {
        writeOperationLog(`按钮执行命令：${STATIC_BUTTON_COMMAND_LABELS[command] ?? command}`);
      }
    }
  };
}

export function createHandleStaticButtonClick(__appScope: Record<string, any>) {
  return (event: MouseEvent<SVGGElement>, node: ModelNode) => {
  const { clearStaticButtonFeedback, executeStaticButtonAction, isBrowseMode, isStaticButtonEnabledForNode, setStaticButtonFeedback, setStaticButtonVisual, staticButtonFeedbackTimeoutRef, staticButtonPointerRef } = __appScope;
    if (!isBrowseMode || !isStaticButtonEnabledForNode(node)) {
      return;
    }
    const pointerSnapshot = staticButtonPointerRef.current;
    staticButtonPointerRef.current = null;
    if (
      !pointerSnapshot ||
      pointerSnapshot.nodeId !== node.id ||
      pointerSnapshot.moved ||
      Math.hypot(event.clientX - pointerSnapshot.clientX, event.clientY - pointerSnapshot.clientY) > 4
    ) {
      clearStaticButtonFeedback(node.id);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setStaticButtonFeedback(node.id, "clicked");
    staticButtonFeedbackTimeoutRef.current = window.setTimeout(() => {
      staticButtonFeedbackTimeoutRef.current = null;
      setStaticButtonVisual((current) => (current?.nodeId === node.id && current.state === "clicked" ? null : current));
    }, 160);
    executeStaticButtonAction(node);
  };
}

export function createBeginReadonlyBackgroundStaticButtonPointerFeedback(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement>, node: ModelNode) => {
  const { beginStaticButtonPointerFeedback } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    beginStaticButtonPointerFeedback(event, node);
  };
}

export function createRenderReadonlyBackgroundPage(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_CANVAS_BACKGROUND, MemoDeviceGlyph, backgroundPageRender, beginReadonlyBackgroundStaticButtonPointerFeedback, circle, clearStaticButtonFeedback, clipPath, colorDisplayMode, colorPalette, deviceLabelsVisible, g, getConnectionStrokeColor, getNodeScaleX, getNodeScaleY, getTerminalDisplayColor, handleStaticButtonClick, image, isBrowseMode, isBusNode, isRoutableLineDeviceKind, isStaticButtonEnabledForNode, isStaticNode, line, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, nodeLabelShouldRender, nodeLabelText, nodeLabelTextAnchor, nodeLabelTextStyle, nodeLabelTransform, nodeLabelVertical, nodeLabelVerticalSegments, nodeLabelVerticalTokenStyle, nodeLabelVerticalTokenY, path, rect, resolveNodeStateVisual, setStaticButtonFeedback, staticButtonPointerRef, staticButtonVisual, svgStrokeDashArray, terminalRenderLocalPoint, terminalStubSegment, terminalStubStrokeWidth, text, title } = __appScope;
    if (!backgroundPageRender) {
      return null;
    }
    const backgroundConnectionLineStyle = (edge: Edge) => ({
      "--connection-color": getConnectionStrokeColor(edge, backgroundPageRender.nodeById, colorDisplayMode, colorPalette)
    } as CSSProperties);
    return (
      <g className="background-page-layer" transform={backgroundPageRender.transform} aria-label="背景页面">
        <rect
          className="background-page-fill"
          x="0"
          y="0"
          width={backgroundPageRender.backgroundBounds.width}
          height={backgroundPageRender.backgroundBounds.height}
          fill={backgroundPageRender.backgroundColor || DEFAULT_CANVAS_BACKGROUND}
        />
        {backgroundPageRender.backgroundImageUrl && (
          <image
            className="background-page-image"
            href={backgroundPageRender.backgroundImageUrl}
            x="0"
            y="0"
            width={backgroundPageRender.backgroundBounds.width}
            height={backgroundPageRender.backgroundBounds.height}
            preserveAspectRatio="xMidYMid slice"
          />
        )}
        <rect
          className="background-page-frame"
          x="0"
          y="0"
          width={backgroundPageRender.backgroundBounds.width}
          height={backgroundPageRender.backgroundBounds.height}
        />
        <g className="background-page-edges">
          {backgroundPageRender.routes.map((route) => {
            const edge = backgroundPageRender.edgeById.get(route.edgeId);
            return edge ? (
              <g key={`background-edge-${edge.id}`} className="connection-group background-page-edge" style={backgroundConnectionLineStyle(edge)}>
                <path d={route.path} className="connection-line" />
              </g>
            ) : null;
          })}
        </g>
        <g className="background-page-nodes">
          {backgroundPageRender.nodes.map((node) => {
            const nodeIsBus = isBusNode(node);
            const isStorageBus =
              node.kind === "hydrogen-tank" ||
              node.kind === "hydrogen-tank-horizontal" ||
              node.kind === "hydrogen-tank-container" ||
              node.kind === "thermal-storage-tank";
            const imageHref = nodeImage(node);
            const foregroundImageHref = nodeForegroundImage(node);
            const nodeScaleX = getNodeScaleX(node);
            const nodeScaleY = getNodeScaleY(node);
            const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
            const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
            const terminalStubDashArray = svgStrokeDashArray(node.params.strokeStyle);
            const terminalControlTransform = (x: number, y: number) => `translate(${x} ${y}) scale(${inverseScaleX} ${inverseScaleY})`;
            const staticButtonEnabled = isBrowseMode && isStaticButtonEnabledForNode(node);
            const staticButtonState = staticButtonVisual?.nodeId === node.id ? staticButtonVisual.state : "";
            const staticButtonCornerRadius = Math.max(0, Number(node.params.cornerRadius || 8));
            return (
              <g
                key={`background-node-${node.id}`}
                className={`diagram-node background-page-node ${nodeIsBus ? "bus-node" : ""} ${isStorageBus ? "storage-node" : ""} ${staticButtonEnabled ? "background-page-button static-button-enabled" : ""} ${staticButtonState ? `static-button-${staticButtonState}` : ""}`}
                transform={`translate(${node.position.x} ${node.position.y})`}
                data-export-device-id={isStaticNode(node) ? undefined : node.id}
                data-export-device-idx={isStaticNode(node) ? undefined : node.params.idx ?? ""}
                data-export-device-name={isStaticNode(node) ? undefined : node.name}
                data-export-device-kind={isStaticNode(node) ? undefined : node.kind}
                onPointerDown={staticButtonEnabled ? (event) => beginReadonlyBackgroundStaticButtonPointerFeedback(event, node) : undefined}
                onPointerEnter={staticButtonEnabled ? () => setStaticButtonFeedback(node.id, "hover") : undefined}
                onPointerLeave={staticButtonEnabled ? () => {
                  staticButtonPointerRef.current = null;
                  clearStaticButtonFeedback(node.id);
                } : undefined}
                onPointerUp={staticButtonEnabled ? () => {
                  if (staticButtonVisual?.nodeId === node.id && staticButtonVisual.state === "pressed") {
                    setStaticButtonFeedback(node.id, "hover");
                  }
                } : undefined}
                onClick={staticButtonEnabled ? (event) => {
                  event.stopPropagation();
                  handleStaticButtonClick(event, node);
                } : undefined}
                onContextMenu={staticButtonEnabled ? (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                } : undefined}
              >
                <title>{`背景：${node.name}`}</title>
                {imageHref && !nodeIsBus && (
                  <clipPath id={`background-clip-${node.id}`}>
                    <rect
                      x={-node.size.width / 2}
                      y={-node.size.height / 2}
                      width={node.size.width}
                      height={node.size.height}
                      rx="8"
                    />
                  </clipPath>
                )}
                <g className="node-geometry" transform={nodeGeometryTransform(node)}>
                  <rect
                    x={-node.size.width / 2}
                    y={-node.size.height / 2}
                    width={node.size.width}
                    height={node.size.height}
                    rx="8"
                    className={`node-hitbox ${nodeIsBus ? "bus-hitbox" : ""} ${isStaticNode(node) ? "static-hitbox" : ""}`}
                  />
                  <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)} />
                  <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)} />
                  {staticButtonEnabled && (
                    <rect
                      x={-node.size.width / 2}
                      y={-node.size.height / 2}
                      width={node.size.width}
                      height={node.size.height}
                      rx={staticButtonCornerRadius}
                      className="static-button-feedback-surface"
                    />
                  )}
                </g>
                {!nodeIsBus && (imageHref || foregroundImageHref) && (
                  <g className="node-upright-content" transform={nodeImageContentTransform(node)}>
                    {imageHref && isStaticNode(node) && (
                      <image
                        href={imageHref}
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#background-clip-${node.id})`}
                        className="node-background-image"
                      />
                    )}
                    {imageHref && !isStaticNode(node) && (
                      <rect
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        rx="8"
                        className="node-image-cover"
                      />
                    )}
                    {imageHref && !isStaticNode(node) && (
                      <image
                        href={imageHref}
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#background-clip-${node.id})`}
                        className="node-background-image"
                      />
                    )}
                    {foregroundImageHref && (
                      <image
                        href={foregroundImageHref}
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#background-clip-${node.id})`}
                        className="node-foreground-image"
                      />
                    )}
                  </g>
                )}
                {nodeLabelShouldRender(node, deviceLabelsVisible) && (
                  <g
                    className={`node-device-label ${nodeLabelVertical(node) ? "vertical" : "horizontal"}`}
                    data-node-id={node.id}
                    data-label-owner="background-device"
                    transform={nodeLabelTransform(node)}
                  >
                    {nodeLabelVertical(node) ? (
                      nodeLabelVerticalSegments(nodeLabelText(node)).map((segment, index) => (
                        <text
                          key={`${segment.text}-${index}`}
                          className={`node-label-vertical-token ${segment.numeric ? "numeric" : ""}`}
                          x="0"
                          y={nodeLabelVerticalTokenY(index, nodeLabelVerticalSegments(nodeLabelText(node)).length, node)}
                          dominantBaseline="middle"
                          textAnchor="middle"
                          style={nodeLabelVerticalTokenStyle(node)}
                        >
                          {segment.text}
                        </text>
                      ))
                    ) : (
                      <text
                        x="0"
                        y="0"
                        dominantBaseline="middle"
                        textAnchor={nodeLabelTextAnchor(node)}
                        style={nodeLabelTextStyle(node)}
                      >
                        {nodeLabelText(node)}
                      </text>
                    )}
                  </g>
                )}
                <g className="node-terminal-layer" transform={nodeGeometryTransform(node)}>
                  {node.terminals.map((terminal) => {
                    const hideFixedTerminal = nodeIsBus || isStaticNode(node) || isRoutableLineDeviceKind(node.kind);
                    const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
                    const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size);
                    const terminalDisplayColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
                    return hideFixedTerminal ? null : (
                      <g key={terminal.id} transform={terminalControlTransform(renderPoint.x, renderPoint.y)}>
                        <line
                          className={`terminal-stub ${terminal.type}`}
                          strokeDasharray={terminalStubDashArray}
                          style={{
                            stroke: terminalDisplayColor,
                            strokeWidth: terminalStubStrokeWidth(node, terminal)
                          }}
                          x1={stub.from.x}
                          y1={stub.from.y}
                          x2={stub.to.x}
                          y2={stub.to.y}
                        />
                        <circle
                          className={`terminal-dot ${terminal.type}`}
                          style={{ "--terminal-color": terminalDisplayColor } as CSSProperties}
                          cx="0"
                          cy="0"
                          r={6}
                        />
                      </g>
                    );
                  })}
                </g>
              </g>
            );
          })}
        </g>
      </g>
    );
  };
}

export function createOpenTopologyWarningPanel(__appScope: Record<string, any>) {
  return () => {
  const { setTopologyWarningPanelClosed, topologyErrors } = __appScope;
    if (topologyErrors.length === 0) {
      return;
    }
    setTopologyWarningPanelClosed(false);
  };
}

export function createAppHookCallback1(__appScope: Record<string, any>) {
  return () => {
  const { readRefreshRecoveryProject } = __appScope;
    const refreshRecovery = readRefreshRecoveryProject();
    return {
      recoveredFromRefresh: Boolean(refreshRecovery),
      draft: refreshRecovery
    };
  };
}

export function createAppHookCallback2(__appScope: Record<string, any>) {
  return () => {
  const { assignMissingDeviceIndexes, initialDraft, initialLayeredProject } = __appScope;
    const indexed = assignMissingDeviceIndexes(initialLayeredProject.nodes, initialDraft?.deviceIndexCounters);
    return indexed;
  };
}

export function createAppHookCallback3(__appScope: Record<string, any>) {
  return () => {
  const { interactionMode, writeStoredInteractionMode } = __appScope;
    writeStoredInteractionMode(interactionMode);
  };
}

export function createAppHookCallback4(__appScope: Record<string, any>) {
  return () => {
  const { contextMenu, contextMenuRef, contextMenuSize, projectMenu, setContextMenuSize, templateMenu } = __appScope;
    if (!contextMenu && !projectMenu && !templateMenu) {
      if (contextMenuSize !== null) {
        setContextMenuSize(null);
      }
      return;
    }
    const element = contextMenuRef.current;
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const nextSize = {
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height)
    };
    setContextMenuSize((current) =>
      current?.width === nextSize.width && current.height === nextSize.height ? current : nextSize
    );
  };
}

export function createAppHookCallback5(__appScope: Record<string, any>) {
  return () => {
  const { inferMissingRoutableLineDeviceEndpointRefs, isRoutableLineDeviceKind, nodes, routableLineDeviceEndpointRefs } = __appScope;
    const index = new Map<string, string[]>();
    for (const node of nodes) {
      if (!isRoutableLineDeviceKind(node.kind)) {
        continue;
      }
      const refs = routableLineDeviceEndpointRefs(inferMissingRoutableLineDeviceEndpointRefs(node, nodes));
      for (const ref of [refs.source, refs.target]) {
        if (!ref?.nodeId) {
          continue;
        }
        const existing = index.get(ref.nodeId);
        if (existing) {
          existing.push(node.id);
        } else {
          index.set(ref.nodeId, [node.id]);
        }
      }
    }
    return index;
  };
}

export function createAppHookCallback6(__appScope: Record<string, any>) {
  return () => {
  const { allModelLayersVisible, buildNodeSpatialIndex, edges, graphStore, layers, nodes, normalizeModelLayers } = __appScope;
    const normalizedLayers = normalizeModelLayers(layers, nodes);
    const visibleNodesByLayer: ModelNode[] = [];
    for (const layer of normalizedLayers) {
      if (layer.visible) {
        visibleNodesByLayer.push(...(graphStore.nodesByLayerId.get(layer.id) ?? []));
      }
    }
    const visibleProjectNodesMatchGraphStoreOrder =
      visibleNodesByLayer.length === nodes.length &&
      visibleNodesByLayer.every((node, index) => node === nodes[index]);
    if (allModelLayersVisible && visibleProjectNodesMatchGraphStoreOrder) {
      return {
        nodes,
        edges,
        nodeById: graphStore.nodeMap,
        nodeIdSet: graphStore.nodeIdSet,
        edgeIdSet: graphStore.edgeIdSet,
        nodeSpatialIndex: graphStore.nodeSpatialIndex
      };
    }
    const visibleProjectIncludesAllNodes = allModelLayersVisible && visibleNodesByLayer.length === nodes.length;
    const visibleNodeIdSetForLayers = visibleProjectIncludesAllNodes
      ? graphStore.nodeIdSet
      : new Set(visibleNodesByLayer.map((node) => node.id));
    const visibleNodeByIdForLayers = visibleProjectIncludesAllNodes
      ? graphStore.nodeMap
      : new Map(visibleNodesByLayer.map((node) => [node.id, node]));
    let visibleEdgesByLayer = edges;
    let visibleEdgeIdSetForLayers = graphStore.edgeIdSet;
    if (!visibleProjectIncludesAllNodes) {
      const visibleEdgeById = new Map<string, Edge>();
      for (const node of visibleNodesByLayer) {
        for (const edge of graphStore.edgesByNodeId.get(node.id) ?? []) {
          if (visibleNodeIdSetForLayers.has(edge.sourceId) && visibleNodeIdSetForLayers.has(edge.targetId)) {
            visibleEdgeById.set(edge.id, edge);
          }
        }
      }
      visibleEdgesByLayer = Array.from(visibleEdgeById.values()).sort(
        (first, second) =>
          (graphStore.edgeIndexById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
          (graphStore.edgeIndexById.get(second.id) ?? Number.MAX_SAFE_INTEGER)
      );
      visibleEdgeIdSetForLayers = new Set(visibleEdgeById.keys());
    }
    return {
      nodes: visibleNodesByLayer,
      edges: visibleEdgesByLayer,
      nodeById: visibleNodeByIdForLayers,
      nodeIdSet: visibleNodeIdSetForLayers,
      edgeIdSet: visibleEdgeIdSetForLayers,
      nodeSpatialIndex: visibleProjectIncludesAllNodes
        ? graphStore.nodeSpatialIndex
        : buildNodeSpatialIndex(visibleNodesByLayer)
    };
  };
}

export function createAppHookCallback7(__appScope: Record<string, any>) {
  return () => {
  const { edges, graphStore, visibleEdges } = __appScope;
    if (visibleEdges === edges) {
      return graphStore.edgesByTerminalRef;
    }
    const map = new Map<string, Edge[]>();
    const add = (nodeId: string, terminalId: string | undefined, edge: Edge) => {
      if (!terminalId) {
        return;
      }
      const key = `${nodeId}:${terminalId}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(edge);
      } else {
        map.set(key, [edge]);
      }
    };
    for (const edge of visibleEdges) {
      add(edge.sourceId, edge.sourceTerminalId, edge);
      add(edge.targetId, edge.targetTerminalId, edge);
    }
    return map;
  };
}

export function createAppHookCallback8(__appScope: Record<string, any>) {
  return () => {
  const { activeLayer, activeLayerId, graphStore, nodes, visibleNodeIdSet, visibleNodes } = __appScope;
    if (!activeLayer?.visible) {
      return [];
    }
    const layerNodes = graphStore.nodesByLayerId.get(activeLayerId) ?? [];
    return visibleNodes === nodes && layerNodes.length === nodes.length ? visibleNodes : visibleNodes === nodes ? layerNodes : layerNodes.filter((node) => visibleNodeIdSet.has(node.id));
  };
}

export function createAppHookCallback9(__appScope: Record<string, any>) {
  return () => {
  const { activeLayerNodes, componentTypeDisplayName, filterSelectionComponentTypeKey, filterSelectionItemKey, filterSelectionSpecificTypeKey, filterSelectionTemplateLabelByKind } = __appScope;
    const optionMap = new Map<string, FilterSelectionTypeOption>();
    for (const node of activeLayerNodes) {
      const typeKey = filterSelectionComponentTypeKey(node);
      const itemTypeKey = filterSelectionSpecificTypeKey(node);
      const itemKey = filterSelectionItemKey(node);
      const itemLabel = filterSelectionTemplateLabelByKind.get(itemTypeKey) ?? itemTypeKey;
      const current = optionMap.get(typeKey);
      if (current) {
        const currentItem = current.items.find((item) => item.itemKey === itemKey);
        const nextItems = currentItem
          ? current.items.map((item) => item.itemKey === itemKey
            ? {
                ...item,
                count: item.count + 1,
                nodeIds: item.nodeIds.concat(node.id)
              }
            : item
          )
          : current.items.concat({
              itemKey,
              typeKey: itemTypeKey,
              label: itemLabel,
              count: 1,
              nodeIds: [node.id]
            });
        optionMap.set(typeKey, {
          ...current,
          count: current.count + 1,
          items: nextItems
        });
        continue;
      }
      optionMap.set(typeKey, {
        typeKey,
        label: componentTypeDisplayName(typeKey),
        count: 1,
        items: [{
          itemKey,
          typeKey: itemTypeKey,
          label: itemLabel,
          count: 1,
          nodeIds: [node.id]
        }]
      });
    }
    return Array.from(optionMap.values())
      .map((option) => ({
        ...option,
        items: option.items.sort((first, second) =>
          first.label.localeCompare(second.label, "zh-Hans-CN") || first.typeKey.localeCompare(second.typeKey)
        )
      }))
      .sort((first, second) =>
        first.label.localeCompare(second.label, "zh-Hans-CN") || first.typeKey.localeCompare(second.typeKey)
      );
  };
}

export function createAppHookCallback10(__appScope: Record<string, any>) {
  return () => {
  const { EMPTY_CANVAS_SELECTION, activeLayerGroups, canvasSelectionScope, isEditMode, rawActiveSelectedEdgeIds, rawActiveSelectedNodeIds, resolveCanvasSelection } = __appScope;
      if (rawActiveSelectedNodeIds.length === 0 && rawActiveSelectedEdgeIds.length === 0) {
        return EMPTY_CANVAS_SELECTION;
      }
      if (!isEditMode) {
        return resolveCanvasSelection([], rawActiveSelectedNodeIds, rawActiveSelectedEdgeIds, "direct");
      }
      return resolveCanvasSelection(activeLayerGroups, rawActiveSelectedNodeIds, rawActiveSelectedEdgeIds, canvasSelectionScope);
    };
}

export function createAppHookCallback11(__appScope: Record<string, any>) {
  return () => {
  const { activeCanvasSelection, activeLayerGroups, isEditMode, rawActiveSelectedEdgeIds, rawActiveSelectedNodeIds, resolveCanvasSelection } = __appScope;
      if (!isEditMode || (rawActiveSelectedNodeIds.length === 0 && rawActiveSelectedEdgeIds.length === 0)) {
        return activeCanvasSelection;
      }
      return resolveCanvasSelection(activeLayerGroups, rawActiveSelectedNodeIds, rawActiveSelectedEdgeIds, "group");
    };
}

export function createAppHookCallback12(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_MODEL_LAYER_ID, PARAM_LABELS, activeSelectedNodeIds, canBatchEditParam, enumValuesForRow, nodeById, parseCustomDefinitions } = __appScope;
    const selectedNodes = activeSelectedNodeIds.flatMap((nodeId) => nodeById.get(nodeId) ?? []);
    if (selectedNodes.length < 2) {
      return [];
    }
    const firstNode = selectedNodes[0];
    const customDefinitionsByNode = selectedNodes.map((node) => parseCustomDefinitions(node.params));
    const commonKeys = Object.keys(firstNode.params)
      .filter((key) => canBatchEditParam(key))
      .filter((key) => selectedNodes.every((node) => Object.prototype.hasOwnProperty.call(node.params, key)));
    const layerValues = selectedNodes.map((node) => node.layerId ?? DEFAULT_MODEL_LAYER_ID);
    const paramRows = commonKeys
      .map<BatchCommonParamRow>((key) => {
        const values = selectedNodes.map((node) => node.params[key] ?? "");
        const definition = customDefinitionsByNode[0]?.find((item) => item.enName === key);
        const compatibleDefinition = definition && customDefinitionsByNode.every((definitions) => {
          const candidate = definitions.find((item) => item.enName === key);
          return Boolean(
            candidate &&
            candidate.valueType === definition.valueType &&
            enumValuesForRow(candidate).join("\u0000") === enumValuesForRow(definition).join("\u0000")
          );
        })
          ? definition
          : undefined;
        return {
          key,
          label: definition?.cnName ?? PARAM_LABELS[key] ?? key,
          value: values[0] ?? "",
          mixed: values.some((value) => value !== values[0]),
          definition: compatibleDefinition
        };
      });
    return [
      {
        key: "layerId",
        label: PARAM_LABELS.layerId ?? "所属图层",
        value: layerValues[0] ?? DEFAULT_MODEL_LAYER_ID,
        mixed: layerValues.some((value) => value !== layerValues[0])
      },
      ...paramRows
    ]
      .sort((first, second) => first.label.localeCompare(second.label, "zh-Hans-CN") || first.key.localeCompare(second.key));
  };
}

export function createAppHookCallback13(__appScope: Record<string, any>) {
  return () => {
  const { BATCH_MEASUREMENT_GROUP_KEYS, BATCH_MEASUREMENT_GROUP_LABELS, activeSelectedNodeIds, isStaticNode, measurementGroupCommonValue, measurementGroupsForNode, nodeById, projectMeasurements } = __appScope;
    const selectedNodes = activeSelectedNodeIds.flatMap((nodeId) => nodeById.get(nodeId) ?? []).filter((node) => !isStaticNode(node));
    if (selectedNodes.length < 2) {
      return [];
    }
    const measurementGroups = selectedNodes.flatMap((node) => measurementGroupsForNode(projectMeasurements, node.id));
    if (measurementGroups.length === 0) {
      return [];
    }
    return BATCH_MEASUREMENT_GROUP_KEYS.map((key) => {
      const values = measurementGroups.map((group) => measurementGroupCommonValue(group, key));
      return {
        key,
        label: BATCH_MEASUREMENT_GROUP_LABELS[key],
        value: values[0] ?? "",
        mixed: values.some((value) => value !== values[0])
      };
    });
  };
}

export function createAppHookCallback14(__appScope: Record<string, any>) {
  return () => {
  const { normalizeLibrarySearchText, projectSearchNeedle, schemes } = __appScope;
    if (!projectSearchNeedle) {
      return schemes;
    }
    const filterScheme = (scheme: SavedSchemeRecord): SavedSchemeRecord | null => {
      const schemeMatches = normalizeLibrarySearchText(scheme.name).includes(projectSearchNeedle);
      const filteredProjects = schemeMatches
        ? scheme.projects
        : scheme.projects.filter((project) => normalizeLibrarySearchText(project.name).includes(projectSearchNeedle));
      const filteredChildren = schemeMatches
        ? (scheme.children ?? [])
        : (scheme.children ?? []).map(filterScheme).filter((child): child is SavedSchemeRecord => Boolean(child));
      return schemeMatches || filteredProjects.length > 0 || filteredChildren.length > 0
        ? { ...scheme, projects: filteredProjects, children: filteredChildren }
        : null;
    };
    return schemes.map(filterScheme).filter((scheme): scheme is SavedSchemeRecord => Boolean(scheme));
  };
}

export function createAppHookCallback15(__appScope: Record<string, any>) {
  return () => {
  const { customDeviceDraft, customDeviceStatePageId, normalizeStatePageId, setCustomDeviceStatePageId } = __appScope;
    const activeId = normalizeStatePageId(customDeviceDraft.stateDefinitions, customDeviceStatePageId);
    if (activeId !== customDeviceStatePageId) {
      setCustomDeviceStatePageId(activeId);
    }
  };
}

export function createAppHookCallback16(__appScope: Record<string, any>) {
  return () => {
  const { definitionStateDraftRows, definitionStatePageId, normalizeStatePageId, setDefinitionStatePageId } = __appScope;
    const activeId = normalizeStatePageId(definitionStateDraftRows, definitionStatePageId);
    if (activeId !== definitionStatePageId) {
      setDefinitionStatePageId(activeId);
    }
  };
}

export function createAppHookCallback17(__appScope: Record<string, any>) {
  return () => {
  const { libraryFlyoutPositions, libraryFlyoutPositionsRef } = __appScope;
    libraryFlyoutPositionsRef.current = libraryFlyoutPositions;
  };
}

export function createAppHookCallback18(__appScope: Record<string, any>) {
  return () => {
  const { componentLibraryDisplayMode, fitLibraryFlyoutsToVisibleArea, leftPanelTab, libraryFlyoutPositionsRef, setLibraryFlyoutPositions, templateLibraryDisplayMode } = __appScope;
    if (leftPanelTab !== "library" && leftPanelTab !== "templates") {
      return;
    }
    const activeDisplayMode = leftPanelTab === "templates" ? templateLibraryDisplayMode : componentLibraryDisplayMode;
    const frame = window.requestAnimationFrame(() => {
      if (activeDisplayMode === "right") {
        fitLibraryFlyoutsToVisibleArea();
        return;
      }
      if (Object.keys(libraryFlyoutPositionsRef.current).length > 0) {
        setLibraryFlyoutPositions({});
      }
    });
    return () => window.cancelAnimationFrame(frame);
  };
}

export function createAppHookCallback19(__appScope: Record<string, any>) {
  return () => {
  const { componentLibraryDisplayMode, hideLibraryFlyout, leftPanelTab, librarySearchNeedle, templateLibraryDisplayMode, templateLibrarySearchNeedle } = __appScope;
    const keepComponentFlyout = leftPanelTab === "library" && componentLibraryDisplayMode === "right" && !librarySearchNeedle;
    const keepTemplateFlyout = leftPanelTab === "templates" && templateLibraryDisplayMode === "right" && !templateLibrarySearchNeedle;
    if (!keepComponentFlyout && !keepTemplateFlyout) {
      hideLibraryFlyout();
    }
  };
}

export function createAppHookCallback20(__appScope: Record<string, any>) {
  return () => {
  const { componentLibraryDisplayMode, hideLibraryFlyout, hoveredAttributeLibraryComponentType, hoveredGraphTemplateType, leftPanelTab, templateLibraryDisplayMode } = __appScope;
    const componentFlyoutActive = leftPanelTab === "library" && componentLibraryDisplayMode === "right" && Boolean(hoveredAttributeLibraryComponentType);
    const templateFlyoutActive = leftPanelTab === "templates" && templateLibraryDisplayMode === "right" && Boolean(hoveredGraphTemplateType);
    if (!componentFlyoutActive && !templateFlyoutActive) {
      return;
    }
    const hideLibraryFlyoutOnOutsidePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      const targetElement = target instanceof Element ? target : target.parentElement;
      const flyoutElement = document.querySelector(".flyout-library-group");
      const activeTypeSection = targetElement?.closest(".attribute-library-component-type-section.flyout-mode, .template-library-type-section.flyout-mode");
      if (flyoutElement?.contains(target) || activeTypeSection) {
        return;
      }
      hideLibraryFlyout();
    };
    window.addEventListener("pointerdown", hideLibraryFlyoutOnOutsidePointerDown, true);
    return () => window.removeEventListener("pointerdown", hideLibraryFlyoutOnOutsidePointerDown, true);
  };
}

export function createAppHookCallback21(__appScope: Record<string, any>) {
  return () => {
  const { E_SECTION_OPTIONS, attributeLibraries, customComponentTypes, defaultAttributeLibraryForComponentType, libraryTemplates, normalizeAttributeLibraryName, normalizeComponentTypeName, resolveTemplateComponentType } = __appScope;
    const groupedOptions = new Map<string, string[]>();
    const addOption = (attributeLibraryName: string, sectionName: string) => {
      const group = normalizeAttributeLibraryName(attributeLibraryName);
      const section = normalizeComponentTypeName(sectionName);
      if (!group || !section) {
        return;
      }
      const current = groupedOptions.get(group) ?? [];
      if (!current.some((item) => item.toLowerCase() === section.toLowerCase())) {
        groupedOptions.set(group, [...current, section]);
      }
    };
    for (const section of E_SECTION_OPTIONS) {
      addOption(defaultAttributeLibraryForComponentType(section), section);
    }
    for (const componentType of customComponentTypes) {
      addOption(componentType.attributeLibraryName, componentType.name);
    }
    for (const template of libraryTemplates) {
      addOption(template.attributeLibrary, resolveTemplateComponentType(template));
    }
    return Object.fromEntries(attributeLibraries.map((group) => [group, groupedOptions.get(group) ?? []]));
  };
}

export function createAppHookCallback22(__appScope: Record<string, any>) {
  return () => {
  const { componentTypeOptionsByAttributeLibrary, customDeviceDraft, normalizeAttributeLibraryName, normalizeComponentTypeName } = __appScope;
    const group = normalizeAttributeLibraryName(customDeviceDraft.attributeLibraryName);
    const options = componentTypeOptionsByAttributeLibrary[group] ?? [];
    const currentSection = normalizeComponentTypeName(customDeviceDraft.componentType);
    return currentSection && !options.some((item) => item.toLowerCase() === currentSection.toLowerCase()) ? [currentSection, ...options] : options;
  };
}

export function createAppHookCallback23(__appScope: Record<string, any>) {
  return () => {
  const { componentTypeOptionsByAttributeLibrary, customDeviceDraft, definitionDraftSection, normalizeAttributeLibraryName, normalizeComponentTypeName, selectedDefinitionTemplate } = __appScope;
    const group = normalizeAttributeLibraryName(selectedDefinitionTemplate?.attributeLibrary ?? customDeviceDraft.attributeLibraryName);
    const options = componentTypeOptionsByAttributeLibrary[group] ?? [];
    const currentSection = normalizeComponentTypeName(definitionDraftSection);
    return currentSection && !options.some((item) => item.toLowerCase() === currentSection.toLowerCase()) ? [currentSection, ...options] : options;
  };
}

export function createAppHookCallback24(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_MODEL_LAYER_ID, activeLayerId, layers, setActiveLayerId, setLayers } = __appScope;
    if (!layers.some((layer) => layer.id === activeLayerId)) {
      const fallbackId = layers[0]?.id ?? DEFAULT_MODEL_LAYER_ID;
      setActiveLayerId(fallbackId);
      return;
    }
    if (layers.some((layer) => layer.id === activeLayerId && !layer.visible)) {
      setLayers((current) => current.map((layer) => layer.id === activeLayerId ? { ...layer, visible: true } : layer));
    }
  };
}

export function createAppHookCallback25(__appScope: Record<string, any>) {
  return () => {
  const { activeLayerEdgeIdSet, activeLayerNodeIdSet, setConnectSource, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setTerminalPress } = __appScope;
    setSelectedNodeIds((current) => current.filter((nodeId) => activeLayerNodeIdSet.has(nodeId)));
    setSelectedEdgeIds((current) => current.filter((edgeId) => activeLayerEdgeIdSet.has(edgeId)));
    setSelectedEdgeId((current) => current && activeLayerEdgeIdSet.has(current) ? current : "");
    setConnectSource((current) => current && activeLayerNodeIdSet.has(current.nodeId) ? current : null);
    setRewiring((current) => current && activeLayerEdgeIdSet.has(current.edgeId) ? current : null);
    setTerminalPress((current) => current && activeLayerNodeIdSet.has(current.nodeId) ? current : null);
  };
}

export function createAppHookCallback26(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectionKey, previousAutoInspectorSelectionKeyRef, selectedCount, setInspectorTab } = __appScope;
    if (previousAutoInspectorSelectionKeyRef.current === activeSelectionKey) {
      return;
    }
    previousAutoInspectorSelectionKeyRef.current = activeSelectionKey;
    if (selectedCount > 1) {
      setInspectorTab("tree");
    }
  };
}

export function createAppHookCallback27(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedNodeIds, formatStatusRotationDegrees, formatStatusScalePercent, getNodeScaleX, getNodeScaleY, normalizeRotationDegrees, visibleNodeById } = __appScope;
    const selectedNodes = activeSelectedNodeIds.flatMap((nodeId) => visibleNodeById.get(nodeId) ?? []);
    if (selectedNodes.length === 0) {
      return null;
    }
    const firstNode = selectedNodes[0];
    const firstScaleX = getNodeScaleX(firstNode);
    const firstScaleY = getNodeScaleY(firstNode);
    const firstRotation = normalizeRotationDegrees(firstNode.rotation);
    const sameScale = selectedNodes.every((node) =>
      Math.abs(getNodeScaleX(node) - firstScaleX) < 0.0005 &&
      Math.abs(getNodeScaleY(node) - firstScaleY) < 0.0005
    );
    const sameRotation = selectedNodes.every((node) => normalizeRotationDegrees(node.rotation) === firstRotation);
    const scaleText = sameScale
      ? `X ${formatStatusScalePercent(firstScaleX)} / Y ${formatStatusScalePercent(firstScaleY)}`
      : "多值";
    const rotationText = sameRotation ? formatStatusRotationDegrees(firstRotation) : "多值";
    return {
      scaleText,
      rotationText,
      title: selectedNodes.length === 1
        ? `${firstNode.name}：缩放 ${scaleText}，旋转 ${rotationText}`
        : `已选 ${selectedNodes.length} 个图元：缩放 ${scaleText}，旋转 ${rotationText}`
    };
  };
}

export function createAppHookCallback28(__appScope: Record<string, any>) {
  return () => {
  const { editHotInteractionActive, elementTreeLayerSignature, elementTreeSourceRef, graphStore, graphTreePanelActive, visibleEdges, visibleNodes } = __appScope;
    const current = elementTreeSourceRef.current;
    if (
      !current ||
      (graphTreePanelActive &&
        !editHotInteractionActive &&
        (current.revision !== graphStore.elementTreeRevision || current.layerSignature !== elementTreeLayerSignature))
    ) {
      const next = {
        revision: graphStore.elementTreeRevision,
        layerSignature: elementTreeLayerSignature,
        nodes: visibleNodes,
        edges: visibleEdges
      };
      elementTreeSourceRef.current = next;
      return next;
    }
    return current;
  };
}

export function createAppHookCallback29(__appScope: Record<string, any>) {
  return () => {
  const { buildElementTree, deferredElementTreeSource, elementTreeCacheRef, elementTreeSignature, graphTreePanelActive, libraryTemplates } = __appScope;
    if (!graphTreePanelActive) {
      return [];
    }
    if (elementTreeCacheRef.current.signature === elementTreeSignature) {
      return elementTreeCacheRef.current.tree;
    }
    const tree = buildElementTree(deferredElementTreeSource.nodes, deferredElementTreeSource.edges, libraryTemplates, { includeContainerChildren: false });
    elementTreeCacheRef.current = { signature: elementTreeSignature, tree };
    return tree;
  };
}

export function createAppHookCallback30(__appScope: Record<string, any>) {
  return () => {
  const { activeLayerEdgeIdSet, activeLayerNodeIdSet, activeSelectedEdgeIds, activeSelectedNodeIds, graphTreePanelActive } = __appScope;
    if (!graphTreePanelActive) {
      return "";
    }
    const selectedNode = activeSelectedNodeIds.find((nodeId) => activeLayerNodeIdSet.has(nodeId));
    if (selectedNode) {
      return `node:${selectedNode}`;
    }
    const selectedEdge = activeSelectedEdgeIds.find((edgeId) => activeLayerEdgeIdSet.has(edgeId));
    return selectedEdge ? `edge:${selectedEdge}` : "";
  };
}

export function createAppHookCallback31(__appScope: Record<string, any>) {
  return () => {
  const { elementTree, elementTreeItemChildren, elementTreeSearchNeedle } = __appScope;
    if (!elementTreeSearchNeedle) {
      return elementTree;
    }
    return elementTree.flatMap((group) => {
      const nextDeviceGroups = (group.deviceGroups ?? []).flatMap((deviceGroup) => {
        const groupText = [
          group.typeKey,
          group.typeLabel,
          group.typeEnglishLabel,
          deviceGroup.deviceKey,
          deviceGroup.deviceLabel,
          deviceGroup.deviceEnglishLabel
        ].join(" ").toLocaleLowerCase();
        const nextItems = deviceGroup.items.filter((item) => {
          const itemChildren = elementTreeItemChildren(item);
          const itemText = [
            groupText,
            item.id,
            item.name,
            item.idx,
            ...itemChildren.flatMap((child) => [
              child.id,
              child.label,
              child.componentType,
              child.componentTypeLabel,
              child.idx,
              child.name,
              child.terminalLabels
            ])
          ].join(" ").toLocaleLowerCase();
          return itemText.includes(elementTreeSearchNeedle);
        });
        return nextItems.length > 0 ? [{ ...deviceGroup, items: nextItems }] : [];
      });
      if (nextDeviceGroups.length === 0) {
        return [];
      }
      return [{
        ...group,
        deviceGroups: nextDeviceGroups,
        items: nextDeviceGroups.flatMap((deviceGroup) => deviceGroup.items)
      }];
    });
  };
}

export function createAppHookCallback32(__appScope: Record<string, any>) {
  return () => {
  const { elementTreeCommittedDraftValue, elementTreeEditDrafts, setElementTreeEditDrafts } = __appScope;
    if (Object.keys(elementTreeEditDrafts).length === 0) {
      return;
    }
    setElementTreeEditDrafts((current) => {
      let changed = false;
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(current)) {
        if (elementTreeCommittedDraftValue(key) === value) {
          changed = true;
          continue;
        }
        next[key] = value;
      }
      return changed ? next : current;
    });
  };
}

export function createAppHookCallback33(__appScope: Record<string, any>) {
  return () => {
  const { selectedEdgeId, setSelectedEdgeIds } = __appScope;
    setSelectedEdgeIds((current) => {
      if (!selectedEdgeId) {
        return current.length === 0 ? current : [];
      }
      return current.includes(selectedEdgeId) ? current : [selectedEdgeId];
    });
  };
}

export function createAppHookCallback34(__appScope: Record<string, any>) {
  return () => {
  const { busNodeIdSet, connectSource, dirtyEdgeIdsAfterMove, dragging, graphStore, graphStoreApplyPatch, lastBusTerminalSyncEndpointRevisionRef, latestGraphStoreRef, manualPathDrag, markRouteEdgesDirty, markStoredRouteEdgesDirty, pendingBusTerminalSyncNodeIdsRef, rewiring, scheduleIdleWork, setGraphStore, suppressNextGraphDirtyRef, synchronizePendingBusTerminalsWithGraphStore, terminalPress } = __appScope;
    const pendingBusSyncNodeIds = pendingBusTerminalSyncNodeIdsRef.current;
    if (
      dragging ||
      manualPathDrag ||
      rewiring ||
      terminalPress?.moved ||
      connectSource ||
      (pendingBusSyncNodeIds.size === 0 && busNodeIdSet.size === 0)
    ) {
      return;
    }
    const scheduledBusSyncNodeIds = new Set(pendingBusSyncNodeIds);
    if (scheduledBusSyncNodeIds.size === 0) {
      if (lastBusTerminalSyncEndpointRevisionRef.current === graphStore.edgeEndpointRevision) {
        return;
      }
      lastBusTerminalSyncEndpointRevisionRef.current = graphStore.edgeEndpointRevision;
      return;
    } else {
      pendingBusTerminalSyncNodeIdsRef.current = new Set();
    }
    let busSyncCompleted = false;
    const cancelBusSync = scheduleIdleWork(() => {
      busSyncCompleted = true;
      const latestStore = latestGraphStoreRef.current;
      if (scheduledBusSyncNodeIds.size > 0 && latestStore) {
        const synchronized = synchronizePendingBusTerminalsWithGraphStore(latestStore, scheduledBusSyncNodeIds);
        if (!synchronized || (synchronized.nodeUpdates.length === 0 && synchronized.edgeUpserts.length === 0)) {
          lastBusTerminalSyncEndpointRevisionRef.current = latestStore.edgeEndpointRevision;
          return;
        }
        markRouteEdgesDirty(dirtyEdgeIdsAfterMove(
          synchronized.scopedEdges,
          synchronized.synchronized.edges,
          synchronized.nodeUpdates.map((node) => node.id)
        ));
        markStoredRouteEdgesDirty(synchronized.edgeUpserts.map((edge) => edge.id));
        suppressNextGraphDirtyRef.current = true;
        setGraphStore((current) => {
          const next = graphStoreApplyPatch(current, {
            nodeUpdates: synchronized.nodeUpdates,
            edgeUpserts: synchronized.edgeUpserts
          });
          lastBusTerminalSyncEndpointRevisionRef.current = next.edgeEndpointRevision;
          return next;
        });
        return;
      }
      lastBusTerminalSyncEndpointRevisionRef.current = graphStore.edgeEndpointRevision;
    }, 300, 1000);
    return () => {
      cancelBusSync();
      if (busSyncCompleted || scheduledBusSyncNodeIds.size === 0) {
        return;
      }
      const next = new Set(pendingBusTerminalSyncNodeIdsRef.current);
      for (const nodeId of scheduledBusSyncNodeIds) {
        next.add(nodeId);
      }
      pendingBusTerminalSyncNodeIdsRef.current = next;
    };
  };
}

export function createAppHookCallback35(__appScope: Record<string, any>) {
  return () => {
  const { elementTree, graphTreePanelActive, setCollapsedElementTreeDeviceGroups, setCollapsedElementTreeGroups, setElementTreeItemLimits } = __appScope;
    if (!graphTreePanelActive) {
      return;
    }
    const existingKeys = new Set(elementTree.map((group) => group.typeKey));
    const existingDeviceKeys = new Set(elementTree.flatMap((group) => (group.deviceGroups ?? []).map((deviceGroup) => deviceGroup.deviceKey)));
    setCollapsedElementTreeGroups((current) => current.filter((key) => existingKeys.has(key)));
    setCollapsedElementTreeDeviceGroups((current) => current.filter((key) => existingDeviceKeys.has(key)));
    setElementTreeItemLimits((current) => {
      const next: Record<string, number> = {};
      for (const group of elementTree) {
        for (const deviceGroup of group.deviceGroups ?? []) {
          if (current[deviceGroup.deviceKey]) {
            next[deviceGroup.deviceKey] = current[deviceGroup.deviceKey];
          }
        }
      }
      const changed = Object.keys(current).length !== Object.keys(next).length;
      return changed ? next : current;
    });
  };
}

export function createAppHookCallback36(__appScope: Record<string, any>) {
  return () => {
  const { ELEMENT_TREE_INITIAL_ITEM_LIMIT, ELEMENT_TREE_ITEM_LIMIT_STEP, elementTree, graphTreePanelActive, selectedElementTreeItemKey, setCollapsedElementTreeDeviceGroups, setCollapsedElementTreeGroups, setElementTreeItemLimits, setElementTreeItemWindows } = __appScope;
    if (!graphTreePanelActive || !selectedElementTreeItemKey) {
      return;
    }
    for (const group of elementTree) {
      for (const deviceGroup of group.deviceGroups ?? []) {
        const selectedIndex = deviceGroup.items.findIndex((item) => `${item.kind}:${item.id}` === selectedElementTreeItemKey);
        if (selectedIndex < 0) {
          continue;
        }
        setCollapsedElementTreeGroups((current) =>
          current.includes(group.typeKey) ? current.filter((key) => key !== group.typeKey) : current
        );
        setCollapsedElementTreeDeviceGroups((current) =>
          current.includes(deviceGroup.deviceKey) ? current.filter((key) => key !== deviceGroup.deviceKey) : current
        );
        setElementTreeItemLimits((current) => {
          const currentLimit = current[deviceGroup.deviceKey] ?? ELEMENT_TREE_INITIAL_ITEM_LIMIT;
          if (selectedIndex < currentLimit) {
            return current;
          }
          const nextLimit = Math.ceil((selectedIndex + 1) / ELEMENT_TREE_ITEM_LIMIT_STEP) * ELEMENT_TREE_ITEM_LIMIT_STEP;
          return { ...current, [deviceGroup.deviceKey]: Math.max(nextLimit, ELEMENT_TREE_INITIAL_ITEM_LIMIT) };
        });
        // 虚拟化窗口：保证选中项落在窗口内
        const total = deviceGroup.items.length;
        const ESTIMATED_ITEM_HEIGHT = 30;
        const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
        const N = Math.max(8, Math.floor(viewportHeight / ESTIMATED_ITEM_HEIGHT));
        const WINDOW = 2 * N;
        if (total > WINDOW) {
          setElementTreeItemWindows((current: Record<string, { start: number; end: number }>) => {
            const cur = current[deviceGroup.deviceKey] ?? { start: 0, end: Math.min(total, WINDOW) };
            if (selectedIndex >= cur.start && selectedIndex < cur.end) {
              return current;
            }
            let newStart = Math.max(0, selectedIndex - N);
            const newEnd = Math.min(total, newStart + WINDOW);
            newStart = Math.max(0, newEnd - WINDOW);
            return { ...current, [deviceGroup.deviceKey]: { start: newStart, end: newEnd } };
          });
        }
        return;
      }
    }
  };
}

export function createAppHookCallback37(__appScope: Record<string, any>) {
  return () => {
  const { elementTreeItemRefs, graphTreePanelActive, selectedElementTreeItemKey } = __appScope;
    if (!graphTreePanelActive || !selectedElementTreeItemKey) {
      return;
    }
    elementTreeItemRefs.current[selectedElementTreeItemKey]?.scrollIntoView({
      block: "nearest",
      inline: "nearest"
    });
  };
}

export function createAppHookCallback38(__appScope: Record<string, any>) {
  return () => {
  const { TOPOLOGY_WARNING_PAGE_SIZE, inspectorTopologyErrors, setTopologyWarningPage } = __appScope;
    setTopologyWarningPage((current) => Math.min(current, Math.max(0, Math.ceil(inspectorTopologyErrors.length / TOPOLOGY_WARNING_PAGE_SIZE) - 1)));
  };
}

export function createAppHookCallback39(__appScope: Record<string, any>) {
  return () => {
  const { inspectorTopologyErrors, setTopologyWarningPanelClosed } = __appScope;
    if (inspectorTopologyErrors.length === 0) {
      setTopologyWarningPanelClosed(false);
    }
  };
}

export function createAppHookCallback40(__appScope: Record<string, any>) {
  return () => {
  const { clampCanvasNoScrollOffsetPoint, setCanvasNoScrollOffset } = __appScope;
    setCanvasNoScrollOffset((current) => {
      const next = clampCanvasNoScrollOffsetPoint(current);
      return next.x === current.x && next.y === current.y ? current : next;
    });
  };
}

export function createAppHookCallback41(__appScope: Record<string, any>) {
  return () => {
  const { hideLibraryFlyout, leftPanelVisible } = __appScope;
    if (!leftPanelVisible) {
      hideLibraryFlyout();
    }
  };
}

export function createAppHookCallback42(__appScope: Record<string, any>) {
  return () => {
  const { updateCanvasFrameViewportAndVisibleBox } = __appScope;
    updateCanvasFrameViewportAndVisibleBox();
  };
}

export function createAppHookCallback43(__appScope: Record<string, any>) {
  return () => {
  const { canvasBounds, canvasFrameRef, canvasFrameViewportSize, canvasFullViewBox, fitWholeCanvasViewBox, initialCanvasFitAppliedRef, scheduleCanvasVisibleViewBoxUpdate, setCanvasVisibleViewBox, setViewBox } = __appScope;
    if (initialCanvasFitAppliedRef.current) {
      return;
    }
    if (canvasFrameViewportSize.width <= 0 || canvasFrameViewportSize.height <= 0) {
      return;
    }
    initialCanvasFitAppliedRef.current = true;
    setViewBox(fitWholeCanvasViewBox(canvasBounds, canvasFrameRef.current));
    setCanvasVisibleViewBox(canvasFullViewBox);
    scheduleCanvasVisibleViewBoxUpdate();
  };
}

export function createAppHookCallback44(__appScope: Record<string, any>) {
  return () => {
  const { canvasBoundsScrollSyncPendingRef, canvasFrameRef, canvasFrameViewportSize, canvasFrameViewportSizeChanged, canvasScrollSyncShouldRun, pendingCanvasBoundsScrollAnchorRef, pendingCanvasResizeCommitAnchorRef, pendingWheelZoomAnchorRef, scheduleCanvasVisibleViewBoxUpdate, skipNextCanvasScrollSyncRef, syncCanvasFrameScrollToCanvasResizeCommitAnchor, syncCanvasFrameScrollToViewBox, syncCanvasFrameScrollToWheelAnchor, updateCanvasFrameViewportSize, viewBox } = __appScope;
    const pendingWheelZoomAnchor = pendingWheelZoomAnchorRef.current;
    if (pendingWheelZoomAnchor) {
      pendingWheelZoomAnchorRef.current = null;
      syncCanvasFrameScrollToWheelAnchor(pendingWheelZoomAnchor);
      const wheelZoomViewportChanged = canvasFrameViewportSizeChanged(canvasFrameRef.current, canvasFrameViewportSize);
      if (wheelZoomViewportChanged) {
        pendingWheelZoomAnchorRef.current = pendingWheelZoomAnchor;
        updateCanvasFrameViewportSize();
      }
      scheduleCanvasVisibleViewBoxUpdate();
      return;
    }
    const pendingCanvasResizeCommitAnchor = pendingCanvasResizeCommitAnchorRef.current;
    if (pendingCanvasResizeCommitAnchor) {
      pendingCanvasResizeCommitAnchorRef.current = null;
      syncCanvasFrameScrollToCanvasResizeCommitAnchor(pendingCanvasResizeCommitAnchor);
      window.requestAnimationFrame(() => {
        syncCanvasFrameScrollToCanvasResizeCommitAnchor(pendingCanvasResizeCommitAnchor);
        scheduleCanvasVisibleViewBoxUpdate();
      });
      scheduleCanvasVisibleViewBoxUpdate();
      return;
    }
    if (!canvasScrollSyncShouldRun({
      skipNextScrollSync: skipNextCanvasScrollSyncRef.current,
      boundsScrollSyncPending: canvasBoundsScrollSyncPendingRef.current
    })) {
      skipNextCanvasScrollSyncRef.current = false;
      return;
    }
    skipNextCanvasScrollSyncRef.current = false;
    syncCanvasFrameScrollToViewBox(
      viewBox,
      canvasBoundsScrollSyncPendingRef.current ? pendingCanvasBoundsScrollAnchorRef.current : null
    );
    scheduleCanvasVisibleViewBoxUpdate();
  };
}

export function createAppHookCallback45(__appScope: Record<string, any>) {
  return () => {
  const { ResizeObserver, canvasFrameRef, handleCanvasFrameScroll, updateCanvasFrameViewportAndVisibleBox } = __appScope;
    const frame = canvasFrameRef.current;
    if (!frame) {
      return;
    }
    frame.addEventListener("scroll", handleCanvasFrameScroll, { passive: true });
    window.addEventListener("resize", updateCanvasFrameViewportAndVisibleBox);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateCanvasFrameViewportAndVisibleBox);
    observer?.observe(frame);
    updateCanvasFrameViewportAndVisibleBox();
    return () => {
      frame.removeEventListener("scroll", handleCanvasFrameScroll);
      window.removeEventListener("resize", updateCanvasFrameViewportAndVisibleBox);
      observer?.disconnect();
    };
    // 事件处理函数只读取 ref 中的最新 viewBox；监听器不需要随每次渲染重建。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };
}

export function createAppHookCallback46(__appScope: Record<string, any>) {
  return () => {
  const { canvasHeight, canvasWidth, setCanvasSizeDraft } = __appScope;
    setCanvasSizeDraft({ width: String(canvasWidth), height: String(canvasHeight) });
  };
}

export function createAppHookCallback47(__appScope: Record<string, any>) {
  return () => {
  const { colorDisplayMode, colorPalette, connectSource, getBusTerminalType, getTerminalDisplayColor, terminalColor, visibleNodeById } = __appScope;
    if (!connectSource) {
      return "";
    }
    const sourceNode = visibleNodeById.get(connectSource.nodeId);
    const terminal =
      sourceNode?.terminals.find((item) => item.id === connectSource.terminalId) ??
      sourceNode?.terminals[0];
    const terminalType = terminal?.type ?? (sourceNode ? getBusTerminalType(sourceNode) : undefined);
    return sourceNode && terminal
      ? getTerminalDisplayColor(sourceNode, terminal, colorDisplayMode, colorPalette)
      : terminalType
        ? terminalColor(terminalType, colorPalette)
        : "";
  };
}

export function createAppHookCallback48(__appScope: Record<string, any>) {
  return () => {
  const { colorPalette, routableLinePlacement, routableLineTemplateTerminalType, terminalColor } = __appScope;
    if (!routableLinePlacement) {
      return "";
    }
    return terminalColor(routableLineTemplateTerminalType(routableLinePlacement.template), colorPalette);
  };
}

export function createAppHookCallback49(__appScope: Record<string, any>) {
  return () => {
  const { colorPalette, nodeById, routableLineEndpointDrag, terminalColor } = __appScope;
    if (!routableLineEndpointDrag) {
      return "";
    }
    const node = nodeById.get(routableLineEndpointDrag.nodeId);
    const terminal = node?.terminals[routableLineEndpointDrag.endpoint === "source" ? 0 : 1] ?? node?.terminals[0];
    return terminal ? terminalColor(terminal.type, colorPalette) : "";
  };
}

export function createAppHookCallback50(__appScope: Record<string, any>) {
  return () => {
  const { connectSource, dragging, hasUnsavedChanges, manualPathDrag, rewiring, routableLineEndpointDrag, routableLinePlacement, routeRenderingReady, setRouteRenderingReady, terminalPress } = __appScope;
    if (routeRenderingReady) {
      return;
    }
    if (hasUnsavedChanges || manualPathDrag || rewiring || routableLinePlacement || routableLineEndpointDrag || terminalPress?.moved || dragging || connectSource) {
      setRouteRenderingReady(true);
    }
  };
}

export function createAppHookCallback51(__appScope: Record<string, any>) {
  return () => {
  const { cachedRouteInputRef, graphStore, routeInputLayerSignature, visibleEdges, visibleNodes } = __appScope;
    const cachedRouteInput = cachedRouteInputRef.current;
    if (
      cachedRouteInput &&
      cachedRouteInput.routeGeometryRevision === graphStore.routeGeometryRevision &&
      cachedRouteInput.layerSignature === routeInputLayerSignature
    ) {
      return cachedRouteInput;
    }
    const nextRouteInput = {
      routeGeometryRevision: graphStore.routeGeometryRevision,
      layerSignature: routeInputLayerSignature,
      nodes: visibleNodes,
      edges: visibleEdges
    };
    cachedRouteInputRef.current = nextRouteInput;
    return nextRouteInput;
  };
}

export function createAppHookCallback52(__appScope: Record<string, any>) {
  return () => {
    const ids = new Set<string>();
    return ids;
  };
}

export function createAppHookCallback53(__appScope: Record<string, any>) {
  return (): { routes: RoutedEdge[]; store: RouteStore | null } => {
  const { affectedRoutingEdgeIds, cachedRouteStoreRef, cachedRoutedEdgesRef, canvasBounds, editModeRouteRenderOptions, isEditMode, patchStoredRouteStoreForEdgeIds, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, routeEdgesForCachedStoredRendering, routeEdgesForIncrementalRendering, routeEdgesForSavedPathRendering, routeInput, routeRenderingEnabled, routingEdges, routingNodes } = __appScope;
    if (!routeRenderingEnabled) {
      return {
        routes: routeEdgesForSavedPathRendering(routingNodes, routingEdges, canvasBounds, { refreshCrossingArcs: false, preserveManualRouteDisplay: isEditMode }),
        store: null
      };
    }
    const committedStoredEdgeIds = pendingStoredRouteEdgeIdsRef.current;
    if (committedStoredEdgeIds.size > 0) {
      const patchedStoredRouteStore = patchStoredRouteStoreForEdgeIds(
        cachedRouteStoreRef.current,
        committedStoredEdgeIds,
        canvasBounds,
        routeInput.nodes
      );
      if (patchedStoredRouteStore) {
        return { routes: patchedStoredRouteStore.routes, store: patchedStoredRouteStore };
      }
      return {
        routes: routeEdgesForCachedStoredRendering(
          routeInput.nodes,
          routeInput.edges,
          committedStoredEdgeIds,
          canvasBounds,
          cachedRoutedEdgesRef.current,
          editModeRouteRenderOptions
        ),
        store: null
      };
    }
    const committedAffectedEdgeIds = pendingRouteEdgeIdsRef.current;
    const affectedEdgeIds = committedAffectedEdgeIds.size > 0
      ? new Set([...affectedRoutingEdgeIds, ...committedAffectedEdgeIds])
      : affectedRoutingEdgeIds;
    return {
      routes: routeEdgesForIncrementalRendering(
        routingNodes,
        routingEdges,
        affectedEdgeIds,
        canvasBounds,
        cachedRoutedEdgesRef.current,
        editModeRouteRenderOptions
      ),
      store: null
    };
  };
}

export function createAppHookCallback54(__appScope: Record<string, any>) {
  return () => {
  const { cachedRouteStoreRef, cachedRoutedEdgesRef, committedRouteDirtyGeneration, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, routeDirtyGenerationRef, routedEdgeStore, routedEdges } = __appScope;
    if (routeDirtyGenerationRef.current !== committedRouteDirtyGeneration) {
      return;
    }
    cachedRoutedEdgesRef.current = routedEdges;
    cachedRouteStoreRef.current = routedEdgeStore;
    pendingRouteEdgeIdsRef.current = new Set();
    pendingStoredRouteEdgeIdsRef.current = new Set();
  };
}

export function createAppHookCallback55(__appScope: Record<string, any>) {
  return () => {
  const { renderViewportBounds, sameRenderViewportBounds, snapRenderViewportBoundsForQuery, viewportQueryBoundsCacheRef } = __appScope;
    const nextViewportQueryBounds = snapRenderViewportBoundsForQuery(renderViewportBounds);
    const previousViewportQueryBounds = viewportQueryBoundsCacheRef.current;
    if (
      previousViewportQueryBounds &&
      sameRenderViewportBounds(previousViewportQueryBounds, nextViewportQueryBounds)
    ) {
      return previousViewportQueryBounds;
    }
    viewportQueryBoundsCacheRef.current = nextViewportQueryBounds;
    return nextViewportQueryBounds;
  };
}

export function createAppHookCallback56(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedEdgeSet, displaySelectedEdgeKey, effectiveViewportQueryBounds, queryRouteSpatialIndex, readViewportResultCache, routeRenderOrder, routedEdgeById, routedEdgeIndexById, routedEdgeSpatialIndex, routedEdgeStore, viewportBoundsCacheKey, viewportRoutedEdgesResultCacheRef, writeViewportResultCache } = __appScope;
    const viewportQueryCacheKey = viewportBoundsCacheKey(effectiveViewportQueryBounds);
    const cacheOwnerRefs = [routedEdgeStore, routedEdgeSpatialIndex, routedEdgeById, routedEdgeIndexById];
    const cachedRoutes = readViewportResultCache(viewportRoutedEdgesResultCacheRef.current, cacheOwnerRefs, displaySelectedEdgeKey, viewportQueryCacheKey);
    if (cachedRoutes) {
      return cachedRoutes;
    }
    let routes: RoutedEdge[];
    if (activeSelectedEdgeSet.size === 0) {
      routes = queryRouteSpatialIndex(routedEdgeSpatialIndex, effectiveViewportQueryBounds).sort(routeRenderOrder);
      writeViewportResultCache(viewportRoutedEdgesResultCacheRef.current, viewportQueryCacheKey, routes);
      return routes;
    }
    const regularRoutes: RoutedEdge[] = [];
    const selectedRoutes: RoutedEdge[] = [];
    const selectedRouteIds = new Set<string>();
    for (const route of queryRouteSpatialIndex(routedEdgeSpatialIndex, effectiveViewportQueryBounds)) {
      if (activeSelectedEdgeSet.has(route.edgeId)) {
        selectedRoutes.push(route);
        selectedRouteIds.add(route.edgeId);
      } else {
        regularRoutes.push(route);
      }
    }
    for (const edgeId of activeSelectedEdgeSet) {
      if (selectedRouteIds.has(edgeId)) {
        continue;
      }
      const route = routedEdgeById.get(edgeId);
      if (route) {
        selectedRoutes.push(route);
      }
    }
    regularRoutes.sort(routeRenderOrder);
    selectedRoutes.sort(routeRenderOrder);
    routes = selectedRoutes.length > 0 ? [...regularRoutes, ...selectedRoutes] : regularRoutes;
    writeViewportResultCache(viewportRoutedEdgesResultCacheRef.current, viewportQueryCacheKey, routes);
    return routes;
  };
}

export function createAppHookCallback57(__appScope: Record<string, any>) {
  return () => {
  const { connectSource, displaySelectedEdgeKey, displaySelectedNodeKey, draggingNodeIdSet, draggingNodeKey, edgeById, effectiveViewportQueryBounds, graphStore, queryNodeSpatialIndex, readViewportResultCache, routedEdgeStore, selectedNodeIdSet, viewportBoundsCacheKey, viewportNodesResultCacheRef, viewportRoutedEdges, visibleNodeById, visibleNodeIdSet, visibleNodeSpatialIndex, writeViewportResultCache } = __appScope;
    const viewportQueryCacheKey = viewportBoundsCacheKey(effectiveViewportQueryBounds);
    const cacheOwnerRefs = [visibleNodeSpatialIndex, visibleNodeById, visibleNodeIdSet, edgeById, graphStore.nodeIndexById, routedEdgeStore];
    const cacheToken = `${displaySelectedNodeKey}/${draggingNodeKey}/${connectSource?.nodeId ?? ""}/${displaySelectedEdgeKey}`;
    const cachedNodes = readViewportResultCache(viewportNodesResultCacheRef.current, cacheOwnerRefs, cacheToken, viewportQueryCacheKey);
    if (cachedNodes) {
      return cachedNodes;
    }
    const viewportNodeById = new Map<string, ModelNode>();
    const addVisibleNode = (node: ModelNode | undefined) => {
      if (node && visibleNodeIdSet.has(node.id)) {
        const currentNode = visibleNodeById.get(node.id) ?? node;
        viewportNodeById.set(node.id, currentNode);
      }
    };
    const addVisibleNodeId = (nodeId: string | undefined) => {
      addVisibleNode(nodeId ? visibleNodeById.get(nodeId) : undefined);
    };
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, effectiveViewportQueryBounds)) {
      addVisibleNode(node);
    }
    selectedNodeIdSet.forEach(addVisibleNodeId);
    draggingNodeIdSet.forEach(addVisibleNodeId);
    addVisibleNodeId(connectSource?.nodeId);
    for (const route of viewportRoutedEdges) {
      const edge = edgeById.get(route.edgeId);
      if (edge) {
        addVisibleNodeId(edge.sourceId);
        addVisibleNodeId(edge.targetId);
      }
    }
    const nodes = Array.from(viewportNodeById.values()).sort(
      (first, second) =>
        (graphStore.nodeIndexById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
        (graphStore.nodeIndexById.get(second.id) ?? Number.MAX_SAFE_INTEGER)
    );
    writeViewportResultCache(viewportNodesResultCacheRef.current, viewportQueryCacheKey, nodes);
    return nodes;
  };
}

export function createAppHookCallback58(__appScope: Record<string, any>) {
  return () => {
  const { EMPTY_CANVAS_LAYOUT_UNITS, activeLayerEdges, activeLayerGroups, activeLayerNodes, activeSelectedEdgeIds, buildCanvasLayoutUnits, editHotInteractionActive, isCanvasNodeMovable, isEditMode, routedEdges, selectedLayoutUnitsCacheRef, transformableActiveSelectedNodeIds } = __appScope;
      if (!isEditMode) {
        selectedLayoutUnitsCacheRef.current = EMPTY_CANVAS_LAYOUT_UNITS;
        return EMPTY_CANVAS_LAYOUT_UNITS;
      }
      if (editHotInteractionActive && selectedLayoutUnitsCacheRef.current.length > 0) {
        return selectedLayoutUnitsCacheRef.current;
      }
      if (transformableActiveSelectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0) {
        selectedLayoutUnitsCacheRef.current = EMPTY_CANVAS_LAYOUT_UNITS;
        return EMPTY_CANVAS_LAYOUT_UNITS;
      }
      const units = buildCanvasLayoutUnits(
        activeLayerGroups,
        activeLayerNodes,
        transformableActiveSelectedNodeIds,
        activeSelectedEdgeIds,
        activeLayerEdges,
        routedEdges,
        { isTransformableNode: (node) => isCanvasNodeMovable(node.kind) }
      );
      selectedLayoutUnitsCacheRef.current = units;
      return units;
    };
}

export function createAppHookCallback59(__appScope: Record<string, any>) {
  return () => {
  const { activeLayerNodeIdSet, activeSelectedNodeIds, isEditMode, isRoutableLineDeviceKind, routableLineDeviceCanvasPoints, routableLineEndpointDrag, visibleNodeById } = __appScope;
    if (!isEditMode) {
      return [];
    }
    return activeSelectedNodeIds.flatMap((nodeId) => {
      const node = visibleNodeById.get(nodeId);
      if (!node || !activeLayerNodeIdSet.has(node.id) || !isRoutableLineDeviceKind(node.kind)) {
        return [];
      }
      const points = routableLineDeviceCanvasPoints(node);
      const start = points[0];
      const end = points[points.length - 1];
      if (!start || !end) {
        return [];
      }
      const sourcePoint =
        routableLineEndpointDrag?.nodeId === node.id && routableLineEndpointDrag.endpoint === "source"
          ? routableLineEndpointDrag.previewPoint
          : start;
      const targetPoint =
        routableLineEndpointDrag?.nodeId === node.id && routableLineEndpointDrag.endpoint === "target"
          ? routableLineEndpointDrag.previewPoint
          : end;
      return [
        { node, endpoint: "source" as const, point: sourcePoint },
        { node, endpoint: "target" as const, point: targetPoint }
      ];
    });
  };
}

export function createAppHookCallback60(__appScope: Record<string, any>) {
  return () => {
  const { canvasBounds, compactPreviewNodes, edgeById, endpointMatchedRoutePointsForEdge, getModelEdgeEndpointPoint, isBusNode, nodeById, nodes, pointsToPreviewPath, preserveConnectionEdgeRouteShape, previewStoredRoutePointsForEdge, resolveStraightBusSlideEndpointToPoint, rewiring, routeEdgesForStoredRendering, routedEdgeById } = __appScope;
    if (!rewiring) {
      return null;
    }
    const edge = edgeById.get(rewiring.edgeId);
    if (!edge) {
      return null;
    }
    const sourceNode = nodeById.get(edge.sourceId);
    const targetNode = nodeById.get(edge.targetId);
    if (!sourceNode || !targetNode) {
      return null;
    }
    const currentCachedRoutePoints = endpointMatchedRoutePointsForEdge(edge, routedEdgeById.get(edge.id)?.points);
    const currentPreviewRoutePoints = currentCachedRoutePoints.length
      ? currentCachedRoutePoints
      : previewStoredRoutePointsForEdge(edge);
    const currentSourcePoint = currentPreviewRoutePoints[0] ?? getModelEdgeEndpointPoint(
      sourceNode,
      edge.sourcePoint,
      edge.sourceTerminalId
    );
    const currentTargetPoint = currentPreviewRoutePoints[currentPreviewRoutePoints.length - 1] ?? getModelEdgeEndpointPoint(
      targetNode,
      edge.targetPoint,
      edge.targetTerminalId
    );
    const slidePatch = resolveStraightBusSlideEndpointToPoint({
      edge,
      sourceNode,
      targetNode,
      movingEndpoint: rewiring.endpoint,
      movingPoint: rewiring.previewPoint,
      nodes
    });
    const previewEdge = slidePatch ? { ...edge, ...slidePatch } : edge;
    const movingTarget = rewiring.dropTarget;
    const previewRouteEdge: Edge = {
      ...previewEdge,
      sourceId:
        rewiring.endpoint === "source"
          ? movingTarget?.node.id ?? "floating-rewire-source"
          : edge.sourceId,
      targetId:
        rewiring.endpoint === "target"
          ? movingTarget?.node.id ?? "floating-rewire-target"
          : edge.targetId,
      sourceTerminalId:
        rewiring.endpoint === "source"
          ? movingTarget?.terminalId ?? "t1"
          : previewEdge.sourceTerminalId,
      targetTerminalId:
        rewiring.endpoint === "target"
          ? movingTarget?.terminalId ?? "t1"
          : previewEdge.targetTerminalId,
      sourcePoint:
        rewiring.endpoint === "source"
          ? movingTarget && isBusNode(movingTarget.node)
            ? movingTarget.point
            : rewiring.previewPoint
          : isBusNode(sourceNode)
            ? currentSourcePoint
            : previewEdge.sourcePoint,
      targetPoint:
        rewiring.endpoint === "target"
          ? movingTarget && isBusNode(movingTarget.node)
            ? movingTarget.point
            : rewiring.previewPoint
          : isBusNode(targetNode)
            ? currentTargetPoint
            : previewEdge.targetPoint
    };
    const previewNodes = compactPreviewNodes(
      rewiring.endpoint === "source" ? movingTarget?.node : sourceNode,
      rewiring.endpoint === "target" ? movingTarget?.node : targetNode
    );
    const previewStoredPoints = currentPreviewRoutePoints.length >= 2
      ? currentPreviewRoutePoints.map((point) => ({ ...point }))
      : previewStoredRoutePointsForEdge(edge, currentSourcePoint, currentTargetPoint);
    const preservedPreviewEdge = preserveConnectionEdgeRouteShape(previewNodes, previewRouteEdge, previewStoredPoints, canvasBounds);
    const route = preservedPreviewEdge.routePoints?.length
      ? {
          edgeId: edge.id,
          points: preservedPreviewEdge.routePoints,
          path: pointsToPreviewPath(preservedPreviewEdge.routePoints)
        }
      : routeEdgesForStoredRendering(previewNodes, [previewRouteEdge], canvasBounds)[0];
    return {
      edgeId: edge.id,
      path: route?.path ?? ""
    };
  };
}

export function createAppHookCallback61(__appScope: Record<string, any>) {
  return () => {
  const { canvasBounds, isRoutableLineDeviceKind, nodeById, nodes, pointsToPreviewPath, routableLineDeviceCanvasPoints, routableLineDeviceEndpointRefForNode, routableLineDeviceEndpointRefs, routableLineEndpointDrag, routableLineEndpointPreviewRoutePoints, setRoutableLineDeviceEndpointsPreservingRoute } = __appScope;
    if (!routableLineEndpointDrag) {
      return null;
    }
    const lineNode = nodeById.get(routableLineEndpointDrag.nodeId);
    if (!lineNode || !isRoutableLineDeviceKind(lineNode.kind)) {
      return null;
    }
    const points = routableLineDeviceCanvasPoints(lineNode);
    const currentStart = points[0];
    const currentEnd = points[points.length - 1];
    if (!currentStart || !currentEnd) {
      return null;
    }
    const nextStart = routableLineEndpointDrag.endpoint === "source" ? routableLineEndpointDrag.previewPoint : currentStart;
    const nextEnd = routableLineEndpointDrag.endpoint === "target" ? routableLineEndpointDrag.previewPoint : currentEnd;
    const refs = routableLineDeviceEndpointRefs(lineNode);
    const movingTarget = routableLineEndpointDrag.dropTarget;
    const movingRef = movingTarget ? routableLineDeviceEndpointRefForNode(movingTarget.node, movingTarget.terminalId, movingTarget.point) : undefined;
    const previewRefs = {
      source: routableLineEndpointDrag.endpoint === "source" ? movingRef : refs.source,
      target: routableLineEndpointDrag.endpoint === "target" ? movingRef : refs.target
    };
    const previewNodeById = new Map(nodes.map((node) => [node.id, node]));
    if (movingTarget) {
      previewNodeById.set(movingTarget.node.id, movingTarget.node);
    }
    const rawLine = setRoutableLineDeviceEndpointsPreservingRoute(
      lineNode,
      nextStart,
      nextEnd,
      previewRefs,
      previewNodeById,
      canvasBounds
    );
    const routePoints = routableLineDeviceCanvasPoints(rawLine);
    const previewRoutePoints = routePoints.length <= 2
      ? routableLineEndpointPreviewRoutePoints(previewRefs, nextStart, nextEnd, previewNodeById, canvasBounds) ?? routePoints
      : routePoints;
    return {
      nodeId: lineNode.id,
      path: pointsToPreviewPath(previewRoutePoints)
    };
  };
}

export function createAppHookCallback62(__appScope: Record<string, any>) {
  return () => {
  const { manualPathDrag, pointsToPreviewPath } = __appScope;
    if (!manualPathDrag?.previewRoutePoints?.length) {
      return null;
    }
    return {
      edgeId: manualPathDrag.edgeId,
      nodeId: manualPathDrag.nodeId,
      points: manualPathDrag.previewRoutePoints,
      path: pointsToPreviewPath(manualPathDrag.previewRoutePoints)
    };
  };
}

export function createAppHookCallback63(__appScope: Record<string, any>) {
  return () => {
  const { activeLayerNodeIdSet, isEditMode, isRoutableLineDeviceKind, manualPathPreviewRoute, pointsToPreviewPath, routableLineDeviceCanvasPoints, selectedNode, selectedNodeCount } = __appScope;
    if (!isEditMode || selectedNodeCount !== 1 || !selectedNode || !activeLayerNodeIdSet.has(selectedNode.id) || !isRoutableLineDeviceKind(selectedNode.kind)) {
      return null;
    }
    const points = manualPathPreviewRoute?.nodeId === selectedNode.id
      ? manualPathPreviewRoute.points
      : routableLineDeviceCanvasPoints(selectedNode);
    if (points.length < 2) {
      return null;
    }
    return {
      node: selectedNode,
      points,
      path: pointsToPreviewPath(points)
    };
  };
}

export function createAppHookCallback64(__appScope: Record<string, any>) {
  return () => {
  const { canvasBounds, compactPreviewNodes, edgeWithFrozenBusEndpointPoints, nodeById, pointsToPreviewPath, preserveConnectionEdgeRouteShape, previewStoredRoutePointsForEdge, resolveStraightBusSlideEndpoint, routeEdgesForStoredRendering, terminalPress, visibleEdgesByTerminalRef, visibleNodes } = __appScope;
    if (!terminalPress?.moved) {
      return [];
    }
    const connectedEdges = visibleEdgesByTerminalRef.get(`${terminalPress.nodeId}:${terminalPress.terminalId}`) ?? [];
    return connectedEdges.flatMap((edge) => {
      const sourceAffected = edge.sourceId === terminalPress.nodeId && edge.sourceTerminalId === terminalPress.terminalId;
      const targetAffected = edge.targetId === terminalPress.nodeId && edge.targetTerminalId === terminalPress.terminalId;
      if (!sourceAffected && !targetAffected) {
        return [];
      }
      const sourceNode = nodeById.get(edge.sourceId);
      const targetNode = nodeById.get(edge.targetId);
      if (!sourceNode || !targetNode) {
        return [];
      }
      const previewStoredPoints = previewStoredRoutePointsForEdge(edge);
      const frozenPreviewEdge = edgeWithFrozenBusEndpointPoints(edge, previewStoredPoints);
      const slidePatch = resolveStraightBusSlideEndpoint({
        edge: frozenPreviewEdge,
        sourceNode,
        targetNode,
        nextSourceNode: sourceNode,
        nextTargetNode: targetNode,
        movingEndpoint: sourceAffected ? "source" : "target",
        nodes: visibleNodes,
        originalMovingPoint: terminalPress.startPoint
      });
      const previewEdge = slidePatch ? { ...frozenPreviewEdge, ...slidePatch } : frozenPreviewEdge;
      const previewNodes = compactPreviewNodes(sourceNode, targetNode);
      const preservedPreviewEdge = preserveConnectionEdgeRouteShape(previewNodes, previewEdge, previewStoredPoints, canvasBounds);
      const route = preservedPreviewEdge.routePoints?.length
        ? {
            edgeId: edge.id,
            points: preservedPreviewEdge.routePoints,
            path: pointsToPreviewPath(preservedPreviewEdge.routePoints)
          }
        : routeEdgesForStoredRendering(previewNodes, [previewEdge], canvasBounds)[0];
      return route ? [{
        edgeId: edge.id,
        path: route.path
      }] : [];
    });
  };
}

export function createAppHookCallback65(__appScope: Record<string, any>) {
  return () => {
  const { dragging, draggingDelta, nodeById } = __appScope;
    const preview = new Map<string, ModelNode>();
    if (!dragging || !draggingDelta) {
      return preview;
    }
    for (const nodeId of dragging.nodeIds) {
      const node = nodeById.get(nodeId);
      const originalPosition = dragging.originalPositions[nodeId];
      if (!node || !originalPosition) {
        continue;
      }
      preview.set(nodeId, {
        ...node,
        position: {
          x: originalPosition.x + draggingDelta.x,
          y: originalPosition.y + draggingDelta.y
        }
      });
    }
    return preview;
  };
}

export function createAppHookCallback66(__appScope: Record<string, any>) {
  return () => {
  const { CONNECT_TERMINAL_SNAP_TOLERANCE, dragPreviewMovedNodeById, dragging, draggingDelta, draggingNodeIdSet, getNodeScaleX, getNodeScaleY, isMultiNodeMoveState, nodeById } = __appScope;
    if (!dragging || !draggingDelta || isMultiNodeMoveState(dragging)) {
      return null;
    }
    const padding = Math.max(160, CONNECT_TERMINAL_SNAP_TOLERANCE * 4);
    const draggedEdgeIds = new Set(dragging.edgeIds);
    let bounds: RenderViewportBounds | null = null;
    const includeBox = (box: RenderViewportBounds) => {
      bounds = bounds
        ? {
            left: Math.min(bounds.left, box.left),
            right: Math.max(bounds.right, box.right),
            top: Math.min(bounds.top, box.top),
            bottom: Math.max(bounds.bottom, box.bottom)
          }
        : { ...box };
    };
    const includePoint = (point: Point) => {
      includeBox({ left: point.x, right: point.x, top: point.y, bottom: point.y });
    };
    const includeNode = (node: ModelNode | undefined) => {
      if (!node) {
        return;
      }
      const halfDiagonal = Math.hypot(node.size.width * getNodeScaleX(node), node.size.height * getNodeScaleY(node)) / 2 + 24;
      includeBox({
        left: node.position.x - halfDiagonal,
        right: node.position.x + halfDiagonal,
        top: node.position.y - halfDiagonal,
        bottom: node.position.y + halfDiagonal
      });
    };
    for (const nodeId of dragging.nodeIds) {
      includeNode(nodeById.get(nodeId));
      includeNode(dragPreviewMovedNodeById.get(nodeId));
    }
    for (const edge of dragging.affectedEdges) {
      includeNode(dragPreviewMovedNodeById.get(edge.sourceId) ?? nodeById.get(edge.sourceId));
      includeNode(dragPreviewMovedNodeById.get(edge.targetId) ?? nodeById.get(edge.targetId));
      const originalRoute = dragging.originalRoutePoints[edge.id];
      if (originalRoute?.length) {
        const shiftWholeRoute = draggedEdgeIds.has(edge.id);
        for (const point of originalRoute) {
          includePoint(point);
          if (shiftWholeRoute) {
            includePoint({ x: point.x + draggingDelta.x, y: point.y + draggingDelta.y });
          }
        }
      }
      const originalEdgePoints = dragging.originalEdgePoints[edge.id];
      if (originalEdgePoints?.sourcePoint) {
        includePoint(originalEdgePoints.sourcePoint);
        if (draggingNodeIdSet.has(edge.sourceId)) {
          includePoint({ x: originalEdgePoints.sourcePoint.x + draggingDelta.x, y: originalEdgePoints.sourcePoint.y + draggingDelta.y });
        }
      }
      if (originalEdgePoints?.targetPoint) {
        includePoint(originalEdgePoints.targetPoint);
        if (draggingNodeIdSet.has(edge.targetId)) {
          includePoint({ x: originalEdgePoints.targetPoint.x + draggingDelta.x, y: originalEdgePoints.targetPoint.y + draggingDelta.y });
        }
      }
    }
    if (!bounds) {
      return null;
    }
    const finalBounds = bounds as RenderViewportBounds;
    return {
      left: finalBounds.left - padding,
      right: finalBounds.right + padding,
      top: finalBounds.top - padding,
      bottom: finalBounds.bottom + padding
    };
  };
}

export function createAppHookCallback67(__appScope: Record<string, any>) {
  return () => {
  const { candidateNodeIntersectsInteractionBounds, dragInteractionBounds, dragPreviewMovedNodeById, dragging, draggingDelta, isMultiNodeMoveState, nodeById, queryNodeSpatialIndex, visibleNodeIdSet, visibleNodeSpatialIndex, visibleNodes } = __appScope;
    if (isMultiNodeMoveState(dragging)) {
      return [];
    }
    if (!dragging || !draggingDelta || !dragInteractionBounds) {
      return visibleNodes;
    }
    const requiredNodeIds = new Set<string>(dragging.nodeIds);
    for (const edge of dragging.affectedEdges) {
      requiredNodeIds.add(edge.sourceId);
      requiredNodeIds.add(edge.targetId);
    }
    const candidatesById = new Map<string, ModelNode>();
    for (const nodeId of requiredNodeIds) {
      if (!visibleNodeIdSet.has(nodeId)) {
        continue;
      }
      const movedNode = dragPreviewMovedNodeById.get(nodeId);
      const node = movedNode ?? nodeById.get(nodeId);
      if (node) {
        candidatesById.set(node.id, node);
      }
    }
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, dragInteractionBounds)) {
      const movedNode = dragPreviewMovedNodeById.get(node.id);
      const candidateNode = movedNode ?? node;
      if (candidateNodeIntersectsInteractionBounds(candidateNode)) {
        candidatesById.set(candidateNode.id, candidateNode);
      }
    }
    return Array.from(candidatesById.values());
  };
}

export function createAppHookCallback68(__appScope: Record<string, any>) {
  return () => {
  const { scheduleIdleWork, setStaticTerminalOverlapReadyKey, staticTerminalOverlapDeferred, staticTerminalOverlapSourceKey } = __appScope;
    if (!staticTerminalOverlapDeferred) {
      setStaticTerminalOverlapReadyKey("");
      return;
    }
    setStaticTerminalOverlapReadyKey((current) => (current === staticTerminalOverlapSourceKey ? current : ""));
    return scheduleIdleWork(() => setStaticTerminalOverlapReadyKey(staticTerminalOverlapSourceKey), 120, 1500);
  };
}

export function createAppHookCallback69(__appScope: Record<string, any>) {
  return () => {
  const { getOverlappingTerminalGroups, getTerminalBusContactGroups, isReadonlyCanvasMode, suppressDragTerminalInteraction, terminalOverlapAffectedNodeIds, terminalOverlapCalculationReady, terminalOverlapNodes } = __appScope;
      if (isReadonlyCanvasMode) {
        return new Set<string>();
      }
      if (suppressDragTerminalInteraction) {
        return new Set<string>();
      }
      if (!terminalOverlapCalculationReady) {
        return new Set<string>();
      }
      return new Set(
        [
          ...getOverlappingTerminalGroups(terminalOverlapNodes, terminalOverlapAffectedNodeIds).flatMap((group) =>
            group.terminals.map((terminal) => `${terminal.nodeId}:${terminal.terminalId}`)
          ),
          ...getTerminalBusContactGroups(terminalOverlapNodes, 0, terminalOverlapAffectedNodeIds).flatMap((group) =>
            group.contacts.map((contact) => `${contact.nodeId}:${contact.terminalId}`)
          )
        ]
      );
    };
}

export function createAppHookCallback70(__appScope: Record<string, any>) {
  return () => {
  const { colorPalette, dragPreviewNodeFor, getBusTerminalType, isBusNode, nodeTerminalSnapTarget, terminalColor } = __appScope;
    if (!nodeTerminalSnapTarget) {
      return undefined;
    }
    const targetNode = dragPreviewNodeFor(nodeTerminalSnapTarget.targetNodeId);
    const terminalType = targetNode && isBusNode(targetNode)
      ? getBusTerminalType(targetNode)
      : targetNode?.terminals.find((terminal) => terminal.id === nodeTerminalSnapTarget.targetTerminalId)?.type;
    return terminalType ? ({ "--connection-color": terminalColor(terminalType, colorPalette) } as CSSProperties) : undefined;
  };
}

export function createAppHookCallback71(__appScope: Record<string, any>) {
  return () => {
  const { activeDropReady, drawingModeActive } = __appScope;
    document.body.classList.toggle("canvas-drawing-mode", drawingModeActive);
    document.body.classList.toggle("canvas-connect-drop-ready", drawingModeActive && activeDropReady);
    return () => {
      document.body.classList.remove("canvas-drawing-mode");
      document.body.classList.remove("canvas-connect-drop-ready");
    };
  };
}

export function createAppHookCallback72(__appScope: Record<string, any>) {
  return () => {
  const { groupTransformGeometry, isGroupTransformDrag, pointsToPreviewPath, transformDrag, transformGroupPoint, visibleEdgeIdSet } = __appScope;
    if (!transformDrag || !isGroupTransformDrag(transformDrag) || !transformDrag.previewPoint) {
      return [];
    }
    const geometry = groupTransformGeometry(transformDrag, transformDrag.previewPoint);
    return transformDrag.originalEdgeRoutes.flatMap((route) => {
      if (!visibleEdgeIdSet.has(route.edgeId)) {
        return [];
      }
      const points = route.points.map((routePoint) => transformGroupPoint(transformDrag, geometry, routePoint));
      return [{
        edgeId: route.edgeId,
        path: pointsToPreviewPath(points)
      }];
    });
  };
}

export function createAppHookCallback73(__appScope: Record<string, any>) {
  return () => {
  const { isGroupTransformDrag, routableLineNodeIdsByEndpointNodeId, transformDrag } = __appScope;
    if (!transformDrag || !isGroupTransformDrag(transformDrag) || !transformDrag.previewPoint) {
      return new Set<string>();
    }
    const lineIds = new Set<string>();
    for (const nodeId of transformDrag.nodeIds) {
      for (const lineId of routableLineNodeIdsByEndpointNodeId.get(nodeId) ?? []) {
        lineIds.add(lineId);
      }
    }
    return lineIds;
  };
}

export function createAppHookCallback74(__appScope: Record<string, any>) {
  return () => {
  const { buildLightweightNodeDragPreviewRoutes, dragging, draggingDelta, isMultiNodeMoveState, singleNodeDragPreviewEdges } = __appScope;
    if (!dragging || !draggingDelta) {
      return [];
    }
    const previewEdges = isMultiNodeMoveState(dragging)
      ? dragging.overlayPreview?.dynamicEdgePreviewEdges ?? []
      : singleNodeDragPreviewEdges(dragging, draggingDelta);
    return buildLightweightNodeDragPreviewRoutes(dragging, draggingDelta, previewEdges);
  };
}

export function createAppHookCallback75(__appScope: Record<string, any>) {
  return () => {
  const { buildRoutableLineDragGhostRoutesForNodeIds, cachedConnectionStrokeColor, dragMovedNodeIdSet, dragging, draggingDelta, draggingNodeIdSet, isMultiNodeMoveState, nodeById, pointsToPreviewPath, visibleEdgeIdSet } = __appScope;
    if (!dragging || (!draggingDelta && !isMultiNodeMoveState(dragging))) {
      return [];
    }
    if (isMultiNodeMoveState(dragging)) {
      return dragging.overlayPreview?.ghostRoutes ?? [];
    }
    const draggedEdgeIds = new Set(dragging.edgeIds);
    const connectionGhostRoutes = dragging.affectedEdges.flatMap((edge): DragGhostRoute[] => {
      if (!visibleEdgeIdSet.has(edge.id)) {
        return [];
      }
      if (!draggingNodeIdSet.has(edge.sourceId) && !draggingNodeIdSet.has(edge.targetId) && !draggedEdgeIds.has(edge.id)) {
        return [];
      }
      const sourceNode = nodeById.get(edge.sourceId);
      const targetNode = nodeById.get(edge.targetId);
      if (!sourceNode || !targetNode) {
        return [];
      }
      const points = dragging.originalRoutePoints[edge.id];
      return points?.length
        ? [{
            edgeId: edge.id,
            path: pointsToPreviewPath(points),
            color: cachedConnectionStrokeColor(edge)
          }]
        : [];
    });
    return [
      ...connectionGhostRoutes,
      ...buildRoutableLineDragGhostRoutesForNodeIds(dragMovedNodeIdSet(dragging))
    ];
  };
}

export function createAppHookCallback76(__appScope: Record<string, any>) {
  return () => {
  const { containerParamViewId, selectedContainerParameterViews, setContainerParamViewId } = __appScope;
    if (selectedContainerParameterViews.length === 0) {
      if (containerParamViewId !== "container") {
        setContainerParamViewId("container");
      }
      return;
    }
    if (!selectedContainerParameterViews.some((view) => view.id === containerParamViewId)) {
      setContainerParamViewId(selectedContainerParameterViews[0].id);
    }
  };
}

export function createAppHookCallback77(__appScope: Record<string, any>) {
  return () => {
  const { activeSchemeKey, backendSchemesLoadTokenRef, backendSchemesLoadedRef, clearActiveProjectDisplay, fetchBackendSchemes, findSavedProjectByActivePointer, flattenSavedSchemes, latestActiveProjectPointerRef, loadSavedProjectRecord, rememberPersistedSchemesPayload, saveRequiredRef, serializeSchemesForStorage, setExpandedSchemeIds, setSchemesState, suppressNextBackendSchemeSyncRef } = __appScope;
    const loadToken = ++backendSchemesLoadTokenRef.current;
    fetchBackendSchemes()
      .then((backendSchemes) => {
        if (loadToken !== backendSchemesLoadTokenRef.current) {
          return;
        }
        backendSchemesLoadedRef.current = true;
        if (backendSchemes.length > 0) {
          const backendPayload = serializeSchemesForStorage(backendSchemes);
          rememberPersistedSchemesPayload(backendPayload);
          suppressNextBackendSchemeSyncRef.current = true;
          setSchemesState(backendSchemes);
          if (!saveRequiredRef.current) {
            const activePointer = latestActiveProjectPointerRef.current;
            const backendActiveProject = findSavedProjectByActivePointer(backendSchemes, activePointer);
            if (backendActiveProject) {
              void loadSavedProjectRecord(backendActiveProject.project, backendActiveProject.scheme.id, backendSchemes);
            }
          }
          setExpandedSchemeIds((current) => {
            const backendSchemeIds = new Set(flattenSavedSchemes(backendSchemes).map((scheme) => scheme.id));
            const retained = current.filter((schemeId) => backendSchemeIds.has(schemeId));
            if (retained.length > 0) {
              return retained;
            }
            const preferredSchemeId =
              (activeSchemeKey && backendSchemeIds.has(activeSchemeKey) ? activeSchemeKey : "") ||
              backendSchemes[0]?.id ||
              "";
            return preferredSchemeId ? [preferredSchemeId] : [];
          });
          return;
        }
        const emptySchemesPayload = serializeSchemesForStorage([]);
        suppressNextBackendSchemeSyncRef.current = true;
        rememberPersistedSchemesPayload(emptySchemesPayload);
        setSchemesState([]);
        setExpandedSchemeIds([]);
        if (!saveRequiredRef.current) {
          clearActiveProjectDisplay("没有可用方案，画布已清空");
        }
      })
      .catch(() => {
        if (loadToken !== backendSchemesLoadTokenRef.current) {
          return;
        }
        backendSchemesLoadedRef.current = false;
        // 后台不可用时继续使用浏览器本地保存。
      });
    // 仅在启动时从后台拉取一次，避免后台数据刷新打断当前画布。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };
}

export function createAppHookCallback78(__appScope: Record<string, any>) {
  return () => {
  const { backendColorConfigLoadedRef, colorDisplayMode, colorPalette, fetchBackendColorConfig, lastPersistedColorConfigPayloadRef, saveBackendColorConfigPayload, serializeColorConfigForStorage, setColorDisplayMode, setColorPalette, setColorPaletteDraft, setColorPaletteTab, suppressNextBackendColorSyncRef } = __appScope;
    fetchBackendColorConfig()
      .then((backendColorConfig) => {
        backendColorConfigLoadedRef.current = true;
        if (backendColorConfig.exists) {
          const backendPayload = serializeColorConfigForStorage(backendColorConfig.colorDisplayMode, backendColorConfig.colorPalette);
          lastPersistedColorConfigPayloadRef.current = backendPayload;
          suppressNextBackendColorSyncRef.current = true;
          setColorDisplayMode(backendColorConfig.colorDisplayMode);
          setColorPalette(backendColorConfig.colorPalette);
          setColorPaletteDraft(backendColorConfig.colorPalette);
          setColorPaletteTab(backendColorConfig.colorDisplayMode);
          return;
        }
        const localPayload = serializeColorConfigForStorage(colorDisplayMode, colorPalette);
        lastPersistedColorConfigPayloadRef.current = localPayload;
        void saveBackendColorConfigPayload(localPayload).catch(() => {
          // 后台暂不可写时仍保留浏览器本地配色缓存。
        });
      })
      .catch(() => {
        backendColorConfigLoadedRef.current = false;
        // 后台不可用时继续使用浏览器本地配色缓存。
      });
    // 仅在启动时从后台拉取一次，避免后台配置刷新打断当前操作。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };
}

export function createAppHookCallback79(__appScope: Record<string, any>) {
  return () => {
  const { backendDeviceLibraryLoadedRef, customAttributeLibraries, customComponentTypes, customDeviceTemplates, customGraphTemplateTypes, customGraphTemplates, deviceDefinitionOverrides, fetchBackendDeviceLibrary, lastPersistedDeviceLibraryPayloadRef, saveBackendDeviceLibraryPayload, serializeDeviceLibraryForStorage, setCustomAttributeLibraries, setCustomComponentTypes, setCustomDeviceTemplates, setCustomGraphTemplateTypes, setCustomGraphTemplates, setDeviceDefinitionOverrides, suppressNextBackendDeviceLibrarySyncRef } = __appScope;
    fetchBackendDeviceLibrary()
      .then((backendDeviceLibrary) => {
        backendDeviceLibraryLoadedRef.current = true;
        if (backendDeviceLibrary.exists) {
          const backendPayload = serializeDeviceLibraryForStorage(backendDeviceLibrary);
          lastPersistedDeviceLibraryPayloadRef.current = backendPayload;
          suppressNextBackendDeviceLibrarySyncRef.current = true;
          setCustomDeviceTemplates(backendDeviceLibrary.customDeviceTemplates);
          setCustomAttributeLibraries(backendDeviceLibrary.customAttributeLibraries);
          setCustomComponentTypes(backendDeviceLibrary.customComponentTypes);
          setDeviceDefinitionOverrides(backendDeviceLibrary.deviceDefinitionOverrides);
          setCustomGraphTemplateTypes(backendDeviceLibrary.customGraphTemplateTypes);
          setCustomGraphTemplates(backendDeviceLibrary.customGraphTemplates);
          return;
        }
        const localPayload = serializeDeviceLibraryForStorage({
          customDeviceTemplates,
          customAttributeLibraries,
          customComponentTypes,
          deviceDefinitionOverrides,
          customGraphTemplateTypes,
          customGraphTemplates
        });
        lastPersistedDeviceLibraryPayloadRef.current = localPayload;
        void saveBackendDeviceLibraryPayload(localPayload).catch(() => {
          // 后台暂不可写时仍保留浏览器本地图元库缓存。
        });
      })
      .catch(() => {
        backendDeviceLibraryLoadedRef.current = false;
        // 后台不可用时继续使用浏览器本地图元库缓存。
      });
    // 仅在启动时从后台拉取一次，避免后台定义刷新打断当前编辑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };
}

export function createAppHookCallback80(__appScope: Record<string, any>) {
  return () => {
  const { backendMeasurementConfigLoadedRef, fetchBackendMeasurementConfig, lastPersistedMeasurementConfigPayloadRef, measurementConfig, saveBackendMeasurementConfigPayload, serializeMeasurementConfigForStorage, setMeasurementConfig, writeMeasurementConfig } = __appScope;
    fetchBackendMeasurementConfig()
      .then((backendMeasurementConfig) => {
        backendMeasurementConfigLoadedRef.current = true;
        if (backendMeasurementConfig.exists) {
          const backendPayload = serializeMeasurementConfigForStorage(backendMeasurementConfig);
          lastPersistedMeasurementConfigPayloadRef.current = backendPayload;
          setMeasurementConfig(backendMeasurementConfig);
          writeMeasurementConfig(backendMeasurementConfig);
          return;
        }
        const localPayload = serializeMeasurementConfigForStorage(measurementConfig);
        lastPersistedMeasurementConfigPayloadRef.current = localPayload;
        void saveBackendMeasurementConfigPayload(localPayload).catch(() => {
          // 后台暂不可写时仍保留浏览器本地量测配置缓存。
        });
      })
      .catch(() => {
        backendMeasurementConfigLoadedRef.current = false;
        // 后台不可用时继续使用浏览器本地量测配置缓存。
      });
    // 仅在启动时从后台拉取一次，避免后台配置刷新打断当前操作。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };
}

export function createAppHookCallback81(__appScope: Record<string, any>) {
  return () => {
  const { lastPersistedSchemesPayloadRef, rememberPersistedSchemesPayload, schemes, serializeSchemesForStorage, suppressNextBackendSchemeSyncRef } = __appScope;
    const timeoutId = window.setTimeout(() => {
      const normalizedSchemesPayload = serializeSchemesForStorage(schemes);
      if (suppressNextBackendSchemeSyncRef.current && normalizedSchemesPayload === lastPersistedSchemesPayloadRef.current) {
        suppressNextBackendSchemeSyncRef.current = false;
        return;
      }
      if (normalizedSchemesPayload === lastPersistedSchemesPayloadRef.current) {
        return;
      }
      if (suppressNextBackendSchemeSyncRef.current) {
        suppressNextBackendSchemeSyncRef.current = false;
      }
      rememberPersistedSchemesPayload(normalizedSchemesPayload);
    }, 150);
    return () => window.clearTimeout(timeoutId);
  };
}

export function createAppHookCallback82(__appScope: Record<string, any>) {
  return () => {
  const { backendDeviceLibraryLoadedRef, customAttributeLibraries, customComponentTypes, customDeviceTemplates, customGraphTemplateTypes, customGraphTemplates, deviceDefinitionOverrides, lastPersistedDeviceLibraryPayloadRef, normalizeDeviceLibraryPersistencePayload, saveBackendDeviceLibraryPayload, suppressNextBackendDeviceLibrarySyncRef, writeLocalDeviceLibraryPersistencePayload } = __appScope;
    const timeoutId = window.setTimeout(() => {
      const normalizedDeviceLibrary = normalizeDeviceLibraryPersistencePayload({
        customDeviceTemplates,
        customAttributeLibraries,
        customComponentTypes,
        deviceDefinitionOverrides,
        customGraphTemplateTypes,
        customGraphTemplates
      });
      const normalizedDeviceLibraryPayload = JSON.stringify(normalizedDeviceLibrary);
      writeLocalDeviceLibraryPersistencePayload(normalizedDeviceLibrary);
      if (normalizedDeviceLibraryPayload === lastPersistedDeviceLibraryPayloadRef.current) {
        if (suppressNextBackendDeviceLibrarySyncRef.current) {
          suppressNextBackendDeviceLibrarySyncRef.current = false;
        }
        return;
      }
      lastPersistedDeviceLibraryPayloadRef.current = normalizedDeviceLibraryPayload;
      if (!backendDeviceLibraryLoadedRef.current) {
        return;
      }
      if (suppressNextBackendDeviceLibrarySyncRef.current) {
        suppressNextBackendDeviceLibrarySyncRef.current = false;
        return;
      }
      void saveBackendDeviceLibraryPayload(normalizedDeviceLibraryPayload).catch(() => {
        // 后台保存失败时不阻塞本地编辑；下一次图元库变更会继续尝试同步。
      });
    }, 800);
    return () => window.clearTimeout(timeoutId);
  };
}

export function createAppHookCallback83(__appScope: Record<string, any>) {
  return () => {
  const { COLOR_DISPLAY_MODE_STORAGE_KEY, COLOR_PALETTE_STORAGE_KEY, backendColorConfigLoadedRef, colorDisplayMode, colorPalette, lastPersistedColorConfigPayloadRef, normalizeColorPalette, saveBackendColorConfigPayload, serializeColorConfigForStorage, suppressNextBackendColorSyncRef } = __appScope;
    const timeoutId = window.setTimeout(() => {
      const normalizedPalette = normalizeColorPalette(colorPalette);
      const normalizedColorConfigPayload = serializeColorConfigForStorage(colorDisplayMode, normalizedPalette);
      try {
        window.localStorage.setItem(COLOR_DISPLAY_MODE_STORAGE_KEY, colorDisplayMode);
        window.localStorage.setItem(COLOR_PALETTE_STORAGE_KEY, JSON.stringify(normalizedPalette));
      } catch {
        // 浏览器缓存不可写时不阻断当前编辑，后台同步仍会继续尝试。
      }
      if (normalizedColorConfigPayload === lastPersistedColorConfigPayloadRef.current) {
        if (suppressNextBackendColorSyncRef.current) {
          suppressNextBackendColorSyncRef.current = false;
        }
        return;
      }
      lastPersistedColorConfigPayloadRef.current = normalizedColorConfigPayload;
      if (!backendColorConfigLoadedRef.current) {
        return;
      }
      if (suppressNextBackendColorSyncRef.current) {
        suppressNextBackendColorSyncRef.current = false;
        return;
      }
      void saveBackendColorConfigPayload(normalizedColorConfigPayload).catch(() => {
        // 后台保存失败时不阻塞本地编辑；下一次配色变更会继续尝试同步。
      });
    }, 300);
    return () => window.clearTimeout(timeoutId);
  };
}

export function createAppHookCallback84(__appScope: Record<string, any>) {
  return () => {
  const { activeImageFolderId, imageAssetsToMap, imageLibraryInitializedRef, imageTarget, localImageAssetsFromStorage, refreshImageFolders, refreshImagesForFolder, setImageAssetList, setImageAssets } = __appScope;
    if (!imageTarget) {
      return;
    }
    if (!imageLibraryInitializedRef.current) {
      imageLibraryInitializedRef.current = true;
      const localAssets = localImageAssetsFromStorage();
      if (localAssets.length > 0) {
        setImageAssetList(localAssets);
        setImageAssets((current) => ({ ...imageAssetsToMap(localAssets), ...current }));
      }
      void refreshImageFolders();
    }
    void refreshImagesForFolder(activeImageFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };
}

export function createAppHookCallback85(__appScope: Record<string, any>) {
  return () => {
  const { ACTIVE_PROJECT_STORAGE_KEY, activeProjectKey, activeProjectPointerPayload, activeSchemeKey, backendSchemesLoadedRef, schemes } = __appScope;
    const activePointerPayload = activeProjectPointerPayload(schemes, activeProjectKey, activeSchemeKey);
    if (!activePointerPayload && !backendSchemesLoadedRef.current) {
      return;
    }
    try {
      window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(activePointerPayload ?? {}));
    } catch {
      // 忽略浏览器缓存写入失败，避免影响画布编辑。
    }
  };
}

export function createAppHookCallback86(__appScope: Record<string, any>) {
  return () => {
  const { activeSchemeKey, flattenSavedSchemes, schemes, selectedSchemeId, setExpandedSchemeIds } = __appScope;
    setExpandedSchemeIds((current) => {
      const flatSchemes = flattenSavedSchemes(schemes);
      const schemeIds = new Set(flatSchemes.map((scheme) => scheme.id));
      const retained = current.filter((id) => schemeIds.has(id));
      if (retained.length > 0) {
        return retained;
      }
      const preferredSchemeId =
        (activeSchemeKey && schemeIds.has(activeSchemeKey) ? activeSchemeKey : "") ||
        (selectedSchemeId && schemeIds.has(selectedSchemeId) ? selectedSchemeId : "") ||
        flatSchemes[0]?.id ||
        "";
      return preferredSchemeId ? [preferredSchemeId] : [];
    });
  };
}

export function createAppHookCallback87(__appScope: Record<string, any>) {
  return () => {
  const { canvasWheelTargetIsRenderedCanvas, clientPointInsideRenderedCanvas, isCanvasWheelZoomExcludedTarget, shouldZoomCanvasFromWheelEvent, zoomCanvasFromWheelEvent } = __appScope;
    const preventPageWheelZoom = (event: WheelEvent) => {
      if (isCanvasWheelZoomExcludedTarget(event.target)) {
        return;
      }
      if (!canvasWheelTargetIsRenderedCanvas(event.target)) {
        return;
      }
      const cursorInsideCanvas = clientPointInsideRenderedCanvas(event.clientX, event.clientY);
      if (cursorInsideCanvas && shouldZoomCanvasFromWheelEvent(event)) {
        zoomCanvasFromWheelEvent(event);
      }
    };
    window.addEventListener("wheel", preventPageWheelZoom, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", preventPageWheelZoom, { capture: true });
  };
}

export function createAppHookCallback88(__appScope: Record<string, any>) {
  return () => {
  const { setContextMenu, setProjectMenu, setTemplateMenu } = __appScope;
    const closeContextMenus = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest(".context-menu")) {
        return;
      }
      setContextMenu(null);
      setProjectMenu(null);
      setTemplateMenu(null);
    };
    window.addEventListener("pointerdown", closeContextMenus, { capture: true });
    return () => window.removeEventListener("pointerdown", closeContextMenus, { capture: true });
  };
}

export function createAppHookCallback89(__appScope: Record<string, any>) {
  return () => {
  const { layerManagementDropdownRef } = __appScope;
    const blurLayerManagementDropdownFocus = () => {
      const dropdown = layerManagementDropdownRef.current;
      const activeElement = document.activeElement;
      if (dropdown && activeElement instanceof HTMLElement && dropdown.contains(activeElement)) {
        activeElement.blur();
      }
    };
    const blurLayerManagementDropdownOnOutsidePointerDown = (event: globalThis.PointerEvent) => {
      const dropdown = layerManagementDropdownRef.current;
      if (!dropdown || !(event.target instanceof Node) || dropdown.contains(event.target)) {
        return;
      }
      blurLayerManagementDropdownFocus();
    };
    const blurLayerManagementDropdownOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        blurLayerManagementDropdownFocus();
      }
    };
    window.addEventListener("pointerdown", blurLayerManagementDropdownOnOutsidePointerDown, true);
    window.addEventListener("keydown", blurLayerManagementDropdownOnEscape, true);
    return () => {
      window.removeEventListener("pointerdown", blurLayerManagementDropdownOnOutsidePointerDown, true);
      window.removeEventListener("keydown", blurLayerManagementDropdownOnEscape, true);
    };
  };
}

export function createAppHookCallback90(__appScope: Record<string, any>) {
  return () => {
  const { CONTEXT_MENU_AUTO_HIDE_MARGIN, contextMenu, setContextMenu } = __appScope;
    if (!contextMenu || contextMenu.target !== "blank") {
      return;
    }
    const closeBlankContextMenuIfPointerLeaves = (event: globalThis.PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".context-menu")) {
        return;
      }
      const menu = document.querySelector<HTMLElement>("[data-canvas-context-menu='true']");
      if (!menu) {
        setContextMenu(null);
        return;
      }
      const rect = menu.getBoundingClientRect();
      const withinMenuSafeZone =
        event.clientX >= rect.left - CONTEXT_MENU_AUTO_HIDE_MARGIN &&
        event.clientX <= rect.right + CONTEXT_MENU_AUTO_HIDE_MARGIN &&
        event.clientY >= rect.top - CONTEXT_MENU_AUTO_HIDE_MARGIN &&
        event.clientY <= rect.bottom + CONTEXT_MENU_AUTO_HIDE_MARGIN;
      if (!withinMenuSafeZone) {
        setContextMenu(null);
      }
    };
    const closeBlankContextMenuOnCanvasMotion = () => setContextMenu(null);
    const closeBlankContextMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    window.addEventListener("pointermove", closeBlankContextMenuIfPointerLeaves);
    window.addEventListener("wheel", closeBlankContextMenuOnCanvasMotion, { capture: true });
    window.addEventListener("keydown", closeBlankContextMenuOnEscape);
    return () => {
      window.removeEventListener("pointermove", closeBlankContextMenuIfPointerLeaves);
      window.removeEventListener("wheel", closeBlankContextMenuOnCanvasMotion, { capture: true });
      window.removeEventListener("keydown", closeBlankContextMenuOnEscape);
    };
  };
}

export function createAppHookCallback91(__appScope: Record<string, any>) {
  return () => {
  const { canvasVisibleViewBoxFrameRef, connectPreviewFrameRef, keyboardMoveActiveKeyDeltasRef, keyboardMoveCommitCancelRef, keyboardMoveFrameElapsedMsRef, keyboardMoveFrameRef, keyboardMoveLastFrameTimeRef, mouseStatusFrameRef, pendingKeyboardMoveDeltaRef, pendingWheelZoomRequestRef, staticButtonFeedbackTimeoutRef, wheelZoomFrameRef } = __appScope;
    return () => {
      if (mouseStatusFrameRef.current !== null) {
        window.cancelAnimationFrame(mouseStatusFrameRef.current);
        mouseStatusFrameRef.current = null;
      }
      if (connectPreviewFrameRef.current !== null) {
        window.cancelAnimationFrame(connectPreviewFrameRef.current);
        connectPreviewFrameRef.current = null;
      }
      if (canvasVisibleViewBoxFrameRef.current !== null) {
        window.cancelAnimationFrame(canvasVisibleViewBoxFrameRef.current);
        canvasVisibleViewBoxFrameRef.current = null;
      }
      if (wheelZoomFrameRef.current !== null) {
        window.cancelAnimationFrame(wheelZoomFrameRef.current);
        wheelZoomFrameRef.current = null;
      }
      pendingWheelZoomRequestRef.current = null;
      keyboardMoveCommitCancelRef.current?.();
      keyboardMoveCommitCancelRef.current = null;
      if (keyboardMoveFrameRef.current !== null) {
        window.cancelAnimationFrame(keyboardMoveFrameRef.current);
        keyboardMoveFrameRef.current = null;
      }
      if (staticButtonFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(staticButtonFeedbackTimeoutRef.current);
        staticButtonFeedbackTimeoutRef.current = null;
      }
      keyboardMoveActiveKeyDeltasRef.current.clear();
      keyboardMoveLastFrameTimeRef.current = null;
      keyboardMoveFrameElapsedMsRef.current = 0;
      pendingKeyboardMoveDeltaRef.current = null;
    };
  };
}

export function createAppHookCallback92(__appScope: Record<string, any>) {
  return () => {
  const { persistRefreshRecoveryNow, saveRequired } = __appScope;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      persistRefreshRecoveryNow();
      if (!saveRequired) {
        return;
      }
      event.preventDefault();
      event.returnValue = "当前模型尚未保存，关闭网页会丢失未保存修改。";
      return event.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", persistRefreshRecoveryNow);
    window.addEventListener("vite:beforeFullReload", persistRefreshRecoveryNow);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", persistRefreshRecoveryNow);
      window.removeEventListener("vite:beforeFullReload", persistRefreshRecoveryNow);
    };
  };
}

export function createAppHookCallback93(__appScope: Record<string, any>) {
  return () => {
  const { clearRefreshRecoveryProject, hasUnsavedChanges } = __appScope;
    if (!hasUnsavedChanges) {
      clearRefreshRecoveryProject();
    }
  };
}

export function createAppHookCallback94(__appScope: Record<string, any>) {
  return () => {
  const { connectDropReady, connectDropReadyRef } = __appScope;
    connectDropReadyRef.current = connectDropReady;
  };
}

export function createAppHookCallback95(__appScope: Record<string, any>) {
  return () => {
  const { buildConnectPreviewPath, connectDropTargetPointRef, connectDropTargetRef, connectPreviewPointRef, connectSource, setConnectPreviewDom } = __appScope;
    if (!connectSource || !connectPreviewPointRef.current) {
      setConnectPreviewDom("", null);
      return;
    }
    setConnectPreviewDom(
      buildConnectPreviewPath(connectSource, connectPreviewPointRef.current, connectDropTargetPointRef.current, connectDropTargetRef.current),
      connectDropTargetPointRef.current
    );
  };
}

export function createAppHookCallback96(__appScope: Record<string, any>) {
  return () => {
  const { dragUndoCapturedRef, dragging, draggingRef, imperativeMultiNodeDragActiveRef, isMultiNodeMoveState, multiNodeDragOverlayDeltaRef, resetMultiNodeDragOverlayTransform, updateMultiNodeDragOverlayTransform, updateSmartAlignmentGuides } = __appScope;
    if (imperativeMultiNodeDragActiveRef.current && !dragging) {
      updateSmartAlignmentGuides([]);
      return;
    }
    draggingRef.current = dragging;
    if (!dragging) {
      updateSmartAlignmentGuides([]);
      resetMultiNodeDragOverlayTransform();
      dragUndoCapturedRef.current = false;
    } else if (isMultiNodeMoveState(dragging)) {
      updateMultiNodeDragOverlayTransform(dragging.currentDelta ?? multiNodeDragOverlayDeltaRef.current);
    }
  };
}

export function createAppHookCallback97(__appScope: Record<string, any>) {
  return () => {
  const { canvasBounds, normalizeViewBoxToCanvas, setViewBox } = __appScope;
    setViewBox((current) => normalizeViewBoxToCanvas(current, canvasBounds));
  };
}

export function createAppHookCallback98(__appScope: Record<string, any>) {
  return () => {
  const { canvasFrameRef, centerCanvasFrameScrollPosition, scheduleCanvasVisibleViewBoxUpdate } = __appScope;
    const frame = canvasFrameRef.current;
    if (!frame) {
      return;
    }
    centerCanvasFrameScrollPosition(frame);
    scheduleCanvasVisibleViewBoxUpdate();
  };
}

export function createAppHookCallback99(__appScope: Record<string, any>) {
  return () => {
  const { PROJECT_PANEL_MAX_HEIGHT, PROJECT_PANEL_MIN_HEIGHT, projectPanelResize, setProjectPanelHeight, setProjectPanelResize } = __appScope;
    if (!projectPanelResize) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const deltaY = event.clientY - projectPanelResize.startY;
      setProjectPanelHeight(
        Math.min(PROJECT_PANEL_MAX_HEIGHT, Math.max(PROJECT_PANEL_MIN_HEIGHT, projectPanelResize.startHeight + deltaY))
      );
    };
    const handlePointerUp = () => {
      setProjectPanelResize(null);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  };
}

export function createAppHookCallback100(__appScope: Record<string, any>) {
  return () => {
  const { SIDE_PANEL_MAX_WIDTH, SIDE_PANEL_MIN_WIDTH, clampPanelDimension, setLeftPanelWidth, setRightPanelWidth, setSidePanelResize, sidePanelResize } = __appScope;
    if (!sidePanelResize) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const viewportMax = clampNumber(window.innerWidth - 96, SIDE_PANEL_MIN_WIDTH, SIDE_PANEL_MAX_WIDTH);
      const deltaX = event.clientX - sidePanelResize.startX;
      const nextWidth =
        sidePanelResize.side === "left"
          ? sidePanelResize.startWidth + deltaX
          : sidePanelResize.startWidth - deltaX;
      const clampedWidth = clampPanelDimension(nextWidth, SIDE_PANEL_MIN_WIDTH, viewportMax);
      if (sidePanelResize.side === "left") {
        setLeftPanelWidth(clampedWidth);
      } else {
        setRightPanelWidth(clampedWidth);
      }
    };
    const handlePointerUp = () => {
      setSidePanelResize(null);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  };
}

export function createAppHookCallback101(__appScope: Record<string, any>) {
  return () => {
  const { applyCanvasBounds, canvasBoundsRef, canvasFrameRef, canvasHeight, canvasNoScrollOffsetForCanvasResizeAnchor, canvasResizeBoundsFromPointerDrag, canvasResizeDraftRef, canvasResizeDrag, canvasResizeOriginShiftForBounds, canvasResizePreviewRectForDraft, canvasResizeUndoCapturedRef, canvasWidth, clampCanvasBounds, edges, flushSync, hasCanvasOriginShift, nodes, pendingCanvasResizeCommitAnchorRef, pushUndoSnapshot, scheduleCanvasVisibleViewBoxUpdate, setCanvasNoScrollOffset, setCanvasResizeDraft, setCanvasResizeDrag, setGraphArrays, shiftCachedRoutesForCanvasOrigin, syncCanvasFrameScrollToCanvasResizeCommitAnchor, translateEdgeBy, translateNodeBy, writeOperationLog } = __appScope;
    if (!canvasResizeDrag) {
      return;
    }
    const commitCanvasResizeBounds = (draftBounds: CanvasBounds, originShift: Point = { x: 0, y: 0 }) => {
      const changed = draftBounds.width !== canvasWidth || draftBounds.height !== canvasHeight;
      const shifted = hasCanvasOriginShift(originShift);
      if ((changed || shifted) && !canvasResizeUndoCapturedRef.current) {
        pushUndoSnapshot();
        canvasResizeUndoCapturedRef.current = true;
      }
      if (shifted) {
        setGraphArrays(
          nodes.map((node) => translateNodeBy(node, originShift)),
          edges.map((edge) => translateEdgeBy(edge, originShift))
        );
        shiftCachedRoutesForCanvasOrigin(originShift);
      }
      applyCanvasBounds(draftBounds, originShift, { preserveScrollAnchor: false });
      canvasResizeDraftRef.current = null;
      setCanvasResizeDraft(null);
    };
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      event.preventDefault();
      const nextBounds = canvasResizeBoundsFromPointerDrag(canvasResizeDrag, event, canvasResizeDrag.minBounds);
      const clampedBounds = clampCanvasBounds(nextBounds);
      canvasResizeDraftRef.current = clampedBounds;
      flushSync(() => setCanvasResizeDraft(clampedBounds));
    };
    const handlePointerUp = (event: globalThis.PointerEvent) => {
      const draftBounds = canvasResizeDraftRef.current;
      let resizeCommitAnchor: CanvasResizeCommitAnchor | null = null;
      if (draftBounds) {
        const nextCanvasNoScrollOffset = canvasNoScrollOffsetForCanvasResizeAnchor(canvasResizeDrag, draftBounds);
        const desiredSurfaceRect = canvasResizePreviewRectForDraft(canvasResizeDrag, draftBounds);
        const frameRect = canvasFrameRef.current?.getBoundingClientRect();
        resizeCommitAnchor = {
          edge: canvasResizeDrag.edge,
          desiredRect: {
            left: Math.round((frameRect?.left ?? 0) - canvasResizeDrag.startScrollLeft + desiredSurfaceRect.left),
            top: Math.round((frameRect?.top ?? 0) - canvasResizeDrag.startScrollTop + desiredSurfaceRect.top),
            width: desiredSurfaceRect.width,
            height: desiredSurfaceRect.height
          }
        };
        pendingCanvasResizeCommitAnchorRef.current = resizeCommitAnchor;
        const resizeOriginShift = canvasResizeOriginShiftForBounds(
          canvasResizeDrag.edge,
          { width: canvasResizeDrag.startWidth, height: canvasResizeDrag.startHeight },
          draftBounds
        );
        flushSync(() => {
          setCanvasNoScrollOffset((current) =>
            Math.round(current.x) === Math.round(nextCanvasNoScrollOffset.x) &&
            Math.round(current.y) === Math.round(nextCanvasNoScrollOffset.y)
              ? current
              : nextCanvasNoScrollOffset
          );
          commitCanvasResizeBounds(draftBounds, resizeOriginShift);
          setCanvasResizeDrag(null);
        });
        window.requestAnimationFrame(() => {
          if (!resizeCommitAnchor) {
            return;
          }
          syncCanvasFrameScrollToCanvasResizeCommitAnchor(resizeCommitAnchor);
          window.requestAnimationFrame(() => {
            if (resizeCommitAnchor) {
              syncCanvasFrameScrollToCanvasResizeCommitAnchor(resizeCommitAnchor);
              scheduleCanvasVisibleViewBoxUpdate();
            }
          });
        });
      }
      if (canvasResizeUndoCapturedRef.current) {
        const currentBounds = draftBounds ?? canvasBoundsRef.current;
        writeOperationLog(`调整画布尺寸为 ${currentBounds.width} x ${currentBounds.height}`);
      }
      canvasResizeUndoCapturedRef.current = false;
      canvasResizeDraftRef.current = null;
      if (!draftBounds) {
        setCanvasResizeDraft(null);
        setCanvasResizeDrag(null);
      }
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  };
}

export function createAppHookCallback102(__appScope: Record<string, any>) {
  return () => {
  const { STATUSBAR_MAX_HEIGHT, STATUSBAR_MIN_HEIGHT, clampPanelDimension, setStatusbarHeight, setStatusbarResize, statusbarResize } = __appScope;
    if (!statusbarResize) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const deltaY = statusbarResize.startY - event.clientY;
      setStatusbarHeight(clampPanelDimension(statusbarResize.startHeight + deltaY, STATUSBAR_MIN_HEIGHT, STATUSBAR_MAX_HEIGHT));
    };
    const handlePointerUp = () => {
      setStatusbarResize(null);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  };
}

export function createAppHookCallback103(__appScope: Record<string, any>) {
  return () => {
  const { TOPOLOGY_WARNING_PANEL_MARGIN, clampNumber, setTopologyWarningPanelDrag, setTopologyWarningPanelPosition, topologyWarningPanelDrag, topologyWarningPanelHeight, topologyWarningPanelWidth } = __appScope;
    if (!topologyWarningPanelDrag) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const nextLeft = topologyWarningPanelDrag.startLeft + event.clientX - topologyWarningPanelDrag.startClientX;
      const nextTop = topologyWarningPanelDrag.startTop + event.clientY - topologyWarningPanelDrag.startClientY;
      setTopologyWarningPanelPosition({
        left: clampNumber(nextLeft, TOPOLOGY_WARNING_PANEL_MARGIN, Math.max(TOPOLOGY_WARNING_PANEL_MARGIN, window.innerWidth - topologyWarningPanelWidth - TOPOLOGY_WARNING_PANEL_MARGIN)),
        top: clampNumber(nextTop, TOPOLOGY_WARNING_PANEL_MARGIN, Math.max(TOPOLOGY_WARNING_PANEL_MARGIN, window.innerHeight - topologyWarningPanelHeight - TOPOLOGY_WARNING_PANEL_MARGIN))
      });
    };
    const handlePointerUp = () => {
      setTopologyWarningPanelDrag(null);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  };
}

export function createAppHookCallback104(__appScope: Record<string, any>) {
  return () => {
  const { TOPOLOGY_WARNING_PANEL_MARGIN, TOPOLOGY_WARNING_PANEL_MAX_WIDTH, TOPOLOGY_WARNING_PANEL_MIN_WIDTH, VALIDATION_PANEL_MAX_HEIGHT, VALIDATION_PANEL_MIN_HEIGHT, clampPanelDimension, setTopologyWarningPanelHeight, setTopologyWarningPanelPosition, setTopologyWarningPanelResize, setTopologyWarningPanelWidth, topologyWarningPanelResize } = __appScope;
    if (!topologyWarningPanelResize) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const maxWidth = clampNumber(window.innerWidth - topologyWarningPanelResize.startLeft - TOPOLOGY_WARNING_PANEL_MARGIN, TOPOLOGY_WARNING_PANEL_MIN_WIDTH, TOPOLOGY_WARNING_PANEL_MAX_WIDTH);
      const maxHeight = clampNumber(window.innerHeight - topologyWarningPanelResize.startTop - TOPOLOGY_WARNING_PANEL_MARGIN, VALIDATION_PANEL_MIN_HEIGHT, VALIDATION_PANEL_MAX_HEIGHT);
      setTopologyWarningPanelWidth(clampPanelDimension(
        topologyWarningPanelResize.startWidth + event.clientX - topologyWarningPanelResize.startClientX,
        TOPOLOGY_WARNING_PANEL_MIN_WIDTH,
        maxWidth
      ));
      setTopologyWarningPanelHeight(clampPanelDimension(
        topologyWarningPanelResize.startHeight + event.clientY - topologyWarningPanelResize.startClientY,
        VALIDATION_PANEL_MIN_HEIGHT,
        maxHeight
      ));
      setTopologyWarningPanelPosition({
        left: topologyWarningPanelResize.startLeft,
        top: topologyWarningPanelResize.startTop
      });
    };
    const handlePointerUp = () => {
      setTopologyWarningPanelResize(null);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  };
}

export function createAppHookCallback105(__appScope: Record<string, any>) {
  return () => {
  const { clampNodeDoubleClickDialogLayout, nodeDoubleClickDialogDrag, setNodeDoubleClickDialogDrag, setNodeDoubleClickDialogLayout } = __appScope;
    if (!nodeDoubleClickDialogDrag) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (event.buttons === 0) {
        setNodeDoubleClickDialogDrag(null);
        return;
      }
      event.preventDefault();
      setNodeDoubleClickDialogLayout(clampNodeDoubleClickDialogLayout({
        left: nodeDoubleClickDialogDrag.startLeft + event.clientX - nodeDoubleClickDialogDrag.startClientX,
        top: nodeDoubleClickDialogDrag.startTop + event.clientY - nodeDoubleClickDialogDrag.startClientY,
        width: nodeDoubleClickDialogDrag.startWidth,
        height: nodeDoubleClickDialogDrag.startHeight
      }));
    };
    const handlePointerUp = () => {
      setNodeDoubleClickDialogDrag(null);
    };
    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerUp, true);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerUp, true);
    };
  };
}

export function createAppHookCallback106(__appScope: Record<string, any>) {
  return () => {
  const { NODE_DOUBLE_CLICK_DIALOG_MARGIN, NODE_DOUBLE_CLICK_DIALOG_MIN_HEIGHT, NODE_DOUBLE_CLICK_DIALOG_MIN_WIDTH, clampNodeDoubleClickDialogLayout, clampPanelDimension, nodeDoubleClickDialogResize, setNodeDoubleClickDialogLayout, setNodeDoubleClickDialogResize } = __appScope;
    if (!nodeDoubleClickDialogResize) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (event.buttons === 0) {
        setNodeDoubleClickDialogResize(null);
        return;
      }
      event.preventDefault();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const maxWidth = Math.max(
        NODE_DOUBLE_CLICK_DIALOG_MIN_WIDTH,
        viewportWidth - nodeDoubleClickDialogResize.startLeft - NODE_DOUBLE_CLICK_DIALOG_MARGIN
      );
      const maxHeight = Math.max(
        NODE_DOUBLE_CLICK_DIALOG_MIN_HEIGHT,
        viewportHeight - nodeDoubleClickDialogResize.startTop - NODE_DOUBLE_CLICK_DIALOG_MARGIN
      );
      setNodeDoubleClickDialogLayout(clampNodeDoubleClickDialogLayout({
        left: nodeDoubleClickDialogResize.startLeft,
        top: nodeDoubleClickDialogResize.startTop,
        width: clampPanelDimension(
          nodeDoubleClickDialogResize.startWidth + event.clientX - nodeDoubleClickDialogResize.startClientX,
          NODE_DOUBLE_CLICK_DIALOG_MIN_WIDTH,
          maxWidth
        ),
        height: clampPanelDimension(
          nodeDoubleClickDialogResize.startHeight + event.clientY - nodeDoubleClickDialogResize.startClientY,
          NODE_DOUBLE_CLICK_DIALOG_MIN_HEIGHT,
          maxHeight
        )
      }));
    };
    const handlePointerUp = () => {
      setNodeDoubleClickDialogResize(null);
    };
    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerUp, true);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerUp, true);
    };
  };
}

export function createAppHookCallback107(__appScope: Record<string, any>) {
  return () => {
  const { clampDeviceLibraryDialogLayout, deviceLibraryDialogDrag, setDeviceLibraryDialogDrag, setDeviceLibraryDialogLayouts } = __appScope;
    if (!deviceLibraryDialogDrag) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (event.buttons === 0) {
        setDeviceLibraryDialogDrag(null);
        return;
      }
      event.preventDefault();
      const nextLayout = clampDeviceLibraryDialogLayout(deviceLibraryDialogDrag.kind, {
        left: deviceLibraryDialogDrag.startLeft + event.clientX - deviceLibraryDialogDrag.startClientX,
        top: deviceLibraryDialogDrag.startTop + event.clientY - deviceLibraryDialogDrag.startClientY,
        width: deviceLibraryDialogDrag.startWidth,
        height: deviceLibraryDialogDrag.startHeight
      });
      setDeviceLibraryDialogLayouts((current) => ({
        ...current,
        [deviceLibraryDialogDrag.kind]: nextLayout
      }));
    };
    const handlePointerUp = () => {
      setDeviceLibraryDialogDrag(null);
    };
    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerUp, true);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerUp, true);
    };
  };
}

export function createAppHookCallback108(__appScope: Record<string, any>) {
  return () => {
  const { DEVICE_LIBRARY_DIALOG_CONFIG, clampDeviceLibraryDialogLayout, clampPanelDimension, deviceLibraryDialogResize, setDeviceLibraryDialogLayouts, setDeviceLibraryDialogResize } = __appScope;
    if (!deviceLibraryDialogResize) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (event.buttons === 0) {
        setDeviceLibraryDialogResize(null);
        return;
      }
      event.preventDefault();
      const config = DEVICE_LIBRARY_DIALOG_CONFIG[deviceLibraryDialogResize.kind];
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const maxWidth = Math.max(
        config.minWidth,
        viewportWidth - deviceLibraryDialogResize.startLeft - config.margin
      );
      const maxHeight = Math.max(
        config.minHeight,
        viewportHeight - deviceLibraryDialogResize.startTop - config.margin
      );
      const nextLayout = clampDeviceLibraryDialogLayout(deviceLibraryDialogResize.kind, {
        left: deviceLibraryDialogResize.startLeft,
        top: deviceLibraryDialogResize.startTop,
        width: clampPanelDimension(
          deviceLibraryDialogResize.startWidth + event.clientX - deviceLibraryDialogResize.startClientX,
          config.minWidth,
          maxWidth
        ),
        height: clampPanelDimension(
          deviceLibraryDialogResize.startHeight + event.clientY - deviceLibraryDialogResize.startClientY,
          config.minHeight,
          maxHeight
        )
      });
      setDeviceLibraryDialogLayouts((current) => ({
        ...current,
        [deviceLibraryDialogResize.kind]: nextLayout
      }));
    };
    const handlePointerUp = () => {
      setDeviceLibraryDialogResize(null);
    };
    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerUp, true);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerUp, true);
    };
  };
}

export function createAppHookCallback109(__appScope: Record<string, any>) {
  return () => {
  const { lastKeyboardShortcutClientPointerRef } = __appScope;
    const updateKeyboardShortcutPointerPosition = (event: globalThis.PointerEvent) => {
      lastKeyboardShortcutClientPointerRef.current = { x: event.clientX, y: event.clientY };
    };
    const clearKeyboardShortcutPointerPosition = () => {
      lastKeyboardShortcutClientPointerRef.current = null;
    };
    window.addEventListener("pointermove", updateKeyboardShortcutPointerPosition, { capture: true });
    window.addEventListener("pointerdown", updateKeyboardShortcutPointerPosition, { capture: true });
    window.addEventListener("blur", clearKeyboardShortcutPointerPosition);
    return () => {
      window.removeEventListener("pointermove", updateKeyboardShortcutPointerPosition, { capture: true });
      window.removeEventListener("pointerdown", updateKeyboardShortcutPointerPosition, { capture: true });
      window.removeEventListener("blur", clearKeyboardShortcutPointerPosition);
    };
  };
}

export function createAppHookCallback110(__appScope: Record<string, any>) {
  return () => {
  const { activeLayerEdges, activeLayerNodes, cancelInteractiveStaticDrawing, cancelLibraryPlacement, canvasBounds, canvasInteractionRef, canvasPointerKeyboardShortcutAvailability, clearRecordSelection, connectPreviewPointRef, connectSource, copySelectedRecord, copySelection, cutSelection, deleteProjectRecord, deleteSchemeRecord, deleteSelectedGraphicsFromCanvas, deleteSelectedRecords, findSavedSchemeById, finishInteractiveStaticDrawing, hideLibraryFlyout, hoveredAttributeLibraryComponentType, isEditMode, isGlobalSaveShortcut, keyboardMoveStepForViewBox, lastCanvasPointerRef, libraryPlacement, lockConnectPreviewAxis, lockRoutableLinePreviewAxis, nudgeSelectionByKeyboard, pasteSelectedRecord, pasteSelection, projectById, projectListPointerInsideRef, recordClipboard, releaseConnectPreviewAxisLock, releaseKeyboardMoveKey, releaseRoutableLinePreviewAxisLock, resetConnectPreviewState, resetRoutableLinePreviewState, resolveKeyboardShortcutScope, routableLinePlacement, routableLinePreviewPointRef, saveCurrentProject, schemes, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds, setCanvasSelectionScope, setConnectSource, setMode, setRewiring, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setStaticDrawing, staticDrawing, switchInspectorTabForCanvasSelection, undoLastOperation, viewBox, writeOperationLog } = __appScope;
    const handleGlobalSaveKeyDown = (event: KeyboardEvent) => {
      if (!isGlobalSaveShortcut(event)) {
        return;
      }
      event.preventDefault();
      if (!isEditMode) {
        writeOperationLog("浏览模式下不能保存，请先切换到编辑模式");
      } else {
        void saveCurrentProject();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const canvasPointerShortcutAvailability = canvasPointerKeyboardShortcutAvailability();
      const shortcutScope = resolveKeyboardShortcutScope({
        isCanvasTarget: Boolean(target?.closest(".diagram-canvas")) && canvasPointerShortcutAvailability !== "blocked",
        isCanvasPointerUnblocked: canvasPointerShortcutAvailability === "unblocked",
        isCanvasInteractionActive: canvasInteractionRef.current && canvasPointerShortcutAvailability !== "blocked",
        isProjectListPointerInside: projectListPointerInsideRef.current
      });
      const isCanvasShortcutTarget = shortcutScope === "canvas";
      const isRecordShortcutTarget = shortcutScope === "records";
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (isEditMode) {
          undoLastOperation();
        } else {
          writeOperationLog("浏览模式下不能撤销编辑操作，请先切换到编辑模式");
        }
        return;
      }
      if (event.key === "Escape" && hoveredAttributeLibraryComponentType) {
        event.preventDefault();
        hideLibraryFlyout();
        return;
      }
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && !isCanvasShortcutTarget) {
        return;
      }
      if (event.key === "Control" && connectSource) {
        const lockPoint = connectPreviewPointRef.current ?? lastCanvasPointerRef.current;
        if (lockPoint) {
          lockConnectPreviewAxis(lockPoint);
        }
      }
      if (event.key === "Control" && routableLinePlacement?.source) {
        const lockPoint = routableLinePreviewPointRef.current ?? lastCanvasPointerRef.current;
        if (lockPoint) {
          lockRoutableLinePreviewAxis(lockPoint);
        }
      }
      if (!isEditMode) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a" && isCanvasShortcutTarget) {
          event.preventDefault();
          writeOperationLog("浏览模式下不执行全画布全选，请先切换到编辑模式");
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
          if (isRecordShortcutTarget && (selectedProjectId || selectedSchemeId || selectedProjectIds.length > 0 || selectedSchemeIds.length > 0)) {
            event.preventDefault();
            copySelectedRecord();
          } else if (isCanvasShortcutTarget) {
            event.preventDefault();
            copySelection();
          }
          return;
        }
        if (
          ((event.ctrlKey || event.metaKey) && ["x", "v"].includes(event.key.toLowerCase())) ||
          event.key === "Delete" ||
          event.key === "Backspace" ||
          event.key === "ArrowLeft" ||
          event.key === "ArrowRight" ||
          event.key === "ArrowUp" ||
          event.key === "ArrowDown"
        ) {
          event.preventDefault();
          releaseKeyboardMoveKey(event.key);
          writeOperationLog("浏览模式下不能修改图元，请先切换到编辑模式");
        }
        return;
      }
      if (libraryPlacement && isCanvasShortcutTarget) {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelLibraryPlacement();
          return;
        }
      }
      if (routableLinePlacement && isCanvasShortcutTarget) {
        if (event.key === "Escape") {
          event.preventDefault();
          setRoutableLinePlacement(null);
          resetRoutableLinePreviewState();
          setMode("select");
          return;
        }
      }
      if (staticDrawing && isCanvasShortcutTarget) {
        if (event.key === "Enter") {
          event.preventDefault();
          finishInteractiveStaticDrawing();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancelInteractiveStaticDrawing();
          return;
        }
        if (event.key === "Backspace" && staticDrawing.points.length > 1) {
          event.preventDefault();
          setStaticDrawing({
            ...staticDrawing,
            points: staticDrawing.points.slice(0, -1)
          });
          return;
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        if (isCanvasShortcutTarget) {
          event.preventDefault();
          const selectableEdgeIds = activeLayerEdges.map((edge) => edge.id);
          setCanvasSelectionScope("group");
          setSelectedNodeIds(activeLayerNodes.map((node) => node.id));
          setSelectedEdgeIds(selectableEdgeIds);
          setSelectedEdgeId(selectableEdgeIds[0] ?? "");
          setConnectSource(null);
          resetConnectPreviewState();
          setRewiring(null);
          clearRecordSelection();
          switchInspectorTabForCanvasSelection(activeLayerNodes.map((node) => node.id), selectableEdgeIds, "marquee");
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        if (isRecordShortcutTarget && (selectedProjectId || selectedSchemeId || selectedProjectIds.length > 0 || selectedSchemeIds.length > 0)) {
          event.preventDefault();
          copySelectedRecord();
        } else if (isCanvasShortcutTarget) {
          event.preventDefault();
          copySelection();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
        if (isCanvasShortcutTarget) {
          event.preventDefault();
          cutSelection();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        if (isRecordShortcutTarget && recordClipboard) {
          event.preventDefault();
          pasteSelectedRecord();
        } else if (isCanvasShortcutTarget) {
          event.preventDefault();
          pasteSelection();
        }
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (isCanvasShortcutTarget) {
          event.preventDefault();
          deleteSelectedGraphicsFromCanvas();
        } else if (isRecordShortcutTarget) {
          event.preventDefault();
          if (selectedProjectIds.length > 1 || selectedSchemeIds.length > 1) {
            deleteSelectedRecords();
          } else if (selectedProjectId) {
            const project = projectById.get(selectedProjectId);
            if (project) deleteProjectRecord(project);
          } else if (selectedSchemeId) {
            const scheme = findSavedSchemeById(schemes, selectedSchemeId);
            if (scheme) deleteSchemeRecord(scheme);
          }
        }
      } else if (isCanvasShortcutTarget && event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, -keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 25 : 1), 0, event.repeat);
      } else if (isCanvasShortcutTarget && event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 25 : 1), 0, event.repeat);
      } else if (isCanvasShortcutTarget && event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, 0, -keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 25 : 1), event.repeat);
      } else if (isCanvasShortcutTarget && event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, 0, keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 25 : 1), event.repeat);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        releaseConnectPreviewAxisLock();
        releaseRoutableLinePreviewAxisLock();
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown") {
        releaseKeyboardMoveKey(event.key);
      }
    };
    window.addEventListener("keydown", handleGlobalSaveKeyDown, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleGlobalSaveKeyDown, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp);
    };
  };
}

export function createAppHookCallback111(__appScope: Record<string, any>) {
  return () => {
  const { isBrowseMode, leftPanelTab, setLeftPanelTab } = __appScope;
    if (isBrowseMode && leftPanelTab !== "projects") {
      setLeftPanelTab("projects");
    }
  };
}

export function createAppHookCallback112(__appScope: Record<string, any>) {
  return () => {
  const { leftPanelTab, projectListPointerInsideRef } = __appScope;
    if (leftPanelTab !== "projects") {
      projectListPointerInsideRef.current = false;
    }
  };
}

export function createAppHookCallback113(__appScope: Record<string, any>) {
  return () => {
  const { scheduleIdleWork, setTopologyStatus, skipNextTopologyStaleRef, topologyStatus } = __appScope;
    if (skipNextTopologyStaleRef.current) {
      skipNextTopologyStaleRef.current = false;
      return;
    }
    if (topologyStatus.state === "idle") {
      return;
    }
    return scheduleIdleWork(() => {
      setTopologyStatus((current) =>
        current.state === "idle" ? current : { state: "idle", message: "拓扑结果已过期" }
      );
    }, 200, 500);
  };
}

export function createAppHookCallback114(__appScope: Record<string, any>) {
  return () => {
  const { LEFT_PANEL_MODE_STORAGE_KEY, leftPanelMode } = __appScope;
    try {
      window.localStorage.setItem(LEFT_PANEL_MODE_STORAGE_KEY, leftPanelMode);
    } catch {
      // Ignore storage failures; panel mode still works for the active session.
    }
  };
}

export function createAppHookCallback115(__appScope: Record<string, any>) {
  return () => {
  const { RIGHT_PANEL_MODE_STORAGE_KEY, rightPanelMode } = __appScope;
    try {
      window.localStorage.setItem(RIGHT_PANEL_MODE_STORAGE_KEY, rightPanelMode);
    } catch {
      // Ignore storage failures; panel mode still works for the active session.
    }
  };
}

export function createAppHookCallback116(__appScope: Record<string, any>) {
  return () => {
  const { LEFT_PANEL_WIDTH_STORAGE_KEY, leftPanelWidth } = __appScope;
    try {
      window.localStorage.setItem(LEFT_PANEL_WIDTH_STORAGE_KEY, String(leftPanelWidth));
    } catch {
      // Ignore storage failures; panel width still works for the active session.
    }
  };
}

export function createAppHookCallback117(__appScope: Record<string, any>) {
  return () => {
  const { RIGHT_PANEL_WIDTH_STORAGE_KEY, rightPanelWidth } = __appScope;
    try {
      window.localStorage.setItem(RIGHT_PANEL_WIDTH_STORAGE_KEY, String(rightPanelWidth));
    } catch {
      // Ignore storage failures; panel width still works for the active session.
    }
  };
}

export function createAppHookCallback118(__appScope: Record<string, any>) {
  return () => {
  const { STATUSBAR_HEIGHT_STORAGE_KEY, statusbarHeight } = __appScope;
    try {
      window.localStorage.setItem(STATUSBAR_HEIGHT_STORAGE_KEY, String(statusbarHeight));
    } catch {
      // Ignore storage failures; status bar height still works for the active session.
    }
  };
}

export function createAppHookCallback119(__appScope: Record<string, any>) {
  return () => {
  const { VALIDATION_PANEL_HEIGHT_STORAGE_KEY, topologyWarningPanelHeight } = __appScope;
    try {
      window.localStorage.setItem(VALIDATION_PANEL_HEIGHT_STORAGE_KEY, String(topologyWarningPanelHeight));
    } catch {
      // Ignore storage failures; topology warning panel height still works for the active session.
    }
  };
}

export function createAppHookCallback120(__appScope: Record<string, any>) {
  return () => {
  const { currentGraphDirtyBaseline, graphDirtyBaselineChanged, graphDirtyBaselineRef, setHasUnsavedChanges, suppressNextGraphDirtyRef } = __appScope;
    const nextBaseline = currentGraphDirtyBaseline();
    const previousBaseline = graphDirtyBaselineRef.current;
    graphDirtyBaselineRef.current = nextBaseline;
    if (!previousBaseline) {
      return;
    }
    if (suppressNextGraphDirtyRef.current) {
      suppressNextGraphDirtyRef.current = false;
      return;
    }
    if (graphDirtyBaselineChanged(previousBaseline, nextBaseline)) {
      setHasUnsavedChanges(true);
    }
  };
}

export function createAppHookCallback121(__appScope: Record<string, any>) {
  return () => {
  const { VOLTAGE_BASE_SET_PRESETS, nodes, normalizeVoltageBaseInput } = __appScope;
    const values = new Set(VOLTAGE_BASE_SET_PRESETS);
    const includeValue = (value: string | undefined) => {
      const normalized = normalizeVoltageBaseInput(value);
      if (normalized) {
        values.add(normalized);
      }
    };
    const paramKeys = ["vbase", "v_base", "highVbase", "mediumVbase", "lowVbase", "neutral_vbase", "sourceVbase", "targetVbase", "i_vbase", "j_vbase", "v_set", "i_v_set", "j_v_set", "ac_v_set", "dc_v_set", "voltage"];
    for (const node of nodes) {
      for (const terminal of node.terminals) {
        includeValue(terminal.vbase);
      }
      for (const key of paramKeys) {
        includeValue(node.params[key]);
      }
    }
    return Array.from(values).sort((left, right) => Number(left) - Number(right));
  };
}

export function createAppHookCallback122(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedNodeIds, nodes } = __appScope;
    if (activeSelectedNodeIds.length === 0) {
      return nodes;
    }
    const selected = new Set(activeSelectedNodeIds);
    return nodes.filter((node) => selected.has(node.id));
  };
}

export function createAppHookCallback123(__appScope: Record<string, any>) {
  return () => {
  const { voltageBaseSetCandidateNodes, voltageBaseSettingModeForNode, voltageBaseTerminalValues } = __appScope;
    return voltageBaseSetCandidateNodes
      .filter((node) => voltageBaseSettingModeForNode(node) === "terminal" && node.terminals.length > 1)
      .flatMap((node) => node.terminals.map((terminal, index) => ({
        nodeId: node.id,
        nodeName: node.name,
        terminalId: terminal.id,
        terminalLabel: terminal.label || `端子${index + 1}`,
        terminalType: terminal.type.toUpperCase(),
        value: voltageBaseTerminalValues[node.id]?.[terminal.id] ?? ""
      })));
  };
}

export function createAppHookCallback124(__appScope: Record<string, any>) {
  return () => {
  const { VOLTAGE_BASE_SET_SCOPES, activeSelectedNodeIds, activeVoltageBaseTerminalValues, edges, emptyVoltageBaseSetResult, hasVoltageBaseTerminalValues, mergeVoltageBaseSetResults, nodes, setVoltageBaseTerminalValuesForScope, setVoltageBaseValuesForScope, voltageBaseSetDialogOpen, voltageBaseSetMode, voltageBaseSetReady, voltageBaseSetValue } = __appScope;
    if (!voltageBaseSetDialogOpen) {
      return {};
    }
    if (voltageBaseSetMode === "byDevice") {
      if (!voltageBaseSetReady()) {
        return {};
      }
      return Object.fromEntries(
        VOLTAGE_BASE_SET_SCOPES.map((scope) => {
          const uniformResult = voltageBaseSetValue.trim().length > 0
            ? setVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope, voltageBaseSetValue.trim())
            : emptyVoltageBaseSetResult();
          const selectedTerminalValues = activeVoltageBaseTerminalValues();
          const terminalResult = hasVoltageBaseTerminalValues(selectedTerminalValues)
            ? setVoltageBaseTerminalValuesForScope(uniformResult.nodes, edges, selectedTerminalValues, scope)
            : { ...emptyVoltageBaseSetResult(), nodes: uniformResult.nodes };
          return [scope, mergeVoltageBaseSetResults(uniformResult, terminalResult)];
        })
      ) as Partial<Record<VoltageBaseSetScope, ReturnType<typeof setVoltageBaseValuesForScope>>>;
    }
    if (voltageBaseSetMode === "terminal") {
      if (!hasVoltageBaseTerminalValues(activeVoltageBaseTerminalValues())) {
        return {};
      }
      return Object.fromEntries(
        VOLTAGE_BASE_SET_SCOPES.map((scope) => [
          scope,
          setVoltageBaseTerminalValuesForScope(nodes, edges, activeVoltageBaseTerminalValues(), scope)
        ])
      ) as Partial<Record<VoltageBaseSetScope, ReturnType<typeof setVoltageBaseValuesForScope>>>;
    }
    if (voltageBaseSetValue.trim().length === 0) {
      return {};
    }
    return Object.fromEntries(
      VOLTAGE_BASE_SET_SCOPES.map((scope) => [
        scope,
        setVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope, voltageBaseSetValue.trim())
      ])
    ) as Partial<Record<VoltageBaseSetScope, ReturnType<typeof setVoltageBaseValuesForScope>>>;
  };
}

export function createAppHookCallback125(__appScope: Record<string, any>) {
  return () => {
  const { activeVoltageBaseTerminalKey, setActiveVoltageBaseTerminalKey, voltageBaseSetDialogOpen, voltageBaseSetTerminalRows, voltageBaseTerminalRowKey } = __appScope;
    if (!voltageBaseSetDialogOpen) {
      return;
    }
    if (voltageBaseSetTerminalRows.length === 0) {
      if (activeVoltageBaseTerminalKey) {
        setActiveVoltageBaseTerminalKey("");
      }
      return;
    }
    if (!voltageBaseSetTerminalRows.some((row) => voltageBaseTerminalRowKey(row) === activeVoltageBaseTerminalKey)) {
      setActiveVoltageBaseTerminalKey(voltageBaseTerminalRowKey(voltageBaseSetTerminalRows[0]));
    }
  };
}

export function createAppHookCallback126(__appScope: Record<string, any>) {
  return () => {
  const { VOLTAGE_BASE_CLEAR_SCOPES, activeSelectedNodeIds, clearVoltageBaseValuesForScope, edges, nodes, voltageBaseClearDialogOpen } = __appScope;
    if (!voltageBaseClearDialogOpen) {
      return {};
    }
    return Object.fromEntries(
      VOLTAGE_BASE_CLEAR_SCOPES.map((scope) => [
        scope,
        clearVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope)
      ])
    ) as Partial<Record<VoltageBaseClearScope, ReturnType<typeof clearVoltageBaseValuesForScope>>>;
  };
}

export function createAppHookCallback127(__appScope: Record<string, any>) {
  return (libraries: Set<string>, types: Set<string>) => {
  const { setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes } = __appScope;
    setCollapsedCustomComponentTreeLibraries(libraries);
    setCollapsedCustomComponentTreeTypes(types);
  };
}

export function createAppHookCallback128(__appScope: Record<string, any>) {
  return () => {
  const { CANVAS_INITIAL_LOD_DETAIL_CHUNK_SIZE, CANVAS_INITIAL_LOD_FIRST_DETAIL_DELAY_MS, CANVAS_INITIAL_LOD_NEXT_DETAIL_DELAY_MS, initialCanvasDetailHydrationLimit, initialCanvasDetailHydrationTarget, initialCanvasLodActive, scheduleIdleWork, setInitialCanvasDetailHydrationLimit, setInitialCanvasLodActive } = __appScope;
    if (!initialCanvasLodActive) {
      return;
    }
    if (initialCanvasDetailHydrationTarget <= 0) {
      return;
    }
    if (initialCanvasDetailHydrationLimit >= initialCanvasDetailHydrationTarget) {
      return scheduleIdleWork(() => {
        setInitialCanvasLodActive(false);
      }, CANVAS_INITIAL_LOD_NEXT_DETAIL_DELAY_MS, 1500);
    }
    return scheduleIdleWork(() => {
      setInitialCanvasDetailHydrationLimit((limit) => {
        const nextLimit = Math.min(
          limit + CANVAS_INITIAL_LOD_DETAIL_CHUNK_SIZE,
          initialCanvasDetailHydrationTarget
        );
        return nextLimit === limit ? limit : nextLimit;
      });
    }, initialCanvasDetailHydrationLimit === 0 ? CANVAS_INITIAL_LOD_FIRST_DETAIL_DELAY_MS : CANVAS_INITIAL_LOD_NEXT_DETAIL_DELAY_MS, 1200);
  };
}

export function createAppHookCallback129(__appScope: Record<string, any>) {
  return () => {
  const { groupTransformPreviewNodeIdSet, initialCanvasDetailHydrationLimit, isStaticNode, useInitialCanvasLod, viewportNodes } = __appScope;
    if (!useInitialCanvasLod || initialCanvasDetailHydrationLimit <= 0) {
      return new Set<string>();
    }
    const ids = new Set<string>();
    for (const node of viewportNodes) {
      if (groupTransformPreviewNodeIdSet.has(node.id) || isStaticNode(node)) {
        continue;
      }
      ids.add(node.id);
      if (ids.size >= initialCanvasDetailHydrationLimit) {
        break;
      }
    }
    return ids;
  };
}

export function createAppHookCallback130(__appScope: Record<string, any>) {
  return () => {
  const { groupTransformPreviewNodeIdSet, initialCanvasDetailedNodeIdSet, isRoutableLineDeviceKind, isStaticNode, nodeLabelDrag, nodeLabelRotateDrag, selectedNodeId, selectedNodeIdSet, transformDrag, useSimplifiedCanvasNodes, useSimplifiedSelectedCanvasNodes, viewportNodes } = __appScope;
    if (!useSimplifiedCanvasNodes || transformDrag || nodeLabelDrag || nodeLabelRotateDrag) {
      return viewportNodes;
    }
    return viewportNodes.filter((node) => {
      if (groupTransformPreviewNodeIdSet.has(node.id)) {
        return false;
      }
      const detailedByInitialHydration = initialCanvasDetailedNodeIdSet.has(node.id);
      if (isRoutableLineDeviceKind(node.kind)) {
        return detailedByInitialHydration || selectedNodeIdSet.has(node.id);
      }
      if (isStaticNode(node)) {
        return true;
      }
      if (detailedByInitialHydration) {
        return true;
      }
      if (!selectedNodeIdSet.has(node.id)) {
        return false;
      }
      return !useSimplifiedSelectedCanvasNodes || node.id === selectedNodeId;
    });
  };
}

export function createAppHookCallback131(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedEdgeSet, selectedEdgeId, useSimplifiedSelectedCanvasEdges } = __appScope;
    if (!useSimplifiedSelectedCanvasEdges) {
      return activeSelectedEdgeSet;
    }
    return selectedEdgeId && activeSelectedEdgeSet.has(selectedEdgeId)
      ? new Set([selectedEdgeId])
      : new Set<string>();
  };
}

export function createAppHookCallback132(__appScope: Record<string, any>) {
  return () => {
  const { initialCanvasDetailHydrationLimit, useInitialCanvasLod, viewportRoutedEdges } = __appScope;
    if (!useInitialCanvasLod || initialCanvasDetailHydrationLimit <= 0) {
      return new Set<string>();
    }
    const ids = new Set<string>();
    for (const route of viewportRoutedEdges) {
      ids.add(route.edgeId);
      if (ids.size >= initialCanvasDetailHydrationLimit) {
        break;
      }
    }
    return ids;
  };
}

export function createAppHookCallback133(__appScope: Record<string, any>) {
  return () => {
  const { CANVAS_LOD_MARKUP_CHUNK_SIZE, activeLayerEdgeIdSet, activeSelectedEdgeSet, cachedConnectionStrokeColor, detailedSelectedEdgeIdSet, dragGhostEdgeIdSet, dragOverlayEdgeIdSet, edgeById, escapeXml, groupTransformPreviewEdgeIdSet, initialCanvasDetailedEdgeIdSet, isEditMode, lodCanvasRouteChunkCacheRef, multiNodeDragging, stableSvgMarkupChunks, terminalPressPreviewEdgeIdSet, useSimplifiedCanvasRoutes, viewportRoutedEdges } = __appScope;
    if (!useSimplifiedCanvasRoutes) {
      lodCanvasRouteChunkCacheRef.current.chunks = [];
      return [];
    }
    const items = viewportRoutedEdges.flatMap((route) => {
      const edge = edgeById.get(route.edgeId);
      if (!edge) {
        return [];
      }
      if (initialCanvasDetailedEdgeIdSet.has(edge.id)) {
        return [];
      }
      const selected = activeSelectedEdgeSet.has(edge.id);
      const detailedSelected = selected && detailedSelectedEdgeIdSet.has(edge.id);
      const hidden =
        detailedSelected ||
        dragGhostEdgeIdSet.has(edge.id) ||
        (multiNodeDragging && dragOverlayEdgeIdSet.has(edge.id)) ||
        groupTransformPreviewEdgeIdSet.has(edge.id) ||
        terminalPressPreviewEdgeIdSet.has(edge.id);
      const color = cachedConnectionStrokeColor(edge);
      return [{ route, edge, hidden, selected, color, inactiveLayerGraphic: isEditMode && !activeLayerEdgeIdSet.has(edge.id) }];
    });
    return stableSvgMarkupChunks(items, lodCanvasRouteChunkCacheRef.current, {
      chunkSize: CANVAS_LOD_MARKUP_CHUNK_SIZE,
      keyPrefix: "lod-route",
      itemKey: (item) => item.edge.id,
      itemTokens: (item) => item.hidden ? [false] : [true, item.route, item.edge, item.selected, item.color, item.inactiveLayerGraphic],
      itemMarkup: (item) =>
        item.hidden
          ? ""
          : `<path class="connection-line lod-edge${item.selected ? " lod-selected-edge" : ""}${item.inactiveLayerGraphic ? " inactive-layer-graphic" : ""}" data-edge-id="${escapeXml(item.edge.id)}" d="${escapeXml(item.route.path)}" style="--connection-color:${escapeXml(item.color)}"/>`
    });
  };
}

export function createAppHookCallback134(__appScope: Record<string, any>) {
  return () => {
  const { CANVAS_LOD_MARKUP_CHUNK_SIZE, DeviceGlyph, activeLayerNodeIdSet, buildSvgTerminalMarkup, colorDisplayMode, colorPalette, customSingleTerminalAnchorToken, deviceStateVisualToken, dragGhostRoutableLineNodeIdSet, escapeXml, exportDeviceMetadataAttributes, formatSvgNumber, getDeviceStrokeColor, getDeviceStrokeWidth, groupTransformPreviewNodeIdSet, imageAssets, initialCanvasDetailedNodeIdSet, isBusNode, isEditMode, isRoutableLineDeviceKind, isStaticNode, libraryTemplateByKind, lodCanvasNodeChunkCacheRef, nodeGeometryTransform, nodeLabelDrag, nodeLabelRotateDrag, pointsToOrthogonalPath, renderSvgElementMarkup, resolveNodeStateVisual, resolveStateVisualImageHref, routableLineDeviceRenderLocalPoints, routableLineEndpointDrag, stableSvgMarkupChunks, stateVisualText, transformDrag, useSimplifiedCanvasNodes, viewportNodes } = __appScope;
    if (!useSimplifiedCanvasNodes || transformDrag || nodeLabelDrag || nodeLabelRotateDrag) {
      lodCanvasNodeChunkCacheRef.current.chunks = [];
      return [];
    }
    const items = viewportNodes.filter((node) =>
      !groupTransformPreviewNodeIdSet.has(node.id) &&
      !(isRoutableLineDeviceKind(node.kind) && dragGhostRoutableLineNodeIdSet.has(node.id)) &&
      !(isRoutableLineDeviceKind(node.kind) && routableLineEndpointDrag?.nodeId === node.id) &&
      !isStaticNode(node) &&
      !initialCanvasDetailedNodeIdSet.has(node.id)
    );
    return stableSvgMarkupChunks(items, lodCanvasNodeChunkCacheRef.current, {
      chunkSize: CANVAS_LOD_MARKUP_CHUNK_SIZE,
      keyPrefix: "lod-node",
      itemKey: (node) => node.id,
      itemTokens: (node) => [
        node,
        colorDisplayMode,
        colorPalette,
        isEditMode && !activeLayerNodeIdSet.has(node.id),
        customSingleTerminalAnchorToken(node, libraryTemplateByKind.get(node.kind)),
        deviceStateVisualToken(resolveNodeStateVisual(node)),
        resolveStateVisualImageHref(resolveNodeStateVisual(node), imageAssets)
      ],
      itemMarkup: (node) => {
      const nodeIsBus = isBusNode(node);
      const nodeIsRoutableLineDevice = isRoutableLineDeviceKind(node.kind);
      const inactiveLayerGraphic = isEditMode && !activeLayerNodeIdSet.has(node.id);
      const className = `diagram-node lod-node${nodeIsBus ? " bus-node" : ""}${nodeIsRoutableLineDevice ? " routable-line-node" : ""}${inactiveLayerGraphic ? " inactive-layer-graphic" : ""}`;
      const transform = `translate(${formatSvgNumber(node.position.x)} ${formatSvgNumber(node.position.y)}) ${nodeGeometryTransform(node)}`;
      const deviceMetadataAttributes = exportDeviceMetadataAttributes(node);
      const dataNodeAttributes = `data-node-id="${escapeXml(node.id)}"${deviceMetadataAttributes ? ` ${deviceMetadataAttributes}` : ""}`;
      const stateVisual = resolveNodeStateVisual(node);
      const stateText = stateVisualText(stateVisual);
      const stateImageHref = resolveStateVisualImageHref(stateVisual, imageAssets);
      const fill = stateVisual?.fillColor || node.params.backgroundColor || "#ffffff";
      const stroke = stateVisual?.strokeColor || stateVisual?.color || getDeviceStrokeColor(node, colorDisplayMode, colorPalette);
      const strokeWidth = Math.max(2, getDeviceStrokeWidth(node));
      const stateImageMarkup = stateImageHref && !nodeIsBus
        ? `<image class="lod-node-state-image" href="${escapeXml(stateImageHref)}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" preserveAspectRatio="xMidYMid slice"/>`
        : "";
      const stateTextMarkup = stateText
        ? `<text class="lod-node-state-text" x="0" y="0" text-anchor="middle" dominant-baseline="middle" fill="${escapeXml(stateVisual?.textColor || stateVisual?.color || stroke)}" font-size="${formatSvgNumber(clampNumber(Math.min(node.size.width, node.size.height) * 0.32, 10, 22))}" font-weight="800" paint-order="stroke" stroke="rgba(255,255,255,0.88)" stroke-width="3" stroke-linejoin="round">${escapeXml(stateText)}</text>`
        : "";
      if (nodeIsRoutableLineDevice) {
        const path = pointsToOrthogonalPath(routableLineDeviceRenderLocalPoints(node));
        return `<g class="${className}" ${dataNodeAttributes} transform="${escapeXml(transform)}">
  <path class="routable-line-device-lod-line" d="${escapeXml(path)}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="${formatSvgNumber(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"><title>${escapeXml(node.name)}</title></path>
  <path class="routable-line-device-hitline lod-routable-line-hitline" d="${escapeXml(path)}"/>
</g>`;
      }
      const customTerminalAnchorToken = customSingleTerminalAnchorToken(node, libraryTemplateByKind.get(node.kind));
      if (customTerminalAnchorToken) {
        const geometryTransform = nodeGeometryTransform(node);
        const terminalMarkup = buildSvgTerminalMarkup(node, colorDisplayMode, colorPalette);
        return `<g class="${className} custom-terminal-lod-node" ${dataNodeAttributes} transform="translate(${formatSvgNumber(node.position.x)} ${formatSvgNumber(node.position.y)})">
  <rect class="lod-node-body" transform="${escapeXml(geometryTransform)}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="${nodeIsBus ? 0 : 6}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${formatSvgNumber(strokeWidth)}"><title>${escapeXml(node.name)}</title></rect>
  <g class="lod-node-state-layer" transform="${escapeXml(geometryTransform)}">${stateImageMarkup}${stateTextMarkup}</g>
  <g class="node-terminal-layer lod-terminal-layer" transform="${escapeXml(geometryTransform)}">
  ${terminalMarkup}
  </g>
</g>`;
      }
      const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette, stateVisual }));
      const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette, stateVisual }));
      return `<g class="${className}" ${dataNodeAttributes} transform="${escapeXml(transform)}"><title>${escapeXml(node.name)}</title>${glyphMarkup}${stateImageMarkup}${glyphTextMarkup}</g>`;
      }
    });
  };
}

export function createAppHookCallback135(__appScope: Record<string, any>) {
  return () => {
  const { displaySelectedNodeIds, escapeXml, formatSvgNumber, groupTransformPreviewNodeIdSet, isBusNode, isStaticNode, nodeGeometryTransform, nodeUprightSelectionOutlineRect, nodeUsesUprightStaticSelectionOutline, selectedNodeId, useSimplifiedSelectedCanvasNodes, visibleNodeById } = __appScope;
    if (!useSimplifiedSelectedCanvasNodes) {
      return "";
    }
    return displaySelectedNodeIds.flatMap((nodeId) => {
      if (nodeId === selectedNodeId || groupTransformPreviewNodeIdSet.has(nodeId)) {
        return [];
      }
      const node = visibleNodeById.get(nodeId);
      if (!node) {
        return [];
      }
      if (isStaticNode(node)) {
        return [];
      }
      if (nodeUsesUprightStaticSelectionOutline(node)) {
        const rect = nodeUprightSelectionOutlineRect(node);
        const transform = `translate(${formatSvgNumber(node.position.x)} ${formatSvgNumber(node.position.y)})`;
        return [
          `<rect class="lod-node-selection lod-node-upright-selection" transform="${escapeXml(transform)}" x="${formatSvgNumber(rect.x)}" y="${formatSvgNumber(rect.y)}" width="${formatSvgNumber(rect.width)}" height="${formatSvgNumber(rect.height)}" rx="4"/>`
        ];
      }
      const transform = `translate(${formatSvgNumber(node.position.x)} ${formatSvgNumber(node.position.y)}) ${nodeGeometryTransform(node)}`;
      return [
        `<rect class="lod-node-selection${isBusNode(node) ? " bus-node" : ""}" transform="${escapeXml(transform)}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="${isBusNode(node) ? 0 : 6}"/>`
      ];
    }).join("");
  };
}

export function createAppHookCallback136(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, calculateModelGeometryBounds, calculateNodeVisualBounds, combineSelectionRects, isEditMode, routedEdgeById, visibleNodeById } = __appScope;
    if (isEditMode || (activeSelectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0)) {
      return null;
    }
    const rects: Array<SelectionRect | null> = [];
    for (const nodeId of activeSelectedNodeIds) {
      const node = visibleNodeById.get(nodeId);
      if (node) {
        rects.push(calculateNodeVisualBounds(node));
      }
    }
    for (const edgeId of activeSelectedEdgeIds) {
      const route = routedEdgeById.get(edgeId);
      const bounds = route ? calculateModelGeometryBounds([], [{ points: route.points }], 24) : null;
      if (bounds) {
        rects.push(bounds);
      }
    }
    return combineSelectionRects(rects);
  };
}

export function createAppHookCallback137(__appScope: Record<string, any>) {
  return () => {
  const { CANVAS_MINIMAP_DEFER_SAMPLE_THRESHOLD, editHotInteractionActive, routedEdges, scheduleIdleWork, setMinimapSamplingReady, visibleNodes } = __appScope;
    if (editHotInteractionActive) {
      return;
    }
    const minimapSampleSize = visibleNodes.length + routedEdges.length;
    if (minimapSampleSize <= CANVAS_MINIMAP_DEFER_SAMPLE_THRESHOLD) {
      setMinimapSamplingReady(true);
      return;
    }
    setMinimapSamplingReady(false);
    return scheduleIdleWork(() => setMinimapSamplingReady(true), 80, 1500);
  };
}

export function createAppHookCallback138(__appScope: Record<string, any>) {
  return () => {
  const { editHotInteractionActive, minimapNodeStep, minimapSampleCacheRef, minimapSamplingReady, visibleNodes } = __appScope;
    const cache = minimapSampleCacheRef.current;
    if (editHotInteractionActive) {
      return cache.nodes;
    }
    if (!minimapSamplingReady) {
      return cache.nodeSource === visibleNodes && cache.nodeStep === minimapNodeStep ? cache.nodes : [];
    }
    if (cache.nodeSource === visibleNodes && cache.nodeStep === minimapNodeStep) {
      return cache.nodes;
    }
    const nodes = visibleNodes.filter((_, index) => index % minimapNodeStep === 0);
    cache.nodeSource = visibleNodes;
    cache.nodeStep = minimapNodeStep;
    cache.nodes = nodes;
    return nodes;
  };
}

export function createAppHookCallback139(__appScope: Record<string, any>) {
  return () => {
  const { editHotInteractionActive, minimapRouteStep, minimapSampleCacheRef, minimapSamplingReady, routedEdges } = __appScope;
    const cache = minimapSampleCacheRef.current;
    if (editHotInteractionActive) {
      return cache.routes;
    }
    if (!minimapSamplingReady) {
      return cache.routeSource === routedEdges && cache.routeStep === minimapRouteStep ? cache.routes : [];
    }
    if (cache.routeSource === routedEdges && cache.routeStep === minimapRouteStep) {
      return cache.routes;
    }
    const routes = routedEdges.filter((_, index) => index % minimapRouteStep === 0);
    cache.routeSource = routedEdges;
    cache.routeStep = minimapRouteStep;
    cache.routes = routes;
    return routes;
  };
}

export function createAppHookCallback140(__appScope: Record<string, any>) {
  return () => {
  const { activeProjectKey, backgroundProjectId, backgroundProjectRecord, scheduleIdleWork, setBackgroundPageRenderReady } = __appScope;
    if (!backgroundProjectId || backgroundProjectId === activeProjectKey || !backgroundProjectRecord) {
      setBackgroundPageRenderReady(false);
      return;
    }
    setBackgroundPageRenderReady(false);
    return scheduleIdleWork(() => setBackgroundPageRenderReady(true), 80, 1500);
  };
}

export function createAppHookCallback141(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_CANVAS_BACKGROUND, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, activeProjectKey, backgroundPageCanvasTransform, backgroundProjectId, backgroundProjectRecord, canvasHeight, canvasWidth, imageAssets, resolveProjectImage } = __appScope;
    if (!backgroundProjectId || backgroundProjectId === activeProjectKey || !backgroundProjectRecord) {
      return null;
    }
    const backgroundProject = backgroundProjectRecord.project;
    const backgroundBounds = {
      width: backgroundProject.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
      height: backgroundProject.canvasHeight ?? DEFAULT_CANVAS_HEIGHT
    };
    return {
      project: backgroundProject,
      backgroundBounds,
      backgroundColor: backgroundProject.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND,
      backgroundImageUrl: resolveProjectImage(backgroundProject, imageAssets),
      transform: backgroundPageCanvasTransform(backgroundBounds, { width: canvasWidth, height: canvasHeight })
    };
  };
}

export function createAppHookCallback142(__appScope: Record<string, any>) {
  return () => {
  const { backgroundLayerIds, backgroundPageFrameRender, backgroundPageRenderReady, edges, filterProjectByVisibleLayers, nodes, normalizeProjectLayers, routeEdgesForSavedPathRendering } = __appScope;
    if (!backgroundPageFrameRender || !backgroundPageRenderReady) {
      return backgroundPageFrameRender
        ? {
            ...backgroundPageFrameRender,
            nodes: [] as ModelNode[],
            edges: [] as Edge[],
            routes: [] as RoutedEdge[],
            nodeById: new Map<string, ModelNode>(),
            edgeById: new Map<string, Edge>()
          }
        : null;
    }
    const backgroundProject = normalizeProjectLayers(backgroundPageFrameRender.project);
    const visibleBackgroundLayerIds = new Set(backgroundLayerIds);
    const backgroundLayers = (backgroundProject.layers ?? []).map((layer) => ({
      ...layer,
      visible: visibleBackgroundLayerIds.has(layer.id)
    }));
    const { nodes: backgroundNodes, edges: backgroundEdges } =
      filterProjectByVisibleLayers(backgroundProject.nodes, backgroundProject.edges, backgroundLayers);
    const routes = routeEdgesForSavedPathRendering(backgroundNodes, backgroundEdges, backgroundPageFrameRender.backgroundBounds, { refreshCrossingArcs: false });
    return {
      ...backgroundPageFrameRender,
      nodes: backgroundNodes,
      edges: backgroundEdges,
      routes,
      nodeById: new Map(backgroundNodes.map((node) => [node.id, node])),
      edgeById: new Map(backgroundEdges.map((edge) => [edge.id, edge]))
    };
  };
}
