import { TUNING } from './tuning';
﻿import {walls,rocks,rockIsLow,genSpots,hookSpots,palletSpots,windowSpots,stairs,drops,floorOf,type Point,type Wall} from './world';
export type LoopPallet=Point&{axis:'x'|'y';loop:'long'|'short'};
export function createLayout(rng:()=>number,reserved:Point[]){
 let best:ReturnType<typeof layoutAttempt>|undefined;
 for(let i=0;i<TUNING.layout.retries;i++){const next=layoutAttempt(rng,reserved);if(!best||next.pallets.length>best.pallets.length)best=next;if(next.pallets.length===TUNING.layout.palletCount)return next;}
 return best!;
}
function layoutAttempt(rng:()=>number,reserved:Point[]){
 const c=TUNING.layout,terrain:Wall[]=[],pallets:LoopPallet[]=[];
 const keep=[...reserved,...genSpots,...hookSpots,...palletSpots,...windowSpots,...stairs.map(s=>s.bottom),...drops.map(d=>d.bottom),TUNING.world.hatch];
 const intersects=(a:Wall,b:Wall,pad:number)=>a.x-pad<b.x+b.w&&a.x+a.w+pad>b.x&&a.y-pad<b.y+b.h&&a.y+a.h+pad>b.y;
 for(let attempt=0;attempt<c.attempts&&pallets.length<c.palletCount;attempt++){
  const loop=pallets.length%2===0?'long':'short',vertical=rng()<c.verticalChance,x=c.origin.x+Math.floor(rng()*c.columns)*c.cell,y=c.origin.y+Math.floor(rng()*c.rows)*c.cell;
  const left=loop==='long'?c.longLeft+Math.floor(rng()*c.longRandom):c.shortLeft+Math.floor(rng()*c.shortRandom),right=loop==='long'?c.longRight:c.shortRight;
  const rockLoop=pallets.length%c.rockLoopEvery===1;
  const thickness=rockLoop?c.rockDepth+Math.floor(rng()*c.rockDepthRandom):c.thickness;
  const local=[{x:-c.halfGap-left,y:-thickness/2,w:left,h:thickness},{x:c.halfGap,y:-thickness/2,w:right,h:thickness}];
  const pieces:Wall[]=local.map(r=>({x:x+(vertical?r.y:r.x),y:y+(vertical?r.x:r.y),w:vertical?r.h:r.w,h:vertical?r.w:r.h,kind:rockLoop?'rock':loop==='long'?'wall':'junk',low:rockLoop?rockIsLow(r):pallets.length%c.lowEvery!==0}));
  const footprint:Wall=vertical?{x:x-thickness/2,y:y-c.halfGap-left,w:thickness,h:left+right+c.halfGap*2,kind:'wall'}:{x:x-c.halfGap-left,y:y-thickness/2,w:left+right+c.halfGap*2,h:thickness,kind:'wall'};
  if(footprint.x<c.bounds.x||footprint.x+footprint.w>c.bounds.right||footprint.y<c.bounds.y||footprint.y+footprint.h>c.bounds.bottom)continue;
  // Keep exits, the cabin, and central crossing routes unobstructed.
  if(c.keepClear.some(r=>intersects(footprint,{...r,kind:'wall'},r.pad)))continue;
  if(rocks.some(r=>intersects(footprint,{...r,kind:'junk'},c.rockClearance)))continue;
  if([...walls,...terrain].some(w=>floorOf(w)===0&&intersects(footprint,w,c.wallClearance)))continue;
  if(keep.some(p=>floorOf(p)===0&&p.x>footprint.x-c.objectiveClearance&&p.x<footprint.x+footprint.w+c.objectiveClearance&&p.y>footprint.y-c.objectiveClearance&&p.y<footprint.y+footprint.h+c.objectiveClearance))continue;
  terrain.push(...pieces);pallets.push({x,y,axis:vertical?'x':'y',loop});keep.push({x,y},vertical?{x:x-c.approachOffset,y}:{x,y:y-c.approachOffset},vertical?{x:x+c.approachOffset,y}:{x,y:y+c.approachOffset});
 }
 return {terrain,pallets};
}
