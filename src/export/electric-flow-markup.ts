// 电流方向箭头层：把「有方向的线路」渲染成一段 SVG 标记字符串。
//
// ## 为什么是字符串而不是 JSX
//
// 画布（React）与导出 SVG（`server/*.mjs` 以 Node 原生方式直载 `src/export/`）必须共用
// **同一份**动画标记 —— 两边各写一份，导出的 SVG 就会少一层流动效果。
// 故本模块一律字符串拼接，不含任何 JSX / React。
//
// ## 为什么不用 `<marker>`
//
// `marker-start` / `marker-mid` / `marker-end` 的端点语义是「箭头贴在路径端点上」，
// 表达不了「箭头沿路径流动」；要让箭头动起来只能靠 `animateMotion`，而那在导出 SVG 里
// 会被大部分静态渲染管线忽略。CSS motion path（`offset-path` + `offset-distance` 关键帧）
// 正好是纯 CSS，浏览器与导出管线都能吃下。
import type { ElectricFlowDirection } from "./electric-flow.ts";
import { ELECTRIC_FLOW_DEFAULTS, type ElectricFlowSettings } from "../model.ts";

/** 归一化外观设置：非法值（NaN/≤0 时长/非有限宽度/空色串）逐项回落默认。 */
export function normalizeElectricFlowSettings(settings?: ElectricFlowSettings | null): Required<ElectricFlowSettings> {
  const merged = { ...ELECTRIC_FLOW_DEFAULTS, ...(settings ?? {}) };
  const durationSeconds =
    typeof merged.durationSeconds === "number" && Number.isFinite(merged.durationSeconds) && merged.durationSeconds > 0
      ? merged.durationSeconds
      : ELECTRIC_FLOW_DEFAULTS.durationSeconds;
  const arrowFill = typeof merged.arrowFill === "string" && merged.arrowFill.trim() ? merged.arrowFill : ELECTRIC_FLOW_DEFAULTS.arrowFill;
  const arrowStroke =
    typeof merged.arrowStroke === "string" && merged.arrowStroke.trim() ? merged.arrowStroke : ELECTRIC_FLOW_DEFAULTS.arrowStroke;
  const arrowStrokeWidth =
    typeof merged.arrowStrokeWidth === "number" && Number.isFinite(merged.arrowStrokeWidth) && merged.arrowStrokeWidth >= 0
      ? merged.arrowStrokeWidth
      : ELECTRIC_FLOW_DEFAULTS.arrowStrokeWidth;
  return { durationSeconds, arrowFill, arrowStroke, arrowStrokeWidth };
}

/** 整层最外层 `<g>` 的 class。`pointer-events="none"`：箭头只做视觉，不吃画布事件。 */
export const ELECTRIC_FLOW_LAYER_CLASS = "electric-flow-layer";

/** 单个箭头图元 `<path>` 的 class。 */
export const ELECTRIC_FLOW_ARROW_CLASS = "electric-flow-arrow";

/** 单条有向边的 `<g>` class —— 外部样式要按边覆写时挂这一层。 */
export const ELECTRIC_FLOW_EDGE_CLASS = "electric-flow-edge";

const ELECTRIC_FLOW_FLOWING_CLASS = "electric-flow-flowing";

/**
 * 参考路径长度（SVG px）：`--electric-flow-duration` 是**这段长度**走完一个周期的时间，
 * 由此定义「基准流速 = ELECTRIC_FLOW_REFERENCE_PATH_LENGTH / durationSeconds（px/s）」。
 *
 * 各条线路的动画周期 = 路径实长 / 基准流速 —— 长线路周期等比放大、短线路等比缩小，
 * 所有线路上的箭头在屏幕上以**同一个像素速度**前进（offset-distance 是路径长度百分比，
 * 若所有边共用同一周期，长线路每周期扫过的像素更多，看起来就慢、箭头也被拉得更稀）。
 */
const ELECTRIC_FLOW_REFERENCE_PATH_LENGTH = 100;

/**
 * 三角箭头图元（`<path>` 的 `d`）。
 *
 * 顶点朝局部 **+x**（路径切线方向）。包围盒 x∈[-4,4]、y∈[-4,4] **关于原点对称** ——
 * motion path 的锚点语义（`offset-anchor: auto` 解析到元素中心）在各实现间细节不一，
 * 把几何中心钉在原点上，锚点取偏了也不会让箭头偏离路径。
 */
const ELECTRIC_FLOW_ARROW_PATH_D = "M 4 0 L -4 4 L -4 -4 Z";

/** 单边箭头数降到 1 的阈值：浏览器同时跑几百条 CSS motion path 会明显掉帧。 */
const ELECTRIC_FLOW_SINGLE_ARROW_THRESHOLD = 600;

/**
 * 与 `shared/xmlEscape.mjs` 的 `escapeXmlFull` 等价的本地实现。
 *
 * 刻意不跨模块 import：`svgUtils.ts` 那份是 `shared/` 的再导出，而 `src/export/` 的直载
 * 约束要求本模块自带最小闭包（只依赖 `../model*.ts`）。
 */
function escapeXml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 动画样式：CSS motion path 关键帧 + 箭头基础外观。
 *
 * 四项外观全部经 CSS 变量下发，取值来自 `settings`（缺省即内置默认）：
 * `--electric-flow-duration`（速度）、`--electric-flow-arrow-fill`（填充）、
 * `--electric-flow-arrow-stroke` / `-stroke-width`（白轮廓）。
 * 反向箭头不另写关键帧而是靠 `offset-rotate: auto 180deg` + `offset-distance` 反向走。
 */
export function buildElectricFlowStyleMarkup(settings?: ElectricFlowSettings | null): string {
  const s = normalizeElectricFlowSettings(settings);
  const duration = `${Number(s.durationSeconds)}s`;
  const strokeWidth = `${Number(s.arrowStrokeWidth)}px`;
  return `<style><![CDATA[
.${ELECTRIC_FLOW_LAYER_CLASS} {
  --electric-flow-duration: ${duration};
  --electric-flow-arrow-fill: ${s.arrowFill};
  --electric-flow-arrow-stroke: ${s.arrowStroke};
  --electric-flow-arrow-stroke-width: ${strokeWidth};
}
.${ELECTRIC_FLOW_ARROW_CLASS} {
  fill: var(--electric-flow-arrow-fill, ${s.arrowFill});
  /* 白色轮廓：线路上箭头密集交错时靠描边把相邻箭头区分开，视觉上不再糊成一团。
     paint-order: stroke 让描边垫在填充下面 —— 轮廓向外扩、不侵蚀箭头本体形状。 */
  stroke: var(--electric-flow-arrow-stroke, ${s.arrowStroke});
  stroke-width: var(--electric-flow-arrow-stroke-width, ${strokeWidth});
  paint-order: stroke;
  pointer-events: none;
}
@keyframes electric-flow-run-forward {
  from { offset-distance: 0%; }
  to { offset-distance: 100%; }
}
@keyframes electric-flow-run-reverse {
  from { offset-distance: 100%; }
  to { offset-distance: 0%; }
}
]]></style>`;
}

type ArrowSpec = { direction: "forward" | "reverse"; offsetFactor: number };

/**
 * 某条边应有的箭头序列。
 *
 * `both` 两个方向各一个；单向边则用**两个同向**箭头错开半个周期，
 * 形成"沿路径流过去"的连续感（一个箭头是"有向"，两个才是"流动"）。
 * `arrowCount === 1` 是 >600 条有向边时的性能降级，此时每边只剩一个箭头。
 *
 * `offsetFactor` 是错峰相位（周期占比）。
 */
function arrowSpecsFor(direction: ElectricFlowDirection, arrowCount: number): ArrowSpec[] {
  const specs: ArrowSpec[] = [];
  if (direction === "forward" || direction === "both") {
    specs.push({ direction: "forward", offsetFactor: 0 });
  }
  if (direction === "reverse" || direction === "both") {
    specs.push({ direction: "reverse", offsetFactor: 0 });
  }
  if (specs.length === 1 && arrowCount > 1) {
    specs.push({ direction: specs[0].direction, offsetFactor: 0.5 });
  }
  return specs;
}

/**
 * 从 path `d` 字符串估量路径总长度（SVG px）。
 *
 * 只处理绝对坐标的 M/L/Q 命令 —— 这正是本模块所有输入的两类来源：
 * `pointsToOrthogonalPath`（纯 L）与 `pathWithCrossingArcs`（L + 二次贝塞尔 Q 跨线弧）。
 * M 记为跳转点，不贡献长度；Q 用二次贝塞尔的几何近似（控制点与两端的中点）
 * 估长，误差在跨线弧（半径 7px）上远小于一个箭头间距，不影响视觉一致性。
 * 解析不了任何命令（空串/残缺）时返回 null，调用方回落到共用周期。
 */
export function estimateElectricFlowPathLength(pathD: string): number | null {
  const matches = pathD.matchAll(/([MLQ])\s*([^MLQZmlqz]*)/g);
  let length: number | null = null;
  let cursorX: number | null = null;
  let cursorY: number | null = null;
  for (const match of matches) {
    const command = match[1];
    const numbers = (match[2].match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) ?? []).map(Number);
    if (command === "Q") {
      if (numbers.length < 4) continue;
      const [controlX, controlY, endX, endY] = numbers;
      if (cursorX !== null && cursorY !== null) {
        // 二次贝塞尔弧长 ≈ (起点→终点) 与 (起点→控制点→终点) 两段折线的平均
        const chord = Math.hypot(endX - cursorX, endY - cursorY);
        const polyline = Math.hypot(controlX - cursorX, controlY - cursorY) + Math.hypot(endX - controlX, endY - controlY);
        const approx = (chord + polyline) / 2;
        length = (length ?? 0) + approx;
      }
      cursorX = endX;
      cursorY = endY;
      continue;
    }
    if (numbers.length < 2) continue;
    const [x, y] = numbers;
    if (command === "L" && cursorX !== null && cursorY !== null) {
      length = (length ?? 0) + Math.hypot(x - cursorX, y - cursorY);
    }
    cursorX = x;
    cursorY = y;
  }
  return length !== null && Number.isFinite(length) && length > 0 ? length : null;
}

/** 箭头内联样式：`offset-path` + 方向 + 错峰延迟。 */
function arrowStyleAttribute(spec: ArrowSpec, pathD: string): string {
  // path 里的双引号必须转义成 &quot;：整个 style 属性本身就用双引号包着。
  const offsetPath = `path(&quot;${escapeXml(pathD)}&quot;)`;
  const offsetRotate = spec.direction === "forward" ? "auto" : "auto 180deg";
  const animationName = spec.direction === "forward" ? "electric-flow-run-forward" : "electric-flow-run-reverse";
  // 等流速：本条边的周期 = 路径实长 / 基准流速（参考长度走 --electric-flow-duration 的时间）。
  // 量不出长度（null/∞/≤0）时回落共用周期 —— 长度歧路比错误周期安全。
  const pathLength = estimateElectricFlowPathLength(pathD);
  const durationRatio = pathLength !== null ? (pathLength / ELECTRIC_FLOW_REFERENCE_PATH_LENGTH).toFixed(4) : null;
  const duration = durationRatio !== null
    ? `calc(var(--electric-flow-duration) * ${durationRatio})`
    : "var(--electric-flow-duration)";
  // 错峰是「本条边周期的固定比例」：必须跟着 per-edge 周期缩放，否则长边上的
  // 箭头会按参考周期错峰、彼此挤在一起（等流速的同时还要等间距）。
  const delay = spec.offsetFactor === 0
    ? "0s"
    : durationRatio !== null
      ? `calc(var(--electric-flow-duration) * ${durationRatio} * -${spec.offsetFactor})`
      : `calc(var(--electric-flow-duration) * -${spec.offsetFactor})`;
  return (
    ` style="offset-path: ${offsetPath}; offset-rotate: ${offsetRotate};` +
    ` animation-name: ${animationName}; animation-duration: ${duration};` +
    ` animation-timing-function: linear; animation-iteration-count: infinite; animation-delay: ${delay}"`
  );
}

/**
 * 渲染有向边箭头层。
 *
 * - 只处理 `forward` / `reverse` / `both`；`none` 与「无方向的边」直接跳过。
 * - 无可渲染内容时返回空串 `""`（调用方不必特判 `null`）。
 * - 每条有向边默认 2 个箭头错峰成流动感；`routedEdges.length > 600` 时降级为每边 1 个
 *   （大量 motion path 同时动画是实打实的掉帧来源）。
 * - **等流速**：每条边的动画周期按其路径实长等比缩放（周期 ∝ 长度），保证所有线路上的
 *   箭头像素速度一致 —— 不再出现「短线快、长线慢」的百分比动画错觉；量不出长度的边
 *   回落共用周期（`--electric-flow-duration`）。
 */
export function buildElectricFlowLayerMarkup(
  routedEdges: { edgeId: string; path: string }[],
  directions: Map<string, ElectricFlowDirection>
): string {
  const arrowCount = routedEdges.length > ELECTRIC_FLOW_SINGLE_ARROW_THRESHOLD ? 1 : 2;
  const chunks: string[] = [];

  for (const routed of routedEdges) {
    const direction = directions.get(routed.edgeId);
    if (direction !== "forward" && direction !== "reverse" && direction !== "both") continue;
    const pathD = String(routed.path ?? "").trim();
    if (!pathD) continue;

    const arrows = arrowSpecsFor(direction, arrowCount)
      .map(
        (spec) =>
          `<path class="${ELECTRIC_FLOW_ARROW_CLASS} ${ELECTRIC_FLOW_ARROW_CLASS}-${spec.direction}"` +
          ` d="${escapeXml(ELECTRIC_FLOW_ARROW_PATH_D)}"` +
          `${arrowStyleAttribute(spec, pathD)}/>`
      )
      .join("");

    chunks.push(
      `<g class="${ELECTRIC_FLOW_EDGE_CLASS} ${ELECTRIC_FLOW_FLOWING_CLASS} ${ELECTRIC_FLOW_LAYER_CLASS}-${direction}"` +
        ` data-edge-id="${escapeXml(routed.edgeId)}">${arrows}</g>`
    );
  }

  if (chunks.length === 0) return "";
  return `<g class="${ELECTRIC_FLOW_LAYER_CLASS}" pointer-events="none">${chunks.join("")}</g>`;
}