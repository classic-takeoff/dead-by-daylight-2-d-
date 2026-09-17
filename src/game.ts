import { TUNING, CONFIG } from './tuning';
export { CONFIG } from './tuning';
﻿import { validTaunt, tauntGain, TAUNT_DURATIONS } from './sound effect/taunts';
import { freshMapSeed, seededRandom, seedLabel } from './map-seed';
import { createLayout } from './map-layout';
import { lockerSpots, lockerDoor, lockerBody, type Locker } from './lockers';
import { DEATH_DURATION } from './death-animation';
import { LUNGE } from './attack-animation';
import { createBasement, stairRoutes, sightClear, sightRay, walls, blocked, dist, floorOf, stairs, drops, findPath, genSpots, hookSpots, lineClear, palletSpots, windowSpots, type Point, type Wall } from './world';
export type Role='survivor'|'killer';
export type Life='healthy'|'injured'|'down'|'carried'|'hooked'|'dead'|'escaped';
export function terrorStrength(a:Point,k:Point){return Math.max(0,1-Math.hypot(a.x-k.x,a.y-k.y,(floorOf(a)-floorOf(k))*TUNING.match.floorSoundDistance)/CONFIG.terrorRadius);}
export function attackRecovery(charge:number,hit=false){return (hit?TUNING.actions.hitRecovery:TUNING.actions.missRecovery)+Math.max(0,Math.min(1,charge))*TUNING.actions.chargeRecovery;}
export type Actor=Point&{hostView?:{from:Point;at:number;duration:number};motionRevision?:number;netExtrapolate?:Point;predicted?:Point;id:number;name:string;role:Role;tauntUntil?:number;crouching?:boolean;lockerId?:number;netFrom?:Point;netAt?:number;netDuration?:number;lockerGrab?:boolean;deathAt?:number;deathFrom?:Point;vaultKind?:'window'|'pallet';vaultMode?:'fast'|'slow';vaultWindow?:number;velocity?:Point;movementAt?:number;escapedAt?:number;charge:number;attackAt:number;attackCharge:number;attackAngle?:number;wipeUntil?:number;lunge?:{elapsed:number;angle:number;hit:boolean};transition:number;motionFrom?:Point;motionDuration?:number;life:Life;angle:number;hooks:number;hookTime:number;bleed:number;cooldown:number;boost:number;invulnerable:number;struggle:number;nextWiggleAt?:number;recover:number;healProgress?:number;moving:boolean;running:boolean;action:string;progress:number;workAt?:number;workStarted?:number;target?:Point;path:Point[];pathAge:number;lastTrace:number;stats:{repair:number;rescues:number;hits:number;chase:number};};
function smoothNetwork(a:Actor,p:Point):Point{
 if(!a.netFrom||a.netAt===undefined||floorOf(a.netFrom)!==floorOf(p))return p;
 const elapsed=Math.max(0,performance.now()-a.netAt),duration=a.netDuration??80,t=Math.min(1,elapsed/duration);
 if(t>=1&&a.netExtrapolate){const u=Math.min(1,(elapsed-duration)/(TUNING.network.extrapolationSeconds*1000));return {x:p.x+(a.netExtrapolate.x-p.x)*u,y:p.y+(a.netExtrapolate.y-p.y)*u,level:p.level};}
 return {x:a.netFrom.x+(p.x-a.netFrom.x)*t,y:a.netFrom.y+(p.y-a.netFrom.y)*t,level:p.level};
}
// Host rendering is smoothed separately; combat continues using the accepted position.
export function renderPosition(a:Actor):Point {
 const p=actorPosition(a),v=a.hostView;if(!v||floorOf(v.from)!==floorOf(p))return p;
 const t=Math.min(1,Math.max(0,(performance.now()-v.at)/v.duration));
 return {x:v.from.x+(p.x-v.from.x)*t,y:v.from.y+(p.y-v.from.y)*t,level:p.level};
}
export function actorPosition(a:Actor):Point {
  if(a.predicted)return a.predicted;
  if(a.transition<=0||!a.motionFrom||!a.motionDuration)return smoothNetwork(a,{x:a.x,y:a.y,level:a.level});
  const t=Math.max(0,Math.min(1,1-a.transition/a.motionDuration));
  const u=a.vaultMode==='slow'&&a.action==='翻越'?t*t*(3-2*t):t;
  return smoothNetwork(a,{x:a.motionFrom.x+(a.x-a.motionFrom.x)*u,y:a.motionFrom.y+(a.y-a.motionFrom.y)*u,level:a.level});
}
export const healingProgress=(a:Actor)=>a.life==='down'?a.recover:a.healProgress??0;
export const healingPercent=(a:Actor)=>Math.round(Number(healingProgress(a).toFixed(3))*100);
export type Generator=Point&{id:number;progress:number;regressing:boolean;blockedUntil?:number};
export type Hook=Point&{id:number;occupant:number|null};
export type Pallet=Point&{loop?:'long'|'short';axis?:'x'|'y';id:number;state:'up'|'down'|'broken';droppedAt?:number;dropSide?:number;brokenAt?:number};
export type Gate=Point&{id:number;progress:number;openedAt?:number;blockedAt?:number};
export const gateOpening=(g:Gate,time:number)=>g.progress<1?0:Math.min(1,Math.max(0,(time-(g.openedAt??-10))/TUNING.match.gateAnimationSeconds));
export const gateExit=(g:Gate)=>({x:g.x+(g.id===0?-TUNING.match.gateExitOffset:TUNING.match.gateExitOffset),y:g.y,level:0});
export type Trace=Point&{kind:'scratch'|'blood'|'noise';until:number;angle:number};
export type Input={taunt?:number;dx:number;dy:number;run:boolean;crouch:boolean;interact:boolean;space:boolean;special:boolean;attack:boolean;charge:number;charging?:boolean;angle:number};
export const EMPTY_INPUT:Input={dx:0,dy:0,run:false,crouch:false,interact:false,space:false,special:false,attack:false,charge:0,angle:0};
export type Interaction={kind:'locker'|'repair'|'heal'|'rescue'|'recover'|'gate'|'hatch'|'hook'|'kick'|'break';target:Point;id:number;label:string};
export type GameEvent={type:string;text:string;recipient?:number;x?:number;y?:number;level?:number};
export class Match {
  visualSync?:{from:number;at:number;duration:number};
  get renderTime(){const sync=this.visualSync;if(!sync)return this.time;const t=Math.min(1,Math.max(0,(performance.now()-sync.at)/sync.duration));return sync.from+(this.time-sync.from)*t;}
  onEvent:((event:GameEvent)=>void)|null=null;
  readonly mapSeed:number;get seedLabel(){return seedLabel(this.mapSeed);}
  get deathAnimating(){return this.survivors.some(s=>s.deathAt!==undefined&&this.time-s.deathAt<DEATH_DURATION);}
  chaseUntil=[0,0,0,0];
  get chasedSurvivor(){if(this.finished||this.carried!==null)return null;return this.survivors.filter(s=>['healthy','injured'].includes(s.life)&&s.lockerId===undefined&&this.chaseUntil[s.id]>this.time).sort((a,b)=>this.chaseUntil[b.id]-this.chaseUntil[a.id]||a.id-b.id)[0]??null;}
  isChasing(a:Actor){const chased=this.chasedSurvivor;return !!chased&&(a.role==='killer'||chased.id===a.id);}
  basement=createBasement(0);
  get stairs(){return [...stairs,this.basement.stair];}
  terrain:Wall[]=[];
  lockers:Locker[]=lockerSpots.map((p,id)=>({...p,id,occupant:null,openedAt:-10,searchedAt:-10}));
  actors:Actor[]=[]; generators:Generator[]=[];hooks:Hook[]=[];pallets:Pallet[]=[];gates:Gate[]=TUNING.world.gates.map((g,id)=>({...g,id,progress:0}));
  hatch={...TUNING.world.hatch,open:false,closed:false};traces:Trace[]=[];time=0;endgame=0;powered=false;finished=false;events:GameEvent[]=[];alerts:Array<Point&{until:number;type:string;name?:string;actorId?:number}>=[];
  skills:Record<number,{value:number;start:number;end:number;actor:number}|null>={};skillTimers:Record<number,number>={};
  get skill(){return this.skills[this.playerId]??null;}set skill(v:{value:number;start:number;end:number;actor:number}|null){this.skills[this.playerId]=v;}
  get nextSkill(){return this.skillTimers[this.playerId]??TUNING.skill.firstDelay;}set nextSkill(v:number){this.skillTimers[this.playerId]=v;}
  clientMoved=new Set<number>();humanInputs:Map<number,Input>|null=null;forfeitRole:Role|null=null;
  selectedRole:Role;playerId:number;carried:number|null=null;
  private chargeReleased=false;private lockerHolds=new Set<number>();
  private get lockerHeld(){return this.lockerHolds.has(this.playerId);}private set lockerHeld(v:boolean){if(v)this.lockerHolds.add(this.playerId);else this.lockerHolds.delete(this.playerId);}
  private lastKnown:Point|null=null;private memoryUntil=0;private patrol=0;private inspected=new Map<number,number>();private rng:()=>number;
  constructor(role:Role, seedOrRng:number|(()=>number)=freshMapSeed()){
    this.mapSeed=typeof seedOrRng==='number'?seedOrRng>>>0:Math.floor(seedOrRng()*0x100000000)>>>0;this.selectedRole=role;this.playerId=role==='killer'?4:0;this.rng=seededRandom(this.mapSeed);
    const starts=[...this.shuffle(TUNING.world.survivorStarts),TUNING.world.killerStart];
    this.actors=starts.map((p,id)=>({...p,id,level:0,charge:0,attackAt:-10,attackCharge:0,transition:0,name:['林晓','艾琳','诺亚','米娅','守林人'][id],role:id===4?'killer':'survivor',life:'healthy',angle:-Math.PI/2,hooks:0,hookTime:0,bleed:0,cooldown:0,boost:0,invulnerable:0,struggle:0,recover:0,moving:false,running:false,action:'',progress:0,path:[],pathAge:0,lastTrace:0,stats:{repair:0,rescues:0,hits:0,chase:0}}));
    this.generators=this.shuffle([...this.shuffle(genSpots.filter(p=>floorOf(p)===0)).slice(0,TUNING.match.groundGenerators),...this.shuffle(genSpots.filter(p=>floorOf(p)===1)).slice(0,TUNING.match.upstairsGenerators)]).map((p,id)=>({...p,id,progress:0,regressing:false}));
    this.hooks=this.shuffle(hookSpots).slice(0,TUNING.match.outdoorHooks).map((p,id)=>({...p,id,occupant:null}));
    const layout=createLayout(this.rng,[...starts,...lockerSpots,...lockerSpots.map(lockerDoor)]);this.terrain=layout.terrain;this.pallets=[...palletSpots,...layout.pallets].map((p,id)=>({...p,id,state:'up'}));
    this.basement=createBasement(this.rng()<TUNING.basement.shackChance?0:1);this.terrain.push(...this.basement.terrain);
    this.hooks.push(...this.basement.hooks.map((p,i)=>({...p,id:TUNING.match.outdoorHooks+i,occupant:null})));
    this.rng=typeof seedOrRng==='function'?seedOrRng:seededRandom(this.mapSeed^0xa17e5eed);
    this.emit('start',role==='survivor'?`修复 ${TUNING.match.requiredGenerators} 台发电机，打开出口，逃离雾林`:'追踪划痕与爆点，击倒并献祭四名逃生者');
  }
  private shuffle<T>(items:T[]):T[]{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  get player(){return this.actors[this.playerId];}get killer(){return this.actors[4];}get survivors(){return this.actors.slice(0,4);}get repaired(){return this.generators.filter(g=>g.progress>=1).length;}
  get active(){return this.survivors.filter(a=>a.life!=='dead'&&a.life!=='escaped');}
  playTaunt(a:Actor,id:unknown){
    if(this.finished||!validTaunt(id)||['dead','escaped'].includes(a.life)||(a.tauntUntil??0)>this.time)return;
    a.tauntUntil=this.time+TUNING.alerts.tauntCooldown;const source=actorPosition(a);
    this.emit('taunt:'+id+':'+a.id,'',source);
    if(a.role==='survivor'){
      this.alerts=this.alerts.filter(alert=>alert.type!=='taunt'||alert.actorId!==a.id);
      this.alerts.push({...source,type:'taunt',name:a.name,actorId:a.id,until:this.time+TAUNT_DURATIONS[id]});if(tauntGain(this.killer,source)>0)this.noise(source);
    }
  }
  emit(type:string,text:string,p?:Point,recipient?:number){if(p&&(type==='stomp'||type==='metal-kick')){this.alerts=this.alerts.filter(a=>a.type!==type);this.alerts.push({...p,type,until:this.time+TUNING.alerts.kickSeconds});}const event={type,text,recipient,x:p?.x,y:p?.y,level:p?.level};this.events.push(event);this.onEvent?.(event);if(type==='rescue'&&p)this.alerts.push({x:p.x,y:p.y,level:p.level,type,until:this.time+TUNING.alerts.rescueSeconds});if(this.events.length>40)this.events.shift();}
  obstacles(includePallets=true,includeWindows=true):Wall[]{return [...this.terrain,...this.lockers.map(lockerBody),...this.gates.filter(g=>gateOpening(g,this.time)<1).map(g=>({x:g.x-TUNING.physics.gateHalfWidth,y:g.y-TUNING.physics.gateHalfHeight,w:TUNING.physics.gateHalfWidth*2,h:TUNING.physics.gateHalfHeight*2,kind:'wall' as const})),...this.pallets.filter(p=>includePallets&&p.state==='down').map(p=>({x:p.x-(p.axis==='x'?TUNING.physics.palletHalfThickness:TUNING.physics.palletHalfLength),y:p.y-(p.axis==='x'?TUNING.physics.palletHalfLength:TUNING.physics.palletHalfThickness),level:p.level,w:p.axis==='x'?TUNING.physics.palletHalfThickness*2:TUNING.physics.palletHalfLength*2,h:p.axis==='x'?TUNING.physics.palletHalfLength*2:TUNING.physics.palletHalfThickness*2,kind:'junk' as const})),...windowSpots.filter(()=>includeWindows).map(p=>({x:p.x-TUNING.physics.windowHalfWidth,y:p.y-TUNING.physics.windowHalfHeight,w:TUNING.physics.windowHalfWidth*2,h:TUNING.physics.windowHalfHeight*2,level:p.level,kind:'wall' as const}))];}
  viewpoint(a:Actor):Point{return a.lockerId===undefined?actorPosition(a):lockerDoor(this.lockers[a.lockerId]);}
  canSee(a:Actor,b:Point&{role?:Role;crouching?:boolean;lockerId?:number}){if(a.lockerId!==undefined)a={...a,...this.viewpoint(a)};if(floorOf(a)!==floorOf(b)||b.lockerId!==undefined)return false;const range=a.role==='killer'?CONFIG.vision:CONFIG.survivorVision,near=a.role==='killer'?CONFIG.nearVision:CONFIG.survivorNearVision,half=a.role==='killer'?CONFIG.killerHalfAngle:CONFIG.survivorHalfAngle;const d=dist(a,b),angle=Math.atan2(b.y-a.y,b.x-a.x)-a.angle;if(d>near&&(d>range||Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))>half))return false;return sightClear(a,b,this.obstacles(false,false));}
  bodyBlocked(a:Actor,next:Point){
    return this.actors.some(b=>{
      if(b.id===a.id||b.lockerId!==undefined||!['healthy','injured'].includes(b.life)||floorOf(b)!==floorOf(next))return false;
      const pos=actorPosition(b),current=actorPosition(a);
      return dist(next,pos)<TUNING.movement.bodyDiameter&&dist(next,pos)<dist(current,pos)-.001;
    });
  }
  move(a:Actor,dx:number,dy:number,dt:number,run=false,crouch=false){
    if(dx||dy)this.interruptHealing(a);
    if(a.lockerId!==undefined)return;
    a.crouching=a.role==='survivor'&&crouch&&['healthy','injured'].includes(a.life)&&a.transition===0;const n=Math.hypot(dx,dy);if(!n||a.cooldown>0&&(a.action==='翻越'||a.action==='眩晕'||a.action==='落地'))return;
    let speed=a.role==='killer'?CONFIG.killerSpeed:a.crouching?CONFIG.crouchSpeed:run?CONFIG.survivorSpeed:TUNING.movement.walkSpeed;
    if(a.transition>0||a.lunge)return;if(a.charge>0)speed*=TUNING.movement.chargeMultiplier;if(a.life==='down')speed=TUNING.movement.crawlSpeed;if(a.role==='killer'&&this.carried!==null)speed=TUNING.movement.carrySpeed;if(a.boost>0)speed*=TUNING.movement.boostMultiplier;if(a.role==='killer'&&a.cooldown>0)speed*=TUNING.movement.recoveryMultiplier;
    const before={x:a.x,y:a.y},sx=dx/n*speed*dt,sy=dy/n*speed*dt,ob=this.obstacles();
    if(!this.clientMoved.has(a.id)){if(!this.exitBlocked(a,{x:a.x+sx,y:a.y,level:a.level})&&!blocked({x:a.x+sx,y:a.y,level:a.level},TUNING.movement.collisionRadius,ob)&&!this.bodyBlocked(a,{x:a.x+sx,y:a.y,level:a.level}))a.x+=sx;if(!blocked({x:a.x,y:a.y+sy,level:a.level},TUNING.movement.collisionRadius,ob)&&!this.bodyBlocked(a,{x:a.x,y:a.y+sy,level:a.level}))a.y+=sy;
    a.velocity={x:(a.x-before.x)/dt,y:(a.y-before.y)/dt};a.movementAt=this.time;}
    a.moving=true;a.running=a.role==='survivor'&&run&&!crouch&&a.life!=='down';if(a.role==='survivor'&&a.id!==this.playerId)a.angle=Math.atan2(dy,dx);
    if(a.role==='survivor'&&this.time-a.lastTrace>TUNING.alerts.traceInterval){
      if(a.running)this.traces.push({x:a.x,y:a.y,level:a.level,angle:a.angle,kind:'scratch',until:this.time+TUNING.alerts.scratchSeconds});
      if(a.life==='injured'||a.life==='down')this.traces.push({x:a.x+4,y:a.y+3,level:a.level,angle:a.angle,kind:'blood',until:this.time+TUNING.alerts.bloodSeconds});a.lastTrace=this.time;
    }
  }
  exitBlocked(a:Actor,next:Point){
    if(a.role!=='killer'||floorOf(next)!==0)return false;
    const g=this.gates.find(g=>Math.abs(next.y-g.y)<TUNING.physics.gateBarrierHalfHeight&&(g.id===0?next.x<gateExit(g).x+10&&next.x<a.x:next.x>gateExit(g).x-10&&next.x>a.x));
    if(!g)return false;if(this.time-(g.blockedAt??-10)>TUNING.physics.barrierAlertSeconds){g.blockedAt=this.time;this.emit('barrier','出口屏障：杀手无法离开，可返回通道继续追击',gateExit(g),4);}return true;
  }
  navigate(a:Actor,target:Point,dt:number,run=true){
    if(a.transition>0)return;
    if(floorOf(a)!==floorOf(target)){
 const route=stairRoutes(a,target,this.stairs)[0];if(!route)return;if(dist(a,route.from)<TUNING.ai.stairRange){this.traverse(a,route.to,false);return;}
 this.navigate(a,route.from,dt,run);return;
 }
 const obs=[...this.obstacles(),...this.actors.filter(b=>b.id!==a.id&&b.lockerId===undefined&&['healthy','injured'].includes(b.life)&&floorOf(b)===floorOf(a)&&dist(b,target)>TUNING.ai.bodyTargetExclusion).map(b=>({x:b.x-TUNING.movement.pathRadius,y:b.y-TUNING.movement.pathRadius,w:TUNING.movement.pathRadius*2,h:TUNING.movement.pathRadius*2,level:b.level,kind:'wall' as const}))];a.pathAge-=dt;
    const fallen=this.pallets.find(p=>p.state==='down'&&dist(a,p)<TUNING.ai.palletRange&&(p.axis==='x'?(a.x-p.x)*(target.x-p.x)<0:(a.y-p.y)*(target.y-p.y)<0));
    if(fallen&&a.role==='survivor'&&a.cooldown===0){this.contextualSpace(a);a.pathAge=0;return;}
    // A visible window is worth vaulting when it cuts a meaningful detour.
    const window=windowSpots.find(w=>dist(a,w)<TUNING.ai.windowRange&&(a.x-w.x)*(target.x-w.x)<0&&Math.abs(a.y-w.y)<TUNING.ai.windowAlign);
    if(window&&a.cooldown===0){this.contextualSpace(a);a.pathAge=0;return;}
    if(!a.target||dist(a.target,target)>TUNING.ai.retargetDistance||a.pathAge<=0){a.path=findPath(a,target,obs,this.stairs);a.target={...target};a.pathAge=TUNING.ai.pathSeconds+this.rng()*TUNING.ai.pathRandom;}
    while(a.path.length&&dist(a,a.path[0])<TUNING.ai.pathArrival)a.path.shift();
    const p=lineClear(a,target,obs,TUNING.movement.pathRadius)?target:a.path[0];
    if(p){if(a.role==='killer')a.angle=Math.atan2(p.y-a.y,p.x-a.x);const before={x:a.x,y:a.y};this.move(a,p.x-a.x,p.y-a.y,dt,run);if(Math.hypot(a.x-before.x,a.y-before.y)<TUNING.ai.stuckDistance)a.pathAge=0;}
  }
  private movingInputs=new Set<number>();
  private objectiveBusy(a:Actor){if(!['healthy','injured'].includes(a.life))return false;if(a.action.startsWith('gate:')){const gate=this.gates[Number(a.action.split(':')[1])];return this.powered&&!!gate&&gate.progress<1;}return a.action.startsWith('repair:')&&this.time-(a.workAt??-10)<TUNING.interactions.repairGrace;}
  healStationary(a:Actor){return !this.objectiveBusy(a)&&!this.movingInputs.has(a.id)&&!a.moving&&a.transition<=0&&!(this.time-(a.movementAt??-10)<TUNING.movement.recentMotionSeconds&&Math.hypot(a.velocity?.x??0,a.velocity?.y??0)>1);}
  private interruptHealing(target:Actor){
    const healers=this.survivors.filter(a=>a.action===`heal:${target.id}`&&this.time-(a.workAt??-10)<TUNING.interactions.healGrace);
    if(!healers.length)return;
    for(const a of healers){a.action='';a.progress=0;a.workAt=undefined;this.skills[a.id]=null;}
    this.noise(target);this.alerts.push({x:target.x,y:target.y,level:target.level,type:'heal-interrupt',until:this.time+TUNING.alerts.healInterruptSeconds});this.emit('fail','移动打断治疗 · 位置已暴露',target);
  }
  interaction(a:Actor):Interaction|null{
    if(this.canEnterHatch(a))return {kind:'hatch',target:this.hatch,id:0,label:'立即跳入地窖'};
    if(a.lockerId!==undefined){const l=this.lockers[a.lockerId];return {kind:'locker',target:l,id:l.id,label:'离开衣柜'};}
    if(a.action.startsWith('repair:')&&['healthy','injured'].includes(a.life)&&this.time-(a.workAt??-10)<TUNING.interactions.repairGrace){
      const id=Number(a.action.split(':')[1]),g=this.generators[id];
      if(g&&g.progress<1&&!this.powered&&(g.blockedUntil??0)<=this.time&&dist(a,g)<TUNING.interactions.repairRange&&lineClear(a,g,this.terrain))return {kind:'repair',target:g,id,label:'修理发电机'};
    }
    if(a.action.startsWith('gate:')&&['healthy','injured'].includes(a.life)&&this.objectiveBusy(a)){
      const id=Number(a.action.split(':')[1]),g=this.gates[id];
      if(g&&g.progress<1&&this.powered&&dist(a,g)<TUNING.interactions.gateRange&&lineClear(a,g,this.terrain))return {kind:'gate',target:g,id,label:'开启出口门'};
    }
    const list:Interaction[]=[];const add=(kind:Interaction['kind'],target:Point,id:number,label:string,range=TUNING.interactions.defaultRange)=>{if(dist(a,target)<range&&lineClear(a,target,this.terrain))list.push({kind,target,id,label});};
    if(a.role==='killer'){
      if(this.carried!==null){this.hooks.filter(h=>h.occupant===null).forEach(h=>add('hook',h,h.id,'挂上钩子'));}
      else {this.pallets.filter(p=>p.state==='down').forEach(p=>add('break',p,p.id,'破坏木板'));this.generators.filter(g=>g.progress>0&&g.progress<1&&!g.regressing).forEach(g=>add('kick',g,g.id,'破坏发电机'));if(this.hatch.open)add('hatch',this.hatch,0,'关闭地窖');}
    }else if(a.life==='healthy'||a.life==='injured'){
        this.survivors.filter(s=>s.id!==a.id&&s.lockerId===undefined).forEach(s=>{if(s.life==='hooked')add('rescue',s,s.id,'救下队友',TUNING.interactions.rescueRange);else if((s.life==='injured'||s.life==='down')&&this.healStationary(s))add('heal',s,s.id,s.life==='down'?'扶起队友':'治疗队友',TUNING.interactions.healRange);});
      if(this.hatch.open)add('hatch',this.hatch,0,'跳入地窖');
      if(this.powered)this.gates.filter(g=>g.progress<1).forEach(g=>add('gate',g,g.id,'开启出口门',TUNING.interactions.gateRange));
      else this.generators.filter(g=>g.progress<1).forEach(g=>add('repair',g,g.id,'修理发电机',TUNING.interactions.repairRange));
    }else if(a.life==='down')add('recover',a,a.id,'自我恢复');
    if(['healthy','injured'].includes(a.life)&&(a.role==='survivor'||this.carried===null))for(const l of this.lockers)if(a.role==='killer'||l.occupant===null)add('locker',lockerDoor(l),l.id,a.role==='killer'?'搜查衣柜':'躲入衣柜',TUNING.interactions.lockerRange);
    return list.sort((a1,b)=>dist(a,a1.target)-dist(a,b.target))[0]??null;
  }
  private setHealingProgress(target:Actor,value:number){
    const progress=Math.max(0,Math.min(1,value));if(target.life==='down')target.recover=progress;else target.healProgress=progress;
    for(const healer of this.survivors)if(healer.action==='heal:'+target.id)healer.progress=progress;
    if(target.action==='recover:'+target.id)target.progress=progress;
  }
  work(a:Actor,i:Interaction,dt:number){
    if(i.kind==='heal'&&!['injured','down'].includes(this.actors[i.id].life))return;
    if(i.kind==='hatch'&&a.role==='survivor'){if(this.canEnterHatch(a))this.escape(a);return;}
    if(i.kind==='heal'&&this.objectiveBusy(this.actors[i.id]))return;
    if(i.kind==='heal'&&!this.healStationary(this.actors[i.id])){this.interruptHealing(this.actors[i.id]);return;}
    if(i.kind==='locker'){this.workLocker(a,i.id,dt);return;}
    if(a.lockerId!==undefined)return;
    if(i.kind==='repair'&&(this.generators[i.id].blockedUntil??0)>this.time)return;
    if(a.cooldown>0||dist(a,i.target)>TUNING.interactions.workRange||!lineClear(a,i.target,this.terrain))return;
    if(i.kind==='gate')this.skills[a.id]=null;
      const token=`${i.kind}:${i.id}`;if(a.action!==token){a.progress=0;a.workStarted=this.time;}a.action=token;a.crouching=false;a.moving=false;a.workAt=this.time;
    if(i.kind!=='recover'){
      const d=dist(a,i.target),radius=i.kind==='heal'?TUNING.interactions.healStandOff:i.kind==='rescue'?TUNING.interactions.rescueStandOff:TUNING.interactions.workStandOff;
      if(d>radius+1){const fraction=(1-Math.exp(-dt*TUNING.interactions.workApproachRate))*(d-radius)/d,dest={x:a.x+(i.target.x-a.x)*fraction,y:a.y+(i.target.y-a.y)*fraction,level:a.level};if(!blocked(dest,TUNING.movement.collisionRadius,this.obstacles())&&lineClear(a,dest,this.obstacles(),TUNING.movement.collisionRadius)){a.x=dest.x;a.y=dest.y;}}
    }
    if(i.kind==='repair'){
      const g=this.generators[i.id];if(g.progress>=1)return;g.regressing=false;const peers=this.survivors.filter(s=>s.action===token).length;
      const delta=dt/CONFIG.repairTime/(1+Math.max(0,peers-1)*TUNING.actions.repairPeerPenalty);g.progress=Math.min(1,g.progress+delta);a.stats.repair+=delta;
      if(g.progress>=1){this.noise(g);this.alerts.push({...g,type:'generator-complete',until:this.time+TUNING.alerts.generatorSeconds});this.emit('generator','一台发电机已修复 · 位置已向屠夫暴露',g);}
      if(a.id===this.playerId)this.checkSkill(dt,a);
    }else if(i.kind==='heal'){
      const s=this.actors[i.id];this.setHealingProgress(s,healingProgress(s)+dt/CONFIG.healTime*TUNING.actions.healPerHelperMultiplier);
      if(a.id===this.playerId)this.checkSkill(dt,a);
      if(healingProgress(s)>=1){s.life=s.life==='down'?'injured':'healthy';s.recover=0;s.healProgress=0;for(const healer of this.survivors)if(healer.action==='heal:'+s.id){healer.progress=0;healer.action='';this.skills[healer.id]=null;}this.emit('heal',`${s.name} 已恢复`,s);}
    }else if(i.kind==='recover'){this.setHealingProgress(a,Math.max(a.recover,Math.min(TUNING.actions.recoverCap,a.recover+dt/TUNING.actions.recoverSeconds)));a.progress=a.recover;}
    else if(i.kind==='rescue'){
      a.progress+=dt/CONFIG.rescueTime;if(a.progress>=1){const s=this.actors[i.id];this.hooks.forEach(h=>{if(h.occupant===s.id)h.occupant=null;});s.motionFrom={x:s.x+TUNING.physics.hookBodyOffsetX,y:s.y+TUNING.physics.hookBodyOffsetY,level:s.level};s.motionDuration=TUNING.actions.rescueTransition;s.transition=TUNING.actions.rescueTransition;s.life='injured';s.invulnerable=TUNING.actions.rescueProtection;s.boost=TUNING.movement.boostSeconds;s.hookTime=0;this.noise(s);a.stats.rescues++;a.progress=0;this.emit('rescue',`${s.name} 被救下`,s);}
    }else if(i.kind==='gate'){const g=this.gates[i.id];g.progress=Math.min(1,g.progress+dt/CONFIG.gateTime);if(g.progress===1&&g.openedAt===undefined){g.openedAt=this.time;this.startEndgame();this.emit('gate','出口已开启，立即撤离',g);}}
    else if(i.kind==='hook'){a.progress+=dt/TUNING.actions.hookSeconds;if(a.progress>=1)this.hang(this.hooks[i.id]);}
    else if(i.kind==='break'){const old=a.progress;a.progress+=dt/TUNING.actions.breakPalletSeconds;for(const beat of TUNING.actions.breakImpacts)if(old<beat&&a.progress>=beat)this.emit('stomp','',i.target);if(a.progress>=1){this.pallets[i.id].state='broken';this.pallets[i.id].brokenAt=this.time;a.progress=0;this.emit('break','木板已破坏',i.target);}}
    else if(i.kind==='kick'){const old=a.progress;a.progress+=dt/TUNING.actions.kickSeconds;if(old<TUNING.actions.kickImpact&&a.progress>=TUNING.actions.kickImpact)this.emit('metal-kick','',i.target);if(a.progress>=1){const g=this.generators[i.id];g.progress=Math.max(0,g.progress-TUNING.actions.kickLoss);g.regressing=true;a.progress=0;this.explodeGenerator(g,0);this.emit('kick','发电机开始倒退',g);}}
    else if(i.kind==='hatch'){if(a.role==='killer'){this.hatch.open=false;this.hatch.closed=true;this.powered=true;this.startEndgame();this.emit('hatch','地窖已关闭，出口门已通电');}else this.escape(a);}
  }
  workLocker(a:Actor,id:number,dt:number){
    if(a.id===this.playerId&&this.lockerHeld)return;
    const l=this.lockers[id];if(!l||a.cooldown>0||a.transition>0||!['healthy','injured'].includes(a.life))return;
    const inside=a.lockerId===id,door=lockerDoor(l);
    if(!inside&&(dist(a,door)>TUNING.interactions.lockerRange||!lineClear(a,door,this.terrain)))return;
    if(a.role==='killer'&&this.carried!==null||a.role==='survivor'&&!inside&&l.occupant!==null)return;
    const token='locker:'+id;if(a.action!==token){a.progress=0;a.workStarted=this.time;this.emit('locker','',l);}
    a.action=token;a.workAt=this.time;a.moving=false;a.running=false;a.progress+=dt/(a.role==='killer'?TUNING.lockers.searchSeconds:TUNING.lockers.enterSeconds);
    l.openedAt=this.time;
    if(a.progress<1)return;
    if(a.role==='survivor'){
      if(inside){
        if(blocked(door,TUNING.movement.collisionRadius,this.obstacles())||this.bodyBlocked(a,door))return;
        l.occupant=null;a.lockerId=undefined;Object.assign(a,door);this.emit('locker','离开衣柜',l);
      }else{
        l.occupant=a.id;l.enteredAt=this.time;l.lastAlertAt=undefined;a.lockerId=id;Object.assign(a,{x:l.x,y:l.y,level:l.level});a.crouching=false;
        this.skill=null;this.emit('locker','已躲入衣柜 · 按住 E 离开',l);
      }
      a.cooldown=TUNING.lockers.exitCooldown;
    }else{
      l.searchedAt=this.time;
      if(l.occupant!==null){
        const s=this.actors[l.occupant];l.occupant=null;s.lockerId=undefined;s.life='carried';s.struggle=0;s.nextWiggleAt=this.time;
        s.motionFrom={x:l.x,y:l.y,level:l.level};s.motionDuration=TUNING.lockers.grabSeconds;s.transition=TUNING.lockers.grabSeconds;s.lockerGrab=true;s.vaultKind=undefined;s.invulnerable=0;
        s.x=a.x;s.y=a.y-TUNING.physics.carryOffsetY;s.level=a.level;this.carried=s.id;
        a.transition=TUNING.lockers.grabSeconds;a.cooldown=TUNING.lockers.grabCooldown;a.charge=0;a.lunge=undefined;this.emit('locker-grab','从衣柜中抓住幸存者',l);
      }else{a.cooldown=TUNING.lockers.emptyCooldown;this.emit('locker','衣柜是空的',l);}
    }
    if(a.id===this.playerId)this.lockerHeld=true;
    a.action='';a.progress=0;a.path=[];a.pathAge=0;
  }
  checkSkill(dt:number,a:Actor){const before=this.nextSkill;this.nextSkill-=dt;if(!this.skill&&before>TUNING.skill.warningSeconds&&this.nextSkill<=TUNING.skill.warningSeconds)this.emit('skill-warning','',undefined,a.id);if(this.nextSkill<=0&&!this.skill){const start=TUNING.skill.startMin+this.rng()*TUNING.skill.startRandom;this.skill={value:0,start,end:start+TUNING.skill.width,actor:a.id};this.emit('skill','校准 · 指针进入亮区时按空格',undefined,a.id);}}
  explodeGenerator(g:Generator,lockSeconds:number){
    if(lockSeconds>0)this.alerts.push({...g,type:'generator-fail',until:this.time+TUNING.alerts.generatorSeconds});
    g.blockedUntil=Math.max(g.blockedUntil??0,this.time+lockSeconds);
    for(const a of this.survivors)if(a.action==='repair:'+g.id){a.action='';a.progress=0;a.workAt=undefined;}
    if(this.skill&&this.actors[this.skill.actor].action==='')this.skill=null;
    this.noise(g);this.emit('generator-blast',lockSeconds>0?`发电机爆炸 · 冷却${lockSeconds}秒，暂时无法维修`:'发电机被破坏',g);
  }
  resolveSkill(){
    if(!this.skill)return;const s=this.skill,a=this.actors[s.actor],success=s.value>=s.start&&s.value<=s.end;this.skill=null;this.nextSkill=TUNING.skill.intervalMin+this.rng()*TUNING.skill.intervalRandom;
    if(success){this.emit('success','校准成功');return;}
    if(a.life==='hooked'){a.hookTime+=TUNING.skill.hookPenalty;this.emit('fail','挣扎失败，献祭加速');return;}
    if(a.action.startsWith('repair:')){const g=this.generators[Number(a.action.split(':')[1])];g.progress=Math.max(0,g.progress-TUNING.skill.repairLoss);a.cooldown=TUNING.skill.failureCooldown;this.explodeGenerator(g,CONFIG.repairLockTime);return;}
    if(a.action.startsWith('heal:')){const target=this.actors[Number(a.action.split(':')[1])];this.setHealingProgress(target,healingProgress(target)-TUNING.skill.healLoss);a.cooldown=TUNING.skill.failureCooldown;this.noise(a);this.emit('fail',`治疗校准失败 · 进度减少 ${Math.round(TUNING.skill.healLoss*100)}%`,a);return;}
    a.progress=0;a.cooldown=TUNING.skill.failureCooldown;this.noise(a);this.emit('fail','校准失败！位置已暴露',a);
  }
  noise(p:Point){this.traces.push({...p,kind:'noise',until:this.time+TUNING.alerts.noiseSeconds,angle:0});}
  attack(charge=0){
    const k=this.killer;if(k.cooldown>0)return;if(this.carried===null&&this.grabVault())return;
    if(this.carried!==null)charge=0;
    charge=Math.max(0,Math.min(1,charge));k.charge=0;k.attackAt=this.time;k.attackCharge=charge;k.attackAngle=k.angle;k.wipeUntil=undefined;k.action='攻击';k.cooldown=attackRecovery(charge);
    if(charge>TUNING.actions.lungeThreshold){k.lunge={elapsed:0,angle:k.angle,hit:false};return;}
    this.emit('swing','',k);if(!this.attackContact(CONFIG.attackRange,k.angle))this.emit('miss','',k);
  }
  attackTarget(reach:number,angle:number){
    const k=this.killer;return this.survivors.filter(s=>s.lockerId===undefined&&(s.life==='healthy'||s.life==='injured')&&dist(k,s)<reach&&Math.cos(Math.atan2(s.y-k.y,s.x-k.x)-angle)>Math.cos(CONFIG.attackHalfAngle)).sort((a,b)=>dist(k,a)-dist(k,b))[0];
  }
  attackObstacles(target?:Actor){return this.obstacles(true,!target||!!target.crouching);}
  private attackContact(reach:number,angle:number){
      const k=this.killer,target=this.attackTarget(reach,angle),end=target??{x:k.x+Math.cos(angle)*reach,y:k.y+Math.sin(angle)*reach,level:k.level},ob=this.attackObstacles(target);
      const distance=dist(k,end),steps=Math.max(1,Math.ceil(distance/2));
      for(let i=1;i<=steps;i++){const point={x:k.x+(end.x-k.x)*i/steps,y:k.y+(end.y-k.y)*i/steps,level:k.level};if(blocked(point,0,ob)){this.emit('weapon-block','刀刃被遮挡',point);return true;}}

if (!target)
    return false; k.wipeUntil=k.attackAt+attackRecovery(k.attackCharge,true);k.cooldown = Math.max(k.cooldown, attackRecovery(k.attackCharge, true) - (this.time - k.attackAt)); if (target.invulnerable > 0) {
    target.boost = TUNING.movement.boostSeconds;
    this.emit("hit", "保护生效", target);
    return true;
} target.life = target.life === "healthy" ? "injured" : "down"; target.boost = target.life === "injured" ? TUNING.movement.boostSeconds : 0; target.recover = 0;target.healProgress=0;this.chaseUntil.fill(0);if(target.life!=="down")this.chaseUntil[target.id]=this.time+TUNING.match.chaseMemory; k.stats.hits++; this.emit("hit", `${target.name} ${target.life === "down" ? "倒地" : "受伤"}`, target); return true; }
private advanceLunge(dt:number) { const k = this.killer, l = k.lunge; if (!l)
    return; if (k.action !== "攻击") {
    k.lunge = void 0;
    return;
} const before = l.elapsed; l.elapsed += dt; if (before < LUNGE.windup && l.elapsed >= LUNGE.windup)
    this.emit("swing", "", k); const travel = Math.max(0, Math.min(l.elapsed, LUNGE.end) - Math.max(before, LUNGE.windup)) * LUNGE.distance / (LUNGE.end - LUNGE.windup); const count = Math.max(1, Math.ceil(travel / 4)), ob = this.obstacles(); for (let i = 0; i < count; i++) {
    const next = { x: k.x + Math.cos(l.angle) * travel / count, y: k.y + Math.sin(l.angle) * travel / count, level: k.level };
    if (this.exitBlocked(k, next) || blocked(next,TUNING.movement.collisionRadius,ob) || this.bodyBlocked(k,next))
        break;
    k.x = next.x;
    k.y = next.y;
} if (!l.hit && l.elapsed >= LUNGE.contact)
    l.hit = this.attackContact(CONFIG.lungeRange, l.angle); if (l.elapsed >= LUNGE.end) {
    if (!l.hit)
        this.emit("miss", "", k);
    k.lunge = void 0;
} }
private vaultGrabTarget() { const k=this.killer; return this.survivors.find(s=>s.life==="injured"&&s.invulnerable<=0&&s.action==="翻越"&&s.vaultKind==="window"&&s.transition>0&&s.motionFrom&&s.motionDuration&&dist(k,actorPosition(s))<TUNING.interactions.vaultGrabRange&&lineClear(k,actorPosition(s),this.terrain)&&Math.cos(Math.atan2(actorPosition(s).y-k.y,actorPosition(s).x-k.x)-k.angle)>TUNING.interactions.vaultGrabCosine); }
private carryDropPoint(){const k=this.killer;return [[TUNING.movement.carryDropOffset,0],[-TUNING.movement.carryDropOffset,0],[0,TUNING.movement.carryDropOffset],[0,-TUNING.movement.carryDropOffset]].map(([x,y])=>({x:k.x+x,y:k.y+y,level:k.level})).find(p=>!blocked(p,TUNING.movement.collisionRadius,this.obstacles())&&lineClear(k,p,this.obstacles(),TUNING.movement.collisionRadius)&&!this.bodyBlocked(k,p));}
carryAction():'pickup'|'drop'|null { const k=this.killer;if(this.finished||k.cooldown>0||k.transition>0||k.lunge||k.life!=="healthy")return null;if(this.carried!==null)return this.carryDropPoint()?"drop":null;return this.vaultGrabTarget()||this.survivors.some(s=>s.life==="down"&&s.lockerId===undefined&&dist(k,s)<TUNING.interactions.pickupRange&&lineClear(k,s,this.terrain))?"pickup":null;}
grabVault() { const k = this.killer; if (k.cooldown > 0 || this.carried !== null)
    return false; const target = this.vaultGrabTarget(); if (!target)
    return false; this.carried = target.id; target.life = "carried"; target.transition = 0; target.motionFrom = void 0; target.vaultKind = void 0; target.struggle = 0;target.nextWiggleAt=this.time; target.x = k.x; target.y = k.y - TUNING.physics.carryOffsetY; target.level = k.level; k.cooldown = TUNING.actions.pickupCooldown; k.charge = 0; k.lunge = void 0; k.action = "抱起"; this.emit("pickup", target.name + " 翻窗时被抓住", k); return true; }
pickup() { const k = this.killer; if (!this.carryAction())
    return; if (this.grabVault())
    return; if (this.carried !== null) {
    const s2 = this.actors[this.carried];
    s2.life = "down";
    const point=this.carryDropPoint()!;Object.assign(s2,point);
    this.carried = null;
    k.cooldown = TUNING.actions.dropCarriedCooldown;
    return;
} const s = this.survivors.find(a => a.life === "down" && dist(k, a) < TUNING.interactions.pickupRange && lineClear(k, a, this.terrain)); if (s) {
    this.carried = s.id;
    s.life = "carried";
    s.struggle = 0;s.nextWiggleAt=this.time;
    k.cooldown = TUNING.actions.pickupCooldown;
    this.emit("pickup", `${s.name} 被抱起`, k);
} }
hang(h:Hook) { if (this.carried === null || h.occupant !== null)
    return; const s = this.actors[this.carried]; this.carried = null; s.hooks++; s.hookTime = 0; s.x = h.x; s.y = h.y + TUNING.physics.hookOffsetY; s.level = floorOf(h); s.life = "hooked"; s.struggle = 0;s.nextWiggleAt=this.time; h.occupant = s.id; this.killer.cooldown = TUNING.actions.pickupCooldown; this.killer.progress = 0; if (s.hooks >= TUNING.actions.maxHooks)
    this.kill(s);
else
    this.emit("hook", `${s.name} 被挂上钩子`, h); }
kill(s:Actor) { if(s.life==='dead'||s.life==='escaped')return;
 s.deathFrom={...actorPosition(s)};if(s.life==='hooked'){s.deathFrom.x+=TUNING.physics.hookBodyOffsetX;s.deathFrom.y+=TUNING.physics.hookBodyOffsetY;}
 s.deathAt=this.time;s.transition=0;s.moving=false;s.action='';if(s.lockerId!==undefined){this.lockers[s.lockerId].occupant=null;s.lockerId=undefined;}
 s.life = "dead"; this.hooks.forEach(h => { if (h.occupant === s.id)
    h.occupant = null; }); if (this.carried === s.id)
    this.carried = null; this.emit("death", `${s.name} 已被献祭`, s); }
canEnterHatch(a:Actor){return !this.finished&&a.role==='survivor'&&['healthy','injured','down'].includes(a.life)&&a.lockerId===undefined&&this.hatch.open&&!this.hatch.closed&&dist(a,this.hatch)<TUNING.interactions.hatchRange&&lineClear(a,this.hatch,this.obstacles());}
escape(s:Actor) { s.life = "escaped"; s.escapedAt = this.time; this.emit("escape", `${s.name} 成功逃脱`, s); }
startEndgame() { if (!this.endgame)
    this.endgame = CONFIG.endgameTime; }
traverse(a:Actor, to:Point, drop:boolean) { if (a.cooldown > 0 || a.transition > 0 || !["healthy", "injured"].includes(a.life) || blocked(to,TUNING.movement.collisionRadius,this.obstacles()))
    return; a.motionFrom = { x: a.x, y: a.y, level: a.level }; a.motionDuration = drop ? TUNING.traversal.dropSeconds : TUNING.traversal.stairsSeconds; a.x = to.x; a.y = to.y; a.level = floorOf(to); a.transition = drop ? TUNING.traversal.dropSeconds : TUNING.traversal.stairsSeconds; a.cooldown = drop ? a.role === "killer" ? TUNING.traversal.killerLandingSeconds : TUNING.traversal.survivorLandingSeconds : TUNING.traversal.stairsCooldown; a.action = drop ? "落地" : "上下楼"; a.path = []; a.pathAge = 0; this.noise(a); this.emit(drop ? "land" : "stairs", "", a); }
contextualSpace(a:Actor) { if(a.lockerId!==undefined)return; if (this.skill&&a.id===this.playerId) {
    this.resolveSkill();
    return;
} if (a.life === "carried") {
    if(this.time>=(a.nextWiggleAt??0)){a.struggle = Math.min(1, a.struggle + CONFIG.wiggleGain);a.nextWiggleAt=this.time+CONFIG.wiggleInterval;}
    return;
} if (a.life === "hooked") {
    if (a.cooldown > 0)
        return;
    a.cooldown = TUNING.actions.selfRescueCooldown;
    if (a.hooks === 1) {
        a.hookTime += TUNING.actions.selfRescuePenalty;
        if (this.rng() < TUNING.actions.selfRescueChance) {
            a.life = "injured";
            a.invulnerable = TUNING.actions.rescueProtection;
            this.hooks.forEach(h => { if (h.occupant === a.id)
                h.occupant = null; });
            this.noise(a);
            this.emit("rescue", "你挣脱了钩子", a);
        }
        else
            this.emit("fail", "自救失败，加速进入下一阶段");
    }
    return;
} if (a.cooldown > 0 || a.transition > 0 || !["healthy","injured"].includes(a.life))
    return; const drop = drops.find(d => dist(a, d.top) < TUNING.traversal.dropRange); if (drop) {
    this.traverse(a, drop.bottom, true);
    return;
} const stair = this.stairs.find(s => dist(a, floorOf(a) === floorOf(s.bottom) ? s.bottom : s.top) < TUNING.traversal.stairsRange); if (stair) {
    this.traverse(a, floorOf(a) === floorOf(stair.bottom) ? stair.top : stair.bottom, false);
    return;
} const p = this.pallets.find(p2 => p2.state !== "broken" && dist(a, p2) < TUNING.traversal.palletRange && lineClear(a, p2, this.terrain)); if (p && a.role === "survivor") {
    if (p.state === "up") {
        const v=a.velocity??{x:0,y:0},across=p.axis==='x'?v.x:v.y,delta=p.axis==='x'?p.x-a.x:p.y-a.y;
        const runningAcross=!a.crouching&&this.time-(a.movementAt??-10)<TUNING.movement.recentMotionSeconds&&Math.hypot(v.x,v.y)>=TUNING.movement.fastVaultSpeed&&delta*across>0;
        const dest={x:p.axis==='x'?p.x+Math.sign(across)*TUNING.traversal.palletOffset:a.x,y:p.axis==='x'?a.y:p.y+Math.sign(across)*TUNING.traversal.palletOffset,level:a.level};
        const canCross=runningAcross&&!blocked(dest,TUNING.movement.pathRadius,this.obstacles())&&lineClear(a,dest,this.obstacles(),TUNING.movement.collisionRadius)&&!this.bodyBlocked(a,dest);
        p.state = "down";p.droppedAt=this.time;p.dropSide=(p.axis==='x'?a.x<p.x:a.y<p.y)?1:-1;
        this.noise(p);
        this.emit("pallet", "木板落下", p);
        if (dist(this.killer, p) < TUNING.actions.stunRadius) {
            this.killer.cooldown = TUNING.actions.stunSeconds;
            this.killer.action = "眩晕";
        }
        if(canCross){
            a.motionFrom={x:a.x,y:a.y,level:a.level};a.motionDuration=TUNING.traversal.palletDropSeconds;a.transition=TUNING.traversal.palletDropSeconds;
            a.x=dest.x;a.y=dest.y;a.vaultKind=undefined;a.vaultMode=undefined;a.action='放板';
        }else if (blocked(a,TUNING.movement.pathRadius,this.obstacles())) {
            const side = p.axis === "x" ? a.x < p.x ? -1 : 1 : a.y < p.y ? -1 : 1;
            for (const offset of TUNING.traversal.palletUnstuckOffsets) {
                const dest = { x: p.x + (p.axis === "x" ? side * offset : 0), y: p.y + (p.axis === "x" ? 0 : side * offset), level: p.level };
                if (!blocked(dest,TUNING.movement.pathRadius,this.obstacles())) {
                    a.x = dest.x;
                    a.y = dest.y;
                    break;
                }
            }
        }
        a.cooldown = TUNING.traversal.palletDropCooldown;
    }
    else {
        const dest = { x: p.axis === "x" ? p.x + (a.x < p.x ? TUNING.traversal.palletOffset : -TUNING.traversal.palletOffset) : a.x, y: p.axis === "x" ? a.y : p.y + (a.y < p.y ? TUNING.traversal.palletOffset : -TUNING.traversal.palletOffset), level: a.level };
        if (!blocked(dest,TUNING.movement.collisionRadius,this.obstacles())&&!this.bodyBlocked(a,dest)&&!this.actors.some(b=>b.id!==a.id&&b.transition>0&&floorOf(b)===floorOf(dest)&&dist(b,dest)<TUNING.movement.bodyDiameter)) {
            a.motionFrom = { x: a.x, y: a.y, level: a.level };
            a.vaultKind = "pallet";
            const v=a.velocity??{x:0,y:0},towards=p.axis==='x'?(p.x-a.x)*v.x:(p.y-a.y)*v.y;
            const fast=!a.crouching&&this.time-(a.movementAt??-10)<TUNING.movement.recentMotionSeconds&&Math.hypot(v.x,v.y)>=TUNING.movement.fastVaultSpeed&&towards>0;
            a.vaultMode=fast?'fast':'slow';a.vaultWindow=undefined;
            a.motionDuration = fast?TUNING.traversal.palletFastSeconds:TUNING.traversal.palletSlowSeconds;
            a.transition = a.motionDuration;
            a.x = dest.x;
            a.y = dest.y;
            a.cooldown = a.motionDuration;
            a.action = "翻越";
            this.emit("vault", "", a);
            if(a.vaultMode==='fast')this.noise(a);
        }
    }
    return;
} const w = windowSpots.find(w2 => floorOf(w2)===floorOf(a)&&dist(a, w2) < TUNING.traversal.windowRange); if (w) {
    const windowId=windowSpots.indexOf(w);
    if(this.actors.some(b=>b.id!==a.id&&b.vaultKind==="window"&&b.vaultWindow===windowId&&b.action==="翻越"&&b.transition>0&&["healthy","injured"].includes(b.life)))return;
    const dest = { x: w.x + (a.x < w.x ? TUNING.traversal.windowOffset : -TUNING.traversal.windowOffset), y: w.y,level:a.level };
    if (!blocked(dest,TUNING.movement.collisionRadius,this.obstacles())) {
        a.motionFrom = { x: a.x, y: a.y, level: a.level };
        a.vaultKind = "window";
        const v=a.velocity??{x:0,y:0},towards=(w.x-a.x)*v.x+(w.y-a.y)*v.y;
        const fast=!a.crouching&&this.time-(a.movementAt??-10)<TUNING.movement.recentMotionSeconds&&Math.hypot(v.x,v.y)>=TUNING.movement.fastVaultSpeed&&towards>0;
        a.vaultMode=fast?'fast':'slow';a.vaultWindow=windowId;
        a.motionDuration = a.role === "killer" ? TUNING.traversal.killerWindowSeconds : fast ? TUNING.traversal.windowFastSeconds : TUNING.traversal.windowSlowSeconds;
        a.transition = a.motionDuration;
        a.x = dest.x;
        a.y = dest.y;
        a.cooldown = a.motionDuration;
        a.action = "翻越";
        this.emit("vault", "", a);
        if (a.vaultMode === "fast" || a.role === "killer")
            this.noise(a);
    }
} }
private controlPlayer(dt:number,input:Input){if(input.interact&&this.canEnterHatch(this.player)){this.escape(this.player);return;}this.playTaunt(this.player,input.taunt);if(!input.interact)this.lockerHeld=false;const p = this.player; p.crouching = p.role === "survivor" && input.crouch && ["healthy", "injured"].includes(p.life) && p.transition === 0; if (!p.lunge)
    p.angle = input.angle; if (p.role === "killer") {
    if (!p.lunge)
        p.angle = input.angle;
    if (!input.charging && !input.attack)
        this.chargeReleased = false;
    const charging = input.charging && !this.chargeReleased && p.cooldown === 0 && this.carried === null;
    if (charging && p.charge === 0)
        this.emit("charge", "", p);
    p.charge = charging ? Math.min(1, Math.max(.001, input.charge)) : 0;
    if (charging && input.charge >= 1) {
        this.attack(1);
        this.chargeReleased = true;
    }
} if (p.life === "hooked" && p.hooks === 2)
    this.checkSkill(dt, p); if (input.space)
    this.contextualSpace(p); if (p.life === "healthy" || p.life === "injured" || p.life === "down") {
    if (input.special && p.role === "killer")
        this.pickup();
    if (input.attack && p.role === "killer") {
        if (!this.chargeReleased)
            this.attack(input.charge);
        this.chargeReleased = false;
    }
    if (input.dx || input.dy) {
        this.move(p, input.dx, input.dy, dt, input.run, input.crouch);
        if (p.cooldown === 0)
            p.action = "";
        p.progress = 0;
    }
    else {
        const i = input.interact ? this.interaction(p) : null;
        if (i)
            this.work(p, i, dt);
        else if (p.cooldown === 0) {
            p.action = "";
            p.progress = 0;
        }
    }
} if (this.skill) {
    if (!p.action.startsWith("repair:") && !p.action.startsWith("heal:") && p.life !== "hooked") {
        this.skill = null;
        this.nextSkill = TUNING.skill.cancelDelay;
    }
    else {
        this.skill.value += dt / TUNING.skill.sweepSeconds;
        if (this.skill.value > 1)
            this.resolveSkill();
    }
}}
step(dt:number, input:Input = EMPTY_INPUT) {if (this.finished){if(this.deathAnimating)this.time+=dt;return;} this.time += dt; this.movingInputs=new Set([...(this.humanInputs??new Map([[this.playerId,input]]))].filter(([,i])=>i.dx!==0||i.dy!==0).map(([id])=>id));for(const id of this.movingInputs)this.interruptHealing(this.actors[id]); if(this.active.length>0&&this.active.every(s=>s.life==="hooked"))this.active.forEach(s=>this.kill(s)); this.traces = this.traces.filter(t => t.until > this.time); this.alerts = this.alerts.filter(t => t.until > this.time); for (const a of this.actors) {
    if(a.lockerId!==undefined&&!['healthy','injured'].includes(a.life)){this.lockers[a.lockerId].occupant=null;a.lockerId=undefined;}
    a.transition = Math.max(0, a.transition - dt);
    a.cooldown = Math.max(0, a.cooldown - dt);
    a.boost = Math.max(0, a.boost - dt);
    a.invulnerable = Math.max(0, a.invulnerable - dt);
    a.moving = false;
    a.running = false;
    if (a.id !== this.playerId || !input.crouch)
        a.crouching = false;
    if (a.life === "down") {
        a.bleed = Math.min(CONFIG.bleedTime,a.bleed+dt);
        if (a.bleed >= CONFIG.bleedTime)
            this.kill(a);
    }
    if (a.life === "hooked") {
        a.hookTime += dt;
        if (a.hookTime >= CONFIG.hookPhase) {
            if (a.hooks === 1) {
                a.hooks = 2;
                a.hookTime = 0;
                this.emit("hook", `${a.name} 进入挣扎阶段`, a);
            }
            else
                this.kill(a);
        }
    }
} for(const l of this.lockers){
 if(l.occupant!==null&&l.enteredAt!==undefined&&this.time-l.enteredAt>=CONFIG.lockerAlertDelay&&this.time-(l.lastAlertAt??-Infinity)>=CONFIG.lockerAlertInterval){
 l.lastAlertAt=this.time;this.noise(l);this.alerts.push({...l,type:'locker',until:this.time+TUNING.alerts.lockerSeconds});this.emit('locker-alert',this.player.role==='killer'?'乌鸦暴露了藏人的衣柜':l.occupant===this.playerId?'躲藏太久，乌鸦正在暴露你的位置':'',l);
 }
} this.advanceLunge(dt); const localId=this.playerId;
 for(const [id,control] of this.humanInputs??new Map([[localId,input]])){this.playerId=id;this.controlPlayer(dt,control);}this.playerId=localId;
 for (const s of this.survivors)
    if (this.humanInputs?!this.humanInputs.has(s.id):s.id !== this.playerId)
        this.survivorAI(s, dt); if (this.humanInputs?!this.humanInputs.has(4):this.playerId !== 4)
    this.killerAI(dt); if (this.carried !== null) {
    const s = this.actors[this.carried];
    s.x = this.killer.x;
    s.y = this.killer.y - TUNING.physics.carryOffsetY;
    s.level = this.killer.level;
    s.struggle += dt / ((this.humanInputs?this.humanInputs.has(s.id):s.id===this.playerId) ? CONFIG.carryPlayerTime : CONFIG.carryAITime);
    if (s.struggle >= 1) {
        this.carried = null;
        s.life = "injured";
        s.invulnerable = TUNING.actions.wiggleProtection;
        s.boost = TUNING.movement.boostSeconds;
        this.killer.cooldown = TUNING.actions.wiggleStun;
        this.killer.action = "眩晕";
        this.emit("rescue", `${s.name} 挣脱搬运`, s);
    }
} for (const g of this.generators)
    if (g.regressing && g.progress < 1)
        g.progress = Math.max(0, g.progress - dt / CONFIG.repairTime * TUNING.actions.regressionMultiplier); if (!this.powered && this.repaired >= TUNING.match.requiredGenerators) {
    this.powered = true;
    this.emit("gate", `${TUNING.match.requiredGenerators} 台发电机已修复 · 出口门已通电`);
} for(const s of this.active)if(['healthy','injured','down'].includes(s.life)&&this.gates.some(g=>gateOpening(g,this.time)>=1&&dist(s,gateExit(g))<TUNING.match.escapeRadius))this.escape(s);
 if (this.active.length > 0 && this.active.every(s=>s.life === "hooked"))
    this.active.forEach(s=>this.kill(s)); if (this.active.length === 1 && !this.hatch.open && !this.hatch.closed) {
    this.hatch.open = true;
    this.emit("hatch", "地窖已开启");
} if (this.endgame > 0) {
    this.endgame -= dt;
    if (this.endgame <= 0) {
        this.endgame = 0;
        this.active.forEach(s => this.kill(s));
    }
} if (this.active.length === 0 && !this.survivors.some(s => s.escapedAt !== void 0 && this.time - s.escapedAt < TUNING.match.escapeAnimationSeconds)) {
    this.finished = true;
    this.emit("end", "对局结束");
} const previous=this.chasedSurvivor;
 const candidates=this.survivors.filter(s=>['healthy','injured'].includes(s.life)&&s.lockerId===undefined&&this.carried===null&&dist(s,this.killer)<TUNING.match.chaseRange&&this.canSee(this.killer,s)&&(s.moving||this.killer.moving||this.time-this.killer.attackAt<TUNING.match.chaseAttackGrace));
 const score=(s:Actor)=>dist(s,this.killer)+Math.abs(Math.atan2(Math.sin(Math.atan2(s.y-this.killer.y,s.x-this.killer.x)-this.killer.angle),Math.cos(Math.atan2(s.y-this.killer.y,s.x-this.killer.x)-this.killer.angle)))*TUNING.match.chaseAimWeight;
 candidates.sort((a,b)=>score(a)-score(b));let chased=candidates[0]??previous;
 if(previous&&candidates.includes(previous)&&chased&&score(previous)<=score(chased)+TUNING.match.chaseSwitchMargin)chased=previous;
 const until=chased?(candidates.includes(chased)?this.time+TUNING.match.chaseMemory:this.chaseUntil[chased.id]):0;
 this.chaseUntil.fill(0);if(chased){this.chaseUntil[chased.id]=until;chased.stats.chase+=dt;}
}
survivorAI(s:Actor, dt:number) { if(s.lockerId!==undefined||s.transition>0)return; if (s.life === "hooked" || s.life === "carried" || s.life === "dead" || s.life === "escaped")
    return;
 if(s.life==='down'){
   const gate=this.gates.filter(g=>gateOpening(g,this.time)>=1).sort((a,b)=>dist(s,gateExit(a))-dist(s,gateExit(b)))[0];
   if(gate&&(!this.hatch.open||this.hatch.closed||dist(s,gateExit(gate))<dist(s,this.hatch))){this.navigate(s,gateExit(gate),dt,false);return;}
 }
 if (s.life === "down"&&this.hatch.open&&!this.hatch.closed) {if(this.canEnterHatch(s))this.escape(s);else this.navigate(s,this.hatch,dt,false);return;} if (s.life === "down") {
    this.setHealingProgress(s,Math.max(s.recover,Math.min(TUNING.actions.recoverCap,s.recover+dt/TUNING.actions.recoverSeconds)));
    s.action = "recover:" + s.id;
    return;
} if (!this.objectiveBusy(s)&&this.survivors.some(a => a.id !== s.id && a.action === `heal:${s.id}` && dist(a, s) < TUNING.interactions.healRange) && dist(s, this.killer) > TUNING.ai.workSafeRange) {
    s.action = "接受治疗";
    s.moving = false;
    return;
} const k = this.killer, danger = dist(s, k), seen = this.canSee(s, k); if (danger < TUNING.ai.dangerRange && seen && this.carried === null) {
    s.action = "";
    s.progress = 0;
    const pallet = this.pallets.find(p => p.state === "up" && dist(s, p) < TUNING.ai.palletRange && dist(k, p) < TUNING.ai.palletThreatRange);
    if (pallet)
        this.contextualSpace(s);
    if (!s.target || s.pathAge <= 0 || dist(s, s.target) < TUNING.ai.targetArrival) {
        const candidates:Point[] = this.pallets.filter(p => p.state === "up" && floorOf(p) === floorOf(s) && dist(s, p) < TUNING.ai.loopSearchRange).map(p => ({ x: p.x+(p.axis==='x'?(k.x<p.x?TUNING.ai.loopOffset:-TUNING.ai.loopOffset):0), y: p.y+(p.axis==='x'?0:(k.y<p.y?TUNING.ai.loopOffset:-TUNING.ai.loopOffset)), level: s.level }));
        if (floorOf(s) === 1)
            candidates.push(...drops.map(d => d.top));
        else if (danger < TUNING.ai.stairsDangerRange && dist(s, stairs[0].bottom) < TUNING.ai.stairsSearchRange)
            candidates.push(stairs[0].top);
        for (let i = 0; i < TUNING.ai.fleeDirections; i++) {
            const angle = i * Math.PI * 2 / TUNING.ai.fleeDirections;
            const p = { x: Math.max(TUNING.ai.fleeBounds.left, Math.min(TUNING.ai.fleeBounds.right, s.x + Math.cos(angle) * TUNING.ai.fleeDistance)), y: Math.max(TUNING.ai.fleeBounds.top, Math.min(TUNING.ai.fleeBounds.bottom, s.y + Math.sin(angle) * TUNING.ai.fleeDistance)), level: s.level };
            if (!blocked(p, TUNING.ai.fleeRadius, this.obstacles()))
                candidates.push(p);
        }
        candidates.sort((a, b) => dist(b, k) + (lineClear(k, b, this.terrain) ? 0 : TUNING.ai.coverBonus) - (dist(a, k) + (lineClear(k, a, this.terrain) ? 0 : TUNING.ai.coverBonus)));
        s.target = candidates[0] ?? {...TUNING.ai.fallback};
        s.path = [];
        s.pathAge = 0;
    }
    const target = { ...s.target };
    if (drops.some(d => dist(s, d.top) < TUNING.ai.dropRange))
        this.contextualSpace(s);
    else
        this.navigate(s, target, dt);
    return;
} if (this.hatch.open) {
    if (dist(s, this.hatch) < TUNING.ai.hatchRange)
        this.escape(s);
    else
        this.navigate(s, this.hatch, dt);
    return;
} const hooked = this.survivors.filter(t => t.life === "hooked"); for (const t of hooked) {
    const rescuers = this.survivors.filter(a => (a.life === "healthy" || a.life === "injured") && !(this.humanInputs?this.humanInputs.has(a.id):a.id===this.playerId)&&a.lockerId===undefined).sort((a,b)=>{const score=(a:Actor)=>dist(a,t)+(a.life==='injured'?TUNING.ai.rescueInjuredPenalty:0)+(a.action.startsWith('repair:')?TUNING.ai.rescueRepairPenalty:0);return score(a)-score(b);});
    if (!this.survivors.some(a=>a.id!==s.id&&a.action==='rescue:'+t.id&&this.time-(a.workAt??-10)<TUNING.interactions.healGrace)&&rescuers[0]?.id === s.id && (dist(k, t) > TUNING.ai.rescueSafeRange || t.hookTime > TUNING.ai.rescueUrgentSeconds || this.carried !== null)) {
        if (dist(s, t) < TUNING.ai.rescueRange && lineClear(s, t, this.terrain))
            this.work(s, { kind: "rescue", target: t, id: t.id, label: "" }, dt);
        else {
            s.action = "";
            this.navigate(s, t, dt);
        }
        return;
    }
}
 if(s.action.startsWith('gate:')&&this.objectiveBusy(s)){const i=this.interaction(s);if(i?.kind==='gate'){this.work(s,i,dt);return;}}
 const hurt = this.survivors.filter(t => t.id !== s.id && t.lockerId===undefined&&!this.objectiveBusy(t)&&!this.survivors.some(a=>a.id!==s.id&&a.action==='heal:'+t.id&&this.time-(a.workAt??-10)<TUNING.interactions.healGrace)&&(t.life === "down" || t.life === "injured") && dist(t, k) > TUNING.ai.workSafeRange).sort((a, b) => (a.life === "down" ? -TUNING.ai.downHealBonus : 0) + dist(s, a) - ((b.life === "down" ? -TUNING.ai.downHealBonus : 0) + dist(s, b)))[0]; if (hurt && dist(s, hurt) < (hurt.life === "down" ? TUNING.ai.downHealRange : TUNING.ai.injuredHealRange)) {
    if (dist(s, hurt) < TUNING.ai.healRange && lineClear(s, hurt, this.terrain))
        this.work(s, { kind: "heal", target: hurt, id: hurt.id, label: "" }, dt);
    else {
        s.action = "";
        this.navigate(s, hurt, dt);
    }
    return;
} if (this.powered) {
    const gate = [...this.gates].sort((a, b) => dist(s, a) + (a.progress === 1 ? -TUNING.ai.openGateBonus : 0) - dist(s, b) - (b.progress === 1 ? -TUNING.ai.openGateBonus : 0))[0];
    if (gate.progress >= 1) {
        this.navigate(s, gateExit(gate), dt);
        return;
    }
    if (dist(s, gate) < TUNING.ai.gateRange) {
        if (gate.progress < 1)
            this.work(s, { kind: "gate", target: gate, id: gate.id, label: "" }, dt);
        else
            this.navigate(s, gateExit(gate), dt);
    }
    else {
        s.action = "";
        this.navigate(s, gate, dt);
    }
    return;
} const gens = this.generators.filter(g2 => g2.progress < 1&&(g2.blockedUntil??0)<=this.time).sort((a, b) => { const score = (g2:Generator) => dist(s, g2) + (dist(g2, k) < TUNING.ai.generatorDangerRange ? TUNING.ai.generatorDangerPenalty : 0) + this.survivors.filter(t => t.id !== s.id && t.action === `repair:${g2.id}`).length * TUNING.ai.generatorPeerPenalty; return score(a)-a.progress*TUNING.ai.generatorProgressBonus - (score(b)-b.progress*TUNING.ai.generatorProgressBonus); }); const g = gens[0]; if (g) {
    if (dist(s, g) < TUNING.ai.repairRange && lineClear(s, g, this.terrain))
        this.work(s, { kind: "repair", target: g, id: g.id, label: "" }, dt);
    else {
        s.action = "";
        this.navigate(s, g, dt);
    }
} }
killerAI(dt:number) { const k = this.killer; if (k.cooldown > 0)
      return; if (this.carried !== null) {
      const blocker=this.attackTarget(CONFIG.attackRange,k.angle);
      if(blocker&&lineClear(k,blocker,this.attackObstacles(blocker))){this.attack(0);return;}
    const hook = this.hooks.filter(h => h.occupant === null).sort((a, b) => dist(k, a) - dist(k, b))[0];
    if (hook) {
        if (dist(k, hook) < TUNING.ai.hookRange)
            this.work(k, { kind: "hook", target: hook, id: hook.id, label: "" }, dt);
        else {
            k.action = "";
            this.navigate(k, hook, dt);
        }
    }
    return;
} const visible = this.survivors.filter(s => (s.life === "healthy" || s.life === "injured" || s.life === "down") && this.canSee(k, s)).sort((a,b)=>{const score=(s:Actor)=>dist(k,s)+(s.life==='injured'?-TUNING.ai.injuredTargetBonus:0)+(s.life==='down'?(dist(k,s)<TUNING.ai.downTargetRange?-TUNING.ai.nearDownBonus:TUNING.ai.farDownPenalty):0);return score(a)-score(b);}); const target = visible[0]; if (target) {
    const lead={x:target.x+(target.velocity?.x??0)*TUNING.ai.leadSeconds,y:target.y+(target.velocity?.y??0)*TUNING.ai.leadSeconds,level:target.level};
    this.lastKnown=target.moving&&!blocked(lead,TUNING.movement.collisionRadius,this.obstacles())&&lineClear(target,lead,this.obstacles(),TUNING.movement.collisionRadius)?lead:{x:target.x,y:target.y,level:target.level};
    this.memoryUntil = this.time + TUNING.ai.sightMemory;
    if (target.life === "down" && dist(k, target) < TUNING.ai.pickupRange) {
        this.pickup();
        return;
    }
    if (target.life !== "down" && dist(k, target) < CONFIG.attackRange && lineClear(k, target, this.attackObstacles(target))) {
        k.angle = Math.atan2(target.y - k.y, target.x - k.x);
        this.attack();
        return;
    }
} const nearPallet = this.pallets.filter(p => p.state === "down" && floorOf(p)===floorOf(k)&&dist(k, p) < (target&&!lineClear(k,target,this.obstacles())?TUNING.ai.blockedPalletRange:TUNING.ai.breakRange)).sort((a,b)=>dist(k,a)-dist(k,b))[0]; if (nearPallet && this.lastKnown) {
    if(dist(k,nearPallet)>=TUNING.ai.breakRange){
      const approaches=[-TUNING.traversal.palletOffset,TUNING.traversal.palletOffset].map(offset=>({x:nearPallet.x+(nearPallet.axis==='x'?offset:0),y:nearPallet.y+(nearPallet.axis==='x'?0:offset),level:nearPallet.level})).filter(p=>!blocked(p,TUNING.movement.collisionRadius,this.obstacles())).sort((a,b)=>dist(k,a)-dist(k,b));
      const approach=approaches.find(p=>{const path=findPath(k,p,this.obstacles());return path.length&&dist(path.at(-1)!,p)<TUNING.ai.pathGoalTolerance;});
      if(approach){this.navigate(k,approach,dt);return;}
    }else {this.work(k, { kind: "break", target: nearPallet, id: nearPallet.id, label: "" }, dt);
    return;}
} if (!target) {
    const locker=this.lockers.find(l=>this.lastKnown&&dist(l,this.lastKnown)<TUNING.ai.lockerMemoryRange&&dist(k,lockerDoor(l))<TUNING.interactions.lockerRange&&this.time-l.searchedAt>TUNING.ai.lockerRetrySeconds);
    if(locker){this.workLocker(k,locker.id,dt);return;}
    const noise = this.traces.filter(t => t.kind === "noise" || dist(k, t) < TUNING.ai.traceRange && this.canSee(k, t)).at(-1);
    if (noise) {
        this.lastKnown = { x: noise.x, y: noise.y, level: noise.level };
        this.memoryUntil = this.time + TUNING.ai.noiseMemory;
    }
} if (this.lastKnown && this.time < this.memoryUntil && dist(k, this.lastKnown) > TUNING.ai.rememberedArrival) {
    k.action = "";
    this.navigate(k, this.lastKnown, dt);
    return;
} this.lastKnown = null; if (this.hatch.open && dist(k, this.hatch) < TUNING.ai.hatchCloseRange) {
    this.work(k, { kind: "hatch", target: this.hatch, id: 0, label: "" }, dt);
    return;
} const g=[...this.generators].sort((a,b)=>{const score=(g:Generator)=>dist(k,g)-g.progress*TUNING.ai.patrolProgressBonus+(this.time-(this.inspected.get(g.id)??-100)<TUNING.ai.patrolRetrySeconds?TUNING.ai.patrolVisitedPenalty:0)+(g.progress>=1?TUNING.ai.patrolCompletedPenalty:0);return score(a)-score(b);})[0]; if (dist(k, g) < TUNING.ai.patrolRange) {
    if (g.progress > 0 && g.progress < 1 && !g.regressing) {
        this.work(k, { kind: "kick", target: g, id: g.id, label: "" }, dt);
        return;
    }
    this.inspected.set(g.id,this.time);this.patrol++;
    k.pathAge = 0;
} k.action = ""; this.navigate(k, this.powered ? this.gates[this.patrol % 2] : g, dt); if (this.powered && dist(k, this.gates[this.patrol % 2]) < TUNING.ai.patrolRange)
    this.patrol++; }
}



