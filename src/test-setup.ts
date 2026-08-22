import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";

// 在每个测试文件加载业务模块之前隔离服务端数据根目录，避免静态导入
// server.mjs 时读取、迁移或写回仓库 data/ 下的真实方案和全局线路数据。
const isolatedTestDataDir = mkdtempSync(join(tmpdir(), "graph-modeling-platform-vitest-"));
process.env.GRAPH_MODEL_DATA_DIR = isolatedTestDataDir;

afterAll(() => {
  rmSync(isolatedTestDataDir, { recursive: true, force: true });
});

// vitest 测试环境全局桩
if (typeof (globalThis as any).showGlobalMessage !== "function") {
  (globalThis as any).showGlobalMessage = () => {};
}
if (typeof (globalThis as any).showGlobalConfirm !== "function") {
  (globalThis as any).showGlobalConfirm = () => Promise.resolve(true);
}
