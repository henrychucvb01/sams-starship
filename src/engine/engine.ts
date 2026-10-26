import { DIFFICULTIES, MISSIONS } from './config';
import { decideAI, deduce } from './ai';
import { generateMatching } from './puzzles';
import type { AIObservation, Circuit, CrewId, Difficulty, GameEvent, GameState, PublicReveal, Tuning } from './types';
const CREW = ['sam','nova','pip'] as const;
/** Pure synchronous game controller. UI owns all clocks and animation scheduling. */
export class GameEngine {
 #board: Circuit[]=[]; #seed=1; #state!:GameState; #tuning!:Tuning;
 constructor(missionId='lights',difficulty:Difficulty='easy',seed=1,overrides:Partial<Tuning>={}){this.startMission(missionId,difficulty,seed,overrides);}
 startMission(missionId='lights',difficulty:Difficulty='easy',seed=1,overrides:Partial<Tuning>={}):GameState{
 const mission=MISSIONS.find(m=>m.id===missionId);if(!mission||!DIFFICULTIES[difficulty])throw new Error('Unknown mission or difficulty');if(mission.puzzle!=='matching')throw new Error('Sequence missions are not playable yet');
 const t={...DIFFICULTIES[difficulty],...overrides};for(const value of Object.values(t))if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid tuning');
 if(t.numberMin<1||t.numberMax<t.numberMin||t.numberMax>99||t.copies<2||t.copies>12||t.copies%2||t.hull<1||t.durationMs<1||t.deductionPasses<1||!Number.isSafeInteger(seed))throw new Error('Unsupported tuning');
 this.#seed=seed;this.#tuning=t;this.#board=generateMatching(t.numberMin,t.numberMax,t.copies,seed);
 this.#state={mission:{...mission},difficulty,status:'playing',hull:t.hull,maxHull:t.hull,damageStage:'normal',energy:t.energy,remainingMs:t.durationMs,restored:0,total:this.#board.length/2,remainingCircuits:this.#board.length,selected:null,participants:CREW.map(id=>({id,name:id==='sam'?'Sam':id==='nova'?'Nova':'Pip',control:id==='sam'?'human':'ai'})),currentParticipant:'sam',turnNumber:1,circuits:[],publicReveals:[],incorrectGuesses:[],history:[],distribution:{min:t.numberMin,max:t.numberMax,copies:t.copies},possibilities:{}};
 this.#event({type:'STARTED',message:'Crew isolated. Sorted circuits ready.'});return this.getGameState();
 }
 getGameState():GameState{return structuredClone({...this.#state,circuits:this.#view('sam').circuits,possibilities:deduce(this.#view('sam'))});}
 getEvents(afterIndex=-1):GameEvent[]{return structuredClone(this.#state.history.filter(e=>e.index>afterIndex));}
 selectCircuit(id:string):GameState{this.#human();const c=this.#slot(id);if(c.owner!=='sam')throw new Error('Select a Sam circuit');this.#state.selected=id;return this.getGameState();}
 attemptConnection(targetId:string,declaredNumber:number):GameState{this.#human();if(!this.#state.selected)throw new Error('Select your circuit first');this.#connect(this.#state.selected,targetId,declaredNumber);return this.getGameState();}
 requestHint(id:string):GameState{this.#human();const c=this.#slot(id);if(c.owner==='sam')throw new Error('Request a crew clue or use shareCircuit');this.#clue(c);this.#next();return this.getGameState();}
 shareCircuit(id:string):GameState{this.#human();const c=this.#slot(id);if(c.owner!=='sam')throw new Error('Can only share own circuit');this.#clue(c);this.#next();return this.getGameState();}
 resolveSolo(number:number):GameState{this.#human();this.#solo(number);return this.getGameState();}
 passTurn():GameState{this.#human();this.#event({type:'PASSED',message:'Sam passed'});this.#next();return this.getGameState();}
 advanceAI():GameState{this.#active();if(this.#state.currentParticipant==='sam')throw new Error('Human turn');const action=decideAI(this.#view(this.#state.currentParticipant));
 if(action.type==='connect')this.#connect(action.ownId,action.targetId,action.number);
 else if(action.type==='solo')this.#solo(action.number);
 else {if(action.type==='clue')this.#clue(this.#slot(action.circuitId));else this.#event({type:'PASSED',message:`${this.#state.currentParticipant} has no certain match or clue energy`});this.#next();}return this.getGameState();}
 advanceTime(elapsedMs:number):GameState{if(!Number.isFinite(elapsedMs)||elapsedMs<0)throw new Error('Invalid elapsed time');if(this.#state.status==='playing'){this.#state.remainingMs=Math.max(0,this.#state.remainingMs-elapsedMs);if(!this.#state.remainingMs){this.#state.status='lost';this.#event({type:'LOST',message:'Emergency power expired'});}}return this.getGameState();}
 restartMission():GameState{return this.startMission(this.#state.mission.id,this.#state.difficulty,this.#seed,this.#tuning);}
 #view(self:CrewId):AIObservation{return structuredClone({self,circuits:this.#board.map(({value,...c})=>{const reveal=this.#state.publicReveals.find(r=>r.circuitId===c.id);return c.owner===self||reveal?{...c,value:reveal?.value??value}:c;}),reveals:this.#state.publicReveals,incorrectGuesses:this.#state.incorrectGuesses,min:this.#tuning.numberMin,max:this.#tuning.numberMax,copies:this.#tuning.copies,energy:this.#state.energy,deductionPasses:this.#tuning.deductionPasses});}
 #active(){if(this.#state.status!=='playing')throw new Error('Mission is not active');}
 #human(){this.#active();if(this.#state.currentParticipant!=='sam')throw new Error('Wait for Sam turn');}
 #slot(id:string){const c=this.#board.find(c=>c.id===id&&!c.restored);if(!c)throw new Error('Circuit unavailable');return c;}
 #event(event:GameEvent extends infer E ? E extends GameEvent ? Omit<E,'index'|'turn'> : never : never){this.#state.history.push({...event,index:this.#state.history.length,turn:this.#state.turnNumber} as GameEvent);}
 #reveal(c:Circuit,reason:PublicReveal['reason']){const old=this.#state.publicReveals.find(r=>r.circuitId===c.id);if(old){if(reason==='resolved')old.reason=reason;}else this.#state.publicReveals.push({circuitId:c.id,value:c.value!,reason});}
 #clue(c:Circuit){if(this.#state.energy<1||this.#state.publicReveals.some(r=>r.circuitId===c.id))throw new Error('No energy or circuit already public');this.#state.energy--;this.#reveal(c,'clue');this.#event({type:'CLUE_SHARED',participant:this.#state.currentParticipant,circuitId:c.id,value:c.value!,message:'Emergency terminal transmitted one number'});}
 #connect(ownId:string,targetId:string,number:number){const own=this.#slot(ownId),target=this.#slot(targetId),actor=this.#state.currentParticipant;
 if(own.owner!==actor||target.owner===actor||!Number.isSafeInteger(number)||number!==own.value)throw new Error('Declare the number on your selected circuit');
 if(target.value===number){this.#resolve([own,target],number);}else{
 const before=this.#state.hull;this.#state.hull=Math.max(0,before-this.#tuning.damage);const damage=before-this.#state.hull;this.#reveal(target,'mistake');this.#state.incorrectGuesses.push({participant:actor,ownCircuitId:own.id,targetCircuitId:target.id,declaredNumber:number,turn:this.#state.turnNumber});
 this.#event({type:'CONNECTION_FAILED',participant:actor,damage,targetCircuitId:target.id,declaredNumber:number,revealedNumber:target.value!,message:'Connection failed; target revealed'});
 this.#stage();this.#event({type:'SHIP_ATTACK',source:'incorrect_connection',damage,hullBefore:before,hullAfter:this.#state.hull,targetCircuitId:target.id,revealedNumber:target.value!,severity:this.#state.hull/this.#tuning.hull<=0.25?'critical':this.#state.hull/this.#tuning.hull<=0.5?'medium':'light',message:'Enemy impact'});
 if(!this.#state.hull){this.#state.status='lost';this.#event({type:'LOST',message:'Hull integrity lost'});}}
 this.#next();}
 #solo(number:number){if(!Number.isSafeInteger(number))throw new Error('Invalid number');const own=this.#board.filter(c=>c.owner===this.#state.currentParticipant&&!c.restored&&c.value===number);const resolved=this.#state.publicReveals.filter(r=>r.value===number&&this.#board.find(c=>c.id===r.circuitId)?.restored).length;
 // Eligibility is provable from own inventory plus PUBLIC resolved counts, never a hidden-board query.
 if(!own.length||own.length!==this.#tuning.copies-resolved)throw new Error('Solo resolution is not eligible');this.#resolve(own,number);this.#next();}
 #resolve(slots:Circuit[],number:number){for(const c of slots){c.restored=true;this.#reveal(c,'resolved');}this.#state.restored+=slots.length/2;this.#state.remainingCircuits-=slots.length;this.#state.energy+=this.#tuning.rewardEnergy;this.#event({type:'CONNECTION_SUCCESS',participant:this.#state.currentParticipant,circuitIds:slots.map(c=>c.id),number,message:'Matching circuits restored'});if(!this.#state.remainingCircuits){this.#state.status='won';this.#event({type:'WON',message:'All circuits restored'});}}
 #stage(){const p=this.#state.hull/this.#tuning.hull;this.#state.damageStage=p===0?'destroyed':p<=.25?'critical':p<=.5?'moderate':p<=.75?'light':'normal';}
 #next(){this.#state.selected=null;if(this.#state.status!=='playing')return;let i=CREW.indexOf(this.#state.currentParticipant);do{i=(i+1)%3;}while(!this.#board.some(c=>c.owner===CREW[i]&&!c.restored));this.#state.currentParticipant=CREW[i];this.#state.turnNumber++;this.#event({type:'TURN_STARTED',message:`${CREW[i]} turn`});}
}
