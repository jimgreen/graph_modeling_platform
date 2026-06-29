// 深度DOM层级分析：精确深度、冗余wrapper、SVG嵌套、可合并节点
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "电力能源系统图上建模平台.html");
let src = fs.readFileSync(file, "utf8");
const body = src.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];

const voidTags = new Set(["meta","link","br","hr","img","input","path","circle","rect","line","polyline","polygon","ellipse","use","stop","title","source","col","area","base","embed","param","track","wbr"]);

// 精确token解析（开标签/闭合标签/文本）
const tokenRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s[^>]*?)?)(\/?)>|([^<]+)/g;
const stack = [];
let maxDepth = 0;
let maxDepthPath = [];
const depthHist = {};
const singleChildWrappers = []; // {tag, class, depth, childTag}
let m;
const nodeSamples = {};

// 第一遍：建树统计深度
function parseAttrs(attrs){
  const o={};
  const re=/(\S+?)="([^"]*)"/g;let mm;
  while((mm=re.exec(attrs)))o[mm[1]]=mm[2];
  return o;
}

const rootChildren = [];
const allNodes = [];
while((m=tokenRe.exec(body))){
  if(m[5]!==undefined){ continue; } // text
  const closing = m[1]==="/";
  const tag = m[2].toLowerCase();
  const attrs = parseAttrs(m[3]||"");
  const selfClose = m[4]==="/" || voidTags.has(tag);
  if(closing){
    const top = stack.pop();
    // 检测单子节点wrapper：该节点只有1个元素子节点
    if(top && top.children.length===1 && top.tag!=="svg" && top.tag!=="g"){
      const child = top.children[0];
      // 只关注div/span/g做wrapper的情况
      if(["div","span","g","section"].includes(top.tag)){
        singleChildWrappers.push({
          tag: top.tag, cls: top.cls||"", depth: top.depth,
          childTag: child.tag, childCls: child.cls||""
        });
      }
    }
    continue;
  }
  const depth = stack.length;
  const node = { tag, cls: attrs.class||"", attrs, depth, children: [], selfClose };
  if(stack.length) stack[stack.length-1].children.push(node);
  else rootChildren.push(node);
  allNodes.push(node);
  if(depth>maxDepth){ maxDepth=depth; maxDepthPath = stack.map(s=>`${s.tag}.${s.cls}`.replace(/\.$/,"")); }
  depthHist[depth]=(depthHist[depth]||0)+1;
  if(!selfClose) stack.push(node);
}

console.log("=== 最大DOM深度 ===", maxDepth);
console.log("=== 深度分布 ===");
Object.keys(depthHist).sort((a,b)=>+a-+b).forEach(d=>console.log(`  depth ${d}: ${depthHist[d]} nodes`));

console.log("\n=== 最深路径(maxDepthPath) ===");
maxDepthPath.forEach((p,i)=>console.log(`  ${" ".repeat(i)}${p}`));

console.log("\n=== 单子节点wrapper（潜在可扁平化）top 25 ===");
const wrapCount = {};
singleChildWrappers.forEach(w=>{
  const k=`${w.tag}.${w.cls||"*"} > ${w.childTag}.${w.childCls||"*"}`;
  wrapCount[k]=(wrapCount[k]||0)+1;
});
Object.entries(wrapCount).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([k,v])=>console.log(`  ${v}\t${k}`));

// SVG g 嵌套深度统计
console.log("\n=== SVG <g> 嵌套分析 ===");
function countG(node, gdepth=0, stats={}){
  if(node.tag==="g"){
    stats[gdepth]=(stats[gdepth]||0)+1;
    gdepth++;
  }
  node.children.forEach(c=>countG(c,gdepth,stats));
  return stats;
}
const gstats={};
allNodes.filter(n=>n.tag==="svg").forEach(svg=>countG(svg,0,gstats));
console.log("  g嵌套层级分布:", gstats);

// 每个svg的子节点数
const svgChildCounts = allNodes.filter(n=>n.tag==="svg").map(s=>s.children.length);
console.log(`  svg总数 ${svgChildCounts.length}, 平均子节点 ${(svgChildCounts.reduce((a,b)=>a+b,0)/svgChildCounts.length).toFixed(1)}`);

// path 总数 + 按d内容去重（重复图标）
const pathD = [];
function collectPath(node){
  if(node.tag==="path"){ pathD.push(node.attrs.d||""); }
  node.children.forEach(collectPath);
}
allNodes.forEach(collectPath);
const uniq = new Set(pathD);
console.log(`\n=== path 去重 === 总${pathD.length} 唯一${uniq.size} 重复${pathD.length-uniq.size}`);
const dupMap={};
pathD.forEach(d=>{const k=d.slice(0,40);dupMap[k]=(dupMap[k]||0)+1;});
console.log("  重复最多的path前缀top5:");
Object.entries(dupMap).filter(([,v])=>v>1).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([k,v])=>console.log(`    ${v}\t${k}...`));

// 空元素统计
console.log("\n=== 空元素（无子节点无文本）===");
const emptyCount={};
function findEmpty(node){
  if(node.selfClose) return;
  if(node.children.length===0){
    // 检查是否有文本
    const k=`${node.tag}.${node.cls||"*"}`;
    emptyCount[k]=(emptyCount[k]||0)+1;
  }
  node.children.forEach(findEmpty);
}
allNodes.forEach(findEmpty);
Object.entries(emptyCount).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>console.log(`  ${v}\t${k}`));
