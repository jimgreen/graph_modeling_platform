// server/apiV1Control.mjs 的 12 个 handler 直测 —— 此前零直呼。
//
// ## 覆盖的是什么
//
// `e2e/apiV1Control.e2e.test.mjs` 走真实浏览器 + WS 指令通道，覆盖了**成功路径**
// （指令真的下发、前端真的执行）。但每个 handler 前面那段「读 body → 校验参数 →
// 不合法就 400 且**不下发**」的链条，此前没有任何测试直接执行过。
//
// ## 为什么这一段最要紧
//
// 校验漏掉一个字段，后果不是报错而是**带着 undefined 的指令下发到前端**：
//   - kind 不校验 → 前端拿 undefined 造节点，kind 写进落盘 JSON，E 导出时整段消失
//   - x/y 不校验 → NaN 进节点坐标，画布上节点不见了，保存后文件带 NaN
//   - scope 不校验 → 存到错误的范围，用户以为存了其实没存
// 而这些在成功路径测试里**全绿** —— 因为它们只测了「参数都对」的情形。
//
// 注意：`.test.mjs` 必须是纯 JS —— 不要写 `as never` / 类型标注 / 非空断言，
// 那些会触发 RollupError: Parse failure，表现为「Tests: no tests」（看着像通过，实际没跑）。
import { describe, expect, test } from "vitest";
import {
  handleControlDeviceAdd,
  handleControlDeviceDelete,
  handleControlDevicePropertyUpdate,
  handleControlDevicesGroup,
  handleControlDevicesSelect,
  handleControlExportEDeviceDefinition,
  handleControlImportEDeviceDefinition,
  handleControlModelCreate,
  handleControlSave,
  handleControlSchemeCreate,
  handleControlTemplateSaveFromSelection,
  createV1ControlRoutes
} from "./apiV1Control.mjs";
import { CommandTimeoutError, NoOnlineClientError } from "./runtimeRegistry.mjs";
import { fakeCtx, fakeRequest, fakeResponse, fakeUrl, expectNoCall, firstCallName, firstCallParams } from "./handlerTestHarness.mjs";

/** 调一个 handler，返回 { response, ctx }。 */
async function run(handler, { body, search = "", headers, ctx = fakeCtx(), url } = {}) {
  const response = fakeResponse();
  await handler({ request: fakeRequest({ body, headers }), response, url: url ?? fakeUrl(search) }, ctx);
  return { response, ctx };
}

/** 断言这是 400 且带指定错误文案片段。 */
function expectBadRequest(response, fragment) {
  const payload = response.json();
  expect(response.statusCode, JSON.stringify(payload)).toBe(400);
  expect(payload?.ok).toBe(false);
  expect(payload?.error?.code).toBe("bad-request");
  if (fragment) {
    expect(payload?.error?.message, JSON.stringify(payload)).toContain(fragment);
  }
}

// ─── handleControlDeviceAdd ────────────────────────────────

describe("handleControlDeviceAdd", () => {
  test("最小入参：只给 kind 也下发", async () => {
    const { response, ctx } = await run(handleControlDeviceAdd, { body: { kind: "ac-load" } });
    expect(response.statusCode).toBe(200);
    expect(firstCallName(ctx)).toBe("control.device.add");
    expect(firstCallParams(ctx)).toEqual({ kind: "ac-load" });
  });

  test("kind 缺失 / 非字符串 / 空串一律 400 且不下发", async () => {
    for (const [label, body] of [
      ["缺失", {}],
      ["空串", { kind: "" }],
      ["数字", { kind: 123 }],
      ["null", { kind: null }],
      ["数组", { kind: ["ac-load"] }]
    ]) {
      const { response, ctx } = await run(handleControlDeviceAdd, { body });
      expectBadRequest(response, "kind 必填");
      expectNoCall(ctx);
      expect(label).toBeTruthy();
    }
  });

  test("x/y 省略时不下发坐标字段（不是下发 undefined）", async () => {
    const { ctx } = await run(handleControlDeviceAdd, { body: { kind: "ac-load" } });
    expect(firstCallParams(ctx)).not.toHaveProperty("x");
    expect(firstCallParams(ctx)).not.toHaveProperty("y");
  });

  test("x/y 字符串数值被转成 number 下发", async () => {
    const { ctx } = await run(handleControlDeviceAdd, { body: { kind: "ac-load", x: "10", y: "20.5" } });
    expect(firstCallParams(ctx)).toEqual({ kind: "ac-load", x: 10, y: 20.5 });
    // 是真 number 而非字符串：前端把 params 直接写进节点坐标
    expect(typeof firstCallParams(ctx).x).toBe("number");
  });

  test("x/y 非有限或非数值一律 400 且不下发（NaN 进坐标会让节点消失）", async () => {
    for (const [label, body] of [
      ["x=abc", { kind: "ac-load", x: "abc" }],
      ["x=NaN", { kind: "ac-load", x: "NaN" }],
      ["y=Infinity", { kind: "ac-load", y: "Infinity" }],
      ["y=-Infinity", { kind: "ac-load", y: "-Infinity" }],
      ["x={}", { kind: "ac-load", x: {} }],
      ["x=[]", { kind: "ac-load", x: [1, 2] }]
    ]) {
      const { response, ctx } = await run(handleControlDeviceAdd, { body });
      expectBadRequest(response, "必须是数值");
      expectNoCall(ctx);
      expect(label).toBeTruthy();
    }
  });

  test("★ null / 空数组被折成 0 而**通过**校验（Number(null)=0、Number([])=0，都是有限数）", async () => {
    // 与 x/y 的其它用例相反，这里记录的是实测行为而非意图：判据是
    // `Number.isFinite(Number(value))`，而 Number(null) 与 Number([]) 都得 0。
    // 若日后有人收紧判据（比如显式排除 null），本条会先红 —— 那是一次行为变更。
    for (const [label, body] of [
      ["x=null", { kind: "ac-load", x: null }],
      ["y=null", { kind: "ac-load", y: null }],
      ["x=[]", { kind: "ac-load", x: [] }]
    ]) {
      const { response, ctx } = await run(handleControlDeviceAdd, { body });
      expect(response.statusCode, label).toBe(200);
      expect(ctx.calls.length, label).toBe(1);
      expect(label).toBeTruthy();
    }
  });

  test("x=0 是合法坐标（`!== undefined` 判据，不能写成 `if (x)`）", async () => {
    const { response, ctx } = await run(handleControlDeviceAdd, { body: { kind: "ac-load", x: 0, y: 0 } });
    expect(response.statusCode).toBe(200);
    expect(firstCallParams(ctx)).toEqual({ kind: "ac-load", x: 0, y: 0 });
  });

  test("attrs 原样透传，不做形状校验", async () => {
    const attrs = { u: "220", custom: { nested: true } };
    const { ctx } = await run(handleControlDeviceAdd, { body: { kind: "ac-load", attrs } });
    expect(firstCallParams(ctx).attrs).toEqual(attrs);
  });

  test("attrs 为 null 时也透传（判据是 `!== undefined`）", async () => {
    const { response, ctx } = await run(handleControlDeviceAdd, { body: { kind: "ac-load", attrs: null } });
    expect(response.statusCode).toBe(200);
    expect(firstCallParams(ctx)).toHaveProperty("attrs", null);
  });

  test("body 非合法 JSON → 400 且不下发", async () => {
    const { response, ctx } = await run(handleControlDeviceAdd, { body: "不是 JSON" });
    expectBadRequest(response, "合法 JSON");
    expectNoCall(ctx);
  });

  test("空 body（无 body 字节）当作 {}，走 kind 必填分支", async () => {
    const { response, ctx } = await run(handleControlDeviceAdd, { body: undefined });
    expectBadRequest(response, "kind 必填");
    expectNoCall(ctx);
  });
});

// ─── handleControlSchemeCreate ────────────────────────────

describe("handleControlSchemeCreate", () => {
  test("只给 name 也下发", async () => {
    const { response, ctx } = await run(handleControlSchemeCreate, { body: { name: "新方案" } });
    expect(response.statusCode).toBe(200);
    expect(firstCallName(ctx)).toBe("control.scheme.create");
    expect(firstCallParams(ctx)).toEqual({ name: "新方案" });
  });

  test("name 缺失 / 非字符串 / 只有空白一律 400 且不下发", async () => {
    for (const body of [{}, { name: "" }, { name: "   " }, { name: 123 }, { name: null }]) {
      const { response, ctx } = await run(handleControlSchemeCreate, { body });
      expectBadRequest(response, "name 必填");
      expectNoCall(ctx);
    }
  });

  test("parentSchemeId 缺省时不下发该字段", async () => {
    const { ctx } = await run(handleControlSchemeCreate, { body: { name: "新方案" } });
    expect(firstCallParams(ctx)).not.toHaveProperty("parentSchemeId");
  });

  test("parentSchemeId 显式给 undefined 也不下发", async () => {
    const { ctx } = await run(handleControlSchemeCreate, { body: { name: "新方案", parentSchemeId: undefined } });
    expect(firstCallParams(ctx)).not.toHaveProperty("parentSchemeId");
  });

  test("parentSchemeId 不校验形状，原样透传", async () => {
    const { ctx } = await run(handleControlSchemeCreate, { body: { name: "新方案", parentSchemeId: { id: "S1" } } });
    expect(firstCallParams(ctx).parentSchemeId).toEqual({ id: "S1" });
  });
});

// ─── handleControlModelCreate ─────────────────────────────

describe("handleControlModelCreate", () => {
  test("五个合法 modelType 都接受", async () => {
    for (const modelType of ["微网", "厂站", "馈线", "台区", "其他"]) {
      const { response, ctx } = await run(handleControlModelCreate, { body: { name: "模型1", modelType } });
      expect(response.statusCode, modelType).toBe(200);
      expect(firstCallParams(ctx), modelType).toEqual({ name: "模型1", modelType });
    }
  });

  test("modelType 不在白名单里 → 400 且不下发", async () => {
    for (const modelType of ["主网", "", "  ", "AC", 1, null, undefined, ["厂站"]]) {
      const { response, ctx } = await run(handleControlModelCreate, { body: { name: "模型1", modelType } });
      expectBadRequest(response, "modelType");
      expectNoCall(ctx);
    }
  });

  test("modelType 校验在 name 之后（name 也非法时报 name 的错）", async () => {
    const { response } = await run(handleControlModelCreate, { body: { name: "", modelType: "乱码" } });
    expectBadRequest(response, "name 必填");
  });

  test("schemeId 缺省不下发，给了原样透传", async () => {
    const without = await run(handleControlModelCreate, { body: { name: "模型1", modelType: "厂站" } });
    expect(firstCallParams(without.ctx)).not.toHaveProperty("schemeId");

    const with_ = await run(handleControlModelCreate, { body: { name: "模型1", modelType: "厂站", schemeId: "S1" } });
    expect(firstCallParams(with_.ctx).schemeId).toBe("S1");
  });
});

// ─── handleControlDevicesSelect ───────────────────────────

describe("handleControlDevicesSelect", () => {
  test("ids 为数组即接受（含空数组）", async () => {
    const { response, ctx } = await run(handleControlDevicesSelect, { body: { ids: ["n1", "n2"] } });
    expect(response.statusCode).toBe(200);
    expect(firstCallName(ctx)).toBe("control.devices.select");
    expect(firstCallParams(ctx)).toEqual({ ids: ["n1", "n2"] });
  });

  test("空数组合法（等于清空选中，不该被当成非法）", async () => {
    const { response, ctx } = await run(handleControlDevicesSelect, { body: { ids: [] } });
    expect(response.statusCode).toBe(200);
    expect(firstCallParams(ctx)).toEqual({ ids: [] });
  });

  test("ids 非数组一律 400 且不下发", async () => {
    for (const ids of [undefined, null, "n1", 123, {}, new Set(["n1"])]) {
      const { response, ctx } = await run(handleControlDevicesSelect, { body: { ids } });
      expectBadRequest(response, "ids 须为字符串数组");
      expectNoCall(ctx);
    }
  });

  test("数组元素不做类型校验（原样透传，由前端判）", async () => {
    const { ctx } = await run(handleControlDevicesSelect, { body: { ids: ["n1", 2, null] } });
    expect(firstCallParams(ctx).ids).toEqual(["n1", 2, null]);
  });

  test("mode 缺省不下发，给了原样透传（不校验取值域）", async () => {
    const without = await run(handleControlDevicesSelect, { body: { ids: ["n1"] } });
    expect(firstCallParams(without.ctx)).not.toHaveProperty("mode");

    const with_ = await run(handleControlDevicesSelect, { body: { ids: ["n1"], mode: "toggle" } });
    expect(firstCallParams(with_.ctx).mode).toBe("toggle");
  });
});

// ─── handleControlDevicesGroup ────────────────────────────

describe("handleControlDevicesGroup", () => {
  test("无 body 也能下发，params 为空对象", async () => {
    const { response, ctx } = await run(handleControlDevicesGroup, {});
    expect(response.statusCode).toBe(200);
    expect(firstCallName(ctx)).toBe("control.devices.group");
    expect(firstCallParams(ctx)).toEqual({});
  });
});

// ─── handleControlDeviceDelete ────────────────────────────

describe("handleControlDeviceDelete", () => {
  test("ids 缺省时下发空 params（前端取当前选中）", async () => {
    const { response, ctx } = await run(handleControlDeviceDelete, { body: {} });
    expect(response.statusCode).toBe(200);
    expect(firstCallName(ctx)).toBe("control.device.delete");
    // 空 params 而非 { ids: undefined }：判据是 `!== undefined`
    expect(firstCallParams(ctx)).toEqual({});
  });

  test("ids 为数组时透传", async () => {
    const { ctx } = await run(handleControlDeviceDelete, { body: { ids: ["n1"] } });
    expect(firstCallParams(ctx)).toEqual({ ids: ["n1"] });
  });

  test("ids 为空数组合法（等价于「什么都不删」）", async () => {
    const { response, ctx } = await run(handleControlDeviceDelete, { body: { ids: [] } });
    expect(response.statusCode).toBe(200);
    expect(firstCallParams(ctx)).toEqual({ ids: [] });
  });

  test("ids 给了但不是数组 → 400 且不下发", async () => {
    for (const ids of ["n1", 123, {}, null]) {
      const { response, ctx } = await run(handleControlDeviceDelete, { body: { ids } });
      expectBadRequest(response, "ids 须为字符串数组");
      expectNoCall(ctx);
    }
  });
});

// ─── handleControlDevicePropertyUpdate ────────────────────

describe("handleControlDevicePropertyUpdate", () => {
  const valid = { id: "n1", category: "graphic", patch: { u: "220" } };

  test("最小合法入参下发", async () => {
    const { response, ctx } = await run(handleControlDevicePropertyUpdate, { body: valid });
    expect(response.statusCode).toBe(200);
    expect(firstCallName(ctx)).toBe("control.device.property.update");
    expect(firstCallParams(ctx)).toEqual(valid);
  });

  test("id 缺失 / 非字符串 / 空串 → 400 且不下发", async () => {
    for (const id of [undefined, null, "", 123, {}]) {
      const { response, ctx } = await run(handleControlDevicePropertyUpdate, { body: { ...valid, id } });
      expectBadRequest(response, "id 必填");
      expectNoCall(ctx);
    }
  });

  test("category 缺失 / 非字符串 → 400 且不下发", async () => {
    for (const category of [undefined, null, "", 123]) {
      const { response, ctx } = await run(handleControlDevicePropertyUpdate, { body: { ...valid, category } });
      expectBadRequest(response, "category 必填");
      expectNoCall(ctx);
    }
  });

  test("patch 缺失 / 非对象 → 400 且不下发", async () => {
    for (const patch of [undefined, null, "u=220", 123]) {
      const { response, ctx } = await run(handleControlDevicePropertyUpdate, { body: { ...valid, patch } });
      expectBadRequest(response, "patch 须为对象");
      expectNoCall(ctx);
    }
  });

  test("★ 数组 / 布尔被**接受**（判据是 `typeof patch !== \"object\"` 单条，没有 Array.isArray）", async () => {
    // 实测行为：`typeof [] === "object"`、`typeof true === "boolean"` 不成立吗？
    // —— [] 通过、true 被拒。这与 id/category 用 `typeof x !== \"string\"` 的写法同源，
    // 是「只挡明显不对的形状」而非严格白名单。记录在此：日后收紧即行为变更。
    const array = await run(handleControlDevicePropertyUpdate, { body: { ...valid, patch: [] } });
    expect(array.response.statusCode).toBe(200);
    expect(array.ctx.calls).toHaveLength(1);
    expect(firstCallParams(array.ctx).patch).toEqual([]);

    const boolean = await run(handleControlDevicePropertyUpdate, { body: { ...valid, patch: true } });
    expectBadRequest(boolean.response, "patch 须为对象");
    expectNoCall(boolean.ctx);
  });

  test("空 patch 对象合法（清空改写，不该被拒）", async () => {
    const { response, ctx } = await run(handleControlDevicePropertyUpdate, { body: { ...valid, patch: {} } });
    expect(response.statusCode).toBe(200);
    expect(firstCallParams(ctx).patch).toEqual({});
  });

  test("三道校验按 id → category → patch 的顺序", async () => {
    const { response } = await run(handleControlDevicePropertyUpdate, { body: {} });
    expectBadRequest(response, "id 必填");
  });
});

// ─── handleControlSave ────────────────────────────────────

describe("handleControlSave", () => {
  test("两个合法 scope 都接受", async () => {
    for (const scope of ["currentModel", "schemeTree"]) {
      const { response, ctx } = await run(handleControlSave, { body: { scope } });
      expect(response.statusCode, scope).toBe(200);
      expect(firstCallName(ctx)).toBe("control.save");
      expect(firstCallParams(ctx)).toEqual({ scope });
    }
  });

  test("scope 不在二值白名单里 → 400 且不下发", async () => {
    for (const scope of [undefined, null, "", "all", "CurrentModel", "currentmodel", 1, ["currentModel"]]) {
      const { response, ctx } = await run(handleControlSave, { body: { scope } });
      expectBadRequest(response, "scope");
      expectNoCall(ctx);
    }
  });

  test("scope 大小写敏感（不做归一）", async () => {
    const { response } = await run(handleControlSave, { body: { scope: "CURRENTMODEL" } });
    expectBadRequest(response, "scope");
  });
});

// ─── handleControlTemplateSaveFromSelection ───────────────

describe("handleControlTemplateSaveFromSelection", () => {
  test("最小合法入参下发", async () => {
    const { response, ctx } = await run(handleControlTemplateSaveFromSelection, {
      body: { name: "模板1", componentLibrary: "ACLoad" }
    });
    expect(response.statusCode).toBe(200);
    expect(firstCallName(ctx)).toBe("control.template.saveFromSelection");
    expect(firstCallParams(ctx)).toEqual({ name: "模板1", componentLibrary: "ACLoad" });
  });

  test("name 缺失 / 空白 → 400 且不下发", async () => {
    for (const name of [undefined, null, "", "   ", 123]) {
      const { response, ctx } = await run(handleControlTemplateSaveFromSelection, {
        body: { name, componentLibrary: "ACLoad" }
      });
      expectBadRequest(response, "name 必填");
      expectNoCall(ctx);
    }
  });

  test("componentLibrary 缺失 / 空白 → 400 且不下发", async () => {
    for (const componentLibrary of [undefined, null, "", "   ", 123]) {
      const { response, ctx } = await run(handleControlTemplateSaveFromSelection, {
        body: { name: "模板1", componentLibrary }
      });
      expectBadRequest(response, "componentLibrary 必填");
      expectNoCall(ctx);
    }
  });

  test("componentType 是 componentLibrary 的别名", async () => {
    const { response, ctx } = await run(handleControlTemplateSaveFromSelection, {
      body: { name: "模板1", componentType: "ACLoad" }
    });
    expect(response.statusCode).toBe(200);
    expect(firstCallParams(ctx).componentLibrary).toBe("ACLoad");
  });

  test("两个别名同时给时 componentLibrary 优先", async () => {
    const { ctx } = await run(handleControlTemplateSaveFromSelection, {
      body: { name: "模板1", componentLibrary: "ACLoad", componentType: "DCLoad" }
    });
    expect(firstCallParams(ctx).componentLibrary).toBe("ACLoad");
  });

  test("attributeLibraryName 是 categoryLibraryName 的别名", async () => {
    const { ctx } = await run(handleControlTemplateSaveFromSelection, {
      body: { name: "模板1", componentLibrary: "ACLoad", attributeLibraryName: "交流设备" }
    });
    expect(firstCallParams(ctx).categoryLibraryName).toBe("交流设备");
  });

  test("两个别名同时给时 categoryLibraryName 优先", async () => {
    const { ctx } = await run(handleControlTemplateSaveFromSelection, {
      body: {
        name: "模板1",
        componentLibrary: "ACLoad",
        categoryLibraryName: "交流设备",
        attributeLibraryName: "直流设备"
      }
    });
    expect(firstCallParams(ctx).categoryLibraryName).toBe("交流设备");
  });

  test("分类缺省时不下发该字段", async () => {
    const { ctx } = await run(handleControlTemplateSaveFromSelection, {
      body: { name: "模板1", componentLibrary: "ACLoad" }
    });
    expect(firstCallParams(ctx)).not.toHaveProperty("categoryLibraryName");
  });
});

// ─── E 定义导出 / 导入 ────────────────────────────────────

describe("handleControlExportEDeviceDefinition", () => {
  test("无 body 也下发空 params", async () => {
    const { response, ctx } = await run(handleControlExportEDeviceDefinition, {});
    expect(response.statusCode).toBe(200);
    expect(firstCallName(ctx)).toBe("control.e-device-definition.export");
    expect(firstCallParams(ctx)).toEqual({});
  });
});

describe("handleControlImportEDeviceDefinition", () => {
  test("text 非空字符串即下发", async () => {
    const text = "<ACLoad>…</ACLoad>";
    const { response, ctx } = await run(handleControlImportEDeviceDefinition, { body: { text } });
    expect(response.statusCode).toBe(200);
    expect(firstCallName(ctx)).toBe("control.e-device-definition.import");
    expect(firstCallParams(ctx)).toEqual({ text });
  });

  test("text 缺失 / 非字符串 / 只有空白 → 400 且不下发", async () => {
    for (const text of [undefined, null, "", "   ", 123, {}]) {
      const { response, ctx } = await run(handleControlImportEDeviceDefinition, { body: { text } });
      expectBadRequest(response, "text 必填");
      expectNoCall(ctx);
    }
  });

  test("body 非 JSON → 400 且不下发", async () => {
    const { response, ctx } = await run(handleControlImportEDeviceDefinition, { body: "{不是JSON" });
    expectBadRequest(response, "合法 JSON");
    expectNoCall(ctx);
  });
});

// ─── 错误映射 ────────────────────────────────────────────

describe("handleCommandError：三种错误类的映射", () => {
  test("NoOnlineClientError → 503 no-online-client", async () => {
    const { response } = await run(handleControlDevicesGroup, {
      ctx: fakeCtx({ error: new NoOnlineClientError() })
    });
    const payload = response.json();
    expect(response.statusCode).toBe(503);
    expect(payload?.error?.code).toBe("no-online-client");
  });

  test("CommandTimeoutError → 503 ws-timeout", async () => {
    const { response } = await run(handleControlDevicesGroup, {
      ctx: fakeCtx({ error: new CommandTimeoutError("control.devices.group") })
    });
    const payload = response.json();
    expect(response.statusCode).toBe(503);
    expect(payload?.error?.code).toBe("ws-timeout");
  });

  test("前端透传的错误按其 code 映射（bad-request → 400）", async () => {
    const error = Object.assign(new Error("图元不存在。"), { code: "bad-request" });
    const { response } = await run(handleControlDevicesGroup, { ctx: fakeCtx({ error }) });
    const payload = response.json();
    expect(response.statusCode).toBe(400);
    expect(payload?.error?.code).toBe("bad-request");
    expect(payload?.error?.message).toBe("图元不存在。");
  });

  test("无 code 的错误 → control-failed（不是 internal）", async () => {
    const { response } = await run(handleControlDevicesGroup, {
      ctx: fakeCtx({ error: new Error("未知故障") })
    });
    const payload = response.json();
    // control-failed 未在 v1Response 的映射表里 → 落到 500
    expect(payload?.error?.code).toBe("control-failed");
    expect(response.statusCode).toBe(500);
  });

  test("成功时透传裸 data 并包进 ok 信封", async () => {
    const { response } = await run(handleControlDevicesGroup, { ctx: fakeCtx({ result: { groupId: "G1" } }) });
    const payload = response.json();
    expect(response.statusCode).toBe(200);
    expect(payload).toEqual({ ok: true, data: { groupId: "G1" } });
  });

  test("query 的 clientId 经 trim 后下发，空白视为未指定", async () => {
    const withId = await run(handleControlDevicesGroup, { search: "clientId=C1" });
    expect(withId.ctx.calls[0].clientId).toBe("C1");

    const padded = await run(handleControlDevicesGroup, { search: "clientId=%20C2%20" });
    expect(padded.ctx.calls[0].clientId).toBe("C2");

    const blank = await run(handleControlDevicesGroup, { search: "clientId=%20%20" });
    expect(blank.ctx.calls[0].clientId).toBeNull();

    const missing = await run(handleControlDevicesGroup, {});
    expect(missing.ctx.calls[0].clientId).toBeNull();
  });
});

// ─── createV1ControlRoutes ────────────────────────────────

describe("createV1ControlRoutes", () => {
  test("路由表覆盖 11 个端点，路径互不重复", () => {
    const routes = createV1ControlRoutes(fakeCtx());
    expect(routes).toHaveLength(11);
    const sources = routes.map((route) => route.pattern.source);
    expect(new Set(sources).size).toBe(11);
    for (const route of routes) {
      expect(route.method, route.pattern.source).toBe("POST");
    }
  });

  test("缺 spaceId 直接抛错（fail-closed：缺空间会静默打到别人的会话）", async () => {
    const routes = createV1ControlRoutes(fakeCtx());
    const route = routes.find((item) => item.pattern.test("/webgrp/v1/control/devices/group"));
    expect(route).toBeDefined();
    // 派发层恒注入 spaceId；缺失即说明有人绕过了它，必须炸而不是静默放行
    expect(() => route.handle({ request: fakeRequest({}), response: fakeResponse(), url: fakeUrl() }))
      .toThrow(/spaceId/);
  });

  test("带 spaceId 时把空间透传给 sendCommandToClient 的第四参", async () => {
    const calls = [];
    const ctx = {
      sendCommandToClient: (clientId, name, params, spaceId) => {
        calls.push({ clientId, name, params, spaceId });
        return Promise.resolve({ ok: true });
      }
    };
    const routes = createV1ControlRoutes(ctx);
    const route = routes.find((item) => item.pattern.test("/webgrp/v1/control/devices/group"));
    const response = fakeResponse();
    await route.handle({ spaceId: "ws-1", request: fakeRequest({}), response, url: fakeUrl() });
    expect(response.statusCode).toBe(200);
    // 空间由 wrap 统一注入，handler 自己不传 —— 漏传即静默退回「全局取活跃者」
    expect(calls[0].spaceId).toBe("ws-1");
  });

  test("每个端点的 pattern 都能匹配到自己的路径（表没写错路径）", () => {
    const routes = createV1ControlRoutes(fakeCtx());
    const paths = [
      "/webgrp/v1/control/device/add",
      "/webgrp/v1/control/scheme/create",
      "/webgrp/v1/control/model/create",
      "/webgrp/v1/control/devices/select",
      "/webgrp/v1/control/devices/group",
      "/webgrp/v1/control/device/delete",
      "/webgrp/v1/control/device/property/update",
      "/webgrp/v1/control/save",
      "/webgrp/v1/control/template/saveFromSelection",
      "/webgrp/v1/control/e-device-definition/export",
      "/webgrp/v1/control/e-device-definition/import"
    ];
    for (const route of routes) {
      const matched = paths.filter((path) => route.pattern.test(path));
      expect(matched.length, route.pattern.source).toBe(1);
    }
  });
});
