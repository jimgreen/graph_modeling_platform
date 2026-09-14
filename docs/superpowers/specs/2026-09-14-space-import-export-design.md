# 工作空间导入 / 导出（压缩包）设计

> 状态：待评审 · 2026-09-14 · 阶段：多空间功能的后继增量

## 1. 目标

在顶栏**空间选择下拉框右侧**加两个按钮：把**当前工作空间**整体导出成一个 ZIP，以及把这样一个 ZIP 导入成**一个新空间**。

**用途定位（决定了下文所有取舍）**：这是**备份与搬迁**，不是交付件。所以包内是**原样字节**、往返一致；不生成任何派生格式。

### 非目标（明确不做）

| 不做 | 理由 |
|---|---|
| 合并式导入（并入当前空间） | 语义最复杂、最难向用户解释，且与既有「三路回写」规则耦合；用户已裁定导入一律**新建空间** |
| 选择性导出（只导方案 / 不含图片） | YAGNI。空间是一个整体，选子集要先解决「哪些子集自洽」 |
| 空间重命名 / 删除的前端 UI | 与本需求无关（后端已有 4 端点） |
| 包内 id 重映射（方案/模型/线路 idx 重新编号） | 新空间自包含，原样保留才是「搬迁」；重编号反而会打断模型内的交叉引用 |
| 进度条 / 分块上传 / 断点续传 | 见 §8 体积边界；先按一次性内存处理 |
| e2e | 后端 handler 测试已覆盖落盘与安全边界；前端按钮是形态级断言 |

## 2. 背景：可复用的既有链路（以及**不能**复用的那一处）

方案域已经有一条完整的 ZIP 导入导出链路，本次照它长：

| 既有件 | 位置 | 本次可否复用 |
|---|---|---|
| ZIP 构建 | `server/schemeArchive.mjs`（`AdmZip` + `zip.toBuffer()`） | **可**照抄形状，新建 `server/spaceArchive.mjs` |
| ZIP 上传上限 | `readRawBody(request, maxSchemeZipBodyBytes, msg)`（`server.mjs:4387`） | **可**复用 |
| 解压后总量上限（防 zip 炸弹） | `assertZipUncompressedSizeWithinLimit`（`server.mjs:3113`） | **可**复用 |
| 条目路径校验（防 zip-slip） | `zipEntryParts`（`server.mjs:3139`，拒空名、`/` 开头、盘符、`.`/`..` 段）+ 逐条目 `isPathInside`（`:3188`） | **可**复用 |
| 剥 ZIP 顶层目录 | `zipRootNameFor` / `extractSchemeZipToDirectory`（`server.mjs:3156` / `:3203`） | ⚠️ **只可部分复用** |
| 建目录退役守卫 | `mkdirInSpace`（`server.mjs`） | **必须**经过（后端 Common Patterns） |
| 空间创建（含 id 去重） | `spaceStore.create(name, { onDuplicate })` → `spaceIdFromName(name, existingIds)` | **复用**（唯一性见 §4.2） |
| 前端下载 blob | `downloadBackendSchemeArchive`（`appPersistenceLibraryExport.tsx:307`） | **可**照抄形状 |

⚠️ **不能整段复用解包器**：`extractSchemeZipToDirectory` 里有方案域的不变量「files 只落 `.json`」，会**跳过后缀为 `.e`/`.svg` 的条目**（`server.mjs:3201-3209`）。空间里含图片（`images/`）与空间级图标（`icons/`），照搬会把它们丢掉。故需要**空间版解包器**：保留 `zipEntryParts` 与 `isPathInside` 两道守卫，去掉后缀过滤，并额外跳过包内元信息文件（见 §3）。

## 3. 数据格式

```
<空间名>.zip
└── <空间名>/                      ← 唯一顶层目录，名字 = 空间名（safeFilePart 净化）
    ├── space.json                 ← 包元信息，导入时读取并**跳过**，不落盘
    ├── schemes/…                  ← 方案与模型（files/** 只含 .json）
    ├── settings/…                 ← color-config.json、measurement-config.json
    ├── device-library/library.json
    ├── images/…                   ← manifest.json、folders.json、图片文件
    └── icons/…                    ← 空间级导入的图标
```

- **排除** `schemes/trash/**`（回收站，用户已删的东西）。
- `space.json` 内容：`{ formatVersion: 1, name: <空间名>, exportedAt: <ISO> }`。
  - 放在**顶层目录内**而不是 ZIP 根：`zipRootNameFor` 的「单一顶层目录」判定要求每个文件条目都至少两段（`server.mjs:3165`），根级多一个文件会把它判成「多根」而回退到文件名。
  - 导入时**跳过**，故解出来的空间根与导出时的空间根逐字节一致（真正的往返）。
- 包内不写 `spaces.json` 注册表内容：注册表在**数据根**而不在空间根内，且导入一律新建空间、**不复用包内 id**。

## 4. 后端

### 4.1 `GET /webgrp/spaces/export`

- 走**正常的空间解析链**（`isSpaceAgnostic` 白名单**不**包含它）→ 拿到 `paths = spaceStore.resolvePaths(resolvedId)`。
- 递归收集该空间的文件，原样字节入包。
- ⚠️ **只能遍历 `spacePathsFor` 枚举出的那几个子路径**（`paths.schemes` / `paths.settings` / `paths.deviceLibraryDir` / `paths.images` / `paths.icons`），**绝不能按 `paths.root` 递归**：**default 空间的根就是数据根**（`spaceStore.mjs:15-28` 的 `assertInSpace` 专门特判这一点），按根递归会把 `spaces.json` 与**其它所有空间**（`workspaces/**`）一起打进包 —— 既是数据泄漏，也是体积事故。
- 排除 `schemes/trash/**`。
- 响应：`content-type: application/zip`，文件 `<空间名>.zip`。
- 目录读失败**即上抛**，不产出残缺压缩包（照 `listModelJsonFiles` 的既定口径）。

### 4.2 `POST /webgrp/spaces/import`

1. 查询参数校验（早于读 body）：`mode` 只认 `overwrite` / `rename`，其余 → 400 `SPACE_IMPORT_MODE_INVALID`；`mode=rename` 时 `name` 必须过与 `POST /spaces` 同一条名字规则，不合格 → 400 `SPACE_NAME_INVALID`（**不**回退成包内名：那等于把用户的意图悄悄换掉）。
2. `readRawBody(request, maxSchemeZipBodyBytes, "空间压缩包过大…")`；空体 / 非 zip → **400**。
3. `new AdmZip(buffer)` 失败 → 400「zip 文件格式不正确」。
4. `assertZipUncompressedSizeWithinLimit(zip, "空间压缩包")`。
5. 定名：`mode=rename` 用 `?name=`；否则包内 `space.json.name`（存在且非空时优先）→ 否则 ZIP 顶层目录名 → 否则 `"导入空间"`；**候选名与回退名都过与 `POST /spaces` 同一条接受规则**（单源在 `spaceId.mjs`：`normalizeSpaceName` + `isAcceptableSpaceName`），不合格就换下一个候选。名字本身**不做** safeFilePart 净化（净化会让「带/斜杠」这类名字往返后被改名）；只有 ZIP 顶层目录名经 safeFilePart，而它的上限（80 码元）宽于名字上限，故回退名同样必须过规则。
6. `mode=overwrite` 时**先删同名空间再建**：删除三步次序照 `DELETE /spaces`（登记退休 → 排空并驱逐注册表 → `remove`），次序不可换 —— 少了排空，队列里的原子写会按旧绝对路径落进紧接着被复用的同一个根，把刚解包出来的内容盖成旧空间的残影。旧空间目录进 `trash-spaces/`（可手工找回，界面上不再显示）。
7. `spaceStore.create(name, { onDuplicate: "reject" })` → 建目录 + 注册。
   - 照 `POST /spaces`（`server.mjs:4662`）补一句 `retiredSpaceRoots.delete(spaceStore.resolvePaths(space.id).root)`，否则同名新建的空间一建出来就被拒写。
   - 定名撞车（含并发插入）→ **409 `SPACE_NAME_DUPLICATE`**，正文带冲突者的 `name` / `conflictId`，**不**静默加后缀 —— 缺省导入就到这里为止，由前端弹「覆盖 / 重命名」询问后带 `mode` 重发。
8. 解包进 `spaceStore.resolvePaths(space.id).root`（空间版解包器，见 §2）。
9. **失败回滚**：第 8 步抛错 → 调 `spaceStore.remove(space.id)` 撤掉刚建的空间（目录进 `trash-spaces/`），返回 400 并带上原因。宁可留一份可手工清理的 trash，也不留一个半成品空间。
   - 覆盖模式下 rollback 只能撤掉新空间，被顶掉的旧空间留在 trash 里 —— 这是「覆盖」的固有代价，前端询问框里已写明。
10. 成功：`{ ok: true, space, spaces, savedAt }` —— **`sendJson` 裸回执**，不是 v1 的 `{ok,data}` 信封。

### 4.3 新模块 `server/spaceArchive.mjs`

与 `schemeArchive.mjs` 同形：**只做「空间目录 → ZIP 字节」**，不 import 渲染适配层，保持可单测。

- `listSpaceFiles(paths)` → `{ filePath, relativePath }[]`，目录读失败上抛。
  - **入参是 `paths`（`spacePathsFor` 的产物），不是单个 root** —— 见 §4.1 那条：default 空间的 root 是数据根，按 root 递归会越界。子路径逐条 `stat`，不存在就跳过（新空间里 `icons/` 可能没有）。
  - 包内相对路径按 `<空间名>/<子路径名>/…` 拼（子路径名取 `schemes` / `settings` / `device-library` / `images` / `icons`）。
  - 排除 `schemes/trash/**`。
- `buildSpaceArchiveBuffer({ paths, spaceName, archiveRootName = spaceName, exportedAt })` → `{ buffer, filename, spaceName }`；写入 `space.json`。
  - `spaceName`（**原始**名）进 `meta.name`；`archiveRootName`（**已净化**）作包内顶层目录名与文件名 ——
    它正是「含 `/` 的名字能无损往返」的使能参数：名字是自由文本，不可能整体当单段目录名，故两者必须分开。
    缺省等于 `spaceName`（只传 `spaceName` 的调用方行为不变）。

解包侧（`extractSpaceZipToDirectory`）放在 `server.mjs` 里紧邻既有的 `extractSchemeZipToDirectory`，复用同文件的 `zipEntryParts` / `isPathInside` / `mkdirInSpace` / `safeFilePart`。

### 4.4 必须守的不变量

| 不变量 | 落点 |
|---|---|
| 一切建目录经退役守护 | 解包与建空间都走 `mkdirInSpace`；**不得**出现裸 `mkdir` |
| 不新增模块级路径常量 | 全部经 `spaceStore.resolvePaths(id)` / `options.paths` 取；`spaceArchive.mjs` 只收调用方传进来的绝对根 |
| zip-slip | `zipEntryParts` 拒 `..`/绝对路径/盘符 + 每条目 `isPathInside(root)` |
| zip 炸弹 | `assertZipUncompressedSizeWithinLimit` |
| 不跨空间写 | 目标根一律来自 `resolvePaths(新 id)`；导出根来自解析链 |
| 派生文件不落盘 | 本功能**不生成** `.e`/`.svg`；解包也**不跳过**它们（若包内确实有，原样铺开由用户自行处置） |

## 5. 前端

- `src/spaceClient.ts` 加两个封装（与 `fetchSpaces` 同源）：`exportSpaceArchive(): Promise<Blob>`、`importSpaceArchive(file, { mode?, name? }): Promise<{ space: Space; spaces: Space[] }>`（回执是 `sendJson` 裸对象，非 v1 信封）；另加 `sanitizeSpaceFileName`，供前端文件名与后端包内顶层目录名取同一个净化值。
  - 409 撞车时抛 `SpaceNameConflictError`（`code = SPACE_NAME_DUPLICATE`，带 `spaceName` / `conflictId`；**不**用 `Error.name` —— 那是内置属性）。字段名与后端正文的 `name` / `conflictId` 一一对应，故两侧形状必须同改。
- `src/appExtracted/appTopbar.tsx`：`SpaceSwitcher` 内、`Select` 之后并列四个 `Button`（lucide 图标，与顶栏既有按钮同形）：**导出**（`Download`，不加 `disabled` —— 纯读动作，对齐既有导出菜单）、**导入**（`Upload`）、**改名**（`Pencil`）、**删除**（`Trash2`）；以及一个隐藏的 `<input type="file" accept=".zip">`。
  - 后三个都写盘 / 会切空间，带 `disabled={isBrowseMode || !current || current.pinned}`：`pinned` 的 default 不给删改，列表未加载时 `current` 为空也不给（否则拿空 id 打后端只会换回「未知空间」）。
  - 四个按钮都作用在**当前空间**上（要动别的空间先用左边的下拉框切过去），故不需要新的 memo 输入 —— 依赖的 `spaces` / `currentSpaceId` / `isBrowseMode` 都已在 `appView.tsx` 的 `<AppTopbar inputs={[…]}>` 里。
- 改名：`showGlobalPrompt("请输入新的空间名称：", 当前名)` → `PUT /webgrp/spaces` → **只刷新列表，不重载**（改名不动 id，浏览器侧缓存按 id 记账）。取消 / 只改空格 / trim 后与原值相同一律不打后端。撞名 → 409，提示后端文案。
- 删除：`showGlobalConfirm`（文案必须写明「移入回收目录 trash-spaces、界面上找不回、需人工从磁盘恢复」——不可逆动作）→ `DELETE /webgrp/spaces` → **刷新列表 → 切到剩余空间**。删的是当前空间，不切走就会把 Cookie 留在已删 id 上。目标空间取刷新后的 `currentSpaceOf(scope)`，取不到则 `spaces[0]`，再取不到落到常量 `default`（它恒定存在）。取消确认 / `pinned` / 后端拒绝都不得切空间。
- 底部状态栏（`src/appExtracted/appStatusbar.tsx`）常驻一格「空间ID `<id>`」（标签就叫**空间ID**，与左侧面板 footer 的「模型ID：」同款），点击复制（复用 `id-copy-cell` / `id-copy-toast` 与 CSS，选择器同步扩到 `.bottom-statusbar`）；**名字放 `title`，不占栏宽**。理由：目录名恒为 id 且改名不改目录，认目录只能靠 id，而顶栏选择器显示的是 name —— 两者分叉时用户只能从这一格看出对应关系。`currentSpaceId` 与 `spaces` 必须进 `appView.tsx` 的 `<AppStatusbar inputs={[…]}>`（与顶栏同一课：不进 inputs 则首帧渲染的「—」会被 memo 永远记住）。
- 导出：拉 blob → 触发下载 `<空间名>.zip`（照 `downloadBackendSchemeArchive` 的写法）。
- 导入：选文件 → POST → 成功后 `scope.requestSwitchSpace?.(space.id)`（**与「新建空间」按钮现有的收尾一致**）；失败走 `globalMessage` 提示。
- 导入撞车（409）→ 借 `globalMessage` 的两个全局弹窗（挂 `window`，故本模块在 node 下仍可直测）问一次：`showGlobalConfirm("…确定=覆盖，取消=改用其他名字导入")` → 确定带 `mode=overwrite` 重发；取消 → `showGlobalPrompt("请输入新的空间名称：", 建议名)`，建议名从「原名-2」起跳过已占用者，带 `mode=rename&name=` 重发；改名框再取消 = 放弃（服务端什么都没建，**不**提示「导入失败」）。改名后仍撞车（比如别人刚建了同名空间）就再问一次 —— 循环而不是单次询问。
- 询问框不可用（非浏览器环境 / 未挂载）时**不静默吞掉**：让冲突错误照常冒到「导入空间失败」提示。
- **`__appScope` 装配**：导入导出两个函数**不需要**装进 `__appScope` —— `appTopbar.tsx` 直接 import 并调用；`SpaceSwitcher` 只从 scope 读 `spaces` / `currentSpaceId` / `refreshSpaces` / `requestSwitchSpace`（前三个与第四个由 `App.tsx` 的 `Object.assign(__appScope, …)` 提供）与 `isBrowseMode`。
- ⚠️ **必须把新状态加进 `appView.tsx` 的 `<AppTopbar inputs={[…]}>` memo 输入数组** —— T2 实施时踩过：漏了会让 `MemoizedViewSection` 在列表加载后跳过 topbar 重渲染，按钮静默失效且不报错。本次按钮若只依赖稳定引用（都是 `useCallback`），仍要在测试里钉住「导入后确实切了空间」这条行为。

## 6. 错误与提示

| 情况 | 处理 |
|---|---|
| 后端未起 / 网络失败 | `globalMessage` 提示（复用既有文案风格） |
| ZIP 格式不对 / 越界条目 / 超出上限 | 后端 400 带原因 → 前端原文提示 |
| 导入中途失败 | 后端已回滚；前端提示「导入失败，未创建空间」 |
| 导入撞名（409） | 弹询问框：覆盖 / 改用其他名字 / 放弃；用户在框里放弃**不算失败**，不提示错误 |
| 新建 / 改名撞名（409） | 顶栏对话框内原地提示「空间名「X」已存在。」（用户改个名再提交，不需要另开询问框） |
| 导出为空空间 | 正常导出（只含 `space.json`），不报错 |

## 7. 测试计划（每条断言须能指认打红它的变异）

**`server/spaceArchive.test.mjs`（新）**
- 打包含 `schemes/files/a.json`、`images/x.png`、`icons/i.svg` → 包内路径与字节一致。
- 打包**不含** `schemes/trash/**`（变异：把排除项去掉 → 红）。
- **default 空间**（其 root == 数据根，同目录下另有 `spaces.json` 与 `workspaces/<其它空间>/`）→ 包内**只有**该空间自己的那几个子目录（变异：改成按 `paths.root` 递归 → 包里出现 `spaces.json` / `workspaces/**` → 红）。**这条是本设计里最容易写错、后果最重的一处**。
- 子目录不存在（新空间无 `icons/`）→ 正常出包，不抛错（变异：对不存在的目录硬 `readdir` → 红）。
- 空空间 → 包内只有 `space.json`（变异：不写元信息 → 红）。
- 顶层目录名 = 传给它的空间名。

**`server/spaceApi.test.mjs`（追加）**
- 导出：`GET /spaces/export` → 200 + `application/zip`，解包后含空间数据（变异：导出别的空间 → 红）。
- 导入：建出新空间且落盘树与包内一致（含**图片等非 `.json` 条目** —— 这条专门钉住「没整段复用方案解包器」；变异：改用 `extractSchemeZipToDirectory` → 图片丢失、红）。
- 同名导入两次 → 第二次 409 `SPACE_NAME_DUPLICATE` 且**不建空间**、正文带冲突者 `name`/`conflictId`（变异：退回「静默加后缀建第二个」→ 红）。
- `mode=overwrite` → 同名空间被替换（id 复用、旧内容消失、旧目录进 `trash-spaces/`）（变异：忘记先删 → 409 而不是 200；变异：真删而非归档 → trash 断言红）。
- `mode=rename&name=` → 新空间用新名；新名再撞车 → 还是 409；名字不合格 → 400 `SPACE_NAME_INVALID` 且**不**落成包内名；`mode` 取值非法 → 400 `SPACE_IMPORT_MODE_INVALID`。
- `POST /spaces` 重名 → 409（变异：退回静默加后缀 → 红）；`PUT` 改名撞别人 → 409，**原样改回自己的名字仍 200**（变异：判重不排除自己 → 红）。
- zip-slip：构造含 `../evil.txt` 的包 → 400 且**数据根外无文件落盘**（变异：去掉 `zipEntryParts` → 红）。
- 解压后超限 → 400。
- 失败回滚：让解包在中途抛错 → 断言**没有**留下该空间（`GET /spaces` 不含它）。

**`src/appView.test.tsx`（追加）**
- 两个按钮渲染且导出/导入接线正确（照 T2 既有形态用例）。
- 导入成功后调用 `requestSwitchSpace(newId)`（变异：只导入不切 → 红）。
- 撞车四个分支：选覆盖 → 带 `mode=overwrite` 重发；改名 → 带 `mode=rename` + 新名重发（且建议名跳过已占用者：变异：建议值写死 `原名-2` → 红）；放弃 → **不重发、不切换**（变异：放弃后仍切 → 红）；询问框不可用时 → 冲突错误照常提示「已存在」（变异：静默 return → 红）。
- 空间改名：输入框默认值 = 原名（变异：给空串 → 红）；成功后 `PUT` 一次 + 刷列表 + **不切空间**（变异：跟着切 → 红）；取消 / 只改空格 / 与原值相同 → **不打后端**（变异：无条件 PUT → 红）；撞名 409 → 提示后端文案且**不刷列表**。
- 空间删除：确认文案含 `trash-spaces`（不可逆代价必须写明，变异：删掉这句 → 红）；确认后 `DELETE` + 刷列表 + **切到剩余空间且刷新在前**；取消确认 / 当前是 `pinned` → 连询问都不弹、不打后端、不切空间（变异：pinned 只靠后端拦 → 红）；后端拒绝 → 提示原因且不切空间。
- `src/spaceClient.test.ts`：`renameSpace` → `PUT /webgrp/spaces` body `{id,name}`（**id 不是 name**）；`deleteSpace` → `DELETE` body `{id}`；两者的失败都抛后端文案（409 / SPACE_PINNED），不静默当成功。
- 状态栏空间格：源码断言 `currentSpaceId` / `spaces` 已进 `<AppStatusbar inputs={[…]}>`（变异：删掉这两行 → 红。**不能**只断言「状态栏里有 currentSpaceId 字样」—— 那只证明它读了 scope，不证明 memo 会让它重渲染）。
- `e2e/spaceSwitch.e2e.test.mjs`：既有那条「选择器显示后端 current」的用例里加一条互补断言 —— 同一个空间**名字是「总站」、id 是「戊空间」**，选择器显示前者、状态栏显示后者（变异：状态栏改显示 name → 红；不区分 name/id 的构造打不红它，故必须用这个改名过的空间）。

**不写**：e2e（本功能没有跨进程时序，后端 handler 测试已覆盖落盘与边界）。

## 8. 风险与已知边界（不藏）

1. **包体积**：空间含图片库，可能几十~几百 MB。沿用方案 ZIP 的 `maxSchemeZipBodyBytes`（256MB 请求体）与 `MAX_ZIP_UNCOMPRESSED_BYTES`（解压后总量）。导出侧是 `AdmZip.toBuffer()` **一次性进内存**。超出即失败并提示，不做分块 —— **这是有意的边界，不是疏漏**。
2. **导入不校验包内数据自洽性**（例如 `schemes/` 与 `device-library/library.json` 的交叉引用）。包是原样铺开的，校验留给打开空间时的既有归一化与拓扑校验。
3. **大包期间界面无进度**，只在校验/解包两端给提示。
4. **`/webgrp/spaces/import` 不进 `isSpaceAgnostic` 白名单**：它只建空间、不读空间数据，照常解析当前空间多花一次解析、无害；改白名单会动既有语义（有测试守着），不做。
5. **并发导入同名**：`spaceStore.create` 内部有读-改-写串行锁（`locked`），判重与建在**同一把锁**内 —— 否则两个并发同名创建会双双通过校验，各建一个同名空间。
6. **default 空间的导出面**是本功能最危险的边界（§4.1 / §7）：写错就变成「导出 default = 打包整台机器的全部空间」。规格里已把判据写成可红的测试，实现时**先写该测试再写实现**。

## 9. 验收

1. 顶栏空间下拉右侧出现「导出 / 导入」两按钮。
2. 在空间 A 导出 → 得到 `<A 名>.zip`；解包可见 A 的方案/配置/图元库/图片，且无 `trash`。
3. **在 default 空间（其根 = 数据根、且同目录下还有 `workspaces/`）导出 → 包内不得出现 `spaces.json` 或其它空间的目录**。
4. 清空浏览器 Cookie 另开一个会话导入该包 → 出现新空间（名为包内名），切过去后方案树/图元库/配色/图片与 A 一致。
5. 对同一包连续导入两次 → 第二次弹询问框：
   - 选**覆盖** → 原空间被这个包替换（界面上空间数不变，内容变成包里的），原空间目录进 `data/trash-spaces/`；
   - 取消覆盖后**改名** → 并存两个空间，新空间用新名（建议值已跳过「原名-2」这类已占用名）；
   - 两个框都取消 → 什么都没发生，不出现「导入失败」提示。
6. 新建 / 改名填入已存在的空间名 → 明确提示「空间名「X」已存在。」，不建出同名空间。
7. 顶栏四个按钮都在：点**改名**（铅笔）→ 输入框预填当前空间名 → 改成新名 → 下拉框与左面板就地更新，**页面不重载**；点**删除**（垃圾桶）→ 确认框写明数据进 `trash-spaces` → 确认后当前空间消失、自动切到剩余空间并重载，`data/trash-spaces/<时间戳>/<id>/` 下能找到它的全部文件。选到 `default` 时这两个按钮置灰。
8. 底部状态栏最右侧常驻「空间ID `<id>`」；改名后**它不变**（显示的还是 id），顶栏选择器跟着变 —— 点一下复制 id，悬浮提示里能看到对应的显示名。
9. 篡改包（塞 `../x`）导入 → 明确 400，磁盘数据根外无新文件。
10. 现有测试全绿；`pnpm tsc --noEmit` 无错；`server/**` 的既有测试（`spaceApi` / `spaceScope` / `spaceDispatch`）不回归。
