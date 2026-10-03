// server/eFileExport.mjs + server/cimExport.mjs 的 build*ForSavedModel 成功路径直测 —— 此前零直呼。
//
// ## 为什么这两个函数此前只在集成层被测
//
// 它们都做同一件事：读盘模型 + 读库配置 → 调 src 下的导出纯函数 → 返回文本。
// 集成测试（cimExport.test.mjs / eFileExport.test.mjs）确实经真实 server 覆盖了它们，
// 但那是**端到端**视角：只能看出「回 200 且 body 非空」，看不出：
//   - 模型不存在时是否真的返回 { error } 而不是抛异常（两个 handler 都靠它判分支）
//   - 模板路径解析不出元件定义时返回哪条错误
//   - 模板类型与模型类型不匹配时是否**在生成之前**就拒（顺序错了会白算几百毫秒）
//   - 模型类型缺失时模板校验是放行还是拦下
//
// 直接调用只需把 `paths` 指向 tmpdir（`spacePathsFor` 给出完整形状，不必手拼），
// 不必起 HTTP server、不必连 WS。
//
// 注意：`.test.mjs` 必须是纯 JS —— 不要写 `as never` / 类型标注 / 非空断言，
// 那些会触发 RollupError: Parse failure，表现为「Tests: no tests」（看着像通过，实际没跑）。
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

// 这两个模块在 import 时就 await import src 下的 TS，domShim 必须先跑
const { buildEFileForSavedModel } = await import("./eFileExport.mjs");
const { buildCimForSavedModel } = await import("./cimExport.mjs");
const { spacePathsFor } = await import("./spaceStore.mjs");
const { PREDEFINED_E_DEVICE_TEMPLATES } = await import("./eFileTemplates.mjs");

let dataDir;
let paths;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "build-saved-model-"));
  // 用官方的 spacePathsFor 拿默认空间的路径集合 —— 与生产同源，
  // 避免手拼漏掉某个键后测试「通过」是因为读了 undefined 路径
  paths = spacePathsFor(dataDir, "default");
  mkdirSync(paths.schemeFiles, { recursive: true });
  mkdirSync(paths.settings, { recursive: true });
  mkdirSync(paths.deviceLibraryDir, { recursive: true });
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

/** 造一个带电压的交流母线节点（母线有 vbase 才能通过 CIM 的严格校验）。 */
const busbar = (id, params = {}) => ({
  id,
  kind: "ac-bus",
  name: `母线${id}`,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 20 },
  rotation: 0,
  scale: 1,
  terminals: [],
  params: { i_vbase: "110", ...params }
});

function seedProject(schemeDirName, fileName, project) {
  const dir = join(paths.schemeFiles, schemeDirName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${fileName}.json`), JSON.stringify(project), "utf-8");
}

// ─── buildEFileForSavedModel ─────────────────────────────

describe("buildEFileForSavedModel", () => {
  const call = (over = {}) =>
    buildEFileForSavedModel({ parts: ["方案A"], name: "模型1", paths, ...over });

  test("模型存在时返回 file（含 content 与 filename），不返回 error", async () => {
    seedProject("方案A", "模型1", { name: "模型1", nodes: [busbar("bus1")], edges: [] });
    const result = await call();
    expect(result.error).toBeUndefined();
    expect(result.file).toBeDefined();
    expect(typeof result.file.text).toBe("string");
    expect(result.file.text.length).toBeGreaterThan(0);
    expect(result.file.filename).toContain(".e");
  });

  test("模型不存在返回 { error } 而不是抛异常（handler 靠它判 404 分支）", async () => {
    const result = await call({ name: "不存在的模型" });
    expect(result.file).toBeUndefined();
    expect(result.error?.code).toBe("not-found");
    expect(result.error?.message).toContain("模型不存在");
  });

  test("方案路径不存在同样返回 not-found", async () => {
    seedProject("方案A", "模型1", { name: "模型1", nodes: [busbar("bus1")], edges: [] });
    const result = await call({ parts: ["不存在的方案"] });
    expect(result.error?.code).toBe("not-found");
  });

  test("生成的 E 文件含模型段与数据行（不是空壳）", async () => {
    seedProject("方案A", "模型1", { name: "模型1", nodes: [busbar("bus1")], edges: [] });
    const { file } = await call();
    // E 文件是「段名 + # 开头的数据行」的行式文本，段名走中文标签
    expect(file.text.length).toBeGreaterThan(0);
    expect(file.text).toContain("<Model>");
    expect(file.text).toMatch(/^#/mu);
    expect(file.text).toContain("母线bus1");
  });

  test("空模型（无节点）也能生成，不是只有节点才成功", async () => {
    seedProject("方案A", "空模型", { name: "空模型", nodes: [], edges: [] });
    const { file, error } = await call({ name: "空模型" });
    expect(error).toBeUndefined();
    expect(typeof file.text).toBe("string");
  });

  test("★ 模板文本解析不出元件定义 → bad-request（不静默退回无模板导出）", async () => {
    seedProject("方案A", "模型1", { name: "模型1", nodes: [busbar("bus1")], edges: [] });
    // 一段不含元件定义段的文本
    const result = await call({ templateText: "# 只是注释，没有元件定义段\n随便写点什么" });
    expect(result.file).toBeUndefined();
    expect(result.error?.code).toBe("bad-request");
    expect(result.error?.message).toContain("元件定义");
  });

  test("带有效模板文本时导出内容与不带模板时不同（模板真的生效了）", async () => {
    seedProject("方案A", "模型1", { name: "模型1", modelType: "厂站", nodes: [busbar("bus1")], edges: [] });
    const plain = await call();
    const templateName = Object.keys(PREDEFINED_E_DEVICE_TEMPLATES)[0];
    const templateText = Buffer.from(
      await (await import("./eFileTemplates.mjs")).readPredefinedTemplateBase64(templateName),
      "base64"
    );
    const withTemplate = await call({ templateName, templateText });
    expect(withTemplate.error).toBeUndefined();
    expect(withTemplate.file.text).not.toBe(plain.file.text);
  });

  test("模板类型与模型类型不匹配 → bad-request（生成之前就拒）", async () => {
    // 台区实时库只支持台区模型
    seedProject("方案A", "模型1", { name: "模型1", modelType: "厂站", nodes: [busbar("bus1")], edges: [] });
    const result = await call({ templateName: "台区实时库" });
    expect(result.file).toBeUndefined();
    expect(result.error?.code).toBe("bad-request");
    expect(result.error?.message).toContain("台区");
  });

  test("类型匹配时放行", async () => {
    seedProject("方案A", "模型1", { name: "模型1", modelType: "台区", nodes: [busbar("bus1")], edges: [] });
    const result = await call({ templateName: "台区实时库" });
    expect(result.error).toBeUndefined();
  });

  test("★ 模型没写 modelType 时，带类型限制的模板会被拒（空串不命中任何允许类型）", async () => {
    seedProject("方案A", "模型1", { name: "模型1", nodes: [busbar("bus1")], edges: [] });
    const result = await call({ templateName: "台区实时库" });
    // 判据是 `allowed.includes(modelType)`；空串不在 ["台区"] 里 ⇒ 返回不匹配文案。
    // 记下实测：缺 modelType 不是「不限制」，而是「不匹配」。
    expect(result.file).toBeUndefined();
    expect(result.error?.code).toBe("bad-request");
    expect(result.error?.message).toContain("台区实时库");
  });

  test("无类型限制的模板名在缺 modelType 时放行（allowed 为 undefined 直接返回 null）", async () => {
    seedProject("方案A", "模型1", { name: "模型1", nodes: [busbar("bus1")], edges: [] });
    const result = await call({ templateName: "不存在的模板名" });
    // 模板名本身不在限制表里 ⇒ 没有类型限制 ⇒ 不触发不匹配。
    // 注意这与 handler 层的白名单校验不同：这里只做类型检查，不校验模板名是否存在。
    expect(result.error).toBeUndefined();
  });
});

// ─── buildCimForSavedModel ───────────────────────────────

describe("buildCimForSavedModel", () => {
  const call = (over = {}) =>
    buildCimForSavedModel({ parts: ["方案A"], name: "模型1", paths, ...over });

  test("模型存在时返回 xml 与 filename", async () => {
    seedProject("方案A", "模型1", { name: "模型1", nodes: [busbar("bus1")], edges: [] });
    const result = await call();
    expect(result.error).toBeUndefined();
    expect(result.xml.startsWith("<?xml")).toBe(true);
    expect(result.xml).toContain("cim:");
    expect(result.filename).toContain(".xml");
  });

  test("模型不存在返回 { error } not-found", async () => {
    const result = await call({ name: "不存在的模型" });
    expect(result.xml).toBeUndefined();
    expect(result.error?.code).toBe("not-found");
  });

  test("★ 只有静态图元的模型 → bad-request（没有电力设备可导出）", async () => {
    // 静态图元不进 CIM；一个都没有时返回错误而不是空 XML
    seedProject("方案A", "纯静态模型", {
      name: "纯静态模型",
      nodes: [{
        id: "s1",
        kind: "static-text",
        name: "标注",
        position: { x: 0, y: 0 },
        size: { width: 10, height: 10 },
        rotation: 0,
        scale: 1,
        terminals: [],
        params: {}
      }],
      edges: []
    });
    const result = await call({ name: "纯静态模型" });
    expect(result.xml).toBeUndefined();
    expect(result.error?.code).toBe("bad-request");
    expect(result.error?.message).toContain("电力设备");
  });

  test("电力设备与静态图元混存时只导出电力设备那部分", async () => {
    seedProject("方案A", "混合模型", {
      name: "混合模型",
      nodes: [
        busbar("bus1"),
        {
          id: "s1",
          kind: "static-text",
          name: "标注",
          position: { x: 0, y: 0 },
          size: { width: 10, height: 10 },
          rotation: 0,
          scale: 1,
          terminals: [],
          params: {}
        }
      ],
      edges: []
    });
    const result = await call({ name: "混合模型" });
    expect(result.error).toBeUndefined();
    // 静态图元不该出现在 XML 里
    expect(result.xml).not.toContain("static-text");
  });

  test("strict 模式下关键参数缺失 → bad-request 且消息列出缺哪些", async () => {
    // 母线不给 i_vbase ⇒ collectMissingCriticalParams 会报它
    seedProject("方案A", "缺参数模型", {
      name: "缺参数模型",
      nodes: [busbar("bus1", { i_vbase: undefined })],
      edges: []
    });
    const strict = await call({ name: "缺参数模型", strict: true });
    expect(strict.xml).toBeUndefined();
    expect(strict.error?.code).toBe("bad-request");
    expect(strict.error?.message).toContain("关键参数缺失");

    // 非 strict 模式放行（缺参数也照样导出，只是内容不全）
    const lenient = await call({ name: "缺参数模型" });
    expect(lenient.error).toBeUndefined();
    expect(lenient.xml.length).toBeGreaterThan(0);
  });

  test("strict 消息最多列 10 条缺失（避免超长响应）", async () => {
    const nodes = Array.from({ length: 15 }, (_, index) => busbar(`bus${index}`, { i_vbase: undefined }));
    seedProject("方案A", "大量缺失模型", { name: "大量缺失模型", nodes, edges: [] });
    const result = await call({ name: "大量缺失模型", strict: true });
    expect(result.error?.code).toBe("bad-request");
    // 消息里用「；」分隔，每段形如「名字 缺 字段」
    expect(result.error.message.split("；").length).toBeLessThanOrEqual(11);
  });

  test("modelId 覆盖优先于 project.idx", async () => {
    seedProject("方案A", "模型1", { name: "模型1", idx: 777, nodes: [busbar("bus1")], edges: [] });
    const overridden = await call({ modelId: "OVERRIDE-ID" });
    const fromIdx = await call();
    expect(overridden.xml).not.toBe(fromIdx.xml);
    // modelId 落在 FullModel 的 urn:uuid 与厂站 rdfId 上，不在可见文本里
    expect(overridden.xml).toContain("urn:uuid:OVERRIDE-ID");
    expect(overridden.xml).toContain("SUB_OVERRIDE-ID");
    expect(overridden.xml).not.toContain("urn:uuid:777");
  });

  test("modelId 缺省时回落 project.idx", async () => {
    seedProject("方案A", "模型1", { name: "模型1", idx: 777, nodes: [busbar("bus1")], edges: [] });
    const result = await call();
    expect(result.xml).toContain("urn:uuid:777");
  });

  test("★ modelId 只保留 ASCII（中文名会被整段换成下划线）", async () => {
    // resolveModelId 的判据是 `replace(/[^A-Za-z0-9_.-]/g, "_")` —— 不含中文。
    // 于是中文模型名当 modelId 用时会得到 "____"，两个不同中文名撞成同一个 id。
    // 这是实测行为，不是意图；改它属业务语义变更。
    seedProject("方案A", "模型1", { name: "模型1", idx: 888, nodes: [busbar("bus1")], edges: [] });
    const result = await call({ modelId: "中文名字" });
    expect(result.error).toBeUndefined();
    expect(result.xml).toContain("urn:uuid:____");
  });

  test("modelId 含 ASCII 非法字符时被卫生化（空格 / 斜杠 / 冒号 → 下划线）", async () => {
    seedProject("方案A", "模型1", { name: "模型1", idx: 888, nodes: [busbar("bus1")], edges: [] });
    const result = await call({ modelId: "a b/c:d" });
    expect(result.error).toBeUndefined();
    expect(result.xml).toContain("urn:uuid:a_b_c_d");
  });

  test("没有 idx 时回落模型名（第三级兜底）", async () => {
    seedProject("方案A", "无名序号模型", { name: "无名序号模型", nodes: [busbar("bus1")], edges: [] });
    const result = await call({ name: "无名序号模型" });
    expect(result.error).toBeUndefined();
    expect(result.xml).toContain("无名序号模型");
  });

  test("文件名由 cimFilename 单源生成（前端落盘名与后端 Content-Disposition 同规则）", async () => {
    seedProject("方案A", "模型1", { name: "模型1", nodes: [busbar("bus1")], edges: [] });
    const result = await call();
    const { cimFilename } = await import("../src/cim/cim-export.ts");
    expect(result.filename).toBe(cimFilename("模型1"));
  });
});
