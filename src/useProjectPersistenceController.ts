import { useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { type SavedProjectRecord, type SavedSchemeRecord } from "./model";
import {
  ACTIVE_PROJECT_STORAGE_KEY,
  DRAFT_PROJECT_STORAGE_KEY,
  SCHEME_STORAGE_KEY,
  activeProjectPointerPayload,
  draftProjectFromSavedSchemes,
  fetchBackendSchemes,
  findSavedProjectByActivePointer,
  readActiveProjectPointer,
  readDraftProject,
  readRefreshRecoveryProject,
  readSavedSchemes,
  readStoredSchemesPayload,
  saveBackendSchemesPayload,
  serializeSchemesForStorage,
  shouldPreferLocalSchemesOverBackend,
  type DraftProjectState
} from "./projectPersistence";

export type BackendProjectLoadRequest = {
  id: number;
  project: SavedProjectRecord;
  schemeId: string;
};

type ProjectPersistenceControllerOptions = {
  saveRequiredRef: { current: boolean };
  onOperationLog: (message: string) => void;
};

export function useProjectPersistenceController({
  saveRequiredRef,
  onOperationLog
}: ProjectPersistenceControllerOptions) {
  const onOperationLogRef = useRef(onOperationLog);
  onOperationLogRef.current = onOperationLog;
  const initialStoredSchemesPayload = useMemo(() => readStoredSchemesPayload(), []);
  const initialSavedSchemes = useMemo(
    () => readSavedSchemes(initialStoredSchemesPayload),
    [initialStoredSchemesPayload]
  );
  const initialProjectSources = useMemo(() => {
    const refreshRecovery = readRefreshRecoveryProject();
    const activeProjectPointer = readActiveProjectPointer();
    const savedProjectDraft = draftProjectFromSavedSchemes(initialSavedSchemes, activeProjectPointer);
    return {
      recoveredFromRefresh: Boolean(refreshRecovery),
      draft: refreshRecovery ?? savedProjectDraft ?? readDraftProject()
    };
  }, [initialSavedSchemes]);
  const initialDraft: DraftProjectState | null = initialProjectSources.draft;

  const backendSchemesLoadedRef = useRef(false);
  const suppressNextBackendSchemeSyncRef = useRef(false);
  const lastPersistedSchemesPayloadRef = useRef<string | null>(null);
  const pendingBackendSchemesPayloadRef = useRef<string | null>(null);
  const schemeBackendSyncSequenceRef = useRef(0);
  const backendSchemesLoadTokenRef = useRef(0);
  const schemesChangedBeforeBackendLoadRef = useRef(false);
  const startupHadStoredSchemesRef = useRef(Boolean(initialStoredSchemesPayload));
  const latestSchemesRef = useRef<SavedSchemeRecord[]>(initialSavedSchemes);
  const latestActiveProjectPointerRef = useRef(activeProjectPointerPayload(initialSavedSchemes, initialDraft?.activeProjectKey ?? "", initialDraft?.activeSchemeKey ?? ""));
  const backendProjectLoadRequestIdRef = useRef(0);
  const [backendProjectLoadRequest, setBackendProjectLoadRequest] = useState<BackendProjectLoadRequest | null>(null);
  const [schemes, setSchemesState] = useState<SavedSchemeRecord[]>(initialSavedSchemes);
  const [activeProjectKey, setActiveProjectKey] = useState<string>(() => initialDraft?.activeProjectKey ?? "");
  const [activeSchemeKey, setActiveSchemeKey] = useState<string>(() => initialDraft?.activeSchemeKey ?? "");

  latestSchemesRef.current = schemes;
  latestActiveProjectPointerRef.current = activeProjectPointerPayload(schemes, activeProjectKey, activeSchemeKey);

  const setSchemes = (value: SetStateAction<SavedSchemeRecord[]>) => {
    if (!backendSchemesLoadedRef.current) {
      schemesChangedBeforeBackendLoadRef.current = true;
    }
    setSchemesState(value);
  };

  const persistBackendSchemesPayload = (normalizedSchemesPayload: string) => {
    pendingBackendSchemesPayloadRef.current = normalizedSchemesPayload;
    const syncSequence = ++schemeBackendSyncSequenceRef.current;
    void saveBackendSchemesPayload(normalizedSchemesPayload)
      .then(() => {
        if (syncSequence !== schemeBackendSyncSequenceRef.current) {
          return;
        }
        lastPersistedSchemesPayloadRef.current = normalizedSchemesPayload;
        if (pendingBackendSchemesPayloadRef.current === normalizedSchemesPayload) {
          pendingBackendSchemesPayloadRef.current = null;
        }
        onOperationLogRef.current("方案/模型目录已自动保存到后台");
      })
      .catch(() => {
        if (syncSequence !== schemeBackendSyncSequenceRef.current) {
          return;
        }
        pendingBackendSchemesPayloadRef.current = normalizedSchemesPayload;
        onOperationLogRef.current("方案/模型目录自动保存到后台失败");
      });
  };

  const persistSchemesPayloadToStorageAndBackend = (normalizedSchemesPayload: string) => {
    try {
      window.localStorage.setItem(SCHEME_STORAGE_KEY, normalizedSchemesPayload);
    } catch {
      // 浏览器缓存不可写时不阻断当前编辑，后台同步仍会继续尝试。
    }
    if (!backendSchemesLoadedRef.current) {
      pendingBackendSchemesPayloadRef.current = normalizedSchemesPayload;
      return;
    }
    if (pendingBackendSchemesPayloadRef.current === normalizedSchemesPayload) {
      return;
    }
    persistBackendSchemesPayload(normalizedSchemesPayload);
  };

  const saveActiveProjectPointer = (draftProjectId: string, draftSchemeId: string) => {
    const pointerPayload = activeProjectPointerPayload(schemes, draftProjectId, draftSchemeId);
    try {
      window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(pointerPayload ?? {}));
      window.localStorage.removeItem(DRAFT_PROJECT_STORAGE_KEY);
    } catch {
      // 活动模型指针只是加速下次打开/刷新，写入失败不阻断手动保存。
    }
  };

  const clearBackendProjectLoadRequest = (requestId?: number) => {
    setBackendProjectLoadRequest((current) => {
      if (!current) {
        return null;
      }
      return requestId === undefined || current.id === requestId ? null : current;
    });
  };

  useEffect(() => {
    const loadToken = ++backendSchemesLoadTokenRef.current;
    fetchBackendSchemes()
      .then((backendSchemes) => {
        if (loadToken !== backendSchemesLoadTokenRef.current) {
          return;
        }
        backendSchemesLoadedRef.current = true;
        const localChangedBeforeBackendLoad = schemesChangedBeforeBackendLoadRef.current;
        const currentSchemesPayload = serializeSchemesForStorage(latestSchemesRef.current);
        if (backendSchemes.length > 0) {
          const backendPayload = serializeSchemesForStorage(backendSchemes);
          const localSchemesShouldWin = shouldPreferLocalSchemesOverBackend({
            localSchemes: latestSchemesRef.current,
            backendSchemes,
            hadStoredLocalSchemes: startupHadStoredSchemesRef.current
          });
          lastPersistedSchemesPayloadRef.current = backendPayload;
          if (localChangedBeforeBackendLoad || localSchemesShouldWin) {
            suppressNextBackendSchemeSyncRef.current = false;
            schemesChangedBeforeBackendLoadRef.current = false;
            const pendingPayload = pendingBackendSchemesPayloadRef.current ?? currentSchemesPayload;
            if (pendingPayload !== backendPayload) {
              persistBackendSchemesPayload(pendingPayload);
            } else {
              pendingBackendSchemesPayloadRef.current = null;
            }
            return;
          }
          pendingBackendSchemesPayloadRef.current = null;
          suppressNextBackendSchemeSyncRef.current = true;
          setSchemesState(backendSchemes);
          if (!saveRequiredRef.current) {
            const activePointer = latestActiveProjectPointerRef.current;
            const backendActiveProject = findSavedProjectByActivePointer(backendSchemes, activePointer);
            if (backendActiveProject) {
              setBackendProjectLoadRequest({
                id: ++backendProjectLoadRequestIdRef.current,
                project: backendActiveProject.project,
                schemeId: backendActiveProject.scheme.id
              });
            }
          }
          return;
        }
        const payloadToPersist = pendingBackendSchemesPayloadRef.current ?? currentSchemesPayload;
        if (payloadToPersist) {
          suppressNextBackendSchemeSyncRef.current = false;
          schemesChangedBeforeBackendLoadRef.current = false;
          persistBackendSchemesPayload(payloadToPersist);
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
  }, []);

  useEffect(() => {
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
      persistSchemesPayloadToStorageAndBackend(normalizedSchemesPayload);
    }, 150);
    return () => window.clearTimeout(timeoutId);
  }, [schemes]);

  useEffect(() => {
    const activePointerPayload = activeProjectPointerPayload(schemes, activeProjectKey, activeSchemeKey);
    try {
      window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(activePointerPayload ?? {}));
    } catch {
      // 忽略浏览器缓存写入失败，避免影响画布编辑。
    }
  }, [activeProjectKey, activeSchemeKey, schemes]);

  return {
    activeProjectKey,
    activeSchemeKey,
    backendProjectLoadRequest,
    clearBackendProjectLoadRequest,
    initialDraft,
    initialProjectSources,
    persistSchemesPayloadToStorageAndBackend,
    saveActiveProjectPointer,
    schemes,
    setActiveProjectKey,
    setActiveSchemeKey,
    setSchemes
  };
}
