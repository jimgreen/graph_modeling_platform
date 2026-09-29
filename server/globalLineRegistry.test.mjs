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
