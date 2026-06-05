import { useMemo, type CSSProperties } from "react";
import {
  getConnectionStrokeColor,
  getDeviceStrokeColor,
  getDeviceStrokeWidth,
  getNodeScaleX,
  getNodeScaleY,
  getTerminalDisplayColor,
  isBusNode,
  isRoutableLineDeviceKind,
  isStaticNode,
  refreshCrossingArcPaths,
  terminalRenderLocalPoint,
  terminalStubSegment,
  terminalStubStrokeWidth
} from "./model";
import {
  MemoDeviceGlyph,
  buildSvgTerminalMarkup,
  customSingleTerminalAnchorToken,
  escapeXml,
  formatSvgNumber,
  nodeGeometryTransform,
  nodeUprightScaleTransform,
  stableSvgMarkupChunks,
  svgStrokeDashArray
} from "./DeviceGlyph";
import {
  formatMeasurementDisplayValue,
  resolveMeasurementItemDisplay,
  type MeasurementGroup
} from "./measurements";

const CANVAS_LOD_NODE_DETAIL_LIMIT = 650;
const CANVAS_LOD_MAX_ZOOM_PERCENT = 120;
const CANVAS_LOD_MAX_NODE_SCREEN_SIZE = 18;
const CANVAS_LOD_NODE_SCREEN_SAMPLE_LIMIT = 96;
const CANVAS_LOD_SELECTED_DETAIL_LIMIT = 12;
const CANVAS_LOD_MARKUP_CHUNK_SIZE = 64;

type CanvasRenderLayerProps = Record<string, any>;

function estimatedViewportNodeScreenSize(
  nodes: readonly any[],
  scale: { x: number; y: number },
  sampleLimit = CANVAS_LOD_NODE_SCREEN_SAMPLE_LIMIT
) {
  if (nodes.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const step = Math.max(1, Math.ceil(nodes.length / sampleLimit));
  let maxSize = 0;
  let sampled = 0;
  for (let index = 0; index < nodes.length && sampled < sampleLimit; index += step) {
    const node = nodes[index];
    const width = node.size.width * Math.abs(getNodeScaleX(node)) * scale.x;
    const height = node.size.height * Math.abs(getNodeScaleY(node)) * scale.y;
    maxSize = Math.max(maxSize, width, height);
    sampled += 1;
  }
  return maxSize;
}

export function useCanvasLodRenderLayers(props: CanvasRenderLayerProps) {
  const {
    activeLayerEdgeIdSet,
    activeLayerNodeIdSet,
    activeSelectedEdgeSet,
    cachedConnectionStrokeColor,
    canvasScrollScale,
    colorDisplayMode,
    colorPalette,
    connectSource,
    currentZoomPercent,
    displaySelectedNodeIds,
    dragAffectedEdgeIdSet,
    dragOverlayEdgeIdSet,
    dragPreviewEdgeIdSet,
    draggingDelta,
    edgeById,
    groupTransformPreviewEdgeIdSet,
    groupTransformPreviewNodeIdSet,
    isBrowseMode,
    isEditMode,
    libraryTemplateByKind,
    lodCanvasNodeChunkCacheRef,
    lodCanvasRouteChunkCacheRef,
    manualPathDrag,
    multiNodeDragging,
    nodeById,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    nodeUprightSelectionOutlineRect,
    nodeUsesUprightStaticSelectionOutline,
    rewiring,
    savedRouteCrossingArcsReady,
    selectedEdgeId,
    selectedNodeId,
    selectedNodeIdSet,
    singleNodeDragging,
    staticDrawing,
    terminalPress,
    terminalPressPreviewEdgeIdSet,
    transformDrag,
    viewportNodes,
    viewportRoutedEdges,
    visibleNodeById
  } = props;

  const viewportNodeLodScreenSize = useMemo(
    () => estimatedViewportNodeScreenSize(viewportNodes, canvasScrollScale),
    [canvasScrollScale.x, canvasScrollScale.y, viewportNodes]
  );
  const useSimplifiedCanvasNodes =
    viewportNodes.length > CANVAS_LOD_NODE_DETAIL_LIMIT &&
    currentZoomPercent <= CANVAS_LOD_MAX_ZOOM_PERCENT &&
    viewportNodeLodScreenSize <= CANVAS_LOD_MAX_NODE_SCREEN_SIZE &&
    !connectSource &&
    !staticDrawing;
  const useSimplifiedSelectedCanvasNodes =
    useSimplifiedCanvasNodes &&
    selectedNodeIdSet.size > CANVAS_LOD_SELECTED_DETAIL_LIMIT &&
    !transformDrag &&
    !nodeLabelDrag &&
    !nodeLabelRotateDrag;
  const detailedViewportNodes = useMemo(() => {
    if (!useSimplifiedCanvasNodes || transformDrag || nodeLabelDrag || nodeLabelRotateDrag) {
      return viewportNodes;
    }
    return viewportNodes.filter((node: any) => {
      if (groupTransformPreviewNodeIdSet.has(node.id)) {
        return false;
      }
      if (!selectedNodeIdSet.has(node.id)) {
        return false;
      }
      return !useSimplifiedSelectedCanvasNodes || node.id === selectedNodeId;
    });
  }, [
    groupTransformPreviewNodeIdSet,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    selectedNodeId,
    selectedNodeIdSet,
    transformDrag,
    useSimplifiedCanvasNodes,
    useSimplifiedSelectedCanvasNodes,
    viewportNodes
  ]);
  const useSimplifiedCanvasRoutes =
    useSimplifiedCanvasNodes &&
    !rewiring &&
    !manualPathDrag &&
    !terminalPress;
  const renderViewportRoutedEdges = useMemo(() => {
    if (!isBrowseMode || savedRouteCrossingArcsReady || useSimplifiedCanvasRoutes || viewportRoutedEdges.length < 2) {
      return viewportRoutedEdges;
    }
    return refreshCrossingArcPaths(viewportRoutedEdges);
  }, [isBrowseMode, savedRouteCrossingArcsReady, useSimplifiedCanvasRoutes, viewportRoutedEdges]);
  const useSimplifiedSelectedCanvasEdges =
    useSimplifiedCanvasRoutes &&
    activeSelectedEdgeSet.size > CANVAS_LOD_SELECTED_DETAIL_LIMIT &&
    !rewiring &&
    !manualPathDrag &&
    !terminalPress;
  const detailedSelectedEdgeIdSet = useMemo(() => {
    if (!useSimplifiedSelectedCanvasEdges) {
      return activeSelectedEdgeSet;
    }
    return selectedEdgeId && activeSelectedEdgeSet.has(selectedEdgeId)
      ? new Set([selectedEdgeId])
      : new Set<string>();
  }, [activeSelectedEdgeSet, selectedEdgeId, useSimplifiedSelectedCanvasEdges]);
  const lodCanvasRouteChunks = useMemo(() => {
    if (!useSimplifiedCanvasRoutes) {
      lodCanvasRouteChunkCacheRef.current.chunks = [];
      return [];
    }
    const items = viewportRoutedEdges.flatMap((route: any) => {
      const edge = edgeById.get(route.edgeId);
      if (!edge) {
        return [];
      }
      const selected = activeSelectedEdgeSet.has(edge.id);
      const detailedSelected = selected && detailedSelectedEdgeIdSet.has(edge.id);
      const hidden =
        detailedSelected ||
        (singleNodeDragging && dragAffectedEdgeIdSet.has(edge.id)) ||
        (draggingDelta && dragPreviewEdgeIdSet.has(edge.id)) ||
        (multiNodeDragging && dragOverlayEdgeIdSet.has(edge.id)) ||
        groupTransformPreviewEdgeIdSet.has(edge.id) ||
        terminalPressPreviewEdgeIdSet.has(edge.id);
      const color = cachedConnectionStrokeColor(edge);
      return [{ route, edge, hidden, selected, color, inactiveLayerGraphic: isEditMode && !activeLayerEdgeIdSet.has(edge.id) }];
    });
    return stableSvgMarkupChunks(items, lodCanvasRouteChunkCacheRef.current, {
      chunkSize: CANVAS_LOD_MARKUP_CHUNK_SIZE,
      keyPrefix: "lod-route",
      itemKey: (item: any) => item.edge.id,
      itemTokens: (item: any) => item.hidden ? [false] : [true, item.route, item.edge, item.selected, item.color, item.inactiveLayerGraphic],
      itemMarkup: (item: any) =>
        item.hidden
          ? ""
          : `<path class="connection-line lod-edge${item.selected ? " lod-selected-edge" : ""}${item.inactiveLayerGraphic ? " inactive-layer-graphic" : ""}" d="${escapeXml(item.route.path)}" style="--connection-color:${escapeXml(item.color)}"/>`
    });
  }, [
    activeLayerEdgeIdSet,
    activeSelectedEdgeSet,
    colorDisplayMode,
    colorPalette,
    detailedSelectedEdgeIdSet,
    dragAffectedEdgeIdSet,
    dragOverlayEdgeIdSet,
    dragPreviewEdgeIdSet,
    draggingDelta,
    edgeById,
    groupTransformPreviewEdgeIdSet,
    isEditMode,
    multiNodeDragging,
    nodeById,
    singleNodeDragging,
    terminalPressPreviewEdgeIdSet,
    useSimplifiedCanvasRoutes,
    viewportRoutedEdges
  ]);
  const lodCanvasNodeChunks = useMemo(() => {
    if (!useSimplifiedCanvasNodes || transformDrag || nodeLabelDrag || nodeLabelRotateDrag) {
      lodCanvasNodeChunkCacheRef.current.chunks = [];
      return [];
    }
    const items = viewportNodes.filter((node: any) => !groupTransformPreviewNodeIdSet.has(node.id));
    return stableSvgMarkupChunks(items, lodCanvasNodeChunkCacheRef.current, {
      chunkSize: CANVAS_LOD_MARKUP_CHUNK_SIZE,
      keyPrefix: "lod-node",
      itemKey: (node: any) => node.id,
      itemTokens: (node: any) => [
        node,
        colorDisplayMode,
        colorPalette,
        isEditMode && !activeLayerNodeIdSet.has(node.id),
        customSingleTerminalAnchorToken(node, libraryTemplateByKind.get(node.kind))
      ],
      itemMarkup: (node: any) => {
        const nodeIsBus = isBusNode(node);
        const inactiveLayerGraphic = isEditMode && !activeLayerNodeIdSet.has(node.id);
        const className = `diagram-node lod-node${nodeIsBus ? " bus-node" : ""}${inactiveLayerGraphic ? " inactive-layer-graphic" : ""}`;
        const transform = `translate(${formatSvgNumber(node.position.x)} ${formatSvgNumber(node.position.y)}) ${nodeGeometryTransform(node)}`;
        const fill = node.params.backgroundColor || "#ffffff";
        const stroke = getDeviceStrokeColor(node, colorDisplayMode, colorPalette);
        const strokeWidth = Math.max(2, getDeviceStrokeWidth(node));
        const customTerminalAnchorToken = customSingleTerminalAnchorToken(node, libraryTemplateByKind.get(node.kind));
        if (customTerminalAnchorToken) {
          const geometryTransform = nodeGeometryTransform(node);
          const terminalMarkup = buildSvgTerminalMarkup(node, colorDisplayMode, colorPalette);
          return `<g class="${className} custom-terminal-lod-node" data-node-id="${escapeXml(node.id)}" transform="translate(${formatSvgNumber(node.position.x)} ${formatSvgNumber(node.position.y)})">
  <rect class="lod-node-body" transform="${escapeXml(geometryTransform)}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="${nodeIsBus ? 0 : 6}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${formatSvgNumber(strokeWidth)}"><title>${escapeXml(node.name)}</title></rect>
  <g class="node-terminal-layer lod-terminal-layer" transform="${escapeXml(geometryTransform)}">
  ${terminalMarkup}
  </g>
</g>`;
        }
        return `<rect class="${className}" data-node-id="${escapeXml(node.id)}" transform="${escapeXml(transform)}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="${nodeIsBus ? 0 : 6}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${formatSvgNumber(strokeWidth)}"><title>${escapeXml(node.name)}</title></rect>`;
      }
    });
  }, [
    activeLayerNodeIdSet,
    colorDisplayMode,
    colorPalette,
    groupTransformPreviewNodeIdSet,
    isEditMode,
    libraryTemplateByKind,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    transformDrag,
    useSimplifiedCanvasNodes,
    viewportNodes
  ]);
  const lodSelectedNodeMarkup = useMemo(() => {
    if (!useSimplifiedSelectedCanvasNodes) {
      return "";
    }
    return displaySelectedNodeIds.flatMap((nodeId: string) => {
      if (nodeId === selectedNodeId || groupTransformPreviewNodeIdSet.has(nodeId)) {
        return [];
      }
      const node = visibleNodeById.get(nodeId);
      if (!node) {
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
  }, [
    displaySelectedNodeIds,
    groupTransformPreviewNodeIdSet,
    selectedNodeId,
    useSimplifiedSelectedCanvasNodes,
    visibleNodeById
  ]);

  return {
    detailedSelectedEdgeIdSet,
    detailedViewportNodes,
    lodCanvasNodeChunks,
    lodCanvasRouteChunks,
    lodSelectedNodeMarkup,
    renderViewportRoutedEdges,
    useSimplifiedCanvasNodes,
    useSimplifiedCanvasRoutes,
    useSimplifiedSelectedCanvasEdges,
    useSimplifiedSelectedCanvasNodes
  };
}

export function useCanvasAuxiliaryRenderers(props: CanvasRenderLayerProps) {
  const {
    backgroundPageRender,
    beginMeasurementDrag,
    beginReadonlyBackgroundStaticButtonPointerFeedback,
    clearStaticButtonFeedback,
    colorDisplayMode,
    colorPalette,
    defaultCanvasBackground,
    deviceLabelsVisible,
    dragPreviewMovedNodeById,
    handleStaticButtonClick,
    isBrowseMode,
    isStaticButtonEnabledForNode,
    measurementRuntimeSnapshot,
    nodeForegroundImage,
    nodeImage,
    nodeLabelShouldRender,
    nodeLabelText,
    nodeLabelTextAnchor,
    nodeLabelTextStyle,
    nodeLabelTransform,
    nodeLabelVertical,
    nodeLabelVerticalSegments,
    nodeLabelVerticalTokenStyle,
    nodeLabelVerticalTokenY,
    platformMeasurementConfig,
    setStaticButtonFeedback,
    staticButtonPointerRef,
    staticButtonVisual,
    visibleNodeById
  } = props;

  const renderMeasurementGroup = (group: MeasurementGroup) => {
    const node = dragPreviewMovedNodeById.get(group.nodeId) ?? visibleNodeById.get(group.nodeId);
    if (!node) {
      return null;
    }
    const x = node.position.x + group.offset.x;
    const y = node.position.y + group.offset.y;
    const rows = group.items
      .map((item) => {
        const display = resolveMeasurementItemDisplay({ config: platformMeasurementConfig, node, group, item });
        if (!display.visible) {
          return null;
        }
        const runtime = item.sourcePoint ? measurementRuntimeSnapshot.get(item.sourcePoint) : undefined;
        return {
          item,
          display,
          text: formatMeasurementDisplayValue(runtime, display.decimals, display.unit),
          quality: runtime?.quality ?? "missing"
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (rows.length === 0) {
      return null;
    }

    return (
      <g
        key={group.id}
        className={`measurement-group measurement-layout-${group.layout}`}
        transform={`translate(${x} ${y})`}
        onPointerDown={(event) => beginMeasurementDrag(event, group)}
      >
        {rows.map((row, index) => {
          const lineHeight = row.display.fontSize + 4;
          const itemX = group.layout === "vertical" ? 0 : group.layout === "grid" ? (index % 2) * 110 : index * 110;
          const itemY = group.layout === "vertical" ? index * lineHeight : group.layout === "grid" ? Math.floor(index / 2) * lineHeight : 0;
          return (
            <text
              key={row.item.id}
              className={`measurement-item measurement-quality-${row.quality}`}
              x={itemX}
              y={itemY}
              fill={row.display.color}
              fontFamily={row.display.fontFamily}
              fontSize={row.display.fontSize}
              fontWeight={row.display.fontWeight}
              fontStyle={row.display.fontStyle}
              textDecoration={row.display.textDecoration}
              dominantBaseline="middle"
            >
              {`${row.display.label} ${row.text}`}
            </text>
          );
        })}
      </g>
    );
  };

  const renderReadonlyBackgroundPage = () => {
    if (!backgroundPageRender) {
      return null;
    }
    const backgroundConnectionLineStyle = (edge: any) => ({
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
          fill={backgroundPageRender.backgroundColor || defaultCanvasBackground}
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
          {backgroundPageRender.routes.map((route: any) => {
            const edge = backgroundPageRender.edgeById.get(route.edgeId);
            return edge ? (
              <g key={`background-edge-${edge.id}`} className="connection-group background-page-edge" style={backgroundConnectionLineStyle(edge)}>
                <path d={route.path} className="connection-line" />
              </g>
            ) : null;
          })}
        </g>
        <g className="background-page-nodes">
          {backgroundPageRender.nodes.map((node: any) => {
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
                  <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                  <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
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
                  <g className="node-upright-content" transform={nodeUprightScaleTransform(node)}>
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
                      nodeLabelVerticalSegments(nodeLabelText(node)).map((segment: any, index: number) => (
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
                  {node.terminals.map((terminal: any) => {
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

  return {
    renderMeasurementGroup,
    renderReadonlyBackgroundPage
  };
}
