// 定位空span/small来源：在快照中找上下文
const fs=require("fs"),path=require("path");
const f=path.join(__dirname,"..","电力能源系统图上建模平台.html");
const src=fs.readFileSync(f,"utf8");
const body=src.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];

// 找空span及其class + 前后文
const re=/<span\s+class="([^"]*)"\s*>\s*<\/span>/g;
const cnt={};let m;
while((m=re.exec(body))){const c=m[1].trim();cnt[c]=(cnt[c]||0)+1;}
console.log("=== 空span class分布 ===");
Object.entries(cnt).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${v}\t${k}`));

// 空small
const re2=/<small\s+class="([^"]*)"\s*>\s*<\/small>/g;
const cnt2={};
while((m=re2.exec(body))){const c=m[1].trim();cnt2[c]=(cnt2[c]||0)+1;}
console.log("\n=== 空small class分布 ===");
Object.entries(cnt2).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${v}\t${k}`));

// 空 button
const re3=/<button\s+class="([^"]*)"\s*>\s*<\/button>/g;
const cnt3={};
while((m=re3.exec(body))){const c=m[1].trim();cnt3[c]=(cnt3[c]||0)+1;}
console.log("\n=== 空button class分布 ===");
Object.entries(cnt3).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${v}\t${k}`));
