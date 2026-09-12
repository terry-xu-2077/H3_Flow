import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OverlayProvider } from "../ui/overlay";
import { TaskComposer } from "./TaskComposer";

const task = {
  id: "task-002",
  number: "S01-002",
  title: "仓库门前的短暂停顿",
  summary: "测试任务",
  status: "running" as const,
  assets: 4,
  duration: "6s",
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
});
