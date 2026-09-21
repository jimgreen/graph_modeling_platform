// 【导出图元 Symbol】作用域工厂：导出走后端 /symbol-export，方案读写走 /symbol-export-schemes。
//
// 这里刻意不 mock 具体实现模块，只桩掉 fetch —— 要验的正是「前端到底发了什么请求、
// 拿到响应后有没有如实落盘」，mock 掉 requestBackendSymbolExport 就什么都验不到了。
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createDeleteSymbolExportScheme,
  createExportComponentSymbols,
  createExportComponentSymbolsStandalone,
  createLoadSymbolExportSchemes,
  createSaveSymbolExportScheme
} from "./appExtracted/appSymbolExportFactories";

type StubbedResponse = { status?: number; body: unknown };

/** 桩掉全局 fetch，并记录每次调用的 url / init。 */
function stubFetch(handler: (url: string, init?: RequestInit) => StubbedResponse) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const { status = 200, body } = handler(String(url), init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body
    };
  });
  return calls;
}

type StubbedBinaryResponse = {
  status?: number;
  /** 传了 contentType 就按二进制（zip/svg）走；没传就按 JSON 错误信封走 */
  contentType?: string;
  headers?: Record<string, string>;
  bytes?: Uint8Array;
  body?: unknown;
};

/**
 * 独立导出专用的 fetch 桩：响应体是 zip/svg 二进制，走 arrayBuffer() 与
 * x-symbol-export-* 响应头，与普通 JSON 桩（只有 json()）的形状不同。
 */
function stubBinaryFetch(handler: (url: string, init?: RequestInit) => StubbedBinaryResponse) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const result = handler(String(url), init);
    const status = result.status ?? 200;
    const headers = new Headers(result.headers ?? {});
    if (result.contentType) {
      headers.set("content-type", result.contentType);
    }
    const bytes = result.bytes ?? new Uint8Array();
    return {
      ok: status >= 200 && status < 300,
      status,
      headers,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      json: async () => result.body
    };
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const templateOf = (kind: string) => ({ kind }) as never;

describe("createExportComponentSymbols", () => {
  test("把去重后的 kind 交给后端，并用后端返回的文件名与正文落盘", async () => {
    const calls = stubFetch(() => ({
      body: {
        ok: true,
        svg: '<svg><defs><symbol id="a"/></defs></svg>',
        symbolCount: 2,
        exportedKinds: ["ac-breaker"],
        skippedKinds: [],
        missingKinds: [],
        fileName: "component-symbols-20260101-000000.svg"
      }
    }));
    const saved: Array<Record<string, unknown>> = [];
    const messages: unknown[][] = [];
    const exportSymbols = createExportComponentSymbols({
      saveTextFile: async (payload: Record<string, unknown>) => {
        saved.push(payload);
        return true;
      },
      setSymbolExportSchemesStatus: () => undefined,
      showGlobalMessage: (...args: unknown[]) => messages.push(args),
      writeOperationLog: () => undefined
    });

    const ok = await exportSymbols([
      templateOf("ac-breaker"),
      templateOf("ac-breaker"),
      templateOf("ac-bus"),
      templateOf(""),
      null as never
    ]);

    expect(ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/webgrp/symbol-export");
    expect(calls[0].init?.method).toBe("POST");
    // 同 kind 只送一次、空 kind 不送
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ kinds: ["ac-breaker", "ac-bus"] });
    // 文件名与正文都取自后端，前端不另造一份
    expect(saved).toHaveLength(1);
    expect(saved[0].filename).toBe("component-symbols-20260101-000000.svg");
    expect(String(saved[0].text)).toContain("<symbol");
    expect(saved[0].mime).toBe("image/svg+xml");
    expect(messages[0][1]).toBe("success");
  });

  test("后端报错时如实上抛消息，不落盘、不本地兜底合成", async () => {
    stubFetch(() => ({
      status: 404,
      body: { error: { code: "template-not-found", message: "所选图元在后端图元库中均不存在：ghost。" } }
    }));
    const messages: unknown[][] = [];
    let savedCount = 0;
    const exportSymbols = createExportComponentSymbols({
      saveTextFile: async () => {
        savedCount += 1;
        return true;
      },
      setSymbolExportSchemesStatus: () => undefined,
      showGlobalMessage: (...args: unknown[]) => messages.push(args),
      writeOperationLog: () => undefined
    });

    const ok = await exportSymbols([templateOf("ghost")]);

    expect(ok).toBe(false);
    expect(savedCount).toBe(0);
    expect(String(messages[0][0])).toContain("所选图元在后端图元库中均不存在");
    expect(messages[0][1]).toBe("error");
  });

  test("一个图元都没选时不发请求", async () => {
    const calls = stubFetch(() => ({ body: {} }));
    const messages: unknown[][] = [];
    const exportSymbols = createExportComponentSymbols({
      setSymbolExportSchemesStatus: () => undefined,
      showGlobalMessage: (...args: unknown[]) => messages.push(args),
      writeOperationLog: () => undefined
    });

    expect(await exportSymbols([])).toBe(false);
    expect(await exportSymbols(null)).toBe(false);
    expect(calls).toHaveLength(0);
    expect(String(messages[0][0])).toContain("请至少选择一个");
  });

  test("后端漏导了 kind（missingKinds）时降级为 warning 并提示先保存图元库", async () => {
    stubFetch(() => ({
      body: {
        ok: true,
        svg: "<svg/>",
        symbolCount: 1,
        exportedKinds: ["ac-breaker"],
        skippedKinds: [],
        missingKinds: ["ac-ghost"],
        fileName: "x.svg"
      }
    }));
    const messages: unknown[][] = [];
    const exportSymbols = createExportComponentSymbols({
      saveTextFile: async () => true,
      setSymbolExportSchemesStatus: () => undefined,
      showGlobalMessage: (...args: unknown[]) => messages.push(args),
      writeOperationLog: () => undefined
    });

    expect(await exportSymbols([templateOf("ac-breaker"), templateOf("ac-ghost")])).toBe(true);
    expect(messages[0][1]).toBe("warning");
    expect(String(messages[0][0])).toContain("保存图元库");
  });
});

describe("createExportComponentSymbolsStandalone（独立图元 SVG 导出）", () => {
  const zipDisposition =
    'attachment; filename="component-symbols-20260101-000000.zip"; filename*=UTF-8\'\'component-symbols-20260101-000000.zip';

  test("多图元：kind 去重后 POST /symbol-export-standalone，zip 二进制经 saveBlobFile 落盘", async () => {
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
    const calls = stubBinaryFetch(() => ({
      contentType: "application/zip",
      headers: {
        "content-disposition": zipDisposition,
        "x-symbol-export-file-count": "3",
        "x-symbol-export-exported-kinds": "ac-breaker,ac-bus",
        "x-symbol-export-skipped-kinds": "",
        "x-symbol-export-missing-kinds": ""
      },
      bytes: zipBytes
    }));
    const saved: Array<Record<string, unknown>> = [];
    const messages: unknown[][] = [];
    const exportStandalone = createExportComponentSymbolsStandalone({
      saveBlobFile: async (payload: Record<string, unknown>) => {
        saved.push(payload);
        return true;
      },
      setSymbolExportSchemesStatus: () => undefined,
      showGlobalMessage: (...args: unknown[]) => messages.push(args),
      writeOperationLog: () => undefined
    });

    const ok = await exportStandalone([
      templateOf("ac-breaker"),
      templateOf("ac-breaker"),
      templateOf("ac-bus"),
      templateOf("")
    ]);

    expect(ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/webgrp/symbol-export-standalone");
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ kinds: ["ac-breaker", "ac-bus"] });
    // zip 走二进制落盘，文件名取自 content-disposition（服务端给的带时间戳名）
    expect(saved).toHaveLength(1);
    expect(saved[0].filename).toBe("component-symbols-20260101-000000.zip");
    expect(saved[0].mime).toBe("application/zip");
    expect(saved[0].extensions).toEqual([".zip"]);
    expect(saved[0].blob).toBeInstanceOf(Blob);
    const blobBytes = new Uint8Array(await (saved[0].blob as Blob).arrayBuffer());
    expect([...blobBytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(messages[0][1]).toBe("success");
    // 文件数（3）可能多于图元数（2，多状态一状态一文件），提示里两个数都要有
    expect(String(messages[0][0])).toContain("2 个图元");
    expect(String(messages[0][0])).toContain("3 个 SVG 文件");
    expect(String(messages[0][0])).toContain("component-symbols-20260101-000000.zip");
  });

  test("单图元：后端直接回 svg（不套 zip），按 image/svg+xml 落盘", async () => {
    stubBinaryFetch(() => ({
      contentType: "image/svg+xml; charset=utf-8",
      headers: {
        "content-disposition": 'attachment; filename="ac-breaker.svg"; filename*=UTF-8\'\'ac-breaker.svg',
        "x-symbol-export-file-count": "1",
        "x-symbol-export-exported-kinds": "ac-breaker"
      },
      bytes: new TextEncoder().encode("<svg><rect/></svg>")
    }));
    const saved: Array<Record<string, unknown>> = [];
    const messages: unknown[][] = [];
    const exportStandalone = createExportComponentSymbolsStandalone({
      saveBlobFile: async (payload: Record<string, unknown>) => {
        saved.push(payload);
        return true;
      },
      setSymbolExportSchemesStatus: () => undefined,
      showGlobalMessage: (...args: unknown[]) => messages.push(args),
      writeOperationLog: () => undefined
    });

    expect(await exportStandalone([templateOf("ac-breaker")])).toBe(true);
    expect(saved[0].filename).toBe("ac-breaker.svg");
    expect(saved[0].mime).toBe("image/svg+xml");
    expect(saved[0].extensions).toEqual([".svg"]);
    expect(String(messages[0][0])).toContain("已独立导出图元 SVG");
  });

  test("content-disposition 里被 encodeURIComponent 的中文名要解回来", async () => {
    const encoded = encodeURIComponent("图元-独立导出-20260101-000000.zip");
    stubBinaryFetch(() => ({
      contentType: "application/zip",
      headers: {
        // 只写 RFC 5987 形态，验证 filename* 优先与解码
        "content-disposition": `attachment; filename*=UTF-8''${encoded}`,
        "x-symbol-export-file-count": "1",
        "x-symbol-export-exported-kinds": "ac-bus"
      },
      bytes: new Uint8Array([0x50, 0x4b])
    }));
    const saved: Array<Record<string, unknown>> = [];
    const exportStandalone = createExportComponentSymbolsStandalone({
      saveBlobFile: async (payload: Record<string, unknown>) => {
        saved.push(payload);
        return true;
      },
      setSymbolExportSchemesStatus: () => undefined,
      showGlobalMessage: () => undefined,
      writeOperationLog: () => undefined
    });

    expect(await exportStandalone([templateOf("ac-bus")])).toBe(true);
    expect(saved[0].filename).toBe("图元-独立导出-20260101-000000.zip");
  });

  test("后端报错时如实上抛消息，不落盘", async () => {
    stubBinaryFetch(() => ({
      status: 404,
      body: { error: { code: "template-not-found", message: "所选图元在后端图元库中均不存在：ghost。" } }
    }));
    const messages: unknown[][] = [];
    let savedCount = 0;
    const exportStandalone = createExportComponentSymbolsStandalone({
      saveBlobFile: async () => {
        savedCount += 1;
        return true;
      },
      setSymbolExportSchemesStatus: () => undefined,
      showGlobalMessage: (...args: unknown[]) => messages.push(args),
      writeOperationLog: () => undefined
    });

    expect(await exportStandalone([templateOf("ghost")])).toBe(false);
    expect(savedCount).toBe(0);
    expect(String(messages[0][0])).toContain("所选图元在后端图元库中均不存在");
    expect(messages[0][1]).toBe("error");
  });

  test("空选不发请求；missingKinds 降级 warning", async () => {
    const calls = stubBinaryFetch(() => ({
      contentType: "application/zip",
      headers: {
        "x-symbol-export-file-count": "1",
        "x-symbol-export-exported-kinds": "ac-breaker",
        "x-symbol-export-missing-kinds": "ac-ghost"
      },
      bytes: new Uint8Array([0x50, 0x4b])
    }));
    const messages: unknown[][] = [];
    const exportStandalone = createExportComponentSymbolsStandalone({
      saveBlobFile: async () => true,
      setSymbolExportSchemesStatus: () => undefined,
      showGlobalMessage: (...args: unknown[]) => messages.push(args),
      writeOperationLog: () => undefined
    });

    expect(await exportStandalone([])).toBe(false);
    expect(await exportStandalone(null)).toBe(false);
    expect(calls).toHaveLength(0);
    // 两次空选各提示一次「请至少选择一个」，之后成功消息排在第 3 条
    expect(String(messages[0][0])).toContain("请至少选择一个");
    expect(String(messages[1][0])).toContain("请至少选择一个");

    expect(await exportStandalone([templateOf("ac-breaker"), templateOf("ac-ghost")])).toBe(true);
    expect(messages[2][1]).toBe("warning");
    expect(String(messages[2][0])).toContain("保存图元库");
  });
});

describe("方案读写", () => {
  test("保存方案：id 按名称派生，PUT 整个方案集到 /symbol-export-schemes", async () => {
    const calls = stubFetch(() => ({ body: { ok: true } }));
    let schemes: Array<Record<string, unknown>> = [];
    const saveScheme = createSaveSymbolExportScheme({
      symbolExportSchemes: schemes,
      setSymbolExportSchemes: (next: Array<Record<string, unknown>>) => {
        schemes = next;
      },
      setSymbolExportSchemesStatus: () => undefined,
      showGlobalMessage: () => undefined,
      writeOperationLog: () => undefined
    });

    expect(
      await saveScheme({ name: "开关族", templateKinds: ["ac-breaker"], filterKeys: ["stateful"] })
    ).toBe(true);

    expect(schemes).toHaveLength(1);
    // 与后端 normalizeSymbolExportSchemes 的缺省派生同口径：重新打开后仍能按 id 命中
    expect(schemes[0].id).toBe("scheme-开关族");
    expect(calls[0].url).toBe("/webgrp/symbol-export-schemes");
    expect(calls[0].init?.method).toBe("PUT");
    expect(JSON.parse(String(calls[0].init?.body)).schemes[0].name).toBe("开关族");
  });

  test("保存方案：空名称直接拒绝，不发请求", async () => {
    const calls = stubFetch(() => ({ body: { ok: true } }));
    const messages: unknown[][] = [];
    const saveScheme = createSaveSymbolExportScheme({
      symbolExportSchemes: [],
      setSymbolExportSchemes: () => undefined,
      setSymbolExportSchemesStatus: () => undefined,
      showGlobalMessage: (...args: unknown[]) => messages.push(args),
      writeOperationLog: () => undefined
    });

    expect(await saveScheme({ name: "   ", templateKinds: [], filterKeys: [] })).toBe(false);
    expect(calls).toHaveLength(0);
    expect(String(messages[0][0])).toContain("方案名称");
  });

  test("加载方案：把后端返回写进本地状态", async () => {
    stubFetch(() => ({
      body: {
        schemes: [
          { id: "s1", name: "甲", templateKinds: ["ac-breaker"], filterKeys: ["stateful"], updatedAt: "2026-01-01T00:00:00.000Z" }
        ]
      }
    }));
    let schemes: Array<Record<string, unknown>> = [];
    let statusMessage = "";
    const load = createLoadSymbolExportSchemes({
      setSymbolExportSchemes: (next: Array<Record<string, unknown>>) => {
        schemes = next;
      },
      setSymbolExportSchemesStatus: (next: string) => {
        statusMessage = next;
      },
      writeOperationLog: () => undefined
    });

    const result = await load();

    expect(result).toHaveLength(1);
    expect(schemes[0].name).toBe("甲");
    expect(statusMessage).toContain("1");
  });

  test("删除方案：本地与后端同步移除", async () => {
    const calls = stubFetch(() => ({ body: { ok: true } }));
    let schemes: Array<Record<string, unknown>> = [
      { id: "scheme-甲", name: "甲", templateKinds: [], filterKeys: [], updatedAt: "" },
      { id: "scheme-乙", name: "乙", templateKinds: [], filterKeys: [], updatedAt: "" }
    ];
    const remove = createDeleteSymbolExportScheme({
      symbolExportSchemes: schemes,
      setSymbolExportSchemes: (next: Array<Record<string, unknown>>) => {
        schemes = next;
      },
      setSymbolExportSchemesStatus: () => undefined,
      writeOperationLog: () => undefined
    });

    expect(await remove("scheme-甲")).toBe(true);
    expect(schemes.map((scheme) => scheme.name)).toEqual(["乙"]);
    expect(calls[0].init?.method).toBe("PUT");
    expect(JSON.parse(String(calls[0].init?.body)).schemes.map((s: { name: string }) => s.name)).toEqual(["乙"]);
  });

  test("删除不存在的方案：不发请求、直接返回 false", async () => {
    const calls = stubFetch(() => ({ body: { ok: true } }));
    const remove = createDeleteSymbolExportScheme({
      symbolExportSchemes: [],
      setSymbolExportSchemes: () => undefined,
      setSymbolExportSchemesStatus: () => undefined,
      writeOperationLog: () => undefined
    });

    expect(await remove("nope")).toBe(false);
    expect(calls).toHaveLength(0);
  });
});
