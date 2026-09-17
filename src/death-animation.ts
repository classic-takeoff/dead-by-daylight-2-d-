import { TUNING } from './tuning';
export const DEATH_DURATION=TUNING.match.deathSeconds;
export function deathPose(elapsed:number){
 const t=Math.max(0,Math.min(1,elapsed/DEATH_DURATION));
 return {t,rise:12+110*t*t,bodyAlpha:Math.max(0,1-t*2),soulAlpha:Math.sin(Math.PI*t)*.9,spread:7+26*t};
}
