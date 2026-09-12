# 后端导出（E / SVG / CIM-XML）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 E 文件、SVG、CIM/XML 三种导出的计算逻辑统一到后端运行（Node 原生 TypeScript 直接加载前端 `.ts` 源码，零构建产物），新增/改造 `/webgrp/v1/schemes/model/*` 端点，前端导出按钮改为「先保存 → 请求后端 → 保存文件」。

**Architecture:** 纯计算模块抽到 `src/export/`（JSX-free，Node 可直载），原文件保留 `export *` re-export；`server/*Export.mjs` 适配层负责注入 `localStorage` 桩、读磁盘、调纯函数、编码响应；前端只保留 UI 与落盘。

**Tech Stack:** Node v24.19（原生 type stripping）、TypeScript 5.9.3、React 19、Vite 7、Vitest 3、`iconv-lite`、`adm-zip`。

**Spec:** `docs/superpowers/specs/2026-09-11-backend-export-e-svg-cim-design.md`

## Global Constraints

- **Node 版本底线 v24**：后端直接 `import` `.ts`，依赖 Node 原生 type stripping（本机实测 v24.19.0 通过）。
- **零构建产物**：不打包、不生成 `server/generated/*`、不改 `pnpm build` 流程。
- **不新增依赖**：只允许使用 `package.json` 已有依赖（含 `iconv-lite`、`typescript`、`adm-zip`）。
- **纯模块 import 必须带 `.ts` 扩展名**：Node ESM 不做扩展名补全；`tsconfig.json` 需 `allowImportingTsExtensions: true` + `erasableSyntaxOnly: true`。
- **`src/export/**` 运行时闭包内 0 个 `.tsx`、0 个 `enum` / `namespace`、0 个 `import.meta.env`**。
- **E 文件默认 GBK**；SVG / CIM 固定 UTF-8。
- **端点前缀统一走 `apiPattern()` / `apiPath()`**，不得硬编码 `/webgrp`。
- **测试命令**：`pnpm vitest run <路径>`；类型检查 `pnpm tsc --noEmit`。
- **每个 Task 结束必须 commit**，commit message 用 conventional 前缀。

---

## File Structure

**新建**

| 路径 | 职责 |
|------|------|
| `src/export/device-definition-shared.ts` | 设备定义共享身份/键推导（15 个纯声明），无 React |
| `src/export/e-file.ts` | E 导出选项构建 + 模板套用（31 个纯声明），无 React |
| `src/export/svg.ts` | `buildSvgDocument` 及其 7 个私有 helper，无 React |
| `src/export/device-definition-shared.test.ts` | 上述 1 的单测 |
| `src/export/e-file.test.ts` | 上述 2 的单测 |
| `src/export/svg.test.ts` | 上述 3 的单测 |
| `src/export/svg.golden.test.ts` | SVG 输出基线（转换前后逐字节一致） |
| `src/export/fixtures/svg-baseline.ts` | golden 用的固定模型 fixture |
| `scripts/jsx-to-create-element.mjs` | 一次性 codemod：JSX → `createElement`，保留类型与注释 |
| `server/domShim.mjs` | Node 侧 `localStorage` 桩 |
| `server/eFileTemplates.mjs` | 预定义 E 模板名 → 文件名映射（runtime 与 schemes 共用） |
| `server/eFileExport.mjs` | E 适配层：读磁盘 + 调 `src/export/e-file.ts` |
| `server/cimExport.mjs` | CIM 适配层：读磁盘 + 调 `src/cim/cim-export.ts` |
| `server/svgExport.mjs` | SVG 适配层：读磁盘 + 调 `src/export/svg.ts` |
| `server/exportRuntime.test.mjs` / `server/svgExport.test.mjs` / `server/cimExport.test.mjs` | Node 直载 `.ts` 冒烟 + 纯函数断言（E 侧另加 `apiV1Schemes.e-file.test.mjs` 端点集成测试） |

**修改**

| 路径 | 改动 |
|------|------|
| `src/appExtracted/appDeviceDefinitionEInterface.ts` | 迁出 31 声明，保留 `export *` re-export |
| `src/customDeviceUtils.ts` | 迁出 15 声明到 `device-definition-shared.ts`，保留 re-export |
| `src/appExtracted/appPersistenceLibraryExport.tsx` | 迁出 `buildSvgDocument` 等 8 声明，保留 re-export |
| `src/DeviceGlyph.tsx` → `src/DeviceGlyph.ts` | 去 JSX，改后缀 |
| `src/staticRenderUtils.tsx` → `src/staticRenderUtils.ts` | 去 JSX，改后缀 |
| `src/model.ts` 及其运行时闭包（约 13 个 `.ts`） | 相对 import 补 `.ts` 扩展名 |
| `tsconfig.json` | `allowImportingTsExtensions` + `erasableSyntaxOnly` |
| `server/apiV1Schemes.mjs` | 新增 3 个 handler + 3 条路由 |
| `server/apiV1Runtime.mjs` | 预定义模板映射改为从 `eFileTemplates.mjs` 导入 |
| `server/swaggerPage.mjs` | 新增/更新端点元数据与示例 |
| 前端 `appDeviceDefinitionFactories.tsx` / `appRenderBatch.tsx` | 导出动作改走后端 |

---

## Phase 1 — 基建与 E 文件后端化

### Task 1: 抽离 `src/export/device-definition-shared.ts`

`src/export/e-file.ts` 需要 `deviceDefinitionSharedKeyForTemplate` 与 `normalizeSharedDeviceDefinitionOverrides`，但 `src/customDeviceUtils.ts` 的运行时闭包是 85 文件 / 31 `.tsx`。先把这组纯逻辑摘出来。

**Files:**
- Create: `src/export/device-definition-shared.ts`
- Create: `src/export/device-definition-shared.test.ts`
- Modify: `src/customDeviceUtils.ts`

**Interfaces:**
- Consumes: `cloneDeviceMeasurementDefinitions`（`src/measurementDefinitionTypes.ts`，已有纯函数）
- Produces: `deviceDefinitionSharedKeyForTemplate(template)`, `normalizeSharedDeviceDefinitionOverrides(overrides, templates)`, `resolveTemplateComponentLibrary(template)`, `deviceDefinitionKeyForTemplate(template)`, `fallbackComponentLibraryForCategoryLibrary(...)`, `deviceDefinitionSharedIdentityForTemplate(defaults)` 等 15 个声明

- [ ] **Step 1: 写失败测试**

创建 `src/export/device-definition-shared.test.ts`：

```ts
import { describe, expect, test } from "vitest";
import * as shared from "./device-definition-shared";
import * as legacy from "../customDeviceUtils";

describe("src/export/device-definition-shared", () => {
  test("导出迁移后的关键函数", () => {
    expect(typeof shared.deviceDefinitionSharedKeyForTemplate).toBe("function");
    expect(typeof shared.normalizeSharedDeviceDefinitionOverrides).toBe("function");
    expect(typeof shared.resolveTemplateComponentLibrary).toBe("function");
    expect(typeof shared.deviceDefinitionKeyForTemplate).toBe("function");
  });

  test("customDeviceUtils 保持同一引用（不产生第二份实现）", () => {
    expect(legacy.deviceDefinitionSharedKeyForTemplate).toBe(shared.deviceDefinitionSharedKeyForTemplate);
    expect(legacy.normalizeSharedDeviceDefinitionOverrides).toBe(shared.normalizeSharedDeviceDefinitionOverrides);
    expect(legacy.resolveTemplateComponentLibrary).toBe(shared.resolveTemplateComponentLibrary);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/export/device-definition-shared.test.ts`
Expected: FAIL — `Failed to resolve import "./device-definition-shared"`

- [ ] **Step 3: 迁移声明**

新建 `src/export/device-definition-shared.ts`，从 `src/customDeviceUtils.ts` **整段剪切**下列 15 个顶层声明（保留其上方注释）：

```
BUILT_IN_DEVICE_TEMPLATE_BY_KIND, SHARED_DEFINITION_METADATA_PARAM_NAMES,
concreteDeviceDefinitionParams, deviceDefinitionKeyForTemplate,
deviceDefinitionSharedIdentityForTemplate, deviceDefinitionSharedKeyForTemplate,
fallbackComponentLibraryForCategoryLibrary, isConcreteDeviceDefinitionParamName,
latestDefinitionSource, normalizeSharedDeviceDefinitionOverrides,
overrideTimestamp, preferredDefinitionSource,
resolveTemplateComponentLibrary, sharedDefinitionParams, visualOnlyOverride
```

新文件顶部 import（唯一外部依赖，已实测）：

```ts
import { cloneDeviceMeasurementDefinitions } from "../measurementDefinitionTypes";
import type { DeviceTemplate } from "./../model";
```

> 若 `tsc` 报其他未定义符号，用 `pnpm tsc --noEmit` 的报错逐个补齐 import —— **不要**从 `customDeviceUtils.ts` 反向 import（会造成循环）。

在 `src/customDeviceUtils.ts` 中删除已迁走的声明，并在文件顶部加：

```ts
export * from "./export/device-definition-shared";
```

- [ ] **Step 4: 运行确认通过 + 全量回归**

Run: `pnpm vitest run src/export/device-definition-shared.test.ts`
Expected: PASS（2 个用例）

Run: `pnpm vitest run src/customDeviceUtils src/definitionInstanceSync src/appDeviceDefinitionFactories`
Expected: 全绿（迁移不得改变行为）

Run: `pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 验证闭包已无 `.tsx`**

Run:
```bash
node -e "const fs=require('fs'),path=require('path');const seen=new Set();const rs=(f,s)=>{if(!s.startsWith('.'))return null;const b=path.resolve(path.dirname(f),s);for(const c of [b,b+'.ts',b+'.tsx',b+'.mjs'])if(fs.existsSync(c)&&fs.statSync(c).isFile())return c;return null};const w=f=>{f=path.resolve(f);if(seen.has(f))return;seen.add(f);const t=fs.readFileSync(f,'utf8');const re=/import\s+(?!type\s)[\s\S]{0,300}?from\s+[\"']([^\"']+)[\"']/g;let m;while((m=re.exec(t))){const r=rs(f,m[1]);if(r)w(r)}};w('src/export/device-definition-shared.ts');const tsx=[...seen].filter(f=>f.endsWith('.tsx'));console.log('files',seen.size,'tsx',tsx.length,tsx)"
```
Expected: `files <n> tsx 0`

- [ ] **Step 6: Commit**

```bash
git add src/export/device-definition-shared.ts src/export/device-definition-shared.test.ts src/customDeviceUtils.ts
git commit -m "refactor(export): 抽出 device-definition-shared 纯模块（去 React 依赖）"
```

---

### Task 2: 抽离 `src/export/e-file.ts`

**Files:**
- Create: `src/export/e-file.ts`
- Create: `src/export/e-file.test.ts`
- Modify: `src/appExtracted/appDeviceDefinitionEInterface.ts`

**Interfaces:**
- Consumes: Task 1 的 `deviceDefinitionSharedKeyForTemplate` / `normalizeSharedDeviceDefinitionOverrides`
- Produces:
  - `buildEFileExportOptionsFromLibrary(options): { interfaceDefinitions: EDeviceInterfaceDefinition[]; eDeviceDefinitionLabels; eDeviceDefinitionTemplateFields; eDeviceDefinitionTableIds }`
  - `applyEDeviceDefinitionSectionsToLibraryState(options): { eDeviceDefinitionLabels; eDeviceDefinitionClassExportEnabled; eDeviceDefinitionFieldOrder; eDeviceDefinitionTemplateFields; eDeviceDefinitionTableIds }`

- [ ] **Step 1: 写失败测试**

创建 `src/export/e-file.test.ts`：

```ts
import { describe, expect, test } from "vitest";
import { applyEDeviceDefinitionSectionsToLibraryState, buildEFileExportOptionsFromLibrary } from "./e-file";
import * as legacy from "../appExtracted/appDeviceDefinitionEInterface";

describe("src/export/e-file", () => {
  test("旧路径 re-export 保持同一引用", () => {
    expect(legacy.buildEFileExportOptionsFromLibrary).toBe(buildEFileExportOptionsFromLibrary);
    expect(legacy.applyEDeviceDefinitionSectionsToLibraryState).toBe(applyEDeviceDefinitionSectionsToLibraryState);
  });

  test("空输入返回空 override 映射", () => {
    const options = buildEFileExportOptionsFromLibrary({ libraryTemplates: [], labels: {} });
    expect(options.eDeviceDefinitionLabels).toEqual({});
    expect(options.eDeviceDefinitionTemplateFields).toEqual({});
    expect(options.eDeviceDefinitionTableIds).toEqual({});
    expect(options.interfaceDefinitions).toEqual([]);
  });

  test("独立运行时段（aclineend）按 sectionKind 注入表号与字段", () => {
    const options = buildEFileExportOptionsFromLibrary({
      libraryTemplates: [],
      labels: {},
      eDeviceDefinitionTemplateFields: { aclineend: [{ exportName: "idx", cnName: "序号" }] },
      eDeviceDefinitionTableIds: { aclineend: "aclineend_table" }
    });
    const section = options.interfaceDefinitions.find((row: any) => row.componentLibrary === "aclineend");
    expect(section).toBeTruthy();
    expect(section.tableId).toBe("aclineend_table");
    expect(section.fields.map((field: any) => field.exportName)).toEqual(["idx"]);
  });

  test("空模板 sections 时套用不产生 override", () => {
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: [],
      customDeviceTemplates: [],
      libraryTemplates: [],
      deviceDefinitionOverrides: {},
      eDeviceDefinitionLabels: {},
      eDeviceDefinitionClassExportEnabled: {},
      eDeviceDefinitionFieldOrder: {},
      eDeviceDefinitionTemplateFields: {},
      labels: {}
    });
    expect(result.eDeviceDefinitionLabels).toEqual({});
    expect(result.eDeviceDefinitionFieldOrder).toEqual({});
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/export/e-file.test.ts`
Expected: FAIL — `Failed to resolve import "./e-file"`

- [ ] **Step 3: 迁移声明**

新建 `src/export/e-file.ts`，从 `src/appExtracted/appDeviceDefinitionEInterface.ts` **整段剪切**下列 31 个顶层声明：

```
E_DEVICE_INTERFACE_DERIVED_BASE_FIELD_NAMES, E_DEVICE_INTERFACE_DERIVED_BASE_ONLY_FIELD_NAMES,
E_DEVICE_INTERFACE_DISPLAY_FIXED_FIELDS, E_DEVICE_INTERFACE_FIXED_FIELD_NAMES,
E_DEVICE_INTERFACE_MEASUREMENT_FIELD_NAMES, E_DEVICE_INTERFACE_TOPOLOGY_FIELD_NAMES,
RUNTIME_GENERATED_SECTIONS, RUNTIME_GENERATED_STANDALONE_SECTIONS,
appendUniqueFields, applyEDeviceDefinitionSectionsToLibraryState, applyEDeviceInterfaceFieldOrder,
buildEDeviceInterfaceDefinitionRows, buildEFileExportOptionsFromLibrary,
deviceDefinitionComplianceKey, eDeviceDefinitionTableIdsFromSections,
eDeviceInterfaceComponentLibraryForTemplate, eDeviceInterfaceDerivedFieldOrder,
eDeviceInterfaceDerivedFields, eDeviceInterfaceDisplayCoreFieldName,
eDeviceInterfaceFieldCnName, eDeviceInterfaceFieldOrderForRow,
eDeviceInterfaceIsDerivedBaseField, eDeviceInterfaceIsDerivedBaseOnlyField,
eDeviceInterfaceOrderFieldName, eDeviceInterfacePatchesForRow,
eDeviceInterfaceRelationKey, eDeviceInterfaceSectionByComponentLibrary,
ensureEDeviceInterfaceParentBeforeDevType, orderEDeviceInterfaceFields,
resolveComponentLibrary, templateFieldToDeviceSourceName
```

新文件顶部 import（已实测，**无任何 `.tsx` 来源**）：

```ts
import {
  E_SECTION_COLUMNS,
  electricGenerationDerivedComponentLibraryInfo,
  inferESection,
  resolveDeviceParameterDefinitionExportSettings,
  resolveEffectiveTemplateParameterDefinitionGroups,
  resolveEffectiveTemplateParameterDefinitions,
  templateDerivedComponentLibraryInfo
} from "../model";
import {
  deviceDefinitionSharedKeyForTemplate,
  normalizeSharedDeviceDefinitionOverrides
} from "./device-definition-shared";
```

在 `src/appExtracted/appDeviceDefinitionEInterface.ts` 顶部加：

```ts
export * from "../export/e-file";
```

> 迁移后该文件**必须删掉** `from "../stateIconDrawing"`、`from "./appGraphMeasurementFactories"`、`from "../customDeviceUtils"` 三个 import —— 它们既不在 31 声明内、也是死导入（实测 `stateIconSvgVisibleViewBox` / `decodeSvgImageSource` / `buildMeasurementProfilePositionDefinitions` / `measurementProfileItemsComplianceMessage` / `clampNumber` 在该文件从未被使用）。删完 `pnpm tsc --noEmit` 会告诉你还有哪些确实在用，按报错保留即可。

- [ ] **Step 4: 运行确认通过 + 全量回归**

Run: `pnpm vitest run src/export/e-file.test.ts`
Expected: PASS（4 个用例）

Run: `pnpm vitest run`
Expected: 全绿（迁移不得改变任何行为）

Run: `pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 验证闭包已无 `.tsx`**

Run（把 Task 1 Step 5 的脚本入口换成 `src/export/e-file.ts`）:
```bash
node -e "const fs=require('fs'),path=require('path');const seen=new Set();const rs=(f,s)=>{if(!s.startsWith('.'))return null;const b=path.resolve(path.dirname(f),s);for(const c of [b,b+'.ts',b+'.tsx',b+'.mjs'])if(fs.existsSync(c)&&fs.statSync(c).isFile())return c;return null};const w=f=>{f=path.resolve(f);if(seen.has(f))return;seen.add(f);const t=fs.readFileSync(f,'utf8');const re=/import\s+(?!type\s)[\s\S]{0,300}?from\s+[\"']([^\"']+)[\"']/g;let m;while((m=re.exec(t))){const r=rs(f,m[1]);if(r)w(r)}};w('src/export/e-file.ts');const tsx=[...seen].filter(f=>f.endsWith('.tsx'));console.log('files',seen.size,'tsx',tsx.length,tsx)"
```
Expected: `tsx 0`

- [ ] **Step 6: Commit**

```bash
git add src/export/e-file.ts src/export/e-file.test.ts src/appExtracted/appDeviceDefinitionEInterface.ts
git commit -m "refactor(export): 抽出 e-file 纯模块（E 导出选项与模板套用）"
```

---

### Task 3: 打通 Node 原生 TS 通路

**Files:**
- Modify: `tsconfig.json`
- Modify: `src/model.ts` 及其运行时闭包内所有 `.ts` 的相对 import
- Create: `server/domShim.mjs`
- Create: `server/exportRuntime.test.mjs`

**Interfaces:**
- Consumes: Task 2 的 `src/export/e-file.ts`
- Produces: `installDomShim()`（`server/domShim.mjs` 导出）；后端从此可直接 `import "../src/export/e-file.ts"`

- [ ] **Step 1: 写失败测试**

创建 `server/exportRuntime.test.mjs`：

```js
import { describe, expect, test } from "vitest";
import { installDomShim } from "./domShim.mjs";

installDomShim();

describe("Node 直载前端 E 导出源码", () => {
  test("可直接 import src/export/e-file.ts 并构建选项", async () => {
    const mod = await import("../src/export/e-file.ts");
    expect(typeof mod.buildEFileExportOptionsFromLibrary).toBe("function");
    const options = mod.buildEFileExportOptionsFromLibrary({ libraryTemplates: [], labels: {} });
    expect(options.interfaceDefinitions).toEqual([]);
  });

  test("可直接 import src/model-eexport.ts 并生成 E 文本", async () => {
    const { buildEFileExport } = await import("../src/model-eexport.ts");
    const project = {
      name: "探针模型",
      canvasWidth: 1920,
      canvasHeight: 1024,
      powerBaseValue: 100,
      voltageUnit: "kV",
      powerUnit: "MW",
      currentUnit: "kA",
      nodes: [
        {
          id: "n1",
          kind: "busbar",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 20 },
          params: { name: "母线1", vbase: "10" },
          terminals: []
        }
      ],
      edges: []
    };
    const out = buildEFileExport(project, ["默认方案"]);
    expect(out.filename).toBe("探针模型.e");
    expect(out.text).toContain("<Model>");
    expect(out.text).toContain("<basevoltage>");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run server/exportRuntime.test.mjs`
Expected: FAIL — `Cannot find module './domShim.mjs'`

- [ ] **Step 3: 建 domShim + 改 tsconfig**

创建 `server/domShim.mjs`：

```js
// Node 侧浏览器 API 桩：src/model.ts 的 readVoltageLevelSettings 读 localStorage。
// 必须在任何 src/**/*.ts 被 import 之前执行（函数级访问，模块顶层调用 installDomShim() 即可）。
const memory = new Map();

export function installDomShim() {
  if (globalThis.localStorage) {
    return;
  }
  globalThis.localStorage = {
    getItem: (key) => (memory.has(String(key)) ? memory.get(String(key)) : null),
    setItem: (key, value) => {
      memory.set(String(key), String(value));
    },
    removeItem: (key) => {
      memory.delete(String(key));
    },
    clear: () => {
      memory.clear();
    },
    key: (index) => [...memory.keys()][Number(index)] ?? null,
    get length() {
      return memory.size;
    }
  };
}
```

修改 `tsconfig.json` 的 `compilerOptions`，加入两行（`noEmit: true` 已存在，`allowImportingTsExtensions` 合法）：

```jsonc
"allowImportingTsExtensions": true,
"erasableSyntaxOnly": true
```

- [ ] **Step 4: 给运行时闭包补 `.ts` 扩展名**

对 `src/export/e-file.ts` 的运行时闭包内每个文件，把**相对 import 的路径**加上 `.ts` 扩展名。已知需改的文件（`src/` 下）：

```
model.ts, model-eexport.ts, model-canvas-ops.ts, model-node-ops.ts, model-routing.ts,
measurements.ts, measurementDefinitionTypes.ts, canvasViewport.ts, imageFit.ts,
formatUtils.ts, deviceVisualParams.ts, deviceParameterChineseNames.ts
```

以及 `src/export/` 下的 `e-file.ts`、`device-definition-shared.ts`（含 `from "../measurementDefinitionTypes"` → `"../measurementDefinitionTypes.ts"`）。

规则：`from "./model"` → `from "./model.ts"`；`from "../../shared/randomId.mjs"` **保持不变**（已是 `.mjs`）；`import type` 语句可不改（类型导入被整体擦除），但改了也无害。

改完逐层验证（每报一次 `ERR_MODULE_NOT_FOUND` 就补一处）：

```bash
node -e "import('./src/export/e-file.ts').then(m=>console.log('ok',typeof m.buildEFileExportOptionsFromLibrary))"
```
Expected: `ok function`

- [ ] **Step 5: 运行确认通过**

Run: `pnpm vitest run server/exportRuntime.test.mjs`
Expected: PASS（2 个用例）

Run: `pnpm tsc --noEmit`
Expected: 无错误

Run: `pnpm vitest run`
Expected: 全绿

- [ ] **Step 6: 验证前端构建未被 `.ts` 扩展名影响**

Run: `pnpm build`
Expected: 构建成功（Vite 能解析显式 `.ts` 扩展名）

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json server/domShim.mjs server/exportRuntime.test.mjs src/model.ts src/model-eexport.ts src/model-canvas-ops.ts src/model-node-ops.ts src/model-routing.ts src/measurements.ts src/measurementDefinitionTypes.ts src/canvasViewport.ts src/imageFit.ts src/formatUtils.ts src/deviceVisualParams.ts src/deviceParameterChineseNames.ts
git commit -m "feat(server): 打通 Node 原生 TS 通路（.ts 扩展名 + localStorage 桩）"
```

---

### Task 4: 抽 `server/eFileTemplates.mjs`

**Files:**
- Create: `server/eFileTemplates.mjs`
- Modify: `server/apiV1Runtime.mjs:16-32`
- Modify: `server/apiV1Runtime.test.mjs`（仅在断言路径变化时）

**Interfaces:**
- Produces: `PREDEFINED_E_DEVICE_TEMPLATES`（`{"国网E格式":"sgcc.e", ...}`）、`E_TEMPLATE_DIR`、`readPredefinedTemplateBase64(name)`

- [ ] **Step 1: 写失败测试**

新建 `server/eFileTemplates.test.mjs`：

```js
import { describe, expect, test } from "vitest";
import { E_TEMPLATE_DIR, PREDEFINED_E_DEVICE_TEMPLATES, readPredefinedTemplateBase64 } from "./eFileTemplates.mjs";

describe("eFileTemplates", () => {
  test("暴露 4 个预定义模板", () => {
    expect(Object.keys(PREDEFINED_E_DEVICE_TEMPLATES).sort()).toEqual(
      ["台区实时库", "国网E格式", "主网实时库", "配网实时库"].sort()
    );
  });

  test("模板目录指向 public/e-templates/", () => {
    expect(E_TEMPLATE_DIR.replace(/\\/g, "/")).toMatch(/public\/e-templates\/$/);
  });

  test("可读出 GBK/UTF-8 模板的 base64", async () => {
    const base64 = await readPredefinedTemplateBase64("国网E格式");
    expect(typeof base64).toBe("string");
    expect(base64.length).toBeGreaterThan(0);
  });

  test("未知模板名抛错", async () => {
    await expect(readPredefinedTemplateBase64("不存在的模板")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run server/eFileTemplates.test.mjs`
Expected: FAIL — `Failed to resolve import "./eFileTemplates.mjs"`

- [ ] **Step 3: 实现**

创建 `server/eFileTemplates.mjs`（内容取自 `server/apiV1Runtime.mjs:16-32`）：

```js
// 预定义 E 文件接口模板（public/e-templates/ 下文件）。
// 供 v1/runtime/e-file（经前端计算）与 v1/schemes/model/e-file（后端计算）共用。
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const PREDEFINED_E_DEVICE_TEMPLATES = {
  "国网E格式": "sgcc.e",
  "主网实时库": "ems_rtdb.e",
  "配网实时库": "dms_rtdb.e",
  "台区实时库": "taiqu_rtdb.e"
};

// 模板文件目录（server/../public/e-templates/）
export const E_TEMPLATE_DIR = fileURLToPath(new URL("../public/e-templates/", import.meta.url));

// 读预定义模板文件 → base64。模板可能为 UTF-8 或 GBK 编码，base64 透传原始字节，由消费方 decodeAuto 兼容解码。
export async function readPredefinedTemplateBase64(templateName) {
  const file = PREDEFINED_E_DEVICE_TEMPLATES[templateName];
  if (!file) {
    throw new Error(`未知模板：${templateName}`);
  }
  const buffer = await readFile(`${E_TEMPLATE_DIR}${file}`);
  return buffer.toString("base64");
}
```

修改 `server/apiV1Runtime.mjs`：删除第 16–32 行的本地定义，改为顶部：

```js
import { PREDEFINED_E_DEVICE_TEMPLATES, readPredefinedTemplateBase64 } from "./eFileTemplates.mjs";
```

`handleV1RuntimeEFile` 内对 `readPredefinedTemplateBase64` 的调用保持不变。

- [ ] **Step 4: 运行确认通过 + 回归**

Run: `pnpm vitest run server/eFileTemplates.test.mjs server/apiV1Runtime.test.mjs`
Expected: 全绿

- [ ] **Step 5: Commit**

```bash
git add server/eFileTemplates.mjs server/eFileTemplates.test.mjs server/apiV1Runtime.mjs
git commit -m "refactor(server): 预定义 E 模板映射抽到 eFileTemplates 供 runtime/schemes 共用"
```

---

### Task 5: E 文件后端端点

**Files:**
- Create: `server/eFileExport.mjs`
- Create: `server/apiV1Schemes.e-file.test.mjs`
- Modify: `server/apiV1Schemes.mjs`

**Interfaces:**
- Consumes: Task 2 `src/export/e-file.ts`、Task 3 `server/domShim.mjs`、Task 4 `server/eFileTemplates.mjs`、既有 `readSchemeProjectRecord` / `readDeviceLibraryConfig` / `readMeasurementConfig` / `parseSchemePathParam` / `requireSchemePath` / `sendV1Error`
- Produces: `handleV1ModelEFile({ url, response })`、`handleV1ModelEFilePost({ request, response, url })`；路由 `GET|POST /v1/schemes/model/e-file`

- [ ] **Step 1: 写失败测试**

创建 `server/apiV1Schemes.e-file.test.mjs`。**测试骨架必须沿用仓库既有写法**（见 `server/apiV1Schemes.test.mjs`：`createImageServer({ port: 0, host: "127.0.0.1" })` 直接返回 http server，用 `server.address().port` 取端口，`afterEach` 用 `server.close(resolve)` 关闭；该文件注释已说明 `schemeDataDir` 是模块级、无法注入 tmpdir，所以集成测试打 repo 真实 `data/`）：

```js
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import iconv from "iconv-lite";
import { createImageServer } from "./server.mjs";

let server;
let baseUrl;

beforeEach(async () => {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

const schemePath = encodeURIComponent(JSON.stringify(["默认方案"]));

describe("GET /webgrp/v1/schemes/model/e-file", () => {
  test("缺 schemePath → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}/webgrp/v1/schemes/model/e-file?name=x`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad-request");
  });

  test("未知模板 → 400 且列出可用模板", async () => {
    const res = await fetch(
      `${baseUrl}/webgrp/v1/schemes/model/e-file?schemePath=${schemePath}&name=任意&template=不存在的模板`
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("国网E格式");
  });

  test("模型不存在 → 404 not-found", async () => {
    const res = await fetch(
      `${baseUrl}/webgrp/v1/schemes/model/e-file?schemePath=${schemePath}&name=不存在的模型调试用`
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not-found");
  });

  test("encoding 非法 → 400", async () => {
    const res = await fetch(
      `${baseUrl}/webgrp/v1/schemes/model/e-file?schemePath=${schemePath}&name=任意&encoding=big5`
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("encoding");
  });
});

describe("E 文件 GBK 编码", () => {
  test("编码回环：GBK 字节可无损解回中文", () => {
    const text = "<Model>\n@ path name\n# 默认方案 测试模型\n</Model>\n";
    expect(iconv.decode(iconv.encode(text, "gbk"), "gbk")).toBe(text);
  });
});
```

> 若 repo `data/schemes` 下存在可用方案与模型，再补一条 200 用例：请求后
> `const bytes = Buffer.from(await res.arrayBuffer());`
> `expect(iconv.decode(bytes, "gbk")).toContain("<Model>")` 且
> `expect(res.headers.get("content-type")).toContain("charset=gbk")`。
> 若数据不可用，200 路径由 `server/exportRuntime.test.mjs` 的纯函数用例覆盖。

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run server/apiV1Schemes.e-file.test.mjs`
Expected: FAIL — 404/405（路由不存在）

- [ ] **Step 3: 实现适配层**

创建 `server/eFileExport.mjs`：

```js
// v1/schemes/model/e-file 适配层：读磁盘模型 + 库配置 → 调 src/export/e-file.ts（Node 原生 TS）→ GBK/UTF-8 响应。
import { installDomShim } from "./domShim.mjs";

installDomShim();

import iconv from "iconv-lite";
import { readDeviceLibraryConfig, readMeasurementConfig, readSchemeProjectRecord } from "./server.mjs";
import { readPredefinedTemplateBase64, PREDEFINED_E_DEVICE_TEMPLATES } from "./eFileTemplates.mjs";
import { sendV1Error } from "./v1Response.mjs";
import { parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";

const { buildEFileExport } = await import("../src/model-eexport.ts");
const {
  buildEFileExportOptionsFromLibrary,
  applyEDeviceDefinitionSectionsToLibraryState
} = await import("../src/export/e-file.ts");
const { parseEDeviceDefinitionFile } = await import("../src/model-eexport.ts");
const { eDeviceTemplateSingleTypeMismatchMessage } = await import("../src/eDeviceTemplateTypePolicy.ts");
const { decodeAuto } = await import("../src/encoding/gbk.ts");

// 从模板文本推导 override 映射（与前端 runtimeSnapshot.serializeEFile 同链路、纯函数）
function templateOverridesFromText(templateText, library) {
  const sections = parseEDeviceDefinitionFile(templateText);
  if (sections.length === 0) {
    return null;
  }
  return applyEDeviceDefinitionSectionsToLibraryState({
    sections,
    customDeviceTemplates: library.customDeviceTemplates ?? [],
    libraryTemplates: library.customDeviceTemplates ?? [],
    deviceDefinitionOverrides: library.deviceDefinitionOverrides ?? {},
    eDeviceDefinitionLabels: {},
    eDeviceDefinitionClassExportEnabled: {},
    eDeviceDefinitionFieldOrder: {},
    eDeviceDefinitionTemplateFields: {},
    labels: undefined
  });
}

export async function buildEFileForSavedModel({ parts, name, templateName, templateText }) {
  const record = await readSchemeProjectRecord({ schemePath: parts, name });
  if (!record) {
    return { error: { code: "not-found", message: "模型不存在。" } };
  }
  const project = record.project;
  const library = await readDeviceLibraryConfig();

  let overrides = {
    eDeviceDefinitionLabels: library.eDeviceDefinitionLabels ?? {},
    eDeviceDefinitionClassExportEnabled: library.eDeviceDefinitionClassExportEnabled ?? {},
    eDeviceDefinitionFieldOrder: library.eDeviceDefinitionFieldOrder ?? {},
    eDeviceDefinitionTemplateFields: library.eDeviceDefinitionTemplateFields ?? {},
    eDeviceDefinitionTableIds: library.eDeviceDefinitionTableIds ?? {}
  };

  if (templateText) {
    const parsed = templateOverridesFromText(templateText, library);
    if (!parsed) {
      return { error: { code: "bad-request", message: "模板文本中未解析到元件定义" } };
    }
    overrides = parsed;
  }

  if (templateName) {
    const mismatch = eDeviceTemplateSingleTypeMismatchMessage(templateName, String(project?.modelType ?? ""));
    if (mismatch) {
      return { error: { code: "bad-request", message: mismatch } };
    }
  }

  const options = buildEFileExportOptionsFromLibrary({
    libraryTemplates: library.customDeviceTemplates ?? [],
    labels: undefined,
    ...overrides
  });
  const file = buildEFileExport(project, parts, options);
  return { file };
}

const E_FILE_BODY_LIMIT = 2 * 1024 * 1024;

async function readJsonBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > E_FILE_BODY_LIMIT) {
      const error = new Error("请求体超过 2MB 上限。");
      error.code = "payload-too-large";
      throw error;
    }
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf-8");
  return body ? JSON.parse(body) : {};
}

function sendEFile(response, { file, encoding }) {
  const text = String(file?.text ?? "");
  const filename = String(file?.filename ?? "model.e");
  const bytes = encoding === "utf-8" ? Buffer.from(text, "utf-8") : iconv.encode(text, "gbk");
  response.writeHead(200, {
    "content-type": `text/plain; charset=${encoding}`,
    "content-length": String(bytes.length),
    "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "cache-control": "no-store",
    "access-control-allow-origin": "*"
  });
  response.end(bytes);
}

// 解析并校验公共 query；返回 { parts, name, encoding, templateName } 或 { error }
export function parseEFileQuery(url) {
  const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
  if (!requireSchemePath(parts)) {
    return { error: { code: "bad-request", message: "缺少或非法 schemePath。" } };
  }
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!name) {
    return { error: { code: "bad-request", message: "缺少模型名称。" } };
  }
  const encoding = (url.searchParams.get("encoding") ?? "gbk").trim().toLowerCase() || "gbk";
  if (encoding !== "gbk" && encoding !== "utf-8") {
    return { error: { code: "bad-request", message: "encoding 须为 gbk 或 utf-8。" } };
  }
  const templateName = (url.searchParams.get("template") ?? "").trim();
  if (templateName && !PREDEFINED_E_DEVICE_TEMPLATES[templateName]) {
    return {
      error: {
        code: "bad-request",
        message: `未知模板：${templateName}。可用模板：${Object.keys(PREDEFINED_E_DEVICE_TEMPLATES).join("、")}`
      }
    };
  }
  return { parts, name, encoding, templateName };
}

// GET /webgrp/v1/schemes/model/e-file
export async function handleV1ModelEFile({ url, response }) {
  const parsed = parseEFileQuery(url);
  if (parsed.error) {
    sendV1Error(response, parsed.error.code, parsed.error.message);
    return;
  }
  try {
    let templateText = "";
    if (parsed.templateName) {
      const base64 = await readPredefinedTemplateBase64(parsed.templateName);
      templateText = decodeAuto(Buffer.from(base64, "base64"));
    }
    const { file, error } = await buildEFileForSavedModel({
      parts: parsed.parts,
      name: parsed.name,
      templateName: parsed.templateName,
      templateText
    });
    if (error) {
      sendV1Error(response, error.code, error.message);
      return;
    }
    sendEFile(response, { file, encoding: parsed.encoding });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// POST /webgrp/v1/schemes/model/e-file —— body { templateText, templateName? }
export async function handleV1ModelEFilePost({ request, response, url }) {
  const parsed = parseEFileQuery(url);
  if (parsed.error) {
    sendV1Error(response, parsed.error.code, parsed.error.message);
    return;
  }
  try {
    const body = await readJsonBody(request);
    const templateText = typeof body?.templateText === "string" ? body.templateText : "";
    if (!templateText.trim()) {
      sendV1Error(response, "bad-request", "body.templateText 不能为空。");
      return;
    }
    const bodyTemplateName = typeof body?.templateName === "string" ? body.templateName.trim() : "";
    const { file, error } = await buildEFileForSavedModel({
      parts: parsed.parts,
      name: parsed.name,
      templateName: bodyTemplateName || parsed.templateName,
      templateText
    });
    if (error) {
      sendV1Error(response, error.code, error.message);
      return;
    }
    sendEFile(response, { file, encoding: parsed.encoding });
  } catch (error) {
    if (error?.code === "payload-too-large") {
      sendV1Error(response, "payload-too-large", error.message);
      return;
    }
    if (error instanceof SyntaxError) {
      sendV1Error(response, "bad-request", "请求体不是合法 JSON。");
      return;
    }
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}
```

> `decodeAuto` 与 `iconv.decode` 语义不同：`decodeAuto` 兼容 UTF-8/GBK 自动判别，用于**读模板**；`iconv.encode` 用于**写输出**。

在 `server/apiV1Schemes.mjs` 追加 handler 的 import 与路由：

```js
import { handleV1ModelEFile, handleV1ModelEFilePost } from "./eFileExport.mjs";
```

```js
export const v1SchemeRoutes = [
  // …既有 6 条保持不变…
  { method: "GET", pattern: apiPattern("/v1/schemes/model/e-file", "/?$"), handle: handleV1ModelEFile },
  { method: "POST", pattern: apiPattern("/v1/schemes/model/e-file", "/?$"), handle: handleV1ModelEFilePost }
];
```

> **路由注册无需改 `server.mjs`**：`server.mjs:6697-6699` 已把 `v1SchemeRoutes` 展开进 `v1Routes`，只要加进 `v1SchemeRoutes` 数组即自动生效。

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run server/apiV1Schemes.e-file.test.mjs`
Expected: PASS

Run: `pnpm vitest run server/`
Expected: 全绿

- [ ] **Step 5: 手工验证真实模型**

```bash
pnpm server
# 另开终端：
curl -s "http://127.0.0.1:5174/webgrp/v1/schemes?includeProjects=0" | head -c 400
```
取到方案名与模型名后：

```bash
curl -s -D- "http://127.0.0.1:5174/webgrp/v1/schemes/model/e-file?schemePath=$(node -e 'console.log(encodeURIComponent(JSON.stringify(["默认方案"])))')&name=$(node -e 'console.log(encodeURIComponent("未命名模型"))')" -o /tmp/out.e
file /tmp/out.e
```
Expected: `content-type: text/plain; charset=gbk`；`file` 报 `ISO-8859 text`（GBK 字节，非 UTF-8）

- [ ] **Step 6: Commit**

```bash
git add server/eFileExport.mjs server/apiV1Schemes.e-file.test.mjs server/apiV1Schemes.mjs
git commit -m "feat(api): 新增 /v1/schemes/model/e-file（后端计算，默认 GBK，支持模板）"
```

---

### Task 6: swigger 端点文档与示例

**Files:**
- Modify: `server/swaggerPage.mjs`（`ENDPOINTS` 数组）
- Modify: `server/swigger.examples.test.mjs`

**Interfaces:**
- Consumes: Task 5 的路由
- Produces: swigger「v1 方案域」分组下新增 2 条端点元数据（GET/POST）

- [ ] **Step 1: 加端点元数据**

在 `server/swaggerPage.mjs` 的 `ENDPOINTS` 中，「v1 方案域」分组（`/v1/schemes/model/svg` 那条之后）插入：

```js
  { group: "v1 方案域", method: "GET", path: "/webgrp/v1/schemes/model/e-file", desc: "已保存模型 E 文件（后端计算，默认 GBK，可选预定义模板）", query: [{ name: "schemePath", desc: "方案路径" }, { name: "name", desc: "模型名" }, { name: "template", desc: "可选，预定义模板名（国网E格式|主网实时库|配网实时库|台区实时库）" }, { name: "encoding", desc: "可选，gbk（默认）|utf-8" }], response: "<text/plain GBK 二进制>", examples: [
    { label: "「线路」E 文件（当前模板）", params: { q_schemePath: SP_DEFAULT, q_name: "线路" } },
    { label: "「线路」E 文件（配网实时库模板）", params: { q_schemePath: SP_DEFAULT, q_name: "线路", q_template: "配网实时库" } }
  ]},
  { group: "v1 方案域", method: "POST", path: "/webgrp/v1/schemes/model/e-file", desc: "已保存模型 E 文件（指定模板文本，后端计算）", query: [{ name: "schemePath", desc: "方案路径" }, { name: "name", desc: "模型名" }, { name: "encoding", desc: "可选，gbk（默认）|utf-8" }], body: { templateText: "<ACLoad>\ndev_type=ACLoad\nname=名称\n</ACLoad>" }, response: "<text/plain GBK 二进制>", examples: [
    { label: "按自定义模板文本生成", params: { q_schemePath: SP_DEFAULT, q_name: "线路", __body__: { templateText: "<ACLoad>\ndev_type=ACLoad\nname=名称\n</ACLoad>" } } }
  ]},
```

- [ ] **Step 2: 跑示例验证**

Run: `pnpm vitest run server/swigger.examples.test.mjs`
Expected: PASS（新增示例同样被遍历验证；若该测试对二进制响应有特殊处理，按既有 `/v1/schemes/export`（ZIP）示例的模式对齐）

- [ ] **Step 3: 更新第三方 API 文档的决策记录**

修改 `docs/DESIGN_THIRD_PARTY_API.md` §8.3，把「已保存模型不提供 E 文件接口」改为指向新端点，并注明决策 B 已被本方案取代：

```markdown
> **[2026-09-11 更新]** 决策 B 已取代：新增 `/api/v1/schemes/model/e-file`（后端直接计算，见
> `docs/superpowers/specs/2026-09-11-backend-export-e-svg-cim-design.md`）。
> `/api/v1/runtime/e-file` 保留，用于「当前打开且可能未保存」的模型。
```

- [ ] **Step 4: Commit**

```bash
git add server/swaggerPage.mjs server/swigger.examples.test.mjs docs/DESIGN_THIRD_PARTY_API.md
git commit -m "docs(api): swigger 增加 schemes/model/e-file 端点与示例"
```

---

### Task 7: 前端 `exportEFile` 改走后端

**Files:**
- Modify: `src/appExtracted/appDeviceDefinitionFactories.tsx:2836-2936`（`createExportEFile`）

**Interfaces:**
- Consumes: Task 5 端点；`__appScope` 既有 `ensureSavedBeforeExport`、`schemePathForScheme`、`activeSchemeKey`、`projectName`、`saveLazyTextFile`、`saveTextFile`、`showStandaloneExportCompletion`、`apiPath`
- Produces: 无新增导出（行为替换）

> **注意**：`createExportEFile` 第 2862 行已有 `ensureSavedBeforeExport()`，D5「先保存再导出」**已经存在**，本次只需替换生成来源。

- [ ] **Step 1: 写失败测试**

在 `src/svgExport.test.tsx` 同级新增 `src/appExtracted/appExportBackend.test.ts`（若已存在同类文件则并入）：

```ts
import { describe, expect, test, vi } from "vitest";
import { createExportEFile } from "./appDeviceDefinitionFactories";

function makeScope(overrides: Record<string, any> = {}) {
  const saved: any[] = [];
  return {
    saved,
    scope: {
      activeSchemeKey: "s1",
      ensureSavedBeforeExport: () => true,
      schemePathForScheme: () => ["默认方案"],
      projectName: "线路",
      safeFilePart: (name: string) => name,
      writeOperationLog: () => {},
      saveLazyTextFile: async (options: any) => {
        saved.push({ filename: options.filename, text: await options.loadText() });
        return true;
      },
      saveTextFile: async () => true,
      showStandaloneExportCompletion: () => {},
      ...overrides
    }
  };
}

describe("createExportEFile 走后端", () => {
  test("从 /v1/schemes/model/e-file 拉取文本并交给保存层", async () => {
    const fetchMock = vi.fn(async () => new Response("<Model>\n</Model>\n", {
      status: 200,
      headers: { "content-type": "text/plain; charset=gbk" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { saved, scope } = makeScope({ apiPath: (p: string) => p });
    await createExportEFile(scope)("gbk");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/v1/schemes/model/e-file");
    expect(url).toContain("encoding=gbk");
    expect(saved[0].filename).toBe("线路.e");
    expect(saved[0].text).toContain("<Model>");
    vi.unstubAllGlobals();
  });

  test("后端报错时不落盘", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, error: { code: "not-found", message: "模型不存在。" } }), { status: 404 })));
    const { saved, scope } = makeScope({ apiPath: (p: string) => p });
    await createExportEFile(scope)("gbk");
    expect(saved).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/appExtracted/appExportBackend.test.ts`
Expected: FAIL — fetch 未被调用

- [ ] **Step 3: 替换生成来源**

把 `src/appExtracted/appDeviceDefinitionFactories.tsx` 中 `createExportEFile` 的 `generatedFilePromise`（约 2866–2892 行）整段替换为：

```ts
    const generatedFilePromise = Promise.resolve().then(async () => {
      const schemePath = typeof schemePathForScheme === "function"
        ? schemePathForScheme(activeSchemeKey)
        : [];
      const path = Array.isArray(schemePath) && schemePath.length > 0 ? schemePath : ["默认方案"];
      const url = apiPath(
        `/v1/schemes/model/e-file?schemePath=${encodeURIComponent(JSON.stringify(path))}`
        + `&name=${encodeURIComponent(String(projectName ?? ""))}`
        + `&encoding=${encodeURIComponent(textEncoding)}`
      );
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) {
        throw new Error(await backendErrorMessage(response, "E 文件导出失败。"));
      }
      const text = await response.text();
      return { file: { filename: `${filenameBase}.e`, text, mime: "text/plain" }, warnings: [] };
    });
```

并把 `filenameBase` 的计算**上移**到这行之前（原在 2893 行）。相应地，从 `__appScope` 解构里移除不再使用的项（`buildEFileExport`、`eDeviceDefinition*`、`libraryTemplates`、`PARAM_LABELS`、`resolveTemplateComponentLibrary`、`getEExportWarnings`），新增 `apiPath`；若 `backendErrorMessage` 未在模块内 import，则从 `./appCoreCanvasUtilities` 补。

> **警告行的取舍**：后端不返回 `warnings`。若保留「有 N 个设备未导出」提示，改在前端**只做告警计算**（`getEExportWarnings` 为纯函数），不重复生成逻辑。若不做，`warnings: []` 并删除 `warningDetails` 组装。

- [ ] **Step 4: 运行确认通过 + 回归**

Run: `pnpm vitest run src/appExtracted/appExportBackend.test.ts`
Expected: PASS（2 个用例）

Run: `pnpm vitest run`
Expected: 全绿

Run: `pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 端到端手测**

1. `pnpm dev`
2. 浏览器打开 → 顶栏「导出文件 → 导出 E 文件」
3. 选保存位置，确认文件内容含 `<Model>`；用文本编辑器以 GBK 打开不乱码

- [ ] **Step 6: Commit**

```bash
git add src/appExtracted/appDeviceDefinitionFactories.tsx src/appExtracted/appExportBackend.test.ts
git commit -m "feat(canvas): E 文件导出改走后端 /v1/schemes/model/e-file"
```

---

## Phase 2 — CIM/XML 后端化

### Task 8: CIM 端点与适配层

**Files:**
- Create: `server/cimExport.mjs`
- Create: `server/cimExport.test.mjs`
- Modify: `server/apiV1Schemes.mjs`

**Interfaces:**
- Consumes: 既有 `src/cim/cim-export.ts` 的 `buildCimXml(nodes, edges, projectName, modelId, measurementGroups, measurementTypes)`、`collectMissingCriticalParams`；`readSchemeProjectRecord`、`readMeasurementConfig`
- Produces: `handleV1ModelCimXml({ url, response })`；路由 `GET /v1/schemes/model/cim-xml`

- [ ] **Step 1: 写失败测试**

创建 `server/cimExport.test.mjs`：

```js
import { describe, expect, test } from "vitest";
import { installDomShim } from "./domShim.mjs";

installDomShim();

describe("CIM/XML 后端生成", () => {
  test("可直载 src/cim/cim-export.ts", async () => {
    const mod = await import("../src/cim/cim-export.ts");
    expect(typeof mod.buildCimXml).toBe("function");
  });

  test("空模型生成最小 XML 且含 cim 命名空间", async () => {
    const { buildCimXml } = await import("../src/cim/cim-export.ts");
    const xml = buildCimXml([], [], "测试模型", "m1");
    expect(xml).toContain("<cim:");
    expect(xml.startsWith("<?xml")).toBe(true);
  });

  test("母排节点进入 CIM 模型", async () => {
    const { buildCimXml } = await import("../src/cim/cim-export.ts");
    const nodes = [{
      id: "n1",
      kind: "busbar",
      position: { x: 0, y: 0 },
      size: { width: 100, height: 20 },
      params: { name: "母线1", vbase: "10" },
      terminals: []
    }];
    const xml = buildCimXml(nodes, [], "测试模型", "m1");
    expect(xml.length).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run server/cimExport.test.mjs`
Expected: FAIL — 无法解析 `.ts`（若 Task 3 未完成）或 `Failed to resolve import`

- [ ] **Step 3: 实现**

创建 `server/cimExport.mjs`：

```js
// v1/schemes/model/cim-xml 适配层：读磁盘模型 → 调 src/cim/cim-export.ts（Node 原生 TS）→ XML 响应。
import { installDomShim } from "./domShim.mjs";

installDomShim();

import { readMeasurementConfig, readSchemeProjectRecord } from "./server.mjs";
import { sendV1Error } from "./v1Response.mjs";
import { parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";

const { buildCimXml, collectMissingCriticalParams } = await import("../src/cim/cim-export.ts");

// modelId：默认取 project.idx，回退模型名；卫生化为 NCName 安全字符
function resolveModelId(project, name, override) {
  const raw = String(override ?? "").trim()
    || (project?.idx !== undefined && project?.idx !== null ? String(project.idx) : "")
    || name;
  return raw.replace(/[^A-Za-z0-9_.-]/g, "_") || "current";
}

function cimFilename(projectName) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const base = String(projectName ?? "").trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";
  return `${base}_${stamp}_CIM16.xml`;
}

// GET /webgrp/v1/schemes/model/cim-xml
export async function handleV1ModelCimXml({ url, response }) {
  const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
  if (!requireSchemePath(parts)) {
    sendV1Error(response, "bad-request", "缺少或非法 schemePath。");
    return;
  }
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!name) {
    sendV1Error(response, "bad-request", "缺少模型名称。");
    return;
  }
  try {
    const record = await readSchemeProjectRecord({ schemePath: parts, name });
    if (!record) {
      sendV1Error(response, "not-found", "模型不存在。");
      return;
    }
    const project = record.project ?? {};
    const nodes = Array.isArray(project.nodes) ? project.nodes : [];
    const edges = Array.isArray(project.edges) ? project.edges : [];

    const electricalNodes = nodes.filter((node) => !String(node.kind ?? "").startsWith("static-"));
    if (electricalNodes.length === 0) {
      sendV1Error(response, "bad-request", "当前模型无可导出的电力设备。");
      return;
    }

    const strict = url.searchParams.get("strict") === "1";
    if (strict) {
      const missing = collectMissingCriticalParams(electricalNodes);
      if (missing.length > 0) {
        const detail = missing
          .slice(0, 10)
          .map((item) => `${item.name} 缺 ${item.missing.join("、")}`)
          .join("；");
        sendV1Error(response, "bad-request", `关键参数缺失：${detail}`);
        return;
      }
    }

    const measurementConfig = await readMeasurementConfig();
    const modelId = resolveModelId(project, name, url.searchParams.get("modelId"));
    const xml = buildCimXml(
      nodes,
      edges,
      String(project.name ?? name),
      modelId,
      project.measurements?.groups,
      measurementConfig.measurementTypes
    );
    const filename = cimFilename(project.name ?? name);
    response.writeHead(200, {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    });
    response.end(xml);
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}
```

在 `server/apiV1Schemes.mjs` 加 import 与路由：

```js
import { handleV1ModelCimXml } from "./cimExport.mjs";
```

```js
  { method: "GET", pattern: apiPattern("/v1/schemes/model/cim-xml", "/?$"), handle: handleV1ModelCimXml }
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run server/cimExport.test.mjs server/`
Expected: 全绿

- [ ] **Step 5: 手工验证**

```bash
curl -s "http://127.0.0.1:5174/webgrp/v1/schemes/model/cim-xml?schemePath=$(node -e 'console.log(encodeURIComponent(JSON.stringify(["默认方案"])))')&name=$(node -e 'console.log(encodeURIComponent("线路"))')" | head -c 300
```
Expected: 以 `<?xml` 开头，含 `<cim:` 前缀元素

- [ ] **Step 6: Commit**

```bash
git add server/cimExport.mjs server/cimExport.test.mjs server/apiV1Schemes.mjs
git commit -m "feat(api): 新增 /v1/schemes/model/cim-xml（后端生成 CIM16 XML）"
```

---

### Task 9: swigger 文档 + 前端 `exportCimFile` 改后端

**Files:**
- Modify: `server/swaggerPage.mjs`
- Modify: `src/appExtracted/appRenderBatch.tsx:2674`（`exportCimFile`）
- Modify: `src/cim/cim-export.ts`（保留 `buildCimXml` 与 `collectMissingCriticalParams`，`createCimExport` 改为走后端）

**Interfaces:**
- Consumes: Task 8 端点
- Produces: `createCimExport(scope)` 行为改变，签名不变

- [ ] **Step 1: 写失败测试**

在 `src/cim/cim-export.test.ts` 追加：

```ts
import { createCimExport } from "./cim-export";
import { describe, expect, test, vi } from "vitest";

describe("createCimExport 走后端", () => {
  test("从 /v1/schemes/model/cim-xml 拉取 XML 并保存", async () => {
    const fetchMock = vi.fn(async () => new Response("<?xml version=\"1.0\"?><cim:FullModel/>", {
      status: 200,
      headers: { "content-type": "application/xml" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    const saves: any[] = [];
    const exportCim = createCimExport({
      nodes: [{ id: "n1", kind: "busbar" } as any],
      edges: [],
      projectName: "线路",
      activeProjectKey: "m1",
      schemePath: ["默认方案"],
      apiPath: (path: string) => path,
      saveLazyTextFile: async (options: any) => {
        saves.push({ filename: options.filename, text: await options.loadText() });
        return true;
      }
    });
    await exportCim();
    expect(String(fetchMock.mock.calls[0][0])).toContain("/v1/schemes/model/cim-xml");
    expect(saves[0].text).toContain("<cim:FullModel/>");
    vi.unstubAllGlobals();
  });
});
```

> `CimExportScope` 需新增可选字段 `schemePath?: string[]`、`apiPath?: (path: string) => string`、`backendErrorMessage?: (res: Response, fallback: string) => Promise<string>`，以便测试注入。

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/cim/cim-export.test.ts`
Expected: FAIL — fetch 未被调用

- [ ] **Step 3: 改实现**

`src/appExtracted/appRenderBatch.tsx:2674` 的 `createCimExport({...})` 调用处，把 `scope` 里补上 `schemePath: schemePathForScheme(activeSchemeKey)`、`apiPath`、`backendErrorMessage`。

`src/cim/cim-export.ts` 中把 `createCimExport` 的生成段替换为：

```ts
    const schemePath = Array.isArray(scope.schemePath) && scope.schemePath.length > 0 ? scope.schemePath : ["默认方案"];
    const query = `schemePath=${encodeURIComponent(JSON.stringify(schemePath))}`
      + `&name=${encodeURIComponent(projectName)}`
      + (activeModelId || activeProjectKey ? `&modelId=${encodeURIComponent(String(activeModelId || activeProjectKey).replace(/[^A-Za-z0-9_.-]/g, "_"))}` : "");
    const path = `/v1/schemes/model/cim-xml?${query}`;
    const url = typeof scope.apiPath === "function" ? scope.apiPath(path) : path;
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      const message = typeof scope.backendErrorMessage === "function"
        ? await scope.backendErrorMessage(response, "CIM/XML 导出失败。")
        : `CIM/XML 导出失败（HTTP ${response.status}）`;
      scope.showGlobalMessage?.(message);
      return false;
    }
    const xml = await response.text();
    const filename = cimFilename(projectName, safeFilePart);
```

本地 `buildCimXml` 与 `collectMissingCriticalParams` 保留（仍被测试与外部复用），但 `createCimExport` 不再调用 `buildCimXml`。

- [ ] **Step 4: 加 swigger 端点元数据**

在 `ENDPOINTS`「v1 方案域」插入：

```js
  { group: "v1 方案域", method: "GET", path: "/webgrp/v1/schemes/model/cim-xml", desc: "已保存模型 CIM/XML（IEC 61970 CIM16）", query: [{ name: "schemePath", desc: "方案路径" }, { name: "name", desc: "模型名" }, { name: "modelId", desc: "可选，覆盖生成的模型 ID" }, { name: "strict", desc: "可选，1 时关键参数缺失返回 400" }], response: "<application/xml 二进制>", examples: [
    { label: "「线路」CIM/XML", params: { q_schemePath: SP_DEFAULT, q_name: "线路" } }
  ]},
```

- [ ] **Step 5: 运行确认通过 + 回归**

Run: `pnpm vitest run src/cim server/swigger.examples.test.mjs`
Expected: 全绿

Run: `pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add server/swaggerPage.mjs src/cim/cim-export.ts src/cim/cim-export.test.ts src/appExtracted/appRenderBatch.tsx
git commit -m "feat(api): swigger 增加 cim-xml 端点；前端 CIM 导出改走后端"
```

---

## Phase 3 — SVG 后端化（含去 JSX）

### Task 10: SVG 输出基线快照（转换前）

**Files:**
- Create: `src/export/fixtures/svg-baseline.ts`
- Create: `src/export/svg.golden.test.ts`

**Interfaces:**
- Consumes: 既有 `buildSvgDocument`（此刻仍在 `src/appExtracted/appPersistenceLibraryExport.tsx`）
- Produces: `SVG_BASELINE_FIXTURE`（固定模型）；`hashSvg(text)` 工具；基线哈希常量

- [ ] **Step 1: 建 fixture**

创建 `src/export/fixtures/svg-baseline.ts`：

```ts
// SVG 导出基线 fixture：覆盖母排 / 开关 / 负荷 / 线路 / 静态图元 / 多状态视觉。
// 目的：去 JSX 重构前后输出必须逐字节一致。
export const SVG_BASELINE_FIXTURE = {
  width: 800,
  height: 600,
  backgroundColor: "#ffffff",
  deviceTemplates: [] as any[],
  imageExportPathById: {}
};

export const SVG_BASELINE_NODES = [
  {
    id: "bus1", kind: "busbar", position: { x: 100, y: 100 }, size: { width: 200, height: 16 },
    rotation: 0, layerId: "default",
    params: { name: "母线1", vbase: "10" },
    terminals: [{ id: "t1", anchor: { x: 0.5, y: 0.5 }, type: "electrical", nodeNumber: "1" }]
  },
  {
    id: "brk1", kind: "breaker", position: { x: 360, y: 100 }, size: { width: 32, height: 32 },
    rotation: 90, layerId: "default",
    params: { name: "开关1", status: "closed" },
    terminals: [
      { id: "t1", anchor: { x: 0, y: 0.5 }, type: "electrical", nodeNumber: "2" },
      { id: "t2", anchor: { x: 1, y: 0.5 }, type: "electrical", nodeNumber: "3" }
    ]
  },
  {
    id: "load1", kind: "load", position: { x: 460, y: 180 }, size: { width: 40, height: 40 },
    rotation: 0, layerId: "default",
    params: { name: "负荷1", vbase: "10" },
    terminals: [{ id: "t1", anchor: { x: 0.5, y: 0 }, type: "electrical", nodeNumber: "4" }]
  }
];

export const SVG_BASELINE_EDGES = [
  {
    id: "e1", sourceId: "bus1", targetId: "brk1",
    sourceTerminalId: "t1", targetTerminalId: "t1",
    sourcePoint: { x: 300, y: 108 }, targetPoint: { x: 360, y: 108 }
  }
];
```

- [ ] **Step 2: 生成基线哈希**

创建 `src/export/svg.golden.test.ts`：

```ts
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { buildSvgDocument } from "../appExtracted/appPersistenceLibraryExport";
import { SVG_BASELINE_EDGES, SVG_BASELINE_FIXTURE, SVG_BASELINE_NODES } from "./fixtures/svg-baseline";

export function hashSvg(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// 占位：Step 3 用实际生成值替换
export const SVG_BASELINE_HASH = "TO_FILL";

describe("SVG 导出基线", () => {
  test("输出哈希与基线一致", () => {
    const svg = buildSvgDocument(SVG_BASELINE_NODES as any, SVG_BASELINE_EDGES as any, SVG_BASELINE_FIXTURE as any);
    expect(hashSvg(svg)).toBe(SVG_BASELINE_HASH);
  });
});
```

- [ ] **Step 3: 跑一次拿到真实哈希并写回**

Run:
```bash
pnpm vitest run src/export/svg.golden.test.ts 2>&1 | grep -A2 "expected"
```
把报错里 expected 的哈希值替换 `SVG_BASELINE_HASH` 的 `"TO_FILL"`。

Run: `pnpm vitest run src/export/svg.golden.test.ts`
Expected: PASS

> 若首次跑就 `expected "TO_FILL"` 之外的差异，说明 fixture 里有随机字段——把该字段从 fixture 里剔除，或在 `hashSvg` 前做归一化（替换 `Math.random` 派生的 id）。**不要**直接放宽到 `toContain` 断言，那会让本任务失去保护作用。

- [ ] **Step 4: 同时落一份可读基线便于 diff**

在 `src/export/svg.golden.test.ts` 里加一段（仅当环境变量开启时写盘）：

```ts
import { writeFileSync } from "node:fs";

test("导出可读基线文件", () => {
  if (process.env.WRITE_SVG_BASELINE !== "1") return;
  const svg = buildSvgDocument(SVG_BASELINE_NODES as any, SVG_BASELINE_EDGES as any, SVG_BASELINE_FIXTURE as any);
  writeFileSync(new URL("./fixtures/svg-baseline.svg", import.meta.url), svg, "utf8");
});
```

Run: `WRITE_SVG_BASELINE=1 pnpm vitest run src/export/svg.golden.test.ts`
Expected: 生成 `src/export/fixtures/svg-baseline.svg`，提交它（供后续 diff 用）

- [ ] **Step 5: Commit**

```bash
git add src/export/svg.golden.test.ts src/export/fixtures/svg-baseline.ts src/export/fixtures/svg-baseline.svg
git commit -m "test(svg): 建立导出基线快照（去 JSX 重构的保护网）"
```

---

### Task 11: JSX → `createElement` codemod + `staticRenderUtils` 转换

**Files:**
- Create: `scripts/jsx-to-create-element.mjs`
- Rename + Modify: `src/staticRenderUtils.tsx` → `src/staticRenderUtils.ts`
- Create: `scripts/jsx-to-create-element.test.mjs`

**Interfaces:**
- Produces: `convertJsxToCreateElement(source, fileName): string`（CLI：`node scripts/jsx-to-create-element.mjs <in.tsx> <out.ts>`）

- [ ] **Step 1: 写失败测试**

创建 `scripts/jsx-to-create-element.test.mjs`：

```js
import { describe, expect, test } from "vitest";
import { convertJsxToCreateElement } from "./jsx-to-create-element.mjs";

describe("jsx-to-create-element", () => {
  test("自闭合元素带 props", () => {
    const out = convertJsxToCreateElement('const a = <rect x="1" fill="red" />;\n', "t.tsx");
    expect(out).toContain('createElement("rect", { x: "1", fill: "red" })');
  });

  test("嵌套子元素", () => {
    const out = convertJsxToCreateElement("const a = <g><rect /></g>;\n", "t.tsx");
    expect(out).toContain('createElement("g", null, createElement("rect", null))');
  });

  test("片段转为 Fragment", () => {
    const out = convertJsxToCreateElement("const a = <><rect /><rect /></>;\n", "t.tsx");
    expect(out).toContain("createElement(Fragment, null,");
  });

  test("表达式属性与文本子节点", () => {
    const out = convertJsxToCreateElement('const a = <text x={n}>{label}</text>;\n', "t.tsx");
    expect(out).toContain("createElement(\"text\", { x: n }, label)");
  });

  test("保留类型标注与注释", () => {
    const src = "// 保留注释\nfunction f(node: ModelNode): number { return 1; }\nconst a = <rect />;\n";
    const out = convertJsxToCreateElement(src, "t.tsx");
    expect(out).toContain("// 保留注释");
    expect(out).toContain("function f(node: ModelNode): number { return 1; }");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run scripts/jsx-to-create-element.test.mjs`
Expected: FAIL — `Failed to resolve import "./jsx-to-create-element.mjs"`

- [ ] **Step 3: 实现 codemod**

创建 `scripts/jsx-to-create-element.mjs`，实现要点：

- 用 `typescript` 的 `ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)` 解析。
- 递归遍历，收集所有 `JsxElement` / `JsxSelfClosingElement` / `JsxFragment` 节点，但**跳过其内部的子 JSX 节点**（只替换最外层，避免重复替换）。
- 对每个节点按 `pos`/`end` 生成替换文本，按位置**从后往前** splice 回原字符串（保留其余源码逐字节不变，类型与注释自然保留）。
- 生成规则：
  - 标签名：`Identifier` → 原名；`PropertyAccessExpression` → 原名；`JsxNamespacedName` → 报错（本项目不用）。
  - 属性：无属性 → `null`；有属性 → `{ key: value, ... }`；`key={expr}` → `key: expr`；`key="str"` → `key: "str"`；布尔简写 `key` → `key: true`；`{...spread}` → 合并进对象字面量（或多个 `Object.assign`，本项目少见，直接报错要求手工处理）。
  - 子节点：表达式容器 `{expr}` → `expr`；文本 → JSON 字符串字面量；嵌套 JSX → 递归结果。
  - 片段：`createElement(Fragment, null, ...children)`。

导出 `convertJsxToCreateElement(source, fileName)` 并支持 CLI：

```js
if (process.argv[1] && process.argv[1].endsWith("jsx-to-create-element.mjs")) {
  const [, , input, output] = process.argv;
  const { readFileSync, writeFileSync } = await import("node:fs");
  const source = readFileSync(input, "utf8");
  writeFileSync(output, convertJsxToCreateElement(source, input), "utf8");
}
```

- [ ] **Step 4: 转换 `staticRenderUtils.tsx`**

```bash
node scripts/jsx-to-create-element.mjs src/staticRenderUtils.tsx src/staticRenderUtils.ts
```

然后：
1. 在 `src/staticRenderUtils.ts` 顶部把 `import { ... } from "react"`（若原是 `memo` / `Fragment`）改成需要的形式，加入 `import { createElement, Fragment } from "react";`
2. 删除原 `src/staticRenderUtils.tsx`
3. 全局搜索引用方（`src/DeviceGlyph.tsx`、`src/appExtracted/appStaticScope.ts` 等）——它们都使用无扩展名 import（`"./staticRenderUtils"`），**无需改动**
4. 若 `pnpm tsc --noEmit` 报某个 import 带显式扩展名 `.tsx`，改成 `.ts`

- [ ] **Step 5: 运行确认通过**

Run: `pnpm vitest run scripts/jsx-to-create-element.test.mjs`
Expected: PASS（5 个用例）

Run: `pnpm vitest run src/export/svg.golden.test.ts`
Expected: PASS（**输出哈希未变** —— 这是本任务的核心验收）

Run: `pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add scripts/jsx-to-create-element.mjs scripts/jsx-to-create-element.test.mjs src/staticRenderUtils.ts
git commit -m "refactor(svg): staticRenderUtils 去 JSX 改 .ts（附 JSX→createElement codemod）"
```

> 用 `git add <新路径>` + 删除旧文件即可完成重命名；`git status` 中旧 `.tsx` 的删除会被一并 `git add -A` 收录。不要用 `git mv`（codemod 是写新文件、删旧文件）。

---

### Task 12: `DeviceGlyph` 去 JSX

**Files:**
- Rename + Modify: `src/DeviceGlyph.tsx` → `src/DeviceGlyph.ts`

**Interfaces:**
- Consumes: Task 11 的 `scripts/jsx-to-create-element.mjs`、`src/staticRenderUtils.ts`
- Produces: `DeviceGlyph`（普通函数，签名不变）、`MemoDeviceGlyph`、`SvgMarkupChunk`、`DeviceGlyphProps`、`DeviceGlyphMode`

- [ ] **Step 1: 记录转换前基线**

Run: `pnpm vitest run src/export/svg.golden.test.ts`
Expected: PASS（记下当前通过状态）

- [ ] **Step 2: 转换**

```bash
node scripts/jsx-to-create-element.mjs src/DeviceGlyph.tsx src/DeviceGlyph.ts
```

逐项检查（codemod 覆盖不到的写法需手工处理）：

1. 顶部补 `import { createElement, Fragment, memo } from "react";`（`memo` 原来就有）
2. `SvgMarkupChunk` 用的 `dangerouslySetInnerHTML={{ __html: markup }}` 转成 `{ dangerouslySetInnerHTML: { __html: markup } }`
3. JSX 中的 `key={...}` 保留为 props 的 `key` —— `renderSvgElementMarkup` 会忽略 `key`，无影响
4. 删除 `src/DeviceGlyph.tsx`
5. `src/appStaticScope.ts` 等引用方使用无扩展名 import，无需改动

- [ ] **Step 3: 运行确认哈希未变**

Run: `pnpm vitest run src/export/svg.golden.test.ts`
Expected: PASS

Run: `pnpm vitest run src/svgExport.test.tsx src/appView.test.tsx`
Expected: 全绿

Run: `pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 逐图元视觉回归**

1. `pnpm dev`
2. 打开一个含多类设备的模型
3. 截图，与转换前截图逐设备比对：母排 / 开关 / 刀闸 / 变压器 / 三绕组 / 负荷 / 发电机 / 线路 / 容器 / 静态图元 / 文本 / 图像 / 按钮
4. 画布实时渲染与「导出 SVG」产物分别比对

> 视觉回归是**本任务唯一的验收手段**：`DeviceGlyph` 同时驱动画布与导出。

- [ ] **Step 5: Commit**

```bash
git add src/DeviceGlyph.ts
git commit -m "refactor(svg): DeviceGlyph 去 JSX 改 .ts（输出经黄金基线校验）"
```

---

### Task 13: 抽 `src/export/svg.ts`

**Files:**
- Create: `src/export/svg.ts`
- Create: `src/export/svg.test.ts`
- Modify: `src/appExtracted/appPersistenceLibraryExport.tsx`
- Modify: `src/export/svg.golden.test.ts`（import 路径切换）

**Interfaces:**
- Consumes: `src/DeviceGlyph.ts`、`src/staticRenderUtils.ts`、`src/svgUtils.ts`、`src/svgExportUtils.ts`、`src/model.ts`、`src/model-routing.ts`
- Produces: `buildSvgDocument(nodes, edges, canvasSize)`，其中 `canvasSize.imageAssets?: Record<string, string>`（新增可选字段，默认 `readImageAssets()`）

- [ ] **Step 1: 写失败测试**

创建 `src/export/svg.test.ts`：

```ts
import { describe, expect, test } from "vitest";
import * as legacy from "../appExtracted/appPersistenceLibraryExport";
import { buildSvgDocument } from "./svg";
import { SVG_BASELINE_EDGES, SVG_BASELINE_FIXTURE, SVG_BASELINE_NODES } from "./fixtures/svg-baseline";

describe("src/export/svg", () => {
  test("旧路径 re-export 保持同一引用", () => {
    expect(legacy.buildSvgDocument).toBe(buildSvgDocument);
  });

  test("可注入 imageAssets（不读 localStorage）", () => {
    const svg = buildSvgDocument(SVG_BASELINE_NODES as any, SVG_BASELINE_EDGES as any, {
      ...SVG_BASELINE_FIXTURE,
      imageAssets: {}
    } as any);
    expect(svg).toContain("<svg");
  });

  test("母排渲染出 bus-glyph", () => {
    const svg = buildSvgDocument(SVG_BASELINE_NODES as any, SVG_BASELINE_EDGES as any, SVG_BASELINE_FIXTURE as any);
    expect(svg).toContain("bus-glyph");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/export/svg.test.ts`
Expected: FAIL — `Failed to resolve import "./svg"`

- [ ] **Step 3: 迁移**

从 `src/appExtracted/appPersistenceLibraryExport.tsx` **整段剪切**这 8 个顶层声明到 `src/export/svg.ts`：

```
BACKGROUND_PAGE_EXPORT_ID_PREFIX, backgroundPageCanvasTransform,
buildSvgDeviceConnectorMarkup, buildSvgDocument, exportSvgImageHref,
nestedSvgDocumentRoot, nodeGeometryTransform, prefixNestedSvgDocumentIds
```

处理四件事：

1. **`CanvasRenderOptions` 增字段**：加 `imageAssets?: Record<string, string>`，并在 `buildSvgDocument` 内把
   `const imageAssets = readImageAssets();` 改为
   ```ts
   const imageAssets = canvasSize.imageAssets ?? readImageAssets();
   ```

2. **`resolve*Image` 内联**：把 `resolveNodeImage` / `resolveNodeForegroundImage`（`appCoreCanvasUtilities.tsx:4090-4100` 的纯函数实现）**复制**进 `src/export/svg.ts`（不 import，避免拖入 `.tsx`）：
   ```ts
   function resolveNodeImage(node: ModelNode, assets: Record<string, string>) {
     const assetId = node.params.backgroundImageAssetId;
     return (assetId && assets[assetId]) || node.params.backgroundImage || "";
   }
   function resolveNodeForegroundImage(node: ModelNode, assets: Record<string, string>) {
     const assetId = node.params.foregroundImageAssetId;
     return (assetId && assets[assetId]) || node.params.foregroundImage || "";
   }
   ```

3. **`readImageAssets` 惰性化**（`appCoreCanvasUtilities.tsx` 是 `.tsx`，顶层 import 会把 React 拖进 Node 闭包）：`src/export/svg.ts` 顶部定义为可注入：
   ```ts
   let readImageAssetsImpl: () => Record<string, string> = () => ({});
   export function setSvgImageAssetsReader(fn: () => Record<string, string>) {
     readImageAssetsImpl = fn;
   }
   function readImageAssets() {
     return readImageAssetsImpl();
   }
   ```
   在 `src/appExtracted/appPersistenceLibraryExport.tsx` 里注册真实实现（见 Step 3 末的 re-export 块）。

4. **import 收敛**：`src/export/svg.ts` 只从 `../model.ts`、`../model-routing.ts`、`../svgUtils.ts`、`../svgExportUtils.ts`、`../DeviceGlyph.ts`、`../staticRenderUtils.ts` 取符号；**不得**出现 `appCoreCanvasUtilities` / `appGraphMeasurementFactories` / `stateIconDrawing`。

在 `src/appExtracted/appPersistenceLibraryExport.tsx` 顶部加：

```ts
export * from "../export/svg";
import { setSvgImageAssetsReader } from "../export/svg";
setSvgImageAssetsReader(readImageAssets);
```

- [ ] **Step 4: 切换 golden 测试 import 路径**

`src/export/svg.golden.test.ts` 的 import 改为：

```ts
import { buildSvgDocument } from "./svg";
```

- [ ] **Step 5: 运行确认通过**

Run: `pnpm vitest run src/export/svg.test.ts src/export/svg.golden.test.ts`
Expected: PASS（哈希不变）

Run: `pnpm vitest run`
Expected: 全绿

Run: `pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: 验证闭包无 `.tsx` 且 Node 可直载**

Run（把 Task 1 Step 5 的脚本入口换成 `src/export/svg.ts`）:
Expected: `tsx 0`

Run:
```bash
node --import ./server/domShim.mjs -e "import('./src/export/svg.ts').then(m=>console.log('ok',typeof m.buildSvgDocument))"
```
Expected: `ok function`

- [ ] **Step 7: Commit**

```bash
git add src/export/svg.ts src/export/svg.test.ts src/export/svg.golden.test.ts src/appExtracted/appPersistenceLibraryExport.tsx
git commit -m "refactor(export): 抽出 svg 纯模块（imageAssets 可注入，Node 可直载）"
```

---

### Task 14: SVG 端点换实现

**Files:**
- Create: `server/svgExport.mjs`
- Create: `server/svgExport.test.mjs`
- Modify: `server/apiV1Schemes.mjs:166-190`（`handleV1ModelSvg`）

**Interfaces:**
- Consumes: Task 13 `src/export/svg.ts`、`readDeviceLibraryConfig`、`readMeasurementConfig`、`readMainifest` 派生的图像映射（沿用 `imageExportPathByIdFromManifest`，未导出则传 `{}`）
- Produces: `handleV1ModelSvg` 实现替换（路径、签名、响应头不变）

- [ ] **Step 1: 写失败测试**

创建 `server/svgExport.test.mjs`：

```js
import { describe, expect, test } from "vitest";
import { installDomShim } from "./domShim.mjs";

installDomShim();

describe("SVG 后端生成", () => {
  test("可直载 src/export/svg.ts", async () => {
    const mod = await import("../src/export/svg.ts");
    expect(typeof mod.buildSvgDocument).toBe("function");
  });

  test("母排节点渲染出 bus-glyph", async () => {
    const { buildSvgDocument } = await import("../src/export/svg.ts");
    const nodes = [{
      id: "bus1", kind: "busbar", position: { x: 0, y: 0 }, size: { width: 100, height: 16 },
      rotation: 0, layerId: "default", params: { name: "母线1", vbase: "10" },
      terminals: [{ id: "t1", anchor: { x: 0.5, y: 0.5 }, type: "electrical", nodeNumber: "1" }]
    }];
    const svg = buildSvgDocument(nodes, [], {
      width: 400, height: 300, backgroundColor: "#ffffff",
      deviceTemplates: [], imageExportPathById: {}, imageAssets: {}
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain("bus-glyph");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run server/svgExport.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现**

创建 `server/svgExport.mjs`：

```js
// v1/schemes/model/svg 后端渲染：读磁盘模型 + 库配置 → 调 src/export/svg.ts（Node 原生 TS）。
import { installDomShim } from "./domShim.mjs";

installDomShim();

import { readDeviceLibraryConfig, readMeasurementConfig, readSchemeProjectRecord } from "./server.mjs";
import { sendV1Error } from "./v1Response.mjs";

const { buildSvgDocument } = await import("../src/export/svg.ts");

export async function renderSavedModelSvg({ parts, name }) {
  const record = await readSchemeProjectRecord({ schemePath: parts, name });
  if (!record) {
    return { error: { code: "not-found", message: "模型不存在。" } };
  }
  const project = record.project ?? {};
  const [library, measurementConfig] = await Promise.all([readDeviceLibraryConfig(), readMeasurementConfig()]);
  const svg = buildSvgDocument(
    Array.isArray(project.nodes) ? project.nodes : [],
    Array.isArray(project.edges) ? project.edges : [],
    {
      width: Number(project.canvasWidth ?? 1920),
      height: Number(project.canvasHeight ?? 1024),
      backgroundColor: project.canvasBackgroundColor ?? "#f8fafc",
      backgroundImage: project.canvasBackgroundImage ?? "",
      colorDisplayMode: "energy",
      deviceTemplates: library.customDeviceTemplates ?? undefined,
      layers: project.layers,
      activeLayerId: project.activeLayerId,
      measurements: project.measurements,
      measurementConfig,
      imageExportPathById: {},
      imageAssets: {}
    }
  );
  return { svg };
}
```

修改 `server/apiV1Schemes.mjs` 的 `handleV1ModelSvg`：

```js
export async function handleV1ModelSvg({ url, response }) {
  const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
  if (!requireSchemePath(parts)) {
    sendV1Error(response, "bad-request", "缺少或非法 schemePath。");
    return;
  }
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!name) {
    sendV1Error(response, "bad-request", "缺少模型名称。");
    return;
  }
  try {
    const { svg, error } = await renderSavedModelSvg({ parts, name });
    if (error) {
      sendV1Error(response, error.code, error.message);
      return;
    }
    response.writeHead(200, {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    });
    response.end(svg);
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}
```

删除对 `buildSvgFile` 的 import（若 `server.mjs` 其他地方仍用则保留 `buildSvgFile` 本身）。

> 注意：旧实现是 `cache-control: no-cache`（参与 ETag 缓存），新实现是 `no-store`。这是**行为变更**，需在 `docs/DESIGN_THIRD_PARTY_API.md` 记录。若要保留缓存，需额外实现 ETag。

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run server/svgExport.test.mjs server/apiV1Schemes.test.mjs`
Expected: 全绿（若既有测试断言了 SVG 的具体内容，其失败即说明输出变化，需同步更新断言并在 commit message 中说明）

- [ ] **Step 5: 手工比对**

```bash
curl -s "http://127.0.0.1:5174/webgrp/v1/schemes/model/svg?schemePath=$(node -e 'console.log(encodeURIComponent(JSON.stringify(["默认方案"])))')&name=$(node -e 'console.log(encodeURIComponent("线路"))')" -o /tmp/model.svg
```
用浏览器打开 `/tmp/model.svg`，与前端「导出 SVG」产物比对。

- [ ] **Step 6: 更新文档并 Commit**

`docs/DESIGN_THIRD_PARTY_API.md` §7.4 / §8.3 记录：`schemes/model/svg` 已改为复用前端 `buildSvgDocument`，输出更完整（含图层/测量/状态图标），且不再参与 ETag 缓存。

```bash
git add server/svgExport.mjs server/svgExport.test.mjs server/apiV1Schemes.mjs docs/DESIGN_THIRD_PARTY_API.md
git commit -m "feat(api): /v1/schemes/model/svg 改用共享 buildSvgDocument 渲染"
```

---

### Task 15: swigger 文档 + 前端 SVG 导出改后端

**Files:**
- Modify: `server/swaggerPage.mjs`
- Modify: `src/appExtracted/appDeviceDefinitionFactories.tsx`（`createExportSvgFile`，约 2667-2740）
- Modify: 顶栏 bundle 导出（`appTopbar.tsx` 的 `exportSvg`，定义处见 `appProjectCanvasFactories.tsx`）

**Interfaces:**
- Consumes: Task 14 端点
- Produces: `createExportSvgFile` 行为替换；bundle 导出的 SVG 部分改走后端

- [ ] **Step 1: 写失败测试**

在 `src/appExtracted/appExportBackend.test.ts` 追加：

```ts
import { createExportSvgFile } from "./appDeviceDefinitionFactories";

describe("createExportSvgFile 走后端", () => {
  test("从 /v1/schemes/model/svg 拉取 SVG 并保存", async () => {
    const fetchMock = vi.fn(async () => new Response("<svg xmlns=\"http://www.w3.org/2000/svg\"/>", {
      status: 200,
      headers: { "content-type": "image/svg+xml" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    const saved: any[] = [];
    const scope = {
      activeSchemeKey: "s1",
      ensureSavedBeforeExport: () => true,
      schemePathForScheme: () => ["默认方案"],
      projectName: "线路",
      safeFilePart: (n: string) => n,
      apiPath: (p: string) => p,
      writeOperationLog: () => {},
      saveTextFile: async (options: any) => { saved.push({ filename: options.filename, text: options.text }); return true; },
      saveLazyTextFile: async (options: any) => { saved.push({ filename: options.filename, text: await options.loadText() }); return true; },
      showStandaloneExportCompletion: () => {}
    };
    await createExportSvgFile(scope)("utf-8");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/v1/schemes/model/svg");
    expect(saved[0].text).toContain("<svg");
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/appExtracted/appExportBackend.test.ts`
Expected: FAIL

- [ ] **Step 3: 改实现**

把 `createExportSvgFile` 中本地调用 `buildSvgDocument` 的段落替换为对 `/v1/schemes/model/svg` 的 `fetch`（与 Task 7 的 `createExportEFile` 同款：`loadText: () => svgText`，`encoding` 固定 `"utf-8"`）。

顶栏 bundle 导出（`exportSvg`）中生成 SVG 的部分同样替换；E 与 JSON 部分本任务不改（JSON 仍走 `/v1/schemes/model/json`，若尚未走后端则保持原状）。

- [ ] **Step 4: 加 swigger 端点描述更新**

把既有 `/webgrp/v1/schemes/model/svg` 条目的 `desc` 更新为：

```js
  { group: "v1 方案域", method: "GET", path: "/webgrp/v1/schemes/model/svg", desc: "已保存模型 SVG（复用前端 buildSvgDocument，含图层/测量/状态图标；不含背景页）", query: [{ name: "schemePath", desc: "方案路径" }, { name: "name", desc: "模型名" }], response: "<image/svg+xml>", examples: [
    { label: "「线路」SVG", params: { q_schemePath: SP_DEFAULT, q_name: "线路" } },
    { label: "「图元连接」SVG", params: { q_schemePath: SP_DEFAULT, q_name: "图元连接" } }
  ]},
```

- [ ] **Step 5: 运行确认通过 + 全量回归**

Run: `pnpm vitest run`
Expected: 全绿

Run: `pnpm tsc --noEmit`
Expected: 无错误

Run: `pnpm build`
Expected: 构建成功

- [ ] **Step 6: 端到端手测**

1. `pnpm dev`
2. 顶栏「导出文件 → 导出 SVG」→ 产物与手测的 `/tmp/model.svg` 一致
3. 「导出文件 → 导出 E、JSON 和 SVG」bundle 正常
4. 「导出文件 → 导出 CIM/XML」正常

- [ ] **Step 7: Commit**

```bash
git add server/swaggerPage.mjs src/appExtracted/appDeviceDefinitionFactories.tsx src/appExtracted/appExportBackend.test.ts
git commit -m "feat(canvas): SVG 导出改走后端；swigger 更新 svg 端点说明"
```

---

## 收尾

### Task 16: 文档与索引同步

**Files:**
- Modify: `CLAUDE.md`、`src/CLAUDE.md`、`server/CLAUDE.md`
- Modify: `docs/DESIGN_THIRD_PARTY_API.md`

- [ ] **Step 1: 更新 CLAUDE.md 命令与说明**

在根 `CLAUDE.md` 的「注意事项」与「约定」中补一行：

```markdown
| Node 原生 TS | `server/*.mjs` 可直接 `import "../src/export/*.ts"`；纯模块 import 须带 `.ts` 扩展名（`allowImportingTsExtensions`） |
```

`server/CLAUDE.md` 的 Key Files 表补 `eFileExport.mjs` / `svgExport.mjs` / `cimExport.mjs` / `eFileTemplates.mjs` / `domShim.mjs`；Testing Requirements 补 `pnpm vitest run server/` 覆盖范围。

`src/CLAUDE.md` 的 Subdirectories 表补 `export/`。

- [ ] **Step 2: 更新 GitNexus 文档**

若仓库有 `.gitnexus` 生成的代码地图文档，重新生成：

```bash
npx gitnexus analyze
```

- [ ] **Step 3: 最终全量验证**

```bash
pnpm tsc --noEmit && pnpm vitest run && pnpm build
```
Expected: 三者全成功

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md src/CLAUDE.md server/CLAUDE.md docs/DESIGN_THIRD_PARTY_API.md
git commit -m "docs: 同步后端导出改造后的目录说明与命令约定"
```

---

## 自审记录

**Spec 覆盖检查**

| Spec 章节 | 对应 Task |
|---|---|
| §3 D1/D2 单一真源 + 零产物 | Task 3 |
| §3 D3 去 JSX | Task 11、12 |
| §3 D4 请求只传模板 | Task 5（`parseEFileQuery` 只读 query） |
| §3 D5 先保存再导出 | Task 7（复用既有 `ensureSavedBeforeExport`） |
| §3 D6 SVG 换实现 | Task 14 |
| §3 D7 默认 GBK | Task 5（`sendEFile`） |
| §3 D8 runtime e-file 不动 | Task 4（仅抽常量，不改行为） |
| §3 D9 CIM 复用 | Task 8 |
| §3 D10 CIM modelId | Task 8（`resolveModelId`） |
| §3 D11 CIM strict | Task 8 |
| §5.0 落位 `src/export/` | Task 1、2、13 |
| §5.1.1 device-definition-shared | Task 1 |
| §5.2 svg.ts + imageAssets 注入 | Task 13 |
| §5.3 src/cim 零改动 | Task 8 |
| §5.4 去 JSX 清单（2 文件） | Task 11、12 |
| §5.5 tsconfig + `.ts` 扩展名 | Task 3 |
| §5.6 localStorage shim | Task 3 |
| §6.1/6.2/6.3 端点 | Task 5、8、14 |
| §6.4 错误码 | Task 5、8 |
| §7 前端改动 | Task 7、9、15 |
| §8 风险（视觉回归） | Task 12 Step 4 |
| §9 测试 | 各 Task 的测试步骤 + Task 10 |
| §10 审计附录 | 无需实现（分析结论） |
| §11 实测证据 | Task 3、8、14 的直载测试 |
| §12 后续项 | 不实现 |

**类型一致性抽查**

- `buildEFileExportOptionsFromLibrary` 在 Task 2 定义、Task 5 消费，参数名一致（`libraryTemplates` / `labels` / `eDeviceDefinition*` / `resolveDefinitionComponentLibrary`）。
- `buildEFileForSavedModel({ parts, name, templateName, templateText })` 在 Task 5 内定义与消费，返回 `{ file } | { error }`。
- `renderSavedModelSvg({ parts, name })` 在 Task 14 内定义与消费，返回 `{ svg } | { error }`。
- `buildSvgDocument(nodes, edges, canvasSize)` 的 `canvasSize.imageAssets` 在 Task 13 引入、Task 14 消费。
- `installDomShim()` 在 Task 3 定义，Task 5/8/14 消费。
- `convertJsxToCreateElement(source, fileName)` 在 Task 11 定义与消费。

**已知留白（实施时按现场裁决）**

- Task 7 的 `warnings`：后端不返回告警明细；实施时若保留前端告警，只调用纯函数 `getEExportWarnings`，**不得**在前端保留第二份生成逻辑。
- Task 14 的 `cache-control` 由 `no-cache` 变 `no-store`：若需保留 ETag 缓存，在 Task 14 内补实现，不延后。
- Task 15 的 bundle 导出中 JSON 部分不在本次范围，如已是后端接口（`/v1/schemes/model/json`）则无需改动。
