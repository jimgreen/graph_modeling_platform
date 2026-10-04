// APP_STATIC_SCOPE 的合并契约：跨模块同名 key 会静默覆盖。
//
// __appScope 是 Object.assign({}, scopeA, scopeB, …) 拼出来的，后面的赢。
// 拼错的唯一表现是**静默**——某个工厂读到的函数其实来自另一个模块，
// 参数签名对不上时表现为「调用结果不对」而不是「找不到」。
//
// 已知有一处同名：templateDerivedComponentLibraryInfo 同时出现在 model 与
// customDeviceUtils（后者经 model 的 `export *` 转出同一份实现）。今天无害，
// 但哪天两边各写一份，scope 里的那个会无声地换成 customDeviceUtils 的版本。
// 本守卫把「它们必须是同一个函数」钉住 —— 哪天分叉立刻转红。
import { beforeAll, describe, expect, it, vi } from "vitest";

// ⚠ 为什么业务模块全部改成「重置注册表后再动态导入」，而不是静态 import
// ---------------------------------------------------------------------------
// 这不是洁癖，是本文件在 isolate:false（共享模块注册表）下会红的**唯一**原因，
// 而且红的还是断言本身（`expected undefined to be defined`），不修就是假绿。
//
// 模块图里有一条真实的环：
//   customDeviceUtils.ts:25  ──值导入──▶  ./App
//   App.tsx:541              ──值导入──▶  ./appExtracted/appStaticScope
//   appStaticScope.ts:46     ──值导入──▶  ../customDeviceUtils
// （customDeviceUtils.ts:24/35 那两行 `import type ... from "./App"` 是类型导入，
//   编译后被擦除，不构成环；第 25 行起的是**值**导入，环是真的。）
//
// appStaticScope.ts:53 的 `Object.assign({}, ..., CustomDeviceUtilsScope, ...)`
// 会在自己求值的那一刻**快照** customDeviceUtils 的命名空间。于是「谁先把环点亮」
// 决定了快照拿到的是完整模块还是半成品：
//
//   入口 appStaticScope（隔离模式 / 生产 main.tsx→App.tsx 都是这条）：
//     appStaticScope:46 → customDeviceUtils 起 → :25 → App.tsx 起 → App.tsx:541
//     → appStaticScope（已在求值中，直接返回半成品给 App，但 App 求值期不用它）
//     → App.tsx 结束 → customDeviceUtils 跑完整个 body → 回到 :46 拿到**完整**命名空间 ✓
//
//   入口 customDeviceUtils（例：先跑 src/customDeviceUtils.test.ts）：
//     customDeviceUtils 起 → :25 → App.tsx 起 → App.tsx:541 → appStaticScope 起
//     → :46 → customDeviceUtils **仍在求值中** → Object.assign 快照半成品 ✗
//
// 半成品的形态很有欺骗性：`export function` 被提升，快照里**在**；
// 8 个 `export const`（customDeviceUtils.ts:54/260/378/382/397/400/708/718）与
// 第 40 行的 `export *` 都还没执行，快照里是 **undefined**。
// 所以「逐模块点名」那条（点名的是 `export function normalizeContainerTerminalAssociations`）
// 照样绿，只有钉在 `export const templateDerivedComponentLibraryInfo` 上的这条转红。
// 同一个半成品也解释了另一个文件的现象：`export *` 未执行 →
// `resolveTemplateComponentLibrary is not a function`。
//
// 这里用 `vi.resetModules()` + 顺序动态导入把入口钉死成「appStaticScope」那条好路径：
// 它和 isolate:true 下本文件拿到的模块图**完全一致**，断言强度不变（一条没删），
// 只是不再取决于「哪个测试文件碰巧先跑」。
//
// 两条纪律：
// ① 四个模块**顺序 await**，不能 Promise.all —— 必须保证 ./appStaticScope 是第一个
//    被点亮的，那才是入口。并发发起时谁先求值就没准了。
// ② ../model 与 ../customDeviceUtils 也要动态导入：resetModules 之后它们的模块
//    实例换了，若留着顶层的静态 import，拿到的 `fromModel` / `fromCustom` 是**旧实例**，
//    `toBe` 比的将是两个不同函数，恒红。lucide-react 同理（`MapIcon` 要比身份）。
//    —— 换句话说：断言要比身份，就只能从同一份模块实例图里取。
type AppStaticScope = typeof import("./appStaticScope").APP_STATIC_SCOPE;
let APP_STATIC_SCOPE: AppStaticScope;
let fromModel: typeof import("../model").templateDerivedComponentLibraryInfo;
let fromCustom: typeof import("../customDeviceUtils").templateDerivedComponentLibraryInfo;
let LucideMap: typeof import("lucide-react").Map;
let LucideMapIcon: typeof import("lucide-react").MapIcon;

beforeAll(async () => {
  vi.resetModules();
  // 顺序 await，见上方纪律①。./appStaticScope 必须排在第一个。
  const scopeModule = await import("./appStaticScope");
  const modelModule = await import("../model");
  const customDeviceUtilsModule = await import("../customDeviceUtils");
  const lucideModule = await import("lucide-react");
  APP_STATIC_SCOPE = scopeModule.APP_STATIC_SCOPE;
  fromModel = modelModule.templateDerivedComponentLibraryInfo;
  fromCustom = customDeviceUtilsModule.templateDerivedComponentLibraryInfo;
  LucideMap = lucideModule.Map;
  LucideMapIcon = lucideModule.MapIcon;
});

describe("APP_STATIC_SCOPE 合并", () => {
  it("templateDerivedComponentLibraryInfo 在 model 与 customDeviceUtils 里是同一份实现", () => {
    // 预条件自证：两边确实各自导出了这个名字（否则这条断言会因「其中一边没导出」而假绿）
    expect(typeof fromModel).toBe("function");
    expect(typeof fromCustom).toBe("function");
    expect(fromModel).toBe(fromCustom);
  });

  it("scope 里取到的是 model 那一份（customDeviceUtils 的 export * 排在后面但同源）", () => {
    // 现状：两者同源，谁赢都一样。这条把「scope 的值确实来自这两个模块之一」钉住，
    // 防止将来某次重构把该导出从两个模块里都删掉、scope 里静默变成 undefined。
    expect(APP_STATIC_SCOPE.templateDerivedComponentLibraryInfo).toBeDefined();
    expect(
      APP_STATIC_SCOPE.templateDerivedComponentLibraryInfo === fromModel ||
        APP_STATIC_SCOPE.templateDerivedComponentLibraryInfo === fromCustom
    ).toBe(true);
  });

  it("scope 关键底座在位：CSS / ResizeObserver / getModelEdgeEndpointPoint 显式挂载", () => {
    // 这三个不走命名空间合并，是 Object.assign 末尾的对象字面量显式挂的。
    // 少了任何一个都是「某处运行时报 undefined is not a function」。
    expect("CSS" in APP_STATIC_SCOPE).toBe(true);
    expect("ResizeObserver" in APP_STATIC_SCOPE).toBe(true);
    expect(typeof APP_STATIC_SCOPE.getModelEdgeEndpointPoint).toBe("function");
  });

  it("MapIcon 显式别名在位（顶层/小地图共用同一个图标组件）", () => {
    // 这里查实了一件事：lucide 自己的 `Map` 与 `MapIcon` **是同一个组件**
    // （探针：`Map === MapIcon` 为 true，lucide 同时导出这两个名字）。
    // 所以别写「MapIcon 不等于 MapIcon 原导出」这种断言 —— 它恒假。
    //
    // 显式别名的意义是**名字**：`MapIcon` 进了 scope 后，引用处读 MapIcon 而不是
    // Map，避免与全局 Map 构造器、以及与 `import { MapIcon } from "lucide-react"`
    // 直接引入时的语义混淆。值相同、名字不同，正是这个设计。
    expect(LucideMap).toBe(LucideMapIcon);
    expect(APP_STATIC_SCOPE.MapIcon).toBe(LucideMap);
    // 顶栏/小地图引用 MapIcon 时不能拿到 undefined
    expect(APP_STATIC_SCOPE.MapIcon).toBeDefined();
    //
    // 变异验证补记：把 `MapIcon: LucideReactScope.Map` 这行显式别名**整行删掉**，
    // 这 6 条一条不红 —— 因为 LucideReactScope 是整包 Object.assign 进来的，
    // 包里本来就有 MapIcon。显式别名是「意图声明」而非承重逻辑，
    // 绿是正确结果（AGENTS.md「A green mutation is not always a broken test」）。
    // 真正会坏的是引用 MapIcon 的地方拿到 undefined（整包合并被删时），
    // 那由上面「逐模块点名」与「体量哨兵」兜。
  });
  it("每个被合并的命名空间都在 scope 里留下了 key（逐个点名，不靠体量哨兵）", () => {
    // 原来只有一条「总 key 数 > 1000」的体量哨兵，实测漏掉了「少合并一整个
    // appInlineUtilityFunctions（十几个 key）」这种 —— 1513 掉到 1500 仍远大于 1000。
    // 改为每个命名空间点名一个代表符号：漏合并哪个，这里就红。
    const representatives: Array<[string, string]> = [
      ["react", "useState"],
      ["model", "getEdgeEndpointPoint"],
      ["graphStore", "createGraphStore"],
      ["routeStore", "createRouteStore"],
      ["selectionActions", "AUTO_ALIGN_DEFAULT_THRESHOLD_PX"],
      ["canvasViewport", "clampNumber"],
      ["measurements", "DEFAULT_MEASUREMENT_CONFIG"],
      ["definitionInstanceSync", "reconcileNodeWithDefinition"],
      ["formatUtils", "finiteNumber"],
      // 只点名**值**导出：type/interface 在运行时被擦除，Object.assign 里根本不存在，
      // 拿它们当代表会让这条恒红（EFileTextEncoding 就是这么踩的）。
      ["fileIO", "writeTextFileToDirectory"],
      ["svgUtils", "escapeXml"],
      ["nodeLabelUtils", "nodeLabelText"],
      ["svgExportUtils", "exportSvgSafeId"],
      ["customDeviceUtils", "normalizeContainerTerminalAssociations"],
      ["appInlineUtilityFunctions", "safeFilePart"],
      ["appCoreCanvasUtilities", "BATCH_GRAPH_PARAM_KEYS"],
      ["appPersistenceLibraryExport", "serializeSchemeRecordForFile"]
    ];
    const missing = representatives.filter(([, symbol]) => !(symbol in APP_STATIC_SCOPE)).map(([mod]) => mod);
    expect(missing, `这些命名空间没有并入 scope：${missing.join(", ")}`).toEqual([]);
  });

  // 上面那条点名挑的是 `export function`（被提升，半成品快照里也在），所以环的点亮顺序
  // 坏了它照样绿。这条专挑 customDeviceUtils 里 8 个 `export const` 之一：
  // customDeviceGeneratedDefaultImageCandidates（customDeviceUtils.ts:708，箭头函数）。
  // 一旦 appStaticScope 在 customDeviceUtils 求值完成前就去快照它的命名空间，
  // 这里读到 undefined → 转红。等于把「快照必须是完整模块」这条契约变成可执行的。
  it("★ 快照拿到的是求值完成的 customDeviceUtils：export const 那批也在（半成品快照会红）", () => {
    expect(APP_STATIC_SCOPE.customDeviceGeneratedDefaultImageCandidates).toBeDefined();
    expect(typeof APP_STATIC_SCOPE.customDeviceGeneratedDefaultImageCandidates).toBe("function");
    // 第 40 行 `export * from "./export/device-definition-shared"` 同理：
    // 它也在模块 body 的开头，环点亮早了就没跑过，下游会拿到 undefined 的函数。
    expect(APP_STATIC_SCOPE.resolveTemplateComponentLibrary).toBeDefined();
    expect(typeof APP_STATIC_SCOPE.resolveTemplateComponentLibrary).toBe("function");
  });

  it("scope 体量在预期量级（粗哨兵，配合上一条逐模块点名）", () => {
    const size = Object.keys(APP_STATIC_SCOPE).length;
    expect(size).toBeGreaterThan(1000);
  });
});