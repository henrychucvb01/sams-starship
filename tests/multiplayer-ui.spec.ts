import {
  test,
  expect,
  type Page,
  type Browser,
  type BrowserContext,
} from "@playwright/test";
import type { RoomView, RoomAdmission } from "../src/engine/multiplayer";
const enabled = !!process.env.STARSHIP_MULTIPLAYER_TEST;
async function select(page: Page, n: number) {
  await page.goto("/");
  await page.getByRole("button", { name: "Let's Fly!" }).click();
  await expect(
    page.getByRole("heading", { name: "Assemble your crew!" }),
  ).toBeVisible();
  await page.locator(`input[name="crew-size"][value="${n}"]`).check();
  for(const name of ["Fox","Bunny","Cat","Bear"].slice(0,n-1)) await page.getByRole("button",{name:`Choose ${name}`,exact:true}).click();
  await page
    .getByRole("button", { name: `Continue with ${n} players` })
    .click();
  await page.getByRole("button",{name:"Play mode",exact:true}).click();
}
type Seat = {
  page: Page;
  context: BrowserContext;
  room: () => RoomView | undefined;
  playerId: string;
};
async function roomWithCrew(
  browser: Browser,
  n: number,
  baseURL: string,
  project: string,
) {
  const seats: Seat[] = [];
  let code = "";
  for (let i = 0; i < n; i++) {
    const context = await browser.newContext({
      baseURL,
      viewport:
        project === "mobile"
          ? { width: 390, height: 844 }
          : { width: 1440, height: 1000 },
      isMobile: project === "mobile",
      hasTouch: project === "mobile",
    });
    const page = await context.newPage();
    let latest: RoomView | undefined;
    page.on("response", async (r) => {
      if (r.url().includes("/api/rooms") && r.ok()) {
        try {
          const json = await r.json();
          if (json.room) latest = json.room;
          else if (json.code && json.players) latest = json;
        } catch {}
      }
    });
    await select(page, n);
    await page.getByLabel("Your display name").fill(`Crew ${i + 1}`);
    const admission = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        r.url().includes(i === 0 ? "/api/rooms" : "/join") &&
        r.status() === 201,
    );
    if (i === 0)
      await page
        .getByRole("button", { name: `Create ${n}-player room` })
        .click();
    else {
      await page.getByLabel("Room code", { exact: true }).fill(code);
      await page
        .getByRole("button", { name: "Join room", exact: true })
        .click();
    }
    const body = (await (await admission).json()) as RoomAdmission;
    code = body.credentials.code;
    seats.push({
      page,
      context,
      room: () => latest,
      playerId: body.credentials.playerId,
    });
    await expect(
      page.getByRole("heading", { name: "All aboard!" }),
    ).toBeVisible();
  }
  for (let i = 0; i < n; i++) {
    const p = seats[i].page;
    await expect(p.locator(".mp-seat.empty")).toHaveCount(0);
    if (i > 0)
      await expect(
        p.locator(".mp-seat").filter({ hasText: `Crew ${i}` }),
      ).toContainText("✓ Ready");
    await p.getByRole("button", { name: "I’m ready!", exact: true }).click();
    await expect(
      p.getByRole("button", { name: "Not ready yet", exact: true }),
    ).toBeVisible();
  }
  await expect(
    seats[0].page.getByRole("button", { name: "Launch mission", exact: true }),
  ).toBeEnabled();
  await seats[0].page
    .getByRole("button", { name: "Launch mission", exact: true })
    .click();
  for (const seat of seats)
    await expect(seat.page.locator(".mp-board")).toBeVisible();
  return seats;
}
async function starting(seats: Seat[]) {
  for (let i = 0; i < seats.length; i++) {
    const p = seats[i].page;
    if (i > 0)
      await expect(p.locator(".starting-information")).toContainText(
        `${i}/${seats.length} crew markers placed`,
      );
    await p.locator(".starting-information .mp-actions button").first().click();
    await expect(p.locator(".setup-dialog")).toHaveCount(0);
  }
  for (const seat of seats) {
    await expect(seat.page.locator(".starting-information")).toHaveCount(0);
    await expect.poll(() => seat.room()?.game?.phase).toBe("turns");
    await expect(seat.page.locator(".mp-board .turn-pill")).not.toContainText("Choose starting information");
  }
}
test("crew selection keeps solo separate and supports every crew size with keyboard", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Let's Fly!" }).click();
  await expect(
    page.getByRole("button", { name: "Continue solo", exact: true }),
  ).toBeVisible();
  for (const n of [2, 3, 4, 5]) {
    const radio = page.locator(`input[value="${n}"][name="crew-size"]`);
    await radio.focus();
    await page.keyboard.press("Space");
    await expect(radio).toBeChecked();
    await expect(page.locator(".parade-member")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: `Continue with ${n} players` }),
    ).toBeDisabled();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/previews/${info.project.name}-crew-selection.png`,
    fullPage: true,
  });
});
for (const n of [2, 3, 4, 5])
  test(`${n} human browsers: private racks, ready lobby, deliberate setup, Captain, turn and refresh`, async ({
    browser,
    baseURL,
  }, info) => {
    test.skip(!enabled, "Requires configured local room service.");
    test.setTimeout(120000);
    const seats = await roomWithCrew(browser, n, baseURL!, info.project.name);
    try {
      for (const seat of seats) {
        const g = seat.room()!.game!;
        expect(g.participants.every((p) => p.control === "human")).toBe(true);
        for (const c of g.circuits.filter(
          (c) => c.owner !== seat.playerId && !c.restored,
        )) {
          expect(c.value).toBeUndefined();
          expect(c.kind).toBeUndefined();
          expect(c.sortLabel).toBeUndefined();
          expect(c.matchingIdentity).toBeUndefined();
        }
        for (const p of g.participants) {
          const racks = n === 2 ? 2 : n === 3 && p.id === g.captain ? 2 : 1;
          await expect(
            seat.page.locator(`[data-rack-owner="${p.id}"]`),
          ).toHaveCount(racks);
        }
        await expect(
          seat.page.locator(
            `.wire-tile:not([data-owner="${seat.playerId}"]) strong`,
          ),
        ).toHaveText(
          g.circuits.filter((c) => c.owner !== seat.playerId).map(() => "?"),
        );
      }
      await starting(seats);
      await seats[0].page.screenshot({path:`docs/previews/${info.project.name}-${n}-compact-multi.png`,fullPage:true});
      if(info.project.name === "desktop") {
        for (const seat of seats) {
          const bottom=await seat.page.locator('.rack').evaluateAll(els=>Math.max(...els.map(el=>el.getBoundingClientRect().bottom)));
          expect(bottom).toBeLessThanOrEqual(1000);
          expect(await seat.page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(1000);
          expect(await seat.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        }
      }
      const g = seats[0].room()!.game!;
      expect(g.currentParticipant).toBe(g.captain);
      const active = seats.find((s) => s.playerId === g.currentParticipant)!;
      await expect(
        active.page.getByRole("button", { name: "Pass turn", exact: true }),
      ).toBeEnabled();
      for (const seat of seats) {
        await expect(seat.page.locator(".information-marker")).toHaveCount(n);
        await expect(seat.page.locator(".captain-badge")).toHaveCount(1);
      }
      await active.page
        .getByRole("button", { name: "Pass turn", exact: true })
        .click();
      await expect.poll(() => active.room()!.game!.turnNumber).toBe(2);
      const refresh = seats[seats.length - 1];
      await refresh.page.reload();
      await expect(refresh.page.locator(".mp-board")).toBeVisible();
      expect(refresh.room()!.playerId).toBe(refresh.playerId);
      expect(
        await refresh.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await refresh.page.screenshot({
        path: `docs/previews/${info.project.name}-${n}-player-board.png`,
        fullPage: true,
      });
    } finally {
      await Promise.all(seats.map((s) => s.context.close()));
    }
  });
test("network failure preserves an immediate command; explicit retry spends once", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(!enabled, "Requires configured local room service.");
  test.setTimeout(120000);
  const seats = await roomWithCrew(browser, 2, baseURL!, info.project.name);
  try {
    await starting(seats);
    const active = seats.find(
      (s) => s.playerId === seats[0].room()!.game!.currentParticipant,
    )!;
    const p = active.page;
    const own = p.locator(`[data-owner="${active.playerId}"]`).first();
    const target = p
      .locator(`.wire-tile:not([data-owner="${active.playerId}"])`)
      .first();
    await own.click();
    await p.route("**/commands", (route) => route.abort());
    await target.click();
    await expect(p.locator(".mp-board [role=alert]")).toBeVisible();
    await expect(p.locator("dialog[open]")).toHaveCount(0);
    await expect(
      p.getByRole("button", { name: "Retry pending action", exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole("button", { name: "Pass turn", exact: true }),
    ).toBeDisabled();
    await p.unroute("**/commands");
    await expect(p.locator(".mp-status [role=status]")).toHaveText(
      "● Connected",
    );
    await p
      .getByRole("button", { name: "Retry pending action", exact: true })
      .click();
    await expect(
      p.getByRole("button", { name: "Retry pending action", exact: true }),
    ).toHaveCount(0);
    await expect.poll(() => active.room()!.game!.turnNumber).toBe(2);
    expect(
      active
        .room()!
        .game!.history.filter(
          (e) =>
            e.type === "CONNECTION_SUCCESS" || e.type === "CONNECTION_FAILED",
        ),
    ).toHaveLength(1);
  } finally {
    await Promise.all(seats.map((s) => s.context.close()));
  }
});

test("personal power uses same-rack targets with cancellation and one hidden target preserved", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(!enabled, "Requires configured local room service.");
  test.setTimeout(120000);
  const seats = await roomWithCrew(browser, 2, baseURL!, info.project.name);
  try {
    await starting(seats);
    const active = seats.find(
      (s) => s.playerId === seats[0].room()!.game!.currentParticipant,
    )!;
    const p = active.page;
    const g = active.room()!.game!;
    const card = g.characterCards.find(
      (c) => c.participant === active.playerId,
    )!;
    const hidden = card.validTargetIds.map(
      (id) => g.circuits.find((c) => c.id === id)!,
    );
    const a = hidden[0],
      b = hidden.find(
        (c) => c.owner === a.owner && c.rack === a.rack && c.id !== a.id,
      )!,
      otherRack = hidden.find((c) => c.owner === a.owner && c.rack !== a.rack)!;
    const own = g.circuits.find(
      (c) => c.owner === active.playerId && !c.restored && c.kind !== "red",
    )!;
    const use = p.getByRole("button", { name: "Use power", exact: true });
    await use.click();
    const d = p.getByRole("dialog", { name: "Twin Signal", exact: true });
    await d
      .getByLabel("Your declared circuit", { exact: true })
      .selectOption(own.id);
    await d
      .getByLabel("Hidden crew circuit 1", { exact: true })
      .selectOption(a.id);
    await d
      .getByLabel("Hidden crew circuit 2", { exact: true })
      .selectOption(otherRack.id);
    await expect(
      d.getByRole("button", { name: "Confirm", exact: true }),
    ).toBeDisabled();
    await d
      .getByLabel("Hidden crew circuit 2", { exact: true })
      .selectOption(b.id);
    await expect(
      d.getByRole("button", { name: "Confirm", exact: true }),
    ).toBeEnabled();
    await p.keyboard.press("Escape");
    await expect(use).toBeFocused();
    expect(
      active
        .room()!
        .game!.characterCards.find((c) => c.participant === active.playerId)!
        .remainingUses,
    ).toBe(1);
    await use.click();
    await d
      .getByLabel("Your declared circuit", { exact: true })
      .selectOption(own.id);
    await d
      .getByLabel("Hidden crew circuit 1", { exact: true })
      .selectOption(a.id);
    await d
      .getByLabel("Hidden crew circuit 2", { exact: true })
      .selectOption(b.id);
    await d.getByRole("button", { name: "Confirm", exact: true }).dblclick();
    await expect(d).toHaveCount(0);
    await expect
      .poll(
        () =>
          active
            .room()!
            .game!.characterCards.find(
              (c) => c.participant === active.playerId,
            )!.remainingUses,
      )
      .toBe(0);
    expect(
      active
        .room()!
        .game!.circuits.filter(
          (c) => [a.id, b.id].includes(c.id) && c.value === undefined,
        ),
    ).toHaveLength(1);
    expect(
      active.room()!.game!.history.filter((e) => e.type === "POWER_USED"),
    ).toHaveLength(1);
  } finally {
    await Promise.all(seats.map((s) => s.context.close()));
  }
});

test("a real connection unlocks shared equipment; off-turn use and exhaustion stay shared", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(!enabled, "Requires configured local room service.");
  test.setTimeout(120000);
  const seats = await roomWithCrew(browser, 2, baseURL!, info.project.name);
  try {
    const number = [1, 2, 3].find((n) =>
      seats.every((s) =>
        s
          .room()!
          .game!.circuits.some((c) => c.owner === s.playerId && c.value === n),
      ),
    );
    expect(
      number,
      "At least one shared unlock number in both dealt hands",
    ).toBeDefined();
    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i],
        id = seat
          .room()!
          .game!.circuits.find(
            (c) => c.owner === seat.playerId && c.value === number,
          )!.id;
      if (i > 0)
        await expect(seat.page.locator(".starting-information")).toContainText(
          "1/2 crew markers placed",
        );
      await seat.page
        .locator(`.starting-information .mp-actions button[aria-label^="Blue ${number} ·"]`)
        .first()
        .click();
    }
    for (const seat of seats) {
      await expect(seat.page.locator(".starting-information")).toHaveCount(0);
      await expect.poll(() => seat.room()?.game?.phase).toBe("turns");
      await expect(seat.page.locator(".mp-board .turn-pill")).not.toContainText("Choose starting information");
    }
    const active = seats.find(
        (s) => s.playerId === seats[0].room()!.game!.currentParticipant,
      )!,
      p = active.page;
    const g = active.room()!.game!,
      own = g.circuits.find(
        (c) => c.owner === active.playerId && c.value === number,
      )!,
      target = g.circuits.find(
        (c) => c.owner !== active.playerId && c.value === number,
      )!;
    await p.locator(`[data-slot="${own.id}"]`).click();
    await p.locator(`[data-slot="${target.id}"]`).click();
    await expect(p.locator(".equipment-ready")).toHaveCount(1);
    const item = active
      .room()!
      .game!.equipment.find((e) => e.unlockNumber === number)!;
    expect(active.room()!.game!.currentParticipant).not.toBe(active.playerId);
    const equipment = p.locator(".equipment-ready");
    await equipment
      .getByRole("button", { name: "Use equipment", exact: true })
      .click();
    const d = p.getByRole("dialog");
    if (item.toolId === "scanner") {
      await d
        .getByLabel("Hidden crew circuit", { exact: true })
        .selectOption({ index: 1 });
      await d.getByLabel("Threshold", { exact: true }).selectOption("6");
    }
    await p.keyboard.press("Escape");
    await expect(equipment).toBeVisible();
    await equipment
      .getByRole("button", { name: "Use equipment", exact: true })
      .click();
    if (item.toolId === "scanner") {
      await d
        .getByLabel("Hidden crew circuit", { exact: true })
        .selectOption({ index: 1 });
      await d.getByLabel("Threshold", { exact: true }).selectOption("6");
    }
    await d.getByRole("button", { name: "Confirm", exact: true }).dblclick();
    for (const seat of seats)
      await expect(seat.page.locator(".equipment-used")).toHaveCount(1);
    expect(active.room()!.game!.turnNumber).toBe(2);
    expect(
      active.room()!.game!.history.filter((e) => e.type === "EQUIPMENT_USED"),
    ).toHaveLength(1);
  } finally {
    await Promise.all(seats.map((s) => s.context.close()));
  }
});

test("two human players complete a mission using public clues, then replay rotates Captain", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(!enabled, "Requires configured local room service.");
  test.setTimeout(240000);
  const seats = await roomWithCrew(browser, 2, baseURL!, info.project.name);
  try {
    await starting(seats);
    let authority = seats[0].room()!;
    const captain = authority.game!.captain;
    const dragSeat = seats.find(
      (s) => s.playerId === authority.game!.currentParticipant,
    )!;
    const dp = dragSeat.page;
    const ds = dp.locator(`[data-owner="${dragSeat.playerId}"]`).first(),
      dt = dp
        .locator(`.wire-tile:not([data-owner="${dragSeat.playerId}"])`)
        .first();
    await ds.scrollIntoViewIfNeeded();
    const grip = (await ds.locator("[data-drag-grip]").boundingBox())!;
    let touch: Awaited<ReturnType<BrowserContext["newCDPSession"]>> | undefined;
    if (info.project.name === "mobile") {
      touch = await dragSeat.context.newCDPSession(dp);
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: grip.x + grip.width / 2, y: grip.y + 8 }],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: grip.x + grip.width / 2, y: 10 }],
      });
    } else {
      await dp.mouse.move(grip.x + grip.width / 2, grip.y + 8);
      await dp.mouse.down();
      await dp.mouse.move(grip.x + grip.width / 2, 10, { steps: 5 });
    }
    await expect(dp.locator(".drag-wire")).toBeVisible();
    await expect
      .poll(
        async () => {
          const r = (await dt.boundingBox())!;
          return r.y >= 60 && r.y + r.height < 800;
        },
        { timeout: 15000 },
      )
      .toBe(true);
    const drop = (await dt.boundingBox())!;
    if (touch) {
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: drop.x + drop.width / 2, y: drop.y + drop.height / 2 },
        ],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else {
      await dp.mouse.move(drop.x + drop.width / 2, drop.y + drop.height / 2, {
        steps: 5,
      });
      await dp.mouse.up();
    }
    await expect(dp.locator("dialog[open]")).toHaveCount(0);
    await expect.poll(()=>dragSeat.room()!.game!.turnNumber).toBe(2);
    authority = dragSeat.room()!;

    for (
      let step = 0;
      step < 100 && authority.game!.status === "playing";
      step++
    ) {
      const active = seats.find(
        (s) => s.playerId === authority.game!.currentParticipant,
      )!;
      const p = active.page;
      await expect
        .poll(() => active.room()!.game!.turnNumber)
        .toBe(authority.game!.turnNumber);
      const g = active.room()!.game!,
        oldTurn = g.turnNumber,
        own = g.circuits.filter(
          (c) => c.owner === active.playerId && !c.restored,
        );
      const solo = g.selfMatches.find((s) => s.eligible);
      const pair = own.flatMap((a) =>
        g.circuits
          .filter(
            (b) =>
              b.owner !== active.playerId &&
              !b.restored &&
              b.value !== undefined &&
              a.value === b.value &&
              a.kind === b.kind,
          )
          .map((b) => ({ a, b })),
      )[0];
      if (solo) {
        await p
          .getByRole("button", {
            name: `Self-Connection · ${solo.number}`,
            exact: true,
          })
          .click();
      } else if (pair) {
        await p.locator(`[data-slot="${pair.a.id}"]`).click();
        await p.locator(`[data-slot="${pair.b.id}"]`).click();
      } else {
        const share = own.find(
          (c) => !g.publicReveals.some((r) => r.circuitId === c.id),
        );
        if (share && g.energy > 0) {
          await p.locator(`[data-slot="${share.id}"]`).click();
          await p
            .getByRole("button", {
              name: "Share selected circuit",
              exact: true,
            })
            .click();
        } else
          await p
            .getByRole("button", { name: "Pass turn", exact: true })
            .click();
      }
      await expect
        .poll(
          () =>
            active.room()!.game!.status !== "playing" ||
            active.room()!.game!.turnNumber > oldTurn,
        )
        .toBe(true);
      authority = active.room()!;
    }
    expect(authority.game!.status).toBe("won");
    for (const seat of seats)
      await expect(
        seat.page.getByRole("heading", {
          name: "Mission Complete",
          exact: true,
        }),
      ).toBeVisible();
    await seats[0].page.screenshot({
      path: `docs/previews/${info.project.name}-multiplayer-victory.png`,
      fullPage: true,
    });
    await seats[0].page
      .getByRole("button", { name: "Play again", exact: true })
      .click();
    for (const seat of seats)
      await expect(
        seat.page.getByRole("heading", {
          name: "Choose your starting information",
          exact: true,
        }),
      ).toBeVisible();
    expect(seats[0].room()!.game!.captain).not.toBe(captain);
    expect(seats[0].room()!.game!.restored).toBe(0);
  } finally {
    await Promise.all(seats.map((s) => s.context.close()));
  }
});

test("leaving stops polling; forgetting a reserved seat allows a different crew", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(!enabled, "Requires configured local room service.");
  test.setTimeout(120000);
  const seats = await roomWithCrew(browser, 2, baseURL!, info.project.name);
  try {
    const host = seats[0],
      code = host.room()!.code;
    await host.page
      .getByRole("button", { name: "Join a different crew", exact: true })
      .click();
    const d = host.page.getByRole("dialog", {
      name: "Join a different crew?",
      exact: true,
    });
    await expect(d).toContainText("forget its saved seat");
    await d
      .getByRole("button", { name: "Forget seat and continue", exact: true })
      .click();
    await expect(
      host.page.getByRole("heading", { name: "Your crew’s launchpad." }),
    ).toBeVisible();
    expect(
      await host.page.evaluate(
        () =>
          Object.keys(localStorage).filter((k) =>
            k.startsWith("starship-room-v1:"),
          ).length,
      ),
    ).toBe(0);
    await host.page
      .getByRole("button", { name: "Create 2-player room", exact: true })
      .click();
    await expect(
      host.page.getByRole("heading", { name: "All aboard!", exact: true }),
    ).toBeVisible();
    await expect(host.page.locator(".mp-room-code")).not.toHaveText(code);
    await expect.poll(() => host.room()?.code).not.toBe(code);
    await expect
      .poll(
        () =>
          seats[1].room()!.players.find((p) => p.id === host.playerId)!.left,
      )
      .toBe(true);
  } finally {
    await Promise.all(seats.map((s) => s.context.close()));
  }
});

test('required setup retains pending retry inside the popup without revealing before acceptance',async({browser,baseURL},info)=>{
 test.skip(!enabled,'Requires configured local room service.');test.setTimeout(60000);
 const seats=await roomWithCrew(browser,2,baseURL!,info.project.name);
 try {
  const host=seats[0],p=host.page;let failed=false;
  await p.route('**/api/rooms/*/commands',async route=>{
   const body=route.request().postDataJSON();
   if(!failed&&body.command?.type==='startingInformation'){failed=true;await route.abort();}else await route.continue();
  });
  await p.locator('.starting-information .mp-actions button').first().click();
  await expect(p.locator('.setup-dialog [role=alert]').first()).toBeVisible();
  expect(host.room()!.game!.startingInformation).toHaveLength(0);
  const setup=p.getByRole('dialog',{name:'Choose your starting information',exact:true});await expect(setup).toBeVisible();
  await setup.getByRole('button',{name:'Retry pending action',exact:true}).click();
  await expect(setup).toHaveCount(0);await expect.poll(()=>host.room()!.game!.startingInformation.length).toBe(1);
  expect(host.room()!.game!.phase).toBe('startingInformation');
 } finally {for(const seat of seats)await seat.context.close();}
});
