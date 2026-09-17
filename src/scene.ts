import { TUNING } from './tuning';
import { stairVisual } from './stair-visual';
﻿import { TauntWheel } from './sound effect/taunt-wheel';
import type { Multiplayer } from './multiplayer';
import { deathPose, DEATH_DURATION } from './death-animation';
import { TouchControls } from './touch-controls';
import { solveArm } from './arm-pose';
import { activeWork, stompPose } from './interaction-animation';
import { attackPose, wipePose, LUNGE } from './attack-animation';
import { heartbeatProfile } from './audio';
import Phaser from 'phaser';
import { healingProgress, renderPosition as actorPosition, Match, CONFIG, gateOpening, gateExit, terrorStrength, EMPTY_INPUT, type Actor, type Pallet, type Input } from './game';
import { buildings, rocks, visibilityBoundary, sightObstacles, sightRay, walls, WORLD, dist, floorOf, stairs, drops, upperFloor, windowSpots, lineClear, type Point } from './world';
import { Sound } from './audio';
// Virtual perspective settings mapped to the orthographic 2D camera.
export const CAMERA_VIEW=TUNING.camera;
export class ForestScene extends Phaser.Scene {
  tauntWheel!:TauntWheel;
  network:Multiplayer|null=null;blockInput=false;
  touch:TouchControls|null=null;match:Match|null=null;onFrame:(m:Match)=>void=()=>{};soundFX=new Sound();
  private lastSeen=new Map<number,{actor:Actor;at:number}>();
  private souls!:Phaser.GameObjects.Graphics;
  private fog!:Phaser.GameObjects.Graphics;
  private floorArt!:Phaser.GameObjects.Graphics;
  private redStain!:Phaser.GameObjects.Graphics;
  private visionShape!:Phaser.GameObjects.Graphics;
  private visionMask!:Phaser.Display.Masks.GeometryMask;
  private selfLayer!:Phaser.GameObjects.Graphics;
  private escapeLayers:Phaser.GameObjects.Graphics[]=[];
  private ground!:Phaser.GameObjects.Graphics;private art!:Phaser.GameObjects.Graphics;private keys!:Record<string,Phaser.Input.Keyboard.Key>;private accum=0;private clock=0;private chargeAt=-1;private attackPending=false;private spacePending=false;private specialPending=false;private zoomScale=1;
  private effects:Array<Point&{type:string;until:number}>=[];paused=false;viewId=0;private menuActors:Actor[]=[];
  constructor(){super('forest');}
  create(){
    this.tauntWheel=new TauntWheel(this);
    this.cameras.main.setBackgroundColor('#101e1b');this.ground=this.add.graphics();this.floorArt=this.add.graphics();this.redStain=this.add.graphics();this.art=this.add.graphics();this.selfLayer=this.add.graphics().setDepth(21);this.escapeLayers=Array.from({length:4},()=>this.add.graphics());
    this.souls=this.add.graphics().setDepth(22);
    this.fog=this.add.graphics().setScrollFactor(0).setDepth(20);
    this.visionShape=this.add.graphics().setVisible(false);
    this.visionMask=this.visionShape.createGeometryMask();this.visionMask.setInvertAlpha(true);
    this.redStain.setMask(this.visionShape.createGeometryMask());
    this.drawGround();this.menuActors=new Match('survivor').actors;
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,SHIFT,E,SPACE,R,ESC') as Record<string,Phaser.Input.Keyboard.Key>;
    this.keys.SPACE.on('down',()=>{if(this.match&&!this.paused)this.spacePending=true;});this.keys.R.on('down',()=>{if(this.match&&!this.paused)this.specialPending=true;});
    this.input.keyboard!.addCapture(['SPACE','UP','DOWN']);this.input.mouse!.disableContextMenu();
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(!this.tauntWheel.open&&!p.wasTouch&&p.leftButtonDown()&&this.match&&!this.paused&&this.match.player.role==='killer'&&this.match.player.cooldown===0)this.chargeAt=this.clock;});
    this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{if(!p.wasTouch&&p.button===0&&this.chargeAt>=0&&!this.paused)this.attackPending=true;});
    this.scale.on('resize',()=>this.fit());this.fit();
  }
  get renderDensity(){return this.scale.width/Math.max(1,innerWidth);}
  fit(){const w=this.scale.width/this.renderDensity,h=this.scale.height/this.renderDensity;this.zoomScale=this.touch?.enabled?Math.max(TUNING.camera.fit.mobileMin,Math.min(TUNING.camera.fit.mobileMax,Math.min(w/TUNING.camera.fit.mobileWidth,h/TUNING.camera.fit.mobileHeight))):Math.max(TUNING.camera.fit.desktopMin,Math.min(TUNING.camera.fit.desktopMax,Math.min(w/TUNING.camera.fit.desktopWidth,h/TUNING.camera.fit.desktopHeight)));this.cameras.main.setZoom(this.match?this.viewZoom():Math.max(w/1000,h/660)*this.renderDensity);}
  viewZoom(){
    const role=this.match?.actors[this.viewId].role??'killer',view=CAMERA_VIEW[role];
    return this.renderDensity*this.zoomScale*(this.touch?.enabled&&role==='killer'?TUNING.camera.mobileKillerZoom:1)*Math.tan(Math.PI/8)/(view.z*Math.tan(view.fov*Math.PI/360));
  }
  private fogKey='';private fogAt=-Infinity;
  drawFog(m:Match|null){
    const f=this.fog;if(!m){f.clear();f.clearMask();this.fogKey='';return;}
    const actor=m.actors[this.viewId],viewer={...actor,...actorPosition(actor)},killer=actor.role==='killer';
    const range=killer?CONFIG.vision:CONFIG.survivorVision,half=killer?CONFIG.killerHalfAngle:CONFIG.survivorHalfAngle,near=killer?CONFIG.nearVision:CONFIG.survivorNearVision;
    const key=[m.mapSeed,this.viewId,viewer.x,viewer.y,viewer.angle,floorOf(viewer),m.gates.map(g=>gateOpening(g,m.renderTime)>=1).join(',')].join(':');
    if(key!==this.fogKey&&performance.now()/1000-this.fogAt>=TUNING.darkwoodVision.refreshSeconds){
      this.fogKey=key;this.fogAt=performance.now()/1000;this.visionShape.clear();
      const points=visibilityBoundary(viewer,viewer.angle,range,half,m.obstacles(false,false),false,near);
      this.visionShape.fillStyle(0xffffff);this.visionShape.fillPoints(points,true);
      f.clear();f.setScrollFactor(1);f.fillStyle(0x030909,TUNING.darkwoodVision.outsideAlpha);f.fillRect(-512,-512,WORLD.w+1024,WORLD.h+1024);f.setMask(this.visionMask);
    }
  }
  drawRedStain(m:Match){
    const viewer=m.actors[this.viewId],k={...m.killer,...actorPosition(m.killer)};
    if(viewer.role!=='survivor'||floorOf(viewer)!==floorOf(k))return;
    const obstacles=sightObstacles(k,m.obstacles(false,false)).filter(w=>Math.hypot(k.x-Math.max(w.x,Math.min(w.x+w.w,k.x)),k.y-Math.max(w.y,Math.min(w.y+w.h,k.y)))<130),g=this.redStain;
    // Overlapping soft cones fade towards the tip and edges, below actors.
    for(let layer=0;layer<10;layer++){
      const reach=125-layer*8,half=(32-layer*1.5)*Math.PI/180;
      const points=[{x:k.x,y:k.y}];
      for(let i=0;i<=48;i++){
        const angle=k.angle-half+2*half*i/48,d=sightRay(k,angle,reach,obstacles);
        points.push({x:k.x+Math.cos(angle)*d,y:k.y+Math.sin(angle)*d});
      }
      g.fillStyle(0xff1828,.045+layer*.003);g.fillPoints(points,true);
    }
  }
  startMatch(m:Match){this.tauntWheel.cancel();this.lastSeen.clear();this.match=m;this.drawGround();this.viewId=m.playerId;this.paused=false;this.fogAt=-Infinity;this.fogKey='';this.accum=0;this.attackPending=false;this.spacePending=false;this.specialPending=false;this.chargeAt=-1;this.input.keyboard!.resetKeys();this.fit();this.effects=[];this.soundFX.stopWork();this.soundFX.lastBeat=-10;this.soundFX.init();}
  showMenu(){this.tauntWheel.cancel();this.soundFX.stopWork();this.match=null;this.drawGround();this.paused=false;this.fit();}
  drawGround(){
    const g=this.ground;g.clear();g.fillStyle(0x182a25);g.fillRect(0,0,WORLD.w,WORLD.h);
    let seed=918;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    // Dirt trails, damp earth, moss and individual blades are native pixel art.
    for(let x=80;x<1850;x+=12){const y=730+Math.sin(x/260)*100;g.fillStyle(0x28342b,.7);g.fillRect(x,y,18,90);g.fillStyle(0x364030,.3);g.fillRect(x,y+25,15,26);}
    for(let y=120;y<1350;y+=12){const x=910+Math.sin(y/220)*130;g.fillStyle(0x29362c,.6);g.fillRect(x,y,80,16);}
    for(let i=0;i<12500;i++){const x=Math.floor(rand()*WORLD.w/3)*3,y=Math.floor(rand()*WORLD.h/3)*3;g.fillStyle([0x23392c,0x304231,0x10251f,0x3a4530,0x21352d][Math.floor(rand()*5)],.65);g.fillRect(x,y,rand()>.85?9:3,rand()>.7?5:2);}
    // Wooden cabin floor, rugs, lamp-lit boards.
    const house=buildings[1],floor={x:house.x+20,y:house.y+20,w:house.w-40,h:house.h-40};g.fillStyle(0x403e2c);g.fillRect(floor.x,floor.y,floor.w,floor.h);for(let y=floor.y+2;y<floor.y+floor.h;y+=12){g.fillStyle(y%24?0x524a32:0x48442f);g.fillRect(floor.x,y,floor.w,9);}
    const shack=buildings[0];g.fillStyle(0x827d68);g.fillRect(shack.x+20,shack.y+20,shack.w-40,shack.h-40);for(let y=shack.y+24;y<shack.y+shack.h-20;y+=14){g.fillStyle(0xaaa48b,.6);g.fillRect(shack.x+20,y,shack.w-40,3);}
    g.fillStyle(0x24372d);g.fillRect(874,557,73,90);g.lineStyle(2,0x657052,.45);g.strokeRect(878,561,65,82);
    for(const w of [...walls,...(this.match?.terrain??[])]){if(w.kind==='tree'||floorOf(w)!==0)continue;if(w.kind==='rock'){this.drawRock(g,w);continue;}if(w.kind==='junk'&&TUNING.world.interiorWalls.some(r=>r.x===w.x&&r.y===w.y&&r.level===floorOf(w))){g.fillStyle(0x171d17,.55);g.fillRect(w.x+5,w.y+7,w.w,w.h);g.fillStyle(0x5a4432);g.fillRect(w.x,w.y,w.w,w.h);g.fillStyle(0xa0875c);g.fillRect(w.x+3,w.y+3,w.w-6,w.h-8);g.lineStyle(2,0x5e583f);g.lineBetween(w.x+5,w.y+w.h/2,w.x+w.w-5,w.y+w.h/2);continue;}if(w.low){
      let rubbleSeed=((w.x*73856093)^(w.y*19349663))>>>0;const stoneRand=()=>{rubbleSeed=(rubbleSeed*1664525+1013904223)>>>0;return rubbleSeed/4294967296;};
      g.fillStyle(0x091311,.32);g.fillRect(w.x+3,w.y+5,w.w,w.h);g.fillStyle(0x343d36);g.fillRect(w.x,w.y,w.w,w.h);
      for(let y=w.y;y<w.y+w.h;y+=9)for(let x=w.x;x<w.x+w.w;x+=11){
        const sx=x+stoneRand()*3,sy=y+stoneRand()*3,sw=Math.min(7+stoneRand()*5,w.x+w.w-sx),sh=Math.min(5+stoneRand()*5,w.y+w.h-sy);if(sw<1||sh<1)continue;
        g.fillStyle([0x6c7063,0x777c6e,0x535e53,0x898b7b,0x60665b][Math.floor(stoneRand()*5)]);
        g.fillPoints([{x:sx+2,y:sy},{x:sx+sw-2,y:sy+1},{x:sx+sw,y:sy+sh*.6},{x:sx+sw-2,y:sy+sh},{x:sx,y:sy+sh-1},{x:sx,y:sy+2}],true);
        g.lineStyle(1,0xa0a18b,.55);g.lineBetween(sx+2,sy+1,sx+sw-2,sy+2);
        if(stoneRand()<.24){g.fillStyle(0x465c3f,.7);g.fillRect(sx,sy+sh-2,sw*.6,2);}
      }
      for(let i=0;i<Math.max(w.w,w.h)/12;i++){const horizontal=w.w>w.h,x=horizontal?w.x+stoneRand()*w.w:w.x+(stoneRand()<.5?-3:w.w+1),y=horizontal?w.y+(stoneRand()<.5?-3:w.h+1):w.y+stoneRand()*w.h;g.fillStyle(0x697064,.7);g.fillRect(x,y,2+stoneRand()*3,2);}
      continue;}g.fillStyle(0x050e10,.45);g.fillRect(w.x+8,w.y+13,w.w+4,w.h+5);g.fillStyle(w.kind==='wall'?0x465046:0x414638);g.fillRect(w.x,w.y,w.w,w.h);g.fillStyle(w.kind==='wall'?0x72745c:0x676a50);g.fillRect(w.x,w.y,w.w,4);g.fillStyle(0x24362e);g.fillRect(w.x,w.y+w.h-5,w.w,5);for(let x=w.x+10;x<w.x+w.w;x+=22){g.fillStyle(0x252f27,.65);g.fillRect(x,w.y+5,2,w.h-10);}if(w.kind==='junk'){for(let x=w.x+4;x<w.x+w.w-12;x+=26){g.fillStyle(0x74644b);g.fillRect(x,w.y+8,20,9);g.fillStyle(0x344035);g.fillRect(x+4,w.y+9,2,6);}}}
    for(const w of walls.filter(w=>w.kind==='wall'&&floorOf(w)===0&&w.x>=shack.x&&w.x+w.w<=shack.x+shack.w&&w.y>=shack.y&&w.y+w.h<=shack.y+shack.h)){g.fillStyle(0xd8d7bd);g.fillRect(w.x,w.y,w.w,w.h);g.fillStyle(0x939a88);g.fillRect(w.x,w.y+w.h-4,w.w,4);}
    for(const r of rocks)this.drawRock(g,r);
    // Rocks and mushrooms, placed away from loops.
    for(let i=0;i<85;i++){const x=40+rand()*1840,y=40+rand()*1360;if(x>shack.x&&x<shack.x+shack.w&&y>shack.y&&y<shack.y+shack.h)continue;g.fillStyle(0x475648,.7);g.fillRect(x,y,7,4);g.fillStyle(0x6b7550,.65);g.fillRect(x+1,y-2,4,2);}
  }
  drawRock(g:Phaser.GameObjects.Graphics,r:{x:number;y:number;w:number;h:number}){
    const shape=[[.2,0],[.77,.03],[.94,.22],[1,.49],[.88,.87],[.68,1],[.15,.92],[0,.5],[.07,.2]];
    const points=shape.map(([x,y])=>({x:r.x+x*r.w,y:r.y+y*r.h}));
    g.fillStyle(0x071513,.35);g.fillPoints(points.map(p=>({x:p.x+4,y:p.y+5})),true);
    g.fillStyle(r.w*r.h<3200?0x778174:0x68736e);g.fillPoints(points,true);g.lineStyle(1.5,0xa1a692);g.strokePoints(points,true);
    g.fillStyle(0x47574f);g.fillPoints([points[3],points[4],points[5],points[6],{x:r.x+r.w*.48,y:r.y+r.h*.48}],true);
    g.lineStyle(1.2,0x404e48);g.lineBetween(r.x+r.w*.22,r.y+r.h*.16,r.x+r.w*.55,r.y+r.h*.65);g.lineBetween(r.x+r.w*.55,r.y+r.h*.65,r.x+r.w*.83,r.y+r.h*.32);
  }
  drawPallet(p:Pallet,_time:number){const broken=p.state==='broken';if(p.axis==='x'){if(broken){this.rect(p.x-4,p.y-20,4,17,0x776047);this.rect(p.x+6,p.y+3,4,18,0x776047);}else{this.rect(p.x-10,p.y-24,20,48,0x443c2c);for(let i=0;i<4;i++){this.rect(p.x-12,p.y-22+i*12,p.state==='up'?16:25,9,i%2?0x9a8457:0x7b6c46);}this.rect(p.x+2,p.y-23,3,47,0x425a53);}return;}if(broken){this.rect(p.x-18,p.y+5,17,4,0x60553b);this.rect(p.x+3,p.y-2,18,4,0x716047);return;}this.rect(p.x-24,p.y+(p.state==='up'?-10:-5),48,p.state==='up'?16:23,0x443c2c);for(let i=0;i<4;i++){this.rect(p.x-22+i*12,p.y+(p.state==='up'?-13:-8),9,p.state==='up'?17:25,i%2?0x9a8457:0x7b6c46);this.rect(p.x-19+i*12,p.y-5,2,2,0x363d2b);}this.rect(p.x-23,p.y+2,47,3,0x425a53);}
  drawStair(v:NonNullable<ReturnType<typeof stairVisual>>){
    const c=TUNING.stairsVisual,p=v.point,g=this.art,up=v.direction==='up',w=c.width,h=c.length;
    // A dark stairwell for descent; raised risers and lit treads for ascent.
    this.rect(p.x-w/2-5,p.y-h/2-5,w+10,h+10,up?0x292e27:0x100e10);
    for(let i=0;i<c.steps;i++){
      const t=i/(c.steps-1),y=p.y-h/2+i*h/c.steps,width=w*(up?1:.95-t*.22),step=h/c.steps;
      this.rect(p.x-width/2,y,width,step, v.basement?c.basementColor:up?c.upColor:c.downColor);
      this.rect(p.x-width/2,y+step-c.rise,width,c.rise,up?0x605640:0x211c1c);
      this.rect(p.x-width/2,y,width,2,up?0xe0cca1:0x8c826e,up?1:1-t*.7);
      if(!up)this.rect(p.x-width/2,y,width,step,0x06070a,t*.6);
    }
    g.lineStyle(3,v.basement?0x65534a:0x9b917a);g.lineBetween(p.x-w/2-2,p.y-h/2,p.x-w/2-2,p.y+h/2);g.lineBetween(p.x+w/2+2,p.y-h/2,p.x+w/2+2,p.y+h/2);
    if(v.basement){
      // Fixed stains distinguish basement access on both floors without flicker.
      for(const [dx,dy,r] of [[-12,-25,5],[10,-8,4],[-8,12,6],[13,25,3],[-16,-40,4],[4,40,3]]){this.circle(p.x+dx,p.y+dy,r,c.bloodColor,.9);this.rect(p.x+dx-2,p.y+dy,3,9,0x4c111b,.8);}
    }
    const direction=up?-1:1,end=p.y+direction*18;
    g.lineStyle(3,v.basement?0xe8a397:0xe6deb5);g.lineBetween(p.x,p.y-direction*16,p.x,end);g.lineBetween(p.x,end,p.x-7,end-direction*8);g.lineBetween(p.x,end,p.x+7,end-direction*8);
  }
  drawDeaths(m:Match){
    const original=this.art;this.art=this.souls;
    for(const s of m.survivors){
      if(s.deathAt===undefined||!s.deathFrom||m.renderTime-s.deathAt>=DEATH_DURATION)continue;
      const p=s.deathFrom;if(!m.finished&&s.id!==this.viewId&&!m.canSee(m.actors[this.viewId],p))continue;
      const {t,rise,bodyAlpha,soulAlpha,spread}=deathPose(m.renderTime-s.deathAt),x=p.x,y=p.y-rise,g=this.art;
      this.rect(p.x-13,p.y-5,26,10,0x65736b,bodyAlpha);this.circle(p.x+13,p.y-3,5,0xb1ad93,bodyAlpha);
      for(let i=3;i>0;i--)this.circle(x,y-9,8+i*7,0xbcebd6,soulAlpha*.035);
      this.circle(x,y-19,5,0xe7fff0,soulAlpha);g.fillStyle(0xc8f7e0,soulAlpha*.8);
      g.fillPoints([{x:x-5,y:y-13},{x:x+5,y:y-13},{x:x+9,y:y+8},{x:x+2,y:y+3},{x:x-2,y:y+13},{x:x-8,y:y+8}],true);
      g.lineStyle(2,0xe0ffea,soulAlpha*.7);g.lineBetween(x-4,y-9,x-13-t*9,y-18);g.lineBetween(x+4,y-9,x+13+t*9,y-18);
      for(let i=0;i<16;i++){const phase=i*2.4+t*5,px=x+Math.sin(phase)*spread,py=p.y-t*(40+i*6)+Math.cos(phase)*7;this.rect(px,py,2,3,0xc7ffe1,Math.sin(Math.PI*t)*(1-i/22)*.75);}
    }
    this.art=original;
  }
  drawLockers(m:Match,level:number){
    for(const l of m.lockers.filter(l=>floorOf(l)===level)){
      const g=this.art,elapsed=m.renderTime-l.openedAt,open=elapsed<0?0:Math.max(0,1-elapsed/.9);
      this.rect(l.x-18,l.y-31,36,47,0x182320);this.rect(l.x-16,l.y-29,32,43,0x482b29);
      this.rect(l.x-19,l.y-34,38,5,0x92745a);this.rect(l.x-19,l.y+14,38,4,0x302d26);
      for(const side of [-1,1]){
        const hinge=l.x+side*16,edge=l.x+side*(open*24),top=l.y-28;
        g.fillStyle(0x754c3c);g.fillPoints([{x:hinge,y:top},{x:edge,y:top+open*10},{x:edge,y:l.y+13+open*10},{x:hinge,y:l.y+13}],true);
        g.lineStyle(1,0xaa8160);g.lineBetween(hinge,top,edge,top+open*10);
        for(let i=0;i<3;i++)this.rect(l.x+side*9-4,l.y-23+i*4,8,1,0x261f1d);
        this.rect(edge+side*3,l.y-2+open*10,2,6,0xd2b785);
      }
      if(m.player.lockerId===l.id){g.lineStyle(2,0xb8cf94,.8);g.strokeRect(l.x-20,l.y-35,40,54);}
    }
  }
  rect(x:number,y:number,w:number,h:number,c:number,a=1){this.art.fillStyle(c,a);this.art.fillRect(Math.round(x),Math.round(y),w,h);}
  circle(x:number,y:number,r:number,c:number,a=1){this.art.fillStyle(c,a);this.art.fillCircle(x,y,r);}
  actor(a:Actor,menu=false){
    if(a.lockerId!==undefined)return;
    let {x,y}=actorPosition(a);const g=this.art;
    if(a.transition>0&&a.motionFrom&&a.motionDuration){const t=1-a.transition/a.motionDuration;y-=Math.sin(Math.PI*t)*(a.action==='放板'?0:a.action==='落地'?30:a.vaultMode==='slow'?6:16);}
    if(a.role==='killer'&&a.charge>0){x+=Math.cos(a.angle)*a.charge*3;y+=Math.sin(a.angle)*a.charge*3;}if(a.life==='dead'||a.life==='escaped')return;
    if(a.life==='carried'){
      const carrier=this.match!.killer,job=activeWork(this.match!,carrier),progress=job?.kind==='hook'?carrier.progress:0,t=progress*progress*(3-2*progress);
      if(job?.kind==='hook'){x=carrier.x+(job.target.x+11-carrier.x)*t;y=carrier.y-14+(job.target.y-10-(carrier.y-14))*t-Math.sin(Math.PI*t)*13;}
      const g=this.art;this.rect(x-12+4*t,y-8,24-8*t,9+9*t,[0x73866c,0x9a7659,0x5c7c80,0x9a8264][a.id]);this.rect(x-19*(1-t)-5,y-10-13*t,10,10,0xc3ad88);
      g.lineStyle(4,0x344643);for(const side of [-1,1]){g.lineBetween(x+9*(1-t)+side*4*t,y+1+4*t,x+15*(1-t)+side*7*t,y+10+5*t);g.lineBetween(x+15*(1-t)+side*7*t,y+10+5*t,x+12*(1-t)+side*5*t,y+16+7*t);}g.lineStyle(3,0xb9a486);g.lineBetween(x-4,y-3,x-9,y+11);return;
    }
    if(a.role==='survivor'&&a.action==='翻越'&&(a.vaultKind==='window'||a.vaultKind==='pallet')&&a.transition>0){
      const t=1-a.transition/a.motionDuration!,fast=a.vaultMode==='fast',dx=a.x-a.motionFrom!.x,dy=a.y-a.motionFrom!.y,len=Math.hypot(dx,dy)||1,fx=dx/len,fy=dy/len,dir=Math.sign(dx||dy)||1;
      this.circle(x,y+12,11,0x050c0c,.4);
      this.rect(x-8,y-9,16,fast?10:17,[0x73866c,0x9a7659,0x5c7c80,0x9a8264][a.id]);
      this.rect(x+fx*(fast?10:4)-5,y+fy*(fast?6:2)-(fast?12:20),10,10,0xc3ad88);
      g.lineStyle(4,0x344643);
      for(const side of [-1,1]){const kick=fast?dir*(-16+side*4*Math.sin(t*Math.PI)):side*7*Math.sin(t*Math.PI);g.lineBetween(x-side*4,y+2,x+kick,y+(fast?5:15));}
      g.lineStyle(3,0xb9a486);g.lineBetween(x+fx*5,y-6+fy*3,x+fx*(fast?19:12),y+5+fy*9);
      this.drawHeart(a,x,y);return;
    }
    const work=this.match?activeWork(this.match,a):null;if(work){this.workerActor(a,x,y,work);this.drawHeart(a,x,y);return;}
    const killer=a.role==='killer',walk=a.moving?Math.sin(this.clock*12)*3:0;
    if(killer){this.killerActor(a,x,y,walk,menu);return;}
    this.circle(x+2,y+5,killer?15:11,0x050c0c,.55);
    if(a.life==='down'){this.rect(x-12,y-2,22,9,0x765149);this.rect(x+9,y-4,8,8,0xb3a384);this.rect(x-15,y+4,8,4,0x2b3030);this.rect(x-20,y-15,40,4,0x15251f);this.rect(x-20,y-15,40*healingProgress(a),4,0xa5dabb);this.drawHeart(a,x,y);return;}
    if(a.life==='hooked'){
      const struggle=a.hooks>1?1.8:1,phase=(this.match?.renderTime??this.clock)*5*struggle+a.id,sway=Math.sin(phase*.55)*3*struggle,kick=Math.sin(phase)*5*struggle;
      x+=11+sway*.45;y-=26+Math.sin(phase*1.5)*.7;
      
      this.rect(x-7,y-12,15,19,[0x73866c,0x9a7659,0x5c7c80,0x9a8264][a.id]);this.rect(x+3,y-8,4,12,0x983f36);
      this.rect(x-5,y-24,11,11,0xc3ad88);this.rect(x-6,y-26,13,5,0x3c3e2e);
      g.lineStyle(4,0xb8a181);g.lineBetween(x-7,y-6,x-12,y-3+kick*.15);g.lineBetween(x-12,y-3+kick*.15,a.x+9,a.y-39);g.lineBetween(x+7,y-6,x+12,y-4-kick*.15);g.lineBetween(x+12,y-4-kick*.15,a.x+17,a.y-42);
      // Fixed iron penetrates the upper torso; hands grip it while the body hangs below.
      g.lineStyle(3,0xb3aaa0);g.beginPath();g.moveTo(a.x+19,a.y-55);g.lineTo(a.x+19,a.y-40);g.lineTo(a.x+11,a.y-36);g.lineTo(a.x+7,a.y-40);g.strokePath();
      this.rect(a.x+8,a.y-39,4,4,0x8e3f34);this.rect(a.x+6,a.y-42,3,3,0xd4cab1);
      g.lineStyle(5,0x344643);g.lineBetween(x-4,y+5,x-7-kick*.5,y+17);g.lineBetween(x-7-kick*.5,y+17,x-2-kick,y+24);g.lineBetween(x+4,y+5,x+8+kick*.5,y+14);g.lineBetween(x+8+kick*.5,y+14,x+5+kick,y+22);
      this.rect(x-5-kick,y+23,7,4,0x121e1d);this.rect(x+3+kick,y+21,7,4,0x121e1d);
      if(a.hooks>1){g.lineStyle(2,0x9f685a,.6);for(const side of [-1,1]){g.lineBetween(a.x+side*30,a.y-55,x+side*14,y-24+kick);g.lineBetween(x+side*14,y-24+kick,x+side*6,y-17);}}
      return;
    }
    if(a.crouching){const sway=a.moving?Math.sin(this.clock*7)*2:0,color=[0x73866c,0x9a7659,0x5c7c80,0x9a8264][a.id];
      g.lineStyle(5,0x344643);for(const side of [-1,1]){g.lineBetween(x+side*4,y+5,x+side*10,y+9+sway*side);g.lineBetween(x+side*10,y+9+sway*side,x+side*7,y+14);this.rect(x+side*7-3,y+13,7,3,0x121e1d);}
      this.rect(x-8,y-3+sway*.2,16,12,color);this.rect(x-5,y-14+sway*.2,12,11,0xc3ad88);this.rect(x-6,y-16+sway*.2,14,4,0x3c3e2e);
      g.lineStyle(3,0xb9a486);g.lineBetween(x-8,y,x-11,y+8);g.lineBetween(x+8,y,x+11,y+8);
      if(a.life==='injured')this.rect(x+3,y+3,4,5,0x8d4237);this.drawHeart(a,x,y+7);
      if(a.id===this.match?.playerId){g.lineStyle(1,0xdbe9af,.7);g.strokeEllipse(x,y+18,25,7);}return;
    }
    const palette=[0x73866c,0x9a7659,0x5c7c80,0x9a8264];
    this.rect(x-6,y+5+walk,5,10,killer?0x28312c:0x344643);this.rect(x+2,y+5-walk,5,10,killer?0x28312c:0x344643);
    this.rect(x-7,y+13+walk,6,3,0x121e1d);this.rect(x+2,y+13-walk,6,3,0x121e1d);
    this.rect(x-(killer?11:8),y-10,killer?22:16,killer?22:18,killer?0x555640:palette[a.id]);
    this.rect(x-(killer?10:7),y-9,4,16,killer?0x777356:0x9fa485);
    this.rect(x-2,y-9,3,16,killer?0x363e30:0x50634f);
    this.rect(x-(killer?15:11),y-7+walk,5,14,killer?0x444d38:palette[a.id]);this.rect(x+(killer?10:7),y-7-walk,5,14,killer?0x444d38:palette[a.id]);
    this.rect(x-(killer?15:11),y+5+walk,5,4,0xae9d7c);this.rect(x+(killer?10:7),y+5-walk,5,4,0xae9d7c);
    this.rect(x-6,y-20,12,12,killer?0xbbbea1:0xc3ad88);this.rect(x-7,y-22,14,5,killer?0x58604a:0x3c3e2e);
    this.rect(x-7,y-18,3,9,killer?0x777d63:0x3c3e2e);
    this.rect(x+2,y-16,2,2,0x3c4434);this.rect(x-7,y-7,5,12,0x4b5b44);this.rect(x-6,y-6,3,5,0x919475);
    if(a.life==='injured'){this.rect(x+4,y-4,4,9,0x8d4237);}
    this.drawHeart(a,x,y);
    if(a.invulnerable>0){g.lineStyle(1,0xcceaaa,.7);g.strokeCircle(x,y-2,21);}
    if(!menu&&a.id===this.match?.playerId){g.lineStyle(1,0xdbe9af,.8);g.beginPath();g.moveTo(x-11,y+20);g.lineTo(x,y+24);g.lineTo(x+11,y+20);g.strokePath();}
  }
  workerActor(a:Actor,x:number,y:number,work:{kind:string;target:Point}){
    const g=this.art,{kind}=work,killer=a.role==='killer',scale=killer?TUNING.killerVisual.bodyScale:1,target={x:x+(work.target.x-x)/scale,y:y+16+(work.target.y-y-16)/scale},t=(this.match!.renderTime-(a.workStarted??0)),phase=t*Math.PI*3;
    if(killer){g.save();g.translateCanvas(x,y+16);g.scaleCanvas(scale,scale);g.translateCanvas(-x,-y-16);}
    const angle=Math.atan2(target.y-y,target.x-x),fx=Math.cos(angle),fy=Math.sin(angle),sx=-fy,sy=fx;
    const stomping=kind==='break'||kind==='kick',stomp=stompPose(a.progress,kind==='break');
    const raised=kind==='rescue'||kind==='hook',crouch=kind==='heal'?5:kind==='repair'?3:0;
    const bx=x+fx*(stomping?-3:4),by=y+fy*(stomping?-3:4)+crouch,color=killer?0x555640:[0x73866c,0x9a7659,0x5c7c80,0x9a8264][a.id];
    this.circle(x+2,y+8,13,0x050c0c,.55);
    g.lineStyle(5,0x344039);g.lineBetween(bx-5,by+6,x-6,y+16);this.rect(x-9,y+15,8,4,0x121e1d);
    const footX=x+5+(stomping?fx*stomp.reach:0),footY=y+16+(stomping?fy*stomp.reach-stomp.lift:0);
    g.lineStyle(5,0x344039);g.lineBetween(bx+5,by+6,(bx+footX)*.5,by+8-(stomping?stomp.lift*.55:0));g.lineBetween((bx+footX)*.5,by+8-(stomping?stomp.lift*.55:0),footX,footY);this.rect(footX-3,footY,9,5,0x121e1d);
    this.rect(bx-8,by-11,17,20,color);this.rect(bx-7,by-10,4,17,killer?0x777356:0x9fa485);this.rect(bx-5+fx*2,by-22+fy*2,12,12,killer?0xbbbea1:0xc3ad88);this.rect(bx-6+fx*2,by-24+fy*2,14,5,killer?0x58604a:0x3c3e2e);
    for(const side of [-1,1]){
      const shoulder={x:bx+side*7,y:by-6};
      let tx=target.x+sx*side*6,ty=target.y+sy*side*6-(raised?30:kind==='gate'?18:kind==='heal'?4:6);
      if(kind==='repair'){tx+=fx*Math.sin(phase+side)*3;ty+=fy*Math.sin(phase+side)*3+Math.cos(phase+side)*1.5;}
      if(kind==='heal'){tx+=Math.sin(phase+side)*1.5;ty+=Math.cos(phase+side)*2;}
      if(kind==='gate'){tx+=Math.cos(phase)*5;ty+=Math.sin(phase)*5;}
      if(stomping){tx=bx-fx*8+sx*side*13;ty=by-fy*8+sy*side*13-5-stomp.lift*.2;}
      const distance=Math.hypot(tx-shoulder.x,ty-shoulder.y),scale=Math.min(1,34/Math.max(1,distance));tx=shoulder.x+(tx-shoulder.x)*scale;ty=shoulder.y+(ty-shoulder.y)*scale;
      const arm=solveArm(shoulder,{x:tx,y:ty},side,killer?17:15,killer?16:14);tx=arm.hand.x;ty=arm.hand.y;const ex=arm.elbow.x,ey=arm.elbow.y;
      g.lineStyle(5,color);g.lineBetween(shoulder.x,shoulder.y,ex,ey);g.lineStyle(4,0xb9a486);g.lineBetween(ex,ey,tx,ty);this.rect(tx-2,ty-2,5,5,0xc6b18d);
      if(kind==='repair'&&side===1){g.lineStyle(2,0xb8c3ae);g.lineBetween(tx,ty,tx+fx*7,ty+fy*7);g.lineBetween(tx+fx*7-sx*2,ty+fy*7-sy*2,tx+fx*7+sx*2,ty+fy*7+sy*2);}
      if(kind==='heal'&&side===1)this.rect(tx-3,ty-2,7,3,0xd7dbbc);
      if(killer&&stomping&&side===1){g.lineStyle(3,0x524733);g.lineBetween(tx,ty,tx-fx*5,ty-fy*5);g.lineStyle(4,0xc4c9b5);g.lineBetween(tx-fx*5,ty-fy*5,tx-fx*17,ty-fy*17+5);}
    }
    if(killer)g.restore();
    if(stomping&&stomp.impact){for(let i=0;i<5;i++)this.rect(work.target.x+(i-2)*7,work.target.y+4-Math.abs(i-2)*3,3,2,kind==='break'?0xae9466:0xd4bb81,.8);}
    if(a.id===this.match!.playerId){g.lineStyle(1,0xdbe9af,.8);g.lineBetween(x-10,y+23,x,y+27);g.lineBetween(x,y+27,x+10,y+23);}
  }
  drawHeart(a:Actor,x:number,y:number){
    const m=this.match;if(!m||m.player.role!=='survivor'||a.id!==this.viewId||!['healthy','injured','down'].includes(a.life))return;
    const danger=terrorStrength(a,m.killer);if(danger<=0)return;
    const beat=heartbeatProfile(danger),phase=Math.max(0,m.renderTime-this.soundFX.lastBeat)/beat.interval;
    const pulse=Math.exp(-Math.pow(phase/.095,2))+.55*Math.exp(-Math.pow((phase-.24)/.07,2));
    const size=(3.4+danger*5.8)*(1+pulse*(.15+danger*.22)),cx=x,cy=y-3;
    this.circle(cx,cy,size*2.3,0xf34343,(.04+danger*.08)*(.6+pulse));
    const g=this.art;g.fillStyle(danger>.7?0xff5550:0xd98b78,.75+danger*.25);g.fillCircle(cx-size*.38,cy-size*.2,size*.54);g.fillCircle(cx+size*.38,cy-size*.2,size*.54);g.fillTriangle(cx-size*.91,cy,cx+size*.91,cy,cx,cy+size);
    this.rect(cx-size*.45,cy-size*.43,Math.max(1,size*.22),Math.max(1,size*.2),0xffddc6,.85);
  }
  killerActor(a:Actor,x:number,y:number,walk:number,menu:boolean){
    const g=this.art,age=(this.match?.renderTime??0)-a.attackAt,charged=a.attackCharge>.25,attacking=a.action==='攻击'&&age>=0&&age<(charged?LUNGE.recovery:.5);
    const stunned=a.action==='眩晕'&&a.cooldown>0,t=this.match?.renderTime??0;
    if(stunned){const strength=Math.min(1,a.cooldown/.35);x+=Math.sin(t*17)*3*strength;y+=Math.sin(t*11)*2*strength;walk=Math.sin(t*9)*3;
      g.lineStyle(1,0xe5d390,.7);g.strokeEllipse(x,y-39,31,10);
      for(let i=0;i<3;i++){const phase=t*5+i*Math.PI*2/3;this.circle(x+Math.cos(phase)*16,y-39+Math.sin(phase)*5,2,0xffdfa0);}
    }
    const wiping=!stunned&&!attacking&&a.cooldown>0&&(a.wipeUntil??0)>t;
    const pose={...attackPose(a.charge,attacking?age:-1,charged)},angle=attacking?(a.attackAngle??a.angle):a.angle,fx=Math.cos(angle),fy=Math.sin(angle),sx=-fy,sy=fx;
    if(!menu&&(a.charge>0||attacking)){
      const reach=(a.charge>0?a.charge:a.attackCharge)>.25?CONFIG.lungeRange:CONFIG.attackRange;
      const active=charged?age>=LUNGE.contact&&age<=LUNGE.end:age>=0&&age<.16;
      const alpha=a.charge>0?.09:active?.3:.1,points:Phaser.Types.Math.Vector2Like[]=[{x:a.x,y:a.y}];
      const attackWalls=this.match!.attackObstacles(this.match!.attackTarget(reach,angle));
      for(let i=0;i<=48;i++){const theta=angle-CONFIG.attackHalfAngle+2*CONFIG.attackHalfAngle*i/48;let length=reach;
        for(let r=2;r<=reach;r+=2){if(!lineClear(a,{x:a.x+Math.cos(theta)*r,y:a.y+Math.sin(theta)*r,level:a.level},attackWalls)){length=Math.max(0,r-2);break;}}
        points.push({x:a.x+Math.cos(theta)*length,y:a.y+Math.sin(theta)*length});}
      g.fillStyle(0xf2bb79,alpha);g.fillPoints(points,true);g.lineStyle(active?2:1,0xffd49c,alpha*2.5);g.strokePoints(points,true);
    }
    g.save();g.translateCanvas(x,y+16);g.scaleCanvas(TUNING.killerVisual.bodyScale,TUNING.killerVisual.bodyScale);g.translateCanvas(-x,-y-16);
    if(wiping)Object.assign(pose,wipePose((t-a.attackAt-.5)/Math.max(.1,(a.wipeUntil??t)-a.attackAt-.5)));
    if(stunned){pose.lean=-7;pose.crouch=6;pose.reach=12;pose.lift=-4;pose.side=18;pose.blade=1.4;}
    const bodyX=x+fx*pose.lean,bodyY=y+fy*pose.lean+pose.crouch;
    this.circle(x+2,y+8,16,0x050c0c,.55);
    if(pose.trail>.05){for(let i=3;i>0;i--){const d=i*10;g.lineStyle(2,0xdad4ac,pose.trail*.12);g.lineBetween(x-fx*d+sx*12,y-fy*d+sy*12,x-fx*(d+12)+sx*12,y-fy*(d+12)+sy*12);g.lineBetween(x-fx*d-sx*12,y-fy*d-sy*12,x-fx*(d+12)-sx*12,y-fy*(d+12)-sy*12);}}
    // Planted rear foot, reaching front foot, lowered hips and forward shoulder.
    for(const side of [-1,1]){const footX=x+side*5+fx*pose.stride*side,footY=y+14+fy*pose.stride*side+walk*side;g.lineStyle(5,0x28312c);g.lineBetween(bodyX+side*5,bodyY+5,footX,footY);this.rect(footX-3,footY,7,4,0x121e1d);}
    this.rect(bodyX-11,bodyY-10,22,22,0x555640);this.rect(bodyX-10,bodyY-9,4,17,0x777356);this.rect(bodyX-2,bodyY-9,3,18,0x363e30);
    const headX=bodyX+fx*pose.lean*.35,headY=bodyY-19+fy*pose.lean*.25;
    this.rect(headX-6,headY,12,12,0xbbbea1);this.rect(headX-7,headY-2,14,5,0x58604a);this.rect(headX-7,headY+2,3,9,0x777d63);this.rect(headX-4+fx,headY+5,3,2,0x262d24);this.rect(headX+2+fx,headY+5,3,2,0x262d24);
    const chop=0;
    const handReach=pose.reach*.65,arm=solveArm({x:bodyX+9,y:bodyY-6},{x:bodyX+fx*handReach+sx*pose.side,y:bodyY+fy*handReach+sy*pose.side-pose.lift},1);const handX=arm.hand.x,handY=arm.hand.y;
    const elbowX=arm.elbow.x,elbowY=arm.elbow.y;
    g.lineStyle(6,0x444d38);g.lineBetween(arm.shoulder.x,arm.shoulder.y,elbowX,elbowY);g.lineStyle(5,0x777356);g.lineBetween(elbowX,elbowY,handX,handY);this.rect(handX-3,handY-2,6,5,0xae9d7c);
    const rub=10+5*Math.sin(t*11),offX=wiping?handX+Math.cos(angle+pose.blade)*rub:bodyX-fx*(4+pose.lean*.5)-sx*13,offY=wiping?handY+Math.sin(angle+pose.blade)*rub:bodyY-fy*(4+pose.lean*.5)-sy*13+4;
    const off=solveArm({x:bodyX-9,y:bodyY-6},{x:offX,y:offY},-1,14,13);g.lineStyle(5,0x444d38);g.lineBetween(off.shoulder.x,off.shoulder.y,off.elbow.x,off.elbow.y);g.lineStyle(4,0x777356);g.lineBetween(off.elbow.x,off.elbow.y,off.hand.x,off.hand.y);this.rect(off.hand.x-2,off.hand.y,5,5,0xae9d7c);
    const bladeAngle=angle+pose.blade-chop*.6,bx=Math.cos(bladeAngle),by=Math.sin(bladeAngle);
    const tipX=handX+bx*27,tipY=handY+by*27;
    g.lineStyle(5,0x514835);g.lineBetween(handX-bx*5,handY-by*5,handX+bx*5,handY+by*5);
    g.lineStyle(2,0xb0a789);g.lineBetween(handX+bx*5-by*5,handY+by*5+bx*5,handX+bx*5+by*5,handY+by*5-bx*5);
    g.fillStyle(0xbec5b7);g.fillPoints([{x:handX+bx*7-by*3,y:handY+by*7+bx*3},{x:handX+bx*7+by*3,y:handY+by*7-bx*3},{x:tipX,y:tipY},{x:handX+bx*21-by*3,y:handY+by*21+bx*3}],true);
    g.lineStyle(1,0xf4f0d6);g.lineBetween(handX+bx*7+by*3,handY+by*7-bx*3,tipX,tipY);
    if(attacking&&pose.trail>.05){g.lineStyle(charged?4:2,0xf3e3bb,pose.trail*.75);g.lineBetween(tipX-fx*25,tipY-fy*25,tipX+fx*11,tipY+fy*11);for(const side of [-1,1]){g.lineStyle(1,0xf3e3bb,pose.trail*.35);g.lineBetween(tipX-fx*32+sx*side*7,tipY-fy*32+sy*side*7,tipX-fx*4+sx*side*7,tipY-fy*4+sy*side*7);}}
    g.restore();
    if(a.charge>0){g.lineStyle(2,a.charge>.25?0xe4bd76:0xa8b491,.8);g.beginPath();g.arc(x,y+4,28,-Math.PI/2,-Math.PI/2+Math.PI*2*a.charge);g.strokePath();}
    if(!menu&&a.id===this.match?.playerId){g.lineStyle(1,0xdbe9af,.8);g.beginPath();g.moveTo(x-11,y+22);g.lineTo(x,y+26);g.lineTo(x+11,y+22);g.strokePath();}
  }
  drawObjects(m:Match){
    const g=this.art,level=floorOf(m.actors[this.viewId]);
    for(const gate of m.gates.filter(o=>floorOf(o)===level)){
      const open=gateOpening(gate,m.renderTime),left=gate.id===0,end=gateExit(gate),exitX=Math.min(end.x,gate.x);
      this.rect(exitX,gate.y-52,160,104,0x18231f);
      for(let i=0;i<7;i++){const xx=left?gate.x-20-i*18:gate.x+20+i*18;this.rect(xx,gate.y-49,2,98,0x758779,.16);this.circle(xx,gate.y,22,0xcfe6bb,.025*open);}
      for(const side of [-1,1]){this.rect(exitX,gate.y+side*60-6,160,12,0x465149);this.rect(gate.x-16,gate.y+side*61-12,32,24,0x616953);
        const yy=gate.y+(side<0?-54-open*54:open*54);this.rect(gate.x-7,yy,14,54,0x697266);this.rect(gate.x-5,yy+2,4,50,0xa1aa8b);
        for(let n=0;n<5;n++)this.rect(gate.x-11,yy+5+n*10,22,3,0x3a4940);}
      this.rect(gate.x-20,gate.y-89,40,16,0x313f37);this.rect(gate.x-12,gate.y-85,24,7,m.powered?0xdce9aa:0x884f3e);
      this.rect(gate.x+(left?20:-30),gate.y-38,10,23,0x66705b);this.rect(gate.x+(left?22:-28),gate.y-35,6,5,m.powered?0xe2cd84:0x713e32);
      if(gate.progress>0&&gate.progress<1){this.rect(gate.x-24,gate.y+80,48,4,0x26372c);this.rect(gate.x-24,gate.y+80,48*gate.progress,4,0xd1e39d);}
      if(open>0){const near=m.player.role==='killer'&&dist(m.killer,end)<100,pulse=Math.max(0,1-(m.renderTime-(gate.blockedAt??-10))/.6);
        if(near||pulse>0){g.lineStyle(2+pulse*3,0xe27f61,.4+pulse*.5);g.lineBetween(end.x,gate.y-54,end.x,gate.y+54);for(let n=0;n<8;n++){const yy=gate.y-50+n*14;g.lineStyle(1,0xf2aa7b,.3+pulse*.6);g.lineBetween(end.x-7-Math.sin(m.renderTime*8+n)*5,yy,end.x+7,yy+9);}}
      }
    }
    for(const gen of m.generators.filter(o=>floorOf(o)===level)){if((gen.blockedUntil??0)>m.renderTime){for(let i=0;i<3;i++){const t=(m.renderTime*.6+i*.33)%1;this.circle(gen.x+Math.sin(i+m.renderTime)*8,gen.y-20-t*25,4+t*6,0x8a8070,(1-t)*.25);}}const done=gen.progress>=1,repairing=m.actors.some(a=>a.action===`repair:${gen.id}`&&activeWork(m,a));if(repairing){const shake=Math.sin(m.renderTime*32);this.rect(gen.x-13+shake,gen.y-30,5,5,0xbac6a0);this.rect(gen.x+6-shake,gen.y-29,5,5,0xbac6a0);if(Math.sin(m.renderTime*14)>.94){for(let i=0;i<3;i++)this.rect(gen.x+18+i*4,gen.y-10-i*3,2,3,0xebd88a);}}this.circle(gen.x,gen.y+7,25,0x060f10,.5);this.rect(gen.x-18,gen.y-12,36,28,0x343e35);this.rect(gen.x-15,gen.y-16,30,24,0x60634b);this.rect(gen.x-13,gen.y-15,25,3,0x969076);for(let i=0;i<3;i++){this.rect(gen.x-11+i*9,gen.y-27,5,17,0x8a876d);this.rect(gen.x-10+i*9,gen.y-26,2,12,0x454e3e);}this.rect(gen.x-9,gen.y-7,18,12,0x273e34);this.rect(gen.x-6,gen.y-4,4,4,done?0xcfe997:0xc2874c);this.rect(gen.x+2,gen.y-4,4,4,done?0xcfe997:0x4e6547);this.rect(gen.x-20,gen.y+11,8,9,0x1c2d27);this.rect(gen.x+11,gen.y+11,8,9,0x1c2d27);
      if(done){this.circle(gen.x,gen.y-12,49,0xcfe995,.035);this.circle(gen.x,gen.y-12,27,0xcfe995,.05);}else if(gen.progress>0){this.rect(gen.x-19,gen.y+27,38,3,0x172b25);this.rect(gen.x-19,gen.y+27,38*gen.progress,3,0xc3d99c);}
    }
    for(const h of m.hooks.filter(o=>floorOf(o)===level)){this.rect(h.x-5,h.y-41,8,51,0x494c3b);this.rect(h.x-3,h.y-40,3,49,0x818063);this.rect(h.x-3,h.y-43,25,5,0x77765c);g.lineStyle(2,h.occupant===null?0xa19a7d:0xac6750);g.beginPath();g.moveTo(h.x+19,h.y-39);g.lineTo(h.x+19,h.y-24);g.lineTo(h.x+11,h.y-20);g.lineTo(h.x+7,h.y-24);g.strokePath();this.rect(h.x-12,h.y+9,22,5,0x354433);}
    for(const p of m.pallets.filter(o=>floorOf(o)===level))this.drawPallet(p,m.renderTime);
    for(const w of windowSpots.filter(o=>floorOf(o)===level)){this.rect(w.x-10,w.y-23,20,46,0x4c6557,.55);this.rect(w.x-10,w.y-23,20,4,0x9caa82);this.rect(w.x-10,w.y+19,20,4,0x9caa82);}
    if(level===0&&(m.hatch.open||m.hatch.closed)){const h=m.hatch;this.rect(h.x-19,h.y-14,38,29,0x879078);this.rect(h.x-15,h.y-10,30,21,m.hatch.open?0x050c13:0x384a3b);if(m.hatch.open){this.circle(h.x,h.y,43,0x8ebfc3,.07);this.rect(h.x-14,h.y-23,28,11,0x78846c);}}
    for(const t of m.traces.filter(o=>floorOf(o)===level)){if(!this.match||this.match.player.role==='survivor'&&t.kind==='scratch')continue;const alpha=Math.min(.8,(t.until-m.renderTime)/4);if(t.kind==='scratch'){g.lineStyle(1,0xd76242,alpha);for(let i=0;i<3;i++)g.lineBetween(t.x+i*4,t.y-3,t.x+i*4-3,t.y+4);}if(t.kind==='blood'){this.rect(t.x,t.y,4,3,0x823c30,alpha);this.rect(t.x-3,t.y+4,3,2,0x823c30,alpha);}if(t.kind==='noise'&&m.player.role==='killer'){g.lineStyle(2,0xe6b76a,alpha);g.strokeCircle(t.x,t.y,13+Math.sin(this.clock*5)*5);}}
  }
  tree(x:number,y:number,size=1){
    this.circle(x+7,y+12,30*size,0x051517,.4);this.rect(x-4,y-15,9,27,0x545443);this.rect(x-3,y-14,3,26,0x898065);
    const colors=[0x17372c,0x214331,0x2d5038,0x3a5c3f];
    for(let tier=0;tier<4;tier++){
      const top=y-(83-tier*15)*size,max=(15+tier*6)*size;
      for(let row=0;row<9;row++){
        const half=Math.floor((3+(max-3)*row/8)/3)*3,yy=top+row*4*size;
        this.rect(x-half,yy,half*2,4*size,colors[3-tier]);
        this.rect(x+Math.max(0,half-8),yy,Math.min(8,half),4*size,colors[Math.max(0,2-tier)]);
        if(row>3&&row%2===0){this.rect(x-half+3,yy,Math.max(3,half*.45),2*size,0x557349,.4);this.rect(x+3,yy+1,4,2,0x142e28,.4);}
      }
      this.rect(x-max*.65,top+34*size,max*1.3,3*size,0x102b25,.7);
    }
  }
  update(_time:number,delta:number){
    this.tauntWheel.update();
    if(!this.paused&&!this.touch?.portrait)this.clock+=delta/1000;else {this.soundFX.stopWork();this.chargeAt=-1;this.attackPending=false;this.spacePending=false;this.specialPending=false;}const m=this.match;
    if(m&&!this.paused&&!this.touch?.portrait){this.accum=Math.min(this.accum+delta/1000,.15);this.spacePending=Phaser.Input.Keyboard.JustDown(this.keys.SPACE)||this.spacePending;this.specialPending=Phaser.Input.Keyboard.JustDown(this.keys.R)||this.specialPending;const space=this.spacePending,special=this.specialPending,pointer=this.input.activePointer;
      const world=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
      const input:Input={...EMPTY_INPUT,dx:Number(this.keys.D.isDown)-Number(this.keys.A.isDown),dy:Number(this.keys.S.isDown)-Number(this.keys.W.isDown),run:m.player.role==='survivor'&&this.keys.SHIFT.isDown,crouch:m.player.role==='survivor'&&pointer.rightButtonDown(),interact:this.keys.E.isDown||(m.player.role==='survivor'&&!pointer.wasTouch&&pointer.leftButtonDown()&&m.interaction(m.player)?.kind==='repair'),space,special,attack:this.attackPending,charge:this.chargeAt>=0?Math.min(1,(this.clock-this.chargeAt)/CONFIG.maxChargeTime):0,charging:this.chargeAt>=0&&pointer.leftButtonDown(),angle:Math.atan2(world.y-m.player.y,world.x-m.player.x)};
      if(this.touch?.used)Object.assign(input,this.touch.read());
      if(this.tauntWheel.open){input.interact=false;input.attack=false;input.charging=false;this.chargeAt=-1;this.attackPending=false;}
      const step=1/60;while(this.accum+1e-9>=step){input.taunt=this.tauntWheel.consume();const control=this.blockInput?{...EMPTY_INPUT,angle:m.player.angle}:input;if(this.network){if(!document.hidden||!this.network.isHost)this.network.tick(step,control);}else m.step(step,control);this.touch?.consume();input.space=false;input.special=false;input.attack=false;this.spacePending=false;this.specialPending=false;if(this.attackPending){this.attackPending=false;this.chargeAt=-1;}this.accum-=step;}
      for(const ev of m.events)if(ev.x!==undefined&&ev.y!==undefined)this.effects.push({x:ev.x,y:ev.y,level:ev.level,type:ev.type,until:m.renderTime+.65});this.onFrame(m);this.soundFX.work(this.paused?[]:m.actors.flatMap(a=>{const work=activeWork(m,a);return work?[{id:a.id,key:a.action,kind:work.kind,elapsed:m.renderTime-(a.workStarted??m.renderTime),intensity:Math.max(0,1-dist(a,m.player)/450)}]:[];}));const danger=m.player.role==='survivor'&&m.player.life!=='dead'&&m.player.life!=='escaped'?terrorStrength(m.player,m.killer):0;this.soundFX.ambient(m.renderTime,danger,m.isChasing(m.player));this.soundFX.chaseMusic(!this.paused&&m.isChasing(m.player));for(const a of m.actors)if(a.moving&&a.transition===0&&['healthy','injured'].includes(a.life))this.soundFX.footstep(a.id,m.renderTime,floorOf(a)>0||a.x>780&&a.x<1060&&a.y>520&&a.y<720,a.running,Math.max(0,1-dist(a,m.player)/300));
    }
    const camera=this.cameras.main;
    if(m){const a=m.actors[this.viewId];camera.setZoom(this.viewZoom());const pos=m.viewpoint(a);camera.centerOn(pos.x,pos.y);
      if(m.finished&&m.deathAnimating){const points=m.survivors.filter(s=>s.deathAt!==undefined&&m.renderTime-s.deathAt<DEATH_DURATION).map(s=>s.deathFrom!);const left=Math.min(...points.map(p=>p.x))-90,right=Math.max(...points.map(p=>p.x))+90,top=Math.min(...points.map(p=>p.y))-170,bottom=Math.max(...points.map(p=>p.y))+90;camera.setZoom(Math.min(this.viewZoom(),this.scale.width/(right-left),this.scale.height/(bottom-top)));camera.centerOn((left+right)/2,(top+bottom)/2);}
    }else camera.centerOn(1050+Math.sin(this.clock*.04)*15,660);
    this.art.clear();this.floorArt.clear();this.redStain.clear();this.selfLayer.clear();this.souls.clear();this.escapeLayers.forEach((g,id)=>{g.clear();g.setDepth(m&&id===this.viewId?21:0);});
    const display=m??this.menuMatch(),level=floorOf(display.actors[this.viewId]);
    const foreground=this.art;this.art=this.floorArt;
    if(level===1){this.rect(0,0,WORLD.w,WORLD.h,0x07110f,.76);const u=upperFloor;this.rect(u.x+8,u.y+14,u.w,u.h,0x000000,.5);this.rect(u.x,u.y,u.w,u.h,0x5c5139);for(let y=u.y;y<u.y+u.h;y+=12){this.rect(u.x,y,u.w,2,0x302f26);}for(const w of walls.filter(w=>floorOf(w)===1))this.rect(w.x,w.y,w.w,w.h,w.kind==='junk'?0x827055:0xa29670);}
    if(level===-1){this.rect(0,0,WORLD.w,WORLD.h,0x05080b);const r=display.basement.room;this.rect(r.x,r.y,r.w,r.h,0x39312b);for(let y=r.y+12;y<r.y+r.h;y+=16)this.rect(r.x+12,y,r.w-24,2,0x514137);for(const w of display.basement.terrain)this.rect(w.x,w.y,w.w,w.h,0x696052);}
    for(const stair of display.stairs){const visual=stairVisual(stair,level);if(visual)this.drawStair(visual);}
    if(level===1)for(const d of drops){this.rect(d.top.x-24,d.top.y+12,48,5,0xe2b771);for(let i=0;i<3;i++){this.art.lineStyle(2,0xe2b771,.8);this.art.lineBetween(d.top.x-8,d.top.y-5+i*7,d.top.x,d.top.y+i*7);this.art.lineBetween(d.top.x,d.top.y+i*7,d.top.x+8,d.top.y-5+i*7);}}
    this.art=foreground;
    if(m)this.drawRedStain(m);
    this.drawObjects(display);
    this.drawLockers(display,level);
    const visible=m?m.actors.filter(a=>floorOf(a)===level&&(a.id===this.viewId||m.canSee({...m.actors[this.viewId],...actorPosition(m.actors[this.viewId])},{...a,...actorPosition(a)}))):this.menuActors;
    if(m&&m.actors[this.viewId].role==='killer'){
      for(const a of m.survivors){
        if(visible.includes(a)&&a.lockerId===undefined)this.lastSeen.set(a.id,{actor:{...a,...actorPosition(a),motionFrom:undefined,transition:0},at:m.renderTime});
        else {const seen=this.lastSeen.get(a.id);if(seen&&a.crouching&&a.lockerId===undefined&&floorOf(a)===level&&m.renderTime-seen.at<.65){const g=this.escapeLayers[a.id],original=this.art;g.setAlpha((1-(m.renderTime-seen.at)/.65)*.55);this.art=g;this.actor(seen.actor);this.art=original;}else this.lastSeen.delete(a.id);}
      }
    }
    for(const a of [...visible].sort((a,b)=>a.y-b.y)){
      if(m&&a.life==='escaped'&&a.escapedAt!==undefined&&m.renderTime-a.escapedAt<.9){const original=this.art,t=(m.renderTime-a.escapedAt)/.9;this.art=this.escapeLayers[a.id];this.art.setAlpha(1-t);this.actor({...a,life:'injured',x:a.x+(a.x<960?-1:1)*t*12},false);this.art=original;}else if(m&&a.id===this.viewId){const original=this.art;this.art=this.selfLayer;this.actor(a,false);this.art=original;}else this.actor(a,!m);
    }
    for(const w of walls)if(w.kind==='tree'&&level===0)this.tree(w.x+(w.w===9?4:12),w.y+(w.w===9?5:12),w.w===9?1.2:1);
    // Lanterns and moths.
    if(level===0)for(const p of [{x:805,y:540},{x:1045,y:704},{x:1400,y:475}]){for(let i=3;i>0;i--)this.circle(p.x,p.y,i*13,0xd6b46a,.014);this.rect(p.x-2,p.y-5,4,7,0xe5cc84);this.rect(p.x-4,p.y-7,8,2,0x333c2d);}
    if(level===0)for(let i=0;i<24;i++){const x=600+(i*83)%1000+Math.sin(this.clock*.3+i)*12,y=300+(i*97)%800+Math.cos(this.clock*.4+i)*8;this.rect(x,y,2,2,0xb9cb81,.25+.2*Math.sin(this.clock+i));}
    if(m){this.effects=this.effects.filter(e=>e.until>m.renderTime);for(const e of this.effects.filter(e=>floorOf(e)===level)){const t=1-(e.until-m.renderTime)/.65;if(e.type==='generator-blast'){this.circle(e.x,e.y,10+t*43,0xf7b15e,(1-t)*.55);for(let i=0;i<12;i++){const a=i*2.4;this.rect(e.x+Math.cos(a)*t*52,e.y+Math.sin(a)*t*42-t*12,3,3,i%2?0xf5d695:0xe57d3d,1-t);}}if(e.type==='weapon-block'){for(let i=0;i<6;i++){const a=i*2.4;this.rect(e.x+Math.cos(a)*t*19,e.y+Math.sin(a)*t*19,2,2,0xf2d69a,1-t);}}if(e.type==='hit'){for(let i=0;i<8;i++){const angle=i*2.4;this.rect(e.x+Math.cos(angle)*t*30,e.y+Math.sin(angle)*t*24,3,3,0xb44d3b,1-t);}}if(e.type==='break'){for(let i=0;i<9;i++)this.rect(e.x+Math.cos(i*2)*t*40,e.y+Math.sin(i*2)*t*22-18*Math.sin(t*Math.PI),6,3,0xb89b62,1-t);}}}

    this.drawFog(m);
    if(m)this.drawDeaths(m);
  }
  private demo:Match|null=null;
  menuMatch(){if(!this.demo){this.demo=new Match('survivor',()=>.5);this.menuActors[4].x=1205;this.menuActors[4].y=632;this.menuActors[4].angle=2.5;this.menuActors[0].x=1010;this.menuActors[0].y=812;this.menuActors[1].x=1550;this.menuActors[1].y=820;this.menuActors[2].life='dead';this.menuActors[3].life='dead';}return this.demo;}
}


