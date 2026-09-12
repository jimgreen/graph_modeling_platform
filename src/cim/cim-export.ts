// CIM/XML 导出入口：工厂函数装配进 __appScope（参照 createExportEFile 模式）

import type { Edge, ModelNode } from "../model";
import type { MeasurementGroup } from "../measurements";
import { buildCimPackage, collectMissingCriticalParams } from "./cim-builder.ts";
import { serializeCimPackage } from "./cim-serializer.ts";

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
  /** 空模型提示（真实 scope 传全局 message；测试传 mock） */
  showGlobalMessage?: (message: string) => void;
  /** 保存成功提示（真实 scope 传导出完成弹框；缺省时由 showGlobalMessage 兜底） */
  showStandaloneExportCompletion?: (title: string, message: string, details?: string[]) => void;
  /** 未保存拦截（与 E / SVG / JSON 导出同闸门：后端读的是磁盘模型，未保存即导出会拿到旧内容） */
  ensureSavedBeforeExport?: () => boolean;
  /** 缺参数警告对话框（§7.4 非阻断设计；未装配时默认继续导出） */
  showGlobalConfirm?: (text: string) => Promise<boolean>;
  /** 方案路径（后端 schemePath 参数；空/缺省时默认 ["默认方案"]） */
  schemePath?: string[];
  /** 路径前缀函数（真实 scope 装配 apiPath；测试注入恒等函数） */
  apiPath?: (path: string) => string;
  /** 后端错误消息提取（真实 scope 装配 backendErrorMessage） */
  backendErrorMessage?: (res: Response, fallback: string) => Promise<string>;
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

// 文件名不含时间戳、也不带 _CIM16 后缀（2026-09-13 去后缀，与 E / SVG / JSON 同风格），
// 便于与接口产物按名对拍；版本信息仍在文件内容的 CIM 命名空间里。
// 导出供 server/cimExport.mjs 的 Content-Disposition 复用 —— 前后端必须同规则，单源在此。
export function cimFilename(projectName: string, safeFilePart?: (name: string) => string): string {
  const safeName = safeFilePart ? safeFilePart(projectName) : projectName;
  const base = safeName.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";
  return `${base}.xml`;
}

/** 工厂：装配导出动作。菜单项与导出处理均走此函数。 */
export function createCimExport(scope: CimExportScope): () => Promise<boolean> {
  return async () => {
    const {
      nodes = [],
      projectName = "",
      activeModelId,
      activeProjectKey,
      safeFilePart,
      saveLazyTextFile,
      writeOperationLog
    } = scope;
    // 计时与 SVG/E/JSON 同口径：保存目标就绪（用户选完路径）才起算，不含选择器停留时间
    let exportStartedAt = performance.now();
    const markSaveTargetReady = () => {
      exportStartedAt = performance.now();
    };
    // 后端按磁盘模型生成：未保存时先拦（与 createExportEFile / SvgFile / JsonFile 同一闸门）
    if (typeof scope.ensureSavedBeforeExport === "function" && !scope.ensureSavedBeforeExport()) {
      return false;
    }
    const electricalNodes = nodes.filter((n) => !n.kind.startsWith("static-"));
    if (electricalNodes.length === 0) {
      scope.showGlobalMessage?.("当前模型无可导出的电力设备，未生成 CIM/XML 文件");
      return false;
    }
    // 导出前校验（§7.4）：关键参数缺失时警告确认（非阻断，确认后仍导出）
    const missing = collectMissingCriticalParams(electricalNodes);
    if (missing.length > 0) {
      const names = missing.slice(0, 3).map((m) => `"${m.name}"缺${m.missing.join("、")}`).join("；");
      const suffix = missing.length > 3 ? "等" : "";
      // 确认对话框自身失败时按「取消导出」处理：调用方 void doExport() 不等待，rejection 会逃逸成未处理拒绝
      let confirmed = true;
      if (scope.showGlobalConfirm) {
        try {
          confirmed = await scope.showGlobalConfirm(`${missing.length} 个设备缺少关键参数（${names}${suffix}），导出文件可能不完整，是否继续？`);
        } catch {
          confirmed = false;
        }
      }
      if (!confirmed) return false;
    }
    // CIM/XML 生成已移至后端 /v1/schemes/model/cim-xml（与 E 文件同一适配层模式）
    const schemePath = Array.isArray(scope.schemePath) && scope.schemePath.length > 0 ? scope.schemePath : ["默认方案"];
    const query = `schemePath=${encodeURIComponent(JSON.stringify(schemePath))}`
      + `&name=${encodeURIComponent(projectName)}`
      + (activeModelId || activeProjectKey ? `&modelId=${encodeURIComponent(String(activeModelId || activeProjectKey).replace(/[^A-Za-z0-9_.-]/g, "_"))}` : "");
    const path = `/v1/schemes/model/cim-xml?${query}`;
    const url = typeof scope.apiPath === "function" ? scope.apiPath(path) : path;
    let xml: string;
    try {
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) {
        const message = typeof scope.backendErrorMessage === "function"
          ? await scope.backendErrorMessage(response, "CIM/XML 导出失败。")
          : `CIM/XML 导出失败（HTTP ${response.status}）`;
        scope.showGlobalMessage?.(message);
        return false;
      }
      // 读体与请求同一 try：中途断流也走失败提示（调用方 void 不等待，不能留未处理 rejection）
      xml = await response.text();
    } catch {
      // 网络层失败（后端未启动、读体中断等）：必须在此吞掉并提示
      scope.showGlobalMessage?.("CIM/XML 导出失败（无法连接后端服务）。");
      return false;
    }
    const filename = cimFilename(projectName, safeFilePart);
    let saved = false;
    try {
      saved = typeof saveLazyTextFile === "function"
        ? await saveLazyTextFile({
            filename,
            loadText: () => xml,
            mime: "application/xml",
            description: "CIM/XML 模型文件",
            extensions: [".xml"],
            encoding: "utf-8",
            preferNativeDialog: true,
            onSaveTargetReady: markSaveTargetReady
          })
        : false;
    } catch {
      // 保存层 rejection（磁盘/权限/选择器中断）同样不能逃逸
      scope.showGlobalMessage?.("CIM/XML 导出失败（保存文件失败）。");
      return false;
    }
    if (saved) {
      writeOperationLog?.(`导出 CIM/XML：${filename}`);
      // 保存成功提示：与 SVG / E / JSON 同格式同渠道（弹框优先，缺省回落全局 message）。
      // 编码固定 UTF-8（CIM/XML 不走 GBK 分支，见上面的 saveLazyTextFile 选项）。
      const elapsedSeconds = ((performance.now() - exportStartedAt) / 1000).toFixed(2);
      const successMessage = `CIM/XML 文件导出成功：${filename}；字符编码：UTF-8；总耗时：${elapsedSeconds} 秒`;
      if (typeof scope.showStandaloneExportCompletion === "function") {
        scope.showStandaloneExportCompletion("CIM/XML 文件导出完成", successMessage);
      } else {
        scope.showGlobalMessage?.(successMessage);
      }
    }
    return saved;
  };
}
