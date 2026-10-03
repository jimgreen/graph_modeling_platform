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
});
