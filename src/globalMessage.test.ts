// globalMessage：全局 message / confirm / prompt（此前只有 windowCloseCoverage 的源码扫描，
// 无任何行为测试）。
//
// 这是全仓调用最广的「弹窗」出口（替代 window.alert/confirm/prompt）。
// 行为写错的表现都很隐蔽：XSS 未转义只在特定文案下现形、队列上限算错只在连发时现形、
// 重复 resolve 只在被连点时现形。
//
// 本仓 vitest 全局 environment 是 node 且没装 jsdom，故按 src/fileDownload.test.ts
// 的同款做法用 vi.stubGlobal 造最小 document/window —— 但这个模块比 fileDownload 复杂
// （innerHTML / appendChild / addEventListener / requestAnimationFrame / focus），
// 所以手写一个极简 DOM 桩。
import { describe, expect, it, beforeEach, afterEach, afterAll, vi } from "vitest";

// ─── 极简 DOM 桩 ───────────────────────────────────────────

class StubClassList {
  private readonly set = new Set<string>();
  add(...names: string[]) { names.forEach((n) => this.set.add(n)); }
  remove(...names: string[]) { names.forEach((n) => this.set.delete(n)); }
  contains(name: string) { return this.set.has(name); }
  get value() { return [...this.set].join(" "); }
  toString() { return this.value; }
}

class StubElement {
  readonly tagName: string;
  classList: StubClassList = new StubClassList();
  readonly children: StubElement[] = [];
  parent: StubElement | null = null;
  /** innerHTML 每次赋值都记一笔 —— 模块用 innerHTML 塞转义后的文案 */
  htmlHistory: string[] = [];
  private _innerHTML = "";
  get innerHTML() { return this._innerHTML; }
  set innerHTML(value: string) {
    this._innerHTML = value;
    this.htmlHistory.push(value);
  }
  textContent = "";
  title = "";
  value = "";
  type = "";
  style: Record<string, string> & { cssText: string } = { cssText: "" };
  attributes = new Map<string, string>();
  listeners = new Map<string, Array<(event: unknown) => void>>();
  focused = false;
  selected = false;
  removed = false;
  /**
   * 真实 DOM 里 className 与 classList 是同一份状态的两面。模块两处都在用
   * （容器用 className=，消息项用 classList.add），桩必须把它们连起来，
   * 否则 findAll 按 classList 找、而容器是 className 挂的 —— 一条都找不到。
   */
  private _className = "";
  get className() { return this._className; }
  set className(value: string) {
    this._className = value;
    this.classList = new StubClassList();
    for (const name of value.split(/\s+/).filter(Boolean)) this.classList.add(name);
  }

  constructor(tagName: string) {
    this.tagName = tagName;
  }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  appendChild(child: StubElement) {
    child.parent = this;
    this.children.push(child);
    return child;
  }
  addEventListener(type: string, handler: (event: unknown) => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(handler);
    this.listeners.set(type, list);
  }
  removeEventListener(type: string, handler: (event: unknown) => void) {
    const list = this.listeners.get(type) ?? [];
    const index = list.indexOf(handler);
    if (index >= 0) list.splice(index, 1);
  }
  dispatch(type: string, event: unknown = {}) {
    for (const handler of [...(this.listeners.get(type) ?? [])]) handler(event);
  }
  contains(node: StubElement): boolean {
    if (node === this) return true;
    return this.children.some((child) => child.contains(node));
  }
  remove() {
    this.removed = true;
    if (this.parent) {
      this.parent.children.splice(this.parent.children.indexOf(this), 1);
      this.parent = null;
    }
  }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  /** 深度优先找出所有匹配 class 的后代 */
  findAll(className: string): StubElement[] {
    const out: StubElement[] = [];
    for (const child of this.children) {
      if (child.classList.contains(className)) out.push(child);
      out.push(...child.findAll(className));
    }
    return out;
  }
  find(className: string): StubElement | undefined {
    return this.findAll(className)[0];
  }
  byId(id: string): StubElement | null {
    if (this.attributes.get("id") === id) return this;
    for (const child of this.children) {
      const hit = child.byId(id);
      if (hit) return hit;
    }
    return null;
  }
}

function installDom() {
  const body = new StubElement("body");
  const doc = {
    body,
    createElement: (tag: string) => new StubElement(tag),
    // 模块用 document.addEventListener 挂 Esc 监听、用 removeEventListener 摘掉
    listeners: new Map<string, Array<(event: unknown) => void>>(),
    addEventListener(type: string, handler: (event: unknown) => void) {
      const list = this.listeners.get(type) ?? [];
      list.push(handler);
      this.listeners.set(type, list);
    },
    removeEventListener(type: string, handler: (event: unknown) => void) {
      const list = this.listeners.get(type) ?? [];
      const index = list.indexOf(handler);
      if (index >= 0) list.splice(index, 1);
    },
    dispatch(type: string, event: unknown) {
      for (const handler of [...(this.listeners.get(type) ?? [])]) handler(event);
    }
  };
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", globalThis as unknown as Record<string, unknown>);
  vi.stubGlobal("requestAnimationFrame", (cb: () => void) => { cb(); return 1; });
  return { body, doc };
}

// ─── 共享全局污染：本文件是「真弹窗泄漏到 globalThis」的源头 ──────────
//
// src/globalMessage.ts 末尾三行在**模块加载期**把真弹窗写回 window（:163-165）。而本文件
// installDom() 里 `vi.stubGlobal("window", globalThis)` 使 window 与 globalThis 是**同一个对象**
// ⇒ 真弹窗直接落到共享全局上。本仓 test.environment 是 node，真弹窗一被调用就是
// `document.createElement` ⇒ `ReferenceError: document is not defined`，连累后续任何文件。
//
// 为什么不能交给 vi.unstubAllGlobals()：它**只还原本文件 stub 过的键**
// （document / window / requestAnimationFrame），被顶上去的那三个弹窗键它压根不认识。
// 而 src/test-setup.ts 的 noop 是条件式补桩（`typeof … !== "function"` 才装），真弹窗是函数
// ⇒ noop 装不回来 ⇒ 这份污染不可自愈，只能由本文件自己擦。
//
// 擦法：文件加载时快照这三个键，import 之后按快照逐键还原；「本来就没有」的键用 delete
// 还原成「不存在」（与 memoryWatch.test.ts 的 baseline 约定一致：这三处不可能合法地是 undefined）。
//
// 变异验证记录（受害者探针：单独一个不 import 任何业务模块的测试文件，只在共享 globalThis
// 上读这三个键、断言「调用不抛且体内不含 getContainer」；装置为关隔离 + 单线程 +
// 强制 globalMessage.test.ts 先跑的 sequencer，跑完即删，不留在仓库里）：
//   · 三处还原（loadFresh / afterEach / afterAll）**全部**删掉 → 探针转红（真弹窗残留）。
//     这才是这套守卫的承重面。
//   · 只删其中任意一处 → 全绿。这**不是**守卫失效，是三处对「本文件执行完之后」的观测窗口
//     而言彼此等价：探针只在本文件彻底跑完后读一次全局，而 loadFresh 在每次 import 后就擦、
//     afterEach 在每条用例后擦、afterAll 在文件末擦 —— 任意一处存活就足以让全局干净。
//     保留三处是有意的冗余（belt-and-braces），不是三条独立的承重断言。
//   · 若将来其中一处真的坏了而另外两处还在，探针**不会**报红 —— 那时靠的是「三处都在」
//     这个事实，而不是任何单点断言。别把某处的删除当成无害重构。
const LEAKED_POPUP_GLOBALS = ["showGlobalMessage", "showGlobalConfirm", "showGlobalPrompt"] as const;
type LeakedPopupKey = (typeof LEAKED_POPUP_GLOBALS)[number];

function snapshotPopupGlobals(): Array<[LeakedPopupKey, unknown]> {
  const scope = globalThis as unknown as Record<string, unknown>;
  return LEAKED_POPUP_GLOBALS.map((key) => [key, scope[key]]);
}

function restorePopupGlobals(snapshot: Array<[LeakedPopupKey, unknown]>): void {
  const scope = globalThis as unknown as Record<string, unknown>;
  for (const [key, value] of snapshot) {
    if (value === undefined) delete scope[key];
    else scope[key] = value;
  }
}

// 模块级快照取自本文件被收集时（setupFiles 之后）的全局基线；本文件没有任何用例会合法地
// 改这三个键，所以这一份快照同时供 afterEach 与 afterAll 使用。
const popupGlobalsBaseline = snapshotPopupGlobals();

// 模块级状态（container / nextId / queue）在模块加载时建立 —— 每条用例前重置模块，
// 否则 MAX_VISIBLE 队列与 nextId 会跨用例串味。
type GlobalMessageModule = typeof import("./globalMessage");

async function loadFresh(): Promise<{ mod: GlobalMessageModule; body: StubElement }> {
  vi.resetModules();
  const { body } = installDom();
  const mod = await import("./globalMessage");
  // import 刚把真弹窗挂上这三个键，在任何用例跑到之前就按基线擦掉。
  // 本文件的用例一律走 mod.* 的具名导入，从不读 window 上的副本，所以擦掉不影响任何断言。
  // （与 afterEach / afterAll 那两处是并列冗余，见上面的变异验证记录。）
  restorePopupGlobals(popupGlobalsBaseline);
  return { mod, body };
}

let body: StubElement;
let mod: GlobalMessageModule;

beforeEach(async () => {
  // 全量用假定时器：removeMessage 里的 el.remove() 是 setTimeout(…, 300) 延迟的，
  // 真定时器下断言得 sleep 300ms，而 27 条一起跑就变成 8 秒。
  vi.useFakeTimers();
  ({ mod, body } = await loadFresh());
});

afterEach(() => {
  vi.useRealTimers();
  // 分工明确：unstubAllGlobals 只管本文件 stub 过的 document/window/requestAnimationFrame，
  // 它**不认识**真弹窗那三个键 —— 那三个由 restorePopupGlobals 负责，逐键精确还原。
  vi.unstubAllGlobals();
  restorePopupGlobals(popupGlobalsBaseline);
  vi.resetModules();
});

// 离开本文件时再擦一次：即便将来有人在上面新增一条 import 路径，
// 也保证「本文件弄脏了共享全局」这件事不会传给后续文件。
afterAll(() => {
  restorePopupGlobals(popupGlobalsBaseline);
});

// ─── showGlobalMessage ─────────────────────────────────────

describe("globalMessage / showGlobalMessage", () => {
  it("渲染一条消息到全局容器", () => {
    mod.showGlobalMessage("保存成功");
    const items = body.findAll("global-message-item");
    expect(items).toHaveLength(1);
    expect(items[0]!.htmlHistory).toContain("保存成功");
  });

  it("容器挂在 body 上且复用同一个（不每次新建）", () => {
    mod.showGlobalMessage("一");
    mod.showGlobalMessage("二");
    const containers = body.findAll("global-message-container");
    expect(containers).toHaveLength(1);
    expect(containers[0]!.children).toHaveLength(2);
  });

  it("XSS：尖括号与引号被转义，不产生可执行标记", () => {
    mod.showGlobalMessage('<img src=x onerror="alert(1)">');
    const html = body.find("global-message-item")!.htmlHistory.at(-1)!;
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&quot;");
  });

  it("& < > \" ' 五类元字符都转义", () => {
    mod.showGlobalMessage(`&<>"'`);
    const html = body.find("global-message-item")!.htmlHistory.at(-1)!;
    expect(html).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("换行转成 <br>（多行提示可见）", () => {
    mod.showGlobalMessage("第一行\n第二行");
    const html = body.find("global-message-item")!.htmlHistory.at(-1)!;
    expect(html).toContain("<br>");
  });

  it("最多同时显示 3 条，超出的最早一条被移除", () => {
    for (let i = 1; i <= 5; i += 1) mod.showGlobalMessage(`消息${i}`);
    // 超出上限的移除是延迟 300ms 的（带离场动画），推进定时器让它落地
    vi.advanceTimersByTime(300);
    const items = body.findAll("global-message-item");
    // 队列上限 3：留下的应是最后 3 条
    expect(items).toHaveLength(3);
    expect(items.map((el) => el.htmlHistory.at(-1))).toEqual(["消息3", "消息4", "消息5"]);
  });

  it("点击消息即移除", () => {
    mod.showGlobalMessage("点我");
    const item = body.find("global-message-item")!;
    item.dispatch("click");
    vi.advanceTimersByTime(300);
    expect(body.findAll("global-message-item")).toHaveLength(0);
  });

  it("4 秒后自动关闭", () => {
    mod.showGlobalMessage("自动消失");
    expect(body.findAll("global-message-item")).toHaveLength(1);
    vi.advanceTimersByTime(4000);
    vi.advanceTimersByTime(300);
    expect(body.findAll("global-message-item")).toHaveLength(0);
  });

  it("进入动画 class 在下一帧加上", () => {
    // 桩里 requestAnimationFrame 是同步执行的，所以这里断言最终带上了 enter
    mod.showGlobalMessage("动画");
    expect(body.find("global-message-item")!.classList.contains("global-message-enter")).toBe(true);
  });

  it("body 被替换后重新挂容器（不往已卸载的节点里塞）", () => {
    mod.showGlobalMessage("第一条");
    // 模拟整页刷新导致旧容器从 document.body 消失
    const fresh = installDom();
    mod.showGlobalMessage("第二条");
    expect(fresh.body.findAll("global-message-container")).toHaveLength(1);
    expect(fresh.body.findAll("global-message-item")).toHaveLength(1);
  });
});

// ─── showGlobalConfirm / showGlobalPrompt ──────────────────

describe("globalMessage / showGlobalConfirm", () => {
  it("点确定 ⇒ resolve(true)", async () => {
    const promise = mod.showGlobalConfirm("确定吗");
    const ok = body.find("global-confirm-ok")!;
    ok.dispatch("click");
    await expect(promise).resolves.toBe(true);
  });

  it("点取消 ⇒ resolve(false)", async () => {
    const promise = mod.showGlobalConfirm("确定吗");
    body.find("global-confirm-cancel")!.dispatch("click");
    await expect(promise).resolves.toBe(false);
  });

  it("点右上角关闭 ⇒ resolve(false)（不是 true）", async () => {
    const promise = mod.showGlobalConfirm("确定吗");
    const close = body.find("window-close-button")!;
    expect(close.getAttribute("aria-label")).toBe("关闭确认窗口");
    close.dispatch("click");
    await expect(promise).resolves.toBe(false);
  });

  it("Esc ⇒ resolve(false)", async () => {
    const promise = mod.showGlobalConfirm("确定吗");
    const doc = (globalThis as unknown as { document: { dispatch(type: string, e: unknown): void } }).document;
    doc.dispatch("keydown", { key: "Escape" });
    await expect(promise).resolves.toBe(false);
  });

  it("其它按键不 resolve（只有 Esc 生效）", async () => {
    const settled = { done: false };
    mod.showGlobalConfirm("确定吗").then(() => { settled.done = true; });
    const doc = (globalThis as unknown as { document: { dispatch(type: string, e: unknown): void } }).document;
    doc.dispatch("keydown", { key: "Enter" });
    await Promise.resolve();
    expect(settled.done).toBe(false);
  });

  it("遮罩带 role=dialog / aria-modal / aria-label", () => {
    void mod.showGlobalConfirm("确定吗");
    const dialog = body.find("global-confirm-dialog")!;
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("确认操作");
  });

  it("confirm 没有输入框，prompt 有", () => {
    void mod.showGlobalConfirm("确定吗");
    expect(body.find("global-prompt-input")).toBeUndefined();
  });

  it("消息文案同样走转义", () => {
    void mod.showGlobalConfirm("<b>粗体</b>");
    const msg = body.find("global-confirm-message")!;
    expect(msg.htmlHistory.at(-1)).toContain("&lt;b&gt;");
  });
});

describe("globalMessage / showGlobalPrompt", () => {
  it("点确定 ⇒ resolve 输入框的值", async () => {
    const promise = mod.showGlobalPrompt("请输入", "初值");
    const input = body.find("global-prompt-input")!;
    expect(input.value).toBe("初值");
    input.value = "改过的值";
    body.find("global-confirm-ok")!.dispatch("click");
    await expect(promise).resolves.toBe("改过的值");
  });

  it("点取消 ⇒ resolve(null)（不是空串）", async () => {
    const promise = mod.showGlobalPrompt("请输入", "初值");
    body.find("global-confirm-cancel")!.dispatch("click");
    await expect(promise).resolves.toBeNull();
  });

  it("Esc ⇒ resolve(null)", async () => {
    const promise = mod.showGlobalPrompt("请输入");
    const doc = (globalThis as unknown as { document: { dispatch(type: string, e: unknown): void } }).document;
    doc.dispatch("keydown", { key: "Escape" });
    await expect(promise).resolves.toBeNull();
  });

  it("输入框回车 ⇒ resolve 当前值（不关闭对话框按钮）", async () => {
    const promise = mod.showGlobalPrompt("请输入");
    const input = body.find("global-prompt-input")!;
    input.value = "回车的值";
    input.dispatch("keydown", { key: "Enter" });
    await expect(promise).resolves.toBe("回车的值");
  });

  it("输入框内其它按键不 resolve", async () => {
    const settled = { done: false };
    mod.showGlobalPrompt("请输入").then(() => { settled.done = true; });
    const input = body.find("global-prompt-input")!;
    input.dispatch("keydown", { key: "a" });
    await Promise.resolve();
    expect(settled.done).toBe(false);
  });

  it("aria-label 与 confirm 不同（输入窗口）", () => {
    void mod.showGlobalPrompt("请输入");
    expect(body.find("global-confirm-dialog")!.getAttribute("aria-label")).toBe("输入");
    expect(body.find("window-close-button")!.getAttribute("aria-label")).toBe("关闭输入窗口");
  });

  it("默认值为空串时输入框也是空串（不是 undefined）", () => {
    void mod.showGlobalPrompt("请输入");
    expect(body.find("global-prompt-input")!.value).toBe("");
  });
});

// ─── 重复 resolve 防护 ─────────────────────────────────────

describe("globalMessage / 重复关闭只 resolve 一次", () => {
  it("连点确定与取消 ⇒ 只结算一次", async () => {
    const calls: unknown[] = [];
    const promise = mod.showGlobalConfirm("确定吗").then((v) => { calls.push(v); return v; });
    const ok = body.find("global-confirm-ok")!;
    const cancel = body.find("global-confirm-cancel")!;
    ok.dispatch("click");
    cancel.dispatch("click");
    ok.dispatch("click");
    await promise;
    await Promise.resolve();
    expect(calls).toEqual([true]);
  });

  it("关闭后遮罩被移除，且键盘监听被摘掉", async () => {
    const promise = mod.showGlobalConfirm("确定吗");
    const overlay = body.find("global-confirm-overlay")!;
    const doc = (globalThis as unknown as { document: { listeners: Map<string, unknown[]> } }).document;
    const before = doc.listeners.get("keydown")?.length ?? 0;
    expect(before).toBeGreaterThan(0);

    body.find("global-confirm-ok")!.dispatch("click");
    await promise;
    vi.advanceTimersByTime(200);

    expect(body.findAll("global-confirm-overlay")).toHaveLength(0);
    expect(overlay.removed).toBe(true);
    // 键盘监听在关闭时被摘掉。
    //
    // 变异验证补记：删掉 `if (settled) return` 后这三条仍全绿 —— `settled` 守卫
    // **观察不到**。两条原因都查实了：
    //   ① Promise 只会结算一次，重复 resolve 天然被吞；
    //   ② removeEventListener 摘同一个 handler 两次是幂等的，监听器不会累积。
    // 守卫的价值是「少做一次 DOM 操作」而非正确性，属可省的冗余。
    // 保留监听器数量断言是为了守住「关闭后确实摘干净了」这条真正的契约。
    expect(doc.listeners.get("keydown")?.length ?? 0).toBe(0);
  });

  it("连点多次后 keydown 监听器仍被摘干净", async () => {
    const promise = mod.showGlobalConfirm("确定吗");
    const doc = (globalThis as unknown as { document: { listeners: Map<string, unknown[]> } }).document;
    const ok = body.find("global-confirm-ok")!;
    const cancel = body.find("global-confirm-cancel")!;
    ok.dispatch("click");
    cancel.dispatch("click");
    ok.dispatch("click");
    await promise;
    expect(doc.listeners.get("keydown")?.length ?? 0).toBe(0);
  });
});

// ─── 非字符串入参 ────────────────────────────────────────────
//
// `showGlobalMessage(text: string)` 的类型签名只挡编译期；运行期没有任何 String()
// 强转，`escapeHtmlToBr` 直接 `text.replace(...)`。因此所有非字符串入参都在
// 「渲染之前」抛 TypeError —— 不会出现 `[object Object]`，也渲染不出任何东西。
// 这条是契约，不是巧合：`escapeHtmlToBr` 只对 `replace` 链友好。

/** showGlobalMessage 的形参声明为 string，绕过它才能喂非字符串 */
const asText = (value: unknown) => value as unknown as string;

function captureThrow(run: () => void): Error | null {
  try {
    run();
    return null;
  } catch (e) {
    return e as Error;
  }
}

describe("globalMessage / showGlobalMessage 非字符串入参", () => {
  it("数字、布尔、对象、数组、NaN 一律抛 TypeError，不产生任何消息节点", () => {
    const cases: Array<[string, unknown]> = [
      ["数字", 42],
      ["NaN", Number.NaN],
      ["布尔", true],
      ["对象", { a: 1 }],
      ["数组", [1, 2]]
    ];
    for (const [label, value] of cases) {
      const err = captureThrow(() => mod.showGlobalMessage(asText(value)));
      expect(err, label).toBeInstanceOf(TypeError);
      // 抛在 innerHTML 赋值之前 ⇒ 没有任何 html 被写入，更不可能出现 [object Object]
      expect(body.findAll("global-message-item"), label).toHaveLength(0);
      expect(JSON.stringify(body.findAll("global-message-item").map((e) => e.htmlHistory)), label).not.toContain("object Object");
    }
  });

  it("null 与 undefined 同样抛 TypeError（读取 .replace 时自身为空）", () => {
    // 与上一条分开：这两者的报错来自「在 null/undefined 上取属性」，而不是调用
    // 不存在的 replace —— 但对外表现一致（TypeError + 什么都没渲染），
    // 所以两条用例断言的是同一个对外契约。
    for (const value of [null, undefined] as const) {
      const err = captureThrow(() => mod.showGlobalMessage(asText(value)));
      expect(err).toBeInstanceOf(TypeError);
      expect(body.findAll("global-message-item")).toHaveLength(0);
    }
  });

  it("抛错前容器已建好并留在 body 上，且队列未被污染", () => {
    // getContainer() 在 escapeHtmlToBr 之前跑（:38 先于 :41），所以一次失败的调用
    // 会把空容器留在 body 上。这是真实副作用，钉住它以防重构时静默改变。
    expect(body.findAll("global-message-container")).toHaveLength(0);
    captureThrow(() => mod.showGlobalMessage(asText(null)));
    expect(body.findAll("global-message-container")).toHaveLength(1);
    expect(body.findAll("global-message-container")[0]!.children).toHaveLength(0);
    // 抛出发生在 queue.push 之前 ⇒ 队列没被塞进半成品，后续消息照常显示。
    mod.showGlobalMessage("抛错之后仍可显示");
    expect(body.findAll("global-message-item").map((e) => e.htmlHistory.at(-1))).toEqual(["抛错之后仍可显示"]);
  });

  it("空串不抛错：渲染成一条空消息，与 undefined 不是同一条路径", () => {
    // 反面对照：undefined 抛 TypeError（见上），空串走完整渲染链路。
    // 两者结果必须不同 —— 若哪天加了 `if (!text) return` 这类短路，这条会转红。
    expect(captureThrow(() => mod.showGlobalMessage(asText(undefined)))).toBeInstanceOf(TypeError);
    const fresh = installDom();
    expect(captureThrow(() => mod.showGlobalMessage(""))).toBeNull();
    const items = fresh.body.findAll("global-message-item");
    expect(items).toHaveLength(1);
    expect(items[0]!.htmlHistory.at(-1)).toBe("");
  });
});

// ─── removeMessage 重复移除 ─────────────────────────────────
//
// removeMessage 是模块私有函数（无 export），签名是 `removeMessage(item: MessageItem)`，
// **收的是 item 引用而不是 id**。因此「传一个不存在的 id」在公开面上没有入口 ——
// 唯一能进入 `queue.indexOf(item) === -1` 那条分支的路径就是同一个 item 被移除两次：
// 点击关闭 + 4 秒超时自动关闭都指向同一个 item 闭包。
// 下面的用例就是这条分支的观测点：它必须「走完整流程」而不是提前 return。

describe("globalMessage / removeMessage 双触发", () => {
  it("点击关闭与超时自动关闭同时命中同一 item：不抛错，容器被清空", () => {
    mod.showGlobalMessage("点一下，再等它自己超时");
    const item = body.find("global-message-item")!;
    const removeSpy = vi.spyOn(item, "remove");
    const addClassSpy = vi.spyOn(item.classList, "add");

    item.dispatch("click");
    vi.advanceTimersByTime(300);
    expect(body.findAll("global-message-item")).toHaveLength(0);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(item.classList.contains("global-message-leave")).toBe(true);

    // 4 秒后自动关闭的定时器打到同一个 item ⇒ queue.indexOf(item) === -1
    expect(() => vi.advanceTimersByTime(4000)).not.toThrow();
    vi.advanceTimersByTime(300);

    // 容器仍然是干净的（不会凭空多出节点）。
    expect(body.findAll("global-message-item")).toHaveLength(0);
    expect(item.removed).toBe(true);
    // 已不在队列里的那次调用没有提前 return：离场 class 被再次加上。
    expect(addClassSpy.mock.calls.filter((args) => args[0] === "global-message-leave")).toHaveLength(2);
    // ⚠ 真实行为是 remove 被调了 **2 次**，不是 1 次：removeMessage 没有 openGlobalDialog
    //   的 `settled` 守卫，每进入一次就排一个新的 setTimeout(…, 300)。
    //   DOM 结果仍正确（Node.remove() 幂等），代价是一个多余的定时器 + 一次多余的 class 操作。
    //   这里如实钉住现状；若将来加幂等守卫（与 close 的 settled 同款），本条会转红，属预期。
    expect(removeSpy).toHaveBeenCalledTimes(2);
  });

  it("双触发打掉的队列条目不会连累后面还在屏幕上的消息", () => {
    // 变异验证记录：这条是为了让 removeMessage 的 `if (idx >= 0)` 守卫**看得见**。
    // 早先的写法（双触发后再连发 4 条、断言只剩最后 3 条）在删掉该守卫后仍然全绿 ——
    // 因为空队列上 splice(-1,1) 是空操作，而被误摘的那条总是排在队首、下一次超限时
    // 又会第一个被踢掉，误差刚好抵消。必须让「陈旧的那次移除」发生在**队列里还有别的
    // 消息**的时刻，splice(-1,1) 才会摘掉队尾那条、造成队列少记一条。
    mod.showGlobalMessage("A");
    body.find("global-message-item")!.dispatch("click");
    vi.advanceTimersByTime(300); // t = 300：A 已离场，队列为空，但它的自动关闭定时器还挂着

    vi.advanceTimersByTime(3400); // t = 3700
    mod.showGlobalMessage("B");
    mod.showGlobalMessage("C"); // 队列 [B, C]，两者都还在屏幕上

    vi.advanceTimersByTime(600); // t = 4300：A 的自动关闭打到已不在队列的 A
    expect(body.findAll("global-message-item").map((e) => e.htmlHistory.at(-1))).toEqual(["B", "C"]);

    for (const label of ["D", "E", "F"]) mod.showGlobalMessage(label);
    vi.advanceTimersByTime(300); // t = 4600：离场动画落地
    // 上限 3：屏幕上只能留 3 条。
    // 删掉 `if (idx >= 0)` 后，t=4000 那次陈旧移除会把 C 用 splice(-1,1) 悄悄摘出队列，
    // 而 C 还在屏幕上 ⇒ 队列少记一条 ⇒ 上限失效 ⇒ 这里会看到 4 条。
    expect(body.findAll("global-message-item").map((e) => e.htmlHistory.at(-1))).toEqual(["D", "E", "F"]);
  });

  it("连续两次 showGlobalMessage 是堆叠而非替换", () => {
    mod.showGlobalMessage("第一条");
    const first = body.find("global-message-item")!;
    mod.showGlobalMessage("第二条");
    const items = body.findAll("global-message-item");
    expect(items.map((el) => el.htmlHistory.at(-1))).toEqual(["第一条", "第二条"]);
    // 先来的一条没有被标记离场 ⇒ 两条并存，不是「后一条顶掉前一条」。
    expect(first.classList.contains("global-message-leave")).toBe(false);
    expect(first.removed).toBe(false);
  });
});

// ─── HTML 文案：安全面 ──────────────────────────────────────
//
// showGlobalMessage 走的是 `el.innerHTML = escapeHtmlToBr(text)`（:41）：赋值目标是
// innerHTML，**唯一的防线就是 escapeHtmlToBr 里的转义**。所以文案里的 HTML 会被当文本
// 渲染（`<b>x</b>` → `&lt;b&gt;x&lt;/b&gt;`），不是注入面 —— 但这份安全性完全挂在那串
// replace 上：去掉 `<`/`>` 两条 replace 就会变成注入面，下面那条断言会立刻转红。

describe("globalMessage / HTML 文案按文本渲染", () => {
  it("提示文本里的 b 标签被转义，不产生可执行的 b 标记", () => {
    mod.showGlobalMessage("<b>x</b>");
    const html = body.find("global-message-item")!.htmlHistory.at(-1)!;
    expect(html).toBe("&lt;b&gt;x&lt;/b&gt;");
    expect(html).not.toContain("<b>");
    // 换行仍按原样转成 <br>（唯一被允许进入 innerHTML 的标记来自模块自身，不是文案）
    mod.showGlobalMessage("a\nb");
    expect(body.findAll("global-message-item")[1]!.htmlHistory.at(-1)).toBe("a<br>b");
  });
});

// ─── 全局弹窗键的还原（跨文件污染防线）─────────────────────
//
// 上面的机制说明已记录：installDom 把 window 接到 globalThis 上，而 globalMessage.ts
// 末尾三行在模块加载期把真弹窗写上这三个键。loadFresh / afterEach / afterAll 三处逐键
// 还原是本文件对共享全局的责任。
//
// 「afterEach 本身」无法在用例内部被观测（它在本用例断言之后才跑）。可观测的是它所
// 维护的那个不变量：**用例执行期间这三个键持有的是基线 noop，不是真弹窗** ——
// 一旦三处还原里有任何一处坏掉，真弹窗就会留在共享 globalThis 上被后续文件调到。
//
// 变异验证记录（本次补记）：删掉 loadFresh 里那行 restorePopupGlobals → 下面那条转红；
// 单删 afterEach 里那行 → 全绿。后者不是守卫失效，而是与文件头已记录的「三处并列冗余」
// 完全一致：本断言的观测窗口在用例体内，loadFresh 每次 import 后就擦，afterEach 那次发生在
// 断言之后，够不着这条断言。afterEach 的价值是「文件跑完之后」的窗口，由文件头的
// afterAll 旁证（受害者探针）覆盖，不靠本条。

describe("globalMessage / 全局弹窗键还原", () => {
  it("用例执行期间三个键是基线 noop 而非真弹窗（真弹窗已从 globalThis 擦掉）", () => {
    const scope = globalThis as unknown as Record<string, unknown>;
    for (const key of LEAKED_POPUP_GLOBALS) {
      expect(scope[key], key).toBe(popupGlobalsBaseline.find(([k]) => k === key)![1]);
      expect(scope[key], key).not.toBe((mod as unknown as Record<string, unknown>)[key]);
    }
    // 基线里 showGlobalPrompt 压根不存在（test-setup 只补了另两个 noop）
    // ⇒ 还原必须是 delete 而不是塞 undefined，键的存在性本身也是契约。
    expect("showGlobalPrompt" in scope).toBe(false);
  });

  it("restorePopupGlobals 逐键还原：被顶掉的键回到基线，原本不存在的键被删掉", () => {
    const scope = globalThis as unknown as Record<string, unknown>;
    const fake = () => {};
    // 模拟一次真泄漏
    scope.showGlobalMessage = mod.showGlobalMessage;
    scope.showGlobalConfirm = mod.showGlobalConfirm;
    scope.showGlobalPrompt = fake;
    expect(scope.showGlobalMessage).toBe(mod.showGlobalMessage);

    restorePopupGlobals(popupGlobalsBaseline);

    expect(scope.showGlobalMessage).toBe(popupGlobalsBaseline[0]![1]);
    expect(scope.showGlobalConfirm).toBe(popupGlobalsBaseline[1]![1]);
    // 基线值为 undefined ⇒ 用 delete 还原成「键不存在」
    expect("showGlobalPrompt" in scope).toBe(false);
    // 还原后调基线 noop 不抛（真弹窗会因缺 document 而 ReferenceError）
    expect(() => (scope.showGlobalMessage as () => void)()).not.toThrow();
    expect(scope.showGlobalConfirm).toBeTypeOf("function");
  });
});
