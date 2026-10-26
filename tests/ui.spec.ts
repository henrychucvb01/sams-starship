import { test, expect, type Page } from "@playwright/test";
async function launch(page: Page) {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Play Solo" }).click();
  await page.getByRole("button", { name: "Start mission" }).click();
  await page.getByRole("button", { name: "Begin Mission" }).click();
  await expect(
    page.getByRole("heading", { name: "Restore the Lights" }),
  ).toBeVisible();
}
async function clue(page: Page) {
  const hidden = page.getByRole("button", { name: /slot \d+, hidden/ }).first();
  const name = await hidden.getAttribute("aria-label");
  await hidden.click();
  await page.getByRole("button", { name: "Request clue" }).click();
  const text = await page.getByRole("log").locator("p").last().innerText();
  const value = Number(text.match(/my number is (\d+)/)![1]);
  return { value, name: name!.replace(", hidden", "") };
}
test("complete clue-driven victory, replay, menu and responsive layout", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await launch(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: /slot \d+, hidden/ }),
  ).toHaveCount(6);
  for (let i = 0; i < 6; i++) {
    const { value } = await clue(page);
    await page
      .getByRole("button", { name: `Sam circuit ${value}`, exact: true })
      .click();
    await page.getByRole("button", { name: "Connect circuits" }).click();
  }
  await expect(
    page.getByRole("heading", { name: /Mission Complete/ }),
  ).toBeVisible();
  await expect(page.getByText("6/6", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `docs/previews/${info.project.name}-victory.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Play Again" }).click();
  await expect(
    page.getByRole("heading", { name: "Restore the Lights" }),
  ).toBeVisible();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.clock.runFor(2100);
  await expect(page.getByText("4:58", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `docs/previews/${info.project.name}-game.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Leave mission" }).click();
  await page.getByRole("button", { name: "Back to the ship" }).click();
  await expect(page.getByRole("button", { name: "Play Solo" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("wrong matches cause real hull defeat; retry resets the mission", async ({
  page,
}) => {
  await launch(page);
  const { value } = await clue(page);
  const buttons = page.getByRole("button", { name: /^Sam circuit \d+/ });
  let badName = "";
  for (const b of await buttons.all()) {
    const name = (await b.getAttribute("aria-label"))!;
    if (name !== `Sam circuit ${value}`) {
      badName = name;
      break;
    }
  }
  const disclosed = page
    .getByRole("button", { name: new RegExp(`slot \\d+, clue ${value}$`) })
    .first();
  for (let i = 0; i < 7; i++) {
    await page.getByRole("button", { name: badName, exact: true }).click();
    await disclosed.click();
    await page.getByRole("button", { name: "Connect circuits" }).click();
  }
  await expect(
    page.getByRole("heading", { name: /Mission Failed/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Hull integrity lost", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
});
test("clock expiry, AI help, settings and disabled features", async ({
  page,
}, info) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: /Private Room/ }),
  ).toBeDisabled();
  await page.screenshot({
    path: `docs/previews/${info.project.name}-menu.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Play Solo" }).click();
  const card = page.locator(".mission-card").first();
  await card.getByRole("combobox").selectOption("Hard");
  await expect(card.getByRole("button")).toBeDisabled();
  await card.getByRole("combobox").selectOption("Easy");
  await card.getByRole("button").click();
  await page.getByRole("button", { name: "Skip introduction" }).click();
  await page.clock.install();
  await page
    .getByRole("button", { name: /^Sam circuit \d+/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Share selected Sam circuit" })
    .click();
  await page.clock.runFor(2100);
  await expect(
    page.locator(".status-strip>div").nth(2).locator("strong"),
  ).toHaveText("1 / 6");
  await page.clock.runFor(300000);
  await expect(
    page.getByRole("heading", { name: /Mission Failed/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Emergency power expired", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try Again" }).click();
  await page.clock.runFor(1100);
  await expect(page.getByText("4:59", { exact: true })).toBeVisible();
});
