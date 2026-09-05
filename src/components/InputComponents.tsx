// 缓冲输入组件 — 延迟提交的表单输入控件

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { ColorPicker, Input, Select, Button } from "antd";

const { TextArea } = Input;

/* 颜色输入 */

const HEX_COLOR_INPUT_PATTERN = /^#[0-9a-f]{6}$/i;
const TRANSPARENT_COLOR_VALUE = "transparent";

const isTransparentColorValue = (value: string | undefined) =>
  String(value ?? "").trim().toLowerCase() === TRANSPARENT_COLOR_VALUE;

export const colorInputValue = (value: string, fallback = "#ffffff") =>
  HEX_COLOR_INPUT_PATTERN.test(value) ? value : fallback;

export type DeferredColorInputProps = {
  value: string;
  fallback?: string;
  disabled?: boolean;
  className?: string;
  title?: string;
  "aria-label"?: string;
  onCommit: (value: string) => void;
};

export function DeferredColorInput({
  value,
  fallback = "#ffffff",
  disabled,
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
  const draftRef = useRef(normalizedValue);
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

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    committedRef.current = normalizedCommittedValue;
    draftRef.current = normalizedValue;
    setDraft(normalizedValue);
  }, [normalizedCommittedValue, normalizedValue]);

  return (
    <span className={`deferred-color-input ${transparent ? "transparent" : ""} ${disabled ? "disabled" : ""}`}>
      <ColorPicker
        value={draft}
        disabled={disabled}
        className={className}
        aria-label={ariaLabel}
        onChange={(color) => handleColorChange(color)}
        onChangeComplete={(color) => handleColorChange(color)}
      />
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
  const normalizedValue = String(value ?? "");
  const [draftValue, setDraftValue] = useState(normalizedValue);
  const committedValueRef = useRef(normalizedValue);
  const onCommitRef = useRef(onCommit);

  const commitValue = (nextValue: string) => {
    if (disabled) {
      return;
    }
    if (nextValue !== committedValueRef.current) {
      committedValueRef.current = nextValue;
      onCommitRef.current(nextValue);
    }
  };

  const commitDraft = () => commitValue(draftValue);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    committedValueRef.current = normalizedValue;
    setDraftValue(normalizedValue);
  }, [normalizedValue]);

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
          setDraftValue(committedValueRef.current);
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

  const optionList = options?.map((option) => ({
    value: String(option.value),
    label: option.label ?? String(option.value),
    disabled: option.disabled
  }));
  const currentOption = optionList?.find((option) => option.value === normalizedValue);
  const shownValue = displayValue ?? currentOption?.label ?? normalizedValue;
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
        data-inline-option-values={optionList?.map((option) => option.value).join("|")}
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

  if (optionList && optionList.length > 0) {
    return (
      <Select
        className={`${sharedClassName} editor`}
        value={normalizedValue}
        open={selectOpen}
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
  const normalizedValue = String(value ?? "");
  const [draftValue, setDraftValue] = useState(normalizedValue);
  const committedValueRef = useRef(normalizedValue);
  const onCommitRef = useRef(onCommit);

  const commitValue = (nextValue: string) => {
    if (disabled) {
      return;
    }
    if (nextValue !== committedValueRef.current) {
      committedValueRef.current = nextValue;
      onCommitRef.current(nextValue);
    }
  };

  const commitDraft = () => commitValue(draftValue);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    committedValueRef.current = normalizedValue;
    setDraftValue(normalizedValue);
  }, [normalizedValue]);

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
          setDraftValue(committedValueRef.current);
          (event.target as HTMLTextAreaElement).blur();
        }
      }}
    />
  );
}
