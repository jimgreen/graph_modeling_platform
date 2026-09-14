import { describe, expect, it } from "vitest";
import { buildSvgDocument } from "./svg.ts";

// 默认新建母线：vbase 为 "0"，电压写在 snake_case 的 voltage_level 上
const busNode = () => ({
  id: "ac-bus-1",
  kind: "ac-bus",
  name: "交流母线-1",
  position: { x: 100, y: 100 },
  size: { width: 150, height: 36 },
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  layerId: "layer-default",
  terminals: [],
  params: { vbase: "0", voltage_level: "10" }
} as never);

describe("母线电压解析链对齐", () => {
  it("默认母线的 use 类与其正文色同源（不应出现 kv0）", () => {
    const svg = buildSvgDocument([busNode()], [], {
      width: 800,
      height: 600,
      colorDisplayMode: "voltage"
    });
    expect(svg).toContain('class="kv10"');
    expect(svg).not.toContain('class="kv0"');
  });
});
