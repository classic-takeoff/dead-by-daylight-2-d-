import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, EMPTY_INPUT } from '../src/game';
import { blocked } from '../src/world';
import { LUNGE, attackPose, wipePose } from '../src/attack-animation';
function match(){const m=new Match('killer',()=>.5);m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.killer,{x:600,y:650,angle:0});m.survivors.forEach((s,i)=>Object.assign(s,{x:1000+i*50,y:850}));return m;}
test('a landed hit keeps the killer wiping and prevents another attack past the old recovery',()=>{
 const m=match(),k=m.killer,s=m.survivors[0];Object.assign(s,{x:640,y:650});m.attack(0);
 assert.equal(k.cooldown,3.2);assert.equal(k.wipeUntil,3.2);
 m.step(2);m.attack(0);assert.equal(k.stats.hits,1);assert.ok(k.cooldown>1);
 assert.ok(wipePose(.5).lift>0);assert.equal(wipePose(1).lift,0);
 m.step(1.21);m.attack(0);assert.equal(k.stats.hits,2);
});
test('lunge moves across frames, hits during contact once, and recovers without teleporting',()=>{
 const m=match(),k=m.killer,s=m.survivors[0];Object.assign(s,{x:665,y:650});m.attack(.8);assert.equal(k.x,600);assert.equal(s.life,'healthy');
 m.step(LUNGE.windup/2,{...EMPTY_INPUT,angle:Math.PI});assert.equal(k.x,600);assert.equal(s.life,'healthy');
 m.step(LUNGE.contact,{...EMPTY_INPUT,angle:Math.PI});assert.ok(k.x>600&&k.x<600+LUNGE.distance);assert.equal(s.life,'injured');assert.equal(k.angle,0);
 for(let i=0;i<12;i++)m.step(.03);assert.ok(Math.abs(k.x-600-LUNGE.distance)<.001);assert.equal(k.stats.hits,1);assert.equal(s.life,'injured');assert.equal(k.lunge,undefined);assert.ok(k.cooldown>0);
});
test('lunge respects walls and a stun interrupts its remaining movement and damage',()=>{
 const m=match(),k=m.killer;Object.assign(k,{x:740,y:550});Object.assign(m.survivors[0],{x:790,y:550});m.attack(.8);for(let i=0;i<15;i++)m.step(.03);assert.equal(blocked(k,10,m.obstacles()),false);assert.equal(m.survivors[0].life,'healthy');
 const n=match();n.attack(.8);n.step(.1);const x=n.killer.x;n.killer.action='眩晕';n.killer.cooldown=2;n.step(.1);assert.equal(n.killer.x,x);assert.equal(n.killer.lunge,undefined);
});
test('miss waits for the visible thrust; recovery returns weapon and body to rest',()=>{
 const m=match();m.attack(.8);assert.ok(!m.events.some(e=>e.type==='miss'));for(let i=0;i<11;i++)m.step(.03);assert.equal(m.events.filter(e=>e.type==='miss').length,1);
 const ready=attackPose(1,-1,true),thrust=attackPose(0,.2,true),rest=attackPose(0,-1,true),end=attackPose(0,LUNGE.recovery,true);assert.ok(thrust.reach-ready.reach>60);assert.ok(thrust.lean>ready.lean);assert.deepEqual(end,rest);
});
test('killer breaks an intervening pallet instead of repeatedly swinging through it',()=>{
 const m=new Match('killer',()=>.5),p=m.pallets[0];p.state='down';m.survivors.slice(1).forEach(s=>Object.assign(s,{x:1700,y:1200}));Object.assign(m.killer,{x:p.x,y:p.y-23,angle:Math.PI/2});Object.assign(m.survivors[0],{x:p.x,y:p.y+23});m.killerAI(.1);assert.equal(m.killer.action,`break:${p.id}`);assert.ok(m.killer.progress>0);assert.equal(m.killer.stats.hits,0);
});
