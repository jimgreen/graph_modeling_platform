// @ts-nocheck
// 画布外围四边刻度尺：左上角 (0,0)，X 向右递增、Y 向下递增。
// 刻度口径与底图网格一致（大网格 25 单位 = 大刻度、细网格 5 单位 = 小刻度），只在大刻度标数值。
// 尺子贴着画布边线外侧，跟着画布滚动/缩放一起走：位置由画布显示偏移与尺寸决定，
// 刻度间距 = 单位 × 缩放；刻度线用 CSS 重复渐变画，避免为整张画布生成上千个节点。
import {
  CANVAS_RULER_MAJOR_UNIT,
  CANVAS_RULER_MINOR_UNIT,
  CANVAS_RULER_SIZE,
  canvasRulerTicks
} from "../canvasViewport";

// 相邻细刻度屏幕间距小于该值时不再画细刻度，缩小视图时避免糊成一片
const MIN_TICK_GAP = 4;

function RulerLabels({ values, scale, axis }: { values: number[]; scale: number; axis: "x" | "y" }) {
  return values.map((value) => (
    <span
      key={value}
      className="canvas-ruler-label"
      style={axis === "x" ? { left: value * scale } : { top: value * scale }}
    >
      {value}
    </span>
  ));
}

export function CanvasRulers({ scope }: { scope: Record<string, any> }) {
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
    <div className="canvas-rulers" aria-hidden="true">
      {/* 四角补齐：两条尺子各自的端点之间会漏一块背景，拐角处看起来缺角 */}
      {[
        { key: "top-left", left: canvasDisplayOffsetX - CANVAS_RULER_SIZE, top: canvasDisplayOffsetY - CANVAS_RULER_SIZE },
        { key: "top-right", left: canvasDisplayOffsetX + canvasDisplayWidth, top: canvasDisplayOffsetY - CANVAS_RULER_SIZE },
        { key: "bottom-left", left: canvasDisplayOffsetX - CANVAS_RULER_SIZE, top: canvasDisplayOffsetY + canvasDisplayHeight },
        { key: "bottom-right", left: canvasDisplayOffsetX + canvasDisplayWidth, top: canvasDisplayOffsetY + canvasDisplayHeight }
      ].map((corner) => (
        <div
          key={corner.key}
          className="canvas-ruler-corner"
          style={{ left: corner.left, top: corner.top, width: CANVAS_RULER_SIZE, height: CANVAS_RULER_SIZE }}
        />
      ))}
      <div
        className="canvas-ruler canvas-ruler-top"
        style={{ left: canvasDisplayOffsetX, top: canvasDisplayOffsetY - CANVAS_RULER_SIZE, width: canvasDisplayWidth, height: CANVAS_RULER_SIZE, ...rulerStyle(majorStepX, minorStepX) }}
      >
        <RulerLabels values={xLabels} scale={scaleX} axis="x"/>
      </div>
      <div
        className="canvas-ruler canvas-ruler-bottom"
        style={{ left: canvasDisplayOffsetX, top: canvasDisplayOffsetY + canvasDisplayHeight, width: canvasDisplayWidth, height: CANVAS_RULER_SIZE, ...rulerStyle(majorStepX, minorStepX) }}
      >
        <RulerLabels values={xLabels} scale={scaleX} axis="x"/>
      </div>
      <div
        className="canvas-ruler canvas-ruler-left"
        style={{ left: canvasDisplayOffsetX - CANVAS_RULER_SIZE, top: canvasDisplayOffsetY, width: CANVAS_RULER_SIZE, height: canvasDisplayHeight, ...rulerStyle(majorStepY, minorStepY) }}
      >
        <RulerLabels values={yLabels} scale={scaleY} axis="y"/>
      </div>
      <div
        className="canvas-ruler canvas-ruler-right"
        style={{ left: canvasDisplayOffsetX + canvasDisplayWidth, top: canvasDisplayOffsetY, width: CANVAS_RULER_SIZE, height: canvasDisplayHeight, ...rulerStyle(majorStepY, minorStepY) }}
      >
        <RulerLabels values={yLabels} scale={scaleY} axis="y"/>
      </div>
    </div>
  );
}
