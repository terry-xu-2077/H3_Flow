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

async function openFirstProject(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "打开项目 异星边境 初到基地" }));
}

describe("V0.5 Terry导演工作台", () => {
  it("默认打开项目首页，只负责选择或新建项目", () => {
    renderApp();

    expect(screen.getByRole("main", { name: "项目首页" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Terry导演工作台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开项目 异星边境 初到基地" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开项目 诡道异仙 第一部" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开项目 重生之我是高中学霸" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建项目" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "主导航" })).not.toBeInTheDocument();
  });

  it("进入项目后默认是列表模式，并提供显式新建任务按钮", async () => {
    const user = userEvent.setup();
    renderApp();
    await openFirstProject(user);

    expect(screen.getByRole("main", { name: "项目工作台" })).toBeInTheDocument();
    expect(screen.getAllByText("异星边境 初到基地").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /表格/ })).toHaveClass("is-active");
    expect(screen.getByRole("button", { name: /新建任务/ })).toBeInTheDocument();
    expect(screen.getByText("#1 特瑞在荒漠驰骋")).toBeInTheDocument();
    expect(screen.getByText("#2 越过断层台地")).toBeInTheDocument();
    expect(screen.getByText("#3 驶入临时基地")).toBeInTheDocument();
  });

  it("单击任务只更新右侧只读信息栏，不进入编辑", async () => {
    const user = userEvent.setup();
    renderApp();
    await openFirstProject(user);

    await user.click(screen.getByText("#2 越过断层台地").closest("button")!);

    const info = screen.getByRole("complementary", { name: "任务信息" });
    expect(within(info).getByText("任务名：越过断层台地")).toBeInTheDocument();
    expect(within(info).getByText("提示词")).toBeInTheDocument();
    expect(within(info).getByText("生成参数")).toBeInTheDocument();
    expect(within(info).queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /编辑任务/ })).not.toBeInTheDocument();
  });

  it("双击或右键任务进入同一套悬浮编辑窗", async () => {
    const user = userEvent.setup();
    renderApp();
    await openFirstProject(user);

    const firstRow = screen.getByText("#1 特瑞在荒漠驰骋").closest("button")!;
    await user.dblClick(firstRow);
    expect(screen.getByRole("dialog", { name: /编辑任务 · T01-001/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "取消" }));

    const secondRow = screen.getByText("#2 越过断层台地").closest("button")!;
    fireEvent.contextMenu(secondRow);
    fireEvent.click(screen.getByRole("menuitem", { name: "编辑任务" }));
    expect(screen.getByRole("dialog", { name: /编辑任务 · T01-002/ })).toBeInTheDocument();
  });

  it("列表和卡片是同一任务集合的两种视图，卡片模式有新建任务卡", async () => {
    const user = userEvent.setup();
    renderApp();
    await openFirstProject(user);

    await user.click(screen.getByRole("button", { name: /卡片/ }));

    expect(screen.getByRole("button", { name: /卡片/ })).toHaveClass("is-active");
    expect(screen.getByRole("button", { name: "新建任务卡" })).toBeInTheDocument();
    expect(screen.getByText("#1 特瑞在荒漠驰骋")).toBeInTheDocument();
    expect(screen.getByText("#2 越过断层台地")).toBeInTheDocument();
    expect(screen.getByText("#3 驶入临时基地")).toBeInTheDocument();
  });

  it("列表模式的新建任务按钮直接打开任务编辑弹窗", async () => {
    const user = userEvent.setup();
    renderApp();
    await openFirstProject(user);

    await user.click(screen.getByRole("button", { name: /新建任务/ }));

    const dialog = screen.getByRole("dialog", { name: /编辑任务/ });
    expect(within(dialog).getByText("任务配置")).toBeInTheDocument();
    expect(within(dialog).getByRole("region", { name: "提示词编辑" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "取消" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "保存" })).toBeInTheDocument();
  });

  it("底部只显示设置入口和当前运行摘要", async () => {
    const user = userEvent.setup();
    renderApp();
    await openFirstProject(user);

    expect(screen.getByRole("button", { name: /设置/ })).toBeInTheDocument();
    expect(screen.getByText(/当前运行：异星边境 初到基地 · 任务名：越过断层台地/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "生成" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "素材" })).not.toBeInTheDocument();
  });

  it("点击工作台标题返回项目首页", async () => {
    const user = userEvent.setup();
    renderApp();
    await openFirstProject(user);

    await user.click(screen.getByRole("button", { name: "Terry导演工作台" }));
    expect(screen.getByRole("main", { name: "项目首页" })).toBeInTheDocument();
  });
});
