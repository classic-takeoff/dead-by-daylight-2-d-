import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
if(process.argv.includes('--finalize')){
 edit('src/main.ts',s=>s.replace("<span><kbd>SPACE</kbd> 板窗 / 校准</span>'","<span><kbd>SPACE</kbd> 板窗 / 校准</span><span><kbd>Q</kbd> 长按嘲讽</span>'").replace("<span><kbd>E</kbd> 破坏 / 挂钩</span>'","<span><kbd>E</kbd> 破坏 / 挂钩</span><span><kbd>Q</kbd> 长按嘲讽</span>'"));
 edit('scripts/audio-check.mjs',s=>s.replaceAll('buffers.size===38','buffers.size===45').replaceAll('result.samples,38','result.samples,45'));
 let check=readFileSync(resolve(import.meta.dirname,'taunt-rules-check.mjs'),'utf8').replace("'../game.ts'","'../src/game'").replace("'../network-state.ts'","'../src/network-state'").replace("'../direction-alerts.ts'","'../src/direction-alerts'").replace("'./taunts.ts'","'../src/sound effect/taunts'");
 const body=check.indexOf('for(const invalid');check="import test from 'node:test';\n"+check.slice(0,body)+"test('taunt inputs, radial selection, hearing range and multiplayer snapshots',()=>{\n"+check.slice(body).replace(/console.log\([^\n]+\);/,'')+'\n});\n';
 writeFileSync(resolve(root,'tests/taunts.test.ts'),check);
 edit('README.md',s=>s+'\n\n## 嘲讽语音\n\n七段本地语音：叮叮叮、哎哟我去、哎哟我滴妈、奶龙、小孩糖笑、私人笑声、老牧师。电脑按住 Q 在鼠标位置打开轮盘，移入格子高亮，松开播放；中心 × 或圆盘外松开取消。手机点独立嘲讽按钮打开，点语音播放，点 × 关闭。暂停、失焦和旋转屏幕取消轮盘。\n\n声音在 700 世界单位（约 70m）内随距离线性衰减，楼层差计入距离；播放期间持续更新音量。屠夫听到幸存者语音时显示玩家名、方向、距离与楼层，提示随声源移动并在语音结束后消失。联机由房主验证请求，每位玩家只保留一条播放中的嘲讽，短于 0.25 秒的重复请求被忽略。\n');
 console.log('Added persistent taunt regression check, keyboard hints and documentation.');process.exit(0);
}
if(process.argv.includes('--refine')){
 edit('src/game.ts',s=>s.replace('validTaunt, tauntGain','validTaunt, tauntGain, TAUNT_DURATIONS').replace('a.tauntUntil=this.time+2','a.tauntUntil=this.time+.25').replace("if(a.role==='survivor'&&tauntGain(this.killer,source)>0){","if(a.role==='survivor'){").replace("actorId:a.id,until:this.time+5});this.noise(source);","actorId:a.id,until:this.time+TAUNT_DURATIONS[id]});if(tauntGain(this.killer,source)>0)this.noise(source);"));
 edit('src/audio.ts',s=>s.replace('  if(tauntGain(m.player,a)<=0)return;\n',''));
 edit('src/direction-alerts.ts',s=>s.replace("import type {Match} from './game';","import {actorPosition,type Match} from './game';").replace("return m.alerts.filter(a=>a.until>m.time&&['locker'","return m.alerts.map(a=>a.type==='taunt'&&a.actorId!==undefined?{...a,...actorPosition(m.actors[a.actorId])}:a).filter(a=>a.until>m.time&&['locker'"));
 console.log('Refined continuous voice attenuation and live hearing alerts.');process.exit(0);
}
function edit(file,fn){const path=resolve(root,file),before=readFileSync(path,'utf8');const after=fn(before);if(after===before)throw Error('No change: '+file);writeFileSync(path,after);}
function replace(s,a,b){if(!s.includes(a))throw Error('Missing anchor: '+a.slice(0,100));return s.replace(a,b);}
edit('src/game.ts',s=>{
 s="import { validTaunt, tauntGain } from './sound effect/taunts';\n"+s;
 s=replace(s,'export type Input={','export type Input={taunt?:number;');
 s=replace(s,'id:number;name:string;role:Role;','id:number;name:string;role:Role;tauntUntil?:number;');
 s=replace(s,'until:number;type:string}>=[]','until:number;type:string;name?:string;actorId?:number}>=[]');
 s=replace(s,'private controlPlayer(dt:number,input:Input){','private controlPlayer(dt:number,input:Input){this.playTaunt(this.player,input.taunt);');
 s=replace(s,'  emit(type:string',`  playTaunt(a:Actor,id:unknown){
    if(this.finished||!validTaunt(id)||['dead','escaped'].includes(a.life)||(a.tauntUntil??0)>this.time)return;
    a.tauntUntil=this.time+2;const source=actorPosition(a);
    this.emit('taunt:'+id+':'+a.id,'',source);
    if(a.role==='survivor'&&tauntGain(this.killer,source)>0){
      this.alerts=this.alerts.filter(alert=>alert.type!=='taunt'||alert.actorId!==a.id);
      this.alerts.push({...source,type:'taunt',name:a.name,actorId:a.id,until:this.time+5});this.noise(source);
    }
  }
  emit(type:string`);
 return s;
});
edit('src/network-state.ts',s=>replace("import { validTaunt } from './sound effect/taunts';\n"+s,'return {...EMPTY_INPUT,','return {...EMPTY_INPUT,taunt:validTaunt(v.taunt)?v.taunt:undefined,'));
edit('src/multiplayer.ts',s=>{
 s=s.replaceAll('space:false,special:false,attack:false','space:false,special:false,attack:false,taunt:undefined');
 s=replace(s,'input.special||=old.input.special;','input.special||=old.input.special;input.taunt??=old.input.taunt;');
 s=replace(s,'special:this.localInput.special||input.special','special:this.localInput.special||input.special,taunt:input.taunt??this.localInput.taunt');
 s=replace(s,'r.input.attack=false;','r.input.attack=false;r.input.taunt=undefined;');
 s=replace(s,'special:this.pending.special||input.special','special:this.pending.special||input.special,taunt:input.taunt??this.pending.taunt');return s;
});
edit('src/scene.ts',s=>{
 s="import { TauntWheel } from './sound effect/taunt-wheel';\n"+s;
 s=replace(s,'  network:Multiplayer','  tauntWheel!:TauntWheel;\n  network:Multiplayer');
 s=replace(s,"  create(){","  create(){\n    this.tauntWheel=new TauntWheel(this);");
 s=replace(s,'!p.wasTouch&&p.leftButtonDown()','!this.tauntWheel.open&&!p.wasTouch&&p.leftButtonDown()');
 s=replace(s,'  startMatch(m:Match){','  startMatch(m:Match){this.tauntWheel.cancel();');
 s=replace(s,'  showMenu(){','  showMenu(){this.tauntWheel.cancel();');
 s=replace(s,'  update(_time:number,delta:number){','  update(_time:number,delta:number){\n    this.tauntWheel.update();');
 s=replace(s,'      while(this.accum>=1/30){','      if(this.tauntWheel.open){input.interact=false;input.attack=false;input.charging=false;this.chargeAt=-1;this.attackPending=false;}\n      while(this.accum>=1/30){input.taunt=this.tauntWheel.consume();');
 return s;
});
edit('src/direction-alerts.ts',s=>{
 s="import { tauntGain } from './sound effect/taunts';\n"+s;
 s=replace(s,"['locker','rescue','generator-fail','heal-interrupt'].includes(a.type)","['locker','rescue','generator-fail','heal-interrupt','taunt'].includes(a.type)&&(a.type!=='taunt'||tauntGain(m.player,a)>0)");
 return replace(s,"label:a.type==='locker'?","label:a.type==='taunt'?(a.name??'幸存者')+' 正在嘲讽':a.type==='locker'?");
});
edit('src/audio.ts',s=>{
 s="import { TAUNTS, validTaunt, tauntGain } from './sound effect/taunts';\nimport type { Match } from './game';\n"+s;
 s=replace(s,'const SAMPLES=[',"const SAMPLES=[...TAUNTS.map(name=>name+'.mp3'),");
 s=replace(s,' private chaseLoop:',` private voices=new Map<number,{source:AudioBufferSourceNode;gain:GainNode}>();
 taunt(id:number,actor:number,m:Match){
  const c=this.context,a=m.actors[actor];if(!c||c.state!=='running'||!a||!validTaunt(id))return;
  const buffer=this.buffers.get(TAUNTS[id]+'.mp3');if(!buffer)return;
  const old=this.voices.get(actor);if(old){old.source.stop();this.voices.delete(actor);}
  if(tauntGain(m.player,a)<=0)return;
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;gain.gain.value=tauntGain(m.player,a)*this.volume;
  source.connect(gain);gain.connect(this.output!);this.voices.set(actor,{source,gain});source.start();
  source.onended=()=>{source.disconnect();gain.disconnect();if(this.voices.get(actor)?.source===source)this.voices.delete(actor);};
 }
 updateVoices(m:Match){const c=this.context;if(!c)return;for(const [id,voice] of this.voices){const a=m.actors[id];voice.gain.gain.setTargetAtTime(a&&!m.finished?tauntGain(m.player,a)*this.volume:0,c.currentTime,.05);}}
 private chaseLoop:`);
 return replace(s,' stopWork(){',' stopWork(){\n  for(const voice of this.voices.values())voice.source.stop();this.voices.clear();');
});
edit('src/main.ts',s=>{
 s="import './sound effect/taunt-wheel.css';\n"+s;
 s=replace(s,'scene.soundFX.event(ev.type,',"if(ev.type.startsWith('taunt:')){const [,id,actor]=ev.type.split(':');scene.soundFX.taunt(Number(id),Number(actor),m);continue;}scene.soundFX.event(ev.type,");
 s=replace(s,'scene.onFrame=m=>{','scene.onFrame=m=>{\n  scene.soundFX.updateVoices(m);');
 s=replace(s,"function showOverlay(type:string,html:string){","function showOverlay(type:string,html:string){scene.tauntWheel?.cancel();");
 s=replace(s,'<div>抱起 / 放下 <kbd>R</kbd></div>','<div>抱起 / 放下 <kbd>R</kbd></div><div>嘲讽语音 <kbd>按住 Q 选择，松开播放</kbd></div>');
 return replace(s,'手机横屏游玩，','嘲讽：电脑按住 Q 在鼠标处打开七格轮盘，移到语音格松开播放，移到中间 × 或圆盘外松开取消；手机点嘲讽按钮打开，点语音播放、点 × 关闭。声音随距离衰减，附近杀手会看到幸存者嘲讽的方向、距离和楼层。手机横屏游玩，');
});
for(const name of ['叮叮叮','哎哟我去','哎哟我滴妈','奶龙','小孩糖笑','私人笑声','老牧师'])copyFileSync(resolve(import.meta.dirname,name+'.mp3'),resolve(root,'public/audio',name+'.mp3'));
edit('scripts/gamehub-release.mjs',s=>s.replaceAll('v24-room-chat-20260914','v25-taunt-wheel-20260915').replaceAll('gamehub-repair-again-v24.zip','gamehub-repair-again-v25.zip').replaceAll('buffers.size===38','buffers.size===45').replaceAll('audio_samples:38','audio_samples:45').replace(/form.set\('changelog','[^']*'\)/,"form.set('changelog','Added seven taunt voices with desktop hold-Q radial selection and a dedicated mobile button. Cancel at the center; release Q or tap a sector to play. Distance and floor attenuation update during playback. Nearby killers receive survivor name, direction, distance and floor alerts. Host-authoritative multiplayer input validation and one-shot delivery.')"));
console.log('Installed taunt wheel, audio, multiplayer input and release update.');
