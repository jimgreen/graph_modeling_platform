import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import "./styles.css";
import "./globalMessage";
import { App } from "./App";

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
