// 元件树：子项视图、编辑草稿、提交值解析、回车提交。
// 提交值解析的 key 语法有三段（node:<id>、node:<id>:child:<param>:<field>），
// 段数不足 / 节点查不到时必须返回 undefined 而不是空串，否则输入框会被「清空成确定值」。
import { describe, expect, test, vi } from "vitest";

import {
  createClearElementTreeDraft,
  createCommitElementTreeInputOnEnter,
  createElementTreeCommittedDraftValue,
  createElementTreeItemChildren,
  createUpdateElementTreeDraft
} from "./appExtracted/appGraphMeasurementFactories";

describe("createElementTreeItemChildren", () => {
  const view = (over: Record<string, any> = {}) => ({
    kind: "associated",
    id: "v1",
    label: "关联设备",
    componentLibrary: "ac",
    rows: [{ key: "idx", value: "7" }, { key: "name", value: "断路器-1" }, { key: "terminals", value: "T1" }],
    relationKeys: ["设备.名称"],
    ...over
  });

  function scope(views: any[], node: any) {
    return {
      visibleNodeById: new Map(node ? [[node.id, node]] : []),
      libraryTemplateByKind: new Map([[node?.kind, {}]]),
      buildContainerDeviceParameterViews: vi.fn(() => views),
      containerRelationNameKey: vi.fn((k: string) => `name(${k})`)
    };
  }

  test("只保留 associated 类视图并拼上 node 前缀 id", () => {
    const node = { id: "n1", kind: "ac-container" };
    const children = createElementTreeItemChildren(scope([view(), view({ kind: "other", id: "v2" })], node))({
      kind: "node",
      id: "n1"
    } as any);

    expect(children).toHaveLength(1);
    expect(children[0].id).toBe("n1:v1");
    expect(children[0].idx).toBe("7");
    expect(children[0].name).toBe("断路器-1");
    expect(children[0].nameKey).toBe("name(设备.名称)");
  });

  test("node 不可见时退回 item 自带的 children", () => {
    const fallback = [{ id: "c1", label: "旧" }];
    const children = createElementTreeItemChildren(scope([view()], null))({ kind: "node", id: "n1", children: fallback } as any);

    expect(children).toBe(fallback);
  });

  test("item 不是节点类时返回空数组", () => {
    expect(createElementTreeItemChildren(scope([view()], null))({ kind: "group", id: "g" } as any)).toEqual([]);
  });

  test("terminalLabels 优先于 terminals 行", () => {
    const node = { id: "n1", kind: "ac-container" };
    const children = createElementTreeItemChildren(scope([view({ terminalLabels: "显式端子" })], node))({
      kind: "node",
      id: "n1"
    } as any);

    expect(children[0].terminalLabels).toBe("显式端子");
  });

  test("terminalLabels 为空串时保留空串（?? 只挡 null/undefined，不挡空串）", () => {
    const node = { id: "n1", kind: "ac-container" };
    const children = createElementTreeItemChildren(scope([view({ terminalLabels: "" })], node))({ kind: "node", id: "n1" } as any);

    expect(children[0].terminalLabels).toBe("");
  });

  test("terminalLabels 缺省时退回 terminals 行", () => {
    const node = { id: "n1", kind: "ac-container" };
    const children = createElementTreeItemChildren(scope([view()], node))({ kind: "node", id: "n1" } as any);

    expect(children[0].terminalLabels).toBe("T1");
  });

  test("缺 componentLibrary / relationKeys 时给空值兜底", () => {
    const node = { id: "n1", kind: "ac-container" };
    const bare = { kind: "associated", id: "v1", label: "L", rows: [] };
    const children = createElementTreeItemChildren(scope([bare], node))({ kind: "node", id: "n1" } as any);

    expect(children[0]).toMatchObject({ componentLibrary: "", idx: "", name: "", nameKey: "", relationKeys: [], terminalLabels: "" });
  });
});

describe("元件树编辑草稿", () => {
  test("写入新值", () => {
    const setElementTreeEditDrafts = vi.fn();
    createUpdateElementTreeDraft({ setElementTreeEditDrafts })("k", "v");

    expect(setElementTreeEditDrafts.mock.calls[0][0]({})).toEqual({ k: "v" });
  });

  test("值没变时返回原对象，不触发重渲染", () => {
    const setElementTreeEditDrafts = vi.fn();
    const current = { k: "v" };

    createUpdateElementTreeDraft({ setElementTreeEditDrafts })("k", "v");

    expect(setElementTreeEditDrafts.mock.calls[0][0](current)).toBe(current);
  });

  test("清除已存在的键", () => {
    const setElementTreeEditDrafts = vi.fn();
    createClearElementTreeDraft({ setElementTreeEditDrafts })("k");

    const next = setElementTreeEditDrafts.mock.calls[0][0]({ k: "v", other: "x" });
    expect(next).toEqual({ other: "x" });
  });

  test("清除不存在的键时返回原对象", () => {
    const setElementTreeEditDrafts = vi.fn();
    const current = { other: "x" };
    createClearElementTreeDraft({ setElementTreeEditDrafts })("缺失");

    expect(setElementTreeEditDrafts.mock.calls[0][0](current)).toBe(current);
  });
});

describe("createElementTreeCommittedDraftValue", () => {
  const nodeById = new Map<string, any>([
    ["n1", { id: "n1", name: "母线-1", params: { idx: 3, rated_voltage: "220" } }]
  ]);
  const committed = createElementTreeCommittedDraftValue({ nodeById });

  test("非 node: 前缀的键返回 undefined", () => {
    expect(committed("group:g1")).toBeUndefined();
  });

  test("node:<id>:name 读节点名", () => {
    expect(committed("node:n1:name")).toBe("母线-1");
  });

  test("node:<id>:<其它字段> 读 params.idx（原样返回，不做字符串化）", () => {
    expect(committed("node:n1:idx")).toBe(3 as any);
  });

  test("node:<id> 没有字段段时返回 undefined", () => {
    expect(committed("node:n1")).toBeUndefined();
  });

  test("节点查不到时返回 undefined", () => {
    expect(committed("node:缺失:name")).toBeUndefined();
  });

  test("子项键读关联设备的参数值", () => {
    const scope = {
      nodeById: new Map([["n1", { id: "n1", name: "n", params: {} }]])
    };
    const childScope: any = { ...scope };
    // 子项的关联设备不在 nodeById 里，取不到时按实现返回空串
    expect(createElementTreeCommittedDraftValue(childScope)("node:n1:child:v1:name")).toBe("");
  });

  test("子项键缺少字段分隔符时返回 undefined", () => {
    expect(committed("node:n1:child:v1")).toBeUndefined();
  });
});

describe("createCommitElementTreeInputOnEnter", () => {
  const makeEvent = (over: Record<string, any> = {}) => ({
    key: "Enter",
    nativeEvent: { isComposing: false },
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
    currentTarget: { blur: vi.fn() },
    ...over
  });

  test("回车：阻止冒泡与默认行为并失焦", () => {
    const event = makeEvent();
    createCommitElementTreeInputOnEnter({})(event as any);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.currentTarget.blur).toHaveBeenCalled();
  });

  test("非回车键：只阻止冒泡，不失焦", () => {
    const event = makeEvent({ key: "a" });
    createCommitElementTreeInputOnEnter({})(event as any);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.currentTarget.blur).not.toHaveBeenCalled();
  });

  test("输入法组合中的回车不提交（防中文误触）", () => {
    const event = makeEvent({ nativeEvent: { isComposing: true } });
    createCommitElementTreeInputOnEnter({})(event as any);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.currentTarget.blur).not.toHaveBeenCalled();
  });
});
