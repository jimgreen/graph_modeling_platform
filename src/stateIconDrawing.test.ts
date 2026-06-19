import { describe, expect, test } from "vitest";

import {
  DEFAULT_STATE_NAME,
  DEFAULT_STATE_PAGE_ID,
  DEFAULT_STATE_VALUE,
  appendNonDefaultStateDraftRow,
  createStateDraftRow,
  createStateDraftRowFromDefaultVisual,
  defaultStateDraftRow,
  nextNonDefaultStateIndex,
  nonDefaultStateDraftRows,
  normalizeStatePageId,
  upsertDefaultStateDraftRow
} from "./stateIconDrawing";

describe("default device state draft rows", () => {
  test("uses a synthetic default row when no state definitions exist", () => {
    const row = defaultStateDraftRow([], { image: "default.svg" });

    expect(row.id).toBe(DEFAULT_STATE_PAGE_ID);
    expect(row.value).toBe(DEFAULT_STATE_VALUE);
    expect(row.name).toBe(DEFAULT_STATE_NAME);
    expect(row.image).toBe("default.svg");
  });

  test("keeps the first state definition as the editable default state", () => {
    const first = createStateDraftRow({ value: "1", name: "运行", image: "run.svg" });
    const second = createStateDraftRow({ value: "0", name: "停运" });
    const row = defaultStateDraftRow([first, second], { image: "fallback.svg" });

    expect(row.id).toBe(first.id);
    expect(row.value).toBe("1");
    expect(row.name).toBe("运行");
    expect(row.image).toBe("run.svg");
    expect(nonDefaultStateDraftRows([first, second])).toEqual([second]);
    expect(normalizeStatePageId([first, second], first.id)).toBe(DEFAULT_STATE_PAGE_ID);
  });

  test("inherits the default visual when the first state has no explicit icon", () => {
    const first = createStateDraftRow({ value: "0", name: "默认" });
    const row = defaultStateDraftRow([first], {
      image: "default.svg",
      text: "D",
      strokeColor: "#123456"
    });

    expect(row.value).toBe("0");
    expect(row.name).toBe("默认");
    expect(row.image).toBe("default.svg");
    expect(row.text).toBe("D");
    expect(row.strokeColor).toBe("#123456");
  });

  test("upserts the default row before non-default state pages", () => {
    const second = createStateDraftRow({ value: "1", name: "状态1" });
    const withDefault = appendNonDefaultStateDraftRow([], { image: "default.svg" }, second);
    const updated = upsertDefaultStateDraftRow(withDefault, { image: "fallback.svg" }, { value: "2", name: "默认运行" });

    expect(withDefault).toHaveLength(2);
    expect(withDefault[0].value).toBe(DEFAULT_STATE_VALUE);
    expect(withDefault[0].name).toBe(DEFAULT_STATE_NAME);
    expect(withDefault[0].image).toBe("default.svg");
    expect(withDefault[1]).toBe(second);
    expect(updated[0].id).toBe(withDefault[0].id);
    expect(updated[0].value).toBe("2");
    expect(updated[0].name).toBe("默认运行");
    expect(updated[1]).toBe(second);
  });

  test("numbers new states from state 1 and copies the default state visual", () => {
    const defaultRow = createStateDraftRow({
      value: "0",
      name: "状态0",
      image: "default-state.svg",
      text: "默认",
      strokeColor: "#0f172a"
    });
    const firstIndex = nextNonDefaultStateIndex([defaultRow]);
    const firstState = createStateDraftRowFromDefaultVisual(defaultStateDraftRow([defaultRow]), {
      value: String(firstIndex),
      name: `状态${firstIndex}`
    });
    const secondIndex = nextNonDefaultStateIndex([defaultRow, firstState]);

    expect(firstIndex).toBe(1);
    expect(firstState.value).toBe("1");
    expect(firstState.name).toBe("状态1");
    expect(firstState.image).toBe("default-state.svg");
    expect(firstState.text).toBe("默认");
    expect(firstState.strokeColor).toBe("#0f172a");
    expect(secondIndex).toBe(2);
  });
});
