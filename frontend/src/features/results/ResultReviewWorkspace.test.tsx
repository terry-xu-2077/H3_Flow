import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { mockStoryboard } from "../../mock/storyboard";
import { OverlayProvider } from "../../ui/overlay";
import { ResultReviewWorkspace } from "./ResultReviewWorkspace";

function ResultHarness({ onEditTask = () => undefined }: { onEditTask?: (taskId: string) => void }) {
  const [snapshot, setSnapshot] = useState(() => structuredClone(mockStoryboard));
  return <ResultReviewWorkspace snapshot={snapshot} onChange={setSnapshot} onEditTask={onEditTask} />;
}

describe("ResultReviewWorkspace", () => {
  it("reviews a complete multi-shot Task Result and switches Primary without splitting Shot results", async () => {
    const user = userEvent.setup();
    render(<OverlayProvider><ResultHarness /></OverlayProvider>);

    expect(screen.getByRole("region", { name: "Result Review" })).toHaveTextContent("完整多镜头 Task · 3 Beats");
    await user.click(within(screen.getByRole("navigation", { name: "Result 筛选" })).getByRole("button", { name: /^全部/ }));
    const latestCard = screen.getByText("result-arrival-2 · job-arrival-2").closest("article")!;

    await user.click(within(latestCard).getByRole("button", { name: "通过" }));
    await user.click(within(latestCard).getByRole("button", { name: "设为 Primary" }));

    expect(latestCard).toHaveClass("is-primary");
    expect(screen.getByRole("status")).toHaveTextContent("1 条下游 Context 标记为 Stale");
    expect(screen.queryByText(/Shot Result/)).not.toBeInTheDocument();
  });

  it("opens preview and immutable Task Result history, and routes Edit Task by stable task id", async () => {
    const user = userEvent.setup();
    const onEditTask = vi.fn();
    render(<OverlayProvider><ResultHarness onEditTask={onEditTask} /></OverlayProvider>);

    await user.click(within(screen.getByRole("navigation", { name: "Result 筛选" })).getByRole("button", { name: /^全部/ }));
    const latestCard = screen.getByText("result-arrival-2 · job-arrival-2").closest("article")!;
    await user.click(within(latestCard).getByRole("button", { name: "预览 result-arrival-2" }));
    expect(screen.getByRole("dialog", { name: /Result Preview/ })).toHaveTextContent("完整 Task Result");
    await user.keyboard("{Escape}");

    await user.click(within(latestCard).getByRole("button", { name: "打开历史" }));
    const history = screen.getByRole("dialog", { name: /Result History/ });
    expect(history).toHaveTextContent("result-arrival-1");
    expect(history).toHaveTextContent("result-arrival-2");
    await user.keyboard("{Escape}");

    await user.click(within(latestCard).getByRole("button", { name: "编辑 Task" }));
    expect(onEditTask).toHaveBeenCalledWith("task-harbor-arrival");
  });
});
