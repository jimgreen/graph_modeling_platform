// @ts-check
/**
 * 精确校验 __appScope 解构遗漏（改进版）
 * - 排除注释中的词
 * - 验证变量是否真的被使用
 * - 验证变量是否真的没有挂载
 * - 记录变量的具体位置
 */

const fs = require('fs');
const path = require('path');

// 从文件中移除所有注释
function removeComments(content) {
  return content
    .replace(/\/\/.*$/gm, '') // 单行注释
    .replace(/\/\*[\s\S]*?\*\//g, ''); // 多行注释
}

// 提取文件中所有 import 的标识符
function extractImports(content) {
  const imports = new Set();
  const cleanContent = removeComments(content);

  // 默认导入
  const defaultImport = /import\s+(\w+)\s+from/g;
  let match;
  while ((match = defaultImport.exec(cleanContent)) !== null) {
    imports.add(match[1]);
  }

  // 命名导入
  const namedImport = /import\s*\{([^}]+)\}\s*from/g;
  while ((match = namedImport.exec(cleanContent)) !== null) {
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
  while ((match = namespaceImport.exec(cleanContent)) !== null) {
    imports.add(match[1]);
  }

  return imports;
}

// 从 App.tsx 提取所有挂载到 __appScope 的变量及其位置
function extractAppScopeAssignments(content) {
  const vars = new Map(); // variable name -> line number
  const cleanContent = removeComments(content);
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 匹配 Object.assign(__appScope, { xxx })
    const pattern = /Object\.assign\(__appScope,\s*\{\s*(\w+)\s*\}\)/g;
    let match;
    while ((match = pattern.exec(line)) !== null) {
      vars.set(match[1], i + 1);
    }

    // 匹配 Object.assign(__appScope, { xxx: yyy })
    const aliasPattern = /Object\.assign\(__appScope,\s*\{\s*(\w+):\s*(\w+)\s*\}\)/g;
    while ((match = aliasPattern.exec(line)) !== null) {
      vars.set(match[1], i + 1);
    }
  }

  return vars;
}

// 从子组件文件提取解构列表及其位置
function extractComponentDestructures(content) {
  const vars = new Map(); // variable name -> line number
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 匹配 } = scope 或 } = __appScope
    if (/}\s*=\s*(?:scope|__appScope)/.test(line)) {
      // 提取这一行及之前几行的解构内容
      let destructureContent = '';
      let j = i;
      while (j >= 0 && !/const\s*\{/.test(lines[j])) {
        destructureContent = lines[j] + '\n' + destructureContent;
        j--;
      }
      if (j >= 0) {
        destructureContent = lines[j] + '\n' + destructureContent;
      }

      // 提取变量名
      const varPattern = /(\w+)(?:\s*:\s*(\w+))?/g;
      let match;
      while ((match = varPattern.exec(destructureContent)) !== null) {
        const varName = match[2] || match[1];
        if (!vars.has(varName)) {
          vars.set(varName, i + 1);
        }
      }
    }
  }

  return vars;
}

// 检查变量是否在文件中真的被使用（排除解构声明本身）
function checkVariableUsage(content, varName) {
  const cleanContent = removeComments(content);
  const lines = cleanContent.split('\n');

  let usageCount = 0;
  let usageLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳过解构声明
    if (line.includes('} = scope') || line.includes('} = __appScope')) {
      continue;
    }

    // 检查变量是否被使用（作为独立标识符）
    const pattern = new RegExp(`\\b${varName}\\b`, 'g');
    const matches = line.match(pattern);
    if (matches) {
      usageCount += matches.length;
      if (usageLine === -1) {
        usageLine = i + 1;
      }
    }
  }

  return { usageCount, usageLine };
}

// 检查变量是否在 App.tsx 中被定义（const/let/var/function/state）
function checkVariableDefinition(content, varName) {
  const cleanContent = removeComments(content);
  const lines = cleanContent.split('\n');

  let defined = false;
  let definitionLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检查 const/let/var 定义
    if (new RegExp(`\\b(?:const|let|var)\\s+${varName}\\b`).test(line)) {
      defined = true;
      definitionLine = i + 1;
      break;
    }

    // 检查 function 定义
    if (new RegExp(`\\bfunction\\s+${varName}\\s*\\(`).test(line)) {
      defined = true;
      definitionLine = i + 1;
      break;
    }

    // 检查 useState/useCallback 等
    if (new RegExp(`\\b(?:useState|useCallback|useMemo|useRef)\\b.*\\b${varName}\\b`).test(line)) {
      defined = true;
      definitionLine = i + 1;
      break;
    }
  }

  return { defined, definitionLine };
}

// 主函数
function main() {
  const appTsxPath = path.join(__dirname, '../src/App.tsx');
  const appViewPath = path.join(__dirname, '../src/appExtracted/appView.tsx');
  const appCanvasAreaPath = path.join(__dirname, '../src/appExtracted/appCanvasArea.tsx');

  console.log('🔍 精确校验 __appScope 解构遗漏（改进版）...\n');

  const appContent = fs.readFileSync(appTsxPath, 'utf-8');
  const appScopeVars = extractAppScopeAssignments(appContent);
  const appImports = extractImports(appContent);

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
    verifiedMissing: [],
    falsePositives: []
  };

  // 校验 appView.tsx
  console.log('📄 校验 appView.tsx...');
  for (const [varName, destructureLine] of viewDestructures) {
    // 检查是否在 App.tsx 中挂载
    if (appScopeVars.has(varName)) {
      continue; // 已挂载，不是遗漏
    }

    // 检查是否在 appView.tsx 中真的被使用
    const usage = checkVariableUsage(viewContent, varName);
    if (usage.usageCount === 0) {
      report.falsePositives.push({
        variable: varName,
        file: 'appView.tsx',
        destructureLine,
        reason: '变量在解构后没有被使用'
      });
      continue;
    }

    // 检查是否在 App.tsx 中被定义
    const definition = checkVariableDefinition(appContent, varName);
    const inAppImports = appImports.has(varName);

    if (!definition.defined && !inAppImports) {
      report.falsePositives.push({
        variable: varName,
        file: 'appView.tsx',
        destructureLine,
        reason: '变量在 App.tsx 中既没有导入也没有定义'
      });
      continue;
    }

    // 确认是真正遗漏
    report.verifiedMissing.push({
      variable: varName,
      file: 'appView.tsx',
      destructureLine,
      usageLine: usage.usageLine,
      inApp: inAppImports ? 'imported' : definition.defined ? 'defined' : 'unknown',
      appDefinitionLine: definition.definitionLine
    });
  }

  // 校验 appCanvasArea.tsx
  console.log('📄 校验 appCanvasArea.tsx...');
  for (const [varName, destructureLine] of canvasAreaDestructures) {
    if (appScopeVars.has(varName)) {
      continue;
    }

    const usage = checkVariableUsage(canvasAreaContent, varName);
    if (usage.usageCount === 0) {
      report.falsePositives.push({
        variable: varName,
        file: 'appCanvasArea.tsx',
        destructureLine,
        reason: '变量在解构后没有被使用'
      });
      continue;
    }

    const definition = checkVariableDefinition(appContent, varName);
    const inAppImports = appImports.has(varName);

    if (!definition.defined && !inAppImports) {
      report.falsePositives.push({
        variable: varName,
        file: 'appCanvasArea.tsx',
        destructureLine,
        reason: '变量在 App.tsx 中既没有导入也没有定义'
      });
      continue;
    }

    report.verifiedMissing.push({
      variable: varName,
      file: 'appCanvasArea.tsx',
      destructureLine,
      usageLine: usage.usageLine,
      inApp: inAppImports ? 'imported' : definition.defined ? 'defined' : 'unknown',
      appDefinitionLine: definition.definitionLine
    });
  }

  // 按文件分组
  const byFile = {};
  for (const item of report.verifiedMissing) {
    if (!byFile[item.file]) {
      byFile[item.file] = [];
    }
    byFile[item.file].push(item);
  }

  // 输出报告
  console.log('\n📊 校验结果：\n');
  console.log(`✅ 真正遗漏的变量: ${report.verifiedMissing.length}`);
  console.log(`❌ 误报的变量: ${report.falsePositives.length}`);

  console.log('\n📁 按文件分组：');
  for (const [file, items] of Object.entries(byFile)) {
    console.log(`  ${file}: ${items.length} 个遗漏变量`);
  }

  console.log('\n📝 误报原因统计：');
  const falsePositiveReasons = {};
  for (const fp of report.falsePositives) {
    falsePositiveReasons[fp.reason] = (falsePositiveReasons[fp.reason] || 0) + 1;
  }
  for (const [reason, count] of Object.entries(falsePositiveReasons)) {
    console.log(`  ${reason}: ${count} 个`);
  }

  // 保存 JSON 报告
  const reportPath = path.join(__dirname, 'verified-appscope-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 详细报告已保存到: ${reportPath}`);

  // 生成修复代码
  const fixCodeLines = [];
  for (const item of report.verifiedMissing) {
    fixCodeLines.push(`Object.assign(__appScope, { ${item.variable} }); // ${item.file}:${item.destructureLine}`);
  }

  const fixCodePath = path.join(__dirname, 'fix-appscope-mounts.js');
  fs.writeFileSync(fixCodePath, fixCodeLines.join('\n'));
  console.log(`🔧 修复代码已保存到: ${fixCodePath}`);
}

main();
