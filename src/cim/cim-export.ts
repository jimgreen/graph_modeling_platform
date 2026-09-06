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
  /** 空模型提示（真实 scope 传全局 message；测试传 mock） */
  showGlobalMessage?: (message: string) => void;
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

function cimFilename(projectName: string, safeFilePart?: (name: string) => string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const safeName = safeFilePart ? safeFilePart(projectName) : projectName;
  const base = safeName.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";
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
      safeFilePart,
      saveLazyTextFile,
      writeOperationLog,
      projectMeasurements,
      measurementTypes
    } = scope;
    const electricalNodes = nodes.filter((n) => !n.kind.startsWith("static-"));
    if (electricalNodes.length === 0) {
      scope.showGlobalMessage?.("当前模型无可导出的电力设备，未生成 CIM/XML 文件");
      return false;
    }
    const rawModelId = [activeModelId, activeProjectKey].find((v) => typeof v === "string" && v.trim()) ?? "current";
    const modelId = rawModelId.replace(/[^A-Za-z0-9_.-]/g, "_"); // 卫生化为 NCName 安全字符
    const xml = buildCimXml(nodes, edges, projectName, modelId, projectMeasurements?.groups, measurementTypes);
    const filename = cimFilename(projectName, safeFilePart);
    const saved = typeof saveLazyTextFile === "function"
      ? await saveLazyTextFile({
          filename,
          loadText: () => xml,
          mime: "application/xml",
          description: "CIM/XML 模型文件",
          extensions: [".xml"],
          encoding: "utf-8",
          preferNativeDialog: true
        })
      : false;
    if (saved) {
      writeOperationLog?.(`导出 CIM/XML：${filename}`);
    }
    return saved;
  };
}
