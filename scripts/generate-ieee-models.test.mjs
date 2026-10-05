import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildProject,
  routableLinePointsParam,
  routableLineSourceLocalPointParam,
  routableLineSourceNodeParam,
  routableLineSourceTerminalParam,
  routableLineTargetLocalPointParam,
  routableLineTargetNodeParam,
  routableLineTargetTerminalParam
} from "./generate-ieee-models.mjs";

const busRow = (busNo, baseKv = 110, pd = 0, qd = 0) => [busNo, 1, pd, qd, 0, 0, 0, 1, 0, baseKv];
const genRow = (busNo) => [busNo, 10, 0, 0, 0, 1, 0, 1];
const branchRow = (fromBus, toBus) => [fromBus, toBus, 0.01, 0.1, 0, 0, 0, 0, 0, 0, 1];

const parsePoints = (value) => JSON.parse(value);

const roundedPoint = (point) => ({
  x: Math.round(point.x * 10) / 10,
  y: Math.round(point.y * 10) / 10
});

const busTerminalPoint = (bus, terminalId) => {
  const terminal = bus.terminals.find((item) => item.id === terminalId);
  const width = bus.size.width * Math.abs(bus.scaleX ?? bus.scale ?? 1);
  return roundedPoint({
    x: bus.position.x + terminal.anchor.x * width,
    y: bus.position.y
  });
};

const worldRoutableLinePoints = (line) =>
  parsePoints(line.params[routableLinePointsParam]).map((point) => roundedPoint({
    x: line.position.x + point.x,
    y: line.position.y + point.y
  }));

const terminalWorldPoint = (node, terminalId = "t1") => {
  const terminal = node.terminals.find((item) => item.id === terminalId);
  const width = node.size.width * Math.abs(node.scaleX ?? node.scale ?? 1);
  const height = node.size.height * Math.abs(node.scaleY ?? node.scale ?? 1);
  const radians = ((node.rotation ?? 0) * Math.PI) / 180;
  const local = {
    x: terminal.anchor.x * width,
    y: terminal.anchor.y * height
  };
  return roundedPoint({
    x: node.position.x + local.x * Math.cos(radians) - local.y * Math.sin(radians),
    y: node.position.y + local.x * Math.sin(radians) + local.y * Math.cos(radians)
  });
};

const expectOrthogonalPolyline = (points) => {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    expect(previous.x === current.x || previous.y === current.y).toBe(true);
  }
};

const expectStartPerpendicularToBus = (points) => {
  expect(points.length).toBeGreaterThanOrEqual(2);
  expect(points[1].x).toBe(points[0].x);
  expect(points[1].y).not.toBe(points[0].y);
};

const expectEndPerpendicularToBus = (points) => {
  expect(points.length).toBeGreaterThanOrEqual(2);
  const previous = points.at(-2);
  const last = points.at(-1);
  expect(previous.x).toBe(last.x);
  expect(previous.y).not.toBe(last.y);
};

const expectEvenlyDistributedTerminals = (bus) => {
  const anchors = bus.terminals.map((terminal) => terminal.anchor.x);
  expect(anchors.at(0)).toBeCloseTo(-0.48, 6);
  expect(anchors.at(-1)).toBeCloseTo(0.48, 6);
  const spacing = anchors[1] - anchors[0];
  for (let index = 2; index < anchors.length; index += 1) {
    expect(anchors[index] - anchors[index - 1]).toBeCloseTo(spacing, 6);
  }
};

describe("IEEE model generator", () => {
  test("routes generated branch devices from distributed bus terminals with orthogonal segments", () => {
    const project = buildProject(
      { modelName: "IEEE14", title: "IEEE 14 Bus Test Case" },
      {
        baseMva: 100,
        bus: [busRow(1), busRow(2)],
        gen: [],
        branch: [branchRow(1, 2), branchRow(1, 2), branchRow(1, 2), branchRow(1, 2)]
      }
    );
    const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
    const lines = project.nodes.filter((node) => node.kind === "ac-routable-line");
    const sourcePoints = [];
    const targetPoints = [];

    expect(lines).toHaveLength(4);
    expectEvenlyDistributedTerminals(nodeById.get("ieee14-bus-1"));
    expectEvenlyDistributedTerminals(nodeById.get("ieee14-bus-2"));
    for (const line of lines) {
      const sourceBus = nodeById.get(line.params[routableLineSourceNodeParam]);
      const targetBus = nodeById.get(line.params[routableLineTargetNodeParam]);
      const sourceTerminalId = line.params[routableLineSourceTerminalParam];
      const targetTerminalId = line.params[routableLineTargetTerminalParam];
      const expectedSourcePoint = busTerminalPoint(sourceBus, sourceTerminalId);
      const expectedTargetPoint = busTerminalPoint(targetBus, targetTerminalId);
      const sourceLocalPoint = parsePoints(line.params[routableLineSourceLocalPointParam])[0];
      const targetLocalPoint = parsePoints(line.params[routableLineTargetLocalPointParam])[0];
      const routePoints = worldRoutableLinePoints(line);

      expect(sourceLocalPoint).toEqual(roundedPoint({
        x: expectedSourcePoint.x - sourceBus.position.x,
        y: expectedSourcePoint.y - sourceBus.position.y
      }));
      expect(targetLocalPoint).toEqual(roundedPoint({
        x: expectedTargetPoint.x - targetBus.position.x,
        y: expectedTargetPoint.y - targetBus.position.y
      }));
      expect(routePoints[0]).toEqual(expectedSourcePoint);
      expect(routePoints.at(-1)).toEqual(expectedTargetPoint);
      expectOrthogonalPolyline(routePoints);
      expectStartPerpendicularToBus(routePoints);
      expectEndPerpendicularToBus(routePoints);
      sourcePoints.push(`${expectedSourcePoint.x},${expectedSourcePoint.y}`);
      targetPoints.push(`${expectedTargetPoint.x},${expectedTargetPoint.y}`);
    }
    expect(new Set(sourcePoints).size).toBe(4);
    expect(new Set(targetPoints).size).toBe(4);
  });

  test("rotates directional generators and loads so their terminal side faces the bus", () => {
    const project = buildProject(
      { modelName: "IEEE118", title: "IEEE 118 Bus Test Case" },
      {
        baseMva: 100,
        bus: [busRow(1, 110, 10, 3), busRow(12, 110, 10, 3)],
        gen: [genRow(12)],
        branch: []
      }
    );
    const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
    const edgeById = new Map(project.edges.map((edge) => [edge.id, edge]));
    const bus1 = nodeById.get("ieee118-bus-1");
    const bus12 = nodeById.get("ieee118-bus-12");
    const generator12 = nodeById.get("ieee118-gen-1");
    const load1 = nodeById.get("ieee118-load-1");
    const load12 = nodeById.get("ieee118-load-12");

    expect(generator12.rotation).toBe(180);
    expect(generator12.terminals[0].anchor).toEqual({ x: 0.5, y: 0 });
    expect(terminalWorldPoint(generator12)).toEqual({
      x: generator12.position.x - generator12.size.width / 2,
      y: generator12.position.y
    });
    expect(terminalWorldPoint(generator12).x).toBeLessThan(generator12.position.x);
    expect(Math.abs(terminalWorldPoint(generator12).x - bus12.position.x)).toBeLessThan(Math.abs(generator12.position.x - bus12.position.x));

    expect(load1.rotation).toBe(90);
    expect(load1.terminals[0].anchor).toEqual({ x: 0, y: -0.5 });
    expect(terminalWorldPoint(load1).x).toBeGreaterThan(load1.position.x);
    expect(Math.abs(terminalWorldPoint(load1).x - bus1.position.x)).toBeLessThan(Math.abs(load1.position.x - bus1.position.x));

    expect(load12.rotation).toBe(0);
    expect(load12.terminals[0].anchor).toEqual({ x: 0, y: -0.5 });
    expect(terminalWorldPoint(load12).y).toBeLessThan(load12.position.y);
    expect(Math.abs(terminalWorldPoint(load12).y - bus12.position.y)).toBeLessThan(Math.abs(load12.position.y - bus12.position.y));

    expectEndPerpendicularToBus(edgeById.get("ieee118-gen-1-edge").routePoints);
    expectStartPerpendicularToBus(edgeById.get("ieee118-load-1-edge").routePoints);
    expectStartPerpendicularToBus(edgeById.get("ieee118-load-12-edge").routePoints);
  });

  test("converts manual side anchors to rotations for generators and loads", () => {
    const project = buildProject(
      { modelName: "IEEE14", title: "IEEE 14 Bus Test Case" },
      {
        baseMva: 100,
        bus: [busRow(2, 110, 10, 3)],
        gen: [genRow(2)],
        branch: []
      }
    );
    const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
    const generator = nodeById.get("ieee14-gen-1");
    const load = nodeById.get("ieee14-load-2");

    expect(generator.rotation).toBe(90);
    expect(generator.terminals[0].anchor).toEqual({ x: 0.5, y: 0 });
    expect(terminalWorldPoint(generator).y).toBeGreaterThan(generator.position.y);

    expect(load.rotation).toBe(0);
    expect(load.terminals[0].anchor).toEqual({ x: 0, y: -0.5 });
    expect(terminalWorldPoint(load).y).toBeLessThan(load.position.y);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// effectiveBaseKv（第 720 行 `Number.isFinite(value) && value > 0 ? value : 100`）
//
// 契约有两条腿，缺一不可：
//   ① 缺 baseKv（行短于 10 列）/ baseKv 为 0 / 为负 → 回落 100；
//   ② baseKv 是**数字字符串**（buildProject 是 export，parsed 由调用方给，
//      parseMatrix 之后被改写并非不可能）→ Number.isFinite 为假 → 也回落 100。
// ② 是唯一能区分 `Number.isFinite(value) &&` 与裸 `value > 0` 的输入：
//    `"138" > 0` 为真，去掉 Number.isFinite 就会把字符串当 baseKv 传下去，
//    最终 voltageLevel 变成 "0 kV"（numericText 又会把它挡成 0）而不是 "100 kV"。
//    只测 ① 的话，`&& Number.isFinite(value)` 被删掉依然全绿 —— ① 的两个输入
//    （undefined / 0 / -5）在裸 `> 0` 下同样进 100 分支。
// ─────────────────────────────────────────────────────────────────────────────
describe("IEEE model generator / baseKv fallback", () => {
  const buildBusRow = (busNo, baseKv) =>
    baseKv === undefined ? [busNo, 1, 0, 0, 0, 0, 0, 1, 0] : [busNo, 1, 0, 0, 0, 0, 0, 1, 0, baseKv];

  test("falls back to 100 kV unless baseKv is a positive finite number", () => {
    //        0: 行里没有第 10 列      1: baseKv = 0
    //        2: baseKv = -5（负数）   3: baseKv = "138"（数字字符串）
    //        4: baseKv = 230 —— 对照组：证明 100 不是硬编码出来的唯一答案
    const baseKvByBusNo = [undefined, 0, -5, "138", 230];
    const bus = baseKvByBusNo.map((baseKv, index) => buildBusRow(index + 1, baseKv));
    const project = buildProject(
      { modelName: "IEEE14", title: "IEEE 14 Bus Test Case" },
      { baseMva: 100, bus, gen: bus.map((row) => genRow(row[0])), branch: [] }
    );
    const nodeById = new Map(project.nodes.map((node) => [node.id, node]));

    for (const busNo of [1, 2, 3, 4]) {
      const busNode = nodeById.get(`ieee14-bus-${busNo}`);
      const genNode = nodeById.get(`ieee14-gen-${busNo}`);
      expect(busNode.params.vbase, `bus ${busNo}`).toBe("100");
      expect(busNode.params.voltageLevel, `bus ${busNo}`).toBe("100 kV");
      expect(busNode.params.voltage, `bus ${busNo} voltage`).toBe("100");
      expect(genNode.params.vbase, `gen @ bus ${busNo}`).toBe("100");
      expect(genNode.params.ratedVoltage, `gen @ bus ${busNo}`).toBe("100 kV");
    }

    const bus5 = nodeById.get("ieee14-bus-5");
    expect(bus5.params.voltageLevel).toBe("230 kV");
    expect(bus5.params.vbase).toBe("230");
    expect(nodeById.get("ieee14-gen-5").params.ratedVoltage).toBe("230 kV");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// numericText（第 693 行 `if (!Number.isFinite(value)) return "0";`）
//
// 两类输入的鉴别力**不同**，必须分开记：
//
//   · 缺列（undefined）/ NaN / ±Infinity：numericText 的守卫与 round 自己的守卫
//     （第 686 行 `!Number.isFinite` → return 0）**产出完全相同**，删掉 693 行
//     这一层依然是绿的 —— 这是等价变异，按纪律第 9 条如实记录，不补断言硬凑。
//
//   · 数字字符串：这一层**承重**。round 是宽松的（`Number(value)` 会强转），
//     numericText 的守卫是严格的（非有限 → 恒 "0"，绝不吐出被强转出来的数）。
//     `"0.01"` 走守卫得 "0"；走 round 得 "0.01"。这是唯一能分辨两者的输入。
//
// 附对照组：正常数值必须原样量化到 8 位小数，否则「一律返回 0」也能过。
// ─────────────────────────────────────────────────────────────────────────────
describe("IEEE model generator / branch impedance text", () => {
  const busRow110 = (busNo) => [busNo, 1, 0, 0, 0, 0, 0, 1, 0, 100];
  const impedanceParams = (branch) => {
    const project = buildProject(
      { modelName: "IEEE14", title: "IEEE 14 Bus Test Case" },
      { baseMva: 100, bus: [busRow110(1), busRow110(2)], gen: [], branch: [branch, branch, branch, branch] }
    );
    const lines = project.nodes.filter((node) => node.kind === "ac-routable-line");
    expect(lines).toHaveLength(4);
    return lines.map((line) => ({ r: line.params.r, x: line.params.x, b: line.params.b }));
  };

  test("writes 0 for absent impedance columns", () => {
    for (const params of impedanceParams([1, 2])) {
      expect(params).toEqual({ r: "0", x: "0", b: "0" });
    }
  });

  test("does not coerce non-numeric impedance fields into numbers", () => {
    for (const params of impedanceParams([1, 2, "0.01", "0.1", "0"])) {
      expect(params).toEqual({ r: "0", x: "0", b: "0" });
    }
  });

  test("rounds present impedance values to 8 decimals", () => {
    for (const params of impedanceParams([1, 2, 0.0123456789, 0.10123456789, 0.000123456])) {
      expect(params).toEqual({ r: "0.01234568", x: "0.10123457", b: "0.00012346" });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 模块私有 API 装载器
//
// generate-ieee-models.mjs 只 export 了 buildProject 和 8 个 param 常量名，
// 而目标分支里有 8 条落在**仅被 buildProject 以硬编码值调用**的私有 helper 上
// （directionVector / oppositeDirection / terminalPoint / pointToNodeLocal /
// resolvePeripheralTerminalLayout / round）。经 buildProject 永远走不到它们的
// 兜底侧 —— 已在覆盖报告里核过：这些分支在 import 阶段就已执行完毕且计数为 0。
//
// 做法：读真实源码 → 在唯一的 export 块后追加一条 export → 写到 os.tmpdir()
// 下的临时副本 → 动态 import 副本。**不修改仓库里的任何文件**，副本每次运行都
// 从当前源码生成，所以测试仍然跟着生产代码走。
//
// 三重防恒绿：
//   ① export 块必须恰好匹配 1 处，否则直接 throw；
//   ② 追加的私有名只要有一个在源码里不存在，模块链接期就 SyntaxError；
//   ③ 临时目录 afterAll 清理。
//
// ⚠ 覆盖率口径：这些用例跑在**临时副本**上，v8 报告里
//   generate-ieee-models.mjs 自身的 522/552/579/686/825/835/837 计数**仍然是 0**
//   （实测确认）。它们拿到的是行为契约 + 变异 RED，不是覆盖率数字。
//   只有走 buildProject 的 693 与 720 两条真正把生产文件的分支计数打上。
//   （想让覆盖率也上去，只能改生产代码把私有 helper 加进 export —— 不在本轮范围内。）
// ─────────────────────────────────────────────────────────────────────────────
const PRIVATE_API_EXPORTS = [
  "directionVector",
  "oppositeDirection",
  "resolvePeripheralTerminalLayout",
  "round",
  "pointToNodeLocal",
  "terminalPoint"
];
const EXPORT_BLOCK_PATTERN = /export \{[\s\S]*?\};/gu;

const loadPrivateApi = async () => {
  const source = await readFile(new URL("./generate-ieee-models.mjs", import.meta.url), "utf8");
  const blocks = source.match(EXPORT_BLOCK_PATTERN) ?? [];
  if (blocks.length !== 1) {
    throw new Error(`generate-ieee-models.mjs 的 export 块应恰好 1 处，实际 ${blocks.length} 处 —— 私有 API 装载器已失效，测试会退化成恒绿。`);
  }
  const patched = source.replace(
    EXPORT_BLOCK_PATTERN,
    `${blocks[0]}\nexport { ${PRIVATE_API_EXPORTS.join(", ")} };\n`
  );
  const dir = await mkdtemp(path.join(os.tmpdir(), "ieee-private-api-"));
  const file = path.join(dir, "generate-ieee-models.internals.mjs");
  await writeFile(file, patched, "utf8");
  return { api: await import(pathToFileURL(file).href), dir };
};

describe("generate-ieee-models 私有 helper", () => {
  let privateApi;
  let tempDir;

  beforeAll(async () => {
    const loaded = await loadPrivateApi();
    privateApi = loaded.api;
    tempDir = loaded.dir;
  });

  afterAll(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  // 第 522 行 `vectors[direction] ?? vectors.S`：
  // 未知方向回落南向。断言值不能是「fallback 恰好也是的值」这类空断言，所以同时
  // 断一个已知方向（NW 归一化成 -1/√2），任何「永远返回 S」的硬编码变异都会红。
  test("directionVector maps unknown directions to south and normalizes diagonals", () => {
    const { directionVector } = privateApi;

    expect(directionVector("UP")).toEqual({ x: 0, y: 1 });
    expect(directionVector("")).toEqual({ x: 0, y: 1 });
    expect(directionVector("n")).toEqual({ x: 0, y: 1 });

    expect(directionVector("N")).toEqual({ x: 0, y: -1 });
    expect(directionVector("E")).toEqual({ x: 1, y: 0 });
    expect(directionVector("NW").x).toBeCloseTo(-1 / Math.SQRT2, 12);
    expect(directionVector("NW").y).toBeCloseTo(-1 / Math.SQRT2, 12);
    expect(directionVector("NE").x).toBeCloseTo(1 / Math.SQRT2, 12);
    expect(directionVector("NE").y).toBeCloseTo(-1 / Math.SQRT2, 12);
  });

  // 第 579 行 `opposites[direction] ?? "N"`：未知方向回落北向。
  // 同理断一个已知方向组（NE→SW），保证不是「恒返回 N」。
  test("oppositeDirection maps unknown directions to north", () => {
    const { oppositeDirection } = privateApi;

    expect(oppositeDirection("UP")).toBe("N");
    expect(oppositeDirection("")).toBe("N");
    expect(oppositeDirection("north")).toBe("N");

    expect(oppositeDirection("N")).toBe("S");
    expect(oppositeDirection("S")).toBe("N");
    expect(oppositeDirection("NE")).toBe("SW");
    expect(oppositeDirection("SE")).toBe("NW");
    expect(oppositeDirection("W")).toBe("E");
  });

  // 第 552 行 `layout?.anchor ?? baseAnchor`（在 Number.isFinite(rotation) 成立的分支里）。
  // baseAnchor 刻意取模块里两个常量之外的 { x: -0.25, y: 0.75 }：
  // 若兜底被改成硬编码 `{ x: 0.5, y: 0 }` 之类的字面量，断言立刻红。
  // rotation = 0 也要断 —— Number.isFinite(0) 为真，若守卫被改成
  // `Boolean(layout?.rotation)`，rotation: 0 会掉进 anchor 分支，rotation 变成 161.57。
  test("resolvePeripheralTerminalLayout prefers an explicit rotation over anchor-derived rotation", () => {
    const { resolvePeripheralTerminalLayout } = privateApi;
    const baseAnchor = { x: -0.25, y: 0.75 };
    const layoutAnchor = { x: 0, y: -0.5 };

    expect(resolvePeripheralTerminalLayout({ rotation: 90 }, baseAnchor)).toEqual({
      anchor: { x: -0.25, y: 0.75 },
      rotation: 90
    });
    expect(resolvePeripheralTerminalLayout({ rotation: 0 }, baseAnchor)).toEqual({
      anchor: { x: -0.25, y: 0.75 },
      rotation: 0
    });
    expect(resolvePeripheralTerminalLayout({ rotation: 45, anchor: layoutAnchor }, baseAnchor)).toEqual({
      anchor: { x: 0, y: -0.5 },
      rotation: 45
    });
    // rotation: 0 且带 anchor —— 唯一能分辨 `Number.isFinite(rotation)` 与
    // `Boolean(rotation)` 的输入。Boolean(0) 为假会把这条掉进 anchor 分支，
    // 结果变成 anchor = baseAnchor、rotation = 161.57（而不是 layoutAnchor / 0）。
    expect(resolvePeripheralTerminalLayout({ rotation: 0, anchor: layoutAnchor }, baseAnchor)).toEqual({
      anchor: { x: 0, y: -0.5 },
      rotation: 0
    });

    // 对照：同一个 baseAnchor 走 anchor 分支时 rotation 是 161.57，
    // 与上面 rotation: 90 的结果完全不同 —— 所以「总是走 anchor 分支」的变异会红。
    const anchorDerived = resolvePeripheralTerminalLayout({ anchor: layoutAnchor }, baseAnchor);
    expect(anchorDerived).toEqual({ anchor: { x: -0.25, y: 0.75 }, rotation: 161.57 });
    expect(anchorDerived.rotation).not.toBe(90);
    expect(resolvePeripheralTerminalLayout(undefined, baseAnchor)).toEqual({
      anchor: { x: -0.25, y: 0.75 },
      rotation: 0
    });
  });

  // 第 686 行 `if (!Number.isFinite(normalized)) return 0;`
  // 注意：`isFinite(x)` → `Number.isFinite(x)` 是**等价变异** —— 上一行
  // `Number(value)` 已经把值强制转成 number，全局 isFinite 的字符串强转没得可用。
  // 真正承重的是「非有限 → 0」，所以断 NaN / ±Infinity / 不可转字符串，并配
  // 一组正常数值做对照（含二进制精确的 0.125，toFixed 半数远离零 → 0.13）。
  test("round maps every non-finite value to 0 and otherwise rounds symmetrically", () => {
    const { round } = privateApi;

    expect(round(Number.NaN)).toBe(0);
    expect(round(Number.POSITIVE_INFINITY)).toBe(0);
    expect(round(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(round("not-a-number")).toBe(0);
    expect(round(undefined)).toBe(0);
    expect(round(null)).toBe(0);

    expect(round(0.125, 2)).toBe(0.13);
    expect(round(-0.125, 2)).toBe(-0.13);
    expect(round(1.23456, 3)).toBe(1.235);
    expect(round(-1.23456, 3)).toBe(-1.235);
    expect(round(0.1 + 0.2, 3)).toBe(0.3);
  });

  // 第 825 行 `-(node.rotation ?? 0) * Math.PI / 180`
  // 鉴别输入是 rotation 缺失（bus 节点虽然恒为 0，但 makeBaseNode 的默认参数
  // 一旦被去掉、rotation 变 undefined，这一层就是唯一兜底）。对照组 rotation: 90
  // 保证断言没落在 fallback 值（0 度）上。
  test("pointToNodeLocal treats a missing node rotation as 0 degrees", () => {
    const { pointToNodeLocal } = privateApi;
    const point = { x: 150, y: 200 };

    expect(pointToNodeLocal({ position: { x: 100, y: 200 } }, point)).toEqual({ x: 50, y: 0 });
    expect(pointToNodeLocal({ position: { x: 100, y: 200 }, rotation: 0 }, point)).toEqual({ x: 50, y: 0 });
    expect(pointToNodeLocal({ position: { x: 100, y: 200 }, rotation: 90 }, point)).toEqual({ x: 0, y: -50 });
  });

  // 第 835 行 `find(...) ?? node.terminals[0]`
  // 兜底取的是 **index 0 那个端子**（x = 10 + 0.5 × 100 = 60），不是节点中心（10）。
  // 只断「不抛异常」或「等于中心」都会让 `?? { x: 0, y: 0 }` 这类变异溜过去。
  test("terminalPoint falls back to the first terminal when the id is unknown", () => {
    const { terminalPoint } = privateApi;
    const node = (terminals, extra = {}) => ({
      position: { x: 10, y: 20 },
      size: { width: 100, height: 50 },
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      terminals,
      ...extra
    });

    expect(terminalPoint(node([{ id: "z9", anchor: { x: 0.5, y: 0 } }]), "t1")).toEqual({ x: 60, y: 20 });
    expect(terminalPoint(node([{ id: "t1", anchor: { x: 0.5, y: 0 } }]), "t1")).toEqual({ x: 60, y: 20 });
    // 无端子数组：两条兜底叠在一起，退回节点中心。
    expect(terminalPoint(node([]), "t1")).toEqual({ x: 10, y: 20 });
    // 兜底端子自带旋转时旋转也一起算（rotation 90 + anchor {x:0,y:-0.5}
    // → local (0, -25) 绕原点转 90° 得 (35, 20)），证明没被当成原点直返。
    expect(terminalPoint(node([{ id: "z9", anchor: { x: 0, y: -0.5 } }], { rotation: 90 }), "t1")).toEqual({
      x: 35,
      y: 20
    });
  });

  // 第 837 行三个兜底：`(terminal?.anchor.x ?? 0)`、`(node.scaleX ?? node.scale ?? 1)`
  // 区分「有 scaleX 没 scale」「只有 scale」「两者皆无」三种情况：
  //   · 删掉 `?? node.scale` → 「只有 scale」那组从 110 掉回 60，红；
  //   · 把 `?? node.scale` 换成 `?? 1` 或整体换成 `?? 1` → 「只有 scale」红；
  //   · 整体换成 `node.scale ?? 1` → 「有 scaleX 没 scale」从 110 掉到 60，红；
  //   · 删掉 `?? 0` → 无端子数组那组直接 TypeError，红。
  test("terminalPoint resolves scale and anchor fallbacks for nodes missing them", () => {
    const { terminalPoint } = privateApi;
    const node = (extra) => ({
      position: { x: 10, y: 20 },
      size: { width: 100, height: 50 },
      rotation: 0,
      terminals: [{ id: "t1", anchor: { x: 0.5, y: 0 } }],
      ...extra
    });

    // scaleX 优先于 scale。
    expect(terminalPoint(node({ scale: 5, scaleX: 2, scaleY: 1 }))).toEqual({ x: 110, y: 20 });
    // scaleX 缺失 → 用 scale。
    expect(terminalPoint(node({ scale: 2, scaleY: 1 }))).toEqual({ x: 110, y: 20 });
    // scaleX 与 scale 都缺失 → 按 1 算。
    expect(terminalPoint(node({ scaleY: 1 }))).toEqual({ x: 60, y: 20 });
    // 有 scaleX、无 scale —— 唯一能区分「读 scale」和「默认 1」的输入。
    expect(terminalPoint(node({ scaleX: 2, scaleY: 1 }))).toEqual({ x: 110, y: 20 });
    // 竖直方向同理（height 50，anchor.y = -0.5）。
    expect(terminalPoint(node({ scaleY: 2, terminals: [{ id: "t1", anchor: { x: 0, y: -0.5 } }] }))).toEqual({
      x: 10,
      y: -30
    });
  });
});
