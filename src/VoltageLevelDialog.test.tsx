// VoltageLevelDialog 的渲染期行为。
//
// 这个对话框的判定逻辑集中在两处**渲染期的纯计算**上：哪些行算「内置」（决定名称输入框
// 能不能改、要不要先 confirm）、哪些行算「被改过」（决定还原按钮出不出现）。这两处一旦
// 判错，用户会看到「内置电压等级可以改名」或「自定义行冒出还原按钮」——都不会报错，
// 只是界面说谎，所以值得钉住。
//
// 本项目没有 jsdom / react-test-renderer（见 components/AGENTS.md），用
// renderToStaticMarkup 做无 DOM 渲染。它**只跑渲染期**：onChange / onClick 闭包与
// useEffect（ESC 关闭）都不会执行，故 updateRow / addRow / removeRow / restoreRow /
// handleSave / checkNameDuplicate 这些函数不在本文件覆盖范围内，文件末尾如实列出。

import { createElement } from "react";
import * as ReactNamespace from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { VoltageLevelConfig, VoltageLevelSettings } from "./model";
import { VoltageLevelDialog } from "./VoltageLevelDialog";

// isNew 是 dialog 自己在 addRow 里写上去的**运行期**字段，VoltageLevelConfig 上并没有它
// （VoltageLevelDialog.tsx 带 @ts-nocheck，所以类型层面没人拦）。这里显式补上，
// 免得读测试的人以为它是声明过的一部分。
type Row = VoltageLevelConfig & { isNew?: boolean };

const render = (settings: { ac: Row[]; dc: Row[] }, open = true) =>
  renderToStaticMarkup(
    createElement(VoltageLevelDialog, {
      open,
      onClose: onCloseMock,
      settings: settings as unknown as VoltageLevelSettings,
      onSave: onSaveMock
    })
  );

const countOf = (html: string, needle: string) => html.split(needle).length - 1;

/** 表体里每行的名称输入框，按行序取；用于断言「哪一行被禁用了」。 */
const nameInputs = (html: string) => [...html.matchAll(/<input type="text"([^>]*)\/>/g)].map((m) => m[1]);

let onCloseMock: ReturnType<typeof vi.fn>;
let onSaveMock: ReturnType<typeof vi.fn>;
let setItemSpy: ReturnType<typeof vi.fn>;
let originalLocalStorage: unknown;

beforeEach(() => {
  onCloseMock = vi.fn();
  onSaveMock = vi.fn();
  setItemSpy = vi.fn();
  originalLocalStorage = (globalThis as any).localStorage;
  // node 环境没有 localStorage；装个记录器，用来断言「渲染期不落盘」
  (globalThis as any).localStorage = { getItem: () => null, setItem: setItemSpy };
});

afterEach(() => {
  (globalThis as any).localStorage = originalLocalStorage;
});

describe("VoltageLevelDialog 关闭态", () => {
  test("open=false 时不渲染任何内容", () => {
    // 有内容就得靠 CSS 藏，一个手滑的 z-index 就让它盖住画布
    expect(render({ ac: [{ name: "0", vltp: "0" }], dc: [] }, false)).toBe("");
  });

  test("open=false 时连 backdrop 都不存在", () => {
    const html = render({ ac: [{ name: "0", vltp: "0" }], dc: [] }, false);
    expect(html).not.toContain("image-picker-backdrop");
  });
});

describe("VoltageLevelDialog 骨架", () => {
  const html = () => render({ ac: [{ name: "0", vltp: "0" }], dc: [] });

  test("标题、两个标签、表头三列", () => {
    const out = html();
    expect(out).toContain("电压等级设置");
    expect(out).toContain(">交流<");
    expect(out).toContain(">直流<");
    expect(out).toContain(">名称<");
    expect(out).toContain(">电压等级<");
    expect(out).toContain(">操作<");
  });

  test("底部有新增与保存两个按钮", () => {
    const out = html();
    expect(out).toContain(">新增<");
    expect(out).toContain(">保存<");
  });

  test("右上角关闭按钮带无障碍名", () => {
    // 只有图标没有可读名的按钮，读屏用户无从下手
    expect(html()).toContain('aria-label="关闭电压等级设置"');
  });

  test("每行一个删除按钮，内置行也不隐藏", () => {
    // 内置行的删除走 confirm 二次确认，而不是直接禁掉 —— 禁掉就等于内置不可删
    const out = render({ ac: [{ name: "0", vltp: "0" }, { name: "自定义", vltp: "1" }], dc: [] });
    expect(countOf(out, 'title="删除"')).toBe(2);
  });
});

describe("VoltageLevelDialog 内置行的只读判定", () => {
  test("内置行的名称输入框禁用并改灰底", () => {
    const out = render({ ac: [{ name: "220", vltp: "220" }], dc: [] });
    const [name] = nameInputs(out);
    expect(name).toContain('disabled=""');
    expect(name).toContain("background:#f8fafc");
  });

  test("自定义行的名称输入框可编辑、保持白底", () => {
    const out = render({ ac: [{ name: "自定义", vltp: "1" }], dc: [] });
    const [name] = nameInputs(out);
    expect(name).not.toContain("disabled");
    expect(name).not.toContain("#f8fafc");
  });

  test("只有名称输入框被禁用，电压等级输入框始终可改", () => {
    // 内置行的「改电压值」是支持的（改完出现还原按钮），禁掉就只剩改名一条路
    const out = render({ ac: [{ name: "220", vltp: "230" }], dc: [] });
    const [name, vltp] = nameInputs(out);
    expect(name).toContain('disabled=""');
    expect(vltp).not.toContain("disabled");
  });

  test("每行两个输入框，数量与行数一致", () => {
    const out = render({ ac: [{ name: "0", vltp: "0" }, { name: "6", vltp: "6" }, { name: "x", vltp: "1" }], dc: [] });
    expect(nameInputs(out)).toHaveLength(6);
  });

  test("isNew 的行即便名字撞内置也不当内置：可改名、不给还原按钮", () => {
    // 判据是 `!row.isNew && builtinSet.has(row.name)`：用户自建的同名行仍归自己管，
    // 否则内置锁会误伤用户数据。
    const out = render({ ac: [{ name: "220", vltp: "230", isNew: true }], dc: [] });
    const [name, vltp] = nameInputs(out);
    expect(name).not.toContain("disabled");
    // vltp 与 name 不同，但它是新增行不是「被改过的内置行」
    expect(out).not.toContain('title="还原"');
    expect(vltp).toContain('value="230"');
  });
});

describe("VoltageLevelDialog 还原按钮的显示条件", () => {
  test("内置行电压值被改过 → 出现还原按钮", () => {
    const out = render({ ac: [{ name: "220", vltp: "230" }], dc: [] });
    expect(countOf(out, 'title="还原"')).toBe(1);
  });

  test("内置行电压值等于名称 → 不出现还原按钮", () => {
    const out = render({ ac: [{ name: "220", vltp: "220" }], dc: [] });
    expect(out).not.toContain('title="还原"');
  });

  test("自定义行即便电压值与名称不同也不出现还原按钮", () => {
    // 还原的含义是「回到内置值」，自定义行没有内置值可回
    const out = render({ ac: [{ name: "自定义", vltp: "别的" }], dc: [] });
    expect(out).not.toContain('title="还原"');
  });

  test("只有被改过的那一行有还原按钮，其他内置行没有", () => {
    const out = render({
      ac: [
        { name: "0", vltp: "0" },
        { name: "220", vltp: "230" },
        { name: "6", vltp: "6" }
      ],
      dc: []
    });
    expect(countOf(out, 'title="还原"')).toBe(1);
  });

  test("内置判定是按 BUILTIN_VOLTAGE_LEVELS 的字符串全等，不是按数值", () => {
    // "022" 与 "0.22" 数值相近但不是同一个内置项，必须当自定义行处理
    const out = render({ ac: [{ name: "022", vltp: "0.022" }], dc: [] });
    expect(nameInputs(out)[0]).not.toContain("disabled");
  });
});

describe("VoltageLevelDialog 标签页", () => {
  test("默认停在交流，交流带 active", () => {
    const out = render({ ac: [{ name: "0", vltp: "0" }], dc: [{ name: "800", vltp: "800" }] });
    expect(out).toContain('class="active" style="padding:4px 12px');
    expect(countOf(out, 'class="active"')).toBe(1);
  });

  test("直流那一列的行不在渲染结果里", () => {
    // 两个列表共用一张表，默认只渲染当前标签的数据源；直流行混进交流表会误导用户
    // （注意：这条断言守的是「首屏只出交流数据」这个契约；把 draft[tab] 写死成
    // draft.ac 时它同样会绿 —— 原因见下方源码守卫的注释）
    const out = render({ ac: [{ name: "0", vltp: "0" }], dc: [{ name: "800", vltp: "800" }] });
    expect(out).toContain('value="0"');
    expect(out).not.toContain('value="800"');
  });

  test("表头只有一份，切标签不换表头", () => {
    const out = render({ ac: [{ name: "0", vltp: "0" }], dc: [] });
    expect(countOf(out, ">操作<")).toBe(1);
  });

  test("空列表时表头仍在（不塌成无表的空白区）", () => {
    const out = render({ ac: [], dc: [{ name: "0.4", vltp: "0.4" }] });
    expect(out).toContain(">名称<");
    expect(nameInputs(out)).toHaveLength(0);
  });
});

describe("VoltageLevelDialog 标签页数据源（源码守卫）", () => {
  test("currentList 取的是 draft[tab]，不是写死某一侧", async () => {
    // 变异验证实测：把 `draft[tab]` 改成 `draft.ac` 后本文件**一样绿**。
    // 原因是 tab 的初值恒为 "ac"，只有点标签才能改，而 renderToStaticMarkup 不派发事件 ——
    // 这处等价变异在渲染期不可观测，改用源码守卫钉住，免得被悄悄写死某一侧。
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("./VoltageLevelDialog.tsx", import.meta.url), "utf8");
    // 允许 currentList 带上行类型标注（VoltageLevelRow[]），仍必须取 draft[tab]
    expect(source).toMatch(/const currentList(?:\s*:\s*[^=]+?)?\s*=\s*draft\[tab\];/);
  });
});

// ---------------------------------------------------------------------------
// L107 / L108 / L164 的另一半
//
// 这三行都只看**组件内部 state**，而 renderToStaticMarkup 跑不到它们：
//   - L107/L108 的四个三元式按 `tab` 分支。tab 的初值恒为 "ac"，只有 onClick 能改，
//     静态渲染不派发事件 ⇒ 默认渲染永远只走 L107 的真臂、L108 的假臂。
//   - L164 的 `{error && …}`。error 的初值恒为 ""，只有 updateRow / handleSave 能写。
//
// 换渲染器不现实（本项目没有 jsdom / react-test-renderer，见文件头），
// 但组件本体是个**纯函数**：`useState` / `useRef` / `useEffect` 都是从 "react" 取的，
// 而 React 19 把当前 dispatcher 挂在 `ReactSharedInternals.H` 上，**调用时才解析**。
// 于是临时换掉那个槽位，就能按调用序号喂进指定的 state，直接调用组件函数拿到 React 元素树，
// 再在元素树上断言 —— 全程不碰 DOM、不派发事件、不渲染 HTML。
//
// 只认 React 19 的 internals 槽位：换不到就明确抛错，绝不静默退化成「测不出来」。
// ---------------------------------------------------------------------------

type Internals = { H?: unknown };
const REACT_INTERNALS =
  (ReactNamespace as unknown as {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: Internals;
  }).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

// 组件里的 useState 调用序号 → 语义（L20 tab / L21 draft / L22 error）。
const STATE_TAB = 0;
const STATE_DRAFT = 1;
const STATE_ERROR = 2;

type Element = { type?: unknown; props?: Record<string, any> };

/** 在 React 元素树上按谓词收集元素（不渲染，只遍历 props.children）。 */
const collectElements = (node: unknown, match: (el: Element) => boolean, out: Element[] = []): Element[] => {
  if (Array.isArray(node)) {
    for (const child of node) collectElements(child, match, out);
    return out;
  }
  if (!node || typeof node !== "object") return out;
  const el = node as Element;
  if (match(el)) out.push(el);
  if (el.props && "children" in el.props) collectElements(el.props.children, match, out);
  return out;
};

/** 宿主标签元素，如 type === "button" 的原生按钮。 */
const collectByType = (node: unknown, type: string, out?: Element[]) =>
  collectElements(node, (el) => el.type === type, out);

/**
 * 按指定的内部 state 调用组件本体，返回收集到的按钮与 span。
 *
 * `state` 按 useState 调用序号给值；没给的序号退回源码里的初始值表达式，
 * 因此这里必须与源码的 useState 顺序一致（L20-L22），改顺序会让本组用例失败而非误绿。
 */
const renderWithInternalState = (
  state: { tab?: "ac" | "dc"; error?: string },
  settings: { ac: Row[]; dc: Row[] } = { ac: [{ name: "0", vltp: "0" }], dc: [] }
) => {
  if (!REACT_INTERNALS || typeof REACT_INTERNALS !== "object") {
    throw new Error(
      "取不到 React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE —— React 版本已变，本组用例的前提失效"
    );
  }
  const preset: unknown[] = [];
  if (state.tab !== undefined) preset[STATE_TAB] = state.tab;
  if (state.error !== undefined) preset[STATE_ERROR] = state.error;

  const previous = REACT_INTERNALS.H;
  let useStateCalls = 0;
  const noop = () => {};
  REACT_INTERNALS.H = {
    useState: (initial: unknown) => {
      const index = useStateCalls++;
      const value = index < preset.length && index in preset ? preset[index] : initial;
      return [value, noop];
    },
    useRef: () => ({ current: null }),
    // 组件里的 useEffect 会 document.addEventListener；直接调用组件时它根本不该跑
    useEffect: () => {}
  };
  let tree: unknown;
  try {
    tree = (VoltageLevelDialog as unknown as (props: unknown) => unknown)({
      open: true,
      onClose: noop,
      settings,
      onSave: noop
    });
  } finally {
    REACT_INTERNALS.H = previous;
  }
  // 少喂一个 state 就说明源码的 useState 顺序变了；多喂说明新增了 state
  expect(useStateCalls).toBe(3);

  const buttons = collectByType(tree, "button");
  const spans = collectByType(tree, "span");
  // 保存/新增用的是 antd 的 <Button>，不是宿主 <button>：按 disabled 属性挑出来
  const antdButtons = collectElements(tree, (el) => "disabled" in (el.props ?? {}));
  const tabButton = (label: string) => {
    const found = buttons.find((b) => b.props?.children === label);
    if (!found) throw new Error(`没找到标签页按钮 ${label}`);
    return found;
  };
  return { buttons, spans, antdButtons, tabButton };
};

describe("VoltageLevelDialog 标签页的另一半分支（L107/L108）", () => {
  // tab 初值恒为 "ac"，所以这两行默认渲染只走 L107 真臂 + L108 假臂。
  // 这里把内部 state 换成 "dc"，补上 L107 假臂 + L108 真臂。
  const onDc = (): ReturnType<typeof renderWithInternalState> =>
    renderWithInternalState(
      { tab: "dc" },
      { ac: [{ name: "0", vltp: "0" }], dc: [{ name: "800", vltp: "800" }] }
    );

  test("tab=dc 时交流按钮落到 L107 的假臂：非 active + 透明下边框 + 常规字重 + 灰字", () => {
    const { tabButton } = onDc();
    const ac = tabButton("交流");
    expect(ac.props?.className).toBe("");
    expect(ac.props?.style.borderBottom).toBe("2px solid transparent");
    expect(ac.props?.style.fontWeight).toBe(400);
    expect(ac.props?.style.color).toBe("#64748b");
  });

  test("tab=dc 时直流按钮落到 L108 的真臂：active + 蓝色下边框 + 半粗 + 蓝字", () => {
    const { tabButton } = onDc();
    const dc = tabButton("直流");
    expect(dc.props?.className).toBe("active");
    expect(dc.props?.style.borderBottom).toBe("2px solid #2563eb");
    expect(dc.props?.style.fontWeight).toBe(600);
    expect(dc.props?.style.color).toBe("#2563eb");
  });

  test("两个标签按钮的 className 互斥：同一时刻只有一个是 active", () => {
    // 防「断言值恰好等于兜底值」：只断言其中一侧时，把另一侧的判据写死也照样绿。
    // 这一条要求两侧在同一棵树里同时成立，两者的默认值必须真的不同。
    const acTree = renderWithInternalState({ tab: "ac" });
    const dcTree = onDc();
    expect(acTree.tabButton("交流").props?.className).toBe("active");
    expect(acTree.tabButton("直流").props?.className).toBe("");
    expect(dcTree.tabButton("交流").props?.className).toBe("");
    expect(dcTree.tabButton("直流").props?.className).toBe("active");
  });

  test("切到直流后渲染的是 dc 列表，交流行不出现在表体里", () => {
    // tab 真的参与了渲染，而不是只改了按钮样式 —— 顺带钉住 draft[tab] 的取值
    const { buttons } = onDc();
    const rows = buttons.filter((b) => b.props?.title === "删除");
    expect(rows).toHaveLength(1);
    expect(rows[0].props?.style.color).toBe("#ef4444");
  });
});

describe("VoltageLevelDialog 错误提示条（L164）", () => {
  // error 初值恒为 ""，静态渲染永远只走 `&&` 的假臂（不渲染 span）。
  // 这里把内部 state 换成非空串，补上真臂。
  const ON_ERROR = "第 7 行名称不能为空";

  test("error 非空时渲染红色提示条，内容就是 error 本身", () => {
    const { spans } = renderWithInternalState({ error: ON_ERROR });
    // 新增/保存按钮里的 <span> 没有 style；错误提示条是唯一带 style 的 span
    const banners = spans.filter((s) => s.props?.style !== undefined);
    expect(banners).toHaveLength(1);
    expect(banners[0].props?.style.color).toBe("#ef4444");
    expect(banners[0].props?.style.fontSize).toBe(11);
    expect(banners[0].props?.children).toBe(ON_ERROR);
  });

  test("error 为空串时不渲染提示条（`&&` 的假臂，与真臂互斥）", () => {
    // 与上一条成对：期望值不落在兜底值上，两侧都断
    const { spans } = renderWithInternalState({ error: "" });
    expect(spans.filter((s) => s.props?.style !== undefined)).toHaveLength(0);
    expect(spans.length).toBeGreaterThan(0);
  });

  test("error 非空时保存按钮被禁用，空串时不禁用", () => {
    // disabled={!!error} 与提示条同源：提示条渲染了，按钮就该是禁用的
    const withError = renderWithInternalState({ error: ON_ERROR });
    const withoutError = renderWithInternalState({ error: "" });
    // 新增（无 disabled 属性）与保存（type="primary"）两个 antd Button
    expect(withError.antdButtons).toHaveLength(2);
    expect(withError.antdButtons.filter((b) => b.props?.type === "primary")).toHaveLength(1);
    expect(withError.antdButtons.find((b) => b.props?.type === "primary")?.props?.disabled).toBe(true);
    expect(withoutError.antdButtons.find((b) => b.props?.type === "primary")?.props?.disabled).toBe(false);
  });
});

describe("VoltageLevelDialog 渲染期不产生副作用", () => {
  test("首屏不回调 onSave / onClose", () => {
    render({ ac: [{ name: "0", vltp: "0" }], dc: [] });
    expect(onSaveMock).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  test("首屏不写 localStorage（只有 handleSave 会落盘）", () => {
    render({ ac: [{ name: "0", vltp: "0" }], dc: [] });
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  test("首屏无错误提示，保存按钮可用", () => {
    // error 初值是空串，disabled={!!error} 因此为 false；有没有提示元素一并断言
    const out = render({ ac: [{ name: "0", vltp: "0" }], dc: [] });
    expect(out).not.toContain("#ef4444;font-size:11px");
    const save = out.slice(out.indexOf(">保存<"));
    expect(save).not.toContain("disabled");
  });
});

// 本文件**没有**覆盖、也不打算覆盖的部分（renderToStaticMarkup 只执行渲染期）：
//   - useEffect 里的 ESC 关闭与 document 监听（需要真实 DOM 与事件派发）
//   - updateRow / checkNameDuplicate：改名的重复校验与错误文案
//   - addRow：追加 { name:"", vltp:"", isNew:true } 并滚动到底
//   - removeRow：内置行的 confirm 二次确认
//   - restoreRow：把内置行的 vltp 写回与 name 相同
//   - handleSave：空名/重名校验、writeVoltageLevelSettings、onSave、onClose
// 补这些需要能驱动交互的渲染器（jsdom 或 react-test-renderer），本项目尚未引入。
//
// 注意 L107/L108/L164**不在**上面这份清单里：它们只看内部 state，靠替换 React 的
// dispatcher 槽位喂 state 就已覆盖（见上方两组 describe），不需要交互式渲染器。
