import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,CONFIG} from '../src/game';
import {activeWork} from '../src/interaction-animation';
test('failed repair explodes and locks that generator for all survivors for three seconds',()=>{
 const m=new Match('survivor',42);m.survivorAI=()=>{};m.killerAI=()=>{};m.terrain=[];const g=m.generators[0];Object.assign(g,{x:650,y:650,level:0,progress:.5});const job={kind:'repair' as const,target:g,id:0,label:''};
 for(const s of m.survivors){Object.assign(s,{x:620,y:650,level:0,action:'repair:0',workAt:m.time});}
 m.skill={actor:0,value:0,start:.5,end:.7};m.resolveSkill();assert.equal(g.progress,.42);assert.equal(g.blockedUntil,m.time+CONFIG.repairLockTime);assert.equal(m.events.filter(e=>e.type==='generator-blast').length,1);
 for(const s of m.survivors){s.cooldown=0;assert.equal(activeWork(m,s),null);m.work(s,job,1);assert.equal(g.progress,.42);}
 m.step(2.9);m.work(m.survivors[1],job,.1);assert.equal(g.progress,.42);m.step(.11);m.work(m.survivors[1],job,.1);assert.ok(g.progress>.42);
});
test('killer generator destruction produces one explosion and starts regression',()=>{
 const m=new Match('killer',42);m.terrain=[];const g=m.generators[0];Object.assign(g,{x:650,y:650,level:0,progress:.5});Object.assign(m.killer,{x:620,y:650,level:0});
 m.work(m.killer,{kind:'kick',target:g,id:0,label:''},1.81);assert.equal(g.progress,.45);assert.equal(g.regressing,true);assert.equal(m.events.filter(e=>e.type==='generator-blast').length,1);
});
test('repair lock does not stop repairing other generators or change healing failure',()=>{
 const m=new Match('survivor',42);m.terrain=[];const g=m.generators[1];Object.assign(g,{x:650,y:650,level:0,progress:.2});Object.assign(m.player,{x:620,y:650,level:0});m.generators[0].blockedUntil=m.time+3;m.work(m.player,{kind:'repair',target:g,id:1,label:''},.1);assert.ok(g.progress>.2);
 m.player.action='heal:1';m.skill={actor:0,value:0,start:.5,end:.7};m.resolveSkill();assert.equal(m.events.some(e=>e.type==='generator-blast'),false);
});
