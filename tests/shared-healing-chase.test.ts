import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,CONFIG,EMPTY_INPUT,healingProgress} from '../src/game';
import {snapshot,applySnapshot} from '../src/network-state';
import {directionTargets} from '../src/direction-alerts';

function setup(){const m=new Match('survivor',42);m.terrain=[];m.survivorAI=()=>{};m.killerAI=()=>{};m.survivors.forEach((s,i)=>Object.assign(s,{x:600+(i%2)*25,y:630+Math.floor(i/2)*25}));Object.assign(m.killer,{x:1500,y:1200});return m;}
test('healers share patient progress and each additional healer adds recovery speed',()=>{
 for(const life of ['injured','down'] as const){
  for(const count of [1,2,3]){
   const m=setup(),patient=m.survivors[3];patient.life=life;
   for(let i=0;i<count;i++)m.work(m.survivors[i],{kind:'heal',id:3,target:patient,label:''},1);
   assert.ok(Math.abs(healingProgress(patient)-count/CONFIG.healTime)<1e-9);
   for(let i=0;i<count;i++)assert.equal(m.survivors[i].progress,healingProgress(patient));
   const remote=new Match('survivor',42);applySnapshot(remote,snapshot(m));
   for(const viewer of [0,1,2]){remote.playerId=viewer;const marker=directionTargets(remote).find(t=>t.kind==='heal'&&t.x===patient.x&&t.y===patient.y);assert.ok(marker&&'progress' in marker);assert.equal(marker.progress,healingProgress(remote.survivors[3]));}
  }
 }
});
test('healing can be handed over, failure reduces the shared progress and completion only changes one health stage',()=>{
 const m=setup(),p=m.survivors[3],a=m.survivors[0],b=m.survivors[1];p.life='down';p.recover=.5;
 m.work(a,{kind:'heal',id:3,target:p,label:''},1.2);a.action='';
 m.work(b,{kind:'heal',id:3,target:p,label:''},1.2);assert.ok(Math.abs(p.recover-.7)<1e-9);
 m.playerId=1;m.skill={actor:1,value:0,start:.5,end:.7};m.resolveSkill();assert.ok(Math.abs(p.recover-.55)<1e-9);
 b.cooldown=0;m.work(b,{kind:'heal',id:3,target:p,label:''},6);assert.equal(p.life,'injured');assert.equal(p.healProgress,0);assert.equal(p.recover,0);
});
test('self recovery does not erase teammate progress above the self-recovery cap',()=>{
 const m=setup(),p=m.player;p.life='down';p.recover=.98;m.work(p,{kind:'recover',id:0,target:p,label:''},.1);assert.equal(p.recover,.98);
});
test('only one survivor is chased, including after a target switch and network synchronization',()=>{
 const m=setup();Object.assign(m.killer,{x:650,y:650,angle:Math.PI});
 for(let i=0;i<3;i++)Object.assign(m.survivors[i],{x:600-i*25,y:650});
 Object.assign(m.survivors[3],{x:1500,y:1200});
 m.humanInputs=new Map([[4,{...EMPTY_INPUT,dx:-1}]]);m.step(.1);
 assert.equal(m.survivors.filter(s=>m.isChasing(s)).length,1);assert.equal(m.chasedSurvivor?.id,0);
 m.playerId=4;Object.assign(m.killer,{x:570,y:650,angle:Math.PI,cooldown:0});Object.assign(m.survivors[0],{x:900,y:650});Object.assign(m.survivors[2],{x:1500,y:1250});Object.assign(m.survivors[1],{x:540,y:650});m.attack(0);m.step(.01);
 assert.equal(m.survivors.filter(s=>m.isChasing(s)).length,1);assert.equal(m.chasedSurvivor?.id,1);
 const remote=new Match('survivor',42);applySnapshot(remote,snapshot(m));assert.equal(remote.chasedSurvivor?.id,1);
 m.survivors[1].life='down';m.humanInputs=new Map();m.killer.attackAt=-10;m.killer.x=1700;m.step(.01);assert.equal(m.survivors.filter(s=>m.isChasing(s)).length,0);
});
