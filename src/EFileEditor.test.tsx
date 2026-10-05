// 「查看/编辑E文件」窗口的列解析：必须与导出侧同一单源（eSectionColumns）。
// 成员关系段 ACContainerDev 的记录**不带 columns**（列定义由 E_SECTION_COLUMNS 兜底）——
// 编辑器只读 record.columns 时该表列集为空，表头与单元格全部不渲染（实机反馈轮 16「同一表内容仍是空」的根因）：
// 导出文件同表有列有行（导出走 formatESection → eSectionColumns），窗口却是一片空表。
import { describe, expect, test } from "vitest";
import { createElement } from "react";
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
    expect(source.match(/document\.execCommand\("copy"\)/g)).toHaveLength(1);
    expect(source).toContain("copyTextToClipboard(text).then(");
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
