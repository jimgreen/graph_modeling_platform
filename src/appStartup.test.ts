// appStartup.ts 的启动闸门。
//
// 这个模块只有 25 行，但它是**空间隔离 S2 的入口**：App 的模型/配色/量测状态在渲染期
// 同步从 localStorage 播种，所以「切空间后清浏览器缓存」必须发生在 createRoot 之前。
// 它错的方式也很安静 —— 取不到空间列表时**故意不阻断启动**（白屏比「这次不校验」更坏），
// 但「清缓存失败」必须让用户看见（静默的失败比失败本身更坏，S2 就不设防了）。
// 这两条相反的策略各自只在一条 catch 分支上，此前没有任何测试守着它们。
//
// 本文件覆盖全部三条路径 + 三条边界：
//   · showGlobalMessage 未安装、seedSpaces 抛错；
//   · `initial.current` 的三个取值（合法 id / **空串** / undefined）—— 空串与 undefined
//     在下游走的是**两条不同的路**，见下面「current 边界」组的注释；
//   · 失败来源的可观测边界：外层 catch 是空块，fetchSpaces 与 seedSpaces 的失败
//     **完全不可区分**，只能钉住「都不抛给调用方」这个现状契约。
//
// 变异实测（8 条，全部跑在仓库外的 temp 副本上，工作区源文件全程只读）：
//   RED  `current || undefined`（空串被吞成 undefined）→ 空串那条转红
//   RED  `current ?? ""`（给 undefined 兜个底）        → undefined 那条转红
//   RED  `if (initial.current)` 跳过闸门               → 空串 + undefined 两条都红
//   RED  外层 catch 改成重抛                          → 7 条红（「不外抛」承重）
//   RED  内层 catch 改成重抛                          → 3 条红
//   RED  删掉 seedSpaces 调用                         → 10 条红
//   GREEN 删掉两处 setBootPhase                        → **不是等价变异，是测不到**：
//         test.environment = "node" 下没有 document，setBootPhase 在
//         startupProgress.ts:16-19 直接早退。差异真实存在（浏览器里首屏文案会少两句），
//         只是本文件这个环境看不见。要覆盖需要 jsdom，属新增环境依赖，未做。
//   GREEN 去掉 showGlobalMessage 的 ?.                 → 绿是**正确**结果：内层 catch 里
//         抛出的 TypeError 仍落在外层 try 块内被接住，`?.` 与否产出同形。
//         详见下面「清缓存失败」组里那条用例的注释。

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// 桩要能在 import 之前建好：appStartup 在模块顶层 import 这两个模块。
const fetchSpacesMock = vi.hoisted(() => vi.fn());
const seedSpacesMock = vi.hoisted(() => vi.fn());
const reconcileMock = vi.hoisted(() => vi.fn());

vi.mock("./spaceClient", () => ({
  fetchSpaces: fetchSpacesMock,
  seedSpaces: seedSpacesMock
}));
vi.mock("./spaceCache", () => ({
  reconcileSpaceCacheOwnership: reconcileMock
}));

import { runStartupGate } from "./appStartup";

const SPACES = { spaces: [{ id: "w1", name: "工作空间一" }], current: "w1" };

let originalShowGlobalMessage: unknown;

beforeEach(() => {
  fetchSpacesMock.mockReset();
  seedSpacesMock.mockReset();
  reconcileMock.mockReset();
  fetchSpacesMock.mockResolvedValue(SPACES);
  seedSpacesMock.mockImplementation(() => {});
  reconcileMock.mockResolvedValue(undefined);
  originalShowGlobalMessage = (globalThis as any).showGlobalMessage;
  (globalThis as any).showGlobalMessage = vi.fn();
});

afterEach(() => {
  (globalThis as any).showGlobalMessage = originalShowGlobalMessage;
});

const notified = () => (globalThis as any).showGlobalMessage as ReturnType<typeof vi.fn>;

describe("runStartupGate 成功路径", () => {
  test("取回空间列表后播种给 App 的首次 refreshSpaces，并按当前空间清缓存", async () => {
    await runStartupGate();

    expect(fetchSpacesMock).toHaveBeenCalledTimes(1);
    // 播种的是同一次请求的结果：App 挂载时不必再拉第二遍
    expect(seedSpacesMock).toHaveBeenCalledTimes(1);
    expect(seedSpacesMock).toHaveBeenCalledWith(SPACES);
    // 清缓存按**后端判定的当前空间**，不是按 Cookie 里那个可能是旧值的
    expect(reconcileMock).toHaveBeenCalledTimes(1);
    expect(reconcileMock).toHaveBeenCalledWith(SPACES.current);
    expect(notified()).not.toHaveBeenCalled();
  });

  test("播种先于清缓存：清缓存删掉的就是刚被播下去的那批", async () => {
    // 反了的话，App 挂载时的首次 refreshSpaces 会把刚清掉的键再写回来
    const seq: string[] = [];
    seedSpacesMock.mockImplementation(() => {
      seq.push("seed");
    });
    reconcileMock.mockImplementation(() => {
      seq.push("reconcile");
    });
    await runStartupGate();
    expect(seq).toEqual(["seed", "reconcile"]);
  });

  test("后端返回的 spaces 列表原样传递，不在这里裁剪或补默认值", async () => {
    // 这个闸门只负责「拿列表 + 播种 + 清缓存」；裁剪列表是 seedSpaces 自己的事
    const odd = { spaces: [], current: "" };
    fetchSpacesMock.mockResolvedValue(odd);
    await runStartupGate();
    expect(seedSpacesMock).toHaveBeenCalledWith(odd);
    expect(reconcileMock).toHaveBeenCalledWith("");
  });
});

// `initial.current` 就是**记账用的那个 id**：它被原样交给 reconcileSpaceCacheOwnership，
// 后者拿它和「本套缓存属于哪个空间」比，相等就早退。所以 current 的三个取值必须逐个钉住。
describe("runStartupGate current 边界：空串 / undefined / 合法 id", () => {
  const payload = (current: unknown) => ({ spaces: [{ id: "w1", name: "工作空间一" }], current });

  test("current 为空串时照样进清缓存闸门，空串原样透传、不被 falsy 兜底吞掉", async () => {
    // 「后端没解析出当前空间」时 current 就是空串。这条不许被 `if (initial.current)` 之类的
    // 守卫跳过 —— 跳过的后果是整段归属对齐一次都不跑，且没有任何症状。
    const odd = payload("");
    fetchSpacesMock.mockResolvedValue(odd);

    await expect(runStartupGate()).resolves.toBeUndefined();

    expect(seedSpacesMock).toHaveBeenCalledWith(odd);
    expect(reconcileMock).toHaveBeenCalledTimes(1);
    expect(reconcileMock).toHaveBeenCalledWith("");
    expect(reconcileMock.mock.calls[0][0]).not.toBeUndefined();
    expect(notified()).not.toHaveBeenCalled();
  });
  // 承重的是「**没有** falsy 兜底」这一条：`initial.current || undefined` 会把空串变成
  // undefined（红），`initial.current ?? undefined` 不会（`"" ?? x` 仍是 `""`，等价变异，
  // 故不用它当证据）。真正能咬住的是 `||` 与 `if (initial.current)` 这两种写法。
  //
  // ⚠ 空串这条**单看**分不出「从 payload 透传」与「源码里写死了空串」—— 断言值恰好等于
  // 一个硬编码变异会挑的字面量。封口靠本组的合法 id 那条：写死空串会让它红。

  test("current 为 undefined 时同样进闸门，且透传的是 undefined —— 与空串不是同一条路", async () => {
    // 后端漏掉 current 字段时 `initial.current` 就是 undefined（类型上声明的是 string，
    // 运行时未必）。这条与上面空串那条成对：**值不同，下游分支就不同**。
    //
    // 用探针直接跑真实的 reconcileSpaceCacheOwnership 实测过（node --experimental-strip-types
    // + fake-indexeddb，跑在 temp 副本上，未改工作区），无记账（owner 读成空串）时：
    //   · current = ""       → 第 388 行 `owner === resolvedSpaceId` 成立（两个都是空串）
    //                          → **第一行就早退**：不清缓存、**记账永远写不进去**。
    //                            每次启动都重复同一条「无记账」分支，永不收敛成「已记账」。
    //   · current = undefined → `"" === undefined` 不成立 → 落到 rememberCacheOwnerSpace(undefined)
    //                          → localStorage.setItem(key, undefined) 写下字面量字符串 "undefined"。
    // 所以空串与 undefined **不同路径**，且空串这一侧是记账漏洞
    // （写下的空串与「从未记过账」不可区分，详见 spaceCache.test.ts 的缺陷用例）。
    // 闸门这一层不改这个结论，只是把它如实钉住：空串、undefined 都**原样**递下去。
    const odd = payload(undefined);
    fetchSpacesMock.mockResolvedValue(odd);

    await expect(runStartupGate()).resolves.toBeUndefined();

    expect(seedSpacesMock).toHaveBeenCalledWith(odd);
    expect(reconcileMock).toHaveBeenCalledTimes(1);
    expect(reconcileMock.mock.calls[0][0]).toBeUndefined();
    expect(reconcileMock.mock.calls[0][0]).not.toBe("");
    expect(notified()).not.toHaveBeenCalled();
  });
  // `initial.current ?? ""`（给漏字段兜个底）→ 传下去的是空串，`toBeUndefined()` 转红。

  test("current 为合法 id 时的回归：原样透传，且闸门自己不写任何记账", async () => {
    // 记账只有 reconcileSpaceCacheOwnership 一处写（rememberCacheOwnerSpace 的调用点全仓
    // 只有 switchToSpace 与那一个）。本组与上面空串那条成对，用来证明「空串不是写死的字面量」。
    const odd = payload("w9");
    fetchSpacesMock.mockResolvedValue(odd);

    await expect(runStartupGate()).resolves.toBeUndefined();

    expect(seedSpacesMock).toHaveBeenCalledWith(odd);
    expect(reconcileMock).toHaveBeenCalledTimes(1);
    expect(reconcileMock).toHaveBeenCalledWith("w9");
    expect(notified()).not.toHaveBeenCalled();
  });
});

describe("runStartupGate 清缓存失败", () => {
  test("reconcile 抛错时提示用户，且**不**把异常外抛", async () => {
    // 外抛的话 createRoot 之前就 reject，整个应用起不来 —— 恰恰是最需要它起来的场合
    reconcileMock.mockRejectedValue(new Error("IDB 不可用"));
    await expect(runStartupGate()).resolves.toBeUndefined();
    expect(notified()).toHaveBeenCalledTimes(1);
    expect(String(notified().mock.calls[0][0])).toContain("未做空间校验");
  });

  test("showGlobalMessage 未安装时仍不外抛，但这条路上用户也拿不到任何提示", async () => {
    // 独立运行时 main.tsx 尚未装全局消息，qiankun 路径同理。
    //
    // 变异验证实测：把源码里的 `showGlobalMessage?.(` 去掉，本条**一样绿**。
    // 原因是内层 catch 里抛出的 TypeError 仍然落在**外层** try 的块内，
    // 被外层 catch 静默接住 —— 保证 resolve 的是外层 catch，不是 `?.`。
    // 代价如实记录：走到这条路径时既不报错也不提示，正是源码注释担心的那种静默失败。
    (globalThis as any).showGlobalMessage = undefined;
    reconcileMock.mockRejectedValue(new Error("IDB 不可用"));
    await expect(runStartupGate()).resolves.toBeUndefined();
  });

  test("reconcile 同步抛错（而非返回 rejected promise）同样被接住", async () => {
    // catch 包的是 await，await 一个同步抛的函数同样会跳进 catch
    reconcileMock.mockImplementation(() => {
      throw new Error("boom");
    });
    await expect(runStartupGate()).resolves.toBeUndefined();
    expect(notified()).toHaveBeenCalledTimes(1);
  });

  test("清缓存失败不影响已完成的播种：App 照常按列表读空间", async () => {
    // 两件事互相独立：缓存没清掉只是「这次不校验」，列表本身是好的
    reconcileMock.mockRejectedValue(new Error("IDB 不可用"));
    await runStartupGate();
    expect(seedSpacesMock).toHaveBeenCalledWith(SPACES);
  });
});

describe("runStartupGate 取列表失败", () => {
  test("后端未起 / 离线时不阻断启动，也不打扰用户", async () => {
    // 白屏比「这次不校验」更坏。静默是这里**正确**的策略，与上一组相反。
    fetchSpacesMock.mockRejectedValue(new Error("fetch failed"));
    await expect(runStartupGate()).resolves.toBeUndefined();
    expect(notified()).not.toHaveBeenCalled();
  });

  test("取不到列表时不再播种、不清缓存", async () => {
    // 没拿到「后端判定的当前空间」就没法按空间清缓存；拿旧值清反而会删错
    fetchSpacesMock.mockRejectedValue(new Error("fetch failed"));
    await runStartupGate();
    expect(seedSpacesMock).not.toHaveBeenCalled();
    expect(reconcileMock).not.toHaveBeenCalled();
  });

  test("seedSpaces 抛错也被外层 catch 接住，不外抛", async () => {
    // 现状记录：此时 reconcile **不会**执行，等于这次完全没做空间校验，且不提示。
    // 本测试只钉住「不外抛、不提示」这个可观测契约 —— reconcile 被跳过是当前实现的
    // 既有缺口（与 reconcile 失败时的处理不对称），不在这里替它定语义。
    seedSpacesMock.mockImplementation(() => {
      throw new Error("seed 失败");
    });
    await expect(runStartupGate()).resolves.toBeUndefined();
    expect(notified()).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 失败来源的可观测边界。
//
// ⚠⚠ 这里**刻意不改源码**去给外层 catch 补日志或把异常冒泡出去。本仓已明文记过这条教训：
//    要补日志 / 要冒泡，就必然改业务语义（补日志 = 新增一条用户可见的提示或副作用；
//    冒泡 = 白屏，而源码注释写明「白屏比这次不校验更坏」是它当前的选择）。
//    那是行为变更，属另批范围。本组只把**现状**钉成契约。
//
// 现状的完整可观测面（不是全部，是全部）：
//   · reconcile 失败  → 有 showGlobalMessage 提示（唯一有提示的一条）
//   · fetchSpaces 失败 → 无提示；且 seedSpaces 没被调用
//   · seedSpaces  失败 → 无提示；seedSpaces 被调用过、reconcile 没被调用
//   · 三者返回值全是 undefined，一个 reject 都没有。
// 于是「后端没起」与「播种抛错」对调用方**完全同形**：同一个 undefined、同样静默、
// 同样没有日志。唯一能把它们分开的痕迹是 seedSpaces 那一侧的调用记录 —— 而那是
// App 挂载时第一次 refreshSpaces 才会读到的内部状态，运维在启动现场看不到。
// 这就是「空 catch 的代价」，如实记录在此，不在本文件里替它定语义。
describe("runStartupGate 失败来源的可观测边界（现状契约）", () => {
  test("fetchSpaces 抛错：不外抛、无提示、不播种、不清缓存，返回 undefined", async () => {
    fetchSpacesMock.mockRejectedValue(new Error("fetch failed"));

    const result = await runStartupGate();

    expect(result).toBeUndefined();
    expect(notified()).not.toHaveBeenCalled();
    expect(seedSpacesMock).not.toHaveBeenCalled();
    expect(reconcileMock).not.toHaveBeenCalled();
  });
  // 承重的是「不外抛」：把外层 catch 整段删掉 → 变成 reject，`await runStartupGate()`
  // 直接把异常抛进测试，这条红。

  test("seedSpaces 抛错（fetchSpaces 成功）：同样不外抛、无提示、返回 undefined", async () => {
    // 现状记录：reconcile 被一起跳过 —— 等于这次启动完全没做空间校验，却与
    // reconcile 失败时的处理不对称（那一条会提示）。不对称是既有缺口，不在这里定语义。
    seedSpacesMock.mockImplementation(() => {
      throw new Error("seed 失败");
    });

    const result = await runStartupGate();

    expect(result).toBeUndefined();
    expect(notified()).not.toHaveBeenCalled();
    expect(fetchSpacesMock).toHaveBeenCalledTimes(1);
    expect(seedSpacesMock).toHaveBeenCalledTimes(1);
    expect(reconcileMock).not.toHaveBeenCalled();
  });

  test("seedSpaces 抛错时仍被记为已调用 —— 这是把 fetch 失败与 seed 失败分开的唯一痕迹", async () => {
    // 同上两条的唯一差别。对照组：fetchSpaces 失败时 seedSpaces 一次都没被调用。
    // 断言的是「那个 mock 的调用记录」，因为外层 catch 是空块 —— 返回值与提示上两者同形，
    // 拿不到别的观察点（改日志才能拿到，那是行为变更，见本组开头的说明）。
    seedSpacesMock.mockImplementation(() => {
      throw new Error("seed 失败");
    });
    await runStartupGate();
    expect(seedSpacesMock).toHaveBeenCalledTimes(1);

    seedSpacesMock.mockClear();
    fetchSpacesMock.mockRejectedValue(new Error("fetch failed"));
    await runStartupGate();
    expect(seedSpacesMock).not.toHaveBeenCalled();
  });

  test("两条都成功时返回值是 undefined：Promise 上没有任何字段可取", async () => {
    // 返回值形状先钉死再谈别的：runStartupGate 的契约是**纯副作用**，调用方拿不到任何数据。
    // 两个调用方（main.tsx 的 await runStartupGate()、qiankunLifecycle.tsx 的 mount 里同一句）
    // 也都没接返回值 —— 它们要的是「闸门跑完了」这个时序，不是结果。
    const result = await runStartupGate();

    // 用 toBeUndefined 而不是 toBeFalsy：后者把 null / 0 / 空串 / false 一并放过，
    // 而「这里必须是 undefined、不是 null 也不是空对象」正是要钉的东西。
    expect(result).toBeUndefined();
    expect(typeof result).toBe("undefined");
    expect(result).not.toBeNull();
    expect(seedSpacesMock).toHaveBeenCalledWith(SPACES);
    expect(reconcileMock).toHaveBeenCalledWith(SPACES.current);
  });
  // 承重的是 toBeUndefined：源码在 try 末尾加一句 `return initial;`（返回类型是 Promise<void>，
  // 要先改签名才能编译过，但这条断言正是为了让签名被改动时立刻红）→ result 变成 SPACES，红。

  test("四种结局（成功 / fetch 失败 / seed 失败 / reconcile 失败）返回值与是否 reject 完全同形", async () => {
    // 这条就是本组存在的理由：把「空 catch 使失败原因不可观测」变成可执行的断言。
    // 若哪天给 catch 补了日志（行为变更，另批），这条会红并提醒同步更新这里的期望值。
    const outcomes: Array<{ label: string; value: unknown }> = [];

    await runStartupGate();
    outcomes.push({ label: "成功", value: await runStartupGate() });

    fetchSpacesMock.mockRejectedValue(new Error("fetch failed"));
    outcomes.push({ label: "fetch 失败", value: await runStartupGate() });

    fetchSpacesMock.mockResolvedValue(SPACES);
    seedSpacesMock.mockImplementation(() => {
      throw new Error("seed 失败");
    });
    outcomes.push({ label: "seed 失败", value: await runStartupGate() });

    seedSpacesMock.mockImplementation(() => {});
    reconcileMock.mockRejectedValue(new Error("IDB 不可用"));
    outcomes.push({ label: "reconcile 失败", value: await runStartupGate() });

    // 四种都 resolve（没有一个 reject）—— createRoot 之前不会因为这一步而整个应用起不来
    expect(outcomes.map((o) => o.label)).toEqual(["成功", "fetch 失败", "seed 失败", "reconcile 失败"]);
    expect(outcomes.map((o) => o.value)).toEqual([undefined, undefined, undefined, undefined]);
    // 唯一有提示的只有 reconcile 失败那一条；fetch/seed 失败静默
    expect(notified()).toHaveBeenCalledTimes(1);
  });
});
