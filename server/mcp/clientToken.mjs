// MCP 侧的「目标页面」解析：把可选的 token 变成确定的 clientId，或在无法确定时**明确拒绝**。
//
// ## 它解决的问题
//
// 后端把运行时态读取与写指令都发给一条 WS 连接。多个页面同时在线时，
// 「发给哪一个」必须由调用方说清 —— 否则只能退回「最近活跃的那个」，
// 于是「我在 A 页面操作，指令却打到了 B 页面」这种事故是静默发生的。
//
// ## 三条规则（对应用户定的口径）
//
//   1. 传了 token → 必须是**本空间**的在线页面，否则 not-found（附在线 token 清单）；
//   2. 没传 token 且本空间**只有一个**在线页面 → 就用它（单页面场景不必每次填 token）；
//   3. 没传 token 且本空间**多个**在线页面 → **拒绝**，code `token-required`，
//      文案里列出可选 token。不猜、不退回最近活跃。
//
// ## 为什么按空间筛
//
// clientId 只在空间内唯一（注册表按 clientId 去重，不同空间可以撞名）。
// 只在本空间候选里挑，等价于 v1 的 `resolveClient(clientId, workspaceId)` 口径，
// 避免「拿着 A 空间的 token 打到 B 空间的页面」。
//
// ## 纯函数
//
// 入参是**已经列好的客户端数组**（不是回调），故单测不需要假 WS，直接喂数组。

/** 本空间有多个在线页面但没传 token 时的错误码（只存在于 MCP 层，不走 v1 HTTP 映射）。 */
export const TOKEN_REQUIRED_CODE = "token-required";

/** 在线 token 清单（用于错误文案；点号分隔，便于一眼看清有几个）。 */
function describeTokens(clients) {
  return clients.map((client) => `“${client.clientId}”`).join("、");
}

/**
 * 解析目标页面。
 *
 * @param {string|undefined} token 调用方传入的 token（= 页面地址栏里的 ?token=）
 * @param {object} options
 * @param {string} options.spaceId 调用方所在空间
 * @param {Array<{clientId: string, workspaceId?: string}>} options.clients 全部在线客户端
 * @returns {{clientId: string} | {error: {code: string, message: string}}}
 */
export function resolveClientToken(token, { spaceId, clients } = {}) {
  const wanted = typeof token === "string" ? token.trim() : "";
  const wantedSpace = String(spaceId ?? "");
  const all = Array.isArray(clients) ? clients : [];
  // 空间必须参与筛选：clientId 只在空间内唯一
  const inSpace = all.filter((client) => String(client?.workspaceId ?? "") === wantedSpace);

  if (wanted) {
    const hit = inSpace.find((client) => String(client?.clientId ?? "") === wanted);
    if (hit) {
      return { clientId: wanted };
    }
    const hint = inSpace.length > 0
      ? `本空间在线 token：${describeTokens(inSpace)}`
      : "本空间当前没有在线页面。";
    return {
      error: {
        code: "not-found",
        message: `本空间没有 token 为“${wanted}”的在线页面。${hint}`
      }
    };
  }

  if (inSpace.length === 0) {
    return {
      error: {
        code: "no-online-client",
        // 文案与 v1/registry 的「无在线客户端」保持同一句话，避免同一个错误码出现两套说法
        message: "无在线客户端：本空间当前没有在线前端页面。请先在浏览器打开本平台并保持页面不关。"
      }
    };
  }

  if (inSpace.length === 1) {
    // 单页面：不必每次填 token。这是「只有一个连接就直接用它」的规则。
    return { clientId: String(inSpace[0].clientId) };
  }

  return {
    error: {
      code: TOKEN_REQUIRED_CODE,
      message:
        `本空间有 ${inSpace.length} 个在线页面，必须用 token 指定要操作哪一个（token 就是页面地址栏里的 ?token= 的值）。`
        + `在线 token：${describeTokens(inSpace)}`
    }
  };
}
