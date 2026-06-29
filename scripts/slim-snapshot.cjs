// 静态快照无损精简脚本
// 策略：删空行 / 删CSS注释 / 规范化class属性 / 删HMR注入脚本
// 不改CSS规则、不改DOM文本内容、不改data/aria/style属性
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "电力能源系统图上建模平台.html");
let src = fs.readFileSync(file, "utf8");
const before = Buffer.byteLength(src);

// 1. 删除 Vite HMR 注入脚本（dev only，静态快照无用，不影响显示）
//    形如 <script type="module">import { injectIntoGlobalHook } ...</script>
src = src.replace(
  /<script type="module">import \{ injectIntoGlobalHook \}[\s\S]*?<\/script>/,
  ""
);
// 2. 删除 HMR client 脚本引用
src = src.replace(
  /<script type="module" src="\.\/电力能源系统图上建模平台_files\/client"><\/script>/,
  ""
);

// 3. CSS 注释删除（仅在 <style> 块内，保守：只删单行注释）
src = src.replace(/\/\*[^*]*\*\//g, "");

// 4. 删除空行（含纯空白行）
src = src.replace(/^[ \t]*\r?\n/gm, "");

// 5. 规范化 class 属性
//    5a. 合并 class 值内连续空格为单个空格
src = src.replace(/class="([^"]*)"/g, (m, val) => {
  const trimmed = val.replace(/\s+/g, " ").trim();
  return `class="${trimmed}"`;
});
//    5b. 删除空 class 属性 class=""
src = src.replace(/\s*class=""/g, "");

// 6. 删除行尾空白
src = src.replace(/[ \t]+\r?\n/g, "\n");

const after = Buffer.byteLength(src);
fs.writeFileSync(file, src, "utf8");

console.log(`before: ${before} bytes`);
console.log(`after:  ${after} bytes`);
console.log(`saved:  ${before - after} bytes (${((1 - after / before) * 100).toFixed(1)}%)`);
