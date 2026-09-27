// 合成夹具：验证 audit-undefined-names 的崩溃类诊断（TS2339 属性不存在）确实能被报出，
// 且 --crash-only 能把「属性不存在」与「未定义名」分开。两者都在 @ts-nocheck 之下，
// tsc 本身看不见 —— 这正是本脚本存在的意义。
import { expect, test } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { findUndefinedNames } from "./audit-undefined-names.mjs";

// 每条用例都要 ts.createProgram 起一次完整语义检查（编译器冷启动 + lib.d.ts 加载），
// 单条空载 ~1s；超时预算统一由 vite.config.ts 的 testTimeout 兜住。

test("报出 @ts-nocheck 文件里的属性不存在（TS2339）", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "audit-crash-"));
  try {
    const file = path.join(dir, "crash.ts");
    await writeFile(
      file,
      `// @ts-nocheck
type Thing = { known: number };
export function use(t: Thing) {
  // 属性不存在：运行时 t.missingFn() 抛 TypeError: t.missingFn is not a function
  t.missingFn();
}
`,
      "utf-8"
    );

    // 只在 --crash-only 模式报出：两种模式互斥，默认模式的输出/退出码不得因此漂移。
    const crash = findUndefinedNames([file], { crashOnly: true });
    expect(crash.map((h) => h.name)).toContain("missingFn");
    // 崩溃类命中都落在值位置（不存在「类型位置」的属性不存在）
    expect(crash.every((h) => h.kind === "value")).toBe(true);
    // 默认模式不受影响
    expect(findUndefinedNames([file])).toEqual([]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("--crash-only 只报崩溃类，不报未定义名", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "audit-crash-only-"));
  try {
    const both = path.join(dir, "both.ts");
    await writeFile(
      both,
      `// @ts-nocheck
export function f(x: { a: number }) {
  missingGlobalName(x);
  return x.notAProperty;
}
`,
      "utf-8"
    );
    const namesOnly = findUndefinedNames([both]).map((h) => h.name);
    expect(namesOnly).toContain("missingGlobalName");
    expect(namesOnly).not.toContain("notAProperty");

    const crashOnly = findUndefinedNames([both], { crashOnly: true }).map((h) => h.name);
    expect(crashOnly).toContain("notAProperty");
    expect(crashOnly).not.toContain("missingGlobalName");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("合法代码不误报崩溃类", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "audit-crash-clean-"));
  try {
    const file = path.join(dir, "clean.ts");
    await writeFile(
      file,
      `// @ts-nocheck
type Thing = { known: number; other: { deep: string } };
export function use(t: Thing) {
  return t.known + t.other.deep.length;
}
`,
      "utf-8"
    );
    expect(findUndefinedNames([file], { crashOnly: true })).toEqual([]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/**
 * 回归守卫：`--files a.ts` 过去会把 a.ts 的**传递依赖**里的问题一起报出来
 * （getSemanticDiagnostics 覆盖整个 program），实测点名 1 个文件能带出 18 个文件的命中，
 * 于是「只审这一个文件」形同虚设、退出码也被别人拖累。
 */
test("只审计被点名的文件，不牵连其传递依赖", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "audit-scope-"));
  try {
    const dep = path.join(dir, "dep.ts");
    const main = path.join(dir, "main.ts");
    await writeFile(
      dep,
      `// @ts-nocheck
type Dep = { known: number };
export function dep(d: Dep) { d.missingOnDep(); }
`,
      "utf-8"
    );
    await writeFile(
      main,
      `// @ts-nocheck
import { dep } from "./dep";
export function main(x: number) { dep(x); }
`,
      "utf-8"
    );

    const hits = findUndefinedNames([main], { crashOnly: true });
    expect(hits).toEqual([]);

    // 点名两个文件时，各自作数 —— 证明过滤是按「点名集合」而非「全 program」生效
    const both = findUndefinedNames([main, dep], { crashOnly: true });
    expect(both.map((h) => h.name)).toEqual(["missingOnDep"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
