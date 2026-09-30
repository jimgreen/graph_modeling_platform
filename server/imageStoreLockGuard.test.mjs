// 图片库 / 图标库写入路径的锁守卫。
//
// manifest 与 folders 都是 read-modify-write：先读快照、改、再整体写回。
// 不进 `withImageStoreLock` 的写路径，与其它写路径并发时后写者用旧快照整批覆盖先写者 ——
// 症状是 HTTP 200、计数正常，但条目凭空消失，磁盘上的图片成了不可达孤儿
// （列表里没有、删除接口报 404）。
//
// 这个仓库曾经只有 `handleImportImageLibrary` 漏了锁（它一次能导入 128MB，
// 竞态窗口极宽），修掉之后用本守卫防它分叉回去：任何新增的
// 「读 manifest/folders → 写回」路径若忘了进锁，这里立刻点名。
//
// 守卫读源码而非跑并发 —— 并发测试的失败是概率性的，不能当回归依据；
// 「哪些写函数必须持锁」是纯结构事实，源码扫描能给出确定判据。
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverSource = readFileSync(
  path.resolve(fileURLToPath(new URL("../server/server.mjs", import.meta.url))),
  "utf8"
);

/** 按顶层 `function name(` 切段，返回 [函数名, 函数体]。 */
function topLevelFunctions(source) {
  const starts = [...source.matchAll(/^(?:async )?function ([A-Za-z0-9_]+)\(/gm)];
  return starts.map((match, index) => {
    const bodyStart = match.index + match[0].length;
    const bodyEnd = index + 1 < starts.length ? starts[index + 1].index : source.length;
    return [match[1], source.slice(bodyStart, bodyEnd)];
  });
}

const functions = topLevelFunctions(serverSource);

/** 读-改-写存储的写函数：出现这些调用即视为写路径，必须持锁。 */
const STORE_WRITERS = ["writeManifest", "writeImageFolders"];

const writePaths = functions.filter(([, body]) => STORE_WRITERS.some((fn) => body.includes(`${fn}(`)));

describe("图片库写路径的锁守卫", () => {
  test("守卫本身扫到了写路径（没扫空）", () => {
    expect(writePaths.length).toBeGreaterThan(4);
  });

  test("★ 所有 manifest / folders 写路径都在 withImageStoreLock 内", () => {
    const unlocked = writePaths
      .filter(([, body]) => !body.includes("withImageStoreLock"))
      .map(([name]) => name);
    expect(unlocked, `这些写 manifest / folders 的函数没进 withImageStoreLock：${unlocked.join(", ")}`).toEqual([]);
  });

  test("★ 导入图标库这条路径确实持锁（曾是同文件里唯一漏网的一个）", () => {
    const body = functions.find(([name]) => name === "handleImportImageLibrary")?.[1] ?? "";
    expect(body).toContain("withImageStoreLock");
    // 且是「读 → 改 → 写」整段都在锁内，不是只在写入那一行加锁
    expect(body.indexOf("withImageStoreLock")).toBeLessThan(body.indexOf("readManifest("));
    expect(body.indexOf("readManifest(")).toBeLessThan(body.indexOf("writeManifest("));
  });

  test("锁是进程内串行队列（拒绝也要放行后续任务，否则一次失败就永久卡死）", () => {
    expect(serverSource).toContain("function withImageStoreLock(task)");
    expect(serverSource).toContain("imageStoreLock = run.then(() => undefined, () => undefined);");
  });
});