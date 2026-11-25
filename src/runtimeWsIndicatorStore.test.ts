import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bumpRuntimeWsBlinkSeq,
  getRuntimeWsIndicatorSnapshot,
  resetRuntimeWsIndicatorStore,
  subscribeRuntimeWsIndicator,
  updateRuntimeWsClientId,
  updateRuntimeWsStatus
} from "./runtimeWsIndicatorStore";

describe("runtimeWsIndicatorStore", () => {
  afterEach(() => {
    resetRuntimeWsIndicatorStore();
  });

  it("初始状态为 connecting / blinkSeq=0 / 空 clientId", () => {
    expect(getRuntimeWsIndicatorSnapshot()).toEqual({
      status: "connecting",
      blinkSeq: 0,
      clientId: ""
    });
  });

  it("状态或 clientId 相同不触发重复通知，变化或活动闪烁时精确通知订阅者", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRuntimeWsIndicator(listener);

    updateRuntimeWsStatus("connecting");
    expect(listener).toHaveBeenCalledTimes(0);

    updateRuntimeWsStatus("open");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getRuntimeWsIndicatorSnapshot().status).toBe("open");

    bumpRuntimeWsBlinkSeq();
    bumpRuntimeWsBlinkSeq();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(getRuntimeWsIndicatorSnapshot().blinkSeq).toBe(2);

    updateRuntimeWsClientId("page-token-01");
    updateRuntimeWsClientId("page-token-01");
    expect(listener).toHaveBeenCalledTimes(4);
    expect(getRuntimeWsIndicatorSnapshot().clientId).toBe("page-token-01");

    unsubscribe();
    bumpRuntimeWsBlinkSeq();
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("resetRuntimeWsIndicatorStore 恢复初始快照", () => {
    updateRuntimeWsStatus("open");
    bumpRuntimeWsBlinkSeq();
    updateRuntimeWsClientId("abc");

    resetRuntimeWsIndicatorStore();
    expect(getRuntimeWsIndicatorSnapshot()).toEqual({
      status: "connecting",
      blinkSeq: 0,
      clientId: ""
    });
  });
});
