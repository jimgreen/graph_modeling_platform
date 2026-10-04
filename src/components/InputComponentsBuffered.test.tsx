// BufferedTextInput / BufferedTextarea 的缓冲提交语义。
//
// 此前 InputComponents.tsx 12.8KB 只有 1 条静态渲染断言（InlineEditableValue 的
// modified class）。而「缓冲提交」这套状态机决定用户敲的字会不会丢：
// 编辑期间只改草稿，失焦/提交键才回调。判定写错的表现是「输完的字没保存」或
// 「按了取消却把改动提交了」—— 都只在真键盘交互下现形，静态渲染看不到。
//
// 这批用例同时钉住 useBufferedCommit 的抽取：两个组件曾各存一份 ~30 行
// 逐行相同的实现，唯一差别是提交键（单行 Enter / 多行 Ctrl/Cmd+Enter）。
// 合成一份内核后，两者的行为必须仍然完全一致。
//
// 关于守卫手段：缓冲状态机全在 useState/useRef/useEffect 闭包里，要真跑起来需要
// 渲染器，而本仓 vitest 全局 environment 是 node、没装 jsdom 也没有
// react-test-renderer（引入它是新增依赖，超出「补守卫」的范围）。故这里沿用本仓
// 既成做法（appView.test.tsx / EFileEditor.test.tsx 都是这么做的）：**渲染层断言
// 走 renderToStaticMarkup 验透传，闭包内判定走源码扫描**。下面每条源码守卫都注明
// 它守的是哪条行为，以及为什么只能这么守。
import { createElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { BufferedTextInput, BufferedTextarea } from "./InputComponents";

async function readSource(): Promise<string> {
  const { readFileSync } = await import("node:fs");
  return readFileSync(new URL("./InputComponents.tsx", import.meta.url), "utf8");
}

async function hookBody(): Promise<string> {
  const source = await readSource();
  return source.slice(
    source.indexOf("function useBufferedCommit<"),
    source.indexOf("export type BufferedTextInputProps")
  );
}


/**
 * 极简的事件探针：不渲染 React 树，直接调组件内部的处理函数。
 *
 * 走 DOM 需要 jsdom（本仓全局 environment 是 node），而缓冲逻辑全在
 * onKeyDown/onBlur/onChange 三个闭包里 —— 把它们摘出来直接驱动，比模拟
 * 真实按键更准，且能断言「回调被调用了几次、参数是什么」。
 */

describe("缓冲提交内核（源码契约）", () => {
  // 抽取后两处薄壳只应保留「提交键判定」这一条差异。
  // 静态扫描的理由：状态机是闭包内的，真渲染 + 真按键要 jsdom，
  // 而本仓没有装；断言「两份拷贝已收敛成一份内核」是这次重构的核心不变式。
  test("缓冲提交状态机只存在于 useBufferedCommit 一处（不再有两份拷贝）", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("./InputComponents.tsx", import.meta.url), "utf8");
    // 直接切内核函数的体 —— 用全文正则会被文档注释里提到的同名标识符数进去。
    const hookBody = source.slice(
      source.indexOf("function useBufferedCommit<"),
      source.indexOf("export type BufferedTextInputProps")
    );
    // 三个标志物：草稿 state、已提交值 ref、onCommit 的 ref 转发，各只应有一份
    expect((hookBody.match(/const \[draftValue, setDraftValue\] = useState/g) ?? []).length).toBe(1);
    expect((hookBody.match(/const committedValueRef = useRef/g) ?? []).length).toBe(1);
    expect((hookBody.match(/const onCommitRef = useRef\(onCommit\)/g) ?? []).length).toBe(1);

    // 内核之外不得再有第二份状态机。范围要卡准：只取两个薄壳本体，
    // 夹在中间的 InlineEditableValue 有一份**语义不同**的草稿 state（见下一条用例），
    // 把它算进来会误报。
    const shells = [
      source.slice(
        source.indexOf("export function BufferedTextInput("),
        source.indexOf("export function InlineEditableValue(")
      ),
      source.slice(source.indexOf("export function BufferedTextarea("))
    ].join(String.fromCharCode(10));
    expect((shells.match(/const \[draftValue, setDraftValue\] = useState/g) ?? []).length).toBe(0);
    expect(shells).not.toContain("committedValueRef");
  });

  test("两个薄壳都经 useBufferedCommit 拿内核", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("./InputComponents.tsx", import.meta.url), "utf8");
    // 一次定义 + 两次调用 = 3
    const uses = (source.match(/useBufferedCommit</g) ?? []).length;
    expect(uses, "两个薄壳都应调用 useBufferedCommit").toBe(3);
  });

  test("InlineEditableValue 保持独立实现（语义不同，不并入内核）", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("./InputComponents.tsx", import.meta.url), "utf8");
    const block = source.slice(
      source.indexOf("export function InlineEditableValue("),
      source.indexOf("export function BufferedTextarea(")
    );
    // 它有 editing 开关、无去重 —— 两条都与内核不同
    expect(block).toContain("const [editing, setEditing] = useState(false)");
    expect(block).not.toContain("useBufferedCommit");
  });
});

describe("BufferedTextInput", () => {
  test("value 落到 input 的 value 属性上（草稿初值 = 入参）", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      createElement(BufferedTextInput, { value: "初始值", onCommit: vi.fn() })
    );
    expect(html).toContain("初始值");
  });

  test("value 为数字时归一化成字符串（不会渲染成 undefined）", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      createElement(BufferedTextInput, { value: 42, onCommit: vi.fn() })
    );
    expect(html).toContain("42");
    expect(html).not.toContain("undefined");
  });

  test("value 为 null/undefined 时渲染空串而不是 'null'/'undefined'", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    for (const value of [null, undefined] as Array<string | number | null | undefined>) {
      const html = renderToStaticMarkup(
        createElement(BufferedTextInput, { value: value as never, onCommit: vi.fn() })
      );
      expect(html, String(value)).not.toContain("undefined");
      expect(html, String(value)).not.toContain("null");
    }
  });

  test("disabled 透传到 DOM", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      createElement(BufferedTextInput, { value: "x", disabled: true, onCommit: vi.fn() })
    );
    expect(html).toContain("disabled");
  });

  test("其余 props 透传（name / placeholder / aria-label）", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      createElement(BufferedTextInput, {
        value: "x",
        name: "rated_capacity",
        placeholder: "请输入",
        "aria-label": "额定容量",
        onCommit: vi.fn()
      })
    );
    expect(html).toContain('name="rated_capacity"');
    expect(html).toContain('placeholder="请输入"');
    expect(html).toContain('aria-label="额定容量"');
  });

  test("onCommit 不会在渲染期被调用（缓冲的核心：编辑期不提交）", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const onCommit = vi.fn();
    renderToStaticMarkup(createElement(BufferedTextInput, { value: "x", onCommit }));
    expect(onCommit).not.toHaveBeenCalled();
  });
});

/**
 * 闭包内的三条提交判定 —— 只能用源码守卫。
 *
 * 变异验证实测：这三条删掉后上面 15 条一条不红（它们全在 useState/useRef/useEffect
 * 构成的闭包里，renderToStaticMarkup 根本不执行这些分支；直接调 hook 又因为 React 19
 * 的 dispatcher 由 reconciler 注入、react 包里拿不到而抛 "Cannot read properties of
 * null (reading 'useState')"）。装 jsdom / react-test-renderer 是新增依赖，超出范围。
 */
describe("缓冲提交内核的提交判定（源码守卫）", () => {
  test("值未变则不提交：提交前必须比对 committedValueRef", async () => {
    const body = await hookBody();
    // 没有这条，用户只是点进输入框再点出来（值没改）也会触发一次保存。
    expect(body).toContain("if (nextValue !== committedValueRef.current) {");
  });

  test("disabled 时一律不提交（早于去重判定）", async () => {
    const body = await hookBody();
    const commitBlock = body.slice(body.indexOf("const commitValue"), body.indexOf("useEffect"));
    const disabledIndex = commitBlock.indexOf("if (disabled)");
    const dedupeIndex = commitBlock.indexOf("nextValue !== committedValueRef.current");
    expect(disabledIndex, "缺少 disabled 早退").toBeGreaterThanOrEqual(0);
    expect(dedupeIndex, "缺少去重判定").toBeGreaterThanOrEqual(0);
    // 顺序要紧：先判 disabled 再判去重，反了会让 disabled 状态下的提交漏出去
    expect(disabledIndex).toBeLessThan(dedupeIndex);

    // ↑↑ 上面两条 `toBeGreaterThanOrEqual(0)` **不是**「恒真」的空断言，审计记录如下。
    //
    // 常见坑是拿 `x >= 0` 去守一个「正常路径下不可能为 undefined」的量 —— 那种才退化成恒真。
    // 这里两个量都来自 `String.prototype.indexOf`：命中返回 >= 0 的下标，未命中返回 **-1**，
    // 而 `-1 >= 0` 为 false。于是每条都真能转红 —— 未命中即失败，不是被 undefined 放过。
    //
    // 变异验证（注入进 InputComponents.tsx 的备份副本，跑完从副本还原，不用 git checkout）：
    //   M1 删掉 useBufferedCommit 里 `if (disabled) { return; }` 三行，保留去重判定
    //      => RED:「缺少 disabled 早退: expected -1 to be greater than or equal to 0」
    //      只有第 1 行转红、第 2 行仍绿 ⇒ 第 1 行有独立鉴别力。
    //   M4 只删掉去重判定那层 if，**保留** disabled 早退
    //      => RED:「缺少去重判定: expected -1 to be greater than or equal to 0」
    //      第 1 行此时是绿的，只有第 2 行转红 ⇒ 第 2 行也没被第 1 行/顺序断言遮蔽。
    //      （M4 下 `值未变则不提交` 那条也会一并转红，它含同样的 token —— 覆盖面重叠，
    //        不是第 2 行无效：第 2 行是唯一定位「缺的是哪一条」的那条。）
    //   M2 把 disabled 早退挪到去重之后 => RED，由上面那条 toBeLessThan 抓住。
    //
    // 第 2 行逻辑上被「第 1 行 + toBeLessThan」蕴含（dedupeIndex 必须 > disabledIndex >= 0）。
    // 它仍然留着，因为它是**诊断守卫**：没有它，缺去重判定时报的是
    //「expected 3 to be less than -1」这种看不出意图的错；留着就直接点名「缺少去重判定」。
    //
    // 已知边界（写下来免得下一个人重新查一遍）：这三条证明的是
    //「守卫 token 存在且顺序正确」，**不是**「守卫真的拦得住」。
    // 变异 M3 把 `if (disabled) { return; }` 的函数体换成一行注释、`if (disabled)` 这个
    // token 原地保留、顺序也没变 ⇒ 本 describe 整组仍全绿，而 disabled 提交其实已经漏出去。
    // 这是源码扫描的固有上限（jsdom / react-test-renderer 都不可用，见文件头），
    // 补不了就别假装补了：真要守这条，得能跑起 React 闭包。
  });

  test("外部 value 变化时草稿与已提交值一起同步", async () => {
    const body = await hookBody();
    // 只同步 committedValueRef 而不同步草稿 ⇒ 外部改了值、输入框还显示旧的
    expect(body).toMatch(/committedValueRef\.current = normalizedValue;\s*setDraftValue\(normalizedValue\);/);
  });

  test("onCommit 经 ref 转发（否则拿到首次渲染的旧闭包）", async () => {
    const body = await hookBody();
    expect(body).toMatch(/onCommitRef\.current = onCommit;/);
    expect(body).toContain("onCommitRef.current(nextValue);");
  });

  test("revertDraft 回到已提交值而非清空", async () => {
    const body = await hookBody();
    // Escape 的语义是「放弃本次编辑」，不是「清空输入框」
    expect(body).toMatch(/revertDraft:\s*\(\)\s*=>\s*setDraftValue\(committedValueRef\.current\)/);
    // 两个薄壳都必须用 revertDraft，而不是直接 setDraftValue("") 之类
    const source = await readSource();
    const shells = source.slice(source.indexOf("export function BufferedTextInput("));
    expect((shells.match(/revertDraft\(\);/g) ?? []).length).toBe(2);
  });

  test("两个薄壳都从内核解构出完整的五件套", async () => {
    const source = await readSource();
    for (const name of ["BufferedTextInput", "BufferedTextarea"]) {
      const block = source.slice(source.indexOf(`export function ${name}(`));
      expect(block.slice(0, 400), name).toContain("useBufferedCommit<");
      for (const piece of ["draftValue", "setDraftValue", "commitValue", "commitDraft", "revertDraft"]) {
        expect(block.slice(0, 400), `${name} 缺 ${piece}`).toContain(piece);
      }
    }
  });
});

describe("BufferedTextarea", () => {
  test("渲染 textarea 而非 input", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      createElement(BufferedTextarea, { value: "多行", onCommit: vi.fn() })
    );
    expect(html).toContain("<textarea");
  });

  test("value 归一化与 disabled 透传，与单行版一致", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      createElement(BufferedTextarea, { value: 7, disabled: true, onCommit: vi.fn() })
    );
    expect(html).toContain("7");
    expect(html).toContain("disabled");
    expect(html).not.toContain("undefined");
  });

  test("onCommit 不会在渲染期被调用", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const onCommit = vi.fn();
    renderToStaticMarkup(createElement(BufferedTextarea, { value: "x", onCommit }));
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("两个组件的提交键差异（源码契约）", () => {
  // 走 jsdom 才能真按键；这里断言薄壳里保留的判定差异 ——
  // 单行是裸 Enter，多行必须 Ctrl/Cmd+Enter（多行里裸 Enter 是换行，不是提交）。
  //
  // 范围要卡在**组件函数体内**：薄壳开头还有一句 `shouldCommit` 回调也写着同样的
  // 判定，整块匹配的话「把 JSX 里的判定改掉」这种变异仍能满足断言（实测踩过）。
  async function shellBody(name: string, nextName: string): Promise<string> {
    const source = await readSource();
    return source.slice(
      source.indexOf(`export function ${name}(`),
      source.indexOf(`export function ${nextName}(`)
    );
  }

  test("单行：Enter 提交，Escape 还原，且不要求修饰键", async () => {
    const block = await shellBody("BufferedTextInput", "InlineEditableValue");
    expect(block).toContain('if (event.key === "Enter") {');
    // 单行版不得出现修饰键判定：加了 Ctrl 就得多按一次键才能保存
    expect(block).not.toContain("event.ctrlKey");
    expect(block).not.toContain("event.metaKey");
    expect(block).toContain("revertDraft();");
  });

  test("多行：必须是 Ctrl/Cmd+Enter，裸 Enter 是换行不提交", async () => {
    const block = await shellBody("BufferedTextarea", "ZZZ_NO_SUCH_FUNCTION");
    expect(block).toContain('if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {');
    expect(block).toContain("revertDraft();");
  });

  test("两者都先转发调用方的 onKeyDown，并尊重 defaultPrevented", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("./InputComponents.tsx", import.meta.url), "utf8");
    // 调用方可以 preventDefault 接管按键（两处都要有，且在提交判定之前）
    const forwardCount = (source.match(/onKeyDown\?\.\(event as any\)/g) ?? []).length;
    expect(forwardCount).toBe(2);
    const preventCount = (source.match(/if \(event\.defaultPrevented\) \{\s*return;/g) ?? []).length;
    expect(preventCount).toBe(2);
  });
});
