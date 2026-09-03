import { describe, expect, test } from "vitest";
import { multiModelRecordWithParent } from "./model-eexport";

describe("multiModelRecordWithParent 列注入（全网导出对齐模板列）", () => {
  test("接口无 parent 字段（如国网E格式模板）时不注入 parent 列，仅保留内部归属值", () => {
    const record = multiModelRecordWithParent(
      {
        id: "n1",
        section: "node",
        kind: "node",
        columns: ["idx", "name", "realbs"],
        params: { idx: "1", name: "母线" }
      } as any,
      5
    );
    expect(record.columns).toEqual(["idx", "name", "realbs"]);
    expect(record.params.parent).toBe("5");
  });

  test("接口含 parent 字段（原始定义类表）时保留并更新 parent 列", () => {
    const record = multiModelRecordWithParent(
      {
        id: "n1",
        section: "ACNode",
        kind: "ACNode",
        columns: ["idx", "name", "parent", "vbase"],
        params: { idx: "1", name: "母线" }
      } as any,
      7
    );
    expect(record.columns).toEqual(["idx", "name", "parent", "vbase"]);
    expect(record.params.parent).toBe("7");
  });
});
