import json
import queue
import threading
import time
import unittest

from clients.python.model_update_client import ModelUpdateClient, ModelUpdateError
from clients.python.model_update_client.client import _Pending, SubscriptionHandle


class FakeSocketClosed(Exception):
    def __init__(self, code=1001, reason="server restart"):
        super().__init__(reason)
        self.close_status_code = code
        self.reason = reason


class FakeSocket:
    def __init__(self, server):
        self.server = server
        self.incoming = queue.Queue()
        self.closed = False
        self.server.sockets.add(self)

    def connect(self, _url, **_options):
        return None

    def send(self, raw):
        self.server.on_send(self, json.loads(raw))

    def recv(self):
        item = self.incoming.get()
        if isinstance(item, Exception):
            raise item
        return json.dumps(item)

    def push(self, message):
        if not self.closed:
            self.incoming.put(message)

    def close(self, code=1000, reason="client closed"):
        if self.closed:
            return
        self.closed = True
        self.server.sockets.discard(self)
        self.incoming.put(FakeSocketClosed(code, reason))


class FakeServer:
    def __init__(self, ack_subscribe=True, echo_request_id=True):
        self.sockets = set()
        self.messages = []
        self.generation = 0
        self.ack_subscribe = ack_subscribe
        self.echo_request_id = echo_request_id
        self.on_send = self._on_send

    def create_socket(self):
        self.generation += 1
        return FakeSocket(self)

    def _on_send(self, socket, message):
        self.messages.append((self.generation, message))
        if message["type"] == "subscribe" and self.ack_subscribe:
            response = {
                "type": "subscribed",
                "ok": True,
                "data": {
                    "subscriptionId": f"sub-{self.generation}-{len(self.messages)}",
                    "scope": message["scope"],
                    "files": message["files"]
                }
            }
            if self.echo_request_id:
                response["requestId"] = message.get("requestId")
            socket.push(response)

    def restart(self):
        for socket in list(self.sockets):
            socket.close(1001, "server restart")

    def delete_space(self):
        for socket in list(self.sockets):
            socket.close(4003, "space deleted")


def wait_for(predicate, timeout=2.0):
    deadline = time.time() + timeout
    while not predicate():
        if time.time() >= deadline:
            raise AssertionError("等待条件超时")
        time.sleep(0.005)


class ModelUpdateClientTests(unittest.TestCase):
    def setUp(self):
        self.server = FakeServer()
        self.client = ModelUpdateClient(
            "ws://fake/webgrp/v1/subscriptions/ws?space=space-a",
            socket_factory=self.server.create_socket,
            reconnect_min_delay=0.01,
            reconnect_max_delay=0.02,
            reconnect_jitter=0,
            ack_timeout=0.5,
        )

    def tearDown(self):
        self.client.close()

    def test_reconnects_and_resubscribes_in_creation_order(self):
        self.client.connect()
        first = self.client.subscribe({"type": "space"}, [{"kind": "json"}])
        second = self.client.subscribe({"type": "model", "modelId": 12}, [{"kind": "e", "encoding": "gbk"}])
        self.assertEqual(first.subscription_id, "sub-1-1")
        self.assertEqual(second.subscription_id, "sub-1-2")

        self.server.restart()
        wait_for(lambda: first.subscription_id == "sub-2-3" and second.subscription_id == "sub-2-4")
        restored = [message for generation, message in self.server.messages if generation == 2]
        self.assertEqual([message["scope"]["type"] for message in restored], ["space", "model"])

    def test_legacy_ack_without_request_id_is_accepted_when_unambiguous(self):
        self.client.close()
        self.server = FakeServer(echo_request_id=False)
        self.client = ModelUpdateClient(
            "ws://fake/webgrp/v1/subscriptions/ws?space=space-a",
            socket_factory=self.server.create_socket,
            reconnect=False,
            ack_timeout=0.5,
        )

        self.client.connect()
        handle = self.client.subscribe({"type": "space"}, [{"kind": "json"}])

        self.assertEqual(handle.subscription_id, "sub-1-1")

    def test_missing_request_id_with_multiple_pending_requests_is_protocol_error(self):
        errors = []
        self.client.on("error", errors.append)
        first = SubscriptionHandle({"type": "space"}, [{"kind": "json"}])
        second = SubscriptionHandle({"type": "space"}, [{"kind": "json"}])
        with self.client._lock:
            self.client._pending["request-1"] = _Pending("request-1", "subscribe", first)
            self.client._pending["request-2"] = _Pending("request-2", "subscribe", second)

        self.client._handle_message(json.dumps({
            "type": "subscribed",
            "ok": True,
            "data": {"subscriptionId": "sub-ambiguous"},
        }))

        self.assertEqual(errors[-1].code, "bad-response")
        self.assertEqual(set(self.client._pending), {"request-1", "request-2"})

    def test_explicit_close_does_not_reconnect(self):
        self.client.connect()
        self.client.subscribe({"type": "space"}, [{"kind": "json"}])
        self.client.close()
        generation_count = self.server.generation
        time.sleep(0.05)
        self.assertEqual(self.server.generation, generation_count)

    def test_space_deletion_is_permanent(self):
        errors = []
        self.client.on("error", errors.append)
        self.client.connect()
        self.server.delete_space()
        wait_for(lambda: any(error.code == "space-deleted" for error in errors))
        generation_count = self.server.generation
        time.sleep(0.05)
        self.assertEqual(self.server.generation, generation_count)
        self.assertTrue(any(isinstance(error, ModelUpdateError) for error in errors))

    def test_model_update_callback_errors_do_not_stop_message_delivery(self):
        errors = []
        updates = []
        self.client.on("error", errors.append)
        self.client.on("model.updated", lambda _data: (_ for _ in ()).throw(RuntimeError("callback failed")))
        self.client.on("model.updated", updates.append)
        self.client.connect()
        self.client.subscribe({"type": "space"}, [{"kind": "json"}])
        socket = next(iter(self.server.sockets))
        socket.push({"type": "model.updated", "data": {"model_id": "12"}})
        wait_for(lambda: updates == [{"model_id": "12"}])
        self.assertEqual(errors[-1].code, "callback-failed")

    def test_subscribe_fails_when_connection_drops_before_ack(self):
        self.client.close()
        self.server = FakeServer(ack_subscribe=False)
        self.client = ModelUpdateClient(
            "ws://fake/webgrp/v1/subscriptions/ws?space=space-a",
            socket_factory=self.server.create_socket,
            reconnect_min_delay=0.01,
            reconnect_max_delay=0.02,
            reconnect_jitter=0,
            ack_timeout=1.0,
        )
        result = {}

        def subscribe():
            try:
                self.client.subscribe({"type": "space"}, [{"kind": "json"}])
            except ModelUpdateError as error:
                result["error"] = error

        worker = threading.Thread(target=subscribe)
        worker.start()
        wait_for(lambda: len(self.server.messages) == 1)
        self.server.restart()
        worker.join(timeout=1.0)

        self.assertFalse(worker.is_alive())
        self.assertEqual(result["error"].code, "connection-closed")

    def test_subscribe_fails_when_ack_times_out_on_an_open_connection(self):
        self.client.close()
        self.server = FakeServer(ack_subscribe=False)
        self.client = ModelUpdateClient(
            "ws://fake/webgrp/v1/subscriptions/ws?space=space-a",
            socket_factory=self.server.create_socket,
            reconnect=False,
            ack_timeout=0.05,
        )

        started = time.time()
        with self.assertRaises(ModelUpdateError) as raised:
            self.client.subscribe({"type": "space"}, [{"kind": "json"}])

        self.assertEqual(raised.exception.code, "connection-closed")
        self.assertLess(time.time() - started, 1.0)

    def test_subscribe_timeout_removes_desired_handle_and_cancels_late_ack(self):
        self.client.close()
        self.server = FakeServer(ack_subscribe=False)
        self.client = ModelUpdateClient(
            "ws://fake/webgrp/v1/subscriptions/ws?space=space-a",
            socket_factory=self.server.create_socket,
            reconnect=False,
            ack_timeout=1.0,
        )

        with self.assertRaises(ModelUpdateError) as raised:
            self.client.subscribe({"type": "space"}, [{"kind": "json"}], timeout=0.05)
        self.assertEqual(raised.exception.code, "ack-timeout")
        self.assertEqual(self.client._desired, {})

        socket = next(iter(self.server.sockets))
        request = self.server.messages[0][1]
        socket.push({
            "type": "subscribed",
            "ok": True,
            "requestId": request["requestId"],
            "data": {
                "subscriptionId": "late-subscription",
                "scope": request["scope"],
                "files": request["files"],
            },
        })
        wait_for(lambda: any(message[1]["type"] == "unsubscribe" for message in self.server.messages))


if __name__ == "__main__":
    unittest.main()
