import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { MODEL_TYPES } from "./model";
import { createRenderProjectPanel } from "./appExtracted/appRenderPanels";

const Icon = () => createElement("span");

const renderEmptyProjectPanel = (loaded: boolean) => renderToStaticMarkup(createElement(
  createRenderProjectPanel({
    Search: Icon,
    X: Icon,
    MODEL_TYPES,
    backendSchemesLoadedRef: { current: loaded },
    filteredProjectSchemes: [],
    openBlankProjectLibraryContextMenu: () => undefined,
    projectListPointerInsideRef: { current: false },
    projectModelTypeFilter: [],
    projectSearchQuery: "",
    renderProjectSchemeNode: () => null,
    schemes: [],
    setProjectModelTypeFilter: () => undefined,
    setProjectSearchQuery: () => undefined
  })
));

describe("model library empty state", () => {
  test("shows automatic recovery while the backend has not loaded", () => {
    expect(renderEmptyProjectPanel(false)).toContain("正在连接模型库，恢复后将自动加载...");
    expect(renderEmptyProjectPanel(false)).not.toContain(">暂无方案<");
  });

  test("shows a genuine empty directory only after a successful backend load", () => {
    expect(renderEmptyProjectPanel(true)).toContain(">暂无方案<");
    expect(renderEmptyProjectPanel(true)).not.toContain("正在连接模型库");
  });
});
