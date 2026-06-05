import { readFile, stat } from "node:fs/promises";

const supportedQualities = new Set(["good", "bad", "stale", "missing"]);

async function readJsonFile(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

export function normalizeMeasurementRuntimePayload(payload) {
  const timestamp = Number.isFinite(payload?.timestamp) ? Number(payload.timestamp) : Date.now();
  const sequence = Number.isFinite(payload?.sequence) ? Number(payload.sequence) : timestamp;
  const points = Array.isArray(payload?.points) ? payload.points : [];
  return {
    timestamp,
    sequence,
    points: points
      .filter((point) => typeof point?.sourcePoint === "string" && point.sourcePoint.trim())
      .map((point) => ({
        sourcePoint: point.sourcePoint.trim(),
        name: point.name || point.sourcePoint.trim(),
        deviceName: point.deviceName || "",
        key: point.key || "",
        label: point.label || point.key || point.sourcePoint.trim(),
        unit: point.unit || "",
        valueType: point.valueType || "number",
        value: point.value === undefined ? null : point.value,
        quality: supportedQualities.has(point.quality) ? point.quality : "missing",
        timestamp: Number.isFinite(point.timestamp) ? Number(point.timestamp) : timestamp,
        sequence: Number.isFinite(point.sequence) ? Number(point.sequence) : sequence
      }))
  };
}

export function diffMeasurementValues(previous, next) {
  const previousByKey = new Map(previous.map((item) => [item.sourcePoint, JSON.stringify(item)]));
  return next.filter((item) => previousByKey.get(item.sourcePoint) !== JSON.stringify(item));
}

export function createMeasurementService({ configPath, sampleValuesPath }) {
  let cachedRuntime = null;
  let cachedRuntimeMtime = 0;

  const readRuntime = async () => {
    const fileStat = await stat(sampleValuesPath).catch(() => ({ mtimeMs: 0 }));
    if (cachedRuntime && cachedRuntimeMtime === fileStat.mtimeMs) {
      return cachedRuntime;
    }
    cachedRuntime = normalizeMeasurementRuntimePayload(await readJsonFile(sampleValuesPath, { points: [] }));
    cachedRuntimeMtime = fileStat.mtimeMs;
    return cachedRuntime;
  };

  return {
    async getConfig() {
      const payload = await readJsonFile(configPath, { measurementTypes: [], deviceProfiles: [] });
      return {
        measurementTypes: Array.isArray(payload.measurementTypes) ? payload.measurementTypes : [],
        deviceProfiles: Array.isArray(payload.deviceProfiles) ? payload.deviceProfiles : []
      };
    },
    async getStatus() {
      const runtime = await readRuntime();
      return {
        ok: true,
        provider: "sample-json",
        mode: "snapshot+sse",
        lastUpdateTime: runtime.timestamp,
        latencyMs: Math.max(0, Date.now() - runtime.timestamp),
        message: "量测数据正常"
      };
    },
    async getCatalog() {
      const runtime = await readRuntime();
      return {
        version: "1.0",
        points: runtime.points.map(({ sourcePoint, name, deviceName, key, label, unit, valueType }) => ({
          sourcePoint,
          name,
          deviceName,
          key,
          label,
          unit,
          valueType
        }))
      };
    },
    async getSnapshot(request) {
      const runtime = await readRuntime();
      return {
        version: "1.0",
        schemePath: request.schemePath || "",
        modelName: request.modelName || "",
        timestamp: runtime.timestamp,
        sequence: runtime.sequence,
        values: runtime.points.map(({ sourcePoint, value, unit, quality, timestamp, sequence }) => ({
          sourcePoint,
          value,
          unit,
          quality,
          timestamp,
          sequence
        }))
      };
    },
    async getPatchSince(previousValues) {
      const snapshot = await this.getSnapshot({});
      return {
        version: "1.0",
        timestamp: snapshot.timestamp,
        sequence: snapshot.sequence,
        values: diffMeasurementValues(previousValues, snapshot.values)
      };
    }
  };
}
