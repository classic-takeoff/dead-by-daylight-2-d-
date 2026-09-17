import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/game';
import {buildings,walls,lineClear,floorOf} from '../src/world';
const b=buildings[0],interior=(p:{x:number;y:number;level?:number})=>floorOf(p)===0&&p.x>b.x+26&&p.x<b.x+b.w-26&&p.y>b.y+26&&p.y<b.y+b.h-26;
test('white shack interior contains only optional generator and basement entrance',()=>{
 let generators=0,basements=0;
 for(let seed=1;seed<=64;seed++){
  const m=new Match('survivor',seed);assert.equal([...walls,...m.terrain].filter(w=>interior(w)).length,0);
  assert.equal(m.hooks.filter(interior).length,0);assert.equal(m.lockers.filter(interior).length,0);assert.equal(m.pallets.filter(interior).length,0);
  const count=m.generators.filter(interior).length;assert.ok(count<=1);generators+=count;basements+=Number(m.basement.building===0);
  assert.equal(m.generators.length,7);assert.equal(m.basement.hooks.length,4);
 }
 assert.ok(generators>0&&generators<64);assert.ok(basements>0&&basements<64);
});
test('two opposite shack doors sit near corners and preserve traversable approaches',()=>{
 const m=new Match('survivor',42);
 assert.ok(lineClear({x:330,y:38},{x:330,y:110},m.obstacles(),11));
 assert.ok(lineClear({x:590,y:300},{x:590,y:390},m.obstacles(),11));
 assert.equal(lineClear({x:470,y:300},{x:470,y:390},m.obstacles(),11),false);
});
