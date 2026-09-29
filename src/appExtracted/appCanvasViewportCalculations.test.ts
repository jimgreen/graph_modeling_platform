// appCanvasViewportCalculations：视口/浮动工具栏/小地图的坐标与尺寸计算。
// 五个工厂此前零测试，全靠 appView.test.tsx 的间接渲染覆盖 —— 而间接覆盖看不到
// 「缩放没乘上」「偏移符号反了」这类只在特定 viewport 状态下才显形的算错。
import { describe, expect, it } from "vitest";
import {
  createCanvasPointToSurfaceCss,
  createFloatingToolbarBounds,
  createFloatingToolbarWrapperStyle,
  createMapPointToMinimap,
  createRotateControlAvoidRectFromCanvas
} from "./appCanvasViewportCalculations";

// ─── createFloatingToolbarBounds ───────────────────────────

describe("appCanvasViewportCalculations / createFloatingToolbarBounds", () => {
  const bounds = createFloatingToolbarBounds({});

  it("由左上角 + 宽高推出四边", () => {
    expect(bounds({ x: 10, y: 20, width: 100, height: 40 })).toEqual({
      left: 10,
      right: 110,
      top: 20,
      bottom: 60
    });
  });

  it("负坐标下同样成立（画布可拖到负区）", () => {
    expect(bounds({ x: -50, y: -30, width: 10, height: 10 })).toEqual({
      left: -50,
      right: -40,
      top: -30,
      bottom: -20
    });
  });

  it("零尺寸产出退化的零宽高包围盒（不抛）", () => {
    expect(bounds({ x: 5, y: 5, width: 0, height: 0 })).toEqual({
      left: 5,
      right: 5,
      top: 5,
      bottom: 5
    });
  });

  it("scale 字段不参与边界计算（只影响样式里的间距/圆角）", () => {
    const plain = bounds({ x: 0, y: 0, width: 10, height: 10 });
    const scaled = bounds({ x: 0, y: 0, width: 10, height: 10, scale: 3 });
    expect(scaled).toEqual(plain);
  });
});

// ─── createCanvasPointToSurfaceCss ────────────────────────

describe("appCanvasViewportCalculations / createCanvasPointToSurfaceCss", () => {
  it("画布坐标按 scrollScale 缩放后加显示偏移", () => {
    const toCss = createCanvasPointToSurfaceCss({
      canvasDisplayOffsetX: 100,
      canvasDisplayOffsetY: 50,
      canvasScrollScale: { x: 2, y: 3 }
    });
    expect(toCss({ x: 10, y: 20 })).toEqual({ x: 120, y: 110 });
  });

  it("缩放为 1 时退化为「加偏移」", () => {
    const toCss = createCanvasPointToSurfaceCss({
      canvasDisplayOffsetX: 7,
      canvasDisplayOffsetY: -7,
      canvasScrollScale: { x: 1, y: 1 }
    });
    expect(toCss({ x: 0, y: 0 })).toEqual({ x: 7, y: -7 });
  });

  it("两轴缩放独立（x 与 y 可以不同）", () => {
    const toCss = createCanvasPointToSurfaceCss({
      canvasDisplayOffsetX: 0,
      canvasDisplayOffsetY: 0,
      canvasScrollScale: { x: 0.5, y: 4 }
    });
    expect(toCss({ x: 100, y: 100 })).toEqual({ x: 50, y: 400 });
  });

  it("负缩放（镜像）保留符号，不取绝对值", () => {
    // 画布支持水平翻转，坐标必须跟着翻而不是折回正向。
    // 两条都要：x 与 y 是各自独立的，取绝对值只改其中一轴时单测仍会绿
    // （变异验证实测：只对 y 套 Math.abs 时，这条只测 y=-10 才会红）。
    const flipX = createCanvasPointToSurfaceCss({
      canvasDisplayOffsetX: 0,
      canvasDisplayOffsetY: 0,
      canvasScrollScale: { x: -1, y: 1 }
    });
    expect(flipX({ x: 10, y: 10 })).toEqual({ x: -10, y: 10 });
    expect(flipX({ x: 10, y: -10 })).toEqual({ x: -10, y: -10 });

    const flipY = createCanvasPointToSurfaceCss({
      canvasDisplayOffsetX: 0,
      canvasDisplayOffsetY: 0,
      canvasScrollScale: { x: 1, y: -1 }
    });
    expect(flipY({ x: 10, y: 10 })).toEqual({ x: 10, y: -10 });
    expect(flipY({ x: -10, y: 10 })).toEqual({ x: -10, y: -10 });
  });

  it("原点在偏移处：画布坐标 (0,0) 映射到显示偏移本身", () => {
    const toCss = createCanvasPointToSurfaceCss({
      canvasDisplayOffsetX: -300,
      canvasDisplayOffsetY: 120,
      canvasScrollScale: { x: 1.5, y: 1.5 }
    });
    expect(toCss({ x: 0, y: 0 })).toEqual({ x: -300, y: 120 });
  });
});

// ─── createRotateControlAvoidRectFromCanvas ───────────────

describe("appCanvasViewportCalculations / createRotateControlAvoidRectFromCanvas", () => {
  // 真实实现是 rotateControlAvoidRectFromCanvasPoints（CanvasViewport 侧），
  // 这里断言的是**本工厂喂进去的那两个点** —— 上下各留 6/52 像素的旋转把手空间。
  it("喂给底层的是中心点上下两个点，间距固定 46", () => {
    const calls: Array<Array<{ x: number; y: number }>> = [];
    const factory = createRotateControlAvoidRectFromCanvas({
      rotateControlAvoidRectFromCanvasPoints: (points: Array<{ x: number; y: number }>) => {
        calls.push(points);
        return points;
      }
    });
    factory(100, 200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual([
      { x: 100, y: 148 },
      { x: 100, y: 194 }
    ]);
  });

  it("只跟 centerX 走：x 恒等于传入值", () => {
    const calls: Array<Array<{ x: number; y: number }>> = [];
    const factory = createRotateControlAvoidRectFromCanvas({
      rotateControlAvoidRectFromCanvasPoints: (points: Array<{ x: number; y: number }>) => {
        calls.push(points);
        return points;
      }
    });
    factory(-40, 0);
    expect(calls[0]!.every((p) => p.x === -40)).toBe(true);
  });

  it("底层实现与工厂解耦：直接把底层结果透传出去", () => {
    const marker = { marker: true } as never;
    const factory = createRotateControlAvoidRectFromCanvas({
      rotateControlAvoidRectFromCanvasPoints: () => marker
    });
    expect(factory(0, 0)).toBe(marker);
  });
});

// ─── createFloatingToolbarWrapperStyle ────────────────────

describe("appCanvasViewportCalculations / createFloatingToolbarWrapperStyle", () => {
  const style = createFloatingToolbarWrapperStyle({
    floatingToolbarButtonSize: 28,
    floatingToolbarScreenScale: 1
  });

  it("位置尺寸原样转成 px 字符串", () => {
    const s = style({ x: 10, y: 20, width: 100, height: 40 });
    expect(s.left).toBe("10px");
    expect(s.top).toBe("20px");
    expect(s.width).toBe("100px");
    expect(s.height).toBe("40px");
  });

  it("按钮尺寸取自 scope，不随工具栏 scale 变", () => {
    expect(style({ x: 0, y: 0, width: 1, height: 1 })["--canvas-floating-toolbar-button-size"]).toBe("28px");
    expect(style({ x: 0, y: 0, width: 1, height: 1, scale: 4 })["--canvas-floating-toolbar-button-size"]).toBe("28px");
  });

  it("scale 缺省为 1：间距/内边距/圆角都是 4/4/8", () => {
    const s = style({ x: 0, y: 0, width: 1, height: 1 });
    expect(s["--canvas-floating-toolbar-gap"]).toBe("4px");
    expect(s["--canvas-floating-toolbar-padding"]).toBe("4px");
    expect(s["--canvas-floating-toolbar-radius"]).toBe("8px");
  });

  it("scale 放大时三者等比放大", () => {
    const s = style({ x: 0, y: 0, width: 1, height: 1, scale: 2 });
    expect(s["--canvas-floating-toolbar-gap"]).toBe("8px");
    expect(s["--canvas-floating-toolbar-padding"]).toBe("8px");
    expect(s["--canvas-floating-toolbar-radius"]).toBe("16px");
  });

  it("有下限：scale 再小也不会塌到 0", () => {
    // Math.max(2/3/6, …) —— 极小缩放下工具栏仍可点
    const s = style({ x: 0, y: 0, width: 1, height: 1, scale: 0.1 });
    expect(s["--canvas-floating-toolbar-gap"]).toBe("2px");
    expect(s["--canvas-floating-toolbar-padding"]).toBe("3px");
    expect(s["--canvas-floating-toolbar-radius"]).toBe("6px");
  });

  it("小数 scale 四舍五入取整（不是截断）", () => {
    // 三个值都要，因为 4x/4x/8x 的取整结果各不相同：
    //   4*1.4 = 5.6 ⇒ round 6 / trunc 5
    //   8*1.4 = 11.2 ⇒ round 11 / trunc 11  ← 两者相同，测不出差别
    //   8*1.5 = 12.0 ⇒ round 12 / trunc 12  ← 两者相同
    //   8*1.9 = 15.2 ⇒ round 15 / trunc 15  ← 两者相同
    // 换 1.6：8*1.6 = 12.8 ⇒ round 13 / trunc 12
    const s = style({ x: 0, y: 0, width: 1, height: 1, scale: 1.4 });
    expect(s["--canvas-floating-toolbar-gap"]).toBe("6px");
    expect(s["--canvas-floating-toolbar-padding"]).toBe("6px");

    const s2 = style({ x: 0, y: 0, width: 1, height: 1, scale: 1.6 });
    expect(s2["--canvas-floating-toolbar-radius"]).toBe("13px");
    expect(s2["--canvas-floating-toolbar-gap"]).toBe("6px");

    const s3 = style({ x: 0, y: 0, width: 1, height: 1, scale: 1.7 });
    // 4*1.7 = 6.8 ⇒ round 7 / trunc 6
    expect(s3["--canvas-floating-toolbar-gap"]).toBe("7px");
    // 8*1.7 = 13.6 ⇒ round 14 / trunc 13
    expect(s3["--canvas-floating-toolbar-radius"]).toBe("14px");
  });
});

// ─── createMapPointToMinimap ──────────────────────────────

describe("appCanvasViewportCalculations / createMapPointToMinimap", () => {
  it("画布坐标按单一 minimapScale 缩放后加小地图偏移", () => {
    const toMini = createMapPointToMinimap({ minimapOffsetX: 4, minimapOffsetY: 6, minimapScale: 0.5 });
    expect(toMini({ x: 100, y: 200 })).toEqual({ x: 54, y: 106 });
  });

  it("与 canvasPointToSurfaceCss 的差别：这里是单一标量缩放，不是两轴独立", () => {
    // 同一组 scope 值下，小地图用标量、画布用 {x,y} —— 混用会把 x 缩放漏掉
    const toMini = createMapPointToMinimap({ minimapOffsetX: 0, minimapOffsetY: 0, minimapScale: 0.5 });
    expect(toMini({ x: 3, y: 3 })).toEqual({ x: 1.5, y: 1.5 });
  });

  it("偏移为 0 且 scale 为 1 时是恒等映射", () => {
    const toMini = createMapPointToMinimap({ minimapOffsetX: 0, minimapOffsetY: 0, minimapScale: 1 });
    expect(toMini({ x: 7, y: -9 })).toEqual({ x: 7, y: -9 });
  });

  it("负偏移（小地图贴边）正确处理", () => {
    const toMini = createMapPointToMinimap({ minimapOffsetX: -20, minimapOffsetY: -5, minimapScale: 1 });
    expect(toMini({ x: 0, y: 0 })).toEqual({ x: -20, y: -5 });
  });
});
