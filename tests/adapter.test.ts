import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngineAdapter } from "../src/adapters/engineAdapter";
test("real revised adapter preserves sorted racks and redacts secrets, resolves via public deductions", () => {
  const a = createEngineAdapter(42);
  a.activate();
  try {
    let s = a.getSnapshot();
    assert.equal(s.board?.ordered, true);
    assert.equal(s.board.turn, "sam");
    assert.equal(s.rooms[0].slots.length, 16);
    assert.equal(s.ownCircuits.length, 16);
    assert(
      s.rooms.every((r) => r.slots.every((c) => !c.clue && !("value" in c))),
    );
    assert.deepEqual(
      s.ownCircuits.map((c) => c.value),
      s.ownCircuits.map((c) => c.value).sort((a, b) => a - b),
    );
    const target = s.rooms[0].slots[0];
    a.requestClue(target.id);
    s = a.getSnapshot();
    assert.equal(s.energy, 7);
    assert.equal(s.board?.turn, "nova");
    assert(s.rooms[0].slots[0].clue);
    const energy = s.energy;
    a.shareCircuit(s.ownCircuits[0].id);
    assert.equal(a.getSnapshot().energy, energy);
    assert.match(a.getSnapshot().event.text, /Wait for Sam/);
    a.restart();
    assert.equal(a.getSnapshot().energy, 8);
    assert.equal(a.getSnapshot().board?.turn, "sam");
    assert.equal(a.getSnapshot().effects?.length, 0);
  } finally {
    a.dispose();
  }
});
test("wrong connection uses engine attack once, exposes only authorized reveal and error history", () => {
  const a = createEngineAdapter(42, { damage: 100 });
  a.activate();
  try {
    const s = a.getSnapshot();
    const target = s.rooms[0].slots[0];
    const own =
      s.ownCircuits.find((c) => !target.possibilities?.includes(c.value)) ??
      s.ownCircuits.at(-1)!;
    a.connect(own.id, target.id);
    const after = a.getSnapshot();
    assert.equal(after.status, "defeat");
    assert.equal(after.hull, 0);
    assert.equal(after.effects?.filter((e) => e.kind === "damage").length, 1);
    assert.equal(after.rooms[0].slots[0].excluded?.[0], own.value);
    assert(after.rooms[0].slots[0].clue);
    assert.equal(
      after.rooms.flatMap((r) => r.slots).filter((c) => c.clue).length,
      1,
    );
    assert(after.history?.some((e) => /publicly revealed/.test(e.text)));
    a.restart();
    assert.equal(a.getSnapshot().effects?.length, 0);
  } finally {
    a.dispose();
  }
});
