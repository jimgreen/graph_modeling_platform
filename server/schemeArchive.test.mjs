// server/schemeArchive.mjs 直测 —— 此前零直呼（该文件没有配套测试）。
//
// ## 覆盖的是什么
//
// 方案 ZIP 的全部逻辑就在两个导出里：
//   - `listModelJsonFiles`：递归枚举模型 .json（含子方案目录），排除 scheme.json；
//   - `buildSchemeArchiveBuffer`：逐模型打包 .json + .e + .svg 三件套。
//
// 它是 `GET /webgrp/v1/schemes/export` 的核心，也是「派生格式不落盘、打包时实时生成」
// 这条决定的唯一实现点。此前只有集成层间接跑过成功路径。
//
// ## 依赖注入是刻意设计
//
// `renderArtifacts` 由调用方注入（生产里是 svgExport + eFileExport 复用同一装配），
// 所以这里既不必起 HTTP，也不必真跑导出链 —— 一条 tmpdir 目录树就能把
// 枚举规则、打包规则、以及「失败不产残缺包」这条纪律全测掉。
//
// 注意：`.test.mjs` 必须是纯 JS —— 不要写类型标注或非空断言 `!`，
// 那些会触发 RollupError: Parse failure，表现为「Tests: no tests」（看着像通过，实际没跑）。
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AdmZip from "adm-zip";
import { listModelJsonFiles, buildSchemeArchiveBuffer } from "./schemeArchive.mjs";

let root;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "scheme-archive-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** 在方案目录下写一个文件，自动建父目录。 */
function seed(relPath, content = "{}") {
  const full = join(root, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf-8");
}

// ─── listModelJsonFiles ──────────────────────────────────

describe("listModelJsonFiles", () => {
  test("递归列出子方案目录下的模型，dirParts / relativePath / modelName 各自成形", async () => {
    seed("模型A.json", '{"a":1}');
    seed("子方案1/模型B.json", '{"b":1}');
    seed("子方案1/更深一层/模型C.json", '{"c":1}');

    const found = await listModelJsonFiles(root);
    expect(found.length).toBe(3);
    const byName = new Map(found.map((m) => [m.modelName, m]));

    expect(byName.get("模型A").dirParts).toEqual([]);
    expect(byName.get("模型B").dirParts).toEqual(["子方案1"]);
    expect(byName.get("模型C").dirParts).toEqual(["子方案1", "更深一层"]);
    expect(byName.get("模型C").relativePath.replace(/\\/gu, "/")).toBe("子方案1/更深一层/模型C.json");
  });

  test("排除 scheme.json（那是注册表，不是模型）", async () => {
    seed("scheme.json", '{"schemes":[]}');
    seed("模型A.json");
    const found = await listModelJsonFiles(root);
    expect(found.map((m) => m.modelName)).toEqual(["模型A"]);
  });

  test("排除非 .json 文件与 .json 后缀大小写变体之外的杂项", async () => {
    seed("模型A.json");
    seed("遗留导出.e");
    seed("遗留导出.svg");
    seed("图片.png");
    const found = await listModelJsonFiles(root);
    expect(found.map((m) => m.modelName)).toEqual(["模型A"]);
  });

  test("子方案目录里的 scheme.json 也被排除", async () => {
    seed("子方案1/scheme.json");
    seed("子方案1/模型B.json");
    const found = await listModelJsonFiles(root);
    expect(found.map((m) => m.modelName)).toEqual(["模型B"]);
  });

  test("modelName 去掉 .json 后缀（不连大小写一起吞）", async () => {
    seed("模型带点.v2.json");
    const found = await listModelJsonFiles(root);
    expect(found.map((m) => m.modelName)).toEqual(["模型带点.v2"]);
  });

  test("空目录返回空数组（不是 null、不抛）", async () => {
    expect(await listModelJsonFiles(root)).toEqual([]);
  });

  test("★ 目录读失败上抛，不静默返回残缺清单", async () => {
    // 静默降级的代价：某棵子树凭空消失而 ZIP 仍成功返回，产出残缺备份包。
    await expect(listModelJsonFiles(join(root, "根本不存在"))).rejects.toThrow();
  });
});

// ─── buildSchemeArchiveBuffer ────────────────────────────

/** 记录调用参数的假 renderArtifacts，返回可识别的固定内容。 */
function fakeRenderer() {
  const calls = [];
  const renderArtifacts = async ({ dirParts, modelName }) => {
    calls.push({ dirParts, modelName });
    return {
      eFileBytes: Buffer.from(`# ${modelName} 的 E 文件`, "utf-8"),
      svg: `<svg data-model="${modelName}"/>`
    };
  };
  return { renderArtifacts, calls };
}

describe("buildSchemeArchiveBuffer", () => {
  test("★ 方案目录不存在 → 抛「方案目录不存在。」且不调 renderArtifacts", async () => {
    const { renderArtifacts, calls } = fakeRenderer();
    await expect(
      buildSchemeArchiveBuffer({ schemeDir: join(root, "不存在"), schemeName: "方案A", renderArtifacts })
    ).rejects.toThrow("方案目录不存在。");
    expect(calls).toEqual([]);
  });

  test("路径存在但是文件（不是目录）同样报「方案目录不存在。」", async () => {
    seed("不是目录.txt", "x");
    const { renderArtifacts } = fakeRenderer();
    await expect(
      buildSchemeArchiveBuffer({ schemeDir: join(root, "不是目录.txt"), schemeName: "方案A", renderArtifacts })
    ).rejects.toThrow("方案目录不存在。");
  });

  test("目录有效时逐模型调一次 renderArtifacts，返回 buffer/filename/schemeName", async () => {
    seed("模型A.json", '{"n":1}');
    const { renderArtifacts, calls } = fakeRenderer();
    const result = await buildSchemeArchiveBuffer({ schemeDir: root, schemeName: "方案A", renderArtifacts });
    expect(calls).toEqual([{ dirParts: [], modelName: "模型A" }]);
    expect(result.schemeName).toBe("方案A");
    expect(result.filename).toBe("方案A.zip");
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  test("★ 每个模型产出 json/e/svg 三件套，条目路径带 schemeName 前缀", async () => {
    seed("模型A.json", '{"name":"模型A"}');
    seed("子方案1/模型B.json", '{"name":"模型B"}');
    const { renderArtifacts } = fakeRenderer();
    const { buffer, filename } = await buildSchemeArchiveBuffer({
      schemeDir: root,
      schemeName: "方案A",
      renderArtifacts
    });
    expect(filename).toBe("方案A.zip");

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries().map((e) => e.entryName.replace(/\\/gu, "/")).sort();
    expect(entries).toEqual([
      "方案A/子方案1/模型B.e",
      "方案A/子方案1/模型B.json",
      "方案A/子方案1/模型B.svg",
      "方案A/模型A.e",
      "方案A/模型A.json",
      "方案A/模型A.svg"
    ]);
  });

  test("json 条目是磁盘原文，e/svg 来自 renderArtifacts（两者不是同一份内容）", async () => {
    seed("模型A.json", '{"磁盘原文":true}');
    const { renderArtifacts } = fakeRenderer();
    const { buffer } = await buildSchemeArchiveBuffer({ schemeDir: root, schemeName: "方案A", renderArtifacts });
    const zip = new AdmZip(buffer);
    const read = (name) => zip.getEntry(name).getData().toString("utf-8");

    expect(read("方案A/模型A.json")).toBe('{"磁盘原文":true}');
    expect(read("方案A/模型A.e")).toBe("# 模型A 的 E 文件");
    expect(read("方案A/模型A.svg")).toBe('<svg data-model="模型A"/>');
  });

  test("renderArtifacts 收到的 dirParts 与枚举一致（子方案模型带目录段）", async () => {
    seed("子方案1/更深/模型C.json");
    const { renderArtifacts, calls } = fakeRenderer();
    await buildSchemeArchiveBuffer({ schemeDir: root, schemeName: "方案A", renderArtifacts });
    expect(calls).toEqual([{ dirParts: ["子方案1", "更深"], modelName: "模型C" }]);
  });

  test("方案目录里没有模型时仍产出空 ZIP（不是报错）", async () => {
    const { renderArtifacts, calls } = fakeRenderer();
    const { buffer } = await buildSchemeArchiveBuffer({ schemeDir: root, schemeName: "方案A", renderArtifacts });
    expect(calls).toEqual([]);
    expect(new AdmZip(buffer).getEntries()).toEqual([]);
  });

  test("★ 任一模型生成失败即整体上抛（不产残缺包）", async () => {
    seed("模型A.json");
    seed("模型B.json");
    const { renderArtifacts } = fakeRenderer();
    const failing = async ({ modelName }) => {
      if (modelName === "模型B") {
        throw new Error("模型B 的 E 文件生成失败");
      }
      return { eFileBytes: Buffer.from("ok", "utf-8"), svg: "<svg/>" };
    };
    await expect(
      buildSchemeArchiveBuffer({ schemeDir: root, schemeName: "方案A", renderArtifacts: failing })
    ).rejects.toThrow("模型B 的 E 文件生成失败");
  });

  test("第一个模型就失败时同样上抛（失败发生在第一个也不是「跳过它」）", async () => {
    seed("模型A.json");
    const failing = async () => {
      throw new Error("生成失败");
    };
    await expect(
      buildSchemeArchiveBuffer({ schemeDir: root, schemeName: "方案A", renderArtifacts: failing })
    ).rejects.toThrow("生成失败");
  });

  test("失败上抛而非被吞成空包（catch 静默的代价是用户拿到残缺备份却以为成功）", async () => {
    seed("模型A.json");
    const failing = async () => {
      throw new Error("生成失败");
    };
    const settled = await buildSchemeArchiveBuffer({
      schemeDir: root,
      schemeName: "方案A",
      renderArtifacts: failing
    }).then(
      (value) => ({ ok: true, value }),
      (error) => ({ ok: false, error })
    );
    expect(settled.ok).toBe(false);
    expect(settled.value).toBeUndefined();
  });
});