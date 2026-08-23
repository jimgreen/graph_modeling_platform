# H IEEE 模型生成器审查报告

## 概览

| 维度 | 数值 |
|------|------|
| 文件数 | 2 |
| 总行数 | 1705（主文件 1505 + 测试 200） |
| 发现总数 | 18 |
| P0 严重 | 3 |
| P1 重要 | 6 |
| P2 一般 | 5 |
| P3 轻微 | 4 |

---

## P0 严重

### [P0-1] `parseMatrix` 静默返回空数组，解析失败无诊断
- 位置: `scripts/generate-ieee-models.mjs:652-655`
- 类型: 错误处理
- 描述: 当正则未匹配到 `mpc.bus = [...]` 等矩阵时返回 `[]`，后续 `buildProject` 用空 bus 列表生成空 JSON 文件写入磁盘，无任何错误或警告输出。若 MATPOWER 源文件格式变更或网络返回 HTML 错误页，将静默产出 0 节点的空壳文件。
- 建议: 解析后校验关键字段非空，否则抛异常：
  ```js
  function parseMatpowerCase(text) {
    const parsed = { baseMva: ..., bus: ..., gen: ..., branch: ... };
    if (parsed.bus.length === 0) throw new Error("parseMatpowerCase: bus matrix empty");
    return parsed;
  }
  ```

### [P0-2] `takeBusEndpoint` 无 terminal 越界检查，静默降级到 bus 中心
- 位置: `scripts/generate-ieee-models.mjs:1204-1214` + `870-879`
- 类型: bug
- 描述: `takeBusEndpoint` 递增 `nextBusTerminalIndex` 但不校验 `t${index+1}` 是否存在于 bus 的 terminals 数组中。若 `busConnectionCounts` 统计偏低（如 generator/load 在同一 bus 上重复计数但 terminal 数不足），`busTerminalCanvasPoint` 在 line 872 找不到 terminal 时静默返回 `{ ...bus.position }`，导致走线连到 bus 中心而非端子位置，生成视觉错误的 JSON。
- 建议: 增加断言或 fallback 日志：
  ```js
  const terminalId = `t${index + 1}`;
  if (!bus.terminals.find(t => t.id === terminalId)) {
    console.warn(`WARN: ${bus.id} missing ${terminalId}, clamping`);
    // clamp index or throw
  }
  ```

### [P0-3] `round()` 对负值存在系统性偏差
- 位置: `scripts/generate-ieee-models.mjs:676-679`
- 类型: bug
- 描述: `Math.round((value + Number.EPSILON) * factor) / factor` 中 `Number.EPSILON`（≈2.22e-16）加法在负值时使四舍五入方向偏移——例如 `round(-2.55, 1)` 得到 `-2.5` 而非 `-2.6`。坐标系统大量使用此函数（bus 位置、路由点、旋转角度），负坐标区域（IEEE14/39/118 均存在）所有接近中点的值都可能被错误舍入。
- 建议: 使用标准 round-half-up 或直接 `Number(value.toFixed(digits))`：
  ```js
  function round(value, digits = 3) {
    return Number(value.toFixed(digits));
  }
  ```

---

## P1 重要

### [P1-1] ~500 行手工布局数据硬编码在源文件中
- 位置: `scripts/generate-ieee-models.mjs:51-492`
- 类型: 抽象层次
- 描述: IEEE118 的 118 个 bus 坐标（line 52-172）、IEEE14/IEEE39/IEEE118 的完整 manual layout（line 276-492）、generator/load 方向 map（line 175-273）全部作为字面量嵌入 JS 源码。这些纯数据与生成逻辑混杂，修改布局需编辑生成器文件，且占据文件 33% 行数。
- 建议: 将坐标和布局数据拆分为 `data/ieee-layouts/ieee14-layout.json`、`ieee118-layout.json` 等外部文件，运行时 `JSON.parse(readFileSync(...))` 加载。

### [P1-2] IEEE118 generator/load bus 编号列表硬编码且无来源校验
- 位置: `scripts/generate-ieee-models.mjs:37-49`
- 类型: 重复
- 描述: `ieee118GeneratorBusNos`（53 个）和 `ieee118LoadBusNos`（96 个）硬编码为常量数组。这些编号本可从 MATPOWER 数据的 gen/branch 矩阵自动派生（gen 的 busNo 列 = generator buses，pd>0 的 bus = load buses），人工维护容易与实际数据不一致。
- 建议: 从 `parsed.gen` 和 `parsed.bus` 动态提取：
  ```js
  const genBusNos = [...new Set(parsed.gen.map(g => g[genColumns.busNo]))];
  const loadBusNos = parsed.bus
    .filter(b => Math.abs(b[busColumns.pd]) > 1e-9 || Math.abs(b[busColumns.qd]) > 1e-9)
    .map(b => b[busColumns.busNo]);
  ```
  对 IEEE118 方向 map 保留为外部配置。

### [P1-3] `main()` 网络失败导致全量丢失，无增量保存
- 位置: `scripts/generate-ieee-models.mjs:1467-1489`
- 类型: 错误处理
- 描述: `main()` 顺序 fetch 三个 case，若 IEEE118 的 fetch 失败（最后一个），已成功生成的 IEEE14/IEEE39 JSON 已写入磁盘（这是好的），但脚本抛异常退出，`summaries` 不完整且无明确错误提示哪个 case 失败。更重要的是，已写入的文件没有与 summary 对应。
- 建议: 每个 case 独立 try/catch，失败时打印明确错误但继续：
  ```js
  for (const caseDef of cases) {
    try { ... } catch (err) {
      console.error(`FAILED ${caseDef.modelName}: ${err.message}`);
    }
  }
  ```

### [P1-4] generator/load 位置 fallback 使用魔法数字偏移
- 位置: `scripts/generate-ieee-models.mjs:1340-1342`（generator）+ `1381-1382`（load）
- 类型: 风格
- 描述: 当无 manual layout 时，generator 位置用 `busNode.position.x - 132, busNode.position.y - 42 + sameBusIndex * 72`，load 用 `+124, +74`。这些数字无命名常量、无注释说明物理含义（像素偏移？与 bus 尺寸关系？），修改 bus 尺寸时需同步调整。
- 建议: 提取为命名常量并注释：
  ```js
  const GEN_OFFSET_X = -132;
  const GEN_OFFSET_Y_BASE = -42;
  const GEN_SAME_BUS_SPACING = 72;
  const LOAD_OFFSET_X = 124;
  const LOAD_OFFSET_Y = 74;
  ```

### [P1-5] `fetchCase` 不校验响应内容，可能解析 HTML 错误页
- 位置: `scripts/generate-ieee-models.mjs:1448-1465`
- 类型: 错误处理
- 描述: `response.ok` 仅检查 HTTP 状态码，但 GitHub raw 在某些情况下（CDN 故障、region 限制）可能返回 200 + HTML 错误页。`parseMatpowerCase` 会解析此 HTML 并返回空矩阵（回到 P0-1 的问题）。
- 建议: 增加 Content-Type 校验或响应体关键词检查：
  ```js
  const text = await response.text();
  if (!text.includes("mpc")) throw new Error("Response is not a MATPOWER case file");
  return text;
  ```

### [P1-6] `shouldUseTransformer` 对 tap=0 的处理依赖 MATPOWER 约定但未注释
- 位置: `scripts/generate-ieee-models.mjs:918-924`
- 类型: 风格
- 描述: MATPOWER 中 `tap=0` 表示非变压器（输电线路），代码用 `branch[branchColumns.tap] || 0` 将 0 保持为 0，然后 `Math.abs(tap) > 1e-9` 正确排除。但这个关键约定没有任何注释，未来维护者可能误以为 `tap=0` 是异常值并修改逻辑。
- 建议: 添加注释说明 MATPOWER 约定：
  ```js
  // MATPOWER convention: tap=0 means transmission line (not transformer)
  // tap=1.0 means transformer at nominal ratio
  const tap = branch[branchColumns.tap] || 0;
  ```

---

## P2 一般

### [P2-1] 测试覆盖严重不足——3 个 test 覆盖 1505 行代码
- 位置: `scripts/generate-ieee-models.test.mjs:86-200`
- 类型: 重复
- 描述: 仅 3 个测试用例：多分支 terminal 分配、directional device 旋转、manual anchor 转换。以下关键函数完全无测试：`parseMatpowerCase`、`parseMatrix`、`parseScalar`、`shouldUseTransformer`、`computeBusLayout`、`buildOrthogonalRoutePoints`、`normalizeRoutePoints`、`enforceStartBusPerpendicular`、`enforceEndBusPerpendicular`、`round`、`numericText`。
- 建议: 至少补充以下测试组：
  1. `parseMatpowerCase` — 正常 .m 文件 + 异常输入（空字符串、HTML、缺字段）
  2. `shouldUseTransformer` — tap≠0、shift≠0、baseKv 不同、全为 0
  3. `buildOrthogonalRoutePoints` — 共线、对角线、带 via 点
  4. `round` / `numericText` — 负值、零值、NaN、Infinity

### [P2-2] `branchPairCounts` 和 `branchPairIndexes` 重复计算 pairKey
- 位置: `scripts/generate-ieee-models.mjs:1216-1235`
- 类型: 效率
- 描述: line 1217-1220 遍历 `activeBranches` 计算 `branchPairCounts`（key = sorted pair），line 1223+ 的 `forEach` 又对每条 branch 计算 `pairKey = [from, to].sort().join("-")`。两次 `sort().join()` 完全相同，可合并为一次遍历。
- 建议: 将 `branchPairCounts` 计算与后续 forEach 合并，或预计算 pairKey 存入 branch 元数据。

### [P2-3] `componentCounts` 用两个 `filter` 重复遍历 `activeBranches`
- 位置: `scripts/generate-ieee-models.mjs:1407-1421`
- 类型: 效率
- 描述: `ACBranch` 和 `ACTransformer` 计数各用一次 `filter()`，每次都重新查 `busByNo.get` 和调用 `shouldUseTransformer`。可合并为单次遍历。
- 建议:
  ```js
  let lineCount = 0, xfCount = 0;
  for (const branch of activeBranches) {
    const fb = busByNo.get(branch[branchColumns.fromBus]);
    const tb = busByNo.get(branch[branchColumns.toBus]);
    if (fb && tb) {
      if (shouldUseTransformer(branch, fb, tb)) xfCount++;
      else lineCount++;
    }
  }
  ```

### [P2-4] `computeBusLayout` 的 Fruchterman-Reingold 布局无种子注释，迭代次数硬编码
- 位置: `scripts/generate-ieee-models.mjs:721-803`
- 类型: 风格
- 描述: Force-directed 布局算法的迭代次数（`n > 80 ? 420 : 520`，line 751）、冷却系数（`0.985`，line 789）、力常数（`k * 1.55`，line 774）均为魔法数字，无注释解释调参依据。种子来自 `caseDef.modelName.replace(/\D/gu, "")`（line 1157），将 "IEEE14" → 14，也无注释。
- 建议: 提取为命名常量并简要注释算法来源和调参理由。

### [P2-5] 导出的参数名常量与模块内部使用的变量同名但来源不同
- 位置: `scripts/generate-ieee-models.mjs:1492-1501`
- 类型: 抽象层次
- 描述: 模块底部导出了 7 个 routable line 参数名常量（`routableLinePointsParam` 等），测试文件 import 这些常量做断言。但模块内部这些常量在 line 9-15 定义为 `const`，且没有 `export` 关键字——它们通过底部 export 块导出。这种模式可行但不直观，新开发者可能找不到 export 声明。
- 建议: 在常量声明处直接 `export const routableLinePointsParam = ...` 或在 export 块旁添加注释指向定义位置。

---

## P3 轻微

### [P3-1] `cases` 数组中的 `url` 字段指向 MATPOWER master 分支，无版本锁定
- 位置: `scripts/generate-ieee-models.mjs:19-35`
- 类型: 风格
- 描述: URL 使用 `master` 分支（如 `https://raw.githubusercontent.com/MATPOWER/matpower/master/data/case14.m`），若上游重命名分支或文件结构变更将静默失败。
- 建议: 锁定到特定 tag/commit SHA（如 `v7.1`）。

### [P3-2] `generatorTerminalAnchor` 和 `loadTerminalAnchor` 定义为模块级常量但仅 2 处使用
- 位置: `scripts/generate-ieee-models.mjs:16-17`
- 类型: 死代码
- 描述: 这两个常量仅在 `manualLayouts` 的 IEEE118 配置中通过 `directionalDevicePositions` 间接使用，且 `loadTerminalAnchor` 同时作为 `directionalDevicePositions` 的默认参数和 `makeLoadTerminal` 的默认参数（line 1077），但 `makeLoadTerminal` 的调用处都显式传入了 anchor。
- 建议: 检查 `makeLoadTerminal` 默认参数是否冗余，若是则移除。

### [P3-3] 测试辅助函数 `busTerminalPoint` 与主文件 `busTerminalCanvasPoint` 逻辑重复
- 位置: `scripts/generate-ieee-models.test.mjs:24-31` vs `scripts/generate-ieee-models.mjs:870-879`
- 类型: 重复
- 描述: 测试中的 `busTerminalPoint` 重新实现了 `busTerminalCanvasPoint` 的逻辑（terminal anchor → world coordinate），但计算方式略有不同（测试版不处理 terminal 缺失情况）。若主文件逻辑变更，测试不会自动跟随。
- 建议: 从主文件额外导出 `busTerminalCanvasPoint` 供测试复用。

### [P3-4] `seededRandom` 使用自定义 PRNG 而非 `Math.seedrandom` 或确定性种子
- 位置: `scripts/generate-ieee-models.mjs:688-697`
- 类型: 风格
- 描述: 自定义 32-bit hash-based PRNG 足够用于布局抖动，但无注释说明算法来源（看起来是 MurmurHash3 的 finalizer 变体），且函数名 `seededRandom` 未暗示其非加密性质。
- 建议: 添加单行注释标注算法来源，如 `// MurmurHash3 fmix32-based deterministic PRNG`。
