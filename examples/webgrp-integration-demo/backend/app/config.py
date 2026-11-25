from __future__ import annotations

import os
from dataclasses import dataclass


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value.strip() if value and value.strip() else default


def _port(name: str, default: int) -> int:
    try:
        value = int(_env(name, str(default)))
    except ValueError:
        return default
    return value if 1 <= value <= 65535 else default


@dataclass(frozen=True)
class Settings:
    webgrp_frontend_url: str = "http://127.0.0.1:5173/app/"
    webgrp_http_base_url: str = "http://127.0.0.1:5174"
    webgrp_ws_base_url: str = "ws://127.0.0.1:5174"
    webgrp_api_prefix: str = "/webgrp"
    webgrp_space: str = "default"
    demo_host: str = "127.0.0.1"
    demo_port: int = 8000
    demo_receiver_url: str = "http://127.0.0.1:8000/api/receive"

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            webgrp_frontend_url=_env("WEBGRP_FRONTEND_URL", cls.webgrp_frontend_url).rstrip("/") + "/",
            webgrp_http_base_url=_env("WEBGRP_HTTP_BASE_URL", cls.webgrp_http_base_url).rstrip("/"),
            webgrp_ws_base_url=_env("WEBGRP_WS_BASE_URL", cls.webgrp_ws_base_url).rstrip("/"),
            webgrp_api_prefix="/" + _env("WEBGRP_API_PREFIX", cls.webgrp_api_prefix).strip("/"),
            webgrp_space=_env("WEBGRP_SPACE", cls.webgrp_space),
            demo_host=_env("DEMO_HOST", cls.demo_host),
            demo_port=_port("DEMO_PORT", cls.demo_port),
            demo_receiver_url=_env("DEMO_RECEIVER_URL", cls.demo_receiver_url).rstrip("/"),
        )

    @property
    def http_api_base(self) -> str:
        return f"{self.webgrp_http_base_url}{self.webgrp_api_prefix}"

    @property
    def ws_subscription_url(self) -> str:
        return f"{self.webgrp_ws_base_url}{self.webgrp_api_prefix}/v1/subscriptions/ws"
