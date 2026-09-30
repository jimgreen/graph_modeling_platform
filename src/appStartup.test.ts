// appStartup.ts 的启动闸门。
//
// 这个模块只有 25 行，但它是**空间隔离 S2 的入口**：App 的模型/配色/量测状态在渲染期
// 同步从 localStorage 播种，所以「切空间后清浏览器缓存」必须发生在 createRoot 之前。
// 它错的方式也很安静 —— 取不到空间列表时**故意不阻断启动**（白屏比「这次不校验」更坏），
// 但「清缓存失败」必须让用户看见（静默的失败比失败本身更坏，S2 就不设防了）。
// 这两条相反的策略各自只在一条 catch 分支上，此前没有任何测试守着它们。
//
// 本文件覆盖全部三条路径 + 两条边界（showGlobalMessage 未安装、seedSpaces 抛错）。

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// 桩要能在 import 之前建好：appStartup 在模块顶层 import 这两个模块。
const fetchSpacesMock = vi.hoisted(() => vi.fn());
const seedSpacesMock = vi.hoisted(() => vi.fn());
const reconcileMock = vi.hoisted(() => vi.fn());

vi.mock("./spaceClient", () => ({
  fetchSpaces: fetchSpacesMock,
  seedSpaces: seedSpacesMock
}));
vi.mock("./spaceCache", () => ({
  reconcileSpaceCacheOwnership: reconcileMock
}));

import { runStartupGate } from "./appStartup";

const SPACES = { spaces: [{ id: "w1", name: "工作空间一" }], current: "w1" };

let originalShowGlobalMessage: unknown;

beforeEach(() => {
  fetchSpacesMock.mockReset();
  seedSpacesMock.mockReset();
  reconcileMock.mockReset();
  fetchSpacesMock.mockResolvedValue(SPACES);
  seedSpacesMock.mockImplementation(() => {});
  reconcileMock.mockResolvedValue(undefined);
  originalShowGlobalMessage = (globalThis as any).showGlobalMessage;
  (globalThis as any).showGlobalMessage = vi.fn();
});

afterEach(() => {
  (globalThis as any).showGlobalMessage = originalShowGlobalMessage;
});

const notified = () => (globalThis as any).showGlobalMessage as ReturnType<typeof vi.fn>;

describe("runStartupGate 成功路径", () => {
  test("取回空间列表后播种给 App 的首次 refreshSpaces，并按当前空间清缓存", async () => {
    await runStartupGate();

    expect(fetchSpacesMock).toHaveBeenCalledTimes(1);
    // 播种的是同一次请求的结果：App 挂载时不必再拉第二遍
    expect(seedSpacesMock).toHaveBeenCalledTimes(1);
    expect(seedSpacesMock).toHaveBeenCalledWith(SPACES);
    // 清缓存按**后端判定的当前空间**，不是按 Cookie 里那个可能是旧值的
    expect(reconcileMock).toHaveBeenCalledTimes(1);
    expect(reconcileMock).toHaveBeenCalledWith(SPACES.current);
    expect(notified()).not.toHaveBeenCalled();
  });

  test("播种先于清缓存：清缓存删掉的就是刚被播下去的那批", async () => {
    // 反了的话，App 挂载时的首次 refreshSpaces 会把刚清掉的键再写回来
    const seq: string[] = [];
    seedSpacesMock.mockImplementation(() => {
      seq.push("seed");
    });
    reconcileMock.mockImplementation(() => {
      seq.push("reconcile");
    });
    await runStartupGate();
    expect(seq).toEqual(["seed", "reconcile"]);
  });

  test("后端返回的 spaces 列表原样传递，不在这里裁剪或补默认值", async () => {
    // 这个闸门只负责「拿列表 + 播种 + 清缓存」；裁剪列表是 seedSpaces 自己的事
    const odd = { spaces: [], current: "" };
    fetchSpacesMock.mockResolvedValue(odd);
    await runStartupGate();
    expect(seedSpacesMock).toHaveBeenCalledWith(odd);
    expect(reconcileMock).toHaveBeenCalledWith("");
  });
});

describe("runStartupGate 清缓存失败", () => {
  test("reconcile 抛错时提示用户，且**不**把异常外抛", async () => {
    // 外抛的话 createRoot 之前就 reject，整个应用起不来 —— 恰恰是最需要它起来的场合
    reconcileMock.mockRejectedValue(new Error("IDB 不可用"));
    await expect(runStartupGate()).resolves.toBeUndefined();
    expect(notified()).toHaveBeenCalledTimes(1);
    expect(String(notified().mock.calls[0][0])).toContain("未做空间校验");
  });

  test("showGlobalMessage 未安装时仍不外抛，但这条路上用户也拿不到任何提示", async () => {
    // 独立运行时 main.tsx 尚未装全局消息，qiankun 路径同理。
    //
    // 变异验证实测：把源码里的 `showGlobalMessage?.(` 去掉，本条**一样绿**。
    // 原因是内层 catch 里抛出的 TypeError 仍然落在**外层** try 的块内，
    // 被外层 catch 静默接住 —— 保证 resolve 的是外层 catch，不是 `?.`。
    // 代价如实记录：走到这条路径时既不报错也不提示，正是源码注释担心的那种静默失败。
    (globalThis as any).showGlobalMessage = undefined;
    reconcileMock.mockRejectedValue(new Error("IDB 不可用"));
    await expect(runStartupGate()).resolves.toBeUndefined();
  });

  test("reconcile 同步抛错（而非返回 rejected promise）同样被接住", async () => {
    // catch 包的是 await，await 一个同步抛的函数同样会跳进 catch
    reconcileMock.mockImplementation(() => {
      throw new Error("boom");
    });
    await expect(runStartupGate()).resolves.toBeUndefined();
    expect(notified()).toHaveBeenCalledTimes(1);
  });

  test("清缓存失败不影响已完成的播种：App 照常按列表读空间", async () => {
    // 两件事互相独立：缓存没清掉只是「这次不校验」，列表本身是好的
    reconcileMock.mockRejectedValue(new Error("IDB 不可用"));
    await runStartupGate();
    expect(seedSpacesMock).toHaveBeenCalledWith(SPACES);
  });
});

describe("runStartupGate 取列表失败", () => {
  test("后端未起 / 离线时不阻断启动，也不打扰用户", async () => {
    // 白屏比「这次不校验」更坏。静默是这里**正确**的策略，与上一组相反。
    fetchSpacesMock.mockRejectedValue(new Error("fetch failed"));
    await expect(runStartupGate()).resolves.toBeUndefined();
    expect(notified()).not.toHaveBeenCalled();
  });

  test("取不到列表时不再播种、不清缓存", async () => {
    // 没拿到「后端判定的当前空间」就没法按空间清缓存；拿旧值清反而会删错
    fetchSpacesMock.mockRejectedValue(new Error("fetch failed"));
    await runStartupGate();
    expect(seedSpacesMock).not.toHaveBeenCalled();
    expect(reconcileMock).not.toHaveBeenCalled();
  });

  test("seedSpaces 抛错也被外层 catch 接住，不外抛", async () => {
    // 现状记录：此时 reconcile **不会**执行，等于这次完全没做空间校验，且不提示。
    // 本测试只钉住「不外抛、不提示」这个可观测契约 —— reconcile 被跳过是当前实现的
    // 既有缺口（与 reconcile 失败时的处理不对称），不在这里替它定语义。
    seedSpacesMock.mockImplementation(() => {
      throw new Error("seed 失败");
    });
    await expect(runStartupGate()).resolves.toBeUndefined();
    expect(notified()).not.toHaveBeenCalled();
  });
});
