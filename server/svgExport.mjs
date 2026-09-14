// v1/schemes/model/svg 适配层：读磁盘模型 + 库配置 → 调 src/export/svg.ts（Node 原生 TS）→ SVG 响应。
import { installDomShim } from "./domShim.mjs";

installDomShim();

import { readColorConfig, readDeviceLibraryConfig, readMeasurementConfig, readReferencedImageExportPathById, readSchemeProjectRecord, findSchemeProjectRecordByIndex } from "./server.mjs";

const { buildSvgDocument, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, backgroundPageCanvasTransform } = await import("../src/export/svg.ts");
// 库模板装配单源：内置库 + 自定义模板 + 元件定义覆盖（与前端 libraryTemplates 同一条实现）
const { buildEffectiveLibraryTemplates } = await import("../src/export/device-definition-shared.ts");
// 「被引用图片 id」判据单源：与前端导出同一纯函数（Task 19）
const { collectSvgExportReferencedImageHrefById } = await import("../src/export/svg-images.ts");
// 背景页图层过滤/归一化单源：与前端 createAppHookCallback142 调的是同两个纯函数
const { normalizeProjectLayers, filterProjectByVisibleLayers } = await import("../src/model-routing.ts");

// 背景页引用解析失败只在 not-found 分支留痕一次（进程内去重，避免第三方轮询刷日志）。
// 不打日志时「引用键配错 / 数据根不可读 / 模型确已删除」三者外部同形，排障无法区分。
const warnedBackgroundIdx = new Set();

// 画布尺寸惯用法：缺省宽高同源渲染器常量（不在本文件再写第二份默认字面量）
const canvasBoundsOf = (project) => ({
  width: Number(project?.canvasWidth ?? DEFAULT_CANVAS_WIDTH),
  height: Number(project?.canvasHeight ?? DEFAULT_CANVAS_HEIGHT)
});

// 背景页重建：宿主模型只落盘引用键（backgroundProjectIdx + backgroundLayerIds），
// 服务端读被引用模型 + 复用 src 侧纯函数复现前端 backgroundPageRender 载荷。
// 不用前端 id（backgroundProjectId）：磁盘 json 不含 id，服务端无 id→文件映射。
// 无背景页的统一返回（每次新建 Map，不共享同一实例给调用方）
const emptyBackgroundPageOption = () => ({ backgroundPage: undefined, referencedHrefById: new Map() });

async function buildBackgroundPageOption({ project, libraryTemplateByKind, paths }) {
  const backgroundIdx = Number(project?.backgroundProjectIdx);
  // 「引用键非法」与「自引用」都与前端 createAppHookCallback141 同口径：跳过背景页
  if (!Number.isSafeInteger(backgroundIdx) || backgroundIdx <= 0 || Number(project?.idx) === backgroundIdx) {
    return emptyBackgroundPageOption();
  }
  const record = await findSchemeProjectRecordByIndex({ index: backgroundIdx, paths });
  if (!record) {
    // 被引用模型已删除：不打断导出。spec §7.4 要求此处记一条 warning，
    // 否则「引用键配错 / 数据根不可读」与「模型确已删除」在排障时不可区分。
    if (!warnedBackgroundIdx.has(backgroundIdx)) {
      warnedBackgroundIdx.add(backgroundIdx);
      console.warn(`[svg-export] 背景页引用解析失败：backgroundProjectIdx=${backgroundIdx} 未匹配到任何模型，已跳过背景页（引用键配错/数据根不可读/模型已删除）。`);
    }
    return emptyBackgroundPageOption();
  }
  const backgroundProject = normalizeProjectLayers(record.project);
  const visibleLayerIds = new Set(
    Array.isArray(project.backgroundLayerIds) ? project.backgroundLayerIds.map(String) : []
  );
  const layers = (backgroundProject.layers ?? []).map((layer) => ({
    ...layer,
    visible: visibleLayerIds.has(String(layer.id))
  }));
  const { nodes, edges } = filterProjectByVisibleLayers(
    backgroundProject.nodes ?? [],
    backgroundProject.edges ?? [],
    layers
  );
  const backgroundBounds = canvasBoundsOf(backgroundProject);
  const referencedHrefById = collectSvgExportReferencedImageHrefById({
    nodes,
    canvasBackgroundImage: backgroundProject.canvasBackgroundImage,
    canvasBackgroundImageAssetId: backgroundProject.canvasBackgroundImageAssetId,
    canvasBackgroundImageUrl: backgroundProject.canvasBackgroundImageUrl,
    libraryTemplateByKind
  });
  return {
    referencedHrefById,
    backgroundPage: {
      project: backgroundProject,
      nodes,
      edges,
      backgroundBounds,
      transform: backgroundPageCanvasTransform(backgroundBounds, canvasBoundsOf(project)),
      backgroundColor: backgroundProject.canvasBackgroundColor ?? undefined,
      // 与前端 resolveProjectImage(project, imageAssets) 同口径：assetId 优先，回落落盘 href
      backgroundImageUrl:
        (backgroundProject.canvasBackgroundImageAssetId
          && referencedHrefById.get(String(backgroundProject.canvasBackgroundImageAssetId)))
        || backgroundProject.canvasBackgroundImage
        || ""
    }
  };
}

// paths：多空间路径集合（spaceStore.spacePathsFor）。缺省时各被调函数回落 defaultPaths，
// 保证「方案 ZIP 的 json 与 e/svg 同源」——调用方传了 paths，派生格式就必须读同一个根。
export async function renderSavedModelSvg({ parts, name, colorMode = "energy", paths }) {
  const record = await readSchemeProjectRecord({ schemePath: parts, name, paths });
  if (!record) {
    return { error: { code: "not-found", message: "模型不存在。" } };
  }
  const project = record.project ?? {};
  const [library, measurementConfig, colorConfig] = await Promise.all([
    readDeviceLibraryConfig({ paths }),
    readMeasurementConfig({ paths }),
    readColorConfig({ paths })
  ]);
  const deviceTemplates = buildEffectiveLibraryTemplates(
    library.customDeviceTemplates ?? [],
    library.deviceDefinitionOverrides ?? {}
  );
  // 自包含导出：被引用的后端图片读盘转 data URL 内联（缺一张不阻断，该图保留原始 href）
  const nodes = Array.isArray(project.nodes) ? project.nodes : [];
  // kind→模板 Map 只建一次，宿主与背景页两处图片收集共用
  const libraryTemplateByKind = new Map(deviceTemplates.map((template) => [template.kind, template]));
  // 先重建背景页，其被引用图片并入同一份 imageExportPathById，否则背景页图层里会残留后端 href
  const { backgroundPage, referencedHrefById: backgroundReferencedHrefById } = await buildBackgroundPageOption({
    project,
    libraryTemplateByKind,
    paths
  });
  const referencedHrefById = new Map([
    ...collectSvgExportReferencedImageHrefById({
      nodes,
      canvasBackgroundImage: project.canvasBackgroundImage,
      canvasBackgroundImageAssetId: project.canvasBackgroundImageAssetId,
      canvasBackgroundImageUrl: project.canvasBackgroundImageUrl,
      libraryTemplateByKind
    }),
    ...backgroundReferencedHrefById
  ]);
  const imageExportPathById = await readReferencedImageExportPathById(Array.from(referencedHrefById.keys()), { paths });
  const svg = buildSvgDocument(
    nodes,
    Array.isArray(project.edges) ? project.edges : [],
    {
      // 缺省宽高同源渲染器常量（不再写第二份默认字面量）
      ...canvasBoundsOf(project),
      backgroundPage,
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
