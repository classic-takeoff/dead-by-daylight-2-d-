import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT} from '../src/game';
import {directionTargets} from '../src/direction-alerts';
import {snapshot,applySnapshot} from '../src/network-state';
function setup(){const m=new Match('survivor',42);m.terrain=[];m.pallets.forEach(p=>p.state='broken');m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.survivors[0],{x:600,y:650});Object.assign(m.survivors[1],{x:625,y:650,life:'injured'});return m;}
test('moving teammates cannot be healed and merely trying does not report them',()=>{
 const m=setup(),target=m.survivors[1];target.moving=true;assert.notEqual(m.interaction(m.player)?.kind,'heal');m.work(m.player,{kind:'heal',id:1,target,label:''},2);assert.equal(m.player.progress,0);assert.equal(m.alerts.length,0);
});
test('patient input interrupts before healer completion regardless of player processing order',()=>{
 for(const reverse of [false,true]){const m=setup(),target=m.survivors[1];m.work(m.player,{kind:'heal',id:1,target,label:''},1);m.player.progress=.999;m.skills[0]={actor:0,value:.5,start:.4,end:.6};
 const controls:[number,typeof EMPTY_INPUT][]=[[0,{...EMPTY_INPUT,interact:true}],[1,{...EMPTY_INPUT,dx:1}]];m.humanInputs=new Map(reverse?controls.reverse():controls);m.step(.03);
 assert.equal(target.life,'injured');assert.equal(m.skills[0],null);assert.notEqual(m.player.action,'heal:1');assert.equal(m.alerts.filter(a=>a.type==='heal-interrupt').length,1);
 const killer=new Match('killer',42);applySnapshot(killer,snapshot(m));assert.ok(directionTargets(killer).some(a=>a.kind==='heal-interrupt'));
 m.step(.03);assert.equal(m.alerts.filter(a=>a.type==='heal-interrupt').length,1);}
});
test('crawling patient interrupts treatment as well',()=>{const m=setup(),target=m.survivors[1];target.life='down';m.work(m.player,{kind:'heal',id:1,target,label:''},1);m.move(target,1,0,.03);assert.notEqual(m.player.action,'heal:1');assert.ok(m.alerts.some(a=>a.type==='heal-interrupt'));});
