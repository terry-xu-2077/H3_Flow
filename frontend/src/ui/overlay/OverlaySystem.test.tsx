import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Dialog, OverlayProvider, PortalSelect } from ".";

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

describe("Overlay system", () => {
  it("portals menus to the global overlay root", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "上下文模式" }));
    const menu = screen.getByRole("listbox", { name: "上下文模式选项" });

    expect(document.getElementById("shotmill-overlay-root")).toContainElement(menu);
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
});
