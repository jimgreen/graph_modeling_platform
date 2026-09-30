import { describe, expect, test } from "vitest";
import {
  E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES,
  eDeviceTemplateNetworkTypeMismatchMessage,
  eDeviceTemplateSingleTypeMismatchMessage
} from "./eDeviceTemplateTypePolicy";
import { PREDEFINED_E_DEVICE_TEMPLATES } from "./predefinedEDeviceTemplates";

describe("E 文件接口模板类型限制策略", () => {
  test("限制表里的每个模板名都真实存在（防打错字留下永不生效的死配置）", () => {
    // 方向只能是「策略表 ⊆ 预定义模板表」：反过来不成立 —— 预定义模板新增一个
    // 而策略表没补是合法的（表里没有该 key 视为不限制类型），但策略表里写了个
    // 不存在的模板名则永远匹配不上，是死配置。
    // Set<string> 显式加宽：清单是 const 元组，不加宽时 name 是字面量联合，
    // 与字符串比较会报 TS2345。
    const known = new Set<string>(PREDEFINED_E_DEVICE_TEMPLATES.map((template) => template.name));
    for (const name of Object.keys(E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES)) {
      expect(known.has(name), `策略表里的「${name}」不在预定义 E 模板清单里`).toBe(true);
    }
  });

  test("限制的类型名都在模型类型集合内（防写出永不匹配的类型）", () => {
    // 模型类型全集在 model.ts 定义；这里用本仓其余地方用到的三类做下限校验。
    const knownTypes = new Set(["厂站", "馈线", "台区"]);
    for (const [template, types] of Object.entries(E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES)) {
      expect(types.length, `「${template}」没有写任何允许类型`).toBeGreaterThan(0);
      for (const type of types) {
        expect(knownTypes.has(type), `「${template}」写了未知模型类型「${type}」`).toBe(true);
      }
    }
  });

  describe("eDeviceTemplateSingleTypeMismatchMessage（主流程单模型）", () => {
    test("匹配类型返回 null", () => {
      expect(eDeviceTemplateSingleTypeMismatchMessage("国网E格式", "厂站")).toBeNull();
      expect(eDeviceTemplateSingleTypeMismatchMessage("主网实时库", "厂站")).toBeNull();
      expect(eDeviceTemplateSingleTypeMismatchMessage("配网实时库", "馈线")).toBeNull();
      expect(eDeviceTemplateSingleTypeMismatchMessage("台区实时库", "台区")).toBeNull();
    });

    test("不匹配类型返回提示文案（厂站→主网、馈线→配网的网络标签）", () => {
      expect(eDeviceTemplateSingleTypeMismatchMessage("国网E格式", "馈线")).toBe(
        "当前模板「国网E格式」仅支持主网模型，当前模型类型为「配网」。请转为自定义配置或切换模型类型后重试。"
      );
      expect(eDeviceTemplateSingleTypeMismatchMessage("配网实时库", "厂站")).toBe(
        "当前模板「配网实时库」仅支持配网模型，当前模型类型为「主网」。请转为自定义配置或切换模型类型后重试。"
      );
    });

    test("无类型限制的模板（自定义/原始定义/未知）返回 null", () => {
      expect(eDeviceTemplateSingleTypeMismatchMessage("自定义", "厂站")).toBeNull();
      expect(eDeviceTemplateSingleTypeMismatchMessage("自定义-配网实时库", "厂站")).toBeNull();
      expect(eDeviceTemplateSingleTypeMismatchMessage("原始定义", "厂站")).toBeNull();
      expect(eDeviceTemplateSingleTypeMismatchMessage("", "厂站")).toBeNull();
    });
  });

  describe("eDeviceTemplateNetworkTypeMismatchMessage（全网拓扑）", () => {
    test("无限制/未知模板返回 null", () => {
      expect(eDeviceTemplateNetworkTypeMismatchMessage(null, ["厂站"])).toBeNull();
      expect(eDeviceTemplateNetworkTypeMismatchMessage(undefined, ["厂站"])).toBeNull();
      expect(eDeviceTemplateNetworkTypeMismatchMessage("自定义", ["厂站", "馈线"])).toBeNull();
      expect(eDeviceTemplateNetworkTypeMismatchMessage("原始定义", ["厂站"])).toBeNull();
      expect(eDeviceTemplateNetworkTypeMismatchMessage("自定义-配网实时库", ["台区"])).toBeNull();
    });

    test("全部类型匹配返回 null", () => {
      expect(eDeviceTemplateNetworkTypeMismatchMessage("配网实时库", ["馈线"])).toBeNull();
      expect(eDeviceTemplateNetworkTypeMismatchMessage("国网E格式", ["厂站", "厂站"])).toBeNull();
    });

    test("存在不支持的模型类型时提示并去重排序", () => {
      expect(eDeviceTemplateNetworkTypeMismatchMessage("配网实时库", ["馈线", "厂站", "台区", "厂站"])).toBe(
        "当前模板「配网实时库」不支持模型类型：厂站、台区；请转为自定义配置或切换模板后重试。"
      );
      expect(eDeviceTemplateNetworkTypeMismatchMessage("台区实时库", ["馈线"])).toBe(
        "当前模板「台区实时库」不支持模型类型：馈线；请转为自定义配置或切换模板后重试。"
      );
    });

    test("空/空串类型不触发", () => {
      expect(eDeviceTemplateNetworkTypeMismatchMessage("配网实时库", [])).toBeNull();
      expect(eDeviceTemplateNetworkTypeMismatchMessage("配网实时库", [null, undefined, "", "馈线"])).toBeNull();
    });
  });
});
