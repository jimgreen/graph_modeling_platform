# 多用户工作空间设计

日期：2026-09-13
状态：审阅修订版（v2），待用户复审
修订依据：`tmp/spec-review-2026-09-13.md`（BLOCKER 4 / MAJOR 7 / MINOR 9，全部逐条核实）

## 背景与目标

平台当前是单租户结构：后端无任何用户概念，`data/` 下只有一份全局数据（方案树、模型、自定义图元、图片库、配色、量测配置、全局线路）。多人使用时，一个人新建的方案、改过的图元库、上传的图片会被所有人看到和修改。

目标：让每个人拥有自己的工作空间。方案、模型、自定义图元、图片库、配色与量测配置、全局线路全部按空间隔离；E 文件接口预置模板与图标库主体保持全站共享只读。

## 已定的决策

| # | 决策 | 结论 |
|---|------|------|
| 1 | 部署形态 | 集中部署单个服务实例，多人用浏览器访问 |
| 2 | 身份方式 | **免登录**，凭空间标识切换 |
| 3 | 标识来源 | 顶栏空间选择器；请求侧走 Cookie |
| 4 | 隔离范围 | 方案、模型、自定义图元、图片库、配色、量测配置、全局线路、图标**导入资产** |
| 5 | 共享只读 | `public/e-templates/*.e`（4 文件，手动维护）+ **`public/icon-library/`**（10851 文件，git 跟踪）+ 代码内置定义 |
| 6 | 现有数据归属 | 整个 `data/` 即为第一个（default）空间 |
| 7 | 未保存确认 | 复用现有未保存修改对话框 |
| 8 | 新建空间 | 建完自动切过去 |
| 9 | 切换方式 | 清空浏览器侧空间缓存 + 硬重载 |
| 10 | 后端路径注入 | 显式透传 `paths` 参数，不用 AsyncLocalStorage |
| 11 | 无空间来源时 | **全部端点回退 default，不做例外**（含写操作与对外副作用端点） |
| 12 | 浏览器本地缓存 | **切换空间时清空**（localStorage + IndexedDB + sessionStorage） |

## 审阅修订记录（v1 → v2）

v1 有两处系统性错误，均已修正：

| 编号 | v1 的错误 | v2 的处理 |
|------|----------|----------|
| 盲区一 | 只按后端路径建模，声称「切换空间前端零改动」；未发现 localStorage / IndexedDB / sessionStorage 三份空间无关副本，其中三处在「后端为空」时**主动把旧空间数据回写进新空间**（持久化污染，非显示问题） | 新增 §6「浏览器侧持久化」整章；撤回「零改动」；重写 §5.5 硬重载论证 |
| 盲区二 | 改动面按 schemes 域外推，声称「多数函数已有逃生舱」 | §4.2 重写：逃生舱**只在 schemes 域存在**，settings / device-library / images / icons 四域为 0；补漏掉的 `apiV1Library.mjs` |

另修正：ZIP 导出硬守卫（§4.2）、三处派发点而非一处（§4.3）、CORS 预检（§3.4）、`beforeunload` 二次拦截（§5.6）、端点口径 62→74（§8）、图标库误判（§1）。

## 1. 存储布局

```
data/                         ← default 空间的根，既有数据原地不动
├── schemes/
│   ├── global-lines.json
│   ├── files/                # 模型 json
│   ├── trash/                # 方案级回收站
│   └── <方案树目录…>
├── device-library/library.json
├── images/{manifest.json, folders.json, <图片文件>}
├── icons/                    # 图标「导入资产」，按需 mkdir，现在不存在
├── settings/{color-config.json, measurement-config.json}
├── spaces.json               # 全局注册表
├── trash-spaces/<ts>/<id>/   # 删除的空间归档（与 data/schemes/trash 分属两级，语义不冲突）
├── .omc/                     # 既有工具目录，与空间无关
└── workspaces/               # 仅非 default 空间
    ├── 张三/{schemes,device-library,images,icons,settings}
    └── 李四/…
```

核心映射：

```js
const spaceRoot = (id) => id === "default" ? dataRoot : join(dataRoot, "workspaces", id);
```

### 1.1 为何 default 空间直接用数据根

早期方案是把 `data/*` 整体搬进 `data/workspaces/default/`。核实后放弃，三条理由：

1. **9 个后端测试文件共 27 处硬编码扁平布局**（`join(dataDir, "schemes"|"device-library"|"images"|"settings")`），既用于播种也用于断言；
2. **两个前端测试绕过 `GRAPH_MODEL_DATA_DIR` 直读仓库 `data/`**：`src/model-device-library.test.ts:3935`、`:3999` 读 `new URL("../data/device-library/library.json", import.meta.url)`。另 `server/swigger.examples.test.mjs:29` 从 `resolve(process.cwd(), "data", "schemes")` 复制真实数据。三者都依赖扁平布局；
3. 目录搬迁是数据风险最高的动作，收益仅是布局对称。

**因此「仓库 `data/` 保持扁平」是一条硬约束**，不是可选前提。实施时不得把 `data/device-library/` 挪进 `workspaces/default/` —— 否则上述三个测试会以「文件找不到」的方式静默失败。

代价：布局不对称，**default 空间不可删除**（删它等于删整棵数据根）。注册表标记 `pinned: true`。

### 1.2 图标库的两份，只有一份按空间

| 实体 | 位置 | 归属 | 实测 |
|------|------|------|------|
| 图标库主体 | `public/icon-library/` | **全站共享只读** | git 跟踪 10851 文件（`index.html` 5.4M、`search-index.json` 6.7M、`catalog.json`/`manifest.json` 各 43K），由 `server.mjs:4383` 的 `iconLibraryPublicDir` 经 `serveIconLibraryAsset` 托管 `/icon-library/*` |
| 图标导入资产 | `data/icons/` | **按空间** | 现不存在，由 `ensureStore()`（`server.mjs:295-299`）按需 mkdir；仅存用户导入的图标（`handleImportImageLibrary` 的 `dir:"icons"` + `getAssetDir:3576-3578`） |

v1 把「图标库按空间隔离」写进决策 4 是误判 —— 主体是 git 跟踪的公共素材，纳入空间意味着 10851 文件 × N 空间且无法版本同步。

顺带修正两处既有文档失真（**本次不改，仅记录**）：

- `CLAUDE.md` 称「`data/icon-library/` 是版本跟踪的图标库」—— 该目录不存在
- `server/apiInternal.test.mjs:21` 设置的 `GRAPH_MODEL_ICON_LIBRARY_DIR` 全仓无任何读取方

## 2. 空间注册表

`data/spaces.json`：

```json
{
  "schemaVersion": 1,
  "spaces": [
    { "id": "default", "name": "默认空间", "pinned": true, "createdAt": "2026-09-13T…Z", "lastAccessAt": "…" }
  ]
}
```

- 注册表缺失或损坏 → 重建：写入 default，并**扫描 `workspaces/` 下现成目录自动补登记**
- **扫描补登记前必须过 `isValidSpaceId` + `RESERVED` 校验**（见 2.2），不合格目录跳过并 `console.warn`。否则手工放入名为 `con`、超 40 字符或含非法字符的目录会被登记为合法空间，进而让 `spaceRoot` 落到 Windows 保留设备名或歧义路径
- 并发写走串行化写队列（仿 `server/globalLineRegistry.mjs:653` 的 `locked()` 模式）
- `lastAccessAt` 仅在 `GET /webgrp/spaces` 时批量刷新（不做每请求写盘），必要时节流至分钟级；它只用于展示活跃度，不参与任何判定

### 2.1 spaceId 生成规则

格式：Unicode 字母/数字/下划线/连字符，1–40 字符，首字符非连字符。

```
^[\p{L}\p{N}_][\p{L}\p{N}_-]{0,39}$   (u 标志)
```

允许中文 —— 方案树目录本就是中文，目录可读性对运维有实值；Cookie 侧 `encodeURIComponent` 编码即可。排除 `.` `/` `\` 空格，同时防目录穿越与 Windows 路径歧义。

示例：

| 输入名称 | 生成 id |
|---------|--------|
| 首个空间 | `default`（固定，不经 slug） |
| 张三 | `张三` |
| 张 三 | `张-三` |
| 李四/测试 | `李四-测试` |
| 李四（已存在） | `李四-2` |
| `con` | `_con` |
| 🎉 | `space` |
| 超 41 字 | 截断至 40 |

### 2.2 两条硬规则

**规则 1：id 恒定。** 改名只改 `spaces.json` 里的 `name`，不 rename 目录。目录名即创建时的名字。

**规则 2：越界双保险。必须特判 default。**

```js
const assertInSpace = (id, root) => {
  if (id === "default") {
    if (resolve(root) !== resolve(dataRoot)) throw new Error("default 空间根必须等于数据根");
    return;
  }
  const base = resolve(workspacesRoot);
  if (!resolve(root).startsWith(base + sep)) throw new Error("空间路径越界");
};
```

不能只写「落在 `workspacesRoot` 之内」—— default 的根是 `dataRoot`，**不在** `workspacesRoot` 之下。照抄单一断言会拒绝 default 本身，而所有既有测试都用 default 空间。

## 3. 标识解析链

请求空间 id 的解析优先级：

| 序 | 来源 | 用途 |
|----|------|------|
| 1 | `X-Space: <id>` 请求头 | 脚本 / 第三方 API |
| 2 | `?space=<id>` query | 脚本、跨源浏览器调用，以及嵌进 HTML 的图片直链 |
| 3 | `Cookie: gmp_space=<id>` | 浏览器（前端与 swigger 页均同源，`fetch` 默认 `same-origin` 自动携带） |
| 4 | 回退 | 该部署首个空间 = `spaces[0]`（不排序，新建一律追加末尾，故回退目标不随新建漂移）+ 响应头 `X-Space-Fallback: 1`；完全无来源时另附 `Set-Cookie` |

**`X-Space` 头值必须 percent-encode（非 ASCII id）** —— HTTP 头值受 ByteString 限制，浏览器与 undici 都拒绝非 ASCII 头值，故 `张三` 这类 id 不能裸写进头里。服务端对头值 **percent-decode 一次**（`server/spaceStore.mjs:261-266`），与 `Cookie: gmp_space` 分支对称。正确写法：

```
curl -H "X-Space: %E5%BC%A0%E4%B8%89" /webgrp/schemes      # 张三 ✅
curl -H "X-Space: 张三" /webgrp/schemes                     # ❌ 400（服务端解出的值不是任何已知空间 id）
```

裸 ASCII id（如 `zhangsan`）percent-decode 后恒等，两种写法等价。

**反例：`?space=` 不得再编码一次。** `URLSearchParams.get` 已解码，服务端对该分支**不再** decode（`server/spaceStore.mjs:260`）—— 再解一次会把 `%25` 类值解坏。即：`?space=%E5%BC%A0%E4%B8%89` ✅，`?space=%25E5%25BC%25A0...` ❌。

### 3.1 为何用 Cookie 而不是请求头

图片库走 `<img src>` 直链加载（`apiPath('/images/${id}')`，`server.mjs:2633`、`:3550`），**自定义请求头覆盖不到**；WS 握手同理。

（v1 在此把图标库也算作论据 —— 实际那两处引用**都是图片库**，图标库直链是 `/icon-library/*`（public，全局，与空间无关）。Cookie 的结论不变，但论据只成立一半。）

选 Cookie 的收益：改动集中在一处（写 cookie），天然覆盖直链资源与 dev 期 5174 的 WS（Cookie 无 domain 属性，scope 是 host 不含端口；`runtimeWsClient.ts:68` 用 `window.location.hostname`，两者同 host）。

### 3.2 后端兜底

任何 `/webgrp/*` 请求若无 `gmp_space` cookie，响应附：

```
Set-Cookie: gmp_space=<首个空间>; Path=/; Max-Age=31536000; SameSite=Lax
```

浏览器首次访问即自动获得身份，**前端无需「启动引导 / 空间探测」逻辑**。`Path` 必须为 `/`，否则 WS 与前端 base 路径拿不到。

### 3.3 不用 localStorage 存空间 id

只存 Cookie。读 `document.cookie` 是同步的，没有抖动问题；存两处必然出现不一致窗口，而请求实际用的是 Cookie —— UI 显示与生效值不同是最难查的一类 bug。

前端需要知道「我是谁」时，从 `GET /webgrp/spaces` 的响应体 `current` 读。**唯一例外**：§6 的空间缓存 key 前缀需要同步值，那里读 Cookie（见 6.2）。

### 3.4 CORS：`X-Space` 需纳入允许头，且跨源不能带 Cookie

`server.mjs:53-57` 现有：

```js
const accessControlHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type"     // ← 没有 x-space
};
```

浏览器发起的跨源 `fetch` 带 `X-Space` 会先发 OPTIONS（`server.mjs:4579-4583` 返回 204），预检因响应头不含 `x-space` 而失败。**须加 `x-space`。**

同时须在文档写明两条互斥约束：

- `access-control-allow-origin: *` 与携带 Cookie 的跨源请求**互斥**（浏览器拒绝 `*` + credentials），故 Cookie 仅限同源
- 第三方**跨源**调用只能走 `?space=` 或 `X-Space`；curl / Node 侧无预检，两者都可用

这也意味着 §12 验收项 7/8（用 curl 验证 `X-Space`）**不能证明浏览器第三方可用**，需另加一条跨源预检的验收。

## 4. 后端改造

### 4.1 新模块

**`server/spaceId.mjs`** —— id 生成与校验（纯函数）：

```js
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const ID_OK = /^[\p{L}\p{N}_][\p{L}\p{N}_-]{0,39}$/u;

export function spaceIdFromName(name, taken = []) {
  const text = String(name ?? "").normalize("NFKC").trim();
  let base = text
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  base = [...base].slice(0, 40).join("");
  if (!base) base = "space";
  if (RESERVED.test(base)) base = `_${base}`;

  const used = new Set(taken.map((id) => id.toLowerCase()));   // NTFS 不区分大小写
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = [...base].slice(0, 40 - suffix.length).join("") + suffix;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

export const isValidSpaceId = (id) => ID_OK.test(id);
export const isReservedSpaceId = (id) => RESERVED.test(id);
```

**`server/spaceStore.mjs`** —— 空间注册表 + 路径工厂 + 请求解析：

```js
export function createSpaceStore(dataRoot) {
  return {
    list(): Promise<Space[]>,
    create(name): Promise<Space>,
    rename(id, name): Promise<void>,
    remove(id): Promise<void>,        // 排空 registry → evict 缓存 → 目录移入 trash-spaces/
    resolvePaths(id): SpacePaths,     // 纯字符串拼接，无 IO
    ensureInitialized(): Promise<void>
  };
}

// SpacePaths：{ root, images, icons, schemes, schemeFiles, schemeTrash, settings,
//               colorConfig, measurementConfig, deviceLibraryDir, deviceLibrary,
//               manifest, imageFolders }
```

`SpacePaths` 不含全局线路路径：该文件位置由 `createGlobalLineRegistry` 从 `dataRoot` 自行派生（`schemes/global-lines.json`；历史路径 `settings/global-lines.json` 仅用于迁移），由 4.4 的注册表缓存承担，不在本对象里重复定义。

### 4.2 现有模块：常量 → `paths` 参数（改动面已核实）

**v1 此处的「多数函数已有逃生舱」是错的。** 逐函数核对结果：

**schemes 域 —— 11 个导出函数有逃生舱**（这是 v1 外推的全部依据）：

| # | 函数 | 行号 | 逃生舱 |
|---|------|------|--------|
| 1 | `readSchemesFromFiles(options)` | 466 | ✅ `options.filesRoot` |
| 2 | `readSchemes(options)` | 491 | ✅（转发 #1） |
| 3 | `archiveStaleSchemeFiles(filesRoot, …, options)` | 3015 | ✅ `options.trashRoot` |
| 4 | `createSchemeArchiveBuffer(options)` | 3118 | ✅ 但**带硬守卫，见下** |
| 5 | `importSchemeArchiveBuffer(options)` | 3158 | ✅ |
| 6 | `saveSchemeRecordDirectory(options)` | 3208 | ✅ |
| 7 | `deleteSchemeRecordDirectory(options)` | 3228 | ✅ |
| 8 | `readSchemeProjectRecord(options)` | 3373 | ✅ |
| 9 | `findSchemeProjectRecordByIndex(options)` | 3389 | ✅ |
| 10 | `saveSchemeProjectRecord(options)` | 3439 | ✅ |
| 11 | `deleteSchemeProjectRecord(options)` | 3499 | ✅ |

**settings / device-library / image-manifest / icon 四域 —— 逃生舱数量为 0**，其中 4 个是**无参数签名且被 5 个模块消费**的导出函数：

| 函数 | 行号 | 消费方 |
|------|------|--------|
| `readColorConfig()` | 524 | `svgExport.mjs:6` |
| `readMeasurementConfig()` | 867 | `svgExport.mjs:6`、`apiV1Library.mjs:5`、`cimExport.mjs:6` |
| `readDeviceLibraryConfig()` | 1503 | `svgExport.mjs:6`、`apiV1Library.mjs:5`、`eFileExport.mjs:7` |
| `readReferencedImageExportPathById(ids)` | 2938 | `svgExport.mjs:6` |

图像/图标域约 15 个私有函数需加 `paths`：`ensureJsonStoreFile`(263)、`readJsonStoreFile`(272)、`readOptionalJsonStoreFile`(281)、`writeJsonStoreFile`(290)、`ensureStore`(295)、`readManifest`(301)、`writeManifest`(307)、`readImageFolders`(319)、`writeImageFolders`(331)、`withImageStoreLock`(340)、`resolveFolderId`(346)、`imageFileToDataUrl`(2907)、`imageExportPathByIdFromManifest`(2917)、`getAssetDir`(3576)、`writeImageAssetFile`(3580)。

**消灭 ZIP 导出的硬守卫。** `server.mjs:3125-3129`：

```js
// 渲染适配层（renderSavedModelSvg / buildEFileForSavedModel）无 filesRoot 入参，一律读模块级数据根。
// 若放行自定义根，会产出「json 来自根 A、e/svg 来自根 B」的混合 ZIP —— 显式拒绝，不静默混用。
if (resolve(filesRoot) !== resolve(defaultFilesRoot)) {
  throw new Error("自定义 filesRoot 下暂不支持实时生成派生格式（渲染适配层只读默认数据根）。");
}
```

`server/apiV1Schemes.mjs:123` 正是从这条路径进来的（`filesRoot: getFilesRoot()`），对非 default 空间必不等于默认根 → **非 default 空间的方案 ZIP 全部 500**。

故必须：**拆除该守卫**，并让 `paths` 纵穿 `svgExport.mjs` 的 `renderSavedModelSvg` 与 `eFileExport.mjs` 的 `buildEFileForSavedModel`（两者内部经 `readSchemeProjectRecord` / `readColorConfig` / `readDeviceLibraryConfig` / `readMeasurementConfig` / `readReferencedImageExportPathById` 读模块级根）。

**参数命名统一为 `paths`。** v1 示例代码同时写了 `options.paths` 与 `options.filesRoot ?? paths.schemeFiles`，实施时必然两套机制并存。v2 规定：新签名一律 `options.paths ?? defaultPaths`，**不再新增 `options.filesRoot` 调用点**；现有 `options.filesRoot` 保留为兼容别名（既有测试在用），但不得在新代码里出现。

> **兼容别名的核查陷阱（自查假阴性根因）**：`createSchemeArchiveBuffer({ filesRoot, schemePath })` 这种**属性简写**调用写法里根本没有 `filesRoot:` 字样，`grep "filesRoot:"` 对它完全不可见 —— 早期自查正因此漏判为「无自定义 filesRoot 调用点」。核查别名调用面必须按**变量名** grep（`\bfilesRoot\b`），或直接读调用点源码，不能只搜带冒号的键写法。

`server/apiV1Schemes.mjs` 删掉自建的 `getSchemeDataDir()`（`:24-36`，全仓唯一一处重复推导数据根），改从 `ctx.paths` 取。

**改动清单：**

| 位置 | 改动 | 量级 |
|------|------|------|
| `server/server.mjs` | 51 处路径常量出现（含 `:29-40` 声明块内 15 处交叉引用）→ 约 **36 个真实引用点** | 36 |
| `server/server.mjs` | 30 个 exact handler（29 经 `routeKey` + 1 个字面量 `GET /swigger`）+ 4 个动态 handler 透传 `ctx.paths` | 34 |
| `server/server.mjs` | 7 个 handler 未解构 `request`，需补（`:4418`、`:4470`、`:4479`、`:4494`、`:4543`、`:4550`、`:4557`） | 7 |
| `server/server.mjs` | 四域从零建逃生舱：4 个导出 + 约 15 个私有函数 | 19 |
| `server/svgExport.mjs` | 6 个 helper 调用点加 `{ paths }`；`renderSavedModelSvg` 加 `paths` 入参 | ~7 |
| `server/eFileExport.mjs` | `readDeviceLibraryConfig` / `readSchemeProjectRecord` 调用点；`buildEFileForSavedModel` 加 `paths` 入参 | ~4 |
| `server/cimExport.mjs` | `readMeasurementConfig` 调用点 | 1 |
| `server/svgExport.mjs` / `eFileExport.mjs` | 拆 `createSchemeArchiveBuffer` 守卫的连带改造 | — |
| `server/apiV1Library.mjs` | `readDeviceLibraryConfig` / `readMeasurementConfig` 调用点（**v1 清单漏了此模块**） | 7 |
| `server/apiV1Schemes.mjs` | 删 `getSchemeDataDir()`，改 `ctx.paths` | 3 |

> **实测修正（Task 8 回填，推翻上表的量级估计）**：上述逐文件量级是**估算**，实际偏大。测量结果：
> Task 8（导出适配层与 v1 模块透传 `paths`）**只改了 5 个生产文件** —— `apiV1Library.mjs`、`apiV1Schemes.mjs`、
> `cimExport.mjs`、`eFileExport.mjs`、`sendModel.mjs`。
> 其中 **`server/svgExport.mjs` 无需改动**（上表列的 6 个 helper 调用点加 `{ paths }`、`renderSavedModelSvg` 加 `paths` 入参，
> 均已在 Task 5 就位），**`server/server.mjs` 也无改动面**。`apiV1Library.mjs` 实为 **6 个 handler / 7 处调用**
> （`readDeviceLibraryConfig` ×5 + `readMeasurementConfig` ×2），非上表的 5。
> 教训：按函数签名外推出的量级表会把「别的任务已做掉的部分」重复计入；实施后应回填实测值，不要把估算当既成事实。

**为何不用 AsyncLocalStorage**（签名改动更少）：隐式上下文在 WS 回调、`nativeExportSaveService` 的定时器里会静默退化到 default 空间 —— 错误无声且只在生产偶发。显式透传虽啰嗦，但漏传是调用面/编译期问题，不靠运行时兜底。

**循环依赖**：`server.mjs → svgExport.mjs` 走函数内 `await import()`（`:3137`），v1 模块由 `:4601` 动态加载。**实施时必须保持动态** —— 若改成静态 import，`svgExport.mjs:8` 顶层的 `await import("../src/export/svg.ts")` 会形成 TLA 环。

**已有测试影响**（修正 v1 的「零改动」结论）：

| 测试 | v1 声称 | 实际 |
|------|--------|------|
| 9 个后端测试（27 处 `join(dataDir, …)`） | 零改动 | **零改动成立** —— tmpdir 种子天然即 default 空间 |
| `server/schemeArchiveRealtime.test.mjs:175-180` | 未提及 | **必改** —— 该测试专门断言 `rejects.toThrow(/自定义 filesRoot/)`。应改为断言「自定义 filesRoot 与默认 filesRoot **均可用且各自产出正确的 e/svg**」 |
| `server/swigger.examples.test.mjs` | 列为改动目标 | **必改** —— `:252` `expectFor(ep, ex)` 是逐端点硬编码的期望状态码表（含 400/404 分支），新增 4 个 `/webgrp/spaces` 端点必须补 4 条分支 |
| `server/runtimeRegistry.test.mjs` | 未提及 | **必改** —— 见 4.5 |

### 4.3 请求入口：三处派发点，不是一处

**v1 写的「dispatch 处（约 4560 行）」是错的。** `server.mjs` 有**三个**派发点，签名各不相同：

| 行 | 代码 | 覆盖 |
|----|------|------|
| `:4586` | `await exactRouteHandler({ request, response, url });` | 30 个 exact handler（**无 `match`**） |
| `:4595` | `await route.handle({ match, request, response, url });` | 4 个动态 `/webgrp/*` |
| `:4611` | `await route.handle({ request, response, url, match });` | 40 个 `/webgrp/v1/*` |

三处都要注入：

```js
const resolution = resolveSpaceFromRequest(request, url, spaceStore);
const paths = spaceStore.resolvePaths(resolution.id);
await route.handle({ match, request, response, url, paths, spaceId: resolution.id });
```

**例外：`/webgrp/exports/native/*` 必须在空间解析之前短路**（见 §8.2）。这两个 handler 与空间数据完全无关，若被空间校验拒绝，一次「另存为」会被一个已删除的空间名连带打挂。

`GET /webgrp/spaces` 的 `current` 字段由同一个 `resolveSpaceFromRequest` 算出，保证与请求实际生效的空间一致。

### 4.4 全局线路注册表按空间缓存

`createGlobalLineRegistry` 闭包持有 `queue` + `initialized`，构造时 `resolve` 绑死路径（`globalLineRegistry.mjs:653-665`），**不能每请求新建**。改为：

```js
const registries = new Map();   // spaceRoot → registry
const registryFor = (paths) => { /* 惰性建 + 缓存 */ };
```

`server.mjs:4494-4509` 的 6 条 `/global-lines/*` 路由改走 `registryFor(ctx.paths)`。

**删除空间时的顺序有讲究**（v1 只说「清掉对应条目」，会把目录写回来）：

1. `await registry.locked(() => {})` 排空该空间 registry 的写队列
2. `registries.delete(paths.root)` 驱逐缓存
3. 才 `rename` 目录进 `trash-spaces/`

否则任何**在飞**的注册表操作仍会按旧绝对路径经 `atomicWriteFile` 写回，把已删除的空间在 `workspaces/<id>/schemes/` 下重新建出骨架 —— 删除不彻底且静默。

模块级仅 `globalLineRegistry.mjs:7-19` 的常量，无其他跨空间共享状态（已核实），故按空间缓存无遗漏。

### 4.5 会话类端点的目标筛选：改 `runtimeRegistry.mjs`，不是 WS 层

**v1 此处的实现落点写错了。** 实际代码：

- `server/runtimeRegistry.mjs:142-150` `pickDefaultClient()`：按 `lastActiveAt` 倒序取第一个 → §8.1 的「随机打靶」前提**成立**
- `:161-177` `resolveClient(clientId)` 未知 id 抛 `NoOnlineClientError`；`apiV1Runtime.mjs:42-45` 映射 `no-online-client` → 503 → §8.1 的「复用现有错误码」**成立**
- **但** `server/runtimeWs.mjs:41` 虽把 `request` 传给 connection 回调，`:45` 的回调签名是 `wss.on("connection", (ws) => {…})` —— **没接住 `request`**，cookie 读不到

故目标筛选必须改 **`runtimeRegistry.mjs` 及其 `runtimeRegistry.test.mjs`**，WS 层只负责把 `request` 接住并取出 `workspaceId` 存进客户端条目。v1 的 §4.5 未列这两个文件。

`listClients()`（`runtimeRegistry.mjs:130-139`）的返回结构**不含** `workspaceId`；若要在 `/v1/runtime/clients` 展示空间，需同步改响应形态**和** `swaggerPage.mjs:167` 的响应示例。

## 5. 前端改造

### 5.1 新模块 `src/spaceClient.ts`

```ts
export type Space = { id: string; name: string; pinned?: boolean; createdAt: string; lastAccessAt?: string };

// GET /webgrp/spaces → { spaces, current }
export async function fetchSpaces(): Promise<{ spaces: Space[]; current: string }>;

// POST /webgrp/spaces  body { name } → 新空间对象
export async function createSpace(name: string): Promise<Space>;

// 写 cookie
export function writeSpaceCookie(id: string): void;
```

不引入状态库。列表由 App 的 `useState` 持有，避免每帧请求（`__appScope` 每帧重建，见 `src/CLAUDE.md`）。

### 5.2 顶栏选择器

位置：`src/appExtracted/appTopbar.tsx`，紧邻 RT-WS 指示灯（同为「当前上下文状态」控件）。

- antd `Select`，`size="small"`
- 选项 = 空间列表 + 末项 `＋ 新建空间…`（antd `Modal` 单输入框）
- 新建成功后自动切换到新空间
- 切换被取消 / 失败时还原 Select 显示值

### 5.3 切换时序

```
用户选新空间（与当前不同）
  │
  ├─ scope.hasUnsavedChanges === true
  │    → setPendingUnsavedAction({ kind: "switch-space", spaceId, label })
  │       ├ 保存后切换：await saveCurrentProject() → 切换
  │       ├ 不保存继续：切换
  │       └ 退出操作  ：还原 Select 显示值，结束
  │
  └─ false → 切换
       │
       └─ 切换 = clearSpaceScopedBrowserCaches()   # §6，含 sessionStorage 恢复草稿
              → writeSpaceCookie(id)
              → skipBeforeUnloadRef.current = true   # §5.6
              → location.reload()
```

### 5.4 复用未保存对话框

现有机制已备齐（已核实）：

- `UnsavedChangeAction` 联合类型（`src/appExtracted/appCoreCanvasUtilities.tsx:591-611`）现有三个 `kind`（`load-project` / `enter-browse` / `export`），**新增第四个**：

```ts
| { kind: "switch-space"; spaceId: string; label: string }
```

- `createRequestUnsavedChangeAction`（`appProjectCanvasFactories.tsx:2973`）与 `createResolveUnsavedChangeAction`（`:3010`）加对应分支
- **对话框文案不需改**（已核实）：`appProjectDialogs.tsx:287` 用 `pendingUnsavedAction.label` 拼接（`switch-space` 的 label 可读）；`:291-294` 的 discard 分支对非 `export` 一律显示「不保存继续切换/关闭」；`:296-298` 的 save 分支落到默认「保存后切换/关闭」

### 5.5 用硬重载，但理由须改

v1 的理由「硬重载只需一次页面加载，前端状态全量失效」**前提错了**：`location.reload()` 清不掉 localStorage / IndexedDB / sessionStorage。若不先清（§6），切到新空间时旧空间数据会被回写进新空间。

修正后的论证：

1. 换空间等于换掉整套方案树、图元库、配色、量测配置、图片库 —— 前端内存状态几乎全量失效
2. 软重载需逐个重置 `graphStore` / `routeStore` / 选择 / undo 栈 / 背景页 / WS 快照，漏一个就是跨空间数据串味，且静默
3. **但硬重载本身也不够** —— 必须配合 §6 的显式清缓存，否则持久化层的三份副本会存活并把旧空间数据写进新空间
4. 未保存检查已保证零数据损失，reload 的代价只是一次页面加载

### 5.6 `beforeunload` 会二次拦截我们自己的 reload（仅 prod 出现）

`src/appExtracted/appToolbarHookFactories.tsx:3189-3198`：

```js
const handleBeforeUnload = (event) => {
  persistRefreshRecoveryNow();
  // 开发模式下不提示未保存，避免 HMR/full reload 干扰开发
  if (!saveRequired || isViteFullReload || import.meta.env.DEV) return;
  event.preventDefault();
  event.returnValue = "当前模型尚未保存，关闭网页会丢失未保存修改。";
  return event.returnValue;
};
```

- `isViteFullReload`（`:3185-3188`）只由 `vite:beforeFullReload` 置位，**我们自己的 `location.reload()` 不会置位**
- `saveRequired`（`appStateBatch.tsx:1441`）= `hasUnsavedChanges`，是 React state；用户选「不保存继续」后 `setHasUnsavedChanges(false)` 不会在 `location.reload()` 之前同步生效

→ 浏览器弹出原生「离开此网站？」。**dev 下被 `import.meta.env.DEV` 短路，测试与开发都不会暴露，只在 prod 构建出现。**

修法：切换前先置位 `skipBeforeUnloadRef`（或复用 `appProjectCanvasFactories.tsx:3064` 的 `setSkipSaveCheck` 同款机制）。§12 验收项 6 须注明「prod 构建下切换空间只弹一次对话框」。

### 5.7 WS clientId

`src/runtimeWsClient.ts` 的 clientId 存 localStorage（`:8` `CLIENT_ID_KEY`，`:14/23`），跨空间复用同一 id。切换后 WS 重连注册同 id，服务端 registry 条目更新 `workspaceId`。**clientId 是浏览器身份而非空间数据，不清。**

### 5.8 改动清单

| 文件 | 改动 |
|------|------|
| `src/spaceClient.ts` | 新增 |
| `src/appExtracted/appTopbar.tsx` | 加 `SpaceSwitcher` 组件 |
| `src/App.tsx` | 空间列表 state + 切换回调，挂进 `__appScope` |
| `src/appExtracted/appCoreCanvasUtilities.tsx` | `UnsavedChangeAction` 加 `switch-space` 变体；清缓存函数 |
| `src/appExtracted/appProjectCanvasFactories.tsx` | 两个工厂加分支 |
| `src/lib/deviceLibraryStorage.ts` 等 | 新增缓存清理入口（§6.3） |
| **全部数据请求、`fetchBackendJson`、图片直链、WS** | **零改动**（Cookie 自动携带）—— 已核实 `fetchBackendJson`（`appCoreCanvasUtilities.tsx:3700-3706`）是裸 `fetch(url, init)`；全仓另 16 处绕过它的 fetch（如 `appPersistenceLibraryExport.tsx:2856`、`fileIO.ts:142/196`、`AllNetworkTopologyDialog.tsx:213/1023`）均为同源请求，默认 `credentials: "same-origin"`，结论成立 |

**注意**：v1 把「前端零改动」当作整体结论，v2 仅指数据请求链路；浏览器缓存清理是新增的必要工作（§6）。

## 6. 浏览器侧持久化的空间归属（v1 缺失，本章为新增）

三份与空间无关的副本，`location.reload()` 全部存活。

### 6.1 三份副本清单

| 介质 | 内容 | 位置 |
|------|------|------|
| localStorage | 自定义图元库全套 | `appPersistenceLibraryExport.tsx:2700-2726`：`CUSTOM_DEVICE_LIBRARY_STORAGE_KEY`、`CUSTOM_CATEGORY_LIBRARIES_STORAGE_KEY`、`CUSTOM_COMPONENT_LIBRARIES_STORAGE_KEY`、`DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY`、`E_DEVICE_DEFINITION_*`（5 个）、`CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY`、`CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY` |
| localStorage | 量测配置 | `appPersistenceLibraryExport.tsx:2757` `MEASUREMENT_CONFIG_STORAGE_KEY` |
| localStorage | 配色 | `appToolbarHookFactories.tsx:2948-2949` `COLOR_DISPLAY_MODE_STORAGE_KEY` / `COLOR_PALETTE_STORAGE_KEY` |
| localStorage | 图片库 | `appCoreCanvasUtilities.tsx:3650/3660` `IMAGE_STORAGE_KEY` |
| sessionStorage | 刷新恢复草稿 | `appCoreCanvasUtilities.tsx:2107` `REFRESH_RECOVERY_STORAGE_KEY = "power-system-refresh-recovery"`，读写 `:3618/3634/3642` |
| IndexedDB | 图元库存库 | `src/lib/deviceLibraryStorage.ts`，全库无空间维度（`db.get("templates", kind)`、`db.getAll("overrides")`、`db.transaction("graphTemplates")`） |

**回写路径（这就是「持久化污染」而非「显示串味」的原因）**：

- `appToolbarHookFactories.tsx:2794-2841` `createAppHookCallback79`（图元库）：`:2800` 若 `backendDeviceLibrary.exists` 为真则采用后端并 return；否则落到 `:2822-2838` —— 用**当前 React state（boot 时由 localStorage 播种）** 序列化后 `saveBackendDeviceLibraryPayload(localPayload)` **PUT 回后端**
- `:2763-2792` `createAppHookCallback78`（配色）：`:2769` 同款判断，否则 `:2781` `saveBackendColorConfigPayload(localPayload)`
- `:2849` `createAppHookCallback80`（量测配置）：同款，逻辑 `:2852-2866`

且 `src/App.tsx:657` 的 `const initialDeviceLibrary = useMemo(() => readLocalDeviceLibraryPersistencePayload(), [])` 才是这套状态的 boot 播种点。

→ 切到全新空间「张三」（`library.json` 不存在 → 后端回 `exists:false`）时，**首次加载就把 default 空间残留的本地图元库 / 配色 / 量测配置原样写进张三的目录**。张三的空间从此永久带着别人的定义，重开页面也修不好。

**清理规则的边界**：只清「空间数据缓存」。以下**不清**：

- `runtimeWsClientId`（浏览器身份，`runtimeWsClient.ts:8`）
- `NATIVE_EXPORT_DIRECTORY_STORAGE_KEY`（上次另存为目录，本机偏好，`fileIO.ts:109`）
- `SendModelDialog` 的 `TARGET_URL_STORAGE_KEY`（上次发送目标 URL，本机偏好，`:19`）

### 6.2 清理时机：切换空间时

用户已定：**切换时清空**（而非 key 加空间前缀）。理由是改动最小、且这套本地缓存本是「后端存在之前」的历史遗留，给每个空间各存一份没有实际收益。

两个必须处理的细节：

1. **不能清 default 空间的缓存后不管** —— default 空间的本地缓存是「后端不可用时的兜底」，清掉它意味着用户切回来若后端挂了就失去本地数据。**接受此代价**（后端不可用是异常态，切换到别处再切回是主动操作）。
2. **必须在 `writeSpaceCookie` 之前清**，且清的是**旧空间**的缓存。顺序反了就会把新空间数据当旧空间清掉。

### 6.3 单源清单 + 守卫测试（解决「易漏」问题）

「切换时清空」方案的已知弱点是**未来新增本地缓存容易忘记加进名单**。用两条约束兜住：

1. **单源清单**：清理名单（含 localStorage / sessionStorage 两组 key、IndexedDB 的 store 名）只在一处定义，即 `src/spaceClient.ts` 导出的常量数组。清理函数读它，不得在各处散写。
2. **守卫测试**（`src/spaceClient.test.ts`）：源码扫描全仓所有 `*_STORAGE_KEY` / `*StorageKey` 常量声明与 `indexedDB.open` / `idb` 的 store 名，**断言每一个都在清单内，或显式列在「不清」白名单里**（带理由注释）。新增一处漏登记即测试失败。

这条测试同时迫使实施者逐条分类 §6.1 之外还没出现的 key（例如 `model.ts:7402` 的 `VOLTAGE_LEVEL_SETTINGS_KEY` —— 实施时须明确归类，默认按空间数据处理，因为它是用户可改的建模参数）。

### 6.4 测试断言

§11.1 须新增一条**后端可观测**的断言（不断言前端状态）：

> 从空间 A 切到全新的空间 B 后，B 的 `device-library/library.json` / `measurement-config.json` / `color-config.json` **不被 A 的浏览器本地缓存写入**。

做法：模拟「后端空 + 本地有缓存」的 boot 序列，然后直接读 B 空间的落盘文件断言不含 A 的数据。

## 7. 空间管理 API

新增 4 个端点，路径 `/webgrp/spaces`。**不进 `/v1/*` 信封域** —— 这是本系统自身的管理面，不是对第三方开放的能力。

| 方法 | 请求体 | 行为 |
|------|--------|------|
| GET | — | `{spaces:[{id,name,pinned,createdAt,lastAccessAt}], current}` |
| POST | `{name}` | 建目录骨架 + 写注册表；重名允许，id 自动去重 |
| PUT | `{id,name}` | 仅改 `name`，不动目录 |
| DELETE | `{id}` | 排空 registry 队列 → evict 缓存 → 目录移入 `data/trash-spaces/<ts>/<id>/`；`pinned` 或最后一个空间 → 400 |

## 8. 端点作用域

### 8.1 口径：62 个已文档化 + 12 条未文档化 = 74 条真实路由

`SWIGGER_ENDPOINTS`（`server/swaggerPage.mjs:18-244`）逐组计数 = **62**（图片 7、方案（内部）9、配置 6、v1 方案域 13、v1 图元库 6、v1 运行时态 10、控制台 11）。真实路由表共 **74**：`server.mjs` exact 30 + dynamic 4 + `/webgrp/v1/*` 40。

62 条的分类（计数已核实）：

| 作用域 | 数量 | 端点 |
|--------|------|------|
| **空间** | 38 | 图片资源 7；方案（内部）9；配置 6；v1 方案域 10（不含 receive）；v1 图元库域 6 |
| **会话**（作用于在线前端，不切数据） | 21 | v1 运行时态 10；v1 控制台 11 |
| **全局**（服务端内存态，不落盘） | 3 | `POST/GET/DELETE /webgrp/v1/receive` |

未文档化的 12 条：

| 路由 | 位置 | 归属 |
|------|------|------|
| 6 条 `/global-lines/*` | `server.mjs:4494-4509` | **空间**（§4.4 单独处理，但 v1 未计入分类表） |
| `DELETE /webgrp/images/{id}` | `server.mjs:4554-4559` | **空间**（v1 漏） |
| `POST /webgrp/icon-library/import` | `server.mjs:4437-4439` | **空间**（写导入图标 + manifest，v1 漏） |
| `POST /webgrp/image-library/import` | `server.mjs:4440-4442` | **空间**（写图片 + folders + manifest，v1 漏） |
| `POST /webgrp/exports/native/select-file` | `server.mjs:4443-4445` | **本机**（见 8.2） |
| `POST /webgrp/exports/native/write-text` | `server.mjs:4446-4448` | **本机**（见 8.2） |
| `GET /swigger` | `server.mjs:4418-4427` | 全局 |

**结论：需要新增第四类「本机（host-bound）」**，v1 的三分法容纳不下。

### 8.2 第四类：本机（host-bound）

`/webgrp/exports/native/*` 与空间数据完全无关：

- 首先做来源校验，不通过直接 **403**（`server.mjs:1651`、`:1670` `isAllowedNativeExportOrigin`）；白名单 `nativeExportSave.mjs:8` `LOCAL_HOSTNAMES = {127.0.0.1, localhost, ::1, [::1]}`
- token 机制：`?token=`，TTL 10 分钟（`nativeExportSave.mjs:6`）
- 写入目标是**用户在系统「另存为」对话框里选定的绝对路径**（`nativeExportSave.mjs:245`、`:291`）
- 全仓 grep 在这两个 handler 路径上**零命中** `dataRoot` / `GRAPH_MODEL_DATA_DIR` / `resolve(__dirname`

**它必须与 `/v1/receive` 分开**：前者是**受来源 IP 限制的本机副作用**（弹 Windows GUI 对话框、写文件系统任意路径），后者是**无空间语义的服务端内存态**。塞进同一类会掩盖这个差别。

**实现要求**：这两个 handler 必须在空间解析**之前**短路返回（§4.3），否则一次带 `?space=<已删除空间>` 的另存为 URL 会被空间校验拒绝 —— 纯本机的文件操作不该因空间名失效。

### 8.3 `model/send` 加脚注：空间读 + 对外副作用

`POST /webgrp/v1/schemes/model/send`（`apiV1Schemes.mjs:234`）的空间归类**正确**（读侧经 `sendModel.mjs:7` → `eFileExport.mjs` / `svgExport.mjs` 链，全部按空间），但它是全仓唯一能把空间内数据**主动推送到任意外部 URL** 的端点（`multipart/form-data` POST 到调用方给定的 `url`）。

分类表须加脚注。**同时记录一条已接受的风险**（见 §14）：用户已决定「无来源全部回退 default，不做例外」，故一次忘带空间的脚本调用会把 default 空间的模型发到外部 URL，数据出网不可撤回。

### 8.4 会话类端点的 `?space=` 语义

21 个会话类端点不切数据，经 WS 打到某个**在线前端**，空间由那个前端自己决定。多空间上线后「取活跃客户端」会随机打靶（§4.5 的 `pickDefaultClient()`）。

故这 21 个端点接受**可选** `?space=`，语义是**筛选目标客户端**而非切换数据：

- 该空间有活跃客户端 → 用之
- 该空间无在线客户端 → `503 no-online-client`（复用现有错误码，语义自然）
- **无 `?space=` 且无 `clientId`** → 按调用方来源所在空间筛选（与 §3 解析链一致，即通常为 default），而非全局取活跃者。这样行为可预测

## 9. swigger 文档页

Try-it 的实现是 `await fetch(url, opts)`（`server/swaggerPage.mjs:553`），同源，`fetch` 默认 `credentials: "same-origin"` 自动带 Cookie —— **`send()` 一行不改**。

页面改动：

1. 顶部导航加「当前空间」下拉，切换即写 cookie 并重载。此后所有端点的 Try-it 全部落到该空间
2. 端点元数据加 `scope: "space" | "session" | "global" | "host"` 字段，卡片渲染徽章；页首加说明：脚本调用改用 `X-Space` 头或 `?space=`；跨源浏览器调用只能用 `?space=`（§3.4）
3. 新增 4 个 `/webgrp/spaces` 端点（scope: global）+ `scope` 字段加入 `SWIGGER_ENDPOINTS`
4. `/v1/runtime/clients` 的响应示例若加 `workspaceId` 须同步（§4.5）

**测试影响**：`server/swigger.examples.test.mjs` 必改（`expectFor` 逐端点硬编码期望状态码）。新端点的示例参数须设计成**不污染其他用例的前置状态** —— 例如只 GET，或 DELETE 一个本用例内刚创建的空间；注意 `:204-239` 的 `beforeEach` 每个用例重建 dataDir 并复制 repo 数据。

## 10. 错误处理

| 来源 | 空间不存在时 |
|------|-------------|
| Cookie（浏览器，隐式） | **静默回退** `spaces[0]` + 响应头 `X-Space-Fallback: 1` |
| `X-Space` 头 / `?space=`（脚本，显式） | **400 `SPACE_UNKNOWN`** |
| 无任何来源 | 回退 `spaces[0]` + `Set-Cookie`（**含写操作与对外副作用端点，不做例外** —— 见 §14 风险） |

显式来源报错、隐式来源回退的理由：浏览器侧旧书签、清过 cookie 都不该白屏；脚本侧显式写错空间却静默落到别处是最难查的一类 bug。

其余情形：

| 情形 | 处理 |
|------|------|
| 注册表有条目但目录被手删 | 按需重建骨架，不报错 |
| 名为空 / 全符号 | 400 `SPACE_NAME_INVALID` |
| `spaces.json` 缺失或损坏 | 重建（default + 扫描 `workspaces/` 补登记，过 id 校验） |
| 并发写 `spaces.json` | 串行化写队列，tmp + rename |
| 删除 default 或最后一个空间 | 400 `SPACE_PINNED` |
| 断网 / 后端不可达时切换空间 | `globalMessage` 报错，还原 Select 显示值，**不 reload、不清缓存**（清了就白丢兜底数据） |

## 11. 测试

### 11.1 新增

| 文件 | 覆盖 |
|------|------|
| `server/spaceId.test.mjs` | 中文、冲突去重、Windows 保留名、41 字截断、emoji 兜底、非法 id 拒绝 |
| `server/spaceStore.test.mjs` | 注册表 CRUD、`lastAccessAt`、并发写串行化、`workspaces/` 扫描补登记（含非法目录名跳过）、损坏注册表重建、**越界断言对 default 的特判** |
| `server/spaceScope.test.mjs`（集成，端口 0 + tmpdir） | 无 cookie 回退 + `X-Space-Fallback`；cookie 定向后数据落对目录；**两空间方案互不可见**；`X-Space`/`?space=` 优先级高于 cookie；显式未知空间 → 400；**写操作无来源回退 default**；default 不可删；`trash-spaces` 归档；**删除空间后 registry 不复活目录**；全局线路按空间隔离；图元库/图片/配色/量测各一条隔离断言；**`/exports/native/*` 不受空间校验影响**；**非 default 空间方案 ZIP 导出成功**（对应 B2 的守卫拆除） |
| `src/spaceClient.test.ts` | cookie 写入串（`Path=/`、`Max-Age`、`SameSite=Lax`）；**§6.3 的「缓存 key 全覆盖」守卫测试**；**§6.4 的后端可观测污染断言**；切换时不清 `runtimeWsClientId` / 本机偏好类 key |
| `src/appExtracted/appProjectCanvasFactories.test.ts`（扩充） | `kind:"switch-space"` 的 save / discard / cancel 三路；**切换前跳过 `beforeunload`**（§5.6） |
| `server/runtimeRegistry.test.mjs`（扩充） | `?space=` 筛选目标客户端；该空间无在线客户端 → `no-online-client`；无 `?space=` 无 `clientId` → 按来源空间筛选 |

### 11.2 必改的既有测试

| 测试 | 原因 |
|------|------|
| `server/schemeArchiveRealtime.test.mjs:175-180` | 专门断言 `rejects.toThrow(/自定义 filesRoot/)`，守卫拆除后必改 |
| `server/swigger.examples.test.mjs` | `expectFor` 逐端点硬编码，新增 4 个端点必补分支 |

### 11.3 零改动的既有测试（哨兵）

**9 个后端测试文件共 27 处 `join(dataDir, …)`**：`apiInternal.test.mjs`、`cimExport.test.mjs`、`eFileExport.test.mjs`、`globalLineApi.test.mjs`、`schemeFilesJsonOnly.test.mjs`、`schemeArchiveRealtime.test.mjs`（除 11.2 那一处）、`svgExport.test.mjs`、`sendModel.test.mjs`、`swigger.examples.test.mjs`（除 11.2）。

它们**不改一行却必须通过** —— 正好验证 default 空间映射没有破。这是本次改动最主要的哨兵。

（v1 误写为「11 个」，无对应集合。）

### 11.4 回归要求

1. `pnpm vitest run` 全量必绿
2. `pnpm tsc --noEmit`
3. `pnpm audit:names`（改动了 `server/*.mjs` 对 `src/**` 的 import）
4. `pnpm test:e2e`（Playwright）
5. **prod 构建下验收 §12 的 6（`beforeunload` 只在 dev 被短路）**

## 12. 验收

| # | 验收项 |
|---|--------|
| 1 | 清空 cookie 访问 → 自动落入 default 空间，看到现有全部方案 |
| 2 | 顶栏建「张三」→ 自动切过去 → 方案树为空、图元库只有内置、图片库空 |
| 3 | 张三建方案「测试」→ 切回 default → 看不到「测试」 |
| 4 | 张三把内置模板「转为自定义配置」→ default 空间模板不变 |
| 5 | 张三上传图片 → default 图片库不出现该图 |
| 6 | 有未保存修改时切换空间 → 弹现有未保存对话框，三路都正确；**prod 构建下只弹一次**（无浏览器原生拦截） |
| 7 | `curl -H "X-Space: %E5%BC%A0%E4%B8%89" /webgrp/schemes` 拿到张三的方案（**头值须 percent-encode**，见 §3；裸写 `X-Space: 张三` 因 ByteString 限制必 400，本项据此改写） |
| 8 | `curl -H "X-Space: 不存在" /webgrp/schemes` → 400 |
| 9 | default 空间删除 → 400；张三删除 → 目录进 `trash-spaces/`，且**不会被 registry 复活** |
| 10 | 手工把空间目录拷进 `workspaces/` → 重启后自动出现在列表；拷入名为 `con` 的目录 → 跳过并警告 |
| 11 | **浏览器跨源预检**：带 `X-Space` 的跨源 OPTIONS 返回 204 且含 `access-control-allow-headers: x-space` |
| 12 | 空间 A 有图元库改动 → 切到全新空间 B → **B 的落盘 `library.json` 不含 A 的内容**（§6.4） |
| 13 | 张三导出方案 ZIP → 200（非 default 空间的派生格式实时生成可用） |
| 14 | 现有全部测试绿 |

## 13. 明确不做

| 不做 | 理由 |
|------|------|
| 登录、密码、账号体系 | 已定免登录 |
| 空间级权限 | 免登录下无主体可鉴权，内网信任环境 |
| 公共库 / 私有库双层 | 用户已否；E 文件模板走「共享只读基线 + 空间专属覆盖」两段式已够 |
| 空间配额、用量统计 | 无此需求 |
| 空间改名同步目录 | §2.2 规则 1，收益不抵数据事故风险 |
| 存量数据目录搬迁 | §1.1，得不偿失 |
| 本地缓存加空间前缀 | 用户已选「切换时清空」（§6.2） |
| 图标库主体按空间隔离 | 主体是 git 跟踪的公共素材（§1.2） |
| 修 `CLAUDE.md` 的 `data/icon-library/` 描述与无用的 `GRAPH_MODEL_ICON_LIBRARY_DIR` | 与本次目标无关，另开 |

## 14. 已知风险

| 风险 | 说明 |
|------|------|
| 免登录下任何人可指定任意空间 | 已接受的前提；内网环境，`X-Space`/`?space=` 是刻意开放的编程接口 |
| **无来源全部回退 default，含写操作与对外副作用端点** | 用户明确选择「不做例外」。后果：一次忘带空间的 `model/send` 调用会把 **default 空间**的模型发到任意外部 URL，**数据出网不可撤回**；一次忘带空间的写请求会静默改 default。缓解：`X-Space-Fallback: 1` 响应头可观测，前端会经 `GET /webgrp/spaces` 的 `current` 自愈 |
| `?space=` 经 Referer / 浏览器历史 / 服务端访问日志暴露空间名 | 不构成新的越权路径（本就任何人可指定），但**空间名不宜用作敏感标识**。嵌入第三方页面的图片直链尤其会泄漏 |
| default 空间不对称 | 唯一不可删且位置特殊（根即 `dataRoot`）；靠 `pinned` 标记 + 验收项 9 兜住 |
| 「切换时清空」漏登记新缓存 | 靠 §6.3 的单源清单 + 守卫测试兜住；新增缓存漏登记即测试失败 |
| `paths` 漏传 | 静默落到 default 空间。靠 §11.3 的既有测试哨兵 + 显式透传（不用 AsyncLocalStorage）降低概率 |
| `model/send` 的出站目标由调用方指定 | 空间隔离只作用于**读取侧**；如需限制出站 URL 应另加白名单。本次不改变既有行为 |
