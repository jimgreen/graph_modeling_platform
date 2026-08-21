import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reactDialogFiles = [
  "./EFileEditor.tsx",
  "./VoltageLevelDialog.tsx",
  "./UserCustomizationManagerDialog.tsx",
  "./appExtracted/appCanvasInteractionFactories.tsx",
  "./appExtracted/appCanvasDialogs.tsx",
  "./appExtracted/appDeviceDefinitionDialogs.tsx",
  "./appExtracted/appPersistenceLibraryExport.tsx",
  "./appExtracted/appProjectDialogs.tsx",
  "./appExtracted/appProjectCanvasFactories.tsx",
  "./appExtracted/appResourceDialogs.tsx",
  "./appExtracted/appView.tsx"
];

const reactDialogSource = reactDialogFiles
  .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
  .join("\n");

describe("popup window close controls", () => {
  it("keeps every current React popup on the shared Windows-style close control", () => {
    const expectedLabels = [
      "关闭E文件编辑窗口",
      "关闭电压等级设置",
      "关闭导入预览",
      "关闭用户自定义管理",
      "关闭枚举项详情",
      "关闭动态量测配置",
      "关闭量测显示定义",
      "关闭导出结果",
      "关闭库导入导出窗口",
      "关闭名称重复提示",
      "关闭模型名称重复提示",
      "关闭方案名称重复提示",
      "关闭未保存修改提示",
      "关闭未保存修改列表",
      "关闭设置电压基值窗口",
      "关闭清空电压基值窗口",
      "关闭连接线重绘窗口",
      "关闭定义为元件窗口",
      "关闭添加模板窗口",
      "关闭图层修改窗口",
      "关闭过滤选择窗口",
      "关闭React Flow预览",
      "关闭配色设置",
      "关闭元件定义窗口",
      "关闭元件定义编辑窗口",
      "关闭E文件接口定义",
      "关闭E文件接口未保存提示",
      "关闭设备类切换提示",
      "关闭预定义模板导入结果",
      "关闭资源选择窗口"
    ];

    expectedLabels.forEach((label) => {
      expect(reactDialogSource).toContain(`label="${label}"`);
    });
    expect(reactDialogSource).toContain("label={`关闭${title}窗口`}");
    expect(reactDialogSource).toContain("label={`关闭${customLibraryCreateDialog.title}`}");
    expect(reactDialogSource.match(/<WindowCloseButton\b/g)).toHaveLength(36);
  });

  it("covers the non-React global confirmation window and close-button visuals", () => {
    const confirmSource = readFileSync(new URL("./globalMessage.ts", import.meta.url), "utf8");
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(confirmSource).toContain('dialog.className = "global-confirm-dialog window-close-host"');
    expect(confirmSource).toContain('closeBtn.className = "window-close-button"');
    expect(confirmSource).toContain('closeBtn.setAttribute("aria-label", "关闭确认窗口")');
    expect(styles).toContain(".window-close-host > .window-close-button");
    expect(styles).toContain("background: #c42b1c;");
  });
});
