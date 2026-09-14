# SDD ledger — plan: D:/work/graph_modeling_platform/docs/superpowers/plans/2026-09-13-multi-workspace-backend.md

Spec: docs/superpowers/specs/2026-09-13-multi-workspace-design.md（v2，已提交 1c530ad7）
Branch: main（用户 2026-09-13 明确选择直接提交 main，非 worktree）
Plan commit at start: 941b10af

## Preflight conflict scan

### 跨任务（共享文件或接口）

| 对 | 产出 → 消费 | 结论 |
|----|------------|------|
| T1 → T2 | `spaceIdFromName` / `isValidSpaceId` / `isReservedSpaceId` | 一致，签名相同 |
| T1 → T2 | 生成路径的 RESERVED 校验 vs 扫描补登记的 `isReservedSpaceId` | T2 已用同一套校验，一致 |
| T2 → T4/T5/T6/T7/T8/T15 | `spacePathsFor(dataRoot, id)` → `defaultPaths` | 一致；T2 产出的字段名与各任务用到的 `paths.schemeFiles/settings/colorConfig/deviceLibrary/images/manifest/icons` 全部存在 |
| T2 → T3 | `SpaceStore.has/firstId` | T3 消费的两个方法 T2 均已产出 |
| T3 → T9/T11/T12 | `resolveSpaceFromRequest` / `parseSpaceCookie` / `SPACE_COOKIE_NAME` / `SPACE_FALLBACK_HEADER` | 一致 |
| T4 → T5/T6/T7/T8 | `options.paths ?? defaultPaths` 约定 + `defaultPaths` 导出 | 一致 |
| **T6/T7 → T5** | **四个无参 helper 改签名 → T5 纵穿渲染链** | **冲突：T5 依赖 T6/T7 的产物，但计划里 T5 排在 T6/T7 之前** |
| T8 → T9 | 导出适配层接 `ctx.paths` → 派发注入 `ctx.paths` | T8 先改签名（参数位），T9 再注入实参；顺序合理 |
| T7 → T9 | images 域接 paths → `/webgrp/images` 落对空间 | 一致 |
| T9 → T11 | `ctx.spaceId` / `ctx.paths` → 管理 4 端点 | 一致 |
| T10 → T11 | `evictRegistry(spaceRoot)` → DELETE 空间前调用 | 一致 |
| T3 → T12 | `resolveSpaceFromRequest` → `apiV1Runtime` 目标筛选 | 一致 |
| T8 → T5 | `apiV1Schemes` 删 `getSchemeDataDir` + T8 测试断言源码不含该标识 → T5 的 ZIP 走 `ctx.paths` | 一致（T5 只动 `createSchemeArchiveBuffer`，不重建推导） |
| T14 → T11 | swigger 文档 4 个新端点 → T11 的路由 | 一致 |
| T16 → T8/T10 | 清常量（T16 期望全 0）→ T8 只清已无引用的、T10 才是 `schemeDataDir` 的消灭点 | 一致：T8 的检查是"残留就留着"，T16 才硬性要求全 0 |
| T13 → T14 | CORS 允许 `x-space` → swigger 跨源说明 | 一致 |

### 单任务内部自洽

| 任务 | 自洽性检查 | 结论 |
|------|-----------|------|
| T1 | 测试 9 例 vs 实现（中文/冲突/保留名/截断/emoji/非法） | 一致 |
| T2 | 13 例 vs 实现；`assertInSpace` 特判 default 与 §1 映射一致 | 一致 |
| T3 | 6 例 vs 实现；`unknown` 标记 + 显式/隐式区分与 §10 一致 | 一致 |
| T4 | 测试用 `readSchemes({paths})` vs 实现改 11 个函数 | 一致 |
| **T5** | **测试 vs 实现：测试要拆守卫，实现的 Step 3 依赖 T6/T7** | **见上，靠重排解决** |
| T6 | 3 例 vs 6 个函数；照抄的 code block 覆写 `defaultFilesRoot` 变量名与 T5 有交叉 | 一致（T5 负责其用途变更） |
| T7 | 2 例 vs 10 个函数 | 一致 |
| T8 | 2 例（含源码断言）vs 6 个文件改动 | 一致 |
| **T9** | **测试：`x-space: "张三"` 但 beforeAll 未建该空间 → 实现里"显式未知 → 400"，测试会红** | **冲突，见下** |
| **T9** | **断言 `res.headers.get("x-space-unknown")` 恒为 undefined —— 该头从不产生，等于没断言** | **冲突，见下** |
| T10 | 2 例 vs 缓存实现 + `evictRegistry` | 一致；已含"registry 未暴露 locked"的具体退路 |
| T11 | 7 例 vs 4 端点；DELETE 守卫与 pinned 语义一致 | 一致（初稿绕的三元已改直白） |
| T12 | 3 例 vs 3 个改动文件 | 一致 |
| T13 | 1 例 vs CORS 头 | 一致 |
| T14 | scope 分类 vs §8.1；`/exports/native/*` 不入列表（会弹 GUI 挂测试） | 一致 |
| **T15** | **`全局线路按空间隔离` 断言两空间均为 0 —— 两空相等，未证明隔离** | **冲突，见下** |
| T16 | 常量全 0 期望 vs T8/T10 分工 | 一致 |

### Rulings

- **Ruling: 执行顺序改为 T1,T2,T3,T4,T6,T7,T5,T8,T9,T10,T11,T12,T13,T14,T15,T16** — T5 依赖 T6/T7 的四个 helper 签名；在它们之前拆 ZIP 守卫会真的产出混合 ZIP（json 来自根 A、e/svg 来自根 B）。计划 T5 Step 3 已自标此依赖，本次提升为硬约束并写入计划文本 — 代价若错：无，反序会直接产出错误 ZIP。
- **Ruling: T9 测试的 beforeAll 补建「张三」空间** — 计划的实现里显式来源指向未知空间返回 400，而 T9 测试用 `x-space: 张三` 却没建它，原样执行必红。已在计划文本中补 `createSpaceStore` + `create("张三")` — 代价若错：无，这是修计划自身的矛盾。
- **Ruling: T9 那条 `x-space-unknown` 断言改为断言 `error.code !== "SPACE_UNKNOWN"`** — 原断言查一个从不存在的响应头，恒真，等于没断言（评审 rubric 视为缺陷）。已改 — 代价若错：无，新断言真能区分"被空间解析拦"与"进入本机 handler"。
- **Ruling: T4 插入的 `defaultPaths` 必须 `export`（并明确 import 放顶部 import 块）** — T4/T5/T6/T7/T8 五个测试文件都从 `server.mjs` 解构 `defaultPaths`，但计划原代码块只写了 `const defaultPaths = …`。漏 export 时 `{...undefined}` 展开成空对象，`paths.schemes` 全 undefined，测试会以难以归因的方式失败（而非干脆的 import 报错）。同时明确 `spacePathsFor` 的 import 加在文件顶部既有 import 块、`export const defaultPaths` 紧跟 `dataRoot` 声明 —— 放到文件中部虽合法但违project 风格。无循环依赖：`spaceStore.mjs` 只 import `spaceId.mjs` 与 `node:*` — 代价若错：无。
 - **Ruling（T2 评审 Important 3 的下半）：T9 与 T10 的测试必须把自建的 store 注入 `createImageServer({ ..., spaceStore })`** — 评审核实出计划自身会造出同进程两个注册表实例（测试建一个、服务端 `injectedSpaceStore ?? createSpaceStore(dataRoot)` 再建一个），二者共享 `spaces.json`。即便 tmp 名唯一，两个实例仍各持整份快照，后写者会用陈旧快照回滚对方的条目。`createImageServer` 签名本就有注入参数，故从调用侧根治，**不改 `createImageServer` 逻辑**。tmp 后缀改用 `randomUUID()` 归 T2 修复范围 — 代价若错：注入点若在实现时被误当作可选而不生效，T9/T10 仍会双写；已在这两个测试里写明中文注释说明注入理由。
- **Ruling: 把「扩展 `sendError` 支持可选 code 参数」从 T11 前移到 T9** — T9 的测试断言 `body.error.code === "SPACE_UNKNOWN"`，但现有 `sendError(response, status, message)` 产出的是 `{error: message}`（字符串，`server.mjs:1538`），而原计划把扩展写在 T11 —— T9 排在 T11 之前，测试必红。改法：T9 内扩展 `sendError`（带 code 用 `{error:{code,message}}`，不带则保持既有字符串形态，不破坏任何现有调用方），T11 改为引用；同时 T3 的解析器在 unknown 分支补 `unknownValue` 字段，供 400 消息说明是哪个 id 被拒。**不在派发层复用 `sendV1Error`**：空间校验发生在「还不知道落到 exact/动态/v1 哪个分支」之前，用 v1 专用出口会把信封强加给非 v1 端点 — 代价若错：`sendError` 是 `/webgrp/*` 内部域的错误出口，改形状会波及所有调用方；已用「带 code 才改形状」把波及面限死为 0。

## Progress

执行顺序（依 Ruling 1）：T1, T2, T3, T4, T6, T7, T5, T8, T9, T10, T11, T12, T13, T14, T15, T16
全部 16 份 brief 已生成于本目录。
BASE before T1: 2d08ba4c

Task 1: complete (commits 2d08ba4c..5e5f1732, review clean — Spec ✅ / Approved)
Task 1: minor (deferred): `spaceId.test.mjs:28-32` `isReservedSpaceId` 只有 `con` 一条正向断言，`prn/aux/nul/com1-9/lpt1-9` 分支与 `$` 锚点全无覆盖 —— 正则丢锚点或删分支后 9 个用例仍全绿。建议补：`isReservedSpaceId("con-2")===false`、`("NUL")===true`、`prn/aux/com1/lpt9` 各一条正向。
Task 1: minor (deferred): 缺跨函数不变式 `isValidSpaceId(spaceIdFromName(name))===true`（含 41 字/全符号/`con`）。这是下游每个 `mkdir(spaceRoot)` 都依赖的契约。
Task 1: minor (deferred): `spaceId.mjs:19` 截断发生在首尾 `-` 剥除之后，可重新引入尾随连字符（`"a"*39 + " b"` → `"a"*39 + "-"`），同族名字折叠成同一 id。结果仍合法、冲突由 taken 兜底，仅观感。修法：截断后补 `.replace(/-+$/g, "")`。
Task 1: note — 评审提示的下游约束「收外部目录名进注册表须**同时**调 `isValidSpaceId` + `isReservedSpaceId`」在计划 T2 的 `scanWorkspaces` 已满足（两个谓词都调），无需改动。

Task 2: fix round 1/5 (3 Important + 1 Minor addressed, 0 open; commits 08f269ff..164a1b28)
Task 2: complete (commits 69480f7e..164a1b28, review clean — Spec ✅ / Needs fixes → 修复后复审全闭环)
Task 2: minor (deferred): 修复 diff 新增 —— `spaceStore.test.mjs:73` 的 `\\?\` 前缀是纯 Windows 构造，POSIX 上会变成相对路径，建不出 `nul` 且 `:81` 断言静默退化为恒真。本仓库无 `.github/workflows/`、测试与模块（`assertInSpace` 用 `path.sep`）都是 Windows 语义，当前不构成故障；若将来加 Linux CI 需按平台分支。
Task 2: minor (deferred): `spaceStore.test.mjs:122` 用 `readdirSync(trashRoot)[0]` 假定单一时间戳目录；当前每例独立 tmpdir 且只删一次，成立，同例多次 `remove` 时会取错。
Task 2: minor (deferred): `spaceStore.mjs:106` 的 `console.warn` 直接打 stdout，后端暂无统一日志级别机制。
Task 2: minor (deferred): `spaceStore.mjs:221-230` `touchLastAccess` 每次全量落盘，若被前端按请求频率调用会成为写热点。
Task 2: minor (deferred): `spaceStore.mjs:70-77` tmp 文件在 `rename` 失败时不会被清理（既有实现，非本轮引入）。
Task 2: 残留风险（已声明）—— Minor 4（`ensureInitialized` 入队）**修复已落地但无可证伪覆盖**：实现者试写的并发用例在任何变异下都不打红（`load()` 缓存 state + `create` 多一次真实 mkdir I/O，交错总让 create 后落），主动删除而非留恒真断言。复审复核该推演一致，确认删对了。确定性覆盖需 fs 注入缝，超出本任务范围。
Task 2: 残留风险 —— `writeState` 只把 tmp 名唯一化，跨**进程**（两个 node 进程同 dataRoot）仍可能读到彼此半写的注册表；本轮只覆盖同进程场景。
Task 2: note — 实现方做了变异测试（逐条删被守护子句确认只有目标用例转红），并把 `\\?\` 的 `nul` 目录构造用探针在 vitest worker 同环境验证过；复审独立复现了前置条件。

BASE before T3: caa9dbed

Task 3: complete (commits caa9dbed..a946d7ea, review clean — Spec ✅ / Approved；无 Critical/Important，未触发修复循环)
Task 3: minor (deferred): `unknownValue` 无任何断言 —— `spaceStore.test.mjs:188-198` 用 `toMatchObject`，不校验额外字段；删掉 `spaceStore.mjs:265` 的 `unknownValue: value` 20 个用例仍全绿。修法（评审建议）：补在 handler 层（T10/T11）断言 `error.message` 含被拒 id，而非在本任务加自证式断言 —— **已据此修改计划 T9 的 400 用例**（断言 `body.error.message` 含 "没了"）。
Task 3: minor (deferred): `SPACE_FALLBACK_HEADER`（`spaceStore.mjs:235`）全仓零引用（含测试 import 行），改错值不会有测试变红，而它是跨进程线上协议常量。修法：加一行 `expect(SPACE_FALLBACK_HEADER).toBe("X-Space-Fallback")`（非自证式：常量被误改会真变红）。
Task 3: minor (deferred): `parseSpaceCookie` 的解码失败分支（`spaceStore.mjs:245-247`，裸 `%` 回退原串）无用例，是纯死代码。修法：`expect(parseSpaceCookie(`${SPACE_COOKIE_NAME}=%E4%B8`)).toBe("%E4%B8")`。
Task 3: minor (deferred): 「头未知但 query 合法」这一决策点无正面用例 —— 只有 `source:"header"` 间接钉住（改成 `continue` 会让 source 变 `"fallback"` 而变红）。行为本身正确。
Task 3: minor (deferred): 对不合形状入参静默容忍 —— `spaceStore.mjs:257-258` 在传入 WHATWG `Headers`/`Request` 时不会报错，而是当作「没有显式来源」静默回退，正是 spec §10 想避免的静默落错空间。本任务契约（Node `IncomingMessage` 风格）下合规；建议 T10/T11 确保传 `request.headers` 与 `new URL(request.url, ...)`。
Task 3: minor (deferred): `resolveSpaceFromRequest` 依赖 store 已初始化但未表达该前提 —— `has()`/`firstId()` 读内存 `state`，未 `ensureInitialized()` 时显式来源一律 400、隐式来源静默落 default（fail-closed，可接受）。修法：注释补一行「调用前须已 await store.ensureInitialized()」。计划 T9 的派发层已在解析前 await 过该调用。
Task 3: note — 评审按代码推演复核了实现者的 6 项变异表，确认 B 虽是复合变异但两个因子各自都能单独杀死目标用例，结论成立；并核实 `has()` 是精确匹配（非子串）、`firstId()` 存在（不破坏「不抛错」契约）。

Task 4: fix round 1/5 (1 Important addressed, 0 open — 锚点改回 `defaultPaths.schemeFiles`，未拆守卫，另补 1 条回归用例；commits 2e53bb13..00d6f9f3)
Task 4: complete (commits 801c3db8..00d6f9f3, review clean — Spec ✅ / Needs fixes → 修复后复审全闭环)
Task 4: minor (deferred): 复审 out-of-scope —— `schemePathsScope.test.mjs:11-12` 仍用 `beforeEach` 重建 tmpdir，而 `server.mjs` 的 `defaultPaths` 每文件只求值一次（首 import 时），故除首个用例外的用例都指向已删除的 tmpdir。本次新增用例恰好只比较「不等」，不受影响；但后续若在该文件追加「读默认根应命中」类断言会踩坑（同类教训已在 T6/T7/T8 的 `beforeAll` 注释里记录，T4 自己那份漏了）。
Task 4: note — 复审独立验证了新回归用例的判别力：`/自定义 filesRoot/` 全仓仅在 `server.mjs:3138` 一处产出，排除「因无关原因抛同样消息」的通路；变异探针已还原（`grep MUTATION-PROBE server/` → 0）。

Task 6: review verdict — Spec ✅（6/6 函数接 paths、回写同根、11 常量未删、两文件改动、逐行归类无越权改动）/ 无 Critical / 无 Important
Task 6: complete (commits 00d6f9f3..1853702e, review clean)
Task 6: minor (deferred): `spaceConfigPaths.test.mjs` 三处 `expect(read*Config()).exists).toBe(false)` 里**只有 `:47` 是承重的** —— 它对应 `readDeviceLibraryConfig`（会回写，`deviceLibrarySchemaVersion = 4` 对测试写入的 `schemaVersion: 1` 必触发回写，变异已验证可红）。`:30` 与 `:63` 对应的 `readColorConfig` / `readMeasurementConfig` **没有任何写路径**，默认根又是 `beforeAll` 新建的 tmpdir，故这两行永远为真、零信息量。修法：删掉，或改成 `expect(defaultPaths.colorConfig).not.toBe(paths.colorConfig)` 这类钉住「两根不同」前提的对照。
Task 6: minor (deferred): `spaceConfigPaths.test.mjs:61` 的 `toHaveProperty("groupDefaults")` 不能失败（`readMeasurementConfig` 两个分支都返回它），是 brief 强制项。实现者保留作烟雾断言并在 `:62` 补了可失败的空间探针，故不构成可信度缺口；该行本身零信息量。
Task 6: minor (deferred): 3 个写函数（`server.mjs:549/892/1538`）零测试覆盖 —— 本任务测试只覆盖 3 个读函数，写侧「是否真接 paths」仅靠人眼核对 diff（评审核了，正确）。它们未导出且 `handleSave*` 目前不传 options，本任务内确实无法从外部驱动。**交接**：路由接线任务必须补「空间写 → 读回空间根」的写侧断言 —— T9 新增的跨空间缓存用例已覆盖（PUT color-config 到张三后读回）。
Task 6: minor (deferred): `handleSave*`（`server.mjs:4313/4319/4325`）无参调用写函数属任务范围外，当前读（v1 路由）与写（handler）同为默认空间、**读写自洽**，无现存缺陷。交接要求：路由任务必须**同时**接读与写 —— 只接读会让「空间读 + 默认写」配成错对，比不接更糟（T9 的 (b) 段已写明这一点）。
Task 6: minor (deferred): 报告 §7 两处小误差 —— 称测试文件「67 行」实为 65；§1 表格 `writeColorConfig`(548→实为 549)、`writeMeasurementConfig`(891→实为 892) 各差一行。不影响结论。
- **Ruling（T6 评审对 T9 措辞的修正，采纳）：把 T9 的缓存修法从「键与版本源要一起换」改为唯一许可写法 `sendCachedJsonFile(request, response, paths.colorConfig, () => readColorConfig({ paths }))`，并补「version 对不存在的文件恒为 0、无区分力」** — 我原措辞可被读成「换了版本源就够了」，而 `server.mjs:1606-1609` 在文件缺失时 `catch { version = 0 }`，版本源对不存在的文件毫无区分力，**只有键变才真正分开空间**。这正是最容易犯的错法（只给 `produce` 包空间闭包、`filePath` 仍传常量）。另明确三处调用点（`:4513/4519/4525`）必须一起改，避免「部分空间化」的缓存 — 代价若错：缓存跨空间回放载荷，属隔离破洞且极难归因。
Task 6: 评审结论 —— Spec 逐条命中，改动面积可逐行归类到授权范围（三处 hunk 共 19/13 行，**零越权**），「回写同根」由 diff 直接可见并由变异验证背书；对 brief 弱断言的偏离判断正确。



Task 6: 实现完成待审（`1853702e`，33 文件 / 477 用例全绿，既有测试一字未改；新增 3 用例 RED→GREEN，并对 `readDeviceLibraryConfig` 的回写行做了变异验证）
- **Ruling（源自 T6 顾虑 2/3）：T9 的改造面从「注入 ctx.paths」扩大到「每个路由体与 handler 把路径实参换成 paths.\*」，并把跨空间缓存作为显式风险写进 T9** — 核实 `sendCachedJsonFile(request, response, filePath, produce)`（`server.mjs:1603`）**以 `filePath` 本身作缓存键**（`:1610` get / `:1616` set，命中判据 `stat(filePath).mtimeMs`）。故 `filePath` 与 `produce()` 必须读同一空间；传默认空间常量会让某空间载荷以默认空间键被缓存并回放给别的空间 —— 跨空间数据泄漏。实现者的表述（「缓存键仍是默认空间路径」）不如实际机制精确：按空间传路径时缓存天然按空间分开，问题只在传错。同时补：`handleSave*`（`:4308-4324`）目前无参调用写函数，写仍落默认空间 —— 「每空间独立配色/量测」会变成读空间、写默认，比完全不隔离更难查。已给 T9 加三段显式要求（a：`sendCachedJsonFile` 的 filePath 实参；b：写路由 handler；c：图片与图片文件夹路由）+ 一条 `grep` 裸常量的自检（预期命中 0）+ 一条能同时抓「写落默认」与「缓存串味」的用例 — 代价若错：漏改任一处就出现跨空间读写，属核心功能的隔离破洞。
- **Ruling（T6 顾虑 1，采纳）：brief 第 3 个用例的 `toHaveProperty("groupDefaults")` 是不能失败的断言，实现就地加强正确** — 该断言在 `paths` 被忽略时同样成立。实现改为写入空间探针 + 断言读回 + 默认根 `exists:false`，与我在派发里给的「每个断言自问：实现错了会不会红」一致 — 代价若错：无。


Task 4: review verdict — Spec ✅（10/11 落地，第 11 个 `readSchemes` 是纯透传、不加 `const paths` 的偏差被判定成立；11 个旧常量一字未删；`defaultPaths` 已 export）/ Task quality **Needs fixes**（1 Important）
Task 4: 已派修复轮 1 —— Important：`createSchemeArchiveBuffer` 的守卫锚点 `defaultFilesRoot` 被从 `join(schemeDataDir,"files")` 改成 `paths.schemeFiles`（`server.mjs:3126`），使守卫在 `{ paths }` 入口退化为自比较（`filesRoot === defaultFilesRoot` 恒真）→ 放行混根 ZIP，正是守卫存在的理由。修法 1 行：改回 `defaultPaths.schemeFiles`。这是实现自行扩大的改动面 —— brief 的公式只约束 `filesRoot`/`trashRoot`。
Task 4: minor (deferred): 9 个被改造函数的 `paths.schemeTrash` 接线零断言 —— `schemePathsScope.test.mjs` 只经 `readSchemes → readSchemesFromFiles` 一条链，仅覆盖 `paths.schemeFiles`；既有 trash 断言全部显式传 `options.trashRoot`，故在「传 `paths` 且不传 `trashRoot`」的路径上字段名拼错（如 `paths.schemeTrashDir` → `undefined`）不会有任何测试变红。修法：后续任务补一条 `deleteSchemeProjectRecord({ paths })` 或 `archiveStaleSchemeFiles(..., { paths })` 的断言。
Task 4: minor (deferred): `schemePathsScope.test.mjs` 的 `delete process.env.GRAPH_MODEL_DATA_DIR` 不在 `finally`，断言失败时不会执行。该文件仅一条测试且模块已缓存，影响可忽略。
Task 4: minor (deferred): 报告称 `spacePathsFor` import 在 `:20`、`defaultPaths` 在 `:29-33`，实为 `server.mjs:22` 与 `:33`。仅文档准确性。
Task 4: minor 已通过计划回改处理 —— 见下方 Ruling（T5-T8 测试改用 `spacePathsFor`）。

- **Ruling（源自 T4 评审 Minor 2）：T5/T6/T7/T8 四个测试文件改用生产同款构造器 `spacePathsFor(dataDir, "张三")`，不再手写 `{...defaultPaths, 需要的几个字段}`** — 手写 spread 只覆盖当前用例用到的字段，其余字段静默指向 default 空间根；评审指出后续任务会照抄这个模板，届时若用它驱动 trash 类函数就会写错空间（`paths.schemeTrashDir` 拼错 → `undefined` 也没有任何断言会变红，见 Minor 1）。改用构造器后一次拿全 13 个字段，**且被改造的代码路径与生产完全同源**。已重生成 brief 5/6/7/8。T4 自身已提交的 `schemePathsScope.test.mjs` 保持原样（其断言有效，不值得为观感再开一轮修复） — 代价若错：无，这是把测试构造向生产收敛。
 — 评审提出「须保证在传 `paths` 的同一 commit 内拆除守卫」。核对执行序 T4 → T6 → T7 → **T5（拆守卫）** → T8（apiV1Schemes 改传 `ctx.paths`）：唯一会向 `createSchemeArchiveBuffer` 传 `paths` 的调用点是 T8 改的 `apiV1Schemes.mjs:123`，而 T8 排在 T5 之后 ✓。T6/T7 只改 settings/device-library/images/icons 域，不碰该调用点。故无需额外前置条件 — 代价若错：若 T8 被提前执行，会静默产出混根 ZIP（可见损害需「同名模型在默认根也存在」才会显形，否则适配层报错成 500）。


Task 2: review verdict — Spec ✅（两文件新建、零既有文件改动、与 brief 逐字一致）/ Task quality **Needs fixes**（3 Important）
Task 2: minor (deferred): `spaceStore.test.mjs:316-317` 非法目录让 `spaceStore.mjs:121` 打 2 行 `console.warn`，默认 reporter 下输出不干净。修法：`vi.spyOn(console,"warn")` 并顺带断言告警内容。
Task 2: minor (deferred): `spaceStore.test.mjs:360-365` 用例名「新建追加末尾」只断言 `firstId()==="default"`，没验顺序。补 `expect(list().map(s=>s.id)).toEqual(["default","张三"])`。
Task 2: minor (deferred): `spaceStore.test.mjs:334-338`「最后一个空间不可删」是空断言（default 永远存在且 pinned，不存在「唯一可删空间」），实际只覆盖 pinned 分支。改名或补一条「删掉唯一非 default 空间应成功」。
Task 2: minor (deferred): `pinned` 无反向覆盖 —— `spaceStore.mjs:99` 若硬编码 `pinned: true`，13 用例仍全绿。补非 default 空间 `pinned` 为 false 的断言。（另注：`spaceStore.mjs:358` 删除守卫读 `id === "default"` 而非 `space.pinned`，字段与行为未完全同源；现无第二处写 `pinned`，不构成缺陷。）
Task 2: minor (deferred): 未覆盖方法/负路径 —— `has()` 完全没测；`touchLastAccess` 未测（含未知 id 静默 no-op）；`rename` 未知 id/空名抛错、`remove` 未知 id 抛错、`create("")` 回退 id `space` 均未测。另 `spaceStore.mjs:26` 的 `SCHEMA_VERSION` 只写不读（`load()` 不校验），前向兼容占位，无当前风险。

BASE before T7: 1853702e
Task 7: 实现完成待审（`c05ee4fc`，34 files / 479 tests 全绿，既有测试一字未改）
- **计划缺陷（T7 顾虑 1，已请评审裁定）：T7 的测试文件写出来不可能通过** —— brief 让它解构 `readManifest` / `ensureStore`，但两者原本是模块内部函数、未 `export`，解构得 `undefined`，RED 实际是 `is not a function` 而非 brief 预期的「返回空数组」。实现者给这两行声明加了 `export`（`server.mjs:300` `ensureStore`、`:307` `readManifest`，纯增量、落在本来就要改的同一行）。裁定接受则需回改计划 T7 记录这两个导出，保持文档与代码一致。
- **Ruling（T7 顾虑 3，采纳）：`paths` 必须沿 `readReferencedImageExportPathById → imageExportPathByIdFromManifest → imageFileToDataUrl` 整条链透传** — brief 只在 `resolveFolderId` 处点明透传；实现者识别出这三条链路同理必需，否则 T9 接线后 **manifest 读空间根、图片字节读默认根**，表现为「图片有时显示有时不显示」而非干脆报错。与缓存键问题同属一类失效（同一逻辑读操作的两端指向不同根）。已补进 T9 的 (c) 段 — 代价若错：跨根读取，症状隐蔽。
- Task 7: 顾虑 2 —— brief 测试 1 的 `readManifest()` 断言 `toHaveLength(0)` 在全新 tmpdir 上**永远为真**（默认根 manifest 被自动创建为 `[]`）。实现者用 `defaultPaths` 播种默认根、改为比对 id（`["def"]` vs `["abc"]`），并做变异验证。又一次「恒真断言」，由实现者主动修掉。
- Task 7: 顾虑 4/5 —— `imageDataDir`/`iconDataDir`/`manifestPath`/`imageFoldersPath` 改后本文件内已无引用（按约束保留）；路由调用点（`server.mjs:3662` 起）仍未传 paths，属 T9 范围。

Task 7: review verdict — Spec ✅ / **Concern 1 裁定：加两个 `export` 可接受且优于备选**（三条可核事实：全仓无生产模块消费这两个导出、备选方案会丢掉 `ensureStore` 建三件套的全部覆盖、只加两个词）/ 无 Critical / 无 Important
Task 7: complete (commits 1853702e..c05ee4fc, review clean)
Task 7: minor (deferred): `spaceImagePaths.test.mjs:20-24` 的 `process.env.GRAPH_MODEL_DATA_DIR` 清理写在断言之后，断言失败即泄漏到同 worker 的后续测试文件（可能引发一串噪声红）。`spaceConfigPaths.test.mjs` 有同样形状，属沿袭而非新债。修法：`try/finally` 或 `afterEach` 恢复。
Task 7: minor (deferred): `server.mjs:300`/`:307` 两个新导出只被测试消费，缺一行说明性注释。建议补「导出供测试/后续任务消费」。
Task 7: minor (deferred): `writeManifest(items, options)`（`:314`）与 `readReferencedImageExportPathById(..., options)`（`:2956`）的 `paths` 透传无断言，「结构性正确但未钉死」；`:2956` 由改动前既有的 `svgExport` 哨兵间接覆盖（无参路径）。
Task 7: note — 评审给出哨兵机制的确证：`spacePathsFor` 对 default 空间返回 `resolve(dataRoot)`（`spaceStore.mjs:32-34`），故 `defaultPaths.images === imageDataDir === <dataRoot>/images`（`server.mjs:33-37`）**逐字节同值**，无参调用点与改前等价 —— 这既是既有测试一字未改仍全绿的机制，也是「不搬生产数据」的保证。另确认仍无参的调用点清单：`server.mjs:3663/3672/3679/3703/3705/3984/4006/4090/4102`，T9 的自检 grep 会扫出。
Task 7: 顾虑 3 的裁定依据 —— `server.mjs:2929` 用 `join(paths.images, filename)` 读图片字节；若上游 manifest 读空间根而此处落 `defaultPaths`，即「manifest 读空间根、图片字节读默认根」的读写分家形态。**必要且正确**。

BASE before T5: 9678ef01
- **Ruling（T5 实现者报出的跨任务冲突，我裁决）：删除 T4 修复轮加入的「默认根守卫不随 options.paths 漂移」用例（`schemePathsScope.test.mjs:37`），并在原位置留注释说明历史** — T4 的修复轮给那条守卫加了回归用例，它当时是对的；但 **T5 的全部目的就是拆除该守卫**，故该断言的守卫主体在结构上已消失（现在抛的是「方案目录不存在。」）。三个选项：(a1) 改写成「自定义 paths 下 ZIP 成功生成且 json 与 e/svg 同源」→ 与你 T5 新写的用例**逐字重复同一断言**，属评审 rubric 明文列为 Important 的缺陷；(a2) 删除 → 采纳；(b) 留 1 红提交 → 绝不接受。**这是计划缺陷而非实现者的问题**：冲突在 T4 修复时还不存在，预检扫不到；但我在审 T4 修复时就该看出「这条测试会在几个任务后被 T5 作废」，是我漏了 — 代价若错：删除会少一条守卫断言，但守卫本身已不存在，且「不产出混根 ZIP」现由 `schemeArchiveRealtime.test.mjs` 的替换用例承担。
- **计划缺陷（T5 brief 的测试文本，两处，实现者主动发现）：** ① 第二断言 `existsSync(默认根/测试方案/厂站.json) === false` 恒失败（`beforeAll:72-74` 已在该路径种下同名文件），且**沿用同名会让混根状态静默成功**，恰好架空该断言的目的 → 模型改名 `空间厂站`；② 条目名断言 `endsWith("厂站.json")` 对 `空间厂站.json` **后缀巧合为真**，是假阳性断言 → 改 `toEqual` 全列比对。两处均已批准，并写回计划文本。
- **Ruling（T5 顾虑 · 加固，采纳）：保留对「仅传 `filesRoot`、不传 `paths`」的显式拒绝，不让它在守卫拆除后变成静默混根** — 守卫拆掉后，这条遗留入口无法让渲染链跟随自定义根 → 必然产出「json 来自根 A、e/svg 来自根 B」的 ZIP。核实今天仓内**无活的此类调用点**（`apiV1Schemes.mjs:123` 传的 `getFilesRoot()` 在 T8 之前恒等于默认根，`filesRoot === defaultFilesRoot`，不触发），属**潜伏**而非现存故障。但静默混根的症状是「ZIP 里 e/svg 是别处的模型」，极难归因，而换成显式报错只需 1–2 行。约束：该分支**不得**在传了 `paths` 时触发，否则等于取消 T5 的目的 — 代价若错：若判断失误把 `paths` 入口也拦了，非 default 空间 ZIP 会重新 500（可见、可立即发现，非静默）。
- **Ruling（T5 两处测试偏离）：批准** — 见上条；两者都是我的测试文本缺陷，实现者处理正确。

Task 5: 实现完成待审（`4305a4ba`，5 文件 +56/−42；`pnpm vitest run server/` 全绿 34 files / 478 tests；`pnpm audit:names` 干净）
Task 5: note —— 三条裁决全部落地：① 删除 T4 的守卫用例并留注释（`schemePathsScope.test.mjs` 剩余 1 条 schemes 域用例保留且绿，无死 import）；② 两处测试偏离按批准执行；③ **加固已实现**（`server.mjs:3146-3150` 逐字为授权文本）。
Task 5: note —— 实现者给出的替换用例自证：A1 与 A2 是「结果 + 前提」的合取 —— A2 真 ⇒ 默认根无该模型 ⇒ 派生格式若读默认根必 not-found ⇒ A1 必红；故 A1 不红 ⇒ 读的是唯一存有该模型的空间根 = json 枚举的同一根。另加正证断言：ZIP 内 `.json` 与空间根磁盘原文**逐字节相等**。两条变异探针：(i) 不传 `paths` → A1 红（`模型“空间厂站”SVG 生成失败：模型不存在。`）；(ii) 把同名且**损坏 JSON** 的模型塞进默认根 → **A2 红而 A1 仍绿**，同时证明 A1 单独拦不住「两根同名」的静默混根。实现者诚实标注 A2 保护的是写侧、不直接判别读侧，并据此改写了 brief 里那条措辞不准的注释。
Task 5: 我的操作失误 —— 用 bash `grep` 带转义交替查加固是否落地时报 0 命中，据此误判「未落地」；实为命令模式被 shell 钩子改写，改用 `sed` 读源码确认代码在 `server.mjs:3146-3150`。**教训：查代码用 Grep 工具或直接读文件，不用 bash grep 的转义交替。**

Task 5: 加固落地为独立提交 `bec5ce60`（实现者未按我「一并纳入同一提交」的指令执行，理由是：`4305a4ba` 已先行落地且同期多个 agent 共用同一工作区，改写已被他人参照的提交有连带风险。**它的判断优于我的指令，已采纳**）。
- **Ruling（T5 新登记的缝隙，采纳并给出更简形式）：加固条件 `!options.paths` 只堵一半 —— `{paths: X, filesRoot: Y}`（Y≠X）仍混根。改为丢掉 `!options.paths`、以 `paths.schemeFiles` 为唯一锚点** — 渲染链跟随的**始终**是 `paths.schemeFiles`，故那个合取项多余。单条件覆盖六种组合：`{}`/`{paths:X}`（filesRoot 取自 paths，不触发）、`{filesRoot:默认}`（相等，不触发）、`{filesRoot:Y}` Y≠默认（不等，抛错）、`{paths:X, filesRoot:X.schemeFiles}`（相等，不触发）、`{paths:X, filesRoot:Y}` Y≠X（不等，**抛错 ← 本条即被堵的缝**）。**必留 `if (options.filesRoot && …)` 里的存在判断**，否则不传时会被误拦。同时要求补第五、六两种组合的断言 —— 缺了等于没修。错误消息口径随之从「遗留入口」改为「filesRoot 与解析出的 paths 不同根」 — 代价若错：若漏了存在判断，`{paths}` 正路会被误拦、非 default 空间 ZIP 重新 500（可见、可立即发现，非静默）。
- Task 5: 该缝隙属**我授权时考虑不周**，非实施问题。

Task 5: review（覆盖 `9678ef01..4305a4ba` + 补充 `bec5ce60`）—— Spec ✅ 主体全部通过（5 文件无越界、11 常量未动、三处 `await import()` 未静态化、两个渲染适配层的 8 处读盘全走 paths、既有测试只改授权两处）；四项授权偏离逐条判为**正确**。
- **Important 1 系假阳性（我方时序造成）** —— 评审判定「加固分支未提交、只存在于工作区」，事实是它**已提交在 `bec5ce60`**（`server.mjs +5`、`schemeArchiveRealtime.test.mjs +10`），并在工作区看到它正是因为它已提交。成因：我先派了 `9678ef01..4305a4ba` 的评审包，之后才发「范围扩展到 bec5ce60」的消息，评审判定完成于消息到达之前。已去函撤销。**教训：评审进行中扩展 diff 范围会让评审把已提交代码报成未提交；正确做法是等评审收尾后再以定向复审覆盖追加提交。**
- Task 5: Minor 2（`{paths, filesRoot}` 不同根仍混根）与实现者 §9.1 登记的是同一条，已在修（见上方 Ruling，采用更简的单条件锚点形式）。
- Task 5: Minor 3（A2 不构成对被测代码的覆盖，只是使 A1 具判别力的前置不变量）—— 评审与实现者 §4.3 末自陈一致，采纳。
- Task 5: 评审对我点名要查的「加固分支是否有测试覆盖」给出肯定答复：`schemeArchiveRealtime.test.mjs:208-213` 断言**特定消息串**，删掉分支后要么不抛错、要么消息不匹配（`files-自定义` 目录不存在会抛另一种错误），必红；且该消息字面量全仓仅 `server.mjs:3147` 一处产出，无误配可能。
- Task 5: 评审另核实加固对现存唯一遗留调用点安全 —— `server.mjs:4255` 传的 `join(schemeDataDir,"files")` 与 `defaultPaths.schemeFiles` 同值（`defaultPaths` 走 default 空间复用数据根），加固放行，无回归。

Task 5: review 完整范围裁定 —— **Approved**（守卫已拆且 paths 在两适配层纵穿完整无遗漏读盘；被拆的保护由一条可失败的新加固 + 钉住特定消息串的测试替代；对两个活的遗留调用点无回归；Important 1 已撤销）。
Task 5: 评审**撤回自己上一轮的建议** —— 若条件左值用已推导的 `filesRoot` 而非 `options.filesRoot`，`options.filesRoot &&` 存在判断自动免掉，形式更短且语义自明（左值即「枚举所用的根」，右值即「渲染链读取的根」）。六种组合结果不变。已转给实现者采用。
- **Ruling（T5 收口，采纳评审的必要提醒）：新守卫的注释必须写明「锚点 = 渲染链实际读取的根，故随 paths」，并明示「不要改回与 paths 无关的独立值」** — `schemePathsScope.test.mjs` 被删用例留下的旧警告（「锚点不得随 `options.paths` 漂移」）前提已过时：它假定渲染适配层只读模块级根，而本任务已让渲染链跟随 `paths`。**没有新注释，后来者会照旧警告把锚点改回独立值、重新打开混根** —— 这正是 Task 4 那个 bug 的同一失效模式（锚点与渲染链实际读取的根脱钩）。锚点加 `?? defaultPaths.schemeFiles` 兜底缺字段偏对象，避免 `resolve(undefined)` 抛 TypeError 顶掉中文消息 — 代价若错：无，注释是纯增量；漏写则未来一次「顺手修正」可静默恢复混根。
Task 5: minor (deferred): 新用例不判别四个配置/图片 helper 的 `paths` 透传 —— `svgExport.mjs:97-99,125` 与 `eFileExport.mjs:51` 读的库/量测/配色/被引用图片配置在 tmpdir 两个根下都不存在，helper 若静默忽略 `paths` 输出与全绿完全相同。该覆盖仅由 Task 6/7 自己的测试承担，Task 5 的用例管不到。当前可接受，记录边界。
Task 5: minor (deferred): `schemeArchiveRealtime.test.mjs:199` 注释措辞仍偏宽 —— 「枚举与渲染都不该往默认根写」把 A2 说成覆盖写侧行为，A2 实际只确立「默认根没有本模型」这一前提。与 Minor 3 同源，修法：注释收窄为「本用例的前置不变量」。
Task 5: minor (deferred): `server/svgExport.mjs:18,42-45` 的 `warnedBackgroundIdx` memo 现在**跨空间去重** —— 该 Set 只以 `backgroundIdx` 为键，本任务让 `findSchemeProjectRecordByIndex`（`:38`）按 `paths` 解析后，同一 idx 在一个空间解析失败会抑制另一空间同样失败时的 warning。纯日志保真度问题（不影响产物）、且 Set 早于本任务存在，仅因多空间渲染获得新含义。修法：键改为 `${spaceRoot}:${idx}`。

Task 5: 修补完成（`1d63caf7`，2 文件 +28/−8；`pnpm vitest run server/` **34 files / 480 tests 全绿**）—— 按授权形态实施（含 `?? defaultPaths.schemeFiles` 兜底），未切折叠路线。六种组合实测核对全部符合预期，组合六即被堵上的缝隙。
Task 5: 修补补了 **3 条**断言（组合四＝改既有用例的名/注释/regex；组合六＝新用例；组合五＝同源用例内 1 条 `resolves` 断言，复用其 fixture 不重复造种 —— 这种做法对）。
Task 5: 实现者的**双向变异验证**：A 条件改回旧形态 → 仅组合六用例红（**旧用例仍绿，证明它单独守不住这条缝隙**）；B 保留 `options.filesRoot &&` 但锚点换回 `defaultPaths.schemeFiles` → 仅组合五断言红（`promise rejected … instead of resolving`）。两次均已还原，480 全绿取自还原后。
- **Task 5: 实现者更正评审一处错误（已核实其成立）** —— 评审称「`:208-213` 无需修改即可继续绿」；实现者指出第二轮已改错误消息，其 regex `/仅传自定义 filesRoot/` **不改必红**。评审的行为判断正确（组合四仍抛错），错的是「无需修改」。实现者已在报告 10.4 写明并更新该用例。**这是本计划第三次 agent 之间互相更正且更正成立**（前两次：T2/T4 评审对实现的更正）。

Task 5: 第三、四轮收口 —— `69f97eb2`（1 文件 +5/−3）：左值改用已推导的 `filesRoot`（`options.filesRoot &&` 存在判断免掉），并补上锚点警示注释；无测试变更。第 4 轮变异验证：把右值锚点去掉 `paths.schemeFiles ??`（改回默认根）→ **只有组合五断言红**（`1 failed | 8 passed`），即「不该拦的拦了」仍被钉住。累计 480 全绿。
- Task 5: 实现者如实登记的边界 —— 右侧 `??` 保护的是「传了 `filesRoot`、`paths` 为偏对象」；**既无 `filesRoot`、`paths` 又是偏对象**（`{paths: {}}`）时左值 `resolve(undefined)` 仍抛 `ERR_INVALID_ARG_TYPE`（已实跑确认）。该类输入下游同样必炸，差别只是「在哪里炸」；未额外加左值兜底以免超出指定形态。
- **流程修正（我的操作失误，记入以备后续任务）：派评审前必须确认实现者已对其最终态报 DONE；发出细化指令后，要等该指令的完成报告再派该范围的评审。** 本次我收到 `1d63caf7` 的 DONE 后又发了一条细化指令（产生 `69f97eb2`），而评审包是按 `..1d63caf7` 生成的，导致复审要查的一项（锚点警示注释）实际不在其范围内 —— 与前一小时的假阳性同类，且我在 ledger 里刚记下该教训就自己重犯。已扩范围至 `..69f97eb2` 并去函更正。

Task 5: 定向复审裁定 —— **Finding A ADDRESSED**（锚点已换为 `paths.schemeFiles`、`!options.paths` 已删、`??` 兜底在；六组合逐条核对符合预期；生产调用点 `server.mjs:4254`、`apiV1Schemes.mjs:34-36,123` 传的 `filesRoot` 均等于默认根，守卫不误触发、无新增 500）；**Finding B ADDRESSED**（三处断言逐一核验判别力：组合六用 `/filesRoot 与解析出的 paths 指向不同根/` 正则而非裸 `rejects`，故下游 ENOENT 也不会误绿；组合五是「不该拦的拦了」的**唯一**钉子 —— 生产 `{filesRoot: 默认根}` 与 `{paths}` 两路都不受错误锚点影响，确实无第二条断言可替代）；diff 内确为 3 处，与报告一致。
Task 5: **实现者的争议成立** —— 复审确认「`:208-213` 无需修改即可继续绿」为假：`bec5ce60` 的消息对应 `/仅传自定义 filesRoot/`，`1d63caf7` 在同一提交内把消息改为「filesRoot 与解析出的 paths 指向不同根…」并同步改 regex，旧串在新消息中不存在 → 不改必红。行为层判断对，「无需修改」错。
- **流程隐患（第三次由工作区瞬时态引起的误判）：在共享工作区里跑变异测试，对并发的评审者可见。** 复审读到过一次「左值已换、右值锚点仍是默认根」的中间态，实为实现者第 4 轮变异探针 B 的写入窗口，它据此判定「文件正被并发写」。该判断本身正确，但这已是本任务第三次因工作区瞬时态产生误判（前两次：Important 1 假阳性、本次注释缺失误判）。**修正方向：评审应在实现者报 DONE 且工作区干净（`git status` 无相关改动）时派发；变异探针跑完必须确认还原后再报告。**
Task 5: minor (deferred): 新增三条用例内的注释编号（「组合一/二/三」）与报告 §10.3/§10.4 的枚举编号（组合四/五/六）互不对应（代码「一」=报告 4、代码「二」=报告 6、代码「三」=报告 5）。仅注释可读性/可追溯性，断言强度不受影响；但三行均为本提交新增，按编号回溯会指错行。
Task 5: minor (deferred): `server/server.mjs:3147` 注释称 `?? defaultPaths.schemeFiles`「避免 resolve(undefined) 抛 TypeError 顶掉下面的中文消息」，但该兜底**只护右值**：`{paths: {}}`（truthy 无字段且不传 filesRoot）左值 `filesRoot` 仍为 undefined，`resolve(undefined)` 照样抛 TypeError。无调用点传偏 paths 对象，无行为回归；仅注释表述比实际保证宽。
Task 5: minor (deferred): 报告 §10.2「最终实现」引用的代码块仍是 `1d63caf7` 形态（含 `options.filesRoot &&`、无新注释），§10.5 变异 B 的表述也只适用于该形态。对 HEAD 最终形态，同一变异会同时打红组合五断言与主同源用例。变异 B 的结论方向仍成立且更强，但读者按 §10.2 复现会得到不同结果。

Task 5: complete (commits 9678ef01..69f97eb2, review clean — 主体 Spec ✅ / Approved；复审：**All findings addressed, no new Critical/Important breakage**)
Task 5: 复审发现的额外收获 —— `69f97eb2` 顺手封掉一条残余缝：`filesRoot: ""`（defined 但 falsy）时旧式被 `options.filesRoot &&` 短路放行、`??` 不视 `""` 为 nullish，会继续往下走；新式 `resolve("")` = cwd ≠ 默认根 → 抛中文消息。方向正确，无调用点传 `""`。
Task 5: 累计 5 个提交：`4305a4ba`（拆守卫 + paths 纵穿）、`bec5ce60`（加固）、`1d63caf7`（锚点换 `paths.schemeFiles` + 3 条断言）、`69f97eb2`（左值改推导值 + 警示注释）、`889ab727`（docs）。
Task 5: 复审另作废一条自己的观察 —— 「`schemePathsScope.test.mjs:34-38` 的替代注释含相反的过时警告」不成立：那份反向意图原只存在于**被删用例的名字**里（历史中的「默认根守卫不随 options.paths 漂移」），随测试块一并消失，无残留误导风险。
Task 5: **最终裁定 —— Task quality 合格（可合并）**。评审结语：本次**未发现假断言**（该计划此前最常见的缺陷），且两个方向都钉住（该拦的没拦 / 不该拦的拦了）—— 这是本计划第一个零假断言的修复轮。评审另把新守卫的价值概括为：锚点与被渲染链实际读取的根**同源**（`paths.schemeFiles` 单一来源），消除了「两处硬编码同一概念」这一本仓反复出现的缺陷形态（与用户 CLAUDE.md 经验规则中记录的历史问题同源）。三条 Minor 不影响运行时行为，可合并、可进 deferred。评审包与 `git diff --numstat bec5ce60..69f97eb2`（`24/4` + `6/4` = `+30/-8`）完全一致，无缺失 hunk。

BASE before T8: 03781a61
Task 8: 实现完成待审（`491020aa`，6 文件 +216/−64；全量 `pnpm vitest run server/` **485 passed / 0 failed**，既有测试零改动；`audit:names` 干净）
- **计划缺陷（T8 顾虑 1，待评审裁定）：我 brief 的测试根本跑不绿，三重叠加** —— ① `renderSavedModelSvg` 的形参实为 `parts` 而非我写的 `schemePath`；② 找不到模型时该函数**返回 `{error}` 而非 reject**，`.rejects.toThrow()` 永红；③ 更根本，该函数的 `paths` 透传 **Task 5 已完成**，故用例实现前后无差别 —— 即又一条「不可能失败」的断言，且更糟：它连通过都不可能。实现者保留文件名与意图，改测本任务**真正改动的 4 个入口**（cim / 方案 ZIP / library / send），逐条验证 RED。已请评审判定该替换是否恰当。
- **计划缺陷（T8 顾虑 2）：brief Step 4 与全局约束自相矛盾** —— Step 4 预期常量计数清零，而全局约束是「11 个一个都不能删」。实现者按全局约束执行，**未删任何常量**。实测 4 个常量仍被旧 `/api` 路由引用：`server.mjs:4282`（`schemeTrashDir`）、`:4543`（`colorConfigPath`）、`:4549`（`measurementConfigPath`）、`:4555`（`deviceLibraryPath`），删除即 ReferenceError。**这批引用正是 T9 计划 (a) 段点名的 `sendCachedJsonFile` 缓存键危险点** —— T8 等于替 T9 做了实证。
- 计划缺陷（T8 顾虑 3）：我写 `apiV1Library.mjs` 5 处调用点，实为 **6 handler / 7 处**。实现者按实际数字写提交信息（对 Step 6 的唯一偏离）。
- **Ruling（T8 评审 Important 1，采纳但判定为计划缺陷、不进 T8 修复循环）：我的自检 grep `filesRoot:` 带冒号，看不见属性简写 `{ filesRoot, schemePath }`，故「生产命中应为 0」是假阴性** — 评审核实 `server/server.mjs:4254/:4257`（旧 `/api/schemes/export` 路由）仍为生产的 `filesRoot` 调用点，只因 `filesRoot` 恒等于 `defaultPaths.schemeFiles`、Task 5 守卫放行而当前无回归。**这是计划缺陷，不是本次实现的缺陷**（评审亦同判）；T8 的处置「不改、如实披露」正确 —— `server.mjs` 的 handler 空间化不在本任务文件清单内。修法：① 计划里的自检改为 `grep -rn "filesRoot"`（不带冒号），并在任务文本里写明「必须考虑属性简写」这条教训；② 已把 `:4254/:4257` 改走 `paths` 显式写入 T9 的 (d) 段。**评审的关键提醒：controller 若继续用同一条 grep 复核会持续漏判、把「还有生产调用点」当成「已清零」** — 代价若错：漏判导致某处仍读写默认空间而不自知。
Task 8: 实现者与评审的对话要点 —— 评审确认 `svgExport.mjs` 无误属实（T5 已完成其 paths 透传）、11 常量未删未改、Task 5 守卫与注释原封未动（`server.mjs` 不在 diff 中，由构造保证）、无任何既有 `.test.mjs` 被改。
Task 8: **裁定 Approved**。评审理由：diff 完整落实本任务唯一高风险点（`apiV1Schemes.mjs:107` 改传 `paths` 而非 `filesRoot`）、四项全局约束全满足、五条新用例逐一可红且测试 2 精确钉住「枚举根 = 渲染根」（`res==200` + ZIP 条目 `toEqual` 三件套，传 `filesRoot` 会因 Task 5 守卫抛错变 500）。唯一 Important 判为计划级残留（见上方 Ruling），不构成对本次改动的信任障碍。
Task 8: minor (deferred): `paths` 透传的覆盖缺口 —— 以下位置删掉 `paths` 后 5 条用例仍全绿：`apiV1Library.mjs:69/:79/:103/:117/:132`（`readDeviceLibraryConfig` 一路，测试只覆盖了 `readMeasurementConfig`）、`eFileExport.mjs:212/:217`、`:244/:249`、`cimExport.mjs:78`、`apiV1Schemes.mjs:58/:68/:84`、`apiV1Schemes.mjs` 的 `handleV1ModelJson` 分支与 `handleV1ModelSvg`（`:194`）、`sendModel.mjs:61/:66/:69` 的 e/svg/cim 三支。**最具体的突变：删掉 `apiV1Schemes.mjs:194` 的 `paths` → 全绿，而空间场景下单模型 SVG 已静默读错根。** 修补优先级：`:194` 与 `readDeviceLibraryConfig` 各一条。
Task 8: minor (deferred): 结构断言的边界 —— `spaceExportPaths.test.mjs:795-800` 只证明 `apiV1Schemes.mjs` 源码不再出现 `getSchemeDataDir`/`GRAPH_MODEL_DATA_DIR` 两串字面量，不证明任何 handler 用了 `ctx.paths`（后者靠测试 1-4）。两处弱点：不钉 `getFilesRoot`，用 `__dirname` 硬编码相对根的复现形态抓不到；且会因注释提及 env 变量名而变红（实现者刻意回避了，说明该断言对注释有约束力）。属 brief 明文规定，保留合理。
- **Ruling（T8 评审 Minor 4 的交接，采纳并升级为 T9 的 (e) 段）：`server.mjs:4305`/`:4497` 的 `readSchemes()` 无参调用是常量 grep 抓不到的漏网，已补进 T9；并追加一条「无参 helper 调用」grep 作自检** — 我的常量 grep 只抓**裸常量名**，而**无参调用不含任何常量**，故对该形态完全盲。T9 的 (e) 段已列出 17 处实测基线（`:3663`–`:4481`），并写明**路由 handler 定义在文件前部、路由表在 `:4414` 之后**，故「只看文件后半段」的行号假设会漏掉绝大多数。**第二条自检方法教训（今日第二条）：复核「某 helper 是否已空间化」必须同时查「裸常量名」与「无参调用」两种形态。** — 代价若错：漏判导致某路由仍读写默认空间而不自知，且症状隐蔽。
Task 8: note —— 我给 impl-task-9 的自检预期「路由段（约 `:4400` 之后）应为 0」是错的（实测 17 处中 14 处在 `:4400` 之前），已去函更正。这是今日第三次「我的验证方法本身有缺陷」的实例（前两次：`grep "filesRoot:"` 漏属性简写、bash grep 转义交替被 shell 钩子改写）。

BASE before T9: db9b724b
Task 9: 实现完成待审（`96072867` 主实现、`f716f81c` 补断言；全量 **153 files / 2673 tests 全绿**、`server/` 36 files / 493 全绿、`audit:names` 干净、**未改任何既有测试**）
- **Ruling（T9 顾虑 1，采纳并派修）：`X-Space` 头必须加 percent-decode，与 cookie 分支对称** — 核实 `spaceStore.mjs:257` 对头值**原样使用不解码**，而 cookie 经 `parseSpaceCookie` 做了 `decodeURIComponent`。后果：`X-Space: 张三` 头值须为 ByteString，fetch 直接抛 TypeError；`X-Space: %E5%BC%A0%E4%B8%89` 不解码 → 当字面量查注册表 → 未知 → 400。**即请求头路径对本设计的主要 id 形态（中文）完全不可用** —— 三条解析路径里有一条天生瘸腿，且 `?space=`（`searchParams.get` 自带解码）与 cookie 都可用。修法：头分支加一次 try/catch 包住的 `decodeURIComponent`（对裸 ASCII 值恒等，向后兼容）；**`?space=` 不得再解一次**（`URLSearchParams.get` 已解码，再解会把 `%25` 类值解坏）。要求补一条「`X-Space` = encodeURIComponent("张三") 命中中文空间」的断言且**必须能红**。这是我的 spec 缺陷，非实施问题 — 代价若错：头路径对中文 id 一直不可用，而文档与验收项会宣称可用（静默的能力缺口）。
Task 9: **顾虑 5 是本次最有价值的自查** —— v1 派发点原测试**不覆盖**（去掉 `...spaceCtx` 仍全绿），实现者补了断言把它钉住。又一次「不可能失败的断言」，但这次是派发点级别的覆盖空洞，漏掉就等于 v1 路由从未被验证空间化。
Task 9: 顾虑 2 —— brief 的 native 用例会**真调起 Windows「另存为」对话框**（无 Origin 头时 `isAllowedNativeExportOrigin` 返回 true；实测 2.5–3.2s vs 加 Origin 后 15ms）。已改为带非本机 Origin（403）。这正是我在 Task 14 计划里预先警告的同一问题，T9 替它做了实证。
Task 9: 顾虑 3 —— brief 说「7 个 handler 需补解构」，实测只需 **5 个**：`GET /swigger` 不消费路径、`GET /global-lines` 属 Task 10（其 Step 3 明确改这 6 条路由）。我按 grep 结果外推、未逐个核对消费面。
Task 9: 顾虑 4 —— **我的自检预期又错了**：常量 grep「命中 0」不可达，因为 11 行**声明本身**就是命中。实测 12 命中 = 11 声明 + `:48`（Task 10 的注册表）；移除后真实漏网点 0、`filesRoot` 已无生产传参点。判据应为「除声明与已知归属外无其它引用点」。已修计划文本。这是今日第四次「我的验证方法有缺陷」。
Task 9: 顾虑 6 —— 中途 2 次全量运行有超时抖动（失败文件每次不同、单跑均通过）。记录备查，不阻塞。

Task 9: header-decode 修补完成（`c61ca2ca`，`spaceStore.mjs` 头分支按裁决原样加 `decodeURIComponent` 带 catch；`?space=` 与 `parseSpaceCookie` 未动）。`spaceDispatch.test.mjs` 新增第 9 例含 5 条断言：编码中文名 → 200 且落在张三空间；编码未知值 → 400 且消息含解码后 id；**`X-Space: 100%` → 400 而非 500**；ASCII `zhangsan` 用例保留覆盖「裸值恒等」。回归：`server/` 494 全绿、**全量 153 files / 2674 tests exit 0**、`audit:names` 干净。
- **Ruling 的后果被实现者用变异钉住（重要）：我加的 `try/catch` 是承重的，不是防御性冗余。** M10 变异（保留解码、去掉 try/catch）→ **`expected 500 to be 400`**：`decodeURIComponent` 对裸 `%` 会抛，无 catch 时异常冒到派发层最外层，把 malformed 头的 400 升格成 **500**。**这是本次裁决新引入的回归面**（改动前 `%` 在头里无害）。M9 变异（去掉解码）→ `expected 400 to be 200`，正是我预测的失败模式。两条均实测只红该用例。
Task 9: 顾虑 6 的根因已定位 —— 不是测试不稳，是**同一工作区多个队友 agent 并发跑测试**（单次全量 `collect` 累计 1043–1117s），某例 5000ms 超时后重跑即过（单跑 304–542ms）。属编排环境产物，非代码问题。
Task 9: 交接给 T13/T14/前端阶段 —— 三条通道对非 ASCII id 的用法现已统一：**`X-Space` 头与 Cookie 都需客户端 `encodeURIComponent`（服务端各自解码一次）；`?space=` 由 URL 层解码。** 前端 `fetch` 侧若走头，须确认真的编码了。
Task 9: 顾虑 5 已被评审要求独立核验 —— 我已把「v1 派发点原测试不覆盖」列为评审的核查项之一，要求它对每条新断言指出能打红它的具体变异。

Task 9: review（opus，完整范围 3 代码 + 2 docs 提交）—— Spec ❌（1 处 brief 未列的半转换点）；无 Critical；**1 条 Important：跨空间写入**。
- **Important #1（评审发现，我已逐字核实）：`writeSchemeFiles` 半转换 —— 空间 A 的废弃文件被丢进默认空间的回收站。** `server.mjs:3544-3573` 已按 `options.paths` 取 `filesRoot`（`:3545-3546`），但 `:3571` 调 `archiveStaleSchemeFiles(filesRoot, expectedFiles, expectedDirs)` **漏传 options** → 内部 `options.trashRoot ?? paths.schemeTrash`（`:3040`）里 `paths` 回落 `defaultPaths` → 取 `data/schemes/trash`。触发路径活的：`PUT /webgrp/schemes?space=张三` → `handleSaveSchemes`（`:4180`）→ `writeSchemeFiles`。已派修复，要求补「哨兵文件进本空间 trash 且**不进**默认根 trash」双向断言。
- **Important 副作用：我在同两行发现第二处，评审清单里没有** —— `:3572 await globalLineRegistry.rebuildFromStorage()` 调**模块级单例**：保存空间 A 的方案时会去重建**默认空间**的注册表，且**完全没重建 A 的**。**判归 Task 10 而非本轮**：`registryFor(paths)` 是 Task 10 的产物，T9 硬改会造出与它撞车的临时第二套机制；已让 T9 只加一行 `TODO(Task 10)` 注释，并把它**显式写进 Task 10 的任务文本**（该调用点**不在** Task 10 原本点名的 6 条 `/global-lines/*` 路由里，只改路由会漏掉它）。
- **Ruling（方法论，第三类漏网形态，已写进计划）：我给的两种自检都对第三形态盲 —— 「传了部分实参、漏了 `options`」。** 常量 grep 抓**裸常量名**（这类传的是 `filesRoot` 形参）；无参 grep 抓**零实参调用**（这类传了 3 个实参）。`archiveStaleSchemeFiles(filesRoot, expectedFiles, expectedDirs)` 两种都不是。新增复核要求：对每个「已接 `options.paths`」的函数，逐个检查其**内部调用**是否把 options 透传 — 代价若错：跨空间写入静默发生（如本例把 A 空间的废弃文件写进默认空间回收站）。
Task 9: 评审对六条顾虑的裁定 —— 全部判定**正确**（顾虑 5「v1 派发点无覆盖」被评为「本轮最有价值的修正」；它独立核对 `spaceDispatch.test.mjs:35-37` 预置夹具、`:81-86` 双向断言，确认去掉 `...spaceCtx` 必红）。顾虑 6（超时抖动）无法从 diff 证伪，列为未验证项、不作通过依据。
Task 9: 评审确认的 Strengths 要点 —— 三个派发点注入形态与各自签名匹配（`:4649`/`:4658`/`:4674`）；native 短路确在解析之前（`:4630-4646`，与我独立核验一致）；缓存键三处照抄许可形态、一起改无部分空间化；`sendJsonCacheable`（`:1607`）的 ETag 由载荷内容派生而非路径派生，故无跨空间键问题。

Task 9: **裁定 Needs fixes**（五项核心要求都做对、新增断言判别力逐条成立；但 Important 1 须修、Important 2 须由 Task 10 闭合后才可信任本任务）。
Task 9: Important 1 的影响面（评审量化）—— 「trash 不是 `files` 的子目录、无任何端点枚举它（全仓 `schemeTrash` 只作写入目标，`server.mjs:3003-3042`），故不构成 API 可见的跨空间读；但边界已破，空间 A 的删除记录全部堆进默认空间的审计目录。」修法一行；现有测试全部直接调 `archiveStaleSchemeFiles` 并显式传 `trashRoot`（`server.test.mjs:1118-1122`），**无一覆盖 `writeSchemes` 在非默认 `paths` 下的落点，缺口目前无哨兵**。
Task 9: Important 2 的机制细节（评审给出，用于 Task 10）—— 模块级单例在 `server.mjs:46-49` 以 `schemeFilesRoot: join(schemeDataDir, "files")` 构造；`:3572` 的 `rebuildFromStorage()` 内部是 `readState(registryPath) + writeState(registryPath, state)`（`globalLineRegistry.mjs:1012-1020`），**方向是「默认空间被 A 的请求改写」，而非 A 的数据外泄**；6 条 `/global-lines/*` 路由那条则是 **API 可见的**（内容会返回给请求者）。评审同意我的裁定并加了一条**发布门禁：Task 10 落地前不得发布**，已写进 T10 任务文本。
Task 9: minor (deferred): `server.mjs:30-31` 注释「下面 11 个模块级路径常量保留为兼容别名（其余域尚未接参）」本任务后已失真（这些常量现已零引用），易误导下一个读者；Task 16 删常量时一并改。
Task 9: minor (deferred): `server.mjs:4636` 派发层 v1 分支的 400 走 `sendError(..., "SPACE_UNKNOWN")`，产出 `{error:{code,message}}` 而无 `ok:false`，与 `/swigger` 记录的 v1 信封不同形；按 `body.ok === false` 判错的 v1 客户端会看空。已写进 T11/T14 计划。
- **Ruling（T9 评审 Minor 3，采纳并写进 T11 计划）：`/webgrp/spaces` 四个管理端点必须加进派发层的短路名单** — 空间解析覆盖**所有**路径且在路由匹配**之前**，故 `POST /webgrp/spaces?space=新空间`（带着正要创建的空间名）会在解析处判 `unknown` → **400，永远到不了 handler**；删除空间后的管理请求则会被**静默回退 default**，语义错乱。与 `/exports/native/*` 同类 —— 都是与空间数据无关的元操作。注意 `GET /webgrp/spaces` 的 `current` 仍由该 handler 自行调 `resolveSpaceFromRequest` 取得，不受影响 — 代价若错：管理端点全部不可用（400），这是**响亮**的失败而非静默，故风险低但必修。
Task 9: minor (deferred，已写进 T11 计划): `isHostBound` 用 `url.pathname === apiPath(...)` 精确相等，路径变体（尾斜杠）既命不中短路、也命不中路由，会在空间解析处先被 400 而非 404。当前无客户端这么发，属「先校验、后路由」的结构性后果。
Task 9: minor (deferred): `spaceStore.mjs:261-266` 头解码后，id 含**恰好形如合法转义序列**的字面量（如 `a%20b`）的空间名须由客户端自行编码才能命中；裸 `%` 走 catch 回退原值（已由 `spaceDispatch.test.mjs:110-112` 钉住）。与 cookie 分支对称是裁决本意，可接受；三条通道的编码约定待写进前端与 CORS 说明（T13/T14）。
Task 9: minor (deferred): `spaceDispatch.test.mjs:50` 的 `expect(res.status).toBe(200)` 单独无区分力（实现前后都 200）；同用例 `:52` 的 `existsSync(.../zhangsan/images/manifest.json)` 才是判别项。

Task 9: 修复轮 1 完成（`9ef3ddd3`，只提交 `server.mjs` + `spaceDispatch.test.mjs`，未碰控制者的计划提交）。缺陷已逐字复现（`trashRoot` 回落 `defaultPaths.schemeTrash`），按授权修法补 `{ paths }`（该函数 options 在末尾 ✓；唯一生产调用点就是这处，`server.test.mjs:1118` 那处传显式实参，向后兼容）。`:3572` **只加 TODO 注释、未改语义**，未越界发明临时第二套机制 ✓。回归：`server/` 36 files / 495 全绿、**全量 153 files / 2675 tests exit 0**、`audit:names` 干净。
Task 9: 定向复审裁定 —— **All findings addressed, no new Critical/Important breakage**。Finding 1 ADDRESSED（`:3573` 现为 `{ paths }`，形参末尾正是 `options = {}`；调用链静态核对无断点：`:4523` 路由 → `:4524 handleSaveSchemes` → `:4184 writeSchemes` → `:510 writeSchemeFiles` → `:3545`）；Finding 2 ADDRESSED 且**未越界**（全文件 grep `registryFor` 无任何出现，不存在临时按空间机制）。
Task 9: 复审对双向断言的判别力给了逐条论证（关键）—— **默认根那半确为有效判别，非「路径永不存在」的空断言**：变异下 `options = {}` → `paths = defaultPaths` → `trashRoot = <dataDir>/schemes/trash`，`archiveSchemeStoreEntry:3018-3019` 会 `mkdir(join(trashRoot, archiveId, relativePath))` 并 `rename` 进去 → 该目录**确实被创建且确实含**哨兵，必红；同时本空间 trash 永不创建 → 另一半也必红。**两半由同一行决定、互不冗余。**另核实文件名 `废弃模型.json` 在本文件内只此一处，默认 trash 不会被其它用例污染成假红。
- **Ruling（复审 Out-of-Scope，采纳并改变 T10 范围）：模块级单例的残留调用点共 10 处，其中 4 处在内部函数里 —— T10 只改路由层与 handler 会漏掉那 4 处** — 我实测基线：内部函数内 4 处（`:393 hydrateProject`、`:3499 syncProject`、`:3540 detachProject`、`:3576 rebuildFromStorage`）+ handler 内 6 处（`:4132`–`:4172`）。复审原话：「仅记录以免 T10 只改路由层时再次漏掉『handler 内部函数里的调用点』这一形态」。它们与第三类漏网形态**同族**：调用点藏在被 handler 间接调用的函数里，改路由表与 handler 签名都碰不到。已把 10 处完整对照表写进 T10 任务文本，并要求改完后 10 处**全部**变为 `registryFor(paths).<method>(…)`、同时删除 `:46-49` 的模块级单例声明 — 代价若错：漏掉那 4 处则 4 个内部路径仍读写默认空间注册表，且是 API 可见的（返回给请求者）。
Task 9: 复审 Minor（不需改）—— `server.mjs:3573` 传 `{ paths }` 而非 `{ ...options, paths }`：若将来有调用方给 `writeSchemeFiles` 传 `options.trashRoot` 会被吞掉。当前无生产调用方传它，且修复前该行压根不透传 options，**相对修复前是严格变好、非回归**。
Task 9: complete (commits db9b724b..9ef3ddd3, review clean — 主审 Needs fixes → 定向复审全闭环)
Task 9: **T9 是全计划修复轮最多、发现面最广的任务**：3 代码提交 + 1 修复轮，合计暴露 1 条我的 spec 缺陷（X-Space 头不解码）、1 条跨空间写入（`:3571` 漏传 options）、1 条第二处跨空间读写（`:3572` 单例）、2 条前瞻性设计缺口（`/webgrp/spaces` 会被解析先拦、4 处内部函数调用点）、3 类自检盲区（裸常量 / 零实参 / 部分实参）。

BASE before T10: 9a746ee6
Task 10: 实现完成待审（`94707f96`，2 文件改 + 1 新测试；全量 **PASS(2678) FAIL(0)** 跑 3 次；`audit:names` 干净；既有测试一字未改）
Task 10: 十处调用点全部改毕 —— 内部函数 4 处需沿 `readSchemeProjectFile` → `readSchemeDirectory`/`readSchemeProjectRecord`/`scanProjectByIndex` 传 `paths`（三者均本文件私有，故无需停报），handler 6 处。自检：`grep "globalLineRegistry\."` **零方法调用命中**（仅第 20 行 import）；`grep "registryFor("` = 定义 1 + 调用 10。`globalLineRegistry.mjs` 仅加 `flush: () => locked(() => undefined)`（+5 −1）；`evictRegistry` 顺序为排空 → 驱逐。变异：M1 `flush` 置空 → 2 条红；M2 去掉 `await registry.flush()` → 1 条红。
- **计划缺陷（T10 偏差 ②，实现者主动发现并修正）：我 brief 第 2 条测试的 `existsSync === false` 不具区分力 —— 在「有 / 无 `flush`」下都为真。** 实现者改为「对从未访问过的空间『李四』发首次 GET」，使在飞写在**同步段**入队，从而直接钉住排空语义。这是本计划反复出现的那类缺陷，而它不但认出、还构造出了有判别力的替代 —— 与 T5 那次「A2 不构成对被测代码的覆盖」同源，但这次找到了正面钉法。
Task 10: 偏差 ① —— brief 测试用 `x-space: 张三` 会被 undici 以 ByteString 拒绝（与 T9 同一问题），改用 `?space=` / percent-encoded 头。
Task 10: 未做/交接 —— 不碰 Task 11 的 `/webgrp/spaces`；**`evictRegistry` 之后的并发在飞请求窗口未堵**（驱逐后新到达的请求会重建注册表，使已删空间骨架复活），属 T11 删除流程范围，需在 T11 处理。
Task 10: 一次全量运行有 `src/iconLibraryIntegrity.test.ts` 超时闪失（592/594 套件过），单跑与后续两次全量均绿；与本改动无代码关联。

Task 10: 评审 Spec ✅（十处调用点**逐行核实全覆盖**，含 T9 点名的四处内部函数形态；模块级单例与 `schemeDataDir`/`schemeTrashDir` 一并删除且零残留引用；`flush` 为该文件唯一行为改动；既有测试零改动）。两处偏差均判**成立**；偏差②的分析比实现者更深 —— 评审验证了入队发生在 handler 的**同步段**（`:4656` 空间解析无 await、`:4671` 同步调 handler、`:4139` 同步调 operation），故 `await arrived` 返回时队列必非空、`evictRegistry` 一定命中，`:110` 断言在「无 flush」下必红 —— **是真修不是搬家**。
Task 10: 评审对 `flush` **完备性**的严格验证（这正是我设计所依赖的前提）—— `globalLineRegistry.mjs` 全部 **8 处 `writeState`**（`:752/799/813/831/847/984/1008/1016`）都在 `locked()` 回调内，**7 个 `ensureInitialized` 调用点**（`:764/769/782/806/820/838/854/999`）也全在锁内 ⇒ **不存在绕过队列的写**，故 `locked(() => undefined)` 追加到队尾即可保证「返回时队列已空」。
Task 10: 评审另核实 `registryFor` 全同步（`:47-57`，get/set 之间无 await）⇒ 并发首次使用不会构造两个实例；缓存键 `paths.root` 确实区分空间（default 取 `resolve(dataRoot)`、其余取 `dataRoot/workspaces/<id>`，无碰撞）；唯一需改签名的 `readSchemeProjectFile`（`:410`）与 `scanProjectByIndex`（`:3449`）均**非 export**，波及面为零。
- **Task 10: 评审的一处标识错误（结论正确，我独立核验）** —— 它把 T5 的混根守卫称为「head `server.mjs:3144-3146` 的 `isPathInside` 越界检查」。实际 `:3144-3146` 是 **ZIP 条目路径穿越检查**（`zip 文件包含越界路径。`，另一道守卫）；T5 的混根守卫因 T10 插入代码而后移到 **`:3172-3174`**。它的结论「Task 5 守卫未动」仍成立 —— 我独立核验 `:3168-3174` 四行警示注释 + 守卫表达式逐字在位。**教训：评审对「未改动」的结论要自己复核一遍行号，因为「未改动」的判据常是 diff hunk 范围，而行号会随其它改动漂移。**

Task 10: **裁定 Approved**。唯一 Important 是 brief 自身划给 T11 的 plan-mandated 遗留（实现者已如实披露），本 diff 内不可修、不构成阻断。
- **Ruling（T10 评审 Important 1，采纳并推翻我 T11 的一条设计假设）：`evictRegistry` 的「排空 → 驱逐」关不死窗口，且窗口不在「evict 之后到达的请求」，而在「已解析完空间、卡在读 body 的在场请求」** — 五个写类 handler（`server.mjs:4155` `handleAttachGlobalLine`、`:4166/:4174/:4182/:4190`）**全部先 `await readJsonBody` 再 `registryFor(paths)`**：请求在同步段完成空间解析（`:4656`）→ `await readJsonBody` 挂起（**此时还没调过 `registryFor`**）→ 删除流程跑 `evictRegistry`，`registries.get` 未命中**直接早退** → 请求恢复后首次构造 registry，按已删空间旧绝对路径 `atomicWriteFile` → 骨架复活。GET/list 类无此窗口（同步段即入队）。**故我 T10 计划里写的「T11 只需在返回后调 `store.remove(id)`」是错的。** 修法：**tombstone 必须在删除流程开始时设置**，不是 evict 之后 —— 因为要防的请求在删除开始前就已入场，晚设就漏。**测试必须走写类路径**（PUT/POST）——只测 GET 钉不住，那条路径本就没这个洞。已据此重写 T11 的对应段落 — 代价若错：tombstone 设晚了则删除空间后骨架复活（静默），且 GET 类测试会给出「已覆盖」的假信号。
Task 10: minor (deferred): `spaceGlobalLines.test.mjs:16` 的 `SPACE_HEADERS` 全文未使用（4 处请求全走 `?space=`），是偏差 ① 的残留死代码；文件头注释宣称可走 percent-encoded 头，但该分支（`spaceStore.mjs:261`）无用例覆盖。修法：删该行，或让测试 1 某条改走头。
Task 10: minor (deferred): `server.mjs:68` 的 `registries.delete(spaceRoot)` 无任何断言可使其变红（删掉仍三绿）—— registry 的 state 每次经 `ensureInitialized` → `readState` 从盘重读，清与不清在 HTTP 面上不可观测，差别仅在内存。属覆盖缺口而非缺陷。
Task 10: minor (deferred): `spaceGlobalLines.test.mjs:72` 断言 `dataDir/schemes/global-lines.json` 存在，对「跨空间隔离」不具区分力（共用单例时同样为真）；真正有区分力的是 `:68` 与 `:71`。另一条 `:116` 在无 flush 变异下不可达（`:110` 先红），属冗余覆盖。
Task 10: minor (deferred): `server.mjs:410` 新引入的 `paths = defaultPaths` 默认值让漏传**静默回落默认空间** —— 正是本任务要消灭的语义（原 bug 来源）。当前 3 个调用方都传（`:481/:3432/:3475`），无实际缺陷；建议后续新增调用方时该形参必传。
Task 10: minor (deferred): `server.mjs:46` 的 `registries` 无上限、server 关闭不清理。空间数由 `spaces.json` 人工创建限定，可接受。
Task 10: complete (commits 9a746ee6..94707f96, review clean — Spec ✅ / Approved)

BASE before T11: f793a601
Task 11: 实现完成待审（`7b647d73`，2 文件 +274/−5；新测 11 绿；全量 **155 files / 2689 tests 全绿**；`audit:names` 干净；既有测试零改动）
- **Ruling（T11 顾虑 1，采纳实现者的偏离 —— 它用红灯推翻了我的指令）：tombstone 不能在 `remove` 完成后清除，必须在删除成功后**保留**登记** — 我原先要求「`spaceStore.remove(id)` 完成后清除」。照做时 tombstone 测试红在 `expected 201 to be 409`：**卡在读体的请求是在 DELETE 响应之后才恢复的**，撤下后它照样构造注册表并把 `workspaces/<id>/` 写回来。我那条理由（「id 已从注册表消失，后续请求只会得到 400 或回退，不会再来构造」）只对**会重新解析的新请求**成立，对**已在场的在飞请求**不成立 —— 而后者正是这个窗口的全部内容。实现者改为不变量：删除成功**保留**登记，仅在「同名空间经 POST 重建」或「删除失败」时撤下；变异验证 4 组全部能红（含关掉守卫后目录真的复活）。**它的判断优于我的指令。** 术语纠正：这不是 tombstone（临时遮蔽），是**退休登记**（retired，进程内永久直到重启） — 代价若错：若保留登记太宽，非 HTTP 建空间的路子重建同名 id 会保持退休到重启（实现者已在顾虑 2 披露）。
- **计划缺陷（T11 顾虑 3）：我 brief 的 `touchLastAccess(spaceId)` 在短路后必然是 `undefined`，是死代码。** 实现者改为用 handler 自算的 `current`，并「先刷再列」。这是我的又一处 brief 缺陷。
Task 11: 顾虑 2 —— tombstone 放在 `server.mjs` 靠近 `registries`（同键 `paths.root`）而非 brief 建议的 `spaceStore`：**`registryFor` 是模块级函数、拿不到可注入的 store 实例**。已知限制：非 HTTP 建空间的路子（脚本 / 测试里注入 store 后调 `create`）重建同名 id 后该根会保持退休到重启。
Task 11: 顾虑 4 —— `---` 这类「全横线」名字不会被 `SPACE_NAME_INVALID` 拒（正则保留了 `-`）；按 brief 原样保留但已标注。
Task 11: 顾虑 5 —— 删除失败时的撤下分支无测试（无法稳定制造 fs 失败）。

Task 11: 评审 Spec ✅（4 端点、短路名单、删除顺序、测试要求均落地）；**顾虑 1 被判「正确的修正，且优于 brief 原文」**。评审的论证比实现者更到位：「被防的那条请求不重新解析空间，它手里就是删除前定死的 `paths`（`server.mjs:4733`），因此**不存在一个『撤下后安全』的时刻** —— 只要撤下，它恢复后就会 `ensureInitialized` → `atomicWriteFile` → 目录复活。**按时间撤必然是赌 racing，改成按状态撤（重建/删除失败）是把『时间窗』变成『不变量』，这是更小且更强的设计。**」
Task 11: 评审逐条核实的关键事实 —— 短路改造把 `isHostBound` 语义化重命名为 `isSpaceAgnostic`（`server.mjs:4719-4725`）；`registries.set` 全文件仅 `:65` 一处（无第二条构造路径）→ 登记确实被 `registryFor` 消费；窗口测试走 `POST /webgrp/global-lines/attach`（`spaceApi.test.mjs:135`）对应 `handleAttachGlobalLine` 先 `readJsonBody` 再 `registryFor`；`spaceStore.create` 全文件仅 `server.mjs:4524` 一处调用 → **HTTP 侧唯一创建点**；409 经 `GlobalLineRegistryError(message, statusCode=400)`（`globalLineRegistry.mjs:22`）+ `server.mjs:4150-4152` 按 `error.statusCode` 响应可达客户端；删除后新请求走 `resolvePaths` 抛错（`spaceStore.mjs:164-172`）→ 显式来源 400 / cookie 来源静默回退，都不再落到退休根。**「实现者自述的限制（用 store 直接建空间不撤登记）在当前代码里不是真实生产路径」** —— `injectedSpaceStore` 只被 `spaceDispatch.test.mjs:26`、`spaceGlobalLines.test.mjs:23` 两个既有测试用，无人做「HTTP 删 + 注入 store 建同名」；`scanWorkspaces` 只在首次 `load()` 跑（`spaceStore.mjs:91-113,130`），进程内不会重新发现被删目录。
Task 11: 评审**驳回实现者的顾虑 5** —— 「fs 失败不可稳定制造」只对真实 fs 成立，对本仓库不成立：`createImageServer` 有 `injectedSpaceStore` 注入口（`server.mjs:4485,4491`）且既有测试已在用，注入一个 `remove` 抛错的 store 即可覆盖 `server.mjs:4557` 那一行。
Task 11: 评审确认顾虑 3（`touchLastAccess` 死代码）—— 短路后 `spaceCtx={}`，`spaceId` 必为 `undefined`，brief 原句确为死代码；改为 `touchLastAccess(current)` 且**先刷后列**（`server.mjs:4508-4510`）语义更正确（本次响应即见新 `lastAccessAt`）。
Task 11: 评审确认顾虑 4 —— `---` 会经 `spaceIdFromName` 兜底成 id `"space"`（`spaceId.mjs:16-20`），与 `server.mjs:4519` 注释「空名与全符号名一律拒绝」不符；无穿越风险。见 Minor 1。
- **Important 1（待补全）：`server.mjs:4557` 的撤下会把并发 DELETE 的输家变成「登记被清空」，破掉本任务赖以成立的不变量** — 场景：同 id 两个 DELETE 同时在飞，A 完成 `remove` 后 `state` 已无该空间；B 在 A 的 `writeState` 之前跑完同步段（A 的 `mkdir`/`rename` 是 I/O 让出点，事件循环可在此投递 B 的同步段），于是 B 因「未知空间」失败 → **撤下登记** → 空间已删而登记没了 → 洞口重开。**我自己的推演（待评审全文确认）**：「删除失败就撤下」不能整段删掉 —— 若 fs 真失败、空间**仍在**，保留登记会让它永久退休（空间存在却构造不出注册表），比原缺陷更糟。精确修法应是**按失败原因分流**：失败若是「未知空间」（说明别人已删成功）→ **保留**登记；失败若是真实 fs 错误（空间仍在）→ 撤下。

Task 11: 评审 Important 1 **全文与修法**（与我的推演一致，且论证更完整）—— 并发双 DELETE 推演 6 步；修法一行，按**状态**而非按是否抛错判定：`if (root && spaceStore.has(String(body?.id ?? ""))) retiredSpaceRoots.delete(root);`。评审明确否决「整段删掉撤下分支」：那会把任何删除失败变成活空间的**永久只读**（登记留着、`registryFor` 一路 409 到重启），且「同 id 被 POST 重建」的自愈路径走不通 —— 空间仍在 `taken` 里，`spaceIdFromName` 给出 `X-2`（`spaceId.mjs:23-29`），永远命不中那个根。失败非纯理论：Windows 上目录内含被占句柄时 `rename` 会 `EPERM/EBUSY`（`spaceStore.mjs:210-215`）。补测：注入一个 `remove` 抛错的 store（`injectedSpaceStore` 注入口 `:4485/:4491` 既有测试已在用）。
- **Important 2（评审新发现，比我先前理解的更宽）：marker 只护住 `registryFor`，其他写类 handler 仍能让已删空间复活。** `PUT /webgrp/schemes` → `handleSaveSchemes` 先 `await readJsonBody(request, maxSchemeBodyBytes = **64MB**)`（`:4206`）再 `writeSchemes`（`:4213`）→ `ensureSchemeStore` 直接 `mkdir(paths.schemeFiles, {recursive:true})`（`:530-532`）；**体量比 global-lines 大 64 倍、调用频率高得多，故这个窗口实际比已堵的那个更宽**。同类还有 `POST /webgrp/images`（`:4517`）。
- **Ruling（Important 2 的修法，我否决评审建议、改用结构性前缀判定）：不按 handler 逐个加检查（那是打地鼠，写类 handler 十几个），改为在三个建目录入口用 `retiredSpaceRoots` 做路径前缀判定** — `retiredSpaceRoots` 在**模块作用域**（`server.mjs:54`），故模块级 helper 直接读得到，**不需要评审提议的注入回调**（它自己说那「超出本任务范围」）。新增 `isUnderRetiredRoot(target) = [...retiredSpaceRoots].some(root => target === root || target.startsWith(root + sep))`，塞进 `ensureJsonStoreFile`（`:299`）、`ensureSchemeStore`（`:530`）、`ensureStore` —— 这三个是所有写盘的必经之路，一次覆盖全部；`ensureJsonStoreFile` 只有 `dirPath` 没有 `paths`，这正是我选**前缀法**而非「取 root」的原因。测试必须走写类路径（PUT/POST，可复用 `spaceApi.test.mjs:135` 那套「先 flushHeaders / 后补 body」手法），只测 GET 钉不住 — 代价若错：若仍有绕过这三个入口的写盘路径，窗口就还在（已请评审点名确认覆盖面）。
Task 11: 评审 Minor —— ① `server.mjs:4519` 注释与行为不符：`---`/`___` 通过校验并被 `spaceIdFromName` 兜底成 id `"space"`；改注释或把正则收紧为 `[^\p{L}\p{N}]+`。② `spaceApi.test.mjs:111` 注释「张三此前从未被访问过」不成立（上一条 cookie 用例 `:98-104` 已 `touchLastAccess` 过它），断言仍有牙但注释失真。③ `server.mjs:4509` 每次 `GET /webgrp/spaces` 都写一次 `spaces.json`，轮询场景可按分钟节流。④ `spaceApi.test.mjs:92` 只证明 `trash-spaces` 下存在路径段为 `待删` 的目录，不证明目录**内含**载荷。⑤ `server.mjs:4508-4510` 管理端点短路后不再走派发层 fallback 回写分支（`:4734-4739`），故 `GET /webgrp/spaces` 带未知 cookie 时只回落首个空间、**不回写 `set-cookie`**，与其它端点回退语义略不一致（`current` 值正确，无功能影响）。⑥ `server.mjs:317` `readOptionalJsonStoreFile` 在**读**路径上就 `mkdir`。

- **Ruling（我的覆盖面主张被评审驳回，采纳其修正）：我那个「三个建目录入口覆盖所有写盘路径」的说法是错的 —— `writeJsonStoreFile`（`:326-329`）是 `ensureJsonStoreFile` 的同族兄弟，有自己独立的裸 `mkdir(dirPath)`，不经 `ensureJsonStoreFile`。** 漏它的后果是 `PUT /color-config`（→`:593`）、`PUT /measurement-config`（→`:936`）、`PUT /device-library`（→`:1579`）**三条写路径全线复活**，且这三条 handler 与 `handleSaveSchemes` 完全同形状（先 `readJsonBody` 再写）；`writeManifest`/`writeImageFolders` 也走它，故图片文件夹 CRUD（`:4066/4093/4109`）同理。**评审原话：「只加三个 `ensure*` 而漏掉这个同名兄弟函数，是最容易发生的一种漏。」** 已把清单改为五处（`ensureJsonStoreFile:299` / **`writeJsonStoreFile:326`** / `readOptionalJsonStoreFile:317` / `ensureSchemeStore:530` / `ensureStore:331`）。**方法论教训：我按「函数名族」推断调用关系（以为 `ensure*` 是写路径的唯一入口），而实际是「兄弟函数各自裸 mkdir」——凡「某处是唯一入口」的断言，必须逐个函数读实现，不能按命名推断。** — 代价若错：漏 `writeJsonStoreFile` 则三条配置写路径与图片文件夹 CRUD 全部仍能复活已删空间。
- **Ruling（评审的明确禁令，采纳）：不要改 `shared/atomicWrite.mjs`。** `writeTextIfChanged`（`:285-296`）→ `atomicWriteFile` 自身也 `mkdir(dirname)`，但它的 in-server 调用点只有 `:304`（`ensureJsonStoreFile` 内）、`:328`（`writeJsonStoreFile` 内）、`:3558`（同函数 `:3530` 已先调 `registryFor(paths)`，墓碑兜住）—— 前两处已被五处清单覆盖。而 `atomicWrite.mjs` 被脚本与 `nativeExportSave` **共用**，改它会把共享工具耦合到 server 状态。
Task 11: 评审裁定 —— **Needs fixes**（端点/短路/删除顺序/测试要求全落地，撤下时机偏离经独立推理确认是正确且更强的设计；但 `:4557` 并发下清空墓碑需一行修，且墓碑未覆盖方案/图片之外的若干写路径，使「已删空间不复活」只完成了一部分）。

Task 11: 修复轮 1 完成（`722507e7`，新 commit 未 amend；`spaceApi.test.mjs` 15 绿；全量 **155 files / 2693 tests 全绿**；`audit:names` 干净；既有测试一字未改）。**实现者在我修正消息到达前就独立发现了同一缺口**（它原话：「你给的『三个入口是所有写盘的必经之路』不成立」），主动补了 `writeJsonStoreFile` / `readOptionalJsonStoreFile` 两处守卫 —— 共 **6 处守卫**（含原有 `registryFor`）。
Task 11: 修复的两处细节比我的指令更严密 —— ① `isUnderRetiredRoot` **含 `sep`**，否则前缀匹配会让 `张三` 误伤 `张三丰`；② 错误类 `RetiredSpaceWriteError`(409) 由**派发层外层 catch 采用自带 `statusCode`**，否则非全局线路的路由会把 409 退化成 **500**。
Task 11: 实现者的自省（值得记）—— `PUT /schemes` 的**状态**断言即使不修也仍是 409，因为 `writeSchemeFiles` 末尾的 `registryFor().rebuildFromStorage()` 会兜住；**真正钉住结构性守卫的是同一条用例里的「目录不复活」断言**。这种区分「哪条断言才是判别项」的自省正是本计划反复强调的事。
Task 11: 两条 Important 的落地与变异 —— ① 撤下条件改为 `if (root && spaceStore.has(id))`（按空间是否还在，不按有没有抛错）；注入 store 替换 `remove` 钉住两条时序：fs 报错但空间仍在 → 恢复可写（变异删掉该分支即红）；被抢先删掉却仍报错 → 登记必须保留（变异退回无条件撤下 → 在飞请求 201 并复活目录，实测红）。② 前缀判定 + `assertNotRetiredRoot` 落在写盘入口，并补一条 `PUT /color-config` 的在飞用例钉住它（变异去掉该守卫 → 整条 200 落盘并建回 `settings/`）。
- **我独立复核守卫覆盖面，发现清单第三次不完整（评审仍可能自行撞上，待其结论汇总后一并派修）：`importSchemeArchiveBuffer`（`server.mjs:3240`）的 `mkdir(filesRoot, {recursive:true})`（`:3244`）无守卫，而它由 `POST /webgrp/schemes/import` 到达 —— 一个先读最多 **256MB** ZIP body 再调用的写类 handler，窗口比已堵的两处都宽。** 我扫了 `server.mjs` 全部 **19 处 `await mkdir(`**：受守卫的 6 处中 5 处明确对应（`:321/:340/:350/:359/:557`），另一处（`:534`，`readSchemesFromFiles` 内）经查其两个调用方为 `POST /schemes/import`（`:4371`，写类！）与 `GET /schemes`（`:4629`，读类无 body 无窗口）—— 即 `:534` 也是写类可达。
- **Ruling（根因与方法修正，采纳）：停止枚举入口点，把不变量下沉到 `mkdir` 原语 —— 新增模块级 `mkdirInSpace(target)`（先 `assertNotRetiredRoot(target)` 再 `mkdir(target,{recursive:true})`），把 `server.mjs` 内 **全部 19 处 `mkdir` 调用改走它**，并以「`grep -n "await mkdir(" server/server.mjs` 应为 0」作为可检不变量。** 三次迭代都在同一坑：我先枚举「`ensure*` 族是唯一入口」（错，`writeJsonStoreFile` 是兄弟函数各自裸 mkdir）→ 补成 5 处+`registryFor`（仍错，`importSchemeArchiveBuffer` 独立裸 mkdir）→ 现在第三次。**枚举必然漏，因为判据「谁是入口」依赖调用关系，而调用关系会随代码演化；把守卫放在原语上则无需枚举，未来新增的 mkdir 也天然在网内。** 同理不要改 `shared/atomicWrite.mjs`（被脚本与 nativeExportSave 共用） — 代价若错：若仍有绕过 `mkdirInSpace` 的建目录方式（如 `writeTextIfEmpty`→`atomicWriteFile` 自带的 `mkdir(dirname)`），窗口仍在；该路径的 in-server 调用点已在 6 处守卫内，且新增 grep 不变量可继续兜。

Task 11: 修复轮 1 复审 —— **Important 1 = ADDRESSED**（`:4585` 现为 `if (root && spaceStore.has(id))`，评审逐条走过四条时序确认：`resolvePaths` 抛错 → `root` 保持 undefined 且 add 未执行，无残留；`evictRegistry` 抛 → has 真 → 撤下；`remove` fs 报错 → has 真 → 撤下；被并发抢先 → has 假 → 保留。两条新用例都真钉住各自那一半，非空断言）；**Important 2 = NOT ADDRESSED**（五个 store 入口 + `registryFor` 确实落地，但**方案记录一族完全裸露**）。
Task 11: 复审**用一次性探针脚本实测**（写在系统临时目录、已删、未改工作树；用 `server.once("request")` 停靠只发头不发体的写请求）—— 给出了比我更完整的清单：
```
[CASE /schemes/scheme]  parked status=200 dirAfterRelease=true  <== RESURRECTED
[CASE /schemes/project] parked status=409 dirAfterRelease=true  <== RESURRECTED
[CONTROL /schemes]      status=409 resurrected=false            ✓
```
- **实测可复活（阻断）**：`:3309`/`:3299` `saveSchemeRecordDirectory` ← `PUT /webgrp/schemes/scheme`（**连 409 都没有**，整条 200 且目录复活）；`:3535` `saveSchemeProjectRecord` ← `PUT /webgrp/schemes/project`（409 来自其后的 `registryFor`，但 `:3535` 已先把目录建回）。
- **同类未实测**：`:3244`/`:3273` `importSchemeArchiveBuffer`、`:3165`/`:3184`/`:3187` `extractSchemeZipToDirectory`（← `POST /webgrp/schemes/import`）、`:534` `readSchemesFromFiles`（GET 无读体停靠独立不可达，主要经 `:4371` 落在 import 路径上）。
- **已排除（非复活向量，附理由）**：`:3075` `archiveSchemeStoreEntry`（前置 `stat` ENOENT 即返回，`:3064-3073` 空空间不 mkdir）、`:3446`/`:3452` `allocateStableProjectIndex`（唯一调用者已在 `:3535` 建过）、`:3603`/`:3611` `writeSchemeFiles`（唯一调用者 `writeSchemes` 先走被护住的 `ensureSchemeStore`）。
- **关键判断（我据此改成原语级修法）**：上述三项「已排除」**全是依赖调用顺序的推理**，其正确性会在下一次改动中静默失效 —— 这正是三轮枚举都漏的同一根因。
- **Ruling（修复轮 2 派发）：不再给逐点清单，改给 `mkdirInSpace` 原语方案 + 两条必测**（`PUT /schemes/scheme` 断言 409 且目录未复活；`PUT /schemes/project` 断言 409 **且目录未复活** —— 后者能区分「被 later registryFor 兜住」与「真被守卫拦住」）。
Task 11: 复审 Minor（待补全尾部）—— `server.mjs:4816` 外层 catch 改为采用 `error.statusCode`：全仓仅两个携带 `statusCode` 的错误类（`globalLineRegistry.mjs:22-25`、新增 `server.mjs:63-68`），范围可控；但任何逃到外层 catch 的 `GlobalLineRegistryError` 由 500 变为 400/409。

Task 11: 复审裁定 —— **Fix round: Findings remain open — Important 2 NOT ADDRESSED**（Important 1 已解决，无 Critical 新破坏）。评审对实现者的定性**公正**：实现者忠实实现了给它的落点并主动多补两处，**失效在清单本身** —— 它指出实现者在报告 §9.2 已写下「按主控指定的结构：模块级前缀判定 + 在**建目录入口**拒绝（不做逐 handler 打地鼠）」，**「落点清单本身就是地鼠，『建目录入口』这个抽象没被真正做到」**。修复轮 2 改原语级正是对的方向，故判 **Fair 而非 Poor**（若轮 2 落到底并配一条非 mkdir 不变量可到 Excellent）。
Task 11: 复审**验证并排除**了一条潜在 Critical（值得记）—— `DELETE /webgrp/spaces` 传 id `".."` 时，`join(dataRoot,"workspaces","..")` 会退役**整个数据根**，是最坏情形；实测不存在：`resolvePaths`（`spaceStore.mjs:164-168`）先抛「未知空间」，`root` 保持 `undefined` 而 `retiredSpaceRoots.add`（`server.mjs:4576`）根本未执行。同理 `{id:""}` / 不存在的 id 亦不污染登记。
- **Ruling（复审的追加收口，采纳）：`writeTextIfChanged`（`server.mjs:305`）开头也要走 `assertNotRetiredRoot(filePath)`** — 复审指出 `atomicWriteFile`（`shared/atomicWrite.mjs:15`）**自己做 `mkdir(dirname(filePath))`**，是一条绕过 mkdir 的独立建目录路径，`grep "await mkdir(" == 0` 检测不到。它 4 个调用点中 `:325`/`:351` 前紧邻被守的 mkdir，但 `:3583`/`:3616` **靠调用顺序兜住** —— 正是我已停用的那种推理。收口一行（`assertNotRetiredRoot` 收任意路径、做的正是前缀判定，无需新原语）。修正后的不变量：「`server.mjs` 内一切建目录调用（`await mkdir(` 与 `writeTextIfChanged(`）均经退休守护」。**不改 `shared/atomicWrite.mjs`**（被脚本与 `nativeExportSave` 共用），在调用方拦。
- **Ruling（复审点名的「不是漏洞、不要纳入」两处，采纳）**：`server/spaceStore.mjs:213` 的 mkdir 建的是 `trash-spaces/<stamp>`（在 `workspaces/` 之外，属**删除动作自身**，不该被退休根前缀拦住）；`server/nativeExportSave.mjs:266` 的 `atomicWriteFile` 走 `/exports/native/*`（**空间无关端点**，写用户指定路径，同理不纳入）。两处保持原样并在报告说明理由。
Task 11: 复审另记两条新 Minor —— ① `:4816` 的 `statusCode` 透传使 5 条全局线路路由的 409 **完全依赖**该分支（`handleGlobalLineRegistryOperation` 只映射 `GlobalLineRegistryError`，不再接住 `RetiredSpaceWriteError`），两处任一回退即退化为 500；② 既有：`DELETE /webgrp/spaces` 对非法 id 只回笼统的 `SPACE_DELETE_FAILED`，无独立错误码。

Task 11: 修复轮 2 完成（`e8fe014d`，`server.mjs` +55/−25、测试 +44；`server/` 38 files / 515 绿；全仓 **155 files / 2695 绿**；`audit:names` 干净；`git status --short shared/` 空）。实现要点：`mkdirInSpace`（`:82-85`）在 `assertNotRetiredRoot` 之后、`mkdirRaw` 之前；19 处 `await mkdir(X, { recursive: true })` 全部改走它；**`node:fs` 的 `mkdir` 在导入处改名 `mkdirRaw`**（比 grep 更强的机制 —— 新增的裸 `mkdir` 会直接 ReferenceError）；**原先加在 5 个 `ensure*`/`write*` 上的逐点守卫已删除**（原语已覆盖，留着是两套机制做同一件事），现在只剩 `registryFor` 与 `mkdirInSpace` 两个必经点。不变量实跑：`grep -Fn "await mkdir("` → 0；`mkdirInSpace(` → 19。（注：不加 `-F` 时 rtk 钩子会把模式重写成 rg 正则并对 `(` 报错 —— 与今日我踩的同类坑。）
Task 11: 两条新增在飞用例的变异结果**与复审实测形态逐条对上** —— `/schemes/scheme` → `expected 200 to be 409`（= 复审的「200+复活，连 409 都没有」）；`/schemes/project` → `expected true to be false`（= 复审的「409 但目录已复活」，**红在「目录未复活」那句而非状态码**）；连带 `/schemes`、`/color-config` 两条也红。这正是我要求的区分度。
Task 11: 我的补充消息（`writeTextIfChanged` 加判定）与大改几乎同时到达、**未被处理** —— 我核实 `server.mjs:315` 的 `writeTextIfChanged` 无该判定。已补发聚焦指令。
- **Ruling（为什么这一行仍需补，尽管当前功能正确）：`writeTextIfChanged` 的 4 个调用点目前每个前面都恰好有一个 `mkdirInSpace`，故今天闭合；但这闭合靠的是调用顺序，正是本轮要消灭的推理。** 将来有人在没有前置 `mkdirInSpace` 的新函数里调一次 `writeTextIfChanged`，不变量就静默失效。修正后的不变量表述：「`server.mjs` 内一切建目录调用（`mkdirRaw` 与 `writeTextIfChanged`）均经退休守护」 — 代价若错：无（一行 + 覆盖全部调用点，且不改共享的 `atomicWrite.mjs`）。

Task 11: 修复轮 2 收尾完成（`776f53c5`，+25/−3；`server/` 38 files / **516 绿**；全仓 **155 files / 2696 绿**；`audit:names` 干净；`git status --short shared/` 为空；无 MUTATION-PROBE 残留）。`writeTextIfChanged` 函数体开头加 `assertNotRetiredRoot(filePath)`（`server.mjs:315`），未新建原语。不变量实跑：`grep -Fc "await mkdir("` → 0；`grep -Fn "writeTextIfChanged("` → 5 = 定义 1 + 调用点 4（`337/361/3591/3624`）。
- **Task 11: 实现者的关键自曝（本计划一直在追的那件事）：该行守卫加完后先跑变异是 17 条全绿 —— 当时它不可证伪。** 原因：现有 4 个调用点在退休场景下都会先撞上被守的 `mkdirInSpace`，**HTTP 侧构造不出「未经 mkdirInSpace」的调用**。它的处理：`export` 该函数（该文件本就为测试导出 `ensureStore`/`saveSchemeRecordDirectory`/`evictRegistry` 等内部函数，惯例一致）并补一条直接调用它的用例；关掉该行后两条断言分别红 —— `promise resolved "undefined" instead of rejecting`，以及放行第一条后 `expected true to be false`（`workspaces/退役写盘/` 连 `schemes/` 被建回）。**即它拒绝留下一条无法被测试钉住的守卫** —— 那种守卫会被未来的重构删掉而无人察觉。这也是 §11.2 里说明的唯一偏离（新增一个 export）。
- **Ruling（T11 修复轮 2 的实施选择，采纳）：`mkdirRaw` 改名 + 删除 5 处逐点守卫** — 把 `node:fs` 的 `mkdir` 在导入处改名 `mkdirRaw` **比 grep 不变量更强**：新增的裸 `mkdir` 会直接 ReferenceError，而非悄悄绕过。删掉轮 1 的 5 处逐点守卫是正确清理（原语已覆盖，留着是两套机制做同一件事），现在只剩 `registryFor` 与 `mkdirInSpace` 两个必经点 — 代价若错：无。
Task 11: 两条不纳入的站点（照裁决保持原样，理由写进报告 §11.4）—— `spaceStore.mjs:213` 的 trash mkdir（在 `workspaces/` 之外、属删除动作自身，拦住它反而会让删除自己失败）；`nativeExportSave.mjs:266`（空间无关端点，写用户指定本机路径）。
- **Ruling（T11 实现者就 `export` 提出的取舍，裁决保留导出、不做可证伪性回退）：一条必要性没被测试钉住的守卫，会被未来的重构当成冗余删掉而无人察觉 —— 这比多一个导出严重得多。** 且该文件**本就有为测试导出内部函数的惯例**（`ensureStore`、`saveSchemeRecordDirectory`、`evictRegistry`），本计划在 **T7 已做过同类裁定**（给 `ensureStore`/`readManifest` 加 `export`，评审判「可接受且优于备选方案」，理由同为「备选会丢掉真实覆盖」）。此处判据一致，保持现状。实现者补的直接调用用例还额外钉住了「`atomicWriteFile` 的内部 mkdir 真会把整棵树建回来」这一机制本身，而非仅布尔断言 — 代价若错：公开面多一个内部函数导出，无行为影响。
Task 11: **过程亮点（值得留在记录里）：T11 是整条链上第一次由实现者自己发起「先证伪再交付」** —— 它加完守卫后先跑变异、发现 17 条全绿、判定自己刚加的守卫不可证伪，然后主动找办法（导出 + 直接调用用例）让它可证伪。本计划从 T1 起就在追这个东西，前六次都是评审或我事后指出。
- **需告知用户的副作用（已核实并保留，用户有权改删）：实现者 subagent 主动写入了用户的持久化记忆目录** —— `C:\Users\foree\.claude\projects\D--work-graph-modeling-platform\memory\mutation-before-delivery.md` + `MEMORY.md` 索引行。非我指示、非用户要求。核实结果：frontmatter 完整（`type: feedback`）、含 `**Why:**` 与 `**How to apply:**`、链接的 `[[reexport-no-local-binding]]` 确在索引中、索引行格式正确、内容准确。**该文件会在此后每个会话加载进上下文**，故已在给用户的汇报里显式点名。

Task 11: 修复轮 2 复审（第三轮，前一个 agent 传输失败已重派）—— **Important 2 = ADDRESSED，New Breakage: None（无 Critical/Important）**。守卫现只剩三处必经调用点：`mkdirInSpace`（`:83`）、`registryFor`（`:88`）、`writeTextIfChanged`（`:320`）；轮 1 的 5 处逐点守卫确已删除；`await mkdir(` = 0、`mkdirRaw` 仅在 `:2`（import 别名）与 `:84`。
- **复审自行重导覆盖面的方法与发现（我要求的「不要采信清单」）**：① 枚举一切能产生目录的系统调用（`mkdir`/`mkdirSync`/`rename`/`writeFile`/AdmZip 落盘）；② 对 `server/` 下全部 `.mjs` 做 `mkdir` 计数（22 文件命中，非测试的只有 `server.mjs` 30、`spaceStore.mjs` 4、`globalLineRegistry.mjs` 2）；③ 追 `server.mjs` 的静态+动态 import 与 `spaceStore`/registry 的所有调用点。**它发现了我没想到的第五条路径**：`registryFor` → `globalLineRegistry.mjs:231` 的 `writeState` mkdir —— 安全的原因是**全文件所有 registry 访问都是内联 `registryFor(paths).method(...)`**（`:459`/`:3565`/`:3606`/`:3640`/`:4196`/`:4204`/`:4212`/`:4220`/`:4228`/`:4236`），**不存在「先取实例、跨 await 后写」的持有者**；`registries` 只在 `registryFor`/`evictRegistry` 里被触碰。另核实 `server.mjs` 无 `mkdirSync`、无 `extractAllTo`/`writeZip`/`extractEntryTo`（AdmZip 只 `getEntries()`+`getData()`，落盘走已守的 `extractSchemeZipToDirectory`）；`writeFile`（`:3198`/`:3457`/`:3463`/`:3684`）与 `rename`（`:3088`/`:3311`）本身不建目录且父目录由前置已守的 `mkdirInSpace` 建出；`apiV1*.mjs`/`schemeArchive.mjs`/`svgExport.mjs`/`eFileExport.mjs`/`cimExport.mjs` 内 mkdir 计数为 0。
- **复审对两处排除站点给出了比报告更强的理由**：`spaceStore.mjs:213` 的路径是 `<dataRoot>/trash-spaces/<stamp>/<id>`，与退休根 `<dataRoot>/workspaces/<id>` 是**同级目录**，故**即使走守卫也不会被前缀判定拦住** —— 从结构上排除，而非靠「属删除动作自身」的语义理由；且 `retiredSpaceRoots` **永远不含 `dataRoot`**（`resolvePaths("default")` 才给出它，而 `DELETE` 在 `:4576` 就拦掉 `default`）。`nativeExportSave.mjs:266` 成立：目标路径来自 Windows 原生另存对话框（`:286-292` 存 token → 路径），端点被 `isSpaceAgnostic` 短路，服务端不持有任何空间根。残留（Info，非回归）：本机用户手动选中 `workspaces/<已删空间>/` 仍可写进去，那是用户对自己文件系统的直接操作。
- **复审对断言可证伪性的逐条变异表（关键区分成立）**：`/schemes/project` 的「目录不复活」是**判别性最强**的一条 —— 关掉原语判定后 `:3545 mkdirInSpace(schemeDir)` 先建目录、之后 `:3565 registryFor` 才补 409，红于 `expected true to be false`；而`/schemes/project` 的 **status 断言**关掉 `registryFor` 判定时**仍绿** —— **正是本轮要区分的「被原语拦住」与「被 later registryFor 兜住」两种形态**。
- 复审两条非阻塞观察：① `isUnderRetiredRoot` 每次 mkdir/write 都 `[...]` 展开一次集合，条目数受「进程内删除过的空间数」上界约束，可忽略；② 读取路径（`readSchemesFromFiles:545`、`readOptionalJsonStoreFile:353`）现在也抛 409 而非返回空，但只有「删除过程中在飞」的请求才可能带退休路径进这些函数（派发层对已删空间要么 400 要么回落），语义一致、非回归。
Task 11: complete (commits f793a601..776f53c5, review clean — 主审 Needs fixes → 修复轮 1（部分）→ 修复轮 2 复审全闭环；**T11 是唯一用满 2 个修复轮 + 3 轮评审的任务**)

BASE before T12: 776f53c5
Task 12: 实现完成待审（`afdf8fb7`，5 文件 +180/−20；`server/` PASS(523)（原 516，新增 7 例）；全仓 **PASS(2703)**；既有用例**零改动**（registry 测试 diff 删除行数 0）；`audit:names` 干净）
- **Ruling（T12 顾虑 1，否决兜底级）：不接受「未知空间前端保留兜底级」，改用「注册时归位」让筛选保持严格** — 实现者实测「纯严格筛选会打挂 5 条既有集成用例」（Node WS 客户端不发 cookie → `workspaceId=""`；无空间调用方按 §3 解析成 `default` → 不匹配 → 503）**属实**，但兜底级保留了本任务要修的错靶（未知空间的前端仍可能被某空间的调用选中）。修法：**在注册时归位** —— 解析不到已知空间时 `workspaceId` 取 `spaceStore.firstId()`（`default`），与派发层回退语义一致。于是无 cookie 前端属于 `default`、无空间调用方也解析成 `default` → 匹配 ✓ 那 5 条自然恢复；而请求空间 A **不会**选中 `default` 的客户端 ✓ 严格筛选成立。要求实现者确认 5 条在不改任何既有测试的前提下恢复绿；若恢复不了则停下报告 — 代价若错：若 5 条仍红说明另有成因（已要求它停下而非再发明绕过）。
- **Ruling（T12 顾虑 2，确认是我的计划缺陷并扩范围）：`apiV1Control.mjs` 的 11 个 handler 必须在同一轮一并接线** — 我核实该文件**没有任何空间概念**，文件头注释原文「query 可带 clientId（不指定取默认活跃客户端）」正是设计 §8.4 要修的错靶，且属**写**域（`device/add`、`save`、`template/saveFromSelection`）。设计 §8.4 说的「21 个会话类端点」= **10 runtime + 11 control**，而 T12 的 brief 只写了前者，T13–T16 也无一覆盖。已把两者一并写进计划任务文本（含「注册时归位」与「不要用兜底级」两条）。补测要求：两个空间各有一个在线客户端时，带 `?space=` 的 control 请求必须打到**该空间**的客户端 —— 该断言必须能区分「筛对了」与「恰好只有一个客户端」 — 代价若错：control 域（写域）仍是随机打靶，正是本设计立身要修的事。
- Task 12: 顾虑 3 裁定 —— 接受其**追加** describe 到 `apiV1Runtime.test.mjs`（纯追加、既有 22 例未改）：理由成立（wrap 接线契约属该文件，且本计划多轮评审都在抓「无覆盖的派发点」）；`/v1/runtime/clients` 响应加 `workspaceId` 与 swagger 同步归 T14。

Task 12: 修复轮 1 完成（`d2af8311`，7 文件 +237/−70；`server/` **PASS(526)**；全仓 **PASS(2706)**；`audit:names` 干净；既有用例零改动，`apiV1Runtime.test.mjs` 已逐字节还原到 T12 之前）。
- **修复用一个实验同时证伪了自己的方案并验证了裁决方案（关键证据）**：无归位时全套件 **PASS 462 / FAIL 64**（含那 5 条），归位后 **PASS 526 / FAIL 0** ⇒ 「无 Cookie 前端存成 `""`」是唯一成因，我的「注册时归位」假设成立、实现者原提的「兜底级」是多余的。
- 实施：`runtimeWs.workspaceIdForRequest()` —— Cookie 解析不到已知空间（缺 Cookie / 空间已删）时取 `spaceStore.firstId()`，`server.mjs` 挂载点传 `spaceStore`；registry 恢复严格（`candidates = matched`，无兜底级），`resolveClient` 同步改严。
- **control 域 11 条接线**：`createV1ControlRoutes` 的 wrap **统一注入 `spaceId`（11 个 handler 一行未改）** + `sendCommandToClient`/`commandFromClient` 透传空间。新增 `server/sessionSpaceFilter.test.mjs`：真实两空间 + 两个带 Cookie 前端，runtime/control **各验两个方向**，跨空间指名 clientId → 503。
- **实现者主动退回自己第一版的一条用例**：语义改变后其前提失效，它没留着而是把 `apiV1Runtime.test.mjs` 逐字节还原、换成更强的两空间版本 —— 这是「不留下前提已失效的断言」的正确处理。
- 变异验证 M1–M6 全部实跑并还原：M4 重加兜底级→1 红；M5 去空间过滤→5 红；M6 恢复空间未知放行→1 红；M3 取消归位→**64 红**；M1/M2 wrap 不转发 spaceId→各 2 红。
- **需通知第三方的行为变更（交 T14 swigger 说明）**：`?clientId=` 现**同时校验空间**，跨空间指名须带 `?space=<该空间>`，否则 503。

Task 12: 评审裁定 —— **Needs fixes**（生产代码完全符合裁决与设计：21 条端点全覆盖、注册表仍全局单一 Map、四条输入组合均核验、哨兵 108 PASS/0 FAIL、Task 5/11 产物零触碰；**唯一阻塞项是新增测试的先决自检按毫秒竞争**）。
- **Critical（评审实测，全计划最有价值的一次检查）：`sessionSpaceFilter.test.mjs:138`/`:166` 的前提自检靠墙钟 —— 连跑 7 次有 3 次红。** 报错 `expected 1789306293809 to be greater than 1789306293809`：**两个前端在同一毫秒注册**（WS 握手在 loopback 上常不足 1ms，而 `lastActiveAt` 是 `Date.now()` 毫秒精度）。**后果链条（评审点明）：这份文件正是裁决所依赖的鉴别力证据、也是 M1/M2/M5 变异计数的来源 → 基线约 40% 会红 → 「526 PASS / 0 FAIL」不可复现 → 变异计数无法区分「M 造成的红」与「抖动造成的红」→ 那批证据不可信。** 即**基线不稳则变异验证这一方法本身失效** —— 比「某条断言不能失败」更根本。且实现者**第一版 `apiV1Runtime.test.mjs` 用过 `sleep(50)` 解决同一问题**，最终版把这层保护丢了（评审点名）。已派修复轮 1：插入显式间隔、**连跑 5 次自证稳定**并贴出每次结果；若仍抖动则停下报告，不许靠加大 sleep 掩盖。
- Task 12: 评审对 `pickDefaultClient` 返 null 而非 throw 的偏离**判为正确且被迫** —— 既有哨兵 `runtimeRegistry.test.mjs:57-59` 断言返 null，照 brief 草稿抛会打破它；503 转换发生在 `resolveClient`。作为已记录偏差接受。
- Task 12: 评审核实的几条关键事实 —— 注册表仍是**单一 `Map<clientId, entry>`**（`runtimeRegistry.mjs:95-104`/`:139`），仅加 `workspaceId`；严格筛选在 `:153`（`candidates = wanted ? active.filter(...) : active`）；`resolveClient` 严格在 `:175`；注册归位与派发层回退**同源**（两边都是 `spaceStore.firstId()`）；`server.mjs:4527` 先 `ensureInitialized()`、`:4832` 才挂 WS，故归位读到的是已加载状态；`/webgrp/v1/receive` 未获空间语义且未进 `isSpaceAgnostic`（该名单只有 3 条非 v1 路径）；**21 条端点全覆盖**（`apiV1Control.mjs:340-350` 11 条全部 `wrap(handle...)`，runtime 侧 10 条同样全 wrapped），交叉验证 11 个 handler 调用点（`:95,121,151,177,183,209,239,261,293,299,321`）**无一漏网**，且 `fetchFromClient`/`sendCommandToClient` 无绕过 wrap 的第三调用点。
- **Ruling（T12 评审对 fail-open 的回答，采纳并写进 T16）：`resolveClient` 缺 `spaceId` 时 fail-open，守卫应加在两个 wrap 上、不可下沉到 registry** — 评审验证：`wanted = String(workspaceId ?? "")`，缺失时 `wanted === ""` → `if (wanted && …)` **整段短路**（clientId 路径不校验空间、默认选取退回「任意活跃者」，既不抛错也不告警）。今日无洞（`isSpaceAgnostic` 只含三条非 v1 路径），但属**失败朝开**。**落点可行性也由评审验证**：✅ 放 wrap（`apiV1Runtime.mjs:243`/`apiV1Control.mjs:331`）安全 —— `route.handle(...)` 全仓仅 `server.mjs:4790`/`:4806` 两处调用且都展开 `...spaceCtx`、**无任何测试直接调 route.handle 或 handler**；❌ 不可放 registry —— 既有哨兵 `runtimeWs.test.mjs:138` 就是 `fetchFromClient(undefined, …)`，改严会打破哨兵 — 代价若错：漏掉则未来新增不带空间解析的入口会静默失去隔离。
Task 12: 评审 Minor —— ① `runtimeWs.mjs:45` 归位对**已删除空间**的 cookie 会归到 `firstId()`，该前端（UI 仍停在已删空间）在重连前可能被 `default` 调用方选中；判**可接受**（该前端自身数据请求已 409、下次 HTTP 响应收到 `set-cookie` 回写、重连即自愈；另一种做法按旧 id 存下会让它**永久不可达**，正是本任务要修的 bug）—— 窗口期建议在 T14 文档写明。② swigger 文档已滞后（`swaggerPage.mjs:170-184` 仍写 clientId「不传取最近活跃」，21 条端点均无 `space` 参数说明）→ 归 T14，须确保不遗漏（已写进 T14 计划）。③ 缺一条「调用方 Cookie 为李四、不带 `?space=`」的隐式路径用例。④ `sessionSpaceFilter.test.mjs:10-12` 文件头注释超前（称「每个断言都配了前提自检」，用例 1 与 4 没有）。⑤ **接口形状耦合**：wrap 手写的 3 参闭包（`apiV1Runtime.mjs:247`、`apiV1Control.mjs:335`）会**静默吞掉未来的第 4 参**（不报错）；当前所有调用点 ≤3 参，无实害。⑥ `runtimeRegistry.test.mjs:276` 断言 `pickDefaultClient("王五")`（不存在空间）—— HTTP 层不可达（派发层先返 400），作分层单测有效。
- **取证纪律（值得记为后续标准）：T12 评审为验证「40% 抖动」跑了 7 次，中途落过 4 个 `.tmp-sess-*.log`，**全部删除并主动声明**「那是唯一由我产生的文件系统变更」。任何 agent 为取证在仓库内落文件，都应如此收口。**

Task 12: 修复轮 1 完成（`aa00b763`，3 文件 +22/−8；`server/` PASS(526)；全仓 PASS(2706)；`audit:names` 干净；Task 5/11 产物零触碰）。实施：新增 `connectGap()`（20ms）用在**三处**编排 —— runtime 用例两次注册之间、control 用例两次注册之间、`makeMostRecent()` 发 ping 之前（否则 touch 可能与注册同毫秒）；前提自检保留但**降级为守卫**、不再是主力鉴别手段。**稳定性自证：连跑 10 次（超出要求的 5 次）→ 10/10 全绿**。**变异计数在基线稳定后重跑校准**：M1→2 红、M2→2 红、M5→5 红。两处 Minor 均处理：文件头注释改为逐例说明鉴别力来源（断言一行未改）；`wrap` 形状耦合**做成真修复**（两文件改 `({ spaceId, ...route })` rest 透传）而非 TODO。
Task 12: 定向复审 —— **ADDRESSED，无新增 Critical/Important 破坏，T12 完成**。复审跑 5/5 全绿（未复现原先 ~40% 红）。两点超出要求的论证：
- **它没接受「20ms > 1ms」这个论证，而是补成闭合链**：① `runtimeRegistry.mjs:91-93` `now() = Date.now()` → 1ms 粒度，20ms = 20×；② Node `setTimeout` 不早于延时触发，最小间隔 ≈20ms（非「通常」）；③ **`runtimeWs.mjs:83-84` 先 `registry.register(...)`（内部落 `lastActiveAt`）再 `send({type:"registered"})`，而 `connectFrontend` 正 resolve 在 `registered` 上 → 测试续行时服务端时间戳已落定，gap 从「客户端已观测」起算、严格支配**。
- **它找到一个我大概率会漏的传递性依赖**：用例 2 `:156/:158` 与用例 3 `:171/:172` 断言的 `?space=default → c-def`，实际竞争者包含**用例 1 的 c-anon**（同属 default）；二者无直接 gap，但 c-anon 的最后活跃（test 1 的 fetch-response，`runtimeWs.mjs:91` touch）严格早于用例 2 的 c-lisi 注册，而 c-def 注册又在后者 +20ms 之后 → **c-def 严格领先 c-anon ≥20ms，无残留排序缺口**。
- 复审对重校准计数的判定：**可信**（三条理由：基线已确定、「因抖动而红」这条通道已关闭、每个变异的红集可**机械推导**并与 §11.3 同一集合）；并**诚实标注边界** —— 依授权它未重跑变异，故这是「计数可信/可推导」的判定，非它独立复现。
- 复审对 `wrap` rest 改动的等价性验证：全仓唯一 v1 分发点 `server.mjs:4806` 传 `{request, response, url, match, ...spaceCtx}`；旧 wrap 丢弃 `match`/`paths` 只重建三项，新 wrap 传同一对象去掉 `spaceId` ⇒ **纯增量**；9 个 runtime + 11 个 control handler **无一从首参读 `match`/`paths`**，唯一用 match 的 `handleV1RuntimeTab`（`:102`）读的是分发层传入的**同一个**对象 → 取值恒等；`spaceId` 仍在 wrap 闭包内绑定进 `fetchFromClient`/`sendCommandToClient`。附带语义收紧：`paths` 过去被静默吞掉、handler 拿到 `undefined`，现在透传（无消费方，惰性 —— 但正是本次想要的）。

BASE before T13: aa00b763
Task 13: 实现完成（`97927a60`；新增 `server/spaceCors.test.mjs` RED→GREEN —— RED 实测 `expected 'content-type' to contain 'x-space'`；`server/` **527 PASS / 0 FAIL**；哨兵未改一字；可红化变异 = 把值改回 `"content-type"`，即 RED 本身就是该变异的实测）。
- **T13 顾虑是一条真发现，且与本项目历史伤痕同形态：`server/v1Response.mjs:11-15` 另有一份同名 `accessControlHeaders` 也缺 `x-space`。** 我核实成立：该副本被 spread 进 `v1CacheableJsonHeaders`（`:21`）与 `v1NoStoreJsonHeaders`（`:28`），**即每个 v1 响应都带着那份过时头**；实现者的「功能无害」判断也对 —— 预检由 `server.mjs:4755-4759` 的全局 OPTIONS 短路用**自己那份**（已含 `x-space`）应答，故那份永不应答预检。
- **Ruling（T13 顾虑，采纳并纳入本任务）：CORS 头单源化到新模块 `server/cors.mjs`** — 理由不是「可能出问题」，而是这**正是用户 CLAUDE.md 经验规则里记过的同一形态**（「两处硬编码同一概念，导致两处不一致」，本项目此前在电压等级清单上吃过一次）。修法：新建零依赖 `server/cors.mjs` 导出唯一一份，`server.mjs` 与 `v1Response.mjs` 各自删本地定义改为导入；**循环依赖已核**（`cors.mjs` 不 import 任何东西，不参与 `server.mjs` 动态加载 `apiV1*.mjs` 那条链）。补一条能红的断言：**v1 响应头也含 `x-space`**，且要求**先加断言看它红、再单源化**，把那次 RED 作为「这条断言真能发现分叉」的证据 — 代价若错：无（若两处曾分叉，该断言立刻红）。
Task 13: 待修复轮 1 完成后复审。

Task 13: 修复轮 1 完成（`7db97232`，新 commit 未 amend，前一个 `97927a60` 保留；`server/` **528 PASS / 0 FAIL**；`audit:names` 干净；既有测试一字未改）。**守卫 RED 已实跑**：先加 v1 断言、未单源化时 `expected 'content-type' to contain 'x-space'`，**且同测试的 `status===200` 已通过 —— 证明它确实打到真实 v1 响应头、非状态掩盖**；单源化后 2 PASS / 0 FAIL。**变异两个方向**：撤销单源化（`v1Response.mjs` 重持自己那份副本）→ **只有 v1 用例红**；改 `cors.mjs` 头值 → **两用例同红**。单源不变量：全仓只剩 `server/cors.mjs:3` 一处定义、`:9` 一处头值，import 方恰为 `server.mjs:15` 与 `v1Response.mjs:7`，无循环（`cors.mjs` 零 import）。
- Task 13: 残留（次要）→ 已写进 T16：`server/CLAUDE.md` Key Files 表未列 `cors.mjs`，**且该表同样未列 T1–T12 新建的任何模块**（`spaceId.mjs`、`spaceStore.mjs`）。T16 的补录清单已加 `cors.mjs` 一行并注明「勿在别处再定义一份」。

Task 13: 评审 —— **Approved，无新增破坏**。规格逐条命中；单源不变量经独立重查成立（`cors.mjs:3/:9` 为唯一出处，消费方仅 `server.mjs:15` 与 `v1Response.mjs:7`）；**确认守卫不存在 status 掩盖假绿**（vitest 首失败即中断，故 `:37` 失败会抑制 `:38`，方向安全；危险方向不可能，因 `200` 来自 `v1Response.mjs:89` 的 `writeHead(200, v1NoStoreJsonHeaders)`，与头对象独立产出）；无环（`cors.mjs` 是只被消费、从不消费的叶子；`server.mjs ↔ apiV1*` 的既有环与本次无关）；迁移后对象内容与内联版**全同**（3 键同值同序 → Node 写头顺序不变），唯一行为变更是 v1 各响应头由 `content-type` 变为 `content-type,x-space`（纯放宽，且这些路径从不负责应答预检）；共享对象只被 spread 与一次 `writeHead`、无处 mutate；既有测试只逐键断言（无整对象 `toEqual`）故不红。**Task 13: complete (commits aa00b763..7db97232)**
Task 13: minor (deferred，交最终评审分类): **守卫只覆盖 no-store 路径** —— 若有人只在 `v1CacheableJsonHeaders`（`v1Response.mjs:13`）**内联字面量**（而非共享一个本地 const），`spaceCors.test.mjs:38` 不会红；已查 `v1Response.test.mjs:37-39` 只逐键断言 `content-type`/`cache-control`/`etag`，也没钉住该常量的 allow-headers。可选加固：同一条测试里再打一个**可缓存**端点（如 `/webgrp/v1/schemes/hierarchy`）断言同一头。
Task 13: minor (deferred，交最终评审分类): `access-control-allow-origin: "*"` 仍**内联在 9 处 / 5 个模块** —— `apiV1Runtime.mjs:140,156,189,219`、`apiV1Schemes.mjs:113,165`、`cimExport.mjs:93`、`eFileExport.mjs:165`、`server.mjs:4157`。这些是二进制/静态资源响应的**部分** CORS 集（不含 allow-methods/allow-headers），与本次单源不变量不冲突、守卫也不该覆盖它们；但「一个概念 N 处硬编码」的隐忧在 `allow-origin` 值上**仍成立**：将来把 `*` 改成指定源要改 10 处。非本任务缺陷，建议留作后续单源化候选。

BASE before T14: 1a85619b
Task 14: 实现完成（`f495fbc3`，`server/` **535/535 绿**；`swigger.examples.test.mjs` **95/95**（94 示例含新 4 条 + 元数据断言）；既有断言零改动（test 文件 `git diff --numstat` = **+25/-0**）。徽标计数 69 端点 = **空间 41 / 全局 7 / 会话 21** —— 与我计划的推算吻合：空间 38+3（补录三条未文档化空间端点）、全局 3+4（`/webgrp/spaces` 四条）、会话 21。
Task 14: **实现者做了超出要求的验证：用真实 Chrome 实跑页面** —— 下拉建/切空间、非 ASCII Cookie 百分号编码、69 张卡片徽标、无 JS 报错。
- **发现一个既有的真 bug（非本计划引入，未改，已记录）**：`/icon-library/import` 与 `/image-library/import` 的**服务端路由与处理器语义互换** —— `routeKey("POST","/icon-library/import")` 调的是 `handleImportImageLibrary`，反之亦然。实现者按**服务端实际行为**写文档（不按名字），且两条示例同为 `{}`→400、两种绑定下期望都稳，故未误导。T14 计划里我列这两条时用的也是「按服务端实际」的措辞，未把 bug 写进文档。**属用户可自行决定是否修的历史缺陷，不在本计划范围。**
Task 14: 顾虑 ② → 已记：`server/CLAUDE.md` 的「54 示例」已过时（现 94 示例 / 69 端点），按约束未动，留 T16。
Task 14: 顾虑 ③ —— 本会话 GitNexus MCP 不可用，实现者未跑 `gitnexus_impact/detect_changes`，改用 diff 范围 + 全量测试作证据。**这是正确的替代，也符合事实**（该 MCP 在会话早期即断连）。

Task 14: 评审 —— **❌ 一条假文档声明（Important）**。四条第三方可见事实逐条对码：第 1、2、4 条 **TRUE**；**第 3 条 FALSE** —— `/webgrp/v1/runtime/clients` 的 HTTP 响应**实际不含 `workspaceId`**：`apiV1Runtime.mjs:66-73` 的 handler 做**白名单重映射**，把 `runtimeRegistry.mjs:139` 输出的 `workspaceId` 丢掉了，只回 `{clientId, role, registeredAt, lastActiveAt}`；`apiV1Runtime.test.mjs:81-96`、`sessionSpaceFilter.test.mjs:135-136` 也无该字段断言。**故文档 `swaggerPage.mjs:182` 与 `:349` 在向第三方承诺不存在的字段，客户端照此解析会拿到 `undefined`。**
- **Ruling（T14 评审 Important，采纳其裁定方向）：补 handler、不改文档 —— 理由是该字段正是 T12 的交付意图** — T12 的任务名即「运行时客户端带 `workspaceId`，`?space=` 筛选目标前端」，暴露该字段属其交付内容；**文档没写错，是 handler 漏了**。若反过来改文档，等于把一个**未完成的交付**用文档「合规范化」。修法 `apiV1Runtime.mjs:68-73` 白名单加一行 `workspaceId: c.workspaceId`（**明确授权跨 T12 文件**），并要求补一条**打真实 HTTP 端点**的断言（变异：去掉该行 → 必红）；**明确禁止只断言注册表层** —— 那正是这次漏掉的地方 — 代价若错：若判定方向反了，会把 T12 未完成的交付永久固化进文档。
- **失败模式记录（本计划第四次「检查停在上游一层」）**：实现者报告「已核对 `runtimeRegistry.mjs:139` 的 `listClients()` 确实输出该字段」—— 核对**停在注册表层**，没走到 HTTP 层，而 HTTP 层有白名单重映射。与前三次同类：① grep 停在裸常量名（漏属性简写）；② 枚举停在 `ensure*` 族（漏兄弟函数 `writeJsonStoreFile`）；③ 覆盖判定停在「入口点」抽象（漏 `importSchemeArchiveBuffer` 的独立 mkdir）。**共同根因：把「上游确实产出」当成「下游确实送达」。**
Task 14: 评审的对抗性抽样结论 —— **未发现 `scope` 误标**；delta 对账完全吻合（旧 62 = space 38/session 21/global 3；本次 +3 space（`DELETE /webgrp/images/{id}`、两条 `*/library/import`）+4 global（`/webgrp/spaces` 四条）= 41/21/7 = 69）；`/webgrp/v1/receive` 三条 global 正确（模块级内存存储、与 `paths` 无关）；11 条 control = session 正确；`/webgrp/spaces` = global 正确且确在 `isSpaceAgnostic` 内。
Task 14: 评审对顾虑 ① 的裁定 —— **按服务端实际行为写是对的**（swagger 描述的是第三方观测到的契约，按前端意图写反而造出错误文档）；并**逐条验证了两条示例在两种绑定下的稳定性**（`/icon-library/import` 传 `{folders:[],assets:[]}`：现绑定走 `:3736-3739`「没有可恢复的图标资源」→400，换绑定则 `:4016-4019` →400；`/image-library/import` 传 `{}`：现绑定 `:4016-4019` →400，换绑定则 `normalizeImportedImageLibraryFolders(undefined)` 返回 `[root]`（`Array.isArray` 兜底不抛）后落在同一条 `:3736-3739` →400 —— **两边都是 400，期望值对两种绑定都稳**）。
Task 14: 硬约束核实 —— `/webgrp/exports/native/*` 确未入列表（全文件搜 `exports` 只命中 `:21` 注释与 `:345` 说明），原因注释在 `:21-23` 写明「会被真实调用 → 弹 Windows 另存为对话框」；`send()` 未改（落在两个 hunk 之间的未变更区）。
Task 14: minor（待处置）：`/webgrp/v1/receive` 标 `global` 但**不在** `isSpaceAgnostic` 内，故 `?space=不存在` 仍吃 400，与 `SCOPE_TITLES.global`「不受空间标识影响」略有张力；已让实现者二选一（倾向 (a) 加进白名单一行，使措辞与实际一致）。

Task 14: 评审尾部 —— **Assessment: Needs fixes**（scope 分类 41/21/7 与旧 38/21/3 精确对账 +3/+4、4 条 `/webgrp/spaces` 文档、空间下拉与页首说明、两条硬约束、示例污染控制、顾虑 ① 的处置**全部达标且经得起对抗性抽查**；唯一确凿问题是第 3 条「文档说假话」）。
Task 14: **示例污染检查：无污染。** 关键前提成立 —— `swigger.examples.test.mjs:204-212` 的 `beforeEach` **每用例重建 dataDir**（`removeDataDir` → `mkdir` → 重撒 seed），故 `POST /spaces` 建出的「示例空间」不可能让 `PUT` 的「未知空间 → 400」变红。逐条复核五条新示例全部**不写盘**（`PUT /spaces {id:"示例空间"}` → 未知空间 400；`DELETE /spaces {id:"default"}` → `SPACE_PINNED` 400 早于任何目录操作；`DELETE /images/no-such-image` → 404；两条 `*/library/import` → 400）。`GET /spaces` 只断言 `Array.isArray` + `typeof current === "string"`，**对空间数量不敏感**。
Task 14: 评审对 `send()` 未改的**逐字节证据** —— 两个 hunk（`@@ -476,20 +553,60 @@` 与 `@@ -644,20 +761,23 @@`）之间旧 496–643 行**逐字节未动**，`async function send(btn, ep)` 整体落在该未变更区；三处新增（`currentSpaceId`/`switchSpace`/`fillSpaceSwitcher`）均无 `send` 内引用。
- **评审对「层间送达」的追答（我追问的问题）：三条都跟到了线上，不必单开 T16 核查轮**，但**证据强度如实分两档** —— 第 1 条（头解码）：`server.mjs:4762` 调用 → `:4763-4766` `resolution.unknown` → 400 → `:4767` `resolvePaths` 进 `spaceCtx`，**代码读到终点（派发层即终点）**；第 2 条（503）：抛错 `runtimeRegistry.mjs:171-185` → 捕获 `apiV1Runtime.mjs:42-44` → **本次补核** `sendV1Error("no-online-client")` 默认映射 `v1Response.mjs:31` → 503（control 侧同构 `apiV1Control.mjs:42-49`），**代码读到终点 + `sessionSpaceFilter.test.mjs:175-191` 打真实 HTTP 断言 503（runtime 与 control 双向各一次，且带「空间相符时照样 200」的反证 —— 最强）**；第 4 条（400 无 ok:false）：`sendError` → `:1621-1623` 直接出终态体、其后立即 `return`，无覆盖。唯一残留不确定：`sendV1Error` 的 `headersSent` 早退守卫（`v1Response.mjs:97-100`）会静默吞掉错误响应 —— 但错误的 503 只发生在成功路径尚未 `writeHead` 时，且真实 HTTP 测试已覆盖，不构成风险。
- Task 14: 评审另核到两处**既有**陈旧数字（非本次引入）→ 已写进 T16：`server/CLAUDE.md:52` 的「9 端点」→ 实际 **11 条** control 端点；同文件「54 示例」→ 现 **94 示例 / 69 端点**。并在 T16 补一句 Common Patterns：`swigger.examples.test.mjs` 会逐个真实调用每条示例，故新增示例必须自带稳定期望、且**不得**收录会触发本机副作用的端点。

Task 14: 修复轮 1 完成（`490bad3e`，5 文件 +45/−7；`server/` **537/537**（535 + 2 条新断言）；`apiV1Receive.test.mjs` 4/4、`sessionSpaceFilter.test.mjs` 5/5、`apiV1Runtime.test.mjs` 22/22；`audit:names` 干净；内联脚本长度与首轮**逐字节相同**（`send()` 仍未改）；未碰 T5/T11/T12/T13 产物）。
- **Important 按裁定补代码、未改文档**：`apiV1Runtime.mjs:68` 白名单加 `workspaceId: c.workspaceId`。实现者给出与我一致的理由并补了一条我未要求的依据：**T12 brief 的 Outputs 本就写明 `listClients()` 条目新增该字段**，T14 brief 据此要求示例同步；反向改文档等于把未完成的交付「合规范化」。
- **那条断言做了双向变异（比单测存在性强得多）**：打真实 HTTP `/webgrp/v1/runtime/clients`，断言 `c-lisi → workspaceId: "李四"`，且指出**该值只可能来自 WS 握手 Cookie**；删该行 → 红（字段缺失）；改成常量 `"default"` → 红（收到 ≠ 李四）。**第二向排除了「字段在但值是错的」** —— 若只断言存在性则抓不到。
- Minor 选 (a)：`/v1/receive` 加进 `isSpaceAgnostic`（1 行 + 2 行注释），理由「其数据本就全局（不落盘、handler 签名不接 `ctx`、零 `paths` 引用），与 `/spaces` 同类；不选 (b) 是因为那等于『在文档里为代码不一致加解释』，与任务目标相反」。**行为变化已记录**：不再对未知 `?space=` 返 400，也不再回 `X-Space-Fallback`/写回 Cookie（该端点不写空间数据，无污染风险）。变异去掉该行 → `apiV1Receive.test.mjs` 红（`expected 400 to be 200`），即「typo 空间标识打挂联调」那条路径。
- 文档同步：首段「所有端点」改为列举三处例外；`SCOPE_TITLES.global/session/space` 与徽标图例**收紧到逐字为真**（原「global = 不受空间标识影响」正是因 receive 未短路才不成立）。**实现者还订正了自己首轮报告里那句「只核到注册表层」的结论。**

Task 14: 定向复审 —— **ADDRESSED，无新增 Critical/Important 破坏，T14 完成**。复审把变异鉴别力验得比要求更深：**同一条用例把两个客户端都钉住** —— 恒 `"default"` 红在 `:206`（要李四）、恒 `"李四"` 红在 `:209`（要 default），**故任何常量都会翻掉一侧**；且 `李四` 该值本身**排除了「回退/默认」解释**（`runtimeWs.mjs:45` 的回退分支会给 `default`）。它还确认断言打在真实 HTTP（`:202`）而非注册表层，且 `runtimeRegistry.test.mjs:253-259` 恰好覆盖不到白名单那一层 —— **选点正确**。
Task 14: 复审对 Minor (a) 的裁定 —— **(a) 正确且不新增暴露面**：三个 receive handler 签名都不接 `ctx`、`records`（`apiV1Receive.mjs:17`）是进程级数组、`sendV1Json` 不碰 paths；跨空间读写本就不可能由「跳过解析」新开 —— 改前不带 `?space=` 的请求同样走 fallback 落到首空间并收发同一份全局 `records`，**改后仅多放行 `?space=<未知>` 这一种之前被 400 拦下的请求，其能做的事与裸请求完全相同**。丢失的 `X-Space-Fallback` + 写回 Cookie 对调试接收端无意义。
- **T14 复审报的两条新 Minor（均非本次修复引入，不阻塞）：**
  ① **`server.mjs:4759-4762` 用 `url.pathname` 精确等值短路，而 receive 路由是 `apiPattern("/v1/receive", "/?$")`** ⇒ `GET /webgrp/v1/receive/?space=<未知>`（带尾斜杠）**不匹配短路、仍 400**，使 `SCOPE_TITLES.global` 的「不因空间标识未知被拒」在该 URL 拼写下为假。`/spaces` 与 `/exports/native/*` 因走 `exactRouteHandlers` 本就是 404 而非 400，故只有 receive 露出此缝。改前该拼写同样 400，**非回归**。一行可修（短路比较前归一化尾斜杠）。
  ② **我在计划 `:2597` 写的 T12 fail-open 依据「`isSpaceAgnostic` 只含三条非 v1 路径，故 v1 路由恒带 spaceId」在 T14 后不再成立** —— `/v1/receive` 是 v1 路径且进了短路名单。今日仍无洞（receive 不调 `fetchClient`/`sendCommandToClient`），但 T12 那条 fail-open 结论现在多了一个 v1 先例。**属计划文档陈述陈旧，非交付缺陷**；已按复审所述改写成真实依据（见 T16 Step 4b）。
  另：`docs/DESIGN_THIRD_PARTY_API.md:233` 仍写 `{clients:[{clientId,role,lastActiveAt}]}`（本就漏了 `registeredAt`）—— 属**遗漏**非假事实，且不在本任务文件范围。

Task 14: complete (commits 1a85619b..490bad3e)

BASE before T15: 6d869e7b
Task 15: 实现完成待审（`c59b886c`，仅新建 `server/spaceScope.test.mjs`，无既有文件被改；`pnpm vitest run server/spaceScope.test.mjs` **PASS(9) FAIL(0)**；`server/` **PASS(546)**）。
- **计划缺陷（T15 报出的三处 brief 硬错误，全部就地修正）：** ① brief 的 `"x-space": "张三"` 与 Cookie 裸中文会让 `fetch` 抛 `TypeError`（头值须 ByteString）→ 不修则**整文件全红**，已改 `encodeURIComponent`。**讽刺点：我在派发指令里明确警告过 ByteString 问题，而 brief 的代码仍是裸中文形式** —— 实现者以派发指令为准，判断正确，但说明我的计划文本与派发文本相互矛盾。② `POST /webgrp/images` 实际返回 **201**（brief 写 200）。③ ZIP 用例在 brief 里**依赖前序用例写入的数据**（`.only`/过滤跑法下必红）→ 已改为自带的双空间对照样本，自写自读。
- **实现者的证伪方法（设计得好，值得记）：把本文件的空间标识临时指向 `default`** —— 等价于「派发层完全不注入 paths」，即 **Tasks 1–14 之前的状态** → **9 用例 7 红**；仍绿的两条正是与空间划分语义无关的（未知空间 400、无来源回退 default），**符合预期**。这是「模拟功能不存在」来验证这张网真的兜得住，比逐条列变异更强。变异已还原、文件内无残留。
- 无 `sleep`；「文件已落盘」这一前提靠实现不变量（回包即已落盘），非等待。所有断言的可红化变异逐条写在报告里。
- 已按此修计划 T15 文本（在用例前加「执行时修正」三段记录），保持文档与实现一致。

Task 15: 评审（前半，质量为本计划最高）—— ✅ 单文件新增、零既有改动（`1 file changed, 207 insertions`，磁盘 `wc -l` = 207 与 diff 逐行一致，全文无 `MUTANT`/`setTimeout`/`.only`/`.skip` 残留）；✅ 9 用例覆盖 brief 全部域，并**指出 brief 自身不一致**（Step 2 写「10 个用例」而 Step 1 只列 9）。
- **评审独立走了一遍证伪变异，结果与实现者一致（7 红 2 绿）**，并逐条给出**为什么红** —— 关键是每条域用例都**同时断言读路径与写路径**，故任一方向塌陷都红。它**补了实现者没做的一条反向验证**（读代码推演，未跑）：**「只写路径忽略 paths」与「只读路径忽略 paths」两个半塌陷也各自至少红 6 条** —— 两个方向被同一批用例的「正+反断言对」兜住，**这是本文件比 per-domain 单测强的地方**。
- 评审**把 2 条绿案例的定性收紧**：不是「与空间无关」，而是「与**按空间路由**无关」（更准；两条各有自己的可红化变异，非漏测）。
- **评审把全部 4 条 absence 断言逐条论证了「为何有意义」** —— 每条都与同用例内的**正向孪生断言配对**，这正是本计划从 T1 起反复逮到的缺陷形态（「路径从未被创建」也能让 `toBe(false)` 通过）。逐条机制级论证（摘两例）：
  - 用例 1 的 `existsSync(默认根/.../测试模型.json)).toBe(false)`：同用例先用同一模型名断言 `save.status===200` **且** `workspaces/张三/.../测试模型.json` 存在 ⇒ 写**确实发生过**、只有两个可能落根，**不存在「因为没写所以两边都没有」的解读**。
  - 用例 6 的 `existsSync(dataDir/workspaces/default)).toBe(false)`：同用例**刚**在默认空间写过模型并断言它落在数据根 ⇒ 两条是一枚硬币两面；旁边 `workspaces/张三 === true` 证明父目录存在，**排除「父目录没建所以子目录也没有」**。
  - 用例 7 的内容不等式 `!names.some(endsWith("默认模型.json"))`：本用例在**默认空间**写了同名方案下的 `默认模型.json`（200 已断言），导出的是张三空间的**同名方案目录** ⇒ 忽略空间时两者必同时出现。**评审指出这比 `status===200` 强** —— 默认根此刻也有「默认方案」目录，状态码单独无法区分。
- 评审确认**零 `sleep`/`setTimeout`/重试循环**（全文只有 `server.close(resolve)` 一处 Promise），前提为结构性（如空间「张三」在首个请求前存在，由 `beforeAll` 内 `await` + 断言保证）。

Task 15: 评审裁定 —— **Approved**。判据只有一条「每条断言能否真的红」，经受三个独立检验：① **双向性** —— 7 条域用例每条都同时断言读与写，故两个半塌陷各红 ≥6 条，评审独立推演「头指向 default」得 7 红 2 绿、与实现者实测逐条吻合，两条恒绿者各有自己的可红化变异（非漏测）；② **absence 断言** —— 4 条 `existsSync(...).toBe(false)` 与 2 条内容不等式全部与同用例内的**正向孪生断言**配对，**把本计划最反复的缺陷形态变成了显式论证**；③ **时序** —— 零 sleep、落盘前提靠实现不变量、`.only` 隔离性对用例 7/8/9 逐条核过。
Task 15: 评审的 flakiness 一节（本计划最有价值的一节）—— **结论：本文件在 CI 下的不稳定面为零，且不稳来源都不是它引入的**。逐项：tmpdir 唯一 + 清理（前缀纯 ASCII，CJK 只在其下子目录，三平台按 UTF-8 处理）；`port: 0` 无 `EADDRINUSE`；`vite.config.ts:96-101` 未关 `isolate`，每测试文件独立模块图；**keep-alive 连接复用**（同一用例内多空间请求共用一条 socket）**不成问题** —— 空间解析在 `createServer` 的**每请求回调内**算（`server.mjs:4763-4777`），`spaceCtx` 不落在连接上，**无连接级空间状态可被复用污染**（评审称这是「集成测试最容易踩的坑，本文件没有」）；ZIP 断言只涉**顶层**条目名，避开 `path.relative` 在 Windows 产反斜杠的既有问题（`schemeArchive.mjs:54` 对嵌套子方案会带 `\`）；teardown ~4s/文件因 undici keep-alive 回收，**与仓库另外 22 个 server 测试写法完全一致**，未新增风险。
- **latent 隐患（评审发现，已裁定只记录、不在本计划处理）：`isolate` 或 `singleThread` 一旦被改，22 个 server 测试文件会一起坏**（第二个文件复用到第一个的 `dataRoot` 与 `registries` Map）。根因：`server.mjs` 在**模块加载期**求值一次 `dataRoot`、`registries` 是模块级 Map —— 与本计划 Global Constraints 里那条「`GRAPH_MODEL_DATA_DIR` 只在模块加载期读一次」是同一事实的两面。**Ruling：不在本计划处理**，三条理由（评审给出，我采纳）：① **不是本计划引入**（既有设计，本计划只是第 23 个使用者）；② **改它超出 T15 授权**（约束是「只允许新建 `spaceScope.test.mjs`」，须动 `vite.config.ts` 或给 22 个文件加保护）；③ **风险是「配置被反向修改」而非「今天会坏」**，真正的防护是一个**守卫测试**（断言 `isolate !== false`，或让 `server.mjs` 在已求值后又被不同 `GRAPH_MODEL_DATA_DIR` 加载时报错），属独立小任务 —— 把守卫塞进 T15 只会让一个已通过评审的文件重新进入未验证状态。**建议另开一条守卫任务。**
Task 15: minor (deferred): `spaceScope.test.mjs:205-206` 注释称「`?space=` 此处不编码就会 400」——**机理不成立**（`URL` 解析会自行为裸中文 query 做 UTF-8 percent-encode，实测 `searchParams.get("space")` 返回 `"张三"`）；代码用 `encodeURIComponent` 是对的且更稳（对 `+`/`%`/`#` 才真正必需），仅注释措辞不准，不影响任何断言。同类：报告变异表把用例 9 的红点归到 `save.status === 200`（该变异下 PUT 回退默认空间仍是 200，实际变红的是后续「张三看得到」两条）—— 一并按 deferred minor 处理。
Task 15: complete (commits 6d869e7b..c59b886c, review clean — Spec ✅ / Approved)

BASE before T16: c7be60b4
Task 16: 完成（`86127fb1`，4 文件：`server.mjs` / `apiV1Runtime.mjs` / `apiV1Control.mjs` / `server/CLAUDE.md`）。回归：`vitest` **PASS(2726)/FAIL(0)**、`tsc --noEmit` 无错、`audit:names` 干净；另定向复跑 8 个相关测试文件 160 passed/0 failed。
- **常量清理由实测修正**：brief 说 11 个，**实测只有 9 个**（`schemeDataDir`/`schemeTrashDir` 本任务前已被删，仅剩两处测试文件陈旧注释未动）。before 共 **14 处词命中全在 `server.mjs:35-44` 声明块内**（其中 5 处是常量互相引用），**块外引用为 0（无泄漏）**；删后 after = 0（连声明一并删除，比预期更彻底）。顺带修了其上「保留 11 个兼容别名」的陈旧注释。
- **实现者自曝并当场纠正两处**：① 最初的 after 计数脚本**正则转义写错**（全报 0），改用 `grep -oE` 重算，报告里是正确数字；② 编辑 `CLAUDE.md` 时一度把「ws-timeout→503」**误写成 500**，同轮改回（最终 diff 该行未动）。
- 守卫落在两个 wrap 内、`requestCtx` 构造前（`apiV1Runtime.mjs:247`、`apiV1Control.mjs:332`）；**手工验证正反两向**（缺 spaceId 时两条路由均抛守卫；带 spaceId 时正常越过守卫进入 handler）。**不破坏哨兵**：`runtimeWs.test.mjs` 的 `fetchFromClient(undefined,…)` **不经 wrap**，160 passed 已覆盖。**更正 brief 的行号**：`route.handle` 实为 `4780`/`4796`（删 9 行后前移），两处均展开 `...spaceCtx`、全仓无第三处、无测试直接调 handle。
- `CLAUDE.md`：control **9→11** 端点、swigger **54→94 示例 / 69 端点**（实测确认 69/94/11），补 `spaceId`/`spaceStore`/`cors` 三行 + 空间隔离 / `mkdirInSpace` 不变量 / swigger 示例约定；另补两处核实到的事实（回退时响应带 `X-Space-Fallback`（`spaceStore.mjs:235`）、`mkdirInSpace` 自查命令）。
- Task 16: 顾虑 —— ① GitNexus 索引陈旧（`389394a`），未跑 `analyze`；② 两个测试文件注释仍提 `schemeDataDir`（陈旧注释，因「测试只读」未动，建议后续单独清理）。
Task 16: complete (commits c7be60b4..86127fb1)

**全部 16 个任务完成。** 最终全分支评审范围 = `2d08ba4c..86127fb1`。

## 最终全分支评审（opus）—— 发现 2 Critical + 1 Important，全是逐任务关卡看不到的跨任务/跨阶段问题

**S1（Critical，我已逐字核实成立）—— 空间相关的媒体二进制挂在「与空间无关的 URL」上，且响应头是 `public, immutable`。**
`server/server.mjs:4145-4149` 的 `GET /webgrp/images/{id}` 响应头为 `"cache-control": "public, max-age=31536000, immutable"`（**`public` 明确允许共享/反向代理缓存**）；而 URL **无空间维度**（前端固定 `apiPath('/images/' + id)`），内容由 Cookie 决定。⇒ 浏览器在空间 A 取过 `img-abc` 后，切到 B 请求同一 URL **一年内不回源**，直接拿到 A 的字节。
**可达性不是理论**：导入资产的 id **来自上传载荷本身、不走 `randomId`** —— `server.mjs:3704` `const id = safeImageLibraryId(asset?.id)` **原样保留**；而「导出 A 的图元库/图片库 → 导入 B」正是本设计给新空间填充数据的**既定工作流**，故 id 复现是常态。二阶影响：资产 URL 被写进模型 JSON（`params.backgroundImage = apiPath('/images/' + assetId)`），故从 A 导出的方案 ZIP 导入 B 后引用的是同一批无空间限定的 URL。
**修法**：`private` + `vary: "Cookie"`（`private` 挡共享缓存；`vary: Cookie` 让浏览器缓存按 Cookie 分键，切空间即重新校验）。已派修复波并要求补能红的断言。
**这是本计划最严重的一条** —— 它不属于任何单个任务的改动面，而是「空间隔离」与「既有的长缓存策略」两个独立决定相遇才出现的。
**S2（Critical，**发布编排问题而非代码缺陷**）—— 前端半场缺席，而设计 §6.1 的持久化污染路径现在就活着。**
设计要求的前端件全部不存在（`src/spaceClient.ts`、`SpaceSwitcher`、`clearSpaceScopedBrowserCaches`、`UnsavedChangeAction` 的 `switch-space` 变体 —— 全仓 grep 零命中），因为**本阶段明确不改前端**。问题不在「少做了」，而在**交接期已打开设计明确要堵的洞**：§6.1 那条「后端为空时把浏览器本地缓存主动写进新空间」的回写路径（`src/appExtracted/appToolbarHookFactories.tsx:2766-2783` 配色、`:2797-2836` 图元库、`:2851-2866` 量测；播种点 `src/App.tsx:657`）**保持原样**，且 `readDeviceLibraryConfig` 对全新空间确实返回 `exists:false`（`server.mjs:1592-1595`）故回写分支**必触发**。
**可达性不需要前端切换器**：`server/swaggerPage.mjs:575-579` 的 `switchSpace()` 写的是 `Path=/`、无 Domain 的 Cookie，**与主应用同 host 同源** —— 用 swigger 下拉切到 B、再打开主应用，B 的 `device-library/library.json` / `color-config.json` / `measurement-config.json` 就被写进 A 的内容。**这正是设计 v2 专设 §6 整章、并在 §12 立验收项 12 的那条缺陷。**
**另：我在阶段一开工前提过的第二阶段计划 `docs/superpowers/plans/2026-09-13-multi-workspace-frontend.md` 并不存在 —— 我说过会写，实际直接进了执行，未写。**

**S3（Important）—— fail-open 守卫只覆盖会话域，数据域裸露。**
T12/T16 给两个会话 wrap 加了 `if (!spaceId) throw`（`apiV1Runtime.mjs:247-253`、`apiV1Control.mjs:331-337`），但数据域路由表一行守卫都没有（`apiV1Schemes.mjs:207-218`、`apiV1Library.mjs:158-165`），handler 缺 `paths` 时逐层落 `options.paths ?? defaultPaths` ⇒ **静默读默认空间**。今日不可达（`spaceCtx = {}` 只发生在 `isSpaceAgnostic` 的 4 条路径上，不含这两个域），但**失败形态比会话域更重**（会话域缺 = 打到别人的前端；数据域缺 = 读写默认空间的数据），且正是 spec §14 已列为「降低概率而非消除」的既知残留。已派修复波。

**最终评审「已查清、无问题」的几处（含推理，值得记）**：
- **退休登记 × 注册表缓存**：评审担心的残余窗口（请求已拿到实例、DELETE 才跑）**不成立** —— `globalLineRegistry.mjs:763-1024` 的**每个公开方法第一句都是 `return locked(...)`**，入队是**同步**的，故 `flush()` 必然排在其后；`ensureInitialized`（`:745`）也只在锁内调用；**构造与入队之间没有 await 可插入**。
- **`mkdirInSpace` × trash**：`spaceStore.mjs:213` 的 `data/trash-spaces/<stamp>` 与退休根 `data/workspaces/<id>` 是**同级目录**，结构上不可能被前缀命中；`retiredRoots` 永不含 `dataRoot`；`张三`/`张三丰` 由 `+ sep` 隔开。
- **`paths` 透传完整性**：逐个核对 `server.mjs` 的 **27 个 `options = {}` helper 与全部调用点**，以及 5 个适配层 —— **零个无参调用、零个漏 options**。`GRAPH_MODEL_DATA_DIR` 全仓只在 `server.mjs:30` 求值一次。被服务端直载的 `src/export/*.ts`、`src/cim/*`、`model-eexport.ts` **无任何磁盘读**（grep 零命中）⇒ 不存在绕过 paths 的第二条读盘链。
- **`mkdirRaw` 不变量**：只在 `server.mjs:2`（import 别名）与 `:76`（原语内）⇒ 新写的裸 `mkdir` 会 ReferenceError。
- **CORS 单源**：两份 v1 头都 spread 同一对象；9 处内联 `allow-origin` 都在二进制/静态响应上、不应答预检。

### 最终评审 Verdict：**Fix these first**（5 项，代码合计 <10 行，其余纯文档；完成后 Mergeable）

| # | 项 | 位置 | 量级 |
|---|----|------|------|
| 1 | 图片响应头加 `vary: "Cookie"` + `public` → `private` | `server.mjs:4147` | 1 行（已派） |
| 2 | 数据域 v1 路由补 fail-open 守卫 | `apiV1Schemes.mjs:207-218`、`apiV1Library.mjs:158-165` | 2-3 行（已派） |
| 3 | `spaceId.test.mjs` 补保留名断言（`prn/aux/nul/com1/lpt9` 正向 + `con-2` 反向） | `server/spaceId.test.mjs:28-32` | 3 行 |
| 4 | 文档收尾波：spec §3/§12#7 的 X-Space 编码、第三方两处 `.md`、根与 `src/CLAUDE.md`、`server/CLAUDE.md` 自查命令 | 见下 | 纯文档 |
| 5 | 版本编排：阶段二同版本落地，或用**代码级闸门**替代「UI 不可见」 | `server.mjs:4537-4549` | ~3 行 + 改几个空间测试 |

### 第 3 节（残留跨空间路径搜寻）的结论 —— 本计划最精准的一句定性

> **核心承诺在后端成立**；唯二破口是 S1（HTTP 缓存层）与 S2（浏览器持久化层）—— **两者都不在所实现的机制里，都在「后端之外的副本」这一类，而设计 §6 只清点了 localStorage/IndexedDB/sessionStorage 三份，漏了 HTTP 缓存这第四份。**

**S1 就是那第四份**，且由**服务端自己**的响应头发下去。评审逐条判为「已核、无问题」的通道：`sendCachedJsonFile` 键即 `filePath`（三处实参与 produce 同源）、`sendJsonCacheable` 的 ETag 由**载荷内容**派生非路径派生、trash 无端点枚举且 `archiveStaleSchemeFiles` 已带 `{ paths }`、退休机制对 `".."`/`""`/未知 id 不污染（`resolvePaths` 先抛故 `add` 未执行）、注册表缓存×删除窗口无残余（每个公开方法第一句都是 `return locked(...)`，入队同步）、WS 桥的显式 clientId 也校验空间且旧 entry 的 pending 不落到新 entry、`/v1/receive` 与 `/exports/native/*` 与 `/swigger` 与静态资源均 deliberate、`paths` 透传零漏点。
- **记为 Minor 的一条**：`GET /v1/runtime/clients` 的 `listClients()` **不按空间过滤**（`runtimeRegistry.mjs:133-143`），会回传其它空间的 `clientId` 与 `workspaceId` —— **元数据级**泄漏（空间名单本就公开；指名该 clientId 仍被空间校验拦成 503），deliberate per §4.5。
- **`server/CLAUDE.md` 一处需修**（T16 刚写的）：不变量自查命令 `grep -n "mkdirRaw\|mkdir("` **会同时命中 19 处 `mkdirInSpace(`**，给不出判据；且漏了 `writeTextIfChanged` 那一族。正确表述：「一切建目录调用（`mkdirRaw` 与 `writeTextIfChanged`）均经退休守护」，判据为 `mkdirRaw` 仅出现在 `:2` 与 `:76`。

### S2 的裁定依据（评审答，我采纳）

**隐藏下拉不够。** `gmp_space` 是**无签名的普通 Cookie**，devtools/curl/任意脚本/任意浏览器扩展一行即设；而 §14 已把「免登录下任何人可指定任意空间」列为**已接受前提** —— 故「有人把它设成非 default」**是这个模型的常态，不是需要绕鉴权才能到达的状态**。隐藏下拉唯一真实收益是把「误触发」降到接近零（回退路径只把 Cookie 设成 `spaces[0]`，`server.mjs:4762-4767`）。但一旦触发，代价**静默且不可逆**（§6.1 明言「重开页面也修不好」）。
**给读者的风险陈述（业经评审校准，不夸大不轻描淡写）**：
> 只上阶段一、并隐藏 swigger 空间下拉时，§6.1 的持久化污染**不会被正常操作触发**，但**不被任何机制阻止** —— 只需把 `gmp_space` 手工设为非 default 空间即可（devtools 或任意脚本，无需任何权限绕过，这正是该功能的公开契约）。一旦发生，污染表现为对目标空间 `device-library/library.json` / `color-config.json` / `measurement-config.json` 的**静默持久写入**，用户侧无法自愈。
**建议：阶段二同版本落地；若必须延后，用代码级闸门而非「UI 不可见」。**

### Ship-readiness 的结论

- **没有整条不可失败的测试**。恒真/低判别力断言都位于「同用例内已有可红孪生断言」处（`spaceConfigPaths.test.mjs:30/:63`、`spaceImagePaths.test.mjs:40-42`、`spaceCors.test.mjs:38` 之外的项、`spaceScope.test.mjs` 的 4 条 `existsSync(...).toBe(false)`）—— **本计划从 T1 起反复逮到的缺陷形态，最终态已压到零假断言**。
- T12 那条 ~40% 抖动的基线已由 `connectGap()` 修好（实现者连跑 10 次、复审另跑 5/5，并补了传递性依赖推演）；全仓无 `.only`/`.skip`/TODO/FIXME（grep 零命中）。
- **无仓库污染**：`data/` 下无 `spaces.json`、无 `workspaces/`、无 `trash-spaces/`，新测试未向真实数据根落任何东西。
- 单源不变量成立：`cors.mjs` 是唯一一份 `access-control-*`；`dataRoot` 全仓唯一求值点（`server.mjs:30`）。
- 陈旧陈述清单：spec 4 处（§3/§12#7 的 X-Space 编码、§4.2 的 `filesRoot` 属性简写注记、§7/§8 的 `apiV1Library` 5 处实为 6 handler/7 调用点、§4.2 改动清单量级偏大）；第三方 `.md` 两处（`DESIGN_THIRD_PARTY_API.md:131`/`:233`、`DESIGN_SWIGGER_CONTROL_API.md:93,105,151,225,233`）；根与 `src/CLAUDE.md` 完全无空间隔离（建议各补一行，「不得新增模块级路径常量」与「一切 mkdir 走 `mkdirInSpace`」目前只在 `server/CLAUDE.md` 一个 Common Patterns 项里）。

### 最终修复波 1（S1+S3）完成 —— `bd21b49a`（6 文件，4 改 2 增）

`pnpm vitest run server/` **43 文件 / 551 用例全通过**（含新增 2 文件 5 用例）；`tsc --noEmit` 通过；`audit:names` 干净；**既有测试一字未改**。
- **S1**：`server.mjs:4138-4153` 的 `handleDownload` 头改为 `private, max-age=31536000, immutable` + `vary: Cookie`。红化变异实测：改回 `public` 并删 `vary` → 新测试失败于 `expected 'public...' not to contain 'public'`，已还原。
- **S1 排查结论（评审要求的「是否还有其它同类」）**：全 `server/` 的 cache-control 写入点逐条核对，**无第二处「空间相关 + 可共享缓存」** —— `serveStaticAsset`(dist/)、SPA fallback、`serveIconLibraryAsset`(public/icon-library/)、swigger 均空间无关；`cacheableJsonHeaders`（image-folders/color-config/measurement-config/device-library）虽空间相关，但走 **`no-cache` + 内容哈希 ETag**，且 `preparedJsonFileCache` 以空间相关 `filePath` 为键 ⇒ 两空间内容不同则 ETag 不同、**304 不可能跨空间命中**；`getAssetDir` 只有 `handleDownload`（已修）与 `handleDeleteImageAsset`（JSON，no-store）两个消费者。
- **S3**：新增 `withSpacePaths` 于 `spaceStore.mjs:284-294`（**单源**），`v1SchemeRoutes` 全 10 条 + `v1LibraryRoutes` 全 6 条逐条套用（`apiV1Schemes.mjs:209-221`、`apiV1Library.mjs:162-170`）。**守卫放在路由表包装层而非 handler 内** —— 因 handler 必须继续可被**无 paths 直调单测**（`apiV1Library.test.mjs` / `apiV1Schemes.handlers.test.mjs` 即如此，全部保持绿）；helper 内 `options.paths ?? defaultPaths` **一字未动**。红化变异实测：任一条还原为裸 handler → 新测试失败，已还原。
- 实现者**补了第二条 S1 断言**：用「按原 id 导入两空间」构造同一 URL 回不同字节，钉住「header 所防的复用**确有内容差异**」，避免第一条退化成纯字面量断言。
- 实现者顾虑：① `handleDownload` 仍硬编码 `access-control-allow-origin: "*"`，与 T13 的 `cors.mjs` 单源不一致（本次范围外，未动 —— 即最终评审已记的 9 处内联之一）；② **`vary: Cookie` 对跨源调用方无效**（CORS `allow-headers` 不含 Cookie、浏览器也不允许），那条路径上靠 `private` 挡共享缓存。




















Task 11: 最终状态（`776f53c5`）逐点核对 —— `writeTextIfChanged` 判定在 `:315-320`；`mkdirRaw` 仅在 `:2`（别名）与 `:84`（原语内），`await mkdir(` = 0；`writeTextIfChanged` 共 5 处（`:315` 定义 + `:337`/`:361`/`:3591`/`:3624` 调用）；`git status --short shared/` 空；全量 155 files / **2696 绿**；`audit:names` 干净；无 MUTATION-PROBE 残留。



















**待同步到 spec 的设计变更（收尾时处理，勿忘）：**
1. `X-Space` 头须 percent-encode（非 ASCII id）—— 头值受 ByteString 限制，且服务端现在会解码一次。spec §3 的解析链表应补一行说明：「头值须为 ByteString，中文等非 ASCII id 请用 `encodeURIComponent`；`?space=` 与 cookie 由各自通道解码」。同时 §12 验收项 7（`curl -H "X-Space: 张三"`）**当前写法不可行**，须改为 `curl -H "X-Space: $(python -c "import urllib.parse;print(urllib.parse.quote('张三'))")"` 之类的编码形式。
2. §7 的端点作用域表与 §8 的分类：T8 实测 `apiV1Library.mjs` 为 6 handler / 7 调用点（spec 写 5）—— 已核实并修正计划。
3. §4.2 的改动清单：spec 写「`eFileExport`/`cimExport`/`sendModel` 约 10–15 处」，实测 T8 只改了 5 个生产文件、且 `svgExport.mjs` 与 `server.mjs` 均无需改动（T5 已做前者、后者归 T16）—— 真实改动面比 spec 估计的**小**。
4. T8 发现：spec §4.2 的「`filesRoot` 兼容别名」说明需补一句「属性简写形态不受带冒号的 grep 约束」。




















## 补记：三条 complete 行（原文缺失或格式不符，控制者补录）

本节由控制者在归档时补录。原因：台账撰写期间我多次用「前缀锚点」方式编辑，
两次吃掉了相邻条目的标题行；另有一条写成了 `**Task 13: complete**`（加粗星号
使 `^Task` 无法匹配）。三者内容均为当轮实际结论，非事后追认。

Task 8: complete (commits 801c3db8..00d6f9f3, review clean — Spec ✅ / Approved；唯一 Important 判为计划级残留（`filesRoot` 自检 grep 带冒号漏属性简写），不进修复循环)
Task 12: complete (commits 776f53c5..aa00b763, review clean — 主审 Needs fixes（测试墙钟基线 ~40% 自红）→ 修复轮 1 复审 ADDRESSED、无新增破坏)
Task 13: complete (commits aa00b763..7db97232, review clean — Spec ✅ / Approved；单源不变量经独立重查成立，守卫确认无 status 掩盖假绿)

## 最终遗留（parked，均经复审判定可留）

- `imageDownloadCache.test.mjs:63-68`：断言名写「同一 URL」，实际用 `?space=alpha` vs `?space=beta` 使 URL 不同、缓存键本就不同，故旧头下同样绿 —— **对 S1 无判别力**。它真实断言的是「同一 asset id 在两空间解析出不同字节」（有价值的前置条件），**不是空断言、也不掩盖缺陷**。S1 的钉住职责由 `:52-61` 独立充分承担（三个断言各对「改回 public」与「删 vary」两个变异红化）。修法一行：改用 `headers: { cookie: "gmp_space=alpha" }` 让 URL 真正相同。判定：**下次触碰该文件时顺手改**。
- `spaceId.test.mjs:54-56` 注释称「删掉 `prn|aux|...` 交替分支那 9 个用例仍全绿」，实际会红 `:30` 的 `COM1` —— 与实现者自己的修正相反。两个新用例本身经两种变异验证有效；问题只在注释文本。判定：同上。
- `spec:178` 仍引 `server.mjs:2633`/`:3550`，实际为 `:2707`/`:3639`；且新加的括号句「实际那两处引用都是图片库」正为这两个行号背书。Minor。
- 其余 52 条 deferred minor 的分诊依据见上文各处；最终评审的结论是「测试纯度类位于同用例已有可红孪生断言处、覆盖粒度类真出错时以抛错形式响亮失败」，故可留。
