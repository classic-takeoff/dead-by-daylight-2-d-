import {type Actor,type Input,type Match} from './game';
import {blocked,floorOf,type Point} from './world';
import {TUNING} from './tuning';
import {gateExit} from './game';

// Client-owned ordinary movement. Combat, traversal and interactions stay host-owned.
function advance(m:Match,position:Point,input:Input,dt:number):Point{
 const a=m.player,n=Math.hypot(input.dx,input.dy),c=TUNING;
 if(!n||a.transition>0||a.lunge||a.lockerId!==undefined||!['healthy','injured','down'].includes(a.life)||a.cooldown>0&&['眩晕','翻越','落地'].includes(a.action))return position;
 let speed=a.role==='killer'?c.core.killerSpeed:input.crouch?c.core.crouchSpeed:input.run?c.core.survivorSpeed:c.movement.walkSpeed;
 if(a.life==='down')speed=c.movement.crawlSpeed;
 if(a.role==='killer'&&m.carried!==null)speed=c.movement.carrySpeed;
 if(a.charge>0||a.role==='killer'&&input.charging)speed*=c.movement.chargeMultiplier;
 if(a.boost>0)speed*=c.movement.boostMultiplier;
 if(a.role==='killer'&&a.cooldown>0)speed*=c.movement.recoveryMultiplier;
 const ob=m.obstacles(),p={...position},r=c.movement.collisionRadius;
 const canMove=(next:Point)=>!blocked(next,r,ob)&&!m.actors.some(b=>b.id!==a.id&&b.lockerId===undefined&&['healthy','injured'].includes(b.life)&&floorOf(b)===floorOf(next)&&Math.hypot(b.x-next.x,b.y-next.y)<c.movement.bodyDiameter&&Math.hypot(b.x-next.x,b.y-next.y)<Math.hypot(b.x-p.x,b.y-p.y));
 const x=p.x+input.dx/n*speed*dt,y=p.y+input.dy/n*speed*dt;
 const barrier=a.role==='killer'&&floorOf(p)===0&&m.gates.some(g=>Math.abs(p.y-g.y)<c.physics.gateBarrierHalfHeight&&(g.id===0?x<gateExit(g).x+10&&x<p.x:x>gateExit(g).x-10&&x>p.x));
 if(!barrier&&canMove({...p,x}))p.x=x;
 if(canMove({...p,y}))p.y=y;
 return p;
}

export class ClientPrediction{
 private frames:Array<{input:Input;dt:number;seq?:number}>=[];
 private position:Point|null=null;private revision=0;
 report(m:Match){return {x:(this.position??m.player).x,y:(this.position??m.player).y,level:m.player.level,revision:m.player.motionRevision??0};}
 private correction={x:0,y:0};private receivedAt=performance.now();private previousLife='';
 tick(m:Match,dt:number,input:Input){
  const a=m.player;
  if(a.transition>0||!['healthy','injured','down'].includes(a.life)||a.lockerId!==undefined){this.reset(a);return;}
  if(performance.now()-this.receivedAt>TUNING.network.inputTimeout*1000){a.predicted=undefined;this.frames=[];this.position=null;return;}
  this.position??={x:a.x,y:a.y,level:a.level};
  const elapsed=Math.min(dt,.05);this.frames.push({input:{...input},dt:elapsed});
  let total=this.frames.reduce((sum,f)=>sum+f.dt,0);while(total>TUNING.network.predictionLimit&&this.frames.length)total-=this.frames.shift()!.dt;
  this.position=advance(m,this.position,input,elapsed);
  const decay=Math.exp(-elapsed/TUNING.network.correctionSeconds);this.correction.x*=decay;this.correction.y*=decay;
  const display={...this.position,x:this.position.x+this.correction.x,y:this.position.y+this.correction.y};
  a.predicted=blocked(display,TUNING.movement.collisionRadius,m.obstacles())?{...this.position}:display;
  a.angle=input.angle;
 }
 sent(seq:number){for(const f of this.frames)if(f.seq===undefined)f.seq=seq;}
 reconcile(m:Match,ack:number,previous:Point){
  const a=m.player;this.receivedAt=performance.now();
  this.frames=this.frames.filter(f=>f.seq===undefined||f.seq>ack);
  if(a.transition>0||a.lockerId!==undefined||!['healthy','injured','down'].includes(a.life)||this.previousLife&&this.previousLife!==a.life||this.revision!==(a.motionRevision??0)||floorOf(previous)!==floorOf(a)){this.reset(a);return;}
  this.previousLife=a.life;
  this.position={x:a.x,y:a.y,level:a.level};for(const f of this.frames)this.position=advance(m,this.position,f.input,f.dt);
  const dx=previous.x-this.position.x,dy=previous.y-this.position.y;
  this.correction=Math.hypot(dx,dy)>TUNING.network.snapDistance?{x:0,y:0}:{x:dx,y:dy};
  a.predicted={...this.position,x:this.position.x+this.correction.x,y:this.position.y+this.correction.y};
 }
 private reset(a:Actor){this.revision=a.motionRevision??0;a.predicted=undefined;this.position=null;this.frames=[];this.correction={x:0,y:0};this.previousLife=a.life;}
}
