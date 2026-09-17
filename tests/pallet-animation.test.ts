import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,CONFIG,EMPTY_INPUT} from '../src/game';
import {blocked,floorOf,findPath,dist} from '../src/world';
import {snapshot,applySnapshot} from '../src/network-state';

test('pallet drops become blocking immediately and replicate their state and timestamps',()=>{
 for(const axis of ['x','y'] as const){
  const m=new Match('survivor',42),p=m.pallets.find(p=>p.axis===axis)??m.pallets[0];
  const s=m.player;Object.assign(s,{x:p.x+(axis==='x'?35:0),y:p.y+(axis==='x'?0:35),level:p.level});
  m.time=10;m.contextualSpace(s);assert.equal(p.state,'down');assert.equal(p.droppedAt,10);
  assert.equal(blocked(p,10,m.obstacles()),true);
  const remote=new Match('killer',42);applySnapshot(remote,snapshot(m));assert.equal(remote.pallets[p.id].droppedAt,10);assert.equal(remote.pallets[p.id].dropSide,p.dropSide);
  p.state='broken';p.brokenAt=12;m.time=12;applySnapshot(remote,snapshot(m));assert.equal(remote.pallets[p.id].brokenAt,12);assert.equal(remote.pallets[p.id].state,'broken');
 }
});
test('more ground hooks and all four basement hooks remain reachable across map seeds',()=>{
 for(let seed=1;seed<=24;seed++){
  const m=new Match('killer',seed);assert.equal(m.hooks.filter(h=>floorOf(h)===0).length,11);assert.equal(m.hooks.filter(h=>floorOf(h)===-1).length,4);
  assert.equal(new Set(m.hooks.map(h=>h.id)).size,15);
  for(const h of m.hooks){assert.equal(blocked(h,10,m.obstacles()),false);const path=findPath({x:950,y:820},h,m.obstacles(),m.stairs);assert.ok(path.length&&dist(path.at(-1)!,h)<35,JSON.stringify({seed,h}));}
 }
});
test('human natural and active struggle are shorter while rapid duplicate inputs cannot bypass the interval',()=>{
 for(const active of [false,true]){
  const m=new Match('survivor',42);m.survivorAI=()=>{};m.killerAI=()=>{};m.terrain=[];Object.assign(m.player,{x:620,y:650,life:'down'});Object.assign(m.killer,{x:630,y:650});m.pickup();
  for(let i=0;i<100;i++)if(active)m.contextualSpace(m.player);
  if(active)assert.equal(m.player.struggle,CONFIG.wiggleGain);
  while(m.player.life==='carried'&&m.time<40)m.step(1/60,{...EMPTY_INPUT,space:active});
  assert.equal(m.player.life,'injured');assert.ok(active?m.time>10&&m.time<14:m.time>=32&&m.time<32.1);
 }
});

