import { expect, test } from "@playwright/test";

import { createProject, createTask, openProject } from "./helpers";

test("Escape closes the new-project dialog without leaving the home page", async ({ page }) => {
  await page.goto("/dev/ui");
  await page.getByRole("button", { name: /新建项目/ }).click();
  await expect(page.getByRole("dialog", { name: "新建项目" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "新建项目" })).toHaveCount(0);
  await expect(page.getByRole("main", { name: "项目首页" })).toBeVisible();
});

test("task context menu opens in the shared overlay and edits the same task", async ({ page }) => {
  const project = await createProject(page, "右键编辑");
  await createTask(page, project.id);
  await openProject(page, project.title);

  await page.getByRole("button", { name: /#1 雨夜抵达仓库/ }).click({ button: "right" });
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);

  await menu.getByRole("menuitem", { name: "编辑任务" }).click();
  await expect(page.getByTestId("simple-task-editor")).toBeVisible();
});

test("project configuration remains a dedicated overlay", async ({ page }) => {
  const project = await createProject(page, "项目配置");
  await openProject(page, project.title);
  await page.getByRole("button", { name: "项目配置" }).click();
  const dialog = page.getByRole("dialog", { name: "项目配置" });
  await expect(dialog.getByRole("navigation", { name: "项目配置分类" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /项目信息/ })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /资产管理/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
