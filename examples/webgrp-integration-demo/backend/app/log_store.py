from __future__ import annotations

from collections import deque
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any


MAX_TEXT = 4_000
MAX_ITEMS = 200


def summarize(value: Any, *, depth: int = 0) -> Any:
    """Return a JSON-safe, bounded view suitable for the demo timeline."""
    if depth > 4:
        return "[truncated]"
    if isinstance(value, str):
        return value if len(value) <= MAX_TEXT else value[:MAX_TEXT] + "…"
    if isinstance(value, bytes):
        return {"type": "bytes", "length": len(value)}
    if isinstance(value, dict):
        return {str(key): summarize(item, depth=depth + 1) for key, item in list(value.items())[:80]}
    if isinstance(value, (list, tuple)):
        items = [summarize(item, depth=depth + 1) for item in value[:80]]
        return items + (["[truncated]"] if len(value) > 80 else [])
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return str(value)


class LogStore:
    def __init__(self) -> None:
        self._items: deque[dict[str, Any]] = deque(maxlen=MAX_ITEMS)

    def record(self, *, channel: str, direction: str, label: str, payload: Any, status: int | None = None) -> dict[str, Any]:
        item = {
            "id": f"log-{len(self._items) + 1}-{int(datetime.now().timestamp() * 1000)}",
            "at": datetime.now(timezone.utc).isoformat(),
            "channel": channel,
            "direction": direction,
            "label": label,
            "status": status,
            "payload": summarize(payload),
        }
        self._items.append(item)
        return deepcopy(item)

    def list(self) -> list[dict[str, Any]]:
        return deepcopy(list(reversed(self._items)))

    def clear(self) -> int:
        count = len(self._items)
        self._items.clear()
        return count
