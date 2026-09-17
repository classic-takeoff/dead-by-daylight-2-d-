import {TUNING} from './tuning';
import {remoteEndpoint} from './client-motion';
import {zlibSync,unzlibSync,strToU8,strFromU8} from 'fflate';
﻿import { validTaunt } from './sound effect/taunts';
import {Match,EMPTY_INPUT,actorPosition,type Input,type Role} from './game';
import {floorOf} from './world';

export const GAME_ID='06e44bf0434559c5';
export const PROTOCOL=3;
export function cleanInput(value:unknown):Input{
  const v=(value&&typeof value==='object'?value:{}) as Record<string,unknown>;
  const num=(key:string,min:number,max:number)=>typeof v[key]==='number'&&Number.isFinite(v[key])?Math.max(min,Math.min(max,v[key] as number)):0;
  return {...EMPTY_INPUT,taunt:validTaunt(v.taunt)?v.taunt:undefined,dx:num('dx',-1,1),dy:num('dy',-1,1),angle:num('angle',-Math.PI*2,Math.PI*2),charge:num('charge',0,1),run:v.run===true,crouch:v.crouch===true,interact:v.interact===true,space:v.space===true,special:v.special===true,attack:v.attack===true,charging:v.charging===true};
}
const fields=['time','actors','generators','hooks','gates','lockers','hatch','traces','alerts','endgame','powered','finished','carried','skills','skillTimers','chaseUntil','forfeitRole'] as const;
export function snapshot(m:Match){
  const state:Record<string,unknown>={};for(const key of fields)state[key]=m[key];
  state.actors=m.actors.map(({path,target,hostView,predicted,netFrom,netAt,netDuration,netExtrapolate,...a})=>({...a,path:[],target:undefined}));
  state.palletStates=m.pallets.map(p=>p.state);state.palletMotion=m.pallets.map(p=>[p.droppedAt??null,p.dropSide??1,p.brokenAt??null]);state.traces=m.traces.slice(-60);state.events=m.events.slice(-16);
  return JSON.stringify(state,(_k,v)=>typeof v==='number'&&Number.isFinite(v)?Math.round(v*1000)/1000:v);
}
const teleportLife=(l:string)=>l==='carried'||l==='hooked'||l==='dead'||l==='escaped';
const hostDriving=(a:any)=>a.transition>0||!!a.lunge||a.lockerId!==undefined||!['healthy','injured','down'].includes(a.life);
export function applySnapshot(m:Match,text:string,selfId=-1){
  const s=JSON.parse(text);if(!Array.isArray(s.actors)||s.actors.length!==5||!Number.isFinite(s.time))throw Error('无效的房间状态');
  const now=performance.now(),from=m.renderTime;
  const duration=m.visualSync?Math.max(60,Math.min(150,m.visualSync.duration*.8+(now-m.visualSync.at)*.2)):50;
  const previous=m.actors,rendered=m.actors.map(actorPosition);
  const prevSelf=previous[selfId],newSelf=s.actors[selfId];
  // The owned actor keeps its locally-authoritative position unless the host
  // drove it through a state change that teleports it (vault/stairs/locker/
  // carry/hook/lunge/death). A plain hit (healthy->injured/down) keeps position.
  const selfForced=!!prevSelf&&!!newSelf&&(hostDriving(newSelf)||(teleportLife(prevSelf.life)&&prevSelf.life!==newSelf.life)||floorOf(prevSelf)!==floorOf(newSelf));
  for(const key of fields)if(key in s)(m as unknown as Record<string,unknown>)[key]=s[key];
  m.visualSync={from:Math.min(from,m.time),at:now,duration};
  m.actors.forEach((a,i)=>{
    const old=previous[i],reset=i!==selfId?(old.life!==a.life||old.lockerId!==a.lockerId||(old.motionRevision??0)!==(a.motionRevision??0)||Math.hypot(old.x-a.x,old.y-a.y)>TUNING.network.snapDistance):selfForced;
    a.netFrom=reset?undefined:rendered[i];a.netAt=now;a.netDuration=duration;
  });
  if(selfId>=0&&selfId<5&&prevSelf&&!selfForced){
    const a=m.actors[selfId],r=rendered[selfId];
    a.x=r.x;a.y=r.y;a.level=r.level;
    a.angle=prevSelf.angle;a.moving=prevSelf.moving;a.running=prevSelf.running;a.crouching=prevSelf.crouching;
    a.velocity=prevSelf.velocity;a.movementAt=prevSelf.movementAt;
    a.netFrom=undefined;a.netAt=undefined;
  }
  if(Array.isArray(s.palletStates))m.pallets.forEach((p,i)=>{if(['up','down','broken'].includes(s.palletStates[i]))p.state=s.palletStates[i];});
  if(Array.isArray(s.palletMotion))m.pallets.forEach((p,i)=>{const v=s.palletMotion[i];if(!Array.isArray(v))return;p.droppedAt=typeof v[0]==='number'&&Number.isFinite(v[0])?v[0]:undefined;p.dropSide=v[1]===-1?-1:1;p.brokenAt=typeof v[2]==='number'&&Number.isFinite(v[2])?v[2]:undefined;});
  m.actors.forEach(a=>{a.netExtrapolate=a.id===selfId?undefined:remoteEndpoint(m,a);});
  m.events.push(...(s.events??[]));
}
export async function pack(text:string){
  const bytes=zlibSync(strToU8(text),{level:4});
  let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary);
}
export async function unpack(data:string){
  if(data.length>7900)throw Error('房间数据过大');
  const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
  const decoded=unzlibSync(bytes,{out:new Uint8Array(100001)});const text=strFromU8(decoded).replace(/\0+$/,'');
  if(text.length>100000)throw Error('房间数据过大');return text;
}
export function forfeit(m:Match,role:Role){
  if(m.finished)return;m.forfeitRole=role;
  for(const s of m.survivors){if(role==='survivor'){if(s.life!=='dead'){s.life='healthy';m.kill(s);}}else if(s.life!=='escaped'){s.life='healthy';m.escape(s);}}
  m.carried=null;m.finished=true;m.emit('end',role==='killer'?'房主关闭房间 · 杀手阵营失败':'房主关闭房间 · 求生者阵营失败');
}
