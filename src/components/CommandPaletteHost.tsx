/**
 * CommandPaletteHost - 零开销订阅宿主组件
 *
 * 订阅 commandPaletteStore：
 * - 关闭状态返回 null，不加载懒加载 chunk、不挂载任何 DOM；
 * - 打开时才按需加载 CommandPaletteDialog 并读取当帧最新 __appScope。
 */
import { lazy, Suspense } from "react";
import { useCommandPaletteState } from "../commandPaletteStore";

const LazyCommandPaletteDialog = lazy(() => import("./CommandPaletteDialog"));

export function CommandPaletteHost({ scope }: { scope: Record<string, any> }) {
  const { open, tab } = useCommandPaletteState();
  if (!open) {
    return null;
  }
  const latestScope = (scope?.__appScopeRef?.current as Record<string, any> | undefined) ?? scope;
  return (
    <Suspense fallback={null}>
      <LazyCommandPaletteDialog scope={latestScope} tab={tab} />
    </Suspense>
  );
}
