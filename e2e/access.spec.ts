import { expect, test } from "@playwright/test";
import { storageStatePath } from "./roles";

test.describe("未ログイン", () => {
  test("会員ページへ行くと /login に飛び、戻り先が付く", async ({ page }) => {
    await page.goto("/videos?tab=mentality");
    await expect(page).toHaveURL(/\/login\?next=%2Fvideos%3Ftab%3Dmentality$/);
    await expect(page.locator('main[data-page="login"]')).toBeVisible();
  });

  test("ログインすると、見ようとしていたページに戻る", async ({ page }) => {
    await page.goto("/lectures");
    await page.getByTestId("demo-login-student").click();
    await expect(page).toHaveURL(/\/lectures$/);
  });
});

// 見えてはいけない画面は、サーバーが 403 を返す（画面で隠すだけではない）
const forbiddenCases = [
  { role: "student", path: "/admin" },
  { role: "student", path: "/coach" },
  { role: "student", path: "/guardian" },
  { role: "guardian", path: "/home" },
  { role: "guardian", path: "/admin" },
  { role: "coach", path: "/videos" },
  { role: "coach", path: "/admin" },
  { role: "admin", path: "/home" },
] as const;

for (const { role, path } of forbiddenCases) {
  test.describe(`${role} のとき`, () => {
    test.use({ storageState: storageStatePath(role) });
    test(`${path} は 403`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(403);
      await expect(page.locator('main[data-page="forbidden"]')).toBeVisible();
    });
  });
}

test.describe("保護者", () => {
  test.use({ storageState: storageStatePath("guardian") });
  test("紐づいた子だけが見える", async ({ page }) => {
    await page.goto("/guardian");
    const rows = page.getByTestId("guardian-child-row");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("ヒカル");
    await expect(page.locator("body")).not.toContainText("ミナト");
  });
});
