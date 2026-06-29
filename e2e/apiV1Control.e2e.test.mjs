import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { startE2EEnvironment, loadFrontendAndWaitOnline } from "./controlHarness.mjs";

// e2e 端到端：真实浏览器 + 真实前端 + 真实 WS 指令通道。
// 验证 control.device/add 经 WS 下发到真实 __appScope，画布出现新图元，只读 API 可见。

let env;
let dataDir;

beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "gmp-control-e2e-"));
  env = await startE2EEnvironment({ dataDir });
}, 120000);

afterEach(async () => {
  if (env) {
    await env.teardown();
  }
  if (dataDir) {
    rmSync(dataDir, { recursive: true, force: true });
  }
}, 60000);

// 取当前模型设备清单。无活动模型时返回 null（不抛错）。
async function fetchDevices(imageBaseUrl, clientId) {
  const url = new URL(`${imageBaseUrl}/api/v1/runtime/devices`);
  if (clientId) {
    url.searchParams.set("clientId", clientId);
  }
  const res = await fetch(url);
  const json = await res.json();
  if (!json.ok) {
    // no-active-model 等情况：无活动模型，返回 null
    return null;
  }
  return json.data;
}

describe("control.device/add e2e", () => {
  test("新增图元 → 通道打通返回 id（有活动模型时设备数 +1）", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    // 新增前设备清单（无活动模型时为 null）
    const before = await fetchDevices(imageBaseUrl, clientId);
    const beforeNodes = Array.isArray(before?.nodes) ? before.nodes : null;

    // 调 control.device/add（用一个真实存在的 DeviceKind）
    const addRes = await fetch(`${imageBaseUrl}/api/v1/control/device/add?clientId=${clientId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "static-text", x: 100, y: 100 })
    });
    const addJson = await addRes.json();
    expect(addRes.status).toBe(200);
    expect(addJson.ok).toBe(true);
    expect(addJson.data.id).toBeTruthy();

    // 有活动模型时断言设备数 +1；无活动模型时仅验证通道打通（add 返回 id）
    if (beforeNodes !== null) {
      const after = await fetchDevices(imageBaseUrl, clientId);
      const afterNodes = Array.isArray(after?.nodes) ? after.nodes : [];
      expect(afterNodes.length).toBe(beforeNodes.length + 1);
      expect(afterNodes.some((n) => n.id === addJson.data.id)).toBe(true);
    } else {
      // 无活动模型：标注跳过设备数断言（待 T7 新增模型后补全）
      console.log("  [e2e] 无活动模型，跳过设备数断言（T7 新增模型后补全）。");
    }
  }, 120000);

  test("无在线客户端 → 503（断开前端后验证）", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    // 关闭前端页面，触发 WS 断开
    await page.close();
    // 等待 server 端清理客户端（心跳超时 60s 太久，直接断连应即时 unregister）
    await new Promise((r) => setTimeout(r, 1000));

    const res = await fetch(`${imageBaseUrl}/api/v1/control/device/add`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "static-text" })
    });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("no-online-client");
  }, 120000);
});

describe("control.devices/select e2e", () => {
  test("选中图元 → 通道打通返回 selectedIds", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    const res = await fetch(`${imageBaseUrl}/api/v1/control/devices/select?clientId=${clientId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: ["fake-id-1", "fake-id-2"], mode: "set" })
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.selectedIds).toEqual(["fake-id-1", "fake-id-2"]);
  }, 120000);

  test("非数组 ids → 400 bad-request", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    const res = await fetch(`${imageBaseUrl}/api/v1/control/devices/select?clientId=${clientId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: "not-array" })
    });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  }, 120000);
});

describe("control.devices/group e2e", () => {
  test("无选中 → 前端返 control-failed（透传 error code）", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    const res = await fetch(`${imageBaseUrl}/api/v1/control/devices/group?clientId=${clientId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("control-failed");
    expect(json.error.message).toMatch(/至少选中 2 个图元/);
  }, 120000);
});

describe("control.device/delete e2e", () => {
  test("无选中 → 前端返 control-failed（透传 error code）", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    const res = await fetch(`${imageBaseUrl}/api/v1/control/device/delete?clientId=${clientId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("control-failed");
    expect(json.error.message).toMatch(/无可删除图元/);
  }, 120000);
});

describe("control.device/property/update e2e", () => {
  test("不存在图元 → 前端返 not-found（透传 error code）", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    const res = await fetch(`${imageBaseUrl}/api/v1/control/device/property/update?clientId=${clientId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "nonexistent", category: "graphic", patch: { rotation: 90 } })
    });
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("not-found");
  }, 120000);
});

describe("control/save e2e", () => {
  test("scope=currentModel → 通道打通返回 {saved:true}", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    const res = await fetch(`${imageBaseUrl}/api/v1/control/save?clientId=${clientId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "currentModel" })
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.saved).toBe(true);
    expect(json.data.scope).toBe("currentModel");
  }, 120000);

  test("非法 scope → 400 bad-request", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    const res = await fetch(`${imageBaseUrl}/api/v1/control/save?clientId=${clientId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "invalid" })
    });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  }, 120000);
});
