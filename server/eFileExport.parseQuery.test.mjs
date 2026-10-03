// parseEFileQuery 的校验分支直测 —— 此前零直呼。
//
// ## 覆盖的是什么
//
// `handleV1ModelEFile` / `handleV1ModelEFilePost` 的第一步都是它。四条错误分支决定了
// 「query 不合法时回什么错」，而它们此前只经 `e2e/apiV1Control` 与 `swigger.examples`
// 间接跑到过**合法**的那一侧。
//
// ## 为什么这条链要单独钉
//
// schemePath 是 v1 全部方案域端点的定位键（encodeURIComponent(JSON.stringify([...]))），
// 它的解析走 `parseSchemePathParam` → `requireSchemePath` 两级：解析失败与「解析成空数组」
// 都归到同一条 bad-request。若哪天把 `requireSchemePath` 的判定放宽成「非 null 即可」，
// `schemePath=`（空串→[]）会被放行并一路读到磁盘，错误从 400 变成 500。
//
// 注意：`.test.mjs` 必须是纯 JS —— 不要写类型标注或非空断言 `!`，
// 那些会触发 RollupError: Parse failure，表现为「Tests: no tests」（看着像通过，实际没跑）。
import { describe, expect, test } from "vitest";
import { parseEFileQuery } from "./eFileExport.mjs";
import { encodeSchemePath } from "./schemePath.mjs";
import { PREDEFINED_E_DEVICE_TEMPLATES } from "./eFileTemplates.mjs";
import { fakeUrl } from "./handlerTestHarness.mjs";

const validSchemePath = encodeSchemePath(["标准案例"]);
const KNOWN_TEMPLATE = Object.keys(PREDEFINED_E_DEVICE_TEMPLATES)[0];

function query(search) {
  return parseEFileQuery(fakeUrl(search));
}

describe("parseEFileQuery —— 错误分支", () => {
  test("schemePath 缺失 / 空串 / 非法 JSON / 非数组，一律 bad-request", () => {
    const cases = [
      ["缺失", `name=m`],
      ["空串", `schemePath=&name=m`],
      ["非法 JSON", `schemePath=${encodeURIComponent("{")}&name=m`],
      ["JSON 字符串", `schemePath=${encodeURIComponent('"abc"')}&name=m`]
    ];
    for (const [label, search] of cases) {
      const parsed = query(search);
      expect(parsed.error?.code, label).toBe("bad-request");
      expect(parsed.error?.message, label).toContain("schemePath");
      // 错误分支不得同时带出半成品入参
      expect(parsed.parts, label).toBeUndefined();
      expect(parsed.name, label).toBeUndefined();
    }
  });

  test("name 缺失 / 空串 / 纯空白一律 bad-request（schemePath 合法时不越级）", () => {
    for (const [label, search] of [
      ["缺失", `schemePath=${validSchemePath}`],
      ["空串", `schemePath=${validSchemePath}&name=`],
      ["纯空白", `schemePath=${validSchemePath}&name=%20%20`]
    ]) {
      const parsed = query(search);
      expect(parsed.error?.code, label).toBe("bad-request");
      expect(parsed.error?.message, label).toContain("模型名称");
    }
  });

  test("schemePath 与 name 同时非法时，先报 schemePath（校验顺序即契约）", () => {
    const parsed = query("");
    expect(parsed.error?.message).toContain("schemePath");
  });

  test("encoding 非 gbk / utf-8 一律 bad-request", () => {
    for (const encoding of ["latin1", "utf8", "UTF8", "gb2312", "g b k"]) {
      const parsed = query(`schemePath=${validSchemePath}&name=m&encoding=${encodeURIComponent(encoding)}`);
      expect(parsed.error?.code, encoding).toBe("bad-request");
      expect(parsed.error?.message, encoding).toContain("encoding");
    }
  });

  test("template 未知时报错并列出全部可用模板名", () => {
    const parsed = query(`schemePath=${validSchemePath}&name=m&template=${encodeURIComponent("不存在的模板")}`);
    expect(parsed.error?.code).toBe("bad-request");
    expect(parsed.error?.message).toContain("未知模板");
    for (const known of Object.keys(PREDEFINED_E_DEVICE_TEMPLATES)) {
      expect(parsed.error?.message, known).toContain(known);
    }
  });

  test("已知 template 不错报（与上一条构成对照）", () => {
    const parsed = query(`schemePath=${validSchemePath}&name=m&template=${encodeURIComponent(KNOWN_TEMPLATE)}`);
    expect(parsed.error).toBeUndefined();
  });
});

describe("parseEFileQuery —— 取值口径", () => {
  test("encoding 缺省为 gbk；大小写与首尾空白归一", () => {
    const base = `schemePath=${validSchemePath}&name=m`;
    expect(query(base).encoding).toBe("gbk");
    expect(query(`${base}&encoding=`).encoding).toBe("gbk");
    expect(query(`${base}&encoding=%20%20`).encoding).toBe("gbk");
    expect(query(`${base}&encoding=${encodeURIComponent(" GBK ")}`).encoding).toBe("gbk");
    expect(query(`${base}&encoding=${encodeURIComponent("UTF-8")}`).encoding).toBe("utf-8");
  });

  test("name 去首尾空白后原样透传", () => {
    const parsed = query(`schemePath=${validSchemePath}&name=${encodeURIComponent("  厂站模型  ")}`);
    expect(parsed.name).toBe("厂站模型");
  });

  test("template 缺省 / 空串 / 纯空白都归为「无模板」（空串而非 null）", () => {
    const base = `schemePath=${validSchemePath}&name=m`;
    for (const search of [base, `${base}&template=`, `${base}&template=%20`]) {
      const parsed = query(search);
      expect(parsed.error, search).toBeUndefined();
      expect(parsed.templateName, search).toBe("");
    }
  });

  test("schemePath 解码为路径段数组；'.' / '..' 段被兜底成「方案」而非放行", () => {
    const parsed = query(`schemePath=${encodeSchemePath(["标准案例", "..", "子方案"])}&name=m`);
    expect(parsed.error).toBeUndefined();
    expect(parsed.parts).toEqual(["标准案例", "方案", "子方案"]);
  });

  test("schemePath 单层（无子方案）也放行", () => {
    const parsed = query(`schemePath=${encodeSchemePath(["标准案例"])}&name=m`);
    expect(parsed.error).toBeUndefined();
    expect(parsed.parts).toEqual(["标准案例"]);
  });
});