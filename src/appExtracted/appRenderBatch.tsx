import { useRef } from "react";
import { ensureStableFactoryStore, getOrCreateStableFactory, syncStableLiveScope, type StableFactoryStore } from "./stableScopeFactoryCache";
// 从 App.tsx 第 3053-6217 行提取
import { useMemo, useEffect, useCallback, useLayoutEffect, type DragEvent } from "react";
import type { LibraryPackageScope } from "./appPersistenceLibraryExport";
import { Select, Input, InputNumber } from "antd";
import { createMeasurementFieldParameterDefinition } from "../measurementDefinitionTypes";
import { reorderKeys, sortByKeyOrder, writeLibraryTreeOrder } from "../libraryTreeOrder";
import {
  deviceLibraryComponentKey,
  deviceLibraryTemplateKey,
  isDeviceLibraryCategoryVisible,
  isDeviceLibraryComponentVisible,
  isDeviceLibraryTemplateVisible
} from "../deviceLibraryCustomization";
import type { GraphTemplate } from "./appCoreCanvasUtilities";
const LIBRARY_PACKAGE_DIALOG_SCOPES: LibraryPackageScope[] = [
  "all",
  "component-library",
  "measurement",
  "device-library",
  "template-library",
  "icon-library"
];
import {
  Bold,
  Download,
  FileInput,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Italic,
  Search,
  Underline,
  X,
} from "lucide-react";
import { cloneEdgeEditablePoints, calculateModelGeometryBounds,
  calculateNodeVisualBounds,
  clampEdgeGeometryToBounds,
  clearVoltageBaseValuesForScope,
  setVoltageBaseValuesForScope,
  clampNodePositionToBounds,
  clampPointToBounds,
  copySavedProjectWithUniqueName,
  createSavedProject,
  createNodeFromTemplate,
  DEVICE_LIBRARY,
  getNodeScaleX,
  getNodeScaleY,
  isCanvasNodeMovable,
  isRoutableLineDeviceKind,
  resolveDeviceParameterDefinitionExportSettings,
  formatPowerBaseDisplayValue,
  enumSelectOptionsWithCurrentValue,
  invalidEnumOptionLabel,
  getTerminalPoint,
  DEFAULT_MODEL_LAYER_ID,
  normalizeScaleValue,
  edgeWithSavedRouteGeometry,
  validateConnectionEndpointRules,
  voltageBaseSettingModeForNode,
  normalizeViewBoxToCanvas,
  type DeviceKind,
  type Edge,
  type ModelNode,
  type Point,
  type ContainerDeviceParameterView,
  type TerminalType,
  type VoltageBaseClearScope,
  type VoltageBaseSetScope,
  type VoltageBaseTerminalValuesByNodeId,
  viewBoxZoomPercent,
  type SavedProjectRecord } from "../model";
import {
  type GraphStore
} from "../graphStore";
import { createMemoryWatchCallback } from "../memoryWatch";
import {
  expandSelectionByGroups,
  type CanvasLayoutUnit,
  type CanvasSelectionScope,
} from "../selectionActions";
import {
  canvasFitCenterOffsetX,
  canvasFitPanelInset,
  clampNumber,
} from "../canvasViewport";
import {
  isPointerInsideSidePanelViewportEdgeBridge,
} from "../sidePanelVisibility";
import {
  DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR,
  DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR,
  DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE,
  DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH,
  buildMeasurementProfilePositionDefinitions,
  measurementGroupForNode,
  measurementProfileItemsForNodePosition,
  normalizeMeasurementConfig,
  normalizeProjectMeasurements,
  type MeasurementGroup,
  type MeasurementItemBinding,
} from "../measurements";
import {
  TextStyleToggleButton,
} from "../components/StaticButtonComponents";
import {
  saveTextFile,
} from "../fileIO";
import {
  formatSvgNumber,
  backendImageIdFromHref,
  isImageDataUrl,
} from "../svgUtils";
import {
  BufferedTextInput,
  BufferedTextarea,
} from "../components/InputComponents";
import {
  stateVisualText,
  resolveStateVisualImageHref,
} from "../staticRenderUtils";
import {
  createCompleteImportedModelFeedback,
  createImportSvgModelFile,
  createOpenSvgModelImportFilePicker,
  createImportDotModelFile,
  createOpenDotModelImportFilePicker,
  createProgrammaticExportEDeviceDefinition,
  createProgrammaticImportEDeviceDefinition
} from "./appDeviceDefinitionFactories";
import {
  createDeleteSymbolExportScheme,
  createExportComponentSymbols,
  createExportComponentSymbolsStandalone,
  createLoadSymbolExportSchemes,
  createSaveSymbolExportScheme
} from "./appSymbolExportFactories";
import { customParamId, DEFAULT_STATE_ICON_DRAWING_FRAME, isDefaultStatePageId, defaultStateDraftRow, stateVisualFromDraftRow, activeStateDraftRow, stateIconDrawingDraftSourceImage, stateIconDrawingInlineNeedsDraftReload, stateIconDrawingInlineCanPersistDraft, createStateIconDrawingInitialElements, stateIconDrawingToPersistedImage, type DeviceDefinitionStateDraftRow } from "../stateIconDrawing";
import { deviceDefinitionKeyForTemplate, isDerivedComponentBaseParamName, normalizeCustomDeviceTerminalAnchorCoordinate, createDefaultCustomDeviceTerminalAnchors, normalizeContainerTerminalAssociations, customDefaultDefinitions, generateCustomDeviceImage,  } from "../customDeviceUtils";
import { buildComponentLibraryDefaultParameterDefinitions, resolveEditableComponentLibraryDefinition } from "../componentLibraryDefinitions";
import { useBatchEditors } from "../hooks/useBatchEditors";
import {
  sameOptionalPoint, sameConnectTarget, sameOptionalPointList,
  shouldFinalizeMovedNodeEdgesSynchronously, shouldDeferSingleNodeTerminalReconciliation,
  shouldPatchRouteCacheForHighFanoutMove,
  safeFilePart, serializeSchemeRecordForFile, isObjectRecord,
  topologyWarningDisplayMessage, isStaticButtonEnabledForNode,
  timestampForLibraryPackageFilename
} from "./appInlineUtilityFunctions";
import {
  createRenderLayerManager, createRenderLibraryDefinitionActions,
  createRenderGraphTemplateButton, createRenderGraphTemplateFlyout,
  createRenderProjectPanel, createRenderElementTreePanel
} from "./appRenderPanels";
import {
  createFloatingToolbarBounds, createCanvasPointToSurfaceCss,
  createRotateControlAvoidRectFromCanvas, createFloatingToolbarWrapperStyle,
  createMapPointToMinimap
} from "./appCanvasViewportCalculations";
import {
  buildUserCustomizationInventory,
  collectReferencedUserAssetIds,
} from "../userCustomizations";
import {
  createApplyUserCustomizationSnapshot,
  createApplyUserCustomizationSnapshotToState,
  createCancelPendingUserCustomizationImport,
  createCaptureUserCustomizationSnapshot,
  createChangePendingUserCustomizationImportMode,
  createCloseUserCustomizationManager,
  createConfirmUserCustomizationImport,
  createExportAllUserCustomizations,
  createImportUserCustomizationFile,
  createOpenUserCustomizationImportFilePicker,
  createOpenUserCustomizationManager,
  createPersistUserCustomizationSnapshot,
  createReconcileOpenModelAfterCustomizationChange,
  createRefreshUserCustomizationManager,
  createRestoreUserCustomizations,
  createSaveUserCustomizationSnapshotFile
} from "./appUserCustomizationFactories";
import { isGroupTransformDrag, selectionRectCenter, combineSelectionRects, routeMidpoint, groupTransformGeometry, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MAX_CANVAS_HEIGHT, MOVE_BOUNDARY_GUARD, CANVAS_RESIZE_HANDLE_SIZE, CANVAS_MINIMAP_WIDTH, CANVAS_MINIMAP_HEIGHT, CANVAS_MINIMAP_PADDING, TOPOLOGY_WARNING_PANEL_MARGIN, CANVAS_MINIMAP_MAX_NODE_MARKS, CANVAS_MINIMAP_MAX_ROUTE_MARKS, CANVAS_LOD_NODE_DETAIL_LIMIT, CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT, CANVAS_LOD_MAX_ZOOM_PERCENT, CANVAS_LOD_MAX_NODE_SCREEN_SIZE, CANVAS_LOD_SELECTED_DETAIL_LIMIT, CANVAS_FLOATING_TOOLBAR_GAP, NODE_FLOATING_TOOLBAR_WIDTH, NODE_FLOATING_TOOLBAR_HEIGHT, EDGE_FLOATING_TOOLBAR_WIDTH, EDGE_FLOATING_TOOLBAR_HEIGHT, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP, TERMINAL_TYPE_OPTIONS, estimatedViewportNodeScreenSize, PARAM_LABELS, paramOptionsForSection, imageAssetsToMap, backendErrorMessage, fetchBackendImageFolders, fetchBackendImages, fetchAllBackendImages, deleteBackendImageAsset, pushRecentGlyph } from "./appCoreCanvasUtilities";
import { findProjectRecordInSchemes, cloneNodesForUndo, cloneEdgesForUndo, cloneGroupsForUndo, cloneTopologyForUndo, cloneTopologyErrorsForUndo, clampCanvasDimension, serializeMeasurementConfigForStorage, saveBackendMeasurementConfigPayload, createLibraryPackage, buildComponentCatalog, normalizeLibraryPackage, deviceLibraryPayloadForPackageScope, normalizeIconLibraryPersistencePayload, iconLibraryHasImportableAssets, importBackendImageLibraryPayload, categoryLibraryComponentLibraryKey, componentLibraryDisplayParts, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeDefinitionRowEnumFields, normalizeDeviceLibraryPersistencePayload, writeMeasurementConfig, fetchBackendImageDataUrl, nodeRotateHandleControlPoints, nodeUprightRotateHandleControlPoints, nodeUsesUprightStaticSelectionOutline, rootComponentLibraryGroupsForDisplay,  } from "./appPersistenceLibraryExport";
import { createRefreshSchemesFromBackendDirectory, createHandleBackendSchemeMutationFailure, createSaveSchemeTreeToBackend, createPersistSchemeTreeToBackend, createReplaceSchemeTreeInBackend, createPersistRefreshRecoveryNow, createClearRecordSelection, createBlurLayerManagementDropdownFocus, createSelectSingleScheme, createSelectSingleProject, createToggleSchemeSelection, createToggleProjectSelection, createUndoGraphSnapshotPatchPlan, createApplyUndoGraphSnapshot, createPushUndoSnapshot, createUniqueUndoScopeIds, createPushNodeOnlyUndoSnapshot, createSyncExistingNodesWithTemplateDefinitions, createUpdateMeasurementConfig, createPrepareMeasurementConfigDraft, createOpenMeasurementConfigDialog, createCloseMeasurementConfigDialog, createSaveMeasurementConfigDialog, createUpdateMeasurementType, createAddMeasurementType, createDeleteMeasurementType, createSetMeasurementProfileItems, createCreateMeasurementProfileItem, createAddMeasurementProfileItem, createUpdateMeasurementProfileItem, createDeleteMeasurementProfileItem, createMoveMeasurementProfileItem, createUpdateProjectMeasurementsWithUndo, createAddDefaultMeasurementsToNode, createRemoveMeasurementsFromNode, createMeasurementGroupShellOffsetForNode, createMeasurementSourcePointForNodeItem, createMeasurementTypeOptionsForMeasurementGroup, createCreateMeasurementItemForNode, createUpdateMeasurementGroupById, createUpdateSelectedMeasurementGroup, createUpdateSelectedMeasurementGroups, createAddMeasurementItemToGroup, createAddMeasurementItemToNode, createUpdateMeasurementItem, createRemoveMeasurementItem, createCreateMeasurementEditorGroupForPosition, createUpdateMeasurementEditorGroupSettings, createUpdateMeasurementEditorDraftItem, createAddMeasurementEditorDraftItem, createRemoveMeasurementEditorDraftItem, createMoveMeasurementEditorDraftItem, createUpdateMeasurementEditorDraftItemPosition, createDuplicateMeasurementEditorItemNames, createConfirmMeasurementEditorDialog, createRenderSelectedNodeMeasurementTable, createBeginMeasurementDrag, createUpdateMeasurementDrag, createFinishMeasurementDrag } from "./appGraphMeasurementFactories";
import { createFlushMeasurementConfigDialogDraftInputs } from "./appGraphMeasurementFactories";
import { createEnsureDraggingUndoSnapshot, createRequestCanvasFrameCenter, createUndoLastOperation, createRedoLastOperation, createCanvasPointerKeyboardShortcutAvailability, createRouteForCurrentEdgeSave, createCurrentProject, createAdjustSelectedDisplayLayer, createClearTransientSelectionState, createQueuePendingBlankCanvasDeselect, createCancelPendingBlankCanvasDeselectOnMove, createFlushPendingBlankCanvasDeselect, createWriteOperationLog, createPersistDeviceLibraryChange, createPersistTemplateLibraryChange, createConnectionCommitFailureMessage, createSwitchInspectorTabForCanvasSelection, createSelectCanvasGraphics, createSetModifierSelectionPress, createToggleNodeSelectionFromModifierClick, createToggleEdgeSelectionFromModifierClick, createToggleSelectionFromModifierClick, createRestoreCanvasSelectionSnapshot, createRestoreCanvasSelectionSnapshotWithInspector, createStartModifierSelectionPress, createCancelModifierSelectionPress, createFinishModifierSelectionPress, createStartNodeLabelDrag, createStartNodeLabelRotateDrag, createFinishNodeLabelDrag, createFinishNodeLabelRotateDrag, createSetSelectedNodeLabelDisplayMode, createToggleSelectedNodeLabelDisplay, createCopySelection, createCutSelection, createPasteSelection, createCreateGraphTemplateType, createCreateGroupDeviceIconSvg, createGroupDeviceTerminalAnchor, createGroupDeviceTerminalSortKey, createGroupDeviceTerminalAssociationFor, createGroupDeviceExternalTerminals, createValidateGroupDeviceIconReplacement, createReplaceBuiltinDeviceIconOverride, createOpenGroupDeviceDefinitionDialog, createConfirmCreateDeviceFromGroup, createConfirmReplaceDeviceIconFromGroup, createOpenAddTemplateDialog, createCancelTemplateDialog, createConfirmAddGraphTemplate, createDeleteGraphTemplate, createDeleteGraphTemplateType, createDropGraphTemplate, createFinishMarqueeSelectionFromPoints, createStartContextMarqueeSelection, createOpenFilterSelectionDialog, createToggleFilterSelectionType, createToggleFilterSelectionItem, createConfirmFilterSelectionDialog, createFinishMarqueeSelection, createDeleteSelection, createDeleteSelectedGraphicsFromCanvas, createGroupSelectedGraphics, createUngroupSelectedGraphics, createAddToContainer, createConfirmAddToContainer, createRemoveFromContainer, createManualPointDeltaForEdge, createRoutePreserveEdgeIdsForMovedNodes, createRouteSnapshotEdgesForMove, createRouteTouchesExpandedBoxes, createBoundsForNodeSet, createMergeNodeUpdateLists, createMergeUniqueEdgesById, createCompleteNodeListForPartialPatch, createIsWholeActiveLayerMove, createInternalMoveEdgeIdsForMovedNodes, createExternalMoveCandidateEdges, createInternalMoveCandidateEdges, createTranslateInternalMoveCandidateEdges, createTranslateWholeMoveCandidateEdges, createInternalRoutableLineNodeUpdatesForMove, createRoutableLineRouteCandidateIdsForMovedNodes, createRebuildRoutableLineNodeUpdatesForChangedNodes, createScheduleDeferredRoutableLineRouteRepair, createLocalRouteOptimizationEdges, createLocalRouteOptimizationCandidateEdges, createRoutePointsForMovedNodeBlockers, createRoutePointsForMovedEdgesBlockedByStationaryNodes, createRoutePointsNearOriginalMovedNodes, createAdjustEdgesAfterNodeMove, createRebuildSingleAffectedConnectionRoute, createSynchronousEdgeAdjustmentCandidates, createShouldAdjustEdgeSynchronouslyAfterMove, createMergeAdjustedCandidateEdges, createTerminalReconcileNodeScope, createFinalizeMovedNodeEdgesFast, createOptimizeMovedNodeEdgeRoutes, createShouldRunDeferredMoveOptimization, createScheduleMovedEdgeOptimization, createScheduleDeferredMovedConnectionRepair, createMoveRouteRepairSeedEdges, createLightweightMovedEndpointRoute, createPatchCachedRoutesForHighFanoutMove, createPatchCachedRoutesForBulkTranslation, createPatchCachedRoutesForWholeMove, createPatchCachedRoutesForInternalMove, createStoredRouteDirtyIdsForMove, createBuildBulkMovePlan, createCommitFastMovedGraphPatches, createUpdateMouseStatus, createUpdateMultiNodeDragOverlayTransform, createShowImperativeMultiNodeDragOverlay, createHideImperativeMultiNodeDragOverlay, createResetMultiNodeDragOverlayTransform, createBuildSingleNodeDragPreviewNodeMarkup, createClearImperativeNodeDragEdgePreview, createShowImperativeSingleNodeDragPreview, createCssSelectorEscape, createClearImperativeSingleNodeDragOriginLines, createSetImperativeSingleNodeDragOriginLines, createSetImperativeSingleNodeDragOrigin, createBindCanvasNodeElement, createHideImperativeSingleNodeDragPreview, createSingleNodeDragPreviewNodeFor, createSingleNodeDragRelevantEdges, createSingleNodeDragPreviewBounds, createSingleNodeDragEdgeTouchesBounds, createSingleNodeDragViewportLocalEdgesByScan, createSingleNodeDragScopedEdges, createSimpleOrthogonalDragPreviewPoints, createRoutableLineIdsConnectedToNodeIds, createBuildRoutableLinePreviewRoutesForNodeUpdates, createBuildRoutableLineEndpointPreviewNodeUpdates, createBuildTranslatedInternalRoutableLineDragPreviewRoutes, createBuildRoutableLineDragPreviewRoutes, createBuildCachedSingleNodeDragPreviewRoutes, createBuildDragPreviewEndpointPoints, createConnectionEndpointPreviewRoutePoints, createBuildLightweightNodeDragPreviewRoutes, createBuildLightweightNodeDragPreviewRouteMarkup, createSyncImperativeNodeDragPreviewPaths, createUpdateNodeDragLightweightEdgePreview, createSingleNodeDragInteractionNodes, createMultiNodeDragInteractionNodes, createUpdateImperativeNodeDragDropHint, createFindSingleNodeDragSnapTargetAtDelta, createFindMultiNodeDragSnapTargetAtDelta } from "./appSelectionDragFactories";
import { createUpdateSingleNodeDragImperativePreview, createStartDraggingState, createFlushConnectPreviewDom, createSetConnectPreviewDom, createApplyConnectPreviewState, createScheduleConnectPreviewPoint, createApplyRoutableLinePreviewState, createScheduleRoutableLinePreviewPoint, createReleaseRoutableLinePreviewAxisLock, createLockRoutableLinePreviewAxis, createAppendRoutableLinePreviewManualPoint, createResolveRoutableLinePreviewPoint, createResetRoutableLinePreviewState, createScheduleRewirePreviewPoint, createResetConnectPreviewState, createReleaseConnectPreviewAxisLock, createConnectSourceEndpointPoint, createLockConnectPreviewAxis, createAppendConnectPreviewManualPoint, createResolveConnectPreviewPoint, createBoundedDeltaForNodes, createBoundedDeltaForMultiNodeInteractiveMove, createNodeMoveGeometryInsideCanvas, createNearestBoundarySafeDelta, createBoundedDeltaForMoveGeometry, createCommitSafeDeltaForDraggingState, createCanvasBoundsForMovedNodeDelta, createDragBoundsForSmartAlignment, createTerminalOutflowAnchorsForSmartAlignmentDrag, createComputeSmartAlignmentSnap, createComputeNodeDragPreviewDelta, createComputeNodeDragDelta, createApplyNodeDragMove, createScheduleNodeDragMove, createFlushPendingNodeDragMove, createClearNodeDragMoveSchedule, createClearKeyboardMoveCommitSchedule, createClearKeyboardNudgeSchedule, createClearDraggingMoveState, createCancelActiveEditInteractions, createFinishDraggingMove, createFinishNodeDrag, createFinishTransformDrag, createFinishKeyboardMove, createScheduleKeyboardMoveCommit, createApplyKeyboardMoveDelta, createFlushPendingKeyboardMove, createKeyboardMoveActiveFrameDelta, createAppendPendingKeyboardMoveDelta, createScheduleKeyboardNudgeFrame, createReleaseKeyboardMoveKey, createStartKeyboardMoveSession, createNudgeSelectionByKeyboard, createMoveSelection, createUndoScopeForNodeFootprintPatch, createUpdateSelectedNode, createCommitNodeFootprintUpdates, createAssignSelectedNodesToModelLayer, createOpenLayerAssignmentDialog, createApplyLayerAssignmentDialog, createRotateSelectedLayoutUnits, createMirrorSelectedNodes, createUpdateCanvasSize, createCommitCanvasSizeDraft, createResetCanvasSizeDraft, createHandleCanvasSizeBlur, createHandleCanvasSizeKeyDown, createUpdateParam, createApplyBatchCommonParamPatch, createApplyBatchCommonParam, createApplyBatchCommonMeasurementGroupSetting, createCommitElementTreeNodeIdentity, createCommitElementTreeContainerChildParam, createTerminalVbaseFallback, createUpdateTerminalVbase, createRenderParamHeader, createRenderNodeDoubleClickDeviceParamRows, createRememberNodeDoubleClickDialogGuard, createSuppressNodeDoubleClickDialogEvent, createFinishNodeDoubleClickDialogPointerOperation, createStopNodeDoubleClickDialogEvent, createCurrentNodeDoubleClickDialogRect, createStartNodeDoubleClickDialogDrag, createStartNodeDoubleClickDialogResize, createCancelNodeDoubleClickDialog, createConfirmNodeDoubleClickDialog, createRenderNodeDoubleClickDialog, createContextMenuPlacement, createContextMenuStyle, createContextMenuClassName, createStopSidePanelEventPropagation, createSetSidePanelMode, createPointerClientTargetInside, createPointerInsideElementRect, createUpdateAutoPanelVisibility, createActivateInspectorFromCanvas, createOpenMeasurementEditorForNode, createHandleSidePanelPointerLeave, createHideAutoPanelsFromWorkspace, createAppendDistinctStaticDrawingPoint, createRenderStaticBoxDrawingPreview, createStartInteractiveStaticDrawing, createCancelInteractiveStaticDrawing, createFinishInteractiveStaticDrawing, createAppendStaticDrawingPoint, createUpdateInteractiveStaticDrawingPreview, createRenderInteractiveStaticDrawingPreview, createStartLibraryDevicePlacement, createStartLibraryGraphTemplatePlacement, createCancelLibraryPlacement, createUpdateLibraryPlacementPreview, createClearLibraryPlacementPreview, createPlaceLibraryDeviceAtPoint, createCommitLibraryPlacementAtPoint, createRenderLibraryPlacementPreview, createStartSidePanelResize, createStartCanvasResize, createStartCanvasResizeFromRightOverlay, createStartCanvasResizeFromLeftOverlay, createStartCanvasResizeFromBottomOverlay, createStartCanvasResizeFromTopOverlay, createStartStatusbarResize, createCurrentTopologyWarningPanelRect, createStartTopologyWarningPanelDrag, createStartTopologyWarningPanelResize, createRenderSidePanelModeControls, createRenderSidePanelEdgeTrigger, createNormalizeStaticBoxDimension, createToLocalNodePoint, createSingleTransformNodeUpdate, createSignedScaleFromRotatedHandleDelta, createSignedScaleFromUprightHandleDelta, createProportionalSignedScaleFromHandleDelta, createProportionalSignedScaleFromUprightHandleDelta, createCurrentStoredRoutePointsForEdge, createBuildMirrorLayoutUnitEdgeUpdates, createBuildRotateLayoutUnitEdgeUpdates, createBuildGroupTransformEdgeUpdates, createOverlayEdgeUpdatesForTransform, createStartGroupTransformDrag, createStartSingleTransformDrag, createStartGroupMoveDrag, createBuildGroupTransformNodeUpdates, createRotateLayoutUnitNodeUpdates, createMirrorLayoutUnitNodeUpdates, createBusAnchorFromEvent, createBusAnchorFromPoint, createIsPointOnBus, createIsPointNearBus, createFindRewireTargetAtPoint, createFindConnectTargetAtPoint, createFindRoutableLineEndpointTargetAtPoint } from "./appCanvasInteractionFactories";
import { createCommitRoutableLineDevice, createStartRoutableLineFromTerminal, createFinishRoutableLineToTarget, createUpdateRoutableLineEndpointDrag, createStartRoutableLineEndpointDrag, createFinishRoutableLineEndpointDrag, createCommitNewConnectionEdge, createFinishConnectToTarget, createFinishRewiring, createHandleDrop, createHandleRoutableLineNodePointerDown, createHandleNodePointerDown, createHandleRoutableLineNodePathPointerDown, createHandlePointerMove, createFinishCanvasPanning, createStartCanvasPanning, createHandleCanvasPointerDownCapture, createClientPointInsideRenderedCanvas, createFocusCanvasKeyboardShortcutHost, createWheelZoomAnchorFromClient, createFlushPendingWheelZoom, createScheduleWheelZoom, createZoomCanvasFromWheelEvent, createHandleWheel, createDeleteSelected, createRunContextMenuAction, createReadjustMovedBusConnectionRoutes, createReadjustActiveLayerBusEndpointRoutes, createCleanupStaleConnectionRoutes, createCommitLayoutNodePositions, createApplySelectedNodeLayout, createAutoSpreadCanvasGraphics, createAutoAlignCanvasGraphics, createDefaultVoltageBaseSetValue, createRecommendedVoltageBaseSetMode, createDefaultVoltageBaseTerminalValues, createDefaultVoltageBaseTerminalKey, createActiveVoltageBaseTerminalValues, createSetVoltageBaseTerminalValue, createMergeVoltageBaseSetResults, createVoltageBaseSetReady, createVoltageBaseSetResultForScope, createOpenVoltageBaseSetDialog, createConfirmVoltageBaseSetDialog, createOpenVoltageBaseClearDialog, createConfirmVoltageBaseClearDialog, createConnectionRedrawViewportBounds, createConnectionRedrawEdgeIdsForScope, createConnectionRedrawLineNodeIdsForScope, createConnectionRedrawTargetsForScope, createRedrawConnectionRoutes, createOpenConnectionRedrawDialog, createConfirmConnectionRedrawDialog, createAlignSelected, createDistributeSelected, createToggleSchemeExpanded, createPromptUniqueRecordName, createCloneProjectRecordForPaste, createSchemePathForScheme, createSchemePathForProject, createSchemePathForRecord, createCloneSchemeRecord, createCloneSchemeRecordWithName, createCloneSchemeRecordForPaste, createClearActiveProjectDisplay, createLoadSavedProject, createLoadSavedProjectRecord, createOpenProjectFromUrl, createRequestUnsavedChangeAction, createRequestLoadSavedProject, createResolveUnsavedChangeAction, createCreateSchemeRecord, createRenameSchemeRecord, createDuplicateSchemeRecord, createDeleteSchemeRecord, createCopySelectedRecord, createDeleteSelectedRecords, createCopyProjectRecord, createCopySchemeRecord, createPasteSchemeClipboardRecord, createPasteProjectClipboardRecord, createPasteSelectedRecord, createCommitProjectRecordMove, createResolveRecordPasteConflict, createMoveProjectRecordToScheme, createMoveSchemeRecordToScheme, createMoveSchemeRecordToPosition, createSaveActiveProjectPointer, createSetActiveLayer, createNextDefaultModelLayerName, createAddModelLayer, createClearLayerNameDraft, createCommitModelLayerName, createHandleLayerNameInputKeyDown, createToggleModelLayerVisibility, createSetAllModelLayersVisibility, createMoveModelLayer, createDeleteModelLayer, createRenderDeviceDefinitionMeasurementPanel, createRenderMeasurementConfigDialog, createRenderMeasurementEditorDialog, createSaveCurrentProject, createRenameProjectRecord, createDuplicateProjectRecord, createDuplicateSelectedProjectRecords, createDuplicateSelectedSchemeRecords, createDeleteProjectRecord, createCreateBlankProject, createLocateTopologyError, createRunTopologyCalculation, createGetEdgeEndpointPoint, createCenterViewOnPoint, createViewportCenterAnchorForPoint, createSetViewBoxAtViewportCenter, createCenterViewBoxOnPoint, createCenterViewOnPointAtZoom, createZoomViewportAtCenter, createResetViewportZoom, createFitWholeCanvasToFrame, createFitWholeCanvasFromBlankDoubleClick, createFitViewToBounds, createFitViewToContent, createFocusElementTreeItem, createJumpToElementTreeItem, createOpenElementTreeItemContextMenu, createSetEdgeManualPoints, createRouteManualPoints, createFinishManualPathDrag, createTidySelectedEdgeRoute, createTidyRoutableLineRoute } from "./appProjectCanvasFactories";
import { createOpenEdgeContextMenu, createCaptureCanvasPointer, createStartManualSegmentDrag, createStartManualPointDrag, createRouteSegmentPointerDistance, createFindEditableRouteSegmentIndex, createConnectionHitTolerance, createFindConnectionRouteHitAtPoint, createInsertManualBendAtPoint, createInsertManualBendFromPointer, createAddManualBendFromContextMenu, createAddRoutableLineBendFromContextMenu, createInsertManualBendFromEdgePath, createHandleEdgePathPointerDown, createDeleteManualBendPoint, createSetRoutableLineManualPathPoints, createInsertRoutableLineBendAtPoint, createInsertRoutableLineBendFromPointer, createStartRoutableLineSegmentDrag, createStartRoutableLinePointDrag, createDeleteRoutableLineBendPoint, createStartConnectFromTerminal, createFinishTerminalPress, createHandleTerminalPointerDown, createEnsureSavedBeforeExport, createSvgExportReferencedImageHrefById, createLoadSvgImageExportPathById, createExportSvg, createExportEFile, createExportSvgFile, createExportJsonFile, createExportEDeviceDefinitionFile, createImportEDeviceDefinitionFile, showStandaloneExportCompletion as showStandaloneExportCompletionImpl, createIsProjectFilePayload, createCreateImportedSchemeRecord, createExportProjectRecordFile, createExportCurrentModelFile, createOpenModelImportFilePicker, createOpenSchemeImportFilePicker, createMergeImportedSchemeIntoExisting, createCommitImportedSchemeRecord, createApplyBackendSchemeArchiveImport, createImportSchemeFile, createCommitImportedModelRecord, createImportModelFile, createResolveDuplicateSchemeImport, createResolveDuplicateModelImport, createExportSchemeRecord, createChooseImage, createApplyExistingImage, createApplyIconLibraryCatalogIcon, createClearSelectedImage, createClearSelectedImageForNode, createCreateImageFolder, createRenameImageFolder, createDeleteImageFolder, createStartProjectRecordDrag, createFinishProjectRecordDrag, createStartProjectTreeSortDrag, createEndProjectTreeSortDrag, createHandleProjectTreeDragLeave, createHandleProjectTreeDragOver, createHandleProjectTreeDrop, createStartSchemeRecordDrag, createFinishSchemeRecordDrag, createRenderProjectSchemeNode, createOpenBlankProjectLibraryContextMenu, createCustomDeviceDefaultStateVisualDraft, createSnapCustomDeviceTerminalAnchor, createCustomDeviceTerminalConnectorSegment, createUpdateCustomDeviceTerminalAnchor, createUpdateCustomDeviceStateDraftRow, createAddCustomDeviceStateDraftRow, createDeleteCustomDeviceStateDraftRow, createUpdateCustomDeviceTerminalAnchorFromPreview, createDefinitionDefaultStateVisualDraft, createSnapDefinitionTerminalAnchor, createDefinitionTerminalConnectorSegment, createUpdateDefinitionTerminalAnchor, createUpdateDefinitionTerminalAnchorFromPreview, createLoadDefinitionTemplateDraft, createFinishDeviceLibraryDialogPointerOperation, createCurrentDeviceLibraryDialogRect, createDeviceLibraryDialogStyle, createStartDeviceLibraryDialogDrag, createStartDeviceLibraryDialogResize, createStopDeviceLibraryDialogEvent, createOpenDeviceDefinitionDialog, createCloseDeviceDefinitionDialog, createCloseCustomDeviceDialog, createRequestCloseCustomDeviceDialog, createSetCustomDeviceDraftCleanBaseline, createCustomDeviceDraftHasUnsavedChanges, createRequestCustomDeviceDraftAction, createResolveCustomDeviceUnsavedPrompt, createRequestCustomDeviceDialogView, createRevertCustomDeviceDraftCurrentTab, createRevertCustomDeviceDraftAll, createToggleDefinitionGroup, createToggleDefinitionComponentLibrary, createToggleElementTreeGroup, createToggleElementTreeDeviceGroup, createUpdateDefinitionDraftRow, createAddDefinitionDraftRow, createDeleteDefinitionDraftRow, createUpdateDefinitionStateDraftRow, createAddDefinitionStateDraftRow, createDeleteDefinitionStateDraftRow, createUpdateSelectedDefinitionResizePermission, createSaveDeviceDefinitionStateVisualDraft, createSaveDeviceDefinitionVisualDraft, createSaveDeviceDefinitionDraft, createResetDeviceDefinitionDraft, createUpdateDefinitionComponentLibraryCommonParamExport, createUpdateCustomDraftTerminalCount, createChooseCustomDeviceBackground, createChooseDefinitionTemplateIcon, createChooseStateVisualImage, createChooseStateIconDrawingImport, createUpdateStateIconDrawingElement, createUpdateStateIconDrawingElements, createStateIconDrawingPointer, createStateIconDrawingSelection, createComputeStateIconDrawingSmartAlignmentSnap, createStartStateIconDrawingDrag, createDragStateIconDrawingSelection, createStopStateIconDrawingDrag, createDeleteSelectedStateIconDrawingElements, createStateIconDrawingKeyDown, createAddStateIconDrawingElement, createDeleteStateIconDrawingElement, createOpenStateIconDrawingDialog, createApplyStateIconDrawingDialog, createEnsureCustomComponentTreeExpanded, createCancelPendingCustomComponentTemplateLoad, createSelectCustomCategoryLibrary, createSelectCustomComponentLibrary, createSelectCustomComponentTemplate, createStartCustomComponentCreate, createCopyCustomComponentTemplate, createPasteCustomComponentTemplate, createExportCustomComponentTemplateSvg, createOpenCustomComponentSvgImport, createImportCustomComponentSvg, createConfirmCustomLibraryCreateDialog, createNextCustomCategoryLibraryName, createCreateCustomCategoryLibrary, createDeleteCustomCategoryLibrary, createNextCustomComponentLibraryName, createCreateCustomComponentLibrary, createDeleteCustomComponentLibrary, createRenameSelectedCustomDeviceTreeItem, createDeleteSelectedCustomDeviceTreeItem, createNextCustomTemplateKind, createSaveCustomDeviceTemplate, createSaveBuiltinDeviceDefinitionFromCustomDraft, createSaveComponentLibraryDefinition, createSaveCustomDeviceDefinitionDialog, showStandaloneExportCompletion } from "./appDeviceDefinitionFactories";
import { createRenderStateVisualPager, createRenderDeviceDefinitionVisualPanel, createRenderGraphTemplatePreview, createRenderLibraryTemplateButton, createRenderLibraryFlyout, createLodNodeFromEvent, createLodTerminalIdFromEvent, createHandleLodNodePointerDown, createHandleLodNodeContextMenu } from "./appDeviceDefinitionRenderers";
import { createOpenNodeDoubleClickEditor, createJumpToAssociatedModel, createHandleLodNodeDoubleClick, createClampFloatingToolbarPosition, createToolbarOverlapArea, createCanvasRectToSurfaceCssRect, createRotateControlAvoidRectFromCanvasPoints, createPlaceFloatingToolbar, createRenderMeasurementGroup, createHandleMinimapNavigate, createCenterSelectedInView, createFitViewToSelection, createClearStaticButtonFeedbackTimer, createSetStaticButtonFeedback, createClearStaticButtonFeedback, createBeginStaticButtonPointerFeedback, createResolveStaticButtonTargetProject, createExecuteStaticButtonCommand, createExecuteStaticButtonAction, createHandleStaticButtonClick, createBeginReadonlyBackgroundStaticButtonPointerFeedback, createRenderReadonlyBackgroundPage, createOpenTopologyWarningPanel, createAppHookCallback77, createAppHookCallback78, createAppHookCallback79, createAppHookCallback80, createAppHookCallback81, createAppHookCallback82, createAppHookCallback83, createAppHookCallback84, createAppHookCallback85, createAppHookCallback86, createAppHookCallback87, createAppHookCallback88, createAppHookCallback89, createAppHookCallback90, createAppHookCallback91, createAppHookCallback92, createAppHookCallback93, createAppHookCallback94, createAppHookCallback95, createAppHookCallback96, createAppHookCallback97, createAppHookCallback98, createAppHookCallback99, createAppHookCallback100, createAppHookCallback101, createAppHookCallback102, createAppHookCallback103, createAppHookCallback104, createAppHookCallback105, createAppHookCallback106, createAppHookCallback107, createAppHookCallback108, createAppHookCallback109, createAppHookCallback110, createAppHookCallback111, createAppHookCallback112, createAppHookCallback113, createAppHookCallback114, createAppHookCallback115, createAppHookCallback116, createAppHookCallback117, createAppHookCallback118, createAppHookCallback119, createAppHookCallback120, createAppHookCallback121, createAppHookCallback122, createAppHookCallback123, createAppHookCallback124, createAppHookCallback125, createAppHookCallback126, createAppHookCallback127, createAppHookCallback128, createAppHookCallback129, createAppHookCallback130, createAppHookCallback131, createAppHookCallback132, createAppHookCallback133, createAppHookCallback134, createAppHookCallback135, createAppHookCallback136, createAppHookCallback137, createAppHookCallback138, createAppHookCallback139, createAppHookCallback140, createAppHookCallback141, createAppHookCallback142 } from "./appToolbarHookFactories";
import { mergeBuiltinSharedIconAssets } from "../sharedIconLibrary";
import { staticConnectorDrawingNeedsExplicitFinish, staticConnectorDrawingPath } from "../staticConnectorCurves";
import { createProgrammaticAddDevice, createProgrammaticCreateScheme, createProgrammaticCreateBlankProject, createProgrammaticSelectDevices, createProgrammaticGroupSelected, createProgrammaticDeleteDevices, createProgrammaticUpdateDeviceProperty, createProgrammaticSave, createProgrammaticSaveSelectionAsTemplate, createProgrammaticSwitchSpace, createProgrammaticSwitchModel, createProgrammaticTopologyOperation } from "./appControlFactories";
import {
  ICON_LIBRARY_PAGE_SIZE,
  fetchIconLibraryCatalog,
  fetchIconLibraryManifest,
  flattenIconLibraryManifest,
} from "../iconLibraryCatalog";
import { imagePickerUsesLibraryTabs } from "./appView";
import { apiPath } from "../config";
// 本文件引用了却从未 import 的类型（此前被 @ts-nocheck 遮住）：按真实出处补齐，均为 type-only import。
import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type {
  CanvasSelectionSnapshot,
  ConnectTarget,
  DeviceDefinitionMeasurementPanelTarget,
  DeviceLibraryDialogKind,
  DraggingState,
  FilterSelectionTypeOption,
  GraphDirtyBaseline,
  GroupTransformEdgeRouteSnapshot,
  GroupTransformNodeSnapshot,
  RenderViewportBounds,
  SingleTransformDrag,
  StateIconDrawingTarget,
  StaticDrawingState,
  UndoGraphPatchScope,
  UndoSnapshot
} from "./appCoreCanvasUtilities";
import type { LibraryPackagePayload } from "./appPersistenceLibraryExport";
import type { CustomDeviceDraft, CustomParamDraft, DeviceDefinitionDraftRow, DeviceDefinitionVisualDraft, ImageAsset, StateIconDrawingDialogState } from "./appCoreCanvasUtilities";
import type { IconLibraryCatalogLibrary } from "../iconLibraryCatalog";

// 量测编辑组 id 的随机源。默认实现**逐字等价**于原先内联的 `Math.random()`：
// 读取时机仍是调用那一刻（这里每次调用都重新查一次 Math.random），
// 所以外部对 Math.random 的打桩照旧生效。
// 收敛成具名依赖的意义：以前要固定这个 id 只能整体替换 createMeasurementEditorGroupId
// （连带把 Date.now() 那半截也换掉），现在可以只钉住随机项。
export function randomSource(): number {
  return Math.random();
}

// 量测编辑组 id。这**不是**"视觉抖动/临时 id"，产出的就是 MeasurementGroup.id：
//   ① 组壳 id 经 createMeasurementEditorGroupForPosition 进 measurementEditorDialog.drafts；
//   ② confirmMeasurementEditorDialog 用 cloneMeasurementGroupForDraft({ ...group }) 展开，
//      `...group` 原样带走 id（该克隆函数不重写 id），随即 updateProjectMeasurementsWithUndo
//      落进 projectMeasurements；
//   ③ measurements.reconcileProjectMeasurementsWithConfig 对「非规范 id」逐字放行
//      （id !== canonicalMeasurementGroupId 时直接 push），随机后缀不会被规范化掉；
//   ④ 故它进持久化状态（model-routing 的 normalizeProjectMeasurements / 落盘方案与工程）
//      与 runtimeSnapshot.buildSnapshot 的 measurements 输出，并作为 DOM 的
//      data-export-measurement-group-id 与 React key 参与渲染。
// 同输入产出不同 id，测试只能靠 mock 掩盖，故随机源必须可注入（默认行为不变）。
export function createMeasurementEditorGroupId(
  nodeId: string,
  terminalId?: string,
  random: () => number = randomSource
): string {
  return `measurement-${nodeId}${terminalId ? `-${terminalId}` : ""}-group-${Date.now().toString(36)}-${random().toString(36).slice(2, 6)}`;
}

export function useRenderBatch(__appScope: Record<string, any>) {
  // 跨渲染帧稳定工厂缓存（零 Proxy 普通对象模式）：710 个纯延迟工厂仅创建一次，零 V8 Proxy 慢路径惩罚
  const __stableFactoryStoreRef = useRef<StableFactoryStore | null>(null);
  const __stableFactories = ensureStableFactoryStore(__stableFactoryStoreRef, __appScope);
  const __s = <TResult,>(key: string, factory: (scope: Record<string, unknown>) => TResult) =>
    getOrCreateStableFactory(__stableFactories, key, factory);
  const {
    activeImageFolderId,
    activeLayerEdgeIdSet,
    activeLayerEdges,
    activeLayerGroups,
    activeLayerId,
    activeLayerNodeIdSet,
    activeLayerNodes,
    activeProjectKey,
    activeSchemeKey,
    activeSelectedEdgeIds,
    activeSelectedEdgeSet,
    activeSelectedNodeIds,
    activeVoltageBaseTerminalKey,
    allowAutoExpandCanvas,
    applyCanvasBounds,
    backendMeasurementConfigLoadedRef,
    backgroundLayerIds,
    backgroundPageRenderReady,
    backgroundProjectId,
    backgroundProjectRecord,
    batchCommonGraphicParamRows,
    batchCommonMeasurementGroupRows,
    batchCommonModelParamRows,
    batchCommonPropertyRowCount,
    canAddTemplateFromSelection,
    canGroupSelectedGraphics,
    canUngroupSelectedGraphics,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasBackgroundImageAssetId,
    canvasBackgroundImageFit,
    canvasBounds,
    canvasCenterRequest,
    canvasClipboard,
    canvasDisplayOffsetX,
    canvasDisplayOffsetY,
    canvasHeight,
    canvasRenderBounds,
    canvasResizeDrag,
    canvasScrollScale,
    canvasSelectionScope,
    canvasVisibleViewBox,
    canvasWidth,
    clearLibraryFlyoutCloseTimer,
    collapsedExpandedModeCategoryLibraries,
    collapsedExpandedModeComponentLibraries,
    colorDisplayMode,
    colorPalette,
    componentLibraryDisplayMode,
    connectDropReady,
    connectPreviewDomRef,
    connectSource,
    connectTargetPoint,
    contextMenu,
    currentUnit,
    customCategoryLibraries,
    customComponentLibraries,
    customComponentTreeSelection,
    customDeviceDefinitionMode,
    customDeviceDialogOpen,
    customDeviceDialogRef,
    customDeviceDialogView,
    customDeviceDraft,
    customDeviceStatePageId,
    customDeviceTemplates,
    customGraphTemplateTypes,
    customGraphTemplates,
    definitionStateDraftRows,
    definitionStatePageId,
    definitionVisualDraft,
    deviceDefinitionDialogOpen,
    deviceDefinitionDialogRef,
    deviceDefinitionOverrides,
    deviceDefinitionView,
    deviceIndexCounters,
    deviceLibraryDialogDrag,
    deviceLibraryDialogResize,
    displaySelectedEdgeIds,
    displaySelectedNodeIds,
    displayedCategoryLibraries,
    displayedGraphTemplateTypes,
    dragGhostEdgeIdSet,
    dragGhostRoutableLineNodeIdSet,
    dragOverlayEdgeIdSet,
    dragging,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionLabels,
    eDeviceDefinitionTableIds,
    eDeviceDefinitionTemplateFields,
    edgeById,
    edges,
    editHotInteractionActive,
    editingCustomDeviceKind,
    expandedCategoryLibraries,
    expandedCategoryLibraryComponentLibraries,
    expandedGraphTemplateTypes,
    filterSelectionTypeKeys,
    filteredCategoryLibraryByComponentLibrary,
    filteredGroupedGraphTemplates,
    focusedGroupedNodeMovesGroup,
    graphStore,
    groupedCategoryLibraryByComponentLibrary,
    groupedGraphTemplates,
    groupTransformPreviewEdgeIdSet,
    groupTransformPreviewNodeIdSet,
    groups,
    hasUnsavedChanges,
    hideLibraryFlyout,
    hoveredCategoryLibrary,
    hoveredCategoryLibraryComponentLibrary,
    hoveredGraphTemplateType,
    iconLibraryPicker,
    imageAssetContextMenu,
    imageAssetList,
    imageAssets,
    imageFolders,
    imagePickerSourceFilter,
    imageTarget,
    interfaceCustomization,
    includeMeasurementGroupBounds,
    initialCanvasDetailHydrationLimit,
    initialCanvasLodActive,
    inspectorSelectedNode,
    inspectorTopologyErrors,
    isEditMode,
    isObjectRecord,
    isStaticButtonEnabledForNode,
    lastPersistedMeasurementConfigPayloadRef,
    layerAssignmentTargetId,
    layers,
    leftPanelMode,
    leftPanelRef,
    leftPanelTab,
    leftPanelWidth,
    libraryComponentListRefKey,
    libraryFlyoutPositions,
    libraryPackageDialogMode,
    libraryPackageDialogScope,
    libraryPackageImportInputRef,
    libraryPackageImportScopeRef,
    libraryPlacement,
    libraryPreviewByKind,
    libraryScrollRef,
    librarySearchNeedle,
    librarySearchQuery,
    libraryTemplateByKind,
    libraryTemplates,
    libraryTreeDragKey,
    libraryTreeDropKey,
    libraryTreeOrder,
    manualPathDrag,
    marquee,
    measurementConfig,
    runtimeMeasurementConfig,
    measurementConfigDialogOpen,
    measurementConfigDialogRef,
    measurementConfigDraft,
    measurementConfigDraftRef,
    measurementEditorDialogRef,
    measurementTypeById,
    minimapSamplingReady,
    mode,
    modifierSelectionPress,
    multiNodeDragging,
    nodeById,
    nodeDoubleClickDialogDrag,
    nodeDoubleClickDialogResize,
    nodeDoubleClickDraft,
    nodeDragMoveFrameRef,
    nodeForegroundImage,
    nodeImage,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    nodes,
    panning,
    pointerButtonsPressed,
    projectTreeDragKey,
    projectTreeDropKey,
    pendingNodeDragMoveRef,
    points,
    powerBaseValue,
    powerUnit,
    projectById,
    projectMeasurements,
    projectName,
    projectPanelResize,
    recordClipboard,
    rewiring,
    rightPanelMode,
    rightPanelRef,
    rightPanelVisible,
    rightPanelWidth,
    routableLineEndpointDrag,
    subcontrolarea,
    substation,
    feeder,
    modelType,
    taiqu,
    routableLinePlacement,
    routedEdgeById,
    routedEdges,
    safeFilePart,
    sameConnectTarget,
    sameOptionalPoint,
    sameOptionalPointList,
    saveRequired,
    scheduleGraphTemplateFlyoutClose,
    scheduleLibraryFlyoutClose,
    schemes,
    selectedCustomComponentTemplate,
    selectedCustomMeasurementRowIndexes,
    selectedDefinitionKind,
    selectedDefinitionTemplate,
    selectedEdge,
    selectedEdgeId,
    selectedEdgeIds,
    selectedLayoutUnits,
    selectedNode,
    selectedNodeCount,
    selectedNodeId,
    selectedNodeIdSet,
    selectedNodeIds,
    selectedNodeIdsWithMeasurementGroups,
    selectedProjectId,
    selectedProjectIds,
    selectedRoutedEdge,
    selectedSchemeId,
    selectedSchemeIds,
    selectedTransformGroupUnit,
    serializeSchemeRecordForFile,
    setActiveImageFolderId,
    setCollapsedExpandedModeCategoryLibraries,
    setComponentLibraryDisplayMode,
    setConnectSource,
    setContextMenu,
    setCustomCategoryLibraries,
    setCustomComponentLibraries,
    setCustomDeviceDraft,
    setSelectedCustomMeasurementRowIndexes,
    setCustomDeviceTemplates,
    setCustomGraphTemplateTypes,
    setCustomGraphTemplates,
    setDefinitionVisualDraft,
    setDeviceDefinitionOverrides,
    setEDeviceDefinitionClassExportEnabled,
    setEDeviceDefinitionFieldOrder,
    setEDeviceDefinitionLabels,
    setEDeviceDefinitionTableIds,
    setEDeviceDefinitionTemplateFields,
    setExpandedCategoryLibraries,
    setExpandedGraphTemplateTypes,
    setGraphArrays,
    setHoveredCategoryLibrary,
    setHoveredCategoryLibraryComponentLibrary,
    setHoveredGraphTemplateType,
    setIconLibraryPicker,
    setImageAssetContextMenu,
    setImageAssetList,
    setImageAssets,
    setImageFolders,
    setLibraryComponentLibraryHeaderRef,
    setLibraryComponentListRef,
    setLibraryPackageDialogOpen,
    setLibraryPackageDialogMode,
    setLibraryPackageDialogScope,
    setLibrarySearchQuery,
    setLibraryTreeDragKey,
    setLibraryTreeDropKey,
    setLibraryTreeOrder,
    setMeasurementConfig,
    setMeasurementConfigDraft,
    setMeasurementConfigSaveStatus,
    setNodeDoubleClickDraft,
    setProjectMenu,
    setStateIconDrawingContextMenu,
    setStateIconDrawingDialog,
    setTemplateLibraryDisplayMode,
    setTemplateLibrarySearchQuery,
    setTemplateMenu,
    shiftCachedRoutesForCanvasOrigin,
    shouldDeferSingleNodeTerminalReconciliation,
    shouldFinalizeMovedNodeEdgesSynchronously,
    shouldPatchRouteCacheForHighFanoutMove,
    sidePanelResize,
    stateIconDrawingDialog,
    stateIconDrawingHistoryRef,
    stateIconDrawingInitialFrame,
    stateIconDrawingInitialImageRef,
    staticDrawing,
    statusbarHeight,
    statusbarResize,
    templateLibraryDisplayMode,
    templateLibrarySearchNeedle,
    templateLibrarySearchQuery,
    terminalPress,
    terminalPressPreviewEdgeIdSet,
    timestampForLibraryPackageFilename,
    toggleCategoryLibrary,
    toggleCategoryLibraryComponentLibrary,
    topology,
    topologyErrors,
    topologyStatus,
    topologyWarningDisplayMessage,
    topologyWarningPanelClosed,
    topologyWarningPanelDrag,
    topologyWarningPanelHeight,
    topologyWarningPanelPosition,
    topologyWarningPanelResize,
    topologyWarningPanelWidth,
    transformDrag,
    translateEdgeBy,
    translateNodeBy,
    userCustomizationSnapshotView,
    viewBox,
    viewportNodes,
    viewportRoutedEdges,
    visibleNodeById,
    visibleNodes,
    voltageBaseClearDialogOpen,
    voltageBaseSetDialogOpen,
    voltageBaseSetMode,
    voltageBaseSetValue,
    voltageBaseTerminalValues,
    voltageUnit
  } = __appScope;
  const { customMeasurementSelectionAnchorRef } = __appScope;
  const refreshSchemesFromBackendDirectory = __s("refreshSchemesFromBackendDirectory", createRefreshSchemesFromBackendDirectory);
  const handleBackendSchemeMutationFailure = __s("handleBackendSchemeMutationFailure", createHandleBackendSchemeMutationFailure);
  const saveSchemeTreeToBackend = __s("saveSchemeTreeToBackend", createSaveSchemeTreeToBackend);
  const persistSchemeTreeToBackend = __s("persistSchemeTreeToBackend", createPersistSchemeTreeToBackend);
  const replaceSchemeTreeInBackend = __s("replaceSchemeTreeInBackend", createReplaceSchemeTreeInBackend);
  Object.assign(__appScope, { refreshSchemesFromBackendDirectory, handleBackendSchemeMutationFailure, saveSchemeTreeToBackend, persistSchemeTreeToBackend, replaceSchemeTreeInBackend });
  useEffect(createAppHookCallback77(__appScope), []);
  useEffect(createAppHookCallback78(__appScope), []);
  useEffect(createAppHookCallback79(__appScope), []);
  useEffect(createAppHookCallback80(__appScope), []);
  useEffect(createAppHookCallback81(__appScope), [schemes]);
  useEffect(createAppHookCallback82(__appScope), [customDeviceTemplates, customCategoryLibraries, customComponentLibraries, deviceDefinitionOverrides, eDeviceDefinitionLabels, eDeviceDefinitionClassExportEnabled, eDeviceDefinitionFieldOrder, customGraphTemplateTypes, customGraphTemplates]);
  useEffect(createAppHookCallback83(__appScope), [colorDisplayMode, colorPalette]);
  const refreshImageFolders = () =>
      fetchBackendImageFolders()
        .then((folders) => {
          setImageFolders(folders.length > 0 ? folders : [{ id: "root", name: "默认文件夹", imageCount: 0 }]);
        })
        .catch(() => {
          // 后端不可用时保留当前文件夹状态。
        });
  Object.assign(__appScope, { refreshImageFolders });
  const refreshImagesForFolder = (folderId = activeImageFolderId) =>
      fetchBackendImages(folderId)
        .then((assets) => {
          const mergedAssets = mergeBuiltinSharedIconAssets(assets);
          setImageAssetList(mergedAssets);
          setImageAssets((current: string[]) => ({ ...current, ...imageAssetsToMap(mergedAssets) }));
        })
        .catch(() => {
          // 后端不可用时保留浏览器本地图片，避免影响画布编辑。
        });
  Object.assign(__appScope, { refreshImagesForFolder });
  const deleteImageAssetFromContextMenu = async () => {
      const menu = imageAssetContextMenu;
      if (!menu) {
        return;
      }
      const asset = imageAssetList.find((item: ImageAsset) => item.id === menu.assetId);
      const assetName = asset?.name || asset?.filename || menu.assetId;
      if (!await showGlobalConfirm(`确定删除”${assetName}”吗？如果该图片已被图元引用，删除后对应图元可能无法继续显示该图片。`)) {
        setImageAssetContextMenu(null);
        return;
      }
      void (async () => {
        try {
          await deleteBackendImageAsset(menu.assetId);
          setImageAssetList((current: ImageAsset[]) => current.filter((item: ImageAsset) => item.id !== menu.assetId));
          setImageAssets((current: ImageAsset[]) => {
            if (!(menu.assetId in current)) {
              return current;
            }
            const next = { ...current };
            delete next[menu.assetId];
            return next;
          });
          setImageAssetContextMenu(null);
          void refreshImageFolders();
        } catch (error) {
          showGlobalMessage(error instanceof Error ? error.message : "删除图片资源失败。");
        }
      })();
    };
  Object.assign(__appScope, { deleteImageAssetFromContextMenu });
  useEffect(createAppHookCallback84(__appScope), [activeImageFolderId, imageTarget]);
  // 直接在本地计算 imagePickerUsesIconSourcesCatalog，避免依赖 __appScope 的重建
  const imagePickerUsesIconSources = imageTarget?.kind === "canvasIcon" || (imageTarget?.kind === "stateIconDrawing" && imageTarget?.sourceMode !== "catalogOnly");
  const imagePickerActiveSourceFilter = imagePickerUsesIconSources
    ? imageTarget?.sourceMode === "externalOnly"
      ? "external"
      : imageTarget?.sourceMode === "builtinOnly"
        ? "builtin"
        : imageTarget?.sourceMode === "catalogOnly"
          ? "catalog"
          : imagePickerSourceFilter === "external" ? "external" : imagePickerSourceFilter === "catalog" ? "catalog" : "builtin"
    : "builtin";
  const imagePickerUsesIconSourcesCatalog = imagePickerUsesIconSources && imagePickerActiveSourceFilter === "catalog";
  const iconLibraryPickerOpen =
    (imageTarget?.kind === "stateIconDrawing" && imageTarget.sourceMode === "catalogOnly") ||
    (imagePickerUsesLibraryTabs(imageTarget) && imagePickerSourceFilter === "icon-library") ||
    imagePickerUsesIconSourcesCatalog;
  Object.assign(__appScope, { iconLibraryPickerOpen });
  useEffect(() => {
    if (!iconLibraryPickerOpen) {
      return;
    }
    setIconLibraryPicker((current: Record<string, any>) => ({
      ...current,
      selectedLibraryId: current.catalog?.libraries?.some((library: { id: string }) => library.id === current.selectedLibraryId)
        ? current.selectedLibraryId
        : current.catalog?.libraries?.[0]?.id ?? current.selectedLibraryId,
      selectedCategoryKey: "",
      searchQuery: "",
      visibleCount: ICON_LIBRARY_PAGE_SIZE
    }));
  }, [iconLibraryPickerOpen]);
  useEffect(() => {
    if (!iconLibraryPickerOpen || iconLibraryPicker.catalog) {
      return;
    }
    let cancelled = false;
    setIconLibraryPicker((current: Record<string, any>) => ({
      ...current,
      status: "loading",
      error: ""
    }));
    void fetchIconLibraryCatalog()
      .then((catalog) => {
        if (cancelled) {
          return;
        }
        const selectedLibraryId = catalog.libraries.some((library) => library.id === iconLibraryPicker.selectedLibraryId)
          ? iconLibraryPicker.selectedLibraryId
          : catalog.libraries[0]?.id ?? "";
        setIconLibraryPicker((current: Record<string, any>) => ({
          ...current,
          status: "ready",
          error: "",
          catalog,
          selectedLibraryId,
          selectedCategoryKey: "",
          visibleCount: ICON_LIBRARY_PAGE_SIZE
        }));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setIconLibraryPicker((current: Record<string, any>) => ({
          ...current,
          status: "error",
          error: error instanceof Error ? error.message : "读取分类图标库失败。"
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [iconLibraryPicker.catalog, iconLibraryPicker.selectedLibraryId, iconLibraryPickerOpen]);
  useEffect(() => {
    const catalog = iconLibraryPicker.catalog;
    if (!iconLibraryPickerOpen || !catalog) {
      return;
    }
    const requestedLibraryIds = iconLibraryPicker.selectedLibraryId
      ? [iconLibraryPicker.selectedLibraryId]
      : catalog.libraries.map((library: { id: string }) => library.id);
    const loadedIds = new Set(iconLibraryPicker.loadedLibraryIds);
    const loadingIds = new Set(iconLibraryPicker.loadingLibraryIds);
    const missingLibraries = requestedLibraryIds
      .map((libraryId: string) => catalog.libraries.find((library: { id: string }) => library.id === libraryId))
      .filter((library: { id: string }): library is NonNullable<typeof library> => Boolean(library && !loadedIds.has(library.id) && !loadingIds.has(library.id)));
    if (missingLibraries.length === 0) {
      return;
    }
    const missingIds = missingLibraries.map((library: { id: string }) => library.id);
    setIconLibraryPicker((current: Record<string, any>) => ({
      ...current,
      status: "loading",
      error: "",
      loadingLibraryIds: Array.from(new Set([...current.loadingLibraryIds, ...missingIds]))
    }));
    void Promise.all(
      missingLibraries.map(async (library: IconLibraryCatalogLibrary) => ({
        library,
        icons: flattenIconLibraryManifest(await fetchIconLibraryManifest(library), library)
      }))
    )
      .then((loadedGroups) => {
        setIconLibraryPicker((current: Record<string, any>) => {
          const nextEntriesById = new Map(current.entries.map((entry: { id: string }) => [entry.id, entry] as const));
          for (const group of loadedGroups) {
            for (const icon of group.icons) {
              nextEntriesById.set(icon.id, icon);
            }
          }
          const loadedIdSet = new Set(current.loadedLibraryIds);
          for (const group of loadedGroups) {
            loadedIdSet.add(group.library.id);
          }
          const loadingIdSet = new Set(current.loadingLibraryIds);
          for (const id of missingIds) {
            loadingIdSet.delete(id);
          }
          return {
            ...current,
            status: "ready",
            error: "",
            entries: Array.from(nextEntriesById.values()),
            loadedLibraryIds: Array.from(loadedIdSet),
            loadingLibraryIds: Array.from(loadingIdSet)
          };
        });
      })
      .catch((error) => {
        setIconLibraryPicker((current: Record<string, any>) => ({
          ...current,
          status: "error",
          error: error instanceof Error ? error.message : "读取分类图标清单失败。",
          loadingLibraryIds: current.loadingLibraryIds.filter((id: string) => !missingIds.includes(id))
        }));
      });
  }, [
    iconLibraryPicker.catalog,
    iconLibraryPicker.loadedLibraryIds,
    iconLibraryPicker.loadingLibraryIds,
    iconLibraryPicker.selectedLibraryId,
    iconLibraryPickerOpen
  ]);
  useEffect(createAppHookCallback85(__appScope), [activeProjectKey, activeSchemeKey, schemes]);
  useEffect(createAppHookCallback86(__appScope), [activeSchemeKey, schemes, selectedSchemeId]);
  useEffect(createAppHookCallback87(__appScope), []);
  useEffect(createAppHookCallback88(__appScope), []);
  useEffect(createAppHookCallback89(__appScope), []);
  useEffect(createAppHookCallback90(__appScope), [contextMenu]);
  useEffect(createAppHookCallback91(__appScope), []);
  // 内存守望：堆逼近 2GB 时逐级释放撤销历史 / 自动刷新兜底（见 src/memoryWatch.ts 头注）
  useEffect(createMemoryWatchCallback(__appScope), []);
  const persistRefreshRecoveryNow = __s("persistRefreshRecoveryNow", createPersistRefreshRecoveryNow); Object.assign(__appScope, { persistRefreshRecoveryNow });
  useEffect(createAppHookCallback92(__appScope), [saveRequired]);
  useEffect(createAppHookCallback93(__appScope), [hasUnsavedChanges]);
  useEffect(createAppHookCallback94(__appScope), [connectDropReady]);
  useEffect(createAppHookCallback95(__appScope), [connectSource, nodes, edges]);
  useEffect(createAppHookCallback96(__appScope), [dragging]);
  useEffect(() => () => {
      if (nodeDragMoveFrameRef.current !== null) {
        window.cancelAnimationFrame(nodeDragMoveFrameRef.current);
        nodeDragMoveFrameRef.current = null;
      }
      pendingNodeDragMoveRef.current = null;
    }, []);
  const clearRecordSelection = __s("clearRecordSelection", createClearRecordSelection); Object.assign(__appScope, { clearRecordSelection });
  const blurLayerManagementDropdownFocus = __s("blurLayerManagementDropdownFocus", createBlurLayerManagementDropdownFocus); Object.assign(__appScope, { blurLayerManagementDropdownFocus });
  const selectSingleScheme = __s("selectSingleScheme", createSelectSingleScheme); Object.assign(__appScope, { selectSingleScheme });
  const selectSingleProject = __s("selectSingleProject", createSelectSingleProject); Object.assign(__appScope, { selectSingleProject });
  const toggleSchemeSelection = __s("toggleSchemeSelection", createToggleSchemeSelection); Object.assign(__appScope, { toggleSchemeSelection });
  const toggleProjectSelection = __s("toggleProjectSelection", createToggleProjectSelection); Object.assign(__appScope, { toggleProjectSelection });
  const cloneProjectState = (deepModelSnapshot = false, graphPatchScope?: UndoGraphPatchScope): UndoSnapshot => ({
      graphSnapshotMode: deepModelSnapshot ? "deep" : "reference",
      graphPatchScope: deepModelSnapshot ? undefined : graphPatchScope,
      projectName,
      layers: layers.map((layer: { id: string; name: string; visible?: boolean }) => ({ ...layer })),
      activeLayerId,
      canvasWidth,
      canvasHeight,
      allowAutoExpandCanvas,
      canvasBackgroundColor,
      canvasBackgroundImage,
      canvasBackgroundImageAssetId,
      canvasBackgroundImageFit,
      backgroundProjectId,
      backgroundLayerIds: [...backgroundLayerIds],
      powerUnit,
      voltageUnit,
      currentUnit,
      powerBaseValue,
      modelType,
      subcontrolarea,
      substation,
      feeder,
      taiqu,
      deviceIndexCounters: { ...deviceIndexCounters },
      nodes: deepModelSnapshot ? cloneNodesForUndo(nodes) : nodes,
      edges: deepModelSnapshot ? cloneEdgesForUndo(edges) : edges,
      groups: deepModelSnapshot ? cloneGroupsForUndo(groups) : groups,
      measurements: deepModelSnapshot
        ? normalizeProjectMeasurements(projectMeasurements, nodes)
        : projectMeasurements,
      topologyErrors: deepModelSnapshot ? cloneTopologyErrorsForUndo(topologyErrors) : topologyErrors,
      topology: deepModelSnapshot ? cloneTopologyForUndo(topology) : topology,
      topologyStatus: { ...topologyStatus },
      revision: __appScope.currentMutationRevisionRef?.current ?? 0
    });
  Object.assign(__appScope, { cloneProjectState });
  const fullUndoGraphDirtyEdgeIds = (store: GraphStore, snapshot: UndoSnapshot) =>
      new Set([
        ...store.edges.map((edge) => edge.id),
        ...snapshot.edges.map((edge) => edge.id)
      ]);
  Object.assign(__appScope, { fullUndoGraphDirtyEdgeIds });
  const undoGraphSnapshotPatchPlan = __s("undoGraphSnapshotPatchPlan", createUndoGraphSnapshotPatchPlan); Object.assign(__appScope, { undoGraphSnapshotPatchPlan });
  const applyUndoGraphSnapshot = __s("applyUndoGraphSnapshot", createApplyUndoGraphSnapshot); Object.assign(__appScope, { applyUndoGraphSnapshot });
  const pushUndoSnapshot = __s("pushUndoSnapshot", createPushUndoSnapshot); Object.assign(__appScope, { pushUndoSnapshot });
  const uniqueUndoScopeIds = __s("uniqueUndoScopeIds", createUniqueUndoScopeIds); Object.assign(__appScope, { uniqueUndoScopeIds });
  const undoScopeForGraphPatch = (
      nodeIds: Iterable<string | undefined> = [],
      edgeIds: Iterable<string | undefined> = []
    ): UndoGraphPatchScope => ({
      nodeIds: uniqueUndoScopeIds(nodeIds),
      edgeIds: uniqueUndoScopeIds(edgeIds)
    });
  Object.assign(__appScope, { undoScopeForGraphPatch });
  const undoScopeForDraggingState = (dragState: DraggingState | null | undefined): UndoGraphPatchScope | undefined =>
      dragState
        ? undoScopeForGraphPatch(
            dragState.nodeIds,
            [
              ...dragState.edgeIds,
              ...dragState.affectedEdges.map((edge) => edge.id)
            ]
          )
        : undefined;
  Object.assign(__appScope, { undoScopeForDraggingState });
  const pushNodeOnlyUndoSnapshot = __s("pushNodeOnlyUndoSnapshot", createPushNodeOnlyUndoSnapshot); Object.assign(__appScope, { pushNodeOnlyUndoSnapshot });
  const syncExistingNodesWithTemplateDefinitions = __s("syncExistingNodesWithTemplateDefinitions", createSyncExistingNodesWithTemplateDefinitions); Object.assign(__appScope, { syncExistingNodesWithTemplateDefinitions });
  const updateMeasurementConfig = __s("updateMeasurementConfig", createUpdateMeasurementConfig); Object.assign(__appScope, { updateMeasurementConfig });
  const prepareMeasurementConfigDraft = __s("prepareMeasurementConfigDraft", createPrepareMeasurementConfigDraft); Object.assign(__appScope, { prepareMeasurementConfigDraft });
  const openMeasurementConfigDialog = __s("openMeasurementConfigDialog", createOpenMeasurementConfigDialog); Object.assign(__appScope, { openMeasurementConfigDialog });
  const closeMeasurementConfigDialog = __s("closeMeasurementConfigDialog", createCloseMeasurementConfigDialog); Object.assign(__appScope, { closeMeasurementConfigDialog });
  const flushMeasurementConfigDialogDraftInputs = __s("flushMeasurementConfigDialogDraftInputs", createFlushMeasurementConfigDialogDraftInputs); Object.assign(__appScope, { flushMeasurementConfigDialogDraftInputs });
  const saveMeasurementConfigDialog = __s("saveMeasurementConfigDialog", createSaveMeasurementConfigDialog); Object.assign(__appScope, { saveMeasurementConfigDialog });
  const updateMeasurementType = __s("updateMeasurementType", createUpdateMeasurementType); Object.assign(__appScope, { updateMeasurementType });
  const addMeasurementType = __s("addMeasurementType", createAddMeasurementType); Object.assign(__appScope, { addMeasurementType });
  const deleteMeasurementType = __s("deleteMeasurementType", createDeleteMeasurementType); Object.assign(__appScope, { deleteMeasurementType });
  const setMeasurementProfileItems = __s("setMeasurementProfileItems", createSetMeasurementProfileItems); Object.assign(__appScope, { setMeasurementProfileItems });
  const createMeasurementProfileItem = __s("createMeasurementProfileItem", createCreateMeasurementProfileItem); Object.assign(__appScope, { createMeasurementProfileItem });
  const addMeasurementProfileItem = __s("addMeasurementProfileItem", createAddMeasurementProfileItem); Object.assign(__appScope, { addMeasurementProfileItem });
  const updateMeasurementProfileItem = __s("updateMeasurementProfileItem", createUpdateMeasurementProfileItem); Object.assign(__appScope, { updateMeasurementProfileItem });
  const deleteMeasurementProfileItem = __s("deleteMeasurementProfileItem", createDeleteMeasurementProfileItem); Object.assign(__appScope, { deleteMeasurementProfileItem });
  const moveMeasurementProfileItem = __s("moveMeasurementProfileItem", createMoveMeasurementProfileItem); Object.assign(__appScope, { moveMeasurementProfileItem });
  const updateProjectMeasurementsWithUndo = __s("updateProjectMeasurementsWithUndo", createUpdateProjectMeasurementsWithUndo); Object.assign(__appScope, { updateProjectMeasurementsWithUndo });
  const addDefaultMeasurementsToNode = __s("addDefaultMeasurementsToNode", createAddDefaultMeasurementsToNode); Object.assign(__appScope, { addDefaultMeasurementsToNode });
  const removeMeasurementsFromNode = __s("removeMeasurementsFromNode", createRemoveMeasurementsFromNode); Object.assign(__appScope, { removeMeasurementsFromNode });
  const measurementGroupShellOffsetForNode = __s("measurementGroupShellOffsetForNode", createMeasurementGroupShellOffsetForNode); Object.assign(__appScope, { measurementGroupShellOffsetForNode });
  const createMeasurementGroupShellForNode = (node: ModelNode, terminalId?: string): MeasurementGroup => ({
      id: terminalId ? `measurement-${node.id}-${terminalId}` : `measurement-${node.id}`,
      nodeId: node.id,
      terminalId,
      visible: true,
      labelVisible: true,
      unitVisible: true,
      backgroundColor: DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR,
      borderColor: DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR,
      borderStyle: DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE,
      borderWidth: DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH,
      anchor: "bottom",
      offset: measurementGroupShellOffsetForNode(node, terminalId),
      layout: "vertical",
      items: []
    });
  Object.assign(__appScope, { createMeasurementGroupShellForNode });
  // 随机段取自可注入随机源 __appScope.randomSource（缺省即 Math.random，逐字保持原行为）。
  // 缝与 appControlFactories 的组合 id 一致；注意缺省分支写成 `() => Math.random()` 而非 `Math.random`，
  // 以保留原先"每次生成 id 时才查一次 Math.random"的读取时机（否则先 stub Math.random 再调用会失效）。
  const editorGroupRandomSource = typeof __appScope.randomSource === "function"
    ? (__appScope.randomSource as () => number)
    : () => Math.random();
  const createMeasurementEditorGroupIdForScope = (nodeId: string, terminalId?: string) =>
      createMeasurementEditorGroupId(nodeId, terminalId, editorGroupRandomSource);
  Object.assign(__appScope, { createMeasurementEditorGroupId: createMeasurementEditorGroupIdForScope });
  const createMeasurementEditorGroupShellForNode = (node: ModelNode, terminalId?: string): MeasurementGroup => ({
      ...createMeasurementGroupShellForNode(node, terminalId),
      id: createMeasurementEditorGroupIdForScope(node.id, terminalId)
    });
  Object.assign(__appScope, { createMeasurementEditorGroupShellForNode });
  const measurementSourcePointForNodeItem = __s("measurementSourcePointForNodeItem", createMeasurementSourcePointForNodeItem); Object.assign(__appScope, { measurementSourcePointForNodeItem });
  const measurementProfileItemsForMeasurementGroup = (node: ModelNode, terminalId?: string) =>
      measurementProfileItemsForNodePosition(node, runtimeMeasurementConfig ?? measurementConfig, terminalId);
  Object.assign(__appScope, { measurementProfileItemsForMeasurementGroup });
  const measurementTypeOptionsForMeasurementGroup = __s("measurementTypeOptionsForMeasurementGroup", createMeasurementTypeOptionsForMeasurementGroup); Object.assign(__appScope, { measurementTypeOptionsForMeasurementGroup });
  const createMeasurementItemForNode = __s("createMeasurementItemForNode", createCreateMeasurementItemForNode); Object.assign(__appScope, { createMeasurementItemForNode });
  const updateMeasurementGroupById = __s("updateMeasurementGroupById", createUpdateMeasurementGroupById); Object.assign(__appScope, { updateMeasurementGroupById });
  const updateSelectedMeasurementGroup = __s("updateSelectedMeasurementGroup", createUpdateSelectedMeasurementGroup); Object.assign(__appScope, { updateSelectedMeasurementGroup });
  const updateSelectedMeasurementGroups = __s("updateSelectedMeasurementGroups", createUpdateSelectedMeasurementGroups); Object.assign(__appScope, { updateSelectedMeasurementGroups });
  const addMeasurementItemToGroup = __s("addMeasurementItemToGroup", createAddMeasurementItemToGroup); Object.assign(__appScope, { addMeasurementItemToGroup });
  const addMeasurementItemToNode = __s("addMeasurementItemToNode", createAddMeasurementItemToNode); Object.assign(__appScope, { addMeasurementItemToNode });
  const updateMeasurementItem = __s("updateMeasurementItem", createUpdateMeasurementItem); Object.assign(__appScope, { updateMeasurementItem });
  const removeMeasurementItem = __s("removeMeasurementItem", createRemoveMeasurementItem); Object.assign(__appScope, { removeMeasurementItem });
  const applyMeasurementEditorGroupSettings = (group: MeasurementGroup, template: MeasurementGroup): MeasurementGroup => ({
      ...group,
      visible: template.visible,
      labelVisible: template.labelVisible,
      unitVisible: template.unitVisible,
      backgroundColor: template.backgroundColor,
      borderColor: template.borderColor,
      borderStyle: template.borderStyle,
      borderWidth: template.borderWidth,
      anchor: template.anchor,
      layout: template.layout,
      groupStyleOverride: template.groupStyleOverride ? { ...template.groupStyleOverride } : undefined
    });
  Object.assign(__appScope, { applyMeasurementEditorGroupSettings });
  const createMeasurementEditorGroupForPosition = __s("createMeasurementEditorGroupForPosition", createCreateMeasurementEditorGroupForPosition); Object.assign(__appScope, { createMeasurementEditorGroupForPosition });
  const updateMeasurementEditorGroupSettings = __s("updateMeasurementEditorGroupSettings", createUpdateMeasurementEditorGroupSettings); Object.assign(__appScope, { updateMeasurementEditorGroupSettings });
  const updateMeasurementEditorDraftItem = __s("updateMeasurementEditorDraftItem", createUpdateMeasurementEditorDraftItem); Object.assign(__appScope, { updateMeasurementEditorDraftItem });
  const addMeasurementEditorDraftItem = __s("addMeasurementEditorDraftItem", createAddMeasurementEditorDraftItem); Object.assign(__appScope, { addMeasurementEditorDraftItem });
  const removeMeasurementEditorDraftItem = __s("removeMeasurementEditorDraftItem", createRemoveMeasurementEditorDraftItem); Object.assign(__appScope, { removeMeasurementEditorDraftItem });
  const moveMeasurementEditorDraftItem = __s("moveMeasurementEditorDraftItem", createMoveMeasurementEditorDraftItem); Object.assign(__appScope, { moveMeasurementEditorDraftItem });
  const updateMeasurementEditorDraftItemPosition = __s("updateMeasurementEditorDraftItemPosition", createUpdateMeasurementEditorDraftItemPosition); Object.assign(__appScope, { updateMeasurementEditorDraftItemPosition });
  const measurementEditorItemName = (item: MeasurementItemBinding) =>
      (item.name ?? measurementTypeById.get(item.measurementTypeId)?.name ?? item.measurementTypeId).trim();
  Object.assign(__appScope, { measurementEditorItemName });
  const duplicateMeasurementEditorItemNames = __s("duplicateMeasurementEditorItemNames", createDuplicateMeasurementEditorItemNames); Object.assign(__appScope, { duplicateMeasurementEditorItemNames });
  const confirmMeasurementEditorDialog = __s("confirmMeasurementEditorDialog", createConfirmMeasurementEditorDialog); Object.assign(__appScope, { confirmMeasurementEditorDialog });
  const renderSelectedNodeMeasurementTable = __s("renderSelectedNodeMeasurementTable", createRenderSelectedNodeMeasurementTable); Object.assign(__appScope, { renderSelectedNodeMeasurementTable });
  const beginMeasurementDrag = __s("beginMeasurementDrag", createBeginMeasurementDrag); Object.assign(__appScope, { beginMeasurementDrag });
  const updateMeasurementDrag = __s("updateMeasurementDrag", createUpdateMeasurementDrag); Object.assign(__appScope, { updateMeasurementDrag });
  const finishMeasurementDrag = __s("finishMeasurementDrag", createFinishMeasurementDrag); Object.assign(__appScope, { finishMeasurementDrag });
  const ensureDraggingUndoSnapshot = __s("ensureDraggingUndoSnapshot", createEnsureDraggingUndoSnapshot); Object.assign(__appScope, { ensureDraggingUndoSnapshot });
  const requestCanvasFrameCenter = __s("requestCanvasFrameCenter", createRequestCanvasFrameCenter); Object.assign(__appScope, { requestCanvasFrameCenter });
  const undoLastOperation = __s("undoLastOperation", createUndoLastOperation); Object.assign(__appScope, { undoLastOperation });
  const redoLastOperation = __s("redoLastOperation", createRedoLastOperation); Object.assign(__appScope, { redoLastOperation });
  useEffect(createAppHookCallback97(__appScope), [canvasBounds]);
  useLayoutEffect(createAppHookCallback98(__appScope), [canvasCenterRequest]);
  useEffect(createAppHookCallback99(__appScope), [projectPanelResize]);
  useEffect(createAppHookCallback100(__appScope), [sidePanelResize]);
  useEffect(createAppHookCallback101(__appScope), [canvasResizeDrag, canvasHeight, canvasWidth, edges, nodes, routedEdges]);
  useEffect(createAppHookCallback102(__appScope), [statusbarResize]);
  useEffect(createAppHookCallback103(__appScope), [topologyWarningPanelDrag, topologyWarningPanelHeight, topologyWarningPanelWidth]);
  useEffect(createAppHookCallback104(__appScope), [topologyWarningPanelResize]);
  useEffect(createAppHookCallback105(__appScope), [nodeDoubleClickDialogDrag]);
  useEffect(createAppHookCallback106(__appScope), [nodeDoubleClickDialogResize]);
  useEffect(createAppHookCallback107(__appScope), [deviceLibraryDialogDrag]);
  useEffect(createAppHookCallback108(__appScope), [deviceLibraryDialogResize]);
  const canvasPointerKeyboardShortcutAvailability = __s("canvasPointerKeyboardShortcutAvailability", createCanvasPointerKeyboardShortcutAvailability); Object.assign(__appScope, { canvasPointerKeyboardShortcutAvailability });
  useEffect(createAppHookCallback109(__appScope), []);
  useEffect(createAppHookCallback110(__appScope), [activeLayerEdges, activeLayerGroups, activeLayerNodes, activeSelectedEdgeIds, activeSelectedNodeIds, canvasBounds, canvasClipboard, canvasSelectionScope, connectSource, customDeviceDefinitionMode, customDeviceDialogOpen, customDeviceDraft, deviceIndexCounters, displaySelectedEdgeIds, displaySelectedNodeIds, edges, editingCustomDeviceKind, hasUnsavedChanges, hoveredCategoryLibraryComponentLibrary, isEditMode, libraryPlacement, measurementConfigDraft, nodes, projectById, projectName, recordClipboard, routedEdgeById, saveRequired, schemes, selectedCustomComponentTemplate, selectedDefinitionKind, selectedDefinitionTemplate, selectedEdgeId, selectedEdgeIds, selectedNodeIds, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds, staticDrawing, topologyErrors, viewBox]);
  useEffect(createAppHookCallback111(__appScope), [leftPanelTab]);
  useEffect(createAppHookCallback112(__appScope), [leftPanelTab]);
  useEffect(createAppHookCallback113(__appScope), [graphStore.topologyRevision, topologyStatus.state]);
  useEffect(createAppHookCallback114(__appScope), [leftPanelMode]);
  useEffect(createAppHookCallback115(__appScope), [rightPanelMode]);
  useEffect(createAppHookCallback116(__appScope), [leftPanelWidth]);
  useEffect(createAppHookCallback117(__appScope), [rightPanelWidth]);
  useEffect(createAppHookCallback118(__appScope), [statusbarHeight]);
  useEffect(createAppHookCallback119(__appScope), [topologyWarningPanelHeight]);
  const routeForCurrentEdgeSave = __s("routeForCurrentEdgeSave", createRouteForCurrentEdgeSave); Object.assign(__appScope, { routeForCurrentEdgeSave });
  const edgeWithCurrentRouteGeometryForSave = (edge: Edge): Edge =>
      edgeWithSavedRouteGeometry(edge, routeForCurrentEdgeSave(edge), nodeById.get(edge.sourceId), nodeById.get(edge.targetId));
  Object.assign(__appScope, { edgeWithCurrentRouteGeometryForSave });
  const currentProject = __s("currentProject", createCurrentProject); Object.assign(__appScope, { currentProject });
  const currentGraphDirtyBaseline = (): GraphDirtyBaseline => ({
      projectName,
      layers,
      activeLayerId,
      canvasWidth,
      canvasHeight,
      allowAutoExpandCanvas,
      canvasBackgroundColor,
      canvasBackgroundImage,
      canvasBackgroundImageAssetId,
      canvasBackgroundImageFit,
      backgroundProjectId,
      backgroundLayerIds,
      powerUnit,
      voltageUnit,
      currentUnit,
      powerBaseValue,
      deviceIndexCounters,
      nodes,
      edges,
      groups,
      measurements: projectMeasurements
    });
  Object.assign(__appScope, { currentGraphDirtyBaseline });
  const graphDirtyBaselineChanged = (previous: GraphDirtyBaseline, next: GraphDirtyBaseline) =>
      previous.projectName !== next.projectName ||
      previous.layers !== next.layers ||
      previous.activeLayerId !== next.activeLayerId ||
      previous.canvasWidth !== next.canvasWidth ||
      previous.canvasHeight !== next.canvasHeight ||
      previous.allowAutoExpandCanvas !== next.allowAutoExpandCanvas ||
      previous.canvasBackgroundColor !== next.canvasBackgroundColor ||
      previous.canvasBackgroundImage !== next.canvasBackgroundImage ||
      previous.canvasBackgroundImageAssetId !== next.canvasBackgroundImageAssetId ||
      previous.canvasBackgroundImageFit !== next.canvasBackgroundImageFit ||
      previous.backgroundProjectId !== next.backgroundProjectId ||
      previous.backgroundLayerIds !== next.backgroundLayerIds ||
      previous.powerUnit !== next.powerUnit ||
      previous.voltageUnit !== next.voltageUnit ||
      previous.currentUnit !== next.currentUnit ||
      previous.powerBaseValue !== next.powerBaseValue ||
      previous.deviceIndexCounters !== next.deviceIndexCounters ||
      previous.nodes !== next.nodes ||
      previous.edges !== next.edges ||
      previous.groups !== next.groups ||
      previous.measurements !== next.measurements;
  Object.assign(__appScope, { graphDirtyBaselineChanged });
  useEffect(createAppHookCallback120(__appScope), [activeLayerId, allowAutoExpandCanvas, backgroundLayerIds, backgroundProjectId, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasBackgroundImageFit, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edges, groups, layers, nodes, powerBaseValue, powerUnit, projectMeasurements, projectName, voltageUnit]);
  const canAdjustSelectedDisplayLayer = isEditMode && activeSelectedNodeIds.length > 0; Object.assign(__appScope, { canAdjustSelectedDisplayLayer });
  const adjustSelectedDisplayLayer = __s("adjustSelectedDisplayLayer", createAdjustSelectedDisplayLayer); Object.assign(__appScope, { adjustSelectedDisplayLayer });
  const clearTransientSelectionState = __s("clearTransientSelectionState", createClearTransientSelectionState); Object.assign(__appScope, { clearTransientSelectionState });
  const queuePendingBlankCanvasDeselect = __s("queuePendingBlankCanvasDeselect", createQueuePendingBlankCanvasDeselect); Object.assign(__appScope, { queuePendingBlankCanvasDeselect });
  const cancelPendingBlankCanvasDeselectOnMove = __s("cancelPendingBlankCanvasDeselectOnMove", createCancelPendingBlankCanvasDeselectOnMove); Object.assign(__appScope, { cancelPendingBlankCanvasDeselectOnMove });
  const flushPendingBlankCanvasDeselect = __s("flushPendingBlankCanvasDeselect", createFlushPendingBlankCanvasDeselect); Object.assign(__appScope, { flushPendingBlankCanvasDeselect });
  const writeOperationLog = __s("writeOperationLog", createWriteOperationLog); Object.assign(__appScope, { writeOperationLog });
  const persistDeviceLibraryChange = __s("persistDeviceLibraryChange", createPersistDeviceLibraryChange); Object.assign(__appScope, { persistDeviceLibraryChange });
  const persistTemplateLibraryChange = __s("persistTemplateLibraryChange", createPersistTemplateLibraryChange); Object.assign(__appScope, { persistTemplateLibraryChange });
  const libraryPackageScopeLabels: Record<LibraryPackageScope, string> = {
    measurement: "量测定义",
    "device-library": "类",
    "template-library": "模板库",
    "icon-library": "图标库",
    "component-library": "元件相关库",
    all: "全部库"
  };
  Object.assign(__appScope, { libraryPackageScopeLabels });
  const libraryPackageDialogScopeOptions = LIBRARY_PACKAGE_DIALOG_SCOPES.map((scope) => ({
    scope,
    label: libraryPackageScopeLabels[scope] ?? scope
  }));
  Object.assign(__appScope, { libraryPackageDialogScopeOptions });
  const libraryPackageScopeMatches = (packageScope: LibraryPackageScope, targetScope: LibraryPackageScope) =>
    packageScope === targetScope || packageScope === "all";
  Object.assign(__appScope, { libraryPackageScopeMatches });
  const currentDeviceLibraryPersistencePayload = () => normalizeDeviceLibraryPersistencePayload({
    customDeviceTemplates,
    customCategoryLibraries,
    customComponentLibraries,
    deviceDefinitionOverrides,
    eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionTemplateFields,
    eDeviceDefinitionTableIds,
    customGraphTemplateTypes,
    customGraphTemplates
  });
  Object.assign(__appScope, { currentDeviceLibraryPersistencePayload });
  Object.assign(__appScope, { timestampForLibraryPackageFilename });
  const userIconLibraryAssets = async () => {
    const folders = await fetchBackendImageFolders();
    const assets = (await fetchAllBackendImages()).filter((asset) =>
      String(asset.folderId ?? "") !== "builtin-shared-icons" &&
      !String(asset.id ?? "").startsWith("builtin-shared-icon-")
    );
    const exportedAssets = [];
    for (const asset of assets) {
      exportedAssets.push({
        ...asset,
        dataUrl: await fetchBackendImageDataUrl(asset)
      });
    }
    return normalizeIconLibraryPersistencePayload({ folders, assets: exportedAssets });
  };
  Object.assign(__appScope, { userIconLibraryAssets });
  const referencedUserAssetIds = useMemo(() => collectReferencedUserAssetIds({
    nodes,
    projectMeasurements,
    schemes,
    deviceLibrary: currentDeviceLibraryPersistencePayload()
  }), [
    customCategoryLibraries,
    customComponentLibraries,
    customDeviceTemplates,
    customGraphTemplateTypes,
    customGraphTemplates,
    deviceDefinitionOverrides,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionLabels,
    nodes,
    projectMeasurements,
    schemes
  ]);
  Object.assign(__appScope, { referencedUserAssetIds });
  const userCustomizationInventory = useMemo(() => buildUserCustomizationInventory(
    userCustomizationSnapshotView ?? {
      deviceLibrary: currentDeviceLibraryPersistencePayload(),
      measurementConfig,
      colorConfig: { colorDisplayMode, colorPalette },
      imageLibrary: { folders: imageFolders, assets: [] }
    },
    DEVICE_LIBRARY,
    referencedUserAssetIds
  ), [
    colorDisplayMode,
    colorPalette,
    customCategoryLibraries,
    customComponentLibraries,
    customDeviceTemplates,
    customGraphTemplateTypes,
    customGraphTemplates,
    deviceDefinitionOverrides,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionLabels,
    imageFolders,
    measurementConfig,
    referencedUserAssetIds,
    userCustomizationSnapshotView
  ]);
  Object.assign(__appScope, { userCustomizationInventory });
  const captureUserCustomizationSnapshot = __s("captureUserCustomizationSnapshot", createCaptureUserCustomizationSnapshot);
  Object.assign(__appScope, { captureUserCustomizationSnapshot });
  const persistUserCustomizationSnapshot = __s("persistUserCustomizationSnapshot", createPersistUserCustomizationSnapshot);
  Object.assign(__appScope, { persistUserCustomizationSnapshot });
  const applyUserCustomizationSnapshotToState = __s("applyUserCustomizationSnapshotToState", createApplyUserCustomizationSnapshotToState);
  Object.assign(__appScope, { applyUserCustomizationSnapshotToState });
  const reconcileOpenModelAfterCustomizationChange = __s("reconcileOpenModelAfterCustomizationChange", createReconcileOpenModelAfterCustomizationChange);
  Object.assign(__appScope, { reconcileOpenModelAfterCustomizationChange });
  const refreshUserCustomizationManager = __s("refreshUserCustomizationManager", createRefreshUserCustomizationManager);
  Object.assign(__appScope, { refreshUserCustomizationManager });
  const saveUserCustomizationSnapshotFile = __s("saveUserCustomizationSnapshotFile", createSaveUserCustomizationSnapshotFile);
  Object.assign(__appScope, { saveUserCustomizationSnapshotFile });
  const applyUserCustomizationSnapshot = __s("applyUserCustomizationSnapshot", createApplyUserCustomizationSnapshot);
  Object.assign(__appScope, { applyUserCustomizationSnapshot });
  const exportAllUserCustomizations = __s("exportAllUserCustomizations", createExportAllUserCustomizations);
  Object.assign(__appScope, { exportAllUserCustomizations });
  const openUserCustomizationManager = __s("openUserCustomizationManager", createOpenUserCustomizationManager);
  Object.assign(__appScope, { openUserCustomizationManager });
  const closeUserCustomizationManager = __s("closeUserCustomizationManager", createCloseUserCustomizationManager);
  Object.assign(__appScope, { closeUserCustomizationManager });
  const openUserCustomizationImportFilePicker = __s("openUserCustomizationImportFilePicker", createOpenUserCustomizationImportFilePicker);
  Object.assign(__appScope, { openUserCustomizationImportFilePicker });
  const importUserCustomizationFile = __s("importUserCustomizationFile", createImportUserCustomizationFile);
  Object.assign(__appScope, { importUserCustomizationFile });
  const changePendingUserCustomizationImportMode = __s("changePendingUserCustomizationImportMode", createChangePendingUserCustomizationImportMode);
  Object.assign(__appScope, { changePendingUserCustomizationImportMode });
  const confirmUserCustomizationImport = __s("confirmUserCustomizationImport", createConfirmUserCustomizationImport);
  Object.assign(__appScope, { confirmUserCustomizationImport });
  const cancelPendingUserCustomizationImport = __s("cancelPendingUserCustomizationImport", createCancelPendingUserCustomizationImport);
  Object.assign(__appScope, { cancelPendingUserCustomizationImport });
  const restoreUserCustomizations = __s("restoreUserCustomizations", createRestoreUserCustomizations);
  Object.assign(__appScope, { restoreUserCustomizations });
  const exportLibraryPackage = async (scope: LibraryPackageScope) => {
    try {
      flushMeasurementConfigDialogDraftInputs?.();
      const measurementConfigForExport = normalizeMeasurementConfig(measurementConfigDraftRef.current ?? measurementConfigDraft ?? measurementConfig);
      const packagePayload = createLibraryPackage({
        scope,
        measurementConfig: measurementConfigForExport,
        deviceLibrary: currentDeviceLibraryPersistencePayload(),
      iconLibrary: scope === "icon-library" || scope === "component-library" || scope === "all" ? await userIconLibraryAssets() : undefined,
        // 目录树描述供外部系统读；本平台导入时不回写（见 normalizeComponentCatalog）
        componentCatalog: scope === "component-library" || scope === "all"
          ? buildComponentCatalog({ templates: libraryTemplates, customComponentLibraries, customCategoryLibraries })
          : undefined
      });
      const label = libraryPackageScopeLabels[scope] ?? "库";
      // 本机另存为才拿得到磁盘路径 → 弹框里才有【查看】
      let savedFile: any = null;
      const saved = await saveTextFile({
        filename: `${safeFilePart(label)}-${timestampForLibraryPackageFilename()}.json`,
        text: JSON.stringify(packagePayload, null, 2),
        mime: "application/json",
        description: "图形建模平台库文件",
        extensions: [".json"],
        preferNativeDialog: true,
        onSaved: (file: any) => {
          savedFile = file;
        }
      });
      if (saved) {
        writeOperationLog(`导出${label}`);
        if (scope === "device-library") {
          writeOperationLog("类导出不包含图标库；若元件引用了自定义图标，请单独导出图标库。");
        }
        showStandaloneExportCompletion(`${label}导出完成`, `${label}导出成功。`, [], savedFile);
      }
    } catch (error) {
      showGlobalMessage(error instanceof Error ? error.message : "导出库文件失败。");
    }
  };
  Object.assign(__appScope, { exportLibraryPackage });
  const openLibraryPackageImportFilePicker = (scope: LibraryPackageScope) => {
    libraryPackageImportScopeRef.current = scope;
    if (libraryPackageImportInputRef.current) {
      libraryPackageImportInputRef.current.value = "";
      libraryPackageImportInputRef.current.click();
    }
  };
  Object.assign(__appScope, { openLibraryPackageImportFilePicker });
  const openLibraryPackageDialog = (scope: LibraryPackageScope = "all") => {
    setLibraryPackageDialogScope(scope);
    setLibraryPackageDialogMode("export");
    setLibraryPackageDialogOpen(true);
  };
  Object.assign(__appScope, { openLibraryPackageDialog });
  const closeLibraryPackageDialog = () => setLibraryPackageDialogOpen(false);
  Object.assign(__appScope, { closeLibraryPackageDialog });
  const componentLibraryImportMessage = "当前元件、量测定义、图标和设备定义会被导入文件中的对应配置覆盖；模板库不会变更。";
  Object.assign(__appScope, { componentLibraryImportMessage });
  const applyImportedMeasurementLibrary = async (packagePayload: LibraryPackagePayload) => {
    if (!packagePayload.measurementConfig) {
      throw new Error("导入文件中没有量测定义。");
    }
    const normalized = normalizeMeasurementConfig(packagePayload.measurementConfig);
    const payload = serializeMeasurementConfigForStorage(normalized);
    writeMeasurementConfig(normalized);
    setMeasurementConfig(normalized);
    measurementConfigDraftRef.current = measurementConfigDialogOpen ? normalized : null;
    setMeasurementConfigDraft(measurementConfigDialogOpen ? normalized : null);
    setMeasurementConfigSaveStatus("saving");
    lastPersistedMeasurementConfigPayloadRef.current = payload;
    try {
      await saveBackendMeasurementConfigPayload(payload);
      backendMeasurementConfigLoadedRef.current = true;
      setMeasurementConfigSaveStatus("saved");
    } catch {
      setMeasurementConfigSaveStatus("error");
      throw new Error("量测定义已导入到本地，但保存到后台失败，请检查后台服务。");
    }
  };
  Object.assign(__appScope, { applyImportedMeasurementLibrary });
  const applyImportedDeviceOrTemplateLibrary = (packagePayload: LibraryPackagePayload, targetScope: LibraryPackageScope) => {
    if (!packagePayload.deviceLibrary) {
      throw new Error(`导入文件中没有${libraryPackageScopeLabels[targetScope as keyof typeof libraryPackageScopeLabels] ?? "库"}数据。`);
    }
    const next = deviceLibraryPayloadForPackageScope(
      currentDeviceLibraryPersistencePayload(),
      packagePayload.deviceLibrary,
      targetScope
    );
    setCustomDeviceTemplates(next.customDeviceTemplates);
    setCustomCategoryLibraries(next.customCategoryLibraries);
    setCustomComponentLibraries(next.customComponentLibraries);
    setDeviceDefinitionOverrides(next.deviceDefinitionOverrides);
    setEDeviceDefinitionLabels(next.eDeviceDefinitionLabels ?? {});
    setEDeviceDefinitionClassExportEnabled(next.eDeviceDefinitionClassExportEnabled ?? {});
    setEDeviceDefinitionFieldOrder(next.eDeviceDefinitionFieldOrder ?? {});
    setEDeviceDefinitionTemplateFields(next.eDeviceDefinitionTemplateFields ?? {});
    setEDeviceDefinitionTableIds(next.eDeviceDefinitionTableIds ?? {});
    setCustomGraphTemplateTypes(next.customGraphTemplateTypes);
    setCustomGraphTemplates(next.customGraphTemplates);
    persistDeviceLibraryChange(next, {
      success: `${libraryPackageScopeLabels[targetScope as keyof typeof libraryPackageScopeLabels]}已导入并保存到后台`,
      failure: `${libraryPackageScopeLabels[targetScope as keyof typeof libraryPackageScopeLabels]}已导入到本地，但保存到后台失败`
    });
  };
  Object.assign(__appScope, { applyImportedDeviceOrTemplateLibrary });
  const applyImportedIconLibrary = async (packagePayload: LibraryPackagePayload) => {
    if (!packagePayload.iconLibrary) {
      throw new Error("导入文件中没有图标库数据。");
    }
    const result = await importBackendImageLibraryPayload(packagePayload.iconLibrary);
    const importedAssets = Array.isArray(result.assets) ? result.assets : [];
    const nextFolderId = importedAssets[0]?.folderId ?? activeImageFolderId ?? "root";
    setImageAssets((current: ImageAsset[]) => ({ ...current, ...imageAssetsToMap(importedAssets) }));
    setActiveImageFolderId(nextFolderId);
    await refreshImageFolders();
    await refreshImagesForFolder(nextFolderId);
  };
  Object.assign(__appScope, { applyImportedIconLibrary });
  const applyImportedComponentLibrary = async (packagePayload: LibraryPackagePayload) => {
    let applied = false;
    if (packagePayload.measurementConfig) {
      await applyImportedMeasurementLibrary(packagePayload);
      applied = true;
    }
    if (packagePayload.deviceLibrary) {
      applyImportedDeviceOrTemplateLibrary(packagePayload, "component-library");
      applied = true;
    }
    // 空图标库不发起导入：后台对空包回 400，会把整条「导入类」打断（详见 iconLibraryHasImportableAssets）
    // 空图标库不发起导入：后台对空包回 400，会把整条「导入类」打断（详见 iconLibraryHasImportableAssets）
    if (iconLibraryHasImportableAssets(packagePayload.iconLibrary)) {
      await applyImportedIconLibrary(packagePayload);
      applied = true;
    }
    if (!applied) {
      throw new Error("导入文件中没有元件相关库数据。");
    }
  };
  Object.assign(__appScope, { applyImportedComponentLibrary });
  const applyImportedAllLibraries = async (packagePayload: LibraryPackagePayload) => {
    let applied = false;
    if (packagePayload.measurementConfig) {
      await applyImportedMeasurementLibrary(packagePayload);
      applied = true;
    }
    if (packagePayload.deviceLibrary) {
      applyImportedDeviceOrTemplateLibrary(packagePayload, "all");
      applied = true;
    }
    if (iconLibraryHasImportableAssets(packagePayload.iconLibrary)) {
      await applyImportedIconLibrary(packagePayload);
      applied = true;
    }
    if (!applied) {
      throw new Error("导入文件中没有可恢复的库数据。");
    }
  };
  Object.assign(__appScope, { applyImportedAllLibraries });
  const confirmLibraryPackageDialog = () => {
    const scope = libraryPackageDialogScope;
    setLibraryPackageDialogOpen(false);
    if (libraryPackageDialogMode === "import") {
      openLibraryPackageImportFilePicker(scope);
      return;
    }
    void exportLibraryPackage(scope);
  };
  Object.assign(__appScope, { confirmLibraryPackageDialog });
  const importLibraryPackageFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const targetScope = libraryPackageImportScopeRef.current;
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          const packagePayload = normalizeLibraryPackage(JSON.parse(String(reader.result ?? "{}")));
          if (!libraryPackageScopeMatches(packagePayload.scope, targetScope)) {
            throw new Error(`当前选择导入${libraryPackageScopeLabels[targetScope as keyof typeof libraryPackageScopeLabels]}，但文件类型是${libraryPackageScopeLabels[packagePayload.scope as keyof typeof libraryPackageScopeLabels] ?? packagePayload.scope}。`);
          }
          const label = libraryPackageScopeLabels[targetScope as keyof typeof libraryPackageScopeLabels] ?? "库";
          const confirmMessage = targetScope === "all"
            ? "确定导入全部库吗？当前量测定义、类、模板库会被导入文件中的对应配置覆盖，同 ID 图标会被覆盖。"
            : targetScope === "component-library"
            ? `确定导入${label}吗？${componentLibraryImportMessage}`
            : targetScope === "icon-library"
            ? `确定导入${label}吗？同 ID 图标会被覆盖，其他图标会保留。`
            : `确定导入${label}吗？当前${label}配置会被导入文件中的对应配置覆盖。`;
          if (!await showGlobalConfirm(confirmMessage)) {
            return;
          }
          if (targetScope === "all") {
            await applyImportedAllLibraries(packagePayload);
          } else if (targetScope === "component-library") {
            await applyImportedComponentLibrary(packagePayload);
          } else if (targetScope === "measurement") {
            await applyImportedMeasurementLibrary(packagePayload);
          } else if (targetScope === "device-library" || targetScope === "template-library") {
            applyImportedDeviceOrTemplateLibrary(packagePayload, targetScope);
          } else if (targetScope === "icon-library") {
            await applyImportedIconLibrary(packagePayload);
          }
          writeOperationLog(`导入${label}：${file.name}`);
          showGlobalMessage(`导入${label}成功。`);
        } catch (error) {
          showGlobalMessage(error instanceof Error ? error.message : "导入库文件失败。");
        }
      })();
    };
    reader.onerror = () => {
      showGlobalMessage("读取库文件失败。");
    };
    reader.readAsText(file, "utf-8");
  };
  Object.assign(__appScope, { importLibraryPackageFile });
  const connectionCommitFailureMessage = __s("connectionCommitFailureMessage", createConnectionCommitFailureMessage); Object.assign(__appScope, { connectionCommitFailureMessage });
  const connectionEndpointRuleFailureMessage = (edge: Edge) =>
      validateConnectionEndpointRules(nodes, edges, edge)[0]?.message ?? "";
  Object.assign(__appScope, { connectionEndpointRuleFailureMessage });
  const expandActiveGroupSelection = (nodeIds: readonly string[] = [], edgeIds: readonly string[] = []) =>
      expandSelectionByGroups(activeLayerGroups, nodeIds, edgeIds);
  Object.assign(__appScope, { expandActiveGroupSelection });
  const switchInspectorTabForCanvasSelection = __s("switchInspectorTabForCanvasSelection", createSwitchInspectorTabForCanvasSelection); Object.assign(__appScope, { switchInspectorTabForCanvasSelection });
  const selectCanvasGraphics = __s("selectCanvasGraphics", createSelectCanvasGraphics); Object.assign(__appScope, { selectCanvasGraphics });
  const setModifierSelectionPress = __s("setModifierSelectionPress", createSetModifierSelectionPress); Object.assign(__appScope, { setModifierSelectionPress });
  const toggleNodeSelectionFromModifierClick = __s("toggleNodeSelectionFromModifierClick", createToggleNodeSelectionFromModifierClick); Object.assign(__appScope, { toggleNodeSelectionFromModifierClick });
  const toggleEdgeSelectionFromModifierClick = __s("toggleEdgeSelectionFromModifierClick", createToggleEdgeSelectionFromModifierClick); Object.assign(__appScope, { toggleEdgeSelectionFromModifierClick });
  const toggleSelectionFromModifierClick = __s("toggleSelectionFromModifierClick", createToggleSelectionFromModifierClick); Object.assign(__appScope, { toggleSelectionFromModifierClick });
  const createCanvasSelectionSnapshot = (
      scope: CanvasSelectionScope,
      nodeIds: readonly string[],
      edgeIds: readonly string[],
      edgeId = edgeIds[0] ?? ""
    ): CanvasSelectionSnapshot => ({
      scope,
      nodeIds: [...nodeIds],
      edgeIds: [...edgeIds],
      edgeId
    });
  Object.assign(__appScope, { createCanvasSelectionSnapshot });
  const currentCanvasSelectionSnapshot = (): CanvasSelectionSnapshot =>
      createCanvasSelectionSnapshot(canvasSelectionScope, selectedNodeIds, selectedEdgeIds, selectedEdgeId);
  Object.assign(__appScope, { currentCanvasSelectionSnapshot });
  const restoreCanvasSelectionSnapshot = __s("restoreCanvasSelectionSnapshot", createRestoreCanvasSelectionSnapshot); Object.assign(__appScope, { restoreCanvasSelectionSnapshot });
  const restoreCanvasSelectionSnapshotWithInspector = __s("restoreCanvasSelectionSnapshotWithInspector", createRestoreCanvasSelectionSnapshotWithInspector); Object.assign(__appScope, { restoreCanvasSelectionSnapshotWithInspector });
  const startModifierSelectionPress = __s("startModifierSelectionPress", createStartModifierSelectionPress); Object.assign(__appScope, { startModifierSelectionPress });
  const cancelModifierSelectionPress = __s("cancelModifierSelectionPress", createCancelModifierSelectionPress); Object.assign(__appScope, { cancelModifierSelectionPress });
  const finishModifierSelectionPress = __s("finishModifierSelectionPress", createFinishModifierSelectionPress); Object.assign(__appScope, { finishModifierSelectionPress });
  const startNodeLabelDrag = __s("startNodeLabelDrag", createStartNodeLabelDrag); Object.assign(__appScope, { startNodeLabelDrag });
  const startNodeLabelRotateDrag = __s("startNodeLabelRotateDrag", createStartNodeLabelRotateDrag); Object.assign(__appScope, { startNodeLabelRotateDrag });
  const finishNodeLabelDrag = __s("finishNodeLabelDrag", createFinishNodeLabelDrag); Object.assign(__appScope, { finishNodeLabelDrag });
  const finishNodeLabelRotateDrag = __s("finishNodeLabelRotateDrag", createFinishNodeLabelRotateDrag); Object.assign(__appScope, { finishNodeLabelRotateDrag });
  const setSelectedNodeLabelDisplayMode = __s("setSelectedNodeLabelDisplayMode", createSetSelectedNodeLabelDisplayMode); Object.assign(__appScope, { setSelectedNodeLabelDisplayMode });
  const toggleSelectedNodeLabelDisplay = __s("toggleSelectedNodeLabelDisplay", createToggleSelectedNodeLabelDisplay); Object.assign(__appScope, { toggleSelectedNodeLabelDisplay });
  const copySelection = __s("copySelection", createCopySelection); Object.assign(__appScope, { copySelection });
  const cutSelection = __s("cutSelection", createCutSelection); Object.assign(__appScope, { cutSelection });
  const pasteSelection = __s("pasteSelection", createPasteSelection); Object.assign(__appScope, { pasteSelection });
  const createGraphTemplateType = __s("createGraphTemplateType", createCreateGraphTemplateType); Object.assign(__appScope, { createGraphTemplateType });
  const createGroupDeviceIconSvg = __s("createGroupDeviceIconSvg", createCreateGroupDeviceIconSvg); Object.assign(__appScope, { createGroupDeviceIconSvg });
  const groupDeviceTerminalAnchor = __s("groupDeviceTerminalAnchor", createGroupDeviceTerminalAnchor); Object.assign(__appScope, { groupDeviceTerminalAnchor });
  const groupDeviceTerminalSortKey = __s("groupDeviceTerminalSortKey", createGroupDeviceTerminalSortKey); Object.assign(__appScope, { groupDeviceTerminalSortKey });
  const groupDeviceTerminalAssociationFor = __s("groupDeviceTerminalAssociationFor", createGroupDeviceTerminalAssociationFor); Object.assign(__appScope, { groupDeviceTerminalAssociationFor });
  const groupDeviceExternalTerminals = __s("groupDeviceExternalTerminals", createGroupDeviceExternalTerminals); Object.assign(__appScope, { groupDeviceExternalTerminals });
  const groupDeviceTerminalSignature = (terminalTypes: readonly TerminalType[]) =>
      `${terminalTypes.length}|${TERMINAL_TYPE_OPTIONS.map((option) => `${option.value}:${terminalTypes.filter((type) => type === option.value).length}`).join("|")}`;
  Object.assign(__appScope, { groupDeviceTerminalSignature });
  const validateGroupDeviceIconReplacement = __s("validateGroupDeviceIconReplacement", createValidateGroupDeviceIconReplacement); Object.assign(__appScope, { validateGroupDeviceIconReplacement });
  const replaceBuiltinDeviceIconOverride = __s("replaceBuiltinDeviceIconOverride", createReplaceBuiltinDeviceIconOverride); Object.assign(__appScope, { replaceBuiltinDeviceIconOverride });
  const openGroupDeviceDefinitionDialog = __s("openGroupDeviceDefinitionDialog", createOpenGroupDeviceDefinitionDialog); Object.assign(__appScope, { openGroupDeviceDefinitionDialog });
  const confirmCreateDeviceFromGroup = __s("confirmCreateDeviceFromGroup", createConfirmCreateDeviceFromGroup); Object.assign(__appScope, { confirmCreateDeviceFromGroup });
  const confirmReplaceDeviceIconFromGroup = __s("confirmReplaceDeviceIconFromGroup", createConfirmReplaceDeviceIconFromGroup); Object.assign(__appScope, { confirmReplaceDeviceIconFromGroup });
  const openAddTemplateDialog = __s("openAddTemplateDialog", createOpenAddTemplateDialog); Object.assign(__appScope, { openAddTemplateDialog });
  const cancelTemplateDialog = __s("cancelTemplateDialog", createCancelTemplateDialog); Object.assign(__appScope, { cancelTemplateDialog });
  const confirmAddGraphTemplate = __s("confirmAddGraphTemplate", createConfirmAddGraphTemplate); Object.assign(__appScope, { confirmAddGraphTemplate });
  const deleteGraphTemplate = __s("deleteGraphTemplate", createDeleteGraphTemplate); Object.assign(__appScope, { deleteGraphTemplate });
  const deleteGraphTemplateType = __s("deleteGraphTemplateType", createDeleteGraphTemplateType); Object.assign(__appScope, { deleteGraphTemplateType });
  const dropGraphTemplate = __s("dropGraphTemplate", createDropGraphTemplate); Object.assign(__appScope, { dropGraphTemplate });
  const finishMarqueeSelectionFromPoints = __s("finishMarqueeSelectionFromPoints", createFinishMarqueeSelectionFromPoints); Object.assign(__appScope, { finishMarqueeSelectionFromPoints });
  const startContextMarqueeSelection = __s("startContextMarqueeSelection", createStartContextMarqueeSelection); Object.assign(__appScope, { startContextMarqueeSelection });
  const openFilterSelectionDialog = __s("openFilterSelectionDialog", createOpenFilterSelectionDialog); Object.assign(__appScope, { openFilterSelectionDialog });
  const filterSelectionTypeSelected = (option: FilterSelectionTypeOption) =>
      option.items.length > 0 && option.items.every((item) => filterSelectionTypeKeys.includes(item.itemKey));
  Object.assign(__appScope, { filterSelectionTypeSelected });
  const filterSelectionTypePartial = (option: FilterSelectionTypeOption) =>
      option.items.some((item) => filterSelectionTypeKeys.includes(item.itemKey)) && !filterSelectionTypeSelected(option);
  Object.assign(__appScope, { filterSelectionTypePartial });
  const toggleFilterSelectionType = __s("toggleFilterSelectionType", createToggleFilterSelectionType); Object.assign(__appScope, { toggleFilterSelectionType });
  const toggleFilterSelectionItem = __s("toggleFilterSelectionItem", createToggleFilterSelectionItem); Object.assign(__appScope, { toggleFilterSelectionItem });
  const confirmFilterSelectionDialog = __s("confirmFilterSelectionDialog", createConfirmFilterSelectionDialog); Object.assign(__appScope, { confirmFilterSelectionDialog });
  const finishMarqueeSelection = __s("finishMarqueeSelection", createFinishMarqueeSelection); Object.assign(__appScope, { finishMarqueeSelection });
  const deleteSelection = __s("deleteSelection", createDeleteSelection); Object.assign(__appScope, { deleteSelection });
  const deleteSelectedGraphicsFromCanvas = __s("deleteSelectedGraphicsFromCanvas", createDeleteSelectedGraphicsFromCanvas); Object.assign(__appScope, { deleteSelectedGraphicsFromCanvas });
  const groupSelectedGraphics = __s("groupSelectedGraphics", createGroupSelectedGraphics); Object.assign(__appScope, { groupSelectedGraphics });
  const ungroupSelectedGraphics = __s("ungroupSelectedGraphics", createUngroupSelectedGraphics); Object.assign(__appScope, { ungroupSelectedGraphics });
  const addToContainer = __s("addToContainer", createAddToContainer); Object.assign(__appScope, { addToContainer });
  const confirmAddToContainer = __s("confirmAddToContainer", createConfirmAddToContainer); Object.assign(__appScope, { confirmAddToContainer });
  const removeFromContainer = __s("removeFromContainer", createRemoveFromContainer); Object.assign(__appScope, { removeFromContainer });
  const manualPointDeltaForEdge = __s("manualPointDeltaForEdge", createManualPointDeltaForEdge); Object.assign(__appScope, { manualPointDeltaForEdge });
  const routePreserveEdgeIdsForMovedNodes = __s("routePreserveEdgeIdsForMovedNodes", createRoutePreserveEdgeIdsForMovedNodes); Object.assign(__appScope, { routePreserveEdgeIdsForMovedNodes });
  const routeSnapshotEdgesForMove = __s("routeSnapshotEdgesForMove", createRouteSnapshotEdgesForMove); Object.assign(__appScope, { routeSnapshotEdgesForMove });
  const routePointsSnapshotForMove = (
      candidateEdges: Edge[],
      movedNodeIds: Iterable<string>,
      selectedEdgeIds: Iterable<string> = []
    ) =>
      Object.fromEntries(
        routeSnapshotEdgesForMove(candidateEdges, movedNodeIds, selectedEdgeIds).map((edge) => [
          edge.id,
          currentStoredRoutePointsForEdge(edge)
        ])
      );
  Object.assign(__appScope, { routePointsSnapshotForMove });
  const snapshotEdgePoints = (sourceEdges = edges) =>
      Object.fromEntries(
        sourceEdges.map((edge: Edge) => [
          edge.id,
          {
            ...cloneEdgeEditablePoints(edge),
            routePoints: edge.routePoints?.map((point: Point) => ({ ...point }))
          }
        ])
      );
  Object.assign(__appScope, { snapshotEdgePoints });
  const routePointSnapshotToRoutes = (routePoints: Record<string, Point[]>): { edgeId: string; points: Point[]; path: string }[] =>
      Object.entries(routePoints).map(([edgeId, points]) => ({
        edgeId,
        points: points.map((point: Point) => ({ ...point })),
        path: ""
      }));
  Object.assign(__appScope, { routePointSnapshotToRoutes });
  const boxesOverlap = (
      first: { left: number; right: number; top: number; bottom: number },
      second: { left: number; right: number; top: number; bottom: number }
    ) => first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;
  Object.assign(__appScope, { boxesOverlap });
  const expandRouteBox = (
      box: { left: number; right: number; top: number; bottom: number },
      padding: number
    ) => ({
      left: box.left - padding,
      right: box.right + padding,
      top: box.top - padding,
      bottom: box.bottom + padding
    });
  Object.assign(__appScope, { expandRouteBox });
  const routeTouchesExpandedBoxes = __s("routeTouchesExpandedBoxes", createRouteTouchesExpandedBoxes); Object.assign(__appScope, { routeTouchesExpandedBoxes });
  const boundsForNodeSet = __s("boundsForNodeSet", createBoundsForNodeSet); Object.assign(__appScope, { boundsForNodeSet });
  const mergeNodeUpdateLists = __s("mergeNodeUpdateLists", createMergeNodeUpdateLists); Object.assign(__appScope, { mergeNodeUpdateLists });
  const mergeUniqueEdgesById = __s("mergeUniqueEdgesById", createMergeUniqueEdgesById); Object.assign(__appScope, { mergeUniqueEdgesById });
  const completeNodeListForPartialPatch = __s("completeNodeListForPartialPatch", createCompleteNodeListForPartialPatch); Object.assign(__appScope, { completeNodeListForPartialPatch });
  const movableCanvasNodeIds = (nodeIds: readonly string[]) =>
      nodeIds.filter((nodeId) => {
        const node = nodeById.get(nodeId);
        return node && isCanvasNodeMovable(node.kind);
      });
  Object.assign(__appScope, { movableCanvasNodeIds });
  const isWholeActiveLayerMove = __s("isWholeActiveLayerMove", createIsWholeActiveLayerMove); Object.assign(__appScope, { isWholeActiveLayerMove });
  const internalMoveEdgeIdsForMovedNodes = __s("internalMoveEdgeIdsForMovedNodes", createInternalMoveEdgeIdsForMovedNodes); Object.assign(__appScope, { internalMoveEdgeIdsForMovedNodes });
  const externalMoveCandidateEdges = __s("externalMoveCandidateEdges", createExternalMoveCandidateEdges); Object.assign(__appScope, { externalMoveCandidateEdges });
  const internalMoveCandidateEdges = __s("internalMoveCandidateEdges", createInternalMoveCandidateEdges); Object.assign(__appScope, { internalMoveCandidateEdges });
  const translateInternalMoveCandidateEdges = __s("translateInternalMoveCandidateEdges", createTranslateInternalMoveCandidateEdges); Object.assign(__appScope, { translateInternalMoveCandidateEdges });
  const translateWholeMoveCandidateEdges = __s("translateWholeMoveCandidateEdges", createTranslateWholeMoveCandidateEdges); Object.assign(__appScope, { translateWholeMoveCandidateEdges });
  const internalRoutableLineNodeUpdatesForMove = __s("internalRoutableLineNodeUpdatesForMove", createInternalRoutableLineNodeUpdatesForMove); Object.assign(__appScope, { internalRoutableLineNodeUpdatesForMove });
  const wholeMoveRoutableLineNodeUpdates = (movedNodeIds: Iterable<string>, delta: Point) =>
      internalRoutableLineNodeUpdatesForMove(movedNodeIds, delta);
  Object.assign(__appScope, { wholeMoveRoutableLineNodeUpdates });
  const routableLineRouteCandidateIdsForMovedNodes = __s("routableLineRouteCandidateIdsForMovedNodes", createRoutableLineRouteCandidateIdsForMovedNodes); Object.assign(__appScope, { routableLineRouteCandidateIdsForMovedNodes });
  const rebuildRoutableLineNodeUpdatesForChangedNodes = __s("rebuildRoutableLineNodeUpdatesForChangedNodes", createRebuildRoutableLineNodeUpdatesForChangedNodes); Object.assign(__appScope, { rebuildRoutableLineNodeUpdatesForChangedNodes });
  const scheduleDeferredRoutableLineRouteRepair = __s("scheduleDeferredRoutableLineRouteRepair", createScheduleDeferredRoutableLineRouteRepair); Object.assign(__appScope, { scheduleDeferredRoutableLineRouteRepair });
  const localRouteOptimizationEdges = __s("localRouteOptimizationEdges", createLocalRouteOptimizationEdges); Object.assign(__appScope, { localRouteOptimizationEdges });
  const localRouteOptimizationCandidateEdges = __s("localRouteOptimizationCandidateEdges", createLocalRouteOptimizationCandidateEdges); Object.assign(__appScope, { localRouteOptimizationCandidateEdges });
  const routePointsForMovedNodeBlockers = __s("routePointsForMovedNodeBlockers", createRoutePointsForMovedNodeBlockers); Object.assign(__appScope, { routePointsForMovedNodeBlockers });
  const routePointsForMovedEdgesBlockedByStationaryNodes = __s("routePointsForMovedEdgesBlockedByStationaryNodes", createRoutePointsForMovedEdgesBlockedByStationaryNodes); Object.assign(__appScope, { routePointsForMovedEdgesBlockedByStationaryNodes });
  const routePointsNearOriginalMovedNodes = __s("routePointsNearOriginalMovedNodes", createRoutePointsNearOriginalMovedNodes); Object.assign(__appScope, { routePointsNearOriginalMovedNodes });
  Object.assign(__appScope, { sameOptionalPoint, sameConnectTarget });
  Object.assign(__appScope, { sameOptionalPointList });
  const adjustEdgesAfterNodeMove = __s("adjustEdgesAfterNodeMove", createAdjustEdgesAfterNodeMove); Object.assign(__appScope, { adjustEdgesAfterNodeMove });
  const rebuildSingleAffectedConnectionRoute = __s("rebuildSingleAffectedConnectionRoute", createRebuildSingleAffectedConnectionRoute); Object.assign(__appScope, { rebuildSingleAffectedConnectionRoute });
  const synchronousEdgeAdjustmentCandidates = __s("synchronousEdgeAdjustmentCandidates", createSynchronousEdgeAdjustmentCandidates); Object.assign(__appScope, { synchronousEdgeAdjustmentCandidates });
  const shouldAdjustEdgeSynchronouslyAfterMove = __s("shouldAdjustEdgeSynchronouslyAfterMove", createShouldAdjustEdgeSynchronouslyAfterMove); Object.assign(__appScope, { shouldAdjustEdgeSynchronouslyAfterMove });
  const mergeAdjustedCandidateEdges = __s("mergeAdjustedCandidateEdges", createMergeAdjustedCandidateEdges); Object.assign(__appScope, { mergeAdjustedCandidateEdges });
  Object.assign(__appScope, { shouldFinalizeMovedNodeEdgesSynchronously });
  Object.assign(__appScope, { shouldDeferSingleNodeTerminalReconciliation });
  const terminalReconcileNodeScope = __s("terminalReconcileNodeScope", createTerminalReconcileNodeScope); Object.assign(__appScope, { terminalReconcileNodeScope });
  const finalizeMovedNodeEdgesFast = __s("finalizeMovedNodeEdgesFast", createFinalizeMovedNodeEdgesFast); Object.assign(__appScope, { finalizeMovedNodeEdgesFast });
  const optimizeMovedNodeEdgeRoutes = __s("optimizeMovedNodeEdgeRoutes", createOptimizeMovedNodeEdgeRoutes); Object.assign(__appScope, { optimizeMovedNodeEdgeRoutes });
  const shouldRunDeferredMoveOptimization = __s("shouldRunDeferredMoveOptimization", createShouldRunDeferredMoveOptimization); Object.assign(__appScope, { shouldRunDeferredMoveOptimization });
  const scheduleMovedEdgeOptimization = __s("scheduleMovedEdgeOptimization", createScheduleMovedEdgeOptimization); Object.assign(__appScope, { scheduleMovedEdgeOptimization });
  const scheduleDeferredMovedConnectionRepair = __s("scheduleDeferredMovedConnectionRepair", createScheduleDeferredMovedConnectionRepair); Object.assign(__appScope, { scheduleDeferredMovedConnectionRepair });
  const moveRouteRepairSeedEdges = __s("moveRouteRepairSeedEdges", createMoveRouteRepairSeedEdges); Object.assign(__appScope, { moveRouteRepairSeedEdges });
  Object.assign(__appScope, { shouldPatchRouteCacheForHighFanoutMove });
  const lightweightMovedEndpointRoute = __s("lightweightMovedEndpointRoute", createLightweightMovedEndpointRoute); Object.assign(__appScope, { lightweightMovedEndpointRoute });
  const patchCachedRoutesForHighFanoutMove = __s("patchCachedRoutesForHighFanoutMove", createPatchCachedRoutesForHighFanoutMove); Object.assign(__appScope, { patchCachedRoutesForHighFanoutMove });
  const patchCachedRoutesForBulkTranslation = __s("patchCachedRoutesForBulkTranslation", createPatchCachedRoutesForBulkTranslation); Object.assign(__appScope, { patchCachedRoutesForBulkTranslation });
  const patchCachedRoutesForWholeMove = __s("patchCachedRoutesForWholeMove", createPatchCachedRoutesForWholeMove); Object.assign(__appScope, { patchCachedRoutesForWholeMove });
  const patchCachedRoutesForInternalMove = __s("patchCachedRoutesForInternalMove", createPatchCachedRoutesForInternalMove); Object.assign(__appScope, { patchCachedRoutesForInternalMove });
  const storedRouteDirtyIdsForMove = __s("storedRouteDirtyIdsForMove", createStoredRouteDirtyIdsForMove); Object.assign(__appScope, { storedRouteDirtyIdsForMove });
  const buildBulkMovePlan = __s("buildBulkMovePlan", createBuildBulkMovePlan); Object.assign(__appScope, { buildBulkMovePlan });
  const commitFastMovedGraphPatches = __s("commitFastMovedGraphPatches", createCommitFastMovedGraphPatches); Object.assign(__appScope, { commitFastMovedGraphPatches });
  const clampPointToCanvas = (point: Point) => clampPointToBounds(point, canvasBounds); Object.assign(__appScope, { clampPointToCanvas });
  const clampNodeToCanvas = (node: ModelNode, position = node.position) => clampNodePositionToBounds(node, canvasBounds, position); Object.assign(__appScope, { clampNodeToCanvas });
  const clampViewBoxToCanvas = (box: typeof viewBox) => normalizeViewBoxToCanvas(box, canvasBounds); Object.assign(__appScope, { clampViewBoxToCanvas });
  const updateMouseStatus = __s("updateMouseStatus", createUpdateMouseStatus); Object.assign(__appScope, { updateMouseStatus });
  const updateMultiNodeDragOverlayTransform = __s("updateMultiNodeDragOverlayTransform", createUpdateMultiNodeDragOverlayTransform); Object.assign(__appScope, { updateMultiNodeDragOverlayTransform });
  const showImperativeMultiNodeDragOverlay = __s("showImperativeMultiNodeDragOverlay", createShowImperativeMultiNodeDragOverlay); Object.assign(__appScope, { showImperativeMultiNodeDragOverlay });
  const hideImperativeMultiNodeDragOverlay = __s("hideImperativeMultiNodeDragOverlay", createHideImperativeMultiNodeDragOverlay); Object.assign(__appScope, { hideImperativeMultiNodeDragOverlay });
  const resetMultiNodeDragOverlayTransform = __s("resetMultiNodeDragOverlayTransform", createResetMultiNodeDragOverlayTransform); Object.assign(__appScope, { resetMultiNodeDragOverlayTransform });
  const singleNodeDragRenderState = (dragState: DraggingState): DraggingState => ({
      ...dragState,
      currentDelta: undefined,
      previewDelta: undefined
    });
  Object.assign(__appScope, { singleNodeDragRenderState });
  const buildSingleNodeDragPreviewNodeMarkup = __s("buildSingleNodeDragPreviewNodeMarkup", createBuildSingleNodeDragPreviewNodeMarkup); Object.assign(__appScope, { buildSingleNodeDragPreviewNodeMarkup });
  const clearImperativeNodeDragEdgePreview = __s("clearImperativeNodeDragEdgePreview", createClearImperativeNodeDragEdgePreview); Object.assign(__appScope, { clearImperativeNodeDragEdgePreview });
  const showImperativeSingleNodeDragPreview = __s("showImperativeSingleNodeDragPreview", createShowImperativeSingleNodeDragPreview); Object.assign(__appScope, { showImperativeSingleNodeDragPreview });
  const cssSelectorEscape = __s("cssSelectorEscape", createCssSelectorEscape); Object.assign(__appScope, { cssSelectorEscape });
  const clearImperativeSingleNodeDragOriginLines = __s("clearImperativeSingleNodeDragOriginLines", createClearImperativeSingleNodeDragOriginLines); Object.assign(__appScope, { clearImperativeSingleNodeDragOriginLines });
  const setImperativeSingleNodeDragOriginLines = __s("setImperativeSingleNodeDragOriginLines", createSetImperativeSingleNodeDragOriginLines); Object.assign(__appScope, { setImperativeSingleNodeDragOriginLines });
  const setImperativeSingleNodeDragOrigin = __s("setImperativeSingleNodeDragOrigin", createSetImperativeSingleNodeDragOrigin); Object.assign(__appScope, { setImperativeSingleNodeDragOrigin });
  const bindCanvasNodeElement = __s("bindCanvasNodeElement", createBindCanvasNodeElement); Object.assign(__appScope, { bindCanvasNodeElement });
  const hideImperativeSingleNodeDragPreview = __s("hideImperativeSingleNodeDragPreview", createHideImperativeSingleNodeDragPreview); Object.assign(__appScope, { hideImperativeSingleNodeDragPreview });
  const singleNodeDragPreviewNodeFor = __s("singleNodeDragPreviewNodeFor", createSingleNodeDragPreviewNodeFor); Object.assign(__appScope, { singleNodeDragPreviewNodeFor });
  const singleNodeDragRelevantEdges = __s("singleNodeDragRelevantEdges", createSingleNodeDragRelevantEdges); Object.assign(__appScope, { singleNodeDragRelevantEdges });
  const singleNodeDragPreviewBounds = __s("singleNodeDragPreviewBounds", createSingleNodeDragPreviewBounds); Object.assign(__appScope, { singleNodeDragPreviewBounds });
  const singleNodeDragEdgeTouchesBounds = __s("singleNodeDragEdgeTouchesBounds", createSingleNodeDragEdgeTouchesBounds); Object.assign(__appScope, { singleNodeDragEdgeTouchesBounds });
  const singleNodeDragViewportLocalEdgesByScan = __s("singleNodeDragViewportLocalEdgesByScan", createSingleNodeDragViewportLocalEdgesByScan); Object.assign(__appScope, { singleNodeDragViewportLocalEdgesByScan });
  const singleNodeDragScopedEdges = __s("singleNodeDragScopedEdges", createSingleNodeDragScopedEdges); Object.assign(__appScope, { singleNodeDragScopedEdges });
  const singleNodeDragPreviewEdges = (dragState: DraggingState, delta: Point) =>
      singleNodeDragScopedEdges(dragState, delta).previewEdges;
  Object.assign(__appScope, { singleNodeDragPreviewEdges });
  const singleNodeDragSnapEdges = (dragState: DraggingState, delta: Point) =>
      singleNodeDragScopedEdges(dragState, delta).snapEdges;
  Object.assign(__appScope, { singleNodeDragSnapEdges });
  const simpleOrthogonalDragPreviewPoints = __s("simpleOrthogonalDragPreviewPoints", createSimpleOrthogonalDragPreviewPoints); Object.assign(__appScope, { simpleOrthogonalDragPreviewPoints });
  const routableLineIdsConnectedToNodeIds = __s("routableLineIdsConnectedToNodeIds", createRoutableLineIdsConnectedToNodeIds); Object.assign(__appScope, { routableLineIdsConnectedToNodeIds });
  const buildRoutableLinePreviewRoutesForNodeUpdates = __s("buildRoutableLinePreviewRoutesForNodeUpdates", createBuildRoutableLinePreviewRoutesForNodeUpdates); Object.assign(__appScope, { buildRoutableLinePreviewRoutesForNodeUpdates });
  const buildRoutableLineEndpointPreviewNodeUpdates = __s("buildRoutableLineEndpointPreviewNodeUpdates", createBuildRoutableLineEndpointPreviewNodeUpdates); Object.assign(__appScope, { buildRoutableLineEndpointPreviewNodeUpdates });
  const buildTranslatedInternalRoutableLineDragPreviewRoutes = __s("buildTranslatedInternalRoutableLineDragPreviewRoutes", createBuildTranslatedInternalRoutableLineDragPreviewRoutes); Object.assign(__appScope, { buildTranslatedInternalRoutableLineDragPreviewRoutes });
  const buildRoutableLineDragPreviewRoutes = __s("buildRoutableLineDragPreviewRoutes", createBuildRoutableLineDragPreviewRoutes); Object.assign(__appScope, { buildRoutableLineDragPreviewRoutes });
  const shiftedDragPreviewPoint = (point: Point | undefined, delta: Point | undefined) =>
      point && delta ? { x: point.x + delta.x, y: point.y + delta.y } : point;
  Object.assign(__appScope, { shiftedDragPreviewPoint });
  const shiftPreviewEndpointForDelta = (point: Point, moves: boolean, delta: Point) =>
      moves ? { x: point.x + delta.x, y: point.y + delta.y } : point;
  Object.assign(__appScope, { shiftPreviewEndpointForDelta });
  const buildCachedSingleNodeDragPreviewRoutes = __s("buildCachedSingleNodeDragPreviewRoutes", createBuildCachedSingleNodeDragPreviewRoutes); Object.assign(__appScope, { buildCachedSingleNodeDragPreviewRoutes });
  const buildDragPreviewEndpointPoints = __s("buildDragPreviewEndpointPoints", createBuildDragPreviewEndpointPoints); Object.assign(__appScope, { buildDragPreviewEndpointPoints });
  const connectionEndpointPreviewRoutePoints = __s("connectionEndpointPreviewRoutePoints", createConnectionEndpointPreviewRoutePoints); Object.assign(__appScope, { connectionEndpointPreviewRoutePoints });
  const singleNodeDragPreviewKey = (dragState: DraggingState, roundedDelta: Point, previewEdges: Edge[]) =>
      `single:${dragState.nodeIds[0] ?? ""}:${roundedDelta.x},${roundedDelta.y}:${previewEdges.length}:${previewEdges[0]?.id ?? ""}:${previewEdges[previewEdges.length - 1]?.id ?? ""}`;
  Object.assign(__appScope, { singleNodeDragPreviewKey });
  const buildLightweightNodeDragPreviewRoutes = __s("buildLightweightNodeDragPreviewRoutes", createBuildLightweightNodeDragPreviewRoutes); Object.assign(__appScope, { buildLightweightNodeDragPreviewRoutes });
  const buildLightweightNodeDragPreviewRouteMarkup = __s("buildLightweightNodeDragPreviewRouteMarkup", createBuildLightweightNodeDragPreviewRouteMarkup); Object.assign(__appScope, { buildLightweightNodeDragPreviewRouteMarkup });
  const syncImperativeNodeDragPreviewPaths = __s("syncImperativeNodeDragPreviewPaths", createSyncImperativeNodeDragPreviewPaths); Object.assign(__appScope, { syncImperativeNodeDragPreviewPaths });
  const updateNodeDragLightweightEdgePreview = __s("updateNodeDragLightweightEdgePreview", createUpdateNodeDragLightweightEdgePreview); Object.assign(__appScope, { updateNodeDragLightweightEdgePreview });
  const singleNodeDragInteractionNodes = __s("singleNodeDragInteractionNodes", createSingleNodeDragInteractionNodes); Object.assign(__appScope, { singleNodeDragInteractionNodes });
  const multiNodeDragInteractionNodes = __s("multiNodeDragInteractionNodes", createMultiNodeDragInteractionNodes); Object.assign(__appScope, { multiNodeDragInteractionNodes });
  const updateImperativeNodeDragDropHint = __s("updateImperativeNodeDragDropHint", createUpdateImperativeNodeDragDropHint); Object.assign(__appScope, { updateImperativeNodeDragDropHint });
  const findSingleNodeDragSnapTargetAtDelta = __s("findSingleNodeDragSnapTargetAtDelta", createFindSingleNodeDragSnapTargetAtDelta); Object.assign(__appScope, { findSingleNodeDragSnapTargetAtDelta });
  const findMultiNodeDragSnapTargetAtDelta = __s("findMultiNodeDragSnapTargetAtDelta", createFindMultiNodeDragSnapTargetAtDelta); Object.assign(__appScope, { findMultiNodeDragSnapTargetAtDelta });
  const updateSingleNodeDragImperativePreview = __s("updateSingleNodeDragImperativePreview", createUpdateSingleNodeDragImperativePreview); Object.assign(__appScope, { updateSingleNodeDragImperativePreview });
  const startDraggingState = __s("startDraggingState", createStartDraggingState); Object.assign(__appScope, { startDraggingState });
  const flushConnectPreviewDom = __s("flushConnectPreviewDom", createFlushConnectPreviewDom); Object.assign(__appScope, { flushConnectPreviewDom });
  const setConnectPreviewDom = __s("setConnectPreviewDom", createSetConnectPreviewDom); Object.assign(__appScope, { setConnectPreviewDom });
  const applyConnectPreviewState = __s("applyConnectPreviewState", createApplyConnectPreviewState); Object.assign(__appScope, { applyConnectPreviewState });
  const scheduleConnectPreviewPoint = __s("scheduleConnectPreviewPoint", createScheduleConnectPreviewPoint); Object.assign(__appScope, { scheduleConnectPreviewPoint });
  const applyRoutableLinePreviewState = __s("applyRoutableLinePreviewState", createApplyRoutableLinePreviewState); Object.assign(__appScope, { applyRoutableLinePreviewState });
  const scheduleRoutableLinePreviewPoint = __s("scheduleRoutableLinePreviewPoint", createScheduleRoutableLinePreviewPoint); Object.assign(__appScope, { scheduleRoutableLinePreviewPoint });
  const releaseRoutableLinePreviewAxisLock = __s("releaseRoutableLinePreviewAxisLock", createReleaseRoutableLinePreviewAxisLock); Object.assign(__appScope, { releaseRoutableLinePreviewAxisLock });
  const routableLinePreviewAxisReferencePoint = () =>
      routableLinePlacement?.manualPoints?.[routableLinePlacement.manualPoints.length - 1] ??
      (routableLinePlacement?.source ? connectTargetPoint(routableLinePlacement.source) : null);
  Object.assign(__appScope, { routableLinePreviewAxisReferencePoint });
  const lockRoutableLinePreviewAxis = __s("lockRoutableLinePreviewAxis", createLockRoutableLinePreviewAxis); Object.assign(__appScope, { lockRoutableLinePreviewAxis });
  const appendRoutableLinePreviewManualPoint = __s("appendRoutableLinePreviewManualPoint", createAppendRoutableLinePreviewManualPoint); Object.assign(__appScope, { appendRoutableLinePreviewManualPoint });
  const resolveRoutableLinePreviewPoint = __s("resolveRoutableLinePreviewPoint", createResolveRoutableLinePreviewPoint); Object.assign(__appScope, { resolveRoutableLinePreviewPoint });
  const resetRoutableLinePreviewState = __s("resetRoutableLinePreviewState", createResetRoutableLinePreviewState); Object.assign(__appScope, { resetRoutableLinePreviewState });
  const scheduleRewirePreviewPoint = __s("scheduleRewirePreviewPoint", createScheduleRewirePreviewPoint); Object.assign(__appScope, { scheduleRewirePreviewPoint });
  const resetConnectPreviewState = __s("resetConnectPreviewState", createResetConnectPreviewState); Object.assign(__appScope, { resetConnectPreviewState });
  // ESC 键取消连接预览
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && connectSource) {
        setConnectSource(null);
        resetConnectPreviewState();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [connectSource]);
  const releaseConnectPreviewAxisLock = __s("releaseConnectPreviewAxisLock", createReleaseConnectPreviewAxisLock); Object.assign(__appScope, { releaseConnectPreviewAxisLock });
  const connectSourceEndpointPoint = __s("connectSourceEndpointPoint", createConnectSourceEndpointPoint); Object.assign(__appScope, { connectSourceEndpointPoint });
  const connectPreviewAxisReferencePoint = () =>
      connectSource?.manualPoints?.[connectSource.manualPoints.length - 1] ?? connectSourceEndpointPoint();
  Object.assign(__appScope, { connectPreviewAxisReferencePoint });
  const lockConnectPreviewAxis = __s("lockConnectPreviewAxis", createLockConnectPreviewAxis); Object.assign(__appScope, { lockConnectPreviewAxis });
  const appendConnectPreviewManualPoint = __s("appendConnectPreviewManualPoint", createAppendConnectPreviewManualPoint); Object.assign(__appScope, { appendConnectPreviewManualPoint });
  const resolveConnectPreviewPoint = __s("resolveConnectPreviewPoint", createResolveConnectPreviewPoint); Object.assign(__appScope, { resolveConnectPreviewPoint });
  const axisLockedDelta = (dx: number, dy: number): Point => (
      Math.abs(dx) >= Math.abs(dy) ? { x: dx, y: 0 } : { x: 0, y: dy }
    );
  Object.assign(__appScope, { axisLockedDelta });
  const boundedDeltaForNodes = __s("boundedDeltaForNodes", createBoundedDeltaForNodes); Object.assign(__appScope, { boundedDeltaForNodes });
  const boundedDeltaForMultiNodeInteractiveMove = __s("boundedDeltaForMultiNodeInteractiveMove", createBoundedDeltaForMultiNodeInteractiveMove); Object.assign(__appScope, { boundedDeltaForMultiNodeInteractiveMove });
  const nodeMoveGeometryInsideCanvas = __s("nodeMoveGeometryInsideCanvas", createNodeMoveGeometryInsideCanvas); Object.assign(__appScope, { nodeMoveGeometryInsideCanvas });
  const nearestBoundarySafeDelta = __s("nearestBoundarySafeDelta", createNearestBoundarySafeDelta); Object.assign(__appScope, { nearestBoundarySafeDelta });
  const boundedDeltaForMoveGeometry = __s("boundedDeltaForMoveGeometry", createBoundedDeltaForMoveGeometry); Object.assign(__appScope, { boundedDeltaForMoveGeometry });
  const commitSafeDeltaForDraggingState = __s("commitSafeDeltaForDraggingState", createCommitSafeDeltaForDraggingState); Object.assign(__appScope, { commitSafeDeltaForDraggingState });
  const canvasBoundsForMoveDelta = (
      nodeIds: string[],
      originalPositions: Record<string, Point>,
      dx: number,
      dy: number
    ) => canvasBoundsForMovedNodeDelta(nodeIds, originalPositions, dx, dy);
  Object.assign(__appScope, { canvasBoundsForMoveDelta });
  const canvasBoundsForMovedNodeDelta = __s("canvasBoundsForMovedNodeDelta", createCanvasBoundsForMovedNodeDelta); Object.assign(__appScope, { canvasBoundsForMovedNodeDelta });
  const dragBoundsForSmartAlignment = __s("dragBoundsForSmartAlignment", createDragBoundsForSmartAlignment); Object.assign(__appScope, { dragBoundsForSmartAlignment });
  const terminalOutflowAnchorsForSmartAlignmentDrag = __s("terminalOutflowAnchorsForSmartAlignmentDrag", createTerminalOutflowAnchorsForSmartAlignmentDrag); Object.assign(__appScope, { terminalOutflowAnchorsForSmartAlignmentDrag });
  const computeSmartAlignmentSnap = createComputeSmartAlignmentSnap(__appScope); Object.assign(__appScope, { computeSmartAlignmentSnap });
  const computeNodeDragPreviewDelta = __s("computeNodeDragPreviewDelta", createComputeNodeDragPreviewDelta); Object.assign(__appScope, { computeNodeDragPreviewDelta });
  const computeNodeDragDelta = __s("computeNodeDragDelta", createComputeNodeDragDelta); Object.assign(__appScope, { computeNodeDragDelta });
  const applyNodeDragMove = __s("applyNodeDragMove", createApplyNodeDragMove); Object.assign(__appScope, { applyNodeDragMove });
  const scheduleNodeDragMove = __s("scheduleNodeDragMove", createScheduleNodeDragMove); Object.assign(__appScope, { scheduleNodeDragMove });
  const flushPendingNodeDragMove = __s("flushPendingNodeDragMove", createFlushPendingNodeDragMove); Object.assign(__appScope, { flushPendingNodeDragMove });
  const clearNodeDragMoveSchedule = __s("clearNodeDragMoveSchedule", createClearNodeDragMoveSchedule); Object.assign(__appScope, { clearNodeDragMoveSchedule });
  const clearKeyboardMoveCommitSchedule = __s("clearKeyboardMoveCommitSchedule", createClearKeyboardMoveCommitSchedule); Object.assign(__appScope, { clearKeyboardMoveCommitSchedule });
  const clearKeyboardNudgeSchedule = __s("clearKeyboardNudgeSchedule", createClearKeyboardNudgeSchedule); Object.assign(__appScope, { clearKeyboardNudgeSchedule });
  const clearDraggingMoveState = __s("clearDraggingMoveState", createClearDraggingMoveState); Object.assign(__appScope, { clearDraggingMoveState });
  const cancelActiveEditInteractions = __s("cancelActiveEditInteractions", createCancelActiveEditInteractions); Object.assign(__appScope, { cancelActiveEditInteractions });
  const finishDraggingMove = __s("finishDraggingMove", createFinishDraggingMove); Object.assign(__appScope, { finishDraggingMove });
  const finishNodeDrag = __s("finishNodeDrag", createFinishNodeDrag); Object.assign(__appScope, { finishNodeDrag });
  const finishTransformDrag = __s("finishTransformDrag", createFinishTransformDrag); Object.assign(__appScope, { finishTransformDrag });
  const finishKeyboardMove = __s("finishKeyboardMove", createFinishKeyboardMove); Object.assign(__appScope, { finishKeyboardMove });
  const scheduleKeyboardMoveCommit = __s("scheduleKeyboardMoveCommit", createScheduleKeyboardMoveCommit); Object.assign(__appScope, { scheduleKeyboardMoveCommit });
  const applyKeyboardMoveDelta = __s("applyKeyboardMoveDelta", createApplyKeyboardMoveDelta); Object.assign(__appScope, { applyKeyboardMoveDelta });
  const flushPendingKeyboardMove = __s("flushPendingKeyboardMove", createFlushPendingKeyboardMove); Object.assign(__appScope, { flushPendingKeyboardMove });
  const keyboardMoveActiveFrameDelta = __s("keyboardMoveActiveFrameDelta", createKeyboardMoveActiveFrameDelta); Object.assign(__appScope, { keyboardMoveActiveFrameDelta });
  const appendPendingKeyboardMoveDelta = __s("appendPendingKeyboardMoveDelta", createAppendPendingKeyboardMoveDelta); Object.assign(__appScope, { appendPendingKeyboardMoveDelta });
  const scheduleKeyboardNudgeFrame = __s("scheduleKeyboardNudgeFrame", createScheduleKeyboardNudgeFrame); Object.assign(__appScope, { scheduleKeyboardNudgeFrame });
  const releaseKeyboardMoveKey = __s("releaseKeyboardMoveKey", createReleaseKeyboardMoveKey); Object.assign(__appScope, { releaseKeyboardMoveKey });
  const startKeyboardMoveSession = __s("startKeyboardMoveSession", createStartKeyboardMoveSession); Object.assign(__appScope, { startKeyboardMoveSession });
  const nudgeSelectionByKeyboard = __s("nudgeSelectionByKeyboard", createNudgeSelectionByKeyboard); Object.assign(__appScope, { nudgeSelectionByKeyboard });
  const moveSelection = __s("moveSelection", createMoveSelection); Object.assign(__appScope, { moveSelection });
  const undoScopeForNodeFootprintPatch = __s("undoScopeForNodeFootprintPatch", createUndoScopeForNodeFootprintPatch); Object.assign(__appScope, { undoScopeForNodeFootprintPatch });
  const updateSelectedNode = __s("updateSelectedNode", createUpdateSelectedNode); Object.assign(__appScope, { updateSelectedNode });
  const commitNodeFootprintUpdates = __s("commitNodeFootprintUpdates", createCommitNodeFootprintUpdates); Object.assign(__appScope, { commitNodeFootprintUpdates });
  const assignSelectedNodesToModelLayer = __s("assignSelectedNodesToModelLayer", createAssignSelectedNodesToModelLayer); Object.assign(__appScope, { assignSelectedNodesToModelLayer });
  const openLayerAssignmentDialog = __s("openLayerAssignmentDialog", createOpenLayerAssignmentDialog); Object.assign(__appScope, { openLayerAssignmentDialog });
  const applyLayerAssignmentDialog = __s("applyLayerAssignmentDialog", createApplyLayerAssignmentDialog); Object.assign(__appScope, { applyLayerAssignmentDialog });
  const rotateSelectedLayoutUnits = __s("rotateSelectedLayoutUnits", createRotateSelectedLayoutUnits); Object.assign(__appScope, { rotateSelectedLayoutUnits });
  const mirrorSelectedNodes = __s("mirrorSelectedNodes", createMirrorSelectedNodes); Object.assign(__appScope, { mirrorSelectedNodes });
  const updateCanvasSize = __s("updateCanvasSize", createUpdateCanvasSize); Object.assign(__appScope, { updateCanvasSize });
  // 收紧画布：以内容包围盒 + 2*GAP 重设画布，四边均留间隙；某方向达到最小值时内容在该方向居中
  const shrinkCanvasToFitContent = () => {
    const { canvasWidth, canvasHeight, edges, nodes, routedEdges, translateNodeBy, translateEdgeBy, shiftCachedRoutesForCanvasOrigin, clampNodePositionToBounds, clampEdgeGeometryToBounds, setGraphArrays, pushUndoSnapshot, applyCanvasBounds, includeMeasurementGroupBounds } = __appScope;
    // 设备量测文本画在节点外部，calculateNodeVisualBounds 未纳入，需合并量测组边界，避免收紧后量测溢出画布
    const baseBounds = calculateModelGeometryBounds(nodes, routedEdges, 0);
    let left = baseBounds ? baseBounds.left : Number.POSITIVE_INFINITY;
    let right = baseBounds ? baseBounds.right : Number.NEGATIVE_INFINITY;
    let top = baseBounds ? baseBounds.top : Number.POSITIVE_INFINITY;
    let bottom = baseBounds ? baseBounds.bottom : Number.NEGATIVE_INFINITY;
    let hasBounds = Boolean(baseBounds);
    if (includeMeasurementGroupBounds) {
      for (const node of nodes) {
        includeMeasurementGroupBounds(node, (box: { left: number; right: number; top: number; bottom: number }) => {
          left = Math.min(left, box.left);
          right = Math.max(right, box.right);
          top = Math.min(top, box.top);
          bottom = Math.max(bottom, box.bottom);
          hasBounds = true;
        });
      }
    }
    const bounds = hasBounds ? { left, right, top, bottom } : null;
    const GAP = MOVE_BOUNDARY_GUARD;
    const contentWidth = bounds ? bounds.right - bounds.left : 0;
    const contentHeight = bounds ? bounds.bottom - bounds.top : 0;
    const width = clampCanvasDimension(Math.ceil(contentWidth + 2 * GAP), MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, DEFAULT_CANVAS_WIDTH);
    const height = clampCanvasDimension(Math.ceil(contentHeight + 2 * GAP), MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, DEFAULT_CANVAS_HEIGHT);
    // 未缩小时四边均留 GAP 间隙；某方向达到最小值时内容在该方向居中
    const shift = bounds ? {
      x: Math.round((width - contentWidth) / 2) - bounds.left,
      y: Math.round((height - contentHeight) / 2) - bounds.top
    } : { x: 0, y: 0 };
    const shifted = shift.x !== 0 || shift.y !== 0;
    if (width === canvasWidth && height === canvasHeight && !shifted) {
      return;
    }
    pushUndoSnapshot();
    const nextBounds = { width, height };
    const nextNodes = nodes.map((node: ModelNode) => {
      const moved = shifted ? translateNodeBy(node, shift) : node;
      return { ...moved, position: clampNodePositionToBounds(moved, nextBounds) };
    });
    const nextEdges = edges.map((edge: Edge) => clampEdgeGeometryToBounds(shifted ? translateEdgeBy(edge, shift) : edge, nextBounds));
    if (shifted) {
      shiftCachedRoutesForCanvasOrigin(shift);
    }
    setGraphArrays(nextNodes, nextEdges);
    applyCanvasBounds(nextBounds);
  };
  Object.assign(__appScope, { shrinkCanvasToFitContent });
  const commitCanvasSizeDraft = __s("commitCanvasSizeDraft", createCommitCanvasSizeDraft); Object.assign(__appScope, { commitCanvasSizeDraft });
  const resetCanvasSizeDraft = __s("resetCanvasSizeDraft", createResetCanvasSizeDraft); Object.assign(__appScope, { resetCanvasSizeDraft });
  const handleCanvasSizeBlur = __s("handleCanvasSizeBlur", createHandleCanvasSizeBlur); Object.assign(__appScope, { handleCanvasSizeBlur });
  const handleCanvasSizeKeyDown = __s("handleCanvasSizeKeyDown", createHandleCanvasSizeKeyDown); Object.assign(__appScope, { handleCanvasSizeKeyDown });
  const updateParam = __s("updateParam", createUpdateParam); Object.assign(__appScope, { updateParam });
  const applyBatchCommonParamPatch = __s("applyBatchCommonParamPatch", createApplyBatchCommonParamPatch); Object.assign(__appScope, { applyBatchCommonParamPatch });
  const applyBatchCommonParam = __s("applyBatchCommonParam", createApplyBatchCommonParam); Object.assign(__appScope, { applyBatchCommonParam });
  const applyBatchCommonMeasurementGroupSetting = __s("applyBatchCommonMeasurementGroupSetting", createApplyBatchCommonMeasurementGroupSetting); Object.assign(__appScope, { applyBatchCommonMeasurementGroupSetting });
  const batchEditors = useBatchEditors({
      activeSelectedNodeIds,
      nodeById,
      selectedNode,
      inspectorSelectedNode,
      selectedNodeIdsWithMeasurementGroups,
      batchCommonGraphicParamRows,
      batchCommonModelParamRows,
      batchCommonMeasurementGroupRows,
      batchCommonPropertyRowCount,
      layers,
      schemes,
      projectMeasurements,
      nodeDoubleClickDraft,
      setNodeDoubleClickDraft,
      updateParam,
      applyBatchCommonParam,
      applyBatchCommonParamPatch,
      applyBatchCommonMeasurementGroupSetting,
      assignSelectedNodesToModelLayer,
      updateSelectedNode,
      libraryTemplateByKind,
    });
  Object.assign(__appScope, { batchEditors });
  const commitElementTreeNodeIdentity = __s("commitElementTreeNodeIdentity", createCommitElementTreeNodeIdentity); Object.assign(__appScope, { commitElementTreeNodeIdentity });
  const commitElementTreeContainerChildParam = __s("commitElementTreeContainerChildParam", createCommitElementTreeContainerChildParam); Object.assign(__appScope, { commitElementTreeContainerChildParam });
  const terminalVbaseFallback = __s("terminalVbaseFallback", createTerminalVbaseFallback); Object.assign(__appScope, { terminalVbaseFallback });
  const updateTerminalVbase = __s("updateTerminalVbase", createUpdateTerminalVbase); Object.assign(__appScope, { updateTerminalVbase });
  const formatDeviceModelParamDisplayValue = (key: string, value: string) =>
      formatPowerBaseDisplayValue(key, value);
  Object.assign(__appScope, { formatDeviceModelParamDisplayValue });
  const renderParamHeader = __s("renderParamHeader", createRenderParamHeader); Object.assign(__appScope, { renderParamHeader });
  const renderChineseParamHeader = (key: string, fallback = key) => (
      batchEditors.renderParamHeader(key, key, PARAM_LABELS[key] ?? fallback)
    );
  Object.assign(__appScope, { renderChineseParamHeader });
  const renderNodeDoubleClickDeviceParamRows = __s("renderNodeDoubleClickDeviceParamRows", createRenderNodeDoubleClickDeviceParamRows); Object.assign(__appScope, { renderNodeDoubleClickDeviceParamRows });
  const renderNodeDoubleClickContainerParamRows = (node: ModelNode, view: ContainerDeviceParameterView) => (
      view.rows.map((row) => {
        const displayValue = formatDeviceModelParamDisplayValue(row.key, row.value);
        const optionConfig = enumSelectOptionsWithCurrentValue(paramOptionsForSection(row.key, view.componentLibrary), displayValue);
        const options = optionConfig.options;
        return (
          <tr key={row.key}>
            {batchEditors.renderParamHeader(row.key, row.label, PARAM_LABELS[row.key] ?? row.label)}
            <td>
              {row.key === "name" && view.kind === "container" ? (
                <BufferedTextInput value={node.name} onCommit={(nextValue) => batchEditors.updateNodeDoubleClickDraftPatch(node.id, { name: nextValue })} />
              ) : row.readonly || !row.paramKey ? (
                <Input value={displayValue} readOnly />
              ) : options ? (
                <Select value={displayValue} onChange={(value) => batchEditors.updateNodeDoubleClickDraftParam(node.id, row.paramKey!, value)} options={options.map((option) => ({ value: option, label: option === optionConfig.invalidValue ? invalidEnumOptionLabel(option) : option, disabled: option === optionConfig.invalidValue }))} />
              ) : (
                <BufferedTextInput value={displayValue} onCommit={(nextValue) => batchEditors.updateNodeDoubleClickDraftParam(node.id, row.paramKey!, nextValue)} />
              )}
            </td>
          </tr>
        );
      })
    );
  Object.assign(__appScope, { renderNodeDoubleClickContainerParamRows });
  const renderNodeDoubleClickTextParamTable = (dialogNode: ModelNode) => (
      <table className="param-table node-double-click-param-table">
        <tbody>
          <tr>
            {batchEditors.renderChineseParamHeader("text")}
            <td><BufferedTextarea rows={7} value={dialogNode.params.text || ""} onCommit={(nextValue) => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, "text", nextValue)} autoFocus /></td>
          </tr>
          <tr>
            {batchEditors.renderChineseParamHeader("fontFamily")}
            <td>{batchEditors.renderNodeDoubleClickParamEditor(dialogNode, "fontFamily", dialogNode.params.fontFamily || "Arial", false)}</td>
          </tr>
          <tr>
            {batchEditors.renderChineseParamHeader("fontSize")}
            <td><InputNumber size="small" min={8 as never} max={160 as never} value={dialogNode.params.fontSize || "24"} onChange={(nextValue) => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, "fontSize", String(nextValue ?? ""))} /></td>
          </tr>
          <tr>
            {batchEditors.renderChineseParamHeader("textColor")}
            <td>{batchEditors.renderNodeDoubleClickColorEditor(dialogNode, "textColor", dialogNode.params.textColor || "#111827", "#111827")}</td>
          </tr>
          <tr>
            <th>文字样式</th>
            <td>
              <div className="text-style-actions">
                <TextStyleToggleButton
                  active={(dialogNode.params.fontWeight || "400") !== "400"}
                  label="加粗"
                  onClick={() => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, "fontWeight", (dialogNode.params.fontWeight || "400") !== "400" ? "400" : "700")}
                >
                  <Bold aria-hidden="true" />
                </TextStyleToggleButton>
                <TextStyleToggleButton
                  active={(dialogNode.params.fontStyle || "normal") === "italic"}
                  label="斜体"
                  onClick={() => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, "fontStyle", (dialogNode.params.fontStyle || "normal") === "italic" ? "normal" : "italic")}
                >
                  <Italic aria-hidden="true" />
                </TextStyleToggleButton>
                <TextStyleToggleButton
                  active={(dialogNode.params.textDecoration || "none") === "underline"}
                  label="下划线"
                  onClick={() => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, "textDecoration", (dialogNode.params.textDecoration || "none") === "underline" ? "none" : "underline")}
                >
                  <Underline aria-hidden="true" />
                </TextStyleToggleButton>
              </div>
            </td>
          </tr>
          <tr>
            {batchEditors.renderChineseParamHeader("textAlign")}
            <td>{batchEditors.renderNodeDoubleClickParamEditor(dialogNode, "textAlign", dialogNode.params.textAlign || "center", false)}</td>
          </tr>
          <tr>
            {batchEditors.renderChineseParamHeader("verticalAlign")}
            <td>{batchEditors.renderNodeDoubleClickParamEditor(dialogNode, "verticalAlign", dialogNode.params.verticalAlign || "middle", false)}</td>
          </tr>
        </tbody>
      </table>
    );
  Object.assign(__appScope, { renderNodeDoubleClickTextParamTable });
  const rememberNodeDoubleClickDialogGuard = __s("rememberNodeDoubleClickDialogGuard", createRememberNodeDoubleClickDialogGuard); Object.assign(__appScope, { rememberNodeDoubleClickDialogGuard });
  const suppressNodeDoubleClickDialogEvent = __s("suppressNodeDoubleClickDialogEvent", createSuppressNodeDoubleClickDialogEvent); Object.assign(__appScope, { suppressNodeDoubleClickDialogEvent });
  const finishNodeDoubleClickDialogPointerOperation = __s("finishNodeDoubleClickDialogPointerOperation", createFinishNodeDoubleClickDialogPointerOperation); Object.assign(__appScope, { finishNodeDoubleClickDialogPointerOperation });
  const stopNodeDoubleClickDialogEvent = __s("stopNodeDoubleClickDialogEvent", createStopNodeDoubleClickDialogEvent); Object.assign(__appScope, { stopNodeDoubleClickDialogEvent });
  const currentNodeDoubleClickDialogRect = __s("currentNodeDoubleClickDialogRect", createCurrentNodeDoubleClickDialogRect); Object.assign(__appScope, { currentNodeDoubleClickDialogRect });
  const startNodeDoubleClickDialogDrag = __s("startNodeDoubleClickDialogDrag", createStartNodeDoubleClickDialogDrag); Object.assign(__appScope, { startNodeDoubleClickDialogDrag });
  const startNodeDoubleClickDialogResize = __s("startNodeDoubleClickDialogResize", createStartNodeDoubleClickDialogResize); Object.assign(__appScope, { startNodeDoubleClickDialogResize });
  const cancelNodeDoubleClickDialog = __s("cancelNodeDoubleClickDialog", createCancelNodeDoubleClickDialog); Object.assign(__appScope, { cancelNodeDoubleClickDialog });
  const confirmNodeDoubleClickDialog = __s("confirmNodeDoubleClickDialog", createConfirmNodeDoubleClickDialog); Object.assign(__appScope, { confirmNodeDoubleClickDialog });
  const renderNodeDoubleClickDialog = __s("renderNodeDoubleClickDialog", createRenderNodeDoubleClickDialog); Object.assign(__appScope, { renderNodeDoubleClickDialog });
  const contextMenuPlacement = __s("contextMenuPlacement", createContextMenuPlacement); Object.assign(__appScope, { contextMenuPlacement });
  const contextMenuStyle = __s("contextMenuStyle", createContextMenuStyle); Object.assign(__appScope, { contextMenuStyle });
  const contextMenuClassName = __s("contextMenuClassName", createContextMenuClassName); Object.assign(__appScope, { contextMenuClassName });
  const stopSidePanelEventPropagation = __s("stopSidePanelEventPropagation", createStopSidePanelEventPropagation); Object.assign(__appScope, { stopSidePanelEventPropagation });
  const setSidePanelMode = __s("setSidePanelMode", createSetSidePanelMode); Object.assign(__appScope, { setSidePanelMode });
  const pointerRelatedTargetInside = (event: ReactPointerEvent<HTMLElement>, selector: string) =>
      event.relatedTarget instanceof Element && Boolean(event.relatedTarget.closest(selector));
  Object.assign(__appScope, { pointerRelatedTargetInside });
  const pointerClientTargetInside = __s("pointerClientTargetInside", createPointerClientTargetInside); Object.assign(__appScope, { pointerClientTargetInside });
  const pointerInsideElementRect = __s("pointerInsideElementRect", createPointerInsideElementRect); Object.assign(__appScope, { pointerInsideElementRect });
  const pointerInsideFloatingPanelBounds = (event: ReactPointerEvent<HTMLElement>) => {
    const { leftPanelVisible, rightPanelVisible } = __appScope;
    return (leftPanelVisible && (
        pointerInsideElementRect(event, leftPanelRef.current, 1) ||
        (leftPanelRef.current && isPointerInsideSidePanelViewportEdgeBridge(
          "left",
          event.clientX,
          event.clientY,
          leftPanelRef.current.getBoundingClientRect(),
          window.innerWidth
        ))
      )) ||
      (rightPanelVisible && (
        pointerInsideElementRect(event, rightPanelRef.current, 1) ||
        (rightPanelRef.current && isPointerInsideSidePanelViewportEdgeBridge(
          "right",
          event.clientX,
          event.clientY,
          rightPanelRef.current.getBoundingClientRect(),
          window.innerWidth
        ))
      ));
  };
  Object.assign(__appScope, { pointerInsideFloatingPanelBounds });
  const updateAutoPanelVisibility = __s("updateAutoPanelVisibility", createUpdateAutoPanelVisibility); Object.assign(__appScope, { updateAutoPanelVisibility });
  const activateInspectorFromCanvas = __s("activateInspectorFromCanvas", createActivateInspectorFromCanvas); Object.assign(__appScope, { activateInspectorFromCanvas });
  const openMeasurementEditorForNode = __s("openMeasurementEditorForNode", createOpenMeasurementEditorForNode); Object.assign(__appScope, { openMeasurementEditorForNode });
  const handleSidePanelPointerLeave = __s("handleSidePanelPointerLeave", createHandleSidePanelPointerLeave); Object.assign(__appScope, { handleSidePanelPointerLeave });
  const hideAutoPanelsFromWorkspace = __s("hideAutoPanelsFromWorkspace", createHideAutoPanelsFromWorkspace); Object.assign(__appScope, { hideAutoPanelsFromWorkspace });
  const interactiveStaticDrawingNeedsExplicitFinish = (kind: DeviceKind) =>
      staticConnectorDrawingNeedsExplicitFinish(kind);
  Object.assign(__appScope, { interactiveStaticDrawingNeedsExplicitFinish });
  const appendDistinctStaticDrawingPoint = __s("appendDistinctStaticDrawingPoint", createAppendDistinctStaticDrawingPoint); Object.assign(__appScope, { appendDistinctStaticDrawingPoint });
  const staticDrawingPreviewPoints = (drawing: StaticDrawingState) =>
      appendDistinctStaticDrawingPoint(drawing.points, drawing.previewPoint);
  Object.assign(__appScope, { staticDrawingPreviewPoints });
  const staticDrawingPathData = (kind: DeviceKind, points: Point[]) =>
      staticConnectorDrawingPath(kind, points);
  Object.assign(__appScope, { staticDrawingPathData });
  const renderStaticBoxDrawingPreview = __s("renderStaticBoxDrawingPreview", createRenderStaticBoxDrawingPreview); Object.assign(__appScope, { renderStaticBoxDrawingPreview });
  const startInteractiveStaticDrawing = __s("startInteractiveStaticDrawing", createStartInteractiveStaticDrawing); Object.assign(__appScope, { startInteractiveStaticDrawing });
  const cancelInteractiveStaticDrawing = __s("cancelInteractiveStaticDrawing", createCancelInteractiveStaticDrawing); Object.assign(__appScope, { cancelInteractiveStaticDrawing });
  const finishInteractiveStaticDrawing = __s("finishInteractiveStaticDrawing", createFinishInteractiveStaticDrawing); Object.assign(__appScope, { finishInteractiveStaticDrawing });
  const appendStaticDrawingPoint = createAppendStaticDrawingPoint(__appScope); Object.assign(__appScope, { appendStaticDrawingPoint });
  const updateInteractiveStaticDrawingPreview = createUpdateInteractiveStaticDrawingPreview(__appScope); Object.assign(__appScope, { updateInteractiveStaticDrawingPreview });
  const renderInteractiveStaticDrawingPreview = __s("renderInteractiveStaticDrawingPreview", createRenderInteractiveStaticDrawingPreview); Object.assign(__appScope, { renderInteractiveStaticDrawingPreview });
  const startLibraryDevicePlacement = __s("startLibraryDevicePlacement", createStartLibraryDevicePlacement); Object.assign(__appScope, { startLibraryDevicePlacement });
  const startLibraryGraphTemplatePlacement = __s("startLibraryGraphTemplatePlacement", createStartLibraryGraphTemplatePlacement); Object.assign(__appScope, { startLibraryGraphTemplatePlacement });
  const cancelLibraryPlacement = __s("cancelLibraryPlacement", createCancelLibraryPlacement); Object.assign(__appScope, { cancelLibraryPlacement });
  const updateLibraryPlacementPreview = createUpdateLibraryPlacementPreview(__appScope); Object.assign(__appScope, { updateLibraryPlacementPreview });
  const clearLibraryPlacementPreview = __s("clearLibraryPlacementPreview", createClearLibraryPlacementPreview); Object.assign(__appScope, { clearLibraryPlacementPreview });
  const placeLibraryDeviceAtPoint = __s("placeLibraryDeviceAtPoint", createPlaceLibraryDeviceAtPoint); Object.assign(__appScope, { placeLibraryDeviceAtPoint });
  const commitLibraryPlacementAtPoint = createCommitLibraryPlacementAtPoint(__appScope); Object.assign(__appScope, { commitLibraryPlacementAtPoint });
  const renderLibraryPlacementPreview = __s("renderLibraryPlacementPreview", createRenderLibraryPlacementPreview); Object.assign(__appScope, { renderLibraryPlacementPreview });
  const startSidePanelResize = __s("startSidePanelResize", createStartSidePanelResize); Object.assign(__appScope, { startSidePanelResize });
  const startCanvasResize = __s("startCanvasResize", createStartCanvasResize); Object.assign(__appScope, { startCanvasResize });
  const startCanvasResizeFromRightOverlay = __s("startCanvasResizeFromRightOverlay", createStartCanvasResizeFromRightOverlay); Object.assign(__appScope, { startCanvasResizeFromRightOverlay });
  const startCanvasResizeFromLeftOverlay = __s("startCanvasResizeFromLeftOverlay", createStartCanvasResizeFromLeftOverlay); Object.assign(__appScope, { startCanvasResizeFromLeftOverlay });
  const startCanvasResizeFromBottomOverlay = __s("startCanvasResizeFromBottomOverlay", createStartCanvasResizeFromBottomOverlay); Object.assign(__appScope, { startCanvasResizeFromBottomOverlay });
  const startCanvasResizeFromTopOverlay = __s("startCanvasResizeFromTopOverlay", createStartCanvasResizeFromTopOverlay); Object.assign(__appScope, { startCanvasResizeFromTopOverlay });
  const startStatusbarResize = __s("startStatusbarResize", createStartStatusbarResize); Object.assign(__appScope, { startStatusbarResize });
  const currentTopologyWarningPanelRect = __s("currentTopologyWarningPanelRect", createCurrentTopologyWarningPanelRect); Object.assign(__appScope, { currentTopologyWarningPanelRect });
  const startTopologyWarningPanelDrag = __s("startTopologyWarningPanelDrag", createStartTopologyWarningPanelDrag); Object.assign(__appScope, { startTopologyWarningPanelDrag });
  const startTopologyWarningPanelResize = __s("startTopologyWarningPanelResize", createStartTopologyWarningPanelResize); Object.assign(__appScope, { startTopologyWarningPanelResize });
  const renderSidePanelModeControls = __s("renderSidePanelModeControls", createRenderSidePanelModeControls); Object.assign(__appScope, { renderSidePanelModeControls });
  const renderSidePanelEdgeTrigger = __s("renderSidePanelEdgeTrigger", createRenderSidePanelEdgeTrigger); Object.assign(__appScope, { renderSidePanelEdgeTrigger });
  const normalizeScale = (value: number, fallback = 1) => normalizeScaleValue(value, fallback); Object.assign(__appScope, { normalizeScale });
  const signedScale = (value: number, signSource: number) => Math.abs(normalizeScale(value)) * (Math.sign(signSource) || 1); Object.assign(__appScope, { signedScale });
  const normalizeStaticBoxDimension = __s("normalizeStaticBoxDimension", createNormalizeStaticBoxDimension); Object.assign(__appScope, { normalizeStaticBoxDimension });
  const toLocalNodePoint = __s("toLocalNodePoint", createToLocalNodePoint); Object.assign(__appScope, { toLocalNodePoint });
  const snapshotSingleTransformNode = (node: ModelNode): GroupTransformNodeSnapshot => ({
      position: { ...node.position },
      rotation: node.rotation,
      scale: node.scale,
      scaleX: node.scaleX,
      scaleY: node.scaleY
    });
  Object.assign(__appScope, { snapshotSingleTransformNode });
  const singleTransformBaseNode = (drag: SingleTransformDrag, node: ModelNode): ModelNode => ({
      ...node,
      position: { ...drag.originalNode.position },
      rotation: drag.originalNode.rotation,
      scale: drag.originalNode.scale,
      scaleX: drag.originalNode.scaleX,
      scaleY: drag.originalNode.scaleY
    });
  Object.assign(__appScope, { singleTransformBaseNode });
  const singleTransformNodeUpdate = __s("singleTransformNodeUpdate", createSingleTransformNodeUpdate); Object.assign(__appScope, { singleTransformNodeUpdate });
  const signedScaleFromRotatedHandleDelta = __s("signedScaleFromRotatedHandleDelta", createSignedScaleFromRotatedHandleDelta); Object.assign(__appScope, { signedScaleFromRotatedHandleDelta });
  const signedScaleFromUprightHandleDelta = __s("signedScaleFromUprightHandleDelta", createSignedScaleFromUprightHandleDelta); Object.assign(__appScope, { signedScaleFromUprightHandleDelta });
  const proportionalSignedScaleFromHandleDelta = __s("proportionalSignedScaleFromHandleDelta", createProportionalSignedScaleFromHandleDelta); Object.assign(__appScope, { proportionalSignedScaleFromHandleDelta });
  const proportionalSignedScaleFromUprightHandleDelta = __s("proportionalSignedScaleFromUprightHandleDelta", createProportionalSignedScaleFromUprightHandleDelta); Object.assign(__appScope, { proportionalSignedScaleFromUprightHandleDelta });
  const snapshotGroupTransformNodes = (unit: CanvasLayoutUnit) =>
      Object.fromEntries(
        unit.nodeIds.flatMap((nodeId) => {
          const node = nodeById.get(nodeId);
          return node
            ? [[
                node.id,
                {
                  position: { ...node.position },
                  rotation: node.rotation,
                  scale: node.scale,
                  scaleX: node.scaleX,
                  scaleY: node.scaleY
                }
              ]]
            : [];
        })
      ) as Record<string, GroupTransformNodeSnapshot>;
  Object.assign(__appScope, { snapshotGroupTransformNodes });
  const edgeSnapshotFallbackPoints = (edge: Edge | undefined) =>
      edge
        ? [
            edge.sourcePoint ? { ...edge.sourcePoint } : null,
            ...(edge.manualPoints?.map((point: Point) => ({ ...point })) ?? []),
            edge.targetPoint ? { ...edge.targetPoint } : null
          ].filter((point): point is Point => Boolean(point))
        : [];
  Object.assign(__appScope, { edgeSnapshotFallbackPoints });
  const currentStoredRoutePointsForEdge = __s("currentStoredRoutePointsForEdge", createCurrentStoredRoutePointsForEdge); Object.assign(__appScope, { currentStoredRoutePointsForEdge });
  const snapshotGroupTransformEdgeRoutes = (unit: CanvasLayoutUnit): GroupTransformEdgeRouteSnapshot[] =>
      unit.edgeIds.flatMap((edgeId: string) => {
        const routePoints = currentStoredRoutePointsForEdge(edgeById.get(edgeId));
        return routePoints.length >= 2
          ? [{
              edgeId,
              points: routePoints.map((point: Point) => ({ ...point }))
            }]
          : [];
      });
  Object.assign(__appScope, { snapshotGroupTransformEdgeRoutes });
  const buildMirrorLayoutUnitEdgeUpdates = __s("buildMirrorLayoutUnitEdgeUpdates", createBuildMirrorLayoutUnitEdgeUpdates); Object.assign(__appScope, { buildMirrorLayoutUnitEdgeUpdates });
  const buildRotateLayoutUnitEdgeUpdates = __s("buildRotateLayoutUnitEdgeUpdates", createBuildRotateLayoutUnitEdgeUpdates); Object.assign(__appScope, { buildRotateLayoutUnitEdgeUpdates });
  const buildGroupTransformEdgeUpdates = __s("buildGroupTransformEdgeUpdates", createBuildGroupTransformEdgeUpdates); Object.assign(__appScope, { buildGroupTransformEdgeUpdates });
  const overlayEdgeUpdatesForTransform = __s("overlayEdgeUpdatesForTransform", createOverlayEdgeUpdatesForTransform); Object.assign(__appScope, { overlayEdgeUpdatesForTransform });
  const startGroupTransformDrag = __s("startGroupTransformDrag", createStartGroupTransformDrag); Object.assign(__appScope, { startGroupTransformDrag });
  const startSingleTransformDrag = __s("startSingleTransformDrag", createStartSingleTransformDrag); Object.assign(__appScope, { startSingleTransformDrag });
  const startGroupMoveDrag = __s("startGroupMoveDrag", createStartGroupMoveDrag); Object.assign(__appScope, { startGroupMoveDrag });
  const buildGroupTransformNodeUpdates = __s("buildGroupTransformNodeUpdates", createBuildGroupTransformNodeUpdates); Object.assign(__appScope, { buildGroupTransformNodeUpdates });
  const rotateLayoutUnitNodeUpdates = __s("rotateLayoutUnitNodeUpdates", createRotateLayoutUnitNodeUpdates); Object.assign(__appScope, { rotateLayoutUnitNodeUpdates });
  const mirrorLayoutUnitNodeUpdates = __s("mirrorLayoutUnitNodeUpdates", createMirrorLayoutUnitNodeUpdates); Object.assign(__appScope, { mirrorLayoutUnitNodeUpdates });
  const busAnchorFromEvent = __s("busAnchorFromEvent", createBusAnchorFromEvent); Object.assign(__appScope, { busAnchorFromEvent });
  const busAnchorFromPoint = __s("busAnchorFromPoint", createBusAnchorFromPoint); Object.assign(__appScope, { busAnchorFromPoint });
  const isPointOnBus = __s("isPointOnBus", createIsPointOnBus); Object.assign(__appScope, { isPointOnBus });
  const isPointNearBus = __s("isPointNearBus", createIsPointNearBus); Object.assign(__appScope, { isPointNearBus });
  const connectTargetSnapPoint = (target: ConnectTarget): Point =>
      target.point ?? getTerminalPoint(target.node, target.terminalId);
  Object.assign(__appScope, { connectTargetSnapPoint });
  const findRewireTargetAtPoint = __s("findRewireTargetAtPoint", createFindRewireTargetAtPoint); Object.assign(__appScope, { findRewireTargetAtPoint });
  const findConnectTargetAtPoint = __s("findConnectTargetAtPoint", createFindConnectTargetAtPoint); Object.assign(__appScope, { findConnectTargetAtPoint });
  const findRoutableLineEndpointTargetAtPoint = __s("findRoutableLineEndpointTargetAtPoint", createFindRoutableLineEndpointTargetAtPoint); Object.assign(__appScope, { findRoutableLineEndpointTargetAtPoint });
  const commitRoutableLineDevice = __s("commitRoutableLineDevice", createCommitRoutableLineDevice); Object.assign(__appScope, { commitRoutableLineDevice });
  const startRoutableLineFromTerminal = __s("startRoutableLineFromTerminal", createStartRoutableLineFromTerminal); Object.assign(__appScope, { startRoutableLineFromTerminal });
  const finishRoutableLineToTarget = __s("finishRoutableLineToTarget", createFinishRoutableLineToTarget); Object.assign(__appScope, { finishRoutableLineToTarget });
  const updateRoutableLineEndpointDrag = __s("updateRoutableLineEndpointDrag", createUpdateRoutableLineEndpointDrag); Object.assign(__appScope, { updateRoutableLineEndpointDrag });
  const startRoutableLineEndpointDrag = __s("startRoutableLineEndpointDrag", createStartRoutableLineEndpointDrag); Object.assign(__appScope, { startRoutableLineEndpointDrag });
  const finishRoutableLineEndpointDrag = __s("finishRoutableLineEndpointDrag", createFinishRoutableLineEndpointDrag); Object.assign(__appScope, { finishRoutableLineEndpointDrag });
  const commitNewConnectionEdge = __s("commitNewConnectionEdge", createCommitNewConnectionEdge); Object.assign(__appScope, { commitNewConnectionEdge });
  const finishConnectToTarget = __s("finishConnectToTarget", createFinishConnectToTarget); Object.assign(__appScope, { finishConnectToTarget });
  const finishRewiring = __s("finishRewiring", createFinishRewiring); Object.assign(__appScope, { finishRewiring });
  const handleDrop = __s("handleDrop", createHandleDrop); Object.assign(__appScope, { handleDrop });
  const handleRoutableLineNodePointerDown = __s("handleRoutableLineNodePointerDown", createHandleRoutableLineNodePointerDown); Object.assign(__appScope, { handleRoutableLineNodePointerDown });
  const handleNodePointerDown = __s("handleNodePointerDown", createHandleNodePointerDown); Object.assign(__appScope, { handleNodePointerDown });
  const handleRoutableLineNodePathPointerDown = __s("handleRoutableLineNodePathPointerDown", createHandleRoutableLineNodePathPointerDown); Object.assign(__appScope, { handleRoutableLineNodePathPointerDown });
  const handlePointerMove = __s("handlePointerMove", createHandlePointerMove); Object.assign(__appScope, { handlePointerMove });
  const finishCanvasPanning = __s("finishCanvasPanning", createFinishCanvasPanning); Object.assign(__appScope, { finishCanvasPanning });
  const startCanvasPanning = __s("startCanvasPanning", createStartCanvasPanning); Object.assign(__appScope, { startCanvasPanning });
  const handleCanvasPointerDownCapture = __s("handleCanvasPointerDownCapture", createHandleCanvasPointerDownCapture); Object.assign(__appScope, { handleCanvasPointerDownCapture });
  const clientPointInsideRenderedCanvas = __s("clientPointInsideRenderedCanvas", createClientPointInsideRenderedCanvas); Object.assign(__appScope, { clientPointInsideRenderedCanvas });
  const focusCanvasKeyboardShortcutHost = __s("focusCanvasKeyboardShortcutHost", createFocusCanvasKeyboardShortcutHost); Object.assign(__appScope, { focusCanvasKeyboardShortcutHost });
  const wheelZoomAnchorFromClient = __s("wheelZoomAnchorFromClient", createWheelZoomAnchorFromClient); Object.assign(__appScope, { wheelZoomAnchorFromClient });
  const flushPendingWheelZoom = __s("flushPendingWheelZoom", createFlushPendingWheelZoom); Object.assign(__appScope, { flushPendingWheelZoom });
  const scheduleWheelZoom = __s("scheduleWheelZoom", createScheduleWheelZoom); Object.assign(__appScope, { scheduleWheelZoom });
  const zoomCanvasFromWheelEvent = __s("zoomCanvasFromWheelEvent", createZoomCanvasFromWheelEvent); Object.assign(__appScope, { zoomCanvasFromWheelEvent });
  const handleWheel = __s("handleWheel", createHandleWheel); Object.assign(__appScope, { handleWheel });
  const deleteSelected = __s("deleteSelected", createDeleteSelected); Object.assign(__appScope, { deleteSelected });
  const runContextMenuAction = __s("runContextMenuAction", createRunContextMenuAction); Object.assign(__appScope, { runContextMenuAction });
  const readjustMovedBusConnectionRoutes = __s("readjustMovedBusConnectionRoutes", createReadjustMovedBusConnectionRoutes); Object.assign(__appScope, { readjustMovedBusConnectionRoutes });
  const readjustActiveLayerBusEndpointRoutes = __s("readjustActiveLayerBusEndpointRoutes", createReadjustActiveLayerBusEndpointRoutes); Object.assign(__appScope, { readjustActiveLayerBusEndpointRoutes });
  const cleanupStaleConnectionRoutes = __s("cleanupStaleConnectionRoutes", createCleanupStaleConnectionRoutes); Object.assign(__appScope, { cleanupStaleConnectionRoutes });
  const commitLayoutNodePositions = __s("commitLayoutNodePositions", createCommitLayoutNodePositions); Object.assign(__appScope, { commitLayoutNodePositions });
  const applySelectedNodeLayout = __s("applySelectedNodeLayout", createApplySelectedNodeLayout); Object.assign(__appScope, { applySelectedNodeLayout });
  const autoSpreadCanvasGraphics = __s("autoSpreadCanvasGraphics", createAutoSpreadCanvasGraphics); Object.assign(__appScope, { autoSpreadCanvasGraphics });
  const autoAlignCanvasGraphics = __s("autoAlignCanvasGraphics", createAutoAlignCanvasGraphics); Object.assign(__appScope, { autoAlignCanvasGraphics });
  const voltageBaseSetOptions = useMemo(createAppHookCallback121(__appScope), [nodes, voltageBaseSetDialogOpen]);
  Object.assign(__appScope, { voltageBaseSetOptions });
  const defaultVoltageBaseSetValue = __s("defaultVoltageBaseSetValue", createDefaultVoltageBaseSetValue); Object.assign(__appScope, { defaultVoltageBaseSetValue });
  const voltageBaseSetCandidateNodes = useMemo(createAppHookCallback122(__appScope), [activeSelectedNodeIds, nodes]);
  Object.assign(__appScope, { voltageBaseSetCandidateNodes });
  const { voltageBaseSetHasUniformTargets, voltageBaseSetHasTerminalTargets } = useMemo(() => ({
    voltageBaseSetHasUniformTargets: voltageBaseSetCandidateNodes.some((node: ModelNode) => voltageBaseSettingModeForNode(node) === "uniform"),
    voltageBaseSetHasTerminalTargets: voltageBaseSetCandidateNodes.some((node: ModelNode) => voltageBaseSettingModeForNode(node) === "terminal")
  }), [voltageBaseSetCandidateNodes]);
  Object.assign(__appScope, { voltageBaseSetHasUniformTargets, voltageBaseSetHasTerminalTargets });
  const recommendedVoltageBaseSetMode = __s("recommendedVoltageBaseSetMode", createRecommendedVoltageBaseSetMode); Object.assign(__appScope, { recommendedVoltageBaseSetMode });
  const voltageBaseSetModeLabel =
      voltageBaseSetMode === "byDevice"
        ? "按设备类型自动设置"
        : voltageBaseSetMode === "terminal"
          ? "按端子设置"
          : "统一设置";
  Object.assign(__appScope, { voltageBaseSetModeLabel });
  const voltageBaseSetTerminalRows = useMemo(createAppHookCallback123(__appScope), [voltageBaseSetCandidateNodes, voltageBaseSetDialogOpen, voltageBaseTerminalValues]);
  Object.assign(__appScope, { voltageBaseSetTerminalRows });
  const voltageBaseTerminalRowKey = (row: { nodeId: string; terminalId: string }) => `${row.nodeId}:${row.terminalId}`;
  Object.assign(__appScope, { voltageBaseTerminalRowKey });
  const activeVoltageBaseTerminalRow =
      voltageBaseSetTerminalRows.find((row: { nodeId: string; terminalId: string }) => voltageBaseTerminalRowKey(row) === activeVoltageBaseTerminalKey)
      ?? voltageBaseSetTerminalRows[0]
      ?? null;
  Object.assign(__appScope, { activeVoltageBaseTerminalRow });
  const defaultVoltageBaseTerminalValues = __s("defaultVoltageBaseTerminalValues", createDefaultVoltageBaseTerminalValues); Object.assign(__appScope, { defaultVoltageBaseTerminalValues });
  const defaultVoltageBaseTerminalKey = __s("defaultVoltageBaseTerminalKey", createDefaultVoltageBaseTerminalKey); Object.assign(__appScope, { defaultVoltageBaseTerminalKey });
  const hasVoltageBaseTerminalValues = (values: VoltageBaseTerminalValuesByNodeId) =>
      Object.values(values).some((terminalValues) =>
        Object.values(terminalValues).some((value) => value.trim().length > 0)
      );
  Object.assign(__appScope, { hasVoltageBaseTerminalValues });
  const activeVoltageBaseTerminalValues = __s("activeVoltageBaseTerminalValues", createActiveVoltageBaseTerminalValues); Object.assign(__appScope, { activeVoltageBaseTerminalValues });
  const setVoltageBaseTerminalValue = __s("setVoltageBaseTerminalValue", createSetVoltageBaseTerminalValue); Object.assign(__appScope, { setVoltageBaseTerminalValue });
  const emptyVoltageBaseSetResult = () => ({ nodes, nodeUpdates: [], targetNodeIds: [], changedNodeIds: [] }); Object.assign(__appScope, { emptyVoltageBaseSetResult });
  const mergeVoltageBaseSetResults = __s("mergeVoltageBaseSetResults", createMergeVoltageBaseSetResults); Object.assign(__appScope, { mergeVoltageBaseSetResults });
  const voltageBaseSetReady = __s("voltageBaseSetReady", createVoltageBaseSetReady); Object.assign(__appScope, { voltageBaseSetReady });
  const voltageBaseSetPreviewByScope = useMemo<Partial<Record<VoltageBaseSetScope, ReturnType<typeof setVoltageBaseValuesForScope>>>>(createAppHookCallback124(__appScope), [activeSelectedNodeIds, activeVoltageBaseTerminalKey, edges, nodes, voltageBaseSetDialogOpen, voltageBaseSetHasTerminalTargets, voltageBaseSetHasUniformTargets, voltageBaseSetMode, voltageBaseSetValue, voltageBaseTerminalValues]);
  Object.assign(__appScope, { voltageBaseSetPreviewByScope });
  const voltageBaseSetResultForScope = __s("voltageBaseSetResultForScope", createVoltageBaseSetResultForScope); Object.assign(__appScope, { voltageBaseSetResultForScope });
  const openVoltageBaseSetDialog = __s("openVoltageBaseSetDialog", createOpenVoltageBaseSetDialog); Object.assign(__appScope, { openVoltageBaseSetDialog });
  useEffect(createAppHookCallback125(__appScope), [activeVoltageBaseTerminalKey, voltageBaseSetDialogOpen, voltageBaseSetTerminalRows]);
  const confirmVoltageBaseSetDialog = __s("confirmVoltageBaseSetDialog", createConfirmVoltageBaseSetDialog); Object.assign(__appScope, { confirmVoltageBaseSetDialog });
  const voltageBaseClearPreviewByScope = useMemo<Partial<Record<VoltageBaseClearScope, ReturnType<typeof clearVoltageBaseValuesForScope>>>>(createAppHookCallback126(__appScope), [activeSelectedNodeIds, edges, nodes, voltageBaseClearDialogOpen]);
  const voltageBaseClearResultForScope = (scope: VoltageBaseClearScope) =>
      voltageBaseClearPreviewByScope[scope] ?? clearVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope);
  Object.assign(__appScope, { voltageBaseClearResultForScope });
  const openVoltageBaseClearDialog = __s("openVoltageBaseClearDialog", createOpenVoltageBaseClearDialog); Object.assign(__appScope, { openVoltageBaseClearDialog });
  const confirmVoltageBaseClearDialog = __s("confirmVoltageBaseClearDialog", createConfirmVoltageBaseClearDialog); Object.assign(__appScope, { confirmVoltageBaseClearDialog });
  const connectionRedrawViewportBounds = __s("connectionRedrawViewportBounds", createConnectionRedrawViewportBounds); Object.assign(__appScope, { connectionRedrawViewportBounds });
  const connectionRedrawEdgeIdsForScope = __s("connectionRedrawEdgeIdsForScope", createConnectionRedrawEdgeIdsForScope); Object.assign(__appScope, { connectionRedrawEdgeIdsForScope });
  const connectionRedrawLineNodeIdsForScope = __s("connectionRedrawLineNodeIdsForScope", createConnectionRedrawLineNodeIdsForScope); Object.assign(__appScope, { connectionRedrawLineNodeIdsForScope });
  const connectionRedrawTargetsForScope = __s("connectionRedrawTargetsForScope", createConnectionRedrawTargetsForScope); Object.assign(__appScope, { connectionRedrawTargetsForScope });
  const redrawConnectionRoutes = __s("redrawConnectionRoutes", createRedrawConnectionRoutes); Object.assign(__appScope, { redrawConnectionRoutes });
  const openConnectionRedrawDialog = __s("openConnectionRedrawDialog", createOpenConnectionRedrawDialog); Object.assign(__appScope, { openConnectionRedrawDialog });
  const confirmConnectionRedrawDialog = __s("confirmConnectionRedrawDialog", createConfirmConnectionRedrawDialog); Object.assign(__appScope, { confirmConnectionRedrawDialog });
  const alignSelected = __s("alignSelected", createAlignSelected); Object.assign(__appScope, { alignSelected });
  const distributeSelected = __s("distributeSelected", createDistributeSelected); Object.assign(__appScope, { distributeSelected });
  const findSchemeForProject = (projectId: string) =>
      findProjectRecordInSchemes(schemes, projectId)?.scheme;
  Object.assign(__appScope, { findSchemeForProject });
  const toggleSchemeExpanded = __s("toggleSchemeExpanded", createToggleSchemeExpanded); Object.assign(__appScope, { toggleSchemeExpanded });
  const promptUniqueRecordName = __s("promptUniqueRecordName", createPromptUniqueRecordName); Object.assign(__appScope, { promptUniqueRecordName });
  const cloneProjectRecord = (project: SavedProjectRecord, suffix = "副本", existingNames: string[] = []) =>
      copySavedProjectWithUniqueName(project, existingNames, suffix);
  Object.assign(__appScope, { cloneProjectRecord });
  const cloneProjectRecordWithName = (project: SavedProjectRecord, name: string) =>
      createSavedProject(name, project.project);
  Object.assign(__appScope, { cloneProjectRecordWithName });
  const hasSameName = (name: string, names: string[]) => names.some((item) => item.trim() === name.trim()); Object.assign(__appScope, { hasSameName });
  const cloneProjectRecordForPaste = __s("cloneProjectRecordForPaste", createCloneProjectRecordForPaste); Object.assign(__appScope, { cloneProjectRecordForPaste });
  const schemePathForScheme = __s("schemePathForScheme", createSchemePathForScheme); Object.assign(__appScope, { schemePathForScheme });
  const schemePathForProject = __s("schemePathForProject", createSchemePathForProject); Object.assign(__appScope, { schemePathForProject });
  const schemePathForRecord = __s("schemePathForRecord", createSchemePathForRecord); Object.assign(__appScope, { schemePathForRecord });
  const cloneSchemeRecord = __s("cloneSchemeRecord", createCloneSchemeRecord); Object.assign(__appScope, { cloneSchemeRecord });
  const cloneSchemeRecordWithName = __s("cloneSchemeRecordWithName", createCloneSchemeRecordWithName); Object.assign(__appScope, { cloneSchemeRecordWithName });
  const cloneSchemeRecordForPaste = __s("cloneSchemeRecordForPaste", createCloneSchemeRecordForPaste); Object.assign(__appScope, { cloneSchemeRecordForPaste });
  const clearActiveProjectDisplay = __s("clearActiveProjectDisplay", createClearActiveProjectDisplay); Object.assign(__appScope, { clearActiveProjectDisplay });
  const loadSavedProject = __s("loadSavedProject", createLoadSavedProject); Object.assign(__appScope, { loadSavedProject });
  const loadSavedProjectRecord = __s("loadSavedProjectRecord", createLoadSavedProjectRecord); Object.assign(__appScope, { loadSavedProjectRecord });
  const openProjectFromUrl = __s("openProjectFromUrl", createOpenProjectFromUrl); Object.assign(__appScope, { openProjectFromUrl });
  const requestUnsavedChangeAction = __s("requestUnsavedChangeAction", createRequestUnsavedChangeAction); Object.assign(__appScope, { requestUnsavedChangeAction });
  const requestLoadSavedProject = __s("requestLoadSavedProject", createRequestLoadSavedProject); Object.assign(__appScope, { requestLoadSavedProject });
  const resolveUnsavedChangeAction = __s("resolveUnsavedChangeAction", createResolveUnsavedChangeAction); Object.assign(__appScope, { resolveUnsavedChangeAction });
  const createSchemeRecord = __s("createSchemeRecord", createCreateSchemeRecord); Object.assign(__appScope, { createSchemeRecord });
  const renameSchemeRecord = __s("renameSchemeRecord", createRenameSchemeRecord); Object.assign(__appScope, { renameSchemeRecord });
  const duplicateSchemeRecord = __s("duplicateSchemeRecord", createDuplicateSchemeRecord); Object.assign(__appScope, { duplicateSchemeRecord });
  const deleteSchemeRecord = __s("deleteSchemeRecord", createDeleteSchemeRecord); Object.assign(__appScope, { deleteSchemeRecord });
  const copySelectedRecord = __s("copySelectedRecord", createCopySelectedRecord); Object.assign(__appScope, { copySelectedRecord });
  const deleteSelectedRecords = __s("deleteSelectedRecords", createDeleteSelectedRecords); Object.assign(__appScope, { deleteSelectedRecords });
  const copyProjectRecord = __s("copyProjectRecord", createCopyProjectRecord); Object.assign(__appScope, { copyProjectRecord });
  const copySchemeRecord = __s("copySchemeRecord", createCopySchemeRecord); Object.assign(__appScope, { copySchemeRecord });
  const pasteSchemeClipboardRecord = __s("pasteSchemeClipboardRecord", createPasteSchemeClipboardRecord); Object.assign(__appScope, { pasteSchemeClipboardRecord });
  const pasteProjectClipboardRecord = __s("pasteProjectClipboardRecord", createPasteProjectClipboardRecord); Object.assign(__appScope, { pasteProjectClipboardRecord });
  const pasteSelectedRecord = __s("pasteSelectedRecord", createPasteSelectedRecord); Object.assign(__appScope, { pasteSelectedRecord });
  const commitProjectRecordMove = __s("commitProjectRecordMove", createCommitProjectRecordMove); Object.assign(__appScope, { commitProjectRecordMove });
  const resolveRecordPasteConflict = __s("resolveRecordPasteConflict", createResolveRecordPasteConflict); Object.assign(__appScope, { resolveRecordPasteConflict });
  const moveProjectRecordToScheme = __s("moveProjectRecordToScheme", createMoveProjectRecordToScheme); Object.assign(__appScope, { moveProjectRecordToScheme });
  const moveSchemeRecordToScheme = __s("moveSchemeRecordToScheme", createMoveSchemeRecordToScheme); Object.assign(__appScope, { moveSchemeRecordToScheme });
  // 面板拖动排序的跨层级方案移动（带插入位；目标父级为空串 = 移到根层）。
  const moveSchemeRecordToPosition = __s("moveSchemeRecordToPosition", createMoveSchemeRecordToPosition); Object.assign(__appScope, { moveSchemeRecordToPosition });
  const saveActiveProjectPointer = __s("saveActiveProjectPointer", createSaveActiveProjectPointer); Object.assign(__appScope, { saveActiveProjectPointer });
  const setActiveLayer = __s("setActiveLayer", createSetActiveLayer); Object.assign(__appScope, { setActiveLayer });
  const nextDefaultModelLayerName = __s("nextDefaultModelLayerName", createNextDefaultModelLayerName); Object.assign(__appScope, { nextDefaultModelLayerName });
  const addModelLayer = __s("addModelLayer", createAddModelLayer); Object.assign(__appScope, { addModelLayer });
  const clearLayerNameDraft = __s("clearLayerNameDraft", createClearLayerNameDraft); Object.assign(__appScope, { clearLayerNameDraft });
  const commitModelLayerName = __s("commitModelLayerName", createCommitModelLayerName); Object.assign(__appScope, { commitModelLayerName });
  const handleLayerNameInputKeyDown = __s("handleLayerNameInputKeyDown", createHandleLayerNameInputKeyDown); Object.assign(__appScope, { handleLayerNameInputKeyDown });
  const toggleModelLayerVisibility = __s("toggleModelLayerVisibility", createToggleModelLayerVisibility); Object.assign(__appScope, { toggleModelLayerVisibility });
  const setAllModelLayersVisibility = __s("setAllModelLayersVisibility", createSetAllModelLayersVisibility); Object.assign(__appScope, { setAllModelLayersVisibility });
  const moveModelLayer = __s("moveModelLayer", createMoveModelLayer); Object.assign(__appScope, { moveModelLayer });
  const deleteModelLayer = __s("deleteModelLayer", createDeleteModelLayer); Object.assign(__appScope, { deleteModelLayer });
  const renderLayerManager = createRenderLayerManager(__appScope);
  Object.assign(__appScope, { renderLayerManager });
  const renderDeviceDefinitionMeasurementPanel = __s("renderDeviceDefinitionMeasurementPanel", createRenderDeviceDefinitionMeasurementPanel); Object.assign(__appScope, { renderDeviceDefinitionMeasurementPanel });
  const renderMeasurementConfigDialog = __s("renderMeasurementConfigDialog", createRenderMeasurementConfigDialog); Object.assign(__appScope, { renderMeasurementConfigDialog });
  const renderMeasurementEditorDialog = __s("renderMeasurementEditorDialog", createRenderMeasurementEditorDialog); Object.assign(__appScope, { renderMeasurementEditorDialog });
  const saveCurrentProject = __s("saveCurrentProject", createSaveCurrentProject); Object.assign(__appScope, { saveCurrentProject });
  const renameProjectRecord = __s("renameProjectRecord", createRenameProjectRecord); Object.assign(__appScope, { renameProjectRecord });
  const duplicateProjectRecord = __s("duplicateProjectRecord", createDuplicateProjectRecord); Object.assign(__appScope, { duplicateProjectRecord });
  const duplicateSelectedProjectRecords = __s("duplicateSelectedProjectRecords", createDuplicateSelectedProjectRecords); Object.assign(__appScope, { duplicateSelectedProjectRecords });
  const duplicateSelectedSchemeRecords = __s("duplicateSelectedSchemeRecords", createDuplicateSelectedSchemeRecords); Object.assign(__appScope, { duplicateSelectedSchemeRecords });
  const deleteProjectRecord = __s("deleteProjectRecord", createDeleteProjectRecord); Object.assign(__appScope, { deleteProjectRecord });
  const createBlankProject = __s("createBlankProject", createCreateBlankProject); Object.assign(__appScope, { createBlankProject });
  const programmaticAddDevice = __s("programmaticAddDevice", createProgrammaticAddDevice); Object.assign(__appScope, { programmaticAddDevice });
  const programmaticCreateScheme = __s("programmaticCreateScheme", createProgrammaticCreateScheme); Object.assign(__appScope, { programmaticCreateScheme });
  const programmaticCreateBlankProject = __s("programmaticCreateBlankProject", createProgrammaticCreateBlankProject); Object.assign(__appScope, { programmaticCreateBlankProject });
  const programmaticSelectDevices = __s("programmaticSelectDevices", createProgrammaticSelectDevices); Object.assign(__appScope, { programmaticSelectDevices });
  const programmaticGroupSelected = __s("programmaticGroupSelected", createProgrammaticGroupSelected); Object.assign(__appScope, { programmaticGroupSelected });
  const programmaticDeleteDevices = __s("programmaticDeleteDevices", createProgrammaticDeleteDevices); Object.assign(__appScope, { programmaticDeleteDevices });
  const programmaticUpdateDeviceProperty = __s("programmaticUpdateDeviceProperty", createProgrammaticUpdateDeviceProperty); Object.assign(__appScope, { programmaticUpdateDeviceProperty });
  const programmaticSave = __s("programmaticSave", createProgrammaticSave); Object.assign(__appScope, { programmaticSave });
  const programmaticSaveSelectionAsTemplate = __s("programmaticSaveSelectionAsTemplate", createProgrammaticSaveSelectionAsTemplate); Object.assign(__appScope, { programmaticSaveSelectionAsTemplate });
  // 切空间 / 切模型：改「当前打开的是哪个空间 / 哪个模型」，不是当前模型的图元。
  // 无未保存修改才放行（有则回 bad-request，不弹模态框 —— 程序化调用方点不了）。
  const programmaticSwitchSpace = createProgrammaticSwitchSpace(__appScope); Object.assign(__appScope, { programmaticSwitchSpace });
  const programmaticSwitchModel = __s("programmaticSwitchModel", createProgrammaticSwitchModel); Object.assign(__appScope, { programmaticSwitchModel });
  const programmaticTopologyOperation = createProgrammaticTopologyOperation(__appScope); Object.assign(__appScope, { programmaticTopologyOperation });
  const locateTopologyError = __s("locateTopologyError", createLocateTopologyError); Object.assign(__appScope, { locateTopologyError });
  Object.assign(__appScope, { pushRecentGlyph });
  const runTopologyCalculation = createRunTopologyCalculation(__appScope); Object.assign(__appScope, { runTopologyCalculation });
  const getEdgeEndpointPoint = __s("getEdgeEndpointPoint", createGetEdgeEndpointPoint); Object.assign(__appScope, { getEdgeEndpointPoint });
  const centerViewOnPoint = __s("centerViewOnPoint", createCenterViewOnPoint); Object.assign(__appScope, { centerViewOnPoint });
  const viewportCenterAnchorForPoint = __s("viewportCenterAnchorForPoint", createViewportCenterAnchorForPoint); Object.assign(__appScope, { viewportCenterAnchorForPoint });
  const setViewBoxAtViewportCenter = __s("setViewBoxAtViewportCenter", createSetViewBoxAtViewportCenter); Object.assign(__appScope, { setViewBoxAtViewportCenter });
  const centerViewBoxOnPoint = __s("centerViewBoxOnPoint", createCenterViewBoxOnPoint); Object.assign(__appScope, { centerViewBoxOnPoint });
  const centerViewOnPointAtZoom = __s("centerViewOnPointAtZoom", createCenterViewOnPointAtZoom); Object.assign(__appScope, { centerViewOnPointAtZoom });
  const zoomViewportAtCenter = __s("zoomViewportAtCenter", createZoomViewportAtCenter); Object.assign(__appScope, { zoomViewportAtCenter });
  const resetViewportZoom = __s("resetViewportZoom", createResetViewportZoom); Object.assign(__appScope, { resetViewportZoom });
  const fitWholeCanvasToFrame = __s("fitWholeCanvasToFrame", createFitWholeCanvasToFrame); Object.assign(__appScope, { fitWholeCanvasToFrame });
  const fitWholeCanvasFromBlankDoubleClick = __s("fitWholeCanvasFromBlankDoubleClick", createFitWholeCanvasFromBlankDoubleClick); Object.assign(__appScope, { fitWholeCanvasFromBlankDoubleClick });
  const fitViewToBounds = __s("fitViewToBounds", createFitViewToBounds); Object.assign(__appScope, { fitViewToBounds });
  const fitViewToContent = __s("fitViewToContent", createFitViewToContent); Object.assign(__appScope, { fitViewToContent });
  const focusElementTreeItem = __s("focusElementTreeItem", createFocusElementTreeItem); Object.assign(__appScope, { focusElementTreeItem });
  const jumpToElementTreeItem = __s("jumpToElementTreeItem", createJumpToElementTreeItem); Object.assign(__appScope, { jumpToElementTreeItem });
  const openElementTreeItemContextMenu = __s("openElementTreeItemContextMenu", createOpenElementTreeItemContextMenu); Object.assign(__appScope, { openElementTreeItemContextMenu });
  const setEdgeManualPoints = __s("setEdgeManualPoints", createSetEdgeManualPoints); Object.assign(__appScope, { setEdgeManualPoints });
  const routeManualPoints = __s("routeManualPoints", createRouteManualPoints); Object.assign(__appScope, { routeManualPoints });
  const finishManualPathDrag = __s("finishManualPathDrag", createFinishManualPathDrag); Object.assign(__appScope, { finishManualPathDrag });
  const tidySelectedEdgeRoute = __s("tidySelectedEdgeRoute", createTidySelectedEdgeRoute); Object.assign(__appScope, { tidySelectedEdgeRoute });
  const tidyRoutableLineRoute = __s("tidyRoutableLineRoute", createTidyRoutableLineRoute); Object.assign(__appScope, { tidyRoutableLineRoute });
  const openEdgeContextMenu = __s("openEdgeContextMenu", createOpenEdgeContextMenu); Object.assign(__appScope, { openEdgeContextMenu });
  const captureCanvasPointer = __s("captureCanvasPointer", createCaptureCanvasPointer); Object.assign(__appScope, { captureCanvasPointer });
  const startManualSegmentDrag = __s("startManualSegmentDrag", createStartManualSegmentDrag); Object.assign(__appScope, { startManualSegmentDrag });
  const startManualPointDrag = __s("startManualPointDrag", createStartManualPointDrag); Object.assign(__appScope, { startManualPointDrag });
  const routeSegmentPointerDistance = __s("routeSegmentPointerDistance", createRouteSegmentPointerDistance); Object.assign(__appScope, { routeSegmentPointerDistance });
  const findEditableRouteSegmentIndex = __s("findEditableRouteSegmentIndex", createFindEditableRouteSegmentIndex); Object.assign(__appScope, { findEditableRouteSegmentIndex });
  const findBendInsertRouteSegmentIndex = (routePoints: Point[], point: Point) =>
      routePoints
        .slice(0, -1)
        .map((from, segmentIndex) => ({ from, to: routePoints[segmentIndex + 1], segmentIndex }))
        .filter(({ from, to }) => to && !sameOptionalPoint(from, to) && (from.x === to.x || from.y === to.y))
        .reduce<{ index: number; distance: number } | null>((nearest, candidate) => {
          const distance = routeSegmentPointerDistance(point, candidate.from, candidate.to);
          return !nearest || distance < nearest.distance ? { index: candidate.segmentIndex, distance } : nearest;
        }, null)?.index ?? -1;
  Object.assign(__appScope, { findBendInsertRouteSegmentIndex });
  const connectionHitTolerance = __s("connectionHitTolerance", createConnectionHitTolerance); Object.assign(__appScope, { connectionHitTolerance });
  const findConnectionRouteHitAtPoint = __s("findConnectionRouteHitAtPoint", createFindConnectionRouteHitAtPoint); Object.assign(__appScope, { findConnectionRouteHitAtPoint });
  const insertManualBendAtPoint = __s("insertManualBendAtPoint", createInsertManualBendAtPoint); Object.assign(__appScope, { insertManualBendAtPoint });
  const insertManualBendFromPointer = __s("insertManualBendFromPointer", createInsertManualBendFromPointer); Object.assign(__appScope, { insertManualBendFromPointer });
  const addManualBendFromContextMenu = __s("addManualBendFromContextMenu", createAddManualBendFromContextMenu); Object.assign(__appScope, { addManualBendFromContextMenu });
  const addRoutableLineBendFromContextMenu = __s("addRoutableLineBendFromContextMenu", createAddRoutableLineBendFromContextMenu); Object.assign(__appScope, { addRoutableLineBendFromContextMenu });
  const insertManualBendFromEdgePath = __s("insertManualBendFromEdgePath", createInsertManualBendFromEdgePath); Object.assign(__appScope, { insertManualBendFromEdgePath });
  const handleEdgePathPointerDown = __s("handleEdgePathPointerDown", createHandleEdgePathPointerDown); Object.assign(__appScope, { handleEdgePathPointerDown });
  const deleteManualBendPoint = __s("deleteManualBendPoint", createDeleteManualBendPoint); Object.assign(__appScope, { deleteManualBendPoint });
  const setRoutableLineManualPathPoints = __s("setRoutableLineManualPathPoints", createSetRoutableLineManualPathPoints); Object.assign(__appScope, { setRoutableLineManualPathPoints });
  const insertRoutableLineBendAtPoint = __s("insertRoutableLineBendAtPoint", createInsertRoutableLineBendAtPoint); Object.assign(__appScope, { insertRoutableLineBendAtPoint });
  const insertRoutableLineBendFromPointer = __s("insertRoutableLineBendFromPointer", createInsertRoutableLineBendFromPointer); Object.assign(__appScope, { insertRoutableLineBendFromPointer });
  const startRoutableLineSegmentDrag = __s("startRoutableLineSegmentDrag", createStartRoutableLineSegmentDrag); Object.assign(__appScope, { startRoutableLineSegmentDrag });
  const startRoutableLinePointDrag = __s("startRoutableLinePointDrag", createStartRoutableLinePointDrag); Object.assign(__appScope, { startRoutableLinePointDrag });
  const deleteRoutableLineBendPoint = __s("deleteRoutableLineBendPoint", createDeleteRoutableLineBendPoint); Object.assign(__appScope, { deleteRoutableLineBendPoint });
  const startConnectFromTerminal = __s("startConnectFromTerminal", createStartConnectFromTerminal); Object.assign(__appScope, { startConnectFromTerminal });
  const finishTerminalPress = __s("finishTerminalPress", createFinishTerminalPress); Object.assign(__appScope, { finishTerminalPress });
  const handleTerminalPointerDown = __s("handleTerminalPointerDown", createHandleTerminalPointerDown); Object.assign(__appScope, { handleTerminalPointerDown });
  const ensureSavedBeforeExport = __s("ensureSavedBeforeExport", createEnsureSavedBeforeExport); Object.assign(__appScope, { ensureSavedBeforeExport });
  const svgExportReferencedImageHrefById = createSvgExportReferencedImageHrefById(__appScope); Object.assign(__appScope, { svgExportReferencedImageHrefById });
  const loadSvgImageExportPathById = __s("loadSvgImageExportPathById", createLoadSvgImageExportPathById); Object.assign(__appScope, { loadSvgImageExportPathById });
  const exportSvg = __s("exportSvg", createExportSvg); Object.assign(__appScope, { exportSvg });
  const exportEFile = __s("exportEFile", createExportEFile); Object.assign(__appScope, { exportEFile });
  const exportCimFile = async (...args: unknown[]) => {
    // 必须在异步动态 import 之前同步校验未保存闸门：
    // 若用户刚在「未保存修改」弹窗里点「保存并继续」，skipSaveCheckFlag 仅在同步调用帧内有效，
    // 延后到 await import() 之后校验会被错误拦截。
    if (!ensureSavedBeforeExport()) {
      return false;
    }
    // CIM 导出为低频按需动作：触发时动态加载 src/cim/cim-export，避免占用首屏主包体积
    const { createCimExport } = await import("../cim/cim-export");
    const runner = createCimExport({
      ...__appScope,
      ensureSavedBeforeExport: () => true,
      schemePath: schemePathForScheme(activeSchemeKey),
      apiPath,
      backendErrorMessage,
      showGlobalMessage,
      showGlobalConfirm,
      // 保存成功提示与 SVG/E/JSON 走同一渠道（导出完成弹框，内部缺省回落全局 message）
      // 透传 details / file：告警清单与【查看】凭据都要到弹框里
      showStandaloneExportCompletion: (title: string, message: string, details?: string[], file?: any) => showStandaloneExportCompletionImpl(__appScope, title, message, details ?? [], file ?? null)
    });
    return (runner as (...runnerArgs: unknown[]) => unknown)(...args);
  };
  Object.assign(__appScope, { exportCimFile });
  const exportSvgFile = __s("exportSvgFile", createExportSvgFile); Object.assign(__appScope, { exportSvgFile });
  const exportJsonFile = __s("exportJsonFile", createExportJsonFile); Object.assign(__appScope, { exportJsonFile });
  const exportEDeviceDefinitionFile = __s("exportEDeviceDefinitionFile", createExportEDeviceDefinitionFile); Object.assign(__appScope, { exportEDeviceDefinitionFile });
  const importEDeviceDefinitionFile = __s("importEDeviceDefinitionFile", createImportEDeviceDefinitionFile); Object.assign(__appScope, { importEDeviceDefinitionFile });
  // 导出完成弹框对外通道：其余单文件导出（元件定义/全网拓扑/图元 Symbol/方案/空间/库/用户自定义…）
  // 统一经它报成功，才能拿到带【查看】的弹框，而不是各自一条 toast。
  const showStandaloneExportCompletion = (title: string, message: string, details: string[] = [], file: any = null) =>
    showStandaloneExportCompletionImpl(__appScope, title, message, details, file ?? null);
  Object.assign(__appScope, { showStandaloneExportCompletion });
  const programmaticExportEDeviceDefinition = __s("programmaticExportEDeviceDefinition", createProgrammaticExportEDeviceDefinition); Object.assign(__appScope, { programmaticExportEDeviceDefinition });
  const programmaticImportEDeviceDefinition = __s("programmaticImportEDeviceDefinition", createProgrammaticImportEDeviceDefinition); Object.assign(__appScope, { programmaticImportEDeviceDefinition });
  Object.assign(__appScope, { safeFilePart });
  Object.assign(__appScope, { serializeSchemeRecordForFile });
  Object.assign(__appScope, { isObjectRecord });
  const isProjectFilePayload = __s("isProjectFilePayload", createIsProjectFilePayload); Object.assign(__appScope, { isProjectFilePayload });
  const createImportedSchemeRecord = __s("createImportedSchemeRecord", createCreateImportedSchemeRecord); Object.assign(__appScope, { createImportedSchemeRecord });
  const exportProjectRecordFile = __s("exportProjectRecordFile", createExportProjectRecordFile); Object.assign(__appScope, { exportProjectRecordFile });
  const exportCurrentModelFile = __s("exportCurrentModelFile", createExportCurrentModelFile); Object.assign(__appScope, { exportCurrentModelFile });
  const openModelImportFilePicker = __s("openModelImportFilePicker", createOpenModelImportFilePicker); Object.assign(__appScope, { openModelImportFilePicker });
  const openSvgModelImportFilePicker = __s("openSvgModelImportFilePicker", createOpenSvgModelImportFilePicker); Object.assign(__appScope, { openSvgModelImportFilePicker });
  const openDotModelImportFilePicker = __s("openDotModelImportFilePicker", createOpenDotModelImportFilePicker); Object.assign(__appScope, { openDotModelImportFilePicker });
  const openSchemeImportFilePicker = __s("openSchemeImportFilePicker", createOpenSchemeImportFilePicker); Object.assign(__appScope, { openSchemeImportFilePicker });
  const mergeImportedSchemeIntoExisting = __s("mergeImportedSchemeIntoExisting", createMergeImportedSchemeIntoExisting); Object.assign(__appScope, { mergeImportedSchemeIntoExisting });
  const commitImportedSchemeRecord = __s("commitImportedSchemeRecord", createCommitImportedSchemeRecord); Object.assign(__appScope, { commitImportedSchemeRecord });
  const applyBackendSchemeArchiveImport = __s("applyBackendSchemeArchiveImport", createApplyBackendSchemeArchiveImport); Object.assign(__appScope, { applyBackendSchemeArchiveImport });
  const importSchemeFile = __s("importSchemeFile", createImportSchemeFile); Object.assign(__appScope, { importSchemeFile });
  const commitImportedModelRecord = __s("commitImportedModelRecord", createCommitImportedModelRecord); Object.assign(__appScope, { commitImportedModelRecord });
  const completeImportedModelFeedback = __s("completeImportedModelFeedback", createCompleteImportedModelFeedback); Object.assign(__appScope, { completeImportedModelFeedback });
  const importModelFile = __s("importModelFile", createImportModelFile); Object.assign(__appScope, { importModelFile });
  const importSvgModelFile = __s("importSvgModelFile", createImportSvgModelFile); Object.assign(__appScope, { importSvgModelFile });
  const importDotModelFile = __s("importDotModelFile", createImportDotModelFile); Object.assign(__appScope, { importDotModelFile });
  const resolveDuplicateSchemeImport = __s("resolveDuplicateSchemeImport", createResolveDuplicateSchemeImport); Object.assign(__appScope, { resolveDuplicateSchemeImport });
  const resolveDuplicateModelImport = __s("resolveDuplicateModelImport", createResolveDuplicateModelImport); Object.assign(__appScope, { resolveDuplicateModelImport });
  const exportSchemeRecord = __s("exportSchemeRecord", createExportSchemeRecord); Object.assign(__appScope, { exportSchemeRecord });
  const chooseImage = __s("chooseImage", createChooseImage); Object.assign(__appScope, { chooseImage });
  const applyExistingImage = __s("applyExistingImage", createApplyExistingImage); Object.assign(__appScope, { applyExistingImage });
  const applyIconLibraryCatalogIcon = __s("applyIconLibraryCatalogIcon", createApplyIconLibraryCatalogIcon); Object.assign(__appScope, { applyIconLibraryCatalogIcon });
  const clearSelectedImage = __s("clearSelectedImage", createClearSelectedImage); Object.assign(__appScope, { clearSelectedImage });
  const clearSelectedImageForNode = __s("clearSelectedImageForNode", createClearSelectedImageForNode); Object.assign(__appScope, { clearSelectedImageForNode });
  const createImageFolder = __s("createImageFolder", createCreateImageFolder); Object.assign(__appScope, { createImageFolder });
  const renameImageFolder = __s("renameImageFolder", createRenameImageFolder); Object.assign(__appScope, { renameImageFolder });
  const deleteImageFolder = __s("deleteImageFolder", createDeleteImageFolder); Object.assign(__appScope, { deleteImageFolder });
  const startProjectRecordDrag = __s("startProjectRecordDrag", createStartProjectRecordDrag); Object.assign(__appScope, { startProjectRecordDrag });
  const finishProjectRecordDrag = __s("finishProjectRecordDrag", createFinishProjectRecordDrag); Object.assign(__appScope, { finishProjectRecordDrag });
  // 模型库方案树拖动排序（方案行 / 模型行）——必须在 renderProjectSchemeNode 之前装配。
  const startProjectTreeSortDrag = __s("startProjectTreeSortDrag", createStartProjectTreeSortDrag); Object.assign(__appScope, { startProjectTreeSortDrag });
  const endProjectTreeSortDrag = __s("endProjectTreeSortDrag", createEndProjectTreeSortDrag); Object.assign(__appScope, { endProjectTreeSortDrag });
  const handleProjectTreeDragOver = __s("handleProjectTreeDragOver", createHandleProjectTreeDragOver); Object.assign(__appScope, { handleProjectTreeDragOver });
  const handleProjectTreeDragLeave = __s("handleProjectTreeDragLeave", createHandleProjectTreeDragLeave); Object.assign(__appScope, { handleProjectTreeDragLeave });
  const handleProjectTreeDrop = __s("handleProjectTreeDrop", createHandleProjectTreeDrop); Object.assign(__appScope, { handleProjectTreeDrop });
  const startSchemeRecordDrag = __s("startSchemeRecordDrag", createStartSchemeRecordDrag); Object.assign(__appScope, { startSchemeRecordDrag });
  const finishSchemeRecordDrag = __s("finishSchemeRecordDrag", createFinishSchemeRecordDrag); Object.assign(__appScope, { finishSchemeRecordDrag });
  const renderProjectSchemeNode = __s("renderProjectSchemeNode", createRenderProjectSchemeNode); Object.assign(__appScope, { renderProjectSchemeNode });
  const openBlankProjectLibraryContextMenu = __s("openBlankProjectLibraryContextMenu", createOpenBlankProjectLibraryContextMenu); Object.assign(__appScope, { openBlankProjectLibraryContextMenu });
  const renderProjectPanel = createRenderProjectPanel(__appScope); Object.assign(__appScope, { renderProjectPanel });
  const {
    customDraftTerminalTypes,
    customDraftTerminalAssociations,
    customDraftDefinitionClassName,
    customDraftEditableClassDefinition,
    customDraftInheritedParameterDefinitions,
    customDraftInheritedMeasurementDefinitions,
    customDraftDefaultParams,
    customDraftDefaultParamKeySet,
    customDraftMergedDefaultParams,
    customDraftVisibleParams,
    customDeviceMeasurementParameterDefinitions,
    customDeviceMeasurementPositionDefinitions
  } = useMemo(() => {
    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      customDeviceDraft.terminalAssociations,
      customDeviceDraft.terminalCount
    );
    const isComponentLibraryDefinition =
      customComponentTreeSelection?.kind === "componentLibrary" &&
      customDeviceDefinitionMode === "edit";
    const definitionClassName = isComponentLibraryDefinition
      ? normalizeComponentLibraryName(customComponentTreeSelection.section)
      : normalizeComponentLibraryName(
          customDeviceDraft.isDerivedComponentLibrary
            ? customDeviceDraft.derivedComponentLibrary
            : customDeviceDraft.componentLibrary
        );
    const editableClassDefinition = isComponentLibraryDefinition
      ? resolveEditableComponentLibraryDefinition({
          className: definitionClassName,
          categoryLibraryName: customComponentTreeSelection.categoryLibraryName,
          customComponentLibraries,
          templates: libraryTemplates,
          overrides: deviceDefinitionOverrides
        })
      : null;
    const inheritedParameterDefinitions =
      editableClassDefinition?.inheritedParameterDefinitions ?? [];
    const inheritedMeasurementDefinitions =
      editableClassDefinition?.inheritedMeasurementDefinitions ?? [];
    const defaultParams = (isComponentLibraryDefinition
      ? customDeviceDraft.isDerivedComponentLibrary
        ? []
        : buildComponentLibraryDefaultParameterDefinitions(definitionClassName, terminalTypes, {
            isContainer: customDeviceDraft.isContainer,
            terminalRoles: customDeviceDraft.terminalRoles.slice(0, customDeviceDraft.terminalCount),
            terminalAssociations
          })
      : customDefaultDefinitions(terminalTypes, {
          isContainer: customDeviceDraft.isContainer,
          isDerivedComponentLibrary: customDeviceDraft.isDerivedComponentLibrary as never,
          terminalAssociations,
          existingDefinitions: customDeviceDraft.params
        })
    ).map((definition) => ({
      ...definition,
      ...resolveDeviceParameterDefinitionExportSettings(
        customDeviceDraft.componentKind || customDeviceDraft.componentLibrary,
        { component_type: customDeviceDraft.componentLibrary },
        definition
      )
    }));
    const defaultParamKeySet = new Set(defaultParams.map((row) => row.enName.trim().toLowerCase()));
    const defaultParamOverrideMap = new Map<string, CustomParamDraft>(
      customDeviceDraft.params
        .filter((row: CustomParamDraft) => defaultParamKeySet.has(row.enName.trim().toLowerCase()))
        .map((row: CustomParamDraft) => [row.enName.trim().toLowerCase(), row] as [string, CustomParamDraft])
    );
    const mergedDefaultParams = defaultParams.map((row) => {
      const override = defaultParamOverrideMap.get(row.enName.trim().toLowerCase());
      return override
        ? normalizeDefinitionRowEnumFields({
            ...row,
            valueType: override.valueType,
            typicalValue: override.typicalValue,
            enumOptions: override.enumOptions,
            enumValues: override.enumValues,
            readonly: row.readonly,
            ...(typeof override.exportEnabled === "boolean" ? { exportEnabled: override.exportEnabled } : {}),
            ...(typeof override.exportName === "string" ? { exportName: override.exportName } : {})
          })
        : row;
    });
    const derivedBaseComponentLibrary =
      customDeviceDraft.derivedFromComponentLibrary || customDeviceDraft.componentLibrary;
    const isHiddenDerivedBaseRow = (row: { enName?: unknown }) =>
      !isComponentLibraryDefinition &&
      customDeviceDraft.isDerivedComponentLibrary &&
      isDerivedComponentBaseParamName(row.enName, derivedBaseComponentLibrary);
    const visibleParams = customDeviceDraft.params.filter((row: CustomParamDraft) =>
      !defaultParamKeySet.has(row.enName.trim().toLowerCase()) &&
      !isHiddenDerivedBaseRow(row)
    );
    const measurementParameterDefinitions = [
      ...inheritedParameterDefinitions,
      ...mergedDefaultParams,
      ...visibleParams
    ];
    const customDeviceMeasurementPositionDefinitions = buildMeasurementProfilePositionDefinitions({
      source: {
        kind:
          customDeviceDraft.componentKind ||
          editingCustomDeviceKind ||
          selectedCustomComponentTemplate?.kind ||
          selectedDefinitionTemplate?.kind ||
          "custom-device-draft",
        label: customDeviceDraft.componentName,
        params: {
          component_type: definitionClassName || customDeviceDraft.componentLibrary,
          ...(customDeviceDraft.isDerivedComponentLibrary ? {
            derived_from_component_type: customDeviceDraft.derivedFromComponentLibrary || customDeviceDraft.componentLibrary,
            derived_component_type: customDeviceDraft.derivedComponentLibrary,
            derived_component_library_label: customDeviceDraft.derivedComponentLibraryLabel,
            is_derived_component_library: "1"
          } : {})
        },
        isDerivedComponentLibrary: customDeviceDraft.isDerivedComponentLibrary as never,
        derivedFromComponentLibrary: customDeviceDraft.isDerivedComponentLibrary
          ? customDeviceDraft.derivedFromComponentLibrary || customDeviceDraft.componentLibrary
          : "",
        derivedComponentLibrary: customDeviceDraft.isDerivedComponentLibrary ? customDeviceDraft.derivedComponentLibrary : "",
        derivedComponentLibraryLabel: customDeviceDraft.isDerivedComponentLibrary ? customDeviceDraft.derivedComponentLibraryLabel : "",
        terminalType: terminalTypes[0] ?? "ac",
        terminalCount: terminalTypes.length,
        terminalTypes,
        terminalLabels: customDeviceDraft.terminalLabels.slice(0, terminalTypes.length),
        terminalRoles: customDeviceDraft.terminalRoles.slice(0, terminalTypes.length),
        terminalAssociations: customDeviceDraft.isContainer ? terminalAssociations : undefined,
        isContainer: customDeviceDraft.isContainer,
        parameterDefinitions: measurementParameterDefinitions
      },
      parameterDefinitions: measurementParameterDefinitions,
      libraryTemplates
    });
    return {
      customDraftTerminalTypes: terminalTypes,
      customDraftTerminalAssociations: terminalAssociations,
      customDraftDefinitionClassName: definitionClassName,
      customDraftEditableClassDefinition: editableClassDefinition,
      customDraftInheritedParameterDefinitions: inheritedParameterDefinitions,
      customDraftInheritedMeasurementDefinitions: inheritedMeasurementDefinitions,
      customDraftDefaultParams: defaultParams,
      customDraftDefaultParamKeySet: defaultParamKeySet,
      customDraftMergedDefaultParams: mergedDefaultParams,
      customDraftVisibleParams: visibleParams,
      customDeviceMeasurementParameterDefinitions: measurementParameterDefinitions,
      customDeviceMeasurementPositionDefinitions
    };
  }, [
    customComponentLibraries,
    customComponentTreeSelection,
    customDeviceDefinitionMode,
    customDeviceDraft,
    deviceDefinitionOverrides,
    editingCustomDeviceKind,
    libraryTemplates,
    selectedCustomComponentTemplate,
    selectedDefinitionTemplate
  ]);
  Object.assign(__appScope, {
    customDraftTerminalTypes,
    customDraftTerminalAssociations,
    customDraftEditableClassDefinition,
    customDraftInheritedParameterDefinitions,
    customDraftInheritedMeasurementDefinitions,
    customDraftDefaultParams,
    customDraftDefaultParamKeySet,
    customDraftMergedDefaultParams,
    customDraftVisibleParams
  });
  const customDeviceMeasurementTarget: DeviceDefinitionMeasurementPanelTarget = {
      deviceKind:
        customDraftDefinitionClassName ||
        (selectedCustomComponentTemplate ? deviceDefinitionKeyForTemplate(selectedCustomComponentTemplate) : ""),
      label: customDeviceDraft.componentName.trim() || selectedCustomComponentTemplate?.label || customDraftDefinitionClassName || "未命名元件",
      terminalCount: Math.max(0, customDeviceDraft.terminalCount),
      terminalLabels: customDeviceDraft.terminalLabels,
      parameterDefinitions: customDeviceMeasurementParameterDefinitions,
      positionDefinitions: customDeviceMeasurementPositionDefinitions,
      items: customDeviceDraft.measurementDefinitions,
      setItems: (items) => setCustomDeviceDraft((current: CustomDeviceDraft) => ({ ...current, measurementDefinitions: items, error: "" })),
      selectedRowIndexes: selectedCustomMeasurementRowIndexes,
      setSelectedRowIndexes: setSelectedCustomMeasurementRowIndexes,
      selectionAnchorIndex: customMeasurementSelectionAnchorRef.current,
      setSelectionAnchorIndex: (index) => {
        customMeasurementSelectionAnchorRef.current = index;
      },
      ensureAssociatedField: (position, associatedField, measurementTypeId) => {
        if (position !== "device") return;
        const measurementType = (measurementConfigDraft ?? measurementConfig).measurementTypes
          .find((type: { id: string }) => type.id === measurementTypeId);
        const definition = createMeasurementFieldParameterDefinition(associatedField, {
          cnName: measurementType?.name,
          valueType: measurementType?.valueType === "string" || measurementType?.valueType === "boolean" ? "string" : "float"
        });
        if (!definition) return;
        setCustomDeviceDraft((current: CustomDeviceDraft) => current.params.some((row: CustomParamDraft) => row.enName.trim().toLowerCase() === definition.enName.toLowerCase())
          ? current
          : { ...current, params: [...current.params, { ...definition, id: customParamId() }], error: "" });
      }
    };
  Object.assign(__appScope, { customDeviceMeasurementTarget });
  const customIconStatePageId = customDeviceStatePageId;
  Object.assign(__appScope, { customIconStatePageId });
  const customDevicePreviewLabel = customDeviceDraft.componentName.trim() || customDeviceDraft.componentLibrary || "Unit"; Object.assign(__appScope, { customDevicePreviewLabel });
  const customDevicePreviewSourceTemplate =
      customDeviceDefinitionMode === "edit"
        ? selectedCustomComponentTemplate ?? (selectedDefinitionKind ? selectedDefinitionTemplate : undefined)
        : undefined;
  Object.assign(__appScope, { customDevicePreviewSourceTemplate });
  const customDeviceDefaultStateVisualDraft = createCustomDeviceDefaultStateVisualDraft(__appScope); Object.assign(__appScope, { customDeviceDefaultStateVisualDraft });
  const customStatePreviewRow = isDefaultStatePageId(customIconStatePageId)
      ? defaultStateDraftRow(customDeviceDraft.stateDefinitions, customDeviceDefaultStateVisualDraft())
      : activeStateDraftRow(customDeviceDraft.stateDefinitions, customIconStatePageId);
  const customStatePreviewVisual = stateVisualFromDraftRow(customStatePreviewRow); Object.assign(__appScope, { customStatePreviewVisual });
  const customStatePreviewText = stateVisualText(customStatePreviewVisual); Object.assign(__appScope, { customStatePreviewText });
  const customDevicePreviewImageHref =
      resolveStateVisualImageHref(customStatePreviewVisual, imageAssets) ||
      customDeviceDraft.backgroundImage;
  Object.assign(__appScope, { customDevicePreviewImageHref });
  const customDeviceFallbackImage = useMemo(
      () => generateCustomDeviceImage(customDevicePreviewLabel, customDraftTerminalTypes.length > 0 ? customDraftTerminalTypes : ["ac"]),
      [customDevicePreviewLabel, customDraftTerminalTypes]
    );
  const customDevicePreviewImage =
      customDevicePreviewImageHref ||
      customDeviceFallbackImage;
  Object.assign(__appScope, { customDevicePreviewImage });
  const customDefaultStateSelected = isDefaultStatePageId(customDeviceStatePageId); Object.assign(__appScope, { customDefaultStateSelected });
  const customDevicePreviewWidth = Math.max(1, customDeviceDraft.size.width || 104); Object.assign(__appScope, { customDevicePreviewWidth });
  const customDevicePreviewHeight = Math.max(1, customDeviceDraft.size.height || 64); Object.assign(__appScope, { customDevicePreviewHeight });
  const customDevicePreviewNode = useMemo(() => {
      if (!customDevicePreviewSourceTemplate) {
        return null;
      }
      const terminalCount = Math.max(0, customDeviceDraft.terminalCount);
      const terminalTypes = customDeviceDraft.terminalTypes.slice(0, terminalCount);
      const visualTemplate = {
        ...customDevicePreviewSourceTemplate,
        label: customDevicePreviewLabel || customDevicePreviewSourceTemplate.label,
        size: { ...customDeviceDraft.size },
        params: {
          ...customDevicePreviewSourceTemplate.params,
          ...(customStatePreviewVisual?.value !== undefined && customStatePreviewVisual.value !== "" ? { status: customStatePreviewVisual.value } : {}),
          backgroundImage: "",
          backgroundImageAssetId: ""
        },
        terminalType: terminalTypes[0] ?? customDevicePreviewSourceTemplate.terminalType,
        terminalCount,
        terminalTypes,
        terminalLabels: customDeviceDraft.terminalLabels.slice(0, terminalCount),
        terminalAnchors: createDefaultCustomDeviceTerminalAnchors(terminalCount, customDeviceDraft.terminalAnchors),
        stateDefinitions: customDeviceDraft.stateDefinitions
      };
      const previewNode = createNodeFromTemplate(visualTemplate, { x: 0, y: 0 });
      return {
        ...previewNode,
        id: `custom-device-preview-${customDevicePreviewSourceTemplate.kind}`,
        name: customDevicePreviewLabel
      };
    }, [
      customDevicePreviewSourceTemplate,
      customDevicePreviewLabel,
      customDeviceDraft.size,
      customDeviceDraft.terminalCount,
      customDeviceDraft.terminalTypes,
      customDeviceDraft.terminalLabels,
      customDeviceDraft.terminalAnchors,
      customDeviceDraft.stateDefinitions,
      customStatePreviewVisual?.value
    ]);
  Object.assign(__appScope, { customDevicePreviewNode });
  const customDeviceTerminalAnchors = useMemo(
      () => createDefaultCustomDeviceTerminalAnchors(customDeviceDraft.terminalCount, customDeviceDraft.terminalAnchors),
      [customDeviceDraft.terminalCount, customDeviceDraft.terminalAnchors]
    );
  Object.assign(__appScope, { customDeviceTerminalAnchors });
  const customDeviceTerminalAnchorValue = (value: number) =>
      normalizeCustomDeviceTerminalAnchorCoordinate(value);
  Object.assign(__appScope, { customDeviceTerminalAnchorValue });
  const formatCustomDeviceTerminalAnchorValue = (value: number) =>
      formatSvgNumber(customDeviceTerminalAnchorValue(value));
  Object.assign(__appScope, { formatCustomDeviceTerminalAnchorValue });
  const snapCustomDeviceTerminalAnchor = __s("snapCustomDeviceTerminalAnchor", createSnapCustomDeviceTerminalAnchor); Object.assign(__appScope, { snapCustomDeviceTerminalAnchor });
  const customDeviceTerminalConnectorSegment = __s("customDeviceTerminalConnectorSegment", createCustomDeviceTerminalConnectorSegment); Object.assign(__appScope, { customDeviceTerminalConnectorSegment });
  const updateCustomDeviceTerminalAnchor = __s("updateCustomDeviceTerminalAnchor", createUpdateCustomDeviceTerminalAnchor); Object.assign(__appScope, { updateCustomDeviceTerminalAnchor });
  const updateCustomDeviceStateDraftRow = __s("updateCustomDeviceStateDraftRow", createUpdateCustomDeviceStateDraftRow); Object.assign(__appScope, { updateCustomDeviceStateDraftRow });
  const addCustomDeviceStateDraftRow = __s("addCustomDeviceStateDraftRow", createAddCustomDeviceStateDraftRow); Object.assign(__appScope, { addCustomDeviceStateDraftRow });
  const deleteCustomDeviceStateDraftRow = __s("deleteCustomDeviceStateDraftRow", createDeleteCustomDeviceStateDraftRow); Object.assign(__appScope, { deleteCustomDeviceStateDraftRow });
  const updateCustomDeviceTerminalAnchorFromPreview = __s("updateCustomDeviceTerminalAnchorFromPreview", createUpdateCustomDeviceTerminalAnchorFromPreview); Object.assign(__appScope, { updateCustomDeviceTerminalAnchorFromPreview });
  const definitionVisualPreviewWidth = Math.max(1, definitionVisualDraft?.size.width ?? selectedDefinitionTemplate?.size.width ?? 104); Object.assign(__appScope, { definitionVisualPreviewWidth });
  const definitionVisualPreviewHeight = Math.max(1, definitionVisualDraft?.size.height ?? selectedDefinitionTemplate?.size.height ?? 64); Object.assign(__appScope, { definitionVisualPreviewHeight });
  const definitionVisualTerminalAnchors = definitionVisualDraft
      ? createDefaultCustomDeviceTerminalAnchors(definitionVisualDraft.terminalCount, definitionVisualDraft.terminalAnchors)
      : [];
  Object.assign(__appScope, { definitionVisualTerminalAnchors });
  const definitionVisualTerminalTypes = definitionVisualDraft
      ? definitionVisualDraft.terminalTypes.slice(0, definitionVisualDraft.terminalCount)
      : [];
  Object.assign(__appScope, { definitionVisualTerminalTypes });
  const definitionDefaultStateVisualDraft = createDefinitionDefaultStateVisualDraft(__appScope); Object.assign(__appScope, { definitionDefaultStateVisualDraft });
  const definitionStatePreviewRow = isDefaultStatePageId(definitionStatePageId)
      ? defaultStateDraftRow(definitionStateDraftRows, definitionDefaultStateVisualDraft())
      : activeStateDraftRow(definitionStateDraftRows, definitionStatePageId);
  const definitionStatePreviewVisual = stateVisualFromDraftRow(definitionStatePreviewRow); Object.assign(__appScope, { definitionStatePreviewVisual });
  const definitionVisualPreviewImage =
      resolveStateVisualImageHref(definitionStatePreviewVisual, imageAssets) ||
      definitionVisualDraft?.backgroundImage ||
      "";
  Object.assign(__appScope, { definitionVisualPreviewImage });
  const snapDefinitionTerminalAnchor = __s("snapDefinitionTerminalAnchor", createSnapDefinitionTerminalAnchor); Object.assign(__appScope, { snapDefinitionTerminalAnchor });
  const definitionTerminalConnectorSegment = __s("definitionTerminalConnectorSegment", createDefinitionTerminalConnectorSegment); Object.assign(__appScope, { definitionTerminalConnectorSegment });
  const updateDefinitionTerminalAnchor = __s("updateDefinitionTerminalAnchor", createUpdateDefinitionTerminalAnchor); Object.assign(__appScope, { updateDefinitionTerminalAnchor });
  const updateDefinitionTerminalAnchorFromPreview = __s("updateDefinitionTerminalAnchorFromPreview", createUpdateDefinitionTerminalAnchorFromPreview); Object.assign(__appScope, { updateDefinitionTerminalAnchorFromPreview });
  const loadDefinitionTemplateDraft = __s("loadDefinitionTemplateDraft", createLoadDefinitionTemplateDraft); Object.assign(__appScope, { loadDefinitionTemplateDraft });
  const finishDeviceLibraryDialogPointerOperation = __s("finishDeviceLibraryDialogPointerOperation", createFinishDeviceLibraryDialogPointerOperation); Object.assign(__appScope, { finishDeviceLibraryDialogPointerOperation });
  const deviceLibraryDialogRefForKind = (kind: DeviceLibraryDialogKind) =>
      kind === "definition"
        ? deviceDefinitionDialogRef
        : kind === "measurementConfig"
          ? measurementConfigDialogRef
          : kind === "measurementEditor"
            ? measurementEditorDialogRef
          : customDeviceDialogRef;
  Object.assign(__appScope, { deviceLibraryDialogRefForKind });
  const currentDeviceLibraryDialogRect = __s("currentDeviceLibraryDialogRect", createCurrentDeviceLibraryDialogRect); Object.assign(__appScope, { currentDeviceLibraryDialogRect });
  const deviceLibraryDialogStyle = __s("deviceLibraryDialogStyle", createDeviceLibraryDialogStyle); Object.assign(__appScope, { deviceLibraryDialogStyle });
  const startDeviceLibraryDialogDrag = __s("startDeviceLibraryDialogDrag", createStartDeviceLibraryDialogDrag); Object.assign(__appScope, { startDeviceLibraryDialogDrag });
  const startDeviceLibraryDialogResize = __s("startDeviceLibraryDialogResize", createStartDeviceLibraryDialogResize); Object.assign(__appScope, { startDeviceLibraryDialogResize });
  const stopDeviceLibraryDialogEvent = __s("stopDeviceLibraryDialogEvent", createStopDeviceLibraryDialogEvent); Object.assign(__appScope, { stopDeviceLibraryDialogEvent });
  const openDeviceDefinitionDialog = __s("openDeviceDefinitionDialog", createOpenDeviceDefinitionDialog); Object.assign(__appScope, { openDeviceDefinitionDialog });
  const closeDeviceDefinitionDialog = __s("closeDeviceDefinitionDialog", createCloseDeviceDefinitionDialog); Object.assign(__appScope, { closeDeviceDefinitionDialog });
  const closeCustomDeviceDialog = __s("closeCustomDeviceDialog", createCloseCustomDeviceDialog); Object.assign(__appScope, { closeCustomDeviceDialog });
  const setCustomDeviceDraftCleanBaseline = __s("setCustomDeviceDraftCleanBaseline", createSetCustomDeviceDraftCleanBaseline); Object.assign(__appScope, { setCustomDeviceDraftCleanBaseline });
  const customDeviceDraftHasUnsavedChanges = __s("customDeviceDraftHasUnsavedChanges", createCustomDeviceDraftHasUnsavedChanges); Object.assign(__appScope, { customDeviceDraftHasUnsavedChanges });
  const revertCustomDeviceDraftCurrentTab = __s("revertCustomDeviceDraftCurrentTab", createRevertCustomDeviceDraftCurrentTab); Object.assign(__appScope, { revertCustomDeviceDraftCurrentTab });
  const revertCustomDeviceDraftAll = __s("revertCustomDeviceDraftAll", createRevertCustomDeviceDraftAll); Object.assign(__appScope, { revertCustomDeviceDraftAll });
  const requestCustomDeviceDraftAction = __s("requestCustomDeviceDraftAction", createRequestCustomDeviceDraftAction); Object.assign(__appScope, { requestCustomDeviceDraftAction });
  const resolveCustomDeviceUnsavedPrompt = __s("resolveCustomDeviceUnsavedPrompt", createResolveCustomDeviceUnsavedPrompt); Object.assign(__appScope, { resolveCustomDeviceUnsavedPrompt });
  const requestCustomDeviceDialogView = __s("requestCustomDeviceDialogView", createRequestCustomDeviceDialogView); Object.assign(__appScope, { requestCustomDeviceDialogView });
  const requestCloseCustomDeviceDialog = __s("requestCloseCustomDeviceDialog", createRequestCloseCustomDeviceDialog); Object.assign(__appScope, { requestCloseCustomDeviceDialog });
  const toggleDefinitionGroup = __s("toggleDefinitionGroup", createToggleDefinitionGroup); Object.assign(__appScope, { toggleDefinitionGroup });
  const toggleDefinitionComponentLibrary = __s("toggleDefinitionComponentLibrary", createToggleDefinitionComponentLibrary); Object.assign(__appScope, { toggleDefinitionComponentLibrary });
  const updateDefinitionComponentLibraryCommonParamExport = __s("updateDefinitionComponentLibraryCommonParamExport", createUpdateDefinitionComponentLibraryCommonParamExport); Object.assign(__appScope, { updateDefinitionComponentLibraryCommonParamExport });
  const toggleElementTreeGroup = __s("toggleElementTreeGroup", createToggleElementTreeGroup); Object.assign(__appScope, { toggleElementTreeGroup });
  const toggleElementTreeDeviceGroup = __s("toggleElementTreeDeviceGroup", createToggleElementTreeDeviceGroup); Object.assign(__appScope, { toggleElementTreeDeviceGroup });
  const updateDefinitionDraftRow = __s("updateDefinitionDraftRow", createUpdateDefinitionDraftRow); Object.assign(__appScope, { updateDefinitionDraftRow });
  const addDefinitionDraftRow = __s("addDefinitionDraftRow", createAddDefinitionDraftRow); Object.assign(__appScope, { addDefinitionDraftRow });
  const deleteDefinitionDraftRow = __s("deleteDefinitionDraftRow", createDeleteDefinitionDraftRow); Object.assign(__appScope, { deleteDefinitionDraftRow });
  const updateDefinitionStateDraftRow = __s("updateDefinitionStateDraftRow", createUpdateDefinitionStateDraftRow); Object.assign(__appScope, { updateDefinitionStateDraftRow });
  const addDefinitionStateDraftRow = __s("addDefinitionStateDraftRow", createAddDefinitionStateDraftRow); Object.assign(__appScope, { addDefinitionStateDraftRow });
  const deleteDefinitionStateDraftRow = __s("deleteDefinitionStateDraftRow", createDeleteDefinitionStateDraftRow); Object.assign(__appScope, { deleteDefinitionStateDraftRow });
  const updateSelectedDefinitionResizePermission = __s("updateSelectedDefinitionResizePermission", createUpdateSelectedDefinitionResizePermission); Object.assign(__appScope, { updateSelectedDefinitionResizePermission });
  const saveDeviceDefinitionStateVisualDraft = __s("saveDeviceDefinitionStateVisualDraft", createSaveDeviceDefinitionStateVisualDraft); Object.assign(__appScope, { saveDeviceDefinitionStateVisualDraft });
  const saveDeviceDefinitionVisualDraft = __s("saveDeviceDefinitionVisualDraft", createSaveDeviceDefinitionVisualDraft); Object.assign(__appScope, { saveDeviceDefinitionVisualDraft });
  const saveDeviceDefinitionDraft = __s("saveDeviceDefinitionDraft", createSaveDeviceDefinitionDraft); Object.assign(__appScope, { saveDeviceDefinitionDraft });
  const resetDeviceDefinitionDraft = __s("resetDeviceDefinitionDraft", createResetDeviceDefinitionDraft); Object.assign(__appScope, { resetDeviceDefinitionDraft });
  const updateCustomDraftTerminalCount = __s("updateCustomDraftTerminalCount", createUpdateCustomDraftTerminalCount); Object.assign(__appScope, { updateCustomDraftTerminalCount });
  const chooseCustomDeviceBackground = __s("chooseCustomDeviceBackground", createChooseCustomDeviceBackground); Object.assign(__appScope, { chooseCustomDeviceBackground });
  const chooseDefinitionTemplateIcon = __s("chooseDefinitionTemplateIcon", createChooseDefinitionTemplateIcon); Object.assign(__appScope, { chooseDefinitionTemplateIcon });
  const chooseStateVisualImage = __s("chooseStateVisualImage", createChooseStateVisualImage); Object.assign(__appScope, { chooseStateVisualImage });
  const chooseStateIconDrawingImport = __s("chooseStateIconDrawingImport", createChooseStateIconDrawingImport); Object.assign(__appScope, { chooseStateIconDrawingImport });
  const updateStateIconDrawingElement = __s("updateStateIconDrawingElement", createUpdateStateIconDrawingElement); Object.assign(__appScope, { updateStateIconDrawingElement });
  const updateStateIconDrawingElements = __s("updateStateIconDrawingElements", createUpdateStateIconDrawingElements); Object.assign(__appScope, { updateStateIconDrawingElements });
  const stateIconDrawingPointer = createStateIconDrawingPointer(__appScope); Object.assign(__appScope, { stateIconDrawingPointer });
  const stateIconDrawingSelection = __s("stateIconDrawingSelection", createStateIconDrawingSelection); Object.assign(__appScope, { stateIconDrawingSelection });
  const computeStateIconDrawingSmartAlignmentSnap = __s("computeStateIconDrawingSmartAlignmentSnap", createComputeStateIconDrawingSmartAlignmentSnap); Object.assign(__appScope, { computeStateIconDrawingSmartAlignmentSnap });
  const startStateIconDrawingDrag = __s("startStateIconDrawingDrag", createStartStateIconDrawingDrag); Object.assign(__appScope, { startStateIconDrawingDrag });
  const dragStateIconDrawingSelection = createDragStateIconDrawingSelection(__appScope); Object.assign(__appScope, { dragStateIconDrawingSelection });
  const stopStateIconDrawingDrag = __s("stopStateIconDrawingDrag", createStopStateIconDrawingDrag); Object.assign(__appScope, { stopStateIconDrawingDrag });
  const deleteSelectedStateIconDrawingElements = __s("deleteSelectedStateIconDrawingElements", createDeleteSelectedStateIconDrawingElements); Object.assign(__appScope, { deleteSelectedStateIconDrawingElements });
  const stateIconDrawingKeyDown = __s("stateIconDrawingKeyDown", createStateIconDrawingKeyDown); Object.assign(__appScope, { stateIconDrawingKeyDown });
  const addStateIconDrawingElement = __s("addStateIconDrawingElement", createAddStateIconDrawingElement); Object.assign(__appScope, { addStateIconDrawingElement });
  const deleteStateIconDrawingElement = __s("deleteStateIconDrawingElement", createDeleteStateIconDrawingElement); Object.assign(__appScope, { deleteStateIconDrawingElement });
  const openStateIconDrawingDialog = __s("openStateIconDrawingDialog", createOpenStateIconDrawingDialog); Object.assign(__appScope, { openStateIconDrawingDialog });
  const applyStateIconDrawingDialog = __s("applyStateIconDrawingDialog", createApplyStateIconDrawingDialog); Object.assign(__appScope, { applyStateIconDrawingDialog });
  const stateIconDrawingDefaultDraftRow = (scope: StateIconDrawingTarget["scope"]): DeviceDefinitionStateDraftRow =>
      scope === "definition"
        ? defaultStateDraftRow(definitionStateDraftRows, definitionDefaultStateVisualDraft())
        : defaultStateDraftRow(customDeviceDraft.stateDefinitions, customDeviceDefaultStateVisualDraft());
  Object.assign(__appScope, { stateIconDrawingDefaultDraftRow });
  const stateIconDrawingDraftRowForTarget = (target: StateIconDrawingTarget): DeviceDefinitionStateDraftRow | null => {
      if (isDefaultStatePageId(target.rowId)) {
        return stateIconDrawingDefaultDraftRow(target.scope);
      }
      return target.scope === "definition"
        ? definitionStateDraftRows.find((item: DeviceDefinitionStateDraftRow) => item.id === target.rowId) ?? null
        : customDeviceDraft.stateDefinitions.find((item: DeviceDefinitionStateDraftRow) => item.id === target.rowId) ?? null;
    };
  Object.assign(__appScope, { stateIconDrawingDraftRowForTarget });
  const stateIconDrawingInlineTarget =
      deviceDefinitionDialogOpen && deviceDefinitionView === "visual"
        ? { scope: "definition" as const, rowId: definitionStatePageId }
        : customDeviceDialogOpen && customDeviceDialogView === "icon"
          ? { scope: "custom" as const, rowId: customIconStatePageId }
          : null;
  Object.assign(__appScope, { stateIconDrawingInlineTarget });
  const stateIconDrawingInlineTargetKey = stateIconDrawingInlineTarget
      ? [
          stateIconDrawingInlineTarget.scope,
          stateIconDrawingInlineTarget.rowId,
          isDefaultStatePageId(stateIconDrawingInlineTarget.rowId)
            ? stateIconDrawingInlineTarget.scope === "definition"
              ? [
                  selectedDefinitionTemplate?.kind ?? selectedDefinitionKind ?? "",
                  definitionVisualDraft?.backgroundImageAssetId ?? "",
                  definitionVisualDraft?.backgroundImageFit ?? "",
                  definitionVisualDraft?.size.width ?? "",
                  definitionVisualDraft?.size.height ?? "",
                  definitionVisualDraft?.terminalCount ?? "",
                  definitionVisualTerminalTypes.join(",")
                ].join("/")
              : [
                  customDevicePreviewSourceTemplate?.kind ?? selectedCustomComponentTemplate?.kind ?? selectedDefinitionTemplate?.kind ?? editingCustomDeviceKind ?? "",
                  customDeviceDraft.backgroundImageAssetId,
                  customDeviceDraft.backgroundImageFit,
                  customDeviceDraft.size.width,
                  customDeviceDraft.size.height,
                  customDeviceDraft.terminalCount,
                  customDraftTerminalTypes.join(",")
                ].join("/")
            : ""
        ].join(":")
      : "";
  Object.assign(__appScope, { stateIconDrawingInlineTargetKey });
  const resolveStateIconDrawingImageHref = (href: string) => {
      const id = backendImageIdFromHref(href);
      if (id) {
        const cachedHref = imageAssets[id] ?? "";
        if (isImageDataUrl(cachedHref)) {
          return cachedHref;
        }
      }
      return href;
    };
  Object.assign(__appScope, { resolveStateIconDrawingImageHref });
  const stateIconDrawingInlineHasTerminals = stateIconDrawingDialog
      ? stateIconDrawingDialog.target.scope === "definition"
        ? (Number(definitionVisualDraft?.terminalCount) || definitionVisualTerminalTypes.length) > 0
        : (Number(customDeviceDraft.terminalCount) || customDraftTerminalTypes.length) > 0
      : false;
  Object.assign(__appScope, { stateIconDrawingInlineHasTerminals });
  const stateIconDrawingInlineImage = stateIconDrawingDialog
      ? stateIconDrawingToPersistedImage(stateIconDrawingDialog.elements, {
            resolveImageHref: resolveStateIconDrawingImageHref,
            frame: stateIconDrawingDialog.frame,
            frameHasTerminals: stateIconDrawingInlineHasTerminals
          })
      : "";
  Object.assign(__appScope, { stateIconDrawingInlineImage });
  useEffect(() => {
      if (!stateIconDrawingInlineTarget) {
        stateIconDrawingInitialImageRef.current = null;
        stateIconDrawingHistoryRef.current = [];
        setStateIconDrawingContextMenu(null);
        setStateIconDrawingDialog((current: StateIconDrawingDialogState | null) => (current ? null : current));
        return;
      }
      const targetKey = stateIconDrawingInlineTargetKey;
      setStateIconDrawingDialog((current: StateIconDrawingDialogState | null) => {
        const row = stateIconDrawingDraftRowForTarget(stateIconDrawingInlineTarget);
        const draftSourceImage = stateIconDrawingDraftSourceImage(row, imageAssets);
        const initialSnapshot = stateIconDrawingInitialImageRef.current;
        const targetMatches = Boolean(
          current?.target.scope === stateIconDrawingInlineTarget.scope &&
          current.target.rowId === stateIconDrawingInlineTarget.rowId
        );
        if (
          initialSnapshot &&
          !stateIconDrawingInlineNeedsDraftReload({
            targetMatches,
            keyMatches: initialSnapshot.key === targetKey,
            initialImage: initialSnapshot.image,
            inlineImage: stateIconDrawingInlineImage,
            initialSourceImage: initialSnapshot.sourceImage,
            draftSourceImage
          })
        ) {
          return current;
        }
        const initial = createStateIconDrawingInitialElements(row, imageAssets);
        const initialFrame = stateIconDrawingInitialFrame(row, imageAssets, DEFAULT_STATE_ICON_DRAWING_FRAME);
        stateIconDrawingHistoryRef.current = [];
        setStateIconDrawingContextMenu(null);
        stateIconDrawingInitialImageRef.current = {
          key: targetKey,
          sourceImage: draftSourceImage,
          image: stateIconDrawingToPersistedImage(initial, {
            resolveImageHref: resolveStateIconDrawingImageHref,
            frame: initialFrame,
            frameHasTerminals: stateIconDrawingInlineTarget.scope === "definition"
              ? (Number(definitionVisualDraft?.terminalCount) || definitionVisualTerminalTypes.length) > 0
              : (Number(customDeviceDraft.terminalCount) || customDraftTerminalTypes.length) > 0
          })
        };
        return {
          target: stateIconDrawingInlineTarget,
          elements: initial,
          selectedElementId: initial[0]?.id ?? "",
          selectedElementIds: initial[0]?.id ? [initial[0].id] : [],
          frame: initialFrame
        };
      });
    }, [
      customDeviceDialogOpen,
      customDeviceDialogView,
      customDeviceDraft.backgroundImage,
      customDeviceDraft.backgroundImageAssetId,
      customDeviceDraft.backgroundImageCleared,
      customDeviceDraft.backgroundImageFit,
      customDeviceDraft.stateDefinitions,
      customDeviceDraft.terminalCount,
      customIconStatePageId,
      customDeviceStatePageId,
      definitionVisualDraft?.backgroundImage,
      definitionVisualDraft?.backgroundImageAssetId,
      definitionVisualDraft?.backgroundImageCleared,
      definitionVisualDraft?.backgroundImageFit,
      definitionStateDraftRows,
      definitionStatePageId,
      deviceDefinitionDialogOpen,
      deviceDefinitionView,
      imageAssets,
      stateIconDrawingInlineImage,
      stateIconDrawingInlineTargetKey,
      stateIconDrawingInlineTarget?.rowId,
      stateIconDrawingInlineTarget?.scope
    ]);
  useEffect(() => {
      if (!stateIconDrawingDialog) {
        return;
      }
      const targetMatches = Boolean(
        stateIconDrawingInlineTarget &&
        stateIconDrawingDialog.target.scope === stateIconDrawingInlineTarget.scope &&
        stateIconDrawingDialog.target.rowId === stateIconDrawingInlineTarget.rowId
      );
      const initialSnapshot = stateIconDrawingInitialImageRef.current;
      if (
        !initialSnapshot ||
        !stateIconDrawingInlineCanPersistDraft({
          targetMatches,
          keyMatches: initialSnapshot.key === stateIconDrawingInlineTargetKey,
          initialImage: initialSnapshot.image,
          inlineImage: stateIconDrawingInlineImage
        })
      ) {
        return;
      }
      if (isDefaultStatePageId(stateIconDrawingDialog.target.rowId)) {
        if (stateIconDrawingDialog.target.scope === "definition") {
          if (!definitionVisualDraft) {
            return;
          }
          const imageFieldsAlreadySynced =
            definitionVisualDraft.backgroundImage === stateIconDrawingInlineImage &&
            !definitionVisualDraft.backgroundImageAssetId &&
            (definitionVisualDraft.backgroundImageFit ?? "fixed") === "fixed" &&
            (definitionVisualDraft.backgroundImageCleared ?? "") === (stateIconDrawingInlineImage ? "" : "1");
          if (imageFieldsAlreadySynced) {
            return;
          }
          setDefinitionVisualDraft((current: DeviceDefinitionVisualDraft) =>
            current
              ? {
                  ...current,
                  backgroundImage: stateIconDrawingInlineImage,
                  backgroundImageAssetId: "",
                  backgroundImageFit: "fixed",
                  backgroundImageCleared: stateIconDrawingInlineImage ? "" : "1",
                  error: ""
                }
              : current
          );
        } else {
          const imageFieldsAlreadySynced =
            customDeviceDraft.backgroundImage === stateIconDrawingInlineImage &&
            !customDeviceDraft.backgroundImageAssetId &&
            (customDeviceDraft.backgroundImageFit ?? "fixed") === "fixed" &&
            (customDeviceDraft.backgroundImageCleared ?? "") === (stateIconDrawingInlineImage ? "" : "1");
          if (imageFieldsAlreadySynced) {
            return;
          }
          setCustomDeviceDraft((current: CustomDeviceDraft) => ({
            ...current,
            backgroundImage: stateIconDrawingInlineImage,
            backgroundImageAssetId: "",
            backgroundImageFit: "fixed",
            backgroundImageCleared: stateIconDrawingInlineImage ? "" : "1",
            error: ""
          }));
        }
        return;
      }
      const row =
        stateIconDrawingDialog.target.scope === "definition"
          ? definitionStateDraftRows.find((item: DeviceDefinitionStateDraftRow) => item.id === stateIconDrawingDialog.target.rowId)
          : customDeviceDraft.stateDefinitions.find((item: DeviceDefinitionStateDraftRow) => item.id === stateIconDrawingDialog.target.rowId);
      if (!row) {
        return;
      }
      const imageFieldsAlreadySynced =
        (row.image ?? "") === stateIconDrawingInlineImage &&
        !row.imageAssetId &&
        (row.imageFit ?? "fixed") === "fixed" &&
        !row.backgroundImage &&
        !row.backgroundImageAssetId &&
        (row.backgroundImageFit ?? "fixed") === "fixed" &&
        (row.imageCleared ?? "") === (stateIconDrawingInlineImage ? "" : "1");
      if (imageFieldsAlreadySynced) {
        return;
      }
      const stateIconDrawingInlinePatch: Partial<DeviceDefinitionStateDraftRow> = {
        image: stateIconDrawingInlineImage,
        imageAssetId: "",
        imageFit: "fixed",
        backgroundImage: "",
        backgroundImageAssetId: "",
        backgroundImageFit: "fixed",
        imageCleared: stateIconDrawingInlineImage ? "" : "1"
      };
      if (stateIconDrawingDialog.target.scope === "definition") {
        updateDefinitionStateDraftRow(stateIconDrawingDialog.target.rowId, stateIconDrawingInlinePatch);
      } else {
        updateCustomDeviceStateDraftRow(stateIconDrawingDialog.target.rowId, stateIconDrawingInlinePatch);
      }
    }, [
      stateIconDrawingDialog,
      stateIconDrawingInlineImage,
      stateIconDrawingInlineTarget?.rowId,
      stateIconDrawingInlineTarget?.scope,
      stateIconDrawingInlineTargetKey
    ]);
  const customComponentTreeTypeKey = (categoryLibraryName: string, componentLibrary: string) =>
      `${normalizeCategoryLibraryName(categoryLibraryName)}::${normalizeComponentLibraryName(componentLibrary)}`;
  Object.assign(__appScope, { customComponentTreeTypeKey });
  const handleTreeCollapseChange = useCallback(createAppHookCallback127(__appScope), []);
  Object.assign(__appScope, { handleTreeCollapseChange });
  const ensureCustomComponentTreeExpanded = __s("ensureCustomComponentTreeExpanded", createEnsureCustomComponentTreeExpanded); Object.assign(__appScope, { ensureCustomComponentTreeExpanded });
  const cancelPendingCustomComponentTemplateLoad = __s("cancelPendingCustomComponentTemplateLoad", createCancelPendingCustomComponentTemplateLoad); Object.assign(__appScope, { cancelPendingCustomComponentTemplateLoad });
  const selectCustomCategoryLibrary = __s("selectCustomCategoryLibrary", createSelectCustomCategoryLibrary); Object.assign(__appScope, { selectCustomCategoryLibrary });
  const selectCustomComponentLibrary = __s("selectCustomComponentLibrary", createSelectCustomComponentLibrary); Object.assign(__appScope, { selectCustomComponentLibrary });
  const selectCustomComponentTemplate = __s("selectCustomComponentTemplate", createSelectCustomComponentTemplate); Object.assign(__appScope, { selectCustomComponentTemplate });
  const startCustomComponentCreate = __s("startCustomComponentCreate", createStartCustomComponentCreate); Object.assign(__appScope, { startCustomComponentCreate });
  const copyCustomComponentTemplate = __s("copyCustomComponentTemplate", createCopyCustomComponentTemplate); Object.assign(__appScope, { copyCustomComponentTemplate });
  const pasteCustomComponentTemplate = __s("pasteCustomComponentTemplate", createPasteCustomComponentTemplate); Object.assign(__appScope, { pasteCustomComponentTemplate });
  const exportCustomComponentTemplateSvg = __s("exportCustomComponentTemplateSvg", createExportCustomComponentTemplateSvg); Object.assign(__appScope, { exportCustomComponentTemplateSvg });
  const exportComponentSymbols = __s("exportComponentSymbols", createExportComponentSymbols); Object.assign(__appScope, { exportComponentSymbols });
  const exportComponentSymbolsStandalone = __s("exportComponentSymbolsStandalone", createExportComponentSymbolsStandalone); Object.assign(__appScope, { exportComponentSymbolsStandalone });
  const loadSymbolExportSchemes = __s("loadSymbolExportSchemes", createLoadSymbolExportSchemes); Object.assign(__appScope, { loadSymbolExportSchemes });
  const saveSymbolExportScheme = __s("saveSymbolExportScheme", createSaveSymbolExportScheme); Object.assign(__appScope, { saveSymbolExportScheme });
  const deleteSymbolExportScheme = __s("deleteSymbolExportScheme", createDeleteSymbolExportScheme); Object.assign(__appScope, { deleteSymbolExportScheme });
  const openCustomComponentSvgImport = __s("openCustomComponentSvgImport", createOpenCustomComponentSvgImport); Object.assign(__appScope, { openCustomComponentSvgImport });
  const importCustomComponentSvg = __s("importCustomComponentSvg", createImportCustomComponentSvg); Object.assign(__appScope, { importCustomComponentSvg });
  const confirmCustomLibraryCreateDialog = __s("confirmCustomLibraryCreateDialog", createConfirmCustomLibraryCreateDialog); Object.assign(__appScope, { confirmCustomLibraryCreateDialog });
  const nextCustomCategoryLibraryName = __s("nextCustomCategoryLibraryName", createNextCustomCategoryLibraryName); Object.assign(__appScope, { nextCustomCategoryLibraryName });
  const createCustomCategoryLibrary = __s("createCustomCategoryLibrary", createCreateCustomCategoryLibrary); Object.assign(__appScope, { createCustomCategoryLibrary });
  const deleteCustomCategoryLibrary = __s("deleteCustomCategoryLibrary", createDeleteCustomCategoryLibrary); Object.assign(__appScope, { deleteCustomCategoryLibrary });
  const nextCustomComponentLibraryName = __s("nextCustomComponentLibraryName", createNextCustomComponentLibraryName); Object.assign(__appScope, { nextCustomComponentLibraryName });
  const createCustomComponentLibrary = __s("createCustomComponentLibrary", createCreateCustomComponentLibrary); Object.assign(__appScope, { createCustomComponentLibrary });
  const deleteCustomComponentLibrary = __s("deleteCustomComponentLibrary", createDeleteCustomComponentLibrary); Object.assign(__appScope, { deleteCustomComponentLibrary });
  const renameSelectedCustomDeviceTreeItem = __s("renameSelectedCustomDeviceTreeItem", createRenameSelectedCustomDeviceTreeItem); Object.assign(__appScope, { renameSelectedCustomDeviceTreeItem });
  const deleteSelectedCustomDeviceTreeItem = __s("deleteSelectedCustomDeviceTreeItem", createDeleteSelectedCustomDeviceTreeItem); Object.assign(__appScope, { deleteSelectedCustomDeviceTreeItem });
  const nextCustomTemplateKind = __s("nextCustomTemplateKind", createNextCustomTemplateKind); Object.assign(__appScope, { nextCustomTemplateKind });
  const saveCustomDeviceTemplate = __s("saveCustomDeviceTemplate", createSaveCustomDeviceTemplate); Object.assign(__appScope, { saveCustomDeviceTemplate });
  const saveBuiltinDeviceDefinitionFromCustomDraft = __s("saveBuiltinDeviceDefinitionFromCustomDraft", createSaveBuiltinDeviceDefinitionFromCustomDraft); Object.assign(__appScope, { saveBuiltinDeviceDefinitionFromCustomDraft });
  const saveComponentLibraryDefinition = __s("saveComponentLibraryDefinition", createSaveComponentLibraryDefinition); Object.assign(__appScope, { saveComponentLibraryDefinition });
  const saveCustomDeviceDefinitionDialog = __s("saveCustomDeviceDefinitionDialog", createSaveCustomDeviceDefinitionDialog); Object.assign(__appScope, { saveCustomDeviceDefinitionDialog });
  const renderStateVisualPager = __s("renderStateVisualPager", createRenderStateVisualPager); Object.assign(__appScope, { renderStateVisualPager });
  const renderDeviceDefinitionVisualPanel = __s("renderDeviceDefinitionVisualPanel", createRenderDeviceDefinitionVisualPanel); Object.assign(__appScope, { renderDeviceDefinitionVisualPanel });
  const renderLibraryDefinitionActions = createRenderLibraryDefinitionActions(__appScope); Object.assign(__appScope, { renderLibraryDefinitionActions });
  const renderGraphTemplatePreview = __s("renderGraphTemplatePreview", createRenderGraphTemplatePreview); Object.assign(__appScope, { renderGraphTemplatePreview });
  const renderGraphTemplateButton = createRenderGraphTemplateButton(__appScope); Object.assign(__appScope, { renderGraphTemplateButton });
  const renderGraphTemplateFlyout = createRenderGraphTemplateFlyout(__appScope); Object.assign(__appScope, { renderGraphTemplateFlyout });
  const renderTemplateLibraryPanel = () => (
      <div className="template-library-panel library-panel-stack">
        <div className="library-search">
          <Search size={15} aria-hidden="true" />
          <Input
            value={templateLibrarySearchQuery}
            onChange={(event) => setTemplateLibrarySearchQuery(event.target.value)}
            placeholder="搜索模板/类型"
            aria-label="搜索模板库"
          />
          {templateLibrarySearchQuery && (
            <button type="button" aria-label="清空模板库搜索" title="清空" onClick={() => setTemplateLibrarySearchQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="library-scope-toolbar">
          <div className="template-library-actions library-scope-actions" aria-label="模板库导入导出">
            <button
              type="button"
              className="library-icon-action"
              title="导入模板库"

              onClick={() => openLibraryPackageImportFilePicker("template-library")}
            >
              <FileInput size={14} aria-hidden="true" />
              <span>导入</span>
            </button>
            <button
              type="button"
              className="library-icon-action"
              title="导出模板库"
              onClick={() => void exportLibraryPackage("template-library")}
            >
              <Download size={14} aria-hidden="true" />
              <span>导出</span>
            </button>
          </div>
          <div className="library-display-mode" role="radiogroup" aria-label="模板库展开方式">
          {([
            ["expanded", "向下展开"],
            ["right", "向右浮动"]
          ] as const).map(([mode, label]) => (
            <label key={mode} className={templateLibraryDisplayMode === mode ? "active" : ""}>
              <input
                type="radio"
                name="template-library-display-mode"
                value={mode}
                checked={templateLibraryDisplayMode === mode}
                onChange={() => setTemplateLibraryDisplayMode(mode)}
                onClick={() => {
                  // 已选中时重复点击：切换折叠层全部展开/全部收缩
                  if (templateLibraryDisplayMode !== mode) return;
                  setExpandedGraphTemplateTypes((current: string[]) =>
                    current.length === 0 ? [...displayedGraphTemplateTypes] : []
                  );
                }}
              />
              <span>{label}</span>
              {templateLibraryDisplayMode === mode && (() => {
                // 当前选中模式：图标反映折叠层全部展开/全部收缩
                const total = displayedGraphTemplateTypes.length;
                if (total === 0) return null;
                const allExpanded = expandedGraphTemplateTypes.length >= total;
                const allCollapsed = expandedGraphTemplateTypes.length === 0;
                if (allExpanded) return <ChevronDown size={12} aria-hidden="true" />;
                if (allCollapsed) return <ChevronRight size={12} aria-hidden="true" />;
                return null;
              })()}
            </label>
          ))}
          </div>
        </div>
        <div
          className={`library-scroll ${templateLibraryDisplayMode === "right" ? "library-scroll-flyout" : ""}`}
          ref={libraryScrollRef}
          onScroll={() => {
            if (templateLibraryDisplayMode === "right") {
              hideLibraryFlyout();
            }
          }}
        >
          {displayedGraphTemplateTypes.length > 0 ? displayedGraphTemplateTypes.map((typeName: string) => {
            const templates = filteredGroupedGraphTemplates[typeName] ?? [];
            const templateExpanded = templateLibrarySearchNeedle
              ? true
              : templateLibraryDisplayMode === "expanded" && expandedGraphTemplateTypes.includes(typeName);
            const templateFlyoutVisible =
              templateLibraryDisplayMode === "right" &&
              !templateLibrarySearchNeedle &&
              hoveredGraphTemplateType === typeName &&
              templates.length > 0;
            const flyoutListKey = libraryComponentListRefKey("flyout", `template:${typeName}`);
            return (
              <section
                className={`library-group-section template-library-type-section ${templateLibraryDisplayMode === "right" ? "flyout-mode" : ""}`}
                key={typeName}
                onMouseEnter={() => {
                  if (templateLibraryDisplayMode === "right" && !templateLibrarySearchNeedle) {
                    clearLibraryFlyoutCloseTimer();
                    if (hoveredGraphTemplateType !== typeName) {
                      setHoveredGraphTemplateType(typeName);
                    }
                  }
                }}
                onMouseLeave={() => {
                  if (templateLibraryDisplayMode === "right" && templateFlyoutVisible) {
                    scheduleGraphTemplateFlyoutClose(typeName);
                  }
                }}
              >
                <button
                  type="button"
                  ref={setLibraryComponentLibraryHeaderRef(flyoutListKey)}
                  className={`library-group-toggle ${templateExpanded || templateFlyoutVisible ? "active" : ""}`}
                  aria-expanded={templateExpanded || templateFlyoutVisible}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    cancelLibraryPlacement();
                    setContextMenu(null);
                    setProjectMenu(null);
                    hideLibraryFlyout();
                    setTemplateMenu({
                      x: event.clientX,
                      y: event.clientY,
                      typeName
                    });
                  }}
                  onClick={() => {
                    if (templateLibraryDisplayMode === "right" && !templateLibrarySearchNeedle) {
                      clearLibraryFlyoutCloseTimer();
                      setHoveredGraphTemplateType(typeName);
                      return;
                    }
                    setExpandedGraphTemplateTypes((current: string[]) =>
                      current.includes(typeName) ? current.filter((item) => item !== typeName) : [...current, typeName]
                    );
                  }}
                >
                  {templateExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {typeName}
                  <strong>{templates.length}</strong>
                </button>
                {templateExpanded && (
                  templates.length > 0 ? (
                    <div className="template-library-grid">
                      {templates.map((template: GraphTemplate) => renderGraphTemplateButton(template))}
                    </div>
                  ) : (
                    <div className="template-library-empty">暂无模板</div>
                  )
                )}
                {templateFlyoutVisible && renderGraphTemplateFlyout(flyoutListKey, typeName, templates)}
              </section>
            );
          }) : (
            <div className="library-empty">未找到匹配模板</div>
          )}
        </div>
      </div>
    );
  Object.assign(__appScope, { renderTemplateLibraryPanel });
  const renderLibraryTemplateButton = createRenderLibraryTemplateButton(__appScope); Object.assign(__appScope, { renderLibraryTemplateButton });
  const renderLibraryFlyout = createRenderLibraryFlyout(__appScope); Object.assign(__appScope, { renderLibraryFlyout });
  // ── 图元库面板树拖动排序（一级类别库 / 二级类）──────────────────────────────────
  // 顺序覆盖存在 libraryTreeOrder（本机 UI 偏好，localStorage）；未拖动过的项按原始顺序垫底。
  // 拖动身份走 React 状态（libraryTreeDragKey）而非 dataTransfer.getData —— dragover 期间
  // 浏览器出于安全会拒绝读取跨页签数据；dataTransfer 只设 text/plain 让拖放行为合法。
  // 落点指示是**一条虚线直线**（插入位指示线），不框住整行：画在目标行的上/下边缘，
  //   向下拖（拖动项排在目标之前）→ 线画在目标行**下边缘**（插到目标之后）；
  //   向上拖 → 线画在目标行**上边缘**（插到目标之前）。
  //   与 libraryTreeOrder.reorderKeys 的落点语义严格一致，所见即所得。
  //   dropKey 状态携带边（`<行键>|before/after`）；拖自己（同键）不产生边 → 不画线不放行。
  // 搜索过滤时（librarySearchNeedle 非空）不渲染把手：对过滤子集重排会把未匹配项挤到末尾。
  const startLibraryTreeDrag = (event: DragEvent, dragKey: string) => {
    event.stopPropagation();
    event.dataTransfer.setData("text/plain", dragKey);
    event.dataTransfer.effectAllowed = "move";
    setLibraryTreeDragKey(dragKey);
  };
  const endLibraryTreeDrag = () => {
    setLibraryTreeDragKey("");
    setLibraryTreeDropKey("");
  };
  // 只允许同层重排：一级（group:）只落一级；二级（class:<库>::<类>）必须同一类别库。
  const libraryTreeDropAllowed = (dragKey: string, dropKey: string) =>
    dragKey.startsWith("group:")
      ? dropKey.startsWith("group:")
      : dropKey.startsWith("class:") && dragKey.split("::")[0] === dropKey.split("::")[0];
  // 某类别库下按当前显示顺序排好的类 section 清单（落点结算与插入位判定共用同一口径）。
  const libraryTreeSortedSections = (group: string): string[] =>
    sortByKeyOrder(
      rootComponentLibraryGroupsForDisplay(
        group,
        groupedCategoryLibraryByComponentLibrary[group] ?? [],
        customComponentLibraries,
        librarySearchNeedle
      ),
      (typeGroup: { section: string }) => typeGroup.section,
      libraryTreeOrder?.componentLibraries[group] ?? []
    ).map((typeGroup: { section: string }) => typeGroup.section);
  // 插入边：拖动项排在目标之前 → after（目标下边缘）；排在目标之后 → before（目标上边缘）。
  const libraryTreeDropEdge = (dragKey: string, dropKey: string): "before" | "after" | null => {
    if (!dragKey || !libraryTreeDropAllowed(dragKey, dropKey)) {
      return null;
    }
    if (dragKey.startsWith("group:")) {
      const from = displayedCategoryLibraries.indexOf(dragKey.slice("group:".length));
      const to = displayedCategoryLibraries.indexOf(dropKey.slice("group:".length));
      return from < 0 || to < 0 || from === to ? null : from < to ? "after" : "before";
    }
    const dragGroup = dragKey.slice("class:".length).split("::")[0];
    const sections = libraryTreeSortedSections(dragGroup);
    const from = sections.indexOf(dragKey.slice(`class:${dragGroup}::`.length));
    const to = sections.indexOf(dropKey.slice(`class:${dragGroup}::`.length));
    return from < 0 || to < 0 || from === to ? null : from < to ? "after" : "before";
  };
  const handleLibraryTreeDragOver = (event: DragEvent, dropKey: string) => {
    const edge = libraryTreeDropEdge(libraryTreeDragKey, dropKey);
    if (!edge) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const dropStateKey = `${dropKey}|${edge}`;
    setLibraryTreeDropKey((current: string) => current === dropStateKey ? current : dropStateKey);
  };
  const handleLibraryTreeDragLeave = (event: DragEvent) => {
    if (!(event.currentTarget as Node).contains(event.relatedTarget as Node | null)) {
      setLibraryTreeDropKey("");
    }
  };
  const handleLibraryTreeDrop = (event: DragEvent, dropKey: string) => {
    event.preventDefault();
    const dragKey = libraryTreeDragKey;
    endLibraryTreeDrag();
    if (!dragKey || !libraryTreeDropAllowed(dragKey, dropKey) || dragKey === dropKey) {
      return;
    }
    const currentOrder = libraryTreeOrder ?? { categoryLibraries: [], componentLibraries: {} };
    if (dragKey.startsWith("group:")) {
      const next = reorderKeys(displayedCategoryLibraries, dragKey.slice("group:".length), dropKey.slice("group:".length));
      if (next) {
        const nextOrder = { ...currentOrder, categoryLibraries: next };
        writeLibraryTreeOrder(nextOrder);
        setLibraryTreeOrder(nextOrder);
      }
      return;
    }
    const dragGroup = dragKey.slice("class:".length).split("::")[0];
    const dragSection = dragKey.slice(`class:${dragGroup}::`.length);
    const targetSection = dropKey.slice(`class:${dragGroup}::`.length);
    const next = reorderKeys(libraryTreeSortedSections(dragGroup), dragSection, targetSection);
    if (next) {
      const nextOrder = { ...currentOrder, componentLibraries: { ...currentOrder.componentLibraries, [dragGroup]: next } };
      writeLibraryTreeOrder(nextOrder);
      setLibraryTreeOrder(nextOrder);
    }
  };
  Object.assign(__appScope, { startLibraryTreeDrag, endLibraryTreeDrag, handleLibraryTreeDragOver, handleLibraryTreeDragLeave, handleLibraryTreeDrop });
  const deviceLibraryConfig = interfaceCustomization?.deviceLibrary ?? {
    categories: {},
    componentLibraries: {},
    devices: {},
    categoryOrder: [],
    componentOrder: {},
    deviceOrder: {}
  };
  const renderLibraryPanel = () => (
      <div className="library-panel-stack">
        <div className="library-search">
          <Search size={15} aria-hidden="true" />
          <Input
            value={librarySearchQuery}
            onChange={(event) => setLibrarySearchQuery(event.target.value)}
            placeholder="搜索图元/类"
            aria-label="搜索图元库"
          />
          {librarySearchQuery && (
            <button type="button" aria-label="清空图元库搜索" title="清空" onClick={() => setLibrarySearchQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="component-library-actions library-scope-actions" aria-label="类导入导出">
          <button
            type="button"
            className="library-icon-action"
            title="导入类"

            onClick={() => openLibraryPackageImportFilePicker("component-library")}
          >
            <FileInput size={14} aria-hidden="true" />
            <span>导入</span>
          </button>
          <button
            type="button"
            className="library-icon-action"
            title="导出类"
            onClick={() => void exportLibraryPackage("component-library")}
          >
            <Download size={14} aria-hidden="true" />
            <span>导出</span>
          </button>
        </div>
        <div className="library-display-mode" role="radiogroup" aria-label="图元库展开方式">
          {([
            ["expanded", "向下展开"],
            ["right", "向右浮动"]
          ] as const).map(([mode, label]) => (
            <label key={mode} className={componentLibraryDisplayMode === mode ? "active" : ""}>
              <input
                type="radio"
                name="component-library-display-mode"
                value={mode}
                checked={componentLibraryDisplayMode === mode}
                onChange={() => setComponentLibraryDisplayMode(mode)}
                onClick={() => {
                  // 已选中时重复点击：切换折叠层全部展开/全部收缩
                  if (componentLibraryDisplayMode !== mode) return;
                  if (mode === "expanded") {
                    setCollapsedExpandedModeCategoryLibraries((current: string[]) =>
                      current.length === 0 ? [...displayedCategoryLibraries] : []
                    );
                  } else {
                    setExpandedCategoryLibraries((current: string[]) =>
                      current.length === 0 ? [...displayedCategoryLibraries] : []
                    );
                  }
                }}
              />
              <span>{label}</span>
              {componentLibraryDisplayMode === mode && (() => {
                // 当前选中模式：图标反映折叠层全部展开/全部收缩
                const total = displayedCategoryLibraries.length;
                if (total === 0) return null;
                const allCollapsed = mode === "expanded"
                  ? collapsedExpandedModeCategoryLibraries.length >= total
                  : expandedCategoryLibraries.length === 0;
                const allExpanded = mode === "expanded"
                  ? collapsedExpandedModeCategoryLibraries.length === 0
                  : expandedCategoryLibraries.length >= total;
                if (allExpanded) return <ChevronDown size={12} aria-hidden="true" />;
                if (allCollapsed) return <ChevronRight size={12} aria-hidden="true" />;
                return null;
              })()}
            </label>
          ))}
        </div>
        <div
          className={`library-scroll ${componentLibraryDisplayMode === "right" ? "library-scroll-flyout" : ""}`}
          ref={libraryScrollRef}
          onScroll={() => {
            if (componentLibraryDisplayMode === "right") {
              hideLibraryFlyout();
            }
          }}
        >
          {displayedCategoryLibraries.filter((group: string) => isDeviceLibraryCategoryVisible(deviceLibraryConfig, group)).length > 0 ? sortByKeyOrder(
              displayedCategoryLibraries.filter((group: string) => isDeviceLibraryCategoryVisible(deviceLibraryConfig, group)),
              (group: string) => group,
              deviceLibraryConfig.categoryOrder.length > 0 ? deviceLibraryConfig.categoryOrder : (libraryTreeOrder?.categoryLibraries ?? [])
            ).map((group: string) => {
            const libraryExpanded = componentLibraryDisplayMode === "expanded";
            const libraryFlyout = componentLibraryDisplayMode === "right";
            const expanded = librarySearchNeedle ? true : libraryExpanded
              ? !collapsedExpandedModeCategoryLibraries.includes(group)
              : expandedCategoryLibraries.includes(group);
            const typeGroups = (rootComponentLibraryGroupsForDisplay(
              group,
              groupedCategoryLibraryByComponentLibrary[group] ?? [],
              customComponentLibraries,
              librarySearchNeedle
            ) as any[])
              .filter((typeGroup: any) => isDeviceLibraryComponentVisible(deviceLibraryConfig, deviceLibraryComponentKey(group, typeGroup.section)))
              .map((typeGroup: any) => {
                const componentKey = deviceLibraryComponentKey(group, typeGroup.section);
                const templates = (Array.isArray(typeGroup.templates) ? typeGroup.templates : [])
                  .filter((template: any) => isDeviceLibraryTemplateVisible(deviceLibraryConfig, deviceLibraryTemplateKey(group, typeGroup.section, String(template.kind ?? ""))))
                  .sort((left: any, right: any) => {
                    const order = deviceLibraryConfig.deviceOrder[componentKey] ?? libraryTreeOrder?.deviceTemplates?.[componentKey] ?? [];
                    const leftIndex = order.indexOf(String(left.kind ?? ""));
                    const rightIndex = order.indexOf(String(right.kind ?? ""));
                    const normalizedLeft = leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex;
                    const normalizedRight = rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex;
                    return normalizedLeft - normalizedRight;
                  });
                return { ...typeGroup, templates };
              });
            return (
              <section
                className={`library-group-section ${libraryTreeDropKey === `group:${group}|before` ? "library-tree-drop-line-before" : ""} ${libraryTreeDropKey === `group:${group}|after` ? "library-tree-drop-line-after" : ""}`}
                key={group}
                onDragOver={(event) => handleLibraryTreeDragOver(event, `group:${group}`)}
                onDragLeave={handleLibraryTreeDragLeave}
                onDrop={(event) => handleLibraryTreeDrop(event, `group:${group}`)}
                onMouseEnter={() => {
                  if (libraryFlyout) {
                    clearLibraryFlyoutCloseTimer();
                  }
                }}
                onMouseLeave={() => {
                  if (!libraryExpanded) {
                    if (libraryFlyout) {
                      scheduleLibraryFlyoutClose(group);
                    } else {
                      setHoveredCategoryLibrary((current: string) => current === group ? "" : current);
                      setHoveredCategoryLibraryComponentLibrary("");
                    }
                  }
                }}
              >
                <button
                  className={`library-group-toggle ${expanded ? "active" : ""}`}
                  onClick={() => toggleCategoryLibrary(group)}
                >
                  {!librarySearchNeedle && (
                    <span
                      className="library-tree-drag-handle"
                      title="拖动调整顺序"
                      aria-label={`拖动调整 ${group} 的顺序`}
                      draggable
                      onDragStart={(event) => startLibraryTreeDrag(event, `group:${group}`)}
                      onDragEnd={endLibraryTreeDrag}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <GripVertical size={12} aria-hidden="true" />
                    </span>
                  )}
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {group}
                </button>
                {expanded && (
                  <div className="category-library-component-library-list">
                    {sortByKeyOrder(
                      typeGroups,
                      (typeGroup: any) => typeGroup.section,
                      deviceLibraryConfig.componentOrder[group] ?? libraryTreeOrder?.componentLibraries[group] ?? []
                    ).map((typeGroup: any) => {
                      const componentLibraryKey = categoryLibraryComponentLibraryKey(group, typeGroup.section);
                      const componentLibraryDisplay = componentLibraryDisplayParts(typeGroup.section, customComponentLibraries);
                      const componentLibraryExpanded = librarySearchNeedle
                        ? true
                        : libraryExpanded
                          ? !collapsedExpandedModeComponentLibraries.includes(componentLibraryKey)
                          : libraryFlyout ? false : expandedCategoryLibraryComponentLibraries.includes(componentLibraryKey) || hoveredCategoryLibraryComponentLibrary === componentLibraryKey;
                      const componentLibraryFlyoutVisible = libraryFlyout && !librarySearchNeedle && hoveredCategoryLibraryComponentLibrary === componentLibraryKey;
                      const inlineListKey = libraryComponentListRefKey("inline", componentLibraryKey);
                      const flyoutListKey = libraryComponentListRefKey("flyout", componentLibraryKey);
                      return (
                        <section
                          className={`category-library-component-library-section ${libraryFlyout ? "flyout-mode" : ""} ${libraryTreeDropKey === `class:${categoryLibraryComponentLibraryKey(group, typeGroup.section)}|before` ? "library-tree-drop-line-before" : ""} ${libraryTreeDropKey === `class:${categoryLibraryComponentLibraryKey(group, typeGroup.section)}|after` ? "library-tree-drop-line-after" : ""}`}
                          key={`${group}-${typeGroup.section}`}
                          onDragOver={(event) => handleLibraryTreeDragOver(event, `class:${categoryLibraryComponentLibraryKey(group, typeGroup.section)}`)}
                          onDragLeave={handleLibraryTreeDragLeave}
                          onDrop={(event) => handleLibraryTreeDrop(event, `class:${categoryLibraryComponentLibraryKey(group, typeGroup.section)}`)}
                          onMouseEnter={() => {
                            if (!libraryExpanded) {
                              clearLibraryFlyoutCloseTimer();
                              if (hoveredCategoryLibraryComponentLibrary !== componentLibraryKey) {
                                setHoveredCategoryLibraryComponentLibrary(componentLibraryKey);
                              }
                            }
                          }}
                          onMouseLeave={() => {
                            if (!libraryExpanded) {
                              if (libraryFlyout) {
                                scheduleLibraryFlyoutClose(group, componentLibraryKey);
                              } else {
                                setHoveredCategoryLibraryComponentLibrary((current: string) =>
                                  current === componentLibraryKey ? "" : current
                                );
                              }
                            }
                          }}
                        >
                          <button
                            type="button"
                            ref={setLibraryComponentLibraryHeaderRef(flyoutListKey)}
                            className={`category-library-component-library-header ${componentLibraryExpanded || componentLibraryFlyoutVisible ? "active" : ""}`}
                            aria-expanded={componentLibraryExpanded || componentLibraryFlyoutVisible}
                            onClick={() => toggleCategoryLibraryComponentLibrary(group, typeGroup.section)}
                          >
                            <span className="component-library-title">
                              {!librarySearchNeedle && (
                                <span
                                  className="library-tree-drag-handle"
                                  title="拖动调整顺序"
                                  aria-label={`拖动调整 ${componentLibraryDisplay.title} 的顺序`}
                                  draggable
                                  onDragStart={(event) => startLibraryTreeDrag(event, `class:${categoryLibraryComponentLibraryKey(group, typeGroup.section)}`)}
                                  onDragEnd={endLibraryTreeDrag}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <GripVertical size={11} aria-hidden="true" />
                                </span>
                              )}
                              {!libraryFlyout && (componentLibraryExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
                              <span className="component-library-name" title={componentLibraryDisplay.title}>
                                <span className="component-library-name-cn">{componentLibraryDisplay.chinese}</span>
                                <span className="component-library-name-en">{componentLibraryDisplay.english}</span>
                              </span>
                            </span>
                            <strong>{typeGroup.templates.length}</strong>
                          </button>
                          {componentLibraryExpanded && (
                            <div className="library-group inline-library-group" ref={setLibraryComponentListRef(inlineListKey)}>
                              {typeGroup.templates.map((item: any) => renderLibraryTemplateButton(item, typeGroup.section))}
                            </div>
                          )}
                          {componentLibraryFlyoutVisible && renderLibraryFlyout(flyoutListKey, componentLibraryKey, group, typeGroup)}
                        </section>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          }) : (
            <div className="library-empty">未找到匹配图元</div>
          )}
        </div>
        {renderLibraryDefinitionActions()}
      </div>
    );
  Object.assign(__appScope, { renderLibraryPanel });
  const renderElementTreePanel = createRenderElementTreePanel(__appScope); Object.assign(__appScope, { renderElementTreePanel });
  Object.assign(__appScope, { topologyWarningDisplayMessage });
  const warningStatusText = topologyErrors.length > 0
      ? `告警 ${topologyErrors.length} 条：${topologyWarningDisplayMessage(topologyErrors[0]?.message ?? "请查看拓扑告警")}`
      : "告警 无";
  Object.assign(__appScope, { warningStatusText });
  const warningStatusTitle = topologyErrors.length > 0
      ? topologyErrors.slice(0, 5).map((error: { message?: string }, index: number) => `${index + 1}. ${topologyWarningDisplayMessage(error.message)}`).join("\n")
      : "当前没有拓扑告警。";
  Object.assign(__appScope, { warningStatusTitle });
  const currentZoomPercent = viewBoxZoomPercent(viewBox, canvasBounds); Object.assign(__appScope, { currentZoomPercent });
  const viewportNodeLodScreenSize = useMemo(
      () => estimatedViewportNodeScreenSize(viewportNodes, canvasScrollScale),
      [canvasScrollScale.x, canvasScrollScale.y, viewportNodes]
    );
  Object.assign(__appScope, { viewportNodeLodScreenSize });
  const useInitialCanvasLod =
      initialCanvasLodActive &&
      viewportNodes.length > CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT &&
      currentZoomPercent <= CANVAS_LOD_MAX_ZOOM_PERCENT &&
      !connectSource &&
      !staticDrawing;
  Object.assign(__appScope, { useInitialCanvasLod });
  const usePersistentCanvasLod =
      viewportNodes.length > CANVAS_LOD_NODE_DETAIL_LIMIT &&
      currentZoomPercent <= CANVAS_LOD_MAX_ZOOM_PERCENT &&
      viewportNodeLodScreenSize <= CANVAS_LOD_MAX_NODE_SCREEN_SIZE &&
      !connectSource &&
      !staticDrawing;
  Object.assign(__appScope, { usePersistentCanvasLod });
  const useSimplifiedCanvasNodes =
      usePersistentCanvasLod || useInitialCanvasLod; Object.assign(__appScope, { useSimplifiedCanvasNodes });
  const initialCanvasDetailHydrationTarget = initialCanvasLodActive
      ? Math.max(viewportNodes.length, viewportRoutedEdges.length)
      : 0;
  Object.assign(__appScope, { initialCanvasDetailHydrationTarget });
  useEffect(createAppHookCallback128(__appScope), [
      activeProjectKey,
      initialCanvasDetailHydrationLimit,
      initialCanvasDetailHydrationTarget,
      initialCanvasLodActive,
      usePersistentCanvasLod
    ]);
  const initialCanvasDetailedNodeIdSet = useMemo(createAppHookCallback129(__appScope), [
      groupTransformPreviewNodeIdSet,
      initialCanvasDetailHydrationLimit,
      useInitialCanvasLod,
      viewportNodes
    ]);
  Object.assign(__appScope, { initialCanvasDetailedNodeIdSet });
  const useSimplifiedSelectedCanvasNodes =
      useSimplifiedCanvasNodes &&
      selectedNodeIdSet.size > CANVAS_LOD_SELECTED_DETAIL_LIMIT &&
      !transformDrag &&
      !nodeLabelDrag &&
      !nodeLabelRotateDrag;
  Object.assign(__appScope, { useSimplifiedSelectedCanvasNodes });
  const detailedViewportNodes = useMemo(createAppHookCallback130(__appScope), [
      groupTransformPreviewNodeIdSet,
      initialCanvasDetailedNodeIdSet,
      nodeLabelDrag,
      nodeLabelRotateDrag,
      selectedNodeId,
      selectedNodeIdSet,
      transformDrag,
      useSimplifiedCanvasNodes,
      useSimplifiedSelectedCanvasNodes,
      viewportNodes
    ]);
  Object.assign(__appScope, { detailedViewportNodes });
  const useSimplifiedCanvasRoutes =
      useSimplifiedCanvasNodes &&
      !rewiring &&
      !manualPathDrag &&
      !terminalPress;
  Object.assign(__appScope, { useSimplifiedCanvasRoutes });
  const renderViewportRoutedEdges = viewportRoutedEdges; Object.assign(__appScope, { renderViewportRoutedEdges });
  const useSimplifiedSelectedCanvasEdges =
      useSimplifiedCanvasRoutes &&
      activeSelectedEdgeSet.size > CANVAS_LOD_SELECTED_DETAIL_LIMIT &&
      !rewiring &&
      !manualPathDrag &&
      !terminalPress;
  Object.assign(__appScope, { useSimplifiedSelectedCanvasEdges });
  const detailedSelectedEdgeIdSet = useMemo(createAppHookCallback131(__appScope), [activeSelectedEdgeSet, selectedEdgeId, useSimplifiedSelectedCanvasEdges]);
  Object.assign(__appScope, { detailedSelectedEdgeIdSet });
  const initialCanvasDetailedEdgeIdSet = useMemo(createAppHookCallback132(__appScope), [initialCanvasDetailHydrationLimit, useInitialCanvasLod, viewportRoutedEdges]);
  Object.assign(__appScope, { initialCanvasDetailedEdgeIdSet });
  const lodCanvasRouteChunks = useMemo(createAppHookCallback133(__appScope), [
      activeLayerEdgeIdSet,
      activeSelectedEdgeSet,
      colorDisplayMode,
      colorPalette,
      detailedSelectedEdgeIdSet,
      dragGhostEdgeIdSet,
      dragOverlayEdgeIdSet,
      edgeById,
      groupTransformPreviewEdgeIdSet,
      initialCanvasDetailedEdgeIdSet,
      isEditMode,
      multiNodeDragging,
      nodeById,
      terminalPressPreviewEdgeIdSet,
      useSimplifiedCanvasRoutes,
      viewportRoutedEdges
    ]);
  Object.assign(__appScope, { lodCanvasRouteChunks });
  const lodCanvasNodeChunks = useMemo(createAppHookCallback134(__appScope), [
      activeLayerNodeIdSet,
      colorDisplayMode,
      colorPalette,
      dragGhostRoutableLineNodeIdSet,
      groupTransformPreviewNodeIdSet,
      imageAssets,
      initialCanvasDetailedNodeIdSet,
      isEditMode,
      libraryTemplateByKind,
      nodeLabelDrag,
      nodeLabelRotateDrag,
      routableLineEndpointDrag?.nodeId,
      transformDrag,
      useSimplifiedCanvasNodes,
      viewportNodes
    ]);
  Object.assign(__appScope, { lodCanvasNodeChunks });
  const lodSelectedNodeMarkup = useMemo(createAppHookCallback135(__appScope), [
      displaySelectedNodeIds,
      groupTransformPreviewNodeIdSet,
      selectedNodeId,
      useSimplifiedSelectedCanvasNodes,
      visibleNodeById
    ]);
  Object.assign(__appScope, { lodSelectedNodeMarkup });
  const lodNodeFromEvent = __s("lodNodeFromEvent", createLodNodeFromEvent); Object.assign(__appScope, { lodNodeFromEvent });
  const lodTerminalIdFromEvent = __s("lodTerminalIdFromEvent", createLodTerminalIdFromEvent); Object.assign(__appScope, { lodTerminalIdFromEvent });
  const handleLodNodePointerDown = __s("handleLodNodePointerDown", createHandleLodNodePointerDown); Object.assign(__appScope, { handleLodNodePointerDown });
  const handleLodNodeContextMenu = __s("handleLodNodeContextMenu", createHandleLodNodeContextMenu); Object.assign(__appScope, { handleLodNodeContextMenu });
  const openNodeDoubleClickEditor = __s("openNodeDoubleClickEditor", createOpenNodeDoubleClickEditor); Object.assign(__appScope, { openNodeDoubleClickEditor });
  const jumpToAssociatedModel = __s("jumpToAssociatedModel", createJumpToAssociatedModel); Object.assign(__appScope, { jumpToAssociatedModel });
  const handleLodNodeDoubleClick = __s("handleLodNodeDoubleClick", createHandleLodNodeDoubleClick); Object.assign(__appScope, { handleLodNodeDoubleClick });
  const connectPreviewDom = connectPreviewDomRef.current; Object.assign(__appScope, { connectPreviewDom });
  const layerAssignmentUnchanged = activeSelectedNodeIds.length > 0 && activeSelectedNodeIds.every(
      (nodeId: string) => (nodeById.get(nodeId)?.layerId ?? DEFAULT_MODEL_LAYER_ID) === layerAssignmentTargetId
    );
  Object.assign(__appScope, { layerAssignmentUnchanged });
  const browseSelectedCanvasBounds = useMemo(createAppHookCallback136(__appScope), [activeSelectedEdgeIds, activeSelectedNodeIds, isEditMode, routedEdgeById, visibleNodeById]);
  const selectedCanvasBounds = isEditMode
      ? combineSelectionRects(selectedLayoutUnits.map((unit: CanvasLayoutUnit) => unit.bounds)) ??
        calculateModelGeometryBounds(
          [],
          activeSelectedEdgeIds.flatMap((edgeId: string) => {
            const route = routedEdgeById.get(edgeId);
            return route ? [{ points: route.points }] : [];
          }),
          24
        )
      : browseSelectedCanvasBounds;
  Object.assign(__appScope, { selectedCanvasBounds });
  const selectedFloatingToolbarBounds = isEditMode
      ? focusedGroupedNodeMovesGroup && selectedNode ? calculateNodeVisualBounds(selectedNode) : selectedCanvasBounds
      : null;
  Object.assign(__appScope, { selectedFloatingToolbarBounds });
  const selectedToolbarHidden = Boolean(
      pointerButtonsPressed ||
      dragging ||
      transformDrag ||
      panning ||
      marquee ||
      modifierSelectionPress ||
      connectSource ||
      staticDrawing ||
      rewiring ||
      terminalPress ||
      manualPathDrag ||
      nodeLabelDrag ||
      nodeLabelRotateDrag
    );
  Object.assign(__appScope, { selectedToolbarHidden });
  const contextMenuTarget = contextMenu?.target ?? (contextMenu?.edgeId ? "edge" : "blank"); Object.assign(__appScope, { contextMenuTarget });
  const contextMenuFromElementTree = contextMenu?.source === "element-tree"; Object.assign(__appScope, { contextMenuFromElementTree });
  const contextMenuForSelection = contextMenuTarget !== "blank"; Object.assign(__appScope, { contextMenuForSelection });
  const contextMenuForNode = contextMenuTarget === "node" || contextMenuTarget === "group"; Object.assign(__appScope, { contextMenuForNode });
  const contextMenuForEdge = contextMenuTarget === "edge"; Object.assign(__appScope, { contextMenuForEdge });
  const contextRoutableLineNode = contextMenuForNode && contextMenu?.nodeId ? nodeById.get(contextMenu.nodeId) : undefined; Object.assign(__appScope, { contextRoutableLineNode });
  const contextMenuForRoutableLine = Boolean(
      contextRoutableLineNode &&
      activeLayerNodeIdSet.has(contextRoutableLineNode.id) &&
      isRoutableLineDeviceKind(contextRoutableLineNode.kind)
    );
  Object.assign(__appScope, { contextMenuForRoutableLine });
  const contextMeasurementNode = contextMenuForNode && activeSelectedNodeIds.length === 1
      ? nodeById.get(activeSelectedNodeIds[0])
      : undefined;
  Object.assign(__appScope, { contextMeasurementNode });
  const contextMeasurementGroup = contextMeasurementNode
      ? measurementGroupForNode(projectMeasurements, contextMeasurementNode.id)
      : undefined;
  Object.assign(__appScope, { contextMeasurementGroup });
  // 关联到其他模型的设备：可由右键菜单/浮动工具栏【跳转】到绑定的 model_id 模型。
  const nodeCanJumpToAssociatedModel = (candidate: { kind: string; params?: { model_id?: unknown } } | undefined) =>
      Boolean(
        candidate &&
        __appScope.modelAssociationModelTypeForKind?.(candidate.kind) &&
        __appScope.hasDefinedModelAssociationId?.(candidate)
      );
  Object.assign(__appScope, { nodeCanJumpToAssociatedModel });
  const contextJumpNode = contextMenuForNode && contextMenu?.nodeId ? nodeById.get(contextMenu.nodeId) : undefined;
  Object.assign(__appScope, { contextJumpNode });
  const contextMenuJumpToModel = Boolean(nodeCanJumpToAssociatedModel(contextJumpNode));
  Object.assign(__appScope, { contextMenuJumpToModel });
  const runContextMenuJumpToModel = () => {
    if (nodeCanJumpToAssociatedModel(contextJumpNode)) {
      jumpToAssociatedModel(contextJumpNode);
    }
  };
  Object.assign(__appScope, { runContextMenuJumpToModel });
  const selectedAssociationJumpNode =
      selectedNodeCount === 1 && activeSelectedEdgeIds.length === 0 && nodeCanJumpToAssociatedModel(selectedNode)
        ? selectedNode
        : null;
  Object.assign(__appScope, { selectedAssociationJumpNode });
  const jumpToSelectedAssociationNode = () => {
    if (selectedAssociationJumpNode) {
      jumpToAssociatedModel(selectedAssociationJumpNode);
    }
  };
  Object.assign(__appScope, { jumpToSelectedAssociationNode });
  const selectedViewportActionDisabled = !selectedCanvasBounds; Object.assign(__appScope, { selectedViewportActionDisabled });
  const centerSelectedViewportTitle = selectedViewportActionDisabled ? "先选中图元或连接线后可居中" : "居中选中"; Object.assign(__appScope, { centerSelectedViewportTitle });
  const fitSelectedViewportTitle = selectedViewportActionDisabled ? "先选中图元或连接线后可缩放到选中区域" : "缩放到选中区域"; Object.assign(__appScope, { fitSelectedViewportTitle });
  const nodeFloatingToolbarActionCount =
      6 +
      (canGroupSelectedGraphics ? 1 : 0) +
      (canUngroupSelectedGraphics ? 1 : 0) +
      (canAddTemplateFromSelection ? 1 : 0) +
      (selectedAssociationJumpNode ? 1 : 0);
  Object.assign(__appScope, { nodeFloatingToolbarActionCount });
  const nodeFloatingToolbarWidth = Math.max(NODE_FLOATING_TOOLBAR_WIDTH, nodeFloatingToolbarActionCount * 34 + 16); Object.assign(__appScope, { nodeFloatingToolbarWidth });
  const svgUiUnitX = viewBox.width / Math.max(1, canvasWidth); Object.assign(__appScope, { svgUiUnitX });
  const svgUiUnitY = viewBox.height / Math.max(1, canvasHeight); Object.assign(__appScope, { svgUiUnitY });
  const floatingToolbarScreenScale = clampNumber(Math.sqrt(currentZoomPercent / 100), 0.78, 1); Object.assign(__appScope, { floatingToolbarScreenScale });
  const floatingToolbarGap = Math.max(5, Math.round(CANVAS_FLOATING_TOOLBAR_GAP * floatingToolbarScreenScale)); Object.assign(__appScope, { floatingToolbarGap });
  const floatingToolbarPadding = Math.max(6, Math.round(8 * floatingToolbarScreenScale)); Object.assign(__appScope, { floatingToolbarPadding });
  const floatingToolbarButtonSize = Math.max(24, Math.round(30 * floatingToolbarScreenScale)); Object.assign(__appScope, { floatingToolbarButtonSize });
  const floatingToolbarIconSize = Math.max(12, Math.round(15 * floatingToolbarScreenScale)); Object.assign(__appScope, { floatingToolbarIconSize });
  const floatingToolbarViewportCanvas =
      canvasVisibleViewBox.width > 0 && canvasVisibleViewBox.height > 0 ? canvasVisibleViewBox : viewBox; Object.assign(__appScope, { floatingToolbarViewportCanvas });
  const canvasPointToSurfaceCss = createCanvasPointToSurfaceCss(__appScope);
  Object.assign(__appScope, { canvasPointToSurfaceCss });
  const floatingToolbarViewport = {
      left: canvasDisplayOffsetX + floatingToolbarViewportCanvas.x * canvasScrollScale.x,
      right: canvasDisplayOffsetX + (floatingToolbarViewportCanvas.x + floatingToolbarViewportCanvas.width) * canvasScrollScale.x,
      top: canvasDisplayOffsetY + floatingToolbarViewportCanvas.y * canvasScrollScale.y,
      bottom: canvasDisplayOffsetY + (floatingToolbarViewportCanvas.y + floatingToolbarViewportCanvas.height) * canvasScrollScale.y
    };
  Object.assign(__appScope, { floatingToolbarViewport });
  const clampFloatingToolbarPosition = createClampFloatingToolbarPosition(__appScope); Object.assign(__appScope, { clampFloatingToolbarPosition });
  const floatingToolbarBounds = createFloatingToolbarBounds(__appScope);
  Object.assign(__appScope, { floatingToolbarBounds });
  const toolbarOverlapArea = createToolbarOverlapArea(__appScope); Object.assign(__appScope, { toolbarOverlapArea });
  const canvasRectToSurfaceCssRect = createCanvasRectToSurfaceCssRect(__appScope); Object.assign(__appScope, { canvasRectToSurfaceCssRect });
  const rotateControlAvoidRectFromCanvasPoints = createRotateControlAvoidRectFromCanvasPoints(__appScope); Object.assign(__appScope, { rotateControlAvoidRectFromCanvasPoints });
  const rotateControlAvoidRectFromCanvas = createRotateControlAvoidRectFromCanvas(__appScope);
  Object.assign(__appScope, { rotateControlAvoidRectFromCanvas });
  const selectedRotateControlAvoidRects: RenderViewportBounds[] = [];
  Object.assign(__appScope, { selectedRotateControlAvoidRects });
  if (isEditMode && !editHotInteractionActive && selectedTransformGroupUnit) {
      selectedRotateControlAvoidRects.push(
        rotateControlAvoidRectFromCanvas(selectionRectCenter(selectedTransformGroupUnit.bounds).x, selectedTransformGroupUnit.bounds.top)
      );
    } else if (isEditMode && !editHotInteractionActive && selectedNode && selectedNodeCount === 1 && activeSelectedEdgeIds.length === 0) {
      const selectedNodeUprightStaticSelectionOutline = nodeUsesUprightStaticSelectionOutline(selectedNode, nodeImage(selectedNode), nodeForegroundImage(selectedNode));
      const selectedNodeRotateHandle = selectedNodeUprightStaticSelectionOutline
        ? nodeUprightRotateHandleControlPoints(selectedNode, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP)
        : nodeRotateHandleControlPoints(selectedNode, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP);
      const selectedNodeRotateHandlePoints = [
        selectedNodeRotateHandle.stemStart,
        selectedNodeRotateHandle.stemEnd,
        selectedNodeRotateHandle.handle
      ].map((point) => ({
        x: selectedNode.position.x + point.x,
        y: selectedNode.position.y + point.y
      }));
      selectedRotateControlAvoidRects.push(
        rotateControlAvoidRectFromCanvasPoints(selectedNodeRotateHandlePoints)
      );
    }
  const selectedFloatingToolbarAvoidRect = selectedFloatingToolbarBounds
      ? canvasRectToSurfaceCssRect(
          selectedFloatingToolbarBounds,
          Math.max(floatingToolbarGap, Math.round(8 * floatingToolbarScreenScale))
        )
      : null;
  Object.assign(__appScope, { selectedFloatingToolbarAvoidRect });
  const placeFloatingToolbar = createPlaceFloatingToolbar(__appScope); Object.assign(__appScope, { placeFloatingToolbar });
  const nodeFloatingToolbar =
      isEditMode && !selectedToolbarHidden && activeSelectedNodeIds.length > 0 && selectedFloatingToolbarBounds
        ? (() => {
            const width = Math.round(nodeFloatingToolbarWidth * floatingToolbarScreenScale);
            const height = Math.round(NODE_FLOATING_TOOLBAR_HEIGHT * floatingToolbarScreenScale);
            const centerX = (selectedFloatingToolbarBounds.left + selectedFloatingToolbarBounds.right) / 2;
            const centerY = (selectedFloatingToolbarBounds.top + selectedFloatingToolbarBounds.bottom) / 2;
            const topCenter = canvasPointToSurfaceCss({ x: centerX, y: selectedFloatingToolbarBounds.top });
            const bottomCenter = canvasPointToSurfaceCss({ x: centerX, y: selectedFloatingToolbarBounds.bottom });
            const leftCenter = canvasPointToSurfaceCss({ x: selectedFloatingToolbarBounds.left, y: centerY });
            const rightCenter = canvasPointToSurfaceCss({ x: selectedFloatingToolbarBounds.right, y: centerY });
            const nodeFloatingToolbarAvoidRects = [
              ...(selectedFloatingToolbarAvoidRect ? [selectedFloatingToolbarAvoidRect] : []),
              ...selectedRotateControlAvoidRects
            ];
            const rotateAvoidTop = selectedRotateControlAvoidRects.length > 0
              ? Math.min(...selectedRotateControlAvoidRects.map((rect) => rect.top))
              : null;
            const nodeToolbarCandidates = [
              ...(rotateAvoidTop === null ? [] : [{ x: topCenter.x - width / 2, y: rotateAvoidTop - height - floatingToolbarGap }]),
              { x: topCenter.x - width / 2, y: topCenter.y - height - floatingToolbarGap },
              { x: bottomCenter.x - width / 2, y: bottomCenter.y + floatingToolbarGap },
              { x: rightCenter.x + floatingToolbarGap, y: rightCenter.y - height / 2 },
              { x: leftCenter.x - width - floatingToolbarGap, y: leftCenter.y - height / 2 }
            ];
            return placeFloatingToolbar(nodeToolbarCandidates, width, height, nodeFloatingToolbarAvoidRects);
          })()
        : null;
  Object.assign(__appScope, { nodeFloatingToolbar });
  const nodeFloatingToolbarRect = nodeFloatingToolbar ? floatingToolbarBounds(nodeFloatingToolbar) : null; Object.assign(__appScope, { nodeFloatingToolbarRect });
  const selectedEdgeMidpoint = selectedRoutedEdge ? routeMidpoint(selectedRoutedEdge.points) : null; Object.assign(__appScope, { selectedEdgeMidpoint });
  const edgeFloatingToolbar =
      isEditMode && !selectedToolbarHidden && selectedEdge && selectedRoutedEdge && selectedEdgeMidpoint
        ? (() => {
            const width = Math.round(EDGE_FLOATING_TOOLBAR_WIDTH * floatingToolbarScreenScale);
            const height = Math.round(EDGE_FLOATING_TOOLBAR_HEIGHT * floatingToolbarScreenScale);
            const midpoint = canvasPointToSurfaceCss(selectedEdgeMidpoint);
            const avoidRects = nodeFloatingToolbarRect ? [nodeFloatingToolbarRect] : [];
            return placeFloatingToolbar([
              { x: midpoint.x - width / 2, y: midpoint.y - height - floatingToolbarGap },
              { x: midpoint.x - width / 2, y: midpoint.y + floatingToolbarGap },
              { x: midpoint.x + floatingToolbarGap, y: midpoint.y - height / 2 },
              { x: midpoint.x - width - floatingToolbarGap, y: midpoint.y - height / 2 }
            ], width, height, avoidRects);
          })()
        : null;
  Object.assign(__appScope, { edgeFloatingToolbar });
  const floatingToolbarWrapperStyle = createFloatingToolbarWrapperStyle(__appScope);
  Object.assign(__appScope, { floatingToolbarWrapperStyle });
  const renderMeasurementGroup = __s("renderMeasurementGroup", createRenderMeasurementGroup); Object.assign(__appScope, { renderMeasurementGroup });
  const resizeSizeHint =
      transformDrag && transformDrag.kind !== "rotate"
        ? (() => {
            if (isGroupTransformDrag(transformDrag)) {
              const point = transformDrag.previewPoint;
              if (!point) {
                return null;
              }
              const geometry = groupTransformGeometry(transformDrag, point);
              if (geometry.kind !== "scale") {
                return null;
              }
              const width = Math.round((transformDrag.bounds.right - transformDrag.bounds.left) * geometry.scaleX);
              const height = Math.round((transformDrag.bounds.bottom - transformDrag.bounds.top) * geometry.scaleY);
              return {
                x: transformDrag.center.x,
                y: transformDrag.bounds.bottom + 26 * svgUiUnitY,
                text: `${width} x ${height}${transformDrag.proportionalScale ? " 等比" : ""}`
              };
            }
            const node = nodeById.get(transformDrag.nodeId);
            if (!node) {
              return null;
            }
            return {
              x: node.position.x,
              y: node.position.y + (node.size.height * Math.abs(getNodeScaleY(node))) / 2 + 30 * svgUiUnitY,
              text: `${Math.round(node.size.width * Math.abs(getNodeScaleX(node)))} x ${Math.round(node.size.height * Math.abs(getNodeScaleY(node)))}${transformDrag.proportionalScale || transformDrag.kind === "scale-both" ? " 等比" : ""}`
            };
          })()
        : null;
  Object.assign(__appScope, { resizeSizeHint });
  useEffect(createAppHookCallback137(__appScope), [editHotInteractionActive, routedEdges, visibleNodes]);
  const minimapScale = Math.min(
      (CANVAS_MINIMAP_WIDTH - CANVAS_MINIMAP_PADDING * 2) / Math.max(1, canvasWidth),
      (CANVAS_MINIMAP_HEIGHT - CANVAS_MINIMAP_PADDING * 2) / Math.max(1, canvasHeight)
    );
  Object.assign(__appScope, { minimapScale });
  const minimapContentWidth = canvasWidth * minimapScale; Object.assign(__appScope, { minimapContentWidth });
  const minimapContentHeight = canvasHeight * minimapScale; Object.assign(__appScope, { minimapContentHeight });
  const minimapOffsetX = (CANVAS_MINIMAP_WIDTH - minimapContentWidth) / 2; Object.assign(__appScope, { minimapOffsetX });
  const minimapOffsetY = (CANVAS_MINIMAP_HEIGHT - minimapContentHeight) / 2; Object.assign(__appScope, { minimapOffsetY });
  const minimapNodeStep = Math.max(1, Math.ceil(visibleNodes.length / CANVAS_MINIMAP_MAX_NODE_MARKS)); Object.assign(__appScope, { minimapNodeStep });
  const minimapRouteStep = Math.max(1, Math.ceil(routedEdges.length / CANVAS_MINIMAP_MAX_ROUTE_MARKS)); Object.assign(__appScope, { minimapRouteStep });
  const minimapNodes = useMemo(createAppHookCallback138(__appScope), [editHotInteractionActive, minimapNodeStep, minimapSamplingReady, visibleNodes]);
  Object.assign(__appScope, { minimapNodes });
  const minimapRoutes = useMemo(createAppHookCallback139(__appScope), [editHotInteractionActive, minimapRouteStep, minimapSamplingReady, routedEdges]);
  Object.assign(__appScope, { minimapRoutes });
  const mapPointToMinimap = createMapPointToMinimap(__appScope);
  Object.assign(__appScope, { mapPointToMinimap });
  const minimapViewportLeft = clampNumber(minimapOffsetX + canvasVisibleViewBox.x * minimapScale, minimapOffsetX, minimapOffsetX + minimapContentWidth); Object.assign(__appScope, { minimapViewportLeft });
  const minimapViewportTop = clampNumber(minimapOffsetY + canvasVisibleViewBox.y * minimapScale, minimapOffsetY, minimapOffsetY + minimapContentHeight); Object.assign(__appScope, { minimapViewportTop });
  const minimapViewportRight = clampNumber(minimapOffsetX + (canvasVisibleViewBox.x + canvasVisibleViewBox.width) * minimapScale, minimapOffsetX, minimapOffsetX + minimapContentWidth); Object.assign(__appScope, { minimapViewportRight });
  const minimapViewportBottom = clampNumber(minimapOffsetY + (canvasVisibleViewBox.y + canvasVisibleViewBox.height) * minimapScale, minimapOffsetY, minimapOffsetY + minimapContentHeight); Object.assign(__appScope, { minimapViewportBottom });
  const handleMinimapNavigate = __s("handleMinimapNavigate", createHandleMinimapNavigate); Object.assign(__appScope, { handleMinimapNavigate });
  const centerSelectedInView = __s("centerSelectedInView", createCenterSelectedInView); Object.assign(__appScope, { centerSelectedInView });
  const fitViewToSelection = __s("fitViewToSelection", createFitViewToSelection); Object.assign(__appScope, { fitViewToSelection });
  Object.assign(__appScope, { isStaticButtonEnabledForNode });
  const clearStaticButtonFeedbackTimer = __s("clearStaticButtonFeedbackTimer", createClearStaticButtonFeedbackTimer); Object.assign(__appScope, { clearStaticButtonFeedbackTimer });
  const setStaticButtonFeedback = __s("setStaticButtonFeedback", createSetStaticButtonFeedback); Object.assign(__appScope, { setStaticButtonFeedback });
  const clearStaticButtonFeedback = __s("clearStaticButtonFeedback", createClearStaticButtonFeedback); Object.assign(__appScope, { clearStaticButtonFeedback });
  const beginStaticButtonPointerFeedback = __s("beginStaticButtonPointerFeedback", createBeginStaticButtonPointerFeedback); Object.assign(__appScope, { beginStaticButtonPointerFeedback });
  const resolveStaticButtonTargetProject = __s("resolveStaticButtonTargetProject", createResolveStaticButtonTargetProject); Object.assign(__appScope, { resolveStaticButtonTargetProject });
  const executeStaticButtonCommand = __s("executeStaticButtonCommand", createExecuteStaticButtonCommand); Object.assign(__appScope, { executeStaticButtonCommand });
  const executeStaticButtonAction = __s("executeStaticButtonAction", createExecuteStaticButtonAction); Object.assign(__appScope, { executeStaticButtonAction });
  const handleStaticButtonClick = __s("handleStaticButtonClick", createHandleStaticButtonClick); Object.assign(__appScope, { handleStaticButtonClick });
  useEffect(createAppHookCallback140(__appScope), [activeProjectKey, backgroundProjectId, backgroundProjectRecord]);
  const backgroundPageFrameRender = useMemo(createAppHookCallback141(__appScope), [activeProjectKey, backgroundProjectId, backgroundProjectRecord, canvasHeight, canvasWidth, imageAssets]);
  Object.assign(__appScope, { backgroundPageFrameRender });
  const backgroundPageRender = useMemo(createAppHookCallback142(__appScope), [backgroundLayerIds, backgroundPageFrameRender, backgroundPageRenderReady]);
  Object.assign(__appScope, { backgroundPageRender });
  const beginReadonlyBackgroundStaticButtonPointerFeedback = __s("beginReadonlyBackgroundStaticButtonPointerFeedback", createBeginReadonlyBackgroundStaticButtonPointerFeedback); Object.assign(__appScope, { beginReadonlyBackgroundStaticButtonPointerFeedback });
  const renderReadonlyBackgroundPage = __s("renderReadonlyBackgroundPage", createRenderReadonlyBackgroundPage); Object.assign(__appScope, { renderReadonlyBackgroundPage });
  const viewportOverlayStyle = {
      // 悬浮工具条永远水平居中：居中基准是"可用区"（视口去掉两侧面板让位后的中间），
      // 与适配视图同一口径 —— 面板显隐或拖宽时会跟着重算，视觉上始终居中
      "--viewport-overlay-center-shift": `${canvasFitCenterOffsetX({
        left: canvasFitPanelInset(__appScope.leftPanelVisible ? leftPanelWidth : 0),
        right: canvasFitPanelInset(rightPanelVisible ? rightPanelWidth : 0)
      })}px`,
      "--viewport-overlay-bottom": `${statusbarHeight + 14}px`
    } as CSSProperties;
  Object.assign(__appScope, { viewportOverlayStyle });
  const topologyWarningPanelVisible = inspectorTopologyErrors.length > 0 && !topologyWarningPanelClosed; Object.assign(__appScope, { topologyWarningPanelVisible });
  const openTopologyWarningPanel = __s("openTopologyWarningPanel", createOpenTopologyWarningPanel); Object.assign(__appScope, { openTopologyWarningPanel });
  const topologyWarningPanelDefaultRight =
      (rightPanelVisible ? rightPanelWidth + 28 : 16) + CANVAS_MINIMAP_WIDTH + TOPOLOGY_WARNING_PANEL_MARGIN; Object.assign(__appScope, { topologyWarningPanelDefaultRight });
  const topologyWarningPanelStyle = topologyWarningPanelPosition
      ? {
          left: `${topologyWarningPanelPosition.left}px`,
          top: `${topologyWarningPanelPosition.top}px`,
          width: `${topologyWarningPanelWidth}px`,
          height: `${topologyWarningPanelHeight}px`
        } as CSSProperties
      : {
          right: `${topologyWarningPanelDefaultRight}px`,
          bottom: `${statusbarHeight + 14}px`,
          width: `${topologyWarningPanelWidth}px`,
          height: `${topologyWarningPanelHeight}px`
        } as CSSProperties;
  Object.assign(__appScope, { topologyWarningPanelStyle });
  const appShellStyle = {
      "--left-panel-width": `${leftPanelWidth}px`,
      "--right-panel-width": `${rightPanelWidth}px`,
      "--statusbar-height": `${statusbarHeight}px`
    } as CSSProperties;
  Object.assign(__appScope, { appShellStyle });
  const effectiveLeftPanelTab = leftPanelTab; Object.assign(__appScope, { effectiveLeftPanelTab });
  // 按当前激活标签页懒构造左栏内容，避免画布交互/配色变化时为未显示的标签页提前构建整棵 JSX 树
  const libraryPanelContent = useMemo(
      () => (effectiveLeftPanelTab === "library" ? renderLibraryPanel() : null),
      [
        effectiveLeftPanelTab,
        colorPalette,
        componentLibraryDisplayMode,
        collapsedExpandedModeCategoryLibraries,
        collapsedExpandedModeComponentLibraries,
        displayedCategoryLibraries,
        expandedCategoryLibraries,
        expandedCategoryLibraryComponentLibraries,
        filteredCategoryLibraryByComponentLibrary,
        hoveredCategoryLibrary,
        hoveredCategoryLibraryComponentLibrary,
        isEditMode,
        libraryFlyoutPositions,
        libraryPreviewByKind,
        librarySearchNeedle,
        librarySearchQuery,
        libraryTreeDragKey,
        libraryTreeDropKey,
        libraryTreeOrder,
        measurementConfig,
        interfaceCustomization
      ]
    );
  Object.assign(__appScope, { libraryPanelContent });
  const templateLibraryPanelContent = useMemo(
      () => (effectiveLeftPanelTab === "templates" ? renderTemplateLibraryPanel() : null),
      [
        effectiveLeftPanelTab,
        colorPalette,
        displayedGraphTemplateTypes,
        expandedGraphTemplateTypes,
        filteredGroupedGraphTemplates,
        hoveredGraphTemplateType,
        isEditMode,
        libraryFlyoutPositions,
        templateLibraryDisplayMode,
        templateLibrarySearchNeedle,
        templateLibrarySearchQuery,
        libraryTreeOrder,
        groupedGraphTemplates,
        customGraphTemplates,
        customGraphTemplateTypes
      ]
    );
  Object.assign(__appScope, { templateLibraryPanelContent });
  const projectPanelContent = useMemo(
      () => (effectiveLeftPanelTab === "projects" ? renderProjectPanel() : null),
      [
        effectiveLeftPanelTab,
        activeProjectKey,
        __appScope.expandedSchemeIds,
        __appScope.filteredProjectSchemes,
        isEditMode,
        __appScope.projectSearchNeedle,
        __appScope.projectSearchQuery,
        schemes,
        selectedProjectId,
        selectedProjectIds,
        selectedSchemeId,
        selectedSchemeIds,
        // 方案树拖动排序：落点键与顺序覆盖变化时必须重算面板内容，
        // 否则插入指示线（class）与拖动后的顺序不会反映到 DOM。
        projectTreeDragKey,
        projectTreeDropKey,
        libraryTreeOrder,
        __appScope.loadingModel
      ]
    );
  Object.assign(__appScope, { projectPanelContent });
  const leftPanelContent = effectiveLeftPanelTab === "projects"
      ? projectPanelContent
      : effectiveLeftPanelTab === "templates"
        ? templateLibraryPanelContent
        : libraryPanelContent;
  Object.assign(__appScope, { leftPanelContent });
  const canvasResizeHandles = (
      <g className="canvas-resize-handles" aria-hidden="true">
        <rect
          className="canvas-resize-handle canvas-resize-handle-left"
          x={-CANVAS_RESIZE_HANDLE_SIZE / 2}
          y={CANVAS_RESIZE_HANDLE_SIZE}
          width={CANVAS_RESIZE_HANDLE_SIZE}
          height={Math.max(CANVAS_RESIZE_HANDLE_SIZE, canvasRenderBounds.height - CANVAS_RESIZE_HANDLE_SIZE * 2)}
          onPointerDown={(event) => startCanvasResize(event, "left")}
        />
        <rect
          className="canvas-resize-handle canvas-resize-handle-top"
          x={CANVAS_RESIZE_HANDLE_SIZE}
          y={-CANVAS_RESIZE_HANDLE_SIZE / 2}
          width={Math.max(CANVAS_RESIZE_HANDLE_SIZE, canvasRenderBounds.width - CANVAS_RESIZE_HANDLE_SIZE * 2)}
          height={CANVAS_RESIZE_HANDLE_SIZE}
          onPointerDown={(event) => startCanvasResize(event, "top")}
        />
        <rect
          className="canvas-resize-handle canvas-resize-handle-right"
          x={canvasRenderBounds.width - CANVAS_RESIZE_HANDLE_SIZE / 2}
          y={CANVAS_RESIZE_HANDLE_SIZE}
          width={CANVAS_RESIZE_HANDLE_SIZE}
          height={Math.max(CANVAS_RESIZE_HANDLE_SIZE, canvasRenderBounds.height - CANVAS_RESIZE_HANDLE_SIZE * 2)}
          onPointerDown={(event) => startCanvasResize(event, "right")}
        />
        <rect
          className="canvas-resize-handle canvas-resize-handle-bottom"
          x={CANVAS_RESIZE_HANDLE_SIZE}
          y={canvasRenderBounds.height - CANVAS_RESIZE_HANDLE_SIZE / 2}
          width={Math.max(CANVAS_RESIZE_HANDLE_SIZE, canvasRenderBounds.width - CANVAS_RESIZE_HANDLE_SIZE * 2)}
          height={CANVAS_RESIZE_HANDLE_SIZE}
          onPointerDown={(event) => startCanvasResize(event, "bottom")}
        />
        <rect
          className="canvas-resize-handle canvas-resize-handle-corner"
          x={canvasRenderBounds.width - CANVAS_RESIZE_HANDLE_SIZE}
          y={canvasRenderBounds.height - CANVAS_RESIZE_HANDLE_SIZE}
          width={CANVAS_RESIZE_HANDLE_SIZE}
          height={CANVAS_RESIZE_HANDLE_SIZE}
          onPointerDown={(event) => startCanvasResize(event, "corner")}
        />
        <rect
          className="canvas-resize-handle canvas-resize-handle-top-left"
          x={0}
          y={0}
          width={CANVAS_RESIZE_HANDLE_SIZE}
          height={CANVAS_RESIZE_HANDLE_SIZE}
          onPointerDown={(event) => startCanvasResize(event, "top-left")}
        />
        <rect
          className="canvas-resize-handle canvas-resize-handle-top-right"
          x={canvasRenderBounds.width - CANVAS_RESIZE_HANDLE_SIZE}
          y={0}
          width={CANVAS_RESIZE_HANDLE_SIZE}
          height={CANVAS_RESIZE_HANDLE_SIZE}
          onPointerDown={(event) => startCanvasResize(event, "top-right")}
        />
        <rect
          className="canvas-resize-handle canvas-resize-handle-bottom-left"
          x={0}
          y={canvasRenderBounds.height - CANVAS_RESIZE_HANDLE_SIZE}
          width={CANVAS_RESIZE_HANDLE_SIZE}
          height={CANVAS_RESIZE_HANDLE_SIZE}
          onPointerDown={(event) => startCanvasResize(event, "bottom-left")}
        />
      </g>
    );
  Object.assign(__appScope, { canvasResizeHandles });
  syncStableLiveScope(__stableFactories, __appScope);
}
