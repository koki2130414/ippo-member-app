import { expect, test } from "@playwright/test";
import { storageStatePath } from "./roles";

test.use({ storageState: storageStatePath("student") });

/**
 * 仕様 10.5: ブラウザ自動操作はタブを非表示のまま動かすことがある。
 * 非表示タブでは requestAnimationFrame が止まり、ストリーミング表示の切り替えが走らないことがあるので、
 * 「非表示」を偽装し rAF を止めた状態でも、主要コンテンツが最初の HTML で出ていることを確かめる。
 */
test("非表示タブでも主要コンテンツが表示される", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    window.requestAnimationFrame = () => 0;
  });
  for (const path of ["/home", "/videos", "/lectures", "/lectures/lecture-scan"]) {
    await page.goto(path);
    await expect(page.locator('main[data-state="ready"]')).toBeVisible();
  }
  await page.goto("/videos");
  await expect(page.getByTestId("video-card").first()).toBeVisible();
});
