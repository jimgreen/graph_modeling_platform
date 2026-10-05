// index.html 内联 15s 启动提示的源码守卫。
//
// 缺陷本体：内联脚本 setTimeout 15 秒后 `document.getElementById("app-boot").appendChild(hint)`。
// 应用一旦启动成功就会把 #app-boot 整块摘掉，那时 getElementById 返回 null，
// 于是每次加载 15 秒后稳定抛一次 TypeError（真浏览器控制台可见，用户只看到白屏后的报错）。
//
// 为什么本守卫要「切出 <script> 块再断言」，而不是对整个 index.html 裸跑正则：
// index.html 里同一个字面量到处都是 —— <style> 里 12 处 #app-boot 选择器、
// body 里那行 <div id="app-boot"> 标记、还有本脚本自己（连注释里都提到了它）。
// 对全文做字面量扫描时，注释或 CSS 里的同名字面量会让断言恒绿或误红
// （仓内血泪：commit 18b49a46 对配置块做全文字面量扫描，注释里出现该字面量即误红）。
// 故这里只对内联脚本正文断言，CSS 与标记不进断言面。
//
// 断言主体是**真跑一遍脚本**（new Function 注入 document / setTimeout 替身），
// 不是纯文本匹配 —— 纯文本匹配分不清 `if (!boot) return;` 在不在 appendChild 之前，
// 而这正是本次修复的全部内容。
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const indexHtml = readFileSync(path.join(repoRoot, "index.html"), "utf8");

/** 只取不带 src 的内联脚本（排除 <script type="module" src="/src/main.tsx">）。 */
function inlineScriptBodies(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

const inlineBodies = inlineScriptBodies(indexHtml);
const bootHintBody = inlineBodies.find((body) => body.includes("app-boot"));

/**
 * 在替身 DOM 上真跑一遍内联脚本。
 * @param {{ bootPresent: boolean }} options bootPresent=false 模拟「应用已启动、#app-boot 被移除」
 * @returns {{ run: () => void; appended: object[]; delay: () => number }}
 */
function runBootHintScript({ bootPresent }) {
  const appended = [];
  const bootNode = {
    id: "app-boot",
    appendChild(node) {
      appended.push(node);
    }
  };
  const documentStub = {
    getElementById: (id) => (id === "app-boot" && bootPresent ? bootNode : null),
    // 遮罩里还没有 .boot-hint（首次 15s 超时），故走「新建 + 追加」分支。
    // 若这里回真值，脚本会认为提示已存在而跳过追加 —— 那就变成在测「去重」而非「追加」，
    // appended 会恒为空，看起来像守卫失灵。
    querySelector: () => null,
    createElement: () => ({ className: "", textContent: "" })
  };
  let scheduled = null;
  let delay = null;
  const setTimeoutStub = (fn, ms) => {
    scheduled = fn;
    delay = ms;
  };
  // eslint-disable-next-line no-new-func
  new Function("document", "setTimeout", bootHintBody)(documentStub, setTimeoutStub);
  return {
    appended,
    delay: () => delay,
    run: () => scheduled()
  };
}

describe("index.html 启动提示（#app-boot 已移除时的 TypeError 守卫）", () => {
  test("元断言：内联提示脚本仍在（整段被删则本文件其余断言全部失去对象）", () => {
    expect(
      bootHintBody,
      "index.html 里找不到含 app-boot 的内联 <script>：提示脚本被删除或移进了带 src 的脚本，本守卫会静默失效"
    ).toBeTypeOf("string");
    // 明确钉住「定时器」这一形态：若日后改成 requestAnimationFrame 轮询，本条会提醒重写用例
    expect(bootHintBody).toMatch(/setTimeout\s*\(/);
    expect(bootHintBody).toContain("appendChild");
  });

  test("遮罩仍在时：15s 后把提示追加进 #app-boot 那个容器", () => {
    const { run, appended } = runBootHintScript({ bootPresent: true });
    run();
    expect(appended, "遮罩存在时必须追加一条提示").toHaveLength(1);
    expect(appended[0].className).toBe("boot-hint");
    // 文案逐字钉住：这是提示里唯一对用户说的话，改动必须是有意的
    expect(appended[0].textContent).toBe("加载耗时较长，请确认后端服务（5174 端口）已启动。");
  });

  test("追加目标是 body 里的 #app-boot 遮罩本身（不是 head、也不是新建容器）", () => {
    // 容器身份：脚本追加的目标是 document.getElementById("app-boot") 返回的那个节点，
    // 即 body 里那行 <div id="app-boot" role="status">，不是 document.body、不是 head。
    const getById = bootHintBody.match(/getElementById\(\s*"app-boot"\s*\)/);
    expect(getById, "脚本必须把提示挂到 #app-boot 上").not.toBeNull();
    expect(bootHintBody).not.toContain("document.head");

    // 遮罩标记确实在 </head> 之后（body 内），且在模块入口脚本之前
    const bootDivIndex = indexHtml.indexOf('<div id="app-boot"');
    const headCloseIndex = indexHtml.indexOf("</head>");
    const moduleEntryIndex = indexHtml.indexOf('src="/src/main.tsx"');
    expect(bootDivIndex, "index.html 里找不到 #app-boot 遮罩节点").toBeGreaterThan(-1);
    expect(bootDivIndex).toBeGreaterThan(headCloseIndex);
    expect(bootDivIndex).toBeLessThan(moduleEntryIndex);
  });

  test("遮罩已被移除时：不抛 TypeError，也不做任何追加", () => {
    const { run, appended } = runBootHintScript({ bootPresent: false });
    // 回归本体：这里原本是 document.getElementById("app-boot").appendChild(hint)
    // → null.appendChild → 每次加载 15 秒后必抛。
    expect(() => run(), "getElementById 返回 null 时不得抛错").not.toThrow();
    expect(appended, "遮罩不在时不得向任何容器追加节点").toEqual([]);
  });

  test("提示走的是 setTimeout，超时值就是 15000 毫秒", () => {
    const { delay } = runBootHintScript({ bootPresent: true });
    expect(delay(), "提示的延迟值必须仍是 15 秒").toBe(15000);
    // 同时钉住字面量形式（15000），避免有人改成 15 * 1000 后文案与说明脱节
    expect(bootHintBody).toContain("15000");
  });
});