// src/export/device-template-icon.ts 的直接单测 —— 此前**无测试文件**，
// 而 `server/symbolExport.mjs` 由 Node 原生直载它（跨进程，无类型兜底）。
//
// 它构建「图元正文」SVG：漏做或做错一步，导出的图元库里图标就是错的，
// 而前端与后端两条导出链路**都不报错**，只有打开导出的文件才发现。
//
// **本文件的核心是一条跨模块的隐式协作契约**（见文件头②）：
// 剥离端子连接线用的正则是**非贪婪**的 `<g ...>[\s\S]*?</g>`，它只匹配到**第一个**
// `</g>`。若该 `<g>` 内嵌套 `<g>`，就会提前截断：内层之后的内容残留（端子引线没剥干净），
// 且多出一个孤立的 `</g>`。探针实测确实如此。
// 但**生成侧保证了不嵌套** —— `customDevicePersistedTerminalMarkup` 把若干
// `customDeviceTerminalConnectorLineMarkup`（自闭合 `<line/>` **叶子元素**）拼进去。
// 故当前不可达，**不改实现**；这里用测试把该前提钉住：将来引线若改成 `<g>` 包裹，
// 本文件会转红提醒，而不是让端子引线静默残留在导出的图元里。
import { describe, expect, test } from "vitest";
import { buildDeviceTemplateIconSvg } from "./device-template-icon";
import { customDeviceImageWithTerminalConnectors } from "../customDeviceUtils";
import { decodeSvgImageSource } from "../svgUtils";
import type { DeviceTemplate, Point, TerminalType } from "../model";

/**
 * 构造**确实会渲染 backgroundImage** 的模板。
 * 注意：ac-load / ac-bus 等内置 kind 走自身绘制逻辑、根本不渲染图片参数
 * （探针实测），拿它们测会得到"图片被剥掉了"的假结论 —— 必须用图片型 kind。
 */
const imageTemplate = (over: Partial<DeviceTemplate> = {}): DeviceTemplate => ({
  kind: "ac-generator",
  label: "电源",
  categoryLibrary: "测试",
  size: { width: 100, height: 60 },
  params: {},
  terminalType: "ac",
  terminalCount: 2,
  ...over
} as DeviceTemplate);

/** 跑一遍 buildDeviceTemplateIconSvg，把 backgroundImage 换成给定 SVG */
const buildWith = (svg: string, over: Partial<DeviceTemplate> = {}) =>
  buildDeviceTemplateIconSvg(imageTemplate({ ...over, params: { backgroundImage: svg } }));

const MARK = "ZQXJMARKER";
const svgWith = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const LINE_ID_MARK = "TERMINALLINE";

describe("基线：backgroundImage 确实被渲染（防止后续用例得出假结论）", () => {
  test("图片型 kind 会把 SVG 内嵌进正文", () => {
    const out = buildWith(svgWith(`<rect id="${MARK}"/>`));
    expect(out).toContain(MARK);
  });

  test("内置绘制型 kind（ac-load）**不渲染** 图片参数 —— 故不能用来测剥离", () => {
    // 如实记录这个差异：探针最初用 ac-load 测，得出"所有值都被剥离"的假结论。
    const out = buildDeviceTemplateIconSvg(imageTemplate({
      kind: "ac-load",
      params: { backgroundImage: svgWith(`<rect id="${MARK}"/>`) }
    }));
    expect(out).not.toContain(MARK);
  });
});

describe("② 端子连接线分组的剥离（核心协作契约）", () => {
  /**
   * 端到端素材：用生成侧真实产出的带端子组图片喂给图标构建器。
   * 注意 `customDeviceImageWithTerminalConnectors` 返回的是 **data URI**，
   * 要看清组内结构必须先 decodeSvgImageSource（探针实测：明文里没有 `<line`）。
   */
  const realTerminalGroupHref = () => {
    const anchors: Point[] = [{ x: 240, y: 120 }, { x: 0, y: 120 }];
    const types: TerminalType[] = ["ac", "ac"];
    return customDeviceImageWithTerminalConnectors(svgWith(`<rect id="${MARK}"/>`), types, anchors);
  };

  test("生成侧引线是**自闭合 <line> 叶子元素**、组内无嵌套 <g>（非贪婪剥离正确的前提）", () => {
    const href = realTerminalGroupHref();
    expect(href.startsWith("data:image/svg+xml")).toBe(true);
    const decoded = decodeSvgImageSource(href);
    const groupMatch = decoded.match(
      /<g\b[^>]*data-custom-device-persisted-terminal-connectors[^>]*>([\s\S]*?)<\/g>/
    );
    expect(groupMatch, "应能匹配到端子组").not.toBeNull();
    expect(groupMatch![1]).toContain("<line");
    // 关键断言：组内**没有嵌套 <g>** —— 这正是非贪婪正则能正确剥完整个组的原因
    expect(groupMatch![1]).not.toContain("<g");
  });

  test("端到端：真实生成的端子组被**完整剥离**（引线不残留、图元本体保留）", () => {
    const href = realTerminalGroupHref();
    expect(decodeSvgImageSource(href)).toContain("<line");
    const out = buildDeviceTemplateIconSvg(imageTemplate({ params: { backgroundImage: href } }));
    // 图元本体保留
    expect(out).toContain(MARK);
    // 端子连接线被剥掉
    expect(out).not.toContain("data-custom-device-persisted-terminal-connectors");
  });

  test("三种 data 属性名都被剥离", () => {
    for (const attr of ["persisted-terminals", "persisted-terminal-connectors", "terminal-connectors"]) {
      const out = buildWith(
        svgWith(`<g data-custom-device-${attr}="true"><line id="${LINE_ID_MARK}"/></g><rect id="${MARK}"/>`)
      );
      expect(out, attr).not.toContain(`data-custom-device-${attr}`);
      expect(out, attr).toContain(MARK);
    }
  });

  test("**只认 true**：\"false\" / \"1\" / \"\" 一律不剥离", () => {
    for (const value of ['"false"', '"1"', '""']) {
      const out = buildWith(
        svgWith(`<g data-custom-device-persisted-terminals=${value}><line id="${LINE_ID_MARK}"/></g><rect id="${MARK}"/>`)
      );
      expect(out, value).toContain("data-custom-device-persisted-terminals");
      expect(out, value).toContain(MARK);
    }
  });

  test("单引号 'true' 与无引号 true 同样被剥离", () => {
    for (const value of ["'true'", "true"]) {
      const out = buildWith(
        svgWith(`<g data-custom-device-persisted-terminals=${value}><line id="${LINE_ID_MARK}"/></g><rect id="${MARK}"/>`)
      );
      expect(out, value).not.toContain("data-custom-device-persisted-terminals");
    }
  });

  test("**已知局限（如实记录，当前不可达）**：组内嵌套 <g> 时只剥到第一个 </g>", () => {
    // 非贪婪 <g ...>[\s\S]*?</g> 会在内层 </g> 处停下：
    // 内层之后的内容（TG2）残留，且多出一个孤立 </g>。
    // 不可达的原因是上面那条「引线是叶子元素」的契约 —— 若那条变了，本用例会先转红。
    const out = buildWith(svgWith(
      `<g data-custom-device-persisted-terminals="true"><g><line id="TG1"/></g><line id="TG2"/></g><rect id="${MARK}"/>`
    ));
    // TG1 在被剥掉的范围内
    expect(out).not.toContain("TG1");
    // TG2 在第一个 </g> 之后 → 残留（局限）
    expect(out).toContain("TG2");
    // 图元本体未受影响
    expect(out).toContain(MARK);
  });
});

describe("重新编码规则（剥与不剥都影响 href 形态）", () => {
  test("裸 <svg 形式：剥离后仍是裸 SVG（不包 data URI）", () => {
    const out = buildWith(svgWith(
      `<g data-custom-device-persisted-terminals="true"><line/></g><rect id="${MARK}"/>`
    ));
    expect(out).toContain(MARK);
  });

  test("data URI 形式：剥离后仍以 data URI 内嵌，且已百分号编码（无明文）", () => {
    const inner = svgWith(
      `<g data-custom-device-persisted-terminals="true"><line id="${LINE_ID_MARK}"/></g><rect id="${MARK}"/>`
    );
    const out = buildWith(`data:image/svg+xml,${encodeURIComponent(inner)}`);
    // 已编码 → 明文不出现
    expect(out).not.toContain(LINE_ID_MARK);
    // 但图元本体经解码后仍在（output 里能看到编码后的片段）
    expect(out).toContain("MARK");
  });
});

describe("node.id 的 kind 清洗（ID 注入面）", () => {
  const idSuffix = (kind: string) =>
    buildDeviceTemplateIconSvg(imageTemplate({ kind })).match(/component-svg-([A-Za-z0-9_-]*)/)?.[1];

  test("常规 kind 原样保留", () => {
    expect(idSuffix("ac-load")).toBe("ac-load");
  });

  test("非字母数字字符统一替换为下划线（**无法注入路径或标记**）", () => {
    expect(idSuffix("../../etc/passwd")).toBe("_etc_passwd");
    expect(idSuffix("a b c")).toBe("a_b_c");
    expect(idSuffix("a<script>")).toBe("a_script_");
    // 连续的非允许字符折叠成一个下划线
    expect(idSuffix("中文")).toBe("_");
  });

  test("空 kind 回落字面量 component", () => {
    expect(idSuffix("")).toBe("component");
  });
});

describe("尺寸与端子数", () => {
  // 尺寸写在 viewBox 里（探针实测：根标签的 width/height 是 "100%"）
  const dims = (size: { width: unknown; height: unknown }) => {
    const vb = buildDeviceTemplateIconSvg(imageTemplate({ size: size as never }))
      .match(/<svg[^>]*\bviewBox="[\d.,]*?(-?\d+),(-?\d+)"/);
    return vb ? { w: Number(vb[1]), h: Number(vb[2]) } : null;
  };

  test("正常尺寸：模板尺寸 + 两侧各 36 padding", () => {
    // padding=36：(100+72) x (60+72)
    expect(dims({ width: 100, height: 60 })).toEqual({ w: 172, h: 132 });
  });

  test("小数尺寸向上取整（1.4→2、2.6→3，各自加 padding 后再 ceil）", () => {
    // Math.max(1, 1.4)=1.4 → Math.ceil(1.4+72)=Math.ceil(73.4)=74
    expect(dims({ width: 1.4, height: 2.6 })).toEqual({ w: 74, h: 75 });
  });

  test("**负数不触发 104 兜底**，只被 Math.max(1, ...) 抬到 1px", () => {
    // 关键区别：`-10` 是真值，`Number(-10) || 104` 取 -10，再被 Math.max(1,·) 抬成 1。
    // 只有 0 / null / NaN / "" 这类假值才会走 104 兜底。探针实测确认。
    expect(dims({ width: -10, height: -10 })).toEqual({ w: 1 + 72, h: 1 + 72 });
  });

  test("假值尺寸（0 / null / undefined）回落到 104x64 兜底", () => {
    for (const size of [{ width: 0, height: 0 }, { width: null, height: undefined }]) {
      expect(dims(size), JSON.stringify(size)).toEqual({ w: 104 + 72, h: 64 + 72 });
    }
  });

  test("data-export-source-terminal-count 注入到首个 <use>：取整且非负", () => {
    const count = (terminalCount: unknown) =>
      buildDeviceTemplateIconSvg(imageTemplate({ terminalCount: terminalCount as never }))
        .match(/data-export-source-terminal-count="(\d+)"/)?.[1];
    expect(count(0)).toBe("0");
    expect(count(1)).toBe("1");
    expect(count(3)).toBe("3");
    expect(count(-5)).toBe("0"); // 负数钳到 0
    expect(count(2.7)).toBe("2"); // 向下取整
    expect(count(undefined)).toBe("0");
  });
});

describe("图元正文的固定约定", () => {
  test("标签**不参与渲染** —— 导出的是图元本体而非某次实例", () => {
    // `_labelVisible` 是 createNodeFromTemplate 塞进 params 的内部开关（默认 "1"），
    // 不会渲染成 SVG 属性，故断言其**可观察效果**：
    // 换掉模板名后输出应完全一致 —— 证明设备标签确实没进正文。
    // 注意：**不能**断言两次调用输出完全相同 —— 拓扑节点号（node-1/node-2 来自全局
    // 计数器 nextGlobalProjectIndex）每次调用都会递增，输出天然带非确定性。
    const a = buildDeviceTemplateIconSvg(imageTemplate({ name: "名称甲" } as never));
    const b = buildDeviceTemplateIconSvg(imageTemplate({ name: "名称乙" } as never));
    expect(a).not.toContain("名称甲");
    expect(b).not.toContain("名称乙");
    expect(a).not.toContain("<text");
    expect(b).not.toContain("<text");
  });

  test("背景是覆盖整幅的透明 rect（不是 CSS 背景）", () => {
    expect(buildDeviceTemplateIconSvg(imageTemplate())).toContain('<rect width="100%" height="100%" fill="transparent"/>');
  });
});
