// manifest 的 filename 必须被约束成单段——它是空间 ZIP 里完全由提供方控制的内容。
//
// 实测（修复前）：导入一个 manifest 里 filename 写 `../../<受害空间id>/images/x.png`
// 的空间包，随后 `GET /webgrp/images/<id>` 回 **HTTP 200**，响应体就是受害空间那个
// 文件的内容。多空间隔离被一条备份包绕过——而空间备份本来就是要在团队之间传的东西。
//
// 同一个 filename 还被 join 到图片目录后**删**（handleDeleteImageAsset、图标库导入的
// 旧文件清理），所以这不只是读越界，还是删越界。
//
// 修法在 readManifest：manifest 的出口只有它一个，把 filename 压成单段，四个消费点
// 一次受益。上传的 filename 本来就是 `${id}${ext}`，压平对正常数据是恒等变换。
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import AdmZip from "adm-zip";
import { apiPath } from "./config.mjs";

const VICTIM_CONTENT = "VICTIM-SPACE-CANARY-9f3a2b7c";
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

let server;
let baseUrl;
let dataDir;

const buildSpaceZip = (spaceName, manifestText, extraFiles = {}) => {
  const zip = new AdmZip();
  zip.addFile(`${spaceName}/space.json`, Buffer.from(JSON.stringify({ formatVersion: 1, name: spaceName }), "utf-8"));
  zip.addFile(`${spaceName}/images/manifest.json`, Buffer.from(manifestText, "utf-8"));
  zip.addFile(`${spaceName}/images/image-folders.json`, Buffer.from("[]", "utf-8"));
  for (const [relative, bytes] of Object.entries(extraFiles)) {
    zip.addFile(`${spaceName}/${relative}`, bytes);
  }
  return zip.toBuffer();
};

const importSpace = async (spaceName, manifestText, extraFiles) => {
  const response = await fetch(`${baseUrl}${apiPath("/spaces/import")}`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: buildSpaceZip(spaceName, manifestText, extraFiles)
  });
  const payload = await response.json();
  return { status: response.status, spaceId: payload?.space?.id };
};

const inSpace = (spaceId) => ({ headers: { cookie: `gmp_space=${encodeURIComponent(spaceId)}` } });

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "asset-traversal-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // 受害空间：一张真实图片，内容即金丝雀串
  const victim = await importSpace(
    "受害者空间",
    JSON.stringify([{ id: "victim-img", name: "机密.png", folderId: "root", mimeType: "image/png", filename: "victim-img.png" }]),
    { "images/victim-img.png": Buffer.from(VICTIM_CONTENT, "utf-8") }
  );
  expect(victim.status).toBe(200);

  // 攻击空间：filename 用 ../ 走进受害者空间
  const attacker = await importSpace(
    "攻击空间",
    JSON.stringify([{
      id: "pwn",
      name: "偷.png",
      folderId: "root",
      mimeType: "image/png",
      filename: `../../${victim.spaceId}/images/victim-img.png`
    }])
  );
  expect(attacker.status).toBe(200);
  globalThis.__victimSpaceId = victim.spaceId;
  globalThis.__attackerSpaceId = attacker.spaceId;
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dataDir, { recursive: true, force: true });
});

describe("manifest.filename 的越界读", () => {
  test("★ 跨空间读不到受害空间的图片（修复前：HTTP 200 读出其内容）", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/images/pwn")}`, inSpace(globalThis.__attackerSpaceId));
    const body = Buffer.from(await response.arrayBuffer()).toString("utf-8");
    expect(body, "读到了另一个空间的图片文件（跨空间越界）").not.toContain(VICTIM_CONTENT);
  });

  test("★ 越界 filename 也不会让下载端点 5xx", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/images/pwn")}`, inSpace(globalThis.__attackerSpaceId));
    expect(response.status).toBeLessThan(500);
  });

  test("对照组：受害空间自己那张图仍能正常下载（别把正常路径也堵死）", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/images/victim-img")}`, inSpace(globalThis.__victimSpaceId));
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer()).toString("utf-8")).toBe(VICTIM_CONTENT);
  });
});

describe("manifest.filename 的越界删", () => {
  test("★ 删除越界条目不会删掉另一个空间的文件", async () => {
    // 目标文件放在**受害空间**里，落点与上面那条读越界用例完全同形（那一条已实测能命中），
    // 不再自己拼绝对路径段 —— 首版拼了绝对路径又叠相对层级，落点对不上，
    // rm(force) 静默 no-op，撤掉修复照样通过（假绿）。
    const victimSpace = globalThis.__victimSpaceId;
    const victimFile = join(dataDir, "workspaces", victimSpace, "images", "victim-img.png");
    expect(existsSync(victimFile), "前提：受害空间那张文件在").toBe(true);

    const space = await importSpace(
      "删除投毒空间",
      JSON.stringify([{
        id: "doomed",
        name: "x.png",
        folderId: "root",
        mimeType: "image/png",
        filename: `../../${victimSpace}/images/victim-img.png`
      }])
    );

    const response = await fetch(`${baseUrl}${apiPath("/images/doomed")}`, {
      method: "DELETE",
      ...inSpace(space.spaceId)
    });
    expect(response.status).toBeLessThan(500);
    expect(existsSync(victimFile), "删除越界条目时把另一个空间的文件删掉了").toBe(true);
  });

  test("对照组：正常条目删除照常成功", async () => {
    const space = await importSpace(
      "正常删除空间",
      JSON.stringify([{ id: "gone", name: "图.png", folderId: "root", mimeType: "image/png", filename: "gone.png" }]),
      { "images/gone.png": PNG_1X1 }
    );
    const response = await fetch(`${baseUrl}${apiPath("/images/gone")}`, {
      method: "DELETE",
      ...inSpace(space.spaceId)
    });
    expect(response.status).toBe(200);
  });
});