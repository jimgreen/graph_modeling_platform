/**
 * 图元库 IndexedDB 数据访问层单元测试
 */

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveDeviceTemplate,
  getDeviceTemplate,
  queryTemplatesByCategoryLibrary,
  getAllCustomTemplates,
  deleteDeviceTemplate,
  saveGraphTemplate,
  getGraphTemplate,
  queryGraphTemplatesByType,
  getAllGraphTemplates,
  deleteGraphTemplate,
  saveOverride,
  getOverride,
  getAllOverrides,
  deleteOverride,
  saveDeviceTemplates,
  saveGraphTemplates,
  saveOverrides
} from "./deviceLibraryStorage";
import { clearDeviceLibraryDB, getDBStats, initDeviceLibraryDB } from "./deviceLibraryDB";
import type { DeviceTemplate } from "../model";
import type { GraphTemplate } from "../appExtracted/appCoreCanvasUtilities";

describe("deviceLibraryStorage", () => {
  beforeEach(async () => {
    // 清空数据库
    await clearDeviceLibraryDB();
  });

  afterEach(async () => {
    // 清理
    await clearDeviceLibraryDB();
  });

  describe("设备模板 CRUD", () => {
    const mockTemplate: DeviceTemplate = {
      kind: "test-device",
      label: "测试设备",
      categoryLibrary: "交流设备",
      size: { width: 100, height: 80 },
      params: { param1: "value1" },
      terminalType: "ac",
      terminalCount: 2,
      custom: true
    };

    it("应该保存和获取设备模板", async () => {
      await saveDeviceTemplate(mockTemplate);
      const retrieved = await getDeviceTemplate("test-device");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.kind).toBe("test-device");
      expect(retrieved?.label).toBe("测试设备");
      expect(retrieved?.categoryLibrary).toBe("");
      expect(retrieved?.componentClass).toBe("ACLoad");
    });

    it("具体图元不再持久化类别，类别查询不使用伪造默认值", async () => {
      const template1: DeviceTemplate = { ...mockTemplate, kind: "device-1", categoryLibrary: "交流设备" };
      const template2: DeviceTemplate = { ...mockTemplate, kind: "device-2", categoryLibrary: "直流设备" };
      const template3: DeviceTemplate = { ...mockTemplate, kind: "device-3", categoryLibrary: "交流设备" };

      await saveDeviceTemplate(template1);
      await saveDeviceTemplate(template2);
      await saveDeviceTemplate(template3);

      const acTemplates = await queryTemplatesByCategoryLibrary("交流设备");
      expect(acTemplates).toEqual([]);
    });

    it("应该获取所有自定义设备模板", async () => {
      const customTemplate: DeviceTemplate = { ...mockTemplate, custom: true };
      const builtinTemplate: DeviceTemplate = { ...mockTemplate, kind: "builtin", custom: false };

      await saveDeviceTemplate(customTemplate);
      await saveDeviceTemplate(builtinTemplate);

      const customTemplates = await getAllCustomTemplates();
      expect(customTemplates).toHaveLength(1);
      expect(customTemplates[0].kind).toBe("test-device");
    });

    it("应该删除设备模板", async () => {
      await saveDeviceTemplate(mockTemplate);
      await deleteDeviceTemplate("test-device");

      const retrieved = await getDeviceTemplate("test-device");
      expect(retrieved).toBeNull();
    });

    it("应该处理图片 Blob 存储", async () => {
      const imageBlob = new Blob(["test-image-data"], { type: "image/png" });
      await saveDeviceTemplate(mockTemplate, { backgroundImage: imageBlob });

      const retrieved = await getDeviceTemplate("test-device");
      expect(retrieved).not.toBeNull();
      // 图片应该被转换为 Object URL
      expect(retrieved?.params.backgroundImage).toMatch(/^blob:/);
    });

    it("应该批量保存设备模板", async () => {
      const templates: DeviceTemplate[] = [
        { ...mockTemplate, kind: "device-1" },
        { ...mockTemplate, kind: "device-2" },
        { ...mockTemplate, kind: "device-3" }
      ];

      await saveDeviceTemplates(templates);

      const stats = await getDBStats();
      expect(stats.templates).toBe(3);
    });

    it("具体图元永远不持久化参数或量测业务表", async () => {
      const template: DeviceTemplate = {
        ...mockTemplate,
        params: {
          component_type: "CustomDevice",
          p_set: "12",
          backgroundImage: "device.svg"
        },
        parameterDefinitions: [{
          cnName: "有功设定值",
          enName: "p_set",
          valueType: "float",
          typicalValue: "12"
        }],
        measurementDefinitions: [{
          measurementTypeId: "activePower",
          associatedField: "p_set"
        }]
      };

      await saveDeviceTemplate(template);
      const retrieved = await getDeviceTemplate(template.kind);

      expect(retrieved?.parameterDefinitions).toBeUndefined();
      expect(retrieved?.measurementDefinitions).toBeUndefined();
      expect(retrieved?.params.p_set).toBeUndefined();
      expect(retrieved?.componentClass).toBe("CustomDevice");
      expect(retrieved?.params.component_type).toBeUndefined();
      expect(retrieved?.params.backgroundImage).toBe("device.svg");
      expect(retrieved).not.toHaveProperty("terminalCount");
      expect(retrieved).not.toHaveProperty("terminalTypes");
      expect(retrieved).not.toHaveProperty("isContainer");
    });
  });

  describe("图元模板 CRUD", () => {
    const mockGraphTemplate: GraphTemplate = {
      id: "template-1",
      typeName: "标准模板",
      name: "测试模板",
      sourceSize: { width: 200, height: 150 },
      clipboard: { nodes: [], edges: [], groups: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it("应该保存和获取图元模板", async () => {
      await saveGraphTemplate(mockGraphTemplate);
      const retrieved = await getGraphTemplate("template-1");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe("template-1");
      expect(retrieved?.name).toBe("测试模板");
    });

    it("应该按类型查询图元模板", async () => {
      const template1: GraphTemplate = { ...mockGraphTemplate, id: "t1", typeName: "类型A" };
      const template2: GraphTemplate = { ...mockGraphTemplate, id: "t2", typeName: "类型B" };
      const template3: GraphTemplate = { ...mockGraphTemplate, id: "t3", typeName: "类型A" };

      await saveGraphTemplate(template1);
      await saveGraphTemplate(template2);
      await saveGraphTemplate(template3);

      const typeATemplates = await queryGraphTemplatesByType("类型A");
      expect(typeATemplates).toHaveLength(2);
    });

    it("应该获取所有图元模板", async () => {
      await saveGraphTemplate({ ...mockGraphTemplate, id: "t1" });
      await saveGraphTemplate({ ...mockGraphTemplate, id: "t2" });

      const all = await getAllGraphTemplates();
      expect(all).toHaveLength(2);
    });

    it("应该删除图元模板", async () => {
      await saveGraphTemplate(mockGraphTemplate);
      await deleteGraphTemplate("template-1");

      const retrieved = await getGraphTemplate("template-1");
      expect(retrieved).toBeNull();
    });

    it("应该批量保存图元模板", async () => {
      const templates: GraphTemplate[] = [
        { ...mockGraphTemplate, id: "t1" },
        { ...mockGraphTemplate, id: "t2" }
      ];

      await saveGraphTemplates(templates);

      const stats = await getDBStats();
      expect(stats.graphTemplates).toBe(2);
    });
  });

  describe("设备定义覆盖 CRUD", () => {
    const mockOverride = {
      kind: "test-device",
      params: { param1: "overridden" },
      size: { width: 120, height: 90 }
    };

    it("应该保存和获取设备定义覆盖", async () => {
      await saveOverride("test-device", mockOverride);
      const retrieved = await getOverride("test-device");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.params?.param1).toBe("overridden");
      expect(retrieved?.size?.width).toBe(120);
    });

    it("应该获取所有设备定义覆盖", async () => {
      await saveOverride("device-1", { kind: "device-1", params: { p1: "v1" } });
      await saveOverride("device-2", { kind: "device-2", params: { p2: "v2" } });

      const all = await getAllOverrides();
      expect(Object.keys(all)).toHaveLength(2);
      expect(all["device-1"]?.params?.p1).toBe("v1");
    });

    it("应该删除设备定义覆盖", async () => {
      await saveOverride("test-device", mockOverride);
      await deleteOverride("test-device");

      const retrieved = await getOverride("test-device");
      expect(retrieved).toBeNull();
    });

    it("应该批量保存设备定义覆盖", async () => {
      const overrides = {
        "device-1": { kind: "device-1", params: { p1: "v1" } },
        "device-2": { kind: "device-2", params: { p2: "v2" } }
      };

      await saveOverrides(overrides);

      const stats = await getDBStats();
      expect(stats.overrides).toBe(2);
    });

    it("批量保存按完整快照替换，并在读取时迁移历史空参数表", async () => {
      await saveOverrides({
        "shared:ACGenerator": {
          kind: "shared:ACGenerator",
          parameterDefinitions: []
        },
        "shared:DCDCConverter": {
          kind: "shared:DCDCConverter",
          parameterDefinitions: [],
          parameterDefinitionsIntent: "delete-all"
        }
      });
      const migrated = await getAllOverrides();
      expect(migrated["shared:ACGenerator"]?.parameterDefinitions).toBeUndefined();
      expect(migrated["shared:DCDCConverter"]).toMatchObject({
        parameterDefinitions: [],
        parameterDefinitionsIntent: "delete-all"
      });

      await saveOverrides({
        "shared:ACLoad": { kind: "shared:ACLoad", params: { component_type: "ACLoad" } }
      });
      const replaced = await getAllOverrides();
      expect(Object.keys(replaced)).toEqual(["shared:ACLoad"]);
      expect(replaced["shared:ACLoad"]).toMatchObject({
        kind: "shared:ACLoad",
        params: { component_type: "ACLoad" }
      });
    });
  });

  // ==========================================================================
  // 以下用例针对持久层里「只有裸读裸写才能观察到」的几条分支：
  //   · L22  normalizeStoredDefinitionOverride 的 intent 判定两个臂
  //   · L77  saveDeviceTemplate 对 foregroundImage 的 data: 剥离
  //   · L172 deleteDeviceTemplate 的图片清理循环体
  //   · L269 getOverride 的迁移回写判定两个臂
  //
  // 观察点一律是 **DB 里的裸记录**（initDeviceLibraryDB 直读），不是 getDeviceTemplate
  // / getOverride 归一化后的返回值 —— 归一化会把「键被删掉」这件事抹平，
  // 断言落在返回值上就永远看不到迁移是否真的回写了。
  // ==========================================================================
  describe("存储层归一化与副作用分支", () => {
    const definition = {
      cnName: "有功设定值",
      enName: "p_set",
      valueType: "float" as const,
      typicalValue: "12"
    };

    /** 绕过公开 API 直接落一条「历史/损坏」形态的记录，模拟老库内容。 */
    const putRawOverride = async (record: Record<string, unknown>) => {
      const db = await initDeviceLibraryDB();
      await db.put("overrides", record);
    };

    const readRawOverride = async (kind: string) => {
      const db = await initDeviceLibraryDB();
      return (await db.get("overrides", kind)) as Record<string, any>;
    };

    const readRawTemplate = async (kind: string) => {
      const db = await initDeviceLibraryDB();
      return (await db.get("templates", kind)) as Record<string, any>;
    };

    // ---- L22 臂 A：parameterDefinitions 非空且 intent 不是 "delete-all" → 原样返回 ----
    //
    // 「键不存在」这条臂用 `parameterDefinitionsIntent: "keep"` 探，而不是用缺字段：
    // 缺字段时继续往下走（L23-25 的 copy + delete）对结果没有任何可观测差别 ——
    // 复制一份再删掉一个本来就不存在的键，与直接返回原对象逐字段相同。
    // 只有当 intent **存在但不是 "delete-all"** 时，提前返回与继续执行才会分岔。
    it("非空参数表 + 非 delete-all 的历史 intent：原样保留 intent，不触发回写", async () => {
      await putRawOverride({
        kind: "legacy-keep",
        parameterDefinitions: [definition],
        parameterDefinitionsIntent: "keep",
        updatedAt: "SENTINEL-KEEP"
      });

      const retrieved = await getOverride("legacy-keep");

      expect(retrieved?.parameterDefinitions).toHaveLength(1);
      // 提前返回 ⇒ 归一化不该碰这个非 "delete-all" 的 intent
      expect(retrieved?.parameterDefinitionsIntent).toBe("keep");
      // JSON 与归一化结果一致 ⇒ 不回写，updatedAt 仍是哨兵
      const raw = await readRawOverride("legacy-keep");
      expect(raw.updatedAt).toBe("SENTINEL-KEEP");
    });

    // ---- L22 臂 B：parameterDefinitions 非空且 intent === "delete-all" → 去掉 intent ----
    it("非空参数表 + delete-all：去掉 intent 并把迁移结果回写进库", async () => {
      await putRawOverride({
        kind: "legacy-delete-all",
        parameterDefinitions: [definition],
        parameterDefinitionsIntent: "delete-all",
        updatedAt: "SENTINEL-DELETE-ALL"
      });

      const retrieved = await getOverride("legacy-delete-all");

      expect(retrieved?.parameterDefinitions).toHaveLength(1);
      expect(retrieved?.parameterDefinitionsIntent).toBeUndefined();

      // 归一化改变了内容 ⇒ 必须回写，裸记录里的 intent 也要消失、updatedAt 被换成时间戳
      const raw = await readRawOverride("legacy-delete-all");
      expect(raw.parameterDefinitionsIntent).toBeUndefined();
      expect(raw.updatedAt).not.toBe("SENTINEL-DELETE-ALL");
    });

    // ---- L269 臂 true：空参数表且无 intent ⇒ 归一化删键 ⇒ 回写 ----
    it("空参数表且无 intent 的历史记录：getOverride 把删键结果回写进库", async () => {
      await putRawOverride({
        kind: "legacy-empty-table",
        parameterDefinitions: [],
        updatedAt: "SENTINEL-EMPTY"
      });

      const retrieved = await getOverride("legacy-empty-table");

      expect(retrieved?.parameterDefinitions).toBeUndefined();

      const raw = await readRawOverride("legacy-empty-table");
      // 回写后的裸记录不再有 parameterDefinitions 键，且 updatedAt 已被 saveOverride 覆盖
      expect(Object.hasOwn(raw, "parameterDefinitions")).toBe(false);
      expect(raw.updatedAt).not.toBe("SENTINEL-EMPTY");
    });

    // ---- L269 臂 false：已经是规范形态 ⇒ 不回写 ----
    it("已规范的记录：getOverride 不回写，updatedAt 哨兵保持不变", async () => {
      await putRawOverride({
        kind: "already-normalized",
        parameterDefinitions: [definition],
        updatedAt: "SENTINEL-CLEAN"
      });

      const retrieved = await getOverride("already-normalized");

      expect(retrieved?.parameterDefinitions).toHaveLength(1);
      const raw = await readRawOverride("already-normalized");
      expect(raw.updatedAt).toBe("SENTINEL-CLEAN");
    });

    // ---- L77 三元：data: 前缀的 foregroundImage 在落库前被置空 ----
    //
    // 两条断言构成双边（§2）：三元两侧各断一条，且期望值互不为对方的反义。
    // 断言落在**裸记录**上：`getDeviceTemplate` 会重跑一遍 params 过滤，
    // `undefined` 在那里与「本来就没这个字段」不可区分，观察不到「落库前被置空」。
    // data: 用例刻意不用最典型的 base64 PNG —— 那正是硬编码变异最可能写死的字面量，
    // 这里用 utf8 内联 SVG（§4）。
    it("保存模板时 data: 内联前景图在落库前被置空", async () => {
      const inlineSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>";
      await saveDeviceTemplate({
        kind: "inline-foreground",
        label: "内联前景图",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: { foregroundImage: inlineSvg },
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      });

      const raw = await readRawTemplate("inline-foreground");
      expect(raw.params.foregroundImage).toBeUndefined();
    });

    it("保存模板时非 data: 的前景图引用原样保留", async () => {
      await saveDeviceTemplate({
        kind: "linked-foreground",
        label: "外链前景图",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: { foregroundImage: "devices/relay-outline.svg" },
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      });

      const raw = await readRawTemplate("linked-foreground");
      expect(raw.params.foregroundImage).toBe("devices/relay-outline.svg");
    });

    // ---- L172/L173 循环体：带图模板删除时必抛 InvalidStateError（当前行为记录）----
    //
    // ⚠ 这条用例钉住的是**缺陷**，不是契约。`deleteDeviceTemplate` 先在 L164 开
    // readwrite tx，L168 await 完第一个请求后，L171 又用 `db.getAllFromIndex` 做了
    // 一次**跨事务**读。IndexedDB 的 tx 在「无 pending 请求 + 控制权回到事件循环」
    // 时自动提交，所以 L171 那个 await 一让出，L164 的 tx 就已经死了；L173 重新
    // `tx.objectStore(...)` 拿到的是已提交事务，抛 InvalidStateError。
    //
    // 机理已用探针逐步隔离（tmp/ 下同构形状，三档对照）：
    //   · 两个请求连发、中间不 await          → OK（tx 始终有 pending 请求）
    //   · await 完首个请求后紧接同 tx 请求     → OK（await 只让出微任务，不提交）
    //   · 中间夹一次跨事务读（= 本函数形状）  → 抛 InvalidStateError
    // 关键分界是**跨事务读**，不是「有个 await」。同事务内 `tx.objectStore(...).getAll()`
    // 不会触发提交。
    //
    // 既有 18 条用例之所以从未暴露它：那些用例删的模板都没存过图片，
    // `images` 为空数组 ⇒ L172 的循环体一次都不进。
    //
    // 附带结论（§6.20 路线 B）：变异「L173 delete(img.id) → delete(img.templateKind)」
    // 判 GREEN，**不是**因为 `img.id` 不承重，而是因为
    // `tx.objectStore("templateImages")` 是接收者表达式，**先于实参求值**就抛了，
    // 实参根本没被求值（探针实测：tx 死时实参求值=false，tx 活时=true）。
    // 把上游 tx 之死摘掉（改成同事务读）后，同一条变异立刻可观测：
    // 正确键 img.id → 图片残留 0 张，错误键 templateKind → 残留 1 张。
    // 即：删图的目标键在当前实现下**结构性不可观测**，必须先修 L171 才谈得上覆盖。
    //
    // 修法（未实施，因本 lane 只读生产代码）：把 L171 改成同事务读
    // `await tx.objectStore("templateImages").index("templateKind").getAll(kind)`，
    // 或把删图放到独立事务里。此用例在修复后应当翻红并改写为「图片被清理干净」，
    // 那时删图目标键才成为可覆盖的分支。
    it("带关联图片的模板删除时抛 InvalidStateError（当前行为：readwrite tx 已被跨事务读提交）", async () => {
      const blob = new Blob(["foreground-bytes"], { type: "image/png" });
      await saveDeviceTemplate(
        {
          kind: "with-image",
          label: "带图模板",
          categoryLibrary: "交流设备",
          size: { width: 100, height: 80 },
          params: {},
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        },
        { backgroundImage: blob }
      );

      // 前置条件：图片确实落库了，否则「循环体该不该进」这件事根本没被触发
      expect((await getDBStats()).templateImages).toBe(1);

      // 无图的模板走同一条路径但循环体不进 → 正常返回（对照组，见上方既有用例）
      await expect(deleteDeviceTemplate("with-image")).rejects.toThrowError(/operation|InvalidState/i);
    });
  });

  describe("数据库统计", () => {
    it("应该返回正确的统计信息", async () => {
      const initialStats = await getDBStats();
      expect(initialStats.templates).toBe(0);
      expect(initialStats.templateImages).toBe(0);
      expect(initialStats.graphTemplates).toBe(0);
      expect(initialStats.overrides).toBe(0);

      // 添加数据
      await saveDeviceTemplate({
        kind: "test",
        label: "测试",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: {},
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      });

      const updatedStats = await getDBStats();
      expect(updatedStats.templates).toBe(1);
    });
  });
});
