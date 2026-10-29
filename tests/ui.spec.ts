import { deduce } from "../src/engine/ai";
import type { Circuit, IncorrectGuess } from "../src/engine/types";
import { test, expect, type Page } from "@playwright/test";
async function finishSetup(page: Page) {
  if (!(await page.locator(".starting-options button").count())) return;
  await page.locator(".starting-options button").last().click();
}
async function launch(page: Page, path = "/") {
  await page.clock.install();
  await page.goto(path);
  await page.getByRole("button", { name: "Let's Fly!" }).click();
  await page.getByRole("button", {name:"Continue solo", exact:true}).click();
  await page.getByRole("button", {name:"Play mode", exact:true}).click();

  await page.getByRole("button", { name: "Begin Mission" }).click();
  await finishSetup(page);
  await waitHuman(page);
  await expect(
    page.getByRole("heading", { name: "Emergency Repair Terminal" }),
  ).toBeVisible();
  await finishSetup(page);
  await waitHuman(page);
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
    for (const tile of await page.locator(".number-marker").all()) {
      const partial = /[1-3] of 4 resolved/.test(
        (await tile.getAttribute("aria-label")) ?? "",
      );
      if (partial)
        await expect(tile.locator(".tracker-body-art")).toHaveAttribute("src", /tracker-blue/);
    }
    // Test driver reasons ONLY from rendered public board. No private board or seed lookup.
    const circuits = (await page.locator(".rack").evaluateAll((rows) =>
      rows.flatMap((row) =>
        Array.from(row.querySelectorAll(".wire-tile")).map((el, position) => ({
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
        })),
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
      } else if (own.length) {
        const transmissions = await page
          .getByRole("log", { name: "Crew transmissions" })
          .innerText();
        const sharedSlots = new Set(
          Array.from(
            transmissions.matchAll(/Sam, slot (\d+): my number/g),
            (m) => Number(m[1]),
          ),
        );
        const markers = new Set(await page.locator(".rack-sam .wire-tile:has(.information-marker)").evaluateAll(els => els.map(e => e.getAttribute("data-slot"))));
        const candidate = own.find((c) => !sharedSlots.has(c.position + 1) && !markers.has(c.id));
        if (candidate) {
          await page.locator(`[data-slot="${candidate.id}"]`).click();
          await page
            .getByRole("button", { name: "Share selected Sam circuit" })
            .click();
        } else
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
  ).toHaveCount(30);
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
  await finishSetup(page);
  await waitHuman(page);
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.locator(".turn-pill")).toContainText("Sam's");
  await page.clock.runFor(2100);
  await expect(page.getByText(/4:5[0-9]/, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Leave mission" }).click();
  await page.getByRole("button", { name: "Back to crew selection" }).click();
  await page.getByRole("button", { name: "Back to the ship" }).click();
  await expect(page.getByRole("button", { name: "Let's Fly!" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("real engine mistake triggers impact, public reveal, AI turn and fatal defeat/retry", async ({
  page,
}, info) => {
  await launch(page, "/tests/fixtures/real.html?fatal=1");
  const own = page.locator(".rack-sam .wire-tile").last();
  await own.click();
  await page.locator(".rack-nova .wire-tile").first().click();
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
  await finishSetup(page);
  await waitHuman(page);
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.locator(".information-marker")).toHaveCount(3);
  await expect(page.locator(".deduction-log")).not.toContainText("Incorrect;");
});
test("production navigation, persisted preferences, off-turn controls, timeout and restart", async ({
  page,
}) => {
  await launch(page);
  const own = page.locator(".rack-sam .wire-tile:not(.cleared):not(:has(.information-marker))").first();
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
  await page.clock.fastForward(300000);
  await expect(page.getByText("0:00", { exact: true })).toBeVisible();
  await page.clock.runFor(1200);
  await expect(
    page.getByRole("heading", { name: /Mission Failed/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Emergency power expired", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try Again" }).click();
  await finishSetup(page);
  await waitHuman(page);
  await page.clock.runFor(1100);
  await expect(page.getByText(/4:5[0-9]/, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Let's Fly!" }).click();
  await page.getByRole("button", {name:"Continue solo",exact:true}).click();
  const card = page.locator(".adventure-mode").first();
  await card.getByRole("combobox").selectOption("Hard");
  await expect(card.locator(".illustrated-mode-button")).toBeDisabled();
});
test("isolated fixtures: keyboard pair submits once and off-turn controls stay disabled", async ({page}) => {
 await launch(page,"/tests/fixtures/harness.html");
 const sam=page.getByRole("button",{name:"Sam circuit 2, slot 1",exact:true});await sam.focus();await page.keyboard.press("Enter");await page.getByRole("button",{name:"Nova, slot 1, hidden",exact:true}).click();
 await expect(page.locator("#command-count")).toHaveText("1");await expect(page.locator("dialog[open]")).toHaveCount(0);
 await page.getByRole("button",{name:"Fixture nova",exact:true}).click();await expect(sam).toBeDisabled();await expect(page.locator(".rack-nova")).toHaveClass(/active-rack/);
 await page.getByRole("button",{name:"Fixture damage",exact:true}).click();await expect(page.locator(".attack-scene")).toHaveClass(/under-attack/);await page.clock.runFor(1200);await expect(page.getByRole("button",{name:"Nova, slot 1, clue 4",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Fixture success",exact:true}).click();await expect(page.locator(".connection-arc path")).toHaveAttribute("d",/^M/);
});
test("Self-Match clears all four; rejected pair explains eligibility without damage or turn loss", async ({page}) => {
 await launch(page,"/tests/fixtures/real.html?self=1");await page.locator('[data-slot="sam-2"]').click();await page.locator('[data-slot="sam-3"]').click();await expect(page.locator('.rack-sam .wire-tile.cleared')).toHaveCount(4);await expect(page.locator('dialog[open]')).toHaveCount(0);
 await page.goto('/tests/fixtures/real.html');await page.getByRole('button',{name:"Let's Fly!"}).click();await page.getByRole('button',{name:'Continue solo',exact:true}).click();await page.getByRole('button',{name:'Play mode',exact:true}).click();await page.getByRole('button',{name:'Begin Mission'}).click();await finishSetup(page);await page.locator('[data-slot="sam-0"]').click();await page.locator('[data-slot="sam-1"]').click();
 await expect(page.locator('.board-instruction')).toContainText('all remaining copies');await expect(page.locator('dialog[open]')).toHaveCount(0);await expect(page.getByText('100%',{exact:true})).toBeVisible();await expect(page.locator('.turn-pill')).toContainText("Sam's");
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
  await page.getByRole("button", { name: "Confirm Tool" }).dblclick();
  await expect(page.locator(".sam-clue")).toBeVisible();
  await expect(page.getByRole("button", { name: /Sam’s Hint/ })).toBeDisabled();
  await expect(page.locator(".turn-pill")).toContainText("Sam's");
  await page.clock.runFor(800);
  await page.getByRole("button", { name: /Emergency Shield/ }).click();
  await page.getByRole("button", { name: "Confirm Tool" }).click();
  await expect(
    page.getByLabel("Emergency Shield active", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(800);
  await page.locator(".rack-sam .wire-tile").last().click();
  await page.locator(".rack-nova .wire-tile").first().click();
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
  await expect(page.locator(".tool-target")).toHaveCount(30);
  await page.getByLabel("Nova tool target").selectOption("nova-0");
  await page.getByRole("spinbutton", { name: "Scanner threshold" }).fill("6");
  await page.getByRole("button", { name: "Confirm Tool" }).click();
  await expect(page.locator('[data-slot="nova-0"] .scanner-beam')).toHaveCount(
    1,
  );
  await expect(
    page.locator('[data-slot="nova-0"] .scanner-result'),
  ).toContainText("below 6");
  await expect(page.locator('[data-slot="nova-0"] strong')).toHaveText("?");
  await page.goto("/tests/fixtures/real.html?tools=all");
  await page.getByRole("button", { name: "Let's Fly!" }).click();
  await page.getByRole("button", {name:"Continue solo", exact:true}).click();
  await page.getByRole("button", {name:"Play mode", exact:true}).click();

  await page.getByRole("button", { name: "Begin Mission" }).click();
  await finishSetup(page);
  await waitHuman(page);
  await page.locator('[data-slot="sam-0"]').click();
  await page.getByRole("button", { name: /Dual Scanner/ }).click();
  await page.getByLabel("Pip tool target").selectOption("pip-0");
  await page.getByLabel("Nova tool target").selectOption("nova-14");
  await page.getByRole("button", { name: "Confirm Tool" }).click();
  await expect(page.locator('[data-slot="sam-0"]')).toHaveClass(/cleared/);
  await expect(page.locator('[data-slot="pip-0"]')).toHaveClass(/cleared/);
  await expect(page.locator('[data-slot="nova-14"] strong')).toHaveText("?");
  await page.clock.runFor(700);
  await expect(page.locator(".connection-arc")).toBeVisible();
});

test("drag Self-Match connects immediately, mouse and touch", async ({
  page,
}, info) => {
  await launch(page, "/tests/fixtures/real.html?self=1");
  const source = page.locator('[data-slot="sam-2"]'),
    target = page.locator('[data-slot="sam-3"]');
  await source.scrollIntoViewIfNeeded();
  const a = (await source.boundingBox())!,
    b = (await target.boundingBox())!;
  const start = { x: a.x + a.width / 2, y: a.y + 8 },
    end = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  if (info.project.name === "mobile") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [start],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [end],
    });
    await page.clock.runFor(30);
    await expect(page.locator(".drag-wire path")).toHaveAttribute("d", /^M/);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.clock.runFor(30);
    await expect(page.locator(".drag-wire path")).toHaveAttribute("d", /^M/);
    await page.mouse.up();
  }
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator(".rack-sam .wire-tile.cleared")).toHaveCount(4);
});

test("drag to crew with mobile edge scrolling submits immediately", async ({
  page,
}, info) => {
  await launch(page, "/tests/fixtures/real.html");
  if (info.project.name === "desktop")
    await page.setViewportSize({ width: 1440, height: 1500 });
  const source = page.locator('[data-slot="sam-15"]'),
    target = page.locator('[data-slot="nova-0"]');
  await source.scrollIntoViewIfNeeded();
  const a = (await source.boundingBox())!;
  if (info.project.name === "mobile") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: a.x + a.width / 2, y: a.y + 8 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: a.x + a.width / 2, y: 10 }],
    });
    await expect(page.locator(".drag-wire")).toHaveCount(1);
    for (let i = 0; i < 40; i++) {
      const r = (await target.boundingBox())!;
      if (r.y >= 65 && r.y + r.height < 800) break;
      await page.clock.runFor(100);
    }
    // Leave the scroll edge before measuring the drop. Real time can pass
    // between protocol calls even while the test advances animation frames.
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{x:195,y:400}],
    });
    await page.clock.runFor(50);
    const b = (await target.boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(0);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
    });
    await page.clock.runFor(40);
    await expect(target).toHaveClass(/drop-ready/);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.mouse.move(a.x + a.width / 2, a.y + 8);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2, 10, {steps:5});
    for(let i=0;i<50;i++){
      const r=(await target.boundingBox())!;
      if(r.y>=65 && r.y+r.height<1400)break;
      await page.clock.runFor(100);
    }
    const b=(await target.boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(0);
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10});
    await page.clock.runFor(40);
    await page.mouse.up();
  }
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator(".drag-wire")).toHaveCount(0);
  await expect(page.getByText("85%",{exact:true})).toBeVisible();
});

async function launchLab(page: Page, kind: "yellow" | "red") {
  await page.clock.install();
  await page.goto("/tests/fixtures/real.html");
  await page.getByRole("button", { name: "Let's Fly!" }).click();
  await page.getByRole("button", {name:"Continue solo",exact:true}).click();
  await page
    .getByRole("button", {
      name: kind === "yellow" ? /Circuit Training 4/ : /Circuit Training 7/,
    })
    .click();
  await page.getByRole("button", { name: "Begin Mission" }).click();
  await finishSetup(page);
  await waitHuman(page);
}
test("number tracker shows four-copy completion from actual Self-Match", async ({
  page,
}, info) => {
  await launch(page, "/tests/fixtures/real.html?self=1");
  await expect(page.getByLabel("Circuit number tracker")).toBeVisible();
  await expect(page.locator(".number-marker")).toHaveCount(12);
  await expect(
    page.getByLabel("Number 2: 0 of 4 resolved", { exact: true }),
  ).toBeVisible();
  await page.locator('[data-slot="sam-2"]').click();
  await page.locator('[data-slot="sam-3"]').click();
  await expect(
    page.getByLabel("Number 2: 4 of 4 resolved, completed", { exact: true }),
  ).toHaveClass(/number-complete/);
  await expect(page.locator(".number-complete .tracker-body-art")).toHaveAttribute("src", /tracker-green/);
  await expect(page.locator(".number-complete small")).toHaveText("4/4");
  await expect(page.locator(".number-marker")).toHaveCount(12);
  await expect(page.locator(".special-marker")).toHaveCount(0);
  await page.screenshot({
    path: `docs/previews/${info.project.name}-tracker.png`,
    fullPage: true,
  });
});
test("yellow lab reveals only authorized types and updates separate category progress", async ({
  page,
}, info) => {
  await launchLab(page, "yellow");
  await expect(page.locator(".wire-tile")).toHaveCount(52);
  await expect(page.locator(".tracker-badge.badge-yellow")).toHaveCount(4);
  await expect(
    page.locator('.number-tracker [data-label="2A"]'),
  ).toHaveAttribute("data-certainty", "possible");
  await expect(
    page.locator('.number-tracker [data-label="5A"]'),
  ).toHaveAttribute("data-certainty", "confirmed");
  await expect(
    page.locator(".rack-nova .circuit-yellow,.rack-pip .circuit-yellow"),
  ).toHaveCount(0);
  await expect(page.locator('[data-slot="sam-6"]')).toHaveAttribute(
    "data-circuit-type",
    "yellow",
  );
  await expect(page.locator('[data-slot="sam-6"] .sort-position')).toHaveText(
    "5A",
  );
  await page.locator('[data-slot="sam-6"]').click();
  await page.locator('[data-slot="nova-8"]').click();
  await expect(
    page.locator('.number-tracker [data-label="8A"]'),
  ).toHaveAttribute("data-certainty", "confirmed");
  await expect(page.locator(".special-register,.special-marker")).toHaveCount(
    0,
  );
  await expect(page.locator('[data-slot="nova-8"]')).toHaveAttribute(
    "data-circuit-type",
    "yellow",
  );
  await expect(page.locator('[data-slot="nova-8"] .sort-position')).toHaveText(
    "8A",
  );
  await expect(page.locator(".number-complete")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/previews/${info.project.name}-yellow.png`,
    fullPage: true,
  });
});
test("red lab warns only about public identities and red trigger has distinct failure even with shield", async ({
  page,
}, info) => {
  await launchLab(page, "red");
  await expect(page.locator(".wire-tile")).toHaveCount(54);
  await expect(page.locator(".tracker-badge.badge-red")).toHaveCount(2);
  await expect(page.locator(".special-register,.special-marker")).toHaveCount(
    0,
  );
  await expect(page.locator('[data-slot="sam-5"]')).toHaveAttribute(
    "data-circuit-type",
    "red",
  );
  await expect(page.locator('[data-slot="nova-13"]')).toHaveAttribute(
    "data-circuit-type",
    "hidden",
  );
  await page.locator('[data-slot="sam-5"]').click();
  await expect(
    page.getByRole("button", { name: "Isolate Overload", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Safe resolution requires an entirely red remaining own hand.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".turn-pill")).toContainText("Sam's");
  await page.getByRole("button", { name: /Emergency Shield/ }).click();
  await page.getByRole("button", { name: "Confirm Tool" }).click();
  await page.clock.runFor(800);
  await page.locator('[data-slot="sam-0"]').click();
  await page.locator('[data-slot="nova-13"]').click();
  await expect(page.locator(".critical-flash")).toBeVisible();
  await expect(page.locator('[data-slot="nova-13"]')).toHaveAttribute(
    "data-circuit-type",
    "red",
  );
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `docs/previews/${info.project.name}-red.png`,
    fullPage: true,
  });
  await page.clock.runFor(1300);
  await expect(
    page.getByRole("heading", { name: /Mission Failed/ }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Red circuit triggered; shield cannot prevent mission failure",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try Again" }).click();
  await finishSetup(page);
  await waitHuman(page);
  await expect(page.locator('[data-slot="nova-13"]')).toHaveAttribute(
    "data-circuit-type",
    "hidden",
  );
  await expect(page.locator(".tracker-badge.badge-red")).toHaveCount(2);
  await expect(page.locator(".special-register,.special-marker")).toHaveCount(
    0,
  );
});

test("tracker badges stay inside existing tiles, preserve progress and distinguish uncertain positions", async ({
  page,
}, info) => {
  await launchLab(page, "red");
  await expect(page.locator(".number-marker")).toHaveCount(12);
  await expect(page.locator(".special-register,.special-marker")).toHaveCount(
    0,
  );
  await expect(page.locator(".number-tracker")).not.toContainText(
    "Possible sorting positions",
  );
  await expect(page.locator(".number-tracker")).not.toContainText(
    "YELLOW · SPECIAL",
  );
  const yellow = page
    .locator(".number-marker")
    .filter({ has: page.locator('[data-label="2A"]') });
  await expect(
    yellow.getByRole("img", { name: /Confirmed bridge circuit 2A/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Possible bridge circuit 8A/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Confirmed overload circuit 4/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Possible overload circuit 9/ }),
  ).toBeVisible();
  await expect(page.locator(".number-tracker")).not.toContainText("2.5");
  await expect(page.locator(".tracker-badge svg")).toHaveCount(6);
  for (const width of [390, 740, 820, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    const overlaps = await page
      .locator(".number-marker")
      .evaluateAll((tiles) => {
        const bad: string[] = [];
        for (const tile of tiles) {
          const box = tile.getBoundingClientRect();
          const badges = tile.querySelectorAll(".tracker-badge");
          const textRects = [tile.querySelector("strong")]
            .filter(Boolean)
            .map((el) => {
              const range = document.createRange();
              range.selectNodeContents(el!);
              return range.getBoundingClientRect();
            });
          const rects = [
            ...textRects,
            ...Array.from(tile.querySelectorAll(".copy-pips i")).map((el) =>
              el.getBoundingClientRect(),
            ),
          ];
          for (const badge of badges) {
            const r = badge.getBoundingClientRect();
            if (
              r.left < box.left ||
              r.right > box.right ||
              r.top < box.top ||
              r.bottom > box.bottom
            )
              bad.push("outside tile");
            for (const t of rects)
              if (
                r.left < t.right - 0.1 &&
                r.right > t.left + 0.1 &&
                r.top < t.bottom - 0.1 &&
                r.bottom > t.top + 0.1
              )
                bad.push(JSON.stringify({problem:"overlapping progress",label:badge.getAttribute("aria-label"),badge:r,progress:t,width:innerWidth}));
          }
        }
        return bad;
      });
    expect(overlaps).toEqual([]);
  }
  await page.screenshot({
    path: `docs/previews/${info.project.name}-tracker-badges.png`,
    fullPage: true,
  });
});
test("circuit pair submits without a modal or layout shift", async ({page}) => {
 await launch(page,"/tests/fixtures/real.html");const source=page.locator('[data-slot="sam-0"]'),target=page.locator('[data-slot="nova-0"]');const before=(await page.locator('.board-main').boundingBox())!;
 await source.click();await target.click();await expect(page.locator('dialog[open]')).toHaveCount(0);await expect(page.getByText('85%',{exact:true})).toBeVisible();const after=(await page.locator('.board-main').boundingBox())!;expect(Math.abs(before.width-after.width)).toBeLessThanOrEqual(1);await expect(page.locator('.attack-vfx')).toHaveCount(1);
});
test("tools share a centered modal and cancel preserves charges and board layout", async ({
  page,
}, info) => {
  await launch(page, "/tests/fixtures/real.html?tools=all");
  for (const name of [
    "Circuit Scanner",
    "Dual Scanner",
    "Emergency Shield",
    "Sam’s Hint",
  ]) {
    const button = page.getByRole("button", { name: new RegExp(name) });
    const before = await button.textContent();
    const board = await page.locator(".rack-sam").boundingBox();
    await button.click();
    const modal = page.getByRole("dialog", { name, exact: true });
    await expect(modal).toBeVisible();
    await expect(modal).toHaveJSProperty("open", true);
    expect(await modal.evaluate((el) => el.matches(":modal"))).toBe(true);
    expect(
      await modal.evaluate(
        (el) => getComputedStyle(el, "::backdrop").backgroundColor,
      ),
    ).not.toBe("rgba(0, 0, 0, 0)");
    const box = await modal.boundingBox();
    const viewport = page.viewportSize()!;
    expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThan(
      2,
    );
    expect(box!.width).toBeLessThan(viewport.width);
    expect((await page.locator(".rack-sam").boundingBox())!.height).toBe(
      board!.height,
    );
    await expect(
      modal.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(modal.locator(":focus")).toHaveCount(1);
    await page.screenshot({
      path: `docs/previews/${info.project.name}-tool-modal.png`,
    });
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(button).toHaveText(before);
    await expect(button).toBeFocused();
  }
  await expect(
    page.locator(".number-marker:not(.number-complete) .tracker-body-art").first(),
  ).toHaveAttribute("src", /tracker-blue/);
});
