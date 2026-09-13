import { expect, test } from "@playwright/test";

import { createProject, openProject } from "./helpers";

test("mobile viewport can open the current project workspace without page overflow", async ({ page }) => {
  const project = await createProject(page, "手机布局");
  await openProject(page, project.title);
  await expect(page.getByRole("button", { name: "返回项目首页" })).toBeVisible();
  await expect(page.getByRole("button", { name: "项目配置" })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});
