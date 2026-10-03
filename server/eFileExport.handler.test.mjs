// handleV1ModelEFile / handleV1ModelEFilePost 的 **handler 层**直测。
//
// ## 与已有测试的分工
//
// - `buildForSavedModel.test.mjs` 覆盖 `buildEFileForSavedModel`（生成层，含模板/类型校验）；
// - `eFileExport.test.mjs` 经真实 HTTP 打通整条链（成功路径）；
// - `swigger.examples.test.mjs` 逐示例真打这两个端点。
//
// 剩下没被执行过的，是两个 handler **自己**的那段编排：先校验 query、再读 body、
// 把 buildEFileForSavedModel 返回的 error 原样转成 HTTP 状态。这些分支此前只在
// 「参数全对」时被跑到过。
//
// ## 「不读盘」怎么证明
//
// paths 指向一个**空 tmpdir 空间**：一旦真的进了 buildEFileForSavedModel，
// 第一个动作就是读模型文件，必然返回 404 `not-found`。所以
// 「拿到 400 bad-request」本身就是「没进读盘」的证据 —— 无需 mock 任何模块。
//
// 注意：`.test.mjs` 必须是纯 JS —— 不要写类型标注或非空断言 `!`，
// 那些会触发 RollupError: Parse failure，表现为「Tests: no tests」（看着像通过，实际没跑）。
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import iconv from "iconv-lite";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

// 这两个模块在 import 时就 await import src 下的 TS，domShim 必须先跑
const { handleV1ModelEFile, handleV1ModelEFilePost } = await import("./eFileExport.mjs");
const { spacePathsFor } = await import("./spaceStore.mjs");
const { encodeSchemePath } = await import("./schemePath.mjs");
const { fakeRequest, fakeResponse, fakeUrl } = await import("./handlerTestHarness.mjs");

const SCHEME = "方案A";
const MODEL = "模型1";
const validSearch = `schemePath=${encodeSchemePath([SCHEME])}&name=${encodeURIComponent(MODEL)}`;

let dataDir;
let paths;

beforeEach(() => {
  // 空空间：模型不存在 → 任何「真的读了盘」的分支都会落到 404
  dataDir = mkdtempSync(join(tmpdir(), "e-file-handler-"));
  paths = spacePathsFor(dataDir, "default");
  mkdirSync(paths.schemeFiles, { recursive: true });
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

async function runGet(search = validSearch) {
  const response = fakeResponse();
  await handleV1ModelEFile({ url: fakeUrl(search), response, paths });
  return response;
}

async function runPost({ search = validSearch, body } = {}) {
  const response = fakeResponse();
  await handleV1ModelEFilePost({
    request: fakeRequest(body === undefined ? {} : { body }),
    response,
    url: fakeUrl(search),
    paths
  });
  return response;
}

function errorPayload(response) {
  return response.json()?.error ?? {};
}

function expectBadRequest(response, fragment) {
  const payload = response.json();
  expect(response.statusCode, JSON.stringify(payload)).toBe(400);
  expect(payload?.ok).toBe(false);
  expect(payload?.error?.code).toBe("bad-request");
  if (fragment) {
    expect(payload?.error?.message, JSON.stringify(payload)).toContain(fragment);
  }
}

// ─── handleV1ModelEFile（GET）─────────────────────────────

describe("handleV1ModelEFile", () => {
  test("对照：query 合法但模型不存在 → 404（证明下面的 400 确实是短路而非巧合）", async () => {
    const response = await runGet();
    expect(response.statusCode).toBe(404);
    expect(errorPayload(response).code).toBe("not-found");
  });

  test("★ query 校验失败一律 400，且不进读盘（不回落到 404）", async () => {
    const cases = [
      ["缺 schemePath", `name=${encodeURIComponent(MODEL)}`],
      ["缺 name", `schemePath=${encodeSchemePath([SCHEME])}`],
      ["encoding 非法", `${validSearch}&encoding=latin1`],
      ["template 未知", `${validSearch}&template=${encodeURIComponent("不存在.e")}`]
    ];
    for (const [label, search] of cases) {
      const response = await runGet(search);
      expectBadRequest(response);
      expect(response.statusCode, label).not.toBe(404);
    }
  });

  test("校验失败时不写任何导出字节（body 为空而非 E 文件内容）", async () => {
    const response = await runGet(`name=${encodeURIComponent(MODEL)}`);
    expectBadRequest(response);
    expect(response.text()).not.toContain("<Model>");
  });
});

// ─── handleV1ModelEFilePost（POST）────────────────────────

describe("handleV1ModelEFilePost", () => {
  test("对照：query 合法 + 合法 templateText，但模型不存在 → 404", async () => {
    const response = await runPost({ body: { templateText: "<ACLoad/>" } });
    expect(response.statusCode).toBe(404);
    expect(errorPayload(response).code).toBe("not-found");
  });

  test("★ body.templateText 缺失 / 空串 / 纯空白 / 非字符串 → 400 且不读盘", async () => {
    for (const [label, body] of [
      ["无 body", undefined],
      ["空对象", {}],
      ["缺失字段", { templateName: "x" }],
      ["空串", { templateText: "" }],
      ["纯空白", { templateText: "   \n\t " }],
      ["数字", { templateText: 123 }],
      ["对象", { templateText: { a: 1 } }],
      ["null", { templateText: null }]
    ]) {
      const response = await runPost({ body });
      expectBadRequest(response, "templateText");
      expect(response.statusCode, label).not.toBe(404);
    }
  });

  test("templateText 校验先于 query 之外的读盘：无 body 时报 templateText 而非模型", async () => {
    const response = await runPost({ body: { templateText: "  " } });
    expectBadRequest(response, "templateText");
    expect(errorPayload(response).message).not.toContain("模型不存在");
  });

  test("★ body 不是合法 JSON → 400「请求体不是合法 JSON」", async () => {
    for (const raw of ["{", "[1,2", "not json at all", "{\"a\":}"]) {
      const response = await runPost({ body: raw });
      expectBadRequest(response, "不是合法 JSON");
      expect(response.statusCode, raw).not.toBe(404);
    }
  });

  test("空字符串 body 走「无内容 → {}」分支，报 templateText 而非 JSON 错", async () => {
    // readJsonBody 里是 `return body ? JSON.parse(body) : {}` —— 空串短路，不进 JSON.parse。
    // 记下这个口径：空 body 得到的错误信息与「非法 JSON」不同，第三方据此可分辨「没发 body」与「body 坏了」。
    const response = await runPost({ body: "" });
    expectBadRequest(response, "templateText");
    expect(errorPayload(response).message).not.toContain("不是合法 JSON");
  });

  // ── templateName 的优先级：body 优先于 query ──
  //
  // 观测点是「模板类型限制」这道校验（eDeviceTemplateSingleTypeMismatchMessage）：
  // 「台区实时库」只支持台区模型，而样本模型是厂站，所以**生效的模板名是谁**，
  // 直接决定回 400（body 生效）还是 200 导出成功（query 生效）。
  // 两组用例正反夹逼，任何一侧改动都会让其中一条红。
  describe("templateName 优先级", () => {
    // 纯 ASCII 模板文本（含一个元件定义段 ⇒ parseEDeviceDefinitionFile 解析得出 sections）
    const templateText =
      "<Model>\n@ path name\n# 自定义\n</Model>\n" +
      "<node 类=\"ACLoad+交流负荷\" 表号=\"00401\">\n@ idx,name,dev_type,node\n// 序号,名称,类型,节点\n</node>\n</Model>\n";

    beforeEach(() => {
      const dir = join(paths.schemeFiles, SCHEME);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, `${MODEL}.json`),
        JSON.stringify({
          name: MODEL,
          modelType: "厂站",
          nodes: [{
            id: "bus1",
            kind: "ac-bus",
            name: "母线1",
            position: { x: 0, y: 0 },
            size: { width: 100, height: 20 },
            rotation: 0,
            scale: 1,
            terminals: [],
            params: { i_vbase: "110" }
          }],
          edges: []
        }),
        "utf-8"
      );
    });

    test("★ body.templateName 非空时压过 query 的 template", async () => {
      const response = await runPost({
        search: `${validSearch}&template=${encodeURIComponent("国网E格式")}`,
        body: { templateText, templateName: "台区实时库" }
      });
      // 命中 body 的「台区实时库」→ 与厂站模型不匹配 → 400，且文案点名该模板
      expectBadRequest(response, "台区实时库");
    });

    test("body.templateName 缺失 / 空白 → 回落 query 的 template", async () => {
      for (const [label, templateName] of [["缺失", undefined], ["空串", ""], ["纯空白", "   "]]) {
        const response = await runPost({
          search: `${validSearch}&template=${encodeURIComponent("台区实时库")}`,
          body: templateName === undefined ? { templateText } : { templateText, templateName }
        });
        // 命中 query 的「台区实时库」→ 同样与厂站模型不匹配
        expectBadRequest(response, "台区实时库");
        expect(errorPayload(response).message, label).not.toContain("国网E格式");
      }
    });

    test("两侧模板名都对模型类型放行时导出成功（对照组：上面的 400 不是模板解析失败）", async () => {
      const response = await runPost({
        search: `${validSearch}&template=${encodeURIComponent("国网E格式")}`,
        body: { templateText }
      });
      expect(response.statusCode).toBe(200);
      expect(errorPayload(response).code).toBeUndefined();
    });
  });
});
// ── GBK 不可映射字符：静默写成 '?' ────────────────────────
//
// `sendEFile` 走 `iconv.encode(text, "gbk")`，而 iconv 对 GBK 里没有的码位
// **不报错、直接替换成 '?'**。于是设备名里的生僻字（U+20000 区）或 emoji 会变成
// 「名字??」，而 content-length、XML 声明、charset 头全都正确 —— 零告警。
//
// 三条导出链里只有 E 文件这样；SVG / CIM 走的是各自的编码路径（xmlEncoding.mjs）。
// 记在这里是因为「看不出问题」正是它最麻烦的地方：用户导出成功、文件也能打开，
// 只是名字错了。
//
// 只记录现状、不改实现：改则影响 E 文件的字节输出（前端落盘与后端下载必须逐字节
// 一致，两条链都要一起动）。

describe("handleV1ModelEFile —— GBK 不可映射字符", () => {
  /** 造一个名字里带不可映射字符的模型并导出。 */
  async function exportWithNodeName(nodeName) {
    const dir = join(paths.schemeFiles, SCHEME);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `${MODEL}.json`),
      JSON.stringify({
        name: MODEL,
        nodes: [{
          id: "bus1",
          kind: "ac-bus",
          name: nodeName,
          position: { x: 0, y: 0 },
          size: { width: 100, height: 20 },
          rotation: 0,
          scale: 1,
          terminals: [],
          params: { i_vbase: "110" }
        }],
        edges: []
      }),
      "utf-8"
    );
    const response = await runGet();
    return { response, text: iconv.decode(response.body, "gbk") };
  }

  test("★ 生僻字被静默替换成 '?'，响应仍是 200 且头正确", async () => {
    const { response, text } = await exportWithNodeName("母线𠀀");
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/plain; charset=gbk");
    expect(text).toContain("母线?");
    expect(text).not.toContain("𠀀");
  });

  test("emoji 同样被替换（每个不可映射字符一个 '?'）", async () => {
    const { text } = await exportWithNodeName("母线😀");
    expect(text).toContain("母线?");
    expect(text).not.toContain("😀");
  });

  test("★ content-length 与解码后的长度可能对不上（占位符是 1 字节）", async () => {
    const { response } = await exportWithNodeName("母线𠀀");
    // GBK 里 '?' 占 1 字节，而源字符在 UTF-8 里占 4 字节 —— 这正是「静默」的地方：
    // 头是对的，内容是错的，没有任何一处报错。
    expect(Number(response.headers["content-length"])).toBe(response.body.length);
  });

  test("可映射的汉字不受影响（对照组）", async () => {
    const { text } = await exportWithNodeName("母线一");
    expect(text).toContain("母线一");
  });

  test("★ encoding=utf-8 时同样的名字原样保留（说明问题出在编码而非生成）", async () => {
    const dir = join(paths.schemeFiles, SCHEME);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `${MODEL}.json`),
      JSON.stringify({
        name: MODEL,
        nodes: [{
          id: "bus1", kind: "ac-bus", name: "母线𠀀",
          position: { x: 0, y: 0 }, size: { width: 100, height: 20 },
          rotation: 0, scale: 1, terminals: [], params: { i_vbase: "110" }
        }],
        edges: []
      }),
      "utf-8"
    );
    const response = await runGet(`${validSearch}&encoding=utf-8`);
    expect(response.statusCode).toBe(200);
    expect(response.body.toString("utf-8")).toContain("母线𠀀");
  });
});
