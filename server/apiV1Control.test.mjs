import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws";
import { createImageServer } from "./server.mjs";
import { apiPath } from "./config.mjs";

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

  test("无在线客户端 → 503 no-online-client", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/device/add"), { kind: "busbar" });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });

  test("前端返失败 → 透传 error code", async () => {
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

  test("缺 name → 400 bad-request（不下发指令）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/scheme/create"), { parentSchemeId: "p1" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  });

  test("无在线客户端 → 503 no-online-client", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/scheme/create"), { name: "方案1" });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });

  test("前端返失败 → 透传 error code", async () => {
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
      expect(params).toMatchObject({ name: "模型1", schemeId: "s1" });
      return { ok: true, data: { id: "m1", name: "模型1", schemeId: "s1" } };
    });
    const { status, json } = await postV1(apiPath("/v1/control/model/create"), { name: "模型1", schemeId: "s1" });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ id: "m1", name: "模型1", schemeId: "s1" });
    ws.close();
  });

  test("缺 name → 400 bad-request（不下发指令）", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/model/create"), { schemeId: "s1" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  });

  test("无在线客户端 → 503 no-online-client", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/model/create"), { name: "模型1" });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });

  test("前端返失败 → 透传 error code", async () => {
    const ws = await connectCommandResponder("c1", () => ({
      ok: false,
      error: { code: "bad-request", message: "无可用方案，请先创建方案" }
    }));
    const { status, json } = await postV1(apiPath("/v1/control/model/create"), { name: "模型1" });
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

  test("无在线客户端 → 503 no-online-client", async () => {
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

  test("无在线客户端 → 503 no-online-client", async () => {
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

  test("无在线客户端 → 503 no-online-client", async () => {
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

  test("无在线客户端 → 503 no-online-client", async () => {
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

  test("无在线客户端 → 503 no-online-client", async () => {
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

  test("无在线客户端 → 503 no-online-client", async () => {
    const { status, json } = await postV1(apiPath("/v1/control/template/saveFromSelection"), {
      name: "模板", componentLibrary: "test"
    });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });
});
