// model-routing 里三个此前零断言的纯函数：节点电压取值、母线端子类型查表、端子法向量。
// 三者都不抛异常，判错的后果分别是「电压显示成空」「母线端子类型退化成 undefined」「线从设备侧边引出」，
// 所以全部按契约钉住。
import { describe, expect, test } from "vitest";

import { busTerminalTypeByKind, getNodeVoltageLevel, getTerminalNormal } from "./model-routing";
import type { ModelNode, Terminal } from "./model";

const terminal = (id: string, anchorX: number, anchorY: number, type: Terminal["type"] = "ac"): Terminal =>
  ({ id, label: id.slice(1), type, anchor: { x: anchorX, y: anchorY } }) as Terminal;

const node = (extra: Partial<ModelNode> = {}): ModelNode =>
  ({
    id: "n1",
    kind: "ac-load",
    name: "n1",
    nodeNumber: "1",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    rotation: 0,
    scale: 1,
    terminals: [terminal("t1", 0, -55)],
    params: {},
    ...extra
  }) as unknown as ModelNode;

describe("busTerminalTypeByKind", () => {
  test("内建母线 / 储罐按 kind 给出端子类型", () => {
    expect(busTerminalTypeByKind("ac-bus")).toBe("ac");
    expect(busTerminalTypeByKind("dc-bus")).toBe("dc");
    expect(busTerminalTypeByKind("hydrogen-bus")).toBe("h2");
    expect(busTerminalTypeByKind("heat-bus")).toBe("heat");
    expect(busTerminalTypeByKind("hydrogen-tank")).toBe("h2");
    expect(busTerminalTypeByKind("hydrogen-tank-horizontal")).toBe("h2");
    expect(busTerminalTypeByKind("hydrogen-tank-container")).toBe("h2");
    expect(busTerminalTypeByKind("thermal-storage-tank")).toBe("heat");
  });

  test("竖式派生 kind（-vertical 后缀）剥掉后缀再查表", () => {
    expect(busTerminalTypeByKind("ac-bus-vertical")).toBe("ac");
    expect(busTerminalTypeByKind("hydrogen-tank-vertical")).toBe("h2");
    // 后缀之外的形式不参与回落：只认 baseDeviceKind 认得的那一种
    expect(busTerminalTypeByKind("ac-bus:derived:x")).toBeUndefined();
  });

  test("非母线 kind 与空串返回 undefined（调用方据此判「不是母线」）", () => {
    expect(busTerminalTypeByKind("ac-load")).toBeUndefined();
    expect(busTerminalTypeByKind("ac-load:derived:wind")).toBeUndefined();
    expect(busTerminalTypeByKind("")).toBeUndefined();
  });
});

describe("getNodeVoltageLevel", () => {
  const levelOf = (params: Record<string, string>) => getNodeVoltageLevel(node({ params }));

  test("六个键按固定优先级取值", () => {
    expect(levelOf({ vbase: "10.5" })).toBe("10.5");
    expect(levelOf({ voltageLevel: "35" })).toBe("35");
    expect(levelOf({ ratedVoltage: "110" })).toBe("110");
    expect(levelOf({ voltage: "220" })).toBe("220");
    expect(levelOf({ acVoltage: "380" })).toBe("380");
    expect(levelOf({ dcVoltage: "750" })).toBe("750");
    // 全给上时取 vbase
    expect(levelOf({ vbase: "1", voltageLevel: "2", ratedVoltage: "3", voltage: "4", acVoltage: "5", dcVoltage: "6" })).toBe("1");
  });

  test("单位后缀被剥掉：10.5kV / 35kV / 10.5KV 都是纯数字", () => {
    expect(levelOf({ vbase: "10.5kV" })).toBe("10.5");
    expect(levelOf({ vbase: "35kV" })).toBe("35");
    expect(levelOf({ vbase: "10.5KV" })).toBe("10.5");
  });

  test("空白被压掉并转小写：'  35   KV ' → 35", () => {
    expect(levelOf({ vbase: "  35   KV " })).toBe("35");
    expect(levelOf({ vbase: "AC" })).toBe("ac");
  });

  test("★ 空串会挡住后面的键（?? 只对 null/undefined 回落）", () => {
    // 这是取值链最容易踩的坑：vbase 存在但为空时，voltageLevel 里的有效值永远取不到
    expect(levelOf({ vbase: "", voltageLevel: "35" })).toBe("");
    expect(levelOf({ vbase: "0", voltageLevel: "35" })).toBe("0");
  });

  test("非数值文本原样小写返回（不吞、不报错）", () => {
    expect(levelOf({ vbase: "低压" })).toBe("低压");
    expect(levelOf({ vbase: "HIGH" })).toBe("high");
  });

  test("★ 兜底分支（非数值文本）才体现空白压缩：'高压 侧' → '高压侧'", () => {
    // terminalVoltageBaseNumber 对纯文本返回空串，这一组全部走 `|| (value ?? "").trim().toLowerCase().replace(...)`
    // —— 上面那些数字用例走的是前一分支，测不到压缩/小写
    expect(levelOf({ vbase: "高压 侧" })).toBe("高压侧");
    expect(levelOf({ vbase: "  AC 侧 " })).toBe("ac侧");
    // 内部连续空白只有 replace(/\s+/g, "") 能压
    expect(levelOf({ vbase: "高  压" })).toBe("高压");
    // .trim() 本身不能作为覆盖证据：删掉后本组仍全绿 —— replace(/\s+/g, "") 已吞掉首尾空白，
    // 源码自身不可观测。
  });

  test("一个键都没有时返回空串", () => {
    expect(levelOf({})).toBe("");
  });
});

describe("getTerminalNormal", () => {
  // 旋转用的是 cos/sin 的浮点值，Math.round 会把 -6.1e-17 收成 -0。
  // -0 与 0 在数值上等价（Object.is 之外无差别），这里统一加 0 归一，只为断言可读。
  const normalOf = (target: ModelNode, terminalId?: string) => {
    const value = getTerminalNormal(target, terminalId);
    return { x: value.x + 0, y: value.y + 0 };
  };

  test("默认端子在上方：不旋转时法线是 (0,-1)", () => {
    expect(normalOf(node())).toEqual({ x: 0, y: -1 });
  });

  test("随节点旋转：90° → (1,0)、180° → (0,1)、270° → (-1,0)、-90° → (-1,0)", () => {
    expect(normalOf(node({ rotation: 90 }))).toEqual({ x: 1, y: 0 });
    expect(normalOf(node({ rotation: 180 }))).toEqual({ x: 0, y: 1 });
    expect(normalOf(node({ rotation: 270 }))).toEqual({ x: -1, y: 0 });
    expect(normalOf(node({ rotation: -90 }))).toEqual({ x: -1, y: 0 });
  });

  test("45° 这类非直角旋转保留成对角分量（Math.round 到 ±1）", () => {
    // 不是四舍五入成单一轴 —— 法线必须保持旋转后的单位向量形状，否则线会偏出 45°
    expect(normalOf(node({ rotation: 45 }))).toEqual({ x: 1, y: -1 });
  });

  test("取绝对值更大的那个轴：横向锚点出 (1,0)，纵向锚点出 (0,±1)", () => {
    expect(normalOf(node({ terminals: [terminal("t1", 55, 0)] }))).toEqual({ x: 1, y: 0 });
    expect(normalOf(node({ terminals: [terminal("t1", 0, 55)] }))).toEqual({ x: 0, y: 1 });
  });

  test("两轴绝对值相等时判 x 轴", () => {
    expect(normalOf(node({ terminals: [terminal("t1", 30, 30)] }))).toEqual({ x: 1, y: 0 });
  });

  test("★ 零锚点判 +x 而不是 (0,0)：0 || 1 的兜底", () => {
    // Math.sign(0) 是 0，会让法线整个塌成 (0,0)；这里靠 `x || 1` 兜成 +x
    expect(normalOf(node({ terminals: [terminal("t1", 0, 0)] }))).toEqual({ x: 1, y: 0 });
  });

  test("负 scale 把法线镜像（镜像后端子挪到了另一侧）", () => {
    expect(normalOf(node({ scale: -1, terminals: [terminal("t1", 55, 0)] }))).toEqual({ x: -1, y: 0 });
    // 纵向锚点走 sign(getNodeScaleY) 那一条：负 scale 下顶部端子被镜像到下方
    expect(normalOf(node({ scale: -1, terminals: [terminal("t1", 0, -55)] }))).toEqual({ x: 0, y: 1 });
  });

  test("scale 为 0 时 Math.sign 给出 0，靠 || 1 兜成不缩放", () => {
    // Math.sign(0) === 0 会把法线整个塌成 (0,0)
    expect(normalOf(node({ scale: 0, terminals: [terminal("t1", 0, -55)] }))).toEqual({ x: 0, y: -1 });
    expect(normalOf(node({ scale: 0, terminals: [terminal("t1", 55, 0)] }))).toEqual({ x: 1, y: 0 });
  });

  test("指定 terminalId 时按那一枚端子算；认不到时回落到 t1", () => {
    const twoTerminals = node({
      terminals: [terminal("t1", 0, -55), terminal("t2", 0, 55)]
    });

    expect(normalOf(twoTerminals, "t2")).toEqual({ x: 0, y: 1 });
    expect(normalOf(twoTerminals, "不存在")).toEqual({ x: 0, y: -1 });
  });

  test("无端子且不是母线时抛 TypeError（getTerminal 最后一环是 node.terminals[0]）", () => {
    // 如实记录：这里不是「优雅返回 undefined」，调用方必须自己保证节点有端子
    expect(() => getTerminalNormal(node({ terminals: [] }))).toThrow(/anchor/u);
  });

  test("无端子但 kind 是母线：虚拟端子仍给出法线（向左）", () => {
    expect(normalOf(node({ kind: "ac-bus", terminals: [] }))).toEqual({ x: -1, y: 0 });
  });
});