// XML/HTML 属性与文本统一转义（全仓库唯一实现）。
// 审查来源：MCHECK-REPORT F 组 P2-3、E 组 P1-3、TS-REPORT T25b ——
// 各处分散的 escapeXml 均缺少单引号转义，本实现补齐全部五个 XML 实体。

/**
 * 转义 XML/HTML 五个保留字符。
 * 属性无论用单引号还是双引号包裹均安全。
 */
export function escapeXmlFull(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
