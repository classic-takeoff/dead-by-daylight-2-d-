import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT,gateOpening,gateExit} from '../src/game';
import {blocked} from '../src/world';
function setup(role:'survivor'|'killer'){const m=new Match(role);m.survivorAI=()=>{};m.killerAI=()=>{};m.powered=true;return m;}
test('gate opening clears collision only after animation and survivors must traverse corridor',()=>{
const m=setup('survivor'),g=m.gates[0];Object.assign(m.player,{x:g.x+32,y:710});
m.work(m.player,{kind:'gate',target:g,id:0,label:''},16);
assert.equal(gateOpening(g,m.time),0);assert.ok(blocked(g,10,m.obstacles()));
m.step(.7);assert.equal(gateOpening(g,m.time),.5);assert.ok(blocked(g,10,m.obstacles()));
m.step(.71);assert.equal(blocked(g,10,m.obstacles()),false);
Object.assign(m.player,{x:g.x,y:g.y});m.step(.03);assert.equal(m.player.life,'healthy');
for(let i=0;i<50&&m.player.life!=='escaped';i++)m.step(1/30,{...EMPTY_INPUT,dx:-1,run:true});
assert.equal(m.player.life,'escaped');assert.ok(m.player.escapedAt!==undefined);assert.ok(Math.abs(m.player.x-gateExit(g).x)<18);
});
test('both exits block killer walking and lunging with a barrier event',()=>{
for(const id of [0,1]){const m=setup('killer'),g=m.gates[id],direction=id===0?-1:1;g.progress=1;g.openedAt=-10;Object.assign(m.killer,{x:g.x-direction*24,y:g.y,angle:id===0?Math.PI:0});
for(let i=0;i<15;i++)m.move(m.killer,direction,0,1/30);assert.ok((m.killer.x-g.x)*direction>0);assert.equal(m.events.some(e=>e.type==='barrier'),false);
for(let i=0;i<90;i++)m.move(m.killer,direction,0,1/30);
assert.ok((m.killer.x-gateExit(g).x)*direction<=-10);assert.ok(m.events.some(e=>e.type==='barrier'));
m.attack(1);for(let i=0;i<12;i++)m.step(1/30,{...EMPTY_INPUT,angle:id===0?Math.PI:0});
assert.ok((m.killer.x-gateExit(g).x)*direction<=-10);
}});
test('final escape leaves time for fade before showing result',()=>{
const m=setup('survivor');m.survivors.slice(1).forEach(s=>s.life='dead');m.escape(m.player);m.step(.4);assert.equal(m.finished,false);m.step(.51);assert.equal(m.finished,true);
});
