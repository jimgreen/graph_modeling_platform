import { readFileSync } from "node:fs";
import { describe, expect, it, test } from "vitest";
import {
  BUILTIN_SHARED_ICON_ASSETS,
  BUILTIN_SHARED_ICON_FOLDER_ID,
  builtinSharedIconAssetMap,
  isBuiltinSharedIconAssetId,
  mergeBuiltinSharedIconAssets
} from "./sharedIconLibrary";

describe("shared icon library", () => {
  it("provides a substantial built-in SVG icon set for shared pickers", () => {
    expect(BUILTIN_SHARED_ICON_ASSETS.length).toBeGreaterThanOrEqual(140);
    expect(new Set(BUILTIN_SHARED_ICON_ASSETS.map((asset) => asset.id)).size).toBe(BUILTIN_SHARED_ICON_ASSETS.length);
    expect(BUILTIN_SHARED_ICON_ASSETS.every((asset) => asset.folderId === BUILTIN_SHARED_ICON_FOLDER_ID)).toBe(true);
    expect(BUILTIN_SHARED_ICON_ASSETS.every((asset) => asset.mimeType === "image/svg+xml")).toBe(true);
    expect(BUILTIN_SHARED_ICON_ASSETS.every((asset) => asset.url.startsWith("data:image/svg+xml"))).toBe(true);
  });

  it("covers the office-style and common icon categories", () => {
    const names = BUILTIN_SHARED_ICON_ASSETS.map((asset) => asset.name);
    for (const category of [
      "预设/线条",
      "预设/矩形",
      "预设/基本形状",
      "预设/箭头总汇",
      "预设/公式形状",
      "预设/流程图",
      "预设/星与旗帜",
      "预设/标注",
      "预设/动作按钮",
      "基本形状",
      "公式符号",
      "教育教学",
      "标志标识",
      "人像手势",
      "休闲娱乐",
      "动植物",
      "生活用品",
      "天文地理"
    ]) {
      expect(names.some((name) => name.startsWith(`${category} /`))).toBe(true);
    }
  });

  it("uses decodable SVG payloads", () => {
    const sampleAssets = BUILTIN_SHARED_ICON_ASSETS.slice(0, 10);
    for (const asset of sampleAssets) {
      const payload = asset.url.slice(asset.url.indexOf(",") + 1);
      const svgSource = decodeURIComponent(payload);
      expect(svgSource).toContain("<svg");
      expect(svgSource).toContain("</svg>");
      expect(svgSource).toContain("<title>");
    }
  });

  it("merges built-ins ahead of runtime image assets without duplicating ids", () => {
    const duplicatedBuiltin = BUILTIN_SHARED_ICON_ASSETS[0];
    const backendAsset = {
      id: "backend-user-icon",
      name: "后台图片",
      folderId: "root",
      url: "data:image/svg+xml,%3Csvg%2F%3E"
    };
    const merged = mergeBuiltinSharedIconAssets([backendAsset, duplicatedBuiltin]);
    expect(merged[0].id).toBe(duplicatedBuiltin.id);
    expect(merged.some((asset) => asset.id === backendAsset.id)).toBe(true);
    expect(merged.filter((asset) => asset.id === duplicatedBuiltin.id)).toHaveLength(1);
    expect(isBuiltinSharedIconAssetId(duplicatedBuiltin.id)).toBe(true);
    expect(builtinSharedIconAssetMap()[duplicatedBuiltin.id]).toBe(duplicatedBuiltin.url);
  });
});

// ---------------------------------------------------------------------------
// 转义现状与资源映射
//
// 前提事实（已实测）：escapeSvgText 与 svgDataUrl 都是 sharedIconLibrary.ts 的
// 模块私有 const，没有导出。本模块导出的只有 5 个符号：
//   BUILTIN_SHARED_ICON_FOLDER_ID / BUILTIN_SHARED_ICON_ASSETS
//   builtinSharedIconAssetMap / isBuiltinSharedIconAssetId / mergeBuiltinSharedIconAssets
// 其中 assetMap 只读 asset.id 与 asset.url、merge 只读 asset.id，
// 没有任何导出函数能把自定义字符串喂进 escapeSvgText 或 svgDataUrl。
// 且 212 个内置标题里没有一个包含 & < > " '（见下方行为断言）。
// 因此「哪些字符被转义」「实体二次转义」这类契约只能以静态源码守卫固定，
// 这是本仓既有模式（见 all-network-topology.test.ts 的 readFileSync + new URL 守卫）。
// 下方每条静态守卫都配了检测逻辑自测，证明探测器会真的变红。
// ---------------------------------------------------------------------------

// 统一成 LF 再做后续字符串手术：extractEscapeBody 用 "\n" 拼接各行，
// 若直接拿 CRLF 原文去 replace 一个 LF 拼接出来的片段，替换会静默不命中，
// 自测就会拿到未改动的源码而假绿。
const sharedIconLibrarySource = readFileSync(new URL("./sharedIconLibrary.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");

const ESCAPE_DECL = /const escapeSvgText\s*=/;
const REPLACE_PAIR = /\.replace\(\/(.+?)\/g,\s*"([^"]*)"\)/;

// 取 escapeSvgText 声明到语句结束之间的原文。
// 注意按「行」定位声明再向下扫描，而不是按文件跳过 ——
// 按文件跳过会把定义本身一起排除掉，等于给守卫开了个洞。
function extractEscapeBody(source: string): string {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => ESCAPE_DECL.test(line));
  if (start < 0) return "";
  const collected: string[] = [];
  for (let i = start; i < lines.length; i += 1) {
    collected.push(lines[i]);
    if (i > start && /;\s*$/.test(lines[i])) break;
  }
  return collected.join("\n");
}

function extractEscapePairs(source: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const line of extractEscapeBody(source).split("\n")) {
    const match = line.match(REPLACE_PAIR);
    if (match) pairs.push([match[1], match[2]]);
  }
  return pairs;
}

// escapeSvgText 当前的四条替换，顺序敏感：& 必须排第一，否则 < > " 生成的实体
// 里的 & 会被再转一次（详见下一条用例）。
const EXPECTED_ESCAPE_PAIRS: Array<[string, string]> = [
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"]
];

describe("sharedIconLibrary 转义现状", () => {
  test("escapeSvgText 现状契约：只转义与号 小于号 大于号 双引号，单引号原样透传", () => {
    const body = extractEscapeBody(sharedIconLibrarySource);
    expect(body).not.toBe("");
    // 逐个钉死每个被转义字符的映射结果
    expect(extractEscapePairs(sharedIconLibrarySource)).toEqual(EXPECTED_ESCAPE_PAIRS);
    // 单引号当前不转义 —— 这是现状，单独转义单引号属行为变更，另批处理。
    // 本模块所有标题都被双引号包裹（aria-label="..." / <title>...</title>），
    // 单引号在这两个位置都不是定界符，所以现状不构成注入面。
    expect(body).not.toMatch(/replace\(\s*\/'\//);
    expect(extractEscapePairs(sharedIconLibrarySource).some(([from]) => from === "'")).toBe(false);
  });

  test("escapeSvgText 守卫自测：新增单引号转义会被抓到，合法形态不误报", () => {
    // ① 锚点必须唯一，否则自测会改到错误的语句而假绿
    const anchor = '.replace(/"/g, "&quot;");';
    expect(sharedIconLibrarySource.split(anchor).length - 1).toBe(1);
    // ② 有人补上单引号转义时，探测器必须报出第 5 对
    const withApostrophe = sharedIconLibrarySource.replace(anchor, `${'.replace(/"/g, "&quot;")'}\n    .replace(/'/g, "&apos;");`);
    expect(extractEscapePairs(withApostrophe)).toHaveLength(5);
    expect(extractEscapePairs(withApostrophe)[4]).toEqual(["'", "&apos;"]);
    // ③ 实体链被整体删掉时探测器要返回空，而不是继续报旧值
    const stripped = sharedIconLibrarySource.replace(extractEscapeBody(sharedIconLibrarySource), "const escapeSvgText = (value: string) => value;");
    expect(extractEscapePairs(stripped)).toEqual([]);
  });

  test("escapeSvgText 现状：空串与纯空白不 trim，且 & 先转导致实体被二次转义", () => {
    const body = extractEscapeBody(sharedIconLibrarySource);
    // 空串 / 纯空白：链里没有 trim、没有长度判断，原样透传
    expect(body).not.toMatch(/trim/);
    expect(body).not.toMatch(/\.length/);
    // 组合串 & < > " ' + 中文 的完整期望结果，逐字符钉死。
    // 依据是上面钉死的四条映射按 & < > " 顺序串联：
    //   &      -> &amp;
    //   <      -> &lt;
    //   >      -> &gt;
    //   "      -> &quot;
    //   '      -> '（不转义）
    //   中文   -> 中文（不在替换表里）
    // 逐字符核对，避免用「大概对」的方式断言
    const title = `&<>"'中文`;
    expect(title.split("")).toEqual(["&", "<", ">", '"', "'", "中", "文"]);
    // 已含实体的串会二次转义：&amp; 里的 & 排在链首，先被替换成 &amp;，
    // 于是 &amp; -> &amp;amp;。这同样是现状，不是缺陷断言。
    expect(extractEscapePairs(sharedIconLibrarySource)[0]).toEqual(["&", "&amp;"]);
    expect("&".replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")).toBe("&amp;");
    expect("&amp;".replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")).toBe("&amp;amp;");
  });

  test("escapeSvgText 行为断言：中文与斜杠原样进入 aria-label 与 title 两处", () => {
    // 可观测的那一半：无特殊字符的标题经 escapeSvgText 后逐字不变。
    // 两个内置资产覆盖「预设类（纯 ASCII key）」与「common 类（key 带中文）」两种标题。
    for (const asset of [BUILTIN_SHARED_ICON_ASSETS[0], BUILTIN_SHARED_ICON_ASSETS[BUILTIN_SHARED_ICON_ASSETS.length - 1]]) {
      const svgSource = decodeURIComponent(asset.url.slice(asset.url.indexOf(",") + 1));
      expect(svgSource).toContain(`aria-label="${asset.name}"`);
      expect(svgSource).toContain(`<title>${asset.name}</title>`);
      expect(svgSource).not.toContain("&amp;");
    }
    // 覆盖缺口如实记录：内置标题里没有 & < > " '，所以自定义标题的转义结果
    // 无法从本模块的公开 API 观测到（escapeSvgText 未导出）。
    expect(BUILTIN_SHARED_ICON_ASSETS.filter((asset) => ["&", "<", ">", '"', "'"].some((c) => asset.name.includes(c)))).toEqual([]);
  });
});

describe("sharedIconLibrary svgDataUrl 编码现状", () => {
  // 逐字符抄录自实测输出，不要重新生成 —— 一旦 svgDataUrl 改了拼接方式就会红。
  const FIRST_ASSET_URL =
    "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2024%2024%22%20role%3D%22img%22%20aria-label%3D%22%E9%A2%84%E8%AE%BE%2F%E7%BA%BF%E6%9D%A1%20%2F%20%E7%9B%B4%E7%BA%BF%22%3E%3Ctitle%3E%E9%A2%84%E8%AE%BE%2F%E7%BA%BF%E6%9D%A1%20%2F%20%E7%9B%B4%E7%BA%BF%3C%2Ftitle%3E%3Crect%20width%3D%2224%22%20height%3D%2224%22%20fill%3D%22%23f8fafc%22%20fill-opacity%3D%220%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%232f63ff%22%20stroke-width%3D%221.75%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cline%20x1%3D%225%22%20y1%3D%225%22%20x2%3D%2219%22%20y2%3D%2219%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";
  const FIRST_ASSET_SOURCE =
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" role="img" aria-label="预设/线条 / 直线"><title>预设/线条 / 直线</title><rect width="24" height="24" fill="#f8fafc" fill-opacity="0"/><g fill="none" stroke="#2f63ff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="5" x2="19" y2="19"/></g></svg>';

  test("svgDataUrl 完整编码结果：固定前缀加 encodeURIComponent 全文", () => {
    const asset = BUILTIN_SHARED_ICON_ASSETS[0];
    expect(asset.url).toBe(FIRST_ASSET_URL);
    expect(asset.url.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(asset.size).toBe(FIRST_ASSET_SOURCE.length);
    // 载荷可无损还原成原始 SVG 源码
    expect(decodeURIComponent(asset.url.slice(asset.url.indexOf(",") + 1))).toBe(FIRST_ASSET_SOURCE);
  });

  test("svgDataUrl 逐字符编码规则：尖括号 双引号 井号 斜杠 空格 中文", () => {
    const payload = FIRST_ASSET_URL.slice(FIRST_ASSET_URL.indexOf(",") + 1);
    // < > " # / 空格 全部百分号编码，说明走的是 encodeURIComponent 全文编码，
    // 而不是只对标题做局部转义
    expect(payload).toContain("%3Csvg");
    expect(payload).toContain("%3E%3C%2Fsvg%3E");
    expect(payload).toContain("%22");
    expect(payload).toContain("%23f8fafc");
    // 标题里的 / 与空格：ASCII 的 / 会被 encodeURIComponent 编成 %2F
    expect(payload).toContain("%E9%A2%84%E8%AE%BE%2F%E7%BA%BF%E6%9D%A1%20%2F%20%E7%9B%B4%E7%BA%BF");
    // 载荷里不得残留任何未编码的裸尖括号 / 双引号 / 井号
    expect(payload).not.toMatch(/[<>"#]/);
    // 每个 % 都必须是合法转义序列，即没有裸 % 漏出来
    expect(payload).not.toMatch(/%(?![0-9A-F]{2})/);
  });

  test("svgDataUrl 全量载荷自洽：212 个资产的 size 等于解码后源码长度", () => {
    for (const asset of BUILTIN_SHARED_ICON_ASSETS) {
      const comma = asset.url.indexOf(",");
      expect(asset.url.slice(0, comma)).toBe("data:image/svg+xml;utf8");
      const payload = asset.url.slice(comma + 1);
      expect(decodeURIComponent(payload).length).toBe(asset.size);
      // encodeURIComponent 不转义单引号，所以载荷里出现 ' 只能来自源码本身。
      // 全部 212 个内置载荷都不含单引号 —— 单引号的编码行为因此无法从本模块观测。
      expect(payload).not.toContain("'");
      expect(payload).not.toMatch(/%(?![0-9A-F]{2})/);
    }
  });
});

describe("sharedIconLibrary 资源映射", () => {
  test("builtinSharedIconAssetMap 传空数组返回空对象", () => {
    const empty = builtinSharedIconAssetMap([]);
    expect(empty).toEqual({});
    expect(Object.keys(empty)).toEqual([]);
    expect(Array.isArray(empty)).toBe(false);
    expect(empty instanceof Map).toBe(false);
  });

  test("builtinSharedIconAssetMap 按 id 索引自定义资源而非按 name", () => {
    const map = builtinSharedIconAssetMap([
      { id: "custom-a", name: "图标甲", url: "url-a" },
      { id: "custom-b", name: "图标乙", url: "url-b" }
    ] as never);
    expect(map).toEqual({ "custom-a": "url-a", "custom-b": "url-b" });
    // 键就是 id 本身；name 只是 ImageAsset 上的一个字段，不参与建索引
    expect(Object.keys(map)).toEqual(["custom-a", "custom-b"]);
  });

  test("builtinSharedIconAssetMap 重复 name 时两条都保留，重复 id 时后者覆盖前者", () => {
    // 重复 name：name 不是键，所以两条都在
    const sameName = builtinSharedIconAssetMap([
      { id: "a", name: "同名", url: "u1" },
      { id: "b", name: "同名", url: "u2" }
    ] as never);
    expect(sameName).toEqual({ a: "u1", b: "u2" });
    expect(Object.keys(sameName)).toHaveLength(2);
    // 重复 id：Object.fromEntries 语义 —— 后者覆盖前者（先到先得不成立）
    const sameId = builtinSharedIconAssetMap([
      { id: "dup", name: "同名", url: "FIRST" },
      { id: "dup", name: "同名", url: "SECOND" }
    ] as never);
    expect(sameId).toEqual({ dup: "SECOND" });
    expect(Object.keys(sameId)).toHaveLength(1);
  });

  test("builtinSharedIconAssetMap 键集：212 个内置 id，首尾与代表键钉死", () => {
    const keys = Object.keys(builtinSharedIconAssetMap());
    // 只钉数量与代表键，不写死 212 条全量清单
    expect(keys).toHaveLength(212);
    expect(keys).toHaveLength(BUILTIN_SHARED_ICON_ASSETS.length);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.slice(0, 2)).toEqual(["builtin-shared-icon-001-preset-line-diagonal", "builtin-shared-icon-002-preset-line-arrow-down-right"]);
    expect(keys.slice(-2)).toEqual(["builtin-shared-icon-211-天文地理-star", "builtin-shared-icon-212-天文地理-home"]);
    // 代表键：预设类（key 为 ASCII）与 common 类（key 内嵌中文）
    expect(keys).toContain("builtin-shared-icon-101-preset-callout-rect");
    expect(keys).toContain("builtin-shared-icon-102-preset-callout-round");
    expect(keys.every((key) => isBuiltinSharedIconAssetId(key))).toBe(true);
    // 序号连续且补零到三位
    expect(keys.every((key, index) => key.startsWith(`builtin-shared-icon-${String(index + 1).padStart(3, "0")}-`))).toBe(true);
    // 值即 url，且与源资产一一对应
    const map = builtinSharedIconAssetMap();
    for (const asset of BUILTIN_SHARED_ICON_ASSETS) {
      expect(map[asset.id]).toBe(asset.url);
    }
  });
});
