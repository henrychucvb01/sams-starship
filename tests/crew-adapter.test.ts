import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEngineAdapter} from '../src/adapters/engineAdapter';
import type {MissionAdapter} from '../src/types/presentation';
import {generateMatching} from '../src/engine/puzzles';
function setup(a:MissionAdapter){const id=a.getSnapshot().crewFeatures!.startingInformation!.availableIds.at(-1)!;a.selectStartingInformation!(id,'');return id;}
test('adapter setup is explicit/free, projects public markers and rotates the real Captain',()=>{
 const a=createEngineAdapter(42,{}, {},'lights',{random:()=>0.4});
 try {let s=a.getSnapshot();assert.equal(s.crewFeatures!.captainId,'nova');assert.equal(s.board!.phase,'setup');assert.equal(s.crewFeatures!.startingInformation!.markers.length,0);
 const energy=s.energy,turn=s.board!.turnNumber; a.connect('sam-0','nova-0'); assert.equal(a.getSnapshot().restored,0);
 const id=setup(a);s=a.getSnapshot();assert.equal(s.board!.phase,'thinking');assert.equal(s.board!.turn,'nova');assert.equal(s.energy,energy);assert.equal(s.board!.turnNumber,turn);assert.equal(s.crewFeatures!.startingInformation!.markers.length,3);assert(s.ownCircuits.find(c=>c.id===id)!.shared);
 assert.equal(s.rooms.flatMap(r=>r.slots).filter(c=>!!c.clue).length,2);assert(s.rooms.flatMap(r=>r.slots).filter(c=>!c.clue).every(c=>c.type===undefined&&c.sortLabel===undefined));
 a.restart();s=a.getSnapshot();assert.equal(s.crewFeatures!.captainId,'pip');assert.equal(s.board!.phase,'setup');assert.equal(s.crewFeatures!.startingInformation!.markers.length,0);
 }finally{a.dispose();}
});
test('adapter real equipment unlocks, works off turn, exhausts once and preserves legacy/personal charges',()=>{
 let seed=0;while(generateMatching(1,12,4,seed).filter(c=>c.owner==='sam'&&c.value===1).length!==4)seed++;
 const a=createEngineAdapter(seed,{}, {},'lights',{random:()=>0,equipment:[{toolId:'scanner',unlockNumber:1},{toolId:'shield',unlockNumber:1},{toolId:'hint',unlockNumber:1}]});
 try {setup(a);let s=a.getSnapshot();assert(s.crewFeatures!.equipment.every(e=>e.status==='locked'));const match=s.selfMatches!.find(m=>m.number===1)!;a.selfMatch!(match.circuitIds.slice(0,2));s=a.getSnapshot();assert.equal(s.board!.turn,'nova');assert(s.crewFeatures!.equipment.every(e=>e.available&&e.status==='ready'&&e.resolved===4));
 const token=s.toolToken!, target=s.crewFeatures!.equipment[0].targets[0].options[0].id,turn=s.board!.turnNumber;
 a.performCrewAction!('equipment-0',{targets:[target],threshold:['6']},token);s=a.getSnapshot();assert.equal(s.board!.turnNumber,turn);assert.equal(s.crewFeatures!.equipment[0].status,'used');assert(s.rooms.flatMap(r=>r.slots).find(c=>c.id===target)!.scans!.length);assert(!s.rooms.flatMap(r=>r.slots).find(c=>c.id===target)!.clue);
 a.performCrewAction!('equipment-1',{},token);assert.match(a.getSnapshot().event.text,/stale/);assert.equal(a.getSnapshot().crewFeatures!.equipment[1].status,'ready');
 a.performCrewAction!('equipment-1',{},s.toolToken!);s=a.getSnapshot();assert(s.shieldActive);assert.equal(s.crewFeatures!.equipment[1].status,'used');assert.equal(s.tools!.find(t=>t.id==='shield')!.remaining,1);assert.equal(s.crewFeatures!.crew[0].power!.remaining,1);
 a.performCrewAction!('equipment-2',{},s.toolToken!);assert(a.getSnapshot().toolClue);assert(a.getSnapshot().crewFeatures!.equipment.every(e=>e.used));
 }finally{a.dispose();}
});
test('adapter personal power uses two legal same-room targets, spends once, preserves unchosen secrecy',()=>{
 const seed=42,a=createEngineAdapter(seed,{}, {},'lights',{random:()=>0});
 try{setup(a);let s=a.getSnapshot();const before=s,truth=generateMatching(1,12,4,seed);const power=s.crewFeatures!.crew[0].power!;
 const own=s.ownCircuits.find(c=>truth.some(t=>t.owner!=='sam'&&t.value===c.value&&power.targets[1].options.some(o=>o.id===t.id)))!;
 const first=truth.find(t=>t.owner!=='sam'&&t.value===own.value&&power.targets[1].options.some(o=>o.id===t.id))!;
 const second=power.targets[1].options.find(o=>o.id!==first.id&&o.group===first.owner)!;
 a.performCrewAction!('power:sam',{own:[own.id],targets:[first.id,second.id]},s.toolToken!);s=a.getSnapshot();assert.equal(s.crewFeatures!.crew[0].power!.remaining,0);assert(s.crewFeatures!.crew[0].power!.used);assert.equal(s.restored,1);assert.equal(s.tools!.find(t=>t.id==='dual-scanner')!.remaining,1);assert(!s.rooms.flatMap(r=>r.slots).find(c=>c.id===second.id)!.clue);assert.equal(s.effects!.filter(e=>e.kind==='success').length,1);
 a.performCrewAction!('power:sam',{own:[own.id],targets:[first.id,second.id]},before.toolToken!);assert.equal(a.getSnapshot().restored,1);
 }finally{a.dispose();}
});
