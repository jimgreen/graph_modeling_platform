import type { ButtonHTMLAttributes } from "react";
import { X } from "lucide-react";

export type WindowCloseButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> & {
  label?: string;
};

export function WindowCloseButton({
  label = "关闭窗口",
  className = "",
  title = "关闭",
  ...buttonProps
}: WindowCloseButtonProps) {
  return (
    <button
      {...buttonProps}
      type="button"
      className={`window-close-button${className ? ` ${className}` : ""}`}
      aria-label={buttonProps["aria-label"] ?? label}
      title={title}
    >
      <X size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
