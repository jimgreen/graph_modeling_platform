import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const TARGET_TTL_MS = 10 * 60 * 1000;
const MAX_SUGGESTED_NAME_LENGTH = 240;
const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

const WINDOWS_SAVE_DIALOG_SCRIPT = String.raw`
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Windows.Forms
$dialogPromoterType = @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class NativeDialogPromoter
{
    private delegate bool EnumThreadDelegate(IntPtr hWnd, IntPtr lParam);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    [DllImport("user32.dll")]
    private static extern bool EnumThreadWindows(uint threadId, EnumThreadDelegate callback, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetClassName(IntPtr hWnd, StringBuilder className, int maxCount);

    [DllImport("user32.dll")]
    private static extern bool SetWindowPos(
        IntPtr hWnd,
        IntPtr insertAfter,
        int x,
        int y,
        int width,
        int height,
        uint flags
    );

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool BringWindowToTop(IntPtr hWnd);

    public static void PromoteNextDialog(uint threadId, int timeoutMilliseconds)
    {
        ThreadPool.QueueUserWorkItem(delegate
        {
            DateTime deadline = DateTime.UtcNow.AddMilliseconds(timeoutMilliseconds);
            while (DateTime.UtcNow < deadline)
            {
                IntPtr dialogHandle = IntPtr.Zero;
                EnumThreadWindows(threadId, delegate(IntPtr hWnd, IntPtr lParam)
                {
                    StringBuilder className = new StringBuilder(32);
                    GetClassName(hWnd, className, className.Capacity);
                    if (className.ToString() == "#32770")
                    {
                        dialogHandle = hWnd;
                        return false;
                    }
                    return true;
                }, IntPtr.Zero);

                if (dialogHandle != IntPtr.Zero)
                {
                    IntPtr hwndTopmost = new IntPtr(-1);
                    const uint flags = 0x0001 | 0x0002 | 0x0040;
                    SetWindowPos(dialogHandle, hwndTopmost, 0, 0, 0, 0, flags);
                    BringWindowToTop(dialogHandle);
                    SetForegroundWindow(dialogHandle);
                    return;
                }

                Thread.Sleep(25);
            }
        });
    }
}
"@
Add-Type -TypeDefinition $dialogPromoterType

$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.Title = $env:GRAPH_MODEL_EXPORT_TITLE
$dialog.FileName = $env:GRAPH_MODEL_EXPORT_FILENAME
$dialog.Filter = $env:GRAPH_MODEL_EXPORT_FILTER
$dialog.DefaultExt = $env:GRAPH_MODEL_EXPORT_DEFAULT_EXT
$dialog.AddExtension = $true
$dialog.OverwritePrompt = $true
$dialog.RestoreDirectory = $true
$startIn = $env:GRAPH_MODEL_EXPORT_START_IN
$initialDirectory = switch ($startIn) {
  "desktop" { [Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop) }
  "documents" { [Environment]::GetFolderPath([Environment+SpecialFolder]::MyDocuments) }
  "downloads" { Join-Path $env:USERPROFILE "Downloads" }
  "music" { [Environment]::GetFolderPath([Environment+SpecialFolder]::MyMusic) }
  "pictures" { [Environment]::GetFolderPath([Environment+SpecialFolder]::MyPictures) }
  "videos" { [Environment]::GetFolderPath([Environment+SpecialFolder]::MyVideos) }
  default { "" }
}
if ($initialDirectory -and (Test-Path -LiteralPath $initialDirectory -PathType Container)) {
  $dialog.InitialDirectory = $initialDirectory
}

$dialogThreadId = [NativeDialogPromoter]::GetCurrentThreadId()
[NativeDialogPromoter]::PromoteNextDialog($dialogThreadId, 10000)
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($dialog.FileName)
  [Console]::Write([Convert]::ToBase64String($bytes))
} else {
  [Console]::Write("CANCEL")
}
`;

const encodedWindowsSaveDialogScript = Buffer.from(WINDOWS_SAVE_DIALOG_SCRIPT, "utf16le").toString("base64");
const SAVE_DIALOG_START_IN_VALUES = new Set(["desktop", "documents", "downloads", "music", "pictures", "videos"]);

export class NativeExportSaveError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "NativeExportSaveError";
    this.code = code;
  }
}

function safeSuggestedName(value) {
  const fallback = "model.txt";
  const normalized = basename(String(value ?? "").trim() || fallback)
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/gu, "_")
    .replace(/[. ]+$/gu, "")
    .slice(0, MAX_SUGGESTED_NAME_LENGTH);
  return normalized || fallback;
}

function normalizedExtensions(value) {
  const extensions = Array.isArray(value)
    ? value
        .map((item) => String(item ?? "").trim().toLowerCase())
        .filter((item) => /^\.[a-z0-9][a-z0-9._-]*$/u.test(item))
    : [];
  return extensions.length > 0 ? Array.from(new Set(extensions)) : [".txt"];
}

function safeDescription(value) {
  return String(value ?? "文件").replace(/\|/gu, " ").trim() || "文件";
}

export function normalizeNativeExportDialogOptions(value = {}) {
  const filename = safeSuggestedName(value.filename);
  const extensions = normalizedExtensions(value.extensions);
  const description = safeDescription(value.description);
  const startIn = String(value.startIn ?? "").trim().toLowerCase();
  const patterns = extensions.map((extension) => `*${extension}`).join(";");
  return {
    filename,
    extensions,
    description,
    title: String(value.title ?? "另存为").trim() || "另存为",
    startIn: SAVE_DIALOG_START_IN_VALUES.has(startIn) ? startIn : "",
    defaultExtension: extensions[0].slice(1),
    filter: `${description} (${patterns})|${patterns}|所有文件 (*.*)|*.*`
  };
}

function execFilePromise(command, args, options, execFileImpl = execFile) {
  return new Promise((resolvePromise, reject) => {
    execFileImpl(command, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolvePromise({ stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
    });
  });
}

export async function showWindowsSaveFileDialog(options, dependencies = {}) {
  const platform = dependencies.platform ?? process.platform;
  if (platform !== "win32") {
    throw new NativeExportSaveError("unsupported", "当前操作系统不支持本地快速另存为。");
  }
  const normalized = normalizeNativeExportDialogOptions(options);
  const env = {
    ...process.env,
    ...(dependencies.env ?? {}),
    GRAPH_MODEL_EXPORT_TITLE: normalized.title,
    GRAPH_MODEL_EXPORT_FILENAME: normalized.filename,
    GRAPH_MODEL_EXPORT_FILTER: normalized.filter,
    GRAPH_MODEL_EXPORT_DEFAULT_EXT: normalized.defaultExtension,
    GRAPH_MODEL_EXPORT_START_IN: normalized.startIn
  };
  let stdout;
  try {
    ({ stdout } = await execFilePromise(
      "powershell.exe",
      ["-NoProfile", "-Sta", "-WindowStyle", "Hidden", "-EncodedCommand", encodedWindowsSaveDialogScript],
      {
        encoding: "utf8",
        env,
        maxBuffer: 1024 * 1024,
        windowsHide: true
      },
      dependencies.execFileImpl
    ));
  } catch (error) {
    const detail = String(error?.stderr ?? "").trim();
    throw new NativeExportSaveError(
      "dialog-failed",
      detail ? `打开系统另存为窗口失败：${detail}` : "打开系统另存为窗口失败。"
    );
  }
  const encodedPath = stdout.trim();
  if (encodedPath === "CANCEL") {
    return null;
  }
  let selectedPath = "";
  try {
    selectedPath = Buffer.from(encodedPath, "base64").toString("utf8").trim();
  } catch {
    selectedPath = "";
  }
  if (!selectedPath) {
    throw new NativeExportSaveError("dialog-failed", "系统另存为窗口没有返回有效文件路径。");
  }
  return resolve(selectedPath);
}

export function isAllowedNativeExportOrigin(request) {
  const origin = String(request?.headers?.origin ?? "").trim();
  if (!origin) {
    return true;
  }
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:")
      && LOCAL_HOSTNAMES.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function createNativeExportSaveService(dependencies = {}) {
  const platform = dependencies.platform ?? process.platform;
  const chooseFile = dependencies.chooseFile ?? ((options) => showWindowsSaveFileDialog(options, { platform }));
  const writeFileImpl = dependencies.writeFileImpl ?? writeFile;
  const now = dependencies.now ?? Date.now;
  const createToken = dependencies.createToken ?? randomUUID;
  const targets = new Map();

  const cleanupExpiredTargets = () => {
    const cutoff = now() - TARGET_TTL_MS;
    for (const [token, target] of targets.entries()) {
      if (target.createdAt < cutoff) {
        targets.delete(token);
      }
    }
  };

  return {
    async selectFile(options) {
      if (platform !== "win32") {
        return { supported: false, cancelled: false };
      }
      cleanupExpiredTargets();
      const selectedPath = await chooseFile(normalizeNativeExportDialogOptions(options));
      if (!selectedPath) {
        return { supported: true, cancelled: true };
      }
      const token = createToken();
      const resolvedPath = resolve(String(selectedPath));
      targets.set(token, { path: resolvedPath, createdAt: now() });
      return {
        supported: true,
        cancelled: false,
        token,
        filename: basename(resolvedPath)
      };
    },

    async writeText(token, data) {
      cleanupExpiredTargets();
      const normalizedToken = String(token ?? "").trim();
      const target = targets.get(normalizedToken);
      if (!target) {
        throw new NativeExportSaveError("invalid-token", "另存为目标已失效，请重新选择保存位置。");
      }
      targets.delete(normalizedToken);
      const startedAt = performance.now();
      await writeFileImpl(target.path, data);
      return {
        filename: basename(target.path),
        bytes: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(String(data ?? ""), "utf8"),
        writeDurationMs: performance.now() - startedAt
      };
    }
  };
}
