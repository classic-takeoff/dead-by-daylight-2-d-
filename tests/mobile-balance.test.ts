import {windowSpots as layoutWindows,buildings as layoutBuildings} from '../src/world';
﻿import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,CONFIG,EMPTY_INPUT,terrorStrength,attackRecovery} from '../src/game';
const setup=()=>{const m=new Match('killer');m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.killer,{x:620,y:650,angle:0});m.survivors.forEach((s,i)=>Object.assign(s,{x:1400+i*30,y:1100}));return m;};
test('heartbeat extends to 600 and remains audible between adjacent floors',()=>{
assert.ok(terrorStrength({x:0,y:0},{x:450,y:0})>0);
assert.equal(terrorStrength({x:0,y:0},{x:600,y:0}),0);
assert.ok(terrorStrength({x:0,y:0},{x:150,y:0})>terrorStrength({x:0,y:0},{x:450,y:0}));
assert.ok(terrorStrength({x:0,y:0,level:0},{x:450,y:0,level:1})>0);
assert.equal(CONFIG.killerSpeed,122);assert.equal(CONFIG.survivorSpeed,112);
});
test('full charge releases automatically once; holding through recovery never repeats',()=>{
const m=setup();m.step(1/30,{...EMPTY_INPUT,charging:true,charge:.9});assert.equal(m.killer.attackAt,-10);
m.step(1/30,{...EMPTY_INPUT,charging:true,charge:1});const at=m.killer.attackAt;assert.equal(m.killer.attackCharge,1);assert.ok(m.killer.lunge);
for(let i=0;i<120;i++)m.step(1/30,{...EMPTY_INPUT,charging:true,charge:1});
assert.equal(m.killer.attackAt,at);
m.step(1/30,{...EMPTY_INPUT,attack:true,charge:1});assert.equal(m.killer.attackAt,at);
m.step(1/30,EMPTY_INPUT);m.step(1/30,{...EMPTY_INPUT,attack:true,charge:.1});assert.ok(m.killer.attackAt>at);assert.equal(m.killer.attackCharge,.1);
});
test('recovery scales continuously with held duration for misses and hits',()=>{
for(const hit of [false,true])assert.ok(attackRecovery(.2,hit)<attackRecovery(.6,hit)&&attackRecovery(.6,hit)<attackRecovery(1,hit));
for(const charge of [0,.2,.6,1]){const m=setup();m.attack(charge);assert.equal(m.killer.cooldown,attackRecovery(charge));}
const m=setup();Object.assign(m.survivors[0],{x:650,y:650});m.attack(.2);assert.equal(m.killer.cooldown,attackRecovery(.2,true));
});

test('injured window vault can be grabbed at its animated position; healthy or protected cannot',()=>{
for(const life of ['healthy','injured'] as const){const m=setup(),s=m.survivors[0];Object.assign(s,{x:layoutWindows[0].x-32,y:layoutWindows[0].y,life});m.contextualSpace(s);Object.assign(m.killer,{x:layoutWindows[0].x-60,y:layoutWindows[0].y,angle:0});m.attack(0);assert.equal(m.carried,life==='injured'?s.id:null);if(life==='injured'){assert.equal(s.life,'carried');assert.equal(s.transition,0);}}
const m=setup(),s=m.survivors[0];Object.assign(s,{x:layoutWindows[0].x-32,y:layoutWindows[0].y,life:'injured',invulnerable:5});m.contextualSpace(s);Object.assign(m.killer,{x:layoutWindows[0].x-60,y:layoutWindows[0].y,angle:0});assert.equal(m.grabVault(),false);
});
test('killer landing lock is shorter than survivor and both prevent early movement',()=>{
const m=setup(),k=m.killer,s=m.survivors[0];Object.assign(k,{x:1020,y:690,level:1});Object.assign(s,{x:1020,y:690,level:1});m.traverse(k,{x:1020,y:775,level:0},true);m.traverse(s,{x:1020,y:775,level:0},true);
assert.ok(k.cooldown<s.cooldown);k.transition=0;s.transition=0;const x=s.x;m.move(s,1,0,.1,true);assert.equal(s.x,x);k.cooldown=0;m.move(k,1,0,.1);assert.ok(k.x>1020);
});
