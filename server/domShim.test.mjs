// Node 侧浏览器 API 桩（domShim）。
//
// 两个职责，任一写错都不抛错：
//   ① 模块顶层把 NODE_ENV 兜底成 production —— 不兜底则 React 加载 development
//      构建，服务端 SVG 渲染实测慢约 45%；
//   ② installDomShim 提供 localStorage —— src/model.ts 的 readVoltageLevelSettings
//      直接读它，没有就是 TypeError。
// 另有两条不能碰的语义：幂等（已有 localStorage 时必须让路，别覆盖调用方的桩）、
// 键一律 String 化（调用方可能传数字键）。
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { installDomShim } from "./domShim.mjs";

const withFreshShim = (run) => {
  const had = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  delete globalThis.localStorage;
  try {
    installDomShim();
    // 桩的底层 Map 是模块级的（与浏览器同语义：同一来源页面的存储跨调用持久），
    // 重新 install 不会清空它，所以每条用例自己清一次。
    globalThis.localStorage.clear();
    return run(globalThis.localStorage);
  } finally {
    delete globalThis.localStorage;
    if (had) {
      Object.defineProperty(globalThis, "localStorage", had);
    }
  }
};

afterEach(() => {
  delete globalThis.localStorage;
});

describe("installDomShim：localStorage 桩", () => {
  test("未命中返回 null（不是 undefined）", () => {
    withFreshShim((storage) => {
      expect(storage.getItem("missing")).toBeNull();
    });
  });

  test("写入后读回，值一律 String 化", () => {
    withFreshShim((storage) => {
      storage.setItem("k", 42);
      expect(storage.getItem("k")).toBe("42");
    });
  });

  test("★ 键一律 String 化：数字键与字符串键等价", () => {
    withFreshShim((storage) => {
      storage.setItem(7, "v");
      expect(storage.getItem("7")).toBe("v");
      expect(storage.getItem(7)).toBe("v");
    });
  });

  test("length 随写入与删除变化", () => {
    withFreshShim((storage) => {
      expect(storage.length).toBe(0);
      storage.setItem("a", "1");
      storage.setItem("b", "2");
      expect(storage.length).toBe(2);
      storage.removeItem("a");
      expect(storage.length).toBe(1);
    });
  });

  test("key(index) 按插入顺序取键，越界返回 null", () => {
    withFreshShim((storage) => {
      storage.setItem("first", "1");
      storage.setItem("second", "2");
      expect(storage.key(0)).toBe("first");
      expect(storage.key(1)).toBe("second");
      expect(storage.key(2)).toBeNull();
      expect(storage.key(-1)).toBeNull();
    });
  });

  test("clear 清空全部键", () => {
    withFreshShim((storage) => {
      storage.setItem("a", "1");
      storage.clear();
      expect(storage.length).toBe(0);
      expect(storage.getItem("a")).toBeNull();
    });
  });

  test("★ 幂等：已有 localStorage 时必须让路，不覆盖调用方的桩", () => {
    const sentinel = { getItem: () => "from-caller" };
    globalThis.localStorage = sentinel;
    installDomShim();
    expect(globalThis.localStorage).toBe(sentinel);
    expect(globalThis.localStorage.getItem("anything")).toBe("from-caller");
  });
});

describe("NODE_ENV 兜底", () => {
  test("vitest 下已是 test，模块顶层的 ??= 不覆盖", () => {
    expect(process.env.NODE_ENV).toBe("test");
  });

  test("spawn 一个干净 Node 子进程验证「未设 → production」", async () => {
    const { spawnSync } = await import("node:child_process");
    const { fileURLToPath } = await import("node:url");
    const script = "await import(process.argv[1]); console.log(process.env.NODE_ENV);";
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script, fileURLToPath(new URL("./domShim.mjs", import.meta.url))], {
      encoding: "utf-8",
      env: { ...process.env, NODE_ENV: "" }
    });
    // NODE_ENV="" 是「设了空串」，??= 不兜底 —— 这正是要确认的边界：
    // 空串会让 React 走 development 分支，比不设更糟
    expect(result.stdout.trim()).toBe("");
  });
});