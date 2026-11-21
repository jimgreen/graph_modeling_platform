import { describe, expect, test } from "vitest";
import { parseBatchModelExportQuery } from "./batchModelSelection.mjs";

const url = (search) => new URL(`http://127.0.0.1/webgrp/v1/models/export${search ? `?${search}` : ""}`);

describe("parseBatchModelExportQuery", () => {
  test("defaults to space and all formats", () => {
    expect(parseBatchModelExportQuery(url(""))).toEqual({
      scope: "space",
      includeDescendants: true,
      formats: ["json", "svg", "cim", "e"],
      encoding: "utf-8",
      templateName: "",
      mergeE: false,
      includeAssociatedModels: false,
      colorMode: "energy",
      strict: false
    });
  });

  test("deduplicates formats and parses booleans", () => {
    const result = parseBatchModelExportQuery(url(
      "scope=scheme&schemeId=3&formats=e,svg,cim,e&includeDescendants=0&mergeE=1&strict=true"
    ));
    expect(result.formats).toEqual(["svg", "cim", "e"]);
    expect(result.includeDescendants).toBe(false);
    expect(result.mergeE).toBe(true);
    expect(result.strict).toBe(true);
  });

  test("rejects selector combinations and format-specific parameters", () => {
    expect(parseBatchModelExportQuery(url("scope=space&schemeId=3")).error.code).toBe("bad-request");
    expect(parseBatchModelExportQuery(url("scope=model&modelId=12&name=x&schemeId=3")).error.code).toBe("bad-request");
    expect(parseBatchModelExportQuery(url("formats=json&template=配网实时库")).error.code).toBe("bad-request");
    expect(parseBatchModelExportQuery(url("formats=svg&mergeE=true")).error.code).toBe("bad-request");
  });
});
