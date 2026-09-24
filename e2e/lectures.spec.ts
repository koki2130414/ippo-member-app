import { expect, test } from "@playwright/test";
import { storageStatePath } from "./roles";

test.use({ storageState: storageStatePath("student") });

test("回答前のページに正解フラグも解説も出ない", async ({ page, request }) => {
  const response = await page.goto("/lectures/lecture-reset");
  const html = (await response?.text()) ?? "";
  expect(html).not.toContain("isCorrect");
  // 解説（採点後にだけ見せる文）が含まれていないこと
  expect(html).not.toContain("まず深呼吸で体を落ちつかせます");
  const rsc = await (await request.get("/lectures/lecture-reset", { headers: { RSC: "1" } })).text();
  expect(rsc).not.toContain("isCorrect");
  expect(rsc).not.toContain("まず深呼吸で体を落ちつかせます");
});

test("全部答えないと送れず、答えるとサーバーの採点結果が出る", async ({ page }) => {
  await page.goto("/lectures/lecture-positions");
  await expect(page.getByTestId("lecture-body")).toBeVisible();

  await page.getByTestId("quiz-submit").click();
  await expect(page.locator('[role="alert"][data-testid="quiz-error"]')).toContainText("まだ答えていない問題");

  const questions = page.getByTestId("quiz-question");
  const count = await questions.count();
  for (let index = 0; index < count; index += 1) {
    await questions.nth(index).getByRole("radio").first().check();
  }
  await page.getByTestId("quiz-submit").click();
  await expect(page.getByTestId("quiz-result")).toContainText(`${count}問中`);
  await expect(page.getByTestId("quiz-question-result").first()).toBeVisible();
});

test("カテゴリーのタブで絞りこめる", async ({ page }) => {
  await page.goto("/lectures");
  await page.locator('[data-testid="lecture-category-tab"][data-tab="lc-mind"]').click();
  await expect(page).toHaveURL(/\?tab=lc-mind$/);
  await expect(page.getByTestId("lecture-card")).toHaveCount(1);
});

test("保護者は講義を読めるが、クイズは送れない", async ({ browser }) => {
  const context = await browser.newContext({ storageState: storageStatePath("guardian") });
  const page = await context.newPage();
  await page.goto("/lectures/lecture-scan");
  await expect(page.getByTestId("lecture-body")).toBeVisible();
  await expect(page.getByTestId("quiz-submit")).toHaveCount(0);
  await context.close();
});
