// 「查看/编辑E文件」窗口的列解析：必须与导出侧同一单源（eSectionColumns）。
// 成员关系段 ACContainerDev 的记录**不带 columns**（列定义由 E_SECTION_COLUMNS 兜底）——
// 编辑器只读 record.columns 时该表列集为空，表头与单元格全部不渲染（实机反馈轮 16「同一表内容仍是空」的根因）：
// 导出文件同表有列有行（导出走 formatESection → eSectionColumns），窗口却是一片空表。
import { describe, expect, test } from "vitest";
import { createElement } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { EFileEditor, isTopologyField, EDITABLE_ID_FIELDS, type EDeviceRecord } from "./EFileEditor";
import {
  buildEDeviceRecords,
  buildEFileExport,
  eFileInterfaceDefinitionIndex,
  eOutputSectionName,
  E_REFERENCE_FIELD_TABLE_IDS,
  finalizeEDevicePreviewRecords
} from "./model-eexport";
import { assignPermanentDeviceIndex, type ModelNode, type ProjectFile } from "./model";
import { createDefaultNode } from "./model-node-ops";

/** 容器 + 1 个成员（成员经 containerId 归属）——与用户实机模型同构的最小夹具 */
function createContainerProject(): ProjectFile {
  let counters: Record<string, number> = {};
  const make = (kind: string): ModelNode => {
    const assigned = assignPermanentDeviceIndex(createDefaultNode(kind as never, { x: 100, y: 100 }), counters);
    counters = assigned.counters;
    return assigned.node;
  };
  const container = make("ac-vpp-box");
  const member = make("ac-source");
  member.containerId = container.id;
  return { version: 1, name: "编辑器列解析模型", nodes: [container, member], edges: [] };
}

/** 复刻 appView 打开窗口时的 records 生成链（buildEDeviceRecords → 定稿），取成员关系段 */
function memberRecordsFromWindowChain(project: ProjectFile): EDeviceRecord[] {
  const records = buildEDeviceRecords(project);
  finalizeEDevicePreviewRecords(project, {}, records);
  return records.filter((record) => record.section === "ACContainerDev") as EDeviceRecord[];
}

describe("EFileEditor 成员关系段列解析", () => {
  test("ACContainerDev 记录不带 columns 时仍按兜底列渲染（表头 + 单元格非空）", () => {
    const project = createContainerProject();
    const memberRecords = memberRecordsFromWindowChain(project);
    expect(memberRecords).toHaveLength(1);
    // 数据事实：成员记录没有 columns 字段（列定义在 E_SECTION_COLUMNS 兜底）—— 这正是窗口空表的前提
    expect(memberRecords[0].columns).toBeUndefined();

    const html = renderToStaticMarkup(
      createElement(EFileEditor, { open: true, onClose: () => {}, records: memberRecords })
    );

    // 三列表头必须出现在窗口里（修复前：列集为空 → 表头与行全不渲染，用户看到空表）
    expect(html).toContain("device_id");
    expect(html).toContain("container_idx");
    expect(html).toContain("container_type");
    // 单元格取值与导出文件逐值对拍：device_id 为定稿后的「表名_idx」，container_idx 为容器裸 idx
    const fileText = buildEFileExport(project).text;
    const fileRow = fileText.match(/<ACContainerDev>[\s\S]*?\n#\s+(\S+)\s+(\S+)\s+(\S+)/);
    expect(fileRow).toBeTruthy();
    expect(html).toContain(fileRow![1]);
    expect(html).toContain(`title="${fileRow![2]}"`);
    expect(html).toContain(fileRow![3]);
  });

  test("多能流容器合表:4 个内部段只长 1 个 container tab + 1 个 container_dev tab(用户实况:曾出现 2+2 个重复表名)", () => {
    // 模板态四类容器全落 container / container_dev(靠 dev_type 区分),预览必须与导出的 E 文件一致:
    // 一个表名一个 tab。按类内部名分组会让同名表重复长 tab。
    const pairs = [
      ["ac-vpp-box", "ac-source"],
      ["dc-vpp-box", "dc-source"],
      ["hydrogen-vpp-box", "hydrogen-source"],
      ["heat-vpp-box", "heat-source"]
    ] as const;
    let counters: Record<string, number> = {};
    const containers: ModelNode[] = [];
    const members: ModelNode[] = [];
    for (const [containerKind, memberKind] of pairs) {
      for (const [bucket, kind] of [[containers, containerKind], [members, memberKind]] as const) {
        const assigned = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100, y: 100 }), counters);
        counters = assigned.counters;
        bucket.push(assigned.node);
      }
    }
    members.forEach((member, index) => { member.containerId = containers[index].id; });
    const project: ProjectFile = {
      version: 1,
      name: "四能流容器预览模型",
      nodes: [...containers, ...members],
      edges: []
    };

    // 模板未定义任何容器段 → 四类全走兜底名
    const options = { eDeviceDefinitionLabels: { ACNode: "node" } };
    const records = buildEDeviceRecords(project, options);
    finalizeEDevicePreviewRecords(project, options, records);
    const defs = eFileInterfaceDefinitionIndex(options);
    const labeled = records
      .filter((record) => /Container(Dev)?$/.test(record.section))
      .map((record) => ({ ...record, sectionLabel: eOutputSectionName(record.section, defs, options) }) as EDeviceRecord);
    // 前置:4 个内部容器段 + 4 个成员段,且标签确实都塌成同名(合表前提成立)
    expect(new Set(labeled.filter((r) => r.sectionLabel === "container").map((r) => r.section)).size).toBe(4);
    expect(new Set(labeled.filter((r) => r.sectionLabel === "container_dev").map((r) => r.section)).size).toBe(4);

    const html = renderToStaticMarkup(
      createElement(EFileEditor, { open: true, onClose: () => {}, records: labeled })
    );
    // 每个表名只出现一次 tab。tab 条在 e-file-editor-content **内**(content 先出现,再是 tabs),
    // 截取范围取 tabs → table-container;按钮文本被 antd Button 包在 <span> 里。
    const tabsHtml = html.slice(
      html.indexOf('class="e-file-editor-tabs"'),
      html.indexOf('class="e-file-editor-table-container"')
    );
    const tabNames = [...tabsHtml.matchAll(/<button[^>]*><span>([^<]*)<\/span><\/button>/g)].map((m) => m[1].trim());
    expect(tabNames.filter((name) => name === "container")).toHaveLength(1);
    expect(tabNames.filter((name) => name === "container_dev")).toHaveLength(1);
    // 4 个容器行 + 4 个成员行都在这一张表里(合表不是丢行)
    expect(labeled.filter((r) => r.sectionLabel === "container")).toHaveLength(4);
    expect(labeled.filter((r) => r.sectionLabel === "container_dev")).toHaveLength(4);
    // 与导出文件对拍:文件里 container / container_dev 各只出现一次
    const fileText = buildEFileExport(project, ["默认方案"], options).text;
    expect(fileText.match(/<container>/g)).toHaveLength(1);
    expect(fileText.match(/<container_dev>/g)).toHaveLength(1);
  });

  test("表名 tab 统一宽度:容器挂 ref、按钮吃实测 minWidth、按最大宽度取齐（轮 21）", () => {
    // 实测宽度需真实 DOM（本环境是 node/SSR,渲染不出布局）,守源码接线:
    // 容器 ref → useLayoutEffect 量 max(getBoundingClientRect().width) → 全按钮 style.minWidth
    const source = readFileSync(new URL("./EFileEditor.tsx", import.meta.url), "utf8");
    expect(source).toContain('className="e-file-editor-tabs" ref={tabsRef}');
    expect(source).toContain("style={tabMinWidth ? { minWidth: tabMinWidth } : undefined}");
    // 量前先清零再取 Math.max,量完还原。清零必须是 `""`(auto,即时生效) ——
    // 用 `0px` 会被按钮的 transition 插值吃掉,t=0 同步量到的还是被撑大的旧值(rev-fb23 MEDIUM-1)
    expect(source).toContain('button.style.minWidth = ""');
    expect(source).not.toContain('button.style.minWidth = "0px"');
    expect(source).toContain("Math.max(");
    expect(source).toContain("getBoundingClientRect().width");
    // 单位是 px:minWidth 是数值(React 会补 px);传字符串会漏单位
    expect(source).toContain("const [tabMinWidth, setTabMinWidth] = useState(0)");
    // 重测依赖收窄到标签集合指纹,避免编辑模式逐键强制同步布局(rev-fb23 LOW)
    expect(source).toContain("}, [open, tabLabelsKey]);");
  });

  test("复制到剪贴板只有一份实现（textarea 回退曾一字不差写两遍）", () => {
    const source = readFileSync(new URL("./EFileEditor.tsx", import.meta.url), "utf8");
    // 锚点只取 `execCommand("copy")` 这段前缀：它现在还带着返回值比较，
    // 故断言「执行 execCommand 的地方全文只有一处」（回退实现没被复制成两份）。
    expect(source.match(/document\.execCommand\("copy"\)/g)).toHaveLength(1);
    // 调用点也只有一个，且挂在同一个 copyTextToClipboard 的 promise 链上
    expect(source.match(/copyTextToClipboard\(text\)/g)).toHaveLength(1);
  });

  test("模板态容器表以兜底名 container 出现在窗口（轮 17；轮 20 起列集与无模板态一致）", () => {
    const project = createContainerProject();
    // 模板态真实形状：有模板配置、容器类未命中模板（定义仍在、只被类门控置 exportEnabled=false）
    // —— 与实机加载模板后同一形态，列集也照样按定义重建（轮 20 裁决：两态同列）
    const options = {
      eDeviceDefinitionLabels: { ACNode: "交流节点" },
      interfaceDefinitions: [
        {
          componentLibrary: "ACNode",
          exportEnabled: true,
          exportName: "ACNode",
          fields: [
            { sourceName: "idx", exportEnabled: true, exportName: "idx" },
            { sourceName: "name", exportEnabled: true, exportName: "name" }
          ]
        },
        {
          componentLibrary: "ACContainer",
          exportEnabled: false,
          exportName: "ACContainer",
          fields: ["idx", "name", "parent", "dev_type", "p", "q", "u", "i", "is_gateway", "bound_device_idx"]
            .map((column) => ({ sourceName: column, exportEnabled: true, exportName: column }))
        }
      ]
    };
    const records = buildEDeviceRecords(project, options);
    finalizeEDevicePreviewRecords(project, options, records);
    // 复刻 appView 的 sectionLabel 链：段标签与导出侧同一单源
    const defs = eFileInterfaceDefinitionIndex(options);
    const containerRecords = records
      .filter((record) => record.section === "ACContainer")
      .map((record) => ({ ...record, sectionLabel: eOutputSectionName(record.section, defs, options) }) as EDeviceRecord);
    expect(containerRecords).toHaveLength(1);
    // 段名分叉：展示标签是兜底名 container（CamelCase ACContainer 是无模板态的展示名）
    expect(containerRecords[0].sectionLabel).toBe("container");

    const html = renderToStaticMarkup(
      createElement(EFileEditor, { open: true, onClose: () => {}, records: containerRecords })
    );
    // 与导出文件列头逐项对拍（含 parent/p/q/u/i 等空值列；修复前该记录压根不产出，窗口无此表）
    expect(html).toContain(">container<");
    const fileText = buildEFileExport(project, ["默认方案"], options).text;
    const fileHeader = fileText.match(/<container>\n@\s+([^\n]+)/);
    expect(fileHeader).toBeTruthy();
    const fileColumns = fileHeader![1].trim().split(/\s+/);
    expect(fileColumns).toEqual(expect.arrayContaining(["parent", "p", "dev_type", "is_gateway"]));
    for (const column of fileColumns) {
      expect(html).toContain(column);
    }
    // 与导出文件逐值对拍：同一模型同模板下 <container> 行的首三列取值
    const containerRow = fileText.match(/<container>[\s\S]*?\n#\s+(\S+)\s+(\S+)\s+(\S+)/);
    expect(containerRow).toBeTruthy();
    expect(html).toContain(`title="${containerRow![1]}"`);
    expect(html).toContain(containerRow![2]);
    expect(html).toContain(containerRow![3]);
  });
});

// ---------------------------------------------------------------------------
// 未覆盖分支补测（行号对应 src/EFileEditor.tsx 当前版本）
//
// 本仓 vitest 是 environment:"node"，没有 jsdom —— 渲染只能走 react-dom/server 的
// renderToStaticMarkup，**事件回调一个都不会被触发**。因此本批只覆盖两类分支：
//   ① 导出的纯函数 isTopologyField（可直接调用，含其内部白名单早退分支）；
//   ② SSR 渲染结果本身即可观测的分支（open 早退、active 类、三处 toast 守卫、空记录兜底）。
// 依赖交互的分支（editMode=true、copiedCell/savedMessage/protectedToast 的真值分支）
// 在本环境不可达，见文件末尾「不可达分支」说明。
// ---------------------------------------------------------------------------

/** 最小夹具：含 id/idx 两个拓扑字段 + rdf_id 白名单字段 + 普通字段 */
const SAMPLE_RECORDS: EDeviceRecord[] = [
  {
    id: "r1",
    kind: "ac-source",
    section: "ACGenerator",
    params: { id: "1", idx: "1", name: "G1", rdf_id: "RDF-1" },
    columns: ["id", "idx", "name", "rdf_id"]
  }
];

const renderEditor = (props: Partial<Parameters<typeof EFileEditor>[0]> = {}): string =>
  renderToStaticMarkup(
    createElement(EFileEditor, { open: true, onClose: () => {}, records: SAMPLE_RECORDS, ...props })
  );

/** 取出模式切换按钮（查看/编辑）各自的 class 属性值 */
const modeButtonClass = (html: string, title: "查看模式" | "编辑模式"): string | undefined =>
  html.match(new RegExp(`<button title="${title}"[^>]*class="([^"]*)"`))?.[1];

describe("EFileEditor 未覆盖分支：拓扑字段白名单早退（EFileEditor.tsx:101）", () => {
  test("rdf_id 命中 EDITABLE_ID_FIELDS 即早退放行，尽管它以 _id 结尾（走不到 endsWith 分支）", () => {
    // 判别力：rdf_id 满足 col.endsWith("_id")，若白名单早退被删/被反向，
    // 结果会翻成 true —— 所以这条断言确实在咬 101 行，而不是恒绿。
    expect("rdf_id".endsWith("_id")).toBe(true);
    expect(EDITABLE_ID_FIELDS.has("rdf_id")).toBe(true);
    expect(isTopologyField("rdf_id")).toBe(false);

    // 对照组：同族但不在白名单的 _id 字段仍判为拓扑字段。
    // 用一个硬编码变异不会挑的名字，且先证明它不在任何映射表里（否则翻转理由不成立）。
    expect(E_REFERENCE_FIELD_TABLE_IDS["custom_owner_id"]).toBeUndefined();
    expect(isTopologyField("custom_owner_id")).toBe(true);
    // 双边断言的鉴别力：两个输入的结论必须真的不同，否则上面两条都是同义反复
    expect(isTopologyField("rdf_id")).not.toBe(isTopologyField("custom_owner_id"));
    // 白名单不得越权放行别的行标识字段
    expect(EDITABLE_ID_FIELDS.has("id")).toBe(false);
    expect(isTopologyField("id")).toBe(true);
  });
});

describe("EFileEditor 未覆盖分支：open 早退（EFileEditor.tsx:291）", () => {
  test("open=false 时整个窗口不渲染；open=true 时照常渲染（早退不能被写反）", () => {
    // 判别力：把 `if (!open) return null` 写成 `if (open) return null`，
    // 下面第二行（含标题的对照）立刻红。
    expect(renderEditor({ open: false })).toBe("");
    const opened = renderEditor({ open: true });
    expect(opened).toContain("E文件查看与编辑");
    expect(opened).toContain('class="e-file-editor-tabs"');
    expect(opened).toContain("e-file-editor-table-container");
  });
});

describe("EFileEditor 未覆盖分支：空记录段的取值兜底（EFileEditor.tsx:294/295/298）", () => {
  test("records 为空：分组为空 → 无当前段、不出表、不崩", () => {
    // 前置数据事实：空数组分不出任何 section，activeSection=0 越界 → currentSection 为 undefined
    const html = renderEditor({ records: [] });
    expect(html).toContain("E文件查看与编辑");
    // tab 条在但不挂任何按钮（没有可切的面板）
    expect(html).toContain('<div class="e-file-editor-tabs"></div>');
    expect(html).not.toContain("e-file-editor-table-container");
    // 294/295/298 的兜底值（"" / [] / []）在此路径被真正取到，且不会顺着
    // sectionRecords.map / columns.map 炸掉 —— 这就是它们兜底的目的
    expect(html).not.toContain("<table");
  });

  test("兜底取值的接线必须留在源码里（保语义改写只能静态守，会崩的改写动态也守）", () => {
    // 边界（变异实测 M6/M8 校准，别再放宽）：
    // · **保语义改写**只能静态守。M6 把 `currentSection?.records || []` 换成
    //   `currentSection ? currentSection.records : []`（等价），10 条动态用例全绿，只有本条红 ——
    //   因为空记录路径里这些值只被 410 的 `currentSection &&` 挡住，运行期读不到差异。
    // · **会崩的改写**动态也守得住。M8 把 298 的 `: []` 换成 `currentSection!.key`（真崩），
    //   「records 为空」用例直接 TypeError 转红，并不只靠本条静态守卫。
    // 它们的契约是「万一 currentSection 为空也不能解引用 undefined」，
    // 按静态守卫守住，并逐行精确匹配（不是整文件跳过）。
    const source = readFileSync(new URL("./EFileEditor.tsx", import.meta.url), "utf8");
    expect(source).toContain('const sectionName = currentSection?.label || "";');
    expect(source).toContain("const sectionRecords = currentSection?.records || [];");
    expect(source).toContain(
      "const columns = currentSection ? eSectionColumns(currentSection.key, sectionRecords) : [];"
    );
  });
});

describe("EFileEditor 未覆盖分支：模式按钮 active 类（EFileEditor.tsx:357/366）", () => {
  test("默认查看态：active 只落在查看按钮上，编辑按钮没有 active", () => {
    const html = renderEditor();
    const viewClass = modeButtonClass(html, "查看模式");
    const editClass = modeButtonClass(html, "编辑模式");
    // 前置：两个按钮都渲染出来了（否则 not.toBe 会因 undefined 而空洞地通过）
    expect(viewClass).toBeTruthy();
    expect(editClass).toBeTruthy();
    // 357：`!editMode ? "active" : ""` —— 默认 editMode=false → 查看按钮带 active
    expect(viewClass!.split(/\s+/)).toContain("active");
    // 366：`editMode ? "active" : ""` —— 默认 editMode=false → 编辑按钮不带 active
    expect(editClass!.split(/\s+/)).not.toContain("active");
    // 判别力：任一侧的三元被写反（本轮变异 357↔366）都会红
    expect(viewClass!.includes("active")).not.toBe(editClass!.includes("active"));
  });
});

describe("EFileEditor 未覆盖分支：三条 toast 守卫（EFileEditor.tsx:375/378/381）", () => {
  test("未触发任何动作时不出现复制/保存/拓扑提示 toast", () => {
    const html = renderEditor();
    expect(html).not.toContain("已复制到剪切板");
    expect(html).not.toContain("已保存");
    expect(html).not.toContain("为模型拓扑字段");
    // 判别力：not.toContain 只有在「文案真的存在于另一条分支」时才有意义。
    // 把三个守卫的条件写反（`!== null`→`=== null` 等）时，三个 toast 会一起冒出来 → 红。
    const source = readFileSync(new URL("./EFileEditor.tsx", import.meta.url), "utf8");
    expect(source).toContain("已复制到剪切板");
    expect(source).toContain("已保存");
    expect(source).toContain("为模型拓扑字段");
    // 且这些文案不来自记录数据（记录里没有它们），否则上面的否定断言在夹具下就是同义反复
    expect(renderEditor({ records: SAMPLE_RECORDS })).not.toContain("e-file-editor-copied-toast");
    // 拓扑 toast（:381）必须断 class 名而不是文案 —— M7 变异实测：
    // 把 protectedToast 守卫翻成 `!protectedToast` 时，上面的 `not.toContain("为模型拓扑字段")`
    // **观察不到差异**。翻向后 div 照样渲染，但渲染成空标签：唯一子节点是 {protectedToast}，
    // 此时恰为 null，React 不输出任何子节点；文案只存在于 showProtectedToast 的模板字符串里，
    // 要产出它必须触发交互回调，而 SSR 下回调一个都不会跑。
    // 即：文案在这个变异下物理不可达，可达的观测面只有 class 名 —— 断错面则该守卫恒绿。
    expect(html).not.toContain("e-file-editor-protected-toast");
  });
});

// ===========================================================================
// 卸载清理 / 复制结果校验
//
// 本仓 vitest 是 environment:"node"，没有 jsdom、没有 @testing-library、
// 没有 react-test-renderer（见 根 AGENTS.md「分域规则 · src/components」），故**不能**用 createRoot
// 真正 mount 整个 EFileEditor —— 那要真实的 document/HTMLElement，而 antd 的
// Button/Input 一上来就量尺寸。本组要验的只是「回调 + 副作用清理」，不需要布局。
//
// 故用仓内已有的手法（先例：hooks/useGlobalLines.test.tsx、
// UserCustomizationManagerDialog.test.tsx —— 都是往 React internals.H 注入 dispatcher）：
//   ① 直接调用组件函数并喂 hooks 槽位 → 拿到**真实**的 onPointerDown /
//      onDoubleClick / onClick 回调（不是源码扫描的影子）；
//   ② 手动跑一遍 useEffect 的 create、拿到 cleanup 再手动调它 = 模拟卸载
//      （SSR 从不跑 effect，否则这条路径整条不可达）。
// 副作用观测面：记账的 fake document（add/removeEventListener + execCommand）与
// 记账的 fake window（setTimeout/clearTimeout）。
// ===========================================================================

type HookSlot = { deps?: unknown[]; value?: unknown };
type Handler = { key: string; fn: (...args: never[]) => unknown; className: string; ownText: string };

/**
 * 元素树上所有 on* 回调 prop（按文档序），带定位线索：
 * · className —— 原生宿主元素（col-resizer / jump-btn / cell-readonly）用它定位；
 * · ownText —— 直接子节点是字符串时的文本，用来定位 antd 组件按钮
 *   （`<Button onClick={handleSave}>保存</Button>`：antd 的 className 由组件内部算出，
 *   在**元素层**还不存在，故只能靠 children 文本定位）。
 */
function collectHandlers(node: unknown, out: Handler[] = []) {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((child) => collectHandlers(child, out));
    return out;
  }
  const props = (node as { props?: Record<string, unknown> }).props;
  if (!props) return out;
  const className = typeof props.className === "string" ? props.className : "";
  const ownText = typeof props.children === "string" ? props.children : "";
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on") && typeof value === "function") {
      out.push({ key, fn: value as (...args: never[]) => unknown, className, ownText });
    }
  }
  collectHandlers(props.children, out);
  return out;
}

/**
 * 排空微任务队列：一次宏任务 tick 之后，链式 await 的所有 continuation 都已跑完。
 * 固定次数 `await Promise.resolve()` 排不干净 copyTextToClipboard 那条链
 * （Clipboard API reject → catch → textarea 回退，两层 await），会让
 * 「定时器还没排上」看起来像「分支没走到」。
 */
function drainMicrotasks() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * mount 用夹具：**两张表**（跳转引用的前提，见下）。
 * ACGenerator（当前 tab，activeSection=0）+ ACNode（跳转目标）。
 *
 * 为什么要第二张表：handleJumpToReference 先拿 REFERENCE_FIELD_MAP[field] 去 sections
 * 里找对应段，**找不到就早退、一个定时器都不排**。单表夹具下这条路径压根走不到 ——
 * 夹具不是「少覆盖」，是这条回调完全不执行（与本仓 AGENTS.md「探针全返回空 ⇒ 夹具形状不对」同型）。
 *
 * 为什么 i_node 列会带跳转按钮：REFERENCE_FIELD_MAP 映射 i_node → ACNode，且 value 取
 * `record.params[col]`（**原始值**，不是格式化后的 displayValue），所以 params.i_node 非空即可。
 */
const MOUNT_RECORDS: EDeviceRecord[] = [
  { id: "r1", kind: "ac-source", section: "ACGenerator", params: { id: "1", idx: "1", name: "G1", i_node: "3" }, columns: ["id", "idx", "name", "i_node"] },
  { id: "r2", kind: "ac-node", section: "ACNode", params: { id: "3", idx: "3", name: "N3" }, columns: ["id", "idx", "name"] }
];

const mountProps: Record<string, unknown> = {};

/** 直接跑一次 EFileEditor 的函数体（不经 createRoot），返回树/effects/state/ref 与 rerender、unmount。 */
function mountEditor() {
  const internals = (
    React as unknown as {
      __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H?: unknown };
    }
  ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (!internals) {
    // 显式抛错：静默退化 = 本组全部恒绿，正是本仓反复消灭过的那种假绿
    throw new Error("取不到 React internals.H，无法注入 dispatcher");
  }

  const states: unknown[] = [];
  const refs: Array<{ current: unknown }> = [];
  const slots: HookSlot[] = [];
  const effects: Array<() => unknown> = [];
  let cursor = 0;

  const depsEqual = (a: unknown[] | undefined, b: unknown[] | undefined) =>
    Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
    a.every((dep, i) => Object.is(dep, b[i]));

  const dispatcher = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [
        states[index],
        (next: unknown) => {
          states[index] = typeof next === "function"
            ? (next as (prev: unknown) => unknown)(states[index])
            : next;
        }
      ];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in refs)) refs[index] = { current: initial };
      return refs[index];
    },
    // memo / callback / effect 共用一套 deps 记忆：依赖变了才重算、才重排 effect
    useMemo(factory: () => unknown, deps?: unknown[]) {
      const index = cursor++;
      const prev = slots[index];
      if (deps && prev && depsEqual(prev.deps, deps)) return prev.value;
      const value = factory();
      slots[index] = { deps, value };
      return value;
    },
    useCallback(factory: (...args: never[]) => unknown, deps?: unknown[]) {
      return dispatcher.useMemo(() => factory, deps);
    },
    useEffect(create: () => unknown, deps?: unknown[]) {
      const index = cursor++;
      const prev = slots[index];
      if (deps && prev && depsEqual(prev.deps, deps)) return;
      slots[index] = { deps };
      effects.push(create);
    },
    useLayoutEffect(create: () => unknown, deps?: unknown[]) {
      return dispatcher.useEffect(create, deps);
    },
    useInsertionEffect(create: () => unknown, deps?: unknown[]) {
      return dispatcher.useEffect(create, deps);
    },
    useDebugValue() {},
    useContext() { return undefined; },
    useId() { return ":r0:"; },
    useReducer(reducer: (s: unknown, a: unknown) => unknown, initialArg: unknown, init?: (i: unknown) => unknown) {
      const index = cursor++;
      if (!(index in states)) states[index] = init ? init(initialArg) : initialArg;
      return [states[index], (action: unknown) => { states[index] = reducer(states[index], action); }];
    },
    useSyncExternalStore(_subscribe: unknown, getSnapshot?: () => unknown) {
      return getSnapshot ? getSnapshot() : undefined;
    },
    useTransition() { return [false, (fn: () => void) => fn()]; },
    useDeferredValue(value: unknown) { return value; },
    useImperativeHandle() {},
    useEffectEvent(fn: () => unknown) { return fn; },
    useActionState() { return [undefined, () => {}, false]; },
    useOptimistic(value: unknown) { return [value, () => {}]; },
    useMemoCache(size: number) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { value: new Array(size) };
      return () => undefined;
    },
    use(value: unknown) { return value; }
  };

  // 每次 render 临时换上 dispatcher、返回前立刻还原：既让同文件的 SSR 用例
  // （renderToStaticMarkup）撞不上这份残缺实现，也让「还原」不可能被用例漏掉。
  const previous = internals.H;
  const render = () => {
    cursor = 0;
    internals.H = dispatcher;
    try {
      return (EFileEditor as unknown as (props: unknown) => unknown)({
        open: true,
        onClose: () => {},
        records: MOUNT_RECORDS,
        ...mountProps
      });
    } finally {
      internals.H = previous;
    }
  };

  const editor: {
    tree: unknown;
    render: () => unknown;
    effects: Array<() => unknown>;
    states: unknown[];
    refs: Array<{ current: unknown }>;
    unmount: () => void;
  } = {
    // render() 会改写 tree —— 用例里 `editor.render()` 之后必须从 `editor.tree` 读新树。
    // （写成只在构造时赋值一次的话，rerender 后的断言会一直读 mount 那棵陈旧树：
    //  state 明明变了、HTML 里却看不到对应的 toast/bttn，表现为「断言莫名不成立」。）
    tree: undefined,
    render: () => { editor.tree = render(); return editor.tree; },
    effects,
    states,
    refs,
    /** 模拟卸载：跑完本轮 effect 的 create，再逐个调它们返回的 cleanup */
    unmount() {
      effects
        .map((effect) => effect())
        .filter((cleanup): cleanup is () => void => typeof cleanup === "function")
        .forEach((cleanup) => cleanup());
    }
  };
  editor.render();
  return editor;
}

/** 造一个足以驱动 handleResizeStart 的假 PointerEvent（只补它真正读到的字段）。 */
function fakePointerEvent(clientX: number, pointerId = 1) {
  return {
    clientX,
    pointerId,
    preventDefault: () => {},
    stopPropagation: () => {},
    currentTarget: {
      // 列宽取 colWidths[key] ?? th.getBoundingClientRect().width —— 给一个确定的初值
      parentElement: { getBoundingClientRect: () => ({ width: 100 }) },
      setPointerCapture: () => {}
    }
  };
}

/** 记账的 fake document：add/removeEventListener 可查，execCommand 返回值可控。 */
function installFakeDocument() {
  const live = new Map<string, Set<(...args: never[]) => unknown>>();
  const original = (globalThis as Record<string, unknown>).document;
  const bodyChildren: unknown[] = [];
  let execCommandCalls = 0;
  let lastExecCommandResult = false;
  // 默认 false（没复制上）；控制组用 setExecCommandResult 改成 true
  let execCommandResult = () => false;

  const fake = {
    body: {
      appendChild: (child: unknown) => { bodyChildren.push(child); },
      removeChild: (child: unknown) => {
        const i = bodyChildren.indexOf(child);
        if (i >= 0) bodyChildren.splice(i, 1);
      }
    },
    createElement: () => ({ value: "", style: {} as Record<string, unknown>, select: () => {} }),
    execCommand: () => {
      lastExecCommandResult = Boolean(execCommandResult());
      execCommandCalls += 1;
      return lastExecCommandResult;
    },
    /** execCommand 被调了几次 —— 证明真的走到了 textarea 回退（否定断言的自检面） */
    execCommandCalls: () => execCommandCalls,
    lastExecCommandResult: () => lastExecCommandResult,
    addEventListener(type: string, listener: (...args: never[]) => unknown) {
      if (!live.has(type)) live.set(type, new Set());
      live.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: (...args: never[]) => unknown) {
      live.get(type)?.delete(listener);
    },
    dispatch(type: string, event: unknown) {
      [...(live.get(type) ?? [])].forEach((listener) => (listener as (e: unknown) => void)(event));
    },
    /** document 上现存的监听器总数 */
    liveCount: () => [...live.values()].reduce((sum, set) => sum + set.size, 0),
    /** 每种事件各挂几个（断言「3 个」时用它对数，不是随口说的） */
    liveBreakdown: () => Object.fromEntries([...live].map(([type, set]) => [type, set.size])),
    bodyChildren: () => bodyChildren.length
  };

  (globalThis as Record<string, unknown>).document = fake;
  return {
    fake,
    setExecCommandResult(fn: () => boolean) { execCommandResult = fn; },
    restore() {
      if (original === undefined) delete (globalThis as Record<string, unknown>).document;
      else (globalThis as Record<string, unknown>).document = original;
    }
  };
}

/**
 * 桩 navigator.clipboard。node 的 globalThis.navigator 是**只读 getter**，
 * 直接赋值抛 "which has only a getter"，故用 defineProperty 并按原描述符还原。
 */
function installFakeClipboard(writeText: () => Promise<void>) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { writeText } },
    configurable: true,
    writable: true
  });
  return {
    restore() {
      if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor);
      else delete (globalThis as Record<string, unknown>).navigator;
    }
  };
}

/** 记账的 fake window：setTimeout 只记录不排程（真排程会活到 1~3s 超时）。 */
function installFakeWindowTimers() {
  const original = (globalThis as Record<string, unknown>).window;
  const scheduled = new Map<number, () => void>();
  let nextId = 1;
  const fake = {
    setTimeout(fn: () => void, _ms?: number) {
      const id = nextId++;
      scheduled.set(id, fn);
      return id;
    },
    clearTimeout(id: number) { scheduled.delete(id); },
    /** 还没被清掉的定时器数 */
    pending: () => scheduled.size
  };
  (globalThis as Record<string, unknown>).window = fake;
  return {
    fake,
    restore() {
      if (original === undefined) delete (globalThis as Record<string, unknown>).window;
      else (globalThis as Record<string, unknown>).window = original;
    }
  };
}

describe("EFileEditor 卸载清理：拖拽 resize 的 document 监听器", () => {
  test("拖拽中卸载：document 上挂的 3 个监听器全部摘掉，resize 的 ref 也复位", () => {
    const doc = installFakeDocument();
    const win = installFakeWindowTimers();
    try {
      mountProps.records = MOUNT_RECORDS;
      const editor = mountEditor();

      // 前置（缺了它，下面「归零」就是恒绿）：拖拽开始前 document 上是空的
      expect(doc.fake.liveCount()).toBe(0);

      // 按 className 精确定位 resizer 那一路：backdrop / WindowCloseButton 也各有
      // 一个 onPointerDown，取「第一个」会挑中 backdrop 的 onClose（它不挂监听器）。
      const resizerStart = collectHandlers(editor.tree)
        .find((h) => h.key === "onPointerDown" && h.className.includes("e-file-editor-col-resizer"));
      expect(resizerStart).toBeTruthy();
      resizerStart!.fn(fakePointerEvent(0) as never);

      // 拖拽已真正开始：pointermove / pointerup / pointercancel 各 1 个（描述里的「3 个」）
      expect(doc.fake.liveBreakdown()).toEqual({ pointermove: 1, pointerup: 1, pointercancel: 1 });
      expect(doc.fake.liveCount()).toBe(3);

      // 前置：拖拽确实把 resize 的 ref 填上了 —— 否则卸载后的「已复位」是空洞断言。
      // resizeRef.current 形如 { colKey, startX, startWidth }，resizeCleanupRef.current 是函数。
      const filledBeforeUnmount = editor.refs.filter((ref) => ref?.current !== null && ref?.current !== undefined);
      expect(filledBeforeUnmount.length).toBeGreaterThanOrEqual(2);

      // **缺陷场景**：拖拽中卸载（父级删掉组件 / 路由切走），pointerup 永不到达。
      // 撤销本次修复（删掉卸载 cleanup 里的 resizeCleanupRef.current?.()）→ 下面立刻红。
      editor.unmount();

      expect(doc.fake.liveCount()).toBe(0);
      expect(doc.fake.liveBreakdown()).toEqual({ pointermove: 0, pointerup: 0, pointercancel: 0 });
      // 与卸载前的快照逐槽对拍：拖拽期间非空的 ref 槽，卸载后必须都是 null。
      // 残留的 handleMove 还会持续对已卸载实例 setColWidths，这正是要防的那一档。
      const filledSlotIndices = editor.refs
        .map((ref, index) => (ref?.current !== null && ref?.current !== undefined ? index : -1))
        .filter((index) => index >= 0);
      filledSlotIndices.forEach((index) => {
        expect(editor.refs[index].current).toBeNull();
      });
    } finally {
      win.restore();
      doc.restore();
    }
  });

  test("对照组：pointerup 正常到达时也摘干净（卸载兜底没把 handleUp 路径弄坏）", () => {
    const doc = installFakeDocument();
    const win = installFakeWindowTimers();
    try {
      mountProps.records = MOUNT_RECORDS;
      const editor = mountEditor();
      const resizerStart = collectHandlers(editor.tree)
        .find((h) => h.key === "onPointerDown" && h.className.includes("e-file-editor-col-resizer"))!;
      resizerStart.fn(fakePointerEvent(0) as never);
      expect(doc.fake.liveCount()).toBe(3);

      // 正常收尾：pointerup 到达 → handleUp 移除三个监听器（成功路径逐字不变）
      doc.fake.dispatch("pointerup", {});
      expect(doc.fake.liveCount()).toBe(0);

      // 之后再卸载不得抛：cleanup 已被 handleUp 清空，属幂等的第二次进入
      expect(() => editor.unmount()).not.toThrow();
      expect(doc.fake.liveCount()).toBe(0);
    } finally {
      win.restore();
      doc.restore();
    }
  });

  test("源码契约：resize 的移除逻辑必须同时被 handleUp 与卸载 cleanup 引用", () => {
    // 动态用例证的是「当前这份实现卸载后归零」。若有人把移除逻辑整段删掉、
    // 又在别处补一份等价的，动态用例照样绿；这里按接线钉住两条路径都在。
    const source = readFileSync(new URL("./EFileEditor.tsx", import.meta.url), "utf8");
    // 三个 removeEventListener 各出现两次（handleUp 一次、卸载兜底共用 cleanup 一次）
    for (const type of ["pointermove", "pointerup", "pointercancel"]) {
      const removals = source.match(new RegExp(`removeEventListener\\("${type}"`, "g")) ?? [];
      expect(removals).toHaveLength(1);
    }
    // handleResizeStart 必须把 cleanup 存进 ref（否则卸载无从找到那批监听器）
    expect(source).toContain("resizeCleanupRef.current = cleanup;");
    // 卸载 effect 必须调用它
    expect(source).toContain("resizeCleanupRef.current?.();");
  });
});

describe("EFileEditor 卸载清理：四处 setTimeout", () => {
  test("四处定时器在卸载时全部被 clearTimeout 清掉", async () => {
    const doc = installFakeDocument();
    const win = installFakeWindowTimers();
    // Clipboard API reject → 落 textarea 回退；execCommand 返回 true（复制成功），
    // 于是复制分支也排上它那 1s 复位定时器（否则这条只覆盖 3/4 处）。
    const nav = installFakeClipboard(() => Promise.reject(new Error("denied")));
    doc.setExecCommandResult(() => true);
    try {
      mountProps.records = MOUNT_RECORDS;
      const editor = mountEditor();

      // 逐类触发，证明「四类定时器都被记账」而不只是其中一类被清：
      // ① 双击复制 copiedCell 1s / ② 保存 savedMessage 2s /
      // ③ 跳转引用 highlightedRow 3s / ④ 点拓扑字段 protectedToast 2.5s

      // ① 复制（查看态）：走 then 分支（复制成功）；微任务排空后定时器才真的排上
      const dblClick = collectHandlers(editor.tree).find((h) => h.key === "onDoubleClick");
      expect(dblClick).toBeTruthy();
      dblClick!.fn("G1" as never);
      await drainMicrotasks();
      expect(win.fake.pending()).toBe(1);

      // ③ 跳转引用（查看态才有跳转按钮 —— 编辑态的单元格渲染的是 Input）
      const jump = collectHandlers(editor.tree)
        .find((h) => h.key === "onClick" && h.className.includes("e-file-editor-jump-btn"));
      // 夹具形状自检：跳转按钮压根没渲染时，下面 expect(jump).fn() 会是「无对象可调用」，
      // 而不是「回调没排上定时器」—— 两种红的含义不同，先把形状问题挡在这里。
      expect(jump, "查看态下 id 列应渲染跳转按钮").toBeTruthy();
      jump!.fn();
      expect(win.fake.pending()).toBe(2);

      // ② 保存 + ④ 拓扑提示：都在编辑态。先切 editMode（states[0]）。
      //     保存按钮按 children 文本「保存」定位 —— antd 的 className 在元素层还算不出来。
      editor.states[0] = true;
      editor.render();
      const save = collectHandlers(editor.tree)
        .find((h) => h.key === "onClick" && h.ownText === "保存");
      expect(save).toBeTruthy();
      save!.fn();
      expect(win.fake.pending()).toBe(3);

      // ④ 拓扑字段提示：编辑模式下的 e-file-editor-cell-readonly
      const topo = collectHandlers(editor.tree)
        .find((h) => h.key === "onClick" && h.className.includes("e-file-editor-cell-readonly"));
      expect(topo).toBeTruthy();
      topo!.fn();
      // 前置：四处定时器都已排上（没有这条，下面「归零」就是空洞断言）
      expect(win.fake.pending()).toBe(4);

      // 缺陷场景：定时器已排上、组件卸载。React 18 下回调打到已卸载实例不告警，
      // 但定时器会真的活到超时才释放。撤销本修复（删掉四个 clearTimeout）→ 立刻红。
      editor.unmount();
      expect(win.fake.pending()).toBe(0);
    } finally {
      nav.restore();
      win.restore();
      doc.restore();
    }
  });

  test("源码契约：四处定时器的 id 必须存进 ref（否则卸载无从清理）", () => {
    // 动态用例证的是「当前这四个点在卸载后被清掉」。若有人把某处改回裸 setTimeout
    // （无 ref、无清理），动态用例可能因「那处本来就没排上」而变绿 —— 故补这条静态接线契约。
    const source = readFileSync(new URL("./EFileEditor.tsx", import.meta.url), "utf8");
    expect(source).toContain("copiedCellTimer.current = window.setTimeout(");
    expect(source).toContain("highlightedRowTimer.current = window.setTimeout(");
    expect(source).toContain("savedMessageTimer.current = window.setTimeout(");
    expect(source).toContain("protectedToastTimer.current = window.setTimeout(");
    // 卸载 cleanup 逐个清这四个 ref
    expect(source).toMatch(/window\.clearTimeout\(copiedCellTimer\.current\)/);
    expect(source).toMatch(/window\.clearTimeout\(highlightedRowTimer\.current\)/);
    expect(source).toMatch(/window\.clearTimeout\(savedMessageTimer\.current\)/);
    expect(source).toMatch(/window\.clearTimeout\(protectedToastTimer\.current\)/);
    // 组件体内不得再有「既没存 ref 也无从清理」的裸 setTimeout。
    // 判定按**行首**：`xxx.current = window.setTimeout(` 是合规接线（行首不是 setTimeout），
    // `window.setTimeout(` 单独起头才是裸调。整段正则会把合规的四处一起算成裸调（实测踩过）。
    const body = source.slice(source.indexOf("export function EFileEditor"));
    const bareTimers = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^(?:window\.)?setTimeout\(/.test(line));
    expect(bareTimers).toEqual([]);
  });
});

describe("EFileEditor 复制结果校验：没复制上就不提示已复制", () => {
  test("Clipboard API 被拒且 execCommand 返回 false：不弹「已复制到剪切板」", async () => {
    const doc = installFakeDocument();
    const win = installFakeWindowTimers();
    const nav = installFakeClipboard(() => Promise.reject(new Error("NotAllowedError")));
    try {
      mountProps.records = MOUNT_RECORDS;
      const editor = mountEditor();

      const dblClick = collectHandlers(editor.tree).find((h) => h.key === "onDoubleClick");
      expect(dblClick).toBeTruthy();
      dblClick!.fn("G1" as never);
      await drainMicrotasks();
      editor.render();

      // 前置自检：stub 真的走到了 textarea 回退且 execCommand 返回了 false。
      // 缺了它，下面两条否定断言就成了同义反复（「压根没复制」与「复制失败被拒」同解）。
      expect(doc.fake.execCommandCalls()).toBe(1);
      expect(doc.fake.lastExecCommandResult()).toBe(false);

      const html = renderToStaticMarkup(editor.tree as never);
      // **缺陷核心**：execCommand 返回 false 时上层照样 setCopiedCell → 弹「已复制」，
      // 而剪贴板里什么都没有。撤销本修复（去掉返回值校验）→ 这条立刻红。
      expect(html).not.toContain("已复制到剪切板");
      expect(html).not.toContain("e-file-editor-copied-toast");
      // 失败路径连复位定时器都不排（压根没走到 setCopiedCell）
      expect(win.fake.pending()).toBe(0);
      // textarea 仍被摘掉：失败不能把临时节点留在 body 里
      expect(doc.fake.bodyChildren()).toBe(0);
    } finally {
      nav.restore();
      win.restore();
      doc.restore();
    }
  });

  test("对照组：execCommand 返回 true（复制真的成功）时照常提示已复制", async () => {
    const doc = installFakeDocument();
    const win = installFakeWindowTimers();
    const nav = installFakeClipboard(() => Promise.reject(new Error("NotAllowedError")));
    doc.setExecCommandResult(() => true);
    try {
      mountProps.records = MOUNT_RECORDS;
      const editor = mountEditor();

      const dblClick = collectHandlers(editor.tree).find((h) => h.key === "onDoubleClick")!;
      dblClick.fn("G1" as never);
      await drainMicrotasks();
      editor.render();

      // 成功路径的自检：与上一条用例的夹具**只在 execCommand 返回值上相反**，
      // 所以下面那条「已复制」确实是被返回值决定的，不是被夹具别处决定的。
      expect(doc.fake.execCommandCalls()).toBe(1);
      expect(doc.fake.lastExecCommandResult()).toBe(true);

      const html = renderToStaticMarkup(editor.tree as never);
      // 成功路径必须逐字不变：仍弹「已复制到剪切板」，仍排 1s 复位定时器
      expect(html).toContain("已复制到剪切板");
      expect(html).toContain("e-file-editor-copied-toast");
      expect(win.fake.pending()).toBe(1);
      expect(doc.fake.bodyChildren()).toBe(0);
    } finally {
      nav.restore();
      win.restore();
      doc.restore();
    }
  });

  test("源码契约：回退路径必须校验 execCommand 的返回值（false 要转成 reject）", () => {
    // 动态用例只覆盖「stub document 返回 false」这一条输入。把判定改写成等价但不同的形式
    // （`if (!document.execCommand("copy"))`）或挪位置时，动态用例仍绿，故补这条静态契约。
    const source = readFileSync(new URL("./EFileEditor.tsx", import.meta.url), "utf8");
    expect(source).toContain('document.execCommand("copy") === false');
    expect(source).toContain('=== false) throw new Error("execCommand copy failed")');
    // 空 catch 已被替掉：catch 必须重新抛出（否则 false 又被吞回去）
    expect(source).not.toMatch(/try \{ document\.execCommand\("copy"\); \} catch \{\}/);
    // 调用方必须接住 reject —— 只有 .then 而无 .catch 时，复制失败仍会弹「已复制」
    expect(source).toMatch(/copyTextToClipboard\(text\)[\s\S]{0,400}?\.catch\(/);
  });
});
