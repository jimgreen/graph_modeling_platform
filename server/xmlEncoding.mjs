// 导出/发送端点的文本编码与 XML 声明单源：
// /v1/schemes/model/e-file、/svg、/cim-xml、/send 共用，保证响应体与前端落盘文件逐字节一致。
import iconv from "iconv-lite";

// 文本 → 目标编码字节：gbk 走 iconv，其余按 UTF-8。
export function encodeTextBytes(text, encoding) {
  const value = String(text ?? "");
  return encoding === "gbk" ? iconv.encode(value, "gbk") : Buffer.from(value, "utf-8");
}

// XML 声明由后端产出：保证响应体与前端落盘文件逐字节一致（前端不再自行前置声明）。
// 已有声明（含 BOM/前导空白）先剥离，避免出现两个声明。
export function withXmlEncodingDeclaration(text, encoding) {
  const label = encoding === "gbk" ? "GBK" : "UTF-8";
  const content = String(text ?? "").replace(/^﻿?\s*<\?xml\b[^?]*\?>\s*/iu, "");
  return `<?xml version="1.0" encoding="${label}"?>\n${content}`;
}
