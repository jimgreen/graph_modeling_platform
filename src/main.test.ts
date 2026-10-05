// main.tsx 独立运行时的入口行为（33 行，但它是空间隔离 S2 在浏览器侧**唯一**的触发点 ——
// qiankun 路径由 qiankunLifecycle.mount() 触发，根本不走这里）。
//
// 本文件刻意走**行为测试**而不是源码文本守卫。src/spaceCache.test.ts 已有一条源码级顺序守卫
// （await runStartupGate 早于 createRoot），本文件补的是它看不见的那一半：
//   · 顶层那个 if 的两个分支：qiankun 为真 → 一个 DOM 都不碰；为假 / 键缺失 → 走渲染路径。
//     源码文本断言看不见「这个 if 到底怎么判」，只看得见那行字还在。
//   · ConfigProvider 真正收到的 theme 值。源码里是内联对象字面量，文本断言只能比对字符，
//     变了形状（比如把 components 提到 token 里）文本断言照样绿。
//   · await 是不是**真的** await 了。文本守卫只要求 `await runStartupGate(` 这个 token 存在；
//     把它换成 `await Promise.resolve(runStartupGate())`（渲染提前）文本一样绿。
//   · window 不存在时的真实行为（见「window 不存在」那组，现状是抛 ReferenceError ——
//     这是**缺口**，此处只钉住现状，不改生产代码）。
//
// ⚠ node 环境**无 jsdom**，window / document 替身自己搭，且**逐键精确还原**。
//   还原不能只靠 vi.unstubAllGlobals()：那是「只还原本文件 stub 过的键」，
//   而 globalMessage.ts:163-165 在**模块加载期**把真弹窗写上 window —— 若 window 与
//   globalThis 是同一对象，那三个键会永久留在共享全局里，谁都装不回来
//   （commit 0007e864 记录的踩坑）。这里用一个**独立对象**当 window，从根上断掉这条路。

import { afterAll, afterEach, describe, expect, test, vi } from "vitest";

// 替身必须能在 main.tsx 被 import 之前就位 —— 它在模块顶层就跑那个 if 了。
const createRootMock = vi.hoisted(() => vi.fn());
const renderMock = vi.hoisted(() => vi.fn());
const unmountMock = vi.hoisted(() => vi.fn());
const runStartupGateMock = vi.hoisted(() => vi.fn());
const configProviderStub = vi.hoisted(() => vi.fn());
const appStub = vi.hoisted(() => vi.fn());
const bootstrapStub = vi.hoisted(() => vi.fn());
const mountStub = vi.hoisted(() => vi.fn());
const unmountLifecycleStub = vi.hoisted(() => vi.fn());

vi.mock("react-dom/client", () => ({ createRoot: createRootMock }));
// theme 是**内联对象字面量**（不从任何模块导入），所以没有可 stub 的主题模块。
// 能替的是 ConfigProvider 本身：替身身份固定，render 收到的那个元素的 type 必须就是它。
vi.mock("antd", () => ({ ConfigProvider: configProviderStub }));
vi.mock("./appStartup", () => ({ runStartupGate: runStartupGateMock }));
vi.mock("./App", () => ({ App: appStub }));
// main.tsx 只对 globalMessage 做副作用导入（挂 window 弹窗）。替成空模块，
// 免得真弹窗函数被写上替身 window（虽然替身是独立对象，这里是第二重保险）。
vi.mock("./globalMessage", () => ({}));
vi.mock("./qiankunLifecycle", () => ({
  bootstrap: bootstrapStub,
  mount: mountStub,
  unmount: unmountLifecycleStub
}));

// ---- globalThis 替身：逐键快照 / 逐键还原 -------------------------------------
type SavedGlobal = { existed: boolean; value: unknown };
const savedGlobals = new Map<string, SavedGlobal>();
const MANAGED_KEYS = ["window", "document"] as const;

for (const key of MANAGED_KEYS) {
  savedGlobals.set(key, {
    existed: key in (globalThis as Record<string, unknown>),
    value: (globalThis as Record<string, unknown>)[key]
  });
}

function restoreGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  for (const [key, saved] of savedGlobals) {
    if (saved.existed) g[key] = saved.value;
    else delete g[key];
  }
}

afterEach(restoreGlobals);
afterAll(restoreGlobals);

/** 独立对象当 window —— 绝不用 globalThis，否则真弹窗会漏进共享全局 */
function setWindow(win: Record<string, unknown> | null): void {
  const g = globalThis as Record<string, unknown>;
  if (win === null) delete g.window;
  else g.window = win;
}

const FAKE_ROOT_ELEMENT = { nodeName: "DIV", id: "root" };

function setDocument(): { getElementById: ReturnType<typeof vi.fn> } {
  const getElementById = vi.fn((id: string) => (id === "root" ? FAKE_ROOT_ELEMENT : null));
  (globalThis as Record<string, unknown>).document = { getElementById };
  return { getElementById };
}

/** main.tsx 是 void startStandaloneApp()，返回的 promise 没人接 —— 只能靠事件循环自己跑完 */
async function flushAsyncWork(): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

type MainModule = {
  bootstrap: typeof bootstrapStub;
  mount: typeof mountStub;
  unmount: typeof unmountLifecycleStub;
};

/** 清模块缓存 + 清调用记录，再动态 import 入口，让顶层的 if 重新求值一次 */
async function loadEntry(): Promise<MainModule> {
  vi.resetModules();
  createRootMock.mockReset();
  renderMock.mockReset();
  unmountMock.mockReset();
  runStartupGateMock.mockReset();
  runStartupGateMock.mockResolvedValue(undefined);
  createRootMock.mockImplementation(() => ({
    render: renderMock,
    unmount: unmountMock
  }));
  return (await import("./main")) as unknown as MainModule;
}

// ---- 非 qiankun 场景：整套渲染路径的基线 --------------------------------------
function armStandalone(): void {
  setWindow({});
  setDocument();
}

describe("入口在非 qiankun 下走完整渲染路径", () => {
  test("qiankun 标记为假时渲染：闸门跑一次、createRoot 挂到 root 节点、render 恰好一次", async () => {
    armStandalone();
    const doc = (globalThis as any).document;

    await loadEntry();
    await flushAsyncWork();

    expect(runStartupGateMock).toHaveBeenCalledTimes(1);
    expect(createRootMock).toHaveBeenCalledTimes(1);
    // 容器是从 document 里查出来的 #root，不是 undefined（生产代码上有个 ! 非空断言，
    // 这里把「查到的东西」钉住，防止将来改成查别的 id 还一路绿）
    expect(doc.getElementById).toHaveBeenCalledWith("root");
    expect(createRootMock.mock.calls[0][0]).toBe(FAKE_ROOT_ELEMENT);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  test("qiankun 标记缺失（键根本不在 window 上）与显式为假同路：都渲染", async () => {
    // 两种写法在本文件里分别装一次替身再各自 import，证明它们不是靠某个兜底默认值
    // 偶然走到同一条路上，而是 if 的条件本身都为真。
    const falsyValues: Array<[string, Record<string, unknown>]> = [
      ["键缺失", {}],
      ["显式 false", { __POWERED_BY_QIANKUN__: false }],
      ["显式 undefined", { __POWERED_BY_QIANKUN__: undefined }],
      ["显式空串", { __POWERED_BY_QIANKUN__: "" }]
    ];

    for (const [label, win] of falsyValues) {
      createRootMock.mockClear();
      renderMock.mockClear();
      runStartupGateMock.mockClear();
      setWindow(win);
      setDocument();

      vi.resetModules();
      await import("./main");
      await flushAsyncWork();

      expect(createRootMock, `${label} 应当渲染`).toHaveBeenCalledTimes(1);
      expect(renderMock, `${label} 应当渲染`).toHaveBeenCalledTimes(1);
      expect(runStartupGateMock, `${label} 应当先过闸门`).toHaveBeenCalledTimes(1);
    }
  });

  test("ConfigProvider 收到的主题是紧凑 + 小圆角 + Input 紧凑内边距", async () => {
    armStandalone();
    await loadEntry();
    await flushAsyncWork();

    expect(renderMock).toHaveBeenCalledTimes(1);
    const element = renderMock.mock.calls[0][0] as any;
    // type 必须是替身本身 —— 防止将来把 ConfigProvider 换成别的东西（比如塞一层 wrapper）
    expect(element.type).toBe(configProviderStub);
    expect(element.props.componentSize).toBe("small");
    expect(element.props.theme).toEqual({
      token: { borderRadius: 4 },
      components: { Input: { paddingInlineSM: 8, paddingBlockSM: 2 } }
    });
    // 逐层钉键集合：把 components 的条目并进 token 的话 toEqual 会红，但这条能顺带
    // 说出「多出来的键」到底在第几层。
    expect(Object.keys(element.props.theme)).toEqual(["token", "components"]);
    expect(Object.keys(element.props.theme.token)).toEqual(["borderRadius"]);
    expect(Object.keys(element.props.theme.components)).toEqual(["Input"]);
    expect(Object.keys(element.props.theme.components.Input)).toEqual([
      "paddingInlineSM",
      "paddingBlockSM"
    ]);
  });

  test("ConfigProvider 的唯一子节点是 App 组件本身", async () => {
    armStandalone();
    await loadEntry();
    await flushAsyncWork();

    const element = renderMock.mock.calls[0][0] as any;
    expect(element.props.children.type).toBe(appStub);
  });
});

// ---- qiankun 场景：顶层 if 的另一半 -------------------------------------------
describe("入口在 qiankun 下不渲染", () => {
  test("qiankun 标记为真时一个 DOM 都不碰：闸门不跑、createRoot 不跑", async () => {
    // 这不是优化而是正确性：见 main.tsx 顶部注释 —— 闸门会按旧 Cookie 的空间对齐缓存归属，
    // 抢先渲染的话用户一进来看到的是别人的数据。
    setWindow({ __POWERED_BY_QIANKUN__: true });
    setDocument();

    await loadEntry();
    await flushAsyncWork();

    expect(runStartupGateMock).not.toHaveBeenCalled();
    expect(createRootMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
  });

  test("标记为任意真值（含 qiankun 插件注入的对象）都不渲染", async () => {
    // 真值不止 true 一个：qiankun 插件注入的是个对象。只测 true 会漏掉
    // 「改成 === true 这类严格比较反而更安全」的误改 —— 那种误改恰好在 true 上是绿的。
    const truthyValues: Array<[string, unknown]> = [
      ["true", true],
      ["字符串", "1"],
      ["数字 1", 1],
      ["对象", { name: "graph-modeling-platform" }]
    ];

    for (const [label, flag] of truthyValues) {
      createRootMock.mockClear();
      renderMock.mockClear();
      runStartupGateMock.mockClear();
      setWindow({ __POWERED_BY_QIANKUN__: flag });
      setDocument();

      vi.resetModules();
      await import("./main");
      await flushAsyncWork();

      expect(createRootMock, `${label} 不应渲染`).not.toHaveBeenCalled();
      expect(renderMock, `${label} 不应渲染`).not.toHaveBeenCalled();
      expect(runStartupGateMock, `${label} 不应跑闸门`).not.toHaveBeenCalled();
    }
  });

  test("即便渲染被跳过，qiankun 生命周期三个导出仍照常转出给宿主调用", async () => {
    setWindow({ __POWERED_BY_QIANKUN__: true });
    setDocument();

    const entry = await loadEntry();
    await flushAsyncWork();

    expect(entry.bootstrap).toBe(bootstrapStub);
    expect(entry.mount).toBe(mountStub);
    expect(entry.unmount).toBe(unmountLifecycleStub);
    // 预条件自证：转出的是真函数，不是被转成了 undefined
    expect(typeof entry.mount).toBe("function");
  });
});

// ---- 启动闸门的推进语义 ------------------------------------------------------
describe("启动闸门与渲染的先后", () => {
  test("调用顺序是闸门 → createRoot → render，三步不串位", async () => {
    // 这是 spaceCache.test.ts 那条源码级顺序守卫的行为孪生：那边比字符位置，
    // 这边比真实调用序列。两条互补 —— 源码守卫能挡住「把 render 提到 await 之前」，
    // 行为守卫能挡住「await 换了别的东西但 token 还在」。
    const order: string[] = [];
    armStandalone();

    // 顺序记录器必须在入口求值**之前**装好，否则第一帧就过去了
    vi.resetModules();
    runStartupGateMock.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      order.push("gate");
    });
    createRootMock.mockImplementation(() => {
      order.push("createRoot");
      return { render: renderMock, unmount: unmountMock };
    });
    renderMock.mockImplementation(() => {
      order.push("render");
    });

    await import("./main");
    await flushAsyncWork();

    expect(order).toEqual(["gate", "createRoot", "render"]);
  });

  test("闸门未落定时不渲染：await 是真等，不是把 promise 甩出去就往下走", async () => {
    // 换句话说：闸门必须**完成**才轮到 createRoot。这条挡的是
    // 「createRoot(...).render(...) 挪到 await 之前 / 去掉 await」这类重构 ——
    // 源码文本守卫要求 await runStartupGate( 这个 token 在，但那两条路径 token 都还在。
    armStandalone();

    let releaseGate = () => {};
    // 顺序同 loadEntry：resetModules → 清记录 → 装替身 → 才 import。
    // 这里**不能**先 loadEntry 一次：那一次的渲染会把 createRoot 的记录污染掉。
    vi.resetModules();
    createRootMock.mockReset();
    renderMock.mockReset();
    unmountMock.mockReset();
    runStartupGateMock.mockReset();
    createRootMock.mockImplementation(() => ({
      render: renderMock,
      unmount: unmountMock
    }));
    runStartupGateMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseGate = () => resolve(undefined);
        })
    );

    await import("./main");
    await flushAsyncWork();

    expect(runStartupGateMock).toHaveBeenCalledTimes(1);
    // 闸门还挂着 —— 此时任何渲染都是错的：App 的模型/配色/量测状态在渲染期从
    // localStorage 同步播种，闸门要清的正是那些键。
    expect(createRootMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();

    releaseGate();
    await flushAsyncWork();

    expect(createRootMock).toHaveBeenCalledTimes(1);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});

// ---- window 不存在时的真实行为（现状记录，非期望） ----------------------------
describe("window 不存在时的现状", () => {
  test("window 未定义时 import 直接抛 ReferenceError，不静默继续", async () => {
    // ⚠ **这是缺口，不是期望行为。** `(window as any).__POWERED_BY_QIANKUN__` 读的是
    //   自由标识符 window，window 不存在时不会得到 undefined，而是 ReferenceError。
    //   生产上只在真实浏览器里跑，window 恒在，所以这个缺口今天不显形；但它意味着
    //   「任何非浏览器宿主（SSR / 预渲染 / 单测 import 入口）」都会在入口第一行就炸。
    //   按指令**不改它**，此处把现状钉住：哪天有人给它加 typeof 守卫，这条会红，
    //   那时需要补的是一条「缺失时不渲染也不抛」的断言，而不是删掉这一条。
    //   （空间隔离无关：真正的顺序守卫在 spaceCache.test.ts，本文件不依赖这条。）
    const g = globalThis as Record<string, unknown>;
    delete g.window;
    delete g.document;

    vi.resetModules();
    // 必须显式清记录：上一条用例已经把 createRoot 调过一次了，
    // 而 resetModules 只清模块注册表，不清 mock 的调用历史 —— 这是两件独立的事。
    createRootMock.mockReset();
    renderMock.mockReset();
    runStartupGateMock.mockReset();

    await expect(import("./main")).rejects.toThrow(/window is not defined/);

    expect(createRootMock).not.toHaveBeenCalled();
    expect(runStartupGateMock).not.toHaveBeenCalled();
  });
});