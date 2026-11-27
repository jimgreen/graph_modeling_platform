import { encodeGbk } from "./encoding/gbk.ts";
import { buildCimPackage } from "./cim/cim-builder.ts";
import { serializeCimPackage } from "./cim/cim-serializer.ts";
import { buildEFileExport } from "./model-eexport.ts";
import { buildEFileExportOptionsFromLibrary } from "./export/e-file.ts";
import { buildSvgDocument } from "./export/svg.ts";
import { backendExportSchemePath } from "./backendExportPath.ts";
import { apiPath, BACKEND_ORIGIN, FRONTEND_EXPORT_MODE } from "./config.ts";

export type FrontendExportFormat = "cim" | "e" | "svg";

export type FrontendExportArtifact = {
  format: FrontendExportFormat;
  filename: string;
  mimeType: string;
  encoding: "gbk" | "utf-8";
  text: string;
  bytes: Uint8Array;
};

export type FrontendExportScope = Record<string, any> & {
  frontendExportMode?: string;
  frontendBackendOrigin?: string;
  frontendExportTimeoutMs?: number;
  currentProject?: () => Record<string, any>;
  projectName?: string;
  projectIdx?: number | string;
  activeProjectKey?: string;
  activeSchemeKey?: string;
  schemePathForScheme?: (key: string | undefined) => string[];
};

const FRONTEND_EXPORT_FORMATS: FrontendExportFormat[] = ["cim", "e", "svg"];
const FRONTEND_EXPORT_TIMEOUT_MS = 30_000;

function safeFilePart(value: unknown): string {
  return String(value ?? "").trim().replace(/[\\/:*?"<>|]+/gu, "_") || "未命名";
}

function cimFilename(projectName: string): string {
  return `${safeFilePart(projectName)}.xml`;
}

function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function withXmlEncodingDeclaration(text: string, encoding: "utf-8" | "gbk"): string {
  const label = encoding === "gbk" ? "GBK" : "UTF-8";
  const content = String(text).replace(/^\uFEFF?\s*<\?xml\s[^?]*\?>\s*/iu, "");
  return `<?xml version="1.0" encoding="${label}"?>\n${content}`;
}

function projectForExport(scope: FrontendExportScope, project?: Record<string, any>): Record<string, any> {
  const current = project ?? (typeof scope.currentProject === "function" ? scope.currentProject() : null) ?? {};
  return {
    ...current,
    name: String(current.name ?? scope.projectName ?? "未命名模型"),
    nodes: Array.isArray(current.nodes) ? current.nodes : (Array.isArray(scope.nodes) ? scope.nodes : []),
    edges: Array.isArray(current.edges) ? current.edges : (Array.isArray(scope.edges) ? scope.edges : [])
  };
}

function modelIdForExport(scope: FrontendExportScope, project: Record<string, any>): string {
  const raw = String(
    project.idx ??
    scope.projectIdx ??
    scope.activeProjectKey ??
    project.name ??
    "current"
  ).trim();
  return raw.replace(/[^A-Za-z0-9_.-]/gu, "_") || "current";
}

function imageExportPathByIdForScope(scope: FrontendExportScope): Record<string, string> {
  if (typeof scope.imageExportPathByIdFromAssets === "function") {
    return scope.imageExportPathByIdFromAssets(scope.imageAssetList ?? [], scope.imageAssets ?? {});
  }
  const storedAssets = scope.imageAssets ?? {};
  return Object.fromEntries(
    Object.entries(storedAssets).filter(([, value]) => typeof value === "string" && /^data:image\//iu.test(value))
  ) as Record<string, string>;
}

function eFileOptionsForScope(scope: FrontendExportScope) {
  return buildEFileExportOptionsFromLibrary({
    libraryTemplates: scope.libraryTemplates ?? [],
    labels: scope.PARAM_LABELS,
    eDeviceDefinitionLabels: scope.eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled: scope.eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder: scope.eDeviceDefinitionFieldOrder,
    eDeviceDefinitionTemplateFields: scope.eDeviceDefinitionTemplateFields,
    eDeviceDefinitionTableIds: scope.eDeviceDefinitionTableIds,
    resolveDefinitionComponentLibrary: scope.resolveTemplateComponentLibrary
  });
}

export function isFrontendExportMode(scope?: FrontendExportScope): boolean {
  return String(scope?.frontendExportMode ?? FRONTEND_EXPORT_MODE).trim().toLowerCase() === "frontend";
}

export function buildFrontendExportArtifacts(
  scope: FrontendExportScope,
  projectOverride?: Record<string, any>
): Record<FrontendExportFormat, FrontendExportArtifact> {
  const project = projectForExport(scope, projectOverride);
  const modelId = modelIdForExport(scope, project);
  const schemePath = backendExportSchemePath(scope);
  const measurementConfig = scope.runtimeMeasurementConfig ?? scope.measurementConfig ?? { measurementTypes: [] };
  const measurementTypes = Array.isArray(measurementConfig.measurementTypes)
    ? measurementConfig.measurementTypes
    : [];
  const safeName = typeof scope.safeFilePart === "function"
    ? scope.safeFilePart(project.name)
    : safeFilePart(project.name);

  const cimText = serializeCimPackage(buildCimPackage({
    nodes: project.nodes,
    edges: project.edges,
    projectName: project.name,
    modelId,
    measurementGroups: project.measurements?.groups,
    measurementTypes
  }));
  const eFile = buildEFileExport(project as any, schemePath, eFileOptionsForScope(scope));
  const svgText = withXmlEncodingDeclaration(
    buildSvgDocument(project.nodes, project.edges, {
      width: project.canvasWidth,
      height: project.canvasHeight,
      backgroundColor: project.canvasBackgroundColor || undefined,
      backgroundImage: project.canvasBackgroundImage ?? "",
      backgroundImageFit: project.canvasBackgroundImageFit,
      backgroundPage: scope.backgroundPageRender,
      colorDisplayMode: scope.colorDisplayMode ?? "energy",
      colorPalette: scope.colorPalette,
      deviceTemplates: scope.libraryTemplates ?? [],
      layers: project.layers,
      activeLayerId: project.activeLayerId,
      measurements: project.measurements,
      measurementConfig,
      deviceLabelsVisible: scope.deviceLabelsVisible,
      deviceMeasurementsVisible: scope.deviceMeasurementsVisible,
      themeMode: scope.themeMode === "dark" ? "dark" : undefined,
      imageExportPathById: imageExportPathByIdForScope(scope),
      imageAssets: scope.imageAssets ?? {},
      electricFlowVisible: project.electricFlowVisible,
      electricFlowSettings: project.electricFlowSettings
    } as any),
    "utf-8"
  );

  return {
    cim: {
      format: "cim",
      filename: cimFilename(project.name),
      mimeType: "application/xml",
      encoding: "utf-8",
      text: cimText,
      bytes: utf8Bytes(cimText)
    },
    e: {
      format: "e",
      filename: eFile.filename || `${safeName}.e`,
      mimeType: "text/plain",
      encoding: "gbk",
      text: eFile.text,
      bytes: encodeGbk(eFile.text)
    },
    svg: {
      format: "svg",
      filename: `${safeName}.svg`,
      mimeType: "image/svg+xml",
      encoding: "utf-8",
      text: svgText,
      bytes: utf8Bytes(svgText)
    }
  };
}

function currentFrontendOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const origin = String(window.location?.origin ?? "").trim();
  return origin && origin !== "null" ? origin.replace(/\/+$/u, "") : "";
}

function exportUrlForScope(scope: FrontendExportScope, format: FrontendExportFormat): string {
  const origin = (currentFrontendOrigin() || String(scope.frontendBackendOrigin ?? BACKEND_ORIGIN))
    .trim()
    .replace(/\/+$/u, "");
  if (!origin) {
    return "";
  }
  return `${origin}${apiPath(`/export/${format}`)}`;
}

function artifactField(format: FrontendExportFormat): string {
  return `${format}_file`;
}

export async function sendFrontendExportArtifact(
  scope: FrontendExportScope,
  format: FrontendExportFormat,
  projectOverride?: Record<string, any>,
  artifactOverride?: FrontendExportArtifact
): Promise<{ format: FrontendExportFormat; status: number; url: string }> {
  if (!isFrontendExportMode(scope)) {
    throw new Error("当前未启用前端导出模式。");
  }
  const url = exportUrlForScope(scope, format);
  if (!url) {
    throw new Error(`未配置前端模式后端地址：${format}`);
  }
  const project = projectForExport(scope, projectOverride);
  const artifact = artifactOverride ?? buildFrontendExportArtifacts(scope, project)[format];
  const form = new FormData();
  form.set("model_id", modelIdForExport(scope, project));
  form.set("model_name", project.name);
  form.set("scheme_path", JSON.stringify(backendExportSchemePath(scope)));
  form.set("format", format);
  form.set("sent_at", new Date().toISOString());
  form.set(
    artifactField(format),
    new Blob([artifact.bytes.slice().buffer as ArrayBuffer], { type: `${artifact.mimeType}; charset=${artifact.encoding}` }),
    artifact.filename
  );

  const timeoutMs = Number.isFinite(Number(scope.frontendExportTimeoutMs)) && Number(scope.frontendExportTimeoutMs) > 0
    ? Number(scope.frontendExportTimeoutMs)
    : FRONTEND_EXPORT_TIMEOUT_MS;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = setTimeout(() => controller?.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", body: form, ...(controller ? { signal: controller.signal } : {}) });
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new Error(`前端模式导出发送超时：${format}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(`前端模式导出发送失败：${format}（HTTP ${response.status}）`);
  }
  return { format, status: response.status, url };
}

export async function sendFrontendExportArtifacts(
  scope: FrontendExportScope,
  projectOverride?: Record<string, any>,
  formats: FrontendExportFormat[] = FRONTEND_EXPORT_FORMATS
): Promise<Array<{ format: FrontendExportFormat; status: number; url: string }>> {
  if (!isFrontendExportMode(scope)) {
    throw new Error("当前未启用前端导出模式。");
  }
  const project = projectForExport(scope, projectOverride);
  const artifacts = buildFrontendExportArtifacts(scope, project);
  const results = await Promise.allSettled(
    formats.map((format) => sendFrontendExportArtifact(scope, format, project, artifacts[format]))
  );
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason));
  if (failures.length > 0) {
    throw new Error(failures.join("；"));
  }
  return results.map((result) => (result as PromiseFulfilledResult<{ format: FrontendExportFormat; status: number; url: string }>).value);
}
