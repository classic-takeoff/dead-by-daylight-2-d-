import { TUNING } from './tuning';
import type { Actor, Match } from './game';
import { dist, type Point } from './world';

export function activeWork(m:Match,a:Actor):{kind:string;target:Point}|null{
  if(a.moving||a.cooldown>0||m.time-(a.workAt??-10)>TUNING.interactions.workGrace)return null;
  const [kind,raw]=a.action.split(':'),id=Number(raw);
  const target=kind==='locker'?m.lockers[id]:kind==='repair'||kind==='kick'?m.generators[id]:kind==='heal'||kind==='rescue'?m.actors[id]:kind==='hook'?m.hooks[id]:kind==='gate'?m.gates[id]:kind==='break'?m.pallets[id]:null;
  if(!target||dist(a,target)>TUNING.interactions.workRange)return null;
  if(kind==='repair'&&(m.generators[id].blockedUntil??0)>m.time)return null;
  if(kind==='repair'&&m.generators[id].progress>=1||kind==='heal'&&!['injured','down'].includes(m.actors[id].life)||kind==='rescue'&&m.actors[id].life!=='hooked'||kind==='break'&&m.pallets[id].state==='broken')return null;
  return {kind,target};
}
export function stompPose(progress:number,breaking:boolean){
  const phase=breaking?(progress*2)%1:progress;
  const lift=phase<.5?Math.sin(phase/.5*Math.PI/2):phase<.7?1-(phase-.5)/.2:0;
  return {lift:Math.max(0,lift)*18,reach:phase<.5?phase*26:phase<.7?13+(phase-.5)*65:26*(1-(phase-.7)/.3),impact:phase>=.7&&phase<.84};
}
