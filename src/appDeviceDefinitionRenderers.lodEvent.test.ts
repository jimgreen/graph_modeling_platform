// LOD（细节层次）节点的事件解析：画布上千上万个节点只在视口内渲染成简笔，
// 于是「点到了哪个节点 / 哪个端子」只能从事件的 target 一路 closest 上来。
// 两条关键约束：① 端子必须在 .lod-node 内部才算数（否则会串到别的节点）；
// ② nodeById 查不到时返回 undefined，而不是造一个空壳节点。
import { describe, expect, test, vi } from "vitest";

import {
  createLodNodeFromEvent,
  createLodTerminalIdFromEvent
} from "./appExtracted/appDeviceDefinitionRenderers";

/** 极简 DOM 替身：只需 closest / getAttribute。matches 是 [选择器, 命中元素] 的列表。 */
class FakeElement {
  // 显式字段而非构造器参数属性：仓库开了 erasableSyntaxOnly，参数属性无法被擦除
  private readonly matches: Array<[string, FakeElement]>;
  private readonly attributes: Record<string, string>;

  constructor(matches: Array<[string, FakeElement]>, attributes: Record<string, string> = {}) {
    this.matches = matches;
    this.attributes = attributes;
  }

  closest(selector: string) {
    return this.matches.find(([candidate]) => candidate === selector)?.[1] ?? null;
  }

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }
}

// 实现里用 `event.target instanceof Element` 判定。在模块顶层打桩（而不是 beforeEach），
// 保证 `instanceof` 拿到的一定是这里定义的类 —— 放在钩子里容易和 vitest 的环境隔离顺序打架。
vi.stubGlobal("Element", FakeElement);

const node = (id: string) => ({ id, kind: "ac-load" });

function createScope(ids: string[] = ["n1", "n2"]) {
  return { nodeById: new Map(ids.map((id) => [id, node(id)])) };
}

describe("createLodNodeFromEvent", () => {
  test("从 .lod-node[data-node-id] 上读出节点", () => {
    const scope = createScope();
    const lodNode = new FakeElement([], { "data-node-id": "n1" });
    const target = new FakeElement([[".lod-node[data-node-id]", lodNode]]);

    expect(createLodNodeFromEvent(scope)({ target } as any)).toBe(scope.nodeById.get("n1"));
  });

  test("target 不在 LOD 节点里时返回 undefined", () => {
    const scope = createScope();

    expect(createLodNodeFromEvent(scope)({ target: new FakeElement([]) } as any)).toBeUndefined();
  });

  test("target 不是 Element 时返回 undefined（不靠 closest 抛错）", () => {
    const scope = createScope();

    expect(createLodNodeFromEvent(scope)({ target: { nodeType: 3 } } as any)).toBeUndefined();
  });

  test("data-node-id 为空串时返回 undefined", () => {
    const scope = createScope();
    const lodNode = new FakeElement([], { "data-node-id": "" });
    const target = new FakeElement([[".lod-node[data-node-id]", lodNode]]);

    expect(createLodNodeFromEvent(scope)({ target } as any)).toBeUndefined();
  });

  test("属性缺失时返回 undefined", () => {
    const scope = createScope();
    const lodNode = new FakeElement([]);
    const target = new FakeElement([[".lod-node[data-node-id]", lodNode]]);

    expect(createLodNodeFromEvent(scope)({ target } as any)).toBeUndefined();
  });

  test("nodeById 里查不到时返回 undefined", () => {
    const scope = createScope(["n1"]);
    const lodNode = new FakeElement([], { "data-node-id": "不在图里" });
    const target = new FakeElement([[".lod-node[data-node-id]", lodNode]]);

    expect(createLodNodeFromEvent(scope)({ target } as any)).toBeUndefined();
  });
});

describe("createLodTerminalIdFromEvent", () => {
  /**
   * 实现的取法是两级 closest：
   *   event.target.closest("[data-terminal-id]") → 端子元素
   *   端子元素.closest(".lod-node[data-node-id]") → 所属 LOD 节点（判是否同节点内）
   * 所以这里让「端子替身」自己再带一组 .lod-node 命中表。
   */
  function buildTarget(terminalId: string | null, insideLodNode: boolean) {
    const lodNode = new FakeElement([], { "data-node-id": "n1" });
    const terminal = new FakeElement(
      insideLodNode ? [[".lod-node[data-node-id]", lodNode]] : [],
      terminalId === null ? {} : { "data-terminal-id": terminalId }
    );
    return new FakeElement([["[data-terminal-id]", terminal]]);
  }

  test("在 LOD 节点内点到端子时返回端子 id", () => {
    const scope = createScope();

    expect(createLodTerminalIdFromEvent(scope)({ target: buildTarget("t1", true) } as any)).toBe("t1");
  });

  test("不在 LOD 节点内时返回空串（不串到别的节点）", () => {
    const scope = createScope();

    expect(createLodTerminalIdFromEvent(scope)({ target: buildTarget("t1", false) } as any)).toBe("");
  });

  test("端子没有 data-terminal-id 属性时返回空串", () => {
    const scope = createScope();

    expect(createLodTerminalIdFromEvent(scope)({ target: buildTarget(null, true) } as any)).toBe("");
  });

  test("点到的不是端子时返回空串", () => {
    const scope = createScope();

    expect(createLodTerminalIdFromEvent(scope)({ target: new FakeElement([]) } as any)).toBe("");
  });

  test("target 不是 Element 时返回空串", () => {
    const scope = createScope();

    expect(createLodTerminalIdFromEvent(scope)({ target: { nodeType: 3 } } as any)).toBe("");
  });
});
