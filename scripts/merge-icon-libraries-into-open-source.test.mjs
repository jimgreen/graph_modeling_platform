import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_SCRIPT = fileURLToPath(new URL("./merge-icon-libraries-into-open-source.mjs", import.meta.url));
const REPO_ROOT = path.resolve(path.dirname(SOURCE_SCRIPT), "..");
const REAL_ICON_LIBRARY_DIR = path.join(REPO_ROOT, "public", "icon-library");
const REAL_CATALOG_PATH = path.join(REAL_ICON_LIBRARY_DIR, "catalog.json");
const TARGET_LIBRARY_ID = "open-source-svg";
const SOURCE_LIBRARY_IDS = ["docer-free-compatible", "office-fluent-compatible"];

let caseDir;
let scriptPath;
let iconLibraryDir;
let realDirectoryBefore;
let realCatalogBefore;

function listTree(rootDir) {
  const entries = [];
  function visit(currentDir) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, absolutePath);
      entries.push(`${entry.isDirectory() ? "d" : "f"}:${relativePath}`);
      if (entry.isDirectory()) {
        visit(absolutePath);
      }
    }
  }
  visit(rootDir);
  return entries.sort();
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function seedLibrary(libraryId, manifest, files = {}) {
  const libraryDir = path.join(iconLibraryDir, libraryId);
  mkdirSync(libraryDir, { recursive: true });
  writeJson(path.join(libraryDir, "manifest.json"), manifest);
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(libraryDir, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents, "utf8");
  }
}

function seedTarget(categories, files = {}) {
  seedLibrary(TARGET_LIBRARY_ID, {
    name: TARGET_LIBRARY_ID,
    label: "开源 SVG 综合图标库",
    root: "/icon-library/open-source-svg",
    categories,
  }, files);
}

function svg(pathData) {
  return `<svg xmlns="http://www.w3.org/2000/svg"><path d="${pathData}"/></svg>`;
}

function run() {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: caseDir,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function readTargetJson(fileName) {
  return JSON.parse(readFileSync(path.join(iconLibraryDir, TARGET_LIBRARY_ID, fileName), "utf8"));
}

function snapshotOutput(normalizeDynamicFields = false) {
  const targetDir = path.join(iconLibraryDir, TARGET_LIBRARY_ID);
  const files = new Map();
  function visit(currentDir) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      const relativePath = path.relative(targetDir, absolutePath);
      let contents = readFileSync(absolutePath);
      if (normalizeDynamicFields && ["manifest.json", "source-audit.json"].includes(relativePath)) {
        const parsed = JSON.parse(contents.toString("utf8"));
        parsed.generatedAt = "<generated-at>";
        contents = Buffer.from(`${JSON.stringify(parsed, null, 2)}\n`, "utf8");
      }
      files.set(relativePath, contents.toString("base64"));
    }
  }
  visit(targetDir);
  return Object.fromEntries([...files.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function seedMergeFixture() {
  const baseSvg = svg("M0 0h1v1H0z");
  const docerSvg = svg("M1 0h1v1H1z");
  const officeSvg = svg("M2 0h1v1H2z");
  const uniqueSvg = svg("M3 0h1v1H3z");

  seedTarget(
    [{
      id: "base",
      label: "基础",
      icons: [{ id: "base", name: "基础图标", file: "base.svg" }],
    }],
    { "base.svg": baseSvg },
  );
  seedLibrary(
    "docer-free-compatible",
    {
      name: "docer-free-compatible",
      label: "Docer 兼容图标",
      categories: [{
        id: "shared",
        label: "共享分类",
        icons: [
          { id: "same", name: "同名图标", file: "same.svg" },
          { id: "duplicate", name: "重复图标", file: "duplicate.svg" },
        ],
      }],
    },
    { "same.svg": docerSvg, "duplicate.svg": docerSvg },
  );
  seedLibrary(
    "office-fluent-compatible",
    {
      name: "office-fluent-compatible",
      label: "Office Fluent 兼容图标",
      categories: [{
        id: "shared",
        label: "共享分类",
        icons: [
          { id: "same", name: "同名图标", file: "same.svg" },
          { id: "duplicate", name: "重复图标", file: "duplicate.svg" },
          { id: "unique", name: "唯一图标", file: "unique.svg" },
        ],
      }],
    },
    { "same.svg": officeSvg, "duplicate.svg": docerSvg, "unique.svg": uniqueSvg },
  );
}

beforeEach(() => {
  realDirectoryBefore = listTree(REAL_ICON_LIBRARY_DIR);
  realCatalogBefore = readFileSync(REAL_CATALOG_PATH);

  caseDir = mkdtempSync(path.join(tmpdir(), "merge-icon-libraries-"));
  mkdirSync(path.join(caseDir, "scripts"), { recursive: true });
  mkdirSync(path.join(caseDir, "shared"), { recursive: true });
  scriptPath = path.join(caseDir, "scripts", "merge-icon-libraries-into-open-source.mjs");
  copyFileSync(SOURCE_SCRIPT, scriptPath);
  copyFileSync(path.join(REPO_ROOT, "shared", "xmlEscape.mjs"), path.join(caseDir, "shared", "xmlEscape.mjs"));
  copyFileSync(path.join(REPO_ROOT, "shared", "pathSafety.mjs"), path.join(caseDir, "shared", "pathSafety.mjs"));
  iconLibraryDir = path.join(caseDir, "data", "icon-library");
});

afterEach(() => {
  try {
    expect(listTree(REAL_ICON_LIBRARY_DIR)).toEqual(realDirectoryBefore);
    expect(readFileSync(REAL_CATALOG_PATH)).toEqual(realCatalogBefore);
  } finally {
    rmSync(caseDir, { recursive: true, force: true });
  }
});

describe("merge-icon-libraries-into-open-source CLI", () => {
  test("合并多个库：同名不同 SVG 保留并改成来源前缀 ID，完全相同结构跳过", () => {
    seedMergeFixture();

    const result = run();
    const manifest = readTargetJson("manifest.json");
    const audit = readTargetJson("source-audit.json");
    const sharedIcons = manifest.categories.find((category) => category.id === "shared").icons;

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Merged 3 icons into open-source-svg; skipped 2 exact duplicates; total 4.");
    expect(manifest.totalIcons).toBe(4);
    expect(sharedIcons.map((icon) => icon.id)).toEqual([
      "docer-free-compatible-shared-same",
      "office-fluent-compatible-shared-same",
      "office-fluent-compatible-shared-unique",
    ]);
    expect(sharedIcons.map((icon) => icon.file)).toEqual([
      "merged/docer-free-compatible/same.svg",
      "merged/office-fluent-compatible/same.svg",
      "merged/office-fluent-compatible/unique.svg",
    ]);
    expect(audit.mergeSummary).toMatchObject({
      copied: 3,
      skippedDuplicates: 2,
      byLibrary: {
        "docer-free-compatible": { copied: 1, skippedDuplicates: 1 },
        "office-fluent-compatible": { copied: 2, skippedDuplicates: 1 },
      },
    });
  });

  test("单个源库为空时仍合并另一个源库", () => {
    const baseSvg = svg("M0 0h1v1H0z");
    const officeSvg = svg("M1 0h1v1H1z");
    seedTarget([{ id: "base", icons: [{ id: "base", file: "base.svg" }] }], { "base.svg": baseSvg });
    seedLibrary("docer-free-compatible", { categories: [] });
    seedLibrary(
      "office-fluent-compatible",
      { label: "Office", categories: [{ id: "office", icons: [{ id: "one", file: "one.svg" }] }] },
      { "one.svg": officeSvg },
    );

    const result = run();
    const manifest = readTargetJson("manifest.json");
    const audit = readTargetJson("source-audit.json");

    expect(result.status, result.stderr).toBe(0);
    expect(manifest.totalIcons).toBe(2);
    expect(audit.mergeSummary.byLibrary["docer-free-compatible"]).toEqual({ copied: 0, skippedDuplicates: 0 });
    expect(audit.mergeSummary.byLibrary["office-fluent-compatible"]).toEqual({ copied: 1, skippedDuplicates: 0 });
  });

  test("两个源库都为空时保留基础产物，不创建 merged 目录", () => {
    const baseSvg = svg("M0 0h1v1H0z");
    seedTarget([{ id: "base", icons: [{ id: "base", file: "base.svg" }] }], { "base.svg": baseSvg });
    seedLibrary("docer-free-compatible", { categories: [{ id: "empty", icons: [] }] });
    seedLibrary("office-fluent-compatible", { categories: [] });

    const result = run();
    const audit = readTargetJson("source-audit.json");

    expect(result.status, result.stderr).toBe(0);
    expect(readTargetJson("manifest.json").totalIcons).toBe(1);
    expect(audit.mergeSummary).toMatchObject({ copied: 0, skippedDuplicates: 0 });
    expect(existsSync(path.join(iconLibraryDir, TARGET_LIBRARY_ID, "merged"))).toBe(false);
  });

  test("源目录不存在时以非零退出，并在 stderr 报告缺失 manifest", () => {
    seedTarget([{ id: "base", icons: [{ id: "base", file: "base.svg" }] }], { "base.svg": svg("M0 0h1v1H0z") });
    seedLibrary("office-fluent-compatible", { categories: [] });

    const result = run();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(path.join("docer-free-compatible", "manifest.json"));
  });

  test("非法 JSON 输入时以非零退出", () => {
    seedTarget([{ id: "base", icons: [{ id: "base", file: "base.svg" }] }], { "base.svg": svg("M0 0h1v1H0z") });
    const sourceDir = path.join(iconLibraryDir, "docer-free-compatible");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(path.join(sourceDir, "manifest.json"), "{not-json", "utf8");

    const result = run();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("SyntaxError");
  });

  test("连续运行两次时，完整产物清单与文件内容一致（generatedAt 为预期的动态字段）", () => {
    seedMergeFixture();

    const first = run();
    const firstManifest = readTargetJson("manifest.json");
    const firstOutput = snapshotOutput(true);
    const second = run();
    const secondManifest = readTargetJson("manifest.json");
    const secondOutput = snapshotOutput(true);

    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toBe(first.stdout);
    expect(secondManifest.generatedAt).not.toBe(firstManifest.generatedAt);
    expect(secondOutput).toEqual(firstOutput);
    expect(readTargetJson("manifest.json").totalIcons).toBe(4);
  });
});
