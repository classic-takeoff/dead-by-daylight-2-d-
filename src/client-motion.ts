import {renderPosition,type Match,type Input,type Actor} from './game';
import {TUNING} from './tuning';
import {blocked,lineClear,floorOf,dist,type Point} from './world';

export function motionSpeed(m:Match,a:Actor,input:Input){
 let speed=a.role==='killer'?TUNING.core.killerSpeed:input.crouch?TUNING.core.crouchSpeed:input.run?TUNING.core.survivorSpeed:TUNING.movement.walkSpeed;
 if(a.charge>0||a.role==='killer'&&input.charging)speed*=TUNING.movement.chargeMultiplier;
 if(a.life==='down')speed=TUNING.movement.crawlSpeed;
 if(a.role==='killer'&&m.carried!==null)speed=TUNING.movement.carrySpeed;
 if(a.boost>0)speed*=TUNING.movement.boostMultiplier;
 if(a.role==='killer'&&a.cooldown>0)speed*=TUNING.movement.recoveryMultiplier;
 return speed;
}
export function movementLocked(a:Actor){return a.transition>0||!!a.lunge||a.lockerId!==undefined||!['healthy','injured','down'].includes(a.life)||a.cooldown>0&&['眩晕','翻越','落地'].includes(a.action);}
// Credits use host elapsed time, never client-supplied clocks or packet frequency.
export class ClientMotionAuthority{
 private budgets=new Map<number,{at:number;credit:number}>();
 accept(m:Match,id:number,input:Input,value:unknown,now=performance.now()){
  const a=m.actors[id],v=value as Point&{revision:number},speed=motionSpeed(m,a,input),old=this.budgets.get(id);
  const credit=Math.min(speed*TUNING.network.movementBurstSeconds,(old?.credit??speed*TUNING.network.movementStartSeconds)+Math.max(0,now-(old?.at??now))/1000*speed);
  const budget={at:now,credit};this.budgets.set(id,budget);
  if(m.finished||!v||!Number.isFinite(v.x)||!Number.isFinite(v.y)||!Number.isSafeInteger(v.revision)||v.revision!==(a.motionRevision??0)||floorOf(v)!==floorOf(a)||movementLocked(a))return false;
  const distance=dist(a,v),ob=m.obstacles();
  if(distance>credit+.001||blocked(v,TUNING.movement.collisionRadius,ob)||!lineClear(a,v,ob,TUNING.movement.collisionRadius)||m.exitBlocked(a,v))return false;
  if(m.actors.some(b=>b.id!==id&&b.lockerId===undefined&&['healthy','injured'].includes(b.life)&&floorOf(b)===floorOf(a)&&dist(b,v)<TUNING.movement.bodyDiameter&&dist(b,v)<dist(b,a)))return false;
  const elapsed=Math.max(1/60,Math.min(TUNING.network.movementBurstSeconds,(now-(old?.at??now-1000/30))/1000));
  const velocityTime=Math.max(elapsed,distance/speed);a.velocity={x:(v.x-a.x)/velocityTime,y:(v.y-a.y)/velocityTime};a.movementAt=m.time;
  if(distance>0)a.hostView={from:renderPosition(a),at:now,duration:Math.max(33,Math.min(100,elapsed*1000))};
  a.x=v.x;a.y=v.y;a.angle=input.angle;budget.credit-=distance;
  return true;
 }
 forget(id:number){this.budgets.delete(id);}
}

// Visual-only endpoint. Never lets an extrapolated remote actor cross solid terrain.
export function remoteEndpoint(m:Match,a:Actor):Point|undefined{
 if(!a.moving||movementLocked(a)||TUNING.network.extrapolationSeconds<=0)return;
 const v=a.velocity;if(!v||!Number.isFinite(v.x)||!Number.isFinite(v.y))return;
 const seconds=TUNING.network.extrapolationSeconds,ob=m.obstacles(),origin={x:a.x,y:a.y,level:a.level};let p=origin;
 for(let i=1;i<=8;i++){const next={x:a.x+v.x*seconds*i/8,y:a.y+v.y*seconds*i/8,level:a.level};if(blocked(next,TUNING.movement.collisionRadius,ob)||!lineClear(p,next,ob,TUNING.movement.collisionRadius))break;p=next;}
 return p;
}

