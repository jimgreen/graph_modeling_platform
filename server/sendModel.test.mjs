// /webgrp/v1/schemes/model/send 适配层测试：
// tmpdir 种子（模型 + 库配置）→ GRAPH_MODEL_DATA_DIR → 起真实 server（端口 0）
// → 目标端用本地 http 服务器接收，逐项断言 multipart 字段名/文件名/编码字节。
import { describe, expect, test, beforeAll, afterAll, beforeEach } from "vitest";
import http from "node:http";
import iconv from "iconv-lite";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

installDomShim();

const sendPath = apiPath("/v1/schemes/model/send");
const scheme = "发送方案";
const schemePath = encodeSchemePath([scheme]);
const modelName = "厂站模型";

let dataDir;
let server;
let baseUrl;
let sink;
let sinkUrl;
// 接收端返回值可按用例调整（默认 200）
let sinkStatus = 200;
let sinkBody = "ok";
let received = [];

function device(id, kind, name, params, terminals = []) {
  return {
    id,
    kind,
    name,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 40 },
    rotation: 0,
    scale: 1,
    layerId: "default",
    terminals,
    params: { name, ...params }
  };
}

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "send-model-"));
  const dir = join(dataDir, "schemes", "files", scheme);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${modelName}.json`), JSON.stringify({
    name: modelName,
    modelType: "厂站",
    idx: 1,
    canvasWidth: 800,
    canvasHeight: 400,
    nodes: [
      device("bus1", "ac-bus", "母线一", { vbase: "10" }, [
        { id: "t1", anchor: { x: 0.5, y: 0.5 }, type: "ac", nodeNumber: "1", vbase: "10" }
      ]),
      device("load1", "ac-load", "负荷一", { vbase: "10" }, [
        { id: "t1", anchor: { x: 0.5, y: 0 }, type: "ac", nodeNumber: "4" }
      ])
    ],
    edges: []
  }), "utf-8");
  // 第二个模型：idx 故意取 0。兼容路径（schemePath + name）下
  // `modelId: Number(idx) || 0` 会把它归成 0 —— 那个 0 是「没有稳定序号」的哨兵值，
  // 不是「模型 0」。既有守卫里所有模型 idx 都是 1，这条分支从没被走到过。
  writeFileSync(join(dir, "零号模型.json"), JSON.stringify({
    name: "零号模型",
    modelType: "厂站",
    idx: 0,
    canvasWidth: 800,
    canvasHeight: 400,
    nodes: [device("bus0", "ac-bus", "零号母线", { vbase: "10" }, [])],
    edges: []
  }), "utf-8");
  // 第三个模型：完全没有 idx 字段（手写 JSON 的常见情形）
  writeFileSync(join(dir, "无序号模型.json"), JSON.stringify({
    name: "无序号模型",
    modelType: "厂站",
    canvasWidth: 800,
    canvasHeight: 400,
    nodes: [device("busX", "ac-bus", "无序号母线", { vbase: "10" }, [])],
    edges: []
  }), "utf-8");
  // 第四个模型：nodes 里有一个 null 项。手写/外部导入的 JSON 出现这种项很常见，
  // 而 normalizeProjectForStorage 用的是 `node?.params`，不会把它剔掉。
  writeFileSync(join(dir, "坏节点模型.json"), JSON.stringify({
    name: "坏节点模型",
    modelType: "厂站",
    idx: 4,
    canvasWidth: 800,
    canvasHeight: 400,
    nodes: [null],
    edges: []
  }), "utf-8");
  const libDir = join(dataDir, "device-library");
  mkdirSync(libDir, { recursive: true });
  writeFileSync(join(libDir, "library.json"), JSON.stringify({
    schemaVersion: 4,
    customDeviceTemplates: [],
    deviceDefinitionOverrides: {}
  }), "utf-8");

  // 目标端：只收集 body，不做 multipart 解析（断言直接查原始字节）
  sink = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      received.push({ headers: request.headers, body: Buffer.concat(chunks) });
      response.writeHead(sinkStatus, { "content-type": "text/plain" });
      response.end(sinkBody);
    });
  });
  await new Promise((resolve) => sink.listen(0, "127.0.0.1", resolve));
  sinkUrl = `http://127.0.0.1:${sink.address().port}/receive`;

  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (sink) {
    await new Promise((resolve) => sink.close(resolve));
  }
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

beforeEach(() => {
  received = [];
  sinkStatus = 200;
  sinkBody = "ok";
});

function postSend(body, query = `schemePath=${schemePath}&name=${encodeURIComponent(modelName)}`) {
  return fetch(`${baseUrl}${sendPath}?${query}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe(`${sendPath} 参数校验`, () => {
  test("缺 schemePath → 400", async () => {
    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] }, "name=x");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad-request");
  });

  test("url 非 http/https → 400 且不发出请求", async () => {
    const res = await postSend({ url: "file:///etc/passwd", files: [{ kind: "json" }] });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("http");
    expect(received).toHaveLength(0);
  });

  test("files 为空 → 400", async () => {
    const res = await postSend({ url: sinkUrl, files: [] });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("至少");
  });

  test("未知格式 kind → 400", async () => {
    const res = await postSend({ url: sinkUrl, files: [{ kind: "pdf" }] });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("pdf");
  });

  test("模型不存在 → 404", async () => {
    const res = await postSend(
      { url: sinkUrl, files: [{ kind: "json" }] },
      `schemePath=${schemePath}&name=${encodeURIComponent("不存在的模型")}`
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not-found");
  });
});

describe(`${sendPath} 转发`, () => {
  test("四种格式：字段名/文件名/编码字节正确，返回目标状态", async () => {
    const res = await postSend({
      url: sinkUrl,
      files: [
        { kind: "e", encoding: "gbk" },
        { kind: "json", encoding: "utf-8" },
        { kind: "svg", encoding: "utf-8" },
        { kind: "cim", encoding: "utf-8" }
      ]
    });
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe(200);
    expect(payload.data.files.map((file) => file.kind)).toEqual(["e", "json", "svg", "cim"]);

    expect(received).toHaveLength(1);
    const { headers, body } = received[0];
    // 不做人工 multipart 解析：直接查原始字节里的字段名与文件名
    expect(headers["content-type"]).toContain("multipart/form-data; boundary=");
    const structure = body.toString("utf-8");
    expect(structure).toContain('name="model_name"');
    expect(structure).toContain(modelName);
    expect(structure).toContain("sent_at");
    expect(structure).toContain(`name="e_file"; filename="${modelName}.e"`);
    expect(structure).toContain(`name="json_file"; filename="${modelName}.json"`);
    expect(structure).toContain(`name="svg_file"; filename="${modelName}.svg"`);
    expect(structure).toContain(`name="cim_file"; filename="${modelName}.xml"`);
    expect(structure).toContain("text/plain; charset=gbk");
    expect(structure).toContain("application/json; charset=utf-8");
    // E 正文按 GBK 落字节：中文设备名以 GBK 编码出现
    expect(body.includes(iconv.encode("母线一", "gbk"))).toBe(true);
    // JSON 正文按 UTF-8 落字节（同一中文名不可能是 GBK 字节）
    expect(body.includes(Buffer.from("母线一", "utf-8"))).toBe(true);
    // SVG/CIM 的 XML 声明编码随所选编码走
    expect(structure).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  test("E 文件选 UTF-8 时声明与字节同步", async () => {
    const res = await postSend({ url: sinkUrl, files: [{ kind: "e", encoding: "utf-8" }] });
    expect(res.status).toBe(200);
    const body = received[0].body;
    expect(body.toString("utf-8")).toContain("charset=utf-8");
    expect(body.includes(Buffer.from("母线一", "utf-8"))).toBe(true);
  });

  test("SVG 选 GBK 时声明为 GBK 且字节按 GBK", async () => {
    const res = await postSend({ url: sinkUrl, files: [{ kind: "svg", encoding: "gbk" }] });
    expect(res.status).toBe(200);
    const body = received[0].body;
    expect(body.toString("utf-8")).toContain('encoding="GBK"');
    expect(body.includes(iconv.encode("母线一", "gbk"))).toBe(true);
  });

  test("目标返回 500 → 502 且回错误信封（含目标响应片段）", async () => {
    sinkStatus = 500;
    sinkBody = "receiver rejected";
    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] });
    expect(res.status).toBe(502);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.message).toContain("500");
    expect(payload.error.message).toContain("receiver rejected");
  });

  test("目标不可达 → 502", async () => {
    // 端口 1 无监听：连接直接被拒
    const res = await postSend({ url: "http://127.0.0.1:1/receive", files: [{ kind: "json" }] });
    expect(res.status).toBe(502);
    expect((await res.json()).error.message).toContain("无法连接");
  });
});

describe(`${sendPath} 按 modelId 定位模型`, () => {
  test("只给 modelId 也能定位并发送（model_id 随表单下发）", async () => {
    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] }, "modelId=1");
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe(200);

    const { body, headers } = received[0];
    expect(headers["content-type"]).toContain("multipart/form-data; boundary=");
    const structure = body.toString("utf-8");
    // 定位到的模型名与方案路径由后端补全
    expect(structure).toContain(modelName);
    expect(structure).toContain('name="scheme_path"');
    expect(structure).toContain('["发送方案"]');
    expect(structure).toMatch(/name="model_id"[\s\S]{0,40}\r?\n\r?\n1\r?\n/);
    expect(structure).toContain(`name="json_file"; filename="${modelName}.json"`);
  });

  test("modelId 不存在 → 404，且不发出请求", async () => {
    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] }, "modelId=987654");
    expect(res.status).toBe(404);
    expect((await res.json()).error.message).toContain("987654");
    expect(received).toHaveLength(0);
  });

  test("modelId 非正整数 → 400", async () => {
    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] }, "modelId=0");
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("正整数");
  });

  test("兼容路径：schemePath + name 仍可用，并补出 model_id", async () => {
    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] });
    expect(res.status).toBe(200);
    const structure = received[0].body.toString("utf-8");
    expect(structure).toMatch(/name="model_id"[\s\S]{0,40}\r?\n\r?\n1\r?\n/);
  });
});

describe(`${sendPath} 模板选择`, () => {
  test("指定预定义模板：模板名随表单下发，响应回带", async () => {
    const res = await postSend(
      { url: sinkUrl, files: [{ kind: "e", encoding: "gbk" }], templateName: "国网E格式" },
      "modelId=1"
    );
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.data.templateName).toBe("国网E格式");

    const structure = received[0].body.toString("utf-8");
    expect(structure).toMatch(/name="template_name"[\s\S]{0,40}\r?\n\r?\n国网E格式\r?\n/);
  });

  test("不指定模板时回带 null，表单里为空串", async () => {
    const res = await postSend({ url: sinkUrl, files: [{ kind: "e" }] }, "modelId=1");
    expect(res.status).toBe(200);
    expect((await res.json()).data.templateName).toBeNull();
  });

  test("未知模板 → 400 且不发出请求", async () => {
    const res = await postSend(
      { url: sinkUrl, files: [{ kind: "e" }], templateName: "不存在模板" },
      "modelId=1"
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("未知模板");
    expect(received).toHaveLength(0);
  });
});

// ─── 兼容路径下 modelId 的哨兵值（变异验证补）──────────────────
//
// `resolveSendTarget` 的兼容路径结尾是 `modelId: Number(record?.project?.idx) || 0`。
// 变异验证把 `|| 0` 去掉后，既有 17 条守卫一条不红 —— 因为种子数据里所有模型的
// idx 都是 1，`Number(1) || 0` 与 `Number(1)` 结果相同。
//
// 而 idx 为 0 或缺失的模型真实存在（手写 JSON、从别处导入的图）。那个 0 是
// 「没有稳定序号」的哨兵，不是「模型 0」；去掉 `|| 0` 会让 NaN 或 0 原样传出
// —— 而表单那行是 `modelId > 0 ? String(modelId) : ""`：哨兵值 0 与 idx 缺失
// （Number(undefined) 即 NaN）都落进空串分支，正是注释里说的「老模型可能尚未
// 分配 idx，此时字段为空串而不是缺失，便于接收方稳定解析」。
//
// 注意：响应 data 里**没有** modelId 字段（只有 url/status/elapsedMs/
// templateName/files），该值只出现在 multipart 表单里 —— 所以断言都落在表单上。
// multipart 里 model_id 字段的两种形态：空串（哨兵 0 / idx 缺失）、真实序号。
// `{0,120}` 要能跨过整条 boundary 行 —— 边界串里有随机后缀，宽度不够就匹配不到。
const MODEL_ID_EMPTY = new RegExp('name="model_id"[\\s\\S]{0,120}\\r?\\n\\r?\\n\\r?\\n');
const MODEL_ID_ONE = new RegExp('name="model_id"[\\s\\S]{0,120}\\r?\\n\\r?\\n1\\r?\\n');

// 变异验证补记：把 `modelId: Number(idx) || 0` 的 `|| 0` 去掉，这 21 条**一条不红**。
// 原因是下游 `form.append("model_id", modelId > 0 ? String(modelId) : "")` 把两种
// 情况都归成空串：`Number(0) || 0 === 0` 与 `Number(0) === 0` 同值，
// `Number(undefined) === NaN` 与 `Number(undefined) || 0 === 0` 也都满足
// `> 0` 为假。`|| 0` 是给读代码的人一个「这里是哨兵」的信号，不承重 ——
// 绿是正确结果（AGENTS.md「A green mutation is not always a broken test」）。
// 下面四条用例守的是**下游契约**：哨兵值与缺失 idx 都必须落成空串，而不是 "0"
// 或字面量 "NaN"。
describe(`${sendPath} 兼容路径下的 modelId 哨兵值`, () => {
  test("idx 为 0 的模型：仍能按 schemePath + name 发送成功", async () => {
    const res = await postSend(
      { url: sinkUrl, files: [{ kind: "json" }] },
      `schemePath=${schemePath}&name=${encodeURIComponent("零号模型")}`
    );
    expect(res.status).toBe(200);
    expect(received).toHaveLength(1);
    const structure = received[0].body.toString("utf-8");
    expect(structure).toMatch(MODEL_ID_EMPTY);
  });

  test("缺 idx 字段的模型：同样归成 0，且发送成功", async () => {
    const res = await postSend(
      { url: sinkUrl, files: [{ kind: "json" }] },
      `schemePath=${schemePath}&name=${encodeURIComponent("无序号模型")}`
    );
    expect(res.status).toBe(200);
    expect(received).toHaveLength(1);
    const structure = received[0].body.toString("utf-8");
    expect(structure).toMatch(MODEL_ID_EMPTY);
  });

  test("idx 为 0 时响应体不含 modelId 字段（该值只走表单，不在 data 里）", async () => {
    const res = await postSend(
      { url: sinkUrl, files: [{ kind: "json" }] },
      `schemePath=${schemePath}&name=${encodeURIComponent("零号模型")}`
    );
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.data).not.toHaveProperty("modelId");
  });

  test("idx 为 0 时表单里的 model_id 是 0，不串到别的模型", async () => {
    await postSend(
      { url: sinkUrl, files: [{ kind: "json" }] },
      `schemePath=${schemePath}&name=${encodeURIComponent("零号模型")}`
    );
    const structure = received[0].body.toString("utf-8");
    expect(structure).toMatch(MODEL_ID_EMPTY);
    expect(structure).not.toMatch(MODEL_ID_ONE);
  });
});

// ─── 导出链内部的 TypeError 不得被说成「无法连接目标服务器」────────────
//
// handleV1ModelSend 的 catch 挂在整个 handler 上，于是 `error instanceof TypeError
// → 502「无法连接目标服务器，请检查地址与网络」` 这条网络诊断，对**请求发出前**的
// 任何 TypeError 也照样生效：resolveSendTarget 定位模型、buildFileText 跑
// buildCimXml / buildSvgDocument / buildEFileExport 全在这个 catch 覆盖范围内，
// 且适配层本身不吞异常（cimExport.mjs 直接调 buildCimXml，无 try）。
//
// 于是「模型 JSON 里有个 null 节点」这种纯内部故障，在 /cim-xml 端点如实回 internal 500，
// 到了 /send 端点却回 502「请检查地址与网络」—— 把排查方向指到调用方网络上去，
// 而真实原因在后端导出链。与近期那批「不要把失败说成另一种原因」是同一类缺陷。
describe(`${sendPath} 导出链内部故障的归因`, () => {
  const badNodeQuery = `schemePath=${schemePath}&name=${encodeURIComponent("坏节点模型")}`;

  test("★ CIM 生成内部崩溃 → 500，而不是 502「无法连接目标服务器」", async () => {
    const res = await postSend({ url: sinkUrl, files: [{ kind: "cim" }] }, badNodeQuery);
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).not.toContain("无法连接");
  });

  test("★ 与 /cim-xml 端点归因完全一致（同一次失败，两侧同一句原因）", async () => {
    const send = await postSend({ url: sinkUrl, files: [{ kind: "cim" }] }, badNodeQuery);
    const direct = await fetch(
      `${baseUrl}${apiPath(`/v1/schemes/model/cim-xml?schemePath=${schemePath}&name=${encodeURIComponent("坏节点模型")}`)}`
    );
    expect((await send.json()).error.message).toBe((await direct.json()).error.message);
  });

  test("★ 同一故障在 /cim-xml 端点同样回 500（两侧归因一致）", async () => {
    const res = await fetch(
      `${baseUrl}${apiPath(`/v1/schemes/model/cim-xml?schemePath=${schemePath}&name=${encodeURIComponent("坏节点模型")}`)}`
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("internal");
  });

  test("★ 故障时不向目标服务器发出请求", async () => {
    await postSend({ url: sinkUrl, files: [{ kind: "cim" }] }, badNodeQuery);
    expect(received).toHaveLength(0);
  });

  test("目标确实不可达时仍是 502「无法连接」（别把真网络故障也改成 500）", async () => {
    const res = await postSend({ url: "http://127.0.0.1:1/receive", files: [{ kind: "json" }] });
    expect(res.status).toBe(502);
    expect((await res.json()).error.message).toContain("无法连接");
  });
});
