import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { atomicWriteFile } from "../shared/atomicWrite.mjs";

const TARGET_TTL_MS = 10 * 60 * 1000;
// 「查看」令牌比另存为目标活得久：用户导出完可能过一会儿才点开（对拍、贴到文档里）。
// 仍设上界，避免 Map 无限增长 —— 只在用户点过查看/导出时才各增一条。
const VIEW_TARGET_TTL_MS = 60 * 60 * 1000;
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
$initialDirectory = $env:GRAPH_MODEL_EXPORT_INITIAL_DIRECTORY
if (-not ($initialDirectory -and (Test-Path -LiteralPath $initialDirectory -PathType Container))) {
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

function safeInitialDirectory(value) {
  const candidate = String(value ?? "").trim();
  if (!candidate || candidate.length > 4096 || !isAbsolute(candidate)) {
    return "";
  }
  return resolve(candidate);
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
    initialDirectory: safeInitialDirectory(value.initialDirectory),
    defaultExtension: extensions[0].slice(1),
    filter: `${description} (${patterns})|${patterns}|所有文件 (*.*)|*.*`
  };
}

/**
 * PowerShell 单引号字符串字面量：内部的 `'` 必须成对转义。
 * 路径来自另存为对话框（用户自己选的），但仍按「外来输入」处理 —— 提前闭合字面量会让
 * 剩余路径片段被当命令解析。
 */
function powershellSingleQuoted(value) {
  return `'${String(value ?? "").replace(/'/gu, "''")}'`;
}

// 「用系统默认绑定的程序打开」= 让 shell 按文件关联（HKCR）挑程序，
// 与资源管理器里双击同一个文件完全同路。
//
// 走 ProcessStartInfo + UseShellExecute=true，**不**手写 ShellExecuteEx 的 P/Invoke：
// 手写那版在本机实测对每种文件（含 notepad.exe 本身）一律返回 ERROR_ACCESS_DENIED(5)，
// 而 .NET 自己的同一条路径（内部同样是 ShellExecute 语义）正常拉起 —— 也就是说
// 失败来自手写 struct/互操作细节，不是环境不允许。把受支持的 API 放在最前面，
// 少一份结构体布局风险、少一整段 C#。
//
// 为什么不直接 child_process.exec(path)：CreateProcess 只认可执行文件，
// .e / .xml / .zip 一律 ENOENT，拿不到文件关联。
// 为什么不直接 Start-Process -FilePath：它在无关联文件上照样退出 0，把失败吞掉，
// 用户只会看到「点了查看但什么都没发生」，比报错更难排查。
const WINDOWS_OPEN_FILE_SCRIPT_PREFIX = String.raw`
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
`;

/**
 * 组装「用系统默认绑定的工具打开文件」的命令。
 *
 * 脚本经 -EncodedCommand 传递且不经过 shell，路径里的空格 / & / 中文都不会被二次解释。
 * 失败时脚本把自己的话写在 `GRAPH_MODEL_OPEN_ERROR:` 之后 —— PowerShell 自身会往 stderr
 * 吐 CLIXML 噪音，直接取整段 stderr 只会把 XML 甩给用户看。
 */
export function buildSystemDefaultOpenCommand(filePath, platform = process.platform) {
  const target = String(filePath ?? "").trim();
  if (!target) {
    throw new NativeExportSaveError("invalid-path", "没有可打开的文件路径。");
  }
  if (platform === "win32") {
    const script = `${WINDOWS_OPEN_FILE_SCRIPT_PREFIX}
try {
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = ${powershellSingleQuoted(target)}
  # UseShellExecute=true 即 ShellExecute 语义：文件关联交由系统决定
  $startInfo.UseShellExecute = $true
  if ($null -eq [System.Diagnostics.Process]::Start($startInfo)) {
    throw "系统未能打开该文件。"
  }
} catch {
  $reason = $_.Exception
  if ($null -ne $_.Exception.InnerException) { $reason = $_.Exception.InnerException }
  [Console]::Error.Write("GRAPH_MODEL_OPEN_ERROR:" + $reason.Message)
  exit 1
}
[Console]::Out.Write("GRAPH_MODEL_OPEN_OK")
`;
    return {
      command: "powershell.exe",
      // -Sta：与另存为对话框同一口径（ShellExecute 从 STA 线程发起最稳）
      args: ["-NoProfile", "-Sta", "-WindowStyle", "Hidden", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")],
      options: { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 15000, windowsHide: true }
    };
  }
  if (platform === "darwin") {
    return {
      command: "open",
      args: [target],
      options: { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 15000 }
    };
  }
  return {
    command: "xdg-open",
    args: [target],
    options: { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 15000 }
  };
}

/**
 * 打开失败时只取脚本自己写的那一行。
 * PowerShell 会把非成功流序列化成 CLIXML 跟在同一行后面（`<Objs ...>`），
 * 整段端给用户就是一屏 XML —— 截到第一个 `<` 为止（Win32 消息里不会出现尖括号）。
 */
function openFailureDetail(stderr) {
  const line = String(stderr ?? "").split(/\r?\n/u).find((item) => item.startsWith("GRAPH_MODEL_OPEN_ERROR:"));
  if (!line) {
    return "";
  }
  // Win32 消息自带句末标点（如「系统找不到指定的文件。」），这里先去掉再由外面统一补，
  // 否则拼出来是「…文件。。请确认…」
  return line.slice("GRAPH_MODEL_OPEN_ERROR:".length).split("<")[0].trim().replace(/[.。]+$/u, "");
}

/** 用系统默认绑定的工具打开文件（关联程序由操作系统决定，这里不选程序）。 */
export async function openFileWithSystemDefault(filePath, dependencies = {}) {
  const platform = dependencies.platform ?? process.platform;
  const { command, args, options } = buildSystemDefaultOpenCommand(filePath, platform);
  try {
    await execFilePromise(command, args, options, dependencies.execFileImpl ?? execFile);
  } catch (error) {
    const detail = openFailureDetail(error?.stderr);
    throw new NativeExportSaveError(
      "open-failed",
      detail
        ? `未能用默认程序打开文件：${detail}。请确认该文件类型已绑定打开程序。`
        : "未能用默认程序打开文件，请确认该文件类型已绑定打开程序。"
    );
  }
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
    GRAPH_MODEL_EXPORT_START_IN: normalized.startIn,
    GRAPH_MODEL_EXPORT_INITIAL_DIRECTORY: normalized.initialDirectory
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
  // 默认走原子写（审查 D-P1-2）：导出中断不留半写损坏文件；测试仍可注入 writeFileImpl
  const writeFileImpl = dependencies.writeFileImpl ?? atomicWriteFile;
  const openFileImpl = dependencies.openFileImpl
    ?? ((filePath) => openFileWithSystemDefault(filePath, { platform, execFileImpl: dependencies.execFileImpl }));
  const now = dependencies.now ?? Date.now;
  const createToken = dependencies.createToken ?? randomUUID;
  const targets = new Map();
  const viewTargets = new Map();

  const cleanupExpiredTargets = () => {
    const cutoff = now() - TARGET_TTL_MS;
    for (const [token, target] of targets.entries()) {
      if (target.createdAt < cutoff) {
        targets.delete(token);
      }
    }
    const viewCutoff = now() - VIEW_TARGET_TTL_MS;
    for (const [token, target] of viewTargets.entries()) {
      if (target.createdAt < viewCutoff) {
        viewTargets.delete(token);
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
        filename: basename(resolvedPath),
        directory: dirname(resolvedPath)
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
      // 写完即发一枚「查看」令牌：落盘目标是本进程发出去的，后端只需记住写过的路径，
      // 前端不必（也不能）回传任意路径来让本机打开文件。
      const viewToken = createToken();
      viewTargets.set(viewToken, { path: target.path, createdAt: now() });
      return {
        filename: basename(target.path),
        path: target.path,
        bytes: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(String(data ?? ""), "utf8"),
        viewToken,
        writeDurationMs: performance.now() - startedAt
      };
    },

    /**
     * 用系统默认绑定的程序打开此前写出的导出文件。
     * 令牌在 TTL 内可重复使用（用户要来回对拍），过期/从未签发一律 404。
     */
    async openWrittenFile(token) {
      cleanupExpiredTargets();
      const normalizedToken = String(token ?? "").trim();
      const view = viewTargets.get(normalizedToken);
      if (!view) {
        throw new NativeExportSaveError("invalid-token", "导出文件记录已失效，请重新导出后再查看。");
      }
      // 令牌只证明「本进程写过这个路径」，不证明文件此刻还在（用户可能挪走/删了）。
      if (!existsSync(view.path)) {
        throw new NativeExportSaveError("open-failed", `文件已不存在：${view.path}`);
      }
      await openFileImpl(view.path);
      return { filename: basename(view.path), path: view.path };
    }
  };
}
