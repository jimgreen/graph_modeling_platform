import { afterEach, describe, expect, test, vi } from "vitest";
import { saveTextFile, writeTextFileToDirectory } from "./fileIO";

describe("text file output", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("writes text directly through the save-file stream", async () => {
    const write = vi.fn(async (_data: Blob | string) => undefined);
    const close = vi.fn(async () => undefined);
    const showSaveFilePicker = vi.fn(async () => ({
      createWritable: async () => ({ write, close })
    }));
    vi.stubGlobal("window", { showSaveFilePicker, alert: vi.fn() });

    const saved = await saveTextFile({
      filename: "model.e",
      text: "<Model/>",
      mime: "text/plain",
      description: "E model",
      extensions: [".e"]
    });

    expect(saved).toBe(true);
    expect(write).toHaveBeenCalledWith("<Model/>");
    expect(write.mock.calls[0]?.[0]).not.toBeInstanceOf(Blob);
    expect(close).toHaveBeenCalledOnce();
  });

  test("writes directory export text without an intermediate Blob", async () => {
    const write = vi.fn(async (_data: Blob | string) => undefined);
    const close = vi.fn(async () => undefined);
    const getFileHandle = vi.fn(async () => ({
      createWritable: async () => ({ write, close })
    }));

    await writeTextFileToDirectory(
      { getFileHandle },
      "model.svg",
      "<svg/>",
      "image/svg+xml"
    );

    expect(getFileHandle).toHaveBeenCalledWith("model.svg", { create: true });
    expect(write).toHaveBeenCalledWith("<svg/>");
    expect(write.mock.calls[0]?.[0]).not.toBeInstanceOf(Blob);
    expect(close).toHaveBeenCalledOnce();
  });
});
