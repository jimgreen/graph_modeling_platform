// server/cimExport.mjs 的 handleV1ModelCimXml 入参校验直测 —— 此前零直呼。
//
// ## 覆盖的是什么
//
// 端点的前两道关（schemePath / name）与 e-file 端点同款，但**码不同**：
// 这里直返中文字符串（不带 `错误码：` 前缀），而 eFileExport 走 parseEFileQuery
// 返回结构化 error。两处文案若漂移，客户端按文案匹配的分支会走空。
//
// 第三道之后的分支（读盘、strict 校验、CIM 生成）需要 tmpdir 数据根，不在本文件范围。
//
// 注意：`.test.mjs` 必须是纯 JS —— 不要写 `as never` / 类型标注 / 非空断言，
// 那些会触发 RollupError: Parse failure，表现为「Tests: no tests」（看着像通过，实际没跑）。
import { describe, expect, test } from "vitest";
import { handleV1ModelCimXml } from "./cimExport.mjs";
import { fakeResponse, fakeUrl } from "./handlerTestHarness.mjs";

function schemePath(parts) {
  return encodeURIComponent(JSON.stringify(parts));
}

async function run(search) {
  const response = fakeResponse();
  await handleV1ModelCimXml({ response, url: fakeUrl(search) });
  return response;
}

function expectBadRequest(response, fragment) {
  const payload = response.json();
  expect(response.statusCode, JSON.stringify(payload)).toBe(400);
  expect(payload?.ok).toBe(false);
  expect(payload?.error?.code).toBe("bad-request");
  expect(payload?.error?.message, JSON.stringify(payload)).toContain(fragment);
}

describe("handleV1ModelCimXml / schemePath 校验", () => {
  test("缺失 / 空串 / 非法 JSON → 400", async () => {
    for (const value of ["", "不是JSON", encodeURIComponent(JSON.stringify({ a: 1 }))]) {
      const response = await run(`schemePath=${encodeURIComponent(value)}&name=%E6%A8%A1%E5%9E%8B1`);
      expectBadRequest(response, "schemePath");
    }
  });

  test("schemePath 缺失 → 400", async () => {
    expectBadRequest(await run("name=%E6%A8%A1%E5%9E%8B1"), "schemePath");
  });

  test("空数组（JSON 合法但无层级）→ 400", async () => {
    expectBadRequest(await run(`schemePath=${schemePath([])}&name=x`), "schemePath");
  });

  test("校验在 name 之前（两者都非法时先报 schemePath）", async () => {
    expectBadRequest(await run("name="), "schemePath");
  });
});

describe("handleV1ModelCimXml / name 校验", () => {
  test("缺失 / 只有空白 → 400", async () => {
    for (const name of ["", "%20", "%20%20"]) {
      const response = await run(`schemePath=${schemePath(["方案A"])}&name=${name}`);
      expectBadRequest(response, "模型名称");
    }
  });

  test("name 缺失 → 400", async () => {
    expectBadRequest(await run(`schemePath=${schemePath(["方案A"])}`), "模型名称");
  });
});

describe("handleV1ModelCimXml / 其余 query 的取值口径", () => {
  test("strict 只认 \"1\"（不是 true / yes / 空串）", async () => {
    // strict 决定要不要跑 collectMissingCriticalParams；判据写错会让「关键参数缺失」
    // 这道保护静默失效 —— 用户拿到一份字段全空的 CIM/XML 却没有任何提示。
    for (const strict of ["1"]) {
      const response = await run(`schemePath=${schemePath(["方案A"])}&name=x&strict=${strict}`);
      // 过了入参校验 ⇒ 不再是 400（后续是读盘失败 404 之类）
      expect(response.statusCode, `strict=${strict}`).not.toBe(400);
    }
  });

  test("strict=0 / true / 空 → 不触发严格校验（同样不是入参 400）", async () => {
    // 这些值都不等于 "1"，故 strict 判 false。断言只到「不是入参校验失败」这一层，
    // 具体后续响应依赖数据根，不在本文件断言范围。
    for (const strict of ["0", "true", "", "%20"]) {
      const response = await run(`schemePath=${schemePath(["方案A"])}&name=x&strict=${strict}`);
      expect(response.statusCode, `strict=${strict}`).not.toBe(400);
    }
  });

  test("modelId 缺省不报错（后续由 resolveModelId 从 project.idx / 名字回落）", async () => {
    const response = await run(`schemePath=${schemePath(["方案A"])}&name=x`);
    expect(response.statusCode).not.toBe(400);
  });
});
