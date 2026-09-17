import { tauntGain } from './sound effect/taunts';
import {healingPercent,healingProgress,actorPosition,type Match} from './game';

export function directionTargets(m:Match){
 if(m.player.role==='survivor')return [
  ...m.survivors.filter(s=>s.life==='hooked'&&s.id!==m.playerId).map(s=>({...s,label:s.name+' · 挂钩',kind:'hook',bearingOnly:false,progress:Math.max(0,...m.survivors.filter(a=>a.action==='rescue:'+s.id).map(a=>a.progress))})),
  ...m.survivors.filter(s=>s.id!==m.playerId&&(s.life==='injured'||s.life==='down')).map(s=>({...s,label:s.name+' · '+(s.life==='down'?'需要扶起':'需要治疗')+' · '+healingPercent(s)+'%',kind:'heal',bearingOnly:false,progress:healingProgress(s)})),
  ...m.alerts.filter(a=>a.until>m.time&&(a.type==='stomp'||a.type==='metal-kick')).map(a=>({...a,label:a.type==='stomp'?'踹板声':'踹机声',kind:a.type,bearingOnly:true}))
 ];
 return m.alerts.map(a=>a.type==='taunt'&&a.actorId!==undefined?{...a,...actorPosition(m.actors[a.actorId])}:a).filter(a=>a.until>m.time&&['locker','rescue','generator-fail','generator-complete','heal-interrupt','taunt'].includes(a.type)&&(a.type!=='taunt'||tauntGain(m.player,a)>0)).map(a=>({...a,label:a.type==='generator-complete'?'发电机修复完成':a.type==='taunt'?(a.name??'幸存者')+' 正在嘲讽':a.type==='locker'?'乌鸦警报 · 衣柜':a.type==='generator-fail'?'修机爆炸':a.type==='heal-interrupt'?'治疗中断':'救援发生位置',kind:a.type,bearingOnly:false}));
}
