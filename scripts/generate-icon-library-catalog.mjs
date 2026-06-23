import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconLibraryDir = path.join(rootDir, "data", "icon-library");

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeWebPath(...parts) {
  return parts
    .join("/")
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const libraryDirs = (await readdir(iconLibraryDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, "en"));

const libraries = [];
const searchIndex = [];

for (const libraryDir of libraryDirs) {
  const manifestPath = path.join(iconLibraryDir, libraryDir, "manifest.json");
  let manifest;
  try {
    manifest = await readJson(manifestPath);
  } catch {
    continue;
  }

  const library = {
    id: manifest.name || libraryDir,
    label: manifest.label || libraryDir,
    root: manifest.root || `/icon-library/${libraryDir}`,
    totalIcons: manifest.totalIcons || 0,
    sourcePolicy: manifest.sourcePolicy || "",
    categories: [],
    sources: manifest.sources || [],
  };

  for (const category of manifest.categories || []) {
    const libraryCategory = {
      id: category.id,
      label: category.label || category.id,
      description: category.description || "",
      count: Array.isArray(category.icons) ? category.icons.length : 0,
    };
    library.categories.push(libraryCategory);

    for (const icon of category.icons || []) {
      const sourceId = icon.sourceId || icon.source || "unknown";
      const sourceLabel = icon.sourceLabel || icon.source || icon.sourcePackage || library.label;
      const license = icon.license || (icon.source === "original-generated" ? "original-generated" : "");
      const file = normalizeWebPath(library.root, icon.file);
      searchIndex.push({
        id: `${library.id}:${icon.id || icon.file}`,
        name: icon.name || icon.id || path.basename(icon.file || ""),
        file,
        libraryId: library.id,
        libraryLabel: library.label,
        categoryId: category.id,
        categoryLabel: category.label || category.id,
        sourceId,
        sourceLabel,
        sourceName: icon.sourceName || "",
        sourcePackage: icon.sourcePackage || "",
        license,
        keywords: [
          icon.name,
          icon.id,
          icon.sourceName,
          sourceId,
          sourceLabel,
          icon.sourcePackage,
          license,
          library.id,
          library.label,
          category.id,
          category.label,
        ].filter(Boolean),
      });
    }
  }

  libraries.push(library);
}

searchIndex.sort((a, b) =>
  `${a.libraryLabel}:${a.categoryLabel}:${a.name}`.localeCompare(
    `${b.libraryLabel}:${b.categoryLabel}:${b.name}`,
    "zh-CN",
  ),
);

const catalog = {
  name: "icon-library",
  label: "SVG 图标资源总库",
  generatedAt: new Date().toISOString(),
  totalIcons: searchIndex.length,
  libraries,
};

function renderReadme() {
  return `# SVG Icon Library Catalog

This directory is the unified entry for all generated SVG icon libraries.

Output:

- Total icons: ${catalog.totalIcons}
- Libraries: ${libraries.length}
- Search index: \`search-index.json\`
- Browser preview/search: \`index.html\`

Libraries:

${libraries.map((library) => `- \`${library.id}\`: ${library.label} (${library.totalIcons})`).join("\n")}

Rebuild:

\`\`\`bash
node scripts/generate-icon-library-catalog.mjs
\`\`\`
`;
}

function renderHtml() {
  const libraryOptions = libraries
    .map((library) => `<option value="${escapeXml(library.id)}">${escapeXml(library.label)}</option>`)
    .join("");
  const categoryOptions = [
    ...new Map(searchIndex.map((item) => [item.categoryId, item.categoryLabel])).entries(),
  ]
    .sort((a, b) => a[1].localeCompare(b[1], "zh-CN"))
    .map(([id, label]) => `<option value="${escapeXml(id)}">${escapeXml(label)}</option>`)
    .join("");
  const sourceOptions = [
    ...new Map(searchIndex.map((item) => [item.sourceId, item.sourceLabel])).entries(),
  ]
    .sort((a, b) => a[1].localeCompare(b[1], "zh-CN"))
    .map(([id, label]) => `<option value="${escapeXml(id)}">${escapeXml(label)}</option>`)
    .join("");
  const licenseOptions = [...new Set(searchIndex.map((item) => item.license).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((license) => `<option value="${escapeXml(license)}">${escapeXml(license)}</option>`)
    .join("");
  const libraryLinks = libraries
    .map(
      (library) =>
        `<a href=".${escapeXml(library.root.replace(/^\/icon-library/, ""))}/index.html">${escapeXml(library.label)}<span>${library.totalIcons}</span></a>`,
    )
    .join("");
  const cards = searchIndex
    .map(
      (item) => `
      <article
        data-library="${escapeXml(item.libraryId)}"
        data-category="${escapeXml(item.categoryId)}"
        data-source="${escapeXml(item.sourceId)}"
        data-license="${escapeXml(item.license)}"
        data-search="${escapeXml(item.keywords.join(" ").toLowerCase())}">
        <img src="${escapeXml(item.file)}" alt="${escapeXml(item.name)}" loading="lazy" />
        <strong>${escapeXml(item.name)}</strong>
        <code>${escapeXml(item.libraryLabel)} / ${escapeXml(item.categoryLabel)}</code>
        <small>${escapeXml(item.sourceLabel)}${item.license ? ` · ${escapeXml(item.license)}` : ""}</small>
      </article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeXml(catalog.label)}</title>
  <style>
    :root {
      color: #111827;
      background: #f8fafc;
      font-family: Arial, "Microsoft YaHei", sans-serif;
    }
    body {
      margin: 0;
      padding: 24px;
    }
    header,
    main {
      max-width: 1240px;
      margin: 0 auto;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 26px;
      line-height: 1.25;
    }
    p {
      margin: 0;
      color: #64748b;
      line-height: 1.6;
    }
    .library-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    .library-links a {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 32px;
      padding: 0 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      color: #1f2937;
      text-decoration: none;
      font-size: 13px;
    }
    .library-links span {
      color: #64748b;
      font-size: 12px;
    }
    .toolbar {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) repeat(4, minmax(130px, 170px));
      gap: 10px;
      margin: 18px 0 10px;
    }
    input,
    select {
      height: 36px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      color: #111827;
      padding: 0 10px;
      font: inherit;
      box-sizing: border-box;
    }
    .result-count {
      margin-bottom: 14px;
      color: #475569;
      font-size: 13px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }
    article {
      min-height: 148px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      display: grid;
      grid-template-rows: 52px auto auto auto;
      justify-items: center;
      align-items: center;
      padding: 12px;
      text-align: center;
      box-sizing: border-box;
    }
    img {
      width: 48px;
      height: 48px;
      object-fit: contain;
      color: #2563eb;
    }
    strong {
      display: block;
      font-size: 13px;
      line-height: 1.35;
    }
    code,
    small {
      display: block;
      color: #64748b;
      font-size: 11px;
      line-height: 1.35;
      word-break: break-word;
    }
    article[hidden] {
      display: none;
    }
    @media (max-width: 860px) {
      body {
        padding: 16px;
      }
      .toolbar {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeXml(catalog.label)}</h1>
    <p>共 ${catalog.totalIcons} 个 SVG 图标，来自 ${libraries.length} 个分类图标库。可按名称、子库、分类、来源、许可筛选。</p>
    <nav class="library-links" aria-label="图标库入口">
      ${libraryLinks}
    </nav>
    <div class="toolbar" role="search">
      <input id="searchInput" type="search" placeholder="搜索名称、来源、分类，例如 battery / save / 图层" autocomplete="off" />
      <select id="libraryFilter" aria-label="图标库筛选">
        <option value="">全部图标库</option>
        ${libraryOptions}
      </select>
      <select id="categoryFilter" aria-label="分类筛选">
        <option value="">全部分类</option>
        ${categoryOptions}
      </select>
      <select id="sourceFilter" aria-label="来源筛选">
        <option value="">全部来源</option>
        ${sourceOptions}
      </select>
      <select id="licenseFilter" aria-label="许可筛选">
        <option value="">全部许可</option>
        ${licenseOptions}
      </select>
    </div>
    <div id="resultCount" class="result-count"></div>
  </header>
  <main>
    <div class="grid">
      ${cards}
    </div>
  </main>
  <script>
    const cards = Array.from(document.querySelectorAll("article"));
    const searchInput = document.getElementById("searchInput");
    const libraryFilter = document.getElementById("libraryFilter");
    const categoryFilter = document.getElementById("categoryFilter");
    const sourceFilter = document.getElementById("sourceFilter");
    const licenseFilter = document.getElementById("licenseFilter");
    const resultCount = document.getElementById("resultCount");

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function filterCards() {
      const keyword = normalize(searchInput.value);
      const library = libraryFilter.value;
      const category = categoryFilter.value;
      const source = sourceFilter.value;
      const license = licenseFilter.value;
      let visible = 0;

      for (const card of cards) {
        const show =
          (!keyword || card.dataset.search.includes(keyword)) &&
          (!library || card.dataset.library === library) &&
          (!category || card.dataset.category === category) &&
          (!source || card.dataset.source === source) &&
          (!license || card.dataset.license === license);
        card.hidden = !show;
        if (show) visible += 1;
      }

      resultCount.textContent = "当前显示 " + visible + " / " + cards.length + " 个图标";
    }

    for (const control of [searchInput, libraryFilter, categoryFilter, sourceFilter, licenseFilter]) {
      control.addEventListener(control === searchInput ? "input" : "change", filterCards);
    }
    filterCards();
  </script>
</body>
</html>
`;
}

await writeFile(path.join(iconLibraryDir, "manifest.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
await writeFile(path.join(iconLibraryDir, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
await writeFile(path.join(iconLibraryDir, "search-index.json"), `${JSON.stringify(searchIndex, null, 2)}\n`, "utf8");
await writeFile(path.join(iconLibraryDir, "README.md"), renderReadme(), "utf8");
await writeFile(path.join(iconLibraryDir, "index.html"), renderHtml(), "utf8");

console.log(`Generated icon catalog with ${catalog.totalIcons} icons from ${libraries.length} libraries`);
