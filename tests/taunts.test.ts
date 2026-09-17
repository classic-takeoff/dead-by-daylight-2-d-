import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT} from '../src/game';
import {cleanInput,snapshot,applySnapshot} from '../src/network-state';
import {directionTargets} from '../src/direction-alerts';
import {TAUNTS,tauntGain,tauntSector} from '../src/sound effect/taunts';
test('taunt inputs, radial selection, hearing range and multiplayer snapshots',()=>{
for(const invalid of [-1,7,1.5,NaN,Infinity,'0',null])assert.equal(cleanInput({taunt:invalid}).taunt,undefined);
for(let i=0;i<7;i++)assert.equal(cleanInput({taunt:i}).taunt,i);
assert.equal(tauntSector(0,0),-1);assert.equal(tauntSector(200,0),-1);
for(let i=0;i<7;i++){const a=-Math.PI/2+i*Math.PI*2/7;assert.equal(tauntSector(Math.cos(a)*90,Math.sin(a)*90),i);}
assert.equal(tauntGain({x:0,y:0},{x:700,y:0}),0);
assert.ok(tauntGain({x:0,y:0},{x:100,y:0})>tauntGain({x:0,y:0},{x:300,y:0}));
assert.ok(tauntGain({x:0,y:0},{x:100,y:0,level:1})<tauntGain({x:0,y:0},{x:100,y:0}));
const m=new Match('killer',42);m.events=[];Object.assign(m.killer,{x:500,y:500});Object.assign(m.actors[0],{x:600,y:500,level:1,name:'语音玩家'});
m.humanInputs=new Map([[0,{...EMPTY_INPUT,taunt:0}],[4,{...EMPTY_INPUT}]]);m.step(1/30);
assert.equal(m.events.filter(e=>e.type==='taunt:0:0').length,1);assert.equal(directionTargets(m).find(t=>t.kind==='taunt').label,'语音玩家 正在嘲讽');
const replica=new Match('killer',42);applySnapshot(replica,snapshot(m));assert.equal(directionTargets(replica).find(t=>t.kind==='taunt').level,1);assert.ok(replica.events.some(e=>e.type==='taunt:0:0'));
m.step(1/30);assert.equal(m.events.filter(e=>e.type.startsWith('taunt:')).length,1);
Object.assign(m.actors[1],{x:1900,y:1400});m.playTaunt(m.actors[1],3);assert.equal(directionTargets(m).filter(a=>a.kind==='taunt').length,1);
Object.assign(m.actors[1],{x:550,y:500});assert.equal(directionTargets(m).filter(a=>a.kind==='taunt').length,2);
m.actors[2].life='dead';m.playTaunt(m.actors[2],2);assert.equal(m.events.filter(e=>e.type.startsWith('taunt:')).length,2);
m.playerId=0;assert.equal(directionTargets(m).filter(t=>t.kind==='taunt').length,0);


});
