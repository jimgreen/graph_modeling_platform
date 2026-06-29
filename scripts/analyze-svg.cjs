// SVG构成分析：lucide图标 / 画布节点 / minimap / 其他
const fs=require("fs"),path=require("path");
const f=path.join(__dirname,"..","电力能源系统图上建模平台.html");
const src=fs.readFileSync(f,"utf8");
const body=src.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];

// 精确token解析建树
const voidTags=new Set(["meta","link","br","hr","img","input","path","circle","rect","line","polyline","polygon","ellipse","use","stop","title","source","col","area","base","embed","param","track","wbr"]);
const tokenRe=/<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s[^>]*?)?)(\/?)>|([^<]+)/g;
const stack=[];const root=[];let m;
function parseAttrs(a){const o={};const re=/(\S+?)="([^"]*)"/g;let mm;while((mm=re.exec(a)))o[mm[1]]=mm[2];return o;}
while((m=tokenRe.exec(body))){
  if(m[5]!==undefined)continue;
  const closing=m[1]==="/";const tag=m[2].toLowerCase();const attrs=parseAttrs(m[3]||"");const selfClose=m[4]==="/"||voidTags.has(tag);
  if(closing){stack.pop();continue;}
  const node={tag,attrs,children:[]};
  if(stack.length)stack[stack.length-1].children.push(node);else root.push(node);
  if(!selfClose)stack.push(node);
}

// 遍历找所有svg根，按class分类
function findSvg(node,out){
  if(node.tag==="svg")out.push(node);
  node.children.forEach(c=>findSvg(c,out));
}
const svgs=[];root.forEach(n=>findSvg(n,svgs));

const byKind={lucide:0,minimap:0,canvas:0,other:0};
const byKindNodes={lucide:0,minimap:0,canvas:0,other:0};
function countNodes(node){let n=1;node.children.forEach(c=>n+=countNodes(c));return n;}

svgs.forEach(svg=>{
  const cls=svg.attrs.class||"";
  let kind="other";
  if(cls.includes("lucide"))kind="lucide";
  else if(cls.includes("minimap"))kind="minimap";
  else if(cls.includes("diagram-canvas"))kind="canvas";
  byKind[kind]++;byKindNodes[kind]+=countNodes(svg);
});
console.log("=== SVG分类 ===");
Object.keys(byKind).forEach(k=>console.log(`  ${k}: ${byKind[k]}个svg, ${byKindNodes[k]}节点`));

// 画布svg内部构成
const canvasSvg=svgs.find(s=>(s.attrs.class||"").includes("diagram-canvas"));
if(canvasSvg){
  const tagCnt={};
  (function cnt(n){tagCnt[n.tag]=(tagCnt[n.tag]||0)+1;n.children.forEach(cnt);})(canvasSvg);
  console.log("\n=== 画布svg内部标签 ===");
  Object.entries(tagCnt).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${v}\t${k}`));
}

// lucide svg的path数
const lucideSvgs=svgs.filter(s=>(s.attrs.class||"").includes("lucide"));
const lucidePaths=new Set();
lucideSvgs.forEach(s=>{(function p(n){if(n.tag==="path"&&n.attrs.d)lucidePaths.add(n.attrs.d);n.children.forEach(p);})(s);});
console.log(`\n=== lucide: ${lucideSvgs.length}个svg, 唯一path ${lucidePaths.size} ===`);

// diagram-node 构成
console.log("\n=== diagram-node g 子结构 ===");
function findG(node,out,cls){if(node.tag==="g"&&(node.attrs.class||"").includes(cls))out.push(node);node.children.forEach(c=>findG(c,out,cls));}
const dnodes=[];root.forEach(n=>findG(n,dnodes,"diagram-node"));
dnodes.forEach((d,i)=>{if(i<3){const t={};(function c(n){t[n.tag]=(t[n.tag]||0)+1;n.children.forEach(c);})(d);console.log(`  node${i}:`,JSON.stringify(t));}});
