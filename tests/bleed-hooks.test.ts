import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,CONFIG} from '../src/game';
import {snapshot,applySnapshot} from '../src/network-state';

function trial(){const m=new Match('killer',42);m.survivorAI=()=>{};m.killerAI=()=>{};return m;}
test('failed healing QTE deducts fifteen points and continues from the remainder',()=>{
 const m=trial();m.playerId=0;m.terrain=[];const healer=m.player,target=m.survivors[1];Object.assign(healer,{x:600,y:650,action:'heal:1',progress:.7});Object.assign(target,{x:620,y:650,life:'down',recover:.7});m.skill={actor:0,value:0,start:.5,end:.7};m.resolveSkill();
 assert.ok(Math.abs(healer.progress-.55)<1e-9);assert.equal(target.recover,healer.progress);healer.cooldown=0;m.work(healer,{kind:'heal',id:1,target,label:''},1.2);assert.ok(Math.abs(healer.progress-.65)<1e-9);
 target.recover=.1;healer.progress=.1;m.skill={actor:0,value:0,start:.5,end:.7};m.resolveSkill();assert.equal(healer.progress,0);assert.equal(target.recover,0);
});
test('all remaining survivors on hooks die together with souls before results',()=>{
 const m=trial();m.survivors.forEach((s,i)=>{s.life='hooked';s.hooks=1;m.hooks[i].occupant=s.id;});
 m.step(.03);assert.ok(m.finished);assert.ok(m.deathAnimating);assert.ok(m.survivors.every(s=>s.life==='dead'&&s.deathAt===m.time));assert.ok(m.hooks.every(h=>h.occupant===null));
 m.step(2.5);assert.equal(m.deathAnimating,false);
});
test('hooked team check ignores dead survivors and keeps a rescuable match alive',()=>{
 const m=trial();m.survivors.slice(0,3).forEach(s=>{s.life='hooked';s.hooks=1;});m.step(.03);assert.equal(m.finished,false);
 m.kill(m.survivors[3]);m.step(.03);assert.ok(m.finished);assert.ok(m.survivors.every(s=>s.life==='dead'));
});
test('bleed budget persists through healing and another hit, pauses off ground, dies at sixty seconds',()=>{
 const m=trial(),s=m.survivors[0],healer=m.survivors[1];m.terrain=[];m.pallets.forEach(p=>p.state='broken');
 Object.assign(s,{x:600,y:650,life:'down'});Object.assign(healer,{x:620,y:650});m.step(20);assert.equal(s.bleed,20);
 m.work(healer,{kind:'heal',id:s.id,target:s,label:''},CONFIG.healTime);assert.equal(s.life,'injured');assert.equal(s.bleed,20);
 m.step(10);assert.equal(s.bleed,20);Object.assign(m.killer,{x:570,y:650,angle:0});s.invulnerable=0;m.attack();assert.equal(s.life,'down');assert.equal(s.bleed,20);
 m.step(39.9);assert.equal(s.life,'down');m.step(.1);assert.equal(s.life,'dead');assert.equal(s.bleed,60);assert.ok(m.deathAnimating);
});
test('gate work removes inherited QTE and never schedules a new one',()=>{
 const m=trial(),s=m.survivors[0],g=m.gates[0];m.terrain=[];Object.assign(s,{x:g.x,y:g.y});m.playerId=0;m.skills[0]={actor:0,value:.9,start:.5,end:.7};m.skillTimers[0]=-1;
 for(let i=0;i<20;i++)m.work(s,{kind:'gate',id:0,target:g,label:''},1);
 assert.equal(g.progress,1);assert.equal(m.skills[0],null);assert.equal(m.events.some(e=>e.type==='skill'||e.type==='fail'),false);
});
test('remaining bleed budget synchronizes to remote players',()=>{
 const m=trial();m.survivors[0].life='down';m.survivors[0].bleed=41;const guest=new Match('survivor',42);applySnapshot(guest,snapshot(m));assert.equal(guest.player.bleed,41);
});
