import type { AIAction, AIObservation } from './types';
/** Conservative constraint propagation; never inspect validation values. Resolved positions stay as anchors. */
export function deduce(view: AIObservation): Record<string, number[]> {
 const domains: Record<string,number[]>={};
 for(const c of view.circuits){const known=c.value??view.reveals.find(r=>r.circuitId===c.id)?.value;domains[c.id]=known===undefined?Array.from({length:view.max-view.min+1},(_,i)=>view.min+i).filter(n=>!view.incorrectGuesses.some(g=>g.targetCircuitId===c.id&&g.declaredNumber===n)):[known];}
 for(let pass=0;pass<view.deductionPasses;pass++){
 const before=JSON.stringify(domains);
 for(const owner of ['sam','nova','pip']){const row=view.circuits.filter(c=>c.owner===owner).sort((a,b)=>a.position-b.position);for(let i=1;i<row.length;i++){const a=domains[row[i-1].id], b=domains[row[i].id];domains[row[i].id]=b.filter(n=>n>=Math.min(...a));}for(let i=row.length-2;i>=0;i--){const b=domains[row[i+1].id];domains[row[i].id]=domains[row[i].id].filter(n=>n<=Math.max(...b));}}
 for(let n=view.min;n<=view.max;n++){const fixed=view.circuits.filter(c=>domains[c.id].length===1&&domains[c.id][0]===n);const possible=view.circuits.filter(c=>domains[c.id].includes(n));if(fixed.length===view.copies)for(const c of possible)if(domains[c.id].length>1)domains[c.id]=domains[c.id].filter(v=>v!==n);if(possible.length===view.copies)for(const c of possible)domains[c.id]=[n];}
 if(JSON.stringify(domains)===before)break;
 }return domains;
}
export function decideAI(view: AIObservation): AIAction {
 const domains=deduce(view), own=view.circuits.filter(c=>c.owner===view.self&&!c.restored);
 for(const c of own){const target=view.circuits.find(t=>t.owner!==view.self&&!t.restored&&domains[t.id].length===1&&domains[t.id][0]===c.value);if(target)return {type:'connect',ownId:c.id,targetId:target.id,number:c.value!};}
 for(const c of own){const resolved=view.reveals.filter(r=>r.value===c.value&&view.circuits.find(t=>t.id===r.circuitId)?.restored).length;const held=own.filter(t=>t.value===c.value);if(held.length===view.copies-resolved)return {type:'solo',number:c.value!};}
 // A truthful self-disclosure costs shared energy; no arbitrary guesses on uncertain turns.
 if(view.energy>0){const tile=own.find(c=>!view.reveals.some(r=>r.circuitId===c.id));if(tile)return {type:'clue',circuitId:tile.id};}
 return {type:'pass'};
}
