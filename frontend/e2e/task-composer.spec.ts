import { expect, test } from "@playwright/test";

async function openComposer(page: import("@playwright/test").Page) {
  await page.goto("/dev/ui");
  await page.getByTestId("task-card-task-002").dblclick();
  await expect(page.getByTestId("task-composer")).toBeVisible();
}

test("composer exposes all three editing domains", async ({ page }) => {
  await openComposer(page);

  await expect(page.getByRole("region", { name: "剧本与设置" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Prompt 编辑" })).toBeVisible();
  await expect(page.getByRole("region", { name: "项目资产" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Script Source" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "AI Prompt" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Final Prompt" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Prompt Validator" })).toBeVisible();
});

test("AI regeneration preserves the manually edited Final Prompt", async ({ page }) => {
  await openComposer(page);
  const finalPrompt = page.getByRole("textbox", { name: "Final Prompt" });
  await finalPrompt.fill("MANUAL FINAL PROMPT");

  await page.getByRole("button", { name: /重新生成/ }).click();
  await expect(page.getByRole("status")).toContainText("Final Prompt 保持不变");

  await expect(finalPrompt).toHaveValue("MANUAL FINAL PROMPT");
  await expect(page.getByRole("textbox", { name: "AI Prompt" })).toHaveValue(/AI revision 3/);
});

test("background updates preserve focus, node identity, and typed content", async ({ page }) => {
  await openComposer(page);
  const finalPrompt = page.getByRole("textbox", { name: "Final Prompt" });
  await finalPrompt.focus();
  await page.keyboard.type(" focus-marker");
  const nodeIdentity = await finalPrompt.evaluate((element) => {
    element.dataset.identity = "stable-editor-node";
    return element.dataset.identity;
  });

  await expect(page.getByTestId("remote-progress")).toContainText("47%");
  await expect(finalPrompt).toBeFocused();
  await expect(finalPrompt).toHaveValue(/focus-marker/);
  expect(await finalPrompt.getAttribute("data-identity")).toBe(nodeIdentity);
});

test("adopting an AI revision requires confirmation", async ({ page }) => {
  await openComposer(page);
  await page.getByRole("button", { name: /重新生成/ }).click();
  await expect(page.getByRole("status")).toContainText("Final Prompt 保持不变");
  const aiPrompt = await page.getByRole("textbox", { name: "AI Prompt" }).inputValue();

  await page.getByRole("button", { name: "采用此版本" }).click();
  await expect(page.getByRole("dialog", { name: "替换 Final Prompt？" })).toBeVisible();
  await page.getByRole("button", { name: "确认替换" }).click();

  await expect(page.getByRole("textbox", { name: "Final Prompt" })).toHaveValue(aiPrompt);
});

test("composer never creates page-level horizontal overflow", async ({ page }) => {
  await openComposer(page);
  const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
});

test("Final Prompt @ menu filters assets and inserts the selected reference", async ({ page }) => {
  await openComposer(page);
  const finalPrompt = page.getByRole("textbox", { name: "Final Prompt" });
  await finalPrompt.fill("");
  await finalPrompt.pressSequentially("镜头参考 @仓库");

  const menu = page.getByRole("listbox", { name: "引用任务资产" });
  await expect(menu).toBeVisible();
  await expect(page.getByRole("option", { name: /旧港口仓库外景/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /林澜/ })).toHaveCount(0);
  await page.getByRole("option", { name: /旧港口仓库外景/ }).click();

  await expect(finalPrompt).toHaveValue("镜头参考 <Picture 1> ");
  await expect(finalPrompt).toBeFocused();
  await expect(menu).toHaveCount(0);
});

test("Final Prompt @ menu stays inside the viewport", async ({ page }) => {
  await openComposer(page);
  const finalPrompt = page.getByRole("textbox", { name: "Final Prompt" });
  await finalPrompt.focus();
  await page.keyboard.press("End");
  await page.keyboard.type(" @");
  const menu = page.getByTestId("prompt-asset-menu");
  await expect(menu).toBeVisible();

  const bounds = await menu.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);
});
