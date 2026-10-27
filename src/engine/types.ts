/** Revised board-game contracts. Values are present only for own or publicly revealed tiles. */
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PuzzleType = 'matching' | 'sequence';
export type CrewId = 'sam' | 'nova' | 'pip';
export interface Participant { id: CrewId; name: string; control: 'human' | 'ai' }
export interface Tuning { numberMin: number; numberMax: number; copies: number; hull: number; durationMs: number; damage: number; energy: number; rewardEnergy: number; deductionPasses: number }
export interface Mission { captainEligible?: CrewId[]; stage?: number; specials?: SpecialRules; id: string; name: string; puzzle: PuzzleType; availability: 'playable' | 'development' }
export interface Circuit { sortLabel?: string; matchingIdentity?: number | 'yellow' | 'red'; kind?: CircuitKind; id: string; owner: CrewId; position: number; restored: boolean; value?: number }
export interface PublicReveal { kind?: CircuitKind; circuitId: string; value: number; reason: 'mistake' | 'clue' | 'resolved' | 'startingInformation' }
export interface IncorrectGuess { participant: CrewId; ownCircuitId: string; targetCircuitId: string; declaredNumber: number; turn: number }
export type DamageStage = 'normal' | 'light' | 'moderate' | 'critical' | 'destroyed';
interface EventBase { index: number; turn: number; message: string }
export type ShipAttackEvent = EventBase & { type: 'SHIP_ATTACK'; source: 'incorrect_connection'; damage: number; hullBefore: number; hullAfter: number; targetCircuitId: string; revealedNumber: number; severity: 'light' | 'medium' | 'critical' };
export type GameEvent = RulesEvent | CircuitEvent | SupportEvent | ShipAttackEvent | (EventBase & { type: 'CONNECTION_SUCCESS'; participant: CrewId; circuitIds: string[]; number: number }) | (EventBase & { type: 'CONNECTION_FAILED'; participant: CrewId; damage: number; targetCircuitId: string; declaredNumber: number; revealedNumber: number }) | (EventBase & { type: 'CLUE_SHARED'; participant: CrewId; circuitId: string; value: number }) | (EventBase & { type: 'STARTED' | 'TURN_STARTED' | 'PASSED' | 'WON' | 'LOST' });
export interface GameState { captain: CrewId; phase: 'startingInformation' | 'turns'; startingInformation: StartingInformation[]; startingInformationChoices: string[]; equipment: EquipmentAvailability[]; characterCards: CharacterCard[]; revealRedActions: RevealRedAction[]; numberTracker?: NumberProgress[]; specialTracker?: SpecialProgress[]; tools: Record<ToolId, ToolAvailability>; toolToken: string; shieldActive: boolean; scannerResults: ScannerResult[]; selfMatches: SelfMatchEligibility[]; mission: Mission; difficulty: Difficulty; status: 'playing' | 'won' | 'lost'; hull: number; maxHull: number; damageStage: DamageStage; energy: number; remainingMs: number; restored: number; total: number; remainingCircuits: number; selected: string | null; participants: Participant[]; currentParticipant: CrewId; turnNumber: number; circuits: Circuit[]; publicReveals: PublicReveal[]; incorrectGuesses: IncorrectGuess[]; history: GameEvent[]; distribution: { min: number; max: number; copies: number }; possibilities: Record<string, number[]> }
/** No full board, seed, or other participants' private values may enter this input. */
export interface AIObservation { specialRules?: SpecialRules; scannerResults?: ScannerResult[]; self: CrewId; circuits: Circuit[]; reveals: PublicReveal[]; incorrectGuesses: IncorrectGuess[]; min: number; max: number; copies: number; energy: number; deductionPasses: number }
export type AIAction = { type: 'safeRed'; circuitId: string } | { type: 'connect'; ownId: string; targetId: string; number: number } | { type: 'solo'; number: number } | { type: 'clue'; circuitId: string } | { type: 'pass' };
export type ToolId = 'scanner' | 'dualScanner' | 'shield' | 'hint';
export interface ToolConfig { uses: number; unlocked: boolean }
export type ToolSettings = Record<ToolId, ToolConfig>;
export interface ScannerResult { circuitId: string; threshold: number; relation: 'below' | 'equal' | 'above' }
export interface ToolAvailability extends ToolConfig { available: boolean; validTargetIds: string[] }
export interface SelfMatchEligibility { number: number; circuitIds: string[]; eligible: boolean; explanation: string }
export type SupportEvent = EventBase & { type: 'SELF_MATCH_SUCCESS' | 'SELF_MATCH_INVALID' | 'SCANNER_ACTIVATED' | 'DUAL_SCANNER_SUCCESS' | 'DUAL_SCANNER_FAILED' | 'SHIELD_ACTIVATED' | 'SHIELD_PREVENTED' | 'HINT_GENERATED'; participant: CrewId; circuitIds: string[]; message: string; number?: number; damagePrevented?: number; scanner?: ScannerResult; possibilities?: number[] };


export type CircuitKind = 'blue' | 'yellow' | 'red';
/** Public mission possibilities, not a mapping of hidden tiles to identities. */
export interface SpecialRules { yellowPositions: number[]; redPositions: number[]; redInstantFailure: boolean; redSafeRule: 'disabled' | 'after-other-circuits'; showCandidates: boolean }
export interface NumberProgress { number: number; totalCopies: number; resolvedCopies: number; remainingCopies: number; completed: boolean }
export interface SpecialProgress { kind: 'yellow' | 'red'; totalCopies: number; resolvedCopies: number; completed: boolean; candidates: { sortValue: number; certainty: 'possible' }[]; confirmed: { circuitId: string; sortValue: number; resolved: boolean }[] }
export type CircuitEvent = EventBase & { type: 'CIRCUIT_PAIR_RESOLVED' | 'SELF_MATCH_COMPLETED' | 'NUMBER_COMPLETED' | 'YELLOW_RESOLVED' | 'RED_TRIGGERED' | 'RED_SAFELY_RESOLVED' | 'SHIP_DAMAGED' | 'MISSION_COMPLETED' | 'MISSION_FAILED'; circuitIds: string[]; kind?: CircuitKind; number?: number; resolvedCopies?: number; totalCopies?: number; hullBefore?: number; hullAfter?: number; damage?: number; reason?: string };

export interface StartingInformation { participant: CrewId; circuitId: string; value: number }
export interface RevealRedAction { participant: CrewId; circuitIds: string[]; eligible: boolean; explanation: string }
export interface EquipmentAvailability { id: string; toolId: ToolId; unlockNumber: number; resolvedCopies: number; state: 'locked' | 'ready' | 'used'; available: boolean; remainingUses: number; validTargetIds: string[]; description: string; timing: 'anytime' | 'activeTurn' }
export interface EquipmentCommand { token: string; targets?: string[]; threshold?: number; ownId?: string; number?: number }
export interface CharacterCard { participant: CrewId; powerId: 'doubleDetector'; name: string; description: string; state: 'locked' | 'ready' | 'active' | 'used'; remainingUses: number; requirements: string[]; validTargetIds: string[] }
/** Only implemented, approved powers can be configured. */
export interface EngineOptions { equipment?: {toolId: ToolId; unlockNumber: number}[]; random?: () => number; powers?: Partial<Record<CrewId, { powerId: 'doubleDetector'; enabled: boolean }>> }
export type RulesEvent = EventBase & { type: 'STARTING_INFORMATION' | 'POWER_ACTIVATED' | 'POWER_USED' | 'EQUIPMENT_UNLOCKED' | 'EQUIPMENT_USED' | 'CATASTROPHIC_OVERLOAD'; participant?: CrewId; circuitIds: string[]; equipmentId?: string; powerId?: string; number?: number };
