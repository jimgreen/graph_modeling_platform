# 多用户工作空间 · 前端半边（阶段二）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让前端具备空间感知能力 —— 顶栏可建/切空间；切换时清空浏览器侧空间缓存再硬重载；从而关闭设计 §6 的浏览器持久化污染窗口（其可达性已在阶段一评审中证实）。

**Architecture:** 三个新模块各担一件事：`src/spaceClient.ts`（Cookie 读写 + 空间 CRUD 的 API 封装）、`src/spaceCache.ts`（浏览器侧空间缓存清单与清理，**单源**）、`src/spaceSwitch.ts`（切换时序编排）。顶栏加 antd `Select`。未保存确认复用现有 `UnsavedChangeAction` 机制（加第四个 `kind`）。**不改后端任何文件** —— 阶段一已交付并评审（50 提交、553 测试绿）。

**Tech Stack:** React 19、TypeScript、antd 6、Vite 7、Vitest 3、Playwright（e2e）。

## Global Constraints

- **前端不得新增模块级路径常量**；**不得改任何 `server/**`**（含测试）。若发现后端缺陷，停下报告。
- `__appScope` 每帧重建：空依赖 `useEffect` 的闭包会冻结在首次渲染，需读最新状态时用 `__appScopeRef.current`（`src/CLAUDE.md` 的既有陷阱）。
- 测试与源文件同目录，命名 `*.test.ts` / `*.test.tsx`。UI 组件优先用 **antd**，不自造。
- **空间标识只用 Cookie**（前端不设 `X-Space` 头）。值必须 `encodeURIComponent` —— 后端 `parseSpaceCookie` 会 `decodeURIComponent` 一次（`server/spaceStore.mjs:237-250`），**两侧不对称即中文空间名静默失效**。
- 切换空间的动作序列**固定为**：清浏览器缓存 → 写 Cookie → 置「跳过 beforeunload 提示」标志 → `location.reload()`。
- **本文档的编写约定（阶段一实测得出的偏离，见下）**：每条任务给出**锚点（file:line + 签名）、不变量、断言与其可红化变异**，但**不给整段可誊写的实现代码**。理由：阶段一 16 个任务里，我预写的代码在多数任务中被实现者就地修正（如把 brief 的测试文本判为「写出来不可能通过」的有 5 处），而**锚点、不变量与「断言必须能红」这三样从未被推翻**。故本文档把精度放在后三者上；实现体请读现有代码再写。

### 阶段一定下的教训，本阶段直接继承

1. **每条断言必须能指出打红它的变异。** 阶段一每轮评审都逮到过「不能失败」的断言；最终态才压到零。构造不出可红化变异的断言，明确声明而不是留着。
2. **不要用 sleep 弥合时序。** 阶段一有一个测试文件因「两个 WS 客户端同毫秒注册」导致基线 ~40% 自红，使整批变异证据失效。顺序前提要靠结构（显式制造差异 / await 到落定信号）。
3. **不变量优先下沉到原语，而不是靠枚举逐点加。** 阶段一三次枚举入口点各漏一族，最后靠把守卫下沉到 `mkdir` 原语 + 改名才彻底。本阶段对应的是 §6 的缓存清单 —— 故 Task 4 的守卫测试是本阶段最重要的一件事。
4. **自查命令必须具判别力。** 阶段一我写过多条不具判别力的自检（`grep "filesRoot:"` 漏属性简写、`grep "mkdirRaw\|mkdir("` 撞上 19 处 `mkdirInSpace(`）。写自检时先想「这条能否区分两种状态」。

---

## 执行顺序（预检裁定，非文档顺序）

**T1 → T2 → T4 → T3 → T5**

原因：**T3 依赖 T4 的 `clearSpaceScopedBrowserCaches()`**（`switchToSpace` 的序列第一步就是它），故 T4 必须先于 T3。文档按「概念依赖」顺序编排（客户端 → UI → 时序 → 缓存 → 验收），执行必须按上面这个顺序。**不要按文档序号执行 T3 早于 T4** —— 那会让 T3 调用一个尚不存在的导出。

其余依赖均已顺序一致：T1 先于 T2/T3（`fetchSpaces`/`createSpace`/`writeSpaceCookie`）、T4 独立、T5 最后（需 T2+T3+T4 全部就位）。

---

## File Structure

| 文件 | 职责 | 动作 |
|------|------|------|
| `src/spaceClient.ts` | Cookie 读写（与后端对称）+ `GET/POST /webgrp/spaces` 封装 | 新建 |
| `src/spaceClient.test.ts` | 上述测试（含**与后端 `parseSpaceCookie` 的往返断言**） | 新建 |
| `src/spaceCache.ts` | 浏览器侧空间缓存**单源清单** + 清理函数 | 新建 |
| `src/spaceCache.test.ts` | 清理行为 + **清单全覆盖守卫**（扫全仓 key） | 新建 |
| `src/spaceSwitch.ts` | 切换时序编排 + beforeunload 跳过标志 | 新建 |
| `src/spaceSwitch.test.ts` | 时序断言 | 新建 |
| `src/appExtracted/appTopbar.tsx` | 加 `SpaceSwitcher`（紧邻 `RuntimeWsIndicator`） | 修改 |
| `src/App.tsx` | 空间列表 `useState` + 切换回调，挂进 `__appScope` | 修改 |
| `src/appExtracted/appCoreCanvasUtilities.tsx` | `UnsavedChangeAction` 加 `switch-space` 变体（`:591-611`） | 修改 |
| `src/appExtracted/appProjectCanvasFactories.tsx` | `createResolveUnsavedChangeAction`（`:3010`，分支在 `:3047/3052/3062`）加 `switch-space` 分支 | 修改 |
| `src/appExtracted/appToolbarHookFactories.tsx` | `beforeunload` handler（`:3189-3198`）加跳过判定 | 修改 |
| `e2e/spaceSwitch.spec.ts` | 端到端：切换后新空间不被旧空间本地缓存污染（**关闭 S2 的验收**） | 新建 |

---

### Task 1: `src/spaceClient.ts` — Cookie 与空间 API 封装

**Files:**
- Create: `src/spaceClient.ts`
- Test: `src/spaceClient.test.ts`

**Interfaces:**
- Consumes: `apiPath`（`src/config.ts`）；`fetchBackendJson`（`src/appExtracted/appCoreCanvasUtilities.tsx:3700`，签名 `(url, fallbackMessage, init?)`）；`backendJsonRequest`（同文件 `:3708`）；后端 `parseSpaceCookie`（`server/spaceStore.mjs:237`，**仅供测试往返断言**）
- Produces:
  - `export type Space = { id: string; name: string; pinned?: boolean; createdAt: string; lastAccessAt?: string }`
  - `export const SPACE_COOKIE_NAME = "gmp_space"`
  - `export function writeSpaceCookie(id: string): void`
  - `export function readSpaceCookie(): string`
  - `export async function fetchSpaces(): Promise<{ spaces: Space[]; current: string }>`
  - `export async function createSpace(name: string): Promise<Space>`

- [ ] **Step 1: 写失败测试**

测试要点（不是完整代码 —— 按「先想每条断言打红它的变异」写）：

1. **往返对称性（本任务的核心断言）—— 实施时修正：必须拆成两条，一条钉一个失败方向。** 原文写「`writeSpaceCookie("张三")` 后取 cookie 值 → 交给后端 `parseSpaceCookie` → 必须等于 `"张三"`」，并以「去掉 `encodeURIComponent`」为变异 —— **该变异不成立**：`decodeURIComponent("张三")` 是**恒等且不抛错**，故裸中文照样通过这条往返断言，它**根本没钉住编码**。真实断裂在 **HTTP 层**：裸中文不是 ByteString，fetch 发头即抛 `TypeError`。故拆成：
   - **A1a 头值合法性**：写入的 cookie 值必须是纯 ASCII / ByteString（可用 `/[^\x20-\x7E]/` 断言无残留非 ASCII 字节）。变异：**去掉** `encodeURIComponent` → 红。
   - **A1b 后端可还原**：把 `document.cookie` 里的值交给后端 `parseSpaceCookie` → 必须等于原 id。变异：**双重编码**（如先 `encodeURIComponent` 再存已编码串）→ 红。
   - **用例必须含中文 id**（只测 ASCII 则 A1a/A1b 都可能在错误实现下绿）。
   - 这两条合起来才构成「写入端编码正确 + 读取端解码一次」的完整契约；单靠任一条都留有失败方向。
2. **Cookie 属性**：写入串含 `Path=/`（缺它则前端 base 子路径与 WS 握手拿不到）、`Max-Age=31536000`、`SameSite=Lax`。
   - 变异：去掉 `Path=/` → 断言红
3. **多 cookie 解析**：`a=1; gmp_space=李四; b=2` 能取出 `李四`（`readSpaceCookie`）。
   - 变异：改用 `split(";")[0]` 之类取首段 → 红
4. **`fetchSpaces` 形状**：返回 `{spaces, current}`，`current` 来自后端响应而非本地推断（阶段一 §3.3 已定：前端不自算「我是谁」）。
   - 变异：把 `current` 改成 `readSpaceCookie()` → 用一个「cookie 与后端 current 不一致」的 mock 响应用例使其红
5. **`createSpace`** 走 `POST /webgrp/spaces`，body `{name}`，返回新空间对象。
   - 变异：误用 `GET` 或漏 body → 红

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/spaceClient.test.ts`
Expected: FAIL —— 模块不存在

- [ ] **Step 3: 实现**

读两个现有实现再写：`src/config.ts` 的 `apiPath`、`appCoreCanvasUtilities.tsx:3700-3714` 的 fetch 封装（**复用，不要另写一个 fetch wrapper**）。注意测试环境无浏览器：`document.cookie` 在 vitest 的 node 环境下需要桩（参考 `src/runtimeWsClient.test.ts` 对 `localStorage` 的桩法）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/spaceClient.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/spaceClient.ts src/spaceClient.test.ts
git commit -m "feat(space): 前端空间客户端——Cookie 与 /webgrp/spaces 封装"
```

---

### Task 2: 顶栏 `SpaceSwitcher`

**Files:**
- Modify: `src/appExtracted/appTopbar.tsx`（`RuntimeWsIndicator` 定义在 `:25`，主返回 `:134`；`.topbar-model` 在 `:143`）
- Modify: `src/App.tsx`（`useState` + `Object.assign(__appScope, …)` 惯例）
- **Modify: `src/appExtracted/appView.tsx`（实施时发现，我的清单漏了 —— 必须改）** —— 把 `spaces` / `currentSpaceId` 加进 `<AppTopbar inputs={[…]}>` 的 memo 输入数组。**不改则静默失效**：`MemoizedViewSection` 在列表加载完成后会跳过 topbar 的重渲染，选择器永远停在空列表（不报错）。补一条守卫用例钉住「列表加载后 topbar 确实更新」。
- Test: `src/appView.test.tsx`（**真实路径在 `src/` 根，不是 `src/appExtracted/`** —— 计划原文写错，实施时更正）

**Interfaces:**
- Consumes: Task 1 的 `fetchSpaces` / `createSpace` / `readSpaceCookie`；`__appScope.requestSwitchSpace`（**由 Task 3 产出** —— 本任务只调用）
- Produces: `__appScope.spaces: Space[]`、`__appScope.currentSpaceId: string`、`__appScope.refreshSpaces(): Promise<void>`、`__appScope.showSpaceSwitcherRef`（如需要）

**跨任务接口归属（勿混）：** `requestSwitchSpace` —— 「切空间」这个动作的编排（查未保存 → 弹框 → 清缓存 → 写 cookie → reload）**属 Task 3**，它同时在 `App.tsx` 里挂上该回调。本任务只**渲染入口并调用**它，故调用点写成 `__appScope.requestSwitchSpace?.(id)`（**带可选链**：Task 2 单跑时该回调尚不存在，测试用 mock 提供）。两个任务都会改 `App.tsx`（本任务加列表 state，Task 3 加切换回调）—— 按任务顺序执行即可，无并行冲突。

- [ ] **Step 1: 写失败测试**

1. **选项数与后端一致**：mock `fetchSpaces` 返回 3 个空间 → 渲染出 3 个选项 + 1 个「＋ 新建空间…」。
   - 变异：把列表硬编码成常量 → 红
2. **当前值来自后端 `current`**，不是 `readSpaceCookie()`。
   - 变异：改用 cookie → 用「cookie=李四、current=张三」的 mock 使其红
3. **只 fetch 一次**：组件重渲染不应重复请求。
   - 变异：把 `useEffect` 的依赖从 `[]` 改成每次渲染 → 计数断言红（**注意 `__appScope` 每帧重建，正确写法是空依赖 + `__appScopeRef.current`**）
4. **新建成功后触发切换**：`Modal` 提交 → 调 `createSpace` 再调 `requestSwitchSpace(newId)`。
   - 变异：只 `createSpace` 不切换 → 红

- [ ] **Step 2: 跑测试确认失败** → **Step 3: 实现** → **Step 4: 跑通**

Run: `pnpm vitest run src/appExtracted/appView.test.tsx`

- [ ] **Step 5: 提交**

```bash
git add src/appExtracted/appTopbar.tsx src/App.tsx src/appExtracted/appView.test.tsx
git commit -m "feat(space): 顶栏空间选择器与新建空间"
```

---

### Task 3: 切换时序 + 未保存复用 + beforeunload 跳过

**Files:**
- Create: `src/spaceSwitch.ts`、`src/spaceSwitch.test.ts`
- Modify: `src/App.tsx`（挂 `__appScope.requestSwitchSpace`）
- Modify: `src/appExtracted/appCoreCanvasUtilities.tsx`（`UnsavedChangeAction` 在 `:591-611`）
- Modify: `src/appExtracted/appProjectCanvasFactories.tsx`（`createResolveUnsavedChangeAction` 在 `:3010`，分支链在 `:3047`/`:3052`/`:3062`）
- Modify: `src/appExtracted/appToolbarHookFactories.tsx`（`beforeunload` handler 在 `:3189-3198`）

**Interfaces:**
- Consumes: Task 1 的 `writeSpaceCookie`；**Task 4 的 `clearSpaceScopedBrowserCaches()`**
- Produces:
  - `src/spaceSwitch.ts`: `export function setSkipBeforeUnload(v: boolean): void`、`export function isSkipBeforeUnload(): boolean`、`export function switchToSpace(id: string): void`
  - `UnsavedChangeAction` 新增 `| { kind: "switch-space"; spaceId: string; label: string }`
  - **`__appScope.requestSwitchSpace(id: string): void`（本任务产出并挂进 `App.tsx`）** —— Task 2 只渲染入口并调用它

**关于 beforeunload 标志：不要复用 `skipSaveCheck`。** 它定义在 `appDeviceDefinitionFactories.tsx:2293-2301`（模块级 `let skipSaveCheckFlag`），而 `getSkipSaveCheck()` 被**导出流程**在 `:2306` 消费（`if (getSkipSaveCheck() || __appScope.canExportCurrentModel)`）。语义不同 —— 复用会让导出与切换互相干扰。**照它的模式新写一对 getter/setter 即可**（同样的模块级 `let` + 两个导出函数）。

- [ ] **Step 1: 写失败测试**

1. **`switchToSpace` 的序列**：调用顺序必须是 `清缓存 → 写 cookie → 置跳过标志 → reload`。用三个 spy + 记录 `location.reload` 的调用，断言**顺序**（不是只断言都发生了）。
   - 变异：把写 cookie 提前到清缓存之前 → 顺序断言红（**这正是阶段一 spec §6.2 点名的「顺序反了就会把新空间数据当旧空间清掉」**）
   - 变异：去掉置标志 → 红
   - **清缓存失败必须中止切换（T4 实施时的裁定）**：`clearSpaceScopedBrowserCaches()` 的 IDB 错误**不得吞**。失败时不写 cookie、不 reload，用 `globalMessage` 提示并让用户重试。理由：切换的全部意义就是「**切换前先清干净**」；清不干净就切等于**把 S2 打开且不让用户知道**，而 S2 正是本阶段存在的理由。代价是 IDB 不可用时用户切不了空间 —— 罕见、可重试、且用户可自行清站点数据，比静默污染轻。补一条断言：清缓存抛错时 `writeSpaceCookie` 与 `reload` **都未被调用**。
     - 变异：把 `switchToSpace` 的清理调用包在 `try { … } catch {}` 里继续往下走 → 红
2. **`beforeunload` 跳过**：置标志后，handler 不再 `preventDefault()`。
   - 变异：删掉 handler 里刚加的那行判定 → 红
3. **`migration` store 的保留前提（T4 实施时记下的真依赖，本任务必须核实）**：T4 把 IDB 的 `migration` store 列入**不清**白名单，理由是清掉它会触发重迁移的 `saveDeviceTemplates([])` **整表覆盖写，可能抹掉新空间的图元库**。**该保留的前提是「新空间的图元库由后端载入」** —— 若跨空间/重载后图元库实际来自浏览器本地缓存（而非后端），那 `migration` 保留就会让**旧空间的图元库继续生效**，即 S2 以另一条路径复活。
   - 要求：**核实切换后图元库的载入来源确实是后端**（读 `appToolbarHookFactories.tsx:2797-2836` 的 `exists` 分支，确认新空间下后端 `exists` 为真时走「采用后端并 return」那一路），并在报告里给出结论。
   - 若发现来源不是后端，**停下报告** —— 那意味着 T4 那条保留判断需要重新论证，我不能在两种可能下都放行。
3. **未保存三路**（在 `appProjectCanvasFactories.test.ts` 追加，该文件已有 `load-project`/`enter-browse`/`export` 三路的既有用例可对照）：
   - `kind: "switch-space"` + `save` → 先 `await saveCurrentProject()`，成功后才 `switchToSpace`
     - 变异：不 await 就切换 → 红
   - `+ discard` → 直接 `switchToSpace`
   - `+ cancel` → 清空 `pendingUnsavedAction`，**不发生任何切换**
     - 变异：cancel 也切换 → 红

- [ ] **Step 2: 跑测试确认失败** → **Step 3: 实现**（对话框文案按现有 `kind` 分支已合适，**不需要为 `switch-space` 加文案** —— 阶段一 spec §5.4 已核实 `:287`/`:291-294`/`:296-298` 的默认分支对 `switch-space` 可读）→ **Step 4: 跑通**

Run: `pnpm vitest run src/spaceSwitch.test.ts src/appExtracted/appProjectCanvasFactories.test.ts`

- [ ] **Step 5: 提交**

```bash
git add src/spaceSwitch.ts src/spaceSwitch.test.ts src/App.tsx src/appExtracted/appCoreCanvasUtilities.tsx src/appExtracted/appProjectCanvasFactories.tsx src/appExtracted/appToolbarHookFactories.tsx
git commit -m "feat(space): 切换时序、未保存复用与 beforeunload 跳过"
```

---

### Task 4: §6 浏览器侧缓存清理 + 全覆盖守卫（**本阶段最重要的一件事**）

**Files:**
- Create: `src/spaceCache.ts`、`src/spaceCache.test.ts`

**Interfaces:**
- Produces:
  - `export const SPACE_SCOPED_LOCAL_STORAGE_KEYS: readonly string[]`
  - `export const SPACE_SCOPED_SESSION_STORAGE_KEYS: readonly string[]`
  - `export const SPACE_SCOPED_IDB_STORES: readonly string[]`
  - `export const KEPT_LOCAL_STORAGE_KEYS: readonly { key: string; reason: string }[]`
  - `export function clearSpaceScopedBrowserCaches(): Promise<void>`

**清单来源（实施前重核过一次 —— 原文的 ~14 条不完整，实测 `src/` 下共 30 个 `*_STORAGE_KEY`，另有两个非该命名形式的）。已在派发前分类完毕，**照下表实现**：**

**清 — localStorage（21 条）**：`PROJECT_STORAGE_KEY`、`SCHEME_STORAGE_KEY`、`ACTIVE_PROJECT_STORAGE_KEY`、`DRAFT_PROJECT_STORAGE_KEY`、`IMAGE_STORAGE_KEY`、`CUSTOM_DEVICE_LIBRARY_STORAGE_KEY`、`LEGACY_CUSTOM_CATEGORY_LIBRARIES_STORAGE_KEY`、`CUSTOM_CATEGORY_LIBRARIES_STORAGE_KEY`、`LEGACY_CUSTOM_COMPONENT_LIBRARIES_STORAGE_KEY`、`CUSTOM_COMPONENT_LIBRARIES_STORAGE_KEY`、`DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY`、`CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY`、`CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY`、`COLOR_DISPLAY_MODE_STORAGE_KEY`、`COLOR_PALETTE_STORAGE_KEY`、`MEASUREMENT_CONFIG_STORAGE_KEY`、`E_DEVICE_DEFINITION_LABELS_STORAGE_KEY`、`E_DEVICE_DEFINITION_CLASS_EXPORT_STORAGE_KEY`、`E_DEVICE_DEFINITION_FIELD_ORDER_STORAGE_KEY`、`E_DEVICE_DEFINITION_TEMPLATE_FIELDS_STORAGE_KEY`、`E_DEVICE_DEFINITION_TABLE_IDS_STORAGE_KEY`

> **注意前四条 —— 原文漏了它们，而它们装的正是「方案与模型数据本身」**（`PROJECT_STORAGE_KEY` / `SCHEME_STORAGE_KEY`）与当前打开模型/草稿（`ACTIVE_PROJECT_STORAGE_KEY` / `DRAFT_PROJECT_STORAGE_KEY`）。漏掉的后果比图元库那几条严重一档：切空间后 localStorage 里留着上一空间的方案与模型。另两条无 `LEGACY_` 前缀的 legacy 变体同理不可漏。
>
> 前 16 条定义在 `src/appExtracted/appCoreCanvasUtilities.tsx:2099-2161`；5 条 `E_DEVICE_DEFINITION_*` 在 `src/appExtracted/appPersistenceLibraryExport.tsx:1101-1105`。

**清 — sessionStorage（1 条）**：`REFRESH_RECOVERY_STORAGE_KEY`（`appCoreCanvasUtilities.tsx:2107`）。**它必须清**：`location.reload()` 不清 sessionStorage，而 `beforeunload`/`pagehide` 会（`appToolbarHookFactories.tsx:3189-3200`）把旧空间当前模型写进去，新空间加载时会被读成「刷新恢复草稿」。

**清 — 非 `*_STORAGE_KEY` 命名的一条**：`VOLTAGE_LEVEL_SETTINGS_KEY`（`model.ts:7402`，localStorage）。它影响建模参数（电压基值），按**空间数据**处理。

**清 — IndexedDB**：`src/lib/deviceLibraryStorage.ts` 的 store 名（实施时读该文件取准）。

**不清 —— UI / 本机偏好（9 条，进 `KEPT_LOCAL_STORAGE_KEYS` 并各带理由）**：`INTERACTION_MODE_STORAGE_KEY`、`LEFT_PANEL_MODE_STORAGE_KEY`、`RIGHT_PANEL_MODE_STORAGE_KEY`、`LEFT_PANEL_WIDTH_STORAGE_KEY`、`RIGHT_PANEL_WIDTH_STORAGE_KEY`、`STATUSBAR_HEIGHT_STORAGE_KEY`、`VALIDATION_PANEL_HEIGHT_STORAGE_KEY`（七条为面板宽度/显隐/交互模式，纯本机 UI 偏好）、`NATIVE_EXPORT_DIRECTORY_STORAGE_KEY`（`fileIO.ts:90`，上次另存的目录）、`TARGET_URL_STORAGE_KEY`（`SendModelDialog.tsx:20`，上次发送目标 URL）。

**不清 — 非 `*_STORAGE_KEY` 命名的一条**：`runtimeWsClientId`（`runtimeWsClient.ts:8`）—— 浏览器身份，非空间数据。

- [ ] **Step 1: 写失败测试**

1. **清理覆盖三组**：分别断言 localStorage 组、sessionStorage 组、IDB 组都被清空。
   - 变异：只清 localStorage 组 → sessionStorage 与 IDB 两条断言各自红
2. **不清的确实没被清**：`runtimeWsClientId` 等三项在清理后仍在。
   - 变异：把清理实现成 `localStorage.clear()` → 红（**这条断言存在的意义就是防这种省事写法**）
3. **清单全覆盖守卫（核心）**：源码扫描全仓 `*_STORAGE_KEY` / `*StorageKey` 常量声明与 IndexedDB 的 store 名，断言**每一个都在「清理清单」或「不清白名单」内**。
   - 变异：在任一模块新增一个 `const FOO_STORAGE_KEY = "…"` 而不登记 → **守卫必须红**（实施时请实测这一次，并把 RED 输出贴进报告 —— 这是「守卫真能发现漏登记」的唯一证据）
   - 实现提示：参考 `scripts/audit-undefined-names.mjs`（`pnpm audit:names`）的源码扫描写法，项目已有此模式。

- [ ] **Step 2: 跑测试确认失败** → **Step 3: 实现** → **Step 4: 跑通**

Run: `pnpm vitest run src/spaceCache.test.ts`

- [ ] **Step 5: 提交**

```bash
git add src/spaceCache.ts src/spaceCache.test.ts
git commit -m "feat(space): 浏览器侧空间缓存单源清单、清理与全覆盖守卫"
```

---

### Task 5: 端到端验收 —— 关闭 S2

**Files:**
- Create: `e2e/spaceSwitch.spec.ts`

**背景（这条验收为什么存在）：** 阶段一的最终评审逮到 **S2（Critical）**：设计 §6 的持久化污染窗口在前端半场缺席时是**活的** —— 那三处「后端为空时把浏览器本地缓存写回后端」的路径（`appToolbarHookFactories.tsx:2766-2783` 配色、`:2797-2836` 图元库、`:2851-2866` 量测）原样未动，而 `readDeviceLibraryConfig` 对全新空间确实返回 `exists:false`（`server.mjs:1592-1595`）故回写分支必触发。设计 §12 的验收项 12 正是这条。**本任务就是那条验收。**

- [ ] **Step 1: 写 e2e 用例**

序列（Playwright，项目已有 `e2e/` 与 `vite.e2e.config.ts`；`GRAPH_MODEL_DATA_DIR` 指向 tmpdir）：

1. 起服务，等主应用就绪（**注意**：这会触发图元库回写 —— 若此刻无后端数据，浏览器本地缓存会写进 `default` 空间。这本身是预期行为，不是本用例要测的）；
2. 在空间 A（`default`）下**改动图元库**（加一个自定义元件）→ 确认落盘 `default` 的 `library.json`；
3. **经顶栏 UI 真正走一遍建空间与切换** —— 填输入框、点「创建并切换」，**不要直接调 helper**。原因：这条链 `Modal.onOk → submitCreate → createSpaceThenSwitch` 在 node 测试环境里没有任何断言（T2 评审发现的缺口），而真浏览器点击是唯一能覆盖它的地方；
4. 断言 **B 的 `device-library/library.json` / `color-config.json` / `measurement-config.json` 不存在，或存在但不含 A 的内容**（读取 tmpdir 落盘文件，不看前端状态）；
5. **断言选择器显示的是「后端 current」而非「cookie 值」**（T2 评审实证：T5 原设计**覆盖不到这一层**，必须显式补 —— 其理由是「唯一改变空间标识的动作是切换，而切换同时写 cookie 并 reload，故 cookie 恒等于 current，两者从不分歧；且原断言落在磁盘文件上、不落在 UI 上」）。做法与要点：
   - **人为制造分歧**：先让 cookie = A，再带 `?space=B` 打开页面 —— 此时后端 `current` = B、cookie = A（前端自身从不设 `X-Space`/`?space=`，故这是唯一能造出分歧的入口）；
   - **断言 antd Select 的选中项文本**（`.ant-select-selection-item`）显示 **B 的名称**而非 A 的。**不能只断言「有选中值」** —— 那样两种实现都绿；
   - **同一页面内再断言 `document.cookie` 确实仍是 A**，把「分歧真实存在」也钉住 —— 否则日后 cookie 语义一变，这条会**静默失效**（有断言、但前提没了）；
6. **启动时的空间一致性校验（T3 实施后发现的 S2 残留，必须补）** —— T3 的裁定「回写分支用的浏览器 payload 在切换后必然为空」**只对经过切换器（UI）的路径成立**。而最终评审给 S2 的风险陈述点名的恰是**手工设 `gmp_space` 后打开应用**那条路径：`switchToSpace` 从不执行 → 浏览器缓存**没被清** → 回写路径照样把旧空间数据写进新空间。**故 S2 在 UI 路径关闭、在手工设 cookie 路径仍开着**，而后者正是评审论证「隐藏下拉不够」时依据的那条（`gmp_space` 是无签名普通 Cookie）。
   - **修法**（约 10 行，与已选方案同源、非第三种机制）：**记录当前浏览器缓存属于哪个空间**（一个额外 key，如 `gmp_cache_space`），**启动时若与解析出的空间不一致 → 先清缓存再让任何代码读它**。这把「清」从「只在切换时」扩到「每次进入时校验」，手工路径因此进网。
   - **⚠ 实现形态是决定性的（T3 评审实证，写错则洞仍在而测试可能仍绿）**：**不得用 `useEffect`**。`App.tsx:639-657` 的播种是**渲染期同步 `useMemo`**（`initialProjectSources` → `initialDraft` → `initialLayeredProject` → `initialIndexedNodes` → `App.tsx:871` 的 graphStore），**effect 跑在它之后** —— 那时旧空间数据已进 React state，清缓存已成事后动作，回写照样把旧内容推给新空间。
     - 必须**先于**该同步播种执行：形如在 `src/main.tsx` 的 `createRoot` **之前**做一次同步/可 await 的引导闸门，或把空间一致性校验放在渲染之前的第一步。
     - 判定标准：**把该校验挪进 `useEffect` 后，第 6 条的断言必须变红** —— 若挪进去仍绿，说明这条断言没在守护真正的时序（这正是本条存在的意义）。请把该变异实跑一次并贴 RED。
   - **在**上面第 5 条的同一序列里断言：手工设 cookie=A + `?space=B` 进入后，**B 的 `device-library/library.json` / `color-config.json` / `measurement-config.json` 不含 A 的内容**。
     - 变异：去掉启动校验 → A 的缓存被回写进 B → 红。**这条是本阶段「S2 关闭」的最终验收**。（T3 评审补充：污染面就这三条 —— schemes 域**没有**回写路径，`appToolbarHookFactories.tsx:2726-2733` 在后端空时置空并清画布。）
   - **注意断言的自足性**：这条与第 3–4 步（UI 切换路径）是**两条独立路径**，不要合并成一条 —— UI 路径绿不代表手工路径绿，这正是本节存在的原因。

- [ ] **Step 2: 用变异证伪（**不要**期望它「因为 Task 4 未实现」而失败 —— T4 已先于此执行）**

把 `clearSpaceScopedBrowserCaches` 临时改成空实现（no-op），重跑：

Run: `pnpm test:e2e e2e/spaceSwitch.spec.ts`
Expected: **FAIL** —— B 的落盘文件含 A 的内容。**请实测这一次并把输出贴进报告**：那是「清理函数是关闭 S2 的承重件」的唯一证据，而非事后补的装饰。跑完立即还原该空实现。

- [ ] **Step 3: 若失败**，回看 Task 4 的清理清单是否漏了某条路径（例如 IndexedDB 未清、或 sessionStorage 组未清）；**不要**改为放宽断言。

- [ ] **Step 4: 跑通**

Run: `pnpm test:e2e e2e/spaceSwitch.spec.ts`

- [ ] **Step 5: 提交**

```bash
git add e2e/spaceSwitch.spec.ts
git commit -m "test(space): e2e 验收——切换空间后新空间不被旧空间本地缓存污染（关闭 S2）"
```

---

## 验收（阶段二完成时逐条核）

| # | 验收项 |
|---|--------|
| 1 | 清空 Cookie 访问 → 主应用落在 `default`，方案树与阶段一之前一致 |
| 2 | 顶栏建「张三」→ 自动切过去 → 方案树为空、图元库只有内置、图片库空 |
| 3 | 张三建方案「测试」→ 切回 default → 看不到「测试」 |
| 4 | **设计 §12#12**：A 有图元库改动 → 切到全新空间 B → **B 的落盘文件不含 A 的内容**（Task 5） |
| 5 | 有未保存修改时切换 → 弹现有未保存对话框，三路（保存/不保存/取消）都正确 |
| 6 | **prod 构建**下切换空间只弹一次对话框（dev 被 `import.meta.env.DEV` 短路，故必须 prod 验 —— 阶段一 spec §5.6） |
| 7 | 切换后 sessionStorage 无旧空间的「刷新恢复草稿」 |
| 8 | 现有前端测试全绿；`pnpm tsc --noEmit` 无错 |

## 发布门禁（阶段一评审给定，本阶段承接）

阶段一交付的后端半边**已经隔离数据**，但浏览器侧第三个副本（回写路径）在阶段二落地前**只能靠不触发来避免**：

> 只上阶段一、并隐藏 swigger 的空间下拉时，设计 §6.1 的持久化污染**不会被正常操作触发**，但**不被任何机制阻止** —— 只需把 `gmp_space` 手工设为非 default 空间即可（devtools 或任意脚本，无需任何权限绕过，这正是该功能的公开契约）。一旦发生，污染表现为对目标空间 `device-library/library.json` / `color-config.json` / `measurement-config.json` 的**静默持久写入**，用户侧无法自愈。

故：**本阶段与阶段一同版本落地，或在此之前用代码级闸门**（在 `server.mjs` 的空间创建/切换相关端点加开关），**不要只靠「UI 不可见」**。

## 本阶段明确不做

| 不做 | 理由 |
|------|------|
| 改任何 `server/**` | 阶段一已交付并评审；后端缺口（若有）另行处理 |
| 空间级权限、登录 | 已定免登录 |
| 空间改名/删除的前端 UI | 后端已有 4 端点；前端先用顶栏「建 + 切」，删改留待有需求时 |
| 软重载切换 | 阶段一 spec §5.5 已定：硬重载 + 先清缓存 |
| 把 `?space=` / `X-Space` 用于前端自身请求 | 前端同源，Cookie 是唯一需要的通道；另两条留给脚本与第三方 |
| 修阶段一 parked 的 4 条残留（`imageDownloadCache.test.mjs:63-68` 等） | 已判定「下次触碰那两文件时顺手改」；本阶段不碰那两个文件 |
