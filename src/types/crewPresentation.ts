/** Presentation-only handoff. Every option and availability flag must come from public engine state. */
export type ActionOption = { id: string; label: string };
export type ActionTarget = {
  id: string;
  label: string;
  options: ActionOption[];
  count: number;
};
export type CrewActionView = {
  id: string;
  name: string;
  description: string;
  requirements: string;
  available: boolean;
  reason?: string;
  remaining: number;
  used: boolean;
  targets: ActionTarget[];
};
export type CrewCardView = {
  id: string;
  name: string;
  power?: CrewActionView;
};
export type EquipmentView = CrewActionView & {
  unlockNumber: number;
  resolved: number;
  total: number;
  status: "locked" | "ready" | "used";
};
export type CrewFeaturesView = {
  captainId?: string;
  crew: CrewCardView[];
  equipment: EquipmentView[];
  actionToken: string;
  startingInformation?: {
    pending: boolean;
    description: string;
    availableIds: string[];
    markers: { circuitId: string; label: string }[];
  };
  isolateOverload?: CrewActionView;
};
