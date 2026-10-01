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
