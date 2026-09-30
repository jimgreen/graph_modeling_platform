// 空间**显示名**的接受规则（server/spaceId.mjs）+ 归属归一与重名错误（server/spaceStore.mjs）。
//
// 这两个模块此前只被 API 层间接点到（spaceApi.test.mjs 里一处
// `isAcceptableSpaceName(normalizeSpaceName(created.name))` 往返断言），规则本身零断言。
// 判错后果：名字被悄悄截断 / 导出后再导入换了个名字 / emoji 名字建空间时被拒或误收，
// 属静默改用户数据一类 —— 所以宁可把「为什么这样判」逐条钉住。
import { describe, expect, test } from "vitest";
import {
  MAX_SPACE_NAME_LENGTH,
  isAcceptableSpaceName,
  isValidSpaceId,
  normalizeSpaceName,
  spaceIdFromName
} from "./spaceId.mjs";
import {
  MAX_SPACE_OWNER_LENGTH,
  SPACE_NAME_DUPLICATE,
  duplicateSpaceNameError,
  normalizeSpaceOwner
} from "./spaceStore.mjs";

// 显式转义：编辑器/输入法会把组合字符自动折成预组合形式，写字面量就分不出两者。
const DECOMPOSED = "école";   // e + 组合锐音符（两码点）
const PRECOMPOSED = "école"; // é 预组合（一码点）
const FULLWIDTH_SPACE = "　";

describe("normalizeSpaceName：NFKC + trim，且不截断", () => {
  test("首尾空白与全角空格都去掉，全角字母折叠成半角", () => {
    // 全角空格 U+3000 经 NFKC 变普通空格，再被 trim 吃掉；内部的留下来
    expect(normalizeSpaceName(`${FULLWIDTH_SPACE}Ａ${FULLWIDTH_SPACE}Ｂ${FULLWIDTH_SPACE}`)).toBe("A B");
  });

  test("缺省与非字符串按字符串化处理", () => {
    expect(normalizeSpaceName(undefined)).toBe("");
    expect(normalizeSpaceName(null)).toBe("");
    expect(normalizeSpaceName(12345)).toBe("12345");
    expect(normalizeSpaceName("   ")).toBe("");
  });

  test("★ 不截断：41 个字原样留着，超长交给入口 400", () => {
    // 静默截断 = 把用户输入的名字悄悄改掉，也破坏「能被创建的名字一定无损往返」
    const long = "字".repeat(MAX_SPACE_NAME_LENGTH + 1);
    expect(normalizeSpaceName(long)).toBe(long);
  });

  test("圈数字母折叠（① → 1）", () => {
    expect(normalizeSpaceName("①区")).toBe("1区");
  });

  test("视觉相同的两种写法归一到同一串", () => {
    expect(DECOMPOSED).not.toBe(PRECOMPOSED);
    expect(normalizeSpaceName(DECOMPOSED)).toBe(normalizeSpaceName(PRECOMPOSED));
    expect(normalizeSpaceName(DECOMPOSED)).toBe("école");
  });

  test("内部连续空格不合并", () => {
    expect(normalizeSpaceName("a  b")).toBe("a  b");
  });
});

describe("isAcceptableSpaceName", () => {
  test("长度按码点计，不是 UTF-16 单元", () => {
    // 「a」+ 39 个 emoji = 40 码点 / 79 个 UTF-16 单元；按单元计会把合法名字误拒。
    // 前面加「a」是因为纯 emoji 连「含一个合法字符」那层都过不去（见下面「全符号名被拒」）。
    const at40 = `a${"😀".repeat(MAX_SPACE_NAME_LENGTH - 1)}`;
    expect([...at40].length).toBe(MAX_SPACE_NAME_LENGTH);
    expect(at40.length).toBe(MAX_SPACE_NAME_LENGTH * 2 - 1);
    expect(isAcceptableSpaceName(at40)).toBe(true);
    expect(isAcceptableSpaceName(`${at40}😀`)).toBe(false);
  });

  test("边界：正好 40 个中文字符通过、41 个不通过", () => {
    // 上限值本身钉死：下面两条都用 MAX_SPACE_NAME_LENGTH 推导，改常量不会让用例变红
    expect(MAX_SPACE_NAME_LENGTH).toBe(40);
    expect(isAcceptableSpaceName("字".repeat(MAX_SPACE_NAME_LENGTH))).toBe(true);
    expect(isAcceptableSpaceName("字".repeat(MAX_SPACE_NAME_LENGTH + 1))).toBe(false);
  });

  test("★ 全符号名被拒：至少要含一个字母/数字/下划线/短横线", () => {
    // 「非空」这层判据过了，「剥掉非法字符后还剩东西」这层没过
    for (const name of ["🎉", "😀", "...", "***", "（）", "★★★", "///"]) {
      expect(isAcceptableSpaceName(name), name).toBe(false);
    }
  });

  test("★ 含一个合法字符即通过，其余字符一概不管", () => {
    // 含斜杠/点/空格的**显示名**是合法的 —— 目录名的净化是 id 那一侧的事
    // ★ 短横线与下划线**本身就是**合法字符：只有一个短横线的名字也合格。
    // （把这两条漏掉，下面的正则一旦少写一个字符类就抓不到。）
    for (const name of ["版本 v1.2", "a b", "张-三_1", "A/B", "a.b", "-", "_"]) {
      expect(isAcceptableSpaceName(name), name).toBe(true);
    }
    expect(isAcceptableSpaceName("")).toBe(false);
    // 注：下面这条只钉**结果**，不是 `Boolean(normalized)` 那道判据本身 ——
    // 该判据为假只可能是空串，而空串必然也没有合法字符，第三层照样拒收，
    // 故整层删掉行为完全一致（已用合法/非法字符集逐个对拍验证），不可覆盖。
  });
});

describe("可接受名 ↔ 空间 id 的跨函数关系", () => {
  test("★ 入口拒收的名字，id 侧仍会兜底成 space（两套规则有意不同）", () => {
    // 入口拒收 → 正常流程建不出这种空间；id 兜底只服务于历史数据 / 手改 spaces.json 的残留名
    for (const name of ["🎉", "...", "😀"]) {
      expect(isAcceptableSpaceName(normalizeSpaceName(name)), name).toBe(false);
      expect(spaceIdFromName(name), name).toBe("space");
      expect(isValidSpaceId(spaceIdFromName(name)), name).toBe(true);
    }
  });

  test("含路径分隔符的显示名合法，算出的 id 被净化成连字符", () => {
    expect(isAcceptableSpaceName(normalizeSpaceName("a/b"))).toBe(true);
    expect(spaceIdFromName("a/b")).toBe("a-b");
  });

  // 确定性伪随机（固定种子，无 Math.random），覆盖 ASCII / 中文 / 全角 / emoji / 空白 / 标点
  const makeRng = (seed) => {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  };
  const FUZZ_ALPHABET = [..."abc019-_ ./\\中文字éＡ😀%*（）"];
  const fuzzNames = (count = 800) => {
    const rng = makeRng(20260930);
    const names = ["ＡＢＣ", "a/b", `${FULLWIDTH_SPACE}名字${FULLWIDTH_SPACE}`, "①", "🎉", "..."];
    for (let i = 0; i < count; i += 1) {
      const len = 1 + Math.floor(rng() * 12);
      let text = "";
      for (let k = 0; k < len; k += 1) text += FUZZ_ALPHABET[Math.floor(rng() * FUZZ_ALPHABET.length)];
      names.push(text);
    }
    return names;
  };

  test("归一是幂等的：已归一化的名字再归一次不变", () => {
    for (const name of fuzzNames()) {
      const once = normalizeSpaceName(name);
      expect(normalizeSpaceName(once), name).toBe(once);
    }
  });

  test("★ 归一不会把合格名字变成不合格（三个入口的判定不会分裂）", () => {
    // 入口都先归一再判；万一 NFKC 折叠把某个「合法字符」折成非法字符，
    // 就会出现「同一个名字 POST 被收下、导入时却被拒」的分裂。
    // 特意带上 NFKC 会改写的类字符（½ → 1⁄2、㎒ → MHz、Ⅰ → I、㊿ → 20）
    const tricky = ["½", "㎒", "Ⅰ", "㊿", "㉑", "㍿"];
    const flipped = [];
    for (const name of [...fuzzNames(), ...tricky]) {
      if (isAcceptableSpaceName(name) && !isAcceptableSpaceName(normalizeSpaceName(name))) flipped.push(name);
    }
    expect(flipped.slice(0, 5), `共 ${flipped.length} 个名字归一后被判不合格`).toEqual([]);
  });

  test("可接受名算出的 id 必合法、不超长、不含路径成分", () => {
    const bad = [];
    for (const name of fuzzNames()) {
      const normalized = normalizeSpaceName(name);
      if (!isAcceptableSpaceName(normalized)) continue;
      const id = spaceIdFromName(normalized);
      if (!isValidSpaceId(id) || [...id].length > MAX_SPACE_NAME_LENGTH || id.includes("/") || id.includes("\\")) {
        bad.push({ name: normalized, id });
      }
    }
    expect(bad.slice(0, 5), `共 ${bad.length} 个 id 不合格`).toEqual([]);
  });
});

describe("normalizeSpaceOwner：归属只做 trim 与长度上限", () => {
  test("trim 与缺省", () => {
    expect(normalizeSpaceOwner("  张三  ")).toBe("张三");
    expect(normalizeSpaceOwner("   ")).toBe("");
    expect(normalizeSpaceOwner(undefined)).toBe("");
    expect(normalizeSpaceOwner(null)).toBe("");
  });

  test("非字符串按字符串化处理", () => {
    expect(normalizeSpaceOwner(12345)).toBe("12345");
  });

  test("恰好 64 不被切", () => {
    expect(MAX_SPACE_OWNER_LENGTH).toBe(64);
    expect(normalizeSpaceOwner("a".repeat(64))).toBe("a".repeat(64));
  });

  test("★ 上限按 UTF-16 单元切，不是码点", () => {
    // 与显示名长度按码点计（isAcceptableSpaceName）**刻意不同**：
    // 归属不是标识符，只是前端用来收窄列表的字符串
    const owner = normalizeSpaceOwner("😀".repeat(40));
    expect(owner.length).toBe(MAX_SPACE_OWNER_LENGTH);
    expect([...owner].length).toBe(32);
  });

  test("★ 切在代理对中间会留下半个代理（已知无害，钉住现状）", () => {
    // slice 按 UTF-16 单元切，边界落在代理对中间时截出孤立高位代理。
    // 归属不参与鉴权、只做列表过滤，JSON.stringify 会把它转义成 \ud83d，不会炸 ——
    // 若将来把 owner 当标识符用，这里就是要改的地方。
    const owner = normalizeSpaceOwner(`${"a".repeat(63)}😀`);
    expect(owner.length).toBe(MAX_SPACE_OWNER_LENGTH);
    expect(owner.charCodeAt(MAX_SPACE_OWNER_LENGTH - 1)).toBe(0xd83d);
    expect(() => JSON.stringify({ owner })).not.toThrow();
  });

  test("不做 NFKC 折叠（与显示名归一是两套规则）", () => {
    expect(normalizeSpaceOwner("Ａ")).toBe("Ａ");
    expect(normalizeSpaceName("Ａ")).toBe("A");
  });
});

describe("duplicateSpaceNameError", () => {
  test("带 code / spaceName / spaceId，正文嵌原始名字", () => {
    const error = duplicateSpaceNameError("甲空间", "w-2");
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("空间名「甲空间」已存在。");
    expect(error.code).toBe(SPACE_NAME_DUPLICATE);
    expect(error.spaceName).toBe("甲空间");
    // 冲突者 id 是 409 正文里「撞的是哪一个」的唯一来源，不能丢
    expect(error.spaceId).toBe("w-2");
  });

  test("code 与常量一致（HTTP 层按这个字符串映射状态码）", () => {
    expect(SPACE_NAME_DUPLICATE).toBe("SPACE_NAME_DUPLICATE");
    expect(duplicateSpaceNameError("甲", "w-1").code).toBe("SPACE_NAME_DUPLICATE");
  });

  test("未归一的名字原样嵌进正文（调用方负责先归一）", () => {
    expect(duplicateSpaceNameError("  ＡＢＣ  ", "w-3").message).toBe("空间名「  ＡＢＣ  」已存在。");
  });
});
