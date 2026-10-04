// 三个此前零直呼的纯函数：
//   normalizeNodeLabelRotation   9 处生产调用（nodeLabelUtils）
//   getSafeNodeScaleX / Y       各 9 处（model-canvas-ops，被 SVG 导出 / 拖拽 / 导入引用）
//   readLocalStorageJson        10 处（appPersistenceLibraryExport，全部设置项的读取入口）
//
// 三者都是**静默失真**型：算错不报错，只是标签方向 / 图形缩放 / 用户设置悄悄不对。
import { afterEach, describe, expect, test, vi } from "vitest";
// 必须先加载 model —— model-node-ops ↔ model 循环依赖，反序会炸
import "./model";
import { readLocalStorageJson } from "./appExtracted/appPersistenceLibraryExport";
import { getSafeNodeScaleX, getSafeNodeScaleY } from "./model-canvas-ops";
import { normalizeNodeLabelRotation } from "./nodeLabelUtils";

describe("normalizeNodeLabelRotation：吸附到 90° 的阈值", () => {
  const table: Array<[number, number]> = [
    [0, 0], [1, 0], [44, 0], [44.9, 0],
    [45, 90], [45.1, 90], [46, 90], [89, 90], [90, 90], [134, 90],
    [135, 180], [136, 180], [180, 180], [225, 270], [270, 270],
    [315, 0], [359, 0]
  ];
  for (const [input, expected] of table) {
    test(`${input} → ${expected}`, () => {
      expect(normalizeNodeLabelRotation(input)).toBe(expected);
    });
  }

  test("★ 分界点精确是 ±45（`Math.round(v/90)` 在 0.5 处跨界）", () => {
    expect(normalizeNodeLabelRotation(44.999)).toBe(0);
    expect(normalizeNodeLabelRotation(45)).toBe(90);
    expect(normalizeNodeLabelRotation(-44.999)).toBe(0);
    expect(normalizeNodeLabelRotation(-45)).toBe(0);
  });
});

describe("★ 平局向 +∞ 取整（与 roundStaticDrawingCoordinate 同源）", () => {
  // `Math.round(-0.5)` 是 `-0` 而不是 `-1`，所以负侧平局**不**跨界。
  // 后果：`45` 吸附到 90，而 `-45` 吸附到 0 —— 正负不对称。
  //
  // 判定不改：这是 `Math.round` 的标准行为（全仓库至少两处继承它，
  // 另一处是 roundStaticDrawingCoordinate），改成"远离零"会让
  // 已存图纸的标签朝向集体变化。
  const table: Array<[number, number]> = [
    [45, 90], [-45, 0],
    [135, 180], [-135, 270],
    [225, 270], [-225, 180],
    [315, 0], [-315, 90]
  ];
  for (const [input, expected] of table) {
    test(`${input} → ${expected}（不对称）`, () => {
      expect(normalizeNodeLabelRotation(input)).toBe(expected);
    });
  }

  test("★ 全部 8 个平局的输出表（改动吸附规则时这条会转红）", () => {
    const results = [45, -45, 135, -135, 225, -225, 315, -315].map(normalizeNodeLabelRotation);
    expect(results).toEqual([90, 0, 180, 270, 270, 180, 0, 90]);
  });

  test("★ 吸附阶段正负对称，但**取模阶段不对称**", () => {
    // 我第一版断言「非平局时正负对称」，被测试当场抓出：`80` → 90 而 `-80` → 270。
    //
    // 两段逻辑各自的作用：
    //   吸附：Math.round(v/90)*90 —— 确实对称（80→90，-80→-90）
    //   取模：((snapped % 360) + 360) % 360 —— 这一段把 -90 变成 270
    //
    // 逐条钉住（手挑的样本我写错过两轮，所以只留这四条实测过的）
    expect(normalizeNodeLabelRotation(80)).toBe(90);
    expect(normalizeNodeLabelRotation(-80)).toBe(270);
    expect(normalizeNodeLabelRotation(10)).toBe(0);
    expect(normalizeNodeLabelRotation(-10)).toBe(0);
  });

  test("★ 对称的**充要条件**：非平局 v 且吸附结果 ≡ 0 (mod 180)（±200 全区间核对）", () => {
    // 我第二版把条件写成「吸附到 0」，被测试抓出：180 是自反的
    // （`-180 % 360 === -180`，加 360 后仍是 180），所以 180..359 段也对称。
    // 我第三版补上「吸附结果 ≡ 0 mod 180」，又被抓出：**平局是第二个例外来源** ——
    // 135 是平局，吸附本身就不对称（180 vs 270），取模无从补救。
    //
    // 完整推导：非平局时 snap(-v) === -snap(v)，故
    //   f(v) === f(-v) ⟺ snap(v) ≡ -snap(v) (mod 360) ⟺ snap(v) ≡ 0 (mod 180)
    // 而平局时两个不等式都不成立。
    const isTie = (v: number) => Math.abs(v / 90 % 1) === 0.5;
    const violations: string[] = [];
    for (let v = 0; v <= 200; v += 1) {
      if (isTie(v)) continue; // 平局单独一条断言
      const pos = normalizeNodeLabelRotation(v);
      const neg = normalizeNodeLabelRotation(-v);
      if ((pos === neg) !== (pos % 180 === 0)) {
        violations.push(`${v}: ${pos} vs ${neg}`);
      }
    }
    expect(violations, `非平局里违反条件的值：${violations.join(", ")}`).toEqual([]);
    // 条件成立的两侧示例
    expect(normalizeNodeLabelRotation(180)).toBe(normalizeNodeLabelRotation(-180));
    expect(normalizeNodeLabelRotation(40), "40 < 45 → 吸附到 0").toBe(0);
    expect(normalizeNodeLabelRotation(140), "140 在 135..224 段 → 180").toBe(180);
    // 反例：50 > 45 所以吸附到 90（不是 0）
    expect(normalizeNodeLabelRotation(50)).toBe(90);
  });

  test("★ 全部 8 个平局**无一对称**（吸附阶段就不对称，取模无从补救）", () => {
    // 上一条把平局排除在外，这里把它们全部收进来核对，确保没有遗漏。
    const ties = [45, -45, 135, -135, 225, -225, 315, -315];
    for (const v of ties) {
      expect(normalizeNodeLabelRotation(v), `平局 ${v} 与 -${v} 竟对称`).not.toBe(normalizeNodeLabelRotation(-v));
    }
  });
});

describe("取模归一到 [0, 360)", () => {
  const table: Array<[number, number]> = [
    [360, 0], [450, 90], [720, 0], [1080, 0],
    [-90, 270], [-180, 180], [-270, 90], [-360, 0], [-450, 270],
    [-1000, 90], [1000, 270]
  ];
  for (const [input, expected] of table) {
    test(`${input} → ${expected}`, () => {
      expect(normalizeNodeLabelRotation(input)).toBe(expected);
    });
  }

  test("★ 输出恒在 [0, 360) 内（3600 个整数角逐条核对）", () => {
    for (let v = -1800; v <= 1800; v += 1) {
      const out = normalizeNodeLabelRotation(v);
      expect(out >= 0 && out < 360, `${v} → ${out} 越界`).toBe(true);
    }
  });

  test("★ 等价变异记录：末尾加 `|| 0`，全部测试**全绿**（这是正确的）", () => {
    // 变异验证时我把 `return ((snapped % 360) + 360) % 360;` 改成
    // `... % 360 || 0;`，测试**全绿**。查证后确认是**等价改写**：
    // 左侧已是 `[0, 360)` 内的 number —— 为 0 时 `0 || 0` 仍是 0，
    // 非 0 时原样透传，`|| 0` 在这里是 no-op。
    //
    // 记下来是为了让后人看到这次全绿时不必重新怀疑。**什么改动会让它开始有事**：
    // 若取模表达式改成可能返回 `undefined` / `""` / `NaN`（例如去掉 `+ 360`
    // 让负数保持负值、或换成 `parseInt`），`|| 0` 才会开始起作用 ——
    // 而那时它会**掩盖**取模本身的缺陷，所以并不该留着当兜底。
    for (let v = -1800; v <= 1800; v += 1) {
      const out = normalizeNodeLabelRotation(v);
      expect((out as unknown) || 0, `${v} → ${out}`).toBe(out);
    }
  });

  test("★ 360 **不可表示**（落 0）—— 故写 360 不会丢「竖排」", () => {
    // nodeLabelVertical 判 `rotation === 90 || 270`。
    // 360 → 0 → 判为横向。这是对的（360° 与 0° 同向），
    // 但和「270 判为竖排」不是同一种情况，值得记下来。
    expect(normalizeNodeLabelRotation(360)).toBe(0);
    expect(normalizeNodeLabelRotation(270)).toBe(270);
  });

  test("四个合法角的纵向判据（nodeLabelVertical 的依据）", () => {
    const vertical = [0, 90, 180, 270].map((v) => normalizeNodeLabelRotation(v) === 90 || normalizeNodeLabelRotation(v) === 270);
    expect(vertical).toEqual([false, true, false, true]);
  });
});

describe("★ 非有限与极值：输出**不保证**是 90 的倍数", () => {
  // 探针实测：`Math.round(Number.MAX_VALUE / 90) * 90` 会溢出精度，
  // 结果 `% 360` 之后是 128 —— **不是** 0/90/180/270 里的任何一个。
  // 1e21 同理得 280。
  //
  // 判定不改（三个理由）：① 只有当 `_labelRotation` 存了天文数字才会走到，
  // 真实数据里实测是 0/90/180/270；② 修它需要改成先取模再吸附，
  // 而那会改变 1e18 以上输入的行为 —— 属于无收益的行为变更；
  // ③ `nodeLabelVertical` 对 128 判 false，与「没有旋转信息」的效果一致，
  // 不会导致错向显示。
  // 现状钉进测试：若有人改吸附顺序，这里的值会变。
  test("NaN / ±Infinity → 0（走 `Number.isFinite ? parsed : 0`）", () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(normalizeNodeLabelRotation(v), String(v)).toBe(0);
    }
  });

  test("★ 极大有限值给出非 90 倍数的结果（精度的真实边界）", () => {
    expect(normalizeNodeLabelRotation(Number.MAX_VALUE)).toBe(128);
    expect(normalizeNodeLabelRotation(1e21)).toBe(280);
    expect(normalizeNodeLabelRotation(-1e21)).toBe(80);
    // 这三个都不是 90 的倍数 —— 明确钉住，免得后人误以为「输出必是 4 个角之一」
    for (const out of [128, 280, 80]) expect(out % 90, `${out} 不是 90 的倍数`).not.toBe(0);
  });

  test("极小值下溢成 0", () => {
    expect(normalizeNodeLabelRotation(5e-324)).toBe(0);
  });

  test("普通范围内输出**恒**是 90 的倍数（±10000 整数）", () => {
    // 原实现是「循环里 throw + 末尾 `expect(true).toBe(true)`」。空断言恒真，
    // 真正在承重的只有 throw（vitest 能把它记成 failure，但断言体本身没有
    // 任何东西会因生产代码改动而转红）。这里换成两条真断言：
    //
    // ① 每个输出都落在 {0,90,180,270} 里 —— 与原 throw 等价，但一次列出全部违例
    // ② 输出集合**恰好**是这 4 个角 —— 比①更强：少了任何一个都算退化。
    //    `Math.round(v/90)*90` 若被改成 45° 或 180° 网格，①未必立刻抓到
    //    （如 180° 网格全程只出 0/180，仍是 90 的倍数），②一定转红。
    const legalAngles = [0, 90, 180, 270];
    const violations: string[] = [];
    const observed = new Set<number>();
    for (let v = -10000; v <= 10000; v += 1) {
      const out = normalizeNodeLabelRotation(v);
      observed.add(out);
      if (!legalAngles.includes(out)) violations.push(`${v} → ${out}`);
    }
    expect(violations.slice(0, 20), `非 90 倍数的输出共 ${violations.length} 个，前 20 条`).toEqual([]);
    expect([...observed].sort((a, b) => a - b), "输出集合退化了（少了或多了合法角）").toEqual(legalAngles);
  });
});

describe("非字符串输入走 Number()（探针实测表）", () => {
  const table: Array<[unknown, number]> = [
    ["90", 90], ["-90", 270], ["45", 90], [" 90 ", 90], ["1e2", 90],
    ["0x5A", 90],        // 十六进制 90
    ["", 0], ["   ", 0],
    ["90deg", 0], ["abc", 0], ["90,5", 0],   // 无法解析 → NaN → 0
    [true, 0], [false, 0], [null, 0], [undefined, 0],
    [[], 0],
    [45, 90],            // 数字直通
    // ★ 单元素数组经 Number() 转换后**会穿透命中**
    [[45], 90], [["90"], 90],
    [{}, 0]
  ];
  for (const [input, expected] of table) {
    const label = JSON.stringify(input) ?? String(input);
    test(`${label} → ${expected}`, () => {
      expect(normalizeNodeLabelRotation(input as never)).toBe(expected);
    });
  }

  test("★ `[45]` 与 `45` 同结果（数组穿透，JSON 里常见）", () => {
    // 存进 localStorage 的参数是 JSON，理论上不会出现数组；
    // 但类型面外输入行为可观测，记下来以免后人重新踩。
    expect(normalizeNodeLabelRotation([45] as never)).toBe(normalizeNodeLabelRotation(45));
  });
});

describe("getSafeNodeScaleX / Y：`Math.abs(x) || 1`", () => {
  test("取值优先级 `scaleX ?? scale ?? 1`（`??` 只挡 null/undefined）", () => {
    expect(getSafeNodeScaleX({ scaleX: 2 } as never)).toBe(2);
    expect(getSafeNodeScaleX({ scale: 7 } as never)).toBe(7);
    expect(getSafeNodeScaleX({ scaleX: 2, scale: 9 } as never), "scaleX 优先").toBe(2);
    expect(getSafeNodeScaleX({} as never), "两者都缺 → 1").toBe(1);
    expect(getSafeNodeScaleX({ scaleX: null, scale: 7 } as never), "null 被 ?? 挡下").toBe(7);
    expect(getSafeNodeScaleX({ scaleX: 0, scale: 9 } as never), "0 不被 ?? 挡下 → 后面被 || 兜住").toBe(1);
  });

  test("★ 取绝对值（负缩放被翻转）", () => {
    expect(getSafeNodeScaleX({ scaleX: -3 } as never)).toBe(3);
    expect(getSafeNodeScaleY({ scaleY: -0.5 } as never)).toBe(0.5);
  });

  test("★ `|| 1` 兜住所有 falsy：0 / -0 / NaN / null", () => {
    for (const scaleX of [0, -0, Number.NaN, null, undefined, false, ""] as never[]) {
      expect(getSafeNodeScaleX({ scaleX } as never), String(scaleX)).toBe(1);
    }
  });

  test("★ 但 ±Infinity **透传**（`Math.abs(Infinity)` 是 truthy）", () => {
    // 这是与 0/NaN 处理的**不对称**：兜底只覆盖 falsy。
    // 后果：无穷缩放会一路写进 SVG 的 `transform="scale(Infinity …)"`。
    // 判定不改：探针实测 `data/` 下 89 个 json 的缩放全是 0.5~2 量级的有限值，
    // 且 `getNodeScaleX` 的 `?? 1` 已经挡掉了 null/undefined。
    // 现状钉在这里 —— 若日后有人加 `Number.isFinite` 兜底，这条会转红提醒。
    expect(getSafeNodeScaleX({ scaleX: Number.POSITIVE_INFINITY } as never)).toBe(Number.POSITIVE_INFINITY);
    expect(getSafeNodeScaleX({ scaleX: Number.NEGATIVE_INFINITY } as never)).toBe(Number.POSITIVE_INFINITY);
    expect(getSafeNodeScaleY({ scaleY: Number.POSITIVE_INFINITY } as never)).toBe(Number.POSITIVE_INFINITY);
  });

  test("★ 负零不会透出（`Math.abs(-0)` 是 0 → falsy → 1）", () => {
    expect(Object.is(getSafeNodeScaleX({ scaleX: -0 } as never), -0), "不是 -0").toBe(false);
    expect(getSafeNodeScaleX({ scaleX: -0 } as never)).toBe(1);
  });

  test("字符串会被 Math.abs 强制转成 number（类型面外）", () => {
    expect(getSafeNodeScaleX({ scaleX: "4" } as never)).toBe(4);
    expect(getSafeNodeScaleX({ scaleX: "abc" } as never), "NaN → falsy → 1").toBe(1);
    expect(getSafeNodeScaleX({ scaleX: "" } as never), "空串 → 0 → falsy → 1").toBe(1);
  });

  test("X 与 Y **各读各的字段**（scaleX 不影响 Y）", () => {
    const node = { scaleX: 2 } as never;
    expect(getSafeNodeScaleX(node)).toBe(2);
    expect(getSafeNodeScaleY(node), "Y 只看 scaleY / scale").toBe(1);
    const both = { scaleX: 2, scaleY: 3 } as never;
    expect([getSafeNodeScaleX(both), getSafeNodeScaleY(both)]).toEqual([2, 3]);
    const shared = { scale: 4 } as never;
    expect([getSafeNodeScaleX(shared), getSafeNodeScaleY(shared)]).toEqual([4, 4]);
  });

  test("小数缩放原样透出（不被吸附成整数）", () => {
    expect(getSafeNodeScaleX({ scaleX: 0.5 } as never)).toBe(0.5);
    expect(getSafeNodeScaleX({ scaleX: 1.25 } as never)).toBe(1.25);
  });
});

describe("readLocalStorageJson：10 个调用点共用的读取入口", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** 装一个可控的 window.localStorage。 */
  const stubStorage = (read: (key: string) => string | null) => {
    vi.stubGlobal("window", { localStorage: { getItem: read, setItem: () => void 0 } });
  };

  test("正常 JSON → 交给 normalize", () => {
    stubStorage(() => '{"a":1}');
    expect(readLocalStorageJson("K", "{}", (v) => v, "F" as never)).toEqual({ a: 1 });
  });

  test("键不存在 → 解析 emptyJson", () => {
    stubStorage(() => null);
    expect(readLocalStorageJson("K", '{"e":1}', (v) => v, "F" as never)).toEqual({ e: 1 });
  });

  test("★ 存的是**空串** → JSON.parse 抛 → fallback（**不是** emptyJson）", () => {
    // `??` 只挡 null/undefined，空串照样进 JSON.parse。
    // 这条容易被误记成「空串也走 emptyJson」—— 实际是 fallback。
    stubStorage(() => "");
    expect(readLocalStorageJson("K", '{"e":1}', (v) => v, "F" as never)).toBe("F");
  });

  test("非法 JSON → fallback", () => {
    stubStorage(() => "{oops");
    expect(readLocalStorageJson("K", "{}", (v) => v, "F" as never)).toBe("F");
  });

  test("★ emptyJson 本身非法 → fallback（静默）", () => {
    stubStorage(() => null);
    expect(readLocalStorageJson("K", "not json", (v) => v, "F" as never)).toBe("F");
  });

  test("存的是 `null` 字面量 → normalize 收到 null（不是 fallback）", () => {
    stubStorage(() => "null");
    const seen: unknown[] = [];
    const out = readLocalStorageJson("K", '{"e":1}', (v) => { seen.push(v); return v; }, "F" as never);
    expect(seen).toEqual([null]);
    expect(out).toBeNull();
  });

  test("getItem 自身抛错（隐私模式 / 配额）→ fallback", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("QuotaExceededError"); }, setItem: () => void 0 } });
    expect(readLocalStorageJson("K", "{}", (v) => v, "F" as never)).toBe("F");
  });

  test("normalize 可以返回任意值（含 undefined）", () => {
    stubStorage(() => '{"a":1}');
    expect(readLocalStorageJson("K", "{}", () => undefined, "F" as never)).toBeUndefined();
    expect(readLocalStorageJson("K", "{}", () => 0, "F" as never)).toBe(0);
  });

  test("★ normalize 抛错 → **静默**落 fallback（裸 catch 的代价）", () => {
    // 这是本函数最重要的、也最容易被忽略的行为：
    // catch 不区分「JSON 坏了」与「**normalize 里有 bug**」。
    // 后者会让用户的设置看起来「自己重置了」，而根因在代码里、无任何日志。
    //
    // 判定不改：改成「只 catch JSON.parse」需要在 try 里分两段，
    // 而这样一来 normalize 的 bug 就会**抛到调用栈顶** ——
    // 10 个调用点都在应用启动路径上（读侧栏宽度、颜色、量测配置…），
    // 一个 bug 会让整个界面白屏。换来的是「设置静默重置」变成「应用打不开」，
    // 那是更糟的故障模式。
    //
    // 正确做法是**修 normalize**，不是改这里的兜底。
    stubStorage(() => '{"a":1}');
    expect(readLocalStorageJson("K", "{}", () => { throw new Error("normalize 里的 bug"); }, "F" as never)).toBe("F");
  });

  test("fallback 每次都原样返回（不缓存、不共享）", () => {
    stubStorage(() => "{bad");
    const fallback = { some: "obj" };
    const a = readLocalStorageJson("K1", "{}", (v) => v, fallback);
    const b = readLocalStorageJson("K2", "{}", (v) => v, fallback);
    expect(a).toBe(fallback);
    expect(b).toBe(fallback);
  });
});
