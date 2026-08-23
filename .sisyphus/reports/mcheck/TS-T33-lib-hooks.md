# T33 lib + hooks 审查报告

## 概览
- 文件数：10（src/lib IndexedDB 三源 + 四测试、src/hooks 三件）
- 总行数约 2400 ｜ 发现总数：6（P0:0 / P1:0 / P2:2 / P3:4）
- 审查方式：lib 三源全文精读 + hooks 头部/结构精读 + 反模式 grep；四个 lib 测试文件为结构级抽查
- 总体评价：本组是前端代码质量的高地。IndexedDB 层有幂等 upgrade、Blob 分离存储、双写迁移+回滚设计；useBatchEditors 使用显式类型化参数接口（UseBatchEditorsParams）而非 scope 解构；useGlobalLines 的 fetchJson 错误处理规范（response.json().catch + fallback 消息）。

## P0 严重

（无）

## P1 重要

（无）

## P2 一般

### [P2] deviceLibraryDB 的 Schema 类型声明为 any
- 位置: src/lib/deviceLibraryDB.ts:19 (`type DeviceLibraryDBSchema = any`)
- 类型: 类型安全
- 描述: idb 库的 DBSchema 泛型被整体置为 any，注释解释了原因（避免复杂类型推断）。代价是所有 store/index 操作失去编译期校验——objectStore 名拼错（如 "templateImage" 少个 s）要到运行时才暴露。
- 建议: 按 idb 文档补全 DBSchema 接口（templates/templateImages/graphTemplates/overrides 四个 store 的 key/value/index 声明约 40 行），一次性收益。

### [P2] useBatchEditors.tsx 名为 hook 实为工厂
- 位置: src/hooks/useBatchEditors.tsx:46 起（UseBatchEditorsParams → 返回构建器集合；grep 确认全文无 useEffect/useCallback/useMemo）
- 类型: 风格 / 抽象层次
- 描述: 文件名与 use* 前缀暗示 React Hook，实际是不调用任何 Hook 的纯构建器工厂（不受 Hook 规则约束）。命名误导会让维护者误加 Hook 或误按 Hook 规则重构。
- 建议: 更名 buildBatchEditors / createBatchEditors 并移出 hooks/ 目录；或注释显式声明"非 Hook，勿在组件内调用"。

## P3 轻微

### [P3] 迁移读取 localStorage 的裸 catch 静默返空
- 位置: src/lib/deviceLibraryMigration.ts:33-35,45-47,57-59
- 类型: 错误处理
- 描述: JSON 损坏/配额异常一律静默返回空集合，迁移会以"0 条迁移成功"收尾且 errors 数组为空，用户无从得知原数据其实还在但没迁走。
- 建议: catch 中区分解析错误并入 MigrationResult.errors（至少 console.warn），空字符串与损坏数据分开处理。

### [P3] dataUrlToBlob 逐字节循环可用 atob+fetch 替代
- 位置: src/lib/deviceLibraryMigration.ts:79-88
- 类型: 效率
- 描述: charCodeAt 循环对大图（数百 KB base64）较慢。现代浏览器可 `await (await fetch(dataUrl)).blob()` 一行完成。
- 建议: 若需保持同步签名则保留；否则改 fetch().blob()。

### [P3] useGlobalLines 以 Record<string, any> 读 scope
- 位置: src/hooks/useGlobalLines.tsx:64-72（schemePathFromScope/modelReferenceFromScope）
- 类型: 抽象层次
- 描述: 与 appExtracted 同款宽松边界（读取 activeSchemeKey/savedSchemePathForId 等 ~8 个字段），拼写错误无法编译期发现。好于 scope 全解构，但仍弱于显式接口。
- 建议: 定义最小 ScopeShape 接口（仅声明的字段）。

### [P3] lib 测试文件未覆盖 quota 超限路径
- 位置: src/lib/deviceLibraryStorage.test.ts（结构抽查结论）
- 类型: 效率
- 描述: IndexedDB 写入失败（QuotaExceededError）路径未见专门用例；保存大图片 Blob 时是最现实的故障模式。
- 建议: 用 fake-indexeddb 注入抛错场景补一条保存失败 → 用户可见错误的用例。

---
统计：P0:0 | P1:0 | P2:2 | P3:4 = 6 项
