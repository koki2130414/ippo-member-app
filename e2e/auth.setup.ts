import { expect, test as setup } from "@playwright/test";
import { USER_ROLES } from "../src/domain/types";
import { storageStatePath } from "./roles";

// docs/06 の「ログインする（デモモード）」の手順そのもの
for (const role of USER_ROLES) {
  setup(`${role} でログインした状態を保存する`, async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId(`demo-login-${role}`).click();
    await expect(page.getByTestId("header-display-name")).toBeVisible();
    await page.context().storageState({ path: storageStatePath(role) });
  });
}
