import { expect, test } from "@playwright/test";

// 見学モード（一時的な入口）。本番のログインができたら、このテストごと消す
test("「見学する」でログインなしにクラス動画を見られ、運営の画面には入れない", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("guest-view").click();
  await expect(page).toHaveURL(/\/videos$/);
  await expect(page.getByTestId("guest-banner")).toBeVisible();
  await expect(page.getByTestId("video-card").first()).toBeVisible();

  await page.getByTestId("video-card").filter({ hasText: "（9/27）" }).click();
  await page.getByTestId("video-play").click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/bJDmJon3lRg"]')).toBeVisible();
  // 見学中は「見おわった」を出さない
  await expect(page.getByTestId("video-complete")).toHaveCount(0);

  const admin = await page.goto("/admin/users");
  expect(admin?.status()).toBe(403);

  await page.goto("/videos");
  await page.getByTestId("header-sign-out").click();
  await expect(page).toHaveURL(/\/login$/);
  const afterSignOut = await page.goto("/videos");
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(afterSignOut?.ok()).toBe(true);
});

test("見学用アカウントは、ロール別のデモログインでは選ばれない", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("demo-login-student").click();
  await expect(page.getByTestId("header-display-name")).toContainText("ヒカル");
});
