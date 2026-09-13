import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "./App";
import { OverlayProvider } from "./ui/overlay";

function renderApp() {
  return render(
    <OverlayProvider>
      <App />
    </OverlayProvider>,
  );
}

describe("App shell", () => {
  async function openProduction(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "生产" }));
  }

  it("opens directly in the storyboard workspace with all three columns", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "分镜式任务工作台" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Scene Navigator" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Storyboard Task Board" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Inspector" })).toBeInTheDocument();
  });

  it("keeps Scene Section counts derived from Task placement relations", () => {
    renderApp();

    expect(screen.getByTestId("scene-section-scene-harbor")).toHaveTextContent("3 Tasks · 29s planned · 1 Running · 0 Needs Attention");
    expect(screen.getByTestId("scene-section-scene-hall")).toHaveTextContent("3 Tasks · 13s planned · 0 Running · 2 Needs Attention");
    expect(screen.getByTestId("scene-section-scene-empty")).toHaveTextContent("0 Tasks · 0s planned · 0 Running · 0 Needs Attention");
  });

  it("collapses and restores both side columns", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "折叠 Scene Navigator" }));
    await user.click(screen.getByRole("button", { name: "折叠 Inspector" }));
    expect(screen.queryByRole("complementary", { name: "Scene Navigator" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Inspector" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展开 Scene Navigator" }));
    await user.click(screen.getByRole("button", { name: "展开 Inspector" }));
    expect(screen.getByRole("complementary", { name: "Scene Navigator" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Inspector" })).toBeInTheDocument();
  });

  it("updates Scene Overview from the selected Scene", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /Scene 02.*仓库大厅/ }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    expect(within(inspector).getByRole("textbox", { name: "Scene Name" })).toHaveValue("仓库大厅");
    expect(inspector).toHaveTextContent("Tasks3");
  });

  it("treats a multi-shot storyboard card as one Generation Task", async () => {
    const user = userEvent.setup();
    renderApp();

    const taskCard = screen.getByRole("option", { name: /T01-001.*多镜头 Task · 3 Beats/ });
    await user.click(taskCard);
    expect(screen.getByRole("heading", { name: "Task Inspector" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Inspector" })).toHaveTextContent("Visual Beats3");

    await user.dblClick(taskCard);
    expect(screen.getByTestId("task-composer")).toBeInTheDocument();
  });

  it("supports explicit multi-selection with a stable batch bar", async () => {
    const user = userEvent.setup();
    renderApp();
    await openProduction(user);

    await user.keyboard("{Control>}");
    await user.click(screen.getByTestId("task-card-task-003"));
    await user.keyboard("{/Control}");

    expect(screen.getByRole("region", { name: "批量操作" })).toHaveTextContent("已选择 2 个任务");
  });

  it("selects a visible range with shift click", async () => {
    const user = userEvent.setup();
    renderApp();
    await openProduction(user);

    await user.keyboard("{Shift>}");
    await user.click(screen.getByTestId("task-card-task-005"));
    await user.keyboard("{/Shift}");

    expect(screen.getByRole("region", { name: "批量操作" })).toHaveTextContent("已选择 4 个任务");
  });

  it("filters tasks without clearing the current production workspace", async () => {
    const user = userEvent.setup();
    renderApp();
    await openProduction(user);

    await user.type(screen.getByRole("textbox", { name: "搜索任务" }), "声音从身后");

    expect(screen.getByTestId("task-card-task-005")).toBeInTheDocument();
    expect(screen.queryByTestId("task-card-task-001")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "任务生产区" })).toBeInTheDocument();
  });

  it("duplicates the current task as a new draft", async () => {
    const user = userEvent.setup();
    renderApp();
    await openProduction(user);

    await user.click(screen.getByRole("button", { name: /复制任务/ }));

    expect(screen.getByText("仓库门前的短暂停顿 · 副本")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("已复制 1 个任务");
  });

  it("opens the Task Composer from a task card double click", async () => {
    const user = userEvent.setup();
    renderApp();
    await openProduction(user);

    await user.dblClick(screen.getByTestId("task-card-task-002"));

    expect(screen.getByTestId("task-composer")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Script Source" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Final Prompt" })).toBeInTheDocument();
  });

  it("opens the Task-first Result Review wall from the main navigation", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "结果" }));

    expect(screen.getByRole("region", { name: "Result Review" })).toHaveTextContent("每个 Result 都属于完整 Generation Task");
    expect(screen.getByText("result-arrival-2 · job-arrival-2")).toBeInTheDocument();
  });
});
