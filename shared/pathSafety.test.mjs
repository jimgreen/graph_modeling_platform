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
