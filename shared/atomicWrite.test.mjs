// shared/atomicWrite.mjs 的单元测试 —— 此前零覆盖。
//
// 它是 manifest / 配置 / 迁移结果等落盘路径的共同底层（A1-P0-1 的修复），
// 语义是「崩溃时目标文件要么旧完整、要么新完整，不出现半写」。
// 要验证的三件事：真的原子（无残留 tmp）、失败时清理干净、并发安全（tmp 名唯一），
// 外加第三个参数确实被透传给 fs（encoding / mode / flag）。
//
// **真实签名**（勿再误读）：`atomicWriteFile(filePath, data, options = {})` ——
// 第三个形参是 options **对象**，源码原样交给 `fs.writeFile` / `fs.writeFileSync`，
// 并不存在独立的 encoding 形参。Node 允许把裸字符串当 options 传并视作 encoding，
// 所以上面那些用例里的 "utf-8" 走的是**字符串 shorthand**，而不是某个 encoding 参数。
// 对象形式才能透传 encoding 之外的字段，两条路都在下面的 describe 里分别钉住。
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, readdirSync, writeFileSync, mkdirSync, chmodSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { atomicWriteFile, atomicWriteFileSync } from "./atomicWrite.mjs";

let dir;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "atomic-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("atomicWriteFile", () => {
  test("写入内容与目标一致", async () => {
    const file = path.join(dir, "a.json");
    await atomicWriteFile(file, '{"ok":true}', "utf-8");
    expect(readFileSync(file, "utf-8")).toBe('{"ok":true}');
  });

  test("目标目录不存在时自动创建", async () => {
    const file = path.join(dir, "deep", "nested", "b.json");
    await atomicWriteFile(file, "x", "utf-8");
    expect(readFileSync(file, "utf-8")).toBe("x");
  });

  test("覆盖已有文件后不残留任何 .tmp", async () => {
    const file = path.join(dir, "c.json");
    await atomicWriteFile(file, "第一版", "utf-8");
    await atomicWriteFile(file, "第二版", "utf-8");
    expect(readFileSync(file, "utf-8")).toBe("第二版");
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });

  test("两次写入之间不互相污染（并发各写各的目标）", async () => {
    const files = [path.join(dir, "x1"), path.join(dir, "x2"), path.join(dir, "x3")];
    await Promise.all(files.map((f, i) => atomicWriteFile(f, `内容${i}`, "utf-8")));
    for (const [i, f] of files.entries()) {
      expect(readFileSync(f, "utf-8")).toBe(`内容${i}`);
    }
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });

  test("写入失败时抛错且不留下半成品目标", async () => {
    // 用一个目录当目标：writeFile 到目录路径必失败（EISDIR）
    const target = path.join(dir, "as-dir");
    mkdirSync(target);
    await expect(atomicWriteFile(target, "x", "utf-8")).rejects.toBeTruthy();
    // 目标仍是目录（未被破坏），且无 tmp 残留
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });
});

describe("atomicWriteFileSync", () => {
  test("写入内容一致且自动建目录", () => {
    const file = path.join(dir, "s", "d.json");
    atomicWriteFileSync(file, "同步内容", "utf-8");
    expect(readFileSync(file, "utf-8")).toBe("同步内容");
  });

  test("覆盖后不残留 .tmp", () => {
    const file = path.join(dir, "s2.json");
    atomicWriteFileSync(file, "1", "utf-8");
    atomicWriteFileSync(file, "2", "utf-8");
    expect(readFileSync(file, "utf-8")).toBe("2");
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });

  test("目标为目录时抛错且清理 tmp", () => {
    const target = path.join(dir, "dir-target");
    mkdirSync(target);
    expect(() => atomicWriteFileSync(target, "x", "utf-8")).toThrow();
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// encoding / options 透传
//
// 这组用例的核心是**证明 encoding 真的改变了落盘字节**，而不是只断言调用参数：
// 用 latin1 / utf16le 写出与 utf-8 不同的字节，使得「把 options 透传删掉」
// （即源码退化成 writeFile(tmpPath, data)，fs 回落默认 utf-8）立刻变红。
// 只断言 utf-8 的用例对那个变异是恒绿的 —— 见下面默认编码那条的注释。
// ---------------------------------------------------------------------------

const NON_ASCII = "中文abc"; // latin1/ascii 下非 ASCII 字符被压成单字节，与 utf-8 必然不同

describe("atomicWriteFile 的 encoding 透传", () => {
  test("传 utf-8 时落盘字节与 Buffer.from(text, utf-8) 逐字节相等", async () => {
    const file = path.join(dir, "u8.txt");
    await atomicWriteFile(file, NON_ASCII, "utf-8");
    const bytes = readFileSync(file);
    expect(bytes.equals(Buffer.from(NON_ASCII, "utf-8"))).toBe(true);
    // 顺带钉住字节长度，避免「两边都退化成 ascii」这种假相等混过去
    expect(bytes.length).toBe(Buffer.byteLength(NON_ASCII, "utf-8"));
  });

  test("传 latin1 时落盘字节与 utf-8 不同 —— encoding 真的生效", async () => {
    // 上面那条 utf-8 用例对「encoding 被忽略」是恒绿的（fs 默认就是 utf-8）；
    // 这条才是守卫：删掉 options 透传后字节会变成 utf-8，下面两条断言立刻失败。
    // 用 latin1 而非 ascii：本例里 ascii 与 latin1 字节相同（都是 2d 87 61 62 63），
    // 但 latin1 与 utf-8 不同，足以区分「忽略了 encoding」。
    const file = path.join(dir, "latin1.txt");
    await atomicWriteFile(file, NON_ASCII, "latin1");
    const bytes = readFileSync(file);
    expect(bytes.equals(Buffer.from(NON_ASCII, "utf-8"))).toBe(false);
    expect(bytes.equals(Buffer.from(NON_ASCII, "latin1"))).toBe(true);
    // 单字节编码下 5 个字符 → 5 字节；utf-8 下中文占 3 字节共 9 字节
    expect(bytes.length).toBe(5);
  });

  test("不传第三个参数时按 fs 默认编码 utf-8 落盘", async () => {
    // 反向钉住默认值。**注意这条对「删掉 options 透传」的变异是恒绿的**
    //（删掉之后默认值恰好也是 utf-8）—— 它的作用是把默认值固定下来，
    // 让上面 latin1 那条的红灯有对照面，而不是去抓那个变异。
    const file = path.join(dir, "default-encoding.txt");
    await atomicWriteFile(file, NON_ASCII);
    expect(readFileSync(file).equals(Buffer.from(NON_ASCII, "utf-8"))).toBe(true);
  });

  test("传非法编码时抛 ERR_INVALID_ARG_VALUE 且目标文件从未创建", async () => {
    // 真实错误码是 ERR_INVALID_ARG_VALUE（不是 ERR_UNKNOWN_ENCODING）：
    // Node 在把字符串 data 转成 Buffer 的那一步就校验 encoding，
    // 发生在 open 之前 —— 所以目标文件从未被创建，tmp 也不会残留。
    const file = path.join(dir, "bad-encoding.txt");
    const err = await atomicWriteFile(file, "x", "not-an-encoding").then(
      () => null,
      (e) => e,
    );
    expect(err).toBeTruthy();
    expect(err.code).toBe("ERR_INVALID_ARG_VALUE");
    expect(existsSync(file)).toBe(false);
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });

  test("第三参数是 options 对象：encoding 字段生效（utf16le）", async () => {
    // 对象形式与裸字符串 shorthand 是两条不同的路。若实现只认字符串 shorthand
    // （例如写死 options?.encoding ?? 字符串），这里会回落默认 utf-8 而红；
    // 若实现只挑 options.encoding 丢弃其他字段，则下面 mode / flag 两条会红。
    const file = path.join(dir, "opts-encoding.txt");
    await atomicWriteFile(file, NON_ASCII, { encoding: "utf16le" });
    const bytes = readFileSync(file);
    expect(bytes.equals(Buffer.from(NON_ASCII, "utf16le"))).toBe(true);
    expect(bytes.equals(Buffer.from(NON_ASCII, "utf-8"))).toBe(false);
    expect(bytes.length).toBe(NON_ASCII.length * 2);
  });

  test("第三参数是 options 对象：mode 字段生效（落盘为只读）", async () => {
    const file = path.join(dir, "opts-mode.txt");
    const control = path.join(dir, "opts-mode-control.txt");
    await atomicWriteFile(file, NON_ASCII, { mode: 0o444 });
    await atomicWriteFile(control, NON_ASCII); // 默认 mode 的对照
    expect(statSync(file).mode & 0o777).toBe(0o444);
    // 对照组必须与 0o444 不同，否则上一条没有鉴别力。
    // Windows 实测：写权限位被丢弃（mode 0o600 也落成 0o666），
    // 只有只读位可观测 —— 0o444 落成 0o444，是本平台上唯一可区分的取值。
    expect(statSync(control).mode & 0o777).not.toBe(0o444);
  });

  test("第三参数是 options 对象：flag 字段生效", async () => {
    // tmp 路径每次都是新建的，所以 flag 无法靠「追加」被观测；改用两种只可能
    // 来自 flag 被透传的结果：未知 flag → Node 校验失败；r+ 要求文件已存在，
    // 而 tmp 必然不存在 → ENOENT。任一字段若被丢弃，这两次调用都会「写入成功」。
    const badFlag = path.join(dir, "flag-bogus.txt");
    const needsExisting = path.join(dir, "flag-rplus.txt");
    const capture = (p) => p.then(() => null, (e) => e);

    const e1 = await capture(atomicWriteFile(badFlag, "x", { flag: "not-a-flag" }));
    expect(e1).toBeTruthy();
    expect(e1.code).toBe("ERR_INVALID_ARG_VALUE");

    const e2 = await capture(atomicWriteFile(needsExisting, "x", { flag: "r+" }));
    expect(e2).toBeTruthy();
    expect(e2.code).toBe("ENOENT");

    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });
});

describe("atomicWriteFileSync 的 encoding 与 options 透传", () => {
  test("同步版传 latin1 时落盘字节与 utf-8 不同", () => {
    const file = path.join(dir, "sync-latin1.txt");
    atomicWriteFileSync(file, NON_ASCII, "latin1");
    const bytes = readFileSync(file);
    expect(bytes.equals(Buffer.from(NON_ASCII, "latin1"))).toBe(true);
    expect(bytes.equals(Buffer.from(NON_ASCII, "utf-8"))).toBe(false);
  });

  test("同步版 options 同时透传 encoding 与 mode", () => {
    const file = path.join(dir, "sync-opts.txt");
    atomicWriteFileSync(file, NON_ASCII, { encoding: "latin1", mode: 0o444 });
    expect(readFileSync(file).equals(Buffer.from(NON_ASCII, "latin1"))).toBe(true);
    expect(statSync(file).mode & 0o777).toBe(0o444);
  });

  test("同步版传非法编码时抛错并清理 tmp", () => {
    const file = path.join(dir, "sync-bad.txt");
    let err = null;
    try {
      atomicWriteFileSync(file, "x", "not-an-encoding");
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err.code).toBe("ERR_INVALID_ARG_VALUE");
    expect(existsSync(file)).toBe(false);
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });
});
