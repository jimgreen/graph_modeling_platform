import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { clampNumber } from "../canvasViewport";
import type { ModelLayer } from "../model";

/* 常量 */

const STATIC_BUTTON_LAYER_DROPDOWN_VIEWPORT_MARGIN = 12;
const STATIC_BUTTON_LAYER_DROPDOWN_MAX_HEIGHT = 180;
const STATIC_BUTTON_LAYER_DROPDOWN_MIN_HEIGHT = 96;

/* 类型 */

type StaticButtonLayerDropdownPlacement = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

export type StaticButtonLayerMultiSelectProps = {
  ariaLabel: string;
  className?: string;
  disabled: boolean;
  layers: ModelLayer[];
  selectedLayerIds: string[];
  selectedLayerSummary: string;
  selectedLayerTitle: string;
  onChange: (layerIds: string[]) => void;
};

/* 辅助函数 */

function staticButtonLayerDropdownPlacementForTrigger(trigger: HTMLElement): StaticButtonLayerDropdownPlacement {
  const rect = trigger.getBoundingClientRect();
  const viewportMargin = STATIC_BUTTON_LAYER_DROPDOWN_VIEWPORT_MARGIN;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || rect.right;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || rect.bottom;
  const width = Math.min(rect.width, Math.max(0, viewportWidth - viewportMargin * 2));
  const left = clampNumber(rect.left, viewportMargin, Math.max(viewportMargin, viewportWidth - width - viewportMargin));
  const belowTop = rect.bottom + 4;
  const aboveBottom = rect.top - 4;
  const availableBelow = Math.max(0, viewportHeight - belowTop - viewportMargin);
  const availableAbove = Math.max(0, aboveBottom - viewportMargin);
  const openAbove = availableBelow < STATIC_BUTTON_LAYER_DROPDOWN_MIN_HEIGHT && availableAbove > availableBelow;
  const availableHeight = openAbove ? availableAbove : availableBelow;
  const maxHeight = Math.max(40, Math.min(STATIC_BUTTON_LAYER_DROPDOWN_MAX_HEIGHT, availableHeight));
  const top = openAbove
    ? Math.max(viewportMargin, aboveBottom - maxHeight)
    : Math.min(belowTop, Math.max(viewportMargin, viewportHeight - viewportMargin - maxHeight));
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    maxHeight: Math.round(maxHeight)
  };
}

/* 组件 */

export function StaticButtonLayerMultiSelect({
  ariaLabel,
  className = "",
  disabled,
  layers,
  selectedLayerIds,
  selectedLayerSummary,
  selectedLayerTitle,
  onChange
}: StaticButtonLayerMultiSelectProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<StaticButtonLayerDropdownPlacement | null>(null);
  const selectedLayerIdSet = useMemo(() => new Set(selectedLayerIds), [selectedLayerIds]);

  const updatePlacement = useCallback(() => {
    const trigger = triggerRef.current;
    if (trigger) {
      setPlacement(staticButtonLayerDropdownPlacementForTrigger(trigger));
    }
  }, []);

  useLayoutEffect(() => {
    if (open) {
      updatePlacement();
    }
  }, [open, selectedLayerSummary, layers.length, updatePlacement]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeOnOutsidePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (triggerRef.current?.contains(target) || menuRef.current?.contains(target))
      ) {
        return;
      }
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    let frameId = 0;
    const schedulePositionUpdate = () => {
      if (frameId !== 0) {
        return;
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updatePlacement();
      });
    };
    window.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    window.addEventListener("keydown", closeOnEscape, true);
    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, true);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointerDown, true);
      window.removeEventListener("keydown", closeOnEscape, true);
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [open, updatePlacement]);

  useEffect(() => {
    if (disabled && open) {
      setOpen(false);
    }
  }, [disabled, open]);

  const toggleLayer = useCallback((layerId: string, checked: boolean) => {
    const nextLayerIds = new Set(selectedLayerIds);
    if (checked) {
      nextLayerIds.add(layerId);
    } else {
      nextLayerIds.delete(layerId);
    }
    onChange(layers.filter((layer) => nextLayerIds.has(layer.id)).map((layer) => layer.id));
  }, [layers, onChange, selectedLayerIds]);

  const menuStyle: CSSProperties | undefined = placement
    ? {
        left: placement.left,
        top: placement.top,
        width: placement.width,
        maxHeight: placement.maxHeight
      }
    : undefined;

  return (
    <div className={`static-button-layer-dropdown ${open ? "open" : ""} ${className} ${disabled ? "disabled" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="static-button-layer-dropdown-trigger"
        aria-label={`${ariaLabel}：${selectedLayerTitle || selectedLayerSummary}`}
        aria-disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          if (disabled) {
            return;
          }
          updatePlacement();
          setOpen((current) => !current);
        }}
      >
        <span>{selectedLayerSummary}</span>
      </button>
      {open && createPortal(
        <div ref={menuRef} className="static-button-layer-dropdown-menu" style={menuStyle} role="menu" aria-label={ariaLabel}>
          {layers.map((layer) => (
            <label key={layer.id} className="static-button-layer-option">
              <input
                type="checkbox"
                checked={selectedLayerIdSet.has(layer.id)}
                disabled={disabled}
                onChange={(event) => toggleLayer(layer.id, event.target.checked)}
              />
              <span>{layer.name}</span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export type TextStyleToggleButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
};

export function TextStyleToggleButton({ active, label, onClick, children }: TextStyleToggleButtonProps) {
  return (
    <button
      type="button"
      className="text-style-toggle-button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
