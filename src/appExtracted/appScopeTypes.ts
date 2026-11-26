/**
 * __appScope 分域强类型接口定义。
 * 1. `AppScopeContract` 完整声明各核心状态、引用与回调的真实强类型契约，作为渐进式收紧与 IDE 补全的唯一真相源；
 * 2. 各业务分域类型（`StateIconDrawingScope`、`DeviceDefinitionScope`、`ProjectCanvasScope` 等）通过 `ScopedAppContext`
 *    按域声明所依赖的上下文键集，既消除 46 个工厂文件中散落的 `Record<string, any>`，又零破坏兼容现有解构写法与单元测试极简 mock。
 */
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type {
  Edge,
  DeviceTemplate,
  ModelLayer,
  ModelNode,
  ModelType,
  Point
} from "../model";
import type {
  CategoryLibrary,
  CustomDeviceDraft,
  DeviceDefinitionDraftRow,
  DeviceDefinitionVisualDraft,
  ImageAsset,
  ImageFolder,
  StateIconDrawingDialogState
} from "./appCoreCanvasUtilities";

export type ViewBoxState = { x: number; y: number; width: number; height: number };
export type ComponentLibraryRecord = Record<string, unknown>;
export type SavedProjectRecordLike = Record<string, unknown>;
export type SavedSchemeRecordLike = Record<string, unknown>;

/** 渐进迁移期集中收口的动态槽位类型（全仓唯一入口，避免各业务模块散落 `any`）。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppScopeDynamicSlot = any;

/** 全量核心应用上下文强类型契约（供渐进式逐字段收紧与 IDE 类型导航）。 */
export interface AppScopeContract {
  nodes: ModelNode[];
  edges: Edge[];
  activeNodes: ModelNode[];
  activeEdges: Edge[];
  layers: ModelLayer[];
  activeLayerId: string;
  selectedIds: string[];
  selectedEdgeId: string;
  selectedEdgeIds: string[];
  activeProjectKey: string;
  activeProjectId: string;
  activeSchemeKey: string;
  activeSchemeId: string;
  projectName: string;
  modelType: ModelType;
  canvasWidth: number;
  canvasHeight: number;
  viewBox: ViewBoxState;
  setViewBox: Dispatch<SetStateAction<ViewBoxState>>;
  svgRef: MutableRefObject<SVGSVGElement | null>;
  savedSchemes: SavedSchemeRecordLike[];
  savedProjects: SavedProjectRecordLike[];
  allTemplates: DeviceTemplate[];
  customDeviceTemplates: DeviceTemplate[];
  imageAssets: ImageAsset[];
  imageFolders: ImageFolder[];
  showGlobalMessage: (message: string, type?: string) => void;
  showGlobalConfirm: (message: string, options?: Record<string, unknown>) => Promise<boolean>;
  writeOperationLog: (action: string, detail?: string) => void;
  pushUndoSnapshot: (...args: AppScopeDynamicSlot[]) => void;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setSelectedEdgeId: Dispatch<SetStateAction<string>>;
  routeByEdgeId: Map<string, Point[]>;
  canvasToWorld: (clientX: number, clientY: number) => Point;
  updateEdges: (updater: (prev: Edge[]) => Edge[]) => void;
  updateNodes: (updater: (prev: ModelNode[]) => ModelNode[]) => void;
  stateIconDrawingDialog: StateIconDrawingDialogState | null;
  setStateIconDrawingDialog: Dispatch<SetStateAction<StateIconDrawingDialogState | null>>;
  stateIconDrawingHistoryRef: MutableRefObject<AppScopeDynamicSlot>;
  stateIconDrawingClipboardRef: MutableRefObject<AppScopeDynamicSlot>;
  stateIconDrawingDragRef: MutableRefObject<AppScopeDynamicSlot>;
  stateIconDrawingSvgRef: MutableRefObject<SVGSVGElement | null>;
  stateIconDrawingImportInputRef: MutableRefObject<HTMLInputElement | null>;
  schemeImportInputRef: MutableRefObject<HTMLInputElement | null>;
  modelImportInputRef: MutableRefObject<HTMLInputElement | null>;
  svgModelImportInputRef: MutableRefObject<HTMLInputElement | null>;
  dotModelImportInputRef: MutableRefObject<HTMLInputElement | null>;
  eDeviceDefinitionImportInputRef: MutableRefObject<HTMLInputElement | null>;
  showStandaloneExportCompletion: (title: string, message: string, details?: string[], file?: AppScopeDynamicSlot) => void;
  imageInputRef: MutableRefObject<HTMLInputElement | null>;
  selectedImageFolderId: string;
  setImageAssets: Dispatch<SetStateAction<ImageAsset[]>>;
  setImageFolders: Dispatch<SetStateAction<ImageFolder[]>>;
  expandedSchemeIds: string[];
  setExpandedSchemeIds: Dispatch<SetStateAction<string[]>>;
  projectTreeDragKey: string;
  setProjectTreeDragKey: Dispatch<SetStateAction<string>>;
  projectTreeDropKey: string;
  setProjectTreeDropKey: Dispatch<SetStateAction<string>>;
  projectTreeDragExpandTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  customDeviceDraft: CustomDeviceDraft;
  setCustomDeviceDraft: Dispatch<SetStateAction<CustomDeviceDraft>>;
  definitionDraftRows: DeviceDefinitionDraftRow[];
  definitionVisualDraft: DeviceDefinitionVisualDraft | null;
  customCategoryLibraries: CategoryLibrary[];
  customComponentLibraries: ComponentLibraryRecord[];
}

/** 渐进式分域上下文构造器：声明已知字段清单并兼容既有解构与局部测试夹具。 */
export type ScopedAppContext<K extends keyof AppScopeContract = keyof AppScopeContract> = {
  [P in K]?: AppScopeContract[P] | AppScopeDynamicSlot;
} & Record<string, AppScopeDynamicSlot>;

/** 所有业务工厂共享的最小核心应用上下文。 */
export type AppScopeBase = ScopedAppContext<
  | "nodes"
  | "edges"
  | "activeNodes"
  | "activeEdges"
  | "layers"
  | "activeLayerId"
  | "selectedIds"
  | "selectedEdgeId"
  | "activeProjectKey"
  | "activeSchemeKey"
  | "projectName"
  | "modelType"
  | "canvasWidth"
  | "canvasHeight"
  | "viewBox"
  | "showGlobalMessage"
  | "showGlobalConfirm"
  | "writeOperationLog"
  | "pushUndoSnapshot"
>;

/** 状态图标画板编辑子域上下文。 */
export type StateIconDrawingScope = AppScopeBase & ScopedAppContext<
  | "stateIconDrawingDialog"
  | "setStateIconDrawingDialog"
  | "stateIconDrawingHistoryRef"
  | "stateIconDrawingClipboardRef"
  | "stateIconDrawingDragRef"
  | "stateIconDrawingSvgRef"
  | "stateIconDrawingImportInputRef"
>;

/** 画布连线、手动折点与端子连线交互子域上下文。 */
export type EdgeRouteInteractionScope = AppScopeBase & ScopedAppContext<
  | "svgRef"
  | "canvasToWorld"
  | "routeByEdgeId"
  | "updateEdges"
  | "updateNodes"
>;

/** 多格式导入导出与重名冲突处理子域上下文。 */
export type ExportImportScope = AppScopeBase & ScopedAppContext<
  | "schemeImportInputRef"
  | "modelImportInputRef"
  | "svgModelImportInputRef"
  | "dotModelImportInputRef"
  | "eDeviceDefinitionImportInputRef"
  | "showStandaloneExportCompletion"
>;

/** 图片素材库与文件夹管理子域上下文。 */
export type ImageLibraryScope = AppScopeBase & ScopedAppContext<
  | "imageAssets"
  | "imageFolders"
  | "imageInputRef"
  | "selectedImageFolderId"
  | "setImageAssets"
  | "setImageFolders"
>;

/** 方案树 / 模型树拖拽排序与渲染子域上下文。 */
export type ProjectTreeScope = AppScopeBase & ScopedAppContext<
  | "savedSchemes"
  | "savedProjects"
  | "expandedSchemeIds"
  | "setExpandedSchemeIds"
  | "projectTreeDragKey"
  | "setProjectTreeDragKey"
  | "projectTreeDropKey"
  | "setProjectTreeDropKey"
  | "projectTreeDragExpandTimerRef"
>;

/** 设备与元件定义草稿、自定义模板与类别库树管理主域上下文。 */
export type DeviceDefinitionScope = AppScopeBase & ScopedAppContext<
  | "allTemplates"
  | "customDeviceTemplates"
  | "customDeviceDraft"
  | "setCustomDeviceDraft"
  | "definitionDraftRows"
  | "definitionVisualDraft"
  | "customCategoryLibraries"
  | "customComponentLibraries"
>;

/** 方案画布、视口导航与布局操作上下文。 */
export type ProjectCanvasScope = AppScopeBase & ScopedAppContext<"svgRef" | "setViewBox" | "savedSchemes" | "savedProjects">;

/** 图存储、量测配置与路由缓存上下文。 */
export type GraphMeasurementScope = AppScopeBase & ScopedAppContext<"routeByEdgeId" | "setSelectedIds" | "setSelectedEdgeId">;

/** 选区拖拽、群组变换与撤销重做上下文。 */
export type SelectionDragScope = AppScopeBase & ScopedAppContext<"svgRef" | "routeByEdgeId" | "setSelectedIds">;

/** 画布指针、滚轮缩放、连线与静态绘图交互上下文。 */
export type CanvasInteractionScope = AppScopeBase & ScopedAppContext<"svgRef" | "setViewBox" | "canvasToWorld">;

/** 工具栏、静态按钮与钩子回调上下文。 */
export type ToolbarHookScope = AppScopeBase & ScopedAppContext<"svgRef" | "setViewBox" | "savedSchemes" | "savedProjects">;
