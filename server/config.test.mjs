// server/config.mjs 的取值优先级与前缀运算。
//
// 这个模块决定**每一条后端路由的 API 前缀**和**前端 Vite base**。它错的方式很安静：
// 值不是不合法，而是没被剥掉 —— 表现为「后端起来了但所有 /api/v1 端点 404」、
// 「前端挂在子路径下时静态资源 404」，没有任何异常。
//
// 关键约束：host / port / apiPrefix / frontendPrefix 全在**模块求值时**从
// process.env 与 platform.config.json 读一次并冻结成常量，所以不同取值组合没法在
// 同一进程里 import 出来。下面用一个子进程 + import() 的 query 参数做缓存击穿，
// 在**一个**子进程里跑完全部组合（Node ESM 以 query 区分同一文件的多次求值）。
//
// 本文件是纯 JS：.test.mjs 里出现 TS 语法会触发 RollupError，表现为
// 「Tests: no tests」，而 no tests 看起来像通过 —— 绝不能当绿。
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";

import { apiPath, apiPattern, escapeRegExp, frontendPrefix, stripFrontendBase } from "./config.mjs";

const configUrl = pathToFileURL(fileURLToPath(new URL("./config.mjs", import.meta.url))).href;

const ENV_KEYS = [
  "IMAGE_SERVER_HOST",
  "VITE_PORT",
  "IMAGE_SERVER_PORT",
  "GRAPH_MODEL_API_PREFIX",
  "GRAPH_MODEL_FRONTEND_PREFIX",
  "GRAPH_MODEL_CONFIG"
];

/**
 * 在一个子进程里按给定环境变量组合逐个加载 config.mjs，返回每次的导出快照。
 * @param {Array<Record<string, string | null>>} cases 每项是要设置的环境变量，值为 null 表示删除
 */
const loadWithEnv = (cases) => {
  const script = `
    const target = ${JSON.stringify(configUrl)};
    const keys = ${JSON.stringify(ENV_KEYS)};
    const cases = ${JSON.stringify(cases)};
    const out = [];
    for (const [index, patch] of cases.entries()) {
      for (const key of keys) delete process.env[key];
      for (const [key, value] of Object.entries(patch)) {
        if (value !== null) process.env[key] = value;
      }
      const mod = await import(target + "?case=" + index);
      out.push({
        host: mod.host,
        frontendPort: mod.frontendPort,
        backendPort: mod.backendPort,
        apiPrefix: mod.apiPrefix,
        frontendPrefix: mod.frontendPrefix,
        apiPathSlash: mod.apiPath("/images"),
        apiPatternSource: mod.apiPattern("/images").source,
        apiPatternFlags: mod.apiPattern("/images").flags,
        escapeRegExpType: typeof mod.escapeRegExp,
        stripIcon: mod.stripFrontendBase("/app/icon-library/x"),
        stripBare: mod.stripFrontendBase("/app"),
        stripApi: mod.stripFrontendBase("/api/v1/runtime/clients"),
        stripRoot: mod.stripFrontendBase("/"),
        stripOther: mod.stripFrontendBase("/other/thing"),
        stripApple: mod.stripFrontendBase("/apple/x"),
        stripShorter: mod.stripFrontendBase("/ap")
      });
    }
    process.stdout.write(JSON.stringify(out));
  `;
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" }));
};

/** 写一份临时 platform.config.json 并返回路径。 */
const configFileWith = (contents) => {
  const dir = mkdtempSync(join(tmpdir(), "gmp-config-"));
  const file = join(dir, "platform.config.json");
  writeFileSync(file, typeof contents === "string" ? contents : JSON.stringify(contents));
  return file;
};

describe("config.mjs 默认值", () => {
  // 仓库里没有 platform.config.json，所以没有环境变量时就是这五个值。
  // 它们是「不改配置时的行为基线」：动了等于所有开发者的默认端口都变。
  test("无环境变量、无配置文件时回落到既定默认值", () => {
    const [only] = loadWithEnv([{}]);
    expect(only.host).toBe("127.0.0.1");
    expect(only.frontendPort).toBe(5173);
    expect(only.backendPort).toBe(5174);
    expect(only.apiPrefix).toBe("/webgrp");
    expect(only.frontendPrefix).toBe("/");
  });

  test("apiPath 直接拼前缀", () => {
    expect(apiPath("/images")).toBe("/webgrp/images");
  });

  test("apiPattern 锚定在串接后的路径上，且带 u 标志", () => {
    const pattern = apiPattern("/images");
    expect(pattern.flags).toContain("u");
    expect(pattern.test("/webgrp/images/a.png")).toBe(true);
    // 锚定：不能匹配到中间出现的位置
    expect(pattern.test("/x/webgrp/images/a.png")).toBe(false);
  });

  test("apiPattern 里的前缀按字面量转义，不当正则元字符", () => {
    // 前缀含 "." 时不转义的话，/webXgrp 也会命中
    const [only] = loadWithEnv([{ GRAPH_MODEL_API_PREFIX: "/web.grp" }]);
    const pattern = new RegExp(only.apiPatternSource, "u");
    expect(pattern.test("/web.grp/images/a.png")).toBe(true);
    expect(pattern.test("/webXgrp/images/a.png")).toBe(false);
  });

  test("apiPattern 的 suffix 原样拼在后面（保留正则语法）", () => {
    expect(apiPattern("/images", "/?$").source).toBe("^\\/webgrp\\/images\\/?$");
  });

  test("escapeRegExp 是从 shared/regexEscape.mjs 转出的同一份", () => {
    // 正斜杠不是元字符、不转义。注意 RegExp.prototype.source 会在读出时把 /
    // 显示成 \/，所以别拿 source 的字面量去反推 escapeRegExp 的输出。
    expect(escapeRegExp("/webgrp/images")).toBe("/webgrp/images");
    expect(escapeRegExp("/a.b*c")).toBe("/a\\.b\\*c");
  });

  test("根部署时 stripFrontendBase 是恒等映射", () => {
    // 根部署下多剥一次斜杠，所有静态资源路径都会 404
    expect(frontendPrefix).toBe("/");
    expect(stripFrontendBase("/icon-library/x")).toBe("/icon-library/x");
    expect(stripFrontendBase("/")).toBe("/");
    // 注意：源码里那句 `if (frontendPrefix === "/") return pathname;` 是**等价分支** ——
    // 变异验证实测把它去掉后上面两条一样绿，因为 "/" 长度 1、slice(0) 就是原串。
    // 留着它是图省事的早退，不是被本文件守住的判定。
  });
});

describe("apiPrefix 取值", () => {
  test("环境变量可覆盖，且尾斜杠被剥掉", () => {
    const [only] = loadWithEnv([{ GRAPH_MODEL_API_PREFIX: "/api///" }]);
    // 不剥的话路由会变成 /api///images，与前端拼的 /api/images 对不上
    expect(only.apiPrefix).toBe("/api");
    expect(only.apiPathSlash).toBe("/api/images");
  });

  test("只有一个尾斜杠时也剥", () => {
    const [only] = loadWithEnv([{ GRAPH_MODEL_API_PREFIX: "/api/" }]);
    expect(only.apiPrefix).toBe("/api");
  });

  test("缺前导斜杠时原样保留（不擅自补）", () => {
    // 钉住现状：补斜杠等于替调用方改配置，配置写错时应当看得见而不是被悄悄修正
    const [only] = loadWithEnv([{ GRAPH_MODEL_API_PREFIX: "webgrp" }]);
    expect(only.apiPrefix).toBe("webgrp");
  });

  test("配置文件里的 backend.prefix 生效，且被环境变量压过", () => {
    const file = configFileWith({ backend: { prefix: "/from-file/", port: 6001 } });
    const [fromFile, fromEnv] = loadWithEnv([
      { GRAPH_MODEL_CONFIG: file },
      { GRAPH_MODEL_CONFIG: file, GRAPH_MODEL_API_PREFIX: "/from-env" }
    ]);
    expect(fromFile.apiPrefix).toBe("/from-file");
    expect(fromFile.backendPort).toBe(6001);
    expect(fromEnv.apiPrefix).toBe("/from-env");
  });
});

describe("host / port 取值", () => {
  test("端口经 Number 转换，字符串与数字等价", () => {
    const [only] = loadWithEnv([{ VITE_PORT: "3000", IMAGE_SERVER_PORT: "4000" }]);
    expect(only.frontendPort).toBe(3000);
    expect(only.backendPort).toBe(4000);
    expect(typeof only.frontendPort).toBe("number");
  });

  test("host 环境变量覆盖默认值", () => {
    const [only] = loadWithEnv([{ IMAGE_SERVER_HOST: "0.0.0.0" }]);
    expect(only.host).toBe("0.0.0.0");
  });

  test("配置文件里的 host / frontend.port 生效", () => {
    const file = configFileWith({ host: "10.0.0.5", frontend: { port: 8080 } });
    const [only] = loadWithEnv([{ GRAPH_MODEL_CONFIG: file }]);
    expect(only.host).toBe("10.0.0.5");
    expect(only.frontendPort).toBe(8080);
  });

  test("配置文件不存在或不是合法 JSON 时静默回落到默认值", () => {
    const [missing, broken] = loadWithEnv([
      { GRAPH_MODEL_CONFIG: join(tmpdir(), "gmp-config-does-not-exist.json") },
      { GRAPH_MODEL_CONFIG: configFileWith("{ not json") }
    ]);
    // 抛异常的话，服务在「配置文件写坏了」这种最需要它起来的场合反而起不来
    expect(missing.apiPrefix).toBe("/webgrp");
    expect(missing.backendPort).toBe(5174);
    expect(broken.apiPrefix).toBe("/webgrp");
    expect(broken.backendPort).toBe(5174);
  });

  test("JSON 语法错误时全部取值回落到默认值（既有行为，未因归一化而改动）", () => {
    // 补的是上面那条没覆盖的 host / frontendPort / frontendPrefix —— 那条只查了
    // apiPrefix 与 backendPort。此处把「坏 JSON 走 catch 分支」这条既有契约钉全，
    // 免得日后有人把 catch 分支删掉时只被上面那条的一半发现。
    const [only] = loadWithEnv([{ GRAPH_MODEL_CONFIG: configFileWith("{ not json") }]);
    expect(only.host).toBe("127.0.0.1");
    expect(only.frontendPort).toBe(5173);
    expect(only.backendPort).toBe(5174);
    expect(only.apiPrefix).toBe("/webgrp");
    expect(only.frontendPrefix).toBe("/");
  });
});

// ── 合法 JSON 但不是配置对象 ──────────────────────────────────────────────
//
// 关键事实：**只有字面 null 会在修复前真的抛错**。cfg 是数组 / 字符串 / 数字时，
// 属性访问不抛，只是返回 undefined —— 也就是说它们此前「碰巧」能工作。
//
// 变异验证记录：把 readConfig 里的判定从
//   parsed === null || typeof parsed !== "object" || Array.isArray(parsed)
// 缩成只剩 `parsed === null`，本组两条用例**全绿**（GREEN）。这不是漏测，是可证的等价：
//   - typeof 分支：JSON.parse 对字符串 / 数字产出原始值，其属性访问恒为 undefined，
//     与 {} 上的取值完全一致；
//   - Array.isArray 分支：JSON.parse 产出的数组带不上具名属性，cfg.host /
//     cfg.frontend?.port 同样恒为 undefined。
// 该等价成立的**前提**是取值只做具名属性访问。若日后改成 Object.assign(cfg, parsed)
// 之类会把数组下标 / 字符串长度混进配置的写法，这条记录就不再成立 —— 故下面第 2 条
// 把归一后的取值逐个钉死，作为那个前提的守卫。
// 真正承重的是第 1 条：去掉整个判定（含 null 分支）立即 RED。
describe("配置文件内容不是对象时的兜底", () => {
  test("配置文件内容是字面 null 时不抛错，全部取值回落到默认值", () => {
    // 修复前：JSON.parse("null") 得 null 且**不抛**，随后 cfg.host 在**模块求值期**
    // 抛 TypeError —— 子进程非零退出，execFileSync 抛，本用例立刻红。
    // 这也是本组唯一真正承重的判别用例。
    const [only] = loadWithEnv([{ GRAPH_MODEL_CONFIG: configFileWith("null") }]);
    expect(only.host).toBe("127.0.0.1");
    expect(only.frontendPort).toBe(5173);
    expect(only.backendPort).toBe(5174);
    expect(only.apiPrefix).toBe("/webgrp");
    expect(only.frontendPrefix).toBe("/");
    // 派生值也要可用：证明模块是**完整求值完了**，而不只是没抛异常。
    // 注意 frontendPrefix 此时是根，stripFrontendBase 是恒等映射（既有契约），
    // 所以 /app/icon-library/x 原样返回 —— 别把它当成「剥错了」。
    expect(only.apiPathSlash).toBe("/webgrp/images");
    expect(only.stripIcon).toBe("/app/icon-library/x");
    expect(only.stripRoot).toBe("/");
  });

  test("配置文件内容是数组、字符串或数字时不抛错，取值同样回落到默认值", () => {
    const [fromArray, fromString, fromNumber] = loadWithEnv([
      { GRAPH_MODEL_CONFIG: configFileWith('["a", "b"]') },
      { GRAPH_MODEL_CONFIG: configFileWith('"just-a-string"') },
      { GRAPH_MODEL_CONFIG: configFileWith("123") }
    ]);
    for (const only of [fromArray, fromString, fromNumber]) {
      expect(only.host).toBe("127.0.0.1");
      expect(only.frontendPort).toBe(5173);
      expect(only.backendPort).toBe(5174);
      expect(only.apiPrefix).toBe("/webgrp");
      expect(only.frontendPrefix).toBe("/");
      expect(only.apiPathSlash).toBe("/webgrp/images");
    }
  });
});

describe("端口不是有限数时的兜底", () => {
  test("端口环境变量不是有限数时回落到默认值", () => {
    // 一律指向不存在的配置文件：本组断言的是「环境变量这一侧」的兜底，不能被开发者
    // 本机那份 platform.config.json 影响（既有默认值用例有同样的隐含假设）。
    const noFile = { GRAPH_MODEL_CONFIG: join(tmpdir(), "gmp-config-absent-ports.json") };
    const [abc, blank, spaces, infinite, unset] = loadWithEnv([
      { ...noFile, VITE_PORT: "abc", IMAGE_SERVER_PORT: "abc" },
      { ...noFile, VITE_PORT: "", IMAGE_SERVER_PORT: "" },
      { ...noFile, VITE_PORT: "   ", IMAGE_SERVER_PORT: "\t" },
      { ...noFile, VITE_PORT: "Infinity", IMAGE_SERVER_PORT: "-Infinity" },
      { ...noFile }
    ]);
    // 判别点：修复前第一组得 NaN、第四组得 ±Infinity（Number("abc") / Number("Infinity")），
    // 两者都会让下面这两行红 —— 非有限端口会一路传到 server.listen 与 vite server.port。
    for (const only of [abc, blank, spaces, infinite, unset]) {
      expect(Number.isFinite(only.frontendPort)).toBe(true);
      expect(Number.isFinite(only.backendPort)).toBe(true);
    }
    // 再把真实值钉死（非有限与未设都落到既定默认值），免得有人用「返回 0」这类同样
    // 是有限数的糊法把这组变绿。
    for (const only of [abc, blank, spaces, infinite, unset]) {
      expect(only.frontendPort).toBe(5173);
      expect(only.backendPort).toBe(5174);
    }
  });

  test("配置文件里的端口不是数字时同样回落到默认值", () => {
    // 与上一条同一条代码路径的另一侧（配置文件而非环境变量）：cfg.frontend.port 同样
    // 会被 Number() 处理，漏掉它就等于只兜了一半。
    const file = configFileWith({ frontend: { port: "abc" }, backend: { port: "abc" } });
    const [only] = loadWithEnv([{ GRAPH_MODEL_CONFIG: file }]);
    expect(Number.isFinite(only.frontendPort)).toBe(true);
    expect(Number.isFinite(only.backendPort)).toBe(true);
    expect(only.frontendPort).toBe(5173);
    expect(only.backendPort).toBe(5174);
  });

  test("配置文件里的端口是 null 时回落到默认值，而不是 0", () => {
    // 判别力说明：Number(null) 是 0 且**是有限数**，所以「非有限则回落」这条兜底挡不住
    // 它 —— 0 传给 listen 意味着随机端口。取值链里的 ?? 只能挡住左操作数为 nullish 的
    // 情形，cfg.frontend.port 本身就是 null 时那条链给不出默认值，必须由 toPort 兜。
    // 换句话说：这条断言与上一条的判别来源不同（有限但为 0 vs 非有限），不是重复覆盖。
    const file = configFileWith({ frontend: { port: null }, backend: { port: null } });
    const [only] = loadWithEnv([{ GRAPH_MODEL_CONFIG: file }]);
    expect(Number.isFinite(only.frontendPort)).toBe(true);
    expect(Number.isFinite(only.backendPort)).toBe(true);
    expect(only.frontendPort).toBe(5173);
    expect(only.backendPort).toBe(5174);
  });

  test("配置文件里的 frontend / backend 不是对象时端口回落到默认值", () => {
    // 再往下一层的形状问题：frontend 写成字符串或数组时，cfg.frontend?.port 的可选链
    // 给的是 undefined（不抛），但写成 null 时可选链同样给 undefined —— 两种形状都
    // 不应让端口变成 NaN 或 0。
    const [asString, asArray, asNull] = loadWithEnv([
      { GRAPH_MODEL_CONFIG: configFileWith({ frontend: "oops", backend: "oops" }) },
      { GRAPH_MODEL_CONFIG: configFileWith({ frontend: [], backend: [] }) },
      { GRAPH_MODEL_CONFIG: configFileWith({ frontend: null, backend: null }) }
    ]);
    for (const only of [asString, asArray, asNull]) {
      expect(Number.isFinite(only.frontendPort)).toBe(true);
      expect(Number.isFinite(only.backendPort)).toBe(true);
      expect(only.frontendPort).toBe(5173);
      expect(only.backendPort).toBe(5174);
    }
  });
});

describe("正常配置文件不受兜底影响", () => {
  test("合法 JSON 对象加数字端口时取值与文件一致（防兜底误伤）", () => {
    // 兜底是「加在最外层」的：一旦误伤到合法输入，所有开发者的端口与前缀都会静默变默认。
    const file = configFileWith({
      host: "10.0.0.5",
      frontend: { port: 8080, prefix: "/app" },
      backend: { port: 6001, prefix: "/from-file/" }
    });
    const [only] = loadWithEnv([{ GRAPH_MODEL_CONFIG: file }]);
    expect(only.host).toBe("10.0.0.5");
    expect(only.frontendPort).toBe(8080);
    expect(only.backendPort).toBe(6001);
    expect(only.apiPrefix).toBe("/from-file");
    expect(only.frontendPrefix).toBe("/app/");
  });

  test("数字字符串端口仍按数字取值，不被兜底改写", () => {
    // 兜底判的是「有限性」而不是「类型」：若误改成 typeof 判数字，
    // 字符串端口（环境变量与 JSON 里都常见）会全被吃掉。
    const [only] = loadWithEnv([{ VITE_PORT: "3000", IMAGE_SERVER_PORT: "4000" }]);
    expect(only.frontendPort).toBe(3000);
    expect(only.backendPort).toBe(4000);
  });
});

describe("frontendPrefix 归一与 stripFrontendBase", () => {
  test("非根前缀补上尾斜杠", () => {
    // Vite base 要求非根值以 / 结尾，少了它相对路径资源会解析到上一层
    const [only] = loadWithEnv([{ GRAPH_MODEL_FRONTEND_PREFIX: "/app" }]);
    expect(only.frontendPrefix).toBe("/app/");
  });

  test("已带尾斜杠的不重复追加", () => {
    const [only] = loadWithEnv([{ GRAPH_MODEL_FRONTEND_PREFIX: "/app/" }]);
    expect(only.frontendPrefix).toBe("/app/");
  });

  test("缺前导斜杠时补上", () => {
    const [only] = loadWithEnv([{ GRAPH_MODEL_FRONTEND_PREFIX: "app" }]);
    expect(only.frontendPrefix).toBe("/app/");
  });

  test("空串与纯空白都归一到根", () => {
    const [empty, blank] = loadWithEnv([
      { GRAPH_MODEL_FRONTEND_PREFIX: "" },
      { GRAPH_MODEL_FRONTEND_PREFIX: "   " }
    ]);
    expect(empty.frontendPrefix).toBe("/");
    expect(blank.frontendPrefix).toBe("/");
  });

  test("配置文件里的 frontend.prefix 生效，且被环境变量压过", () => {
    const file = configFileWith({ frontend: { prefix: "/from-file" } });
    const [fromFile, fromEnv] = loadWithEnv([
      { GRAPH_MODEL_CONFIG: file },
      { GRAPH_MODEL_CONFIG: file, GRAPH_MODEL_FRONTEND_PREFIX: "/from-env" }
    ]);
    expect(fromFile.frontendPrefix).toBe("/from-file/");
    expect(fromEnv.frontendPrefix).toBe("/from-env/");
  });

  test("剥前缀：命中则去掉，不带 base 前缀的 API 路径原样返回", () => {
    const [only] = loadWithEnv([{ GRAPH_MODEL_FRONTEND_PREFIX: "/app" }]);
    expect(only.frontendPrefix).toBe("/app/");
    expect(only.stripIcon).toBe("/icon-library/x");
    // API 请求不以 base 开头，剥了就再也匹配不到路由
    expect(only.stripApi).toBe("/api/v1/runtime/clients");
    expect(only.stripOther).toBe("/other/thing");
  });

  test("base 本身（不带尾斜杠）匹配不上，原样返回", () => {
    // frontendPrefix 已归一成 "/app/"，所以 "/app" 不 startsWith 它。
    // 顺带说明：源码里那个 `|| "/"` 兜底在当前 startsWith 写法下永远走不到
    // —— 命中时 slice 至少会留下开头的 "/"。这里不替它写断言。
    const [only] = loadWithEnv([{ GRAPH_MODEL_FRONTEND_PREFIX: "/app" }]);
    expect(only.stripBare).toBe("/app");
  });

  test("根路径不被误剥", () => {
    const [only] = loadWithEnv([{ GRAPH_MODEL_FRONTEND_PREFIX: "/app" }]);
    expect(only.stripRoot).toBe("/");
  });

  test("相近前缀不误伤：/apple 与 /ap 都不该被 /app/ 剥掉", () => {
    // startsWith 判定写成裸 "/app" 就会把 /apple/x 剥成 le/x
    const [only] = loadWithEnv([{ GRAPH_MODEL_FRONTEND_PREFIX: "/app" }]);
    expect(only.stripApple).toBe("/apple/x");
    expect(only.stripShorter).toBe("/ap");
  });
});
