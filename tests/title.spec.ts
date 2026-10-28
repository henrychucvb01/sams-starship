import { test, expect } from "@playwright/test";

test("title keeps launch controls available through calm, chase and escape", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveTitle("Starship Panic! · SLButter");
  await expect(page.getByRole("heading", { name: "Starship Panic!", exact: true })).toBeVisible();
  await expect(page.locator(".has-approved-logo img")).toBeVisible();
  await expect(page.locator(".flight-ship img")).toHaveCount(1);
  await expect(page.locator(".flying-muncher img")).toHaveCount(8);
  expect(await page.locator(".flying-muncher img").evaluateAll(images => images.every(image => (image as HTMLImageElement).src.includes("space-muncher-chibi")))).toBe(true);
  expect(await page.locator(".panic-title img").evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect(page.locator("header")).toHaveCount(0);
  await expect(page.locator(".panic-kicker, .panic-tagline, .panic-caption")).toHaveCount(0);
  const fly = page.getByRole("button", { name: "Let's Fly!" });
  // Seek the CSS animations directly: fake JS clocks don't advance compositor animations.
  for (const ms of [0, 8000, 11000, 13000, 16000, 17000]) {
    await page.locator(".flight-scene").evaluate((el, time) => {
      el.getAnimations({ subtree: true }).forEach(a => { a.pause(); a.currentTime = time; });
    }, ms);
    await expect(fly).toBeVisible();
    await expect(fly).toBeEnabled();
    const creatures = await page.locator(".flying-muncher").evaluateAll(elements => elements.map(el => Number(getComputedStyle(el).opacity)));
    if (ms === 11000 || ms === 13000) expect(creatures.every(opacity => opacity === 1)).toBe(true);
    if (ms === 0 || ms === 17000) expect(creatures.every(opacity => opacity === 0)).toBe(true);
    if (ms === 0) await page.screenshot({ path: `docs/previews/${info.project.name}-title-calm.png`, fullPage: true });
    const clickable = await fly.evaluate(el => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    });
    expect(clickable).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator(".flight-scene").evaluate(el => el.getAnimations({ subtree: true }).forEach(a => { a.currentTime = 11000; }));
  await page.screenshot({ path: `docs/previews/${info.project.name}-title-chase.png`, fullPage: true });
  await page.locator(".flight-scene").evaluate(el => el.getAnimations({ subtree: true }).forEach(a => { a.currentTime = 13500; }));
  expect(Number(await page.locator(".escape-trail").evaluate(el => getComputedStyle(el).opacity))).toBeGreaterThan(.8);
  await page.screenshot({ path: `docs/previews/${info.project.name}-title-escape.png`, fullPage: true });
  await fly.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /Every connection/ })).toBeFocused();
  await page.getByRole("button", { name: "Start mission" }).click();
  await page.getByRole("button", { name: "Begin Mission" }).click();
  await expect(page.locator(".wire-tile")).toHaveCount(48);
  await expect(page.locator(".starting-options")).toBeVisible();
  expect(errors).toEqual([]);
});

test("creatures steer independently, ship dodges twice and returns from outside the scene", async ({ page }, info) => {
  await page.goto("/");
  const seek = async (time: number) => page.locator(".flight-scene").evaluate((el, ms) => {
    el.getAnimations({ subtree: true }).forEach(a => { a.pause(); a.currentTime = ms; });
  }, time);
  const shipPose = () => page.locator(".flight-ship").evaluate(el => {
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return { x: m.m41, y: m.m42, bank: Math.atan2(m.b, m.a) * 180 / Math.PI, opacity: Number(getComputedStyle(el).opacity) };
  });
  await seek(9500);
  const up = await shipPose();
  await seek(11050);
  const down = await shipPose();
  expect(up.y).toBeLessThan(-30);
  expect(up.bank).toBeLessThan(-15);
  expect(down.y).toBeGreaterThan(30);
  expect(down.bank).toBeGreaterThan(15);
  const first = await page.locator(".flying-muncher").evaluateAll(elements => elements.map(el => {
    const m = new DOMMatrix(getComputedStyle(el).transform); return [m.m41, m.m42];
  }));
  await seek(12000);
  const next = await page.locator(".flying-muncher").evaluateAll(elements => elements.map(el => {
    const m = new DOMMatrix(getComputedStyle(el).transform); return [m.m41, m.m42];
  }));
  const directions = next.map((p, i) => Math.atan2(p[1] - first[i][1], p[0] - first[i][0]));
  expect(new Set(directions.map(a => Math.round(a * 3))).size).toBeGreaterThan(3);
  await expect(page.locator(".muncher-swarm")).toHaveCSS("animation-name", "none");
  await seek(14800);
  const offscreen = await page.locator(".flight-ship").boundingBox();
  expect(offscreen!.x + offscreen!.width).toBeLessThan(0);
  await seek(15700);
  expect((await shipPose()).opacity).toBe(1);
  await page.screenshot({ path: `docs/previews/${info.project.name}-title-hyperspeed-return.png`, fullPage: true });
  await seek(16999);
  const last = await shipPose();
  await seek(17000);
  const start = await shipPose();
  expect(Math.abs(start.x - last.x) + Math.abs(start.y - last.y)).toBeLessThan(.1);
  expect(Math.abs(start.bank - last.bank)).toBeLessThan(.1);
});

test("help, settings, pause and persistent reduced motion work from the title", async ({ page }) => {
  await page.goto("/");
  const help = page.getByRole("button", { name: "How to Play", exact: true });
  await help.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  const pause = page.getByRole("button", { name: "Pause animation" });
  await pause.click();
  await expect(page.locator(".panic-title")).toHaveClass(/flight-paused/);
  await expect(page.getByRole("button", { name: "Resume animation" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Resume animation" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator(".stars-near")).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("button", { name: "Animations reduced" })).toBeDisabled();
});

test("small phones keep the approved title and controls within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Let's Fly!" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "How to Play", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("system reduced motion stops the entire title scene", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".stars-near")).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("button", { name: "Let's Fly!" })).toBeVisible();
});
