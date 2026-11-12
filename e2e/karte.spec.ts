import { expect, test } from "@playwright/test";
import { storageStatePath } from "./roles";

/** カルテ: 本人・保護者・コーチで見えるものが違うこと（とくに面談メモ）を、画面とステータスで確かめる */

test.describe("生徒のカルテ", () => {
  test.use({ storageState: storageStatePath("student") });

  test("目標とつみあげが見え、面談メモは出ない。自主練を記録できる", async ({ page }, testInfo) => {
    await page.goto("/karte");
    await expect(page.locator('main[data-page="karte"]')).toBeVisible();
    await expect(page.getByTestId("karte-goal").first()).toBeVisible();
    await expect(page.getByTestId("karte-goal-title").first()).toHaveText("左足でもインステップで蹴れるようになる");
    await expect(page.getByTestId("karte-month-counts")).toBeVisible();
    await expect(page.locator('[data-testid="karte-entry"][data-kind="interview"]')).toHaveCount(0);
    await expect(page.getByText("11月の面談")).toHaveCount(0);

    const kinds = await page.getByTestId("karte-entry-kind").locator("option").allTextContents();
    expect(kinds).toEqual(["自主練・取り組み", "振り返り"]);
    const title = `壁当て E2E ${testInfo.project.name}`;
    await page.getByTestId("karte-entry-title").fill(title);
    await page.getByTestId("karte-entry-submit").click();
    await expect(page.getByTestId("karte-entry-result")).toHaveText("記録しました");
    await expect(page.getByText(title)).toBeVisible();
  });

  test("レポートに目標シートがつき、面談メモは載らない", async ({ page }) => {
    await page.goto("/karte/report?month=2026-11");
    await expect(page.getByTestId("karte-report-title")).toContainText("成長レポート");
    await expect(page.getByTestId("karte-goal-sheet")).toBeVisible();
    await expect(page.getByText("11月の面談")).toHaveCount(0);
    await expect(page.getByTestId("karte-print")).toBeVisible();
  });
});

test.describe("保護者のカルテ", () => {
  test.use({ storageState: storageStatePath("guardian") });

  test("紐づいた子のカルテが見られ、書けない・面談メモは出ない", async ({ page }) => {
    await page.goto("/karte");
    await expect(page.getByText("ヒカル（サンプル）さんの")).toBeVisible();
    await expect(page.getByTestId("karte-entry-form")).toHaveCount(0);
    await expect(page.getByText("11月の面談")).toHaveCount(0);
    // 紐づいていない子を指定しても、自分の子のカルテになる
    await page.goto("/karte?child=u-student-0002");
    await expect(page.getByText("ヒカル（サンプル）さんの")).toBeVisible();
  });

  test("コーチ用の一覧は 403", async ({ page }) => {
    const response = await page.goto("/karte/students");
    expect(response?.status()).toBe(403);
  });
});

test.describe("コーチのカルテ", () => {
  test.use({ storageState: storageStatePath("coach") });

  test("担当の子が、声かけの目安つきで並ぶ", async ({ page }) => {
    await page.goto("/karte/students");
    const rows = page.getByTestId("karte-student-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText("ツバサ");
    await expect(rows.first().getByTestId("karte-student-follow")).toBeVisible();
  });

  test("担当の子では面談メモが見え、お手本動画つきのフィードバックを書ける", async ({ page }, testInfo) => {
    await page.goto("/karte/students/u-student-0001");
    await expect(page.locator('[data-testid="karte-entry"][data-kind="interview"]').first()).toBeVisible();
    await page.getByTestId("karte-entry-kind").selectOption("feedback");
    const title = `ナイスシュート E2E ${testInfo.project.name}`;
    await page.getByTestId("karte-entry-title").fill(title);
    await page.getByTestId("karte-entry-model-video-select").selectOption({ index: 1 });
    await page.getByTestId("karte-entry-submit").click();
    await expect(page.getByTestId("karte-entry-result")).toHaveText("記録しました");
    await expect(page.getByText(title)).toBeVisible();
  });

  test("担当でない子のカルテは 403", async ({ page }) => {
    const response = await page.goto("/karte/students/u-student-0002");
    expect(response?.status()).toBe(403);
  });
});
