import { describe, expect, test } from "vitest";
import { apiPath } from "../config.mjs";
import { fakeRequest, fakeResponse, fakeUrl } from "../handlerTestHarness.mjs";
import { handleV1RuntimeExport, v1RuntimeExportRoutes } from "../apiV1RuntimeExport.mjs";

describe("unified runtime export API", () => {
  test("rejects an unknown format", async () => {
    const response = fakeResponse();
    await handleV1RuntimeExport({ request: fakeRequest(), response, url: fakeUrl("format=bad") }, {
      fetchFromClient: () => Promise.resolve({})
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("bad-request");
  });

  test("rejects POST SVG because POST is reserved for custom E templates", async () => {
    const response = fakeResponse();
    await handleV1RuntimeExport({
      request: { method: "POST" },
      response,
      url: fakeUrl("format=svg"),
      paths: {}
    }, { fetchFromClient: () => Promise.resolve({}) });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("bad-request");
  });

  test("registers GET and POST export routes", () => {
    expect(v1RuntimeExportRoutes.map((route) => route.method)).toEqual(["GET", "POST"]);
    for (const legacyPath of ["/v1/runtime/svg", "/v1/runtime/e-file"]) {
      expect(v1RuntimeExportRoutes.some((route) => route.pattern.test(apiPath(legacyPath)))).toBe(false);
    }
  });
});
