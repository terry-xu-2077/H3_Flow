import { X } from "lucide-react";

import { OverlayDepth, OverlayPortal, useOverlayRegistration, useOverlayZIndex } from "./OverlaySystem";

export function FullscreenPreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  useOverlayRegistration(open, onClose);
  const zIndex = useOverlayZIndex(90);
  if (!open) return null;

  return (
    <OverlayPortal>
      <OverlayDepth>
        <section className="sm-fullscreen-preview" style={zIndex} role="dialog" aria-modal="true" aria-label="全屏媒体预览">
          <button type="button" aria-label="关闭全屏预览" onClick={onClose}><X size={19} /></button>
          <div className="sm-preview-media"><span>RESULT 02</span></div>
          <footer><strong>S01-002 · 仓库门前的短暂停顿</strong><span>16:9 · 1080p · 6s</span></footer>
        </section>
      </OverlayDepth>
    </OverlayPortal>
  );
}
