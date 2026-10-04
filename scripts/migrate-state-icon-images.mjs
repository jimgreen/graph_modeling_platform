// 一次性迁移：把设备库里"内嵌 base64 位图"的状态图标抽到图片库(/webgrp/images),原地改为引用。
//
// 用法(项目根目录):
//   node scripts/migrate-state-icon-images.mjs            # 预演(dry-run),只报告不写入
//   node scripts/migrate-state-icon-images.mjs --apply    # 实际写入(会先备份 .bak)
//
// 安全性:
//   - 默认 dry-run;--apply 前会备份 library.json 与 images/manifest.json。
//   - 按内容哈希去重:同一张位图只存一份,多处引用同一 id(模板/override 重复天然合并)。
//   - 幂等:已是 /webgrp/images 引用的不再处理;重复运行无副作用(内容哈希 id 确定)。
//   - 只转换"带内嵌位图的 svg+xml data URL"和"直接的位图 data URL",纯 SVG 图标不动。

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { atomicWriteFileSync } from "../shared/atomicWrite.mjs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { apiPath } from "../server/config.mjs";

const APPLY = process.argv.includes("--apply");
const repoRoot = process.cwd();
const imageDir = join(repoRoot, "data", "images");
const manifestPath = join(imageDir, "manifest.json");
const libraryPath = join(repoRoot, "data", "device-library", "library.json");

const mimeExt = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif" };
const rasterDataUrl = /^data:image\/(?:png|jpe?g|webp|gif);base64,/i;

if (!existsSync(libraryPath)) {
  console.error("找不到 library.json:", libraryPath);
  process.exit(1);
}

const libraryRaw = readFileSync(libraryPath, "utf-8");
const library = JSON.parse(libraryRaw);
const prettyIndent = libraryRaw.includes('\n  "') ? 2 : 0;
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf-8")) : [];
const manifestIds = new Set(manifest.map((item) => item.id));

const byHash = new Map(); // contentHash -> id
const newManifestItems = [];
const filesToWrite = []; // { filename, bytes }
let rastersSeen = 0;
let dedupHits = 0;
let fieldsChanged = 0;
let bytesEmbeddedBefore = 0;

function storeRaster(dataUrl) {
  const match = /^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/is.exec(dataUrl);
  if (!match) {
    return null;
  }
  let mime = match[1].toLowerCase();
  if (mime === "image/jpg") {
    mime = "image/jpeg";
  }
  const bytes = Buffer.from(match[2], "base64");
  bytesEmbeddedBefore += dataUrl.length;
  rastersSeen += 1;
  const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 16);
  const existing = byHash.get(hash);
  if (existing) {
    dedupHits += 1;
    return existing;
  }
  const id = `img-mig-${hash}`;
  byHash.set(hash, id);
  if (!manifestIds.has(id)) {
    const ext = mimeExt[mime] ?? ".png";
    const filename = `${id}${ext}`;
    newManifestItems.push({
      id,
      name: "迁移状态图标",
      folderId: "root",
      mimeType: mime,
      size: bytes.length,
      filename,
      createdAt: new Date().toISOString()
    });
    filesToWrite.push({ filename, bytes });
  }
  return id;
}

const hrefRasterRe = /((?:xlink:)?href=")(data:image\/(?:png|jpe?g|webp|gif);base64,[^"]+)(")/gi;

function migrateSvgField(value) {
  const prefixes = ["data:image/svg+xml;utf8,", "data:image/svg+xml;charset=utf-8,", "data:image/svg+xml,"];
  const prefix = prefixes.find((p) => value.startsWith(p));
  if (!prefix) {
    return value;
  }
  let svg;
  try {
    svg = decodeURIComponent(value.slice(prefix.length));
  } catch {
    return value;
  }
  if (!hrefRasterRe.test(svg)) {
    return value;
  }
  hrefRasterRe.lastIndex = 0;
  let changed = false;
  const nextSvg = svg.replace(hrefRasterRe, (full, pre, url, post) => {
    const id = storeRaster(url);
    if (!id) {
      return full;
    }
    changed = true;
    return `${pre}${apiPath(`/images/${id}`)}${post}`;
  });
  if (!changed) {
    return value;
  }
  fieldsChanged += 1;
  return prefix + encodeURIComponent(nextSvg);
}

function transform(value) {
  if (typeof value === "string") {
    if (value.startsWith("data:image/svg+xml")) {
      return migrateSvgField(value);
    }
    if (rasterDataUrl.test(value)) {
      const id = storeRaster(value);
      if (id) {
        fieldsChanged += 1;
        return apiPath(`/images/${id}`);
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      value[i] = transform(value[i]);
    }
    return value;
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      value[key] = transform(value[key]);
    }
  }
  return value;
}

transform(library);

const newLibraryRaw = JSON.stringify(library, null, prettyIndent || undefined);

// 报告统一走 report()：本脚本会**改写用户的设备库并写图片文件**，操作痕迹不能没有，
// 但也不能是散落的裸 console.log —— 一条通道 + 统一前缀，便于操作员在 pnpm 的
// 混合输出里 grep 「[migrate:state-icons]」把本轮的进度与结果捞出来。
// 留在 stdout 是刻意的：scripts/migrate-state-icon-images.test.mjs 按 stdout
// 断言报告内容（「内嵌位图字段命中」「DRY-RUN:未写入任何文件」「备份后缀」等）。
// 本脚本没有诊断信息需要分流 —— 唯一的异常出口（缺 library.json）已在文件顶部
// 走 console.error + exit 1，不混进报告流。
const REPORT_PREFIX = "[migrate:state-icons]";
// 变参 + join(" ") 与 console.log 的默认分隔完全一致，故报文措辞与间隔零变化。
function report(...parts) {
  console.log(`${REPORT_PREFIX} ${parts.join(" ")}`);
}

const fmt = (n) => n.toLocaleString();
// 前缀已带脚本名，故横幅不再重复脚本名；但 `(APPLY)` / `(DRY-RUN)` 的括号必须留着
// —— 直测按这两个字面量（含括号）区分两种模式。
report(`=== (${APPLY ? "APPLY" : "DRY-RUN"}) ===`);
report("library.json:", fmt(libraryRaw.length), "->", fmt(newLibraryRaw.length), "bytes",
  `(${((1 - newLibraryRaw.length / libraryRaw.length) * 100).toFixed(1)}% 减少)`);
report("内嵌位图字段命中:", rastersSeen, "| 去重后唯一位图:", byHash.size, "| 去重合并:", dedupHits);
report("改写的图片字段:", fieldsChanged, "| 新增图片文件:", filesToWrite.length,
  "| 抽出 base64 总量:", fmt(bytesEmbeddedBefore), "chars");

if (!APPLY) {
  report("DRY-RUN:未写入任何文件。确认无误后用 `--apply` 执行(会先备份)。");
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
copyFileSync(libraryPath, `${libraryPath}.${stamp}.bak`);
if (existsSync(manifestPath)) {
  copyFileSync(manifestPath, `${manifestPath}.${stamp}.bak`);
}
mkdirSync(imageDir, { recursive: true });
for (const file of filesToWrite) {
  writeFileSync(join(imageDir, file.filename), file.bytes);
}
// manifest 与 library 用原子写（审查 G-P1-3）：中途失败不留半写 JSON
atomicWriteFileSync(manifestPath, JSON.stringify([...newManifestItems, ...manifest], null, 2));
atomicWriteFileSync(libraryPath, newLibraryRaw);
report(`APPLIED。备份后缀:.${stamp}.bak。请刷新浏览器验证自定义器件状态图标渲染正常。`);
