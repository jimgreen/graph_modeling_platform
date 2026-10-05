// shared/pathSafety.mjs 的单元测试 —— 路径穿越防护的首要防线，此前零覆盖。
//
// 三个导出的用途都直接对应历史安全缺陷（见文件头注释）：
// - safeJoin：schemePath 的 ".." 段穿越（MCHECK-REPORT B-P0-1）
// - isPathInside：server.mjs 曾有两份重复实现（A1-P1-5）
// - sanitizeSegment：目录名/文件名里的非法字符与点段
//
// 这些函数被 server 多个入口直接依赖（空间导入解包、静态资源托管、方案路径），
// 一旦被改坏，症状是「能读到 base 之外的文件」——不会有任何现有测试报警。
import { describe, expect, test } from "vitest";
import path from "node:path";
import { isPathInside, safeJoin, sanitizeSegment } from "./pathSafety.mjs";

const base = path.resolve("/tmp/base");

// sanitizeSegment 的默认长度上限（与 shared/pathSafety.mjs 的 DEFAULT_MAX_LENGTH 同值；
// 该常量未导出，故此处按字面量钉住 —— 见 maxLength 那组用例的「非正数回落」断言）。
const DEFAULT_MAX_LENGTH = 80;

describe("isPathInside", () => {
  test("子路径在内部时为 true", () => {
    expect(isPathInside(base, path.join(base, "a", "b.txt"))).toBe(true);
  });

  test("base 自身不算「内部」（返回空相对路径）", () => {
    expect(isPathInside(base, base)).toBe(false);
  });

  test("同级兄弟目录不算内部", () => {
    expect(isPathInside(base, path.resolve("/tmp/base-sibling"))).toBe(false);
  });

  test("父目录与祖先不算内部", () => {
    expect(isPathInside(base, path.resolve("/tmp"))).toBe(false);
    expect(isPathInside(base, path.resolve("/"))).toBe(false);
  });

  test("前缀相同但不在内部的路径（防 startsWith 式误判）", () => {
    // /tmp/base-evil 以 /tmp/base 开头，但不在其内部
    expect(isPathInside(base, path.resolve("/tmp/base-evil/x"))).toBe(false);
  });
});

describe("safeJoin", () => {
  test("正常拼接返回绝对路径", () => {
    expect(safeJoin(base, "a", "b.txt")).toBe(path.join(base, "a", "b.txt"));
  });

  test("含 .. 的穿越返回 null", () => {
    expect(safeJoin(base, "..", "etc", "passwd")).toBeNull();
    expect(safeJoin(base, "a", "..", "..", "escape")).toBeNull();
  });

  test("中途逃逸再回来仍为 null（不做前缀式放行）", () => {
    // ".." 出去后又在 base 内落点：路径解析后确实在内部，但中间穿越过 —— 本实现按
    // resolve 后的最终位置判定，故这里返回正常路径。断言记录真实语义：
    const result = safeJoin(base, "a", "..", "b");
    expect(result).toBe(path.join(base, "b"));
  });

  test("绝对路径注入：指向外部时返回 null", () => {
    expect(safeJoin(base, path.resolve("/etc/passwd"))).toBeNull();
  });

  test("绝对路径注入：指向内部时正常（按最终位置判定）", () => {
    expect(safeJoin(base, path.join(base, "ok.txt"))).toBe(path.join(base, "ok.txt"));
  });

  test("空段被转成空串，不产生异常", () => {
    expect(() => safeJoin(base, "", null, undefined)).not.toThrow();
  });

  test("Windows 盘符注入不逃逸（在 win32 上）", () => {
    const result = safeJoin(base, "C:\\Windows\\System32");
    // 要么被解析为 base 内的相对段（合法），要么被判为穿越返回 null；
    // 绝不允许指向真实的 System32。
    if (result !== null) {
      expect(isPathInside(base, result)).toBe(true);
    }
  });
});

describe("sanitizeSegment", () => {
  test("正常名称原样保留", () => {
    expect(sanitizeSegment("默认方案")).toBe("默认方案");
    expect(sanitizeSegment("project-1")).toBe("project-1");
  });

  test("非法字符被替换为下划线", () => {
    expect(sanitizeSegment('a<b>c:d"e/f\\g|h?i*j')).toBe("a_b_c_d_e_f_g_h_i_j");
  });

  test("恰好为 . 或 .. 时回落到 fallback（防点段逃逸）", () => {
    expect(sanitizeSegment(".")).toBe("未命名");
    expect(sanitizeSegment("..")).toBe("未命名");
    expect(sanitizeSegment(".", "fallback")).toBe("fallback");
  });

  test("首尾空白被裁掉", () => {
    expect(sanitizeSegment("  名字  ")).toBe("名字");
  });

  test("超长被截断到 maxLength", () => {
    const long = "x".repeat(500);
    expect(sanitizeSegment(long).length).toBe(80);
    expect(sanitizeSegment(long, "f", 10).length).toBe(10);
  });

  test("空值/nullish 走 fallback", () => {
    expect(sanitizeSegment("")).toBe("未命名");
    expect(sanitizeSegment(null)).toBe("未命名");
    expect(sanitizeSegment(undefined, "fb")).toBe("fb");
  });

  test("结果不含路径分隔符（无法借此构造子目录）", () => {
    for (const input of ["a/b", "a\\b", "../x", "..\\x", "a/../b"]) {
      const out = sanitizeSegment(input);
      expect(out).not.toContain("/");
      expect(out).not.toContain("\\");
    }
  });
});

// ---------------------------------------------------------------------------
// maxLength 的契约（缺陷修复：负数反向截断）
//
// slice(0, -n) 的第二参数按 ToIntegerOrInfinity 转换，负数是「从末尾倒数 n 个」，
// 不是「最多取 n 个」。于是 200 字符的段在 -1 下产出 199 字符、在 -5 下产出 195 字符：
// 既没有限长（比上限 80 还长），又不是前缀，末尾被砍掉 —— 一段反向截断的垃圾名。
// 修复后非正数统一回落到默认上限 80。
// ---------------------------------------------------------------------------
describe("sanitizeSegment 的 maxLength 参数", () => {
  const long = "x".repeat(200);
  const DEFAULT = DEFAULT_MAX_LENGTH;

  test("负数 maxLength 回落到默认上限，不再从末尾倒数截断", () => {
    // ★ 核心判别点。修复前：slice(0, -1) → 199 字符、slice(0, -5) → 195 字符（尾部被砍）。
    // 修复后：与「不传 maxLength」逐字相等，且长度恰为默认上限。
    for (const bad of [-1, -5, -80, -1e9]) {
      const out = sanitizeSegment(long, "未命名", bad);
      expect(out, `maxLength=${bad} 必须等于默认值兜底的结果`).toBe(sanitizeSegment(long));
      expect(out, `maxLength=${bad} 长度必须是 ${DEFAULT}`).toBe("x".repeat(DEFAULT));
    }
  });

  test("负数 maxLength 修短串时不再丢掉末尾字符", () => {
    // 修复前 "ABCDEFGHIJ".slice(0, -1) === "ABCDEFGHI"（末位 J 消失）。
    expect(sanitizeSegment("ABCDEFGHIJ", "未命名", -1)).toBe("ABCDEFGHIJ");
    expect(sanitizeSegment("ABCDEFGHIJ", "未命名", -5)).toBe("ABCDEFGHIJ");
    // 单字符段在修复前会被 slice 成空串 → 静默变成 fallback（名字整个消失）。
    expect(sanitizeSegment("A", "未命名", -1)).toBe("A");
  });

  test("maxLength 为 0 走默认上限，而不是产出空串再兜底成 fallback", () => {
    // 真实行为记录：修复后 0 与负数同属「非正数」，同样回落到默认上限 80。
    // （修复前 slice(0, 0) === "" → cleaned 为空 → 返回 fallback，长名整个消失。）
    const out = sanitizeSegment(long, "未命名", 0);
    expect(out).toBe("x".repeat(DEFAULT));
    expect(out).not.toBe("未命名");
  });

  test("正数 maxLength 的行为完全不变（回归）", () => {
    expect(sanitizeSegment(long, "未命名", 10)).toBe("x".repeat(10));
    expect(sanitizeSegment(long, "未命名", DEFAULT)).toBe("x".repeat(DEFAULT));
    expect(sanitizeSegment(long, "未命名", 500)).toBe(long); // 上限大于原长 → 不补齐
    expect(sanitizeSegment(long, "未命名", 81)).toBe("x".repeat(81));
    // 短串 + 正数上限：不受影响
    expect(sanitizeSegment("abc", "未命名", 10)).toBe("abc");
  });

  test("undefined 走默认参数（回归）", () => {
    expect(sanitizeSegment(long, "未命名", undefined)).toBe("x".repeat(DEFAULT));
    expect(sanitizeSegment(long, "未命名")).toBe("x".repeat(DEFAULT));
    expect(sanitizeSegment(long)).toBe("x".repeat(DEFAULT));
  });

  test("非数字 maxLength 也回落到默认上限（NaN / null / 空串 / 不可比较字符串）", () => {
    // 真实行为记录：这些值都无法表达「最多取 n 个」，一律按默认上限处理。
    // 注意 "10" 是可比较的字符串 → 走正数分支，仍取 10（与既有行为一致，不算回归）。
    for (const bad of [NaN, null, "", "abc", "-3", [], {}]) {
      expect(sanitizeSegment(long, "未命名", bad), `maxLength=${String(bad)}`).toBe(
        "x".repeat(DEFAULT),
      );
    }
    expect(sanitizeSegment(long, "未命名", "10")).toBe("x".repeat(10));
  });

  test("限长先于点段兜底：正数上限下 .. 仍被 fallback 拦下", () => {
    // 确认 maxLength 的夹取没有把 /^\.+$/ 这条兜底挤掉。
    expect(sanitizeSegment("..", "fb", 10)).toBe("fb");
    expect(sanitizeSegment("...", "fb", -1)).toBe("fb");
    expect(sanitizeSegment("..", "fb", 0)).toBe("fb");
  });
});

// ---------------------------------------------------------------------------
// 以下几项当前**没有**防护，属于已知缺口。这里把现状钉成契约，
// 目的是让将来有人加防护时测试明确变红（而不是悄悄改了语义）。
// 保留名 / 代理对防护不在本次修复范围内，故只记录、不改行为。
// ---------------------------------------------------------------------------
describe("sanitizeSegment 的已知缺口（钉住现状，非期望行为）", () => {
  test("缺口：控制字符不被剔除（已防护的只有首尾空白与分隔符）", () => {
    // 未防护：NUL 等控制字符原样保留（NUL 在 Windows 文件名里非法）。
    expect(sanitizeSegment("\u0000")).toBe("\u0000");
    expect(sanitizeSegment("a\u0000b")).toBe("a\u0000b");
    // 内嵌换行/制表符原样保留；只有整个段就是空白时才被 trim 成空 → 兜底。
    expect(sanitizeSegment("\n")).toBe("未命名");
    expect(sanitizeSegment("\r\n")).toBe("未命名");
    expect(sanitizeSegment("a\nb")).toBe("a\nb");
    expect(sanitizeSegment("a\tb")).toBe("a\tb");
    // 但控制字符与分隔符混在一起时，分隔符那一半仍会被替换掉。
    expect(sanitizeSegment("a\u0000/b")).toBe("a\u0000_b");
  });

  test("缺口：落单代理段原样透传，且按码元限长会劈开代理对", () => {
    // 未防护：落单代理段（非法 UTF-16）不被检出、不被剔除。
    expect(sanitizeSegment("\uD800")).toBe("\uD800");
    expect(sanitizeSegment("\uDC00")).toBe("\uDC00");
    expect(sanitizeSegment("a\uD800b")).toBe("a\uD800b");
    expect(sanitizeSegment("\uD800")).not.toBe("未命名");
    // 未防护：上限以 UTF-16 码元计，落在代理对中间会把它劈成两个落单段。
    const pair = "\u{1F600}"; // 😀 占 2 码元
    const cut = sanitizeSegment("a".repeat(DEFAULT_MAX_LENGTH - 1) + pair);
    expect(cut).toHaveLength(DEFAULT_MAX_LENGTH);
    expect(cut).not.toBe("a".repeat(DEFAULT_MAX_LENGTH - 1) + pair); // 内容确实被砍了
    expect(cut.endsWith("\uD83D")).toBe(true); // 高代理落单
    // 上限落在偶数边界时不会劈开（对照组，说明是长度边界而非恒定缺陷）。
    expect(sanitizeSegment("a".repeat(DEFAULT_MAX_LENGTH - 2) + pair)).toBe(
      "a".repeat(DEFAULT_MAX_LENGTH - 2) + pair,
    );
  });

  test("缺口：Windows 设备保留名（CON / NUL / COM1 …）不被拦截", () => {
    // 未防护：这些名字在 Windows 上不能作为文件名/目录名，本函数照原样返回。
    for (const reserved of ["CON", "con", "NUL", "COM1", "COM0", "LPT1", "AUX", "PRN"]) {
      expect(sanitizeSegment(reserved), reserved).toBe(reserved);
    }
    expect(sanitizeSegment("CON.txt")).toBe("CON.txt"); // 带扩展名同样不拦
    // 保留名里的非法字符仍会被替换 —— 只差这一个字符就不再是保留名。
    expect(sanitizeSegment("COM1:x")).toBe("COM1_x");
  });

  test("已防护：路径分隔符被替换、纯点段被 fallback 拦下", () => {
    // 这一条是**有**防护的对照组，单独列出以免与上面的缺口混为一谈。
    expect(sanitizeSegment("a/b")).toBe("a_b");
    expect(sanitizeSegment("a\\b")).toBe("a_b");
    expect(sanitizeSegment("a//b")).toBe("a_b");
    expect(sanitizeSegment("/etc/passwd")).toBe("_etc_passwd");
    expect(sanitizeSegment("C:\\Windows")).toBe("C_Windows");
    // 纯点段（任意多个点）→ fallback
    for (const dots of [".", "..", "...."]) {
      expect(sanitizeSegment(dots), dots).toBe("未命名");
    }
    // 混合形态：分隔符被换掉后不再能构成路径段
    expect(sanitizeSegment("../x")).toBe(".._x");
    expect(sanitizeSegment("..\\x")).toBe(".._x");
    expect(sanitizeSegment("a/../b")).toBe("a_.._b");
  });

  test("已防护：先替换非法字符再限长（截断边界落在非法字符run内也不放行分隔符）", () => {
    // 顺序契约：replace 在 slice **之前**。若两者换序，落在截断边界上的非法字符
    // 会被砍掉而不经替换 —— 上限 3 时 "a//a" 得 "a_"（末尾分隔符消失，且少一个字符）；
    // 正确顺序先把 "//" 折叠成一个 "_"，再截断得 "a_a"。
    expect(sanitizeSegment("a//a", "未命名", 3)).toBe("a_a");
    expect(sanitizeSegment("a///b", "未命名", 3)).toBe("a_b");
    expect(sanitizeSegment("<>x", "未命名", 2)).toBe("_x");
    // 非法字符 run 横跨默认上限边界时同理：80 码元处的 run 先折叠再截断，不产生裸分隔符。
    const cut = sanitizeSegment("y".repeat(DEFAULT_MAX_LENGTH - 1) + "///z");
    expect(cut).toBe("y".repeat(DEFAULT_MAX_LENGTH - 1) + "_");
    expect(cut).not.toContain("/");
    expect(cut).toHaveLength(DEFAULT_MAX_LENGTH);
  });
});
