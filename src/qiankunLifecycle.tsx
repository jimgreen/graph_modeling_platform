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
  console.log("[qiankun] graph-modeling-platform bootstrap");
}

export async function mount(props: any) {
  console.log("[qiankun] graph-modeling-platform mount", props);
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
  console.log("[qiankun] graph-modeling-platform unmount", props);
  if (root) {
    root.unmount();
    root = null;
  }
}
