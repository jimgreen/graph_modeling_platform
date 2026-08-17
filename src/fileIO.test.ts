import { afterEach, describe, expect, test, vi } from "vitest";
import { saveBlobFile, saveLazyTextFile, saveTextFile, writeTextFileToDirectory } from "./fileIO";
import { encodeGbk } from "./encoding/gbk";

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
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("window", { showSaveFilePicker });

    const saved = await saveTextFile({
      filename: "model.e",
      text: "<Model/>",
      mime: "text/plain",
      description: "E model",
      extensions: [".e"],
      pickerId: "component-svg-export",
      startIn: "downloads"
    });

    expect(saved).toBe(true);
    expect(write).toHaveBeenCalledWith(new TextEncoder().encode("<Model/>"));
    expect(write.mock.calls[0]?.[0]).not.toBeInstanceOf(Blob);
    expect(close).toHaveBeenCalledOnce();
    expect(showSaveFilePicker).toHaveBeenCalledWith(expect.objectContaining({
      id: "component-svg-export",
      suggestedName: "model.e",
      startIn: "downloads"
    }));
  });

  test("starts lazy text generation after opening the save picker and before the picker resolves", async () => {
    const order: string[] = [];
    const onSaveTargetReady = vi.fn(() => order.push("save-target-ready"));
    const write = vi.fn(async (_data: Blob | string) => undefined);
    const close = vi.fn(async () => undefined);
    let resolvePicker!: (handle: { createWritable: () => Promise<{ write: typeof write; close: typeof close }> }) => void;
    const pickerResult = new Promise<{ createWritable: () => Promise<{ write: typeof write; close: typeof close }> }>((resolve) => {
      resolvePicker = resolve;
    });
    const showSaveFilePicker = vi.fn(() => {
      order.push("picker");
      return pickerResult;
    });
    const loadText = vi.fn(() => {
      order.push("generate");
      return "<Model/>";
    });
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("window", { showSaveFilePicker });

    const savePromise = saveLazyTextFile({
      filename: "model.e",
      loadText,
      mime: "text/plain",
      description: "E model",
      extensions: [".e"],
      onSaveTargetReady
    });

    await vi.waitFor(() => expect(loadText).toHaveBeenCalledOnce());
    expect(order).toEqual(["picker", "generate"]);
    expect(write).not.toHaveBeenCalled();
    expect(onSaveTargetReady).not.toHaveBeenCalled();

    resolvePicker({ createWritable: async () => ({ write, close }) });
    await expect(savePromise).resolves.toBe(true);

    expect(order).toEqual(["picker", "generate", "save-target-ready"]);
    expect(onSaveTargetReady).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith(new TextEncoder().encode("<Model/>"));
    expect(close).toHaveBeenCalledOnce();
  });

  test("uses the local native save service regardless of browser user agent and starts timing after confirmation", async () => {
    const order: string[] = [];
    let resolveSelection!: (response: Response) => void;
    const selectionResponse = new Promise<Response>((resolve) => {
      resolveSelection = resolve;
    });
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => {
        order.push("select");
        return selectionResponse;
      })
      .mockImplementationOnce(async (_url: string, init?: RequestInit) => {
        order.push("write");
        expect(init?.body).toEqual(new TextEncoder().encode("<Model/>"));
        return new Response(JSON.stringify({ ok: true, filename: "model.e" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      });
    const loadText = vi.fn(() => {
      order.push("generate");
      return "<Model/>";
    });
    const onSaveTargetReady = vi.fn(() => order.push("save-target-ready"));
    const showSaveFilePicker = vi.fn();
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("window", {
      location: { hostname: "127.0.0.1" },
      showSaveFilePicker
    });
    vi.stubGlobal("navigator", { userAgent: "CodexEmbeddedBrowser/1.0" });
    vi.stubGlobal("fetch", fetchMock);

    const savePromise = saveLazyTextFile({
      filename: "model.e",
      loadText,
      mime: "text/plain",
      description: "E model",
      extensions: [".e"],
      startIn: "downloads",
      preferNativeDialog: true,
      onSaveTargetReady
    });

    await vi.waitFor(() => expect(loadText).toHaveBeenCalledOnce());
    expect(order).toEqual(["select", "generate"]);
    expect(onSaveTargetReady).not.toHaveBeenCalled();

    resolveSelection(new Response(JSON.stringify({
      supported: true,
      cancelled: false,
      token: "target-token",
      filename: "model.e"
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));

    await expect(savePromise).resolves.toBe(true);
    expect(order).toEqual(["select", "generate", "save-target-ready", "write"]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/webgrp/exports/native/select-file");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      filename: "model.e",
      startIn: "downloads"
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/webgrp/exports/native/write-text?token=target-token");
    expect(showSaveFilePicker).not.toHaveBeenCalled();
  });

  test("opens every native export dialog in the last browser-remembered directory across file types", async () => {
    const rememberedDirectory = "C:\\exports\\component-svg";
    const storage = new Map<string, string>();
    const localStorage = {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      })
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        supported: true,
        cancelled: false,
        token: "target-token-1",
        filename: "model.e",
        directory: rememberedDirectory
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        supported: true,
        cancelled: false,
        token: "target-token-2",
        filename: "dc-source.svg",
        directory: rememberedDirectory
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("window", {
      location: { hostname: "127.0.0.1" },
      localStorage
    });
    vi.stubGlobal("fetch", fetchMock);

    const saveExport = (filename: string, mime: string, pickerId: string) => saveTextFile({
      filename,
      text: mime === "image/svg+xml" ? "<svg></svg>" : "<Model/>",
      mime,
      description: mime === "image/svg+xml" ? "SVG 图元文件" : "E 模型文件",
      extensions: [filename.slice(filename.lastIndexOf("."))],
      pickerId,
      startIn: "downloads",
      preferNativeDialog: true
    });

    await expect(saveExport("model.e", "text/plain", "e-model-export")).resolves.toBe(true);
    const firstSelectionPayload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(firstSelectionPayload).not.toHaveProperty("initialDirectory");
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "graph-modeling-platform.native-export.directory",
      rememberedDirectory
    );

    await expect(saveExport("dc-source.svg", "image/svg+xml", "custom-component-svg-export")).resolves.toBe(true);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/webgrp/exports/native/select-file")).toHaveLength(2);
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({
      filename: "dc-source.svg",
      initialDirectory: rememberedDirectory
    });
  });

  test("does not write or report success when the lazy save picker is cancelled", async () => {
    const showGlobalMessage = vi.fn();
    const loadText = vi.fn(() => "<Model/>");
    const showSaveFilePicker = vi.fn(async () => {
      throw new DOMException("cancelled", "AbortError");
    });
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    vi.stubGlobal("window", { showSaveFilePicker });

    const saved = await saveLazyTextFile({
      filename: "model.e",
      loadText,
      mime: "text/plain",
      description: "E model",
      extensions: [".e"]
    });

    expect(saved).toBe(false);
    expect(loadText).toHaveBeenCalledOnce();
    expect(showGlobalMessage).not.toHaveBeenCalled();
  });

  test("opens blob export in the requested default directory with a suggested filename", async () => {
    const write = vi.fn(async (_data: Blob | string) => undefined);
    const close = vi.fn(async () => undefined);
    const showSaveFilePicker = vi.fn(async () => ({
      createWritable: async () => ({ write, close })
    }));
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("window", { showSaveFilePicker });
    const blob = new Blob(["<svg></svg>"], { type: "image/svg+xml" });

    const saved = await saveBlobFile({
      filename: "ac-source.svg",
      blob,
      mime: "image/svg+xml",
      description: "SVG 图元文件",
      extensions: [".svg"],
      pickerId: "custom-component-svg-export",
      startIn: "downloads"
    });

    expect(saved).toBe(true);
    expect(showSaveFilePicker).toHaveBeenCalledWith(expect.objectContaining({
      id: "custom-component-svg-export",
      suggestedName: "ac-source.svg",
      startIn: "downloads"
    }));
    expect(write).toHaveBeenCalledWith(blob);
    expect(close).toHaveBeenCalledOnce();
  });

  test("writes directory export text as bytes in the selected encoding", async () => {
    const write = vi.fn(async (_data: Blob | string) => undefined);
    const close = vi.fn(async () => undefined);
    const getFileHandle = vi.fn(async () => ({
      createWritable: async () => ({ write, close })
    }));

    await writeTextFileToDirectory(
      { getFileHandle },
      "model.svg",
      "<svg>中文</svg>",
      "image/svg+xml",
      "gbk"
    );

    expect(getFileHandle).toHaveBeenCalledWith("model.svg", { create: true });
    expect(write).toHaveBeenCalledWith(encodeGbk("<svg>中文</svg>"));
    expect(write.mock.calls[0]?.[0]).not.toBeInstanceOf(Blob);
    expect(close).toHaveBeenCalledOnce();
  });
});
