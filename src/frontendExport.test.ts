import { describe, expect, test, vi } from "vitest";
import { encodeGbk } from "./encoding/gbk";
import {
  buildFrontendExportArtifacts,
  sendFrontendExportArtifacts,
  type FrontendExportScope
} from "./frontendExport";

const project = {
  version: 1,
  name: "测试模型",
  idx: 7,
  canvasWidth: 800,
  canvasHeight: 600,
  nodes: [],
  edges: [],
  measurements: { groups: [] }
} as any;

function scope(overrides: Partial<FrontendExportScope> = {}): FrontendExportScope {
  return {
    frontendExportMode: "frontend",
    frontendBackendOrigin: "https://receiver.example",
    projectName: project.name,
    activeProjectKey: "project-7",
    activeSchemeKey: "scheme-1",
    schemePathForScheme: () => ["默认方案"],
    currentProject: () => project,
    nodes: project.nodes,
    edges: project.edges,
    libraryTemplates: [],
    measurementConfig: { measurementTypes: [] },
    imageAssets: {},
    imageAssetList: [],
    colorDisplayMode: "voltage",
    colorPalette: {},
    safeFilePart: (name: string) => name,
    ...overrides
  };
}

describe("frontend export mode", () => {
  test("builds CIM, E, and SVG artifacts with the required encodings", () => {
    const artifacts = buildFrontendExportArtifacts(scope(), project);

    expect(Object.keys(artifacts)).toEqual(["cim", "e", "svg"]);
    expect(artifacts.cim.encoding).toBe("utf-8");
    expect(artifacts.svg.encoding).toBe("utf-8");
    expect(artifacts.e.encoding).toBe("gbk");
    expect(Array.from(artifacts.e.bytes)).toEqual(Array.from(encodeGbk(artifacts.e.text)));
    expect(new TextDecoder().decode(artifacts.cim.bytes)).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(new TextDecoder().decode(artifacts.svg.bytes)).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  test("POSTs one multipart file to each configured format URL", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendFrontendExportArtifacts(scope(), project);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const calls = new Map((fetchMock.mock.calls as unknown as Array<[string, RequestInit]>).map(([url, init]) => [String(url), init]));
    for (const format of ["cim", "e", "svg"] as const) {
      const url = `https://receiver.example/export/${format}`;
      const init = calls.get(url);
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);
      const body = init?.body as FormData;
      expect(body.get("model_name")).toBe("测试模型");
      expect(body.get("model_id")).toBe("7");
      expect(body.get("scheme_path")).toBe(JSON.stringify(["默认方案"]));
      expect(body.get(`${format}_file`)).toBeInstanceOf(File);
    }

    vi.unstubAllGlobals();
  });

  test("fails clearly when frontend mode has no target URL", async () => {
    await expect(sendFrontendExportArtifacts(scope({
      frontendBackendOrigin: ""
    }), project)).rejects.toThrow("未配置前端模式后端地址");
  });

  test("times out a hanging external receiver", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = expect(sendFrontendExportArtifacts(scope({ frontendExportTimeoutMs: 10 }), project))
      .rejects.toThrow("前端模式导出发送超时");
    await vi.advanceTimersByTimeAsync(11);
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
