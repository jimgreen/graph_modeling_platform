// /webgrp/v1/receive 联调接收端测试：
// tmpdir → GRAPH_MODEL_DATA_DIR → 起真实 server（端口 0），用真实 fetch 发 multipart，
// 断言字段/文件名/字节数与 GBK 回显，以及 GET 回看、DELETE 清空。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import iconv from "iconv-lite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";

installDomShim();

const receivePath = apiPath("/v1/receive");

let dataDir;
let server;
let baseUrl;

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "v1-receive-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

function postMultipart() {
  const form = new FormData();
  form.append("model_id", "7");
  form.append("model_name", "厂站模型");
  form.append("scheme_path", JSON.stringify(["发送方案"]));
  form.append(
    "e_file",
    new Blob([iconv.encode("<Section>母线一</Section>", "gbk")], { type: "text/plain; charset=gbk" }),
    "厂站模型.e"
  );
  form.append(
    "json_file",
    new Blob([Buffer.from('{"name":"厂站模型"}', "utf-8")], { type: "application/json; charset=utf-8" }),
    "厂站模型.json"
  );
  return fetch(`${baseUrl}${receivePath}`, { method: "POST", body: form });
}

function fieldOf(payload, name) {
  return payload.data.received.fields.find((field) => field.name === name);
}

describe(`${receivePath} 接收`, () => {
  test("multipart：解析字段名/文件名/字节数，并按 charset 回显内容", async () => {
    const res = await postMultipart();
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);

    const received = payload.data.received;
    expect(received.contentType).toContain("multipart/form-data; boundary=");
    expect(received.totalBytes).toBeGreaterThan(0);

    // 文本字段：直接可读
    expect(fieldOf(payload, "model_id").text).toBe("7");
    expect(fieldOf(payload, "model_name").text).toBe("厂站模型");
    expect(fieldOf(payload, "scheme_path").text).toBe('["发送方案"]');

    // 文件字段：文件名、MIME、字节数与解码回显
    const eFile = fieldOf(payload, "e_file");
    expect(eFile.kind).toBe("file");
    expect(eFile.filename).toBe("厂站模型.e");
    expect(eFile.contentType).toContain("charset=gbk");
    expect(eFile.bytes).toBe(iconv.encode("<Section>母线一</Section>", "gbk").length);
    // GBK 字节按 charset=gbk 解码，中文不乱码
    expect(eFile.preview).toContain("母线一");

    const jsonFile = fieldOf(payload, "json_file");
    expect(jsonFile.filename).toBe("厂站模型.json");
    expect(jsonFile.preview).toContain("厂站模型");
  });

  test("非 multipart：按原样收下并给出文本回显", async () => {
    const res = await fetch(`${baseUrl}${receivePath}`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ hello: "世界" })
    });
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.data.received.fields).toHaveLength(1);
    expect(payload.data.received.fields[0].kind).toBe("raw");
    expect(payload.data.received.fields[0].text).toContain("世界");
  });

  test("GET 回看最近一次，DELETE 清空", async () => {
    await fetch(`${baseUrl}${receivePath}`, { method: "POST", body: "x" });
    const latest = await (await fetch(`${baseUrl}${receivePath}`)).json();
    expect(latest.data.count).toBeGreaterThan(0);
    expect(latest.data.latest).not.toBeNull();

    const cleared = await (await fetch(`${baseUrl}${receivePath}`, { method: "DELETE" })).json();
    expect(cleared.data.cleared).toBeGreaterThan(0);

    const after = await (await fetch(`${baseUrl}${receivePath}`)).json();
    expect(after.data.count).toBe(0);
    expect(after.data.latest).toBeNull();
  });
});
