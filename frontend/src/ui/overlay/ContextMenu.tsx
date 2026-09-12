import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { OverlayPortal, useOverlayRegistration, useOverlayZIndex } from "./OverlaySystem";

type ContextMenuAction = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

export function ContextMenu({ children, actions }: { children: ReactNode; actions: ContextMenuAction[] }) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const zIndex = useOverlayZIndex(30);
  useOverlayRegistration(Boolean(point), () => setPoint(null));

  useEffect(() => {
    if (!point) return;
    const close = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setPoint(null);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [point]);

  return (
    <div
      className="sm-context-host"
      onContextMenu={(event) => {
        event.preventDefault();
        setPoint({ x: event.clientX, y: event.clientY });
      }}
    >
      {children}
      {point && (
        <OverlayPortal>
          <div
            ref={menuRef}
            className="sm-context-menu sm-overlay-surface"
            style={{
              ...zIndex,
              position: "fixed",
              left: Math.min(point.x, window.innerWidth - 190),
              top: Math.min(point.y, window.innerHeight - actions.length * 36 - 12),
            }}
            role="menu"
          >
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                className={action.danger ? "is-danger" : ""}
                onClick={() => {
                  action.onSelect();
                  setPoint(null);
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}
