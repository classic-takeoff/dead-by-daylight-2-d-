import {windowSpots as layoutWindows,buildings as layoutBuildings} from '../src/world';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, CONFIG, EMPTY_INPUT, gateExit } from '../src/game';
import { blocked, findPath, genSpots, hookSpots, lineClear } from '../src/world';
function quiet(m:Match){m.survivorAI=()=>{};m.killerAI=()=>{};return m;}
function tick(m:Match,seconds:number){for(let t=0;t<seconds;t+=1/30)m.step(1/30);}
test('five generators power gates, opening a gate starts collapse and escaping resolves survivor',()=>{
 const m=quiet(new Match('survivor'));m.generators.slice(0,4).forEach(g=>g.progress=1);m.step(.03);assert.equal(m.powered,false);m.generators[4].progress=1;m.step(.03);assert.equal(m.powered,true);
 const p=m.player,g=m.gates[0];p.x=g.x+45;p.y=g.y;for(let n=0;n<CONFIG.gateTime*30+1;n++)m.work(p,{kind:'gate',target:g,id:0,label:''},1/30);
 assert.equal(g.progress,1);assert.ok(m.endgame>0);p.x=gateExit(g).x;p.y=g.y;m.step(1.5);assert.equal(p.life,'escaped');
});
test('two hits cause down; cooldown prevents repeated hit; pickup, hook, rescue and third hook',()=>{
 const m=quiet(new Match('killer',42)),s=m.survivors[0],k=m.killer;m.terrain=[];Object.assign(m.hooks[0],{x:650,y:750,level:0});s.x=650;s.y=650;k.x=620;k.y=650;k.angle=0;m.attack();assert.equal(s.life,'injured');m.attack();assert.equal(s.life,'injured');k.cooldown=0;m.attack();assert.equal(s.life,'down');k.cooldown=0;m.pickup();assert.equal(s.life,'carried');
 m.hang(m.hooks[0]);assert.equal(s.life,'hooked');assert.equal(s.hooks,1);const rescuer=m.survivors[1];rescuer.x=s.x;rescuer.y=s.y+25;m.work(rescuer,{kind:'rescue',target:s,id:s.id,label:''},2.5);assert.equal(s.life,'injured');assert.ok(s.invulnerable>0);
 s.hooks=2;s.life='carried';m.carried=s.id;m.hang(m.hooks[0]);assert.equal(s.life,'dead');assert.equal(m.hooks[0].occupant,null);
});
test('hook phases, bleedout and collapse end the match',()=>{
 const m=quiet(new Match('killer'));const s=m.survivors[0];s.life='hooked';s.hooks=1;tick(m,CONFIG.hookPhase+.1);assert.equal(s.hooks,2);tick(m,CONFIG.hookPhase+.1);assert.equal(s.life,'dead');m.survivors[1].life='down';m.survivors[1].bleed=CONFIG.bleedTime;m.step(.1);assert.equal(m.survivors[1].life,'dead');m.endgame=.01;m.step(.1);assert.equal(m.finished,true);
});
test('hatch opens for final survivor and killer closing it powers gates',()=>{
 const m=quiet(new Match('killer'));m.survivors.slice(1).forEach(s=>s.life='dead');m.step(.03);assert.equal(m.hatch.open,true);m.killer.x=m.hatch.x;m.killer.y=m.hatch.y;m.work(m.killer,{kind:'hatch',target:m.hatch,id:0,label:''},.03);assert.equal(m.hatch.closed,true);assert.equal(m.powered,true);assert.ok(m.endgame>0);
});
test('skill check success and failure have distinct progress outcomes',()=>{
 const m=quiet(new Match('survivor'));m.player.action='repair:0';m.generators[0].progress=.5;m.skill={actor:0,value:.6,start:.5,end:.7};m.resolveSkill();assert.equal(m.generators[0].progress,.5);m.skill={actor:0,value:.2,start:.5,end:.7};m.resolveSkill();assert.equal(m.generators[0].progress,.42);assert.ok(m.traces.some(t=>t.kind==='noise'));
});
test('recovery caps below completion and another survivor can pick up recovery',()=>{
 const m=quiet(new Match('survivor'));m.player.life='down';m.work(m.player,{kind:'recover',target:m.player,id:0,label:''},60);assert.equal(m.player.recover,.95);assert.equal(m.player.life,'down');m.survivors[1].x=m.player.x+20;m.survivors[1].y=m.player.y;m.work(m.survivors[1],{kind:'heal',target:m.player,id:0,label:''},1);assert.equal(m.player.life,'injured');
});
test('pallet stun, destruction, window traversal and collision',()=>{
 const m=quiet(new Match('survivor')),p=m.pallets[0];Object.assign(m.player,{x:p.x,y:p.y+35});Object.assign(m.killer,{x:p.x,y:p.y-35});m.contextualSpace(m.player);assert.equal(p.state,'down');assert.ok(m.killer.cooldown>0);assert.ok(blocked(p,10,m.obstacles()));m.killer.cooldown=0;m.work(m.killer,{kind:'break',target:p,id:p.id,label:''},2.5);assert.equal(p.state,'broken');
 Object.assign(m.player,{x:layoutWindows[0].x-32,y:layoutWindows[0].y,cooldown:0});m.contextualSpace(m.player);assert.equal(m.player.x,layoutWindows[0].x+32);assert.equal(m.player.action,'翻越');assert.equal(lineClear({x:740,y:550},{x:800,y:550}),false);
});
test('walls obstruct attacks and sight while the rear view is limited',()=>{
 const m=quiet(new Match('killer'));Object.assign(m.killer,{x:740,y:550,angle:0});Object.assign(m.survivors[0],{x:790,y:550});assert.equal(m.canSee(m.killer,m.survivors[0]),false);m.attack(1);assert.equal(m.survivors[0].life,'healthy');Object.assign(m.killer,{x:650,y:650,angle:0});assert.equal(m.canSee(m.killer,{x:550,y:650}),false);assert.equal(m.canSee(m.killer,{x:680,y:650}),true);
});
test('all objective points can be reached by navigation from central clearing',()=>{
 const m=new Match('killer');for(const p of [...genSpots,...hookSpots,...m.gates.map(g=>({...g,x:g.x+(g.id===0?32:-32)})),m.hatch]){assert.equal(blocked(p,11,m.obstacles()),false,JSON.stringify(p));const path=findPath({x:950,y:820},p,m.obstacles());assert.ok(path.length>0);assert.ok(Math.hypot(path.at(-1)!.x-p.x,path.at(-1)!.y-p.y)<35,JSON.stringify(p));}
});
test('both roles complete autonomous trials with movement, repair and combat',()=>{
 for(const role of ['survivor','killer'] as const){let seed=42;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const m=new Match(role,rng);const id=m.playerId;m.playerId=-1;for(let t=0;t<900&&!m.finished;t+=.1){m.playerId=id; // Run player as AI, then let step update the remaining cast.
 if(id===4)m.killerAI(.1);else m.survivorAI(m.actors[id],.1);
 // step normally clears only player's action, preserve it for continuous AI work.
 const a=m.actors[id],action=a.action,progress=a.progress;m.step(.1,{...EMPTY_INPUT,angle:a.angle});a.action=action;a.progress=progress;
 }assert.equal(m.finished,true,`${role}: ${JSON.stringify(m.actors.map(a=>({life:a.life,x:a.x,y:a.y,action:a.action})))}`);assert.ok(m.survivors.some(s=>s.stats.repair>0));assert.ok(m.killer.stats.hits>0);}
});
