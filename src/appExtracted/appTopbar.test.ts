import { describe, expect, test } from "vitest";

// ⚠ 导入顺序承重，勿删这一行。
// appTopbar → model-node-ops → model.ts ↔ model-node-ops 是一张**循环**依赖图：
// `INTERACTIVE_STATIC_DRAWING_KINDS` 的定义在 model-node-ops.ts:18，展开它的是
// model.ts:696 的 `STATIC_LINE_LIKE_KINDS`。若 appTopbar 是本文件第一个被求值的入口，
// 顺序会变成 model-node-ops 先跑 → 它 import model.ts → model.ts 顶层执行到 :696 时
// model-node-ops 还没导出该常量（undefined）→ `TypeError: INTERACTIVE_STATIC_DRAWING_KINDS
// is not iterable`（已实测，见 appView.test.tsx 的同一备注）。
// 先静态 import model.ts 把 model ↔ model-node-ops 这一对按正确顺序求完，appTopbar 就安全了。
import "../model";
import {
  NEW_SPACE_OPTION_VALUE,
  buildSpaceSwitcherOptions,
  currentSpaceOf,
  suggestSpaceName
} from "./appTopbar";

// 本文件只覆盖 appTopbar.tsx 的**纯函数**导出（12 个导出里的 4 个 + 1 个常量）。
//
// 为什么只有 4 个：本仓库前端测试环境是 node（vite.config.ts 的 test.environment），
// 没有 jsdom / testing-library，全仓 react-dom/server、createRoot、act( 出现 0 次 ——
// appView.test.tsx:1252 已把这个取舍记成文，加 devDeps 会造出第二种前端测试范式。
// 另 8 个导出是组件（AppTopbar / SelectionActionCluster / RecentGlyphsToolbar）与
// 带 I/O 的编排函数（createSpaceThenSwitch / exportCurrentSpace /
// importSpaceArchiveFromFile / renameCurrentSpace / deleteCurrentSpace），
// 前者渲染不了，后者的网络/弹窗路径由 appView.test.tsx 的
// 「顶栏空间选择器」「空间导入导出按钮」两个 describe 覆盖。
//
// 本文件的断言全部来自先跑探针打印实际输出再逐字写下，不是按函数名想象的语义。
import type { Space } from "../spaceClient";

const space = (id: string, name: string, extra: Partial<Space> = {}): Space => ({
  id,
  name,
  createdAt: "2026-01-01",
  ...extra
});

describe("buildSpaceSwitcherOptions", () => {
  test("空列表时只剩新建入口，且选项只有 value/label 两个键", () => {
    // 组件侧不持有任何空间清单，所以「没有空间」不是错误状态，只是只剩那个入口
    expect(buildSpaceSwitcherOptions([])).toEqual([
      { value: NEW_SPACE_OPTION_VALUE, label: "＋ 新建空间…" }
    ]);
    // 多出来的键会漏进 antd Select 的选项契约里，故连键集一起钉住
    expect(Object.keys(buildSpaceSwitcherOptions([])[0]).sort()).toEqual(["label", "value"]);
  });

  test("列表未加载时与空列表同结果；非数组入参也退化成空列表", () => {
    // undefined（列表还没拉到）与 [] 必须是同一形状：区别只该体现在「有几个真实选项」上
    expect(buildSpaceSwitcherOptions(undefined)).toEqual(buildSpaceSwitcherOptions([]));
    // 边界：后端给了非数组（null / 对象 / 字符串）时不能抛，也不能把对象当数组展开
    expect(buildSpaceSwitcherOptions(null as never)).toEqual(buildSpaceSwitcherOptions([]));
    expect(buildSpaceSwitcherOptions({} as never)).toEqual(buildSpaceSwitcherOptions([]));
    expect(buildSpaceSwitcherOptions("甲" as never)).toEqual(buildSpaceSwitcherOptions([]));
  });

  test("非空列表与空列表的结果确实不同（否则上面两条断言恒绿）", () => {
    // 兜底断言的同伴断言：先证明「有列表」与「无列表」分得开，
    // 才说明前面那几条 toEqual 不是在比同一个值
    const withSpace = buildSpaceSwitcherOptions([space("甲", "甲的空间")]);
    expect(withSpace).not.toEqual(buildSpaceSwitcherOptions([]));
    expect(withSpace).toHaveLength(2);
  });

  test("选项逐字透传 id 与 name，顺序与入参一致", () => {
    // 名字刻意用**带斜杠与全套非法字符**和超长串：这些正是 sanitizeSpaceFileName 会改写的东西，
    // 而这里必须原样出现在下拉框里（净化只属于导出文件名，见 spaceClient.sanitizeSpaceFileName）。
    const weird = '甲/乙"<>|:*?';
    const long = "长".repeat(200);
    const options = buildSpaceSwitcherOptions([
      space("乙", weird, { pinned: true, owner: "zhang" }),
      space("甲", long),
      space("丙", "丙")
    ]);

    expect(options).toEqual([
      { value: "乙", label: weird },
      { value: "甲", label: long },
      { value: "丙", label: "丙" },
      { value: NEW_SPACE_OPTION_VALUE, label: "＋ 新建空间…" }
    ]);
    // 长名字不被截断
    expect(options[1].label).toHaveLength(200);
  });

  test("新建入口固定追加在末位，位置不随入参变化", () => {
    const spaces = [space("a", "甲"), space("b", "乙")];
    const options = buildSpaceSwitcherOptions(spaces);

    expect(options).toHaveLength(spaces.length + 1);
    // 位置本身是约定：入口必须在最后（它是「去新建」而不是一次切换）
    expect(options[options.length - 1]).toEqual({
      value: NEW_SPACE_OPTION_VALUE,
      label: "＋ 新建空间…"
    });
    // 空列表下「最后一个」也是它：形状在两种入参下同一套，不是两段分支拼出来的
    expect(buildSpaceSwitcherOptions([])[0]).toEqual(options[options.length - 1]);
  });

  // ⚠ 下面是**现状**而不是期望行为：哨兵值与真实空间 id 可撞名，且不会被去重。
  // server/spaceId.mjs 的 ID_OK 允许 `_`，故 `spaceIdFromName("__new_space__")` 原样返回
  // `__new_space__`（该名字也过 isAcceptableSpaceName），即这条路径是可达的。
  // 后果在 changeSpace（appTopbar.tsx:353）：它先比 `next === NEW_SPACE_OPTION_VALUE`，
  // 于是选中那个真空间会被当成「点新建」→ 弹新建框，而不是切换过去。
  // 这条用例的作用是把这个碰撞钉住，使日后无论是修实现还是修约定时红得起来。
  test("id 恰好等于哨兵值的空间不被去重，入口照旧追加（现状记录，见上方注释）", () => {
    const collided = buildSpaceSwitcherOptions([space(NEW_SPACE_OPTION_VALUE, "__new_space__")]);

    expect(collided).toEqual([
      { value: NEW_SPACE_OPTION_VALUE, label: "__new_space__" },
      { value: NEW_SPACE_OPTION_VALUE, label: "＋ 新建空间…" }
    ]);
    expect(collided.filter((option) => option.value === NEW_SPACE_OPTION_VALUE)).toHaveLength(2);
    // 真实空间排在前面：这决定了 antd Select 显示哪个 label，也决定了它撞的是谁
    expect(collided[0].label).toBe("__new_space__");
  });

  test("重复 id 不去重", () => {
    // 后端 id 理论唯一；真出现重复时「少列一项」比「静默列两项同名」更难排查，故钉住不去重
    expect(buildSpaceSwitcherOptions([space("a", "甲"), space("a", "乙")])).toEqual([
      { value: "a", label: "甲" },
      { value: "a", label: "乙" },
      { value: NEW_SPACE_OPTION_VALUE, label: "＋ 新建空间…" }
    ]);
  });

  test("不改入参，且每次返回新数组", () => {
    const spaces = Object.freeze([Object.freeze(space("a", "甲"))]) as readonly Space[];
    const first = buildSpaceSwitcherOptions(spaces);
    first.push({ value: "本地追加", label: "本地追加" });

    expect(spaces).toHaveLength(1);
    // 返回的数组若是模块级共享缓存，上面那次 push 会渗进下一次调用
    expect(buildSpaceSwitcherOptions(spaces)).toHaveLength(2);
    expect(buildSpaceSwitcherOptions(spaces)).not.toBe(buildSpaceSwitcherOptions(spaces));
  });
});

describe("NEW_SPACE_OPTION_VALUE", () => {
  test("哨兵值是双下划线包裹的 new_space", () => {
    // 这个字符串同时被下拉框的 onChange 与 changeSpace 比较，改字面量会让「点新建」退化成一次切换
    expect(NEW_SPACE_OPTION_VALUE).toBe("__new_space__");
    expect(typeof NEW_SPACE_OPTION_VALUE).toBe("string");
    expect(NEW_SPACE_OPTION_VALUE.length).toBeGreaterThan(0);
  });
});

describe("suggestSpaceName", () => {
  test("没有占用时从 -2 起", () => {
    // 它只是输入框的默认值（最终判重在后端），所以第一候选必须是 -2 而不是 -1
    expect(suggestSpaceName("甲", undefined)).toBe("甲-2");
    expect(suggestSpaceName("甲", [])).toBe("甲-2");
    // 列表未加载 / 非数组是同一类兜底，分不出差别就不该分
    expect(suggestSpaceName("甲", null as never)).toBe("甲-2");
    expect(suggestSpaceName("甲", {} as never)).toBe("甲-2");
  });

  test("有占用时逐个往上跳到第一个空位", () => {
    expect(suggestSpaceName("甲", [space("1", "甲-2")])).toBe("甲-3");
    expect(suggestSpaceName("甲", [space("1", "甲-2"), space("2", "甲-3")])).toBe("甲-4");
    // 顺序无关：倒序摆也得到同一个答案
    expect(
      suggestSpaceName("甲", [space("1", "甲-4"), space("2", "甲-3"), space("3", "甲-2")])
    ).toBe("甲-5");
  });

  test("跳的是第一个空位，不是最大后缀加一", () => {
    // 甲-3 空着就直接用甲-3，不必一路顶到甲-5：少问用户一轮
    expect(suggestSpaceName("甲", [space("1", "甲-2"), space("2", "甲-4")])).toBe("甲-3");
  });

  test("占用判定用 trim 后的名字，且重复名只算一次", () => {
    // 后端可能存了带空白的名字，判重必须 trim 后比，否则会建议出一个仍被占用的名字
    expect(suggestSpaceName("甲", [space("1", "  甲-2  ")])).toBe("甲-3");
    // 重复条目不叠加：Set 去重，甲-3 只被算成一个占用
    expect(suggestSpaceName("甲", [space("1", "甲-2"), space("2", "甲-2")])).toBe("甲-3");
  });

  test("只认完全相等：前缀、前导零、中间带空格的都不算占用", () => {
    expect(suggestSpaceName("甲", [space("1", "甲-2x")])).toBe("甲-2");
    expect(suggestSpaceName("甲", [space("1", "甲-02")])).toBe("甲-2");
    expect(suggestSpaceName("甲", [space("1", "甲 - 2")])).toBe("甲-2");
    expect(suggestSpaceName("甲", [space("1", "乙-2")])).toBe("甲-2");
    // 同伴断言：上面几个是真占用时答案确实会变，否则这组断言没有判别力
    expect(suggestSpaceName("甲", [space("1", "甲-2")])).not.toBe("甲-2");
  });

  test("base 自身被占用不影响建议值", () => {
    // 建议的是**新**名字，base 撞了本来就该继续用 -2，跳到 -3 才是错的
    expect(suggestSpaceName("甲", [space("1", "甲")])).toBe("甲-2");
    expect(suggestSpaceName("甲", [space("1", "甲"), space("2", "甲-2")])).toBe("甲-3");
  });

  test("缺失名 / 空名 / null 条目的空间都不算占用", () => {
    // 判重只看 name：畸形条目不能让建议值凭空跳号
    expect(suggestSpaceName("甲", [{ id: "1" } as never])).toBe("甲-2");
    expect(suggestSpaceName("甲", [{ id: "1", name: null } as never])).toBe("甲-2");
    expect(suggestSpaceName("甲", [{ id: "1", name: "   " } as never])).toBe("甲-2");
    expect(suggestSpaceName("甲", [null as never])).toBe("甲-2");
    expect(suggestSpaceName("甲", [space("1", "甲-2"), null as never])).toBe("甲-3");
  });

  test("base 自身不 trim：只有占用集合那一侧被 trim", () => {
    // 已实测：suggestSpaceName(" 甲 ", [甲-2]) === " 甲 -2" —— 候选与被比较的串都不等于
    // "甲-2"，于是第一个候选就「空着」。这条看着像毛病，但它就是现状，钉住免得悄悄改掉。
    // 调用方（导入撞车改名框的默认值、后端回的 spaceName）拿到的都是后端已规范化的名字。
    expect(suggestSpaceName(" 甲 ", [space("1", "甲-2")])).toBe(" 甲 -2");
    expect(suggestSpaceName(" 甲 ", [])).toBe(" 甲 -2");
  });

  test("空 base 时给出裸 -2", () => {
    // 边界：默认名是「导入空间」这类兜底文案时也会走进来
    expect(suggestSpaceName("", undefined)).toBe("-2");
    expect(suggestSpaceName("", [space("1", "甲-2")])).toBe("-2");
    expect(suggestSpaceName("", [space("1", "-2")])).toBe("-3");
  });

  test("特殊字符、换行与超长 base 原样保留（这里不做净化，也不截断）", () => {
    expect(suggestSpaceName("a/b*c?", [space("1", "a/b*c?-2")])).toBe("a/b*c?-3");
    expect(suggestSpaceName("甲\n乙", undefined)).toBe("甲\n乙-2");
    // 与哨兵值同形也不特殊处理：它是给人看的输入框默认值，不是 Select 的 value
    expect(suggestSpaceName("__new_space__", undefined)).toBe("__new_space__-2");
    // 超长名不截断：截断是文件名净化的事，空间名的合法性由后端 400 判
    expect(suggestSpaceName("长".repeat(100), undefined)).toBe("长".repeat(100) + "-2");
  });
});

describe("currentSpaceOf", () => {
  test("命中时返回列表里那一条本身（同一引用）", () => {
    // 导出/导入/改名/删除四个按钮的共同作用对象；返回拷贝会让后续按引用判定的地方失效
    const target = space("b", "乙", { pinned: true, owner: "zhang" });
    const found = currentSpaceOf({
      spaces: [space("a", "甲"), target],
      currentSpaceId: "b"
    });

    expect(found).toBe(target);
    expect(found?.id).toBe("b");
    expect(found?.pinned).toBe(true);
    expect(found?.owner).toBe("zhang");
  });

  test("currentSpaceId 不在列表里时返回 null", () => {
    // 后端回退到 default、但列表还没刷新时就是这个形状：按钮该禁用，
    // 拿空 id 去打后端只会得到「未知空间」
    expect(currentSpaceOf({ spaces: [space("a", "甲")], currentSpaceId: "zzz" })).toBe(null);
  });

  test("列表未加载 / 非数组 / scope 缺失一律 null", () => {
    expect(currentSpaceOf({})).toBe(null);
    expect(currentSpaceOf(undefined as never)).toBe(null);
    expect(currentSpaceOf({ spaces: undefined, currentSpaceId: "a" })).toBe(null);
    expect(currentSpaceOf({ spaces: null, currentSpaceId: "a" } as never)).toBe(null);
    expect(currentSpaceOf({ spaces: {}, currentSpaceId: "a" } as never)).toBe(null);
  });

  test("两侧 id 都是 undefined 时按相等命中，不落到 null 兜底", () => {
    // 这条是 null 兜底的双面断言：光断言「找不到 → null」没有判别力
    // （只要函数恒返回 null 就恒绿）。这里断言「undefined === undefined → 命中」，
    // 逼出恒返回 null 的实现。
    const anonymous = { name: "无 id 空间" } as never;
    expect(currentSpaceOf({ spaces: [anonymous] })).toBe(anonymous);
    expect(currentSpaceOf({ spaces: [anonymous], currentSpaceId: "a" })).toBe(null);
  });

  test("id 是严格比较：空串能命中，数字 0 不等于字符串 0", () => {
    expect(currentSpaceOf({ spaces: [space("", "空 id")], currentSpaceId: "" })).not.toBe(null);
    expect(currentSpaceOf({ spaces: [space("0", "零")], currentSpaceId: 0 as never })).toBe(null);
    expect(currentSpaceOf({ spaces: [space("true", "真")], currentSpaceId: true as never })).toBe(null);
  });

  test("冻结的列表也能读（不写、不排序）", () => {
    // App.tsx 每帧重建 scope；读侧若对入参排序或写属性就会在冻结对象上炸
    const frozen = Object.freeze({ spaces: Object.freeze([space("a", "甲"), space("b", "乙")]), currentSpaceId: "b" });
    expect(() => currentSpaceOf(frozen)).not.toThrow();
    expect(currentSpaceOf(frozen)?.id).toBe("b");
    expect(frozen.spaces.map((item) => item.id)).toEqual(["a", "b"]);
  });
});