import { describe, expect, test, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NativeExportSaveError,
  buildSystemDefaultOpenCommand,
  createNativeExportSaveService,
  isAllowedNativeExportOrigin,
  normalizeNativeExportDialogOptions,
  openFileWithSystemDefault,
  showWindowsSaveFileDialog
} from "./nativeExportSave.mjs";

// 静态守卫共用：模块源码在用例外读一次（读文件是真 IO，放顶层只付一次代价）。
const MODULE_SOURCE = readFileSync(
  fileURLToPath(new URL("./nativeExportSave.mjs", import.meta.url)),
  "utf8"
);

// 找出「从裸 node:fs 导入」的语句 —— 同步探测（existsSync）的唯一入口。
// 逐行扫并跳过行注释行，而不是全文正则：这样注释里解释「为什么删掉它」不会误伤，
// 而单双引号两种写法都盖得住（正则里写死 `"node:fs` 会漏掉 `from 'node:fs'`）。
function syncFsImports(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("//"))
    .filter((line) => /\bfrom\s*["']node:fs["']/.test(line));
}

describe("native export save service", () => {
  test("stores a selected target behind a one-use token and writes bytes directly", async () => {
    const writeFileImpl = vi.fn(async () => undefined);
    const selectedPath = resolve("tmp", "模型.e");
    const chooseFile = vi.fn(async () => selectedPath);
    const service = createNativeExportSaveService({
      platform: "win32",
      chooseFile,
      writeFileImpl,
      createToken: (() => {
        let index = 0;
        const suffixes = ["", "view-"];
        return () => {
          const suffix = suffixes[index] ?? "";
          index += 1;
          return `token-${suffix}1`;
        };
      })()
    });

    const selected = await service.selectFile({
      filename: "model.e",
      description: "E 模型文件",
      extensions: [".e"]
    });

    expect(selected).toEqual({
      supported: true,
      cancelled: false,
      token: "token-1",
      filename: "模型.e",
      directory: dirname(selectedPath)
    });

    const data = Buffer.from("<Model/>", "utf8");
    const written = await service.writeText("token-1", data);
    expect(writeFileImpl).toHaveBeenCalledWith(selectedPath, data);
    expect(written.filename).toBe("模型.e");
    expect(written.bytes).toBe(data.length);
    // 写盘成功即发一枚「查看」令牌（另存为目标令牌是一次性的，不能复用）
    expect(written.viewToken).toBe("token-view-1");
    expect(written.path).toBe(selectedPath);

    await expect(service.writeText("token-1", data)).rejects.toMatchObject({
      code: "invalid-token"
    });
  });

  test("reports cancellation and unsupported platforms without creating a token", async () => {
    const cancelledService = createNativeExportSaveService({
      platform: "win32",
      chooseFile: async () => null
    });
    await expect(cancelledService.selectFile({ filename: "model.svg" })).resolves.toEqual({
      supported: true,
      cancelled: true
    });

    const unsupportedService = createNativeExportSaveService({ platform: "linux" });
    await expect(unsupportedService.selectFile({ filename: "model.svg" })).resolves.toEqual({
      supported: false,
      cancelled: false
    });
  });

  test("normalizes unsafe dialog metadata", () => {
    const rememberedDirectory = resolve("tmp", "svg-exports");
    expect(normalizeNativeExportDialogOptions({
      filename: "../bad:name?.svg ",
      description: "SVG|图形",
      extensions: ["svg", ".SVG", ".svg", ".bad ext"],
      startIn: "downloads",
      initialDirectory: rememberedDirectory
    })).toMatchObject({
      filename: "bad_name_.svg",
      extensions: [".svg"],
      description: "SVG 图形",
      startIn: "downloads",
      initialDirectory: rememberedDirectory,
      defaultExtension: "svg"
    });
  });

  test("only accepts local browser origins", () => {
    expect(isAllowedNativeExportOrigin({ headers: {} })).toBe(true);
    expect(isAllowedNativeExportOrigin({ headers: { origin: "http://127.0.0.1:5173" } })).toBe(true);
    expect(isAllowedNativeExportOrigin({ headers: { origin: "http://localhost:5173" } })).toBe(true);
    expect(isAllowedNativeExportOrigin({ headers: { origin: "https://example.com" } })).toBe(false);
  });

  // 上一条只钉了 4 个输入，而这 4 个里 3 个是「通过」、1 个是明显的远程域名。
  // 真正要挡住的是**长得像**本机的那些 —— 一个 `startsWith("127.0.0.1")` 式的
  // 放行实现能通过那 4 条，却会把 `127.0.0.1.evil.com` 放过去。
  describe("本机来源校验的负例（表驱动）", () => {
    const rejected = [
      // 后缀挂载：前缀匹配式实现的经典漏网
      ["http://127.0.0.1.evil.com", "127.0.0.1 后缀挂域名"],
      ["http://localhost.evil.com", "localhost 后缀挂域名"],
      ["http://127.0.0.1@evil.com", "userinfo 伪装"],
      ["http://evil.com#127.0.0.1", "fragment 伪装"],
      // 环回段之外：0.0.0.0 是 unspecified，127.0.0.2 不是 LOCAL_HOSTNAMES 里的字面量
      ["http://0.0.0.0:5173", "unspecified 地址"],
      ["http://127.0.0.2:5173", "环回段内但非字面量 127.0.0.1"],
      ["http://[::2]:5173", "IPv6 环回但非 ::1"],
      ["http://192.168.1.10:5173", "内网地址"],
      // 非 http(s) 协议
      ["file:///C:/Windows/System32", "file 协议"],
      ["ftp://localhost", "ftp 协议"],
      ["javascript:alert(1)", "javascript 伪协议"],
      // 非法 origin 字面量
      ["null", "opaque origin"],
      ["not a url", "非 URL 串"],
      ["http://", "只有协议"],
      ["http://127.0.0.1:99999", "越界端口 ⇒ URL 解析抛错即拒"]
    ];

    for (const [origin, why] of rejected) {
      test(`拒绝：${why} — ${origin}`, () => {
        expect(isAllowedNativeExportOrigin({ headers: { origin } })).toBe(false);
      });
    }

    const accepted = [
      ["http://127.0.0.1:5173", "IPv4 环回"],
      ["https://127.0.0.1:5174", "IPv4 环回 + https"],
      ["http://localhost:5173", "localhost"],
      ["http://LOCALHOST:5173", "大写（hostname 已小写化）"],
      ["http://[::1]:5173", "IPv6 环回"],
      ["http://127.0.0.1", "无端口"],
      ["  http://127.0.0.1:5173  ", "首尾空白先被 trim"]
    ];

    for (const [origin, why] of accepted) {
      test(`放行：${why} — ${origin}`, () => {
        expect(isAllowedNativeExportOrigin({ headers: { origin } })).toBe(true);
      });
    }

    test("origin 头缺失（undefined / null / 空串 / 纯空白）一律判本机", () => {
      for (const headers of [{}, { origin: undefined }, { origin: null }, { origin: "" }, { origin: "   " }]) {
        expect(isAllowedNativeExportOrigin({ headers }), JSON.stringify(headers)).toBe(true);
      }
    });

    test("request 或 headers 整体缺失不抛", () => {
      expect(isAllowedNativeExportOrigin(undefined)).toBe(true);
      expect(isAllowedNativeExportOrigin({})).toBe(true);
    });

    // 变异验证记实情：删掉 `url.hostname.toLowerCase()` 这层，38 条一条不红。
    // 原因是 WHATWG URL 在解析时已把 hostname 小写化（探针：new URL("http://LOCALHOST:5173")
    // 的 hostname 就是 "localhost"），所以 toLowerCase 是冗余防御而非承重逻辑，
    // 绿是正确结果（AGENTS.md「A green mutation is not always a broken test」）。
    // 这条断言留在这儿是为了**记录**该等价性，不是为了咬住变异 ——
    // 真要防住，得改成断言 URL 规范本身，那属于标准库行为、不该由本仓的测试锁。
    test("大写主机名放行靠的是 URL 规范本身的小写化，而非本函数的 toLowerCase", () => {
      expect(new URL("http://LOCALHOST:5173").hostname).toBe("localhost");
      expect(isAllowedNativeExportOrigin({ headers: { origin: "http://LOCALHOST:5173" } })).toBe(true);
    });
  });

  test("promotes the Windows save dialog above the browser window", async () => {
    let encodedCommand = "";
    let commandOptions;
    const execFileImpl = vi.fn((_command, args, options, callback) => {
      encodedCommand = args.at(-1) ?? "";
      commandOptions = options;
      callback(null, "CANCEL", "");
    });

    const rememberedDirectory = resolve("tmp", "svg-exports");

    await expect(showWindowsSaveFileDialog(
      { filename: "model.e", extensions: [".e"], initialDirectory: rememberedDirectory },
      { platform: "win32", execFileImpl }
    )).resolves.toBeNull();

    const script = Buffer.from(encodedCommand, "base64").toString("utf16le");
    expect(script).toContain("PromoteNextDialog");
    expect(script).toContain("IntPtr hwndTopmost = new IntPtr(-1)");
    expect(script).toContain("SetWindowPos(dialogHandle, hwndTopmost");
    expect(script).toContain("$dialog.InitialDirectory = $initialDirectory");
    expect(script).toContain("GRAPH_MODEL_EXPORT_INITIAL_DIRECTORY");
    expect(script).toContain('"downloads" { Join-Path $env:USERPROFILE "Downloads" }');
    expect(script).toContain("$dialog.ShowDialog()");
    expect(commandOptions.env.GRAPH_MODEL_EXPORT_INITIAL_DIRECTORY).toBe(rememberedDirectory);
  });

  test("exposes a typed invalid-token error", () => {
    expect(new NativeExportSaveError("invalid-token", "expired")).toMatchObject({
      name: "NativeExportSaveError",
      code: "invalid-token",
      message: "expired"
    });
  });

  test("opens a written export with the operating system default program", async () => {
    const directory = mkdtempSync(join(tmpdir(), "gmp-open-"));
    const target = join(directory, "模型.e");
    writeFileSync(target, "<Model/>", "utf8");
    const openFileImpl = vi.fn(async () => undefined);
    let clock = 1_000;
    const service = createNativeExportSaveService({
      platform: "win32",
      chooseFile: async () => target,
      writeFileImpl: async (filePath, data) => writeFileSync(filePath, data),
      openFileImpl,
      now: () => clock
    });

    const selected = await service.selectFile({ filename: "模型.e", extensions: [".e"] });
    const written = await service.writeText(selected.token, Buffer.from("<Model/>", "utf8"));

    await expect(service.openWrittenFile(written.viewToken)).resolves.toMatchObject({
      filename: "模型.e",
      path: target
    });
    expect(openFileImpl).toHaveBeenCalledWith(target);

    // 同一枚令牌可重复查看（用户可能要来回对拍），过期后才失效
    await expect(service.openWrittenFile(written.viewToken)).resolves.toBeTruthy();
    clock += 61 * 60 * 1000;
    await expect(service.openWrittenFile(written.viewToken)).rejects.toMatchObject({
      code: "invalid-token"
    });

    rmSync(directory, { recursive: true, force: true });
  });

  test("never opens a path the service did not write itself", async () => {
    const openFileImpl = vi.fn(async () => undefined);
    const service = createNativeExportSaveService({ platform: "win32", openFileImpl });

    // 另存为目标令牌（一次性、只用于写盘）不是查看令牌
    await expect(service.openWrittenFile("whatever-token")).rejects.toMatchObject({
      code: "invalid-token"
    });
    expect(openFileImpl).not.toHaveBeenCalled();
  });

  test("reports a missing file instead of launching a program for it", async () => {
    const openFileImpl = vi.fn(async () => undefined);
    const service = createNativeExportSaveService({
      platform: "win32",
      chooseFile: async () => resolve("tmp", "已删除.e"),
      writeFileImpl: async () => undefined,
      openFileImpl
    });

    const selected = await service.selectFile({ filename: "已删除.e", extensions: [".e"] });
    const written = await service.writeText(selected.token, Buffer.from("x"));

    // 不注入 accessImpl ⇒ 走真实 fs/promises.access，路径确实不存在 ⇒ 真 ENOENT。
    // 这一条必须同时钉住错误**类**与 code：路由把 NativeExportSaveError("open-failed")
    // 翻成 500 + 「文件已不存在」文案，掉成裸 Error 就会改说别的话。
    const failure = await service.openWrittenFile(written.viewToken).then(
      () => null,
      (error) => error
    );
    expect(failure).toBeInstanceOf(NativeExportSaveError);
    expect(failure).toMatchObject({ code: "open-failed" });
    expect(openFileImpl).not.toHaveBeenCalled();
  });

  // ENOENT → open-failed 由上一条 "reports a missing file" 覆盖（它落的是
  // tmp\已删除.e，真不存在 ⇒ 真实 access 抛 ENOENT）。此处只补另一半纪律。
  test("权限类失败不被当成「文件不存在」：按真实原因上抛，且不启动程序", async () => {
    const directory = mkdtempSync(join(tmpdir(), "gmp-open-eacces-"));
    const target = join(directory, "模型.e");
    // 真实落盘：文件**确实存在**。这样「回退成 existsSync」的变异会因
    // existsSync 看不见注入的 EACCES 而走成功路径，测试立刻转红。
    writeFileSync(target, "<Model/>", "utf8");
    const openFileImpl = vi.fn(async () => undefined);
    const denied = Object.assign(
      new Error(`EACCES: permission denied, access '${target}'`),
      { code: "EACCES" }
    );
    const service = createNativeExportSaveService({
      platform: "win32",
      chooseFile: async () => target,
      writeFileImpl: async (filePath, data) => writeFileSync(filePath, data),
      openFileImpl,
      accessImpl: async () => {
        throw denied;
      }
    });

    try {
      const selected = await service.selectFile({ filename: "模型.e", extensions: [".e"] });
      const written = await service.writeText(selected.token, Buffer.from("<Model/>", "utf8"));

      // 原始错误原样上抛：既不是 NativeExportSaveError，也不能被改写成 open-failed
      // （「读不到」说成「不存在」正是本仓要禁的那类错误归因）
      const failure = await service.openWrittenFile(written.viewToken).then(
        () => null,
        (error) => error
      );
      expect(failure).toBe(denied);
      expect(failure).not.toBeInstanceOf(NativeExportSaveError);
      expect(failure?.code).toBe("EACCES");
      expect(openFileImpl).not.toHaveBeenCalled();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  // 契约是「请求路径上不做同步 IO」，输出断言看不见它 —— 换成 existsSync 时
  // 成功路径与失败路径的返回值完全一样，只有事件循环被阻塞。故用静态断言守住。
  test("openWrittenFile 的路径探测不再走同步 fs（别把 existsSync 改回来）", () => {
    const source = MODULE_SOURCE;
    // 同步探测在 ESM 里只有一条入口：从裸 "node:fs" 取 existsSync（没有 require，
    // 也没有动态 import node:fs）。所以「没有这个 import」对「模块里够不着同步探测」
    // 是**完备**的，而不只是「恰好现在没写」。
    expect(syncFsImports(source)).toEqual([]);
    // 探测本身必须是 await 的 —— 存在 import 换掉、调用点却忘了改的中间态，
    // 那种情况下上面一条仍然绿（fs/promises 不算同步），这条才拦得住。
    expect(source).toMatch(/await accessImpl\(view\.path\)/);
  });

  // 守卫自身的检测逻辑自测：断言扫描器真能转红，而不只是「扫过 N 处调用点」。
  // 上面那条守卫全靠它才有意义 —— 扫描器若恒空，它就成了一条恒绿的装饰。
  test("同步 fs 扫描器的自测：认得出裸 import，认不出 fs/promises", () => {
    expect(syncFsImports('import { existsSync } from "node:fs";')).toHaveLength(1);
    expect(syncFsImports("import fs from 'node:fs';")).toHaveLength(1);
    // 精确到引号收尾：fs/promises 是异步 API，不算同步探测
    expect(syncFsImports('import { access } from "node:fs/promises";')).toEqual([]);
    // 注释里提到不算 —— 说明文档必须能自由解释「为什么删掉它」
    expect(syncFsImports('// import { existsSync } from "node:fs";\n')).toEqual([]);
  });

  test("builds the per-platform default-open command without shell re-interpretation", () => {
    // Windows：ProcessStartInfo + UseShellExecute=true（ShellExecute 语义，
    // 按文件关联挑程序 = 双击行为），脚本经 -EncodedCommand 传递，
    // 路径里的空格/&/中文不被二次解释
    const windows = buildSystemDefaultOpenCommand("C:\\导出 目录\\模型&1.e", "win32");
    expect(windows.command).toBe("powershell.exe");
    expect(windows.args).toContain("-EncodedCommand");
    const script = Buffer.from(windows.args.at(-1), "base64").toString("utf16le");
    expect(script).toContain("$startInfo.UseShellExecute = $true");
    expect(script).toContain("[System.Diagnostics.Process]::Start($startInfo)");
    expect(script).toContain("$startInfo.FileName = 'C:\\导出 目录\\模型&1.e'");
    // 手写 ShellExecuteEx 的 P/Invoke 会一律 ACCESS_DENIED，必须不再出现
    expect(script).not.toContain("ShellExecuteEx");
    // 单引号成对转义，否则路径里的撇号会提前闭合字面量
    expect(Buffer.from(buildSystemDefaultOpenCommand("C:\\it's.e", "win32").args.at(-1), "base64")
      .toString("utf16le")).toContain("$startInfo.FileName = 'C:\\it''s.e'");

    expect(buildSystemDefaultOpenCommand("/tmp/model.svg", "darwin")).toMatchObject({
      command: "open",
      args: ["/tmp/model.svg"]
    });
    expect(buildSystemDefaultOpenCommand("/tmp/model.svg", "linux")).toMatchObject({
      command: "xdg-open",
      args: ["/tmp/model.svg"]
    });
    expect(() => buildSystemDefaultOpenCommand("  ", "win32")).toThrowError(/没有可打开的文件路径/);
  });

  // 真跑一次默认打开：上一版手写 ShellExecuteEx 的 P/Invoke 在本机对**每种**文件
  // （连 notepad.exe 本身）都返回 ERROR_ACCESS_DENIED，纯脚本断言看不出这个问题 ——
  // 必须真调一次 API 才能守住。
  //
  // **默认不跑**（需 GRAPH_MODEL_RUN_OPEN_FILE_TEST=1 才跑）：它会在开发者机器上真的
  // 弹出系统默认程序（Notepad3 等），反复跑测试就反复弹，还会在 %TEMP% 留一个删不掉
  // 的 `smoke's & 模型.json`（见下方注释）。这条护栏本身有效、不能删，但有真实副作用
  // 的用例不该混在默认全量里。
  //   GRAPH_MODEL_RUN_OPEN_FILE_TEST=1 pnpm vitest run server/nativeExportSave.test.mjs
  test.runIf(process.platform === "win32" && process.env.GRAPH_MODEL_RUN_OPEN_FILE_TEST === "1")(
    "真的能把文件交给系统默认程序打开（回归：曾恒为 ACCESS_DENIED）",
    async () => {
      const directory = mkdtempSync(join(tmpdir(), "gmp-open-real-"));
      // 名字带 ' & 和中文：顺带证明不触发命令解释
      const target = join(directory, "smoke's & 模型.json");
      writeFileSync(target, JSON.stringify({ ok: true }), "utf8");

      // 有意不删这个目录：Process.Start 一返回就删，删得比 Notepad3 读档早，
      // Notepad3 找不到档便弹「文件未找到。是否创建一个新的文件?」—— 反复跑测试
      // 就反复弹。几十字节的残留交给 %TEMP% 自身回收即可。
      await expect(openFileWithSystemDefault(target, { platform: "win32" })).resolves.toBeUndefined();
    }
  );

  test.runIf(process.platform === "win32")("目标不存在时给出可读原因，而不是 ACCESS_DENIED 这种误导", async () => {
    const directory = mkdtempSync(join(tmpdir(), "gmp-open-miss-"));
    try {
      await expect(openFileWithSystemDefault(join(directory, "gone.json"), { platform: "win32" }))
        .rejects.toMatchObject({ code: "open-failed" });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("open-failed only reports the script's own line, not PowerShell's CLIXML noise", async () => {
    // PowerShell 会把非成功流序列化成 <Objs ...> 跟在同一行后面；直接取整段 stderr
    // 会把一屏 XML 甩给用户。
    const execFileImpl = vi.fn((_command, _args, _options, callback) => {
      callback(new Error("Command failed"), "", "GRAPH_MODEL_OPEN_ERROR:系统找不到文件。<Objs Version=\"1.1\"></Objs>");
    });

    await expect(openFileWithSystemDefault("C:\\gone.e", { platform: "win32", execFileImpl }))
      .rejects.toThrow("未能用默认程序打开文件：系统找不到文件。请确认该文件类型已绑定打开程序。");
  });

  test("open-failed still gives an actionable message when stderr carries nothing useful", async () => {
    const execFileImpl = vi.fn((_command, _args, _options, callback) => {
      callback(new Error("spawn ENOENT"), "", "#< CLIXML\r\n<Objs></Objs>");
    });

    await expect(openFileWithSystemDefault("C:\\gone.e", { platform: "win32", execFileImpl }))
      .rejects.toThrow("未能用默认程序打开文件，请确认该文件类型已绑定打开程序。");
  });

  // 「另存为目标」令牌（targets，TTL 10 分钟）与「查看」令牌（viewTargets，TTL 60 分钟）
  // 是两个各自独立的 Map，各有各的过期判断。此前那条只把时钟推了 61 分钟，
  // 打到的是 viewTargets 那一半；targets 整条链 —— 签发 → 过期 → 被 cleanup 摘掉 →
  // 写入前即被拒 —— 一条断言都没有。
  //
  // 清理判据是 `createdAt < now() - TTL`（严格小于），所以**恰好等于 TTL 的那一刻仍存活**。
  // 这条边界下面单独钉了一次：写成 `<=` 与写成 `<` 只有这一毫秒之差，两种实现对
  // 「提前一毫秒 / 晚一毫秒」的行为完全不同，光测 10 分钟 ± 1 毫秒之外看不出差别。
  describe("两枚令牌的 TTL 各自独立清理", () => {
    const TARGET_TTL_MS = 10 * 60 * 1000;
    const VIEW_TARGET_TTL_MS = 60 * 60 * 1000;

    // 落真文件：openWrittenFile 走 access，假路径会在 TTL 判定之前就以
    // open-failed 挂掉，那样测到的是文件在不在，不是令牌还有效没有。
    function makeHarness() {
      const clock = { value: 1_000_000 };
      const directory = mkdtempSync(join(tmpdir(), "gmp-ttl-"));
      const target = join(directory, "模型.e");
      const writeFileImpl = vi.fn(async (filePath, data) => writeFileSync(filePath, data));
      const openFileImpl = vi.fn(async () => undefined);
      let issued = 0;
      const service = createNativeExportSaveService({
        platform: "win32",
        chooseFile: async () => target,
        writeFileImpl,
        openFileImpl,
        // 服务只在构造时抓一次 now，之后每次调用都读当前值
        now: () => clock.value,
        // 递增：多次 selectFile 必须拿到互不相同的令牌，否则第二次的断言
        // 会被「上一枚已被一次性消费」污染
        createToken: () => {
          issued += 1;
          return `token-${issued}`;
        }
      });
      return {
        clock,
        target,
        service,
        writeFileImpl,
        openFileImpl,
        dispose: () => rmSync(directory, { recursive: true, force: true })
      };
    }

    async function select(harness) {
      return harness.service.selectFile({ filename: "模型.e", extensions: [".e"] });
    }

    test("写目标令牌过了 10 分钟即失效：一次落盘都不会发生", async () => {
      const harness = makeHarness();
      try {
        const data = Buffer.from("<Model/>", "utf8");

        // 先证明这条链路本来是通的（同一服务、同一形状），否则后面的
        // 「没写盘」也可能只是因为令牌从来就不可用
        const live = await select(harness);
        await harness.service.writeText(live.token, data);
        expect(harness.writeFileImpl).toHaveBeenCalledTimes(1);
        expect(harness.writeFileImpl).toHaveBeenCalledWith(harness.target, data);

        // 一枚全新的令牌，签发后停在 TTL 之内 —— 必须仍可写，
        // 这一步同时把「10 分钟」这个时长钉住（TTL 被改短会在这里红）
        harness.clock.value = 5 * 60 * 1000;
        const fresh = await select(harness);
        expect(fresh.token).not.toBe(live.token);
        const freshIssuedAt = harness.clock.value;

        // 越过它自己的 10 分钟
        harness.clock.value = freshIssuedAt + TARGET_TTL_MS + 1;
        await expect(harness.service.writeText(fresh.token, data)).rejects.toMatchObject({
          code: "invalid-token"
        });
        // 被拒的令牌不得有任何写盘副作用（上面那次成功写盘仍是唯一一次）。
        // 注意这条断言与「一次性令牌已被消费」是同一个 code：此处之所以测的是
        // 过期而非消费，靠的是 fresh 这枚令牌自签发起从未被写过。
        expect(harness.writeFileImpl).toHaveBeenCalledTimes(1);
      } finally {
        harness.dispose();
      }
    });

    test("推进到 61 分钟之后，两半令牌都被清理", async () => {
      const harness = makeHarness();
      try {
        const first = await select(harness);
        const written = await harness.service.writeText(first.token, Buffer.from("<Model/>", "utf8"));
        // 一律相对 t0 推时钟：绝对时间与初始基准混用会算出负的「已过时长」，
        // 于是令牌看起来还在未来，失效断言随之恒真/恒假
        const t0 = harness.clock.value;

        // 11 分钟：写目标令牌那一侧早已过期，但查看令牌还活着。
        // 这一步钉住「两个 TTL 不同」—— 若 cleanup 误把 TARGET 的判据套到
        // viewTargets 上（10 分钟 < 11 分钟），会在这里红
        harness.clock.value = t0 + TARGET_TTL_MS + 60 * 1000;
        const alive = await select(harness);
        await expect(harness.service.openWrittenFile(written.viewToken)).resolves.toMatchObject({
          path: harness.target
        });
        await expect(harness.service.writeText(alive.token, Buffer.from("<Model/>", "utf8")))
          .resolves.toMatchObject({ path: harness.target });
        expect(harness.writeFileImpl).toHaveBeenCalledTimes(2);

        // 同一时刻再签一枚**从头到尾不写**的令牌备用。必须留着它：
        // 上面 alive 那枚是一次性的，61 分钟处若拿它去断言失效，得到的
        // 是「早已被消费」而非「已过期」—— 变异 ①（targets 永不清理）照样绿。
        const spare = await select(harness);
        expect(spare.token).not.toBe(alive.token);

        // 远超两个 TTL：spare（此时已 50 分钟、从没写过）与查看令牌（61 分钟）一起失效
        harness.clock.value = t0 + 61 * 60 * 1000;
        await expect(harness.service.writeText(spare.token, Buffer.from("<Model/>", "utf8")))
          .rejects.toMatchObject({ code: "invalid-token" });
        await expect(harness.service.openWrittenFile(written.viewToken))
          .rejects.toMatchObject({ code: "invalid-token" });
        // 失效的查看令牌不得再去启动程序
        expect(harness.openFileImpl).toHaveBeenCalledTimes(1);
        expect(harness.writeFileImpl).toHaveBeenCalledTimes(2);
      } finally {
        harness.dispose();
      }
    });

    test("TTL 之内的两枚令牌都仍然可用（防止把 TTL 改成永不清理也绿）", async () => {
      const harness = makeHarness();
      try {
        const data = Buffer.from("<Model/>", "utf8");
        const selected = await select(harness);
        const t0 = harness.clock.value;

        // 距签发还差 1 毫秒就到期
        harness.clock.value = t0 + TARGET_TTL_MS - 1;
        const written = await harness.service.writeText(selected.token, data);
        expect(harness.writeFileImpl).toHaveBeenCalledWith(harness.target, data);

        // 距查看令牌签发还差 1 毫秒就到期（查看令牌的签发时刻是 writeText 那一刻）
        harness.clock.value = harness.clock.value + VIEW_TARGET_TTL_MS - 1;
        await expect(harness.service.openWrittenFile(written.viewToken))
          .resolves.toMatchObject({ filename: "模型.e", path: harness.target });
        expect(harness.openFileImpl).toHaveBeenCalledWith(harness.target);
      } finally {
        harness.dispose();
      }
    });

    test("写目标令牌的 TTL 边界：恰好等于 TTL 仍可写，晚 1 毫秒即失效", async () => {
      const harness = makeHarness();
      try {
        const data = Buffer.from("<Model/>", "utf8");
        const atBoundary = await select(harness);
        const t0 = harness.clock.value;

        // 恰好等于 TTL：createdAt === now() - TTL，判据是严格小于 ⇒ 存活
        harness.clock.value = t0 + TARGET_TTL_MS;
        await harness.service.writeText(atBoundary.token, data);
        expect(harness.writeFileImpl).toHaveBeenCalledTimes(1);

        // 同一时刻再签发一枚，同一服务里直接对比另一侧：它得自己再活满一个 TTL，
        // 再多 1 毫秒才过期（把时钟只往前拨 1 毫秒是不够的——那样两枚几乎同时到期）
        const bornAtBoundary = await select(harness);
        harness.clock.value = harness.clock.value + TARGET_TTL_MS + 1;
        await expect(harness.service.writeText(bornAtBoundary.token, data))
          .rejects.toMatchObject({ code: "invalid-token" });
        expect(harness.writeFileImpl).toHaveBeenCalledTimes(1);
      } finally {
        harness.dispose();
      }
    });

    test("查看令牌的 TTL 边界：恰好等于 60 分钟仍可打开，再过 1 毫秒失效", async () => {
      const harness = makeHarness();
      try {
        const selected = await select(harness);
        const written = await harness.service.writeText(selected.token, Buffer.from("<Model/>", "utf8"));
        const issuedAt = harness.clock.value;

        harness.clock.value = issuedAt + VIEW_TARGET_TTL_MS;
        await expect(harness.service.openWrittenFile(written.viewToken))
          .resolves.toMatchObject({ path: harness.target });
        expect(harness.openFileImpl).toHaveBeenCalledTimes(1);

        harness.clock.value = issuedAt + VIEW_TARGET_TTL_MS + 1;
        await expect(harness.service.openWrittenFile(written.viewToken))
          .rejects.toMatchObject({ code: "invalid-token" });
        expect(harness.openFileImpl).toHaveBeenCalledTimes(1);
      } finally {
        harness.dispose();
      }
    });
  });

  // 上面两组用例把 service 的令牌链路走完了，但 normalizeNativeExportDialogOptions
  // 的四个兜底常量（文件名 model.txt / 描述 文件 / 标题 另存为）与
  // buildSystemDefaultOpenCommand、openFailureDetail 的几处空值处理，从头到尾
  // **一次都没被触发过** —— 既有的 "normalizes unsafe dialog metadata" 只给了
  // 「非空且合法」的一组输入，所以这些分支既没被钉住，也从没被验证过。
  //
  // 四个兜底里只有 filename 的 fallback 出现在断言里，description/title 的
  // fallback 只出现在 `.filter` / `title` 字符串拼装里 —— 而那两处拼装正是
  // 真正把它们送进 PowerShell 的通道，所以断言同时断住「返回值」与「送往对话框的环境变量」。
  describe("对话框元数据的空值兜底（此前一条断言都没盖到）", () => {
    test("文件名：null 走 ?? 分支、纯空白走 || fallback、清洗后为空走末位 fallback", () => {
      // 141: String(value ?? "") —— value 为 null 才是这一支；既有输入全是非 null 字符串
      expect(normalizeNativeExportDialogOptions({ filename: null }).filename).toBe("model.txt");
      expect(normalizeNativeExportDialogOptions({}).filename).toBe("model.txt");

      // 141: || fallback —— 非 null 但 trim 后为空串，nullish 那支不触发，故可单独定位
      expect(normalizeNativeExportDialogOptions({ filename: "   " }).filename).toBe("model.txt");
      expect(normalizeNativeExportDialogOptions({ filename: "\t\n " }).filename).toBe("model.txt");

      // 145: return normalized || fallback —— 过了 basename + 两道 replace 才变空串，
      // 触发的是末位兜底而非 141 的那一处（"..." 被 /[. ]+$/ 剥光）
      expect(normalizeNativeExportDialogOptions({ filename: "..." }).filename).toBe("model.txt");
      expect(normalizeNativeExportDialogOptions({ filename: "/" }).filename).toBe("model.txt");

      // 反面对照：合法名一个字都不该动（否则上面三条可能是「什么都没做」也照样绿）
      expect(normalizeNativeExportDialogOptions({ filename: "模型.e" }).filename).toBe("模型.e");
      expect(normalizeNativeExportDialogOptions({ filename: "  模型.e  " }).filename).toBe("模型.e");

      // 变异记实情：把 141 的 `|| fallback` 整段删掉，本组断言**一条不红** ——
      // 它被 145 的 `normalized || fallback` 完全遮蔽：141 的兜底只在
      // `String(value).trim() === ""` 时触发，而那种输入经 basename/replace 后
      // 必然仍是空串，于是 145 兜出同一个 "model.txt"。两条分支**输出可证相同**，
      // 绿是正确结果（AGENTS.md「A branch that is totally shadowed by its sibling」）。
      // 承重的是 145：把 145 的兜底换成别的常量，filename 立刻变成那个常量。
    });

    test("描述：竖线被换成空格后整条为空时兜底为 文件，且兜底值真的进了 filter", () => {
      // 158 的 || "文件" 一支："|" 被 replace 成 " "，trim 后为空。
      // 既有输入 "SVG|图形" 替换后还剩字，撑不到这一支
      const piped = normalizeNativeExportDialogOptions({ description: "|", extensions: [".svg"] });
      expect(piped.description).toBe("文件");
      // filter 是这段描述唯一的去处，只断 description 等于没断「送进对话框的是什么」
      expect(piped.filter).toBe("文件 (*.svg)|*.svg|所有文件 (*.*)|*.*");

      // 纯空白同样走兜底（"   " 里没有竖线，靠 trim 清空）
      expect(normalizeNativeExportDialogOptions({ description: "   " }).description).toBe("文件");

      // 158 的 ?? "文件" 一支：整项缺失/nullish
      expect(normalizeNativeExportDialogOptions({ description: null }).description).toBe("文件");
      expect(normalizeNativeExportDialogOptions({}).description).toBe("文件");

      // 反面对照：真描述照原样保留，且竖线被替换掉（竖线是 filter 的分隔符，留着会把过滤器切碎）
      const real = normalizeNativeExportDialogOptions({ description: "E 模型文件", extensions: [".e"] });
      expect(real.description).toBe("E 模型文件");
      expect(real.filter).toBe("E 模型文件 (*.e)|*.e|所有文件 (*.*)|*.*");
    });

    test("标题：全空白时兜底为 另存为，nullish 时同样", () => {
      // 179 的 || "另存为" 一支：非 null 但 trim 后为空
      expect(normalizeNativeExportDialogOptions({ title: "   " }).title).toBe("另存为");
      // ?? "另存为" 一支
      expect(normalizeNativeExportDialogOptions({ title: null }).title).toBe("另存为");
      expect(normalizeNativeExportDialogOptions({}).title).toBe("另存为");

      // 反面对照：非空标题只被 trim，不被改写
      expect(normalizeNativeExportDialogOptions({ title: "  导出 E 文件  " }).title).toBe("导出 E 文件");
    });

    test("扩展名：数组里的 nullish 项按空串丢掉，不会变成字面量 null 混进过滤器", () => {
      // 151 的 String(item ?? "") 一支：数组里出现 null/undefined。
      // 既有输入 "svg" / ".SVG" 全是非 null 字符串
      expect(normalizeNativeExportDialogOptions({ extensions: [".E", null] }).extensions).toEqual([".e"]);
      expect(normalizeNativeExportDialogOptions({ extensions: [null, undefined] }).extensions).toEqual([".txt"]);
      expect(normalizeNativeExportDialogOptions({ extensions: [undefined, ".svg"] }).filter)
        .toBe("文件 (*.svg)|*.svg|所有文件 (*.*)|*.*");

      // 反面对照：合法项照旧，且大小写/去重规则没被这几条输入带歪
      expect(normalizeNativeExportDialogOptions({ extensions: ["svg", ".SVG", ".bad ext"] }).extensions)
        .toEqual([".svg"]);

      // 变异记实情：把 `item ?? ""` 改成 `item`（即删掉这层 nullish 兜底），本组断言**一条不红**。
      // 原因是它被下一行的正则完全遮蔽 —— nullish 经 String() 得到 "null"/"undefined"，
      // 两者都不匹配 /^\.[a-z0-9]/，照样被 filter 丢掉。
      // 能反证这层不是装饰的输入只有一个：把 nullish 换成**合法的**扩展名串（见下方变异表），
      // 此时结果多出 ".b"，`toEqual([".e"])` 立刻转红。绿是正确结果，不是漏网。
    });
  });

  describe("打开路径的空值处理", () => {
    test("filePath 为 null/undefined 时判 invalid-path，而不是把字面量当路径去开", () => {
      // 222 的 String(filePath ?? "") 一支：既有输入是 "  "（非 null，走 LHS）
      // 若删掉 ?? 兜底，String(null) === "null" 是真值，会**不抛错**并真的去开一个叫 null 的文件
      for (const bad of [null, undefined]) {
        expect(() => buildSystemDefaultOpenCommand(bad, "win32")).toThrowError(/没有可打开的文件路径/);
      }
      // 反面对照：非空路径正常出命令；纯空白仍判空（走 LHS 那一支）
      expect(() => buildSystemDefaultOpenCommand("   ", "win32")).toThrowError(/没有可打开的文件路径/);
      expect(buildSystemDefaultOpenCommand("/tmp/model.svg", "linux").command).toBe("xdg-open");
    });

    test("子进程失败且回调没带 stderr 时，报通用文案而不是 undefined/null 字面量", async () => {
      // 271 的 String(stderr ?? "") 一支：execFilePromise 会把回调的第三个实参原样挂到
      // error.stderr 上；只传 error 不传 stderr，它就是 undefined。
      // 既有两条 open-failed 用例分别传了字符串和 ""，都走的是 LHS
      const execFileImpl = vi.fn((_command, _args, _options, callback) => {
        callback(new Error("spawn ENOENT"));
      });

      await expect(openFileWithSystemDefault("C:\\gone.e", { platform: "win32", execFileImpl }))
        .rejects.toThrow("未能用默认程序打开文件，请确认该文件类型已绑定打开程序。");

      // 对照：回调显式传 undefined/null 也一样，且不能被当成可解析的行
      for (const stderr of [undefined, null]) {
        const impl = vi.fn((_command, _args, _options, callback) => {
          callback(new Error("spawn ENOENT"), "", stderr);
        });
        await expect(openFileWithSystemDefault("C:\\gone.e", { platform: "win32", execFileImpl: impl }))
          .rejects.toThrow("未能用默认程序打开文件，请确认该文件类型已绑定打开程序。");
      }
    });

    test("不注入 platform 时按 process.platform 选命令（而不是掉到 xdg-open 兜底）", async () => {
      let seen;
      const execFileImpl = vi.fn((command, _args, _options, callback) => {
        seen = command;
        callback(null, "GRAPH_MODEL_OPEN_OK", "");
      });

      // 282 的 ?? process.platform 一支：既有 openFileWithSystemDefault 用例全都显式传了 platform
      await expect(openFileWithSystemDefault("C:\\模型.e", { execFileImpl })).resolves.toBeUndefined();

      // 断「命令是按真实平台选出来的」而不是断字面量：本仓此模块整体面向 Windows，
      // 在 win32 上兜底分支会给出 xdg-open，与真实平台派生的结果对不上
      expect(seen).toBe(buildSystemDefaultOpenCommand("C:\\模型.e", process.platform).command);
      if (process.platform === "win32") {
        expect(seen).toBe("powershell.exe");
      }
    });

    // 剩下两条覆盖率报告点名的分支，本文件**无法**用输入覆盖，如实记录而不硬凑恒绿断言：
    //
    // ① nativeExportSave.mjs:193 `String(value ?? "")`（powershellSingleQuoted 内部）。
    //    该函数全文件只有一处调用（:230），传进去的 `target` 已被 :224 的
    //    `if (!target) throw` 挡过一遍 —— 走到那里时它必是非空字符串，
    //    nullish 分支**不可达**。这正是 AGENTS.md「Upstream already normalises, so
    //    your own normaliser is invisible」那条：即使导出它，也只能用 raw 值直接调才看得到。
    //
    // ② nativeExportSave.mjs:286 的 `catch (error)`。
    //    它在加测试**之前**就报 count=0，而它内部 287-294 各语句的 count 是 3 ——
    //    即三条 openFileWithSystemDefault 失败用例明明都进过这个 catch。
    //    v8 对 catch 子句的 branch 计数本身不可靠（记在这里，免得下一个人以为是漏网）。
    //    真要验证 catch 承重，得改它**内部**的行为（已由「open-failed only reports the
    //    script's own line」那条用例承担）。
  });
});
