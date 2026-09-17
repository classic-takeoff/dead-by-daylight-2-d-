import { TUNING } from './tuning';
export type Point={x:number;y:number;level?:number};
export type Wall=Point&{w:number;h:number;kind:'wall'|'tree'|'junk'|'rock';low?:boolean};
export type Stair={bottom:Point;top:Point};
export const floorOf=(p:Point)=>p.level??0;
export const WORLD=TUNING.world.size;
export const stairs:Stair[]=TUNING.world.stairs;
export const drops:Stair[]=TUNING.world.drops;
export const upperFloor=TUNING.world.upperFloor;
export const buildings=TUNING.world.buildings;
export const rocks=TUNING.world.rocks;
// Classify the whole stone before splitting its collision silhouette.
export const rockIsLow=(r:{w:number;h:number})=>Math.min(r.w,r.h)<TUNING.darkwoodVision.rockMinSize;
// Rock artwork and collision share one rectangle; no stale invisible collision blocks.
export const rockWalls:Wall[]=rocks.flatMap(r=>[
 {x:r.x+r.w*.2,y:r.y,w:r.w*.6,h:r.h*.2},
 {x:r.x+r.w*.08,y:r.y+r.h*.2,w:r.w*.84,h:r.h*.22},
 {x:r.x,y:r.y+r.h*.42,w:r.w,h:r.h*.38},
 {x:r.x+r.w*.15,y:r.y+r.h*.8,w:r.w*.7,h:r.h*.2}
].map(w=>({...w,kind:'junk' as const,low:rockIsLow(r)})));
export const walls:Wall[]=[...TUNING.world.walls,...TUNING.world.interiorWalls,...rockWalls] as Wall[];
export const genSpots:Point[]=TUNING.world.genSpots;
export const hookSpots:Point[]=TUNING.world.hookSpots;
export const palletSpots:Array<Point&{axis?:'x'|'y'}>=[...TUNING.world.palletSpots,...TUNING.world.interiorPallets] as Array<Point&{axis?:'x'|'y'}>;
export const windowSpots:Array<Point&{axis:'x'|'y'}>=[...TUNING.world.windowSpots,...TUNING.world.interiorWindows] as Array<Point&{axis:'x'|'y'}>;
export function createBasement(index:number){
 const b=buildings[index],c=TUNING.basement,t=c.wallThickness;
 const room={x:b.x+c.inset,y:b.y+c.inset,w:b.w-c.inset*2,h:b.h-c.inset*2};
 const entrance={x:room.x+c.entranceOffset.x,y:room.y+c.entranceOffset.y,level:0};
 const stair:Stair={bottom:{...entrance,level:-1},top:entrance};
 const terrain:Wall[]=[{x:room.x,y:room.y,w:room.w,h:t},{x:room.x,y:room.y+room.h-t,w:room.w,h:t},{x:room.x,y:room.y,w:t,h:room.h},{x:room.x+room.w-t,y:room.y,w:t,h:room.h}].map(w=>({...w,kind:'wall',level:-1}));
 const hooks=c.hookOffsets.map(p=>({x:room.x+p.x,y:room.y+p.y,level:-1}));
 return {building:index,room,stair,terrain,hooks};
}
export function stairRoutes(start:Point,end:Point,links:Stair[]){
 return links.flatMap(s=>floorOf(start)===floorOf(s.bottom)?[{from:s.bottom,to:s.top}]:floorOf(start)===floorOf(s.top)?[{from:s.top,to:s.bottom}]:[])
 .filter(r=>floorOf(start)!==0||floorOf(r.to)===floorOf(end))
 .sort((a,b)=>dist(start,a.from)+dist(a.to,end)-dist(start,b.from)-dist(b.to,end));
}
export const dist = (a:Point,b:Point) => Math.hypot(a.x-b.x,a.y-b.y)+(floorOf(a)===floorOf(b)?0:TUNING.match.floorDistancePenalty);
export function blocked(p:Point,r=TUNING.movement.collisionRadius,extras:Wall[]=[]) {
  if(floorOf(p)===1&&(p.x-r<upperFloor.x||p.x+r>upperFloor.x+upperFloor.w||p.y-r<upperFloor.y||p.y+r>upperFloor.y+upperFloor.h))return true;
  return [...walls,...extras].some(w=>floorOf(w)===floorOf(p)&&p.x+r>w.x&&p.x-r<w.x+w.w&&p.y+r>w.y&&p.y-r<w.y+w.h);
}
export function lineClear(a:Point,b:Point,extras:Wall[]=[],radius=0) {
  if(floorOf(a)!==floorOf(b))return false;
  const n=Math.max(1,Math.ceil(dist(a,b)/TUNING.pathfinding.lineStep));
  for(let i=1;i<=n;i++) if(blocked({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n,level:a.level},radius,extras)) return false;
  return true;
}
const CELL=TUNING.pathfinding.cell,PATH_OFFSET=TUNING.pathfinding.offset,COLS=(WORLD.w+PATH_OFFSET*2)/CELL,ROWS=WORLD.h/CELL;
export function findPath(start:Point,end:Point,extras:Wall[]=[],links:Stair[]=stairs):Point[] {
  if(floorOf(start)!==floorOf(end)){
    const route=stairRoutes(start,end,links)[0];if(!route)return [];
    return [...findPath(start,route.from,extras,links),route.to,...findPath(route.to,end,extras,links)];
  }
  if(lineClear(start,end,extras,11)) return [end];
  const sx=Math.floor((start.x+PATH_OFFSET)/CELL),sy=Math.floor(start.y/CELL),ex=Math.floor((end.x+PATH_OFFSET)/CELL),ey=Math.floor(end.y/CELL);
  const key=(x:number,y:number)=>y*COLS+x;
  const src=key(sx,sy),dst=key(ex,ey),open=[src],prev=new Map<number,number>(),cost=new Map([[src,0]]),closed=new Set<number>();
  const score=(k:number)=>(cost.get(k)??1e9)+Math.abs(k%COLS-ex)+Math.abs(Math.floor(k/COLS)-ey);
  let best=src,bestD=1e9;
  while(open.length&&closed.size<TUNING.pathfinding.maxNodes) {
    let ix=0;for(let i=1;i<open.length;i++)if(score(open[i])<score(open[ix]))ix=i;
    const cur=open.splice(ix,1)[0];if(cur===dst){best=cur;break;}closed.add(cur);
    const x=cur%COLS,y=Math.floor(cur/COLS),d=Math.abs(x-ex)+Math.abs(y-ey);if(d<bestD){bestD=d;best=cur;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx=x+dx,ny=y+dy,k=key(nx,ny),p={x:nx*CELL+CELL/2-PATH_OFFSET,y:ny*CELL+CELL/2,level:start.level};
      if(nx<1||ny<1||nx>=COLS-1||ny>=ROWS-1||closed.has(k)||blocked(p,TUNING.movement.pathRadius,extras))continue;
      const g=(cost.get(cur)??0)+1;if(g<(cost.get(k)??1e9)){cost.set(k,g);prev.set(k,cur);if(!open.includes(k))open.push(k);}
    }
  }
  const result:Point[]=[];let cur=best;
  while(cur!==src&&prev.has(cur)){result.unshift({x:(cur%COLS)*CELL+CELL/2-PATH_OFFSET,y:Math.floor(cur/COLS)*CELL+CELL/2,level:start.level});cur=prev.get(cur)!;}
  if(best===dst&&!blocked(end,TUNING.movement.pathRadius,extras))result.push(end);
  return result;
}

// Trees and low fences transmit sight; tall obstacles block it for both roles.
export function sightObstacles(a:Point,extras:Wall[]=[]){
 return [...walls,...extras].filter(w=>floorOf(w)===floorOf(a)&&w.kind!=='tree'&&!w.low);
}
export function sightHit(a:Point,angle:number,reach:number,ob:Wall[]){
 const dx=Math.cos(angle),dy=Math.sin(angle);let distance=reach,exit=reach,blocker:Wall|undefined;
 for(const w of ob){
   let near=0,far=reach;
   for(const [origin,direction,min,max] of [[a.x,dx,w.x,w.x+w.w],[a.y,dy,w.y,w.y+w.h]]){
     if(Math.abs(direction)<1e-9){if(origin<min||origin>max){far=-1;break;}}
     else {const t1=(min-origin)/direction,t2=(max-origin)/direction;near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));}
   }
   if(far>=near&&far>=0&&near<distance){distance=near;exit=far;blocker=w;}
 }
 return {distance,exit,blocker};
}
export function sightRay(a:Point,angle:number,reach:number,ob:Wall[]){return sightHit(a,angle,reach,ob).distance;}
export function sightClear(a:Point,b:Point,extras:Wall[]=[]){
 if(floorOf(a)!==floorOf(b))return false;
 const distance=Math.hypot(b.x-a.x,b.y-a.y);
 return sightRay(a,Math.atan2(b.y-a.y,b.x-a.x),distance,sightObstacles(a,extras))>=distance-.001;
}
export function visibilityBoundary(a:Point,angle:number,range:number,half:number,extras:Wall[]=[],ignoreWalls=false,nearRange=0){
 // A finite polygon reaching every map corner represents unlimited sight.
 if(!Number.isFinite(range))range=Math.hypot(Math.max(Math.abs(a.x),Math.abs(WORLD.w-a.x)),Math.max(Math.abs(a.y),Math.abs(WORLD.h-a.y)))+1;
 const ob=(ignoreWalls?[]:sightObstacles(a,extras)).filter(w=>Math.hypot(a.x-Math.max(w.x,Math.min(a.x,w.x+w.w)),a.y-Math.max(w.y,Math.min(a.y,w.y+w.h)))<=range);
 const tau=Math.PI*2,normalize=(n:number)=>(n%tau+tau)%tau,angles:number[]=[];
 for(let i=0;i<TUNING.darkwoodVision.rays;i++)angles.push(i*tau/TUNING.darkwoodVision.rays);
 for(const edge of [angle-half,angle+half])for(const delta of [-.0001,0,.0001])angles.push(normalize(edge+delta));
 for(const w of ob)for(const x of [w.x,w.x+w.w])for(const y of [w.y,w.y+w.h])for(const delta of [-.0001,0,.0001])angles.push(normalize(Math.atan2(y-a.y,x-a.x)+delta));
 angles.sort((a,b)=>a-b);
 return angles.map(theta=>{const within=Math.abs(Math.atan2(Math.sin(theta-angle),Math.cos(theta-angle)))<=half,reach=within?range:nearRange,hit=sightHit(a,theta,reach,ob),distance=hit.exit;return {blocker:hit.blocker,angle:theta,x:a.x+Math.cos(theta)*distance,y:a.y+Math.sin(theta)*distance};});
}
