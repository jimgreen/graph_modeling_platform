// 图标库按 id 覆盖时，不得留下「manifest 指向已删文件」的悬空条目。
//
// handleImportImageLibrary 此前是**先删旧文件、再写新文件**，而 writeManifest 要等整个
// 资产循环跑完才落盘。于是循环中途失败（磁盘满 / 权限丢失 / 文件被占用）时：
//   旧文件已被 rm，新文件没写成，而 manifest 仍是循环前那份 —— 仍指向旧文件名。
// 结果是图标库里一条指向不存在文件的记录，SVG 导出引用到它就失败。
//
// 改为「先写新的、成功后再删旧的」；写本身也走原子写，避免新文件被截断成半个图元。
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { apiPath } from "./config.mjs";

// 1x1 PNG
const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let failWriteFor = "";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    writeFile: async (path, ...rest) => {
      // 按**文件名片段**匹配：写现在是原子的，落在 `<目标>.<pid>.<uuid>.tmp` 上，
      // 等值匹配打不中（探针实测：改成原子写后第一条用例的注入失效，恒返回 200）。
      if (failWriteFor && String(path).includes(failWriteFor)) {
        const error = new Error(`ENOSPC: no space left on device, open '${path}'`);
        error.code = "ENOSPC";
        throw error;
      }
      return actual.writeFile(path, ...rest);
    }
  };
});

let server;
let baseUrl;
let dataDir;
let iconsDir;

const ICON_ID = "replaced-icon";

const importIcon = (dataUrl) =>
  fetch(`${baseUrl}${apiPath("/image-library/import")}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ folders: [{ id: "root", name: "默认文件夹" }], assets: [{ id: ICON_ID, name: "图标", folderId: "root", dataUrl }] })
  });

// 同 id、不同 MIME → filename 从 .png 变成 .svg，正是触发「删旧文件」那条分支的条件。
// 必须用 **base64**：parseDataUrl 的正则是 `/^data:([^;,]+);base64,(.+)$/`，百分号编码的
// data URL 会被判「图片数据格式无效」而整条跳过 —— 那样写盘压根没发生，用例会假绿
// （探针实测：首版就是这么写的，第一条在没触发任何写入的情况下就通过了）。
const SVG_1X1 =
  "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf-8").toString("base64");

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "icon-replace-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer, defaultPaths } = await import("./server.mjs");
  iconsDir = defaultPaths.icons;
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // 先装一个 PNG 版
  expect((await importIcon(PNG_1X1)).status).toBe(200);
});

afterAll(async () => {
  failWriteFor = "";
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dataDir, { recursive: true, force: true });
});

describe("图标按 id 覆盖的写入安全性", () => {
  test("★ 新文件写失败时，旧文件仍在（不留悬空条目）", async () => {
    const oldPath = join(iconsDir, `${ICON_ID}.png`);
    expect(existsSync(oldPath), "前置：旧 PNG 应已落盘").toBe(true);

    // 同 id 换成 SVG → filename 变成 <id>.svg；让这次写失败
    failWriteFor = `${ICON_ID}.svg`;
    const response = await importIcon(SVG_1X1);
    failWriteFor = "";

    expect(response.status).not.toBe(200);
    // 关键断言：旧文件**没有被提前删掉**
    expect(existsSync(oldPath), "写失败却把旧图标删了，manifest 将指向不存在的文件").toBe(true);

    // manifest 也仍是覆盖前那份，仍指向那个确实存在的文件
    const manifest = JSON.parse(readFileSync(join(dataDir, "images", "manifest.json"), "utf-8"));
    const entry = manifest.find((item) => item.id === ICON_ID);
    expect(entry.filename).toBe(`${ICON_ID}.png`);
    expect(existsSync(join(iconsDir, entry.filename)), "manifest 指向的文件必须存在").toBe(true);
  });

  test("★ 覆盖成功：新文件落盘、旧文件被清掉、manifest 指向新文件", async () => {
    const response = await importIcon(SVG_1X1);
    expect(response.status).toBe(200);

    const newPath = join(iconsDir, `${ICON_ID}.svg`);
    expect(existsSync(newPath)).toBe(true);
    expect(existsSync(join(iconsDir, `${ICON_ID}.png`)), "成功后旧文件应被清理").toBe(false);

    const manifest = JSON.parse(readFileSync(join(dataDir, "images", "manifest.json"), "utf-8"));
    const entry = manifest.find((item) => item.id === ICON_ID);
    expect(entry.filename).toBe(`${ICON_ID}.svg`);
    expect(existsSync(join(iconsDir, entry.filename))).toBe(true);
  });
});