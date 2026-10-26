import { DIFFICULTIES, MISSIONS } from './config';
import { decideAI } from './ai';
import { generateMatching, generateSequences, validateSequence } from './puzzles';
import type { SequencePuzzle } from './puzzles';
import type { AIObservation, Circuit, CrewId, Difficulty, GameState, Tuning } from './types';
export class GameEngine {
 #board: Circuit[]=[]; #sequences: SequencePuzzle[]=[]; #seed=1; #turn=0; #state!: GameState; #tuning!: Tuning;
 constructor(missionId='lights', difficulty: Difficulty='easy', seed=1, overrides: Partial<Tuning>={}) { this.startMission(missionId,difficulty,seed,overrides); }
 /** Explicit time advancement; UI owns scheduling. All durations are milliseconds. */
 startMission(missionId='lights',difficulty: Difficulty='easy',seed=1,overrides: Partial<Tuning>={}): GameState {
 const mission=MISSIONS.find(m=>m.id===missionId); if(!mission||!DIFFICULTIES[difficulty]) throw new Error('Unknown mission or difficulty');
 const tuning={...DIFFICULTIES[difficulty],...overrides};
 for(const [key,value] of Object.entries(tuning)) if(!Number.isSafeInteger(value)||value<0) throw new Error(`Invalid tuning: ${key}`);
 if(tuning.pairs<1||tuning.pairs>99||tuning.hull<1||tuning.durationMs<1||tuning.aiEvery<1||tuning.sequenceLength<4||tuning.sequenceLength>10) throw new Error('Tuning outside supported range');
 if(!Number.isSafeInteger(seed)) throw new Error('Seed must be an integer');
 this.#seed=seed;this.#tuning=tuning;this.#turn=0;
 this.#board=mission.puzzle==='matching'?generateMatching(tuning.pairs,seed):[];
 this.#sequences=mission.puzzle==='sequence'?generateSequences(tuning.pairs,tuning.sequenceLength,difficulty,seed):[];
 this.#state={mission:{...mission},difficulty,status:'playing',hull:tuning.hull,energy:tuning.energy,remainingMs:tuning.durationMs,restored:0,total:tuning.pairs,selected:null,circuits:[],sequences:[],clues:[],history:[]};
 this.#event('started',`${mission.name}: crew isolated; emergency terminals online.`); return this.getGameState();
 }
 getGameState(): GameState { return structuredClone({...this.#state,circuits:this.#board.map(({value,...slot})=>slot.owner==='sam'?{...slot,value}:slot),sequences:this.#sequences.map(({answer: _answer,clue,...p})=>({...p,...(this.#state.history.some(e=>e.type===`hint:${p.id}`)?{clue}:{})}))}); }
 selectCircuit(id: string): GameState { this.#active(); const s=this.#board.find(s=>s.id===id&&s.owner==='sam'&&!s.restored); if(!s) throw new Error('Select an unresolved Sam circuit'); this.#state.selected=id;return this.getGameState(); }
 attemptConnection(targetId: string): GameState { this.#active();const own=this.#board.find(s=>s.id===this.#state.selected);const target=this.#board.find(s=>s.id===targetId); if(!own||!target||target.owner==='sam'||own.restored||target.restored) throw new Error('Invalid connection');this.#connect(own,target);this.#state.selected=null;return this.getGameState(); }
 submitSequence(id: string,value: number): GameState { this.#active();const p=this.#sequences.find(p=>p.id===id&&!p.restored);if(!p||!Number.isSafeInteger(value)) throw new Error('Invalid sequence submission');if(validateSequence(p,value)){p.restored=true;this.#restore();this.#event('restored',`${id} restored`);}else this.#damage();return this.getGameState(); }
 /** Each request discloses one bounded interval from that crewmate's own slot. */
 requestHint(id: string): GameState { this.#active();if(this.#state.energy<1) throw new Error('No communication energy');
 const slot=this.#board.find(s=>s.id===id&&s.owner!=='sam'&&!s.restored);const p=this.#sequences.find(p=>p.id===id&&!p.restored);
 if(!slot&&!p) throw new Error('Invalid hint target');
 if(slot){const prior=this.#state.clues.find(c=>c.slotId===id);if(prior&&prior.min===prior.max) throw new Error('Slot already fully disclosed');const width=prior?Math.floor((prior.max-prior.min)/2):this.#tuning.clueWidth;const value=slot.value!;this.#state.clues=this.#state.clues.filter(c=>c.slotId!==id);this.#state.clues.push({slotId:id,min:Math.max(prior?.min??1,value-width),max:Math.min(prior?.max??99,value+width)});}
 else if(this.#state.history.some(e=>e.type===`hint:${id}`)) throw new Error('Clue already transmitted');
 this.#state.energy--;this.#event(`hint:${id}`,slot?`Numerical clue received for ${id}`:`Crew transmitted the pattern for ${id}`);return this.getGameState(); }
 /** Return isolated knowledge for tests/strategy; never another AI's values. */
 #observation(self: Exclude<CrewId,'sam'>): AIObservation { if(self!=='nova'&&self!=='pip') throw new Error('Invalid AI');return structuredClone({self,own:this.#board.filter(s=>s.owner===self),publicCircuits:this.#board.map(({value:_v,...s})=>s),clues:this.#state.clues}); }
 shareCircuit(id: string): GameState { this.#active();const slot=this.#board.find(s=>s.id===id&&s.owner==='sam'&&!s.restored);if(!slot||this.#state.energy<1||this.#state.clues.some(c=>c.slotId===id))throw new Error('Cannot transmit circuit');this.#state.energy--;this.#state.clues.push({slotId:id,min:slot.value!,max:slot.value!});this.#event('transmitted',`Sam transmitted ${id}`);return this.getGameState(); }
 advanceAI(): GameState { this.#active();this.#turn++;if(this.#turn%this.#tuning.aiEvery===0){for(const self of ['nova','pip'] as const){const action=decideAI(this.#observation(self));if(action.type==='connect'){const own=this.#board.find(s=>s.id===action.ownId)!;const target=this.#board.find(s=>s.id===action.targetId)!;this.#connect(own,target);break;}}}return this.getGameState(); }
 advanceTime(elapsedMs: number): GameState { if(!Number.isFinite(elapsedMs)||elapsedMs<0)throw new Error('Invalid elapsed time');if(this.#state.status==='playing'){this.#state.remainingMs=Math.max(0,this.#state.remainingMs-elapsedMs);if(this.#state.remainingMs===0){this.#state.status='lost';this.#event('lost','Emergency power expired');}}return this.getGameState(); }
 restartMission(): GameState { return this.startMission(this.#state.mission.id,this.#state.difficulty,this.#seed,this.#tuning); }
 #active(){if(this.#state.status!=='playing')throw new Error('Mission is not active');}
 #event(type:string,message:string){this.#state.history.push({index:this.#state.history.length,type,message});}
 #connect(a:Circuit,b:Circuit){if(a.value===b.value){a.restored=b.restored=true;this.#restore();this.#event('restored',`${a.id} connected to ${b.id}`);}else this.#damage();}
 #restore(){this.#state.restored++;this.#state.energy+=this.#tuning.rewardEnergy;if(this.#state.restored===this.#state.total){this.#state.status='won';this.#event('won','All circuits restored');}}
 #damage(){this.#state.hull=Math.max(0,this.#state.hull-this.#tuning.damage);this.#event('mistake','Connection failed; hull damaged');if(this.#state.hull===0){this.#state.status='lost';this.#event('lost','Hull integrity lost');}}
}
