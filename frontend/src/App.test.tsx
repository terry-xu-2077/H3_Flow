import { render, screen } from "@testing-library/react";
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
  it("opens directly in the task production workspace", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "任务生产区" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
  });

  it("supports explicit multi-selection with a stable batch bar", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.keyboard("{Control>}");
    await user.click(screen.getByTestId("task-card-task-003"));
    await user.keyboard("{/Control}");

    expect(screen.getByRole("region", { name: "批量操作" })).toHaveTextContent("已选择 2 个任务");
  });

  it("selects a visible range with shift click", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.keyboard("{Shift>}");
    await user.click(screen.getByTestId("task-card-task-005"));
    await user.keyboard("{/Shift}");

    expect(screen.getByRole("region", { name: "批量操作" })).toHaveTextContent("已选择 4 个任务");
  });

  it("filters tasks without clearing the current production workspace", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole("textbox", { name: "搜索任务" }), "声音从身后");

    expect(screen.getByTestId("task-card-task-005")).toBeInTheDocument();
    expect(screen.queryByTestId("task-card-task-001")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "任务生产区" })).toBeInTheDocument();
  });

  it("duplicates the current task as a new draft", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /复制任务/ }));

    expect(screen.getByText("仓库门前的短暂停顿 · 副本")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("已复制 1 个任务");
  });

  it("opens the Task Composer from a task card double click", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.dblClick(screen.getByTestId("task-card-task-002"));

    expect(screen.getByTestId("task-composer")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Script Source" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Final Prompt" })).toBeInTheDocument();
  });
});
