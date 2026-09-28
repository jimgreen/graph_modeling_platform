// 容器成员关系 5 个零直呼函数的直接单测。
//
// 这几个函数是**判据的唯一出处**（见 model.ts 里各自的注释）：画布挤出/拖动排斥、
// 线路避让豁免、容器量测组同步、E 导出口岸拓扑变换都经它们。用错的后果是**静默**的 ——
// 连线、量测绑定、导出结果全错，但流程不报错。
//
// 本文件钉住三条**刻意的不对称**（探针实测，均非缺陷，误以为是 bug 反而危险）：
//   ① isContainerParams：`is_container` 认 "1"|"true"，但 `isContainer` **只认 "true"**；
//      大小写敏感、不 trim。
//   ② containerMemberNodes **不检查容器是否存活** —— 悬空 containerId 仍算成员。
//      它与 liveContainerIds（有效性判据）是**互补**而非重复：后者判容器活不存活，
//      前者只判归属字段。两个消费点必须先经 liveContainerIds，这是注释里的硬约定。
//   ③ gatewayBoundMemberId 的 is_gateway 严格 === "1"，**不认 "true"**。
import { describe, expect, test } from "vitest";
import {
  isContainerKind,
  liveContainerIds,
  containerMemberNodes,
  gatewayBoundMemberId,
  nodesExcludingEndpointContainers,
  isContainerParams,
  CONTAINER_KINDS
} from "./model";
import type { ModelNode } from "./model";

const node = (id: string, kind: string, containerId?: string): ModelNode =>
  ({ id, kind, ...(containerId === undefined ? {} : { containerId }) }) as ModelNode;

describe("isContainerKind（按 CONTAINER_KINDS 清单判定）", () => {
  test("清单里的 6 个 kind 全部命中，且与清单严格一致", () => {
    for (const kind of CONTAINER_KINDS) {
      expect(isContainerKind(kind), kind).toBe(true);
    }
    expect(CONTAINER_KINDS).toHaveLength(6);
  });

  test("非容器 kind 不命中", () => {
    for (const kind of ["ac-load", "ac-vpp-box-extra", "", "ac-vpp-box "]) {
      expect(isContainerKind(kind), kind).toBe(false);
    }
  });
});

describe("isContainerParams（键名/值刻意不对称，见文件头注释①）", () => {
  test("is_container 接受 \"1\" 与 \"true\"", () => {
    expect(isContainerParams({ is_container: "1" })).toBe(true);
    expect(isContainerParams({ is_container: "true" })).toBe(true);
  });

  test("isContainer（驼峰）**只认 \"true\"**，不认 \"1\" —— 与 is_container 不对称", () => {
    expect(isContainerParams({ isContainer: "true" })).toBe(true);
    expect(isContainerParams({ isContainer: "1" })).toBe(false);
  });

  test("假值一律 false", () => {
    expect(isContainerParams({ is_container: "false" })).toBe(false);
    expect(isContainerParams({ is_container: "0" })).toBe(false);
    expect(isContainerParams({ isContainer: "false" })).toBe(false);
  });

  test("大小写敏感、不 trim（探针实测：不走 normalizeRouteAvoidanceFlag 那套宽松归一）", () => {
    expect(isContainerParams({ is_container: "TRUE" })).toBe(false);
    expect(isContainerParams({ is_container: " true " })).toBe(false);
    expect(isContainerParams({ IS_CONTAINER: "1" })).toBe(false);
  });

  test("无参 / 空对象为 false", () => {
    expect(isContainerParams()).toBe(false);
    expect(isContainerParams({})).toBe(false);
  });
});

describe("liveContainerIds（只收**存活**容器 id，是归属有效性的唯一判据）", () => {
  test("只收容器 kind 的 id，普通设备与悬空值都不进集合", () => {
    const nodes = [
      node("c1", "ac-vpp-box"),
      node("n1", "ac-load", "c1"),
      node("n2", "ac-load", "已删除的容器"),
      node("n3", "ac-load")
    ];
    expect([...liveContainerIds(nodes)]).toEqual(["c1"]);
  });

  test("空数组得空集合", () => {
    expect(liveContainerIds([]).size).toBe(0);
  });
});

describe("containerMemberNodes（成员判定单源，见文件头注释②）", () => {
  const nodes = [
    node("c1", "ac-vpp-box"),
    node("n1", "ac-load", "c1"),
    node("n2", "ac-load", "已删除的容器"),
    node("n3", "ac-load")
  ];

  test("只取 containerId 命中者，且不含容器自身", () => {
    expect(containerMemberNodes(nodes, "c1").map((n) => n.id)).toEqual(["n1"]);
  });

  test("自指脏数据（containerId === 自身 id）被挡掉", () => {
    const withSelf = [...nodes, node("c1", "ac-vpp-box", "c1")];
    expect(containerMemberNodes(withSelf, "c1").map((n) => n.id)).toEqual(["n1"]);
  });

  test("**不检查容器是否存活**：悬空 containerId 仍会被算成成员（需先经 liveContainerIds）", () => {
    // 探针实测：n2 的 containerId 指向已删除的容器，仍被算作该容器的成员。
    // 这是刻意与 liveContainerIds 互补 —— 注释明确要求两个消费点都经 liveContainerIds，
    // 只判真值会让悬空节点被当成员豁免（挤出失效、入组被短路）。
    expect(containerMemberNodes(nodes, "已删除的容器").map((n) => n.id)).toEqual(["n2"]);
  });

  test("容器不存在时返回空数组", () => {
    expect(containerMemberNodes(nodes, "zz")).toEqual([]);
  });
});

describe("nodesExcludingEndpointContainers（线路避让豁免：容器是障碍物）", () => {
  const nodes = [
    node("c1", "ac-vpp-box"),
    node("c2", "ac-switch-box"),
    node("n1", "ac-load"),
    node("line1", "ac-line")
  ];
  const ids = (result: ModelNode[]) => result.map((n) => n.id);

  test("无端点时原样返回全部节点（不拷贝出差异）", () => {
    expect(ids(nodesExcludingEndpointContainers(nodes, []))).toEqual(["c1", "c2", "n1", "line1"]);
  });

  test("端点所在容器被豁免，允许线路穿过其矩形", () => {
    expect(ids(nodesExcludingEndpointContainers(nodes, [{ containerId: "c1" }]))).toEqual(["c2", "n1", "line1"]);
  });

  test("多个端点容器全部豁免", () => {
    expect(ids(nodesExcludingEndpointContainers(nodes, [{ containerId: "c1" }, { containerId: "c2" }])))
      .toEqual(["n1", "line1"]);
  });

  test("双重校验：id 在端点集合里**且** kind 确为容器才豁免", () => {
    // containerId 指向普通设备 n1 —— n1 不是容器，不该被豁免
    expect(ids(nodesExcludingEndpointContainers(nodes, [{ containerId: "n1" }])))
      .toEqual(["c1", "c2", "n1", "line1"]);
  });

  test("空串 / undefined / 悬空 containerId 一律不豁免（探针实测）", () => {
    expect(ids(nodesExcludingEndpointContainers(nodes, [{ containerId: "" }])))
      .toEqual(["c1", "c2", "n1", "line1"]);
    expect(ids(nodesExcludingEndpointContainers(nodes, [undefined])))
      .toEqual(["c1", "c2", "n1", "line1"]);
    expect(ids(nodesExcludingEndpointContainers(nodes, [{ containerId: "不存在" }])))
      .toEqual(["c1", "c2", "n1", "line1"]);
  });
});

describe("gatewayBoundMemberId（关口判据唯一出处，见文件头注释③）", () => {
  const c1 = node("c1", "ac-vpp-box");
  const n1 = node("n1", "ac-load", "c1");
  const memberMap = new Map<string, ModelNode>([["c1", c1], ["n1", n1]]);
  const gateway = (id: string, params: Record<string, string>): ModelNode =>
    ({ id, kind: "ac-vpp-box", params }) as ModelNode;

  test("is_gateway=1 且绑定设备仍是本容器成员 → 返回绑定设备 id", () => {
    expect(gatewayBoundMemberId(gateway("c1", { is_gateway: "1", bound_device_id: "n1" }), memberMap)).toBe("n1");
  });

  test("is_gateway 非 1 → undefined（开不了口，就不是关口）", () => {
    expect(gatewayBoundMemberId(gateway("c1", { is_gateway: "0", bound_device_id: "n1" }), memberMap)).toBeUndefined();
  });

  test("is_gateway 严格 === \"1\"，**不认 \"true\"**（与 isContainerParams 不同）", () => {
    expect(gatewayBoundMemberId(gateway("c1", { is_gateway: "true", bound_device_id: "n1" }), memberMap)).toBeUndefined();
  });

  test("缺 bound_device_id / 绑定设备不存在 → undefined", () => {
    expect(gatewayBoundMemberId(gateway("c1", { is_gateway: "1" }), memberMap)).toBeUndefined();
    expect(gatewayBoundMemberId(gateway("c1", { is_gateway: "1", bound_device_id: "幽灵" }), memberMap)).toBeUndefined();
  });

  test("绑定设备已移出本容器 → undefined（关口失效，探针实测）", () => {
    const moved = new Map(memberMap);
    moved.set("n1", node("n1", "ac-load", "c9"));
    expect(gatewayBoundMemberId(gateway("c1", { is_gateway: "1", bound_device_id: "n1" }), moved)).toBeUndefined();
  });

  test("绑定设备 id 就是容器自身 → undefined（挡掉自指脏数据）", () => {
    const selfMap = new Map(memberMap);
    selfMap.set("c6", node("c6", "ac-vpp-box", "c1"));
    expect(gatewayBoundMemberId(gateway("c6", { is_gateway: "1", bound_device_id: "c6" }), selfMap)).toBeUndefined();
  });
});
