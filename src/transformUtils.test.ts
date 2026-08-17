import { describe, expect, test } from "vitest";

import { createDefaultNode, isLineSegmentBusNode } from "./model";
import { resizeLineSegmentBusGeometryFromHandleDrag } from "./transformUtils";

describe("line-segment bus classification", () => {
  test.each([
    "ac-bus",
    "ac-bus-vertical",
    "dc-bus",
    "dc-bus-vertical",
    "hydrogen-bus",
    "heat-bus"
  ])("recognizes %s as a line-segment bus", (kind) => {
    expect(isLineSegmentBusNode(createDefaultNode(kind, { x: 100, y: 100 }))).toBe(true);
  });

  test("recognizes a derived ACRealBs component as a line-segment bus", () => {
    const node = {
      ...createDefaultNode("ac-bus", { x: 100, y: 100 }),
      kind: "custom-ac-bus",
      params: { component_type: "ACRealBs" }
    };

    expect(isLineSegmentBusNode(node)).toBe(true);
  });

  test.each([
    "hydrogen-tank",
    "hydrogen-tank-horizontal",
    "hydrogen-tank-container",
    "thermal-storage-tank"
  ])("does not classify boundary storage %s as a line segment", (kind) => {
    expect(isLineSegmentBusNode(createDefaultNode(kind, { x: 100, y: 100 }))).toBe(false);
  });
});

describe("line-segment bus handle resizing", () => {
  test("moves the dragged end and keeps the opposite end fixed without changing scale", () => {
    const node = {
      ...createDefaultNode("ac-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scale: 1.25,
      scaleX: 1,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 174, y: 100 },
      point: { x: 214, y: 100 },
      handleXDirection: 1,
      handleYDirection: 0,
      resizeX: true,
      resizeY: false
    });

    expect(resized.position).toEqual({ x: 120, y: 100 });
    expect(resized.size).toEqual({ width: 160, height: 28 });
    expect(resized.scale).toBe(1.25);
    expect(resized.scaleX).toBe(1);
    expect(resized.scaleY).toBe(1);
    expect(resized.position.x - resized.size.width / 2).toBe(40);
  });

  test("changes the displayed height for a rotated vertical bus", () => {
    const node = {
      ...createDefaultNode("ac-bus-vertical", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      rotation: 90,
      scaleX: 1,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 100, y: 174 },
      point: { x: 100, y: 214 },
      handleXDirection: 1,
      handleYDirection: 0,
      resizeX: true,
      resizeY: false
    });

    expect(resized.position.x).toBeCloseTo(100, 8);
    expect(resized.position.y).toBeCloseTo(120, 8);
    expect(resized.size).toEqual({ width: 160, height: 28 });
    expect(resized.rotation).toBe(90);
  });

  test("changes only the local height from a horizontal bus side handle", () => {
    const node = {
      ...createDefaultNode("dc-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scale: 1.4,
      scaleX: 1.2,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 100, y: 86 },
      point: { x: 100, y: 66 },
      handleXDirection: 0,
      handleYDirection: -1,
      resizeX: false,
      resizeY: true
    });

    expect(resized.position).toEqual({ x: 100, y: 90 });
    expect(resized.size).toEqual({ width: 120, height: 48 });
    expect(resized.scale).toBe(1.4);
    expect(resized.scaleX).toBe(1.2);
    expect(resized.scaleY).toBe(1);
    expect(resized.position.y + resized.size.height / 2).toBe(114);
  });

  test("changes width and height together from a corner while keeping the opposite corner fixed", () => {
    const node = {
      ...createDefaultNode("ac-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scale: 1.3,
      scaleX: 1,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 160, y: 114 },
      point: { x: 200, y: 134 },
      handleXDirection: 1,
      handleYDirection: 1,
      resizeX: true,
      resizeY: true
    });

    expect(resized.position).toEqual({ x: 120, y: 110 });
    expect(resized.size).toEqual({ width: 160, height: 48 });
    expect(resized.scale).toBe(1.3);
    expect(resized.scaleX).toBe(1);
    expect(resized.scaleY).toBe(1);
    expect(resized.position.x - resized.size.width / 2).toBe(40);
    expect(resized.position.y - resized.size.height / 2).toBe(86);
  });

  test("maps a screen-horizontal side drag to local height for a 90-degree bus", () => {
    const node = {
      ...createDefaultNode("dc-bus-vertical", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      rotation: 90,
      scale: 1.6,
      scaleX: 1,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 86, y: 100 },
      point: { x: 66, y: 100 },
      handleXDirection: 0,
      handleYDirection: 1,
      resizeX: false,
      resizeY: true
    });

    expect(resized.position.x).toBeCloseTo(90, 8);
    expect(resized.position.y).toBeCloseTo(100, 8);
    expect(resized.size).toEqual({ width: 120, height: 48 });
    expect(resized.scale).toBe(1.6);
    expect(resized.scaleX).toBe(1);
    expect(resized.scaleY).toBe(1);
  });

  test("accounts for an existing visual scale while changing the stored size", () => {
    const node = {
      ...createDefaultNode("dc-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scaleX: 2,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 234, y: 100 },
      point: { x: 274, y: 100 },
      handleXDirection: 1,
      handleYDirection: 0,
      resizeX: true,
      resizeY: false
    });

    expect(resized.position).toEqual({ x: 120, y: 100 });
    expect(resized.size).toEqual({ width: 140, height: 28 });
    expect(resized.scaleX).toBe(2);
  });

  test("clamps a shortened segment and still keeps the opposite end fixed", () => {
    const node = {
      ...createDefaultNode("ac-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scaleX: 1,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 26, y: 100 },
      point: { x: 200, y: 100 },
      handleXDirection: -1,
      handleYDirection: 0,
      resizeX: true,
      resizeY: false
    });

    expect(resized.position).toEqual({ x: 156, y: 100 });
    expect(resized.size).toEqual({ width: 8, height: 28 });
    expect(resized.position.x + resized.size.width / 2).toBe(160);
  });
});
