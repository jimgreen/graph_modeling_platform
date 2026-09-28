// SVG 数值格式化（跨端共享单源）。
//
// 此前**三处**各有一份，且语义**已经漂移**：
//   src/svgUtils.ts                     5 位小数，非有限值原样输出（NaN → "NaN"）★本版已修
//   server/server.mjs                   5 位小数，非有限值归 0            ← 本版原型
//   scripts/generate-docer-...icons.mjs 4 位小数（toFixed(4)）            ← 刻意保留
//
// scripts 那份**刻意不并入**：它是离线一次性工具（产出 data/icon-library/ 下上千个
// 图标文件，每次运行先 rm -rf 全量重建），与运行时无关、单源化对它零收益；而改精度
// 会改变那些文件的字节，属有副作用的修改。4 位 vs 5 位差 1e-4 像素，对图标视觉无影响，
// 不是缺陷。取舍理由也写在该脚本的函数注释里。
//
// ## 为什么取 server 那一版
//
// `NaN` / `Infinity` / `undefined` 原样输出会生成 `x="NaN"` 这种**无效 SVG 属性** ——
// 浏览器会**静默忽略**它，于是该元素的坐标/尺寸回落到默认值（通常是 0），图元跑到
// 原点或尺寸塌成 0，而导出与渲染流程**全程不报错**。
//
// `server/server.mjs` 早已把非有限值归 0，说明项目内部对此已有共识，只是没同步到
// 前端那份 —— 这正是「多处实现各自演化」的典型代价。
//
// ## 对齐是零行为变化的
//
// 已穷举验证（百万级随机浮点 + 全部舍入边界 + 字符串数值 + 整型边界）：
// **对每一个有限值，两版逐字节相同**。差异只出现在非有限值上，而那些值此前产出的
// 本就是无效 SVG。故本次改动不改变任何有效输出。
//
// 同目录的 `xmlEscape.mjs` / `regexEscape.mjs` 是另两类共享（XML 实体、正则元字符），
// 三者不要混用。
/** 格式化为 SVG 数值：最多 5 位小数、非有限值归 0、负零归零。 */
export function formatSvgNumber(value) {
  const numeric = Number(value);
  const rounded = Math.round((Number.isFinite(numeric) ? numeric : 0) * 100000) / 100000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}
