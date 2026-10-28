import { test, expect } from "@playwright/test";
test("deployed game supports board navigation, finite tools and actual turns", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Let's Fly!" }).click();
  await page.getByRole("button", {name:"Continue solo", exact:true}).click();
  await page.getByRole("button", { name: "Start mission" }).click();
  await page.getByRole("button", { name: "Begin Mission" }).click();
  await expect(page.locator(".wire-tile")).toHaveCount(48);
  await expect(page.locator(".captain-badge")).toHaveCount(1);
  await expect(page.locator(".equipment-locked")).toHaveCount(3);
  await page.locator(".starting-option").last().click();
  await page.getByRole("button", {name: "Review starting information", exact: true}).click();
  await page.getByRole("dialog", {name: "Reveal starting information?"}).getByRole("button", {name: "Confirm", exact: true}).click();
  await expect(page.locator(".information-marker")).toHaveCount(3);
  await expect(page.locator(".turn-pill")).toContainText("Sam's", {timeout: 15000});
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: /Circuit Scanner/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /Dual Scanner/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Sam’s Hint/ }).click();
  await page.getByRole("button", { name: "Confirm Tool" }).click();
  await expect(page.locator(".sam-clue")).toBeVisible();
  await expect(page.getByRole("button", { name: /Sam’s Hint/ })).toBeDisabled();
  await page.getByRole("button", { name: /Emergency Shield/ }).click();
  await page.getByRole("button", { name: "Confirm Tool" }).click();
  await expect(
    page.getByLabel("Emergency Shield active", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/previews/${info.project.name}-deployed.png`,
    fullPage: true,
  });
  await page.locator(".rack-sam .wire-tile:not(.cleared):not(:has(.information-marker))").first().click();
  await page
    .getByRole("button", { name: "Share selected Sam circuit" })
    .click();
  await expect(page.locator(".turn-pill")).toContainText("Nova's");
  await expect(
    page.getByRole("button", { name: "Pass turn", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Leave mission" }).click();
  await expect(
    page.getByRole("heading", { name: /Every connection/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
