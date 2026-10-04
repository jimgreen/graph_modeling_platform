import { afterEach, describe, expect, test, vi } from "vitest";
import { createMeasurementEditorGroupId, randomSource } from "./appRenderBatch";

// 审计对象：appRenderBatch.tsx 里原先内联的
//   `measurement-${nodeId}${terminalId ? `-${terminalId}` : ""}-group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
//
// 分级结论（去向追踪，见 appRenderBatch.tsx 中该函数上方的注释）：
//   它**不是**纯视觉/临时 id，而是 MeasurementGroup.id，会经
//   confirmMeasurementEditorDialog 的 cloneMeasurementGroupForDraft({ ...group }) 原样带走，
//   落进 projectMeasurements → 持久化方案/工程 + runtimeSnapshot 的 measurements 输出，
//   并作为 DOM 的 data-export-measurement-group-id 与 React key 参与渲染。
//   故必须可注入随机源，下面这些断言就是为「收敛真的生效」准备的。
//
// 断言取值的纪律：固定随机源刻意**不取 0.5 / 0 这类易被硬编码猜中的值** ——
// 若生产代码被改成写死某个常量，用 0.5 会假绿，用下面的值就会红。

const FIXED_RANDOM = 0.123456789;
const OTHER_RANDOM = 0.987654321;
const FIXED_EPOCH_MS = Date.UTC(2024, 0, 2, 3, 4, 5);
const FIXED_EPOCH_BASE36 = FIXED_EPOCH_MS.toString(36);

const suffixOf = (value: number) => value.toString(36).slice(2, 6);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("量测编辑组 id 的随机源已收敛为可注入依赖", () => {
  test("注入固定随机源时，同一输入产出同一个 id（可复现）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    const first = createMeasurementEditorGroupId("n1", undefined, () => FIXED_RANDOM);
    const second = createMeasurementEditorGroupId("n1", undefined, () => FIXED_RANDOM);

    expect(first).toBe(second);
    expect(first).toBe(`measurement-n1-group-${FIXED_EPOCH_BASE36}-${suffixOf(FIXED_RANDOM)}`);
  });

  test("随机源不同则 id 不同（否则说明随机值没被真正接进去）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    expect(createMeasurementEditorGroupId("n1", undefined, () => FIXED_RANDOM))
      .not.toBe(createMeasurementEditorGroupId("n1", undefined, () => OTHER_RANDOM));
  });

  test("注入的随机值按 base36 取前 4 位进入 id", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    const id = createMeasurementEditorGroupId("n1", undefined, () => FIXED_RANDOM);

    expect(id.endsWith(`-${suffixOf(FIXED_RANDOM)}`)).toBe(true);
    expect(suffixOf(FIXED_RANDOM)).toHaveLength(4);
    expect(id).toMatch(/^measurement-n1-group-[a-z0-9]+-[a-z0-9]{4}$/);
  });

  test("terminalId 有无两种形态都保持原有前缀拼接", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    expect(createMeasurementEditorGroupId("n1", "t1", () => FIXED_RANDOM))
      .toBe(`measurement-n1-t1-group-${FIXED_EPOCH_BASE36}-${suffixOf(FIXED_RANDOM)}`);
    // 空串 terminalId 与 undefined 同形（沿用原先的真值判断，不改语义）
    expect(createMeasurementEditorGroupId("n1", "", () => FIXED_RANDOM))
      .toBe(createMeasurementEditorGroupId("n1", undefined, () => FIXED_RANDOM));
  });

  test("不传随机源时默认走 randomSource，且它转发调用那一刻的 Math.random", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    const mathRandomStub = vi.spyOn(Math, "random").mockReturnValue(FIXED_RANDOM);

    // 默认参数是 randomSource 本身，所以先 stub 再调用照样生效（读取时机在调用那一刻）
    expect(createMeasurementEditorGroupId("n1"))
      .toBe(`measurement-n1-group-${FIXED_EPOCH_BASE36}-${suffixOf(FIXED_RANDOM)}`);
    expect(randomSource()).toBe(FIXED_RANDOM);
    expect(mathRandomStub).toHaveBeenCalled();
  });

  test("每个 id 只消耗一次随机数", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    const mathRandomStub = vi.spyOn(Math, "random").mockReturnValue(FIXED_RANDOM);
    mathRandomStub.mockClear();

    createMeasurementEditorGroupId("n1");

    expect(mathRandomStub).toHaveBeenCalledTimes(1);
  });

  test("默认实现保持非确定性（未被写死），钉住 Math.random 后随机项随之改变", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH_MS);

    vi.spyOn(Math, "random").mockReturnValue(FIXED_RANDOM);
    const withFirstStub = createMeasurementEditorGroupId("n1");
    vi.spyOn(Math, "random").mockReturnValue(OTHER_RANDOM);
    const withSecondStub = createMeasurementEditorGroupId("n1");

    expect(withFirstStub).not.toBe(withSecondStub);
    expect(withSecondStub).toBe(`measurement-n1-group-${FIXED_EPOCH_BASE36}-${suffixOf(OTHER_RANDOM)}`);
  });
});