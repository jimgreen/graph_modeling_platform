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
//
// ─── 为什么下面两处 baseline 必须由本文件显式钉死 ────────────────────────────
// 本仓 src/ 的 test isolation 关闭（isolate:false + pool:threads），同一 worker 里的
// 测试文件**共享** globalThis 与 vitest 的 timers() 单例（node_modules/vitest/dist/chunks/
// vi.*.js:3576-3680），而「本文件开始时世界是干净的」这个前提在共享注册表下不成立。
// 本文件原有两处依赖该前提，已各自补上钉死（不依赖具体肇事文件，只依赖机制）：
//
//   ① 假定时器单例：useFakeTimers() 见 timers._fakingDate truthy 就抛
//      「"setSystemTime" was called already and date was mocked」（同文件 :3653）。
//      _fakingDate 由 setSystemTime 在**没有**假定时器时置位（:3677），只有 useRealTimers()
//      会清（:3642-3646）。所以任何先跑的文件只要留下「只 mock 过 Date」的残留，
//      本文件第一个 beforeEach 就炸。故顺序必须是 useRealTimers() → useFakeTimers()。
//      （残留不止合成用例：src/appExtracted/appRenderBatch.test.ts:31-102 有 7 处
//        useFakeTimers()+setSystemTime 且全文件只有开头一处 useRealTimers()。）
//
//   ② globalThis.showGlobalMessage：createChooseImage 的上传失败分支调的是**自由标识符**
//      showGlobalMessage（src/appExtracted/appDeviceDefinitionFactories.tsx:3922 —— 该文件
//      @ts-nocheck 且从不 import 它，调用期才从 globalThis 解析）。
//      src/globalMessage.ts 文件末尾三行（:163-165）在**模块加载期**把真弹窗写回 window；
//      而 src/test-setup.ts:16-21 的 noop 是条件式补桩（`typeof … !== "function"` 才装），
//      真弹窗是函数 ⇒ noop 装不回来 ⇒ 污染不可自愈。真弹窗第一件事就是 document.createElement
//      （src/globalMessage.ts:23），本仓 environment 是 node ⇒ ReferenceError ⇒
//      处理器所在的 async IIFE 变成 unhandled rejection ⇒ 本文件两条 createChooseImage 用例
//      看不到 saveImageAsset 调用。src/memoryWatch.test.ts:14-30 与 src/appView.test.tsx:1429-1466
//      记录的是同一个 hazards 与同一套修法。
//
// 还原一律逐键精确还原，不用 vi.unstubAllGlobals() / vi.restoreAllMocks()：
// 那两个清的是**整个 worker** 的桩表与 spy 表，共享注册表下会顺手拆掉别的文件（或 test-setup）
// 装的桩 —— 那正是 isolate:false 下最难查的一类偶发红。
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
    // 先无条件 useRealTimers()：它同时清掉 timers 单例的 _fakingDate 与 _fakingTime
    // （vi.*.js:3642-3651），因此无论上一个文件留下的是「只 mock 过 Date」还是「假定时器还挂着」，
    // 下一行 useFakeTimers() 都不会抛。缺了这一行，本组第一条用例会随机红。
    vi.useRealTimers();
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
  let hadFileReader = false;
  // 与 FileReader 同理：showGlobalMessage 必须由本文件钉死（理由见文件头 ②）。
  // 只钉本 describe 真正会走到的那个 describe —— createImageUploadFallbackAssetId 与
  // groupStateIconDrawingSelection 都不经过弹窗出口，不必背这份 baseline。
  let originalShowGlobalMessage: unknown;

  beforeEach(() => {
    // node 环境没有 FileReader，用最小替身：同步触发 onload，产出固定 data URL。
    hadFileReader = "FileReader" in globalThis;
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
    // 快照 → 钉死 → 逐键还原。不用 vi.stubGlobal/unstubAllGlobals：那套只还原本文件
    // stub 过的键，在共享注册表下语义模糊（见文件头末段）。这里用 test-setup.ts 的同款
    // noop，让「上传失败」这条分支即便被走到也只是安静返回，不产生 unhandled rejection。
    originalShowGlobalMessage = (globalThis as any).showGlobalMessage;
    (globalThis as any).showGlobalMessage = () => {};
    vi.useRealTimers();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
  });

  afterEach(() => {
    // 「本来就没有」的键用 delete 还原成「不存在」，与 appView.test.tsx:1460-1466 同约定：
    // 直接写回 undefined 会留下一个值为 undefined 的键，与 test-setup.ts 的条件式补桩语义打架。
    if (originalShowGlobalMessage === undefined) delete (globalThis as any).showGlobalMessage;
    else (globalThis as any).showGlobalMessage = originalShowGlobalMessage;
    if (hadFileReader) (globalThis as any).FileReader = originalFileReader;
    else delete (globalThis as any).FileReader;
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