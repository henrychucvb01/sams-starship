import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngineAdapter } from "../src/adapters/engineAdapter";
test("Easy tool locks and charges come from engine; hints limited and token replay rejected", () => {
  const a = createEngineAdapter(42, {}, { hint: { uses: 2, unlocked: true } });
  a.activate();
  try {
    let s = a.getSnapshot();
    assert.equal(s.tools?.find((t) => t.id === "scanner")?.available, false);
    assert.equal(
      s.tools?.find((t) => t.id === "dual-scanner")?.available,
      false,
    );
    assert(
      s.rooms.every((r) => r.slots.every((c) => !c.clue && !c.possibilities)),
    );
    const token = s.toolToken!;
    a.useTool!("hint", { targets: [], token });
    assert.equal(
      a.getSnapshot().tools?.find((t) => t.id === "hint")?.remaining,
      1,
    );
    assert(a.getSnapshot().toolClue);
    a.useTool!("hint", { targets: [], token });
    assert.equal(
      a.getSnapshot().tools?.find((t) => t.id === "hint")?.remaining,
      1,
    );
    assert.match(a.getSnapshot().event.text, /stale/);
    a.restart();
    assert.equal(
      a.getSnapshot().tools?.find((t) => t.id === "hint")?.remaining,
      2,
    );
  } finally {
    a.dispose();
  }
});
test("Self-Match clears four real circuits with one animation; invalid pair leaves hull and turn intact", () => {
  const a = createEngineAdapter(2);
  a.activate();
  try {
    let s = a.getSnapshot();
    const group = s.selfMatches!.find(
      (m) => m.eligible && m.circuitIds.length === 4,
    )!;
    a.selfMatch!(group.circuitIds.slice(0, 2));
    s = a.getSnapshot();
    assert.equal(
      s.ownCircuits.filter((c) => group.circuitIds.includes(c.id) && c.restored)
        .length,
      4,
    );
    assert.equal(s.effects?.filter((e) => e.kind === "success").length, 1);
    assert.equal(s.hull, 100);
  } finally {
    a.dispose();
  }
  const b = createEngineAdapter(42);
  b.activate();
  try {
    const s = b.getSnapshot(),
      group = s.selfMatches!.find(
        (m) => !m.eligible && m.circuitIds.length >= 2,
      )!;
    b.selfMatch!(group.circuitIds.slice(0, 2));
    assert.equal(b.getSnapshot().hull, 100);
    assert.equal(b.getSnapshot().board?.turnNumber, s.board?.turnNumber);
    assert.match(b.getSnapshot().event.text, /all remaining/);
    assert.equal(b.getSnapshot().effects?.length, 0);
  } finally {
    b.dispose();
  }
});
test("Shield absorbs one real incorrect connection and produces blocked, not damage animation", () => {
  const a = createEngineAdapter(42);
  a.activate();
  try {
    const s = a.getSnapshot();
    a.useTool!("shield", { targets: [], token: s.toolToken! });
    assert(a.getSnapshot().shieldActive);
    a.connect(s.ownCircuits.at(-1)!.id, s.rooms[0].slots[0].id);
    const after = a.getSnapshot();
    assert.equal(after.hull, 100);
    assert.equal(after.shieldActive, false);
    assert.equal(after.effects?.filter((e) => e.kind === "blocked").length, 1);
    assert.equal(after.effects?.filter((e) => e.kind === "damage").length, 0);
    assert(after.rooms[0].slots[0].clue);
  } finally {
    a.dispose();
  }
});
test("tracker maps authoritative copy counts and special identities stay redacted", () => {
  const a = createEngineAdapter(2);
  a.activate();
  try {
    let s = a.getSnapshot();
    assert.equal(s.tracker?.numbers.length, 12);
    assert(
      s.tracker?.numbers.every(
        (n) => n.resolved === 0 && n.total === 4 && !n.complete,
      ),
    );
    const group = s.selfMatches!.find(
      (m) => m.eligible && m.circuitIds.length === 4,
    )!;
    a.selfMatch!(group.circuitIds.slice(0, 2));
    s = a.getSnapshot();
    assert.deepEqual(
      s.tracker!.numbers.find((n) => n.number === group.number),
      { number: group.number, resolved: 4, total: 4, complete: true },
    );
    assert.equal(s.effects?.filter((e) => e.kind === "success").length, 1);
  } finally {
    a.dispose();
  }
  const b = createEngineAdapter(42, {}, {}, "circuit-7");
  b.activate();
  try {
    const s = b.getSnapshot();
    assert.equal(s.tracker?.specials.length, 2);
    assert(
      s.rooms.every((r) =>
        r.slots.every((c) => c.type === undefined && c.sortLabel === undefined),
      ),
    );
    assert(
      s.tracker!.specials.every((p) =>
        p.positionLabel.includes("Possible sorting positions"),
      ),
    );
    assert(s.ownCircuits.some((c) => c.type === "red"));
    b.connect(s.ownCircuits[0].id, "nova-13");
    assert.equal(b.getSnapshot().status, "defeat");
    assert.equal(b.getSnapshot().hull, 100);
    assert.equal(
      b.getSnapshot().effects?.filter((e) => e.kind === "critical").length,
      1,
    );
    assert.equal(
      b.getSnapshot().rooms[0].slots.find((c) => c.id === "nova-13")?.type,
      "red",
    );
    assert.equal(
      b.getSnapshot().tracker?.specials.find((p) => p.type === "red")?.resolved,
      0,
    );
  } finally {
    b.dispose();
  }
});
