import { test, expect, type Page } from "@playwright/test";
async function launch(page: Page, path = "/") {
  await page.clock.install();
  await page.goto(path);
  await page.getByRole("button", { name: "Play Solo" }).click();
  await page.getByRole("button", { name: "Start mission" }).click();
  await page.getByRole("button", { name: "Begin Mission" }).click();
  await expect(
    page.getByRole("heading", { name: "One crew. Every connection counts." }),
  ).toBeVisible();
}
async function waitHuman(page: Page) {
  for (let i = 0; i < 30; i++) {
    if (
      await page
        .getByRole("heading", { name: /Mission Complete|Mission Failed/ })
        .count()
    )
      return;
    if (
      await page
        .locator(".turn-pill")
        .innerText()
        .then((t) => t.includes("Sam's"))
    )
      return;
    await page.clock.runFor(1500);
  }
}
async function solve(page: Page) {
  for (let steps = 0; steps < 100; steps++) {
    await waitHuman(page);
    if (await page.getByRole("heading", { name: /Mission Complete/ }).count())
      return;
    const own = await page
      .locator(".rack-sam .wire-tile:not(:disabled)")
      .evaluateAll((els) =>
        els.map((e) => ({
          id: e.getAttribute("data-slot")!,
          value: Number(e.querySelector("strong")!.textContent),
        })),
      );
    const targets = await page
      .locator(
        ".rack-nova .wire-tile:not(:disabled),.rack-pip .wire-tile:not(:disabled)",
      )
      .evaluateAll((els) =>
        els.map((e) => ({
          id: e.getAttribute("data-slot")!,
          poss: (e.getAttribute("title") ?? "")
            .replace("Public deductions: ", "")
            .split(", ")
            .map(Number),
        })),
      );
    let match:
      { a: (typeof own)[number]; b: (typeof targets)[number] } | undefined;
    for (const a of own) {
      const b = targets.find(
        (b) => b.poss.length === 1 && b.poss[0] === a.value,
      );
      if (b) {
        match = { a, b };
        break;
      }
    }
    if (match) {
      await page.locator(`[data-slot="${match.a.id}"]`).click();
      await page.locator(`[data-slot="${match.b.id}"]`).click();
      await page.getByRole("button", { name: /^Connect / }).click();
    } else {
      const hidden = page
        .locator(
          ".rack-nova .wire-tile.secret:not(.disclosed):not(:disabled),.rack-pip .wire-tile.secret:not(.disclosed):not(:disabled)",
        )
        .first();
      if (await hidden.count()) {
        await hidden.click();
        if (
          await page.getByRole("button", { name: "Request clue" }).isEnabled()
        )
          await page.getByRole("button", { name: "Request clue" }).click();
        else
          await page
            .getByRole("button", { name: "Pass turn", exact: true })
            .click();
      } else if (own.length) {
        await page.locator(`[data-slot="${own[0].id}"]`).click();
        await page
          .getByRole("button", { name: "Resolve selected number alone" })
          .click();
        if (
          await page
            .getByRole("button", { name: "Pass turn", exact: true })
            .isEnabled()
        )
          await page
            .getByRole("button", { name: "Pass turn", exact: true })
            .click();
      } else await page.clock.runFor(1500);
    }
    await page.clock.runFor(3100);
    if (await page.getByRole("heading", { name: /Mission Complete/ }).count())
      return;
  }
  throw new Error("Public deduction test did not complete");
}
test("real standard-deck mission: sorted board, public deductions, AI turns, victory and replay", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await launch(page, "/tests/fixtures/real.html");
  await expect(page.locator(".wire-tile")).toHaveCount(48);
  await expect(
    page.getByRole("button", { name: /slot \d+, hidden/ }),
  ).toHaveCount(32);
  expect(
    await page
      .locator(".rack")
      .evaluateAll((r) => r.map((e) => e.getAttribute("aria-label"))),
  ).toEqual(["Nova circuit rack", "Pip circuit rack", "Sam circuit rack"]);
  const values = await page
    .locator(".rack-sam .wire-tile strong")
    .allTextContents();
  expect(values.map(Number)).toEqual(values.map(Number).sort((a, b) => a - b));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/previews/${info.project.name}-game.png`,
    fullPage: true,
  });
  await solve(page);
  await expect(
    page.getByRole("heading", { name: /Mission Complete/ }),
  ).toBeVisible();
  await expect(page.getByText("24/24", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `docs/previews/${info.project.name}-victory.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Play Again" }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.locator(".turn-pill")).toContainText("Sam's");
  await page.clock.runFor(2100);
  await expect(page.getByText("4:58", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Leave mission" }).click();
  await page.getByRole("button", { name: "Back to the ship" }).click();
  await expect(page.getByRole("button", { name: "Play Solo" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("real engine mistake triggers impact, public reveal, AI turn and fatal defeat/retry", async ({
  page,
}, info) => {
  await launch(page, "/tests/fixtures/real.html?fatal=1");
  const own = page.locator(".rack-sam .wire-tile").last();
  await own.click();
  await page.locator(".rack-nova .wire-tile").first().click();
  await expect(
    page.getByRole("region", { name: "Confirm connection" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Connect / }).click();
  await expect(page.locator(".attack-scene")).toHaveClass(/under-attack/);
  await expect(page.locator(".projectile")).toHaveCount(1);
  await expect(page.locator(".rack-nova .wire-tile").first()).toHaveClass(
    /disclosed/,
  );
  await expect(page.getByText("0%", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `docs/previews/${info.project.name}-impact.png`,
    fullPage: true,
  });
  await page.clock.runFor(1300);
  await expect(
    page.getByRole("heading", { name: /Mission Failed/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Hull integrity lost", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.locator(".wire-tile.disclosed")).toHaveCount(0);
});
test("production navigation, persisted preferences, off-turn controls, timeout and restart", async ({
  page,
}) => {
  await launch(page);
  const own = page.locator(".rack-sam .wire-tile").first();
  await own.click();
  await page
    .getByRole("button", { name: "Share selected Sam circuit" })
    .click();
  await expect(page.locator(".turn-pill")).toContainText("Nova's");
  await expect(own).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Pass turn", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Request clue" }),
  ).toBeDisabled();
  await page.clock.runFor(300000);
  await page.clock.runFor(1200);
  await expect(
    page.getByRole("heading", { name: /Mission Failed/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Emergency power expired", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try Again" }).click();
  await page.clock.runFor(1100);
  await expect(page.getByText("4:59", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: /Private Room/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Play Solo" }).click();
  const card = page.locator(".mission-card").first();
  await card.getByRole("combobox").selectOption("Hard");
  await expect(card.getByRole("button")).toBeDisabled();
});
test("isolated turn/reveal fixtures: keyboard confirmation, cancel, duplicate prevention, reduced motion", async ({
  page,
}) => {
  await launch(page, "/tests/fixtures/harness.html");
  const sam = page.getByRole("button", {
    name: "Sam circuit 2, slot 1",
    exact: true,
  });
  await sam.focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Nova, slot 1, hidden", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Declared number" }),
  ).toHaveValue("2");
  await expect(
    page.getByRole("textbox", { name: "Declared number" }),
  ).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Confirm connection" }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Nova, slot 1, hidden", exact: true })
    .click();
  await page.getByRole("button", { name: /^Connect / }).dblclick();
  await expect(page.locator("#command-count")).toHaveText("1");
  await page.getByRole("button", { name: "Fixture nova", exact: true }).click();
  await expect(sam).toBeDisabled();
  await expect(page.locator(".rack-nova")).toHaveClass(/active-rack/);
  await page
    .getByRole("button", { name: "Fixture damage", exact: true })
    .click();
  await expect(page.locator(".attack-scene")).toHaveClass(/under-attack/);
  await page.clock.runFor(1200);
  await expect(
    page.getByRole("button", { name: "Nova, slot 1, clue 4", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Fixture success", exact: true })
    .click();
  await expect(page.locator(".connection-arc path")).toHaveAttribute("d", /^M/);
  await expect(
    page.getByRole("button", {
      name: "Sam circuit 2, slot 1, restored",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Fixture damage", exact: true })
    .click();
  await page.clock.runFor(700);
  await expect(page.locator(".attack-vfx")).toBeHidden();
});
