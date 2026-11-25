import { afterEach, describe, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  isValidProjectName,
  parseProjectName,
  selectPlatformConfig
} from "../projectConfig.mjs";

const tempRoots = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), "gmp-project-config-"));
  tempRoots.push(root);
  return root;
}

function writeConfig(filePath, value) {
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, typeof value === "string" ? value : JSON.stringify(value), "utf8");
}

describe("parseProjectName", () => {
  test("无参数时读取环境变量", () => {
    expect(parseProjectName([], { GRAPH_MODEL_PROJECT: "alpha" })).toBe("alpha");
  });

  test("支持空格和等号参数形式", () => {
    expect(parseProjectName(["--project", "alpha"], { GRAPH_MODEL_PROJECT: "env" })).toBe("alpha");
    expect(parseProjectName(["--project=beta"], { GRAPH_MODEL_PROJECT: "env" })).toBe("beta");
  });

  test("命令行项目名优先于环境变量", () => {
    expect(parseProjectName(["--verbose", "--project", "cli"], { GRAPH_MODEL_PROJECT: "env" })).toBe("cli");
  });

  test("空参数不会吞掉下一个 flag，也不会产生项目名", () => {
    expect(parseProjectName(["--project", "--host", "127.0.0.1"], { GRAPH_MODEL_PROJECT: "env" })).toBe(null);
    expect(parseProjectName(["--project="], { GRAPH_MODEL_PROJECT: "env" })).toBe(null);
  });
});

describe("isValidProjectName", () => {
  test("允许普通中文项目名和包含空格的单目录段", () => {
    expect(isValidProjectName("华东 项目")).toBe(true);
    expect(isValidProjectName("alpha-1")).toBe(true);
  });

  test("拒绝空值、点段、路径分隔符和 NUL", () => {
    for (const value of ["", "  ", ".", "..", "a/b", "a\\b", "a\0b", null, undefined]) {
      expect(isValidProjectName(value)).toBe(false);
    }
  });
});

describe("selectPlatformConfig", () => {
  test("未指定项目时只读取根配置", () => {
    const repoRoot = makeRoot();
    const rootConfigPath = join(repoRoot, "platform.config.json");
    writeConfig(rootConfigPath, { host: "root-host", dataDir: "./data" });
    const reads = [];
    const result = selectPlatformConfig({
      repoRoot,
      projectName: null,
      readFile(filePath, encoding) {
        reads.push(filePath);
        return readFileSync(filePath, encoding);
      }
    });

    expect(result.projectName).toBe(null);
    expect(result.projectDirectory).toBe(null);
    expect(result.platformConfigPath).toBe(resolve(rootConfigPath));
    expect(result.config.host).toBe("root-host");
    expect(reads).toEqual([resolve(rootConfigPath)]);
  });

  test("有效项目配置优先于根配置", () => {
    const repoRoot = makeRoot();
    const rootConfigPath = join(repoRoot, "platform.config.json");
    const projectDirectory = join(repoRoot, "projects", "alpha");
    const projectConfigPath = join(projectDirectory, "platform.config.json");
    writeConfig(rootConfigPath, { host: "root-host", dataDir: "./root-data" });
    writeConfig(projectConfigPath, { host: "project-host", dataDir: "./data" });

    const result = selectPlatformConfig({ repoRoot, projectName: "alpha" });

    expect(result.projectName).toBe("alpha");
    expect(result.projectDirectory).toBe(resolve(projectDirectory));
    expect(result.platformConfigPath).toBe(resolve(projectConfigPath));
    expect(result.dataDirBase).toBe(resolve(projectDirectory));
    expect(result.config).toEqual({ host: "project-host", dataDir: "./data" });
  });

  test("项目配置缺失、损坏或非对象时回退根配置", () => {
    const repoRoot = makeRoot();
    const rootConfigPath = join(repoRoot, "platform.config.json");
    writeConfig(rootConfigPath, { host: "root-host", dataDir: "./root-data" });

    for (const value of ["{ broken", "[1, 2, 3]"]) {
      const projectConfigPath = join(repoRoot, "projects", "alpha", "platform.config.json");
      writeConfig(projectConfigPath, value);
      const result = selectPlatformConfig({ repoRoot, projectName: "alpha" });
      expect(result.platformConfigPath).toBe(resolve(rootConfigPath));
      expect(result.dataDirBase).toBe(resolve(repoRoot));
      expect(result.config.host).toBe("root-host");
      rmSync(projectConfigPath, { force: true });
    }

    const missing = selectPlatformConfig({ repoRoot, projectName: "alpha" });
    expect(missing.platformConfigPath).toBe(resolve(rootConfigPath));
    expect(missing.dataDirBase).toBe(resolve(repoRoot));
    expect(missing.config.host).toBe("root-host");
  });

  test("非法项目名不会访问 projects 路径", () => {
    const repoRoot = makeRoot();
    const rootConfigPath = join(repoRoot, "platform.config.json");
    writeConfig(rootConfigPath, { host: "root-host" });
    const reads = [];

    const result = selectPlatformConfig({
      repoRoot,
      projectName: "../outside",
      readFile(filePath, encoding) {
        reads.push(filePath);
        return readFileSync(filePath, encoding);
      }
    });

    expect(result.projectName).toBe(null);
    expect(result.projectDirectory).toBe(null);
    expect(result.platformConfigPath).toBe(resolve(rootConfigPath));
    expect(reads.every((filePath) => !filePath.includes(`${resolve(repoRoot, "projects")}`))).toBe(true);
  });
});
