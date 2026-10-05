// src/stateIconDrawing.tsx 的专属行为守卫（此前只有 stateIconDrawing.test.ts /
// stateIconDrawingPure.test.ts / stateIconDrawingGeometry.test.ts 等间接覆盖，
// 且这几个文件都是 .ts；本文件是同目录既有的 .tsx 命名，与它们互不覆盖）。
//
// 本文件只针对两处**分支**，且两处都刻意取「判别输入」：
//   1. nextNonDefaultStateIndex 的循环耗尽兜底（stateIconDrawing.tsx L232）
//      —— 兜底值 Math.max(1, rows.length) 与循环路径产出的值必须不同，
//         否则「删掉兜底」这类变异会被循环路径的返回值掩盖（§6.12 等价性陷阱）。
//   2. svgSourceFromDataUrl 的两个臂（L1309 的 atob 缺失臂、L1312 的 catch 臂）
//      —— atob 臂用 stubGlobal 把 atob 打成 undefined 才进得去（§6.10：先确认
//         stub 的作用域与源码读的是同一个对象，源码读的就是全局 atob）。
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createStateDraftRow,
  nextNonDefaultStateIndex,
  svgSourceFromDataUrl
} from "./stateIconDrawing";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("nextNonDefaultStateIndex：循环耗尽后走末尾兜底", () => {
  // 三行的 value 与 状态N 名字**交替**占满 1..6，于是循环扫描 1..rows.length+1
  // （即 1..4）时每一格都命中 used，循环正常结束而不 return —— 只有末尾那行
  // `return Math.max(1, rows.length)` 能产出结果，值 = Math.max(1, 3) = 3。
  test("value 与 状态N 交替占满全部序号时返回 Math.max(1, rows.length)", () => {
    const rows = [
      createStateDraftRow({ value: "1", name: "状态2" }),
      createStateDraftRow({ value: "3", name: "状态4" }),
      createStateDraftRow({ value: "5", name: "状态6" })
    ];

    expect(nextNonDefaultStateIndex(rows)).toBe(3);
  });

  // 对照组：同样的行数，但序号只被 value 占掉 1..3，循环在 index=4 处第一次落空
  // 并 return 4 —— 与兜底值 3 逐值不同，所以上一条断言确实只在断兜底那一行。
  // （若把兜底改成 Math.max(1, rows.length + 1)，本条仍绿、上一条转红。）
  test("序号未占满时由循环 return 首个空位，与兜底值不同", () => {
    const rows = [
      createStateDraftRow({ value: "1", name: "甲" }),
      createStateDraftRow({ value: "2", name: "乙" }),
      createStateDraftRow({ value: "3", name: "丙" })
    ];

    expect(nextNonDefaultStateIndex(rows)).toBe(4);
  });
});

describe("svgSourceFromDataUrl：base64 与非法 percent 编码两个臂", () => {
  // atob 缺失臂：源码是 `typeof atob === "function" ? atob(payload) : ""`。
  // 源码读的是**全局** atob，所以把 globalThis.atob 打成 undefined 就进得去；
  // 若只 stub 一个局部引用，测试会永远停在另一臂（§6.10）。
  // payload 用 "PHN2Zy8+"（解出 "<svg/>"）——刻意不是能被硬编码猜到的串。
  test("环境没有 atob 时 base64 data URL 退化为空串", () => {
    vi.stubGlobal("atob", undefined);

    expect(svgSourceFromDataUrl("data:image/svg+xml;base64,PHN2Zy8+")).toBe("");
  });

  // 对照：同一个 payload 在 atob 存在时被解出 —— 证明上一条的空串来自
  // 「atob 缺失」而不是来自 payload 本身解不开。
  test("atob 存在时同一个 base64 payload 被解出原文", () => {
    expect(svgSourceFromDataUrl("data:image/svg+xml;base64,PHN2Zy8+")).toBe("<svg/>");
  });

  // catch 臂：非 base64 路径走 decodeURIComponent(payload)，payload 含非法
  // percent 序列 "%zz" 会抛 URIError，于是落到 catch 里**原样返回 payload**。
  // 期望值是完整 payload（含开头的 <svg>），不是解码结果 —— 这一点决定了
  // 「把 catch 改成 return ""」这类变异能否被这条断言咬住。
  test("非 base64 的 payload 含非法 percent 编码时原样返回 payload", () => {
    expect(svgSourceFromDataUrl("data:image/svg+xml,<svg>%zz</svg>")).toBe("<svg>%zz</svg>");
  });

  // 对照：合法 percent 编码走 decodeURIComponent 正常解码，与 catch 臂产出不同。
  test("合法 percent 编码被 decodeURIComponent 解码，不落 catch", () => {
    expect(svgSourceFromDataUrl("data:image/svg+xml,%3Csvg%3E")).toBe("<svg>");
  });
});