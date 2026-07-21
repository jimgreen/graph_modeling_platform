import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { UserCustomizationManagerDialog } from "./UserCustomizationManagerDialog";
import type { UserCustomizationInventory } from "./userCustomizations";

const inventory: UserCustomizationInventory = {
  items: [
    {
      key: "custom-devices:custom-source",
      domain: "custom-devices",
      itemId: "custom-source",
      name: "自定义电源",
      owner: "用户类别",
      changeType: "added",
      summary: "新增自定义元件"
    },
    {
      key: "user-assets:img-used",
      domain: "user-assets",
      itemId: "img-used",
      name: "被引用图片",
      owner: "默认文件夹",
      changeType: "protected",
      summary: "被现有模型引用，恢复时保留",
      protected: true
    }
  ],
  countsByDomain: {
    "category-libraries": 0,
    "component-libraries": 0,
    "custom-devices": 1,
    "device-definition-overrides": 0,
    "parameter-definitions": 0,
    "measurement-definitions": 0,
    "e-interface-definitions": 0,
    "graph-templates": 0,
    "user-assets": 1,
    "color-settings": 0
  },
  summary: { total: 2, added: 1, modified: 0, assets: 1 }
};

const baseProps = () => ({
  open: true,
  inventory,
  activeDomain: "custom-devices" as const,
  busy: false,
  status: "",
  pendingImport: null,
  onClose: vi.fn(),
  onDomainChange: vi.fn(),
  onExport: vi.fn(),
  onChooseImport: vi.fn(),
  onImportModeChange: vi.fn(),
  onConfirmImport: vi.fn(),
  onCancelImport: vi.fn(),
  onRestore: vi.fn()
});

describe("UserCustomizationManagerDialog", () => {
  test("renders the approved tree-table layout and top-level actions", () => {
    const html = renderToStaticMarkup(createElement(UserCustomizationManagerDialog, baseProps()));

    expect(html).toContain("用户自定义管理");
    expect(html).toContain("导出全部");
    expect(html).toContain("导入配置");
    expect(html).toContain("恢复所选");
    expect(html).toContain("恢复全部默认");
    expect(html).toContain("自定义元件");
    expect(html).toContain("自定义电源");
  });

  test("renders replacement and incremental choices in import preview", () => {
    const props = baseProps();
    const html = renderToStaticMarkup(createElement(UserCustomizationManagerDialog, {
      ...props,
      pendingImport: {
        fileName: "backup.json",
        imported: {},
        mode: "replace" as const,
        preview: {
          mode: "replace" as const,
          target: {} as any,
          additions: 2,
          updates: 3,
          unchanged: 4,
          conflicts: [{ domain: "custom-devices" as const, importedId: "new", localId: "old", name: "重复名称" }]
        }
      }
    }));

    expect(html).toContain("backup.json");
    expect(html).toContain("整体替换");
    expect(html).toContain("增量更新");
    expect(html).toMatch(/冲突\s*<strong>1<\/strong>/u);
    expect(html).toContain("确认导入");
  });

  test("renders nothing while closed", () => {
    const html = renderToStaticMarkup(createElement(UserCustomizationManagerDialog, {
      ...baseProps(),
      open: false
    }));

    expect(html).toBe("");
  });
});
