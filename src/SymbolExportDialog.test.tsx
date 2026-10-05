// 【导出图元 Symbol】弹窗的静态渲染契约：关闭即不渲染；打开时四块区域齐全、
// 预设过滤勾选框与真实图元树都能装配出来，且图元树只出现中文名。
//
// 仓库没有 jsdom / @testing-library（组件测试一律 renderToStaticMarkup），
// 故交互语义（多选、层级全选、过滤与搜索的与关系）由纯逻辑测试覆盖
// （src/symbolExportSvg.test.ts）；「已选图元」清单抽成导出组件
// （SymbolExportSelectedList）后即可直接静态渲染验证，这里钉「结构 + 文案 + 装配不炸」。
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SymbolExportDialog, SymbolExportSelectedList } from "./SymbolExportDialog";
import { DEVICE_LIBRARY, type DeviceTemplate } from "./model";
import { groupDeviceTemplatesByCategoryLibraryAndComponentLibrary } from "./appExtracted/appPersistenceLibraryExport";
import {
  DEFAULT_SYMBOL_EXPORT_FILTER_KEYS,
  SYMBOL_EXPORT_FILTERS,
  filterSymbolExportTemplates
} from "./symbolExportSvg";

const render = (props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(SymbolExportDialog as never, {
      open: true,
      onClose: () => undefined,
      categoryLibraries: ["交流设备"],
      groupedByComponentLibrary: groupDeviceTemplatesByCategoryLibraryAndComponentLibrary(DEVICE_LIBRARY),
      schemes: [],
      onSaveScheme: () => undefined,
      onDeleteScheme: () => undefined,
      onExport: () => undefined,
      ...props
    } as never)
  );

describe("SymbolExportDialog", () => {
  test("open 为假时不渲染任何内容", () => {
    expect(render({ open: false })).toBe("");
  });

  test("打开时渲染图元树 / 预设过滤 / 已选图元 / 导出方案四块区域与导出按钮", () => {
    const html = render();

    expect(html).toContain('class="symbol-export-dialog window-close-host"');
    expect(html).toContain("导出图元 Symbol");
    expect(html).toContain('class="symbol-export-tree-column"');
    expect(html).toContain('class="symbol-export-side"');
    expect(html).toContain("预设过滤");
    expect(html).toContain("已选图元");
    expect(html).toContain("导出方案");
    // 四块区域都要在，缺一块说明布局退化成了单列
    expect(html).toContain("symbol-export-layout");
    expect(html).toContain("symbol-export-footer");
  });

  test("图元树只出现中文名：类标识（如 ACBreak）不得落进 DOM", () => {
    const html = render();

    // 类行显示中文名
    expect(html).toContain("交流断路器");
    // 类标识只作 React key / 内部判据，不能作为可见文案或 title 泄漏出去
    expect(html).not.toContain("ACBreak");
    // 图元行原先会跟一个英文 kind 小字，改为中文名后树里不再有 <small>
    const tree = html.slice(
      html.indexOf('class="symbol-export-tree-column"'),
      html.indexOf('class="symbol-export-side"')
    );
    expect(tree).toMatch(/class="symbol-export-row component"/);
    expect(tree).not.toContain("<small>");
  });

  test("图元树按层级缩进：类别库 → 类 → 图元，每层标签拉开一个完整步长", () => {
    // 造一个派生类（挂在 ACBreak 下）才能测到「派生类」那一层。
    const html = render({
      customComponentLibraries: [
        {
          name: "my-breaker",
          label: "我的断路器",
          categoryLibraryName: "交流设备",
          derivedFromComponentLibrary: "ACBreak"
        }
      ]
    });
    const tree = html.slice(
      html.indexOf('class="symbol-export-tree-column"'),
      html.indexOf('class="symbol-export-side"')
    );

    const indents = [...tree.matchAll(/padding-left:(\d+)px/g)].map((m) => Number(m[1]));
    expect(indents.length).toBeGreaterThan(0);

    // 渲染出来的行首内边距：类别库 6 / 类 depth 0 = 6+36=42 / 图元 depth 0 = 6+72+21=99
    //（+21 是图元行补上缺失的折叠箭头 16+5）/ 派生类 depth 1 = 6+72=78
    expect(indents).toContain(6);
    expect(indents).toContain(42);
    expect(indents).toContain(99);
    expect(indents).toContain(78);

    // 标签左沿 = 行首 + 39（类 / 类别库行，前面有折叠箭头）或 + 18（图元行，只有勾选框）
    const classLabelX = (indent: number) => indent + 39;
    const componentLabelX = (indent: number) => indent + 18;

    // 回归重点：旧方案三层是 45 / 45 / 42 —— 挤在 3px 内，看起来是平的（用户截图反馈）。
    // 现在每层必须拉开一个完整步长，且「同层级」的标签左沿必须一致。
    expect(classLabelX(42) - classLabelX(6)).toBe(36);
    expect(componentLabelX(99) - classLabelX(42)).toBe(36);
    // 派生类（depth 1）与「父类的图元行」是同一层级 → 标签左沿必须相同
    expect(classLabelX(78)).toBe(componentLabelX(99));

    // 顺带确认派生类那一层真的渲染出来了，否则上面那条同层级断言会变成空转
    const depths = [...tree.matchAll(/data-tree-depth="(\d+)"/g)].map((m) => Number(m[1]));
    expect(depths).toContain(1);
  });

  test("「清空」把过滤清成空集，不再与「全选」等价（回归：点了没反应）", () => {
    // 本仓无 jsdom，点击后「树变没变」跑不出来；这里钉住按钮 → 状态 → 纯过滤函数这条链的两端：
    // 本文件钉「清空 = []」，symbolExportSvg.test.ts 钉「[] = 空集」，合起来才是完整回归护栏。
    const source = readFileSync(new URL("./SymbolExportDialog.tsx", import.meta.url), "utf8");
    expect(source).toContain("onClick={() => handleAllFilters(false)}");
    expect(source).toContain("setActiveFilterKeys(select ? DEFAULT_SYMBOL_EXPORT_FILTER_KEYS : []);");
  });

  test("预设过滤勾选框逐个渲染，且带上数量", () => {
    const html = render();
    for (const filter of SYMBOL_EXPORT_FILTERS) {
      expect(html).toContain(filter.label);
      expect(html).toContain(`aria-label="${filter.label}"`);
    }
  });

  test("真实图元库能装配出三层树：类别库 → 类 → 图元", () => {
    const html = render();
    expect(html).toContain('class="symbol-export-library"');
    expect(html).toContain('class="symbol-export-class-node"');
    // 图元行以 kind 作 title，能拿到具体 kind 才说明树真的装出了叶子
    expect(html).toMatch(/class="symbol-export-row component"/);
  });

  test("搜索框与全选/全部收缩工具齐备", () => {
    const html = render();
    expect(html).toContain('placeholder="搜索类别库/类/图元"');
    expect(html).toContain("全选");
    expect(html).toContain("全部收缩");
  });

  test("方案列表为空时给出空态提示，传入方案后渲染可加载行", () => {
    expect(render({ schemes: [] })).toContain("暂无已保存方案");
    const html = render({
      schemes: [{ id: "s1", name: "开关族", templateKinds: ["ac-breaker"], filterKeys: ["stateful"], updatedAt: "" }]
    });
    expect(html).toContain("开关族");
    expect(html).toContain('aria-label="删除方案 开关族"');
  });

  test("外部状态提示在本地无状态时兜底显示", () => {
    expect(render({ statusMessage: "后端暂无已保存方案。" })).toContain("后端暂无已保存方案。");
  });

  test("关闭按钮带可达名称（与窗口关闭覆盖扫描一致）", () => {
    expect(render()).toContain('aria-label="关闭导出图元Symbol"');
  });

  test("footer 同时渲染两个导出按钮：合并到一个 SVG 中导出 / 独立图元 SVG 导出", () => {
    const html = render();
    const footer = html.slice(html.indexOf('class="symbol-export-footer"'));

    // 两个按钮文案都在，且旧的单字「导出」不再单独出现（避免文案退化回单按钮）
    expect(footer).toContain("合并到一个 SVG 中导出");
    expect(footer).toContain("独立图元 SVG 导出");
    // 主按钮 class 仍标在合并导出上（保留既有主操作视觉）
    expect(footer).toContain('class="primary"');
  });

  test("双导出按钮的禁用判定源码契约：busy / 未接线 / 空选 三条都要在", () => {
    // 2026-09-21 用户实测：组件加了按钮但装配点没传 onExportStandalone → 按钮恒灰。
    // 本仓无 jsdom 点不了按钮、静态渲染下选择恒为空（disabled 无法归因到具体条件），
    // 故按源码钉住两条按钮各自的判定表达式与 onClick 绑定，防止后人改漏。
    const source = readFileSync(new URL("./SymbolExportDialog.tsx", import.meta.url), "utf8");
    expect(source).toContain("disabled={busy || !onExportStandalone || selectedTemplates.length === 0}");
    expect(source).toContain("disabled={busy || selectedTemplates.length === 0}");
    expect(source).toContain("onClick={handleExportStandalone}");
    // 装配点必须真的把回调传进来（漏接线 = 按钮恒灰，正是用户撞到的问题）
    const wiring = readFileSync(new URL("./appExtracted/appDeviceDefinitionDialogs.tsx", import.meta.url), "utf8");
    expect(wiring).toContain("onExportStandalone={(templates) => exportComponentSymbolsStandalone?.(templates)}");
  });
});

describe("SymbolExportSelectedList", () => {
  const renderList = (templates: unknown[], onRemove = () => undefined) =>
    renderToStaticMarkup(
      createElement(SymbolExportSelectedList as never, { templates, onRemove } as never)
    );

  const samples = DEVICE_LIBRARY.filter((template) =>
    ["ac-breaker", "ac-ground-disconnector-vertical"].includes(template.kind)
  );

  test("空清单给出空态提示", () => {
    expect(renderList([])).toContain("尚未选择图元");
  });

  test("每个已选图元都渲染方形缩略图 + 中文名，且移除按钮落在缩略图内（右上角）", () => {
    expect(samples.length).toBe(2);
    const html = renderList(samples);

    for (const template of samples) {
      // 缩略图与图元树同源
      expect(html).toContain("custom-component-tree-thumbnail");
      // 中文名（label 本身即中文）
      expect(html).toContain(template.label);
      // 移除按钮可达名写明「同时取消图元树勾选」
      expect(html).toContain(
        `aria-label="移除 ${template.label}，并取消图元树中的勾选"`
      );
    }
    expect(html.match(/symbol-export-selected-item/g)?.length).toBe(2);
    expect(html.match(/symbol-export-selected-remove/g)?.length).toBe(2);

    // 逐项切块：删除按钮必须夹在「缩略图容器」与「中文名」之间 —— 即它挂在缩略图上，
    // 而不是与中文名并列排在行尾（这正是「右上角图层式删除图标」的结构前提）。
    const items = html.split('class="symbol-export-selected-item"').slice(1);
    expect(items.length).toBe(2);
    for (const item of items) {
      const thumbAt = item.indexOf('class="symbol-export-selected-thumb"');
      const removeAt = item.indexOf('class="symbol-export-selected-remove"');
      const labelAt = item.indexOf('class="symbol-export-selected-label"');
      expect(thumbAt).toBeGreaterThanOrEqual(0);
      expect(removeAt).toBeGreaterThan(thumbAt);
      expect(labelAt).toBeGreaterThan(removeAt);
    }

    // 不渲染中文以外的 kind 文案
    expect(html).not.toContain("ac-breaker");
  });

  test("移除按钮与图元树勾选共用同一份状态（移除即取消勾选）", () => {
    // 本仓无 jsdom，点击语义无法直接触发；钉住「清单移除」与「树勾选」同源，
    // 防止将来给清单另起一份勾选状态，导致两处不同步。
    const source = readFileSync(new URL("./SymbolExportDialog.tsx", import.meta.url), "utf8");
    expect(source).toContain("onRemove={(kind) => applyKinds([kind], false)}");
    expect(source).toContain("checked={selectedSet.has(template.kind)}");
  });
});

describe("已选图元清单的方格布局契约", () => {
  // 本仓没有视觉回归工具，且 styles.css 不被组件测试加载；
  // 故直接读样式表钉住两条用户可见要求（每行 6 个 / 正方形 / 右上角图标）。
  const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
  const ruleBody = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    expect(at).toBeGreaterThanOrEqual(0);
    return css.slice(at, css.indexOf("}", at));
  };

  test("清单用 6 列网格", () => {
    expect(ruleBody(".symbol-export-selected-list")).toContain(
      "grid-template-columns: repeat(6, minmax(0, 1fr));"
    );
  });

  test("缩略图容器是正方形，并让同源缩略图撑满", () => {
    expect(ruleBody(".symbol-export-selected-thumb")).toContain("aspect-ratio: 1 / 1;");
    expect(css).toContain(".symbol-export-selected-thumb .custom-component-tree-thumbnail {");
  });

  test("移除图标绝对定位在缩略图右上角", () => {
    const remove = ruleBody(".symbol-export-selected-remove");
    expect(remove).toContain("position: absolute;");
    expect(remove).toContain("top: 1px;");
    expect(remove).toContain("right: 1px;");
  });

  test("过滤语义说明挂载在预设过滤块内（用户可见的硬排除提示）", () => {
    expect(ruleBody(".symbol-export-filter-note")).toContain("font-size: 10px;");
    const source = readFileSync(new URL("./SymbolExportDialog.tsx", import.meta.url), "utf8");
    expect(source).toContain('className="symbol-export-filter-note"');
    expect(source).toContain("取消勾选即排除该分类");
  });
});

describe("取消「竖向图元」后的树内容（用户报告的 bug 回归）", () => {
  // 竖向图元全部是「本体 + vertical」双命中（createVerticalDeviceTemplate 只改 kind/label），
  // 因此它们会同时命中 bus / stateful / container。旧并集语义下取消「竖向图元」它们仍会残留。
  const VERTICAL_KIND = "ac-bus-vertical";

  test("取消 vertical 后，命中 vertical 的图元全部从过滤结果中消失", () => {
    const verticals = DEVICE_LIBRARY.filter((t) => String(t.kind).endsWith("-vertical"));
    expect(verticals.length).toBeGreaterThan(0);

    const withoutVertical = DEFAULT_SYMBOL_EXPORT_FILTER_KEYS.filter((key) => key !== "vertical");
    const kept = filterSymbolExportTemplates(verticals, withoutVertical);

    expect(kept).toEqual([]);
    // 对照：不取消时它们必须都在，否则这条用例可能因「本来就没命中」而假通过。
    expect(filterSymbolExportTemplates(verticals, DEFAULT_SYMBOL_EXPORT_FILTER_KEYS))
      .toEqual(verticals);
  });

  test("取消 vertical 不会误伤非竖向图元", () => {
    const withoutVertical = DEFAULT_SYMBOL_EXPORT_FILTER_KEYS.filter((key) => key !== "vertical");
    const vertical = DEVICE_LIBRARY.find((t) => t.kind === VERTICAL_KIND)!;
    const nonVertical = DEVICE_LIBRARY.find((t) => t.kind === "ac-breaker")!;

    const kept = filterSymbolExportTemplates([vertical, nonVertical], withoutVertical);
    expect(kept).toEqual([nonVertical]);
  });
});

// ---------------------------------------------------------------------------
// 树装配的缺省 / 兜底分支
//
// 本仓无 jsdom（environment: "node"），点不了勾选框，所以 selectedKinds 恒为空数组。
// 因此这些分支只能靠「**改入参**」去走，而不是靠交互：
//   - groupedByComponentLibrary / categoryLibraries 都是 props，缺省路径可直接喂进去；
//   - 「勾选态」相关分支（checkStateFor 的 all/some、renderCheckbox 的 mixed）在静态渲染下
//     恒为 none，本文件用「全树不得出现 mixed / some / all」把它们钉死（见下）。
// ---------------------------------------------------------------------------
describe("图元树装配的缺省入参与空类兜底", () => {
  const BREAKER = DEVICE_LIBRARY.find((template) => template.kind === "ac-breaker")!;
  const VERTICAL_DISCONNECTOR = DEVICE_LIBRARY.find(
    (template) => template.kind === "ac-ground-disconnector-vertical"
  )!;
  const group = (section: string, templates: DeviceTemplate[]) => ({ section, templates });

  /**
   * 一个 kind 字段缺失的模板：`isDerivedComponentLibrary: false` 让
   * templateDerivedComponentLibraryInfo 在触碰 kind 之前就早退（否则 baseDeviceKind
   * 会对 undefined 调 endsWith 抛错），于是它能一路流到 uniqueTemplates。
   * 这正是生产里「图元库导入包字段缺失」的形状。
   */
  const KINDLESS = {
    label: "无kind幽灵图元",
    params: {},
    isDerivedComponentLibrary: false
  } as unknown as DeviceTemplate;

  test("kind 字段缺失的模板被 uniqueTemplates 丢弃：不进树、不进计数", () => {
    const html = render({
      categoryLibraries: ["交流设备"],
      groupedByComponentLibrary: {
        交流设备: [group("ACBreak", [BREAKER, KINDLESS])]
      }
    });

    // 正常图元照常渲染（证明不是「整棵树炸了所以什么都没输出」）
    expect(html).toContain(BREAKER.label);
    // 幽灵图元既不能出现在类行的计数里（<strong>N</strong>），也不能作为图元行渲染出来
    expect(html).not.toContain("无kind幽灵图元");
    // 类行计数只算有 kind 的那一个
    expect(html).toContain("<strong>1</strong>");
  });

  test("空类（无任何图元）渲染出 0 计数行，且全树勾选态恒为 none", () => {
    const html = render({
      categoryLibraries: ["交流设备"],
      groupedByComponentLibrary: {
        交流设备: [group("空类", []), group("ACBreak", [BREAKER])]
      }
    });

    // 空类确实被渲染出来了（不是被裁掉），且计数为 0
    expect(html).toContain('class="symbol-export-class-node"');
    expect(html).toContain("<strong>0</strong>");
    expect(html).toContain("<strong>1</strong>");

    // checkStateFor(total=0) 必须短路到 none；否则（`||` 被改成 `&&`）
    // 有图元的类会落到 0 !== N 的 "some" 分支上。
    expect(html).not.toContain('data-check-state="some"');
    expect(html).not.toContain('data-check-state="all"');
    expect(html).not.toContain('aria-checked="mixed"');
    expect(html).not.toContain('aria-checked="true"');
    expect(html.match(/data-check-state="none"/g)?.length).toBeGreaterThan(0);
  });

  test("groupedByComponentLibrary 缺省时按空对象装配：树给空态而不是抛错", () => {
    // props 契约上它是必填，但装配点漏传 / 后端还没回来时确实可能是 undefined，
    // 组件自己那层 `?? {}` 就是为此而设。这里绕过类型直接喂 undefined。
    const html = render({ groupedByComponentLibrary: undefined });

    expect(html).toContain("未找到匹配图元");
    expect(html).not.toContain('class="symbol-export-library"');
    // 弹窗其余部分仍完整（证明是「空树」而不是「渲染中断」）
    expect(html).toContain("symbol-export-footer");
    expect(html).toContain("合并到一个 SVG 中导出");
  });

  test("categoryLibraries 为空时回落到 groupedByComponentLibrary 的键集合", () => {
    const html = render({
      categoryLibraries: [],
      groupedByComponentLibrary: {
        交流设备: [group("ACBreak", [BREAKER])]
      }
    });

    // 顺序由 Object.keys(source) 决定：类别库行照常出现，图元行也装出来了
    expect(html).toContain('class="symbol-export-library"');
    expect(html).toContain('class="symbol-export-row library"');
    expect(html).toContain(BREAKER.label);
    expect(html).not.toContain("未找到匹配图元");
  });

  test("categoryLibraries 里的库在 source 中无对应条目时按空数组装配（不抛错）", () => {
    const html = render({
      categoryLibraries: ["幽灵类别库"],
      groupedByComponentLibrary: {
        交流设备: [group("ACBreak", [BREAKER])]
      }
    });

    // 该库一条图元都装不出 → 整棵树给空态；真实存在的「交流设备」不该被顺带渲染出来
    expect(html).toContain("未找到匹配图元");
    expect(html).not.toContain('class="symbol-export-library"');
    // 弹窗主体仍在（`source[library]` 若没兜底成 []，buildCustomComponentClassTree 会直接抛）
    expect(html).toContain("symbol-export-tree");
  });

  test("空搜索词时 visibleTemplates 就是分类过滤的原样结果（搜索不额外收窄）", () => {
    const templates = [BREAKER, VERTICAL_DISCONNECTOR];
    const html = render({
      categoryLibraries: ["交流设备"],
      groupedByComponentLibrary: {
        交流设备: [group("ACBreak", templates)]
      }
    });

    const expected = filterSymbolExportTemplates(templates, DEFAULT_SYMBOL_EXPORT_FILTER_KEYS);
    expect(expected.length).toBe(2);
    // 标题栏的「可见 N」直接读 visibleTemplates.length：它必须等于纯过滤函数的结果，
    // 即 searchNeedle 为空时走的是 `return byFilter` 早退，而不是叠了一层搜索收窄。
    expect(html).toContain(`可见 <strong>${expected.length}</strong>`);
    expect(html).toContain(`已选 <strong>0</strong>`);
    for (const template of templates) {
      expect(html).toContain(template.label);
    }
  });
});

// ---------------------------------------------------------------------------
// 静态渲染够不到的分支：源码契约守卫
//
// 下面两处在本仓的测试环境里**没有任何输出断言能看见**：
//   - normalizeNeedle 的 .trim()：唯一的真实调用点是 `normalizeNeedle(searchQuery)`，
//     而 searchQuery 是 useState("")，renderToStaticMarkup 点不到输入框，永远是空串
//     —— trim 对它空转。另两个调用点都在 `if (!searchNeedle) return byFilter` 的
//     **后面**（248/252 行），空搜索词时根本走不到。
//   - checkStateFor 的 "some" → aria-checked="mixed"：selectedKinds 恒为 []，
//     所以 state 恒为 "none"，some / all 两个臂都不触发；把 "mixed" 写成 "all"
//     在可达输入上与原实现等价。
// 按「断言必须落在被变异的那行上」的判据，这里改用静态源码断言钉死整行，
// 而不是补一条恒绿的行为断言。
// ---------------------------------------------------------------------------
describe("静态渲染够不到的分支：源码契约", () => {
  const source = readFileSync(new URL("./SymbolExportDialog.tsx", import.meta.url), "utf8");

  test("搜索词归一先 trim 再小写（trim 对空搜索词是空转，但整行字面量不许退化成只 toLowerCase）", () => {
    expect(source).toContain('  return String(value ?? "").trim().toLowerCase();');
  });

  test("部分勾选态渲染成 aria-checked mixed（而不是 all）", () => {
    expect(source).toContain('      aria-checked={state === "some" ? "mixed" : state === "all"}');
  });
});
