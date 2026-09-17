import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,CONFIG,EMPTY_INPUT} from '../src/game';
const quiet=(role:'killer'|'survivor')=>{const m=new Match(role,42);m.terrain=[];m.killerAI=()=>{};m.survivorAI=()=>{};return m;};
test('rescue finishes at 1.5 seconds, not before',()=>{
const m=quiet('survivor'),s=m.survivors[1],p=m.player;Object.assign(s,{x:650,y:650,life:'hooked',hooks:1});Object.assign(p,{x:625,y:650});const job={kind:'rescue' as const,target:s,id:1,label:''};
m.work(p,job,1.4);assert.equal(s.life,'hooked');m.work(p,job,.11);assert.equal(s.life,'injured');assert.equal(p.stats.rescues,1);
});
test('hook stage lasts 60 seconds and both stages preserve their timers',()=>{
const m=quiet('killer'),s=m.survivors[0];s.life='hooked';s.hooks=1;m.step(45);assert.equal(s.hooks,1);m.step(15);assert.equal(s.hooks,2);m.step(59);assert.equal(s.life,'hooked');m.step(1);assert.equal(s.life,'dead');
});
test('rapid wiggle cannot skip carry duration, rhythmic input still speeds escape',()=>{
const m=quiet('survivor'),p=m.player;Object.assign(p,{x:620,y:650,life:'down'});Object.assign(m.killer,{x:630,y:650});m.pickup();
for(let i=0;i<100;i++)m.contextualSpace(p);assert.equal(p.struggle,CONFIG.wiggleGain);
for(let i=0;i<12*30;i++)m.step(1/30,{...EMPTY_INPUT,space:true});assert.equal(p.life,'carried');
for(let i=0;i<5*30&&p.life==='carried';i++)m.step(1/30,{...EMPTY_INPUT,space:true});assert.equal(p.life,'injured');assert.ok(m.time<CONFIG.carryPlayerTime);
});
test('AI carried survivor escapes at the configured shorter carry duration',()=>{
const m=quiet('killer'),s=m.survivors[0];Object.assign(s,{x:620,y:650,life:'down'});Object.assign(m.killer,{x:630,y:650});m.pickup();m.step(CONFIG.carryAITime-.1);assert.equal(s.life,'carried');m.step(.11);assert.equal(s.life,'injured');
});
