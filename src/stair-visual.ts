import {floorOf,type Stair} from './world';

export function stairVisual(stair:Stair,level:number){
 const atBottom=level===floorOf(stair.bottom);
 if(!atBottom&&level!==floorOf(stair.top))return null;
 const point=atBottom?stair.bottom:stair.top,destination=atBottom?stair.top:stair.bottom;
 return {point,destination,direction:floorOf(destination)>level?'up' as const:'down' as const,basement:Math.min(floorOf(stair.bottom),floorOf(stair.top))<0};
}
