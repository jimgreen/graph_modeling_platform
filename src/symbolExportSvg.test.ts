// 图元 Symbol 导出的纯逻辑契约：分类过滤、viewBox 归一化、SVG 合成与方案快照。
import { describe, expect, test } from "vitest";
import { DEVICE_LIBRARY, DEFAULT_COLOR_PALETTE, createNodeFromTemplate, type DeviceTemplate } from "./model";
import { buildDeviceTemplateIconSvg } from "./appExtracted/appPersistenceLibraryExport";
import { buildTemplateTerminalSlotPaint } from "./export/svg";
import {
  DEFAULT_SYMBOL_EXPORT_FILTER_KEYS,
  STANDALONE_SCHEMA_FILE_NAME,
  buildStandaloneSymbolExport,
  buildStandaloneSymbolFiles,
  buildSymbolExportSvg,
  compactSymbolExportWhitespace,
  extractSymbolExportParts,
  filterSymbolExportTemplates,
  normalizeSymbolExportSchemes,
  normalizeSymbolViewBox,
  removeSymbolExportScheme,
  symbolExportFileName,
  symbolExportFilterKeysForTemplate,
  terminalAttachmentMarkupForTemplate,
  upsertSymbolExportScheme
} from "./symbolExportSvg";

const templateOf = (overrides: Partial<DeviceTemplate> & { kind: string }): DeviceTemplate => ({
  label: overrides.kind,
  categoryLibrary: "交流设备",
  size: { width: 80, height: 60 },
  params: {},
  terminalType: "ac",
  terminalCount: 2,
  stateDefinitions: [],
  ...overrides
} as DeviceTemplate);

const STATIC_SYMBOL_DOC = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0,0,222,166">
<defs id="svg_defs">
<style type="text/css"><![CDATA[
symbol{overflow:visible}
.lkv220{color:#1d4ed8}
]]></style>
<symbol id="symbol_ACBreaker_ac-breaker_state_1" viewBox="-40 -30 80 60" overflow="visible">
<g transform="rotate(0) scale(1 1)"><path d="M -40 0 L 40 0"/></g>
</symbol>
<symbol id="symbol_ACBreaker_ac-breaker_state_0" viewBox="-40 -30 80 60" overflow="visible">
<g transform="rotate(0) scale(1 1)"><path d="M -40 -20 L 40 -20"/></g>
</symbol>
</defs>
<g id="root_g"><g class="export-layer-definitions" style="display:none"></g><g id="ACBreaker_Layer" device-type="ACBreaker">
<use id="ac-breaker-1" dev-kind="ac-breaker" href="#symbol_ACBreaker_ac-breaker_state_1" x="36" y="36" width="80" height="60"/>
</g></g>
</svg>`;

/** 单状态桩：剥掉 state_0 symbol 块，只保留 <use> 引用的默认状态（一模板恰好一文件）。 */
const SINGLE_STATE_SYMBOL_DOC = STATIC_SYMBOL_DOC.replace(/<symbol id="[^"]*_state_0"[\s\S]*?<\/symbol>\n?/u, "");

describe("分类过滤", () => {
  test("按 kind / 标志位判定分类，可同时命中多个", () => {
    expect(symbolExportFilterKeysForTemplate(templateOf({ kind: "ac-bus-vertical" }))).toEqual(["vertical", "bus"]);
    expect(symbolExportFilterKeysForTemplate(templateOf({ kind: "static-text" }))).toEqual(["static"]);
    expect(symbolExportFilterKeysForTemplate(templateOf({ kind: "ac-routable-line" }))).toEqual(["adaptable"]);
    expect(symbolExportFilterKeysForTemplate(templateOf({ kind: "ac-vpp-box", isContainer: true }))).toEqual(["container"]);
    expect(symbolExportFilterKeysForTemplate(templateOf({ kind: "custom-thing", custom: true }))).toEqual(["custom"]);
    expect(symbolExportFilterKeysForTemplate(templateOf({
      kind: "ac-breaker",
      stateDefinitions: [{ value: "0", name: "分" }, { value: "1", name: "合" }]
    }))).toEqual(["stateful"]);
  });

  test("未命中任何分类的图元归入「其它图元」，默认勾选因而不会漏选", () => {
    const lonely = templateOf({ kind: "ac-generator-a" });
    expect(symbolExportFilterKeysForTemplate(lonely)).toEqual(["other"]);
    expect(DEFAULT_SYMBOL_EXPORT_FILTER_KEYS).toContain("other");
    expect(filterSymbolExportTemplates([lonely], DEFAULT_SYMBOL_EXPORT_FILTER_KEYS)).toEqual([lonely]);
  });

  test("允许集语义：勾中的分类能拿到该类的全部图元", () => {
    const vertical = templateOf({ kind: "ac-bus-vertical" }); // vertical + bus
    const statics = templateOf({ kind: "static-ring" }); // 仅 static

    // 单类：静态图元与 vertical 无交集，只勾 vertical 时它必然被排除。
    expect(filterSymbolExportTemplates([vertical, statics], ["static"])).toEqual([statics]);
    // 双命中图元需要它命中的**每一个**分类都被勾中（排除优先）。
    expect(filterSymbolExportTemplates([vertical, statics], ["static", "vertical", "bus"]))
      .toEqual([vertical, statics]);
    expect(filterSymbolExportTemplates([vertical, statics], ["vertical"])).toEqual([]);
    // 全不勾必须是空集：旧实现回落到全部分类，导致「清空」与「全选」产出同一棵树、
    // 按钮点了没反应。这条断言就是那个 bug 的回归护栏。
    expect(filterSymbolExportTemplates([vertical, statics], [])).toEqual([]);
    // 对照组：全选必须仍然拿得到全部，否则「清空」一改就误伤了「全选」。
    expect(filterSymbolExportTemplates([vertical, statics], DEFAULT_SYMBOL_EXPORT_FILTER_KEYS))
      .toEqual([vertical, statics]);
  });

  test("排除优先：取消某分类后，同时命中其它已勾选分类的图元也必须隐藏", () => {
    // 这两个都是「本体 + vertical」双命中，正是用户报告「取消了竖向图元却还在」的那一批。
    const busVertical = templateOf({ kind: "ac-bus-vertical" }); // vertical + bus
    const switchVertical = templateOf({
      kind: "ac-switch-vertical", // vertical + stateful
      stateDefinitions: [{ value: "0", name: "分" }, { value: "1", name: "合" }]
    });
    const bus = templateOf({ kind: "ac-bus" }); // 仅 bus，非竖向

    // 取消「竖向图元」，其它全选：两个竖向变体都得消失，非竖向母线保留。
    const withoutVertical = DEFAULT_SYMBOL_EXPORT_FILTER_KEYS.filter((key) => key !== "vertical");
    expect(filterSymbolExportTemplates([busVertical, switchVertical, bus], withoutVertical)).toEqual([bus]);

    // 反向对照：把「母线图元」取消掉，竖向母线同样消失 —— 排除对任一维度都生效。
    const withoutBus = DEFAULT_SYMBOL_EXPORT_FILTER_KEYS.filter((key) => key !== "bus");
    expect(filterSymbolExportTemplates([busVertical, switchVertical, bus], withoutBus)).toEqual([switchVertical]);
  });

  test("取消兜底类「其它图元」不会误排除任何图元", () => {
    // 注意：kind 一律不能含 "bus"（BUS_KIND_PATTERN=/bus/iu 逐字匹配），
    // 否则会额外命中 bus/container 而不再是「仅命中其它图元」的兜底样本。
    const lonely = templateOf({ kind: "ac-generator-a" }); // 仅命中 other
    const statics = templateOf({ kind: "static-ring" }); // 仅命中 static

    // 「其它图元」的 matches 恒为 false，它只作未命中兜底，取消它不该造成任何隐藏。
    // 必须保留 static 的勾选，否则 statics 会因「允许集为空」而非「误排除」消失。
    const withoutOther = DEFAULT_SYMBOL_EXPORT_FILTER_KEYS.filter((key) => key !== "other");
    expect(filterSymbolExportTemplates([lonely, statics], withoutOther)).toEqual([lonely, statics]);

    // 但只勾「其它图元」时，主分类一个都没勾 → 允许集为空 → 非兜底类一律隐藏。
    expect(filterSymbolExportTemplates([lonely, statics], ["other"])).toEqual([lonely]);
  });
});

describe("symbol viewBox 归一化", () => {
  test("以原点为中心的 viewBox 改为 0,0,w,h 并整体平移正文", () => {
    const normalized = normalizeSymbolViewBox(
      '<symbol id="s" viewBox="-75 -47 150 94" overflow="visible"><circle cx="0" cy="0" r="22"/></symbol>'
    );

    expect(normalized?.markup).toBe(
      '<symbol id="s" viewBox="0,0,150,94" overflow="visible"><g transform="translate(75,47)"><circle cx="0" cy="0" r="22"/></g></symbol>'
    );
    expect(normalized).toMatchObject({ width: 150, height: 94 });
  });

  test("已是 0,0 起点的 viewBox 不再套一层平移组", () => {
    const normalized = normalizeSymbolViewBox('<symbol id="s" viewBox="0 0 30 20"><rect/></symbol>');
    expect(normalized?.markup).toBe('<symbol id="s" viewBox="0,0,30,20"><rect/></symbol>');
  });

  test("viewBox 缺失或非法时返回 null（调用方跳过该 symbol）", () => {
    expect(normalizeSymbolViewBox('<symbol id="s"><rect/></symbol>')).toBeNull();
    expect(normalizeSymbolViewBox('<symbol id="s" viewBox="0 0 0 20"><rect/></symbol>')).toBeNull();
    expect(normalizeSymbolViewBox('<rect/>')).toBeNull();
  });

  test("摘取 style 规则与全部 symbol，剥离 CDATA 包裹", () => {
    const parts = extractSymbolExportParts(STATIC_SYMBOL_DOC);
    expect(parts.symbols).toHaveLength(2);
    expect(parts.styleRules).toEqual(["symbol{overflow:visible}\n.lkv220{color:#1d4ed8}"]);
  });
});

describe("SVG 合成", () => {
  const breaker = DEVICE_LIBRARY.find((item) => item.kind === "ac-breaker")!;

  test("定义集 + 正文 <use> 网格：defs 外只有 Symbol_Overview_Layer，每图元一个 use", () => {
    const result = buildSymbolExportSvg([breaker], buildDeviceTemplateIconSvg);

    expect(result.symbolCount).toBeGreaterThanOrEqual(2);
    expect(result.exportedKinds).toEqual(["ac-breaker"]);
    expect(result.skippedKinds).toEqual([]);
    expect(result.svg.startsWith("<svg xmlns=")).toBe(true);
    expect(result.svg).toContain('<style type="text/css"><![CDATA[');
    // 正文网格层在 defs 之后，文件以它收尾
    expect(result.svg).toContain('<g id="Symbol_Overview_Layer">');
    expect(result.svg.trimEnd().endsWith("</g>\n</svg>")).toBe(true);
    // defs（定义集）里不得混入实例层：剥掉正文网格层后全文不许再出现 <use>
    const withoutOverview = result.svg.replace(/<g id="Symbol_Overview_Layer">[\s\S]*?<\/g>/u, "");
    expect(withoutOverview).not.toContain("<use");
    expect(result.svg).not.toContain("root_g");
    expect(result.svg).not.toContain("export-layer-definitions");
    expect(result.svg).not.toContain("<image");
    // 每图元一个 use：断路器虽有两态 symbol，但只占一格
    const uses = Array.from(result.svg.matchAll(/<use\b[^>]*href="#([^"]+)"/gu));
    expect(uses).toHaveLength(1);
    // 引用的是默认状态（state_1，与原始正文 <use> 同口径），而非另一个状态
    expect(uses[0][1]).toContain("_ac-breaker_state_1");
    // 分/合两态定义都在
    expect(result.svg).toContain("_ac-breaker_state_1");
    expect(result.svg).toContain("_ac-breaker_state_0");
    // 两态正文确实不同（同一模板的不同状态各成一个 symbol，而非重复同一份图形）
    const stateBodies = Array.from(result.svg.matchAll(/<symbol id="[^"]*_ac-breaker_state_(\d)"[\s\S]*?<\/symbol>/gu))
      .map((match) => match[0]);
    expect(stateBodies).toHaveLength(2);
    expect(stateBodies[0]).not.toBe(stateBodies[1]);
  });

  test("每个 symbol 的 viewBox 都是 0,0,width,height", () => {
    const result = buildSymbolExportSvg([breaker], buildDeviceTemplateIconSvg);
    const viewBoxes = Array.from(result.svg.matchAll(/<symbol\b[^>]*\bviewBox="([^"]*)"/gu)).map((match) => match[1]);

    // symbol 定义本身的 viewBox 全部归一化到原点
    expect(viewBoxes.length).toBe(result.symbolCount);
    for (const viewBox of viewBoxes) {
      const parts = viewBox.split(",").map((item) => Number.parseFloat(item));
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe(0);
      expect(parts[1]).toBe(0);
      expect(parts[2]).toBeGreaterThan(0);
      expect(parts[3]).toBeGreaterThan(0);
    }
    // 根 viewBox 覆盖正文 use 网格：宽 = 6 列 × 160，高 = 行数 × 120（单元见 USE_GRID_*）
    const rootViewBox = /<svg\b[^>]*\bviewBox="0,0,([\d.]+),([\d.]+)"/u.exec(result.svg);
    expect(Number(rootViewBox?.[1])).toBe(960);
    expect(Number(rootViewBox?.[2])).toBe(120); // 1 个图元 → 1 行
  });

  test("use 网格每行 6 个，顺序与输入 templates 一致（= 已选图元清单顺序）", () => {
    // 用确定性桩构造 8 个不同 id 的图元：第一行 6 个、第二行 2 个
    const stubDoc = (id: string) => STATIC_SYMBOL_DOC.replaceAll("ac-breaker", id).replaceAll("ACBreaker", id.toUpperCase());
    const kinds = Array.from({ length: 8 }, (_, index) => `grid-kind-${index}`);
    const templates = kinds.map((kind) => templateOf({ kind }));
    const result = buildSymbolExportSvg(templates, (template) => stubDoc(template.kind));

    const uses = Array.from(result.svg.matchAll(/<use\b[^>]*href="#([^"]+)"[^>]*x="([\d.]+)" y="([\d.]+)"/gu));
    expect(uses).toHaveLength(8);
    // 顺序 = 输入顺序（从左到右、从上到下）
    expect(uses.map((match) => match[1])).toEqual(
      kinds.map((kind) => `symbol_${kind.toUpperCase()}_${kind}_state_1`)
    );
    // 网格坐标：第 index 个 → 列 = index % 6，行 = floor(index / 6)；单元格 160×120、视口 150×96 居中
    uses.forEach((match, index) => {
      const x = Math.round(Number(match[2]));
      const y = Math.round(Number(match[3]));
      expect(x).toBe((index % 6) * 160 + 5);
      expect(y).toBe(Math.floor(index / 6) * 120 + 12);
    });
    // 根 viewBox 覆盖两行
    const rootViewBox = /<svg\b[^>]*\bviewBox="0,0,([\d.]+),([\d.]+)"/u.exec(result.svg);
    expect(Number(rootViewBox?.[2])).toBe(240);
  });

  test("重复选中同一 kind 不产生重复 symbol", () => {
    const once = buildSymbolExportSvg([breaker], buildDeviceTemplateIconSvg);
    const twice = buildSymbolExportSvg([breaker, breaker], buildDeviceTemplateIconSvg);

    expect(twice.symbolCount).toBe(once.symbolCount);
    expect(twice.svg).toBe(once.svg);
  });

  test("单模板构建抛错时跳过该图元并记入 skippedKinds，不影响其它图元", () => {
    const result = buildSymbolExportSvg([breaker, templateOf({ kind: "broken-kind" })], (template) => {
      if (template.kind === "broken-kind") {
        throw new Error("boom");
      }
      return STATIC_SYMBOL_DOC;
    });

    expect(result.exportedKinds).toEqual(["ac-breaker"]);
    expect(result.skippedKinds).toEqual(["broken-kind"]);
  });

  test("无选中图元时仍产出结构完整的空壳文件", () => {
    const result = buildSymbolExportSvg([], buildDeviceTemplateIconSvg);
    expect(result.symbolCount).toBe(0);
    expect(result.svg).toContain("viewBox=\"0,0,1,1\"");
    // 空白行清理后 defs 内不再留空行
    expect(result.svg).toContain("<defs>\n</defs>");
  });

  test("产物不含非必要换行：空白行（含只剩缩进的行）一律删除", () => {
    // 用户实测（ac-electrolyzer.svg）：空图层在正文里留下成片的「只有两个空格」的行。
    // 两种导出（合并 / 独立）的最终产物都要过 compactSymbolExportWhitespace。
    const kinds = ["ac-bus", "ac-breaker", "ac-electrolyzer"].filter(
      (kind) => DEVICE_LIBRARY.some((item) => item.kind === kind)
    );
    const templates = kinds.map((kind) => DEVICE_LIBRARY.find((item) => item.kind === kind)!);

    const merged = buildSymbolExportSvg(templates, buildDeviceTemplateIconSvg);
    const mergedLines = merged.svg.split("\n");
    expect(mergedLines.length).toBeGreaterThan(1);
    for (const line of mergedLines) {
      expect(line.trim().length, `空白行泄漏：${JSON.stringify(line)}`).toBeGreaterThan(0);
      expect(line, `行尾空白泄漏：${JSON.stringify(line)}`).toBe(line.replace(/\s+$/u, ""));
    }

    // 独立导出：拿真实库的一个图元走完整链路
    if (templates.length > 0) {
      const source = buildDeviceTemplateIconSvg(templates[0]);
      const standalone = buildStandaloneSymbolFiles(source, templates[0]);
      expect(standalone.length).toBeGreaterThan(0);
      for (const file of standalone) {
        for (const line of file.svg.split("\n")) {
          expect(line.trim().length, `${file.fileName} 空白行泄漏：${JSON.stringify(line)}`).toBeGreaterThan(0);
        }
      }
    }
  });

  test("compactSymbolExportWhitespace：删空白行与行尾空白，不碰标签内属性与 text 内容", () => {
    const input = [
      "<svg>",
      "  ",
      "  <g transform=\"translate(1,2)\">",
      "",
      "\t<text>H  2  </text>",
      "  </g>",
      "  ",
      "</svg>"
    ].join("\n");
    expect(compactSymbolExportWhitespace(input)).toBe(
      ["<svg>", "  <g transform=\"translate(1,2)\">", "\t<text>H  2  </text>", "  </g>", "</svg>"].join("\n")
    );
    // CRLF 与空串兜底
    expect(compactSymbolExportWhitespace("<a>\r\n\r\n<b/></a>")).toBe("<a>\n<b/></a>");
    expect(compactSymbolExportWhitespace("")).toBe("");
  });
});

describe("端子附着几何（引线 + 锚点）", () => {
  // 锚点 circle 与引线 line 的结构化提取：锚点坐标 = 引线所在 translate 组的落点
  const anchorPoints = (markup: string) =>
    Array.from(markup.matchAll(/<circle class="terminal terminal-anchor"[^>]*cx="([-\d.]+)" cy="([-\d.]+)"[^>]*\/>/gu))
      .map((m) => ({ x: m[1], y: m[2] }));
  const leadRows = (markup: string) =>
    Array.from(
      markup.matchAll(/<g transform="translate\(([-\d.]+) ([-\d.]+)\)">\s*<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"[^>]*\/>/gu)
    ).map((m) => ({ groupX: m[1], groupY: m[2], x1: m[3], y1: m[4], x2: m[5], y2: m[6] }));

  test("普通图元：锚点坐标与画布导出同口径，引线外端精确落在锚点上", () => {
    // 桩 size 80×60 经 normalizeDefaultDeviceSize 归一化到最长边 150（150×112.5）；
    // 默认双端子 anchor ±0.5 → cx=∓75，再各向外伸 TERMINAL_OUTWARD_OFFSET=4 → cx=∓79（用户示例同款数值）。
    const markup = terminalAttachmentMarkupForTemplate(templateOf({ kind: "anchor-probe" }));
    expect(anchorPoints(markup)).toEqual([
      { x: "-79", y: "0" },
      { x: "79", y: "0" }
    ]);
    // 引线外端（x2,y2）= 锚点所在点，即「锚点 → 本体」这段连接线，两端不允许留空
    const leads = leadRows(markup);
    expect(leads).toHaveLength(2);
    expect(leads.map((lead) => `${lead.groupX},${lead.groupY}`)).toEqual(["-79,0", "79,0"]);
    for (const lead of leads) {
      expect(`${lead.x2},${lead.y2}`).toBe("0,0");
    }
  });

  test("AC 容器保留声明尺寸；显式 terminalAnchors 覆盖默认端子位置，引线随之联动", () => {
    // ac-vpp-box 在 AC_CONTAINER_KINDS 内 → size 80×60 原样保留；顶/底端子 y 方向外伸 4。
    const markup = terminalAttachmentMarkupForTemplate(templateOf({
      kind: "ac-vpp-box",
      isContainer: true,
      terminalAnchors: [{ x: 0, y: -0.5 }, { x: 0, y: 0.5 }]
    }));
    expect(anchorPoints(markup)).toEqual([
      { x: "0", y: "-34" },
      { x: "0", y: "34" }
    ]);
    // 引线与锚点共用同一落点（显式覆盖后两处一起变，不会错位）
    expect(leadRows(markup).map((lead) => `${lead.groupX},${lead.groupY}`)).toEqual(["0,-34", "0,34"]);
  });

  test("锚点覆盖全部端子（含 heat/h2），与引线 1:1 —— 端子清单 = 模板端子数", () => {
    // 反例来源：ac-electrolyzer / dc-fuel-cell 这类「电 + 氢」两端子图元，改前锚点只覆盖电端子，
    // 而下游以 .terminal-anchor 为端子的**唯一来源**（无锚点 = 该端子不存在）→ 导出只剩 1 个端子。
    // 同时画布 buildSvgDeviceConnectorMarkup 对全部端子画引线，故锚点必须与引线 1:1。
    const markup = terminalAttachmentMarkupForTemplate(templateOf({
      kind: "anchor-probe",
      terminalTypes: ["heat", "ac"]
    }));
    expect(anchorPoints(markup)).toEqual([{ x: "-79", y: "0" }, { x: "79", y: "0" }]);
    expect(markup).toContain(`terminal-id="t1" terminal-index="1"`);
    expect(markup).toContain(`terminal-id="t2" terminal-index="2"`);
    expect(leadRows(markup)).toHaveLength(2);
    // 画布整图导出仍只给电端子锚点（另一条契约，由 export/svgTerminalAnchor.test.ts 钉住）
  });

  test("内置图元库全量护栏：锚点数 == 端子数，合并（×状态数）与独立导出同口径", () => {
    for (const template of DEVICE_LIBRARY) {
      const total = createNodeFromTemplate(template, { x: 0, y: 0 }).terminals.length;
      if (total === 0) {
        continue;
      }
      const merged = buildSymbolExportSvg([template], buildDeviceTemplateIconSvg);
      if (merged.symbolCount === 0) {
        continue;
      }
      const standalone = buildStandaloneSymbolExport([template], buildDeviceTemplateIconSvg);
      const countAnchors = (svg: string) => (svg.match(/terminal-anchor/gu) ?? []).length;
      expect(countAnchors(terminalAttachmentMarkupForTemplate(template)), `${template.kind} 注入锚点数`).toBe(total);
      expect(countAnchors(merged.svg), `${template.kind} 合并导出锚点数`).toBe(total * merged.symbolCount);
      expect(countAnchors(standalone.files[0]?.svg ?? ""), `${template.kind} 独立导出锚点数`).toBe(total);
    }
  });

  test("「电 + 非电」图元：两端子各自成锚点，terminal-id 与端子表一一对应", () => {
    for (const kind of ["ac-electrolyzer", "dc-fuel-cell", "ac-two-port-heater", "hydrogen-source", "heat-exchanger"]) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
      const node = createNodeFromTemplate(template, { x: 0, y: 0 });
      const files = buildStandaloneSymbolExport([template], buildDeviceTemplateIconSvg);
      const ids = Array.from(files.files[0]?.svg.matchAll(/terminal-id="([^"]+)"/gu) ?? []).map((m) => m[1]);
      expect(ids, `${kind} 端子 id`).toEqual(node.terminals.map((terminal) => terminal.id));
    }
  });

  test("静态图元与零端子图元不产生端子附着几何；母线只出锚点不出引线（画布同样的短路）", () => {
    expect(terminalAttachmentMarkupForTemplate(templateOf({ kind: "static-ring" }))).toBe("");
    expect(terminalAttachmentMarkupForTemplate(templateOf({ kind: "anchor-probe", terminalCount: 0 }))).toBe("");
    // 母线：buildSvgDeviceConnectorMarkup 对母线短路（沿条任意取连接点，无固定引线几何），
    // 但锚点照出 —— 与画布「母线（单电端子）也有锚点」一致。
    const bus = terminalAttachmentMarkupForTemplate(
      templateOf({ kind: "ac-bus", terminalCount: 1, terminalAnchors: [{ x: -0.5, y: 0 }] })
    );
    expect(anchorPoints(bus)).toEqual([{ x: "-79", y: "0" }]);
    expect(leadRows(bus)).toHaveLength(0);
  });

  test("合并导出：引线与锚点一起注入每个状态 symbol，随 viewBox 归一化一起平移", () => {
    // 桩 symbol viewBox "-40 -30 80 60" → 归一化 translate(40,30)；容器桩保留 80×60，
    // 默认端子锚点 cx=∓44（原始坐标系属性值），在平移组内渲染位置 = ∓44+40 = -4/84。
    const container = templateOf({ kind: "ac-vpp-box", isContainer: true });
    const result = buildSymbolExportSvg([container], () => STATIC_SYMBOL_DOC);
    const anchor1 = `<circle class="terminal terminal-anchor" cx="-44" cy="0" r="4" display="none" terminal-id="t1" terminal-index="1"/>`;
    const anchor2 = `<circle class="terminal terminal-anchor" cx="44" cy="0" r="4" display="none" terminal-id="t2" terminal-index="2"/>`;
    // 两个状态 symbol 各有一份锚点
    expect(result.svg.split(anchor1)).toHaveLength(3);
    expect(result.svg.split(anchor2)).toHaveLength(3);
    // 引线同为每状态一份，且落点与锚点一致（translate(∓44 0) 组内 line 收于原点）
    const symbolSection = result.svg.slice(result.svg.indexOf("<defs"), result.svg.indexOf("</defs>"));
    expect(leadRows(symbolSection)).toHaveLength(4);
    expect(new Set(leadRows(symbolSection).map((lead) => `${lead.groupX},${lead.groupY}`))).toEqual(
      new Set(["-44,0", "44,0"])
    );
    // 锚点在归一化平移组内（图形与锚点同帧）：translate 组由归一化产生，rotate 组是桩正文自带
    expect(result.svg).toContain(`<g transform="translate(40,30)">\n<g transform="rotate(0) scale(1 1)">`);
  });

  test("独立导出：引线与锚点随正文内联进每份自包含 SVG", () => {
    const container = templateOf({ kind: "ac-vpp-box", isContainer: true });
    const files = buildStandaloneSymbolFiles(STATIC_SYMBOL_DOC, container);
    expect(files.length).toBe(2);
    for (const file of files) {
      expect(file.svg).toContain(`<circle class="terminal terminal-anchor" cx="-44" cy="0" r="4" display="none" terminal-id="t1" terminal-index="1"/>`);
      expect(file.svg).toContain(`<circle class="terminal terminal-anchor" cx="44" cy="0" r="4" display="none" terminal-id="t2" terminal-index="2"/>`);
      // 每条锚点都有配套引线（缺一即「锚点悬空」回归）
      expect(leadRows(file.svg).map((lead) => `${lead.groupX},${lead.groupY}`)).toEqual(["-44,0", "44,0"]);
      // 锚点与图形同处 viewBox 平移组，渲染位置落在 symbol 坐标系原预期点
      expect(file.svg).toContain(`<g transform="translate(40,30)">`);
    }
  });
});

describe("绕组端子槽（每个绕组单独着色）", () => {
  // 图元本体导出的槽是**带字面色兜底**的 `var(--tN, <字面色>)`；画布电压模式是裸 `var(--tN)`。
  // 兜底保证：宿主（下游 <use>）不声明 --tN 时，渲染结果与改前逐字节一致。
  const circleSlots = (markup: string) =>
    Array.from(
      markup.matchAll(/<circle [^>]*stroke="var\((--t\d+), ([^)]*)\)"[^>]*>/gu),
      (match) => ({ slot: match[1], fallback: match[2] })
    );
  const leadSlots = (markup: string) =>
    Array.from(
      markup.matchAll(/<line [^>]*stroke="var\((--t\d+), ([^)]*)\)"/gu),
      (match) => ({ slot: match[1], fallback: match[2] })
    );
  const libraryTemplate = (kind: string) => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
    expect(template, `${kind} 应存在于内置图元库`).toBeTruthy();
    return template!;
  };

  test("三绕组主变正文：三个绕组各带自己的槽，兜底色 = 改前字面色", () => {
    const body = buildDeviceTemplateIconSvg(libraryTemplate("ac-three-winding-transformer"));
    expect(circleSlots(body)).toEqual([
      { slot: "--t1", fallback: "#2563eb" },
      { slot: "--t2", fallback: "#2563eb" },
      { slot: "--t3", fallback: "#2563eb" }
    ]);
    // 绕组仍用类名标注，下游可据此单独定位（与画布同款 class）
    expect(body.split('class="transformer-winding"')).toHaveLength(4);
  });

  test("双绕组主变正文：两个绕组 --t1/--t2；非变压器图元零槽（内部单色，不消耗槽）", () => {
    const body = buildDeviceTemplateIconSvg(libraryTemplate("ac-transformer"));
    expect(circleSlots(body).map((item) => item.slot)).toEqual(["--t1", "--t2"]);
    // 兜底色就是原来的字面色（AC 端子类型色，DEFAULT_COLOR_PALETTE）—— 钉住「默认外观零变化」
    expect(new Set(circleSlots(body).map((item) => item.fallback))).toEqual(new Set(["#2563eb"]));
    // 对照组：交流负荷不是变压器族，整份正文不得出现任何 var() 槽
    expect(buildDeviceTemplateIconSvg(libraryTemplate("ac-load"))).not.toContain("var(--t");
  });

  test("正文抑制端子几何（引线/锚点在注入点补），但保留 source-terminal-count 钩子与端子槽", () => {
    const body = buildDeviceTemplateIconSvg(libraryTemplate("ac-three-winding-transformer"));
    // terminalGeometryVisible=false：正文既不画引线也不画锚点，避免与注入点重复
    expect(body).not.toContain("terminal-anchor");
    expect(body).not.toContain('x2="0" y2="0"');
    // 端子数据仍保留（槽取色依赖它）：钩子仍报原始端子数
    expect(body).toContain('data-export-source-terminal-count="3"');
    expect(circleSlots(body)).toHaveLength(3);
  });

  test("独立导出：绕组与每根引线共用同一套槽序（左引线 --t1、右引线 --t2…）", () => {
    const template = libraryTemplate("ac-three-winding-transformer");
    const result = buildStandaloneSymbolExport([template], buildDeviceTemplateIconSvg);
    expect(result.files.map((file) => file.fileName)).toEqual(["ac-three-winding-transformer.svg"]);
    const svg = result.files[0].svg;
    expect(circleSlots(svg).map((item) => item.slot)).toEqual(["--t1", "--t2", "--t3"]);
    // 引线由注入点补画，且逐根跟随其所属绕组侧 —— 与正文绕组同槽序，宿主声明 --tN 即可整侧改色
    expect(leadSlots(svg).map((item) => item.slot)).toEqual(["--t1", "--t2", "--t3"]);
    // 锚点仍在（注入点只改了引线取色，几何未动）
    expect(svg).toContain('terminal-id="t3" terminal-index="3"');
  });

  test("合并导出：symbol 定义里保留绕组槽，正文 use 网格不声明槽（回落字面色）", () => {
    const result = buildSymbolExportSvg([libraryTemplate("ac-three-winding-transformer")], buildDeviceTemplateIconSvg);
    const symbolSection = result.svg.slice(result.svg.indexOf("<defs"), result.svg.indexOf("</defs>"));
    expect(circleSlots(symbolSection).map((item) => item.slot)).toEqual(["--t1", "--t2", "--t3"]);
    const overview = result.svg.slice(result.svg.indexOf('<g id="Symbol_Overview_Layer">'));
    expect(overview).not.toContain("--t1:");
  });

  test("单电端子的变压器族拿不到槽（能力依赖端子数据，非导出缺陷）", () => {
    // ac-terminal-transformer-load 内置模板只有 1 个端子，画布电压模式下同样不产槽 —— 与导出口径一致。
    const body = buildDeviceTemplateIconSvg(libraryTemplate("ac-terminal-transformer-load"));
    expect(body).not.toContain("var(--t");
    expect(body).toContain('data-export-source-terminal-count="1"');
  });
});

describe("buildTemplateTerminalSlotPaint（槽构造器口径）", () => {
  const paintOf = (template: DeviceTemplate, nodeFallback = "#2563eb") =>
    buildTemplateTerminalSlotPaint(
      createNodeFromTemplate(template, { x: 0, y: 0 }),
      "energy",
      DEFAULT_COLOR_PALETTE,
      nodeFallback
    );

  test("非变压器族返回 null（内部单色，不消耗槽）", () => {
    expect(paintOf(templateOf({ kind: "anchor-probe" }))).toBeNull();
  });

  test("变压器族但电端子不足 2 个时返回 null（没有可区分的绕组）", () => {
    expect(paintOf(templateOf({ kind: "ac-transformer", terminalCount: 1 }))).toBeNull();
    // 双端子但都是非电端子（heat）→ 电端子表为空
    expect(paintOf(templateOf({ kind: "ac-transformer", terminalTypes: ["heat", "heat"] }))).toBeNull();
  });

  test("多电端子变压器族：nodeRef 取 --t1，terminalRef 按电端子子序列序号给槽并带字面色兜底", () => {
    const paint = paintOf(templateOf({ kind: "ac-transformer" }))!;
    expect(paint.nodeRef).toBe("var(--t1, #2563eb)");
    expect(paint.terminalRef("t1")).toBe("var(--t1, #2563eb)");
    expect(paint.terminalRef("t2")).toBe("var(--t2, #2563eb)");
    // 未知端子 id 不产槽（调用方据此回落字面色）
    expect(paint.terminalRef("t9")).toBeUndefined();
  });

  test("槽序号 = 电端子子序列序号：夹在中间的非电端子不占槽位，也不指向未声明的槽", () => {
    // 与画布 nodeVoltageSlotDeclarations 同基数（svg.ts 的 slotTerminals 口径）。
    const paint = paintOf(
      templateOf({ kind: "ac-transformer", terminalCount: 3, terminalTypes: ["heat", "ac", "ac"] })
    )!;
    expect(paint.terminalRef("t1")).toBeUndefined();
    expect(paint.terminalRef("t2")).toBe("var(--t1, #2563eb)");
    expect(paint.terminalRef("t3")).toBe("var(--t2, #2563eb)");
  });
});

describe("schema.json（E 文件表名 ↔ svg 映射）", () => {
  test("条目与文件一一对应；kind → E 表名走 inferESection 同源映射（竖向变体归并基础 kind）", () => {
    const templates = [
      templateOf({ kind: "ac-breaker", label: "交流断路器" }),
      templateOf({ kind: "ac-bus-vertical", label: "母线（竖向）" })
    ];
    const result = buildStandaloneSymbolExport(templates, (template) =>
      SINGLE_STATE_SYMBOL_DOC.replaceAll("ac-breaker", template.kind).replaceAll("ACBreaker", template.kind.toUpperCase())
    );
    expect(result.files).toHaveLength(2);
    expect(result.schema.version).toBe(1);
    // svg 文件名与产物文件一一对应；kind/label 取模板字段
    expect(result.schema.symbols.map((entry) => entry.svg)).toEqual(result.files.map((file) => file.fileName));
    expect(result.schema.symbols.map((entry) => entry.kind)).toEqual(["ac-breaker", "ac-bus-vertical"]);
    expect(result.schema.symbols[0].label).toBe("交流断路器");
    expect(result.schema.symbols[1].label).toBe("母线（竖向）");
    // E 表名与模型 E 导出同源：断路器 → ACBreak；竖向母线经 baseDeviceKind 归并 → ACRealBs
    expect(result.schema.symbols.map((entry) => entry.eTable)).toEqual(["ACBreak", "ACRealBs"]);
    // 固定文件名是 zip 消费端（自动成图）的取用契约
    expect(STANDALONE_SCHEMA_FILE_NAME).toBe("schema.json");
  });

  test("多状态图元：每状态一条映射，eTable/kind/label 相同而 svg 名各异", () => {
    const breaker = templateOf({
      kind: "ac-breaker",
      label: "交流断路器",
      stateDefinitions: [{ value: "0", name: "分" }, { value: "1", name: "合" }]
    });
    const result = buildStandaloneSymbolExport([breaker], () => STATIC_SYMBOL_DOC);
    expect(result.files).toHaveLength(2);
    expect(result.schema.symbols).toHaveLength(2);
    for (const entry of result.schema.symbols) {
      expect(entry.kind).toBe("ac-breaker");
      expect(entry.eTable).toBe("ACBreak");
      expect(entry.label).toBe("交流断路器");
    }
    expect(result.schema.symbols.map((entry) => entry.svg)).toEqual(result.files.map((file) => file.fileName));
  });

  test("无对应 E 表的图元 eTable 为空串（字段保留，消费端按空值跳过）", () => {
    const probe = templateOf({ kind: "schema-probe-kind", label: "探测图元" });
    const result = buildStandaloneSymbolExport([probe], () =>
      SINGLE_STATE_SYMBOL_DOC.replaceAll("ac-breaker", "schema-probe-kind").replaceAll("ACBreaker", "SCHEMAPROBE")
    );
    expect(result.files).toHaveLength(1);
    expect(result.schema.symbols).toEqual([
      { svg: result.files[0].fileName, eTable: "", kind: "schema-probe-kind", label: "探测图元" }
    ]);
  });
});

describe("导出文件名与方案快照", () => {
  test("文件名带时间戳且只用安全字符", () => {
    const name = symbolExportFileName(new Date(2026, 8, 21, 9, 5, 7));
    expect(name).toBe("component-symbols-20260921-090507.svg");
    expect(name).toMatch(/^[A-Za-z0-9._-]+$/u);
  });

  test("归一化方案：丢弃无名项、同名覆盖、缺 id 按名称派生、过滤键去重", () => {
    const normalized = normalizeSymbolExportSchemes({
      schemes: [
        { id: "a", name: "开关", templateKinds: ["ac-breaker", "ac-breaker"], filterKeys: ["stateful", "vertical", "bogus"] },
        { id: "b", name: "开关", templateKinds: ["ac-switch"] },
        { name: "   " },
        { name: "母线方案" }
      ]
    });

    expect(normalized.schemes.map((scheme) => scheme.name)).toEqual(["开关", "母线方案"]);
    expect(normalized.schemes[0]).toMatchObject({ id: "b", templateKinds: ["ac-switch"] });
    expect(normalized.schemes[1].id).toBe("scheme-母线方案");
    // 无关键被丢弃（第一项虽被同名覆盖，仍验证过滤键白名单生效）
    expect(normalizeSymbolExportSchemes({ schemes: [{ id: "x", name: "x", filterKeys: ["vertical", "bogus"] }] })
      .schemes[0].filterKeys).toEqual(["vertical"]);
  });

  test("保存方案为同名/同 id 覆盖，其余追加且按名称排序", () => {
    const base = normalizeSymbolExportSchemes({}).schemes;
    const saved = upsertSymbolExportScheme(base, {
      id: "s1", name: "乙方案", templateKinds: ["ac-bus"], filterKeys: [], updatedAt: "2026-09-21T00:00:00.000Z"
    });
    const withSecond = upsertSymbolExportScheme(saved, {
      id: "s2", name: "甲方案", templateKinds: ["ac-load"], filterKeys: [], updatedAt: "2026-09-21T00:00:00.000Z"
    });

    expect(withSecond.map((scheme) => scheme.name)).toEqual(["甲方案", "乙方案"]);
    // 同名覆盖：id 变了但名称相同 → 只留一条
    const overwritten = upsertSymbolExportScheme(withSecond, {
      id: "s3", name: "甲方案", templateKinds: ["ac-load", "ac-bus"], filterKeys: [], updatedAt: "2026-09-21T01:00:00.000Z"
    });
    expect(overwritten).toHaveLength(2);
    expect(overwritten.find((scheme) => scheme.name === "甲方案")).toMatchObject({
      id: "s3",
      templateKinds: ["ac-load", "ac-bus"]
    });
    expect(removeSymbolExportScheme(overwritten, "s3").map((scheme) => scheme.name)).toEqual(["乙方案"]);
  });
});
