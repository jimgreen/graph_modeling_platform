import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, test, vi } from "vitest";
import {
  createStopNodeDoubleClickDialogEvent,
  createStopSidePanelEventPropagation
} from "./appCanvasInteractionFactories";
import { createStopDeviceLibraryDialogEvent } from "./appDeviceDefinitionFactories";

const SRC_ROOT = resolve(process.cwd(), "src");

function collectProductionSourceFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", ".worktrees", "dist", "tmp"].includes(entry.name)) {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectProductionSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}

const MUTABLE_SCOPE_STATE_KEYS = new Set([
  "nodes",
  "edges",
  "schemes",
  "activeProjectKey",
  "activeSchemeKey",
  "saveRequired",
  "canExportCurrentModel",
  "selectedIds",
  "selectedEdgeId",
  "projectName",
  "layers",
  "activeLayerId",
  "measurements",
  "colorDisplayMode",
  "themeMode",
  "deviceLabelsVisible",
  "deviceMeasurementsVisible",
  "customDeviceTemplates",
  "deviceDefinitionOverrides",
  "currentSpaceId",
  "spaces"
]);

describe("深层运行时缺陷静态与行为守卫 (Runtime Bug Guards)", () => {
  test("全仓 async 函数在 await 恢复后不得读取入口解构自 __appScope/scope 的陈旧状态", () => {
    const violations: string[] = [];

    for (const filePath of collectProductionSourceFiles(SRC_ROOT)) {
      const sourceText = readFileSync(filePath, "utf8");
      if (!sourceText.includes("await ")) continue;

      const sf = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      const visit = (node: ts.Node) => {
        if (
          (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) &&
          node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) &&
          node.body &&
          ts.isBlock(node.body)
        ) {
          const destructured = new Map<string, string>();
          let firstAwaitEnd = -1;

          const scanBody = (child: ts.Node) => {
            if (
              child !== node &&
              (ts.isArrowFunction(child) || ts.isFunctionExpression(child) || ts.isFunctionDeclaration(child))
            ) {
              return;
            }
            if (
              firstAwaitEnd === -1 &&
              ts.isVariableDeclaration(child) &&
              child.initializer &&
              ts.isIdentifier(child.initializer) &&
              (child.initializer.text === "__appScope" || child.initializer.text === "scope") &&
              ts.isObjectBindingPattern(child.name)
            ) {
              for (const el of child.name.elements) {
                const propName =
                  el.propertyName && ts.isIdentifier(el.propertyName)
                    ? el.propertyName.text
                    : ts.isIdentifier(el.name)
                      ? el.name.text
                      : "";
                const localName = ts.isIdentifier(el.name) ? el.name.text : "";
                if (MUTABLE_SCOPE_STATE_KEYS.has(propName) && localName) {
                  destructured.set(localName, propName);
                }
              }
            }
            if (firstAwaitEnd === -1 && ts.isAwaitExpression(child)) {
              firstAwaitEnd = child.getEnd();
            }
            if (
              firstAwaitEnd !== -1 &&
              child.getStart() > firstAwaitEnd &&
              ts.isIdentifier(child) &&
              destructured.has(child.text)
            ) {
              const parent = child.parent;
              const isPropAccessName = ts.isPropertyAccessExpression(parent) && parent.name === child;
              const isPropAssignName = ts.isPropertyAssignment(parent) && parent.name === child;
              if (!isPropAccessName && !isPropAssignName) {
                const { line } = sf.getLineAndCharacterOfPosition(child.getStart());
                const rel = relative(process.cwd(), filePath).replace(/\\/g, "/");
                violations.push(
                  `${rel}:${line + 1} 在 await 后读取了旧帧闭包变量 '${child.text}' (__appScope.${destructured.get(child.text)})`
                );
              }
            }
            ts.forEachChild(child, scanBody);
          };

          scanBody(node.body);
        }
        ts.forEachChild(node, visit);
      };

      visit(sf);
    }

    expect(violations).toEqual([]);
  });

  test("appView.tsx 中 MemoizedViewSection (recent-glyphs / topology-warning) 必须包含全部关键重渲染 inputs", () => {
    const appViewPath = resolve(SRC_ROOT, "appExtracted/appView.tsx");
    const sourceText = readFileSync(appViewPath, "utf8");
    const sf = ts.createSourceFile(appViewPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const sectionInputs = new Map<string, string>();
    const visit = (node: ts.Node) => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sf) === "MemoizedViewSection") {
        let sectionName = "";
        let inputsText = "";
        for (const prop of node.attributes.properties) {
          if (!ts.isJsxAttribute(prop) || !prop.initializer) continue;
          const attrName = prop.name.getText(sf);
          if (attrName === "section" && ts.isStringLiteral(prop.initializer)) {
            sectionName = prop.initializer.text;
          } else if (attrName === "inputs") {
            inputsText = prop.initializer.getText(sf);
          }
        }
        if (sectionName) {
          sectionInputs.set(sectionName, inputsText);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);

    const recentGlyphInputs = sectionInputs.get("recent-glyphs") ?? "";
    for (const requiredKey of [
      "recentGlyphKinds",
      "hasActiveModel",
      "libraryTemplates",
      "colorDisplayMode",
      "colorPalette",
      "themeMode"
    ]) {
      expect(recentGlyphInputs, `recent-glyphs 缺少依赖 ${requiredKey}`).toContain(requiredKey);
    }

    const topologyWarningInputs = sectionInputs.get("topology-warning") ?? "";
    for (const requiredKey of [
      "topologyWarningPanelVisible",
      "topologyFilteredErrors",
      "topologyWarningCategory",
      "topologyWarningStatus"
    ]) {
      expect(topologyWarningInputs, `topology-warning 缺少依赖 ${requiredKey}`).toContain(requiredKey);
    }
  });

  test("侧栏与三大浮窗事件停止器必须拦截容器内部事件并放行 document.body Portal 子弹层事件", () => {
    class MockNode {
      children: MockNode[] = [];
      appendChild(child: MockNode) {
        this.children.push(child);
        return child;
      }
      contains(target: unknown): boolean {
        if (target === this) return true;
        return this.children.some((c) => c.contains(target));
      }
    }

    const previousNode = (globalThis as any).Node;
    (globalThis as any).Node = MockNode;
    try {
      const panelHost = new MockNode();
      const insideButton = panelHost.appendChild(new MockNode());
      const portalPopup = new MockNode();

      const finishDoubleClickOp = vi.fn();
      const finishLibraryOp = vi.fn();

      const stopSidePanel = createStopSidePanelEventPropagation({} as any);
      const stopDoubleClickDialog = createStopNodeDoubleClickDialogEvent({
        finishNodeDoubleClickDialogPointerOperation: finishDoubleClickOp
      } as any);
      const stopDeviceLibraryDialog = createStopDeviceLibraryDialogEvent({
        finishDeviceLibraryDialogPointerOperation: finishLibraryOp
      } as any);

      // 1. 容器外 Portal 弹层事件必须放行（不调用 stopPropagation）
      for (const handler of [stopSidePanel, stopDoubleClickDialog, stopDeviceLibraryDialog]) {
        const stopPropagation = vi.fn();
        handler({
          type: "pointerup",
          target: portalPopup,
          currentTarget: panelHost,
          stopPropagation
        } as any);
        expect(stopPropagation).not.toHaveBeenCalled();
      }
      expect(finishDoubleClickOp).not.toHaveBeenCalled();
      expect(finishLibraryOp).not.toHaveBeenCalled();

      // 2. 容器内子元素事件必须正常截断冒泡
      for (const handler of [stopSidePanel, stopDoubleClickDialog, stopDeviceLibraryDialog]) {
        const stopPropagation = vi.fn();
        handler({
          type: "pointerup",
          target: insideButton,
          currentTarget: panelHost,
          stopPropagation
        } as any);
        expect(stopPropagation).toHaveBeenCalledTimes(1);
      }
      expect(finishDoubleClickOp).toHaveBeenCalledTimes(1);
      expect(finishLibraryOp).toHaveBeenCalledTimes(1);
    } finally {
      (globalThis as any).Node = previousNode;
    }
  });

  test("画布交互期必须具备暂停 CSS 电流流水线动画的降载样式规则", () => {
    const css = readFileSync(resolve(SRC_ROOT, "styles.css"), "utf8");
    expect(css).toContain(".diagram-canvas.panning .electric-flow-arrow");
    expect(css).toContain(".diagram-canvas.multi-node-dragging .electric-flow-arrow");
    expect(css).toContain("animation-play-state: paused !important");
  });

  test("首屏核心入口不得顶层静态 import 低频重型导入器 (svgModelImport / dotImport)", () => {
    const entryFiles = [
      "App.tsx",
      "sharedIconLibrary.ts",
      "appExtracted/appStaticScope.ts",
      "appExtracted/appCanvasViewportBatch.tsx",
      "appExtracted/appStateBatch.tsx"
    ];
    for (const rel of entryFiles) {
      const content = readFileSync(resolve(SRC_ROOT, rel), "utf8");
      const staticImportHit = /^\s*import\s+(?!type\b).*from\s+["'][^"']*(?:svgModelImport|dotImport)["']/m.test(
        content
      );
      expect(staticImportHit, `${rel} 仍存在对 svgModelImport/dotImport 的顶层静态导入`).toBe(false);
    }
  });
});
