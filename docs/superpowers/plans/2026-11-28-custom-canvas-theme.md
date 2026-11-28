# 三模式画布主题与自定义配色 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` for native execution. Each task ends with focused verification before the next task.

**Goal:** 为画布增加浅色、深色、自定义三种模式；自定义模式默认深蓝色，独立保存背景、能流配色和电压等级配色，并通过后台 `color-config.json` 跨页面持久化。

**Architecture:** 保留现有浅色/深色主题和标准 `ColorPalette`，新增 `custom` 模式及独立 `customTheme` 配置。画布 token 根据自定义背景动态生成，语义色直接使用活动 palette；前端通过现有 color-config 启动加载/防抖同步链路与后台共享配置，顶部按钮和右侧面板调用同一个模式切换入口。

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Node.js ESM `.mjs`, 原子 JSON 配置写入。

**Spec:** `docs/superpowers/specs/2026-11-28-custom-canvas-theme-design.md`

## Global Constraints

- 自定义默认背景必须为 `#192586`。
- `CanvasThemeMode` 只允许 `light`、`dark`、`custom`；旧配置缺省仍回退浅色。
- 自定义背景和自定义 palette 写入 `settings/color-config.json`，不写入模型 JSON 的 `canvasBackgroundColor`。
- 浅色/深色现有 token 和标准 palette 行为保持兼容。
- 右侧模式选择和顶部循环按钮必须使用同一个切换入口，并清除当前模型显式背景色。
- 后台配置读写继续使用现有空间路径、原子写和防抖保存队列。
- 后端仍以 Node 24 为下限；`.mjs` 测试只能写纯 JavaScript。

## Review Focus

- 自定义背景切换后网格、标尺、文字和选中框仍可读；测试动态 token 和对比度门槛。
- 自定义 palette 不能被浅/深主题解析逻辑误替换；测试活动 palette 与标准 palette 隔离。
- 旧版 `color-config.json` 和 localStorage 缺少新增字段时必须补默认值且不覆盖已有标准配色。
- 顶部循环切换、右侧三项选择和颜色输入不能产生不同状态；测试两个入口都走统一 setter。
- SVG 导出请求传入 `themeMode=custom` 时不能被后端拒绝，且使用同一份自定义背景/配色。

### Task 1: 扩展主题与颜色领域模型

**Files:**
- Modify: `src/canvasTheme.ts`
- Modify: `src/model.ts`
- Modify: `src/themedColors.ts`
- Test: `src/canvasTheme.test.ts`
- Test: `src/themedColors.test.ts`
- Test: `src/voltageLevelColors.test.ts`

**Interfaces:**
- Produce `CanvasThemeMode = "light" | "dark" | "custom"`.
- Produce `CUSTOM_CANVAS_BACKGROUND = "#192586"` and `DEFAULT_CUSTOM_COLOR_PALETTE`/`DEFAULT_CUSTOM_THEME`.
- Produce `customCanvasThemeColorsFor(background?: string)` and extend theme/background helpers to accept `custom`.
- Extend `resolveThemedPalette(palette, theme)` so `custom` returns the normalized palette as already-resolved values.

- [ ] **Step 1: Write failing tests** for custom mode normalization, default background, custom token contrast, custom palette pass-through, and custom voltage/energy default key sets.
- [ ] **Step 2: Run focused tests** with `pnpm vitest run src/canvasTheme.test.ts src/themedColors.test.ts src/voltageLevelColors.test.ts`; confirm the new cases fail.
- [ ] **Step 3: Implement** the three-mode union, dynamic custom token generation, background-aware glyph/measurement color fallback, and custom palette resolution without changing light/dark literals.
- [ ] **Step 4: Run the same focused tests** and confirm all pass.

### Task 2: Extend color-config persistence and active palette state

**Files:**
- Modify: `src/appExtracted/appCoreCanvasUtilities.tsx`
- Modify: `src/appExtracted/appPersistenceLibraryExport.tsx`
- Modify: `src/appExtracted/appToolbarHookFactories.tsx`
- Modify: `src/App.tsx`
- Modify: `src/userCustomizations.ts`
- Modify: `src/appExtracted/appUserCustomizationFactories.tsx`
- Test: `src/appPersistenceLibraryExport.test.ts`
- Test: `src/appToolbarHookFactories.test.ts`
- Test: `src/userCustomizations.test.ts`

**Interfaces:**
- Produce normalized `BackendColorConfigResponse` fields `canvasThemeMode` and `customTheme`.
- Extend `serializeColorConfigForStorage` to serialize standard palette, custom theme mode, custom background and custom palette.
- Keep `__appScope.colorPalette` as the active palette; add mode-aware palette setters for standard/custom storage.

- [ ] **Step 1: Add failing persistence tests** for old payload normalization, new payload round-trip, independent custom palette, and local fallback.
- [ ] **Step 2: Run the affected persistence/customization tests** and verify the new assertions fail.
- [ ] **Step 3: Implement** storage keys, normalized types, startup loading, localStorage fallback, backend synchronization, and user-customization snapshot preservation.
- [ ] **Step 4: Run the affected tests** and confirm the color state remains isolated by mode.

### Task 3: Add the three-mode UI and palette editing behavior

**Files:**
- Modify: `src/appExtracted/appTopbar.tsx`
- Modify: `src/appExtracted/appRightPanel.tsx`
- Modify: `src/appExtracted/appCanvasDialogs.tsx`
- Modify: `src/appExtracted/appMeasurementDomainFactories.tsx`
- Modify: `src/App.tsx`
- Test: `src/appExtracted/appTopbar.test.ts`
- Test: `src/appExtracted/appRightPanel.test.tsx`
- Test: `src/appExtracted/appCanvasArea.test.tsx`

**Interfaces:**
- Produce one scope callback for cycling `light → dark → custom → light` and one shared setter used by the right panel.
- Right-panel background row exposes `白色` / `黑色` / `自定义`; custom mode renders a color input bound to `customTheme.background`.
- Palette dialog loads/saves the active mode palette and resets custom defaults independently.

- [ ] **Step 1: Update failing source/interaction tests** for the three options, icon/ARIA state, custom color input, and mode-specific palette save/reset.
- [ ] **Step 2: Run `pnpm vitest run src/appExtracted/appTopbar.test.ts src/appExtracted/appRightPanel.test.tsx src/appExtracted/appCanvasArea.test.tsx`** and confirm the new expectations fail.
- [ ] **Step 3: Implement** the shared mode setter, topbar cycle, right-panel control, custom color input, and palette dialog routing.
- [ ] **Step 4: Run the same tests** and confirm the UI contracts pass.

### Task 4: Make SVG export and backend color config custom-theme aware

**Files:**
- Modify: `server/measurementConfigNormalization.mjs`
- Modify: `server/server.mjs`
- Modify: `server/apiV1Schemes.mjs`
- Modify: `server/svgExport.mjs`
- Modify: `src/export/svg.ts`
- Modify: `src/appExtracted/appExportImportFactories.tsx`
- Modify: `server/swaggerPage.mjs`
- Test: `server/test/measurementConfigNormalization.test.mjs`
- Test: `server/test/apiInternal.test.mjs`
- Test: `server/test/svgExport.test.mjs`
- Test: `server/test/swigger.examples.test.mjs`
- Test: `src/appExtracted/appExportBackend.test.ts`

**Interfaces:**
- `normalizeColorConfig()` returns `canvasThemeMode` and normalized `customTheme` with defaults.
- `/v1/schemes/model/export` accepts `themeMode=custom`.
- `renderSavedModelSvg()` passes custom background and custom palette to `buildSvgDocument`.
- `CanvasRenderOptions` and `buildSvgDocument()` accept the custom theme background without changing the light export baseline.

- [ ] **Step 1: Add failing server/frontend export tests** for config normalization, custom export query, and custom SVG background/palette.
- [ ] **Step 2: Run focused server and export tests** and confirm the new cases fail.
- [ ] **Step 3: Implement** server normalization/defaults, custom query validation, custom palette/background selection, SVG renderer support, and Swagger examples.
- [ ] **Step 4: Run `pnpm vitest run server/test/measurementConfigNormalization.test.mjs server/test/apiInternal.test.mjs server/test/svgExport.test.mjs server/test/swigger.examples.test.mjs src/appExtracted/appExportBackend.test.ts`** and confirm all pass.

### Task 5: Verify the complete change and update project contracts

**Files:**
- Modify: `docs/FRONTEND-INTERNAL-API-CONTRACT.md` if the color-config payload is documented there.
- Modify: `docs/MODEL_EXPORT_API.md` if the themeMode query enum is documented there.
- Modify: affected tests from Tasks 1–4 only when verification exposes a contract mismatch.

- [ ] **Step 1: Run `pnpm tsc --noEmit`** and resolve type errors from the three-mode union and new payload fields.
- [ ] **Step 2: Run `git diff --check`** and inspect the final diff, keeping unrelated `CLAUDE.md` changes untouched.
- [ ] **Step 3: Run `pnpm vitest run` once as the final full-suite verification**, record the exit code and failure count, and report any baseline failures separately.
- [ ] **Step 4: Confirm backend restart requirement** for changed `src/**/*.ts` before any manual export verification.
