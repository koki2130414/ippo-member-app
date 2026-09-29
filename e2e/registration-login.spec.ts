import { expect, test } from "@playwright/test";
import { storageStatePath } from "./roles";

/**
 * 申し込み → 運営が承認 → 保護者がリンクでパスワードを決める → 生徒がログインIDでログイン → 動画。
 * docs/06 の「入会の申し込みを審査する」「ログインする」の手順を写したもの。
 */
test("申し込みから、生徒のパスワードログインまで", async ({ browser }, testInfo) => {
  const suffix = `${testInfo.project.name.slice(0, 1)}${Date.now() % 1_000_000}`;
  const nickname = `タロウ${suffix}`;

  // 1. 保護者が申し込む（ログインなし）
  const applicant = await browser.newContext();
  const applyPage = await applicant.newPage();
  await applyPage.goto("/register");
  await applyPage.getByTestId("register-submit").click();
  await expect(applyPage.locator("#consent-error")).toContainText("同意のチェック");
  await applyPage.locator("#childFullName").fill("架空 たろう");
  await applyPage.locator("#childDisplayName").fill(nickname);
  await applyPage.locator("#grade").selectOption("e5");
  await applyPage.locator("#prefecture").selectOption("栃木県");
  await applyPage.locator("#guardianEmail").fill(`parent-${suffix}@example.invalid`);
  await applyPage.locator("#consent").check();
  await applyPage.getByTestId("register-submit").click();
  await expect(applyPage.locator('[role="status"][data-testid="register-result"]')).toHaveText("申し込みを受け付けました");
  await applicant.close();

  // 2. 運営が承認し、ログイン用リンクを受け取る
  const adminContext = await browser.newContext({ storageState: storageStatePath("admin") });
  const adminPage = await adminContext.newPage();
  await adminPage.goto("/admin/applications?tab=pending");
  const row = adminPage.locator('[data-testid="admin-application-row"]', { hasText: nickname });
  await expect(row).toContainText("小学5年生");
  await row.getByTestId("admin-application-plan").selectOption("balance");
  await row.getByTestId("admin-application-approve").click();
  await expect(row.locator('[role="status"]')).toHaveText("承認しました");
  const inviteUrl = await row.getByTestId("admin-application-invite-url").inputValue();
  expect(inviteUrl).toMatch(/\/invite\/[A-Za-z0-9_-]{20,}$/);
  await adminContext.close();

  // 3. 保護者がリンクを開いて、2人分のパスワードを決める
  const family = await browser.newContext();
  const invitePage = await family.newPage();
  await invitePage.goto(inviteUrl);
  await invitePage.locator("#guardianPassword").fill("guardian-pass-1");
  await invitePage.locator("#guardianPasswordConfirm").fill("guardian-pass-1");
  await invitePage.locator("#studentPassword").fill("student-pass-1");
  await invitePage.locator("#studentPasswordConfirm").fill("student-pass-1");
  await invitePage.getByTestId("invite-submit").click();
  await expect(invitePage.getByTestId("invite-result")).toHaveText("パスワードを決めました");
  const loginIds = await invitePage.getByTestId("invite-login-id").allTextContents();
  const studentLoginId = loginIds[1] ?? "";
  expect(studentLoginId).toMatch(/^ippo-\d{6}$/);
  await family.close();

  // 同じリンクは2回使えない
  const again = await browser.newContext();
  const againPage = await again.newPage();
  await againPage.goto(inviteUrl);
  await expect(againPage.getByTestId("invite-unusable")).toContainText("もう使われています");
  await again.close();

  // 4. 生徒がログインIDとパスワードでログインし、動画を見る
  const student = await browser.newContext();
  const studentPage = await student.newPage();
  await studentPage.goto("/login");
  await studentPage.locator("#loginId").fill(studentLoginId);
  await studentPage.locator("#password").fill("wrong-password");
  await studentPage.getByTestId("login-submit").click();
  await expect(studentPage.locator('[role="alert"][data-testid="login-error"]')).toContainText("パスワードがちがいます");
  // まちがえても、ログインIDは入力欄に残っている
  await expect(studentPage.locator("#loginId")).toHaveValue(studentLoginId);
  await studentPage.locator("#password").fill("student-pass-1");
  await studentPage.getByTestId("login-submit").click();
  await expect(studentPage.locator('main[data-page="student-home"]')).toBeVisible();
  await expect(studentPage.getByTestId("header-display-name")).toContainText(nickname);
  await studentPage.goto("/videos");
  await expect(studentPage.getByTestId("video-card").first()).toBeVisible();
  await student.close();
});

test("運営は会員一覧からログイン用リンクを作れる", async ({ browser }) => {
  const adminContext = await browser.newContext({ storageState: storageStatePath("admin") });
  const page = await adminContext.newPage();
  await page.goto("/admin/users?tab=coach");
  const row = page.locator('[data-testid="admin-user-row"]', { hasText: "ウミコーチ" });
  await row.getByTestId("admin-user-issue-login").click();
  await expect(row.getByTestId("admin-user-login-link-url")).toHaveValue(/\/invite\//);
  await adminContext.close();
});

test("運営がいるときは、最初の運営アカウントの画面は閉じている", async ({ page }) => {
  await page.goto("/setup");
  await expect(page.getByTestId("setup-closed")).toBeVisible();
});
