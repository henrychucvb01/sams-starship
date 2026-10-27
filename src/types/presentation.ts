import type { CrewFeaturesView } from "./crewPresentation";
export type ToolId = "scanner" | "dual-scanner" | "shield" | "hint";
export type ToolView = {
  id: ToolId;
  name: string;
  remaining: number;
  available: boolean;
  reason?: string;
  targetIds?: string[];
};
export type ToolCommand = {
  targets: string[];
  token: string;
  ownId?: string;
  threshold?: number;
};
/** Provisional presentation contract. Agent 1 must map its public, redacted state here. */
export type Expression =
  | "happy"
  | "worried"
  | "thinking"
  | "surprised"
  | "celebrating"
  | "sad";
export type Slot = {
  id: string;
  restored: boolean;
  type?: "blue" | "yellow" | "red";
  sortLabel?: string;
  clue?: { min: number; max: number };
  excluded?: number[];
  possibilities?: number[];
  scans?: { threshold: number; relation: string }[];
};
export type MissionView = {
  missionName?: string;
  crewFeatures?: CrewFeaturesView;
  tracker?: {
    numbers: {
      number: number;
      resolved: number;
      total: number;
      complete: boolean;
    }[];
    specials: {
      type: "yellow" | "red";
      positionLabel: string;
      positions?: { sortValue: number; certainty: "possible" | "confirmed" }[];
      resolved: number;
      total: number;
      complete: boolean;
    }[];
  };
  tools?: ToolView[];
  toolToken?: string;
  selfMatches?: {
    number: number;
    eligible: boolean;
    circuitIds: string[];
    explanation: string;
  }[];
  shieldActive?: boolean;
  toolClue?: string;
  status: "playing" | "victory" | "defeat";
  reason?: string;
  board?: {
    ordered: boolean;
    turn: "sam" | "nova" | "pip" | null;
    phase: "selecting" | "thinking" | "connecting" | null;
    note?: string;
    turnNumber?: number;
  };
  effects?: {
    id: number;
    kind:
      | "success"
      | "damage"
      | "scan"
      | "dual"
      | "shield"
      | "blocked"
      | "hint"
      | "critical"
      | "isolate";
    slotIds: string[];
    participant?: "sam" | "nova" | "pip";
  }[];
  history?: { id: number; text: string }[];
  remainingCircuits?: number;
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
  performCrewAction?: (
    id: string,
    choices: Record<string, string[]>,
    token: string,
  ) => void | Promise<void>;
  selectStartingInformation?: (
    id: string,
    token: string,
  ) => void | Promise<void>;
  getSnapshot: () => MissionView;
  subscribe: (listener: () => void) => () => void;
  connect: (ownId: string, targetId: string) => void;
  requestClue: (targetId: string) => void;
  selfMatch?: (ids: string[]) => void;
  useTool?: (id: ToolId, command: ToolCommand) => void;
  passTurn: () => void;
  resolveSolo: (ownId: string) => void;
  shareCircuit: (ownId: string) => void;
  activate: () => void;
  deactivate: () => void;
  chooseMission?: (id: string) => void;
  isolateRed?: (id: string) => void;
  restart: () => void;
  dispose: () => void;
}
