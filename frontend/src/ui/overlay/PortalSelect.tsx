import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  OverlayPortal,
  useOverlayRegistration,
  useOverlayZIndex,
} from "./OverlaySystem";
import { useAnchoredPosition } from "./useAnchoredPosition";

export type PortalSelectOption = {
  value: string;
  label: string;
  detail?: string;
};

type PortalSelectProps = {
  value: string;
  options: PortalSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  testId?: string;
};

export function PortalSelect({ value, options, onChange, ariaLabel, testId }: PortalSelectProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { surfaceRef, placement, style } = useAnchoredPosition(anchorRef, open);
  const zIndex = useOverlayZIndex(20);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useOverlayRegistration(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || surfaceRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open, surfaceRef]);

  return (
    <>
      <button
        ref={anchorRef}
        className={`sm-select-trigger ${open ? "is-open" : ""}`}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid={testId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <OverlayPortal>
          <div
            ref={surfaceRef}
            className="sm-select-menu sm-overlay-surface"
            style={{ ...style, ...zIndex }}
            role="listbox"
            aria-label={`${ariaLabel}选项`}
            data-placement={placement}
            data-testid={testId ? `${testId}-menu` : undefined}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span>
                {option.value === value && <Check size={14} />}
              </button>
            ))}
          </div>
        </OverlayPortal>
      )}
    </>
  );
}
