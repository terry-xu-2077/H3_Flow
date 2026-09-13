import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { mockStoryboard } from "../../mock/storyboard";
import { ScriptToTasksDialog } from "./ScriptToTasksDialog";

describe("ScriptToTasksDialog", () => {
  it("creates a temporary shot suggestion from the explicitly selected script range", async () => {
    const user = userEvent.setup();
    render(
      <ScriptToTasksDialog
        open
        scenes={mockStoryboard.scenes}
        defaultSceneId="scene-harbor"
        onClose={vi.fn()}
        onAccept={vi.fn()}
      />,
    );

    const script = screen.getByRole("textbox", { name: "剧本文本" }) as HTMLTextAreaElement;
    script.focus();
    script.setSelectionRange(0, 5);
    await user.click(screen.getByRole("button", { name: "从选中段落添加" }));

    expect(screen.getByRole("article", { name: "分镜建议 1" })).toBeInTheDocument();
    expect(screen.getByText("已添加一个分镜建议。")).toBeInTheDocument();
  });

  it("allows reorder, scene choice, deletion, and explicit creation without exposing engineering fields", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <ScriptToTasksDialog
        open
        scenes={mockStoryboard.scenes}
        defaultSceneId="scene-harbor"
        onClose={vi.fn()}
        onAccept={onAccept}
      />,
    );

    await user.click(screen.getByRole("button", { name: "AI 建议分镜" }));
    const originalSecondTitle = (within(screen.getByRole("article", { name: "分镜建议 2" })).getByText("分镜标题").parentElement!.querySelector("input") as HTMLInputElement).value;
    await user.click(screen.getByRole("button", { name: "下移分镜建议 1" }));
    expect((within(screen.getByRole("article", { name: "分镜建议 1" })).getByText("分镜标题").parentElement!.querySelector("input") as HTMLInputElement).value).toBe(originalSecondTitle);

    await user.click(screen.getByRole("button", { name: "分镜建议 1 目标场景" }));
    await user.click(screen.getByRole("option", { name: /Scene 02 · 仓库大厅/ }));
    await user.click(within(screen.getByRole("article", { name: "分镜建议 2" })).getByRole("button", { name: "删除" }));
    await user.click(screen.getByRole("button", { name: /创建全部 1 个分镜/ }));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept.mock.calls[0][0]).toHaveLength(1);
    expect(onAccept.mock.calls[0][0][0].targetSceneId).toBe("scene-hall");
    expect(screen.queryByText(/Visual Beats|User Intent|Target Scene|Proposal/)).not.toBeInTheDocument();
  });
});
