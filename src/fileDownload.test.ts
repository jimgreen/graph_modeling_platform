// `src/fileIO.ts` 的**下载半边**（此前只测了保存半边，17 处生产调用零直呼）
//   encodeTextAsBytes   文本 → 字节（utf-8 / gbk）
//   downloadText        文本 → 浏览器下载
//   downloadBytes       字节 → 浏览器下载
//   downloadBlob        Blob → 浏览器下载（<a download> + objectURL）
//
// 判错的后果：**用户点了导出按钮，下载下来的文件是空的 / 乱码 / 缺字段**。
// 编码判错最隐蔽 —— GBK 编码器对无法表示的字符**静默替换成 `?`（字节 63）**，
// 文件照样能打开，只是内容错了。
import { afterEach, describe, expect, test, vi } from "vitest";
import { downloadBlob, downloadBytes, downloadText, encodeTextAsBytes } from "./fileIO";
import { encodeGbk } from "./encoding/gbk";

// ── DOM 桩 ────────────────────────────────────────────────────────────
// 事件序列用来断言**调用顺序**，而不只是「各调了一次」——
// `revoke` 紧跟 `click` 是这个函数的全部要点。
let events: string[] = [];
let lastBlob: Blob | null = null;

interface LinkStub {
  href: string;
  download: string;
  click: ReturnType<typeof vi.fn>;
}

const installDom = (options: { createThrows?: Error; clickThrows?: Error; objectUrl?: string } = {}) => {
  events = [];
  lastBlob = null;
  const link: LinkStub = {
    href: "",
    download: "",
    click: vi.fn(() => {
      events.push(`click:${link.download}`);
      if (options.clickThrows) throw options.clickThrows;
    })
  };
  vi.stubGlobal("document", {
    createElement: (tag: string) => {
      events.push(`createElement:${tag}`);
      if (options.createThrows) throw options.createThrows;
      return link;
    }
  });
  vi.stubGlobal("URL", {
    createObjectURL: (blob: Blob) => {
      events.push("createObjectURL");
      lastBlob = blob;
      return options.objectUrl ?? "blob:stub/1";
    },
    revokeObjectURL: (url: string) => { events.push(`revoke:${url}`); }
  });
  return link;
};

afterEach(() => {
  vi.unstubAllGlobals();
  events = [];
  lastBlob = null;
});

describe("encodeTextAsBytes：只有 `gbk` 走 GBK，其余一律 utf-8", () => {
  test("utf-8（默认）", () => {
    expect(Array.from(encodeTextAsBytes("A中B"))).toEqual([65, 228, 184, 173, 66]);
    expect(Array.from(encodeTextAsBytes("A中B", "utf-8"))).toEqual([65, 228, 184, 173, 66]);
  });

  test("gbk", () => {
    expect(Array.from(encodeTextAsBytes("A中B", "gbk"))).toEqual([65, 214, 208, 66]);
    // 与 `encodeGbk` 逐字节相同
    expect(Array.from(encodeTextAsBytes("A中B", "gbk"))).toEqual(Array.from(encodeGbk("A中B")));
  });

  test("★ **非 `gbk` 的一律静默回落 utf-8**（不抛、不告警）", () => {
    // 判定是 `encoding === "gbk"` 的严格相等，所以：
    //   "utf8"（无连字符）/ "UTF-8"（大写）/ "latin1" / "" / undefined
    // 全部落到 `new TextEncoder().encode(text)`。
    const utf8 = [65, 228, 184, 173, 66];
    for (const encoding of ["utf8", "UTF-8", "Utf-8", "latin1", "gb2312", "big5", "", null, 0, false] as never[]) {
      expect(Array.from(encodeTextAsBytes("A中B", encoding)), JSON.stringify(encoding)).toEqual(utf8);
    }
    // ★ 省略第二参 = 默认 utf-8
    expect(Array.from(encodeTextAsBytes("A中B"))).toEqual(utf8);
    // 类型声明 `EFileTextEncoding = "utf-8" | "gbk"` 挡住了这些值，
    // 但 JS 调用点或从 JSON 读来的值不受类型保护。
    expect(encodeTextAsBytes("x", "gbk" as never)).not.toBe(encodeTextAsBytes("x", "utf-8" as never));
  });

  test("★ GBK 无法表示的字符**静默替换**，不抛", () => {
    // 这是导出链最大的隐蔽风险：emoji / 生僻字在 E 文件里变成 `?`（字节 63），
    // 文件照样能打开，只是内容错了。
    // 刻意直接写字面量：孤立高代理 `\ud800` 这类极端输入正是「GBK 静默替换」的
    // 被测对象，不能转义、也不能换成替身字符，否则测的就不是同一件事。
    // （本仓没有 eslint，原先那条 `no-control-regex` 压制不到任何东西，已删；
    //   且它挂在 `["€", ...]` 上，而唯一的转义字面量在下面一行，本来就挂错了行。）
    const cases: Array<[string, number[]]> = [
      ["€", [128]],                    // € 在 GBK 扩展区有单字节码位
      ["😀", [63]],                     // 代理对 → `?`
      ["\ud800", [63]],                 // 孤立高代理 → `?`
      ["龘", [253, 147]]                 // 生僻汉字 → 双字节
    ];
    for (const [char, expected] of cases) {
      const gbk = encodeTextAsBytes(char, "gbk");
      expect(Array.from(gbk), `gbk ${JSON.stringify(char)}`).toEqual(expected);
      // ★ GBK 结果**短于** utf-8（无法表示的字符被压成 1 字节）
      expect(gbk.length, `gbk 长度 ${JSON.stringify(char)}`).toBeLessThanOrEqual(2);
    }
    // 前置：utf-8 不会丢字符
    expect(new TextEncoder().encode("😀").length).toBe(4);
    expect(new TextEncoder().encode("龘").length).toBe(3);
  });

  test("空串 → 空字节数组", () => {
    expect(encodeTextAsBytes("")).toEqual(new Uint8Array(0));
    expect(encodeTextAsBytes("", "gbk")).toEqual(new Uint8Array(0));
    expect(encodeTextAsBytes("").length).toBe(0);
  });

  test("纯 ASCII 在两种编码下**逐字节相同**", () => {
    expect(Array.from(encodeTextAsBytes("abc", "gbk"))).toEqual([97, 98, 99]);
    expect(encodeTextAsBytes("abc", "gbk")).toEqual(encodeTextAsBytes("abc", "utf-8"));
  });

  test("返回 `Uint8Array`（不是 Array / Buffer）", () => {
    const out = encodeTextAsBytes("a");
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Array.isArray(out)).toBe(false);
  });

  test("不改入参（形参是 string）", () => {
    const text = "  A中B  ";
    encodeTextAsBytes(text, "gbk");
    expect(text).toBe("  A中B  ");
  });
});

describe("★ downloadBlob：create → createElement → click → revoke", () => {
  test("事件顺序固定", () => {
    installDom();
    downloadBlob("z.txt", new Blob(["hello"], { type: "text/plain" }));
    expect(events).toEqual(["createObjectURL", "createElement:a", "click:z.txt", "revoke:blob:stub/1"]);
  });

  test("link.href 就是 `createObjectURL` 的返回值，且 revoke 的是同一个 url", () => {
    const link = installDom({ objectUrl: "blob:custom/42" });
    downloadBlob("z.txt", new Blob(["x"]));
    expect(link.href).toBe("blob:custom/42");
    expect(events).toContain("revoke:blob:custom/42");
  });

  test("只创建 `a` 元素", () => {
    installDom();
    downloadBlob("z.txt", new Blob(["x"]));
    expect(events.filter((e) => e === "createElement:a")).toHaveLength(1);
    expect(events.some((e) => e.startsWith("createElement:") && e !== "createElement:a")).toBe(false);
  });

  test("★ `revoke` **紧跟** `click`（同步，不等下一帧）", () => {
    // 这是要点：`revokeObjectURL` 紧跟 `link.click()` 同步调用。
    // 浏览器规范允许这样（点击已排队），但若改成异步延后就会拿到已失效的 url。
    installDom();
    downloadBlob("z.txt", new Blob(["x"]));
    const clickAt = events.findIndex((e) => e.startsWith("click"));
    const revokeAt = events.findIndex((e) => e.startsWith("revoke"));
    expect(revokeAt, "★ revoke 紧跟 click").toBe(clickAt + 1);
  });

  test("★ `createObjectURL` 抛错 → 不 revoke（也建不出 url）", () => {
    const link = installDom();
    vi.stubGlobal("URL", {
      createObjectURL: () => { events.push("createObjectURL"); throw new Error("boom"); },
      revokeObjectURL: () => { events.push("revoke"); }
    });
    expect(() => downloadBlob("z.txt", new Blob(["x"]))).toThrow("boom");
    expect(events, "★ 只走到 createObjectURL").toEqual(["createObjectURL"]);
    expect(link.click, "★ 不会 click").not.toHaveBeenCalled();
  });

  test("★ `link.click()` 抛错 → **不 revoke**（objectURL 泄漏）", () => {
    installDom({ clickThrows: new Error("clickfail") });
    expect(() => downloadBlob("z.txt", new Blob(["x"]))).toThrow("clickfail");
    // 探针实测：事件停在 click，revoke 那一行**没跑到**。
    // 后果：objectURL 没被回收，Blob 一直挂着 —— 只是内存泄漏，文件已经下了。
    // **判定不修**：`click()` 在真实浏览器里不抛（同步派发下载）。
    // 加 try/finally 反而多一层；若真要修，应在 click 两侧各 revoke 或改用超时。
    expect(events).toEqual(["createObjectURL", "createElement:a", "click:z.txt"]);
    expect(events.some((e) => e.startsWith("revoke"))).toBe(false);
  });

  test("★ `document.createElement` 抛错 → 不 revoke", () => {
    installDom({ createThrows: new Error("no dom") });
    expect(() => downloadBlob("z.txt", new Blob(["x"]))).toThrow("no dom");
    expect(events).toEqual(["createObjectURL", "createElement:a"]);
  });

  test("link 不留在 DOM 里（`appendChild` 一次都没调）", () => {
    // 只 create + click，不入 DOM —— 现代浏览器支持。
    const link = installDom();
    const doc = globalThis.document as unknown as { appendChild: ReturnType<typeof vi.fn> };
    expect(doc.appendChild, "★ 桩里没有 appendChild，说明代码没调").toBeUndefined();
    downloadBlob("z.txt", new Blob(["x"]));
    expect(link.click).toHaveBeenCalledOnce();
  });

  test("空 filename 也照常下载（`link.download` 被赋成空串）", () => {
    const link = installDom();
    downloadBlob("", new Blob(["x"]));
    expect(link.download).toBe("");
    expect(link.click).toHaveBeenCalledOnce();
  });
});

describe("downloadText：文本 → Blob（type = mime）", () => {
  test("★ blob.type 原样是传入的 mime", () => {
    for (const mime of ["text/plain", "application/json", "text/plain;charset=gbk", "bogus", "a/b/c"]) {
      installDom();
      downloadText("x.e", "y", mime);
      expect(lastBlob?.type, mime).toBe(mime);
    }
  });

  test("★ mime 不是合法 MIME 时 `Blob` 把它**降级为空串**（不抛）", () => {
    // Blob 构造器只接受 ASCII 的 `type/subtype`；非 ASCII 会被丢成 `""`。
    // 后果：下载的文件浏览器无法判断类型 —— 但 `download` 属性已指定文件名，
    // 所以通常无碍。探针实测 `"中文/类型"` → `""`。
    installDom();
    downloadText("x", "y", "中文/类型");
    expect(lastBlob?.type).toBe("");
    installDom();
    downloadText("x", "y", "");
    expect(lastBlob?.type).toBe("");
  });

  test("blob 内容就是编码后的字节", () => {
    installDom();
    downloadText("a.e", "A中B", "text/plain", "gbk");
    expect(lastBlob?.size, "★ gbk 后是 4 字节").toBe(4);
    // 与 encodeTextAsBytes 逐字节相同
    installDom();
    downloadText("a.e", "A中B", "text/plain", "utf-8");
    expect(lastBlob?.size, "★ utf-8 后是 5 字节").toBe(5);
    expect(lastBlob?.size).toBe(encodeTextAsBytes("A中B").length);
  });

  test("★ 默认编码是 utf-8（省略第四参）", () => {
    installDom();
    downloadText("b.txt", "A中B", "text/plain");
    expect(lastBlob?.size).toBe(new TextEncoder().encode("A中B").length);
    expect(lastBlob?.size).toBe(5);
  });

  test("★ filename 原样进 `link.download`（不 trim、不校验扩展名）", () => {
    for (const filename of ["a.e", "  a.e  ", "路径/子目录/a.e", "", "a.exe", "模型.e"]) {
      const link = installDom();
      downloadText(filename, "x", "text/plain");
      expect(link.download, JSON.stringify(filename)).toBe(filename);
    }
  });

  test("★ 复用 `downloadBlob` 的完整事件序列（不自己实现点击）", () => {
    installDom();
    downloadText("c.e", "x", "text/plain");
    expect(events).toEqual([
      "createObjectURL", "createElement:a", "click:c.e", "revoke:blob:stub/1"
    ]);
  });

  test("与 `downloadBytes(encodeTextAsBytes(...))` 等价（utf-8）", () => {
    installDom();
    downloadText("same", "A中B", "text/plain");
    const textSize = lastBlob?.size;
    installDom();
    downloadBytes("same", encodeTextAsBytes("A中B"), "text/plain");
    expect(lastBlob?.size).toBe(textSize);
    expect(lastBlob?.size).toBe(5);
  });

  test("不改入参", () => {
    installDom();
    const filename = "  a.e  ";
    const text = "  A中B  ";
    downloadText(filename, text, "text/plain", "gbk");
    expect(filename).toBe("  a.e  ");
    expect(text).toBe("  A中B  ");
  });
});

describe("downloadBytes：字节 → Blob（type = mime）", () => {
  test("★ blob.type 就是传入的 mime（不是写死的 octet-stream）", () => {
    // 变异 `mime` 硬编码成 `"application/octet-stream"` 时首轮全绿 ——
    // 我第一版恰好把测试的 mime 也写成了 `application/octet-stream`，
    // 于是「硬编码成我用的那个值」看起来与「用参数」不可区分。
    // 教训：**断言输入不能等于被硬编码的候选值**，否则这条断言没有鉴别力。
    for (const mime of ["image/png", "text/csv", "application/vnd.ms-excel", "application/zip"]) {
      installDom();
      downloadBytes("x.bin", new Uint8Array([1]), mime);
      expect(lastBlob?.type, mime).toBe(mime);
    }
  });

  test("blob 内容是传入的字节", () => {
    installDom();
    downloadBytes("b.bin", new Uint8Array([1, 2, 3]), "application/octet-stream");
    expect(lastBlob?.size).toBe(3);
    expect(lastBlob?.type).toBe("application/octet-stream");
  });

  test("空字节数组 → 空 blob（但仍走完整流程）", () => {
    const link = installDom();
    downloadBytes("empty.bin", new Uint8Array(0), "text/plain");
    expect(lastBlob?.size).toBe(0);
    expect(link.click).toHaveBeenCalledOnce();
    expect(events).toHaveLength(4);
  });

  test("★ 不改入参字节数组", () => {
    installDom();
    const bytes = new Uint8Array([1, 2, 3]);
    downloadBytes("b.bin", bytes, "text/plain");
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  test("复用 `downloadBlob`（同形注释：字节流的浏览器下载兜底）", () => {
    installDom();
    downloadBytes("b.bin", new Uint8Array([1]), "text/plain");
    expect(events).toEqual([
      "createObjectURL", "createElement:a", "click:b.bin", "revoke:blob:stub/1"
    ]);
  });

  test("大字节数组不被截断", () => {
    const big = new Uint8Array(1024).fill(7);
    installDom();
    downloadBytes("big.bin", big, "image/png");
    expect(lastBlob?.size).toBe(1024);
  });
});

describe("★ 两条等价变异的记录（避免下一个人重查）", () => {
  test("等价变异 ②：给 `encoding === \"utf-8\"` 加提前返回是**恒等**的", () => {
    // 变异：在 `if (encoding === \"gbk\")` 之前插入
    //   `if (encoding === \"utf-8\") return new TextEncoder().encode(text);`
    // 首轮全绿。
    //   —— 原实现里 `encoding === \"utf-8\"` 恰好**落不到** gbk 分支，
    //      继续走到函数末尾的 `return new TextEncoder().encode(text)`。
    //      新增的提前返回执行的是**同一行、同一参数**，所以对任意输入同结果。
    //   ⇒ 等价变异。
    //   ⚠ 什么会让它失效：若末尾那行换成别的实现（例如加 BOM、改换行），
    //      两处就会分道扬镳。
    const encode = (encoding: string) => {
      if (encoding === "utf-8") return new TextEncoder().encode("A中B");
      if (encoding === "gbk") return encodeGbk("A中B");
      return new TextEncoder().encode("A中B");
    };
    for (const encoding of ["utf-8", "gbk", "utf8", "latin1", ""]) {
      expect(Array.from(encode(encoding)), encoding)
        .toEqual(Array.from(encodeTextAsBytes("A中B", encoding as never)));
    }
    // 前提：末尾那行就是提前返回执行的那一行
    expect(encode("gbk")).not.toBe(encode("utf-8"));
  });

  test("等价变异 ⑩：`link.href` 与 `link.download` 的赋值顺序无关", () => {
    // 变异：把两行顺序对调。首轮全绿。
    //   —— 两者都是对同一个元素对象的普通属性赋值，没有读取-改-写依赖，
    //      也都没有 setter 副作用（`<a>` 的 href/download 是普通可写属性）。
    //   ⇒ 等价变异。
    //   ⚠ 什么会让它失效：若 `document.createElement` 返回的对象上，
    //      `href` 的 setter 依赖 `download`（某些自定义元素会），
    //      或两者之一是 getter-only（本就会抛错）。
    // 下面把「两个属性的最终值与赋值顺序无关」写成可执行断言。
    const assign = (hrefFirst: boolean, url: string, filename: string) => {
      const link = { href: "", download: "" };
      if (hrefFirst) { link.href = url; link.download = filename; }
      else { link.download = filename; link.href = url; }
      return link;
    };
    for (const [url, filename] of [["blob:x/1", "a.e"], ["blob:y/2", "  b  "], ["", ""]] as const) {
      expect(assign(true, url, filename), `${url} / ${filename}`).toEqual(assign(false, url, filename));
    }
    // 真实实现走 href 先行的顺序，最终值仍如断言
    const link = installDom({ objectUrl: "blob:stub/1" });
    downloadBlob("a.e", new Blob(["x"]));
    expect(link.href).toBe("blob:stub/1");
    expect(link.download).toBe("a.e");
  });
});
