import { describe, expect, test } from "vitest";
import { finalizeEDevicePreviewRecords, type EDeviceExport } from "../model-eexport";
import type { ProjectFile } from "../model";

/**
 * E 文件编辑器预览引用列定稿守卫（纯合成输入，不依赖 data/ 样本）。
 *
 * 防的具体 Bug（轮 15「表内容为空」实机反馈，见 finalizeEDevicePreviewRecords 顶注）：
 *   「查看/编辑E文件」预览若漏过 finalizeEDevicePreviewRecords 定稿步，
 *   成员关系表（ACContainerDev）的 device_id 恒停在构建期空占位 —— 编辑器整列 0/空，
 *   container_idx 停在局部值，与导出文件不一致；实机导入后引用全部断链。
 *
 * 为什么不用 e-file-editor-reference.test.ts 那条同源断言代替本文件：
 *   该文件整组 `describe.skipIf(!HAS_PROJECT_SAMPLES)`，样本在 gitignore 的 data/ 下，
 *   干净检出 / CI 上恒不跑 —— 这条契约在那里没有任何「随时可执行」的守卫。
 *   本文件用手工 records 直接喂定稿函数，零外部资源。
 *
 * 输入形状说明（与生产 buildEDeviceRecords 的产出同构）：
 *   · `_container_node_id` / `_member_node_id` / `_bound_device_id` 是构建期注入的内部字段
 *     （下划线前缀不成列），定稿只认它们；
 *   · 非模板态（options = {}）即走 CamelCase 段名与 `表名_idx` 引用形态，模板分支不参与。
 */
const EMPTY_PROJECT: ProjectFile = { name: "合成", nodes: [], edges: [], measurements: [] } as unknown as ProjectFile;

const containerRecord = (): EDeviceExport => ({
  id: "box-1",
  kind: "ac-busbar",
  section: "ACContainer",
  params: { idx: "2", name: "容器箱", is_gateway: "1", _bound_device_id: "load-1" }
});

const memberRecord = (memberNodeId: string): EDeviceExport => ({
  id: `member-${memberNodeId}`,
  kind: "ac-load",
  section: "ACContainerDev",
  params: {
    device_id: "构建期占位",
    container_idx: "",
    container_type: "",
    _container_node_id: "box-1",
    _member_node_id: memberNodeId
  }
});

const deviceRecord = (): EDeviceExport => ({
  id: "load-1",
  kind: "ac-load",
  section: "ACLoad",
  params: { idx: "1", name: "负荷1" }
});

describe("finalizeEDevicePreviewRecords 引用列定稿（合成输入）", () => {
  test("成员表 device_id 定稿为 设备表名_idx（漏定稿即整列停在构建期占位）", () => {
    const records = [deviceRecord(), containerRecord(), memberRecord("load-1")];

    finalizeEDevicePreviewRecords(EMPTY_PROJECT, {}, records);

    const member = records.find((r) => r.section === "ACContainerDev")!;
    // 承重判据：device_id 必须从「构建期占位」变成真实引用。定稿步被删/改坏 → 仍是占位 → 红。
    expect(member.params.device_id).toBe("ACLoad_1");
  });

  test("成员表 container_idx 定稿为容器行裸 idx（轮 18 起两态同形，不带表名前缀）", () => {
    const records = [deviceRecord(), containerRecord(), memberRecord("load-1")];

    finalizeEDevicePreviewRecords(EMPTY_PROJECT, {}, records);

    const member = records.find((r) => r.section === "ACContainerDev")!;
    // 初始是空串：定稿没跑就还是空串，断言能咬住「container_idx 被写了没有」
    expect(member.params.container_idx).toBe("2");
  });

  test("容器表 bound_device_idx 定稿为绑定设备的 表名_idx", () => {
    const records = [deviceRecord(), containerRecord(), memberRecord("load-1")];

    finalizeEDevicePreviewRecords(EMPTY_PROJECT, {}, records);

    const box = records.find((r) => r.section === "ACContainer")!;
    // 初始无此键：定稿没跑就保持 undefined（不是空串也不是 0）
    expect(box.params.bound_device_idx).toBe("ACLoad_1");
  });

  test("成员指向不存在的节点：device_id 主动清空为空串（行保留，整列为空），不指向错误行", () => {
    // device_id 初始故意给非空占位：若定稿步被删，这里仍是「构建期占位」而非空串 ——
    // 初始值与期望值不同，这条断言才有判别力（期望值 ≠ 默认值的陷阱，见 AGENTS.md）。
    const records = [containerRecord(), memberRecord("ghost-node")];

    finalizeEDevicePreviewRecords(EMPTY_PROJECT, {}, records);

    const member = records.find((r) => r.section === "ACContainerDev")!;
    expect(member.params.device_id).toBe("");
    // 容器行的定稿不受成员是否有记录影响：container_idx 仍指向容器最终落位
    expect(member.params.container_idx).toBe("2");
  });
});
