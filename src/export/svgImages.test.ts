// src/export/svg-images.ts 的直接单测 —— 此前**零测试**，而 server/svgExport.mjs
// 由 Node 原生直载它（跨进程，无类型兜底）。
//
// 它决定 SVG 导出时**哪些后端图片要被带出去**。漏收 → 导出的 SVG 里图片是断的；
// 收错或路径被注入 → 请求打到非预期资源。两者都**不会报错**，只有打开导出的文件才发现。
//
// 钉住的实测契约（均非缺陷，误判成 bug 反而危险）：
//
// ① **assetId 无法造成路径穿越**：`apiPath` 只做前缀拼接，路径安全全靠
//    `encodeURIComponent(id)` 把 `/` `?` `#` 全部编码。探针实测
//    `../etc/passwd` → `/webgrp/images/..%2Fetc%2Fpasswd`。
//    但 **Map 的 key 保留原始 id（含 `../`）** —— key 用于反查原始 href，
//    拼接路径时用的是编码后的 value。这两者必须区分，测试里显式写出。
// ② **SVG 内嵌图片的嵌套引用只解析一层**（探针实测：两层嵌套得空 Map）。
//    `appendHref` 对嵌套 href 只调 `backendImageIdFromHref` 收集，**不递归**。
//    这是有意的单层限制 —— 递归会遇上循环引用导致死循环。
// ③ 嵌套 href 的正则**要求前导空白**（`\s`）：`imagenhref="..."` 不匹配，
//    避免把属性名的一部分误当属性。同时**大小写不敏感**（`HREF` 也收集）、
//    **必须带引号**（无引号不匹配）、支持 `xlink:href`、一次收集多个。
// ④ `backgroundPage.nodes` **优先于** `backgroundPage.project.nodes`
//    （`??` 短路，nodes 存在即完全忽略 project.nodes）。
// ⑤ 重复 id 先到先得；且 `appendAssetId` 与 `appendHref` 对同一 id 产出**相同的 href**
//    （都是 `/webgrp/images/<encoded>`），所以顺序差异在普通 id 上观察不到。
import { describe, expect, test } from "vitest";
import { collectSvgExportReferencedImageHrefById } from "./svg-images";
import { backendImageIdFromHref, decodeSvgImageSource } from "../svgUtils";
import type { ModelNode } from "../model";

/**
 * 按 ModelNode 的**全部必填字段**构造节点 fixture，不用 `as` 绕过检查 ——
 * 让 tsc 验证 fixture 真的合法（前面几轮已吃过漏传必填字段造出假警报的亏）。
 */
const asNode = (id: string, params: Record<string, string>): ModelNode => ({
  id,
  kind: "ac-load",
  name: id,
  nodeNumber: "1",
  acTopologyNode: 0,
  dcTopologyNode: 0,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  rotation: 0,
  scale: 1,
  terminals: [],
  params
});

const asObject = (map: Map<string, string>) => Object.fromEntries(map);

describe("collectSvgExportReferencedImageHrefById 的 assetId 路径面（见文件头①）", () => {
  test("普通 id → 前缀拼接 + 编码", () => {
    expect(asObject(collectSvgExportReferencedImageHrefById({ canvasBackgroundImageAssetId: "a1" })))
      .toEqual({ a1: "/webgrp/images/a1" });
  });

  test("**`/` `?` `#` 全被编码，无法路径穿越**", () => {
    const map = collectSvgExportReferencedImageHrefById({ canvasBackgroundImageAssetId: "../etc/passwd" });
    // key 保留原始 id（供反查），value 是编码后的安全路径 —— 两者必须区分
    expect([...map.keys()]).toEqual(["../etc/passwd"]);
    expect(map.get("../etc/passwd")).toBe("/webgrp/images/..%2Fetc%2Fpasswd");

    expect(collectSvgExportReferencedImageHrefById({ canvasBackgroundImageAssetId: "a/b" }).get("a/b"))
      .toBe("/webgrp/images/a%2Fb");
    expect(collectSvgExportReferencedImageHrefById({ canvasBackgroundImageAssetId: "a?x=1" }).get("a?x=1"))
      .toBe("/webgrp/images/a%3Fx%3D1");
    expect(collectSvgExportReferencedImageHrefById({ canvasBackgroundImageAssetId: "a#frag" }).get("a#frag"))
      .toBe("/webgrp/images/a%23frag");
  });

  test("非 ASCII id 走 UTF-8 百分号编码", () => {
    expect(collectSvgExportReferencedImageHrefById({ canvasBackgroundImageAssetId: "中文名" }).get("中文名"))
      .toBe("/webgrp/images/%E4%B8%AD%E6%96%87%E5%90%8D");
  });

  test("已含百分号编码的 id 被**再次编码**（不重复解码）", () => {
    expect(collectSvgExportReferencedImageHrefById({ canvasBackgroundImageAssetId: "a%2Fb" }).get("a%2Fb"))
      .toBe("/webgrp/images/a%252Fb");
  });

  test("首尾空白被 trim；空串 / 空白不收集", () => {
    expect(asObject(collectSvgExportReferencedImageHrefById({ canvasBackgroundImageAssetId: "  a1  " })))
      .toEqual({ a1: "/webgrp/images/a1" });
    expect(collectSvgExportReferencedImageHrefById({ canvasBackgroundImageAssetId: "" }).size).toBe(0);
    expect(collectSvgExportReferencedImageHrefById({ canvasBackgroundImageAssetId: "   " }).size).toBe(0);
    expect(collectSvgExportReferencedImageHrefById({}).size).toBe(0);
  });
});

describe("SVG 内嵌图片的嵌套引用（见文件头②③）", () => {
  const collectFrom = (svg: string) =>
    asObject(collectSvgExportReferencedImageHrefById({ canvasBackgroundImage: svg }));

  test("一层嵌套：收集内层 href", () => {
    expect(collectFrom('<svg><image href="/webgrp/images/l1"/></svg>'))
      .toEqual({ l1: "/webgrp/images/l1" });
  });

  test("② **只解析一层，不递归**（两层嵌套得空 Map）", () => {
    // 内层 SVG 用 data URI 嵌入，外层再引用它；内层里的 /webgrp/images/x 不会被收集。
    // 这是有意的单层限制 —— 递归会遇上循环引用导致死循环。
    const inner = `<svg><image href="/webgrp/images/deep"/></svg>`;
    const outer = `<svg><image href="data:image/svg+xml,${encodeURIComponent(inner)}"/></svg>`;
    expect(collectFrom(outer)).toEqual({});
  });

  test("③ 正则要求**前导空白**：属性名的一部分不误匹配", () => {
    expect(collectFrom('<svg><imagenhref="/webgrp/images/q4"/></svg>')).toEqual({});
  });

  test("③ 大小写不敏感 + 支持 xlink:href", () => {
    expect(collectFrom('<svg><image HREF="/webgrp/images/q5"/></svg>'))
      .toEqual({ q5: "/webgrp/images/q5" });
    expect(collectFrom('<svg><image xlink:href="/webgrp/images/q6"/></svg>'))
      .toEqual({ q6: "/webgrp/images/q6" });
  });

  test("③ **必须带引号**：无引号的 href 不收集", () => {
    expect(collectFrom('<svg><image href=/webgrp/images/q7/></svg>')).toEqual({});
  });

  test("单引号、换行缩进、多个 href 均支持", () => {
    expect(collectFrom("<svg><image href='/webgrp/images/q2'/></svg>")).toEqual({ q2: "/webgrp/images/q2" });
    expect(collectFrom('<svg><image\n  href="/webgrp/images/q3"/></svg>')).toEqual({ q3: "/webgrp/images/q3" });
    expect(collectFrom('<svg><image href="/webgrp/images/q8"/><image href="/webgrp/images/q9"/></svg>'))
      .toEqual({ q8: "/webgrp/images/q8", q9: "/webgrp/images/q9" });
  });
});

describe("重复 id 与节点图片收集", () => {
  test("⑤ 重复 id 先到先得；两种顺序产出的 href 相同（故顺序差异观察不到）", () => {
    const viaHrefFirst = collectSvgExportReferencedImageHrefById({
      canvasBackgroundImage: "/webgrp/images/dup",
      canvasBackgroundImageAssetId: "dup"
    });
    const viaAssetFirst = collectSvgExportReferencedImageHrefById({
      canvasBackgroundImageAssetId: "dup",
      canvasBackgroundImage: "/webgrp/images/dup"
    });
    expect(asObject(viaHrefFirst)).toEqual({ dup: "/webgrp/images/dup" });
    expect(asObject(viaAssetFirst)).toEqual({ dup: "/webgrp/images/dup" });
    expect(viaHrefFirst.size).toBe(1);
  });

  test("节点的 background/foreground 图片都收集", () => {
    const map = collectSvgExportReferencedImageHrefById({
      nodes: [asNode("n1", {
        backgroundImageAssetId: "bg1",
        foregroundImageAssetId: "fg1",
        backgroundImage: "/webgrp/images/bgHref",
        foregroundImage: "/webgrp/images/fgHref"
      })]
    });
    expect([...map.keys()].sort()).toEqual(["bg1", "bgHref", "fg1", "fgHref"]);
  });

  test("canvas 的三个来源都收集：assetId / backgroundImage / backgroundImageUrl", () => {
    const map = collectSvgExportReferencedImageHrefById({
      canvasBackgroundImageAssetId: "cAsset",
      canvasBackgroundImage: "/webgrp/images/cBg",
      canvasBackgroundImageUrl: "/webgrp/images/cUrl"
    });
    expect([...map.keys()].sort()).toEqual(["cAsset", "cBg", "cUrl"]);
  });
});

describe("backgroundPage 的节点来源（见文件头④）", () => {
  const n = (id: string, assetId: string) => asNode(id, { backgroundImageAssetId: assetId });

  test("④ `backgroundPage.nodes` 存在时**完全忽略** `project.nodes`（`??` 短路）", () => {
    const map = collectSvgExportReferencedImageHrefById({
      backgroundPage: {
        nodes: [n("x", "fromNodes")],
        project: { nodes: [n("y", "fromProject")] }
      }
    });
    expect([...map.keys()]).toEqual(["fromNodes"]);
  });

  test("`backgroundPage.nodes` 缺失时回落到 `project.nodes`", () => {
    const map = collectSvgExportReferencedImageHrefById({
      backgroundPage: { project: { nodes: [n("y", "fromProject")] } }
    });
    expect([...map.keys()]).toEqual(["fromProject"]);
  });

  test("backgroundPage 的 backgroundImageUrl 与 project 的 canvasBackgroundImage 都收集", () => {
    const map = collectSvgExportReferencedImageHrefById({
      backgroundPage: {
        backgroundImageUrl: "/webgrp/images/bgUrl",
        project: { canvasBackgroundImage: "/webgrp/images/projBg" }
      }
    });
    expect([...map.keys()].sort()).toEqual(["bgUrl", "projBg"]);
  });

  test("backgroundPage=null 时不报错，只用主 nodes", () => {
    const map = collectSvgExportReferencedImageHrefById({
      backgroundPage: null,
      nodes: [n("z", "mainNodes")]
    });
    expect([...map.keys()]).toEqual(["mainNodes"]);
  });
});

describe("依赖函数的行为（collect 正确性的前提）", () => {
  test("backendImageIdFromHref：只认 /webgrp/images/ 前缀，捕获段止于 / ? #", () => {
    expect(backendImageIdFromHref("/webgrp/images/a1")).toBe("a1");
    expect(backendImageIdFromHref("  /webgrp/images/a1  ")).toBe("a1");
    // 捕获段 [^/?#]+：遇到 / ? # 即止
    expect(backendImageIdFromHref("/webgrp/images/../x")).toBe("..");
    expect(backendImageIdFromHref("/webgrp/images/a?x=1#f")).toBe("a");
    // 其它前缀 / 空段一律不识别
    expect(backendImageIdFromHref("/other/images/a")).toBe("");
    expect(backendImageIdFromHref("/webgrp/images/")).toBe("");
    // 百分号解码（含非法编码时退回原值）
    expect(backendImageIdFromHref("/webgrp/images/a%2Fb")).toBe("a/b");
    expect(backendImageIdFromHref("/webgrp/images/%E4%B8%AD")).toBe("中");
    expect(backendImageIdFromHref("/webgrp/images/%")).toBe("%");
  });

  test("decodeSvgImageSource：裸 SVG / svg+xml data URI / base64 均还原；非 SVG 返回空串", () => {
    expect(decodeSvgImageSource("<svg/>")).toBe("<svg/>");
    expect(decodeSvgImageSource("  <svg>  ")).toBe("<svg>");
    expect(decodeSvgImageSource("data:image/svg+xml,<svg/>")).toBe("<svg/>");
    expect(decodeSvgImageSource("data:image/svg+xml;base64,PHN2Zy8+")).toBe("<svg/>");
    // 非 svg+xml 的 data URI 不解析（避免把 PNG 当 SVG 扫 href）
    expect(decodeSvgImageSource("data:image/png;base64,xx")).toBe("");
    expect(decodeSvgImageSource("")).toBe("");
  });
});
