# CVR-H1 3D Kinematic Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可计算、可渲染、可扫参的 CVR-H1 双叶轮三维运动学模型，验证 2.2 m 连续短轴、上下各 1.0 m 纵向展开、1.5 m 径向行程、满转速调径传动和收拢/展开包络是否相互兼容。

**Architecture:** Python 是参数、运动学、包络、干涉和载荷计算的唯一数据源；它生成 OpenSCAD 参数文件、状态 CSV/JSON 和验收报告。OpenSCAD 只负责可视化实体和 STL/PNG 导出。模型同时保留批准的 `RP-1500` 1:1 基线和短轴紧凑候选 `RP-1100`，后者以 1100 mm 控制环行程驱动 1500 mm 径向行程，依据虚功关系自动复核控制力。

**Tech Stack:** Python 3.11、pytest 9、OpenSCAD 2021.01、Pillow 12、CSV/JSON、GitNexus CLI。

---

## Scope Boundary

本计划只交付三维运动学与概念级载荷接口，不交付可制造齿形、轴承座加工图、液压阀块、CFD、FEA 网格或现场控制程序。后续工作拆成四个独立计划：

1. `CVR-H1-RP` 齿条/换向齿轮详细强度与制造模型；
2. 100/150 kN 液压、蓄能器和失压回收模型；
3. 全半径-全转速 FEA/Campbell 模型；
4. 功率图和半径控制状态机。

## File Map

| File | Responsibility |
|---|---|
| `scripts/cvr_h1_parameters.py` | 冻结尺寸、质量、液压和两种传动变体参数；执行参数自检 |
| `scripts/cvr_h1_kinematics.py` | 纯函数运动学、包络、叶片截面多边形、间隙和载荷计算 |
| `scripts/test_cvr_h1_parameters.py` | 参数边界和传动变体测试 |
| `scripts/test_cvr_h1_kinematics.py` | 状态端点、镜像关系、包络、干涉和载荷回归测试 |
| `scripts/generate_cvr_h1_model_data.py` | 生成 SCAD 参数、状态 CSV/JSON 和 Markdown 结果表 |
| `scripts/render_cvr_h1_model.py` | 调用 OpenSCAD 导出 PNG/STL，并用 Pillow 生成状态拼图和 GIF |
| `docs/cvr_h1_parameters.generated.scad` | 由 Python 生成、供 OpenSCAD include 的参数快照 |
| `docs/vertical_axis_turbine_cvr_h1_kinematics.scad` | 双叶轮、短主轴、嵌套轮毂、控制环、齿条、导轨、叶片和支撑笼三维模型 |
| `docs/cvr_h1_3d_kinematic_model_v1_11.md` | 模型假设、状态定义、结果、风险和架构选择结论 |
| `output/vertical_axis_turbine/cvr_h1/` | 自动生成的 CSV、JSON、PNG、GIF、STL 和扫描报告，不在手工编辑中维护 |

## Frozen Modeling Conventions

- 所有内部长度单位为 `mm`，力为 `N`，压力为 `MPa`，转速为 `rpm`。
- `axial_progress` 的闭区间为 `[0,1]`，控制上下叶轮中心从 `z=0` 移到 `z=+1000/-1000 mm`。
- `radial_progress` 的闭区间为 `[0,1]`，控制叶片参考半径从 `500` 移到 `2000 mm`。
- 上下叶轮相位固定为 `60 deg`，共同转角由 `spin_angle_deg` 控制。
- `Dref=2R` 是运动学参考直径；`Dphysical` 由叶片截面角点计算。二者必须同时报告。
- 收拢叶轮扫风高度为 `2000 mm`，但 2.2 m 主轴使收拢整机结构高度至少为 `2200 mm`；报告不得把二者混为一项。
- 叶片截面初值为弦长 `250 mm`、径向厚度 `50 mm`，只用于包络和干涉，不代表最终气动叶型。
- `RP-1500`：控制环行程 1500 mm、`dR/dz=1.0`，保持现有设计规格基线。
- `RP-1100`：控制环行程 1100 mm、`dR/dz=1.363636`，控制环在展开状态从整机中面移动到主轴端部。

### Task 1: Parameter Contract And Variant Validation

**Files:**
- Create: `scripts/cvr_h1_parameters.py`
- Create: `scripts/test_cvr_h1_parameters.py`

- [ ] **Step 1: Write the failing parameter tests**

```python
from dataclasses import replace

from cvr_h1_parameters import DEFAULT, VARIANTS, validate_parameters


def test_default_geometry_matches_frozen_spec():
    assert DEFAULT.shaft_length_mm == 2200.0
    assert DEFAULT.blade_height_mm == 2000.0
    assert DEFAULT.rotor_axial_travel_mm == 1000.0
    assert DEFAULT.radius_min_mm == 500.0
    assert DEFAULT.radius_max_mm == 2000.0
    assert DEFAULT.phase_delta_deg == 60.0


def test_both_drive_variants_are_defined():
    assert set(VARIANTS) == {"RP-1500", "RP-1100"}
    assert VARIANTS["RP-1500"].control_stroke_mm == 1500.0
    assert VARIANTS["RP-1100"].control_stroke_mm == 1100.0


def test_invalid_pressure_is_rejected():
    broken = replace(DEFAULT, hydraulic_max_pressure_mpa=15.0)
    errors = validate_parameters(broken, VARIANTS["RP-1100"])
    assert "hydraulic peak force exceeds available pull force" in errors
```

- [ ] **Step 2: Run the tests and verify the import failure**

Run:

```powershell
python -m pytest scripts/test_cvr_h1_parameters.py -q
```

Expected: FAIL during collection with `ModuleNotFoundError: No module named 'cvr_h1_parameters'`.

- [ ] **Step 3: Implement the frozen parameter dataclasses**

Create `scripts/cvr_h1_parameters.py` with these public types and values:

```python
from __future__ import annotations

from dataclasses import dataclass
import math


@dataclass(frozen=True)
class DriveVariant:
    name: str
    control_stroke_mm: float
    upper_ring_start_offset_mm: float
    lower_ring_start_offset_mm: float

    @property
    def motion_ratio(self) -> float:
        return 1500.0 / self.control_stroke_mm


@dataclass(frozen=True)
class CVRH1Parameters:
    shaft_length_mm: float = 2200.0
    shaft_od_mm: float = 90.0
    shaft_id_mm: float = 62.0
    blade_height_mm: float = 2000.0
    blade_chord_mm: float = 250.0
    blade_radial_thickness_mm: float = 50.0
    blade_mass_kg: float = 12.0
    rotor_axial_travel_mm: float = 1000.0
    radius_min_mm: float = 500.0
    radius_max_mm: float = 2000.0
    phase_upper_deg: float = 0.0
    phase_delta_deg: float = 60.0
    guide_plane_half_span_mm: float = 700.0
    nested_hub_upper_od_mm: float = 170.0
    nested_hub_lower_id_mm: float = 180.0
    nested_hub_lower_od_mm: float = 260.0
    control_ring_od_mm: float = 340.0
    control_ring_id_mm: float = 270.0
    gear_pitch_radius_mm: float = 50.0
    mechanical_efficiency: float = 0.90
    blade_design_retention_n: float = 30000.0
    control_force_rated_n: float = 100000.0
    control_force_peak_n: float = 150000.0
    cylinder_count: int = 2
    cylinder_bore_mm: float = 90.0
    cylinder_rod_mm: float = 55.0
    hydraulic_max_pressure_mpa: float = 21.0
    rated_wind_mps: float = 15.0
    cutout_wind_mps: float = 20.0
    max_operating_rpm: float = 200.0
    structural_rpm: float = 240.0
    minimum_clearance_mm: float = 20.0


DEFAULT = CVRH1Parameters()
VARIANTS = {
    "RP-1500": DriveVariant("RP-1500", 1500.0, -750.0, 750.0),
    "RP-1100": DriveVariant("RP-1100", 1100.0, -1000.0, 1000.0),
}


def cylinder_pull_force_n(p: CVRH1Parameters, pressure_mpa: float) -> float:
    bore_area = math.pi * p.cylinder_bore_mm**2 / 4.0
    rod_area = math.pi * p.cylinder_rod_mm**2 / 4.0
    return p.cylinder_count * (bore_area - rod_area) * pressure_mpa


def design_control_force_n(p: CVRH1Parameters, variant: DriveVariant) -> float:
    return (
        3.0
        * p.blade_design_retention_n
        * variant.motion_ratio
        / p.mechanical_efficiency
    )


def validate_parameters(
    p: CVRH1Parameters, variant: DriveVariant
) -> list[str]:
    errors: list[str] = []
    if p.radius_max_mm - p.radius_min_mm != 1500.0:
        errors.append("radial stroke must equal 1500 mm")
    if p.nested_hub_upper_od_mm >= p.nested_hub_lower_id_mm:
        errors.append("nested hubs have no radial assembly clearance")
    if design_control_force_n(p, variant) > p.control_force_peak_n:
        errors.append("drive variant exceeds 150 kN control peak")
    if cylinder_pull_force_n(p, p.hydraulic_max_pressure_mpa) < p.control_force_peak_n:
        errors.append("hydraulic peak force exceeds available pull force")
    return errors
```

- [ ] **Step 4: Run the parameter tests**

Run: `python -m pytest scripts/test_cvr_h1_parameters.py -q`

Expected: `3 passed`.

- [ ] **Step 5: Check staged scope and commit**

```powershell
git add scripts/cvr_h1_parameters.py scripts/test_cvr_h1_parameters.py
node .gitnexus/run.cjs detect-changes --scope staged
git diff --cached --check
git commit -m "feat: define CVR-H1 model parameters"
```

Expected GitNexus result: only new Python symbols, no existing application execution flow changed.

### Task 2: Pure Rotor Kinematics And Envelope Calculations

**Files:**
- Create: `scripts/cvr_h1_kinematics.py`
- Create: `scripts/test_cvr_h1_kinematics.py`

- [ ] **Step 1: Write endpoint and envelope tests**

```python
import pytest

from cvr_h1_kinematics import assembly_envelope, rotor_pose
from cvr_h1_parameters import DEFAULT, VARIANTS


def test_stored_and_deployed_rotor_centers():
    variant = VARIANTS["RP-1100"]
    stored_u = rotor_pose("upper", 0.0, 0.0, variant)
    stored_l = rotor_pose("lower", 0.0, 0.0, variant)
    deployed_u = rotor_pose("upper", 1.0, 1.0, variant)
    deployed_l = rotor_pose("lower", 1.0, 1.0, variant)
    assert (stored_u.center_z_mm, stored_l.center_z_mm) == (0.0, 0.0)
    assert (deployed_u.center_z_mm, deployed_l.center_z_mm) == (1000.0, -1000.0)
    assert deployed_u.reference_radius_mm == 2000.0
    assert deployed_l.reference_radius_mm == 2000.0


def test_compact_ring_stays_on_short_shaft():
    variant = VARIANTS["RP-1100"]
    for axial in (0.0, 0.25, 0.5, 0.75, 1.0):
        for radial in (0.0, 0.25, 0.5, 0.75, 1.0):
            for rotor in ("upper", "lower"):
                pose = rotor_pose(rotor, axial, radial, variant)
                assert abs(pose.control_ring_z_mm) <= DEFAULT.shaft_length_mm / 2


def test_reference_and_physical_envelopes_are_reported_separately():
    stored = assembly_envelope(0.0, 0.0, VARIANTS["RP-1100"])
    deployed = assembly_envelope(1.0, 1.0, VARIANTS["RP-1100"])
    assert stored.reference_diameter_mm == 1000.0
    assert stored.rotor_swept_height_mm == 2000.0
    assert stored.structure_height_mm == 2200.0
    assert stored.physical_diameter_mm == pytest.approx(1079.35, abs=0.1)
    assert deployed.reference_diameter_mm == 4000.0
    assert deployed.rotor_swept_height_mm == 4000.0
    assert deployed.structure_height_mm == 4000.0
```

- [ ] **Step 2: Run the tests and verify missing module failure**

Run: `python -m pytest scripts/test_cvr_h1_kinematics.py -q`

Expected: FAIL during collection because `cvr_h1_kinematics` does not exist.

- [ ] **Step 3: Implement poses and envelopes as pure functions**

The public API must be:

```python
from __future__ import annotations

from dataclasses import dataclass
import math

from cvr_h1_parameters import DEFAULT, CVRH1Parameters, DriveVariant


@dataclass(frozen=True)
class RotorPose:
    name: str
    center_z_mm: float
    reference_radius_mm: float
    control_ring_z_mm: float
    phase_deg: float
    axial_progress: float
    radial_progress: float


@dataclass(frozen=True)
class AssemblyEnvelope:
    reference_diameter_mm: float
    physical_diameter_mm: float
    rotor_swept_height_mm: float
    structure_height_mm: float
    shaft_top_margin_mm: float
    shaft_bottom_margin_mm: float


def clamp01(value: float) -> float:
    if not 0.0 <= value <= 1.0:
        raise ValueError(f"progress outside 0..1: {value}")
    return value


def rotor_pose(
    name: str,
    axial_progress: float,
    radial_progress: float,
    variant: DriveVariant,
    p: CVRH1Parameters = DEFAULT,
) -> RotorPose:
    a = clamp01(axial_progress)
    r = clamp01(radial_progress)
    if name not in {"upper", "lower"}:
        raise ValueError(f"unknown rotor: {name}")
    sign = 1.0 if name == "upper" else -1.0
    center = sign * p.rotor_axial_travel_mm * a
    radius = p.radius_min_mm + (p.radius_max_mm - p.radius_min_mm) * r
    start = (
        variant.upper_ring_start_offset_mm
        if name == "upper"
        else variant.lower_ring_start_offset_mm
    )
    ring_direction = 1.0 if name == "upper" else -1.0
    ring_z = center + start + ring_direction * variant.control_stroke_mm * r
    phase = p.phase_upper_deg + (0.0 if name == "upper" else p.phase_delta_deg)
    return RotorPose(name, center, radius, ring_z, phase, a, r)


def physical_blade_radius_mm(reference_radius_mm: float, p=DEFAULT) -> float:
    radial = reference_radius_mm + p.blade_radial_thickness_mm / 2.0
    tangential = p.blade_chord_mm / 2.0
    return math.hypot(radial, tangential)


def assembly_envelope(
    axial_progress: float,
    radial_progress: float,
    variant: DriveVariant,
    p: CVRH1Parameters = DEFAULT,
) -> AssemblyEnvelope:
    upper = rotor_pose("upper", axial_progress, radial_progress, variant, p)
    lower = rotor_pose("lower", axial_progress, radial_progress, variant, p)
    blade_top = upper.center_z_mm + p.blade_height_mm / 2.0
    blade_bottom = lower.center_z_mm - p.blade_height_mm / 2.0
    shaft_top = p.shaft_length_mm / 2.0
    shaft_bottom = -p.shaft_length_mm / 2.0
    return AssemblyEnvelope(
        reference_diameter_mm=2.0 * upper.reference_radius_mm,
        physical_diameter_mm=2.0 * physical_blade_radius_mm(upper.reference_radius_mm, p),
        rotor_swept_height_mm=blade_top - blade_bottom,
        structure_height_mm=max(blade_top, shaft_top) - min(blade_bottom, shaft_bottom),
        shaft_top_margin_mm=shaft_top - upper.center_z_mm,
        shaft_bottom_margin_mm=lower.center_z_mm - shaft_bottom,
    )
```

- [ ] **Step 4: Run endpoint tests**

Run: `python -m pytest scripts/test_cvr_h1_kinematics.py -q`

Expected: `3 passed`.

- [ ] **Step 5: Commit the pure kinematics**

```powershell
git add scripts/cvr_h1_kinematics.py scripts/test_cvr_h1_kinematics.py
node .gitnexus/run.cjs detect-changes --scope staged
git diff --cached --check
git commit -m "feat: add CVR-H1 rotor kinematics"
```

### Task 3: Blade Cross-Section Collision And Clearance Grid

**Files:**
- Modify: `scripts/cvr_h1_kinematics.py`
- Modify: `scripts/test_cvr_h1_kinematics.py`

Before modifying the existing functions, run GitNexus impact analysis:

```powershell
node .gitnexus/run.cjs analyze
node .gitnexus/run.cjs impact rotor_pose --direction upstream
node .gitnexus/run.cjs impact assembly_envelope --direction upstream
```

Expected risk: LOW; callers are limited to the new tests and model generator. Stop and warn before editing if GitNexus reports HIGH or CRITICAL.

- [ ] **Step 1: Add failing collision tests**

```python
from cvr_h1_kinematics import minimum_blade_clearance_mm, scan_state_grid


def test_six_stored_blades_are_interleaved_without_contact():
    clearance = minimum_blade_clearance_mm(0.0, 0.0, VARIANTS["RP-1100"])
    assert clearance >= DEFAULT.minimum_clearance_mm


def test_permitted_sequence_grid_has_no_blade_collision():
    rows = scan_state_grid(VARIANTS["RP-1100"])
    permitted = [row for row in rows if row.sequence_permitted]
    assert permitted
    assert all(not row.blade_collision for row in permitted)
```

- [ ] **Step 2: Run the focused tests and verify missing functions**

Run:

```powershell
python -m pytest scripts/test_cvr_h1_kinematics.py -q -k "clearance or sequence"
```

Expected: FAIL importing `minimum_blade_clearance_mm` and `scan_state_grid`.

- [ ] **Step 3: Implement dependency-free rectangle geometry**

Add these public data types and helpers to `scripts/cvr_h1_kinematics.py`:

```python
@dataclass(frozen=True)
class StateGridRow:
    axial_progress: float
    radial_progress: float
    sequence_permitted: bool
    minimum_blade_clearance_mm: float
    blade_collision: bool


Point = tuple[float, float]


def blade_polygon(
    radius_mm: float, angle_deg: float, p=DEFAULT
) -> tuple[Point, Point, Point, Point]:
    angle = math.radians(angle_deg)
    radial = (math.cos(angle), math.sin(angle))
    tangent = (-math.sin(angle), math.cos(angle))
    center = (radius_mm * radial[0], radius_mm * radial[1])
    hr = p.blade_radial_thickness_mm / 2.0
    ht = p.blade_chord_mm / 2.0
    return tuple(
        (
            center[0] + sr * hr * radial[0] + st * ht * tangent[0],
            center[1] + sr * hr * radial[1] + st * ht * tangent[1],
        )
        for sr, st in ((-1, -1), (-1, 1), (1, 1), (1, -1))
    )


def minimum_blade_clearance_mm(
    axial_progress: float,
    radial_progress: float,
    variant: DriveVariant,
    p: CVRH1Parameters = DEFAULT,
) -> float:
    upper = rotor_pose("upper", axial_progress, radial_progress, variant, p)
    lower = rotor_pose("lower", axial_progress, radial_progress, variant, p)
    blades: list[tuple[float, float, tuple[Point, Point, Point, Point]]] = []
    for pose in (upper, lower):
        z0 = pose.center_z_mm - p.blade_height_mm / 2.0
        z1 = pose.center_z_mm + p.blade_height_mm / 2.0
        for station in (0.0, 120.0, 240.0):
            blades.append(
                (z0, z1, blade_polygon(pose.reference_radius_mm, pose.phase_deg + station, p))
            )
    best = math.inf
    for index, (z0_a, z1_a, poly_a) in enumerate(blades):
        for z0_b, z1_b, poly_b in blades[index + 1 :]:
            if min(z1_a, z1_b) < max(z0_a, z0_b):
                continue
            best = min(best, _polygon_distance(poly_a, poly_b))
    return best


def scan_state_grid(variant: DriveVariant, p=DEFAULT) -> list[StateGridRow]:
    rows: list[StateGridRow] = []
    for axial in (0.0, 0.25, 0.5, 0.75, 1.0):
        for radial in (0.0, 0.25, 0.5, 0.75, 1.0):
            permitted = radial == 0.0 or axial == 1.0
            clearance = minimum_blade_clearance_mm(axial, radial, variant, p)
            rows.append(
                StateGridRow(
                    axial,
                    radial,
                    permitted,
                    clearance,
                    clearance <= 0.0,
                )
            )
    return rows


def _project_polygon(
    polygon: tuple[Point, Point, Point, Point], axis: Point
) -> tuple[float, float]:
    values = [point[0] * axis[0] + point[1] * axis[1] for point in polygon]
    return min(values), max(values)


def _intervals_overlap(a: tuple[float, float], b: tuple[float, float]) -> bool:
    return min(a[1], b[1]) >= max(a[0], b[0])


def _polygons_intersect(
    a: tuple[Point, Point, Point, Point],
    b: tuple[Point, Point, Point, Point],
) -> bool:
    for polygon in (a, b):
        for index, p0 in enumerate(polygon):
            p1 = polygon[(index + 1) % len(polygon)]
            edge = (p1[0] - p0[0], p1[1] - p0[1])
            length = math.hypot(*edge)
            axis = (-edge[1] / length, edge[0] / length)
            if not _intervals_overlap(_project_polygon(a, axis), _project_polygon(b, axis)):
                return False
    return True


def _point_segment_distance(point: Point, a: Point, b: Point) -> float:
    ab = (b[0] - a[0], b[1] - a[1])
    denominator = ab[0] ** 2 + ab[1] ** 2
    if denominator == 0.0:
        return math.dist(point, a)
    t = ((point[0] - a[0]) * ab[0] + (point[1] - a[1]) * ab[1]) / denominator
    t = max(0.0, min(1.0, t))
    closest = (a[0] + t * ab[0], a[1] + t * ab[1])
    return math.dist(point, closest)


def _segment_distance(a0: Point, a1: Point, b0: Point, b1: Point) -> float:
    return min(
        _point_segment_distance(a0, b0, b1),
        _point_segment_distance(a1, b0, b1),
        _point_segment_distance(b0, a0, a1),
        _point_segment_distance(b1, a0, a1),
    )


def _polygon_distance(
    a: tuple[Point, Point, Point, Point],
    b: tuple[Point, Point, Point, Point],
) -> float:
    if _polygons_intersect(a, b):
        return 0.0
    return min(
        _segment_distance(a0, a1, b0, b1)
        for index_a, a0 in enumerate(a)
        for a1 in (a[(index_a + 1) % len(a)],)
        for index_b, b0 in enumerate(b)
        for b1 in (b[(index_b + 1) % len(b)],)
    )
```

- [ ] **Step 4: Run all kinematics tests**

Run: `python -m pytest scripts/test_cvr_h1_kinematics.py -q`

Expected: all tests PASS; stored six-blade clearance is printed in a failing assertion if it drops below 20 mm.

- [ ] **Step 5: Commit the clearance engine**

```powershell
git add scripts/cvr_h1_kinematics.py scripts/test_cvr_h1_kinematics.py
node .gitnexus/run.cjs detect-changes --scope staged
git diff --cached --check
git commit -m "feat: validate CVR-H1 blade clearances"
```

### Task 4: Centrifugal, Gear, Hydraulic And Variant Comparison

**Files:**
- Modify: `scripts/cvr_h1_kinematics.py`
- Modify: `scripts/test_cvr_h1_kinematics.py`

Run impact analysis before editing the existing module:

```powershell
node .gitnexus/run.cjs analyze
node .gitnexus/run.cjs impact rotor_pose --direction upstream
```

- [ ] **Step 1: Add failing numerical load tests**

```python
from cvr_h1_kinematics import (
    blade_centrifugal_force_n,
    control_force_from_blade_load_n,
    required_pull_pressure_mpa,
)


def test_centrifugal_force_matches_design_spec():
    assert blade_centrifugal_force_n(200.0, 2000.0) == pytest.approx(10527.6, rel=1e-3)
    assert blade_centrifugal_force_n(240.0, 2000.0) == pytest.approx(15159.7, rel=1e-3)


def test_compact_variant_stays_within_peak_control_force():
    force = control_force_from_blade_load_n(
        DEFAULT.blade_design_retention_n, VARIANTS["RP-1100"]
    )
    assert force == pytest.approx(136363.6, rel=1e-4)
    assert force < DEFAULT.control_force_peak_n


def test_peak_force_fits_21_mpa_hydraulics():
    pressure = required_pull_pressure_mpa(DEFAULT.control_force_peak_n)
    assert pressure == pytest.approx(18.82, abs=0.02)
    assert pressure < DEFAULT.hydraulic_max_pressure_mpa
```

- [ ] **Step 2: Run focused tests and verify missing functions**

Run: `python -m pytest scripts/test_cvr_h1_kinematics.py -q -k "centrifugal or compact or pressure"`

Expected: FAIL importing the three load functions.

- [ ] **Step 3: Implement load functions**

```python
def blade_centrifugal_force_n(
    rpm: float,
    reference_radius_mm: float,
    p: CVRH1Parameters = DEFAULT,
) -> float:
    omega = 2.0 * math.pi * rpm / 60.0
    return p.blade_mass_kg * omega**2 * reference_radius_mm / 1000.0


def control_force_from_blade_load_n(
    per_blade_force_n: float,
    variant: DriveVariant,
    p: CVRH1Parameters = DEFAULT,
) -> float:
    return 3.0 * per_blade_force_n * variant.motion_ratio / p.mechanical_efficiency


def required_pull_pressure_mpa(force_n: float, p: CVRH1Parameters = DEFAULT) -> float:
    bore_area_mm2 = math.pi * p.cylinder_bore_mm**2 / 4.0
    rod_area_mm2 = math.pi * p.cylinder_rod_mm**2 / 4.0
    total_annulus_mm2 = p.cylinder_count * (bore_area_mm2 - rod_area_mm2)
    return force_n / total_annulus_mm2
```

- [ ] **Step 4: Add a variant comparison assertion**

```python
def test_baseline_has_lower_force_but_overhangs_short_shaft_when_deployed():
    baseline = VARIANTS["RP-1500"]
    compact = VARIANTS["RP-1100"]
    baseline_pose = rotor_pose("upper", 1.0, 1.0, baseline)
    compact_pose = rotor_pose("upper", 1.0, 1.0, compact)
    assert baseline_pose.control_ring_z_mm > DEFAULT.shaft_length_mm / 2
    assert compact_pose.control_ring_z_mm == DEFAULT.shaft_length_mm / 2
    assert control_force_from_blade_load_n(30000.0, baseline) < control_force_from_blade_load_n(30000.0, compact)
```

- [ ] **Step 5: Run tests and commit**

```powershell
python -m pytest scripts/test_cvr_h1_parameters.py scripts/test_cvr_h1_kinematics.py -q
git add scripts/cvr_h1_kinematics.py scripts/test_cvr_h1_kinematics.py
node .gitnexus/run.cjs detect-changes --scope staged
git diff --cached --check
git commit -m "feat: compare CVR-H1 drive loads"
```

### Task 5: Generate OpenSCAD Parameters And Engineering Reports

**Files:**
- Create: `scripts/generate_cvr_h1_model_data.py`
- Create: `docs/cvr_h1_parameters.generated.scad`
- Create: `output/vertical_axis_turbine/cvr_h1/cvr_h1_states.csv`
- Create: `output/vertical_axis_turbine/cvr_h1/cvr_h1_states.json`
- Create: `output/vertical_axis_turbine/cvr_h1/cvr_h1_kinematic_summary.md`

- [ ] **Step 1: Add a generator check test**

Append to `scripts/test_cvr_h1_parameters.py`:

```python
from generate_cvr_h1_model_data import render_scad_parameters


def test_generated_scad_contains_frozen_dimensions():
    rendered = render_scad_parameters(DEFAULT, VARIANTS)
    assert "shaft_length_mm = 2200.0;" in rendered
    assert "radius_max_mm = 2000.0;" in rendered
    assert 'variant_names = ["RP-1500", "RP-1100"];' in rendered
```

- [ ] **Step 2: Run the test and verify import failure**

Run: `python -m pytest scripts/test_cvr_h1_parameters.py -q -k generated`

Expected: FAIL because the generator module does not exist.

- [ ] **Step 3: Implement deterministic generation**

`scripts/generate_cvr_h1_model_data.py` must implement deterministic output with this structure:

```python
from __future__ import annotations

import argparse
import csv
from dataclasses import fields
import json
from pathlib import Path

from cvr_h1_kinematics import (
    assembly_envelope,
    blade_centrifugal_force_n,
    control_force_from_blade_load_n,
    minimum_blade_clearance_mm,
    required_pull_pressure_mpa,
    rotor_pose,
)
from cvr_h1_parameters import DEFAULT, VARIANTS


ROOT = Path(__file__).resolve().parents[1]
SCAD_PATH = ROOT / "docs" / "cvr_h1_parameters.generated.scad"
OUT_DIR = ROOT / "output" / "vertical_axis_turbine" / "cvr_h1"


def render_scad_parameters(p=DEFAULT, variants=VARIANTS) -> str:
    lines = ["// Generated by scripts/generate_cvr_h1_model_data.py; do not edit."]
    for field in fields(p):
        value = getattr(p, field.name)
        if isinstance(value, str):
            lines.append(f'{field.name} = "{value}";')
        else:
            lines.append(f"{field.name} = {value};")
    names = ", ".join(f'"{name}"' for name in variants)
    lines.append(f"variant_names = [{names}];")
    for name, variant in variants.items():
        key = name.lower().replace("-", "_")
        lines.append(f"{key}_control_stroke_mm = {variant.control_stroke_mm};")
        lines.append(f"{key}_motion_ratio = {variant.motion_ratio};")
    return "\n".join(lines) + "\n"


def state_rows(p=DEFAULT, variants=VARIANTS) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for variant_name, variant in variants.items():
        for state, (axial, radial, rpm, wind) in STATE_INPUTS.items():
            upper = rotor_pose("upper", axial, radial, variant, p)
            lower = rotor_pose("lower", axial, radial, variant, p)
            envelope = assembly_envelope(axial, radial, variant, p)
            blade_force = blade_centrifugal_force_n(rpm, upper.reference_radius_mm, p)
            normal_control = control_force_from_blade_load_n(blade_force, variant, p)
            design_control = control_force_from_blade_load_n(
                p.blade_design_retention_n, variant, p
            )
            rows.append(
                {
                    "variant": variant_name,
                    "state": state,
                    "axial_progress": axial,
                    "radial_progress": radial,
                    "rpm": rpm,
                    "wind_mps": wind,
                    "upper_center_z_mm": upper.center_z_mm,
                    "lower_center_z_mm": lower.center_z_mm,
                    "upper_ring_z_mm": upper.control_ring_z_mm,
                    "lower_ring_z_mm": lower.control_ring_z_mm,
                    "reference_diameter_mm": envelope.reference_diameter_mm,
                    "physical_diameter_mm": envelope.physical_diameter_mm,
                    "rotor_swept_height_mm": envelope.rotor_swept_height_mm,
                    "structure_height_mm": envelope.structure_height_mm,
                    "minimum_blade_clearance_mm": minimum_blade_clearance_mm(
                        axial, radial, variant, p
                    ),
                    "blade_centrifugal_force_n": blade_force,
                    "normal_control_force_n": normal_control,
                    "design_control_force_n": design_control,
                    "required_pressure_mpa": required_pull_pressure_mpa(
                        design_control, p
                    ),
                }
            )
    return rows


def write_outputs(check: bool = False) -> list[Path]:
    scad = render_scad_parameters()
    if check:
        if not SCAD_PATH.exists() or SCAD_PATH.read_text(encoding="utf-8") != scad:
            raise SystemExit("generated SCAD parameters are stale")
        print("generated files are current")
        return [SCAD_PATH]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SCAD_PATH.write_text(scad, encoding="utf-8")
    rows = state_rows()
    csv_path = OUT_DIR / "cvr_h1_states.csv"
    json_path = OUT_DIR / "cvr_h1_states.json"
    md_path = OUT_DIR / "cvr_h1_kinematic_summary.md"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    json_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    md_path.write_text(render_markdown_summary(rows), encoding="utf-8")
    return [SCAD_PATH, csv_path, json_path, md_path]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for path in write_outputs(check=args.check):
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

Implement `render_markdown_summary(rows)` in the same file. It must produce the G01-G10 gate table defined in Task 8 and one state table per variant; it must not contain prose-only claims that are absent from `rows`.

The state table must include exactly these named rows for both variants:

```python
STATE_INPUTS = {
    "S0_STORED": (0.0, 0.0, 0.0, 0.0),
    "S1_AXIAL": (1.0, 0.0, 0.0, 0.0),
    "S2_RADIUS_25": (1.0, 0.25, 0.0, 0.0),
    "S3_RADIUS_50": (1.0, 0.50, 0.0, 0.0),
    "S4_RADIUS_75": (1.0, 0.75, 0.0, 0.0),
    "S5_FULL": (1.0, 1.0, 0.0, 0.0),
    "S6_RATED": (1.0, 1.0, 200.0, 15.0),
    "S7_CUTOUT_IDEAL": (1.0, 0.2291666667, 200.0, 20.0),
}
```

Each CSV/JSON row must include variant, state, axial/radial progress, rotor centers, control-ring positions, reference/physical diameter, rotor/structure height, minimum blade clearance, rpm, wind, blade centrifugal force, normal control force, design control force, and required hydraulic pressure.

`--check` must regenerate in memory and exit `1` if the tracked SCAD parameter snapshot differs.

- [ ] **Step 4: Generate and verify outputs**

```powershell
python scripts/generate_cvr_h1_model_data.py
python scripts/generate_cvr_h1_model_data.py --check
```

Expected: both commands exit `0`; the second prints `generated files are current`.

- [ ] **Step 5: Commit source and tracked SCAD snapshot**

Do not stage generated files under `output/` unless the repository policy explicitly tracks review artifacts.

```powershell
git add scripts/generate_cvr_h1_model_data.py scripts/test_cvr_h1_parameters.py docs/cvr_h1_parameters.generated.scad
node .gitnexus/run.cjs detect-changes --scope staged
git diff --cached --check
git commit -m "feat: generate CVR-H1 model data"
```

### Task 6: Build The Parametric OpenSCAD Assembly

**Files:**
- Create: `docs/vertical_axis_turbine_cvr_h1_kinematics.scad`

- [ ] **Step 1: Create a minimal compileable scene**

The file must start with:

```scad
include <cvr_h1_parameters.generated.scad>

$fn = 72;

variant_name = "RP-1100";
axial_progress = 1.0;
radial_progress = 1.0;
spin_angle_deg = 0.0;
show_stationary_cage = true;
show_control_load_path = true;
show_envelopes = false;
cutaway = false;

function clamp01(v) = min(1, max(0, v));
function lerp(a, b, p) = a + (b-a) * clamp01(p);
function upper_center_z(a) = rotor_axial_travel_mm * clamp01(a);
function lower_center_z(a) = -upper_center_z(a);
function blade_radius(r) = lerp(radius_min_mm, radius_max_mm, r);
function control_stroke(name) = name == "RP-1500" ? 1500 : 1100;
function upper_ring_start(name) = name == "RP-1500" ? -750 : -1000;
function lower_ring_start(name) = -upper_ring_start(name);
function upper_ring_z(a, r, name) = upper_center_z(a) + upper_ring_start(name) + control_stroke(name) * clamp01(r);
function lower_ring_z(a, r, name) = lower_center_z(a) + lower_ring_start(name) - control_stroke(name) * clamp01(r);
```

Add only `main_shaft()` and call it. Verify compilation:

```powershell
openscad -o output/vertical_axis_turbine/cvr_h1/smoke.stl docs/vertical_axis_turbine_cvr_h1_kinematics.scad
```

Expected: exit `0`, non-empty `smoke.stl`, no parser error.

- [ ] **Step 2: Implement the rotating geometry modules**

Create focused modules with these exact names and initial geometry:

```scad
module main_shaft() {
  color([0.12,0.15,0.18])
    difference() {
      cylinder(d=shaft_od_mm, h=shaft_length_mm, center=true);
      cylinder(d=shaft_id_mm, h=shaft_length_mm + 2, center=true);
    }
}

module nested_hub(rotor_name, center_z, alpha=1) {
  is_upper = rotor_name == "upper";
  od = is_upper ? nested_hub_upper_od_mm : nested_hub_lower_od_mm;
  id = is_upper ? shaft_od_mm + 6 : nested_hub_lower_id_mm;
  z_shift = is_upper ? 35 : -35;
  color(is_upper ? [0.30,0.48,0.80,alpha] : [0.54,0.68,0.92,alpha])
    translate([0,0,center_z + z_shift])
      difference() {
        cylinder(d=od, h=220, center=true);
        cylinder(d=id, h=222, center=true);
      }
}

module control_ring(rotor_name, z, alpha=1) {
  color([0.95,0.55,0.12,alpha])
    translate([0,0,z])
      difference() {
        cylinder(d=control_ring_od_mm, h=42, center=true);
        cylinder(d=control_ring_id_mm, h=44, center=true);
      }
}

module rail_box(x0, x1, z, width, height, rgba) {
  color(rgba)
    translate([(x0+x1)/2,0,z]) cube([x1-x0,width,height], center=true);
}

module telescopic_guide(rot, center_z, radius, z_local, alpha=1) {
  rotate([0,0,rot]) {
    rail_box(125, max(450,radius*0.45), center_z+z_local, 78, 54, [0.26,0.30,0.34,alpha]);
    rail_box(230, max(700,radius*0.72), center_z+z_local, 64, 44, [0.38,0.43,0.49,alpha]);
    rail_box(360, radius-28, center_z+z_local, 50, 34, [0.16,0.20,0.24,alpha]);
  }
}

module right_angle_drive(rot, center_z, radius, ring_z, alpha=1) {
  rotate([0,0,rot]) {
    color([0.88,0.48,0.10,alpha])
      translate([205,0,(center_z+ring_z)/2]) cube([24,34,abs(ring_z-center_z)+80], center=true);
    color([0.88,0.48,0.10,alpha])
      translate([(230+radius)/2,0,center_z]) cube([radius-230,34,24], center=true);
    color([0.96,0.68,0.18,alpha])
      translate([205,0,center_z]) rotate([90,0,0]) cylinder(r=gear_pitch_radius_mm,h=72,center=true);
  }
}

module blade_carrier(rot, center_z, radius, alpha=1) {
  rotate([0,0,rot]) {
    color([0.10,0.16,0.22,alpha])
      translate([radius,0,center_z]) cube([64,64,1500],center=true);
    color([0.24,0.45,0.82,alpha])
      translate([radius,0,center_z]) cube([blade_radial_thickness_mm,blade_chord_mm,blade_height_mm],center=true);
  }
}

module rotor(rotor_name, center_z, ring_z, radius, phase, alpha=1) {
  nested_hub(rotor_name, center_z, alpha);
  control_ring(rotor_name, ring_z, alpha);
  for (station=[0,120,240]) {
    angle = phase + station;
    telescopic_guide(angle, center_z, radius, guide_plane_half_span_mm, alpha);
    telescopic_guide(angle, center_z, radius,-guide_plane_half_span_mm, alpha);
    right_angle_drive(angle, center_z, radius, ring_z, alpha);
    blade_carrier(angle, center_z, radius, alpha);
  }
}
```

Implementation rules:

- `main_shaft()` is an OD90/ID62 tube, 2200 mm long.
- `nested_hub()` uses separate concentric sleeves so the two rotor hubs do not occupy the same material in S0.
- Each rotor has three blade stations at `phase+[0,120,240] deg`.
- Each station contains upper/lower three-stage box guides at `center_z +/- 700 mm`.
- `right_angle_drive()` shows an axial rack, two equal-pitch pinions on a tangential axle, and a radial rack; gear teeth may be simplified cylinders/boxes, but pitch centers and motion directions must be visible.
- `blade_carrier()` uses a 2 m blade, 250 mm tangential chord and 50 mm radial thickness.
- The upper rotor is blue, lower rotor is light blue, rotating drive parts are orange, stationary hydraulic parts are green, locks/stops are yellow, and the main shaft is dark gray.

- [ ] **Step 3: Implement the non-rotating servo carriage and support cage**

Add:

```scad
module hydraulic_cylinder(x, y, z0, z1, alpha=1) {
  length = abs(z1-z0);
  mid = (z0+z1)/2;
  color([0.20,0.55,0.36,alpha]) translate([x,y,mid]) cylinder(d=90,h=max(120,length),center=true);
  color([0.70,0.76,0.78,alpha]) translate([x,y,z1]) cylinder(d=55,h=160,center=true);
}

module servo_carriage(rotor_name, center_z, ring_z, alpha=1) {
  is_upper = rotor_name == "upper";
  yoke_z = ring_z;
  color([0.18,0.50,0.34,alpha])
    translate([0,0,yoke_z]) difference() {
      cylinder(d=430,h=34,center=true);
      cylinder(d=350,h=36,center=true);
    }
  hydraulic_cylinder(235,0,center_z,yoke_z,alpha);
  hydraulic_cylinder(-235,0,center_z,yoke_z,alpha);
}

module stationary_support_cage(alpha=0.35) {
  color([0.24,0.30,0.28,alpha]) {
    for (angle=[0,90,180,270]) rotate([0,0,angle]) translate([330,0,0]) cube([42,42,shaft_length_mm],center=true);
    for (z=[-shaft_length_mm/2,0,shaft_length_mm/2]) translate([0,0,z]) difference() {
      cylinder(d=720,h=34,center=true);
      cylinder(d=640,h=36,center=true);
    }
  }
}

module axial_station_lock(rotor_name, center_z, alpha=1) {
  color([0.98,0.76,0.16,alpha])
    translate([0,0,center_z]) difference() {
      cylinder(d=310,h=46,center=true);
      cylinder(d=270,h=48,center=true);
    }
}
```

The two cylinders must be symmetric about the shaft. The carriage must remain non-rotating while the thrust bearing inner/control ring rotates. The station lock must visibly route the 150 kN control reaction into the stationary cage rather than into B3 or the generator bearing.

- [ ] **Step 4: Implement state and envelope overlays**

Add:

```scad
module reference_envelope(radius, lower_z, upper_z) {
  color([0.15,0.65,0.85,0.08])
    translate([0,0,(lower_z+upper_z)/2]) cylinder(r=radius,h=upper_z-lower_z,center=true);
}

module physical_dimension_markers(radius, lower_z, upper_z) {
  color([0.95,0.82,0.18]) {
    translate([0,0,lower_z]) cube([2*radius,12,12],center=true);
    translate([0,0,upper_z]) cube([2*radius,12,12],center=true);
    translate([radius,0,(lower_z+upper_z)/2]) cube([12,12,upper_z-lower_z],center=true);
  }
}

module assembly() {
  upper_z = upper_center_z(axial_progress);
  lower_z = lower_center_z(axial_progress);
  radius = blade_radius(radial_progress);
  upper_ring = upper_ring_z(axial_progress, radial_progress, variant_name);
  lower_ring = lower_ring_z(axial_progress, radial_progress, variant_name);
  if (show_stationary_cage) stationary_support_cage();
  main_shaft();
  axial_station_lock("upper", upper_z);
  axial_station_lock("lower", lower_z);
  servo_carriage("upper", upper_z, upper_ring);
  servo_carriage("lower", lower_z, lower_ring);
  rotate([0,0,spin_angle_deg]) {
    rotor("upper", upper_z, upper_ring, radius, 0, 0.96);
    rotor("lower", lower_z, lower_ring, radius, phase_delta_deg, 0.78);
  }
  if (show_envelopes) {
    reference_envelope(radius, lower_z-blade_height_mm/2, upper_z+blade_height_mm/2);
    physical_dimension_markers(radius, lower_z-blade_height_mm/2, upper_z+blade_height_mm/2);
  }
}

assembly();
```

`assembly()` must render both rotors with a fixed 60 deg phase difference and apply `spin_angle_deg` to all rotating components, but never to the support cage, cylinders or non-rotating yokes.

- [ ] **Step 5: Render endpoint smoke images**

```powershell
openscad --render --autocenter --viewall --imgsize=1200,900 --camera=0,0,0,65,0,35,5000 -D axial_progress=0 -D radial_progress=0 -o output/vertical_axis_turbine/cvr_h1/s0_smoke.png docs/vertical_axis_turbine_cvr_h1_kinematics.scad
openscad --render --autocenter --viewall --imgsize=1200,900 --camera=0,0,0,65,0,35,6500 -D axial_progress=1 -D radial_progress=1 -o output/vertical_axis_turbine/cvr_h1/s5_smoke.png docs/vertical_axis_turbine_cvr_h1_kinematics.scad
```

Expected: both PNG files are non-empty and OpenSCAD reports no geometry error.

- [ ] **Step 6: Commit the OpenSCAD assembly**

```powershell
git add docs/vertical_axis_turbine_cvr_h1_kinematics.scad
node .gitnexus/run.cjs detect-changes --scope staged
git diff --cached --check
git commit -m "feat: model CVR-H1 assembly in OpenSCAD"
```

### Task 7: Automated Rendering, Contact Sheet And Animation

**Files:**
- Create: `scripts/render_cvr_h1_model.py`

- [ ] **Step 1: Implement the renderer CLI**

The renderer must expose:

```python
@dataclass(frozen=True)
class RenderState:
    name: str
    axial_progress: float
    radial_progress: float
    spin_angle_deg: float
    camera: str


RENDER_STATES = (
    RenderState("S0_stored", 0.0, 0.0, 0.0, "0,0,0,65,0,35,5000"),
    RenderState("S1_axial", 1.0, 0.0, 0.0, "0,0,0,65,0,35,5600"),
    RenderState("S2_radius25", 1.0, 0.25, 15.0, "0,0,0,65,0,35,5800"),
    RenderState("S3_radius50", 1.0, 0.50, 30.0, "0,0,0,65,0,35,6000"),
    RenderState("S4_radius75", 1.0, 0.75, 45.0, "0,0,0,65,0,35,6300"),
    RenderState("S5_full", 1.0, 1.0, 60.0, "0,0,0,65,0,35,6500"),
)


ROOT = Path(__file__).resolve().parents[1]
SCAD = ROOT / "docs" / "vertical_axis_turbine_cvr_h1_kinematics.scad"


def find_openscad() -> Path:
    discovered = shutil.which("openscad")
    if discovered:
        return Path(discovered)
    installed = Path("C:/Program Files/OpenSCAD/openscad.com")
    if installed.exists():
        return installed
    raise FileNotFoundError("OpenSCAD CLI not found in PATH or C:/Program Files/OpenSCAD")


def _run(command: list[str]) -> None:
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"OpenSCAD failed ({result.returncode})\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )


def render_state(state: RenderState, variant: str, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    target = output_dir / f"{state.name}.png"
    command = [
        str(find_openscad()),
        "--render",
        "--autocenter",
        "--viewall",
        "--imgsize=1600,1200",
        f"--camera={state.camera}",
        "-D", f'variant_name="{variant}"',
        "-D", f"axial_progress={state.axial_progress}",
        "-D", f"radial_progress={state.radial_progress}",
        "-D", f"spin_angle_deg={state.spin_angle_deg}",
        "-o", str(target),
        str(SCAD),
    ]
    _run(command)
    assert_nonblank(target)
    return target


def build_contact_sheet(images: list[Path], output_path: Path) -> Path:
    opened = [Image.open(path).convert("RGB") for path in images]
    thumb_size = (800, 600)
    canvas = Image.new("RGB", (1600, 1800), "white")
    draw = ImageDraw.Draw(canvas)
    for index, (path, frame) in enumerate(zip(images, opened)):
        frame.thumbnail(thumb_size)
        x = (index % 2) * 800
        y = (index // 2) * 600
        canvas.paste(frame, (x, y))
        draw.text((x + 16, y + 16), path.stem, fill="black")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path)
    return output_path


def build_animation(images: list[Path], output_path: Path) -> Path:
    frames = [Image.open(path).convert("P", palette=Image.Palette.ADAPTIVE) for path in images]
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=650,
        loop=0,
        disposal=2,
    )
    return output_path


def export_stl(
    variant: str, axial: float, radial: float, output_path: Path
) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _run(
        [
            str(find_openscad()),
            "-D", f'variant_name="{variant}"',
            "-D", f"axial_progress={axial}",
            "-D", f"radial_progress={radial}",
            "-o", str(output_path),
            str(SCAD),
        ]
    )
    if output_path.stat().st_size == 0:
        raise AssertionError(f"empty STL: {output_path}")
    return output_path
```

Imports must include `argparse`, `dataclass`, `Path`, `shutil`, `subprocess`, and `PIL.Image`, `PIL.ImageDraw`, `PIL.ImageStat`. Pillow must label each frame with state name, variant, reference diameter and control-ring position.

- [ ] **Step 2: Add a dry-run mode**

`python scripts/render_cvr_h1_model.py --dry-run` must print all six OpenSCAD commands without invoking them. Test manually that every command contains both `-D variant_name=\"RP-1100\"` and the expected axial/radial progress.

- [ ] **Step 3: Render both variants**

```powershell
python scripts/render_cvr_h1_model.py --variant RP-1100 --all
python scripts/render_cvr_h1_model.py --variant RP-1500 --states S0_stored S1_axial S5_full
```

Expected outputs include:

```text
output/vertical_axis_turbine/cvr_h1/RP-1100/contact_sheet.png
output/vertical_axis_turbine/cvr_h1/RP-1100/deployment.gif
output/vertical_axis_turbine/cvr_h1/RP-1100/S0_stored.stl
output/vertical_axis_turbine/cvr_h1/RP-1100/S5_full.stl
output/vertical_axis_turbine/cvr_h1/RP-1500/contact_sheet.png
```

- [ ] **Step 4: Verify image content, not only file existence**

Use Pillow to reject blank renders:

```python
from PIL import Image, ImageStat


def assert_nonblank(path: Path) -> None:
    image = Image.open(path).convert("RGB")
    extrema = ImageStat.Stat(image).extrema
    if max(high - low for low, high in extrema) < 20:
        raise AssertionError(f"render appears blank: {path}")
```

Also inspect the two contact sheets with the local image viewer. Confirm that the rotating elements change angle while stationary cylinders do not, and that no text or geometry is clipped.

- [ ] **Step 5: Commit rendering automation**

```powershell
git add scripts/render_cvr_h1_model.py
node .gitnexus/run.cjs detect-changes --scope staged
git diff --cached --check
git commit -m "feat: render CVR-H1 deployment states"
```

### Task 8: Integrated Acceptance Matrix And Architecture Decision

**Files:**
- Modify: `scripts/generate_cvr_h1_model_data.py`
- Modify: `scripts/test_cvr_h1_kinematics.py`
- Create: `docs/cvr_h1_3d_kinematic_model_v1_11.md`

Run impact analysis before modifying existing generator functions:

```powershell
node .gitnexus/run.cjs analyze
node .gitnexus/run.cjs impact state_rows --direction upstream
node .gitnexus/run.cjs impact write_outputs --direction upstream
```

- [ ] **Step 1: Add the full acceptance test**

```python
def test_rp1100_integrated_acceptance_matrix():
    variant = VARIANTS["RP-1100"]
    rows = scan_state_grid(variant)
    assert not validate_parameters(DEFAULT, variant)
    assert all(not row.blade_collision for row in rows if row.sequence_permitted)
    assert max(
        abs(rotor_pose(rotor, a, r, variant).control_ring_z_mm)
        for rotor in ("upper", "lower")
        for a in (0.0, 0.25, 0.5, 0.75, 1.0)
        for r in (0.0, 0.25, 0.5, 0.75, 1.0)
    ) <= DEFAULT.shaft_length_mm / 2
    assert control_force_from_blade_load_n(30000.0, variant) < 150000.0
    assert required_pull_pressure_mpa(150000.0) < 21.0
```

- [ ] **Step 2: Add report gates**

The Markdown summary must contain a PASS/FAIL table with these exact gates:

```text
G01 frozen reference dimensions
G02 stored six-blade clearance >=20 mm
G03 permitted state grid has no blade collision
G04 rotor centers remain within shaft end journals
G05 control ring remains inside shaft support span
G06 design control force <=150 kN
G07 two-cylinder pressure <=21 MPa
G08 stored physical diameter reported separately from 1.0 m reference diameter
G09 stored structure height reported as 2.2 m, not 2.0 m
G10 OpenSCAD endpoint PNG/STL exports are nonblank
```

- [ ] **Step 3: Write the engineering model document**

`docs/cvr_h1_3d_kinematic_model_v1_11.md` must include:

1. frozen inputs and coordinate system;
2. RP-1500 and RP-1100 equations;
3. endpoint and intermediate-state dimensions;
4. control-ring z-travel plot/table;
5. blade clearance matrix;
6. centrifugal/control/hydraulic force table at 0/60/100/150/200/240 rpm;
7. reference diameter versus physical envelope explanation;
8. short-shaft support and 100 mm rotor-center journal margin;
9. rendered contact sheets and state images using relative Markdown paths;
10. architecture decision: keep RP-1500 or issue a controlled change to RP-1100;
11. unresolved manufacturing items limited to gear tooth design, bearing selection, guide stiffness and real airfoil envelope;
12. release restriction that this model is not a manufacturing or 200 rpm wind-test approval.

- [ ] **Step 4: Run the complete verification suite**

```powershell
python -m pytest scripts/test_cvr_h1_parameters.py scripts/test_cvr_h1_kinematics.py -q
python scripts/generate_cvr_h1_model_data.py --check
python scripts/render_cvr_h1_model.py --variant RP-1100 --verify-existing
openscad -o output/vertical_axis_turbine/cvr_h1/RP-1100/final_full.stl -D variant_name=\"RP-1100\" -D axial_progress=1 -D radial_progress=1 docs/vertical_axis_turbine_cvr_h1_kinematics.scad
```

Expected:

- pytest reports zero failures;
- generated snapshots are current;
- all six PNG renders pass the nonblank pixel check;
- OpenSCAD exits `0` and creates a non-empty STL;
- G01-G10 all report PASS, except that G08/G09 are informational differences rather than hidden failures.

- [ ] **Step 5: Review the final staged impact and commit**

```powershell
git add scripts/generate_cvr_h1_model_data.py scripts/test_cvr_h1_kinematics.py docs/cvr_h1_3d_kinematic_model_v1_11.md
node .gitnexus/run.cjs detect-changes --scope staged
git diff --cached --check
git commit -m "docs: close CVR-H1 kinematic model review"
```

### Task 9: Controlled Design-Spec Delta

**Files:**
- Modify only if RP-1100 passes G01-G10: `docs/superpowers/specs/2026-07-10-cvr-h1-continuous-variable-radius-design.md`

Before editing, this is a Markdown-only change and does not modify an indexed code symbol. Record that symbol-level impact analysis is not applicable; still run staged `detect-changes` before committing.

- [ ] **Step 1: Update the approved spec only from model evidence**

Replace the 1500 mm/1:1 baseline paragraph with a controlled variant table:

```markdown
| 变体 | 控制环行程 | dR/dz | 30 kN/叶片设计控制力 | 短轴包装结论 |
|---|---:|---:|---:|---|
| RP-1500 | 1500 mm | 1.000 | 100 kN | 需要越出主轴端部的独立旋转导向桅杆 |
| RP-1100 | 1100 mm | 1.364 | 136 kN | 控制环保持在 z=±1.10 m 主轴支承跨度内 |
```

Freeze `RP-1100` only if the generated report shows G01-G10 PASS. Otherwise keep RP-1500 and record the failed gate instead of changing the architecture.

- [ ] **Step 2: Verify stale values and placeholders are absent**

```powershell
$patterns=@(('T'+'BD'),('T'+'ODO'),('待'+'定'),('待'+'确认'),'dR/dz=1\.00','控制环有效轴向行程同样取 1\.5 m')
Select-String -Path docs/superpowers/specs/2026-07-10-cvr-h1-continuous-variable-radius-design.md -Pattern $patterns
```

Expected after an RP-1100 change: no stale single-variant statement remains. Expected if RP-1500 is retained: the report explicitly explains why G05 or G06 failed.

- [ ] **Step 3: Commit the controlled design change**

```powershell
git add docs/superpowers/specs/2026-07-10-cvr-h1-continuous-variable-radius-design.md
node .gitnexus/run.cjs detect-changes --scope staged
git diff --cached --check
git commit -m "docs: select CVR-H1 compact drive variant"
```

## Final Deliverables

The implementation is complete only when all of the following exist and are verified:

- parameterized OpenSCAD assembly for both RP-1500 and RP-1100;
- six RP-1100 deployment-state PNGs, contact sheet and GIF;
- stored and fully deployed STL exports;
- CSV/JSON state matrix and Markdown calculation report;
- automated tests for endpoints, envelope, collision, centrifugal force, control force and hydraulic pressure;
- explicit report that nominal stored geometry is `Dref=1.0 m`, rotor height `2.0 m`, while provisional physical blade envelope and 2.2 m shaft create different structure envelopes;
- a model-evidence-based decision on the 1500 mm versus 1100 mm control-ring stroke;
- GitNexus `detect-changes` evidence before every commit and no unrelated worktree files staged.
