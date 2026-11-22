import { ModelUpdateClient } from "../src/index.mjs";

const client = new ModelUpdateClient({
  url: process.env.GMP_WS_URL ?? "ws://127.0.0.1:5174/webgrp/v1/subscriptions/ws",
  space: process.env.GMP_SPACE ?? "default",
  reconnectMinDelayMs: 1_000,
  reconnectMaxDelayMs: 30_000,
  onResynchronized: async () => {
    // 服务端不重放离线更新；这里可以重新 GET 当前模型快照。
    console.log("订阅已恢复，可在这里拉取最新快照");
  }
});

client.on("status", (status) => console.log("连接状态", status));
client.on("error", (error) => console.error("订阅错误", error.code, error.message));
client.on("model.updated", (data) => {
  for (const file of data.files ?? []) {
    const bytes = Buffer.from(file.contentBase64, "base64");
    console.log("收到模型文件", file.filename, file.encoding, bytes.length);
  }
});

await client.connect();
await client.subscribe({
  scope: { type: "space" },
  files: [{ kind: "json" }, { kind: "e", encoding: "gbk" }]
});

process.once("SIGINT", () => client.close());
