import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { mockStoryboard } from "../../mock/storyboard";
import { StoryboardTaskCard } from "./StoryboardTaskCard";

describe("StoryboardTaskCard", () => {
  const multiShotTask = mockStoryboard.tasks.find((task) => task.id === "task-harbor-arrival")!;

  it("expresses one multi-shot Generation Task as one card", () => {
    const onSelect = vi.fn();
    const onOpen = vi.fn();
    render(<StoryboardTaskCard task={multiShotTask} primaryResultPreviewUrl="results/primary.webp" selected={false} onSelect={onSelect} onOpen={onOpen} />);

    expect(screen.getByRole("option", { name: /T01-001.*多镜头 Task · 3 Beats/ })).toBeInTheDocument();
    expect(screen.getByText("PRIMARY RESULT")).toBeInTheDocument();
    expect(screen.getByText("15s")).toBeInTheDocument();
    expect(screen.getByText("H3 · Multi-shot")).toHaveAttribute("title", "H3 · Multi-shot");
    expect(screen.getByText("PRIMARY RESULT").parentElement).toHaveAttribute("data-frame-source", "primary-result");

    fireEvent.click(screen.getByRole("option"));
    fireEvent.doubleClick(screen.getByRole("option"));
    expect(onSelect).toHaveBeenCalledWith(multiShotTask, expect.any(Object));
    expect(onOpen).toHaveBeenCalledWith(multiShotTask);
  });

  it("reserves the progress slot across Task state changes", () => {
    const running = mockStoryboard.tasks.find((task) => task.id === "task-hall-projector")!;
    const view = render(<StoryboardTaskCard task={running} selected={false} onSelect={() => undefined} />);

    expect(screen.getByTestId("storyboard-task-progress")).toHaveClass("is-running");
    expect(screen.getByLabelText("生成进度 43%")).toBeInTheDocument();

    view.rerender(<StoryboardTaskCard task={{ ...running, state: "failed" }} selected={false} onSelect={() => undefined} />);
    expect(screen.getByTestId("storyboard-task-progress")).toHaveClass("is-idle");
    expect(screen.getByTestId("storyboard-task-card")).toHaveAttribute("data-state", "failed");
  });
});
