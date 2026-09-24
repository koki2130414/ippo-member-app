import { expect, test } from "@playwright/test";
import { storageStatePath } from "./roles";

test.use({ storageState: storageStatePath("student") });

/** 秘密が出ていないかを見る文字列。キー名と、サンプルに入れてある実際の値の両方 */
const SECRET_MARKERS = ['"storageKey":', '"muxPlaybackId":', "SampleSignedPlaybackId", "class-videos/", "storageKey", "muxPlaybackId"];

test("カテゴリーのタブは URL で切り替わる", async ({ page }) => {
  await page.goto("/videos");
  await expect(page.getByTestId("video-card").first()).toBeVisible();
  const allCount = await page.getByTestId("video-card").count();

  await page.locator('[data-testid="video-category-tab"][data-tab="mentality"]').click();
  await expect(page).toHaveURL(/\?tab=mentality$/);
  const cards = page.getByTestId("video-card");
  await expect(cards.first()).toContainText("メンタリティ");
  expect(await cards.count()).toBeLessThan(allCount);
});

test("知らないタブ名・壊れたページ番号でも落ちない", async ({ page }) => {
  const response = await page.goto("/videos?tab=<script>&page=abc");
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("video-card").first()).toBeVisible();
});

for (const videoId of ["video-sample-mux", "video-sample-upload"]) {
  test(`${videoId}: HTML と RSC ペイロードに配信元の秘密が出ない`, async ({ page, request }) => {
    const response = await page.goto(`/videos/${videoId}`);
    const html = (await response?.text()) ?? "";
    for (const marker of SECRET_MARKERS) expect(html).not.toContain(marker);

    // クライアント遷移で使われる RSC ペイロードも確かめる
    const rsc = await request.get(`/videos/${videoId}`, { headers: { RSC: "1" } });
    const payload = await rsc.text();
    expect(payload.length).toBeGreaterThan(0);
    for (const marker of SECRET_MARKERS) expect(payload).not.toContain(marker);
  });
}

test("再生すると再生の許可をもらい、早すぎる「見おわった」は責めずに待ってもらう", async ({ page }) => {
  await page.goto("/videos/video-sample-scan");
  await page.getByTestId("video-play").click();
  await expect(page.getByTestId("video-demo-surface")).toBeVisible();
  // 再生を始めても、DOM に秘密は書かれない
  const dom = await page.content();
  for (const marker of SECRET_MARKERS) expect(dom).not.toContain(marker);

  await page.getByTestId("video-complete").click();
  await expect(page.locator('[role="status"][data-testid="video-complete-result"]')).toContainText("もう少し見てみよう");
});

test("YouTube の動画には「アプリの外でも見られます」を出す", async ({ page }) => {
  await page.goto("/videos/video-sample-youtube");
  await expect(page.getByTestId("video-outside-app-warning")).toContainText("アプリの外でも見られます");
  await page.getByTestId("video-play").click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toBeVisible();
});

test("存在しない動画は 404", async ({ page }) => {
  const response = await page.goto("/videos/no-such-video");
  expect(response?.status()).toBe(404);
});
