// 空间 ZIP 打包：范围、元信息、以及最危险的一条 —— default 空间不得越界。
import { expect, test, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AdmZip from "adm-zip";
import { spacePathsFor } from "./spaceStore.mjs";
import {
  buildSpaceArchiveBuffer,
  isMissingPathError,
  listSpaceFiles,
  readSpaceArchiveName,
  SPACE_ARCHIVE_META_FILENAME
} from "./spaceArchive.mjs";

let dataDir;
beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "space-archive-"));
});
afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

function writeFileAt(root, relativePath, content) {
  const full = join(root, relativePath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

function entryNames(buffer) {
  return new AdmZip(buffer).getEntries().map((entry) => entry.entryName).sort();
}

test("打包该空间的子目录，包内路径以空间名打头且字节一致", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  writeFileAt(paths.root, "schemes/files/a.json", '{"a":1}');
  writeFileAt(paths.root, "images/x.png", "PNGDATA");
  writeFileAt(paths.root, "icons/i.svg", "<svg/>");

  const { buffer, filename } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(filename).toBe("甲空间.zip");
  const zip = new AdmZip(buffer);
  expect(zip.getEntry("甲空间/schemes/files/a.json").getData().toString("utf8")).toBe('{"a":1}');
  expect(zip.getEntry("甲空间/images/x.png").getData().toString("utf8")).toBe("PNGDATA");
  expect(zip.getEntry("甲空间/icons/i.svg").getData().toString("utf8")).toBe("<svg/>");
});

test("打包不含 schemes/trash 下的内容", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  writeFileAt(paths.root, "schemes/files/keep.json", "{}");
  writeFileAt(paths.root, "schemes/trash/2026-01-01/old.json", "{}");

  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(entryNames(buffer)).toContain("甲空间/schemes/files/keep.json");
  expect(entryNames(buffer).some((name) => name.includes("/trash/"))).toBe(false);
});

// 这条是本设计里最容易写错、后果最重的一处：default 空间的 root **就是数据根**，
// 同目录下还有 spaces.json 与其它空间（workspaces/<其它 id>/）。
// 一旦改成按 paths.root 递归，导出 default 就等于打包整台机器的全部空间。
test("default 空间只打包自己的子目录，不越界到 spaces.json 或别的空间", async () => {
  const paths = spacePathsFor(dataDir, "default");
  expect(paths.root).toBe(dataDir);           // 前提：default 的根就是数据根
  writeFileAt(paths.root, "schemes/files/a.json", "{}");
  writeFileAt(dataDir, "spaces.json", '{"spaces":[]}');
  writeFileAt(dataDir, "workspaces/乙空间/schemes/files/b.json", "{}");

  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "default" });

  const names = entryNames(buffer);
  expect(names).toContain("default/schemes/files/a.json");
  expect(names).not.toContain("default/spaces.json");
  expect(names.some((name) => name.includes("workspaces/"))).toBe(false);
  // 也不含数据根下的其它散落目录
  expect(names.every((name) => name.startsWith("default/"))).toBe(true);
});

test("子目录不存在时正常出包（新空间可能还没有 icons/）", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  mkdirSync(paths.root, { recursive: true });

  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(entryNames(buffer)).toEqual([`甲空间/${SPACE_ARCHIVE_META_FILENAME}`]);
});

test("包内元信息可被读回；缺元信息时回退到给定名", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  mkdirSync(paths.root, { recursive: true });
  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(readSpaceArchiveName(new AdmZip(buffer), "兜底名")).toBe("甲空间");
  expect(readSpaceArchiveName(new AdmZip(), "兜底名")).toBe("兜底名");

  const broken = new AdmZip();
  broken.addFile(`甲空间/${SPACE_ARCHIVE_META_FILENAME}`, Buffer.from("{ 不是 json"));
  expect(readSpaceArchiveName(broken, "兜底名")).toBe("兜底名");
});

test("listSpaceFiles 返回的是相对路径（不含空间名前缀，且一律用 / 分隔）", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  writeFileAt(paths.root, "settings/color-config.json", "{}");

  const files = await listSpaceFiles(paths);

  expect(files).toHaveLength(1);
  expect(files[0].relativePath).toBe("settings/color-config.json");
});

// 这条守卫的是「残缺包」那类最隐蔽的故障：把 EACCES 当成「目录不存在」→
// 静默出一个不含任何模型、却返回成功的「备份包」。
test("只有 ENOENT 算「不存在」；EACCES 等 IO 失败必须上抛", () => {
  expect(isMissingPathError({ code: "ENOENT" })).toBe(true);
  expect(isMissingPathError({ code: "EACCES" })).toBe(false);
  expect(isMissingPathError(new Error("boom"))).toBe(false);
});

// 上面那条只测**纯判断**，钉不住 listSpaceFiles 里的调用点是否真的用了它 ——
// 把调用点改成 `.catch(() => null)`，上面七条全绿而残缺包照样出得来。故这里直接钉调用点：
// 毒化其中一个待打包目录（含 NUL 的路径让 stat 以 ERR_INVALID_ARG_VALUE 拒绝，跨平台、无需造权限错误），
// 断言整次列举 rejects。
test("目录读失败即上抛：listSpaceFiles 的调用点不能把非 ENOENT 当「跳过」", async () => {
  const valid = spacePathsFor(dataDir, "甲空间");
  const brokenDir = `${dataDir}${String.fromCharCode(0)}boom`;

  await expect(listSpaceFiles({ ...valid, schemes: brokenDir })).rejects.toThrow();
});
