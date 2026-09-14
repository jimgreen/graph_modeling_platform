import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// e2e 测试专用配置：仅跑 e2e/ 目录，需真实 Vite + 浏览器环境。
// 用 pnpm test:e2e 触发，不进默认 pnpm test。
// **文件串行**（fileParallelism: false）：e2e harness 的端口是**写死**的
// （image-server 5184 / Vite 5183，见 e2e/controlHarness.mjs），两个 e2e 文件并行跑会
// 互相抢占端口 —— 表现为后起的那个环境里前端永远不上线
// （`前端 WS 客户端未在 60000ms 内上线`）。
//
// 这是**低一层的补丁**：根因在 harness 的固定端口（更深的改法是监听 0 取空闲端口再下传，
// 代价是分配与 spawn 之间的 TOCTOU 窗口）。此处用串行换掉那个复杂度，代价是全局的 ——
// 它连累了与之无关的 apiV1Control。文件数涨上去、或串行的墙钟时间变成瓶颈时，回头改 harness。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["e2e/**/*.test.mjs"],
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 120000
  }
});
