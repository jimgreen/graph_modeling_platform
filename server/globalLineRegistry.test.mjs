import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { GLOBAL_LINE_ID_PARAM, createGlobalLineRegistry } from "./globalLineRegistry.mjs";

let dataRoot;
let filesRoot;
let registry;

function node(id, kind, params = {}, name = id) {
  return { id, kind, name, params, terminals: [] };
}

function line(id, kind, sourceId, targetId, params = {}, name = id) {
  return node(id, kind, {
    rated_capacity: "220",
    i_max: "199",
    r: "0.1",
    i_node: "1",
    j_node: "2",
    _routableLineSourceNodeId: sourceId,
    _routableLineTargetNodeId: targetId,
    ...params
  }, name);
}

async function writeProject(schemeName, fileName, project) {
  const dir = join(filesRoot, schemeName);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, fileName);
  await writeFile(filePath, `${JSON.stringify(project, null, 2)}\n`, "utf-8");
  return filePath;
}

beforeEach(async () => {
  dataRoot = await mkdtemp(join(tmpdir(), "global-lines-"));
  filesRoot = join(dataRoot, "schemes", "files");
  registry = createGlobalLineRegistry({ dataRoot, schemeFilesRoot: filesRoot });
});

afterEach(async () => {
  await rm(dataRoot, { recursive: true, force: true });
});

describe("全局线路注册表迁移", () => {
  test("只迁移接触边界设备的交直流线路，分配跨能源全局唯一序号", async () => {
    const boundary = node("station", "static-model-interaction-station");
    const bus = node("bus", "ac-bus");
    const load = node("load", "ac-load");
    const globalAc = line("global-ac", "ac-routable-line", bus.id, boundary.id, {}, "交流边界线");
    const globalDc = line("global-dc", "dc-routable-line", boundary.id, load.id, {}, "直流边界线");
    const localAc = line("local-ac", "ac-routable-line", bus.id, load.id, {}, "本地交流线");
    const projectPath = await writeProject("方案A", "厂站一.json", {
      version: 1, idx: 3, name: "厂站一", modelType: "厂站", nodes: [boundary, bus, load, globalAc, globalDc, localAc], edges: []
    });

    const records = await registry.list();

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.idx)).toEqual([1, 2]);
    expect(records.map((record) => record.energyType)).toEqual(["ac", "dc"]);
    expect(records.every((record) => record.degree === 1)).toBe(true);
    const stored = JSON.parse(await readFile(projectPath, "utf-8"));
    expect(stored.nodes.find((item) => item.id === "global-ac").params[GLOBAL_LINE_ID_PARAM]).toBe(records[0].id);
    expect(stored.nodes.find((item) => item.id === "global-dc").params.idx).toBe("2");
    expect(stored.nodes.find((item) => item.id === "local-ac").params[GLOBAL_LINE_ID_PARAM]).toBeUndefined();
  });

  test("历史数据中两个同向引用不会导致初始化失败，而是拆成两条方向有效的全局记录", async () => {
    const sharedId = "global-line-legacy";
    const settingsDir = join(dataRoot, "settings");
    await mkdir(settingsDir, { recursive: true });
    await writeFile(join(settingsDir, "global-lines.json"), `${JSON.stringify({
      schemaVersion: 1,
      lastIndex: 1,
      records: [{
        id: sharedId,
        idx: 1,
        name: "历史同向线路",
        energyType: "ac",
        params: { rated_capacity: "220" },
        references: [],
        createdAt: "2026-08-18T00:00:00.000Z",
        updatedAt: "2026-08-18T00:00:00.000Z"
      }]
    }, null, 2)}\n`, "utf-8");

    for (const [modelIndex, modelName] of [[1, "厂站一"], [2, "馈线二"]]) {
      const boundary = node(`boundary-${modelIndex}`, modelIndex === 1 ? "static-model-interaction-station" : "static-model-interaction-feeder");
      const bus = node(`bus-${modelIndex}`, "ac-bus");
      const sameTargetLine = line(`line-${modelIndex}`, "ac-routable-line", bus.id, boundary.id, { [GLOBAL_LINE_ID_PARAM]: sharedId }, "历史同向线路");
      await writeProject("历史方案", `${modelName}.json`, {
        version: 1,
        idx: modelIndex,
        name: modelName,
        modelType: modelIndex === 1 ? "厂站" : "馈线",
        nodes: [boundary, bus, sameTargetLine],
        edges: []
      });
    }

    const records = await registry.list();
    expect(records).toHaveLength(2);
    expect(records.every((record) => record.degree === 1 && record.endpointSlots.target && !record.endpointSlots.source)).toBe(true);
    const storedA = JSON.parse(await readFile(join(filesRoot, "历史方案", "厂站一.json"), "utf-8"));
    const storedB = JSON.parse(await readFile(join(filesRoot, "历史方案", "馈线二.json"), "utf-8"));
    expect(storedA.nodes.find((item) => item.id === "line-1").params[GLOBAL_LINE_ID_PARAM])
      .not.toBe(storedB.nodes.find((item) => item.id === "line-2").params[GLOBAL_LINE_ID_PARAM]);
  });
});

describe("全局线路首末端槽", () => {
  test("首端和末端各只能挂接一次，删除引用只清空实际占用槽且主记录保留", async () => {
    const first = await registry.attach({
      energyType: "ac",
      name: "全局一号线",
      node: line("line-a", "ac-routable-line", "a", "b", {}, "全局一号线"),
      reference: { projectIdx: 1, schemePath: ["方案"], projectName: "模型一", nodeId: "line-a", boundaryEndpoint: "source" }
    });
    expect(first.degree).toBe(1);
    expect(first.endpointSlots).toMatchObject({ source: { nodeId: "line-a" }, target: null });

    await expect(registry.attach({
      globalLineId: first.id,
      energyType: "ac",
      node: line("line-same-source", "ac-routable-line", "a", "b"),
      reference: { projectIdx: 2, schemePath: ["方案"], projectName: "模型二", nodeId: "line-same-source", boundaryEndpoint: "source" }
    })).rejects.toMatchObject({ statusCode: 409 });

    const second = await registry.attach({
      globalLineId: first.id,
      energyType: "ac",
      node: line("line-b", "ac-routable-line", "a", "b"),
      reference: { projectIdx: 2, schemePath: ["方案"], projectName: "模型二", nodeId: "line-b", boundaryEndpoint: "target" }
    });
    expect(second.degree).toBe(2);
    expect(second.endpointSlots.source?.nodeId).toBe("line-a");
    expect(second.endpointSlots.target?.nodeId).toBe("line-b");

    const detached = await registry.detach({
      globalLineId: first.id,
      reference: { projectIdx: 1, schemePath: ["方案"], projectName: "模型一", nodeId: "line-a", boundaryEndpoint: "source" }
    });
    expect(detached.degree).toBe(1);
    expect(detached.endpointSlots.source).toBeNull();
    expect(detached.endpointSlots.target?.nodeId).toBe("line-b");
    expect((await registry.list()).find((record) => record.id === first.id)).toBeTruthy();

    await expect(registry.attach({
      globalLineId: first.id,
      energyType: "ac",
      node: line("line-same-target", "ac-routable-line", "a", "b"),
      reference: { projectIdx: 3, schemePath: ["方案"], projectName: "模型三", nodeId: "line-same-target", boundaryEndpoint: "target" }
    })).rejects.toMatchObject({ statusCode: 409 });

    const reused = await registry.attach({
      globalLineId: first.id,
      energyType: "ac",
      node: line("line-c", "ac-routable-line", "a", "b"),
      reference: { projectIdx: 3, schemePath: ["方案"], projectName: "模型三", nodeId: "line-c", boundaryEndpoint: "source" }
    });
    expect(reused.endpointSlots.source?.nodeId).toBe("line-c");
    expect(reused.endpointSlots.target?.nodeId).toBe("line-b");
  });

  test("同一模型引用改变方向时先检查目标槽，冲突时保持原首端不变，空闲时再移动", async () => {
    const first = await registry.attach({
      energyType: "dc",
      name: "全局直流一号线",
      node: line("line-a", "dc-routable-line", "a", "b", {}, "全局直流一号线"),
      reference: { projectIdx: 1, schemePath: ["方案"], projectName: "模型一", nodeId: "line-a", boundaryEndpoint: "source" }
    });
    await registry.attach({
      globalLineId: first.id,
      energyType: "dc",
      node: line("line-b", "dc-routable-line", "a", "b"),
      reference: { projectIdx: 2, schemePath: ["方案"], projectName: "模型二", nodeId: "line-b", boundaryEndpoint: "target" }
    });

    await expect(registry.attach({
      globalLineId: first.id,
      energyType: "dc",
      node: line("line-a", "dc-routable-line", "a", "b"),
      reference: { projectIdx: 1, schemePath: ["方案"], projectName: "模型一", nodeId: "line-a", boundaryEndpoint: "target" }
    })).rejects.toMatchObject({ statusCode: 409 });
    expect((await registry.list()).find((record) => record.id === first.id)?.endpointSlots).toMatchObject({
      source: { nodeId: "line-a" },
      target: { nodeId: "line-b" }
    });

    await registry.detach({
      globalLineId: first.id,
      reference: { projectIdx: 2, schemePath: ["方案"], projectName: "模型二", nodeId: "line-b", boundaryEndpoint: "target" }
    });
    const moved = await registry.attach({
      globalLineId: first.id,
      energyType: "dc",
      node: line("line-a", "dc-routable-line", "a", "b"),
      reference: { projectIdx: 1, schemePath: ["方案"], projectName: "模型一", nodeId: "line-a", boundaryEndpoint: "target" }
    });
    expect(moved.endpointSlots).toMatchObject({ source: null, target: { nodeId: "line-a" } });
  });

  test("首末端都已关联时禁止把其中一端改接到另一个边界设备，删除另一端后允许改接", async () => {
    const first = await registry.attach({
      energyType: "ac",
      name: "不可带电改接线路",
      node: line("line-a", "ac-routable-line", "a", "b", {}, "不可带电改接线路"),
      reference: {
        projectIdx: 1,
        schemePath: ["方案"],
        projectName: "模型一",
        nodeId: "line-a",
        boundaryEndpoint: "source",
        boundaryNodeId: "station-old",
        boundaryTerminalId: "t1"
      }
    });
    await registry.attach({
      globalLineId: first.id,
      energyType: "ac",
      node: line("line-b", "ac-routable-line", "a", "b"),
      reference: {
        projectIdx: 2,
        schemePath: ["方案"],
        projectName: "模型二",
        nodeId: "line-b",
        boundaryEndpoint: "target",
        boundaryNodeId: "feeder-b",
        boundaryTerminalId: "t1"
      }
    });

    const adjustedReference = {
      projectIdx: 1,
      schemePath: ["方案"],
      projectName: "模型一",
      nodeId: "line-a",
      boundaryEndpoint: "source",
      boundaryNodeId: "station-new",
      boundaryTerminalId: "t2"
    };
    await expect(registry.attach({
      globalLineId: first.id,
      energyType: "ac",
      node: line("line-a", "ac-routable-line", "a", "b"),
      reference: adjustedReference
    })).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining("先删除另一端") });

    await registry.detach({
      globalLineId: first.id,
      reference: { projectIdx: 2, schemePath: ["方案"], projectName: "模型二", nodeId: "line-b", boundaryEndpoint: "target" }
    });
    const adjusted = await registry.attach({
      globalLineId: first.id,
      energyType: "ac",
      node: line("line-a", "ac-routable-line", "a", "b"),
      reference: adjustedReference
    });
    expect(adjusted.endpointSlots.source).toMatchObject({ boundaryNodeId: "station-new", boundaryTerminalId: "t2" });
  });
});

describe("全局线路参数一致性", () => {
  test("任一模型修改线路名称和参数后更新全局记录并覆盖其他已保存模型", async () => {
    const boundaryA = node("station-a", "static-model-interaction-station");
    const boundaryB = node("station-b", "static-model-interaction-feeder");
    const lineA = line("line-a", "ac-routable-line", "bus-a", boundaryA.id, {}, "共享线路");
    const first = await registry.attach({
      energyType: "ac",
      name: "共享线路",
      node: lineA,
      reference: { projectIdx: 1, schemePath: ["方案"], projectName: "模型一", nodeId: lineA.id, boundaryEndpoint: "target", boundaryNodeId: boundaryA.id }
    });
    lineA.params[GLOBAL_LINE_ID_PARAM] = first.id;
    lineA.params.idx = String(first.idx);
    const lineB = line("line-b", "ac-routable-line", boundaryB.id, "bus-b", { [GLOBAL_LINE_ID_PARAM]: first.id, idx: String(first.idx) }, "共享线路");
    await registry.attach({
      globalLineId: first.id,
      energyType: "ac",
      node: lineB,
      reference: { projectIdx: 2, schemePath: ["方案"], projectName: "模型二", nodeId: lineB.id, boundaryEndpoint: "source", boundaryNodeId: boundaryB.id }
    });
    const pathA = await writeProject("方案", "模型一.json", { version: 1, idx: 1, name: "模型一", modelType: "厂站", nodes: [boundaryA, node("bus-a", "ac-bus"), lineA], edges: [] });
    const pathB = await writeProject("方案", "模型二.json", { version: 1, idx: 2, name: "模型二", modelType: "馈线", nodes: [boundaryB, node("bus-b", "ac-bus"), lineB], edges: [] });

    const editedLineA = { ...lineA, name: "共享线路改名", params: { ...lineA.params, rated_capacity: "500", r: "0.25" } };
    const result = await registry.syncProject({
      projectIdx: 1,
      schemePath: ["方案"],
      projectName: "模型一",
      project: { version: 1, idx: 1, name: "模型一", modelType: "厂站", nodes: [boundaryA, node("bus-a", "ac-bus"), editedLineA], edges: [] }
    });

    const updatedRecord = result.records.find((record) => record.id === first.id);
    expect(updatedRecord).toMatchObject({ name: "共享线路改名", params: expect.objectContaining({ rated_capacity: "500", r: "0.25" }), degree: 2 });
    const storedOther = JSON.parse(await readFile(pathB, "utf-8"));
    expect(storedOther.nodes.find((item) => item.id === "line-b")).toMatchObject({
      name: "共享线路改名",
      params: expect.objectContaining({ rated_capacity: "500", r: "0.25", i_node: "1", j_node: "2" })
    });
    expect(JSON.parse(await readFile(pathA, "utf-8")).nodes.find((item) => item.id === "line-a").name).toBe("共享线路改名");
  });
});
