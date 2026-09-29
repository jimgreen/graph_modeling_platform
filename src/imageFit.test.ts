// imageFit.ts 的直接单测（整个 37 行模块**零测试**）。
//
// ## 它决定什么
//
// `imageFitPreserveAspectRatio` 的返回值**原样写进 SVG 的
// `preserveAspectRatio` 属性**（如 `preserveAspectRatio="xMidYMid slice"`）。
// 该值决定图片在框内是裁切、留白还是变形 —— 写错就是图元显示变形，
// 且 SVG 解析器**不会报错**（值合法，只是语义不同）。
//
// `normalizeImageFitMode` 有 30 处生产调用（图片填充模式设置的读写两端）。
//
// ## 探针实测出的三处值得钉的事实
//
// ① **`fixed` 与 `tile` 产出完全相同的 `preserveAspectRatio`**
//    （都是 `xMidYMid meet`）—— 6 个模式只对应 **5 种**输出。
//    两者的区别在别处（平铺用 `<pattern>`，固定尺寸用单 `<image>`），
//    不在 preserveAspectRatio。容易被误以为是 bug。
//
// ② **大小写敏感，但因默认值恰是 `cover` 而在 cover 上完全看不出来**
//    —— `"COVER"` 与 `"cover"` 都返回 `cover`，因为非法值也回落 `cover`。
//    这是真实的测试盲区：想验证大小写敏感，必须用**非法值与合法值的差**
//    才有区分度（如 `"Fixed"` → `cover` vs `"fixed"` → `fixed`）。
//
// ③ **`case "cover"` 与 `default` 分支等价**
//    探针实测 `imageFitPreserveAspectRatio("cover")` 与
//    `imageFitPreserveAspectRatio("???")`（经 normalize 落 cover）都返回
//    `xMidYMid slice`。即删掉 `case "cover"` 行为不变。
//    显式写出 `case "cover"` 是**为了可读性**（读者能一眼看到 cover 的去向），
//    而非因为它承担了与 default 不同的逻辑。
import { describe, expect, test } from "vitest";
import {
  IMAGE_FIT_DEFAULT_MODE,
  IMAGE_FIT_MODE_OPTIONS,
  imageFitPreserveAspectRatio,
  normalizeImageFitMode,
  type ImageFitMode
} from "./imageFit";

/** 6 个模式的期望 preserveAspectRatio（探针实测值）。 */
const EXPECTED_PRESERVE_ASPECT_RATIO: Record<ImageFitMode, string> = {
  cover: "xMidYMid slice",
  fixed: "xMidYMid meet",
  "fill-x": "xMidYMin slice",
  "fill-y": "xMinYMid slice",
  stretch: "none",
  tile: "xMidYMid meet"
};

describe("imageFitPreserveAspectRatio：6 个模式的完整映射", () => {
  for (const option of IMAGE_FIT_MODE_OPTIONS) {
    test(`${option.value.padEnd(8)}（${option.label}）→ "${EXPECTED_PRESERVE_ASPECT_RATIO[option.value]}"`, () => {
      expect(imageFitPreserveAspectRatio(option.value)).toBe(EXPECTED_PRESERVE_ASPECT_RATIO[option.value]);
    });
  }

  test("★ `fixed` 与 `tile` 产出**完全相同**的 preserveAspectRatio", () => {
    // 两者的区别在别处（平铺用 <pattern>，固定尺寸用单 <image>），
    // 不在 preserveAspectRatio。容易被误以为是 bug，故显式记录。
    expect(imageFitPreserveAspectRatio("fixed")).toBe("xMidYMid meet");
    expect(imageFitPreserveAspectRatio("tile")).toBe("xMidYMid meet");
    expect(imageFitPreserveAspectRatio("fixed")).toBe(imageFitPreserveAspectRatio("tile"));
  });

  test("6 个模式只对应 **5 种**输出（fixed/tile 合并）", () => {
    const outputs = new Set(IMAGE_FIT_MODE_OPTIONS.map((o) => imageFitPreserveAspectRatio(o.value)));
    expect(outputs.size, `实际输出种类：${[...outputs].join(" | ")}`).toBe(5);
  });

  test("全部返回值都是合法的 SVG preserveAspectRatio 语法", () => {
    // SVG 规范有两种形态：
    //   [defer] <align>              —— align 为 none 时不带 meet/slice（如 `none`）
    //   [defer] <align> <meetOrSlice> —— 其余情况必须带 meet 或 slice
    // 我第一版只写了后一种，把 `none` 判成非法（是断言写错，不是实现错）。
    const withKeyword = /^(none|x(Min|Mid|Max)Y(Min|Mid|Max)) (meet|slice)$/;
    const bareNone = /^none$/;
    for (const option of IMAGE_FIT_MODE_OPTIONS) {
      const out = imageFitPreserveAspectRatio(option.value);
      expect(out, `${option.value} → "${out}"`).toMatch(
        option.value === "stretch" ? bareNone : withKeyword
      );
    }
  });

  test("★ 只有 `stretch` 产出裸 `none`（其余都带 meet/slice）", () => {
    // SVG 规范：none 表示"不保留宽高比"，此时不能再带 meet/slice。
    // 带上会让解析器行为未定义。显式钉住这条规则。
    for (const option of IMAGE_FIT_MODE_OPTIONS) {
      const out = imageFitPreserveAspectRatio(option.value);
      const isBareNone = out === "none";
      expect(isBareNone, `${option.value} → "${out}"`).toBe(option.value === "stretch");
    }
  });

  test("★ 非法值落默认 cover，与显式 cover 同结果", () => {
    // 说明 `case "cover"` 与 `default` 分支等价 —— 显式写 cover 是为可读性，
    // 而非承担不同逻辑。日后删掉 `case "cover"` 不会改变行为（但会降低可读性）。
    for (const bad of ["???", "", "  ", "COVER", "unknown", "undefined", "null", "fill_x"]) {
      expect(imageFitPreserveAspectRatio(bad), JSON.stringify(bad)).toBe("xMidYMid slice");
    }
    expect(imageFitPreserveAspectRatio("cover")).toBe(imageFitPreserveAspectRatio("???"));
  });

  test("非字符串输入一律落 cover（String() 转换后不命中集合）", () => {
    for (const bad of [undefined, null, 0, 1, true, {}, [], ["cover"]] as never[]) {
      expect(imageFitPreserveAspectRatio(bad), String(JSON.stringify(bad))).toBe("xMidYMid slice");
    }
  });
});

describe("normalizeImageFitMode：集合成员判定 + 默认回落", () => {
  test("6 个合法值原样返回", () => {
    for (const option of IMAGE_FIT_MODE_OPTIONS) {
      expect(normalizeImageFitMode(option.value), option.value).toBe(option.value);
    }
  });

  test("首尾空白被 trim（String(value ?? 空串).trim()）", () => {
    expect(normalizeImageFitMode("  fixed  ")).toBe("fixed");
    expect(normalizeImageFitMode("\tfill-x\n")).toBe("fill-x");
    expect(normalizeImageFitMode(" cover ")).toBe("cover");
  });

  test("非法值一律落默认 cover", () => {
    for (const bad of ["", "  ", "COVER", "Cover", "fill_x", "fillx", "unknown", "undefined", "null"]) {
      expect(normalizeImageFitMode(bad), JSON.stringify(bad)).toBe(IMAGE_FIT_DEFAULT_MODE);
    }
  });

  test("★ 大小写敏感（**但要用非 cover 的值才看得出**）", () => {
    // 这是探针发现的测试盲区：`"COVER"` 与 `"cover"` 都返回 `cover`
    // （非法值回落默认恰是 cover），所以看不出区别。
    // 唯一有区分度的是「非法值 vs 合法值」且合法值不是 cover：
    expect(normalizeImageFitMode("Fixed"), "大写 F 的 fixed 落回默认").toBe("cover");
    expect(normalizeImageFitMode("fixed")).toBe("fixed");
    expect(normalizeImageFitMode("Fixed")).not.toBe(normalizeImageFitMode("fixed"));
    // cover 上确实看不出（如实记录）
    expect(normalizeImageFitMode("COVER")).toBe(normalizeImageFitMode("cover"));
  });

  test("全部大写变体都落 cover", () => {
    for (const upper of ["COVER", "FIXED", "FILL-X", "FILL-Y", "STRETCH", "TILE"]) {
      expect(normalizeImageFitMode(upper), upper).toBe("cover");
    }
  });

  test("非字符串输入落默认", () => {
    for (const bad of [undefined, null, 0, 1, true, {}, [], ["cover"]] as never[]) {
      expect(normalizeImageFitMode(bad), String(JSON.stringify(bad))).toBe("cover");
    }
  });

  test("★ 单元素数组经 String() 转换后**会穿透命中**（多元素才落默认）", () => {
    // 实测细节：String(["cover"]) === "cover" → 命中；String(["fixed"]) === "fixed" → 也命中！
    // 只有多元素数组（String 得 "cover,tile"）才落默认。
    // 我第一版把 ["fixed"] 的期望写成 cover，被测试当场抓出。
    expect(normalizeImageFitMode(["cover"] as never)).toBe("cover");
    expect(normalizeImageFitMode(["fixed"] as never), "单元素 fixed 数组确实命中 fixed").toBe("fixed");
    expect(normalizeImageFitMode(["stretch"] as never)).toBe("stretch");
    // 多元素 → String() 得 "cover,tile"，不在集合里 → 落默认
    expect(normalizeImageFitMode(["cover", "tile"] as never)).toBe(IMAGE_FIT_DEFAULT_MODE);
    // 空数组 → String([]) === "" → 落默认
    expect(normalizeImageFitMode([] as never)).toBe(IMAGE_FIT_DEFAULT_MODE);
  });
});

describe("模块常量自洽性", () => {
  test("6 个选项，值与标签都唯一且非空", () => {
    expect(IMAGE_FIT_MODE_OPTIONS.length).toBe(6);
    expect(new Set(IMAGE_FIT_MODE_OPTIONS.map((o) => o.value)).size).toBe(6);
    expect(new Set(IMAGE_FIT_MODE_OPTIONS.map((o) => o.label)).size).toBe(6);
    for (const option of IMAGE_FIT_MODE_OPTIONS) {
      expect(option.value.trim(), option.label).not.toBe("");
      expect(option.label.trim(), option.value).not.toBe("");
    }
  });

  test("默认值 `cover` 必须在选项里（否则 UI 下拉框选不中）", () => {
    expect(IMAGE_FIT_MODE_OPTIONS.map((o) => o.value)).toContain(IMAGE_FIT_DEFAULT_MODE);
  });

  test("★ 期望表覆盖全部选项（新增模式时必须补表，否则此测试转红）", () => {
    const optionValues = IMAGE_FIT_MODE_OPTIONS.map((o) => o.value).sort();
    const tableKeys = Object.keys(EXPECTED_PRESERVE_ASPECT_RATIO).sort();
    expect(tableKeys, "期望表与 IMAGE_FIT_MODE_OPTIONS 不一致").toEqual(optionValues);
  });

  test("6 个中文标签逐条核对（UI 文案契约）", () => {
    // 标签直接显示在下拉框里，改动会被用户看见。
    const labels = IMAGE_FIT_MODE_OPTIONS.map((o) => `${o.value}=${o.label}`);
    expect(labels).toEqual([
      "cover=填满裁切",
      "fixed=固定尺寸",
      "fill-x=X填充",
      "fill-y=Y填充",
      "stretch=变形拉伸",
      "tile=平铺"
    ]);
  });
});
