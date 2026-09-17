import { TUNING } from '../tuning';
import { floorOf, type Point } from '../world';

export const TAUNTS=['叮叮叮','哎哟我去','哎哟我滴妈','奶龙','小孩糖笑','私人笑声','老牧师'] as const;
export const TAUNT_RANGE=TUNING.audio.tauntRange;
export const TAUNT_DURATIONS=TUNING.audio.tauntDurations;
export function tauntGain(listener:Point,source:Point){return Math.max(0,1-Math.hypot(listener.x-source.x,listener.y-source.y,(floorOf(listener)-floorOf(source))*TUNING.match.floorSoundDistance)/TAUNT_RANGE);}
export function validTaunt(value:unknown):value is number{return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<TAUNTS.length;}
export function tauntSector(x:number,y:number,radius=140){
 const distance=Math.hypot(x,y);if(distance<radius*0.26||distance>radius)return -1;
 const step=Math.PI*2/TAUNTS.length;
 return Math.floor(((Math.atan2(y,x)+Math.PI/2+step/2+Math.PI*2)%(Math.PI*2))/step);
}
