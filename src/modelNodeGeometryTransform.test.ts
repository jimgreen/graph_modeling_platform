// nodeGeometryTransform / backgroundPageCanvasTransform 的直接单测。
//
// 此前这两个函数在 `src/export/svg.ts` 里**零测试直呼**，而 `nodeGeometryTransform`
// 被生产代码调用 **29 处** —— 它决定每个设备/线路在画布上的旋转与缩放变换。
// 算错的后果是**全画布元素错位**，且渲染流程**不报错**。
//
// 本文件钉住实测行为，重点是三处「看起来像 bug、其实是既定契约」的地方。
import { describe, expect, test } from "vitest";
import { nodeGeometryTransform, backgroundPageCanvasTransform } from "./export/svg";
import { getNodeScaleX, getNodeScaleY } from "./model-canvas-ops";
import type { ModelNode } from "./model";

const node = (over: Partial<ModelNode> = {}): ModelNode =>
  ({
    id: "n1",
    kind: "ac-load",
    name: "L",
    nodeNumber: "1",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x: 0, y: 0 },
    size: { width: 10, height: 10 },
    rotation: 0,
    scale: 1,
    terminals: [],
    params: {},
    ...over
  }) as ModelNode;

describe("线路类 kind 恒返回恒等变换（不跟随 rotation / scale）", () => {
  // 线路的走向由路由点决定，几何上必须是恒等变换 —— 若跟随 scale/rotation，
  // 整条线的走线会跟着节点的缩放旋转一起变，拓扑走向就错了。
  const routableKinds = [
    "ac-routable-line",
    "ac-zero-routable-branch",
    "dc-routable-line",
    "dc-zero-routable-branch",
    "hydrogen-routable-pipeline",
    "heat-routable-line",
    "ac-routable-line-vertical"
  ];

  for (const kind of routableKinds) {
    test(`${kind}：即使 rotation=45 / scale=2 也恒等`, () => {
      const out = nodeGeometryTransform(node({ kind: kind as never, rotation: 45, scale: 2, scaleX: 3 }));
      expect(out).toBe("rotate(0) scale(1 1)");
    });
  }

  test("判定走 baseDeviceKind（带 -vertical 后缀的线路同样命中）", () => {
    expect(nodeGeometryTransform(node({ kind: "ac-routable-line-vertical" as never }))).toBe("rotate(0) scale(1 1)");
    // 非线路 kind 不受影响
    expect(nodeGeometryTransform(node({ kind: "ac-load" }))).toBe("rotate(0) scale(1 1)");
  });
});

describe("普通设备的 rotation + scale 变换", () => {
  test("常规值：rotate(角度) scale(x y)", () => {
    expect(nodeGeometryTransform(node({ rotation: 90 }))).toBe("rotate(90) scale(1 1)");
    expect(nodeGeometryTransform(node({ scale: 2 }))).toBe("rotate(0) scale(2 2)");
    expect(nodeGeometryTransform(node({ scale: 2, scaleX: 3, scaleY: 4 }))).toBe("rotate(0) scale(3 4)");
  });

  test("小数角度保留（5 位小数精度）", () => {
    expect(nodeGeometryTransform(node({ rotation: 45.5 }))).toBe("rotate(45.5) scale(1 1)");
  });

  test("负角度保留（镜像语义）", () => {
    expect(nodeGeometryTransform(node({ rotation: -90 }))).toBe("rotate(-90) scale(1 1)");
  });

  test("**rotation 的非有限值被 formatSvgNumber 归 0**（`rotate(NaN)` 是无效属性）", () => {
    // 这条直接验证 shared/formatSvgNumber.mjs 的防御在此处生效：
    // 修前 formatSvgNumber(NaN) 会输出 "NaN" → 生成无效的 rotate(NaN)。
    for (const rotation of [Number.NaN, undefined, Infinity, -Infinity]) {
      expect(nodeGeometryTransform(node({ rotation: rotation as never })), String(rotation))
        .toBe("rotate(0) scale(1 1)");
    }
  });
});

describe("scale 的 `??` 链：scaleX/scaleY 优先，回落 scale，再回落 1", () => {
  test("只有 scale 时两轴共用", () => {
    expect(nodeGeometryTransform(node({ scale: 2 }))).toBe("rotate(0) scale(2 2)");
  });

  test("scaleX / scaleY 分别覆盖对应轴", () => {
    expect(nodeGeometryTransform(node({ scale: 1, scaleX: 2 }))).toBe("rotate(0) scale(2 1)");
    expect(nodeGeometryTransform(node({ scale: 1, scaleY: 3 }))).toBe("rotate(0) scale(1 3)");
    expect(nodeGeometryTransform(node({ scale: 1, scaleX: 2, scaleY: 3 }))).toBe("rotate(0) scale(2 3)");
  });

  test("**`??` 只挡 null/undefined**：null 与 undefined 都回落到 scale", () => {
    // 这是 `??` 与 `||` 的关键差别（0 不会被 `??` 回落，见下条）
    expect(nodeGeometryTransform(node({ scale: 2, scaleX: null as never }))).toBe("rotate(0) scale(2 2)");
    expect(nodeGeometryTransform(node({ scale: 2, scaleX: undefined }))).toBe("rotate(0) scale(2 2)");
  });

  test("两者都无 → 1", () => {
    const bare = node();
    delete (bare as { scale?: number }).scale;
    expect(nodeGeometryTransform(bare)).toBe("rotate(0) scale(1 1)");
  });
});

describe("如实记录：scale=0 / 非有限值**不被 `??` 兜住**（可达的边界行为，非缺陷）", () => {
  // 可达路径已查证：groupTransformGeometry 用 `Math.max(0, 1 + delta)` 算 rawScale，
  // **下界是 0**；normalizeScaleValue 只挡非有限值（0 原样通过）；`??` 不挡 0。
  // 即用户把缩放手柄拖到零 → node.scaleX = 0 → scale(0 1) / scale(0 0)。
  //
  // **判定为边界行为而非缺陷**：SVG 允许 scale 为 0（矩阵退化，元素塌缩/不可见），
  // 这正是"把元素缩到零"的正确表现。不改实现，只钉住行为。
  test("scaleX=0 原样透出（`??` 不挡 0）", () => {
    expect(getNodeScaleX(node({ scale: 1, scaleX: 0 }))).toBe(0);
    expect(nodeGeometryTransform(node({ scale: 1, scaleX: 0 }))).toBe("rotate(0) scale(0 1)");
  });

  test("scale 与 scaleX 同为 0 → scale(0 0)（矩阵完全退化）", () => {
    expect(nodeGeometryTransform(node({ scale: 0 }))).toBe("rotate(0) scale(0 0)");
  });

  test("非有限 scale 经 formatSvgNumber 归 0（不是 NaN）", () => {
    expect(nodeGeometryTransform(node({ scale: 1, scaleX: Number.NaN }))).toBe("rotate(0) scale(0 1)");
    expect(nodeGeometryTransform(node({ scale: 1, scaleX: Infinity }))).toBe("rotate(0) scale(0 1)");
    expect(nodeGeometryTransform(node({ scale: Number.NaN }))).toBe("rotate(0) scale(0 0)");
  });

  test("负 scale 保留（翻转语义，不被钳制）", () => {
    expect(getNodeScaleX(node({ scale: 1, scaleX: -1 }))).toBe(-1);
    expect(nodeGeometryTransform(node({ scale: 1, scaleX: -1 }))).toBe("rotate(0) scale(-1 1)");
    expect(nodeGeometryTransform(node({ scale: 1, scaleY: -1 }))).toBe("rotate(0) scale(1 -1)");
  });

  test("getNodeScaleY 与 X 同构", () => {
    expect(getNodeScaleY(node({ scale: 1, scaleY: 0 }))).toBe(0);
    expect(getNodeScaleY(node({ scale: 1, scaleY: 3 }))).toBe(3);
  });
});

describe("backgroundPageCanvasTransform（背景页等比缩放居中）", () => {
  const bounds = (width: number, height: number) => ({ x: 0, y: 0, width, height });

  test("等比放大：取 min(目标宽比, 目标高比) 并居中", () => {
    expect(backgroundPageCanvasTransform(bounds(100, 100), bounds(200, 200)))
      .toBe("translate(0 0) scale(2)");
  });

  test("非等比：取较小的缩放比（不裁切）并居中留白", () => {
    // 源 100x50 → 目标 200x200：宽比 2、高比 4，取 2；纵向留白 (200-100)/2 = 50
    expect(backgroundPageCanvasTransform(bounds(100, 50), bounds(200, 200)))
      .toBe("translate(0 50) scale(2)");
  });

  test("源尺寸 0 / 负数 → 被 Math.max(1, ·) 抬到 1，不产生 Infinity", () => {
    expect(backgroundPageCanvasTransform(bounds(0, 0), bounds(200, 200)))
      .toBe("translate(0 0) scale(200)");
    expect(backgroundPageCanvasTransform(bounds(-100, -100), bounds(200, 200)))
      .toBe("translate(0 0) scale(200)");
  });

  test("目标尺寸 0 → 同样被抬到 1（缩放比极小但有限）", () => {
    expect(backgroundPageCanvasTransform(bounds(100, 100), bounds(0, 0)))
      .toBe("translate(0 0) scale(0.01)");
  });

  test("**非有限源/目标尺寸 → scale 兜底为 1**（探针实测，不产出 NaN/Infinity）", () => {
    // scale 有 `Number.isFinite(scale) && scale > 0 ? scale : 1` 守卫
    const out1 = backgroundPageCanvasTransform(bounds(Number.NaN, 1), bounds(200, 200));
    const out2 = backgroundPageCanvasTransform(bounds(100, 100), bounds(Number.NaN, 1));
    for (const out of [out1, out2]) {
      expect(out).not.toMatch(/NaN|Infinity/);
      expect(out).toContain("scale(1)");
    }
  });

  test("输出始终是 `translate(x y) scale(s)` 两段式", () => {
    const out = backgroundPageCanvasTransform(bounds(300, 200), bounds(150, 400));
    expect(out).toMatch(/^translate\(-?[\d.]+ -?[\d.]+\) scale\([\d.]+\)$/);
  });
});
