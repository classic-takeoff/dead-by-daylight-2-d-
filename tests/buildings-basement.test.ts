import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/game';
import {blocked,dist,findPath,floorOf,walls} from '../src/world';
import {directionTargets} from '../src/direction-alerts';
import {snapshot,applySnapshot} from '../src/network-state';

test('both buildings can host a reproducible basement with four accessible hooks and working stairs',()=>{
 const chosen=new Set<number>();
 for(let seed=1;seed<=32;seed++){
  const m=new Match('killer',seed),b=m.basement;chosen.add(b.building);
  assert.deepEqual(b,new Match('survivor',seed).basement);
  assert.equal(m.hooks.filter(h=>floorOf(h)===-1).length,4);
  for(const p of [b.stair.top,b.stair.bottom,...b.hooks,...b.hooks.map(h=>({...h,y:h.y+16}))]){
   assert.equal(blocked(p,10,m.obstacles()),false,JSON.stringify({seed,p}));
   const path=findPath({x:950,y:820},p,m.obstacles(),m.stairs);
   assert.ok(path.length&&dist(path.at(-1)!,p)<35,JSON.stringify({seed,p}));
  }
  Object.assign(m.killer,b.stair.top);m.contextualSpace(m.killer);assert.equal(m.killer.level,-1);
  Object.assign(m.killer,{transition:0,cooldown:0});m.contextualSpace(m.killer);assert.equal(m.killer.level,0);
  const path=findPath({x:820,y:670,level:1},b.hooks[0],m.obstacles(),m.stairs);
  assert.ok(dist(path.at(-1)!,b.hooks[0])<35);
 }
 assert.equal(chosen.size,2);
});

test('every pallet has terrain on both ends and clear approaches',()=>{
 for(let seed=1;seed<=12;seed++){
  const m=new Match('killer',seed);
  for(const p of m.pallets){
   for(const sign of [-1,1]){
    const end={x:p.x+(p.axis==='x'?0:sign*36),y:p.y+(p.axis==='x'?sign*36:0),level:p.level};
    assert.ok(blocked(end,14,[...m.terrain]),JSON.stringify({seed,p,end}));
    const approach={x:p.x+(p.axis==='x'?sign*36:0),y:p.y+(p.axis==='x'?0:sign*36),level:p.level};
    assert.equal(blocked(approach,10,m.obstacles()),false,JSON.stringify({seed,p,approach}));
   }
  }
 }
});

test('generator completion reports its fixed position once and synchronizes to the killer',()=>{
 const m=new Match('killer',42),g=m.generators[0],a=m.survivors[0];
 Object.assign(a,{x:g.x,y:g.y+32,level:g.level});g.progress=.999;
 const work={kind:'repair' as const,target:g,id:g.id,label:''};
 m.work(a,work,.1);m.work(a,work,.1);
 assert.equal(g.progress,1);assert.equal(m.alerts.filter(a=>a.type==='generator-complete').length,1);
 assert.ok(m.traces.some(t=>t.kind==='noise'&&dist(t,g)===0));
 const remote=new Match('killer',42);applySnapshot(remote,snapshot(m));
 assert.ok(directionTargets(remote).some(t=>t.kind==='generator-complete'&&dist(t,g)===0));
 remote.time=9;assert.ok(!directionTargets(remote).some(t=>t.kind==='generator-complete'));
});
