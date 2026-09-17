import {windowSpots as layoutWindows,buildings as layoutBuildings} from '../src/world';
﻿import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT,CONFIG} from '../src/game';
function setup(){const m=new Match('killer',()=>.5);m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.killer,{x:620,y:650,angle:0});m.survivors.forEach((s,i)=>Object.assign(s,{x:1500+i*35,y:1100}));return m;}
test('narrow attack rejects side targets and hits only the first survivor',()=>{
 const m=setup();Object.assign(m.survivors[0],{x:650,y:670});m.attack();assert.equal(m.killer.stats.hits,0);assert.equal(CONFIG.attackHalfAngle,Math.PI/10);
 const n=setup();Object.assign(n.survivors[0],{x:648,y:650});Object.assign(n.survivors[1],{x:661,y:650});n.attack(1);for(let i=0;i<15;i++)n.step(1/30);assert.equal(n.killer.stats.hits,1);assert.equal(n.survivors[0].life,'injured');assert.equal(n.survivors[1].life,'healthy');
});
test('standing survivor can be stabbed across window; crouched survivor is protected by sill',()=>{
 for(const crouch of [false,true]){
 const m=setup();m.playerId=0;const s=m.player;Object.assign(m.killer,{x:layoutWindows[0].x-30,y:layoutWindows[0].y,angle:0});Object.assign(s,{x:layoutWindows[0].x+20,y:layoutWindows[0].y,crouching:crouch,angle:Math.PI});m.attack(1);
 for(let i=0;i<15;i++)m.step(1/30,{...EMPTY_INPUT,crouch,angle:Math.PI});
 assert.equal(s.life,crouch?'healthy':'injured');assert.equal(m.events.filter(e=>e.type==='weapon-block').length,crouch?1:0);
 }
});
test('wall contact consumes swing and emits obstacle feedback once',()=>{
 const m=setup();Object.assign(m.killer,{x:740,y:550,angle:0});Object.assign(m.survivors[0],{x:790,y:550});m.attack(1);for(let i=0;i<15;i++)m.step(1/30);
 assert.equal(m.killer.stats.hits,0);assert.equal(m.events.filter(e=>e.type==='weapon-block').length,1);assert.equal(m.events.filter(e=>e.type==='miss').length,0);
});
