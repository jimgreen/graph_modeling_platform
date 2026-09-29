// deviceVisualParams：设备视觉参数白名单（此前零测试）。
//
// isCanonicalDeviceVisualParamName 决定参数在「模型加载/归一」时**原样保留**
// 还是走语义转换（model.ts 的 normalizeSemanticParameterValues /
// normalizeDeviceParamRecord）。判错不报错：漏判 ⇒ 设备外观参数被当普通参数
// 转换掉；误判 ⇒ 普通参数被原样留下，值类型对不上后续渲染。
//
// 白名单本身是数据，加载期不报错但会「加载后外观不对」，同样需要守卫。
import { describe, expect, it } from "vitest";
import {
  DEVICE_DEFINITION_VISUAL_PARAM_KEYS,
  DEVICE_INSTANCE_GRAPH_PARAM_KEYS,
  DEVICE_VISUAL_PARAM_KEYS,
  DEVICE_VISUAL_PARAM_PREFIXES,
  isCanonicalDeviceVisualParamName as isVisual
} from "./deviceVisualParams";

describe("isCanonicalDeviceVisualParamName", () => {
  it("定义级视觉参数（颜色/线宽/字号/图片…）⇒ 是", () => {
    for (const key of [
      "fillColor", "strokeColor", "textColor", "lineWidth", "fontSize", "fontFamily",
      "fontWeight", "fontStyle", "textDecoration", "strokeStyle", "cornerRadius",
      "accentColor", "shadowEnabled", "padding", "textAlign", "verticalAlign",
      "icon", "image", "imageAssetId", "imageFit", "backgroundImage"
    ]) {
      expect(isVisual(key), key).toBe(true);
    }
  });

  it("实例级图形参数（图层/旋转/缩放）⇒ 是", () => {
    for (const key of ["layerId", "rotation", "scaleX", "scaleY"]) {
      expect(isVisual(key), key).toBe(true);
    }
  });

  it("静态按钮前缀 ⇒ 是（buttonXxx 一律算视觉参数）", () => {
    expect(isVisual("buttonEnabled")).toBe(true);
    expect(isVisual("buttonLabel")).toBe(true);
    expect(isVisual("button")).toBe(true);
  });

  it("普通业务参数 ⇒ 不是", () => {
    for (const key of ["idx", "name", "vbase", "r", "i_node", "j_node", "status", "rated_capacity"]) {
      expect(isVisual(key), key).toBe(false);
    }
  });

  it("下划线开头的内部参数 ⇒ 不是（调用方另行处理 startsWith('_')）", () => {
    // model.ts 两处都是 `name.startsWith("_") || isCanonicalDeviceVisualParamName(name)`
    // —— 下划线前缀由前一条件兜住，不该由本函数重复负责
    for (const key of ["_labelText", "_labelColor", "_internal"]) {
      expect(isVisual(key), key).toBe(false);
    }
  });

  it("大小写敏感：FillColor 不命中", () => {
    expect(isVisual("FillColor")).toBe(false);
    expect(isVisual("FILL")).toBe(false);
  });

  it("前缀只认 button：其他前缀不命中", () => {
    expect(isVisual("customButton")).toBe(false);
    expect(isVisual("buttonish")).toBe(true); // 仍是 button 前缀
    expect(isVisual("btnEnabled")).toBe(false);
  });

  it("空串 ⇒ 不是（且不抛）", () => {
    expect(isVisual("")).toBe(false);
  });
});

describe("视觉参数集合自身的结构", () => {
  it("总集合 = 定义级 ∪ 实例级，不多不少", () => {
    const union = new Set([...DEVICE_DEFINITION_VISUAL_PARAM_KEYS, ...DEVICE_INSTANCE_GRAPH_PARAM_KEYS]);
    expect(DEVICE_VISUAL_PARAM_KEYS.size).toBe(union.size);
    for (const key of DEVICE_VISUAL_PARAM_KEYS) {
      expect(union.has(key), key).toBe(true);
    }
  });

  it("两个子集内部无重复（Set 不会重复，但要确保构造时没漏写）", () => {
    expect(DEVICE_DEFINITION_VISUAL_PARAM_KEYS.size).toBeGreaterThan(20);
    expect(DEVICE_INSTANCE_GRAPH_PARAM_KEYS.size).toBe(4);
  });

  it("子集之间不交叉（图层/旋转/缩放不属于定义级）", () => {
    for (const key of DEVICE_INSTANCE_GRAPH_PARAM_KEYS) {
      expect(DEVICE_DEFINITION_VISUAL_PARAM_KEYS.has(key), key).toBe(false);
    }
  });

  it("前缀表只有一个 button", () => {
    expect(DEVICE_VISUAL_PARAM_PREFIXES).toEqual(["button"]);
  });

  it("没有任何 key 以 _ 开头（那是内部参数命名空间）", () => {
    for (const key of DEVICE_VISUAL_PARAM_KEYS) {
      expect(key.startsWith("_"), key).toBe(false);
    }
  });

  it("总集合里不含常见业务参数（防止误加导致语义转换被跳过）", () => {
    for (const key of ["idx", "name", "vbase", "r", "i_node", "j_node"]) {
      expect(DEVICE_VISUAL_PARAM_KEYS.has(key), key).toBe(false);
    }
  });
});
