// colorInputValue 与 DeferredColorInput / InlineEditableValue 的渲染层契约。
//
// 同目录的 InputComponentsBuffered.test.tsx 覆盖的是缓冲提交内核（闭包内判定，
// 只能源码守卫）。这里补的是另一半：颜色输入的**兜底链**与**透明色判定**，
// 以及属性表行内编辑器的浏览态分支 —— 这些全在渲染期求值，renderToStaticMarkup
// 就能真跑，不需要 jsdom。
//
// 为什么值得单独测：颜色值是从项目 JSON / 旧版本数据里读进来的，形状不受控。
// 兜底链判错不抛异常，只表现为「取色器一片白」或「透明开关按了没反应」，
// 静态类型检查完全看不见。
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import { colorInputValue, DeferredColorInput, InlineEditableValue } from "./InputComponents";

/* ---------- 取色工具 ---------- */

/** antd ColorPicker 把色值渲染成内联 background:rgb(r,g,b)，这是唯一能观察 draft 的地方。 */
const pickedRgb = (html: string) => /background:rgb\((\d+,\d+,\d+)\)/.exec(html)?.[1] ?? "";

const hexToRgb = (hex: string) => {
  const packed = Number.parseInt(hex.slice(1), 16);
  return `${(packed >> 16) & 255},${(packed >> 8) & 255},${packed & 255}`;
};

/** 只取最外层 span 的 class —— 免得匹配到 antd 内部元素或按钮上的 disabled 属性。 */
const wrapperClass = (html: string) => /<span class="(deferred-color-input[^"]*)"/.exec(html)?.[1] ?? "";

const renderColorInput = (props: Parameters<typeof DeferredColorInput>[0]) =>
  renderToStaticMarkup(createElement(DeferredColorInput, props));

/**
 * 读组件源码，供下面几处源码守卫用。
 *
 * 守卫的理由统一：判定都在 onClick 闭包 / editing 分支 / useEffect 里，
 * renderToStaticMarkup 不执行它们，真点击与状态迁移要 jsdom（本仓 vitest 全局
 * environment 是 node，也未装 react-test-renderer —— 引入它是新增依赖，超出
 * 「补守卫」范围）。同目录 InputComponentsBuffered.test.tsx 是同一处境。
 */
const readSource = async () => {
  const { readFileSync } = await import("node:fs");
  return readFileSync(new URL("./InputComponents.tsx", import.meta.url), "utf8");
};

/* ---------- colorInputValue ---------- */

describe("colorInputValue", () => {
  test("6 位 hex 原样返回（含大小写两种写法）", () => {
    // 刻意只断言「不改动大小写」：调用方存的是用户原样输入的值，
    // 这里若顺手 toLowerCase，E 导出 / diff 里同一颜色会出现两种写法。
    expect(colorInputValue("#a1b2c3")).toBe("#a1b2c3");
    expect(colorInputValue("#A1B2C3")).toBe("#A1B2C3");
  });

  test("3 位缩写回退到 fallback（只放行 6 位定长 hex）", () => {
    // 钉住现状：判定是严格的 6 位。#abc 在 CSS 里合法、antd 也认，放宽它属于
    // 语义变更（下游拿到的色值长度不再定长），该被显式决定，而不是顺手改掉。
    expect(colorInputValue("#abc")).toBe("#ffffff");
    expect(colorInputValue("#abc", "#123456")).toBe("#123456");
  });

  test("8 位带 alpha 的 hex 回退到 fallback", () => {
    expect(colorInputValue("#11223344")).toBe("#ffffff");
  });

  test("缺 # 前缀 / 非 hex 字符一律回退", () => {
    for (const value of ["112233", "#12345g", "#1234567", "rgb(1,2,3)", "red"]) {
      expect(colorInputValue(value), value).toBe("#ffffff");
    }
  });

  test("空串与 transparent 回退 —— transparent 不是颜色，交给透明开关处理", () => {
    expect(colorInputValue("")).toBe("#ffffff");
    expect(colorInputValue("transparent")).toBe("#ffffff");
    expect(colorInputValue("transparent", "#010203")).toBe("#010203");
  });

  test("fallback 原样返回、不做二次校验", () => {
    // 钉住现状：fallback 假定由调用方给合法值（各调用点传的都是模块里的常量）。
    // 若哪天要收紧成「fallback 也必须合法」，这条会红 —— 那是需要被看见的语义变更，
    // 不是可以悄悄改掉的实现细节。
    expect(colorInputValue("nope", "zzz")).toBe("zzz");
    expect(colorInputValue("#abc", "#abc")).toBe("#abc");
  });

  test("省略 fallback 时默认 #ffffff", () => {
    expect(colorInputValue("")).toBe("#ffffff");
    expect(colorInputValue("nope", undefined)).toBe("#ffffff");
  });
});

/* ---------- 透明色判定 ---------- */

describe("DeferredColorInput 的透明色判定", () => {
  // isTransparentColorValue 未导出，只能从渲染结果观察：span 上的 transparent 类
  // 与按钮的 aria-pressed 是同一判定的两个出口。
  const state = (value: string) => {
    const html = renderColorInput({ value, onCommit: vi.fn() });
    return {
      transparent: /\btransparent\b/.test(wrapperClass(html)),
      pressed: /aria-pressed="true"/.test(html)
    };
  };

  test("值为 transparent 时进入透明态", () => {
    expect(state("transparent")).toEqual({ transparent: true, pressed: true });
  });

  test("大小写与首尾空白都不影响判定", () => {
    for (const value of ["TRANSPARENT", "Transparent", "  transparent  ", "\ttransparent\n"]) {
      expect(state(value), JSON.stringify(value)).toEqual({ transparent: true, pressed: true });
    }
  });

  test("只是包含 transparent 的字符串不算透明", () => {
    for (const value of ["transparentx", "xtransparent", "#112233", ""]) {
      expect(state(value), JSON.stringify(value)).toEqual({ transparent: false, pressed: false });
    }
  });

  test("透明态下取色器色块显示 fallback（透明没有颜色，色块显示的是「切回来会变成什么」）", () => {
    // transparent 过不了 hex 判定，于是落到 normalizedFallback —— 色块显示的是
    // 「取消透明后会得到的颜色」，而不是某个陈旧值。
    const withFallback = renderColorInput({ value: "transparent", fallback: "#010203", onCommit: vi.fn() });
    expect(pickedRgb(withFallback)).toBe(hexToRgb("#010203"));

    // 不给 fallback 时的默认白
    const withoutFallback = renderColorInput({ value: "transparent", onCommit: vi.fn() });
    expect(pickedRgb(withoutFallback)).toBe(hexToRgb("#ffffff"));
  });
});

/* ---------- DeferredColorInput 的兜底链 ---------- */

describe("DeferredColorInput 的颜色兜底链", () => {
  test("非法 value 落到调用方给的 fallback", () => {
    const html = renderColorInput({ value: "nope", fallback: "#010203", onCommit: vi.fn() });
    expect(pickedRgb(html)).toBe(hexToRgb("#010203"));
  });

  test("value 与 fallback 都非法时落到 #ffffff（fallback 自身也要归一一次）", () => {
    // 只归一 value、不归一 fallback 的话，非法 fallback 会直接喂给 antd ColorPicker
    const html = renderColorInput({ value: "nope", fallback: "zzz", onCommit: vi.fn() });
    expect(pickedRgb(html)).toBe(hexToRgb("#ffffff"));
  });

  test("合法 value 原样上屏", () => {
    const html = renderColorInput({ value: "#0a141e", fallback: "#010203", onCommit: vi.fn() });
    expect(pickedRgb(html)).toBe(hexToRgb("#0a141e"));
  });

  test("onCommit 不会在渲染期被调用（改色必须经用户操作）", () => {
    const onCommit = vi.fn();
    renderColorInput({ value: "#112233", onCommit });
    expect(onCommit).not.toHaveBeenCalled();
  });
});

/* ---------- DeferredColorInput 其余渲染层 ---------- */

describe("DeferredColorInput 的透传", () => {
  test("modified 落到 span 的 class 与 data-modified", () => {
    const html = renderColorInput({ value: "#112233", modified: true, onCommit: vi.fn() });
    expect(wrapperClass(html)).toContain("modified");
    expect(html).toContain('data-modified="true"');
  });

  test("disabled 同时标记容器与「无」按钮", () => {
    // 只禁用按钮不标记容器的话，容器上的 .disabled 样式（置灰）不会生效
    const html = renderColorInput({ value: "#112233", disabled: true, onCommit: vi.fn() });
    expect(wrapperClass(html)).toContain("disabled");
    expect(html).toMatch(/<button[^>]*class="deferred-color-transparent-button"[^>]*disabled/);
  });

  test("aria-label 透传，且透明按钮的标签由它派生", () => {
    const html = renderColorInput({ value: "#112233", "aria-label": "母线颜色", onCommit: vi.fn() });
    expect(html).toContain('aria-label="母线颜色设为透明色"');
  });

  test("不传 aria-label 时透明按钮有自己的默认可访问名", () => {
    // 丢了就是无名按钮，屏幕阅读器只念「按钮」
    const html = renderColorInput({ value: "#112233", onCommit: vi.fn() });
    expect(html).toContain('aria-label="设置为透明色"');
  });

  test("透明按钮带 aria-pressed，读屏能听出当前是开是关", () => {
    const on = renderColorInput({ value: "transparent", onCommit: vi.fn() });
    const off = renderColorInput({ value: "#112233", onCommit: vi.fn() });
    expect(on).toContain('aria-pressed="true"');
    expect(off).toContain('aria-pressed="false"');
  });
});

/**
 * 透明开关的「记住原色、再切回来」逻辑。
 *
 * 只能源码守卫：这段在 onClick 闭包里，renderToStaticMarkup 不会执行；
 * 真点击要 jsdom（本仓 vitest 全局 environment 是 node，也没装 react-test-renderer）。
 * 与 InputComponentsBuffered.test.tsx 里那批源码守卫同源同因。
 */
describe("透明开关的存取（源码守卫）", () => {
  const transparentBlock = async () => {
    const source = await readSource();
    return source.slice(
      source.indexOf("const commitTransparent"),
      source.indexOf("const handleColorChange")
    );
  };

  test("切到透明前先把当前色存进 previousColorRef", () => {
    // 少了这句，切回来就不知道恢复成什么色 —— 表现为「取消透明后颜色变成默认白」
    return transparentBlock().then((block) => {
      expect(block).toContain("previousColorRef.current = committedRef.current;");
      expect(block).toContain("onCommitRef.current(TRANSPARENT_COLOR_VALUE);");
    });
  });

  test("切回来时消费掉存的颜色（消费后置空，不留残值）", () => {
    return transparentBlock().then((block) => {
      expect(block).toContain("previousColorRef.current = null;");
      expect(block).toContain("commitColor(restoreColor);");
    });
  });

  test("已提交值已是 transparent 时走「恢复」分支而非「再存一次」", () => {
    // 两个分支写反了会形成自锁：连按两下就再也退不出透明态
    //
    // 判定：`indexOf(...) >= 0` 不是恒真断言，保留原样。
    // `indexOf` 找不到 needle 时返回 -1，而 `-1 >= 0` 为 false —— 这正是它要抓的
    // 状态（守卫被改名/挪出切片）。变异验证 M1（把守卫的常量改写成
    // `TRANSPARENT_COLOR_VALUE.trim()`，语义等价、只是 needle 消失）→ 转红
    // `expected -1 to be greater than or equal to 0`，确认有鉴别力。
    //
    // 为什么不再加严成 `> 0`：needle 落在切片下标 0 是合法的存在形态，
    // 拿阈值当强度只会引入假红。「两个分支的先后」由下面 saveIndex 的比较承担。
    //
    // 已知边界（记录下来，免得下一个人再查一遍）：守卫的**分支体**被掏空
    // （guard 还在、但里面不再恢复）时，本用例的两条断言都还绿 —— 红的会是上面
    // 「切回来时消费掉存的颜色」那条（变异验证 M3：它断言
    // `previousColorRef.current = null;` 与 `commitColor(restoreColor);`）。
    // 文件级守卫成立，故此处不再重复断言分支体内容。
    return transparentBlock().then((block) => {
      expect(block.indexOf("if (committedRef.current === TRANSPARENT_COLOR_VALUE) {")).toBeGreaterThanOrEqual(0);
      const saveIndex = block.indexOf("previousColorRef.current = committedRef.current;");
      expect(saveIndex).toBeGreaterThan(block.indexOf("if (committedRef.current === TRANSPARENT_COLOR_VALUE) {"));
    });
  });

  test("disabled 时开关整体早退，不发 commit", () => {
    // 判定：`indexOf("if (disabled)") >= 0` 不是恒真断言，保留原样。
    // 变异验证 M4（`if (disabled)` 改写成语义等价的 `if (disabled === true)`，
    // needle 消失）→ 转红 `expected -1 to be greater than or equal to 0`，有鉴别力。
    //
    // 但它只守「判定存在」，守不住测试名承诺的「整体早退」：变异验证 M2
    // （删掉 `if (disabled) {` 里的 `return;`，分支变成空体，disabled 时照样发
    // commit）→ 原先 37 条一条不红，空分支照样满足「判定存在 + 判定在 commit 之前」。
    // 所以补一条内容断言：判定体内必须紧跟 return。用正则而非字面量，避免钉死
    // 缩进与换行；同样被 M2 / M4 打红。
    return transparentBlock().then((block) => {
      const disabledIndex = block.indexOf("if (disabled)");
      expect(disabledIndex).toBeGreaterThanOrEqual(0);
      expect(disabledIndex).toBeLessThan(block.indexOf("onCommitRef.current(TRANSPARENT_COLOR_VALUE);"));
      // 「早退」= 判定体里真的有 return，不是空 `if (disabled) {}` 摆设
      expect(block).toMatch(/if \(disabled\) \{\s*return;\s*\}/);
    });
  });

  test("外部值变化时已提交值跟着同步（含透明态）", async () => {
    // 少了 transparent 那一支：外部把值改成 transparent 后，committedRef 仍记着
    // 旧颜色，再点「无」会被当成「切到透明」，于是把旧色又存一遍 —— 切不回来。
    const source = await readSource();
    expect(source).toContain(
      "const normalizedCommittedValue = transparent ? TRANSPARENT_COLOR_VALUE : normalizedValue;"
    );
    expect(source).toContain("committedRef.current = normalizedCommittedValue;");
  });
});

describe("InlineEditableValue 编辑态的入口与回落（源码守卫）", () => {
  // 变异验证实测：下面两条删掉后本文件 34 条渲染层用例一条不红 ——
  // activate 在 onClick 闭包里，Select 分支在 editing 为真时才可达，
  // 而 renderToStaticMarkup 既不点击也不迁移状态。
  test("点击进入编辑态时 disabled / readOnly 都要早退", async () => {
    const source = await readSource();
    const activate = source.slice(
      source.indexOf("const activate = () => {"),
      source.indexOf("const commitText")
    );
    // 只判 disabled 的话，readOnly 的属性行一点就变成可编辑，能改能存 —— 只读形同虚设
    expect(activate).toContain("if (disabled || readOnly) {");
    expect(activate).toContain("setEditing(true);");
  });

  test("候选列表为空数组时回落到输入框，不渲染空 Select", async () => {
    const source = await readSource();
    // 少判 length 的表现：`options: []` 的行一点进去就是一个没有选项、也打不开的
    // 下拉框，用户既选不了也退不出来（onOpenChange 关掉才会 setEditing(false)）。
    expect(source).toContain("if (optionList && optionList.length > 0) {");
  });
});

/* ---------- InlineEditableValue 浏览态 ---------- */

describe("InlineEditableValue 浏览态", () => {
  test("readOnly 渲染成 span 而非 button（不可点）", () => {
    const html = renderToStaticMarkup(createElement(InlineEditableValue, {
      value: "abc",
      readOnly: true,
      onCommit: vi.fn()
    }));
    expect(html).toContain("<span");
    expect(html).not.toContain("<button");
    expect(html).toContain("read-only");
  });

  test("disabled 同样退化成只读 span", () => {
    const html = renderToStaticMarkup(createElement(InlineEditableValue, {
      value: "abc",
      disabled: true,
      onCommit: vi.fn()
    }));
    expect(html).toContain("read-only");
    expect(html).not.toContain("<button");
  });

  test("可编辑时渲染成 button（点击进入编辑）", () => {
    const html = renderToStaticMarkup(createElement(InlineEditableValue, {
      value: "abc",
      onCommit: vi.fn()
    }));
    expect(html).toContain('type="button"');
  });

  test("候选项值表随 data 属性透出，供 e2e 按值选中", () => {
    const html = renderToStaticMarkup(createElement(InlineEditableValue, {
      value: "b",
      options: [{ value: "a" }, { value: "b" }, { value: "c" }],
      onCommit: vi.fn()
    }));
    expect(html).toContain('data-inline-option-values="a|b|c"');
  });

  test("无候选时不输出该属性（不留空串误导选择器）", () => {
    const html = renderToStaticMarkup(createElement(InlineEditableValue, {
      value: "abc",
      onCommit: vi.fn()
    }));
    expect(html).not.toContain("data-inline-option-values");
  });

  test("显示值优先级：displayValue > 命中候选项的 label > 原值", () => {
    const withDisplay = renderToStaticMarkup(createElement(InlineEditableValue, {
      value: "b",
      displayValue: "自定义显示",
      options: [{ value: "b", label: "候选项标签" }],
      onCommit: vi.fn()
    }));
    expect(withDisplay).toContain("自定义显示");
    expect(withDisplay).not.toContain("候选项标签");

    const withOptionLabel = renderToStaticMarkup(createElement(InlineEditableValue, {
      value: "b",
      options: [{ value: "b", label: "候选项标签" }],
      onCommit: vi.fn()
    }));
    expect(withOptionLabel).toContain("候选项标签");

    // value 命中不到任何候选项时回落原值，不能显示成空白
    const unmatched = renderToStaticMarkup(createElement(InlineEditableValue, {
      value: "zzz",
      options: [{ value: "a", label: "甲" }],
      onCommit: vi.fn()
    }));
    expect(unmatched).toContain("zzz");
  });

  test("候选项没给 label 时用值本身", () => {
    const html = renderToStaticMarkup(createElement(InlineEditableValue, {
      value: "b",
      options: [{ value: "b" }],
      onCommit: vi.fn()
    }));
    expect(html).toContain(">b<");
  });

  test("值为空时渲染不换行空格，而不是塌成零高的按钮", () => {
    // 属性表每行固定高度，出一个 0 高的按钮整行就错位了
    for (const props of [{ value: "" }, { value: "", readOnly: true }]) {
      const html = renderToStaticMarkup(createElement(InlineEditableValue, {
        ...props,
        onCommit: vi.fn()
      }));
      expect(html, JSON.stringify(props)).toContain("\u00a0");
    }
  });

  test("className 追加在基名与 modified 之后", () => {
    const html = renderToStaticMarkup(createElement(InlineEditableValue, {
      value: "x",
      className: "cell-color",
      modified: true,
      onCommit: vi.fn()
    }));
    expect(html).toContain('class="inline-property-value modified cell-color"');
  });

  test("onCommit 不会在渲染期被调用（进编辑态才提交）", () => {
    const onCommit = vi.fn();
    renderToStaticMarkup(createElement(InlineEditableValue, { value: "abc", onCommit }));
    expect(onCommit).not.toHaveBeenCalled();
  });
});
