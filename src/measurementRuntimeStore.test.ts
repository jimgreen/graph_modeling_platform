import { describe, expect, test, vi } from "vitest";
import { createMeasurementRuntimeStore } from "./measurementRuntimeStore";

describe("measurement runtime store", () => {
  test("applies snapshot values by source point", () => {
    const store = createMeasurementRuntimeStore();
    store.applySnapshot({
      version: "1.0",
      timestamp: 1000,
      sequence: 1,
      values: [{ sourcePoint: "p1", value: 1.23, quality: "good", timestamp: 1000, sequence: 1 }]
    });

    expect(store.getValue("p1")).toMatchObject({ value: 1.23, quality: "good" });
  });

  test("applies patch values without dropping unchanged points", () => {
    const store = createMeasurementRuntimeStore();
    store.applySnapshot({
      version: "1.0",
      timestamp: 1000,
      sequence: 1,
      values: [
        { sourcePoint: "p1", value: 1, quality: "good", timestamp: 1000, sequence: 1 },
        { sourcePoint: "p2", value: 2, quality: "good", timestamp: 1000, sequence: 1 }
      ]
    });
    store.applyPatch({
      version: "1.0",
      timestamp: 1001,
      sequence: 2,
      values: [{ sourcePoint: "p1", value: 3, quality: "good", timestamp: 1001, sequence: 2 }]
    });

    expect(store.getValue("p1")?.value).toBe(3);
    expect(store.getValue("p2")?.value).toBe(2);
  });

  test("notifies subscribers once for a batched patch", () => {
    vi.useFakeTimers();
    const store = createMeasurementRuntimeStore({ batchMs: 20 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.applyPatch({ version: "1.0", timestamp: 1001, sequence: 2, values: [{ sourcePoint: "p1", value: 1, quality: "good", timestamp: 1001 }] });
    store.applyPatch({ version: "1.0", timestamp: 1002, sequence: 3, values: [{ sourcePoint: "p2", value: 2, quality: "good", timestamp: 1002 }] });
    vi.advanceTimersByTime(20);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    vi.useRealTimers();
  });

  test("applies 5000 runtime values without graph-shaped work", () => {
    const store = createMeasurementRuntimeStore({ batchMs: 0 });
    const values = Array.from({ length: 5000 }, (_, index) => ({
      sourcePoint: `p-${index}`,
      value: index,
      quality: "good" as const,
      timestamp: 1000,
      sequence: 1
    }));
    const startedAt = performance.now();

    store.applySnapshot({ version: "1.0", timestamp: 1000, sequence: 1, values });
    const elapsed = performance.now() - startedAt;

    expect(store.getValue("p-4999")?.value).toBe(4999);
    expect(elapsed).toBeLessThan(50);
  });
});
