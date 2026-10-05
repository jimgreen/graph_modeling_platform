// mount / unmount 之间的竞态：mount 期间宿主把它 unmount 掉了，mount 不能"复活"渲染。
//
// 这一层和 qiankunLifecycle.test.tsx 是**互补的两半**，那份覆盖 mount 的正常路径
// （顺序、容器选择、root 复用），这里只钉一个场景：**mount 的两次 await 期间 unmount 抢跑**。
//
// 为什么必须钉死：qiankun 的 mount/unmount 不互斥，宿主切走路由时不必等 mount 的
// promise 落地。若 mount 在 await 之后不检查就跑完 createRoot + render，子应用会
// 挂到一个宿主已经摘掉的容器上 —— 界面上看不见（容器不在文档里），但 React 树已经
// 建起来了：定时器、WS、EventSource 全都挂上了，而且**再也不会有人来 unmount 它们**。
// 这种泄漏不报错、不白屏，只在用户来回切路由时慢慢堆积，最难查。
//
// 本仓 vitest 是 node 环境且没装 jsdom，所以 document / window / createRoot
// 全部手搓最小桩；App 与 antd 打桩掉，本模块不测它们的渲染。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const h = vi.hoisted(() => {
  const order: string[] = [];
  return {
    order,
    bindUserSpaceToSession: vi.fn(),
    runStartupGate: vi.fn(),
    createRoot: vi.fn(),
    render: vi.fn(),
    unmount: vi.fn()
  };
});

vi.mock("react-dom/client", () => ({ createRoot: h.createRoot }));
vi.mock("./appStartup", () => ({ runStartupGate: h.runStartupGate }));
vi.mock("./qiankunUserSpace", () => ({ bindUserSpaceToSession: h.bindUserSpaceToSession }));
vi.mock("./App", () => ({ App: () => null }));
vi.mock("antd", () => ({ ConfigProvider: ({ children }: { children: unknown }) => children }));

type Lifecycle = typeof import("./qiankunLifecycle");

/** node 环境没有 document/window：只桩出本模块真正用到的那两个方法 */
function installDom(rootElement: unknown) {
  (globalThis as Record<string, unknown>).window = {};
  (globalThis as Record<string, unknown>).document = {
    getElementById: (id: string) => (id === "root" ? rootElement : null)
  };
}

/** 排空微任务：一次宏任务 tick 之后，链式 await 的所有后续 continuation 都已跑完 */
function drain() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

const mountElement = { id: "root" };
let lifecycle: Lifecycle;

beforeEach(async () => {
  vi.resetModules();
  h.order.length = 0;
  // mockReset 而非 mockClear：下面有用例会换掉实现（如抛错那条），只清调用次数的话
  // 实现会漏到下一条用例里去。
  h.bindUserSpaceToSession.mockReset();
  h.bindUserSpaceToSession.mockImplementation(async (user?: string) => {
    h.order.push(`bind:${String(user)}`);
  });
  h.runStartupGate.mockReset();
  h.runStartupGate.mockImplementation(async () => {
    h.order.push("gate");
  });
  h.createRoot.mockReset();
  h.render.mockReset();
  h.unmount.mockReset();
  h.createRoot.mockImplementation(() => ({ render: h.render, unmount: h.unmount }));
  installDom(mountElement);
  lifecycle = await import("./qiankunLifecycle");
});

// 逐键精确还原：这个文件往共享 globalThis 上装了 window / document，漏删会顺着
// 文件执行顺序漏给别的测试文件（仓内 commit 0007e864 就是为「真弹窗函数泄漏到
// 共享 globalThis」专门堵的）。这里不用 vi.stubGlobal，因为它还原的是"整份快照"
// 而不是"这两个键"，同批并行 agent 装的其他全局会被一并抹掉。
afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).document;
  vi.resetModules();
});

describe("mount 在 await 期间被 unmount 抢跑", () => {
  test("核心：mount 还没落地就被 unmount，createRoot 与 render 一次都不许发生", async () => {
    // 不 await：此刻 mount 停在第一次 await（bindUserSpaceToSession）上
    const pending = lifecycle.mount({ user: "alice" });

    await lifecycle.unmount({});
    await drain();

    // 挂起的那一轮自行了结（守卫命中 → 直接 return），不留未处理的 rejection
    await expect(pending).resolves.toBeUndefined();

    // 反了这条断言就不是守卫生效：容器还在（document 仍能取到 #root），
    // 去掉守卫后 mount 会照旧走到 renderApp → createRoot 被调 1 次。
    expect(h.createRoot).not.toHaveBeenCalled();
    expect(h.render).not.toHaveBeenCalled();

    // 顺带证明挂起点是真的：两次 await 都跑完了才被拦下，不是提前 return 蒙混过关。
    // 这条断言反过来锁住"守卫位置"——若守卫被挪到 await 之前，order 就会空掉。
    expect(h.order).toEqual(["bind:alice", "gate"]);
    // unmount 时 root 还是 null，所以一次 root.unmount 都不该发生
    expect(h.unmount).not.toHaveBeenCalled();
  });

  test("回归：不调 unmount 的正常 mount 照旧渲染一次", async () => {
    await lifecycle.mount({ user: "alice" });

    expect(h.createRoot).toHaveBeenCalledTimes(1);
    expect(h.render).toHaveBeenCalledTimes(1);
  });

  test("回归：mount → unmount → mount，第二次 mount 仍要渲染（守卫不能连坐后续挂载）", async () => {
    await lifecycle.mount({});
    await lifecycle.unmount({});
    await lifecycle.mount({});

    expect(h.createRoot).toHaveBeenCalledTimes(2);
    expect(h.render).toHaveBeenCalledTimes(2);
    // 中间那次 unmount 仍然正常卸载了第一棵树
    expect(h.unmount).toHaveBeenCalledTimes(1);
  });

  test("回归：unmount 连调两次不抛、且只真正卸载一次（幂等）", async () => {
    await lifecycle.mount({});

    await expect(lifecycle.unmount({})).resolves.toBeUndefined();
    await expect(lifecycle.unmount({})).resolves.toBeUndefined();

    expect(h.unmount).toHaveBeenCalledTimes(1);
    expect(h.render).toHaveBeenCalledTimes(1);
  });

  test("回归：从未 mount 就连调两次 unmount，也是空操作", async () => {
    await expect(lifecycle.unmount({})).resolves.toBeUndefined();
    await expect(lifecycle.unmount({})).resolves.toBeUndefined();

    expect(h.unmount).not.toHaveBeenCalled();
    expect(h.createRoot).not.toHaveBeenCalled();
  });

  // 抛错路径的真实形态（先探针跑出来再写死）：mount 没有 try/catch，两次 await 里任一
  // 抛出都直接让 mount 的 promise reject，宿主能看到失败，**没有**渲染半棵 React 树。
  // 这里把 reject 钉住，免得日后有人"顺手加个 try/catch 兜住"，把一个响亮的启动失败
  // 变成一次静默的白屏。
  test("bind 抛错：mount 整个 reject，闸门不再跑，也不渲染", async () => {
    const boom = new Error("bind boom");
    h.bindUserSpaceToSession.mockRejectedValueOnce(boom);

    await expect(lifecycle.mount({ user: "alice" })).rejects.toBe(boom);

    // 绑空间是第一条 await，它抛了就轮不到闸门 —— 断言顺序契约没有被"失败也往下走"破坏
    expect(h.order).toEqual([]);
    expect(h.runStartupGate).not.toHaveBeenCalled();
    expect(h.createRoot).not.toHaveBeenCalled();
    expect(h.render).not.toHaveBeenCalled();
  });

  test("闸门抛错：mount 整个 reject，空间已绑上，但仍不渲染", async () => {
    const boom = new Error("gate boom");
    h.runStartupGate.mockRejectedValueOnce(boom);

    await expect(lifecycle.mount({ user: "alice" })).rejects.toBe(boom);

    expect(h.order).toEqual(["bind:alice"]);
    expect(h.createRoot).not.toHaveBeenCalled();
    expect(h.render).not.toHaveBeenCalled();
  });
});