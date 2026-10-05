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

  test("空格分隔的 --host 值回归：下一个 token 不以减号开头时照常取值", () => {
    expect(parseHost(["--host", "0.0.0.0"])).toBe("0.0.0.0");
    expect(parseHost(["--port", "3000", "--host", "0.0.0.0"])).toBe("0.0.0.0");
  });

  test("--host= 空值返回空字符串，值里的等号不影响判定", () => {
    expect(parseHost(["--host="])).toBe("");
    expect(parseHost(["--host=", "--port=3000"])).toBe("");
  });

  test("--host 位于参数列表末尾时无值回退 config host", () => {
    expect(parseHost(["--verbose", "--debug", "--host"])).toBe(configHost);
  });

  test("正常的等号形式不受影响", () => {
    expect(parseHost(["--port=3000", "--host=1.2.3.4", "--debug"])).toBe("1.2.3.4");
  });
});
