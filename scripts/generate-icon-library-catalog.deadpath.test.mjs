import { describe, expect, test } from "vitest";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./generate-icon-library-catalog.mjs", import.meta.url));
const XML_ESCAPE_MODULE = fileURLToPath(new URL("../shared/xmlEscape.mjs", import.meta.url));
const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const REAL_CATALOG = path.join(REPO_ROOT, "public", "icon-library", "catalog.json");

function runFixture() {
  const caseDir = mkdtempSync(path.join(tmpdir(), "icon-library-catalog-public-"));
  try {
    mkdirSync(path.join(caseDir, "scripts"), { recursive: true });
    mkdirSync(path.join(caseDir, "shared"), { recursive: true });
    const iconLibraryDir = path.join(caseDir, "public", "icon-library", "fixture-library");
    mkdirSync(iconLibraryDir, { recursive: true });
    copyFileSync(SCRIPT, path.join(caseDir, "scripts", "generate-icon-library-catalog.mjs"));
    copyFileSync(XML_ESCAPE_MODULE, path.join(caseDir, "shared", "xmlEscape.mjs"));
    const manifest = {
      name: "fixture-library",
      label: "Fixture Library",
      totalIcons: 1,
      categories: [
        {
          id: "fixture-category",
          label: "Fixture Category",
          icons: [{ id: "fixture-icon", name: "Fixture Icon", file: "fixture.svg" }],
        },
      ],
    };
    const manifestPath = path.join(iconLibraryDir, "manifest.json");
    writeFileSync(manifestPath, JSON.stringify(manifest), "utf8");
    const result = spawnSync(process.execPath, [path.join(caseDir, "scripts", "generate-icon-library-catalog.mjs")], {
      cwd: caseDir,
      encoding: "utf8",
    });
    return { caseDir, result };
  } catch (error) {
    rmSync(caseDir, { recursive: true, force: true });
    throw error;
  }
}

describe("generate-icon-library-catalog 死路径守卫", () => {
  test("源码只指向版本跟踪的 public/icon-library，不再指向 data/icon-library", () => {
    const source = readFileSync(SCRIPT, "utf8");
    expect(source).toContain('path.join(rootDir, "public", "icon-library")');
    expect(source).not.toContain('path.join(rootDir, "data", "icon-library")');
  });

  test("版本跟踪的 public catalog 存在且可解析", () => {
    expect(existsSync(REAL_CATALOG)).toBe(true);
    const catalog = JSON.parse(readFileSync(REAL_CATALOG, "utf8"));
    expect(catalog.name).toBe("icon-library");
    expect(catalog.totalIcons).toBeGreaterThan(0);
  });

  test("脚本在只有 public/icon-library 的临时目录中也能生成 catalog", () => {
    const { caseDir, result } = runFixture();
    try {
      expect(result.status, result.stderr).toBe(0);
      const catalog = JSON.parse(readFileSync(path.join(caseDir, "public", "icon-library", "catalog.json"), "utf8"));
      expect(catalog.totalIcons).toBe(1);
      expect(catalog.libraries.map((library) => library.id)).toEqual(["fixture-library"]);
    } finally {
      rmSync(caseDir, { recursive: true, force: true });
    }
  });
});
