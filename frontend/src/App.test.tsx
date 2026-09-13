import { fireEvent, render, screen, within } from "@testing-library/react";
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

describe("简化故事板界面", () => {
  it("默认只有故事板、生成和素材三个一级工作区", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "故事板" })).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "故事板画布" })).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "主导航" });
    expect(within(nav).getByRole("button", { name: "故事板" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "生成" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "素材" })).toBeInTheDocument();
    expect(within(nav).queryByRole("button", { name: "结果" })).not.toBeInTheDocument();
  });

  it("卡片不暴露工程参数", () => {
    renderApp();

    expect(screen.getByText("抵达仓库并发现门内异常")).toBeInTheDocument();
    expect(screen.getByText("放映机自行启动")).toBeInTheDocument();
    expect(screen.queryByText("H3 · Multi-shot")).not.toBeInTheDocument();
    expect(screen.queryByText(/Visual Beats/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Context Link/i)).not.toBeInTheDocument();
  });

  it("单击卡片只显示只读信息，不进入编辑状态", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /查看 T01-002 放映机自行启动/ }));

    const detail = screen.getByRole("complementary", { name: "分镜信息" });
    expect(within(detail).getByText("画面描述")).toBeInTheDocument();
    expect(within(detail).getByText("时长")).toBeInTheDocument();
    expect(within(detail).getByText("素材")).toBeInTheDocument();
    expect(within(detail).getByText("已衔接上一分镜")).toBeInTheDocument();
    expect(within(detail).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(detail).queryByText("高级设置")).not.toBeInTheDocument();
    expect(within(detail).getByText(/双击卡片或右键/)).toBeInTheDocument();
  });

  it("双击卡片打开简化的悬浮任务编辑窗", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.dblClick(screen.getByRole("button", { name: /查看 T01-001 抵达仓库并发现门内异常/ }));

    const dialog = screen.getByRole("dialog", { name: /编辑分镜 · T01-001/ });
    expect(within(dialog).getByText("任务配置")).toBeInTheDocument();
    expect(within(dialog).getByRole("region", { name: "提示词编辑" })).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: "用户" })).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: /AI 增强/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "取消" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "保存" })).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent("Generation Profile");
    expect(dialog).not.toHaveTextContent("Visual Beat");
    expect(dialog).not.toHaveTextContent("Validator");
  });

  it("右键卡片可以从菜单进入编辑", () => {
    renderApp();

    const card = screen.getByRole("button", { name: /查看 T01-003 墙面出现旧影像/ });
    fireEvent.contextMenu(card.closest("article")!);
    const menu = screen.getByRole("menu", { name: "分镜菜单" });
    fireEvent.click(within(menu).getByRole("menuitem", { name: "编辑分镜" }));

    expect(screen.getByRole("dialog", { name: /编辑分镜 · T01-003/ })).toBeInTheDocument();
  });

  it("生成页只承担队列监控", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "生成" }));

    expect(screen.getByRole("region", { name: "生成队列" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "生成" })).toBeInTheDocument();
    expect(screen.getByText("放映机自行启动")).toBeInTheDocument();
    expect(screen.getByText("43%")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "用户提示词" })).not.toBeInTheDocument();
  });

  it("新建分镜后直接进入同一套简化编辑窗", async () => {
    const user = userEvent.setup();
    renderApp();

    const harborScene = screen.getByTestId("director-scene-scene-harbor");
    await user.click(within(harborScene).getByRole("button", { name: "添加分镜" }));

    expect(screen.getByRole("dialog", { name: /编辑分镜/ })).toBeInTheDocument();
    expect(screen.getByText("已添加一个空白分镜")).toBeInTheDocument();
  });

  it("素材保持为独立辅助工作区", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "素材" }));

    expect(screen.getByText("林澜 · 雨夜造型")).toBeInTheDocument();
    expect(screen.getByText("项目素材")).toBeInTheDocument();
  });
});