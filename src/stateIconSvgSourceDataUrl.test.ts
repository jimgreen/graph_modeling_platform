// src/stateIconDrawing.tsx 里 svgSourceToDataUrl（约 2307 行）的直测。
//
// 这函数此前**零直接断言**：全仓两处命中都在 appDeviceDefinitionFactories.test.ts，
// 且都是 `vi.mock` 桩（`() => data:image/svg+xml,${encodeURIComponent(source)}`）——
// 注意那两个桩的前缀少一个 `;utf8`，即真实前缀从未被任何用例钉住。
//
// 它是「用户自带 SVG 存不进图元库时的兜底」：stateIconDrawingSvgElementMarkup 在
// parseStateIconSvgSource / stateIconSvgFallbackParts 都解析不出来时，用它把原始源码塞进
// `<image href=...>`。判错不报错、只是图标不显示，所以容易漏：
//   · 前缀错一个字符（`;utf8` 少了、或写成 `;utf-8`）→ 浏览器解析不出图，静默空白；
//   · 不做百分号编码 → SVG 里的 `#` 被当成 fragment 起点、`"` 直接截断属性；
//   · 忘了 trim → 纯空白输入会产出一个「合法但空图」的 data URL，而不是空串。
//
// 不引 jsdom（仓库默认 environment 是 node，装 jsdom 属于新增依赖）：本函数只碰字符串。
import { describe, expect, test } from "vitest";

import { svgSourceToDataUrl } from "./stateIconDrawing";

/** 真实前缀含 `;utf8`（不是 `;utf-8`，也不是裸逗号）。 */
const PREFIX = "data:image/svg+xml;utf8,";

describe("空输入返回空串", () => {
  test("空串", () => {
    expect(svgSourceToDataUrl("")).toBe("");
  });

  test("纯空白（空格 / 制表 / 换行混排）", () => {
    // encodeURIComponent("   ") === "%20%20%20" 是**非空**串，所以这条用例真能咬住
    // trim 缺失：少了 trim 就会产出一个「合法但空图」的 data URL。
    expect(svgSourceToDataUrl("   ")).toBe("");
    expect(svgSourceToDataUrl("\t\n \r\n")).toBe("");
    expect(svgSourceToDataUrl(" ")).not.toBe(svgSourceToDataUrl("x"));
  });

  test("不传参数与显式传 undefined 都落到空串，而不是字符串 undefined", () => {
    // 签名是可选参数，String(undefined) === "undefined" 是真值：少一个 ?? 兜底的话
    // 这里会得到一个内容为 undefined 的 data URL。
    expect(svgSourceToDataUrl()).toBe("");
    expect(svgSourceToDataUrl(undefined)).toBe("");
  });
});

describe("非空输入的 data URL 结构", () => {
  test("含尖括号的 SVG 串以 data URL 前缀开头", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
    const url = svgSourceToDataUrl(svg);

    expect(url.startsWith(PREFIX)).toBe(true);
    // 前缀之后不再有裸尖括号 / 引号 / 空格，否则 <image href> 的属性会被提前截断。
    const body = url.slice(PREFIX.length);
    expect(body).not.toMatch(/[<>"' ]/);
    expect(body).not.toBe("");
  });

  test("结果体正好等于 encodeURIComponent 源串", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
    expect(svgSourceToDataUrl(svg)).toBe(`${PREFIX}${encodeURIComponent(svg)}`);
  });

  test("先裁掉首尾空白再编码，编码的是裁剪后的串", () => {
    // 编码对象是 trim **之后** 的串，不是原串：这一条钉住编码与 trim 的先后，
    // 两步顺序颠倒时结果相差一组 %20。
    expect(svgSourceToDataUrl("  <svg/>  ")).toBe(`${PREFIX}%3Csvg%2F%3E`);
  });

  test("中文与 # 被百分号转义，不破坏 data URL 结构", () => {
    // 字面量而非 encodeURIComponent(...)，免得用例和实现共用同一个编码器时互相掩护。
    expect(svgSourceToDataUrl("<text>中文#</text>")).toBe(
      `${PREFIX}%3Ctext%3E%E4%B8%AD%E6%96%87%23%3C%2Ftext%3E`
    );

    const url = svgSourceToDataUrl("<text>中文#</text>");
    // 裸 # 会被浏览器当成 fragment 起点，后面的 SVG 正文直接丢失。
    expect(url).not.toContain("#");
    // 裸非 ASCII 在 data URL 里不可靠（各浏览器处理不一）。
    expect(url.slice(PREFIX.length)).toMatch(/^[\x21-\x7e]+$/);
    expect(url.startsWith(PREFIX)).toBe(true);
  });
});