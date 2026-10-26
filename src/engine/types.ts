/** Public contracts. Hidden values and random seeds are intentionally absent. */
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PuzzleType = 'matching' | 'sequence';
export type CrewId = 'sam' | 'nova' | 'pip';
export interface Tuning { pairs: number; hull: number; durationMs: number; damage: number; energy: number; rewardEnergy: number; clueWidth: number; aiEvery: number; sequenceLength: number }
export interface Mission { id: string; name: string; puzzle: PuzzleType; availability: 'playable' | 'development' }
export interface Circuit { id: string; owner: CrewId; restored: boolean; value?: number }
export interface Clue { slotId: string; min: number; max: number }
export interface SequenceView { id: string; terms: (number | null)[]; restored: boolean; clue?: string }
export interface GameEvent { index: number; type: string; message: string }
export interface GameState { mission: Mission; difficulty: Difficulty; status: 'ready' | 'playing' | 'won' | 'lost'; hull: number; energy: number; remainingMs: number; restored: number; total: number; selected: string | null; circuits: Circuit[]; sequences: SequenceView[]; clues: Clue[]; history: GameEvent[] }
/** AI receives own values and public disclosures only. */
export interface AIObservation { self: CrewId; own: Circuit[]; publicCircuits: Circuit[]; clues: Clue[] }
export type AIAction = { type: 'connect'; ownId: string; targetId: string } | { type: 'wait' };
