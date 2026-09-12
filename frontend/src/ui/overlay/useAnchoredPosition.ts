import { type CSSProperties, type RefObject, useLayoutEffect, useRef, useState } from "react";

type Placement = "up" | "down";

type PositionState = {
  placement: Placement;
  style: CSSProperties;
};

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;

export function useAnchoredPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  preferred: Placement = "down",
  maxPreferredHeight = 300,
) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PositionState>({
    placement: preferred,
    style: { visibility: "hidden" },
  });

  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      const anchor = anchorRef.current;
      const surface = surfaceRef.current;
      if (!anchor || !surface) return;

      const anchorRect = anchor.getBoundingClientRect();
      const desiredHeight = Math.min(surface.scrollHeight, maxPreferredHeight);
      const below = Math.max(0, window.innerHeight - anchorRect.bottom - ANCHOR_GAP - VIEWPORT_MARGIN);
      const above = Math.max(0, anchorRect.top - ANCHOR_GAP - VIEWPORT_MARGIN);
      const preferredSpace = preferred === "down" ? below : above;
      const alternateSpace = preferred === "down" ? above : below;
      const placement: Placement =
        preferredSpace >= desiredHeight || preferredSpace >= alternateSpace
          ? preferred
          : preferred === "down"
            ? "up"
            : "down";
      const available = placement === "down" ? below : above;
      const maxHeight = Math.max(0, Math.min(maxPreferredHeight, available));
      const visibleHeight = Math.min(desiredHeight, maxHeight);
      const viewportWidth = window.innerWidth;
      const width = Math.min(Math.max(anchorRect.width, surface.scrollWidth), viewportWidth - 16);
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, anchorRect.left),
        Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN),
      );
      const top =
        placement === "down"
          ? anchorRect.bottom + ANCHOR_GAP
          : anchorRect.top - ANCHOR_GAP - visibleHeight;

      setPosition({
        placement,
        style: {
          position: "fixed",
          top: Math.max(VIEWPORT_MARGIN, top),
          left,
          width,
          maxHeight,
          visibility: "visible",
        },
      });
    };

    update();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, maxPreferredHeight, open, preferred]);

  return { surfaceRef, ...position };
}
