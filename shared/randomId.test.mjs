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

// Math.random 与 Date.now 都是可写属性，直接赋值即可（不像 crypto 需要 defineProperty）。
// 两个辅助都返回还原闭包，用 try/finally 保证断言失败时也不污染后续用例。
function pinNow(ms) {
  const original = Date.now;
  Date.now = () => ms;
  return () => { Date.now = original; };
}

function pinRandom(fn) {
  const original = Math.random;
  Math.random = fn;
  return () => { Math.random = original; };
}

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
    // 一次性统计断言，**不是**「取随机直到满足条件」的重试写法，故不存在概率性间歇红：
    // 2000 个 UUIDv4 撞号的概率约 C(2000,2)/2^122 ≈ 10^-33。刻意不写成重试循环 ——
    // 重试会让失败信息变成「跑了几次才凑出来」，把实现缺陷藏起来。
    const ids = new Set();
    for (let i = 0; i < 2000; i += 1) ids.add(randomId());
    expect(ids.size).toBe(2000);
  });

  // ─── 随机性隔离(2026-10 审计) ─────────────────────────────────────────────
  // 判定:**注入缝已到位，无需新增**。randomId 的三条路径都在**调用那一刻**读随机源
  // （`c.randomUUID()` / `c.getRandomValues(...)` / 兜底里的 `Math.random()` 都是
  // 函数体内的表达式，不是模块加载时缓存的引用），所以：
  //   · 需要确定性的调用方 —— 把 globalThis.crypto 或 Math.random 打桩即可拿到
  //     逐字可复现的结果；
  //   · 默认行为 —— 不打桩时仍是真随机，没有被缝吃掉。
  // 下面这组用例把该结论钉成可执行断言：绕过随机源的变异会让它们转红。
  //
  // 反过来，若日后有人把兜底改成模块级 `const R = Math.random`，或把随机段写死，
  // 「随机源每次调用恰好被读一次」与「钉住时钟后随机段仍逐次不同」两条会立刻报红。

  test("时间兜底:钉住时钟与随机源后 id 逐字可复现", () => {
    setCrypto({}); // 无 randomUUID、无 getRandomValues → 走 Math.random 兜底
    const restoreNow = pinNow(1_700_000_000_000);
    const restoreRandom = pinRandom(() => 0.123456789);
    try {
      const first = randomId("fb-");
      // 只换随机源、时间不动 ⇒ 只有随机段变化，证明随机段真的来自注入的 Math.random。
      // 刻意避开 0.5 与 0：0.5 是 Math.random 的典型取值（最可能被硬编码进实现的字面量），
      // 0 则让 toString(36).slice(2,10) 切出空串（appDeviceDefinitionFactories.randomSource.test.ts 已记录）。
      Math.random = () => 0.987654321;
      expect(randomId("fb-")).not.toBe(first);
      // 换回原值即逐字复现 —— 这是「需要确定性的调用方能拿到确定性」的直接证据
      Math.random = () => 0.123456789;
      expect(randomId("fb-")).toBe(first);
      // 逐字钉住整串：前缀 + 时间段 + 8 位 36 进制随机段，实现里没有任何写死的片段
      expect(first).toBe("fb-loyw3v28-4fzzzxjy");
    } finally {
      restoreRandom();
      restoreNow();
    }
  });

  test("时间兜底:随机源每次调用恰好被读一次（未被写死、未被模块加载时缓存）", () => {
    setCrypto({});
    const restoreNow = pinNow(1_700_000_000_000);
    let calls = 0;
    const restoreRandom = pinRandom(() => { calls += 1; return 0.123456789; });
    try {
      // 打桩发生在模块已被 import 之后，仍被读到 ⇒ 读取时机是「调用那一刻」。
      // 若实现写成模块级 `const R = Math.random`，这里 calls 恒为 0。
      randomId("fb-");
      expect(calls).toBe(1);
      randomId("fb-");
      expect(calls).toBe(2);
    } finally {
      restoreRandom();
      restoreNow();
    }
  });

  test("时间兜底:钉住时钟后随机段仍逐次不同（默认随机性未被牺牲）", () => {
    setCrypto({});
    // 必须钉住时钟，让随机段成为唯一变量。两次调用落在不同毫秒时即便随机段被写死
    // 整串也会不同 —— 那样的断言对「随机段被写死」完全无感（setup 抹掉了被测对象）。
    const restoreNow = pinNow(1_700_000_000_000);
    try {
      const first = randomId("fb-");
      const second = randomId("fb-");
      // 偶发撞号概率 2^-53，可忽略，不构成概率性间歇红
      expect(first).not.toBe(second);
      expect(first.startsWith("fb-loyw3v28-")).toBe(true);
      expect(second.startsWith("fb-loyw3v28-")).toBe(true);
    } finally {
      restoreNow();
    }
  });

  test("手工 v4:注入的 getRandomValues 字节逐字进入结果（桩未被忽略）", () => {
    setCrypto({
      getRandomValues: (arr) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = i;
        return arr;
      }
    });
    // 上面的「无 randomUUID 但有 getRandomValues」用例只校验版本位/variant 位，
    // 对「字节被换成全 0」这类变异毫无分辨力。这里逐字钉住，两次调用完全相同
    // ⇒ 该路径在注入后确定；实现改成自己 new 一个零数组或忽略注入都会转红。
    expect(randomId("t-")).toBe("t-00010203-0405-4607-8809-0a0b0c0d0e0f");
    expect(randomId("t-")).toBe("t-00010203-0405-4607-8809-0a0b0c0d0e0f");
  });

  test("randomUUID 优先于 getRandomValues，命中后不再退化", () => {
    let uuidCalls = 0;
    let bytesCalls = 0;
    setCrypto({
      randomUUID: () => { uuidCalls += 1; return "11111111-2222-4333-8444-555555555555"; },
      getRandomValues: (arr) => { bytesCalls += 1; arr.fill(0xff); return arr; }
    });
    expect(randomId("x-")).toBe("x-11111111-2222-4333-8444-555555555555");
    expect(uuidCalls).toBe(1);
    // 短路顺序也是契约：randomUUID 可用时不应再退到 getRandomValues
    expect(bytesCalls).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 前缀 / 长度 / 字符集 / 批量无碰撞 / crypto 缺失回退
//
// ⚠ 事实修正：`shared/randomId.mjs` **只导出一个函数** `randomId(prefix = "")`
//   （`shared/randomId.d.mts` 亦只有 `randomId(prefix?: string): string` 一行）。
//   并不存在 `randomSourceId` / `randomSessionId` 这类「各自带固定前缀」的封装 ——
//   前缀一律由调用方传入。所以下面覆盖的是**真实调用点的前缀集合**，而不是
//   三个假想的导出。
//
// REAL_PREFIXES 由 grep 全仓 `randomId("` 得到：
//   server/runtimeWs.mjs:26            req-
//   server/server.mjs:4037 / :4477     img- / folder-
//   src/stateIconDrawing.tsx:143/147/151  param- / def- / state-
//   src/runtimeWsClient.ts:21         client-
const REAL_PREFIXES = ["req-", "img-", "folder-", "param-", "def-", "state-", "client-"];
// UUIDv4 的字符数：8+1+4+1+4+1+4+1+12 = 36
const UUID_LEN = 36;

describe("randomId 前缀与格式契约", () => {
  test("真实前缀集合:7 个前缀原样出现在开头,其后紧跟合法 UUIDv4", () => {
    for (const prefix of REAL_PREFIXES) {
      const id = randomId(prefix);
      // 只钉前缀（startsWith），不钉整串 —— 随机部分逐次变化
      expect(id.startsWith(prefix)).toBe(true);
      // 这一条同时挡住「实现偷偷在前后加了分隔符」：多一个字符 slice 就会偏移
      expect(id.slice(prefix.length)).toMatch(UUID_V4);
    }
  });

  test("前缀不被自动补分隔符,空前缀时长度恰为 36", () => {
    // 刻意用**不带连字符**的前缀：若实现改成 `${prefix}-${uuid}`，
    // startsWith("req-") 会转 false、slice(3) 会多出一个前导连字符而转 red。
    const bare = randomId("req");
    expect(bare.startsWith("req-")).toBe(false);
    expect(bare.slice("req".length)).toMatch(UUID_V4);

    // 默认参数 prefix = "" ⇒ 无前缀时长度就是 UUID 自身长度
    expect(randomId().length).toBe(UUID_LEN);
    expect(randomId("").length).toBe(UUID_LEN);
    expect(randomId().includes("-")).toBe(true);
  });

  test("返回值长度固定:恰为 前缀长度 + 36,同前缀连调三次长度不变", () => {
    // 长度断言独立于格式断言：格式正则允许放过「多一位/少一位」的实现变化，
    // 这里把总字符数钉死。随机部分每次都变，长度却恒定 —— 正是契约所在。
    for (const prefix of [...REAL_PREFIXES, ""]) {
      const expected = prefix.length + UUID_LEN;
      const lengths = [randomId(prefix), randomId(prefix), randomId(prefix)].map((id) => id.length);
      expect(lengths).toEqual([expected, expected, expected]);
    }
  });

  test("字符集:随机段仅小写十六进制,连字符固定落在第 8/13/18/23 位", () => {
    const id = randomId("img-");
    const uuid = id.slice("img-".length);
    // 显式小写：把实现改成 b.toString(16).toUpperCase() 会让这条转红
    expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(id).toBe(id.toLowerCase());
    // 剥掉连字符后必须恰好 32 位纯十六进制 —— 字符集与位数一起钉
    expect(uuid.replace(/-/g, "")).toMatch(/^[0-9a-f]{32}$/);
    // 连字符位置本身是 UUID 的结构契约，不能挪动
    const dashAt = [...uuid].map((ch, i) => (ch === "-" ? i : -1)).filter((i) => i >= 0);
    expect(dashAt).toEqual([8, 13, 18, 23]);
  });

  test("批量无碰撞:2000 个带前缀 id 互不相同(轮换全部真实前缀)", () => {
    // 一次性统计断言，**不是**「取随机直到满足条件」的重试写法，故不存在概率性间歇红。
    // 前缀是常量 ⇒ 碰撞空间仍等于 UUIDv4 的 122 bit：
    // C(2000,2) / 2^122 ≈ 1.999e6 / 5.3e36 ≈ 3.8e-31。
    // 与上面那条「无前缀 2000 个」互补：这里额外覆盖跨前缀不互相干扰。
    const ids = new Set();
    for (let i = 0; i < 2000; i += 1) ids.add(randomId(REAL_PREFIXES[i % REAL_PREFIXES.length]));
    expect(ids.size).toBe(2000);
  });

  test("批量无碰撞:手工拼装 v4 那条路径 2000 个同样互不相同", () => {
    // 只借真实 crypto 的 getRandomValues 并抹掉 randomUUID，强制走手工构造分支。
    // 直接用真实 randomUUID 会走另一条分支，那样这条用例就测不到手工路径了。
    setCrypto({ getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto) });
    const ids = new Set();
    for (let i = 0; i < 2000; i += 1) ids.add(randomId("t-"));
    expect(ids.size).toBe(2000);
    // 顺手确认这条路径确实产出了手工拼装的 v4（版本位/variant 位来自字节改写）
    expect(randomId("t-")).toMatch(/^t-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test("crypto 缺失回退:crypto 为 undefined 与 null 时不抛错,且仍返回带前缀的合法 id", () => {
    // 上面的「crypto 为 undefined 时不抛错」只钉了 not.toThrow，**没有**断言返回值 ——
    // 实现退化成 `return undefined` 或返回空串都照样绿。这里补上「仍返回合法 id」这半边。
    for (const missing of [undefined, null]) {
      setCrypto(missing);
      let id = null;
      expect(() => { id = randomId("fb-"); }).not.toThrow();
      expect(id).toBeTypeOf("string");
      expect(id.startsWith("fb-")).toBe(true);
      // 兜底段用 36 进制而非 UUID（Date.now.toString(36) - Math.random.toString(36).slice(2,10)），
      // 故只钉「两段小写字母数字 + 随机段被 slice 截到至多 8 位」。
      // 实测 30 万次采样：随机段长度 6~8，字符集恒为 [0-9a-z]（极小值也不出科学计数法符号，
      // 反而是更多前导零）。唯一能产出空串的输入是 Math.random() 恰为 0，概率 2^-53。
      expect(id).toMatch(/^fb-[0-9a-z]+-[0-9a-z]{1,8}$/);
      expect(id).toBe(id.toLowerCase());
    }
  });

  test("批量无碰撞:crypto 缺失的时间兜底路径 1000 个互不相同", () => {
    // 兜底路径的碰撞空间比 UUIDv4 小得多：随机段 8 位 36 进制 ≈ 36^8 ≈ 2^41.4。
    // 故规模取 1000 而非 2000：C(1000,2)/2^41.4 ≈ 4.995e5/2.6e12 ≈ 1.9e-7，
    // 比上面两条低两个数量级但仍可忽略；足够抓住「随机段被写死 / 时间段被写死」这类变异。
    setCrypto(undefined);
    const ids = new Set();
    for (let i = 0; i < 1000; i += 1) ids.add(randomId("fb-"));
    expect(ids.size).toBe(1000);
  });
});
