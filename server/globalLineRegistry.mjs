import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export const GLOBAL_LINE_ID_PARAM = "_globalLineId";

const SCHEMA_VERSION = 2;
const MANAGED_MODEL_TYPES = new Set(["厂站", "馈线", "台区"]);
const AC_LINE_KINDS = new Set(["ac-routable-line", "ac-zero-routable-branch"]);
const DC_LINE_KINDS = new Set(["dc-routable-line", "dc-zero-routable-branch"]);
const BOUNDARY_BUTTON_KINDS = new Set([
  "static-model-interaction-station",
  "static-model-interaction-feeder",
  "static-model-interaction-district"
]);
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
  if (BOUNDARY_BUTTON_KINDS.has(kind) || BOUNDARY_DERIVED_DEVICE_KINDS.has(kind)) {
    return true;
  }
  const interactionType = String(node?.params?.modelInteractionType ?? "").trim();
  return String(node?.params?.component_type ?? "").trim() === "ModelInteraction" && MANAGED_MODEL_TYPES.has(interactionType);
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
  return {
    ...node,
    name: record.name,
    params: {
      ...(node?.params ?? {}),
      ...record.params,
      idx: String(record.idx),
      [GLOBAL_LINE_ID_PARAM]: record.id
    }
  };
}

function removeGlobalId(node) {
  if (!node?.params || !Object.prototype.hasOwnProperty.call(node.params, GLOBAL_LINE_ID_PARAM)) return node;
  const params = { ...node.params };
  delete params[GLOBAL_LINE_ID_PARAM];
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

async function writeProjectIfChanged(filePath, originalText, project) {
  const nextText = `${JSON.stringify(project, null, 2)}\n`;
  if (originalText.trim() !== nextText.trim()) {
    await writeFile(filePath, nextText, "utf-8");
    return true;
  }
  return false;
}

export function createGlobalLineRegistry({ dataRoot, schemeFilesRoot } = {}) {
  const resolvedDataRoot = resolve(dataRoot ?? "data");
  const filesRoot = resolve(schemeFilesRoot ?? join(resolvedDataRoot, "schemes", "files"));
  const registryPath = join(resolvedDataRoot, "settings", "global-lines.json");
  let queue = Promise.resolve();
  let initialized = false;

  const locked = (task) => {
    const run = queue.then(task, task);
    queue = run.then(() => undefined, () => undefined);
    return run;
  };

  async function migrateStoredProjects(state) {
    const recordById = new Map(state.records.map((record) => [record.id, record]));
    const recordByReferenceKey = new Map();
    for (const record of state.records) {
      for (const reference of record.references) recordByReferenceKey.set(referenceKey(reference), record);
      record.references = [];
    }
    const files = await listProjectJsonFiles(filesRoot);
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
        const reference = projectReference(project, { schemePath }, String(node.id ?? ""), node, nodeById);
        const storedId = String(node?.params?.[GLOBAL_LINE_ID_PARAM] ?? "").trim();
        let record = (storedId && recordById.get(storedId)) || recordByReferenceKey.get(referenceKey(reference));
        if (!record || record.energyType !== energyType) {
          record = nextRecord(state, energyType, node);
          recordById.set(record.id, record);
        }
        if (!record.references.some((item) => referenceKey(item) === referenceKey(reference))) {
          try {
            addReference(record, reference);
          } catch (error) {
            if (!(error instanceof GlobalLineRegistryError) || error.statusCode !== 409) throw error;
            const baseName = String(node?.name ?? "").trim() || `${energyType === "ac" ? "交流" : "直流"}线路`;
            let suffix = state.lastIndex + 1;
            let splitName = `${baseName}-${boundaryEndpointLabel(reference.boundaryEndpoint)}-${suffix}`;
            const usedNames = new Set(state.records.map((item) => item.name.trim().toLocaleLowerCase()));
            while (usedNames.has(splitName.toLocaleLowerCase())) {
              suffix += 1;
              splitName = `${baseName}-${boundaryEndpointLabel(reference.boundaryEndpoint)}-${suffix}`;
            }
            record = nextRecord(state, energyType, { ...node, name: splitName });
            recordById.set(record.id, record);
            addReference(record, reference);
          }
        }
        recordByReferenceKey.set(referenceKey(reference), record);
        const nextNode = applyRecordToNode(node, record);
        changed ||= JSON.stringify(nextNode) !== JSON.stringify(node);
        return nextNode;
      });
      if (changed) await writeProjectIfChanged(filePath, originalText, { ...project, nodes });
    }
    state.lastIndex = Math.max(state.lastIndex, ...state.records.map((record) => record.idx), 0);
  }

  async function ensureInitialized() {
    const state = await readState(registryPath);
    if (!initialized) {
      await migrateStoredProjects(state);
      await writeState(registryPath, state);
      initialized = true;
    }
    return state;
  }

  async function synchronizeRecordsToStoredProjects(state, recordIds) {
    const selectedIds = new Set(recordIds);
    if (selectedIds.size === 0) return;
    const recordById = new Map(state.records.filter((record) => selectedIds.has(record.id)).map((record) => [record.id, record]));
    for (const filePath of await listProjectJsonFiles(filesRoot)) {
      let originalText;
      let project;
      try {
        originalText = await readFile(filePath, "utf-8");
        project = JSON.parse(originalText);
      } catch {
        continue;
      }
      if (!project || !Array.isArray(project.nodes)) continue;
      let changed = false;
      const nodes = project.nodes.map((node) => {
        const record = recordById.get(String(node?.params?.[GLOBAL_LINE_ID_PARAM] ?? ""));
        if (!record || energyTypeForKind(node.kind) !== record.energyType) return node;
        const nextNode = applyRecordToNode(node, record);
        changed ||= JSON.stringify(nextNode) !== JSON.stringify(node);
        return nextNode;
      });
      if (changed) await writeProjectIfChanged(filePath, originalText, { ...project, nodes });
    }
  }

  return {
    registryPath,
    async list() {
      return locked(async () => (await ensureInitialized()).records.map(publicRecord).sort((a, b) => a.idx - b.idx));
    },

    async attach(payload) {
      return locked(async () => {
        const state = await ensureInitialized();
        const energyType = payload?.energyType === "dc" ? "dc" : payload?.energyType === "ac" ? "ac" : energyTypeForKind(payload?.node?.kind);
        if (!energyType) throw new GlobalLineRegistryError("仅支持交流或直流线路进入全局线路表。", 400);
        const reference = normalizeReference(payload?.reference);
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
        addReference(record, reference);
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
        await synchronizeRecordsToStoredProjects(state, [record.id]);
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
        const nodeById = new Map(project.nodes.map((node) => [String(node?.id ?? ""), node]));
        const activeReferenceKeys = new Set();
        const changedRecordIds = new Set();
        const assignments = {};
        const managedModel = MANAGED_MODEL_TYPES.has(String(project.modelType ?? payload?.modelType ?? ""));
        const nodes = project.nodes.map((node) => {
          const energyType = energyTypeForKind(node?.kind);
          if (!managedModel || !energyType || !lineTouchesBoundary(node, nodeById)) {
            return removeGlobalId(node);
          }
          const reference = normalizeReference({ projectIdx, schemePath, projectName, modelKey, nodeId: node.id, ...boundaryReferenceMetadata(node, nodeById) });
          const storedId = String(node?.params?.[GLOBAL_LINE_ID_PARAM] ?? "").trim();
          let record = state.records.find((item) => item.id === storedId);
          if (!record) {
            record = state.records.find((item) => item.references.some((itemReference) => referenceKey(itemReference) === referenceKey(reference)));
          }
          if (!record || record.energyType !== energyType) {
            record = nextRecord(state, energyType, node);
          }
          addReference(record, reference);
          const requestedName = String(node?.name ?? "").trim();
          if (requestedName && requestedName !== record.name) {
            assertUniqueName(state, requestedName, record.id);
            record.name = requestedName;
          }
          const nextParams = sharedParams(node);
          if (JSON.stringify(nextParams) !== JSON.stringify(record.params)) record.params = nextParams;
          record.updatedAt = new Date().toISOString();
          activeReferenceKeys.add(referenceKey(reference));
          changedRecordIds.add(record.id);
          assignments[node.id] = record.id;
          return applyRecordToNode(node, record);
        });
        for (const record of state.records) {
          const before = record.references.length;
          record.references = record.references.filter((reference) => reference.modelKey !== modelKey || activeReferenceKeys.has(referenceKey(reference)));
          if (record.references.length !== before) {
            record.updatedAt = new Date().toISOString();
            changedRecordIds.add(record.id);
          }
        }
        await writeState(registryPath, state);
        await synchronizeRecordsToStoredProjects(state, changedRecordIds);
        return {
          project: { ...project, nodes },
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
          record.references = record.references.filter((reference) => (
            reference.modelKey !== modelKey &&
            !(reference.projectName === String(payload?.projectName ?? "").trim() && JSON.stringify(reference.schemePath) === JSON.stringify(normalizedStringArray(payload?.schemePath)))
          ));
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
