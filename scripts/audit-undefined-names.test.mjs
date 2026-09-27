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
  // 两条用例都要 ts.createProgram 起一次完整语义检查（编译器冷启动 + lib.d.ts 加载），
  // 单条空载 ~0.5s；全量并发时 CPU 被抢，5s 默认值偶发不够。显式给足预算，
  // 免得把「机器慢」误报成「审计逻辑坏了」。
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
  }, 30_000);

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
  }, 30_000);
});
