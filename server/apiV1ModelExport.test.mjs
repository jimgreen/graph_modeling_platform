import { describe, expect, test } from "vitest";
import { apiPath } from "./config.mjs";
import { fakeRequest, fakeResponse, fakeUrl } from "./handlerTestHarness.mjs";
import { handleV1ModelExport, v1ModelExportRoutes } from "./apiV1ModelExport.mjs";

describe("unified saved-model export API", () => {
  test("rejects an unknown format without invoking an exporter", async () => {
    const response = fakeResponse();
    await handleV1ModelExport({
      request: fakeRequest(),
      response,
      url: fakeUrl("format=unknown&schemeId=1&name=x"),
      paths: {}
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("bad-request");
  });

  test("rejects parameters that belong to another format", async () => {
    const response = fakeResponse();
    await handleV1ModelExport({
      request: { method: "GET" },
      response,
      url: fakeUrl("format=svg&schemeId=1&name=x&template=%E9%85%8D%E7%BD%91%E5%AE%9E%E6%97%B6%E5%BA%93"),
      paths: {}
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toContain("template");
  });

  test("registers one GET and one POST unified route", () => {
    expect(v1ModelExportRoutes.map((route) => route.method)).toEqual(["GET", "POST"]);
    expect(v1ModelExportRoutes.every((route) => route.pattern.test(`${apiPath("/v1/schemes/model/export")}`))).toBe(true);
    for (const legacyPath of [
      "/v1/schemes/model/json",
      "/v1/schemes/model/svg",
      "/v1/schemes/model/e-file",
      "/v1/schemes/model/cim-xml"
    ]) {
      expect(v1ModelExportRoutes.some((route) => route.pattern.test(apiPath(legacyPath)))).toBe(false);
    }
  });
});
