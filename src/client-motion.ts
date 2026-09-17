import {renderPosition,gateExit,type Match,type Input,type Actor} from './game';
import {TUNING} from './tuning';
import {blocked,lineClear,floorOf,dist,type Point} from './world';

export function movementLocked(a:Actor):boolean{
  return a.transition>0||!!a.lunge||a.lockerId!==undefined||!['healthy','injured','down'].includes(a.life)||a.cooldown>0&&['眩晕','翻越','落地'].includes(a.action);
}

// Authoritative local movement. Mutates the actor in place and is pure: no
// events, no AI, no healing interruption. Every client runs this for its own
// actor every frame, and the result is trusted by the host (no anti-cheat).
export function advanceLocal(m:Match,a:Actor,input:Input,dt:number):void{
  a.crouching=a.role==='survivor'&&input.crouch&&['healthy','injured'].includes(a.life)&&a.transition===0;
  const dx=input.dx,dy=input.dy,n=Math.hypot(dx,dy);
  if(!n||a.transition>0||!!a.lunge||a.lockerId!==undefined||!['healthy','injured','down'].includes(a.life)||a.cooldown>0&&['眩晕','翻越','落地'].includes(a.action)){
    a.moving=false;a.running=false;return;
  }
  let speed=a.role==='killer'?TUNING.core.killerSpeed:a.crouching?TUNING.core.crouchSpeed:input.run?TUNING.core.survivorSpeed:TUNING.movement.walkSpeed;
  if(a.charge>0||a.role==='killer'&&input.charging)speed*=TUNING.movement.chargeMultiplier;
  if(a.life==='down')speed=TUNING.movement.crawlSpeed;
  if(a.role==='killer'&&m.carried!==null)speed=TUNING.movement.carrySpeed;
  if(a.boost>0)speed*=TUNING.movement.boostMultiplier;
  if(a.role==='killer'&&a.cooldown>0)speed*=TUNING.movement.recoveryMultiplier;
  const ob=m.obstacles(),r=TUNING.movement.collisionRadius,before={x:a.x,y:a.y};
  const sx=dx/n*speed*dt,sy=dy/n*speed*dt;
  const canMove=(next:Point)=>!blocked(next,r,ob)&&!m.actors.some(b=>b.id!==a.id&&b.lockerId===undefined&&['healthy','injured'].includes(b.life)&&floorOf(b)===floorOf(next)&&dist(b,next)<TUNING.movement.bodyDiameter&&dist(b,next)<dist(b,before));
  const barrier=a.role==='killer'&&floorOf(a)===0&&m.gates.some(g=>Math.abs(a.y-g.y)<TUNING.physics.gateBarrierHalfHeight&&(g.id===0?before.x+sx<gateExit(g).x+10&&before.x+sx<before.x:before.x+sx>gateExit(g).x-10&&before.x+sx>before.x));
  if(!barrier&&canMove({...a,x:before.x+sx}))a.x=before.x+sx;
  if(canMove({...a,y:before.y+sy}))a.y=before.y+sy;
  a.velocity={x:(a.x-before.x)/dt,y:(a.y-before.y)/dt};
  a.movementAt=m.time;
  a.moving=Math.hypot(a.x-before.x,a.y-before.y)>.001;
  a.running=a.role==='survivor'&&input.run&&!input.crouch&&a.life!=='down';
  if(a.role==='survivor'&&a.id!==m.playerId)a.angle=Math.atan2(dy,dx);
}

// Host applies a trusted client report. No distance/wall budget: only stale
// reports that would undo a host-forced move, or reports for a locked actor,
// are ignored.
export function applyRemoteMove(m:Match,id:number,input:Input,value:unknown,now=performance.now(),prevAt=now):boolean{
  const a=m.actors[id],v=value as Point&{revision:number};
  if(m.finished||!v||!Number.isFinite(v.x)||!Number.isFinite(v.y)||!Number.isSafeInteger(v.revision)||v.revision!==(a.motionRevision??0)||floorOf(v)!==floorOf(a)||movementLocked(a))return false;
  a.hostView={from:renderPosition(a),at:now,duration:50};
  const prevX=a.x,prevY=a.y,elapsed=Math.max(1/30,Math.min(.25,(now-prevAt)/1000));
  a.x=v.x;a.y=v.y;a.angle=input.angle;
  a.velocity={x:(v.x-prevX)/elapsed,y:(v.y-prevY)/elapsed};a.movementAt=m.time;
  return true;
}

// Visual-only endpoint. Never lets an extrapolated remote actor cross solid terrain.
export function remoteEndpoint(m:Match,a:Actor):Point|undefined{
  if(!a.moving||movementLocked(a)||TUNING.network.extrapolationSeconds<=0)return;
  const v=a.velocity;if(!v||!Number.isFinite(v.x)||!Number.isFinite(v.y))return;
  const seconds=TUNING.network.extrapolationSeconds,ob=m.obstacles(),origin={x:a.x,y:a.y,level:a.level};let p=origin;
  for(let i=1;i<=8;i++){const next={x:a.x+v.x*seconds*i/8,y:a.y+v.y*seconds*i/8,level:a.level};if(blocked(next,TUNING.movement.collisionRadius,ob)||!lineClear(p,next,ob,TUNING.movement.collisionRadius))break;p=next;}
  return p;
}
