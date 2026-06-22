/**
 * 前端 canvas 截图模块
 *
 * 将当前画布 SVG 可视内容 rasterize 为 PNG base64，
 * 供 WS 客户端 fetchHandler 响应 runtime.screenshot resource。
 */

/** v1 成功信封 */
export interface ScreenshotOk {
  ok: true;
  data: {
    base64: string;
    width: number;
    height: number;
    mime: "image/png";
  };
}

/** v1 失败信封 */
export interface ScreenshotErr {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ScreenshotResult = ScreenshotOk | ScreenshotErr;

/** 截图参数 */
export interface ScreenshotParams {
  width?: number;
  height?: number;
}

/**
 * 核心 SVG 字符串 → PNG rasterize 函数。
 * 在浏览器环境中将自包含 SVG 字符串 → Blob → Image → 离屏 canvas → PNG base64。
 * canvas 不填底色，保持 PNG 透明背景。
 */
export async function rasterizeSvgString(
  svgString: string,
  width: number,
  height: number
): Promise<string> {
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG 图像加载失败。"));
      img.src = url;
    });
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法获取 canvas 2d 上下文。");
    ctx.scale(dpr, dpr);
    // 不填底色，保持 PNG 透明背景
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl.slice("data:image/png;base64,".length);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 兼容：从 SVGSVGElement rasterize。clone 后移除背景元素 + 显式宽高，再调 rasterizeSvgString。
 * 注意：实时 DOM 的 SVG 依赖外部 CSS class 样式，rasterize 后样式丢失。优先用 buildSvgDocument 生成自包含 SVG。
 */
export async function rasterizeSvg(
  svgEl: SVGSVGElement,
  width: number,
  height: number
): Promise<string> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-canvas-background]").forEach((el) => el.remove());
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  const svgString = new XMLSerializer().serializeToString(clone);
  return rasterizeSvgString(svgString, width, height);
}

/**
 * 校验 params 中的可选 width/height。
 * 若提供则须为正整数，否则返回 bad-request 错误。
 */
function validateParams(
  params: ScreenshotParams | undefined
): ScreenshotParams | ScreenshotErr {
  const { width, height } = params ?? {};
  if (width !== undefined && (!Number.isFinite(width) || width <= 0)) {
    return {
      ok: false,
      error: { code: "bad-request", message: "width 须为正数。" },
    };
  }
  if (height !== undefined && (!Number.isFinite(height) || height <= 0)) {
    return {
      ok: false,
      error: { code: "bad-request", message: "height 须为正数。" },
    };
  }
  return { width, height };
}

/**
 * 主函数：校验活动模型 → 生成自包含 SVG → rasterize → 信封。
 *
 * 优先用 buildSvgDocument 生成自包含 SVG（与「导出 SVG」一致，内联样式），
 * 避免实时 DOM 的 class 样式在 rasterize 时丢失导致渲染异常（黑底）。
 * backgroundColor 传 "transparent" 保持 PNG 透明背景。
 * 回退：svgRef.current 经 rasterizeSvg（clone + 移除背景元素）。
 *
 * @param appScope - __appScope 对象（Record<string, any>）
 * @param params   - 可选截图参数
 * @param rasterize - 可注入的 rasterize 实现（默认 rasterizeSvgString），便于单测
 */
export async function serializeScreenshot(
  appScope: Record<string, any>,
  params?: ScreenshotParams,
  rasterize: (
    svgString: string,
    width: number,
    height: number
  ) => Promise<string> = rasterizeSvgString
): Promise<ScreenshotResult> {
  try {
    // 1. 校验活动模型
    const activeProjectKey: string | undefined = appScope.activeProjectKey;
    if (!activeProjectKey) {
      return {
        ok: false,
        error: { code: "no-active-model", message: "当前无活动模型。" },
      };
    }

    // 2. 校验参数
    const validated = validateParams(params);
    if ("error" in validated) return validated;
    const { width: paramWidth, height: paramHeight } = validated;

    // 3. 确定分辨率：params 优先，否则取 canvasBounds
    const canvasBounds: { width: number; height: number } | undefined =
      appScope.canvasBounds;
    const width = paramWidth ?? canvasBounds?.width ?? 800;
    const height = paramHeight ?? canvasBounds?.height ?? 600;

    // 4. 生成自包含 SVG 字符串（优先 buildSvgDocument，回退 svgRef 序列化）
    const buildSvgDoc = appScope.buildSvgDocument;
    const nodes = appScope.nodes ?? [];
    const edges = appScope.edges ?? [];
    let svgString: string | null = null;
    if (typeof buildSvgDoc === "function") {
      // backgroundColor: transparent 保持 PNG 透明背景
      svgString = String(
        buildSvgDoc(nodes, edges, {
          width,
          height,
          backgroundColor: "transparent",
          backgroundImage: appScope.canvasBackgroundImageUrl,
          colorDisplayMode: appScope.colorDisplayMode,
          colorPalette: appScope.colorPalette,
          deviceTemplates: appScope.libraryTemplates,
          layers: appScope.layers,
          activeLayerId: appScope.activeLayerId,
          measurements: appScope.projectMeasurements,
          measurementConfig: appScope.measurementConfig
        })
      );
    } else {
      // 回退：svgRef clone 移除背景元素
      const svgRef: { current: SVGSVGElement | null } | undefined =
        appScope.svgRef;
      if (!svgRef || !svgRef.current) {
        return {
          ok: false,
          error: {
            code: "internal",
            message: "SVG DOM 不可用，无法截图。",
          },
        };
      }
      const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
      clone.querySelectorAll("[data-canvas-background]").forEach((el) => el.remove());
      clone.setAttribute("width", String(width));
      clone.setAttribute("height", String(height));
      if (!clone.getAttribute("xmlns")) {
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      svgString = new XMLSerializer().serializeToString(clone);
    }

    // 5. Rasterize
    let base64: string;
    try {
      base64 = await rasterize(svgString, width, height);
    } catch (rasterizeErr: unknown) {
      const message =
        rasterizeErr instanceof Error
          ? rasterizeErr.message
          : "画布截图失败。";
      return {
        ok: false,
        error: { code: "internal", message },
      };
    }

    return {
      ok: true,
      data: { base64, width, height, mime: "image/png" },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "截图过程发生未知错误。";
    return {
      ok: false,
      error: { code: "internal", message },
    };
  }
}

/**
 * 工厂：创建 runtime.screenshot resource 的 handler 函数。
 *
 * @param appScope - __appScope 对象
 * @returns (params?) => Promise<ScreenshotResult>
 */
export function createRuntimeScreenshotHandler(
  appScope: Record<string, any>
): (params?: ScreenshotParams) => Promise<ScreenshotResult> {
  return (params?: ScreenshotParams) => serializeScreenshot(appScope, params);
}
