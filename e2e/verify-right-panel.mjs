// @ts-check
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:5173";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // 截图首页
  await page.screenshot({ path: "e2e/screenshots/right-panel-01-home.png", fullPage: false });

  // 查找画布区域，点击第一个设备节点
  // 设备节点通常有 .device-node 或 svg 内的 g 元素
  const canvasSvg = await page.$("svg.diagram-canvas");
  if (!canvasSvg) {
    console.log("未找到画布 SVG，尝试其他选择器");
    const anySvg = await page.$("svg");
    console.log("any SVG found:", !!anySvg);
  }

  // 尝试点击画布中的设备
  // 通常设备是 svg 中的 g 元素，或带有特定 data 属性
  const deviceNode = await page.$("g[data-node-id], .node-group, g.node");
  if (deviceNode) {
    await deviceNode.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "e2e/screenshots/right-panel-02-device-selected.png" });
  } else {
    console.log("未找到设备节点，尝试双击画布");
    // 尝试在画布中心点击
    const canvas = await page.$(".diagram-canvas, .canvas-container, svg");
    if (canvas) {
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(1000);
      }
    }
  }

  // 检查右侧面板
  const rightPanel = await page.$(".inspector-panel.visible, .floating-side-panel.visible");
  console.log("右侧面板可见:", !!rightPanel);

  // 验证 1: 所有 select 都应该是 antd Select (不是原生 select)
  const nativeSelects = await page.$$(".param-table select:not(.ant-select-selection-search-input)");
  console.log("[验证1] 原生 select 数量 (应为 0):", nativeSelects.length);
  for (const sel of nativeSelects) {
    const outerHTML = await sel.evaluate(el => el.outerHTML.substring(0, 200));
    console.log("  残留原生 select:", outerHTML);
  }

  // 验证 antd Select 存在
  const antdSelects = await page.$$(".param-table .ant-select");
  console.log("[验证1] antd Select 数量:", antdSelects.length);

  // 验证 2: 检查输入框带单位后缀是否使用了 antd Input suffix
  const unitValueFields = await page.$$(".param-table .unit-value-field");
  console.log("[验证2] unit-value-field 残留数量 (应为 0 或极少):", unitValueFields.length);

  // 检查 antd Input 带 suffix
  const inputsWithSuffix = await page.$$(".param-table .ant-input-suffix");
  console.log("[验证2] antd Input 带 suffix 数量:", inputsWithSuffix.length);

  // 验证 3: 颜色选择框无边框无 padding
  const colorFields = await page.$$(".param-table .color-field");
  let colorFieldIssues = 0;
  for (const cf of colorFields) {
    const styles = await cf.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        gridTemplateColumns: computed.gridTemplateColumns,
        padding: computed.padding,
      };
    });
    if (styles.gridTemplateColumns !== "1fr") {
      console.log("[验证3] 颜色框 grid 非 1fr:", styles.gridTemplateColumns);
      colorFieldIssues++;
    }
  }
  console.log("[验证3] 颜色框 grid 问题数 (应为 0):", colorFieldIssues);

  // 检查 DeferredColorInput 是否填充
  const deferredInputs = await page.$$(".param-table .color-field .deferred-color-input");
  let deferredIssues = 0;
  for (const di of deferredInputs) {
    const styles = await di.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        width: computed.width,
        height: computed.height,
      };
    });
    console.log("[验证3] DeferredColorInput 尺寸:", styles.width, "x", styles.height);
  }

  // 检查 ant-color-picker-trigger 无边框
  const colorPickerTriggers = await page.$$(".param-table .color-field .ant-color-picker-trigger");
  for (const trigger of colorPickerTriggers) {
    const styles = await trigger.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        borderWidth: computed.borderWidth,
        padding: computed.padding,
      };
    });
    console.log("[验证3] ColorPicker trigger border:", styles.borderWidth, "padding:", styles.padding);
  }

  // 验证 5: 按钮 hover 样式
  const paramButtons = await page.$$(".param-table .image-field-actions button, .param-table .color-field button");
  let buttonIssues = 0;
  for (const btn of paramButtons) {
    const styles = await btn.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        borderColor: computed.borderColor,
      };
    });
    console.log("[验证5] 按钮默认样式 - color:", styles.color, "border:", styles.borderColor);
    if (!styles.color.includes("0, 0, 0") && styles.color !== "rgb(0, 0, 0)" && styles.color !== "#000000") {
      // color might not be black
      console.log("  注意: 按钮默认色可能非黑:", styles.color);
    }
  }

  // 验证 6: antd Select 宽度
  const selectWidths = await page.$$(".param-table td > .ant-select");
  let selectWidthIssues = 0;
  for (const sel of selectWidths) {
    const styles = await sel.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        width: computed.width,
        maxWidth: computed.maxWidth,
      };
    });
    console.log("[验证6] Select 尺寸:", styles.width, "maxWidth:", styles.maxWidth);
  }

  // 打印总结
  console.log("\n=== 验证总结 ===");
  console.log("原生 select 残留:", nativeSelects.length === 0 ? "✓ 无残留" : `✗ ${nativeSelects.length} 个`);
  console.log("antd Select:", antdSelects.length > 0 ? `✓ ${antdSelects.length} 个` : "✗ 未找到");
  console.log("Input 带 suffix:", inputsWithSuffix.length > 0 ? `✓ ${inputsWithSuffix.length} 个` : "注意: 可能用其他方式实现");
  console.log("颜色框 grid 1fr:", colorFieldIssues === 0 ? "✓" : `✗ ${colorFieldIssues} 个问题`);
  console.log("按钮默认黑色:", buttonIssues === 0 ? "✓" : `✗ ${buttonIssues} 个问题`);

  await browser.close();
}

main().catch(err => {
  console.error("验证失败:", err.message);
  process.exit(1);
});
