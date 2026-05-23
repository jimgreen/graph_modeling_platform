import { createServer } from "node:http";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const imageDataDir = resolve(repoRoot, "data", "images");
const manifestPath = join(imageDataDir, "manifest.json");
const imageFoldersPath = join(imageDataDir, "folders.json");
const schemeDataDir = resolve(repoRoot, "data", "schemes");
const schemeManifestPath = join(schemeDataDir, "schemes.json");
const maxImageBodyBytes = 16 * 1024 * 1024;
const maxSchemeBodyBytes = 64 * 1024 * 1024;

const mimeExt = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg"
};

async function ensureStore() {
  await mkdir(imageDataDir, { recursive: true });
  try {
    await readFile(manifestPath, "utf-8");
  } catch {
    await writeFile(manifestPath, "[]", "utf-8");
  }
  try {
    await readFile(imageFoldersPath, "utf-8");
  } catch {
    await writeFile(imageFoldersPath, JSON.stringify([rootImageFolder()], null, 2), "utf-8");
  }
}

async function readManifest() {
  await ensureStore();
  try {
    const raw = await readFile(manifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => ({ ...item, folderId: item.folderId || "root" })) : [];
  } catch {
    return [];
  }
}

async function writeManifest(items) {
  await ensureStore();
  await writeFile(manifestPath, JSON.stringify(items, null, 2), "utf-8");
}

function rootImageFolder() {
  return {
    id: "root",
    name: "默认文件夹",
    createdAt: new Date(0).toISOString()
  };
}

async function readImageFolders() {
  await ensureStore();
  try {
    const raw = await readFile(imageFoldersPath, "utf-8");
    const parsed = JSON.parse(raw);
    const folders = Array.isArray(parsed) ? parsed : [];
    const withRoot = folders.some((folder) => folder.id === "root") ? folders : [rootImageFolder(), ...folders];
    return withRoot.map((folder) => ({
      id: String(folder.id || "root"),
      name: safeName(folder.name || "默认文件夹"),
      createdAt: folder.createdAt || new Date().toISOString()
    }));
  } catch {
    return [rootImageFolder()];
  }
}

async function writeImageFolders(folders) {
  await ensureStore();
  const withRoot = folders.some((folder) => folder.id === "root") ? folders : [rootImageFolder(), ...folders];
  await writeFile(imageFoldersPath, JSON.stringify(withRoot, null, 2), "utf-8");
}

async function resolveFolderId(folderId) {
  const folders = await readImageFolders();
  return folders.some((folder) => folder.id === folderId) ? folderId : "root";
}

async function ensureSchemeStore() {
  await mkdir(schemeDataDir, { recursive: true });
  try {
    await readFile(schemeManifestPath, "utf-8");
  } catch {
    await writeFile(schemeManifestPath, "[]", "utf-8");
  }
}

async function readSchemes() {
  await ensureSchemeStore();
  try {
    const raw = await readFile(schemeManifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeSchemes(schemes) {
  await ensureSchemeStore();
  await writeFile(schemeManifestPath, JSON.stringify(schemes, null, 2), "utf-8");
  await writeSchemeFiles(schemes);
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  response.end(JSON.stringify(data));
}

function sendError(response, status, message) {
  sendJson(response, status, { error: message });
}

function readBody(request, maxBodyBytes = maxImageBodyBytes, oversizeMessage = "请求体过大。") {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        request.destroy();
        reject(new Error(oversizeMessage));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf-8")));
    request.on("error", reject);
  });
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/u.exec(dataUrl);
  if (!match) {
    throw new Error("图片数据格式无效。");
  }
  const mimeType = match[1];
  if (!mimeExt[mimeType]) {
    throw new Error("只支持 PNG、JPEG、WEBP、GIF、SVG 图片。");
  }
  return { mimeType, bytes: Buffer.from(match[2], "base64") };
}

function safeName(name) {
  return String(name || "未命名图片").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
}

function safeFilePart(name, fallback = "未命名") {
  return String(name || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80) || fallback;
}

function normalizeProjectForStorage(project) {
  return {
    ...project,
    nodes: Array.isArray(project?.nodes)
      ? project.nodes.map((node) => {
          const assetId = node?.params?.backgroundImageAssetId;
          const backgroundImage = node?.params?.backgroundImage;
          const params = {
            ...(node?.params ?? {}),
            ...(assetId && typeof backgroundImage === "string" && backgroundImage.startsWith("data:")
              ? { backgroundImage: `/api/images/${assetId}` }
              : {})
          };
          return { ...node, params };
        })
      : [],
    edges: Array.isArray(project?.edges) ? project.edges : []
  };
}

function normalizeSchemesForStorage(schemes) {
  return schemes.map((scheme) => ({
    ...scheme,
    projects: Array.isArray(scheme.projects)
      ? scheme.projects.map((project) => ({
          ...project,
          project: normalizeProjectForStorage(project.project)
        }))
      : []
  }));
}

function buildDeviceParameterFile(project) {
  return JSON.stringify(
    {
      version: 1,
      name: project.name,
      devices: (project.nodes ?? []).map((node) => ({
        id: node.id,
        kind: node.kind,
        name: node.name,
        nodeNumber: node.nodeNumber,
        acTopologyNode: node.acTopologyNode,
        dcTopologyNode: node.dcTopologyNode,
        terminals: node.terminals,
        params: node.params
      })),
      edges: project.edges ?? []
    },
    null,
    2
  );
}

function endpointPoint(project, edge, side) {
  const node = (project.nodes ?? []).find((item) => item.id === (side === "source" ? edge.sourceId : edge.targetId));
  const explicit = side === "source" ? edge.sourcePoint : edge.targetPoint;
  if (explicit) {
    return explicit;
  }
  if (!node) {
    return { x: 0, y: 0 };
  }
  const terminalId = side === "source" ? edge.sourceTerminalId : edge.targetTerminalId;
  const terminal = (node.terminals ?? []).find((item) => item.id === terminalId) ?? node.terminals?.[0];
  return {
    x: Math.round(node.position.x + (terminal?.anchor?.x ?? 0) * (node.size?.width ?? 0)),
    y: Math.round(node.position.y + (terminal?.anchor?.y ?? 0) * (node.size?.height ?? 0))
  };
}

function buildSvgFile(project) {
  const width = Number(project.canvasWidth ?? 1980);
  const height = Number(project.canvasHeight ?? 1024);
  const edgeMarkup = (project.edges ?? [])
    .map((edge) => {
      const start = endpointPoint(project, edge, "source");
      const end = endpointPoint(project, edge, "target");
      const midX = Math.round((start.x + end.x) / 2);
      const points = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]
        .map((point) => `${point.x},${point.y}`)
        .join(" ");
      return `<polyline points="${points}" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("\n");
  const nodeMarkup = (project.nodes ?? [])
    .map((node) => {
      const width = node.size?.width ?? 80;
      const height = node.size?.height ?? 48;
      const stroke = String(node.kind ?? "").startsWith("dc") || String(node.kind ?? "").includes("dcdc") ? "#0f766e" : "#2563eb";
      const isBus = String(node.kind ?? "").includes("bus");
      const image = node.params?.backgroundImageAssetId ? `/api/images/${node.params.backgroundImageAssetId}` : node.params?.backgroundImage ?? "";
      const transform = `translate(${node.position?.x ?? 0} ${node.position?.y ?? 0}) rotate(${node.rotation ?? 0}) scale(${node.scaleX ?? node.scale ?? 1} ${node.scaleY ?? node.scale ?? 1})`;
      if (isBus) {
        return `<g transform="${transform}"><title>${node.name ?? ""}</title><line x1="${-width / 2}" y1="0" x2="${width / 2}" y2="0" stroke="${stroke}" stroke-width="${Math.max(8, height / 3)}" stroke-linecap="round"/></g>`;
      }
      return `<g transform="${transform}"><title>${node.name ?? ""}</title><rect x="${-width / 2}" y="${-height / 2}" width="${width}" height="${height}" rx="8" fill="#ffffff" stroke="#94a3b8"/>${image ? `<image href="${image}" x="${-width / 2}" y="${-height / 2}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>` : ""}</g>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#f8fafc"/>
${edgeMarkup}
${nodeMarkup}
</svg>`;
}

async function writeSchemeFiles(schemes) {
  const filesRoot = join(schemeDataDir, "files");
  await rm(filesRoot, { recursive: true, force: true });
  await mkdir(filesRoot, { recursive: true });
  for (const scheme of schemes) {
    const schemeDir = join(filesRoot, `${safeFilePart(scheme.name, "方案")}__${scheme.id}`);
    await mkdir(schemeDir, { recursive: true });
    await writeFile(join(schemeDir, "scheme.json"), JSON.stringify(scheme, null, 2), "utf-8");
    for (const record of scheme.projects ?? []) {
      const baseName = `${safeFilePart(record.name, "模型")}__${record.id}`;
      await writeFile(join(schemeDir, `${baseName}.json`), JSON.stringify(record.project, null, 2), "utf-8");
      await writeFile(join(schemeDir, `${baseName}.e`), buildDeviceParameterFile(record.project), "utf-8");
      await writeFile(join(schemeDir, `${baseName}.svg`), buildSvgFile(record.project), "utf-8");
    }
  }
}

function publicAsset(item) {
  return {
    id: item.id,
    name: item.name,
    folderId: item.folderId || "root",
    mimeType: item.mimeType,
    size: item.size,
    createdAt: item.createdAt,
    url: `/api/images/${item.id}`
  };
}

async function handleUpload(request, response) {
  const body = await readBody(request, maxImageBodyBytes, "图片过大，最大支持 16MB。");
  const payload = JSON.parse(body || "{}");
  const { dataUrl, name } = payload;
  if (typeof dataUrl !== "string") {
    sendError(response, 400, "缺少图片数据。");
    return;
  }
  const { mimeType, bytes } = parseDataUrl(dataUrl);
  const folderId = await resolveFolderId(typeof payload.folderId === "string" ? payload.folderId : "root");
  const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const filename = `${id}${mimeExt[mimeType]}`;
  await ensureStore();
  await writeFile(join(imageDataDir, filename), bytes);
  const item = {
    id,
    name: safeName(name),
    folderId,
    mimeType,
    size: bytes.length,
    filename,
    createdAt: new Date().toISOString()
  };
  const manifest = await readManifest();
  await writeManifest([item, ...manifest]);
  sendJson(response, 201, publicAsset(item));
}

async function handleCreateImageFolder(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || "{}");
  const name = safeName(payload.name || "新建文件夹");
  const folders = await readImageFolders();
  if (folders.some((folder) => folder.name.trim() === name.trim())) {
    sendError(response, 409, "图片文件夹名称重复。");
    return;
  }
  const folder = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: new Date().toISOString()
  };
  await writeImageFolders([...folders, folder]);
  sendJson(response, 201, folder);
}

async function handleRenameImageFolder(folderId, request, response) {
  if (folderId === "root") {
    sendError(response, 400, "默认文件夹不能重命名。");
    return;
  }
  const body = await readBody(request);
  const payload = JSON.parse(body || "{}");
  const name = safeName(payload.name || "");
  if (!name) {
    sendError(response, 400, "文件夹名称不能为空。");
    return;
  }
  const folders = await readImageFolders();
  if (!folders.some((folder) => folder.id === folderId)) {
    sendError(response, 404, "图片文件夹不存在。");
    return;
  }
  if (folders.some((folder) => folder.id !== folderId && folder.name.trim() === name.trim())) {
    sendError(response, 409, "图片文件夹名称重复。");
    return;
  }
  const next = folders.map((folder) => (folder.id === folderId ? { ...folder, name } : folder));
  await writeImageFolders(next);
  sendJson(response, 200, next.find((folder) => folder.id === folderId));
}

async function handleDeleteImageFolder(folderId, response) {
  if (folderId === "root") {
    sendError(response, 400, "默认文件夹不能删除。");
    return;
  }
  const folders = await readImageFolders();
  if (!folders.some((folder) => folder.id === folderId)) {
    sendError(response, 404, "图片文件夹不存在。");
    return;
  }
  await writeImageFolders(folders.filter((folder) => folder.id !== folderId));
  const manifest = await readManifest();
  await writeManifest(manifest.map((item) => (item.folderId === folderId ? { ...item, folderId: "root" } : item)));
  sendJson(response, 200, { ok: true });
}

async function handleDownload(id, response) {
  const manifest = await readManifest();
  const item = manifest.find((entry) => entry.id === id);
  if (!item) {
    sendError(response, 404, "图片不存在。");
    return;
  }
  response.writeHead(200, {
    "content-type": item.mimeType,
    "cache-control": "public, max-age=31536000, immutable",
    "access-control-allow-origin": "*"
  });
  createReadStream(join(imageDataDir, item.filename)).pipe(response);
}

async function handleSaveSchemes(request, response) {
  const body = await readBody(request, maxSchemeBodyBytes, "方案/模型数据过大，最大支持 64MB。");
  const payload = JSON.parse(body || "{}");
  const schemes = Array.isArray(payload) ? payload : payload.schemes;
  if (!Array.isArray(schemes)) {
    sendError(response, 400, "缺少方案/模型数据。");
    return;
  }
  const normalized = normalizeSchemesForStorage(schemes);
  await writeSchemes(normalized);
  sendJson(response, 200, { ok: true, schemes: normalized, savedAt: new Date().toISOString() });
}

export function createImageServer({ port = 5174, host = "127.0.0.1" } = {}) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      if (request.method === "OPTIONS") {
        response.writeHead(204, {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
          "access-control-allow-headers": "content-type"
        });
        response.end();
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/images") {
        const manifest = await readManifest();
        const folderId = url.searchParams.get("folderId");
        const filtered = folderId ? manifest.filter((item) => (item.folderId || "root") === folderId) : manifest;
        sendJson(response, 200, filtered.map(publicAsset));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/images") {
        await handleUpload(request, response);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/image-folders") {
        const folders = await readImageFolders();
        const manifest = await readManifest();
        sendJson(
          response,
          200,
          folders.map((folder) => ({
            ...folder,
            imageCount: manifest.filter((item) => (item.folderId || "root") === folder.id).length
          }))
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/image-folders") {
        await handleCreateImageFolder(request, response);
        return;
      }
      const imageFolderMatch = /^\/api\/image-folders\/([^/]+)$/u.exec(url.pathname);
      if (imageFolderMatch && request.method === "PUT") {
        await handleRenameImageFolder(decodeURIComponent(imageFolderMatch[1]), request, response);
        return;
      }
      if (imageFolderMatch && request.method === "DELETE") {
        await handleDeleteImageFolder(decodeURIComponent(imageFolderMatch[1]), response);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/schemes") {
        const schemes = await readSchemes();
        sendJson(response, 200, { schemes });
        return;
      }
      if (request.method === "PUT" && url.pathname === "/api/schemes") {
        await handleSaveSchemes(request, response);
        return;
      }
      const imageMatch = /^\/api\/images\/([^/]+)$/u.exec(url.pathname);
      if (request.method === "GET" && imageMatch) {
        await handleDownload(imageMatch[1], response);
        return;
      }
      sendError(response, 404, "接口不存在。");
    } catch (error) {
      sendError(response, 500, error instanceof Error ? error.message : "后端处理失败。");
    }
  });
  return new Promise((resolveServer) => {
    server.listen(port, host, () => resolveServer(server));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.IMAGE_SERVER_PORT ?? 5174);
  const host = process.env.IMAGE_SERVER_HOST ?? "127.0.0.1";
  await createImageServer({ port, host });
  console.log(`Image backend listening at http://${host}:${port}`);
}
