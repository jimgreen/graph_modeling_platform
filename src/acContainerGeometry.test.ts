// src/acContainer.ts（893 行）：交流容器的布局/判定纯函数
//   isContainerNode / hasContainer            容器判定
//   foldContainerScaleIntoSize               scale 折算进 size（容器几何的唯一归一出口）
//   normalizeInboundContainerNode             「节点并入图」路径的统一入口
//   containerBoundsForMembers                成员包围盒 + 内侧留白
//   containerResizeMinSize                   手动缩放下限
//   clampContainerCenterToMembers             拖角后把矩形平移回完全包住成员
//   fitContainerToMembers                    重算为包围成员
//
// 锚定口径：`node.position` 是**中心**，容器真实矩形 = position ± size/2。
// 这些函数算错的后果是容器框与成员错位 —— 界面上只是框歪了，**零报错**。
import { describe, expect, test } from "vitest";
import {
  CONTAINER_CLEARANCE,
  CONTAINER_MIN_SIZE,
  CONTAINER_PADDING,
  clampContainerCenterToMembers,
  containerBoundsForMembers,
  containerResizeMinSize,
  ejectOutsiders,
  fitContainerToMembers,
  foldContainerScaleIntoSize,
  hasContainer,
  isContainerNode,
  normalizeInboundContainerNode
} from "./acContainer";
import { CONTAINER_KINDS, type ModelNode, calculateNodeVisualBounds } from "./model";

const node = (over: Partial<ModelNode> = {}): ModelNode => ({
  id: "n",
  kind: "ac-vpp-box",
  name: "n",
  nodeNumber: "n",
  acTopologyNode: 0,
  dcTopologyNode: 0,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 60 },
  rotation: 0,
  scale: 1,
  terminals: [],
  params: {},
  ...over
} as ModelNode);

// 一个普通设备成员（不是容器）。视觉包围盒 = {left:-50,right:50,top:-30,bottom:67.45}
// —— 高度 97.45 = 60 + 标签占的 37.45，且**下偏**（标签在下方），故包围盒不对称。
const member = () => node({ kind: "ac-bus", size: { width: 100, height: 60 } });

describe("三个常量：数值固定，且 PADDING 与 CLEARANCE 语义不同不得混用", () => {
  test("数值", () => {
    expect(CONTAINER_PADDING).toBe(24);
    expect(CONTAINER_CLEARANCE).toBe(50);
    expect(CONTAINER_MIN_SIZE).toEqual({ width: 180, height: 112 });
  });

  test("★ 内侧留白 ≠ 外侧排斥带（源码注释明确要求不得连带改）", () => {
    // CONTAINER_PADDING 管「容器贴成员多紧」，CONTAINER_CLEARANCE 管「容器势力范围多大」。
    // 两者曾共用一值，是历史原因。相等即意味着有人误改。
    expect(CONTAINER_PADDING).not.toBe(CONTAINER_CLEARANCE);
    expect(CONTAINER_PADDING).toBeLessThan(CONTAINER_CLEARANCE);
  });

  test("最小尺寸是**冻结的对象**（调用方不得就地改）", () => {
    // `fitContainerToMembers` 用 `{ ...CONTAINER_MIN_SIZE }` 拷贝后再返回，所以本常量不会被就地改；
    // 但「调用方都守规矩」是约定，`Object.freeze` 才是可执行的守卫 —— 删掉它下面三条全红。
    expect(Object.isFrozen(CONTAINER_MIN_SIZE), "导出常量已 Object.freeze").toBe(true);
    expect(Object.getOwnPropertyDescriptor(CONTAINER_MIN_SIZE, "width")!.writable).toBe(false);
    expect(Object.getOwnPropertyDescriptor(CONTAINER_MIN_SIZE, "height")!.writable).toBe(false);
    // 就地改写 → 抛 TypeError，原值不变。
    // 探针实测：本文件被 vite 以 **ESM 严格模式**执行（ESM 恒严格），故是抛错而非「静默丢弃」。
    // 若将来被改成 CommonJS/非严格执行，写入会静默失败 —— 上面三条
    // （isFrozen + 两个 descriptor.writable === false）与最后一条取值断言仍然成立，只有这条会红。
    let thrown: unknown = null;
    try {
      (CONTAINER_MIN_SIZE as { width: number }).width = -1;
      (CONTAINER_MIN_SIZE as { height: number }).height = -1;
    } catch (error) {
      thrown = error;
    }
    expect(thrown, "严格模式下写冻结对象抛 TypeError").toBeInstanceOf(TypeError);
    expect(CONTAINER_MIN_SIZE, "★ 原值不变").toEqual({ width: 180, height: 112 });
  });
});

describe("isContainerNode：6 个 kind 的精确清单匹配", () => {
  test("清单里的 6 个全部命中", () => {
    expect(CONTAINER_KINDS).toEqual([
      "ac-vpp-box",
      "ac-switch-box",
      "ac-distribution-box",
      "dc-vpp-box",
      "hydrogen-vpp-box",
      "heat-vpp-box"
    ]);
    for (const kind of CONTAINER_KINDS) {
      expect(isContainerNode(node({ kind })), kind).toBe(true);
    }
  });

  test("★ 精确匹配：非清单值一律不命中（含大小写与 `-vertical` 后缀）", () => {
    // 用的是 `Array.includes`，**不走** `baseDeviceKind` ——
    // 所以 `-vertical` 后缀不被剥离。这与 `isStaticContainerKind` 不同，
    // 那边会剥（见 staticRouteAvoidance.test.ts）。
    for (const kind of [
      "ac-bus", "static-point", "ac-line", "",
      "ac-vpp-box-vertical", "AC-VPP-BOX", "ac-vpp-box ", " ac-vpp-box"
    ] as never[]) {
      expect(isContainerNode(node({ kind })), JSON.stringify(kind)).toBe(false);
    }
  });
});

describe("hasContainer：`some` 短路，空数组 false", () => {
  test("空数组 → false", () => {
    expect(hasContainer([])).toBe(false);
  });
  test("全是非容器 → false", () => {
    expect(hasContainer([node({ kind: "ac-bus" }), node({ kind: "static-point" })])).toBe(false);
  });
  test("任一为容器 → true（位置无关）", () => {
    expect(hasContainer([node({ kind: "ac-vpp-box" })])).toBe(true);
    expect(hasContainer([node({ kind: "ac-bus" }), node({ kind: "dc-vpp-box" })])).toBe(true);
    expect(hasContainer([node({ kind: "ac-bus" }), node({ kind: "ac-bus" }), node({ kind: "heat-vpp-box" })])).toBe(true);
  });
});

describe("★ foldContainerScaleIntoSize：|scale| 折进 size，scale 三字段归 1", () => {
  const scaled = (sx: number, sy: number) => node({ scale: sx, scaleX: sx, scaleY: sy });

  test("已归一时**原样返回（同一引用，零分配）**", () => {
    for (const n of [scaled(1, 1), node({}), node({ scale: 1 })]) {
      const out = foldContainerScaleIntoSize(n);
      expect(out, "零分配早返回").toBe(n);
    }
  });

  test("两轴各自折算", () => {
    const table: Array<[number, number, number, number]> = [
      [2, 2, 200, 120],
      [2, 3, 200, 180],
      [3, 2, 300, 120],
      [0.5, 0.5, 50, 30],
      [1.5, 0.25, 150, 15]
    ];
    for (const [sx, sy, w, h] of table) {
      const out = foldContainerScaleIntoSize(scaled(sx, sy));
      expect(out.size, `scale=${sx},${sy}`).toEqual({ width: w, height: h });
      expect(out.scale, `scale=${sx},${sy}`).toBe(1);
      expect(out.scaleX).toBe(1);
      expect(out.scaleY).toBe(1);
    }
  });

  test("★ 取 `Math.abs` —— 负 scale 折出的尺寸与正的一样", () => {
    const neg = foldContainerScaleIntoSize(scaled(-2, -3));
    expect(neg.size).toEqual({ width: 200, height: 180 });
    expect(neg.scale).toBe(1);
  });

  test("★ `scale: -1` 命中零分配早返回 → **字段保持 -1 不被规范化**", () => {
    // 探针实测。`Math.abs(-1) === 1`，于是早返回把原对象直接交出，
    // `scale` / `scaleX` / `scaleY` 三个字段留在 -1。
    // 视觉上无害（|−1| = 1，渲染尺寸不变），但「归一出口」没有真的归一。
    const n = scaled(-1, -1);
    const out = foldContainerScaleIntoSize(n);
    expect(out, "同一引用").toBe(n);
    expect(out.scale, "★ 仍是 -1").toBe(-1);
    expect(out.scaleX).toBe(-1);
    expect(out.scaleY).toBe(-1);
    expect(out.size, "尺寸未变").toEqual({ width: 100, height: 60 });
    // 混合：顶层 scale=1 但 scaleX/scaleY=-1 → |−1|=1 → 同样早返回
    const mixed = node({ scale: 1, scaleX: -1, scaleY: -1 });
    expect(foldContainerScaleIntoSize(mixed), "同一引用").toBe(mixed);
  });

  test("★ `scale: 0` → size 塌成 0×0（`getNodeScaleX` 不兜 0）", () => {
    // 探针实测：`getNodeScaleX` 用 `node.scaleX ?? node.scale ?? 1` 的 nullish 链，
    // **不**兜 0（对比 `getSafeNodeScaleX` 有 `|| 1`）。于是 0 原样穿透，
    // `Math.abs(0) = 0 ≠ 1` → 走折算分支 → size 乘 0。
    //
    // **判定不修**：画布上 scale 由拖角/缩放产出，两端都有下限（`MIN_CANVAS_*` 等），
    // 真实数据里不存在 0；一旦真出现，容器塌成 0 恰恰是「用户把它缩没了」的正确表现，
    // 静默兜成 1 反而会让用户找不到那个图元。
    const z = scaled(0, 0);
    const out = foldContainerScaleIntoSize(z);
    expect(out, "不是零分配").not.toBe(z);
    expect(out.size).toEqual({ width: 0, height: 0 });
    expect(out.scale).toBe(1);
  });

  test("只给 `scaleX`/`scaleY`（顶层 `scale` 缺省）也生效", () => {
    const n = node({ scaleX: 2, scaleY: 3, scale: undefined as never });
    const out = foldContainerScaleIntoSize(n);
    expect(out.size).toEqual({ width: 200, height: 180 });
    expect(out.scale).toBe(1);
  });

  test("不改入参（返回新对象）", () => {
    const n = scaled(2, 2);
    const out = foldContainerScaleIntoSize(n);
    expect(out).not.toBe(n);
    expect(n.size, "入参尺寸不变").toEqual({ width: 100, height: 60 });
    expect(n.scale).toBe(2);
  });

  test("只折叠容器几何所需字段，其余字段原样带过", () => {
    const n = scaled(2, 2);
    (n as { rotation: number }).rotation = 42;
    (n as { containerId: string }).containerId = "c1";
    const out = foldContainerScaleIntoSize(n) as unknown as { rotation: number; containerId: string };
    expect(out.rotation).toBe(42);
    expect(out.containerId).toBe("c1");
  });
});

describe("normalizeInboundContainerNode：只对容器折算，非容器原样返回（同一引用）", () => {
  test("容器 + scale=2 → 折算并返回新对象", () => {
    const c = node({ kind: "ac-vpp-box", scale: 2, scaleX: 2, scaleY: 2 });
    const out = normalizeInboundContainerNode(c);
    expect(out).not.toBe(c);
    expect(out.size).toEqual({ width: 200, height: 120 });
    expect(out.scale).toBe(1);
  });

  test("★ 非容器 + scale=2 → 折算与非折算都不做，**同一引用**返回", () => {
    for (const kind of ["ac-bus", "static-point", "ac-routable-line"] as never[]) {
      const n = node({ kind, scale: 2, scaleX: 2, scaleY: 2 });
      const out = normalizeInboundContainerNode(n);
      expect(out, kind).toBe(n);
      expect(out.size, `${kind} 尺寸未动`).toEqual({ width: 100, height: 60 });
      expect(out.scale, `${kind} scale 未动`).toBe(2);
    }
  });

  test("容器 + 已归一 → 仍是同一引用", () => {
    const c = node({ kind: "ac-vpp-box", scale: 1, scaleX: 1, scaleY: 1 });
    expect(normalizeInboundContainerNode(c)).toBe(c);
  });

  test("6 个容器 kind 全部生效", () => {
    for (const kind of CONTAINER_KINDS) {
      const n = node({ kind, scale: 2, scaleX: 2, scaleY: 2 });
      expect(normalizeInboundContainerNode(n).size, kind).toEqual({ width: 200, height: 120 });
    }
  });
});

describe("containerBoundsForMembers：空 → null；四边各留 CONTAINER_PADDING", () => {
  test("空成员 → null", () => {
    expect(containerBoundsForMembers([])).toBeNull();
  });

  test("单成员：矩形 = 视觉包围盒向四边各扩 24", () => {
    const m = member();
    const r = containerBoundsForMembers([m]);
    const b = calculateNodeVisualBounds(m);
    expect(r).not.toBeNull();
    expect(r!.x).toBe(b.left - CONTAINER_PADDING);
    expect(r!.y).toBe(b.top - CONTAINER_PADDING);
    expect(r!.width).toBe(b.right - b.left + CONTAINER_PADDING * 2);
    expect(r!.height).toBe(b.bottom - b.top + CONTAINER_PADDING * 2);
  });

  test("★ 包围盒含**标签**且下偏 —— 高度不是 60 + 48", () => {
    // 探针实测：100×60 的成员 → 视觉包围盒 {left:-50,right:50,top:-30,bottom:67.45}
    // 高度 97.45 = 60 + 标签 37.45，标签在**下方**故 top 不动、bottom 加大。
    const r = containerBoundsForMembers([member()]);
    expect(r!.height, "含标签，不是 108").toBe(145.45);
    expect(r!.height).not.toBe(60 + CONTAINER_PADDING * 2);
    expect(r!.width, "宽度不含标签偏移").toBe(148);
    expect(r!.y).toBe(-54);
  });

  test("多成员 → 各自视觉包围盒的并集（不是 size 的并集）", () => {
    const a = node({ kind: "ac-bus", position: { x: 0, y: 0 }, size: { width: 100, height: 60 } });
    const b = node({ kind: "ac-bus", position: { x: 400, y: 0 }, size: { width: 100, height: 60 } });
    const r = containerBoundsForMembers([a, b]);
    const ba = calculateNodeVisualBounds(a);
    const bb = calculateNodeVisualBounds(b);
    expect(r!.x).toBe(Math.min(ba.left, bb.left) - CONTAINER_PADDING);
    expect(r!.width).toBe(Math.max(ba.right, bb.right) - Math.min(ba.left, bb.left) + CONTAINER_PADDING * 2);
  });

  test("与成员顺序无关（min/max 归约）", () => {
    const a = node({ kind: "ac-bus", position: { x: 0, y: 0 } });
    const b = node({ kind: "ac-bus", position: { x: 400, y: 0 } });
    expect(containerBoundsForMembers([a, b])).toEqual(containerBoundsForMembers([b, a]));
  });
});

describe("containerResizeMinSize：直接取 fitContainerToMembers 的 size（position 被丢弃）", () => {
  test("无成员 → CONTAINER_MIN_SIZE", () => {
    expect(containerResizeMinSize(node(), [])).toEqual({ width: 180, height: 112 });
  });

  test("★ 尺寸逐轴取 max（成员框 + padding, CONTAINER_MIN_SIZE）", () => {
    // 探针实测：单成员 → 宽 148 被抬到 180，高 145.45 保持
    const one = containerResizeMinSize(node(), [member()]);
    expect(one.width).toBe(180);      // 148 < 180 → 抬到最小宽
    expect(one.height).toBe(145.45);  // 145.45 > 112 → 保持
    // 大成员两轴都超
    const big = node({ kind: "ac-bus", size: { width: 500, height: 400 } });
    expect(containerResizeMinSize(node(), [big])).toEqual({ width: 548, height: 485.45 });
    // 极小成员两轴都被抬
    const tiny = node({ kind: "ac-bus", size: { width: 10, height: 10 } });
    expect(containerResizeMinSize(node(), [tiny])).toEqual({ width: 180, height: 112 });
  });

  test("★ 返回新对象且**只有 width/height 两个键**", () => {
    const c = node();
    const a = containerResizeMinSize(c, [member()]);
    const b = containerResizeMinSize(c, [member()]);
    expect(Object.keys(a)).toEqual(["width", "height"]);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  test("★ `fitContainerToMembers` 算出的 position 被丢弃（容器中心不变）", () => {
    // 探针实测：容器中心 (999,999) + 单成员 → minSize 仍按成员算，
    // 而 fit 内部会把 position 改成 (16, 18.725)。本函数只取 size。
    const c = node({ position: { x: 999, y: 999 } });
    const size = containerResizeMinSize(c, [member()]);
    expect(size).toEqual({ width: 180, height: 145.45 });
    expect(c.position, "入参未被改动").toEqual({ x: 999, y: 999 });
  });
});

describe("clampContainerCenterToMembers：无成员原样返回；两轴各夹", () => {
  const m = member();
  const b = calculateNodeVisualBounds(m);
  const ub = { x: b.left, y: b.top, width: b.right - b.left, height: b.bottom - b.top };
  const cx = ub.x + ub.width / 2;
  const cy = ub.y + ub.height / 2;

  test("★ 无成员 → **同一引用**返回 position", () => {
    const p = { x: 7, y: 9 };
    const out = clampContainerCenterToMembers(p, { width: 100, height: 60 }, []);
    expect(out).toBe(p);
  });

  test("尺寸足够大时：每条夹取单独生效（探针实测的五向表）", () => {
    // 尺寸 = 成员框 + 200，故一个方向越界时另一方向必不越界
    const size = { width: ub.width + 200, height: ub.height + 200 };
    const hw = size.width / 2;
    const hh = size.height / 2;
    const table: Array<[string, { x: number; y: number }, { x: number; y: number }]> = [
      ["正中不动", { x: cx, y: cy }, { x: cx, y: cy }],
      ["右边不足 → 左移", { x: cx + hw, y: cy }, { x: 100, y: cy }],
      ["左边越过 → 右移", { x: cx - hw, y: cy }, { x: -100, y: cy }],
      ["下边不足 → 上移", { x: cx, y: cy + hh }, { x: cx, y: 118.725 }],
      ["上边越过 → 下移", { x: cx, y: cy - hh }, { x: cx, y: -81.27499999999999 }],
      ["两轴各越 → 两轴都夹", { x: cx + hw, y: cy + hh }, { x: 100, y: 118.725 }]
    ];
    for (const [label, input, expected] of table) {
      expect(clampContainerCenterToMembers(input, size, [m]), label).toEqual(expected);
    }
  });

  test("★ 尺寸**小于**成员框时：两条夹取同时成立，后一条覆盖前一条", () => {
    // 源码注释说「尺寸 ≥ 成员框宽,故两条不会同时成立」——
    // 那个前提**并未被强制**。size=100×60 小于成员框 100×97.45（高），
    // 于是 y 的两条都成立，输出由后一条决定。
    expect(clampContainerCenterToMembers({ x: cx, y: cy }, { width: 100, height: 60 }, [m]))
      .toEqual({ x: 0, y: 37.45 });
    // 极小尺寸：两条都成立得很厉害，结果被后一条完全接管
    expect(clampContainerCenterToMembers({ x: cx, y: cy }, { width: 10, height: 10 }, [m]))
      .toEqual({ x: 45, y: 62.45 });
    // 恰好等于成员框：不夹
    expect(clampContainerCenterToMembers({ x: cx, y: cy }, { width: ub.width, height: ub.height }, [m]))
      .toEqual({ x: cx, y: cy });
  });

  test("平移目标用**裸包围盒**（不含 padding）—— 贴合一侧时不被钉死", () => {
    // 源码注释明确：用 padded 目标会把已贴合的边钉死。这里钉住「裸盒」这个口径。
    // 容器左沿正好等于成员裸盒左沿（x - hw === ub.x），不应被推回。
    const hw = ub.width / 2;
    const hh = ub.height / 2;
    const out = clampContainerCenterToMembers(
      { x: ub.x + hw, y: ub.y + hh },
      { width: ub.width, height: ub.height },
      [m]
    );
    expect(out, "不额外推").toEqual({ x: ub.x + hw, y: ub.y + hh });
  });

  test("两轴独立：一轴夹住不影响另一轴", () => {
    const size = { width: ub.width + 200, height: ub.height + 200 };
    const hw = size.width / 2;
    const out = clampContainerCenterToMembers({ x: cx + hw, y: cy }, size, [m]);
    expect(out.x, "x 被夹").toBe(100);
    expect(out.y, "y 不动").toBe(cy);
  });

  test("不改入参（越界时返回新对象）", () => {
    const size = { width: ub.width + 200, height: ub.height + 200 };
    const p = { x: cx + size.width / 2, y: cy };
    clampContainerCenterToMembers(p, size, [m]);
    expect(p, "入参未被改动").toEqual({ x: cx + size.width / 2, y: cy });
  });
});

describe("fitContainerToMembers：矩形左上角 + 尺寸 → 中心锚定", () => {
  test("无成员 → 收缩到 CONTAINER_MIN_SIZE，**中心不变**", () => {
    const c = node({ position: { x: 123, y: 456 } });
    const out = fitContainerToMembers(c, []);
    expect(out.size).toEqual({ width: 180, height: 112 });
    expect(out.position, "中心不动").toEqual({ x: 123, y: 456 });
  });

  test("★ 有成员：中心 = 矩形左上角 + size/2（钳到最小尺寸后仍以同一左上角取中心）", () => {
    const m = member();
    const c = node({ position: { x: 999, y: 999 } });
    const out = fitContainerToMembers(c, [m]);
    const r = containerBoundsForMembers([m]);
    const w = Math.max(r!.width, CONTAINER_MIN_SIZE.width);
    const h = Math.max(r!.height, CONTAINER_MIN_SIZE.height);
    expect(out.size).toEqual({ width: w, height: h });
    expect(out.position.x, "x = 左上 + w/2").toBeCloseTo(r!.x + w / 2, 10);
    expect(out.position.y, "y = 左上 + h/2").toBeCloseTo(r!.y + h / 2, 10);
    expect(out.position).not.toBe(c.position);
    expect(c.position, "入参未被改动").toEqual({ x: 999, y: 999 });
  });

  test("只改 position 与 size，其余字段带过", () => {
    const c = node({ scale: 2 });
    (c as { containerId: string }).containerId = "c1";
    const out = fitContainerToMembers(c, [member()]) as unknown as { containerId: string; scale: number };
    expect(out.containerId).toBe("c1");
    expect(out.scale, "不碰 scale").toBe(2);
  });

  test("`containerResizeMinSize` 与它同口径（同一个 size）", () => {
    // 源码注释明确说二者「同一口径」，用同一组输入交叉验证。
    const c = node();
    const members = [member(), node({ kind: "ac-bus", position: { x: 300, y: 200 } })];
    expect(containerResizeMinSize(c, members)).toEqual(fitContainerToMembers(c, members).size);
  });
});

// `withinClearance` 是 acContainer.ts 里的**私有**函数（未导出），故不能直接断言它的返回值。
// 唯一可观察面是 `ejectOutsiders` → `pushBoundsOutOfRect` → `withinClearance`：
// 谓词 **false ⇒ 不产出位移（补丁数组为 []）**，**true ⇒ 产出位移补丁**。据此反推谓词取值。
describe("withinClearance：非有限值短路（经 ejectOutsiders 观察谓词取值）", () => {
  // 容器 200×200 中心 (0,0) → 真实矩形 [-100,100]²（position 是中心，见文件头锚定口径）。
  // 成员 100×60 且隐去标签 → 视觉包围盒 == 本体矩形 == position ± (50,30)，故四边可精确写死。
  const container = () => node({ id: "c1", kind: "ac-vpp-box", size: { width: 200, height: 200 } });
  const outsider = (over: Partial<ModelNode> = {}) => node({
    id: "m1", kind: "ac-load", params: { _labelVisible: "0" }, size: { width: 100, height: 60 }, ...over
  });
  const eject = (m: ModelNode) => {
    const c = container();
    return ejectOutsiders(c, [c, m]);
  };

  test("★ NaN 入参（rotation 缺失/异常 → 包围盒四边皆 NaN）→ 短路 false：无补丁、不抛错", () => {
    // 源码注释：「缺 rotation/scale 的异常节点算得 NaN，一律视为无需挪动（不写出 NaN 位置）」。
    // NaN 会一路穿透 `pushBoundsOutOfRect` 的位移算术（Math.min(NaN,...) → NaN，
    // 而 `m === dl` 全为 false ⇒ 落到最后的 `center.y + dd`），若无短路就会**写出 NaN 位置**。
    const m = outsider({ rotation: NaN });
    const b = calculateNodeVisualBounds(m);
    // 前提：真的造出了 NaN 包围盒（否则下面断言恒绿 —— 是坏 fixture，不是守卫生效）
    expect(Number.isNaN(b.left) && Number.isNaN(b.right) && Number.isNaN(b.top) && Number.isNaN(b.bottom),
      "前提：包围盒四边皆 NaN").toBe(true);
    expect(() => eject(m), "不抛错").not.toThrow();
    expect(eject(m), "★ withinClearance 短路 → 无位移补丁（不写 NaN 位置）").toEqual([]);
  });

  test("★ Infinity / -Infinity 入参 → 同样短路 false（`every(Number.isFinite)` 一并挡住）", () => {
    // `Number.isFinite` 而非 `!Number.isNaN`：故 ±Infinity 与 NaN 同路，都算「无需挪动」。
    // ⚠ 三条 fixture 的差别是实测出来的，不是设计出来的 —— 记在此处免得下次重踩：
    //  ① `scale: Infinity` → **全 NaN**。`visualHalfExtentsForNode` 算 `halfWidth*cos + halfHeight*sin`，
    //     sin(0) === 0 ⇒ `Infinity * 0 === NaN` ⇒ 两轴一起塌成 NaN（等价于上一条那个用例）。
    //  ② `size.width: Infinity` → x 两边是真 ±Infinity，但 **y 两边是 NaN**（同一个 `Inf * sin(0)`）。
    //  ③ `position.x: ±Infinity` → 只有 x 两边非有限，y 仍是有限值（-30 / 30）—— 唯一「纯 ±Infinity」形状。
    // size/scale 上的负号都会被 `Math.abs` 抹掉，故 -Infinity 也只能走 position。
    const inf = outsider({ size: { width: Infinity, height: 60 } });
    const ib = calculateNodeVisualBounds(inf);
    expect(ib.left, "前提②：left = -Infinity").toBe(-Infinity);
    expect(ib.right, "前提②：right = +Infinity").toBe(Infinity);
    expect(ib.top, "前提②：y 被 Inf*sin(0) 污染成 NaN").toBeNaN();
    expect(eject(inf), "∞ → 无补丁").toEqual([]);
    for (const x of [Infinity, -Infinity]) {
      const m = outsider({ position: { x, y: 0 } });
      const b = calculateNodeVisualBounds(m);
      expect(b.left, `前提③：left = ${x}`).toBe(x - 50); // ±Inf - 50 = ±Inf
      expect(b.right, `前提③：right = ${x}`).toBe(x + 50);
      expect(b.top, `前提③：${x} 时 y 轴仍有限 → 短路确实由 x 轴触发`).toBe(-30);
      expect(b.bottom, `前提③：${x} 时 y 轴仍有限`).toBe(30);
      expect(eject(m), `${x} → 无补丁`).toEqual([]);
    }
    // 反面对照不在这里重复：本 describe 最后两条已钉住「有限值 → 谓词 true → 有位移补丁」。
    // 少了那两条，上面几条恒为 [] 也可能只是「fixture 压根没进排斥带」，守卫等于没咬。
  });

  test("回归：间隙**恰为** CONTAINER_CLEARANCE → 不动（边界不推，谓词 false）", () => {
    // 本体 [150,250]：左沿 150 = 矩形右沿 100 + 50，即 `b.left >= r.x2 + CONTAINER_CLEARANCE` 成立。
    const m = outsider({ position: { x: 200, y: 0 } });
    expect(calculateNodeVisualBounds(m).left - 100, "前提：间隙 = 50").toBe(CONTAINER_CLEARANCE);
    expect(eject(m)).toEqual([]);
  });

  test("回归：间隙**刚小于**排斥带（49）→ 推到间隙恰为 50（证明短路守卫没改正常判定）", () => {
    // 与上一条构成边界两侧：同一容器、同一成员，只差 1px 间隙，结论必须相反。
    const m = outsider({ position: { x: 199, y: 0 } });
    expect(calculateNodeVisualBounds(m).left - 100, "前提：间隙 = 49").toBe(CONTAINER_CLEARANCE - 1);
    // 四向最小位移 dl=399 / dr=1 / du=180 / dd=180 → 取 dr，往右推 1 → 中心落到 200（间隙 50）
    expect(eject(m), "★ 谓词 true → 沿最近边右移 1").toEqual([{ nodeId: "m1", position: { x: 200, y: 0 } }]);
  });
});
