import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";

import { modelTrace } from "./modelTrace";

describe("modelTrace", () => {
  test("production gate is present and explicit false disables output", () => {
    const source = readFileSync(new URL("./modelTrace.ts", import.meta.url), "utf8");
    expect(source).toContain("if (!import.meta.env.DEV) return false;");

    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const previous = (globalThis as any).__MODEL_TRACE__;
    (globalThis as any).__MODEL_TRACE__ = false;
    try {
      modelTrace("suppressed", { projectId: "project:secret" });
      expect(info).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete (globalThis as any).__MODEL_TRACE__;
      else (globalThis as any).__MODEL_TRACE__ = previous;
      info.mockRestore();
    }
  });

  test("explicit true enables diagnostic output in development", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const previous = (globalThis as any).__MODEL_TRACE__;
    (globalThis as any).__MODEL_TRACE__ = true;
    try {
      modelTrace("enabled", { projectId: "project:test" });
      expect(info).toHaveBeenCalledWith("[MODEL-TRACE]", "enabled", { projectId: "project:test" });
    } finally {
      if (previous === undefined) delete (globalThis as any).__MODEL_TRACE__;
      else (globalThis as any).__MODEL_TRACE__ = previous;
      info.mockRestore();
    }
  });
});
