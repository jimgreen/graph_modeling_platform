// 后端导出/发送端点共用的方案路径口径（单源）。
// 前端各导出入口（E/SVG/JSON/CIM/发送）必须走同一份推导，避免路径口径分叉；
// schemePath 的 query 编码规则见 appExtracted/appPersistenceLibraryExport 的 schemePathQueryParam。

export function backendExportSchemePath(scope: Record<string, any>): string[] {
  const { activeSchemeKey, schemePathForScheme } = scope;
  const schemePath = typeof schemePathForScheme === "function" ? schemePathForScheme(activeSchemeKey) : [];
  return Array.isArray(schemePath) && schemePath.length > 0 ? schemePath : ["默认方案"];
}
