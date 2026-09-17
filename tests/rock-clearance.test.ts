import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/game';
import {rocks,blocked,lineClear,buildings,upperFloor,dist,findPath} from '../src/world';
import {TUNING} from '../src/tuning';
test('expanded rooms retain useful space on both floors',()=>{
 assert.ok(buildings[0].w*buildings[0].h>=344*232*1.6);
 assert.ok(buildings[1].w*buildings[1].h>=320*360*1.55);
 assert.ok(upperFloor.w*upperFloor.h>=280*320*1.55);
});
test('rocks keep collision and a continuous killer walking circuit across 32 map seeds',()=>{
 for(let seed=1;seed<=32;seed++){
  const m=new Match('killer',seed);m.survivors.forEach(s=>s.life='escaped');
  for(const r of rocks){
   assert.equal(blocked({x:r.x+r.w/2,y:r.y+r.h/2},10,m.obstacles()),true);
   const gap=30,points=[{x:r.x-gap,y:r.y-gap},{x:r.x+r.w+gap,y:r.y-gap},{x:r.x+r.w+gap,y:r.y+r.h+gap},{x:r.x-gap,y:r.y+r.h+gap}];
   const path=findPath(TUNING.world.killerStart,points[0],m.obstacles(),m.stairs);assert.ok(path.length&&dist(path.at(-1)!,points[0])<35,JSON.stringify({seed,r}));
   for(let i=0;i<4;i++){
    const from=points[i],to=points[(i+1)%4];assert.equal(lineClear(from,to,m.obstacles(),TUNING.movement.pathRadius),true,JSON.stringify({seed,r,i}));
    Object.assign(m.killer,{...from,level:0,cooldown:0});
    for(let step=0;step<360&&dist(m.killer,to)>1;step++){const d=dist(m.killer,to);m.move(m.killer,to.x-m.killer.x,to.y-m.killer.y,Math.min(1/60,d/TUNING.core.killerSpeed));}
    assert.ok(dist(m.killer,to)<=1,JSON.stringify({seed,r,i,k:m.killer}));
   }
  }
 }
});
