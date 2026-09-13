import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { mockStoryboard } from "../../mock/storyboard";
import { OverlayProvider } from "../../ui/overlay";
import { StoryReel } from "./StoryReel";

describe("StoryReel", () => {
  it("follows story order and keeps a multi-shot task result as one preview item", async () => {
    const user = userEvent.setup();
    render(<OverlayProvider><StoryReel snapshot={structuredClone(mockStoryboard)} onClose={vi.fn()} /></OverlayProvider>);

    const stage = screen.getByText("主要生成结果").closest("div.story-reel-stage")!;
    expect(stage).toHaveAttribute("data-source", "主要生成结果");
    expect(stage).toHaveTextContent("T01-001");
    expect(stage).toHaveTextContent("包含 3 个内部镜头");
    expect(screen.getAllByRole("heading", { name: "抵达仓库并发现门内异常" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /下一个/ }));
    expect(screen.getByText("暂无画面").closest("div.story-reel-stage")).toHaveTextContent("T01-002");

    await user.click(screen.getByRole("button", { name: /T02-001/ }));
    expect(screen.getByRole("heading", { name: "声音从身后靠近" })).toBeInTheDocument();
    expect(screen.getByText("计划时长").parentElement).toHaveTextContent("7 秒");
  });

  it("offers only preview navigation and playback controls", async () => {
    const user = userEvent.setup();
    render(<OverlayProvider><StoryReel snapshot={structuredClone(mockStoryboard)} onClose={vi.fn()} /></OverlayProvider>);

    const controls = screen.getByRole("region", { name: "连续预览" });
    expect(controls).toHaveTextContent("上一个");
    expect(controls).toHaveTextContent("下一个");
    await user.click(screen.getByRole("button", { name: "播放" }));
    expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Trim|Transition|Track|Keyframe|Razor/i })).not.toBeInTheDocument();
  });

  it("shows an explicit empty story order state", () => {
    const snapshot = structuredClone(mockStoryboard);
    snapshot.tasks = [];
    snapshot.taskPlacements = [];
    render(<OverlayProvider><StoryReel snapshot={snapshot} onClose={vi.fn()} /></OverlayProvider>);

    expect(screen.getByText("当前故事顺序中还没有分镜。")).toBeInTheDocument();
  });
});