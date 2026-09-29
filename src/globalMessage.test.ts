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
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

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

// 模块级状态（container / nextId / queue）在模块加载时建立 —— 每条用例前重置模块，
// 否则 MAX_VISIBLE 队列与 nextId 会跨用例串味。
type GlobalMessageModule = typeof import("./globalMessage");

async function loadFresh(): Promise<{ mod: GlobalMessageModule; body: StubElement }> {
  vi.resetModules();
  const { body } = installDom();
  const mod = await import("./globalMessage");
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
  vi.unstubAllGlobals();
  vi.resetModules();
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
