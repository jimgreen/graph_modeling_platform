import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  autoAlignEdgeWithoutStoredRoute,
  autoAlignNodeLayoutUnits,
  autoAlignStoredRouteDrops,
  buildCanvasLayoutUnits,
  countAutoAlignRouteBends,
  countAutoAlignRouteCrossings,
  createAutoAlignQualityReport,
  createAutoAlignRouteQualityIndex
} from "./selectionActions";
import {
  isCanvasNodeMovable,
  routeEdgesForStoredRendering,
  type Edge,
  type ModelNode,
  type RoutedEdge
} from "./model";

/**
 * 真实工程回归:自动对齐的「线路拐点 / 线路交叉不增加」约束。
 *
 * 用仓库里的标准案例(多能流)当输入,对「原布局 / 旧行为(无约束)/ 新行为(带约束)」三者的
 * 拐点数与交叉数做对比 —— 正是用户反馈里「阈值 50 拐点没消掉、阈值 100 拐点暴增还多出交叉」的场景。
 * 判定几何用真路由器 `routeEdgesForStoredRendering`,和画布渲染同一套参数。
 */
const PROJECT_FILE = "data/schemes/files/标准案例/子方案/多能流.json";
const projectAvailable = existsSync(PROJECT_FILE);
const RENDER_OPTIONS = { preserveManualRouteDisplay: true };

type Quality = { bends: number; crossings: number };

describe.skipIf(!projectAvailable)("auto-align line quality on a real project", () => {
  const readProject = () => {
    const raw = JSON.parse(readFileSync(PROJECT_FILE, "utf8"));
    const project = raw.project ?? raw;
    return {
      nodes: project.nodes as ModelNode[],
      edges: project.edges as Edge[],
      bounds: { width: project.canvasWidth ?? 2400, height: project.canvasHeight ?? 1400 }
    };
  };

  const measure = (routes: readonly RoutedEdge[]): Quality => {
    const points = routes.map((route) => route.points);
    return {
      bends: points.reduce((sum, item) => sum + countAutoAlignRouteBends(item), 0),
      crossings: countAutoAlignRouteCrossings(points)
    };
  };

  const movedCount = (original: readonly ModelNode[], state: readonly ModelNode[]) =>
    state.filter((node, index) =>
      node.position.x !== original[index].position.x || node.position.y !== original[index].position.y
    ).length;

  // 空白质量报告与生产侧同源(`createAutoAlignQualityReport`),避免字段漂移。
  const createReport = () => createAutoAlignQualityReport();

  const buildScenario = (state: ModelNode[], edges: Edge[], bounds: { width: number; height: number }) => {
    // 必须与生产口径一致:回调会被以 (nodes, edges) 两参调用,
    // 「保留存档折线 vs 按端口重算」的对比正是靠第二参换边的。写死 `edges` 会让两次调用退化成同一几何。
    const routeAll = (target: readonly ModelNode[], edgeList: readonly Edge[] = edges) =>
      routeEdgesForStoredRendering([...target], [...edgeList], bounds, RENDER_OPTIONS);
    const units = buildCanvasLayoutUnits(
      [],
      state,
      state.map((node) => node.id),
      [],
      edges,
      routeAll(state),
      { isTransformableNode: (node) => isCanvasNodeMovable(node.kind) }
    );
    const allEdgeIds = new Set(edges.map((edge) => edge.id));
    /**
     * 自动对齐提交时会顺手清掉「按端口重算严格更简单」的存档折线(`autoAlignStoredRouteDrops`,
     * 见 `createAutoAlignCanvasGraphics` → `commitLayoutNodePositions` 的 `storedRouteDrops`)。
     * 所以判定拐点 / 交叉必须把这些边按**重算几何**计,否则量的是提交后已经不存在的那段形状 ——
     * 这正是「负荷与变流器之间线路的拐点消不掉」在旧口径下被判成「变差」的原因。
     */
    const dropIdsOf = (target: readonly ModelNode[]) =>
      new Set(autoAlignStoredRouteDrops(target, edges, allEdgeIds, routeAll).map((drop) => drop.edgeId));
    const measureState = (target: readonly ModelNode[]) => {
      const dropIds = dropIdsOf(target);
      const measuredEdges = dropIds.size === 0
        ? edges
        : edges.map((edge) => (dropIds.has(edge.id) ? autoAlignEdgeWithoutStoredRoute(edge) : edge));
      return measure(routeEdgesForStoredRendering([...target], measuredEdges, bounds, RENDER_OPTIONS));
    };
    return { routeAll, units, dropIdsOf, measureState };
  };

  test("never increases line bends or crossings at any grid spacing", () => {
    const { nodes, edges, bounds } = readProject();
    const { routeAll, units, measureState } = buildScenario(nodes, edges, bounds);
    // 点「自动对齐」之前画面上的几何:存档折线原样保留。
    const initial = measure(routeAll(nodes));

    for (const threshold of [50, 100]) {
      const legacyNodes = autoAlignNodeLayoutUnits(nodes, units, threshold);
      const legacy = measureState(legacyNodes);
      const report = createReport();
      const constrainedNodes = autoAlignNodeLayoutUnits(nodes, units, threshold, {
        edges,
        routedEdges: routeAll(nodes),
        verifyRouteEdges: routeAll,
        report
      });
      const constrained = measureState(constrainedNodes);

      // eslint-disable-next-line no-console
      console.log("RESULT " + JSON.stringify({
        stage: `threshold-${threshold}`,
        initial,
        legacy,
        constrained,
        movedLegacy: movedCount(nodes, legacyNodes),
        movedConstrained: movedCount(nodes, constrainedNodes),
        report
      }));

      // 两条硬约束:拐点 / 交叉都不能因对齐而增加(按提交后的实际几何量)
      expect(constrained.bends, `threshold=${threshold} bends`).toBeLessThanOrEqual(initial.bends);
      expect(constrained.crossings, `threshold=${threshold} crossings`).toBeLessThanOrEqual(initial.crossings);
      // 阈值 100 是用户反馈的「布局剧变」重灾区,旧行为会明显恶化,新行为必须比它好或持平
      expect(constrained.bends, `threshold=${threshold} vs legacy bends`).toBeLessThanOrEqual(legacy.bends);
      expect(constrained.crossings, `threshold=${threshold} vs legacy crossings`).toBeLessThanOrEqual(legacy.crossings);
    }
  }, 180000);

  test("still snaps off-grid devices back onto the grid under the constraint", () => {
    const { nodes, edges, bounds } = readProject();
    // 把所有图元整体挪出网格(7,-5)px:原布局变成「处处差一点」,对齐应该把它们吸回网格且不让线路变差
    const shifted = nodes.map((node) => ({
      ...node,
      position: { x: node.position.x + 7, y: node.position.y - 5 }
    }));
    const { routeAll, units, measureState } = buildScenario(shifted, edges, bounds);
    const initial = measureState(shifted);
    const report = createReport();

    const aligned = autoAlignNodeLayoutUnits(shifted, units, 50, {
      edges,
      routedEdges: routeAll(shifted),
      verifyRouteEdges: routeAll,
      report
    });
    const after = measureState(aligned);

    // eslint-disable-next-line no-console
    console.log("RESULT " + JSON.stringify({
      stage: "off-grid",
      initial,
      after,
      moved: movedCount(shifted, aligned),
      report
    }));

    // 约束不能把对齐功能废掉:必须有图元吸附回网格
    expect(movedCount(shifted, aligned)).toBeGreaterThan(0);
    expect(after.bends).toBeLessThanOrEqual(initial.bends);
    expect(after.crossings).toBeLessThanOrEqual(initial.crossings);
  }, 180000);

  /**
   * 用户反馈「自动对齐消不掉 负荷 与相邻设备之间线路的拐点」的回归。
   *
   * 根因是判定几何(代理:端口对齐就直连)与渲染几何(编辑态 `preserveManualRouteDisplay` 会保留存档折线)
   * 不同口径:设备一移动,存档折线不但留下绕行,还多拐两个弯,终检据此回退,整单变成 no-op。
   * 修法是把「按端口重算严格更简单」的存档折线按重算几何计入侵检,并由调用方提交时真正清掉。
   */
  describe("stale stored routes", () => {
    const buildFlow = () => {
      const { nodes, edges, bounds } = readProject();
      return { nodes, edges, bounds, ...buildScenario(nodes, edges, bounds) };
    };

    /**
     * 造一条「存档折线依然有效」的边(端点与当前几何一致),但中间多绕了一圈 ——
     * 正是导入 / 拖拽后设备已回位、存档绕行却留下的陈迹。
     * 端点从路由器自己算出的锚点取,免得手写坐标对不上端子内缩。
     */
    const buildStaleDetour = (
      nodes: readonly ModelNode[],
      edges: readonly Edge[],
      routeAll: (target: readonly ModelNode[], edgeList: readonly Edge[]) => readonly RoutedEdge[]
    ) => {
      // 挑一对「并排摆平就必然是直线」的设备:按端口重算 0 拐点的那些。真实数据里端子、
      // 容器避让都会让某些边天生带拐点,不挑会得到「重算也不直」的边,判定前提就不成立。
      for (const realEdge of edges) {
        const srcTemplate = nodes.find((node) => node.id === realEdge.sourceId);
        const dstTemplate = nodes.find((node) => node.id === realEdge.targetId);
        if (!srcTemplate || !dstTemplate) {
          continue;
        }
        const src = { ...srcTemplate, position: { x: 100, y: 100 } };
        const dst = { ...dstTemplate, position: { x: 400, y: 100 } };
        const anchorEdge: Edge = { id: realEdge.id, sourceId: src.id, targetId: dst.id };
        const straight = routeAll([src, dst], [anchorEdge])[0]?.points ?? [];
        if (straight.length !== 2 || straight[0].y !== straight[1].y) {
          continue;
        }
        const start = straight[0];
        const end = straight[1];
        const midLeft = Math.round((start.x + end.x) / 2) - 40;
        const midRight = Math.round((start.x + end.x) / 2) + 40;
        const routePoints = [
          start,
          { x: midLeft, y: start.y },
          { x: midLeft, y: 20 },
          { x: midRight, y: 20 },
          { x: midRight, y: end.y },
          end
        ];
        const sanitized: Edge = { ...realEdge, sourceId: src.id, targetId: dst.id, routePoints };
        return { nodes: [src, dst] as ModelNode[], edges: [sanitized], edgeId: realEdge.id };
      }
      throw new Error("该案例里找不到「按端口重算即直线」的边,无法构造失效存档折线");
    };

    test("only drops stored routes whose rerouted geometry has strictly fewer bends", () => {
      const { nodes, edges, routeAll, dropIdsOf } = buildFlow();
      // 判定口径是「按端口重算的拐点 **严格少于** 保留存档折线」——逐边复算一遍作为期望值。
      const expected = edges
        .filter(
          (edge) =>
            countAutoAlignRouteBends(routeAll(nodes, [edge])[0].points) >
            countAutoAlignRouteBends(routeAll(nodes, [autoAlignEdgeWithoutStoredRoute(edge)])[0].points)
        )
        .map((edge) => edge.id)
        .sort();
      expect([...dropIdsOf(nodes)].sort()).toEqual(expected);
      // 「拐点数打平但腿位不同」的边绝不能被顺手换掉,否则凭空改变用户看到的形状。
      expect([...dropIdsOf(nodes)].length).toBeLessThanOrEqual(edges.length);
    });

    test("never worsens the line quality when snapping devices onto the grid", () => {
      const { nodes, edges, routeAll, units, measureState } = buildFlow();
      const report = createReport();
      const aligned = autoAlignNodeLayoutUnits(nodes, units, 50, {
        edges,
        routedEdges: routeAll(nodes),
        verifyRouteEdges: routeAll,
        report
      });

      // 引擎要么真的移动了图元,要么明确判定「已就位」——但不能是靠回退整单来充数。
      expect(report.revertedByVerification).toBe(false);

      const before = measureState(nodes);
      const after = measureState(aligned);
      expect(after.bends).toBeLessThanOrEqual(before.bends);
      expect(after.crossings).toBeLessThanOrEqual(before.crossings);
    });

    /**
     * 用户截图回归:存档绕行被自动对齐清掉之后,那条线**必须重铺成直线**。
     *
     * 错误的做法是「把清折线并进移动提交」:移动提交内部会 `preserveConnectionEdgeRouteShape`
     * 把存档绕行按**新端点**重锚,于是刚清掉的直线又被重新长成 4 拐点的 U 形凹口 ——
     * 正是截图里那个下垂的尖角。所以这里用一条「端点有效、中间绕路」的存档折线确定性地
     * 复现这个形状,并钉住「清理后必须塌回直线」。
     */
    test("reroutes a stale stored detour straight instead of re-anchoring it into a U", () => {
      const { nodes, edges, routeAll } = buildFlow();
      const { nodes: probeNodes, edges: probeEdges, edgeId } = buildStaleDetour(nodes, edges, routeAll);

      const stored = routeAll(probeNodes, probeEdges)[0].points;
      const fresh = routeAll(probeNodes, [autoAlignEdgeWithoutStoredRoute(probeEdges[0])])[0].points;

      // ① 存档绕行确实留有拐点(截图里那个 U 形凹口的来源),而按端口重算本该是直线
      expect(countAutoAlignRouteBends(stored)).toBeGreaterThan(0);
      expect(countAutoAlignRouteBends(fresh)).toBe(0);
      // ② 它被判为「失效存档折线」
      expect(
        autoAlignStoredRouteDrops(probeNodes, probeEdges, new Set([edgeId]), routeAll).map((drop) => drop.edgeId)
      ).toEqual([edgeId]);
      // ③ 清理之后 → 塌回重算直线(0 拐点)
      expect(fresh).toHaveLength(2);
      expect(routeAll(probeNodes, [autoAlignEdgeWithoutStoredRoute(probeEdges[0])])[0].points).toEqual(fresh);
      expect(countAutoAlignRouteBends(fresh)).toBe(0);
    });
  });

  test("keeps the constrained real-project pass under the interactive budget", () => {
    const { nodes, edges, bounds } = readProject();
    const shifted = nodes.map((node) => ({
      ...node,
      position: { x: node.position.x + 7, y: node.position.y - 5 }
    }));
    const { routeAll, units } = buildScenario(shifted, edges, bounds);
    let routeElapsed = 0;
    let routeCalls = 0;
    const timedRoute = (state: readonly ModelNode[], edgeList: readonly Edge[]) => {
      routeCalls += 1;
      const startedRoute = performance.now();
      const result = routeAll(state, edgeList);
      routeElapsed += performance.now() - startedRoute;
      return result;
    };
    const started = performance.now();
    autoAlignNodeLayoutUnits(shifted, units, 50, {
      edges,
      routedEdges: routeAll(shifted),
      verifyRouteEdges: timedRoute
    });
    const elapsed = performance.now() - started;
    console.log("PERF " + JSON.stringify({ elapsed, routeElapsed, routeCalls }));
    expect(routeCalls).toBeLessThanOrEqual(4);
    expect(elapsed).toBeLessThan(500);
  }, 180000);

  test("incremental route quality stays equivalent after edge geometry changes", () => {
    const routes = [
      { edgeId: "a", points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], path: "" },
      { edgeId: "b", points: [{ x: 50, y: -50 }, { x: 50, y: 50 }], path: "" },
      { edgeId: "c", points: [{ x: 0, y: 100 }, { x: 100, y: 100 }], path: "" }
    ];
    const index = createAutoAlignRouteQualityIndex(routes);
    const current = () => index.routes().map((route) => route.points);
    expect(index.quality()).toEqual({
      bends: routes.reduce((sum, route) => sum + countAutoAlignRouteBends(route.points), 0),
      crossings: countAutoAlignRouteCrossings(current())
    });

    index.replace({ edgeId: "b", points: [{ x: 150, y: -50 }, { x: 150, y: 50 }], path: "" });
    const replaced = current();
    expect(index.quality()).toEqual({
      bends: replaced.reduce((sum, points) => sum + countAutoAlignRouteBends(points), 0),
      crossings: countAutoAlignRouteCrossings(replaced)
    });

    index.remove("a");
    const removed = current();
    expect(index.quality()).toEqual({
      bends: removed.reduce((sum, points) => sum + countAutoAlignRouteBends(points), 0),
      crossings: countAutoAlignRouteCrossings(removed)
    });
  });
});
