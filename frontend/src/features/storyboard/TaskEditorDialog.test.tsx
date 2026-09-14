import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import type { GenerationTask } from "../../domain/storyboard";
import { mockProjectAssets } from "../../mock/assets";
import { mockStoryboard } from "../../mock/storyboard";
import type { PromptEnhancementRequest, PromptEnhancementResponse } from "../../services/promptEnhancement";
import { OverlayProvider } from "../../ui/overlay";
import { TaskEditorDialog } from "./TaskEditorDialog";

function renderEditor(
  onSave = vi.fn(),
  onClose = vi.fn(),
  task?: GenerationTask,
  onEnhancePrompt: (request: PromptEnhancementRequest) => Promise<PromptEnhancementResponse> = vi.fn(async () => ({
    id: "ai-default",
    createdAt: "2026-09-13T08:00:00+08:00",
    prompt: "默认 AI 增强提示词",
  })),
) {
  return {
    onSave,
    onClose,
    ...render(
      <OverlayProvider>
        <TaskEditorDialog
          open
          task={task ?? structuredClone(mockStoryboard.tasks[0])}
          assets={mockProjectAssets}
          previousTaskDurationSeconds={15}
          previousTaskSummary="上一任务中，角色穿过雨夜码头并抵达仓库外。"
          projectContext={{ description: "雨夜旧港口项目背景", useDescriptionForAiPrompt: true }}
          onEnhancePrompt={onEnhancePrompt}
          onClose={onClose}
          onSave={onSave}
        />
      </OverlayProvider>,
    ),
  };
}

describe("TaskEditorDialog", () => {
  it("uses segmented choices and sliders instead of dropdown-heavy controls", () => {
    renderEditor();

    const dialog = screen.getByRole("dialog", { name: /抵达仓库并发现门内异常/ });
    expect(within(dialog).getByTitle("编辑任务名称")).toBeInTheDocument();
    expect(within(dialog).getByText("任务编号 T01-001")).toBeInTheDocument();
    const resolution = within(dialog).getByRole("group", { name: "分辨率" });
    expect(resolution).toBeInTheDocument();
    expect(resolution).toHaveClass("tc-segmented");
    expect(within(resolution).getByRole("button", { name: "480P" })).toBeInTheDocument();
    expect(within(resolution).getByRole("button", { name: "720P" })).toBeInTheDocument();
    expect(within(resolution).getByRole("button", { name: "1080P" })).toBeInTheDocument();
    expect(within(resolution).queryByRole("button", { name: "2K" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "质量档位" })).toHaveClass("tc-segmented");
    expect(within(dialog).getByRole("group", { name: "生成模式" })).toHaveClass("tc-segmented");
    expect(within(dialog).getByRole("slider", { name: "总秒数" })).toBeInTheDocument();
    expect(within(dialog).getByRole("slider", { name: "承接起点" })).toBeInTheDocument();
    expect(within(dialog).getByRole("slider", { name: "承接终点" })).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: "片段承接" })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByRole("tab", { name: "用户" })).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: /AI 增强/ })).toBeInTheDocument();
    expect(dialog.querySelectorAll(".tc-segmented").length).toBeGreaterThanOrEqual(6);
    expect(dialog).not.toHaveTextContent("Generation Profile");
    expect(dialog).not.toHaveTextContent("Visual Beat");
    expect(dialog).not.toHaveTextContent("Validator");
  });

  it("edits task name and saves duration plus continuation interval", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    renderEditor(onSave, onClose);

    await user.click(screen.getByTitle("编辑任务名称"));
    const nameInput = screen.getByRole("textbox", { name: "任务名称" });
    await user.clear(nameInput);
    await user.type(nameInput, "雨夜抵达仓库");
    await user.keyboard("{Enter}");

    await user.click(screen.getByRole("tab", { name: /文本/ }));
    const prompt = screen.getByRole("textbox", { name: "用户提示词" });
    await user.clear(prompt);
    await user.type(prompt, "主角走入仓库，保持雨夜连续性。");

    fireEvent.change(screen.getByRole("slider", { name: "总秒数" }), { target: { value: "9" } });
    fireEvent.change(screen.getByRole("slider", { name: "承接起点" }), { target: { value: "11" } });
    fireEvent.change(screen.getByRole("slider", { name: "承接终点" }), { target: { value: "15" } });

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      title: "雨夜抵达仓库",
      finalPrompt: "主角走入仓库，保持雨夜连续性。",
      plannedDurationSeconds: 9,
      generationParams: {
        contextMode: "片段承接",
        contextStartSeconds: 11,
        contextEndSeconds: 15,
        contextDurationSeconds: 4,
        promptSource: "user",
        userPromptViewMode: "text",
      },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("defaults a new continuation interval to the last one second of the previous task", () => {
    const task = structuredClone(mockStoryboard.tasks[0]);
    task.generationParams = {
      ...task.generationParams,
      contextMode: "片段承接",
    };
    delete task.generationParams.contextDurationSeconds;
    delete task.generationParams.contextStartSeconds;
    delete task.generationParams.contextEndSeconds;

    renderEditor(vi.fn(), vi.fn(), task);

    expect(screen.getByRole("slider", { name: "承接起点" })).toHaveValue("14");
    expect(screen.getByRole("slider", { name: "承接终点" })).toHaveValue("15");
    expect(screen.getByText("14s – 15s · 1s")).toBeInTheDocument();
  });

  it("switches context mode with tabs instead of a select", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("tab", { name: "尾帧承接" }));
    expect(screen.getByText("使用上一任务最终帧作为本任务的起始视觉参考。")).toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: "承接起点" })).not.toBeInTheDocument();
  });

  it("gives both user and AI prompts independent visual and text view modes", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderEditor(onSave);

    expect(screen.getByRole("textbox", { name: "用户提示词可视化" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /文本/ }));
    expect(screen.getByRole("textbox", { name: "用户提示词" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /AI 增强/ }));
    expect(screen.getByRole("textbox", { name: "AI 增强提示词可视化" })).toBeInTheDocument();
    expect(screen.getByText("AI增强已启用项目背景")).toBeInTheDocument();
    expect(await screen.findByText("AI增强会参考上一任务摘要")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /文本/ }));
    expect(screen.getByRole("textbox", { name: "AI 增强提示词" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "用户" }));
    expect(screen.getByRole("tab", { name: /文本/ })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave.mock.calls[0][0].generationParams).toMatchObject({
      userPromptViewMode: "text",
      aiPromptViewMode: "text",
    });
  });

  it("shows AI history only on the AI tab and creates repeatable enhancement versions from summary context", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onEnhancePrompt = vi.fn()
      .mockResolvedValueOnce({ id: "ai-v1", createdAt: "2026-09-13T08:10:00+08:00", prompt: "AI增强版本一", taskRevision: 8 })
      .mockResolvedValueOnce({ id: "ai-v2", createdAt: "2026-09-13T08:12:00+08:00", prompt: "AI增强版本二", taskRevision: 9 });
    const task = structuredClone(mockStoryboard.tasks[0]);
    task.aiPrompt = "";
    task.finalPrompt = "用户原始提示词";
    task.generationParams = {
      ...task.generationParams,
      userPrompt: "用户原始提示词",
      promptSource: "user",
      aiPromptHistory: [],
    };

    renderEditor(onSave, vi.fn(), task, onEnhancePrompt);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /AI 增强/ }));

    let history = screen.getByRole("combobox");
    expect(history).toBeDisabled();
    expect(screen.getByText("AI增强的提示词显示在这里")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "增强" }));
    await waitFor(() => expect(onEnhancePrompt).toHaveBeenCalledTimes(1));
    expect(onEnhancePrompt.mock.calls[0][0]).toMatchObject({
      userPrompt: "用户原始提示词",
      previousTaskSummary: "上一任务中，角色穿过雨夜码头并抵达仓库外。",
      projectBackground: "雨夜旧港口项目背景",
    });
    history = screen.getByRole("combobox");
    expect(history).not.toBeDisabled();
    expect(history).toHaveAttribute("data-value", "ai-v1");
    await waitFor(() => expect(screen.getByRole("textbox", { name: "AI 增强提示词可视化" })).toHaveTextContent("AI增强版本一"));

    await user.click(screen.getByRole("button", { name: "增强" }));
    await waitFor(() => expect(onEnhancePrompt).toHaveBeenCalledTimes(2));
    history = screen.getByRole("combobox");
    expect(history).toHaveAttribute("data-value", "ai-v2");
    await user.click(history);
    const historyList = screen.getByRole("listbox");
    const historyOptions = within(historyList).getAllByRole("option");
    expect(historyOptions).toHaveLength(2);
    await user.click(historyOptions[0]);
    await waitFor(() => expect(screen.getByRole("textbox", { name: "AI 增强提示词可视化" })).toHaveTextContent("AI增强版本一"));
    expect(screen.getByRole("combobox")).toHaveAttribute("data-value", "ai-v1");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave.mock.calls[0][0]).toMatchObject({
      aiPrompt: "AI增强版本一",
      finalPrompt: "AI增强版本一",
      generationParams: {
        promptSource: "ai",
        selectedAiPromptHistoryId: "ai-v1",
        revision: 9,
      },
    });
    expect(onSave.mock.calls[0][0].generationParams.aiPromptHistory).toHaveLength(2);
  });

  it("lists project assets for a new task and saves an inserted @ reference as a binding", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const task = structuredClone(mockStoryboard.tasks[0]);
    task.assetBindings = [];
    task.finalPrompt = "";
    task.generationParams = { ...task.generationParams, userPrompt: "", promptSource: "user" };
    renderEditor(onSave, vi.fn(), task);

    await user.click(screen.getByRole("tab", { name: /文本/ }));
    const prompt = screen.getByRole("textbox", { name: "用户提示词" });
    await user.clear(prompt);
    await user.type(prompt, "使用 @");
    const menu = screen.getByRole("listbox", { name: "引用任务资产" });
    await user.click(within(menu).getByRole("option", { name: /林澜 · 雨夜造型/ }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave.mock.calls[0][0]).toMatchObject({
      finalPrompt: "使用 <Subject 1> ",
      assetBindings: [{
        assetId: "asset-character-linlan",
        role: "character",
        reference: "<Subject 1>",
      }],
    });
  });

  it("uses whichever prompt tab is selected and shows the source in the bottom action bar", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const task = structuredClone(mockStoryboard.tasks[0]);
    task.aiPrompt = "AI增强后的镜头提示词";
    task.generationParams = { ...task.generationParams, userPrompt: "用户原始提示词", promptSource: "user" };
    task.finalPrompt = "用户原始提示词";
    renderEditor(onSave, vi.fn(), task);

    expect(screen.getByText("当前使用：用户提示词")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /AI 增强/ }));
    expect(screen.getByText("已使用AI增强提示词")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      aiPrompt: "AI增强后的镜头提示词",
      finalPrompt: "AI增强后的镜头提示词",
      generationParams: {
        promptSource: "ai",
        userPrompt: "用户原始提示词",
      },
    });
  });

  it("reopens on the prompt source that was last selected", () => {
    const task = structuredClone(mockStoryboard.tasks[0]);
    task.aiPrompt = "AI增强后的镜头提示词";
    task.finalPrompt = task.aiPrompt;
    task.generationParams = { ...task.generationParams, promptSource: "ai", userPrompt: "用户原始提示词", aiPromptViewMode: "text" };
    renderEditor(vi.fn(), vi.fn(), task);

    expect(screen.getByRole("tab", { name: /AI 增强/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("已使用AI增强提示词")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /文本/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("combobox")).toHaveAttribute("data-value", `legacy-${task.id}`);
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
