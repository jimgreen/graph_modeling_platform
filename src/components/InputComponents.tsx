// 缓冲输入组件 — 延迟提交的表单输入控件

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from "react";

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
      return;
    }
    committedRef.current = TRANSPARENT_COLOR_VALUE;
    onCommitRef.current(TRANSPARENT_COLOR_VALUE);
  };

  const queueDraftCommit = (event: { currentTarget: HTMLInputElement }) => {
    const nextValue = event.currentTarget.value;
    if (!disabled) {
      commitColor(nextValue);
      return;
    }
    draftRef.current = nextValue;
    setDraft(nextValue);
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
      <input
        type="color"
        value={draft}
        disabled={disabled}
        className={className}
        title={transparent ? "当前为透明色，选择颜色可恢复为实色" : title}
        aria-label={ariaLabel}
        onInput={queueDraftCommit}
        onChange={queueDraftCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitColor(event.currentTarget.value);
          } else if (event.key === "Escape") {
            const restoredValue = committedRef.current === TRANSPARENT_COLOR_VALUE ? normalizedValue : committedRef.current;
            draftRef.current = restoredValue;
            setDraft(restoredValue);
          }
        }}
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
    <input
      {...inputProps}
      value={draftValue}
      disabled={disabled}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        inputProps.onKeyDown?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (event.key === "Enter") {
          commitValue(event.currentTarget.value);
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setDraftValue(committedValueRef.current);
          event.currentTarget.blur();
        }
      }}
    />
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
    <textarea
      {...textareaProps}
      value={draftValue}
      disabled={disabled}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        textareaProps.onKeyDown?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          commitValue(event.currentTarget.value);
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setDraftValue(committedValueRef.current);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
