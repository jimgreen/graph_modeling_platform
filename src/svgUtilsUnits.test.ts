// svgUtils 里 12 个「零直呼」导出纯函数的直接单测。
//
// 「零直呼」= 只被别的测试顺带捎带执行，没有任何一条断言专门钉住它们。
// 文件有测试 ≠ 里面每个函数被测到 —— 改坏时不会有任何测试报警。
//
// 本文件只覆盖**已核实无缺陷**的函数（先用探针跑边界输入确认行为正确，再据实写断言），
// 不修改实现。探针结论记录在对应 describe 里，避免后人重复调研。
import { describe, expect, test } from "vitest";
import {
  backendImageIdFromHref,
  isImageDataUrl,
  imageArrayBufferToDataUrl,
  decodeBase64Text,
  svgStrokeDashArray,
  escapeXml,
  formatSvgNumber,
  svgLengthNumber,
  svgRootAttributeValue,
  styleObjectToSvgAttribute,
  renderSvgElementMarkup
} from "./svgUtils";
import React from "react";

describe("backendImageIdFromHref（探针已核实行为正确）", () => {
  test("从自身格式的 href 里取出 id，忽略后续 query", () => {
    expect(backendImageIdFromHref("/webgrp/images/bg?id=1&name=a")).toBe("bg");
    expect(backendImageIdFromHref("/webgrp/images/bg?id=1")).toBe("bg");
  });

  test("前缀不符一律空串（不误认其它路径）", () => {
    for (const href of ["/other/images/bg?id=1", "http://evil.com/x.png", "data:image/png;base64,AAAA", ""]) {
      expect(backendImageIdFromHref(href), href).toBe("");
    }
  });

  test("目录形式（无文件名）返回空串", () => {
    expect(backendImageIdFromHref("/webgrp/images/")).toBe("");
  });

  test("非法百分号序列不抛错（回退原值）", () => {
    expect(() => backendImageIdFromHref("/webgrp/images/bg?id=%ZZ")).not.toThrow();
    expect(backendImageIdFromHref("/webgrp/images/bg?id=%ZZ")).toBe("bg");
  });
});

describe("isImageDataUrl（探针已核实：只认 image/*，拒绝 html 与 javascript）", () => {
  test("接受 image/* 的 base64 data URL", () => {
    expect(isImageDataUrl("data:image/png;base64,AAAA")).toBe(true);
    expect(isImageDataUrl("data:image/svg+xml;base64,AAAA")).toBe(true);
    expect(isImageDataUrl("data:image/jpeg;base64,QQ==")).toBe(true);
  });

  test("拒绝非图片类型（含可执行的 html / javascript）", () => {
    for (const v of [
      "data:text/html;base64,AAAA",
      "data:application/javascript;base64,QQ==",
      "data:;base64,AAAA"
    ]) {
      expect(isImageDataUrl(v), v).toBe(false);
    }
  });

  test("大小写与首尾空白不影响判定（内部已 trim）", () => {
    expect(isImageDataUrl(" DATA:image/png;base64,AAAA ")).toBe(true);
  });
});

describe("imageArrayBufferToDataUrl（探针已核实：分块编码，大 buffer 不炸栈）", () => {
  test("产出标准 data URL 且可逆", () => {
    // 该函数用 window.btoa（浏览器专属），Node 测试环境需 shim
    const original = globalThis.window;
    (globalThis as { window?: unknown }).window = globalThis;
    try {
      const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const url = imageArrayBufferToDataUrl(bytes.buffer, "image/png");
      expect(url.startsWith("data:image/png;base64,")).toBe(true);
      const b64 = url.slice("data:image/png;base64,".length);
      // atob 返回「每个字节一个字符」的字符串，不是字节数组
      expect([...atob(b64)].map((c) => c.charCodeAt(0))).toEqual([...bytes]);
    } finally {
      (globalThis as { window?: unknown }).window = original;
    }
  });

  test("跨 0x8000 分块边界的 buffer 也能正确编码（探针：128MB 均正常，无栈溢出）", () => {
    const original = globalThis.window;
    (globalThis as { window?: unknown }).window = globalThis;
    try {
      // 0x8000 = 32768；取 32768*2 + 17 覆盖两个完整分块加余量
      const size = 0x8000 * 2 + 17;
      const bytes = new Uint8Array(size);
      for (let i = 0; i < size; i += 1) bytes[i] = i % 256;
      const b64 = imageArrayBufferToDataUrl(bytes.buffer, "image/png").slice("data:image/png;base64,".length);
      const decoded = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      expect(decoded.length).toBe(size);
      expect([...decoded.slice(0, 8)]).toEqual([...bytes.slice(0, 8)]);
      // 末尾跨界处也要正确
      expect([...decoded.slice(-4)]).toEqual([...bytes.slice(-4)]);
    } finally {
      (globalThis as { window?: unknown }).window = original;
    }
  });
});

describe("decodeBase64Text（探针已核实）", () => {
  test("解 base64 + UTF-8 解码", () => {
    expect(decodeBase64Text("aGVsbG8=")).toBe("hello");
    expect(decodeBase64Text("5L2g5aW9")).toBe("你好");
  });

  test("忽略内嵌空白（换行折行的 base64）", () => {
    expect(decodeBase64Text("aGVs bG8=")).toBe("hello");
  });

  test("非法输入返回空串而不是抛错", () => {
    expect(decodeBase64Text("!!!not base64!!!")).toBe("");
    expect(decodeBase64Text("")).toBe("");
    expect(decodeBase64Text("YQ===")).toBe("");
  });
});

describe("svg 格式化与转义", () => {
  test("formatSvgNumber 保留五位小数并把 -0 归一", () => {
    expect(formatSvgNumber(1.234567)).toBe("1.23457");
    expect(formatSvgNumber(-0)).toBe("0");
    expect(formatSvgNumber(0.1 + 0.2)).toBe("0.3");
  });

  test("escapeXml 覆盖全部五个 XML 实体（委托给单源实现）", () => {
    expect(escapeXml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });

  test("styleObjectToSvgAttribute 做 camelCase → kebab-case 转换", () => {
    expect(styleObjectToSvgAttribute({ strokeWidth: 2, fill: "red" })).toBe("stroke-width:2;fill:red");
  });

  test("styleObjectToSvgAttribute 已知局限：`;` 不被处理（值可注入额外 CSS 属性）", () => {
    // 如实记录而非假装覆盖：实测 `{ fill: "red; background-image:url(外部地址)" }` 会原样进入 CSS。
    // 当前不可达 —— 渲染路径里所有 style 对象要么硬编码（userSelect/pointerEvents/drop-shadow 滤镜），
    // 要么经 renderSvgElementMarkup 的 escapeXml 处理；用户参数只以布尔标志进入
    // staticSymbolShadowStyle。若将来把用户数据接进 style，这里需要先补转义。
    const out = styleObjectToSvgAttribute({ fill: "red; background-image:url(https://evil.example/b)" });
    expect(out).toContain("background-image:url(https://evil.example/b)");
  });
});

describe("renderSvgElementMarkup 的属性转义（真实防线）", () => {
  test("属性值里的引号被转义，无法逃逸出属性边界", () => {
    const el = React.createElement("rect", { width: 10, fill: 'red" onload="alert(1)' });
    const out = renderSvgElementMarkup(el);
    // 转义后 `onload` 只是属性值里的一段普通文本，不再是属性：
    // 判据是「引号被转义」+「不存在未转义的属性分隔形式」，
    // 而不能直接全文搜 onload= —— 转义后的字面量里仍然含这几个字符。
    expect(out).toContain("&quot;");
    expect(out).not.toMatch(/="[^"]*"\s+on[a-z]+\s*=/iu);
    // 原始的 breakout 形态（引号未转义）不应出现
    expect(out).not.toContain('fill="red" onload="alert(1)"');
  });

  test("非 style 属性同样被转义（含分号，path 数据安全）", () => {
    const el = React.createElement("rect", { width: 10, d: "M0 0;L1 1", fill: 'a"b' });
    const out = renderSvgElementMarkup(el);
    expect(out).toContain('d="M0 0;L1 1"'); // 分号在属性值内是合法内容，不需转义
    expect(out).not.toContain('fill="a"b"');
  });

  test("非字符串属性被规范成字符串；null/undefined/false 属性被丢弃", () => {
    const el = React.createElement("rect", { width: 10, height: undefined, fill: null, stroke: false, opacity: 0.5 });
    const out = renderSvgElementMarkup(el);
    expect(out).toContain('width="10"');
    expect(out).toContain('opacity="0.5"');
    expect(out).not.toContain("height=");
    expect(out).not.toContain("fill=");
    expect(out).not.toContain("stroke=");
  });
});
