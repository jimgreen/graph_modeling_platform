import threading

from model_update_client import ModelUpdateClient


client = ModelUpdateClient(
    "ws://127.0.0.1:5174/webgrp/v1/subscriptions/ws",
    space="default",
    on_resynchronized=lambda _client: print("订阅已恢复，可在这里拉取最新快照"),
)
client.on("status", lambda status: print("连接状态", status))
client.on("error", lambda error: print("订阅错误", error.code, str(error)))


def on_model_updated(data):
    for file in data.get("files", []):
        print("收到模型文件", file.get("filename"), file.get("encoding"), file.get("bytes"))


client.on("model.updated", on_model_updated)
client.connect()
handle = client.subscribe(
    {"type": "space"},
    [{"kind": "json"}, {"kind": "e", "encoding": "gbk"}],
)
print("当前订阅", handle.subscription_id)

try:
    threading_event = threading.Event()
    threading_event.wait()
except KeyboardInterrupt:
    client.close()
