import type { MeasurementRuntimeValue, PlatformMeasurementConfig } from "./measurements";

export type MeasurementStatusResponse = {
  ok: boolean;
  provider: string;
  mode: string;
  lastUpdateTime: number;
  latencyMs: number;
  message: string;
};

export type MeasurementCatalogPoint = {
  sourcePoint: string;
  name: string;
  deviceName?: string;
  key?: string;
  label?: string;
  unit?: string;
  valueType?: "number" | "string" | "boolean";
};

export type MeasurementCatalogResponse = {
  version: "1.0";
  points: MeasurementCatalogPoint[];
};

export type MeasurementSnapshotResponse = {
  version: "1.0";
  schemePath?: string;
  modelName?: string;
  timestamp: number;
  sequence: number;
  values: MeasurementRuntimeValue[];
};

export type MeasurementPatchResponse = {
  version: "1.0";
  timestamp: number;
  sequence: number;
  values: MeasurementRuntimeValue[];
};

const jsonRequest = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Measurement request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const fetchMeasurementConfig = () => jsonRequest<PlatformMeasurementConfig>("/api/measurements/config");
export const fetchMeasurementStatus = () => jsonRequest<MeasurementStatusResponse>("/api/measurements/status");
export const fetchMeasurementCatalog = () => jsonRequest<MeasurementCatalogResponse>("/api/measurements/catalog");

export function fetchMeasurementSnapshot(schemePath: string, modelName: string) {
  const params = new URLSearchParams({ schemePath, modelName });
  return jsonRequest<MeasurementSnapshotResponse>(`/api/measurements/snapshot?${params.toString()}`);
}

export function openMeasurementStream({
  schemePath,
  modelName,
  onPatch,
  onStatus
}: {
  schemePath: string;
  modelName: string;
  onPatch: (patch: MeasurementPatchResponse) => void;
  onStatus?: (status: MeasurementStatusResponse) => void;
}) {
  const params = new URLSearchParams({ schemePath, modelName });
  const source = new EventSource(`/api/measurements/stream?${params.toString()}`);
  source.addEventListener("measurement.patch", (event) => {
    onPatch(JSON.parse((event as MessageEvent).data));
  });
  source.addEventListener("measurement.status", (event) => {
    onStatus?.(JSON.parse((event as MessageEvent).data));
  });
  return () => source.close();
}
