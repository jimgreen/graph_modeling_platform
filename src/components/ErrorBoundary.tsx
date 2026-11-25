import { Component, type ErrorInfo, type ReactNode } from "react";

export type ErrorBoundaryProps = {
  /** 隔离区域名称，用于在错误回退界面提示发生异常的模块 */
  areaName?: string;
  /** 发生异常后点击「重试恢复」时的附加回调 */
  onReset?: () => void;
  /** 紧急抢救导出回调：返回需要下载的 JSON 文本（可选，用于保护未保存模型数据） */
  getRecoverySnapshotJson?: () => string | null;
  /** 紧急抢救导出文件名 */
  recoveryFileName?: string;
  /** 可选外部重置键：值变化时自动清除已捕获错误状态 */
  resetKey?: string | number;
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
  recoveryHint: string;
};

/**
 * 分级 React 错误边界组件。
 *
 * 用于隔离应用根部、画布区域等关键模块的运行时渲染异常，避免单个脏图元或异常属性
 * 导致整页白屏并丢失未保存建模数据。支持局部重试恢复与内存工程 JSON 紧急导出。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
    recoveryHint: ""
  };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    const message = error instanceof Error ? error.message : String(error ?? "未知渲染异常");
    return {
      hasError: true,
      errorMessage: message || "未知渲染异常",
      recoveryHint: ""
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const area = this.props.areaName || "界面区域";
    console.error(`[ErrorBoundary:${area}] 捕获渲染异常:`, error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.hasError &&
      this.props.resetKey !== undefined &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false, errorMessage: "", recoveryHint: "" });
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: "", recoveryHint: "" });
    this.props.onReset?.();
  };

  private handleDownloadRecovery = (): void => {
    const getter = this.props.getRecoverySnapshotJson;
    if (!getter) return;
    try {
      const jsonText = getter();
      if (!jsonText) {
        this.setState({ recoveryHint: "当前无可导出的模型数据。" });
        return;
      }
      const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = this.props.recoveryFileName || `recovery-model-${Date.now()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      this.setState({ recoveryHint: "已导出当前内存工程 JSON。" });
    } catch (exportError) {
      const reason = exportError instanceof Error ? exportError.message : String(exportError);
      this.setState({ recoveryHint: `导出失败：${reason}` });
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const area = this.props.areaName || "当前区域";
    const canRecoverJson = typeof this.props.getRecoverySnapshotJson === "function";

    return (
      <div
        role="alert"
        className="gmp-error-boundary-fallback"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          width: "100%",
          height: "100%",
          minHeight: 180,
          padding: 20,
          boxSizing: "border-box",
          background: "var(--canvas-bg, #0f172a)",
          color: "var(--text-primary, #e2e8f0)",
          border: "1px solid rgba(248, 113, 113, 0.35)",
          borderRadius: 6
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f87171" }}>
          {area}渲染异常
        </div>
        <div
          style={{
            maxWidth: 560,
            fontSize: 12,
            lineHeight: 1.5,
            padding: "6px 10px",
            borderRadius: 4,
            background: "rgba(15, 23, 42, 0.55)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            wordBreak: "break-word",
            color: "#fca5a5"
          }}
        >
          {this.state.errorMessage}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              height: 28,
              padding: "0 12px",
              borderRadius: 4,
              border: "1px solid #38bdf8",
              background: "#0284c7",
              color: "#ffffff",
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            重试恢复
          </button>
          {canRecoverJson && (
            <button
              type="button"
              onClick={this.handleDownloadRecovery}
              style={{
                height: 28,
                padding: "0 12px",
                borderRadius: 4,
                border: "1px solid rgba(148, 163, 184, 0.45)",
                background: "transparent",
                color: "inherit",
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              导出内存工程 JSON
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              height: 28,
              padding: "0 12px",
              borderRadius: 4,
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: "transparent",
              color: "inherit",
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            刷新页面
          </button>
        </div>
        {this.state.recoveryHint && (
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{this.state.recoveryHint}</div>
        )}
      </div>
    );
  }
}
