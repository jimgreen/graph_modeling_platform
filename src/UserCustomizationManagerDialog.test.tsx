import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { UserCustomizationManagerDialog } from "./UserCustomizationManagerDialog";
import type {
  UserCustomizationDomain,
  UserCustomizationImportConflict,
  UserCustomizationImportMode,
  UserCustomizationInventory
} from "./userCustomizations";

// 一个已经不在 USER_CUSTOMIZATION_DOMAIN_OPTIONS 里的历史域 id。
// 它同时落在 L120（冲突行的域标签兜底）与 L185（当前分类标题兜底）的右臂上。
const RETIRED_DOMAIN = "legacy-devices" as unknown as UserCustomizationDomain;

// 取包裹某个导入方式文案的那个 <label ...> 开标签，用来断言 active 类挂在哪一侧。
const importModeLabelTag = (html: string, text: string) => {
  const at = html.indexOf(text);
  if (at < 0) throw new Error(`未找到导入方式文案: ${text}`);
  const start = html.lastIndexOf("<label", at);
  if (start < 0) throw new Error(`未找到文案所属的 label: ${text}`);
  return html.slice(start, html.indexOf(">", start) + 1);
};

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

// ---------------------------------------------------------------------
// dispatcher 夹具：直接调用组件函数，按 useState 调用序号喂 state。
// renderToStaticMarkup 不派发事件，state 恒为初值，跑不到 L169/L170 这类
// 「组件内部 state 决定」的过滤分支（见 §6.21）。
// ---------------------------------------------------------------------
type FeedState = [unknown, unknown, unknown];

const renderWithState = (states: FeedState, props = baseProps()) => {
  const internals = (React as unknown as {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H?: unknown };
  }).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (!internals) {
    // 显式抛错：静默跳过 = 恒绿，正是本仓反复消灭的假绿。
    throw new Error("取不到 React internals.H，无法注入 useState state");
  }
  const previous = internals.H;
  let index = 0;
  internals.H = {
    useState: (initial: unknown) => {
      const current = index;
      index += 1;
      if (current >= states.length) {
        throw new Error(`useState #${current + 1} 没有喂 state：组件新增了 useState`);
      }
      if (states[current] === undefined && initial !== undefined) {
        throw new Error(`useState #${current + 1} 喂了 undefined，会与「保持初值」混淆`);
      }
      return [states[current], () => undefined];
    },
    useEffect: () => undefined,
    useMemo: (factory: () => unknown) => factory()
  };
  let tree: unknown;
  try {
    tree = (UserCustomizationManagerDialog as unknown as (p: unknown) => unknown)(props);
    // 守卫 hook 数量：组件增删 useState 时序号会整体错位。
    expect(index).toBe(3);
  } finally {
    // 必须先还原槽位再交给 SSR，否则服务端渲染会撞上我们这份残缺 dispatcher。
    internals.H = previous;
  }
  return renderToStaticMarkup(tree as never);
};

// 只取 tbody 里每行那个勾选框的 aria-label（即 `选择${item.name}`），
// 不能只按 aria-label 匹配 —— 表头的「选择当前列表全部可恢复项目」也会命中。
const rowKeys = (html: string) => Array.from(
  html.matchAll(/<td class="selection-column"><input[^>]*aria-label="([^"]*)"/gu)
).map((m) => m[1]);

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

  test("highlights only the selected import mode", () => {
    const html = renderToStaticMarkup(createElement(UserCustomizationManagerDialog, {
      ...baseProps(),
      pendingImport: {
        fileName: "backup.json",
        imported: {},
        mode: "incremental" as UserCustomizationImportMode,
        preview: {
          mode: "incremental" as UserCustomizationImportMode,
          target: {} as any,
          additions: 1,
          updates: 1,
          unchanged: 1,
          conflicts: []
        }
      }
    }));

    // 选中态只能落在"增量更新"上，"整体替换"必须是空 class。
    // 两条断言互为反面：任何一边恒真都说明断言没咬住分支。
    expect(importModeLabelTag(html, "整体替换")).not.toContain("active");
    expect(importModeLabelTag(html, "增量更新")).toContain('class="active"');
  });

  test("falls back to the raw domain id for an unknown conflict domain", () => {
    const html = renderToStaticMarkup(createElement(UserCustomizationManagerDialog, {
      ...baseProps(),
      pendingImport: {
        fileName: "backup.json",
        imported: {},
        mode: "replace" as UserCustomizationImportMode,
        preview: {
          mode: "replace" as UserCustomizationImportMode,
          target: {} as any,
          additions: 1,
          updates: 1,
          unchanged: 0,
          conflicts: [{
            domain: RETIRED_DOMAIN,
            importedId: "imported-1",
            localId: "local-1",
            name: "重复名称"
          } satisfies UserCustomizationImportConflict]
        }
      }
    }));

    // 未登记的域必须原样显示 id，而不是显示成某个中文标签。
    expect(html).toContain("<td>legacy-devices</td>");
    expect(html).not.toContain("<td>自定义元件</td>");
  });

  test("falls back to the raw activeDomain id for an unknown domain", () => {
    const html = renderToStaticMarkup(createElement(UserCustomizationManagerDialog, {
      ...baseProps(),
      activeDomain: RETIRED_DOMAIN
    }));

    expect(html).toContain("<h3>legacy-devices</h3>");
    expect(html).not.toContain("<h3>自定义元件</h3>");
  });

  // 这条同时是 dispatcher 夹具的**自测**。
  // 它证明喂进去的 state 真的被组件读到了：若 useState 桩不写格子
  // （改成返回 initial 而非 states[current]），下面两次渲染结果会完全相同，
  // 这条断言立刻转红 —— 即夹具退化了会响亮失败，而不是让上游断言恒绿。
  test("dispatcher harness self-check: a fed slot really reaches the component", () => {
    const items: UserCustomizationInventory["items"] = [
      { key: "custom-devices:a", domain: "custom-devices", itemId: "a", name: "甲", owner: "o", changeType: "added", summary: "s" },
      { key: "custom-devices:b", domain: "custom-devices", itemId: "b", name: "乙", owner: "o", changeType: "modified", summary: "s" }
    ];
    const props = { ...baseProps(), inventory: { ...inventory, items } };

    const byFilter = rowKeys(renderWithState(["", "modified", []], props));
    const byQuery = rowKeys(renderWithState(["甲", "all", []], props));

    // 两个不同的喂法必须产出**不同**的行集合，否则说明 state 没被注入。
    expect(byFilter).toEqual(["选择乙"]);
    expect(byQuery).toEqual(["选择甲"]);
    expect(byFilter).not.toEqual(byQuery);
    // 槽位 #0（query）喂空串时不该过滤任何行 —— 证明 #0 读的是 query 而非 #1。
    expect(rowKeys(renderWithState(["", "all", []], props))).toEqual(["选择甲", "选择乙"]);
  });

  test("filters rows by the change-type filter state", () => {
    const items: UserCustomizationInventory["items"] = [
      { key: "custom-devices:a", domain: "custom-devices", itemId: "a", name: "甲", owner: "o", changeType: "added", summary: "s" },
      { key: "custom-devices:b", domain: "custom-devices", itemId: "b", name: "乙", owner: "o", changeType: "modified", summary: "s" },
      { key: "custom-devices:c", domain: "custom-devices", itemId: "c", name: "丙", owner: "o", changeType: "protected", summary: "s" }
    ];
    const filterInventory: UserCustomizationInventory = { ...inventory, items };
    const props = { ...baseProps(), inventory: filterInventory };

    // changeFilter 来自组件内部 useState，renderToStaticMarkup 永远给初值 "all"，
    // 只有注入 state 才跑得到 L169 的 `item.changeType === changeFilter` 那一支。
    expect(rowKeys(renderWithState(["", "modified", []], props))).toEqual(["选择乙"]);
    // 对照：换成 "added" 必须筛出另一条，两侧默认值不同 → 断言有鉴别力。
    expect(rowKeys(renderWithState(["", "added", []], props))).toEqual(["选择甲"]);
    expect(rowKeys(renderWithState(["", "all", []], props))).toEqual(["选择甲", "选择乙", "选择丙"]);
  });

  test("filters rows by the search query state", () => {
    const items: UserCustomizationInventory["items"] = [
      { key: "custom-devices:x", domain: "custom-devices", itemId: "x", name: "配网交换机", owner: "用户类别", changeType: "added", summary: "自定义元件" },
      { key: "custom-devices:y", domain: "custom-devices", itemId: "y", name: "断路器", owner: "用户类别", changeType: "added", summary: "自定义元件" },
      { key: "custom-devices:z", domain: "custom-devices", itemId: "z", name: "POWER-SUPPLY", owner: "用户类别", changeType: "added", summary: "自定义元件" }
    ];
    const props = { ...baseProps(), inventory: { ...inventory, items } };

    // query 非空 → L170 的 `!needle ||` 短路失败，才求值 normalizedSearchText(...).includes(needle)。
    expect(rowKeys(renderWithState(["配网", "all", []], props))).toEqual(["选择配网交换机"]);
    // 摘要字段（summary）也在检索范围内，不只是 name。
    expect(rowKeys(renderWithState(["断路器", "all", []], props))).toEqual(["选择断路器"]);
    // `.trim()`：查询串两侧留白必须先折叠掉，否则 needle 匹配不到任何行。
    expect(rowKeys(renderWithState(["  断路器  ", "all", []], props))).toEqual(["选择断路器"]);
    // `.toLocaleLowerCase()` 折在被检索的一侧：条目名是全大写、查询是小写。
    // 若去掉折叠，needle 变小写而 haystack 保持大写 → 反而匹配不到。
    expect(rowKeys(renderWithState(["power-supply", "all", []], props))).toEqual(["选择POWER-SUPPLY"]);
    // `String(value ?? "")` 的右臂：query 为 nullish 时 needle 必须是空串而不是 "null"。
    // 删掉 `?? ""` 会让 needle 变成 "null"，两行都不含它 → 表格清空。
    expect(rowKeys(renderWithState([null, "all", []], props))).toEqual(["选择配网交换机", "选择断路器", "选择POWER-SUPPLY"]);
  });

  test("shows the empty-conflict note instead of the table when there are none", () => {
    const html = renderToStaticMarkup(createElement(UserCustomizationManagerDialog, {
      ...baseProps(),
      pendingImport: {
        fileName: "backup.json",
        imported: {},
        mode: "replace" as UserCustomizationImportMode,
        preview: {
          mode: "replace" as UserCustomizationImportMode,
          target: {} as any,
          additions: 0,
          updates: 0,
          unchanged: 3,
          conflicts: []
        }
      }
    }));

    expect(html).toContain("未发现同名不同 ID 冲突。");
    expect(html).not.toContain("<thead><tr><th>分类</th>");
  });
});
