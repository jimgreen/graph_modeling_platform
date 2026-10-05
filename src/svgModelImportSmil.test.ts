// 导入路径（svgModelImport.ts）SMIL 值属性防线的守卫。
//
// 与渲染侧 `src/svgSanitizeSmil.test.ts` **成对**：那个钉渲染侧
// `stripUnsafeInlineSvgMarkup`，本文件钉导入侧 `sanitizeDocument`。
//
// 为什么要两侧都拦（防御纵深）：
// 渲染侧已能拦住 SMIL 改写 href 的向量，但恶意 SVG 若带着
// `values="javascript:..."` 落进项目文件，仍会被导出链路或其它消费方读到 ——
// 渲染侧净化只发生在「内联渲染」那一刻，**不是数据层的准入**。故导入时即应拦下。
//
// 两侧规则刻意**同构**：都对 values/to/from/by 无条件套用同一套 scheme 判定
// （导入侧 safeUrl / 渲染侧 href 规则），误伤面同样极小 —— 正常动画的值
// （`0;1;2`、`#fff`、色值、`url(#id)`）都不带 scheme，会被放行。
import { describe, expect, test } from "vitest";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { parseSvgModel, type SvgDomAdapter } from "./svgModelImport";
import { DEVICE_LIBRARY } from "./model";

const dom: SvgDomAdapter = {
  parse(source) {
    const document = new DOMParser({
      onError(level, message) {
        if (level !== "warning") throw new Error(String(message));
      }
    }).parseFromString(source, "image/svg+xml");
    return document as unknown as Document;
  },
  serialize(node) {
    return new XMLSerializer().serializeToString(
      node as unknown as Parameters<XMLSerializer["serializeToString"]>[0]
    );
  }
};

const parse = (source: string) =>
  parseSvgModel(source, {
    name: "探针图",
    templates: DEVICE_LIBRARY,
    dom,
    yieldToMain: async () => undefined,
    batchSize: 4
  });

const wrap = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">${inner}</svg>`;

/** 结果里所有字符串形态（含序列化后的 SVG 标记）拼起来 */
const allStrings = (v: unknown, acc: string[] = []): string[] => {
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, acc));
  else if (v && typeof v === "object") {
    Object.values(v as Record<string, unknown>).forEach((x) => allStrings(x, acc));
  }
  return acc;
};

const markupOf = async (inner: string) => allStrings(await parse(wrap(inner))).join("\n");

describe("导入侧：SMIL 值属性里的危险 scheme 被拦下", () => {
  const vectors: [string, string][] = [
    ["animate values", `<animate attributeName="href" values="javascript:alert(1)" dur="1s"/>`],
    ["animate to", `<animate attributeName="href" to="javascript:alert(1)" dur="1s"/>`],
    ["set to", `<set attributeName="href" to="javascript:alert(1)"/>`],
    ["animate xlink:href", `<animate attributeName="xlink:href" values="javascript:alert(1)" dur="1s"/>`],
    ["begin=click", `<animate attributeName="href" begin="click" values="javascript:alert(1)" dur="1s"/>`],
    ["大小写混写", `<animate attributeName="href" values="JaVaScRiPt:alert(1)" dur="1s"/>`],
    ["vbscript", `<animate attributeName="href" values="vbscript:msgbox(1)" dur="1s"/>`],
    ["data:text/html", `<animate attributeName="href" values="data:text/html,x" dur="1s"/>`],
    ["file scheme", `<animate attributeName="href" values="file:///c:/x.exe" dur="1s"/>`],
    ["from 属性", `<animate attributeName="href" from="#a" to="javascript:alert(1)" dur="1s"/>`]
  ];

  for (const [label, anim] of vectors) {
    test(`${label}：导入结果里不再有 javascript:/vbscript:`, async () => {
      const markup = await markupOf(`<a href="#safe"><rect width="5" height="5"/></a>${anim}`);
      expect(markup, markup.slice(0, 200)).not.toMatch(/(?:java|vb)script:/i);
      expect(markup).not.toContain("alert(1)");
      expect(markup).not.toContain("msgbox(1)");
    });
  }

  test("清理计数进入 warnings（用户能看到发生了清理）", async () => {
    const result = await parse(
      wrap(`<a href="#safe"><rect width="5" height="5"/></a><animate attributeName="href" values="javascript:alert(1)" dur="1s"/>`)
    );
    expect(result.warnings.join(" ")).toContain("已清理");
  });
});

describe("导入侧：正常 SMIL 动画不被误伤", () => {
  const animates: [string, string][] = [
    ["数值插值", `<animate attributeName="fill" values="red;blue;green" dur="2s" repeatCount="indefinite"/>`],
    ["单值 to", `<animate attributeName="opacity" to="0.5" dur="1s"/>`],
    ["transform 插值", `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2s"/>`],
    ["颜色 from/to", `<animate attributeName="fill" from="#fff" to="#000" dur="1s"/>`],
    ["安全 http href", `<animate attributeName="href" values="https://x.test/a.png" dur="1s"/>`],
    ["锚点 href", `<animate attributeName="href" values="#other" dur="1s"/>`],
    ["url(#id) 引用", `<animate attributeName="fill" values="url(#grad)" dur="1s"/>`],
    ["path d 动画", `<animate attributeName="d" values="M0 0 L10 10;M0 0 L20 20" dur="1s"/>`],
    ["data:image 值", `<animate attributeName="fill" values="data:image/png;base64,iVBOR" dur="1s"/>`]
  ];

  for (const [label, anim] of animates) {
    test(`${label}：值属性原样保留（不被清理）`, async () => {
      const result = await parse(wrap(`<a href="#safe"><rect width="5" height="5"/></a>${anim}`));
      // 未触发清理 = warnings 里没有「已清理」
      expect(result.warnings.join(" "), result.warnings.join(" ")).not.toContain("已清理");
    });
  }

  test("正常动画的值内容未被篡改", async () => {
    const markup = await markupOf(
      `<rect width="5" height="5"><animate attributeName="fill" values="red;blue;green" dur="2s"/></rect>`
    );
    // 编码后仍应能还原出原值（可能被百分号编码，故用解码后的串比对）
    const decoded = decodeURIComponent(markup);
    expect(decoded).toContain('values="red;blue;green"');
  });
});

describe("导入侧：既有防线不受影响", () => {
  test("直接 href=javascript: 仍被拦（未因本次改动回退）", async () => {
    const markup = await markupOf(`<a href="javascript:alert(1)"><rect width="5" height="5"/></a>`);
    expect(markup).not.toContain("javascript:");
  });

  test("危险元素仍被移除（script / iframe / object / embed）", async () => {
    for (const el of ["script", "iframe", "object", "embed"]) {
      const markup = await markupOf(`<${el}>PAYLOAD</${el}><rect width="5" height="5"/>`);
      expect(markup, el).not.toContain("PAYLOAD");
    }
  });

  test("on* 事件属性仍被移除", async () => {
    for (const attr of ["onclick", "onload", "onerror"]) {
      const markup = await markupOf(`<rect width="5" height="5" ${attr}="PAYLOAD"/>`);
      expect(markup, attr).not.toContain("PAYLOAD");
    }
  });

  test("`<foreignObject>` 元素本身保留、其中的 srcdoc 被清（既有设计）", async () => {
    // 与渲染侧一致：不能整个剥掉 foreignObject（项目自身 stateIconDrawing 会生成它），
    // 只剥危险属性。
    const markup = await markupOf(
      `<foreignObject><iframe xmlns="http://www.w3.org/1999/xhtml" srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe></foreignObject><rect width="5" height="5"/>`
    );
    expect(markup).not.toContain("srcdoc");
    expect(markup).not.toContain("alert(1)");
  });
});

// ── href / xlink:href 双写、属性名大小写、分号多段（现状钉）───────────────
//
// 三条独立的判定路径，本节把它们各自钉住：
//
//   ① **读侧** `elementHref` = `getAttribute("href") || getAttribute("xlink:href")`
//      ⇒ 同一元素双写且值不同时，**href 胜**。symbol 解析与状态后缀都走它。
//   ② **写侧** `sanitizeDocument` 把 `href` 与 `xlink:href` **各自独立**送进
//      `safeUrl` ⇒ 谁危险清谁，不会因为 href 存在就放过 xlink:href；
//      危险的那个被清掉之后，读侧会**回落到**留下的那个。
//   ③ 属性名在写侧先 `.toLowerCase()` 才比对集合 ⇒ `VALUES` / `OnLoad`
//      这类大写形态**仍被识别**（XML 虽区分大小写，但净化不区分）。
//
// ⚠⚠ 本节里有两条断言的是**当前实现**，不是期望行为，改动前先读注释：
//
//   **缺口 A：`values` 按整串判 scheme，不按 `;` 分段。**
//   SMIL 的 `values` 是分号分隔的关键帧列表，浏览器会逐段轮流写进目标属性，
//   所以 `values="red;javascript:alert(1)"` 在 t=50% 时 `href` **确实**变成
//   `javascript:alert(1)`。但 `safeUrl` 只看整串：`red;` 里的 `;` 让开头的
//   `^[a-z][a-z0-9+.-]*:` 匹配不上，整串被判为无 scheme ⇒ 放行。
//   这里是**真的漏过**，不是等价写法。修它属于行为变更（会开始清理
//   `values="M0 0 L10 10;..."` 之外的一些历史图形），故本文件只把现状钉住。
//
//   **边界 B：`begin` / `dur` / `attributeName` 不在 URL 审查表内。**
//   它们分别是时间规格与属性名选择器，**本就不是 URL 落点**，不清理是对的；
//   但也意味着 `begin="javascript:..."` 会原样留在文件里。记下来是为了
//   免得日后有人把「没被清」误读成「已审查通过」。
//
// 另：`attributeName` 无论大小写都不被清理（它是选择器不是取值），
// 但**同一元素上小写的 `values` 兄弟仍会被清** —— 两者互不干扰。

/** 结果里所有字符串形态；SVG 标记经 encodeURIComponent 编码，逐个尝试解码 */
const decodedMarkupOf = async (inner: string) =>
  allStrings(await parse(wrap(inner))).map((text) => {
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  });

/** 解码后取第一个 `<animate …>` 开标签（属性值里的 `>` 已被编码，不会截断） */
const animateTagOf = async (inner: string) =>
  /<animate\b[^>]*>/u.exec((await decodedMarkupOf(inner)).join("\n"))?.[0] ?? "";

// platform 判据 = root_g + 语义层 id + 任一设备元数据属性（与 svgModelImport.test.ts 同款夹具）
const platform = (defs: string, useAttrs: string) => `
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 900 600">
    <defs id="svg_defs">${defs}</defs>
    <g id="root_g">
      <g id="Segment_Layer">
        <path id="edge-1" source-dev-id="N1" target-dev-id="N2" d="M 240 150 L 350 150"/>
      </g>
      <g id="ACBreaker_Layer" device-type="ACBreaker"><use ${useAttrs}/></g>
    </g>
  </svg>`;

const nodeById = (result: Awaited<ReturnType<typeof parse>>, id: string) =>
  result.project.nodes.find((node) => node.id === id);

const MARK_A = `<symbol id="symbol_A" viewBox="0 0 10 10"><rect id="MARKER_FROM_HREF" width="10" height="10"/></symbol>`;
const MARK_B = `<symbol id="symbol_B" viewBox="0 0 10 10"><rect id="MARKER_FROM_XLINK" width="10" height="10"/></symbol>`;

describe("导入侧：href 与 xlink:href 双写时的优先级", () => {
  test("双写且值不同：symbol 解析取 href 那一侧（`xlink:href` 被忽略）", async () => {
    const result = await parse(platform(
      `${MARK_A}${MARK_B}`,
      'dev-id="U1" href="#symbol_A" xlink:href="#symbol_B" x="10" y="10" width="20" height="20"'
    ));
    expect(result.mode, "需走 platform 分支，否则读侧优先级观察不到").toBe("platform");
    const svg = decodeURIComponent(String(nodeById(result, "U1")?.params.backgroundImage ?? ""));
    // 两个 symbol 各带一个只可能来自其中一侧的标记，故此断言有判别力
    expect(svg).toContain("MARKER_FROM_HREF");
    expect(svg, "双写时 xlink:href 不参与 symbol 选择").not.toContain("MARKER_FROM_XLINK");
  });

  test("双写且值不同：状态后缀取 href 那一侧", async () => {
    // `closed_status` 才是被 stateFromHref 写入的键 —— `status` 恒为模板默认值 "1"，
    // 断言它等于 "1" 会与「没解析出来」不可区分（默认值恰好等于期望值）。
    const defs = `
      <symbol id="symbol_ACBreaker_ac-breaker_state_1" viewBox="0 0 10 10"><rect id="S1"/></symbol>
      <symbol id="symbol_ACBreaker_ac-breaker_state_2" viewBox="0 0 10 10"><rect id="S2"/></symbol>`;
    const dual = await parse(platform(defs,
      'dev-kind="ac-breaker" dev-id="N1" href="#symbol_ACBreaker_ac-breaker_state_2" xlink:href="#symbol_ACBreaker_ac-breaker_state_1" x="10" y="10" width="80" height="60"'
    ));
    // href 指向 state_2 ⇒ 取 2。若换成 xlink:href 优先，这里会变成 1。
    expect(nodeById(dual, "N1")?.params.closed_status, "href 侧应胜出").toBe("2");
  });

  test("只写 href：symbol 与状态后缀都能解析（回归）", async () => {
    const result = await parse(platform(
      `${MARK_A}<symbol id="symbol_ACBreaker_ac-breaker_state_2" viewBox="0 0 10 10"><rect id="S2"/></symbol>`,
      'dev-kind="ac-breaker" dev-id="N1" href="#symbol_ACBreaker_ac-breaker_state_2" x="10" y="10" width="80" height="60"'
    ));
    expect(nodeById(result, "N1")?.params.closed_status).toBe("2");
  });

  test("只写 xlink:href：symbol 与状态后缀同样能被解析（回归）", async () => {
    const result = await parse(platform(
      `${MARK_A}<symbol id="symbol_ACBreaker_ac-breaker_state_2" viewBox="0 0 10 10"><rect id="S2"/></symbol>`,
      'dev-kind="ac-breaker" dev-id="N1" xlink:href="#symbol_ACBreaker_ac-breaker_state_2" x="10" y="10" width="80" height="60"'
    ));
    expect(nodeById(result, "N1")?.params.closed_status, "单写 xlink:href 也应被读到").toBe("2");
  });

  test("写侧两者独立判定：href 危险被清后，读侧回落到留下的 xlink:href", async () => {
    const result = await parse(platform(
      `<symbol id="symbol_ACBreaker_ac-breaker_state_2" viewBox="0 0 10 10"><rect id="S2"/></symbol>`,
      'dev-kind="ac-breaker" dev-id="N1" href="javascript:alert(1)" xlink:href="#symbol_ACBreaker_ac-breaker_state_2" x="10" y="10" width="80" height="60"'
    ));
    expect(result.warnings.join(" "), "危险的那个 href 应被计入清理").toContain("已清理 1 项");
    const decoded = decodeURIComponent(allStrings(result).join("\n"));
    expect(decoded).not.toContain("javascript:");
    // 危险 href 被摘掉后，elementHref 的 `href ||` 短路不再成立 ⇒ 回落到 xlink:href
    expect(nodeById(result, "N1")?.params.closed_status, "应回落到 xlink:href 并解析出 state_2").toBe("2");
  });

  test("写侧两者独立判定：两个都危险时两个都被清", async () => {
    const result = await parse(wrap(`<a href="javascript:alert(1)" xlink:href="javascript:alert(2)"><rect width="5" height="5"/></a>`));
    expect(result.warnings.join(" ")).toContain("已清理 2 项");
    const decoded = decodeURIComponent(allStrings(result).join("\n"));
    expect(decoded).not.toContain("javascript:");
    // 元素本身保留，仅属性被摘
    expect(decoded).toMatch(/<a\b[^>]*>/u);
  });

  test("单独的 xlink:href 也走 URL 审查：安全值保留、危险值被清", async () => {
    const safe = await parse(wrap(`<image xlink:href="https://x.test/a.png" width="5" height="5"/>`));
    expect(safe.warnings.join(" "), "https: 属白名单，不该触发清理").not.toContain("已清理");
    expect(decodeURIComponent(allStrings(safe).join("\n"))).toContain("xlink:href=\"https://x.test/a.png\"");

    const danger = await parse(wrap(`<image xlink:href="javascript:alert(1)" width="5" height="5"/>`));
    expect(danger.warnings.join(" ")).toContain("已清理 1 项");
    expect(decodeURIComponent(allStrings(danger).join("\n"))).not.toContain("javascript:");
  });
});

describe("导入侧：SMIL 属性名大写形态的当前匹配情况", () => {
  test("大写 `VALUES` 仍被识别并清理（写侧比对前先转小写）", async () => {
    const result = await parse(wrap(`<a href="#safe"><rect width="5" height="5"/></a><animate attributeName="href" VALUES="javascript:alert(1)" dur="1s"/>`));
    expect(result.warnings.join(" ")).toContain("已清理 1 项");
    const tag = await animateTagOf(`<a href="#safe"><rect width="5" height="5"/></a><animate attributeName="href" VALUES="javascript:alert(1)" dur="1s"/>`);
    expect(tag, "危险的大写 VALUES 应被摘掉").not.toContain("VALUES");
  });

  test("大写 `VALUES` 的安全值原样保留（清理不是无条件删属性）", async () => {
    const result = await parse(wrap(`<a href="#safe"><rect width="5" height="5"/></a><animate attributeName="href" VALUES="red;blue" dur="1s"/>`));
    expect(result.warnings.join(" "), "安全值不该触发清理").not.toContain("已清理");
    const tag = await animateTagOf(`<a href="#safe"><rect width="5" height="5"/></a><animate attributeName="href" VALUES="red;blue" dur="1s"/>`);
    expect(tag).toContain('VALUES="red;blue"');
  });

  test("混写 `Values` 与 `ValuEs` 同样按 SMIL 值属性处理", async () => {
    for (const name of ["Values", "ValuEs"]) {
      const inner = `<a href="#safe"><rect width="5" height="5"/></a><animate attributeName="href" ${name}="javascript:alert(1)" dur="1s"/>`;
      const result = await parse(wrap(inner));
      expect(result.warnings.join(" "), name).toContain("已清理 1 项");
      expect(await animateTagOf(inner), name).not.toContain(name);
    }
  });

  test("大写 `attributeName` / `Attributename` 本身不被清理（它是选择器不是取值）", async () => {
    // 记录现状：attributeName 不在 URL 表也不在 SMIL 值属性表里 ⇒ 原样保留。
    for (const name of ["attributeName", "AttributeName", "Attributename", "ATTRIBUTENAME"]) {
      const inner = `<a href="#safe"><rect width="5" height="5"/></a><animate ${name}="href" dur="1s"/>`;
      const result = await parse(wrap(inner));
      expect(result.warnings.join(" "), name).not.toContain("已清理");
      expect(await animateTagOf(inner), name).toContain(`${name}="href"`);
    }
  });

  test("大写 `attributeName` 不影响同元素小写 `values` 兄弟被清理", async () => {
    const inner = `<a href="#safe"><rect width="5" height="5"/></a><animate AttributeName="href" values="javascript:alert(1)" dur="1s"/>`;
    const result = await parse(wrap(inner));
    expect(result.warnings.join(" ")).toContain("已清理 1 项");
    const tag = await animateTagOf(inner);
    expect(tag).toContain('AttributeName="href"');
    expect(tag, "小写 values 仍应被清").not.toContain("values=");
  });

  test("大写 `OnLoad` 被当作事件属性清理；而 `icon` 不受影响（规则是前缀非子串）", async () => {
    // XML 里 `OnLoad` 与 `onload` 是两个不同的属性名，浏览器不会执行前者；
    // 净化仍清它是偏保守的方向，无害。断言它被清，是记录这个保守行为。
    const onLoad = await parse(wrap(`<rect width="5" height="5" OnLoad="PAYLOAD"/>`));
    expect(onLoad.warnings.join(" ")).toContain("已清理 1 项");
    expect(decodeURIComponent(allStrings(onLoad).join("\n")), "OnLoad 的值不该残留").not.toContain("PAYLOAD");

    // 判别力检查：若规则写成 `includes("on")` 而不是 `startsWith("on")`，
    // `icon`（antd 图标标记，含 on 但不在开头）会被误删。它必须留下。
    const icon = await parse(wrap(`<rect width="5" height="5" icon="PAYLOAD"/>`));
    expect(icon.warnings.join(" "), "icon 不该被 on 前缀规则命中").not.toContain("已清理");
    expect(decodeURIComponent(allStrings(icon).join("\n"))).toContain('icon="PAYLOAD"');
  });

  test("边界 B：`begin` / `dur` 无论大小写都不在 URL 审查表内（当前不清理）", async () => {
    // 这不是漏洞：begin/dur 是时间规格，attributeName 是选择器，都不是 URL 落点。
    // 但「没被清」不等于「已审查通过」，故把现状显式钉住。
    // 注意：XML 不允许同名属性重复，故 attributeName 那条不能与基准的
    // attributeName="href" 并存，单独给一整串属性。
    const cases = [
      `<animate attributeName="href" begin="javascript:alert(1)"/>`,
      `<animate attributeName="href" Begin="javascript:alert(1)"/>`,
      `<animate attributeName="href" dur="javascript:alert(1)"/>`,
      `<animate attributeName="href" Dur="javascript:alert(1)"/>`,
      `<animate attributeName="javascript:alert(1)"/>`,
      `<animate ATTRIBUTENAME="javascript:alert(1)"/>`
    ];
    for (const anim of cases) {
      const inner = `<a href="#safe"><rect width="5" height="5"/></a>${anim}`;
      const result = await parse(wrap(inner));
      expect(result.warnings.join(" "), anim).not.toContain("已清理");
      expect(await animateTagOf(inner), anim).toBe(anim);
    }
  });
});

describe("导入侧：`values` 分号多段与 `begin` 取值的当前行为", () => {
  test("分号多段且每段都安全：整条原样保留，段间结构不变", async () => {
    const inner = `<a href="#safe"><rect width="5" height="5"/></a><animate attributeName="href" values="red;blue;green" dur="1s"/>`;
    const result = await parse(wrap(inner));
    expect(result.warnings.join(" ")).not.toContain("已清理");
    expect(await animateTagOf(inner)).toContain('values="red;blue;green"');
  });

  test("首段带 scheme 时整条被清（整串判定的可见一半）", async () => {
    const inner = `<a href="#safe"><rect width="5" height="5"/></a><animate attributeName="href" values="javascript:alert(1);red" dur="1s"/>`;
    const result = await parse(wrap(inner));
    expect(result.warnings.join(" ")).toContain("已清理 1 项");
    expect(await animateTagOf(inner)).not.toContain("values=");
  });

  test("缺口 A：危险 scheme 出现在第二段及以后时当前不会被清", async () => {
    // 见文件头注释：浏览器会逐段轮流写入，第二段起带 scheme 同样能改写 href，
    // 但 safeUrl 只看整串的开头，`red;` 让 scheme 正则匹配不上 ⇒ 放行。
    // 这是真的漏过。此处断言的是**当前实现**，修复时这条会转红（那是预期的）。
    const cases = [
      `values="red;javascript:alert(1)"`,
      `values="#a;javascript:alert(1)"`,
      `values="url(#g);javascript:alert(1)"`,
      `values="https://x.test/a;javascript:alert(1)"`,
      `values="red;vbscript:msgbox(1)"`,
      `to="red;javascript:alert(1)"`
    ];
    for (const attrs of cases) {
      const inner = `<a href="#safe"><rect width="5" height="5"/></a><animate attributeName="href" ${attrs} dur="1s"/>`;
      const result = await parse(wrap(inner));
      expect(result.warnings.join(" "), `${attrs}：当前不触发清理`).not.toContain("已清理");
      expect(await animateTagOf(inner), attrs).toContain(attrs);
    }
  });

  test("`begin` 的三种形态（`0s` / `click` / 缺失）都不触发清理且原样保留", async () => {
    const variants = [
      [`begin="0s"`, `begin="0s"`],
      [`begin="click"`, `begin="click"`],
      [`begin="other.click+1s"`, `begin="other.click+1s"`],
      [``, ``]
    ];
    for (const [written, expected] of variants) {
      const inner = `<a href="#safe"><rect width="5" height="5"/></a><animate attributeName="href" ${written} values="#a;#b" dur="1s"/>`;
      const result = await parse(wrap(inner));
      expect(result.warnings.join(" "), written || "(无 begin)").not.toContain("已清理");
      const tag = await animateTagOf(inner);
      expect(tag).toContain('values="#a;#b"');
      if (expected) {
        expect(tag, written).toContain(expected);
      } else {
        expect(tag, "未写 begin 时不应凭空出现").not.toContain("begin=");
      }
    }
  });
});
