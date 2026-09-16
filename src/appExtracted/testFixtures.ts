// appExtracted 侧测试共用的最小节点构造器(容器/归属类用例都在造这种「最小 ModelNode」)。
// 只放形状:名称=id、40×30、无端子;**口径相关的默认值(标签可见性等)由调用方经 extra.params 给** ——
// 各文件对「包围盒是否含标签」的要求不同,共享层不替它们定。
// 不叫 *.test.* :本文件是构造器,不是测试(否则 vitest 会当空套件收集)。
export function bareNode(id: string, kind: string, x = 0, y = 0, extra: Record<string, unknown> = {}) {
  return {
    id, kind, name: id, position: { x, y }, size: { width: 40, height: 30 },
    rotation: 0, scale: 1, params: {}, terminals: [], ...extra,
  };
}
