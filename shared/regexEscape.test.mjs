// escapeRegExp 的等价性守卫（跨端共享单源）。
//
// 此前 `src/model.ts`、`src/svgUtils.ts`、`server/config.mjs` 各有一份相同实现。
// 合并到 shared/regexEscape.mjs 后，本文件把**三份旧实现逐一与共享版对比**，
// 确保合并是零行为变化的纯重构 —— 任何一份的差异都会立刻暴露。
//
// `u` 标志差异也一并钉住：`src/svgUtils.ts` 原实现带 `u`，另两份不带。
// 对 `[.*+?^${}()|[\]\\]` 这类纯 ASCII 元字符，`u` 与非 `u` 行为相同（都按单码点
// 匹配），故共享版取不带 `u` 的多数派版本。
import { describe, expect, test } from "vitest";
import { escapeRegExp } from "./regexEscape.mjs";

/** src/model.ts 的原实现（无 u） */
const originalNoU = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** src/svgUtils.ts 的原实现（带 u） */
const originalWithU = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

describe("三份旧实现与共享版逐字节相同", () => {
  // 覆盖正则全部元字符 + 无关字符 + 空串
  const samples = [
    "", "a", "abc", ".*+?^${}()|[]\\",
    "^$", "a.b", "a*b", "a+b", "a?b", "a{2}", "a|b", "(a)", "[a]", "\\a",
    "ACLoad", "ac-vpp-box", "图层 1", "idx_ac_unit_t1",
    "/webgrp/images", "a\\b\\c", "%%%", "^^^", "|||", "()()",
    "a".repeat(100), ".*".repeat(50)
  ];

  test("对无 u 版本（model.ts / config.mjs 原实现）", () => {
    for (const s of samples) {
      expect(escapeRegExp(s), JSON.stringify(s)).toBe(originalNoU(s));
    }
  });

  test("对带 u 版本（svgUtils.ts 原实现）", () => {
    for (const s of samples) {
      expect(escapeRegExp(s), JSON.stringify(s)).toBe(originalWithU(s));
    }
  });

  test("穷举：全部 ASCII 单字符 + 两两组合与两版都相同", () => {
    const mismatches = [];
    for (let a = 0; a < 0x80; a += 1) {
      const ca = String.fromCharCode(a);
      if (escapeRegExp(ca) !== originalNoU(ca) || escapeRegExp(ca) !== originalWithU(ca)) {
        mismatches.push(ca);
      }
      for (let b = 0; b < 0x80; b += 1) {
        const s = ca + String.fromCharCode(b);
        if (escapeRegExp(s) !== originalNoU(s) || escapeRegExp(s) !== originalWithU(s)) {
          mismatches.push(s);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("转义后的字符串可用于正则（行为正确性）", () => {
  test("嵌入正则后字面量匹配，不被当作元字符", () => {
    const literal = "a.b*c+d?e(f)g[h]i{j}k^l$m|n\\o";
    const pattern = new RegExp(`^${escapeRegExp(literal)}$`);
    expect(pattern.test(literal)).toBe(true);
    // 未转义时会被当作模式而误匹配
    expect(new RegExp(`^${literal}$`).test(literal)).toBe(false);
  });

  test("可安全嵌入字符类内部", () => {
    const cls = escapeRegExp("a-b]c");
    expect(new RegExp(`^[${cls}]$`).test("a")).toBe(true);
  });
});

describe("nullish 与非字符串输入", () => {
  test("undefined/null → 空串（与 String(value ?? \"\") 一致）", () => {
    expect(escapeRegExp(undefined)).toBe("");
    expect(escapeRegExp(null)).toBe("");
  });

  test("数字/布尔被转成字符串", () => {
    expect(escapeRegExp(123)).toBe("123");
    expect(escapeRegExp(false)).toBe("false");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 「刻意不转义连字符」契约（有意设计，勿改）
//
// 源文件 shared/regexEscape.mjs 第 11-12 行的注释原文：
//   「转义集刻意**不补 `-`**：这三个调用方都把结果用在字符类 `[...]` 内部或量词上下文，
//     `-` 在那两处的转义会改变语义。改动前请先确认调用点。」
//
// 即：`-` 不在字符类 `[.*+?^${}()|[\]\\]` 里，是**刻意**的，不是遗漏。
// 将来若有人看到「`-` 没被转义」以为是 bug 而顺手补上，本文件的用例会红 ——
// 那是**告警**而非故障：请先确认是否要同步改动所有调用点与本文件，再决定改不改。
//
// ⚠ 为什么本文件必须用**硬编码字面量**而不是像上面的等价性守卫那样复刻一份正则来比对：
// 复刻出来的参照物里同样没有 `-`，两边一起漂移时互相印证、恒绿 —— 钉不住契约。
// 下面每条断言的期望值都是写死的字符串字面量。
// ────────────────────────────────────────────────────────────────────────────

/** 源码字符类 /[.*+?^${}()|[\]\\]/ 的实际集合：14 个，逐个断言，不多不少。 */
const EXPECTED_ESCAPED_CHARS = [".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"];

/** 刻意保持原样的字符（不在字符类里）。除 `-` 外，`/` 同样不转义 —— RegExp 构造器无需转义 `/`。 */
const EXPECTED_KEPT_CHARS = ["-", "/", " ", "_", "=", ":", ",", "#", "%", "&", "@", "!", "~", "'", "\"", "`", "<", ">"];

describe("连字符刻意不转义（有意设计，勿改）", () => {
  test("单独一个连字符原样返回", () => {
    expect(escapeRegExp("-")).toBe("-");
    // 带上下文：连字符不因位置（首/中/尾/连续）而改变
    expect(escapeRegExp("a-b")).toBe("a-b");
    expect(escapeRegExp("-a")).toBe("-a");
    expect(escapeRegExp("a-")).toBe("a-");
    expect(escapeRegExp("--")).toBe("--");
    expect(escapeRegExp(" - ")).toBe(" - ");
  });

  test("真实调用点用到的含连字符名字全部原样返回", () => {
    // 取材自实际调用点：src/model.ts 的 deviceDefaultNameBase、
    // src/svgUtils.ts 的 id alternation、server 的 apiPath 前缀。
    expect(escapeRegExp("ac-vpp-box")).toBe("ac-vpp-box");
    expect(escapeRegExp("idx_ac_unit-t1")).toBe("idx_ac_unit-t1");
    expect(escapeRegExp("/web-grp/v1/control/device/add")).toBe("/web-grp/v1/control/device/add");
    expect(escapeRegExp("图层 1-副本 2")).toBe("图层 1-副本 2");
  });

  test("连字符与其它元字符混合时：只转义元字符，连字符保持原样", () => {
    // 这是本契约最核心的一条 —— 同时钉住「`-` 不动」与「`.` `*` 要动」两侧。
    expect(escapeRegExp("a-b.c*d")).toBe("a-b\\.c\\*d");
    expect(escapeRegExp("x-1+2")).toBe("x-1\\+2");
    expect(escapeRegExp("(a-b)")).toBe("\\(a-b\\)");
    expect(escapeRegExp("a-b\\c")).toBe("a-b\\\\c");
  });

  test("字符类上下文里连字符保持原样（`-` 在 `[...]` 里会形成范围，别去动它）", () => {
    const cls = escapeRegExp("a-b]c");
    expect(cls).toBe("a-b\\]c");
    // 现状（`-` 未转义）：a-b 被解析成范围，裸 `-` 不匹配
    const pattern = new RegExp(`^[${cls}]$`);
    expect(pattern.test("a")).toBe(true);
    expect(pattern.test("c")).toBe(true);
    expect(pattern.test("-")).toBe(false);
    expect(pattern.test("d")).toBe(false);
  });
});

describe("确实转义的元字符集合", () => {
  test("逐个断言 14 个元字符各被加一个反斜杠", () => {
    for (const c of EXPECTED_ESCAPED_CHARS) {
      expect(escapeRegExp(c), JSON.stringify(c)).toBe(`\\${c}`);
    }
  });

  test("刻意保持原样的字符逐个原样返回", () => {
    for (const c of EXPECTED_KEPT_CHARS) {
      expect(escapeRegExp(c), JSON.stringify(c)).toBe(c);
    }
    // 连字符再钉一次（上一组里也含 `-`，此处显式单列，便于失败时一眼定位）
    expect(escapeRegExp("-")).toBe("-");
    expect(escapeRegExp("/")).toBe("/");
  });

  test("全元字符组合串的完整期望输出（硬编码）", () => {
    expect(escapeRegExp(".*+?^${}()|[]\\")).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  test("真实形态字符串的完整期望输出（硬编码）", () => {
    // Windows 路径 + 连字符（引用的正是 model.ts / svgUtils.ts 的输入形态）
    expect(escapeRegExp("C:\\tmp\\a-b.txt")).toBe("C:\\\\tmp\\\\a-b\\.txt");
    // 命名捕获组前缀（server/config.mjs 的 suffix 形态）
    expect(escapeRegExp("(?<tab>foo)")).toBe("\\(\\?<tab>foo\\)");
    // 交替分支的分隔符不归本函数管：只转义 id 本身，`|` 交给调用方 join
    expect(escapeRegExp("id-1")).toBe("id-1");
  });
});

describe("边界输入", () => {
  test("空串", () => {
    expect(escapeRegExp("")).toBe("");
  });

  test("单字符", () => {
    expect(escapeRegExp("a")).toBe("a");
    expect(escapeRegExp("中")).toBe("中");
    expect(escapeRegExp("5")).toBe("5");
  });

  test("已含反斜杠的输入：反斜杠自身被转义，连字符仍不动", () => {
    expect(escapeRegExp("\\")).toBe("\\\\");
    expect(escapeRegExp("a\\b")).toBe("a\\\\b");
    expect(escapeRegExp("a\\b\\c")).toBe("a\\\\b\\\\c");
    // 已含转义序列的输入会被再转义一层（本函数非幂等，勿依赖其幂等性）
    expect(escapeRegExp("a\\-b")).toBe("a\\\\-b");
  });
});

describe("可逆性：转义结果作正则能匹配回原串", () => {
  test("真实字符串经 escapeRegExp 后 new RegExp(...).test(s) 为 true", () => {
    // 用法确认：三处调用点都是把结果拼进 new RegExp(...) 的模式里（见
    // server/config.mjs 的 apiPattern、server/server.mjs 的 dynAssetPattern、
    // src/model.ts 的 indexedNamePattern、src/svgUtils.ts 的 idAlternation）。
    const samples = [
      "a-b",
      "ac-vpp-box",
      "idx_ac_unit-t1",
      "/webgrp/images",
      "/web-grp/v1/runtime/screenshot",
      "a.b*c+d?e(f)g[h]i{j}k^l$m|n\\o",
      ".*+?^${}()|[]\\",
      "图层 1",
      "C:\\tmp\\a-b.txt",
      "-",
      "a",
      "%$#@!~"
    ];
    for (const s of samples) {
      expect(new RegExp(escapeRegExp(s)).test(s), JSON.stringify(s)).toBe(true);
    }
  });

  test("含连字符的串在 u 标志下仍能构造并匹配（server 的 apiPattern 用 u）", () => {
    // 关键：`\-` 在 u 标志下是 SyntaxError（Unicode 模式的 IdentityEscape 只允许
    // SyntaxCharacter 与 `/`）。apiPattern / dynAssetPattern 都带 u 标志，所以一旦把
    // `-` 补进转义集、前缀里又含连字符（GRAPH_MODEL_API_PREFIX 可自定义），
    // 就会在 new RegExp(...) 处直接抛异常 —— 这正是不能补的硬理由。
    const path = "/web-grp/v1/control/device/add";
    expect(escapeRegExp(path)).toBe(path);
    const pattern = new RegExp(`^${escapeRegExp(path)}/?$`, "u");
    expect(pattern.test(path)).toBe(true);
    expect(pattern.test(`${path}/`)).toBe(true);
    expect(pattern.test("/webgrp/v1/control/device/add")).toBe(false);
    // 自证：把连字符转义后，同一构造确实会抛 —— 说明上面那条不是恒绿
    expect(() => new RegExp(`^${escapeRegExp(path).replace(/-/g, "\\-")}/?$`, "u")).toThrow(SyntaxError);
  });
});
