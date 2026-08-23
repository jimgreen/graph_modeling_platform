# J 补审报告：apiInternal.test.mjs + globalLineApi.test.mjs

> 补充说明：初轮分组时这两个文件被遗漏（分组规划失误）。本报告为补审结果，总报告已同步更新。
> 审查日期：2026-08-23 ｜ 方法与格式同其余分段报告

## 概览

| 文件 | 行数 | 发现数 |
|------|------|--------|
| server/apiInternal.test.mjs | 496 | 5 |
| server/globalLineApi.test.mjs | 249 | 4 |
| **合计** | **745** | **9（P0:0 / P1:1 / P2:4 / P3:4）** |

## P0 严重

（无）

## P1 重要

### [P1] apiInternal 与 globalLineApi 共享"设 env + 动态 import server.mjs"模式，隔离性依赖 vitest 默认 isolate
- 位置: server/apiInternal.test.mjs:18-24, :26-30；server/globalLineApi.test.mjs:42-50
- 类型: 错误处理 / 测试基建
- 描述: 两文件均在 beforeAll 中设置 `process.env.GRAPH_MODEL_DATA_DIR` 后动态 import server.mjs，且 afterAll 都不清理 env。当前 vitest 无独立配置文件、走默认 `isolate: true`（每测试文件独立模块注册表）所以安全；但若未来合并 worker（`isolate: false` 或调整 pool），server.mjs 的模块级 dataRoot 会取第一次 import 时的 tmpdir，第二个文件的 env 设置失效——而第一个文件的 afterAll 已删除其 tmpdir，导致后续断言在已删除目录上运行，产生难以排查的偶发失败。
- 建议: 在两个文件的 afterAll 中清理 env（`delete process.env.GRAPH_MODEL_DATA_DIR`）；并在注释中显式声明"依赖 vitest isolate 隔离模块缓存"。更彻底的做法是让 createImageServer 接受 dataRoot 参数而非读 env，从根上去掉动态 import 时序依赖。

## P2 一般

### [P2] device-library 断言块整段重复两次
- 位置: server/apiInternal.test.mjs:434-457（save 响应断言）vs :461-484（get 响应断言）
- 类型: 重复
- 描述: eDeviceDefinitionLabels/ClassExportEnabled/FieldOrder/TemplateFields/TableIds 五段 toEqual 在保存响应和读取响应上逐字重复，共 ~48 行。任何字段变更需改两处。
- 建议: 提取 `expectDeviceLibraryShape(json)` 辅助函数，两处调用。

### [P2] 每 test 起停完整 server 实例
- 位置: server/apiInternal.test.mjs:32-41（约 15 个 test）；globalLineApi.test.mjs:52-59（4 个 test）
- 类型: 效率
- 描述: beforeEach 为每个用例起一个真实 HTTP server（port 0）、afterEach 关闭。隔离性极佳但单文件累计起停近 20 次，拖慢整体测试时长。
- 建议: 权衡方案——对只读用例组使用 describe 级 beforeAll 共享实例 + 数据用唯一前缀隔离；或接受现状并注明这是有意选择。

### [P2] fetchJson 吞网络层错误为空对象
- 位置: server/globalLineApi.test.mjs:34（`.catch(() => ({}))`）
- 类型: 错误处理
- 描述: fetch 本身失败（连接拒绝、server 未就绪）时 payload 变 `{}`，后续断言报 `Cannot read properties of undefined` 类错误，掩盖"server 没起来"这一真因。apiInternal 版本保留了 text 原文，诊断性更好。
- 建议: catch 时记录原始错误：`.catch((err) => ({ __fetchError: String(err) }))` 并在断言失败信息中输出。

### [P2] measurement-config 迁移用例的输入数据偏大、断言偏窄
- 位置: server/apiInternal.test.mjs:357-396
- 类型: 简化
- 描述: 构造了 3 个 deviceProfiles + 完整 measurementType 定义（40 行输入）验证 soc 迁移，但仅断言 items 的 measurementTypeId 投影，未覆盖迁移后 type 对象其余字段的保持性。与 A2 报告中 normalizeMeasurementConfig 用例同型问题。
- 建议: 最小化输入或补充对迁移后字段完整性的断言。

## P3 轻微

### [P3] PNG_1X1 测试常量第三次重复定义
- 位置: server/apiInternal.test.mjs:51（另见 swaggerPage.mjs:13 及 B 组测试）
- 类型: 重复
- 描述: 同一 base64 常量在项目内至少 3 处定义。
- 建议: 收入 server/test-utils.mjs（与 B/D 报告中的 mock 工具提取一并处理）。

### [P3] env 设置后未清理
- 位置: server/apiInternal.test.mjs:20-21; server/globalLineApi.test.mjs:44
- 类型: 风格
- 描述: 见 P1 条目——默认 isolate 下无害，属防御性修复。
- 建议: afterAll 中 delete process.env.GRAPH_MODEL_DATA_DIR。

### [P3] boundaryLine helper 的 endpoint 参数分支可读性
- 位置: server/globalLineApi.test.mjs:12-30
- 类型: 风格
- 描述: `_routableLineSourceNodeId`/`TargetNodeId` 与 terminalId 的赋值用三元嵌套表达 source/target 互换，首次阅读需停顿推演。
- 建议: 先算 `const isSource = boundaryEndpoint === "source"`，再用普通 if 展开两组赋值。

### [P3] globalLineApi 测试缺少 update 名称冲突路径
- 位置: server/globalLineApi.test.mjs 全文
- 类型: 效率
- 描述: 覆盖了 attach/detach/delete-empty/sync-project/name-params 独占等主链路，但未测 `PUT /record` 重命名为已有名称时的 409 分支（assertUniqueName 冲突路径仅有 attach 场景隐式覆盖）。
- 建议: 补一条重名 PUT → 409 用例。

---
统计：P0:0 | P1:1 | P2:4 | P3:4 = 9 项
