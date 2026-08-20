import { expect, test, type Page } from "@playwright/test";
import { seedSmokeSettings } from "./settings.ts";

async function openHome(page: Page) {
  await seedSmokeSettings(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ホーム" })).toBeVisible();
}

test("solo smoke finishes one unanswered question", async ({ page }) => {
  await openHome(page);
  await page.getByRole("button", { name: "一人で早押し" }).click();
  await expect(page.getByRole("heading", { name: "一人練習" })).toBeVisible();
  await page.getByRole("button", { name: "開始" }).click();
  await expect(page.getByRole("button", { name: "ホーム", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "終了" })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByText(/0点/)).toBeVisible();
});

test("room smoke finishes one unanswered match", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  await openHome(host);
  await openHome(guest);

  await host.getByRole("button", { name: "カスタム部屋" }).click();
  await host.getByRole("button", { name: "部屋を作る" }).click();
  const code = await host.getByTestId("room-code").innerText();
  expect(code.length).toBe(6);

  await guest.getByRole("button", { name: "カスタム部屋" }).click();
  await guest.getByLabel("部屋コード").fill(code);
  await guest.getByRole("button", { name: "参加" }).click();
  await expect(guest.getByTestId("room-code")).toHaveText(code);
  await expect(host.getByTestId("room-players").locator("li")).toHaveCount(2);

  await host.getByRole("button", { name: "開始" }).click();
  await expect(host.getByRole("heading", { name: "終了" })).toBeVisible({
    timeout: 45_000,
  });
  await expect(guest.getByRole("heading", { name: "終了" })).toBeVisible({
    timeout: 45_000,
  });

  await hostContext.close();
  await guestContext.close();
});
