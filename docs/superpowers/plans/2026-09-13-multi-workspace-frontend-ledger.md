# SDD ledger — plan: D:/work/graph_modeling_platform/docs/superpowers/plans/2026-09-13-multi-workspace-frontend.md

Spec: docs/superpowers/specs/2026-09-13-multi-workspace-design.md（v2；§5 前端改造、§6 浏览器侧持久化）
阶段一台账（已归档）：docs/superpowers/plans/2026-09-13-multi-workspace-backend-ledger.md
Branch: main（延续阶段一，用户已选直接提交 main）
Plan commit at start: a301c690

## Preflight conflict scan

### 跨任务（共享文件或接口）

| 对 | 产出 → 消费 | 结论 |
|----|------------|------|
| T1 → T2 | `fetchSpaces` / `createSpace` / `readSpaceCookie` | 一致；T1 先于 T2 ✓ |
| T1 → T3 | `writeSpaceCookie` | 一致；T1 先于 T3 ✓ |
| T2 → T3 | `requestSwitchSpace`（T2 **调用**、T3 **产出**） | 计划已显式注明归属并让 T2 用可选链调用（`__appScope.requestSwitchSpace?.(id)`），T2 单跑时由 mock 提供 ✓ |
| **T3 → T4** | **`clearSpaceScopedBrowserCaches`（T3 消费、T4 产出）** | **冲突：文档序 T3 在 T4 之前，而 T3 的 `switchToSpace` 序列第一步就调用它** |
| T2 ↔ T3 | 都改 `src/App.tsx`（T2 加列表 state、T3 加切换回调） | 顺序执行即可，无并行冲突（SDD 本就串行派发）✓ |
| T4 → T5 | 清理函数与清单 | 一致 ✓ |
| T2/T3/T4 → T5 | 切换流程整体 | 一致；T5 需前三者全部就位，排最后 ✓ |
| T1 ↔ T4 | 无共享 | — |

### 单任务内部自洽

| 任务 | 自洽性检查 | 结论 |
|------|-----------|------|
| T1 | 5 条断言 vs 实现；`document.cookie` 在 node 测试环境需桩，已注明参考 `runtimeWsClient.test.ts` 的桩法 | 一致 |
| T2 | 4 条断言 vs 组件；`requestSwitchSpace` 归属已修正为 T3 产出 | 一致（修正后） |
| T3 | 3 组断言 vs 4 文件改动；明确**不复用** `skipSaveCheck`（`getSkipSaveCheck()` 在 `appDeviceDefinitionFactories.tsx:2306` 被导出流程消费，语义不同） | 一致 |
| T4 | 3 组断言 + 全覆盖守卫 vs 清单；`VOLTAGE_LEVEL_SETTINGS_KEY` 归属需实施时分类，已注明「不要默认」 | 一致 |
| **T5** | **Step 2 的证伪方式与原执行序矛盾** —— 原文写「在 Task 4 未实现时应 FAIL」，但 T4 先于 T5 执行，故该失败不可能出现 | **冲突，见下** |

### Rulings

- **Ruling: 执行顺序改为 T1 → T2 → T4 → T3 → T5（非文档序号）** — T3 的 `switchToSpace` 序列第一步就是 `clearSpaceScopedBrowserCaches()`，而该导出由 T4 产出；按文档序号执行 T3 会调用一个尚不存在的导出。已把该顺序写入计划正文（`## 执行顺序` 一节）并说明「不要按文档序号执行」 — 代价若错：T3 直接引用不存在的导出而失败（可见、可立即发现，非静默）。
- **Ruling: T5 的 Step 2 改为「把 `clearSpaceScopedBrowserCaches` 临时改空实现 → 断言 e2e 变红 → 还原」** — 原文的证伪方式是「因为 T4 未实现所以该红」，在重排后的执行序里不成立（T4 先于 T5）。改为变异证伪后，该步仍然提供「清理函数是关闭 S2 的承重件」这一唯一证据，且与阶段一各任务的做法一致 — 代价若错：无；不修则该步变成一条永远通过的检查（阶段一反复出现的形态）。

## Progress

执行顺序（依 Ruling 1）：T1 → T2 → T4 → T3 → T5
BASE before T1: 47cfbe10

Task 1: 实现完成（`ecacbff3`，`src/spaceClient.ts` + `src/spaceClient.test.ts`，176 行新增；单文件 8/8 绿；**全量 161 文件 2741 用例绿**；`tsc --noEmit` exit 0）。
- **计划缺陷（T1 顾虑 1，被实现者证伪）：我 brief 里那条「往返断言」的变异是哑弹。** 我写「去掉 `encodeURIComponent` → 中文 id 下往返断言红，因后端解不出来」；实际 `decodeURIComponent("张三")` **是恒等且不抛错**，故裸中文照样通过该断言 —— **它根本没钉住编码**。真实断裂在 **HTTP 层**：裸中文不是 ByteString，fetch 发头即抛 `TypeError`。
- **Ruling（T1 的修正，采纳）：把往返断言拆成一对，各钉一个正交性质** —— **A1a**「写入 `document.cookie` 的值必须是 ASCII/ByteString」由**去掉编码**打红；**A1b**「该值经后端 `parseSpaceCookie` 还原等于原 id」由**双重编码**打红。评审用真实 `parseSpaceCookie` 探针跑三态**证实红集互斥**（去编码 → 只红 A1a；双重编码 → 只红 A1b），**故不是把一条断言写两遍，而是两条正交性质分别固定**。已据此改写计划 T1 的断言文本 — 代价若错：若两者红集不互斥，则它是重复断言而非两条钉子（评审已实测排除）。
- **T1 评审的额外收益（我没预料）：A1b 顺带把 cookie 名也绑死了** —— 前端常量若改名，`parseSpaceCookie`（用后端常量找名）返回 `""` → 红。故 `src/spaceClient.ts:14` 与 `server/spaceStore.mjs:234` 的**双份 `"gmp_space"` 不是无覆盖的重复**：两个静默回退入口（名不符、编码不符）都有断言。**与阶段一 T13 的 CORS 单源化结论相反** —— 差别在于**是否有跨侧断言把两侧锁住**：锁住了则可容忍重复，锁不住则必须单源。
- **Ruling（`.d.ts` 二次出现策略，采纳评审判据）：先判依赖方向，不要无条件下补声明** —— ① **共享的是值/常量清单** → **反向**：放 `src/` 下无 React/无 JSX 的纯 `.ts`，由 `server/*.mjs` 直载（该方向是本仓库已有且被 `nativeLoad.test.mjs` 守卫的一等公民，先例含 `src/export/static-button-targets.ts`）；② **测的是后端行为**（`src` 测试断言 `server`，如 T1 用 `parseSpaceCookie`）→ 第 2 处起为被消费符号补**一个** `server/*.d.mts`，并删掉对应 `@ts-expect-error`。理由：`@ts-expect-error` 的真实代价是**该 import 退化成 `any`** —— 后端改名则编译期不报、只在运行时炸，测试会红（不静默）但无编译期保障。**据此修正我先前的猜测：T4 不需要 `src→server` import**（它扫的 `*_STORAGE_KEY` 与 IDB store 名全在前端），故不为其加该约束。
Task 1: review 裁定 —— **Approved**。六接口齐备且签名正确；`GET` 返 `{spaces,current}` 裸 JSON（`server.mjs:4539`）、`POST` 返裸空间对象（`:4553`）均非 v1 信封，故复用 `fetchBackendJson` 不拆信封是对的；「前端不自算我是谁」由 `test:92-106`（cookie=李四、响应 current=张三）钉死；cookie 三属性、`readSpaceCookie` 三输入、`createSpace` 的 method/header/body 各有唯一打红变异；`server/**` 未改动。**Task 1: complete (commits 47cfbe10..ecacbff3)**
Task 1: minor (deferred): `test:109` 的 mock 错误体用旧式 `{error:"空间存储损坏。"}`，而 `/spaces` 实际经 `sendError` 带 code 返回信封形态（`server.mjs:1613`）；断言仍绿（同一 helper 处理两形态），但 mock 形状与真实响应不符。
Task 1: minor (deferred): A1a 只证 printable-ASCII，**不证 cookie-octet 合法性** —— 若有人把 `encodeURIComponent` 写成 `encodeURI`，`;`/`,` 会裸出而两条断言对 `张三` 都仍绿。但 `server/spaceId.mjs:5` 的 `ID_OK` 永不产生这两个字符，**受控 id 空间内不可达**。
- **Task 1: minor（会直接影响 T3 的测试，必须带进 T3 派发）：T1 测试的 mock `document` setter 不做同名覆盖** —— `writeSpaceCookie("A")` 后再 `writeSpaceCookie("B")` 会在 mock 里留下两条同名 cookie，而 `readSpaceCookie` 取首条即返回 "A"。T3 的切换时序测试会写 cookie，若沿用该 mock 需先修其覆盖语义，否则会出现「写完立刻读还是旧值」的假失败/假通过。
Task 1: minor (deferred): `readSpaceCookie` 是后端 `parseSpaceCookie` 的**跨边界镜像**（一份算法两处维护），靠 A1b 往返断言绑定 —— deliberate，非缺陷。

BASE before T2: 47cfbe10→ecacbff3

Task 2: 实现完成（`80a9439b`，含一项计划外第 4 文件改动；`appView.test.tsx` 新增 6 条全绿（69/69）；`tsc` 无错；`audit:names` 干净；全量 `PASS(2744) FAIL(2)`）。
- **计划缺陷（T2 事项 1，裁定接受其改动）：我的文件清单漏了一个真实的集成点 —— 必须改 `src/appExtracted/appView.tsx`（+4 行，把 `spaces`/`currentSpaceId` 加进 `<AppTopbar inputs={[…]}>` 的 memo 输入数组）。** 不改则**静默失效**：`MemoizedViewSection` 在列表加载完成后会跳过 topbar 重渲染，选择器永远停在空列表、不报错。已把该文件与理由写进计划（标注「实施时发现，我的清单漏了」）。**教训：`inputs` memo 数组是「新状态是否真的到达组件」的隐式契约 —— 新增一条 `__appScope` 状态并渲染它时，必须同时检查该状态是否在该组件的 memo 输入列表里。**
- **Ruling（T2 事项 2，需用户裁决 → 用户选「保留但如实命名为源码级断言」）：本仓库前端测试环境是 node，无 jsdom/happy-dom/@testing-library，`react-dom/server`/`createRoot`/`act(` 全仓出现 0 次，故 T2 的第 2、3 条断言（「current 来自后端而非 cookie」「只 fetch 一次」）**做不到行为断言**，只能退化为源码级形态断言（「源码不含 `readSpaceCookie`」「依赖数组为 `[]`」）。**裁定：加 devDeps 被否决**（会造出第二种前端测试范式，且与 T5 的 e2e 覆盖重叠）；**保留断言但改正名字与注释**，使其不声称行为覆盖，并在测试文件与报告里写明「不构成行为覆盖，真实渲染行为由 T5 的 e2e 承载」。依据是阶段一最终复审逮到的 `imageDownloadCache.test.mjs:63-68` 那条「名字断言的性质不是它构造出的性质」——名字必须诚实。第 1、4 条是真行为断言（桩 fetch + 真实调用序列）。
- **我的失误（T2 事项 3）：未为 T2 生成 brief**（漏跑 `task-brief`），实现者按计划正文 `:115-148` 作业（正确应对）；计划里的测试路径 `src/appExtracted/appView.test.tsx` 写错，真实为 `src/appView.test.tsx` —— 已修进计划。
- Task 2: 环境事实（待观察）：全量出现 `FAIL(2)`，实现者 stash 后于 HEAD 复现同样 2 条 ⇒ 与本次改动无关，属**既有偶发**。T1 的全量运行曾 2741 全绿，故为间歇性。已要求它在修复轮给出复现证据摘要。

### T4 派发前的独立核查 —— **逮到计划里 T4 的清单不完整，且漏的是最大的一档**

我在派发前核了 `src/` 下 `*_STORAGE_KEY` 的真实面：**30 个**（计划原文只列了约 14 个），另有 2 个非该命名形式的。分类后的完整清单已写入计划（照它实现）。**漏掉的 6 条空间数据 key 里，前四条装的正是「方案与模型数据本身」**：

| 漏掉的 key | 内容 | 后果 |
|---|---|---|
| `PROJECT_STORAGE_KEY` | 方案/模型数据 | 切空间后 localStorage 留着上一空间的模型 |
| `SCHEME_STORAGE_KEY` | 方案树 | 同上 |
| `ACTIVE_PROJECT_STORAGE_KEY` | 当前打开的模型 | 切空间后仍打开旧空间的模型 |
| `DRAFT_PROJECT_STORAGE_KEY` | 当前草稿 | 同上 |
| `LEGACY_CUSTOM_CATEGORY_LIBRARIES_STORAGE_KEY` | legacy 变体 | 图元库继承 |
| `LEGACY_CUSTOM_COMPONENT_LIBRARIES_STORAGE_KEY` | legacy 变体 | 同上 |

**与阶段一「三轮枚举入口点各漏一族」是同一失效模式**（我按「哪里写入过空间数据」回忆，而非按「全仓有哪些 key」枚举）。而这次**在 T4 开工前就被逮到**，恰好证明 T4 的守卫测试设计是对的方向 —— 它存在的理由就是迫使每个 key 被显式分类。

- **Ruling（T4 清单，采纳独立核查结果）：按分类后的完整清单实现，30 个 `*_STORAGE_KEY` + `VOLTAGE_LEVEL_SETTINGS_KEY` + IndexedDB store 名全部显式归类。** 清：localStorage 21 条（`appCoreCanvasUtilities.tsx:2099-2161` 的前 16 条 + `appPersistenceLibraryExport.tsx:1101-1105` 的 5 条 `E_DEVICE_DEFINITION_*`）+ sessionStorage 1 条（`REFRESH_RECOVERY_STORAGE_KEY`）+ `VOLTAGE_LEVEL_SETTINGS_KEY`（`model.ts:7402`，非 `*_STORAGE_KEY` 命名）+ IndexedDB。**不清（9 条，各带理由）**：`INTERACTION_MODE_*`、`LEFT_PANEL_MODE_*`、`RIGHT_PANEL_MODE_*`、`LEFT_PANEL_WIDTH_*`、`RIGHT_PANEL_WIDTH_*`、`STATUSBAR_HEIGHT_*`、`VALIDATION_PANEL_HEIGHT_*`（七条为面板宽度/显隐/交互模式，纯本机 UI 偏好）、`NATIVE_EXPORT_DIRECTORY_STORAGE_KEY`（`fileIO.ts:90`）、`TARGET_URL_STORAGE_KEY`（`SendModelDialog.tsx:20`）；另有非命名形式的 `runtimeWsClientId`（`runtimeWsClient.ts:8`，浏览器身份） — 代价若错：漏清 `PROJECT/S CHEME_STORAGE_KEY` 会让上一空间的方案与模型在本机留存并可能被回写进新空间，即 S2 的加重版。
- Task 2: 修复轮 1 待报告（两条断言如实命名为源码级 + 不改 devDeps，用户裁定）。

Task 2: 修复轮 1 完成（`d0fe392c`，仅改 `src/appView.test.tsx` +20/−6，新 commit 未 amend）。改名两条 + **主动发现并改名第三条**（memo inputs 守卫旧名「…选择器才会重渲染」同样声称行为覆盖 —— 它按同一裁定的**原则**处理并标注「若视为超范围可回退」）。**裁定：接受第三条改名**，原则是「名字不得声称它没有覆盖的东西」，该名字违反同一原则。另加 describe 级中文注释块（node 环境无 jsdom、devDeps 已否决、两条读源文本、真实行为由 T5 承载 —— 并如实注明 T5 的 e2e **当前尚不存在**）与各函数体内「只证明 X 不证明 Y」注释；报告写明「这两条不构成行为覆盖」。
- Task 2: 修复轮的**变异重验**（正确做法）：改名后重跑合并变异（`readSpaceCookie` + 依赖 `[]`→`[spaces]`）→ `PASS(4) FAIL(2)`，**恰好那两条红、其余 4 条不受影响** ⇒ 改名未削弱判别力。
- Task 2: **偶发失败诊断（本计划最扎实的一次，值得记为环境事实）**：同一代码连跑，**失败集合不稳定**且均崩在 vitest **collect 阶段** —— R1 `{swigger, iconLibraryIntegrity}`；R2 `{ZIP 三件套, swigger}`；**R3 把 T2 三个文件 stash 掉后跑（≈HEAD）仍 `FAIL(1)`、同为 swigger 的 collect 错 ⇒ 与 T2 无关、属既有**；两个文件单独跑 `PASS(105) FAIL(0)` ⇒ **并行收集期资源竞争**，非稳定失败。全量 `PASS(2746) FAIL(1)`（2746 = 基线 2740 + 新增 6，自洽）。**未修**（正确 —— 非本阶段引入，且阶段一已记录过同类「多 agent 并发跑测试」现象）。
Task 2: review 待派（BASE `ecacbff3` → HEAD `d0fe392c`）。

Task 2: review 完成 —— **Assessment: Needs fixes（仅限注释级；功能与集成已达标）**。承重的三件事都对：① 第 4 文件（`appView.tsx` 的 memo inputs）是**必需修复而非越界** —— 评审读源码确认 `AppTopbar` 自己把内容包在 `MemoizedViewSection` 里（`appTopbar.tsx:19-25`），比较器 `areViewSectionPropsEqual` 对 `inputs` 逐项 `Object.is`（`appViewRenderBoundary.tsx:9-22`）且 `render` 不入比较，故 `spaces` 换引用时不进 `inputs` → 该 section 永不重渲染；② 三条形态断言改名后既诚实又**未削弱判别力**（合并变异 `PASS(4) FAIL(2)` 恰好命中两条已改名者，其余四条不动）；③ flakiness 归因成立。
- **Task 2: 评审逮到的三条真问题（均已转修复轮 2）：** ① `appView.test.tsx:1139` 注释写「**两条**断言带后缀」实际为**三条**（`②` 行同病）—— **一份唯一目的就是如实描述覆盖的注释，自己变得不实了**（递归的失效模式）；② `:1145-1146` 称真实渲染行为由 T5 的 e2e 承载、「会实际展开选择器、点选并观察切换结果」，而**该文件当前不存在**，注释读起来像覆盖已就位；**报告里写了「尚未存在」而注释里没写 —— 注释才是下一个维护者读的地方**；③ 它新发现的缺口：`Modal.onOk → submitCreate → createSpaceThenSwitch` 这条链无人钉（删 `appTopbar.tsx:141` 或 `onOk` 不接，6 条全绿）。
- **Ruling（T2 评审第 3 条，我裁定「点名声明」而非「补断言」）：** 补一条文本断言只能证明「源码里有这行」，又是一条形态断言；**而这条链的真行为覆盖本就该由 T5 的 e2e 承载**（它会真的点 Modal 确定按钮）。在 node 环境里为它加形态断言，等于**用第二种形态断言掩盖同一层缺失** —— 与它刚做的改名要防的事同类。故要求在 describe 注释与报告里**点名该缺口**，并已写进 T5 计划：第 3 步必须**走 UI 交互**（填输入框、点「创建并切换」），不得直接调 helper。
- **Task 2 评审纠正我派发里的一处计数**：实际 **6 条 = 3 真行为 + 3 形态**且**只有 1 条桩 fetch**（我转述成「四条是真行为断言」有误；报告 §5.2 也漏了 1b 那条）。
- **Ruling（T2 评审关于 T5 覆盖的判断，采纳并写进 T5 计划）：T5 原设计**覆盖不到**「组件把后端 current 渲染出来」这一层 —— 必须显式补一条。** 两条理由：① **它从不制造 cookie 与 current 的分歧** —— 唯一改变空间标识的动作是切换，而切换会**同时**写 cookie 并 reload，之后 cookie == current == B；能让两者分叉的两条通道（`X-Space` 头、`?space=`）前端自身从不设置；② **它的断言落在磁盘文件上、不落在 UI 上**，选择器显示错了也照样绿。补法（已写进 T5 计划第 5 步）：先落 cookie=A、再带 `?space=B` 打开页面（后端 current=B、cookie=A），断言 antd Select 的**选中项文本**（`.ant-select-selection-item`）显示 **B 的名称**；**不能只断言「有选中值」**（那样两种实现都绿）；并在同一页面内再断言 `document.cookie` 仍是 A，**把「分歧真实存在」也钉住**，否则日后 cookie 语义一变该断言会**静默失效**（有断言、前提没了）。
- Task 2: 评审另报两条 Low 级新破坏（转后续）：`appTopbar.tsx:136-146` 的 `submitCreate` 只有 `try/finally`、无 `catch`，调用点 `void submitCreate()` → **未处理的 promise rejection**，`fetchBackendJson` 已产出的可读消息被丢弃（本仓库既有 `globalMessage` 可复用；无数据损失）；`App.tsx:1523-1525` 的 `refreshSpaces` 用 `catch {}` 静默吞掉拉取失败（注释已声明为有意取舍，可接受）。
- Task 2: 评审的两处证据瑕疵（台账对齐用）：报告 §7.4 写「stash 掉 T2 **三个**文件」而 T2 实改 **4 个**（推断为措辞笔误，`git stash` 无 pathspec 会全暂存）；验收项 #8「现有前端测试全绿」**字面不成立**（全量 1 条红，已归因非本任务）。

### T4 实施中发现：**4 条「裸字符串字面量」storage key，按我的简报口径守卫永远抓不到**

实现者按**比简报更宽的口径**扫了全仓 `localStorage`/`sessionStorage` 调用才发现（这正是「若扫出清单外的 key 就停下报告」那条要求起了作用）：

| key | 载体 | 内容 |
|-----|------|------|
| `eDeviceInterfaceLoadedTemplateName` | localStorage | 顶栏【当前模板】：上次导入/加载的 E 元件模板名 |
| `eDeviceInterfaceReadonlyMode` | localStorage | 同一状态机的只读标志 |
| `eDeviceTemplateImportResult` | localStorage | 上次 E 模板导入的 matched/skipped |
| `recentGlyphKinds` | sessionStorage | 顶栏「最近使用图元」快选 |

**前三条是建模态**（`eDeviceInterface*` 即记忆 `e-device-template-label.md` 记的那个状态机），跨空间泄漏会让新空间的模型显示旧空间的模板来源与只读态。
- **Ruling（T4 的 4 条，采纳路径 2「扩守卫」而非路径 1「收窄」）：4 条一并分类，且守卫扫描面扩到「裸字面量 storage 调用 + IndexedDB 库名」。** 分类：**前三条清**（建模态）；**`recentGlyphKinds` 也清**（**与实现者建议相反**，理由：它可能引用**空间专属的自定义图元种类**，而 sessionStorage 跨 `location.reload()` 存活；清除代价只是一个便利快捷列表 —— 若实现者读 `App.tsx:969,976` 后确认它**只**存内置 kind，可改判不清，代价一行）。**选路径 2 的理由**：路径 1 等于**明知守卫有一层漏洞而按原样交付**；而写裸字面量比声明常量更省事 —— 即漏洞恰好开在**未来改动最可能走的那条路上**；这 4 条已证明它不是理论漏洞。** 扫描面比常量扫描更重要，且要求实测「新增一个**裸字面量**（`localStorage.setItem("foo-bar", …)`）而不登记 → 守卫红」并把 RED 贴报告。清单因此变为**清 25 / 不清 9**。

Task 2: 修复轮 2 完成（`d0a69735`，仅改 `src/appView.test.tsx` +11/−6）—— 计数改正（开头明写「共 6 条：3 真行为 + 3 形态」，`②` 改「带该后缀的三条」）；T5 那句删去对未编写产物的具体步骤承诺，改为「『计划』由 T5 的 e2e 承载 —— 该文件当前尚不存在；确切覆盖范围以计划 Task 5 为准」；缺口点名为新的 `③` 项，**且写入前先实测变异**（`onOk` → `onOk={() => setCreateOpen(false)}` → `PASS(6) FAIL(0)`，已还原）。**实现者还把自述收窄**：原写「删 `onOk` 接线**或**删 `submitCreate` 本体」，因只实测了前者，改为只陈述实测过的那个变异 —— 即把「不得声称未验证之物」用在了自己要写的注释上。
Task 2: 定向复审 —— **All findings addressed，无新增 Critical/Important 破坏。Task 2: complete (commits ecacbff3..d0a69735)**。复审的独立核实比要求更细：① 逐条读该 describe 的 6 用例，确认带「（形态断言，非行为断言）」后缀的**恰为 3 条**（`:1180/:1194/:1206`），全仓 grep 该串 4 处命中 = 3 标题 + 1 注释引用，与实现者口径一致；② **静态验证了那个变异的合法性** —— `appTopbar.tsx:165` 改 `onOk` 后 `submitCreate` 仍被 `:172` 的 `onPressEnter` 引用，**不产生未用变量报错、可编译**，故变异成立（不成立的变异会给出假红证据）；③ **核实注释里的出处真实存在** —— 计划 `:255` 确写 `Create: e2e/spaceSwitch.spec.ts`（文件名引自计划非杜撰）、`ls e2e/` 确无该文件、`③` 的「经真实点击覆盖」出处是计划 `:265`（确要求走 UI 不调 helper），故**缺口已落到一个存在的产物上，非口头承诺**；④ 静态复核缺口成立 —— 6 条用例无一渲染 `SpaceSwitcher` 或调 `submitCreate`（`:1231` 直接调 `createSpaceThenTransfer`… 实为 `createSpaceThenSwitch`），`onOk` 不被任何断言触及；⑤ 全量不重跑的理由成立（只动注释与标题文本、标题无外部引用、测试文件层面已 69 绿）；⑥ diff 单 hunk 纯文本、`server/**` 未动。
Task 2: minor (deferred): `:1139` 括号组描述（「跑真实函数、桩 fetch、断言调用序列」）字面读成「三条都做了这三件事」不成立（选项派生两条无桩 fetch）—— 属前版沿用的压缩表述，非本轮引入。

### T4 实现完成（`12bcaadc`）—— 但它报的是 **6 条**清单外 key（非 4），且我的裁定未送达

- 我的路径 2 裁定**已发但未送到**（消息时序），故它**按原清单交付、未擅自分类** —— 处置正确（不擅自决定）。
- **它多报两条，是本计划至今第三个层次的发现**：**图标库缓存，含「运行期拼装前缀」**。这构成扫描面的**第三层**：

  | 层 | 形态 | 各自能扫到的 |
  |----|------|------------|
  | 1 | `*_STORAGE_KEY` 常量（30） | 常量扫描 |
  | 2 | 裸字符串字面量（+4） | 字面量扫描 |
  | 3 | **运行期拼装**（模板字符串 / `+` 拼接，+2） | **前两层都扫不到** |

- **Ruling（T4 三层扫描面，采纳并加要求）：守卫扫描面再扩一层覆盖「storage 调用的实参是模板字符串或 `+` 拼接」，与既有两层合并为同一条断言；并实测「新增一个运行期拼装的 key 而不登记 → 守卫红」。** 且**若运行期拼装无法用可靠正则穷尽，必须明确写出守卫覆盖不到的边界**，在报告与注释里声明「本守卫保证的是 X，不保证 Y」—— **不要让它看起来覆盖了一切**（这比多加一层正则更重要）。已裁定 4 条（3 条 E 模板建模态 + `recentGlyphKinds`，均清；`recentGlyphKinds` 与实现者建议相反，理由见上），**另 2 条图标库缓存待其补信息**（要求逐字给出 key 构造表达式 + file:line + 缓存内容 + 前缀变量是什么）。
- **Ruling（T4 的两处分类变更，均采纳）：① `KEPT_IDB_STORES` 收 `migration`** —— 实现者指出清掉它会触发重迁移的 `saveDeviceTemplates([])` **整表覆盖写**，可能**抹掉新空间的图元库**；这是真发现且方向与「清得越干净越好」相反。② `runtimeWsClientId` 并入同一白名单以让「不清集合」闭合。
- **Ruling（T4 问的 IDB 错误传播，已写进 T3 计划）：`clearSpaceScopedBrowserCaches()` 的 IDB 错误不得吞 —— 失败时中止切换（不写 cookie、不 reload）+ `globalMessage` 提示重试。** 理由：切换的全部意义就是「切换前先清干净」；清不干净就切等于**把 S2 打开且不让用户知道**。代价是 IDB 不可用时切不了空间（罕见、可重试、用户可自行清站点数据），比静默污染轻。T3 须补断言：清缓存抛错时 `writeSpaceCookie` 与 `reload` **都未被调用**；变异 = 把清理包在 `try/catch {}` 里继续往下走 → 红。
- Task 4: 变异证据（实现者实跑 6+ 条，各红对应断言）：只清 localStorage 组 → session/IDB 两条红；`localStorage.clear()` → 白名单断言红；`src/model.ts` 真加 `FOO_STORAGE_KEY` 不登记 → 守卫红（RED 已贴，临时常量已删、两文件与 HEAD 逐字节相同）；改坏扫描正则 → 灵敏度断言 + 「≥30 命中」双红；IDB 加 `fooCache` → 守卫红；清空白名单 reason → 红。全量 `2754 passed / 1 failed`（`swigger.examples.test.mjs`，单跑 95 passed ⇒ 已知并行采集噪声）。

Task 4: 最终交付（5 个提交：`12bcaadc` / `b7ba5eef` / `cde584f7` / `b4ee21b6` / `7d8922e8`）—— 单文件 **9 passed**；全量 162 文件 / **2756 全绿**；`tsc` 无错；变异载体 `git hash-object` 与 HEAD 全同。
- **三条图标库/模板键的信息已由实现者备齐，我的裁定（清）有证据支持**：`catalog` 键无变量（`iconLibraryCatalog.ts:6`）；`manifest` 键是 `` `${MANIFEST_CACHE_KEY_PREFIX}${libraryId}` ``（`:7`/`:364`，`libraryId = library.id`）；读写经 `readCacheJson(key)`/`writeCacheJson(key)`（`:160-187`）→ `browserCacheStorages()`（`:121-140`）= **localStorage 与 sessionStorage 两边都写**；**两处传的都是形参 `key`** ⇒ 三层扫描都抓不到。缓存的是**共享 `public/icon-library/` 的派生**（后端静态源 `join(repoRoot,"public","icon-library")`，`routes.test.mjs:125` 明文断言），**不含空间专属图标**（空间级导入走另一条链，其前端缓存是已在清表内的 `IMAGE_STORAGE_KEY`）⇒ **清除只花一次重取**。
- **实现者发现的一个真功能缺口（不是分类问题）**：manifest 的具体键是 `<前缀><库 id>`、**静态不可枚举 —— 按精确匹配根本清不掉**。故新增 **`clearKeysByPrefix()`**（先收集再删以免索引错位；**两个存储都清**），使 `SPACE_SCOPED_STORAGE_KEY_PREFIXES` 从**空登记处变成真正承重的清空逻辑**。另加**近失用例**（`…:manifest:v2` 少一个冒号必须留存），防「按前缀」退化成「模糊包含」。
- **`7d8922e8`（我列的 3 行的第 3 行）**：catalog 键**同登前缀清单**（纵深防御，防将来出现 `…:catalog:v2:<库 id>` 后缀变体；注释写明是有意重复、别合并掉）；前缀断言改为**遍历全表**（每个已登记前缀各放一个带后缀实例、两存储都要求清空）而非依赖 `[0]` 次序 ⇒ **「清单多了一条而清理函数没跟上」也会红**。实测三种变异（删 localStorage 侧调用 / 删两处调用 / `startsWith` 改精确相等）均给 `expected [ 'dirty','dirty' ] to deeply equal [ null, null ]`。
- **Ruling（T4 第三层与边界，采纳其做法）：停止扩第四层，改为把边界写死在模块头注释** —— 保证「所有**静态可见**的存储键都已分类」；**不保证** (d) 经辅助函数**形参**间接入 storage 的键（现存活例即上述两条）、(e) 运行期静态不可枚举的键、以及名字不含 `STORAGE_KEY`、跨文件算出的前缀；并明写「**新增 (d)/(e) 类键时守卫不会提醒你 —— 已知边界，不是疏漏**」。**未自建白名单**。实现者给出不扩第四层的**量化依据**：局部量拼装写法全仓 **20 处**全是 React key / 空间桶 key / 递归守卫 key；UPPER_SNAKE `*_KEY`/`*_PREFIX` 常量实测 **70 条**、绝大多数是 `Set`/数组/regex。
- **T4 第三层「目前零命中」如实标注** —— 仓库现状无运行期拼装形态，证据只在变异里。**说出来比让读者误以为它在守护现状更重要**（它守护的是未来）。
- **T4 实现者的一处方法改进（记入后续派发）**：用 **`git hash-object` 替代 `cmp`** 做还原校验 —— 因 `cmp` 的 stdout 重定向会被 rtk 横幅污染（我今日也踩过同一钩子）。
- Task 4: 时序缝隙（第二次，这次成因在实现者侧）：它报「收尾三项全部落地」时实际只做了我列的 3 行中的 2 行，第 3 行是随后意识到才补（`7d8922e8`）。**后果**：我据其报告派的 T4 评审包（`d0a69735..b4ee21b6`）落后一个提交。按已记教训**不中途改评审范围**，改为等其结束后对 `b4ee21b6..7d8922e8` 做定向复审。
- Task 4: 我的一处实体引用已过时（以实测为准，不回改）：实现者核到的是 `server/spaceStore.mjs:42` 与 `:32-34`，我先前记的是 `:31-44`（行号随 T11/T13/T14 漂移）。另其措辞 `data/spaces/<id>/` 应为 `data/workspaces/<id>/`（实质一致）。

BASE before T3: T4 产物冻结于 `7d8922e8`（T3 实际派发于 `b4ee21b6` 之后，依赖 `clearSpaceScopedBrowserCaches` 的导出契约未变）

Task 4: 修复轮完成（`1c382548`，基线 `7d8922e8`）—— ① (d) 从 2 条补到 **4 条**并加一句「**别把『在清单里』读成『受守卫保护』**」；② 近失用例走 (a)，补**前缀在中间**的对照 `x<前缀><库 id>` 必须留存（实测 `startsWith`→`includes(prefix)` 变异下红的正是这条新对照，而旧截断对照在 `includes` 下**反而是绿的** ⇒ 原先「防模糊包含」的声称确实超出所证）；③ 补 (f) 经 helper 形参入 storage 的键、(g) storage 别名开新键两类声明，**未扩扫描面**。
Task 4: 定向复审 —— **三条全部 ADDRESSED，无新增 Critical/Important 破坏。Task 4: complete (commits d0a69735..1c382548)**。复审自行扫 `src/**` 的裸标识符实参，命中**恰好 4 条无第 5 条**（`VOLTAGE_LEVEL_SETTINGS_KEY`/`CLIENT_ID_KEY`/`CATALOG_CACHE_KEY`/`MANIFEST_CACHE_KEY_PREFIX`）；核实 (f) 的 helper 调用点**全传常量无实参位字面量**、(g) 无 storage 别名开键写法、无 `localStorage["…"]` 下标写法；明列的 helper 与行号**全部属实**；保证/不保证两句**各自准确且互不打架**；`7d8922e8` 的 delta **正确无害**（catalog 同登精确与前缀两处不冲突、断言 `:246-247` 验的是后缀变体形态而非精确键、清空实现把整张前缀表当参数用故登记即生效、`startsWith` 只会命中带后缀键故重复不扩大删除范围）；表遍历前缀断言**确实加了那条敏感度**（`perPrefix` 现算自 `SPACE_SCOPED_STORAGE_KEY_PREFIXES.map(...)` ⇒ 清单多一条则自动多一个探针）。
- **Ruling（T4 复审的唯一「残留」经我核为假发现，不动作）：它称代码注释「`nearMiss` 不能区分 `startsWith` 与 `includes`」不成立，理由是「`nearMiss` 尾部含完整前缀，`"…v2".includes("…v2:")` 同样为 true」—— 该推理错**：`nearMiss` 是**更短的**串（`slice(0,-1)` 去掉尾冒号），**短串不可能 `includes` 更长的串**，故 `includes` 实现下 nearMiss 留存、断言同样绿 ⇒ 注释正确。且它**上一轮的原话与这轮相反**（上轮：「`"…:manifest:v2".includes("…:manifest:v2:")` 同样是 `false`，故 `includes` 照样通过」—— 那条是对的）。**按流程 park，不改注释。**
- **Task 4: 过程记录（值得记）：评审自身出现了它整轮在批的同一缺陷类** —— 一条与事实不符的判定（此例方向为「把一条真能区分的对照说成不能区分」，若照改会让注释失真）。**说明该缺陷类不只属于实现者：任何「声称」都可能与所证不符，包括评审的声称。** 这是本计划第一次由控制者复核后判定**评审**错而实现者对。
Task 4: minor (deferred): `spaceCache.ts:33` 措辞 —— 「把 runtimeWsClient 的 key**改名**……守卫照样绿」中「改名」若指**改值**则成立、若指「改标识符名而不改值」则清单按值仍匹配故不算漏；属措辞非事实错误。
Task 4: minor (deferred): commit message 笔误 `readSideStorageJsonWithLegacy`（应为 `readLocalStorageJsonWithLegacy`），代码与报告内正确，未 amend（遵守不 amend 约定）。
- Task 4: 环境事实（诚实记录，实现者主动撤回自己的声称）：**同一份代码连跑三次得 `1/2766`、`16/2755`、`3/2763`，失败集合每次不同**；逐条隔离后 `swigger.examples` 既有偶发（单跑 95 绿）、**`src/spaceSwitch.test.ts` 两条属 T3 在制品**、其余单跑全绿。报告 §5 已按实测改写，**不再声称「2756 全绿」**。**根因是我在同一工作区并行跑多 agent，各跑测试互相争资源** —— 幅度随并发数上升。据此：T4 复审的指令里明确要求「不跑全量、不跑任何增负载命令，只从代码推理」。










---

## 阶段二 · T3 修复轮（`1b204932`）

- **评审发现（唯一必须修项）**：`src/spaceSwitch.test.ts` 的时序断言里，清缓存桩是
  `mockImplementation(async () => { seq.push("clear"); })` —— async 函数体在**调用当刻同步**执行到第一个 await 之前，故 push 发生在调用瞬间。于是「`clearSpaceScopedBrowserCaches()` 调用但**不 await**」与正确实现得到**同一 push 顺序**，那条排序断言对 await 语义**没有判别力**。
- **修法一行**：桩里先 `await Promise.resolve()` 再 push（作者在同一任务的保存桩上已用过同一手法，见 `src/appProjectCanvasFactories.test.ts` 的「保存桩**先让出一次微任务再记录**」）。
- **实测（两跑，对照）**：
  1. 实现去掉 `await`、桩**已修** → `AssertionError: expected [ 'cookie:张三', 'reload', 'clear' ] to deeply equal [ 'clear', 'cookie:张三', 'reload' ]`（红，正是要钉的那条）。
  2. 实现**仍**去掉 `await`、桩**改回同步 push** → 排序断言**绿**（该跑只有「清缓存失败时中止切换」那条因未处理拒绝而红）⇒ 证明旧断言确实打不红这个变异，这一行是承重的。
- 修复后单文件 `5 passed`；`src/appProjectCanvasFactories.test.ts` `41 passed`；实现文件 `git hash-object` 与 HEAD 全同（还原校验，不用 `cmp` —— rtk 横幅会污染 stdout）。

## 阶段二 · T3 定向复审

- **报告在上一轮会话因上下文超限被截断**（`API Error 400 ... maximum context length`），只留下结尾残片。已向 `p2-review-task-3`（原评审）与 `p3-review-task-3`（本轮定向复审）各索要一份**简短清单**；结论待回后并入本文件。
- 已知且已处理的必须修项即上面那条 #1；复审的其余部分（规格符合性 5 条、断言判别力逐条表、图元库载入来源核实）以收到为准。

## 阶段二 · T5 实现 + 验收（`106462c4`）

### 为什么还要改产品代码
计划 T5 第 6 条点名的 S2 残留：`switchToSpace` 的清理只在**经顶栏切换**时发生，而 `gmp_space` 是无签名普通 Cookie（公开契约）—— 手工改成另一个空间再打开应用，`switchToSpace` 从不执行，**那半场仍开着**。

### 实现（约 30 行）
- `src/spaceCache.ts`：新增 `SPACE_CACHE_OWNER_STORAGE_KEY = "gmp_cache_space"`（记账：本套缓存属于哪个空间；**进「不清」白名单** —— 它就是清理的判据）+ `readCacheOwnerSpace` / `rememberCacheOwnerSpace` / `reconcileSpaceCacheOwnership(resolvedSpaceId)`。
- `src/main.tsx`：`createRoot` **之前** `await fetchSpaces()` → `reconcileSpaceCacheOwnership(current)`（失败不阻断启动，只让记账不写、下次重试）。
- **`switchToSpace` 有意不加记账**（别当成漏写）：切换后那次硬重载跑的正是本闸门，它看到「记账=旧空间、current=新空间」会再清一次（此刻缓存刚被清空，是空操作）并把记账改写成新空间。写进 `spaceCache.ts` 的注释里了。
- **无记账时只记不清**：无法区分「全新浏览器（缓存本就空）」与「升级上来的浏览器（缓存里有旧空间数据）」，而误清的代价不止一次重取 —— `clearSpaceScopedBrowserCaches` 先清 localStorage 再开 IDB，迁移簿记未落盘时重迁移会读到已清空的 legacy key 并以 `saveDeviceTemplates([])` **整表覆盖**。首次打开后记账即写上，后续每次启动都受闸门保护。
- 清缓存抛错（IDB 不可用）→ 不写记账 + 向上抛（写下去等于把「已对齐」这个错误前提固化）。

### 证据（四处变异各实跑一次，全部实红）
| 变异 | 结果 |
|------|------|
| `clearSpaceScopedBrowserCaches` 改空实现 | e2e 两条都红：`expected 'voltage' not to be 'voltage'` |
| 闸门挪到渲染之后（等价 useEffect） | e2e「手工改 cookie」**红**；「经顶栏 UI 切换」**仍绿** —— 后者靠 `switchToSpace` 清，正是两条路径相互独立的证据 |
| 闸门挪到 `createRoot` 之后 | `spaceCache.test.ts` 源码级断言红（`expected 459 to be less than 271`） |
| 桩改同步 push（T3 那条） | 见上节 |

非变异基线：`src/spaceCache.test.ts` 14 passed；`pnpm vitest run` 全量 **2772 passed / 0 failed**；`tsc --noEmit` 无错；e2e `3 passed`。

### e2e 落地形态与计划原文的三处偏离（均已写进 `e2e/spaceSwitch.e2e.test.mjs` 文件头）
1. **文件名**：计划写 `e2e/spaceSwitch.spec.ts`；本仓 e2e 由 vitest 驱动，`vite.e2e.config.ts` 的 include 只收 `e2e/**/*.test.mjs` → 命名 `spaceSwitch.e2e.test.mjs`。
2. **手工路径的构造**：计划写「手工设 cookie=A + `?space=B` 进入」。**该构造造不出分歧**：前端自身不发 `?space=`/`X-Space`（`src/spaceClient.ts:2`），页面 URL 上的 query 不会跟到它自己的 XHR 上（`GET /webgrp/spaces` 的 `current` 由**该 XHR 的** cookie 算出，`server.mjs:4534`），故前端读写的仍是 A、B 的落盘文件根本不被触及 —— 断言恒真、变异打不红。改按 S2 真实机制构造：**直接把 cookie 设成 B**，浏览器缓存里留着 A 的内容。实测这条在「清缓存空实现」与「闸门挪到渲染之后」两种变异下都红。
3. **计划第 5 条（「选择器显示后端 current 而非 cookie」）未实现**：其分歧在本架构下**不可证**。除上述原因外，即使把 cookie 设成后端不认识的 id，`resolution.source === "fallback"` 时后端会在**同一次响应**里 `set-cookie` 把 cookie 写回 `spaces[0]`（`server.mjs:4766-4770`），分歧在首个响应后即消失、来不及被断言观察到 ⇒ 本架构下 **cookie 与 current 恒等**。该条改由**能红**的替代断言顶上：「选择器的显示文案取自后端返回的 `name` 而不是 `id`」（变异：options 的 label 改成 value → 红）；而「current 来自后端而非 cookie」本身已由**组件级** mock 用例覆盖（`src/appView.test.tsx` 的「cookie=李四、current=张三」，那里分歧是可造的）。
4. 断言自足性：`expectSpaceBUnpolluted` **先等三个落盘文件存在再断言** —— 只写「若存在则不含」会让「回写压根没发生」也算通过，那正是本验收最容易骗过自己的地方。

### 验收表（计划 §验收 8 条）逐条状态
| # | 项 | 状态 |
|---|----|------|
| 1 | 清 Cookie 访问 → 落在 default、方案树与阶段一前一致 | **未验**（需人工/产品级核对） |
| 2 | 顶栏建「张三」→ 自动切过去 → 方案树空、图元库只有内置、图片库空 | **e2e 覆盖「建+切+新空间文件为默认值」**（`乙空间` 用例）；「图元库只有内置/图片库空」的逐项核对**未验** |
| 3 | 张三建方案 → 切回 default → 看不到「测试」 | **未验**（需人工） |
| 4 | 设计 §12#12：A 有改动 → 切到全新 B → B 落盘不含 A 的内容 | **已验**（e2e 两条路径 + 两处变异实红） |
| 5 | 有未保存修改时切换 → 弹现有对话框，三路都正确 | **组件级已验**（`appProjectCanvasFactories.test.ts` 的「切空间的未保存修改衔接」6 条）；e2e 未覆盖（真浏览器点对话框） |
| 6 | **prod 构建**下切换只弹一次对话框 | **未验**（dev 被 `import.meta.env.DEV` 短路，须 prod 构建 + preview 验） |
| 7 | 切换后 sessionStorage 无旧空间的刷新恢复草稿 | **间接已验**（`SPACE_SCOPED_SESSION_STORAGE_KEYS` 组清空有单测；e2e 未直接读 sessionStorage） |
| 8 | 现有前端测试全绿；`tsc` 无错 | **已验**（2772 passed / tsc 无错） |

**未验的 1 / 2(部分) / 3 / 6 项属产品级人工核对，不是代码缺口；不要把它们读成「已通过」。**

## 阶段二 · e2e 并行度（`93648e9f`）

- **新增第二个 e2e 文件把既有的 `pnpm test:e2e` 打红了**（13 绿 → 13 绿 1 红），红的是 `apiV1Control.e2e.test.mjs` 的 `control.device/delete`：`前端 WS 客户端未在 60000ms 内上线`。根因不是新用例本身，而是 harness 的端口**写死**（`e2e/controlHarness.mjs` 的 image-server 5184 / Vite 5183），而 vitest 默认**按文件并行** —— 两个环境互抢端口。修法一行：`vite.e2e.config.ts` 加 `fileParallelism: false`（e2e 文件少而慢，串行是这里唯一正确的并行度）。修后全量 e2e **14 passed**。
- 记一条方法：**「我新加的东西没坏」要连既有套件一起跑才算证完** —— 单跑新文件全绿说明不了任何事。这里单跑 3 passed、全量 13+1 红。

## 阶段二 · T3 计划第 3 条（图元库载入来源）由控制者直接核完

T3 的规格里有一条要求核实 T4 保留 IDB `migration` store 的**前提**是否成立：「新空间的图元库由后端载入」。直接读代码给出结论：

- `src/appExtracted/appToolbarHookFactories.tsx:2801-2822`：`backendDeviceLibrary.exists` 为真时，`setCustomDeviceTemplates(backendDeviceLibrary.customDeviceTemplates)` 等**全部取自后端响应**，随后 `return`（不落到回写分支）。回写分支在 `:2823` 之后，只在 `exists` 为假时执行。
- ⇒ **前提成立**：新空间只要后端有 `device-library/library.json`，图元库就来自后端而非浏览器本地缓存；T4 保留 `migration` store 不会让旧空间图元库继续生效。
- 附带确认回写三条路径与计划一致（`exists:false` 时把**浏览器侧** payload 写回）：配色 `:2780-2784`、图元库 `:2823-2839`、量测 `:2863-2867`。

## 阶段二 · 两份评审报告（本轮收到，逐条处置）

上一轮因上下文超限被截断的两份 T3 报告本轮都送到了（`p2-review-task-3` 原评审、`p3-review-task-3` 定向复审）。**两份各自独立地报到同一条 Critical**，且该 Critical 经我用真实浏览器实测**确认为真**。

### 已修的（Critical）

**切空间「不保存」路径下，`persistRefreshRecoveryNow()` 把旧空间模型就地写回 sessionStorage，T4 的 sessionStorage 清理被当场撤销（S2 复活）** —— 修于 `2491d142`。

- 链路：`spaceSwitch.ts:54,60-62`（清 → 写 Cookie → 置标志 → `location.reload()`）→ **卸载事件正是在 reload 期间触发** → `appToolbarHookFactories.tsx:3188/3191/3202` 三个入口**无条件**调 `persistRefreshRecoveryNow()`（跳过标志只被 `:3194` 用于 `preventDefault`，**没参与持久化**）→ `appProjectCanvasFactories.tsx:3066-3068` 的 discard 分支不复位 `hasUnsavedChanges`，故 `saveRequiredRef.current` 仍为真 → `appGraphMeasurementFactories.tsx:3700-3712` 写出旧空间模型 → 新空间启动读成「刷新恢复草稿」。
- **修法**：守卫**下沉到原语** `createPersistRefreshRecoveryNow`（置标志即只清不写），**不在三个事件入口各加一处** —— 枚举入口正是本计划栽过的坑（漏一族就复活）。顺带给 `appView.tsx` 那个自定义元件对话框的 `beforeunload` 也接了标志。
- **证据**：
  1. 单测（新增 2 条）：去掉守卫 → 红（`writeRefreshRecoveryProject` 被调用 1 次）。
  2. **e2e（新增第 4 条）**：用 `page.addInitScript` 在**新页面脚本开跑之前**读 sessionStorage —— 去掉守卫 → **红**，值含旧空间的 `projectName`/`activeProjectKey`；守卫在位 → `null`。
     - **探头选择的教训**：事后几秒再读 sessionStorage，**两种实现都是 null**（新空间 boot 会把草稿消费/清掉）—— 在错误的正上方直接断言是**测不出来**的。必须在「新页面起点」取样。这条是本计划里第二次「断言写法本身决定它能不能红」。
  3. 全量 2774 单测 + 15 e2e 全绿，`tsc` 无错。

### 已修的（非 Critical）

- **`spaceCache.ts` 两处注释**把「新空间图元库由后端载入」写成**无条件**前提（实际仅 `exists === true` 成立；`exists === false` 时本地才是源，抹掉 IDB 就是真丢）。已改为条件式表述，并写清「一只写镜像」的适用条件。

### 复核后判「评审错、我方对」的一条（不按评审改，记录在此）

- `p2-review-task-3` 的第 7 条称：`migration` store 的保留效力「挂在 `getMigrationStatus().completed`，**只有升 schema 才重跑**重迁移」。
- **该说法不成立**：`App.tsx:661-664` 是 `const status = await getMigrationStatus(); if (status?.completed) return;` —— 簿记被清则 `completed` 为假，**下次启动必重跑**（无需升 schema）。故注释里「清掉会触发重迁移」这句是对的，维持不改。这与 T4 复审那次同类：**该缺陷类不属于实现者，评审的声称同样可能超出所证**。

### 明确不做（记录理由，不静默丢）

| 来自 | 项 | 处置与理由 |
|---|---|---|
| p2 #6 | `spaceCache` 静态 import `lib/deviceLibraryDB` 把 `idb` 从动态 chunk 拉进主依赖图 | **不做**。`idb` 约 1 KB gzip，而入口本就背 470 KB 的 `model-routing`；改动态 import 要把它铺到 `clearKeys` 等同步路径与启动闸门两处，复杂度换不到可测收益。已知，非疏漏。 |
| p2 #2 / p3 Minor | `appView.tsx:2030-2039` 第二个 `beforeunload` 未接跳过标志 | **已做**（2 行）。虽然该 effect 只在自定义元件对话框打开时注册、而遮罩挡住顶栏使其今天不可达，但 `__appScope.requestSwitchSpace` 是可被脚本直接调用的，补上比辩护便宜。 |
| p3 Minor | `spaceSwitch.test.ts:106-112` 的源码级断言保证面窄于声称 | **不改**。测试注释已自陈「它证明的只有一件事：handler 用的是 `shouldPromptBeforeUnload` 而不是退回老的内联条件」。窄而诚实的断言可以留。 |
| p2 #4 / #5 | 「T5 的『B 文件不含 A 内容』在切换没发生时空过」/ 计划第 5 条构造不成立 | **#5 已按实测改**（见上文 T5 节）；**#4 已缓解** —— e2e 第 1 条先等「选择器显示新空间名」才断言，即先钉住「切换确实发生了」；`expectSpaceBUnpolluted` 又**先等三个落盘文件存在**再断言，不会因「回写没发生」而空过。 |
| p2 #8 | 报告口径「46 new test cases」应为 11 | 属报告转述，代码/测试无涉，**不改**。 |

## 阶段二 · F1 修复的定向复审（`p3-review-f1-fix`）

**结论：修复方向与位置都正确，那条链路被真正关掉；未发现第二写点、未发现绕过、未发现过度拦截。** 两处非阻塞项，均已处置。

- **无第二写点**：全仓对 `power-system-refresh-recovery` 的写入点只有一处 —— 字面量 key 定义在 `appCoreCanvasUtilities.tsx:2113`，`writeRefreshRecoveryProject` 的唯一调用点是 `appGraphMeasurementFactories.tsx:3724`（即新守卫的下游）。裸字符串在别处不出现（注释与 e2e 断言除外）。
- **守卫位置对，无绕过**：`persistRefreshRecoveryNow` 全仓三处调用（`appToolbarHookFactories.tsx:3188/3191/3202`）全落在同一原子函数上；`writeRefreshRecoveryProject` 虽被挂上 `__appScope`，但 scope 侧**无调用点**。下沉到原语覆盖全部入口。
- **无过度拦截**：`setSkipBeforeUnload(true)` 的产品调用点唯一（`spaceSwitch.ts:61`），且清缓存失败的两条前置 return 都发生在置标志**之前**，不留残标志。**已知低危缺口（如实记录）**：若 `location.reload()` 本身被浏览器拒载，标志会留在该页，此后该页的**真实**刷新会改为清草稿而非落盘 —— 代价是丢一次刷新恢复，不是数据污染。
- **`appView.tsx` 那处守卫「无害且必要」**：该 effect 只在自定义元件对话框打开时注册，标志为假时行为与改前逐字一致；它补上的洞是「对话框开着时切空间 → reload 被浏览器拦一次 → 用户取消就停在旧页面，而 Cookie 已写新空间、缓存已清空」。全仓 `beforeunload` 处理器仅两个，现已闭环。
- **新单测判别力：三条变异各打红**（评审实跑）：① 整块删守卫 → 第 1 条红；② 守卫体只留 `return;` → 第 1 条红（死在 `clearRefreshRecoveryProject` 计数）；③ 条件改恒真 → 第 2 条红。两条互不重叠。第 2 条守的错误实现是「把守卫写成恒真/无条件早返回」—— 用「一律不写」换修复会顺手关掉正常刷新的恢复草稿。
- **e2e 探针可信**（评审从 Playwright 语义确认）：`addInitScript` 在每次导航（含 `location.reload()`）的 document-start 执行，正是唯一能区分「没写」与「写了又被清」的时点；且**自带阴性对照** —— 去掉守卫时读到含旧空间数据的 JSON，这本身就证明 init script 在该次 reload 上确实先于页面脚本。
  - 其指出的软肋已改（`307b387d`）：`?? null` 会把「init script 没跑 / 读取抛错」也映射成 null，两种失败都表现为绿。已加**无条件哨兵**并断言它已置，探头自证跑过。
- **第 7 条（`spaceCache.ts` 机制归属）**：其正文在报告里被截断、未送达；我按自己的读码复核后确认**其方向成立**并改了（`b3badfbb`），理由与依据行号写进提交：`migrateFromLocalStorage` 的输入是 localStorage（`deviceLibraryMigration.ts:127-131`）而我们的清理恰好也清那三个 key ⇒ 读空源 + `saveDeviceTemplates()` 整表覆盖（`deviceLibraryStorage.ts:318`）；但产品代码里 `deviceLibraryStorage` 的唯一静态导入者是迁移模块自己，UI 的库来自 `App.tsx:658` 的 localStorage 再被后端覆盖 ⇒ **IDB 是只写镜像，那次覆盖本身不丢用户数据**，原注释「exists=false 时抹掉就是真丢」属过度声称。
- 记一条**同类教训的第三次出现**：`migration` 保留效力被两位评审分别说成「只有升 schema 才重跑」与「只是镜像」—— 前者错（`App.tsx:663-664` 簿记被清即必重跑），后者对。**评审的机制归属同样需要逐条核，不能整段照收。**

- **第 7 条正文已送达（`35c0d4ed` 按其口径补全）**：它为「机制归属不准」补上了**穷尽核实** —— 除静态 import 外还查了**动态** import（`appPersistenceLibraryExport.tsx:2678` 的 `import("../lib/deviceLibraryStorage")`，注释即写明是「缓存 IndexedDB 存储模块的动态导入」，`:2734` 也只解构三个 `save*`），并逐条列出 `deviceLibraryStorage.ts` 的**八个读函数**（`:107/135/150/200/212/223/264/280`）在产品代码里零消费者、`deviceLibraryDB.ts:94 isDBInitialized` 同样零消费者。我已自行复核这两行属实，注释改按两处导入点表述。
- 它同时点出我原注释的**自相矛盾**（先用「读函数无消费者」论证是镜像，紧接着说 `exists===false` 时「真丢」—— 同一个事实不能既证明「只写」又支撑「真丢」），并给出「重迁移全程只碰 IDB、不写后端/localStorage/React state」的逐行依据（`deviceLibraryMigration.ts:134/149/161/170/177`）。**这三条我都核过，成立。** 据此在注释里补了一句更硬的话：真正会被丢的是 legacy localStorage 那批键，而它们**无论如何**都会被本模块清掉 —— 保留 `migration` 救不了它们。
- 它另核 `saveDeviceTemplates` 确带 `store.clear()`（`deviceLibraryStorage.ts:318`，同形还有 `saveOverrides` 的 `:363`），故「整表覆盖写」这一描述本身准确。
- 我判其为「#7 前半对、后半曾错」的那条也一并定了口径：**「只有升 schema 才重跑」错**（`App.tsx:663-664`），**「只是镜像」对**。

## 阶段二 · /mcheck 合并前审查（base `1c382548`，只审本会话改动）

范围按用户裁定取「本会话改动」= `1c382548..HEAD`（15 个代码/测试文件，+1094/−23，16 提交）。工作区未提交改动 0 字节（3 条 `M` 只是 CRLF/stat 脏，内容与 HEAD 逐字节相同）。

### 两轴结果

**Standards 轴：无硬违规**，5 条判断题气味（成文规范逐条核过：无新增模块级路径常量、未改 `server/**`、`encodeURIComponent` 对称、`switchToSpace` 序列与约束第 5 条逐字一致、`requestSwitchSpace` 用 `__appScopeRef` 规避空依赖陷阱、新测试与源文件同目录）。

**Spec 轴：3 个「看着做了/没做」+ 2 处范围蔓延 + 1 处实现有疑** —— 其中最重的一条是**我自己判错的**（见下）。

### 我判错的两处（本轮最该记的）

1. **「计划第 5 条在本架构下不可证」—— 错的**（Spec 轴指出，我逐条核实后确认）。两处依据都不成立：`/webgrp/spaces` 在派发层 `isSpaceAgnostic` 白名单里（`server.mjs:4754-4757`），**该响应不写 `set-cookie`**；先前实测看到 cookie 被纠回 `default`，是**别的**非 agnostic 请求干的（fallback 时同响应 `set-cookie`，`server.mjs:4766-4770`），不是「分歧观察不到」。**已按能红的构造实现**（`93240dae`）：只给前端自己那次 `/webgrp/spaces` 请求的 URL 加 `?space=<B>` —— B 是已存在空间 ⇒ 走 `source:"query"` 而非 fallback ⇒ **不触发纠回**，无需任何响应手术。判别力实测：把 `setCurrentSpaceId(data.current)` 改成固定 `"default"` → 该用例红。
   - 顺带记一条工具事实：**`route.fetch()` + 剥 `set-cookie` 无效** —— 它走浏览器网络栈，真实响应的 `Set-Cookie` 在浏览器侧已被收下，改我们手里的副本删不掉（`route.fulfill({response, headers})` 与原型头是**合并**关系，删副本同样无效）。诊断输出把纠回发生在哪 5 条响应上列了出来（`/schemes`、`/device-library`、`/color-config`、`/measurement-config`、`/global-lines`）。
2. **我把该断言的覆盖出处引错了**（Spec 轴指出，已核）。李四/张三 的 mock 在 `src/spaceClient.test.ts:92-106`，是**模块级** `fetchSpaces` 测试、不渲染组件；`src/appView.test.tsx:1180-1192` 是**源码文本**断言，它自己写着「只证明源码里没出现 `readSpaceCookie`，不证明渲染时用了 current 的返回值」。两处都不足以顶替那条 e2e —— 我原先在 e2e 注释与台账里写的「已由组件级用例覆盖」是**声称超出所证**，出在我自己手里。

### 已修（`3e8571db` / `93240dae`）

| 项 | 来源 | 修法 |
|---|---|---|
| `switchToSpace` 不记账 → 每次切换后重载都在 `createRoot` 前白开 IDB + 4 个 `store.clear()`；且若那次 `fetchSpaces()` 失败，记账停在旧空间，新空间草稿会在下次成功启动时被清 | Efficiency#2 + Spec(4)（两轴独立报到） | 清完缓存即 `rememberCacheOwnerSpace(id)`；断言落进时序 seq、失败路径不记账 |
| 启动闸门 `catch {}` 静默吞掉「清缓存失败」 | Spec(3) | 只对清缓存失败 `showGlobalMessage` 提示（那是 S2 不设防）；`fetchSpaces` 失败仍安静 |
| 启动期多一个网络往返 + App 再拉同一份 `/spaces`（**是本次 diff 引入的**） | Efficiency#1 | `spaceClient.ts` 加一次性种子 `seedSpaces()`，只被第一个消费者取走 |
| e2e 死代码 `readIfExists`、`postJson` 实发 PUT | Standards#1#2, Simpl#1 | 删 / 改名 `putJson` |
| e2e 选择器等文案抄 3 遍、UI 建空间流程抄 2 遍 | Simpl#2 | 抽 `waitForSwitcherText` / `createSpaceViaUi` |
| `spaceCache.ts:348` 注释与同文件 `:217` 自相矛盾 | Standards#4, Simpl#3 | 改为「调用点只有两个：`switchToSpace`（清完之后）与启动闸门」 |
| `vite.e2e.config.ts` 声称串行是「唯一正确的并行度」 | Altitude#3 | 改为「低一层的补丁」，写明根因在 harness 固定端口、并连累了与之无关的 apiV1Control |

### 明确不做（附理由）

| 来自 | 项 | 理由 |
|---|---|---|
| Altitude#1 | 「三处跳过标志该合并吗」 | **不合并**。它论证第三处（`persistRefreshRecoveryNow`）是**反向行为**（只清不写、已下沉到原语、一次覆盖三个入口），合并只能做成「判定函数返回动作」，既更短更间接又会把差异行为改掉。**这条同时否掉了 Standards#3 的可执行性。** |
| Simpl#3 | `readCacheOwnerSpace`/`rememberCacheOwnerSpace` 单调用者应内联 | 修完记账那一条后各有 2 个调用者；且它们是模块对测试的接口 |
| Simpl#4 | `reconcileSpaceCacheOwnership` 两分支合一 | 合一会让每次启动都多写一次同值 `setItem` |
| Reuse#1 | `SPACE_SCOPED_IDB_STORES` 与 `deviceLibraryDB.ts:110` 第三份清单重复 | **它的理由不成立** —— 声称「漏一处该 store 就跨空间静默留存」，但 `spaceCache.test.ts:363-377` 已扫全仓 `createObjectStore("…")` 并要求逐个分类，新增 store **会红**。保留重复是便利问题，不是安全缺口 |
| Reuse#2 | e2e `spaceFiles()` 不复用 `spacePathsFor()` | 不改代码，**补了「有意不复用」的理由**（用被测方的路径工厂算断言位置，布局 bug 会自洽恒绿） |
| Simpl#5 | `requestSwitchSpace(id, name)` 可省一次 `__appScopeRef` 读 | 要动 T2 已评审的 `__appScope` 签名与 `appTopbar`，在本次 diff 之外 |
| Efficiency#3 / Altitude#2#3 | e2e 四次冷启动可共享 env / 端口动态分配 / keep→clear 表改命名空间前缀 | harness 手术，收益不抵风险；Altitude#2 那条会改行为（切回原空间会恢复其草稿，今天是丢） |
| Simpl 附注 | `KEPT_IDB_STORES[0].reason` 长到 150+ 字、与同数组粒度不一 | 已随注释修正压短 |

### 最终状态

`npx vitest run` **2774 passed / 0 failed**（163 文件）；`npx vitest run --config vite.e2e.config.ts` **15 passed / 0 failed**；`tsc --noEmit` 无错。
