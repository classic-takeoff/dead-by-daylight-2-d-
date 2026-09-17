import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {Match,EMPTY_INPUT} from '../src/game';
import {TUNING,validateTuning} from '../src/tuning';
import {stairVisual} from '../src/stair-visual';
import {stairs,dist,blocked,findPath,windowSpots} from '../src/world';

test('stairs face their destination, basement entrances always descend and carry blood markings',()=>{
 for(const s of stairs){assert.equal(stairVisual(s,0)?.direction,'up');assert.equal(stairVisual(s,1)?.direction,'down');assert.equal(stairVisual(s,0)?.basement,false);assert.equal(stairVisual(s,-1),null);}
 for(let seed=1;seed<=8;seed++){
  const s=new Match('survivor',seed).basement.stair;
  assert.equal(stairVisual(s,0)?.direction,'down');assert.equal(stairVisual(s,-1)?.direction,'up');assert.equal(stairVisual(s,0)?.basement,true);assert.equal(stairVisual(s,-1)?.basement,true);
 }
});

test('both sides of every interior window remain reachable without vaulting',()=>{
 for(let seed=1;seed<=16;seed++){
  const m=new Match('survivor',seed);
  for(const w of windowSpots.slice(-2))for(const sign of [-1,1]){
   const p={x:w.x+sign*TUNING.traversal.windowOffset,y:w.y,level:w.level};
   assert.equal(blocked(p,10,m.obstacles()),false,JSON.stringify(p));
   const path=findPath({x:950,y:820},p,m.obstacles(),m.stairs);
   assert.ok(path.length&&dist(path.at(-1)!,p)<35,JSON.stringify({seed,p}));
  }
 }
});

function hatchMatch(){const m=new Match('survivor',42);m.survivorAI=()=>{};m.killerAI=()=>{};m.hatch.open=true;Object.assign(m.player,{x:m.hatch.x,y:m.hatch.y,level:0});return m;}
test('healthy, injured and down survivors instantly enter an open hatch even during recovery',()=>{
 for(const life of ['healthy','injured','down'] as const){
  const m=hatchMatch();Object.assign(m.player,{life,cooldown:2,transition:.5});assert.equal(m.interaction(m.player)?.kind,'hatch');
  m.step(.001,{...EMPTY_INPUT,interact:true});assert.equal(m.player.life,'escaped');
 }
});
test('closed, distant, blocked and different-floor hatches cannot be entered',()=>{
 for(const kind of ['closed','distant','blocked','floor','carried']){
  const m=hatchMatch();m.player.life='down';
  if(kind==='closed'){m.hatch.open=false;m.hatch.closed=true;}
  if(kind==='distant')m.player.x-=100;
  if(kind==='floor')m.player.level=-1;
  if(kind==='carried')m.player.life='carried';
  if(kind==='blocked'){m.player.x-=40;m.terrain.push({x:m.hatch.x-24,y:m.hatch.y-30,w:12,h:60,kind:'wall'});}
  assert.equal(m.canEnterHatch(m.player),false,kind);m.step(.001,{...EMPTY_INPUT,interact:true});assert.notEqual(m.player.life,'escaped',kind);
 }
});
test('carry affordance matches reachable pickup, cooldown and safe release',()=>{
 const m=new Match('killer',42),k=m.killer,s=m.survivors[0];m.terrain=[];Object.assign(k,{x:600,y:650,cooldown:0});
 m.survivors.forEach((a,i)=>Object.assign(a,{x:1500+i*40,y:1200}));assert.equal(m.carryAction(),null);
 Object.assign(s,{x:630,y:650,life:'down'});assert.equal(m.carryAction(),'pickup');
 k.cooldown=1;assert.equal(m.carryAction(),null);k.cooldown=0;
 m.terrain=[{x:612,y:625,w:8,h:50,kind:'wall'}];assert.equal(m.carryAction(),null);m.terrain=[];
 m.pickup();assert.equal(m.carried,s.id);assert.equal(m.carryAction(),null);k.cooldown=0;assert.equal(m.carryAction(),'drop');
 m.pickup();assert.equal(m.carried,null);assert.equal(s.life,'down');assert.equal(blocked(s,10,m.obstacles()),false);
});
test('editing the JSON changes actual movement, repair, generator targets and map generation on fresh load',()=>{
 const dir=mkdtempSync(resolve('artifacts/config-proof-'));
 for(const file of ['game.ts','tuning.ts','world.ts','map-layout.ts','map-seed.ts','lockers.ts','death-animation.ts','attack-animation.ts','sound effect/taunts.ts']){
  const target=resolve(dir,file);mkdirSync(dirname(target),{recursive:true});cpSync(resolve('src',file),target);
 }
 const config=JSON.parse(readFileSync('src/game-config.json','utf8'));config.core.killerSpeed=150;config.core.repairTime=10;config.match.requiredGenerators=3;config.layout.palletCount=4;config.traversal.stairsSeconds=.9;
 writeFileSync(resolve(dir,'game-config.json'),JSON.stringify(config));
 const program=`import assert from 'node:assert/strict';import {Match,CONFIG} from ${JSON.stringify(pathToFileURL(resolve(dir,'game.ts')).href)};const m=new Match('killer',42);m.terrain=[];Object.assign(m.killer,{x:600,y:650});m.move(m.killer,1,0,.1);assert.equal(m.killer.x,615);assert.equal(CONFIG.repairTime,10);assert.equal(m.pallets.filter(p=>p.loop).length,4);const g=m.generators[0],a=m.survivors[0];Object.assign(a,{x:g.x,y:g.y,level:g.level});m.work(a,{kind:'repair',target:g,id:g.id,label:''},1);assert.equal(g.progress,.1);m.generators.slice(0,3).forEach(g=>g.progress=1);m.survivorAI=()=>{};m.killerAI=()=>{};m.step(.001);assert.equal(m.powered,true);Object.assign(m.killer,m.stairs[0].bottom);m.contextualSpace(m.killer);assert.equal(m.killer.motionDuration,.9);`;
 const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',program],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});
test('invalid timings and impossible objective counts fail with actionable errors',()=>{
 const c=structuredClone(TUNING);c.core.repairTime=0;assert.throws(()=>validateTuning(c),/repairTime/);c.core.repairTime=48;c.match.requiredGenerators=20;assert.throws(()=>validateTuning(c),/发电机/);
});
