import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { OverlayProvider } from "../ui/overlay";
import { TaskComposer } from "./TaskComposer";

const task = {
  id: "task-002",
  number: "S01-002",
  title: "仓库门前的短暂停顿",
  summary: "测试任务",
  state: "running" as const,
  assetCount: 4,
  plannedDurationLabel: "6s",
  visualBeatCount: 1,
  progress: 43,
};

function renderComposer() {
  return render(
    <OverlayProvider>
      <TaskComposer task={task} onClose={() => undefined} />
    </OverlayProvider>,
  );
}

describe("Task Composer", () => {
  it("never overwrites a manually edited Final Prompt when AI regenerates", async () => {
    const user = userEvent.setup();
    renderComposer();
    const finalPrompt = screen.getByRole("textbox", { name: "Final Prompt" });

    await user.clear(finalPrompt);
    await user.type(finalPrompt, "MANUAL FINAL PROMPT");
    await user.click(screen.getByRole("button", { name: /重新生成/ }));
    await screen.findByText("新的 AI Prompt 已生成，Final Prompt 保持不变");

    expect(finalPrompt).toHaveValue("MANUAL FINAL PROMPT");
    expect((screen.getByRole("textbox", { name: "AI Prompt" }) as HTMLTextAreaElement).value).toContain("AI revision 3");
  });

  it("requires explicit confirmation before replacing Final Prompt", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole("button", { name: /重新生成/ }));
    await screen.findByText("新的 AI Prompt 已生成，Final Prompt 保持不变");
    await user.click(screen.getByRole("button", { name: "采用此版本" }));
    expect(screen.getByRole("dialog", { name: "替换 Final Prompt？" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "确认替换" }));
    expect(screen.getByRole("textbox", { name: "Final Prompt" })).toHaveValue(
      (screen.getByRole("textbox", { name: "AI Prompt" }) as HTMLTextAreaElement).value,
    );
  });

  it("preserves the focused input node and content during background updates", async () => {
    const user = userEvent.setup();
    renderComposer();
    const finalPrompt = screen.getByRole("textbox", { name: "Final Prompt" });

    await user.click(finalPrompt);
    await user.type(finalPrompt, " focus-marker");
    expect(finalPrompt).toHaveFocus();

    await waitFor(() => expect(screen.getByTestId("remote-progress")).toHaveTextContent("47%"));
    expect(screen.getByRole("textbox", { name: "Final Prompt" })).toBe(finalPrompt);
    expect(finalPrompt).toHaveFocus();
    expect((finalPrompt as HTMLTextAreaElement).value).toContain("focus-marker");
  });

  it("reports saving and saved states for edited fields", async () => {
    const user = userEvent.setup();
    renderComposer();
    const intent = screen.getByRole("textbox", { name: "User Intent" });

    await user.type(intent, " 补充意图");
    expect(screen.getByTestId("save-state")).toHaveTextContent("保存中");
    await waitFor(() => expect(screen.getByTestId("save-state")).toHaveTextContent("已保存"));
  });

  it("opens and filters the asset menu after @, then inserts an H3 reference", async () => {
    const user = userEvent.setup();
    renderComposer();
    const finalPrompt = screen.getByRole("textbox", { name: "Final Prompt" });

    await user.clear(finalPrompt);
    await user.type(finalPrompt, "镜头参考 @仓库");

    const menu = screen.getByRole("listbox", { name: "引用任务资产" });
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /旧港口仓库外景/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /林澜/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /旧港口仓库外景/ }));
    expect(finalPrompt).toHaveValue("镜头参考 <Picture 1> ");
    expect(menu).not.toBeInTheDocument();
    expect(finalPrompt).toHaveFocus();
  });

  it("supports keyboard selection and Escape without mutating the mention", async () => {
    const user = userEvent.setup();
    renderComposer();
    const finalPrompt = screen.getByRole("textbox", { name: "Final Prompt" });

    await user.clear(finalPrompt);
    await user.type(finalPrompt, "@");
    expect(screen.getAllByRole("option")).toHaveLength(4);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(finalPrompt).toHaveValue("<Picture 1> ");

    await user.type(finalPrompt, "@");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox", { name: "引用任务资产" })).not.toBeInTheDocument();
    expect(finalPrompt).toHaveValue("<Picture 1> @");
  });

  it("edits a multi-shot Task through its internal Visual Beat Strip", async () => {
    const user = userEvent.setup();
    const onTaskChange = vi.fn();
    render(
      <OverlayProvider>
        <TaskComposer
          task={{
            ...task,
            plannedDurationLabel: "15s",
            visualBeatCount: 3,
            generationProfileId: "profile-h3-multi-shot",
            visualBeats: [
              { id: "beat-1", label: "建立", description: "仓库外景", plannedStart: 0, plannedEnd: 4 },
              { id: "beat-2", label: "靠近", description: "靠近人物", plannedStart: 4, plannedEnd: 9 },
              { id: "beat-3", label: "推门", description: "推门收束", plannedStart: 9, plannedEnd: 15 },
            ],
          }}
          onClose={() => undefined}
          onTaskChange={onTaskChange}
        />
      </OverlayProvider>,
    );

    expect(screen.getAllByRole("tab")).toHaveLength(3);
    await user.click(screen.getByRole("tab", { name: /靠近/ }));
    await user.clear(screen.getByRole("textbox", { name: "Beat Description" }));
    await user.type(screen.getByRole("textbox", { name: "Beat Description" }), "贴近人物侧脸");
    expect(onTaskChange).toHaveBeenLastCalledWith(expect.objectContaining({
      visualBeats: expect.arrayContaining([expect.objectContaining({ id: "beat-2", description: "贴近人物侧脸" })]),
    }));

    await user.click(screen.getByRole("button", { name: "+ 添加 Beat" }));
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: "删除 Beat" }));
    expect(screen.getAllByRole("tab")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Generation Profile" }));
    await user.click(screen.getByRole("option", { name: /H3 · Fast Preview/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("当前 Profile 不支持多镜头提示词");
  });
});
