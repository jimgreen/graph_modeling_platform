import { describe, expect, test, vi } from "vitest";
import { createModelUpdateService } from "./modelUpdateService.mjs";

function createHarness({ buildPayload = async ({ record, schemePath, files }) => ({
  model_id: String(record.project.idx),
  scheme_path: JSON.stringify(schemePath),
  files
}), targetExists = async () => true } = {}) {
  const sent = [];
  const service = createModelUpdateService({
    buildPayload,
    sendMessage: (connectionId, message) => sent.push({ connectionId, message }),
    targetExists,
    randomId: (() => {
      let nextId = 0;
      return () => `subscription-${++nextId}`;
    })()
  });
  return { service, sent, connect: (connectionId, spaceId) => service.addConnection(connectionId, spaceId) };
}

function changedModel(spaceId, schemePath, idx) {
  return {
    spaceId,
    schemePath,
    record: { name: `模型${idx}`, updatedAt: "2026-11-21T10:00:00.000Z", project: { idx } }
  };
}

describe("model update subscription service", () => {
  test("matches space, scheme subtree and modelId within one space", async () => {
    const { service, sent, connect } = createHarness();
    connect("space-client", "space-a");
    connect("scheme-client", "space-a");
    connect("model-client", "space-a");
    await service.subscribe("space-client", "space-a", { type: "space" }, [{ kind: "json" }]);
    await service.subscribe("scheme-client", "space-a", { type: "scheme", schemePath: ["根方案"] }, [{ kind: "xml" }]);
    await service.subscribe("model-client", "space-a", { type: "model", modelId: 12 }, [{ kind: "e", encoding: "gbk" }]);

    await service.publishModelChanged(changedModel("space-a", ["根方案", "子方案"], 12));
    await service.publishModelChanged(changedModel("space-a", ["根方案", "子方案"], 13));
    await service.publishModelChanged(changedModel("space-a", ["其他方案"], 12));
    await service.publishModelChanged(changedModel("space-b", ["根方案", "子方案"], 12));

    expect(sent.map(({ connectionId }) => connectionId).sort()).toEqual([
      "model-client", "model-client", "scheme-client", "scheme-client", "space-client", "space-client", "space-client"
    ]);
    expect(sent.every(({ message }) => message.type === "model.updated")).toBe(true);
    expect(sent.find(({ connectionId }) => connectionId === "model-client").message.data.files)
      .toEqual([{ kind: "e", encoding: "gbk" }]);
  });

  test("unsubscribes only the owning subscription and removes all subscriptions on disconnect", async () => {
    const { service, sent, connect } = createHarness();
    connect("client-a", "space-a");
    connect("client-b", "space-a");
    const first = await service.subscribe("client-a", "space-a", { type: "space" }, [{ kind: "json" }]);
    await service.subscribe("client-a", "space-a", { type: "model", modelId: 12 }, [{ kind: "e" }]);
    await service.subscribe("client-b", "space-a", { type: "space" }, [{ kind: "xml" }]);

    expect(service.unsubscribe("client-b", first)).toBe(false);
    expect(service.unsubscribe("client-a", first)).toBe(true);
    await service.publishModelChanged(changedModel("space-a", ["方案"], 12));
    expect(sent.map(({ connectionId }) => connectionId).sort()).toEqual(["client-a", "client-b"]);

    service.removeConnection("client-a");
    sent.length = 0;
    await service.publishModelChanged(changedModel("space-a", ["方案"], 12));
    expect(sent.map(({ connectionId }) => connectionId)).toEqual(["client-b"]);

    service.removeModel("space-a", 12);
    sent.length = 0;
    await service.publishModelChanged(changedModel("space-a", ["方案"], 12));
    expect(sent.map(({ connectionId }) => connectionId)).toEqual(["client-b"]);
    service.removeSpace("space-a");
    sent.length = 0;
    await service.publishModelChanged(changedModel("space-a", ["方案"], 12));
    expect(sent).toHaveLength(0);
  });

  test("isolates export failures to the affected subscription", async () => {
    const buildPayload = vi.fn(async ({ files }) => {
      if (files.some((file) => file.kind === "e")) {
        throw Object.assign(new Error("E 文件模板不可用"), { code: "export-failed" });
      }
      return { files };
    });
    const { service, sent, connect } = createHarness({ buildPayload });
    connect("failed-client", "space-a");
    connect("healthy-client", "space-a");
    await service.subscribe("failed-client", "space-a", { type: "space" }, [{ kind: "e" }]);
    await service.subscribe("healthy-client", "space-a", { type: "space" }, [{ kind: "json" }]);

    await service.publishModelChanged(changedModel("space-a", ["方案"], 12));

    expect(sent).toHaveLength(2);
    expect(sent.find(({ connectionId }) => connectionId === "failed-client").message).toMatchObject({
      type: "error",
      error: { code: "export-failed", message: "E 文件模板不可用", subscriptionId: expect.any(String) }
    });
    expect(sent.find(({ connectionId }) => connectionId === "healthy-client").message).toEqual({
      type: "model.updated",
      data: { files: [{ kind: "json", encoding: "utf-8" }] }
    });
  });

  test("does not send an in-flight update after unsubscribe or model removal", async () => {
    const pendingBuilds = [];
    const buildPayload = vi.fn(() => new Promise((resolve) => pendingBuilds.push(resolve)));
    const { service, sent, connect } = createHarness({ buildPayload });
    connect("client-a", "space-a");
    connect("client-b", "space-a");
    const cancelledId = await service.subscribe("client-a", "space-a", { type: "space" }, [{ kind: "json" }]);
    const publishCancelled = service.publishModelChanged(changedModel("space-a", ["方案"], 12));
    expect(buildPayload).toHaveBeenCalledOnce();
    expect(service.unsubscribe("client-a", cancelledId)).toBe(true);
    pendingBuilds.shift()({ files: [{ kind: "json" }] });
    await publishCancelled;

    await service.subscribe("client-b", "space-a", { type: "model", modelId: 12 }, [{ kind: "json" }]);
    const publishDeleted = service.publishModelChanged(changedModel("space-a", ["方案"], 12));
    expect(buildPayload).toHaveBeenCalledTimes(2);
    service.removeModel("space-a", 12);
    pendingBuilds.shift()({ files: [{ kind: "json" }] });
    await publishDeleted;

    expect(sent).toHaveLength(0);
  });

  test("rejects unavailable targets and invalid subscription formats", async () => {
    const { service, connect } = createHarness({
      targetExists: async ({ scope }) => scope.type !== "model" || scope.modelId !== "999"
    });
    connect("client", "space-a");
    await expect(service.subscribe("client", "space-a", { type: "model", modelId: 999 }, [{ kind: "json" }]))
      .rejects.toMatchObject({ code: "not-found" });
    await expect(service.subscribe("client", "space-a", { type: "space" }, [{ kind: "svg" }]))
      .rejects.toMatchObject({ code: "bad-request" });
  });
});
