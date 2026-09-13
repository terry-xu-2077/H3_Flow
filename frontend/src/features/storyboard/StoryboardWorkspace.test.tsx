import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StoryboardWorkspace } from "./StoryboardWorkspace";
import { OverlayProvider } from "../../ui/overlay";

describe("StoryboardWorkspace", () => {
  it("renders the dense Gate S1 scenario with 30+ Task Cards and multi-shot Tasks", () => {
    render(<StoryboardWorkspace density="dense" />);

    expect(screen.getAllByTestId("storyboard-task-card")).toHaveLength(36);
    expect(screen.getAllByText(/12 Tasks · 96s planned · 2 Running · 4 Needs Attention/)).toHaveLength(3);
    expect(screen.getAllByText(/多镜头 Task · 3 Beats/)).toHaveLength(12);
  });

  it("keeps empty Scenes visible instead of dropping them from story order", () => {
    render(<StoryboardWorkspace density="empty" />);

    expect(screen.getAllByText("此 Scene 还没有 Task Card")).toHaveLength(3);
    expect(screen.queryAllByTestId("storyboard-task-card")).toHaveLength(0);
  });

  it("supports explicit multi-selection with a stable Task batch bar", async () => {
    const user = userEvent.setup();
    render(<StoryboardWorkspace density="normal" />);

    await user.click(screen.getByRole("option", { name: /T01-001/ }));
    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("option", { name: /T01-003/ }));
    await user.keyboard("{/Control}");

    expect(screen.getByRole("region", { name: "Storyboard 批量操作" })).toHaveTextContent("已选择 2 个 Task");
    expect(screen.getByRole("heading", { name: "Batch Inspector" })).toBeInTheDocument();
  });

  it("creates a blank Task and duplicates content without exposing old execution state", async () => {
    const user = userEvent.setup();
    render(<StoryboardWorkspace density="normal" />);

    await user.click(screen.getByRole("button", { name: "新建 Task" }));
    expect(screen.getAllByTestId("storyboard-task-card")).toHaveLength(7);
    expect(screen.getByRole("option", { name: /LOCAL-001 未命名生成任务 镜头描述待规划/ })).toHaveAttribute("data-state", "draft");

    await user.click(screen.getByRole("option", { name: /T01-001/ }));
    await user.click(screen.getByRole("button", { name: "复制" }));
    const copy = screen.getByRole("option", { name: /LOCAL-002 抵达仓库并发现门内异常 · 副本 多镜头 Task · 3 Beats/ });
    expect(copy).toHaveAttribute("data-state", "draft");
    expect(screen.getByText(/未复制 Job、Result 与 Context/)).toBeInTheDocument();
  });

  it("requires confirmation before deleting a Task without history", async () => {
    const user = userEvent.setup();
    render(<StoryboardWorkspace density="normal" />);

    await user.click(screen.getByRole("option", { name: /T02-003/ }));
    await user.click(screen.getByRole("button", { name: /^删除$/ }));
    expect(screen.getByRole("dialog", { name: "删除 1 个 Task？" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "确认删除" }));
    expect(screen.queryByRole("option", { name: /T02-003/ })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("storyboard-task-card")).toHaveLength(5);
  });

  it("protects Tasks that already own Job or Result history", async () => {
    const user = userEvent.setup();
    render(<StoryboardWorkspace density="normal" />);

    await user.click(screen.getByRole("option", { name: /T01-001/ }));
    await user.click(screen.getByRole("button", { name: /^删除$/ }));

    expect(screen.getByRole("dialog", { name: "所选 Task 含历史记录，无法删除" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "确认删除" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /T01-001/ })).toBeInTheDocument();
  });

  it("supports keyboard navigation, Storyboard clipboard duplication, and Delete", async () => {
    const user = userEvent.setup();
    render(<StoryboardWorkspace density="normal" />);

    const lastTaskInSceneOne = screen.getByRole("option", { name: /T01-003/ });
    await user.click(lastTaskInSceneOne);
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("option", { name: /T02-001/ })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Control>}c{/Control}{Control>}v{/Control}");
    expect(screen.getByRole("option", { name: /LOCAL-001 声音从身后靠近 · 副本/ })).toHaveAttribute("data-state", "draft");

    await user.keyboard("{Escape}");
    expect(screen.getAllByRole("option").every((option) => option.getAttribute("aria-selected") === "false")).toBe(true);

    await user.click(screen.getByRole("option", { name: /T02-003/ }));
    await user.keyboard("{Delete}");
    expect(screen.getByRole("dialog", { name: "删除 1 个 Task？" })).toBeInTheDocument();
  });

  it("edits Scene and Task intent through the focused Inspector", async () => {
    const user = userEvent.setup();
    render(<StoryboardWorkspace density="normal" />);

    await user.clear(screen.getByRole("textbox", { name: "Scene Name" }));
    await user.type(screen.getByRole("textbox", { name: "Scene Name" }), "新仓库外景");
    expect(screen.getAllByRole("heading", { name: "新仓库外景" }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("option", { name: /T01-001/ }));
    const taskName = screen.getByRole("textbox", { name: "Task Name" });
    await user.clear(taskName);
    await user.type(taskName, "多段抵达任务");
    expect(screen.getByRole("option", { name: /T01-001 多段抵达任务 多镜头 Task · 3 Beats/ })).toBeInTheDocument();
    expect(screen.getByText("Visual Beats Summary")).toBeInTheDocument();
    expect(screen.getAllByText(/T01-002 · 放映机自行启动/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Inspector Generation Profile" }));
    await user.click(screen.getByRole("option", { name: /H3 · Fast Preview/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("当前 Profile 不支持多镜头提示词");
  });

  it("offers explicit Batch Inspector move, Profile, Asset, and Queue actions", async () => {
    const user = userEvent.setup();
    render(<StoryboardWorkspace density="normal" />);

    await user.click(screen.getByRole("option", { name: /T01-003/ }));
    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("option", { name: /T02-003/ }));
    await user.keyboard("{/Control}");

    await user.click(screen.getByRole("button", { name: "批量 Generation Profile" }));
    await user.click(screen.getByRole("option", { name: /H3 · Fast Preview/ }));
    await user.click(screen.getByRole("button", { name: "应用 Profile" }));
    expect(screen.getByRole("option", { name: /T01-003/ })).toHaveTextContent("H3 · Fast Preview");
    expect(screen.getByRole("option", { name: /T02-003/ })).toHaveTextContent("H3 · Fast Preview");

    await user.click(screen.getByRole("button", { name: "绑定雨声参考资产" }));
    await user.click(screen.getByRole("button", { name: "将 Ready Task 加入队列" }));
    expect(screen.getByRole("option", { name: /T01-003/ })).toHaveAttribute("data-state", "queued");
    expect(screen.getByText(/已加入队列 1 个；跳过 1 个未 Ready Task/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "批量移动目标 Scene" }));
    await user.click(screen.getByRole("option", { name: /Scene 02 · 仓库大厅/ }));
    await user.click(screen.getByRole("button", { name: "移动所选 Task" }));
    expect(screen.getByRole("listbox", { name: "Scene 02 Task Cards" })).toContainElement(screen.getByRole("option", { name: /T01-003/ }));
  });

  it("keeps script proposals editable and temporary until explicit acceptance", async () => {
    const user = userEvent.setup();
    render(<StoryboardWorkspace density="normal" />);

    await user.click(screen.getByRole("button", { name: "从剧本创建任务" }));
    expect(screen.getByRole("dialog", { name: "从剧本创建分镜" })).toBeInTheDocument();
    expect(screen.getAllByTestId("storyboard-task-card")).toHaveLength(6);

    await user.click(screen.getByRole("button", { name: "AI 建议分镜" }));
    expect(screen.getAllByRole("article", { name: /分镜建议/ })).toHaveLength(2);
    expect(screen.getAllByTestId("storyboard-task-card")).toHaveLength(6);

    const firstProposal = screen.getByRole("article", { name: "分镜建议 1" });
    const firstTitleEditor = within(firstProposal).getByRole("textbox", { name: "分镜标题" });
    await user.clear(firstTitleEditor);
    await user.type(firstTitleEditor, "推门前的异常停顿");
    expect(firstTitleEditor).toHaveValue("推门前的异常停顿");
    expect(firstProposal).toHaveTextContent("3 个内部镜头");

    await user.click(within(firstProposal).getByRole("button", { name: "创建分镜" }));
    expect(screen.getAllByTestId("storyboard-task-card")).toHaveLength(7);
    expect(screen.getAllByRole("article", { name: /分镜建议/ })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /创建全部 1 个分镜/ }));
    expect(screen.queryByRole("dialog", { name: "从剧本创建分镜" })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("storyboard-task-card")).toHaveLength(8);
  });

  it("persists Composer edits back to the current GenerationTask", async () => {
    const user = userEvent.setup();
    render(<OverlayProvider><StoryboardWorkspace density="normal" /></OverlayProvider>);

    await user.dblClick(screen.getByRole("option", { name: /T01-001/ }));
    await user.click(screen.getByRole("tab", { name: /建立/ }));
    await user.clear(screen.getByRole("textbox", { name: "Beat Label" }));
    await user.type(screen.getByRole("textbox", { name: "Beat Label" }), "雨港建立");
    await user.click(screen.getByRole("button", { name: "返回任务" }));

    expect(screen.getByRole("heading", { name: "Task Inspector" })).toBeInTheDocument();
    expect(screen.getByText("雨港建立")).toBeInTheDocument();
  });

  it("validates a Task and queues it with a new immutable Job snapshot", async () => {
    const user = userEvent.setup();
    render(<OverlayProvider><StoryboardWorkspace density="normal" providerOnline /></OverlayProvider>);

    await user.click(screen.getByRole("option", { name: /T01-003/ }));
    const validation = screen.getByRole("region", { name: "Ready Validation" });
    expect(validation).toHaveTextContent("可生成");

    await user.click(within(validation).getByRole("button", { name: "运行 Ready 校验" }));
    await user.click(within(validation).getByRole("button", { name: "加入生成队列" }));

    expect(screen.getByRole("option", { name: /T01-003/ })).toHaveAttribute("data-state", "queued");
    expect(screen.getByRole("region", { name: "Prompt 与执行" })).toHaveTextContent("Jobs1");
    expect(screen.getByText(/创建不可变 Job 快照/)).toBeInTheDocument();
  });

  it("blocks Ready Validation while the Provider is offline", async () => {
    const user = userEvent.setup();
    render(<OverlayProvider><StoryboardWorkspace density="normal" providerOnline={false} /></OverlayProvider>);

    await user.click(screen.getByRole("option", { name: /T01-003/ }));
    const validation = screen.getByRole("region", { name: "Ready Validation" });

    expect(validation).toHaveTextContent("Video Generation Provider 当前离线");
    expect(within(validation).getByRole("button", { name: "加入生成队列" })).toBeDisabled();
  });

  it("shows Generation Context separately from Story Order and refreshes stale links explicitly", async () => {
    const user = userEvent.setup();
    render(<OverlayProvider><StoryboardWorkspace density="normal" /></OverlayProvider>);

    await user.click(screen.getByRole("option", { name: /T01-001/ }));
    await user.type(screen.getByRole("textbox", { name: "Task Name" }), " 更新");
    await user.click(screen.getByRole("option", { name: /T01-002/ }));

    const context = screen.getByRole("region", { name: "Generation Context" });
    expect(context).toHaveTextContent("Context Stale");
    expect(screen.getByRole("region", { name: "Story Order 邻接" })).toHaveTextContent("T01-001");

    await user.click(within(context).getByRole("button", { name: "更新 Context" }));
    expect(context).not.toHaveTextContent("Context Stale");
    expect(context).toHaveTextContent("result-arrival-1");
  });

  it("opens Story Reel from the Task workspace and returns without changing card identity", async () => {
    const user = userEvent.setup();
    render(<OverlayProvider><StoryboardWorkspace density="normal" /></OverlayProvider>);

    await user.click(screen.getByRole("button", { name: "Story Reel" }));
    expect(screen.getByRole("region", { name: "连续预览" })).toHaveTextContent("T01-001");
    expect(screen.getByText("包含 3 个内部镜头")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "返回故事板" }));
    expect(screen.getByRole("region", { name: "Storyboard Task Board" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /T01-001/ })).toHaveAttribute("data-task-id", "task-harbor-arrival");
  });
});
