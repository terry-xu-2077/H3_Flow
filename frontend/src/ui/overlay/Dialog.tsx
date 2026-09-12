import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";

import {
  OverlayDepth,
  OverlayPortal,
  useOverlayRegistration,
  useOverlayZIndex,
} from "./OverlaySystem";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  size?: "default" | "wide";
};

export function Dialog({ open, title, description, children, onClose, size = "default" }: DialogProps) {
  const titleId = useId();
  useOverlayRegistration(open, onClose);
  const backdropZ = useOverlayZIndex(50);
  const dialogZ = useOverlayZIndex(60);

  if (!open) return null;

  return (
    <OverlayPortal>
      <div className="sm-dialog-backdrop" style={backdropZ} onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}>
        <OverlayDepth>
          <section
            className={`sm-dialog size-${size}`}
            style={dialogZ}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header>
              <div>
                <span className="eyebrow">OVERLAY SYSTEM</span>
                <h2 id={titleId}>{title}</h2>
                {description && <p>{description}</p>}
              </div>
              <button type="button" aria-label="关闭对话框" onClick={onClose}><X size={18} /></button>
            </header>
            <div className="sm-dialog-content">{children}</div>
          </section>
        </OverlayDepth>
      </div>
    </OverlayPortal>
  );
}
