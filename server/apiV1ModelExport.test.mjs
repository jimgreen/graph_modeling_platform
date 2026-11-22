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

  test("marks the legacy GET route deprecated and points to the batch successor", async () => {
    const response = fakeResponse();
    response.setHeader = (name, value) => {
      response.headers = { ...(response.headers ?? {}), [name.toLowerCase()]: value };
    };
    const writeHead = response.writeHead.bind(response);
    response.writeHead = (status, headers) => {
      const prior = response.headers ?? {};
      writeHead(status, { ...prior, ...(headers ?? {}) });
    };
    await handleV1ModelExport({
      request: { method: "GET" },
      response,
      url: fakeUrl("format=unknown"),
      paths: {}
    });

    expect(response.headers.deprecation).toBe("true");
    expect(response.headers.link).toContain("/webgrp/v1/models/export");
  });

  test("keeps GET for raw single-model responses and POST for custom E templates", () => {
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
