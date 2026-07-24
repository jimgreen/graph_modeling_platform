import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("grid_topology_layout.py")
SPEC = importlib.util.spec_from_file_location("grid_topology_layout", MODULE_PATH)
layout = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = layout
SPEC.loader.exec_module(layout)


def rects_overlap(first, second, padding=0.0):
    return (
        min(first["right"], second["right"]) - max(first["left"], second["left"]) > padding
        and min(first["bottom"], second["bottom"]) - max(first["top"], second["top"]) > padding
    )


def segment_intersects_rect(a, b, rect):
    if rect["left"] <= a[0] <= rect["right"] and rect["top"] <= a[1] <= rect["bottom"]:
        return True
    if rect["left"] <= b[0] <= rect["right"] and rect["top"] <= b[1] <= rect["bottom"]:
        return True
    if abs(a[0] - b[0]) < 1e-6:
        x = a[0]
        top = min(a[1], b[1])
        bottom = max(a[1], b[1])
        return rect["left"] <= x <= rect["right"] and max(top, rect["top"]) < min(bottom, rect["bottom"])
    if abs(a[1] - b[1]) < 1e-6:
        y = a[1]
        left = min(a[0], b[0])
        right = max(a[0], b[0])
        return rect["top"] <= y <= rect["bottom"] and max(left, rect["left"]) < min(right, rect["right"])
    return False


class GridTopologyLayoutTest(unittest.TestCase):
    def test_attached_devices_are_spaced_without_overlap(self):
        devices = [layout.Device(id="bus-1", name="Bus 1", kind="ac-bus")]
        connections = []
        for index in range(8):
            device_id = f"ACGenerator-G{index + 1}"
            devices.append(layout.Device(id=device_id, name=f"Generator {index + 1}", kind="ac-source"))
            connections.append(layout.Connection(id=f"edge-gen-{index + 1}", source=device_id, target="bus-1"))
        for index in range(8):
            device_id = f"ACLoad-L{index + 1}"
            devices.append(layout.Device(id=device_id, name=f"Load {index + 1}", kind="ac-load"))
            connections.append(layout.Connection(id=f"edge-load-{index + 1}", source=device_id, target="bus-1"))

        width, height = layout.layout_e_model_devices(devices, connections, 210.0, 120.0, 90.0, 170.0)
        layout.route_connections(devices, connections)
        boxes = [layout.device_visual_bounds(device) for device in devices]

        self.assertGreater(width, 700.0)
        self.assertGreater(height, 500.0)
        for index, first in enumerate(boxes):
            for second in boxes[index + 1:]:
                self.assertFalse(rects_overlap(first, second), (first, second))

    def test_routes_avoid_unrelated_device_bodies(self):
        devices = [
            layout.Device(id="bus-1", name="Bus 1", kind="ac-bus", x=100.0, y=100.0),
            layout.Device(id="bus-2", name="Bus 2", kind="ac-bus", x=500.0, y=100.0),
            layout.Device(id="ACLoad-middle", name="Middle Load", kind="ac-load", x=300.0, y=100.0),
        ]
        connections = [layout.Connection(id="line-1", source="bus-1", target="bus-2")]

        layout.route_connections(devices, connections)
        obstacle = layout.device_body_bounds(devices[2], padding=8.0)
        points = connections[0].points

        for start, end in zip(points, points[1:]):
            self.assertFalse(segment_intersects_rect(start, end, obstacle), points)

    def test_connected_attached_devices_stay_near_their_bus(self):
        devices = [layout.Device(id="bus-1", name="Bus 1", kind="ac-bus")]
        connections = []
        for index in range(5):
            device_id = f"ACGenerator-G{index + 1}"
            devices.append(layout.Device(id=device_id, name=f"Generator {index + 1}", kind="ac-source"))
            connections.append(layout.Connection(id=f"edge-gen-{index + 1}", source=device_id, target="bus-1"))
        for index in range(5):
            device_id = f"ACLoad-L{index + 1}"
            devices.append(layout.Device(id=device_id, name=f"Load {index + 1}", kind="ac-load"))
            connections.append(layout.Connection(id=f"edge-load-{index + 1}", source=device_id, target="bus-1"))

        layout.layout_e_model_devices(devices, connections, 210.0, 120.0, 90.0, 170.0)
        bus = next(device for device in devices if device.id == "bus-1")

        for edge in connections:
            device_id = edge.source if edge.target == "bus-1" else edge.target
            device = next(item for item in devices if item.id == device_id)
            distance = ((device.x - bus.x) ** 2 + (device.y - bus.y) ** 2) ** 0.5
            self.assertLessEqual(distance, 360.0, (device.id, device.x, device.y, bus.x, bus.y, distance))

    def test_two_terminal_devices_stay_between_connected_buses(self):
        devices = [
            layout.Device(id="bus-1", name="Bus 1", kind="ac-bus"),
            layout.Device(id="bus-2", name="Bus 2", kind="ac-bus"),
            layout.Device(id="bus-3", name="Bus 3", kind="ac-bus"),
            layout.Device(id="xf-1", name="Transformer 1", kind="ac-transformer"),
            layout.Device(id="xf-2", name="Transformer 2", kind="ac-transformer"),
        ]
        connections = [
            layout.Connection(id="bus-edge-1", source="bus-1", target="bus-2"),
            layout.Connection(id="bus-edge-2", source="bus-2", target="bus-3"),
            layout.Connection(id="xf-1-i", source="bus-1", target="xf-1"),
            layout.Connection(id="xf-1-j", source="xf-1", target="bus-2"),
            layout.Connection(id="xf-2-i", source="bus-2", target="xf-2"),
            layout.Connection(id="xf-2-j", source="xf-2", target="bus-3"),
        ]

        layout.layout_e_model_devices(devices, connections, 210.0, 120.0, 90.0, 170.0)
        by_id = {device.id: device for device in devices}

        for device_id, first_bus_id, second_bus_id in [("xf-1", "bus-1", "bus-2"), ("xf-2", "bus-2", "bus-3")]:
            device = by_id[device_id]
            first_bus = by_id[first_bus_id]
            second_bus = by_id[second_bus_id]
            midpoint_x = (first_bus.x + second_bus.x) / 2
            midpoint_y = (first_bus.y + second_bus.y) / 2
            distance = ((device.x - midpoint_x) ** 2 + (device.y - midpoint_y) ** 2) ** 0.5
            self.assertLessEqual(distance, 180.0, (device_id, device.x, device.y, midpoint_x, midpoint_y, distance))

    def test_route_prefers_device_free_path_even_when_it_is_longer(self):
        devices = [
            layout.Device(id="bus-1", name="Bus 1", kind="ac-bus", x=100.0, y=100.0),
            layout.Device(id="bus-2", name="Bus 2", kind="ac-bus", x=500.0, y=100.0),
            layout.Device(id="block-1", name="Block 1", kind="ac-load", x=230.0, y=100.0),
            layout.Device(id="block-2", name="Block 2", kind="ac-load", x=300.0, y=100.0),
            layout.Device(id="block-3", name="Block 3", kind="ac-load", x=370.0, y=100.0),
        ]
        connections = [layout.Connection(id="line-1", source="bus-1", target="bus-2")]

        layout.route_connections(devices, connections)
        body_bounds = {device.id: layout.device_body_bounds(device, 8.0) for device in devices}
        hits = 0
        for start, end in zip(connections[0].points, connections[0].points[1:]):
            for device_id, rect in body_bounds.items():
                if device_id not in {"bus-1", "bus-2"} and segment_intersects_rect(start, end, rect):
                    hits += 1
        self.assertEqual(hits, 0, connections[0].points)

    def test_serial_and_attached_devices_do_not_overlap_after_local_compaction(self):
        devices = [
            layout.Device(id="bus-1", name="Bus 1", kind="ac-bus"),
            layout.Device(id="bus-2", name="Bus 2", kind="ac-bus"),
            layout.Device(id="xf-1", name="Transformer 1", kind="ac-transformer"),
            layout.Device(id="load-1", name="Load 1", kind="ac-load"),
        ]
        connections = [
            layout.Connection(id="bus-edge-1", source="bus-1", target="bus-2"),
            layout.Connection(id="xf-1-i", source="bus-1", target="xf-1"),
            layout.Connection(id="xf-1-j", source="xf-1", target="bus-2"),
            layout.Connection(id="load-1-edge", source="load-1", target="bus-2"),
        ]

        layout.layout_e_model_devices(devices, connections, 210.0, 120.0, 90.0, 170.0)
        transformer = next(device for device in devices if device.id == "xf-1")
        load = next(device for device in devices if device.id == "load-1")

        self.assertFalse(
            rects_overlap(layout.device_visual_bounds(transformer), layout.device_visual_bounds(load)),
            (transformer.x, transformer.y, load.x, load.y),
        )

    def test_final_overlap_separator_moves_small_device_away_from_larger_neighbor(self):
        devices = [
            layout.Device(id="xf-1", name="Transformer 1", kind="ac-transformer", x=320.0, y=120.0),
            layout.Device(id="load-1", name="Load 1", kind="ac-load", x=312.0, y=160.0),
        ]

        layout.separate_remaining_overlaps(devices, margin=90.0)

        self.assertFalse(
            rects_overlap(layout.device_visual_bounds(devices[0]), layout.device_visual_bounds(devices[1])),
            [(device.id, device.x, device.y, layout.device_visual_bounds(device)) for device in devices],
        )


if __name__ == "__main__":
    unittest.main()
