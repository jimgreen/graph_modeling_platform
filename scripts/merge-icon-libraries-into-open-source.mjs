import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconLibraryDir = path.join(rootDir, "data", "icon-library");
const targetLibraryId = "open-source-svg";
const mergedLibraryIds = ["docer-free-compatible", "office-fluent-compatible"];
const targetRoot = `/webgrp/icon-library/${targetLibraryId}`;
const mergedRootDir = "merged";

function normalizeWebPath(...parts) {
  return parts
    .join("/")
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/^\//, "")
    .replace(/\/$/, "");
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizedSvgStructure(svg) {
  return svg
    .replace(/<\?xml[^>]*>\s*/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, "")
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>\s*/gi, "")
    .replace(/<text\b[^>]*>[\s\S]*?<\/text>\s*/gi, "")
    .replace(/\bid="[^"]*"/gi, "")
    .replace(/\baria-labelledby="[^"]*"/gi, "")
    .replace(/\bcolor="[^"]*"/gi, "")
    .replace(/#[0-9a-f]{3,8}/gi, "#color")
    .replace(/\s+/g, " ")
    .trim();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanBaseManifest(manifest) {
  const categories = [];
  for (const category of manifest.categories || []) {
    const icons = (category.icons || []).filter(
      (icon) => !icon.originalLibraryId && !String(icon.file || "").startsWith(`${mergedRootDir}/`),
    );
    if (icons.length > 0) {
      categories.push({ ...category, icons });
    }
  }
  return {
    ...manifest,
    name: targetLibraryId,
    label: "开源 SVG 综合图标库",
    root: targetRoot,
    categories,
  };
}

function ensureCategory(categoryById, category) {
  const existing = categoryById.get(category.id);
  if (existing) {
    return existing;
  }
  const created = {
    id: category.id,
    label: category.label || category.id,
    description: category.description || "",
    icons: [],
  };
  categoryById.set(created.id, created);
  return created;
}

function buildSearchIndex(manifest) {
  return (manifest.categories || []).flatMap((category) =>
    (category.icons || []).map((icon) => ({
      id: icon.id,
      name: icon.name || icon.id || path.basename(icon.file || ""),
      file: icon.file,
      categoryId: category.id,
      categoryLabel: category.label || category.id,
      sourceId: icon.sourceId || icon.source || icon.originalLibraryId || "unknown",
      sourceLabel: icon.sourceLabel || icon.originalLibraryLabel || icon.sourcePackage || "",
      sourceName: icon.sourceName || "",
      sourcePackage: icon.sourcePackage || "",
      originalLibraryId: icon.originalLibraryId || "",
      originalLibraryLabel: icon.originalLibraryLabel || "",
      originalFile: icon.originalFile || "",
      license: icon.license || "",
      keywords: [
        icon.name,
        icon.id,
        icon.sourceName,
        icon.sourceId,
        icon.sourceLabel,
        icon.sourcePackage,
        icon.originalLibraryId,
        icon.originalLibraryLabel,
        icon.license,
        category.id,
        category.label,
      ].filter(Boolean),
    })),
  );
}

function renderReadme(manifest, mergeSummary) {
  return `# Open Source SVG Icon Library

This directory is the unified SVG icon source exposed to the application.

Output:

- Total icons: ${manifest.totalIcons}
- Categories: ${manifest.categories.length}
- Merged compatibility sources: ${mergedLibraryIds.join(", ")}
- Skipped exact SVG duplicates during merge: ${mergeSummary.skippedDuplicates}

Rebuild:

\`\`\`bash
node scripts/generate-open-source-svg-icons.mjs
node scripts/generate-docer-compatible-icons.mjs
node scripts/generate-office-fluent-icons.mjs
node scripts/merge-icon-libraries-into-open-source.mjs
node scripts/generate-icon-library-catalog.mjs
\`\`\`
`;
}

function renderPreviewHtml(manifest) {
  const searchIndex = buildSearchIndex(manifest);
  const categoryOptions = (manifest.categories || [])
    .map((category) => `<option value="${escapeXml(category.id)}">${escapeXml(category.label || category.id)}</option>`)
    .join("");
  const sourceOptions = [
    ...new Map(searchIndex.map((item) => [item.sourceId, item.sourceLabel || item.sourceId])).entries(),
  ]
    .sort((a, b) => a[1].localeCompare(b[1], "zh-CN"))
    .map(([id, label]) => `<option value="${escapeXml(id)}">${escapeXml(label)}</option>`)
    .join("");
  const cards = searchIndex
    .map((item) => {
      const file = `${targetRoot}/${item.file}`.replace(/\/+/g, "/");
      return `<article data-category="${escapeXml(item.categoryId)}" data-source="${escapeXml(item.sourceId)}" data-search="${escapeXml(item.keywords.join(" ").toLowerCase())}">
        <img src="${escapeXml(file)}" alt="${escapeXml(item.name)}" loading="lazy" />
        <strong>${escapeXml(item.name)}</strong>
        <code>${escapeXml(item.categoryLabel)}</code>
        <small>${escapeXml(item.sourceLabel)}${item.originalLibraryLabel ? ` / ${escapeXml(item.originalLibraryLabel)}` : ""}</small>
      </article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeXml(manifest.label)}</title>
  <style>
    body { margin: 0; padding: 24px; background: #f8fafc; color: #111827; font-family: Arial, "Microsoft YaHei", sans-serif; }
    header, main { max-width: 1240px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: 26px; }
    p { margin: 0; color: #64748b; }
    .filters { display: grid; grid-template-columns: 1fr 1fr 2fr auto; gap: 10px; margin: 18px 0; }
    select, input { height: 36px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 10px; background: white; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 10px; }
    article { display: grid; grid-template-rows: 54px auto auto auto; gap: 4px; align-items: center; min-width: 0; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: white; }
    img { width: 42px; height: 42px; justify-self: center; object-fit: contain; }
    strong, code, small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    strong { font-size: 12px; }
    code, small { color: #64748b; font-size: 11px; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeXml(manifest.label)}</h1>
    <p>统一检索 ${manifest.totalIcons} 个 SVG 图标，包含开源 SVG、Docer 兼容图标和 Office Fluent 兼容图标。</p>
    <div class="filters">
      <select id="category"><option value="">全部分类</option>${categoryOptions}</select>
      <select id="source"><option value="">全部来源</option>${sourceOptions}</select>
      <input id="query" type="search" placeholder="搜索名称/标签/来源" />
      <strong id="count"></strong>
    </div>
  </header>
  <main class="grid">${cards}</main>
  <script>
    const cards = [...document.querySelectorAll("article")];
    const category = document.querySelector("#category");
    const source = document.querySelector("#source");
    const query = document.querySelector("#query");
    const count = document.querySelector("#count");
    function applyFilter() {
      const tokens = query.value.trim().toLowerCase().split(/\\s+/).filter(Boolean);
      let visible = 0;
      for (const card of cards) {
        const ok = (!category.value || card.dataset.category === category.value)
          && (!source.value || card.dataset.source === source.value)
          && tokens.every((token) => card.dataset.search.includes(token));
        card.classList.toggle("hidden", !ok);
        if (ok) visible += 1;
      }
      count.textContent = visible + " / " + cards.length;
    }
    category.addEventListener("change", applyFilter);
    source.addEventListener("change", applyFilter);
    query.addEventListener("input", applyFilter);
    applyFilter();
  </script>
</body>
</html>
`;
}

const targetDir = path.join(iconLibraryDir, targetLibraryId);
const targetManifestPath = path.join(targetDir, "manifest.json");
const baseManifest = cleanBaseManifest(cloneJson(await readJson(targetManifestPath)));
const categoryById = new Map(baseManifest.categories.map((category) => [category.id, { ...category, icons: [...category.icons] }]));
const seenSvgStructures = new Set();
const mergeSummary = {
  copied: 0,
  skippedDuplicates: 0,
  byLibrary: {},
};

for (const category of categoryById.values()) {
  for (const icon of category.icons || []) {
    const svgPath = path.join(targetDir, icon.file);
    const svg = await readFile(svgPath, "utf8");
    seenSvgStructures.add(normalizedSvgStructure(svg));
  }
}

await rm(path.join(targetDir, mergedRootDir), { recursive: true, force: true });

for (const sourceLibraryId of mergedLibraryIds) {
  const sourceDir = path.join(iconLibraryDir, sourceLibraryId);
  const sourceManifest = await readJson(path.join(sourceDir, "manifest.json"));
  const sourceLabel = sourceManifest.label || sourceLibraryId;
  const librarySummary = { copied: 0, skippedDuplicates: 0 };
  mergeSummary.byLibrary[sourceLibraryId] = librarySummary;

  for (const sourceCategory of sourceManifest.categories || []) {
    const targetCategory = ensureCategory(categoryById, sourceCategory);
    for (const icon of sourceCategory.icons || []) {
      const originalFile = normalizeWebPath(icon.file || "");
      if (!originalFile) {
        continue;
      }
      const sourcePath = path.join(sourceDir, originalFile);
      const svg = await readFile(sourcePath, "utf8");
      const svgStructure = normalizedSvgStructure(svg);
      if (seenSvgStructures.has(svgStructure)) {
        mergeSummary.skippedDuplicates += 1;
        librarySummary.skippedDuplicates += 1;
        continue;
      }
      seenSvgStructures.add(svgStructure);

      const outputRelative = normalizeWebPath(mergedRootDir, sourceLibraryId, originalFile);
      const outputPath = path.join(targetDir, outputRelative);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await copyFile(sourcePath, outputPath);

      const iconId = normalizeWebPath(sourceLibraryId, sourceCategory.id, icon.id || path.basename(originalFile, path.extname(originalFile)))
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      targetCategory.icons.push({
        ...icon,
        id: iconId,
        name: icon.name || icon.id || path.basename(originalFile, path.extname(originalFile)),
        file: outputRelative,
        sourceId: icon.sourceId || icon.source || sourceLibraryId,
        sourceLabel: icon.sourceLabel || sourceLabel,
        originalLibraryId: sourceLibraryId,
        originalLibraryLabel: sourceLabel,
        originalFile,
      });
      mergeSummary.copied += 1;
      librarySummary.copied += 1;
    }
  }
}

const manifest = {
  ...baseManifest,
  generatedAt: new Date().toISOString(),
  sourcePolicy:
    `${baseManifest.sourcePolicy || "开源 SVG 综合图标库。"} 已将 Docer 兼容图标与 Office Fluent 兼容图标合并到 open-source-svg 统一检索；旧目录仅保留历史 URL 兼容。`,
  mergedCompatibilityLibraries: mergedLibraryIds,
  categories: [...categoryById.values()]
    .map((category) => ({
      ...category,
      icons: [...(category.icons || [])].sort((a, b) =>
        `${a.originalLibraryId || ""}:${a.sourceId || ""}:${a.name || a.id}`.localeCompare(
          `${b.originalLibraryId || ""}:${b.sourceId || ""}:${b.name || b.id}`,
          "zh-CN",
        ),
      ),
    }))
    .filter((category) => category.icons.length > 0)
    .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id, "zh-CN")),
};
manifest.totalIcons = manifest.categories.reduce((sum, category) => sum + category.icons.length, 0);

const searchIndex = buildSearchIndex(manifest);
const sourceAudit = {
  generatedAt: manifest.generatedAt,
  targetLibraryId,
  mergedLibraryIds,
  totalIcons: manifest.totalIcons,
  mergeSummary,
  categoryCounts: Object.fromEntries(manifest.categories.map((category) => [category.id, category.icons.length])),
};

await writeFile(targetManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(path.join(targetDir, "search-index.json"), `${JSON.stringify(searchIndex, null, 2)}\n`, "utf8");
await writeFile(path.join(targetDir, "source-audit.json"), `${JSON.stringify(sourceAudit, null, 2)}\n`, "utf8");
await writeFile(path.join(targetDir, "README.md"), renderReadme(manifest, mergeSummary), "utf8");
await writeFile(path.join(targetDir, "index.html"), renderPreviewHtml(manifest), "utf8");

console.log(
  `Merged ${mergeSummary.copied} icons into ${targetLibraryId}; skipped ${mergeSummary.skippedDuplicates} exact duplicates; total ${manifest.totalIcons}.`,
);
