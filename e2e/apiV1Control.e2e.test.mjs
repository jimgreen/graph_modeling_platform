import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { connect } from "node:net";
import { startE2EEnvironment, loadFrontendAndWaitOnline } from "./controlHarness.mjs";
import { apiPath } from "../server/config.mjs";

// e2e 端到端：真实浏览器 + 真实前端 + 真实 WS 指令通道。
// 验证 control.device/add 经 WS 下发到真实 __appScope，画布出现新图元，只读 API 可见。

let env;
let dataDir;

// 240s：harness 要起 image-server + Vite + Chromium，且本仓库是多 agent 并行改动的
// 工作区，Vite 冷启动首次编译整包 React 应用在 CPU 争用下会明显变慢。
// 原 120s 在并行跑 e2e 时会偶发把「机器忙」误报成「前端没上线」。
beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "gmp-control-e2e-"));
  env = await startE2EEnvironment({ dataDir });
}, 240000);

afterEach(async () => {
  if (env) {
    await env.teardown();
  }
  if (dataDir) {
    rmSync(dataDir, { recursive: true, force: true });
  }
  await waitForPortsFree();
}, 240000);

// harness 的端口（见 controlHarness.mjs 的 E2E_VITE_PORT / E2E_IMAGE_PORT）。
// 本文件不新增端口，只在收尾时确认它们已归还。
const HARNESS_PORTS = [5183, 5184];

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(1000, () => done(false));
  });
}

// 等 harness 的固定端口真正被释放。
//
// 为什么必须等：controlHarness 的 kill() 只等子进程 **exit**，不等端口 **释放**。
// Windows 上 taskkill /T 是异步的，端口通常滞后数百毫秒才关。下一条 beforeEach 里
// `vite --port 5183 --strictPort` 因此会因端口仍被占用而**启动失败**，而 harness 的
// waitForPort 又会连上**正在死掉的**那个 server —— 对外表现是
// `page.goto: net::ERR_CONNECTION_RESET at http://127.0.0.1:5183/`，看着像产品挂了，
// 实际是 harness 的收尾竞态。本工作区多 agent 并行跑 e2e、CPU 争用使 taskkill 更慢，
// 必现。这不是放宽断言，是把「上一条用例的残留进程」和「本条用例的失败」分开。
async function waitForPortsFree(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const busy = [];
    for (const port of HARNESS_PORTS) {
      if (await canConnect(port)) {
        busy.push(port);
      }
    }
    if (busy.length === 0) {
      return;
    }
    if (Date.now() > deadline) {
      // 端口被别人（并行 lane 的 e2e）占着是可能的：不能无限等，也绝不去 kill 别人的进程。
      console.log(`  [e2e] 端口 ${busy.join(",")} 在 ${timeoutMs}ms 内未释放（可能是并行 lane 占用），继续。`);
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

// 打开前端并等 WS 上线。
//
// page.setDefaultNavigationTimeout 必须显式抬高：Playwright 默认 30s，而 harness 的
// page.goto 只等 domcontentloaded；Vite 首次请求要现编译整包源码，CPU 争用下 30s
// 不足以完成。这只放宽「等多久」，不放宽「等什么」——页面该起不来照样红。
async function bootFrontend(page, baseUrl, imageBaseUrl) {
  page.setDefaultNavigationTimeout(120000);
  return loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);
}

// 取当前模型设备清单。无活动模型时返回 null（不抛错）。
async function fetchDevices(imageBaseUrl, clientId) {
  const url = new URL(`${imageBaseUrl}${apiPath("/v1/runtime/devices")}`);
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

// POST 一个 v1 端点，返回 { status, json }。不隐去状态码/信封：
// 「哪一层拦下的」正是本文件多条断言要区分的东西。
async function postV1(imageBaseUrl, path, body, clientId) {
  const url = new URL(`${imageBaseUrl}${apiPath(path)}`);
  if (clientId) {
    url.searchParams.set("clientId", clientId);
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return { status: res.status, json: await res.json() };
}

// 同上，但期望成功；失败时抛出可读的诊断信息（不吞错）。
async function postV1Ok(imageBaseUrl, path, body, clientId) {
  const { status, json } = await postV1(imageBaseUrl, path, body, clientId);
  if (status !== 200 || json.ok !== true) {
    throw new Error(`${path} 期望 200/ok=true，实际 status=${status} body=${JSON.stringify(json)}`);
  }
  return json.data;
}

// 建方案 + 建模型，把「无活动模型」这个前置消掉，然后等模型真正成为活动模型。
//
// 为什么必须有这一步：serializeDevices 以 activeProjectKey 判定活动模型
// （runtimeSnapshot.ts 的 noActiveModel）。空白前端 activeProjectKey 为空串 →
// runtime/devices 恒返 no-active-model → 本文件原先
// `const beforeNodes = Array.isArray(before?.nodes) ? before.nodes : null;`
// 恒为 null → `if (beforeNodes !== null) {…} else { console.log("跳过") }`
// 的**两条设备数断言在 e2e 环境里一次都没执行过**（基线输出恒为
// 「[e2e] 无活动模型，跳过设备数断言」）。文件头宣称的核心契约「画布出现新图元、
// 只读 API 可见」因此从未被验证过。
//
// control.scheme/create + control.model/create 上线后，这个前置可以由被测 API 自己满足，
// 故设备数契约改回无条件断言。
async function createActiveModel(imageBaseUrl, clientId) {
  const scheme = await postV1Ok(imageBaseUrl, "/v1/control/scheme/create", { name: "e2e 方案" }, clientId);

  // scheme/create 与 model/create 之间有和「读节点数」同源的竞态：前一条指令的
  // React setSchemes 尚未提交，下一条指令经 __appScopeRef.current 读到的仍是旧帧，
  // 于是 findSavedSchemeById 找不到刚建的方案 → 「无可用方案」。
  //
  // 只对这一条**已识别的**瞬时错误重试：那一次调用在参数校验阶段就 return 了，
  // 什么都没建，故重试不会产生重名/重复模型。其余任何错误立刻抛出，不重试。
  const deadline = Date.now() + 20000;
  let model = null;
  for (;;) {
    const { status, json } = await postV1(
      imageBaseUrl,
      "/v1/control/model/create",
      { name: "e2e 模型", schemeId: scheme.id, modelType: "微网" },
      clientId
    );
    if (status === 200 && json.ok === true) {
      model = json.data;
      break;
    }
    const retryable = status === 400 && String(json?.error?.message ?? "").includes("无可用方案");
    if (!retryable || Date.now() > deadline) {
      throw new Error(
        `/v1/control/model/create 期望 200/ok=true，实际 status=${status} body=${JSON.stringify(json)}`
      );
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  // requestLoadSavedProject 走的是「未保存改动」动作队列（前端异步载入），
  // control.model/create 返回时 activeProjectKey 未必已置位，故轮询 runtime/devices：
  // 只有它返 ok 才代表已有活动模型。
  const loadDeadline = Date.now() + 30000;
  for (;;) {
    const devices = await fetchDevices(imageBaseUrl, clientId);
    if (devices && Array.isArray(devices.nodes)) {
      return devices;
    }
    if (Date.now() > loadDeadline) {
      throw new Error(`模型「${model.name}」创建后 30s 内 runtime/devices 仍未转 ok（无活动模型）。`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

// 轮询 runtime/devices 直到节点数收敛到 expected。
//
// 为什么必须轮询而不是紧接着发一次 GET：runtime/devices 读的是前端 __appScope 的
// **当前帧**（serializeDevices → appScope.nodes），而 control.* 指令执行完毕到 React
// 重渲染之间没有任何契约序。指令的 HTTP 回包只保证「命令跑完了」，不保证「下一帧已经
// 提交」，故紧随其后的 GET 有可能读到上一帧的快照。
async function waitForNodeCount(imageBaseUrl, clientId, expected, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  const seen = [];
  for (;;) {
    const devices = await fetchDevices(imageBaseUrl, clientId);
    const len = Array.isArray(devices?.nodes) ? devices.nodes.length : -1;
    seen.push(len);
    if (len === expected) {
      return devices;
    }
    if (Date.now() > deadline) {
      throw new Error(`runtime/devices 节点数 ${timeoutMs}ms 内未收敛到 ${expected}，实测序列 ${JSON.stringify(seen)}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
}

describe("control.device/add e2e", () => {
  test("建方案+建模型 → 新增图元真实落图 → 只读 API 设备数逐个 +1 且回执 id 命中图元", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await bootFrontend(page, baseUrl, imageBaseUrl);

    // 前置：建方案 + 建模型。没有活动模型就没有「设备数」可言（见 createActiveModel 注释）。
    const before = await createActiveModel(imageBaseUrl, clientId);
    expect(Array.isArray(before.nodes)).toBe(true);
    // 空白模型的合法下界：0 图元 0 边。这是整条计数断言的量纲锚点 ——
    // 有了它，后面的 1 / 2 就是**绝对值**而不是相对增量。
    expect(before.nodes.length).toBe(0);
    expect(before.edges.length).toBe(0);

    const add1 = await postV1Ok(imageBaseUrl, "/v1/control/device/add", { kind: "static-text", x: 100, y: 100 }, clientId);
    // 回执 id 必须是可用的节点 id 字符串。原断言是 toBeTruthy()：{} / 1 / [] / "x" 都算真，
    // 前端把回执改成对象或数字照样绿。这里钉死类型与非空。
    expect(typeof add1.id).toBe("string");
    expect(add1.id.length).toBeGreaterThan(0);

    // ---- 以下原被 `if (beforeNodes !== null)` 包住，该条件在 e2e 恒假（见上） ----
    const after1 = await waitForNodeCount(imageBaseUrl, clientId, 1);
    expect(after1.nodes.length).toBe(1);
    const node1 = after1.nodes.find((n) => n.id === add1.id);
    expect(node1).toBeDefined();
    expect(node1.kind).toBe("static-text");
    // 坐标必须原样落到节点上：server 端把 x/y 收敛成有限数后经 WS 下发，
    // 丢掉转发（Number(undefined)||0）会让 y 静默变 0。
    expect(node1.position).toEqual({ x: 100, y: 100 });

    // 双向性：再种一个**坐标不同**的图元，读数必须跟着走到 2。
    // 只断言一次 +1 的话，「恒定返回某个快照」的实现也能满足；两端都是绝对值
    // （0 → 1 → 2）且两个节点的 kind/position 各不相同，恒定快照满足不了。
    const add2 = await postV1Ok(imageBaseUrl, "/v1/control/device/add", { kind: "static-text", x: 300, y: 240 }, clientId);
    expect(typeof add2.id).toBe("string");
    expect(add2.id).not.toBe(add1.id);
    const after2 = await waitForNodeCount(imageBaseUrl, clientId, 2);
    expect(after2.nodes.length).toBe(2);
    const node2 = after2.nodes.find((n) => n.id === add2.id);
    expect(node2).toBeDefined();
    expect(node2.kind).toBe("static-text");
    expect(node2.position).toEqual({ x: 300, y: 240 });
  }, 240000);

  test("无在线客户端 → 503（断开前端后验证）", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    await bootFrontend(page, baseUrl, imageBaseUrl);

    // 关闭前端页面，触发 WS 断开
    await page.close();
    // 等待 server 端清理客户端（心跳超时 60s 太久，直接断连应即时 unregister）
    await new Promise((r) => setTimeout(r, 1000));

    const res = await fetch(`${imageBaseUrl}${apiPath("/v1/control/device/add")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "static-text" })
    });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("no-online-client");
  }, 240000);
});

describe("control.devices/select e2e", () => {
  test("存在 id 进 validIds/selectedIds，不存在 id 进 invalidIds", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await bootFrontend(page, baseUrl, imageBaseUrl);
    await createActiveModel(imageBaseUrl, clientId);

    // 造一个真实存在的图元，供 validIds 一侧使用
    const add = await postV1Ok(imageBaseUrl, "/v1/control/device/add", { kind: "static-text", x: 100, y: 100 }, clientId);
    expect(typeof add.id).toBe("string");

    // 混合：一个真实 + 一个不存在。原用例只传 fake id，validIds/selectedIds 恒为 []，
    // 等于只验了「全无效」这一半——对「validIds 永远返回空数组」这类缺陷毫无鉴别力。
    const res = await postV1(
      imageBaseUrl,
      "/v1/control/devices/select",
      { ids: [add.id, "fake-id-1"], mode: "set" },
      clientId
    );
    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(res.json.data.validIds).toEqual([add.id]);
    expect(res.json.data.invalidIds).toEqual(["fake-id-1"]);
    expect(res.json.data.selectedIds).toEqual([add.id]);

    // 纯无效：mode=set 的语义要求把上一次选中的真实图元**清掉**，而不是残留。
    const allFake = await postV1(
      imageBaseUrl,
      "/v1/control/devices/select",
      { ids: ["fake-a", "fake-b"], mode: "set" },
      clientId
    );
    expect(allFake.status).toBe(200);
    expect(allFake.json.data.invalidIds).toEqual(["fake-a", "fake-b"]);
    expect(allFake.json.data.validIds).toEqual([]);
    expect(allFake.json.data.selectedIds).toEqual([]);
  }, 240000);

  test("非数组 ids → 400 bad-request", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await bootFrontend(page, baseUrl, imageBaseUrl);

    const res = await postV1(imageBaseUrl, "/v1/control/devices/select", { ids: "not-array" }, clientId);
    expect(res.status).toBe(400);
    expect(res.json.error.code).toBe("bad-request");
  }, 240000);
});

describe("control.devices/group e2e", () => {
  test("无选中 → 前端返 control-failed（透传 error code）", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await bootFrontend(page, baseUrl, imageBaseUrl);

    const res = await postV1(imageBaseUrl, "/v1/control/devices/group", {}, clientId);
    expect(res.status).toBe(500);
    expect(res.json.ok).toBe(false);
    expect(res.json.error.code).toBe("control-failed");
    expect(res.json.error.message).toMatch(/至少选中 2 个图元/);
  }, 240000);
});

describe("control.device/delete e2e", () => {
  test("无选中 → 前端返 control-failed（透传 error code）", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await bootFrontend(page, baseUrl, imageBaseUrl);

    const res = await postV1(imageBaseUrl, "/v1/control/device/delete", {}, clientId);
    expect(res.status).toBe(500);
    expect(res.json.ok).toBe(false);
    expect(res.json.error.code).toBe("control-failed");
    expect(res.json.error.message).toMatch(/无可删除图元/);
  }, 240000);
});

describe("control.device/property/update e2e", () => {
  test("不存在图元 → 前端返 not-found（透传 error code）", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await bootFrontend(page, baseUrl, imageBaseUrl);

    const res = await postV1(
      imageBaseUrl,
      "/v1/control/device/property/update",
      { id: "nonexistent", category: "graphic", patch: { rotation: 90 } },
      clientId
    );
    expect(res.status).toBe(404);
    expect(res.json.ok).toBe(false);
    expect(res.json.error.code).toBe("not-found");
    // 钉住是「图元不存在」这条分支，而不是别的 not-found（如量测未实现那类）
    expect(res.json.error.message).toMatch(/不存在/);
  }, 240000);
});

describe("control/save e2e", () => {
  test("scope=currentModel → 通道打通返回 {saved:true}", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await bootFrontend(page, baseUrl, imageBaseUrl);

    const res = await postV1(imageBaseUrl, "/v1/control/save", { scope: "currentModel" }, clientId);
    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(res.json.data.saved).toBe(true);
    expect(res.json.data.scope).toBe("currentModel");
  }, 240000);

  test("非法 scope → 400 bad-request", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await bootFrontend(page, baseUrl, imageBaseUrl);

    const res = await postV1(imageBaseUrl, "/v1/control/save", { scope: "invalid" }, clientId);
    expect(res.status).toBe(400);
    expect(res.json.error.code).toBe("bad-request");
  }, 240000);
});

describe("control/template/saveFromSelection e2e", () => {
  test("未选中组合 → 前端返 control-failed", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await bootFrontend(page, baseUrl, imageBaseUrl);

    const res = await postV1(
      imageBaseUrl,
      "/v1/control/template/saveFromSelection",
      { name: "测试模板", componentType: "test_device" },
      clientId
    );
    expect(res.status).toBe(500);
    expect(res.json.ok).toBe(false);
    expect(res.json.error.code).toBe("control-failed");
    // 钉住「选中态」这一条分支：name / componentLibrary 的 400 若被误当成
    // control-failed，这里会红；反之原先只看 code 分不出是哪条分支抛的。
    expect(res.json.error.message).toMatch(/请先选中一个图元组合/);
  }, 240000);

  test("缺 name → 400 bad-request（server 端校验）", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    const clientId = await bootFrontend(page, baseUrl, imageBaseUrl);

    const res = await postV1(imageBaseUrl, "/v1/control/template/saveFromSelection", { componentType: "test_device" }, clientId);
    expect(res.status).toBe(400);
    expect(res.json.error.code).toBe("bad-request");
  }, 240000);
});

describe("server 端本地入参校验（不经 WS 转发）", () => {
  // 为什么要这一组：devices/select、save、template 三条 400 用例在**前端**
  // createProgrammatic* 里各有一份同规则校验（select: !Array.isArray(ids)、
  // save: scope 白名单、template: !name.trim()）。也就是说——把 server 侧那份
  // 守卫整段删掉，这三条用例照样全绿，而其中一条的标题偏偏写着「server 端校验」。
  // 原断言不是恒真（能因 500/internal 转红），但它证明不了自己声称的那件事：
  // 「400 是 server 拦的，不是前端兜的」。
  //
  // 判别手法：关掉前端让 WS 无在线客户端。server 本地拦的仍是 400；
  // 能走到转发的一律 503 no-online-client。
  test("关闭前端 → 非法入参仍 400（而非 503），合法入参才 503", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    await bootFrontend(page, baseUrl, imageBaseUrl);
    await page.close();

    // 先把「确实没有在线客户端」这个**前置**坐实：探针用合法入参
    // （save/currentModel），server 本地校验放行 → 进 WS → 无客户端即 503。
    //
    // 必须轮询而不是固定 sleep：page.close() 到 server 端 unregister 之间没有契约序
    // （harness 的 waitForOnlineClient 也是靠轮询）。固定等 1s 会在 CPU 争用下偶发读到
    // 「客户端还在」，于是本该由「守卫被删」触发的红，变成「前置没坐实」的红 ——
    // 那是**理由错误的红**，比没有红更糟。
    //
    // 注意这里轮询的是**前置**、且用的是与下面 400 用例不同的入参；
    // 下面的守卫循环是每条一次请求直接断言，不轮询 —— 轮询到期望值等于把断言洗白。
    const probeDeadline = Date.now() + 20000;
    let probe = await postV1(imageBaseUrl, "/v1/control/save", { scope: "currentModel" });
    while (probe.status !== 503 && Date.now() < probeDeadline) {
      await new Promise((r) => setTimeout(r, 250));
      probe = await postV1(imageBaseUrl, "/v1/control/save", { scope: "currentModel" });
    }
    expect({ path: "probe save/currentModel", status: probe.status, code: probe.json.error?.code }).toEqual({
      path: "probe save/currentModel",
      status: 503,
      code: "no-online-client"
    });

    const guarded = [
      ["/v1/control/device/add", { kind: 123 }],
      ["/v1/control/device/add", { kind: "static-text", x: "abc" }],
      ["/v1/control/device/add", {}],
      ["/v1/control/scheme/create", { name: "   " }],
      ["/v1/control/model/create", { name: "e2e 模型", modelType: "不存在的类型" }],
      ["/v1/control/devices/select", { ids: "not-array" }],
      ["/v1/control/devices/select", {}],
      ["/v1/control/device/delete", { ids: "not-array" }],
      ["/v1/control/device/property/update", { id: "x", category: "graphic" }],
      ["/v1/control/save", { scope: "invalid" }],
      ["/v1/control/save", {}],
      ["/v1/control/template/saveFromSelection", { componentLibrary: "test_device" }],
      ["/v1/control/e-device-definition/import", { text: "   " }]
    ];
    for (const [path, body] of guarded) {
      const res = await postV1(imageBaseUrl, path, body);
      // 把 path/body 一起放进断言值：失败时直接报出是哪一条守卫失效
      expect({ path, body, status: res.status, code: res.json.error?.code }).toEqual({
        path,
        body,
        status: 400,
        code: "bad-request"
      });
    }
  }, 240000);
});
