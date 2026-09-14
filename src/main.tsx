import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import "./styles.css";
import "./globalMessage";
import { App } from "./App";
import { fetchSpaces, seedSpaces } from "./spaceClient";
import { reconcileSpaceCacheOwnership } from "./spaceCache";

// 启动闸门：**必须先于渲染**（见 spaceCache.ts 的 reconcileSpaceCacheOwnership 注释）。
// App 的模型/配色/量测状态是渲染期同步从 localStorage 播种的，故清缓存只能放在
// createRoot 之前；挪进 useEffect 就是事后动作，旧空间数据已进 React state。
// 不能用 useEffect 也不能把这段搬到 App 内。
async function bootstrap(): Promise<void> {
  try {
    const initial = await fetchSpaces();
    // 这次请求已在关键路径上；把它交给 App 挂载时的首次 refreshSpaces，省掉同一条数据的第二次拉取
    seedSpaces(initial);
    try {
      await reconcileSpaceCacheOwnership(initial.current);
    } catch {
      // 清缓存失败（IDB 不可用）= 这一次没有空间校验，旧空间的浏览器缓存会照旧参与
      // 「后端读空 → 回写」，即 S2 不设防。**静默的失败比失败本身更坏**，必须让用户看见。
      (globalThis as any).showGlobalMessage?.("本地缓存未清理干净，本次未做空间校验，请刷新重试。");
    }
  } catch {
    // 取不到空间列表（后端未起 / 离线）属常见情形：不阻断启动、也不打扰用户 ——
    // 白屏比「这次不校验」更坏。归属记账未写，下次启动会重试。
  }
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

void bootstrap();
