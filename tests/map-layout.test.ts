import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/game';
import {blocked,findPath,dist,genSpots,hookSpots} from '../src/world';
const seeded=(seed:number)=>()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
test('random layouts contain long and short loops, fixed exits, and independent collision geometry',()=>{
 const a=new Match('survivor',seeded(3)),saved=JSON.stringify(a.terrain),b=new Match('survivor',seeded(4)),same=new Match('survivor',seeded(3));
 assert.notEqual(saved,JSON.stringify(b.terrain));assert.equal(saved,JSON.stringify(a.terrain));assert.equal(saved,JSON.stringify(same.terrain));assert.deepEqual(a.gates,b.gates);
 assert.equal(a.pallets.filter(p=>p.loop==='long').length,6);assert.equal(a.pallets.filter(p=>p.loop==='short').length,6);assert.equal(a.pallets.length,23);
});
test('random maps keep spawns, objectives, exits and both pallet approaches reachable',()=>{
 for(let seed=1;seed<=32;seed++){
 const m=new Match('survivor',seeded(seed));assert.equal(m.terrain.length,28,'seed '+seed);
 assert.equal(m.terrain.filter(w=>w.low).length,18,'low fences dominate seed '+seed);
 const points=[...genSpots,...hookSpots,...m.actors,...m.gates.map(g=>({...g,x:g.x+(g.id===0?32:-32)})),...m.pallets.filter(p=>p.loop).flatMap(p=>p.axis==='x'?[{x:p.x-36,y:p.y},{x:p.x+36,y:p.y}]:[{x:p.x,y:p.y-36},{x:p.x,y:p.y+36}])];
 for(const p of points){assert.equal(blocked(p,10,m.obstacles()),false,JSON.stringify({seed,p}));const path=findPath({x:950,y:820},p,m.obstacles());assert.ok(path.length&&dist(path.at(-1)!,p)<=35,JSON.stringify({seed,p}));}
 }
});
