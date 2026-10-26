import type { Circuit, Difficulty } from './types';
export function random(seed: number): () => number { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
export function generateMatching(pairs: number, seed: number): Circuit[] {
 const rng = random(seed); const values = Array.from({ length: 99 }, (_, i) => i + 1);
 for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
 const hidden = values.slice(0, pairs).sort((a,b) => a-b);
 for (let i = hidden.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i+1)); [hidden[i],hidden[j]]=[hidden[j],hidden[i]]; }
 return [...values.slice(0,pairs).map((value,i): Circuit => ({id:`sam-${i}`,owner:'sam',value,restored:false})), ...hidden.map((value,i): Circuit => ({id:`crew-${i}`,owner:i%2?'pip':'nova',value,restored:false}))];
}
export interface SequencePuzzle { id: string; terms: (number | null)[]; answer: number; clue: string; restored: boolean }
export function generateSequences(count: number, length: number, difficulty: Difficulty, seed: number): SequencePuzzle[] {
 const rng=random(seed);
 return Array.from({length:count},(_,i)=>{ const start=1+Math.floor(rng()*9), step=2+Math.floor(rng()*4); const pattern=difficulty==='easy'?0:difficulty==='medium'?i%2:i%3;
 const terms=Array.from({length},(_,n)=>pattern===0?start+n*step:pattern===1?start*2**n:start+step*n*n);
 const hole=difficulty==='easy'?length-1:1+Math.floor(rng()*(length-2)); const answer=terms[hole];
 return {id:`sequence-${i}`,terms:terms.map((v,n)=>n===hole?null:v),answer,clue:pattern===0?`Add ${step} each time`:pattern===1?'Multiply by 2 each time':`Start at ${start}; add ${step} times successive odd numbers`,restored:false}; });
}
export function validateSequence(puzzle: SequencePuzzle, value: number): boolean { return Number.isSafeInteger(value) && value===puzzle.answer; }
