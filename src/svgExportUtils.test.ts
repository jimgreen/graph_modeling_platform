// svgExportUtils 的设备 ID 映射与标签 markup（此前零直呼）
//
// 这些是**导出主链路上的静默失真源**：ID 撞车会让 SVG 里的 <use> 指错设备，
// 标签丢字/丢样式只表现为「画面有点不对」，不报任何错。
import { describe, expect, it } from "vitest";
import {
  buildExportDeviceIdMap,
  buildSvgNodeLabelMarkup,
  buildSvgNodeLabelTextElementsMarkup,
  exportDeviceMetadataAttributes,
  exportSvgLayerScriptMarkup,
  svgDisplayAttribute
} from "./svgExportUtils";
import type { ModelNode, Terminal } from "./model";
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
