import { describe, expect, test } from "vitest";
import {
  PENDING_URL_MODEL_RETRY_LIMIT,
  PENDING_URL_MODEL_STORAGE_KEY,
  buildWorkspaceHash,
  clearPendingUrlModel,
  findSavedProjectByIndex,
  findSchemeBySlug,
  isModelIndex,
  isSchemeSlug,
  parseWorkspaceHash,
  readPendingUrlModel,
  readWorkspaceUrl,
  schemePathSlugPrefixes,
  schemeSlugForModelKey,
  spaceIdToAdopt,
  syncWorkspaceUrl,
  writePendingUrlModel
} from "./workspaceUrl";

// 地址栏是用户可编辑的外部输入，本文件的每条用例都在钉「脏输入不炸、空输入不约束」这条线。

describe("hash 编解码", () => {
  test("中文 id 编码后能被原样解回（与 Cookie 同一套编解码对称性）", () => {
    const hash = buildWorkspaceHash({ spaceId: "张三", modelId: "模型 A", schemeId: "方案&1" });
    expect(hash.startsWith("#")).toBe(true);
    // 裸中文 / `&` 都不能出现在 hash 里，否则 split("&") 会把 id 截断
    expect(hash).not.toContain("张三");
    expect(hash).not.toContain("方案&1");
    const parsed = parseWorkspaceHash(hash);
    expect(parsed.spaceId).toBe("张三");
    expect(parsed.modelId).toBe("模型 A");
    expect(parsed.schemeId).toBe("方案&1");
    expect(parsed.hasSpace).toBe(true);
    expect(parsed.hasModel).toBe(true);
    expect(parsed.hasScheme).toBe(true);
  });

  test("空字段不写进 hash，也不会留下 model= 这种噪声", () => {
    expect(buildWorkspaceHash({ spaceId: "", modelId: "", schemeId: "" })).toBe("");
    expect(buildWorkspaceHash({ spaceId: "default" })).toBe("#space=default");
    const parsed = parseWorkspaceHash("#space=default");
    expect(parsed.hasModel).toBe(false);
    expect(parsed.modelId).toBe("");
  });

  test("没写 hash / 只有 # 时返回全空且 has* 全 false", () => {
    for (const hash of ["", "#", "##"]) {
      const parsed = parseWorkspaceHash(hash);
      expect(parsed).toEqual({
        spaceId: "",
        modelId: "",
        schemeId: "",
        modelKey: "",
        schemeKey: "",
        hasSpace: false,
        hasModel: false,
        hasScheme: false,
        legacyModelKey: false,
        legacySchemeKey: false
      });
    }
  });

  test("显式写了空值算 present —— hasSpace=true 但 spaceId 为空，调用方不会误当默认空间", () => {
    const parsed = parseWorkspaceHash("#space=&model=");
    expect(parsed.hasSpace).toBe(true);
    expect(parsed.spaceId).toBe("");
    expect(parsed.hasModel).toBe(true);
  });

  test("非法百分号序列按原值使用，不抛错", () => {
    expect(() => parseWorkspaceHash("#space=%E4&model=%")).not.toThrow();
    const parsed = parseWorkspaceHash("#space=%E4");
    expect(parsed.spaceId).toBe("%E4");
  });

  test("不认识的键与无等号的段一律跳过（路径式 hash 解析为空）", () => {
    const parsed = parseWorkspaceHash("#/models/abc&space=甲&whatever=1");
    expect(parsed.spaceId).toBe("甲");
    expect(parsed.modelId).toBe("");
    expect(parseWorkspaceHash("#/models/abc").hasModel).toBe(false);
  });

  test("重复键以后出现的为准", () => {
    expect(parseWorkspaceHash("#space=a&space=b").spaceId).toBe("b");
  });
});

describe("打开地址时是否切空间", () => {
  const url = (space: string) => parseWorkspaceHash(buildWorkspaceHash({ spaceId: space }));

  test("与 Cookie 不同才切", () => {
    expect(spaceIdToAdopt(url("乙"), "甲")).toBe("乙");
  });

  test("相同就不切（否则白白清缓存 + 硬重载，画布现场全丢）", () => {
    expect(spaceIdToAdopt(url("甲"), "甲")).toBe("");
  });

  test("地址栏没写 space 时不动 Cookie 解析链的结果", () => {
    expect(spaceIdToAdopt(parseWorkspaceHash(""), "甲")).toBe("");
    expect(spaceIdToAdopt(parseWorkspaceHash("#model=m1"), "甲")).toBe("");
  });

  test("显式空值也不切（空 id 不是合法空间）", () => {
    expect(spaceIdToAdopt(parseWorkspaceHash("#space="), "甲")).toBe("");
  });
});

describe("地址栏读写（注入桩对象）", () => {
  const fakeEnv = (initial: { hash?: string; pathname?: string; search?: string } = {}) => {
    const location = {
      hash: initial.hash ?? "",
      pathname: initial.pathname ?? "/",
      search: initial.search ?? ""
    };
    let replaced: string | null = null;
    const history = {
      replaceState(_state: unknown, _title: string, next: string) {
        replaced = next;
        const index = next.indexOf("#");
        location.hash = index < 0 ? "" : next.slice(index);
        // 真实浏览器下 pathname/search 保持不变，这里也不动它们
      }
    };
    return {
      location,
      history,
      get replaced() {
        return replaced;
      }
    };
  };

  test("syncWorkspaceUrl 用 replaceState 改 hash，保留 pathname 与 query", () => {
    const env = fakeEnv({ pathname: "/app/index.html", search: "?tab=canvas", hash: "" });
    const changed = syncWorkspaceUrl(
      { spaceId: "甲", modelId: "m1", schemeId: "s1" },
      { location: env.location as unknown as Location, history: env.history as unknown as History }
    );
    expect(changed).toBe(true);
    expect(env.replaced).toBe("/app/index.html?tab=canvas#space=%E7%94%B2&model=m1&scheme=s1");
    expect(env.location.hash).toContain("model=m1");
  });

  test("内容没变时不动地址栏，返回 false（避免每次渲染都 replaceState）", () => {
    const env = fakeEnv();
    const options = { location: env.location as unknown as Location, history: env.history as unknown as History };
    expect(syncWorkspaceUrl({ modelId: "m1" }, options)).toBe(true);
    expect(syncWorkspaceUrl({ modelId: "m1" }, options)).toBe(false);
    expect(syncWorkspaceUrl({ modelId: "m2" }, options)).toBe(true);
  });

  test("没有 location（node 环境）时读返回全空、写返回 false，不抛错", () => {
    expect(() => readWorkspaceUrl()).not.toThrow();
    expect(readWorkspaceUrl().hasModel).toBe(false);
    expect(syncWorkspaceUrl({ modelId: "m1" }, { location: null, history: null })).toBe(false);
  });

  test("replaceState 抛错（跨源 iframe / file://）时静默放弃，返回 false", () => {
    const env = fakeEnv();
    const changed = syncWorkspaceUrl(
      { modelId: "m1" },
      {
        location: env.location as unknown as Location,
        history: {
          replaceState() {
            throw new Error("SecurityError");
          }
        } as unknown as History
      }
    );
    expect(changed).toBe(false);
  });
});

describe("打开失败的模型诉求：sessionStorage 重试记账", () => {
  const installStore = () => {
    const map = new Map<string, string>();
    const store = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, String(value)),
      removeItem: (key: string) => void map.delete(key)
    };
    const scope = globalThis as any;
    const previous = scope.sessionStorage;
    scope.sessionStorage = store;
    return {
      restore: () => {
        if (previous === undefined) delete scope.sessionStorage;
        else scope.sessionStorage = previous;
      }
    };
  };

  test("写入后可读回；清除后为空", () => {
    const { restore } = installStore();
    try {
      expect(readPendingUrlModel()).toBe(null);
      writePendingUrlModel("12", "s1", 0, "project:scheme%3A%5B%22%E6%8E%92%E6%9F%A5%22%5D", "scheme:x");
      expect(readPendingUrlModel()).toEqual({
        modelId: "12",
        schemeId: "s1",
        modelKey: "project:scheme%3A%5B%22%E6%8E%92%E6%9F%A5%22%5D",
        schemeKey: "scheme:x",
        attempts: 0
      });
      clearPendingUrlModel();
      expect(readPendingUrlModel()).toBe(null);
    } finally {
      restore();
    }
  });

  test("损坏的 JSON 视为没有记录", () => {
    const { restore } = installStore();
    try {
      (globalThis as any).sessionStorage.setItem(PENDING_URL_MODEL_STORAGE_KEY, "{不是 JSON");
      expect(readPendingUrlModel()).toBe(null);
    } finally {
      restore();
    }
  });

  test("重试上限是 1 次 —— 模型真的不存在时只重试一次，不会每次刷新都弹一次提示", () => {
    expect(PENDING_URL_MODEL_RETRY_LIMIT).toBe(1);
  });
});

// 用户要求（m06427）：地址栏里的 model / scheme 不要用中文，用 id。
// 下面这组用例钉两件事：①写出去的一定不含中文 ②读回来的旧地址仍然能定位（兼容不能丢）。
describe("地址栏不用中文：模型用 project.idx、方案用路径 slug", () => {
  test("schemePathSlugPrefixes：ASCII 短名保留原文，中文名换成层号", () => {
    expect(schemePathSlugPrefixes(["DOT"])).toEqual(["DOT"]);
    expect(schemePathSlugPrefixes(["排查方案"])).toEqual(["s1"]);
    expect(schemePathSlugPrefixes(["主体工程", "变电站", "220kV"])).toEqual(["s1", "s2", "220kV"]);
  });

  test("schemePathSlugPrefixes：超长 ASCII 名同样换成层号（地址栏不该被一个长名撑爆）", () => {
    expect(schemePathSlugPrefixes(["averylongschemename"])).toEqual(["s1"]);
  });

  test("schemePathSlugPrefixes：结果恒为 ASCII 且逐层稳定（同层同序号）", () => {
    const slugs = schemePathSlugPrefixes(["一号方案", "二号方案", "三号方案"]);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[A-Za-z0-9._-]+$/u);
      expect(isSchemeSlug(slug)).toBe(true);
    }
    expect(slugs).toEqual(["s1", "s2", "s3"]);
  });

  test("isModelIndex：只认正整数，0 / 负数 / 小数 / 空串 / 非数字都算没写", () => {
    expect(isModelIndex("12")).toBe(true);
    expect(isModelIndex("0")).toBe(false);
    expect(isModelIndex("-3")).toBe(false);
    expect(isModelIndex("1.5")).toBe(false);
    expect(isModelIndex("")).toBe(false);
    expect(isModelIndex("abc")).toBe(false);
  });

  const schemes = [
    {
      name: "排查方案",
      id: "scheme:0",
      projects: [],
      children: [
        {
          name: "DOT",
          id: "scheme:1",
          projects: [
            { id: "project:a", project: { name: "排查模型", idx: 7 } },
            { id: "project:b", project: { name: "另一个模型", idx: 9 } }
          ],
          children: [{ name: "子方案", id: "scheme:2", projects: [{ id: "project:c", project: { name: "子模型", idx: 11 } }] }]
        }
      ]
    }
  ];

  test("schemeSlugForModelKey：逐层算到模型所在的那一层", () => {
    expect(schemeSlugForModelKey(schemes, "project:a")).toBe("s1/DOT");
    expect(schemeSlugForModelKey(schemes, "project:c")).toBe("s1/DOT/s3");
  });

  test("schemeSlugForModelKey：模型不在树里时返回空串（宁可不写，也不写错的）", () => {
    expect(schemeSlugForModelKey(schemes, "project:不存在")).toBe("");
    expect(schemeSlugForModelKey(null, "project:a")).toBe("");
  });

  test("findSavedProjectByIndex：按 idx 直接定位，不需要先知道方案", () => {
    const found = findSavedProjectByIndex(schemes, 9);
    expect(found?.record.id).toBe("project:b");
    expect(found?.scheme.name).toBe("DOT");
  });

  test("findSavedProjectByIndex：深层模型也能找到；idx 非法时返回 null", () => {
    expect(findSavedProjectByIndex(schemes, 11)?.record.id).toBe("project:c");
    expect(findSavedProjectByIndex(schemes, 999)).toBe(null);
    expect(findSavedProjectByIndex(schemes, 0)).toBe(null);
  });

  test("findSchemeBySlug：前缀链必须完全对上，不同层碰巧同 slug 不会误命中", () => {
    expect(findSchemeBySlug(schemes, "s1/DOT")?.name).toBe("DOT");
    expect(findSchemeBySlug(schemes, "s1")?.name).toBe("排查方案");
    expect(findSchemeBySlug(schemes, "DOT")).toBe(null);
    expect(findSchemeBySlug(schemes, "")).toBe(null);
  });

  test("写出去的地址栏不含中文：model 是纯数字、scheme 是 slug", () => {
    const hash = buildWorkspaceHash({ spaceId: "default", modelId: "7", schemeId: schemeSlugForModelKey(schemes, "project:a") });
    expect(hash).toBe("#space=default&model=7&scheme=s1%2FDOT");
    expect(decodeURIComponent(hash)).toBe("#space=default&model=7&scheme=s1/DOT");
    expect(/[\u4e00-\u9fa5]/u.test(hash)).toBe(false);
  });

  test("读回新格式：model/scheme 就是 idx 与 slug，不带 legacy 标记", () => {
    const parsed = parseWorkspaceHash("#space=default&model=7&scheme=s1%2FDOT");
    expect(parsed.modelId).toBe("7");
    expect(parsed.schemeId).toBe("s1/DOT");
    expect(parsed.legacyModelKey).toBe(false);
    expect(parsed.legacySchemeKey).toBe(false);
    expect(parsed.hasModel).toBe(true);
  });

  test("读回旧格式（model=project:%E6%8E%92…）：认得出来，挪进 key 走老路径", () => {
    const legacyModelKey = "project:scheme%3A%5B%22%E6%8E%92%E6%9F%A5%E6%96%B9%E6%A1%88%22%5D/%E6%8E%92%E6%9F%A5%E6%A8%A1%E5%9E%8B";
    const parsed = parseWorkspaceHash(`#space=default&model=${encodeURIComponent(legacyModelKey)}&scheme=scheme%3A0`);
    expect(parsed.legacyModelKey).toBe(true);
    expect(parsed.legacySchemeKey).toBe(true);
    expect(parsed.modelKey).toBe(legacyModelKey);
    expect(parsed.schemeKey).toBe("scheme:0");
    // 旧值不能被当成 idx 用
    expect(parsed.modelId).toBe("");
    expect(parsed.hasModel).toBe(true);
  });

  test("buildWorkspaceHash 永不写 mk / sk —— 运行期 key 含中文名，不进地址栏", () => {
    const hash = buildWorkspaceHash({
      spaceId: "default",
      modelId: "7",
      schemeId: "s1",
      modelKey: "project:中文",
      schemeKey: "scheme:中文"
    } as any);
    expect(hash).toBe("#space=default&model=7&scheme=s1");
    expect(hash).not.toContain("mk=");
    expect(hash).not.toContain("sk=");
  });
});
