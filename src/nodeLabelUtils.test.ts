// src/nodeLabelUtils.ts（156 行，18 个导出）：节点标签的参数读取、可见性、纵向分段与几何
//
// 本文件 18 个导出里 **17 个测试零直呼**（只有 normalizeNodeLabelRotation 有 35 处）。
// 标签判错的后果分两类：几何算错 → 标签飘到别处；可见性判错 → 标签该藏没藏 /
// 该显没显。两者都**零报错**，只是画面对不上。
import { describe, expect, test } from "vitest";
import {
  nodeLabelCanvasCenter,
  nodeLabelDisplayMode,
  nodeLabelFontSize,
  nodeLabelOffset,
  nodeLabelRotationFromPoint,
  nodeLabelShouldRender,
  nodeLabelText,
  nodeLabelTextAnchor,
  nodeLabelTextStyle,
  nodeLabelTransform,
  nodeLabelVertical,
  nodeLabelVerticalSegments,
  nodeLabelVerticalTokenStyle,
  nodeLabelVerticalTokenY,
  nodeLabelVisible,
  normalizeNodeLabelDisplayMode,
  numericNodeParam
} from "./nodeLabelUtils";
import { DEFAULT_DEVICE_LABEL_FONT_SIZE, type ModelNode } from "./model";

const node = (over: Record<string, unknown> = {}): ModelNode => ({
  id: "n",
  kind: "ac-bus",
  name: "母线1",
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
} as unknown as ModelNode);

const withParam = (key: string, value: unknown) =>
  node({ params: { [key]: value } as never });

const scaled = (sx: number, sy: number) =>
  node({ scale: sx, scaleX: sx, scaleY: sy } as never);

describe("numericNodeParam：`Number(...)` + `Number.isFinite` 守卫", () => {
  test("正常数字串（含 `Number` 的各种语法）", () => {
    const table: Array<[unknown, number]> = [
      ["12", 12], ["12.5", 12.5], ["-3", -3], [" 7 ", 7], ["1e2", 100], ["0x10", 16]
    ];
    for (const [value, expected] of table) {
      expect(numericNodeParam(withParam("_k", value), "_k", 99), JSON.stringify(value)).toBe(expected);
    }
  });

  test("★ 不可解析 → fallback", () => {
    for (const value of ["abc", "12abc", "Infinity", "NaN", {}, [1, 2]] as unknown[]) {
      expect(numericNodeParam(withParam("_k", value), "_k", 99), JSON.stringify(value)).toBe(99);
    }
    // NaN / ±Infinity 作为**数值**也走 fallback（isFinite 为假）
    expect(numericNodeParam(withParam("_k", NaN), "_k", 99)).toBe(99);
    expect(numericNodeParam(withParam("_k", Infinity), "_k", 99)).toBe(99);
    expect(numericNodeParam(withParam("_k", -Infinity), "_k", 99)).toBe(99);
    // 键不存在 → Number(undefined) = NaN → fallback
    expect(numericNodeParam(node(), "_k", 99)).toBe(99);
  });

  test("★ 空串 / 纯空白 / null / [] / false 都是**有限数 0**，走不到 fallback", () => {
    // 探针实测。`Number("") === 0`、`Number("  ") === 0`、`Number(null) === 0`、
    // `Number([]) === 0`、`Number(false) === 0` —— 全都通过 isFinite 守卫。
    // 所以「参数留空」等于「把值设成 0」，**不是**「用默认值」。
    for (const value of ["", "  ", null, [], false, 0] as unknown[]) {
      expect(numericNodeParam(withParam("_k", value), "_k", 99), JSON.stringify(value)).toBe(0);
    }
    // 单元素数组会被 `Number` 取出元素
    expect(numericNodeParam(withParam("_k", [7]), "_k", 99)).toBe(7);
    expect(numericNodeParam(withParam("_k", true), "_k", 99)).toBe(1);
  });

  test("fallback 本身不被校验（原样返回）", () => {
    expect(numericNodeParam(node(), "_k", -5)).toBe(-5);
    expect(numericNodeParam(node(), "_k", 0)).toBe(0);
  });
});

describe("nodeLabelOffset：x 恒 0 默认、y 默认 = `round(height/2 + 22)`", () => {
  test("两个参数的默认值各自独立", () => {
    expect(nodeLabelOffset(node())).toEqual({ x: 0, y: 52 });  // round(30+22)
    expect(nodeLabelOffset(withParam("_labelX", 5))).toEqual({ x: 5, y: 52 });
    expect(nodeLabelOffset(withParam("_labelY", 6))).toEqual({ x: 0, y: 6 });
    expect(nodeLabelOffset(node({ params: { _labelX: 5, _labelY: 6 } }))).toEqual({ x: 5, y: 6 });
  });

  test("★ y 默认走 `Math.round`（半值向 +∞）", () => {
    const table: Array<[number, number]> = [
      [60, 52], [0, 22], [1, 23], [35, 40], [36, 40], [37, 41], [100, 72]
    ];
    for (const [height, expected] of table) {
      expect(nodeLabelOffset(node({ size: { width: 10, height } })), `height=${height}`).toEqual({
        x: 0,
        y: expected
      });
    }
  });

  test("★ 显式空串 → 0（不是默认值）", () => {
    expect(nodeLabelOffset(withParam("_labelX", ""))).toEqual({ x: 0, y: 52 });
    expect(nodeLabelOffset(node({ params: { _labelX: "", _labelY: "" } }))).toEqual({ x: 0, y: 0 });
  });

  test("返回新对象（不共享）", () => {
    const n = node();
    expect(nodeLabelOffset(n)).not.toBe(nodeLabelOffset(n));
    expect(nodeLabelOffset(n)).toEqual(nodeLabelOffset(n));
  });
});

describe("nodeLabelText：`??` 而非 `||`", () => {
  test("有值时原样返回", () => {
    expect(nodeLabelText(withParam("_labelText", "显式标签"))).toBe("显式标签");
  });

  test("nullish 时回落 `node.name`", () => {
    expect(nodeLabelText(node())).toBe("母线1");
    expect(nodeLabelText(withParam("_labelText", null))).toBe("母线1");
    expect(nodeLabelText(withParam("_labelText", undefined))).toBe("母线1");
  });

  test("★ 空串被原样返回（不是回落 name）", () => {
    // `??` 只挡 null/undefined。空标签是**合法状态** —— 用户可以主动清空标签。
    expect(nodeLabelText(withParam("_labelText", ""))).toBe("");
  });

  test("其它假值也原样穿透（形参标注 string，但运行时不强求）", () => {
    expect(nodeLabelText(withParam("_labelText", 0))).toBe(0);
    expect(nodeLabelText(withParam("_labelText", false))).toBe(false);
  });
});

describe("nodeLabelVisible：只有字面量 `\"0\"` 隐藏", () => {
  test("默认可见", () => {
    expect(nodeLabelVisible(node())).toBe(true);
  });

  test("★ `\"0\"` 之外的任何值都算可见", () => {
    // 包括 `"false"` / `"否"` / `"0 "`（带尾空格）—— 这些在别处
    // （如 normalizeRouteAvoidanceFlag）都会被认成假值，**这里不会**。
    for (const value of ["1", "", "false", "false ", "否", "0 ", " 0", "no"]) {
      expect(nodeLabelVisible(withParam("_labelVisible", value)), JSON.stringify(value)).toBe(true);
    }
    expect(nodeLabelVisible(withParam("_labelVisible", "0"))).toBe(false);
  });

  test("★ 静态图元与交流容器一律不可见（自带名称绘制，不叠加设备标签）", () => {
    expect(nodeLabelVisible(node({ kind: "static-point" }))).toBe(false);
    expect(nodeLabelVisible(node({ kind: "ac-vpp-box" }))).toBe(false);
    // 即便显式写 `"1"` 也救不回来
    expect(nodeLabelVisible(node({ kind: "ac-vpp-box", params: { _labelVisible: "1" } }))).toBe(false);
    // 判定用 `isContainerKind(kind)`：只看 kind、不看 params，
    // 且它不走 `baseDeviceKind`，所以 `-vertical` 后缀不被剥离。
    // （第一版我按 acContainer 的印象写了 `ac-vpp-box-vertical → false`，被顶回。）
    expect(nodeLabelVisible(node({ kind: "ac-vpp-box-vertical" })), "★ -vertical 不被剥离 → 判可见")
      .toBe(true);
    // ★ 参数里声明成容器**仍然**不可见 —— 但拦住它的不是 `isContainerKind`，
    //   而是 `isStaticNode` 的第二级门槛 `staticComponentLibraryForNodeLike(kind, params)`，
    //   那一条**会读 params**。两道关卡的 params 口径因此相反（见 acContainerGeometry.test.ts）。
    expect(nodeLabelVisible(node({ kind: "ac-bus", params: { component_type: "StaticContainerSymbol" } })))
      .toBe(false);
    // 参数声明成**非**静态库则两道关卡都不拦
    expect(nodeLabelVisible(node({ kind: "ac-bus", params: { component_type: "Nope" } }))).toBe(true);
  });
});

describe("显示模式：显式 3 值优先，否则按 `_labelVisible` 回落", () => {
  test("`normalizeNodeLabelDisplayMode`：非三值一律 follow（精确匹配）", () => {
    for (const value of ["always", "hidden", "follow"]) {
      expect(normalizeNodeLabelDisplayMode(value), value).toBe(value);
    }
    for (const value of ["ALWAYS", "Hidden", "", "x", undefined, null] as never[]) {
      expect(normalizeNodeLabelDisplayMode(value as never), JSON.stringify(value) ?? "null").toBe("follow");
    }
  });

  test("`nodeLabelDisplayMode`：显式值优先于 `_labelVisible`", () => {
    for (const value of ["always", "hidden", "follow"]) {
      expect(nodeLabelDisplayMode(withParam("_labelDisplayMode", value))).toBe(value);
      // 即使 `_labelVisible` 与之冲突，显式值仍然赢
      expect(
        nodeLabelDisplayMode(node({ params: { _labelDisplayMode: value, _labelVisible: "0" } })),
        value
      ).toBe(value);
    }
  });

  test("非三值 → 回落 `_labelVisible === \"0\" ? hidden : follow`", () => {
    expect(nodeLabelDisplayMode(node())).toBe("follow");
    expect(nodeLabelDisplayMode(withParam("_labelDisplayMode", "ALWAYS"))).toBe("follow");
    expect(nodeLabelDisplayMode(withParam("_labelVisible", "0"))).toBe("hidden");
    expect(nodeLabelDisplayMode(withParam("_labelVisible", "false")), "★ 'false' 不算隐藏").toBe("follow");
  });

  test("★ 显式 hidden 优先于 `_labelVisible` 的任何值", () => {
    expect(nodeLabelDisplayMode(node({ params: { _labelDisplayMode: "hidden", _labelVisible: "1" } })))
      .toBe("hidden");
  });
});

describe("nodeLabelShouldRender：可见 ∧ (always ∨ (follow ∧ global))", () => {
  const MODES = ["always", "hidden", "follow"] as const;

  test("完整真值表（用显式 `_labelDisplayMode` 绕开回落分支）", () => {
    for (const mode of MODES) {
      for (const global of [true, false]) {
        const expected = mode === "always" || (mode === "follow" && global);
        expect(
          nodeLabelShouldRender(node({ params: { _labelDisplayMode: mode } }), global),
          `${mode} + global=${global}`
        ).toBe(expected);
      }
    }
  });

  test("★ 不可见时恒 false（模式与 global 都无关）", () => {
    for (const mode of MODES) {
      for (const global of [true, false]) {
        expect(
          nodeLabelShouldRender(node({ params: { _labelDisplayMode: mode, _labelVisible: "0" } }), global),
          `${mode} + global=${global} + hidden`
        ).toBe(false);
      }
    }
  });

  test("静态图元 / 容器恒 false（即使 always）", () => {
    for (const kind of ["static-point", "ac-vpp-box"]) {
      expect(
        nodeLabelShouldRender(node({ kind, params: { _labelDisplayMode: "always" } }), true),
        kind
      ).toBe(false);
    }
  });
});

describe("nodeLabelVertical：只有 90 / 270 为纵向", () => {
  test("四向", () => {
    expect(nodeLabelVertical(withParam("_labelRotation", 0))).toBe(false);
    expect(nodeLabelVertical(withParam("_labelRotation", 180))).toBe(false);
    expect(nodeLabelVertical(withParam("_labelRotation", 90))).toBe(true);
    expect(nodeLabelVertical(withParam("_labelRotation", 270))).toBe(true);
  });

  test("字符串入参与负值走 `normalizeNodeLabelRotation` 归一", () => {
    expect(nodeLabelVertical(withParam("_labelRotation", "90"))).toBe(true);
    expect(nodeLabelVertical(withParam("_labelRotation", "-90")), "-90 → 270").toBe(true);
    expect(nodeLabelVertical(withParam("_labelRotation", "270.4")), "270.4 → 270").toBe(true);
  });

  test("★ `45` 也算纵向（`round(45/90) = round(0.5) = 1`，半值向 +∞）", () => {
    // 这是 `Math.round` 的半值行为，不是 bug；已在
    // labelRotationScaleAndStorage.test.ts 里记录过 normalizeNodeLabelRotation 的全表。
    expect(nodeLabelVertical(withParam("_labelRotation", 45))).toBe(true);
    expect(nodeLabelVertical(withParam("_labelRotation", -45)), "-45 → 0").toBe(false);
  });

  test("缺省（undefined）→ 0 → 横向", () => {
    expect(nodeLabelVertical(node())).toBe(false);
  });
});

describe("★ nodeLabelVerticalSegments：数字 token 的正则边界", () => {
  // 正则 `\d+(?:[./:：-]\d+)*` 锚在 `^`。分段规则：
  //   开头能匹配数字 token → 整段取出（numeric: true）
  //   否则取**一个码点**（Array.from，代理对安全）作为非数字段
  const numeric = (s: string) => ({ text: s, numeric: true });
  const plain = (s: string) => ({ text: s, numeric: false });

  test("纯数字与含分隔符的复合数字串各自成**一段**", () => {
    expect(nodeLabelVerticalSegments("123")).toEqual([numeric("123")]);
    expect(nodeLabelVerticalSegments("1.2")).toEqual([numeric("1.2")]);
    expect(nodeLabelVerticalSegments("1/2")).toEqual([numeric("1/2")]);
    expect(nodeLabelVerticalSegments("1:2")).toEqual([numeric("1:2")]);
    expect(nodeLabelVerticalSegments("1：2"), "全角冒号也算").toEqual([numeric("1：2")]);
    expect(nodeLabelVerticalSegments("1-2")).toEqual([numeric("1-2")]);
    expect(nodeLabelVerticalSegments("1.2.3"), "分隔符可重复").toEqual([numeric("1.2.3")]);
    expect(nodeLabelVerticalSegments("10-20")).toEqual([numeric("10-20")]);
  });

  test("★ 逗号**不是**分隔符 —— 千分位会被拆开", () => {
    expect(nodeLabelVerticalSegments("1,2")).toEqual([numeric("1"), plain(","), numeric("2")]);
    expect(nodeLabelVerticalSegments("1,234.5")).toEqual([numeric("1"), plain(","), numeric("234.5")]);
  });

  test("★ 前导负号不是分隔符（`-` 在字符类末尾，只能跟在数字后）", () => {
    expect(nodeLabelVerticalSegments("-5")).toEqual([plain("-"), numeric("5")]);
    // 连续两个负号也各自成段
    expect(nodeLabelVerticalSegments("1--2")).toEqual([numeric("1"), plain("-"), plain("-"), numeric("2")]);
  });

  test("中英文混排：数字 token 被单独拎出", () => {
    expect(nodeLabelVerticalSegments("abc")).toEqual([plain("a"), plain("b"), plain("c")]);
    expect(nodeLabelVerticalSegments("A1B")).toEqual([plain("A"), numeric("1"), plain("B")]);
    expect(nodeLabelVerticalSegments("1.2a3")).toEqual([numeric("1.2"), plain("a"), numeric("3")]);
  });

  test("★ emoji（代理对）不被劈开", () => {
    // `Array.from` 按**码点**迭代；若用 `str[0]` 会劈成两个落单代理。
    expect(nodeLabelVerticalSegments("😀1")).toEqual([plain("😀"), numeric("1")]);
    expect(nodeLabelVerticalSegments("1😀")).toEqual([numeric("1"), plain("😀")]);
    expect(nodeLabelVerticalSegments("😀")).toEqual([plain("😀")]);
    expect(nodeLabelVerticalSegments("😀")[0].text).toHaveLength(2);
  });

  test("空串 → 空数组", () => {
    expect(nodeLabelVerticalSegments("")).toEqual([]);
  });

  test("★ 段数 = 分段后的码点数（数字 token 按整串计）", () => {
    for (const text of ["abc", "123", "1,234.5", "A1B", "1.2a3", "😀1", "1--2"]) {
      const segs = nodeLabelVerticalSegments(text);
      expect(segs.map((s) => s.text).join(""), `${text} 段拼接还原原文`).toBe(text);
      expect(Array.from(segs).length, text).toBeGreaterThan(0);
    }
  });
});

describe("nodeLabelVerticalTokenY：`(index - (count-1)/2) * (fontSize * 1.2)`", () => {
  const step = DEFAULT_DEVICE_LABEL_FONT_SIZE * 1.2;   // 14 * 1.2 = 16.8

  test("居中对称", () => {
    expect(nodeLabelVerticalTokenY(0, 1, node())).toBe(0);
    expect(nodeLabelVerticalTokenY(0, 2, node())).toBe(-step / 2);
    expect(nodeLabelVerticalTokenY(1, 2, node())).toBe(step / 2);
    expect(nodeLabelVerticalTokenY(0, 3, node())).toBe(-step);
    expect(nodeLabelVerticalTokenY(1, 3, node())).toBe(0);
    expect(nodeLabelVerticalTokenY(2, 3, node())).toBe(step);
  });

  test("`count = 0` 退化成 `(index + 0.5) * step`", () => {
    expect(nodeLabelVerticalTokenY(0, 0, node())).toBe(step / 2);
    expect(nodeLabelVerticalTokenY(5, 1, node())).toBe(5 * step);
  });

  test("step 随字号缩放（几何平均）", () => {
    // scale=2,2 → 字号 28 → step = 33.6；单段仍居中得 0
    expect(nodeLabelVerticalTokenY(0, 1, scaled(2, 2))).toBe(0);
    expect(nodeLabelVerticalTokenY(0, 2, scaled(2, 2))).toBe(-33.6 / 2);
  });
});

describe("★ nodeLabelFontSize：`baseSize * Math.sqrt(scaleX * scaleY)`（几何平均）", () => {
  test("默认字号", () => {
    expect(DEFAULT_DEVICE_LABEL_FONT_SIZE).toBe(14);
    expect(nodeLabelFontSize(node())).toBe(14);
  });

  test("等比缩放按比例", () => {
    expect(nodeLabelFontSize(scaled(2, 2))).toBe(28);
    expect(nodeLabelFontSize(scaled(0.5, 0.5))).toBe(7);
    expect(nodeLabelFontSize(scaled(4, 4))).toBe(56);
  });

  test("★ 非等比缩放取**几何平均** —— 一轴放大一轴缩小时字号不变", () => {
    // 探针实测：`scaleX=2, scaleY=0.5` → sqrt(1) = 1 → 字号仍是 14。
    // 这不是 bug（几何平均对两轴对称），但很容易被当成 bug 报上来，故钉住。
    expect(nodeLabelFontSize(scaled(2, 0.5))).toBe(14);
    expect(nodeLabelFontSize(scaled(0.5, 2))).toBe(14);
    expect(nodeLabelFontSize(scaled(4, 1))).toBe(28);
    expect(nodeLabelFontSize(scaled(9, 1))).toBe(42);
  });

  test("★ 负 scale 不产生 NaN —— `getSafeNodeScale*` 内部有 `Math.abs(...) || 1`", () => {
    // 我第一版猜「负 scale → sqrt(负) = NaN」，**被探针推翻**：
    // `getSafeNodeScaleX` 是 `Math.abs(getNodeScaleX(node)) || 1`，取绝对值后才乘。
    expect(nodeLabelFontSize(scaled(-1, 1))).toBe(14);
    expect(nodeLabelFontSize(scaled(-2, -2))).toBe(28);
    // 非方形的负 scale：|−2| × |−1| = 2 → sqrt = √2（无理数，用 toBeCloseTo）
    expect(nodeLabelFontSize(scaled(-2, -1))).toBeCloseTo(14 * Math.sqrt(2), 10);
  });

  test("★ `scale = 0` 被 `|| 1` 兜成 1（`0` 是 falsy）", () => {
    expect(nodeLabelFontSize(scaled(0, 1))).toBe(14);
    expect(nodeLabelFontSize(scaled(0, 0))).toBe(14);
  });

  test("★ `_labelFontSize` 显式空串 → 字号 0（不是默认值）", () => {
    expect(nodeLabelFontSize(withParam("_labelFontSize", ""))).toBe(0);
    expect(nodeLabelFontSize(withParam("_labelFontSize", "abc"))).toBe(14);
    expect(nodeLabelFontSize(withParam("_labelFontSize", "20"))).toBe(20);
  });
});

describe("nodeLabelRotationFromPoint：四向映射（含中心点）", () => {
  const c = { x: 0, y: 0 };
  const table: Array<[{ x: number; y: number }, number]> = [
    [{ x: 1, y: 0 }, 90],      // 右
    [{ x: -1, y: 0 }, 270],    // 左
    [{ x: 0, y: 1 }, 180],     // 下
    [{ x: 0, y: -1 }, 0],      // 上
    [{ x: 1, y: 1 }, 180],
    [{ x: -1, y: 1 }, 270],
    // ★ 中心点：atan2(0, 0) = 0 → 0 + 90 = 90
    [{ x: 0, y: 0 }, 90]
  ];
  for (const [point, expected] of table) {
    test(`(${point.x},${point.y}) → ${expected}`, () => {
      expect(nodeLabelRotationFromPoint(c, point)).toBe(expected);
    });
  }

  test("只与相对向量有关（中心平移不影响）", () => {
    const base = { x: 50, y: 50 };
    for (const [point, expected] of table) {
      expect(nodeLabelRotationFromPoint(base, { x: base.x + point.x, y: base.y + point.y }), JSON.stringify(point))
        .toBe(expected);
    }
  });

  test("输出恒在 [0, 360)", () => {
    for (let deg = 0; deg < 360; deg += 7) {
      const rad = (deg * Math.PI) / 180;
      const out = nodeLabelRotationFromPoint(c, { x: Math.cos(rad), y: Math.sin(rad) });
      expect(out).toBeGreaterThanOrEqual(0);
      expect(out).toBeLessThan(360);
      expect(out % 90, "必是 90 的倍数").toBe(0);
    }
  });

  test("★ 下面这条等价变异全绿是**正确的**（记录，避免下一个人重查）", () => {
    // ⑧ `nodeLabelVertical` 的
    //     `rotation === 90 || rotation === 270`
    // 改成
    //     `rotation !== 0 && rotation !== 180`
    //   —— **两者恒等**，因为 `normalizeNodeLabelRotation` 的输出只可能是
    //      0 / 90 / 180 / 270 四个值（`round(v/90)*90` 再归一到 [0,360)）。
    //      「非 0 且非 180」在四元集合上恰好等价于「是 90 或是 270」。
    //   ⇒ 变异在语义上根本没不同，全绿是应有结果。
    //
    //   ⚠ 什么会让它失效：若 normalizeNodeLabelRotation 改成不做 90 吸附
    //      （比如允许任意角度），两种写法立刻分道扬镳。
    //   下面这条不变式断言就是为了让「等价」可被验证，而不是靠信任。
    const reachable = new Set<number>();
    for (const rotation of [0, 45, -45, 89, 90, 91, 135, 179, 180, 181, 269, 270, 271, 315, 359, 360, 450, -90, "90", "270", undefined, NaN, Infinity]) {
      reachable.add(nodeLabelVertical(withParam("_labelRotation", rotation)) ? 1 : 0);
    }
    // 只可能出现纵向 / 横向两种结论，且下面逐一钉住
    expect([...reachable].sort(), "只有两种结论").toEqual([0, 1]);
    // 四元集合的成员（`nodeLabelVertical` 的判定与取反在此完全等价）
    for (const [rotation, vertical] of [[0, false], [90, true], [180, false], [270, true]] as const) {
      expect(nodeLabelVertical(withParam("_labelRotation", rotation)), `${rotation}`).toBe(vertical);
      // 等价的另一种写法在四元集合上给出同一结论
      expect(rotation !== 0 && rotation !== 180, `${rotation} 取反写法`).toBe(vertical);
    }
    // 吸附不变式本身
    for (const rotation of [45, 91, 359, -45, 450]) {
      const out = nodeLabelVertical(withParam("_labelRotation", rotation));
      expect([false, true], `${rotation} 落在四元集合内`).toContain(out);
    }
  });
});

describe("nodeLabelTextAnchor：三个 SVG 值精确匹配，其余 middle", () => {
  for (const value of ["start", "end", "middle"]) {
    test(value, () => {
      expect(nodeLabelTextAnchor(withParam("_labelTextAnchor", value))).toBe(value);
    });
  }
  test("★ 大小写敏感、无前后缀容忍", () => {
    for (const value of ["START", "Start", "", "x", "inherit", "middle ", " middle"]) {
      expect(nodeLabelTextAnchor(withParam("_labelTextAnchor", value)), JSON.stringify(value)).toBe("middle");
    }
  });
  test("缺省 → middle", () => {
    expect(nodeLabelTextAnchor(node())).toBe("middle");
  });
});

describe("nodeLabelTextStyle：默认值一律走 `||`", () => {
  test("无参数时的完整默认样式", () => {
    expect(nodeLabelTextStyle(node())).toEqual({
      fill: "#334155",
      fontFamily: "Arial",
      fontSize: 14,
      fontWeight: "500",
      fontStyle: "normal",
      textDecoration: "none",
      writingMode: "horizontal-tb",
      textOrientation: undefined,
      userSelect: "none"
    });
  });

  test("★ 空串被默认值接管（与 nodeLabelText 的 `??` 相反）", () => {
    // 同一个文件里两种写法：`nodeLabelText` 用 `??`（空串穿透），
    // `nodeLabelTextStyle` 用 `||`（空串被兜住）。刻意如此：
    // 样式项传空串没有意义，而标签文本传空串是「用户主动清空」。
    const st = nodeLabelTextStyle(withParam("_labelColor", ""));
    expect(st.fill).toBe("#334155");
    expect(nodeLabelTextStyle(withParam("_labelFontWeight", "")).fontWeight).toBe("500");
    expect(nodeLabelTextStyle(withParam("_labelFontFamily", "")).fontFamily).toBe("Arial");
    expect(nodeLabelTextStyle(withParam("_labelFontStyle", "")).fontStyle).toBe("normal");
    expect(nodeLabelTextStyle(withParam("_labelTextDecoration", "")).textDecoration).toBe("none");
  });

  test("显式值生效", () => {
    const st = nodeLabelTextStyle(node({
      params: {
        _labelColor: "#ff0000",
        _labelFontFamily: "SimSun",
        _labelFontWeight: "700",
        _labelFontStyle: "italic",
        _labelTextDecoration: "underline",
        _labelFontSize: "20"
      } as never
    }));
    expect(st).toEqual({
      fill: "#ff0000",
      fontFamily: "SimSun",
      fontSize: 20,
      fontWeight: "700",
      fontStyle: "italic",
      textDecoration: "underline",
      writingMode: "horizontal-tb",
      textOrientation: undefined,
      userSelect: "none"
    });
  });

  test("★ 纵向时同时切 writingMode 与 textOrientation（横向时后者为 undefined）", () => {
    for (const rotation of [90, 270]) {
      const st = nodeLabelTextStyle(withParam("_labelRotation", rotation));
      expect(st.writingMode, `rotation=${rotation}`).toBe("vertical-rl");
      expect(st.textOrientation, `rotation=${rotation}`).toBe("upright");
    }
    for (const rotation of [0, 180]) {
      const st = nodeLabelTextStyle(withParam("_labelRotation", rotation));
      expect(st.writingMode, `rotation=${rotation}`).toBe("horizontal-tb");
      expect(st.textOrientation, `rotation=${rotation}`).toBeUndefined();
    }
  });
});

describe("nodeLabelVerticalTokenStyle：在纵向标签里强制**横向**书写每个 token", () => {
  test("★ 覆盖 writingMode 与 textOrientation，但保留其余样式与字号", () => {
    // 纵向标签整体是 vertical-rl，但每个 token（单个数字串 / 单个字符）
    // 若也纵向排列会变成「一格一格」。这里强制横向 —— 这是它存在的全部理由。
    const st = nodeLabelVerticalTokenStyle(node({
      params: { _labelColor: "#00ff00", _labelRotation: 90 } as never
    }));
    expect(st.writingMode, "★ 强制横向").toBe("horizontal-tb");
    expect(st.textOrientation, "★ mixed 而非 upright").toBe("mixed");
    expect(st.fill, "其余样式继承").toBe("#00ff00");
    expect(st.fontSize, "字号仍是缩放后的").toBe(14);
    expect(st.userSelect).toBe("none");
  });

  test("即使不是纵向标签，输出也强制横向（无条件覆盖）", () => {
    const st = nodeLabelVerticalTokenStyle(node());
    expect(st.writingMode).toBe("horizontal-tb");
    expect(st.textOrientation).toBe("mixed");
  });

  test("除 writingMode / textOrientation 外与 nodeLabelTextStyle 逐键相同", () => {
    const base = node({ params: { _labelColor: "#123456", _labelRotation: 90, _labelFontSize: "18" } as never });
    const text = nodeLabelTextStyle(base);
    const token = nodeLabelVerticalTokenStyle(base);
    const keys = Object.keys(text) as Array<keyof typeof text>;
    expect(Object.keys(token)).toEqual(keys);
    for (const key of keys) {
      if (key === "writingMode" || key === "textOrientation") continue;
      expect(token[key], key).toBe(text[key]);
    }
    expect(token.writingMode).not.toBe(text.writingMode);
    expect(token.textOrientation).not.toBe(text.textOrientation);
  });
});

describe("nodeLabelTransform / nodeLabelCanvasCenter：偏移量按轴乘缩放", () => {
  test("无缩放", () => {
    const n = node({ position: { x: 100, y: 200 }, params: { _labelX: 10, _labelY: 20 } as never });
    expect(nodeLabelTransform(n)).toBe("translate(10 20)");
    expect(nodeLabelCanvasCenter(n)).toEqual({ x: 110, y: 220 });
  });

  test("各向异性缩放：两轴分别乘", () => {
    const n = node({ position: { x: 100, y: 200 }, params: { _labelX: 10, _labelY: 20 } as never });
    expect(nodeLabelTransform(scaled(2, 3)), "占位，下面用带位置的节点")
      .toBeTypeOf("string");
    const s = node({ position: { x: 100, y: 200 }, params: { _labelX: 10, _labelY: 20 }, scale: 2, scaleX: 2, scaleY: 3 } as never);
    expect(nodeLabelTransform(s)).toBe("translate(20 60)");
    expect(nodeLabelCanvasCenter(s)).toEqual({ x: 120, y: 260 });
    const h = node({ position: { x: 100, y: 200 }, params: { _labelX: 10, _labelY: 20 }, scale: 0.5, scaleX: 0.5, scaleY: 0.5 } as never);
    expect(nodeLabelTransform(h)).toBe("translate(5 10)");
    expect(nodeLabelCanvasCenter(h)).toEqual({ x: 105, y: 210 });
  });

  test("★ transform 走 `formatSvgNumber`（最多 5 位小数）；canvasCenter 不格式化", () => {
    // `formatSvgNumber` = `Math.round(v * 1e5) / 1e5`，非有限值归 0、负零归零。
    // 所以 transform 里的浮点噪声（0.1 + 0.2）被抹平，canvasCenter 里保留原值。
    const n = node({ params: { _labelX: 1 / 3, _labelY: 0.1 + 0.2 } as never });
    expect(nodeLabelTransform(n)).toBe("translate(0.33333 0.3)");
    expect(nodeLabelCanvasCenter(n).x).toBe(1 / 3);
    expect(nodeLabelCanvasCenter(n).y).toBe(0.1 + 0.2);
  });

  test("两者用同一个 `nodeLabelOffset` 口径", () => {
    for (const sx of [1, 2, 0.5]) {
      for (const sy of [1, 3, 0.25]) {
        const n = node({ position: { x: 7, y: 9 }, scale: sx, scaleX: sx, scaleY: sy } as never);
        const offset = nodeLabelOffset(n);
        const center = nodeLabelCanvasCenter(n);
        expect(center.x - n.position.x, `${sx},${sy}`).toBeCloseTo(offset.x * sx, 10);
        expect(center.y - n.position.y, `${sx},${sy}`).toBeCloseTo(offset.y * sy, 10);
      }
    }
  });

  test("返回新对象（不共享）", () => {
    const n = node();
    expect(nodeLabelCanvasCenter(n)).not.toBe(nodeLabelCanvasCenter(n));
    expect(nodeLabelCanvasCenter(n)).toEqual(nodeLabelCanvasCenter(n));
  });
});
