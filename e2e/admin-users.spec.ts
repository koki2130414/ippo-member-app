import { expect, test } from "@playwright/test";
import { storageStatePath } from "./roles";

test.use({ storageState: storageStatePath("admin") });

// docs/06「会員を追加する」「プランを割り当てる」の手順をそのままたどる
test("会員を追加し、プランを割り当てる", async ({ page }, testInfo) => {
  // 表示名は20文字まで。プロジェクトごとに別の名前にして、並列実行でぶつからないようにする
  const suffix = `${testInfo.project.name.slice(0, 1)}${Date.now() % 1_000_000}`;
  const displayName = `テスト${suffix}`;

  await page.goto("/admin/users?tab=members");
  await page.getByTestId("admin-user-add").click();
  await expect(page).toHaveURL(/new=1/);

  // 何も入れずに送ると、DOM のテキストでエラーが出る
  await page.getByTestId("admin-user-submit").click();
  await expect(page.locator("#displayName-error")).toContainText("表示名を入力してください");

  await page.locator("#displayName").fill(displayName);
  await page.locator("#fullName").fill("架空 てすと");
  await page.locator("#email").fill(`e2e-${suffix}@example.invalid`);
  await page.locator("#role").selectOption("student");
  await page.locator("#planCode").selectOption("light");
  await page.getByTestId("admin-user-submit").click();
  await expect(page.locator('[role="status"][data-testid="admin-user-form-result"]')).toHaveText("追加しました");

  const row = page.locator('[data-testid="admin-user-row"]', { hasText: displayName });
  await expect(row).toContainText("ライトプラン");

  await row.getByTestId("admin-user-plan-select").selectOption("soccer_iq");
  await row.getByTestId("admin-user-plan-submit").click();
  await expect(row.locator('[role="status"]')).toHaveText("プランを変更しました");
  await page.reload();
  await expect(page.locator('[data-testid="admin-user-row"]', { hasText: displayName })).toContainText("サッカーIQプラン");
});

test("一覧に本名とメールアドレスを出さない", async ({ page }) => {
  const response = await page.goto("/admin/users?tab=student");
  const html = (await response?.text()) ?? "";
  expect(html).not.toContain("架空 ひかる");
  expect(html).not.toContain("@example.invalid");
});

test.describe("生徒", () => {
  test.use({ storageState: storageStatePath("student") });
  test("会員の管理画面は 403", async ({ page }) => {
    const response = await page.goto("/admin/users");
    expect(response?.status()).toBe(403);
  });
  test("IPPO のクラス動画が一覧にあり、YouTube の注意が出る", async ({ page }) => {
    await page.goto("/videos?tab=soccer_iq");
    await page.getByTestId("video-card").filter({ hasText: "ポジション別②〜（9/27）" }).click();
    await expect(page.getByTestId("video-outside-app-warning")).toBeVisible();
    await page.getByTestId("video-play").click();
    await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/bJDmJon3lRg"]')).toBeVisible();
  });
});
