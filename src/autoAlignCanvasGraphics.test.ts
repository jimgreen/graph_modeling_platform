import { existsSync, readFileSync } from "node:fs";
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { autoAlignEdgeWithoutStoredRoute, autoAlignStoredRouteDrops } from "./selectionActions";
import { routeEdgesForStoredRendering, type Edge, type ModelNode } from "./model";

/**
 * 自动对齐 Worker 计划的可编程替身。
 *
 * ## 为什么这个替身**不能**用顶层 `vi.mock` + 顶层静态 import 生产模块（这正是本文件曾经的写法）
 *
 * ESM 的依赖绑定发生在**模块被求值的那一刻**，而不是调用那一刻。`isolate: false` 时模块注册表在
 * 整个 worker 内共享，于是「谁第一个 import `appProjectCanvasFactories`」就决定了它内部 import 到的
 * `autoAlignClient` 是**谁的替身**。本文件若不是第一个（实测排在 `appProjectCanvasFactories.test.ts`
 * 之后时必然如此 —— 那个文件也 `vi.mock` 了同一个模块，且用的是 `importOriginal` + 展开的替身），
 * 生产模块早已在缓存里、里面绑的是**上一个文件**的 `runAutoAlignPlanInWorker`：
 *   - 那份替身有自己的 spy，于是本文件的 `runPlan` 调用数恒为 **0**，报
 *     `expected "spy" to be called with ... / Number of calls: 0`；
 *   - 症状很像「数值不对」，其实是**函数身份不对** —— 注意同一用例里 `window.prompt` 的断言仍然通过，
 *     因为它排在 `runAutoAlignPlanInWorker` 之前。别被这个误导去查参数值。
 *
 * 顶层 `vi.mock` 救不了场，两个原因缺一不可地都堵着：它只改**本文件自己的** mock 注册表
 * （vitest 的 MockerRegistry 按 `state.filepath` 分桶，`getSuiteFilepath()` 为 key），
 * 既到不了别的文件，也**不会让已缓存的生产模块重新求值**。两种模式症状一样，只是共享注册表下
 * 先加载的文件赢 —— 于是「红哪几个」每次都不一样。
 *
 * ## 可靠修法
 * `vi.resetModules()`（清模块缓存）+ `vi.doMock()`（改注册表）之后**动态 import** 生产模块，
 * 让它在替身就位之后重新求值。两者缺一不可：只 doMock 仍然命中旧模块；只 resetModules 替身还
 * 没注册进注册表。见下方 `loadFactoriesWithMockedDeps`。
 *
 * 注意此处用普通 `const` 而不是 `vi.hoisted`：`doMock` 的工厂是在**模块被请求时**（即下面
 * `beforeEach` 里那次动态 import）才被调用的，那早已在本模块顶层求值之后，所以不存在提升时序问题。
 */
const runPlan = vi.fn();

type CanvasFactories = typeof import("./appExtracted/appProjectCanvasFactories");

let factoriesWithMockedDeps: CanvasFactories | undefined;

// 同一个 worker 内不会有别的文件插进本文件的用例中间（顺序是文件粒度的），所以第一次加载后即可
// 复用 —— 否则每条用例都要把 appProjectCanvasFactories 的整张依赖图重新求值一遍。
const loadFactoriesWithMockedDeps = async (): Promise<CanvasFactories> => {
  if (factoriesWithMockedDeps) return factoriesWithMockedDeps;
  vi.resetModules();
  vi.doMock("./autoAlign/autoAlignClient", () => ({
    runAutoAlignPlanInWorker: runPlan
  }));
  factoriesWithMockedDeps = await import("./appExtracted/appProjectCanvasFactories");
  return factoriesWithMockedDeps;
};

// 本文件在共享注册表下会把「绑着我们替身」的 appProjectCanvasFactories 留在 worker 的模块缓存里，
// 后面排到的文件会继承它（`runAutoAlignPlanInWorker` 变成一个不属于它们的 vi.fn()，真实现被整个
// 遮住）。离开本文件时精确清一次缓存，下一个文件拿到的是干净求值的模块 —— 这样本文件就不会
// 变成**新的**肇事者。用 `vi.resetModules()`（只动 worker 模块缓存）而不是
// `vi.restoreAllMocks()` / `vi.unstubAllGlobals()` 那类全注册表范围的清理。
// 这只保证「不污染别人」，救不了别的文件本身：它们各自同样受制于「谁先加载生产模块」，
// 要各自改成 doMock + 动态 import（模板见 src/appProjectCanvasFactories.test.ts 文件头）。
afterAll(() => {
  factoriesWithMockedDeps = undefined;
  vi.resetModules();
});

/**
 * 本文件有两个用例：第一个是纯内存用例（自己造节点/边），任何环境都跑。
 * 第二个用例要读真实标准案例当输入，依赖下面这个文件。
 *
 * **为什么这个文件必须条件跳过（环境依赖，不是断言过时、也不是所依赖的 bug 已修）：**
 * `data/` 整个目录被 `.gitignore` 第 3 行忽略，`git ls-files -- data/**` 返回 0 个文件
 * —— 也就是说多能流.json 是本地运行时数据，**从未进过版本库**。
 * 于是全新 clone / CI 检出 / 换机器的检出里都不存在该文件，
 * 无条件执行会在 `readFileSync`（本文件下方 `stale stored polyline cleanup ordering` 那条用例体内，
 * 惰性求值、只在用例跑起来时才读）直接抛错，
 * 把整个套件拖红 —— 那不是被测代码有问题，是夹具缺失。
 * 所以按仓库既有约定用 `describe.skipIf`（见 autoAlignLineQuality.test.ts 等同款用法）守住。
 *
 * 文件在位时它**是真跑的、且通过**（本机实测 2 passed，无 skip）；
 * 不在位时它安静跳过（换 cwd 实测 1 passed | 1 skipped）。
 * 一旦有人把这个用例改成无条件执行、或把 skip 换成 try/catch 吞掉 readFileSync 的异常，
 * 都会让「全新检出」从「安静跳过」退化成「套件报错」，故在此写明理由。
 */
const PROJECT_FILE = "data/schemes/files/标准案例/子方案/多能流.json";
const projectAvailable = existsSync(PROJECT_FILE);

describe("canvas automatic grid alignment", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;

  beforeEach(() => {
    // 精确到这一个 spy 的重置：保证每条用例的计划结果都来自它自己那次 mockResolvedValue，
    // 而不是上一条用例残留的实现（跨用例串味与跨文件串味是同一类病，只是范围更小）。
    runPlan.mockReset();
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  test("uses the configured value as grid spacing and reports the grid alignment", async () => {
    const prompt = vi.fn(() => "50");
    (globalThis as { window?: unknown }).window = { prompt };
    const nodes = [
      { id: "node-1", kind: "device", position: { x: 112, y: 113 } },
      { id: "node-2", kind: "device", position: { x: 118, y: 119 } }
    ];
    const arranged = nodes.map((node, index) => ({
      ...node,
      position: { x: 100 + index * 50, y: 100 }
    }));
    runPlan.mockResolvedValue({
      arranged,
      nodeIds: ["node-1", "node-2"],
      layoutUnitCount: 2,
      storedRouteDrops: [],
      qualityReport: {
        verifiedCandidateCount: 0,
        bendRejectedCount: 0,
        crossingRejectedCount: 0,
        frozenUnitCount: 0,
        degraded: false,
        revertedByVerification: false
      }
    } as any);
    const commitLayoutNodePositions = vi.fn(() => 2);
    const writeOperationLog = vi.fn();

    const { createAutoAlignCanvasGraphics } = await loadFactoriesWithMockedDeps();
    await createAutoAlignCanvasGraphics({
      AUTO_ALIGN_DEFAULT_THRESHOLD_PX: 50,
      AUTO_ALIGN_MAX_THRESHOLD_PX: 200,
      AUTO_ALIGN_MIN_THRESHOLD_PX: 5,
      activeLayerEdges: [],
      activeLayerGroups: [],
      activeLayerNodes: nodes,
      canvasBounds: { width: 800, height: 600 },
      commitLayoutNodePositions,
      edges: [],
      editModeRouteRenderOptions: { preserveManualRouteDisplay: true },
      nodes,
      readjustActiveLayerBusEndpointRoutes: vi.fn(() => 0),
      requireEditMode: () => true,
      routedEdges: [],
      writeOperationLog
    } as any)();

    expect(prompt).toHaveBeenCalledWith("请输入自动对齐网格间距（5-200px）", "50");
    expect(runPlan).toHaveBeenCalledWith(expect.objectContaining({
      nodes,
      activeLayerNodes: nodes,
      gridSpacing: 50,
      edges: [],
      routedEdges: []
    }));
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
  // 显式条件跳过：见上方 PROJECT_FILE 处的说明 —— 夹具 `data/schemes/.../多能流.json`
  // 属于被 .gitignore 忽略的本地运行时数据（data/ 下 0 个受版本控制的文件），
  // 全新检出里不存在，故用 skipIf 守住而非无条件执行。
  describe.skipIf(!projectAvailable)("stale stored polyline cleanup ordering", () => {
    test("commits the move first and cleans stale polylines after, in one undo unit", async () => {
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
      const expectedDrops = autoAlignStoredRouteDrops(
        arranged,
        edges,
        new Set(edges.map((edge) => edge.id)),
        routeEdges
      );
      const expectedDropIds = expectedDrops.map((drop) => drop.edgeId).sort();
      expect(expectedDropIds).toEqual([staleEdge.id]);
      runPlan.mockResolvedValue({
        arranged,
        nodeIds: nodes.map((node) => node.id),
        layoutUnitCount: 2,
        storedRouteDrops: expectedDrops,
        qualityReport: {
          verifiedCandidateCount: 0,
          bendRejectedCount: 0,
          crossingRejectedCount: 0,
          frozenUnitCount: 0,
          degraded: false,
          revertedByVerification: false
        }
      } as any);

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

      const { createAutoAlignCanvasGraphics } = await loadFactoriesWithMockedDeps();
      await createAutoAlignCanvasGraphics({
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
