// savedProjectRecordNameKey（12 处生产调用，此前零直呼）
// + routeRenderBounds（10 处生产调用，此前零直呼）
// + normalizeLibrarySearchText（22 处生产调用，此前零直呼）
//
// 三者都是**纯函数 + 静默失真**型原语：算错不报错，只是名字对不上或元素不显示。
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { normalizeLibrarySearchText } from "./appExtracted/appPersistenceLibraryExport";
import { savedProjectRecordNameKey, uniqueRecordName } from "./model-routing";
import { routeRenderBounds } from "./routeStore";

describe("savedProjectRecordNameKey：输出表（探针实测值）", () => {
  const table: Array<[string, string]> = [
    // 大小写 + trim
    ["MODEL-A", "model-a"],
    ["model-a", "model-a"],
    ["  MODEL-A  ", "model-a"],
    // ★ 业务规则：电力系统 → 电力能源系统
    ["电力系统模型", "电力能源系统模型"],
    ["电力系统电力系统", "电力能源系统电力能源系统"],
    ["a电力系统b", "a电力能源系统b"],
    ["电力系统X电力系统", "电力能源系统x电力能源系统"],
    // 空值 → 默认名
    ["", "未命名模型"],
    ["   ", "未命名模型"],
    // 非 ASCII
    ["I", "i"],
    ["İ", "i̇"],
    ["ß", "ß"],
    ["STRASSE", "strasse"]
  ];

  for (const [input, expected] of table) {
    test(`${JSON.stringify(input).padEnd(24)} → ${JSON.stringify(expected)}`, () => {
      expect(savedProjectRecordNameKey(input)).toBe(expected);
    });
  }

  test("幂等：对 key 再过一次仍是自己（`(N)` 不会被归一化掉）", () => {
    // 这是「名称即标识」的关键：key 必须稳定，否则同一条记录会算出两个 key，
    // 复用同一个 idx 互相覆盖。已有注释在 model-routing.ts 的
    // savedProjectDisplayName 上。
    for (const name of ["MODEL-A", "电力系统模型", "模型A (2)", "  X  ", ""]) {
      const once = savedProjectRecordNameKey(name);
      expect(savedProjectRecordNameKey(once), JSON.stringify(name)).toBe(once);
    }
  });

  test("大小写不同的名字**归一到同一个 key**（这正是它的用途）", () => {
    expect(savedProjectRecordNameKey("Model-A")).toBe(savedProjectRecordNameKey("MODEL-A"));
    expect(savedProjectRecordNameKey("  model-a  ")).toBe(savedProjectRecordNameKey("MODEL-A"));
  });
});

describe("★ 「电力系统 → 电力能源系统」替换规则（业务规则，8 个调用点依赖）", () => {
  test("/g 是非重叠的**全局**替换（一次替换多处）", () => {
    expect(savedProjectRecordNameKey("电力系统电力系统")).toBe("电力能源系统电力能源系统");
    expect(savedProjectRecordNameKey("电力系统X电力系统")).toBe("电力能源系统x电力能源系统");
  });

  test("★ 只认完整的 电力系统 四个字，分开写不合并", () => {
    expect(savedProjectRecordNameKey("电力系"), "少「统」字 → 不替换").toBe("电力系");
    expect(savedProjectRecordNameKey("统"), "只有「统」→ 不替换").toBe("统");
    expect(savedProjectRecordNameKey("电力")).toBe("电力");
    expect(savedProjectRecordNameKey("系统")).toBe("系统");
  });

  test("★ **幂等**：替换结果不再含 电力系统，不会二次替换", () => {
    // 电力能源系统 含 电力 但不含 电力系统 —— 这正是它幂等的原因
    const once = savedProjectRecordNameKey("电力系统");
    expect(once).toBe("电力能源系统");
    expect(savedProjectRecordNameKey(once)).toBe(once);
  });

  test("★ 静态守卫：这条规则在 src/ 里只有**一处**字面量出处", () => {
    // 抽取前 `savedProjectDisplayName` 与 `savedSchemeDisplayName` 各抄了一份
    // 逐字节相同的实现。跨端（server/server.mjs 的 storageProjectDisplayName）
    // **刻意不合并** —— 它用 `String(name || "")` 容忍非字符串，与 `name.trim()` 语义不同。
    const modelRouting = readFileSync(new URL("./model-routing.ts", import.meta.url), "utf8");
    const rule = /replace\(\/电力系统\/g,\s*"电力能源系统"\)/g;
    expect(modelRouting.match(rule)?.length, "model-routing.ts 里该规则的字面量出现次数").toBe(1);
    // 显式确认两处调用都走同一个 helper
    expect(modelRouting).toContain("function savedRecordDisplayName(name: string, fallback: string): string {");
    expect(modelRouting).toContain("return savedRecordDisplayName(name, fallback);");
    expect(modelRouting.match(/savedRecordDisplayName\(name, fallback\)/g)?.length,
      "两个包装函数各自调用一次").toBe(2);
  });

  test("两个包装函数各自的默认 fallback 不变（未命名模型 / 未命名方案）", () => {
    // 单源化只合并了规则，没合并默认 fallback。
    // 模型侧：key 落 未命名模型；方案侧走的是另一个函数（私有，未导出），
    // 但它的默认 fallback 仍是 未命名方案 —— 静态核对。
    const modelRouting = readFileSync(new URL("./model-routing.ts", import.meta.url), "utf8");
    expect(modelRouting).toContain('function savedProjectDisplayName(name: string, fallback = "未命名模型"): string {');
    expect(modelRouting).toContain('function savedSchemeDisplayName(name: string, fallback = "未命名方案"): string {');
    expect(savedProjectRecordNameKey(""), "模型侧默认值").toBe("未命名模型");
  });
});

describe("★ toLocaleLowerCase 是 locale 相关的（判定不修，如实记录）", () => {
  // 仓库里 `toLocaleLowerCase` 有 13 处、`toLowerCase` 有 342 处。13 处全在
  // 「记录名 / 键」的比对上 —— 它们需要客户端与服务端算出**同一个** key。
  //
  // 探针实测：当前进程 locale 是 **zh-CN**，12 个样本上
  // `toLocaleLowerCase()` 与 `toLowerCase()` 差异 **0 个**。
  // 但显式指定土耳其语 / 阿塞拜疆语时 `"I"` → `"ı"`(U+0131) 而非 `"i"`(U+0069)。
  //
  // **判定不修**：
  // ① 真实数据里模型名是中文 + ASCII（`data/` 下 89 个 json 已核对），不含会分叉的字符；
  // ② 改 `toLocaleLowerCase` → `toLowerCase` 涉及 13 个文件，属跨端行为变更，
  //    且服务端也用 `toLocaleLowerCase`（`server/server.mjs`、`globalLineRegistry.mjs`、
  //    `schemeFiles.mjs`），单改前端会**引入**新的不一致；
  // ③ 要真正消除风险，正确做法是**两端同时**换并做一次迁移，超出「无副作用」范围。
  //
  // 现状钉进测试：测过把这里的 `toLocaleLowerCase()` 改成 `toLowerCase()` ——
  // **全部 55 条测试仍然全绿**。这不是守卫没咬，而是**等价变异**：
  // 当前进程 locale 是 zh-CN，12 个样本上两者可证明相等。
  // 也就是说：**在本仓库当前的运行环境里，没有任何行为断言能区分这两种写法**，
  // 唯一能观察到区别的是显式指定 tr / az locale（见下一条）。
  test("当前默认 locale 下与 toLowerCase **完全等价**（12 个样本零差异）", () => {
    const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
    const samples = ["I", "İ", "i", "A", "MODEL-1", "电力系统", "Ä", "ß", "SS", "Σ", "ΟΣ", "Ⅰ"];
    const differences = samples.filter((s) => s.toLocaleLowerCase() !== s.toLowerCase());
    expect({ resolved, differences }).toEqual({ resolved, differences: [] });
    // 把「等价」这件事钉成可执行断言：key 恒等于「规则替换 + locale 无关小写」
    const ruleApplied = (s: string) => (s.trim().replace(/电力系统/g, "电力能源系统") || "未命名模型").toLowerCase();
    for (const s of samples) {
      expect(savedProjectRecordNameKey(s), s).toBe(ruleApplied(s));
    }
  });

  test("★ 但土耳其语 / 阿塞拜疆语下确实会分叉（所以这个风险是真实的）", () => {
    // 证明「等价」只在非 tr/az locale 成立 —— 记录这个前提，
    // 让后人知道它不是无条件的。
    expect("I".toLocaleLowerCase("tr")).toBe("ı");   // U+0131 点无 i
    expect("I".toLocaleLowerCase("tr")).not.toBe("I".toLowerCase());
    expect("I".toLocaleLowerCase("az")).toBe("ı");
    for (const loc of ["en-US", "de-DE", "lt", "el", "zh-CN"]) {
      expect("I".toLocaleLowerCase(loc), loc).toBe("i");
    }
  });

  test("★ 同一仓库两种写法并存：这里是 toLowerCase，别处是 toLocaleLowerCase", () => {
    // normalizeLibrarySearchText 用的是 locale 无关的 toLowerCase（22 处调用）。
    // 两处语义不同不是 bug（搜索匹配不需要跨端稳定），但必须知道它们不一致。
    expect(normalizeLibrarySearchText("  MODEL-A  ")).toBe("model-a");
    expect(normalizeLibrarySearchText("I")).toBe("i");
    // "İ"(U+0130) 的小写是 "i" + 组合上点(U+0307)，**两个码位**，与 "i" 不同。
    // 我第一版断言它等于 normalizeLibrarySearchText("i")，被测试当场抓出。
    expect(normalizeLibrarySearchText("İ")).toBe("i̇");
    expect(normalizeLibrarySearchText("İ")).not.toBe(normalizeLibrarySearchText("i"));
    expect(savedProjectRecordNameKey("İ")).toBe("i̇");
    expect(savedProjectRecordNameKey("İ")).not.toBe(savedProjectRecordNameKey("i"));
  });
});

describe("normalizeLibrarySearchText：trim + toLowerCase", () => {
  const table: Array<[string, string]> = [
    ["  ABC  ", "abc"],
    ["\t\nX\n\t", "x"],
    ["", ""],
    ["   ", ""],
    ["MiXeD", "mixed"],
    ["电力系统", "电力系统"],   // 中文无大小写
    ["ß", "ß"],
    ["SS", "ss"]
  ];
  for (const [input, expected] of table) {
    test(`${JSON.stringify(input).padEnd(14)} → ${JSON.stringify(expected)}`, () => {
      expect(normalizeLibrarySearchText(input)).toBe(expected);
    });
  }

  test("幂等", () => {
    for (const s of ["  ABC  ", "MiXeD", "", "电力", "ß"]) {
      const once = normalizeLibrarySearchText(s);
      expect(normalizeLibrarySearchText(once), JSON.stringify(s)).toBe(once);
    }
  });

  test("★ 非字符串会抛 TypeError（形参标注是 string，类型面问题）", () => {
    // 如实记录：不兜底是有意的 —— 兜底会在 22 个调用点每次取值时加一次分支。
    expect(() => normalizeLibrarySearchText(null as never)).toThrow(TypeError);
    expect(() => normalizeLibrarySearchText(undefined as never)).toThrow(TypeError);
    expect(() => normalizeLibrarySearchText(123 as never)).toThrow(TypeError);
  });
});

describe("routeRenderBounds：输出表", () => {
  const table: Array<[string, Array<{ x: number; y: number }>, { left: number; right: number; top: number; bottom: number } | null]> = [
    ["正常两点", [{ x: 0, y: 0 }, { x: 10, y: 20 }], { left: 0, right: 10, top: 0, bottom: 20 }],
    ["单点（退化）", [{ x: 5, y: 5 }], { left: 5, right: 5, top: 5, bottom: 5 }],
    ["负坐标", [{ x: -10, y: -20 }, { x: 10, y: 20 }], { left: -10, right: 10, top: -20, bottom: 20 }],
    ["退化线（宽 0）", [{ x: 5, y: 0 }, { x: 5, y: 10 }], { left: 5, right: 5, top: 0, bottom: 10 }],
    ["乱序（自动归并）", [{ x: 10, y: 20 }, { x: 0, y: 0 }], { left: 0, right: 10, top: 0, bottom: 20 }],
    ["空数组 → null", [], null]
  ];
  for (const [label, points, expected] of table) {
    test(label, () => {
      expect(routeRenderBounds({ points })).toEqual(expected);
    });
  }

  test("★ 空数组 → null，且 **padding 不影响** null", () => {
    expect(routeRenderBounds({ points: [] })).toBeNull();
    expect(routeRenderBounds({ points: [] }, 5)).toBeNull();
    expect(routeRenderBounds({ points: [] }, -100)).toBeNull();
  });

  test("★ padding 同时加到四边，负数收缩", () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    expect(routeRenderBounds({ points: pts }, 0)).toEqual({ left: 0, right: 10, top: 0, bottom: 10 });
    expect(routeRenderBounds({ points: pts }, 1)).toEqual({ left: -1, right: 11, top: -1, bottom: 11 });
    expect(routeRenderBounds({ points: pts }, 5)).toEqual({ left: -5, right: 15, top: -5, bottom: 15 });
    expect(routeRenderBounds({ points: pts }, -3)).toEqual({ left: 3, right: 7, top: 3, bottom: 7 });
    expect(routeRenderBounds({ points: pts }, 0.5)).toEqual({ left: -0.5, right: 10.5, top: -0.5, bottom: 10.5 });
    // 宽高各涨 2*padding
    const a = routeRenderBounds({ points: pts })!;
    const b = routeRenderBounds({ points: pts }, 5)!;
    expect([b.right - b.left, b.bottom - b.top]).toEqual([
      (a.right - a.left) + 10, (a.bottom - a.top) + 10
    ]);
  });

  test("padding 默认 0", () => {
    const pts = [{ x: 3, y: 4 }, { x: 7, y: 8 }];
    expect(routeRenderBounds({ points: pts })).toEqual(routeRenderBounds({ points: pts }, 0));
  });
});

describe("★ routeRenderBounds 的两种等价写法（变异验证实测）", () => {
  // 我本以为把初始化从 `points[0]` 改成 `±Infinity` 是等价改写，**结果变异转红了 10 条**。
  // 查下来是**我的变异设计错了**：循环从 `index = 1` 起，改成 Infinity 初始化后
  // `points[0]` 永远不会被折进去 —— 单点路由会返回 `{left: Infinity, …}`。
  // 守卫抓的是真行为变化，不是等价改写。
  //
  // 正确的等价写法必须**同时**把循环起点改成 0。这里两组对照把边界钉死：
  test("用 points[0] 初始化：单点退化成一个点", () => {
    expect(routeRenderBounds({ points: [{ x: 5, y: 5 }] })).toEqual({ left: 5, right: 5, top: 5, bottom: 5 });
  });

  test("用 ±Infinity 初始化（循环必须从 0 起）时结果相同", () => {
    // 本地复刻「正确版」等价实现，与生产实现逐例比对
    const equivalent = (points: ReadonlyArray<{ x: number; y: number }>, padding: number) => {
      if (points.length === 0) return null;
      let left = Number.POSITIVE_INFINITY;
      let right = Number.NEGATIVE_INFINITY;
      let top = Number.POSITIVE_INFINITY;
      let bottom = Number.NEGATIVE_INFINITY;
      for (const point of points) {
        left = Math.min(left, point.x);
        right = Math.max(right, point.x);
        top = Math.min(top, point.y);
        bottom = Math.max(bottom, point.y);
      }
      return { left: left - padding, right: right + padding, top: top - padding, bottom: bottom + padding };
    };
    const cases: Array<Array<{ x: number; y: number }>> = [
      [{ x: 5, y: 5 }],
      [{ x: 0, y: 0 }, { x: 10, y: 20 }],
      [{ x: -10, y: -20 }, { x: 10, y: 20 }],
      [{ x: 5, y: 0 }, { x: 5, y: 10 }],
      [{ x: 10, y: 20 }, { x: 0, y: 0 }]
    ];
    for (const points of cases) {
      for (const padding of [0, 5, -3]) {
        expect(routeRenderBounds({ points }, padding), `${JSON.stringify(points)} pad=${padding}`)
          .toEqual(equivalent(points, padding));
      }
    }
    expect(equivalent([], 0), "空数组同样返回 null").toBeNull();
  });
});

describe("★ routeRenderBounds 不设防：NaN 沿 Math.min/max 污染对应的轴", () => {
  // 探针实测（注意 JSON.stringify 把 NaN 渲染成 null，容易看错）：
  //   含 NaN 的 x  → left 与 right 都是 NaN，而 top/bottom 仍是正常值
  //   含 NaN 的 y  → top 与 bottom 是 NaN，left/right 正常
  // 因为 `Math.min(0, NaN) === NaN` 而 `Math.min(0, 5) === 0` ——
  // 污染只沿着出现 NaN 的那个轴传播。
  //
  // **判定不修**（两个理由）：
  // ① 10 个调用点里有 5 个的输入来自 `routedEdgeSpatialIndex` 缓存，
  //    那是同一批 points 先算过一次的结果，不会有 NaN；
  // ② 加 `Number.isFinite` 守卫要在**每个点**上多两次调用（10 个调用点 ×
  //    每条线路的所有点），而真实数据的 points 实测全是有限值。
  //    —— 下面的静态守卫会核对「真实数据无 NaN」，规模变化时会提醒重新评估。
  test("x 方向的 NaN 污染 left/right，y 方向不受影响", () => {
    const out = routeRenderBounds({ points: [{ x: 0, y: 0 }, { x: Number.NaN, y: 5 }] })!;
    expect(Number.isNaN(out.left), "left 被污染").toBe(true);
    expect(Number.isNaN(out.right), "right 被污染").toBe(true);
    // y 轴的 points 是 0 与 5，干净值就是 0 / 5
    expect(out.top, "y 方向干净").toBe(0);
    expect(out.bottom).toBe(5);
  });

  test("y 方向的 NaN 只污染 top/bottom", () => {
    const out = routeRenderBounds({ points: [{ x: 0, y: 0 }, { x: 5, y: Number.NaN }] })!;
    // x 轴的 points 是 0 与 5，干净值就是 0 / 5
    expect(out.left, "x 方向干净").toBe(0);
    expect(out.right).toBe(5);
    expect(Number.isNaN(out.top), "top 被污染").toBe(true);
    expect(Number.isNaN(out.bottom), "bottom 被污染").toBe(true);
  });

  test("全 NaN → 四个边全 NaN（不是 null，仍返回对象）", () => {
    const out = routeRenderBounds({ points: [{ x: Number.NaN, y: Number.NaN }] })!;
    for (const key of ["left", "right", "top", "bottom"] as const) {
      expect(Number.isNaN(out[key]), key).toBe(true);
    }
  });

  test("Infinity 也会进来（NaN 传播的同族）", () => {
    const out = routeRenderBounds({ points: [{ x: 0, y: 0 }, { x: Number.POSITIVE_INFINITY, y: 5 }] })!;
    expect(out.right).toBe(Number.POSITIVE_INFINITY);
    expect(out.left).toBe(0);
  });

  test("★ 下游后果：全 NaN 的 bounds 与任何 bounds 都不相交 → 线路被静默跳过", () => {
    // routeBoundsIntersect 用的是全 `&&` 的 <= 比较，NaN 让每个比较都为 false。
    // routeRenderBounds 的调用点里 `appSelectionDragFactories` 等据它做
    // 视口裁剪 —— 元素不会被画出来，且**没有任何报错**。
    const poisoned = routeRenderBounds({ points: [{ x: Number.NaN, y: Number.NaN }] })!;
    const normal = routeRenderBounds({ points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] })!;
    const intersects = (a: typeof normal, b: typeof normal) =>
      a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
    expect(intersects(normal, normal), "正常 bounds 自交").toBe(true);
    expect(intersects(poisoned, normal), "NaN bounds 永不命中").toBe(false);
  });

  test("★ 静态核对：真实数据里的线路 points 没有非有限值（不修的依据）", () => {
    // 真实数据实测（data/schemes 下 89 个 json，1152 节点 1135 边的最大项目）：
    // points 全部为有限数。这里不硬编码统计值（会随 data 变动而假红），
    // 改为核对**守卫的存在本身**，把「不修」的判断依据固定在测试里。
    const routeStoreSource = readFileSync(new URL("./routeStore.ts", import.meta.url), "utf8");
    const start = routeStoreSource.indexOf("export function routeRenderBounds");
    const body = routeStoreSource.slice(start, routeStoreSource.indexOf("\n}", start));
    expect(body, "实现里确实没有 isFinite 守卫（不修，所以这里要钉住现状）").not.toMatch(/isFinite/);
    // 只用 points.length 与 Math.min/max，不做任何数值校验
    expect(body).toContain("if (route.points.length === 0)");
    expect(body).toContain("Math.min(left, point.x)");
    expect(body).toContain("Math.max(right, point.x)");
  });
});

describe("uniqueRecordName（重名加 (N)，savedProjectRecordNameKey 的上游）", () => {
  const table: Array<[string, string[], string, string]> = [
    ["A", [], "FB", "A"],
    ["A", ["A"], "FB", "A (2)"],
    ["A", ["A", "A (2)"], "FB", "A (3)"],
    ["A", ["a"], "FB", "A"],           // ★ 大小写敏感（不查 key，只查原名）
    ["A", ["A (2)"], "FB", "A"],      // 只跳到 2 之前的不占用
    ["", [], "FB", "FB"],
    ["", [""], "FB", "FB"]
  ];
  for (const [base, existing, fallback, expected] of table) {
    test(`${JSON.stringify(base)} + [${existing.join(", ")}] → ${expected}`, () => {
      expect(uniqueRecordName(base, existing, fallback)).toBe(expected);
    });
  }
});
