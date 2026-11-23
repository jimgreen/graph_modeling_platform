import { describe, expect, test } from "vitest";
import { apiPath } from "../config.mjs";
import { v1SchemeRoutes } from "../apiV1Schemes.mjs";

describe("unified schemes view API route", () => {
  test("scheme views share GET /v1/schemes and remove legacy paths", () => {
    expect(v1SchemeRoutes.some((route) => route.pattern.test(apiPath("/v1/schemes")))).toBe(true);
    for (const legacyPath of ["/v1/schemes/hierarchy", "/v1/schemes/models"]) {
      expect(v1SchemeRoutes.some((route) => route.pattern.test(apiPath(legacyPath)))).toBe(false);
    }
  });
});
