import { describe, expect, test } from "vitest";
import {
  eDeviceTemplateNetworkTypeMismatchMessage,
  eDeviceTemplateSingleTypeMismatchMessage
} from "./eDeviceTemplateTypePolicy";

describe("E 文件接口模板类型限制策略", () => {
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
