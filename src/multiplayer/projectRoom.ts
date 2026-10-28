import type { RoomView } from "./protocol";
import type { CrewFeaturesView, ActionTarget } from "../types/crewPresentation";
import type { MissionView } from "../types/presentation";
/** Presentation only: every legal ID, progress value and status is server-provided. */
export function projectRoom(room: RoomView) {
  const g = room.game!;
  const me = room.playerId;
  const name = (id: string) =>
    room.players.find((p) => p.id === id)?.name ?? "Crewmate";
  const label = (id: string) => {
    const c = g.circuits.find((c) => c.id === id);
    return c
      ? `${name(c.owner)} · rack ${(c.rack ?? 0) + 1}, slot ${c.position + 1}`
      : "Circuit";
  };
  const active = g.status === "playing" && g.phase === "turns";
  const own: ActionTarget = {
    id: "own",
    label: "Your declared circuit",
    count: 1,
    options: g.circuits
      .filter((c) => c.owner === me && !c.restored && c.kind !== "red")
      .map((c) => ({
        id: c.id,
        label: `${label(c.id)} · ${c.sortLabel ?? c.value}`,
      })),
  };
  const targets = (ids: string[], count: number): ActionTarget => ({
    id: "targets",
    label: "Hidden crew circuit",
    count,
    sameGroup: count === 2,
    options: ids.map((id) => ({
      id,
      label: label(id),
      group: (() => {
        const c = g.circuits.find((c) => c.id === id)!;
        return `${c.owner}:${c.rack ?? 0}`;
      })(),
    })),
  });
  const equipmentNames = {
    scanner: "Pulse Probe",
    shield: "Hull Buffer",
    hint: "Logic Relay",
    dualScanner: "Twin Probe",
  };
  const red = g.revealRedActions.find((a) => a.participant === me);
  const crew: CrewFeaturesView = {
    captainId: g.captain,
    actionToken: g.toolToken,
    crew: g.participants.map((p) => {
      const c = g.characterCards.find((c) => c.participant === p.id);
      return {
        id: p.id,
        name: name(p.id),
        power: c
          ? {
              id: `power:${p.id}`,
              name: c.name,
              description: c.description,
              requirements: c.requirements.join(" · "),
              available: c.state === "ready",
              remaining: c.remainingUses,
              used: c.state === "used",
              targets: p.id === me ? [own, targets(c.validTargetIds, 2)] : [],
            }
          : undefined,
      };
    }),
    equipment: g.equipment.map((e) => ({
      id: e.id,
      name: equipmentNames[e.toolId],
      description: e.description,
      requirements:
        e.timing === "anytime"
          ? "Any turn after setup. Resolve two blue copies of the unlock number."
          : "Your active turn. Two hidden circuits in one teammate’s hand.",
      available: e.available,
      remaining: e.remainingUses,
      used: e.state === "used",
      status: e.state,
      unlockNumber: e.unlockNumber,
      resolved: e.resolvedCopies,
      total: 2,
      targets:
        e.toolId === "scanner"
          ? [
              targets(e.validTargetIds, 1),
              {
                id: "threshold",
                label: "Threshold",
                count: 1,
                options: Array.from(
                  { length: g.distribution.max - g.distribution.min + 1 },
                  (_, i) => ({
                    id: String(g.distribution.min + i),
                    label: String(g.distribution.min + i),
                  }),
                ),
              },
            ]
          : e.toolId === "dualScanner"
            ? [own, targets(e.validTargetIds, 2)]
            : [],
    })),
    isolateOverload: {
      id: "isolate",
      name: "Isolate Overload",
      description:
        "Safely power down every remaining red circuit in your hand. This uses your turn.",
      requirements: red?.explanation ?? "No eligible red action.",
      reason: red?.explanation,
      available: active && g.currentParticipant === me && !!red?.eligible,
      remaining: red?.circuitIds.length ?? 0,
      used: false,
      targets: [],
      affectedSlots: red?.circuitIds.map(label),
    },
  };
  const tracker: MissionView["tracker"] = {
    numbers: (g.numberTracker ?? []).map((n) => ({
      number: n.number,
      resolved: n.resolvedCopies,
      total: n.totalCopies,
      complete: n.completed,
    })),
    specials: (g.specialTracker ?? [])
      .filter((s) => s.totalCopies > 0)
      .map((s) => ({
        type: s.kind,
        resolved: s.resolvedCopies,
        total: s.totalCopies,
        complete: s.completed,
        positionLabel: "Public special circuit positions",
        positions: [
          ...s.candidates.map((c) => ({
            sortValue: c.sortValue,
            certainty: "possible" as const,
          })),
          ...s.confirmed.map((c) => ({
            sortValue: c.sortValue,
            certainty: "confirmed" as const,
          })),
        ],
      })),
  };
  const effects: NonNullable<MissionView["effects"]> = g.history.flatMap<
    NonNullable<MissionView["effects"]>[number]
  >((e) => {
    if (e.type === "CONNECTION_SUCCESS")
      return [{ id: e.index, kind: "success" as const, slotIds: e.circuitIds }];
    if (e.type === "SHIP_ATTACK" && e.damage > 0)
      return [
        { id: e.index, kind: "damage" as const, slotIds: [e.targetCircuitId] },
      ];
    if (e.type === "RED_TRIGGERED")
      return [
        { id: e.index, kind: "critical" as const, slotIds: e.circuitIds },
      ];
    if (e.type === "RED_SAFELY_RESOLVED")
      return [{ id: e.index, kind: "isolate" as const, slotIds: e.circuitIds }];
    if (e.type === "POWER_ACTIVATED")
      return [{ id: e.index, kind: "power" as const, slotIds: e.circuitIds }];
    if (e.type === "SCANNER_ACTIVATED")
      return [{ id: e.index, kind: "scan" as const, slotIds: e.circuitIds }];
    if (e.type === "SHIELD_ACTIVATED" || e.type === "SHIELD_PREVENTED")
      return [
        {
          id: e.index,
          kind:
            e.type === "SHIELD_ACTIVATED"
              ? ("shield" as const)
              : ("blocked" as const),
          slotIds: e.circuitIds,
        },
      ];
    return [];
  });
  return { crew, tracker, effects, label, name, red };
}
