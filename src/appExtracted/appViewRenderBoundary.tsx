import { memo, type ReactNode } from "react";

export type ViewSectionProps = {
  inputs: readonly unknown[];
  render: () => ReactNode;
  section: string;
};

export function areViewSectionPropsEqual(
  previous: ViewSectionProps,
  next: ViewSectionProps
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
