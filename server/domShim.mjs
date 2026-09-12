// Node 侧浏览器 API 桩：src/model.ts 的 readVoltageLevelSettings 读 localStorage。
// 必须在任何 src/**/*.ts 被 import 之前执行（函数级访问，模块顶层调用 installDomShim() 即可）。
// Node 进程默认无 NODE_ENV，React 会加载 development 构建：服务端 SVG 渲染实测慢约 45%，
// 且产出字节与 production 完全一致（已比对 sha256）。本模块是三个适配层的第一个静态 import，
// 此处置位早于所有 src/**/*.ts 的动态加载；??= 不覆盖 vitest（NODE_ENV=test）等已显式设定的环境。
process.env.NODE_ENV ??= "production";

const memory = new Map();

export function installDomShim() {
  if (globalThis.localStorage) {
    return;
  }
  globalThis.localStorage = {
    getItem: (key) => (memory.has(String(key)) ? memory.get(String(key)) : null),
    setItem: (key, value) => {
      memory.set(String(key), String(value));
    },
    removeItem: (key) => {
      memory.delete(String(key));
    },
    clear: () => {
      memory.clear();
    },
    key: (index) => [...memory.keys()][Number(index)] ?? null,
    get length() {
      return memory.size;
    }
  };
}
