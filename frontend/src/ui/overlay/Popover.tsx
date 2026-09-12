import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { OverlayPortal, useOverlayRegistration, useOverlayZIndex } from "./OverlaySystem";
import { useAnchoredPosition } from "./useAnchoredPosition";

type PopoverProps = {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
};

export function Popover({ label, trigger, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { surfaceRef, placement, style } = useAnchoredPosition(anchorRef, open, "down", 260);
  const zIndex = useOverlayZIndex(25);
  useOverlayRegistration(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || surfaceRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [open, surfaceRef]);

  return (
    <>
      <button ref={anchorRef} className="sm-inline-trigger" type="button" onClick={() => setOpen((value) => !value)}>
        {trigger}
      </button>
      {open && (
        <OverlayPortal>
          <div
            ref={surfaceRef}
            className="sm-popover sm-overlay-surface"
            style={{ ...style, ...zIndex }}
            role="dialog"
            aria-label={label}
            data-placement={placement}
          >
            {children}
          </div>
        </OverlayPortal>
      )}
    </>
  );
}
