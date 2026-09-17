import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT,actorPosition,CONFIG} from '../src/game';
import {lockerDoor} from '../src/lockers';
import {blocked,findPath,dist,visibilityBoundary} from '../src/world';

function setup(){const m=new Match('survivor',42);m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.player,lockerDoor(m.lockers[0]));return m;}
test('hidden survivors can look outside and extended hiding alerts the killer periodically',()=>{
 const m=setup(),s=m.player,l=m.lockers[0];m.workLocker(s,0,.5);s.angle=Math.PI/2;
 const door=lockerDoor(l);assert.deepEqual(m.viewpoint(s),door);assert.equal(m.canSee(s,{x:door.x,y:door.y+20}),true);
 assert.equal(m.canSee(m.killer,s),false);
 m.step(CONFIG.lockerAlertDelay-.1);assert.equal(m.alerts.filter(a=>a.type==='locker').length,0);
 m.step(.2);assert.equal(m.alerts.filter(a=>a.type==='locker').length,1);assert.equal(l.lastAlertAt,m.time);
 const first=l.lastAlertAt;m.step(1);assert.equal(l.lastAlertAt,first);
 m.step(CONFIG.lockerAlertInterval);assert.ok(l.lastAlertAt!>first!);
 m.workLocker(s,0,.5);assert.equal(s.lockerId,undefined);
 const last=l.lastAlertAt;m.step(CONFIG.lockerAlertInterval);assert.equal(l.lastAlertAt,last);
});
test('survivors hide, cannot move or be hit, and release interaction before exiting',()=>{
 const m=setup(),s=m.player,l=m.lockers[0];
 for(let i=0;i<25;i++)m.step(.1,{...EMPTY_INPUT,interact:true});
 assert.equal(s.lockerId,l.id);assert.equal(l.occupant,s.id);
 const pos={x:s.x,y:s.y};m.move(s,1,0,.1,true);assert.deepEqual({x:s.x,y:s.y},pos);
 Object.assign(m.killer,lockerDoor(l),{angle:-Math.PI/2});
 assert.equal(m.canSee(m.killer,s),false);assert.equal(m.attackTarget(100,-Math.PI/2),undefined);
 m.killer.x+=100;m.step(.1);
 for(let i=0;i<6;i++)m.step(.1,{...EMPTY_INPUT,interact:true});
 assert.equal(s.lockerId,undefined);assert.equal(l.occupant,null);assert.equal(blocked(s,10,m.obstacles()),false);
});
test('searching an occupied locker grabs a healthy survivor with an interpolated animation',()=>{
 const m=setup(),s=m.player,l=m.lockers[0];m.workLocker(s,l.id,.5);
 m.step(.01);m.playerId=4;Object.assign(m.killer,lockerDoor(l));
 m.workLocker(m.killer,l.id,.6);assert.equal(m.carried,null);
 m.workLocker(m.killer,l.id,.6);assert.equal(m.carried,s.id);assert.equal(s.life,'carried');assert.equal(s.lockerId,undefined);assert.equal(l.occupant,null);
 assert.deepEqual(actorPosition(s),{x:l.x,y:l.y,level:l.level});
 s.transition=.4;assert.ok(actorPosition(s).y>l.y&&actorPosition(s).y<s.y);
});
test('empty searches finish safely and occupied cabinets reject a second survivor',()=>{
 const m=setup(),l=m.lockers[0],s=m.player,b=m.survivors[1];m.workLocker(s,l.id,.5);
 Object.assign(b,lockerDoor(l));m.workLocker(b,l.id,1);assert.equal(b.lockerId,undefined);assert.equal(l.occupant,s.id);
 const empty=m.lockers[1];Object.assign(m.killer,lockerDoor(empty));m.workLocker(m.killer,empty.id,1.3);assert.equal(m.carried,null);assert.equal(empty.searchedAt,m.time);
});
test('lockers and their doors remain reachable across seeded maps',()=>{
 for(let seed=1;seed<=16;seed++){const m=new Match('survivor',seed);
 for(const l of m.lockers){const door=lockerDoor(l);assert.equal(blocked(l,0,m.obstacles()),true);assert.equal(blocked(door,10,m.obstacles()),false);
 const path=findPath({x:950,y:820},door,m.obstacles());assert.ok(path.length&&dist(path.at(-1)!,door)<35,JSON.stringify({seed,l}));}}
});
test('high walls and floor separation conceal actors regardless of crouching',()=>{
 const m=setup(),k=m.killer,s=m.player;Object.assign(k,{x:740,y:610,level:0,angle:0});Object.assign(s,{x:800,y:610,level:0,crouching:false});
 assert.equal(m.canSee(k,s),false);s.crouching=true;assert.equal(m.canSee(k,s),false);s.crouching=false;s.level=1;assert.equal(m.canSee(k,s),false);
 const cone=visibilityBoundary(k,0,Infinity,Math.PI/4,m.obstacles(false,false),true);assert.ok(cone.find(p=>p.angle===0)!.x>1900);
});
