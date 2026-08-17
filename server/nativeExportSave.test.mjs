import { describe, expect, test, vi } from "vitest";
import { dirname, resolve } from "node:path";
import {
  NativeExportSaveError,
  createNativeExportSaveService,
  isAllowedNativeExportOrigin,
  normalizeNativeExportDialogOptions,
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
      createToken: () => "token-1"
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
});
