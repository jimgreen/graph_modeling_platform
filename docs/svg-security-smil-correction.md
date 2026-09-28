docs: 记录 SVG 安全判定的一次重要更正 —— SMIL 修复非可利用漏洞

## 结论更正

此前 `e24b2a4f`（"修 SMIL 改写 href 的存储型 XSS"）与 `2091539a`（"补两个绕过"）
宣称修复了可利用漏洞。**该结论被真实浏览器实测推翻**：

```
<animate attributeName="href" to="#animated" dur="1s" begin="0s"/>
  → a.href.baseVal  = "#original"
  → a.href.animVal  = "#original"   ← 不是 "#animated"
  → getAttribute("href") = "#original"
```

SMIL 动画元素确实在 DOM 里、也确实会运行（`animate attributeName="fill"` 实测能改
`getComputedStyle` 的呈现值），但**改写 href 这条不生效** —— 点击后仍导航到原值。
两次独立实测一致。

## 处置

**保留修复，但不再宣称它修了可利用漏洞。** 理由：
1. 误伤面已逐条钉住（8 类正常动画不受影响），保留成本极低；
2. 属**防御纵深** —— 若将来浏览器实现了 SMIL 对 href 的动画支持，防线已在位；
3. 导入侧 `svgModelImportSmil.test.ts` 同构补了一道（数据层准入），同样零误伤。

**改动历史**：`34cedb83` 在 `svgSanitizeSmil.test.ts` 文件头写入更正段落，把
「故可利用」改为「实测推翻」，并记录三条机理。

## 方法论固化（本轮最值得记的）

**安全判定必须区分两个不同问题**：
- 「探针测出净化器没处理某向量」 —— 这是**净化器**的问题
- 「浏览器会不会执行该向量」 —— 这是**可利用性**的问题

两者不等价。本轮之前我把前者直接当成后者，得出了错误的「可利用」结论。

**遇到无法在 Node 环境实测的浏览器行为时，用 `browser.evaluate` 在真实浏览器里测**，
不要停在「无法判定」，也不要凭规范推测下结论 —— 推测在本轮已被实测证伪一次。

实测已覆盖并固定的边界（`svgSanitizeControlCharNames.test.ts`）：
控制字符插在属性名/标签名里（浏览器转 U+FFFD 或拆成两个属性）、
NUL 插在 href 值里（值变 `java<U+FFFD>script:`）、多重实体编码（只解一次）、
CSS `url(javascript:)` / `@import` / `expression()`、`xml:base`（现代浏览器已移除支持）。

## 保留的内联 id 作用域隔离测试

`svgInlineIdScoping.test.ts`（`0e5e45a1` 引入）是
`collectInlineSvgIds` / `inlineSvgScopedIdPrefix` / `scopeInlineSvgIdReferences`
三个私有函数的唯一直接覆盖。它防的 bug 静默且极难从代码看出：多图并置时若两个 SVG
都有 `id="grad"`，浏览器会解析成同一元素，A 图的渐变被 B 图同名定义抢走（串色）。
