import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  copySavedProjectWithUniqueName,
  copySavedSchemeWithUniqueName,
  createSavedProject,
  createSavedScheme,
  deleteSavedProjectsFromSchemes,
  deleteSavedScheme,
  findSavedProjectRecordInSchemes,
  findSavedSchemeById,
  findSavedSchemeParentById,
  flattenSavedSchemes,
  insertChildSavedScheme,
  moveSavedSchemeToParent,
  renameSavedProject,
  renameSavedScheme,
  replaceSavedSchemeById,
  savedChildSchemeNames,
  savedSchemeSiblingNames,
  upsertSavedProject,
  upsertSavedProjectInScheme,
  uniqueRecordName,
  type SavedProjectRecord,
  type SavedSchemeRecord
} from "./model";

export type ProjectMenuState = { x: number; y: number; schemeId?: string; projectId?: string } | null;

export type PendingRecordPasteConflict =
  | {
      kind: "scheme";
      sourceScheme: SavedSchemeRecord;
      duplicateSchemeId: string;
      duplicateName: string;
      targetParentSchemeId?: string;
    }
  | {
      kind: "project";
      sourceProject: SavedProjectRecord;
      targetSchemeId: string;
      duplicateProjectId: string;
      duplicateName: string;
    }
  | {
      kind: "project-drag";
      projectId: string;
      sourceSchemeId: string;
      targetSchemeId: string;
      duplicateProjectId: string;
      duplicateName: string;
    }
  | {
      kind: "scheme-drag";
      schemeId: string;
      targetSchemeId: string;
      duplicateSchemeId: string;
      duplicateName: string;
    }
  | null;

export type ClipboardRecord =
  | { kind: "scheme"; scheme: SavedSchemeRecord }
  | { kind: "project"; project: SavedProjectRecord };

type ProjectRecordActionsOptions = {
  activeProjectKey: string;
  activeSchemeKey: string;
  projects: SavedProjectRecord[];
  projectById: Map<string, SavedProjectRecord>;
  requireEditMode: (action: string) => boolean;
  schemes: SavedSchemeRecord[];
  setActiveProjectKey: Dispatch<SetStateAction<string>>;
  setActiveSchemeKey: Dispatch<SetStateAction<string>>;
  setProjectName: Dispatch<SetStateAction<string>>;
  setSchemes: (value: SetStateAction<SavedSchemeRecord[]>) => void;
  writeOperationLog: (message: string) => void;
};

export function hasSameName(name: string, names: string[]) {
  return names.some((item) => item.trim() === name.trim());
}

export function promptUniqueRecordName(
  promptText: string,
  defaultName: string,
  existingNames: string[],
  emptyMessage: string,
  duplicateMessage: string
) {
  const inputName = window.prompt(promptText, defaultName);
  if (inputName === null) {
    return null;
  }
  const name = inputName.trim();
  if (!name) {
    window.alert(emptyMessage);
    return null;
  }
  if (hasSameName(name, existingNames)) {
    window.alert(duplicateMessage);
    return null;
  }
  return name;
}

export function useProjectRecordActions({
  activeProjectKey,
  activeSchemeKey,
  projects,
  projectById,
  requireEditMode,
  schemes,
  setActiveProjectKey,
  setActiveSchemeKey,
  setProjectName,
  setSchemes,
  writeOperationLog
}: ProjectRecordActionsOptions) {
  const [pendingRecordPasteConflict, setPendingRecordPasteConflict] = useState<PendingRecordPasteConflict>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedSchemeIds, setSelectedSchemeIds] = useState<string[]>([]);
  const [expandedSchemeIds, setExpandedSchemeIds] = useState<string[]>(() => {
    const preferredSchemeId = activeSchemeKey || schemes[0]?.id;
    return preferredSchemeId ? [preferredSchemeId] : [];
  });
  const [recordClipboard, setRecordClipboard] = useState<ClipboardRecord | null>(null);

  const selectedSchemeRecord = findSavedSchemeById(schemes, selectedSchemeId);
  const activeSchemeRecord =
    findSavedSchemeById(schemes, activeSchemeKey) ??
    findSavedProjectRecordInSchemes(schemes, activeProjectKey)?.scheme;

  useEffect(() => {
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
  }, [activeSchemeKey, schemes, selectedSchemeId]);

  const findSchemeForProject = (projectId: string) =>
    findSavedProjectRecordInSchemes(schemes, projectId)?.scheme;

  const toggleSchemeExpanded = (schemeId: string) => {
    setExpandedSchemeIds((current) =>
      current.includes(schemeId) ? current.filter((id) => id !== schemeId) : [...current, schemeId]
    );
  };

  const clearRecordSelection = () => {
    setSelectedProjectId("");
    setSelectedSchemeId("");
    setSelectedProjectIds([]);
    setSelectedSchemeIds([]);
  };

  const selectSingleScheme = (schemeId: string) => {
    setSelectedSchemeId(schemeId);
    setSelectedSchemeIds([schemeId]);
    setSelectedProjectId("");
    setSelectedProjectIds([]);
  };

  const selectSingleProject = (schemeId: string, projectId: string) => {
    setSelectedSchemeId(schemeId);
    setSelectedProjectId(projectId);
    setSelectedProjectIds([projectId]);
    setSelectedSchemeIds([]);
  };

  const toggleSchemeSelection = (schemeId: string) => {
    setSelectedProjectId("");
    setSelectedProjectIds([]);
    setSelectedSchemeIds((current) => {
      const next = current.includes(schemeId) ? current.filter((id) => id !== schemeId) : [...current, schemeId];
      setSelectedSchemeId(next[0] ?? "");
      return next;
    });
  };

  const toggleProjectSelection = (schemeId: string, projectId: string) => {
    setSelectedSchemeIds([]);
    setSelectedProjectIds((current) => {
      const next = current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId];
      setSelectedProjectId(next[0] ?? "");
      setSelectedSchemeId(next.length > 0 ? schemeId : "");
      return next;
    });
  };

  const cloneProjectRecord = (project: SavedProjectRecord, suffix = "副本", existingNames: string[] = []) =>
    copySavedProjectWithUniqueName(project, existingNames, suffix);

  const cloneProjectRecordWithName = (project: SavedProjectRecord, name: string) =>
    createSavedProject(name, project.project);

  const cloneProjectRecordForPaste = (project: SavedProjectRecord, name = project.name, existingProjectId?: string) => {
    const record = cloneProjectRecordWithName(project, name);
    return existingProjectId
      ? { ...record, id: existingProjectId, name: record.name, project: { ...record.project, name: record.name } }
      : record;
  };

  const cloneSchemeRecord = (scheme: SavedSchemeRecord, existingNames = savedChildSchemeNames(schemes), suffix = "副本"): SavedSchemeRecord => {
    return copySavedSchemeWithUniqueName(scheme, existingNames, suffix);
  };

  const cloneSchemeRecordWithName = (scheme: SavedSchemeRecord, name: string): SavedSchemeRecord => {
    return cloneSchemeRecordForPaste(scheme, name);
  };

  const cloneSchemeRecordForPaste = (scheme: SavedSchemeRecord, name = scheme.name, existingScheme?: SavedSchemeRecord): SavedSchemeRecord => {
    const projects = scheme.projects.reduce<SavedProjectRecord[]>((current, project) => {
      const duplicateProject = existingScheme?.projects.find((item) => hasSameName(item.name, [project.name]));
      return upsertSavedProject(current, cloneProjectRecordForPaste(project, project.name, duplicateProject?.id));
    }, []);
    const existingChildren = existingScheme?.children ?? [];
    const children = (scheme.children ?? []).reduce<SavedSchemeRecord[]>((current, child) => {
      const duplicateChild = existingChildren.find((item) => hasSameName(item.name, [child.name]));
      return [...current, cloneSchemeRecordForPaste(child, child.name, duplicateChild)];
    }, []);
    const record = createSavedScheme(name, projects, children);
    return existingScheme ? { ...record, id: existingScheme.id, name: record.name } : record;
  };

  const createSchemeRecord = (parentSchemeId = "") => {
    if (!requireEditMode("新建方案")) {
      return;
    }
    const inputName = window.prompt("请输入方案名称", "新建方案");
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert("方案名称不能为空。");
      return;
    }
    if (hasSameName(name, savedChildSchemeNames(schemes, parentSchemeId))) {
      window.alert("方案名称重复，无法新建方案。");
      return;
    }
    const record = createSavedScheme(name);
    setSchemes((current) => insertChildSavedScheme(current, parentSchemeId, record));
    if (parentSchemeId) {
      setExpandedSchemeIds((current) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
    selectSingleScheme(record.id);
    writeOperationLog(`新建方案：${record.name}`);
  };

  const renameSchemeRecord = (scheme: SavedSchemeRecord) => {
    if (!requireEditMode("重命名方案")) {
      return;
    }
    const nextName = window.prompt("请输入新的方案名称", scheme.name);
    if (!nextName) {
      return;
    }
    const name = nextName.trim();
    if (!name) {
      window.alert("方案名称不能为空。");
      return;
    }
    if (hasSameName(name, savedSchemeSiblingNames(schemes, scheme.id, scheme.id))) {
      window.alert("方案名称重复，无法修改。");
      return;
    }
    setSchemes((current) => renameSavedScheme(current, scheme.id, nextName));
  };

  const duplicateSchemeRecord = (scheme: SavedSchemeRecord) => {
    if (!requireEditMode("复制方案")) {
      return;
    }
    const defaultName = uniqueRecordName(
      `${scheme.name} 副本`,
      savedSchemeSiblingNames(schemes, scheme.id),
      "未命名方案"
    );
    const name = promptUniqueRecordName(
      "请输入新方案名称",
      defaultName,
      savedSchemeSiblingNames(schemes, scheme.id),
      "方案名称不能为空。",
      "方案名称重复，无法复制。"
    );
    if (!name) {
      return;
    }
    const parentSchemeId = findSavedSchemeParentById(schemes, scheme.id)?.id ?? "";
    const record = cloneSchemeRecordWithName(scheme, name);
    setSchemes((current) => insertChildSavedScheme(current, parentSchemeId, record));
    if (parentSchemeId) {
      setExpandedSchemeIds((current) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
  };

  const deleteSchemeRecord = (scheme: SavedSchemeRecord) => {
    if (!requireEditMode("删除方案")) {
      return;
    }
    const deletingSchemeIds = new Set(flattenSavedSchemes([scheme]).map((item) => item.id));
    if (activeSchemeKey && deletingSchemeIds.has(activeSchemeKey)) {
      window.alert("当前加载模型所在方案不能删除。");
      return;
    }
    if (!window.confirm(`删除方案“${scheme.name}”及其全部模型？`)) {
      return;
    }
    setSchemes((current) => {
      const next = deleteSavedScheme(current, scheme.id);
      return next.length > 0 ? next : [createSavedScheme("默认方案")];
    });
    if (selectedSchemeId && deletingSchemeIds.has(selectedSchemeId)) {
      clearRecordSelection();
    }
  };

  const copyProjectRecord = (project: SavedProjectRecord) => {
    setRecordClipboard({ kind: "project", project });
    writeOperationLog(`复制模型记录：${project.name}`);
  };

  const copySchemeRecord = (scheme: SavedSchemeRecord) => {
    setRecordClipboard({ kind: "scheme", scheme });
    writeOperationLog(`复制方案记录：${scheme.name}`);
  };

  const copySelectedRecord = () => {
    const projectId = selectedProjectIds[0] ?? selectedProjectId;
    if (projectId) {
      const project = projectById.get(projectId);
      if (project) {
        copyProjectRecord(project);
      }
      return;
    }
    const schemeId = selectedSchemeIds[0] ?? selectedSchemeId;
    if (schemeId) {
      const scheme = findSavedSchemeById(schemes, schemeId);
      if (scheme) {
        copySchemeRecord(scheme);
      }
    }
  };

  const deleteSelectedRecords = () => {
    if (!requireEditMode("删除记录")) {
      return;
    }
    if (selectedProjectIds.length > 0) {
      if (activeProjectKey && selectedProjectIds.includes(activeProjectKey)) {
        window.alert("当前加载模型不能删除。");
        return;
      }
      const names = projects.filter((project) => selectedProjectIds.includes(project.id)).map((project) => project.name);
      if (!window.confirm(`删除选中的 ${names.length} 个模型？`)) {
        return;
      }
      const selected = new Set(selectedProjectIds);
      setSchemes((current) => deleteSavedProjectsFromSchemes(current, selected));
      clearRecordSelection();
      return;
    }
    if (selectedSchemeIds.length > 0) {
      const deletingSchemeIds = new Set(
        selectedSchemeIds.flatMap((schemeId) => {
          const scheme = findSavedSchemeById(schemes, schemeId);
          return scheme ? flattenSavedSchemes([scheme]).map((item) => item.id) : [schemeId];
        })
      );
      if (activeSchemeKey && deletingSchemeIds.has(activeSchemeKey)) {
        window.alert("当前加载模型所在方案不能删除。");
        return;
      }
      if (!window.confirm(`删除选中的 ${selectedSchemeIds.length} 个方案及其全部模型？`)) {
        return;
      }
      setSchemes((current) => {
        const next = selectedSchemeIds.reduce((nextSchemes, schemeId) => deleteSavedScheme(nextSchemes, schemeId), current);
        return next.length > 0 ? next : [createSavedScheme("默认方案")];
      });
      clearRecordSelection();
    }
  };

  const pasteSchemeClipboardRecord = (parentSchemeId = "") => {
    if (!requireEditMode("粘贴方案")) {
      return;
    }
    if (recordClipboard?.kind !== "scheme") {
      return;
    }
    const sourceScheme = recordClipboard.scheme;
    const targetSchemes = parentSchemeId ? findSavedSchemeById(schemes, parentSchemeId)?.children ?? [] : schemes;
    const duplicateScheme = targetSchemes.find((scheme) => hasSameName(scheme.name, [sourceScheme.name]));
    if (duplicateScheme) {
      setPendingRecordPasteConflict({
        kind: "scheme",
        sourceScheme,
        duplicateSchemeId: duplicateScheme.id,
        duplicateName: duplicateScheme.name,
        targetParentSchemeId: parentSchemeId
      });
      return;
    }
    const record = cloneSchemeRecordForPaste(sourceScheme, sourceScheme.name);
    setSchemes((current) => insertChildSavedScheme(current, parentSchemeId, record));
    if (parentSchemeId) {
      setExpandedSchemeIds((current) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
    writeOperationLog(`粘贴方案记录：${sourceScheme.name}`);
  };

  const pasteProjectClipboardRecord = (targetSchemeId = selectedSchemeId || activeSchemeKey || schemes[0]?.id) => {
    if (!requireEditMode("粘贴模型")) {
      return;
    }
    if (recordClipboard?.kind !== "project") {
      return;
    }
    const sourceProject = recordClipboard.project;
    const targetScheme = findSavedSchemeById(schemes, targetSchemeId) ?? schemes[0];
    if (!targetScheme) {
      return;
    }
    const duplicateProject = targetScheme.projects.find((project) => hasSameName(project.name, [sourceProject.name]));
    if (duplicateProject) {
      setPendingRecordPasteConflict({
        kind: "project",
        sourceProject,
        targetSchemeId: targetScheme.id,
        duplicateProjectId: duplicateProject.id,
        duplicateName: duplicateProject.name
      });
      return;
    }
    setSchemes((current) => upsertSavedProjectInScheme(current, targetScheme.id, cloneProjectRecordForPaste(sourceProject, sourceProject.name)));
    writeOperationLog(`粘贴模型记录：${sourceProject.name}`);
  };

  const pasteSelectedRecord = () => {
    if (!requireEditMode("粘贴记录")) {
      return;
    }
    if (!recordClipboard) {
      return;
    }
    if (recordClipboard.kind === "scheme") {
      pasteSchemeClipboardRecord();
      return;
    }
    pasteProjectClipboardRecord();
  };

  const commitProjectRecordMove = (
    projectId: string,
    targetSchemeId: string,
    options: { targetName?: string; overwriteProjectId?: string } = {}
  ) => {
    if (!requireEditMode("移动模型")) {
      return;
    }
    const targetName = options.targetName?.trim();
    const nextProjectId = options.overwriteProjectId ?? projectId;
    setSchemes((current) => {
      const sourceRecord = findSavedProjectRecordInSchemes(current, projectId);
      const targetScheme = findSavedSchemeById(current, targetSchemeId);
      const project = sourceRecord?.project;
      const sourceScheme = sourceRecord?.scheme;
      if (!sourceScheme || !targetScheme || !project || sourceScheme.id === targetSchemeId) {
        return current;
      }
      const now = new Date().toISOString();
      const movedName = targetName || project.name;
      const movedProject: SavedProjectRecord = {
        ...project,
        id: nextProjectId,
        name: movedName,
        updatedAt: now,
        project: { ...project.project, name: movedName }
      };
      const withoutSourceProject = deleteSavedProjectsFromSchemes(current, new Set([projectId]));
      return upsertSavedProjectInScheme(withoutSourceProject, targetScheme.id, movedProject);
    });
    setExpandedSchemeIds((current) => (current.includes(targetSchemeId) ? current : [...current, targetSchemeId]));
    if (
      selectedProjectId === projectId ||
      selectedProjectIds.includes(projectId) ||
      (options.overwriteProjectId && (selectedProjectId === options.overwriteProjectId || selectedProjectIds.includes(options.overwriteProjectId)))
    ) {
      setSelectedSchemeId(targetSchemeId);
      setSelectedProjectIds([nextProjectId]);
      setSelectedProjectId(nextProjectId);
      setSelectedSchemeIds([]);
    }
    if (activeProjectKey === projectId || activeProjectKey === options.overwriteProjectId) {
      setActiveProjectKey(nextProjectId);
      setActiveSchemeKey(targetSchemeId);
      if (targetName) {
        setProjectName(targetName);
      }
    }
  };

  const resolveRecordPasteConflict = (action: "overwrite" | "rename" | "cancel") => {
    if (action !== "cancel" && !requireEditMode("处理粘贴冲突")) {
      return;
    }
    const conflict = pendingRecordPasteConflict;
    if (!conflict || action === "cancel") {
      setPendingRecordPasteConflict(null);
      return;
    }
    if (conflict.kind === "scheme") {
      const targetParentSchemeId = conflict.targetParentSchemeId ?? "";
      const siblingNames = savedChildSchemeNames(schemes, targetParentSchemeId);
      if (action === "rename") {
        const renamed = promptUniqueRecordName(
          "请输入粘贴后的方案名称",
          uniqueRecordName(conflict.sourceScheme.name, siblingNames, "未命名方案"),
          siblingNames,
          "方案名称不能为空。",
          "方案名称重复，无法粘贴。"
        );
        if (!renamed) {
          return;
        }
        setPendingRecordPasteConflict(null);
        const record = cloneSchemeRecordForPaste(conflict.sourceScheme, renamed);
        setSchemes((current) => insertChildSavedScheme(current, targetParentSchemeId, record));
        if (targetParentSchemeId) {
          setExpandedSchemeIds((current) => (current.includes(targetParentSchemeId) ? current : [...current, targetParentSchemeId]));
        }
        writeOperationLog(`新命名粘贴方案记录：${renamed}`);
        return;
      }
      setPendingRecordPasteConflict(null);
      setSchemes((current) => {
        const duplicateScheme = findSavedSchemeById(current, conflict.duplicateSchemeId);
        if (!duplicateScheme) {
          return insertChildSavedScheme(current, targetParentSchemeId, cloneSchemeRecordForPaste(conflict.sourceScheme, conflict.duplicateName));
        }
        return replaceSavedSchemeById(current, duplicateScheme.id, cloneSchemeRecordForPaste(conflict.sourceScheme, duplicateScheme.name, duplicateScheme));
      });
      writeOperationLog(`覆盖粘贴方案记录：${conflict.duplicateName}`);
      return;
    }
    if (conflict.kind === "scheme-drag") {
      const sourceScheme = findSavedSchemeById(schemes, conflict.schemeId);
      const targetScheme = findSavedSchemeById(schemes, conflict.targetSchemeId);
      if (!sourceScheme || !targetScheme) {
        setPendingRecordPasteConflict(null);
        return;
      }
      const targetChildNames = (targetScheme.children ?? []).map((scheme) => scheme.name);
      if (action === "rename") {
        const renamed = promptUniqueRecordName(
          "请输入拖拽后的方案名称",
          uniqueRecordName(sourceScheme.name, targetChildNames, "未命名方案"),
          targetChildNames,
          "方案名称不能为空。",
          "方案名称重复，无法拖拽。"
        );
        if (!renamed) {
          return;
        }
        setPendingRecordPasteConflict(null);
        setSchemes((current) => moveSavedSchemeToParent(current, conflict.schemeId, conflict.targetSchemeId, { targetName: renamed }));
        setExpandedSchemeIds((current) => (current.includes(conflict.targetSchemeId) ? current : [...current, conflict.targetSchemeId]));
        writeOperationLog(`新命名拖拽方案记录：${renamed}`);
        return;
      }
      setPendingRecordPasteConflict(null);
      setSchemes((current) => moveSavedSchemeToParent(current, conflict.schemeId, conflict.targetSchemeId, {
        targetName: conflict.duplicateName,
        overwriteSchemeId: conflict.duplicateSchemeId
      }));
      setExpandedSchemeIds((current) => (current.includes(conflict.targetSchemeId) ? current : [...current, conflict.targetSchemeId]));
      writeOperationLog(`覆盖拖拽方案记录：${conflict.duplicateName}`);
      return;
    }
    if (conflict.kind === "project-drag") {
      const sourceScheme = findSavedSchemeById(schemes, conflict.sourceSchemeId);
      const sourceProject = sourceScheme?.projects.find((project) => project.id === conflict.projectId);
      const targetScheme = findSavedSchemeById(schemes, conflict.targetSchemeId);
      if (!sourceProject || !targetScheme) {
        setPendingRecordPasteConflict(null);
        return;
      }
      if (action === "rename") {
        const renamed = promptUniqueRecordName(
          "请输入拖拽后的模型名称",
          uniqueRecordName(sourceProject.name, targetScheme.projects.map((project) => project.name), "未命名模型"),
          targetScheme.projects.map((project) => project.name),
          "模型名称不能为空。",
          "模型名称重复，无法拖拽。"
        );
        if (!renamed) {
          return;
        }
        setPendingRecordPasteConflict(null);
        commitProjectRecordMove(conflict.projectId, conflict.targetSchemeId, { targetName: renamed });
        writeOperationLog(`新命名拖拽模型记录：${renamed}`);
        return;
      }
      setPendingRecordPasteConflict(null);
      commitProjectRecordMove(conflict.projectId, conflict.targetSchemeId, {
        targetName: conflict.duplicateName,
        overwriteProjectId: conflict.duplicateProjectId
      });
      writeOperationLog(`覆盖拖拽模型记录：${conflict.duplicateName}`);
      return;
    }
    const targetScheme =
      findSavedSchemeById(schemes, conflict.targetSchemeId) ??
      activeSchemeRecord ??
      selectedSchemeRecord ??
      schemes[0];
    if (!targetScheme) {
      setPendingRecordPasteConflict(null);
      return;
    }
    if (action === "rename") {
      const renamed = promptUniqueRecordName(
        "请输入粘贴后的模型名称",
        uniqueRecordName(conflict.sourceProject.name, targetScheme.projects.map((project) => project.name), "未命名模型"),
        targetScheme.projects.map((project) => project.name),
        "模型名称不能为空。",
        "模型名称重复，无法粘贴。"
      );
      if (!renamed) {
        return;
      }
      setPendingRecordPasteConflict(null);
      setSchemes((current) => upsertSavedProjectInScheme(current, targetScheme.id, cloneProjectRecordForPaste(conflict.sourceProject, renamed)));
      writeOperationLog(`新命名粘贴模型记录：${renamed}`);
      return;
    }
    setPendingRecordPasteConflict(null);
    setSchemes((current) => {
      const currentTargetScheme = findSavedSchemeById(current, targetScheme.id);
      if (!currentTargetScheme) {
        return current;
      }
      const duplicateProject = currentTargetScheme.projects.find((project) => project.id === conflict.duplicateProjectId);
      const targetName = duplicateProject?.name ?? conflict.duplicateName;
      return upsertSavedProjectInScheme(
        current,
        currentTargetScheme.id,
        cloneProjectRecordForPaste(conflict.sourceProject, targetName, conflict.duplicateProjectId)
      );
    });
    writeOperationLog(`覆盖粘贴模型记录：${conflict.duplicateName}`);
  };

  const moveProjectRecordToScheme = (projectId: string, schemeId: string) => {
    if (!requireEditMode("移动模型")) {
      return;
    }
    const sourceScheme = findSchemeForProject(projectId);
    const sourceProject = sourceScheme?.projects.find((project) => project.id === projectId);
    const targetScheme = findSavedSchemeById(schemes, schemeId);
    if (!sourceScheme || !sourceProject || !targetScheme || sourceScheme.id === targetScheme.id) {
      return;
    }
    const duplicateProject = targetScheme.projects.find(
      (project) => project.id !== sourceProject.id && hasSameName(project.name, [sourceProject.name])
    );
    if (duplicateProject) {
      setPendingRecordPasteConflict({
        kind: "project-drag",
        projectId,
        sourceSchemeId: sourceScheme.id,
        targetSchemeId: targetScheme.id,
        duplicateProjectId: duplicateProject.id,
        duplicateName: duplicateProject.name
      });
      return;
    }
    commitProjectRecordMove(projectId, schemeId);
  };

  const moveSchemeRecordToScheme = (schemeId: string, targetSchemeId: string) => {
    if (!requireEditMode("移动方案")) {
      return;
    }
    const sourceScheme = findSavedSchemeById(schemes, schemeId);
    const targetScheme = findSavedSchemeById(schemes, targetSchemeId);
    if (!sourceScheme || !targetScheme || sourceScheme.id === targetScheme.id) {
      return;
    }
    const movedSchemeIds = new Set(flattenSavedSchemes([sourceScheme]).map((scheme) => scheme.id));
    if (movedSchemeIds.has(targetScheme.id)) {
      return;
    }
    const duplicateScheme = (targetScheme.children ?? []).find(
      (scheme) => scheme.id !== sourceScheme.id && hasSameName(scheme.name, [sourceScheme.name])
    );
    if (duplicateScheme) {
      setPendingRecordPasteConflict({
        kind: "scheme-drag",
        schemeId,
        targetSchemeId: targetScheme.id,
        duplicateSchemeId: duplicateScheme.id,
        duplicateName: duplicateScheme.name
      });
      return;
    }
    setSchemes((current) => moveSavedSchemeToParent(current, schemeId, targetScheme.id));
    setExpandedSchemeIds((current) => (current.includes(targetScheme.id) ? current : [...current, targetScheme.id]));
    if (selectedSchemeId === schemeId || selectedSchemeIds.includes(schemeId)) {
      setSelectedSchemeId(schemeId);
      setSelectedSchemeIds([]);
      setSelectedProjectId("");
      setSelectedProjectIds([]);
    }
    writeOperationLog(`移动方案“${sourceScheme.name}”到“${targetScheme.name}”下`);
  };

  const renameProjectRecord = (project: SavedProjectRecord) => {
    if (!requireEditMode("重命名模型")) {
      return;
    }
    const nextName = window.prompt("请输入新的模型名称", project.name);
    if (!nextName) {
      return;
    }
    const name = nextName.trim();
    const ownerScheme = findSchemeForProject(project.id);
    if (!name) {
      window.alert("模型名称不能为空。");
      return;
    }
    if (ownerScheme && hasSameName(name, ownerScheme.projects.filter((item) => item.id !== project.id).map((item) => item.name))) {
      window.alert("模型名称重复，无法修改。");
      return;
    }
    if (ownerScheme) {
      const renamedProjects = renameSavedProject(ownerScheme.projects, project.id, nextName);
      const renamedProject = renamedProjects.find((item) => item.id === project.id);
      if (renamedProject) {
        setSchemes((current) => upsertSavedProjectInScheme(current, ownerScheme.id, renamedProject));
      }
    }
    if (activeProjectKey === project.id) {
      setProjectName(nextName.trim() || "未命名模型");
    }
  };

  const duplicateProjectRecord = (project: SavedProjectRecord) => {
    if (!requireEditMode("复制模型")) {
      return;
    }
    const ownerScheme = findSchemeForProject(project.id);
    const existingNames = ownerScheme?.projects.map((item) => item.name) ?? [];
    const defaultName = uniqueRecordName(`${project.name} 副本`, existingNames, "未命名模型");
    const name = promptUniqueRecordName(
      "请输入新模型名称",
      defaultName,
      existingNames,
      "模型名称不能为空。",
      "模型名称重复，无法复制。"
    );
    if (!name) {
      return;
    }
    if (ownerScheme) {
      setSchemes((current) => upsertSavedProjectInScheme(current, ownerScheme.id, cloneProjectRecordWithName(project, name)));
    }
  };

  const duplicateSelectedProjectRecords = () => {
    if (!requireEditMode("复制模型")) {
      return;
    }
    if (selectedProjectIds.length <= 1) {
      const project = projectById.get(selectedProjectIds[0] ?? selectedProjectId);
      if (project) {
        duplicateProjectRecord(project);
      }
      return;
    }
    const selected = new Set(selectedProjectIds);
    setSchemes((current) =>
      flattenSavedSchemes(current).reduce((nextSchemes, scheme) => {
        const selectedProjects = scheme.projects.filter((project) => selected.has(project.id));
        if (selectedProjects.length === 0) {
          return nextSchemes;
        }
        let nextProjects = scheme.projects;
        for (const project of selectedProjects) {
          nextProjects = upsertSavedProject(nextProjects, cloneProjectRecord(project, "副本", nextProjects.map((item) => item.name)));
        }
        return nextProjects.reduce((updatedSchemes, project) => upsertSavedProjectInScheme(updatedSchemes, scheme.id, project), nextSchemes);
      }, current)
    );
  };

  const duplicateSelectedSchemeRecords = () => {
    if (!requireEditMode("复制方案")) {
      return;
    }
    if (selectedSchemeIds.length <= 1) {
      const scheme = findSavedSchemeById(schemes, selectedSchemeIds[0] ?? selectedSchemeId);
      if (scheme) {
        duplicateSchemeRecord(scheme);
      }
      return;
    }
    setSchemes((current) => {
      let nextSchemes = current;
      for (const schemeId of selectedSchemeIds) {
        const scheme = findSavedSchemeById(nextSchemes, schemeId);
        if (!scheme) {
          continue;
        }
        const parentSchemeId = findSavedSchemeParentById(nextSchemes, scheme.id)?.id ?? "";
        const siblingNames = savedSchemeSiblingNames(nextSchemes, scheme.id);
        nextSchemes = insertChildSavedScheme(nextSchemes, parentSchemeId, cloneSchemeRecord(scheme, siblingNames));
      }
      return nextSchemes;
    });
  };

  const deleteProjectRecord = (project: SavedProjectRecord) => {
    if (!requireEditMode("删除模型")) {
      return;
    }
    if (project.id === activeProjectKey) {
      window.alert("当前加载模型不能删除。");
      return;
    }
    if (!window.confirm(`删除模型“${project.name}”？`)) {
      return;
    }
    setSchemes((current) => deleteSavedProjectsFromSchemes(current, new Set([project.id])));
    if (selectedProjectId === project.id) {
      clearRecordSelection();
    }
  };

  return {
    clearRecordSelection,
    copyProjectRecord,
    copySchemeRecord,
    copySelectedRecord,
    createSchemeRecord,
    deleteProjectRecord,
    deleteSchemeRecord,
    deleteSelectedRecords,
    duplicateProjectRecord,
    duplicateSchemeRecord,
    duplicateSelectedProjectRecords,
    duplicateSelectedSchemeRecords,
    expandedSchemeIds,
    findSchemeForProject,
    moveProjectRecordToScheme,
    moveSchemeRecordToScheme,
    pasteProjectClipboardRecord,
    pasteSchemeClipboardRecord,
    pasteSelectedRecord,
    pendingRecordPasteConflict,
    recordClipboard,
    renameProjectRecord,
    renameSchemeRecord,
    resolveRecordPasteConflict,
    selectSingleProject,
    selectSingleScheme,
    selectedProjectId,
    selectedProjectIds,
    selectedSchemeId,
    selectedSchemeIds,
    setExpandedSchemeIds,
    setSelectedProjectId,
    setSelectedProjectIds,
    setSelectedSchemeId,
    setSelectedSchemeIds,
    toggleProjectSelection,
    toggleSchemeExpanded,
    toggleSchemeSelection
  };
}
