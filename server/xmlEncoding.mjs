// 导出/发送端点的文本编码与 XML 声明单源：
// /v1/schemes/model/e-file、/svg、/cim-xml、/send 共用，保证响应体与前端落盘文件逐字节一致。
import iconv from "iconv-lite";

// 文本 → 目标编码字节：gbk 走 iconv，其余按 UTF-8。
//
// GBK 无法映射的码位（emoji、U+20000 扩展区生僻字、数学/化学符号区字符）
// iconv 会**静默写成 '?'**（0x3F）而不报错：content-length 正确、XML 声明照样写
// GBK、接收方忠实解码成 '?'，内容已不可逆地损坏且全程无任何信号。导出的是
// 交付给 CIM/E 文件工具的模型名与参数值，这类字符并不罕见。
//
// 这里不改字节输出（逐字节一致性是硬契约），只在检测到丢失时告警并指出是哪些字符 ——
// 把静默损坏变成可观测，避免「导出成功 → 下游发现字段全变问号」时无从追溯。
export function encodeTextBytes(text, encoding) {
  const value = String(text ?? "");
  if (encoding !== "gbk") {
    return Buffer.from(value, "utf-8");
  }
  const bytes = iconv.encode(value, "gbk");
  if (iconv.decode(bytes, "gbk") !== value) {
    // 只有确认有丢失才逐字符定位，正常文本只多一次 decode
    const unmappable = [...value].filter((char) => iconv.decode(iconv.encode(char, "gbk"), "gbk") !== char);
    const shown = unmappable.slice(0, 10).map((char) => `${char}(U+${char.codePointAt(0).toString(16).toUpperCase()})`);
    console.warn(
      `[编码] GBK 不可映射字符已写成 '?'，共 ${unmappable.length} 个：${shown.join("、")}${unmappable.length > shown.length ? " …" : ""}`
    );
  }
  return bytes;
}

// XML 声明由后端产出：保证响应体与前端落盘文件逐字节一致（前端不再自行前置声明）。
// 已有声明（含 BOM/前导空白）先剥离，避免出现两个声明。
export function withXmlEncodingDeclaration(text, encoding) {
  const label = encoding === "gbk" ? "GBK" : "UTF-8";
  // `xml` 后必须跟空白：`\b` 在 `l` 与 `-` 之间同样成立，会把文档开头的
  // `<?xml-stylesheet …?>` 处理指令当成声明整段吃掉（样式表 PI 丢失）。
  const content = String(text ?? "").replace(/^﻿?\s*<\?xml\s[^?]*\?>\s*/iu, "");
  return `<?xml version="1.0" encoding="${label}"?>\n${content}`;
}
