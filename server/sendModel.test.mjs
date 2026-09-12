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
