import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import { App } from "./App";
import { runStartupGate } from "./appStartup";
import { bindUserSpaceToSession } from "./qiankunUserSpace";

// 主应用（qiankun 宿主）注入的配置，供 runtimeWsClient 等模块读取
declare global {
  interface Window {
    __QIANKUN_PROPS__?: {
      apiBaseUrl?: string;
      project?: any;
      schema?: string;
      // 宿主登录用户（web_v4 的 `user_session` Cookie）：qiankun 下按它绑定独立空间
      user?: string;
    };
  }
}

let root: ReturnType<typeof createRoot> | null = null;

// 代际守卫：mount 在 bindUserSpaceToSession / runStartupGate 上有两次 await，
// 宿主完全可能在这段时间里就把子应用 unmount 掉（qiankun 的 mount/unmount 不互斥，
// 路由切走时不必等 mount 的 promise 落地）。await 之后的代码若照旧往下跑，
// 就会往一个宿主已经摘掉的容器上 render —— 子应用「复活」在页面之外：界面看不到，
// 但定时器 / WS / EventSource 全部已经挂上了，且再也不会有人来 unmount 它们。
//
// 只由 unmount 递增，mount 自己不递增：这样「两次并发 mount」等既有行为一字未动，
// 只有真正发生过 unmount 的那条路径会被拦下（见下方 mount 里的检查）。
// 模块私有，不进导出集合。
let mountGeneration = 0;

// 生命周期诊断：只在 dev 下打印，前缀集中在这里一处（此前三个阶段各写各的字符串）。
//
// 为什么不再直接 `console.log("...", props)`：qiankun 注入的 props 里带 `container`
// ——那是一个真实 DOM 节点，连同整份 `project` 一起打进控制台，生产环境每次宿主
// 开页都刷两行噪音；宿主若挂了 console 采集/转发，等于把图元数据外泄出去。
// 现在只打本模块真正消费的标量字段，且 `container` / `project` 内容一律不落盘。
const LIFECYCLE_TRACE_PREFIX = "[qiankun] graph-modeling-platform";

function traceLifecycle(phase: "bootstrap" | "mount" | "unmount", detail?: string) {
  if (!import.meta.env.DEV) return;
  console.log(detail ? `${LIFECYCLE_TRACE_PREFIX} ${phase} ${detail}` : `${LIFECYCLE_TRACE_PREFIX} ${phase}`);
}

// 与 main.tsx 独立运行时的渲染保持一致（antd 紧凑 + 圆角主题）
function renderApp(container?: Element | DocumentFragment) {
  const appContainer = container || document.getElementById("root");
  if (!appContainer) return;

  if (!root) {
    root = createRoot(appContainer);
  }
  root.render(
    <ConfigProvider
      componentSize="small"
      theme={{
        token: { borderRadius: 4 },
        components: {
          Input: { paddingInlineSM: 8, paddingBlockSM: 2 },
        },
      }}
    >
      <App />
    </ConfigProvider>
  );
}

export async function bootstrap() {
  traceLifecycle("bootstrap");
}

export async function mount(props: any) {
  // 只记标量字段：`container` 是 DOM 节点、`project` 是整份工程，都不进日志。
  traceLifecycle(
    "mount",
    `apiBaseUrl=${props.apiBaseUrl} schema=${props.schema} user=${props.user} project=${props.project ? "有" : "无"}`
  );
  // 进入 mount 时先认下当前代；await 完若代已被 unmount 推进，说明自己这一轮已经作废。
  const generation = mountGeneration;
  // 存储主应用传入的配置，供其他模块使用
  window.__QIANKUN_PROPS__ = {
    apiBaseUrl: props.apiBaseUrl,
    project: props.project,
    schema: props.schema,
    user: props.user,
  };
  // 顺序不可换：先把宿主用户绑到自己的空间（写 gmp_space Cookie），再跑启动闸门 ——
  // 闸门按 Cookie 解析 current 并据此对齐浏览器缓存归属，反了就会先按旧空间播种一次。
  // 宿主没传 user 时本调用是空操作，行为与加此功能前一致。
  await bindUserSpaceToSession(props.user);
  await runStartupGate();
  // 两次 await 期间宿主已 unmount：这一轮的容器早已被摘掉，绝不能再 createRoot/render。
  // 顺序上放在容器查找之前 —— 容器没了也不该再去碰宿主节点。
  if (generation !== mountGeneration) return;
  const container =
    props.container?.querySelector?.("#root") || document.getElementById("root");
  renderApp(container);
}

export async function unmount(props: any) {
  traceLifecycle("unmount");
  // 作废所有在途的 mount（它们 await 完就会各自撞上代际检查并自行返回），
  // 重复 unmount 只是继续推进计数器，幂等。
  mountGeneration += 1;
  if (root) {
    root.unmount();
    root = null;
  }
}
