import { TUNING } from './tuning';
import type { Point, Wall } from './world';

export type Locker=Point&{id:number;occupant:number|null;openedAt:number;searchedAt:number;enteredAt?:number;lastAlertAt?:number};
export const lockerSpots:Point[]=TUNING.world.lockers;
export const lockerDoor=(l:Point):Point=>({x:l.x,y:l.y+TUNING.lockers.doorOffset,level:l.level});
export const lockerBody=(l:Point):Wall=>({x:l.x-TUNING.lockers.halfWidth,y:l.y-TUNING.lockers.halfHeight,w:TUNING.lockers.halfWidth*2,h:TUNING.lockers.halfHeight*2,level:l.level,kind:'wall'});
