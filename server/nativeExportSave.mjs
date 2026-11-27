import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline";
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

    [DllImport("user32.dll")]
    private static extern IntPtr GetProcessWindowStation();

    [DllImport("user32.dll")]
    private static extern IntPtr GetThreadDesktop(uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool GetUserObjectInformation(
        IntPtr hObj,
        int nIndex,
        StringBuilder pvInfo,
        uint nLength,
        out uint lpnLengthNeeded
    );

    private static string GetUserObjectName(IntPtr handle)
    {
        if (handle == IntPtr.Zero)
        {
            return "";
        }
        StringBuilder name = new StringBuilder(256);
        uint needed = 0;
        if (!GetUserObjectInformation(handle, 2, name, (uint)(name.Capacity * 2), out needed))
        {
            return "";
        }
        return name.ToString();
    }

    public static bool IsInteractiveDefaultDesktop(uint threadId)
    {
        if (!Environment.UserInteractive)
        {
            return false;
        }
        string winsta = GetUserObjectName(GetProcessWindowStation());
        string desktop = GetUserObjectName(GetThreadDesktop(threadId));
        return string.Equals(winsta, "WinSta0", StringComparison.OrdinalIgnoreCase)
            && string.Equals(desktop, "Default", StringComparison.OrdinalIgnoreCase);
    }

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
if (-not [NativeDialogPromoter]::IsInteractiveDefaultDesktop($dialogThreadId)) {
  [Console]::Write("UNAVAILABLE")
  exit 0
}
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

// 常驻 Windows STA 对话框与文件打开宿主脚本：
// 服务启动后一次性完成 System.Windows.Forms 程序集加载与 NativeDialogPromoter C# 编译（消除每次点击导出 4.8~5.4 秒的冷启动开销），
// 随后通过 stdin/stdout 单行 JSON 协议串行响应另存为弹窗（saveDialog）、默认程序打开（openFile）与健康探测（ping）。
const WINDOWS_PERSISTENT_DIALOG_WORKER_SCRIPT = String.raw`
$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
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

    [DllImport("user32.dll")]
    private static extern IntPtr GetProcessWindowStation();

    [DllImport("user32.dll")]
    private static extern IntPtr GetThreadDesktop(uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool GetUserObjectInformation(
        IntPtr hObj,
        int nIndex,
        StringBuilder pvInfo,
        uint nLength,
        out uint lpnLengthNeeded
    );

    private static string GetUserObjectName(IntPtr handle)
    {
        if (handle == IntPtr.Zero)
        {
            return "";
        }
        StringBuilder name = new StringBuilder(256);
        uint needed = 0;
        if (!GetUserObjectInformation(handle, 2, name, (uint)(name.Capacity * 2), out needed))
        {
            return "";
        }
        return name.ToString();
    }

    public static bool IsInteractiveDefaultDesktop(uint threadId)
    {
        if (!Environment.UserInteractive)
        {
            return false;
        }
        string winsta = GetUserObjectName(GetProcessWindowStation());
        string desktop = GetUserObjectName(GetThreadDesktop(threadId));
        return string.Equals(winsta, "WinSta0", StringComparison.OrdinalIgnoreCase)
            && string.Equals(desktop, "Default", StringComparison.OrdinalIgnoreCase);
    }

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

$dialogThreadId = [NativeDialogPromoter]::GetCurrentThreadId()
if (-not [NativeDialogPromoter]::IsInteractiveDefaultDesktop($dialogThreadId)) {
  [Console]::Out.WriteLine('{"type":"ready","interactive":false}')
  [Console]::Out.Flush()
  exit 0
}
[Console]::Out.WriteLine('{"type":"ready","interactive":true}')
[Console]::Out.Flush()
# 预热 JSON 编解码 cmdlet JIT，将首次实际请求的解析开销从 ~350ms 降至 ~1ms
$null = '{"id":"0"}' | ConvertFrom-Json
$null = @{ id = "0"; ok = $true } | ConvertTo-Json -Compress

while ($null -ne ($line = [Console]::In.ReadLine())) {
  if ([string]::IsNullOrWhiteSpace($line)) {
    continue
  }
  $reqId = ""
  try {
    $req = $line | ConvertFrom-Json
    $reqId = [string]$req.id
    $cmd = [string]$req.cmd
    if ($cmd -eq "ping") {
      $resp = @{ id = $reqId; ok = $true; pong = $true } | ConvertTo-Json -Compress
      [Console]::Out.WriteLine($resp)
      [Console]::Out.Flush()
      continue
    }
    if ($cmd -eq "saveDialog") {
      $dialog = New-Object System.Windows.Forms.SaveFileDialog
      try {
        $dialog.Title = [string]$req.title
        $dialog.FileName = [string]$req.filename
        $dialog.Filter = [string]$req.filter
        $dialog.DefaultExt = [string]$req.defaultExtension
        $dialog.AddExtension = $true
        $dialog.OverwritePrompt = $true
        $dialog.RestoreDirectory = $true
        $initialDirectory = [string]$req.initialDirectory
        if (-not ($initialDirectory -and (Test-Path -LiteralPath $initialDirectory -PathType Container))) {
          $startIn = [string]$req.startIn
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
        [NativeDialogPromoter]::PromoteNextDialog($dialogThreadId, 10000)
        $result = $dialog.ShowDialog()
        if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
          $resp = @{ id = $reqId; ok = $true; cancelled = $false; path = [string]$dialog.FileName } | ConvertTo-Json -Compress
        } else {
          $resp = @{ id = $reqId; ok = $true; cancelled = $true } | ConvertTo-Json -Compress
        }
        [Console]::Out.WriteLine($resp)
        [Console]::Out.Flush()
      } finally {
        $dialog.Dispose()
      }
      continue
    }
    if ($cmd -eq "openFile") {
      try {
        $startInfo = New-Object System.Diagnostics.ProcessStartInfo
        $startInfo.FileName = [string]$req.path
        $startInfo.UseShellExecute = $true
        if ($null -eq [System.Diagnostics.Process]::Start($startInfo)) {
          throw "系统未能打开该文件。"
        }
        $resp = @{ id = $reqId; ok = $true } | ConvertTo-Json -Compress
      } catch {
        $reason = $_.Exception
        if ($null -ne $_.Exception.InnerException) { $reason = $_.Exception.InnerException }
        $resp = @{ id = $reqId; ok = $false; error = [string]$reason.Message } | ConvertTo-Json -Compress
      }
      [Console]::Out.WriteLine($resp)
      [Console]::Out.Flush()
      continue
    }
    $unknownResp = @{ id = $reqId; ok = $false; error = "未知指令: $cmd" } | ConvertTo-Json -Compress
    [Console]::Out.WriteLine($unknownResp)
    [Console]::Out.Flush()
  } catch {
    $errResp = @{ id = $reqId; ok = $false; error = [string]$_.Exception.Message } | ConvertTo-Json -Compress
    [Console]::Out.WriteLine($errResp)
    [Console]::Out.Flush()
  }
}
`;
const encodedPersistentWorkerScript = Buffer.from(WINDOWS_PERSISTENT_DIALOG_WORKER_SCRIPT, "utf16le").toString("base64");
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
        windowsHide: true,
        ...(dependencies.signal ? { signal: dependencies.signal } : {})
      },
      dependencies.execFileImpl
    ));
  } catch (error) {
    if (error?.name === "AbortError" || error?.code === "ABORT_ERR" || dependencies.signal?.aborted) {
      return null;
    }
    const detail = String(error?.stderr ?? "").trim();
    throw new NativeExportSaveError(
      "dialog-failed",
      detail ? `打开系统另存为窗口失败：${detail}` : "打开系统另存为窗口失败。"
    );
  }
  const encodedPath = stdout.trim();
  if (encodedPath === "UNAVAILABLE") {
    throw new NativeExportSaveError("unsupported", "当前运行环境不在交互式桌面，不支持本地快速另存为。");
  }
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

export function createPersistentWindowsDialogWorker(dependencies = {}) {
  const spawnImpl = dependencies.spawnImpl ?? spawn;
  let child = null;
  let readlineInterface = null;
  let readyPromise = null;
  let pendingRequest = null;
  let queue = Promise.resolve();
  let disposed = false;
  let interactiveUnsupported = false;
  let requestSeq = 0;

  const setIdleRefState = (active) => {
    if (!child) {
      return;
    }
    if (active) {
      child.ref?.();
      child.stdout?.ref?.();
      child.stderr?.ref?.();
    } else {
      child.unref?.();
      child.stdout?.unref?.();
      child.stderr?.unref?.();
    }
  };

  const cleanupCurrentChild = (reasonError) => {
    const activePending = pendingRequest;
    const currentChild = child;
    const currentReadline = readlineInterface;
    pendingRequest = null;
    child = null;
    readlineInterface = null;
    readyPromise = null;
    if (currentReadline) {
      try {
        currentReadline.close();
      } catch {
        // ignore readline cleanup errors
      }
    }
    if (currentChild) {
      try {
        currentChild.stdin?.end();
      } catch {
        // ignore stdin close errors
      }
      try {
        currentChild.kill();
      } catch {
        // ignore process kill errors
      }
    }
    if (activePending) {
      activePending.reject(reasonError ?? new Error("常驻另存为宿主进程已退出。"));
    }
  };

  const ensureReady = () => {
    if (disposed) {
      return Promise.reject(new NativeExportSaveError("dialog-failed", "另存为服务已关闭。"));
    }
    if (interactiveUnsupported) {
      return Promise.reject(
        new NativeExportSaveError("unsupported", "当前运行环境不在交互式桌面，不支持本地快速另存为。")
      );
    }
    if (readyPromise) {
      return readyPromise;
    }
    readyPromise = new Promise((resolveReady, rejectReady) => {
      let settledReady = false;
      let stderrText = "";
      let spawned;
      try {
        spawned = spawnImpl(
          "powershell.exe",
          ["-NoProfile", "-Sta", "-WindowStyle", "Hidden", "-EncodedCommand", encodedPersistentWorkerScript],
          {
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true
          }
        );
      } catch (error) {
        readyPromise = null;
        rejectReady(error);
        return;
      }
      child = spawned;
      // 启动握手阶段保持 ref，待收到 ready 且无挂起请求后再转入空闲 unref
      setIdleRefState(true);

      spawned.stderr?.setEncoding?.("utf8");
      spawned.stderr?.on?.("data", (chunk) => {
        if (stderrText.length < 4096) {
          stderrText += String(chunk ?? "");
        }
      });

      const rl = createInterface({ input: spawned.stdout, crlfDelay: Infinity });
      readlineInterface = rl;

      rl.on("line", (rawLine) => {
        const trimmed = String(rawLine ?? "").trim();
        if (!trimmed) {
          return;
        }
        let message;
        try {
          message = JSON.parse(trimmed);
        } catch {
          return;
        }
        if (!settledReady && message?.type === "ready") {
          settledReady = true;
          if (!message.interactive) {
            interactiveUnsupported = true;
            cleanupCurrentChild();
            rejectReady(
              new NativeExportSaveError("unsupported", "当前运行环境不在交互式桌面，不支持本地快速另存为。")
            );
            return;
          }
          if (!pendingRequest) {
            setIdleRefState(false);
          }
          resolveReady();
          return;
        }
        if (pendingRequest && String(message?.id ?? "") === pendingRequest.id) {
          const current = pendingRequest;
          pendingRequest = null;
          current.resolve(message);
        }
      });

      const handleExitOrError = (err) => {
        if (child !== spawned) {
          return;
        }
        const detail = stderrText.trim();
        const failure = err instanceof Error
          ? err
          : new Error(detail || "常驻另存为宿主进程意外退出。");
        if (!settledReady) {
          settledReady = true;
          cleanupCurrentChild();
          rejectReady(failure);
          return;
        }
        cleanupCurrentChild(failure);
      };

      spawned.once("error", handleExitOrError);
      spawned.once("close", () => handleExitOrError());
    });
    return readyPromise;
  };

  const sendCommand = (cmd, payload = {}, requestOptions = {}) => {
    const run = async () => {
      const signal = requestOptions?.signal;
      if (signal?.aborted) {
        return { ok: true, cancelled: true, aborted: true };
      }
      await ensureReady();
      if (signal?.aborted) {
        return { ok: true, cancelled: true, aborted: true };
      }
      const id = String(++requestSeq);
      setIdleRefState(true);
      try {
        return await new Promise((resolveReq, rejectReq) => {
          let aborted = false;
          const onAbort = () => {
            aborted = true;
            pendingRequest = null;
            cleanupCurrentChild();
            // 客户端取消或刷新页面杀掉旧对话框后，后台立即静默预热新宿主进程，保证下次点击依旧瞬弹
            if (!disposed && !interactiveUnsupported) {
              void ensureReady().catch(() => undefined);
            }
            resolveReq({ ok: true, cancelled: true, aborted: true });
          };
          if (signal) {
            signal.addEventListener("abort", onAbort, { once: true });
          }
          pendingRequest = {
            id,
            resolve: (msg) => {
              if (signal) {
                signal.removeEventListener("abort", onAbort);
              }
              if (!aborted) {
                resolveReq(msg);
              }
            },
            reject: (err) => {
              if (signal) {
                signal.removeEventListener("abort", onAbort);
              }
              if (!aborted) {
                rejectReq(err);
              }
            }
          };
          try {
            child.stdin.write(`${JSON.stringify({ id, cmd, ...payload })}\n`, "utf8");
          } catch (writeError) {
            if (signal) {
              signal.removeEventListener("abort", onAbort);
            }
            pendingRequest = null;
            cleanupCurrentChild();
            rejectReq(writeError);
          }
        });
      } finally {
        setIdleRefState(false);
      }
    };
    const resultPromise = queue.then(run, run);
    queue = resultPromise.then(() => undefined, () => undefined);
    return resultPromise;
  };

  return {
    warmup() {
      if (disposed || interactiveUnsupported) {
        return Promise.resolve(false);
      }
      return ensureReady().then(() => true, () => false);
    },
    async ping() {
      const startedAt = performance.now();
      const response = await sendCommand("ping");
      return { ok: Boolean(response?.ok && response?.pong), elapsedMs: performance.now() - startedAt };
    },
    async chooseSaveFile(normalizedOptions, requestOptions = {}) {
      let response;
      try {
        response = await sendCommand("saveDialog", normalizedOptions, requestOptions);
      } catch (error) {
        if (error instanceof NativeExportSaveError) {
          throw error;
        }
        const detail = String(error?.message ?? "").trim();
        throw new NativeExportSaveError(
          "dialog-failed",
          detail ? `打开系统另存为窗口失败：${detail}` : "打开系统另存为窗口失败。"
        );
      }
      if (response?.aborted || response?.cancelled) {
        return null;
      }
      if (!response?.ok) {
        const detail = String(response?.error ?? "").trim();
        throw new NativeExportSaveError(
          "dialog-failed",
          detail ? `打开系统另存为窗口失败：${detail}` : "打开系统另存为窗口失败。"
        );
      }
      const selectedPath = String(response?.path ?? "").trim();
      if (!selectedPath) {
        throw new NativeExportSaveError("dialog-failed", "系统另存为窗口没有返回有效文件路径。");
      }
      return resolve(selectedPath);
    },
    async openFile(filePath) {
      const target = String(filePath ?? "").trim();
      if (!target) {
        throw new NativeExportSaveError("invalid-path", "没有可打开的文件路径。");
      }
      let response;
      try {
        response = await sendCommand("openFile", { path: target });
      } catch (error) {
        if (error instanceof NativeExportSaveError) {
          throw error;
        }
        throw new NativeExportSaveError("open-failed", "未能用默认程序打开文件，请确认该文件类型已绑定打开程序。");
      }
      if (!response?.ok) {
        const detail = String(response?.error ?? "").split("<")[0].trim().replace(/[.。]+$/u, "");
        throw new NativeExportSaveError(
          "open-failed",
          detail
            ? `未能用默认程序打开文件：${detail}。请确认该文件类型已绑定打开程序。`
            : "未能用默认程序打开文件，请确认该文件类型已绑定打开程序。"
        );
      }
    },
    dispose() {
      disposed = true;
      cleanupCurrentChild(new Error("另存为服务已关闭。"));
    }
  };
}

function stripKnownBundleExtension(filename, allowedExtensions) {
  const raw = String(filename ?? "").trim();
  const lower = raw.toLowerCase();
  for (const ext of allowedExtensions) {
    if (ext && lower.endsWith(ext.toLowerCase()) && raw.length > ext.length) {
      return raw.slice(0, raw.length - ext.length).replace(/[. ]+$/gu, "");
    }
  }
  return raw.replace(/[. ]+$/gu, "");
}

export function createNativeExportSaveService(dependencies = {}) {
  const platform = dependencies.platform ?? process.platform;
  const canUsePersistentWorker =
    platform === "win32"
    && dependencies.usePersistentWorker !== false
    && !dependencies.chooseFile
    && !dependencies.execFileImpl;
  const persistentWorker = canUsePersistentWorker
    ? createPersistentWindowsDialogWorker({ spawnImpl: dependencies.spawnImpl })
    : null;
  const chooseFile = dependencies.chooseFile
    ?? (persistentWorker
      ? (options, requestOptions) => persistentWorker.chooseSaveFile(options, requestOptions)
      : (options, requestOptions) => showWindowsSaveFileDialog(options, {
          platform,
          signal: requestOptions?.signal,
          execFileImpl: dependencies.execFileImpl
        }));
  // 默认走原子写（审查 D-P1-2）：导出中断不留半写损坏文件；测试仍可注入 writeFileImpl
  const writeFileImpl = dependencies.writeFileImpl ?? atomicWriteFile;
  const openFileImpl = dependencies.openFileImpl
    ?? (persistentWorker && !dependencies.openFileImpl
      ? (filePath) => persistentWorker.openFile(filePath)
      : (filePath) => openFileWithSystemDefault(filePath, { platform, execFileImpl: dependencies.execFileImpl }));
  // 路径探测走异步 fs：openWrittenFile 在 HTTP 请求路径上，同步 existsSync 会阻塞事件循环。
  // 测试仍可注入 accessImpl（与 writeFileImpl / openFileImpl 同一派发注入风格）
  const accessImpl = dependencies.accessImpl ?? access;
  const now = dependencies.now ?? Date.now;
  const createToken = dependencies.createToken ?? randomUUID;
  const targets = new Map();
  const viewTargets = new Map();
  // 当前服务端进程若探测到不在交互主桌面（WinSta0\Default），进程生命周期内桌面不会切换，
  // 缓存该结论避免后续每次导出都重复拉起 PowerShell 子进程。
  let desktopDialogUnsupported = false;

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
    warmup() {
      if (platform !== "win32" || desktopDialogUnsupported || !persistentWorker) {
        return Promise.resolve(false);
      }
      return persistentWorker.warmup();
    },

    pingWorker() {
      if (!persistentWorker) {
        return Promise.resolve({ ok: false, elapsedMs: 0 });
      }
      return persistentWorker.ping();
    },

    dispose() {
      persistentWorker?.dispose();
    },

    async selectFile(options, requestOptions = {}) {
      if (platform !== "win32" || desktopDialogUnsupported) {
        return { supported: false, cancelled: false };
      }
      cleanupExpiredTargets();
      let selectedPath;
      try {
        selectedPath = await chooseFile(normalizeNativeExportDialogOptions(options), requestOptions);
      } catch (error) {
        if (error instanceof NativeExportSaveError && error.code === "unsupported") {
          desktopDialogUnsupported = true;
          return { supported: false, cancelled: false };
        }
        throw error;
      }
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
     * 组合导出原子写盘：基于一次「另存为」选定的目录与基础文件名，在同目录一次性写出多份同名前缀配套文件（如 .e / .json / .svg）。
     */
    async writeBundle(token, entries) {
      cleanupExpiredTargets();
      const normalizedToken = String(token ?? "").trim();
      const target = targets.get(normalizedToken);
      if (!target) {
        throw new NativeExportSaveError("invalid-token", "另存为目标已失效，请重新选择保存位置。");
      }
      targets.delete(normalizedToken);
      if (!Array.isArray(entries) || entries.length === 0) {
        throw new NativeExportSaveError("bad-bundle", "没有可写入的组合导出文件。");
      }
      const normalizedEntries = entries.map((entry) => {
        const ext = String(entry?.ext ?? "").trim().toLowerCase();
        if (!/^\.[a-z0-9][a-z0-9._-]*$/u.test(ext) || ext.includes("..")) {
          throw new NativeExportSaveError("bad-bundle", `非法的导出文件扩展名：${ext || "(空)"}`);
        }
        const rawData = entry?.data;
        const buffer = Buffer.isBuffer(rawData)
          ? rawData
          : rawData instanceof Uint8Array
            ? Buffer.from(rawData.buffer, rawData.byteOffset, rawData.byteLength)
            : Buffer.from(String(rawData ?? ""), "utf8");
        return { ext, buffer };
      });

      const resolvedDirectory = resolve(dirname(target.path));
      const pickedFilename = basename(target.path);
      const baseName = safeSuggestedName(
        stripKnownBundleExtension(pickedFilename, normalizedEntries.map((item) => item.ext))
      );

      const startedAt = performance.now();
      const writtenFiles = [];
      for (const item of normalizedEntries) {
        const filename = `${baseName}${item.ext}`;
        const filePath = resolve(join(resolvedDirectory, filename));
        if (dirname(filePath) !== resolvedDirectory) {
          throw new NativeExportSaveError("bad-bundle", "导出目标路径越界。");
        }
        await writeFileImpl(filePath, item.buffer);
        writtenFiles.push({
          ext: item.ext,
          filename,
          path: filePath,
          bytes: item.buffer.length
        });
      }

      const primaryWritten = writtenFiles.find((item) => item.ext === ".svg") ?? writtenFiles[0];
      const viewToken = createToken();
      viewTargets.set(viewToken, { path: primaryWritten.path, createdAt: now() });
      return {
        directory: resolvedDirectory,
        baseName,
        files: writtenFiles,
        filename: primaryWritten.filename,
        path: primaryWritten.path,
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
      // 「只有 ENOENT 算不存在」：existsSync 此前对任何失败都返回 false，把 EACCES /
      // EPERM 一律说成「文件已不存在」——那是把「读不到」误报成「不存在」。这里只把
      // ENOENT 降级成 open-failed，其余 IO 失败按真实原因上抛。
      try {
        await accessImpl(view.path);
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw error;
        }
        throw new NativeExportSaveError("open-failed", `文件已不存在：${view.path}`);
      }
      await openFileImpl(view.path);
      return { filename: basename(view.path), path: view.path };
    }
  };
}
