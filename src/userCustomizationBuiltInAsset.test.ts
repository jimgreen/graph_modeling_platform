// src/userCustomizations.ts 的 userCustomizationAssetIsBuiltIn：判断一张图片资源是不是「内置的」。
// 内置资源被用户改动 / 删除会影响所有方案，所以这个判定是删除与改名的护栏。
// 此前零断言。判错不抛异常：内置图被当成用户图删掉，或用户的图被误判成内置而删不掉 ——
// 两种都只表现为「资源管理器里少了一张图」。
//
// 11 处变异逐条跑过、11 处全红（三条判据各自删掉、trim 口径、大小写、前缀边界都有人盯）。
//
// 三个判据各按各的口径（都不是同一套归一）：
//   createdAt === "builtin"                 —— 精确比，**不 trim**
//   folderId（trim 后） === "builtin-shared-icons" —— 精确比，大小写敏感
//   id（trim 后）以 "builtin-shared-icon-" 开头    —— 前缀比，大小写敏感
import { describe, expect, test } from "vitest";

import { userCustomizationAssetIsBuiltIn } from "./userCustomizations";

const asset = (over: { id?: string; folderId?: string; createdAt?: string } = {}) => ({
  id: "user-icon-1",
  folderId: "folder-a",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over
});

const isBuiltIn = (over: Parameters<typeof userCustomizationAssetIsBuiltIn>[0]) => userCustomizationAssetIsBuiltIn(over);

describe("userCustomizationAssetIsBuiltIn：三个判据", () => {
  test("★ createdAt 是 builtin", () => {
    expect(isBuiltIn(asset({ createdAt: "builtin" }))).toBe(true);
  });

  test("★ folderId 是内置共享图标夹", () => {
    expect(isBuiltIn(asset({ folderId: "builtin-shared-icons" }))).toBe(true);
  });

  test("★ id 带内置共享图标前缀", () => {
    expect(isBuiltIn(asset({ id: "builtin-shared-icon-abc" }))).toBe(true);
  });

  test("用户自己的资源三个判据都不命中", () => {
    expect(isBuiltIn(asset())).toBe(false);
    expect(isBuiltIn(asset({ id: "icon-1", folderId: "folder-a", createdAt: "2026-01-01" }))).toBe(false);
  });
});

describe("userCustomizationAssetIsBuiltIn：边界", () => {
  test("★ folderId 与 id 比较前会去空白", () => {
    expect(isBuiltIn(asset({ folderId: "  builtin-shared-icons  " }))).toBe(true);
    expect(isBuiltIn(asset({ id: "  builtin-shared-icon-abc  " }))).toBe(true);
  });

  test("★ createdAt 不去空白（它那一条是精确比）", () => {
    expect(isBuiltIn(asset({ createdAt: " builtin " }))).toBe(false);
  });

  test("★ 三条都大小写敏感", () => {
    expect(isBuiltIn(asset({ createdAt: "BUILTIN" }))).toBe(false);
    expect(isBuiltIn(asset({ folderId: "Builtin-Shared-Icons" }))).toBe(false);
    expect(isBuiltIn(asset({ id: "BUILTIN-SHARED-ICON-abc" }))).toBe(false);
  });

  test("前缀差一个字符就不算（不是模糊匹配）", () => {
    expect(isBuiltIn(asset({ id: "builtin-shared-icon" }))).toBe(false);
    expect(isBuiltIn(asset({ id: "builtin-shared-icons-abc" }))).toBe(false);
    expect(isBuiltIn(asset({ folderId: "builtin-shared-icons-2" }))).toBe(false);
  });

  test("空串 / 空白字段都不算内置", () => {
    expect(isBuiltIn({ id: "", folderId: "", createdAt: "" })).toBe(false);
    expect(isBuiltIn({ id: "   ", folderId: "  ", createdAt: "  " })).toBe(false);
  });
});
