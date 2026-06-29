// @ts-check
/**
 * 生成完整的 __appScope 解构遗漏报告
 */

const fs = require('fs');
const path = require('path');

// 从 App.tsx 提取所有挂载到 __appScope 的变量
function extractAppScopeAssignments(content) {
  const vars = new Set();
  const pattern = /Object\.assign\(__appScope,\s*\{\s*(\w+)\s*\}\)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    vars.add(match[1]);
  }
  const aliasPattern = /Object\.assign\(__appScope,\s*\{\s*(\w+):\s*(\w+)\s*\}\)/g;
  while ((match = aliasPattern.exec(content)) !== null) {
    vars.add(match[1]);
  }
  return vars;
}

// 从子组件文件提取解构列表
function extractComponentDestructures(content) {
  const vars = new Set();
  const pattern = /const\s*\{([^}]+)\}\s*=\s*(?:scope|__appScope)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const destructureContent = match[1];
    const varPattern = /(\w+)(?:\s*:\s*(\w+))?/g;
    let varMatch;
    while ((varMatch = varPattern.exec(destructureContent)) !== null) {
      const varName = varMatch[2] || varMatch[1];
      vars.add(varName);
    }
  }
  return vars;
}

// 从 App.tsx 提取所有 import 的变量
function extractAppImports(content) {
  const imports = new Set();

  // 默认导入
  const defaultImport = /import\s+(\w+)\s+from/g;
  let match;
  while ((match = defaultImport.exec(content)) !== null) {
    imports.add(match[1]);
  }

  // 命名导入
  const namedImport = /import\s*\{([^}]+)\}\s*from/g;
  while ((match = namedImport.exec(content)) !== null) {
    const importList = match[1];
    const itemPattern = /(\w+)(?:\s+as\s+(\w+))?/g;
    let itemMatch;
    while ((itemMatch = itemPattern.exec(importList)) !== null) {
      const name = itemMatch[2] || itemMatch[1];
      imports.add(name);
    }
  }

  // 命名空间导入
  const namespaceImport = /import\s*\*\s*as\s+(\w+)\s+from/g;
  while ((match = namespaceImport.exec(content)) !== null) {
    imports.add(match[1]);
  }

  return imports;
}

// 主函数
function main() {
  const appTsxPath = path.join(__dirname, '../src/App.tsx');
  const appViewPath = path.join(__dirname, '../src/appExtracted/appView.tsx');
  const appCanvasAreaPath = path.join(__dirname, '../src/appExtracted/appCanvasArea.tsx');

  const appContent = fs.readFileSync(appTsxPath, 'utf-8');
  const appScopeVars = extractAppScopeAssignments(appContent);
  const appImports = extractAppImports(appContent);

  const viewContent = fs.readFileSync(appViewPath, 'utf-8');
  const viewDestructures = extractComponentDestructures(viewContent);

  const canvasAreaContent = fs.readFileSync(appCanvasAreaPath, 'utf-8');
  const canvasAreaDestructures = extractComponentDestructures(canvasAreaContent);

  const report = {
    summary: {
      appScopeMountCount: appScopeVars.size,
      appImportCount: appImports.size,
      appViewDestructureCount: viewDestructures.size,
      appCanvasAreaDestructureCount: canvasAreaDestructures.size,
    },
    criticalIssues: [],
    recommendations: []
  };

  // 找出 appView.tsx 解构了但 App.tsx 未挂载的变量
  const viewMissing = [];
  for (const varName of viewDestructures) {
    if (!appScopeVars.has(varName)) {
      const inAppImports = appImports.has(varName);
      viewMissing.push({
        variable: varName,
        inAppImports: inAppImports,
        risk: inAppImports ? 'HIGH' : 'MEDIUM'
      });
    }
  }

  // 找出 appCanvasArea.tsx 解构了但 App.tsx 未挂载的变量
  const canvasAreaMissing = [];
  for (const varName of canvasAreaDestructures) {
    if (!appScopeVars.has(varName)) {
      const inAppImports = appImports.has(varName);
      canvasAreaMissing.push({
        variable: varName,
        inAppImports: inAppImports,
        risk: inAppImports ? 'HIGH' : 'MEDIUM'
      });
    }
  }

  // 分类问题
  const highRisk = viewMissing.filter(v => v.risk === 'HIGH').concat(canvasAreaMissing.filter(v => v.risk === 'HIGH'));
  const mediumRisk = viewMissing.filter(v => v.risk === 'MEDIUM').concat(canvasAreaMissing.filter(v => v.risk === 'MEDIUM'));

  if (highRisk.length > 0) {
    report.criticalIssues.push({
      type: 'HIGH_RISK_REFERENCE_ERROR',
      description: '这些变量在 App.tsx 中被导入和使用，但没有挂载到 __appScope，子组件解构使用时会导致 ReferenceError',
      affectedFiles: ['appView.tsx', 'appCanvasArea.tsx'],
      variables: highRisk.map(v => v.variable)
    });
  }

  if (mediumRisk.length > 0) {
    report.criticalIssues.push({
      type: 'MEDIUM_RISK_REFERENCE_ERROR',
      description: '这些变量在 App.tsx 中可能未被导入，子组件解构使用时会导致 ReferenceError',
      affectedFiles: ['appView.tsx', 'appCanvasArea.tsx'],
      variables: mediumRisk.map(v => v.variable)
    });
  }

  // 生成修复建议
  if (highRisk.length > 0 || mediumRisk.length > 0) {
    report.recommendations.push({
      action: '在 App.tsx 中添加 __appScope 挂载',
      description: '在 App.tsx 中找到合适的位置，添加以下代码：',
      code: highRisk.concat(mediumRisk).map(v => `Object.assign(__appScope, { ${v.variable} });`).join('\n'),
      priority: 'P0'
    });

    report.recommendations.push({
      action: '或者在子组件中直接 import',
      description: '如果这些变量是静态的（如常量、组件），可以在子组件中直接 import，而不是从 __appScope 解构',
      priority: 'P1'
    });
  }

  // 输出报告
  console.log('📊 __appScope 解构遗漏分析报告\n');
  console.log(`📦 App.tsx 挂载到 __appScope 的变量数: ${appScopeVars.size}`);
  console.log(`📦 App.tsx import 的变量数: ${appImports.size}`);
  console.log(`📄 appView.tsx 解构的变量数: ${viewDestructures.size}`);
  console.log(`📄 appCanvasArea.tsx 解构的变量数: ${canvasAreaDestructures.size}`);
  console.log('');

  if (report.criticalIssues.length > 0) {
    console.log('⚠️  发现关键问题：\n');
    for (const issue of report.criticalIssues) {
      console.log(`🔴 ${issue.type}`);
      console.log(`   ${issue.description}`);
      console.log(`   影响文件: ${issue.affectedFiles.join(', ')}`);
      console.log(`   涉及变量数: ${issue.variables.length}`);
      if (issue.variables.length <= 20) {
        console.log(`   变量列表: ${issue.variables.join(', ')}`);
      } else {
        console.log(`   变量列表（前20个）: ${issue.variables.slice(0, 20).join(', ')}`);
        console.log(`   ... 还有 ${issue.variables.length - 20} 个`);
      }
      console.log('');
    }
  }

  if (report.recommendations.length > 0) {
    console.log('💡 修复建议：\n');
    for (const rec of report.recommendations) {
      console.log(`[${rec.priority}] ${rec.action}`);
      console.log(`   ${rec.description}`);
      if (rec.code) {
        console.log('   示例代码：');
        console.log(rec.code.split('\n').slice(0, 10).map(l => `   ${l}`).join('\n'));
        if (rec.code.split('\n').length > 10) {
          console.log(`   ... 还有 ${rec.code.split('\n').length - 10} 行`);
        }
      }
      console.log('');
    }
  }

  // 保存 JSON 报告
  const reportPath = path.join(__dirname, 'appscope-destructure-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📝 详细报告已保存到: ${reportPath}`);
}

main();
