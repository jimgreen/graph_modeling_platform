// shared/randomId.mjs 的单元测试 —— 此前零覆盖。
//
// 它有三条不同的代码路径（platform randomUUID / 手工构造 v4 / 时间兜底），
// 取决于运行环境的 crypto 能力。Node 与浏览器可用能力不同，非 secure context
// 下又会走另一条 —— 这些分支此前没有任何测试碰过，出错时表现为「ID 格式不对」
// 或「ID 碰撞」，都很难在别处被发现。
import { describe, expect, test, afterEach } from "vitest";
import { randomId } from "./randomId.mjs";

const originalCrypto = globalThis.crypto;

// globalThis.crypto 是只读 getter（Node 20+ / 现代浏览器都是），
// 直接赋值会抛 "which has only a getter"，故用 defineProperty 覆盖。
function setCrypto(value) {
  Object.defineProperty(globalThis, "crypto", {
    value,
    configurable: true,
    writable: true
  });
}

afterEach(() => {
  setCrypto(originalCrypto);
});

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("randomId", () => {
  test("默认无前缀时输出合法 UUIDv4", () => {
    expect(randomId()).toMatch(UUID_V4);
  });

  test("带前缀时前缀在前、其后仍是合法 UUIDv4", () => {
    const id = randomId("client-");
    expect(id.startsWith("client-")).toBe(true);
    expect(id.slice("client-".length)).toMatch(UUID_V4);
  });

  test("无 randomUUID 但有 getRandomValues 时手工构造的仍是合法 v4", () => {
    // 非 secure context 走这条（浏览器 http 场景）
    setCrypto({
      getRandomValues: (arr) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = i;
        return arr;
      }
    });
    const id = randomId("t-");
    expect(id.startsWith("t-")).toBe(true);
    // 版本位固定 4、variant 位固定 8/9/a/b
    expect(id).toMatch(/^t-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test("连 getRandomValues 都没有时走时间兜底，仍带前缀且非空", () => {
    setCrypto({});
    const id = randomId("fb-");
    expect(id.startsWith("fb-")).toBe(true);
    expect(id.length).toBeGreaterThan(3);
  });

  test("crypto 为 undefined 时不抛错", () => {
    setCrypto(undefined);
    expect(() => randomId("u-")).not.toThrow();
  });

  test("批量生成无重复（碰撞检测）", () => {
    const ids = new Set();
    for (let i = 0; i < 2000; i += 1) ids.add(randomId());
    expect(ids.size).toBe(2000);
  });
});
