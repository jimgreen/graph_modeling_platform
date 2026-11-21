import { describe, expect, test } from "vitest";
import { fakeRequest, fakeResponse, fakeUrl, fakeCtx } from "./handlerTestHarness.mjs";
import { apiPath } from "./config.mjs";
import { handleV1Topology, v1TopologyUnifiedRoutes } from "./apiV1Topology.mjs";

describe("unified topology API", () => {
  test("rejects an unknown action", async () => {
    const response = fakeResponse();
    await handleV1Topology({ request: fakeRequest({ body: { action: "unknown", target: "current" } }), response, url: fakeUrl() }, fakeCtx());
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("bad-request");
  });

  test("registers one POST topology route", () => {
    expect(v1TopologyUnifiedRoutes.map((route) => route.method)).toEqual(["POST"]);
    for (const legacyPath of ["/v1/topology/check", "/v1/topology/repair"]) {
      expect(v1TopologyUnifiedRoutes.some((route) => route.pattern.test(apiPath(legacyPath)))).toBe(false);
    }
  });
});
