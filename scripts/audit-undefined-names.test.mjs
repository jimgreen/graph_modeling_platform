import { describe, expect, test } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { findUndefinedNames } from "./audit-undefined-names.mjs";

const SOURCE = `// @ts-nocheck
export function factory(__appScope: Record<string, any>) {
  const { declaredA } = __appScope;
  return () => declaredA + missingName;
}
`;

describe("audit-undefined-names", () => {
  test("报出 @ts-nocheck 文件里的未定义名", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "audit-names-"));
    try {
      const file = path.join(dir, "sample.ts");
      await writeFile(file, SOURCE, "utf-8");
      const hits = findUndefinedNames([file]);
      expect(hits.map((h) => h.name)).toEqual(["missingName"]);
      expect(hits[0].file).toBe(file);
      expect(hits[0].line).toBe(4);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("合法绑定不误报（解构名、import、局部声明、全局、类型位置）", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "audit-names-"));
    try {
      const file = path.join(dir, "clean.ts");
      await writeFile(file, `// @ts-nocheck
import { imported } from "./nowhere.ts";
type T = { k: number };
export function factory(__appScope: Record<string, any>) {
  const { declaredA } = __appScope;
  const localB = 1;
  function inner(c: number) { return c; }
  const obj: T = { k: inner(localB) + declaredA };
  return [imported, obj, window.document.title];
}
`, "utf-8");
      expect(findUndefinedNames([file])).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
