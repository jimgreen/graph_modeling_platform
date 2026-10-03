import { afterEach, describe, expect, test } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPTS_DIR = fileURLToPath(new URL(".", import.meta.url));
const SCRIPT = join(SCRIPTS_DIR, "generate-appscope-report.cjs");
const REAL_REPORT = join(SCRIPTS_DIR, "appscope-destructure-report.json");
const realReportExisted = existsSync(REAL_REPORT);
const realReportBefore = realReportExisted ? readFileSync(REAL_REPORT) : undefined;
const tempRoots = new Set();

function createFixture(files) {
  const root = mkdtempSync(join(tmpdir(), "generate-appscope-report-"));
  tempRoots.add(root);
  const scriptsDir = join(root, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  writeFileSync(join(scriptsDir, "generate-appscope-report.cjs"), readFileSync(SCRIPT));

  for (const [relative, contents] of Object.entries(files)) {
    const target = join(root, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  return root;
}

function runFixture(root) {
  const script = join(root, "scripts", "generate-appscope-report.cjs");
  const reportPath = join(root, "scripts", "appscope-destructure-report.json");
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf-8",
    maxBuffer: 8 * 1024 * 1024
  });
  expect(result.error, result.error?.message).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain(`详细报告已保存到: ${reportPath}`);
  expect(existsSync(reportPath)).toBe(true);
  const reportText = readFileSync(reportPath, "utf-8");
  return { report: JSON.parse(reportText), reportText, stdout: result.stdout };
}

afterEach(() => {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
  tempRoots.clear();

  expect(existsSync(REAL_REPORT)).toBe(realReportExisted);
  if (realReportExisted) {
    expect(readFileSync(REAL_REPORT)).toEqual(realReportBefore);
  }
});

describe("generate-appscope-report —— 输出契约", () => {
  test("正常输入产出完整报告，统计和问题变量与夹具扫描结果一致", () => {
    const root = createFixture({
      "src/App.tsx": [
        "import DefaultThing from './default';",
        "import { localMissing, localCanvasMissing } from './named';",
        "import * as Namespace from './namespace';",
        "Object.assign(__appScope, { mounted });",
        "Object.assign(__appScope, { exposedAlias: actualValue });"
      ].join("\n"),
      "src/appExtracted/appView.tsx": "const { mounted, localMissing, absentView } = scope;\n",
      "src/appExtracted/appCanvasArea.tsx": "const { exposedAlias, localCanvasMissing, canvasAbsent } = __appScope;\n"
    });

    const { report } = runFixture(root);

    expect(report).toEqual({
      summary: {
        appScopeMountCount: 2,
        appImportCount: 4,
        appViewDestructureCount: 3,
        appCanvasAreaDestructureCount: 3
      },
      criticalIssues: [
        {
          type: "HIGH_RISK_REFERENCE_ERROR",
          description: expect.any(String),
          affectedFiles: ["appView.tsx", "appCanvasArea.tsx"],
          variables: ["localMissing", "localCanvasMissing"]
        },
        {
          type: "MEDIUM_RISK_REFERENCE_ERROR",
          description: expect.any(String),
          affectedFiles: ["appView.tsx", "appCanvasArea.tsx"],
          variables: ["absentView", "canvasAbsent"]
        }
      ],
      recommendations: [
        {
          action: "在 App.tsx 中添加 __appScope 挂载",
          description: expect.any(String),
          code: [
            "Object.assign(__appScope, { localMissing });",
            "Object.assign(__appScope, { localCanvasMissing });",
            "Object.assign(__appScope, { absentView });",
            "Object.assign(__appScope, { canvasAbsent });"
          ].join("\n"),
          priority: "P0"
        },
        {
          action: "或者在子组件中直接 import",
          description: expect.any(String),
          priority: "P1"
        }
      ]
    });
  });

  test("空 src 文件正常产出全零摘要和空问题列表", () => {
    const root = createFixture({
      "src/App.tsx": "",
      "src/appExtracted/appView.tsx": "",
      "src/appExtracted/appCanvasArea.tsx": ""
    });

    const { report } = runFixture(root);

    expect(report).toEqual({
      summary: {
        appScopeMountCount: 0,
        appImportCount: 0,
        appViewDestructureCount: 0,
        appCanvasAreaDestructureCount: 0
      },
      criticalIssues: [],
      recommendations: []
    });
  });

  test("无匹配源码正常产出全零摘要而不误报", () => {
    const root = createFixture({
      "src/App.tsx": "const value = 42;\nexport default value;\n",
      "src/appExtracted/appView.tsx": "export const viewText = 'scope';\n",
      "src/appExtracted/appCanvasArea.tsx": "export const canvasText = 'plain';\n"
    });

    const { report } = runFixture(root);

    expect(report.summary).toEqual({
      appScopeMountCount: 0,
      appImportCount: 0,
      appViewDestructureCount: 0,
      appCanvasAreaDestructureCount: 0
    });
    expect(report.criticalIssues).toEqual([]);
    expect(report.recommendations).toEqual([]);
  });

  test("相同输入连续运行两次，JSON 报告和标准输出保持稳定", () => {
    const root = createFixture({
      "src/App.tsx": "import { missing } from './module';\nObject.assign(__appScope, { mounted });\n",
      "src/appExtracted/appView.tsx": "const { missing } = scope;\n",
      "src/appExtracted/appCanvasArea.tsx": "const { mounted } = __appScope;\n"
    });

    const first = runFixture(root);
    const second = runFixture(root);

    expect(second.reportText).toBe(first.reportText);
    expect(second.stdout).toBe(first.stdout);
  });

  test("畸形源码内容不会使脚本崩溃，仍会写出可解析报告", () => {
    const root = createFixture({
      "src/App.tsx": "import { localMissing } from './module';\u0000 ???\nObject.assign(__appScope, { mounted });\n",
      "src/appExtracted/appView.tsx": "const { localMissing, absent } = scope;\u0000\n",
      "src/appExtracted/appCanvasArea.tsx": "/* unterminated-looking text \u0000 <<<\n"
    });

    const { report } = runFixture(root);

    expect(report.summary).toEqual({
      appScopeMountCount: 1,
      appImportCount: 1,
      appViewDestructureCount: 2,
      appCanvasAreaDestructureCount: 0
    });
    expect(report.criticalIssues).toEqual([
      {
        type: "HIGH_RISK_REFERENCE_ERROR",
        description: expect.any(String),
        affectedFiles: ["appView.tsx", "appCanvasArea.tsx"],
        variables: ["localMissing"]
      },
      {
        type: "MEDIUM_RISK_REFERENCE_ERROR",
        description: expect.any(String),
        affectedFiles: ["appView.tsx", "appCanvasArea.tsx"],
        variables: ["absent"]
      }
    ]);
  });
});
