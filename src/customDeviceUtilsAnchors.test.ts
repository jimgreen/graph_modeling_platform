// customDeviceUtils 的四个工具函数直测 —— 覆盖率报告里这四个全是 0 调用。
//
// ## 覆盖的是什么
//
//   - hasOverlappingCustomDeviceTerminalAnchors：端子锚点判重（走坐标归一化，
//     所以「看起来不同、归一后相同」也算重叠）；
//   - customDeviceGeneratedDefaultImageCandidates：按标签集生成默认图候选；
//   - syncInheritedCustomDeviceStateVisuals：状态图标继承默认视觉（分支最多的一条）；
//   - screenToSvgPoint：屏幕坐标 → SVG 坐标（依赖 SVG 元素，用假对象注入）。
//
// 四者都是纯数据变换，不触 IO；screenToSvgPoint 只需一个带
// createSVGPoint / getScreenCTM 的假元素，仓库无 jsdom 也能测。
import { describe, expect, test } from "vitest";

import {
  customDeviceGeneratedDefaultImageCandidates,
  hasOverlappingCustomDeviceTerminalAnchors,
  normalizeCustomDeviceTerminalAnchorCoordinate,
  screenToSvgPoint,
  syncInheritedCustomDeviceStateVisuals
} from "./customDeviceUtils";
import type { DeviceStateDefinition, TerminalType } from "./model";

const pt = (x: number, y: number) => ({ x, y });

describe("hasOverlappingCustomDeviceTerminalAnchors", () => {
  test("无重复 → false", () => {
    expect(hasOverlappingCustomDeviceTerminalAnchors([pt(-0.5, 0), pt(0.5, 0), pt(0, -0.5)])).toBe(false);
  });

  test("完全相同的两点 → true", () => {
    expect(hasOverlappingCustomDeviceTerminalAnchors([pt(0.5, 0), pt(0.5, 0)])).toBe(true);
  });

  test("★ 归一化后才相同的也算重叠（-0.5 与 -0.50001 同键）", () => {
    // 判据是 customDeviceTerminalAnchorKey，即归一化后的 `${x}:${y}`
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(-0.50001)).toBe(
      normalizeCustomDeviceTerminalAnchorCoordinate(-0.5)
    );
    expect(hasOverlappingCustomDeviceTerminalAnchors([pt(-0.5, 0), pt(-0.50001, 0)])).toBe(true);
  });

  test("坐标夹到 [-0.5, 0.5]：越界值与边界值同键", () => {
    expect(hasOverlappingCustomDeviceTerminalAnchors([pt(0.9, 0), pt(0.5, 0)])).toBe(true);
    expect(hasOverlappingCustomDeviceTerminalAnchors([pt(-2, 0), pt(0.5, 0)])).toBe(false);
  });

  test("空数组与单点 → false（没有「一对」就谈不上重叠）", () => {
    expect(hasOverlappingCustomDeviceTerminalAnchors([])).toBe(false);
    expect(hasOverlappingCustomDeviceTerminalAnchors([pt(0, 0)])).toBe(false);
  });
});

describe("customDeviceGeneratedDefaultImageCandidates", () => {
  test("★ 三个来源各出一个候选（label / library / Unit），同名时才去重", () => {
    const candidates = customDeviceGeneratedDefaultImageCandidates("交流负荷", "ACLoad", ["ac"] as TerminalType[]);
    expect(candidates.size).toBe(3);
    // label 与 library 同名时，Set 去重后只剩两个
    const deduped = customDeviceGeneratedDefaultImageCandidates("ACLoad", "ACLoad", ["ac"] as TerminalType[]);
    expect(deduped.size).toBe(2);
    for (const candidate of candidates) {
      expect(typeof candidate).toBe("string");
      expect(candidate.length).toBeGreaterThan(0);
    }
  });

  test("空白标签被过滤掉（不生成空图候选）", () => {
    const candidates = customDeviceGeneratedDefaultImageCandidates("   ", "ACLoad", ["ac"] as TerminalType[]);
    // 剩 "ACLoad" 与 "Unit" 两个来源
    expect(candidates.size).toBe(2);
  });

  test("★ 端子类型为空时兜底成 ac（不生成零端子的怪图）", () => {
    const withFallback = customDeviceGeneratedDefaultImageCandidates("交流负荷", "ACLoad", [] as TerminalType[]);
    const explicitAc = customDeviceGeneratedDefaultImageCandidates("交流负荷", "ACLoad", ["ac"] as TerminalType[]);
    expect([...withFallback].sort()).toEqual([...explicitAc].sort());
  });

  test("不同端子类型产出不同候选（图随端���数变）", () => {
    const ac = customDeviceGeneratedDefaultImageCandidates("负荷", "ACLoad", ["ac"] as TerminalType[]);
    const twoTerminal = customDeviceGeneratedDefaultImageCandidates(
      "负荷",
      "ACLoad",
      ["ac", "dc"] as TerminalType[]
    );
    expect([...ac].some((image) => !twoTerminal.has(image))).toBe(true);
  });
});

describe("syncInheritedCustomDeviceStateVisuals", () => {
  const defaultVisual = {
    backgroundImage: "data:image/svg+xml;charset=utf-8,DEFAULT",
    backgroundImageAssetId: "asset-default",
    backgroundImageFit: "contain"
  };
  const candidate = "data:image/svg+xml;charset=utf-8,CANDIDATE";
  const state = (extra: Partial<DeviceStateDefinition> = {}): DeviceStateDefinition => ({
    name: "状态",
    ...extra
  } as DeviceStateDefinition);

  test("没有默认视觉 / 候选集为空 → 原样返回同一个数组", () => {
    const states = [state({ image: candidate })];
    expect(syncInheritedCustomDeviceStateVisuals(states, { ...defaultVisual, backgroundImage: "" }, new Set([candidate]))).toBe(states);
    expect(syncInheritedCustomDeviceStateVisuals(states, defaultVisual, new Set())).toBe(states);
  });

  test("★ 命中候选且无 assetId → 换成默认视觉，并补 image/backgroundImage 与 fit", () => {
    const next = syncInheritedCustomDeviceStateVisuals([state({ image: candidate })], defaultVisual, new Set([candidate]));
    expect(next[0].image).toBe(defaultVisual.backgroundImage);
    expect(next[0].backgroundImage).toBe(defaultVisual.backgroundImage);
    expect(next[0].imageFit).toBe("contain");
    expect(next[0].backgroundImageFit).toBe("contain");
    expect(next[0].imageAssetId).toBe("asset-default");
    expect(next[0].backgroundImageAssetId).toBe("asset-default");
  });

  test("★ 判据顺序：先看 assetId，再看图 —— 有 assetId 的状态连 backgroundImage 也不换", () => {
    // 实现里 `if (assetId || ...) return state` 在最前，所以「默认视觉没有 assetId
    // ⇒ 删掉旧 assetId」那条分支实际**不可达**：没有 assetId 的状态本来就没字段可删。
    const next = syncInheritedCustomDeviceStateVisuals(
      [state({ image: candidate, imageAssetId: "旧资产" })],
      { ...defaultVisual, backgroundImageAssetId: "" },
      new Set([candidate])
    );
    expect(next[0]).toEqual(state({ image: candidate, imageAssetId: "旧资产" }));
  });

  test("★ 已有 assetId 的状态不被继承（用户自己指定过图）", () => {
    const next = syncInheritedCustomDeviceStateVisuals(
      [state({ image: candidate, imageAssetId: "用户指定" })],
      defaultVisual,
      new Set([candidate])
    );
    expect(next[0].image).toBe(candidate);
    expect(next[0].imageAssetId).toBe("用户指定");
  });

  test("图不在候选集里 → 不动", () => {
    const other = "data:image/svg+xml;charset=utf-8,别人的图";
    const next = syncInheritedCustomDeviceStateVisuals([state({ image: other })], defaultVisual, new Set([candidate]));
    expect(next[0].image).toBe(other);
  });

  test("图已经等于默认视觉 → 不动（避免重复替换）", () => {
    const next = syncInheritedCustomDeviceStateVisuals(
      [state({ image: defaultVisual.backgroundImage })],
      defaultVisual,
      new Set([defaultVisual.backgroundImage])
    );
    expect(next[0].image).toBe(defaultVisual.backgroundImage);
    expect(next[0].imageAssetId).toBeUndefined();
  });

  test("只设了 backgroundImage（没有 image）时也走继承", () => {
    const next = syncInheritedCustomDeviceStateVisuals(
      [state({ backgroundImage: candidate })],
      defaultVisual,
      new Set([candidate])
    );
    expect(next[0].image).toBe(defaultVisual.backgroundImage);
  });

  test("没有 fit 时不写 fit 字段（不写入 undefined）", () => {
    const next = syncInheritedCustomDeviceStateVisuals(
      [state({ image: candidate })],
      { backgroundImage: defaultVisual.backgroundImage, backgroundImageAssetId: "a" },
      new Set([candidate])
    );
    expect("imageFit" in next[0]).toBe(false);
    expect("backgroundImageFit" in next[0]).toBe(false);
  });

  test("未命中的状态保持同一引用（浅拷贝只发生在真被替换的那些）", () => {
    const hit = state({ image: candidate });
    const miss = state({ image: "别的" });
    const next = syncInheritedCustomDeviceStateVisuals([hit, miss], defaultVisual, new Set([candidate]));
    expect(next[1]).toBe(miss);
    expect(next[0]).not.toBe(hit);
  });
});

describe("screenToSvgPoint", () => {
  /** 造一个只提供 screenToSvgPoint 所需两个方法的假 SVG 元素。 */
  const fakeSvg = (ctm: unknown) => ({
    createSVGPoint: () => {
      const point = { x: 0, y: 0, matrixTransform: (matrix: { a: number; d: number }) => ({ x: point.x * matrix.a, y: point.y * matrix.d }) };
      return point;
    },
    getScreenCTM: () => ctm
  }) as unknown as SVGSVGElement;

  test("有 CTM 时按矩阵换算并取整", () => {
    // matrixTransform 用 (x*a, y*d) 近似；inverse() 传 { a: 2, d: 4 }
    const point = screenToSvgPoint(fakeSvg({ a: 0.5, d: 0.25, inverse: () => ({ a: 0.5, d: 0.25 }) }), 10, 20);
    expect(point).toEqual({ x: 5, y: 5 });
  });

  test("★ 没有 CTM（元素未布局）→ 原样返回客户端坐标，不抛", () => {
    expect(screenToSvgPoint(fakeSvg(null), 7, 9)).toEqual({ x: 7, y: 9 });
  });

  test("换算后取整（四舍五入到整像素）", () => {
    const point = screenToSvgPoint(
      fakeSvg({ a: 0.33, d: 0.66, inverse: () => ({ a: 0.33, d: 0.66 }) }),
      10,
      10
    );
    expect(Number.isInteger(point.x)).toBe(true);
    expect(Number.isInteger(point.y)).toBe(true);
  });
});