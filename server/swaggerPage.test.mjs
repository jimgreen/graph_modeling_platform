// /swigger 自包含页面的静态守卫。
//
// 为什么值得守：swaggerPage.mjs 把接口元数据与一大段 JS/CSS 直接内联进 HTML，
// 历史上踩过「模板字面量里的换行没转义成 \\n → 整页 SyntaxError → 页面全白」的坑
// （见 server/CLAUDE.md 的注意事项）。而 swigger.examples.test.mjs 打的是**后端端点**，
// 完全不碰这个 HTML —— 也就是说上面那个回归至今没有任何测试能发现。
//
// 这里不启服务、不需要 DOM，分两段：
//   前三条是静态校验（HTML 骨架）：
//     1. 内联 <script> 能被真实 JS 引擎解析（SyntaxError 即页面全白）；
//     2. 页面确实是完整 HTML 文档，且带 highlight.js（文档承诺的自包含交互依赖）；
//     3. 端点数与示例总数符合文档记载的 81 端点 / 106 示例。
//   后几条走数据流（读 ENDPOINTS 本身，见下方分隔线之后）：
//     _idx 注入的唯一性、重复渲染的幂等、非默认 apiPrefix 下的 path 重写、
//     以及内联 JSON 的 </script> 注入面 —— 后者是已知未修漏洞，用 test.fails 钉住。
import { expect, test, vi } from "vitest";
import vm from "node:vm";
import { renderSwaggerHtml, SWIGGER_ENDPOINTS } from "./swaggerPage.mjs";

test("内联脚本能被 JS 引擎解析（防模板字面量换行导致的 SyntaxError）", () => {
  const html = renderSwaggerHtml();
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  expect(blocks.length).toBeGreaterThan(0);
  for (const [index, match] of blocks.entries()) {
    expect(
      () => new vm.Script(match[1], { filename: `swigger-inline-${index}.js` }),
      `内联 script #${index} 语法错误`
    ).not.toThrow();
  }
});

test("页面是完整 HTML 文档且自带 highlight.js", () => {
  const html = renderSwaggerHtml();
  expect(html).toMatch(/^<!DOCTYPE html>/i);
  expect(html).toContain("</html>");
  // /swigger 的交互（JSON 树折叠/复制）依赖 highlight.js 高亮
  expect(html).toContain("highlight");
});

// 端点/示例数会随功能增长；这里钉住的是「文档与实际同步」这一事实，具体数字见
// swaggerPage.mjs 的 ENDPOINTS。真正的漂移防护在 routeCoverage.test.mjs
// （已注册路由 vs 已文档化端点），本条只防手滑漏改。
test("端点数与示例总数符合文档记载（81 端点 / 106 示例）", () => {
  expect(SWIGGER_ENDPOINTS).toHaveLength(81);
  const exampleTotal = SWIGGER_ENDPOINTS.reduce(
    (sum, endpoint) => sum + (endpoint.examples?.length ?? 0),
    0
  );
  expect(exampleTotal).toBe(106);
  // 每个端点都必须有示例：swigger.examples.test.mjs 靠它逐条真实调用
  for (const endpoint of SWIGGER_ENDPOINTS) {
    expect(endpoint.examples?.length ?? 0, `${endpoint.method} ${endpoint.path} 没有示例`).toBeGreaterThan(0);
  }
});

// ---------------------------------------------------------------------------
// 以下四条针对 renderSwaggerHtml 的**数据流**行为（前三条静态断言只碰 HTML 骨架，
// 从不读 ENDPOINTS，也从不带非默认 apiPrefix 求值过模块）。
// ---------------------------------------------------------------------------

// 卡片上渲染出来的路径：<span class="path">…</span>
const cardPathsOf = (html) => [...html.matchAll(/<span class="path">([^<]*)<\/span>/g)].map((m) => m[1]);
// 整页里闭合 </script> 标签的个数。真实页面固定为 2（highlight.js 的外链标签 + 内联脚本），
// 内联 JSON 里每多一个未转义的 </script> 都会让这个数上涨 —— 它就是本组断言的探针。
const closeScriptCount = (html) => (html.match(/<\/script>/g) || []).length;

// 前端 onclick 形如 sendRequest(this, ENDPOINTS[7])，_idx 是它与数组下标对齐的锚点。
// 若注入被删或改坏，onclick 就会指向别的端点，而页面不会报任何错 —— 只能靠数据比对发现。
test("每条端点记录都被赋了唯一的 _idx（Set 长度与端点数相等）", () => {
  renderSwaggerHtml(); // _idx 在 renderSwaggerHtml 内部注入，必须先调一次

  const withIdx = SWIGGER_ENDPOINTS.filter((ep) => typeof ep._idx === "number");
  expect(withIdx).toHaveLength(SWIGGER_ENDPOINTS.length);

  const uniqueIdx = new Set(SWIGGER_ENDPOINTS.map((ep) => ep._idx));
  expect(uniqueIdx.size, "_idx 有重复值").toBe(SWIGGER_ENDPOINTS.length);

  // 唯一还不够：必须是 0..n-1 的稠密下标，否则 onclick 的 ENDPOINTS[idx] 取不到本卡片
  expect([...uniqueIdx].sort((a, b) => a - b)).toEqual(SWIGGER_ENDPOINTS.map((_, i) => i));

  // 注入的值要与 onclick 里引用的下标一致（两处都读 ep._idx，改一处就该红）
  const html = renderSwaggerHtml();
  for (const ep of SWIGGER_ENDPOINTS) {
    expect(html, `${ep.method} ${ep.path} 的 onclick 未引用其 _idx=${ep._idx}`)
      .toContain(`ENDPOINTS[${ep._idx}]`);
  }
});

// 幂等：这页是纯函数式渲染（无时间戳/随机数/自增 id），同一份 ENDPOINTS 两次渲染必须逐字相同。
// 若哪天有人往模板里塞 Date.now()/随机 key，这里会红。
//
// 注意首调有一处**已知**的历史差异：内联 JSON 在 _idx 注入之前就 stringify 了，
// 故第一次渲染的 ENDPOINTS 字面量里没有 _idx，第二次起才有（详见下一条的说明）。
// 本条从第 2 次起比较，把那条历史差异排除在契约之外 —— 它不是「不确定性」，
// 而是首调与后续调之间一次性收敛的差异，收敛之后必须稳定。
test("重复调用幂等：同一份 endpoints 连调两次，产出 HTML 逐字相同", () => {
  const warmup = renderSwaggerHtml(); // 收敛 _idx 注入，见上方注释
  const second = renderSwaggerHtml();
  const third = renderSwaggerHtml();
  // 长度不等时先报长度，避免下面 toBe 打出半兆字节的巨型 diff
  expect(second.length, "两次渲染的 HTML 长度不同").toBe(third.length);
  expect(second, "第 2 次与第 3 次渲染的 HTML 不是逐字相同").toBe(third);

  // 排除「warmup 短得离谱」这类输入错误导致的假绿
  expect(warmup.length).toBeGreaterThan(1000);
});

// 端点表里的 path 以 /webgrp 为基；模块求值时按 config 的 apiPrefix 整体替换该前缀。
// 重写发生在**模块顶层**（import 时一次性完成），不是 renderSwaggerHtml 内部，
// 所以要测非默认前缀只能改环境变量 + 重新求值模块。
//
// 值得守的原因：apiPrefix 来自 platform.config.json / 环境变量，改了它而重写没跟上，
// 页面会照常渲染（无异常、无报错），只是每张卡片上的路径全部指错 —— 一份
// 「看起来完全正常」的错文档，比页面直接崩掉危险得多。
test("非默认 apiPrefix 下 ep.path 被重写成该前缀", async () => {
  const CUSTOM = "/gw-api";
  const previous = process.env.GRAPH_MODEL_API_PREFIX;
  process.env.GRAPH_MODEL_API_PREFIX = CUSTOM;
  vi.resetModules(); // 让 config.mjs 重新求值，读到新的 env
  try {
    const mod = await import("./swaggerPage.mjs");
    const html = mod.renderSwaggerHtml();
    const paths = cardPathsOf(html);

    expect(paths.length, "重写后卡片数应与端点数一致").toBe(mod.SWIGGER_ENDPOINTS.length);
    // 全部端点都要带上自定义前缀：Set 比较，避免只改了一部分也判绿
    const prefixes = new Set(paths.map((p) => "/" + p.split("/")[1]));
    expect([...prefixes], `并非所有 path 都被重写到 ${CUSTOM}`).toEqual([CUSTOM]);
    // 且旧的 /webgrp 基址必须彻底不出现（漏改的端点会以 /webgrp 开头混进来）
    expect(paths.filter((p) => p.startsWith("/webgrp")).length, "仍有端点残留 /webgrp 基址").toBe(0);

    // 内联 JSON（前端真正拿去 buildUrl 的那份）也必须是重写后的路径，
    // 否则卡片显示对了、实际请求却打到旧基址
    expect(html).toContain(`"path":"${CUSTOM}/images"`);
    expect(html).not.toContain('"path":"/webgrp');
  } finally {
    if (previous === undefined) delete process.env.GRAPH_MODEL_API_PREFIX;
    else process.env.GRAPH_MODEL_API_PREFIX = previous;
    vi.resetModules();
  }
});

// 真实注入面：内联 <script> 里的 ENDPOINTS 由 JSON.stringify(ENDPOINTS) 直接拼出，
// 而 JSON.stringify **不转义 `/`**（`JSON.stringify("</script>") === '"</script>"'`，已实测）。
// 于是任一端点字段里出现 </script>，都会提前闭合 script 标签，其后内容被浏览器当 HTML
// 解析 —— 端点 desc 里的 <img onerror=…> 就活了。
//
// 卡片区走 escapeHtml（&lt;/script&gt;）所以是安全的；**只有内联 JSON 这一处是裸的**。
// escapeJs 看着像该干这件事的函数，但它是死代码（仓内无调用点），且只处理 \ 与 "，
// 就算接上也照样放过 </script> —— 别被它的名字骗了。
//
// ⚠ 本条用 test.fails：**当前生产代码确有此漏洞**，断言是真的红。写 test 而不是
// 删掉断言，是因为它记录了「这里应该转义」这个契约，且在修复的那一刻会**翻红**
// （test.fails 的语义是「期望失败」；一旦断言通过，vitest 报 "expected to fail but
// passed"），强制把 test.fails 改回 test。修法：在拼进模板前把内联 JSON 里的
// `</` 换成 `<\/`（JSON 里 `\/` 与 `/` 等价，parse 回来仍是原字符串，前端无感）。
//
// 当前可达性：ENDPOINTS 全是源码里的字面量，没有用户输入通道，所以这不是可被远程
// 触发的漏洞，而是「任何人往 desc/query desc 里写一段带 </script> 的说明文字，
// 整页就白了」的维护地雷 —— 与本文件开头记的那个换行坑同一类。
test.fails("内联 JSON 不含裸 </script>：端点字段里的该序列已被转义（当前未修，修好后把 test.fails 改回 test）", () => {
  const baseline = closeScriptCount(renderSwaggerHtml());
  // 基线恒为 2（highlight.js 外链标签 + 内联脚本）。写死它而不只做前后对比：
  // 若渲染结构变了导致基线漂移，对比式断言仍会绿，这里会红。
  expect(baseline, "未注入探针时 </script> 闭合标签数应恒为 2").toBe(2);

  // 探针：desc 与 label 两条路都试（两者都经 JSON.stringify 进内联脚本）
  const probe = {
    scope: "space",
    group: "注入探针",
    method: "GET",
    path: "/webgrp/__xss-probe",
    desc: "</script><img src=x onerror=alert(1)>",
    response: "{ok:true}",
    examples: [{ label: "</script> 探针", params: {} }]
  };
  SWIGGER_ENDPOINTS.push(probe);
  let html;
  try {
    html = renderSwaggerHtml();
  } finally {
    const at = SWIGGER_ENDPOINTS.lastIndexOf(probe);
    if (at !== -1) SWIGGER_ENDPOINTS.splice(at, 1);
  }
  expect(SWIGGER_ENDPOINTS.length, "探针端点未被清理").toBe(81);

  // ① 核心断言：注入 </script> 不应让闭合标签数超过基线。
  //    对「转义成 <\/script>」与「转义成 <」两种实现都成立，不锁死修法。
  expect(closeScriptCount(html), "内联 JSON 里出现了未转义的 </script>").toBe(baseline);
  // ② 直接点破攻击载荷：裸的 </script><img（能提前闭合标签的那一段）必须不在页面里
  expect(html).not.toContain("</script><img");
  // ③ 探针内容确实进了页面（转义 ≠ 丢弃）。
  //    刻意**不**断言 "onerror=alert(1)>" 之类的载荷原文不存在：修法只把 `</` 换成 `<\/`，
  //    其余字符原样留在 JS 字符串字面量里（那才是安全的形态），断言它消失会让本条
  //    在修好后依然红 —— 那就成了「阻止修复」的假守卫，比没有守卫更糟。
  expect(html, "探针内容疑似被整段丢弃而非转义").toContain("<img src=x");
});

// ---------------------------------------------------------------------------
// 以下三条覆盖 renderCard 的**兜底分支**：method / scope / 参数说明 / 示例 / 响应 /
// 端点描述缺失或非法时的渲染结果。
//
// 为什么值得守（可证的形状事实，不是猜测）：ENDPOINTS 里 81 条记录全是「完整形状」——
// method ∈ {GET,POST,PUT,DELETE}、scope ∈ {space,session,global,host}、每个 pathParams/
// query 条目都带 desc、examples 都是非空数组、81 条都有 response 与 desc。实测输出：
// noDesc=0 noResp=0 noScope=0 noExamples=0 pathParamsNoDesc=[] queryNoDesc=[]。
// 于是下面这些兜底臂在既有断言下**一次都没被求值**，而它们恰恰是「有人往端点表里加了一条
// 字段不全的记录」时会立刻显形的分支：漏写 desc 会把字面量 `undefined` 印到页面上，
// 漏写 response 会多出一块空的响应区。页面不会报错，只会印出一份看着挺正常的怪文档。
//
// 覆盖手法与上面那条 test.fails 相同：renderCard 未导出，只能把形状异常的探针端点临时挂到
// 端点表尾部，让 renderSwaggerHtml 真渲染一遍，再按 path 切出那张卡片。
// ---------------------------------------------------------------------------

const CARD_OPEN = '<div class="card">';

// 按 path 定位探针卡片。探针都挂在端点表尾部，故其卡片位于文档末尾若干张之中。
const cardByPath = (html, path) => {
  const chunks = html.split(CARD_OPEN);
  const at = chunks.findIndex((chunk) => chunk.includes(`<span class="path">${path}</span>`));
  // 0 号分块是首张卡片之前的那一坨（页首/head/CSS），故命中下标必 > 0
  expect(at, `未找到探针 ${path} 的卡片`).toBeGreaterThan(0);
  // 末张卡片的分块会连着组尾 </section> 与整段内联 <script>（脚本里同样有 <pre>、
  // escapeHtmlJs 等字样）。切到 </section> 为止，否则断言会落在页面脚本上。
  const cut = at === chunks.length - 1 ? chunks[at].indexOf("</section>") : -1;
  return cut === -1 ? chunks[at] : chunks[at].slice(0, cut);
};

// 临时挂探针 → 渲染一次 → 无论成败都摘干净。
// 必须摘干净：同文件的其它用例断言端点数恒为 81、示例恒为 106，漏一条就会把它们一起搞红。
const renderCardsOf = (probes) => {
  SWIGGER_ENDPOINTS.push(...probes);
  let html;
  try {
    html = renderSwaggerHtml();
  } finally {
    for (const probe of probes) {
      const at = SWIGGER_ENDPOINTS.lastIndexOf(probe);
      if (at !== -1) SWIGGER_ENDPOINTS.splice(at, 1);
    }
  }
  expect(SWIGGER_ENDPOINTS.length, "探针端点未被清理").toBe(81);
  return new Map(probes.map((probe) => [probe.path, cardByPath(html, probe.path)]));
};

// ① L815 `METHOD_COLORS[ep.method] || "#888"`
// ② L817 `SCOPE_COLORS[ep.scope] || "#888"` + `SCOPE_LABELS[ep.scope] || ep.scope`
// ③ L818 `SCOPE_TITLES[ep.scope] || ""`
test("未知 method / 未知 scope 走兜底：颜色回落 #888、标题留空、标签回落 scope 原值", () => {
  const oddMethod = { scope: "space", group: "探针", method: "PATCH", path: "/webgrp/probe-odd-method", desc: "未知方法", response: "{ok:1}", examples: [{ label: "e1", params: {} }] };
  const oddScope = { scope: "weird-scope", group: "探针", method: "GET", path: "/webgrp/probe-odd-scope", desc: "未知 scope", response: "{ok:1}", examples: [{ label: "e1", params: {} }] };
  const knownScope = { scope: "host", group: "探针", method: "GET", path: "/webgrp/probe-known-scope", desc: "已知 scope", response: "{ok:1}", examples: [{ label: "e1", params: {} }] };
  const cards = renderCardsOf([oddMethod, oddScope, knownScope]);

  // 对照组先行：已知 method / scope 必须命中查表值。只断兜底值没有鉴别力 ——
  // 整张颜色表被误写成常量 #888 时，上面那些断言照样全绿。
  expect(cards.get(knownScope.path)).toContain('<span class="method" style="background:#61affe">GET</span>');
  expect(cards.get(knownScope.path)).toContain('<span class="scope" style="background:#f59e0b" title="本机端点：操作本机文件系统，与空间无关">本机</span>');

  // PATCH 不在 METHOD_COLORS 里 → 回落 "#888"（硬编码一个删了兜底的变异会变成 background:undefined）
  expect(cards.get(oddMethod.path)).toContain('<span class="method" style="background:#888">PATCH</span>');
  // scope 三张表全未命中 → 颜色 #888、title 空串、标签用 scope 原值，三者合成一条断言：
  // 改其中任一兜底（817 换颜色 / 818 换标题 / 标签回落）都会红
  expect(cards.get(oddScope.path)).toContain('<span class="scope" style="background:#888" title="">weird-scope</span>');
});

// ④ L820 `escapeHtml(p.desc || "")`  ⑤ L823 `escapeHtml(q.desc || ""))`
// ⑥ L855 `escapeHtml(ep.desc || "")`
test("参数说明 / 端点描述缺 desc 时渲染空单元格与空描述（不吐 undefined），有 desc 时照写并转义", () => {
  // desc **键不存在**，而不是 desc: "" —— 两者都能走到 || 右臂，但缺键才是「没写说明」
  // 这个真实形状；写 desc:"" 的夹具看着像「写了说明」，更容易骗过人。
  const params = {
    scope: "space", group: "探针", method: "GET", path: "/webgrp/probe-params",
    pathParams: [{ name: "folderId" }, { name: "described", desc: "有说明" }],
    query: [{ name: "flag" }, { name: "described", desc: "有说明" }],
    examples: [{ label: "e1", params: {} }]
  };
  const escaped = { scope: "space", group: "探针", method: "GET", path: "/webgrp/probe-escaped-desc", desc: '<b>A&B"c"</b>', examples: [{ label: "e1", params: {} }] };
  const cards = renderCardsOf([params, escaped]);

  // ④⑤ 缺 desc 的两行：说明列留空（`|| ""` 生效）。删掉 `|| ""` 会渲染出 undefined。
  expect(cards.get(params.path)).toContain('<tr><td class="param-name">{folderId}</td><td>path</td><td></td></tr>');
  expect(cards.get(params.path)).toContain('<tr><td class="param-name">flag</td><td>query</td><td></td></tr>');
  // 对照：同一张表里带 desc 的两行必须照写 —— 证明断言不是「说明列一律为空」
  expect(cards.get(params.path)).toContain('<tr><td class="param-name">{described}</td><td>path</td><td>有说明</td></tr>');
  expect(cards.get(params.path)).toContain('<tr><td class="param-name">described</td><td>query</td><td>有说明</td></tr>');

  // ⑥ 端点自身没写 desc（params 探针就没有）→ 描述 span 为空
  expect(cards.get(params.path)).toContain('<span class="desc"></span>');
  // 对照：desc 非空时既照写又过 escapeHtml —— 后者证明兜底没被写成「一律清空」
  expect(cards.get(escaped.path)).toContain('<span class="desc">&lt;b&gt;A&amp;B&quot;c&quot;&lt;/b&gt;</span>');
});

// ⑦ L841 `Array.isArray(ep.examples) ? ep.examples : []`  ⑧ L844 `examples.length ? … : ""`
// ⑨ L848 `ep.response ? … : ""`
test("examples 为 null / 空数组 / 缺键时不出示例下拉，缺 response 时不渲染响应块", () => {
  const nullExamples = { scope: "space", group: "探针", method: "GET", path: "/webgrp/probe-null-examples", desc: "d", response: "{ok:1}", examples: null };
  const emptyExamples = { scope: "space", group: "探针", method: "GET", path: "/webgrp/probe-empty-examples", desc: "d", response: "{ok:1}", examples: [] };
  const bare = { scope: "space", group: "探针", method: "GET", path: "/webgrp/probe-bare" };
  const withExamples = { scope: "space", group: "探针", method: "GET", path: "/webgrp/probe-with-examples", desc: "d", examples: [{ label: "示例一", params: {} }] };
  const cards = renderCardsOf([nullExamples, emptyExamples, bare, withExamples]);

  // 三种「没有示例」的形状都不出下拉，但走的是不同分支：examples:null 与缺键走 841 右臂
  // （注意 §6.13：这里判别输入是「非数组 / 键不存在」，写 examples:[] 只会走左臂），
  // 而 examples:[] 走 841 左臂、被 842 的 length 判假走 844 的空串侧。三个都断，否则
  // 只断一个形状时，841 与 844 谁坏掉都发现不了。
  for (const probe of [nullExamples, emptyExamples, bare]) {
    expect(cards.get(probe.path), `${probe.path} 不该渲染示例下拉`).not.toContain("<select");
  }
  // 对照：有 examples 时下拉与 option 都在 —— 否则上面三条「没有 <select」恒真。
  // option 文本用「示例一」而不是随手写的 label，也便于下面 L841 换值变异被看见。
  expect(cards.get(withExamples.path)).toContain("<select");
  expect(cards.get(withExamples.path)).toContain('<option value="0">示例一</option>');

  // ⑨ bare 连 response 键都没有 → 整块响应区不渲染；对照（nullExamples 有 response）必须渲染。
  // 断言落在「field-label 响应」这个标记上：把 ep.response 判反的变异会让它出现在 bare 上。
  expect(cards.get(bare.path), "缺 response 时不该有响应块").not.toContain('<div class="field-label">响应</div>');
  expect(cards.get(nullExamples.path), "有 response 时响应块必须渲染").toContain('<div class="field-label">响应</div>');
});

// 守卫的检测逻辑自测：证明上面那个 closeScriptCount 探针真的能红，
// 而不是恰好恒等于基线。喂它两段已知文本，与 swaggerPage.mjs 无关。
test("闭合标签计数器自测：未转义序列会推高计数", () => {
  expect(closeScriptCount("<script>a</script>")).toBe(1);
  // 正是本组要防的那种输入
  expect(closeScriptCount("<script>const A=[{}];const B=\"</script><img src=x>\";</script>")).toBe(2);
  // 已转义的写法不推高计数（否则断言会误报）
  expect(closeScriptCount("<script>const A=\"<\\/script>\";</script>")).toBe(1);
});
