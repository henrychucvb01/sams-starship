import type { AIAction, AIObservation } from './types';
/** Conservative constraint propagation; never inspect validation values. Resolved positions stay as anchors. */
export function deduce(view: AIObservation): Record<string, number[]> {
 const domains: Record<string,number[]>={};
 if(view.specialRules&&(view.specialRules.yellowPositions.length||view.specialRules.redPositions.length)){
 // Numeric equality cannot identify a matching category on a special board. Only public/own facts inform moves.
 const possible=[...Array.from({length:view.max-view.min+1},(_,i)=>view.min+i),...view.specialRules.yellowPositions,...view.specialRules.redPositions];
 for(const c of view.circuits)domains[c.id]=c.value===undefined?[...new Set(possible)]:[c.value];
 for(const rackKey of new Set(view.circuits.map(c=>`${c.owner}:${c.rack??0}`))){const row=view.circuits.filter(c=>`${c.owner}:${c.rack??0}`===rackKey).sort((a,b)=>a.position-b.position);for(const c of row){const before=row.filter(t=>t.position<c.position&&t.value!==undefined).map(t=>t.value!);const after=row.filter(t=>t.position>c.position&&t.value!==undefined).map(t=>t.value!);domains[c.id]=domains[c.id].filter(n=>n>=Math.max(-Infinity,...before)&&n<=Math.min(Infinity,...after));}}
 for(const r of view.scannerResults??[])domains[r.circuitId]=domains[r.circuitId].filter(n=>r.relation==='below'?n<r.threshold:r.relation==='above'?n>r.threshold:n===r.threshold);
 return domains;
 }
 for(const c of view.circuits){const known=c.value??view.reveals.find(r=>r.circuitId===c.id)?.value;domains[c.id]=known===undefined?Array.from({length:view.max-view.min+1},(_,i)=>view.min+i).filter(n=>!view.incorrectGuesses.some(g=>g.targetCircuitId===c.id&&g.declaredNumber===n)):[known];}
 for(const result of view.scannerResults??[]) domains[result.circuitId]=domains[result.circuitId].filter(n=>result.relation==='below'?n<result.threshold:result.relation==='above'?n>result.threshold:n===result.threshold);
 for(let pass=0;pass<view.deductionPasses;pass++){
 const before=JSON.stringify(domains);
 for(const rackKey of new Set(view.circuits.map(c=>`${c.owner}:${c.rack??0}`))){const row=view.circuits.filter(c=>`${c.owner}:${c.rack??0}`===rackKey).sort((a,b)=>a.position-b.position);for(let i=1;i<row.length;i++){const a=domains[row[i-1].id], b=domains[row[i].id];domains[row[i].id]=b.filter(n=>n>=Math.min(...a));}for(let i=row.length-2;i>=0;i--){const b=domains[row[i+1].id];domains[row[i].id]=domains[row[i].id].filter(n=>n<=Math.max(...b));}}
 for(let n=view.min;n<=view.max;n++){const fixed=view.circuits.filter(c=>domains[c.id].length===1&&domains[c.id][0]===n);const possible=view.circuits.filter(c=>domains[c.id].includes(n));if(fixed.length===view.copies)for(const c of possible)if(domains[c.id].length>1)domains[c.id]=domains[c.id].filter(v=>v!==n);if(possible.length===view.copies)for(const c of possible)domains[c.id]=[n];}
 if(JSON.stringify(domains)===before)break;
 }return domains;
}
export function decideAI(view: AIObservation): AIAction {
 if(view.specialRules&&(view.specialRules.yellowPositions.length||view.specialRules.redPositions.length))return decideSpecialAI(view);
 const domains=deduce(view), own=view.circuits.filter(c=>c.owner===view.self&&!c.restored);
 for(const c of own){const target=view.circuits.find(t=>t.owner!==view.self&&!t.restored&&domains[t.id].length===1&&domains[t.id][0]===c.value);if(target)return {type:'connect',ownId:c.id,targetId:target.id,number:c.value!};}
 for(const c of own){const resolved=view.reveals.filter(r=>r.value===c.value&&view.circuits.find(t=>t.id===r.circuitId)?.restored).length;const held=own.filter(t=>t.value===c.value);if([2,4].includes(held.length)&&held.length===view.copies-resolved)return {type:'solo',number:c.value!};}
 // A truthful self-disclosure costs shared energy; no arbitrary guesses on uncertain turns.
 if(view.energy>0){const tile=own.find(c=>!view.reveals.some(r=>r.circuitId===c.id));if(tile)return {type:'clue',circuitId:tile.id};}
 return {type:'pass'};
}


function decideSpecialAI(view:AIObservation):AIAction{
 const own=view.circuits.filter(c=>c.owner===view.self&&!c.restored),rules=view.specialRules!;
 const same=(a:import('./types').Circuit,b:import('./types').Circuit)=>a.kind==='yellow'?b.kind==='yellow':(a.kind??'blue')==='blue'&&b.kind==='blue'&&a.value===b.value;
 for(const c of own.filter(c=>c.kind!=='red')){const target=view.circuits.find(t=>t.owner!==view.self&&!t.restored&&t.value!==undefined&&same(c,t));if(target)return {type:'connect',ownId:c.id,targetId:target.id,number:c.value!};}
 for(const c of own.filter(c=>c.kind!=='red')){const total=c.kind==='yellow'?rules.yellowPositions.length:view.copies;const resolved=view.circuits.filter(t=>t.restored&&same(c,t)).length;const held=own.filter(t=>same(c,t));if([2,4].includes(held.length)&&held.length===total-resolved)return {type:'solo',number:c.value!};}
 if(rules.redSafeRule==='after-other-circuits'&&own.length>0&&own.every(c=>c.kind==='red')){const red=own.find(c=>c.kind==='red');if(red)return {type:'safeRed',circuitId:red.id};}
 if(view.energy>0){const c=own.find(c=>!view.reveals.some(r=>r.circuitId===c.id));if(c)return {type:'clue',circuitId:c.id};}
 return {type:'pass'};
}
