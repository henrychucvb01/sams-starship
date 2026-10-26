import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngineAdapter } from "../src/adapters/engineAdapter";
test("adapter solves using only paid public clues and resets real terminal state", () => {
  const adapter = createEngineAdapter(42);
  adapter.activate();
  try {
    for (let i = 0; i < 6; i++) {
      const state = adapter.getSnapshot();
      const target = state.rooms
        .flatMap((r) => r.slots)
        .find((s) => !s.restored)!;
      assert.equal(target.clue, undefined);
      assert(!("value" in target));
      adapter.requestClue(target.id);
      const clue = adapter
        .getSnapshot()
        .rooms.flatMap((r) => r.slots)
        .find((s) => s.id === target.id)!.clue!;
      assert.equal(clue.min, clue.max);
      const own = state.ownCircuits.find(
        (s) => !s.restored && s.value === clue.min,
      )!;
      adapter.connect(own.id, target.id);
    }
    assert.equal(adapter.getSnapshot().status, "victory");
    assert.equal(adapter.getSnapshot().restored, 6);
    adapter.restart();
    adapter.activate();
    assert.equal(adapter.getSnapshot().restored, 0);
    assert.equal(adapter.getSnapshot().hull, 100);
    assert.equal(adapter.getSnapshot().energy, 6);
    assert(
      adapter.getSnapshot().rooms.every((r) => r.slots.every((s) => !s.clue)),
    );
  } finally {
    adapter.dispose();
  }
});
test("adapter surfaces rejected commands without spending and handles hull defeat", () => {
  const adapter = createEngineAdapter(42);
  adapter.activate();
  try {
    const initial = adapter.getSnapshot();
    adapter.requestClue("invalid");
    assert.equal(adapter.getSnapshot().energy, initial.energy);
    assert.match(adapter.getSnapshot().event.text, /Invalid hint target/);
    const target = initial.rooms[0].slots[0];
    adapter.requestClue(target.id);
    const number = adapter.getSnapshot().rooms[0].slots[0].clue!.min;
    const own = initial.ownCircuits.find((c) => c.value !== number)!;
    for (let i = 0; i < 7; i++) adapter.connect(own.id, target.id);
    assert.equal(adapter.getSnapshot().status, "defeat");
    assert.equal(adapter.getSnapshot().hull, 0);
    assert.equal(adapter.getSnapshot().reason, "Hull integrity lost");
  } finally {
    adapter.dispose();
  }
});
