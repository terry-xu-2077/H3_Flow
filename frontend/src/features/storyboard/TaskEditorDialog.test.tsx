import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { mockProjectAssets } from "../../mock/assets";
import { mockStoryboard } from "../../mock/storyboard";
import { OverlayProvider } from "../../ui/overlay";
import { TaskEditorDialog } from "./TaskEditorDialog";

function renderEditor(onSave = vi.fn(), onClose = vi.fn()) {
  return {
    onSave,
    onClose,
    ...render(
      <OverlayProvider>
        <TaskEditorDialog
          open
          task={structuredClone(mockStoryboard.tasks[0])}
          assets={mockProjectAssets}
          onClose={onClose}
          onSave={onSave}
        />
      </OverlayProvider>,
    ),
  };
}

describe("TaskEditorDialog", () => {
  it("uses the task itself as the dialog title and keeps configuration compact", () => {
    renderEditor();

    const dialog = screen.getByRole("dialog", { name: /抵达仓库并发现门内异常/ });
    expect(within(dialog).getByTitle("编辑任务名称")).toBeInTheDocument();
    expect(within(dialog).getByText("任务编号 T01-001")).toBeInTheDocument();
    expect(within(dialog).getByText("任务配置")).toBeInTheDocument();
    expect(within(dialog).getByText("生成参数")).toBeInTheDocument();
    expect(within(dialog).getByText("生成模式")).toBeInTheDocument();
    expect(within(dialog).getByText("上下文承接")).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: "片段承接" })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByRole("tab", { name: "尾帧承接" })).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: "不承接" })).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: "用户" })).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: /AI 增强/ })).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent("Generation Profile");
    expect(dialog).not.toHaveTextContent("Visual Beat");
    expect(dialog).not.toHaveTextContent("Validator");
  });

  it("edits task name and saves prompt, duration and segment continuation parameters", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    renderEditor(onSave, onClose);

    await user.click(screen.getByTitle("编辑任务名称"));
    const nameInput = screen.getByRole("textbox", { name: "任务名称" });
    await user.clear(nameInput);
    await user.type(nameInput, "雨夜抵达仓库");
    await user.keyboard("{Enter}");

    const prompt = screen.getByRole("textbox", { name: "用户提示词" });
    await user.clear(prompt);
    await user.type(prompt, "主角走入仓库，保持雨夜连续性。");

    const duration = screen.getByRole("spinbutton", { name: "总秒数" });
    await user.clear(duration);
    await user.type(duration, "9");

    const contextDuration = screen.getByRole("spinbutton", { name: "承接时长" });
    await user.clear(contextDuration);
    await user.type(contextDuration, "4");

    expect(onSave).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      title: "雨夜抵达仓库",
      finalPrompt: "主角走入仓库，保持雨夜连续性。",
      plannedDurationSeconds: 9,
      generationParams: {
        contextMode: "片段承接",
        contextDurationSeconds: 4,
      },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("switches context mode with tabs instead of a select", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.queryByRole("button", { name: "上下文承接" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "尾帧承接" }));
    expect(screen.getByText("使用上一任务最终帧作为本任务的起始视觉参考。")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: "承接时长" })).not.toBeInTheDocument();
  });

  it("keeps the prompt footer stable when switching to AI enhancement", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.getByText(/输入 @ 引用当前任务资产/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /AI 增强/ }));
    expect(screen.getByText(/输入 @ 引用当前任务资产/)).toBeInTheDocument();
  });

  it("cancels without saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    renderEditor(onSave, onClose);

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});