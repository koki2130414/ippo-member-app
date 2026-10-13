import { expect, test } from "@playwright/test";
import { storageStatePath } from "./roles";

test.describe("生徒", () => {
  test.use({ storageState: storageStatePath("student") });
  test("担当コーチでクラス動画を絞りこめる。カテゴリーと組み合わせられる", async ({ page }) => {
    await page.goto("/videos");
    await page.locator('[data-testid="video-coach-tab"][data-tab="荒木コーチ"]').click();
    await expect(page).toHaveURL(/coach=/);
    const cards = page.getByTestId("video-card");
    await expect(cards).toHaveCount(4);
    for (const text of await page.getByTestId("video-card-coach").allTextContents()) expect(text).toContain("荒木コーチ");
    // カテゴリーを切り替えても、コーチの絞りこみは残る
    await page.locator('[data-testid="video-category-tab"][data-tab="mentality"]').click();
    await expect(page).toHaveURL(/tab=mentality/);
    await expect(page).toHaveURL(/coach=/);
    await expect(cards.first()).toContainText("荒木コーチ");
    // 動画の画面から、同じコーチの動画一覧へ
    await cards.first().click();
    await page.getByTestId("video-coach-link").first().click();
    await expect(page.locator('main[data-page="videos"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-coach-tab"][aria-current="page"]')).toContainText("荒木コーチ");
  });
});

test("運営が担当コーチを入れると、会員の一覧に出る", async ({ browser }, testInfo) => {
  // 同じ動画を書き換えるので、片方のプロジェクトだけで動かす
  test.skip(testInfo.project.name !== "desktop", "サーバーの状態を書き換えるため");
  const adminContext = await browser.newContext({ storageState: storageStatePath("admin") });
  const admin = await adminContext.newPage();
  await admin.goto("/admin");
  await admin.getByTestId("nav-admin-videos").click();
  const row = admin.getByTestId("admin-video-row").filter({ hasText: "ポジション別②〜（9/27）" });
  await row.getByTestId("admin-video-coach-input").fill("てすとコーチ、 てすとコーチ");
  await row.getByTestId("admin-video-coach-save").click();
  await expect(row.getByTestId("admin-video-coach-result")).toHaveText("保存しました");
  await expect(row.getByTestId("admin-video-coach-input")).toHaveValue("てすとコーチ");
  await adminContext.close();

  const studentContext = await browser.newContext({ storageState: storageStatePath("student") });
  const student = await studentContext.newPage();
  await student.goto(`/videos?coach=${encodeURIComponent("てすとコーチ")}`);
  await expect(student.getByTestId("video-card")).toHaveCount(1);
  await expect(student.getByTestId("video-card-coach")).toHaveText("担当: てすとコーチ");
  await studentContext.close();
});
