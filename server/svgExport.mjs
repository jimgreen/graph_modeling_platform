// v1/schemes/model/svg 适配层：读磁盘模型 + 库配置 → 调 src/export/svg.ts（Node 原生 TS）→ SVG 响应。
import { installDomShim } from "./domShim.mjs";

installDomShim();

import { readColorConfig, readDeviceLibraryConfig, readMeasurementConfig, readReferencedImageExportPathById, readSchemeProjectRecord } from "./server.mjs";

const { buildSvgDocument, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } = await import("../src/export/svg.ts");
// 库模板装配单源：内置库 + 自定义模板 + 元件定义覆盖（与前端 libraryTemplates 同一条实现）
const { buildEffectiveLibraryTemplates } = await import("../src/export/device-definition-shared.ts");
// 「被引用图片 id」判据单源：与前端导出同一纯函数（Task 19）
const { collectSvgExportReferencedImageHrefById } = await import("../src/export/svg-images.ts");

export async function renderSavedModelSvg({ parts, name, colorMode = "energy" }) {
  const record = await readSchemeProjectRecord({ schemePath: parts, name });
  if (!record) {
    return { error: { code: "not-found", message: "模型不存在。" } };
  }
  const project = record.project ?? {};
  const [library, measurementConfig, colorConfig] = await Promise.all([
    readDeviceLibraryConfig(),
    readMeasurementConfig(),
    readColorConfig()
  ]);
  const deviceTemplates = buildEffectiveLibraryTemplates(
    library.customDeviceTemplates ?? [],
    library.deviceDefinitionOverrides ?? {}
  );
  // 自包含导出：被引用的后端图片读盘转 data URL 内联（缺一张不阻断，该图保留原始 href）
  const nodes = Array.isArray(project.nodes) ? project.nodes : [];
  const referencedHrefById = collectSvgExportReferencedImageHrefById({
    nodes,
    canvasBackgroundImage: project.canvasBackgroundImage,
    canvasBackgroundImageAssetId: project.canvasBackgroundImageAssetId,
    canvasBackgroundImageUrl: project.canvasBackgroundImageUrl,
    libraryTemplateByKind: new Map(deviceTemplates.map((template) => [template.kind, template]))
  });
  const imageExportPathById = await readReferencedImageExportPathById(Array.from(referencedHrefById.keys()));
  const svg = buildSvgDocument(
    nodes,
    Array.isArray(project.edges) ? project.edges : [],
    {
      // 缺省宽高同源渲染器常量（不再写第二份默认字面量）
      width: Number(project.canvasWidth ?? DEFAULT_CANVAS_WIDTH),
      height: Number(project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT),
      // 缺省/空串不传：由渲染器回落自身默认 DEFAULT_CANVAS_BACKGROUND，避免后端再写一份默认字面量
      backgroundColor: project.canvasBackgroundColor || undefined,
      backgroundImage: project.canvasBackgroundImage ?? "",
      // energy 为端点旧契约缺省；voltage 供前端导出复用
      colorDisplayMode: colorMode,
      // 配色取自部署配色配置 color-config.json（前端本地导出同源）；文件缺失/为空时
      // buildSvgDocument 内的 normalizeColorPalette 合并默认调色板，输出与接线前一致
      colorPalette: colorConfig.colorPalette,
      // 覆盖字段真名 deviceDefinitionOverrides（readDeviceLibraryConfig 归一化后返回）
      deviceTemplates,
      layers: project.layers,
      activeLayerId: project.activeLayerId,
      measurements: project.measurements,
      measurementConfig,
      // 同一份 id→dataURL 映射两用：imageAssets 供 assetId 解析（节点/状态图元），imageExportPathById 供 href 替换。
      // 只读被引用的图片，不整库内联；代价是响应体随图片体积膨胀。
      imageExportPathById,
      imageAssets: imageExportPathById
    }
  );
  return { svg };
}
