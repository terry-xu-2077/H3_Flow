import { expect, test } from "@playwright/test";

async function openLab(page: import("@playwright/test").Page) {
  await page.goto("/dev/ui");
  await page.getByRole("button", { name: "场景", exact: true }).click();
  await page.getByRole("button", { name: /浮层实验室/ }).click();
  await expect(page.getByRole("dialog", { name: "浮层边界实验室" })).toBeVisible();
}

test("top edge dropdown opens down and stays inside the viewport", async ({ page }) => {
  await openLab(page);
  const trigger = page.getByTestId("top-edge-select");
  await trigger.click();
  const menu = page.getByTestId("top-edge-select-menu");
  await expect(menu).toHaveAttribute("data-placement", "down");

  const [triggerBox, menuBox] = await Promise.all([trigger.boundingBox(), menu.boundingBox()]);
  expect(triggerBox).not.toBeNull();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.y).toBeGreaterThanOrEqual(triggerBox!.y + triggerBox!.height);
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});

test("bottom edge dropdown flips up outside its scroll container", async ({ page }) => {
  await openLab(page);
  const trigger = page.getByTestId("bottom-edge-select");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const menu = page.getByTestId("bottom-edge-select-menu");
  await expect(menu).toHaveAttribute("data-placement", "up");

  const [triggerBox, menuBox] = await Promise.all([trigger.boundingBox(), menu.boundingBox()]);
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(triggerBox!.y);
  await expect(menu.evaluate((element) => element.parentElement?.id)).resolves.toBe("shotmill-overlay-root");
});

test("transformed ancestors cannot clip a portaled menu", async ({ page }) => {
  await openLab(page);
  await page.getByTestId("transformed-select").click();
  const menu = page.getByTestId("transformed-select-menu");

  await expect(menu).toBeVisible();
  expect(await menu.evaluate((element) => element.parentElement?.id)).toBe("shotmill-overlay-root");
  const box = await menu.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("Escape closes a nested dropdown before its dialog", async ({ page }) => {
  await openLab(page);
  await page.getByTestId("top-edge-select").click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("top-edge-select-menu")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "浮层边界实验室" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "浮层边界实验室" })).toHaveCount(0);
});

test("context menu, toast, and fullscreen preview share the overlay stack", async ({ page }) => {
  await openLab(page);

  await page.locator(".context-case").click({ button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitem", { name: "复制场景" }).click();
  await expect(page.getByRole("status")).toContainText("已复制浮层场景");

  await page.getByRole("button", { name: /全屏预览/ }).click();
  await expect(page.getByRole("dialog", { name: "全屏媒体预览" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "全屏媒体预览" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "浮层边界实验室" })).toBeVisible();
});
