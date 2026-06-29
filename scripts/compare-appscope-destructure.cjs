// @ts-check
/**
 * 对比 App.tsx 中 __appScope 挂载的变量 和 子组件解构的变量
 * 找出子组件遗漏的变量
 */

const fs = require('fs');
const path = require('path');

// 从 App.tsx 提取所有挂载到 __appScope 的变量
function extractAppScopeAssignments(content) {
  const vars = new Set();

  // 匹配 Object.assign(__appScope, { xxx }) 模式
  const pattern = /Object\.assign\(__appScope,\s*\{\s*(\w+)\s*\}\)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    vars.add(match[1]);
  }

  // 匹配 Object.assign(__appScope, { xxx: yyy }) 模式（别名）
  const aliasPattern = /Object\.assign\(__appScope,\s*\{\s*(\w+):\s*(\w+)\s*\}\)/g;
  while ((match = aliasPattern.exec(content)) !== null) {
    vars.add(match[1]); // 添加属性名（不是值名）
  }

  return vars;
}

// 从子组件文件提取解构列表
function extractComponentDestructures(content) {
  const vars = new Set();

  // 匹配 } = scope 或 } = __appScope
  const pattern = /const\s*\{([^}]+)\}\s*=\s*(?:scope|__appScope)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const destructureContent = match[1];
    // 提取变量名（处理别名）
    const varPattern = /(\w+)(?:\s*:\s*(\w+))?/g;
    let varMatch;
    while ((varMatch = varPattern.exec(destructureContent)) !== null) {
      const varName = varMatch[2] || varMatch[1]; // 有别名用别名
      vars.add(varName);
    }
  }

  return vars;
}

// 主函数
function main() {
  const appTsxPath = path.join(__dirname, '../src/App.tsx');
  const appCanvasAreaPath = path.join(__dirname, '../src/appExtracted/appCanvasArea.tsx');
  const appViewPath = path.join(__dirname, '../src/appExtracted/appView.tsx');

  console.log('🔍 对比 __appScope 挂载列表 vs 子组件解构列表...\n');

  const appContent = fs.readFileSync(appTsxPath, 'utf-8');
  const appScopeVars = extractAppScopeAssignments(appContent);

  console.log(`📦 App.tsx 挂载到 __appScope 的变量数: ${appScopeVars.size}`);

  // 分析 appCanvasArea.tsx
  const canvasAreaContent = fs.readFileSync(appCanvasAreaPath, 'utf-8');
  const canvasAreaDestructures = extractComponentDestructures(canvasAreaContent);

  console.log(`📄 appCanvasArea.tsx 解构的变量数: ${canvasAreaDestructures.size}`);

  // 找出遗漏的
  const canvasAreaMissing = [];
  for (const varName of appScopeVars) {
    if (!canvasAreaDestructures.has(varName)) {
      canvasAreaMissing.push(varName);
    }
  }

  if (canvasAreaMissing.length > 0) {
    console.log(`\n⚠️  appCanvasArea.tsx 可能遗漏的变量 (${canvasAreaMissing.length}):`);
    canvasAreaMissing.sort().forEach(v => console.log(`   - ${v}`));
  } else {
    console.log(`✅ appCanvasArea.tsx 没有遗漏`);
  }

  // 分析 appView.tsx
  const viewContent = fs.readFileSync(appViewPath, 'utf-8');
  const viewDestructures = extractComponentDestructures(viewContent);

  console.log(`\n📄 appView.tsx 解构的变量数: ${viewDestructures.size}`);

  const viewMissing = [];
  for (const varName of appScopeVars) {
    if (!viewDestructures.has(varName)) {
      viewMissing.push(varName);
    }
  }

  if (viewMissing.length > 0) {
    console.log(`\n⚠️  appView.tsx 可能遗漏的变量 (${viewMissing.length}):`);
    viewMissing.sort().forEach(v => console.log(`   - ${v}`));
  } else {
    console.log(`✅ appView.tsx 没有遗漏`);
  }

  // 检查反向：子组件解构了但 App.tsx 没有挂载的
  console.log('\n--- 反向检查：子组件解构了但 App.tsx 未挂载的 ---');

  const canvasAreaExtra = [];
  for (const varName of canvasAreaDestructures) {
    if (!appScopeVars.has(varName)) {
      canvasAreaExtra.push(varName);
    }
  }

  if (canvasAreaExtra.length > 0) {
    console.log(`\n❗ appCanvasArea.tsx 解构了但 App.tsx 未挂载 (${canvasAreaExtra.length}):`);
    canvasAreaExtra.sort().forEach(v => console.log(`   - ${v}`));
  }

  const viewExtra = [];
  for (const varName of viewDestructures) {
    if (!appScopeVars.has(varName)) {
      viewExtra.push(varName);
    }
  }

  if (viewExtra.length > 0) {
    console.log(`\n❗ appView.tsx 解构了但 App.tsx 未挂载 (${viewExtra.length}):`);
    viewExtra.sort().slice(0, 50).forEach(v => console.log(`   - ${v}`));
    if (viewExtra.length > 50) {
      console.log(`   ... 还有 ${viewExtra.length - 50} 个`);
    }
  }
}

main();
