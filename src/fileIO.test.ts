import { afterEach, describe, expect, test, vi } from "vitest";
import { openExportedFile, saveBlobFile, saveLazyTextFile, saveTextFile, writeTextFileToDirectory } from "./fileIO";
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

describe("导出文件查看凭据（viewToken）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** 本机另存为全链路桩：先回选择结果，再回写盘结果（带 viewToken）。 */
  function stubNativeExport(writeBody: unknown) {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        supported: true,
        cancelled: false,
        token: "target-token",
        filename: "model.e"
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(writeBody), {
        status: 200,
        headers: { "content-type": "application/json" }
      }));
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("window", { location: { hostname: "127.0.0.1" } });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  test("本机另存为写盘成功后把 viewToken 交给 onSaved（弹框据此给【查看】）", async () => {
    stubNativeExport({ ok: true, viewToken: "view-token", filename: "model.e", path: "C:\\导出\\model.e" });
    const onSaved = vi.fn();

    await expect(saveLazyTextFile({
      filename: "model.e",
      loadText: () => "<Model/>",
      mime: "text/plain",
      description: "E model",
      extensions: [".e"],
      preferNativeDialog: true,
      onSaved
    })).resolves.toBe(true);

    expect(onSaved).toHaveBeenCalledWith({
      token: "view-token",
      filename: "model.e",
      path: "C:\\导出\\model.e"
    });
  });

  test("onSaved 必须在 saveXxx 返回**之前**触发，否则调用方读到的还是 null", async () => {
    // 导出工厂的写法是 `saved = await saveLazyTextFile(...); showCompletion(..., savedFile)`：
    // 同步读 savedFile。若 fileIO 漏了 await notifySavedExportFile，onSaved 会落到后面的
    // 微任务里，弹框就永远拿不到 file、【查看】按钮不渲染（浏览器实测踩过）。
    stubNativeExport({ ok: true, viewToken: "view-token", filename: "model.e", path: "C:\\导出\\model.e" });
    const order: string[] = [];

    await saveLazyTextFile({
      filename: "model.e",
      loadText: () => "<Model/>",
      mime: "text/plain",
      description: "E model",
      extensions: [".e"],
      preferNativeDialog: true,
      onSaved: () => order.push("on-saved")
    }).then(() => order.push("returned"));

    expect(order).toEqual(["on-saved", "returned"]);
  });

  test("二进制导出（ZIP）也走本机另存为并回 viewToken", async () => {
    stubNativeExport({ ok: true, viewToken: "view-zip", filename: "space.zip", path: "C:\\导出\\space.zip" });
    const onSaved = vi.fn();

    await expect(saveBlobFile({
      filename: "space.zip",
      blob: new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], { type: "application/zip" }),
      mime: "application/zip",
      description: "空间压缩包",
      extensions: [".zip"],
      preferNativeDialog: true,
      onSaved
    })).resolves.toBe(true);

    expect(onSaved).toHaveBeenCalledWith({
      token: "view-zip",
      filename: "space.zip",
      path: "C:\\导出\\space.zip"
    });
  });

  test("响应里没有 viewToken（如旧后端）时不谎报可查看", async () => {
    stubNativeExport({ ok: true, filename: "model.e" });
    const onSaved = vi.fn();

    await expect(saveLazyTextFile({
      filename: "model.e",
      loadText: () => "<Model/>",
      mime: "text/plain",
      description: "E model",
      extensions: [".e"],
      preferNativeDialog: true,
      onSaved
    })).resolves.toBe(true);

    expect(onSaved).not.toHaveBeenCalled();
  });

  test("改用浏览器下载兜底时同样不给查看凭据（不知道文件落在哪）", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }));
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("window", { location: { hostname: "127.0.0.1" } });
    vi.stubGlobal("fetch", fetchMock);
    // 浏览器下载兜底会真的建 <a> 点一下，node 环境补最小 DOM 桩
    vi.stubGlobal("document", { createElement: () => ({ click: () => undefined }) });
    vi.stubGlobal("URL", { createObjectURL: () => "blob:stub", revokeObjectURL: () => undefined });
    const onSaved = vi.fn();

    await expect(saveLazyTextFile({
      filename: "model.e",
      loadText: () => "<Model/>",
      mime: "text/plain",
      description: "E model",
      extensions: [".e"],
      preferNativeDialog: true,
      onSaved
    })).resolves.toBe(true);

    expect(onSaved).not.toHaveBeenCalled();
  });

  test("openExportedFile 把令牌 POST 给本机查看接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await openExportedFile({ token: "view token/x", filename: "model.e", path: "C:\\model.e" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/webgrp/exports/native/open-file?token=view%20token%2Fx",
      { method: "POST" }
    );
  });

  test("openExportedFile 把后端的中文错误如实抛出", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "文件已不存在：C:\\导出\\model.e" }),
      { status: 500, headers: { "content-type": "application/json" } }
    )));

    await expect(openExportedFile({ token: "t", filename: "model.e", path: "C:\\model.e" }))
      .rejects.toThrow("文件已不存在：C:\\导出\\model.e");
    await expect(openExportedFile({ token: "", filename: "model.e", path: "" }))
      .rejects.toThrow("缺少导出文件令牌。");
  });
});
