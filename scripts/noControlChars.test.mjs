// 源码不得含字面控制字节（守卫 NUL 这类隐形损坏）。
//
// 发现来源：查 `styleObjectToSvgAttribute` 的零直呼情况时，rg 报
// `src/staticRenderUtils.ts` 是 binary file。追进去发现第 113 行的
// `/^[\0-ÿ]$/`（Latin-1 单字符判定，给文本宽度估算用）里写的是**字面 NUL 字节**
// 而不是 `\x00` 转义 —— 两者行为完全等价（BMP 0x0000-0x02FF 穷举零差异），
// 但代价是整个源文件被工具判成二进制：rg 默认搜不到、diff 难以阅读、
// 编辑器里不可见、任何重写该文件的工具都可能悄悄损坏它。
//
// 字面 NUL 属于「看不见但一直在」的隐患：既不会让 tsc 报错，也不会让任何测试变红，
// 却让整个文件对半数工具不可用。故用一条廉价断言把整类问题挡在门外。
import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function listSourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSourceFiles(full));
    else if (/\.(ts|tsx|mjs|cjs|js)$/u.test(entry.name)) out.push(full);
  }
  return out;
}

/** 视为「绝不该出现在源码里」的控制字符。制表/换行/回车是合法空白，不在其中。 */
const FORBIDDEN_CONTROLS = [
  ["NUL", 0x00],
  ["SOH", 0x01],
  ["SUB", 0x1a], // DOS EOF 标记，误入会让某些读取器提前截断文件
  ["US", 0x1f]
];

const files = [
  ...listSourceFiles(path.join(repoRoot, "src")),
  ...listSourceFiles(path.join(repoRoot, "server")),
  ...listSourceFiles(path.join(repoRoot, "shared")),
  ...listSourceFiles(path.join(repoRoot, "scripts"))
];

describe("源码不得含字面控制字节", () => {
  test("扫描面有效：确实扫到了源文件", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  test("无 NUL / SUB 等控制字节（回归：staticRenderUtils.ts 曾含字面 NUL）", () => {
    const offenders = [];
    for (const file of files) {
      const bytes = readFileSync(file);
      for (const [label, code] of FORBIDDEN_CONTROLS) {
        if (bytes.includes(code)) {
          const line = bytes.slice(0, bytes.indexOf(code)).filter((b) => b === 0x0a).length + 1;
          offenders.push(
            `${path.relative(repoRoot, file).split(path.sep).join("/")}:${line}  ${label}(0x${code.toString(16)})`
          );
        }
      }
    }
    expect(
      offenders,
      `这些文件含字面控制字节：会让 rg/diff/编辑器把文件判成二进制，且不可见、无法被 tsc 或测试发现。\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  test("扫描面本身可用：能真正读到文件字节（防「扫描器静默跳过」）", () => {
    // 回归自查：若 listSourceFiles 失效，上面那条会因「零文件」而恒绿
    const sample = path.join(repoRoot, "src", "staticRenderUtils.ts");
    expect(statSync(sample).isFile()).toBe(true);
    const bytes = readFileSync(sample);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.includes(0x00), "该文件已不应再含 NUL").toBe(false);
  });
});
