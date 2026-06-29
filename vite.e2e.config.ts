import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// e2e 测试专用配置：仅跑 e2e/ 目录，需真实 Vite + 浏览器环境。
// 用 pnpm test:e2e 触发，不进默认 pnpm test。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["e2e/**/*.test.mjs"],
    testTimeout: 120000,
    hookTimeout: 120000
  }
});
