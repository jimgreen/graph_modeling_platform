# T30 杂项审查报告：scripts TS 基准 + 根配置 + 小组件

## 概览
- 文件数：24（scripts 基准 ×6、vite.config.ts、vite.e2e.config.ts、src 根层配置/工具/小组件 ×16）
- 总行数约 900 ｜ 发现总数：7（P0:0 / P1:0 / P2:1 / P3:6）
- 总体评价：小工具文件质量普遍很高——纯函数、防御性归一化（Set 校验 + fallback）、无障碍属性完备（WindowCloseButton）、re-export 桥干净（deviceParameterChineseNames.ts）。基准脚本方法论正确（warmup + 中位数 + 防 JIT sink + hash 行为一致性校验）。

## P0 严重

（无）

## P1 重要

（无）

## P2 一般

### [P2] 4 个基准脚本重复 median/timeIt 与 IEEE118 装载逻辑
- 位置: scripts/benchmark-bulk-route-translation.ts:113-116、benchmark-auto-spread.ts:62-65、benchmark-ieee118-routing.ts:56-69、benchmark-route-rendering.ts:54-68；IEEE118 项目加载+refCount+movedNodes 构造在 benchmark-ieee118-routing.ts:19-53 与 profile-ieee118-commit.ts:12-43 几乎逐字重复
- 类型: 重复
- 描述: median 实现四处重复；timeIt 两处重复；"读项目 → 算 bounds → 选引用最多节点 → 构造 movedNodes/affectedEdgeIds"整段逻辑两处逐字重复。统计口径若需调整（如改 P95）要同步改四处。
- 建议: 提取 scripts/lib/bench-utils.ts 导出 median/timeIt/loadIeeeScenario()。

## P3 轻微

### [P3] 基准脚本硬编码相对路径依赖 process.cwd()
- 位置: scripts/benchmark-ieee118-routing.ts:19、profile-ieee118-commit.ts:12
- 类型: 风格
- 描述: `data/schemes/files/...` 相对路径要求必须从仓库根执行；与 G 组 migrate-state-icon-images.mjs 同型问题。
- 建议: 用 import.meta.url 定位仓库根拼接。

### [P3] benchmark-ieee118-routing 循环内 nodes.some O(n²)
- 位置: scripts/benchmark-ieee118-routing.ts:45-49
- 类型: 效率
- 描述: 选 movedId 时对每个 refCount 条目执行 nodes.some 全扫。基准脚本一次性成本可接受，但与同文件已有的 id 集合风格不一致。
- 建议: 先建 `nodeIds = new Set(nodes.map(n => n.id))` 再 has 判断。

### [P3] escapeHtmlToBr 未转义引号
- 位置: src/globalMessage.ts:17-19
- 类型: 安全（低危）
- 描述: 只转义 & < > 和换行。当前所有 innerHTML 注入点均在元素内容位置（非属性上下文），风险极低；但与项目其他 escapeXml 实现的转义集不一致。
- 建议: 补 `"` → `&quot;` 保持全套转义一致。

### [P3] vite.config.ts 顶部 declare const process 手工声明
- 位置: vite.config.ts:5
- 类型: 风格
- 描述: 为规避 @types/node 而手写的窄类型声明，后续维护者可能误以为 process 只有 env 一个字段。
- 建议: 加一行注释说明意图，或直接安装 @types/node devDependency。

### [P3] test-setup.ts 用 as any 扩展 globalThis
- 位置: src/test-setup.ts:16-21
- 类型: 风格
- 描述: `(globalThis as any).showGlobalMessage` 绕过类型系统。项目约束禁止新增 as any（此为存量），且全局桩缺少类型提示。
- 建议: 增补 `declare global { interface Window { showGlobalMessage?: () => void; ... } }` 类型声明后去掉 as any。

### [P3] vite.e2e.config.ts 为空文件
- 位置: vite.e2e.config.ts (0 KB)
- 类型: 死代码（待确认）
- 描述: package.json 的 test:e2e 引用 `--config vite.e2e.config.ts`，但该文件为空。vitest 对空配置文件会回退默认行为，e2e 目前可能靠默认值运行；若 e2e 需要独立端口/环境变量则缺失配置。
- 建议: 确认 e2e 是否依赖此文件的预期内容；若确无必要，从 script 中移除 --config 参数并删除空文件。

---
统计：P0:0 | P1:0 | P2:1 | P3:6 = 7 项
