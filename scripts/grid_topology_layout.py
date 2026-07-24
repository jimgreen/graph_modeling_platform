#!/usr/bin/env python3
"""
Generate an orthogonal power-grid topology diagram from a JSON model.

The script intentionally has no third-party dependencies. It accepts common
platform shapes:

  {
    "nodes": [{"id": "...", "name": "...", "kind": "..."}],
    "edges": [{"sourceId": "...", "targetId": "..."}]
  }

It also accepts lightweight alternatives:

  {
    "devices": [{"id": "...", "type": "..."}],
    "connections": [{"source": "...", "target": "..."}]
  }

Outputs:
  - an SVG with orthogonal, axis-aligned polylines
  - a JSON layout file with node coordinates and routed edge points
"""

from __future__ import annotations

import argparse
import html
import json
import math
import re
from collections import defaultdict, deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


SOURCE_HINTS = ("source", "generator", "gen", "power", "pv", "wind", "hydro", "thermal", "nuclear", "电源", "发电")
BUS_HINTS = ("bus", "node", "母线")
TRANSFORMER_HINTS = ("transformer", "变压器", "主变")
SWITCH_HINTS = ("switch", "breaker", "disconnector", "刀闸", "开关")
LOAD_HINTS = ("load", "负荷")


@dataclass
class Device:
    id: str
    name: str
    kind: str
    raw: dict[str, Any] = field(default_factory=dict)
    rank: int = 0
    order: int = 0
    x: float = 0.0
    y: float = 0.0


@dataclass
class Connection:
    id: str
    source: str
    target: str
    raw: dict[str, Any] = field(default_factory=dict)
    points: list[tuple[float, float]] = field(default_factory=list)


@dataclass
class ESection:
    name: str
    fields: list[str] = field(default_factory=list)
    rows: list[dict[str, str]] = field(default_factory=list)


def text_of(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    return str(value).strip() or fallback


def lower_blob(device: Device) -> str:
    values = [device.id, device.name, device.kind]
    values.extend(str(value) for value in device.raw.get("params", {}).values() if isinstance(value, (str, int, float)))
    return " ".join(values).lower()


def contains_any(value: str, hints: Iterable[str]) -> bool:
    return any(hint.lower() in value for hint in hints)


def device_category(device: Device) -> str:
    blob = lower_blob(device)
    if contains_any(blob, BUS_HINTS):
        return "bus"
    if contains_any(blob, TRANSFORMER_HINTS):
        return "transformer"
    if contains_any(blob, SWITCH_HINTS):
        return "switch"
    if contains_any(blob, LOAD_HINTS):
        return "load"
    if contains_any(blob, SOURCE_HINTS):
        return "source"
    return "device"


def first_key(mapping: dict[str, Any], keys: Iterable[str], fallback: str = "") -> str:
    for key in keys:
        if key in mapping:
            value = text_of(mapping.get(key))
            if value:
                return value
    return fallback


def read_devices(model: dict[str, Any]) -> list[Device]:
    raw_nodes = model.get("nodes")
    if not isinstance(raw_nodes, list):
        raw_nodes = model.get("devices")
    if not isinstance(raw_nodes, list):
        raw_nodes = model.get("equipment")
    if not isinstance(raw_nodes, list):
        raise ValueError("Input JSON must contain a nodes/devices/equipment array.")

    devices: list[Device] = []
    used: set[str] = set()
    for index, item in enumerate(raw_nodes, start=1):
        if not isinstance(item, dict):
            continue
        device_id = first_key(item, ("id", "uid", "devId", "dev-id", "name"), f"device-{index}")
        if device_id in used:
            suffix = 2
            base = device_id
            while f"{base}-{suffix}" in used:
                suffix += 1
            device_id = f"{base}-{suffix}"
        used.add(device_id)
        kind = first_key(item, ("kind", "type", "devKind", "dev-kind", "class", "eType"), "device")
        name = first_key(item, ("name", "label", "displayName", "title"), device_id)
        devices.append(Device(id=device_id, name=name, kind=kind, raw=item))
    return devices


def read_endpoint(edge: dict[str, Any], keys: Iterable[str]) -> str:
    for key in keys:
        value = edge.get(key)
        if isinstance(value, dict):
            nested = first_key(value, ("id", "nodeId", "deviceId", "devId", "name"))
            if nested:
                return nested
        endpoint = text_of(value)
        if endpoint:
            return endpoint
    return ""


def read_connections(model: dict[str, Any], device_ids: set[str]) -> list[Connection]:
    raw_edges = model.get("edges")
    if not isinstance(raw_edges, list):
        raw_edges = model.get("connections")
    if not isinstance(raw_edges, list):
        raw_edges = model.get("links")
    if not isinstance(raw_edges, list):
        raise ValueError("Input JSON must contain an edges/connections/links array.")

    connections: list[Connection] = []
    for index, item in enumerate(raw_edges, start=1):
        if not isinstance(item, dict):
            continue
        source = read_endpoint(item, ("sourceId", "source", "from", "fromId", "start", "i", "inode"))
        target = read_endpoint(item, ("targetId", "target", "to", "toId", "end", "j", "znode"))
        if source not in device_ids or target not in device_ids or source == target:
            continue
        edge_id = first_key(item, ("id", "uid", "edgeId", "name"), f"edge-{index}")
        connections.append(Connection(id=edge_id, source=source, target=target, raw=item))
    return connections


def parse_e_file(path: Path) -> dict[str, ESection]:
    sections: dict[str, ESection] = {}
    current: ESection | None = None
    section_start = re.compile(r"^\s*<([A-Za-z0-9_]+)>\s*$")
    section_end = re.compile(r"^\s*</([A-Za-z0-9_]+)>\s*$")
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        start_match = section_start.match(line)
        if start_match:
            current = ESection(start_match.group(1))
            sections[current.name] = current
            continue
        if section_end.match(line):
            current = None
            continue
        if current is None:
            continue
        if line.startswith("@"):
            current.fields = line[1:].strip().split()
            continue
        if line.startswith("#") and current.fields:
            values = line[1:].strip().split()
            row = {field: values[index] if index < len(values) else "" for index, field in enumerate(current.fields)}
            current.rows.append(row)
    return sections


def e_node_id(idx: str) -> str:
    return f"bus-{idx}"


def e_equipment_id(section: str, row: dict[str, str]) -> str:
    raw_name = row.get("name") or row.get("idx") or "item"
    return f"{section}-{raw_name}".replace("_", "-")


def is_running(row: dict[str, str]) -> bool:
    value = row.get("run_stat", "1").strip()
    return value != "0"


def add_bus_connected_devices(
    devices: list[Device],
    connections: list[Connection],
    section_name: str,
    rows: list[dict[str, str]],
    kind: str,
    label_prefix: str,
) -> None:
    for row in rows:
        if not is_running(row):
            continue
        node = row.get("node", "").strip()
        if not node:
            continue
        device_id = e_equipment_id(section_name, row)
        name = row.get("name") or f"{label_prefix}_{row.get('idx', len(devices) + 1)}"
        devices.append(Device(id=device_id, name=name, kind=kind, raw={"section": section_name, **row}))
        connections.append(Connection(id=f"conn-{device_id}-{node}", source=device_id, target=e_node_id(node), raw={"section": section_name, **row}))


def e_sections_to_model(sections: dict[str, ESection]) -> tuple[list[Device], list[Connection]]:
    devices: list[Device] = []
    connections: list[Connection] = []
    bus_ids: set[str] = set()

    for row in sections.get("ACNode", ESection("ACNode")).rows:
        if not is_running(row):
            continue
        idx = row.get("idx", "").strip()
        if not idx:
            continue
        device_id = e_node_id(idx)
        bus_ids.add(device_id)
        name = row.get("name") or f"bus_{idx}"
        devices.append(Device(id=device_id, name=name, kind="ac-bus", raw={"section": "ACNode", **row}))

    def add_two_terminal_section(section_name: str, kind: str, as_device: bool) -> None:
        for row in sections.get(section_name, ESection(section_name)).rows:
            if not is_running(row):
                continue
            i_node = row.get("i_node", "").strip()
            j_node = row.get("j_node", "").strip()
            if not i_node or not j_node:
                continue
            source = e_node_id(i_node)
            target = e_node_id(j_node)
            if source not in bus_ids or target not in bus_ids:
                continue
            item_id = e_equipment_id(section_name, row)
            if as_device:
                devices.append(Device(id=item_id, name=row.get("name") or item_id, kind=kind, raw={"section": section_name, **row}))
                connections.append(Connection(id=f"{item_id}-i", source=source, target=item_id, raw={"section": section_name, **row}))
                connections.append(Connection(id=f"{item_id}-j", source=item_id, target=target, raw={"section": section_name, **row}))
            else:
                connections.append(Connection(id=item_id, source=source, target=target, raw={"section": section_name, **row}))

    add_two_terminal_section("ACBranch", "ac-line", as_device=False)
    add_two_terminal_section("ACZeroBranch", "ac-zero-branch", as_device=False)
    add_two_terminal_section("ACTransformer", "ac-transformer", as_device=True)
    add_two_terminal_section("ACSwitch", "ac-switch", as_device=True)

    add_bus_connected_devices(devices, connections, "ACGenerator", sections.get("ACGenerator", ESection("ACGenerator")).rows, "ac-source", "gen")
    add_bus_connected_devices(devices, connections, "ACLoad", sections.get("ACLoad", ESection("ACLoad")).rows, "ac-load", "load")
    add_bus_connected_devices(
        devices,
        connections,
        "ACShuntCompensator",
        sections.get("ACShuntCompensator", ESection("ACShuntCompensator")).rows,
        "ac-shunt",
        "shunt",
    )
    return devices, connections


def connected_components(devices: list[Device], connections: list[Connection]) -> list[list[str]]:
    ids = [device.id for device in devices]
    adjacency: dict[str, set[str]] = {device_id: set() for device_id in ids}
    for edge in connections:
        adjacency[edge.source].add(edge.target)
        adjacency[edge.target].add(edge.source)

    seen: set[str] = set()
    components: list[list[str]] = []
    for device_id in ids:
        if device_id in seen:
            continue
        queue = deque([device_id])
        seen.add(device_id)
        group: list[str] = []
        while queue:
            current = queue.popleft()
            group.append(current)
            for neighbor in sorted(adjacency[current]):
                if neighbor not in seen:
                    seen.add(neighbor)
                    queue.append(neighbor)
        components.append(group)
    components.sort(key=lambda item: (-len(item), item[0]))
    return components


def build_adjacency(devices: list[Device], connections: list[Connection]) -> dict[str, list[str]]:
    adjacency: dict[str, set[str]] = {device.id: set() for device in devices}
    for edge in connections:
        adjacency[edge.source].add(edge.target)
        adjacency[edge.target].add(edge.source)
    return {key: sorted(value) for key, value in adjacency.items()}


def choose_roots(component: list[str], device_by_id: dict[str, Device], adjacency: dict[str, list[str]]) -> list[str]:
    hinted = [device_id for device_id in component if contains_any(lower_blob(device_by_id[device_id]), SOURCE_HINTS)]
    if hinted:
        ranked = sorted(hinted, key=lambda item: (-len(adjacency[item]), device_category(device_by_id[item]) != "source", item))
        root_limit = 1 if len(component) >= 160 else 2 if len(component) >= 80 else 4
        return ranked[:root_limit]
    max_degree = max((len(adjacency[device_id]) for device_id in component), default=0)
    roots = [device_id for device_id in component if len(adjacency[device_id]) == max_degree]
    return sorted(roots)[:1]


def assign_ranks(component: list[str], roots: list[str], adjacency: dict[str, list[str]]) -> dict[str, int]:
    rank: dict[str, int] = {}
    queue = deque()
    for root in roots:
        rank[root] = 0
        queue.append(root)
    while queue:
        current = queue.popleft()
        for neighbor in adjacency[current]:
            if neighbor not in component or neighbor in rank:
                continue
            rank[neighbor] = rank[current] + 1
            queue.append(neighbor)
    for device_id in component:
        rank.setdefault(device_id, 0)
    return rank


def rank_groups(component: list[str], rank: dict[str, int]) -> dict[int, list[str]]:
    groups: dict[int, list[str]] = defaultdict(list)
    for device_id in component:
        groups[rank[device_id]].append(device_id)
    return groups


def category_order(device: Device) -> int:
    return {
        "source": 0,
        "bus": 1,
        "transformer": 2,
        "switch": 3,
        "device": 4,
        "load": 5,
    }.get(device_category(device), 4)


def estimated_label_width(text: str) -> float:
    return min(180.0, max(56.0, len(text) * 7.0))


def expand_rect(rect: dict[str, float], padding: float) -> dict[str, float]:
    return {
        "left": rect["left"] - padding,
        "right": rect["right"] + padding,
        "top": rect["top"] - padding,
        "bottom": rect["bottom"] + padding,
    }


def union_rects(rects: list[dict[str, float]]) -> dict[str, float]:
    return {
        "left": min(rect["left"] for rect in rects),
        "right": max(rect["right"] for rect in rects),
        "top": min(rect["top"] for rect in rects),
        "bottom": max(rect["bottom"] for rect in rects),
    }


def device_body_bounds(device: Device, padding: float = 0.0) -> dict[str, float]:
    category = device_category(device)
    if category == "bus":
        rect = {"left": device.x - 52.0, "right": device.x + 52.0, "top": device.y - 10.0, "bottom": device.y + 10.0}
    elif category == "transformer":
        rect = {"left": device.x - 36.0, "right": device.x + 36.0, "top": device.y - 22.0, "bottom": device.y + 22.0}
    elif category == "source":
        rect = {"left": device.x - 30.0, "right": device.x + 30.0, "top": device.y - 30.0, "bottom": device.y + 30.0}
    elif category == "load":
        rect = {"left": device.x - 30.0, "right": device.x + 30.0, "top": device.y - 26.0, "bottom": device.y + 30.0}
    elif category == "switch":
        rect = {"left": device.x - 34.0, "right": device.x + 34.0, "top": device.y - 22.0, "bottom": device.y + 22.0}
    else:
        rect = {"left": device.x - 36.0, "right": device.x + 36.0, "top": device.y - 26.0, "bottom": device.y + 26.0}
    return expand_rect(rect, padding)


def device_label_bounds(device: Device, padding: float = 0.0) -> dict[str, float]:
    half_width = estimated_label_width(device.name or device.id) / 2.0
    rect = {"left": device.x - half_width, "right": device.x + half_width, "top": device.y + 34.0, "bottom": device.y + 56.0}
    return expand_rect(rect, padding)


def device_visual_bounds(device: Device, padding: float = 6.0) -> dict[str, float]:
    return expand_rect(union_rects([device_body_bounds(device), device_label_bounds(device)]), padding)


def rects_overlap(first: dict[str, float], second: dict[str, float], padding: float = 0.0) -> bool:
    return (
        min(first["right"], second["right"]) - max(first["left"], second["left"]) > padding
        and min(first["bottom"], second["bottom"]) - max(first["top"], second["top"]) > padding
    )


def shift_rect(rect: dict[str, float], dx: float, dy: float) -> dict[str, float]:
    return {
        "left": rect["left"] + dx,
        "right": rect["right"] + dx,
        "top": rect["top"] + dy,
        "bottom": rect["bottom"] + dy,
    }


def normalize_positions_to_positive_space(devices: list[Device], margin: float) -> None:
    if not devices:
        return
    boxes = [device_visual_bounds(device, 0.0) for device in devices]
    dx = max(0.0, margin - min(box["left"] for box in boxes))
    dy = max(0.0, margin - min(box["top"] for box in boxes))
    if dx == 0.0 and dy == 0.0:
        return
    for device in devices:
        device.x += dx
        device.y += dy


def candidate_offsets(step: float, rings: int) -> list[tuple[float, float]]:
    offsets = [(0.0, 0.0)]
    for ring in range(1, rings + 1):
        distance = step * ring
        for dx in range(-ring, ring + 1):
            offsets.append((dx * step, -distance))
            offsets.append((dx * step, distance))
        for dy in range(-ring + 1, ring):
            offsets.append((-distance, dy * step))
            offsets.append((distance, dy * step))
    return sorted(set(offsets), key=lambda item: (abs(item[0]) + abs(item[1]), abs(item[1]), abs(item[0])))


def resolve_device_overlaps(devices: list[Device], margin: float, fixed_ids: set[str] | None = None) -> None:
    fixed_ids = fixed_ids or set()
    placed: list[dict[str, float]] = []
    fixed_boxes = [device_visual_bounds(device) for device in devices if device.id in fixed_ids]
    ordered = sorted(devices, key=lambda device: (device_category(device) != "bus", category_order(device), device.y, device.x, device.id))
    offsets = candidate_offsets(72.0, 12 if len(devices) >= 240 else 8)
    for device in ordered:
        if device.id in fixed_ids:
            placed.append(device_visual_bounds(device))
            continue
        base_box = device_visual_bounds(device)
        best_offset = (0.0, 0.0)
        best_score: tuple[int, float, float] | None = None
        for dx, dy in offsets:
            candidate = shift_rect(base_box, dx, dy)
            if candidate["left"] < margin or candidate["top"] < margin:
                continue
            fixed_overlaps = sum(1 for box in fixed_boxes if rects_overlap(candidate, box))
            overlaps = sum(1 for box in placed if rects_overlap(candidate, box))
            score = (fixed_overlaps, overlaps, abs(dx) + abs(dy), abs(dy))
            if best_score is None or score < best_score:
                best_score = score
                best_offset = (dx, dy)
            if fixed_overlaps == 0 and overlaps == 0:
                break
        device.x += best_offset[0]
        device.y += best_offset[1]
        placed.append(device_visual_bounds(device))


def pack_layout_rows(devices: list[Device], margin: float, row_tolerance: float = 95.0, x_padding: float = 28.0, y_padding: float = 34.0) -> None:
    rows: list[list[Device]] = []
    for device in sorted(devices, key=lambda item: (item.y, item.x, item.id)):
        if rows:
            row_center = sum(item.y for item in rows[-1]) / len(rows[-1])
            if abs(device.y - row_center) <= row_tolerance:
                rows[-1].append(device)
                continue
        rows.append([device])

    current_top = margin
    for row in rows:
        row.sort(key=lambda item: (item.x, category_order(item), item.id))
        current_left = margin
        max_above = 0.0
        max_below = 0.0
        for device in row:
            box = device_visual_bounds(device, 0.0)
            dx = max(0.0, current_left - box["left"])
            device.x += dx
            moved_box = shift_rect(box, dx, 0.0)
            current_left = moved_box["right"] + x_padding
            max_above = max(max_above, device.y - moved_box["top"])
            max_below = max(max_below, moved_box["bottom"] - device.y)
        row_y = current_top + max_above
        for device in row:
            device.y = row_y
        current_top = row_y + max_below + y_padding


def minimum_canvas_size(device_count: int) -> tuple[float, float]:
    spread = math.sqrt(max(1, device_count))
    return max(480.0, spread * 170.0), max(320.0, spread * 130.0)


def spread_row(items: list[Device], center_x: float, y: float, spacing: float) -> None:
    start_x = center_x - (len(items) - 1) * spacing / 2.0
    for index, item in enumerate(items):
        item.x = start_x + index * spacing
        item.y = y


def place_attached_devices_near_buses(
    attached: dict[str, list[Device]],
    bus_by_id: dict[str, Device],
    x_gap: float,
    y_gap: float,
) -> None:
    for bus_id, items in attached.items():
        bus = bus_by_id[bus_id]
        items.sort(key=lambda item: (category_order(item), item.id))
        top_items = [item for item in items if device_category(item) == "source"]
        bottom_items = [item for item in items if device_category(item) != "source"]
        spread_row(top_items, bus.x, bus.y - max(105.0, y_gap * 0.86), max(104.0, x_gap * 0.5))
        spread_row(bottom_items, bus.x, bus.y + max(112.0, y_gap * 0.92), max(104.0, x_gap * 0.5))


def place_serial_devices_between_buses(
    serial_devices: list[Device],
    neighbor_by_device: dict[str, list[str]],
    bus_by_id: dict[str, Device],
    y_gap: float,
) -> None:
    pair_counts: dict[tuple[str, str], int] = defaultdict(int)
    pair_indexes: dict[tuple[str, str], int] = defaultdict(int)
    serial_bus_neighbors: dict[str, list[str]] = {}
    for device in serial_devices:
        bus_neighbors = [neighbor for neighbor in neighbor_by_device.get(device.id, []) if neighbor in bus_by_id]
        if len(bus_neighbors) < 2:
            continue
        ordered = sorted(bus_neighbors[:2])
        pair = (ordered[0], ordered[1])
        serial_bus_neighbors[device.id] = ordered
        pair_counts[pair] += 1

    for device in serial_devices:
        bus_neighbors = serial_bus_neighbors.get(device.id)
        if not bus_neighbors:
            continue
        first = bus_by_id[bus_neighbors[0]]
        second = bus_by_id[bus_neighbors[1]]
        pair = (bus_neighbors[0], bus_neighbors[1])
        pair_index = pair_indexes[pair]
        pair_indexes[pair] += 1
        pair_count = pair_counts[pair]
        offset = (pair_index - (pair_count - 1) / 2.0) * max(84.0, y_gap * 0.7)
        device.x = (first.x + second.x) / 2.0
        device.y = (first.y + second.y) / 2.0 + offset


def push_attached_devices_out_of_overlaps(
    attached: dict[str, list[Device]],
    bus_by_id: dict[str, Device],
    devices: list[Device],
) -> None:
    for bus_id, items in attached.items():
        bus = bus_by_id[bus_id]
        for item in items:
            direction = -1.0 if device_category(item) == "source" else 1.0
            for _ in range(12):
                item_box = device_visual_bounds(item)
                overlaps = [
                    device
                    for device in devices
                    if device.id != item.id and rects_overlap(item_box, device_visual_bounds(device))
                ]
                if not overlaps:
                    break
                item.y += direction * 72.0
                if direction < 0:
                    item.y = min(item.y, bus.y - 112.0)
                else:
                    item.y = max(item.y, bus.y + 120.0)


def separate_remaining_overlaps(devices: list[Device], margin: float, fixed_ids: set[str] | None = None, passes: int = 8) -> None:
    fixed_ids = fixed_ids or set()
    offsets = candidate_offsets(48.0, 26 if len(devices) >= 240 else 12)
    for _ in range(passes):
        moved = False
        boxes_by_id = {device.id: device_visual_bounds(device) for device in devices}
        overlapped_ids = {
            first.id
            for first in devices
            if first.id not in fixed_ids
            for second in devices
            if first.id != second.id and rects_overlap(boxes_by_id[first.id], boxes_by_id[second.id])
        }
        ordered = sorted(
            (device for device in devices if device.id in overlapped_ids),
            key=lambda device: (-category_order(device), device.y, device.x, device.id)
        )
        for device in ordered:
            original = (device.x, device.y)
            base_box = device_visual_bounds(device)
            best_offset = (0.0, 0.0)
            best_score: tuple[int, int, float] | None = None
            for dx, dy in offsets:
                candidate = shift_rect(base_box, dx, dy)
                if candidate["left"] < margin or candidate["top"] < margin:
                    continue
                fixed_overlaps = 0
                overlaps = 0
                for other in devices:
                    if other.id == device.id:
                        continue
                    if rects_overlap(candidate, device_visual_bounds(other)):
                        overlaps += 1
                        if other.id in fixed_ids:
                            fixed_overlaps += 1
                score = (fixed_overlaps, overlaps, abs(dx) + abs(dy))
                if best_score is None or score < best_score:
                    best_score = score
                    best_offset = (dx, dy)
                if fixed_overlaps == 0 and overlaps == 0:
                    break
            if best_offset != (0.0, 0.0):
                device.x = original[0] + best_offset[0]
                device.y = original[1] + best_offset[1]
                moved = True
        if not moved:
            break


def segment_intersects_rect(start: tuple[float, float], end: tuple[float, float], rect: dict[str, float]) -> bool:
    if rect["left"] <= start[0] <= rect["right"] and rect["top"] <= start[1] <= rect["bottom"]:
        return True
    if rect["left"] <= end[0] <= rect["right"] and rect["top"] <= end[1] <= rect["bottom"]:
        return True
    if abs(start[0] - end[0]) < 1e-6:
        x = start[0]
        top = min(start[1], end[1])
        bottom = max(start[1], end[1])
        return rect["left"] <= x <= rect["right"] and max(top, rect["top"]) < min(bottom, rect["bottom"])
    if abs(start[1] - end[1]) < 1e-6:
        y = start[1]
        left = min(start[0], end[0])
        right = max(start[0], end[0])
        return rect["top"] <= y <= rect["bottom"] and max(left, rect["left"]) < min(right, rect["right"])
    return False


def polyline_segments(points: list[tuple[float, float]]) -> list[tuple[tuple[float, float], tuple[float, float]]]:
    return list(zip(points, points[1:]))


def segments_cross(
    first_start: tuple[float, float],
    first_end: tuple[float, float],
    second_start: tuple[float, float],
    second_end: tuple[float, float],
) -> bool:
    first_vertical = abs(first_start[0] - first_end[0]) < 1e-6
    second_vertical = abs(second_start[0] - second_end[0]) < 1e-6
    if first_vertical == second_vertical:
        return False
    vertical_start, vertical_end, horizontal_start, horizontal_end = (
        (first_start, first_end, second_start, second_end)
        if first_vertical
        else (second_start, second_end, first_start, first_end)
    )
    x = vertical_start[0]
    y = horizontal_start[1]
    if not (min(vertical_start[1], vertical_end[1]) < y < max(vertical_start[1], vertical_end[1])):
        return False
    if not (min(horizontal_start[0], horizontal_end[0]) < x < max(horizontal_start[0], horizontal_end[0])):
        return False
    return (x, y) not in {first_start, first_end, second_start, second_end}


def compact_polyline(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    compact: list[tuple[float, float]] = []
    for point in points:
        if not compact or abs(compact[-1][0] - point[0]) > 1e-6 or abs(compact[-1][1] - point[1]) > 1e-6:
            compact.append(point)
    if len(compact) <= 2:
        return compact
    simplified = [compact[0]]
    for index in range(1, len(compact) - 1):
        point = compact[index]
        previous = simplified[-1]
        next_point = compact[index + 1]
        if (abs(previous[0] - point[0]) < 1e-6 and abs(point[0] - next_point[0]) < 1e-6) or (
            abs(previous[1] - point[1]) < 1e-6 and abs(point[1] - next_point[1]) < 1e-6
        ):
            continue
        simplified.append(point)
    simplified.append(compact[-1])
    return simplified


def candidate_route_points(
    start: tuple[float, float],
    end: tuple[float, float],
    lane: int,
    obstacles: list[dict[str, float]],
) -> list[list[tuple[float, float]]]:
    min_left = min([start[0], end[0], *[rect["left"] for rect in obstacles]], default=min(start[0], end[0]))
    max_right = max([start[0], end[0], *[rect["right"] for rect in obstacles]], default=max(start[0], end[0]))
    min_top = min([start[1], end[1], *[rect["top"] for rect in obstacles]], default=min(start[1], end[1]))
    max_bottom = max([start[1], end[1], *[rect["bottom"] for rect in obstacles]], default=max(start[1], end[1]))
    lane_offset = (lane % 5 - 2) * 28.0
    mid_x = (start[0] + end[0]) / 2.0 + lane_offset
    mid_y = (start[1] + end[1]) / 2.0 + lane_offset
    x_lanes = [mid_x, min_left - 70.0 - lane * 18.0, max_right + 70.0 + lane * 18.0]
    y_lanes = [mid_y, min_top - 70.0 - lane * 18.0, max_bottom + 70.0 + lane * 18.0]
    x_lanes.extend(rect["left"] - 38.0 for rect in obstacles)
    x_lanes.extend(rect["right"] + 38.0 for rect in obstacles)
    y_lanes.extend(rect["top"] - 38.0 for rect in obstacles)
    y_lanes.extend(rect["bottom"] + 38.0 for rect in obstacles)
    x_lanes = sorted(set(x_lanes), key=lambda x: abs(x - mid_x))[:14]
    y_lanes = sorted(set(y_lanes), key=lambda y: abs(y - mid_y))[:14]
    candidates: list[list[tuple[float, float]]] = []
    for x in x_lanes:
        candidates.append(compact_polyline([start, (x, start[1]), (x, end[1]), end]))
    for y in y_lanes:
        candidates.append(compact_polyline([start, (start[0], y), (end[0], y), end]))
    return candidates


def route_score(
    points: list[tuple[float, float]],
    obstacles: list[dict[str, float]],
    existing_segments: list[tuple[tuple[float, float], tuple[float, float]]],
) -> tuple[int, int, float, int]:
    obstacle_hits = sum(
        1
        for start, end in polyline_segments(points)
        for obstacle in obstacles
        if segment_intersects_rect(start, end, obstacle)
    )
    crossings = sum(
        1
        for start, end in polyline_segments(points)
        for existing_start, existing_end in existing_segments
        if segments_cross(start, end, existing_start, existing_end)
    )
    length = sum(math.hypot(end[0] - start[0], end[1] - start[1]) for start, end in polyline_segments(points))
    return obstacle_hits, crossings, length, len(points)


def minimize_crossing_order(
    component: list[str],
    rank: dict[str, int],
    device_by_id: dict[str, Device],
    adjacency: dict[str, list[str]],
    passes: int = 8,
) -> dict[int, list[str]]:
    groups = rank_groups(component, rank)
    for rank_id, ids in groups.items():
        groups[rank_id] = sorted(ids, key=lambda item: (category_order(device_by_id[item]), item))

    ranks = sorted(groups)
    for _ in range(passes):
        for direction in (1, -1):
            scan = ranks[1:] if direction == 1 else list(reversed(ranks[:-1]))
            for rank_id in scan:
                previous_rank = rank_id - direction
                if previous_rank not in groups:
                    continue
                previous_order = {device_id: index for index, device_id in enumerate(groups[previous_rank])}

                def barycenter(device_id: str) -> tuple[float, int, str]:
                    neighbors = [previous_order[item] for item in adjacency[device_id] if item in previous_order]
                    bary = sum(neighbors) / len(neighbors) if neighbors else math.inf
                    return bary, category_order(device_by_id[device_id]), device_id

                groups[rank_id] = sorted(groups[rank_id], key=barycenter)
    return groups


def layout_devices(
    devices: list[Device],
    connections: list[Connection],
    x_gap: float,
    y_gap: float,
    margin: float,
    component_gap: float,
) -> tuple[float, float]:
    device_by_id = {device.id: device for device in devices}
    adjacency = build_adjacency(devices, connections)
    components = connected_components(devices, connections)
    y_offset = margin
    max_width = 0.0

    for component in components:
        roots = choose_roots(component, device_by_id, adjacency)
        rank = assign_ranks(component, roots, adjacency)
        groups = minimize_crossing_order(component, rank, device_by_id, adjacency)
        rank_ids = sorted(groups)
        component_height = max((len(groups[rank_id]) for rank_id in rank_ids), default=1) * y_gap
        for rank_index, rank_id in enumerate(rank_ids):
            ids = groups[rank_id]
            column_height = max(1, len(ids) - 1) * y_gap
            column_y0 = y_offset + max(0.0, (component_height - column_height) / 2.0)
            for order, device_id in enumerate(ids):
                device = device_by_id[device_id]
                device.rank = rank_index
                device.order = order
                device.x = margin + rank_index * x_gap
                device.y = column_y0 + order * y_gap
        max_width = max(max_width, margin * 2 + max(0, len(rank_ids) - 1) * x_gap)
        y_offset += component_height + component_gap

    normalize_positions_to_positive_space(devices, margin)
    resolve_device_overlaps(devices, margin)
    pack_layout_rows(devices, margin)
    normalize_positions_to_positive_space(devices, margin)
    visual_bounds = [device_visual_bounds(device, 0.0) for device in devices]
    min_width, min_height = minimum_canvas_size(len(devices))
    width = max(max_width, max((box["right"] for box in visual_bounds), default=0.0) + margin)
    height = max(y_offset + margin, max((box["bottom"] for box in visual_bounds), default=0.0) + margin)
    return max(min_width, width), max(min_height, height)


def layout_e_model_devices(
    devices: list[Device],
    connections: list[Connection],
    x_gap: float,
    y_gap: float,
    margin: float,
    component_gap: float,
) -> tuple[float, float]:
    buses = [device for device in devices if device.kind == "ac-bus"]
    if not buses:
        return layout_devices(devices, connections, x_gap, y_gap, margin, component_gap)

    bus_ids = {device.id for device in buses}
    neighbor_by_device: dict[str, list[str]] = defaultdict(list)
    for edge in connections:
        neighbor_by_device[edge.source].append(edge.target)
        neighbor_by_device[edge.target].append(edge.source)
    bus_connections = [
        edge for edge in connections
        if edge.source in bus_ids and edge.target in bus_ids
    ]
    for device in devices:
        if device.id in bus_ids:
            continue
        bus_neighbors = [neighbor for neighbor in neighbor_by_device.get(device.id, []) if neighbor in bus_ids]
        if len(bus_neighbors) >= 2:
            bus_connections.append(Connection(id=f"layout-{device.id}", source=bus_neighbors[0], target=bus_neighbors[1]))
    bus_width, bus_height = layout_devices(buses, bus_connections, x_gap, y_gap, margin, component_gap)
    bus_by_id = {bus.id: bus for bus in buses}
    attached: dict[str, list[Device]] = defaultdict(list)
    serial_devices: list[Device] = []
    device_by_id = {device.id: device for device in devices}

    for device in devices:
        if device.id in bus_ids:
            continue
        neighbors = neighbor_by_device.get(device.id, [])
        bus_neighbors = [neighbor for neighbor in neighbors if neighbor in bus_ids]
        if len(bus_neighbors) >= 2:
            serial_devices.append(device)
            first = bus_by_id[bus_neighbors[0]]
            second = bus_by_id[bus_neighbors[1]]
            device.x = (first.x + second.x) / 2
            device.y = (first.y + second.y) / 2
            continue
        if bus_neighbors:
            attached[bus_neighbors[0]].append(device)
            continue
        serial_devices.append(device)

    place_attached_devices_near_buses(attached, bus_by_id, x_gap, y_gap)

    unplaced = [device for device in devices if device.id not in bus_ids and abs(device.x) < 1e-6 and abs(device.y) < 1e-6]
    for index, device in enumerate(unplaced):
        device.x = margin + (index % 8) * 110
        device.y = bus_height + component_gap + (index // 8) * 90

    normalize_positions_to_positive_space(devices, margin)
    resolve_device_overlaps(devices, margin)
    pack_layout_rows(devices, margin)
    place_serial_devices_between_buses(serial_devices, neighbor_by_device, bus_by_id, y_gap)
    place_attached_devices_near_buses(attached, bus_by_id, x_gap, y_gap)
    resolve_device_overlaps(devices, margin, bus_ids)
    resolve_device_overlaps(devices, margin, bus_ids)
    push_attached_devices_out_of_overlaps(attached, bus_by_id, devices)
    resolve_device_overlaps(devices, margin, bus_ids)
    separate_remaining_overlaps(devices, margin, bus_ids)
    normalize_positions_to_positive_space(devices, margin)
    visual_bounds = [device_visual_bounds(device, 0.0) for device in devices]
    width = max(bus_width, max((box["right"] for box in visual_bounds), default=0) + margin)
    height = max(bus_height, max((box["bottom"] for box in visual_bounds), default=0) + margin)
    min_width, min_height = minimum_canvas_size(len(devices))
    return max(min_width, width), max(min_height, height)


def route_connections(devices: list[Device], connections: list[Connection]) -> None:
    device_by_id = {device.id: device for device in devices}
    body_bounds_by_id = {device.id: device_body_bounds(device, 10.0) for device in devices}
    lane_counter: dict[tuple[int, int], int] = defaultdict(int)
    existing_segments: list[tuple[tuple[float, float], tuple[float, float]]] = []
    for edge in connections:
        source = device_by_id[edge.source]
        target = device_by_id[edge.target]
        left, right = (source, target) if source.x <= target.x else (target, source)
        start = (source.x, source.y)
        end = (target.x, target.y)
        search_padding = max(260.0, min(720.0, math.hypot(end[0] - start[0], end[1] - start[1]) * 0.24))
        search_rect = {
            "left": min(start[0], end[0]) - search_padding,
            "right": max(start[0], end[0]) + search_padding,
            "top": min(start[1], end[1]) - search_padding,
            "bottom": max(start[1], end[1]) + search_padding,
        }
        obstacles = [
            bounds
            for device_id, bounds in body_bounds_by_id.items()
            if device_id not in {source.id, target.id} and rects_overlap(bounds, search_rect)
        ]
        if abs(source.x - target.x) < 1e-6:
            lane_key = (int(source.x), int(min(source.y, target.y) // 10))
        else:
            lane_key = (int(left.rank), int(right.rank))
        lane = lane_counter[lane_key]
        lane_counter[lane_key] += 1
        candidates = candidate_route_points(start, end, lane, obstacles)
        edge.points = min(candidates, key=lambda points: route_score(points, obstacles, existing_segments[-600:]))
        existing_segments.extend(polyline_segments(edge.points))


def svg_path(points: list[tuple[float, float]]) -> str:
    if not points:
        return ""
    head, *tail = points
    parts = [f"M {head[0]:.1f} {head[1]:.1f}"]
    parts.extend(f"L {x:.1f} {y:.1f}" for x, y in tail)
    return " ".join(parts)


def svg_device(device: Device) -> str:
    category = device_category(device)
    label = html.escape(device.name or device.id)
    title = html.escape(f"{device.id} / {device.kind}")
    x = device.x
    y = device.y
    if category == "bus":
        body = f'<line x1="{x - 46:.1f}" y1="{y:.1f}" x2="{x + 46:.1f}" y2="{y:.1f}" class="node-bus"/>'
    elif category == "transformer":
        body = (
            f'<circle cx="{x - 13:.1f}" cy="{y:.1f}" r="18" class="node-fill"/>'
            f'<circle cx="{x + 13:.1f}" cy="{y:.1f}" r="18" class="node-fill"/>'
        )
    elif category == "source":
        body = f'<circle cx="{x:.1f}" cy="{y:.1f}" r="26" class="node-fill"/>'
    elif category == "load":
        body = f'<path d="M {x - 26:.1f} {y - 22:.1f} L {x + 26:.1f} {y - 22:.1f} L {x:.1f} {y + 26:.1f} Z" class="node-fill"/>'
    elif category == "switch":
        body = f'<rect x="{x - 30:.1f}" y="{y - 18:.1f}" width="60" height="36" rx="4" class="node-fill"/>'
    elif "shunt" in lower_blob(device):
        body = f'<path d="M {x:.1f} {y - 24:.1f} L {x:.1f} {y + 24:.1f} M {x - 18:.1f} {y + 24:.1f} L {x + 18:.1f} {y + 24:.1f}" class="node-fill"/>'
    else:
        body = f'<rect x="{x - 32:.1f}" y="{y - 22:.1f}" width="64" height="44" rx="5" class="node-fill"/>'
    return (
        f'<g id="{html.escape(device.id)}" class="node node-{category}">'
        f"<title>{title}</title>"
        f"{body}"
        f'<text x="{x:.1f}" y="{y + 48:.1f}" text-anchor="middle">{label}</text>'
        "</g>"
    )


def write_svg(path: Path, devices: list[Device], connections: list[Connection], width: float, height: float) -> None:
    edge_markup = "\n".join(
        f'<path id="{html.escape(edge.id)}" class="edge" d="{svg_path(edge.points)}"><title>{html.escape(edge.source)} -> {html.escape(edge.target)}</title></path>'
        for edge in connections
    )
    node_markup = "\n".join(svg_device(device) for device in devices)
    content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width:.0f}" height="{height:.0f}" viewBox="0 0 {width:.0f} {height:.0f}">
<style>
  svg {{ background: #f8fafc; font-family: Arial, "Microsoft YaHei", sans-serif; }}
  .edge {{ fill: none; stroke: #334155; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }}
  .node-fill {{ fill: #ffffff; stroke: #0f172a; stroke-width: 2; }}
  .node-bus {{ stroke: #0f172a; stroke-width: 6; stroke-linecap: square; }}
  .node-source .node-fill {{ fill: #eff6ff; stroke: #2563eb; }}
  .node-transformer .node-fill {{ fill: #fff7ed; stroke: #ea580c; }}
  .node-switch .node-fill {{ fill: #f8fafc; stroke: #475569; }}
  .node-load .node-fill {{ fill: #fef2f2; stroke: #dc2626; }}
  .node-device .node-fill {{ fill: #f8fafc; stroke: #64748b; }}
  text {{ fill: #1e293b; font-size: 13px; }}
</style>
<g id="edges">
{edge_markup}
</g>
<g id="nodes">
{node_markup}
</g>
</svg>
'''
    path.write_text(content, encoding="utf-8")


def write_layout_json(path: Path, devices: list[Device], connections: list[Connection], width: float, height: float) -> None:
    payload = {
        "canvas": {"width": round(width, 2), "height": round(height, 2)},
        "nodes": [
            {
                "id": device.id,
                "name": device.name,
                "kind": device.kind,
                "category": device_category(device),
                "x": round(device.x, 2),
                "y": round(device.y, 2),
                "rank": device.rank,
                "order": device.order,
            }
            for device in devices
        ],
        "edges": [
            {
                "id": edge.id,
                "source": edge.source,
                "target": edge.target,
                "points": [{"x": round(x, 2), "y": round(y, 2)} for x, y in edge.points],
            }
            for edge in connections
        ],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate an orthogonal power-grid topology SVG from JSON.")
    parser.add_argument("input", type=Path, help="Input model JSON or E model file.")
    parser.add_argument("--format", choices=("auto", "json", "e"), default="auto", help="Input format.")
    parser.add_argument("--svg", type=Path, default=None, help="Output SVG path. Defaults to <input>.topology.svg.")
    parser.add_argument("--layout-json", type=Path, default=None, help="Output layout JSON path. Defaults to <input>.layout.json.")
    parser.add_argument("--x-gap", type=float, default=210.0, help="Horizontal distance between topology layers.")
    parser.add_argument("--y-gap", type=float, default=120.0, help="Vertical distance between nodes in one layer.")
    parser.add_argument("--margin", type=float, default=90.0, help="Canvas margin.")
    parser.add_argument("--component-gap", type=float, default=170.0, help="Vertical gap between disconnected components.")
    args = parser.parse_args()

    input_format = args.format
    if input_format == "auto":
        input_format = "e" if args.input.suffix.lower() == ".e" else "json"

    if input_format == "e":
        devices, connections = e_sections_to_model(parse_e_file(args.input))
        width, height = layout_e_model_devices(devices, connections, args.x_gap, args.y_gap, args.margin, args.component_gap)
    else:
        model = json.loads(args.input.read_text(encoding="utf-8-sig"))
        if not isinstance(model, dict):
            raise ValueError("Input JSON root must be an object.")
        devices = read_devices(model)
        connections = read_connections(model, {device.id for device in devices})
        width, height = layout_devices(devices, connections, args.x_gap, args.y_gap, args.margin, args.component_gap)
    route_connections(devices, connections)

    svg_path_out = args.svg or args.input.with_suffix(".topology.svg")
    layout_path_out = args.layout_json or args.input.with_suffix(".layout.json")
    write_svg(svg_path_out, devices, connections, width, height)
    write_layout_json(layout_path_out, devices, connections, width, height)
    print(f"devices={len(devices)} connections={len(connections)}")
    print(f"svg={svg_path_out}")
    print(f"layout_json={layout_path_out}")


if __name__ == "__main__":
    main()
