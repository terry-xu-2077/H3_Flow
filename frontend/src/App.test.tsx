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

describe("Director Mode app shell", () => {
  it("opens on a single-canvas storyboard with only three primary work areas", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "故事板" })).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "故事板画布" })).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "主导航" });
    expect(within(nav).getByRole("button", { name: "故事板" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "生成" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "素材" })).toBeInTheDocument();
    expect(within(nav).queryByRole("button", { name: "结果" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Inspector" })).not.toBeInTheDocument();
  });

  it("keeps engineering parameters off storyboard cards", () => {
    renderApp();

    expect(screen.getByText("抵达仓库并发现门内异常")).toBeInTheDocument();
    expect(screen.getByText("放映机自行启动")).toBeInTheDocument();
    expect(screen.queryByText("H3 · Multi-shot")).not.toBeInTheDocument();
    expect(screen.queryByText(/Visual Beats/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Context Link/i)).not.toBeInTheDocument();
  });

  it("opens a lightweight shot detail before advanced settings", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /编辑 T01-002 放映机自行启动/ }));

    const detail = screen.getByRole("complementary", { name: "分镜详情" });
    expect(within(detail).getByText("画面描述")).toBeInTheDocument();
    expect(within(detail).getByText("时长")).toBeInTheDocument();
    expect(within(detail).getByText("素材")).toBeInTheDocument();
    expect(within(detail).getByText("已自动衔接上一分镜")).toBeInTheDocument();
    expect(within(detail).getByRole("button", { name: /生成视频/ })).toBeInTheDocument();
    expect(within(detail).getByRole("button", { name: /高级设置/ })).toBeInTheDocument();
    expect(detail).not.toHaveTextContent("Generation Profile");
    expect(detail).not.toHaveTextContent("Final Prompt");
  });

  it("keeps the complete composer available behind Advanced Settings", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /编辑 T01-001 抵达仓库并发现门内异常/ }));
    await user.click(screen.getByRole("button", { name: /高级设置/ }));

    expect(screen.getByTestId("task-composer")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Final Prompt" })).toBeInTheDocument();
  });

  it("uses Production only as a queue monitor, not a second editor", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "生成" }));

    expect(screen.getByRole("region", { name: "生成队列" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "生成" })).toBeInTheDocument();
    expect(screen.getByText("放映机自行启动")).toBeInTheDocument();
    expect(screen.getByText("43%")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /新建任务|新建分镜|复制任务/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Final Prompt" })).not.toBeInTheDocument();
  });

  it("adds a new shot from the scene itself instead of a global parameter form", async () => {
    const user = userEvent.setup();
    renderApp();

    const harborScene = screen.getByTestId("director-scene-scene-harbor");
    await user.click(within(harborScene).getByRole("button", { name: "添加分镜" }));

    expect(screen.getByRole("complementary", { name: "分镜详情" })).toHaveTextContent("未命名分镜");
    expect(screen.getByRole("status")).toHaveTextContent("已添加一个空白分镜");
  });

  it("keeps Assets as a separate supporting workspace", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "素材" }));

    expect(screen.getByText("林澜 · 雨夜造型")).toBeInTheDocument();
  });
});
