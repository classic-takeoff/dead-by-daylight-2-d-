import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT} from '../src/game';
import {cleanInput,snapshot,applySnapshot,pack,unpack,forfeit} from '../src/network-state';

test('separate human controls move separate actors and leave only unclaimed seats to AI',()=>{
 const m=new Match('survivor',42);m.terrain=[];const bots:number[]=[];m.survivorAI=s=>{bots.push(s.id);};m.killerAI=()=>{bots.push(4);};
 Object.assign(m.actors[0],{x:600,y:650});Object.assign(m.actors[1],{x:650,y:700});
 m.humanInputs=new Map([[0,{...EMPTY_INPUT,dx:1}],[1,{...EMPTY_INPUT,dy:-1}],[4,{...EMPTY_INPUT}]]);m.step(.1);
 assert.equal(m.actors[0].x,607.2);assert.equal(m.actors[1].y,692.8);assert.deepEqual(bots,[2,3]);assert.equal(m.playerId,0);
});
test('two people can repair and receive independent calibration checks',()=>{
 const m=new Match('survivor',42);m.terrain=[];m.survivorAI=()=>{};m.killerAI=()=>{};
 Object.assign(m.generators[0],{x:650,y:650,level:0});Object.assign(m.actors[0],{x:620,y:650,level:0});Object.assign(m.actors[1],{x:680,y:650,level:0});
 m.skillTimers={0:.01,1:.01};m.humanInputs=new Map([[0,{...EMPTY_INPUT,interact:true}],[1,{...EMPTY_INPUT,interact:true}]]);m.step(.03);
 assert.equal(m.skills[0]?.actor,0);assert.equal(m.skills[1]?.actor,1);m.skills[0]!.value=m.skills[0]!.start;
 m.humanInputs.set(0,{...EMPTY_INPUT,space:true,interact:true});m.step(.03);assert.equal(m.skills[0],null);assert.equal(m.skills[1]?.actor,1);
});
test('compressed snapshots fit GameHub packets and preserve local identity',async()=>{
 const host=new Match('killer',42),guest=new Match('survivor',42);guest.playerId=2;
 host.traces=Array.from({length:60},(_,i)=>({x:200+i*3,y:650,kind:'scratch' as const,angle:i,until:30}));host.time=15;host.generators[0].progress=.6;
 const data=await pack(snapshot(host));assert.ok(data.length<7700);applySnapshot(guest,await unpack(data));
 assert.equal(guest.playerId,2);assert.equal(guest.selectedRole,'survivor');assert.equal(guest.time,15);assert.equal(guest.generators[0].progress,.6);
});
test('host departure makes the host faction lose regardless of individual escape status',()=>{
 for(const role of ['survivor','killer'] as const){const m=new Match(role,42);m.survivors[0].life='escaped';forfeit(m,role);
 assert.equal(m.finished,true);assert.equal(m.forfeitRole,role);assert.ok(m.survivors.every(s=>s.life===(role==='killer'?'escaped':'dead')));}
});
test('remote controls reject nonfinite movement and nonboolean action values',()=>{
 const i=cleanInput({dx:999,dy:NaN,angle:Infinity,charge:-4,attack:'yes',run:true});assert.equal(i.dx,1);assert.equal(i.dy,0);assert.equal(i.angle,0);assert.equal(i.charge,0);assert.equal(i.attack,false);assert.equal(i.run,true);
});
