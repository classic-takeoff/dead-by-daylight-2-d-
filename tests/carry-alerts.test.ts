import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT} from '../src/game';
import {directionTargets} from '../src/direction-alerts';
import {snapshot,applySnapshot} from '../src/network-state';

test('carrying killer can hit another survivor but cannot lunge or hit the carried actor',()=>{
 const m=new Match('killer',42);m.terrain=[];m.pallets.forEach(p=>p.state='broken');
 Object.assign(m.killer,{x:600,y:650,angle:0});m.carried=0;
 Object.assign(m.actors[0],{x:600,y:636,life:'carried'});
 Object.assign(m.actors[1],{x:630,y:650,life:'healthy',invulnerable:0});
 m.attack(1);
 assert.equal(m.actors[1].life,'injured');assert.equal(m.actors[0].life,'carried');assert.equal(m.carried,0);
 assert.equal(m.killer.attackCharge,0);assert.equal(m.killer.lunge,undefined);assert.ok(m.killer.cooldown>0);
 m.attack();assert.equal(m.actors[1].life,'injured');
});

test('holding attack while carrying does not charge, releasing performs a basic attack',()=>{
 const m=new Match('killer',42);m.survivorAI=()=>{};m.carried=0;m.actors[0].life='carried';
 m.step(.03,{...EMPTY_INPUT,charging:true,charge:1});assert.equal(m.killer.charge,0);assert.equal(m.killer.lunge,undefined);
 m.step(.03,{...EMPTY_INPUT,attack:true,charge:1});assert.equal(m.killer.attackCharge,0);assert.ok(m.events.some(e=>e.type==='swing'));
});

test('failed generator calibration reports its location to killer and survives network sync',()=>{
 const m=new Match('survivor',42),g=m.generators[0];m.player.action='repair:0';m.skills[0]={actor:0,value:0,start:.5,end:.7};m.resolveSkill();
 assert.equal(directionTargets(m).some(t=>t.kind==='generator-fail'),false);
 const guest=new Match('killer',42);applySnapshot(guest,snapshot(m));const alert=directionTargets(guest).find(t=>t.kind==='generator-fail');
 assert.ok(alert);assert.equal(alert.x,g.x);assert.equal(alert.y,g.y);assert.equal(alert.bearingOnly,false);
 guest.time+=9;assert.equal(directionTargets(guest).length,0);
});

test('kicking sounds are survivor bearings only, not false repair failure reports',()=>{
 const m=new Match('killer',42),g=m.generators[0];m.emit('stomp','',m.pallets[0]);m.emit('metal-kick','',g);m.explodeGenerator(g,0);
 assert.equal(directionTargets(m).length,0);
 const guest=new Match('survivor',42);applySnapshot(guest,snapshot(m));const targets=directionTargets(guest);
 assert.equal(targets.length,2);assert.ok(targets.every(t=>t.bearingOnly));
 guest.time+=6;assert.equal(directionTargets(guest).length,0);
});
