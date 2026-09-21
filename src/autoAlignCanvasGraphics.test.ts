import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createAutoAlignCanvasGraphics } from "./appExtracted/appProjectCanvasFactories";
import { autoAlignEdgeWithoutStoredRoute, autoAlignStoredRouteDrops } from "./selectionActions";
import { routeEdgesForStoredRendering, type Edge, type ModelNode } from "./model";

const PROJECT_FILE = "data/schemes/files/标准案例/子方案/多能流.json";
const projectAvailable = existsSync(PROJECT_FILE);

describe("canvas automatic grid alignment", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  test("uses the configured value as grid spacing and reports the grid alignment", () => {
    const prompt = vi.fn(() => "50");
    (globalThis as { window?: unknown }).window = { prompt };
    const nodes = [
      { id: "node-1", kind: "device", position: { x: 112, y: 113 } },
      { id: "node-2", kind: "device", position: { x: 118, y: 119 } }
    ];
    const layoutUnits = nodes.map((node) => ({ id: `node:${node.id}`, nodeIds: [node.id] }));
    const arranged = nodes.map((node, index) => ({
      ...node,
      position: { x: 100 + index * 50, y: 100 }
    }));
    const autoAlignNodeLayoutUnits = vi.fn(() => arranged);
    const commitLayoutNodePositions = vi.fn(() => 2);
    const writeOperationLog = vi.fn();

    createAutoAlignCanvasGraphics({
      AUTO_ALIGN_DEFAULT_THRESHOLD_PX: 50,
      AUTO_ALIGN_MAX_THRESHOLD_PX: 200,
      AUTO_ALIGN_MIN_THRESHOLD_PX: 5,
      activeLayerEdges: [],
      activeLayerGroups: [],
      activeLayerNodes: nodes,
      autoAlignNodeLayoutUnits,
      buildCanvasLayoutUnits: vi.fn(() => layoutUnits),
      canvasBounds: { width: 800, height: 600 },
      clampNumber: (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value)),
      commitLayoutNodePositions,
      edges: [],
      editModeRouteRenderOptions: { preserveManualRouteDisplay: true },
      isCanvasNodeMovable: () => true,
      nodes,
      readjustActiveLayerBusEndpointRoutes: vi.fn(() => 0),
      requireEditMode: () => true,
      routedEdges: [],
      writeOperationLog
    } as any)();

    expect(prompt).toHaveBeenCalledWith("请输入自动对齐网格间距（5-200px）", "50");
    // 第三参数为网格间距,第四参数为「线路拐点/交叉不增加」约束上下文:
    // 候选判定用内置快速代理,画布路由器只作为终检(verifyRouteEdges)传进去。
    expect(autoAlignNodeLayoutUnits).toHaveBeenCalledWith(nodes, layoutUnits, 50, expect.objectContaining({
      edges: [],
      routedEdges: [],
      verifyRouteEdges: expect.any(Function),
      report: expect.objectContaining({ frozenUnitCount: 0, degraded: false, revertedByVerification: false })
    }));
    // 第三参数除「母线落点重算」外还带 `storedRouteDrops`(失效存档折线,与终检同口径),此处只钉关键项
    expect(commitLayoutNodePositions).toHaveBeenCalledWith(["node-1", "node-2"], arranged, expect.objectContaining({ readjustBusEndpoints: true }));
    expect(writeOperationLog).toHaveBeenCalledWith("自动对齐 2 个图元，网格间距 50px");
  });

  /**
   * 2026-09-21 用户截图回归(真实工程):负荷被吸到网格线后,负荷↔断路器那条线本该是直线,
   * 实际却出现一个下垂的 U 形凹口 —— 因为折线清理排在移动提交**之前**,
   * 移动提交内部的 `preserveConnectionEdgeRouteShape` 又把存档绕行按新端点重锚了回来。
   * 这里钉住顺序契约:先提交移动,再清理折线,且复用同一次撤销快照。
   *
   * 直接用真实案例的数据:它当前没有「失效存档折线」(30 条边全部笔直),于是按同样的口径造一条
   * 「端点有效、中间绕路」的存档折线,让编排层真的走到清理分支 —— 否则本用例会退化成空跑。
   */
  describe.skipIf(!projectAvailable)("stale stored polyline cleanup ordering", () => {
    test("commits the move first and cleans stale polylines after, in one undo unit", () => {
      const raw = JSON.parse(readFileSync(PROJECT_FILE, "utf8"));
      const project = raw.project ?? raw;
      const projectNodes = project.nodes as ModelNode[];
      const projectEdges = project.edges as Edge[];
      const bounds = {
        width: project.canvasWidth ?? 2400,
        height: project.canvasHeight ?? 1400
      };
      (globalThis as { window?: unknown }).window = { prompt: vi.fn(() => "50") };

      const routeEdges = (state: readonly ModelNode[], list: readonly Edge[]) =>
        routeEdgesForStoredRendering([...state], [...list], bounds, { preserveManualRouteDisplay: true });

      // 造一条「端点有效、中间绕路」的存档折线:两端锚点由路由器自己算,绕行确定性地多出拐点。
      // 必须挑一对「并排摆平就必然是直线」的设备,否则重算也不直,判定前提不成立。
      const findStraightPair = () => {
        for (const candidate of projectEdges) {
          const srcNode = projectNodes.find((node) => node.id === candidate.sourceId);
          const dstNode = projectNodes.find((node) => node.id === candidate.targetId);
          if (!srcNode || !dstNode) {
            continue;
          }
          const a = { ...srcNode, position: { x: 100, y: 100 } };
          const b = { ...dstNode, position: { x: 400, y: 100 } };
          const straight = routeEdges([a, b], [{ id: candidate.id, sourceId: a.id, targetId: b.id }])[0]?.points ?? [];
          if (straight.length === 2 && straight[0].y === straight[1].y) {
            return { template: candidate, src: a, dst: b, straight };
          }
        }
        throw new Error("该案例里找不到「按端口重算即直线」的边,无法构造失效存档折线");
      };
      const { template, src, dst, straight } = findStraightPair();
      const start = straight[0];
      const end = straight[1];
      const midLeft = Math.round((start.x + end.x) / 2) - 40;
      const midRight = Math.round((start.x + end.x) / 2) + 40;
      // 显式清掉模板带过来的存档几何,造一条真正「只有路由绕行、没有手动折线」的边。
      const staleEdge: Edge = {
        ...template,
        sourceId: src.id,
        targetId: dst.id,
        manualPoints: undefined,
        routePoints: [
          start,
          { x: midLeft, y: start.y },
          { x: midLeft, y: 20 },
          { x: midRight, y: 20 },
          { x: midRight, y: end.y },
          end
        ]
      };
      // 它必须被判定为「重算严格更简单」,否则清理分支不会触发 —— 此处先自证前提成立。
      expect(autoAlignStoredRouteDrops([src, dst], [staleEdge], new Set([staleEdge.id]), routeEdges)).toHaveLength(1);
      expect(routeEdges([src, dst], [autoAlignEdgeWithoutStoredRoute(staleEdge)])[0].points).toHaveLength(2);
      const nodes: ModelNode[] = [src, dst];
      const edges: Edge[] = [staleEdge];

      // 设备不动,只清理这条失效存档折线:走的是 `movedCount === 0` 的清理分支,
      // 几何与构造时完全一致,判定稳定可复现。
      const arranged = nodes;
      const expectedDropIds = autoAlignStoredRouteDrops(
        arranged,
        edges,
        new Set(edges.map((edge) => edge.id)),
        routeEdges
      )
        .map((drop) => drop.edgeId)
        .sort();
      expect(expectedDropIds).toEqual([staleEdge.id]);

      const order: string[] = [];
      const commitLayoutNodePositions = vi.fn((_ids: string[], _arranged: unknown, _options?: unknown) => {
        order.push("commit");
        return 0;
      });
      const cleanupStaleConnectionRoutes = vi.fn((_drops?: unknown, _options?: unknown) => {
        order.push("cleanup");
        return expectedDropIds.length;
      });
      const writeOperationLog = vi.fn();

      createAutoAlignCanvasGraphics({
        AUTO_ALIGN_DEFAULT_THRESHOLD_PX: 50,
        AUTO_ALIGN_MAX_THRESHOLD_PX: 200,
        AUTO_ALIGN_MIN_THRESHOLD_PX: 5,
        activeLayerEdges: edges,
        activeLayerGroups: [],
        activeLayerNodes: nodes,
        autoAlignNodeLayoutUnits: vi.fn(() => arranged),
        buildCanvasLayoutUnits: vi.fn(() => nodes.map((node) => ({ id: `node:${node.id}`, nodeIds: [node.id] }))),
        canvasBounds: bounds,
        clampNumber: (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value)),
        cleanupStaleConnectionRoutes,
        commitLayoutNodePositions,
        edges,
        editModeRouteRenderOptions: { preserveManualRouteDisplay: true },
        isCanvasNodeMovable: () => true,
        nodes,
        readjustActiveLayerBusEndpointRoutes: vi.fn(() => 0),
        requireEditMode: () => true,
        routedEdges: [],
        writeOperationLog
      } as any)();

      // 折线清理必须发生在**移动提交之后**:前面 commit、后面 cleanup。
      // 若把它并进移动提交,内部的 `preserveConnectionEdgeRouteShape` 会把存档绕行按新端点重锚,
      // 刚清掉的直线又被长成 U 形凹口 —— 正是用户截图里的那个下垂尖角。
      expect(order).toEqual(["commit", "cleanup"]);
      expect(commitLayoutNodePositions).toHaveBeenCalledWith(
        expect.any(Array),
        arranged,
        expect.objectContaining({ readjustBusEndpoints: true, storedRouteDropIds: expectedDropIds })
      );
      // 没有真实移动 → 清理自己成一次撤销单元(不能复用不存在的移动快照)
      expect(cleanupStaleConnectionRoutes.mock.calls[0][0]).toHaveLength(1);
      expect(cleanupStaleConnectionRoutes.mock.calls[0][1]).toEqual({ skipUndoSnapshot: false });
    });
  });
});
