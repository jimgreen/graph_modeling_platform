import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
// 后端唯一的 cookie 解析器：往返断言把前后端两侧的编解码绑在一起。
// 后端 .mjs 无类型声明（tsconfig allowJs:false 且 tsconfig include 只含 src），此处只借它做往返验证。
// @ts-expect-error TS7016 无声明文件
import { parseSpaceCookie } from "../server/spaceStore.mjs";
// 前后端 sanitize 的镜像源。shared/ 备了 .d.mts 声明（shared/pathSafety.d.mts），
// 所以这里不需要 @ts-expect-error —— 不同于上面那个无声明的 server/spaceStore.mjs。
import { sanitizeSegment } from "../shared/pathSafety.mjs";
import {
  SPACE_COOKIE_NAME,
  SPACE_NAME_DUPLICATE,
  SpaceNameConflictError,
  createSpace,
  deleteSpace,
  exportSpaceArchive,
  fetchSpaces,
  importSpaceArchive,
  readSpaceCookie,
  renameSpace,
  sanitizeSpaceFileName,
  writeSpaceCookie
} from "./spaceClient";

// node 测试环境无 document：手搓 cookie jar 桩。
// setter 只留首个 name=value（属性是写给浏览器的，不进 Cookie 头），getter 拼回请求头形态 —— 与真实浏览器一致。
function installMockDocument() {
  let header = "";
  const writes: string[] = [];
  (globalThis as any).document = {
    get cookie() {
      return header;
    },
    set cookie(raw: string) {
      writes.push(raw);
      const pair = raw.split(";")[0].trim();
      if (pair.indexOf("=") <= 0) return;
      header = header ? `${header}; ${pair}` : pair;
    }
  };
  return {
    writes,
    setHeader: (value: string) => {
      header = value;
    }
  };
}

function mockFetchJson(payload: unknown) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, json: async () => payload }));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

let mockDoc: ReturnType<typeof installMockDocument>;
let originalDocument: any;
let originalFetch: any;

beforeEach(() => {
  originalDocument = (globalThis as any).document;
  originalFetch = (globalThis as any).fetch;
  mockDoc = installMockDocument();
});

afterEach(() => {
  (globalThis as any).document = originalDocument;
  (globalThis as any).fetch = originalFetch;
});

describe("writeSpaceCookie 与后端 parseSpaceCookie 的往返", () => {
  test("中文 id：写出的 Cookie 头是 ByteString，后端解一次能还原", () => {
    writeSpaceCookie("张三");
    const header = (globalThis as any).document.cookie as string;
    // 头值必须是 ByteString：裸中文会让 fetch 在发请求前抛 TypeError
    expect(/^[\x20-\x7E]*$/.test(header)).toBe(true);
    // 后端解析器只 decodeURIComponent 一次
    expect(parseSpaceCookie(header)).toBe("张三");
  });
});

describe("readSpaceCookie", () => {
  test("读回自家写出的编码值（中文必须解码）", () => {
    writeSpaceCookie("张三");
    expect(readSpaceCookie()).toBe("张三");
  });

  test("从多 cookie 头中按名取值", () => {
    mockDoc.setHeader(`a=1; ${SPACE_COOKIE_NAME}=${encodeURIComponent("李四")}; b=2`);
    expect(readSpaceCookie()).toBe("李四");
  });

  test("无该 cookie 时返回空串", () => {
    mockDoc.setHeader("a=1; b=2");
    expect(readSpaceCookie()).toBe("");
  });
});

describe("writeSpaceCookie 的 Cookie 属性", () => {
  test("含 Path=/ / Max-Age / SameSite=Lax", () => {
    writeSpaceCookie("张三");
    const raw = mockDoc.writes[mockDoc.writes.length - 1] ?? "";
    expect(raw).toContain("Path=/");
    expect(raw).toContain("Max-Age=31536000");
    expect(raw).toContain("SameSite=Lax");
  });
});

describe("fetchSpaces", () => {
  test("current 取自后端响应，而非本地 cookie 推断", async () => {
    // cookie 与后端 current 故意不一致：前端不自算「我是谁」
    writeSpaceCookie("李四");
    const fetchMock = mockFetchJson({
      spaces: [{ id: "default", name: "默认空间", pinned: true, createdAt: "2026-01-01T00:00:00.000Z" }],
      current: "张三"
    });

    const result = await fetchSpaces();

    expect(fetchMock.mock.calls[0][0]).toBe("/webgrp/spaces");
    expect(result.current).toBe("张三");
    expect(result.spaces).toHaveLength(1);
    expect(result.spaces[0]).toMatchObject({ id: "default", name: "默认空间", pinned: true });
  });

  test("非 2xx 抛后端消息", async () => {
    (globalThis as any).fetch = vi.fn(async () => ({ ok: false, json: async () => ({ error: "空间存储损坏。" }) }));
    await expect(fetchSpaces()).rejects.toThrow("空间存储损坏。");
  });
});

describe("createSpace", () => {
  test("POST /webgrp/spaces，body 为 {name}，返回新空间对象", async () => {
    const space = { id: "张三", name: "张三", pinned: false, createdAt: "2026-09-13T00:00:00.000Z" };
    const fetchMock = mockFetchJson(space);

    const result = await createSpace("张三");

    expect(result).toEqual(space);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/webgrp/spaces");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(String(init?.body)).toBe(JSON.stringify({ name: "张三" }));
  });
});

describe("renameSpace / deleteSpace", () => {
  test("改名：PUT /webgrp/spaces，body 为 {id,name}（id 不是 name）", async () => {
    const fetchMock = mockFetchJson({ ok: true });

    await renameSpace("高鹏", "高鹏新");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/webgrp/spaces");
    expect(init?.method).toBe("PUT");
    expect(String(init?.body)).toBe(JSON.stringify({ id: "高鹏", name: "高鹏新" }));
  });

  test("改名撞上已有空间名：抛后端 409 的文案", async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: SPACE_NAME_DUPLICATE, message: "空间名「高鹏」已存在。" } })
    }));

    // 文案归后端（与新建同一条规则），前端不自造一句，否则同一件事有两种说法
    await expect(renameSpace("甲", "高鹏")).rejects.toThrow("空间名「高鹏」已存在。");
  });

  test("删除：DELETE /webgrp/spaces，body 为 {id}", async () => {
    const fetchMock = mockFetchJson({ ok: true });

    await deleteSpace("高鹏");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/webgrp/spaces");
    expect(init?.method).toBe("DELETE");
    expect(String(init?.body)).toBe(JSON.stringify({ id: "高鹏" }));
  });

  test("删除 default（pinned）：抛后端文案，不静默当成功", async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: "SPACE_PINNED", message: "default 空间不可删除。" } })
    }));

    await expect(deleteSpace("default")).rejects.toThrow("default 空间不可删除。");
  });
});

describe("exportSpaceArchive / importSpaceArchive", () => {
  test("导出：GET /webgrp/spaces/export，返回 blob；非 2xx 抛后端消息", async () => {
    const blob = new Blob(["zipbytes"], { type: "application/zip" });
    (globalThis as any).fetch = vi.fn(async () => ({ ok: true, blob: async () => blob }));

    await expect(exportSpaceArchive()).resolves.toBe(blob);
    expect((globalThis as any).fetch.mock.calls[0][0]).toBe("/webgrp/spaces/export");

    (globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "空间数据不完整。" })
    }));
    // 后端文案与实现里的 fallback（"导出空间压缩包失败。"）刻意不同：
    // 若实现不读后端消息、直接抛 fallback，此断言必红
    await expect(exportSpaceArchive()).rejects.toThrow("空间数据不完整。");
  });

  test("导入：POST 二进制 body，回执读 payload.space（**非** v1 信封）", async () => {
    // 后端 handleImportSpaceArchive 用的是 sendJson（裸回执，不是 v1 的 {ok,data} 信封），
    // 故这里读 payload.space；两侧形状必须一致，改后端回执就要同步改这里
    const payload = { ok: true, space: { id: "新空间", name: "新空间", createdAt: "2026-01-01T00:00:00.000Z" }, spaces: [] };
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, json: async () => payload }));
    (globalThis as any).fetch = fetchMock;
    const file = new File([new Uint8Array([1, 2, 3])], "甲.zip", { type: "application/zip" });

    const result = await importSpaceArchive(file);

    expect(result.space.id).toBe("新空间");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/webgrp/spaces/import");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["content-type"]).toBe("application/zip");
    expect(init?.body).toBe(file);
  });

  test("导入：200 但回执缺 space 时抛错，不返回 space=undefined", async () => {
    // 协议违约路径：后端该回 space 却没回。缺了实现里的守卫，这里会拿到 undefined
    (globalThis as any).fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    const file = new File([new Uint8Array([1])], "空回执.zip", { type: "application/zip" });

    await expect(importSpaceArchive(file)).rejects.toThrow("后端回执缺少 space");
  });

  test("导入：非 2xx 抛后端 error 消息", async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "zip 文件格式不正确。" })
    }));
    const file = new File([new Uint8Array([1])], "坏.zip", { type: "application/zip" });

    await expect(importSpaceArchive(file)).rejects.toThrow("zip 文件格式不正确。");
    // 非 2xx 路径不能返回半成品结果
  });

  test("导入：覆盖 / 改名意图拼进查询串（中文名 URL 编码）", async () => {
    const payload = { ok: true, space: { id: "甲-2", name: "甲-2", createdAt: "2026-01-01T00:00:00.000Z" }, spaces: [] };
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, json: async () => payload }));
    (globalThis as any).fetch = fetchMock;
    const file = new File([new Uint8Array([1])], "甲.zip", { type: "application/zip" });

    await importSpaceArchive(file, { mode: "overwrite" });
    expect(fetchMock.mock.calls[0][0]).toBe("/webgrp/spaces/import?mode=overwrite");

    await importSpaceArchive(file, { mode: "rename", name: "甲-2" });
    // 裸中文进查询串会被各家实现各解各的，这里与后端 URLSearchParams 对称
    expect(fetchMock.mock.calls[1][0]).toBe(`/webgrp/spaces/import?mode=rename&name=${encodeURIComponent("甲-2")}`);
  });

  test("导入：409 冲突抛 SpaceNameConflictError，带上冲突者的名字与 id", async () => {
    // 后端 sendSpaceNameConflict 的正文形状（server.mjs）：v1 信封的 error + 裸的 name/conflictId
    const conflictPayload = {
      error: { code: SPACE_NAME_DUPLICATE, message: "空间名「甲」已存在。" },
      name: "甲",
      conflictId: "甲-id"
    };
    const readJson = async () => conflictPayload;
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      status: 409,
      // 实现先 clone 再让 backendErrorMessage 读正文：两者必须都能拿到同一份
      clone: () => ({ json: readJson }),
      json: readJson
    }));
    const file = new File([new Uint8Array([1])], "甲.zip", { type: "application/zip" });

    const error = await importSpaceArchive(file).then(() => null, (e: any) => e);

    expect(error).toBeInstanceOf(SpaceNameConflictError);
    expect(error.code).toBe(SPACE_NAME_DUPLICATE);
    // 上层要靠这两个字段说清「撞的是哪一个」（覆盖要先说清覆盖谁、改名要给出建议名）——
    // 只给一句 message 的话，弹出来的询问框没法指名道姓
    expect(error.spaceName).toBe("甲");
    expect(error.conflictId).toBe("甲-id");
    expect(error.message).toBe("空间名「甲」已存在。");
  });
});

// 前后端各有一份 sanitize，是刻意的跨边界镜像：前端无法 import 依赖 node:path 的
// shared/pathSafety.mjs（同本文件 readSpaceCookie 对后端 parseSpaceCookie 的先例）。
// 用途是导出的 ZIP **包内顶层目录名**（后端算）与「另存为」建议的**文件名**（前端算）
// 取同一个值。两侧各改一处不会有任何报错，只会让目录名与文件名悄悄对不上 ——
// 除本组断言外，没有任何机制会发现这种漂移。
describe("sanitizeSpaceFileName 与后端 sanitizeSegment 同规则", () => {
  const FALLBACK = "空间";
  const MAX = 80;

  const cases: Array<[string, unknown]> = [
    ["正常名", "工作空间一"],
    ["前后空白", "  前后空白  "],
    ["非法字符", 'a/b\\c:d*e?f"g<h>i|j'],
    ["单个斜杠", "a/b"],
    ["连续分隔符（+ 而非 *：整段折成一个 _）", "a//b"],
    ["分隔符与非法字符混排", 'a//b\\c'],
    ["空串", ""],
    ["纯空白", "   "],
    ["null", null],
    ["undefined", undefined],
    ["数字 0（?? 不吃 0）", 0],
    ["数字 1", 1],
    ["false（?? 不吃 false）", false],
    ["点", "."],
    ["双点", ".."],
    ["三点", "..."],
    ["四点", "...."],
    ["点后跟斜杠", "./"],
    ["双点后跟斜杠", "../"],
    ["点段夹在中间", "a/../b"],
    ["斜杠包着的点段", "/.."],
    ["正好 80 字", "x".repeat(MAX)],
    ["81 字（截断）", "x".repeat(MAX + 1)],
    ["100 字（截断）", "x".repeat(100)],
    ["末字是分隔符", `${"y".repeat(MAX - 1)}/`],
    ["Windows 保留名", "CON"],
    ["数组", ["a", "b"]],
    ["普通对象", { a: 1 }]
  ];

  test("逐个输入两侧结果一致", () => {
    for (const [label, value] of cases) {
      // label 放进断言消息：某一格漂移时能立刻看出是哪个输入，不用逐条二分
      expect(sanitizeSpaceFileName(value as string), label).toBe(sanitizeSegment(value, FALLBACK, MAX));
    }
  });

  test("关键取值钉死：防止两侧一起漂移却仍互相一致", () => {
    // 只比两侧相等不够 —— 两边同时改成同一个错值，这组断言照样绿
    expect(sanitizeSpaceFileName("a/b")).toBe("a_b");
    expect(sanitizeSpaceFileName("  工作空间一  ")).toBe("工作空间一");
    expect(sanitizeSpaceFileName('a*b?c"d<e>f|g')).toBe("a_b_c_d_e_f_g");
    // 点段与空输入都落到兜底名，不能变成空串：空文件名在「另存为」窗口里是另一个失败分支
    expect(sanitizeSpaceFileName("..")).toBe(FALLBACK);
    expect(sanitizeSpaceFileName(".")).toBe(FALLBACK);
    expect(sanitizeSpaceFileName("")).toBe(FALLBACK);
    expect(sanitizeSpaceFileName("   ")).toBe(FALLBACK);
    expect(sanitizeSpaceFileName(null as unknown as string)).toBe(FALLBACK);
  });

  test("限长在替换之后：先替换非法字符再按替换后的长度截断", () => {
    // 顺序反了（先截断再替换）的话，第 81 位残留的 "/" 会原样留在结果里，
    // 导出的 ZIP 目录名就带上了一个分隔符。
    const separatorAt81 = sanitizeSpaceFileName(`${"z".repeat(MAX)}/${"w".repeat(20)}`);
    expect(separatorAt81).toBe("z".repeat(MAX));
    expect(separatorAt81).not.toContain("/");

    // 分隔符落在截断线以内：它先变成 "_"，再和后面的字符一起被数进 80 的额度里
    const separatorAt71 = sanitizeSpaceFileName(`${"z".repeat(70)}/${"w".repeat(20)}`);
    expect(separatorAt71).toBe(`${"z".repeat(70)}_${"w".repeat(9)}`);
    expect(separatorAt71).toHaveLength(MAX);
    expect(sanitizeSpaceFileName("x".repeat(MAX + 1))).toHaveLength(MAX);
  });

  test("结果里不含任何路径分隔符或 Windows 非法字符", () => {
    // 这个串会被当文件名用；残留一个 / 就足以让另存为落到别的目录
    for (const [, value] of cases) {
      const out = sanitizeSpaceFileName(value as string);
      expect(out, JSON.stringify(value)).not.toMatch(/[\\/:*?"<>|]/u);
      expect(out.length, JSON.stringify(value)).toBeGreaterThan(0);
    }
  });

  test("兜底名本身也走同一套规则（防止有人给 fallback 塞了带斜杠的字面量）", () => {
    // 两侧都用同一个 FALLBACK 常量：前端是 "空间" 字面量、后端是本组的入参，
    // 兜底名若被改成含 "/" 的值，上面那条「不含分隔符」会立刻抓住。
    //
    // 变异验证实测：把后端 `.replace(/^\.+$/, fallback)` 改成 `""` 后本组**一样绿** ——
    // sanitizeSegment 末尾的 `cleaned || fallback` 会把空串再兜回来。它是等价分支，
    // 这里只钉住可观测结果（点段/空/null 都得到 FALLBACK），不计入对该表达式的覆盖。
    expect(sanitizeSegment("", FALLBACK, MAX)).toBe(FALLBACK);
    expect(sanitizeSegment("..", FALLBACK, MAX)).toBe(FALLBACK);
    expect(sanitizeSegment(null, FALLBACK, MAX)).toBe(FALLBACK);
  });
});

// ---------------------------------------------------------------------------
// 未覆盖分支组。四条契约，各自的判别输入说明见各测试内的注释：
//   ① readSpaceCookie 的解码兜底（catch）
//   ② fetchSpaces 的一次性种子（if + 取走后清空）
//   ③ importSpaceArchive 的 File.type 回落（||）
//   ④ 409 冲突字段与回执 spaces 的 ?? 回落
// ---------------------------------------------------------------------------

describe("readSpaceCookie 的解码兜底", () => {
  test("非法百分号编码时原样返回 raw（不抛、也不返回空串）", () => {
    // 来源：别的系统 / 旧版本写进 Cookie 的裸 "%"。decodeURIComponent("%") 抛 URIError；
    // 没有这个 catch 的表现是「切空间后静默落到默认空间」，且现场没有任何线索。
    // 期望值 "%" 与函数末尾「循环走完」的兜底 "" 不重合：catch 被抹掉时这里读到的是 ""，
    // 所以这条断言不会被兜底值顶成恒绿。
    mockDoc.setHeader(`${SPACE_COOKIE_NAME}=%`);
    expect(readSpaceCookie()).toBe("%");

    // 半截多字节序列同理（"%E4" 截断），且这条同时确认兜底与「按名取值」两条规则叠加时仍成立
    mockDoc.setHeader(`a=1; ${SPACE_COOKIE_NAME}=%E4; b=2`);
    expect(readSpaceCookie()).toBe("%E4");

    // 对照组：合法编码走 try 分支，decodeURIComponent 真的解码了一次。
    // 少了这一条，catch 分支被误改成「解码失败时回退到空串再重新编码」也可能看着合理。
    mockDoc.setHeader(`${SPACE_COOKIE_NAME}=${encodeURIComponent("张三")}`);
    expect(readSpaceCookie()).toBe("张三");
  });
});

describe("fetchSpaces 的一次性种子", () => {
  test("种子只被第一个消费者取走：首次零请求，第二次回到真请求", async () => {
    // seededSpaces 是模块级状态；静态 import 的那个实例被本文件其它用例共享，
    // 故用独立实例，避免本用例失败时把陈旧种子漏给后面的用例。
    vi.resetModules();
    const fresh = await import("./spaceClient");
    const seeded = {
      spaces: [{ id: "default", name: "默认空间", pinned: true, createdAt: "2026-01-01T00:00:00.000Z" }],
      current: "种子空间"
    };
    const fetchMock = mockFetchJson({ spaces: [], current: "真请求空间" });

    fresh.seedSpaces(seeded);
    const first = await fresh.fetchSpaces();

    // 种子命中 ⇒ 一个请求都不该发（首屏闸门已经拉过一次，再拉就是抢同一条连接）
    expect(fetchMock).not.toHaveBeenCalled();
    // toBe 断「返回的就是 seedSpaces 收下的那个对象」，而不仅是内容相等
    expect(first).toBe(seeded);

    const second = await fresh.fetchSpaces();

    // 「一次性」本身：取走即清空。不清空的话，增删空间之后列表仍是启动时那份陈旧数据
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).not.toBe(seeded);
    expect(second.current).toBe("真请求空间");
  });
});

describe("importSpaceArchive 的 content-type 回落", () => {
  test("File 无 type 时回落 application/zip；带非标准 type 时原样透传", async () => {
    const space = { id: "甲", name: "甲", createdAt: "2026-01-01T00:00:00.000Z" };
    const fetchMock = mockFetchJson({ space, spaces: [] });
    const headerAt = (i: number) => (fetchMock.mock.calls[i][1]?.headers as Record<string, string>)["content-type"];

    // 无 type 的 File：File.type 是 "" —— falsy 但非 nullish，
    // 这正是唯一能把 `||` 与 `??` 区分开的输入（`"" ?? x` 不短路）。缺了它，
    // 把 `||` 改成 `??` 恒绿，两种写法等价。
    const noType = new File([new Uint8Array([1])], "甲.zip");
    expect(noType.type).toBe("");
    await importSpaceArchive(noType);
    expect(headerAt(0)).toBe("application/zip");

    // 透传一侧刻意用非 canonical 的 mime：断言值若恰好是 "application/zip"，
    // 把整行换成那个字面量也照样绿。
    const oddType = new File([new Uint8Array([1])], "乙.zip", { type: "application/x-zip-compressed" });
    await importSpaceArchive(oddType, { mode: "overwrite" });
    expect(headerAt(1)).toBe("application/x-zip-compressed");
  });
});

describe("importSpaceArchive 的冲突字段与 spaces 回落", () => {
  test("409 回执缺 name/conflictId 两个键时落空串（不是 undefined 字面量）", async () => {
    // 后端 sendSpaceNameConflict 一定带这两个字段；这里是「后端版本不匹配 / 中间层截断正文」的兜底。
    //
    // 夹具要点：name / conflictId **键完全不存在**。写成 name: "" 时 `?? ` 短路取左值（"" 非
    // nullish），右臂从未求值 —— 那种夹具对 `?? ""` 没有任何判别力，恒绿。
    const conflictPayload = {
      error: { code: SPACE_NAME_DUPLICATE, message: "空间名「甲」已存在。" }
    };
    const readJson = async () => conflictPayload;
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      status: 409,
      clone: () => ({ json: readJson }),
      json: readJson
    }));

    const error = await importSpaceArchive(new File([new Uint8Array([1])], "甲.zip")).then(() => null, (e: any) => e);

    expect(error).toBeInstanceOf(SpaceNameConflictError);
    // 两个字段各断一条：任一处的 `?? ""` 被删，这里拿到的会是 String(undefined) === "undefined"
    expect(error.spaceName).toBe("");
    expect(error.conflictId).toBe("");
    // 上层拿这两个字段去说清「撞的是哪一个」，兜底必须是真空串而不是 "undefined" 字面量
    expect(error.spaceName).not.toBe("undefined");
    expect(error.conflictId).not.toBe("undefined");
  });

  test("conflictId 为数字 0 时 String 成 \"0\"，不被 ?? 或 || 吞掉", async () => {
    // 这条同时钉两件事：外层 String() 承重（去掉它 error.conflictId 就是数字 0），
    // 以及 `??` 不是 `||`（0 若是走了 `|| ""` 就会变成空串）。
    const conflictPayload = {
      error: { code: SPACE_NAME_DUPLICATE, message: "空间名「甲」已存在。" },
      name: "甲",
      conflictId: 0
    };
    const readJson = async () => conflictPayload;
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      status: 409,
      clone: () => ({ json: readJson }),
      json: readJson
    }));

    const error = await importSpaceArchive(new File([new Uint8Array([1])], "甲.zip")).then(() => null, (e: any) => e);

    expect(error.conflictId).toBe("0");
    expect(error.spaceName).toBe("甲");
  });

  test("回执缺 spaces 键时返回空数组；带 spaces 时原样透传", async () => {
    const space = { id: "甲", name: "甲", createdAt: "2026-01-01T00:00:00.000Z" };
    const other = { id: "乙", name: "乙", createdAt: "2026-01-01T00:00:00.000Z" };
    // 第一份回执**没有 spaces 键** → `?? []` 的右臂才真的被求值。
    // 写成 spaces: [] 的话左臂（空数组）被取走，右臂从未求值，右臂的任何写法都照样过。
    // 第三份回执 spaces 为 0（falsy 但非 nullish）—— 这是**唯一**能把 `??` 与 `||` 区分开的输入类别
    // （`0 ?? x` 不短路，`0 || x` 短路）。夹具里缺这一档时，把 `??` 改成 `||` 必然恒绿。
    // 这类输入在真实回执里不出现，但「兜底只对 nullish 生效、不对 falsy 生效」正是选 `??` 的理由。
    const payloads = [{ space }, { space, spaces: [space, other] }, { space, spaces: 0 }, { space, spaces: null }];
    let call = 0;
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => payloads[call++]
    }));
    const file = new File([new Uint8Array([1])], "甲.zip", { type: "application/zip" });

    const withoutSpaces = await importSpaceArchive(file);
    expect(withoutSpaces.space).toBe(space);
    expect(withoutSpaces.spaces).toEqual([]);

    const withSpaces = await importSpaceArchive(file, { mode: "overwrite" });
    // 透传一侧：若实现写成 `payload.spaces ?? []` 之外的无条件兜底，这里会拿到 []，length 对不上
    expect(withSpaces.spaces).toHaveLength(2);
    expect(withSpaces.spaces[1].id).toBe("乙");

    // ?? 的两侧各断一条：nullish 才兜底，falsy 原样透传（换成 || 时这条红成 []）
    const falsy = await importSpaceArchive(file, { mode: "rename" });
    expect(falsy.spaces).toBe(0);
    const nullish = await importSpaceArchive(file, { mode: "rename" });
    expect(nullish.spaces).toEqual([]);
  });
});
