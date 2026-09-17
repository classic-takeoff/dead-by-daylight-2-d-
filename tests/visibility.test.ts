import {windowSpots as layoutWindows,buildings as layoutBuildings} from '../src/world';
﻿import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,CONFIG} from '../src/game';
import {blocked,sightHit,sightObstacles,sightRay,visibilityBoundary} from '../src/world';

test('low walls remain transparent even for crouched survivors inside the near circle',()=>{
 const m=new Match('killer',42),k=m.killer,s=m.survivors[0];
 m.terrain=[{x:640,y:620,w:8,h:60,kind:'wall',low:true}];
 Object.assign(k,{x:632,y:650,level:0,angle:0});
 Object.assign(s,{x:656,y:650,level:0,crouching:false});
 assert.equal(m.canSee(k,s),true);
 s.crouching=true;assert.equal(m.canSee(k,s),true);
 s.y=750;k.angle=Math.atan2(100,24);assert.equal(m.canSee(k,s),true);
 s.y=650;s.crouching=false;assert.equal(m.canSee(k,s),true);
});

test('both roles have a forward cone, a near awareness circle and finite range',()=>{
 const m=new Match('survivor',42);m.terrain=[];
 for(const actor of [m.player,m.killer]){
  Object.assign(actor,{x:600,y:650,level:0,angle:0});
  assert.equal(m.canSee(actor,{x:700,y:650}),true);assert.equal(m.canSee(actor,{x:500,y:650}),false);
  assert.equal(m.canSee(actor,{x:580,y:650}),true);assert.equal(m.canSee(actor,{x:1600,y:650}),false);
  actor.angle=Math.PI;assert.equal(m.canSee(actor,{x:500,y:650}),true);
  actor.angle=0;const half=actor.role==='killer'?CONFIG.killerHalfAngle:CONFIG.survivorHalfAngle;
  for(const side of [-1,1])for(const delta of [-.01,.01]){const angle=side*(half+delta);assert.equal(m.canSee(actor,{x:600+100*Math.cos(angle),y:650+100*Math.sin(angle)}),delta<0);}
 }
});

test('low fences allow sight but retain physical collision',()=>{
 const m=new Match('survivor',42);m.terrain=[{x:640,y:630,w:20,h:40,kind:'junk',low:true}];
 for(const a of [m.player,m.killer]){
  Object.assign(a,{x:600,y:650,level:0,angle:0});
  assert.equal(m.canSee(a,{x:700,y:650}),true);
  assert.equal(blocked({x:650,y:650},10,m.obstacles()),true);
 }
});
test('high cabin walls occlude both geometry and survivor sight while open windows transmit it',()=>{
const m=new Match('survivor',42);m.terrain=[];const p=m.player;Object.assign(p,{x:740,y:610,level:0,crouching:true,angle:0});
const ob=sightObstacles(p,m.obstacles(false,false));assert.equal(sightRay(p,0,380,ob),20);assert.equal(m.canSee(p,{x:800,y:610}),false);
Object.assign(p,{x:layoutWindows[0].x-30,y:layoutWindows[0].y,angle:0,crouching:false});const inside=sightObstacles(p,m.obstacles(false,false));assert.ok(sightRay(p,0,100,inside)>=100);assert.ok(sightRay(p,.8,100,inside)<60);assert.equal(m.canSee(p,{x:layoutWindows[0].x+40,y:layoutWindows[0].y}),true);assert.equal(m.canSee(p,{x:layoutWindows[0].x+40,y:layoutWindows[0].y+100}),false);
});
test('visibility boundary follows aim and never leaks behind a nearby wall',()=>{
const m=new Match('survivor',42);m.terrain=[];Object.assign(m.player,{x:740,y:610,level:0,angle:0});const boundary=visibilityBoundary(m.player,0,CONFIG.survivorVision,Math.PI/3,m.obstacles(false,false));
const east=boundary.find(p=>Math.abs(p.angle)<1e-8)!;assert.equal(east.x,layoutBuildings[1].x+25);const west=boundary.find(p=>Math.abs(p.angle-Math.PI)<1e-8)!;assert.ok(Math.abs(west.x-740)<.001);
});

test('ray reports the front face of the nearest high obstacle',()=>{
const a={x:0,y:0},front={x:20,y:-10,w:16,h:20,kind:'wall' as const},behind={x:60,y:-10,w:16,h:20,kind:'junk' as const};
for(const obstacles of [[front,behind],[behind,front]]){const hit=sightHit(a,0,100,obstacles);assert.equal(hit.blocker,front);assert.equal(hit.distance,20);assert.equal(hit.exit,36);}
});

test('both roles retain close rear awareness but conceal distant rear space',()=>{
 const m=new Match('survivor',42);m.terrain=[];
 for(const a of [m.player,m.killer]){
  Object.assign(a,{x:600,y:650,level:0,angle:0});
  assert.equal(m.canSee(a,{x:580,y:650}),true);
  assert.equal(m.canSee(a,{x:500,y:650}),false);
  assert.equal(m.canSee(a,{x:620,y:650}),true);
 }
});

test('high walls conceal actors while trees retain the existing transparent-sight rule',()=>{
 const m=new Match('survivor',42);m.terrain=[];
 const a=m.player;Object.assign(a,{x:600,y:650,level:0,angle:0});
 Object.assign(m.generators[0],{x:650,y:650,level:0});
 assert.equal(m.canSee(a,{x:700,y:650}),true);
 m.terrain=[{x:640,y:630,w:20,h:40,kind:'tree'}];
 assert.equal(m.canSee(a,{x:700,y:650}),true);
 assert.equal(visibilityBoundary(a,0,100,CONFIG.survivorHalfAngle,m.obstacles(false,false)).find(p=>p.angle===0)!.x,700);
 for(const kind of ['wall','junk'] as const){
  m.terrain=[{x:640,y:630,w:20,h:40,kind}];
  assert.equal(m.canSee(a,{x:650,y:650}),false);
  assert.equal(m.canSee(a,{x:700,y:650}),false);
  const boundary=visibilityBoundary(a,0,100,CONFIG.survivorHalfAngle,m.obstacles(false,false));
  assert.equal(boundary.find(p=>p.angle===0)!.x,660);
 }
});

