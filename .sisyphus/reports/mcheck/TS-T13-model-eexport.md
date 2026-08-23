# T13 model-eexport 审查报告（ts + test）

## 概览

- **model-eexport.ts**: 3845 行
- **model-eexport.test.ts**: 4453 行
- **总行数**: 8298 行
- **发现总数**: 14
- **数据块占比估计**: ~40%（E_SECTION_COLUMNS、KNOWN_E_PARAM_KEYS、E_INTEGER_COLUMNS 等静态数据表）

---

## P0 严重

### [P0] isAdjustableDevice 每次调用重建数组
- 位置: src/model-eexport.ts:2111
- 类型: 性能
- 描述: `isAdjustableDevice` 函数在每次调用时创建新数组 `["ac-wind-source", "ac-pv-source", "ac-hydro-source", "ac-storage"]`。该函数在 `formatEDeviceRecordColumnValue`（line 2249）中被调用，而后者在 `formatESection`（line 2282）的 `map` 循环内对每个单元格执行。对于大型导出（数百行 × 数十列），会创建数千个临时数组。
- 建议: 将数组提升为模块级常量或使用 `Set`：
  ```typescript
  const ADJUSTABLE_DEVICE_TYPES = new Set([
    "ac-wind-source", "ac-pv-source", "ac-hydro-source", "ac-storage"
  ]);
  function isAdjustableDevice(deviceType: string): boolean {
    return ADJUSTABLE_DEVICE_TYPES.has(deviceType);
  }
  ```

### [P0] E_FILE_WIDE_CHAR_WIDTH 使用无理数导致对齐漂移
- 位置: src/model-eexport.ts:2205
- 类型: bug
- 描述: `E_FILE_WIDE_CHAR_WIDTH = 5 / 3` 结果是 1.6666...（无限循环小数）。在 `eFileCellDisplayWidth`（line 2207-2214）中累加后，再经 `Math.round`（line 2218）取整，当宽字符数量较多时可能产生 ±1 空格的累积误差，导致固定宽度 E 文件列对位偏移。
- 建议: 使用整数宽度计算（如 ×3 后统一缩放），或直接采用 2 作为 CJK 字符宽度（等宽字体标准）：
  ```typescript
  const E_FILE_WIDE_CHAR_WIDTH = 2; // CJK 字符在等宽字体中占 2 个英文字符宽度
  ```

---

## P1 重要

### [P1] getEExportWarningsFromRecords 两次遍历 project.nodes
- 位置: src/model-eexport.ts:2027, 2033
- 类型: 性能
- 描述: `getEExportWarningsFromRecords` 函数对 `project.nodes` 执行两次 `flatMap`：第一次收集枚举警告（line 2027），第二次收集记录警告（line 2033）。对于大型项目（数千节点），会产生两次完整遍历。
- 建议: 合并为单次循环，在循环内同时处理两种警告类型。

### [P1] substationIdv 计算中 findIndex 嵌套在 map 内
- 位置: src/model-eexport.ts:2523-2526
- 类型: 性能
- 描述: `basevoltageIdxs` 计算中，`allBasevoltageLevels.findIndex`（line 2524）嵌套在 `nodeVbases.map`（line 2523）内，时间复杂度 O(n×m)。当节点和电压等级都较多时性能下降。
- 建议: 先构建 `Map<string, number>` 索引，再 `map` 查找：
  ```typescript
  const vbaseIndexMap = new Map(
    allBasevoltageLevels.map((level, idx) => [String(level.vltp), idx + 1])
  );
  const basevoltageIdxs = nodeVbases
    .map((vbase) => vbaseIndexMap.get(String(vbase)) ?? 0)
    .filter((idx) => idx > 0);
  ```

### [P1] eFileCellDisplayWidth 宽字符正则可能遗漏 CJK 范围
- 位置: src/model-eexport.ts:2210
- 类型: bug
- 描述: 宽字符检测正则 `/[ᄀ-ᅟ〈〉⺀-꓏가-힣豈-﫿︐-︙︰-﹯＀-｠￠-￦]/u` 覆盖了韩文、部分 CJK、全角字符，但遗漏了 CJK Unified Ideographs 主块（U+4E00-U+9FFF）和扩展区 A-G。若导出内容包含简体/繁体汉字，宽度计算将错误。
- 建议: 补充完整 CJK 范围：
  ```typescript
  /[ᄀ-ᅟ〈〉⺀-꓏가-힣一-鿿豈-﫿︐-︙︰-﹯＀-｠￠-￦]/u
  ```
  或使用 Unicode property escapes（需确认目标环境支持）：
  ```typescript
  /\p{Script=Han}|\p{Script=Hangul}|\p{Block=Halfwidth_and_Fullwidth_Forms}/u
  ```

### [P1] getRawEParamValue 函数过长且分支复杂
- 位置: src/model-eexport.ts:616-900（约 285 行）
- 类型: 抽象层次
- 描述: `getRawEParamValue` 包含大量 `if` 分支处理不同 section 和 key 的特殊逻辑（ACTransformer、HydroStorage、各类 converter 的 control_type 等），嵌套层级深，难以维护。
- 建议: 将特殊处理逻辑抽取为独立函数或策略表，如：
  ```typescript
  const SPECIAL_VALUE_HANDLERS: Record<string, (node, key) => string> = {
    "ACTransformer:i_p": handleTransformerHighSide,
    "HydroStorage:rated_capacity": handleHydroStorageCapacity,
    // ...
  };
  ```

### [P1] buildTopologyNodeDevices 嵌套三元运算符过深
- 位置: src/model-eexport.ts:1598-1610
- 类型: 风格
- 描述: 4 层嵌套三元运算符（`section === "ACNode" ? ... : section === "DCNode" ? ... : section === "HydroNode" ? ... : ...`），可读性差。
- 建议: 使用 `if/else` 或 `switch` 语句，或构建参数映射对象。

---

## P2 一般

### [P2] 测试文件导入块过长
- 位置: src/model-eexport.test.ts:1-160
- 类型: 风格
- 描述: 测试文件前 160 行为 `import` 语句，从 `./model` 导入大量符号（约 150 个），其中部分可能未在本测试文件中使用（如 `alignNodes`、`buildTopology`、`calculateModelContentSize` 等与 E 文件导出无直接关系的函数）。
- 建议: 审查导入列表，移除未使用的符号；考虑将测试按功能拆分为多个文件。

### [P2] KNOWN_E_PARAM_KEYS 硬编码集合过长
- 位置: src/model-eexport.ts:460-614
- 类型: 维护性
- 描述: `KNOWN_E_PARAM_KEYS` Set 包含约 150 个硬编码参数名，新增参数时需手动维护此列表，易遗漏。
- 建议: 考虑从 `E_SECTION_COLUMNS` 或其他数据源自动生成，或添加注释说明维护规则。

### [P2] 测试断言对精确列列表过于敏感
- 位置: src/model-eexport.test.ts（多处）
- 类型: 维护性
- 描述: 多处测试使用 `toEqual(["idx", "name", "node", ...])` 精确匹配列列表（如 line 1019-1024, 2577-2579, 4433-4435），任何列的增删都会导致测试失败，即使行为正确。
- 建议: 对于列顺序不敏感的场景，使用 `expect.arrayContaining`；或区分"必须包含"和"精确等于"的断言意图。

### [P2] 魔数字符串 ":" 检查派生记录
- 位置: src/model-eexport.ts:2026
- 类型: 可读性
- 描述: `!id.includes(":")` 用于过滤派生记录（line 2026），但 ":" 作为分隔符的含义未显式说明，阅读代码时不易理解。
- 建议: 抽取为具名常量或添加注释：
  ```typescript
  const DERIVED_RECORD_ID_SEPARATOR = ":";
  const exportedNodeIds = new Set(
    records.map((record) => record.id).filter((id) => !id.includes(DERIVED_RECORD_ID_SEPARATOR))
  );
  ```

---

## P3 轻微

### [P3] 单测试 describe 块可扁平化
- 位置: src/model-eexport.test.ts:4005-4023
- 类型: 风格
- 描述: `describe("模型类型与全局序号", ...)` 内仅包含一个测试用例（line 4006），describe 层级冗余。
- 建议: 直接使用顶层 `test`，或将相关测试合并到同一 describe。

### [P3] 部分测试名称描述不完整
- 位置: src/model-eexport.test.ts（多处）
- 类型: 风格
- 描述: 部分测试名称未完整描述测试行为，如 "uses fixed cnName for idx/name and filters enName-only cnName in union"（line 1062）中 "filters enName-only cnName" 的含义不够明确。
- 建议: 测试名称应清晰说明"在何种条件下，验证何种行为"。

### [P3] ensureGroup 函数空值检查冗余
- 位置: src/model-eexport.ts:3515-3549
- 类型: 简化
- 描述: `ensureGroup` 函数中多处 `if (!group.xxx && options.xxx)` 检查（line 3533-3547）可用空值合并运算符简化。
- 建议: 使用 `??=` 运算符：
  ```typescript
  group.categoryLibrary ??= options.categoryLibrary;
  group.label ??= options.label;
  ```

---

**审查完成时间**: 2026-08-23  
**审查范围**: model-eexport.ts + model-eexport.test.ts 全量代码  
**审查重点**: 正确性、性能、重复、抽象层次、死代码、风格
