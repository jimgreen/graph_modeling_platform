import { describe, expect, test, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  NativeExportSaveError,
  buildSystemDefaultOpenCommand,
  createNativeExportSaveService,
  isAllowedNativeExportOrigin,
  normalizeNativeExportDialogOptions,
  openFileWithSystemDefault,
  showWindowsSaveFileDialog
} from "./nativeExportSave.mjs";

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

    await expect(service.openWrittenFile(written.viewToken)).rejects.toMatchObject({
      code: "open-failed"
    });
    expect(openFileImpl).not.toHaveBeenCalled();
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

    // 落真文件：openWrittenFile 走 existsSync，假路径会在 TTL 判定之前就以
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
});
