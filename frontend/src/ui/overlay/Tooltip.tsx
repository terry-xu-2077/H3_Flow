import type { ReactNode } from "react";
import { useId, useRef, useState } from "react";

import { OverlayPortal, useOverlayZIndex } from "./OverlaySystem";
import { useAnchoredPosition } from "./useAnchoredPosition";

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const { surfaceRef, placement, style } = useAnchoredPosition(anchorRef, open, "up", 80);
  const zIndex = useOverlayZIndex(40);

  return (
    <>
      <span
        ref={anchorRef}
        className="sm-tooltip-anchor"
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {open && (
        <OverlayPortal>
          <div
            ref={surfaceRef}
            id={id}
            className="sm-tooltip sm-overlay-surface"
            style={{ ...style, ...zIndex }}
            role="tooltip"
            data-placement={placement}
          >
            {text}
          </div>
        </OverlayPortal>
      )}
    </>
  );
}
