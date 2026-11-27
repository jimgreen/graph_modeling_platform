// 缓冲输入组件 — 延迟提交的表单输入控件

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { ColorPicker, Input, Select, Button, type ColorPickerProps } from "antd";

const { TextArea } = Input;

/* 颜色输入 */

const HEX_COLOR_INPUT_PATTERN = /^#[0-9a-f]{6}$/i;
const TRANSPARENT_COLOR_VALUE = "transparent";

const isTransparentColorValue = (value: string | undefined) =>
  String(value ?? "").trim().toLowerCase() === TRANSPARENT_COLOR_VALUE;

export const colorInputValue = (value: string, fallback = "#ffffff") =>
  HEX_COLOR_INPUT_PATTERN.test(value) ? value : fallback;

const hexColorToCssRgb = (hex: string): string => {
  if (!HEX_COLOR_INPUT_PATTERN.test(hex)) {
    return hex;
  }
  const packed = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(packed >> 16) & 255},${(packed >> 8) & 255},${packed & 255})`;
};

const joinInlineOptionValues = (options: readonly InlineEditableValueOption[] | undefined): string | undefined => {
  if (!options || options.length === 0) {
    return undefined;
  }
  let out = String(options[0].value);
  for (let i = 1; i < options.length; i += 1) {
    out += `|${String(options[i].value)}`;
  }
  return out;
};

export type DeferredColorInputProps = {
  value: string;
  fallback?: string;
  disabled?: boolean;
  modified?: boolean;
  className?: string;
  title?: string;
  "aria-label"?: string;
  onCommit: (value: string) => void;
};

export function DeferredColorInput({
  value,
  fallback = "#ffffff",
  disabled,
  modified,
  className,
  title,
  "aria-label": ariaLabel,
  onCommit
}: DeferredColorInputProps) {
  const normalizedFallback = colorInputValue(fallback, "#ffffff");
  const normalizedValue = colorInputValue(value, normalizedFallback);
  const transparent = isTransparentColorValue(value);
  const normalizedCommittedValue = transparent ? TRANSPARENT_COLOR_VALUE : normalizedValue;
  const [draft, setDraft] = useState(normalizedValue);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerColor, setPickerColor] = useState<ColorPickerProps["value"]>(normalizedValue);
  const draftRef = useRef(normalizedValue);
  const pickerColorRef = useRef<ColorPickerProps["value"]>(normalizedValue);
  const committedRef = useRef(normalizedCommittedValue);
  const onCommitRef = useRef(onCommit);
  const previousColorRef = useRef<string | null>(null);

  const commitColor = (nextValue: string) => {
    const nextColor = colorInputValue(nextValue, normalizedFallback);
    draftRef.current = nextColor;
    setDraft(nextColor);
    if (nextColor !== committedRef.current) {
      committedRef.current = nextColor;
      onCommitRef.current(nextColor);
    }
  };

  const commitTransparent = () => {
    if (disabled) {
      return;
    }
    if (committedRef.current === TRANSPARENT_COLOR_VALUE) {
      // Restore previous color
      if (previousColorRef.current) {
        const restoreColor = previousColorRef.current;
        previousColorRef.current = null;
        commitColor(restoreColor);
      }
    } else {
      // Save current color and set to transparent
      previousColorRef.current = committedRef.current;
      committedRef.current = TRANSPARENT_COLOR_VALUE;
      onCommitRef.current(TRANSPARENT_COLOR_VALUE);
    }
  };

  const handleColorChange = (color: unknown, hex?: string) => {
    if (!disabled) {
      const colorObject = color as { toHexString?: () => string } | null | undefined;
      const nextColor = typeof hex === "string" && hex.trim()
        ? hex
        : typeof colorObject?.toHexString === "function"
          ? colorObject.toHexString()
          : String(color ?? "");
      commitColor(nextColor);
    }
  };

  /** 弹窗内拖动/选色仅更新本地高精度草稿，不触发外部提交与画布重绘。 */
  const handlePickerDraftChange = (color: ColorPickerProps["value"]) => {
    if (disabled) {
      return;
    }
    pickerColorRef.current = color;
    setPickerColor(color);
  };

  const handlePickerOpenChange = (nextOpen: boolean) => {
    if (disabled && nextOpen) {
      return;
    }
    if (nextOpen) {
      pickerColorRef.current = draftRef.current;
      setPickerColor(draftRef.current);
      setPickerOpen(true);
    } else {
      pickerColorRef.current = draftRef.current;
      setPickerColor(draftRef.current);
      setPickerOpen(false);
    }
  };

  const handlePickerCancel = () => {
    pickerColorRef.current = draftRef.current;
    setPickerColor(draftRef.current);
    setPickerOpen(false);
  };

  const handlePickerConfirm = () => {
    handleColorChange(pickerColorRef.current);
    setPickerOpen(false);
  };

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    committedRef.current = normalizedCommittedValue;
    draftRef.current = normalizedValue;
    setDraft(normalizedValue);
    if (!pickerOpen) {
      pickerColorRef.current = normalizedValue;
      setPickerColor(normalizedValue);
    }
  }, [normalizedCommittedValue, normalizedValue, pickerOpen]);

  return (
    <span
      className={`deferred-color-input ${transparent ? "transparent" : ""} ${disabled ? "disabled" : ""} ${modified ? "modified" : ""} ${pickerOpen ? "picker-open" : ""}`}
      data-modified={modified ? "true" : undefined}
      style={{ "--deferred-committed-color": draft } as CSSProperties}
    >
      {pickerOpen ? (
        <ColorPicker
          value={pickerColor}
          open={pickerOpen}
          disabled={disabled}
          disabledAlpha
          className={className}
          aria-label={ariaLabel}
          onOpenChange={handlePickerOpenChange}
          onChange={handlePickerDraftChange}
          panelRender={(panel) => (
            <div className="deferred-color-picker-panel">
              {panel}
              <div className="deferred-color-picker-footer">
                <button
                  type="button"
                  className="deferred-color-picker-cancel"
                  onClick={handlePickerCancel}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="deferred-color-picker-confirm"
                  onClick={handlePickerConfirm}
                >
                  确认
                </button>
              </div>
            </div>
          )}
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          title={title}
          aria-label={ariaLabel}
          className={[
            "ant-color-picker-trigger",
            "deferred-color-swatch-trigger",
            disabled ? "ant-color-picker-trigger-disabled" : "",
            className
          ].filter(Boolean).join(" ")}
          onClick={() => handlePickerOpenChange(true)}
        >
          <span className="ant-color-picker-color-block">
            <span
              className="ant-color-picker-color-block-inner"
              style={{ background: hexColorToCssRgb(draft) }}
            />
          </span>
        </button>
      )}
      <button
        type="button"
        className="deferred-color-transparent-button"
        disabled={disabled}
        title="设置为透明色"
        aria-label={ariaLabel ? `${ariaLabel}设为透明色` : "设置为透明色"}
        aria-pressed={transparent}
        onClick={commitTransparent}
      >
        无
      </button>
    </span>
  );
}

/* 缓冲文本输入 */

/* 缓冲提交的共享内核 */

/**
 * 「缓冲提交」的状态机：编辑期间只改本地草稿，失焦/提交键才回调 onCommit。
 *
 * BufferedTextInput 与 BufferedTextarea 曾各存一份 ~30 行的逐行相同实现
 * （唯一差别是提交键：单行 Enter、多行 Ctrl/Cmd+Enter）。改一处判定漏另一处，
 * 两者的行为就会分叉 —— 而它们本该完全一致。
 *
 * `shouldCommit` 由调用方给，把「按哪个键算提交」这一条差异留在薄壳里。
 */
function useBufferedCommit<T extends HTMLElement>(
  value: string | number,
  disabled: boolean | undefined,
  onCommit: (value: string) => void,
  shouldCommit: (event: ReactKeyboardEvent<T>) => boolean
) {
  const normalizedValue = String(value ?? "");
  const [draftValue, setDraftValue] = useState(normalizedValue);
  const committedValueRef = useRef(normalizedValue);
  const onCommitRef = useRef(onCommit);

  /**
   * Escape 的 revertDraft() 与紧随其后的 blur() 在**同一个同步块**里。
   *
   * blur() 会立刻派发 onBlur，而 setState 是批处理的 —— 那一刻组件还没重渲染，
   * onBlur 拿到的仍是回退前那次渲染的闭包，其中 draftValue 还是用户刚敲的字。
   * 于是 commitValue 里的去重判定 `nextValue !== committedValueRef.current` 成立，
   * 「按取消」实际变成了「提交」。
   *
   * 标志位只吞掉这一次 blur 的提交，并在当前同步块结束后的 microtask 里自动放开：
   * 必须自动放开而不是靠「下一次 blur 消费」，因为调用方的 onKeyDown 会**先**于本组件
   * 的判定执行，它可以自己把输入框 blur 掉而 preventDefault；那样 revertDraft 设的标志
   * 就等不到随后的 blur 来消费，会把用户之后正常编辑后的一次真实提交也吞掉。
   */
  const revertingRef = useRef(false);

  const commitValue = (nextValue: string) => {
    if (disabled) {
      return;
    }
    if (nextValue !== committedValueRef.current) {
      committedValueRef.current = nextValue;
      onCommitRef.current(nextValue);
    }
  };

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    committedValueRef.current = normalizedValue;
    setDraftValue(normalizedValue);
  }, [normalizedValue]);

  return {
    draftValue,
    setDraftValue,
    commitValue,
    commitDraft: () => {
      if (revertingRef.current) {
        return;
      }
      commitValue(draftValue);
    },
    revertDraft: () => {
      revertingRef.current = true;
      setDraftValue(committedValueRef.current);
      queueMicrotask(() => {
        revertingRef.current = false;
      });
    }
  };
}

export type BufferedTextInputProps = {
  value: string | number;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  id?: string;
  name?: string;
  type?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  list?: string;
  placeholder?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  title?: string;
  autoFocus?: boolean;
  style?: CSSProperties;
  "aria-label"?: string;
  onClick?: (event: MouseEvent<HTMLInputElement>) => void;
  onDoubleClick?: (event: MouseEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  suffix?: ReactNode;
  onCommit: (value: string) => void;
};

export function BufferedTextInput({
  value,
  disabled,
  onCommit,
  ...inputProps
}: BufferedTextInputProps) {
  const { draftValue, setDraftValue, commitValue, commitDraft, revertDraft } = useBufferedCommit<HTMLInputElement>(
    value,
    disabled,
    onCommit,
    (event) => event.key === "Enter"
  );

  return (
    <Input
      {...inputProps}
      value={draftValue}
      disabled={disabled}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        inputProps.onKeyDown?.(event as any);
        if (event.defaultPrevented) {
          return;
        }
        if (event.key === "Enter") {
          commitValue((event.target as HTMLInputElement).value);
          (event.target as HTMLInputElement).blur();
        } else if (event.key === "Escape") {
          revertDraft();
          (event.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

/* 属性表的行内编辑器：浏览态显示文本，点击后才进入输入/下拉状态。 */
export type InlineEditableValueOption = {
  value: string;
  label?: ReactNode;
  disabled?: boolean;
};

export type InlineEditableValueProps = {
  value: string | number;
  displayValue?: ReactNode;
  options?: readonly InlineEditableValueOption[];
  /** Whether the value differs from the last persisted value. */
  modified?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  title?: string;
  "aria-label"?: string;
  onCommit: (value: string) => void;
};

export function InlineEditableValue({
  value,
  displayValue,
  options,
  modified,
  disabled,
  readOnly,
  className,
  type,
  multiline,
  rows,
  min,
  max,
  step,
  title,
  "aria-label": ariaLabel,
  onCommit
}: InlineEditableValueProps) {
  const normalizedValue = String(value ?? "");
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(normalizedValue);
  const [selectOpen, setSelectOpen] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraftValue(normalizedValue);
    }
  }, [editing, normalizedValue]);

  const activate = () => {
    if (disabled || readOnly) {
      return;
    }
    setDraftValue(normalizedValue);
    setEditing(true);
    setSelectOpen(Boolean(options?.length));
  };

  const commitText = () => {
    onCommit(draftValue);
    setEditing(false);
  };

  const cancelText = () => {
    setDraftValue(normalizedValue);
    setEditing(false);
  };

  const currentOption = options?.find((option) => String(option.value) === normalizedValue);
  const shownValue =
    displayValue ??
    (currentOption ? currentOption.label ?? String(currentOption.value) : undefined) ??
    normalizedValue;
  const sharedClassName = [
    "inline-property-value",
    modified ? "modified" : "",
    className
  ].filter(Boolean).join(" ");
  const modifiedAttributes = modified ? { "data-modified": "true" as const } : {};

  if (disabled || readOnly) {
    return <span {...modifiedAttributes} className={`${sharedClassName} read-only`} title={title} aria-label={ariaLabel}>{shownValue || "\u00a0"}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={sharedClassName}
        title={title}
        aria-label={ariaLabel}
        {...modifiedAttributes}
        data-inline-option-values={joinInlineOptionValues(options)}
        onClick={activate}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        }}
      >
        {shownValue || "\u00a0"}
      </button>
    );
  }

  const optionList = options?.map((option) => ({
    value: String(option.value),
    label: option.label ?? String(option.value),
    disabled: option.disabled
  }));

  if (optionList && optionList.length > 0) {
    return (
      <Select
        className={`${sharedClassName} editor`}
        value={normalizedValue}
        open={selectOpen}
        popupMatchSelectWidth={false}
        autoFocus
        title={title}
        aria-label={ariaLabel}
        {...modifiedAttributes}
        options={optionList}
        onChange={(nextValue) => {
          onCommit(String(nextValue ?? ""));
          setSelectOpen(false);
          setEditing(false);
        }}
        onOpenChange={(open) => {
          setSelectOpen(open);
          if (!open) {
            setEditing(false);
          }
        }}
      />
    );
  }

  const inputProps = {
    className: `${sharedClassName} editor`,
    autoFocus: true,
    value: draftValue,
    title,
    "aria-label": ariaLabel,
    ...modifiedAttributes,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraftValue(event.target.value),
    onBlur: commitText,
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !multiline) {
        event.preventDefault();
        commitText();
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancelText();
      }
    }
  };
  return multiline ? (
    <TextArea {...inputProps} rows={rows ?? 4} />
  ) : (
    <Input {...inputProps} type={type} min={min} max={max} step={step} />
  );
}

/* 缓冲文本域 */

export type BufferedTextareaProps = {
  value: string | number;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  id?: string;
  name?: string;
  rows?: number;
  placeholder?: string;
  spellCheck?: boolean;
  autoFocus?: boolean;
  style?: CSSProperties;
  "aria-label"?: string;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onCommit: (value: string) => void;
};

export function BufferedTextarea({
  value,
  disabled,
  onCommit,
  ...textareaProps
}: BufferedTextareaProps) {
  const { draftValue, setDraftValue, commitValue, commitDraft, revertDraft } = useBufferedCommit<HTMLTextAreaElement>(
    value,
    disabled,
    onCommit,
    (event) => (event.ctrlKey || event.metaKey) && event.key === "Enter"
  );

  return (
    <TextArea
      {...textareaProps}
      value={draftValue}
      disabled={disabled}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        textareaProps.onKeyDown?.(event as any);
        if (event.defaultPrevented) {
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          commitValue((event.target as HTMLTextAreaElement).value);
          (event.target as HTMLTextAreaElement).blur();
        } else if (event.key === "Escape") {
          revertDraft();
          (event.target as HTMLTextAreaElement).blur();
        }
      }}
    />
  );
}
