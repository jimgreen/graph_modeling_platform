import { describe, expect, test } from "vitest";
import { apiPath } from "../config.mjs";
import { v1LibraryRoutes } from "../apiV1Library.mjs";

describe("unified library API route", () => {
  test("registers one GET route and removes legacy part paths", () => {
    expect(v1LibraryRoutes).toHaveLength(1);
    expect(v1LibraryRoutes[0].pattern.test(apiPath("/v1/library"))).toBe(true);
    for (const legacyPath of [
      "/v1/library/categories",
      "/v1/library/devices",
      "/v1/library/measurements",
      "/v1/library/device-definitions",
      "/v1/library/templates"
    ]) {
      expect(v1LibraryRoutes[0].pattern.test(apiPath(legacyPath))).toBe(false);
    }
  });
});
