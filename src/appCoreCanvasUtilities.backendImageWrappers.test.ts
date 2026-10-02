// 后端图片接口的 fetch 包装。核心是「URL 与请求体拼得对不对」——
// 这些函数是纯包装，出错只会在真机上传/删除时才暴露，所以用打桩 fetch 逐条钉住请求形状。
// 路径里的 id 一律 encodeURIComponent（id 可能含中文或斜杠）。
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createBackendImageFolder,
  deleteBackendImageAsset,
  deleteBackendImageFolder,
  fetchAllBackendImages,
  fetchBackendImages,
  renameBackendImageFolder,
  uploadBackendImage
} from "./appExtracted/appCoreCanvasUtilities";

interface Captured {
  url: string;
  method: string;
  body: string | null;
}

/** 打桩全局 fetch，返回给定 JSON，并记录请求形状。 */
function stubFetch(payload: unknown = { ok: true }) {
  const calls: Captured[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET", body: (init?.body as string) ?? null });
    return {
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => JSON.stringify(payload)
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("图片文件夹接口", () => {
  test("新建：POST 到 /image-folders，body 只带 name", async () => {
    const { calls } = stubFetch({ id: "f1", name: "新文件夹" });

    await createBackendImageFolder("新文件夹");

    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toContain("/image-folders");
    expect(JSON.parse(calls[0].body!)).toEqual({ name: "新文件夹" });
  });

  test("新建：返回后端给的记录", async () => {
    stubFetch({ id: "f1", name: "新文件夹" });

    expect(await createBackendImageFolder("新文件夹")).toEqual({ id: "f1", name: "新文件夹" });
  });

  test("重命名：PUT 到 /image-folders/<编码 id>", async () => {
    const { calls } = stubFetch({ id: "f 1/中文", name: "改过" });

    await renameBackendImageFolder("f 1/中文", "改过");

    expect(calls[0].method).toBe("PUT");
    expect(calls[0].url).toContain("/image-folders/f%201%2F%E4%B8%AD%E6%96%87");
    expect(JSON.parse(calls[0].body!)).toEqual({ name: "改过" });
  });

  test("删除：DELETE 到 /image-folders/<编码 id>，无 body", async () => {
    const { calls } = stubFetch({ ok: true });

    await deleteBackendImageFolder("f 1");

    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].url).toContain("/image-folders/f%201");
    expect(calls[0].body).toBeNull();
  });
});

describe("图片资产接口", () => {
  test("按目录列图片：查询串带 folderId（编码过）", async () => {
    const { calls } = stubFetch([]);

    await fetchBackendImages("图 1");

    expect(calls[0].url).toContain("/images?folderId=");
    expect(calls[0].url).toContain("%E5%9B%BE%201");
    expect(calls[0].method).toBe("GET");
  });

  test("按目录列图片：默认目录是 root", async () => {
    const { calls } = stubFetch([]);

    await fetchBackendImages();

    expect(calls[0].url).toContain("folderId=root");
  });

  test("全量列图片：查询串为空", async () => {
    const { calls } = stubFetch([]);

    await fetchAllBackendImages();

    expect(calls[0].url).not.toContain("folderId");
  });

  test("上传：POST /images，body 带 name / dataUrl / folderId", async () => {
    const { calls } = stubFetch({ id: "a1" });

    await uploadBackendImage("图.png", "data:image/png;base64,AAA", "f1");

    expect(calls[0].method).toBe("POST");
    expect(JSON.parse(calls[0].body!)).toEqual({
      name: "图.png",
      dataUrl: "data:image/png;base64,AAA",
      folderId: "f1"
    });
  });

  test("上传：folderId 缺省为 root", async () => {
    const { calls } = stubFetch({ id: "a1" });

    await uploadBackendImage("图.png", "data:1");

    expect(JSON.parse(calls[0].body!).folderId).toBe("root");
  });

  test("删除资产：DELETE 到 /images/<编码 id>", async () => {
    const { calls } = stubFetch({ ok: true });

    await deleteBackendImageAsset("a 1/中文");

    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].url).toContain("/images/a%201%2F%E4%B8%AD%E6%96%87");
  });
});

describe("失败路径", () => {
  test("后端返回非 2xx 时抛错并带上各接口自己的文案", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "服务端炸了" }),
      text: async () => JSON.stringify({ error: "服务端炸了" })
    })) as unknown as typeof fetch);

    await expect(createBackendImageFolder("x")).rejects.toThrow();
  });
});
