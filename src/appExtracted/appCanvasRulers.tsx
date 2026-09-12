// @ts-nocheck
// 画布外围四边刻度尺：左上角 (0,0)，X 向右递增、Y 向下递增。
// 刻度口径与底图网格一致（大网格 25 单位 = 大刻度、细网格 5 单位 = 小刻度），只在大刻度标数值。
//
// 结构：一个零尺寸锚点容器放在「画布原点」处，四条尺子与四个角块相对它定位。
// 这样拖动/滚动时只要同步移动容器即可 —— 拖动过程画布是直接改 DOM 样式的
// （见 applyCanvasPanningVisualOffset），容器用同一个 left/top 一起挪才跟得上。
//
// 刻度线用 CSS 重复渐变画（整张画布有几百条细刻度，逐条渲染节点扛不住）；
// 数字只渲染可见范围内的，且缩放变小后按间隔抽稀，避免文字叠在一起。
import { useRef } from "react";
import {
  CANVAS_RULER_MAJOR_UNIT,
  CANVAS_RULER_MINOR_UNIT,
  CANVAS_RULER_SIZE,
  canvasRulerTicks
} from "../canvasViewport";

// 细刻度屏幕间距小于该值就不再画细刻度，缩小视图时避免糊成一片
const MIN_TICK_GAP = 4;
// 9px 等宽数字的近似字符宽度：用于贴边对齐判断与标注间距估算
const LABEL_CHAR_WIDTH = 6;
// 相邻标注间距小于该值就抽稀（隔若干个标一个），避免数字重叠
const MIN_LABEL_GAP = 34;

// 贴边的标签（如左上角的 0）若仍居中，半边会被尺子的 overflow 裁掉，
// 边界处改成左/上对齐或右/下对齐，保证整段数字都露出来。
// stride > 1 时只有每隔 stride 个刻度才标数字。
function RulerLabels({ values, scale, axis, length, stride = 1 }) {
  return values.map((value, index) => {
    if (stride > 1 && index % stride !== 0) {
      return null;
    }
    const position = value * scale;
    const half = (String(value).length * LABEL_CHAR_WIDTH) / 2;
    const center = axis === "x" ? "translateX(-50%)" : "translateY(-50%)";
    const alignStart = axis === "x" ? "translateX(0)" : "translateY(0)";
    const alignEnd = axis === "x" ? "translateX(-100%)" : "translateY(-100%)";
    const translate = position - half < 0 ? alignStart : position + half > length ? alignEnd : center;
    return (
      <span
        key={value}
        className="canvas-ruler-label"
        style={axis === "x" ? { left: position, transform: translate } : { top: position, transform: translate }}
      >
        {value}
      </span>
    );
  });
}

export function CanvasRulers({ scope }: { scope: Record<string, any> }) {
  const rulersRef = useRef(null);
  // 拖动时由 applyCanvasPanningVisualOffset 直接改这个容器的 left/top
  Object.assign(scope, { canvasRulersRef: rulersRef });

  const {
    canvasDisplayOffsetX,
    canvasDisplayOffsetY,
    canvasDisplayWidth,
    canvasDisplayHeight,
    canvasScrollScale,
    viewBox
  } = scope;

  const scaleX = canvasScrollScale?.x ?? 1;
  const scaleY = canvasScrollScale?.y ?? 1;
  const majorStepX = CANVAS_RULER_MAJOR_UNIT * scaleX;
  const minorStepX = CANVAS_RULER_MINOR_UNIT * scaleX;
  const majorStepY = CANVAS_RULER_MAJOR_UNIT * scaleY;
  const minorStepY = CANVAS_RULER_MINOR_UNIT * scaleY;
  // 间距太挤就隔若干个标一个，保证相邻标注之间留得下文字
  const strideFor = (step: number) => Math.max(1, Math.ceil(MIN_LABEL_GAP / Math.max(1, step)));

  // 只给可见范围内的刻度配数字，否则整张画布要渲染几百个标签
  const viewLeft = Number(viewBox?.x) || 0;
  const viewTop = Number(viewBox?.y) || 0;
  const viewRight = viewLeft + (Number(viewBox?.width) || 0);
  const viewBottom = viewTop + (Number(viewBox?.height) || 0);
  const xLabels = canvasRulerTicks(viewLeft, viewRight, CANVAS_RULER_MAJOR_UNIT);
  const yLabels = canvasRulerTicks(viewTop, viewBottom, CANVAS_RULER_MAJOR_UNIT);

  // 细刻度太密时退化成与粗刻度同间距（视觉上只剩大刻度）
  const rulerStyle = (step: number, minorStep: number) => ({
    "--ruler-major-step": `${step}px`,
    "--ruler-minor-step": `${minorStep < MIN_TICK_GAP ? step : minorStep}px`
  });

  return (
    <div
      className="canvas-rulers"
      ref={rulersRef}
      aria-hidden="true"
      style={{ left: canvasDisplayOffsetX, top: canvasDisplayOffsetY }}
    >
      {/* 四角补齐：两条尺子各自的端点之间会漏一块背景，拐角处看起来缺角 */}
      {[
        { key: "top-left", left: -CANVAS_RULER_SIZE, top: -CANVAS_RULER_SIZE },
        { key: "top-right", left: canvasDisplayWidth, top: -CANVAS_RULER_SIZE },
        { key: "bottom-left", left: -CANVAS_RULER_SIZE, top: canvasDisplayHeight },
        { key: "bottom-right", left: canvasDisplayWidth, top: canvasDisplayHeight }
      ].map((corner) => (
        <div
          key={corner.key}
          className="canvas-ruler-corner"
          style={{ left: corner.left, top: corner.top, width: CANVAS_RULER_SIZE, height: CANVAS_RULER_SIZE }}
        />
      ))}
      <div
        className="canvas-ruler canvas-ruler-top"
        style={{ left: 0, top: -CANVAS_RULER_SIZE, width: canvasDisplayWidth, height: CANVAS_RULER_SIZE, ...rulerStyle(majorStepX, minorStepX) }}
      >
        <RulerLabels values={xLabels} scale={scaleX} axis="x" length={canvasDisplayWidth} stride={strideFor(majorStepX)}/>
      </div>
      <div
        className="canvas-ruler canvas-ruler-bottom"
        style={{ left: 0, top: canvasDisplayHeight, width: canvasDisplayWidth, height: CANVAS_RULER_SIZE, ...rulerStyle(majorStepX, minorStepX) }}
      >
        <RulerLabels values={xLabels} scale={scaleX} axis="x" length={canvasDisplayWidth} stride={strideFor(majorStepX)}/>
      </div>
      <div
        className="canvas-ruler canvas-ruler-left"
        style={{ left: -CANVAS_RULER_SIZE, top: 0, width: CANVAS_RULER_SIZE, height: canvasDisplayHeight, ...rulerStyle(majorStepY, minorStepY) }}
      >
        <RulerLabels values={yLabels} scale={scaleY} axis="y" length={canvasDisplayHeight} stride={strideFor(majorStepY)}/>
      </div>
      <div
        className="canvas-ruler canvas-ruler-right"
        style={{ left: canvasDisplayWidth, top: 0, width: CANVAS_RULER_SIZE, height: canvasDisplayHeight, ...rulerStyle(majorStepY, minorStepY) }}
      >
        <RulerLabels values={yLabels} scale={scaleY} axis="y" length={canvasDisplayHeight} stride={strideFor(majorStepY)}/>
      </div>
    </div>
  );
}
