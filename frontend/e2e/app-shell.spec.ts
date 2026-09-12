import { expect, test } from "@playwright/test";

test("task workspace remains usable at the target viewport", async ({ page }) => {
  await page.goto("/dev/ui");
  await expect(page.getByRole("heading", { name: "任务生产区" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
  await expect(page.getByRole("button", { name: /新建任务/ })).toBeVisible();
});

test("ctrl click exposes the batch action bar", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByTestId("task-card-task-003").click({ modifiers: ["Control"] });
  await expect(page.getByRole("region", { name: "批量操作" })).toContainText("已选择 2 个任务");
});

test("shift click selects a contiguous visible range", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByTestId("task-card-task-005").click({ modifiers: ["Shift"] });
  await expect(page.getByRole("region", { name: "批量操作" })).toContainText("已选择 4 个任务");
});

test("search and status filters keep task state deterministic", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByRole("textbox", { name: "搜索任务" }).fill("声音从身后");
  await expect(page.getByTestId("task-card-task-005")).toBeVisible();
  await expect(page.getByTestId("task-card-task-001")).toHaveCount(0);

  await page.getByRole("textbox", { name: "搜索任务" }).fill("");
  await page.getByRole("button", { name: /需要处理/ }).click();
  await expect(page.locator(".task-card")).toHaveCount(2);
});
