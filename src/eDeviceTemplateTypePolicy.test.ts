import { describe, expect, test } from "vitest";
import {
  E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES,
  eDeviceTemplateNetworkTypeMismatchMessage,
  eDeviceTemplateSingleTypeMismatchMessage
} from "./eDeviceTemplateTypePolicy";
import { PREDEFINED_E_DEVICE_TEMPLATES } from "./predefinedEDeviceTemplates";

// 限制表是普通对象，这 5 个键直接查表会命中 Object.prototype 上的成员
// （4 个函数 + __proto__ 拿到的 Object.prototype 对象），都不是数组。
const PROTOTYPE_CHAIN_KEYS = ["constructor", "toString", "__proto__", "valueOf", "hasOwnProperty"];

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

  test("限制表的键集被钉死（策略增删必须同步改这条断言）", () => {
    expect(Object.keys(E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES)).toEqual(["国网E格式", "主网实时库", "配网实时库", "台区实时库"]);
    expect(Object.entries(E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES)).toEqual([
      ["国网E格式", ["厂站"]],
      ["主网实时库", ["厂站"]],
      ["配网实时库", ["馈线"]],
      ["台区实时库", ["台区"]]
    ]);
    // Object.hasOwn 守卫成立的前提：这 5 个键都不是表的自有键。
    // 若哪天有人往字面量里写了 "__proto__"，它会走原型 setter 而不进 Object.keys，
    // 上面两条照样绿 —— 所以这里单独钉死「无一是自有键」。
    expect(PROTOTYPE_CHAIN_KEYS.filter((key) => Object.hasOwn(E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES, key))).toEqual([]);
  });

  describe("原型链键守卫（模板名来自工程文件，属外部输入）", () => {
    // 先把「未知模板」的真实返回形态钉成 null：下面原型链键靠它做等价比较，
    // 不先钉住的话两个 undefined 相等也会让断言恒真。
    test("未知模板名的返回形态是 null（作为原型链键断言的基准）", () => {
      expect(eDeviceTemplateSingleTypeMismatchMessage("自定义", "厂站")).toBeNull();
      expect(eDeviceTemplateNetworkTypeMismatchMessage("自定义", ["厂站", "馈线"])).toBeNull();
    });

    test("5 个原型链键当模板名：两个函数都不抛 TypeError，且与未知模板同结果", () => {
      for (const key of PROTOTYPE_CHAIN_KEYS) {
        // 逐键断言而非只测一个：constructor / __proto__ 拿到的东西与另 3 个不同源，
        // 但下游都是 allowed.includes，故对全 5 个键都成立。
        expect(() => eDeviceTemplateSingleTypeMismatchMessage(key, "厂站"), key).not.toThrow(TypeError);
        expect(eDeviceTemplateSingleTypeMismatchMessage(key, "厂站"), `单模型/${key}`).toBeNull();

        // 模型类型集合必须非空：全网拓扑的过滤回调只在有元素时才跑，
        // 传空集合时原型链值根本不会被 .includes 到，断言就假绿了。
        expect(() => eDeviceTemplateNetworkTypeMismatchMessage(key, ["厂站", "馈线"]), key).not.toThrow(TypeError);
        expect(eDeviceTemplateNetworkTypeMismatchMessage(key, ["厂站", "馈线"]), `全网拓扑/${key}`).toBeNull();
      }
    });

    test("正常模型类型键不受守卫影响（防误伤：合法键照常放行与拦截）", () => {
      // 放行侧：合法模板 + 合法类型仍返回 null
      expect(eDeviceTemplateSingleTypeMismatchMessage("配网实时库", "馈线")).toBeNull();
      expect(eDeviceTemplateNetworkTypeMismatchMessage("配网实时库", ["馈线"])).toBeNull();

      // 拦截侧：合法模板 + 不合法类型必须仍返回提示文案。这两条同时杀掉
      // 「守卫写成恒真」「一律返回 undefined/null」这两类变异 —— 否则上面的
      // 原型链断言会因期望值本身就是 null 而全部恒绿。
      expect(eDeviceTemplateSingleTypeMismatchMessage("配网实时库", "厂站")).toBe(
        "当前模板「配网实时库」仅支持配网模型，当前模型类型为「主网」。请转为自定义配置或切换模型类型后重试。"
      );
      expect(eDeviceTemplateNetworkTypeMismatchMessage("配网实时库", ["馈线", "厂站"])).toBe(
        "当前模板「配网实时库」不支持模型类型：厂站；请转为自定义配置或切换模板后重试。"
      );
    });

    test("空串与空白串模板名按未知模板处理（空白串会真正走到查表口）", () => {
      // 这条是回归锁，不是原型链缺陷的守卫：这些键本来就不是原型链成员，
      // 删掉 hasOwn 守卫它们依然返回 null（查表得 undefined）。它拦的是另一类改动 ——
      // 给表塞空白键、或在查表口加 trim/别名逻辑后空白键被误认成合法模板。
      // 空串在 eDeviceTemplateNetworkTypeMismatchMessage 里走的是原有的 falsy 短路，
      // 根本不到查表口；空白串才是真正经过 Object.hasOwn 的那批。
      for (const key of ["", " ", "   ", "\t", "\n"]) {
        expect(eDeviceTemplateSingleTypeMismatchMessage(key, "厂站"), JSON.stringify(key)).toBeNull();
        expect(eDeviceTemplateNetworkTypeMismatchMessage(key, ["厂站"]), JSON.stringify(key)).toBeNull();
      }
    });
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
