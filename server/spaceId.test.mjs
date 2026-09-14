// 空间 id 生成与校验：允许中文（目录可读性），排除路径分隔符与 Windows 保留名。
import { expect, test } from "vitest";
import { spaceIdFromName, isValidSpaceId, isReservedSpaceId } from "./spaceId.mjs";

test("中文名直接用作 id", () => {
  expect(spaceIdFromName("张三")).toBe("张三");
});

test("空格与路径分隔符折叠为连字符", () => {
  expect(spaceIdFromName("张 三")).toBe("张-三");
  expect(spaceIdFromName("李四/测试")).toBe("李四-测试");
  expect(spaceIdFromName("a\\b")).toBe("a-b");
});

test("连续合法分隔符折叠，首尾连字符剥除", () => {
  expect(spaceIdFromName("--a---b--")).toBe("a-b");
});

test("冲突时追加 -2 -3", () => {
  expect(spaceIdFromName("李四", ["李四"])).toBe("李四-2");
  expect(spaceIdFromName("李四", ["李四", "李四-2"])).toBe("李四-3");
});

test("冲突判定不区分大小写（NTFS 语义）", () => {
  expect(spaceIdFromName("Abc", ["abc"])).toBe("Abc-2");
});

test("Windows 保留名加下划线前缀", () => {
  expect(spaceIdFromName("con")).toBe("_con");
  expect(spaceIdFromName("COM1")).toBe("_COM1");
  expect(isReservedSpaceId("con")).toBe(true);
});

test("全符号名兜底为 space", () => {
  expect(spaceIdFromName("🎉")).toBe("space");
  expect(spaceIdFromName("   ")).toBe("space");
});

test("截断至 40 字符，且冲突后缀不撑破上限", () => {
  const long = "字".repeat(50);
  expect(spaceIdFromName(long)).toBe("字".repeat(40));
  expect([...spaceIdFromName(long, ["字".repeat(40)])].length).toBe(40);
});

test("非法 id 被拒绝", () => {
  for (const bad of ["", "-a", "a/b", "a\\b", "a.b", "a b", "字".repeat(41), 123, null]) {
    expect(isValidSpaceId(bad)).toBe(false);
  }
  for (const ok of ["default", "张三", "_con", "a", "a-b_c", "字".repeat(40)]) {
    expect(isValidSpaceId(ok)).toBe(true);
  }
});

// 以下两组是保留名的哨兵：上面「Windows 保留名」用例只断言了 con，
// 删掉 prn|aux|nul|com[1-9]|lpt[1-9] 分支或去掉结尾 $ 锚点，那 9 个用例仍全绿，
// 故两处失败模式在此各钉一组。isReservedSpaceId 是 spaceIdFromName（加前缀）与
// spaceStore.scanWorkspaces（目录准入）共用的唯一判据，漏一个即两处同时失守。
test("保留名清单完整覆盖（不止 con）", () => {
  for (const name of ["prn", "aux", "nul", "com1", "lpt9", "COM9", "Nul"]) {
    expect(isReservedSpaceId(name)).toBe(true);
  }
});

test("含保留名但不相等的名字不算保留名（钉死 $ 锚点）", () => {
  // 缺 $ 锚点时 con-2 / concat / console 会被误判为保留名，com10 / lpt0 同理。
  for (const name of ["con-2", "concat", "console", "null", "com10", "lpt0"]) {
    expect(isReservedSpaceId(name)).toBe(false);
  }
});
