// 跨源头：全站唯一一份。server.mjs 的全局 OPTIONS 短路与 v1Response.mjs 的
// 各响应头都从这里取，避免「同一概念两处硬编码」再次分叉。
export const accessControlHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  // x-space：空间标识头。缺它则浏览器的跨源预检失败。
  // 注意 allow-origin:* 与携带 Cookie 的跨源请求互斥（浏览器拒绝），
  // 故 Cookie 仅限同源；跨源第三方只能走 ?space= 或 X-Space。
  "access-control-allow-headers": "content-type,x-space"
};

// 二进制 / 附件下载类端点（PNG 截图、SVG、E 文件、CIM、ZIP、方案 ZIP）只带
// allow-origin 单头：它们不是 JSON 信封响应，全量 methods/headers 对 GET 下载
// 没有意义（预检只在非简单请求时发生，而 GET 下载是简单请求）。
// 同样从本模块取，避免 allow-origin 的取值在别处再硬编码一份。
export const accessControlOriginOnly = {
  "access-control-allow-origin": accessControlHeaders["access-control-allow-origin"]
};
