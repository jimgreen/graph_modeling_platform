# 工作空间导入 / 导出（压缩包）· 执行台账

> 规格 `docs/superpowers/specs/2026-09-14-space-import-export-design.md` · 计划 `docs/superpowers/plans/2026-09-14-space-import-export.md`
> 执行方式：subagent-driven-development（每任务一个全新实现者 + 任务级评审 + 修复轮 + scoped 复审 + 整支最终评审）
> 范围 `ebb49c66..1534ca76`（21 提交 / 13 文件 / +2248 −23）

## 结论

- **整支最终评审：无 Critical，`Ready to merge? With fixes`** —— 两条 Important（I1/I2）已在唯一一次修复波中收口，scoped 复审 `all addressed`。
- 回归：`pnpm vitest run` **2822 passed / 0 failed** · `pnpm tsc --noEmit` 无错 · `pnpm test:e2e` **15 passed**。
- 最终评审对实现的原话：「实现正确、边界意识罕见地好 —— default 越界、zip-slip、失败回滚、名字往返这四件最容易出事的地方**都有真载荷且可证伪的用例**（逐条复核并独立推演了变异行为），未发现行为错误、越界写入或安全削弱」。

## 任务与提交

| 任务 | 提交范围 | 修复轮 / 复审 |
|---|---|---|
| T1 `server/spaceArchive.mjs` 打包器 | `f20366d2..770c3383` | 1 修 / 1 复 |
| T2 两端点 + 空间版解包器 | `770c3383..bd290984` | 5 修 / 5 复 |
| T3 前端 API 封装 | `bd290984..77501c11` | 1 修 / 1 复 |
| T4 顶栏导出/导入按钮 | `77501c11..9b191c47` | 3 修 / 2 复 |
| T5 口径 + 全量验收 | `9b191c47..57f5ab95` | 文档补修 1 次 |
| 整支最终修复波 | `57f5ab95..1534ca76` | 1 波 / 1 复 |

## 交付形态

- 后端：`server/spaceArchive.mjs`（空间 → ZIP 字节，只遍历 `spacePathsFor` 枚举的 5 个子目录）；`GET /webgrp/spaces/export`（按当前空间解析链）；`POST /webgrp/spaces/import`（一律新建空间、失败回滚并恢复退休登记）。ZIP 遍历骨架与安全守卫与方案侧**合并为一份**（`extractZipEntries(..., skipEntry)` / `zipRootNameFor(entries, fallback, label)`）。
  - **后续修正（2026-09-14，空间名唯一性）**：导入重名不再静默加后缀 —— 撞车 → 409 `SPACE_NAME_DUPLICATE`（正文带 `name`/`conflictId`），前端弹「覆盖 / 重命名」询问后带 `?mode=overwrite` 或 `?mode=rename&name=` 重发。同一条唯一性规则同时收紧 `POST /spaces` 新建与 `PUT /spaces` 改名。见规格 §4.2 / §5 / §6。
- 空间名接受规则**单源**到 `server/spaceId.mjs`（`normalizeSpaceName` + `isAcceptableSpaceName`：NFKC + 非空 + 非全符号 + 40 码点），被 `POST /spaces`、`PUT /spaces` 改名、导入三处共用 —— **对既有端点是收紧**（原先 POST 不设上限、不做 NFKC；改名原先连全符号名都不拒）。
- 前端：`src/spaceClient.ts` 的 `exportSpaceArchive` / `importSpaceArchive`（+ `sanitizeSpaceFileName`）；`src/appExtracted/appTopbar.tsx` 空间选择器右侧两按钮（**导出在浏览模式可用、导入禁用**）。
- 包格式：`<空间名>/space.json`（元信息，原始名）+ 五个子目录原样字节；排除 `schemes/trash/**`；导入时跳过 `space.json` ⇒ 往返逐字节一致。

## Rulings（控制者裁定，按发生顺序；每条含「错的话代价」）

1. **规格 §4.1 要求「目录读失败即上抛」，而 brief 的 `stat(dir).catch(() => null)` 连 EACCES/EPERM 也吞** ⇒ 以规格为准，收窄为只认 ENOENT、其余重抛。错的话：权限不足时从「静默跳过」变成整包导出失败 —— 宁失败不残缺。
2. 「空目录不落盘」**判无缺口**（不改代码）：导入端对每个文件 `mkdirInSpace(dirname(...))` 按需建目录。错的话：某空目录往返后消失，已由各写入点自己建目录兜住。
3. 「`spaceName` 是 id 还是显示名」**判真缺口**：`spaceStore` 的 name 是自由文本（改名只 trim），含 `/` 会污染 ZIP 顶层目录与文件名 ⇒ 导出端点建包前过 `safeFilePart`。错的话：名字带分隔符的空间导出后结构错位（仍在 targetDir 内、不越界，但往返不一致）。
4. 计划 Task 2 一节**4 处不成立**，逐条核实后照实现修正并写回计划与 brief：① `spaceStore` 是 `createImageServer` 闭包局部量，模块级 handler 引用必 `ReferenceError` → 显式透传；② default 的 name 是「默认空间」而规格 §3 规定顶层目录取空间名 → 断言随之改；③ AdmZip 的 `addFile` 会 canonical 掉 `..`，原 zip-slip 载荷实为**干净包**（会返回 200）→ 改 `entryName` 造真载荷；④ 方案解包器只跳 `.e`/`.svg`，`.png` 存活 → 见证改用 `.svg`。**③ 尤其要紧：照原稿写，那条 zip-slip 用例会绿得毫无判别力。**
5. **Important #1（回滚未补退休登记）判真、进修复轮**。已独立核实：`retiredSpaceRoots.add` 全仓只在 DELETE 路径出现，`spaceStore.remove` 够不着它。错的话：多一条永不撤下的登记 → 同名空间下次建出来被拒写。
6. 「空间名往返有损」**判真**：规格 §3 同时要求「顶层目录名 = 空间名」与「meta 里 name = 空间名」，而含 `/` 的名字**不可能**整体做单段目录名（该句不可实现）⇒ 原始名进 meta、净化名进目录与文件名。错的话：签名多一个可选参数，漏传则退回现状。
7. **Important #2（解包器逐字重复、连安全守卫一起）判真，但修法不是「直接复用方案解包器」**（那会丢 `.e`/`.svg`）⇒ 抽共享核心、两侧各传谓词。关键收益是**安全守卫单源**。错的话：动了既有的方案导入路径（570 server 测试 + swigger 示例兜）。
8. 「照 DELETE 给回滚补 `evictRegistry` 语义」**判不做**：导入路径全程只走裸 `writeFile`、从不触注册表，零实际效果，属投机复杂度。错的话：将来 import 若开始触全局线路注册表需补这一步。
9. 「空间侧安全守卫无用例可达（目录条目里的 `..` 才走到解包器）」**合并进本轮**而非按 Minor 延后：正在重写那条边界，重写边界而不给边界留测试不算完。
10. 实现者自报「导入侧 meta 名不再过 `safeFilePart`」**判对**（这才是往返无损：id 另算、上限 40 码点、排除分隔符，名字不进任何路径）；但它据此暴露的**信任边界缺口判真**：导入名来自**不可信压缩包**、绕过 `POST /spaces` 的接受规则且无长度上限 ⇒ 补 `normalizeImportedSpaceName`。错的话：极长/畸形名字的正常包被截断到 40 码点。
11. 「两层 zip-slip 守卫对现载荷各自冗余、单独删任一不变红」**判可接受**（实现者如实记录而没假称被单独覆盖）；**明确禁止**为凑单点红而删任何一层守卫。错的话：纵深防御少一层。
12. 复审建议「三处名规则单源留到后面」**不采纳、判现在收口**：这是根因处（三份规则会各自漂移），留着等于把「导出→导入静默改名字」随功能发出去。错的话：POST/PUT 既有行为被收紧（>40 码点与全符号名从接受变 400）。
13. 实现者**有意偏离我的 snippet**（我给的 `slice(0, MAX)` 与我自己的验收条件②互斥）⇒ **判它对、我错、采纳其偏离**：拒绝而非截断，任何入口都不静默截断。错的话：`normalizeSpaceName` 只剩 NFKC+trim；>40 码点的手造/旧版包导入后显示名落到包内顶层目录名（有损但不静默改长度）。
14. F-A（回退分支不过规则，而 `zipRootName` 的净化上限是 80 码元宽于名字上限）**判现在修**：判据是「可被创建的名字一定能无损往返 + 三处同门」这条不变量，不是严重度分级。错的话：极端包的名字从 60 码点降级为「导入空间」。
15. F-B（spec 行号指到别的 route 的注释行）**与此前同类，一并修**（绑定规格不得指着不存在的位置）。
16. 实现者**主动多改 `spec:74`**（「一律过 safeFilePart」→ 实现事实）⇒ 确认采纳（R1 的 F3 裁定已使原句不成立）。
17. 修复轮 4 **范围小幅扩大**（只文档）：全文扫 spec 里其余 `server.mjs:NNNN` 引用。理由：该缺陷类（引用被自己的提交顶漂）本轮已出现两次，逐个修等于等下轮复审再撞。
18. 导入成功后**仍调 `refreshSpaces()`**（不省那次请求）：切换是硬重载，但若用户有未保存修改而**取消**切换，列表必须已含新空间。错的话：多一次毫秒级请求。
19. **不给 `saveLazyBlobFile` 传自造 pickerId**，用默认值（共享「上次另存目录」是期望行为）。错的话：就是想要的。
20. **导出按钮去掉 `disabled={isBrowseMode}`，导入按钮保留**：导出是纯读动作；且同容器紧邻的 `<Select>` 在浏览模式仍可切换空间，造成「能换空间、不能备份当前空间」的不一致（**这条 brief 逐字要求了 disabled，是我的错**；本仓既有导出菜单整段无该门控，裁定即对齐现状）。错的话：浏览模式下多一个纯读按钮。
21. `importSpaceArchiveFromFile` 的 try 跨两个语义阶段（导入已成功后若 `refreshSpaces` 抛错，用户收到「导入空间失败」**错误归因**且不会切过去）⇒ **判不止 Minor、追加进本轮**。错的话：切空间失败不再被报成导入失败（方向正确）。
22. 测试直接赋值 `globalThis.showGlobalMessage` 不还原 ⇒ **追加进本轮**：用 `vi.stubGlobal` + `afterEach(vi.unstubAllGlobals)`，**不得**用 `delete`（会拆掉 `test-setup.ts` 装的桩）。
23. 「失败提示真的弹出 / Modal 真的不关」无行为覆盖、规格又不写 e2e ⇒ **判由 T5 手工验收承接**（已加进验收清单并实点）。错的话：这两条只靠人肉验一次，无回归网。
24. 实现者两处**形式偏离比我的字面要求更对**，**按实现者为准**：① F5 里给 `refreshSpaces` 再包一层静默 try/catch（我原话「移出 try」会让裸 `await` 的 reject 经 `void importSpaceArchiveFromFile(...)` 变成 unhandled rejection）；② F6 选 `vi.stubGlobal` 而非 `delete`。
25. 「导出/导入的 `disabled` 无任何测试钉住」**判现在收**：那是我这轮唯一的行为改动，改了行为就该留守卫。错的话：多一条形态断言的维护成本。
26. 复审指出我给的断言形状**过宽**（`not.toContain("disabled")` 会把将来任何合法的新禁用条件一起打红）⇒ **采纳其版本**：钉裁定本身（`isBrowseMode` 门控），两块都要。
27. 收尾仍按「每轮以 scoped 复审结束」办（不就着「它其实是消息竞态」合并掉复审）—— 拒绝用标签绕开流程。错的话：多一次小复审。
28. 根 `CLAUDE.md` 与 `src/CLAUDE.md` 同句「**前端半边尚未实现**」**判真、现在修**：本特性已把前端半边做完，那两句会让后续 agent 据此判断「前端没有空间支持」（保留仍为真约束：只用 Cookie、不设 `X-Space`、不带 `?space=`、current 取后端解析链）。
29. **不单独派 T5 的任务级评审**：T5 的改动就是那几行 `CLAUDE.md`，而整支最终评审覆盖同一范围且用更强模型；其余产物是验证输出。错的话：那几行只被看一遍。
30. **实现者纠正了我转述的数字**：我按最终评审的说法写「97 示例」，那是**测试数**；元数据实为 **71 端点 / 96 示例**（我独立复现确认它对我错）。错的话：一个文档数字偏 1。
31. 修复波的 scoped 复审按 `57f5ab95..fefb0a44` 打包，`1534ca76` 在其后落地 ⇒ 该 1 行文档改动不在复审范围内，**不再为一行文档派第 4 个复审席**，改由控制者直接核实（已做）。错的话：那一行只有我一个核验者。

## 遗留（交后续三角裁决 / 用户）

### 需用户处置

| # | 事项 |
|---|---|
| 1 | **`:5174` 上挂着陈旧后端（PID 48836）** —— 无 `/spaces/import`（404）。T5 最初误用它验收、**在真实数据目录里建出两个空间**（已完整回滚并复核：只剩 `default` + `高鹏`、`trash-spaces` 空）。**重启它**，否则后续人工验收会得到假结果。 |
| 2 | **原生另存为对话框未被人眼验过** —— 自动化里 `showSaveFilePicker` 被换成「只记录入参、随后抛 `AbortError`」的桩。实测到的是「按钮可点、处理器以正确文件名进入导出流程」。 |
| 3 | **`server/**/*.mjs` 既不进 `tsc --noEmit`（tsconfig 只 include `src`、`allowJs:false`）也不进 `audit:names`** ⇒ 「闭包外引用不存在名字」这类缺陷只能靠运行时测试兜（本次正是靠实测 400 响应才发现的）。最终评审建议**单开一支**：先跑一遍看既有告警量。 |
| 4 | **`assertZipUncompressedSizeWithinLimit` 读的是 entry header 里声明的 `size`** ⇒ 谎报大小的包可绕过 512MB 上限。两域共享、规格明写复用，但导入端输入是任意 zip —— 值得单列一条已知边界。 |

### 已知边界（有意保留，非疏漏）

- 包体积沿用方案 ZIP 的 256MB 请求体 / 512MB 解压总量上限，导出侧 `AdmZip.toBuffer()` 一次性进内存，不做分块；大包期间无进度。
- 导入不校验包内数据自洽性（交叉引用留给打开空间时的既有归一化与拓扑校验）。
- `sanitizeSpaceFileName`（前端对后端 `sanitizeSegment` 的镜像）**全仓零直接用例**：「含 `/` 名字导出文件名合法」与「前后端同值」两条都无守卫（最终复审发现）。更好的未来形状：既然后端已用 `content-disposition` 给出文件名，前端应**读该响应头**而非镜像净化规则。
- `server.mjs` 的 `readRawBody` 在 try 之外：超限时客户端拿到网络错误而非「空间压缩包过大…」的中文提示。与方案域逐字同形属**继承**，改它要动共享行为。
- 两条源码级形态断言（`appView.test.tsx`）当前形状可接受；若将来引入 `@testing-library/react`，应优先改写为渲染断言。

### deferred minors（25 条，最终评审三角裁决：**全部判「可留」**）

其中 8 条标 ⚙（≤10 行）已在最终修复波中顺带修掉：`isMissingPathError` 调用点用例、5 目录名改从 `paths` 取、假守卫 + 错注释、导出兜底标签语义、spec 跨文件行号、根 `CLAUDE.md` 标题、`server/CLAUDE.md` 示例/端点计数、`maxSpaceZipBodyBytes` 常量去重。

其余「可留」项（摘）：`server/CLAUDE.md` 与 `tsc`/`audit:names` 的 server 覆盖面、报告跑次数字未复跑、导出 default 用例硬断言「默认空间」（改名 default 时会红，那时正该被要求裁定）、`:4477` 可达性为零的空洞、「回收复用」用例把根永久留在 `retiredSpaceRoots`、`vi.mock("./fileIO")` 缺作用域注记、F5 单独看判别力弱、`file.type || "application/zip"` 回退分支无用例走到、导出按钮自闭合写法会让惰性正则顺延致误判、用别的名字门控浏览模式时那条断言不会红（钉裁定而非钉属性的主动代价）。

> 台账归并时的一条作废说明：原记「>40 码点按码点切会断开 ZWJ 序列」**已失效** —— 截断逻辑在 `913dae05` 的裁定里整段删除，`normalizeSpaceName` 只做 NFKC + trim。

## 过程记录（与代码无关但值得留）

- **五轮修复里有三轮起于我自己**：brief 的 `spaceStore` 作用域、我给的 snippet 与我自己写的验收条件互斥、F-A 的回退分支。实现者与复审各纠正过一次、我各认了一次 —— 「声称超出所证」这个缺陷类不属于某一方。
- **我两次在实现者仍在交付时按其当时的 HEAD 打复审包**（T4 的追加、修复波的第二个提交），两次都不是实现者的错。教训：收尾阶段应等实现者明确「全部交付完毕」再打复审包。
- 评审侧也纠正过我两次：断言形状过宽、deferred minors 计数（实为 25 条）。
