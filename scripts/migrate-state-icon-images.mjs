// 一次性迁移：把设备库里"内嵌 base64 位图"的状态图标抽到图片库(/api/images),原地改为引用。
//
// 用法(项目根目录):
//   node scripts/migrate-state-icon-images.mjs            # 预演(dry-run),只报告不写入
//   node scripts/migrate-state-icon-images.mjs --apply    # 实际写入(会先备份 .bak)
//
// 安全性:
//   - 默认 dry-run;--apply 前会备份 library.json 与 images/manifest.json。
//   - 按内容哈希去重:同一张位图只存一份,多处引用同一 id(模板/override 重复天然合并)。
//   - 幂等:已是 /api/images 引用的不再处理;重复运行无副作用(内容哈希 id 确定)。
//   - 只转换"带内嵌位图的 svg+xml data URL"和"直接的位图 data URL",纯 SVG 图标不动。

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

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
    return `${pre}/api/images/${id}${post}`;
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
        return `/api/images/${id}`;
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

const fmt = (n) => n.toLocaleString();
console.log("=== migrate-state-icon-images (" + (APPLY ? "APPLY" : "DRY-RUN") + ") ===");
console.log("library.json:", fmt(libraryRaw.length), "->", fmt(newLibraryRaw.length), "bytes",
  `(${((1 - newLibraryRaw.length / libraryRaw.length) * 100).toFixed(1)}% 减少)`);
console.log("内嵌位图字段命中:", rastersSeen, "| 去重后唯一位图:", byHash.size, "| 去重合并:", dedupHits);
console.log("改写的图片字段:", fieldsChanged, "| 新增图片文件:", filesToWrite.length,
  "| 抽出 base64 总量:", fmt(bytesEmbeddedBefore), "chars");

if (!APPLY) {
  console.log("\nDRY-RUN:未写入任何文件。确认无误后用 `--apply` 执行(会先备份)。");
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
writeFileSync(manifestPath, JSON.stringify([...newManifestItems, ...manifest], null, 2));
writeFileSync(libraryPath, newLibraryRaw);
console.log(`\nAPPLIED。备份后缀:.${stamp}.bak。请刷新浏览器验证自定义器件状态图标渲染正常。`);
