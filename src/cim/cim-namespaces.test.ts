import { describe, expect, it } from "vitest";
import { CIM_NS } from "./cim-namespaces";

describe("CIM_NS", () => {
  it("CIM16 RDFS 命名空间", () => {
    expect(CIM_NS.cim).toBe("http://iec.ch/TC57/2013/CIM-schema-cim16#");
    expect(CIM_NS.md).toBe("http://iec.ch/TC57/61970-552/ModelDescription/1#");
    expect(CIM_NS.rdf).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
  });
});
