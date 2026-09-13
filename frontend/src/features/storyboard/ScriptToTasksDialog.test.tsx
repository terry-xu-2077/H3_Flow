import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { mockStoryboard } from "../../mock/storyboard";
import { ScriptToTasksDialog } from "./ScriptToTasksDialog";

describe("ScriptToTasksDialog", () => {
  it("creates a temporary Proposal from the explicitly selected script range", async () => {
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
    await user.click(screen.getByRole("button", { name: "从选中段落创建 Proposal" }));

    expect(screen.getByRole("article", { name: "Task Proposal 1" })).toBeInTheDocument();
    expect(screen.getByText("已从选中文本创建一个待确认 Proposal。")).toBeInTheDocument();
  });

  it("allows reorder, Scene choice, deletion, and explicit acceptance", async () => {
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

    await user.click(screen.getByRole("button", { name: "生成 Mock AI Proposal" }));
    const originalSecondTitle = (within(screen.getByRole("article", { name: "Task Proposal 2" })).getByLabelText("Title") as HTMLInputElement).value;
    await user.click(screen.getByRole("button", { name: "下移 Proposal 1" }));
    expect(within(screen.getByRole("article", { name: "Task Proposal 1" })).getByLabelText("Title")).toHaveValue(originalSecondTitle);

    await user.click(screen.getByRole("button", { name: "Proposal 1 Target Scene" }));
    await user.click(screen.getByRole("option", { name: /Scene 02 · 仓库大厅/ }));
    await user.click(within(screen.getByRole("article", { name: "Task Proposal 2" })).getByRole("button", { name: "删除" }));
    await user.click(screen.getByRole("button", { name: /接受全部并创建 1 个 Task/ }));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept.mock.calls[0][0]).toHaveLength(1);
    expect(onAccept.mock.calls[0][0][0].targetSceneId).toBe("scene-hall");
  });
});
