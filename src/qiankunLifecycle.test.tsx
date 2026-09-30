// qiankun 子应用生命周期，此前零测试。
//
// 这一层真正的风险不在「渲染出来」，而在**顺序**与**容器选择**：
//   · mount 里 bindUserSpaceToSession 必须早于 runStartupGate —— 闸门按
//     gmp_space Cookie 解析 current 并据此清浏览器缓存，反了就会先按旧空间
//     播种一次缓存，表现为「切到 A 用户空间后仍显示 B 的图元缓存」。
//     两条都是 await，顺序错了不会报错，只会静默缓存串空间。
//   · 容器优先取 props.container 里的 #root（qiankun 会把子应用挂进宿主节点），
//     拿不到才退回 document.getElementById("root")。
//   · root 是模块级状态：重复 mount 要复用同一个 root，unmount 后要置空，
//     否则第二次 mount 会往已卸载的 root 上 render（界面一片空白且不报错）。
//
// 本仓 vitest 是 node 环境且没装 jsdom，所以 document / window / createRoot
// 全部手搓最小桩；App 与 antd 打桩掉，本模块不测它们的渲染。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const h = vi.hoisted(() => {
  const order: string[] = [];
  return {
    order,
    bindUserSpaceToSession: vi.fn(async (user?: string) => {
      order.push(`bind:${String(user)}`);
    }),
    runStartupGate: vi.fn(async () => {
      order.push("gate");
    }),
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
  const win: Record<string, unknown> = {};
  (globalThis as Record<string, unknown>).window = win;
  (globalThis as Record<string, unknown>).document = {
    getElementById: (id: string) => (id === "root" ? rootElement : null)
  };
  return win;
}

const mountElement = { id: "root" };
let lifecycle: Lifecycle;

beforeEach(async () => {
  vi.resetModules();
  h.order.length = 0;
  // mockReset 而非 mockClear：个别用例会换掉实现（如「不并发」那条），
  // 只清调用次数的话实现会漏到下一条用例里去。
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

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).document;
  vi.resetModules();
});

describe("bootstrap", () => {
  test("不抛、也不碰任何依赖（没有 props 时的最小生命周期）", async () => {
    await expect(lifecycle.bootstrap()).resolves.toBeUndefined();
    expect(h.createRoot).not.toHaveBeenCalled();
  });
});

describe("mount", () => {
  test("把宿主注入的四个字段写进 window.__QIANKUN_PROPS__", async () => {
    await lifecycle.mount({ apiBaseUrl: "http://host/api", project: { id: 7 }, schema: "v1", user: "alice" });

    expect((globalThis as Record<string, any>).window.__QIANKUN_PROPS__).toEqual({
      apiBaseUrl: "http://host/api",
      project: { id: 7 },
      schema: "v1",
      user: "alice"
    });
  });

  test("宿主没传的字段也照写（键存在、值为 undefined），不读旧值", async () => {
    // 二次挂载时 props 可能只剩部分字段；整个对象是重建的，不该残留上一次的 user
    (globalThis as Record<string, any>).window.__QIANKUN_PROPS__ = { user: "上一位用户", apiBaseUrl: "旧" };

    await lifecycle.mount({ user: "bob" });

    const props = (globalThis as Record<string, any>).window.__QIANKUN_PROPS__;
    expect(props.user).toBe("bob");
    expect(props.apiBaseUrl).toBeUndefined();
    expect("apiBaseUrl" in props).toBe(true);
  });

  test("绑定空间严格早于启动闸门（反了就按旧空间播种缓存）", async () => {
    await lifecycle.mount({ user: "alice" });

    expect(h.order).toEqual(["bind:alice", "gate"]);
  });

  test("两条都是异步的：必须 await 完再往下走，不并发", async () => {
    let bindDone = false;
    h.bindUserSpaceToSession.mockImplementation(async () => {
      await Promise.resolve();
      bindDone = true;
      h.order.push("bind");
    });
    h.runStartupGate.mockImplementation(async () => {
      h.order.push(`gate(bindDone=${bindDone})`);
    });

    await lifecycle.mount({ user: "alice" });

    expect(h.order).toEqual(["bind", "gate(bindDone=true)"]);
  });

  test("优先挂到 props.container 里的 #root，而不是全局那个", async () => {
    const containerChild = { id: "sub-root" };

    await lifecycle.mount({ container: { querySelector: (sel: string) => (sel === "#root" ? containerChild : null) } });

    expect(h.createRoot).toHaveBeenCalledWith(containerChild);
  });

  test("props.container 里没有 #root 时退回 document 的 #root", async () => {
    await lifecycle.mount({ container: { querySelector: () => null } });

    expect(h.createRoot).toHaveBeenCalledWith(mountElement);
  });

  test("两处都拿不到容器时不创建 root、也不抛（宿主尚未插入节点）", async () => {
    installDom(null);

    await expect(lifecycle.mount({ container: { querySelector: () => null } })).resolves.toBeUndefined();

    expect(h.createRoot).not.toHaveBeenCalled();
    expect(h.render).not.toHaveBeenCalled();
    // 顺序契约不受影响：容器找不到也要先把空间绑上
    expect(h.order).toEqual(["bind:undefined", "gate"]);
  });

  test("重复 mount 复用同一个 root（不二次 createRoot）", async () => {
    await lifecycle.mount({});
    await lifecycle.mount({});

    expect(h.createRoot).toHaveBeenCalledTimes(1);
    expect(h.render).toHaveBeenCalledTimes(2);
  });
});

describe("unmount", () => {
  test("卸掉已挂载的 root", async () => {
    await lifecycle.mount({});
    await lifecycle.unmount({});

    expect(h.unmount).toHaveBeenCalledTimes(1);
  });

  test("没挂载过就调 unmount 是空操作（不抛）", async () => {
    await expect(lifecycle.unmount({})).resolves.toBeUndefined();
    expect(h.unmount).not.toHaveBeenCalled();
  });

  test("unmount 后 root 置空：再次 mount 会重新 createRoot", async () => {
    // 不置空的话第二次 mount 会往已卸载的 root 上 render，界面空白且不报错
    await lifecycle.mount({});
    await lifecycle.unmount({});
    await lifecycle.mount({});

    expect(h.createRoot).toHaveBeenCalledTimes(2);
  });

  test("连续两次 unmount 不会重复调 root.unmount", async () => {
    await lifecycle.mount({});
    await lifecycle.unmount({});
    await lifecycle.unmount({});

    expect(h.unmount).toHaveBeenCalledTimes(1);
  });
});
