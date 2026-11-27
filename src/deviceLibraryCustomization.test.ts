import { describe, expect, test } from "vitest";
import { DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG } from "./interfaceCustomization";
import { filterDeviceLibraryGroups } from "./deviceLibraryCustomization";

describe("图元库显示范围过滤", () => {
  test("按类别库、类和图元逐级过滤，未配置的新图元默认保留", () => {
    const groups = [
      {
        section: "ACContainer",
        templates: [{ kind: "ac-switch-box" }, { kind: "ac-new-container" }]
      },
      {
        section: "ACLoad",
        templates: [{ kind: "ac-load" }, { kind: "ac-new-load" }]
      }
    ];
    const config = {
      ...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG.deviceLibrary,
      componentLibraries: { "交流设备::ACContainer": false },
      devices: { "交流设备::ACLoad::ac-load": false }
    };

    expect(filterDeviceLibraryGroups("交流设备", groups, config)).toEqual([
      {
        section: "ACLoad",
        templates: [{ kind: "ac-new-load" }]
      }
    ]);
  });

  test("父级类别库隐藏时不返回任何类", () => {
    const config = {
      ...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG.deviceLibrary,
      categories: { "交流设备": false }
    };

    expect(filterDeviceLibraryGroups("交流设备", [{ section: "ACLoad", templates: [{ kind: "ac-load" }] }], config)).toEqual([]);
  });
});
