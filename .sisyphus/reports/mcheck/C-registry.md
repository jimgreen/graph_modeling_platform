# C registry/runtime 系列审查报告

## 概览
- 审查文件数：6（globalLineRegistry.mjs/.test、runtimeRegistry.mjs/.test、runtimeWs.mjs/.test）
- 总行数约 2850
- 发现总数：14（P0:0 / P1:2 / P2:8 / P3:4）
- 总体评价：架构清晰（纯逻辑与 WS 层分离、locked 串行队列防并发、writeState 临时文件+rename 原子写、测试隔离干净），主要问题集中在数据损坏恢复路径与大数据量下的性能。

## P0 严重

（无）

## P1 重要

### [P1] registry 文件损坏时静默重建并覆盖，全局线路记录永久丢失
- 位置: server/globalLineRegistry.mjs:212-218（readState）+ :751（writeState 覆盖）
- 类型: bug / 数据丢失
- 描述: readState 对 JSON.parse 失败一律 catch 返回空 state；随后 ensureInitialized 的 writeState 会用空记录集覆盖 global-lines.json。磁盘损坏/半写/手工编辑出错都会导致全部全局线路记录被静默清空，无任何备份或告警。writeState 本身原子（tmp+rename），但只防写入中断，不防源文件已损坏。
- 建议: readState 捕获解析错误时先把坏文件改名为 `global-lines.json.corrupt-<timestamp>` 再返回空 state，并 console.error 提示；或直接抛错拒绝服务（fail-fast）交由运维处理。

### [P1] syncProject 每次调用全量扫描并解析 schemes/files 下所有项目 JSON
- 位置: server/globalLineRegistry.mjs:860（readStoredManagedProjects）+ :588-609（实现）
- 类型: 性能
- 描述: 每次保存模型（syncProject）都递归遍历整个 schemes/files 目录、逐文件 readFile+JSON.parse，且全部发生在 locked 串行队列内——阻塞其他 registry 操作。项目文件数百个时每次保存的 IO 成本线性增长。
- 建议: 为 storedProjects 建缓存（以 mtime 失效）；或仅扫描与当前 modelKey 相关的目录；或把"另一端是否仍持有该线路"的判断改为读取单个引用文件。

## P2 一般

### [P2] register 覆盖同 clientId 旧 entry 时旧 pending 不被主动拒绝
- 位置: server/runtimeRegistry.mjs:95-106（register）+ :108-121（unregister 有 reject，register 无）
- 类型: 内存 / 错误处理
- 描述: 同一 clientId 重复 register（重连竞态、恶意抢注）直接覆盖 Map 条目，旧 entry 的 pendingFetches/pendingCommands 不 reject，调用方需等满 5 秒超时才收到 FetchTimeoutError。行为最终一致但体验差，且旧 entry 引用链多存活 5 秒。
- 建议: register 前若 Map 已有该 clientId，先复用 unregister 的 reject 逻辑再覆盖。

### [P2] createPendingFetch 与 createPendingCommand 完全同构
- 位置: server/runtimeRegistry.mjs:8-31 与 :54-77
- 类型: 重复
- 描述: 两个工厂函数除 Error 类型和字段名（resource/name）外逐行相同。
- 建议: 提取 `createPending(requestId, tag, TimeoutErrorClass)`，两处调用。

### [P2] `_clients` 私有 Map 导出，WS 清扫逻辑穿透封装
- 位置: server/runtimeRegistry.mjs:256（导出）+ server/runtimeWs.mjs:118-125（sweep 依赖）
- 类型: 抽象层次
- 描述: runtimeWs 的 setInterval 清扫直接遍历 registry._clients，绕过抽象。registry 未来改内部结构（如加索引）会静默破坏 WS 层。
- 建议: registry 提供 `sweepExpired()` 方法封装清扫；删除 `_clients` 导出（测试如需可走公开 API）。

### [P2] HEARTBEAT_TIMEOUT_MS 在两处重复定义
- 位置: server/runtimeRegistry.mjs:4 与 server/runtimeWs.mjs:8
- 类型: 重复
- 描述: 同一常量 60_000 定义两次，将来只改一处会产生"查询过滤"与"清扫"阈值漂移。
- 建议: 从 runtimeRegistry export，runtimeWs import。

### [P2] recordForNode 线性查找被嵌在逐节点循环内
- 位置: server/globalLineRegistry.mjs:284-297（find）+ :700-738 / :873-958（循环内调用）
- 类型: 性能
- 描述: migrateStoredProjects 与 syncProject 对每个节点调用 recordForNode，内部两次 `records.find` → O(nodes × records)。千级线路 × 千级节点时明显变慢。
- 建议: 循环外构建 `Map<id, record>` 与 `Map<idx, record>` 索引传入。

### [P2] migrateStoredProjects 双遍读盘 + stringify 逐节点比较
- 位置: server/globalLineRegistry.mjs:666-742
- 类型: 效率
- 描述: 第一遍读全部文件只为收集 reuseOnlyRecordIds，第二遍再读一遍做迁移；`changed ||= JSON.stringify(nextNode) !== JSON.stringify(node)` 对每节点做全量序列化比较。启动/rebuild 成本高。
- 建议: 单遍合并（先解析缓存 JSON 再判断 pairMode）；changed 判断改为浅比较关键字段（params 引用与 id/idx）。

### [P2] WS register 无鉴权，任意连接可抢占任意 clientId
- 位置: server/runtimeWs.mjs:59-67
- 类型: 安全
- 描述: 任何能连上 /webgrp/ws 的进程发送 `{type:"register",clientId:"x"}` 即可顶替真实前端客户端，后续 fetch/command 会被发往冒名连接。本地单机工具风险可控，但若 host 配置为 0.0.0.0 暴露局域网则可被利用。
- 建议: register 时校验 Origin（已有 isAllowedNativeExportOrigin 同款思路）或引入一次性注册 token（server 启动时打印）。

### [P2] addReference 用 JSON.stringify 深比较判断引用未变
- 位置: server/globalLineRegistry.mjs:321
- 类型: 脆弱实现
- 描述: `JSON.stringify(existingExact) === JSON.stringify(reference)` 依赖 key 顺序稳定。当前 normalizeReference 固定构造顺序所以安全，但任何重构调整字段顺序都会让"未变化"误判为 changed，触发无谓写盘与 updatedAt 跳动。
- 建议: 显式比较三个语义字段（boundaryEndpoint/boundaryNodeId/boundaryTerminalId + modelKey/nodeId）。

## P3 轻微

### [P3] positiveInteger 非法值返回 0，语义混淆
- 位置: server/globalLineRegistry.mjs:75-78
- 类型: 风格
- 描述: 名字暗示返回正整数，实际失败返回 0 作为哨兵值，调用方到处 `idx > 0` 判断。
- 建议: 返回 undefined/NaN 并让调用方用 `?? 0` 兜底，或改名 nonNegativeInt。

### [P3] 非 /webgrp/ws 的 upgrade 直接销毁 socket
- 位置: server/runtimeWs.mjs:34-37
- 类型: 风格
- 描述: 客户端收到连接重置而非 HTTP 错误响应，排障不友好。
- 建议: 对非目标路径写回 `HTTP/1.1 404` 后再 destroy。

### [P3] 消息帧一律 String(raw) 解析
- 位置: server/runtimeWs.mjs:55
- 类型: 简化
- 描述: 二进制帧会先变乱码字符串再 JSON.parse 失败被忽略，功能正确但浪费一次转换。
- 建议: 检查 `typeof raw !== "string"`（Buffer）直接忽略。

### [P3] runtimeWs.test 的 connectClient 成功后 error→reject 残留
- 位置: server/runtimeWs.test.mjs:42
- 类型: 风格
- 描述: resolve 之后 ws error 仍会调用已 settled 的 reject（no-op），无实际危害但易误读。
- 建议: resolve 前移除 error 监听或改为收集错误数组。

---
统计：P0:0 | P1:2 | P2:8 | P3:4 = 14 项
