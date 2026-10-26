import type { Circuit, Difficulty } from './types';
export function random(seed: number): () => number { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
/** Complete multiset shuffled, dealt round-robin, then sorted per room. */
export function generateMatching(min: number, max: number, copies: number, seed: number): Circuit[] {
 const rng=random(seed), deck=Array.from({length:(max-min+1)*copies},(_,i)=>min+Math.floor(i/copies));
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return (['sam','nova','pip'] as const).flatMap((owner,room)=>deck.filter((_,i)=>i%3===room).sort((a,b)=>a-b).map((value,position)=>({id:`${owner}-${position}`,owner,position,value,restored:false})));
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


/** Generate from mission inventory, shuffle independently of identity, sort by numeric key. */
export function generateMissionCircuits(min:number,max:number,copies:number,seed:number,specials:import('./types').SpecialRules): Circuit[] {
 const deck: Circuit[]=Array.from({length:(max-min+1)*copies},(_,i)=>({id:'',owner:'sam',position:0,value:min+Math.floor(i/copies),kind:'blue',restored:false}));
 for(const kind of ['yellow','red'] as const)for(const value of specials[kind==='yellow'?'yellowPositions':'redPositions'])deck.push({id:'',owner:'sam',position:0,value,kind,restored:false});
 const rng=random(seed);for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return (['sam','nova','pip'] as const).flatMap((owner,room)=>deck.filter((_,i)=>i%3===room).sort((a,b)=>a.value!-b.value!).map((c,position)=>({...c,id:`${owner}-${position}`,owner,position})));
}
