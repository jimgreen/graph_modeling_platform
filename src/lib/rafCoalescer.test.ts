import { describe, expect, test, vi } from "vitest";
import {
  createElementRectCache,
  createIdleTaskScheduler,
  createRafLatestScheduler
} from "./rafCoalescer";

describe("createRafLatestScheduler", () => {
  test("同一渲染帧内高频 schedule 合并为仅执行最新值 1 次", () => {
    const queue: FrameRequestCallback[] = [];
    const applied: number[] = [];
    const scheduler = createRafLatestScheduler<number>((v) => applied.push(v), {
      requestFrame: (cb) => {
        queue.push(cb);
        return queue.length;
      },
      cancelFrame: () => {}
    });

    scheduler.schedule(1);
    scheduler.schedule(2);
    scheduler.schedule(3);

    expect(queue).toHaveLength(1);
    expect(applied).toEqual([]);
    expect(scheduler.hasPending()).toBe(true);

    queue[0](16);
    expect(applied).toEqual([3]);
    expect(scheduler.hasPending()).toBe(false);
  });

  test("flush 立即同步刷出挂起的最新值并取消待执行帧", () => {
    const cancelFrame = vi.fn();
    const applied: string[] = [];
    const scheduler = createRafLatestScheduler<string>((v) => applied.push(v), {
      requestFrame: () => 42,
      cancelFrame
    });

    scheduler.schedule("draft-1");
    scheduler.schedule("draft-2");
    scheduler.flush();

    expect(cancelFrame).toHaveBeenCalledWith(42);
    expect(applied).toEqual(["draft-2"]);
    expect(scheduler.hasPending()).toBe(false);
  });

  test("cancel 丢弃挂起值且不再触发回调", () => {
    const cancelFrame = vi.fn();
    const applied: number[] = [];
    const scheduler = createRafLatestScheduler<number>((v) => applied.push(v), {
      requestFrame: () => 7,
      cancelFrame
    });

    scheduler.schedule(99);
    scheduler.cancel();

    expect(cancelFrame).toHaveBeenCalledWith(7);
    expect(applied).toEqual([]);
    expect(scheduler.hasPending()).toBe(false);
  });
});

describe("createElementRectCache", () => {
  test("TTL 内复用非零 DOMRect，过期或 invalidate 后重新读取", () => {
    let clock = 100;
    const cache = createElementRectCache(16, () => clock);
    const getBoundingClientRect = vi.fn(() => ({ width: 800, height: 600, left: 0, top: 0 }) as DOMRect);
    const fakeEl = { getBoundingClientRect } as unknown as Element;

    cache.getRect(fakeEl);
    clock = 110;
    cache.getRect(fakeEl);
    expect(getBoundingClientRect).toHaveBeenCalledTimes(1);

    clock = 120;
    cache.getRect(fakeEl);
    expect(getBoundingClientRect).toHaveBeenCalledTimes(2);

    cache.invalidate();
    cache.getRect(fakeEl);
    expect(getBoundingClientRect).toHaveBeenCalledTimes(3);
  });

  test("不缓存 0x0 的未布局矩形", () => {
    const cache = createElementRectCache(16, () => 100);
    const getBoundingClientRect = vi.fn(() => ({ width: 0, height: 0, left: 0, top: 0 }) as DOMRect);
    const fakeEl = { getBoundingClientRect } as unknown as Element;

    cache.getRect(fakeEl);
    cache.getRect(fakeEl);
    expect(getBoundingClientRect).toHaveBeenCalledTimes(2);
  });
});

describe("createIdleTaskScheduler", () => {
  test("Node 测试环境同步执行且支持多次调度", () => {
    const ran: number[] = [];
    const scheduler = createIdleTaskScheduler(200);
    scheduler.schedule(() => ran.push(1));
    scheduler.schedule(() => ran.push(2));
    expect(ran).toEqual([1, 2]);
  });
});
