// 文件下载与保存工具函数

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
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

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    id?: string;
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
    excludeAcceptAllOption?: boolean;
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

type DirectoryFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void> | void;
    close: () => Promise<void> | void;
  }>;
};

export type WritableDirectoryHandle = {
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<DirectoryFileHandle>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
  }) => Promise<WritableDirectoryHandle>;
};

export type TextSaveOptions = {
  filename: string;
  text: string;
  mime: string;
  description: string;
  extensions: string[];
};
export type BlobSaveOptions = {
  filename: string;
  blob: Blob;
  mime: string;
  description: string;
  extensions: string[];
  pickerId?: string;
};
export type LazyBlobSaveOptions = Omit<BlobSaveOptions, "blob"> & {
  loadBlob: () => Promise<Blob>;
};

const EXPORT_SAVE_PICKER_ID = "model-export";

export function isPickerAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function saveTextFile(options: TextSaveOptions): Promise<boolean> {
  const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
  if (typeof picker !== "function") {
    downloadText(options.filename, options.text, options.mime);
    return true;
  }
  try {
    const handle = await picker.call(window, {
      // Chromium uses this id to reopen the save dialog in the last directory used for this export purpose.
      id: EXPORT_SAVE_PICKER_ID,
      suggestedName: options.filename,
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
    const writable = await handle.createWritable();
    await writable.write(new Blob([options.text], { type: options.mime }));
    await writable.close();
    return true;
  } catch (error) {
    if (isPickerAbort(error)) {
      return false;
    }
    window.alert("保存文件失败，已改为浏览器下载。");
    downloadText(options.filename, options.text, options.mime);
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
    loadBlob: async () => options.blob
  });
}

export async function saveLazyBlobFile(options: LazyBlobSaveOptions): Promise<boolean> {
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
    window.alert("打开保存窗口失败，已改为浏览器下载。");
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
    window.alert("保存文件失败，已改为浏览器下载。");
    downloadBlob(options.filename, blob);
    return true;
  }
}

export const writeTextFileToDirectory = async (
  directoryHandle: WritableDirectoryHandle,
  filename: string,
  text: string,
  mime: string
) => {
  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(new Blob([text], { type: mime }));
  await writable.close();
};
