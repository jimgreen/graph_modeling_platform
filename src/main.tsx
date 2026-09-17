import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import "./styles.css";
import "./globalMessage";
import { App } from "./App";
import { runStartupGate } from "./appStartup";

// 独立运行时的启动：先过启动闸门（空间缓存归属对齐），再渲染。
// qiankun 下**不走这里** —— 由 qiankunLifecycle 的 mount() 先绑定用户空间、再跑闸门，
// 否则闸门会按旧 Cookie 的空间对齐缓存归属，用户一进来看到的是别人的数据。
async function startStandaloneApp(): Promise<void> {
  await runStartupGate();
  createRoot(document.getElementById("root")!).render(
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

if (!(window as any).__POWERED_BY_QIANKUN__) {
  void startStandaloneApp();
}

// qiankun 子应用生命周期：bootstrap / mount / unmount（供宿主应用调用）
export { bootstrap, mount, unmount } from "./qiankunLifecycle";
