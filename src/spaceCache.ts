// 多工作空间：浏览器侧空间数据缓存的**单源清单** + 清理入口。
//
// 为什么需要这张清单：空间数据在浏览器侧有三份副本 —— localStorage、sessionStorage、
// IndexedDB。切空间时若只清其中一份（尤其漏掉 localStorage 里的方案/模型本身），
// 旧空间的数据会被带进新空间，且更糟的是接上「后端读空 → 把本地缓存写回新空间」的
// 回写链路后，会被静默持久化到新空间。
//
// 设计约束：清单只在本模块定义一处，清理函数读清单；同目录的 spaceCache.test.ts
// 是全仓守卫，扫描面（各层合并为同一组断言）：
//   1. `*_STORAGE_KEY` / `*StorageKey` 常量声明
//   2. storage 调用里的**裸字符串字面量实参** —— 写裸字面量比声明常量更省事，
//      即漏登记最可能发生的那条路；只扫常量会正好漏掉它
//   3. storage 调用实参是**模板字符串或 `+` 拼接**时的静态前缀（见
//      `SPACE_SCOPED_STORAGE_KEY_PREFIXES`；目前仓库无此形态）
//   4. IndexedDB 的**库名**（`openDB(` / `indexedDB.open(`）与 store 名
//      —— 只扫 store 名会漏掉「新增第二个库」这条路径
//
// 守卫保证什么 —— 以下四类 key **全部已分类**：
//   1. `*_STORAGE_KEY` / `*StorageKey` 命名的常量声明
//   2. storage 调用中的**字面量实参**
//   3. storage 调用实参位置的**拼装表达式**（取其静态前缀；仓库现状零命中，
//      其效力由变异实测证明，不由计数证明）
//   4. IndexedDB 的库名（`openDB(` / `indexedDB.open(`）与 store 名
//
// 本守卫**不保证**（已知边界，不是疏漏）：
//   (d) 名称不含 `STORAGE_KEY`/`StorageKey`、且以**变量**传入 storage 的常量。
//       当前已知成员 **4 条**，已全部显式列入下方清单并各自分类：
//         · `CATALOG_CACHE_KEY`、`MANIFEST_CACHE_KEY_PREFIX`（`iconLibraryCatalog.ts:6-7`）
//           —— 经 helper 形参间接进 storage，见 (f)
//         · `VOLTAGE_LEVEL_SETTINGS_KEY`（`model.ts:7398`，用于 `:7402`/`:7418`）
//         · `CLIENT_ID_KEY`（`runtimeWsClient.ts:8`，用于 `:14`/`:23`）
//       后两条以**纯标识符实参直接**调 storage，四层扫描全看不见 —— 把
//       `model.ts:7398` 的值改掉、或把 runtimeWsClient 的 key 改名，**守卫照样绿**，
//       而前者会让上一空间的电压基值设定跨空间留存（与 S2 同类）。
//       今天 4 条都在清单里（`runtimeWsClientId` 属「不清」、其余属「清」）故无现网泄漏；
//       但**别把「在清单里」读成「受守卫保护」** —— 本模块头那句「源里改名、这里没改
//       不会被类型系统发现，这正是守卫按值比对要堵的洞」对这 4 条**不成立**：
//       守卫根本看不到它们，值改了也不会红。
//   (e) 运行期拼装、**静态不可枚举**的键。当前已知成员 —— 同一文件的 `cacheKey`
//       （`:364`，`<前缀><库 id>`），已按前缀登记在
//       `SPACE_SCOPED_STORAGE_KEY_PREFIXES` 里整族清。
//   (f) 经 **helper 形参**进 storage 的键，无论实参是常量还是字面量。
//       已存在的 helper：`readLocalStorageJson` / `readLocalStorageJsonWithLegacy` /
//       `readSidePanelMode` / `readStoredPanelDimension`
//       （`appPersistenceLibraryExport.tsx:2582/2593/2779/2844`）、
//       `readCacheJson` / `writeCacheJson`（`iconLibraryCatalog.ts:160/178`，键经
//       `browserCacheStorages()` 的 `Storage` 别名落到两个存储上）。
//       今天这些调用点**全传常量、无实参位字面量**（已核），故无现网缺口；
//       但将来写 `readLocalStorageJson("new-key", …)` 或 `readCacheJson("new-key", …)`，
//       四层扫描一条都看不见 —— (d) 的定义（「…的**常量**」）读起来也不像覆盖这种字面量。
//   (g) 在 **storage 别名**上开的新键，如 `const s = localStorage; s.setItem("k", …)`。
//       今天不存在别名开键的写法（`browserCacheStorages()` 是唯一别名，其上的键走 (d)）。
//
// (d)–(g) 的当前成员已**显式列入下方清单**并各自分类；
// **新增这四类键时，守卫不会提醒你** —— 要收敛它们得靠人读代码，不靠正则。
// 别把这张清单读成「已经覆盖了一切」。
//
// 为什么不去扫「局部量拼装」以补上 (e)：`cacheKey`/`typeKey`/`sectionKey`… 那类
// 写法全仓 20 处，全是 React key、空间桶 key、递归守卫 key，与存储无关；
// 要扫它得先判「这个名字像不像存储键」，那是启发式，会引出一张需要持续维护的
// 误报白名单（`*_KEY`/`*_PREFIX` 命名的 UPPER_SNAKE 常量实测 70 条，绝大多数是
// `Set`/数组/regex）。边界写死比多扫一层更可靠。
//
// 清单以**字面量**书写而非 import 源常量：`*_STORAGE_KEY` 多数定义在
// `appExtracted/*.tsx`（含 React/JSX），import 会把整棵前端依赖树拖进 Node 侧调用方。
// 不做 import 的代价是「源里改名、这里没改」不会被类型系统发现 —— 这正是守卫按
// **值**比对要堵的洞。

import { initDeviceLibraryDB } from "./lib/deviceLibraryDB";

/**
 * 清 —— localStorage 的空间数据。
 * 源常量见 `appExtracted/appCoreCanvasUtilities.tsx:2099-2161`、
 * `appExtracted/appPersistenceLibraryExport.tsx:1101-1105`、`model.ts:7398`。
 */
export const SPACE_SCOPED_LOCAL_STORAGE_KEYS: readonly string[] = [
  // 方案与模型数据本身 + 当前打开模型/草稿。漏这四条后果最重：
  // 切空间后 localStorage 里仍留着上一空间的方案与模型。
  "power-system-model-projects",
  "power-system-model-schemes",
  "power-system-active-project",
  "power-system-current-draft",
  // 图片资源
  "power-system-image-assets",
  // 自定义元件/类别/组件库（含两条无 LEGACY_ 前缀对应物的历史变体）
  "power-system-custom-device-library",
  "power-system-custom-attribute-libraries",
  "power-system-custom-category-libraries",
  "power-system-custom-component-types",
  "power-system-custom-component-libraries",
  "power-system-device-definition-overrides",
  // 自定义图元模板
  "power-system-custom-graph-template-types",
  "power-system-custom-graph-templates",
  // 配色
  "power-system-color-display-mode",
  "power-system-color-palette",
  // 量测配置
  "power-system-platform-measurements",
  // E 元件定义设置（标签/导出/字段序/模板字段/业务表 id）
  "power-system-e-device-definition-labels",
  "power-system-e-device-definition-class-export-enabled",
  "power-system-e-device-definition-field-order",
  "power-system-e-device-definition-template-fields",
  "power-system-e-device-definition-table-ids",
  // 电压等级设置（建模参数，按空间数据对待）
  "graph-model-voltage-levels",
  // E 元件模板导入态：驱动顶栏【当前模板】状态机（当前模型来自哪个 E 模板、
  // 是否只读、上次导入结果）。属建模态，跨空间泄漏会让新空间模型显示旧空间的模板来源。
  // 源处（appView.tsx / appDeviceDefinitionFactories.tsx）**写的是裸字面量、无命名常量**，
  // 故只有守卫的「字面量实参」扫描面能覆盖。
  "eDeviceInterfaceLoadedTemplateName",
  "eDeviceInterfaceReadonlyMode",
  "eDeviceTemplateImportResult",
  // 图标库目录缓存（`iconLibraryCatalog.ts:6`，经 `readCacheJson/writeCacheJson` 形参间接
  // 写入 localStorage 与 sessionStorage **两边**）。
  //
  // 【为何判「清」】判据是代价不对称：**清一个缓存只花一次重取，不清一个空间作用域的
  // 缓存则可能泄漏数据**。它的来源在不同部署下不固定 —— 共享的 `public/icon-library/`
  // 之外，空间级导入的图标落在 `<spaceRoot>/icons`（`server/spaceStore.mjs:42`，
  // `root` 已是 `data/spaces/<id>/`），即**确实存在按空间的内容**。静态无法证明这个
  // key 空间与空间无关，故作用域不明时取「清」。
  //
  // 别把它当冗余的「优化」删掉：删它换来的是省一次重取，代价是可能跨空间回放目录。
  "graph-modeling-platform:icon-library:catalog:v2"
];

/**
 * 清 —— sessionStorage 的空间数据。
 *
 * 必须清的原因：切空间后的 `location.reload()` **不清 sessionStorage**，
 * 而 `beforeunload` / `pagehide`（`appToolbarHookFactories.tsx:3189-3200`）会把
 * 旧空间当前模型的刷新恢复草稿写进这里，新空间加载时会被当成「刷新恢复草稿」读回。
 */
export const SPACE_SCOPED_SESSION_STORAGE_KEYS: readonly string[] = [
  "power-system-refresh-recovery",
  // 顶栏「最近使用图元」快选。存的是 `DeviceTemplate.kind`
  // （`appCanvasInteractionFactories.tsx:3444,3748`、`appProjectCanvasFactories.tsx:107`），
  // 而自定义元件的 kind 属空间数据 —— 它可能指向**另一个空间**的自定义图元种类。
  // 清掉的代价只是丢一个便利快捷列表。
  "recentGlyphKinds"
];

/**
 * 清 —— 运行期**拼装** key 的静态前缀（按前缀整族清，见 `clearKeysByPrefix`）。
 *
 * 【为何判「清」】同上的代价不对称判据。这一条尤其明显：它的来源之一是
 * `<spaceRoot>/icons` 下按空间导入的图标（`server/spaceStore.mjs:42`），
 * 而 key 形如 `<前缀><库 id>`，**静态不可枚举**，只能按前缀清。
 *
 * 清理函数会遍历存储、摘掉所有以这些前缀开头的 key；不是精确匹配。
 */
export const SPACE_SCOPED_STORAGE_KEY_PREFIXES: readonly string[] = [
  "graph-modeling-platform:icon-library:manifest:v2:",
  // catalog 键本身已是精确 key（在上面的清单里），此处**再登一次前缀**是纵深防御：
  // 若将来有人给它加后缀变体（`…:catalog:v2:<库 id>`），前缀规则仍能整族清掉，
  // 不必再想起来改这里。两处都在是**有意重复**，别当成冗余合并掉。
  "graph-modeling-platform:icon-library:catalog:v2"
];

/**
 * 清 —— IndexedDB 库级。全仓只应存在这一个库；新增第二个库即守卫红。
 * （若将来出现**非空间级**的库，在守卫里给它单开一张 KEPT_IDB_DATABASES 白名单，
 * 别把它塞进这里。）
 */
export const SPACE_SCOPED_IDB_DATABASES: readonly string[] = ["device-library"];

/**
 * 清 —— IndexedDB（device-library 库）的空间数据 store。
 * store 名取自 `lib/deviceLibraryStorage.ts`，即图元库的实际数据面。
 */
export const SPACE_SCOPED_IDB_STORES: readonly string[] = [
  "templates",
  "templateImages",
  "graphTemplates",
  "overrides"
];

/**
 * 不清 —— IndexedDB 的非空间数据 store。
 *
 * `migration` 是「legacy localStorage → IndexedDB 一次性迁移已完成」的簿记标志
 * （`lib/deviceLibraryDB.ts:82`）。**刻意保留**：清掉它会让下次启动
 * `getMigrationStatus().completed` 为假（`App.tsx:663-664`）—— 注意这**不是**
 * 「只有升 schema 才会重跑」：簿记被清即 `completed` 为假，下次启动必重跑 ——
 * 于是再跑一次 `migrateFromLocalStorage()`（该函数自身的早退闸门
 * `lib/deviceLibraryMigration.ts:109-119` 也依赖同一条记录）。而该迁移的**输入**正是
 * localStorage 的三个 legacy key（`lib/deviceLibraryMigration.ts:127-131/157/169` 的
 * `readCustomDeviceTemplatesFromLocalStorage` 等），它们也在本模块的清理清单里；
 * 迁移于是读到空源、只从内置 `DEVICE_LIBRARY` 派生，并以 `saveDeviceTemplates()` 对
 * IDB 图元库做**整表覆盖写**（`lib/deviceLibraryStorage.ts:318` 的 `store.clear()`）。
 *
 * 【效力范围，别读成「IDB 里存着用户数据」】今天 IDB 图元库是**只写镜像**：产品代码里
 * 只有两处用到 `lib/deviceLibraryStorage` —— 迁移模块（静态 import，只取四个 `save*`）
 * 与 `appExtracted/appPersistenceLibraryExport.tsx:2678`（**动态** import，`:2734` 也只取
 * 三个 `save*`）；它的**八个读函数**在产品代码里零消费者。而 UI 侧的图元库来自
 * `App.tsx:658` 的 localStorage、随后被该空间的后端值覆盖
 * （`appToolbarHookFactories.tsx:2801-2821`）。
 * 故这次整表覆盖**本身不丢用户数据**（覆盖写落在一份没人读的镜像上）。
 * 保留 `migration` 因此是**防御性**的：少一次无谓的整表写，并在将来真出现 IDB 读者时
 * 仍落在安全的一侧。真正会被丢的是 legacy localStorage 那批键 —— 而它们**无论如何**
 * 都会被本模块清掉（见上面的清理清单），保留 `migration` 并不能救它们。**别把它当备份。**
 */
export const KEPT_IDB_STORES: readonly { store: string; reason: string }[] = [
  {
    store: "migration",
    reason: "迁移簿记标志，非空间数据；清掉会让下次启动重迁移，而重迁移的输入（legacy localStorage 三个 key）已被本模块一并清空，它会以整表覆盖写把 IDB 图元库重置为「仅内置」。今天 IDB 只是只写镜像，故该覆盖本身不丢用户数据 —— 保留属防御性"
  }
];

/**
 * 记录「本浏览器当前这套空间缓存属于哪个空间」。
 *
 * 它是**清理的判据**，故必须自己不被清掉（在下面的「不清」白名单里）。
 *
 * 归属什么时候会不一致：**只有手工路径**。经顶栏切换时 `switchToSpace` 清完缓存就立刻
 * 把记账改写成新空间（`spaceSwitch.ts` 里那一句），故重载后跑的闸门看到「记账 === current」
 * 直接放行 —— 那里若改成「不记账、让闸门补」，代价不是一次空操作：闸门会开
 * `initDeviceLibraryDB()` 连接 + 一个 readwrite 事务 + 4 个 `store.clear()`，全在
 * `createRoot` 之前，且每次切换必发生。
 */
export const SPACE_CACHE_OWNER_STORAGE_KEY = "gmp_cache_space";

/**
 * 不清 —— localStorage 的本机偏好与浏览器身份。
 * 清掉只会让用户每个空间都要重新调面板，或让运行时态 WS 换一个 clientId。
 */
export const KEPT_LOCAL_STORAGE_KEYS: readonly { key: string; reason: string }[] = [
  {
    key: "graph-modeling-platform:interaction-mode",
    reason: "画布交互模式（选择/平移），本机操作习惯"
  },
  {
    key: "power-system-left-panel-mode",
    reason: "左侧面板显隐，本机 UI 偏好"
  },
  {
    key: "power-system-right-panel-mode",
    reason: "右侧面板显隐，本机 UI 偏好"
  },
  {
    key: "power-system-left-panel-width",
    reason: "左侧面板宽度，本机 UI 偏好"
  },
  {
    key: "power-system-right-panel-width",
    reason: "右侧面板宽度，本机 UI 偏好"
  },
  {
    key: "power-system-statusbar-height",
    reason: "状态栏高度，本机 UI 偏好"
  },
  {
    key: "power-system-validation-panel-height",
    reason: "校验面板高度，本机 UI 偏好"
  },
  {
    key: "graph-modeling-platform.native-export.directory",
    reason: "上次另存的目录，本机路径"
  },
  {
    key: "sendModelTargetUrl",
    reason: "上次发送模型的目标 URL，本机配置"
  },
  {
    key: "graph-modeling-platform:tour-seen",
    reason: "首次引导「已看过」标志，非空间数据；清掉会让每次切空间都重放新手引导"
  },
  {
    key: "runtimeWsClientId",
    reason: "运行时态 WS 的浏览器身份，非空间数据；换了它会让第三方持有的 clientId 失效"
  },
  {
    key: SPACE_CACHE_OWNER_STORAGE_KEY,
    reason: "「当前这套缓存属于哪个空间」的记账（上面 SPACE_CACHE_OWNER_STORAGE_KEY）——它就是清理的判据，被清掉则下次启动无从判断归属"
  }
];

// 逐个 key 清，单项失败不阻断其余（存储不可用或个别 key 抛错时，其余仍要清掉）。
function clearKeys(storage: Storage | undefined, keys: readonly string[]): void {
  for (const key of keys) {
    try {
      storage?.removeItem(key);
    } catch {
      // 隐私模式等存储不可用：跳过该项，继续清后面的
    }
  }
}

// 按前缀整族清。先收集再删 —— 边遍历边删会让索引错位、漏掉后半段。
// 运行期拼装的 key（如 `<前缀><库 id>`）静态不可枚举，只能这样清。
function clearKeysByPrefix(storage: Storage | undefined, prefixes: readonly string[]): void {
  if (!storage || prefixes.length === 0) {
    return;
  }
  try {
    const doomed: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key !== null && prefixes.some((prefix) => key.startsWith(prefix))) {
        doomed.push(key);
      }
    }
    for (const key of doomed) {
      storage.removeItem(key);
    }
  } catch {
    // 隐私模式等存储不可用：无处可清
  }
}

/**
 * 清空本浏览器内所有空间数据缓存。
 *
 * **调用契约（T3 的 `switchToSpace` 必须照此编排）**：清完之后才写空间 Cookie、才
 * `location.reload()`。本函数抛错时表示「没清干净」—— 此时**不得继续切换**，应
 * **不写 Cookie、不 reload**，用 `globalMessage` 提示失败并让用户重试。
 * 理由：切换的全部意义就是「切换前先清干净」；清不干净就切等于把 S2（旧空间数据
 * 被回写进新空间）打开且不告诉用户。代价是 IDB 不可用时暂时切不了空间 —— 那是
 * 罕见的、可重试的，比静默污染轻。
 *
 * 抛错策略：localStorage / sessionStorage 逐项容错（存储不可用时无处可清）；
 * IndexedDB 的错误**向上抛**，绝不吞。
 */
export async function clearSpaceScopedBrowserCaches(): Promise<void> {
  const local = typeof localStorage === "undefined" ? undefined : localStorage;
  const session = typeof sessionStorage === "undefined" ? undefined : sessionStorage;

  clearKeys(local, SPACE_SCOPED_LOCAL_STORAGE_KEYS);
  clearKeysByPrefix(local, SPACE_SCOPED_STORAGE_KEY_PREFIXES);
  clearKeys(session, SPACE_SCOPED_SESSION_STORAGE_KEYS);
  clearKeysByPrefix(session, SPACE_SCOPED_STORAGE_KEY_PREFIXES);

  const db = await initDeviceLibraryDB();
  const tx = db.transaction([...SPACE_SCOPED_IDB_STORES], "readwrite");
  await Promise.all(SPACE_SCOPED_IDB_STORES.map((store) => tx.objectStore(store).clear()));
  await tx.done;
}

/** 读「本套缓存属于哪个空间」；没有记账（首次在本浏览器打开、或从前一版本升级上来）返回空串。 */
export function readCacheOwnerSpace(): string {
  if (typeof localStorage === "undefined") {
    return "";
  }
  try {
    return localStorage.getItem(SPACE_CACHE_OWNER_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** 记下「本套缓存属于哪个空间」。调用点只有两个：`switchToSpace`（清完之后）与下面的启动闸门。 */
export function rememberCacheOwnerSpace(id: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(SPACE_CACHE_OWNER_STORAGE_KEY, id);
  } catch {
    // 隐私模式等：记账写不进去，退化成「下次启动仍认为归属未知」，不阻断主流程
  }
}

/**
 * 启动闸门：把浏览器侧空间缓存与即将加载的空间对齐。**必须在渲染之前跑**
 * （`src/main.tsx` 的 `createRoot` 之前）—— App 的模型/配色/量测状态是**渲染期同步**从
 * localStorage 播种的（`useMemo`/`useState` 初值），effect 跑在播种之后：那时旧空间的
 * 数据已进 React state，之后再清缓存已是事后动作，「后端读空 → 回写本地缓存」照样会把
 * 旧空间内容推给新空间。故本函数不得被挪进 `useEffect`。
 *
 * 为什么需要它：`switchToSpace` 的清理只在**经顶栏切换**时发生。而 `gmp_space` 是无签名
 * 普通 Cookie（公开契约），手工改成另一个空间再打开应用，`switchToSpace` 从不执行 ——
 * 那正是 S2（旧空间数据被静默回写进新空间）残留的那条路径。
 *
 * 无记账时**只记不清**：此时无法区分「全新浏览器（缓存本就为空，清了也没损失）」与
 * 「升级上来的浏览器（缓存里确实有上一空间的数据）」。误清的代价不是「再取一次」那么简单：
 * 清单里装着 `power-system-current-draft` / `power-system-refresh-recovery` ——
 * **当缓存其实就是当前空间的时候（升级后第一次打开，这是最常见的情形）**，
 * 清一次就等于把用户这个空间里的未保存草稿抹掉。故拿不准时不清。
 * 这条边界是**有意保留的一个一次性窗口**：首次打开后记账即写上，此后每次启动都进闸门；
 * 唯一被漏过的，是「升级后第一次打开之前就手工改过 Cookie」的那种浏览器。
 *
 * 清缓存抛错（IDB 不可用）时**不写记账**并向上抛：让调用方决定是否阻断启动；
 * 记账不写意味着下次启动会重试，而写下去就等于把「已对齐」这个错误前提固化。
 */
export async function reconcileSpaceCacheOwnership(resolvedSpaceId: string): Promise<void> {
  const owner = readCacheOwnerSpace();
  if (owner === resolvedSpaceId) {
    return;
  }
  if (owner !== "") {
    await clearSpaceScopedBrowserCaches();
  }
  rememberCacheOwnerSpace(resolvedSpaceId);
}
