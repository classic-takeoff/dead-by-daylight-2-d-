import {windowSpots as layoutWindows,buildings as layoutBuildings} from '../src/world';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,actorPosition} from '../src/game';
function setup(){const m=new Match('survivor',42);m.terrain=[];m.pallets=[];m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.player,{x:layoutWindows[0].x-30,y:layoutWindows[0].y,level:0});return m;}

test('running pallet drops carry survivors across in either direction and orientation',()=>{
 for(const axis of ['x','y'] as const)for(const sign of [-1,1]){
  const m=setup(),a=m.player,p={id:0,x:650,y:650,axis,state:'up' as const};m.pallets=[p];
  Object.assign(a,{x:axis==='x'?650-sign*30:650,y:axis==='x'?650:650-sign*30,velocity:axis==='x'?{x:sign*112,y:0}:{x:0,y:sign*112},movementAt:m.time});
  const from=actorPosition(a);m.contextualSpace(a);assert.equal(m.pallets[0].state,'down');
  assert.equal(axis==='x'?a.x:a.y,650+sign*36);assert.deepEqual(actorPosition(a),from);
  a.transition=.09;const mid=actorPosition(a);assert.ok(sign*((axis==='x'?mid.x:mid.y)-(axis==='x'?from.x:from.y))>0);
 }
});
test('walking, moving away, stale movement and blocked landings do not cross on drop',()=>{
 for(const mode of ['walk','away','stale','blocked']){
  const m=setup(),a=m.player;m.pallets=[{id:0,x:650,y:650,axis:'x',state:'up'}];
  Object.assign(a,{x:620,y:650,velocity:{x:mode==='walk'?72:mode==='away'?-112:112,y:0},movementAt:mode==='stale'?-1:0});
  if(mode==='blocked')m.terrain=[{x:680,y:635,w:20,h:30,kind:'wall'}];
  m.contextualSpace(a);assert.equal(m.pallets[0].state,'down');assert.ok(a.x<650);assert.equal(a.transition,0);
 }
});

test('fallen pallets use approach speed for fast and quiet slow vaults on both axes',()=>{
 for(const axis of ['x','y'] as const)for(const speed of [0,72,112,-112])for(const crouching of [false,true]){
  const m=setup(),a=m.player;
  m.pallets=[{id:0,x:650,y:650,axis,state:'down',level:0}];
  Object.assign(a,{x:axis==='x'?614:650,y:axis==='x'?650:614,crouching,velocity:axis==='x'?{x:speed,y:0}:{x:0,y:speed},movementAt:0});
  m.contextualSpace(a);
  const fast=speed===112&&!crouching;
  assert.equal(a.vaultKind,'pallet');assert.equal(a.vaultMode,fast?'fast':'slow');
  assert.equal(a.motionDuration,fast?.7:1.5);
  assert.equal(m.traces.some(t=>t.kind==='noise'),fast);
  a.transition=a.motionDuration!/2;
  assert.equal(axis==='x'?actorPosition(a).x:actorPosition(a).y,650);
 }
});
test('actual approach speed selects fast vault; standing and walking select slow vault',()=>{
 for(const speed of [0,72,112]){const m=setup(),a=m.player;Object.assign(a,{velocity:{x:speed,y:0},movementAt:m.time});m.contextualSpace(a);assert.equal(a.vaultKind,'window');assert.equal(a.vaultMode,speed>=100?'fast':'slow');assert.equal(a.motionDuration,speed>=100?.55:1.25);const start=actorPosition(a);assert.equal(start.x,layoutWindows[0].x-30);a.transition=a.motionDuration!/2;assert.ok(actorPosition(a).x>layoutWindows[0].x-30&&actorPosition(a).x<a.x);}
 const m=setup();Object.assign(m.player,{velocity:{x:-112,y:0},movementAt:0});m.contextualSpace(m.player);assert.equal(m.player.vaultMode,'slow');
});
test('one window remains occupied until traversal ends',()=>{
 const m=setup(),a=m.player,b=m.killer;m.contextualSpace(a);Object.assign(b,{x:layoutWindows[0].x+25,y:layoutWindows[0].y,level:0});m.contextualSpace(b);assert.equal(b.transition,0);a.transition=0;a.x=1200;m.contextualSpace(b);assert.equal(b.vaultKind,'window');assert.ok(b.transition>0);
});
test('bodies block movement on the same floor but allow moving away',()=>{
 const m=setup(),a=m.player,b=m.killer;Object.assign(a,{x:600,y:650});Object.assign(b,{x:622,y:650,level:0});m.move(a,1,0,.03,true);assert.equal(a.x,600);m.move(a,-1,0,.03,true);assert.ok(a.x<600);Object.assign(a,{x:600});b.level=1;m.move(a,1,0,.03,true);assert.ok(a.x>600);
});
