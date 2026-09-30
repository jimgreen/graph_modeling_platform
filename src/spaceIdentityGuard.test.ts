// 空间标识口径的两条守卫（项目 CLAUDE.md 里写着，但此前没有任何测试盯着）：
//
// 1) **前端只用 Cookie 标空间**：不设 `X-Space` 头、请求也不带 `?space=`。
//    解析链（X-Space > ?space= > Cookie > 第一个空间）是后端的事；前端若自己也开始发头或查询参数，
//    就多出第二个真值来源 —— 症状是「切了空间但某些请求还落在旧空间」，不抛错。
// 2) **Cookie 名字两侧一致**：`src/spaceClient.ts` 与 `server/spaceStore.mjs` 各写了一份
//    `SPACE_COOKIE_NAME`。这是有意的重复（跨语言边界），但必须同值 —— 改一边不改另一边，
//    症状是「切空间后端认不出」，同样不抛错。
//
//
// 两条都已正向验证过：往 src 塞一个带 "X-Space" 头的文件立刻转红并点名那个文件；把后端
// SPACE_COOKIE_NAME 改成 gmp_space2 同样转红（expected 'gmp_space' to be 'gmp_space2'）。
//
// 已知局限：注释剥离用正则，只认整行 `//` 与 `/* */` 块；URL 里的 `https://` 不会被误伤
// （`//` 前必须是行首或空白）。这够当守卫，不当证明。
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = fileURLToPath(new URL(".", import.meta.url));
const serverDir = join(srcDir, "..", "server");

const stripComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/.*$/gm, "$1");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : sourceFiles(full);
    }
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes(".test.")) return [];
    return [full];
  });
}

const readCode = (path: string): string => stripComments(readFileSync(path, "utf8"));

describe("空间标识：前端只用 Cookie", () => {
  test("★ src 下（除测试与注释）没有出现 X-Space 头", () => {
    const hits: string[] = [];
    for (const file of sourceFiles(srcDir)) {
      if (readCode(file).includes("X-Space")) hits.push(relative(srcDir, file));
    }
    expect(hits, "前端不要自己发 X-Space 头：空间标识只走 Cookie").toEqual([]);
  });

  test("★ src 下（除测试与注释）没有出现 ?space= 查询参数", () => {
    const hits: string[] = [];
    for (const file of sourceFiles(srcDir)) {
      if (readCode(file).includes("?space=")) hits.push(relative(srcDir, file));
    }
    expect(hits, "前端不要自己拼 ?space=：解析链是后端的事").toEqual([]);
  });

  test("★ 切换空间写的是 Cookie（带 Path 与有效期），不是头", () => {
    const code = readCode(join(srcDir, "spaceClient.ts"));
    expect(code).toContain("document.cookie =");
    expect(code).toContain("SPACE_COOKIE_NAME}=${encodeURIComponent(id)}");
    expect(code).toContain("Path=/");
    expect(code).toContain("Max-Age=");
  });
});

describe("空间标识：Cookie 名字两侧一致", () => {
  const cookieNameOf = (path: string): string =>
    /export const SPACE_COOKIE_NAME = "([^"]+)";/.exec(readFileSync(path, "utf8"))?.[1] ?? "";

  test("★ 前端与后端写的 Cookie 名字同值", () => {
    const frontend = cookieNameOf(join(srcDir, "spaceClient.ts"));
    const backend = cookieNameOf(join(serverDir, "spaceStore.mjs"));
    expect(frontend).toBeTruthy();
    expect(frontend).toBe(backend);
  });
});
