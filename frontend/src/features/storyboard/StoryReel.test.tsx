import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { mockStoryboard } from "../../mock/storyboard";
import { OverlayProvider } from "../../ui/overlay";
import { StoryReel } from "./StoryReel";

describe("StoryReel", () => {
  it("follows Task Story Order and keeps a multi-shot Task Result as one reel item", async () => {
    const user = userEvent.setup();
    render(<OverlayProvider><StoryReel snapshot={structuredClone(mockStoryboard)} onClose={vi.fn()} /></OverlayProvider>);

    const stage = screen.getByText("Primary Task Result").closest("div.story-reel-stage")!;
    expect(stage).toHaveAttribute("data-source", "Primary Task Result");
    expect(stage).toHaveTextContent("T01-001");
    expect(stage).toHaveTextContent("完整多镜头 Task · 3 Beats");
    expect(screen.getAllByRole("heading", { name: "抵达仓库并发现门内异常" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /Next Task/ }));
    expect(screen.getByText("Placeholder").closest("div.story-reel-stage")).toHaveTextContent("T01-002");

    await user.click(screen.getByRole("button", { name: /T02-001/ }));
    expect(screen.getByRole("heading", { name: "声音从身后靠近" })).toBeInTheDocument();
    expect(screen.getByText("Planned Duration").parentElement).toHaveTextContent("7s");
  });

  it("offers only reel navigation and playback controls", async () => {
    const user = userEvent.setup();
    render(<OverlayProvider><StoryReel snapshot={structuredClone(mockStoryboard)} onClose={vi.fn()} /></OverlayProvider>);

    const controls = screen.getByRole("region", { name: "Story Reel" });
    expect(controls).toHaveTextContent("Previous Task");
    expect(controls).toHaveTextContent("Next Task");
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Trim|Transition|Track|Keyframe|Razor/i })).not.toBeInTheDocument();
  });

  it("shows an explicit empty Story Order state", () => {
    const snapshot = structuredClone(mockStoryboard);
    snapshot.tasks = [];
    snapshot.taskPlacements = [];
    render(<OverlayProvider><StoryReel snapshot={snapshot} onClose={vi.fn()} /></OverlayProvider>);

    expect(screen.getByText("当前 Story Order 中没有 Task。")).toBeInTheDocument();
  });
});
