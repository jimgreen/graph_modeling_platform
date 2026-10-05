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
// 多 chunk 响应：非 null 时按序分次 write，每次之间留事件循环间隔，
// 让 undici 的响应体流把它们当作**多个** chunk 交付。默认 null = 单次 end(sinkBody)。
// 单 chunk 时「只读首个 chunk」这条行为根本不可观测（没有第二个 chunk 可丢），
// 所以截断守卫必须配多 chunk fixture，并在用例里先自证确实拆开了。
let sinkChunks = null;
// 原生响应覆写：非 null 时**接管**响应（连 writeHead 一起），用于构造
// 「状态码 / 响应体形态」不由 `sinkStatus` + `sinkBody` 表达的场景 ——
// 空 body、null-body 状态码、声明了 content-encoding 却是明文（解压流在读时抛）。
// 这三种形态分别对应 readTargetErrorDetail 的 `!reader` / `value` 为假 / read 抛异常。
let sinkRaw = null;
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
  // 第四个模型：**文件名与内容 name 不一致**的畸形模型。
  // 内容 name 含 Windows 文件名非法字符（`:` / `?`），磁盘上只能以净化后的形态存在：
  // `readSchemeProjectFile` 取名走 `project.name || 文件名`，而
  // `projectJsonFileForName` 按 `safeFilePart(name)` 去 stat —— 两者恰好是同一条规则
  // （`shared/pathSafety.mjs:sanitizeSegment` 与 sendModel 的 `sanitizeFileBase` 同规则），
  // 于是「内容名带非法字符、文件名已净化」的模型在查表时仍能命中。
  // 这是 sendModel 里 `sanitizeFileBase` 的 `.replace(/[\\/:*?"<>|]+/g, "_")`
  // 唯一可达的入口：名字若不带非法字符，磁盘文件名就得原样等于它，两者互相排斥。
  writeFileSync(join(dir, "厂站_模型_A.json"), JSON.stringify({
    name: "厂站:模型?A",
    modelType: "厂站",
    idx: 7,
    canvasWidth: 800,
    canvasHeight: 400,
    nodes: [device("bus7", "ac-bus", "净化母线", { vbase: "10" }, [])],
    edges: []
  }), "utf-8");
  // 第五个模型：**只有静态图元**，没有电力设备。
  // `buildCimForSavedModel` 在 electricalNodes 为空时回 bad-request，
  // 用来覆盖 sendModel 的 CIM 分支「error → sendV1Error(code)」**非 not-found** 的那条路。
  writeFileSync(join(dir, "静态模型.json"), JSON.stringify({
    name: "静态模型",
    modelType: "厂站",
    idx: 8,
    canvasWidth: 800,
    canvasHeight: 400,
    nodes: [
      { id: "txt1", kind: "static-text", name: "说明文字", position: { x: 0, y: 0 }, size: { width: 100, height: 20 }, rotation: 0, scale: 1, layerId: "default", params: { name: "说明文字", text: "hello" } }
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
      if (sinkRaw) {
        sinkRaw(response);
        return;
      }
      response.writeHead(sinkStatus, { "content-type": "text/plain" });
      if (!Array.isArray(sinkChunks)) {
        response.end(sinkBody);
        return;
      }
      const pending = sinkChunks;
      let index = 0;
      const writeNext = () => {
        if (index >= pending.length) {
          response.end();
          return;
        }
        response.write(pending[index++]);
        setTimeout(writeNext, 20);
      };
      writeNext();
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
  sinkChunks = null;
  sinkRaw = null;
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

// ─── 目标 5xx 响应体的读取与截断 ─────────────────────────────
//
// `readTargetErrorDetail` 只 `reader.read()` **一次**，然后
// `Buffer.from(value).subarray(0, TARGET_ERROR_BODY_LIMIT)`（=512）截断。
// 两个可观测契约，拆成两条用例 —— 因为它们各自需要不同的 fixture 才有判别力：
//   (a) 首 chunk 内超出 512 字节的部分被切在边界上（需要**长**首 chunk）；
//   (b) 第二个及以后的 chunk 整块不进错误文案（需要**短**首 chunk，
//       否则「读完所有 chunk 再截断」这种变异会产出同样的前 512 字节 → 恒绿）。
//
// 共同前提：响应必须真的被拆成多个 chunk，单 chunk 时两条都恒绿，
// 所以每条用例第一步先走同一条 fetch 链路读一次目标响应自证拆分。
const ERROR_PREFIX = "目标服务器返回 HTTP 500：";
// (a) 首 chunk：20 字节前缀 + 200 字节填充 + 700 字节标记串（>512 上限）。
// 标记串用同一个不可能出现在别处的字符，于是「截断在边界」可逐字节断言：
// 512 - (20 + 200) = 292 个 M 存活，293 个 M 从未出现。
const LONG_HEAD = "HEAD-OF-FIRST-CHUNK|";
const LONG_FIRST_CHUNK = `${LONG_HEAD}${"F".repeat(200)}${"M".repeat(700)}`;
const SURVIVED_MARKS = 512 - (LONG_HEAD.length + 200);
// (b) 首 chunk 刻意短于 512，把唯一标记串放进第二个 chunk
const SHORT_FIRST_CHUNK = "FIRST-CHUNK-ONLY|";
const LONG_SECOND_CHUNK = `|SECOND-CHUNK-MARKER|${"Q".repeat(600)}`;

async function readAllChunks(response) {
  const reader = response.body.getReader();
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return chunks;
}

// 自检 fixture：确认目标响应在 undici 响应体流里确实被拆成 ≥2 个 chunk，
// 且切分点正好落在两个字符串的边界上。少了这一步，(b) 的断言可能只是在
// 断言一个不存在的第二个 chunk。
async function expectSplitInto(expectedChunks) {
  const chunks = await readAllChunks(await fetch(sinkUrl, { method: "POST", body: "probe" }));
  expect(chunks.length).toBeGreaterThanOrEqual(2);
  expect(chunks.map((chunk) => chunk.toString("utf-8"))).toEqual(expectedChunks);
  received = [];
}

describe(`${sendPath} 目标 5xx 响应体的读取与截断`, () => {
  test("首 chunk 内超过 512 字节的部分被截断在边界上", async () => {
    sinkStatus = 500;
    sinkChunks = [LONG_FIRST_CHUNK, LONG_SECOND_CHUNK];
    await expectSplitInto([LONG_FIRST_CHUNK, LONG_SECOND_CHUNK]);

    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] });
    expect(res.status).toBe(502);
    const payload = await res.json();
    expect(payload.error.code).toBe("internal");
    expect(payload.error.message.startsWith(ERROR_PREFIX)).toBe(true);

    // 逐字节等于首 chunk 的前 512 字节：前缀与填充原样保留，
    // 标记串恰好剩 292 个 M，第 293 个从未出现
    const detail = payload.error.message.slice(ERROR_PREFIX.length);
    expect(detail).toBe(LONG_FIRST_CHUNK.slice(0, 512));
    expect(detail).toHaveLength(512);
    expect(detail.startsWith(`${LONG_HEAD}${"F".repeat(200)}`)).toBe(true);
    expect(detail.endsWith("M".repeat(SURVIVED_MARKS))).toBe(true);
    expect(detail).not.toContain("M".repeat(SURVIVED_MARKS + 1));
  });

  test("第二个 chunk 整块不进错误文案（只读首个 chunk）", async () => {
    sinkStatus = 500;
    sinkChunks = [SHORT_FIRST_CHUNK, LONG_SECOND_CHUNK];
    await expectSplitInto([SHORT_FIRST_CHUNK, LONG_SECOND_CHUNK]);

    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] });
    expect(res.status).toBe(502);
    const payload = await res.json();

    // 首 chunk 短于上限 → 文案就是首 chunk 原文，一个字节都不多
    expect(payload.error.message).toBe(`${ERROR_PREFIX}${SHORT_FIRST_CHUNK}`);
    expect(payload.error.message).not.toContain("SECOND-CHUNK-MARKER");
    expect(payload.error.message).not.toContain("Q");
  });
});

// ─── 512 字节截点落在多字节字符中间 ─────────────────────────
//
// 目标错误文案的字节上限与预览同为 512，`Buffer.from(value).subarray(0, 512)`
// 直接切在字节上，而对方返回的往往是中文错误说明 ⇒ 截点常落在字符中间，
// toString("utf-8") 会把残缺字节解成 U+FFFD 挂在文案尾巴上（假乱码）。
//
// 契约与预览侧一致：**只丢半个字符，不多丢一个完整字符**。所以三条用例都把
// 完整文案钉死（toBe），因为：
//   - 只断言「不含 U+FFFD」放得过宽 —— 少吐一个完整字符同样不含 U+FFFD；
//   - 只断言「长度 ≤ 512」也放得过宽 —— 多一个 U+FFFD 字符照样 ≤ 512。
// 三个失败方向各被一条钉死：
//   不回退 → 尾部多出 U+FFFD（长度 +1）；回退过头 → 少一个完整字符（长度 -1）；
//   不截断 → TAIL 标记串漏进文案。
//
// fixture 都在首 chunk 内自足（第二个 chunk 只作拆分陪跑），并用 expectSplitInto
// 先自证 undici 确实按写入边界拆开了；两个 chunk 都收在字符边界上，
// 否则自证用的 toString 本身就会产出 U+FFFD 而与源串比不上。
// 首 chunk 的填充长度使 512 截点分别落在：三字节字第 2 字节后（510）、
// 四字节字最后 1 字节前（509）、ASCII 尾（无多字节，不该回退）。
const UTF8_SPLIT_3BYTE = `${"C".repeat(510)}中TAIL-3BYTE`;
const UTF8_SPLIT_4BYTE = `${"D".repeat(509)}\u{1F600}TAIL-4BYTE`;
const UTF8_EXACT_512 = `${"E".repeat(509)}中`;
const SPLIT_TAIL = "|SECOND-CHUNK-PADDING|";

describe(`${sendPath} 目标 5xx 响应体：截点落在多字节字符中间`, () => {
  test("三字节中文被切一半 → 丢掉半个字符，文案里没有 U+FFFD", async () => {
    sinkStatus = 500;
    sinkChunks = [UTF8_SPLIT_3BYTE, SPLIT_TAIL];
    await expectSplitInto([UTF8_SPLIT_3BYTE, SPLIT_TAIL]);

    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] });
    expect(res.status).toBe(502);
    const payload = await res.json();
    const detail = payload.error.message.slice(ERROR_PREFIX.length);

    expect(detail, "截断处不许出现替换字符").not.toContain("\uFFFD");
    // 截点在「中」的第 2 字节后：半个字丢掉，510 个 C 全留。
    expect(detail).toBe("C".repeat(510));
    expect(detail).toHaveLength(510);
    expect(detail).not.toContain("中");
    // TAIL 在 512 字节之外，必须仍然不出现（证明上限没被顺手放大）
    expect(detail).not.toContain("TAIL-3BYTE");
  });

  test("四字节字符被切在第 3 字节后 → 回退 3 字节，文案里没有半个 emoji", async () => {
    sinkStatus = 500;
    sinkChunks = [UTF8_SPLIT_4BYTE, SPLIT_TAIL];
    await expectSplitInto([UTF8_SPLIT_4BYTE, SPLIT_TAIL]);

    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] });
    const payload = await res.json();
    const detail = payload.error.message.slice(ERROR_PREFIX.length);

    expect(detail, "截断处不许出现替换字符").not.toContain("\uFFFD");
    // 搜索窗口必须够 4 字节（前导 + 3 续），否则半个 emoji 会留下 U+FFFD。
    expect(detail).toBe("D".repeat(509));
    expect(detail).not.toContain("\u{1F600}");
    expect(detail).not.toContain("TAIL-4BYTE");
  });

  test("恰好 512 字节且末字符完整 → 逐字等于首 chunk，一个字符都不多丢", async () => {
    expect(Buffer.byteLength(UTF8_EXACT_512, "utf-8"), "fixture 必须恰好 512 字节").toBe(512);
    sinkStatus = 500;
    sinkChunks = [UTF8_EXACT_512, SPLIT_TAIL];
    await expectSplitInto([UTF8_EXACT_512, SPLIT_TAIL]);

    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] });
    expect(res.status).toBe(502);
    const payload = await res.json();
    const detail = payload.error.message.slice(ERROR_PREFIX.length);

    // 截点正好落在「中」末尾 = 合法边界，回退必须一个字节都不动。
    // 无条件砍尾字符的实现会输出 509 个 E 而在这里红。
    expect(detail).toBe(UTF8_EXACT_512);
    expect(detail.endsWith("中")).toBe(true);
    expect(detail).toHaveLength(510);
    expect(detail).not.toContain("\uFFFD");
  });
});

// ─── files[].encoding 的判据：严格等于小写 gbk ─────────────────
//
// `specs.push({ kind, encoding: item?.encoding === "gbk" ? "gbk" : "utf-8" })`
// 是**大小写敏感、无 trim 的严格相等**。注意与同一循环里的 `kind` 处理不对称：
// kind 走 `String(item?.kind ?? "").trim().toLowerCase()`，encoding 什么都不做。
// 于是大写 GBK、带空格/换行的 gbk、utf8（无连字符）、空串、缺字段
// 全部静默回落 utf-8 —— 不是 400，也不报错。
//
// 这条契约是承重的：一旦有人把它改成大小写不敏感（或顺手补上 trim，
// 与 kind 对齐），大写 GBK 的模型就会**静默**从 UTF-8 字节变成 GBK 字节，
// 接收方按 UTF-8 解码得到乱码，且响应一路 200，无任何信号。
// 所以下面既断言非法值回落 utf-8，也带一条小写 gbk 的对照组 ——
// 只有两侧都断言，才能证明 not.toMatch 真的在区分而不是恒绿。
const ILLEGAL_ENCODINGS = ["GBK", "Gbk", " GBK", "gbk\n", "utf8", "UTF8", "", undefined, null];

describe(`${sendPath} files[].encoding 的兜底`, () => {
  test("大写 / 非法 / 缺省的 encoding 一律静默回落 utf-8", async () => {
    for (const encoding of ILLEGAL_ENCODINGS) {
      received = [];
      const res = await postSend({ url: sinkUrl, files: [{ kind: "json", encoding }] });
      expect(res.status).toBe(200);
      // 响应里回显的归一化结果
      expect((await res.json()).data.files[0].encoding).toBe("utf-8");

      const { body } = received[0];
      const structure = body.toString("utf-8");
      // MIME 参数按 utf-8 下发
      expect(structure).toContain("application/json; charset=utf-8");
      expect(structure).not.toMatch(/charset=gbk/iu);
      // 中文设备名的字节形态：UTF-8 在、GBK 不在（双向断言，避免只测一侧）
      expect(body.includes(Buffer.from("母线一", "utf-8"))).toBe(true);
      expect(body.includes(iconv.encode("母线一", "gbk"))).toBe(false);
    }

    // 对照组：唯一被接受的写法是小写 gbk —— 证明上面的 not.toMatch 有判别力
    received = [];
    await postSend({ url: sinkUrl, files: [{ kind: "json", encoding: "gbk" }] });
    const gbkBody = received[0].body;
    expect(gbkBody.toString("utf-8")).toMatch(/charset=gbk/iu);
    expect(gbkBody.includes(iconv.encode("母线一", "gbk"))).toBe(true);
    expect(gbkBody.includes(Buffer.from("母线一", "utf-8"))).toBe(false);
  });

  test("encoding 非法值不影响 SVG 的 XML 声明（仍声明 UTF-8）", async () => {
    received = [];
    const res = await postSend({ url: sinkUrl, files: [{ kind: "svg", encoding: "GBK" }] });
    expect(res.status).toBe(200);
    expect((await res.json()).data.files[0].encoding).toBe("utf-8");

    const { body } = received[0];
    // 声明走 withXmlEncodingDeclaration，只认小写 gbk
    expect(body.toString("utf-8")).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(body.toString("utf-8")).not.toContain('encoding="GBK"');
    expect(body.includes(Buffer.from("母线一", "utf-8"))).toBe(true);
    expect(body.includes(iconv.encode("母线一", "gbk"))).toBe(false);
  });
});

// ─── body.url 的规范化 ─────────────────────────────────────────
//
// `normalizeTargetUrl` 三段都各有一次「放弃」，而它们给出的结果**完全相同**
// （都是 null，最终都是同一条 400），所以必须靠**状态码**而不是文案来区分：
//   (a) `if (!text)` —— 空串 / 纯空白 / 缺字段；
//   (b) `catch` —— new URL 抛错（无 scheme、空 host、纯文本…）；
//   (c) 协议不是 http/https —— 既有守卫已用 file:///etc/passwd 覆盖。
// (a) 与 (b) 互为冗余（`new URL("")` 同样抛错，见文件末尾的变异结论），
// 但两者各自的**输入维度**不同，所以分开钉：只有 (b) 那组能被「删掉 catch 的
// return null」变异打红（删掉后 `url` 是 undefined，第 46 行解引用抛 TypeError，
// 被外层 catch 接成 502），(a) 那组对那个变异是绿的。
//
// 注意 url 校验发生在 files 校验**之前**，所以这几条都用合法的 files，
// 保证 400 一定来自 url 那一行而不是「未知格式」。
const UNPARSABLE_URLS = ["not a url", "://缺协议", "http://", "127.0.0.1:8080/x", "/relative/path"];
const BLANK_URL_BODIES = [{ url: "" }, { url: "   " }, { url: "\n\t" }, {}];

describe(`${sendPath} body.url 的规范化`, () => {
  test("无法被 URL 解析的地址 → 400，且不发出请求", async () => {
    for (const url of UNPARSABLE_URLS) {
      received = [];
      const res = await postSend({ url, files: [{ kind: "json" }] });
      expect(res.status).toBe(400);
      expect((await res.json()).error.message).toContain("http");
      expect(received).toHaveLength(0);
    }
  });

  test("空串 / 纯空白 / 缺字段的 url → 400，且不发出请求", async () => {
    for (const extra of BLANK_URL_BODIES) {
      received = [];
      const res = await postSend({ ...extra, files: [{ kind: "json" }] });
      expect(res.status).toBe(400);
      expect((await res.json()).error.message).toContain("http");
      expect(received).toHaveLength(0);
    }
  });

  test("对照组：合法地址两端带空白仍放行（trim 不该误伤真实地址）", async () => {
    const res = await postSend({ url: `  ${sinkUrl}  `, files: [{ kind: "json" }] });
    expect(res.status).toBe(200);
    expect(received).toHaveLength(1);
  });
});

// ─── 三种生成格式各自把生成层的 error 传出去 ─────────────────────
//
// `buildFileText` 三个格式分支都是 `return error ? { error } : { text }`，
// 错误由调用方统一 `sendV1Error(response, built.error.code, ...)` 落成信封。
// 既有守卫只走过 **json** 一支（模型不存在 → 404），e / svg / cim 三支的
// 错误传播从未被执行过 —— 而它们是三个独立的表达式，删掉任一支都不会影响别的支。
//
// 触发方式：**兼容路径**对不存在的模型不报 404（`resolveSendTarget` 结尾是
// `Number(record?.project?.idx) || 0`，record 为 null 也照样返回 parts/name），
// 所以同一个「不存在的模型」能让请求先过参数校验、再在生成层拿到 not-found。
//
// 第二条用「只有静态图元」的模型走 cim：那条 error 是 **bad-request**（→400），
// 与上面的 not-found（→404）不同 —— 证明 error.code 是被透传而不是写死。
describe(`${sendPath} 生成层 error 的透传`, () => {
  const missingModel = `schemePath=${schemePath}&name=${encodeURIComponent("不存在的模型")}`;

  test("模型不存在：e / svg / cim 三支各自回 404，且不发出请求", async () => {
    for (const kind of ["e", "svg", "cim"]) {
      received = [];
      const res = await postSend({ url: sinkUrl, files: [{ kind }] }, missingModel);
      expect(res.status).toBe(404);
      const payload = await res.json();
      expect(payload.error.code).toBe("not-found");
      expect(payload.error.message).toContain("模型不存在");
      expect(received).toHaveLength(0);
    }
  });

  test("只有静态图元的模型：cim 导出回 bad-request → 400（code 是透传而非写死）", async () => {
    received = [];
    const res = await postSend(
      { url: sinkUrl, files: [{ kind: "cim" }] },
      `schemePath=${schemePath}&name=${encodeURIComponent("静态模型")}`
    );
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.error.code).toBe("bad-request");
    expect(payload.error.message).toContain("电力设备");
    expect(received).toHaveLength(0);
  });
});

// ─── 目标错误响应体的三种「取不到片段」形态 ───────────────────────
//
// `readTargetErrorDetail` 有三条互不相同的放弃路径，全部返回 ""，
// 最终都表现为文案尾部的「。」而不是「：<片段>」。既有守卫只覆盖了
// 「读到 chunk」的形态；这三条各自需要不同的**响应形态**才有判别力，
// 所以每条先用一次同形态的直接 fetch 自证分支条件成立（与本文件既有的
// expectSplitInto 同一手法），再断言 send 端产出的文案。
//
//   (a) null body：304 是 null-body 状态码 → `response.body === null` → `!reader`
//   (b) 空 body：500 + 无实体 → 首个 read 即 `{ done: true, value: undefined }`
//   (c) 读时抛：声明 content-encoding: gzip 却是明文 → 解压流在首个 read 上 reject
//
// (b) 与 (c) 文案完全相同，只有自证能区分「确实抛了」与「只是拿到空值」。
const PLAIN_500 = "目标服务器返回 HTTP 500。";

function rawNoBody304(response) {
  response.writeHead(304);
  response.end();
}

function rawEmpty500(response) {
  response.writeHead(500, { "content-type": "text/plain" });
  response.end();
}

function rawBrokenGzip500(response) {
  response.writeHead(500, { "content-type": "text/plain", "content-encoding": "gzip" });
  response.end("这段明文并不是 gzip 数据");
}

describe(`${sendPath} 目标错误响应体取不到片段的三种形态`, () => {
  test("304：响应体为 null（无 reader）→ 文案只带状态码", async () => {
    sinkRaw = rawNoBody304;
    // 自证：该响应形态下 body 确实是 null，而不是「有 body 但读出空」
    const probe = await fetch(sinkUrl, { method: "POST", body: "probe" });
    expect(probe.status).toBe(304);
    expect(probe.body).toBeNull();
    received = [];

    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] });
    expect(res.status).toBe(502);
    const payload = await res.json();
    expect(payload.error.code).toBe("internal");
    expect(payload.error.message).toBe("目标服务器返回 HTTP 304。");
  });

  test("500 + 空响应体：首个 read 即 done → 文案只带状态码", async () => {
    sinkRaw = rawEmpty500;
    const probe = await fetch(sinkUrl, { method: "POST", body: "probe" });
    const probeReader = probe.body.getReader();
    const first = await probeReader.read();
    expect(first.done).toBe(true);
    expect(first.value).toBeUndefined();
    await probeReader.cancel().catch(() => undefined);
    received = [];

    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] });
    expect(res.status).toBe(502);
    expect((await res.json()).error.message).toBe(PLAIN_500);
  });

  test("声明 gzip 却是明文：读取抛异常 → 文案同样只带状态码（且不能把异常泄成 500）", async () => {
    sinkRaw = rawBrokenGzip500;
    // 自证：同一形态下首个 read 真的 reject，而不是 done —— 否则这条与上一条同形
    const probe = await fetch(sinkUrl, { method: "POST", body: "probe" });
    const probeReader = probe.body.getReader();
    await expect(probeReader.read()).rejects.toThrow();
    await probeReader.cancel().catch(() => undefined);
    received = [];

    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] });
    // 读取异常被 readTargetErrorDetail 自己吃掉 → 仍然是 502，不是 500
    expect(res.status).toBe(502);
    const payload = await res.json();
    expect(payload.error.code).toBe("internal");
    expect(payload.error.message).toBe(PLAIN_500);
  });

  test("取到的片段两端空白被 trim 掉（否则文案尾部会挂上空格）", async () => {
    sinkStatus = 500;
    sinkBody = "  \n  目标拒绝  \t ";
    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] });
    expect(res.status).toBe(502);
    expect((await res.json()).error.message).toBe("目标服务器返回 HTTP 500：目标拒绝");
  });
});

// ─── 兼容路径的 name 参数：缺字段 vs 纯空白 ───────────────────────
//
// `const name = (url.searchParams.get("name") ?? "").trim();`
// 两个维度必须分别钉：
//   · **缺字段**（query 里根本没有 name）→ 走 `?? ""` 那一支；
//     变异把它改成 `String(url.searchParams.get("name"))` 时，name 变成字面量
//     "null"（非空！）→ 过了 `if (!name)` → 一路走到生成层才报模型不存在 → 404。
//     所以这条必须断 **400**。
//   · **纯空白**（`name=%20` / 全角空格）→ 走 `.trim()` 那一支。
//     删掉 `.trim()` 时 name 是 " "（真值）→ 过了 `if (!name)` → 查表时被
//     safeFilePart 兜底成 `模型.json` → 同样落到 404。所以这条也必须断 **400**。
//
// 注意：合法名两端带空格**不能**用来断 trim —— `storageProjectDisplayName` 与
// `safeFilePart` 各自也会 trim，那条路径上 `.trim()` 的缺失完全不可观测。
//
// 变异验证结论（14 行变异表，11 RED / 3 GREEN，GREEN 的三条**都是真等价**，
// 不是输入维度没覆盖，记在这里免得下一个人重新查一遍）：
//   1. `if (!text) return null` 删掉 → 绿。`.trim()` 之后为空 ⟺ 原串为空或全空白，
//      而 `new URL("")` 必然抛错，被下一行的 catch 接成同一个 null。两条放弃路径
//      产出相同结果，这段早退是给人看的。
//   2. `String(raw ?? "")` → `String(raw)` → 绿。缺字段时 text 变成字面量
//      "undefined"，`!text` 不成立，但 `new URL("undefined")` 同样抛错 → 同一个 null。
//      **只在 catch 还在时等价**；两条互为对方的兜底。
//   3. `record.project ?? {}` → `record.project` → 绿。`readSchemeProjectFile` 的
//      返回值是 `{ ...project, name, ... }`，即使落盘 JSON 是 `null`／数组，
//      `normalizeProjectForStorage` 第一行就展开成了对象，所以这个 `?? {}` 不可达。
describe(`${sendPath} 兼容路径的 name 校验`, () => {
  test("只给 schemePath、完全不给 name → 400「缺少模型名称」", async () => {
    received = [];
    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] }, `schemePath=${schemePath}`);
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.error.code).toBe("bad-request");
    expect(payload.error.message).toContain("模型名称");
    expect(received).toHaveLength(0);
  });

  test("name 为空串 / 半角空格 / 制表符 / 全角空格 → 同样 400", async () => {
    for (const raw of ["", "%20", "%09", "%20%20", "%E3%80%80"]) {
      received = [];
      const res = await postSend(
        { url: sinkUrl, files: [{ kind: "json" }] },
        `schemePath=${schemePath}&name=${raw}`
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error.message).toContain("模型名称");
      expect(received).toHaveLength(0);
    }
  });
});

// ─── 下发文件名的净化（sanitizeFileBase 的 replace 分支）──────────
//
// `sanitizeFileBase` 里 `replace(/[\\/:*?"<>|]+/g, "_")` 的**命中**分支，
// 在本适配层里只有一个可达入口：模型名与磁盘文件名**不一致**的畸形模型。
// 原因：正常模型 `name` 就等于 `safeFilePart(name)`，而 Windows 不允许那 7 个
// 字符出现在文件名里 —— 只要名字带非法字符，「按名字查文件」就会落空。
// 但读模型的取名规则是 `project.name || 文件名主体`，内容里的 name 优先；
// 于是「文件名已净化、内容 name 仍带非法字符」的模型能被查到，且
// `sanitizeFileBase` 拿到的是**未净化的那个**。
//
// 种子里的 `厂站_模型_A.json` 就是它（idx=7，内容 name = 厂站:模型?A）。
// 断言成对：文件名必须是净化形态（`:` `?` → `_`），而 model_name 字段必须
// 仍是原样 —— 只断其一，另一条退化（比如顺手把 model_name 也净化了）就发现不了。
const WEIRD_NAME = "厂站:模型?A";
const WEIRD_FILE_BASE = "厂站_模型_A";

describe(`${sendPath} 下发文件名的净化`, () => {
  test("兼容路径：文件名净化为下划线，model_name 字段仍原样", async () => {
    const res = await postSend(
      { url: sinkUrl, files: [{ kind: "json" }] },
      `schemePath=${schemePath}&name=${encodeURIComponent(WEIRD_NAME)}`
    );
    expect(res.status).toBe(200);
    expect(received).toHaveLength(1);
    const structure = received[0].body.toString("utf-8");
    expect(structure).toContain(`name="json_file"; filename="${WEIRD_FILE_BASE}.json"`);
    expect(structure).not.toContain(`filename="${WEIRD_NAME}.json"`);
    expect(structure).toMatch(/name="model_name"[\s\S]{0,40}\r?\n\r?\n厂站:模型\?A\r?\n/);
  });

  test("modelId 口径同形：名字由磁盘内容回填，同样净化（顺带证明 model_id=7 定位正确）", async () => {
    const res = await postSend({ url: sinkUrl, files: [{ kind: "json" }] }, "modelId=7");
    expect(res.status).toBe(200);
    expect(received).toHaveLength(1);
    const structure = received[0].body.toString("utf-8");
    expect(structure).toContain(`name="json_file"; filename="${WEIRD_FILE_BASE}.json"`);
    expect(structure).toMatch(/name="model_id"[\s\S]{0,120}\r?\n\r?\n7\r?\n/);
    // model_name 回填的是内容里的原始名，与兼容路径同形
    expect(structure).toMatch(/name="model_name"[\s\S]{0,40}\r?\n\r?\n厂站:模型\?A\r?\n/);
  });
});
