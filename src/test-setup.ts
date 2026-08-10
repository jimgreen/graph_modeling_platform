// vitest 测试环境全局桩
if (typeof (globalThis as any).showGlobalMessage !== "function") {
  (globalThis as any).showGlobalMessage = () => {};
}
if (typeof (globalThis as any).showGlobalConfirm !== "function") {
  (globalThis as any).showGlobalConfirm = () => Promise.resolve(true);
}
