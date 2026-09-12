// /webgrp/v1/schemes/model/e-file 集成测试：起真实 server（临时端口 + repo 真实 data/）。
// 与 apiV1Schemes.test.mjs 同模式：createImageServer 用模块级 schemeDataDir（repo data/），
// 无法注入 tmpdir，所以错误路径 + 信封格式覆盖；200 路径探测 repo 真实数据，存在才跑。
import { describe, expect, test, beforeEach, afterEach, beforeAll } from "vitest";
import iconv from "iconv-lite";
import { createImageServer, readSchemeProjectRecord } from "./server.mjs";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

let server;
let baseUrl;

beforeEach(async () => {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

const eFilePath = apiPath("/v1/schemes/model/e-file");
// 「默认方案」目录在 repo data/ 下不存在，但 404/400 用例不依赖真实数据
const schemePath = encodeSchemePath(["默认方案"]);

describe(`${eFilePath} 参数校验`, () => {
  test("缺 schemePath → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}${eFilePath}?name=x`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad-request");
  });

  test("未知模板 → 400 且列出可用模板", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}?schemePath=${schemePath}&name=任意&template=不存在的模板`
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("国网E格式");
  });

  test("模型不存在 → 404 not-found", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}?schemePath=${schemePath}&name=不存在的模型调试用`
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not-found");
  });

  test("encoding 非法 → 400", async () => {
    const res = await fetch(
      `${baseUrl}${eFilePath}?schemePath=${schemePath}&name=任意&encoding=big5`
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("encoding");
  });
});

// GBK 端到端（tmpdir 种子 + 断言响应字节经 iconv 解码含中文）见 server/eFileExport.test.mjs：
// 本文件用 repo 真实 data/，无隔离种子，故不放端点级 GBK 断言。
// 200 正路径：依赖 repo data/schemes 真实数据（"四川/所有图元"，modelType=厂站）。
// 数据缺失时跳过（CI/干净检出场景），错误路径用例已覆盖必需行为。
describe(`${eFilePath} 正路径（repo 真实数据）`, () => {
  const realSchemePath = ["四川"];
  const realModelName = "所有图元";
  let hasRealModel = false;
  beforeAll(async () => {
    const probe = await readSchemeProjectRecord({ schemePath: realSchemePath, name: realModelName });
    hasRealModel = Boolean(probe);
  });

  test("真实模型导出 GBK E 文件", async () => {
    if (!hasRealModel) {
      return;
    }
    const res = await fetch(
      `${baseUrl}${eFilePath}?schemePath=${encodeSchemePath(realSchemePath)}&name=${encodeURIComponent(realModelName)}`
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("charset=gbk");
    const bytes = Buffer.from(await res.arrayBuffer());
    const text = iconv.decode(bytes, "gbk");
    expect(text).toContain("<Model>");
  }, 30000);

  test("预定义模板（国网E格式）走通且输出含模型名", async () => {
    if (!hasRealModel) {
      return;
    }
    const res = await fetch(
      `${baseUrl}${eFilePath}?schemePath=${encodeSchemePath(realSchemePath)}&name=${encodeURIComponent(realModelName)}&template=${encodeURIComponent("国网E格式")}`
    );
    expect(res.status).toBe(200);
    const text = iconv.decode(Buffer.from(await res.arrayBuffer()), "gbk");
    expect(text).toContain(realModelName);
  }, 30000);

  test("POST 自定义模板文本导出（model-type 匹配校验在解析前不拦截）", async () => {
    if (!hasRealModel) {
      return;
    }
    const templateText = "<Model>\n@ path name\n# 自定义\n</Model>\n<node 类=\"ACNode+交流母线\" 表号=\"00401\">\n@ idx,name,dev_type,node\n// 序号,名称,类型,节点\n</node>\n</Model>\n";
    const res = await fetch(
      `${baseUrl}${eFilePath}?schemePath=${encodeSchemePath(realSchemePath)}&name=${encodeURIComponent(realModelName)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateText })
      }
    );
    expect(res.status).toBe(200);
    const text = iconv.decode(Buffer.from(await res.arrayBuffer()), "gbk");
    expect(text).toContain("<Model>");
  }, 30000);
});
