// 分析快照 DOM 层级深度与冗余 wrapper
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "电力能源系统图上建模平台.html");
let src = fs.readFileSync(file, "utf8");

// 只取 body 内容（8594行那段单行DOM）
const bodyMatch = src.match(/<body[^>]*>([\s\S]*?)<\/body>/);
const body = bodyMatch ? bodyMatch[1] : src;

// 粗解析：提取所有开标签 + class
const openTagRe = /<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?(?<!\/)>/g;
const selfCloseRe = /<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?\/>/g;

let m;
const tagCount = {};
const classCount = {};
const allTags = [];
let idx = 0;
const re = /<([a-zA-Z][a-zA-Z0-9]*)((?:\s[^>]*?)?)(\/?)>/g;
while ((m = re.exec(body))) {
  const tag = m[1].toLowerCase();
  const attrs = m[2] || "";
  const selfClose = m[3];
  allTags.push({ tag, attrs, selfClose });
  tagCount[tag] = (tagCount[tag] || 0) + 1;
  const cm = attrs.match(/class="([^"]*)"/);
  if (cm) {
    const cls = cm[1].trim();
    classCount[cls] = (classCount[cls] || 0) + 1;
  }
}

console.log("=== 总开标签数 ===", allTags.length);
console.log("=== 标签 top ===");
Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>console.log(`  ${v}\t${k}`));

// 模拟栈算最大深度 + 找单子节点wrapper
function isVoid(t){return ["meta","link","br","hr","img","input","path","circle","rect","line","polyline","polygon","ellipse","use","stop","title","source","col","area","base","embed","param","track","wbr"].includes(t);}
const stack = [];
let maxDepth = 0;
const depthAt = [];
const wrapperChains = []; // 连续单子div链
for (const t of allTags) {
  // 先弹出到栈顶匹配（粗略，不计void）
  if (isVoid(t.tag) || t.selfClose) {
    continue; // void不计入栈
  }
  // 这里简单push，无法准确弹（缺闭合信息）。改用另一种统计：
}
// 改用深度估计：靠缩进? DOM是单行无缩进。放弃精确深度，转而统计结构性冗余。

// 找连续的 div>div>div 链模式（文本里）
const wrapperChainRe = /<div[^>]*><div[^>]*><div[^>]*>/g;
const chains = body.match(wrapperChainRe) || [];
console.log("=== div>div>div 三层连续链数 ===", chains.length);

// 找只有单属性class且无文本的div（潜在冗余wrapper）
const emptyDivRe = /<div\s+class="([^"]*)"\s*>\s*<\/div>/g;
const empty = body.match(emptyDivRe) || [];
console.log("=== 空div数 ===", empty.length);
empty.slice(0,10).forEach(e=>console.log("  ", e));

// svg 内 g 嵌套
const gChainRe = /<g[^>]*><g[^>]*><g[^>]*>/g;
const gchains = body.match(gChainRe) || [];
console.log("=== svg g>g>g 三层链 ===", gchains.length);

console.log("=== class top 20 ===");
Object.entries(classCount).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([k,v])=>console.log(`  ${v}\t"${k}"`));
