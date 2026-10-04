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
  const container =
    props.container?.querySelector?.("#root") || document.getElementById("root");
  renderApp(container);
}

export async function unmount(props: any) {
  traceLifecycle("unmount");
  if (root) {
    root.unmount();
    root = null;
  }
}
