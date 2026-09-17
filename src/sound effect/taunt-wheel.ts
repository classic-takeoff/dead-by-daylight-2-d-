import type { ForestScene } from '../scene';
import { TAUNTS, tauntSector } from './taunts';

export class TauntWheel {
 readonly element=document.createElement('div');
 readonly button=document.createElement('button');
 private origin={x:innerWidth/2,y:innerHeight/2};
 private mouse={...this.origin};private radius=140;private selected=-1;private keyboard=false;
 private pending:number|undefined;private owner:unknown;
 get open(){return !this.element.hidden;}
 constructor(private scene:ForestScene){
  this.element.id='taunt-wheel';this.element.hidden=true;this.element.setAttribute('aria-label','嘲讽语音轮盘');
  this.button.id='taunt-button';this.button.textContent='嘲讽';this.button.hidden=true;
  document.body.append(this.element,this.button);
  this.button.addEventListener('click',()=>{if(this.open){this.close();return;}const r=this.button.getBoundingClientRect();this.show(r.left+r.width/2,r.top-145,false);});
  document.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')this.mouse={x:e.clientX,y:e.clientY};if(this.open)this.highlight(tauntSector(e.clientX-this.origin.x,e.clientY-this.origin.y,this.radius));});
  document.addEventListener('keydown',e=>{
   if(e.code==='Escape'){this.close();return;}
   if(e.code!=='KeyQ'||e.repeat||e.ctrlKey||e.altKey||e.metaKey||(e.target instanceof HTMLElement&&e.target.closest('input,textarea,[contenteditable=true]')))return;
   if(this.allowed()){e.preventDefault();this.show(this.mouse.x,this.mouse.y,true);}
  });
  document.addEventListener('keyup',e=>{if(e.code==='KeyQ'&&this.open&&this.keyboard){e.preventDefault();this.commit();}});
  this.element.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});
  this.element.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(this.keyboard)return;this.highlight(tauntSector(e.clientX-this.origin.x,e.clientY-this.origin.y,this.radius));this.commit();});
  window.addEventListener('blur',()=>this.cancel());window.addEventListener('resize',()=>this.cancel());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.cancel();});
 }
 private allowed(){const s=this.scene,m=s.match;return !!m&&!m.finished&&!s.paused&&!s.blockInput&&!s.touch?.portrait&&!document.hidden&&!['dead','escaped'].includes(m.player.life);}
 update(){if(this.owner!==this.scene.match){this.cancel();this.owner=this.scene.match;}this.button.hidden=!this.scene.touch?.enabled||!this.allowed();if(!this.allowed())this.cancel();}
 consume(){const id=this.pending;this.pending=undefined;return id;}
 cancel(){this.pending=undefined;this.close();}
 close(){this.element.hidden=true;this.selected=-1;this.keyboard=false;}
 private commit(){if(this.allowed()&&this.selected>=0){this.scene.soundFX.init();this.pending=this.selected;}this.close();}
 show(x:number,y:number,keyboard:boolean){
  if(!this.allowed())return;
  this.radius=Math.min(140,(innerHeight-16)/2,(innerWidth-16)/2);
  // Desktop is anchored exactly to the cursor; mobile keeps every sector on screen.
  this.origin=keyboard?{x,y}:{x:Math.max(this.radius+8,Math.min(innerWidth-this.radius-8,x)),y:Math.max(this.radius+8,Math.min(innerHeight-this.radius-8,y))};
  this.keyboard=keyboard;this.selected=-1;this.element.style.cssText=`left:${this.origin.x-this.radius}px;top:${this.origin.y-this.radius}px;width:${this.radius*2}px;height:${this.radius*2}px`;
  const step=2*Math.PI/TAUNTS.length,point=(r:number,a:number)=>`${140+r*Math.cos(a)},${140+r*Math.sin(a)}`;
  this.element.innerHTML=`<svg viewBox="0 0 280 280" role="group">${TAUNTS.map((label,i)=>{const mid=-Math.PI/2+i*step,a=mid-step/2+.015,b=mid+step/2-.015;return `<g data-sector="${i}"><path d="M${point(38,a)} L${point(138,a)} A138 138 0 0 1 ${point(138,b)} L${point(38,b)} A38 38 0 0 0 ${point(38,a)} Z"/><text x="${140+91*Math.cos(mid)}" y="${140+91*Math.sin(mid)}">${label}</text></g>`;}).join('')}<circle cx="140" cy="140" r="35"/><text class="taunt-cancel" x="140" y="140">×</text></svg>`;
  this.element.hidden=false;
 }
 private highlight(index:number){this.selected=index;this.element.querySelectorAll('[data-sector]').forEach(el=>el.classList.toggle('selected',Number((el as HTMLElement).dataset.sector)===index));}
}
