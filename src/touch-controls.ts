import { TUNING } from './tuning';
import { CONFIG, EMPTY_INPUT, type Input, type Role } from './game';

export class TouchControls {
  private skillActive=false;private spaceAction=false;private hatchAvailable=false;private hatchPending=false;
  readonly enabled=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  get portrait(){return this.enabled&&innerHeight>innerWidth;}
  async landscape(){if(!this.enabled)return;try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();await (screen.orientation as ScreenOrientation&{lock?:(value:string)=>Promise<void>}).lock?.('landscape');}catch{/* iOS and embedded browsers use the rotate prompt. */}}
  used=false;
  readonly element=document.createElement('div');
  private state:Input={...EMPTY_INPUT,angle:-Math.PI/2};
  private repairId:number|null=null;private repairLatch:number|null=null;private lastLife="";
  private role:Role='survivor';private attackStart:number|null=null;private looking=false;
  private cancellations:Array<()=>void>=[];private controls=new Map<string,HTMLElement>();private active=false;
  constructor(){
    this.element.id='touch-controls';this.element.className='hidden';
    this.element.innerHTML=`<div class="touch-stick move-stick" data-control="move" aria-label="移动摇杆"><span class="stick-knob"></span><small>轻推走 · 推远跑</small></div><button class="touch-attack" data-control="attack" aria-label="攻击">攻击<small>长按突刺<br>拖动瞄准</small></button><div class="touch-actions"><button data-control="interact">交互<small>按住</small></button><button data-control="space">板窗<small>点按</small></button><button data-control="special" hidden disabled>抱起</button></div><div class="touch-movement"><button data-control="crouch" aria-pressed="false">蹲行</button></div>`;
    document.getElementById('app')!.append(this.element);if(this.enabled){const rotate=document.createElement('div');rotate.id='rotate-phone';rotate.innerHTML='<span>↻</span><strong>请横置手机</strong><p>横屏游玩 · 轻推摇杆慢走，推远奔跑</p>';document.body.append(rotate);}
    this.element.querySelectorAll<HTMLElement>('[data-control]').forEach(el=>this.controls.set(el.dataset.control!,el));
    document.addEventListener('keydown',()=>{this.used=false;});document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&!this.element.contains(e.target as Node))this.used=false;});
    if(this.enabled)document.body.classList.add('touch-device');
    this.stick('move');
    this.hold('interact',()=>{if(this.hatchAvailable){this.hatchPending=true;this.state.interact=true;return;}if(this.spaceAction){this.state.space=true;return;}if(this.role==='survivor'&&this.repairId!==null){this.repairLatch=this.repairLatch===this.repairId?null:this.repairId;this.state.interact=this.repairLatch!==null;}else this.state.interact=true;},cancel=>{if(cancel){this.repairLatch=null;this.hatchPending=false;}this.state.interact=this.hatchPending||this.repairLatch!==null;});
    let attackOrigin={x:0,y:0};
    this.hold('attack',e=>{attackOrigin={x:e.clientX,y:e.clientY};this.attackStart=performance.now();this.state.charging=true;},cancel=>{if(this.attackStart!==null&&!cancel){this.state.charge=Math.min(1,(performance.now()-this.attackStart)/(1000*CONFIG.maxChargeTime));this.state.attack=true;}this.attackStart=null;this.state.charging=false;this.looking=false;},e=>{const dx=e.clientX-attackOrigin.x,dy=e.clientY-attackOrigin.y;if(Math.hypot(dx,dy)>TUNING.touch.attackAimDeadZone){this.state.angle=Math.atan2(dy,dx);this.looking=true;}});
    this.hold('space',()=>{if(this.skillActive)this.state.space=true;},()=>{});this.hold('special',()=>this.state.special=true,()=>{});
    this.hold('crouch',()=>{this.cancelRepair();this.state.crouch=!this.state.crouch;this.movementLabels();},()=>{});
    window.addEventListener('blur',()=>this.reset());window.addEventListener('resize',()=>this.reset());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
  }
  private hold(name:string,down:(e:PointerEvent)=>void,up:(cancel:boolean)=>void,move?:(e:PointerEvent)=>void){
    const el=this.controls.get(name)!;let pointer:number|null=null;this.cancellations.push(()=>{const id=pointer;pointer=null;if(id!==null&&el.hasPointerCapture(id))el.releasePointerCapture(id);up(true);});
    el.addEventListener('pointerdown',e=>{if(!this.active||pointer!==null||el.hidden||(el instanceof HTMLButtonElement&&el.disabled))return;e.preventDefault();e.stopPropagation();this.used=true;pointer=e.pointerId;el.setPointerCapture(pointer);el.classList.add('pressed');down(e);});
    el.addEventListener('pointermove',e=>{if(e.pointerId===pointer)move?.(e);});
    const finish=(e:PointerEvent)=>{if(e.pointerId!==pointer)return;pointer=null;el.classList.remove('pressed');up(e.type!=='pointerup');};
    el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);el.addEventListener('lostpointercapture',finish);
  }
  private stick(name:'move'|'look'){
    const el=this.controls.get(name)!,knob=el.querySelector<HTMLElement>('.stick-knob')!;let pointer:number|null=null;this.cancellations.push(()=>{const id=pointer;pointer=null;if(id!==null&&el.hasPointerCapture(id))el.releasePointerCapture(id);});
    const update=(e:PointerEvent)=>{const r=el.getBoundingClientRect(),radius=r.width*TUNING.touch.stickRadiusRatio,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,n=Math.hypot(dx,dy),scale=Math.min(1,radius/Math.max(1,n));knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
      if(name==='move'){if(n>TUNING.touch.deadZone)this.cancelRepair();this.state.run=n/radius>=TUNING.touch.runThreshold;this.movementLabels();this.state.dx=n>TUNING.touch.deadZone?dx/Math.max(1,n):0;this.state.dy=n>TUNING.touch.deadZone?dy/Math.max(1,n):0;if(n>TUNING.touch.deadZone&&!this.looking)this.state.angle=Math.atan2(dy,dx);}
      else if(n>TUNING.touch.deadZone){this.state.angle=Math.atan2(dy,dx);this.looking=true;}
    };
    el.addEventListener('pointerdown',e=>{if(!this.active||pointer!==null)return;e.preventDefault();e.stopPropagation();this.used=true;pointer=e.pointerId;el.setPointerCapture(pointer);update(e);});
    el.addEventListener('pointermove',e=>{if(e.pointerId===pointer)update(e);});
    const finish=(e:PointerEvent)=>{if(e.pointerId!==pointer)return;pointer=null;knob.style.transform='';if(name==='move'){this.state.dx=0;this.state.dy=0;this.state.run=false;this.movementLabels();}};
    el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);el.addEventListener('lostpointercapture',finish);
  }
  configure(role:Role,angle:number){this.role=role;this.reset();this.state.angle=angle;this.looking=false;this.state.run=false;this.element.dataset.role=role;this.movementLabels();}
  show(visible:boolean){this.active=visible&&this.enabled;this.element.classList.toggle('hidden',!this.active);if(!this.active)this.reset();}
  private movementLabels(){this.controls.get('move')!.dataset.pace=this.state.crouch?'crouch':this.state.run?'run':'walk';this.controls.get('crouch')!.setAttribute('aria-pressed',String(this.state.crouch));}
  private cancelRepair(){if(this.repairLatch!==null){this.repairLatch=null;this.state.interact=false;}}
  reset(){
    this.repairLatch=null;this.repairId=null;this.skillActive=false;
    this.cancellations.forEach(cancel=>cancel());
    this.state={...EMPTY_INPUT,angle:this.state.angle,run:false};this.attackStart=null;
    for(const el of this.controls.values()){el.classList.remove('pressed');const knob=el.querySelector<HTMLElement>('.stick-knob');if(knob)knob.style.transform='';}
    this.movementLabels();
  }
  read():Input{return {...this.state,run:this.role==='survivor'&&this.state.run&&!this.state.crouch,crouch:this.role==='survivor'&&this.state.crouch,charge:this.attackStart!==null?Math.min(1,(performance.now()-this.attackStart)/(1000*CONFIG.maxChargeTime)):this.state.charge};}
  consume(){if(this.hatchPending){this.hatchPending=false;this.state.interact=false;}this.state.space=false;this.state.special=false;this.state.attack=false;}
  context(skill:boolean,life:string,repairId:number|null=null,spaceAction=false,qteAvailable=skill,carryAction:'pickup'|'drop'|null=null,hatchAvailable=false){
    this.skillActive=skill;this.spaceAction=spaceAction;this.hatchAvailable=hatchAvailable;
    const special=this.controls.get('special')! as HTMLButtonElement;
    special.hidden=this.role!=='killer'||carryAction===null;special.disabled=special.hidden;
    special.textContent=carryAction==='drop'?'放下':'抱起';
    if(special.hidden)this.state.special=false;
    if(repairId!==this.repairId||life!==this.lastLife)this.cancelRepair();this.repairId=repairId;this.lastLife=life;
    const interact=this.controls.get('interact')!;
    interact.innerHTML=hatchAvailable?'地窖<small>立即逃生</small>':spaceAction?(life==='carried'?'\u6323\u624e':life==='hooked'?'\u81ea\u6551':'\u677f\u7a97')+'<small>\u70b9\u6309</small>':repairId!==null?(this.repairLatch!==null?'\u505c\u6b62\u7ef4\u4fee<small>\u70b9\u6309</small>':'\u4fee\u673a<small>\u70b9\u6309</small>'):'\u4ea4\u4e92<small>\u6309\u4f4f</small>';
    interact.setAttribute('aria-pressed',String(this.repairLatch!==null));
    const qte=this.controls.get('space')!;qte.innerHTML='QTE<small>'+ (skill?'\u70b9\u6309\u6821\u51c6':'\u7b49\u5f85\u6821\u51c6')+'</small>';qte.style.visibility=qteAvailable?'visible':'hidden';(qte as HTMLButtonElement).disabled=!skill;
  }

}
