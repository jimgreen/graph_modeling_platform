import { afterEach, describe, expect, test, vi } from "vitest";
import { saveLazyTextFile, saveTextFile, writeTextFileToDirectory } from "./fileIO";

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
    vi.stubGlobal("window", { showSaveFilePicker, alert: vi.fn() });

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
    expect(write).toHaveBeenCalledWith("<Model/>");
    expect(close).toHaveBeenCalledOnce();
  });

  test("uses the local native save service and starts timing after the save target is confirmed", async () => {
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
        expect(init?.body).toBe("<Model/>");
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
    vi.stubGlobal("window", {
      location: { hostname: "127.0.0.1" },
      showSaveFilePicker,
      alert: vi.fn()
    });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" });
    vi.stubGlobal("fetch", fetchMock);

    const savePromise = saveLazyTextFile({
      filename: "model.e",
      loadText,
      mime: "text/plain",
      description: "E model",
      extensions: [".e"],
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
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/webgrp/exports/native/write-text?token=target-token");
    expect(showSaveFilePicker).not.toHaveBeenCalled();
  });

  test("does not write or report success when the lazy save picker is cancelled", async () => {
    const alert = vi.fn();
    const loadText = vi.fn(() => "<Model/>");
    const showSaveFilePicker = vi.fn(async () => {
      throw new DOMException("cancelled", "AbortError");
    });
    vi.stubGlobal("window", { showSaveFilePicker, alert });

    const saved = await saveLazyTextFile({
      filename: "model.e",
      loadText,
      mime: "text/plain",
      description: "E model",
      extensions: [".e"]
    });

    expect(saved).toBe(false);
    expect(loadText).toHaveBeenCalledOnce();
    expect(alert).not.toHaveBeenCalled();
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
