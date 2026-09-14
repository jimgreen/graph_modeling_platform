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
