import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, EMPTY_INPUT, CONFIG } from '../src/game';
import { stairs, drops, blocked, floorOf, findPath } from '../src/world';
import { heartbeatProfile } from '../src/audio';
function quiet(){const m=new Match('killer',()=>.5);m.survivorAI=()=>{};m.killerAI=()=>{};return m;}
test('four down survivors remain alive; last hooked survivor is sacrificed',()=>{
 const m=quiet();m.survivors.forEach(s=>s.life='down');m.step(.03);assert.ok(m.survivors.every(s=>s.life==='down'));assert.equal(m.finished,false);
 const n=quiet();n.survivors.slice(1).forEach(s=>s.life='escaped');n.survivors[0].life='hooked';n.survivors[0].hooks=1;n.hooks[0].occupant=0;n.step(.03);assert.equal(n.survivors[0].life,'dead');assert.equal(n.hooks[0].occupant,null);assert.equal(n.finished,true);
 const p=quiet();p.survivors.slice(0,3).forEach(s=>s.life='down');p.step(.03);assert.equal(p.finished,false);
});
test('both roles see unobstructed forward targets within configured finite distance',()=>{
 const m=quiet();m.terrain=[];for(const a of [m.survivors[0],m.killer]){Object.assign(a,{x:600,y:650,angle:0});assert.equal(m.canSee(a,{x:700,y:650}),true);assert.equal(m.canSee(a,{x:500,y:650}),false);}assert.ok(Number.isFinite(CONFIG.vision)&&Number.isFinite(CONFIG.survivorVision));
});
test('stairs and one-way drop change physical floor, isolate attacks, and retain navigation',()=>{
 const m=quiet(),s=m.survivors[0],k=m.killer;Object.assign(s,stairs[0].bottom);m.contextualSpace(s);assert.equal(floorOf(s),1);assert.ok(s.transition>0);assert.equal(blocked(s,10,m.obstacles()),false);
 Object.assign(k,{x:s.x+20,y:s.y,level:0,angle:Math.PI});m.attack();assert.equal(s.life,'healthy');assert.equal(m.canSee(k,s),false);
 s.cooldown=0;s.transition=0;Object.assign(s,drops[0].top);m.contextualSpace(s);assert.equal(floorOf(s),0);assert.equal(s.action,'落地');assert.equal(blocked(s,10,m.obstacles()),false);
 const path=findPath({x:950,y:820},{x:960,y:550,level:1},m.obstacles());assert.equal(floorOf(path.at(-1)!),1);assert.ok(path.some(p=>floorOf(p)===0));
 Object.assign(k,stairs[0].bottom,{cooldown:0,transition:0});m.navigate(k,{x:960,y:550,level:1},.03);assert.equal(floorOf(k),1);
});
test('hit/miss events distinguish outcomes and pallets block hits',()=>{
 const m=quiet(),k=m.killer,s=m.survivors[0];Object.assign(k,{x:640,y:650,angle:0});Object.assign(s,{x:675,y:650});m.attack();assert.ok(m.events.some(e=>e.type==='hit'));assert.ok(!m.events.some(e=>e.type==='miss'));
 m.events=[];k.cooldown=0;k.angle=Math.PI;m.attack();assert.ok(m.events.some(e=>e.type==='miss'));assert.ok(!m.events.some(e=>e.type==='hit'));
 const p=m.pallets[0];p.state='down';Object.assign(k,{x:p.x,y:p.y-23,angle:Math.PI/2,cooldown:0});Object.assign(s,{x:p.x,y:p.y+23,life:'healthy'});m.attack();assert.equal(s.life,'healthy');
});
test('charging is visible before release, cancels, and vault has interpolated motion state',()=>{
 const m=quiet();m.step(.03,{...EMPTY_INPUT,charging:true,charge:.6});assert.equal(m.killer.charge,.6);m.step(.03);assert.equal(m.killer.charge,0);
 const s=m.survivors[0],p=m.pallets[0];p.state='down';Object.assign(s,{x:p.x,y:p.y-35,cooldown:0});m.contextualSpace(s);assert.ok(s.motionFrom);assert.ok(s.transition>0);assert.equal(s.action,'翻越');
});
test('rescue reveals a fixed location temporarily, never live survivor tracking',()=>{
 const m=quiet(),s=m.survivors[0],r=m.survivors[1];m.carried=s.id;m.hang(m.hooks[0]);Object.assign(r,{x:s.x+20,y:s.y});m.work(r,{kind:'rescue',target:s,id:s.id,label:''},2.5);assert.equal(m.alerts.length,1);const x=m.alerts[0].x;s.x+=80;assert.equal(m.alerts[0].x,x);m.step(8.1);assert.equal(m.alerts.length,0);
});
test('heartbeat gains and tempo clearly increase with danger',()=>{const far=heartbeatProfile(.15),near=heartbeatProfile(.95);assert.ok(near.gain>far.gain*4);assert.ok(near.interval<far.interval*.5);assert.equal(heartbeatProfile(0).gain,0);});
test('survivor can move away while keeping the mouse-facing view on the killer',()=>{
 const m=new Match('survivor',()=>.5);m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.player,{x:650,y:650});m.step(.1,{...EMPTY_INPUT,dx:-1,run:true,angle:.2});assert.ok(m.player.x<650);assert.equal(m.player.angle,.2);
});
test('vertical double-pallet lane seals and vaults along its own axis',()=>{
 const m=quiet(),p=m.pallets.find(p=>p.axis==='x')!,s=m.survivors[0];Object.assign(s,{x:p.x-35,y:p.y,cooldown:0});m.contextualSpace(s);assert.equal(p.state,'down');assert.ok(blocked(p,10,m.obstacles()));s.cooldown=0;m.contextualSpace(s);assert.equal(s.x,p.x+36);assert.equal(blocked(s,10,m.obstacles()),false);
});
test('Shift cannot change killer movement or footstep running state',()=>{
 const m=quiet(),k=m.killer;Object.assign(k,{x:600,y:650});m.move(k,1,0,.1,false);const walk=k.x-600;assert.equal(k.running,false);Object.assign(k,{x:600,y:650});m.move(k,1,0,.1,true);assert.equal(k.x-600,walk);assert.equal(k.running,false);
 const s=m.survivors[0];Object.assign(s,{x:600,y:650});m.move(s,1,0,.1,true);assert.equal(s.running,true);
});

