import { test, expect } from "@playwright/test";
test("deployed game supports board navigation, finite tools and actual turns", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Private Room/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Play Solo" }).click();
  await page.getByRole("button", { name: "Start mission" }).click();
  await page.getByRole("button", { name: "Begin Mission" }).click();
  await expect(page.locator(".wire-tile")).toHaveCount(48);
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
  await page.getByRole("button", { name: "Confirm tool" }).click();
  await expect(page.locator(".sam-clue")).toBeVisible();
  await expect(page.getByRole("button", { name: /Sam’s Hint/ })).toBeDisabled();
  await page.getByRole("button", { name: /Emergency Shield/ }).click();
  await page.getByRole("button", { name: "Confirm tool" }).click();
  await expect(
    page.getByLabel("Emergency Shield active", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/previews/${info.project.name}-deployed.png`,
    fullPage: true,
  });
  await page.locator(".rack-sam .wire-tile").first().click();
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
