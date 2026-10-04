// 上传失败兜底素材 id 的随机源可注入。
//
// 为什么要收敛（本文件存在的理由）：createImageUploadFallbackAssetId 产出的 id 不停在内存里 ——
//   saveImageAsset(id, dataUrl) → localStorage 键（刷新后仍在）
//     → asset.id 进 setImageAssetList / setImageAssets
//       → createApplyExistingImage 落到 params.backgroundImageAssetId
//         （resolveNodeImage / resolveNodeForegroundImage 读的就是该字段）
// 而节点 params 正是保存方案与 SVG / E 文件导出的内容。
// ⇒ 同一张图换台机器上传，id 就不同 ⇒ 导出结果不可复现。这是「会进输出」的一档，必须可注入。
//
// 对照：同文件另有一处 Math.random（stateIconDrawingGroupId），去向追踪结论相反 ——
// 它只是弹窗内分组 token，提交时随 stateIconDrawingToImage 栅格化被丢掉，
// stateIconDrawing.tsx 全文没有一处 groupId，故不进 DOM/节点/导出，保持 Math.random 不注入。
// 该结论的证据写在源码注释里，这里只断言它「不进输出」这件事本身。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  createChooseImage,
  createImageUploadFallbackAssetId,
  groupStateIconDrawingSelection
} from "./appExtracted/appDeviceDefinitionFactories";

// 固定随机源。刻意不用 0 / 0.5 这类「硬编码变异最可能挑的值」，也不取那种
// base36 只有一两位（`Math.random() === 0` 时 slice(2,8) 会切出空串）的数。
const FIXED_RANDOM = 0.123456789;
// 只固定随机源不足以复现整条 id —— id 里还有 Date.now()。用假时钟把这一段也钉住。
const FIXED_NOW = Date.parse("2024-01-02T03:04:05.678Z");
const OTHER_RANDOM = 0.987654321;

/** 期望值仍由同一个固定随机源现算，而不是抄一份字面量 —— 否则测的是常量相等，不是透传。 */
const expectedFallbackId = (randomValue: number, now: number = FIXED_NOW) =>
  `asset-${now}-${randomValue.toString(36).slice(2, 8)}`;

describe("createImageUploadFallbackAssetId：随机源可注入", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("注入固定随机源 ⇒ 整条 id 逐字可复现", () => {
    const first = createImageUploadFallbackAssetId(() => FIXED_RANDOM);
    const second = createImageUploadFallbackAssetId(() => FIXED_RANDOM);

    expect(first).toBe(second);
    expect(first).toBe(expectedFallbackId(FIXED_RANDOM));
  });

  test("换随机源就换 id（守卫没有把入参忽略掉）", () => {
    expect(createImageUploadFallbackAssetId(() => OTHER_RANDOM))
      .not.toBe(createImageUploadFallbackAssetId(() => FIXED_RANDOM));
  });

  test("默认参数仍是 Math.random，格式与收敛前逐字相同", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(OTHER_RANDOM);
    try {
      expect(createImageUploadFallbackAssetId()).toBe(expectedFallbackId(OTHER_RANDOM));
    } finally {
      spy.mockRestore();
    }
  });
});

describe("createChooseImage：兜底 id 真的走了注入的随机源", () => {
  const DATA_URL = "data:image/png;base64,iVBORw0KGgo=";
  let originalFileReader: unknown;

  beforeEach(() => {
    // node 环境没有 FileReader，用最小替身：同步触发 onload，产出固定 data URL。
    originalFileReader = (globalThis as any).FileReader;
    (globalThis as any).FileReader = class {
      result: unknown = DATA_URL;
      error: unknown = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.onload?.();
      }
    };
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
  });

  afterEach(() => {
    (globalThis as any).FileReader = originalFileReader;
    vi.useRealTimers();
  });

  /** 造一个「后台上传抛错」的处理器，跑完它内部的 async IIFE，把可观测的写入点交回来。 */
  const runUploadFailure = async (scope: Record<string, any>) => {
    const saveImageAsset = vi.fn();
    const setImageAssetList = vi.fn();
    const setImageAssets = vi.fn();
    const chooseImage = createChooseImage({
      activeImageFolderId: "root",
      imageTarget: { kind: "stateIconDrawing" },
      refreshImageFolders: vi.fn(),
      requireEditMode: () => true,
      saveImageAsset,
      setImageAssetList,
      setImageAssets,
      uploadBackendImage: () => Promise.reject(new Error("后台上传失败")),
      ...scope
    });

    chooseImage({
      currentTarget: { dataset: { imageImportKind: "image" } },
      target: { files: [{ name: "logo.png" }], value: "C:\\fakepath\\logo.png" }
    } as any);
    // 处理器是 void + async IIFE，只靠微任务队列推进
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    return { saveImageAsset, setImageAssetList, setImageAssets };
  };

  test("注入固定随机源 ⇒ 落盘键与素材列表拿到同一条可复现 id", async () => {
    const { saveImageAsset, setImageAssetList } =
      await runUploadFailure({ randomSource: () => FIXED_RANDOM });

    expect(saveImageAsset).toHaveBeenCalledTimes(1);
    // 断言在被改动的那份数据上：localStorage 的键就是注入源算出的 id
    expect(saveImageAsset).toHaveBeenCalledWith(expectedFallbackId(FIXED_RANDOM), DATA_URL);

    expect(setImageAssetList).toHaveBeenCalledTimes(1);
    const [updater] = setImageAssetList.mock.calls[0];
    // 素材 id 会一路流到节点 params，所以列表里的 id 必须是同一条
    expect(updater([]).map((asset: any) => asset.id)).toEqual([expectedFallbackId(FIXED_RANDOM)]);
  });

  test("不注入时仍走 Math.random，产出格式不变", async () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(OTHER_RANDOM);
    try {
      const { saveImageAsset } = await runUploadFailure({});

      expect(saveImageAsset).toHaveBeenCalledWith(expectedFallbackId(OTHER_RANDOM), DATA_URL);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("stateIconDrawingGroupId：随机后缀不进输出", () => {
  test("groupId 只落在弹窗元素上，提交栅格化后不留痕迹", () => {
    // 用注入的固定 groupId 分组，确认 groupId 的作用域就是 dialog.elements 这一个对象；
    // 真正的随机后缀只在同位置换了个字符串，取值不进任何序列化产物。
    const current = {
      elements: [
        { id: "a", x: 10, y: 10, width: 8, height: 8 },
        { id: "b", x: 30, y: 10, width: 8, height: 8 }
      ],
      selectedElementId: "b",
      selectedElementIds: ["a", "b"]
    };

    const grouped = groupStateIconDrawingSelection(current, { current: [] }, () => "state-icon-group-fixed");
    const markup = grouped.elements
      .map((element: any) => `${element.id}:${element.groupId}`)
      .join(",");

    // 分组只改 groupId，不改几何 —— 这也是提交时能原样栅格化的原因
    expect(markup).toBe("a:state-icon-group-fixed,b:state-icon-group-fixed");
    expect(grouped.elements.map((element: any) => `${element.x},${element.y}`)).toEqual(["10,10", "30,10"]);
  });
});