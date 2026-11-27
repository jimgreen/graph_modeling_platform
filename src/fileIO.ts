// 文件下载与保存工具函数

import { apiPath } from "./config";
import { encodeGbk } from "./encoding/gbk";

export type TextFileEncoding = "utf-8" | "gbk";
export type EFileTextEncoding = TextFileEncoding;
export type SaveFilePickerStartIn = "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";

/** 将文本按指定编码转为字节（默认 utf-8；E 文件统一使用 gbk） */
export function encodeTextAsBytes(text: string, encoding: EFileTextEncoding = "utf-8"): Uint8Array {
  if (encoding === "gbk") {
    return encodeGbk(text);
  }
  return new TextEncoder().encode(text);
}

export function downloadText(filename: string, text: string, mime: string, encoding: EFileTextEncoding = "utf-8") {
  const blob = new Blob([encodeTextAsBytes(text, encoding) as BlobPart], { type: mime });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** 字节流的浏览器下载兜底（本机另存为不可用时的退路，与 downloadBlob 同形）。 */
export function downloadBytes(filename: string, bytes: Uint8Array, mime: string) {
  downloadBlob(filename, new Blob([bytes as BlobPart], { type: mime }));
}

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    id?: string;
    suggestedName?: string;
    startIn?: SaveFilePickerStartIn;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
    excludeAcceptAllOption?: boolean;
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob | string) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

type DirectoryFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob | string) => Promise<void> | void;
    close: () => Promise<void> | void;
  }>;
};

export type WritableDirectoryHandle = {
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<DirectoryFileHandle>;
};

export type TextSaveOptions = {
  filename: string;
  text: string;
  mime: string;
  description: string;
  extensions: string[];
  encoding?: EFileTextEncoding;
  onSaveTargetReady?: () => void;
  preferNativeDialog?: boolean;
  pickerId?: string;
  startIn?: SaveFilePickerStartIn;
  onSaved?: (file: SavedExportFile) => void;
};
export type LazyTextSaveOptions = Omit<TextSaveOptions, "text"> & {
  loadText: () => Promise<string> | string;
};
export type BlobSaveOptions = {
  filename: string;
  blob: Blob;
  mime: string;
  description: string;
  extensions: string[];
  pickerId?: string;
  startIn?: SaveFilePickerStartIn;
  preferNativeDialog?: boolean;
  onSaved?: (file: SavedExportFile) => void;
};
export type LazyBlobSaveOptions = Omit<BlobSaveOptions, "blob"> & {
  loadBlob: () => Promise<Blob>;
};

const EXPORT_SAVE_PICKER_ID = "model-export";
const NATIVE_EXPORT_DIRECTORY_STORAGE_KEY = "graph-modeling-platform.native-export.directory";
const LOCAL_NATIVE_EXPORT_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const NATIVE_EXPORT_SELECT_PATH = "/exports/native/select-file";
const NATIVE_EXPORT_WRITE_PATH = "/exports/native/write-text";
const NATIVE_EXPORT_WRITE_BUNDLE_PATH = "/exports/native/write-bundle";
const NATIVE_EXPORT_OPEN_PATH = "/exports/native/open-file";

export type ExportProgressPhase = "idle" | "dialog" | "writing";
export type ExportProgressState = {
  active: boolean;
  phase: ExportProgressPhase;
  label: string;
};

const IDLE_EXPORT_PROGRESS_STATE: ExportProgressState = Object.freeze({
  active: false,
  phase: "idle",
  label: ""
});

let currentExportProgressState: ExportProgressState = IDLE_EXPORT_PROGRESS_STATE;
const exportProgressListeners = new Set<() => void>();
let activeSaveOperationDepth = 0;
let userExportActionInFlight = false;

function emitExportProgress(next: ExportProgressState) {
  if (
    currentExportProgressState.active === next.active
    && currentExportProgressState.phase === next.phase
    && currentExportProgressState.label === next.label
  ) {
    return;
  }
  currentExportProgressState = next;
  for (const listener of exportProgressListeners) {
    listener();
  }
}

export function getExportProgressState(): ExportProgressState {
  return currentExportProgressState;
}

export function subscribeExportProgress(listener: () => void): () => void {
  exportProgressListeners.add(listener);
  return () => {
    exportProgressListeners.delete(listener);
  };
}

export function updateExportProgress(phase: Exclude<ExportProgressPhase, "idle">, label: string) {
  emitExportProgress({
    active: true,
    phase,
    label
  });
}

export function clearExportProgress() {
  emitExportProgress(IDLE_EXPORT_PROGRESS_STATE);
}

export function isUserExportInFlight(): boolean {
  return userExportActionInFlight || activeSaveOperationDepth > 0;
}

/**
 * 用户触发的导出动作单飞互斥保护：
 * 正在等待另存为弹窗或后台生成写盘期间拦截重复点击，防止弹出多个系统对话框或并发重复请求。
 */
export async function runGuardedUserExportAction(
  actionLabel: string,
  action: () => unknown | Promise<unknown>
): Promise<boolean> {
  if (isUserExportInFlight()) {
    globalThis.showGlobalMessage?.("正在导出文件中，请稍候，切勿重复点击。");
    return false;
  }
  userExportActionInFlight = true;
  updateExportProgress("dialog", `正在准备${actionLabel}…`);
  try {
    await action();
    return true;
  } finally {
    userExportActionInFlight = false;
    if (activeSaveOperationDepth === 0) {
      clearExportProgress();
    }
  }
}

async function withTrackedSaveOperation<T>(initialLabel: string, run: () => Promise<T>): Promise<T> {
  activeSaveOperationDepth += 1;
  updateExportProgress("dialog", initialLabel);
  try {
    return await run();
  } finally {
    activeSaveOperationDepth = Math.max(0, activeSaveOperationDepth - 1);
    if (activeSaveOperationDepth === 0 && !userExportActionInFlight) {
      clearExportProgress();
    }
  }
}

/** 仅供单元测试重置导出进度与单飞锁状态。 */
export function resetExportProgressForTest() {
  activeSaveOperationDepth = 0;
  userExportActionInFlight = false;
  clearExportProgress();
}

/**
 * 本机另存为成功后拿到的「可再次打开」凭据。
 *
 * 只有走本机另存为（后端写盘）才会有：浏览器 `showSaveFilePicker` 只给 FileSystemFileHandle，
 * 不给绝对路径，无从交给操作系统去「按文件关联打开」。
 * token 由后端在写盘成功时签发，后端只认自己写过的路径 —— 前端回传任意路径是不接受的。
 */
export type SavedExportFile = {
  token: string;
  filename: string;
  path: string;
};

let nativeExportDialogUnsupported = false;

/** 仅供单元测试重置「本机服务端弹窗不可用」会话缓存。 */
export function resetNativeExportDialogAvailabilityForTest() {
  nativeExportDialogUnsupported = false;
}

export function isPickerAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function canUseNativeExportDialog(options: Pick<TextSaveOptions, "preferNativeDialog">) {
  if (nativeExportDialogUnsupported || !options.preferNativeDialog || typeof fetch !== "function") {
    return false;
  }
  const hostname = String(window.location?.hostname ?? "").trim().toLowerCase();
  return LOCAL_NATIVE_EXPORT_HOSTNAMES.has(hostname);
}

/** 当前环境是否支持本机系统另存为弹窗（用于组合导出同时选目录与指定基础文件名）。 */
export function canUseNativeExportBundleDialog(): boolean {
  return canUseNativeExportDialog({ preferNativeDialog: true });
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const slice = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
      binary += String.fromCharCode(...slice);
    }
    return btoa(binary);
  }
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
}

export type NativeBundleTextEntry = {
  ext: string;
  text: string;
  encoding?: EFileTextEncoding;
};

export type NativeBundleWrittenFile = {
  ext: string;
  filename: string;
  path: string;
};

export type NativeBundleSaveResult =
  | {
      status: "saved";
      baseName: string;
      directory: string;
      files: NativeBundleWrittenFile[];
      savedFile: SavedExportFile | null;
    }
  | { status: "cancelled" }
  | { status: "unsupported" };

/**
 * 本机组合文件另存为：弹一次系统「另存为」窗口让用户同时选择保存目录与自定义基础文件名，
 * 同时后台并行生成各份内容，确认后一次性在目标目录原子写出 `<基础文件名>.e/.json/.svg`。
 */
export async function saveNativeTextBundle(options: {
  suggestedBaseName: string;
  description?: string;
  extensions?: string[];
  startIn?: SaveFilePickerStartIn;
  loadEntries: () => Promise<NativeBundleTextEntry[]>;
  onSaveTargetReady?: () => void;
}): Promise<NativeBundleSaveResult> {
  if (!canUseNativeExportBundleDialog()) {
    return { status: "unsupported" };
  }
  const safeBase = String(options.suggestedBaseName ?? "").trim() || "model";
  return withTrackedSaveOperation(`正在打开另存为窗口（${safeBase}）…`, async () => {
    const rememberedDirectory = readRememberedNativeExportDirectory();
    const selectPromise = fetch(apiPath(NATIVE_EXPORT_SELECT_PATH), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: `${safeBase}.svg`,
        description: options.description ?? "模型组合导出文件（同目录生成 .e / .json / .svg）",
        extensions: options.extensions ?? [".svg", ".e", ".json"],
        startIn: options.startIn,
        ...(rememberedDirectory ? { initialDirectory: rememberedDirectory } : {}),
        title: "导出 E、JSON 和 SVG（指定保存目录与文件名）"
      })
    });
    const entriesPromise = Promise.resolve().then(options.loadEntries);
    void entriesPromise.catch(() => undefined);

    let selectResponse: Response;
    try {
      selectResponse = await selectPromise;
    } catch {
      return { status: "unsupported" };
    }
    if (selectResponse.status === 501) {
      nativeExportDialogUnsupported = true;
      return { status: "unsupported" };
    }
    if (!selectResponse.ok) {
      throw new Error(await responseErrorMessage(selectResponse, "打开系统另存为窗口失败。"));
    }
    const selection = await selectResponse.json() as {
      cancelled?: boolean;
      token?: string;
      filename?: string;
      directory?: string;
    };
    if (selection.cancelled) {
      return { status: "cancelled" };
    }
    const token = String(selection.token ?? "").trim();
    if (!token) {
      return { status: "unsupported" };
    }
    rememberNativeExportDirectory(selection.directory);

    options.onSaveTargetReady?.();
    updateExportProgress("writing", "正在生成并写入 E、JSON 和 SVG 文件…");
    const entries = await entriesPromise;
    const encodedFiles = entries.map((entry) => ({
      ext: entry.ext,
      base64: uint8ArrayToBase64(encodeTextAsBytes(entry.text, entry.encoding ?? "utf-8"))
    }));

    const writeResponse = await fetch(`${apiPath(NATIVE_EXPORT_WRITE_BUNDLE_PATH)}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ files: encodedFiles })
    });
    if (!writeResponse.ok) {
      throw new Error(await responseErrorMessage(writeResponse, "写入组合导出文件失败。"));
    }
    const payload = await writeResponse.json() as {
      baseName?: unknown;
      directory?: unknown;
      files?: Array<{ ext?: unknown; filename?: unknown; path?: unknown }>;
      viewToken?: unknown;
      filename?: unknown;
      path?: unknown;
    };
    const viewToken = String(payload?.viewToken ?? "").trim();
    const savedFile: SavedExportFile | null = viewToken
      ? {
          token: viewToken,
          filename: String(payload?.filename ?? `${safeBase}.svg`),
          path: String(payload?.path ?? "")
        }
      : null;
    const writtenFiles: NativeBundleWrittenFile[] = Array.isArray(payload?.files)
      ? payload.files.map((item) => ({
          ext: String(item?.ext ?? ""),
          filename: String(item?.filename ?? ""),
          path: String(item?.path ?? "")
        }))
      : [];
    return {
      status: "saved",
      baseName: String(payload?.baseName ?? safeBase),
      directory: String(payload?.directory ?? selection.directory ?? ""),
      files: writtenFiles,
      savedFile
    };
  });
}

/** 用系统默认绑定的工具打开此前导出的文件（由后端按文件关联拉起）。 */
export async function openExportedFile(file: SavedExportFile): Promise<void> {
  const token = String(file?.token ?? "").trim();
  if (!token) {
    throw new Error("缺少导出文件令牌。");
  }
  const response = await fetch(`${apiPath(NATIVE_EXPORT_OPEN_PATH)}?token=${encodeURIComponent(token)}`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, "打开导出文件失败。"));
  }
}

function readRememberedNativeExportDirectory() {
  try {
    return String(window.localStorage?.getItem(NATIVE_EXPORT_DIRECTORY_STORAGE_KEY) ?? "").trim();
  } catch {
    return "";
  }
}

function rememberNativeExportDirectory(directory: unknown) {
  const normalizedDirectory = String(directory ?? "").trim();
  if (!normalizedDirectory) {
    return;
  }
  try {
    window.localStorage?.setItem(NATIVE_EXPORT_DIRECTORY_STORAGE_KEY, normalizedDirectory);
  } catch {
    // Storage can be unavailable in private/restricted browser contexts. Saving still proceeds.
  }
}

async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { error?: unknown };
    const message = String(payload?.error ?? "").trim();
    return message || fallback;
  } catch {
    return fallback;
  }
}

type NativeExportDialogOptions = {
  filename: string;
  mime: string;
  description: string;
  extensions: string[];
  pickerId?: string;
  startIn?: SaveFilePickerStartIn;
  onSaved?: (file: SavedExportFile) => void;
  onSaveTargetReady?: () => void;
};

/**
 * 后端不支持本地原生另存为（501，如非交互桌面/无界面服务）时的无缝降级：
 * 优先尝试浏览器自带 `showSaveFilePicker`，若不支持或手势已失效则直接退回浏览器下载。
 */
async function saveBytesWithBrowserPickerOrDownload(
  options: NativeExportDialogOptions,
  bytesPromise: Promise<Uint8Array>,
  downloadFallback: (bytes: Uint8Array) => void
): Promise<boolean> {
  const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
  if (typeof picker === "function") {
    let handle: Awaited<ReturnType<NonNullable<SaveFilePickerWindow["showSaveFilePicker"]>>>;
    try {
      handle = await picker.call(window, {
        id: options.pickerId ?? EXPORT_SAVE_PICKER_ID,
        suggestedName: options.filename,
        ...(options.startIn ? { startIn: options.startIn } : {}),
        types: [
          {
            description: options.description,
            accept: {
              [options.mime]: options.extensions
            }
          }
        ],
        excludeAcceptAllOption: false
      });
    } catch (error) {
      if (isPickerAbort(error)) {
        return false;
      }
      const bytes = await bytesPromise;
      options.onSaveTargetReady?.();
      downloadFallback(bytes);
      return true;
    }
    options.onSaveTargetReady?.();
    const bytes = await bytesPromise;
    try {
      const writable = await handle.createWritable();
      await writable.write(bytes as unknown as Blob);
      await writable.close();
      return true;
    } catch (error) {
      if (isPickerAbort(error)) {
        return false;
      }
      downloadFallback(bytes);
      return true;
    }
  }
  const bytes = await bytesPromise;
  options.onSaveTargetReady?.();
  downloadFallback(bytes);
  return true;
}

/**
 * 本机另存为：弹系统「另存为」→ 后端原子写盘 → 换回一枚可「查看」的令牌。
 *
 * 文本与二进制共用这一条通道（后端按原始字节落盘，不解析 content-type），
 * 差异只在「字节怎么来」与「兜底下载怎么发」，由调用方注入。
 *
 * `loadBytes()` 在弹窗前就被调起并与 select 并行：E/SVG 生成动辄几百毫秒，
 * 串行的话用户选路径的时间全是白等。生成失败在写盘前冒出来，所以 textPromise 上
 * 预挂一个空 catch，避免等待用户期间变成未处理拒绝。
 */
async function saveFileWithNativeDialog(
  options: NativeExportDialogOptions,
  loadBytes: () => Promise<Uint8Array> | Uint8Array,
  downloadFallback: (bytes: Uint8Array) => void
): Promise<boolean> {
  return withTrackedSaveOperation(`正在打开另存为窗口（${options.filename}）…`, async () => {
  const rememberedDirectory = readRememberedNativeExportDirectory();
  const selectPromise = fetch(apiPath(NATIVE_EXPORT_SELECT_PATH), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: options.filename,
      description: options.description,
      extensions: options.extensions,
      startIn: options.startIn,
      ...(rememberedDirectory ? { initialDirectory: rememberedDirectory } : {}),
      title: "另存为"
    })
  });
  const bytesPromise = Promise.resolve().then(loadBytes);
  void bytesPromise.catch(() => undefined);

  const fallbackToBrowserDownload = async (message: string) => {
    updateExportProgress("writing", `正在生成导出文件（${options.filename}）…`);
    const bytes = await bytesPromise;
    options.onSaveTargetReady?.();
    if (message) {
      showGlobalMessage(message);
    }
    downloadFallback(bytes);
    return true;
  };

  let selectResponse: Response;
  try {
    selectResponse = await selectPromise;
  } catch {
    return fallbackToBrowserDownload("本地快速保存服务不可用，已改为浏览器下载。");
  }
  if (selectResponse.status === 501) {
    // 后端明确不支持本机原生弹窗（如非交互桌面 / 非 Windows），记录会话缓存并无缝切换至浏览器原生保存
    nativeExportDialogUnsupported = true;
    return saveBytesWithBrowserPickerOrDownload(options, bytesPromise, downloadFallback);
  }
  if (!selectResponse.ok) {
    const message = await responseErrorMessage(selectResponse, "本地快速保存服务不可用，已改为浏览器下载。");
    return fallbackToBrowserDownload(`${message}\n已改为浏览器下载。`);
  }
  const selection = await selectResponse.json() as {
    cancelled?: boolean;
    token?: string;
    filename?: string;
    directory?: string;
  };
  if (selection.cancelled) {
    return false;
  }
  const token = String(selection.token ?? "").trim();
  if (!token) {
    return fallbackToBrowserDownload("本地快速保存没有返回有效目标，已改为浏览器下载。");
  }
  rememberNativeExportDirectory(selection.directory);

  // 计时起点：用户选完路径这一刻（不把选择器停留时间算进「总耗时」）
  options.onSaveTargetReady?.();
  const targetLabel = String(selection.filename ?? options.filename).trim() || options.filename;
  updateExportProgress("writing", `正在生成并导出 ${targetLabel}…`);
  const bytes = await bytesPromise;
  let writeResponse: Response;
  try {
    writeResponse = await fetch(`${apiPath(NATIVE_EXPORT_WRITE_PATH)}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": options.mime },
      body: bytes as unknown as BodyInit
    });
  } catch {
    showGlobalMessage("写入导出文件失败，已改为浏览器下载。");
    downloadFallback(bytes);
    return true;
  }
  if (!writeResponse.ok) {
    const message = await responseErrorMessage(writeResponse, "写入导出文件失败。");
    showGlobalMessage(`${message}\n已改为浏览器下载。`);
    downloadFallback(bytes);
    return true;
  }
  // 必须 await：调用方（导出工厂）在 saveXxx 返回后**同步**读它自己那个 savedFile 变量，
  // 据此决定弹框里给不给【查看】。不 await 的话 onSaved 落在后面的微任务里，读到的还是 null。
  await notifySavedExportFile(options.onSaved, writeResponse, options.filename);
  return true;
  });
}

/** 写盘响应里的 viewToken 是「查看」的唯一凭据；缺/旧字段一律不提示可查看。 */
async function notifySavedExportFile(
  onSaved: ((file: SavedExportFile) => void) | undefined,
  writeResponse: Response,
  fallbackFilename: string
) {
  if (!onSaved) {
    return;
  }
  let payload: { viewToken?: unknown; filename?: unknown; path?: unknown } | null = null;
  try {
    payload = await writeResponse.json() as { viewToken?: unknown; filename?: unknown; path?: unknown } | null;
  } catch {
    payload = null;
  }
  const token = String(payload?.viewToken ?? "").trim();
  if (!token) {
    return;
  }
  onSaved({
    token,
    filename: String(payload?.filename ?? fallbackFilename),
    path: String(payload?.path ?? "")
  });
}

export async function saveTextFile(options: TextSaveOptions): Promise<boolean> {
  if (canUseNativeExportDialog(options)) {
    return saveLazyTextFile({
      ...options,
      loadText: () => options.text
    });
  }
  let saveTargetReady = false;
  const notifySaveTargetReady = () => {
    if (saveTargetReady) {
      return;
    }
    saveTargetReady = true;
    options.onSaveTargetReady?.();
  };
  const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
  if (typeof picker !== "function") {
    notifySaveTargetReady();
    downloadText(options.filename, options.text, options.mime, options.encoding);
    return true;
  }
  try {
    const handle = await picker.call(window, {
      // Chromium uses this id to reopen the save dialog in the last directory used for this export purpose.
      id: options.pickerId ?? EXPORT_SAVE_PICKER_ID,
      suggestedName: options.filename,
      ...(options.startIn ? { startIn: options.startIn } : {}),
      types: [
        {
          description: options.description,
          accept: {
            [options.mime]: options.extensions
          }
        }
      ],
      excludeAcceptAllOption: false
    });
    notifySaveTargetReady();
    const writable = await handle.createWritable();
    await writable.write(encodeTextAsBytes(options.text, options.encoding) as unknown as Blob);
    await writable.close();
    return true;
  } catch (error) {
    if (isPickerAbort(error)) {
      return false;
    }
    showGlobalMessage("保存文件失败，已改为浏览器下载。");
    downloadText(options.filename, options.text, options.mime, options.encoding);
    return true;
  }
}

/**
 * 降级保存时取文本：加载器可能**再失败一次**。
 *
 * 外层那两处 catch 的全部意义是「打开保存窗口出了岔子也照样把文件存下来」；但在 catch 里
 * 裸 `await` 同一个加载器，加载器第二次抛错时整个 `saveLazyTextFile` 就 reject ——
 * 一次失败的生成会让用户既拿不到文件、又看不到任何提示，降级意图彻底落空。
 *
 * 兜底值取空串，与本函数里已有的 `textPromise.catch(() => undefined)` 同口径：
 * `undefined` 传到编码器会经 `TextEncoder.encode()` 的可选参数默认成 `""`（空文件），
 * 这里直接写 `""` 是为了连 GBK 分支一起安全 —— `encodeGbk()` 要迭代字符串，
 * 收到 `undefined` 会抛 `TypeError: undefined is not iterable`，等于把拒绝从 catch 里
 * 又漏到了外面。
 */
async function loadTextForFallbackSave(load: () => Promise<string> | string): Promise<string> {
  try {
    return await load();
  } catch {
    return "";
  }
}

export async function saveLazyTextFile(options: LazyTextSaveOptions): Promise<boolean> {
  let saveTargetReady = false;
  const notifySaveTargetReady = () => {
    if (saveTargetReady) {
      return;
    }
    saveTargetReady = true;
    options.onSaveTargetReady?.();
  };
  if (canUseNativeExportDialog(options)) {
    return saveFileWithNativeDialog(
      { ...options, onSaveTargetReady: notifySaveTargetReady },
      async () => encodeTextAsBytes(await options.loadText(), options.encoding),
      (bytes) => downloadBytes(options.filename, bytes, options.mime)
    );
  }
  const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
  if (typeof picker !== "function") {
    notifySaveTargetReady();
    downloadText(options.filename, await options.loadText(), options.mime, options.encoding);
    return true;
  }

  let handlePromise: ReturnType<NonNullable<SaveFilePickerWindow["showSaveFilePicker"]>>;
  try {
    // Keep this call inside the pointer/click activation stack. E text generation starts immediately
    // afterwards and runs while the user is choosing the save target.
    handlePromise = picker.call(window, {
      id: options.pickerId ?? EXPORT_SAVE_PICKER_ID,
      suggestedName: options.filename,
      ...(options.startIn ? { startIn: options.startIn } : {}),
      types: [
        {
          description: options.description,
          accept: {
            [options.mime]: options.extensions
          }
        }
      ],
      excludeAcceptAllOption: false
    });
  } catch (error) {
    notifySaveTargetReady();
    const text = await loadTextForFallbackSave(options.loadText);
    showGlobalMessage("打开保存窗口失败，已改为浏览器下载。");
    downloadText(options.filename, text, options.mime, options.encoding);
    return true;
  }

  const textPromise = Promise.resolve().then(options.loadText);
  // The picker can remain open after generation finishes. Attach a rejection handler now so a
  // generation failure does not become an unhandled rejection while waiting for the user.
  void textPromise.catch(() => undefined);

  let handle: Awaited<typeof handlePromise>;
  try {
    handle = await handlePromise;
  } catch (error) {
    if (isPickerAbort(error)) {
      return false;
    }
    notifySaveTargetReady();
    // 用 textPromise（已记忆化的那个）而不是 options.loadText：这条路**不能**再调一次加载器。
    const text = await loadTextForFallbackSave(() => textPromise);
    showGlobalMessage("打开保存窗口失败，已改为浏览器下载。");
    downloadText(options.filename, text, options.mime, options.encoding);
    return true;
  }

  notifySaveTargetReady();
  const text = await textPromise;
  try {
    const writable = await handle.createWritable();
    await writable.write(encodeTextAsBytes(text, options.encoding) as unknown as Blob);
    await writable.close();
    return true;
  } catch (error) {
    if (isPickerAbort(error)) {
      return false;
    }
    notifySaveTargetReady();
    showGlobalMessage("保存文件失败，已改为浏览器下载。");
    downloadText(options.filename, text, options.mime, options.encoding);
    return true;
  }
}

export async function saveBlobFile(options: BlobSaveOptions): Promise<boolean> {
  return saveLazyBlobFile({
    filename: options.filename,
    mime: options.mime,
    description: options.description,
    extensions: options.extensions,
    pickerId: options.pickerId,
    startIn: options.startIn,
    preferNativeDialog: options.preferNativeDialog,
    onSaved: options.onSaved,
    loadBlob: async () => options.blob
  });
}

export async function saveLazyBlobFile(options: LazyBlobSaveOptions): Promise<boolean> {
  if (canUseNativeExportDialog(options)) {
    // 二进制同样走本机另存为：后端按原始字节落盘（不解析 content-type），
    // 换来与文本导出同源的「查看」能力（ZIP 用系统默认解压器打开）。
    return saveFileWithNativeDialog(
      options,
      async () => new Uint8Array(await (await options.loadBlob()).arrayBuffer()),
      (bytes) => downloadBytes(options.filename, bytes, options.mime)
    );
  }
  const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
  if (typeof picker !== "function") {
    downloadBlob(options.filename, await options.loadBlob());
    return true;
  }
  let handle: Awaited<ReturnType<NonNullable<SaveFilePickerWindow["showSaveFilePicker"]>>>;
  try {
    handle = await picker.call(window, {
      id: options.pickerId ?? EXPORT_SAVE_PICKER_ID,
      suggestedName: options.filename,
      ...(options.startIn ? { startIn: options.startIn } : {}),
      types: [
        {
          description: options.description,
          accept: {
            [options.mime]: options.extensions
          }
        }
      ],
      excludeAcceptAllOption: false
    });
  } catch (error) {
    if (isPickerAbort(error)) {
      return false;
    }
    showGlobalMessage("打开保存窗口失败，已改为浏览器下载。");
    downloadBlob(options.filename, await options.loadBlob());
    return true;
  }
  const blob = await options.loadBlob();
  try {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (error) {
    if (isPickerAbort(error)) {
      return false;
    }
    showGlobalMessage("保存文件失败，已改为浏览器下载。");
    downloadBlob(options.filename, blob);
    return true;
  }
}

export const writeTextFileToDirectory = async (
  directoryHandle: WritableDirectoryHandle,
  filename: string,
  text: string,
  _mime: string,
  encoding: TextFileEncoding = "utf-8"
) => {
  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(encodeTextAsBytes(text, encoding) as unknown as Blob);
  await writable.close();
};
