import { memo, type ReactNode } from "react";

/**
 * 视图分段的**公共部分**：section 供比较器定位，inputs 供「数据不变就不重渲」判定。
 *
 * 这一层必须单独拆出来，否则比较器的形参类型会把「用 render 渲染内容」也变成硬要求 ——
 * 而四个分段对话框（AppContextMenus / AppProjectDialogs / AppCanvasDialogs /
 * AppDeviceDefinitionDialogs）根本不收 render，它们的数据入口是 scope。
 * 曾经两者共用一个 ViewSectionProps，结果调用点每传一个 scope 就报一次「缺 render」。
 */
export type ViewSectionInputs = {
  inputs: readonly unknown[];
  section: string;
};

/** MemoizedViewSection 的 props：在公共部分之外再加一个 render。 */
export type ViewSectionProps = ViewSectionInputs & {
  render: () => ReactNode;
};

export function areViewSectionPropsEqual(
  previous: ViewSectionInputs,
  next: ViewSectionInputs
) {
  if (previous.section !== next.section || previous.inputs.length !== next.inputs.length) {
    return false;
  }
  for (let index = 0; index < previous.inputs.length; index += 1) {
    if (!Object.is(previous.inputs[index], next.inputs[index])) {
      return false;
    }
  }
  return true;
}

/**
 * A section-level render boundary. The render callback deliberately is not a
 * comparison input: when the declared data inputs stay stable, React keeps the
 * previously committed section instead of reconstructing its JSX tree.
 */
export const MemoizedViewSection = memo(function ViewSection({ render }: ViewSectionProps) {
  return render();
}, areViewSectionPropsEqual);
