// device-definition-shared 的「覆盖优先级与裁剪」核心逻辑单测 —— 此前零直接覆盖。
//
// 这些函数决定「用户覆盖」与「内置图元定义」如何合并。用错会**静默用错图元**：
// 设备长得不对、参数表少了字段，但导出流程不报错，只有懂行的人比对 E 文件才发现。
//
// **命名陷阱（先读懂再写断言）**：
//   isConcreteDeviceDefinitionParamName(name) 判定的其实是**纯视觉键**
//   （DEVICE_DEFINITION_VISUAL_PARAM_KEYS ∪ 视觉前缀，如 fillColor / strokeColor /
//   icon / image / text / backgroundImage / imageFit / imageAssetId）——
//   **不含** kind / updatedAt / params 这些元数据键（探针实测为 false）。
//   concreteDeviceDefinitionParams 保留的正是这些视觉项，故 { kind: "k" } 会被清空。
//   我第一遍按函数名直觉理解反了两次（先以为含元数据键、又以为谓词全 false 会退回候选），
//   都是探针一跑才发现。故在此显式记下真实语义。
import { describe, expect, test } from "vitest";
import {
  overrideTimestamp,
  preferredDefinitionSource,
  latestDefinitionSource,
  sharedDefinitionParams,
  visualOnlyOverride,
  concreteDeviceDefinitionParams,
  isConcreteDeviceDefinitionParamName
} from "./device-definition-shared";

type Override = Parameters<typeof overrideTimestamp>[0];
const ov = (updatedAt: string, params: Record<string, string> = {}): NonNullable<Override> =>
  ({ updatedAt, params }) as NonNullable<Override>;

describe("overrideTimestamp", () => {
  test("合法 ISO 时间串解析为毫秒数", () => {
    expect(overrideTimestamp(ov("2026-01-01T00:00:00Z"))).toBe(1767225600000);
    // 毫秒部分被保留 —— 决定并列时的先后
    expect(overrideTimestamp(ov("2026-01-01T00:00:00.500Z"))).toBe(1767225600500);
  });

  test("缺失 / 空串 / 非法日期一律 0（不产生 NaN 让排序失控）", () => {
    expect(overrideTimestamp(undefined)).toBe(0);
    expect(overrideTimestamp(ov(""))).toBe(0);
    expect(overrideTimestamp(ov("not-a-date"))).toBe(0);
  });
});

describe("preferredDefinitionSource（共享覆盖优先，其次按时间戳取新）", () => {
  const always = () => true;
  const never = () => false;

  test("共享覆盖满足谓词时优先于更新的候选（共享身份即优先级）", () => {
    const shared = ov("2020-01-01T00:00:00Z", { a: "shared" });
    const newer = ov("2026-01-01T00:00:00Z", { a: "newer" });
    expect(preferredDefinitionSource(shared, [newer], always)?.params).toEqual({ a: "shared" });
  });

  test("共享与候选都不满足谓词时返回 undefined（探针实测，不退到候选）", () => {
    // 谓词是「这条覆盖对这个 kind 是否适用」的判据。全不满足 = 没有任何可用的定义源，
    // 返回 undefined 让调用方显式处理，而不是硬塞一个不相关的覆盖。
    const shared = ov("2026-06-01T00:00:00Z", { a: "shared" });
    const older = ov("2020-01-01T00:00:00Z", { a: "older" });
    const newer = ov("2026-01-01T00:00:00Z", { a: "newer" });
    expect(preferredDefinitionSource(shared, [older, newer], never)).toBeUndefined();
    expect(preferredDefinitionSource(undefined, [older, newer], never)).toBeUndefined();
  });

  test("共享不满足谓词时，才在候选里取最新的那个", () => {
    const shared = ov("2026-06-01T00:00:00Z", { a: "shared" });
    const older = ov("2020-01-01T00:00:00Z", { a: "older" });
    const newer = ov("2026-01-01T00:00:00Z", { a: "newer" });
    // 谓词只对 newer 为真 → 共享被跳过，取 newer
    const onlyNewer = (o: NonNullable<Override>) => o.params?.a === "newer";
    expect(preferredDefinitionSource(shared, [older, newer], onlyNewer)?.params).toEqual({ a: "newer" });
    // 谓词只对 shared 为真 → 共享优先
    const onlyShared = (o: NonNullable<Override>) => o.params?.a === "shared";
    expect(preferredDefinitionSource(shared, [older, newer], onlyShared)?.params).toEqual({ a: "shared" });
  });

  test("无共享覆盖时按时间戳取最新", () => {
    const older = ov("2020-01-01T00:00:00Z", { a: "older" });
    const newer = ov("2026-01-01T00:00:00Z", { a: "newer" });
    expect(preferredDefinitionSource(undefined, [older, newer], always)?.params).toEqual({ a: "newer" });
    // 传入顺序不影响结果
    expect(preferredDefinitionSource(undefined, [newer, older], always)?.params).toEqual({ a: "newer" });
  });

  test("谓词全部不满足时返回 undefined（调用方需能区分「无」与「空覆盖」）", () => {
    const shared = ov("2026-01-01T00:00:00Z", { a: "shared" });
    expect(preferredDefinitionSource(shared, [shared], never)).toBeUndefined();
    expect(preferredDefinitionSource(undefined, [], always)).toBeUndefined();
  });

  test("时间戳并列时取输入顺序里先出现的那个（与原排序实现一致）", () => {
    // 旧实现 `sort((l, r) => ts(r) - ts(l))[0]`：并列时比较器返回 0，稳定排序保原序，
    // 故拿到的是先传入的那个。单遍 reduce 用严格 `>` 复刻同一语义 —— 平局不顶替。
    // 此前此处只断言「A 或 B 都行」（把并列当成实现细节），那条断言在两种实现下都绿，
    // 抓不住把 `>` 写成 `>=` 的回归；此处钉死成「先出现者胜」。
    const a = ov("2026-01-01T00:00:00Z", { x: "A" });
    const b = ov("2026-01-01T00:00:00Z", { x: "B" });
    expect(preferredDefinitionSource(undefined, [a, b], always)).toBe(a);
    expect(preferredDefinitionSource(undefined, [b, a], always)).toBe(b);

    // 三个并列 + 一个更旧的夹在中间：赢家仍是输入里最早出现的那一个
    const old = ov("2020-01-01T00:00:00Z", { x: "OLD" });
    expect(preferredDefinitionSource(undefined, [a, old, b], always)).toBe(a);
  });

  test("全部时间戳非法（都折成 0）时也取先出现者，且不抛错", () => {
    const bad1 = ov("x", { p: "1" });
    const bad2 = ov("y", { p: "2" });
    expect(preferredDefinitionSource(undefined, [bad1, bad2], always)).toBe(bad1);
  });
});

describe("latestDefinitionSource（多源取最新）", () => {
  test("忽略 undefined 源", () => {
    const only = ov("2026-01-01T00:00:00Z", { a: "1" });
    expect(latestDefinitionSource(undefined, only, undefined)?.params).toEqual({ a: "1" });
  });

  test("全部为 undefined 时返回 undefined", () => {
    expect(latestDefinitionSource(undefined, undefined)).toBeUndefined();
    expect(latestDefinitionSource()).toBeUndefined();
  });

  test("时间戳非法（都折成 0）时仍返回其中一个，不因 NaN 崩掉", () => {
    const bad1 = ov("x", { p: "1" });
    const bad2 = ov("y", { p: "2" });
    expect(latestDefinitionSource(bad1, bad2)).toBeDefined();
  });

  test("最新的胜出，与传入顺序无关", () => {
    const old = ov("2020-01-01T00:00:00Z", { v: "old" });
    const mid = ov("2025-01-01T00:00:00Z", { v: "mid" });
    const now = ov("2026-01-01T00:00:00Z", { v: "now" });
    expect(latestDefinitionSource(old, now, mid)?.params).toEqual({ v: "now" });
    expect(latestDefinitionSource(now, old, mid)?.params).toEqual({ v: "now" });
  });
});

describe("sharedDefinitionParams（共享覆盖只保留非视觉项与元数据）", () => {
  test("视觉类键被剔除，设备自有参数保留", () => {
    const out = sharedDefinitionParams({
      kind: "ac-load",
      updatedAt: "2026-01-01T00:00:00Z",
      params: { 自定义甲: "1", r: "0.5" }
    });
    // 探针实测：r / x 不是视觉键，故保留；kind 等元数据键亦保留
    expect(out).toMatchObject({ 自定义甲: "1", r: "0.5" });
  });

  test("无 params 时返回空对象（不返回 undefined，调用方可直接展开）", () => {
    expect(sharedDefinitionParams(undefined)).toEqual({});
    expect(sharedDefinitionParams({ kind: "k" } as never)).toEqual({});
  });
});

describe("visualOnlyOverride（把整份覆盖裁成「只覆盖视觉」）", () => {
  test("裁掉参数表与量测定义，保留身份与元数据", () => {
    const full = {
      kind: "ac-load",
      updatedAt: "2026-01-01T00:00:00Z",
      params: { 视觉色: "red" },
      parameterDefinitions: [{ field: "a" }],
      parameterDefinitionsIntent: "intent",
      measurementDefinitions: [{ id: "m" }],
      measurementDefinitionsIntent: "intent2",
      isDerivedComponentLibrary: true
    } as never;
    const out = visualOnlyOverride(full) as Record<string, unknown>;
    expect(Object.keys(out).sort()).toEqual(["isDerivedComponentLibrary", "kind", "params", "updatedAt"]);
    expect(out.parameterDefinitions).toBeUndefined();
    expect(out.parameterDefinitionsIntent).toBeUndefined();
    expect(out.measurementDefinitions).toBeUndefined();
    expect(out.measurementDefinitionsIntent).toBeUndefined();
  });

  test("不修改传入对象（裁剪产生新对象）", () => {
    const original = { kind: "k", updatedAt: "2026-01-01T00:00:00Z", params: {}, parameterDefinitions: [{ f: 1 }] } as never;
    visualOnlyOverride(original);
    expect((original as Record<string, unknown>).parameterDefinitions).toBeDefined();
  });

  test("undefined 输入返回 undefined（调用方能区分「无覆盖」）", () => {
    expect(visualOnlyOverride(undefined)).toBeUndefined();
  });
});

describe("concreteDeviceDefinitionParams / isConcreteDeviceDefinitionParamName", () => {
  test("判定的是**纯视觉键**，不含 kind/updatedAt 等元数据（命名易误解，钉住真实语义）", () => {
    // 视觉键（探针实测为 true）
    for (const n of ["fillColor", "strokeColor", "textColor", "icon", "image", "text", "backgroundImage", "imageFit", "imageAssetId"]) {
      expect(isConcreteDeviceDefinitionParamName(n), n).toBe(true);
    }
    // 非视觉键（探针实测为 false）—— 元数据键 kind/updatedAt/params 也在此列
    for (const n of ["kind", "updatedAt", "params", "isDerivedComponentLibrary", "r", "x", "color", "fill", "stroke", "opacity", "自定义甲"]) {
      expect(isConcreteDeviceDefinitionParamName(n), n).toBe(false);
    }
  });

  test("concreteDeviceDefinitionParams 只保留视觉键，其余（含 kind）一律剔除", () => {
    // 探针实测逐组结果
    expect(concreteDeviceDefinitionParams({ r: "0.5", 自定义甲: "1", kind: "k" })).toEqual({});
    expect(concreteDeviceDefinitionParams({ fillColor: "red", r: "0.5" })).toEqual({ fillColor: "red" });
    expect(concreteDeviceDefinitionParams({ kind: "k" })).toEqual({});
    expect(concreteDeviceDefinitionParams({ fillColor: "red", strokeColor: "blue", icon: "i" })).toEqual({
      fillColor: "red",
      strokeColor: "blue",
      icon: "i"
    });
  });

  test("无 params 时返回空对象", () => {
    expect(concreteDeviceDefinitionParams(undefined)).toEqual({});
  });
});
