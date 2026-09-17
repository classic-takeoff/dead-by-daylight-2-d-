import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT} from '../src/game';
import {blocked,dist} from '../src/world';
test('every survivor spawns at least 750 units from the killer on seeded maps',()=>{
 for(let seed=0;seed<64;seed++)for(const role of ['survivor','killer'] as const){const m=new Match(role,seed);
  for(const s of m.survivors){assert.ok(dist(s,m.killer)>=750);assert.equal(blocked(s,10,m.obstacles()),false);}
  assert.equal(blocked(m.killer,10,m.obstacles()),false);
 }
});
test('approaching injured teammates cannot steal an active repair interaction',()=>{
 const m=new Match('survivor',42),p=m.player,g=m.generators[0],ally=m.survivors[1];m.terrain=[];m.survivorAI=()=>{};m.killerAI=()=>{};
 Object.assign(p,{x:600,y:650,level:0});Object.assign(g,{x:630,y:650,level:0});
 m.step(.03,{...EMPTY_INPUT,interact:true});const before=g.progress;assert.equal(p.action,'repair:0');
 Object.assign(ally,{x:600,y:674,level:0,life:'injured'});
 for(let i=0;i<20;i++){assert.equal(m.interaction(p)?.kind,'repair');m.step(.03,{...EMPTY_INPUT,interact:true});}
 assert.ok(g.progress>before);assert.equal(p.action,'repair:0');
 m.step(.03);assert.equal(m.interaction(p)?.kind,'heal');
});
