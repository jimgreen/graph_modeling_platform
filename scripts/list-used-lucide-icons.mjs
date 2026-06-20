import * as lucide from "lucide-react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// 列出 src/ 里真正引用到的 lucide 图标（按标识符整词匹配，偏向"宁多勿漏"以保证正确性）。
// 排除 appStaticScope.ts（即将改写它）和测试文件。
const iconNames = Object.keys(lucide).filter((name) => /^[A-Z][A-Za-z0-9]*$/.test(name));

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry) && !full.includes("appStaticScope")) {
      files.push(full);
    }
  }
}
walk("src");

const source = files.map((file) => readFileSync(file, "utf-8")).join("\n");
const tokens = new Set(source.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? []);
const used = iconNames.filter((name) => tokens.has(name)).sort();

console.log(`lucide PascalCase exports: ${iconNames.length}`);
console.log(`used in src: ${used.length}`);
console.log("---USED-LIST-START---");
console.log(used.join(","));
console.log("---USED-LIST-END---");
