// 缓冲输入组件 — 延迟提交的表单输入控件

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from "react";

/* 颜色输入 */

const HEX_COLOR_INPUT_PATTERN = /^#[0-9a-f]{6}$/i;

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
  const normalizedValue = colorInputValue(value, fallback);
  const [draft, setDraft] = useState(normalizedValue);
  const draftRef = useRef(normalizedValue);
  const committedRef = useRef(normalizedValue);
  const onCommitRef = useRef(onCommit);

  const commitDraft = (nextValue: string) => {
    const nextColor = colorInputValue(nextValue, normalizedValue);
    draftRef.current = nextColor;
    setDraft(nextColor);
    if (nextColor !== committedRef.current) {
      committedRef.current = nextColor;
      onCommitRef.current(nextColor);
    }
  };

  const queueDraftCommit = (event: { currentTarget: HTMLInputElement }) => {
    const nextValue = event.currentTarget.value;
    if (!disabled) {
      commitDraft(nextValue);
      return;
    }
    draftRef.current = nextValue;
    setDraft(nextValue);
  };

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    committedRef.current = normalizedValue;
    draftRef.current = normalizedValue;
    setDraft(normalizedValue);
  }, [normalizedValue]);

  return (
    <input
      type="color"
      value={draft}
      disabled={disabled}
      className={className}
      title={title}
      aria-label={ariaLabel}
      onInput={queueDraftCommit}
      onChange={queueDraftCommit}
      onBlur={() => commitDraft(draftRef.current)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commitDraft(event.currentTarget.value);
        } else if (event.key === "Escape") {
          draftRef.current = committedRef.current;
          setDraft(committedRef.current);
        }
      }}
    />
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
