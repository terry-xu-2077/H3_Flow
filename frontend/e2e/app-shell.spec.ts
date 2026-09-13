import { expect, test } from "@playwright/test";

async function openProduction(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "生产", exact: true }).click();
  await expect(page.getByRole("heading", { name: "任务生产区" })).toBeVisible();
}

test("storyboard-style Task Board is the default workspace with three clear columns", async ({ page }) => {
  await page.goto("/dev/ui");
  await expect(page.getByRole("heading", { name: "分镜式任务工作台" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Scene Navigator" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Storyboard Task Board" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Inspector" })).toBeVisible();
});

test("side columns collapse and give the storyboard more room", async ({ page }) => {
  await page.goto("/dev/ui");
  const canvas = page.getByRole("region", { name: "Storyboard Task Board" });
  const initialWidth = (await canvas.boundingBox())!.width;

  await page.getByRole("button", { name: "折叠 Scene Navigator" }).click();
  await page.getByRole("button", { name: "折叠 Inspector" }).click();

  await expect(page.getByRole("complementary", { name: "Scene Navigator" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Inspector" })).toHaveCount(0);
  if (page.viewportSize()!.width > 760) {
    expect((await canvas.boundingBox())!.width).toBeGreaterThan(initialWidth);
  }
});

test("each storyboard card is a Generation Task and can contain multiple visual beats", async ({ page }) => {
  await page.goto("/dev/ui");
  const taskCard = page.getByRole("option", { name: /T01-001.*多镜头 Task · 3 Beats/ });
  await taskCard.click();

  await expect(page.getByRole("heading", { name: "Task Inspector" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Inspector" })).toContainText("Visual Beats3");

  await taskCard.dblclick();
  await expect(page.getByTestId("task-composer")).toBeVisible();
});

test("storyboard Task cards support explicit multi-selection and batch inspection", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.locator('[data-task-id="task-harbor-arrival"]').click();
  await page.locator('[data-task-id="task-wall-image"]').click({ modifiers: ["Control"] });

  await expect(page.getByRole("region", { name: "Storyboard 批量操作" })).toContainText("已选择 2 个 Task");
  await expect(page.getByRole("heading", { name: "Batch Inspector" })).toBeVisible();
});

test("storyboard Task creation and duplication start with clean execution state", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByRole("button", { name: "新建 Task" }).click();
  await expect(page.getByRole("option", { name: /LOCAL-001 未命名生成任务 镜头描述待规划/ })).toBeVisible();

  await page.locator('[data-task-id="task-harbor-arrival"]').click();
  await page.getByRole("button", { name: "复制", exact: true }).click();
  const copy = page.getByRole("option", { name: /LOCAL-002 抵达仓库并发现门内异常 · 副本 多镜头 Task · 3 Beats/ });
  await expect(copy).toHaveAttribute("data-state", "draft");
  await expect(page.getByText(/未复制 Job、Result 与 Context/)).toBeVisible();
});

test("storyboard Task deletion confirms drafts and protects immutable history", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.locator('[data-task-id="task-draft"]').click();
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "删除 1 个 Task？" })).toBeVisible();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.locator('[data-task-id="task-draft"]')).toHaveCount(0);

  await page.locator('[data-task-id="task-harbor-arrival"]').click();
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "所选 Task 含历史记录，无法删除" })).toBeVisible();
  await expect(page.getByRole("button", { name: "确认删除" })).toHaveCount(0);
});

test("dragging a Task changes Story Order without changing its identity", async ({ page }) => {
  test.skip(page.viewportSize()!.width <= 760, "HTML drag interaction is verified on desktop");
  await page.goto("/dev/ui");
  const source = page.locator('[data-task-id="task-harbor-arrival"]');
  const target = page.locator('[data-task-id="task-voice"]');

  await source.dragTo(target);

  const sceneTwo = page.getByRole("listbox", { name: "Scene 02 Task Cards" });
  await expect(sceneTwo.locator('[data-task-id="task-harbor-arrival"]')).toHaveCount(1);
  await expect(sceneTwo.getByTestId("storyboard-task-card").first()).toHaveAttribute("data-task-id", "task-harbor-arrival");
  await expect(page.getByText(/Context Link 标记为待复核/)).toBeVisible();
  await expect(page.getByText("Generation Context 已变化，请选择更新 Context、保留现有 Result 或重新生成。")).toBeVisible();
});

test("Task cards support keyboard navigation, copy-paste, and Delete", async ({ page }) => {
  await page.goto("/dev/ui");
  const sceneOneLast = page.locator('[data-task-id="task-wall-image"]');
  await sceneOneLast.click();
  await sceneOneLast.press("ArrowRight");
  const nextTask = page.locator('[data-task-id="task-voice"]');
  await expect(nextTask).toHaveAttribute("aria-selected", "true");

  await nextTask.press("Control+c");
  await nextTask.press("Control+v");
  await expect(page.getByRole("option", { name: /LOCAL-001 声音从身后靠近 · 副本/ })).toBeVisible();

  const draft = page.locator('[data-task-id="task-draft"]');
  await draft.click();
  await draft.press("Delete");
  await expect(page.getByRole("dialog", { name: "删除 1 个 Task？" })).toBeVisible();
});

test("focused Inspectors edit Scene and Task intent and expose capability warnings", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByRole("textbox", { name: "Scene Name" }).fill("新仓库外景");
  await expect(page.getByRole("heading", { name: "新仓库外景" }).first()).toBeVisible();

  await page.locator('[data-task-id="task-harbor-arrival"]').click();
  await page.getByRole("textbox", { name: "Task Name" }).fill("多段抵达任务");
  await expect(page.getByRole("option", { name: /T01-001 多段抵达任务 多镜头 Task · 3 Beats/ })).toBeVisible();
  await expect(page.getByText("Visual Beats Summary")).toBeVisible();
  await expect(page.getByRole("region", { name: "Story Order 邻接" }).getByText(/T01-002 · 放映机自行启动/)).toBeVisible();

  await page.getByRole("button", { name: "Inspector Generation Profile" }).click();
  await page.getByRole("option", { name: /H3 · Fast Preview/ }).click();
  await expect(page.getByRole("alert")).toContainText("当前 Profile 不支持多镜头提示词");
});

test("Batch Inspector applies move, Profile, Asset, and Queue actions explicitly", async ({ page }) => {
  await page.goto("/dev/ui");
  const ready = page.locator('[data-task-id="task-wall-image"]');
  const draft = page.locator('[data-task-id="task-draft"]');
  await ready.click();
  await draft.click({ modifiers: ["Control"] });

  await page.getByRole("button", { name: "批量 Generation Profile" }).click();
  await page.getByRole("option", { name: /H3 · Fast Preview/ }).click();
  await page.getByRole("button", { name: "应用 Profile" }).click();
  await expect(ready).toContainText("H3 · Fast Preview");
  await expect(draft).toContainText("H3 · Fast Preview");

  await page.getByRole("button", { name: "绑定雨声参考资产" }).click();
  await page.getByRole("button", { name: "将 Ready Task 加入队列" }).click();
  await expect(ready).toHaveAttribute("data-state", "queued");
  await expect(page.getByText(/已加入队列 1 个；跳过 1 个未 Ready Task/)).toBeVisible();

  await page.getByRole("button", { name: "批量移动目标 Scene" }).click();
  await page.getByRole("option", { name: /Scene 02 · 仓库大厅/ }).click();
  await page.getByRole("button", { name: "移动所选 Task" }).click();
  await expect(page.getByRole("listbox", { name: "Scene 02 Task Cards" }).locator('[data-task-id="task-wall-image"]')).toHaveCount(1);
});

test("script proposals remain editable until explicit Task creation", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByRole("button", { name: "从剧本创建任务" }).click();
  await expect(page.getByRole("dialog", { name: "从剧本创建 Task Cards" })).toBeVisible();
  await expect(page.getByTestId("storyboard-task-card")).toHaveCount(6);

  await page.getByRole("button", { name: "生成 Mock AI Proposal" }).click();
  await expect(page.getByRole("article", { name: /Task Proposal/ })).toHaveCount(2);
  await expect(page.getByTestId("storyboard-task-card")).toHaveCount(6);

  const firstProposal = page.getByRole("article", { name: "Task Proposal 1" });
  await firstProposal.getByRole("button", { name: "与下一个合并" }).click();
  await expect(page.getByRole("article", { name: /Task Proposal/ })).toHaveCount(1);
  await page.getByRole("article", { name: "Task Proposal 1" }).getByRole("button", { name: "拆分" }).click();
  await expect(page.getByRole("article", { name: /Task Proposal/ })).toHaveCount(2);

  const editableProposal = page.getByRole("article", { name: "Task Proposal 1" });
  await editableProposal.getByRole("textbox", { name: "Proposal 1 Visual Beats" }).fill("建立仓库外景\n靠近人物\n推门收束");
  await expect(editableProposal).toContainText("3 Visual Beats");
  await editableProposal.getByRole("button", { name: "接受并创建" }).click();
  await expect(page.getByTestId("storyboard-task-card")).toHaveCount(7);
  await expect(page.getByRole("article", { name: /Task Proposal/ })).toHaveCount(1);

  await page.getByRole("button", { name: /接受全部并创建 1 个 Task/ }).click();
  await expect(page.getByRole("dialog", { name: "从剧本创建 Task Cards" })).toHaveCount(0);
  await expect(page.getByTestId("storyboard-task-card")).toHaveCount(8);
});

test("Asset Library binding uses asset_id, project-relative paths, and explicit confirm or cancel", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByRole("button", { name: "资产", exact: true }).click();
  await expect(page.getByRole("heading", { name: "资产库" })).toBeVisible();
  await page.getByRole("textbox", { name: "资产库搜索" }).fill("雨声");
  await page.getByRole("button", { name: /雨声与远处汽笛/ }).click();
  const assetDetails = page.getByRole("complementary", { name: "资产详情" });
  await expect(assetDetails).toContainText("asset_id: asset-rain-audio");
  await expect(assetDetails).toContainText("assets/audio/harbor-rain.wav");

  await page.getByRole("button", { name: "分镜", exact: true }).click();
  const task = page.locator('[data-task-id="task-wall-image"]');
  await task.click();
  const assetMetric = page.locator(".storyboard-metrics > div").filter({ hasText: "Assets" });
  await expect(assetMetric).toContainText("0");

  await page.getByRole("button", { name: "管理 Task 资产" }).click();
  await page.getByRole("textbox", { name: "搜索资产" }).fill("雨声");
  let rainOption = page.getByRole("option", { name: /雨声与远处汽笛/ });
  await rainOption.getByRole("button").last().click();
  await page.getByRole("button", { name: "取消" }).click();
  await expect(assetMetric).toContainText("0");

  await page.getByRole("button", { name: "管理 Task 资产" }).click();
  await page.getByRole("textbox", { name: "搜索资产" }).fill("雨声");
  rainOption = page.getByRole("option", { name: /雨声与远处汽笛/ });
  await rainOption.getByRole("button").last().click();
  await page.getByRole("button", { name: "确认绑定" }).click();
  await expect(assetMetric).toContainText("1");

  await task.dblclick();
  const finalPrompt = page.getByRole("textbox", { name: "Final Prompt" });
  await finalPrompt.fill("");
  await finalPrompt.pressSequentially("环境声 @雨");
  await page.getByRole("option", { name: /雨声与远处汽笛/ }).click();
  await expect(finalPrompt).toHaveValue("环境声 <Audio 1> ");
  await expect(page.locator('small[title="assets/audio/harbor-rain.wav"]')).toBeVisible();
});

test("multi-shot Composer edits Visual Beats inside one Task and persists intent", async ({ page }) => {
  await page.goto("/dev/ui");
  const task = page.locator('[data-task-id="task-harbor-arrival"]');
  await task.dblclick();

  await expect(page.getByRole("region", { name: "Task Visual Beats" })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(3);
  await page.getByRole("tab", { name: /建立/ }).click();
  await page.getByRole("textbox", { name: "Beat Label" }).fill("雨港建立");
  await page.getByRole("button", { name: "+ 添加 Beat" }).click();
  await expect(page.getByRole("tab")).toHaveCount(4);
  await page.getByRole("button", { name: "删除 Beat" }).click();
  await expect(page.getByRole("tab")).toHaveCount(3);

  await page.getByRole("button", { name: "Generation Profile" }).click();
  await page.getByRole("option", { name: /H3 · Fast Preview/ }).click();
  await expect(page.getByRole("alert")).toContainText("当前 Profile 不支持多镜头提示词");
  await page.getByRole("textbox", { name: "Final Prompt" }).fill("MANUAL MULTI-SHOT FINAL");
  await page.getByRole("button", { name: "返回任务" }).click();

  await expect(page.getByText("雨港建立")).toBeVisible();
  await page.locator('[data-task-id="task-harbor-arrival"]').dblclick();
  await expect(page.getByRole("textbox", { name: "Final Prompt" })).toHaveValue("MANUAL MULTI-SHOT FINAL");
});

test("Ready Validation creates one immutable Task Job snapshot before queueing", async ({ page }) => {
  await page.goto("/dev/ui");
  const task = page.locator('[data-task-id="task-wall-image"]');
  await task.click();

  const validation = page.getByRole("region", { name: "Ready Validation" });
  await expect(validation).toContainText("可生成");
  await validation.getByRole("button", { name: "运行 Ready 校验" }).click();
  await validation.getByRole("button", { name: "加入生成队列" }).click();

  await expect(task).toHaveAttribute("data-state", "queued");
  await expect(page.getByRole("region", { name: "Prompt 与执行" })).toContainText("Jobs1");
  await expect(page.getByText(/创建不可变 Job 快照/)).toBeVisible();
});

test("Provider offline and stale Context are visible blockers with explicit recovery", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByRole("button", { name: "场景", exact: true }).click();
  await page.getByRole("button", { name: "Provider 状态" }).click();
  await page.getByRole("option", { name: "离线", exact: true }).click();
  await page.getByRole("button", { name: "收起场景" }).click();

  await page.locator('[data-task-id="task-wall-image"]').click();
  const validation = page.getByRole("region", { name: "Ready Validation" });
  await expect(validation).toContainText("Video Generation Provider 当前离线");
  await expect(validation.getByRole("button", { name: "加入生成队列" })).toBeDisabled();

  await page.locator('[data-task-id="task-harbor-arrival"]').click();
  await page.getByRole("textbox", { name: "Task Name" }).pressSequentially(" 更新");
  await page.locator('[data-task-id="task-hall-projector"]').click();
  const context = page.getByRole("region", { name: "Generation Context" });
  await expect(context).toContainText("Context Stale");
  await context.getByRole("button", { name: "更新 Context" }).click();
  await expect(context).not.toContainText("Context Stale");
  await expect(context).toContainText("result-arrival-1");
});

test("Result Review keeps Task history, changes Primary, and returns to the same Task card", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByRole("button", { name: "结果" }).click();
  await expect(page.getByRole("region", { name: "Result Review" })).toContainText("完整 Generation Task");

  const filters = page.getByRole("navigation", { name: "Result 筛选" });
  await filters.getByRole("button", { name: /^全部/ }).click();
  const latest = page.locator('[data-result-id="result-arrival-2"]');
  await expect(latest).toContainText("完整多镜头 Task · 3 Beats");
  await expect(latest).toContainText("LATEST");

  await latest.getByRole("button", { name: "预览 result-arrival-2" }).click();
  await expect(page.getByRole("dialog", { name: /Result Preview/ })).toContainText("不会按 Visual Beat 拆成多个结果");
  await page.keyboard.press("Escape");

  await latest.getByRole("button", { name: "通过" }).click();
  await latest.getByRole("button", { name: "设为 Primary" }).click();
  await expect(latest).toContainText("PRIMARY");
  await expect(page.getByRole("status")).toContainText("1 条下游 Context 标记为 Stale");

  await latest.getByRole("button", { name: "打开历史" }).click();
  const history = page.getByRole("dialog", { name: /Result History/ });
  await expect(history).toContainText("result-arrival-1");
  await expect(history).toContainText("result-arrival-2");
  await page.keyboard.press("Escape");

  await latest.getByRole("button", { name: "重新生成" }).click();
  await expect(page.getByRole("status")).toContainText("旧 Job 与 Result 保持不变");
  await latest.getByRole("button", { name: "编辑 Task" }).click();
  await expect(page.getByRole("heading", { name: "Task Inspector" })).toBeVisible();
  const taskCard = page.locator('[data-task-id="task-harbor-arrival"]');
  await expect(taskCard).toHaveAttribute("aria-selected", "true");
  await expect(taskCard.locator(".storyboard-task-frame")).toHaveAttribute("data-frame-source", "primary-result");
});

test("Story Reel follows Task Story Order without splitting a multi-shot Task", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByRole("button", { name: "Story Reel" }).click();

  const reel = page.getByRole("region", { name: "Story Reel" });
  const stage = page.locator(".story-reel-stage");
  await expect(reel).toContainText("T01-001");
  await expect(stage).toHaveAttribute("data-source", "Primary Task Result");
  await expect(stage).toContainText("完整多镜头 Task · 3 Beats");

  await page.getByRole("button", { name: /Next Task/ }).click();
  await expect(stage).toContainText("T01-002");
  await expect(stage).toHaveAttribute("data-source", "Placeholder");

  await page.getByRole("button", { name: /T02-001/ }).click();
  await expect(stage).toContainText("声音从身后靠近");
  await expect(reel).toContainText("Planned Duration 7s");

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Trim|Transition|Track|Keyframe|Razor/i })).toHaveCount(0);

  const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  await page.getByRole("button", { name: "返回 Storyboard" }).click();
  await expect(page.locator('[data-task-id="task-harbor-arrival"]')).toBeVisible();
});

test("dense Task Board remains scannable across target desktop widths", async ({ page }) => {
  test.skip(page.viewportSize()!.width <= 760, "Gate S1 desktop density check");
  await page.goto("/dev/ui");
  await page.getByRole("button", { name: "场景", exact: true }).click();
  await page.getByRole("button", { name: "分镜内容量" }).click();
  await page.getByRole("option", { name: "36 Tasks" }).click();
  await expect(page.getByTestId("storyboard-task-card")).toHaveCount(36);
  const firstRowHeights = await page.getByTestId("storyboard-task-card").evaluateAll((cards) =>
    cards.slice(0, 3).map((card) => card.getBoundingClientRect().height),
  );
  expect(Math.max(...firstRowHeights) - Math.min(...firstRowHeights)).toBeLessThanOrEqual(1);

  for (const [width, height] of [[1366, 768], [1600, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height });
    await expect(page.getByRole("region", { name: "Storyboard Task Board" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  }
});

test("visual regression fixtures cover dense states, long titles, multi-shot Tasks, and empty Scenes", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByRole("button", { name: "场景", exact: true }).click();
  await page.getByRole("button", { name: "分镜内容量" }).click();
  await page.getByRole("option", { name: "36 Tasks" }).click();

  await expect(page.getByTestId("storyboard-task-card")).toHaveCount(36);
  await expect(page.locator('[data-state="ready"]').first()).toBeVisible();
  await expect(page.locator('[data-state="running"]').first()).toBeVisible();
  await expect(page.locator('[data-state="failed"]').first()).toBeVisible();
  await expect(page.locator('[data-state="context-stale"]').first()).toBeVisible();
  await expect(page.getByText("用于验证极长标题在高密度卡片中仍保持稳定布局的生成任务").first()).toBeVisible();
  await expect(page.getByText("多镜头 Task · 3 Beats").first()).toBeVisible();

  await page.getByRole("button", { name: "分镜内容量" }).click();
  await page.getByRole("option", { name: "空 Scene" }).click();
  await expect(page.getByText("此 Scene 还没有 Task Card")).toHaveCount(3);
  const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});

test("ctrl click exposes the batch action bar", async ({ page }) => {
  await page.goto("/dev/ui");
  await openProduction(page);
  await page.getByTestId("task-card-task-003").click({ modifiers: ["Control"] });
  await expect(page.getByRole("region", { name: "批量操作" })).toContainText("已选择 2 个任务");
});

test("shift click selects a contiguous visible range", async ({ page }) => {
  await page.goto("/dev/ui");
  await openProduction(page);
  await page.getByTestId("task-card-task-005").click({ modifiers: ["Shift"] });
  await expect(page.getByRole("region", { name: "批量操作" })).toContainText("已选择 4 个任务");
});

test("search and status filters keep task state deterministic", async ({ page }) => {
  await page.goto("/dev/ui");
  await openProduction(page);
  await page.getByRole("textbox", { name: "搜索任务" }).fill("声音从身后");
  await expect(page.getByTestId("task-card-task-005")).toBeVisible();
  await expect(page.getByTestId("task-card-task-001")).toHaveCount(0);

  await page.getByRole("textbox", { name: "搜索任务" }).fill("");
  await page.getByRole("button", { name: /需要处理/ }).click();
  await expect(page.locator(".task-card")).toHaveCount(2);
});
