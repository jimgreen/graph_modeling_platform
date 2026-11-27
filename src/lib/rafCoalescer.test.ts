import { describe, expect, test, vi } from "vitest";
import {
  createElementRectCache,
  createIdleTaskScheduler,
  createRafLatestScheduler,
  fastClonePojo
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

  test("leading 模式首帧 0ms 同步响应，连续多帧每渲染帧严格至多执行 1 次，空闲后恢复同步响应", () => {
    const queue = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    const applied: number[] = [];
    const scheduler = createRafLatestScheduler<number>((v) => applied.push(v), {
      leading: true,
      requestFrame: (cb) => {
        const id = nextId++;
        queue.set(id, cb);
        return id;
      },
      cancelFrame: (id) => {
        queue.delete(id);
      }
    });

    const stepFrame = (ts: number) => {
      const callbacks = [...queue.values()];
      queue.clear();
      for (const cb of callbacks) cb(ts);
    };

    // 第 1 帧：首个事件立即同步生效，后续事件进入帧缓冲
    scheduler.schedule(10);
    expect(applied).toEqual([10]);
    scheduler.schedule(20);
    scheduler.schedule(30);
    expect(applied).toEqual([10]);

    stepFrame(16.7);
    expect(applied).toEqual([10, 30]);

    // 第 2 帧：处于连续拖拽冷却窗口内，不抢跑同步触发，帧末合并执行 1 次
    scheduler.schedule(40);
    scheduler.schedule(50);
    expect(applied).toEqual([10, 30]);

    stepFrame(33.3);
    expect(applied).toEqual([10, 30, 50]);

    // 第 3 帧无新事件：冷却锁自动释放回空闲态
    stepFrame(50.0);
    expect(queue.size).toBe(0);

    // 下一轮新拖拽再次立即 0ms 同步响应
    scheduler.schedule(99);
    expect(applied).toEqual([10, 30, 50, 99]);
  });
});

describe("fastClonePojo", () => {
  test("深拷贝嵌套 POJO 与数组并保持引用完全隔离，遇到特殊内建对象安全克隆", () => {
    const source = {
      name: "换流站草稿",
      size: { width: 120, height: 80 },
      terminals: [
        { x: 0, y: 0.5, tags: ["ac", "hv"] },
        { x: 1, y: 0.5, tags: ["dc"] }
      ],
      optionalHint: undefined as string | undefined,
      createdAt: new Date("2026-01-01T00:00:00Z")
    };
    const cloned = fastClonePojo(source);
    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    expect(cloned.size).not.toBe(source.size);
    expect(cloned.terminals[0]).not.toBe(source.terminals[0]);
    expect(cloned.terminals[0].tags).not.toBe(source.terminals[0].tags);
    expect(cloned.createdAt).not.toBe(source.createdAt);
    expect(cloned.createdAt.getTime()).toBe(source.createdAt.getTime());

    cloned.terminals[0].x = 999;
    cloned.terminals[0].tags.push("mutated");
    expect(source.terminals[0].x).toBe(0);
    expect(source.terminals[0].tags).toEqual(["ac", "hv"]);
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
