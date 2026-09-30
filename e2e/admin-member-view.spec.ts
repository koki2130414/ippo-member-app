import { expect, test } from "@playwright/test";
import { storageStatePath } from "./roles";

test.use({ storageState: storageStatePath("admin") });

test("運営は会員画面（ホーム・動画・講義）を会員と同じ見た目で開ける", async ({ page }) => {
  await page.goto("/admin");
  await page.getByTestId("nav-admin-member-view").click();
  await expect(page.locator('main[data-page="student-home"]')).toBeVisible();
  await expect(page.getByTestId("admin-preview-bar")).toContainText("記録はつきません");

  await page.getByTestId("admin-preview-videos").click();
  await expect(page.locator('main[data-page="videos"]')).toBeVisible();
  await page.getByTestId("video-card").first().click();
  await expect(page.getByTestId("admin-preview-bar")).toBeVisible();
  // 運営が見ても「見おわった」は出ない
  await expect(page.getByTestId("video-complete")).toHaveCount(0);

  await page.getByTestId("admin-preview-lectures").click();
  await expect(page.locator('main[data-page="lectures"]')).toBeVisible();
  await page.getByTestId("lecture-card").first().click();
  await expect(page.getByTestId("lecture-body")).toBeVisible();

  await page.getByTestId("admin-preview-back").click();
  await expect(page.locator('main[data-page="admin-home"]')).toBeVisible();
});
