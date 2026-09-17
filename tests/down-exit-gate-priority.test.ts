import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT,gateExit,gateOpening} from '../src/game';
import {TUNING} from '../src/tuning';
function quiet(){const m=new Match('survivor',42);m.survivorAI=()=>{};m.killerAI=()=>{};m.powered=true;m.terrain=[];Object.assign(m.killer,{x:970,y:900});return m;}
test('downed humans crawl through either fully open gate, but cannot escape through a closed or opening gate',()=>{
 for(const id of [0,1]){
  const m=quiet(),g=m.gates[id],s=m.player,dx=id?1:-1;g.progress=1;g.openedAt=-10;Object.assign(s,{x:g.x-dx*32,y:g.y,life:'down',cooldown:2});
  for(let i=0;i<600&&s.life!=='escaped';i++)m.step(1/60,{...EMPTY_INPUT,dx});assert.equal(s.life,'escaped');assert.ok(Math.abs(s.x-gateExit(g).x)<TUNING.match.escapeRadius);
  for(const state of ['closed','opening']){const n=quiet(),gate=n.gates[id];gate.progress=state==='opening'?1:0;gate.openedAt=0;Object.assign(n.player,{...gateExit(gate),life:'down'});n.step(.01);assert.notEqual(n.player.life,'escaped');}
 }
});
test('downed AI crawls out an open gate and escape at the threshold precedes all-down defeat',()=>{
 const m=new Match('killer',42),g=m.gates[0],s=m.survivors[0];m.killerAI=()=>{};m.powered=true;g.progress=1;g.openedAt=-10;Object.assign(s,{x:g.x+26,y:g.y,life:'down'});m.survivors.slice(1).forEach(a=>Object.assign(a,{x:1500,y:1200}));
 for(let i=0;i<600&&s.life!=='escaped';i++)m.step(1/60);assert.equal(s.life,'escaped');
 const n=quiet(),gate=n.gates[0];gate.progress=1;gate.openedAt=-10;n.survivors.forEach(a=>a.life='down');Object.assign(n.player,gateExit(gate));n.step(.01);assert.equal(n.player.life,'escaped');
});
test('active gate opening wins over nearby healing for both human and AI openers',()=>{
 for(const ai of [false,true])for(const reverse of [false,true]){
  const m=quiet(),g=m.gates[0],s=m.player,helper=m.survivors[1];Object.assign(s,{x:g.x+30,y:g.y,life:'injured'});Object.assign(helper,{x:s.x+20,y:s.y,life:'injured'});
  m.work(s,{kind:'gate',target:g,id:g.id,label:''},.1);const before=g.progress;
  assert.equal(m.interaction(s)?.kind,'gate');assert.notEqual(m.interaction(helper)?.kind,'heal');m.work(helper,{kind:'heal',target:s,id:s.id,label:''},3);assert.equal(s.life,'injured');assert.equal(s.healProgress??0,0);
  if(ai){Object.assign(helper,{action:'heal:'+s.id,workAt:m.time});Match.prototype.survivorAI.call(m,s,.2);}
  else {const controls:[number,typeof EMPTY_INPUT][]=[[s.id,{...EMPTY_INPUT,interact:true}],[helper.id,{...EMPTY_INPUT,interact:true}]];m.humanInputs=new Map(reverse?controls.reverse():controls);m.step(.2);}
  assert.equal(s.action,'gate:'+g.id);assert.ok(g.progress>before);assert.equal(s.life,'injured');
  s.action='';s.workAt=undefined;m.time+=1;assert.equal(m.healStationary(s),true);
 }
});
