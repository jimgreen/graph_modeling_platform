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

/** 整层最外层 `<g>` 的 class。`pointer-events="none"`：箭头只做视觉，不吃画布事件。 */
export const ELECTRIC_FLOW_LAYER_CLASS = "electric-flow-layer";

/** 单个箭头图元 `<path>` 的 class。 */
export const ELECTRIC_FLOW_ARROW_CLASS = "electric-flow-arrow";

/** 单条有向边的 `<g>` class —— 外部样式要按边覆写时挂这一层。 */
export const ELECTRIC_FLOW_EDGE_CLASS = "electric-flow-edge";

const ELECTRIC_FLOW_FLOWING_CLASS = "electric-flow-flowing";

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
 * 速度走 CSS 变量 `--electric-flow-duration`（默认 `1.6s`），外部改一个变量即可整体调速；
 * 填充色同理走 `--electric-flow-arrow-fill`。
 *
 * 反向箭头不另写一份关键帧而是靠 `offset-rotate: auto 180deg` + `offset-distance` 反向走 ——
 * 路径只有一条，方向差异完全由内联样式承担，外部要覆写行为只需改这两个属性。
 */
export function buildElectricFlowStyleMarkup(): string {
  return `<style><![CDATA[
.${ELECTRIC_FLOW_LAYER_CLASS} {
  --electric-flow-duration: 1.6s;
}
.${ELECTRIC_FLOW_ARROW_CLASS} {
  fill: var(--electric-flow-arrow-fill, #38bdf8);
  stroke: none;
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

/** 箭头内联样式：`offset-path` + 方向 + 错峰延迟。 */
function arrowStyleAttribute(spec: ArrowSpec, pathD: string): string {
  // path 里的双引号必须转义成 &quot;：整个 style 属性本身就用双引号包着。
  const offsetPath = `path(&quot;${escapeXml(pathD)}&quot;)`;
  const offsetRotate = spec.direction === "forward" ? "auto" : "auto 180deg";
  const animationName = spec.direction === "forward" ? "electric-flow-run-forward" : "electric-flow-run-reverse";
  // 错峰用 calc 表达「半个周期」：延迟跟着 --electric-flow-duration 走，改速度不必改延迟。
  const delay = spec.offsetFactor === 0 ? "0s" : `calc(var(--electric-flow-duration) * -${spec.offsetFactor})`;
  return (
    ` style="offset-path: ${offsetPath}; offset-rotate: ${offsetRotate};` +
    ` animation-name: ${animationName}; animation-duration: var(--electric-flow-duration);` +
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