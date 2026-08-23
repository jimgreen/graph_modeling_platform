# T12 model-device-library.test.ts 审查报告

## 概览
- 文件：src/model-device-library.test.ts ｜ 4197 行 ｜ 发现总数：7（P0:0 / P1:1 / P2:2 / P3:4）
- 审查方式：结构 grep（describe/test/await/test.each 分布）+ 头中尾三段精读抽样
- 总体评价：测试质量高——语义化断言、循环参数化带失败消息（如 :456 `${template.kind}.${key}`）、全部同步纯函数无 flaky 风险、业务行为驱动命名。主要问题是结构性而非正确性。

## P0 严重

（无）

## P1 重要

### [P1] 450 行巨型 import 墙——model.ts 上帝模块的直接证据
- 位置: src/model-device-library.test.ts:1-450
- 类型: 抽象层次
- 描述: 文件前 450 行从 model.ts 导入 300+ 个符号（几何、路由、拓扑、存储、E 文件、模板归一化等所有领域），单一 import 块占据全文 10%。任何 model.ts 导出签名变更都在此产生编译涟漪；同时证明 model.ts 承载了至少 8 个不相干职责域。
- 建议: 与 A1/T03 报告的 model.ts 拆分计划联动——按领域拆出 deviceParams/routing/topology/eexport 等模块后，本文件的 import 自然按需收敛。

## P2 一般

### [P2] `DEVICE_LIBRARY.find(...)!` 非空断言模式重复数十次
- 位置: src/model-device-library.test.ts:484,509,525,539,998,1900,1924 等（全文件约 40+ 处）
- 类型: 脆弱实现
- 描述: `DEVICE_LIBRARY.find((item) => item.kind === "xxx")!` 模板查找 + 非空断言遍布全文。模板 kind 重命名时，失败表现为后续属性访问的 `Cannot read properties of undefined`，指向 find 的下一行而非真正的根因（kind 不存在）。
- 建议: 提取文件级 helper：`const getTemplate = (kind: string) => { const t = DEVICE_LIBRARY.find(i => i.kind === kind); if (!t) throw new Error(\`template not found: ${kind}\`); return t; }`，全文替换后失败信息直接指明缺失的 kind。

### [P2] describe 内 test 缩进混乱
- 位置: src/model-device-library.test.ts:451（缩进 2 空格）vs :461,:483,:501 等（顶格无缩进）
- 类型: 风格
- 描述: 同一个 `describe("deviceLibrary")` 块内，部分 test 缩进正常、大部分顶格书写，格式不一致干扰结构阅读（IDE 折叠时层级错乱）。
- 建议: 统一缩进（prettier/eslint 一遍格式化即可），并考虑在 CI 加 format check。

## P3 轻微

### [P3] 单文件 4197 行，应按主题拆分
- 位置: 全文
- 类型: 简化
- 描述: 设备库定义、端子归一化、容器关联、静态图元、E 文件映射等至少 5 个主题混在一个测试文件，单文件运行时间长且定位慢。
- 建议: 按 describe 边界拆为 model-device-library.{definitions,terminals,containers,static,efile}.test.ts。

### [P3] renderToStaticMarkup/createElement 导入的使用面窄
- 位置: src/model-device-library.test.ts:3-4
- 类型: 死代码（疑似）
- 描述: react-dom/server 渲染工具被导入用于 Glyph 快照类断言，但抽样区域未见密集使用；若仅在个别用例使用，值得下沉到该用例所在的小节并局部 import。
- 建议: grep 确认使用次数；≤3 处则改为局部动态 import。

### [P3] 未使用 test.each，循环参数化全部手写 for-of
- 位置: src/model-device-library.test.ts:452,508,524,762,1923 等
- 类型: 风格
- 描述: 用 `for (const x of [...]) { expect(...) }` 替代 vitest 的 `test.each`。功能等价且已有失败消息弥补定位，但 test.each 能让每个参数独立报告通过/失败，一处失败不遮蔽其余。
- 建议: 高价值场景（多 kind 参数化）逐步迁移到 test.each；低价值保持现状。

### [P3] 个别超长 test 承载多个关注点
- 位置: src/model-device-library.test.ts:538-600 区间、:2604-2660 等
- 类型: 简化
- 描述: 部分 test 同时断言 merge 行为 + 默认值 + 端子标签等多层结果，失败时需要读完整用例才能定位是哪层回归。
- 建议: 拆分为按关注点命名的多个小 test，或至少用 describe 分组注释分段。

---
统计：P0:0 | P1:1 | P2:2 | P3:4 = 7 项
