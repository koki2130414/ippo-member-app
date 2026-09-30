import { expect, test } from "@playwright/test";
import { storageStatePath } from "./roles";

/**
 * 見学リンク: 運営が作る → 知っている人はログインなしで会員画面へ → 運営が止めると入れなくなる。
 * 見学リンクは1本だけなので、ほかのテストと取り合わないよう、このファイルの中では順番に動かす。
 */
test.describe.configure({ mode: "serial" });

test("運営が見学リンクを作り、ログインしていない人がリンクから会員画面を見られる。止めると入れなくなる", async ({ browser }, testInfo) => {
  // 見学リンクはサイト全体で1本なので、モバイルとデスクトップで同時に作り直し合わないよう、片方だけで動かす
  test.skip(testInfo.project.name !== "desktop", "見学リンクはサイト全体で1本のため");
  const adminContext = await browser.newContext({ storageState: storageStatePath("admin") });
  const admin = await adminContext.newPage();
  await admin.goto("/admin");
  const panel = admin.getByTestId("guest-link-panel");
  await panel.getByTestId("guest-link-issue").click();
  const url = await panel.getByTestId("guest-link-url").inputValue();
  expect(url).toMatch(/\/guest\/[A-Za-z0-9_-]{30,}$/);
  await expect(panel).toHaveAttribute("data-state", "active");

  // ログインしていない人: サイトのURLだけでは入れない
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await visitor.goto("/videos");
  await expect(visitor.locator('main[data-page="login"]')).toBeVisible();

  // リンクから入ると会員のホーム。記録はつかない
  await visitor.goto(url);
  await expect(visitor.locator('main[data-page="student-home"]')).toBeVisible();
  await expect(visitor.getByTestId("guest-banner")).toBeVisible();
  await visitor.goto("/videos");
  await expect(visitor.getByTestId("video-card").first()).toBeVisible();
  await visitor.getByTestId("video-card").first().click();
  await expect(visitor.getByTestId("video-complete")).toHaveCount(0);

  // でたらめなリンクは使えない
  const strangerContext = await browser.newContext();
  const stranger = await strangerContext.newPage();
  await stranger.goto("/guest/this-is-not-a-valid-guest-token-000000");
  await expect(stranger.getByTestId("guest-link-invalid")).toBeVisible();
  await strangerContext.close();

  // 運営が止めると、見学中の人も次の画面から入れない。古いリンクも使えない
  await admin.getByTestId("guest-link-revoke").click();
  await admin.getByTestId("guest-link-revoke-confirm").click();
  await expect(admin.getByTestId("guest-link-result")).toHaveText("見学リンクを止めました。いま見学中の人も入れなくなります");
  await visitor.goto("/videos");
  await expect(visitor.locator('main[data-page="login"]')).toBeVisible();
  await visitor.goto(url);
  await expect(visitor.getByTestId("guest-link-invalid")).toBeVisible();

  await visitorContext.close();
  await adminContext.close();
});
