import type { Difficulty, Mission, Tuning } from './types';
export const DIFFICULTIES: Readonly<Record<Difficulty, Readonly<Tuning>>> = Object.freeze({
 easy: Object.freeze({ numberMin: 1, numberMax: 12, copies: 4, hull: 100, durationMs: 300000, damage: 15, energy: 8, rewardEnergy: 1, deductionPasses: 48 }),
 medium: Object.freeze({ numberMin: 1, numberMax: 12, copies: 4, hull: 100, durationMs: 300000, damage: 20, energy: 5, rewardEnergy: 1, deductionPasses: 8 }),
 hard: Object.freeze({ numberMin: 1, numberMax: 12, copies: 4, hull: 100, durationMs: 300000, damage: 30, energy: 3, rewardEnergy: 1, deductionPasses: 1 }),
});
export const MISSIONS: readonly Mission[] = [
 { id: 'lights', name: 'Restore the Lights', puzzle: 'matching', availability: 'playable' },
 { id: 'navigation', name: 'Repair Navigation', puzzle: 'sequence', availability: 'development' },
 { id: 'engines', name: 'Restart the Engines', puzzle: 'matching', availability: 'development' },
 { id: 'communications', name: 'Restore Communications', puzzle: 'sequence', availability: 'development' },
];

/** Per-mission overrides may lock tools now; progress unlock policy is deferred. */
export const DEFAULT_TOOLS = Object.freeze({scanner:{uses:1,unlocked:true},dualScanner:{uses:1,unlocked:true},shield:{uses:1,unlocked:true},hint:{uses:1,unlocked:true}});


/** Stage definitions remain development content until Agent 2 supplies special-circuit UI. */
export function specialRulesForStage(stage: number): import('./types').SpecialRules {
 return {yellowPositions:stage>=4?[2.5,5.5,8.5,11.5]:[],redPositions:stage>=7?[4.25,9.25]:[],redInstantFailure:true,redSafeRule:'after-other-circuits',showCandidates:true};
}
for(let stage=1;stage<=9;stage++) (MISSIONS as Mission[]).push({id:`circuit-${stage}`,name:`Circuit Training ${stage}`,puzzle:'matching',availability:'development',stage,specials:specialRulesForStage(stage)});
