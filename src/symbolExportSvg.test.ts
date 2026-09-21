// 图元 Symbol 导出的纯逻辑契约：分类过滤、viewBox 归一化、SVG 合成与方案快照。
import { describe, expect, test } from "vitest";
import { DEVICE_LIBRARY, type DeviceTemplate } from "./model";
import { buildDeviceTemplateIconSvg } from "./appExtracted/appPersistenceLibraryExport";
import {
  DEFAULT_SYMBOL_EXPORT_FILTER_KEYS,
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
