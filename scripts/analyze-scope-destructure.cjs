// @ts-check
/**
 * 排查 appExtracted 目录下 @ts-nocheck 文件中可能的 ReferenceError
 * 策略：找出文件中使用的变量，对比从 scope 解构的变量列表，找出差异
 */

const fs = require('fs');
const path = require('path');

const appExtractedDir = path.join(__dirname, '../src/appExtracted');

// 从文件中提取解构列表中的变量名
function extractDestructuredVars(content) {
  const vars = new Set();

  // 匹配 } = scope 或 } = __appScope 的模式
  const destructurePattern = /const\s*\{([^}]+)\}\s*=\s*(?:scope|__appScope)/g;
  let match;
  while ((match = destructurePattern.exec(content)) !== null) {
    const destructureContent = match[1];
    // 提取变量名（处理别名如 oldName: newName）
    const varPattern = /(\w+)(?:\s*:\s*(\w+))?/g;
    let varMatch;
    while ((varMatch = varPattern.exec(destructureContent)) !== null) {
      const varName = varMatch[2] || varMatch[1]; // 如果有别名，用别名
      vars.add(varName);
    }
  }

  return vars;
}

// 提取文件中使用的变量（简单启发式）
function extractUsedVars(content) {
  const vars = new Set();

  // 移除注释和字符串
  let cleanContent = content
    .replace(/\/\/.*$/gm, '') // 单行注释
    .replace(/\/\*[\s\S]*?\*\//g, '') // 多行注释
    .replace(/'[^']*'/g, '""') // 单引号字符串
    .replace(/"[^"]*"/g, '""') // 双引号字符串
    .replace(/`[^`]*`/g, '""'); // 模板字符串

  // 匹配标识符使用
  // 排除关键字和常见内置对象
  const keywords = new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends',
    'import', 'export', 'from', 'default', 'typeof', 'instanceof', 'void', 'delete',
    'true', 'false', 'null', 'undefined', 'try', 'catch', 'finally', 'throw',
    'async', 'await', 'yield', 'of', 'in', 'as', 'is', 'keyof', 'readonly',
    'interface', 'type', 'enum', 'namespace', 'module', 'declare', 'abstract',
    'implements', 'extends', 'private', 'protected', 'public', 'static', 'super',
    'constructor', 'get', 'set', 'memo', 'React', 'console', 'Math', 'Date',
    'Array', 'Object', 'String', 'Number', 'Boolean', 'Promise', 'Error',
    'window', 'document', 'navigator', 'location', 'history', 'localStorage',
    'sessionStorage', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    'fetch', 'URL', 'JSON', 'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet',
    'Symbol', 'Proxy', 'Reflect', 'Intl', 'Atomics', 'DataView', 'Float32Array',
    'Float64Array', 'Int8Array', 'Int16Array', 'Int32Array', 'Uint8Array',
    'Uint16Array', 'Uint32Array', 'BigInt64Array', 'BigUint64Array'
  ]);

  // 简单匹配标识符
  const identifierPattern = /\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;
  let match;
  while ((match = identifierPattern.exec(cleanContent)) !== null) {
    const name = match[1];
    if (!keywords.has(name) && name.length > 1) {
      vars.add(name);
    }
  }

  return vars;
}

// 分析单个文件
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (!content.includes('@ts-nocheck')) {
    return null;
  }

  const destructured = extractDestructuredVars(content);
  const used = extractUsedVars(content);

  // 找出在文件中使用但不在解构列表中的变量
  const potentiallyUndefined = [];
  for (const varName of used) {
    if (!destructured.has(varName)) {
      potentiallyUndefined.push(varName);
    }
  }

  return {
    file: path.basename(filePath),
    destructuredCount: destructured.size,
    usedCount: used.size,
    potentiallyUndefined: potentiallyUndefined.sort()
  };
}

// 主函数
function main() {
  const files = fs.readdirSync(appExtractedDir)
    .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
    .map(f => path.join(appExtractedDir, f));

  console.log('排查 appExtracted 目录下可能的 ReferenceError...\n');

  for (const file of files) {
    const result = analyzeFile(file);
    if (result && result.potentiallyUndefined.length > 0) {
      console.log(`📄 ${result.file}`);
      console.log(`   解构变量数: ${result.destructuredCount}`);
      console.log(`   使用的变量数: ${result.usedCount}`);
      console.log(`   ⚠️  可能未定义的变量 (${result.potentiallyUndefined.length}):`);
      // 只显示前20个，避免输出过长
      const show = result.potentiallyUndefined.slice(0, 20);
      show.forEach(v => console.log(`      - ${v}`));
      if (result.potentiallyUndefined.length > 20) {
        console.log(`      ... 还有 ${result.potentiallyUndefined.length - 20} 个`);
      }
      console.log('');
    }
  }
}

main();
