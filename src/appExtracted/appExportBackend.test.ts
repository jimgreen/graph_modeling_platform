import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createExportEFile, createExportJsonFile, createExportSvg, createExportSvgFile } from "./appDeviceDefinitionFactories";
import { encodeGbk } from "../encoding/gbk";

// ── 全局基线：关隔离后本文件对 globalThis 的唯一隐式依赖 ──────────────────
//
// 事实链（改动前每轮都可能踩，取决于别的文件谁先跑）：
//   ① src/globalMessage.ts 末尾三行是**模块级副作用**：
//      `(window as any).showGlobalMessage = showGlobalMessage`（第 163 行）。node 环境本没有 window，
//      只有当别的文件先把 window 桩成 globalThis（globalMessage.test.ts:141 正是如此）再 import 该模块，
//      这行才落得到 globalThis 上 —— test-setup.ts 装的那个空桩于是被**永久**顶掉。
//   ② test-setup.ts 的兜底带守卫（`if (typeof showGlobalMessage !== "function")`），
//      所以后续任何一次 setup 都不会把它补回来；globalMessage.test.ts 自己的 afterEach 也只还 window/document，
//      还不到 showGlobalMessage 上。没人能自愈。
//   ③ showStandaloneExportCompletion（appDeviceDefinitionFactories.tsx:2613）在 __appScope 里没有
//      setExportCompletionDialog 时退到**裸全局** showGlobalMessage（该文件没 import 它，就是全局）。
//      那条真实 DOM 实现第一句就碰 document，在 node 环境炸：ReferenceError: document is not defined
//      （globalMessage.ts:23 getContainer ← 38 showGlobalMessage）。
//   ④ 本文件 makeScope() 的基座刻意不含 setExportCompletionDialog —— 6 条用例要验的正是这条回落，
//      所以 12 条里有 6 条踩到它（E 文件 3 条、SVG 单文件 1 条、JSON 单文件 1 条、bundle 1 条）。
//
// 结论：「全局 showGlobalMessage 恰好还是空桩」从来不是本文件的契约，而是别人 import 顺序的副作用。
// 改法：把依赖的键在 beforeEach 显式钉死成基线，afterEach 逐键精确还原 —— 不看桩表/模块注册表脸色。
const globalBaseline = new Map<string, PropertyDescriptor | undefined>();
// 本文件自己动过的全局，逐键记账：showGlobalMessage（生产代码回落路径读它）、
// fetch（每条用例都桩）、window（bundle 那条桩 showDirectoryPicker）。
const MANAGED_GLOBALS = ["showGlobalMessage", "fetch", "window"] as const;

beforeEach(() => {
  globalBaseline.clear();
  for (const key of MANAGED_GLOBALS) {
    // 快照的是「本文件进来时的值」，不是「node 原始值」：前一个文件漏了什么不该由本文件来擦，
    // 但也不能由本文件带出去 —— 所以只对自己动过的键负责。
    globalBaseline.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  }
  // 显式钉死：不管 globalThis 上此刻挂着的是 test-setup 的空桩还是 globalMessage.ts 的真实 DOM 实现，
  // 本文件都只认这个空桩。真实 DOM 实现要 document，而这里是 node 环境。
  vi.stubGlobal("showGlobalMessage", () => {});
});

afterEach(() => {
  // 逐键精确还原，属性描述符原样写回（保住 getter/setter 形状，只赋 value 会丢）。
  //
  // 不用 vi.unstubAllGlobals()：桩表是 **worker 级单例** —— vitest 把 `const _stubsGlobal = new Map()`
  // 放在 dist/chunks/vi.*.js 的模块作用域里，stubGlobal/unstubAllGlobals 共用它。关隔离后同一个 worker
  // 里所有文件共用这一张表，一调 unstubAllGlobals 就会清掉**别的文件**装的桩（例如
  // appDeviceDefinitionRenderers.lodEvent.test.ts 顶层那个 Element 桩）。那正是 isolate:false 下最难查的一类偶发红。
  // 本文件改前每条用例末尾都调它，恰好就是这种「替别人擦 + 擦不属于自己的」双向风险源。
  //
  // 也不用 delete：那会把 test-setup.ts 装的 showGlobalMessage/Confirm 一并带走，
  // 后面追加的用例只能对着 undefined 打桩（表现为「看不到文本」而非响亮失败）。
  for (const [key, descriptor] of globalBaseline) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  globalBaseline.clear();
});

function makeScope(overrides: Record<string, any> = {}) {
  const saved: any[] = [];
  return {
    saved,
    scope: {
      activeSchemeKey: "s1",
      ensureSavedBeforeExport: () => true,
      schemePathForScheme: () => ["默认方案"],
      projectName: "线路",
      safeFilePart: (name: string) => name,
      writeOperationLog: () => {},
      saveLazyTextFile: async (options: any) => {
        saved.push({ filename: options.filename, text: await options.loadText() });
        return true;
      },
      saveTextFile: async () => true,
      showStandaloneExportCompletion: () => {},
      ...overrides
    }
  };
}

describe("createExportEFile 走后端", () => {
  test("从 /v1/schemes/model/e-file 拉取文本并交给保存层", async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response("<Model>\n</Model>\n", {
      status: 200,
      headers: { "content-type": "text/plain; charset=gbk" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { saved, scope } = makeScope({ apiPath: (p: string) => p });
    await createExportEFile(scope)("gbk");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/v1/schemes/model/e-file");
    expect(url).toContain("encoding=gbk");
    expect(saved[0].filename).toBe("线路.e");
    expect(saved[0].text).toContain("<Model>");
  });

  // 回归：界面已加载预定义模板（只读态）时导出必须带 template 参数。
  // 不带时后端只能读磁盘库，界面态与库态一旦漂移（落盘失败/多端并发/手动还原）就静默缺列
  // ——实测桌面「标准场站-国网E格式模板.e」缺 runstat 列，而 ?template= 产物有。
  test("预定义模板只读态带 template 参数，自定义态不带", async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response("<Model/>", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    const templated = makeScope({
      apiPath: (p: string) => p,
      eDeviceInterfaceLoadedTemplateName: "国网E格式",
      eDeviceInterfaceReadonlyMode: true
    });
    await createExportEFile(templated.scope)("utf-8");
    expect(decodeURIComponent(String(fetchMock.mock.calls[0][0]))).toContain("template=国网E格式");

    fetchMock.mockClear();
    const customized = makeScope({
      apiPath: (p: string) => p,
      eDeviceInterfaceLoadedTemplateName: "自定义-国网E格式",
      eDeviceInterfaceReadonlyMode: false
    });
    await createExportEFile(customized.scope)("utf-8");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("template=");
  });

  test("GBK 响应字节按请求编码解码：中文不损坏", async () => {
    // 真实 GBK 字节 + charset=gbk 头：Body.text() 恒按 UTF-8 解码会把「中文模型」变成 U+FFFD，此用例钉住该缺陷
    // 拷贝为标准 ArrayBuffer 字节：Uint8Array<ArrayBufferLike> 不能直接作 BodyInit
    const gbkBytes = new Uint8Array(encodeGbk("<Model>\n# 测试方案 中文模型\n</Model>\n"));
    vi.stubGlobal("fetch", vi.fn(async (_url: string) => new Response(gbkBytes.buffer, {
      status: 200,
      headers: { "content-type": "text/plain; charset=gbk" }
    })));
    const { saved, scope } = makeScope({ apiPath: (p: string) => p });
    await createExportEFile(scope)("gbk");
    expect(saved[0].text).toContain("中文模型");
    expect(saved[0].text).not.toContain("�");
  });

  test("后端告警头重建未导出设备明细（含截断提示）", async () => {
    const header = encodeURIComponent(JSON.stringify({
      total: 25,
      items: [{ nodeName: "风机1", kind: "wind-turbine", reason: "类没有对应的 E 文件段定义。" }]
    }));
    vi.stubGlobal("fetch", vi.fn(async (_url: string) => new Response("<Model>\n</Model>\n", {
      status: 200,
      headers: { "content-type": "text/plain; charset=gbk", "x-e-file-warnings": header }
    })));
    const completions: any[] = [];
    const { scope } = makeScope({
      apiPath: (p: string) => p,
      setExportCompletionDialog: (payload: any) => completions.push(payload)
    });
    await createExportEFile(scope)("gbk");
    expect(completions[0].details).toEqual([
      "有 25 个图上设备未导出到 E 文件：",
      "- 风机1（wind-turbine）：类没有对应的 E 文件段定义。",
      "... 还有 24 个设备未列出。"
    ]);
  });

  test("告警头缺失或损坏时不抛错且无明细", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string) => new Response("<Model>\n</Model>\n", {
      status: 200,
      headers: { "content-type": "text/plain; charset=gbk", "x-e-file-warnings": "%%%not-json" }
    })));
    const completions: any[] = [];
    const { scope } = makeScope({
      apiPath: (p: string) => p,
      setExportCompletionDialog: (payload: any) => completions.push(payload)
    });
    await createExportEFile(scope)("gbk");
    expect(completions[0].details).toBeUndefined();
  });

  test("告警头仅含 total（字节封顶丢明细）时给出首行与未列出提示", async () => {
    const header = encodeURIComponent(JSON.stringify({ total: 3 }));
    vi.stubGlobal("fetch", vi.fn(async (_url: string) => new Response("<Model>\n</Model>\n", {
      status: 200,
      headers: { "content-type": "text/plain; charset=gbk", "x-e-file-warnings": header }
    })));
    const completions: any[] = [];
    const { scope } = makeScope({
      apiPath: (p: string) => p,
      setExportCompletionDialog: (payload: any) => completions.push(payload)
    });
    await createExportEFile(scope)("gbk");
    expect(completions[0].details).toEqual([
      "有 3 个图上设备未导出到 E 文件：",
      "... 还有 3 个设备未列出。"
    ]);
  });

  test("后端报错时提示 v1 信封消息且不落盘", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, error: { code: "not-found", message: "模型不存在。" } }), { status: 404 })));
    const messages: string[] = [];
    const { saved, scope } = makeScope({ apiPath: (p: string) => p, showGlobalMessage: (message: string) => messages.push(message) });
    await createExportEFile(scope)("gbk");
    expect(saved).toHaveLength(0);
    // backendErrorMessage 需解析 { error: { code, message } }，而非回落 fallback
    expect(messages).toEqual(["模型不存在。"]);
  });
});

describe("createExportSvgFile 走后端", () => {
  test("从 /v1/schemes/model/svg 拉取 SVG（colorMode=voltage）并交给保存层", async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response('<svg xmlns="http://www.w3.org/2000/svg"/>', {
      status: 200,
      headers: { "content-type": "image/svg+xml; charset=utf-8" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    // 不给 buildSvgDocument 等本地渲染依赖：实现若仍本地生成就会失败
    const { saved, scope } = makeScope();
    await createExportSvgFile(scope)("utf-8");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/v1/schemes/model/svg");
    expect(url).toContain("colorMode=voltage");
    expect(url).toContain("encoding=utf-8");
    expect(url).toContain(encodeURIComponent(JSON.stringify(["默认方案"])));
    expect(url).toContain(encodeURIComponent("线路"));
    expect(saved[0].filename).toBe("线路.svg");
    // XML 声明由后端产出，前端不再前置：响应体原样落盘
    expect(saved[0].text).toBe('<svg xmlns="http://www.w3.org/2000/svg"/>');
  });

  test("后端报错时提示消息且不落盘", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, error: { code: "not-found", message: "模型不存在。" } }), { status: 404 })));
    const messages: string[] = [];
    const { saved, scope } = makeScope({ apiPath: (p: string) => p, showGlobalMessage: (message: string) => messages.push(message) });
    await createExportSvgFile(scope)("utf-8");
    expect(saved).toHaveLength(0);
    expect(messages).toEqual(["模型不存在。"]);
  });
});

describe("createExportJsonFile 走后端", () => {
  test("从 /v1/schemes/model/json 拉取 project 并存为压缩 JSON", async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify({
      ok: true,
      data: { project: { version: 1, name: "线路", nodes: [], edges: [] } }
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    // 不给 serializeProject/currentProject：实现若仍本地序列化实时态就会失败
    const { saved, scope } = makeScope({ apiPath: (p: string) => p });
    await createExportJsonFile(scope)("utf-8");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/v1/schemes/model/json");
    expect(url).toContain(encodeURIComponent(JSON.stringify(["默认方案"])));
    expect(url).toContain(encodeURIComponent("线路"));
    expect(saved[0].filename).toBe("线路.json");
    expect(JSON.parse(saved[0].text)).toEqual({ version: 1, name: "线路", nodes: [], edges: [] });
  });

  test("后端报错时提示消息且不落盘", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, error: { code: "not-found", message: "模型不存在。" } }), { status: 404 })));
    const messages: string[] = [];
    const { saved, scope } = makeScope({ apiPath: (p: string) => p, showGlobalMessage: (message: string) => messages.push(message) });
    await createExportJsonFile(scope)("utf-8");
    expect(saved).toHaveLength(0);
    expect(messages).toEqual(["模型不存在。"]);
  });
});

describe("createExportSvg bundle 走后端", () => {
  test("E、JSON 与 SVG 全部从后端拉取后写入同一目录", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const target = String(url);
      if (target.includes("/v1/schemes/model/json")) {
        return new Response(JSON.stringify({ ok: true, data: { project: { version: 1, name: "线路" } } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (target.includes("/v1/schemes/model/e-file")) {
        return new Response("<Model/>", {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" }
        });
      }
      return new Response("<svg/>", {
        status: 200,
        headers: { "content-type": "image/svg+xml; charset=utf-8" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { showDirectoryPicker: vi.fn(async () => ({ name: "exports" })) });
    const writes: any[] = [];
    const { scope } = makeScope({
      // 不给 buildEFileExport/currentProject：实现若仍本地生成 E 就会失败
      writeTextFileToDirectory: async (_handle: any, filename: string, text: string, mime: string, encoding: string) => {
        writes.push({ filename, text, mime, encoding });
      }
    });
    await createExportSvg(scope)("utf-8");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("/v1/schemes/model/e-file"))).toBe(true);
    expect(urls.some((url) => url.includes("/v1/schemes/model/svg") && url.includes("colorMode=voltage"))).toBe(true);
    expect(urls.some((url) => url.includes("/v1/schemes/model/json"))).toBe(true);
    expect(writes.map((write) => write.filename)).toEqual(["线路.e", "线路.json", "线路.svg"]);
    expect(writes[0].text).toBe("<Model/>");
    expect(JSON.parse(writes[1].text)).toEqual({ version: 1, name: "线路" });
    expect(writes[2].text).toContain("<svg");
    expect(writes[2].mime).toBe("image/svg+xml");
  });
});
