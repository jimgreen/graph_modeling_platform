import type { MeasurementRuntimeValue } from "./measurements";
import type { MeasurementPatchResponse, MeasurementSnapshotResponse } from "./measurementClient";

export type MeasurementRuntimeStore = ReturnType<typeof createMeasurementRuntimeStore>;

export function createMeasurementRuntimeStore({ batchMs = 16 }: { batchMs?: number } = {}) {
  const values = new Map<string, MeasurementRuntimeValue>();
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const notify = () => {
    timer = undefined;
    listeners.forEach((listener) => listener());
  };

  const scheduleNotify = () => {
    if (timer !== undefined) {
      return;
    }
    timer = setTimeout(notify, batchMs);
  };

  const applyValues = (nextValues: readonly MeasurementRuntimeValue[]) => {
    for (const value of nextValues) {
      if (value.sourcePoint) {
        values.set(value.sourcePoint, value);
      }
    }
    scheduleNotify();
  };

  return {
    applySnapshot(snapshot: MeasurementSnapshotResponse) {
      values.clear();
      applyValues(snapshot.values);
    },
    applyPatch(patch: MeasurementPatchResponse) {
      applyValues(patch.values);
    },
    getValue(sourcePoint: string) {
      return values.get(sourcePoint);
    },
    getSnapshot() {
      return new Map(values);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
