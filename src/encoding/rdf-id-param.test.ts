import { describe, it, expect } from "vitest";
import { DEVICE_LIBRARY } from "../model";

describe("内置元件 rdf_id 参数", () => {
  it("所有内置元件均有 rdf_id 参数（字符串、默认空）", () => {
    const missing: string[] = [];
    for (const t of DEVICE_LIBRARY) {
      const defs = t.parameterDefinitions ?? [];
      const rdf = defs.find((d) => d.enName === "rdf_id");
      if (!rdf) {
        missing.push(t.kind);
        continue;
      }
      expect(rdf.valueType).toBe("string");
      expect(rdf.typicalValue).toBe("");
      expect(rdf.cnName).toBe("原始ID");
    }
    expect(missing).toEqual([]);
    // 抽样验证
    for (const kind of ["ac-source", "ac-transformer", "ac-breaker", "ac-line", "ac-bus", "static-text", "dc-source", "ac-storage"]) {
      const t = DEVICE_LIBRARY.find((x) => x.kind === kind);
      expect(t, kind).toBeTruthy();
      expect(t!.parameterDefinitions?.find((d) => d.enName === "rdf_id"), `${kind} 含 rdf_id`).toBeTruthy();
    }
  });

  it("rdf_id 在所有元件中位于参数首位且唯一", () => {
    for (const t of DEVICE_LIBRARY) {
      const defs = t.parameterDefinitions ?? [];
      const rdfIds = defs.filter((d) => d.enName === "rdf_id");
      expect(rdfIds.length, `${t.kind} 唯一 rdf_id`).toBe(1);
      expect(defs[0].enName, `${t.kind} rdf_id 在首位`).toBe("rdf_id");
    }
  });
});
