import { afterEach, describe, expect, test, vi } from "vitest";
import { openExportedFile, saveBlobFile, saveLazyBlobFile, saveLazyTextFile, saveTextFile, writeTextFileToDirectory } from "./fileIO";
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

  test("writes the loaded blob unchanged through the native save picker", async () => {
    const blob = new Blob(["zip content"], { type: "application/zip" });
    const write = vi.fn(async (_data: Blob | string) => undefined);
    const close = vi.fn(async () => undefined);
    const showSaveFilePicker = vi.fn(async () => ({
      createWritable: async () => ({ write, close })
    }));
    const loadBlob = vi.fn(async () => blob);
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("window", { showSaveFilePicker });

    await expect(saveLazyBlobFile({
      filename: "space.zip",
      loadBlob,
      mime: "application/zip",
      description: "空间压缩包",
      extensions: [".zip"],
      pickerId: "space-export",
      startIn: "downloads"
    })).resolves.toBe(true);

    expect(loadBlob).toHaveBeenCalledOnce();
    expect(showSaveFilePicker).toHaveBeenCalledWith(expect.objectContaining({
      id: "space-export",
      suggestedName: "space.zip",
      startIn: "downloads",
      types: [{ description: "空间压缩包", accept: { "application/zip": [".zip"] } }]
    }));
    const written = write.mock.calls[0]?.[0];
    expect(written).toBe(blob);
    expect((written as Blob).type).toBe("application/zip");
    await expect((written as Blob).text()).resolves.toBe("zip content");
    expect(close).toHaveBeenCalledOnce();
  });

  test("downloads the loaded blob with the requested filename and revokes its URL after clicking", async () => {
    const blob = new Blob(["binary content"], { type: "application/octet-stream" });
    const order: string[] = [];
    const click = vi.fn(() => order.push("click"));
    const link = { href: "", download: "", click };
    const createObjectURL = vi.fn((value: Blob) => {
      expect(value).toBe(blob);
      order.push("create");
      return "blob:lazy-download";
    });
    const revokeObjectURL = vi.fn((url: string) => {
      expect(url).toBe("blob:lazy-download");
      order.push("revoke");
    });
    const loadBlob = vi.fn(async () => blob);
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { createElement: vi.fn(() => link) });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    await expect(saveLazyBlobFile({
      filename: "payload.bin",
      loadBlob,
      mime: "application/octet-stream",
      description: "二进制文件",
      extensions: [".bin"]
    })).resolves.toBe(true);

    expect(loadBlob).toHaveBeenCalledOnce();
    expect(link.href).toBe("blob:lazy-download");
    expect(link.download).toBe("payload.bin");
    expect(order).toEqual(["create", "click", "revoke"]);
    expect(revokeObjectURL).toHaveBeenCalledOnce();
  });

  test("falls back to browser download when opening the save picker fails", async () => {
    const showGlobalMessage = vi.fn();
    const click = vi.fn();
    const loadBlob = vi.fn(async () => new Blob(["fallback"], { type: "application/octet-stream" }));
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    vi.stubGlobal("window", {
      showSaveFilePicker: vi.fn(async () => {
        throw new Error("NotAllowedError");
      })
    });
    vi.stubGlobal("document", { createElement: () => ({ click }) });
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:fallback"), revokeObjectURL });

    await expect(saveLazyBlobFile({
      filename: "fallback.bin",
      loadBlob,
      mime: "application/octet-stream",
      description: "二进制文件",
      extensions: [".bin"]
    })).resolves.toBe(true);

    expect(showGlobalMessage).toHaveBeenCalledWith("打开保存窗口失败，已改为浏览器下载。");
    expect(loadBlob).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fallback");
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

// ── 保存窗口打开失败 → 浏览器下载兜底（此前 0 覆盖）───────────────────────────
//
// picker 抛错有两条完全不同的出路：
//   - DOMException("AbortError") = 用户自己取消了 ⇒ 返回 false、不提示、不下载；
//   - 其它错误（权限 / 环境不支持 / 弹窗异常）⇒ 提示 + 改走浏览器下载 + 返回 true。
// 混淆这两者会让「用户点了取消」也弹出一句「已改为浏览器下载」并真的下载一次。

describe("保存窗口打开失败的兜底分流", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const pickerOptions = {
    filename: "model.e",
    mime: "text/plain",
    description: "E model",
    extensions: [".e"]
  };

  /** node 环境补的最小下载桩：建 <a> 点一下 + createObjectURL。 */
  function stubBrowserDownload() {
    const click = vi.fn();
    vi.stubGlobal("document", { createElement: () => ({ click }) });
    vi.stubGlobal("URL", { createObjectURL: () => "blob:stub", revokeObjectURL: () => undefined });
    return click;
  }

  test("★ picker 抛普通错误 → 提示改用浏览器下载并返回 true", async () => {
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    vi.stubGlobal("window", {
      showSaveFilePicker: vi.fn(async () => {
        throw new Error("NotAllowedError");
      })
    });
    const click = stubBrowserDownload();

    const saved = await saveTextFile({ ...pickerOptions, text: "<Model/>" });

    expect(saved).toBe(true);
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("浏览器下载"));
    expect(click).toHaveBeenCalled();
  });

  test("★ AbortError（用户取消）→ 返回 false，既不提示也不下载", async () => {
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    vi.stubGlobal("window", {
      showSaveFilePicker: vi.fn(async () => {
        throw new DOMException("cancelled", "AbortError");
      })
    });
    const click = stubBrowserDownload();

    const saved = await saveTextFile({ ...pickerOptions, text: "<Model/>" });

    expect(saved).toBe(false);
    expect(showGlobalMessage).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });

  test("非 DOMException 形态的取消信号（Error 带 AbortError 名字）不被当取消", async () => {
    // isPickerAbort 判据是 `instanceof DOMException && name === "AbortError"`；
    // 构造一个同名的普通 Error 会被判成真错误 ⇒ 走下载兜底。
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("window", {
      showSaveFilePicker: vi.fn(async () => {
        throw new Error("AbortError");
      })
    });
    const click = stubBrowserDownload();

    const saved = await saveTextFile({ ...pickerOptions, text: "<Model/>" });

    expect(saved).toBe(true);
    expect(click).toHaveBeenCalled();
  });
});

// ── 降级保存时加载器再失败：仍要存下文件，不能整条 reject ──────────────────────
//
// saveLazyTextFile 里那两处 catch 承诺的是「打开保存窗口出了岔子也照样把文件存下来」。
// 修复前它们在 catch 里裸 await 同一个加载器，加载器第二次抛错就把整个函数带崩：
// 用户既拿不到文件、也看不到任何提示，降级意图彻底落空（E 文件生成失败 + 保存窗口
// 失败同时发生就是这个组合）。修复后经 loadTextForFallbackSave 取文本，加载器失败时
// 用空串继续走降级下载。
//
// 空串这个兜底值不是随手挑的：源码里本来就有 `textPromise.catch(() => undefined)`，
// 而 `undefined` 传到编码器会被 `TextEncoder.encode()` 的可选参数塌成 `""`（空文件）；
// 直接写 `""` 是为了让 GBK 分支的 `encodeGbk()` 也能迭代（收到 `undefined` 会抛
// TypeError，等于把拒绝从 catch 里又漏出去）。

describe("降级保存时加载器再失败", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const pickerOptions = {
    filename: "model.e",
    mime: "text/plain",
    description: "E model",
    extensions: [".e"]
  };

  /** node 环境补的最小下载桩：抓住 createObjectURL 收到的 Blob 和被点开的 <a>。 */
  function stubBrowserDownload() {
    const created: Blob[] = [];
    const link = { href: "", download: "", click: vi.fn() };
    vi.stubGlobal("document", { createElement: vi.fn(() => link) });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((value: Blob) => {
        created.push(value);
        return `blob:stub-${created.length}`;
      }),
      revokeObjectURL: vi.fn()
    });
    return { created, link };
  }

  const bytesOf = async (blob: Blob) => Array.from(new Uint8Array(await blob.arrayBuffer()));
  const utf8 = (text: string) => Array.from(new TextEncoder().encode(text));

  /** 保存窗口**同步**抛错 → 落在 `picker.call` 外层那处 catch（catch ①）。 */
  const pickerThrowsSynchronously = () => {
    vi.stubGlobal("window", {
      showSaveFilePicker: vi.fn(() => {
        throw new Error("NotAllowedError");
      })
    });
  };

  /** 保存窗口返回**被拒的 promise** → 落在 `await handlePromise` 那处 catch（catch ②）。 */
  const pickerRejectsAsynchronously = () => {
    vi.stubGlobal("window", {
      showSaveFilePicker: vi.fn(async () => {
        throw new Error("NotAllowedError");
      })
    });
  };

  test("★ 加载器返回 rejected promise + 保存窗口被拒 → 仍 resolve 并存下空文件", async () => {
    // 本任务的核心缺陷：修复前这里整条 reject，降级保存从未发生。
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    pickerRejectsAsynchronously();
    const { created, link } = stubBrowserDownload();
    const loadText = vi.fn(async () => {
      throw new Error("E 文件生成失败");
    });

    await expect(saveLazyTextFile({ ...pickerOptions, loadText })).resolves.toBe(true);

    expect(loadText).toHaveBeenCalledOnce();
    expect(showGlobalMessage).toHaveBeenCalledWith("打开保存窗口失败，已改为浏览器下载。");
    expect(created).toHaveLength(1);
    expect(link.download).toBe("model.e");
    expect(link.click).toHaveBeenCalledOnce();
    expect(await bytesOf(created[0])).toEqual([]);
  });

  test("★ 加载器返回 rejected promise + 保存窗口同步抛错 → 同样 resolve 并存下空文件", async () => {
    // 同一缺陷的另一处 catch：picker.call 同步抛出时走的是裸 `await options.loadText()`。
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    pickerThrowsSynchronously();
    const { created, link } = stubBrowserDownload();
    const loadText = vi.fn(async () => {
      throw new Error("E 文件生成失败");
    });

    await expect(saveLazyTextFile({ ...pickerOptions, loadText })).resolves.toBe(true);

    expect(loadText).toHaveBeenCalledOnce();
    expect(showGlobalMessage).toHaveBeenCalledWith("打开保存窗口失败，已改为浏览器下载。");
    expect(link.click).toHaveBeenCalledOnce();
    expect(await bytesOf(created[0])).toEqual([]);
  });

  test("加载器同步抛错（不是返回 rejected promise）+ 保存窗口被拒 → 同样 resolve", async () => {
    // Promise.resolve().then(loadText) 会把同步 throw 变成 textPromise 的拒绝，
    // 所以这走的是 catch ② 里那层保护，与上一条不重复。
    vi.stubGlobal("showGlobalMessage", vi.fn());
    pickerRejectsAsynchronously();
    const { created } = stubBrowserDownload();
    const loadText = vi.fn(() => {
      throw new Error("还没返回就已经炸了");
    });

    await expect(saveLazyTextFile({ ...pickerOptions, loadText })).resolves.toBe(true);

    expect(loadText).toHaveBeenCalledOnce();
    expect(await bytesOf(created[0])).toEqual([]);
  });

  test("加载器同步抛错 + 保存窗口同步抛错 → 同样 resolve", async () => {
    vi.stubGlobal("showGlobalMessage", vi.fn());
    pickerThrowsSynchronously();
    const { created } = stubBrowserDownload();
    const loadText = vi.fn(() => {
      throw new Error("还没返回就已经炸了");
    });

    await expect(saveLazyTextFile({ ...pickerOptions, loadText })).resolves.toBe(true);

    expect(loadText).toHaveBeenCalledOnce();
    expect(await bytesOf(created[0])).toEqual([]);
  });

  test("加载器返回非字符串（数字 / 对象 / null）→ 不抛，按编码器的字符串化结果落盘", async () => {
    // loadText 的类型标的是 string，但没人校验：TextEncoder.encode 会 ToString 化入参，
    // 所以这些值都安安静静地产出一个「看起来有内容」的文件。这条钉住真实行为，
    // 免得日后有人给降级路径加归一化时无声改掉落盘字节。
    vi.stubGlobal("showGlobalMessage", vi.fn());
    pickerThrowsSynchronously();
    const { created } = stubBrowserDownload();
    const values: unknown[] = [42, { attr: "1" }, null];

    for (const value of values) {
      created.length = 0;
      await expect(saveLazyTextFile({ ...pickerOptions, loadText: () => value as string }))
        .resolves.toBe(true);
      expect(created).toHaveLength(1);
      expect(await bytesOf(created[0])).toEqual(utf8(String(value)));
    }
  });

  test("GBK 编码下加载器失败 → 存空文件，而不是被 encodeGbk 的迭代错误顶穿", async () => {
    // 兜底值若写成 undefined：utf-8 分支靠 TextEncoder.encode() 的默认参数侥幸没事，
    // 但 GBK 分支的 encodeGbk() 要 `for (const char of text)`，收到 undefined 直接
    // TypeError，整条又 reject 回去 —— 缺陷只修了一半。
    vi.stubGlobal("showGlobalMessage", vi.fn());
    pickerThrowsSynchronously();
    const { created } = stubBrowserDownload();

    await expect(saveLazyTextFile({
      ...pickerOptions,
      encoding: "gbk",
      loadText: async () => {
        throw new Error("E 文件生成失败");
      }
    })).resolves.toBe(true);

    expect(created).toHaveLength(1);
    expect(await bytesOf(created[0])).toEqual([]);
  });

  test("回归：加载器正常时，保存窗口同步抛错那条降级下载逐字节不变", async () => {
    vi.stubGlobal("showGlobalMessage", vi.fn());
    pickerThrowsSynchronously();
    const { created, link } = stubBrowserDownload();

    await expect(saveLazyTextFile({ ...pickerOptions, loadText: () => "<Model/>" }))
      .resolves.toBe(true);

    expect(link.href).toBe("blob:stub-1");
    expect(link.download).toBe("model.e");
    expect(await bytesOf(created[0])).toEqual(utf8("<Model/>"));
  });

  test("回归：加载器正常时，保存窗口被拒那条降级下载逐字节不变且加载器只跑一次", async () => {
    vi.stubGlobal("showGlobalMessage", vi.fn());
    pickerRejectsAsynchronously();
    const { created } = stubBrowserDownload();
    const loadText = vi.fn(() => "<Model/>中文");

    await expect(saveLazyTextFile({ ...pickerOptions, loadText })).resolves.toBe(true);

    // 只跑一次很关键：catch ② 必须复用已记忆化的 textPromise，
    // 若图省事写成 loadTextForFallbackSave(options.loadText) 就会二次生成。
    expect(loadText).toHaveBeenCalledOnce();
    expect(await bytesOf(created[0])).toEqual(utf8("<Model/>中文"));
  });
});
