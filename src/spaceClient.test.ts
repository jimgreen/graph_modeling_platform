import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
// 后端唯一的 cookie 解析器：往返断言把前后端两侧的编解码绑在一起。
// 后端 .mjs 无类型声明（tsconfig allowJs:false 且 tsconfig include 只含 src），此处只借它做往返验证。
// @ts-expect-error TS7016 无声明文件
import { parseSpaceCookie } from "../server/spaceStore.mjs";
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
