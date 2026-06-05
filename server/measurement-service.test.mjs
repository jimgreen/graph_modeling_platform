import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  createMeasurementService,
  diffMeasurementValues,
  normalizeMeasurementRuntimePayload
} from "./measurement-service.mjs";

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "measurement-service-"));
  const settingsDir = join(root, "settings");
  const measurementDir = join(root, "measurements");
  await mkdir(settingsDir, { recursive: true });
  await mkdir(measurementDir, { recursive: true });
  await writeFile(
    join(settingsDir, "measurement-config.json"),
    JSON.stringify({
      measurementTypes: [{ id: "activePower", key: "p", name: "有功功率", shortLabel: "P" }],
      deviceProfiles: [{ deviceKind: "ACLoad", items: [{ measurementTypeId: "activePower" }] }]
    }),
    "utf8"
  );
  await writeFile(
    join(measurementDir, "sample-values.json"),
    JSON.stringify({
      timestamp: 1000,
      sequence: 1,
      points: [
        {
          sourcePoint: "sample.p",
          name: "P",
          key: "p",
          label: "P",
          unit: "MW",
          valueType: "number",
          value: 1.234,
          quality: "good"
        }
      ]
    }),
    "utf8"
  );
  return { settingsDir, measurementDir };
}

describe("measurement service", () => {
  test("loads platform config", async () => {
    const fixture = await createFixture();
    const service = createMeasurementService({
      configPath: join(fixture.settingsDir, "measurement-config.json"),
      sampleValuesPath: join(fixture.measurementDir, "sample-values.json")
    });

    const config = await service.getConfig();

    expect(config.measurementTypes[0]).toMatchObject({ id: "activePower", key: "p" });
    expect(config.deviceProfiles[0]).toMatchObject({ deviceKind: "ACLoad" });
  });

  test("returns catalog and snapshot from sample values", async () => {
    const fixture = await createFixture();
    const service = createMeasurementService({
      configPath: join(fixture.settingsDir, "measurement-config.json"),
      sampleValuesPath: join(fixture.measurementDir, "sample-values.json")
    });

    const catalog = await service.getCatalog();
    const snapshot = await service.getSnapshot({ schemePath: "默认方案", modelName: "模型" });

    expect(catalog.points[0]).toMatchObject({ sourcePoint: "sample.p", unit: "MW" });
    expect(snapshot.values[0]).toMatchObject({ sourcePoint: "sample.p", value: 1.234, quality: "good" });
  });

  test("normalizes invalid runtime payload into missing-safe values", () => {
    const payload = normalizeMeasurementRuntimePayload({
      timestamp: 1000,
      sequence: 1,
      points: [{ sourcePoint: "x", value: undefined, quality: "unknown" }]
    });

    expect(payload.points[0]).toMatchObject({ sourcePoint: "x", value: null, quality: "missing" });
  });

  test("diffs changed values by source point", () => {
    const previous = [{ sourcePoint: "a", value: 1, quality: "good", timestamp: 1000 }];
    const next = [
      { sourcePoint: "a", value: 1, quality: "good", timestamp: 1000 },
      { sourcePoint: "b", value: 2, quality: "good", timestamp: 1001 }
    ];

    expect(diffMeasurementValues(previous, next)).toEqual([next[1]]);
  });
});
