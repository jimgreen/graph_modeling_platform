// server/mcp/clientToken.mjs 的单测。
//
// 三条规则（用户定的口径）：
//   ① 传了 token → 必须是本空间的在线页面，否则 not-found；
//   ② 没传且本空间只有一个页面 → 直接用它；
//   ③ 没传且本空间多个页面 → token-required（**不**静默挑最近活跃的）。
//
// 另有两处易错点专门钉住：空间筛选（别空间同 id 不算命中）、空空间与「有别的空间的页面」区分开。
import { expect, test, describe } from "vitest";
import { resolveClientToken, TOKEN_REQUIRED_CODE } from "./clientToken.mjs";

const clients = [
  { clientId: "page-aaa", workspaceId: "zhangsan" },
  { clientId: "page-bbb", workspaceId: "zhangsan" },
  { clientId: "page-zzz", workspaceId: "lisi" }
];

describe("resolveClientToken", () => {
  test("传了本空间存在的 token → 原样作为 clientId", () => {
    expect(resolveClientToken("page-aaa", { spaceId: "zhangsan", clients })).toEqual({
      clientId: "page-aaa"
    });
  });

  test("token 前后空白会被 trim（手工粘贴常带空格）", () => {
    expect(resolveClientToken("  page-bbb  ", { spaceId: "zhangsan", clients })).toEqual({
      clientId: "page-bbb"
    });
  });

  test("token 属于别的空间 → not-found（不能跨空间打靶）", () => {
    const result = resolveClientToken("page-zzz", { spaceId: "zhangsan", clients });
    expect(result.error.code).toBe("not-found");
    // 文案里给出本空间的候选，方便调用方改对；
    // 候选段里不能出现别空间的 token（否则等于把别空间的存在泄露出去）
    expect(result.error.message).toContain("page-aaa");
    const candidates = result.error.message.split("本空间在线 token")[1] ?? "";
    expect(candidates).not.toContain("page-zzz");
  });

  test("token 不存在 → not-found 且列出本空间在线 token", () => {
    const result = resolveClientToken("page-nope", { spaceId: "zhangsan", clients });
    expect(result.error.code).toBe("not-found");
    expect(result.error.message).toContain("page-aaa");
    expect(result.error.message).toContain("page-bbb");
  });

  test("没传 token + 本空间只有一个页面 → 直接用那一个", () => {
    const result = resolveClientToken(undefined, {
      spaceId: "lisi",
      clients
    });
    expect(result).toEqual({ clientId: "page-zzz" });
  });

  test("没传 token + 本空间多个页面 → token-required，并列出全部候选", () => {
    const result = resolveClientToken("", { spaceId: "zhangsan", clients });
    expect(result.error.code).toBe(TOKEN_REQUIRED_CODE);
    expect(result.error.message).toContain("2 个在线页面");
    expect(result.error.message).toContain("page-aaa");
    expect(result.error.message).toContain("page-bbb");
    // 不猜：错误里不能出现某个「我替你选了」的暗示
    expect(result.error.message).toContain("?token=");
  });

  test("没传 token + 本空间没有页面 → no-online-client（与「多个」区分开）", () => {
    const result = resolveClientToken(undefined, { spaceId: "wangwu", clients });
    expect(result.error.code).toBe("no-online-client");
  });

  test("完全没有任何在线页面 → no-online-client", () => {
    const result = resolveClientToken(undefined, { spaceId: "zhangsan", clients: [] });
    expect(result.error.code).toBe("no-online-client");
  });

  test("只有别的空间的页面时，本空间没传 token → no-online-client（不是 token-required）", () => {
    // 只有一个页面在线，但它在别的空间：本空间仍然是「没有页面」
    const result = resolveClientToken(undefined, {
      spaceId: "zhangsan",
      clients: [{ clientId: "page-zzz", workspaceId: "lisi" }]
    });
    expect(result.error.code).toBe("no-online-client");
  });

  test("clients 缺失 / 非数组时不炸（防御接线错误）", () => {
    expect(resolveClientToken(undefined, { spaceId: "zhangsan" }).error.code).toBe("no-online-client");
    expect(resolveClientToken(undefined, {}).error.code).toBe("no-online-client");
    expect(resolveClientToken("page-aaa", { spaceId: "zhangsan", clients: null }).error.code).toBe("not-found");
  });
});
