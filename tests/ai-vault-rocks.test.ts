import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,actorPosition,EMPTY_INPUT} from '../src/game';
import {blocked,dist,lineClear} from '../src/world';
import {snapshot,applySnapshot} from '../src/network-state';

test('AI keeps the full pallet vault pose and interpolated travel under threat on both axes',()=>{
 for(const axis of ['x','y'] as const)for(const speed of [0,112]){
  const m=new Match('killer',42),s=m.survivors[0];m.terrain=[];m.pallets=[{id:0,x:650,y:650,axis,state:'down'}];
  m.survivors.slice(1).forEach((a,i)=>Object.assign(a,{x:1500+i*40,y:1200}));Object.assign(m.killer,{x:600,y:600});
  Object.assign(s,{x:axis==='x'?614:650,y:axis==='x'?650:614,velocity:axis==='x'?{x:speed,y:0}:{x:0,y:speed},movementAt:0});
  const from={x:s.x,y:s.y},target={x:axis==='x'?750:650,y:axis==='x'?650:750};
  m.navigate(s,target,1/60);assert.equal(s.action,'翻越');assert.equal(s.vaultKind,'pallet');assert.equal(s.vaultMode,speed?'fast':'slow');
  const duration=s.transition,remote=new Match('killer',42);let frames=0;
  while(s.transition>1/30){m.step(1/60,{...EMPTY_INPUT,angle:0});frames++;assert.equal(s.action,'翻越');const p=actorPosition(s);assert.ok(dist(p,from)>0&&dist(p,from)<72);applySnapshot(remote,snapshot(m));assert.equal(remote.actors[s.id].action,'翻越');assert.equal(remote.actors[s.id].vaultKind,'pallet');}
  assert.ok(frames>duration*50);m.step(.04);assert.equal(s.transition,0);
 }
});
test('paired rock loops have two distinct small stones, supported pallets and open approaches',()=>{
 for(let seed=1;seed<=32;seed++){
  const m=new Match('killer',seed),stones=m.terrain.filter(w=>w.kind==='rock');assert.equal(stones.length,6,'seed '+seed);
  const pairs=m.pallets.filter(p=>stones.filter(w=>Math.hypot(p.x-Math.max(w.x,Math.min(w.x+w.w,p.x)),p.y-Math.max(w.y,Math.min(w.y+w.h,p.y)))<30).length===2);
  assert.equal(pairs.length,3);assert.ok(stones.every(s=>Math.min(s.w,s.h)>=34&&Math.max(s.w,s.h)<=62));
  for(const p of pairs){const from={x:p.x+(p.axis==='x'?-36:0),y:p.y+(p.axis==='x'?0:-36)},to={x:p.x+(p.axis==='x'?36:0),y:p.y+(p.axis==='x'?0:36)};
   assert.equal(lineClear(from,to,m.obstacles(),11),true);p.state='down';assert.equal(blocked(p,10,m.obstacles()),true);assert.equal(blocked(from,10,m.obstacles()),false);assert.equal(blocked(to,10,m.obstacles()),false);
  }
 }
});
