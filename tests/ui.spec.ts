import { deduce } from "../src/engine/ai";
import type { Circuit, IncorrectGuess } from "../src/engine/types";
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
  for (let step = 0; step < 100; step++) {
    await waitHuman(page);
    if (await page.getByRole("heading", { name: /Mission Complete/ }).count())
      return;
    // Test driver reasons ONLY from rendered public board. No private board or seed lookup.
    const circuits = (await page
      .locator(".rack")
      .evaluateAll((rows) =>
        rows.flatMap((row) =>
          Array.from(row.querySelectorAll(".wire-tile")).map(
            (el, position) => ({
              id: el.getAttribute("data-slot")!,
              owner: row.classList.contains("rack-sam")
                ? "sam"
                : row.classList.contains("rack-nova")
                  ? "nova"
                  : "pip",
              position,
              restored: el.classList.contains("cleared"),
              ...((el.querySelector("strong")!.textContent ?? "?") !== "?"
                ? { value: Number(el.querySelector("strong")!.textContent) }
                : {}),
            }),
          ),
        ),
      )) as Circuit[];
    const reveals = circuits
      .filter((c) => c.value !== undefined)
      .map((c) => ({
        circuitId: c.id,
        value: c.value!,
        reason: "clue" as const,
      }));
    const domains = deduce({
      self: "sam",
      circuits,
      reveals,
      incorrectGuesses: [],
      min: 1,
      max: 12,
      copies: 4,
      energy: 8,
      deductionPasses: 48,
    });
    const own = circuits.filter((c) => c.owner === "sam" && !c.restored);
    let move: { a: Circuit; b: Circuit } | undefined;
    for (const a of own) {
      const b = circuits.find(
        (c) =>
          c.owner !== "sam" &&
          !c.restored &&
          domains[c.id]?.length === 1 &&
          domains[c.id][0] === a.value,
      );
      if (b) {
        move = { a, b };
        break;
      }
    }
    if (move) {
      await page.locator(`[data-slot="${move.a.id}"]`).click();
      await page.locator(`[data-slot="${move.b.id}"]`).click();
      await page.getByRole("button", { name: /^Connect / }).click();
    } else {
      const solo = own.find(
        (c) =>
          own.filter((t) => t.value === c.value).length >= 2 &&
          own.filter((t) => t.value === c.value).length +
            circuits.filter((t) => t.restored && t.value === c.value).length ===
            4,
      );
      if (solo) {
        const pair = own.filter((c) => c.value === solo.value);
        await page.locator(`[data-slot="${pair[0].id}"]`).click();
        await page.locator(`[data-slot="${pair[1].id}"]`).click();
        await page.getByRole("button", { name: "Connect Pair" }).click();
      } else if (own.length) {
        await page.locator(`[data-slot="${own[0].id}"]`).click();
        const share = page.getByRole("button", {
          name: "Share selected Sam circuit",
        });
        let shared = false;
        for (const candidate of own) {
          await page.locator(`[data-slot="${candidate.id}"]`).click();
          if (await share.isEnabled()) {
            await share.click();
            shared = true;
            break;
          }
        }
        if (!shared)
          await page
            .getByRole("button", { name: "Pass turn", exact: true })
            .click();
      } else await page.clock.runFor(1500);
    }
    await page.clock.runFor(3100);
  }
  throw new Error("Public-board test did not complete");
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
  await expect(page.getByRole("button", { name: /Sam’s Hint/ })).toBeDisabled();
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

test("Self-Match clears all four; rejected pair explains eligibility without damage or turn loss", async ({
  page,
}) => {
  await launch(page, "/tests/fixtures/real.html?self=1");
  const before = await page
    .locator(".rack-sam .wire-tile")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-slot")));
  await page.locator('[data-slot="sam-2"]').click();
  await page.locator('[data-slot="sam-3"]').click();
  await expect(
    page.getByRole("button", { name: "Connect Pair", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Connect Pair", exact: true }).click();
  await expect(page.locator(".rack-sam .wire-tile.cleared")).toHaveCount(4);
  await expect(page.locator(".connection-arc path")).toHaveAttribute("d", /^M/);
  expect(
    await page
      .locator(".rack-sam .wire-tile")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-slot"))),
  ).toEqual(before);
  await page.goto("/tests/fixtures/real.html");
  await page.getByRole("button", { name: "Play Solo" }).click();
  await page.getByRole("button", { name: "Start mission" }).click();
  await page.getByRole("button", { name: "Begin Mission" }).click();
  await page.locator('[data-slot="sam-0"]').click();
  await page.locator('[data-slot="sam-1"]').click();
  await page.getByRole("button", { name: "Connect Pair", exact: true }).click();
  await expect(page.locator(".board-instruction")).toContainText(
    "all remaining copies",
  );
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.locator(".turn-pill")).toContainText("Sam's");
  await expect(page.locator(".attack-vfx")).toHaveCount(0);
});
test("Easy toolkit locks, limited hint and shield interception from real engine", async ({
  page,
}, info) => {
  await launch(page, "/tests/fixtures/real.html");
  await expect(
    page.getByRole("button", { name: /Circuit Scanner/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /Dual Scanner/ }),
  ).toBeDisabled();
  await expect(page.locator(".wire-tile[title]")).toHaveCount(0);
  await page.getByRole("button", { name: /Sam’s Hint/ }).click();
  await page.getByRole("button", { name: "Confirm tool" }).dblclick();
  await expect(page.locator(".sam-clue")).toBeVisible();
  await expect(page.getByRole("button", { name: /Sam’s Hint/ })).toBeDisabled();
  await expect(page.locator(".turn-pill")).toContainText("Sam's");
  await page.clock.runFor(800);
  await page.getByRole("button", { name: /Emergency Shield/ }).click();
  await page.getByRole("button", { name: "Confirm tool" }).click();
  await expect(
    page.getByLabel("Emergency Shield active", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(800);
  await page.locator(".rack-sam .wire-tile").last().click();
  await page.locator(".rack-nova .wire-tile").first().click();
  await page.getByRole("button", { name: /^Connect / }).click();
  await expect(
    page.getByLabel("Shield absorbed the attack", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".blocked-projectile")).toHaveCount(1);
  await expect(page.locator(".attack-vfx")).toHaveCount(0);
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `docs/previews/${info.project.name}-shield.png`,
    fullPage: true,
  });
  await page.clock.runFor(3100);
  await expect(
    page.getByRole("button", { name: /Emergency Shield/ }),
  ).toBeDisabled();
});
test("later-mission scanner and dual scanner target controls use real tool outcomes", async ({
  page,
}) => {
  await launch(page, "/tests/fixtures/real.html?tools=all");
  await page.getByRole("button", { name: /Circuit Scanner/ }).click();
  await expect(page.locator(".tool-target")).toHaveCount(32);
  await page.locator('[data-slot="nova-0"]').click();
  await page.getByRole("spinbutton", { name: "Scanner threshold" }).fill("6");
  await page.getByRole("button", { name: "Confirm tool" }).click();
  await expect(page.locator('[data-slot="nova-0"] .scanner-beam')).toHaveCount(
    1,
  );
  await expect(
    page.locator('[data-slot="nova-0"] .scanner-result'),
  ).toContainText("below 6");
  await expect(page.locator('[data-slot="nova-0"] strong')).toHaveText("?");
  await page.goto("/tests/fixtures/real.html?tools=all");
  await page.getByRole("button", { name: "Play Solo" }).click();
  await page.getByRole("button", { name: "Start mission" }).click();
  await page.getByRole("button", { name: "Begin Mission" }).click();
  await page.locator('[data-slot="sam-0"]').click();
  await page.getByRole("button", { name: /Dual Scanner/ }).click();
  await page.locator('[data-slot="pip-0"]').click();
  await page.locator('[data-slot="nova-15"]').click();
  await page.getByRole("button", { name: "Confirm tool" }).click();
  await expect(page.locator('[data-slot="sam-0"]')).toHaveClass(/cleared/);
  await expect(page.locator('[data-slot="pip-0"]')).toHaveClass(/cleared/);
  await expect(page.locator('[data-slot="nova-15"] strong')).toHaveText("?");
  await page.clock.runFor(700);
  await expect(page.locator(".connection-arc")).toBeVisible();
});
