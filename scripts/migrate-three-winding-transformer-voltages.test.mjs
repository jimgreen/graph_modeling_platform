import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./migrate-three-winding-transformer-voltages.mjs", import.meta.url));

let workDir;
let modelPath;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "migrate-three-winding-voltage-"));
  modelPath = join(workDir, "data", "schemes", "files", "测试", "模型.json");
  mkdirSync(join(workDir, "data", "schemes", "files", "测试"), { recursive: true });
});
afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function seed() {
  const project = {
    nodes: [
      {
        id: "xf-1",
        kind: "ac-three-winding-transformer",
        name: "三绕组主变",
        terminals: [
          { id: "t1", vbase: "110" },
          { id: "t2", vbase: "35" },
          { id: "t3", vbase: "10" }
        ],
        params: {
          i_vbase: "110",
          k_vbase: "220",
          j_vbase: "220",
          medium_vbase: "220",
          low_vbase: "220"
        }
      },
      {
        id: "xf-2",
        kind: "ac-three-winding-transformer",
        terminals: [
          { id: "t1", vbase: "0" },
          { id: "t2", vbase: "0" },
          { id: "t3", vbase: "0" }
        ],
        params: { i_vbase: "110", k_vbase: "35", j_vbase: "10" }
      }
    ]
  };
  const raw = JSON.stringify(project, null, 2);
  writeFileSync(modelPath, raw, "utf-8");
  return raw;
}

function run(args = []) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: workDir,
    env: { ...process.env, GRAPH_MODEL_DATA_DIR: join(workDir, "data") },
    encoding: "utf-8"
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

describe("migrate-three-winding-transformer-voltages", () => {
  test("dry-run 只报告，不写文件或备份", () => {
    const before = seed();
    const result = run();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("待迁移 4 个字段 / 1 个节点 / 1 个文件");
    expect(readFileSync(modelPath, "utf-8")).toBe(before);
    expect(readdirSync(join(workDir, "data", "schemes", "files", "测试"))).toEqual(["模型.json"]);
  });

  test("apply 以端子为准同步 canonical/legacy 字段，并先备份", () => {
    seed();
    const result = run(["--apply"]);

    expect(result.status).toBe(0);
    const project = JSON.parse(readFileSync(modelPath, "utf-8"));
    expect(project.nodes[0].params).toMatchObject({ i_vbase: "110", k_vbase: "35", j_vbase: "10", medium_vbase: "35", low_vbase: "10" });
    expect(project.nodes[1].params).toMatchObject({ i_vbase: "110", k_vbase: "35", j_vbase: "10" });
    const backups = readdirSync(join(workDir, "data", "schemes", "files", "测试")).filter((name) => name.endsWith(".bak"));
    expect(backups).toHaveLength(1);
    expect(readFileSync(join(workDir, "data", "schemes", "files", "测试", backups[0]), "utf-8")).toContain('"j_vbase": "220"');
  });

  test("重复 dry-run 幂等，不再报告待迁移字段", () => {
    seed();
    expect(run(["--apply"]).status).toBe(0);
    const result = run();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("无待迁移字段");
  });

  test("端子为 0 时保留参数值", () => {
    seed();
    expect(run(["--apply"]).status).toBe(0);
    const project = JSON.parse(readFileSync(modelPath, "utf-8"));
    expect(project.nodes[1].params).toMatchObject({ i_vbase: "110", k_vbase: "35", j_vbase: "10" });
  });

  test("缺少模型目录时失败且不创建目录", () => {
    rmSync(join(workDir, "data"), { recursive: true, force: true });
    const result = run();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("找不到任何模型目录");
    expect(existsSync(join(workDir, "data"))).toBe(false);
  });
});
