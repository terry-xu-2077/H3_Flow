import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const outputDirectory = resolve(".artifacts", "ui-previews");
const baseUrl = process.env.SHOTMILL_UI_URL ?? "http://127.0.0.1:1420/dev/ui";

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await desktop.goto(baseUrl);
  await desktop.screenshot({ path: resolve(outputDirectory, "dev-ui-desktop.png") });
  await desktop.getByRole("button", { name: /浮层实验室/ }).click();
  await desktop.getByRole("dialog", { name: "浮层边界实验室" }).waitFor();
  await desktop.waitForTimeout(200);
  await desktop.screenshot({ path: resolve(outputDirectory, "dev-ui-overlay-lab.png") });

  const composerDesktop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await composerDesktop.goto(baseUrl);
  await composerDesktop.getByRole("button", { name: "收起场景" }).click();
  await composerDesktop.getByRole("button", { name: "生产", exact: true }).click();
  await composerDesktop.getByTestId("task-card-task-002").dblclick();
  await composerDesktop.getByTestId("task-composer").waitFor();
  await composerDesktop.waitForTimeout(700);
  await composerDesktop.screenshot({ path: resolve(outputDirectory, "dev-ui-composer-desktop.png") });
  const desktopFinalPrompt = composerDesktop.getByRole("textbox", { name: "Final Prompt" });
  await desktopFinalPrompt.fill("");
  await desktopFinalPrompt.pressSequentially("@仓库");
  await composerDesktop.getByTestId("prompt-asset-menu").waitFor();
  await composerDesktop.screenshot({ path: resolve(outputDirectory, "dev-ui-asset-menu-desktop.png") });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(baseUrl);
  await mobile.evaluate(() => window.scrollTo(0, 0));
  await mobile.screenshot({ path: resolve(outputDirectory, "dev-ui-mobile.png") });
  await mobile.getByRole("button", { name: "生产", exact: true }).click();
  await mobile.getByTestId("task-card-task-002").dblclick();
  await mobile.getByTestId("task-composer").waitFor();
  await mobile.waitForTimeout(700);
  await mobile.screenshot({ path: resolve(outputDirectory, "dev-ui-composer-mobile.png") });
  const mobileFinalPrompt = mobile.getByRole("textbox", { name: "Final Prompt" });
  await mobileFinalPrompt.scrollIntoViewIfNeeded();
  await mobileFinalPrompt.fill("");
  await mobileFinalPrompt.pressSequentially("@");
  await mobile.getByTestId("prompt-asset-menu").waitFor();
  await mobile.screenshot({ path: resolve(outputDirectory, "dev-ui-asset-menu-mobile.png") });
} finally {
  await browser.close();
}
