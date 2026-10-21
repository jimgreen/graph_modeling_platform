import { describe, expect, test, vi } from "vitest";
import { createOpenProjectFromUrl } from "./appProjectCanvasFactories";

// 这些用例守的是「工厂必须**同步**返回一个函数」这条契约。
//
// 曾经把它写成 `export async function createOpenProjectFromUrl(...)`，于是
// `createOpenProjectFromUrl(__appScope)` 返回的是 Promise 而不是函数，装配进 __appScope
// 的 `openProjectFromUrl` 就成了个对象。调用点写的是 `await latest.openProjectFromUrl?.(...)`，
// 可选链对「非函数」不生效、`.()` 抛 TypeError 被 async 吞掉，表现是**地址栏指定的模型
// 静默不打开**且没有任何报错 —— 这种坑必须由测试钉死，不能靠肉眼。
describe("createOpenProjectFromUrl", () => {
  test("同步返回函数（不是 Promise）", () => {
    const openProjectFromUrl = createOpenProjectFromUrl({});
    expect(typeof openProjectFromUrl).toBe("function");
    expect(openProjectFromUrl).not.toBeInstanceOf(Promise);
  });

  const schemes = [
    {
      id: "scheme:DOT",
      name: "DOT",
      projects: [
        { id: "project:DOT/牌查模型", name: "牌查模型", project: { idx: 13 } },
        { id: "project:DOT/望道变_6", name: "望道变_6", project: { idx: 9 } }
      ],
      children: []
    }
  ];

  test("按 idx 打开，并把方案运行期 id（不是 slug）传给 requestLoadSavedProject", async () => {
    const requestLoadSavedProject = vi.fn();
    const openProjectFromUrl = createOpenProjectFromUrl({
      schemes,
      activeProjectKey: "project:DOT/望道变_6",
      requestLoadSavedProject,
      findSavedProjectRecordInSchemes: vi.fn()
    });
    const opened = await openProjectFromUrl("13", "DOT", "");
    expect(opened).toBe(true);
    expect(requestLoadSavedProject).toHaveBeenCalledTimes(1);
    const [record, schemeId] = requestLoadSavedProject.mock.calls[0];
    expect(record.project.idx).toBe(13);
    // 传的是 `scheme:DOT` 而不是地址栏里的 slug `DOT`：后者解不出磁盘路径
    expect(schemeId).toBe("scheme:DOT");
  });

  test("要找的就是当前已打开的模型：直接返回 true，不重复加载", async () => {
    const requestLoadSavedProject = vi.fn();
    const openProjectFromUrl = createOpenProjectFromUrl({
      schemes,
      activeProjectKey: "project:DOT/牌查模型",
      requestLoadSavedProject
    });
    await expect(openProjectFromUrl("13", "DOT", "")).resolves.toBe(true);
    expect(requestLoadSavedProject).not.toHaveBeenCalled();
  });

  test("idx 找不到时回退到旧格式的运行期 key", async () => {
    const requestLoadSavedProject = vi.fn();
    const findSavedProjectRecordInSchemes = vi.fn(() => ({
      record: schemes[0].projects[1],
      scheme: schemes[0]
    }));
    const openProjectFromUrl = createOpenProjectFromUrl({
      schemes,
      activeProjectKey: "",
      requestLoadSavedProject,
      findSavedProjectRecordInSchemes
    });
    const opened = await openProjectFromUrl("project:DOT/望道变_6", "", "project:DOT/望道变_6");
    expect(opened).toBe(true);
    expect(findSavedProjectRecordInSchemes).toHaveBeenCalled();
  });

  test("都找不到时返回 false，且不打开任何东西", async () => {
    const requestLoadSavedProject = vi.fn();
    const enterBrowseMode = vi.fn();
    const openProjectFromUrl = createOpenProjectFromUrl({
      schemes,
      activeProjectKey: "",
      requestLoadSavedProject,
      enterBrowseMode
    });
    await expect(openProjectFromUrl("999", "DOT", "")).resolves.toBe(false);
    expect(requestLoadSavedProject).not.toHaveBeenCalled();
    expect(enterBrowseMode).not.toHaveBeenCalled();
  });
});
