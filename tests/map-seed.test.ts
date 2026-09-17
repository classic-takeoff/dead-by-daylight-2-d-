import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/game';
import {freshMapSeed,seededRandom,seedLabel} from '../src/map-seed';
const layout=(m:Match)=>({terrain:m.terrain,pallets:m.pallets,generators:m.generators,hooks:m.hooks,starts:m.actors.map(a=>({x:a.x,y:a.y})),gates:m.gates});
test('explicit map seed reproduces complete layout across roles and intervening games',()=>{
const a=new Match('survivor',12345678),snapshot=layout(a);new Match('killer',987654321);const b=new Match('killer',12345678);
assert.deepEqual(layout(b),snapshot);assert.equal(a.mapSeed,12345678);assert.equal(a.seedLabel,seedLabel(12345678));assert.notDeepEqual(layout(new Match('survivor',12345679)),snapshot);
});
test('new games use new seeds and layouts, while seeded PRNG is reproducible',()=>{
const a=new Match('survivor'),b=new Match('survivor');assert.notEqual(a.mapSeed,b.mapSeed);assert.notDeepEqual(a.terrain,b.terrain);assert.deepEqual(a.gates,b.gates);
const x=seededRandom(0),y=seededRandom(0);for(let i=0;i<20;i++)assert.equal(x(),y());assert.notEqual(freshMapSeed(),freshMapSeed());
});
