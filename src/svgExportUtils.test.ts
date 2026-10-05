// svgExportUtils 的设备 ID 映射与标签 markup（此前零直呼）
//
// 这些是**导出主链路上的静默失真源**：ID 撞车会让 SVG 里的 <use> 指错设备，
// 标签丢字/丢样式只表现为「画面有点不对」，不报任何错。
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildExportDeviceIdMap,
  buildExportMeasurementGroupMarkup,
  buildSvgNodeLabelMarkup,
  buildSvgNodeLabelTextElementsMarkup,
  exportDeviceMetadataAttributes,
  exportMeasurementItemMetadataAttributes,
  exportSvgLayerScriptMarkup,
  svgDisplayAttribute
} from "./svgExportUtils";
import type { ModelNode, Terminal } from "./model";
import {
  DEFAULT_MEASUREMENT_CONFIG,
  type MeasurementGroup,
  type MeasurementItemBinding
} from "./measurements";
import { exportSvgLayerId, exportSvgSafeId, exportSvgUniqueId } from "./svgExportUtils";

// ─── 测试辅助 ─────────────────────────────────────────────

function makeTerminal(id: string, anchorX: number, anchorY: number): Terminal {
  return { id, label: id, type: "ac", anchor: { x: anchorX, y: anchorY }, nodeNumber: "" };
}

function makeNode(overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id: "n1",
    kind: "breaker" as ModelNode["kind"],
    name: "断路器1",
    nodeNumber: "",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x: 0, y: 0 },
    size: { width: 80, height: 40 },
    rotation: 0,
    scale: 1,
    terminals: [makeTerminal("t1", -0.5, 0), makeTerminal("t2", 0.5, 0)],
    params: {},
    ...overrides
  };
}

// ─── buildExportDeviceIdMap ───────────────────────────────

describe("svgExportUtils / buildExportDeviceIdMap", () => {
  it("空输入产出空映射", () => {
    expect(buildExportDeviceIdMap([], new Set()).size).toBe(0);
  });

  it("无 idx 的设备直接用节点 id，登记进 usedIds", () => {
    const used = new Set<string>();
    const map = buildExportDeviceIdMap([makeNode({ id: "n1" })], used);
    expect(map.get("n1")).toBe("n1");
    expect(used.has("n1")).toBe(true);
  });

  it("有 idx 的设备用 类型-idx 命名，节点 id 丢失是预期", () => {
    const map = buildExportDeviceIdMap([makeNode({ id: "n1", params: { idx: "3" } })], new Set());
    expect(map.get("n1")).not.toBe("n1");
    expect(map.get("n1")).toMatch(/-3$/);
  });

  it("idx 非法（非正整数/非数字）退回节点 id 路径", () => {
    for (const idx of ["0", "-2", "1.5", "abc", "", "  "]) {
      const map = buildExportDeviceIdMap([makeNode({ id: "n1", params: { idx } })], new Set());
      expect(map.get("n1"), `idx=${JSON.stringify(idx)}`).toBe("n1");
    }
  });

  it("同类型同 idx 冲突时后者重编号，不靠 usedIds 兜底加 _2 后缀", () => {
    // 两条路都能让 id 保持唯一：usedIndexes 重编号（-2）与 usedIds 去重（-1_2）。
    // 这里必须断的是**重编号**那条 —— 否则把 while 循环删掉，测试仍然是绿的。
    const nodes = [
      makeNode({ id: "a", params: { idx: "1" } }),
      makeNode({ id: "b", params: { idx: "1" } }),
      makeNode({ id: "c", params: { idx: "1" } })
    ];
    const map = buildExportDeviceIdMap(nodes, new Set());
    expect(map.get("a")).toBe("breaker-1");
    expect(map.get("b")).toBe("breaker-2");
    expect(map.get("c")).toBe("breaker-3");
  });

  it("跳号后重编号也走同一条路：idx 1、1、5 产出 1、2、5", () => {
    const map = buildExportDeviceIdMap(
      [
        makeNode({ id: "a", params: { idx: "1" } }),
        makeNode({ id: "b", params: { idx: "1" } }),
        makeNode({ id: "c", params: { idx: "5" } })
      ],
      new Set()
    );
    expect([...map.values()]).toEqual(["breaker-1", "breaker-2", "breaker-5"]);
  });

  it("不同类型各自独立编号，idx 不串味", () => {
    const nodes = [
      makeNode({ id: "a", kind: "breaker" as ModelNode["kind"], params: { idx: "1" } }),
      makeNode({ id: "b", kind: "transformer" as ModelNode["kind"], params: { idx: "1" } })
    ];
    const map = buildExportDeviceIdMap(nodes, new Set());
    expect(map.get("a")).not.toBe(map.get("b"));
  });

  it("id 里含非法字符时按 exportSvgSafeId 归一", () => {
    const map = buildExportDeviceIdMap([makeNode({ id: "1 断路器 #1" })], new Set());
    expect(map.get("1 断路器 #1")).toBe(exportSvgSafeId("1 断路器 #1", "device"));
    // 归一后不以数字开头（否则 XML id 非法）
    expect(map.get("1 断路器 #1")!.startsWith("_")).toBe(true);
  });

  it("归一后与既有 usedIds 撞车时加序号后缀", () => {
    const used = new Set(["breaker-1"]);
    const map = buildExportDeviceIdMap([makeNode({ id: "a", params: { idx: "1" } })], used);
    const id = map.get("a")!;
    expect(id).not.toBe("breaker-1");
    expect(id).toMatch(/^breaker-1_2$/);
  });

  it("静态图元走 静态-idx 命名，与普通设备区分", () => {
    const map = buildExportDeviceIdMap(
      [makeNode({ id: "s1", kind: "static-label" as ModelNode["kind"], params: { idx: "2" } })],
      new Set()
    );
    expect(map.get("s1")).toMatch(/^static-label-2$/);
  });

  it("静态图元按类型名排序分组处理，跨类型的输出与输入顺序无关", () => {
    // 这里的排序是 `staticNodesByType` 的键排序。**它对最终 id 不可观测**：
    // 静态 kind 必以 `static-` 开头（isStaticKind），而 `exportSvgSafeId` 保证 id
    // 不以数字开头，所以不同类型归一出的 typeId 恒不撞 usedIds —— 谁先谁后都拿到
    // `-1`。因此只断言「顺序无关」，不断言谁拿 `_2`（那会是我编出来的行为）。
    //
    // 换句话说：本文件无法用行为断言咬住这行 sort。真要钉住它，得改成断言
    // `staticNodesByType` 的遍历顺序，那是内部结构、不该从外部锁。
    const staticNode = (id: string, kind: string) =>
      makeNode({ id, kind: kind as ModelNode["kind"] });
    const forward = buildExportDeviceIdMap(
      [staticNode("a", "static-alpha"), staticNode("b", "static-beta")],
      new Set()
    );
    const reversed = buildExportDeviceIdMap(
      [staticNode("b", "static-beta"), staticNode("a", "static-alpha")],
      new Set()
    );
    expect(reversed.get("a")).toBe(forward.get("a"));
    expect(reversed.get("b")).toBe(forward.get("b"));
  });

  it("静态 typeId 恒不以数字开头，故跨类型不撞 usedIds（上面那条不可观测的根因）", () => {
    // 把上面那条 sort 的前提写死成可证伪的断言：换掉这个前提，「顺序无关」就该变红。
    const map = buildExportDeviceIdMap(
      [
        makeNode({ id: "a", kind: "static-alpha" as ModelNode["kind"] }),
        makeNode({ id: "b", kind: "static-beta" as ModelNode["kind"] })
      ],
      new Set()
    );
    for (const id of map.values()) {
      expect(id).toBe(exportSvgSafeId(id, "static"));
      expect(id).not.toMatch(/^\d/);
    }
    expect(map.get("a")).toBe("static-alpha-1");
    expect(map.get("b")).toBe("static-beta-1");
  });

  it("静态图元：有 idx 的先按 idx 排，无 idx 的补空位并按 id 排序", () => {
    const nodes = [
      makeNode({ id: "b1", kind: "static-alpha" as ModelNode["kind"] }),
      makeNode({ id: "a1", kind: "static-alpha" as ModelNode["kind"] }),
      makeNode({ id: "z", kind: "static-alpha" as ModelNode["kind"], params: { idx: "1" } })
    ];
    const map = buildExportDeviceIdMap(nodes, new Set());
    // idx=1 占了 1，无 idx 的按 id 升序补 2、3
    expect(map.get("z")).toBe("static-alpha-1");
    expect(map.get("a1")).toBe("static-alpha-2");
    expect(map.get("b1")).toBe("static-alpha-3");
  });

  it("每个节点都恰好映射到一个非空 id", () => {
    const nodes = [
      makeNode({ id: "a" }),
      makeNode({ id: "b", params: { idx: "1" } }),
      makeNode({ id: "c", kind: "static-alpha" as ModelNode["kind"] }),
      makeNode({ id: "d", kind: "static-alpha" as ModelNode["kind"], params: { idx: "5" } })
    ];
    const map = buildExportDeviceIdMap(nodes, new Set());
    expect(map.size).toBe(nodes.length);
    for (const node of nodes) {
      expect(map.get(node.id)).toBeTruthy();
    }
  });
});

// ─── svgDisplayAttribute ──────────────────────────────────

describe("svgExportUtils / svgDisplayAttribute", () => {
  it("可见且无附加声明时返回空串（不产生空 style 属性）", () => {
    expect(svgDisplayAttribute(true)).toBe("");
  });

  it("不可见时单独产出 display:none", () => {
    expect(svgDisplayAttribute(false)).toBe(' style="display:none"');
  });

  it("附加声明并入同一个 style，不另起一个 style= 顶掉隐藏属性", () => {
    expect(svgDisplayAttribute(false, "opacity:0.5")).toBe(' style="display:none;opacity:0.5"');
    expect(svgDisplayAttribute(true, "opacity:0.5")).toBe(' style="opacity:0.5"');
  });

  it("附加声明为空串时等价于不传", () => {
    expect(svgDisplayAttribute(false, "")).toBe(svgDisplayAttribute(false));
  });
});

// ─── exportDeviceMetadataAttributes ───────────────────────

describe("svgExportUtils / exportDeviceMetadataAttributes", () => {
  it("普通设备输出 idx/name/dev-id/dev-kind 四项", () => {
    const attrs = exportDeviceMetadataAttributes(makeNode({ id: "n1", name: "断路器1", params: { idx: "7" } }));
    expect(attrs).toBe('idx="7" name="断路器1" dev-id="n1" dev-kind="breaker"');
  });

  it("静态图元不输出元数据（它没有设备语义）", () => {
    expect(exportDeviceMetadataAttributes(makeNode({ kind: "static-alpha" as ModelNode["kind"] }))).toBe("");
  });

  it("deviceId 覆盖 dev-id，其余取自节点", () => {
    const attrs = exportDeviceMetadataAttributes(makeNode({ id: "n1", name: "断路器1" }), "exported-1");
    expect(attrs).toContain('dev-id="exported-1"');
    expect(attrs).toContain('name="断路器1"');
  });

  it("名称含 XML 元字符时转义", () => {
    const attrs = exportDeviceMetadataAttributes(makeNode({ name: 'A"B&C<D>' }));
    expect(attrs).toContain('name="A&quot;B&amp;C&lt;D&gt;"');
  });

  it("idx 缺省时输出空 idx 属性而非 undefined", () => {
    expect(exportDeviceMetadataAttributes(makeNode())).toContain('idx=""');
  });
});

// ─── buildSvgNodeLabelMarkup ──────────────────────────────

describe("svgExportUtils / buildSvgNodeLabelMarkup", () => {
  it("_labelText 为空串时返回空串（回落 name 被空串挡掉）", () => {
    expect(buildSvgNodeLabelMarkup(makeNode({ params: { _labelText: "" } }))).toBe("");
  });

  it("未设 _labelText 时回落节点名", () => {
    expect(buildSvgNodeLabelMarkup(makeNode({ name: "断路器1" }))).toContain("断路器1");
  });

  it("有文本时包在 export-node-label 水平类里，带 transform", () => {
    const markup = buildSvgNodeLabelMarkup(makeNode({ params: { _labelText: "断路器" } }));
    expect(markup).toContain('class="export-node-label horizontal"');
    expect(markup).toContain("<g ");
    expect(markup).toContain("</g>");
    expect(markup).toContain("断路器");
    expect(markup).toMatch(/transform="translate\([^)]*\)"/);
  });

  it("纵向标签走 vertical 类并逐字拆 token", () => {
    const markup = buildSvgNodeLabelMarkup(
      makeNode({ params: { _labelText: "AB", _labelRotation: "90" } })
    );
    expect(markup).toContain('class="export-node-label vertical"');
    expect(markup.match(/node-label-vertical-token/g)).toHaveLength(2);
  });

  it("标签文本中的 XML 元字符被转义", () => {
    const markup = buildSvgNodeLabelMarkup(makeNode({ params: { _labelText: '<a & "b">' } }));
    expect(markup).toContain("&lt;a &amp; &quot;b&quot;&gt;");
    expect(markup).not.toContain('<a & "b">');
  });

  it("标签显式隐藏时不产出 markup", () => {
    const hidden = makeNode({ params: { _labelText: "断路器", _labelVisible: "0" } });
    expect(buildSvgNodeLabelMarkup(hidden)).toBe("");
  });
});

// ─── buildSvgNodeLabelTextElementsMarkup ──────────────────

describe("svgExportUtils / buildSvgNodeLabelTextElementsMarkup", () => {
  it("_labelText 为空串时返回空串", () => {
    expect(buildSvgNodeLabelTextElementsMarkup(makeNode({ params: { _labelText: "" } }), "label-1")).toBe("");
  });

  it("未设 _labelText 时回落节点名", () => {
    expect(buildSvgNodeLabelTextElementsMarkup(makeNode({ name: "断路器1" }), "label-1")).toContain("断路器1");
  });

  it("水平标签：单个 text 带 id 与画布中心坐标", () => {
    const node = makeNode({ position: { x: 100, y: 50 }, params: { _labelText: "断路器" } });
    const markup = buildSvgNodeLabelTextElementsMarkup(node, "label-1");
    expect(markup).toContain('id="label-1"');
    expect(markup.match(/<text /g)).toHaveLength(1);
    expect(markup).not.toContain("display:none");
  });

  it("纵向标签：逐字 token，单字时用原 id、多字时加序号后缀", () => {
    const single = buildSvgNodeLabelTextElementsMarkup(
      makeNode({ params: { _labelText: "A", _labelRotation: "90" } }),
      "label-1"
    );
    expect(single).toContain('id="label-1"');
    const multi = buildSvgNodeLabelTextElementsMarkup(
      makeNode({ params: { _labelText: "AB", _labelRotation: "90" } }),
      "label-1"
    );
    expect(multi).toContain('id="label-1_1"');
    expect(multi).toContain('id="label-1_2"');
    expect(multi).not.toContain('id="label-1"');
  });

  it("visible:false 只是加 display:none 前缀，仍产出元素", () => {
    const markup = buildSvgNodeLabelTextElementsMarkup(
      makeNode({ params: { _labelText: "断路器" } }),
      "label-1",
      { visible: false }
    );
    expect(markup).toContain('id="label-1"');
    expect(markup).toContain("display:none;");
  });

  it("attributes 与基础属性合并进同一个 text 元素", () => {
    const markup = buildSvgNodeLabelTextElementsMarkup(
      makeNode({ params: { _labelText: "断路器" } }),
      "label-1",
      { attributes: 'class="custom"' }
    );
    expect(markup).toContain('class="custom"');
    expect(markup).toContain("dominant-baseline");
    // 合并进同一元素，而不是两个 <text>
    expect(markup.match(/<text /g)).toHaveLength(1);
  });

  it("id 中的 XML 元字符被转义", () => {
    const markup = buildSvgNodeLabelTextElementsMarkup(
      makeNode({ params: { _labelText: "断路器" } }),
      'a"b&c'
    );
    expect(markup).toContain('id="a&quot;b&amp;c"');
  });
});

// 导出 SVG 里的「静态按钮可点」交互脚本：includeLayerScript 决定导出文件带不带这段。
// 带的时候脚本里的 CSS 类名必须与渲染侧写进 SVG 的 class 对得上，否则导出的按钮点了没反应 ——
// 这类失真只表现为「浏览器里点不动」，不报任何错。
describe("svgExportUtils / exportSvgLayerScriptMarkup", () => {
  const ON = exportSvgLayerScriptMarkup(true);
  const OFF = exportSvgLayerScriptMarkup(false);

  it("★ 不给交互脚本时返回空串（导出文件里一点脚本都不留）", () => {
    expect(OFF).toBe("");
    expect(OFF).not.toContain("<script");
    expect(OFF).not.toContain("<style");
  });

  it("★ 给交互脚本时：<style> + <script> 都用 CDATA 包住", () => {
    expect(ON).toContain("<style><![CDATA[");
    expect(ON).toContain("<script><![CDATA[");
    expect(ON).toContain("]]></style>");
    expect(ON).toContain("]]></script>");
  });

  it("★ 脚本类名与渲染侧的 class 对得上（.export-static-button）", () => {
    expect(ON).toContain(".export-static-button { cursor: pointer; }");
    expect(ON).toContain(".export-static-button.export-active-layer-button");
  });

  it("★ 脚本以 document.currentScript 定位根节点，取不到就安静退出", () => {
    expect(ON).toContain("document.currentScript");
    expect(ON).toContain("ownerSVGElement");
    expect(ON).toMatch(/if \(!root\) \{\s*return;/);
  });

  it("★ 脚本查询的正是渲染侧写进 SVG 的那几个标记（查询口径写错 = 点了没反应）", () => {
    // 层定义容器 + 设备的 layer-id
    expect(ON).toContain('root.querySelectorAll(".export-layer-definitions > [layer-id]")');
    expect(ON).toContain('root.querySelectorAll("use[id][layer-id]")');
    // 连线靠 source/target 两端设备反查所属层
    expect(ON).toContain('root.querySelectorAll("[source-dev-id][target-dev-id]")');
    // 静态按钮靠 action="layer" 认出来
    expect(ON).toContain(`root.querySelectorAll("[action='layer']")`);
  });

  it("★ 隐藏层判定：没 layer-id 视为可见，写成 0 才算隐藏", () => {
    expect(ON).toContain("return !layerId || layerState[layerId] !== false;");
    expect(ON).toContain('layer.getAttribute("visible") !== "0"');
  });

  it("★ 高亮类名与 CSS 选择器里那个是同一个", () => {
    const cssClass = /\.export-static-button\.(export-[a-z-]+)/.exec(ON)?.[1];
    expect(cssClass).toBe("export-active-layer-button");
    expect(ON).toContain('button.classList.toggle("export-active-layer-button", targetLayerIds.includes(activeLayerId));');
  });

  it("真值与假值各调一次结果稳定（纯函数，无隐藏状态）", () => {
    expect(exportSvgLayerScriptMarkup(true)).toBe(ON);
    expect(exportSvgLayerScriptMarkup(false)).toBe(OFF);
  });
});

// ─── exportSvgUniqueId / exportSvgLayerId ─────────────────
//
// exportSvgUniqueId 是「保证导出 SVG 里所有 id 唯一」的唯一入口。
// 它此前只在量测值 id 那一处被间接用到（svgExportUtilsMeasurement.test.ts 的
// 「已占用的 id 会被去重成 _2」），**自身的三条规则没有直呼**：
// 先净化、占用则递增、净化后为空走 fallback。
//
// 判错的后果是两条 <use> 撞成同一个 id ⇒ 浏览器解析时后者覆盖前者 ⇒
// 画布上凭空少一个设备，而导出流程不报任何错。
describe("svgExportUtils / exportSvgUniqueId", () => {
  it("未占用时原样返回并登记进 usedIds", () => {
    const used = new Set<string>();
    expect(exportSvgUniqueId("node1", used, "device")).toBe("node1");
    expect(used.has("node1")).toBe(true);
  });

  it("已占用时递增 _2 / _3，直到不撞为止", () => {
    const used = new Set<string>();
    exportSvgUniqueId("node1", used, "device");
    expect(exportSvgUniqueId("node1", used, "device")).toBe("node1_2");
    expect(exportSvgUniqueId("node1", used, "device")).toBe("node1_3");
    expect(used.size).toBe(3);
  });

  it("跳号也能填上（已占用 _2 时给 _3，不退回 _2）", () => {
    const used = new Set(["node1", "node1_2"]);
    expect(exportSvgUniqueId("node1", used, "device")).toBe("node1_3");
  });

  it("原始 id 非法时先净化再查重（净化后也要走占用检查）", () => {
    const used = new Set<string>();
    expect(exportSvgUniqueId("a b", used, "device")).toBe("a_b");
    expect(exportSvgUniqueId("a b", used, "device")).toBe("a_b_2");
  });

  it("空串走 fallback，fallback 也撞就继续递增", () => {
    // exportSvgSafeId 的兜底条件是「净化结果为空串」，不是「原始 id 全非法」：
    // "!!!" 被整体替换成 "_"，而 "_" 是合法首字符 ⇒ 结果 "_"，不触发 fallback。
    // 想让 fallback 生效必须给**完全没有字符**的输入。
    const used = new Set<string>();
    expect(exportSvgUniqueId("", used, "device")).toBe("device");
    expect(exportSvgUniqueId("", used, "device")).toBe("device_2");

    const otherUsed = new Set<string>();
    expect(exportSvgUniqueId("!!!", otherUsed, "device")).toBe("_");
    // 递增是 `${baseId}_${index}`：baseId 已是 "_" ⇒ 撞上时给 "__2"（不是 "_2"）
    expect(exportSvgUniqueId("!!!", otherUsed, "device")).toBe("__2");
  });
});

describe("svgExportUtils / exportSvgLayerId", () => {
  it("在安全 id 后加 _Layer 后缀", () => {
    expect(exportSvgLayerId("layer 1", "fallback")).toBe("layer_1_Layer");
    // 同上：全非法字符被替换成 "_" 而不是走 fallback ⇒ "__Layer"
    expect(exportSvgLayerId("!!!", "fb")).toBe("__Layer");
    expect(exportSvgLayerId("", "fb")).toBe("fb_Layer");
  });

  it("同一个输入两次调用结果一致（纯函数，不读全局状态）", () => {
    expect(exportSvgLayerId("L1", "fb")).toBe(exportSvgLayerId("L1", "fb"));
  });
});

// ═══════════════════════════════════════════════════════════
// 以下补的是覆盖率报告里 svgExportUtils.ts 的未覆盖分支。
//
// 共同背景：这四条分支（152、268、269、278、279、280、281）全都是
// 「**同一个规范化动作的三件套**」——`String(x ?? "")` + `.trim()` + 「缺了就原样返回」
// 里的 nullish 兜底与空串早退。它们平时只在**畸形数据**（缺 id / 缺 sourcePoint）
// 下才走到，而畸形数据的症状是「导出的 SVG 里凭空多出 undefined 这个 id」，
// 不报任何错，所以必须直呼被测函数钉住。
// ═══════════════════════════════════════════════════════════

function makeItem(overrides: Partial<MeasurementItemBinding> = {}): MeasurementItemBinding {
  return {
    id: "measurement-1",
    measurementTypeId: "activePower",
    sourcePoint: "n1.P",
    ...overrides
  };
}

function makeGroup(overrides: Partial<MeasurementGroup> = {}): MeasurementGroup {
  return {
    id: "g1",
    nodeId: "n1",
    visible: true,
    anchor: "top",
    offset: { x: 0, y: 0 },
    layout: "vertical",
    items: [makeItem()],
    ...overrides
  };
}

// 畸形输入的统一写法：这几个参数在类型上是 string，但运行时的量测数据来自
// 本地缓存 / 导入包，缺字段就是 undefined/null。用 null（不是 undefined）是因为
// undefined 会命中小函数参数的默认值，等于绕过了被测的 `??` 分支。
const NULLISH = null as unknown as string;

// ─── 静态图元同 idx 冲突：重编号那条 while（152 行）───────────────────
describe("svgExportUtils / 静态图元 idx 冲突重编号（152 行 while）", () => {
  it("同类型静态图元撞 idx 时按 (idx, id) 排序后递增到下一个空位", () => {
    // 必须断「重编号」这条：删掉 152 行的 while 后三个节点会拿到
    // static-alpha-1 / static-alpha-1_2 / static-alpha-1_3（走 usedIds 去重那条路）。
    // 断言写成 toEqual 数组而不是 toMatch(-N$) 就是为了让 _2 后缀那条路变红。
    const nodes = [
      makeNode({ id: "s1", kind: "static-alpha" as ModelNode["kind"], params: { idx: "1" } }),
      makeNode({ id: "s2", kind: "static-alpha" as ModelNode["kind"], params: { idx: "1" } }),
      makeNode({ id: "s3", kind: "static-alpha" as ModelNode["kind"], params: { idx: "1" } })
    ];
    const map = buildExportDeviceIdMap(nodes, new Set());
    expect([...map.entries()].map(([nodeId]) => nodeId)).toEqual(["s1", "s2", "s3"]);
    expect([...map.values()]).toEqual([
      "static-alpha-1",
      "static-alpha-2",
      "static-alpha-3"
    ]);
  });

  it("冲突时往后找的是「已占用的号」，不是下一个节点（1、2、2 ⇒ 1、2、3）", () => {
    // 覆盖 while 的**多次**递增：第三个节点请求的 2 已被 s2 占掉，须再 +1 到 3。
    const nodes = [
      makeNode({ id: "s1", kind: "static-alpha" as ModelNode["kind"], params: { idx: "1" } }),
      makeNode({ id: "s2", kind: "static-alpha" as ModelNode["kind"], params: { idx: "2" } }),
      makeNode({ id: "s3", kind: "static-alpha" as ModelNode["kind"], params: { idx: "2" } })
    ];
    expect([...buildExportDeviceIdMap(nodes, new Set()).values()]).toEqual([
      "static-alpha-1",
      "static-alpha-2",
      "static-alpha-3"
    ]);
  });

  it("同 idx 撞车的静态图元与普通设备互不影响（两条 while 各走各的）", () => {
    const nodes = [
      makeNode({ id: "d1", kind: "breaker" as ModelNode["kind"], params: { idx: "1" } }),
      makeNode({ id: "d2", kind: "breaker" as ModelNode["kind"], params: { idx: "1" } }),
      makeNode({ id: "s1", kind: "static-alpha" as ModelNode["kind"], params: { idx: "1" } }),
      makeNode({ id: "s2", kind: "static-alpha" as ModelNode["kind"], params: { idx: "1" } })
    ];
    const map = buildExportDeviceIdMap(nodes, new Set());
    expect([...map.values()]).toEqual([
      "breaker-1",
      "breaker-2",
      "static-alpha-1",
      "static-alpha-2"
    ]);
  });
});

// ─── exportMeasurementSourcePoint 的 nullish / 空串守卫（278、279、280、281 行）──
describe("svgExportUtils / exportMeasurementItemMetadataAttributes · sourcePoint 前缀守卫", () => {
  it("★ sourcePoint 为 null 时按空串处理：不输出 mf，而不是 mf=\"null\"", () => {
    // 去掉 278 行的 `?? ""` ⇒ String(null) = "null" ⇒ rawValue 非空 ⇒
    // 281 行不早退 ⇒ 前缀循环匹配不上 ⇒ 输出 mf="null"。断在这里能咬住那个 `??`。
    const attrs = exportMeasurementItemMetadataAttributes(makeItem(), "n1", "d1", NULLISH, "activePower");
    expect(attrs).toBe('mt="activePower" mti="activePower"');
  });

  it("★ sourcePoint 只有空白时按空串处理：trim 生效，不写出 mf=\"   \"", () => {
    // 覆盖 281 行的 `!rawValue` 早退；**区分点是空白串而非空串**：
    // 空串走 `?? ""` 那侧也为空，只有 "   " 能证明 278 行的 `.trim()` 在干活。
    //
    // ⚠ 变异记录（已实测，别再重查）：把 281-283 整个早退删掉，这条**仍然绿**，
    // 而且是**可证等价**、不是输入没覆盖 —— rawValue 为空串时，下面 for 循环里
    // 任何非空前缀都匹配不上（`"".startsWith(p + ".")` 对任意非空 p 恒 false），
    // 空前缀又被 `prefix &&` 挡掉，于是循环必然落到 289 行 `return rawValue`。
    // 换句话说 282 行的 return 与 289 行的 return 在这条路径上同值。
    // **什么时候这条会不再等价**：若前缀匹配改成允许空前缀（去掉 `prefix &&`），
    // 或改成按包含关系而非前缀匹配 —— 那时空串会先命中空前缀而返回错值，
    // 上面这条断言就会转红。
    expect(exportMeasurementItemMetadataAttributes(makeItem(), "n1", "d1", "   ", "activePower")).toBe(
      'mt="activePower" mti="activePower"'
    );
  });

  it("★ nodeId 为 null 时不得把字面量 null 当节点前缀剥掉", () => {
    // 合成输入：sourcePoint 以 "null." 开头。只有这样的输入才能观察到
    // `String(nodeId ?? "")`（279 行）的差别 —— internalNodeId 缺省时必须以 "" 参与
    // 前缀匹配；若被 String 化成 "null"，就会把 "null." 当成节点前缀剥掉。
    const attrs = exportMeasurementItemMetadataAttributes(
      makeItem({ sourcePoint: "null.temperature" }),
      NULLISH,
      "d1"
    );
    expect(attrs).toContain('mf="null.temperature"');
  });

  it("★ deviceId 为 null 时不得把字面量 null 当导出 id 前缀剥掉", () => {
    // 与上一条同形，但只让 deviceId 缺省、nodeId 正常，用来单独咬住 280 行。
    const attrs = exportMeasurementItemMetadataAttributes(
      makeItem({ sourcePoint: "null.current" }),
      "n1",
      NULLISH
    );
    expect(attrs).toContain('mf="null.current"');
  });

  it("对照组：两个前缀都是正常字符串时，该剥的照样剥（证明上面三条不是恒绿）", () => {
    // 前缀循环的正常路径：剥掉节点前缀 → 与 mt 相同就不输出 mf；
    // 用导出 id 前缀（SVG 往返后的形态）同样要剥掉。
    expect(
      exportMeasurementItemMetadataAttributes(makeItem({ measurementTypeId: "P" }), "n1", "n1")
    ).toBe('mt="P" mti="P"');
    expect(
      exportMeasurementItemMetadataAttributes(makeItem({ sourcePoint: "d1.P" }), "n1", "d1")
    ).toContain('mf="P"');
  });
});

// ─── exportMeasurementScopedId 的 nullish 守卫（268、269 行）────────
describe("svgExportUtils / buildExportMeasurementGroupMarkup · 项 id 作用域化守卫", () => {
  it("★ 项 id 为 null 时值 id 退回 deviceId，而不是拼出字面量 null", () => {
    // 268 行的 `?? ""`：去掉后 String(null) = "null" 非空 ⇒ 271 行的早退不触发
    // ⇒ exportedItemId 变成 "null" ⇒ 值 id 变成 mv-n1-null。
    const markup = buildExportMeasurementGroupMarkup(
      makeNode({ id: "n1" }),
      makeGroup({ items: [makeItem({ id: NULLISH })] }),
      DEFAULT_MEASUREMENT_CONFIG,
      new Set()
    );
    expect(markup).toMatch(/id="mv-n1"/);
    expect(markup).not.toMatch(/id="mv-[^"]*null/);
  });

  it("★ 节点 id 为 null 时不做作用域替换，项 id 原样进值 id", () => {
    // 269 行的 `?? ""`：合成项 id 里含字面量 "null"（缺字段被序列化成字符串的形态）。
    // 去掉守卫后 internalNodeId 变成 "null" ≠ ownerDeviceId ⇒ 274 行会把 id 里的
    // "null" 替换成 owner id ⇒ 值 id 从 mv-null-x 变成 mv-owner-1-x。
    const markup = buildExportMeasurementGroupMarkup(
      makeNode({ id: NULLISH }),
      makeGroup({ items: [makeItem({ id: "measurement-null-x" })] }),
      DEFAULT_MEASUREMENT_CONFIG,
      new Set(),
      { deviceId: "dev-1", ownerDeviceId: "owner-1" }
    );
    expect(markup).toMatch(/id="mv-null-x"/);
  });

  it("对照组：节点 id 与 owner id 不同时才做作用域替换（证明上面那条不是恒绿）", () => {
    const markup = buildExportMeasurementGroupMarkup(
      makeNode({ id: "n1" }),
      makeGroup({ items: [makeItem({ id: "n1-thing" })] }),
      DEFAULT_MEASUREMENT_CONFIG,
      new Set(),
      { deviceId: "dev-1", ownerDeviceId: "owner-1" }
    );
    expect(markup).toMatch(/id="mv-dev-1-owner-1-thing"/);
  });

  // ⚠ 同一组里的 270 与 293 行**没有**行为断言，不是漏写，是断不了（已推演）：
  //
  // 270 行（stableDeviceId 的 `?? ""`）：它的实参是
  //   `options.ownerDeviceId ?? (options.deviceId ?? node.id)`，所以
  //   「stableDeviceId 为 nullish」蕴含「node.id 也为 nullish」⇒ internalNodeId
  //   同样是空串 ⇒ 271 行的 `!internalNodeId` 先短路返回，stableDeviceId 后面
  //   （只有 274 行的 replace 用得到）永远用不上。把 270 行的 `??` 去掉，
  //   internalNodeId 与 stableDeviceId 会**同时**变成字符串 "null" ⇒ 271 行的
  //   `internalNodeId === stableDeviceId` 又成立 ⇒ 早退照旧。**可证等价。**
  //
  // 293 行（rawItemId 的 `?? ""`）：实参是 exportMeasurementScopedId 的返回值，
  //   而那个返回值恒为字符串（`String(x ?? "")` 永不产出 undefined/null）⇒
  //   `??` 右侧**不可达**，不是等价问题而是压根到不了。
  //
  // 要让这两行变得可断，得先改生产代码的调用契约（例如给 node.id 一个显式的
  // 「缺失」表示），那是另一个 lane 的事。
});

// ─── buildSvgNodeLabelTextMarkup 内的空文本早退（32 行）是死代码 ─────
//
// 32 行 `if (!text) return ""` 永远不成立：那个函数**只有一个调用点**（52 行），
// 而调用点在 49 行已经先判过 `|| !text`。两条防线判的是同一个纯函数
// nodeLabelText（`node.params._labelText ?? node.name`），所以真走到 32 行时
// text 必然非空。行为断言覆盖不到它，改用静态守卫钉住「让它变可达的前提」。
describe("svgExportUtils / buildSvgNodeLabelTextMarkup 的空文本早退不可达", () => {
  const source = readFileSync(new URL("./svgExportUtils.ts", import.meta.url), "utf8");

  const countCallSites = (src: string) =>
    src
      .split(/\r?\n/)
      .filter((text) => text.includes("buildSvgNodeLabelTextMarkup(") && !/^\s*(export\s+)?function\s+buildSvgNodeLabelTextMarkup/.test(text))
      .length;
  const countEmptyTextGuards = (src: string) =>
    src.split(/\r?\n/).filter((text) => text.includes("nodeLabelShouldRender(node, true) || !text")).length;

  it("检测逻辑自测：两个计数器都看得见它们各自该抓的改动", () => {
    // ① 守卫计数器：最可能的变异是删掉某处的 `|| !text`，必须被看见。
    const guardMutated = source.replace(
      "nodeLabelShouldRender(node, true) || !text",
      "nodeLabelShouldRender(node, true)"
    );
    expect(guardMutated).not.toBe(source);
    expect(countEmptyTextGuards(guardMutated)).toBe(countEmptyTextGuards(source) - 1);

    // ② 调用点计数器：在**同一个文件里**再插一处调用必须被数出来。
    // 这里用行谓词排除声明行，而不是跳过整个文件 —— 否则同文件注入会整体漏掉。
    const callMutated = source.replace(
      "  const baseAttributes = svgNodeLabelBaseAttributes(node);",
      "  const extra = buildSvgNodeLabelTextMarkup(node);\n  const baseAttributes = svgNodeLabelBaseAttributes(node);"
    );
    expect(callMutated).not.toBe(source);
    expect(countCallSites(callMutated)).toBe(countCallSites(source) + 1);
    // 合成输入：声明行本身不算调用点
    expect(countCallSites("function buildSvgNodeLabelTextMarkup(node: ModelNode) {\n  return 1;\n}")).toBe(0);
    expect(countCallSites("  buildSvgNodeLabelTextMarkup(node);\n")).toBe(1);
  });

  it("唯一调用点之前已有空文本守卫 ⇒ 32 行的 !text 分支不可达", () => {
    expect(countCallSites(source)).toBe(1);
    // 两个导出入口（markup 与 textElements）都在调用前挡掉了空文本
    expect(countEmptyTextGuards(source)).toBe(2);
  });
});
