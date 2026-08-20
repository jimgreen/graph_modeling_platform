import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import "./styles.css";
import "./globalMessage";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <ConfigProvider componentSize="small">
    <App />
  </ConfigProvider>
);
