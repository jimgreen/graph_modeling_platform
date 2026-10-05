import { describe, expect, test, vi } from "vitest";
import {
  categoryMatchScore,
  categoryRejectsSourceName,
  displayNameForSource,
  duplicateSvgKey,
  findIconFile,
  iconComplexity,
  listAvailableRegularIcons,
  nameTokens,
  normalizeSvg,
  renderPreviewHtml,
  renderReadme,
  sourceAudit,
  tokenMatchesPattern,
} from "./generate-office-fluent-icons.mjs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

describe("generate-office-fluent-icons 纯函数", () => {
  test("规范化名称并按数字边界拆分 token", () => {
    expect(nameTokens("Data_24x24_Regular")).toEqual(["data", "24", "x", "24", "regular"]);
    expect(displayNameForSource("data_24x24_regular")).toBe("Data 24x24 Regular");
    expect(iconComplexity("data_24x24_regular")).toBe(3);
  });

  test("按连续 token 匹配模式并计算多 token 更高分数", () => {
    const tokens = nameTokens("arrow_sync_circle");
    expect(tokenMatchesPattern(tokens, "sync_circle")).toBe(true);
    expect(tokenMatchesPattern(tokens, "circle_sync")).toBe(false);
    expect(categoryMatchScore("arrow_sync_circle", ["sync_circle", "arrow"])).toBe(10);
    expect(categoryMatchScore("arrow_sync_circle", [])).toBe(0);
  });

  test("拒绝字符串和正则命中的禁用来源名，并处理非法输入", () => {
    expect(categoryRejectsSourceName("arrow_left", [/^arrow_/i])).toBe(true);
    expect(categoryRejectsSourceName("line_horizontal", ["line_horizontal"])).toBe(true);
    expect(categoryRejectsSourceName("network_adapter", [])).toBe(false);
    expect(categoryRejectsSourceName(null, ["anything"])).toBe(false);
    expect(categoryRejectsSourceName("Arrow_Left", [/^arrow_/iy])).toBe(true);
  });

  test("重复 SVG key 忽略可变元数据、ID 和颜色但保留几何结构", () => {
    const first = duplicateSvgKey(
      '<svg color="#123"><title>A</title><desc>D</desc><path id="one" fill="#abc" d="M0 0" /></svg>',
    );
    const second = duplicateSvgKey(
      '<svg color="#456"><title>B</title><desc>E</desc><path id="two" fill="#def" d="M0 0" /></svg>',
    );
    expect(first).toBe(second);
    expect(duplicateSvgKey(" ")).toBe("");
    expect(duplicateSvgKey(null)).toBe("");
  });

  test("normalizeSvg 生成固定尺寸、当前颜色和转义的无障碍元数据", () => {
    const svg = normalizeSvg(
      '<?xml version="1.0"?><svg width="20" height="20"><path d="M0 0" /><path fill="none" d="M1 1" /></svg>',
      { id: "demo-icon", name: "A & B", sourceName: "demo_icon" },
      { label: "分类 <X>" },
      20,
    );
    expect(svg).not.toContain("<?xml");
    expect(svg).toContain('width="24"');
    expect(svg).toContain('height="24"');
    expect(svg).toContain('color="#2563eb"');
    expect(svg).toContain('<path fill="currentColor" d="M0 0" />');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain("A &amp; B");
    expect(svg).toContain("分类 &lt;X&gt; - demo_icon, 20px regular");
  });

  test("异步扫描只选 regular 候选中的最优回退尺寸并排序", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "office-fluent-icons-test-"));
    try {
      await Promise.all([
        writeFile(path.join(root, "zeta_20_regular.svg"), "z"),
        writeFile(path.join(root, "zeta_24_regular.svg"), "z"),
        writeFile(path.join(root, "alpha_28_regular.svg"), "a"),
        writeFile(path.join(root, "ignored_64_regular.svg"), "i"),
        writeFile(path.join(root, "filled_24_filled.svg"), "f"),
        writeFile(path.join(root, "invalid.svg"), "x"),
      ]);
      await expect(listAvailableRegularIcons(root)).resolves.toEqual([
        { sourceName: "alpha", size: 28, filePath: path.join(root, "alpha_28_regular.svg"), fileName: "alpha_28_regular.svg" },
        { sourceName: "zeta", size: 24, filePath: path.join(root, "zeta_24_regular.svg"), fileName: "zeta_24_regular.svg" },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("findIconFile 按回退尺寸查找并对缺失来源抛错", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "office-fluent-icons-test-"));
    try {
      await mkdir(root, { recursive: true });
      await writeFile(path.join(root, "demo_28_regular.svg"), "svg");
      expect(findIconFile(root, "demo")).toEqual({
        filePath: path.join(root, "demo_28_regular.svg"),
        size: 28,
      });
      expect(() => findIconFile(root, "missing")).toThrow("Missing Fluent UI icon: missing");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("license metadata、README 和预览页输出保持可消费结构", () => {
    expect(sourceAudit.license).toBe("MIT");
    expect(sourceAudit.packageSpec).toBe("@fluentui/svg-icons@1.1.330");
    const manifest = {
      label: "Office Fluent 兼容图标库",
      totalIcons: 1,
      categories: [{ id: "documents", label: "文档", description: "desc", icons: [{ id: "save", name: "Save", file: "documents/save.svg", sourceName: "save", license: "MIT", pickedBy: "curated" }] }],
    };
    expect(renderReadme(manifest)).toContain("License: MIT");
    const html = renderPreviewHtml(manifest);
    expect(html).toContain('data-category="documents"');
    expect(html).toContain("save");
    expect(html).toContain("当前显示");
  });
});

// ---------------------------------------------------------------------------
// 以下三组针对未覆盖分支：L1635（空模式守卫）、L1667（正则先试 rawName
// 再试 normalizedName 的落空分支）、L2159（CLI 入口守卫的 && 短路）。
//
// ⚠ 生成脚本的三条硬约束，这三组用例都必须遵守：
//   1. 输出目录指向仓库内 tmp/，绝不写真实资源目录；
//   2. 不联网下载图标。L2159 的真侧 generateOfficeFluentIcons() 会先
//      rm/mkdir 硬编码的 data/icon-library/office-fluent-compatible（污染真实
//      资源树），再 npm pack 联网取包（离线必失败）—— 故这里只覆盖守卫的短路侧；
//   3. 只喂最小夹具，全部走导出的纯函数，不产生任何文件。
// ---------------------------------------------------------------------------

describe("generate-office-fluent-icons 未覆盖分支", () => {
  // L1635: if (patternTokens.length === 0) { return false; }
  // 判别输入是「模式本身没有 token」，而不是「token 为空数组」——
  // 后者会让 nameTokens 产出非空列表，压根走不到这条守卫。
  // 反向对照（tokens 为空）在这里是恒等的：some 在空数组上同样返回 false，
  // 它证明不了守卫，只说明 tokens 也必须非空，见下方非空模式对照。
  test("tokenMatchesPattern 对无 token 的模式直接返回 false", () => {
    const tokens = nameTokens("arrow_sync_circle");
    expect(tokenMatchesPattern(tokens, "")).toBe(false);
    expect(tokenMatchesPattern(tokens, null)).toBe(false);
    expect(tokenMatchesPattern(tokens, "---")).toBe(false);
    // 守卫删掉后：[].every(...) === true → some 返回 true → 上面三条变 true；
    // categoryMatchScore 这条调用方也会从 0 变成 4。
    expect(categoryMatchScore("arrow_sync_circle", [""])).toBe(0);
    // 非空模式作对照：守卫不参与，但断言仍要证明 tokens 非空时匹配逻辑是活的
    expect(categoryMatchScore("arrow_sync_circle", ["sync_circle"])).toBe(6);
    expect(tokenMatchesPattern(tokens, "sync_circle")).toBe(true);
    expect(tokenMatchesPattern(tokens, "circle_sync")).toBe(false);
    // 记录一条可证等价的输入：tokens 也为空时，守卫在/不在都返回 false
    // （[].some 同样短路）。判别输入必须同时满足「模式无 token」+「tokens 非空」。
    expect(tokenMatchesPattern([], "")).toBe(false);
  });

  // L1667: if (pattern.test(rawName)) 落空后的 fall-through
  //   → pattern.lastIndex = 0; return pattern.test(normalizedName);
  // 判别输入：名称里带 [-] 或空白，rawName 与 normalizedName 不同。
  // 四条断言分别对应 rawName 侧 / fall-through 侧 / 两侧皆不中：
  //   ① 若把 fall-through 的返回删掉或写死 false → ① 变 false；
  //   ② 若把门控从 rawName 换成 normalizedName → ② 变 false（③ 仍 true）；
  //   ④ 排除「fall-through 恒返回 true」。
  test("categoryRejectsSourceName 对正则先试 rawName 再试规范化名", () => {
    expect(categoryRejectsSourceName("line-horizontal", [/line_horizontal/])).toBe(true);
    expect(categoryRejectsSourceName("arrow  left", [/^arrow_left$/])).toBe(true);
    // 只有 rawName 侧能命中：若门控被换成 normalizedName，此条会变 false
    expect(categoryRejectsSourceName("line-horizontal", [/^line-/])).toBe(true);
    // 两侧都不命中：证明 fall-through 的返回值不是恒 true
    expect(categoryRejectsSourceName("line-horizontal", [/^never_matches$/])).toBe(false);
  });

  // L2159: if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  // 只覆盖 && 的短路侧（process.argv[1] 为 falsy）。
  // 真侧不可达，如实记录代价：generateOfficeFluentIcons() 第一件事就是
  //   rm(tempDir) + rm(outputDir) + mkdir(packDir/extractDir/outputDir)，
  // 其中 outputDir 是模块级常量 data/icon-library/office-fluent-compatible（L12）——
  // 该目录当前不存在（force:true 时 rm 是空操作），但 mkdir 会把一整棵生成的图标树
  // 写进仓库受版本管理的 data/icon-library/ 下；紧接着 run("npm pack @fluentui/svg-icons@1.1.330")
  // 联网取包，本机离线 → status≠0 → run() 抛错，且 timeout 上限 120s。
  // 即：触达真侧 = 污染真实资源树 + 联网 + 一次 120s 级失败，故不触达。
  // 判别输入必须是 "" 而不是模块自身路径：path.resolve("") 返回 cwd 且不抛错，
  // 于是删掉 && 之后模块仍能加载，而「path.resolve 被以空串调用过」变成可断言的量。
  // 若喂 null，删掉 && 会让 path.resolve(null) 抛 ERR_INVALID_ARG_TYPE —— 那是崩溃型 RED。
  test("CLI 入口守卫在 process.argv[1] 为空时短路，不去解析脚本路径", async () => {
    const originalArgv1 = process.argv[1];
    const resolveCalls = [];
    const originalResolve = path.resolve.bind(path);
    const spy = vi.spyOn(path, "resolve").mockImplementation((...args) => {
      resolveCalls.push(args);
      return originalResolve(...args);
    });
    try {
      process.argv[1] = "";
      vi.resetModules();
      const reimported = await import("./generate-office-fluent-icons.mjs");
      // 导出函数实例与静态导入的不同 → 模块确实被重新求值，守卫确实跑过一次
      expect(reimported.tokenMatchesPattern).not.toBe(tokenMatchesPattern);
      // 探针有效性自检：模块顶层 L11 会调 path.resolve，spy 挂上了才会记到
      expect(resolveCalls.length).toBeGreaterThan(0);
      // 被测契约：没有任何一次 path.resolve 收到空串（&& 短路生效）
      expect(resolveCalls.filter((args) => args[0] === "")).toEqual([]);
    } finally {
      process.argv[1] = originalArgv1;
      spy.mockRestore();
      vi.resetModules();
    }
  });
});
