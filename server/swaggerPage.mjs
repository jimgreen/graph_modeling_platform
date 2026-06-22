// /swigger 页面：Swagger 风格的 /api/ 接口文档 + 在线测试。
// 自包含 HTML（无外部依赖），内嵌接口元数据，前端 JS 渲染分组卡片 + Try-it。

// 接口元数据。method/path/desc/group/query/body/response 用于文档展示。
// path 中的 {param} 为路径参数；query 为查询参数数组；body 为请求体示例 JSON。
// examples: [{ label, params: { <pathParamName>: <v>, "q_<queryName>": <v>, "__body__": <obj|str> } }]
//   每个接口至少 1 个示例，Try-it 下拉切换示例自动填充输入框。
//   真实数据取自 data/schemes：方案「默认方案」(子「1-1」)，模型如「未命名模型」「线路」等。
const SP_DEFAULT = encodeURIComponent(JSON.stringify(["默认方案"]));
const SP_SUB = encodeURIComponent(JSON.stringify(["默认方案", "1-1"]));
const PNG_1X1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const ENDPOINTS = [
  // ---- 图片域 ----
  { group: "图片资源", method: "GET", path: "/api/images", desc: "图片清单（支持按文件夹过滤）", query: [{ name: "folderId", desc: "文件夹 id，不传返回全部" }], response: "[{id,name,folderId,mimeType,...}]", examples: [
    { label: "全部图片", params: {} },
    { label: "按文件夹过滤", params: { q_folderId: "root" } }
  ]},
  { group: "图片资源", method: "POST", path: "/api/images", desc: "上传图片（dataUrl）", body: { dataUrl: PNG_1X1, name: "示例.png" }, response: "{id,name,folderId,mimeType,...}", examples: [
    { label: "上传 1×1 PNG", params: { __body__: { dataUrl: PNG_1X1, name: "示例.png" } } }
  ]},
  { group: "图片资源", method: "GET", path: "/api/image-folders", desc: "图片文件夹列表（含图片计数）", response: "[{id,name,imageCount}]", examples: [
    { label: "全部文件夹", params: {} }
  ]},
  { group: "图片资源", method: "POST", path: "/api/image-folders", desc: "新建图片文件夹", body: { name: "新建文件夹" }, response: "{id,name}", examples: [
    { label: "新建「测试文件夹」", params: { __body__: { name: "测试文件夹" } } }
  ]},
  { group: "图片资源", method: "PUT", path: "/api/image-folders/{folderId}", desc: "重命名图片文件夹", pathParams: [{ name: "folderId", desc: "文件夹 id" }], body: { name: "新名称" }, response: "{id,name}", examples: [
    { label: "重命名 root", params: { folderId: "root", __body__: { name: "根目录" } } }
  ]},
  { group: "图片资源", method: "DELETE", path: "/api/image-folders/{folderId}", desc: "删除图片文件夹（默认文件夹不可删）", pathParams: [{ name: "folderId", desc: "文件夹 id" }], response: "{ok:true}", examples: [
    { label: "删除（root 会 400）", params: { folderId: "root" } }
  ]},
  { group: "图片资源", method: "GET", path: "/api/images/{id}", desc: "下载图片二进制", pathParams: [{ name: "id", desc: "图片 id" }], response: "<二进制，content-type 按 mime>", examples: [
    { label: "先 GET /api/images 取 id 再填入", params: { id: "" } }
  ]},

  // ---- 方案域（内部读写）----
  { group: "方案（内部）", method: "GET", path: "/api/schemes", desc: "方案树", query: [{ name: "includeProjects", desc: "1 时含完整 project 数据" }], response: "{schemes:[{name,updatedAt,projects,children}]}", examples: [
    { label: "方案树摘要", params: {} },
    { label: "含完整 project", params: { q_includeProjects: "1" } }
  ]},
  { group: "方案（内部）", method: "GET", path: "/api/schemes/export", desc: "导出方案 ZIP", query: [{ name: "schemePath", desc: "encodeURIComponent(JSON.stringify(['方案A','子方案']))" }], response: "<application/zip 二进制>", examples: [
    { label: "导出「默认方案」", params: { q_schemePath: SP_DEFAULT } },
    { label: "导出子方案「1-1」", params: { q_schemePath: SP_SUB } }
  ]},
  { group: "方案（内部）", method: "POST", path: "/api/schemes/import", desc: "导入方案 ZIP（body 为二进制）", query: [{ name: "parentPath", desc: "父方案路径" }, { name: "fileName", desc: "文件名" }, { name: "mode", desc: "overwrite|check（默认 check）" }, { name: "targetName", desc: "目标方案名" }], body: "<binary zip>", response: "{ok,schemes,importedName,...}", examples: [
    { label: "check 模式预检（需上传 zip）", params: { q_parentPath: SP_DEFAULT, q_fileName: "导入方案.zip", q_mode: "check", q_targetName: "导入的方案", __body__: "<binary zip>" } }
  ]},
  { group: "方案（内部）", method: "PUT", path: "/api/schemes", desc: "保存方案树", body: { schemes: [] }, response: "{ok:true,schemes,savedAt}", examples: [
    { label: "保存空方案树（会清空，慎用）", params: { __body__: { schemes: [] } } }
  ]},
  { group: "方案（内部）", method: "GET", path: "/api/schemes/project", desc: "读取单个模型", query: [{ name: "schemePath", desc: "方案路径" }, { name: "name", desc: "模型名（或 projectName）" }], response: "{ok:true,project}", examples: [
    { label: "读「未命名模型」", params: { q_schemePath: SP_DEFAULT, q_name: "未命名模型" } },
    { label: "读「线路」", params: { q_schemePath: SP_DEFAULT, q_name: "线路" } }
  ]},
  { group: "方案（内部）", method: "PUT", path: "/api/schemes/project", desc: "保存模型", body: { schemePath: ["默认方案"], name: "模型1", project: {} }, response: "{ok:true,project,savedAt}", examples: [
    { label: "保存空模型到「默认方案/新模型」", params: { __body__: { schemePath: ["默认方案"], name: "新模型", project: { canvasWidth: 1920, canvasHeight: 1024, nodes: [], edges: [] } } } }
  ]},
  { group: "方案（内部）", method: "DELETE", path: "/api/schemes/project", desc: "删除模型", body: { schemePath: ["默认方案"], name: "模型1" }, response: "{ok:true,savedAt}", examples: [
    { label: "删除「未命名模型」", params: { __body__: { schemePath: ["默认方案"], name: "未命名模型" } } }
  ]},
  { group: "方案（内部）", method: "PUT", path: "/api/schemes/scheme", desc: "保存方案目录", body: { schemePath: ["方案A"] }, response: "{ok:true,savedAt}", examples: [
    { label: "保存方案目录「默认方案」", params: { __body__: { schemePath: ["默认方案"] } } }
  ]},
  { group: "方案（内部）", method: "DELETE", path: "/api/schemes/scheme", desc: "删除方案目录", body: { schemePath: ["方案A"] }, response: "{ok:true,savedAt}", examples: [
    { label: "删除子方案「1-1」", params: { __body__: { schemePath: ["默认方案", "1-1"] } } }
  ]},

  // ---- 配置域 ----
  { group: "配置", method: "GET", path: "/api/color-config", desc: "颜色配置", response: "{ok:true,...colorConfig}", examples: [
    { label: "当前颜色配置", params: {} }
  ]},
  { group: "配置", method: "PUT", path: "/api/color-config", desc: "保存颜色配置", body: { colorDisplayMode: "default", colorPalette: {} }, response: "{ok:true,...colorConfig}", examples: [
    { label: "设为默认配色", params: { __body__: { colorDisplayMode: "default", colorPalette: {} } } }
  ]},
  { group: "配置", method: "GET", path: "/api/measurement-config", desc: "量测配置", response: "{ok:true,measurementTypes,deviceProfiles}", examples: [
    { label: "当前量测配置", params: {} }
  ]},
  { group: "配置", method: "PUT", path: "/api/measurement-config", desc: "保存量测配置", body: { measurementTypes: [], deviceProfiles: [] }, response: "{ok:true,...measurementConfig}", examples: [
    { label: "清空量测配置", params: { __body__: { measurementTypes: [], deviceProfiles: [] } } }
  ]},
  { group: "配置", method: "GET", path: "/api/device-library", desc: "图元库配置", response: "{ok:true,...deviceLibrary}", examples: [
    { label: "当前图元库配置", params: {} }
  ]},
  { group: "配置", method: "PUT", path: "/api/device-library", desc: "保存图元库配置", body: { customComponentTypes: [], customAttributeLibraries: [] }, response: "{ok:true,...deviceLibrary}", examples: [
    { label: "清空自定义图元", params: { __body__: { customComponentTypes: [], customAttributeLibraries: [], customDeviceTemplates: [], customGraphTemplates: [], customGraphTemplateTypes: [], deviceDefinitionOverrides: {} } } }
  ]},

  // ---- v1 方案域（第三方只读）----
  { group: "v1 方案域", method: "GET", path: "/api/v1/schemes", desc: "方案树（信封 {ok,data}）", query: [{ name: "includeProjects", desc: "1 时含完整 project" }], response: "{ok:true,data:{schemes:[...]}}", examples: [
    { label: "方案树摘要", params: {} },
    { label: "含完整 project", params: { q_includeProjects: "1" } }
  ]},
  { group: "v1 方案域", method: "GET", path: "/api/v1/schemes/hierarchy", desc: "纯层级树", response: "{ok:true,data:{nodes:[{name,children}]}}", examples: [
    { label: "层级树", params: {} }
  ]},
  { group: "v1 方案域", method: "GET", path: "/api/v1/schemes/models", desc: "方案下模型列表", query: [{ name: "schemePath", desc: "方案路径" }], response: "{ok:true,data:{models:[{name,updatedAt}]}}", examples: [
    { label: "「默认方案」下模型", params: { q_schemePath: SP_DEFAULT } },
    { label: "子方案「1-1」下模型", params: { q_schemePath: SP_SUB } }
  ]},
  { group: "v1 方案域", method: "GET", path: "/api/v1/schemes/export", desc: "导出方案 ZIP", query: [{ name: "schemePath", desc: "方案路径" }], response: "<application/zip 二进制>", examples: [
    { label: "导出「默认方案」", params: { q_schemePath: SP_DEFAULT } }
  ]},
  { group: "v1 方案域", method: "GET", path: "/api/v1/schemes/model/json", desc: "模型 project JSON", query: [{ name: "schemePath", desc: "方案路径" }, { name: "name", desc: "模型名" }], response: "{ok:true,data:{project}}", examples: [
    { label: "「未命名模型」JSON", params: { q_schemePath: SP_DEFAULT, q_name: "未命名模型" } },
    { label: "「线路」JSON", params: { q_schemePath: SP_DEFAULT, q_name: "线路" } }
  ]},
  { group: "v1 方案域", method: "GET", path: "/api/v1/schemes/model/svg", desc: "模型 SVG", query: [{ name: "schemePath", desc: "方案路径" }, { name: "name", desc: "模型名" }], response: "<image/svg+xml>", examples: [
    { label: "「未命名模型」SVG", params: { q_schemePath: SP_DEFAULT, q_name: "未命名模型" } },
    { label: "「图元连接」SVG", params: { q_schemePath: SP_DEFAULT, q_name: "图元连接" } }
  ]},

  // ---- v1 图元库域（第三方只读）----
  { group: "v1 图元库域", method: "GET", path: "/api/v1/library", desc: "图元库聚合", response: "{ok:true,data:{categories,devices,measurements,deviceDefinitions,templates}}", examples: [
    { label: "聚合全量", params: {} }
  ]},
  { group: "v1 图元库域", method: "GET", path: "/api/v1/library/categories", desc: "图元分类树", response: "{ok:true,data:{categories:[{id,name}]}}", examples: [
    { label: "分类树", params: {} }
  ]},
  { group: "v1 图元库域", method: "GET", path: "/api/v1/library/devices", desc: "各类图元信息", response: "{ok:true,data:{eSections,staticComponentTypes,customComponentTypes}}", examples: [
    { label: "图元信息", params: {} }
  ]},
  { group: "v1 图元库域", method: "GET", path: "/api/v1/library/measurements", desc: "量测定义", response: "{ok:true,data:{measurementTypes,deviceProfiles}}", examples: [
    { label: "量测定义", params: {} }
  ]},
  { group: "v1 图元库域", method: "GET", path: "/api/v1/library/device-definitions", desc: "图元定义", response: "{ok:true,data:{deviceDefinitionOverrides,customComponentTypes,customAttributeLibraries}}", examples: [
    { label: "图元定义", params: {} }
  ]},
  { group: "v1 图元库域", method: "GET", path: "/api/v1/library/templates", desc: "模板库", response: "{ok:true,data:{customDeviceTemplates,customGraphTemplates,customGraphTemplateTypes}}", examples: [
    { label: "模板库", params: {} }
  ]},

  // ---- v1 运行时态域（经 WS 拉前端，需前端在线）----
  { group: "v1 运行时态", method: "GET", path: "/api/v1/runtime/clients", desc: "在线客户端列表（server 直返）", response: "{ok:true,data:{clients:[{clientId,role,lastActiveAt}]}}", examples: [
    { label: "在线客户端（无前端在线时为空）", params: {} }
  ]},
  { group: "v1 运行时态", method: "GET", path: "/api/v1/runtime/model", desc: "当前打开模型定位", query: [{ name: "clientId", desc: "可选，不传取最近活跃" }], response: "{ok:true,data:{modelName,modelId,schemePath,updatedAt}}", examples: [
    { label: "默认客户端（需前端在线）", params: {} }
  ]},
  { group: "v1 运行时态", method: "GET", path: "/api/v1/runtime/devices", desc: "当前模型设备清单", query: [{ name: "clientId", desc: "可选" }], response: "{ok:true,data:{nodes,edges}}", examples: [
    { label: "默认客户端设备清单", params: {} }
  ]},
  { group: "v1 运行时态", method: "GET", path: "/api/v1/runtime/selection", desc: "当前选中设备", query: [{ name: "clientId", desc: "可选" }], response: "{ok:true,data:{selectedNodeIds,selectedNode}}", examples: [
    { label: "当前选中", params: {} }
  ]},
  { group: "v1 运行时态", method: "GET", path: "/api/v1/runtime/tabs", desc: "三 tab 聚合（snapshot）", query: [{ name: "clientId", desc: "可选" }], response: "{ok:true,data:{model,devices,selection,tabs}}", examples: [
    { label: "三 tab 聚合", params: {} }
  ]},
  { group: "v1 运行时态", method: "GET", path: "/api/v1/runtime/tabs/{tab}", desc: "单 tab 内容", pathParams: [{ name: "tab", desc: "model|tree|graph" }], query: [{ name: "clientId", desc: "可选" }], response: "{ok:true,data:{tab,title,rows?,tree?,subView?,deviceParams?}}", examples: [
    { label: "基础 tab (model)", params: { tab: "model" } },
    { label: "图元树 tab (tree)", params: { tab: "tree" } },
    { label: "图元 tab (graph)", params: { tab: "graph" } }
  ]},
  { group: "v1 运行时态", method: "GET", path: "/api/v1/runtime/screenshot", desc: "画布 PNG 截图", query: [{ name: "width", desc: "可选，正数" }, { name: "height", desc: "可选，正数" }, { name: "clientId", desc: "可选" }], response: "<image/png 二进制>", examples: [
    { label: "默认尺寸截图", params: {} },
    { label: "800×600 截图", params: { q_width: "800", q_height: "600" } }
  ]},
  { group: "v1 运行时态", method: "GET", path: "/api/v1/runtime/svg", desc: "画布 SVG 文本", query: [{ name: "clientId", desc: "可选" }], response: "<image/svg+xml>", examples: [
    { label: "画布 SVG", params: {} }
  ]},
  { group: "v1 运行时态", method: "GET", path: "/api/v1/runtime/e-file", desc: "E 文件文本", query: [{ name: "clientId", desc: "可选" }], response: "<text/plain，attachment>", examples: [
    { label: "E 文件", params: {} }
  ]}
];

const METHOD_COLORS = {
  GET: "#61affe",
  POST: "#49cc90",
  PUT: "#fca130",
  DELETE: "#f93e3e"
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function escapeJs(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// 把接口按 group 分组
function groupEndpoints() {
  const map = new Map();
  for (const ep of ENDPOINTS) {
    if (!map.has(ep.group)) map.set(ep.group, []);
    map.get(ep.group).push(ep);
  }
  return Array.from(map.entries());
}

export function renderSwaggerHtml() {
  const endpointsJson = JSON.stringify(ENDPOINTS);
  // 打全局索引，供前端 onclick 引用 ENDPOINTS[idx]
  ENDPOINTS.forEach((ep, i) => { ep._idx = i; });
  const groups = groupEndpoints();

  const groupNavHtml = groups.map(([name, list]) =>
    `<a href="#group-${encodeURIComponent(name)}" class="nav-item">${escapeHtml(name)} <span class="nav-count">${list.length}</span></a>`
  ).join("");

  const groupCardsHtml = groups.map(([name, list]) => {
    const cards = list.map((ep) => renderCard(ep, ep._idx)).join("");
    return `<section class="group" id="group-${encodeURIComponent(name)}">
      <h2>${escapeHtml(name)}</h2>
      ${cards}
    </section>`;
  }).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>API Swigger — /api/ 接口文档</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; background: #f5f7fa; color: #2b3a42; }
  header { background: #1a2233; color: #fff; padding: 14px 24px; display: flex; align-items: center; gap: 16px; }
  header h1 { font-size: 18px; margin: 0; font-weight: 600; }
  header .sub { opacity: 0.6; font-size: 13px; }
  .layout { display: flex; min-height: calc(100vh - 52px); }
  nav { width: 220px; background: #fff; border-right: 1px solid #e4e8eb; padding: 16px 0; overflow-y: auto; }
  .nav-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 18px; color: #345; text-decoration: none; font-size: 13px; border-left: 3px solid transparent; }
  .nav-item:hover { background: #f0f4f7; border-left-color: #61affe; }
  .nav-count { background: #eef2f5; color: #6b7d8a; border-radius: 10px; padding: 1px 8px; font-size: 11px; }
  main { flex: 1; padding: 20px 28px; overflow-y: auto; }
  .group { margin-bottom: 28px; }
  .group h2 { font-size: 16px; border-bottom: 2px solid #dfe6ea; padding-bottom: 8px; margin: 0 0 14px; }
  .card { background: #fff; border: 1px solid #e4e8eb; border-radius: 6px; margin-bottom: 12px; overflow: hidden; }
  .card-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; }
  .card-head:hover { background: #fafbfc; }
  .method { display: inline-block; min-width: 64px; text-align: center; padding: 3px 8px; border-radius: 3px; color: #fff; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; }
  .path { font-family: "SFMono-Regular", Consolas, monospace; font-size: 14px; flex: 1; }
  .desc { color: #6b7d8a; font-size: 13px; }
  .card-body { padding: 0 14px 14px; display: none; }
  .card.open .card-body { display: block; }
  .card.open .card-head { border-bottom: 1px solid #eef2f5; }
  .field { margin: 10px 0; }
  .field-label { font-size: 12px; color: #6b7d8a; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .param-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .param-table th, .param-table td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #eef2f5; }
  .param-table th { color: #6b7d8a; font-weight: 600; }
  .param-name { font-family: Consolas, monospace; color: #2b6cb0; }
  pre { background: #1e293b; color: #e2e8f0; padding: 10px 12px; border-radius: 4px; font-size: 12px; overflow-x: auto; margin: 0; font-family: Consolas, monospace; }
  .try-row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; margin-top: 8px; }
  .try-row input, .try-row textarea { padding: 6px 8px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; font-family: Consolas, monospace; }
  .try-row input { min-width: 140px; }
  .try-row textarea { width: 100%; min-height: 60px; }
  button.send { background: #2b6cb0; color: #fff; border: 0; padding: 7px 16px; border-radius: 4px; font-size: 13px; cursor: pointer; }
  button.send:hover { background: #2c5282; }
  button.send:disabled { background: #a0aec0; cursor: not-allowed; }
  .result { margin-top: 10px; }
  .result-meta { font-size: 12px; color: #6b7d8a; margin-bottom: 4px; }
  .img-preview { max-width: 100%; max-height: 320px; border: 1px solid #e4e8eb; border-radius: 4px; margin-top: 6px; }
  .arrow { color: #cbd5e0; transition: transform 0.2s; }
  .card.open .arrow { transform: rotate(90deg); }
</style>
</head>
<body>
<header>
  <h1>API Swigger</h1>
  <span class="sub">/api/ 接口文档与在线测试</span>
</header>
<div class="layout">
  <nav>${groupNavHtml}</nav>
  <main>
    ${groupCardsHtml}
  </main>
</div>
<script>
  const ENDPOINTS = ${endpointsJson};
  const METHOD_COLORS = ${JSON.stringify(METHOD_COLORS)};

  // 折叠/展开
  document.querySelectorAll(".card-head").forEach((head) => {
    head.addEventListener("click", () => head.parentElement.classList.toggle("open"));
  });

  function buildUrl(ep, params) {
    let path = ep.path;
    (ep.pathParams || []).forEach((p) => {
      const v = params[p.name] || "";
      path = path.replace("{" + p.name + "}", encodeURIComponent(v));
    });
    const qs = (ep.query || []).map((q) => {
      const v = params["q_" + q.name];
      if (v === undefined || v === "") return "";
      return encodeURIComponent(q.name) + "=" + encodeURIComponent(v);
    }).filter(Boolean).join("&");
    return path + (qs ? "?" + qs : "");
  }

  async function send(btn, ep) {
    const card = btn.closest(".card");
    const inputs = card.querySelectorAll("input[data-key], textarea[data-key]");
    const params = {};
    inputs.forEach((i) => { params[i.dataset.key] = i.value; });
    const url = buildUrl(ep, params);
    const resultDiv = card.querySelector(".result");
    const metaDiv = card.querySelector(".result-meta");
    const bodyDiv = card.querySelector(".result-body");
    btn.disabled = true;
    btn.textContent = "请求中...";
    try {
      const opts = { method: ep.method };
      if (ep.body && (ep.method === "POST" || ep.method === "PUT" || ep.method === "DELETE")) {
        const bodyText = params["__body__"] || "";
        if (bodyText) {
          // 判断是否 JSON
          if (bodyText.trim().startsWith("{") || bodyText.trim().startsWith("[")) {
            opts.headers = { "content-type": "application/json" };
            opts.body = bodyText;
          } else {
            opts.body = bodyText; // 原始（如二进制占位）
          }
        }
      }
      const res = await fetch(url, opts);
      metaDiv.textContent = "HTTP " + res.status + " · " + (res.headers.get("content-type") || "");
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("image/png") || ct.includes("image/jpeg") || ct.includes("image/webp") || ct.includes("image/gif")) {
        const blob = await res.blob();
        const u = URL.createObjectURL(blob);
        bodyDiv.innerHTML = '<img class="img-preview" src="' + u + '">';
      } else if (ct.includes("image/svg") || ct.includes("text/plain") || ct.includes("text/html")) {
        const text = await res.text();
        bodyDiv.innerHTML = "<pre>" + escapeHtmlJs(text) + "</pre>";
      } else if (ct.includes("application/zip")) {
        const blob = await res.blob();
        bodyDiv.innerHTML = '<a href="' + URL.createObjectURL(blob) + '" download="export.zip">下载 ZIP (' + Math.round(blob.size / 1024) + ' KB)</a>';
      } else {
        const text = await res.text();
        try {
          bodyDiv.innerHTML = "<pre>" + escapeHtmlJs(JSON.stringify(JSON.parse(text), null, 2)) + "</pre>";
        } catch {
          bodyDiv.innerHTML = "<pre>" + escapeHtmlJs(text) + "</pre>";
        }
      }
    } catch (e) {
      metaDiv.textContent = "请求失败";
      bodyDiv.innerHTML = "<pre>" + escapeHtmlJs(String(e)) + "</pre>";
    } finally {
      btn.disabled = false;
      btn.textContent = "发送请求";
    }
  }

  function escapeHtmlJs(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  // 示例下拉：选中示例 → 填充该卡片所有输入框（path/query/body）
  function applyExample(sel, ep) {
    const idx = Number(sel.value);
    if (Number.isNaN(idx) || !ep.examples || !ep.examples[idx]) return;
    const ex = ep.examples[idx];
    const card = sel.closest(".card");
    card.querySelectorAll("input[data-key], textarea[data-key]").forEach((i) => {
      const key = i.dataset.key;
      if (Object.prototype.hasOwnProperty.call(ex.params, key)) {
        const v = ex.params[key];
        i.value = (typeof v === "string") ? v : JSON.stringify(v, null, 2);
      } else {
        i.value = "";
      }
    });
  }

  window.sendRequest = send;
  window.applyExample = applyExample;
</script>
</body>
</html>`;
}

function renderCard(ep, idx) {
  const color = METHOD_COLORS[ep.method] || "#888";
  const pathParamsRows = (ep.pathParams || []).map((p) =>
    `<tr><td class="param-name">{${escapeHtml(p.name)}}</td><td>path</td><td>${escapeHtml(p.desc || "")}</td></tr>`
  ).join("");
  const queryRows = (ep.query || []).map((q) =>
    `<tr><td class="param-name">${escapeHtml(q.name)}</td><td>query</td><td>${escapeHtml(q.desc || "")}</td></tr>`
  ).join("");
  const paramTable = (pathParamsRows || queryRows)
    ? `<div class="field"><div class="field-label">参数</div><table class="param-table"><tr><th>名称</th><th>位置</th><th>说明</th></tr>${pathParamsRows}${queryRows}</table></div>`
    : "";

  // Try-it 输入
  const pathParamInputs = (ep.pathParams || []).map((p) =>
    `<label style="display:flex;flex-direction:column;gap:2px;font-size:12px;color:#6b7d8a;">${escapeHtml(p.name)}<input data-key="${escapeHtml(p.name)}" placeholder="${escapeHtml(p.name)}"></label>`
  ).join("");
  const queryInputs = (ep.query || []).map((q) =>
    `<label style="display:flex;flex-direction:column;gap:2px;font-size:12px;color:#6b7d8a;">${escapeHtml(q.name)}<input data-key="q_${escapeHtml(q.name)}" placeholder="${escapeHtml(q.name)}"></label>`
  ).join("");
  const bodyInput = ep.body
    ? `<div style="flex:1 1 100%;"><div class="field-label" style="margin-top:8px;">请求体 (JSON)</div><textarea data-key="__body__" placeholder='${escapeHtml(JSON.stringify(ep.body, null, 2))}'>${escapeHtml(JSON.stringify(ep.body, null, 2))}</textarea></div>`
    : "";

  // 示例下拉：选中即填充输入框
  const examples = Array.isArray(ep.examples) ? ep.examples : [];
  const exampleSelect = examples.length
    ? `<div class="try-row" style="align-items:center;"><label style="font-size:12px;color:#6b7d8a;">示例</label><select onchange="applyExample(this, ENDPOINTS[${idx}])" style="padding:6px 8px;border:1px solid #cbd5e0;border-radius:4px;font-size:13px;"><option value="">-- 选择示例 --</option>${examples.map((ex, i) => `<option value="${i}">${escapeHtml(ex.label)}</option>`).join("")}</select></div>`
    : "";

  const responseBlock = ep.response
    ? `<div class="field"><div class="field-label">响应</div><pre>${escapeHtml(ep.response)}</pre></div>`
    : "";

  return `<div class="card">
    <div class="card-head">
      <span class="method" style="background:${color}">${escapeHtml(ep.method)}</span>
      <span class="path">${escapeHtml(ep.path)}</span>
      <span class="desc">${escapeHtml(ep.desc || "")}</span>
      <span class="arrow">▶</span>
    </div>
    <div class="card-body">
      ${paramTable}
      ${responseBlock}
      <div class="field"><div class="field-label">试一下</div>
        ${exampleSelect}
        <div class="try-row">${pathParamInputs}${queryInputs}${bodyInput}</div>
        <div class="try-row"><button class="send" onclick="sendRequest(this, ENDPOINTS[${idx}])">发送请求</button></div>
      </div>
      <div class="result">
        <div class="result-meta"></div>
        <div class="result-body"></div>
      </div>
    </div>
  </div>`;
}
