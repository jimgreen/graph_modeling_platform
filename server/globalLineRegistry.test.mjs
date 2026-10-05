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
    const boundary = node("station", "ac-station-source", { model_id: "3" });
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
    const storedGlobalAc = stored.nodes.find((item) => item.id === "global-ac");
    const storedGlobalDc = stored.nodes.find((item) => item.id === "global-dc");
    expect(storedGlobalAc.params[GLOBAL_LINE_ID_PARAM]).toBeUndefined();
    expect(storedGlobalAc.params.idx).toBe("1");
    expect(storedGlobalDc.params.idx).toBe("2");
    expect(storedGlobalAc).not.toHaveProperty("name");
    expect(storedGlobalAc.params).not.toHaveProperty("rated_capacity");
    expect(storedGlobalAc.params).not.toHaveProperty("r");
    expect(storedGlobalAc.params).toMatchObject({
      idx: "1",
      i_node: "1",
      j_node: "2",
      _routableLineSourceNodeId: bus.id,
      _routableLineTargetNodeId: boundary.id
    });
    expect(stored.nodes.find((item) => item.id === "local-ac").params[GLOBAL_LINE_ID_PARAM]).toBeUndefined();
  });

  test("历史数据中两个同向引用不会导致初始化失败，而是拆成两条方向有效的全局记录", async () => {
    const sharedId = "global-line-legacy";
    const settingsDir = join(dataRoot, "settings");
    const legacyRegistryPath = join(settingsDir, "global-lines.json");
    await mkdir(settingsDir, { recursive: true });
    await writeFile(legacyRegistryPath, `${JSON.stringify({
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
      const boundary = node(`boundary-${modelIndex}`, modelIndex === 1 ? "ac-station-source" : "ac-feeder-source", { model_id: String(modelIndex) });
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
    expect(storedA.nodes.find((item) => item.id === "line-1").params.idx)
      .not.toBe(storedB.nodes.find((item) => item.id === "line-2").params.idx);
    expect(storedA.nodes.find((item) => item.id === "line-1").params[GLOBAL_LINE_ID_PARAM]).toBeUndefined();
    expect(storedB.nodes.find((item) => item.id === "line-2").params[GLOBAL_LINE_ID_PARAM]).toBeUndefined();
    expect(registry.registryPath).toBe(join(dataRoot, "schemes", "global-lines.json"));
    const migratedRegistry = JSON.parse(await readFile(registry.registryPath, "utf-8"));
    expect(migratedRegistry.records).toHaveLength(2);
    await expect(readFile(legacyRegistryPath, "utf-8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("全局线路首末端槽", () => {
  test("复用出线度为0或1的线路时在页面保存阶段用当前模型关联信息重建首末端", async () => {
    const emptySeedReference = {
      projectIdx: 998,
      schemePath: [],
      projectName: "即将清空的旧模型",
      nodeId: "empty-seed-line",
      boundaryEndpoint: "source"
    };
    const emptyRecord = await registry.attach({
      energyType: "ac",
      name: "待修复空线路",
      node: line("empty-seed-line", "ac-routable-line", "empty-source", "empty-target"),
      reference: emptySeedReference
    });
    await registry.detach({ globalLineId: emptyRecord.id, reference: emptySeedReference });
    const singleRecord = await registry.attach({
      energyType: "ac",
      name: "待修复单端线路",
      node: line("single-seed-line", "ac-routable-line", "single-source", "single-target"),
      reference: {
        projectIdx: 999,
        schemePath: [],
        projectName: "错误旧模型",
        nodeId: "single-seed-line",
        boundaryEndpoint: "target"
      }
    });
    expect((await registry.list()).map((record) => record.degree)).toEqual([0, 1]);

    const stationSource = node("station-source-22", "ac-station-source", { model_id: "22" });
    const feederSource = node("feeder-source-23", "ac-feeder-source", { model_id: "23" });
    const localLoadA = node("local-load-a", "ac-load");
    const localLoadB = node("local-load-b", "ac-load");
    const emptyLine = line("line-repair-empty", "ac-routable-line", stationSource.id, localLoadA.id, {
      [GLOBAL_LINE_ID_PARAM]: emptyRecord.id,
      _globalLineModelPair: "source",
      _routableLineSourceTerminalId: "t-source-a"
    }, "待修复空线路");
    const singleLine = line("line-repair-single", "ac-routable-line", feederSource.id, localLoadB.id, {
      [GLOBAL_LINE_ID_PARAM]: singleRecord.id,
      _globalLineModelPair: "source",
      _routableLineSourceTerminalId: "t-source-b"
    }, "待修复单端线路");

    const synchronized = await registry.syncProject({
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      project: {
        version: 1,
        idx: 7,
        name: "本地馈线",
        modelType: "馈线",
        nodes: [stationSource, feederSource, localLoadA, localLoadB, emptyLine, singleLine],
        edges: []
      }
    });

    const repairedEmpty = synchronized.records.find((record) => record.id === emptyRecord.id);
    const repairedSingle = synchronized.records.find((record) => record.id === singleRecord.id);
    expect(repairedEmpty).toMatchObject({
      degree: 2,
      endpointSlots: {
        source: { projectIdx: 22, nodeId: emptyLine.id, boundaryNodeId: stationSource.id },
        target: { projectIdx: 7, projectName: "本地馈线", nodeId: emptyLine.id }
      }
    });
    expect(repairedSingle).toMatchObject({
      degree: 2,
      endpointSlots: {
        source: { projectIdx: 23, nodeId: singleLine.id, boundaryNodeId: feederSource.id },
        target: { projectIdx: 7, projectName: "本地馈线", nodeId: singleLine.id }
      }
    });
  });

  test("只能显式删除首末端均为空的全局线路记录", async () => {
    const emptyReference = {
      projectIdx: 1,
      schemePath: ["主方案"],
      projectName: "厂站一",
      nodeId: "line-empty",
      boundaryEndpoint: "source",
      boundaryNodeId: "station-one",
      boundaryTerminalId: "t1"
    };
    const empty = await registry.attach({
      energyType: "ac",
      name: "可删除空线路",
      node: line("line-empty", "ac-routable-line", "station-one", "bus-one"),
      reference: emptyReference
    });
    await registry.detach({ globalLineId: empty.id, reference: emptyReference });
    const occupied = await registry.attach({
      energyType: "ac",
      name: "不可删除单端线路",
      node: line("line-occupied", "ac-routable-line", "station-two", "bus-two"),
      reference: { ...emptyReference, projectIdx: 2, projectName: "厂站二", nodeId: "line-occupied", boundaryNodeId: "station-two" }
    });

    await expect(registry.deleteEmpty({ id: occupied.id })).rejects.toMatchObject({ statusCode: 409 });
    await expect(registry.deleteEmpty({ id: empty.id })).resolves.toMatchObject({ id: empty.id, degree: 0 });
    expect((await registry.list()).map((record) => record.id)).toEqual([occupied.id]);
  });

  test("同一模型内拒绝保存两条复用同一全局线路ID的线路", async () => {
    const reference = {
      projectIdx: 88,
      schemePath: ["主方案"],
      projectName: "临时模型",
      nodeId: "duplicate-seed",
      boundaryEndpoint: "source",
      boundaryNodeId: "duplicate-boundary",
      boundaryTerminalId: "t1"
    };
    const seeded = await registry.attach({
      energyType: "ac",
      name: "禁止模型内重复线路",
      node: line("duplicate-seed", "ac-routable-line", "duplicate-boundary", "duplicate-bus"),
      reference
    });
    await registry.detach({ globalLineId: seeded.id, reference });

    const associationA = node("duplicate-source-a", "ac-station-source", { model_id: "22" });
    const associationB = node("duplicate-source-b", "ac-station-source", { model_id: "22" });
    const localLoadA = node("duplicate-load-a", "ac-load");
    const localLoadB = node("duplicate-load-b", "ac-load");
    const duplicateA = line("duplicate-line-a", "ac-routable-line", associationA.id, localLoadA.id, {
      [GLOBAL_LINE_ID_PARAM]: seeded.id,
      _globalLineModelPair: "source"
    }, seeded.name);
    const duplicateB = line("duplicate-line-b", "ac-routable-line", associationB.id, localLoadB.id, {
      [GLOBAL_LINE_ID_PARAM]: seeded.id,
      _globalLineModelPair: "source"
    }, seeded.name);

    await expect(registry.syncProject({
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      project: {
        version: 1,
        idx: 7,
        name: "本地馈线",
        modelType: "馈线",
        nodes: [associationA, associationB, localLoadA, localLoadB, duplicateA, duplicateB],
        edges: []
      }
    })).rejects.toThrow(/同一模型内.*同一条全局线路只能存在一条/);
    expect((await registry.list()).find((record) => record.id === seeded.id)?.degree).toBe(0);
  });

  test("页面保存时才写入模型关联线路，并在同步和服务重建后保持 model_id 端与本地端方向", async () => {
    const association = node("station-source", "ac-station-source", { model_id: "22" });
    const localLoad = node("local-load", "ac-load");
    const createdLine = line("line-directional", "ac-routable-line", association.id, localLoad.id, {
      [GLOBAL_LINE_ID_PARAM]: "draft-global-line:line-directional",
      _globalLineModelPair: "1",
      idx: "8",
      _routableLineSourceTerminalId: "t-source",
      _routableLineTargetTerminalId: "t-target"
    }, "方向线路");

    expect(await registry.list()).toEqual([]);

    const synchronized = await registry.syncProject({
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      project: {
        version: 1,
        idx: 7,
        name: "本地馈线",
        modelType: "馈线",
        nodes: [association, localLoad, createdLine],
        edges: []
      }
    });
    const synchronizedRecord = synchronized.records.find((record) => record.name === "方向线路");
    expect(synchronizedRecord?.id).not.toBe("draft-global-line:line-directional");
    expect(synchronizedRecord?.degree).toBe(2);
    expect(synchronizedRecord?.endpointSlots.source).toMatchObject({ projectIdx: 22, boundaryNodeId: association.id });
    expect(synchronizedRecord?.endpointSlots.target).toMatchObject({ projectIdx: 7, projectName: "本地馈线" });
    expect(synchronized.project.nodes.find((item) => item.id === createdLine.id)?.params).toMatchObject({
      [GLOBAL_LINE_ID_PARAM]: synchronizedRecord?.id,
      idx: String(synchronizedRecord?.idx)
    });

    const savedProject = synchronized.project;
    await writeProject("主方案", "本地馈线.json", savedProject);

    await registry.syncProject({
      projectIdx: 22,
      schemePath: ["主方案"],
      projectName: "目标厂站",
      project: { version: 1, idx: 22, name: "目标厂站", modelType: "厂站", nodes: [], edges: [] }
    });
    const afterTargetModelSync = (await registry.list()).find((record) => record.id === synchronizedRecord?.id);
    expect(afterTargetModelSync?.degree).toBe(2);
    expect(afterTargetModelSync?.endpointSlots.source).toMatchObject({ projectIdx: 22, boundaryNodeId: association.id });

    const restartedRegistry = createGlobalLineRegistry({ dataRoot, schemeFilesRoot: filesRoot });
    const rebuilt = (await restartedRegistry.list()).find((record) => record.id === synchronizedRecord?.id);
    expect(rebuilt?.degree).toBe(2);
    expect(rebuilt?.endpointSlots.source).toMatchObject({ projectIdx: 22, boundaryNodeId: association.id });
    expect(rebuilt?.endpointSlots.target).toMatchObject({ projectIdx: 7, projectName: "本地馈线" });
  });

  test("保存删除线路且另一端模型不存在时删除整条全局线路记录", async () => {
    const association = node("district-load", "dc-district-load", { model_id: "33" });
    const localSource = node("local-source", "dc-source");
    const draftLine = line("line-delete", "dc-routable-line", localSource.id, association.id, {
      [GLOBAL_LINE_ID_PARAM]: "draft-global-line:line-delete",
      _globalLineModelPair: "1"
    }, "待删除线路");
    const saved = await registry.syncProject({
      projectIdx: 9,
      schemePath: ["主方案"],
      projectName: "本地台区",
      project: {
        version: 1,
        idx: 9,
        name: "本地台区",
        modelType: "台区",
        nodes: [association, localSource, draftLine],
        edges: []
      }
    });
    const savedRecord = saved.records.find((record) => record.name === "待删除线路");
    expect(savedRecord?.degree).toBe(2);
    await writeProject("主方案", "本地台区.json", saved.project);

    const deleted = await registry.syncProject({
      projectIdx: 9,
      schemePath: ["主方案"],
      projectName: "本地台区",
      project: {
        version: 1,
        idx: 9,
        name: "本地台区",
        modelType: "台区",
        nodes: [association, localSource],
        edges: []
      }
    });
    expect(deleted.records.find((record) => record.id === savedRecord?.id)).toBeUndefined();
    expect((await registry.list()).find((record) => record.id === savedRecord?.id)).toBeUndefined();
  });

  test("另一端模型存在且保存有同一全局线路时本端删除不修改全局记录", async () => {
    const association = node("station-source", "ac-station-source", { model_id: "22" });
    const localLoad = node("local-load", "ac-load");
    const draftLine = line("line-local", "ac-routable-line", association.id, localLoad.id, {
      [GLOBAL_LINE_ID_PARAM]: "draft-global-line:line-local",
      _globalLineModelPair: "1"
    }, "双端保留线路");
    const saved = await registry.syncProject({
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      project: {
        version: 1,
        idx: 7,
        name: "本地馈线",
        modelType: "馈线",
        nodes: [association, localLoad, draftLine],
        edges: []
      }
    });
    const savedRecord = saved.records.find((record) => record.name === "双端保留线路");
    await writeProject("主方案", "本地馈线.json", saved.project);
    const remoteBoundary = node("remote-feeder-load", "ac-feeder-load", { model_id: "7" });
    const remoteSource = node("remote-source", "ac-source");
    const remoteLine = line("line-remote", "ac-routable-line", remoteSource.id, remoteBoundary.id, {
      [GLOBAL_LINE_ID_PARAM]: savedRecord.id,
      idx: String(savedRecord.idx),
      _globalLineModelPair: "target"
    }, savedRecord.name);
    await writeProject("主方案", "目标厂站.json", {
      version: 1,
      idx: 22,
      name: "目标厂站",
      modelType: "厂站",
      nodes: [remoteBoundary, remoteSource, remoteLine],
      edges: []
    });
    const beforeDelete = (await registry.list()).find((record) => record.id === savedRecord.id);

    const deletedLocally = await registry.syncProject({
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      project: {
        version: 1,
        idx: 7,
        name: "本地馈线",
        modelType: "馈线",
        nodes: [association, localLoad],
        edges: []
      }
    });

    expect(deletedLocally.records.find((record) => record.id === savedRecord.id)).toEqual(beforeDelete);
    expect((await registry.list()).find((record) => record.id === savedRecord.id)).toEqual(beforeDelete);
  });

  test("另一端模型存在但没有同一全局线路时删除整条全局记录", async () => {
    const association = node("district-load", "dc-district-load", { model_id: "33" });
    const localSource = node("local-source", "dc-source");
    const draftLine = line("line-local", "dc-routable-line", localSource.id, association.id, {
      [GLOBAL_LINE_ID_PARAM]: "draft-global-line:line-local",
      _globalLineModelPair: "1"
    }, "远端缺线线路");
    const saved = await registry.syncProject({
      projectIdx: 9,
      schemePath: ["主方案"],
      projectName: "本地台区",
      project: {
        version: 1,
        idx: 9,
        name: "本地台区",
        modelType: "台区",
        nodes: [association, localSource, draftLine],
        edges: []
      }
    });
    const savedRecord = saved.records.find((record) => record.name === "远端缺线线路");
    await writeProject("主方案", "本地台区.json", saved.project);
    await writeProject("主方案", "目标台区.json", {
      version: 1,
      idx: 33,
      name: "目标台区",
      modelType: "台区",
      nodes: [node("unrelated-load", "dc-load")],
      edges: []
    });

    const deleted = await registry.syncProject({
      projectIdx: 9,
      schemePath: ["主方案"],
      projectName: "本地台区",
      project: {
        version: 1,
        idx: 9,
        name: "本地台区",
        modelType: "台区",
        nodes: [association, localSource],
        edges: []
      }
    });

    expect(deleted.records.find((record) => record.id === savedRecord.id)).toBeUndefined();
    expect((await registry.list()).find((record) => record.id === savedRecord.id)).toBeUndefined();
  });

  test("模型关联设备复用首末端模型一致的既有全局线路时不修改任何已有端子信息", async () => {
    const sourceAttached = await registry.attach({
      energyType: "ac",
      name: "既有共享线路",
      node: line("remote-line", "ac-routable-line", "remote-source", "remote-target", {}, "既有共享线路"),
      reference: {
        projectIdx: 22,
        schemePath: ["主方案"],
        projectName: "目标厂站",
        nodeId: "remote-line",
        boundaryEndpoint: "source"
      }
    });
    const existing = await registry.attach({
      globalLineId: sourceAttached.id,
      energyType: "ac",
      node: line("existing-local-line", "ac-routable-line", "existing-source", "existing-target", {}, "既有共享线路"),
      reference: {
        projectIdx: 7,
        schemePath: ["主方案"],
        projectName: "本地馈线",
        nodeId: "existing-local-line",
        boundaryEndpoint: "target"
      }
    });
    const beforeReuse = (await registry.list()).find((item) => item.id === existing.id);
    const association = node("station-source", "ac-station-source", { model_id: "22" });
    const localLoad = node("local-load", "ac-load");
    const selectedExistingLine = line("local-line", "ac-routable-line", association.id, localLoad.id, {
      [GLOBAL_LINE_ID_PARAM]: existing.id,
      _globalLineModelPair: "source",
      idx: String(existing.idx)
    }, existing.name);

    const saved = await registry.syncProject({
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      project: {
        version: 1,
        idx: 7,
        name: "本地馈线",
        modelType: "馈线",
        nodes: [association, localLoad, selectedExistingLine],
        edges: []
      }
    });
    const record = saved.records.find((item) => item.id === existing.id);
    expect(record).toEqual(beforeReuse);
    expect(record?.endpointSlots.source).toMatchObject({ projectIdx: 22, nodeId: "remote-line" });
    expect(record?.endpointSlots.target).toMatchObject({ projectIdx: 7, nodeId: "existing-local-line" });
    expect(saved.project.nodes.find((item) => item.id === selectedExistingLine.id)?.params).toMatchObject({
      [GLOBAL_LINE_ID_PARAM]: existing.id,
      _globalLineModelPair: "source"
    });

    await expect(registry.syncProject({
      projectIdx: 8,
      schemePath: ["主方案"],
      projectName: "其他馈线",
      project: {
        version: 1,
        idx: 8,
        name: "其他馈线",
        modelType: "馈线",
        nodes: [association, localLoad, selectedExistingLine],
        edges: []
      }
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("与本地模型")
    });
    expect((await registry.list()).find((item) => item.id === existing.id)).toEqual(beforeReuse);

    await writeProject("主方案", "本地馈线.json", saved.project);
    const reloaded = (await createGlobalLineRegistry({ dataRoot, schemeFilesRoot: filesRoot }).list())
      .find((item) => item.id === existing.id);
    expect(reloaded).toEqual(beforeReuse);
  });

  test("复用既有全局线路时保存名称和参数修改，但保持首末端信息不变", async () => {
    const sourceAttached = await registry.attach({
      energyType: "ac",
      name: "复用线路原名称",
      node: line("remote-line", "ac-routable-line", "remote-source", "remote-target", {}, "复用线路原名称"),
      reference: {
        projectIdx: 22,
        schemePath: ["主方案"],
        projectName: "目标厂站",
        nodeId: "remote-line",
        boundaryEndpoint: "source"
      }
    });
    const existing = await registry.attach({
      globalLineId: sourceAttached.id,
      energyType: "ac",
      node: line("existing-local-line", "ac-routable-line", "existing-source", "existing-target", {}, "复用线路原名称"),
      reference: {
        projectIdx: 7,
        schemePath: ["主方案"],
        projectName: "本地馈线",
        nodeId: "existing-local-line",
        boundaryEndpoint: "target"
      }
    });
    const referencesBeforeSave = existing.references;
    const endpointSlotsBeforeSave = existing.endpointSlots;
    const association = node("station-source", "ac-station-source", { model_id: "22" });
    const localLoad = node("local-load", "ac-load");
    const editedLine = line("local-line", "ac-routable-line", association.id, localLoad.id, {
      [GLOBAL_LINE_ID_PARAM]: existing.id,
      _globalLineModelPair: "source",
      idx: String(existing.idx),
      rated_capacity: "500",
      r: "0.25"
    }, "复用线路新名称");

    const saved = await registry.syncProject({
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      project: {
        version: 1,
        idx: 7,
        name: "本地馈线",
        modelType: "馈线",
        nodes: [association, localLoad, editedLine],
        edges: []
      }
    });

    const updated = saved.records.find((item) => item.id === existing.id);
    expect(updated).toMatchObject({
      name: "复用线路新名称",
      params: expect.objectContaining({ rated_capacity: "500", r: "0.25" })
    });
    expect(updated?.references).toEqual(referencesBeforeSave);
    expect(updated?.endpointSlots).toEqual(endpointSlotsBeforeSave);
    const runtimeLine = saved.project.nodes.find((item) => item.id === editedLine.id);
    expect(runtimeLine).toMatchObject({
      name: "复用线路新名称",
      params: expect.objectContaining({ rated_capacity: "500", r: "0.25" })
    });
    const storedLine = saved.storageProject.nodes.find((item) => item.id === editedLine.id);
    expect(storedLine).not.toHaveProperty("name");
    expect(storedLine.params).not.toHaveProperty(GLOBAL_LINE_ID_PARAM);
    expect(storedLine.params).not.toHaveProperty("rated_capacity");
    expect(storedLine.params).not.toHaveProperty("r");
  });

  test("保存时仍拒绝出线度为2且与 model_id 模型首末端方向不一致的既有全局线路", async () => {
    const existing = await registry.attach({
      energyType: "ac",
      name: "方向不匹配线路",
      node: line("remote-line", "ac-routable-line", "remote-source", "remote-target", {}, "方向不匹配线路"),
      reference: {
        projectIdx: 22,
        schemePath: ["主方案"],
        projectName: "目标厂站",
        nodeId: "remote-line",
        boundaryEndpoint: "target"
      }
    });
    await registry.attach({
      globalLineId: existing.id,
      energyType: "ac",
      node: line("wrong-local-line", "ac-routable-line", "wrong-source", "wrong-target", {}, existing.name),
      reference: {
        projectIdx: 7,
        schemePath: ["主方案"],
        projectName: "本地馈线",
        nodeId: "wrong-local-line",
        boundaryEndpoint: "source"
      }
    });
    const association = node("station-source", "ac-station-source", { model_id: "22" });
    const localLoad = node("local-load", "ac-load");
    const invalidLine = line("local-line", "ac-routable-line", association.id, localLoad.id, {
      [GLOBAL_LINE_ID_PARAM]: existing.id,
      _globalLineModelPair: "source",
      idx: String(existing.idx)
    }, existing.name);

    await expect(registry.syncProject({
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      project: {
        version: 1,
        idx: 7,
        name: "本地馈线",
        modelType: "馈线",
        nodes: [association, localLoad, invalidLine],
        edges: []
      }
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("重新选择已有全局线路")
    });
    expect((await registry.list()).find((record) => record.id === existing.id)?.degree).toBe(2);
  });

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

describe("全局线路表是名称和参数的唯一来源", () => {
  test("页面保存把名称和参数写入全局表，但模型文件只保留引用和本地字段", async () => {
    const boundaryA = node("station-a", "ac-station-source", { model_id: "1" });
    const boundaryB = node("station-b", "ac-feeder-source", { model_id: "2" });
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

    // 模拟服务重启后的 schema v3 迁移：既有模型中的名称和全局参数被收敛到注册表。
    registry = createGlobalLineRegistry({ dataRoot, schemeFilesRoot: filesRoot });
    await registry.list();
    const storedOtherBefore = await readFile(pathB, "utf-8");

    const editedLineA = { ...lineA, name: "共享线路改名", params: { ...lineA.params, rated_capacity: "500", r: "0.25" } };
    const result = await registry.syncProject({
      projectIdx: 1,
      schemePath: ["方案"],
      projectName: "模型一",
      project: { version: 1, idx: 1, name: "模型一", modelType: "厂站", nodes: [boundaryA, node("bus-a", "ac-bus"), editedLineA], edges: [] }
    });

    const updatedRecord = result.records.find((record) => record.id === first.id);
    expect(updatedRecord).toMatchObject({ name: "共享线路改名", params: expect.objectContaining({ rated_capacity: "500", r: "0.25" }), degree: 2 });
    const storedCurrentLine = result.storageProject.nodes.find((item) => item.id === "line-a");
    expect(storedCurrentLine).not.toHaveProperty("name");
    expect(storedCurrentLine.params).toMatchObject({
      idx: String(first.idx),
      i_node: "1",
      j_node: "2"
    });
    expect(storedCurrentLine.params).not.toHaveProperty(GLOBAL_LINE_ID_PARAM);
    expect(storedCurrentLine.params).not.toHaveProperty("rated_capacity");
    expect(storedCurrentLine.params).not.toHaveProperty("r");

    // 修改全局表不能反向改写另一端模型文件。
    expect(await readFile(pathB, "utf-8")).toBe(storedOtherBefore);
    const storedOther = JSON.parse(storedOtherBefore).nodes.find((item) => item.id === "line-b");
    expect(storedOther).not.toHaveProperty("name");
    expect(storedOther.params).not.toHaveProperty("rated_capacity");
    expect(storedOther.params).not.toHaveProperty("r");

    const hydrated = await registry.hydrateProject({ project: result.storageProject });
    expect(hydrated.project.nodes.find((item) => item.id === "line-a")).toMatchObject({
      name: "共享线路改名",
      params: expect.objectContaining({ rated_capacity: "500", r: "0.25", i_node: "1", j_node: "2" })
    });

    // registry.syncProject 只返回待落盘模型，不自行写当前模型文件；真正保存由模型保存接口完成。
    expect(JSON.parse(await readFile(pathA, "utf-8")).nodes.find((item) => item.id === "line-a")).not.toHaveProperty("name");
  });
});

// ─── 归一化守卫（变异验证补）────────────────────────────────
//
// 这两条曾被变异验证判为「GREEN」，说明既有用例一个都没碰到它们：
//
// ① `positiveInteger` 用 `Number.isSafeInteger`。若换成 `Number.isFinite`，
//    1.5 会被当成合法模型 idx —— 两条不同的模型会算出同一个 key，
//    跨模型的全局线路注册就串了。既有 16 条用例全是整数 idx。
// ② `normalizedStringArray` 的 `.filter(Boolean)`。若去掉，schemePath 里的
//    空串会留进 key（"a//b"），同样的路径会因空串个数不同而算出不同 key。
//    既有用例的 schemePath 都不含空元素。
import { globalLineModelKey as modelKeyForTest } from "./globalLineRegistry.mjs";

describe("globalLineModelKey 的 idx 归一化", () => {
  test("只接受正安全整数：小数被拒（否则两条模型算出同一个 key）", () => {
    expect(modelKeyForTest(1)).toBe("model:1");
    expect(modelKeyForTest(1.5)).toBe("path:");
    expect(modelKeyForTest(2.0000001)).toBe("path:");
  });

  test("非正数、NaN、Infinity、字符串数字都退回 path 键", () => {
    for (const bad of [0, -1, NaN, Infinity, -Infinity, "", "  ", null, undefined, {}, []]) {
      expect(modelKeyForTest(bad), JSON.stringify(bad)).toBe("path:");
    }
  });

  test("数字字符串按其数值参与判定", () => {
    expect(modelKeyForTest("3")).toBe("model:3");
    expect(modelKeyForTest("3.5")).toBe("path:");
  });

  test("超���安全整数范围被拒（isSafeInteger 而非 isFinite）", () => {
    expect(modelKeyForTest(Number.MAX_SAFE_INTEGER)).toBe(`model:${Number.MAX_SAFE_INTEGER}`);
    expect(modelKeyForTest(Number.MAX_SAFE_INTEGER + 2)).toBe("path:");
  });

  test("idx 无效时退回 path 键，schemePath 的空元素被丢弃", () => {
    // 空串若被保留，"a//b" 与 "a/b" 会算出不同 key —— 同一个方案却认不出自己
    expect(modelKeyForTest(0, ["a", "", "b"])).toBe("path:a/b");
    expect(modelKeyForTest(0, ["a", "  ", "b"])).toBe("path:a/b");
    expect(modelKeyForTest(0, ["a", "b"])).toBe("path:a/b");
  });

  test("schemePath 元素两侧空白被裁掉", () => {
    expect(modelKeyForTest(0, ["  a  ", "\tb\n"])).toBe("path:a/b");
  });

  test("非数组 schemePath 当空处理，不抛", () => {
    expect(modelKeyForTest(0, "不是数组")).toBe("path:");
    expect(modelKeyForTest(0, null)).toBe("path:");
  });

  test("projectName 单独也能构成 path 键", () => {
    expect(modelKeyForTest(0, [], "  方案甲  ")).toBe("path:方案甲");
  });
});

// normalizedStringArray 的 `.filter(Boolean)` 在 `globalLineModelKey` 里**观察不到**
// —— 那函数自己又带一份 filter（第二条路）。能观察到的是走 `normalizeReference`
// 的引用去重：referenceKey 由 modelKey + nodeId 拼成，modelKey 走
// globalLineModelKey，于是 schemePath 里多一个空串的引用会算出不同 modelKey。
describe("schemePath 归一化对引用去重的影响", () => {
  const seedLine = () => line("seed-line", "ac-routable-line", "src", "dst");

  test("attach 时带空串的 schemePath 与不带空串的算出同一个 modelKey", async () => {
    const record = await registry.attach({
      energyType: "ac",
      name: "空串归一线路",
      node: seedLine(),
      reference: { projectIdx: 0, schemePath: ["方案", "", "子方案"], projectName: "模型甲", nodeId: "seed-line", boundaryEndpoint: "source" }
    });
    expect(record.references).toHaveLength(1);
    expect(record.references[0].modelKey).toBe("path:方案/子方案/模型甲");
  });

  test("detach 用带空串的 schemePath 能摘掉用干净 schemePath 挂上的引用", async () => {
    const clean = { projectIdx: 0, schemePath: ["方案", "子方案"], projectName: "模型甲", nodeId: "seed-line", boundaryEndpoint: "source" };
    const record = await registry.attach({ energyType: "ac", name: "去重线路", node: seedLine(), reference: clean });
    expect(record.references).toHaveLength(1);

    // 归一化后两者 modelKey 相同 ⇒ 引用被摘掉
    const detached = await registry.detach({
      globalLineId: record.id,
      reference: { projectIdx: 0, schemePath: ["方案", "  ", "子方案"], projectName: "模型甲", nodeId: "seed-line", boundaryEndpoint: "source" }
    });
    expect(detached.references).toEqual([]);
  });

  test("空白字符与空串等价（同为「没有这一段」）", async () => {
    const record = await registry.attach({
      energyType: "ac",
      name: "空白归一线路",
      node: seedLine(),
      reference: { projectIdx: 0, schemePath: ["\t方案\n", "　"], projectName: "模型甲", nodeId: "seed-line", boundaryEndpoint: "source" }
    });
    expect(record.references[0].modelKey).toBe("path:方案/模型甲");
  });

  test("重复引用不会累积（modelKey+nodeId 相同即视为同一条）", async () => {
    const reference = { projectIdx: 0, schemePath: ["方案"], projectName: "模型甲", nodeId: "seed-line", boundaryEndpoint: "source" };
    await registry.attach({ energyType: "ac", name: "重复引用线路", node: seedLine(), reference });
    const again = await registry.attach({
      energyType: "ac",
      globalLineId: (await registry.list())[0].id,
      node: seedLine(),
      reference
    });
    expect(again.references).toHaveLength(1);
  });

  // 上面几条仍咬不住 `.filter(Boolean)`，而下面这组 deleteEmpty 用例**也**咬不住。
  // 查清了原因，记在这里免得下一个人再走一遍：
  //
  //   normalizedStringArray 的 8 个调用点里，7 个的输出最终都进 globalLineModelKey
  //   或 schemePathForProjectFile —— **这两处各自都带 filter(Boolean)**（第二条路）。
  //   剩下 line 623 的 storedProjectMatchesReference 走
  //   `JSON.stringify(normalizedStringArray(...)) === JSON.stringify(storedProject.schemePath)`，
  //   看着没有第二条路，但 storedProject.schemePath 来自 schemePathForProjectFile，
  //   而它是从**目录层级**推出来的 —— mkdir 不允许空目录名，探针实测
  //   `writeProject("主方案//")` 与 `writeProject("主方案")` 推出的 schemePath 完全一样。
  //   引用侧的 `["主方案",""]` 又被 modelKey 那条带 filter 挡掉。
  //
  // 结论：这个 `.filter(Boolean)` 是**冗余防御**而非承重逻辑，变异下绿是正确结果
  // （AGENTS.md「A green mutation is not always a broken test」）。
  //
  // 下面这组 deleteEmpty 用例的实测覆盖范围，如实记下：
  //   ✓ 咬得住「otherStoredEndpointRetainsGlobalLine 整个不跑」（变异 ④ 转红，
  //     不过真正抓住它的是既有的「另一端模型存在且保存有同一全局线路时…」那条）
  //   ✗ 咬不住「storedProjectMatchesReference 里删掉 schemePath 比对」（变异 ③ 绿）：
  //     因为既有的那条用例里 projectName 已经不同，删掉 schemePath 比对不影响结论。
  //     要咬住它需要「projectName 相同、schemePath 不同」且期望判为不同项目 ——
  //     但那要求引用与已存项目 modelKey 不同、而它们 name 相同，这个组合在真实调用里
  //     不出现（modelKey 正是 name 与 schemePath 拼出来的）。故判定为不可构造，
  //     不硬凑断言。
  const seedCrossProjectRecord = async ({ keepSecond }) => {
    const first = {
      projectIdx: 0,
      schemePath: ["主方案"],
      projectName: "厂站一",
      nodeId: "line-a",
      boundaryEndpoint: "source",
      boundaryNodeId: "station-one",
      boundaryTerminalId: "t1"
    };
    const record = await registry.attach({
      energyType: "ac",
      name: "跨项目占位线路",
      node: line("line-a", "ac-routable-line", "station-one", "bus-one"),
      reference: first
    });
    // 摘掉本项目这一端，references 清空（deleteEmpty 的第一个前提）
    await registry.detach({ globalLineId: record.id, reference: first });
    // 再挂另一端的引用：projectName 不同 ⇒ modelKey 不同（第二个前提）
    const second = {
      projectIdx: 0,
      schemePath: ["主方案"],
      projectName: "厂站二",
      nodeId: "line-b",
      boundaryEndpoint: "target",
      boundaryNodeId: "bus-one",
      boundaryTerminalId: "t2"
    };
    await registry.attach({
      energyType: "ac",
      globalLineId: record.id,
      node: line("line-b", "ac-routable-line", "bus-one", "station-two"),
      reference: second
    });
    // keepSecond=false 时摘掉它 —— 但那样 otherStoredEndpointRetainsGlobalLine 没有
    // 迭代对象，所以「允许删除」那条只能靠 references 为空 + 落盘项目不匹配。
    if (!keepSecond) {
      await registry.detach({ globalLineId: record.id, reference: second });
    }
    return { record, second };
  };

  test("已存项目的 schemePath 与引用归一后相等 ⇒ 判定仍被占用，拒绝删除", async () => {
    const { record, second } = await seedCrossProjectRecord({ keepSecond: true });
    // schemePath 由目录层级推出：filesRoot/主方案/ ⇒ ["主方案"]，与引用一致
    await writeProject("主方案", "模型B.json", {
      idx: 0,
      name: second.projectName,
      modelType: "厂站",
      nodes: [line("line-b", "ac-routable-line", "bus-one", "station-two", { _globalLineId: record.id })]
    });
    await expect(registry.deleteEmpty({ id: record.id })).rejects.toMatchObject({ statusCode: 409 });
  });

  test("references 已清空且已存项目 schemePath 不等 ⇒ 允许删除", async () => {
    const { record, second } = await seedCrossProjectRecord({ keepSecond: false });
    // 落在 另一方案/ 下 ⇒ schemePath ["另一方案"]，与引用 ["主方案"] 不等
    await writeProject("另一方案", "真无关.json", {
      idx: 0,
      name: second.projectName,
      modelType: "厂站",
      nodes: [line("line-b", "ac-routable-line", "bus-one", "station-two", { _globalLineId: record.id })]
    });
    await expect(registry.deleteEmpty({ id: record.id })).resolves.toMatchObject({ id: record.id });
  });
});

// ─── 读侧容错：归一化损坏输入（normalizeRecord / normalizeState）──────
//
// 这两个函数都只在读盘路径上生效（readState → normalizeState → normalizeRecord），
// 且都**故意**不抛错：注册表 JSON 是用户可编辑的落盘文件，一个坏记录不该让
// 整张表读不出来。因此必须从 `registryPath` 灌损坏数据、再新建一个 registry
// 实例触发首次读取，才能观察到真实降级形态。
//
// 两个坑记在这里免得下一个人重走：
//
// ① `migrateStoredProjects` 在 ensureInitialized 里会执行
//    `if (!reuseOnlyRecordIds.has(record.id)) record.references = []`，
//    **无条件清空所有记录的 references**。所以直接 list() 看到的 degree 恒为 0，
//    那不是 normalizeRecord 的降级结果。要观察归一化后的引用，
//    必须在某个受管项目的 .json 里放一个带 `_globalLineId` 且
//    `_globalLineModelPair` 为 source/target 的节点，把该记录标进 reuseOnlyRecordIds。
//    下面的 seedReuseOnlyReference 就是干这个的。
//
// ② 反过来说，**不**放该节点时，「references 归一化后为空」这一条也可以观察 ——
//    但它此时会被迁移清空混淆，只能用来断言降级后结构合法（数组、degree 0、
//    endpointSlots 为 null），不能用来断言 normalizeRecord 保留了什么。
//    故下面两条分别用两条通道：一条带 reuseOnly 看保留、一条不带看降级。
const STAMP = "2026-01-01T00:00:00.000Z";

async function seedRegistryFile(records, lastIndex = 1) {
  await mkdir(join(dataRoot, "schemes"), { recursive: true });
  return writeFile(
    registry.registryPath,
    `${JSON.stringify({ schemaVersion: 3, lastIndex, records }, null, 2)}\n`,
    "utf-8"
  );
}

function rawRecord(id, extra = {}) {
  const record = {
    id,
    idx: 1,
    name: id,
    energyType: "ac",
    params: {},
    references: [],
    createdAt: STAMP,
    updatedAt: STAMP,
    ...extra
  };
  // 显式表达「磁盘上没有 idx 键」：不靠 JSON.stringify 顺手省略 undefined 来蒙对
  if (extra.idx === undefined) delete record.idx;
  return record;
}

// 让 registryId 这条记录的 references 不被 migrateStoredProjects 清空。
// 该节点 kind 取 ac-bus（不在 AC_LINE_KINDS 里）⇒ 第二遍迁移走 removeGlobalId，
// 不会重写 record.references，只把项目文件里的 _globalLineId 抹掉。
async function seedReuseOnlyReference(schemeName, registryId) {
  await writeProject(schemeName, "模型甲.json", {
    version: 1,
    idx: 7,
    name: "模型甲",
    modelType: "厂站",
    nodes: [{
      id: "bus-keep-references",
      kind: "ac-bus",
      name: "保留引用用母线",
      params: { [GLOBAL_LINE_ID_PARAM]: registryId, _globalLineModelPair: "target" },
      terminals: []
    }],
    edges: []
  });
}

describe("读侧容错：references 损坏时静默丢弃", () => {
  const GOOD_SOURCE = {
    projectIdx: 7,
    schemePath: ["主方案"],
    projectName: "模型甲",
    nodeId: "line-good",
    boundaryEndpoint: "source",
    boundaryNodeId: "station-a",
    boundaryTerminalId: "t1"
  };
  const GOOD_TARGET = {
    projectIdx: 9,
    schemePath: [],
    projectName: "模型乙",
    nodeId: "line-target",
    boundaryEndpoint: "target",
    boundaryNodeId: "feeder-b",
    boundaryTerminalId: "t2"
  };

  // 探针实测：上列 9 条引用只有 GOOD_SOURCE 与 GOOD_TARGET 存活，其余逐条被
  // normalizeReference 抛出的 GlobalLineRegistryError 命中空 catch 而丢弃。
  // 逐条原因（哪一条会被丢）见每行注释 —— 这是本组断言的依据，不是推测。
  const DROPPED_REFERENCES = [
    { why: "null 引用：既无 modelKey 也无 nodeId", raw: null },
    { why: "只有 projectIdx：缺 nodeId，模型键算不出可定位的线路节点", raw: { projectIdx: 8 } },
    { why: "裸字符串：所有字段解引用后都是空", raw: "垃圾字符串" },
    { why: "缺 boundaryEndpoint：首末端槽位无法判定", raw: { projectIdx: 9, nodeId: "line-no-endpoint" } },
    { why: "boundaryEndpoint 是非法值 中间端", raw: { projectIdx: 10, nodeId: "line-bad-endpoint", boundaryEndpoint: "中间端" } },
    { why: "nodeId 是空串", raw: { projectIdx: 11, nodeId: "" } },
    { why: "与 GOOD_SOURCE 同一 modelKey+nodeId：去重", raw: { ...GOOD_SOURCE } },
    { why: "首端槽位已被 GOOD_SOURCE 占用", raw: { projectIdx: 12, nodeId: "line-third", boundaryEndpoint: "source" } },
    // ↓ 这一条**必须**放在 GOOD_TARGET 之前，否则 seenReferences 就观察不到：
    // 它与 GOOD_SOURCE 共享 modelKey+nodeId（⇒ seenReferences 命中），但 boundaryEndpoint
    // 是 target，此时 target 槽还空着（⇒ occupiedEndpoints 不命中）。
    // 两条守卫里只有 seenReferences 在承重。把 GOOD_TARGET 挪到它前面，
    // 这条就会被 occupiedEndpoints 完全遮住，删掉 seenReferences 整条用例照样绿
    // （AGENTS.md「被兄弟分支完全遮蔽的那条分支」）。
    { why: "与 GOOD_SOURCE 同 modelKey+nodeId 但占用另一个空槽位：靠 seenReferences 拦下", raw: { projectIdx: 7, nodeId: "line-good", boundaryEndpoint: "target" } }
  ];

  test("数组内混入的损坏引用被逐条丢弃，合法首末端按原顺序保留", async () => {
    await seedRegistryFile([
      rawRecord("r-mixed", {
        idx: 2,
        references: [
          GOOD_SOURCE,
          ...DROPPED_REFERENCES.map((item) => item.raw),
          GOOD_TARGET
        ]
      })
    ]);
    await seedReuseOnlyReference("主方案", "r-mixed");

    const [record] = await registry.list();

    // 记录本身没有因为引用损坏而消失，也没有被降级成空记录
    expect(record).toMatchObject({ id: "r-mixed", idx: 2, energyType: "ac" });
    expect(record.references.map((item) => [item.modelKey, item.nodeId, item.boundaryEndpoint])).toEqual([
      ["model:7", "line-good", "source"],
      ["model:9", "line-target", "target"]
    ]);
    expect(record).toMatchObject({
      degree: 2,
      endpointSlots: { source: { nodeId: "line-good" }, target: { nodeId: "line-target" } },
      terminalSlots: { i: { nodeId: "line-good" }, j: { nodeId: "line-target" } }
    });
    // 保留的引用被 normalizeReference 补全了 terminalSlot，并保持 schemePath 是拷贝
    expect(record.references.map((item) => item.terminalSlot)).toEqual(["i", "j"]);
    expect(record.references[0]).toMatchObject({
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "模型甲",
      boundaryNodeId: "station-a",
      boundaryTerminalId: "t1"
    });
  });

  test("references 字段不是数组时整条记录仍保留，引用降级为空数组", async () => {
    // normalizeRecord 的 for 循环写作
    // `Array.isArray(record?.references) ? record.references : []`，
    // 所以非数组形状（数字 / 字符串 / null / 类数组对象）一律按空数组处理，
    // 记录照常返回，**不是**返回 null。
    const BAD_SHAPES = [
      { id: "r-number", extra: { references: 42 }, why: "数字" },
      { id: "r-string", extra: { references: "不是数组", energyType: "dc" }, why: "字符串" },
      { id: "r-null", extra: { references: null }, why: "null" },
      { id: "r-arraylike", extra: { references: { 0: GOOD_SOURCE, length: 1 } }, why: "类数组对象" }
    ];
    await seedRegistryFile(
      BAD_SHAPES.map((item, index) => rawRecord(item.id, { idx: 3 + index, ...item.extra }))
    );

    const records = await registry.list();

    // 四条都在，顺序按 idx
    expect(records.map((item) => item.id)).toEqual(["r-number", "r-string", "r-null", "r-arraylike"]);
    for (const record of records) {
      const shape = BAD_SHAPES.find((item) => item.id === record.id);
      expect(Array.isArray(record.references), record.id).toBe(true);
      expect(record.references, record.id).toEqual([]);
      expect(record.degree, record.id).toBe(0);
      expect(record.endpointSlots, record.id).toEqual({ source: null, target: null });
      expect(record.terminalSlots, record.id).toEqual({ i: null, j: null });
      // 记录的其他字段不受 references 形状影响
      expect(record.name, record.id).toBe(record.id);
      expect(shape.why).toBeTruthy();
    }
    expect(records.map((item) => item.idx)).toEqual([3, 4, 5, 6]);
    expect(records.find((item) => item.id === "r-string")?.energyType).toBe("dc");

    // 降级后的形状被原子写回磁盘：references 是数组而不是原始的坏值
    const onDisk = JSON.parse(await readFile(registry.registryPath, "utf-8"));
    expect(onDisk.records.map((item) => item.references)).toEqual([[], [], [], []]);
  });

  test("references 整体缺失的记录同样归一化为空引用而不是报错", async () => {
    await seedRegistryFile([rawRecord("r-absent", { idx: 9 })]);

    const [record] = await registry.list();

    expect(record).toMatchObject({ id: "r-absent", idx: 9, degree: 0 });
    expect(record.references).toEqual([]);
    expect(record.endpointSlots).toEqual({ source: null, target: null });
  });
});

describe("读侧容错：idx 缺失或重复时按 maxIndex+1 重分配", () => {
  // normalizeState 的策略（源码 line 199-204）：
  //   let idx = record.idx;                 // 已由 positiveInteger 归一，非正数 → 0
  //   if (idx <= 0 || indexes.has(idx)) idx = maxIndex + 1;
  //   indexes.add(idx); maxIndex = Math.max(maxIndex, idx);
  // 关键：**取当前已分配的最大值 +1**，而不是「数组下标 +1」也不是「找最小空洞」。
  // 因此出现过 12 之后，重分配只会继续往上走，绝不会回头补 11。
  test("缺失、重复、负数、小数 idx 全部重分配为 maxIndex+1 且互不冲突", async () => {
    await seedRegistryFile([
      rawRecord("r-valid-5", { idx: 5 }),
      rawRecord("r-valid-7", { idx: 7 }),
      rawRecord("r-missing", { idx: undefined, name: "缺失序号" }),
      rawRecord("r-dup-first", { idx: 12, name: "重复序号甲" }),
      rawRecord("r-dup-second", { idx: 12, name: "重复序号乙" }),
      rawRecord("r-negative", { idx: -3, name: "负序号" }),
      rawRecord("r-fraction", { idx: 4.5, name: "小数序号" }),
      rawRecord("r-numeric-string", { idx: "9", name: "数字字符串序号" }),
      rawRecord("r-zero", { idx: 0, name: "零序号" }),
      rawRecord("r-garbage", { idx: "不是数字", name: "非数字序号" })
    ]);

    const records = await registry.list();

    // list() 按 idx 升序。注意 r-numeric-string 的 "9" 是合法正整数（positiveInteger
    // 接受数字字符串），所以**不**走重分配，而是留在自己的 9 上。
    expect(records.map((item) => [item.id, item.idx])).toEqual([
      ["r-valid-5", 5],
      ["r-valid-7", 7],
      ["r-missing", 8],
      ["r-numeric-string", 9],
      ["r-dup-first", 12],
      ["r-dup-second", 13],
      ["r-negative", 14],
      ["r-fraction", 15],
      ["r-zero", 16],
      ["r-garbage", 17]
    ]);
  });

  test("idx 不重复且同刻写入磁盘，重启后不再二次重分配", async () => {
    await seedRegistryFile([
      rawRecord("r-a", { idx: 4 }),
      rawRecord("r-b", { idx: 4 }),
      rawRecord("r-c", { idx: undefined })
    ]);

    const records = await registry.list();
    const idxs = records.map((item) => item.idx);

    // 唯一性 + 策略一致：4 保留，第一条重复的 4 被抬到 5，缺失的那个抬到 6
    expect(idxs).toEqual([4, 5, 6]);
    expect(new Set(idxs).size).toBe(idxs.length);
    expect(idxs.every((value) => Number.isSafeInteger(value) && value > 0)).toBe(true);
    // 不会出现「补空洞」的结果：11 这类空洞不会被回头占用
    expect(idxs).not.toContain(3);

    const onDisk = JSON.parse(await readFile(registry.registryPath, "utf-8"));
    expect(onDisk.records.map((item) => item.idx)).toEqual([4, 5, 6]);
    // lastIndex 抬到重分配后的最大值，下一条新建记录从 7 起，不会与既有 idx 撞号
    expect(onDisk.lastIndex).toBe(6);

    const reloaded = await createGlobalLineRegistry({ dataRoot, schemeFilesRoot: filesRoot }).list();
    expect(reloaded.map((item) => item.idx)).toEqual([4, 5, 6]);
  });

  test("id 重复的记录整条被丢弃，不会参与 idx 分配", async () => {
    await seedRegistryFile([
      rawRecord("r-dup-id", { idx: 3, name: "首个" }),
      rawRecord("r-dup-id", { idx: 8, name: "第二个" }),
      rawRecord("r-after", { idx: undefined })
    ]);

    const records = await registry.list();

    // 第二条 r-dup-id 在 ids.has(record.id) 处 continue：既不占 idx，也不产生记录
    expect(records.map((item) => [item.id, item.idx, item.name])).toEqual([
      ["r-dup-id", 3, "首个"],
      ["r-after", 4, "r-after"]
    ]);
  });
});
// ─── 端点参数缺失时的归一（endpointNodeIds，line 48 / line 49）────────────
//
// `endpointNodeIds` 对缺失的端点参数用 `?? ""` 兜成空串，随后被 `.filter(Boolean)`
// 丢掉 —— 这正是它与 `boundaryReferenceMetadata`（line 456/457，同样读这两个参数）
// 的区别：后者把缺失留成空串，靠 `if (!boundaryEndpoint) return {}` 挡住。
//
// 为什么这两条分支可观察：`lineTouchesBoundary` 只问「端点 id 集合里有没有边界设备」。
// 去掉 `?? ""` 后 `String(undefined)` 得到字面量 "undefined"，它**会被 filter 保留**，
// 于是「本来没端点」的线路可能因为项目里恰好有一个 id 为 "undefined" 的节点而被判为
// 跨模型线路。这两种数据在现实中都出现过（前端 `String(node.params.x)` 写回、
// 用户手改模型 JSON），因此是合法输入，不是构造出来的巧合。
describe("缺失端点 id 归一为空串，不与同名字面量的设备串号", () => {
  test("端点参数缺失的线路不迁移，项目里存在 id 字面量为 undefined 的边界设备也一样", async () => {
    const ghost = node("undefined", "ac-station-source", { model_id: "7" }, "id 为 undefined 字面量的设备");
    const bus = node("bus-1", "ac-bus");
    const sourceMissing = node("line-source-missing", "ac-routable-line", {
      rated_capacity: "220",
      i_node: "1",
      j_node: "2",
      _routableLineTargetNodeId: bus.id
    }, "缺首端点的线路");
    const targetMissing = node("line-target-missing", "ac-routable-line", {
      rated_capacity: "220",
      i_node: "1",
      j_node: "2",
      _routableLineSourceNodeId: bus.id
    }, "缺末端点的线路");
    const good = line("line-good", "ac-routable-line", bus.id, ghost.id, {}, "正常边界线路");
    const projectPath = await writeProject("方案A", "厂站一.json", {
      version: 1, idx: 7, name: "厂站一", modelType: "厂站",
      nodes: [ghost, bus, sourceMissing, targetMissing, good],
      edges: []
    });

    const records = await registry.list();

    // 探针非空：确实有一条线路迁了 —— 否则「没迁移」可能只是整批用例没进迁移流程
    expect(records.map((record) => record.name)).toEqual(["正常边界线路"]);
    expect(records[0].endpointSlots.target).toMatchObject({ boundaryNodeId: ghost.id });

    const stored = JSON.parse(await readFile(projectPath, "utf-8"));
    for (const id of ["line-source-missing", "line-target-missing"]) {
      expect(stored.nodes.find((item) => item.id === id)?.params[GLOBAL_LINE_ID_PARAM], id).toBeUndefined();
    }
    expect(stored.nodes.find((item) => item.id === "line-good")?.params.idx).toBe(String(records[0].idx));
  });
});

// ─── normalizedStringArray / globalLineModelKey 的缺省元素（line 74 / 85）──
//
// 两个都是「缺省值不得变成字符串字面量」的同类守卫：
//   line 74 `String(item ?? "")`  —— schemePath 的元素为 null/undefined
//   line 85 `String(projectName ?? "")` —— projectName 显式为 null
// 均直接打 `globalLineModelKey`（已导出，discipline §3：走原始形态，不经聚合入口）。
// 生产侧同样可达：`readStoredManagedProjects` 把磁盘上的 `project.name` 原样传进
// line 85，手改过的模型 JSON 里 `name: null` 是真实形状。
describe("schemePath 元素与 projectName 的缺省处理", () => {
  test("schemePath 里的 null / undefined 元素按缺省处理，不进入 modelKey", () => {
    expect(modelKeyForTest(0, [null, "方案", undefined, "子方案"])).toBe("path:方案/子方案");
    expect(modelKeyForTest(0, [null, "方案"])).toBe("path:方案");
    expect(modelKeyForTest(0, [undefined])).toBe("path:");
  });

  test("attach 的引用里 schemePath 含 null 元素时 modelKey 不含 null 字面量", async () => {
    const record = await registry.attach({
      energyType: "ac",
      name: "空元素归一线路",
      node: line("seed-line", "ac-routable-line", "src", "dst"),
      reference: {
        projectIdx: 0,
        schemePath: [null, "方案", undefined, "子方案"],
        projectName: "模型甲",
        nodeId: "seed-line",
        boundaryEndpoint: "source"
      }
    });
    expect(record.references[0].modelKey).toBe("path:方案/子方案/模型甲");
  });

  test("projectName 显式为 null 时按缺省处理，不产生 null 字面量", () => {
    expect(modelKeyForTest(0, ["方案"], null)).toBe("path:方案");
    expect(modelKeyForTest(0, [], null)).toBe("path:");
    // 对照：undefined 走的是默认形参，两条缺省路径产出同一个键
    expect(modelKeyForTest(0, ["方案"], undefined)).toBe("path:方案");
    expect(modelKeyForTest(0, ["方案"], "  ")).toBe("path:方案");
  });
});

// ─── boundaryEndpoint 缺省时按 terminalSlot 回退（line 92 / line 93）──────
//
// normalizeReference 的入参来自 attach / detach 的请求体，客户端可以直接给
// terminalSlot 而不给 boundaryEndpoint。若这两条回退被删，boundaryEndpoint 为空 ⇒
// 抛 400「必须明确区分首端或末端」，即整条 attach 从成功变拒绝。
describe("boundaryEndpoint 缺省时按 terminalSlot 回退", () => {
  test("terminalSlot 为 i 时被认作首端", async () => {
    const record = await registry.attach({
      energyType: "ac",
      name: "槽位回退首端线路",
      node: line("line-slot-i", "ac-routable-line", "src", "dst"),
      reference: { projectIdx: 1, schemePath: ["方案"], projectName: "模型一", nodeId: "line-slot-i", terminalSlot: "i" }
    });
    expect(record.references[0]).toMatchObject({ boundaryEndpoint: "source", terminalSlot: "i" });
    expect(record.endpointSlots.source?.nodeId).toBe("line-slot-i");
    expect(record.endpointSlots.target).toBeNull();
    expect(record.terminalSlots.i?.nodeId).toBe("line-slot-i");
    expect(record.terminalSlots.j).toBeNull();
  });

  test("terminalSlot 为 j 时被认作末端", async () => {
    const record = await registry.attach({
      energyType: "ac",
      name: "槽位回退末端线路",
      node: line("line-slot-j", "ac-routable-line", "src", "dst"),
      reference: { projectIdx: 1, schemePath: ["方案"], projectName: "模型一", nodeId: "line-slot-j", terminalSlot: "j" }
    });
    expect(record.references[0]).toMatchObject({ boundaryEndpoint: "target", terminalSlot: "j" });
    expect(record.endpointSlots.target?.nodeId).toBe("line-slot-j");
    expect(record.endpointSlots.source).toBeNull();
    expect(record.terminalSlots.j?.nodeId).toBe("line-slot-j");
    expect(record.terminalSlots.i).toBeNull();
  });

  test("首末端都已占满时两条槽位回退仍分别落到不同槽", async () => {
    const first = await registry.attach({
      energyType: "dc",
      name: "槽位回退双端线路",
      node: line("line-dc", "dc-routable-line", "src", "dst"),
      reference: { projectIdx: 1, schemePath: ["方案"], projectName: "模型一", nodeId: "line-dc", terminalSlot: "i" }
    });
    const both = await registry.attach({
      globalLineId: first.id,
      energyType: "dc",
      node: line("line-dc-2", "dc-routable-line", "src", "dst"),
      reference: { projectIdx: 2, schemePath: ["方案"], projectName: "模型二", nodeId: "line-dc-2", terminalSlot: "j" }
    });
    expect(both.degree).toBe(2);
    expect(both.endpointSlots).toMatchObject({
      source: { nodeId: "line-dc", boundaryEndpoint: "source" },
      target: { nodeId: "line-dc-2", boundaryEndpoint: "target" }
    });
  });
});

// ─── 改接判定 boundaryAssociationChanged（line 107 / 108）───────────────
//
// addReference 只在「该引用已存在（existingIndex >= 0）」且「出线度已达 2」时
// 才问 boundaryAssociationChanged。三条判据逐条独立，删掉任何一条都只会放过
// 一次本该拒绝的改接。
describe("首末端都已关联时的改接判定", () => {
  const seedTwoEnded = async (name, sourceReference) => {
    const first = await registry.attach({
      energyType: "ac",
      name,
      node: line("line-a", "ac-routable-line", "a", "b", {}, name),
      reference: sourceReference
    });
    await registry.attach({
      globalLineId: first.id,
      energyType: "ac",
      name,
      node: line("line-b", "ac-routable-line", "a", "b"),
      reference: {
        projectIdx: 2, schemePath: ["方案"], projectName: "模型二",
        nodeId: "line-b", boundaryEndpoint: "target",
        boundaryNodeId: "feeder-b", boundaryTerminalId: "t2"
      }
    });
    return first.id;
  };

  test("已存引用没有边界节点、新引用补上边界节点时拒绝改接", async () => {
    const id = await seedTwoEnded("补边界节点线路", {
      projectIdx: 1, schemePath: ["方案"], projectName: "模型一",
      nodeId: "line-a", boundaryEndpoint: "source"
    });

    await expect(registry.attach({
      globalLineId: id,
      energyType: "ac",
      node: line("line-a", "ac-routable-line", "a", "b"),
      reference: {
        projectIdx: 1, schemePath: ["方案"], projectName: "模型一",
        nodeId: "line-a", boundaryEndpoint: "source",
        boundaryNodeId: "station-new"
      }
    })).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining("先删除另一端") });

    const kept = (await registry.list()).find((record) => record.id === id);
    expect(kept.endpointSlots.source).not.toHaveProperty("boundaryNodeId");
    expect(kept.degree).toBe(2);
  });

  test("已存引用有边界节点、新引用不带时同样拒绝改接", async () => {
    const id = await seedTwoEnded("去边界节点线路", {
      projectIdx: 1, schemePath: ["方案"], projectName: "模型一",
      nodeId: "line-a", boundaryEndpoint: "source",
      boundaryNodeId: "station-old", boundaryTerminalId: "t1"
    });

    await expect(registry.attach({
      globalLineId: id,
      energyType: "ac",
      node: line("line-a", "ac-routable-line", "a", "b"),
      reference: {
        projectIdx: 1, schemePath: ["方案"], projectName: "模型一",
        nodeId: "line-a", boundaryEndpoint: "source",
        boundaryTerminalId: "t1"
      }
    })).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining("先删除另一端") });

    const kept = (await registry.list()).find((record) => record.id === id);
    expect(kept.endpointSlots.source).toMatchObject({ boundaryNodeId: "station-old", boundaryTerminalId: "t1" });
  });

  test("边界节点相同但端子不同时拒绝改接（原引用端子不被改写）", async () => {
    const id = await seedTwoEnded("换端子线路", {
      projectIdx: 1, schemePath: ["方案"], projectName: "模型一",
      nodeId: "line-a", boundaryEndpoint: "source",
      boundaryNodeId: "station-a", boundaryTerminalId: "t1"
    });

    await expect(registry.attach({
      globalLineId: id,
      energyType: "ac",
      node: line("line-a", "ac-routable-line", "a", "b"),
      reference: {
        projectIdx: 1, schemePath: ["方案"], projectName: "模型一",
        nodeId: "line-a", boundaryEndpoint: "source",
        boundaryNodeId: "station-a", boundaryTerminalId: "t9"
      }
    })).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining("先删除另一端") });

    const kept = (await registry.list()).find((record) => record.id === id);
    expect(kept.endpointSlots.source).toMatchObject({ boundaryNodeId: "station-a", boundaryTerminalId: "t1" });
    expect(kept.degree).toBe(2);
  });

  // 上面两条关于 boundaryNodeId 的 `?? ""`：删掉它们在**可达域内恒等价** ——
  // normalizeReference 只在 trim 后非空时才写 boundaryNodeId，所以每个参与
  // 比较的值要么是 undefined、要么是非空字符串。把 undefined 换成 "undefined"
  // 字面量，与换回空串对「是否相等」这一判定没有区别：两边都缺 → 两边都是同一个
  // token；一边缺一边有 → 两种写法都判为不等。这属 AGENTS.md 记录的
  // 「A green mutation is not always a broken test」，故按原样留白，不硬凑断言。
  // 已实测确认：把 L107 的两个 `?? ""` 都删掉后本文件 52 条用例**全绿**，
  // 属于上表登记的等价变异，不是漏测。
  // 真正承重的是第三条：它证明这条判据链在 boundaryNodeId 相同之后**还会继续**
  // 比 boundaryTerminalId。
});

// ─── 读侧容错：id / name 缺失或空白时的兜底（line 162 / line 164）────────
//
// 同 AGENTS.md 的 key 取值空间纪律：id 可以缺失、也可以是空白串，两条都落到
// randomUUID 兜底。断言「三条坏 id 记录补出三个互不相同的 id」——若两条缺省路径
// 产出相同 id，normalizeState 的 ids 去重会把记录整条吃掉，条数先变。
const GENERATED_ID = /^global-line-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("读侧容错：id 缺失或空白时补随机 id", () => {
  test("缺 id、空白 id 与整条为 null 的记录各自补出互不相同的随机 id", async () => {
    await seedRegistryFile([
      null,
      { id: "r-named", idx: 5, name: "有 id", energyType: "ac", params: {}, references: [], createdAt: STAMP, updatedAt: STAMP },
      { id: "   ", idx: 6, name: "空白 id", energyType: "ac", params: {}, references: [], createdAt: STAMP, updatedAt: STAMP },
      { idx: 7, name: "无 id", energyType: "ac", params: {}, references: [], createdAt: STAMP, updatedAt: STAMP }
    ]);

    const records = await registry.list();

    // null 记录本身也要活下来（normalizeRecord 处处用 ?. 兜，不抛）
    expect(records).toHaveLength(4);
    const [nullRecord, named, blank, missing] = records;
    expect(named.id).toBe("r-named");
    expect(new Set([nullRecord.id, blank.id, missing.id]).size).toBe(3);
    for (const record of [nullRecord, blank, missing]) {
      expect(record.id).toMatch(GENERATED_ID);
    }
    // 兜底只补 id，其余字段照常归一
    expect(nullRecord).toMatchObject({ idx: 1, name: "交流线路-1", energyType: "ac", degree: 0 });
    expect(blank.idx).toBe(6);
    expect(missing.idx).toBe(7);

    const onDisk = JSON.parse(await readFile(registry.registryPath, "utf-8"));
    expect(onDisk.records.filter((item) => item.id !== "r-named").every((item) => GENERATED_ID.test(item.id))).toBe(true);
  });

  test("补出的 id 落盘后重启不再变化", async () => {
    await seedRegistryFile([
      { idx: 2, name: "无 id", energyType: "ac", params: {}, references: [], createdAt: STAMP, updatedAt: STAMP }
    ]);

    const [first] = await registry.list();
    expect(first.id).toMatch(GENERATED_ID);
    const reloaded = await createGlobalLineRegistry({ dataRoot, schemeFilesRoot: filesRoot }).list();
    expect(reloaded.map((item) => item.id)).toEqual([first.id]);
  });
});

describe("读侧容错：name 缺失或空白时补默认名", () => {
  test("按能源类型与原始 idx 补默认名，空白名同样被替换", async () => {
    await seedRegistryFile([
      { id: "r-no-name", idx: 1, energyType: "ac", params: {}, references: [], createdAt: STAMP, updatedAt: STAMP },
      { id: "r-blank", idx: 4, name: "  \t ", energyType: "ac", params: {}, references: [], createdAt: STAMP, updatedAt: STAMP },
      { id: "r-dc", idx: 0, energyType: "dc", params: {}, references: [], createdAt: STAMP, updatedAt: STAMP },
      { id: "r-keep", idx: 9, name: "  保留两侧空白  ", energyType: "ac", params: {}, references: [], createdAt: STAMP, updatedAt: STAMP }
    ]);

    const records = await registry.list();

    expect(records.map((item) => [item.id, item.name, item.idx])).toEqual([
      // idx 为 0 时默认名落到 idx || 1 的 1 —— 0 本身是合法输入，不能写成 0
      ["r-no-name", "交流线路-1", 1],
      ["r-blank", "交流线路-4", 4],
      ["r-dc", "直流线路-1", 5],
      ["r-keep", "保留两侧空白", 9]
    ]);
  });

  test("默认名里的序号取 normalizeRecord 当时的 idx，而非后续重分配的结果", async () => {
    // 两条 idx 都被 normalizeState 抬到 maxIndex+1（3、4），但默认名是更早一步
    // 用原始 idx（0、2）算出来的 —— 名字不会被重分配带偏。
    await seedRegistryFile([
      { id: "r-x", idx: 5, name: "占位", energyType: "ac", params: {}, references: [], createdAt: STAMP, updatedAt: STAMP },
      { id: "r-y", energyType: "ac", params: {}, references: [], createdAt: STAMP, updatedAt: STAMP },
      { id: "r-z", idx: 2, energyType: "dc", params: {}, references: [], createdAt: STAMP, updatedAt: STAMP }
    ]);

    const records = await registry.list();

    // list() 按最终 idx 升序：2 / 5 / 6
    expect(records.map((item) => [item.id, item.name, item.idx])).toEqual([
      ["r-z", "直流线路-2", 2],
      ["r-x", "占位", 5],
      ["r-y", "交流线路-1", 6]
    ]);
    // 名字里的序号来自**归一化当时**的原始 idx（r-y 是 0 → 兜底 1），
    // 与随后被 normalizeState 重分配出来的最终 idx 6 不是同一个数
    const renamed = records.find((item) => item.id === "r-y");
    expect(renamed.name).toBe(`交流线路-${1}`);
    expect(renamed.name).not.toContain(String(renamed.idx));
  });
});
// ─── line 108：boundaryTerminalId 两侧的 `?? ""` ────────────────────────
//
// 与 boundaryNodeId 不同，端子 id 这一侧的两个 `?? ""` **可达且承重**：
// 归一化后的引用可以「完全没有边界端子」（attach 时不传 boundaryTerminalId），
// 于是再传一个带端子的同端引用时，判据链要靠 `String(undefined ?? "")` 得到
// 空串才判得出「变了」。删掉 `?? ""` 后两边都变成字面量 "undefined"，
// 「一边有端子、一边没有」仍能判为不等 —— 所以这一侧要断的是**反向**：
// 已存没有端子、新引用补上端子（current 侧），以及已存有端子、新引用删掉
// 端子（next 侧）。两条都必须让 boundaryEndpoint 与 boundaryNodeId 都相等，
// 才会落到第 108 行。
describe("边界端子有增删同样算改接", () => {
  const seedTwoEnded = async (name, sourceReference) => {
    const first = await registry.attach({
      energyType: "ac",
      name,
      node: line("line-a", "ac-routable-line", "a", "b", {}, name),
      reference: sourceReference
    });
    await registry.attach({
      globalLineId: first.id,
      energyType: "ac",
      name,
      node: line("line-b", "ac-routable-line", "a", "b"),
      reference: {
        projectIdx: 2, schemePath: ["方案"], projectName: "模型二",
        nodeId: "line-b", boundaryEndpoint: "target",
        boundaryNodeId: "feeder-b", boundaryTerminalId: "t2"
      }
    });
    return first.id;
  };

  test("已存引用没有边界端子、新引用补上端子时拒绝改接", async () => {
    const id = await seedTwoEnded("补端子线路", {
      projectIdx: 1, schemePath: ["方案"], projectName: "模型一",
      nodeId: "line-a", boundaryEndpoint: "source",
      boundaryNodeId: "station-a"
    });

    await expect(registry.attach({
      globalLineId: id,
      energyType: "ac",
      node: line("line-a", "ac-routable-line", "a", "b"),
      reference: {
        projectIdx: 1, schemePath: ["方案"], projectName: "模型一",
        nodeId: "line-a", boundaryEndpoint: "source",
        boundaryNodeId: "station-a", boundaryTerminalId: "t9"
      }
    })).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining("先删除另一端") });

    const kept = (await registry.list()).find((record) => record.id === id);
    // 判据链能走到 boundaryTerminalId 这一层，说明前两段（端点、边界节点）都判为相等
    expect(kept.endpointSlots.source).toMatchObject({ boundaryNodeId: "station-a" });
    expect(kept.endpointSlots.source).not.toHaveProperty("boundaryTerminalId");
  });

  test("已存引用有边界端子、新引用不带端子时拒绝改接", async () => {
    const id = await seedTwoEnded("去端子线路", {
      projectIdx: 1, schemePath: ["方案"], projectName: "模型一",
      nodeId: "line-a", boundaryEndpoint: "source",
      boundaryNodeId: "station-a", boundaryTerminalId: "t1"
    });

    await expect(registry.attach({
      globalLineId: id,
      energyType: "ac",
      node: line("line-a", "ac-routable-line", "a", "b"),
      reference: {
        projectIdx: 1, schemePath: ["方案"], projectName: "模型一",
        nodeId: "line-a", boundaryEndpoint: "source",
        boundaryNodeId: "station-a"
      }
    })).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining("先删除另一端") });

    const kept = (await registry.list()).find((record) => record.id === id);
    expect(kept.endpointSlots.source).toMatchObject({ boundaryNodeId: "station-a", boundaryTerminalId: "t1" });
    expect(kept.degree).toBe(2);
  });
});

// ─── 已知不可达：line 67 `localParams` 里的 `node?.params ?? {}` ──────────
//
// v8 分支覆盖显示 `?? {}` 的右侧分支计数恒为 0，且**无法**从公开入口把它走到：
// `localParams` 只有两个调用点（`applyRecordToNode` L378、`globalLineNodeForStorage`
// L391），而这两个函数各自的所有调用点（L439 / L973 / L993 / L418 / L771）都写在
// `lineTouchesBoundary(node, nodeById)` 为真的分支之后。`lineTouchesBoundary` 依赖
// `endpointNodeIds(node)`，后者要读 `node?.params?._routableLineSourceNodeId` ——
// 若 `params` 为 nullish，它返回空数组、`.some()` 为假、守卫直接短路返回，
// `localParams` 根本不会被调用。
//
// 反过来说：只要 `localParams` 真的被调用了，`params` 必然是个非空对象，
// `?? {}` 右侧在定义域上恒不可达。L58 `sharedParams` 的 `?? {}` 是同一形状。
// 按纪律不为它写恒绿断言，此处留注释备查。
