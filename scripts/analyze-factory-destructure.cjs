// @ts-check
/**
 * 精确排查 factory 函数中从 __appScope 解构遗漏的问题
 * 策略：对每个 createXxx 函数，提取解构列表，然后检查函数体内是否有
 *       直接使用但未解构、未 import、未作为参数的变量
 */

const fs = require('fs');
const path = require('path');

const appExtractedDir = path.join(__dirname, '../src/appExtracted');

// 从文件内容提取所有 import 的标识符
function extractImports(content) {
  const imports = new Set();

  // 匹配 import xxx from "yyy"
  const defaultImport = /import\s+(\w+)\s+from/g;
  let match;
  while ((match = defaultImport.exec(content)) !== null) {
    imports.add(match[1]);
  }

  // 匹配 import { a, b as c } from "yyy"
  const namedImport = /import\s*\{([^}]+)\}\s*from/g;
  while ((match = namedImport.exec(content)) !== null) {
    const importList = match[1];
    const itemPattern = /(\w+)(?:\s+as\s+(\w+))?/g;
    let itemMatch;
    while ((itemMatch = itemPattern.exec(importList)) !== null) {
      const name = itemMatch[2] || itemMatch[1]; // 有别名用别名
      imports.add(name);
    }
  }

  // 匹配 import * as xxx from "yyy"
  const namespaceImport = /import\s*\*\s*as\s+(\w+)\s+from/g;
  while ((match = namespaceImport.exec(content)) !== null) {
    imports.add(match[1]);
  }

  return imports;
}

// 提取单个 factory 函数的解构列表
function extractFunctionDestructures(functionBody) {
  const vars = new Set();

  // 匹配 } = __appScope 或 } = scope
  const destructurePattern = /const\s*\{([^}]+)\}\s*=\s*(?:__appScope|scope)/g;
  let match;
  while ((match = destructurePattern.exec(functionBody)) !== null) {
    const destructureContent = match[1];
    // 提取变量名（处理别名）
    const varPattern = /(\w+)(?:\s*:\s*(\w+))?/g;
    let varMatch;
    while ((varMatch = varPattern.exec(destructureContent)) !== null) {
      const varName = varMatch[2] || varMatch[1];
      vars.add(varName);
    }
  }

  return vars;
}

// 提取函数体内定义的局部变量（const, let, var, function）
function extractLocalDefinitions(functionBody) {
  const vars = new Set();

  // 匹配 const/let/var xxx =
  const declarationPattern = /\b(?:const|let|var)\s+(\w+)/g;
  let match;
  while ((match = declarationPattern.exec(functionBody)) !== null) {
    vars.add(match[1]);
  }

  // 匹配 function xxx(
  const functionPattern = /\bfunction\s+(\w+)\s*\(/g;
  while ((match = functionPattern.exec(functionBody)) !== null) {
    vars.add(match[1]);
  }

  return vars;
}

// 提取函数参数
function extractFunctionParameters(functionHeader) {
  const params = new Set();

  // 匹配 (xxx: Type, yyy: Type)
  const paramPattern = /\(([^)]+)\)/;
  const match = paramPattern.exec(functionHeader);
  if (match) {
    const paramList = match[1];
    const itemPattern = /(\w+)(?:\s*:\s*[^,)]+)?/g;
    let itemMatch;
    while ((itemMatch = itemPattern.exec(paramList)) !== null) {
      params.add(itemMatch[1]);
    }
  }

  return params;
}

// 提取函数体内使用的标识符（排除字符串、注释、属性访问、类型注解）
function extractUsedIdentifiers(functionBody) {
  const used = new Set();

  // 移除注释和字符串
  let clean = functionBody
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'[^']*'/g, '""')
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, '""');

  // 移除属性访问：xxx.yyy -> xxx (只保留主体)
  clean = clean.replace(/\.\s*([A-Za-z_$][A-Za-z0-9_$]*)/g, '');

  // 移除类型注解：: Type 或 as Type
  clean = clean.replace(/:\s*([A-Za-z_$][A-Za-z0-9_$<>|&\s,\[\]]*)(?=[=,)\s{])/g, '');
  clean = clean.replace(/\bas\s+([A-Za-z_$][A-Za-z0-9_$<>|&\s,\[\]]*)/g, '');

  // 移除函数调用后的部分，但保留函数名
  // clean = clean.replace(/\(([^)]*)\)/g, '()');

  // 匹配标识符
  const identifierPattern = /\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;
  let match;
  while ((match = identifierPattern.exec(clean)) !== null) {
    used.add(match[1]);
  }

  return used;
}

// JavaScript/TypeScript 关键字和内置对象
const BUILTINS = new Set([
  // 关键字
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends',
  'import', 'export', 'from', 'default', 'typeof', 'instanceof', 'void', 'delete',
  'true', 'false', 'null', 'undefined', 'try', 'catch', 'finally', 'throw',
  'async', 'await', 'yield', 'of', 'in', 'as', 'is', 'keyof', 'readonly',
  'interface', 'type', 'enum', 'namespace', 'module', 'declare', 'abstract',
  'implements', 'private', 'protected', 'public', 'static', 'super', 'constructor',
  'get', 'set', 'any', 'string', 'number', 'boolean', 'object', 'unknown', 'never',
  'void', 'bigint', 'symbol',
  // 内置对象
  'console', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean',
  'Promise', 'Error', 'window', 'document', 'navigator', 'location', 'history',
  'localStorage', 'sessionStorage', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'fetch', 'URL', 'JSON', 'RegExp', 'Map', 'Set', 'WeakMap',
  'WeakSet', 'Symbol', 'Proxy', 'Reflect', 'Intl', 'globalThis',
  // DOM 全局函数
  'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask',
  'getComputedStyle', 'matchMedia', 'alert', 'confirm', 'prompt',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
  'encodeURIComponent', 'decodeURIComponent',
  // 常见 DOM/React
  'React', 'Element', 'HTMLElement', 'HTMLDivElement', 'HTMLInputElement',
  'HTMLButtonElement', 'SVGSVGElement', 'SVGElement', 'MouseEvent', 'PointerEvent',
  'KeyboardEvent', 'DragEvent', 'ChangeEvent', 'WheelEvent', 'FocusEvent',
  'CSSProperties', 'ReactNode', 'SetStateAction', 'Dispatch', 'MutableRefObject',
  'RefObject', 'FormEvent', 'ClipboardEvent', 'TouchEvent', 'AnimationEvent',
  'TransitionEvent', 'UIEvent', 'Event', 'Node', 'Record', 'Partial', 'Pick',
  'Omit', 'Exclude', 'Extract', 'ReturnType', 'Parameters', 'NonNullable',
  'Required', 'Readonly', 'InstanceType'
]);

// 解析单个 factory 函数
function parseFactoryFunctions(content) {
  const functions = [];

  // 匹配 export function createXxx(__appScope: ...) { ... }
  const functionPattern = /export\s+function\s+(create\w+)\s*\(([^)]*__appScope[^)]*)\)\s*\{/g;
  let match;

  while ((match = functionPattern.exec(content)) !== null) {
    const funcName = match[1];
    const startIndex = match.index;

    // 找到函数的结束位置（简单计数 { }）
    let braceCount = 1;
    let endIndex = startIndex + match[0].length;

    while (braceCount > 0 && endIndex < content.length) {
      if (content[endIndex] === '{') braceCount++;
      else if (content[endIndex] === '}') braceCount--;
      endIndex++;
    }

    const functionBody = content.substring(startIndex, endIndex);
    const functionHeader = match[0];

    functions.push({
      name: funcName,
      body: functionBody,
      header: functionHeader,
      startIndex,
      endIndex
    });
  }

  return functions;
}

// 分析单个 factory 函数
function analyzeFactoryFunction(func, fileImports) {
  const destructured = extractFunctionDestructures(func.body);
  const locals = extractLocalDefinitions(func.body);
  const params = extractFunctionParameters(func.header);
  const used = extractUsedIdentifiers(func.body);

  // 找出未定义的变量
  const undefinedVars = [];
  for (const varName of used) {
    // 跳过关键字、内置对象
    if (BUILTINS.has(varName)) continue;
    // 跳过 import 的
    if (fileImports.has(varName)) continue;
    // 跳过解构的
    if (destructured.has(varName)) continue;
    // 跳过局部定义
    if (locals.has(varName)) continue;
    // 跳过参数
    if (params.has(varName)) continue;
    // 跳过 create 函数自身（递归调用）
    if (varName === func.name) continue;
    // 跳过短名称（可能是类型或属性访问）
    if (varName.length <= 2) continue;

    undefinedVars.push(varName);
  }

  return {
    functionName: func.name,
    destructured: destructured.size,
    undefinedVars: [...new Set(undefinedVars)].sort()
  };
}

// 分析单个文件
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (!content.includes('@ts-nocheck')) {
    return null;
  }

  const imports = extractImports(content);
  const factories = parseFactoryFunctions(content);

  const issues = [];
  for (const func of factories) {
    const result = analyzeFactoryFunction(func, imports);
    if (result.undefinedVars.length > 0) {
      issues.push(result);
    }
  }

  return {
    file: path.basename(filePath),
    factoryCount: factories.length,
    issues
  };
}

// 主函数
function main() {
  const files = fs.readdirSync(appExtractedDir)
    .filter(f => (f.endsWith('.tsx') || f.endsWith('.ts')) && f !== 'appStaticScope.ts')
    .map(f => path.join(appExtractedDir, f));

  console.log('🔍 精确排查 factory 函数中 __appScope 解构遗漏...\n');

  let totalIssues = 0;
  const allIssues = [];

  for (const file of files) {
    const result = analyzeFile(file);
    if (result && result.issues.length > 0) {
      console.log(`📄 ${result.file} (${result.factoryCount} 个 factory 函数)`);
      for (const issue of result.issues) {
        console.log(`  ❌ ${issue.functionName}:`);
        console.log(`     解构变量数: ${issue.destructured}`);
        console.log(`     ⚠️  可能未定义 (${issue.undefinedVars.length}): ${issue.undefinedVars.join(', ')}`);
        totalIssues += issue.undefinedVars.length;
        allIssues.push({
          file: result.file,
          function: issue.functionName,
          vars: issue.undefinedVars
        });
      }
      console.log('');
    }
  }

  console.log(`\n📊 统计：发现 ${allIssues.length} 个函数可能存在 ${totalIssues} 个未定义变量`);

  // 输出 JSON 报告
  const reportPath = path.join(__dirname, 'scope-destructure-issues.json');
  fs.writeFileSync(reportPath, JSON.stringify(allIssues, null, 2));
  console.log(`📝 详细报告已保存到: ${reportPath}`);
}

main();
