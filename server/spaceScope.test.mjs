// 端到端空间隔离集成测试（Task 15）：起真实 server，两个空间的数据互不可见。
// 与各 per-domain 单测（spaceDispatch / spaceConfigPaths / spaceImagePaths / spaceExportPaths /
// spaceGlobalLines / spaceApi / sessionSpaceFilter / spaceCors）的分工：这里不重测派发注入的
// 内部细节，而是在同一个会话里把方案 / 图元库 / 配色 / 图片 / 全局线路 / ZIP 导出串起来，
// 证明跨域一致隔离 —— 单个域修好了、另一个域漏注入 paths 这类缺陷由本文件兜住。
//
// 注意：HTTP 头值只能是 ByteString，非 ASCII 空间名在 X-Space 头与 Cookie 里必须
// percent-encode（服务端各自解码一次）；?space= 由 URLSearchParams 解码，故也必须编码、且只编一次。
import { expect, test, beforeAll, afterAll } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

installDomShim();

const SPACE = "张三";
// 显式来源用的名字，注册表里绝不存在
const GONE = "没了";
const SPACE_HEADER = encodeURIComponent(SPACE);
const SPACE_QUERY = `?space=${encodeURIComponent(SPACE)}`;
const SCHEME = "默认方案";
const PNG_1X1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

let dataDir; let server; let baseUrl;

const jsonBody = (payload) => ({ "content-type": "application/json", body: JSON.stringify(payload) });
const asZhang = (init = {}) => ({ ...init, headers: { ...(init.headers ?? {}), "x-space": SPACE_HEADER } });

const busNode = {
  id: "bus1", kind: "ac-bus", name: "母线1",
  position: { x: 120, y: 80 }, size: { width: 120, height: 16 },
  rotation: 0, scale: 1, layerId: "default", terminals: [],
  params: { name: "母线1", vbase: "10" }
};
// 带一个真实设备：ZIP 用例要现场生成 .e / .svg，空模型的渲染路径无人验证过
const projectFor = (name) => ({
  version: 1, name, modelType: "厂站", canvasWidth: 800, canvasHeight: 400,
  layers: [{ id: "default", name: "默认图层", visible: true }],
  activeLayerId: "default", nodes: [busNode], edges: []
});

const saveProjectAsZhang = (name) => fetch(`${baseUrl}/webgrp/schemes/project`, asZhang({
  method: "PUT",
  ...jsonBody({ schemePath: [SCHEME], name, project: projectFor(name) })
}));
const saveProjectAsDefault = (name) => fetch(`${baseUrl}/webgrp/schemes/project`, {
  method: "PUT",
  ...jsonBody({ schemePath: [SCHEME], name, project: projectFor(name) })
});

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "space-scope-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  // 前置：两个空间的存在性由本文件自己造，不依赖仓库 data/
  const created = await fetch(`${baseUrl}/webgrp/spaces`, { method: "POST", ...jsonBody({ name: SPACE }) });
  expect(created.status).toBe(200);
  expect((await created.json()).id).toBe(SPACE);
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

test("方案只落在写入者所在空间", async () => {
  const save = await saveProjectAsZhang("测试模型");
  expect(save.status).toBe(200);

  const zhangTree = await fetch(`${baseUrl}/webgrp/schemes`, asZhang()).then((r) => r.json());
  const defTree = await fetch(`${baseUrl}/webgrp/schemes`).then((r) => r.json());
  expect(JSON.stringify(zhangTree)).toContain("测试模型");
  expect(JSON.stringify(defTree)).not.toContain("测试模型");

  // 落盘位置单独断言：读接口也可以各读各的，写接口却把两空间写进同一根。
  // 只写「张三根下有」分不清「写对了」与「两边都写了」，故配一条反向断言。
  expect(existsSync(join(dataDir, "workspaces", SPACE, "schemes", "files", SCHEME, "测试模型.json"))).toBe(true);
  expect(existsSync(join(dataDir, "schemes", "files", SCHEME, "测试模型.json"))).toBe(false);
});

test("图元库按空间隔离", async () => {
  const put = await fetch(`${baseUrl}/webgrp/device-library`, asZhang({
    method: "PUT",
    ...jsonBody({ customDeviceTemplates: [{ kind: "张三专用" }] })
  }));
  expect(put.status).toBe(200);

  const zhangLib = await fetch(`${baseUrl}/webgrp/device-library`, asZhang()).then((r) => r.json());
  const defLib = await fetch(`${baseUrl}/webgrp/device-library`).then((r) => r.json());
  expect(JSON.stringify(zhangLib)).toContain("张三专用");
  expect(JSON.stringify(defLib)).not.toContain("张三专用");
});

test("配色配置按空间隔离", async () => {
  const put = await fetch(`${baseUrl}/webgrp/color-config`, asZhang({
    method: "PUT",
    ...jsonBody({ colorDisplayMode: "voltage", colorPalette: { voltage: { x: "#010203" } } })
  }));
  expect(put.status).toBe(200);

  const zhangColor = await fetch(`${baseUrl}/webgrp/color-config`, asZhang()).then((r) => r.json());
  const defColor = await fetch(`${baseUrl}/webgrp/color-config`).then((r) => r.json());
  expect(zhangColor.colorDisplayMode).toBe("voltage");
  // 调色板值一起断言：该 GET 走 sendCachedJsonFile，缓存键是 filePath；
  // 键取常量时两空间会互相回放**载荷**，只比 mode 会漏掉「回放到同名默认值」的情形
  expect(zhangColor.colorPalette.voltage).toEqual({ x: "#010203" });
  expect(defColor.colorDisplayMode).toBe("energy");
  expect(defColor.colorPalette.voltage).toEqual({});
});

test("图片按空间隔离", async () => {
  const res = await fetch(`${baseUrl}/webgrp/images`, asZhang({
    method: "POST",
    ...jsonBody({ dataUrl: PNG_1X1, name: "张三图.png" })
  }));
  expect(res.status).toBe(201);

  const images = await fetch(`${baseUrl}/webgrp/images`, asZhang()).then((r) => r.json());
  const defImages = await fetch(`${baseUrl}/webgrp/images`).then((r) => r.json());
  expect(images.map((item) => item.name)).toEqual(["张三图.png"]);
  expect(defImages).toHaveLength(0);
});

test("显式未知空间 400，隐式未知回退并带 X-Space-Fallback", async () => {
  const explicit = await fetch(`${baseUrl}/webgrp/schemes`, { headers: { "x-space": encodeURIComponent(GONE) } });
  expect(explicit.status).toBe(400);
  expect((await explicit.json()).error.code).toBe("SPACE_UNKNOWN");

  // 隐式来源（Cookie）未知时静默回退：旧书签、清过 cookie 的浏览器不该白屏
  const implicit = await fetch(`${baseUrl}/webgrp/schemes`, { headers: { cookie: `gmp_space=${encodeURIComponent(GONE)}` } });
  expect(implicit.status).toBe(200);
  expect(implicit.headers.get("x-space-fallback")).toBe("1");
});

test("无任何来源的写请求回退 default，且 default 复用数据根（不建 workspaces/default）", async () => {
  const res = await saveProjectAsDefault("匿名模型");
  expect(res.status).toBe(200);

  // 「回退 default」这条语义唯一可观测的落点是写盘位置：
  // default 空间根 === 数据根，故文件直接出现在 dataDir/schemes 下。
  expect(existsSync(join(dataDir, "schemes", "files", SCHEME, "匿名模型.json"))).toBe(true);
  expect(existsSync(join(dataDir, "workspaces", "default"))).toBe(false);
  expect(existsSync(join(dataDir, "workspaces", SPACE))).toBe(true);
});

test("非 default 空间的方案 ZIP 导出只打包本空间的模型", async () => {
  // 两空间各写一个同名方案、不同名模型作为对照：导出根若忽略空间，
  // 会枚举到默认空间那份，ZIP 里出现「默认模型.json」。
  expect((await saveProjectAsZhang("空间模型")).status).toBe(200);
  expect((await saveProjectAsDefault("默认模型")).status).toBe(200);

  const res = await fetch(
    `${baseUrl}/webgrp/v1/schemes/export?schemePath=${encodeSchemePath([SCHEME])}`,
    asZhang()
  );
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("zip");

  const AdmZip = (await import("adm-zip")).default;
  const names = new AdmZip(Buffer.from(await res.arrayBuffer())).getEntries().map((entry) => entry.entryName);
  expect(names).toContain(`${SCHEME}/空间模型.json`);
  expect(names.some((name) => name.endsWith("默认模型.json"))).toBe(false);
});

test("全局线路按空间隔离", async () => {
  const attach = await fetch(`${baseUrl}/webgrp/global-lines/attach`, asZhang({
    method: "POST",
    ...jsonBody({
      energyType: "ac",
      name: "端到端探针线路",
      node: { name: "端到端探针线路" },
      reference: { schemePath: [SCHEME], projectName: "空间模型", nodeId: "line-a", boundaryEndpoint: "source" }
    })
  }));
  expect(attach.status).toBe(201);

  const zhang = await fetch(`${baseUrl}/webgrp/global-lines`, asZhang()).then((r) => r.json());
  const def = await fetch(`${baseUrl}/webgrp/global-lines`).then((r) => r.json());
  // 空对空分不出「两套注册表」与「共用一套」：两侧都必须断言
  expect(zhang.records.map((record) => record.name)).toEqual(["端到端探针线路"]);
  expect(def.records).toHaveLength(0);
});

// ?space= 通道只在这里出现一次：它与 X-Space 头走同一解析函数，但编码方向相反
// （此处不 encodeURIComponent 就会把中文原样塞进 URL，服务端解码后查不到 → 400）。
// 自写自读，不依赖前面用例留下的数据。
test("?space= 通道与 X-Space 头落到同一空间", async () => {
  const name = "查询通道模型";
  const save = await fetch(`${baseUrl}/webgrp/schemes/project${SPACE_QUERY}`, {
    method: "PUT",
    ...jsonBody({ schemePath: [SCHEME], name, project: projectFor(name) })
  });
  expect(save.status).toBe(200);

  const byHeader = await fetch(`${baseUrl}/webgrp/schemes`, asZhang());
  const byQuery = await fetch(`${baseUrl}/webgrp/schemes${SPACE_QUERY}`);
  expect(await byHeader.text()).toContain(name);
  expect(await byQuery.text()).toContain(name);
  // 命中真实空间，不回退；默认空间看不见这份数据
  expect(byQuery.headers.get("x-space-fallback")).toBeNull();
  expect(await fetch(`${baseUrl}/webgrp/schemes`).then((r) => r.text())).not.toContain(name);
});
