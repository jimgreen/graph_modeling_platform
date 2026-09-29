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
import { describe, expect, it } from "vitest";
import { APP_STATIC_SCOPE } from "./appStaticScope";
// 同时取 Map 与 MapIcon 两个来源：只有两者都在手，才能断出「别名指错了哪一个」
// ——只取 Map 的话，把别名改指 MapIcon 后比较仍然相等（两者是同一份 lucide 导出）。
import { Map as LucideMap, MapIcon as LucideMapIcon } from "lucide-react";
import { templateDerivedComponentLibraryInfo as fromModel } from "../model";
import { templateDerivedComponentLibraryInfo as fromCustom } from "../customDeviceUtils";

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

  it("scope 体量在预期量级（粗哨兵，配合上一条逐模块点名）", () => {
    const size = Object.keys(APP_STATIC_SCOPE).length;
    expect(size).toBeGreaterThan(1000);
  });
});
