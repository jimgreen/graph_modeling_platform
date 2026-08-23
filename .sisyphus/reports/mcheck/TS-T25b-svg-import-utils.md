# T25b svgModelImport + svgUtils 审查报告

## 概览

| 指标 | 值 |
|------|-----|
| 文件数 | 4 |
| 总行数 | 2531 |
| 发现总数 | 12 |
| P0 严重 | 2 |
| P1 重要 | 4 |
| P2 一般 | 3 |
| P3 轻微 | 3 |

---

## P0 严重

### [P0-1] stripUnsafeInlineSvgMarkup 无法防御 entity-encoded XSS

- 位置: `src/svgUtils.ts`:175-181
- 类型: 安全
- 描述: 该函数使用正则匹配 `javascript:` 字面量来过滤危险 href，但 SVG data URL 中的内容若经过 XML entity 编码（如 `&#106;avascript:alert(1)` 或 `&#x6A;avascript:`），正则不会匹配。当 `inlineSvgRootMarkup` 将这些 markup 通过 dangerouslySetInnerHTML 插入 DOM 时，HTML 解析器会解码 entity，最终产生可执行的 `javascript:` URI。此外，该函数仅过滤 `javascript:` 而遗漏了 `vbscript:`、`data:text/html` 等危险 scheme，与 `svgModelImport.ts` 的 `EXECUTABLE_STYLE_PATTERN`（含 vbscript/expression/@import）标准不一致。
- 建议: 在 `stripUnsafeInlineSvgMarkup` 中增加 entity 解码预处理步骤（先解码 `&#NNN;`、`&#xHH;` 等实体），再执行正则过滤；或将过滤逻辑统一为调用 `safeUrl()` 白名单检查，而非黑名单正则。同时补充 `vbscript:` 等非 `javascript:` 危险 scheme 的匹配。

### [P0-2] sanitizeDocument 与 stripUnsafeInlineSvgMarkup 安全标准不一致导致导入-渲染路径差异

- 位置: `src/svgModelImport.ts`:207-268 vs `src/svgUtils.ts`:175-181
- 类型: 安全
- 描述: `sanitizeDocument`（导入路径）通过 DOM 遍历 + `safeUrl()` 白名单过滤 URL scheme，覆盖 javascript/vbscript/data 等；而 `stripUnsafeInlineSvgMarkup`（渲染路径）仅用正则过滤 `javascript:` 字面量。一个已导入的 SVG 如果含有 `vbscript:` href 或 entity-encoded `javascript:` href，导入时可能被保留（`safeUrl` 中 `vbscript:` 会被 schema 正则 `^[a-z][a-z0-9+.-]*:` 拦截——这点实际安全），但渲染路径的 `stripUnsafeInlineSvgMarkup` 对 `<style>` 无条件删除（line 178）却对 `<script>` 只匹配闭合标签形式（`<script>...</script>`），若存在 `<script/>` 自闭合变体或 `<script src=...>` 无 body 形式，正则 `/<script\b[\s\S]*?<\/script>/giu` 不会匹配，`<script>` 标签将保留在渲染输出中。
- 建议: 统一两条路径的安全策略。`stripUnsafeInlineSvgMarkup` 应增加对无 body 的 `<script.../>` 和 `<script...></script>` 的匹配，或直接删除所有 `<script` 开头的标签（含未闭合情况）。

---

## P1 重要

### [P1-1] escapeXml 不转义单引号，在单引号属性上下文中可导致 XSS

- 位置: `src/svgUtils.ts`:42-48
- 类型: 安全
- 描述: `escapeXml` 仅转义 `&`、`<`、`>`、`"`，不转义 `'`。当前所有调用点恰好都使用双引号属性包裹，因此暂无直接漏洞。但该函数是 export 的公共 API，消费方若用于单引号属性上下文（如 `attr='...'`），攻击者可通过注入单引号突破属性边界。XML 规范中 `'` 在属性值内有特殊含义，完整的 XML 转义应包含它。
- 建议: 增加 `.replace(/'/g, "&apos;")`。同时建议在函数注释中标注转义适用范围。

### [P1-2] imageArrayBufferToDataUrl spread-call 存在大缓冲区栈溢出风险

- 位置: `src/svgUtils.ts`:73-81
- 类型: 性能
- 描述: `String.fromCharCode(...bytes.subarray(index, index + chunkSize))` 将最多 0x8000 (32768) 个字节展开为函数参数。虽然多数现代引擎的参数上限约 65536，但部分旧版浏览器和嵌入式 JS 引擎上限更低（如 WebKit 历史上约 32768），恰好踩线。如果用户上传大尺寸图片并触发此函数，可能直接抛出 `RangeError: Maximum call stack size exceeded`，导致导入流程崩溃。
- 建议: 将 chunkSize 降至 0x4000 (16384) 或更小，或改用 `Array.from(bytes, b => String.fromCharCode(b)).join("")` 分块构建，避免 spread 展开。

### [P1-3] decodeSvgDataUrl 与 decodeSvgImageSource 功能高度重复

- 位置: `src/svgModelImport.ts`:162-182 vs `src/svgUtils.ts`:100-122
- 类型: 重复
- 描述: 两个函数均实现 SVG data URL 解码（支持 base64 和 percent-encoded），但实现细节不同：`decodeSvgDataUrl` 使用更严格的正则（匹配 charset/encoding 子类型），返回 `null` 表示失败；`decodeSvgImageSource` 容忍更宽格式，返回空字符串表示失败。两套解码逻辑增加了维护成本和不一致风险。
- 建议: 将 `decodeSvgDataUrl` 重构为调用 `decodeSvgImageSource`（或反之），保留一个统一入口，另一函数作为 thin wrapper。

### [P1-4] renderSvgElementMarkup 允许任意字符串 HTML 标签名

- 位置: `src/svgUtils.ts`:335-351
- 类型: 安全
- 描述: `typeof value.type !== "string"` 只过滤了非字符串类型（组件函数/class），但允许任何字符串标签名通过，包括 `script`、`iframe`、`object` 等危险 HTML 元素。虽然该函数消费的是应用内部构建的 React 元素树，但如果有任何路径允许用户控制的 SVG 内容被解析为 React 元素并传入此函数，将产生 XSS。
- 建议: 增加标签白名单（只允许 SVG 标准标签如 `svg`、`g`、`rect`、`circle`、`path`、`text`、`image`、`defs`、`pattern`、`linearGradient`、`use`、`clipPath`、`style` 等），拒绝未知标签。

---

## P2 一般

### [P2-1] inlineSvgAutoScopeCounter 模块级可变状态影响测试隔离

- 位置: `src/svgUtils.ts`:11
- 类型: 风格
- 描述: `inlineSvgAutoScopeCounter` 是模块级 `let` 计数器，在 `inlineSvgScopedIdPrefix` 中被递增。多个测试用例共享同一模块实例时，计数器值取决于执行顺序，导致生成的 id prefix 不可预测。虽然当前测试通过 hash 而非计数器生成 prefix（仅无 clipPath 时 fallback 到计数器），但这种隐式状态仍影响测试确定性。
- 建议: 将计数器封装为函数内部闭包变量，或在测试中使用 `beforeEach` 重置机制；更好的方式是将 scope 生成改为纯函数（基于输入参数 hash，移除 auto-increment fallback）。

### [P2-2] svgUtils.test.ts 关键函数覆盖缺失

- 位置: `src/svgUtils.test.ts`
- 类型: 效率
- 描述: 测试文件仅覆盖 `svgImageContentMarkup` 和 `inlineBackendImageRefsInSvgDataUrl` 两个函数。以下导出函数无测试：`escapeXml`、`formatSvgNumber`、`svgStrokeDashArray`、`imageArrayBufferToDataUrl`、`decodeBase64Text`、`stripUnsafeInlineSvgMarkup`、`renderSvgElementMarkup`、`svgRootAttributeValue`、`svgLengthNumber`、`styleObjectToSvgAttribute`、`backendImageIdFromHref`、`isImageDataUrl`。特别是安全相关函数 `escapeXml` 和 `stripUnsafeInlineSvgMarkup` 缺少测试尤为危险。
- 建议: 补充上述函数的单元测试，优先覆盖 `escapeXml`（含单引号场景）、`stripUnsafeInlineSvgMarkup`（含 entity-encoded 和 `<script/>` 变体）、`imageArrayBufferToDataUrl`（含大缓冲区边界）。

### [P2-3] staticTextNode 使用 text.length 估算文本宽度精度不足

- 位置: `src/svgModelImport.ts`:1401
- 类型: 效率
- 描述: `Math.max(24, text.length * fontSize * 0.7)` 假设每个字符宽度为 `fontSize * 0.7`，但中文等宽字符实际宽度约为 `fontSize * 1.0`，而 ASCII 窄字符约为 `fontSize * 0.5`。混合中英文文本时，计算出的节点尺寸可能与实际渲染偏差较大，导致导入后文本溢出或留白过多。
- 建议: 使用 Canvas 2D `measureText` API（在支持环境中）计算实际文本宽度，或根据字符 Unicode 范围区分中英文分别计算。若无法获取 Canvas 上下文，至少使用 `fontSize * 0.85` 作为更安全的默认系数。

---

## P3 轻微

### [P3-1] findById 和 platformSvg 多次全树遍历，大 SVG 性能可优化

- 位置: `src/svgModelImport.ts`:119-121, 340-357
- 类型: 性能
- 描述: `findById` 每次调用都通过 `walkElements` 遍历整棵 DOM 树（O(n)）。`platformSvg` 中三次独立的 `all.some()` 调用遍历同一棵树。`parsePlatformSvg` 中 `semanticUses` 又一次全树过滤。对于数千节点的 SVG，这些重复遍历会产生可观开销。
- 建议: 在 `parsePlatformSvg` 入口处一次遍历构建索引 Map（id → element, class → elements[], device-type → elements[]），后续查找直接使用索引。

### [P3-2] parsePolylinePath 静默返回 null 缺少诊断信息

- 位置: `src/svgModelImport.ts`:1104-1176
- 类型: 错误处理
- 描述: 当 SVG path data 包含不支持的命令（C/S/Q/T/A 等曲线）时，函数静默返回 `null`，调用方无法区分"格式错误"和"包含不支持命令"。用户导入含曲线边的 SVG 时，边会被无声丢弃。
- 建议: 返回结构化结果 `{ points: Point[] | null; reason: "unsupported_command" | "parse_error" | "insufficient_points" }`，让调用方可将原因加入 warnings。

### [P3-3] svgModelImport.test.ts 安全测试仅覆盖基础场景

- 位置: `src/svgModelImport.test.ts`:34-63
- 类型: 效率
- 描述: 通用 SVG 安全导入测试仅验证了 `<script>`、`<foreignObject>`、`onclick`、`javascript:` href 四种场景。未覆盖：entity-encoded scheme（`&#106;avascript:`）、`vbscript:` URI、`expression()` CSS、`@import` CSS、嵌套 SVG data URL 中的恶意内容、`<iframe>`/`<embed>`/`<object>` 标签、data URI 内嵌 SVG 的递归深度限制。
- 建议: 补充上述边界场景的测试用例，特别是 entity-encoded XSS 变体和嵌套 data URL 递归限制（当前限制 depth >= 3）。
