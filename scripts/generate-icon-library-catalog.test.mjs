import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_SCRIPT = fileURLToPath(new URL("./generate-icon-library-catalog.mjs", import.meta.url));
const XML_ESCAPE_MODULE = fileURLToPath(new URL("../shared/xmlEscape.mjs", import.meta.url));
const REAL_OUTPUTS = [
  fileURLToPath(new URL("../public/icon-library/catalog.json", import.meta.url)),
  fileURLToPath(new URL("../public/icon-library/README.md", import.meta.url)),
];
const realOutputBytes = new Map(REAL_OUTPUTS.map((filePath) => [filePath, readFileSync(filePath)]));

let caseDir;
let scriptPath;
let iconLibraryDir;

beforeEach(() => {
  caseDir = mkdtempSync(path.join(tmpdir(), "icon-library-catalog-"));
  mkdirSync(path.join(caseDir, "scripts"), { recursive: true });
  mkdirSync(path.join(caseDir, "shared"), { recursive: true });
  copyFileSync(SOURCE_SCRIPT, path.join(caseDir, "scripts", "generate-icon-library-catalog.mjs"));
  copyFileSync(XML_ESCAPE_MODULE, path.join(caseDir, "shared", "xmlEscape.mjs"));
  iconLibraryDir = path.join(caseDir, "public", "icon-library");
  mkdirSync(iconLibraryDir, { recursive: true });
  scriptPath = path.join(caseDir, "scripts", "generate-icon-library-catalog.mjs");
});

afterEach(() => {
  for (const [filePath, bytes] of realOutputBytes) {
    expect(readFileSync(filePath)).toEqual(bytes);
  }
  rmSync(caseDir, { recursive: true, force: true });
});

function seedLibrary(directoryName, manifest) {
  const libraryDir = path.join(iconLibraryDir, directoryName);
  mkdirSync(libraryDir, { recursive: true });
  writeFileSync(path.join(libraryDir, "manifest.json"), JSON.stringify(manifest), "utf8");
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

function readOutput(name) {
  return readFileSync(path.join(iconLibraryDir, name), "utf8");
}

const alphaManifest = {
  name: "alpha-id",
  label: "Alpha Library",
  root: "/icon-library/alpha-library",
  totalIcons: 2,
  sourcePolicy: "fixture",
  sources: ["fixture"],
  categories: [
    {
      id: "alpha-category",
      label: "Alpha Category",
      icons: [
        {
          id: "alpha-one",
          name: "Alpha One",
          file: "alpha-one.svg",
          source: "fixture",
          sourceLabel: "Fixture Source",
          license: "MIT",
        },
        {
          id: "alpha-two",
          name: "Alpha Two",
          file: "alpha-two.svg",
          source: "fixture",
          sourceLabel: "Fixture Source",
          license: "MIT",
        },
      ],
    },
  ],
};

const zetaManifest = {
  name: "zeta-id",
  label: "Zeta Library",
  root: "/icon-library/zeta-library",
  totalIcons: 1,
  sourcePolicy: "fixture",
  sources: ["fixture"],
  categories: [
    {
      id: "zeta-category",
      label: "Zeta Category",
      icons: [
        {
          id: "zeta-one",
          name: "Zeta One",
          file: "zeta-one.svg",
          source: "fixture",
          sourceLabel: "Fixture Source",
          license: "Apache-2.0",
        },
      ],
    },
  ],
};

const compatibilityManifest = {
  name: "must-not-appear",
  label: "Compatibility Library",
  totalIcons: 1,
  categories: [
    {
      id: "compatibility-category",
      icons: [{ id: "compatibility-icon", file: "compatibility.svg" }],
    },
  ],
};

describe("generate-icon-library-catalog CLI", () => {
  test("汇总多库、排除兼容库，并保持库名排序", () => {
    seedLibrary("zeta-library", zetaManifest);
    seedLibrary("alpha-library", alphaManifest);
    seedLibrary("docer-free-compatible", compatibilityManifest);
    seedLibrary("office-fluent-compatible", compatibilityManifest);

    const result = run();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Generated icon catalog with 3 icons from 2 libraries");

    const catalog = JSON.parse(readOutput("catalog.json"));
    expect(catalog.totalIcons).toBe(3);
    expect(catalog.libraries.map((library) => library.label)).toEqual(["Alpha Library", "Zeta Library"]);
    expect(catalog.libraries.map((library) => library.totalIcons)).toEqual([2, 1]);
    expect(catalog.libraries.some((library) => library.label === "Compatibility Library")).toBe(false);

    const searchIndex = JSON.parse(readOutput("search-index.json"));
    expect(searchIndex).toHaveLength(catalog.totalIcons);
    expect(new Set(searchIndex.map((item) => item.id)).size).toBe(searchIndex.length);
    expect(searchIndex.map((item) => item.name)).toEqual(["Alpha One", "Alpha Two", "Zeta One"]);

    expect(readOutput("README.md")).toContain("- Total icons: 3");
    expect(readOutput("README.md")).toContain("- Libraries: 2");
    expect(readOutput("index.html")).toContain("Alpha Library");
    expect(readOutput("index.html")).toContain("Zeta One");
    expect(readOutput("index.html")).not.toContain("Compatibility Library");
  });

  test("库 manifest 为非法 JSON 时跳过该库并仍生成有效产物", () => {
    seedLibrary("valid-library", alphaManifest);
    const invalidDir = path.join(iconLibraryDir, "invalid-library");
    mkdirSync(invalidDir, { recursive: true });
    writeFileSync(path.join(invalidDir, "manifest.json"), "{ invalid json", "utf8");

    const result = run();
    expect(result.status, result.stderr).toBe(0);

    const catalog = JSON.parse(readOutput("catalog.json"));
    expect(catalog.libraries.map((library) => library.id)).toEqual(["alpha-id"]);
    expect(catalog.totalIcons).toBe(2);
    expect(JSON.parse(readOutput("search-index.json"))).toHaveLength(2);
  });

  test("空图标库目录生成零数量 catalog、搜索索引、README 和 HTML", () => {
    const result = run();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Generated icon catalog with 0 icons from 0 libraries");

    const catalog = JSON.parse(readOutput("catalog.json"));
    expect(catalog.totalIcons).toBe(0);
    expect(catalog.libraries).toEqual([]);
    expect(JSON.parse(readOutput("search-index.json"))).toEqual([]);
    expect(readOutput("README.md")).toContain("- Total icons: 0");
    expect(readOutput("README.md")).toContain("- Libraries: 0");
    expect(readOutput("index.html")).toContain("共 0 个 SVG 图标，来自 0 个分类图标库");
    expect(readOutput("index.html")).not.toContain("<article");
  });
});
