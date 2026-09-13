import { expect, test } from "@playwright/test";

import { createProject, importImage, openProject, useTextPrompt } from "./helpers";

test("new task draft can enhance a prompt without being persisted on Cancel", async ({ page }) => {
  const project = await createProject(page, "草稿增强");
  await openProject(page, project.title);
  await page.getByRole("button", { name: "新建任务" }).click();
  await useTextPrompt(page, "角色在雨夜码头回头看向镜头。");

  await page.getByRole("tab", { name: /AI 增强/ }).click();
  await page.getByRole("button", { name: "增强" }).click();
  await expect(page.getByRole("textbox", { name: "AI 增强提示词可视化" })).toContainText("角色在雨夜码头回头看向镜头");
  await page.getByRole("button", { name: "取消" }).click();

  await expect(page.getByRole("region", { name: "任务区域" })).toContainText("0 个任务");
  const workspace = await page.request.get(`/api/v1/projects/${project.id}/workspace`);
  expect((await workspace.json()).tasks).toHaveLength(0);
});

test("H3 @ asset menu inserts a readable reference and Save binds that asset", async ({ page }) => {
  const project = await createProject(page, "资产引用");
  const asset = await importImage(page, project.id);
  await openProject(page, project.title);
  await page.getByRole("button", { name: "新建任务" }).click();

  const prompt = await useTextPrompt(page, "镜头参考 @林澜");
  const menu = page.getByRole("listbox", { name: "引用任务资产" });
  await expect(menu).toBeVisible();
  await menu.getByRole("option", { name: /林澜主视觉/ }).click();
  await expect(prompt).toHaveValue(/<Subject 1>/);
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("region", { name: "任务区域" })).toContainText("1 个任务");

  const workspace = await page.request.get(`/api/v1/projects/${project.id}/workspace`);
  const taskId = (await workspace.json()).tasks[0].id as string;
  const editor = await page.request.get(`/api/v1/projects/${project.id}/tasks/${taskId}/editor`);
  expect((await editor.json()).assetBindings).toEqual([
    expect.objectContaining({ assetId: asset.id, reference: "<Subject 1>" }),
  ]);
});

test("prompt source and visual/text modes stay separate in the simple editor", async ({ page }) => {
  const project = await createProject(page, "提示词模式");
  await openProject(page, project.title);
  await page.getByRole("button", { name: "新建任务" }).click();

  await expect(page.getByRole("textbox", { name: "用户提示词可视化" })).toBeVisible();
  await useTextPrompt(page, "用户版本提示词");
  await page.getByRole("tab", { name: /AI 增强/ }).click();
  await expect(page.getByRole("textbox", { name: "AI 增强提示词可视化" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存" })).toBeDisabled();
  await page.getByRole("tab", { name: "用户" }).click();
  await expect(page.getByRole("textbox", { name: "用户提示词" })).toHaveValue("用户版本提示词");
});
