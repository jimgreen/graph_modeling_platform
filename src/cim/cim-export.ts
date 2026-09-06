// CIM/XML 导出入口：工厂函数装配进 __appScope（参照 createExportEFile 模式）

import type { Edge, ModelNode } from "../model";
import type { MeasurementGroup, ProjectMeasurementConfig } from "../measurements";
import { buildCimPackage } from "./cim-builder";
import { serializeCimPackage } from "./cim-serializer";

export type CimExportScope = {
  nodes?: readonly ModelNode[];
  edges?: readonly Edge[];
  projectName?: string;
  /** 测试/外部调用传模型 ID；真实 scope 用 activeProjectKey */
  activeModelId?: string;
  activeProjectKey?: string;
  safeFilePart?: (name: string) => string;
  saveLazyTextFile?: (options: {
    filename: string;
    loadText: () => string;
    mime: string;
    description: string;
    extensions: string[];
    encoding?: "utf-8" | "gbk";
    preferNativeDialog?: boolean;
    onSaveTargetReady?: () => void;
  }) => Promise<boolean>;
  writeOperationLog?: (message: string) => void;
  /** 模型量测配置（阶段 5 量测导出数据源，取 groups） */
  projectMeasurements?: ProjectMeasurementConfig;
  /** 平台量测类型定义（阶段 5 Analog/Discrete 判定真源） */
  measurementTypes?: readonly { id: string; valueType?: string }[];
};

/** 纯函数：model state → XML 文本（供测试与外部复用） */
export function buildCimXml(
  nodes: readonly ModelNode[],
  edges: readonly Edge[],
  projectName: string,
  modelId: string,
  measurementGroups?: readonly MeasurementGroup[],
  measurementTypes?: readonly { id: string; valueType?: string }[]
): string {
  const pkg = buildCimPackage({ nodes, edges, projectName, modelId, measurementGroups, measurementTypes });
  return serializeCimPackage(pkg);
}

function cimFilename(projectName: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const base = projectName.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";
  return `${base}_${stamp}_CIM16.xml`;
}

/** 工厂：装配导出动作。菜单项与导出处理均走此函数。 */
export function createCimExport(scope: CimExportScope): () => Promise<boolean> {
  return async () => {
    const {
      nodes = [],
      edges = [],
      projectName = "",
      activeModelId,
      activeProjectKey,
      saveLazyTextFile,
      writeOperationLog,
      projectMeasurements,
      measurementTypes
    } = scope;
    const electricalNodes = nodes.filter((n) => !n.kind.startsWith("static-"));
    if (electricalNodes.length === 0) {
      return false;
    }
    const modelId = activeModelId ?? activeProjectKey ?? "current";
    const xml = buildCimXml(nodes, edges, projectName, modelId, projectMeasurements?.groups, measurementTypes);
    const saved = typeof saveLazyTextFile === "function"
      ? await saveLazyTextFile({
          filename: cimFilename(projectName),
          loadText: () => xml,
          mime: "application/xml",
          description: "CIM/XML 模型文件",
          extensions: [".xml"],
          encoding: "utf-8",
          preferNativeDialog: true
        })
      : false;
    writeOperationLog?.(`导出 CIM/XML：${projectName}`);
    return saved;
  };
}
