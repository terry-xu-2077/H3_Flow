import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { Dialog, OverlayProvider, PortalSelect, useToast } from ".";

function Harness() {
  const [dialogOpen, setDialogOpen] = useState(true);
  const [value, setValue] = useState("visual");
  return (
    <OverlayProvider>
      <Dialog open={dialogOpen} title="嵌套浮层" onClose={() => setDialogOpen(false)}>
        <PortalSelect
          value={value}
          options={[
            { value: "visual", label: "Visual" },
            { value: "semantic", label: "Semantic" },
          ]}
          onChange={setValue}
          ariaLabel="上下文模式"
          testId="nested-select"
        />
      </Dialog>
    </OverlayProvider>
  );
}

function ToastTrigger() {
  const pushToast = useToast();
  return <button type="button" onClick={() => pushToast("延迟关闭通知")}>触发通知</button>;
}

describe("Overlay system", () => {
  it("portals menus to the global overlay root", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "上下文模式" }));
    const menu = screen.getByRole("listbox", { name: "上下文模式选项" });

    expect(document.getElementById("shotmill-overlay-root")).toContainElement(menu);
  });

  it("keeps select menus constrained to the trigger width", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "上下文模式" });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      x: 40,
      y: 60,
      left: 40,
      top: 60,
      right: 280,
      bottom: 94,
      width: 240,
      height: 34,
      toJSON: () => ({}),
    } as DOMRect);

    await user.click(trigger);
    const menu = screen.getByRole("listbox", { name: "上下文模式选项" });
    expect(menu).toHaveStyle({ width: "240px" });
  });

  it("closes only the topmost overlay on each Escape press", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "上下文模式" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox", { name: "上下文模式选项" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "嵌套浮层" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "嵌套浮层" })).not.toBeInTheDocument();
  });

  it("clears pending toast timers when the provider unmounts", () => {
    vi.useFakeTimers();
    const clearTimeout = vi.spyOn(window, "clearTimeout");
    const view = render(<OverlayProvider><ToastTrigger /></OverlayProvider>);

    fireEvent.click(screen.getByRole("button", { name: "触发通知" }));
    view.unmount();

    expect(clearTimeout).toHaveBeenCalled();
    vi.runOnlyPendingTimers();
    clearTimeout.mockRestore();
    vi.useRealTimers();
  });
});