/** Revised board-game contracts. Values are present only for own or publicly revealed tiles. */
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PuzzleType = 'matching' | 'sequence';
export type CrewId = 'sam' | 'nova' | 'pip';
export interface Participant { id: CrewId; name: string; control: 'human' | 'ai' }
export interface Tuning { numberMin: number; numberMax: number; copies: number; hull: number; durationMs: number; damage: number; energy: number; rewardEnergy: number; deductionPasses: number }
export interface Mission { id: string; name: string; puzzle: PuzzleType; availability: 'playable' | 'development' }
export interface Circuit { id: string; owner: CrewId; position: number; restored: boolean; value?: number }
export interface PublicReveal { circuitId: string; value: number; reason: 'mistake' | 'clue' | 'resolved' }
export interface IncorrectGuess { participant: CrewId; ownCircuitId: string; targetCircuitId: string; declaredNumber: number; turn: number }
export type DamageStage = 'normal' | 'light' | 'moderate' | 'critical' | 'destroyed';
interface EventBase { index: number; turn: number; message: string }
export type ShipAttackEvent = EventBase & { type: 'SHIP_ATTACK'; source: 'incorrect_connection'; damage: number; hullBefore: number; hullAfter: number; targetCircuitId: string; revealedNumber: number; severity: 'light' | 'medium' | 'critical' };
export type GameEvent = SupportEvent | ShipAttackEvent | (EventBase & { type: 'CONNECTION_SUCCESS'; participant: CrewId; circuitIds: string[]; number: number }) | (EventBase & { type: 'CONNECTION_FAILED'; participant: CrewId; damage: number; targetCircuitId: string; declaredNumber: number; revealedNumber: number }) | (EventBase & { type: 'CLUE_SHARED'; participant: CrewId; circuitId: string; value: number }) | (EventBase & { type: 'STARTED' | 'TURN_STARTED' | 'PASSED' | 'WON' | 'LOST' });
export interface GameState { tools: Record<ToolId, ToolAvailability>; toolToken: string; shieldActive: boolean; scannerResults: ScannerResult[]; selfMatches: SelfMatchEligibility[]; mission: Mission; difficulty: Difficulty; status: 'playing' | 'won' | 'lost'; hull: number; maxHull: number; damageStage: DamageStage; energy: number; remainingMs: number; restored: number; total: number; remainingCircuits: number; selected: string | null; participants: Participant[]; currentParticipant: CrewId; turnNumber: number; circuits: Circuit[]; publicReveals: PublicReveal[]; incorrectGuesses: IncorrectGuess[]; history: GameEvent[]; distribution: { min: number; max: number; copies: number }; possibilities: Record<string, number[]> }
/** No full board, seed, or other participants' private values may enter this input. */
export interface AIObservation { scannerResults?: ScannerResult[]; self: CrewId; circuits: Circuit[]; reveals: PublicReveal[]; incorrectGuesses: IncorrectGuess[]; min: number; max: number; copies: number; energy: number; deductionPasses: number }
export type AIAction = { type: 'connect'; ownId: string; targetId: string; number: number } | { type: 'solo'; number: number } | { type: 'clue'; circuitId: string } | { type: 'pass' };
export type ToolId = 'scanner' | 'dualScanner' | 'shield' | 'hint';
export interface ToolConfig { uses: number; unlocked: boolean }
export type ToolSettings = Record<ToolId, ToolConfig>;
export interface ScannerResult { circuitId: string; threshold: number; relation: 'below' | 'equal' | 'above' }
export interface ToolAvailability extends ToolConfig { available: boolean; validTargetIds: string[] }
export interface SelfMatchEligibility { number: number; circuitIds: string[]; eligible: boolean; explanation: string }
export type SupportEvent = EventBase & { type: 'SELF_MATCH_SUCCESS' | 'SELF_MATCH_INVALID' | 'SCANNER_ACTIVATED' | 'DUAL_SCANNER_SUCCESS' | 'DUAL_SCANNER_FAILED' | 'SHIELD_ACTIVATED' | 'SHIELD_PREVENTED' | 'HINT_GENERATED'; participant: CrewId; circuitIds: string[]; message: string; number?: number; damagePrevented?: number; scanner?: ScannerResult; possibilities?: number[] };
