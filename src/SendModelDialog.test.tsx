// 发送模型弹窗：SSR 静态标记断言（不依赖 DOM 环境，与项目其它组件测试同模式）
// + 请求装配纯函数契约。端到端 multipart 行为见 server/sendModel.test.mjs。
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { SendModelDialog, buildSendRequest } from "./SendModelDialog";

const scope = {
  projectName: "模型甲",
  activeSchemeKey: "scheme-1",
  schemePathForScheme: () => ["方案A", "子方案"],
  activeProjectKey: "project-7",
  schemes: [
    { id: "scheme-1", name: "方案A", projects: [{ id: "project-7", name: "模型甲", project: { idx: 7 } }] }
  ],
  findSavedProjectRecordInSchemes: (schemes: Array<Record<string, any>>, projectId: string) => {
    for (const scheme of schemes) {
      const project = (scheme.projects ?? []).find((item: Record<string, any>) => item.id === projectId);
      if (project) {
        return { scheme, project };
      }
    }
    return null;
  }
};

function render(props: Record<string, unknown>) {
  return renderToStaticMarkup(
    <SendModelDialog open onClose={() => undefined} scope={scope} {...props} />
  );
}

describe("SendModelDialog", () => {
  test("open 为 false 时不渲染", () => {
    expect(renderToStaticMarkup(<SendModelDialog open={false} onClose={() => undefined} scope={scope} />)).toBe("");
  });

  test("渲染标题、URL 输入与四种格式及各自编码选择", () => {
    const html = render({});
    expect(html).toContain("发送模型");
    expect(html).toContain("目标 URL");
    expect(html).toContain('id="send-model-url"');
    expect(html).toContain('id="send-model-format-e"');
    expect(html).toContain('id="send-model-format-json"');
    expect(html).toContain('id="send-model-format-svg"');
    expect(html).toContain('id="send-model-format-cim"');
    expect(html).toContain('id="send-model-encoding-e"');
    expect(html).toContain('id="send-model-encoding-cim"');
    expect(html).toContain('id="send-model-submit"');
    expect(html).toContain('id="send-model-cancel"');
    expect(html).toContain("E 文件");
    expect(html).toContain("CIM/XML");
  });

  test("默认只勾 E 文件，且其编码默认 GBK", () => {
    const html = render({});
    // 四个 Checkbox 中仅一个带选中样式
    expect(html.match(/ant-checkbox-checked/g) ?? []).toHaveLength(1);
    expect(html).toContain(">GBK<");
    expect(html).toContain(">UTF-8<");
  });

  test("右侧展示接收端示例：Python / Node 页签、语法高亮、复制按钮", () => {
    const html = render({});
    expect(html).toContain("接收端示例");
    expect(html).toContain('id="send-model-sample-tabs"');
    expect(html).toContain("Python");
    expect(html).toContain("Node.js");
    expect(html).toContain('id="send-model-sample-copy"');

    // 两段代码都在 DOM 中，默认只显示 Python（Node 面板 display:none）
    expect(html).toContain('id="send-model-sample-code-python"');
    expect(html).toContain('id="send-model-sample-code-node"');
    expect(html).toContain("display:none");

    // 语法高亮：highlight.js 输出的 span class
    expect(html).toContain("hljs-keyword");
    // 代码块逐行渲染并带行号
    expect(html).toContain("send-model-code-line-number");
    // 左栏格式说明
    expect(html).toContain("格式说明");
    expect(html).toContain("send-model-note-kind");
    expect(html).toContain("IEC 61970 CIM16");

    // 契约要点：高亮会把标识符包进 span，逐字断言改看源码
    const source = readFileSync(new URL("./SendModelDialog.tsx", import.meta.url), "utf8");
    expect(source).toContain("request.files.get(field)");
    expect(source).toContain("formData()");
    expect(source).toContain("value.arrayBuffer()");
    expect(source).toContain("e_file");
    expect(source).toContain("iconv.decode");
  });

  test("可选择 E 文件模板，并随请求下发 templateName", () => {
    const html = render({});
    expect(html).toContain('id="send-model-template"');
    expect(html).toContain("默认（按模型当前配置导出）");

    const files = [{ kind: "e", encoding: "gbk" }];
    const withTemplate = buildSendRequest(scope, "http://x/y", files, "配网实时库");
    expect(JSON.parse(withTemplate.init.body)).toEqual({
      url: "http://x/y",
      files,
      templateName: "配网实时库"
    });

    // 未选模板时不带该字段，body 与旧调用逐字节一致
    const withoutTemplate = buildSendRequest(scope, "http://x/y", files);
    expect(JSON.parse(withoutTemplate.init.body)).toEqual({ url: "http://x/y", files });
  });

  test("发送成功后保留弹窗，不再调用 onClose", () => {
    const source = readFileSync(new URL("./SendModelDialog.tsx", import.meta.url), "utf8");
    const successBranch = source.slice(
      source.indexOf('scope.showGlobalMessage?.("发送成功")'),
      source.indexOf("} catch (err) {")
    );

    expect(successBranch).toContain("setSuccess");
    expect(successBranch).not.toContain("onClose()");
  });
});

describe("buildSendRequest", () => {
  test("优先用 modelId 指定模型（与方案路径解耦），body 只带目标地址与格式清单", () => {
    const files = [{ kind: "e", encoding: "gbk" }, { kind: "svg", encoding: "utf-8" }];
    const { requestUrl, init } = buildSendRequest(scope, "http://10.0.0.9:8080/receive", files);

    expect(requestUrl).toContain("/v1/schemes/model/send?modelId=7");
    expect(requestUrl).not.toContain("schemePath=");
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ url: "http://10.0.0.9:8080/receive", files });
  });

  test("未分配 idx 的模型回退 schemePath + name，方案路径缺失时回落默认方案", () => {
    const { requestUrl } = buildSendRequest({ projectName: "模型乙" }, "http://x/y", []);
    expect(requestUrl).not.toContain("modelId=");
    expect(requestUrl).toContain(`schemePath=${encodeURIComponent(JSON.stringify(["默认方案"]))}`);
    expect(requestUrl).toContain(`name=${encodeURIComponent("模型乙")}`);
  });
});

// ---------------------------------------------------------------------------
// 未覆盖分支补测，分两类走两条不同的路子：
//
// A. 行为断言（L147 currentModelIndex 的守卫、L158 projectName 的兜底）——
//    两者都能通过导出的纯函数 buildSendRequest 观察到下游 URL，夹具按 §6.13
//    挑「能真正让右臂/反向分支求值」的输入（键不存在、正的非整数 idx）。
//
// B. 静态源码守卫（L118 / L226 / L360 / L363 / L394）——
//    这些是组件内部私有逻辑或模块级常量：状态只能由交互改写，而本仓 vitest 是
//    environment:"node"（无 jsdom），renderToStaticMarkup 只能产出「初始 state」
//    那一帧，任何输出断言都看不到它们。故按行谓词钉死源码里的构造行，并配
//    「检测逻辑自测」证明扫描器在被注入变异时真能转红（不是恒绿空跑）。
// ---------------------------------------------------------------------------

const SOURCE = readFileSync(new URL("./SendModelDialog.tsx", import.meta.url), "utf8");

/**
 * 逐行找出 JSX 短路状态行（形如 `{error && (` 或 `{!error && success && (`）。
 * 谓词按「行」过滤而非按文件跳过：按文件跳过会把定义行本身也排除，
 * 于是注入到同一文件的变异全被漏掉。
 */
function findJsxGuardLines(source: string, required: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\{!?[A-Za-z_$][\w$]*(?: && [A-Za-z_$][\w$]*)* && \($/.test(line) && line.includes(required));
}

/** 逐行找出复制按钮的三元文案行（已复制 / 复制失败 / 复制）。 */
function findCopyLabelLines(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{copyState?.key ===") && line.endsWith(': "复制"}'));
}

/** 逐行找出示例语言的回退求值行（L118）。 */
function findLanguageFallbackLines(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^const language = RECEIVER_SAMPLE_LANGUAGES\[/.test(line));
}

/** 逐行找出当前示例定义的求值行（L226）。 */
function findActiveSampleLines(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^HIGHLIGHTED_SAMPLES\.find\(/.test(line));
}

/** 源码里 RECEIVER_SAMPLES 声明的示例 key 列表。 */
function parseSampleKeys(source: string): string[] {
  return [...source.matchAll(/^[ \t]*key: "([a-z]+)",$/gm)].map((match) => match[1]);
}

/** 源码里 RECEIVER_SAMPLE_LANGUAGES 字面量的语言键列表。 */
function parseLanguageKeys(source: string): string[] {
  const literal = source.match(/const RECEIVER_SAMPLE_LANGUAGES[^=]*=\s*\{([^}]*)\}/);
  return literal ? [...literal[1].matchAll(/([A-Za-z_$][\w$]*)\s*:\s*"/g)].map((match) => match[1]) : [];
}

/**
 * 源码里示例页签 Segmented 的选项 value 列表。
 * 必须锚在 tabs id 之后找 options 行：编码选择器那一行同为
 * `value: "utf-8"` / `value: "gbk"` 的 options，全局扫会混进编码档。
 */
function parseSampleTabValues(source: string): string[] {
  const lines = source.split(/\r?\n/);
  const anchor = lines.findIndex((line) => line.includes('id="send-model-sample-tabs"'));
  if (anchor < 0) return [];
  const optionsLine = lines.slice(anchor, anchor + 8).find((line) => line.includes("options={["));
  return optionsLine ? [...optionsLine.matchAll(/value:\s*"([^"]+)"/g)].map((match) => match[1]) : [];
}

describe("静态守卫的检测逻辑自测", () => {
  // 每条合成输入都刻意包含一种「守卫真的被改坏」之后的形态；扫描器必须照样
  // 把它报出来。只有这样，真被注入时这条守卫才会转红，而不是恒绿空跑。
  const LEGAL_JSX = "          {error && (";
  const MUTATED_JSX = "          {success && (";

  test("findJsxGuardLines 能报出目标行，也能报出被换掉状态变量的形态", () => {
    const synthetic = [LEGAL_JSX, "          {!error && success && (", MUTATED_JSX, 'const error = "";'].join("\n");
    expect(findJsxGuardLines(synthetic, "{error && (")).toEqual(["{error && ("]);
    expect(findJsxGuardLines(synthetic, "{success && (")).toEqual(["{success && ("]);
    expect(findJsxGuardLines(synthetic, "{!error && success && (")).toEqual(["{!error && success && ("]);
    expect(findJsxGuardLines(synthetic, "{missing && (")).toEqual([]);
  });

  test("findCopyLabelLines 对改字面值、翻条件、换兜底文案都会报出来", () => {
    const legal = '{copyState?.key === activeSample ? (copyState.ok ? "已复制" : "复制失败") : "复制"}';
    const wrongText = '{copyState?.key === activeSample ? (copyState.ok ? "复制成功" : "复制失败") : "复制"}';
    const flippedCondition = '{copyState?.key === activeSample ? (!copyState.ok ? "已复制" : "复制失败") : "复制"}';
    expect(findCopyLabelLines(`    ${legal}`)).toEqual([legal]);
    expect(findCopyLabelLines(`    ${wrongText}`)).toEqual([wrongText]);
    expect(findCopyLabelLines(`    ${flippedCondition}`)).toEqual([flippedCondition]);
    // 兜底文案被换掉后谓词不再命中 → 报空，等价于「该行被删」
    expect(findCopyLabelLines(`    ${legal.replace(': "复制"}', ': "复制码"}')}`)).toEqual([]);
  });

  test("findLanguageFallbackLines / findActiveSampleLines 对删右臂与换右臂都会报出来", () => {
    const legalLang = 'const language = RECEIVER_SAMPLE_LANGUAGES[sample.key] ?? "javascript";';
    const droppedArm = "const language = RECEIVER_SAMPLE_LANGUAGES[sample.key];";
    const wrongLang = 'const language = RECEIVER_SAMPLE_LANGUAGES[sample.key] ?? "python";';
    expect(findLanguageFallbackLines(`  ${legalLang}`)).toEqual([legalLang]);
    expect(findLanguageFallbackLines(`  ${droppedArm}`)).toEqual([droppedArm]);
    expect(findLanguageFallbackLines(`  ${wrongLang}`)).toEqual([wrongLang]);

    const legalDef = "HIGHLIGHTED_SAMPLES.find((sample) => sample.key === activeSample) ?? HIGHLIGHTED_SAMPLES[0];";
    const droppedDef = "HIGHLIGHTED_SAMPLES.find((sample) => sample.key === activeSample);";
    const wrongDef = "HIGHLIGHTED_SAMPLES.find((sample) => sample.key === activeSample) ?? HIGHLIGHTED_SAMPLES[1];";
    expect(findActiveSampleLines(`    ${legalDef}`)).toEqual([legalDef]);
    expect(findActiveSampleLines(`    ${droppedDef}`)).toEqual([droppedDef]);
    expect(findActiveSampleLines(`    ${wrongDef}`)).toEqual([wrongDef]);
  });

  test("parseSampleKeys / parseLanguageKeys / parseSampleTabValues 在合成源码上可用", () => {
    const synthetic = [
      'const RECEIVER_SAMPLE_LANGUAGES: Record<string, string> = { python: "python", ruby: "ruby" };',
      "const RECEIVER_SAMPLES = [",
      '    key: "python",',
      '    key: "node",',
      "];",
      '      id="send-model-sample-tabs"',
      '      options={[{ value: "python", label: "Python" }, { value: "node", label: "Node.js" }]}'
    ].join("\n");
    expect(parseSampleKeys(synthetic)).toEqual(["python", "node"]);
    expect(parseLanguageKeys(synthetic)).toEqual(["python", "ruby"]);
    expect(parseSampleTabValues(synthetic)).toEqual(["python", "node"]);
    // 目标缺失时必须报空而不是把别处的同款字面量捡进来
    expect(parseSampleKeys("const RECEIVER_SAMPLES = [];")).toEqual([]);
    expect(parseLanguageKeys("const OTHER = 1;")).toEqual([]);
    expect(parseSampleTabValues("const OTHER = 1;")).toEqual([]);
  });
});

describe("静态源码守卫：组件内部私有分支（无 DOM，输出断言不可见）", () => {
  test("L118 示例语言查不到时回退 javascript", () => {
    expect(findLanguageFallbackLines(SOURCE)).toEqual([
      'const language = RECEIVER_SAMPLE_LANGUAGES[sample.key] ?? "javascript";'
    ]);
  });

  test("L118 的 ?? 右臂不可达：语言表覆盖全部示例 key（钉住该前提）", () => {
    const sampleKeys = parseSampleKeys(SOURCE);
    const languageKeys = parseLanguageKeys(SOURCE);
    expect(sampleKeys.length).toBeGreaterThan(0);
    expect(languageKeys.length).toBeGreaterThan(0);
    for (const key of sampleKeys) {
      expect(languageKeys).toContain(key);
    }
  });

  test("L226 当前示例定义找不到时回退首个示例", () => {
    expect(findActiveSampleLines(SOURCE)).toEqual([
      "HIGHLIGHTED_SAMPLES.find((sample) => sample.key === activeSample) ?? HIGHLIGHTED_SAMPLES[0];"
    ]);
  });

  test("L226 的 ?? 右臂不可达：页签 value 覆盖全部示例 key（钉住该前提）", () => {
    const tabValues = parseSampleTabValues(SOURCE);
    expect([...tabValues].sort()).toEqual(["node", "python"]);
    for (const key of parseSampleKeys(SOURCE)) {
      expect(tabValues).toContain(key);
    }
  });

  test("L360 错误文案块由 error 真值门控", () => {
    expect(findJsxGuardLines(SOURCE, "{error && (")).toEqual(["{error && ("]);
  });

  test("L363 成功文案块要求 error 为空且 success 非空（错误优先，不与 L360 同时渲染）", () => {
    expect(findJsxGuardLines(SOURCE, "{!error && success && (")).toEqual(["{!error && success && ("]);
  });

  test("L394 复制按钮文案按 copyState 分 已复制 / 复制失败 / 复制", () => {
    expect(findCopyLabelLines(SOURCE)).toEqual([
      '{copyState?.key === activeSample ? (copyState.ok ? "已复制" : "复制失败") : "复制"}'
    ]);
  });
});

describe("buildSendRequest 未覆盖分支（行为断言）", () => {
  const schemePathOf = ["方案B", "子方案B"];
  const scopeWithIdx = (idx: unknown) => ({
    projectName: "模型丙",
    activeSchemeKey: "scheme-B",
    schemePathForScheme: () => schemePathOf,
    findSavedProjectRecordInSchemes: () => ({ scheme: {}, project: { project: { idx } } })
  });
  const noRecordScope = {
    projectName: "模型丙",
    activeSchemeKey: "scheme-B",
    schemePathForScheme: () => schemePathOf,
    findSavedProjectRecordInSchemes: () => null
  };

  test("L147 模型序号不是正安全整数时一律回退 0，绝不下发 modelId", () => {
    // 1.5 与 1e21 是判别档：它们是正数，守卫一旦被删或从 isSafeInteger 放宽成
    // isInteger，就会以 modelId=1.5 / 1e+21 下发。只给 0 / 负数 / NaN 的话，
    // 调用方的 modelId > 0 会把差异抹平，断言就恒绿了。
    for (const idx of [1.5, 1e21, 0, -3, "abc", null, undefined]) {
      const { requestUrl } = buildSendRequest(scopeWithIdx(idx), "http://x/y", []);
      expect(requestUrl).not.toContain("modelId=");
      expect(requestUrl).toContain(`schemePath=${encodeURIComponent(JSON.stringify(schemePathOf))}`);
      expect(requestUrl).toContain(`name=${encodeURIComponent("模型丙")}`);
    }
    // 对照档：正的安全整数确实走 modelId 分支，否则上面几条全是恒绿
    expect(buildSendRequest(scopeWithIdx(9), "http://x/y", []).requestUrl).toContain("modelId=9");
  });

  test("L147 查不到已保存记录时同样回退 0（可选链整条为 undefined）", () => {
    const { requestUrl } = buildSendRequest(noRecordScope, "http://x/y", []);
    expect(requestUrl).not.toContain("modelId=");
    expect(requestUrl).toContain(`schemePath=${encodeURIComponent(JSON.stringify(schemePathOf))}`);
  });

  test("L158 projectName 缺失 / null / 空串回退空串，数字 0 不被当成空（?? 而非 ||）", () => {
    // 用 searchParams 取值做相等断言：`toContain("&name=")` 只是前缀匹配，
    // 任何非空名字都满足，兜底被换成别的值时它照样绿。
    const nameOf = (scope: Record<string, any>) =>
      new URL(buildSendRequest(scope, "http://x/y", []).requestUrl, "http://localhost").searchParams.get("name");
    // 键必须「不存在」，?? 右臂才会被求值：noRecordScope 本身带 projectName，
    // 直接展开它等于把键以真值带进去，右臂从未求值，整条断言恒绿（§6.13）。
    // 写成 projectName: "" 同理会被 ?? 短路。键不存在时下游是
    // encodeURIComponent，undefined 会变成 "undefined" 字面量，所以删掉兜底可观测。
    const bareScope = {
      activeSchemeKey: "scheme-B",
      schemePathForScheme: () => schemePathOf,
      findSavedProjectRecordInSchemes: () => null
    };
    expect("projectName" in bareScope).toBe(false);
    expect(nameOf(bareScope)).toBe("");
    expect(nameOf({ ...bareScope, projectName: null })).toBe("");
    expect(nameOf({ ...bareScope, projectName: "" })).toBe("");
    // falsy 但非 nullish：0 / false 必须原样带出去，否则 ?? 就退化成了 ||
    expect(nameOf({ ...bareScope, projectName: 0 })).toBe("0");
    expect(nameOf({ ...bareScope, projectName: false })).toBe("false");
    // 对照档：正常名字原样透传（含需转义的字符）
    expect(nameOf({ ...bareScope, projectName: "模型 丙/一" })).toBe("模型 丙/一");
  });
});
