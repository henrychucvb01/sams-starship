import type { AIAction, AIObservation } from './types';
/** No engine reference or full board is accepted by this strategy. */
export function decideAI(view: AIObservation): AIAction {
 for (const own of view.own.filter(s=>!s.restored)) {
 const targets=view.publicCircuits.filter(s=>s.owner!==view.self&&!s.restored).filter(s=>s.value!==undefined?s.value===own.value:view.clues.some(c=>c.slotId===s.id&&c.min===c.max&&c.min===own.value));
 if(targets.length===1) return {type:'connect',ownId:own.id,targetId:targets[0].id};
 } return {type:'wait'};
}
