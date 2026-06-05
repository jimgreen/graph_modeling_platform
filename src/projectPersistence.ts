import { normalizeProjectMeasurements, type ProjectMeasurementConfig } from "./measurements";
import {
  createSavedScheme,
  findSavedProjectRecordInSchemes,
  flattenSavedSchemes,
  hydrateSavedSchemeRuntimeIds,
  normalizeModelGroups,
  normalizeNodeTerminalsByTemplate,
  normalizeProjectLayers,
  normalizeSavedProjectRecordNames,
  savedProjectRecordNameKey,
  stripSavedSchemeRuntimeIds,
  type DeviceIndexCounters,
  type Edge,
  type ModelGroup,
  type ModelLayer,
  type ModelNode,
  type PersistedSavedSchemeRecord,
  type ProjectFile,
  type SavedProjectRecord,
  type SavedSchemeRecord
} from "./model";

export const DEFAULT_CANVAS_BACKGROUND = "#f1f5f9";
export const DEFAULT_POWER_UNIT = "MW";
export const DEFAULT_VOLTAGE_UNIT = "kV";
export const DEFAULT_CURRENT_UNIT = "A";
export const DEFAULT_POWER_BASE_VALUE = 100;

const PROJECT_STORAGE_KEY = "power-system-model-projects";
export const SCHEME_STORAGE_KEY = "power-system-model-schemes";
export const ACTIVE_PROJECT_STORAGE_KEY = "power-system-active-project";
export const DRAFT_PROJECT_STORAGE_KEY = "power-system-current-draft";
const REFRESH_RECOVERY_STORAGE_KEY = "power-system-refresh-recovery";
const IMAGE_STORAGE_KEY = "power-system-image-assets";

export type DraftProjectState = {
  projectName: string;
  activeProjectKey: string;
  activeSchemeKey: string;
  layers?: ModelLayer[];
  activeLayerId?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  allowAutoExpandCanvas?: boolean;
  canvasBackgroundColor?: string;
  canvasBackgroundImage?: string;
  canvasBackgroundImageAssetId?: string;
  backgroundProjectId?: string;
  backgroundLayerIds?: string[];
  powerUnit?: string;
  voltageUnit?: string;
  currentUnit?: string;
  powerBaseValue?: number;
  deviceIndexCounters?: DeviceIndexCounters;
  groups?: ModelGroup[];
  measurements?: ProjectMeasurementConfig;
  nodes: ModelNode[];
  edges: Edge[];
};

export type ActiveProjectPointer = {
  activeProjectName: string;
  activeSchemePath: string[];
};

export type RefreshRecoveryProjectState = DraftProjectState & {
  dirty: true;
  savedAt: string;
};

export type ImageAsset = {
  id: string;
  name: string;
  folderId?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  url: string;
};

export type ImageFolder = {
  id: string;
  name: string;
  createdAt?: string;
  imageCount?: number;
};

type BackendSchemesResponse = {
  schemes: SavedSchemeRecord[];
};

function normalizeLegacyPowerSystemLabel(value: string) {
  return value.replace(/电力系统/g, "电力能源系统");
}

function normalizeSavedProjectIndexes(project: SavedProjectRecord): SavedProjectRecord {
  const normalizedName = normalizeLegacyPowerSystemLabel(project.name);
  const normalizedProject = normalizeProjectLayers({
    ...project.project,
    name: normalizeLegacyPowerSystemLabel(project.project.name ?? normalizedName),
    nodes: project.project.nodes.map(normalizeNodeTerminalsByTemplate)
  });
  return {
    ...project,
    name: normalizedName,
    project: normalizedProject
  };
}

function normalizeSavedSchemeIndexes(scheme: SavedSchemeRecord): SavedSchemeRecord {
  return {
    ...scheme,
    name: normalizeLegacyPowerSystemLabel(scheme.name),
    projects: Array.isArray(scheme.projects)
      ? normalizeSavedProjectRecordNames(scheme.projects.map(normalizeSavedProjectIndexes))
      : [],
    children: Array.isArray(scheme.children)
      ? scheme.children.map(normalizeSavedSchemeIndexes)
      : []
  };
}

function readSavedProjects(): SavedProjectRecord[] {
  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedProjectRecord[]) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeSavedProjectIndexes) : [];
  } catch {
    return [];
  }
}

export function readStoredSchemesPayload(): string | null {
  try {
    return window.localStorage.getItem(SCHEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readSavedSchemes(raw = readStoredSchemesPayload()): SavedSchemeRecord[] {
  try {
    if (raw) {
      const parsed = JSON.parse(raw) as SavedSchemeRecord[];
      if (Array.isArray(parsed)) {
        return hydrateSavedSchemeRuntimeIds(parsed.map(normalizeSavedSchemeIndexes));
      }
    }
    const legacyProjects = readSavedProjects();
    return hydrateSavedSchemeRuntimeIds(
      legacyProjects.length > 0 ? [createSavedScheme("默认方案", legacyProjects)] : [createSavedScheme("默认方案")]
    );
  } catch {
    return hydrateSavedSchemeRuntimeIds([createSavedScheme("默认方案")]);
  }
}

function normalizeStoredDraftProject(parsed: DraftProjectState): DraftProjectState | null {
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    return null;
  }
  return {
    ...parsed,
    projectName: normalizeLegacyPowerSystemLabel(parsed.projectName),
    ...normalizeProjectLayers({
      version: 1,
      name: parsed.projectName,
      layers: parsed.layers,
      activeLayerId: parsed.activeLayerId,
      groups: parsed.groups,
      measurements: parsed.measurements,
      nodes: parsed.nodes.map(normalizeNodeTerminalsByTemplate),
      edges: parsed.edges
    }),
    activeProjectKey: parsed.activeProjectKey,
    activeSchemeKey: parsed.activeSchemeKey,
    canvasWidth: parsed.canvasWidth,
    canvasHeight: parsed.canvasHeight,
    allowAutoExpandCanvas: parsed.allowAutoExpandCanvas,
    canvasBackgroundColor: parsed.canvasBackgroundColor,
    canvasBackgroundImage: parsed.canvasBackgroundImage,
    canvasBackgroundImageAssetId: parsed.canvasBackgroundImageAssetId,
    backgroundProjectId: parsed.backgroundProjectId,
    backgroundLayerIds: parsed.backgroundLayerIds,
    powerUnit: parsed.powerUnit,
    voltageUnit: parsed.voltageUnit,
    currentUnit: parsed.currentUnit,
    powerBaseValue: parsed.powerBaseValue,
    deviceIndexCounters: parsed.deviceIndexCounters,
    measurements: normalizeProjectMeasurements(parsed.measurements, parsed.nodes)
  };
}

export function readDraftProject(): DraftProjectState | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PROJECT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as DraftProjectState;
    return normalizeStoredDraftProject(parsed);
  } catch {
    return null;
  }
}

export function readActiveProjectPointer(): ActiveProjectPointer | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ActiveProjectPointer;
    const activeProjectName = typeof parsed.activeProjectName === "string" ? parsed.activeProjectName : "";
    const activeSchemePath = Array.isArray(parsed.activeSchemePath)
      ? parsed.activeSchemePath.filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      : [];
    if (!activeProjectName) {
      return null;
    }
    return {
      activeProjectName,
      activeSchemePath
    };
  } catch {
    return null;
  }
}

export function savedSchemePathForId(
  schemes: SavedSchemeRecord[],
  schemeId: string,
  parentPath: string[] = []
): string[] | null {
  for (const scheme of schemes) {
    const path = [...parentPath, scheme.name];
    if (scheme.id === schemeId) {
      return path;
    }
    const childPath = savedSchemePathForId(scheme.children ?? [], schemeId, path);
    if (childPath) {
      return childPath;
    }
  }
  return null;
}

function findSavedSchemeByPath(
  schemes: SavedSchemeRecord[],
  schemePath: string[]
): SavedSchemeRecord | undefined {
  if (schemePath.length === 0) {
    return undefined;
  }
  const [head, ...tail] = schemePath;
  const scheme = schemes.find((item) => item.name.trim() === head.trim());
  if (!scheme || tail.length === 0) {
    return scheme;
  }
  return findSavedSchemeByPath(scheme.children ?? [], tail);
}

export function findSavedProjectByActivePointer(
  schemes: SavedSchemeRecord[],
  pointer: ActiveProjectPointer | null
): { scheme: SavedSchemeRecord; project: SavedProjectRecord } | null {
  const projectName = pointer?.activeProjectName?.trim();
  if (!projectName) {
    return null;
  }
  const projectNameKey = savedProjectRecordNameKey(projectName);
  const activeSchemePath = pointer?.activeSchemePath ?? [];
  const preferredScheme = findSavedSchemeByPath(schemes, activeSchemePath);
  const searchSchemes = preferredScheme
    ? [preferredScheme, ...flattenSavedSchemes(schemes).filter((scheme) => scheme.id !== preferredScheme.id)]
    : flattenSavedSchemes(schemes);
  for (const scheme of searchSchemes) {
    const project = scheme.projects.find((item) => savedProjectRecordNameKey(item.name) === projectNameKey);
    if (project) {
      return { scheme, project };
    }
  }
  return null;
}

export function activeProjectPointerPayload(
  schemes: SavedSchemeRecord[],
  projectKey: string,
  schemeKey: string
): ActiveProjectPointer | null {
  if (!projectKey) {
    return null;
  }
  const found = findSavedProjectRecordInSchemes(schemes, projectKey, schemeKey);
  if (!found) {
    return null;
  }
  return {
    activeProjectName: found.project.name,
    activeSchemePath: savedSchemePathForId(schemes, found.scheme.id) ?? [found.scheme.name]
  };
}

export function draftProjectFromSavedSchemes(
  schemes: SavedSchemeRecord[],
  pointer: ActiveProjectPointer | null
): DraftProjectState | null {
  if (!pointer?.activeProjectName) {
    return null;
  }
  const found = findSavedProjectByActivePointer(schemes, pointer);
  if (found) {
    const { scheme, project: record } = found;
    return normalizeStoredDraftProject({
      projectName: record.project.name ?? record.name,
      activeProjectKey: record.id,
      activeSchemeKey: scheme.id,
      canvasWidth: record.project.canvasWidth,
      canvasHeight: record.project.canvasHeight,
      allowAutoExpandCanvas: record.project.allowAutoExpandCanvas,
      canvasBackgroundColor: record.project.canvasBackgroundColor,
      canvasBackgroundImage: record.project.canvasBackgroundImage,
      canvasBackgroundImageAssetId: record.project.canvasBackgroundImageAssetId,
      backgroundProjectId: record.project.backgroundProjectId,
      backgroundLayerIds: record.project.backgroundLayerIds,
      powerUnit: record.project.powerUnit,
      voltageUnit: record.project.voltageUnit,
      currentUnit: record.project.currentUnit,
      powerBaseValue: record.project.powerBaseValue,
      deviceIndexCounters: record.project.deviceIndexCounters,
      layers: record.project.layers,
      activeLayerId: record.project.activeLayerId,
      groups: record.project.groups,
      measurements: record.project.measurements,
      nodes: record.project.nodes,
      edges: record.project.edges
    });
  }
  return null;
}

export function readRefreshRecoveryProject(): DraftProjectState | null {
  try {
    const raw = window.sessionStorage.getItem(REFRESH_RECOVERY_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as RefreshRecoveryProjectState;
    if (!parsed.dirty) {
      return null;
    }
    return normalizeStoredDraftProject(parsed);
  } catch {
    return null;
  }
}

export function writeRefreshRecoveryProject(state: RefreshRecoveryProjectState) {
  try {
    window.sessionStorage.setItem(REFRESH_RECOVERY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 恢复缓存只是防止页面自动刷新丢失未保存内容，写入失败不阻断编辑。
  }
}

export function clearRefreshRecoveryProject() {
  try {
    window.sessionStorage.removeItem(REFRESH_RECOVERY_STORAGE_KEY);
  } catch {
    // 忽略浏览器会话缓存不可写/不可删的情况。
  }
}

export function readImageAssets(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(IMAGE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveImageAsset(id: string, dataUrl: string) {
  const assets = readImageAssets();
  window.localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify({ ...assets, [id]: dataUrl }));
}

export function resolveNodeImage(node: ModelNode, assets = readImageAssets()) {
  const assetId = node.params.backgroundImageAssetId;
  return (assetId && assets[assetId]) || node.params.backgroundImage || "";
}

export function resolveNodeForegroundImage(node: ModelNode, assets = readImageAssets()) {
  const assetId = node.params.foregroundImageAssetId;
  return (assetId && assets[assetId]) || node.params.foregroundImage || "";
}

export function resolveProjectImage(project: Pick<ProjectFile, "canvasBackgroundImage" | "canvasBackgroundImageAssetId">, assets = readImageAssets()) {
  const assetId = project.canvasBackgroundImageAssetId;
  return (assetId && assets[assetId]) || project.canvasBackgroundImage || "";
}

export const imageAssetsToMap = (assets: ImageAsset[]) =>
  Object.fromEntries(assets.map((asset) => [asset.id, asset.url]));

export const localImageAssetsFromStorage = (): ImageAsset[] =>
  Object.entries(readImageAssets()).map(([id, url], index) => ({ id, name: `本地图片 ${index + 1}`, folderId: "root", url }));

const backendJsonHeaders = { "content-type": "application/json" };

async function backendErrorMessage(response: Response, fallbackMessage: string) {
  const payload = await response.json().catch(() => ({}));
  return typeof payload.error === "string" ? payload.error : fallbackMessage;
}

export async function fetchBackendJson<T>(url: string, fallbackMessage: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await backendErrorMessage(response, fallbackMessage));
  }
  return (await response.json()) as T;
}

export function backendJsonRequest(method: "POST" | "PUT", body: string): RequestInit {
  return {
    method,
    headers: backendJsonHeaders,
    body
  };
}

export async function fetchBackendImageFolders(): Promise<ImageFolder[]> {
  return fetchBackendJson<ImageFolder[]>("/api/image-folders", "读取后台图片文件夹失败。");
}

export async function createBackendImageFolder(name: string): Promise<ImageFolder> {
  return fetchBackendJson<ImageFolder>(
    "/api/image-folders",
    "新建图片文件夹失败。",
    backendJsonRequest("POST", JSON.stringify({ name }))
  );
}

export async function renameBackendImageFolder(folderId: string, name: string): Promise<ImageFolder> {
  return fetchBackendJson<ImageFolder>(
    `/api/image-folders/${encodeURIComponent(folderId)}`,
    "重命名图片文件夹失败。",
    backendJsonRequest("PUT", JSON.stringify({ name }))
  );
}

export async function deleteBackendImageFolder(folderId: string): Promise<void> {
  await fetchBackendJson<{ ok?: boolean }>(`/api/image-folders/${encodeURIComponent(folderId)}`, "删除图片文件夹失败。", {
    method: "DELETE"
  });
}

export async function fetchBackendImages(folderId = "root"): Promise<ImageAsset[]> {
  return fetchBackendJson<ImageAsset[]>(`/api/images?folderId=${encodeURIComponent(folderId)}`, "读取后台图片列表失败。");
}

export async function uploadBackendImage(fileName: string, dataUrl: string, folderId = "root"): Promise<ImageAsset> {
  return fetchBackendJson<ImageAsset>(
    "/api/images",
    "上传图片到后台失败。",
    backendJsonRequest("POST", JSON.stringify({ name: fileName, dataUrl, folderId }))
  );
}

function normalizeProjectForBackend(project: ProjectFile): ProjectFile {
  const projectBackground =
    project.canvasBackgroundImageAssetId && typeof project.canvasBackgroundImage === "string" && project.canvasBackgroundImage.startsWith("data:")
      ? `/api/images/${project.canvasBackgroundImageAssetId}`
      : project.canvasBackgroundImage;
  return {
    ...project,
    canvasBackgroundColor: project.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND,
    canvasBackgroundImage: projectBackground,
    powerUnit: project.powerUnit ?? DEFAULT_POWER_UNIT,
    voltageUnit: project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT,
    currentUnit: project.currentUnit ?? DEFAULT_CURRENT_UNIT,
    powerBaseValue:
      typeof project.powerBaseValue === "number" && Number.isFinite(project.powerBaseValue)
        ? project.powerBaseValue
        : DEFAULT_POWER_BASE_VALUE,
    nodes: project.nodes.map((node) => {
      const assetId = node.params.backgroundImageAssetId;
      const backgroundImage = node.params.backgroundImage;
      const params: Record<string, string> =
        assetId && typeof backgroundImage === "string" && backgroundImage.startsWith("data:")
          ? { ...node.params, backgroundImage: `/api/images/${assetId}` }
          : { ...node.params };
      if (params.foregroundImageAssetId && typeof params.foregroundImage === "string" && params.foregroundImage.startsWith("data:")) {
        params.foregroundImage = `/api/images/${params.foregroundImageAssetId}`;
      }
      return {
        ...node,
        params,
        terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } }))
      };
    }),
    edges: project.edges.map((edge) => ({
      ...edge,
      sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
      targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
      manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
      routePoints: edge.routePoints?.map((point) => ({ ...point }))
    })),
    groups: normalizeModelGroups(project.groups, project.nodes, project.edges)
  };
}

function normalizeSchemesForBackendRuntime(schemes: SavedSchemeRecord[]): SavedSchemeRecord[] {
  return schemes.map((scheme) => ({
    ...scheme,
    projects: normalizeSavedProjectRecordNames(
      scheme.projects.map((project) => ({
        ...project,
        project: normalizeProjectForBackend(project.project)
      }))
    ),
    children: Array.isArray(scheme.children) ? normalizeSchemesForBackendRuntime(scheme.children) : []
  }));
}

function normalizeSchemesForBackend(schemes: SavedSchemeRecord[]): PersistedSavedSchemeRecord[] {
  return stripSavedSchemeRuntimeIds(normalizeSchemesForBackendRuntime(schemes));
}

export function serializeSchemesForStorage(schemes: SavedSchemeRecord[]) {
  return JSON.stringify(normalizeSchemesForBackend(schemes));
}

export function shouldPreferLocalSchemesOverBackend(options: {
  localSchemes: SavedSchemeRecord[];
  backendSchemes: SavedSchemeRecord[];
  hadStoredLocalSchemes: boolean;
}) {
  if (!options.hadStoredLocalSchemes) {
    return false;
  }
  if (serializeSchemesForStorage(options.localSchemes) === serializeSchemesForStorage(options.backendSchemes)) {
    return false;
  }
  if (options.backendSchemes.length === 0) {
    return true;
  }
  return false;
}

export function findProjectRecordInSchemes(
  schemes: SavedSchemeRecord[],
  projectId: string,
  preferredSchemeId = ""
): { scheme: SavedSchemeRecord; project: SavedProjectRecord } | null {
  return findSavedProjectRecordInSchemes(schemes, projectId, preferredSchemeId);
}

export function findProjectRecordByNameInScheme(
  scheme: SavedSchemeRecord | undefined,
  projectName: string
): SavedProjectRecord | null {
  if (!scheme) {
    return null;
  }
  const key = savedProjectRecordNameKey(projectName);
  return scheme.projects.find((project) => savedProjectRecordNameKey(project.name) === key) ?? null;
}

export async function fetchBackendSchemes(): Promise<SavedSchemeRecord[]> {
  const payload = await fetchBackendJson<BackendSchemesResponse | SavedSchemeRecord[]>("/api/schemes", "读取后台方案/模型失败。");
  const schemes = Array.isArray(payload) ? payload : Array.isArray(payload.schemes) ? payload.schemes : [];
  return hydrateSavedSchemeRuntimeIds(schemes.map(normalizeSavedSchemeIndexes));
}

export async function saveBackendSchemes(schemes: SavedSchemeRecord[]): Promise<void> {
  return saveBackendSchemesPayload(serializeSchemesForStorage(schemes));
}

export async function saveBackendSchemesPayload(normalizedSchemesPayload: string): Promise<void> {
  await fetchBackendJson<{ ok?: boolean }>(
    "/api/schemes",
    "保存方案/模型到后台失败。",
    backendJsonRequest("PUT", `{"schemes":${normalizedSchemesPayload}}`)
  );
}
