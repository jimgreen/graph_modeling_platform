import { describe, expect, test } from "vitest";

import { createDataRootGate } from "./dataRootGate.mjs";

describe("data root gate", () => {
  test("allows shared operations to overlap", async () => {
    const gate = createDataRootGate();
    let entered = 0;
    let release;
    const blocker = new Promise((resolve) => { release = resolve; });
    const first = gate.withShared(async () => {
      entered += 1;
      await blocker;
      return "first";
    });
    const second = gate.withShared(async () => {
      entered += 1;
      return "second";
    });
    await Promise.resolve();
    expect(entered).toBe(2);
    release();
    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"]);
  });

  test("exclusive operation waits for shared work and blocks later shared work", async () => {
    const gate = createDataRootGate();
    let release;
    const blocker = new Promise((resolve) => { release = resolve; });
    let exclusiveEntered = false;
    let lateSharedEntered = false;
    const first = gate.withShared(async () => blocker);
    const exclusive = gate.withExclusive(async () => {
      exclusiveEntered = true;
      return "exclusive";
    });
    const lateShared = gate.withShared(async () => {
      lateSharedEntered = true;
      return "late";
    });

    await Promise.resolve();
    expect(exclusiveEntered).toBe(false);
    expect(lateSharedEntered).toBe(false);
    release();
    await expect(Promise.all([first, exclusive, lateShared])).resolves.toEqual([
      undefined,
      "exclusive",
      "late"
    ]);
    expect(exclusiveEntered).toBe(true);
    expect(lateSharedEntered).toBe(true);
  });
});
