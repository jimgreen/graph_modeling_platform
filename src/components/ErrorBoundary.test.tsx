import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorBoundary } from "./ErrorBoundary";

describe("ErrorBoundary", () => {
  it("无异常时正常渲染子内容", () => {
    const html = renderToStaticMarkup(
      <ErrorBoundary areaName="建模画布">
        <div data-ok="true">normal-content</div>
      </ErrorBoundary>
    );
    expect(html).toContain("normal-content");
    expect(html).not.toContain("渲染异常");
  });

  it("getDerivedStateFromError 提取错误信息并进入错误回退态", () => {
    const nextState = ErrorBoundary.getDerivedStateFromError(new Error("畸形图元坐标 NaN"));
    expect(nextState.hasError).toBe(true);
    expect(nextState.errorMessage).toBe("畸形图元坐标 NaN");
  });

  it("处于错误态时展示区域名称、错误信息与恢复按钮（含紧急导出按钮）", () => {
    const boundary = new ErrorBoundary({
      areaName: "建模画布",
      getRecoverySnapshotJson: () => '{"nodes":[]}',
      children: null
    });
    boundary.state = {
      hasError: true,
      errorMessage: "SVG 路径异常",
      recoveryHint: ""
    };
    const html = renderToStaticMarkup(boundary.render() as any);
    expect(html).toContain("建模画布渲染异常");
    expect(html).toContain("SVG 路径异常");
    expect(html).toContain("重试恢复");
    expect(html).toContain("导出内存工程 JSON");
    expect(html).toContain("刷新页面");
  });

  it("未提供 getRecoverySnapshotJson 时不渲染导出按钮", () => {
    const boundary = new ErrorBoundary({
      areaName: "建模平台",
      children: null
    });
    boundary.state = {
      hasError: true,
      errorMessage: "boom",
      recoveryHint: ""
    };
    const html = renderToStaticMarkup(boundary.render() as any);
    expect(html).toContain("建模平台渲染异常");
    expect(html).not.toContain("导出内存工程 JSON");
  });

  it("componentDidCatch 记录区域错误日志且不二次抛错", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const boundary = new ErrorBoundary({ areaName: "建模画布", children: null });
      boundary.componentDidCatch(new Error("test-boom"), { componentStack: "\n at Canvas" });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0][0])).toContain("[ErrorBoundary:建模画布]");
    } finally {
      spy.mockRestore();
    }
  });
});
