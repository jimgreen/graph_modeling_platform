// 结构性守卫：**每个 readJsonBody 调用点都必须被「畸形 JSON → 400」保护**。
//
// ## 为什么要这个守卫
//
// 仓库里 `readJsonBody` 有两类实现，机制**不同**：
//
//   server.mjs 的那份 —— **自带** try/catch，抛 `MalformedJsonError`（带 statusCode）
//     → 派发层外层 catch 映射成 400。**调用点不需要**再包。
//
//   apiV1Runtime / apiV1Control / eFileExport / sendModel 的那份 —— **裸** `JSON.parse`
//     → SyntaxError 没有 statusCode，会被外层按「其余仍是 500」处理。
//     故**每个调用点都必须自己** try/catch 并 `sendV1Error(..., "bad-request", ...)`。
//
// 现状是逐个 handler 手写 try/catch（`apiV1Control.mjs` 里就有 9 处重复的
// `"请求体须为合法 JSON。"`）。**这意味着：新增端点时若忘了包，畸形 JSON 就会静默
// 回 500 + 泄露 Node 原始英文 SyntaxError** —— 正是本会话早期修过的那类缺陷，
// 当时只修了内部域 4 个端点。
//
// 本守卫把「不能漏」变成**结构性约束**而非人工检查：扫描全部调用点，
// 任何未受保护的调用点立即让测试变红。
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

/** readJsonBody 内部自带 try/catch 的文件：其调用点无需额外保护 */
const SELF_GUARDED = new Set(["server.mjs", "config.mjs"]);

/** 裸 JSON.parse 的文件：调用点必须有 catch + bad-request 映射 */
const NEEDS_CALLER_GUARD = new Set([
  "apiV1Runtime.mjs",
  "apiV1Control.mjs",
  "eFileExport.mjs",
  "sendModel.mjs"
]);

const serverDir = "server";
const sourceFiles = readdirSync(serverDir).filter(
  (file) => file.endsWith(".mjs") && !file.endsWith(".test.mjs")
);

/**
 * 某行是否被 try 块覆盖。
 *
 * 判定方式：从该行向上回溯，看是否先撞到 try（受保护）还是先撞到**函数边界**
 * （`export async function` / `function` 声明且不含 try，视为不受保护）。
 * 窗口给到 40 行 —— 真实代码里最长的包裹是 `handleV1ModelSend`：
 * `try {` 在第 125 行、`readJsonBody` 在第 133 行，跨度 8 行，但函数头在 124 行，
 * 故必须**先判函数边界再判 try**，否则会在中途的 `}` / `return;` 上误判。
 */
const insideTryBlock = (lines, index) => {
  for (let cursor = index; cursor >= 0 && cursor >= index - 40; cursor -= 1) {
    const line = lines[cursor];
    // 函数边界：向上遇到函数声明却还没见到 try → 该函数整体无保护
    if (/^\s*(?:export\s+)?(?:async\s+)?function\s+\w+/.test(line) && !/\btry\s*\{/.test(line)) {
      return false;
    }
    if (/\btry\s*\{/.test(line)) return true;
  }
  return false;
};

describe("readJsonBody 调用点的畸形 JSON 保护", () => {
  test("裸 JSON.parse 的文件里，每个调用点都被 catch 保护", () => {
    const unprotected = [];
    for (const file of sourceFiles) {
      if (!NEEDS_CALLER_GUARD.has(file)) continue;
      const lines = readFileSync(`${serverDir}/${file}`, "utf8").split(/\r?\n/);
      const hasBadRequestMapping = lines.some((line) => /"bad-request"/.test(line));
      lines.forEach((line, index) => {
        if (!/await readJsonBody\(/.test(line)) return;
        if (!insideTryBlock(lines, index)) {
          unprotected.push(`${file}:${index + 1}  ${line.trim()}`);
        }
      });
      if (lines.some((l) => /await readJsonBody\(/.test(l)) && !hasBadRequestMapping) {
        unprotected.push(`${file}  整体缺少 "bad-request" 映射`);
      }
    }
    expect(unprotected, `以下调用点未被畸形 JSON 保护（会回 500 并泄露 SyntaxError）:\n${unprotected.join("\n")}`).toEqual([]);
  });

  test("server.mjs 内部版 readJsonBody 仍带 try/catch + 固定中文错误（不靠调用点）", () => {
    const src = readFileSync(`${serverDir}/server.mjs`, "utf8");
    const body = src.slice(src.indexOf("async function readJsonBody"));
    // 截到下一个函数定义为止
    const fn = body.slice(0, body.indexOf("\n}\n") + 3);
    expect(fn, "readJsonBody 必须自带 try/catch").toMatch(/try\s*\{/);
    expect(fn, "必须抛 MalformedJsonError").toContain("MalformedJsonError");
    // 不透出 Node 原始 SyntaxError 文本
    expect(fn).toContain("请求体须为合法 JSON。");
    expect(fn).not.toMatch(/error\.message|String\(error\)/);
  });

  test("自保护清单里的文件确实不需要调用点包 try（避免守卫自身写错）", () => {
    // 若哪天 server.mjs 的 readJsonBody 被改成裸 JSON.parse，本守卫会漏检 ——
    // 故在此显式断言「自保护」这个前提成立。
    for (const file of SELF_GUARDED) {
      if (file === "server.mjs") {
        const src = readFileSync(`${serverDir}/${file}`, "utf8");
        const at = src.indexOf("async function readJsonBody");
        expect(at, "server.mjs 必须仍有 readJsonBody").toBeGreaterThan(-1);
        expect(src.slice(at, at + 400), "server.mjs 版必须自带 try/catch").toMatch(/try\s*\{/);
      }
    }
  });

  test("清单里的文件都真实存在（守卫不因拼错文件名而空跑）", () => {
    for (const file of NEEDS_CALLER_GUARD) {
      expect(sourceFiles, `${file} 应存在于 server/`).toContain(file);
    }
    for (const file of SELF_GUARDED) {
      expect(sourceFiles, `${file} 应存在于 server/`).toContain(file);
    }
  });

  test("清单非空且不重叠（两类机制互斥）", () => {
    expect(NEEDS_CALLER_GUARD.size).toBeGreaterThan(0);
    for (const file of NEEDS_CALLER_GUARD) {
      expect(SELF_GUARDED.has(file), `${file} 不该同时出现在两类清单里`).toBe(false);
    }
  });
});
