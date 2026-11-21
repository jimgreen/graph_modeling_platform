import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { createRenderProjectSchemeNode } from "./appExtracted/appDeviceDefinitionFactories";

const EmptyIcon = () => null;

function projectTreeScope(loadingModel: { projectId: string; progress: number } | null) {
  const scope: Record<string, any> = {
    Cable: EmptyIcon,
    ChevronDown: EmptyIcon,
    ChevronRight: EmptyIcon,
    Factory: EmptyIcon,
    FileJson: EmptyIcon,
    FolderOpen: EmptyIcon,
    HousePlug: EmptyIcon,
    Network: EmptyIcon,
    activeProjectKey: "",
    endProjectTreeSortDrag: vi.fn(),
    expandedSchemeIds: ["scheme:1"],
    handleProjectTreeDragLeave: vi.fn(),
    handleProjectTreeDragOver: vi.fn(),
    handleProjectTreeDrop: vi.fn(),
    isEditMode: false,
    libraryTreeOrder: null,
    loadingModel,
    projectModelTypeFilter: [],
    projectSearchNeedle: "",
    projectTreeDropKey: "",
    requestLoadSavedProject: vi.fn(),
    selectSingleProject: vi.fn(),
    selectSingleScheme: vi.fn(),
    selectedProjectId: "",
    selectedProjectIds: [],
    selectedSchemeId: "scheme:1",
    selectedSchemeIds: [],
    setInspectorTab: vi.fn(),
    setProjectMenu: vi.fn(),
    startProjectTreeSortDrag: vi.fn(),
    toggleProjectSelection: vi.fn(),
    toggleSchemeExpanded: vi.fn(),
    toggleSchemeSelection: vi.fn()
  };
  scope.__appScopeRef = { current: scope };
  return scope;
}

describe("project model tree loading indicator", () => {
  test("renders a determinate progress bar only on the model being loaded", () => {
    const scope = projectTreeScope({ projectId: "model:station", progress: 55 });
    const scheme = {
      id: "scheme:1",
      name: "方案",
      projects: [
        { id: "model:station", name: "厂站模型", project: { modelType: "厂站" } },
        { id: "model:microgrid", name: "微网模型", project: { modelType: "微网" } }
      ],
      children: []
    };
    const renderProjectSchemeNode = createRenderProjectSchemeNode(scope);

    const markup = renderToStaticMarkup(renderProjectSchemeNode(scheme as never));

    expect(markup.match(/class="project-option-loading-progress"/g) ?? []).toHaveLength(1);
    expect(markup).toContain('aria-label="正在加载模型：厂站模型"');
    expect(markup).toContain('max="100"');
    expect(markup).toContain('value="55"');
    expect(markup).not.toContain('aria-label="正在加载模型：微网模型"');
  });
});
