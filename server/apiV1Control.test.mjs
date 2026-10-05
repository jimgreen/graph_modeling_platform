import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws";
import { createImageServer } from "./server.mjs";
import { apiPath } from "./config.mjs";
import { handleControlDevicesGroup, handleControlSave } from "./apiV1Control.mjs";

// /webgrp/v1/control/* 集成测试：起真实 image-server（含 WS 双向指令通道 + control 路由），
// 用真实 WS 客户端连入响应 command，打 HTTP POST 验证端到端。

let server;
let baseUrl;
let wsUrl;

async function startServer() {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  wsUrl = `ws://127.0.0.1:${port}/webgrp/ws`;
}

beforeEach(async () => {
  await startServer();
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// 连接一个会响应 command 的客户端。responder(name,params)=>{ok,data}|{ok:false,error}
function connectCommandResponder(clientId, responder) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "register", clientId }));
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "registered") {
        resolve(ws);
        return;
      }
      if (msg.type === "command") {
        Promise.resolve()
          .then(() => responder(msg.name, msg.params ?? {}))
          .then((envelope) => {
            ws.send(JSON.stringify({
              type: "command-response",
              requestId: msg.requestId,
              ok: envelope.ok,
              data: envelope.ok ? envelope.data : undefined,
              error: envelope.ok ? undefined : envelope.error
            }));
          })
          .catch(() => {
            ws.send(JSON.stringify({
              type: "command-response",
              requestId: msg.requestId,
              ok: false,
              error: { code: "control-failed", message: "测试 responder 异常。" }
            }));
          });
      }
    });
    ws.on("error", reject);
  });
}

async function postV1(pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 非 JSON
  }
  return { status: res.status, json };
}

describe(apiPath("/v1/control/device/add"), () => {
  test("成功新增 → 200 {ok:true,data:{id}}", async () => {
    const ws = await connectCommandResponder("c1", (name, params) => {
      expect(name).toBe("control.device.add");
      expect(params).toMatchObject({ kind: "busbar", x: 100, y: 200 });
      return { ok: true, data: { id: "n1" } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/device/add"), { kind: "busbar", x: 100, y: 200 });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ id: "n1" });
    ws.close();
  });

  test("attrs 透传到指令参数", async () => {
    const ws = await connectCommandResponder("c1", (_name, params) => {
      expect(params.attrs).toEqual({ name: "自定义", rotation: 45 });
      return { ok: true, data: { id: "n2" } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/device/add"), {
      kind: "busbar",
      attrs: { name: "自定义", rotation: 45 }
    });
    expect(status).toBe(200);
    expect(json.data.id).toBe("n2");
    ws.close();
  });

  test("缺 kind → 400 bad-request（不下发指令）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/device/add"), { x: 100 });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  });

  // Number("abc") 是 NaN，原实现无 isFinite 校验就下发，前端把 NaN 写进节点坐标
  // → 画布上节点消失、保存后文件带 NaN。转换不成即 400。
  test("x 非数值 → 400 bad-request（不下发指令）", async () => {
    let dispatched = false;
    const ws = await connectCommandResponder("c1", () => {
      dispatched = true;
      return { ok: true, data: { id: "n1" } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/device/add"), { kind: "busbar", x: "abc" });
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
    expect(dispatched).toBe(false);
    ws.close();
  });

  test("y 非数值 → 400 bad-request（不下发指令）", async () => {
    let dispatched = false;
    const ws = await connectCommandResponder("c1", () => {
      dispatched = true;
      return { ok: true, data: { id: "n1" } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/device/add"), { kind: "busbar", y: "abc" });
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
    expect(dispatched).toBe(false);
    ws.close();
  });

  test("可转的字符串坐标仍放行（Number 语义不变）", async () => {
    const ws = await connectCommandResponder("c1", (_name, params) => {
      expect(params).toMatchObject({ kind: "busbar", x: 100, y: 200 });
      return { ok: true, data: { id: "n1" } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/device/add"), { kind: "busbar", x: "100", y: "200" });
    expect(status).toBe(200);
    expect(json.data.id).toBe("n1");
    ws.close();
  });

  test("非法 JSON body → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}${apiPath("/v1/control/device/add")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json"
    });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("无在线客户端 → 503 no-online-client（control.device.add）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/device/add"), { kind: "busbar" });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });

  test("前端返失败 → 透传 error code（bad-request：未知图元类型 foo）", async () => {
    const ws = await connectCommandResponder("c1", () => ({
      ok: false,
      error: { code: "bad-request", message: "未知图元类型：foo" }
    }));
    const { status, json } = await postV1(apiPath("/v1/control/device/add"), { kind: "foo" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
    expect(json.error.message).toBe("未知图元类型：foo");
    ws.close();
  });

  test("前端不响应 → 503 ws-timeout", async () => {
    // 连接但不响应 command
    const ws = await connectCommandResponder("c1", () => new Promise(() => {}));
    const { status, json } = await postV1(apiPath("/v1/control/device/add"), { kind: "busbar" });
    expect(status).toBe(503);
    expect(json.error.code).toBe("ws-timeout");
    ws.close();
  }, 10000);
});

describe(apiPath("/v1/control/scheme/create"), () => {
  test("成功新建 → 200 {ok:true,data:{id,name,path}}", async () => {
    const ws = await connectCommandResponder("c1", (name, params) => {
      expect(name).toBe("control.scheme.create");
      expect(params).toMatchObject({ name: "方案1", parentSchemeId: "p1" });
      return { ok: true, data: { id: "s1", name: "方案1", path: ["方案1"] } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/scheme/create"), { name: "方案1", parentSchemeId: "p1" });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ id: "s1", name: "方案1", path: ["方案1"] });
    ws.close();
  });

  test("缺 name → 400 bad-request（不下发指令，body 只给 parentSchemeId）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/scheme/create"), { parentSchemeId: "p1" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  });

  test("无在线客户端 → 503 no-online-client（control.scheme.create）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/scheme/create"), { name: "方案1" });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });

  test("前端返失败 → 透传 error code（bad-request：方案名称重复）", async () => {
    const ws = await connectCommandResponder("c1", () => ({
      ok: false,
      error: { code: "bad-request", message: "方案名称重复，无法新建方案。" }
    }));
    const { status, json } = await postV1(apiPath("/v1/control/scheme/create"), { name: "重复" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
    expect(json.error.message).toBe("方案名称重复，无法新建方案。");
    ws.close();
  });
});

describe(apiPath("/v1/control/model/create"), () => {
  test("成功新建 → 200 {ok:true,data:{id,name,schemeId}}", async () => {
    const ws = await connectCommandResponder("c1", (name, params) => {
      expect(name).toBe("control.model.create");
      expect(params).toMatchObject({ name: "模型1", schemeId: "s1", modelType: "厂站" });
      return { ok: true, data: { id: "m1", name: "模型1", schemeId: "s1", modelType: "厂站", idx: 1 } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/model/create"), { name: "模型1", schemeId: "s1", modelType: "厂站" });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ id: "m1", name: "模型1", schemeId: "s1", modelType: "厂站", idx: 1 });
    ws.close();
  });

  test("缺 name → 400 bad-request（不下发指令，body 只给 schemeId）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/model/create"), { schemeId: "s1" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  });

  test("缺少或非法 modelType → 400 bad-request（不下发指令）", async () => {
    for (const body of [
      { name: "模型1", schemeId: "s1" },
      { name: "模型1", schemeId: "s1", modelType: "未知类型" }
    ]) {
      const { status, json } = await postV1(apiPath("/v1/control/model/create"), body);
      expect(status).toBe(400);
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("bad-request");
    }
  });

  test("无在线客户端 → 503 no-online-client（control.model.create）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/model/create"), { name: "模型1", modelType: "厂站" });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });

  test("前端返失败 → 透传 error code（bad-request：无可用方案）", async () => {
    const ws = await connectCommandResponder("c1", () => ({
      ok: false,
      error: { code: "bad-request", message: "无可用方案，请先创建方案" }
    }));
    const { status, json } = await postV1(apiPath("/v1/control/model/create"), { name: "模型1", modelType: "厂站" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
    expect(json.error.message).toBe("无可用方案，请先创建方案");
    ws.close();
  });
});

describe(apiPath("/v1/control/devices/select"), () => {
  test("成功选中 → 200 {ok:true,data:{selectedIds,validIds,invalidIds}}", async () => {
    const ws = await connectCommandResponder("c1", (name, params) => {
      expect(name).toBe("control.devices.select");
      expect(params.ids).toEqual(["n1", "n2"]);
      expect(params.mode).toBe("set");
      return { ok: true, data: { selectedIds: ["n1", "n2"], validIds: ["n1", "n2"], invalidIds: [] } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/devices/select"), { ids: ["n1", "n2"], mode: "set" });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.selectedIds).toEqual(["n1", "n2"]);
    expect(json.data.validIds).toEqual(["n1", "n2"]);
    expect(json.data.invalidIds).toEqual([]);
    ws.close();
  });

  test("缺 ids → 400 bad-request（不下发指令）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/devices/select"), { mode: "set" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  });

  test("无在线客户端 → 503 no-online-client（control.devices.select）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/devices/select"), { ids: ["n1"] });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });
});

describe(apiPath("/v1/control/devices/group"), () => {
  test("成功组合 → 200 {ok:true,data:{groupId,name}}", async () => {
    const ws = await connectCommandResponder("c1", (name) => {
      expect(name).toBe("control.devices.group");
      return { ok: true, data: { groupId: "g1", name: "组合1" } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/devices/group"), {});
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.groupId).toBe("g1");
    expect(json.data.name).toBe("组合1");
    ws.close();
  });

  test("无在线客户端 → 503 no-online-client（control.devices.group）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/devices/group"), {});
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });

  test("前端返 control-failed → 透传 error code", async () => {
    const ws = await connectCommandResponder("c1", () => ({
      ok: false,
      error: { code: "control-failed", message: "至少选中 2 个图元方可组合。" }
    }));
    const { status, json } = await postV1(apiPath("/v1/control/devices/group"), {});
    expect(status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("control-failed");
    ws.close();
  });
});

describe(apiPath("/v1/control/device/delete"), () => {
  test("成功删除 → 200 {ok:true,data:{deletedIds}}", async () => {
    const ws = await connectCommandResponder("c1", (name, params) => {
      expect(name).toBe("control.device.delete");
      expect(params.ids).toEqual(["n1", "n2"]);
      return { ok: true, data: { deletedIds: ["n1", "n2"] } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/device/delete"), { ids: ["n1", "n2"] });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.deletedIds).toEqual(["n1", "n2"]);
    ws.close();
  });

  test("ids 缺省 → 透传空 params（前端取当前选中）", async () => {
    const ws = await connectCommandResponder("c1", (_name, params) => {
      expect(params.ids).toBeUndefined();
      return { ok: true, data: { deletedIds: ["n1"] } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/device/delete"), {});
    expect(status).toBe(200);
    expect(json.data.deletedIds).toEqual(["n1"]);
    ws.close();
  });

  test("非数组 ids → 400 bad-request（不下发指令）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/device/delete"), { ids: "not-array" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  });

  test("无在线客户端 → 503 no-online-client（control.device.delete）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/device/delete"), { ids: ["n1"] });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });
});

describe(apiPath("/v1/control/device/property/update"), () => {
  test("成功修改 → 200 {ok:true,data:{id,category,patched}}", async () => {
    const ws = await connectCommandResponder("c1", (name, params) => {
      expect(name).toBe("control.device.property.update");
      expect(params).toMatchObject({ id: "n1", category: "graphic", patch: { rotation: 90 } });
      return { ok: true, data: { id: "n1", category: "graphic", patched: ["rotation"] } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/device/property/update"), { id: "n1", category: "graphic", patch: { rotation: 90 } });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.id).toBe("n1");
    ws.close();
  });

  test("缺 id → 400 bad-request", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/device/property/update"), { category: "graphic", patch: { x: 0 } });
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("缺 category → 400 bad-request", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/device/property/update"), { id: "n1", patch: { x: 0 } });
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("缺 patch → 400 bad-request", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/device/property/update"), { id: "n1", category: "graphic" });
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("无在线客户端 → 503 no-online-client（control.device.property.update）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/device/property/update"), { id: "n1", category: "graphic", patch: { x: 0 } });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });
});

describe(apiPath("/v1/control/save"), () => {
  test("scope=currentModel → 200 {ok:true,data:{saved:true,scope}}", async () => {
    const ws = await connectCommandResponder("c1", (name, params) => {
      expect(name).toBe("control.save");
      expect(params.scope).toBe("currentModel");
      return { ok: true, data: { saved: true, scope: "currentModel" } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/save"), { scope: "currentModel" });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.saved).toBe(true);
    expect(json.data.scope).toBe("currentModel");
    ws.close();
  });

  test("scope=schemeTree → 200", async () => {
    const ws = await connectCommandResponder("c1", (name, params) => {
      expect(params.scope).toBe("schemeTree");
      return { ok: true, data: { saved: true, scope: "schemeTree" } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/save"), { scope: "schemeTree" });
    expect(status).toBe(200);
    expect(json.data.scope).toBe("schemeTree");
    ws.close();
  });

  test("非法 scope → 400 bad-request（不下发指令）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/save"), { scope: "invalid" });
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("缺 scope → 400 bad-request", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/save"), {});
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("无在线客户端 → 503 no-online-client（control.save）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/save"), { scope: "currentModel" });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });
});

describe(apiPath("/v1/control/template/saveFromSelection"), () => {
  test("成功保存 → 200 {ok:true,data:{templateKind}}", async () => {
    const ws = await connectCommandResponder("c1", (name, params) => {
      expect(name).toBe("control.template.saveFromSelection");
      expect(params).toMatchObject({ name: "测试模板", componentLibrary: "test_device" });
      return { ok: true, data: { templateKind: "custom-test_device-1" } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/template/saveFromSelection"), {
      name: "测试模板", componentLibrary: "test_device"
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.templateKind).toBe("custom-test_device-1");
    ws.close();
  });

  test("含 categoryLibraryName → 透传", async () => {
    const ws = await connectCommandResponder("c1", (_name, params) => {
      expect(params.categoryLibraryName).toBe("直流设备");
      return { ok: true, data: { templateKind: "custom-test-1" } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/template/saveFromSelection"), {
      name: "模板", componentLibrary: "test", categoryLibraryName: "直流设备"
    });
    expect(status).toBe(200);
    expect(json.data.templateKind).toBe("custom-test-1");
    ws.close();
  });

  test("缺 name → 400 bad-request", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/template/saveFromSelection"), { componentLibrary: "test" });
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("缺 componentLibrary → 400 bad-request", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/template/saveFromSelection"), { name: "模板" });
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("无在线客户端 → 503 no-online-client（control.template.saveFromSelection）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/template/saveFromSelection"), {
      name: "模板", componentLibrary: "test"
    });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });
});

// ─── 请求体上限与 clientId 归一（变异验证补）──────────────────
//
// 变异验证发现三个部分**全无覆盖**，删掉后 41 条守卫一条不红：
//   ① CONTROL_MAX_BODY_BYTES = 1MB 被放开
//   ② 超限后仍累积 chunk（上限形同虚设）
//   ③ 超限不再抛 413
// 以及 clientId 的 trim —— query 给 " c1 " 时应等价于 "c1"。
//
// 另两条变异（NoOnlineClient / CommandTimeout 的 instanceof 分支）绿是**正确**的：
// 两个错误类都自带 .code（no-online-client / ws-timeout），error?.code 兜底能产出
// 同样结果，instanceof 分支是冗余的早退写法。
describe("control 请求体上限与 clientId 归一", () => {
  test("超过 1MB 的 body → 413 payload-too-large", async () => {
    const ws = await connectCommandResponder("c1", () => ({ ok: true, data: { id: "n1" } }));
    // 造一个 >1MB 的 JSON：kind 合法，超长部分塞进一个无关字段
    const res = await fetch(`${baseUrl}${apiPath("/v1/control/device/add")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "busbar", attrs: { blob: "x".repeat(1024 * 1024 + 64) } })
    });
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("payload-too-large");
    ws.close();
  }, 20000);

  test("恰好在 1MB 以内的 body 正常处理（上限不是一刀切）", async () => {
    const ws = await connectCommandResponder("c1", () => ({ ok: true, data: { id: "n1" } }));
    const res = await fetch(`${baseUrl}${apiPath("/v1/control/device/add")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // 64KB，远低于上限
      body: JSON.stringify({ kind: "busbar", attrs: { blob: "x".repeat(64 * 1024) } })
    });
    expect(res.status).toBe(200);
    ws.close();
  }, 20000);

  test("超限时整个流仍被读完（连接不被重置，客户端拿到 413 而非 ECONNRESET）", async () => {
    // 这个用例守的是 readJsonBody 里「continue 而不是 break」的写法：
    // 提前 break 会让 Node 认为 body 未读完，连接在响应写出前被重置。
    const res = await fetch(`${baseUrl}${apiPath("/v1/control/device/add")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "busbar", attrs: { blob: "x".repeat(1024 * 1024 + 64) } })
    });
    // 能拿到状态码（而不是 fetch 自身 reject）就说明连接正常关闭
    expect(res.status).toBe(413);
  }, 20000);

  test("clientId 两侧空白被 trim（' c1 ' 与 'c1' 等价）", async () => {
    const ws = await connectCommandResponder("c1", () => ({ ok: true, data: { id: "n1" } }));
    const res = await fetch(
      `${baseUrl}${apiPath("/v1/control/device/add")}?clientId=%20c1%20`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "busbar" })
      }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    ws.close();
  });

  test("clientId 纯空白视为未指定（回落到空间内最近活跃客户端）", async () => {
    const ws = await connectCommandResponder("c1", () => ({ ok: true, data: { id: "n1" } }));
    const res = await fetch(
      `${baseUrl}${apiPath("/v1/control/device/add")}?clientId=%20%20`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "busbar" })
      }
    );
    expect(res.status).toBe(200);
    ws.close();
  });
});

// ─── payload 为 null（`payload ?? {}` 的回退侧）与非 Error 拒绝值 ────────────
//
// 下面两组守卫针对的都是 `?? {}` / `instanceof Error` 的**回退侧**，
// 既有 41 条守卫一条都走不到：
//
// ① `const { kind, x, y, attrs } = payload ?? {};` —— 既有 body 全是 `{}` 或带字段的
//    对象，`??` 的左操作数永不为 nullish，回退侧是死代码。把 body 送字面量
//    `null`（JSON.parse("null") === null）才会让 `?? {}` 真正生效；
//    删掉 `?? {}` 后解构 null 抛 TypeError → 500，状态码与错误码双双变。
//
// ② `const message = error instanceof Error ? error.message : "前端指令执行失败。";`
//    —— 既有所有拒绝值都是 Error 实例（NoOnlineClientError / CommandTimeoutError /
//    `Object.assign(new Error(...), {code})`），instanceof 恒为真。把 ctx 换成
//    直接调用导出的 handler、reject 一个裸对象，才能走到三元表达式的 false 侧。
//
// 变异验证里 GREEN 的两条都是**正确结果**，不要去补恒绿断言：
//   - 删掉 NoOnlineClientError / CommandTimeoutError 两段 instanceof 早退：
//     两个类构造时都设了 `this.code`（"no-online-client" / "ws-timeout"），
//     只留 `error?.code ?? "control-failed"` 兜底产出**完全相同**的 code 与 HTTP 状态，
//     62 条用例一条不红。instanceof 是给人看的早退写法，不承重。
//     反过来要杀掉 `error?.code` 那条兜底，得构造「既非这两个类、又没带 code」的
//     错误 —— 本文件下面的「拒绝裸对象（无 code）」正是这个输入。
describe("control body 为 JSON null（payload ?? {} 的回退侧）", () => {
  test("device/add：body 为 null → 400 kind 必填（不是 500）", async () => {
    const res = await fetch(`${baseUrl}${apiPath("/v1/control/device/add")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "null"
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
    expect(json.error.message).toBe("kind 必填。");
  });

  test("scheme/create：body 为 null → 400 name 必填（不是 500）", async () => {
    const res = await fetch(`${baseUrl}${apiPath("/v1/control/scheme/create")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "null"
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("bad-request");
    expect(json.error.message).toBe("name 必填。");
  });

  test("model/create：body 为 null → 400 name 必填（不是 500）", async () => {
    const res = await fetch(`${baseUrl}${apiPath("/v1/control/model/create")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "null"
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("bad-request");
    expect(json.error.message).toBe("name 必填。");
  });

  test("devices/select：body 为 null → 400 ids 须为字符串数组（不是 500）", async () => {
    const res = await fetch(`${baseUrl}${apiPath("/v1/control/devices/select")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "null"
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("bad-request");
    expect(json.error.message).toBe("ids 须为字符串数组。");
  });

  // 下面四个用例守的是各 handler 自己的 readJsonBody catch：
  // 既有守卫只在 device/add 上打过一次「非法 JSON → 400」，
  // 其余 handler 的 catch 从未进入过。断言同时断 code 与文案，
  // 免得「catch 里 sendV1Error 换个错误码」这种变异靠状态码蒙混过关。
  const BAD_JSON_CASES = [
    ["/v1/control/scheme/create", "name 必填。"],
    ["/v1/control/model/create", "name 必填。"],
    ["/v1/control/devices/select", "ids 须为字符串数组。"],
    ["/v1/control/device/delete", "ids 须为字符串数组。"]
  ];

  for (const [pathname, leakMessage] of BAD_JSON_CASES) {
    test(`${pathname}：非法 JSON → 400 bad-request + 请求体须为合法 JSON。`, async () => {
      const res = await fetch(`${baseUrl}${apiPath(pathname)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json"
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe("bad-request");
      expect(json.error.message).toBe("请求体须为合法 JSON。");
      // 不能漏进校验分支：文案必须是 JSON 解析失败的原文，而不是字段校验那句
      expect(json.error.message).not.toBe(leakMessage);
    });
  }

  test("device/delete：body 为 null → 200（ids 缺省，下发空 params）", async () => {
    // 这一条与上面四条相反：device/delete 对 ids 缺省不报错，
    // 所以 payload 为 null 时仍要走到 relayCommand，删掉 `?? {}` 会变成 500。
    let received = null;
    const ws = await connectCommandResponder("c1", (name, params) => {
      received = { name, params };
      return { ok: true, data: { deletedIds: [] } };
    });
    const res = await fetch(`${baseUrl}${apiPath("/v1/control/device/delete")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "null"
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(received).toEqual({ name: "control.device.delete", params: {} });
    ws.close();
  });
});

describe("control sendCommandToClient 拒绝非 Error 值", () => {
  // 直接调用导出的 handler，注入一个 reject 裸对象的 ctx：
  // 生产路径（WS 通道）永远 reject Error 实例，那条路走不到 false 侧。
  function fakeResponse() {
    return {
      headersSent: false,
      statusCode: null,
      raw: null,
      writeHead(status) {
        this.statusCode = status;
        this.headersSent = true;
      },
      end(body) {
        this.raw = body ?? null;
      }
    };
  }

  function fakeUrl() {
    return new URL("http://127.0.0.1/webgrp/v1/control/devices/group");
  }

  test("拒绝裸对象（无 code）→ 500 control-failed + 默认中文文案", async () => {
    const response = fakeResponse();
    const ctx = { sendCommandToClient: () => Promise.reject({ reason: "裸对象，没有 code" }) };
    await handleControlDevicesGroup({ url: fakeUrl(), response }, ctx);
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.raw);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("control-failed");
    expect(body.error.message).toBe("前端指令执行失败。");
  });

  test("拒绝裸对象但带 code → 按 v1Response 映射该 code（不是 control-failed）", async () => {
    const response = fakeResponse();
    const ctx = { sendCommandToClient: () => Promise.reject({ code: "not-found", message: "找不到设备" }) };
    await handleControlDevicesGroup({ url: fakeUrl(), response }, ctx);
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.raw);
    expect(body.error.code).toBe("not-found");
    // 非 Error 但带 message：文案仍走 instanceof 的 false 侧（默认文案）
    expect(body.error.message).toBe("前端指令执行失败。");
  });

  test("拒绝字符串 → 500 control-failed（error?.code 的 nullish 侧）", async () => {
    const response = fakeResponse();
    const ctx = { sendCommandToClient: () => Promise.reject("boom") };
    await handleControlDevicesGroup({ url: fakeUrl(), response }, ctx);
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.raw);
    expect(body.error.code).toBe("control-failed");
    expect(body.error.message).toBe("前端指令执行失败。");
  });

  test("拒绝 Error 实例 → 取它的 message（instanceof 的 true 侧）", async () => {
    const response = fakeResponse();
    const ctx = { sendCommandToClient: () => Promise.reject(Object.assign(new Error("真实原因"), { code: "internal" })) };
    await handleControlSave(
      { request: jsonBodyStream('{"scope":"currentModel"}'), url: fakeUrl(), response },
      ctx
    );
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.raw);
    expect(body.error.code).toBe("internal");
    expect(body.error.message).toBe("真实原因");
  });
});

// readJsonBody 只需要一个 async iterable，给 handleControlSave 造一个。
async function* jsonBodyStream(text) {
  yield Buffer.from(text, "utf-8");
}
