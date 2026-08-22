import { access, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export const GLOBAL_LINE_ID_PARAM = "_globalLineId";
const GLOBAL_LINE_MODEL_PAIR_PARAM = "_globalLineModelPair";

const SCHEMA_VERSION = 3;
const MANAGED_MODEL_TYPES = new Set(["厂站", "馈线", "台区"]);
const AC_LINE_KINDS = new Set(["ac-routable-line", "ac-zero-routable-branch"]);
const DC_LINE_KINDS = new Set(["dc-routable-line", "dc-zero-routable-branch"]);
const BOUNDARY_DERIVED_DEVICE_KINDS = new Set([
  "ac-station-source", "ac-feeder-source", "ac-district-source",
  "dc-station-source", "dc-feeder-source", "dc-district-source",
  "ac-station-load", "ac-feeder-load", "ac-district-load",
  "dc-station-load", "dc-feeder-load", "dc-district-load"
]);
const LOCAL_PARAM_KEYS = new Set(["idx", "i_node", "j_node", "t1_node", "t2_node"]);

export class GlobalLineRegistryError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "GlobalLineRegistryError";
    this.statusCode = statusCode;
  }
}

function baseKind(kind) {
  return String(kind ?? "").split("::", 1)[0].trim();
}

function energyTypeForKind(kind) {
  const normalized = baseKind(kind);
  if (AC_LINE_KINDS.has(normalized)) return "ac";
  if (DC_LINE_KINDS.has(normalized)) return "dc";
  return "";
}

function isBoundaryNode(node) {
  const kind = baseKind(node?.kind);
  return BOUNDARY_DERIVED_DEVICE_KINDS.has(kind);
}

function endpointNodeIds(node) {
  return [
    String(node?.params?._routableLineSourceNodeId ?? "").trim(),
    String(node?.params?._routableLineTargetNodeId ?? "").trim()
  ].filter(Boolean);
}

function lineTouchesBoundary(node, nodeById) {
  return Boolean(energyTypeForKind(node?.kind)) && endpointNodeIds(node).some((id) => isBoundaryNode(nodeById.get(id)));
}

function sharedParams(node) {
  return Object.fromEntries(Object.entries(node?.params ?? {}).filter(([key, value]) => (
    typeof value === "string" &&
    key !== GLOBAL_LINE_ID_PARAM &&
    !key.startsWith("_") &&
    !LOCAL_PARAM_KEYS.has(key)
  )));
}

function localParams(node) {
  return Object.fromEntries(Object.entries(node?.params ?? {}).filter(([key, value]) => (
    typeof value === "string" &&
    (key.startsWith("_") || LOCAL_PARAM_KEYS.has(key))
  )));
}

function normalizedStringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
}

function positiveInteger(value) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : 0;
}

export function globalLineModelKey(projectIdx, schemePath = [], projectName = "") {
  const idx = positiveInteger(projectIdx);
  if (idx > 0) return `model:${idx}`;
  return `path:${[...normalizedStringArray(schemePath), String(projectName ?? "").trim()].filter(Boolean).join("/")}`;
}

function boundaryEndpointForReference(reference) {
  if (reference?.boundaryEndpoint === "source" || reference?.boundaryEndpoint === "target") {
    return reference.boundaryEndpoint;
  }
  if (reference?.terminalSlot === "i") return "source";
  if (reference?.terminalSlot === "j") return "target";
  return "";
}

function terminalSlotForBoundaryEndpoint(boundaryEndpoint) {
  return boundaryEndpoint === "source" ? "i" : "j";
}

function boundaryEndpointLabel(boundaryEndpoint) {
  return boundaryEndpoint === "source" ? "首端" : "末端";
}

function boundaryAssociationChanged(current, next) {
  return current.boundaryEndpoint !== next.boundaryEndpoint ||
    String(current.boundaryNodeId ?? "") !== String(next.boundaryNodeId ?? "") ||
    String(current.boundaryTerminalId ?? "") !== String(next.boundaryTerminalId ?? "");
}

function normalizeReference(reference) {
  const projectIdx = positiveInteger(reference?.projectIdx);
  const schemePath = normalizedStringArray(reference?.schemePath);
  const projectName = String(reference?.projectName ?? "").trim();
  const nodeId = String(reference?.nodeId ?? "").trim();
  const modelKey = String(reference?.modelKey ?? "").trim() || globalLineModelKey(projectIdx, schemePath, projectName);
  if (!modelKey || !nodeId) {
    throw new GlobalLineRegistryError("全局线路引用缺少模型或线路节点标识。", 400);
  }
  const boundaryEndpoint = boundaryEndpointForReference(reference);
  if (!boundaryEndpoint) {
    throw new GlobalLineRegistryError("全局线路引用必须明确区分首端或末端。", 400);
  }
  return {
    modelKey,
    ...(projectIdx > 0 ? { projectIdx } : {}),
    schemePath,
    projectName,
    nodeId,
    terminalSlot: terminalSlotForBoundaryEndpoint(boundaryEndpoint),
    boundaryEndpoint,
    ...(String(reference?.boundaryNodeId ?? "").trim() ? { boundaryNodeId: String(reference.boundaryNodeId).trim() } : {}),
    ...(String(reference?.boundaryTerminalId ?? "").trim() ? { boundaryTerminalId: String(reference.boundaryTerminalId).trim() } : {})
  };
}

function referenceKey(reference) {
  return `${reference.modelKey}\u0000${reference.nodeId}`;
}

function normalizeRecord(record) {
  const energyType = record?.energyType === "dc" ? "dc" : "ac";
  const idx = positiveInteger(record?.idx);
  const references = [];
  const seenReferences = new Set();
  const occupiedEndpoints = new Set();
  for (const rawReference of Array.isArray(record?.references) ? record.references : []) {
    try {
      const reference = normalizeReference(rawReference);
      const key = referenceKey(reference);
      if (!seenReferences.has(key) && !occupiedEndpoints.has(reference.boundaryEndpoint)) {
        seenReferences.add(key);
        occupiedEndpoints.add(reference.boundaryEndpoint);
        references.push(reference);
      }
    } catch {
      // Damaged references are ignored; valid project scans rebuild them.
    }
  }
  const createdAt = String(record?.createdAt ?? "").trim() || new Date(0).toISOString();
  return {
    id: String(record?.id ?? "").trim() || `global-line-${randomUUID()}`,
    idx,
    name: String(record?.name ?? "").trim() || `${energyType === "ac" ? "交流" : "直流"}线路-${idx || 1}`,
    energyType,
    params: Object.fromEntries(Object.entries(record?.params ?? {}).filter(([, value]) => typeof value === "string")),
    references,
    createdAt,
    updatedAt: String(record?.updatedAt ?? "").trim() || createdAt
  };
}

function publicRecord(record) {
  const references = record.references.map((item) => ({ ...item, schemePath: [...item.schemePath] }));
  const source = references.find((item) => item.boundaryEndpoint === "source") ?? null;
  const target = references.find((item) => item.boundaryEndpoint === "target") ?? null;
  return {
    ...record,
    params: { ...record.params },
    references,
    endpointSlots: { source, target },
    terminalSlots: {
      i: source,
      j: target
    },
    degree: references.length
  };
}

function normalizeState(raw) {
  const records = [];
  const ids = new Set();
  const indexes = new Set();
  let maxIndex = 0;
  for (const rawRecord of Array.isArray(raw?.records) ? raw.records : []) {
    const record = normalizeRecord(rawRecord);
    if (ids.has(record.id)) continue;
    ids.add(record.id);
    let idx = record.idx;
    if (idx <= 0 || indexes.has(idx)) {
      idx = maxIndex + 1;
    }
    indexes.add(idx);
    maxIndex = Math.max(maxIndex, idx);
    records.push({ ...record, idx });
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    lastIndex: Math.max(maxIndex, positiveInteger(raw?.lastIndex)),
    records
  };
}

async function readState(filePath) {
  try {
    return normalizeState(JSON.parse(await readFile(filePath, "utf-8")));
  } catch {
    return normalizeState({});
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeState(filePath, state) {
  await mkdir(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const content = `${JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }, null, 2)}\n`;
  await writeFile(tmpPath, content, "utf-8");
  await rename(tmpPath, filePath);
}

async function listProjectJsonFiles(rootDir) {
  const files = [];
  async function visit(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && /\.json$/iu.test(entry.name) && entry.name.toLocaleLowerCase() !== "scheme.json") {
        files.push(path);
      }
    }
  }
  await visit(rootDir);
  return files;
}

function schemePathForProjectFile(filesRoot, filePath) {
  const relativeDir = relative(filesRoot, dirname(filePath));
  return relativeDir && relativeDir !== "." ? relativeDir.split(/[\\/]+/u).filter(Boolean) : [];
}

function nextRecord(state, energyType, node) {
  const idx = state.lastIndex + 1;
  state.lastIndex = idx;
  const now = new Date().toISOString();
  const requestedName = String(node?.name ?? "").trim();
  const fallbackName = `${energyType === "ac" ? "交流" : "直流"}线路-${idx}`;
  const record = {
    id: `global-line-${randomUUID()}`,
    idx,
    name: requestedName || fallbackName,
    energyType,
    params: sharedParams(node),
    references: [],
    createdAt: now,
    updatedAt: now
  };
  state.records.push(record);
  return record;
}

function recordForNode(state, node) {
  const storedId = String(node?.params?.[GLOBAL_LINE_ID_PARAM] ?? "").trim();
  if (storedId) {
    const byId = state.records.find((record) => record.id === storedId);
    if (byId) return byId;
    // A draft uses a provisional idx for display only. It must never attach to an
    // unrelated record that was concurrently assigned the same authoritative idx.
    if (storedId.startsWith("draft-global-line:")) return undefined;
  }
  const storedIndex = positiveInteger(node?.params?.idx);
  return storedIndex > 0
    ? state.records.find((record) => record.idx === storedIndex)
    : undefined;
}

function assertUniqueName(state, name, excludedId = "") {
  const key = String(name ?? "").trim().toLocaleLowerCase();
  if (!key) throw new GlobalLineRegistryError("全局线路名称不能为空。", 400);
  if (state.records.some((record) => record.id !== excludedId && record.name.trim().toLocaleLowerCase() === key)) {
    throw new GlobalLineRegistryError(`全局线路名称“${name}”已经存在。`, 409);
  }
}

function addReference(record, reference) {
  const key = referenceKey(reference);
  const existingIndex = record.references.findIndex((item) => referenceKey(item) === key);
  const endpointOccupant = record.references.find((item, index) => (
    index !== existingIndex && item.boundaryEndpoint === reference.boundaryEndpoint
  ));
  if (endpointOccupant) {
    throw new GlobalLineRegistryError(
      `全局线路“${record.name}”的${boundaryEndpointLabel(reference.boundaryEndpoint)}已经关联模型“${endpointOccupant.projectName || endpointOccupant.modelKey}”，不能再连接另一个${boundaryEndpointLabel(reference.boundaryEndpoint)}。`,
      409
    );
  }
  if (existingIndex >= 0) {
    const existingExact = record.references[existingIndex];
    if (JSON.stringify(existingExact) === JSON.stringify(reference)) return false;
    if (record.references.length >= 2 && boundaryAssociationChanged(existingExact, reference)) {
      throw new GlobalLineRegistryError(
        `全局线路“${record.name}”的首末端都已关联，不能调整当前边界端；请先删除另一端关联，再调整本端。`,
        409
      );
    }
    record.references[existingIndex] = { ...reference };
    record.updatedAt = new Date().toISOString();
    return true;
  }
  if (record.references.some((item) => item.modelKey === reference.modelKey)) {
    throw new GlobalLineRegistryError(`全局线路“${record.name}”已经在当前模型中使用。`, 409);
  }
  if (record.references.length >= 2) {
    throw new GlobalLineRegistryError(`全局线路“${record.name}”的出线度已经达到2，不能再次选择。`, 409);
  }
  record.references.push({ ...reference });
  record.updatedAt = new Date().toISOString();
  return true;
}

function applyRecordToNode(node, record) {
  const params = {
    ...record.params,
    ...localParams(node),
    idx: String(record.idx),
    [GLOBAL_LINE_ID_PARAM]: record.id
  };
  return {
    ...node,
    name: record.name,
    params
  };
}

function globalLineNodeForStorage(node, record) {
  const { name: _runtimeGlobalLineName, ...nodeWithoutRuntimeName } = node ?? {};
  const params = localParams(node);
  delete params[GLOBAL_LINE_ID_PARAM];
  return {
    ...nodeWithoutRuntimeName,
    params: {
      ...params,
      idx: String(record.idx)
    }
  };
}

function projectWithStoredGlobalLineReferences(project, state) {
  if (!project || !Array.isArray(project.nodes) || !MANAGED_MODEL_TYPES.has(String(project.modelType ?? ""))) {
    return project;
  }
  const nodeById = new Map(project.nodes.map((node) => [String(node?.id ?? ""), node]));
  return {
    ...project,
    nodes: project.nodes.map((node) => {
      const record = recordForNode(state, node);
      if (
        !record ||
        energyTypeForKind(node?.kind) !== record.energyType ||
        !lineTouchesBoundary(node, nodeById)
      ) {
        return node;
      }
      return globalLineNodeForStorage(node, record);
    })
  };
}

function projectWithHydratedGlobalLines(project, state) {
  if (!project || !Array.isArray(project.nodes) || !MANAGED_MODEL_TYPES.has(String(project.modelType ?? ""))) {
    return project;
  }
  const nodeById = new Map(project.nodes.map((node) => [String(node?.id ?? ""), node]));
  return {
    ...project,
    nodes: project.nodes.map((node) => {
      const record = recordForNode(state, node);
      if (
        !record ||
        energyTypeForKind(node?.kind) !== record.energyType ||
        !lineTouchesBoundary(node, nodeById)
      ) {
        return node;
      }
      return applyRecordToNode(node, record);
    })
  };
}

function removeGlobalId(node) {
  if (!node?.params || (
    !Object.prototype.hasOwnProperty.call(node.params, GLOBAL_LINE_ID_PARAM) &&
    !Object.prototype.hasOwnProperty.call(node.params, GLOBAL_LINE_MODEL_PAIR_PARAM)
  )) return node;
  const params = { ...node.params };
  delete params[GLOBAL_LINE_ID_PARAM];
  delete params[GLOBAL_LINE_MODEL_PAIR_PARAM];
  return { ...node, params };
}

function boundaryReferenceMetadata(node, nodeById) {
  const sourceNodeId = String(node?.params?._routableLineSourceNodeId ?? "").trim();
  const targetNodeId = String(node?.params?._routableLineTargetNodeId ?? "").trim();
  const boundaryEndpoint = sourceNodeId && isBoundaryNode(nodeById.get(sourceNodeId))
    ? "source"
    : targetNodeId && isBoundaryNode(nodeById.get(targetNodeId))
      ? "target"
      : "";
  if (!boundaryEndpoint) return {};
  return {
    boundaryEndpoint,
    boundaryNodeId: boundaryEndpoint === "source" ? sourceNodeId : targetNodeId,
    boundaryTerminalId: String(node?.params?.[boundaryEndpoint === "source" ? "_routableLineSourceTerminalId" : "_routableLineTargetTerminalId"] ?? "").trim()
  };
}

function projectReference(project, meta, nodeId, node, nodeById) {
  const projectIdx = positiveInteger(meta?.projectIdx ?? project?.idx);
  const schemePath = normalizedStringArray(meta?.schemePath);
  const projectName = String(meta?.projectName ?? project?.name ?? "").trim();
  return normalizeReference({ projectIdx, schemePath, projectName, nodeId, ...boundaryReferenceMetadata(node, nodeById) });
}

function oppositeBoundaryEndpoint(endpoint) {
  return endpoint === "source" ? "target" : "source";
}

function modelAssociationProjectIdx(node) {
  if (!BOUNDARY_DERIVED_DEVICE_KINDS.has(baseKind(node?.kind))) return 0;
  return positiveInteger(node?.params?.model_id);
}

function projectReferences(project, meta, nodeId, node, nodeById) {
  const localBoundaryReference = projectReference(project, meta, nodeId, node, nodeById);
  const pairMode = String(node?.params?.[GLOBAL_LINE_MODEL_PAIR_PARAM] ?? "").trim();
  if (pairMode === "source" || pairMode === "target") {
    return [];
  }
  if (pairMode !== "1") {
    return [localBoundaryReference];
  }
  const boundaryNode = nodeById.get(String(localBoundaryReference.boundaryNodeId ?? ""));
  const associatedProjectIdx = modelAssociationProjectIdx(boundaryNode);
  if (!associatedProjectIdx) return [localBoundaryReference];

  const localProjectIdx = positiveInteger(meta?.projectIdx ?? project?.idx);
  const localSchemePath = normalizedStringArray(meta?.schemePath);
  const localProjectName = String(meta?.projectName ?? project?.name ?? "").trim();
  const localReference = normalizeReference({
    projectIdx: localProjectIdx,
    schemePath: localSchemePath,
    projectName: localProjectName,
    nodeId,
    boundaryEndpoint: oppositeBoundaryEndpoint(localBoundaryReference.boundaryEndpoint)
  });
  const associatedReference = normalizeReference({
    projectIdx: associatedProjectIdx,
    schemePath: [],
    projectName: "",
    nodeId,
    boundaryEndpoint: localBoundaryReference.boundaryEndpoint,
    boundaryNodeId: localBoundaryReference.boundaryNodeId,
    boundaryTerminalId: localBoundaryReference.boundaryTerminalId
  });
  return localBoundaryReference.boundaryEndpoint === "source"
    ? [associatedReference, localReference]
    : [localReference, associatedReference];
}

function referenceMatchesModel(reference, expectedProjectIdx, expectedModelKey) {
  if (!reference) return false;
  const referenceProjectIdx = positiveInteger(reference.projectIdx);
  return expectedProjectIdx
    ? (referenceProjectIdx ? referenceProjectIdx === expectedProjectIdx : reference.modelKey === globalLineModelKey(expectedProjectIdx, [], ""))
    : reference.modelKey === expectedModelKey;
}

function referenceModelLabel(reference) {
  if (!reference) return "未定义模型";
  const projectIdx = positiveInteger(reference.projectIdx);
  const identity = projectIdx ? `model_id=${projectIdx}` : reference.modelKey;
  return reference.projectName ? `${reference.projectName}（${identity}）` : identity;
}

function existingAssociationReuseConflictMessage(record, node, nodeById, project, meta) {
  const pairMode = String(node?.params?.[GLOBAL_LINE_MODEL_PAIR_PARAM] ?? "").trim();
  if (pairMode !== "source" && pairMode !== "target") return "";
  const boundary = boundaryReferenceMetadata(node, nodeById);
  const boundaryNode = nodeById.get(String(boundary.boundaryNodeId ?? ""));
  const associatedProjectIdx = modelAssociationProjectIdx(boundaryNode);
  const localProjectIdx = positiveInteger(meta?.projectIdx ?? project?.idx);
  const localModelKey = globalLineModelKey(
    localProjectIdx,
    normalizedStringArray(meta?.schemePath),
    String(meta?.projectName ?? project?.name ?? "").trim()
  );
  const retry = "请重新选择已有全局线路，或新建全局线路，或取消本次全局线路绘制。";
  if (!record || !associatedProjectIdx || !localModelKey) {
    return `选择的既有全局线路或模型关联信息已失效。${retry}`;
  }
  const energyType = energyTypeForKind(node?.kind);
  if (record.energyType !== energyType) {
    return `全局线路“${record.name}”的能源类型与当前线路不一致。${retry}`;
  }
  if (boundary.boundaryEndpoint !== pairMode) {
    return `当前模型关联设备要求位于${boundaryEndpointLabel(boundary.boundaryEndpoint)}，但页面提交的复用端点为${boundaryEndpointLabel(pairMode)}，首末端方向不一致。${retry}`;
  }
  if (record.references.length <= 1) return "";
  const associationReference = record.references.find((reference) => reference.boundaryEndpoint === pairMode);
  const oppositeEndpoint = oppositeBoundaryEndpoint(pairMode);
  const localReference = record.references.find((reference) => reference.boundaryEndpoint === oppositeEndpoint);
  const associationMatches = referenceMatchesModel(
    associationReference,
    associatedProjectIdx,
    globalLineModelKey(associatedProjectIdx, [], "")
  );
  const localMatches = referenceMatchesModel(localReference, localProjectIdx, localModelKey);
  if (associationMatches && localMatches) return "";
  if (
    referenceMatchesModel(localReference, associatedProjectIdx, globalLineModelKey(associatedProjectIdx, [], "")) ||
    referenceMatchesModel(associationReference, localProjectIdx, localModelKey)
  ) {
    return `全局线路“${record.name}”中 model_id=${associatedProjectIdx} 位于${boundaryEndpointLabel(oppositeEndpoint)}，当前模型关联设备要求位于${boundaryEndpointLabel(pairMode)}，首末端方向不一致。${retry}`;
  }
  if (!associationMatches) {
    return `全局线路“${record.name}”的${boundaryEndpointLabel(pairMode)}已关联“${referenceModelLabel(associationReference)}”，与当前模型关联设备 model_id=${associatedProjectIdx} 不一致。${retry}`;
  }
  const localIdentity = localProjectIdx ? `model_id=${localProjectIdx}` : localModelKey;
  return `全局线路“${record.name}”的${boundaryEndpointLabel(oppositeEndpoint)}已关联“${referenceModelLabel(localReference)}”，与本地模型“${localIdentity}”不一致。${retry}`;
}

function addReferences(record, references) {
  const draft = {
    ...record,
    references: record.references.map((reference) => ({ ...reference, schemePath: [...reference.schemePath] }))
  };
  let changed = false;
  for (const reference of references) changed = addReference(draft, reference) || changed;
  if (!changed) return false;
  record.references = draft.references;
  record.updatedAt = draft.updatedAt;
  return true;
}

function referenceOwner(record, reference) {
  if (reference.boundaryNodeId) {
    const physicalModelReference = record.references.find((candidate) => (
      candidate !== reference &&
      candidate.nodeId === reference.nodeId &&
      !candidate.boundaryNodeId
    ));
    if (physicalModelReference) return physicalModelReference;
  }
  return reference;
}

async function writeProjectIfChanged(filePath, originalText, project) {
  const nextText = `${JSON.stringify(project, null, 2)}\n`;
  if (originalText.trim() !== nextText.trim()) {
    await writeFile(filePath, nextText, "utf-8");
    return true;
  }
  return false;
}

async function readStoredManagedProjects(filesRoot) {
  const projects = [];
  for (const filePath of await listProjectJsonFiles(filesRoot)) {
    try {
      const project = JSON.parse(await readFile(filePath, "utf-8"));
      if (!project || !Array.isArray(project.nodes) || !MANAGED_MODEL_TYPES.has(String(project.modelType ?? ""))) {
        continue;
      }
      const schemePath = schemePathForProjectFile(filesRoot, filePath);
      projects.push({
        filePath,
        project,
        projectIdx: positiveInteger(project.idx),
        schemePath,
        modelKey: globalLineModelKey(project.idx, schemePath, project.name)
      });
    } catch {
      // Ignore unreadable project files, matching the registry migration behavior.
    }
  }
  return projects;
}

function storedProjectMatchesCurrentModel(storedProject, projectIdx, modelKey) {
  return projectIdx > 0
    ? storedProject.projectIdx === projectIdx
    : storedProject.modelKey === modelKey;
}

function storedProjectMatchesReference(storedProject, reference) {
  const referenceProjectIdx = positiveInteger(reference?.projectIdx);
  if (referenceProjectIdx > 0) return storedProject.projectIdx === referenceProjectIdx;
  if (String(reference?.modelKey ?? "") === storedProject.modelKey) return true;
  return String(reference?.projectName ?? "").trim() === String(storedProject.project.name ?? "").trim() &&
    JSON.stringify(normalizedStringArray(reference?.schemePath)) === JSON.stringify(storedProject.schemePath);
}

function globalLineIdsInProject(project, state) {
  return new Set((Array.isArray(project?.nodes) ? project.nodes : []).flatMap((node) => {
    const record = recordForNode(state, node);
    return record && energyTypeForKind(node?.kind) === record.energyType ? [record.id] : [];
  }));
}

function otherStoredEndpointRetainsGlobalLine(record, storedProjects, projectIdx, modelKey) {
  for (const reference of record.references) {
    const belongsToCurrentModel = projectIdx > 0
      ? positiveInteger(reference?.projectIdx) === projectIdx
      : String(reference?.modelKey ?? "") === modelKey;
    if (belongsToCurrentModel) continue;
    const otherProject = storedProjects.find((candidate) => (
      !storedProjectMatchesCurrentModel(candidate, projectIdx, modelKey) &&
      storedProjectMatchesReference(candidate, reference)
    ));
    if (!otherProject) continue;
    const matchingLine = otherProject.project.nodes.some((node) => (
      recordForNode({ records: [record] }, node)?.id === record.id &&
      energyTypeForKind(node?.kind) === record.energyType
    ));
    if (matchingLine) return true;
  }
  return false;
}

export function createGlobalLineRegistry({ dataRoot, schemeFilesRoot } = {}) {
  const resolvedDataRoot = resolve(dataRoot ?? "data");
  const filesRoot = resolve(schemeFilesRoot ?? join(resolvedDataRoot, "schemes", "files"));
  const registryPath = join(resolvedDataRoot, "schemes", "global-lines.json");
  const legacyRegistryPath = join(resolvedDataRoot, "settings", "global-lines.json");
  let queue = Promise.resolve();
  let initialized = false;

  const locked = (task) => {
    const run = queue.then(task, task);
    queue = run.then(() => undefined, () => undefined);
    return run;
  };

  async function migrateStoredProjects(state) {
    const files = await listProjectJsonFiles(filesRoot);
    const reuseOnlyRecordIds = new Set();
    for (const filePath of files) {
      try {
        const project = JSON.parse(await readFile(filePath, "utf-8"));
        for (const node of Array.isArray(project?.nodes) ? project.nodes : []) {
          const pairMode = String(node?.params?.[GLOBAL_LINE_MODEL_PAIR_PARAM] ?? "").trim();
          const record = recordForNode(state, node);
          if (record && (pairMode === "source" || pairMode === "target")) reuseOnlyRecordIds.add(record.id);
        }
      } catch {
        // The normal migration pass below ignores unreadable project files too.
      }
    }
    const recordById = new Map(state.records.map((record) => [record.id, record]));
    const recordByReferenceKey = new Map();
    for (const record of state.records) {
      for (const reference of record.references) recordByReferenceKey.set(referenceKey(reference), record);
      if (!reuseOnlyRecordIds.has(record.id)) record.references = [];
    }
    for (const filePath of files) {
      let originalText;
      let project;
      try {
        originalText = await readFile(filePath, "utf-8");
        project = JSON.parse(originalText);
      } catch {
        continue;
      }
      if (!project || !Array.isArray(project.nodes) || !MANAGED_MODEL_TYPES.has(String(project.modelType ?? ""))) continue;
      const schemePath = schemePathForProjectFile(filesRoot, filePath);
      const nodeById = new Map(project.nodes.map((node) => [String(node?.id ?? ""), node]));
      let changed = false;
      const nodes = project.nodes.map((node) => {
        const energyType = energyTypeForKind(node?.kind);
        if (!energyType || !lineTouchesBoundary(node, nodeById)) {
          const localNode = removeGlobalId(node);
          changed ||= localNode !== node;
          return localNode;
        }
        const references = projectReferences(project, { schemePath }, String(node.id ?? ""), node, nodeById);
        const storedRecord = recordForNode(state, node);
        let record = (storedRecord && recordById.get(storedRecord.id)) || references
          .map((reference) => recordByReferenceKey.get(referenceKey(reference)))
          .find(Boolean);
        if (!record || record.energyType !== energyType) {
          record = nextRecord(state, energyType, node);
          recordById.set(record.id, record);
        }
        if (references.some((reference) => !record.references.some((item) => referenceKey(item) === referenceKey(reference)))) {
          try {
            addReferences(record, references);
          } catch (error) {
            if (!(error instanceof GlobalLineRegistryError) || error.statusCode !== 409) throw error;
            const baseName = String(node?.name ?? "").trim() || `${energyType === "ac" ? "交流" : "直流"}线路`;
            let suffix = state.lastIndex + 1;
            let splitName = `${baseName}-${boundaryEndpointLabel(references[0]?.boundaryEndpoint)}-${suffix}`;
            const usedNames = new Set(state.records.map((item) => item.name.trim().toLocaleLowerCase()));
            while (usedNames.has(splitName.toLocaleLowerCase())) {
              suffix += 1;
              splitName = `${baseName}-${boundaryEndpointLabel(references[0]?.boundaryEndpoint)}-${suffix}`;
            }
            record = nextRecord(state, energyType, { ...node, name: splitName });
            recordById.set(record.id, record);
            addReferences(record, references);
          }
        }
        for (const reference of references) recordByReferenceKey.set(referenceKey(reference), record);
        const nextNode = globalLineNodeForStorage(node, record);
        changed ||= JSON.stringify(nextNode) !== JSON.stringify(node);
        return nextNode;
      });
      if (changed) await writeProjectIfChanged(filePath, originalText, { ...project, nodes });
    }
    state.lastIndex = Math.max(state.lastIndex, ...state.records.map((record) => record.idx), 0);
  }

  async function ensureInitialized() {
    const migrateLegacyRegistry = !initialized &&
      !(await fileExists(registryPath)) &&
      await fileExists(legacyRegistryPath);
    const state = await readState(migrateLegacyRegistry ? legacyRegistryPath : registryPath);
    if (!initialized) {
      await migrateStoredProjects(state);
      await writeState(registryPath, state);
      if (migrateLegacyRegistry) {
        await rm(legacyRegistryPath, { force: true });
      }
      initialized = true;
    }
    return state;
  }

  return {
    registryPath,
    async list() {
      return locked(async () => (await ensureInitialized()).records.map(publicRecord).sort((a, b) => a.idx - b.idx));
    },

    async hydrateProject(payload) {
      return locked(async () => {
        const state = await ensureInitialized();
        const project = payload?.project ?? payload;
        const hydratedProject = projectWithHydratedGlobalLines(project, state);
        return {
          project: hydratedProject,
          nodes: Array.isArray(hydratedProject?.nodes) ? hydratedProject.nodes : [],
          records: state.records.map(publicRecord).sort((a, b) => a.idx - b.idx)
        };
      });
    },

    async attach(payload) {
      return locked(async () => {
        const state = await ensureInitialized();
        const energyType = payload?.energyType === "dc" ? "dc" : payload?.energyType === "ac" ? "ac" : energyTypeForKind(payload?.node?.kind);
        if (!energyType) throw new GlobalLineRegistryError("仅支持交流或直流线路进入全局线路表。", 400);
        const references = Array.isArray(payload?.references) && payload.references.length > 0
          ? payload.references.map(normalizeReference)
          : [normalizeReference(payload?.reference)];
        const requestedId = String(payload?.globalLineId ?? "").trim();
        let record = requestedId ? state.records.find((item) => item.id === requestedId) : undefined;
        if (requestedId && !record) throw new GlobalLineRegistryError("选择的全局线路不存在。", 404);
        if (record && record.energyType !== energyType) throw new GlobalLineRegistryError("选择的全局线路能源类型不一致。", 409);
        if (!record) {
          record = nextRecord(state, energyType, payload?.node ?? { name: payload?.name, params: payload?.params });
          const requestedName = String(payload?.name ?? payload?.node?.name ?? "").trim();
          if (requestedName) record.name = requestedName;
          assertUniqueName(state, record.name, record.id);
        }
        addReferences(record, references);
        await writeState(registryPath, state);
        return publicRecord(record);
      });
    },

    async detach(payload) {
      return locked(async () => {
        const state = await ensureInitialized();
        const id = String(payload?.globalLineId ?? "").trim();
        const record = state.records.find((item) => item.id === id);
        if (!record) throw new GlobalLineRegistryError("全局线路不存在。", 404);
        const reference = normalizeReference(payload?.reference);
        record.references = record.references.filter((item) => referenceKey(item) !== referenceKey(reference));
        record.updatedAt = new Date().toISOString();
        await writeState(registryPath, state);
        return publicRecord(record);
      });
    },

    async update(payload) {
      return locked(async () => {
        const state = await ensureInitialized();
        const id = String(payload?.id ?? payload?.globalLineId ?? "").trim();
        const record = state.records.find((item) => item.id === id);
        if (!record) throw new GlobalLineRegistryError("全局线路不存在。", 404);
        const nextName = String(payload?.name ?? record.name).trim();
        assertUniqueName(state, nextName, record.id);
        record.name = nextName;
        if (payload?.params && typeof payload.params === "object") {
          record.params = Object.fromEntries(Object.entries(payload.params).filter(([, value]) => typeof value === "string"));
        }
        record.updatedAt = new Date().toISOString();
        await writeState(registryPath, state);
        return publicRecord(record);
      });
    },

    async deleteEmpty(payload) {
      return locked(async () => {
        const state = await ensureInitialized();
        const id = String(payload?.id ?? payload?.globalLineId ?? "").trim();
        const recordIndex = state.records.findIndex((item) => item.id === id);
        if (recordIndex < 0) throw new GlobalLineRegistryError("全局线路不存在。", 404);
        const record = state.records[recordIndex];
        if (record.references.length > 0) {
          throw new GlobalLineRegistryError(`全局线路“${record.name}”仍有关联端点，只能删除首末端均为空的记录。`, 409);
        }
        state.records.splice(recordIndex, 1);
        await writeState(registryPath, state);
        return publicRecord(record);
      });
    },

    async syncProject(payload) {
      return locked(async () => {
        const state = await ensureInitialized();
        const rawProject = payload?.project ?? { nodes: payload?.nodes, idx: payload?.projectIdx, name: payload?.projectName, modelType: payload?.modelType };
        const project = { ...rawProject, nodes: Array.isArray(rawProject?.nodes) ? rawProject.nodes : [] };
        const projectIdx = positiveInteger(payload?.projectIdx ?? project.idx);
        const schemePath = normalizedStringArray(payload?.schemePath);
        const projectName = String(payload?.projectName ?? project.name ?? "").trim();
        const modelKey = globalLineModelKey(projectIdx, schemePath, projectName);
        const storedProjects = await readStoredManagedProjects(filesRoot);
        const storedCurrentProject = storedProjects.find((candidate) => (
          storedProjectMatchesCurrentModel(candidate, projectIdx, modelKey)
        ));
        const previouslySavedGlobalLineIds = storedCurrentProject
          ? globalLineIdsInProject(storedCurrentProject.project, state)
          : new Set();
        const nodeById = new Map(project.nodes.map((node) => [String(node?.id ?? ""), node]));
        const activeReferenceKeys = new Set();
        const reuseOnlyRecordIds = new Set();
        const usedGlobalLineRecordIds = new Set();
        const assignments = {};
        const managedModel = MANAGED_MODEL_TYPES.has(String(project.modelType ?? payload?.modelType ?? ""));
        const nodes = project.nodes.map((node) => {
          const energyType = energyTypeForKind(node?.kind);
          if (!managedModel || !energyType || !lineTouchesBoundary(node, nodeById)) {
            return removeGlobalId(node);
          }
          const references = projectReferences(project, { projectIdx, schemePath, projectName }, String(node.id ?? ""), node, nodeById);
          let record = recordForNode(state, node);
          if (!record) {
            record = state.records.find((item) => references.some((reference) => (
              item.references.some((itemReference) => referenceKey(itemReference) === referenceKey(reference))
            )));
          }
          const reuseConflict = existingAssociationReuseConflictMessage(
            record,
            node,
            nodeById,
            project,
            { projectIdx, schemePath, projectName }
          );
          if (reuseConflict) throw new GlobalLineRegistryError(reuseConflict, 409);
          const pairMode = String(node?.params?.[GLOBAL_LINE_MODEL_PAIR_PARAM] ?? "").trim();
          if (pairMode === "source" || pairMode === "target") {
            if (usedGlobalLineRecordIds.has(record.id)) {
              throw new GlobalLineRegistryError(`同一模型内，同一条全局线路只能存在一条：“${record.name}”。`, 409);
            }
            usedGlobalLineRecordIds.add(record.id);
            if (record.references.length <= 1) {
              const repairNode = {
                ...node,
                params: { ...node.params, [GLOBAL_LINE_MODEL_PAIR_PARAM]: "1" }
              };
              const repairReferences = projectReferences(
                project,
                { projectIdx, schemePath, projectName },
                String(node.id ?? ""),
                repairNode,
                nodeById
              );
              if (repairReferences.length !== 2) {
                throw new GlobalLineRegistryError("当前模型关联信息不完整，无法修复既有全局线路的首末端。", 409);
              }
              record.references = repairReferences.map((reference) => ({
                ...reference,
                schemePath: [...reference.schemePath]
              }));
              record.updatedAt = new Date().toISOString();
              for (const reference of record.references) activeReferenceKeys.add(referenceKey(reference));
            } else {
              reuseOnlyRecordIds.add(record.id);
            }
            let sharedFieldsChanged = false;
            const requestedName = String(node?.name ?? "").trim();
            if (requestedName && requestedName !== record.name) {
              assertUniqueName(state, requestedName, record.id);
              record.name = requestedName;
              sharedFieldsChanged = true;
            }
            const nextParams = sharedParams(node);
            if (JSON.stringify(nextParams) !== JSON.stringify(record.params)) {
              record.params = nextParams;
              sharedFieldsChanged = true;
            }
            if (sharedFieldsChanged) record.updatedAt = new Date().toISOString();
            assignments[node.id] = record.id;
            return applyRecordToNode(node, record);
          }
          if (!record || record.energyType !== energyType) {
            record = nextRecord(state, energyType, node);
          }
          if (usedGlobalLineRecordIds.has(record.id)) {
            throw new GlobalLineRegistryError(`同一模型内，同一条全局线路只能存在一条：“${record.name}”。`, 409);
          }
          usedGlobalLineRecordIds.add(record.id);
          addReferences(record, references);
          const requestedName = String(node?.name ?? "").trim();
          if (requestedName && requestedName !== record.name) {
            assertUniqueName(state, requestedName, record.id);
            record.name = requestedName;
          }
          const nextParams = sharedParams(node);
          if (JSON.stringify(nextParams) !== JSON.stringify(record.params)) record.params = nextParams;
          record.updatedAt = new Date().toISOString();
          for (const reference of references) activeReferenceKeys.add(referenceKey(reference));
          assignments[node.id] = record.id;
          return applyRecordToNode(node, record);
        });
        const activeGlobalLineIds = globalLineIdsInProject({ nodes }, state);
        const removedGlobalLineIds = new Set(
          [...previouslySavedGlobalLineIds].filter((globalLineId) => !activeGlobalLineIds.has(globalLineId))
        );
        const deletedRecordIds = new Set();
        for (const record of state.records) {
          if (removedGlobalLineIds.has(record.id)) {
            if (!otherStoredEndpointRetainsGlobalLine(record, storedProjects, projectIdx, modelKey)) {
              deletedRecordIds.add(record.id);
            }
            continue;
          }
          if (reuseOnlyRecordIds.has(record.id)) continue;
          const before = record.references.length;
          record.references = record.references.filter((reference) => (
            referenceOwner(record, reference).modelKey !== modelKey || activeReferenceKeys.has(referenceKey(reference))
          ));
          if (record.references.length !== before) {
            record.updatedAt = new Date().toISOString();
          }
        }
        if (deletedRecordIds.size > 0) {
          state.records = state.records.filter((record) => !deletedRecordIds.has(record.id));
        }
        await writeState(registryPath, state);
        const runtimeProject = { ...project, nodes };
        const storageProject = projectWithStoredGlobalLineReferences(runtimeProject, state);
        return {
          project: runtimeProject,
          storageProject,
          nodes,
          assignments,
          records: state.records.map(publicRecord).sort((a, b) => a.idx - b.idx)
        };
      });
    },

    async detachProject(payload) {
      return locked(async () => {
        const state = await ensureInitialized();
        const modelKey = globalLineModelKey(payload?.projectIdx, payload?.schemePath, payload?.projectName);
        for (const record of state.records) {
          record.references = record.references.filter((reference) => {
            const owner = referenceOwner(record, reference);
            return owner.modelKey !== modelKey &&
              !(owner.projectName === String(payload?.projectName ?? "").trim() && JSON.stringify(owner.schemePath) === JSON.stringify(normalizedStringArray(payload?.schemePath)));
          });
        }
        await writeState(registryPath, state);
      });
    },

    async rebuildFromStorage() {
      return locked(async () => {
        const state = await readState(registryPath);
        await migrateStoredProjects(state);
        await writeState(registryPath, state);
        initialized = true;
        return state.records.map(publicRecord).sort((a, b) => a.idx - b.idx);
      });
    }
  };
}
