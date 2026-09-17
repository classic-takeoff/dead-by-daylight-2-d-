import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,CONFIG,EMPTY_INPUT,gateExit} from '../src/game';
import {snapshot,applySnapshot} from '../src/network-state';
function down(){const m=new Match('survivor',42);m.terrain=[];m.survivorAI=()=>{};m.killerAI=()=>{};m.survivors.forEach((s,i)=>Object.assign(s,{life:'down',x:600+i*60,y:650}));return m;}
test('four downed survivors keep playing, crawling and syncing until actual deaths',()=>{
 const m=down();m.step(.1,{...EMPTY_INPUT,dx:1});assert.equal(m.finished,false);assert.ok(m.survivors.every(s=>s.life==='down'));assert.ok(m.player.x>600);assert.ok(m.player.bleed>0);
 const guest=new Match('survivor',42);applySnapshot(guest,snapshot(m));assert.equal(guest.finished,false);assert.ok(guest.survivors.every(s=>s.life==='down'));
 m.survivors.forEach(s=>s.bleed=CONFIG.bleedTime-.01);m.step(.02);assert.ok(m.survivors.every(s=>s.life==='dead'));assert.equal(m.finished,true);
});
test('all-down state still permits open-exit escape and killer pickup',()=>{
 const m=down();m.gates[0].progress=1;m.gates[0].openedAt=-10;Object.assign(m.player,gateExit(m.gates[0]));m.step(.01);assert.equal(m.player.life,'escaped');assert.equal(m.finished,false);
 const s=m.survivors[1];Object.assign(m.killer,{x:s.x-20,y:s.y,angle:0,cooldown:0});m.pickup();assert.equal(s.life,'carried');assert.equal(m.finished,false);
});
