import type { Difficulty, Mission, Tuning } from './types';
export const DIFFICULTIES: Readonly<Record<Difficulty, Readonly<Tuning>>> = Object.freeze({
 easy: Object.freeze({ pairs: 6, hull: 100, durationMs: 300000, damage: 15, energy: 6, rewardEnergy: 1, clueWidth: 0, aiEvery: 1, sequenceLength: 5 }),
 medium: Object.freeze({ pairs: 8, hull: 100, durationMs: 300000, damage: 20, energy: 4, rewardEnergy: 1, clueWidth: 2, aiEvery: 2, sequenceLength: 6 }),
 hard: Object.freeze({ pairs: 10, hull: 100, durationMs: 300000, damage: 30, energy: 3, rewardEnergy: 1, clueWidth: 4, aiEvery: 3, sequenceLength: 7 }),
});
export const MISSIONS: readonly Mission[] = [
 { id: 'lights', name: 'Restore the Lights', puzzle: 'matching', availability: 'playable' },
 { id: 'navigation', name: 'Repair Navigation', puzzle: 'sequence', availability: 'development' },
 { id: 'engines', name: 'Restart the Engines', puzzle: 'matching', availability: 'development' },
 { id: 'communications', name: 'Restore Communications', puzzle: 'sequence', availability: 'development' },
];
