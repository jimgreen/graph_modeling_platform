import { describe, expect, test, vi } from "vitest";

vi.mock("./server.mjs", () => ({
  createImageServer: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("node:child_process", () => ({
  spawn: vi.fn(() => ({
    kill: vi.fn(),
    on: vi.fn()
  }))
}));

const [{ parseHost }, { host: configHost }] = await Promise.all([
  import("./dev.mjs"),
  import("./config.mjs")
]);

describe("parseHost", () => {
  test("无参数时回退到 config host", () => {
    expect(parseHost([])).toBe(configHost);
  });

  test("支持空格分隔的 --host 值", () => {
    expect(parseHost(["--host", "1.2.3.4"])).toBe("1.2.3.4");
  });

  test("支持 --host=值形式", () => {
    expect(parseHost(["--host=1.2.3.4"])).toBe("1.2.3.4");
  });

  test("--host 在末尾且没有值时回退到 config host", () => {
    expect(parseHost(["--host"])).toBe(configHost);
  });

  test("从非首位参数中查找 --host", () => {
    expect(parseHost(["--verbose", "--host", "1.2.3.4", "--debug"])).toBe("1.2.3.4");
  });

  test("相近参数 --hostname 不会被误匹配", () => {
    expect(parseHost(["--hostname", "1.2.3.4"])).toBe(configHost);
  });

  test("--host= 空值按现有行为返回空字符串", () => {
    expect(parseHost(["--host="])).toBe("");
  });

  // 以下几条针对参数解析的两处缺陷：值里含 `=`、以及 flag 无值时吞掉下一个 flag。

  test("等号形式的值里可以再含等号，取首个等号之后的全部内容", () => {
    // 判别点：旧实现 split("=")[1] 会把 `--host=a=b` 截成 `a`。
    expect(parseHost(["--host=a=b"])).toBe("a=b");
  });

  test("--host 后面跟另一个 flag 时 host 无值，该 flag 不被吞掉", () => {
    // 判别点：旧实现把 `--port=3000` 直接当成 host 的值，返回 `--port=3000`。
    // parseHost 只产出 host，故 `--port` 仍独立成立即表现为回退 config host。
    expect(parseHost(["--host", "--port=3000"])).toBe(configHost);
    // 空格分隔的 flag 同理（不带等号的下一个 flag）。
    expect(parseHost(["--host", "--port", "3000"])).toBe(configHost);
  });

  // 下列情形已由上方用例逐条钉住，不再重复：
  //   · ["--host","0.0.0.0"] / ["--port","3000","--host","0.0.0.0"] → 「空格分隔取值」
  //     与「非首位查找」两条规则已分别由上方用例以同一形态覆盖（换的只是字面量）。
  //   · ["--host="] → "" 与上方「空值」用例是同一输入同一期望，逐字重复。
  //   · ["--host=","--port=3000"] → 命中 `eq !== -1` 后立即 return，代码路径上
  //     根本不会去读下一个 token，补这一条不产生任何可观测差异。
  //   · ["--verbose","--debug","--host"] → 仍是「末尾无值回退 configHost」，与上方同一条。
  //   · ["--port=3000","--host=1.2.3.4","--debug"] → 等号形式 + 非首位，是上方
  //     「等号形式」「非首位」两条的合取，无新增判别点。
});
