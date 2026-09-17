import { TUNING } from './tuning';
// Simulation and renderer share the contact window; timestamps freeze with pause.
export const LUNGE=TUNING.lunge;
type Pose={lean:number;crouch:number;stride:number;reach:number;side:number;lift:number;blade:number;trail:number};
const rest:Pose={lean:0,crouch:0,stride:0,reach:22,side:7,lift:0,blade:-.7,trail:0};
export function wipePose(progress:number):Pose{
 const t=Math.max(0,Math.min(1,progress)),fade=Math.min(1,t*8,(1-t)*8),rub=Math.sin(t*Math.PI*8);
 return {...rest,lean:-2*fade,reach:22-9*fade,side:7+4*fade,lift:12*fade,blade:-.7+(1.6+rub*.08)*fade};
}
const ready:Pose={lean:-5,crouch:3,stride:5,reach:-9,side:19,lift:13,blade:-1.5,trail:0};
const extend:Pose={lean:10,crouch:1,stride:15,reach:59,side:2,lift:1,blade:0,trail:1};
const ease=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function mix(a:Pose,b:Pose,t:number):Pose{const result={...a};for(const key of Object.keys(a) as Array<keyof Pose>)result[key]=a[key]+(b[key]-a[key])*ease(t);return result;}
export function attackPose(charge:number,age:number,charged:boolean):Pose{
  if(charge>0)return mix(rest,ready,charge/.35);
  if(age<0)return rest;
  if(charged){
    if(age<LUNGE.windup)return mix(ready,{...ready,lean:-7,crouch:4},age/LUNGE.windup);
    if(age<.13)return mix({...ready,lean:-7,crouch:4},extend,(age-LUNGE.windup)/.095);
    if(age<.24)return mix(extend,{...extend,lean:7,reach:53,trail:.6},(age-.13)/.11);
    if(age<.42)return mix({...extend,lean:7,reach:53,trail:.6},{...rest,lean:3,crouch:3,reach:32,side:15,lift:5,blade:.6},(age-.24)/.18);
    if(age<LUNGE.recovery)return mix({...rest,lean:3,crouch:3,reach:32,side:15,lift:5,blade:.6},rest,(age-.42)/.23);
  }else if(age<.5){
    if(age<.16)return mix({...ready,reach:13,side:-17,lift:8},{...extend,reach:34,side:20,lean:4,stride:6,blade:.9},age/.16);
    return mix({...extend,reach:34,side:20,lean:4,stride:6,blade:.9},rest,(age-.16)/.34);
  }
  return rest;
}
