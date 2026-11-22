# Node.js 模型更新客户端

这是 `/webgrp/v1/subscriptions/ws` 的 Node.js ESM 封装。它保存期望订阅，在网络断开或服务端重启后自动重连并重新订阅；服务端返回的新 `subscriptionId` 由客户端内部维护。

## 使用

```bash
pnpm add ws
```

```js
import { ModelUpdateClient } from "@graph-modeling-platform/model-update-client";

const client = new ModelUpdateClient({
  url: "ws://127.0.0.1:5174/webgrp/v1/subscriptions/ws",
  space: "default",
  onResynchronized: async () => {
    // 订阅恢复后重新读取当前快照，补齐断线期间的变化。
  }
});

client.on("model.updated", (data) => {
  for (const file of data.files ?? []) {
    const bytes = Buffer.from(file.contentBase64, "base64");
    console.log(file.filename, file.encoding, bytes.length);
  }
});

await client.connect();
const handle = await client.subscribe({
  scope: { type: "model", modelId: 12 },
  files: [{ kind: "json" }, { kind: "e", encoding: "gbk" }]
});

console.log("当前订阅", handle.subscriptionId);
```

## 恢复语义

- 默认使用 `1s` 到 `30s` 的指数退避，并加入最多 20% 抖动。
- `close()` 停止自动重连；可再次调用 `connect()` 重新建立连接。
- 关闭码 `4003`（空间已删除）视为永久失败。
- 客户端不补发离线期间的 `model.updated`；使用 `onResynchronized` 重新拉取快照。
- 事件包括 `status`、`connected`、`disconnected`、`subscribed`、`unsubscribed`、`model.updated`、`error` 和 `resynchronized`。

完整示例见 [`examples/basic.mjs`](examples/basic.mjs)。
