/** Provisional presentation contract. Agent 1 must map its public, redacted state here. */
export type Expression =
  "happy" | "worried" | "thinking" | "surprised" | "celebrating";
export type Slot = {
  id: string;
  restored: boolean;
  clue?: { min: number; max: number };
};
export type MissionView = {
  status: "playing" | "victory" | "defeat";
  reason?: string;
  hull: number;
  secondsRemaining: number;
  elapsedSeconds: number;
  energy: number;
  restored: number;
  required: number;
  ownCircuits: (Slot & { value: number; shared?: boolean })[];
  rooms: { id: string; name: string; system: string; slots: Slot[] }[];
  messages: { id: string; text: string }[];
  event: {
    id: number;
    kind: "ready" | "success" | "damage" | "clue" | "victory" | "defeat";
    text: string;
  };
};
export interface MissionAdapter {
  getSnapshot: () => MissionView;
  subscribe: (listener: () => void) => () => void;
  connect: (ownId: string, targetId: string) => void;
  requestClue: (targetId: string) => void;
  shareCircuit: (ownId: string) => void;
  activate: () => void;
  deactivate: () => void;
  restart: () => void;
  dispose: () => void;
}
