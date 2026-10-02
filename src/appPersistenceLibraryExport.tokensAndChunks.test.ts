// SVG 标记分块缓存：分块不变就不重算 markup（这是导出性能的关键）。
// 复用条件是三重与：key 相同 + itemKeys 逐项相同 + tokens 逐项相同。
// 少任何一条都会导致「内容变了却复用旧 markup」——导出结果与画布不一致。
import { describe, expect, test, vi } from "vitest";

import {
  customSingleTerminalAnchorToken,
  stableSvgMarkupChunks,
  tokenArraysEqual,
  uniqueGraphTemplateName
} from "./appExtracted/appPersistenceLibraryExport";

describe("tokenArraysEqual", () => {
  test("长度不同即不等", () => {
    expect(tokenArraysEqual([1], [1, 2])).toBe(false);
  });

  test("逐项相同为真", () => {
    expect(tokenArraysEqual([1, "a", null], [1, "a", null])).toBe(true);
  });

  test("任一项不同即不等", () => {
    expect(tokenArraysEqual([1, 2], [1, 3])).toBe(false);
  });

  test("两个空数组相等", () => {
    expect(tokenArraysEqual([], [])).toBe(true);
  });

  test("按引用比较对象（不做深比较）", () => {
    const shared = { a: 1 };

    expect(tokenArraysEqual([shared], [shared])).toBe(true);
    expect(tokenArraysEqual([{ a: 1 }], [{ a: 1 }])).toBe(false);
  });

  test("NaN 与 NaN 不相等（SameValueZero 的差异点）", () => {
    expect(tokenArraysEqual([NaN], [NaN])).toBe(false);
  });
});

describe("customSingleTerminalAnchorToken", () => {
  const singleTerminalNode = (anchor?: { x: number; y: number }, over: Record<string, any> = {}) => ({
    id: "n1",
    kind: "ac-load",
    terminals: anchor ? [{ id: "t1", anchor }] : [{ id: "t1" }],
    ...over
  });

  test("锚点与模板默认一致时返回空串（无需写入覆盖）", () => {
    const node = singleTerminalNode({ x: 0.5, y: 0 });

    expect(customSingleTerminalAnchorToken(node as any)).toBe("");
  });

  test("锚点被改过时返回坐标串", () => {
    const node = singleTerminalNode({ x: 0, y: 0 });

    expect(customSingleTerminalAnchorToken(node as any)).toBe("0,0");
  });

  test("与模板的锚点比较（模板给了非默认锚点时）", () => {
    const node = singleTerminalNode({ x: 0.5, y: 0 });
    const template = { terminalAnchors: [{ x: 0.5, y: 0 }] } as any;

    expect(customSingleTerminalAnchorToken(node as any, template)).toBe("");
  });

  test("多端子节点返回空串（逐端子设置，不走整体 token）", () => {
    const node = singleTerminalNode({ x: 0, y: 0 }, { terminals: [{ id: "t1", anchor: { x: 0, y: 0 } }, { id: "t2" }] });

    expect(customSingleTerminalAnchorToken(node as any)).toBe("");
  });

  test("无端子节点返回空串", () => {
    expect(customSingleTerminalAnchorToken(singleTerminalNode(undefined, { terminals: [] }) as any)).toBe("");
  });

  test("母线与静态图元返回空串", () => {
    expect(customSingleTerminalAnchorToken(singleTerminalNode({ x: 0, y: 0 }, { kind: "ac-bus" }) as any)).toBe("");
    expect(customSingleTerminalAnchorToken(singleTerminalNode({ x: 0, y: 0 }, { kind: "static-image" }) as any)).toBe("");
  });

  test("端子没有 anchor 字段时返回空串", () => {
    expect(customSingleTerminalAnchorToken(singleTerminalNode(undefined) as any)).toBe("");
  });
});

describe("uniqueGraphTemplateName", () => {
  const templates = (entries: Array<{ name: string; typeName?: string }>) =>
    entries.map((entry) => ({ typeName: "类型", ...entry })) as any[];

  test("无冲突时原样返回", () => {
    expect(uniqueGraphTemplateName("模板", "类型", templates([]))).toBe("模板");
  });

  test("基础名两端空白被裁掉", () => {
    expect(uniqueGraphTemplateName("  模板  ", "类型", templates([]))).toBe("模板");
  });

  test("空基础名落到「自定义模板」", () => {
    expect(uniqueGraphTemplateName("   ", "类型", templates([]))).toBe("自定义模板");
  });

  test("同名时追加 -2 后缀", () => {
    expect(uniqueGraphTemplateName("模板", "类型", templates([{ name: "模板" }]))).toBe("模板-2");
  });

  test("后缀序号跳过已占用的", () => {
    const result = uniqueGraphTemplateName("模板", "类型", templates([{ name: "模板" }, { name: "模板-2" }, { name: "模板-3" }]));

    expect(result).toBe("模板-4");
  });

  test("只与同类型的模板比冲突（不同类型下同名不算冲突）", () => {
    const existing = templates([{ name: "模板", typeName: "别的类型" }]);

    expect(uniqueGraphTemplateName("模板", "类型", existing)).toBe("模板");
  });

  test("同类型下同名算冲突", () => {
    const existing = templates([{ name: "模板", typeName: "类型" }]);

    expect(uniqueGraphTemplateName("模板", "类型", existing)).toBe("模板-2");
  });

  test("类型名比较大小写不敏感", () => {
    const existing = templates([{ name: "模板", typeName: "类型" }]);

    expect(uniqueGraphTemplateName("模板", "类型", existing)).toBe("模板-2");
  });

  test("同名比较大小写不敏感", () => {
    expect(uniqueGraphTemplateName("模板", "类型", templates([{ name: "模板" }]))).not.toBe("模板");
  });
});

describe("stableSvgMarkupChunks", () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `i${i}` }));

  function createOptions(markupSpy: (index: number) => string) {
    return {
      chunkSize: 2,
      keyPrefix: "p",
      itemKey: (item: any, index: number) => item.id,
      itemTokens: (item: any, index: number) => [item.id, index],
      itemMarkup: (item: any, index: number) => markupSpy(index)
    };
  }

  test("按 chunkSize 切块", () => {
    const cache = { chunks: [] as any[] };

    const result = stableSvgMarkupChunks(items(5), cache, createOptions((i) => `<i>${i}</i>`) as any);

    expect(result).toHaveLength(3);
  });

  test("每块只算一次 markup，块内按序拼接", () => {
    const cache = { chunks: [] as any[] };
    const result = stableSvgMarkupChunks(items(4), cache, createOptions((i) => `[${i}]`) as any);

    expect(result[0].markup).toBe("[0][1]");
    expect(result[1].markup).toBe("[2][3]");
  });

  test("空输入把缓存清空并返回空数组", () => {
    const cache = { chunks: [{ key: "旧" }] as any[] };

    expect(stableSvgMarkupChunks([], cache, createOptions(() => "") as any)).toEqual([]);
    expect(cache.chunks).toEqual([]);
  });

  test("输入不变时复用上一轮的块（不再算 markup）", () => {
    const cache = { chunks: [] as any[] };
    const markupSpy = vi.fn((i: number) => `<i>${i}</i>`);
    const options = createOptions(markupSpy);

    stableSvgMarkupChunks(items(4), cache, options as any);
    const first = cache.chunks;
    stableSvgMarkupChunks(items(4), cache, options as any);

    expect(markupSpy).toHaveBeenCalledTimes(4);
    expect(cache.chunks[0]).toBe(first[0]);
  });

  test("token 变化时该块重算，其它块仍复用", () => {
    const cache = { chunks: [] as any[] };
    const markupSpy = vi.fn((i: number) => `<i>${i}</i>`);
    const options = createOptions(markupSpy);

    stableSvgMarkupChunks(items(4), cache, options as any);
    const firstSecondChunk = cache.chunks[1];
    // 改第二个块的 token
    options.itemTokens = (item: any, index: number) => [item.id, index, index === 2 ? "变了" : ""];
    stableSvgMarkupChunks(items(4), cache, options as any);

    expect(cache.chunks[1]).not.toBe(firstSecondChunk);
    expect(cache.chunks[0]).toBeTruthy();
  });

  test("itemKey 变化时 key 变化并重算", () => {
    const cache = { chunks: [] as any[] };
    const markupSpy = vi.fn((i: number) => `<i>${i}</i>`);
    const options = createOptions(markupSpy);

    stableSvgMarkupChunks(items(2), cache, options as any);
    const firstKey = cache.chunks[0].key;
    options.itemKey = (item: any) => `${item.id}!`;
    stableSvgMarkupChunks(items(2), cache, options as any);

    expect(cache.chunks[0].key).not.toBe(firstKey);
  });

  test("块数变少时缓存被截断", () => {
    const cache = { chunks: [] as any[] };
    const options = createOptions((i) => `<i>${i}</i>`);

    stableSvgMarkupChunks(items(6), cache, options as any);
    expect(cache.chunks).toHaveLength(3);
    stableSvgMarkupChunks(items(2), cache, options as any);
    expect(cache.chunks).toHaveLength(1);
  });

  test("块数变多时新增块被算出", () => {
    const cache = { chunks: [] as any[] };
    const markupSpy = vi.fn((i: number) => `<i>${i}</i>`);
    const options = createOptions(markupSpy);

    stableSvgMarkupChunks(items(2), cache, options as any);
    stableSvgMarkupChunks(items(6), cache, options as any);

    expect(cache.chunks).toHaveLength(3);
  });

  test("返回值只含 key 与 markup", () => {
    const cache = { chunks: [] as any[] };

    const result = stableSvgMarkupChunks(items(2), cache, createOptions((i) => `<i>${i}</i>`) as any);

    expect(Object.keys(result[0]).sort()).toEqual(["key", "markup"]);
  });

  test("key 里带上首尾 itemKey（便于肉眼定位是哪一块变了）", () => {
    const cache = { chunks: [] as any[] };

    stableSvgMarkupChunks(items(4), cache, createOptions((i) => `<i>${i}</i>`) as any);

    expect(cache.chunks[0].key).toBe("p-0-i0-i1");
    expect(cache.chunks[1].key).toBe("p-1-i2-i3");
  });
});
