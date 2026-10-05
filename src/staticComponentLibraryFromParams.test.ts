// staticComponentLibraryFromParams 直测 —— 此前测试侧 0 调用：
// 既有测试只在**注释**里记过这条优先级链（modelStaticTemplateJudges.test.ts:6/25、
// staticRouteAvoidance.test.ts:227），函数本体从未被任何用例直接调过。
// （它本身不是死代码：model.ts 的 isStaticGraphicParams /
// staticComponentLibraryForNodeLike / 静态按钮判定，以及 model-eexport.ts:428
// 都在生产路径上调用它。缺的是钉住「谁赢」的断言。）
//
// 它是上面几处判定的唯一取名入口，所以链上每个决定都是纯真契约：
//   · 参与链的字段只有 component_type → componentLibrary → componentType，逐级短路；
//   · 兜底是空串：调用方据此再回落到 kind 映射表，而不是回落去硬编码某个库名；
//   · trim 只作用在**最终胜出的那一个值**上 —— 这一点不能与「每级先 trim」混淆，
//     两者对「component_type 是纯空白」这一输入给出不同答案，下面有用例钉住。
import { describe, expect, test } from "vitest";

import { staticComponentLibraryFromParams } from "./model";

// 三个字段分属三个命名空间（snake / camel 小写 l / camel 小写 t），
// 用互不相同的真实库名做「谁赢」的判据：同名会让优先级断言失去分辨力。
const COMPONENT_TYPE_VALUE = "StaticConnectorSymbol";
const COMPONENT_LIBRARY_VALUE = "StaticFlowNode";
const COMPONENT_TYPE_CAMEL_VALUE = "StaticAnnotationSymbol";

describe("三级优先级", () => {
  test("三个字段各自单独提供时都按原值返回", () => {
    expect(staticComponentLibraryFromParams({ component_type: COMPONENT_TYPE_VALUE })).toBe(COMPONENT_TYPE_VALUE);
    expect(staticComponentLibraryFromParams({ componentLibrary: COMPONENT_LIBRARY_VALUE })).toBe(COMPONENT_LIBRARY_VALUE);
    expect(staticComponentLibraryFromParams({ componentType: COMPONENT_TYPE_CAMEL_VALUE })).toBe(COMPONENT_TYPE_CAMEL_VALUE);
  });

  test("取值不做白名单过滤，未知库名也照原样透传", () => {
    // 校验在 isStaticComponentLibraryName 那一层；这里若被顺手加了过滤，
    // 调用方的错误提示与排查信息就丢了。名字也刻意取得不像任何真实库名，
    // 免得「恒返回 StaticButton」这类硬编码变异蒙混过关。
    expect(staticComponentLibraryFromParams({ component_type: "NotALibraryAtAll" })).toBe("NotALibraryAtAll");
    expect(staticComponentLibraryFromParams({ componentLibrary: "totally-unknown" })).toBe("totally-unknown");
  });

  test("三级同时提供且值互不相同时返回 component_type", () => {
    expect(
      staticComponentLibraryFromParams({
        component_type: COMPONENT_TYPE_VALUE,
        componentLibrary: COMPONENT_LIBRARY_VALUE,
        componentType: COMPONENT_TYPE_CAMEL_VALUE
      })
    ).toBe(COMPONENT_TYPE_VALUE);
  });

  test("component_type 缺席时取 componentLibrary 而非 componentType", () => {
    // 只钉第二级压第三级：把两级顺序对调，这条会红。
    expect(
      staticComponentLibraryFromParams({
        componentLibrary: COMPONENT_LIBRARY_VALUE,
        componentType: COMPONENT_TYPE_CAMEL_VALUE
      })
    ).toBe(COMPONENT_LIBRARY_VALUE);
  });

  test("component_type 为空串时视为无值，落到 componentLibrary", () => {
    // 空串是 falsy，会被 || 跳过 —— 这正是与 ?? 的分界：改成 ?? 就会返回空串。
    expect(
      staticComponentLibraryFromParams({
        component_type: "",
        componentLibrary: COMPONENT_LIBRARY_VALUE,
        componentType: COMPONENT_TYPE_CAMEL_VALUE
      })
    ).toBe(COMPONENT_LIBRARY_VALUE);
  });

  test("前两级都为空串时落到 componentType", () => {
    expect(
      staticComponentLibraryFromParams({
        component_type: "",
        componentLibrary: "",
        componentType: COMPONENT_TYPE_CAMEL_VALUE
      })
    ).toBe(COMPONENT_TYPE_CAMEL_VALUE);
  });
});

describe("兜底与归一", () => {
  test("三级全为空串或全缺席时都回落到空串", () => {
    expect(staticComponentLibraryFromParams({})).toBe("");
    expect(staticComponentLibraryFromParams({ component_type: "", componentLibrary: "", componentType: "" })).toBe("");
    // 入参缺失（非 undefined 的 null 不在签名内，故不测）
    expect(staticComponentLibraryFromParams(undefined)).toBe("");
  });

  test("只由空白组成的 component_type 仍算有值，trim 后得到空串而不回落", () => {
    // 纯空白是非空字符串，|| 判为真，链在此终止；trim 发生在链之后。
    // 若把 trim 改成逐级先做（component_type.trim() || ...），这里会变成
    // StaticButton —— 两者对同一输入给出不同答案，故此用例有分辨力。
    expect(
      staticComponentLibraryFromParams({ component_type: "   ", componentLibrary: "StaticButton" })
    ).toBe("");
  });

  test("胜出的值被 trim，入参对象不被修改", () => {
    const params: Record<string, string> = {
      component_type: "  StaticConnectorSymbol  ",
      componentLibrary: " StaticFlowNode ",
      note: "keep me"
    };
    const before = JSON.stringify(params);
    Object.freeze(params); // 严格模式下任何写入都会抛 —— 冻结即断言，无需事后比对

    expect(staticComponentLibraryFromParams(params)).toBe("StaticConnectorSymbol");
    expect(staticComponentLibraryFromParams({ componentLibrary: " StaticFlowNode " })).toBe("StaticFlowNode");
    expect(JSON.stringify(params)).toBe(before);
    expect(Object.isFrozen(params)).toBe(true);
  });
});
