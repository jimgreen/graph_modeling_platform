// CSS 块内部换行合并为单行（仅 <style> 块内，不碰 DOM/文本）
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "电力能源系统图上建模平台.html");
let src = fs.readFileSync(file, "utf8");
const before = Buffer.byteLength(src);

src = src.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (m, openTag, css, closeTag) => {
  // 规则间换行+缩进 -> 单空格
  let c = css.replace(/\r?\n[ \t]*/g, " ");
  // 多空格压缩
  c = c.replace(/  +/g, " ");
  return openTag + c + closeTag;
});

const after = Buffer.byteLength(src);
fs.writeFileSync(file, src, "utf8");
console.log(`before: ${before} bytes`);
console.log(`after:  ${after} bytes`);
console.log(`saved:  ${before - after} bytes (${((1 - after / before) * 100).toFixed(1)}%)`);
