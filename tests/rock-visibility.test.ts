import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/game';
import {rocks,rockWalls,rockIsLow,sightObstacles,sightRay,blocked,visibilityBoundary} from '../src/world';
import {TUNING} from '../src/tuning';

test('whole static stones classify sight before collision silhouette splitting',()=>{
 assert.equal(rockIsLow({w:80,h:80}),false);
 assert.equal(rockIsLow({w:120,h:79}),true);
 for(const r of rocks){
  const a={x:r.x-25,y:r.y+r.h*.6},reach=r.w+50,low=rockIsLow(r);
  const pieces=rockWalls.filter(w=>w.x>=r.x&&w.x+w.w<=r.x+r.w&&w.y>=r.y&&w.y+w.h<=r.y+r.h);
  assert.equal(pieces.length,4);assert.ok(pieces.every(w=>w.low===low));
  assert.equal(blocked({x:r.x+r.w/2,y:a.y},1,rockWalls),true);
  assert.equal(sightRay(a,0,reach,sightObstacles(a))>=reach,low);
  const end=visibilityBoundary(a,0,reach,Math.PI/3).find(p=>p.angle===0)!;
  assert.equal(end.x>=a.x+reach-.001,low);
 }
});

test('random small rock loops never acquire tall-wall occlusion from pallet index',()=>{
 for(let seed=1;seed<=32;seed++){
  const m=new Match('survivor',seed),stones=m.terrain.filter(w=>w.kind==='rock');
  assert.equal(stones.length,6);
  for(const stone of stones){assert.ok(Math.min(stone.w,stone.h)<TUNING.darkwoodVision.rockMinSize);assert.equal(stone.low,true);assert.ok(!sightObstacles(stone,m.terrain).includes(stone));assert.equal(blocked({x:stone.x+stone.w/2,y:stone.y+stone.h/2},1,m.terrain),true);}
 }
});
