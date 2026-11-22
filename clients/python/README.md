# Python 模型更新客户端

这是 `/webgrp/v1/subscriptions/ws` 的 Python 封装，使用后台线程接收 WebSocket 消息。客户端会保存期望订阅，在网络断开或服务端重启后自动重连并重新订阅。

## 安装

```bash
python -m pip install websocket-client
python -m pip install -e clients/python
```

## 使用

```python
from model_update_client import ModelUpdateClient

client = ModelUpdateClient(
    "ws://127.0.0.1:5174/webgrp/v1/subscriptions/ws",
    space="default",
    on_resynchronized=lambda _client: print("订阅已恢复，可重新读取快照"),
)
client.on("model.updated", lambda data: print(data["model_id"]))
client.connect()

handle = client.subscribe(
    {"type": "model", "modelId": 12},
    [{"kind": "json"}, {"kind": "e", "encoding": "gbk"}],
)
print(handle.subscription_id)
```

## 恢复语义

- 默认使用 `1s` 到 `30s` 的指数退避，并加入最多 20% 抖动。
- `close()` 停止后台线程和自动重连。
- 关闭码 `4003`（空间已删除）视为永久失败。
- 客户端不补发离线期间的 `model.updated`；使用 `on_resynchronized` 重新拉取快照。
- 事件包括 `status`、`connected`、`disconnected`、`subscribed`、`unsubscribed`、`model.updated`、`error` 和 `resynchronized`。
- 回调运行在接收线程；需要更新 UI 或异步框架状态时，请切回应用自己的线程。

完整示例见 [`examples/basic.py`](examples/basic.py)。
