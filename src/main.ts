import { healingPercent, healingProgress } from './game';
document.documentElement.style.setProperty('--mobile-toast-top',TUNING.hud.mobileToastTop+'px');
document.documentElement.style.setProperty('--mobile-directions-top',TUNING.hud.mobileDirectionsTop+'px');
document.documentElement.style.setProperty('--mobile-repair-top',TUNING.hud.mobileRepairTop+'px');
import { TUNING } from './tuning';
import './sound effect/taunt-wheel.css';
import { directionTargets } from './direction-alerts';
import { Multiplayer } from './multiplayer';
import { GAME_ID } from './network-state';
import { freshMapSeed } from './map-seed';
import { TouchControls } from './touch-controls';
import { heartbeatProfile } from './audio';
﻿import Phaser from 'phaser';
import './style.css';
import { Match, CONFIG, terrorStrength, type Role } from './game';
import { ForestScene } from './scene';
import { dist, floorOf, stairs, drops, windowSpots } from './world';

const survivorIcon='<svg viewBox="0 0 32 42"><circle cx="17" cy="8" r="4"/><path d="m13 15 8 1 3 12M13 15l-6 10m7-8-3 14-4 9m7-15 7 7 3 8M12 16l-4-1-4 11"/></svg>';
const killerIcon='<svg viewBox="0 0 32 42"><path d="m13 3 12 3-3 13-12-1zM16 18 8 38M7 37l4 2M14 10h3m3 1h2M17 14l3 1M12 24l-6-3-3 8 6 4"/></svg>';
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
  <div id="game"></div><div class="shade" id="shade"></div><div class="grain"></div>
  <header id="header"><div class="brand"><span class="brandmark">╱╱╱╱</span><div><strong>我修我再修</strong><small>FOGBOUND</small></div></div><nav><button class="active" id="nav-play">开始游戏</button><button id="nav-guide">生存指南</button><button id="nav-settings">设置</button></nav><div class="build"><span class="dot"></span>SINGLE PLAYER · V1.0</div></header>
  <main class="menu" id="menu"><section class="hero"><div class="eyebrow">ASYMMETRIC SURVIVAL HORROR</div><h1>雾起之后<br>无人安全。</h1><div class="english">LOST IN THE FOG.</div><p class="intro">四个求生的灵魂，一个不眠的猎手。<br>修复发电机，藏匿于阴影，或成为恐惧本身。</p><div class="select-label">选择你的阵营 <span>CHOOSE YOUR SIDE</span></div><div class="roles"><button class="role selected" data-role="survivor">${survivorIcon}<div><strong>逃生者</strong><small>SURVIVOR · 1 OF 4</small></div></button><button class="role" data-role="killer">${killerIcon}<div><strong>杀手</strong><small>THE HUNTER · SOLO</small></div></button></div><p class="role-meta" id="role-meta">与 3 名 AI 队友协作，逃离守林人的追猎。</p><button class="launch" id="launch">进入雾林 <span>↗</span></button><button class="secondary online-launch" id="online-launch">创建 / 加入联机房间</button><div class="underlaunch">单人对局 · AI 对手 · 无技能，纯粹的生存博弈</div><div class="mobile-notice">手机横屏 · 轻推慢走，推远奔跑 · 蹲行躲藏</div></section><aside class="scene-caption"><small>THE FORGOTTEN WOODS</small><p>遗忘林地</p></aside><div class="bottom"><div class="features"><div class="feature"><b>01 / 04</b><div><strong>非对称追猎</strong><small>两种视角，同一场噩梦</small></div></div><div class="feature"><b>05</b><div><strong>点亮逃生希望</strong><small>修复发电机，打开出口</small></div></div><div class="feature"><b>∞</b><div><strong>每个决定都重要</strong><small>躲藏、牵制，或冒险救援</small></div></div></div><footer><span>FOGBOUND © 2026 <span style="margin-left:22px">A PIXEL NIGHTMARE</span></span><span class="footer-right">原创像素生存游戏 · 灵感源于非对称追逐玩法</span><span>HEADPHONES RECOMMENDED ◖◗</span></footer></div></main>
  <div class="hud hidden" id="hud"><div class="danger" id="danger"></div><div class="hud-top"><div class="map-title">随机林地<small>THE FORGOTTEN WOODS</small></div><div class="objective" id="objective"></div><button class="hud-pause" id="pause-btn">Ⅱ 暂停 <span style="opacity:.5">ESC</span></button></div><div class="timer" id="timer"></div><div class="heartbeat hidden" id="heartbeat"></div><div class="toast hidden" id="toast"></div><div class="roster" id="roster"></div><div class="prompt hidden" id="prompt"></div><div class="repair-progress hidden" id="repair-progress"></div><div class="skillcheck hidden" id="skill"><p>保持专注 · 校准</p><div class="skill-track"><div class="skill-zone" id="zone"></div><div class="skill-pointer" id="needle"></div></div><small>指针进入亮区时按 <kbd>SPACE</kbd></small></div><div class="spectate hidden" id="spectate"></div><div class="hud-bottom"><div id="key-hints"></div><span id="match-time"></span></div></div>
  <div class="overlay hidden" id="overlay"><div class="panel" id="panel"></div></div>`;
const $=(id:string)=>document.getElementById(id)!;
const scene=new ForestScene();const touch=new TouchControls();scene.touch=touch;
const density=()=>matchMedia('(pointer: coarse)').matches?TUNING.rendering.mobileDensity:Math.min(TUNING.rendering.maxDensity,Math.max(TUNING.rendering.density,window.devicePixelRatio||1));
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:Math.round(innerWidth*density()),height:Math.round(innerHeight*density()),backgroundColor:'#14251f',pixelArt:false,antialias:true,roundPixels:false,scale:{mode:Phaser.Scale.NONE,zoom:1/density()},scene:[scene],audio:{noAudio:true}});
window.addEventListener('resize',()=>{game.scale.setZoom(1/density());game.scale.resize(Math.round(innerWidth*density()),Math.round(innerHeight*density()));});
let role:Role='survivor',match:Match|null=null,toastUntil=0,lastUI=0,overlayType='',spectateIndex=0;
const lifeNames={healthy:'健康',injured:'受伤',down:'倒地',carried:'被搬运',hooked:'挂钩中',dead:'已献祭',escaped:'已逃脱'};
const escapeHTML=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function roomSetup(error=''){
 showOverlay('room',`<div class="eyebrow">ONLINE TRIAL · 1 VS 4</div><h2>联机营地</h2><p>邀请朋友进入同一片雾林，空位可由房主添加 AI。</p><div class="room-role" aria-label="联机阵营"><button data-online-role="survivor" aria-pressed="${role==='survivor'}">求生者 <small>协作逃生 · 4 席</small></button><button data-online-role="killer" aria-pressed="${role==='killer'}">杀手 <small>独自追猎 · 1 席</small></button></div><div class="room-methods"><section><h3>创建新房间</h3><p>成为房主，邀请朋友并安排 AI。</p><button id="create-room" class="primary">创建房间</button></section><section><h3>加入朋友</h3><label for="room-code">6 位房间号</label><div class="room-join"><input id="room-code" placeholder="例如 ABC123" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false"><button id="join-room" class="secondary">加入</button></div></section></div><p id="room-error" role="status">${escapeHTML(error)}</p><p class="room-note">需先登录 GameHub。杀手席位已满时会分配求生者席位。对局中房主离开，其阵营失败；其他玩家掉线由 AI 接管。</p><button id="close-room" class="secondary">返回营地</button>`);
 $('room-error').insertAdjacentHTML('beforebegin',`<section class="room-browser"><div class="room-count"><strong>\u6d4f\u89c8\u623f\u95f4</strong><button id="refresh-rooms">\u5237\u65b0</button></div><p>\u9009\u62e9\u623f\u95f4\u52a0\u5165\uff1b\u5df2\u5f00\u5c40\u7684\u623f\u95f4\u6682\u4e0d\u80fd\u52a0\u5165\u3002</p><div id="room-list" role="status"></div></section>`);$('refresh-rooms').onclick=()=>void browseRooms();void browseRooms();
 document.querySelectorAll<HTMLButtonElement>('[data-online-role]').forEach(b=>b.onclick=()=>{setRole(b.dataset.onlineRole as Role);document.querySelectorAll<HTMLButtonElement>('[data-online-role]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.onlineRole===role)));});
 $('create-room').onclick=()=>void openRoom();$('join-room').onclick=()=>{const code=($('room-code') as HTMLInputElement).value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code)){$('room-error').textContent='请输入 6 位字母或数字房间号';$('room-code').focus();return;}void openRoom(code);};$('room-code').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('join-room').click();}};$('close-room').onclick=()=>{scene.network?.leave();scene.network=null;closeOverlay();};
}

async function browseRooms(){
 const list=$('room-list'),refresh=$('refresh-rooms') as HTMLButtonElement;refresh.disabled=true;list.textContent='正在获取房间…';
 try{
  const response=await fetch(`/api/v1/rooms?game_id=${encodeURIComponent(GAME_ID)}`,{credentials:'same-origin'});const data=await response.json();if(!response.ok||data.error)throw Error(data.error||'房间列表加载失败');
  if(!list.isConnected)return;
  const rooms=(data.rooms??[]) as {code:string;host_id:number;member_count:number;max_players:number;members?:{user_id:number;username:string}[]}[];
  list.innerHTML=rooms.length?rooms.map(r=>`<div class="browse-room"><div><strong>${escapeHTML(r.code)}</strong><small>房主 ID ${escapeHTML(String(r.host_id))}${r.members?.find(m=>m.user_id===r.host_id)?' · '+escapeHTML(r.members.find(m=>m.user_id===r.host_id)!.username):''}</small></div><span>${r.member_count} / ${r.max_players}</span><button data-join-code="${escapeHTML(r.code)}" ${r.member_count>=r.max_players?'disabled':''}>${r.member_count>=r.max_players?'已满':'加入'}</button></div>`).join(''):'暂无房间，创建一个邀请朋友吧。';
  list.querySelectorAll<HTMLButtonElement>('[data-join-code]').forEach(b=>b.onclick=()=>void openRoom(b.dataset.joinCode));
 }catch(e){if(list.isConnected)list.textContent=e instanceof Error?e.message:'无法加载房间，请重试';}finally{refresh.disabled=false;}
}
async function openRoom(code?:string){
 $('room-error').textContent='正在连接房间…';($('create-room') as HTMLButtonElement).disabled=true;($('join-room') as HTMLButtonElement).disabled=true;
 const n=new Multiplayer();scene.network=n;document.querySelectorAll<HTMLButtonElement>('[data-online-role]').forEach(b=>b.disabled=true);
 document.querySelectorAll<HTMLButtonElement>('[data-join-code],#refresh-rooms').forEach(b=>b.disabled=true);
 n.onLobby=()=>{if(!n.match&&!n.closed)roomLobby(n);};
 n.onChat=()=>renderRoomChat(n);
 n.onStart=m=>{beginMatch(m);};n.onEnd=()=>{scene.paused=false;scene.blockInput=false;};
 n.onDisconnected=()=>{scene.network=null;showOverlay('disconnect','<h2>连接已中断</h2><p>你的角色将由 AI 接管。本机断线不会判对方阵营失败。</p><button class="primary" id="disconnect-back">返回营地</button>');$('disconnect-back').onclick=menu;};
 n.onError=text=>{queueMicrotask(()=>{if(n.closed&&!n.match&&scene.network===n){scene.network=null;roomSetup(text);}});const el=document.getElementById('room-error');if(el)el.textContent=text;else{$('toast').textContent=text;$('toast').classList.remove('hidden');}};
 try{await n.open(role,code);}catch(e){n.close();if(scene.network!==n)return;scene.network=null;roomSetup(e instanceof Error?e.message:'房间连接失败');}
}
function roomLobby(n:Multiplayer){
 const chatFocused=document.activeElement?.id==='chat-input';
 const draft=(document.getElementById('chat-input') as HTMLInputElement|null)?.value??'';
 if(!n.room)return;if(match&&!n.match){match=null;scene.showMenu();$('hud').classList.add('hidden');document.getElementById('direction-markers')?.replaceChildren();}
 const occupied=n.slots.filter(s=>s.ai||s.clientId).length;
 showOverlay('lobby',`<div class="eyebrow">ONLINE LOBBY</div><h2>房间 ${escapeHTML(n.room.code)}</h2><p>把房间号告诉朋友。${n.isHost?'你是房主，补齐 5 个席位后即可开始。':'等待房主开始对局。'}</p><div class="room-slots">${n.slots.map(s=>`<div><b>${s.id===4?'杀手':'求生者 '+(s.id+1)}</b><span>${escapeHTML(s.name)}${s.clientId===n.you?.client_id?' · 你':''}${s.clientId===n.hostId?' · 房主':''}</span>${n.isHost&&!s.clientId?`<button data-ai="${s.id}">${s.ai?'移除 AI':'添加 AI'}</button>`:''}</div>`).join('')}</div>${n.isHost?'<button class="secondary" id="fill-ai">用 AI 补齐空位</button><button class="primary" id="start-room">开始对局</button>':''}<p id="room-error" role="status"></p><button class="secondary" id="leave-room">${n.isHost?'关闭房间':'离开房间'}</button>`);
 document.querySelectorAll<HTMLButtonElement>('[data-ai]').forEach(b=>b.onclick=()=>n.addAI(Number(b.dataset.ai)));
 $('panel').querySelector('h2')!.setAttribute('aria-label','Host ID '+n.room.host_id);$('panel').querySelector('h2')!.insertAdjacentHTML('afterend',`<p>\u623f\u4e3b ID ${n.room.host_id}</p>`);$('panel').querySelector('h2')!.innerHTML=`<small>邀请房间号</small><strong>${escapeHTML(n.room.code)}</strong>`;
 $('panel').querySelector('.room-slots')!.insertAdjacentHTML('beforebegin',`<div class="room-count">席位 ${occupied} / 5 <span>${n.slots.filter(s=>s.clientId).length} 名玩家 · ${n.slots.filter(s=>s.ai).length} 名 AI</span></div>`);
 $('room-error').textContent=n.isHost?(occupied===5?'席位已齐，可以开始对局。':`还差 ${5-occupied} 个席位，邀请朋友或用 AI 补齐。`):'房主开始后，你将自动进入对局。';
  document.querySelectorAll<HTMLElement>('.room-slots>div').forEach((el,i)=>{el.classList.toggle('own-slot',n.slots[i].clientId===n.you?.client_id);el.classList.toggle('killer-slot',n.slots[i].id===4);});
  document.querySelectorAll<HTMLElement>('.room-slots>div').forEach((el,i)=>{const s=n.slots[i];if(!s.clientId){el.querySelector('span')!.insertAdjacentHTML('beforeend',`<button class="seat-move" data-seat="${s.id}">${s.ai?'与 AI 换位':'坐到这里'}</button>`);}});
  document.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach(b=>b.onclick=()=>n.changeSeat(Number(b.dataset.seat)));
  $('panel').querySelector('.room-slots')!.insertAdjacentHTML('afterend','<p>开局前可选择空位，或与 AI 换位。切换到杀手席位即更换阵营；玩家占用的席位需先让出。</p>');
 if(n.isHost){$('fill-ai').onclick=()=>n.fillAI();($('start-room') as HTMLButtonElement).disabled=n.slots.length!==5||n.slots.some(s=>!s.ai&&!s.clientId);$('start-room').onclick=()=>n.start();}
 $('leave-room').insertAdjacentHTML('beforebegin','<section class="room-chat"><h3>房间聊天</h3><div id="chat-log" role="log" aria-live="polite"></div><form id="chat-form"><input id="chat-input" maxlength="160" placeholder="和房间里的玩家聊聊…" aria-label="聊天消息" autocomplete="off"><button type="submit">发送</button></form><small>回车发送 · 最多 160 字</small></section>');
 ($('chat-input') as HTMLInputElement).value=draft;renderRoomChat(n);if(chatFocused)$('chat-input').focus({preventScroll:true});
 $('chat-form').onsubmit=e=>{e.preventDefault();const input=$('chat-input') as HTMLInputElement;if(!input.value.trim())return;if(n.sendChat(input.value))input.value='';input.focus();};
 $('leave-room').onclick=menu;
}
function renderRoomChat(n:Multiplayer){
 const log=document.getElementById('chat-log');if(!log)return;
 const atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<24;
 log.innerHTML=n.chat.length?n.chat.map(m=>`<p class="${m.clientId===n.you?.client_id?'chat-own':''}"><b>${escapeHTML(m.name)}${m.clientId===n.you?.client_id?' · 你':''}</b><span>${escapeHTML(m.text)}</span></p>`).join(''):'<p>暂无消息，打个招呼吧。</p>';
 if(atBottom)log.scrollTop=log.scrollHeight;
}
$('online-launch').onclick=()=>roomSetup();
function setRole(value:Role){role=value;document.querySelectorAll<HTMLElement>('[data-role]').forEach(el=>{el.classList.toggle('selected',el.dataset.role===role);el.setAttribute('aria-pressed',String(el.dataset.role===role));});$('role-meta').textContent=role==='survivor'?'与 3 名 AI 队友协作，逃离守林人的追猎。':'扮演守林人，追踪、击倒并献祭 4 名 AI 逃生者。';}
document.querySelectorAll<HTMLElement>('[data-role]').forEach(b=>b.onclick=()=>setRole(b.dataset.role as Role));
function showOverlay(type:string,html:string){scene.tauntWheel?.cancel();overlayType=type;$('panel').classList.toggle('room-panel',type==='room'||type==='lobby');$('panel').innerHTML=html;$('overlay').classList.remove('hidden');scene.paused=!scene.network?.match;scene.blockInput=true;touch.show(false);void scene.soundFX.context?.suspend();}
function closeOverlay(){overlayType='';scene.blockInput=false;$('overlay').classList.add('hidden');scene.paused=false;touch.show(!!match&&!match.finished);void scene.soundFX.context?.resume();scene.input.keyboard?.resetKeys();}
function guide(){showOverlay('guide',`<div class="eyebrow">FIELD GUIDE / 01</div><h2>活到天亮。</h2><p>修复七台发电机中的五台，按住 E 打开出口门，再穿过门后短通道逃生。队友会修机、救援和治疗；合作是活下来的关键。</p><div class="controls"><div>移动 <kbd>W A S D</kbd></div><div>奔跑 / 蹲行 <kbd>SHIFT / 右键</kbd></div><div>治疗、救援 <kbd>按住 E</kbd></div><div>放板、翻窗、校准 <kbd>SPACE</kbd></div><div>杀手攻击 / 突进 <kbd>左键 / 蓄力释放</kbd></div><div>抱起 / 放下 <kbd>R</kbd></div><div>嘲讽语音 <kbd>按住 Q 选择，松开播放</kbd></div></div><p>奔跑会留下划痕，受伤会留下血迹。低矮围墙为主，不挡视线；房屋和高围栏遮挡后方；树木、窗户、落板和电机不挡视线，自己的角色始终完整显示；双方鼠标控制朝向和视野，WASD 独立移动，可边跑边回头。双方均为 360° 无遮挡视野，人类镜头更远、杀手镜头更近，但蹲下的求生者仍可利用墙体隐藏，并留下短暂残影。靠近衣柜按住 E 躲入或离开；杀手按住 E 搜查，发现有人会直接抱起。蹲在矮围墙后可避开杀手视线；放倒的木板奔跑靠近时快翻，慢走或静止时慢翻。聆听心跳，利用三角绕点、双板区和窗户拉开距离。木屋两处楼梯按 SPACE 上下楼，二楼南侧箭头处按 SPACE 单向跳落。楼层独立，不能隔楼攻击或治疗。</p><p>两次命中会倒地。第三次挂钩将被献祭，挂钩阶段耗尽也会死亡。第一阶段可按空格尝试低概率自救，但失败加速献祭；第二阶段完成校准延缓挣扎损耗。救下队友需要1.5秒，挂钩每阶段60秒。被搬运时有节奏地点按空格加快挣脱，每0.25秒计一次。嘲讽：电脑按住 Q 在鼠标处打开七格轮盘，移到语音格松开播放，移到中间 × 或圆盘外松开取消；手机点嘲讽按钮打开，点语音播放、点 × 关闭。声音随距离衰减，附近杀手会看到幸存者嘲讽的方向、距离和楼层。手机横屏游玩，左摇杆轻推慢走、推远奔跑，右摇杆转向；点蹲行可低速移动、利用高地形躲避视线，电脑按住右键蹲行、按住左键修机；手机点按修机开始或停止，移动会取消，救人等其他交互仍按住，点交互键翻越，QTE 出现时点 QTE 键校准；长按攻击蓄力，松开或满 0.55 秒自动刺出，蓄力越久僵直越长，拖动攻击键也能调整方向。四人全部倒地直接判负；最后一名存活者若在钩上直接献祭。仅剩一名可行动者时可寻找地窖。</p><button class="primary" id="close-panel">我准备好了</button>`);$('close-panel').onclick=closeOverlay;}
function settings(){showOverlay('settings',`<div class="eyebrow">PREFERENCES</div><h2>林间回声</h2><p>推荐佩戴耳机。心跳会随杀手靠近变响、加速。使用木裂、金属、衣料和挥刀采样；建议主音量 60% 以上。</p><label class="setting">主音量 <input aria-label="主音量" id="volume" type="range" min="0" max="100" value="${scene.soundFX.volume*100}"></label><p>画面：原生像素 · 自动适配窗口<br>对局：单人本地 · 无联网需求</p><p class="audio-credits">音效：Kenney、jwiese（CC0）<br>Additional Sound FX by Will Leamon · <a href="https://opengameart.org/content/fleshy-fight-sounds" target="_blank" rel="noreferrer">Fleshy Fight Sounds</a>（<a href="./audio/OGA-BY-3.0.txt" target="_blank">OGA-BY 3.0</a>）</p><button class="primary" id="close-panel">保存并返回</button>`);$('volume').oninput=()=>{scene.soundFX.volume=Number(($('volume') as HTMLInputElement).value)/100;localStorage.setItem('fogbound-volume',String(scene.soundFX.volume));};$('close-panel').onclick=closeOverlay;}
function pause(){if(!match||match.finished)return;showOverlay('pause',`<div class="eyebrow">TAKE A BREATH</div><h2>迷雾暂歇</h2><p>${scene.network?'联机对局仍在继续。房主离开房间将判所在阵营失败。':'对局已暂停。'}<br>地图种子：<strong>${match.seedLabel}</strong></p><button class="primary" id="resume">继续对局</button><button class="secondary" id="help">操作指南</button><button class="secondary" id="quit">返回营地</button>`);$('resume').onclick=closeOverlay;$('help').onclick=guide;$('quit').onclick=menu;}
function menu(){scene.network?.leave();scene.network=null;match=null;scene.showMenu();closeOverlay();$('menu').classList.remove('hidden');$('header').classList.remove('hidden');$('shade').classList.remove('hidden');$('hud').classList.add('hidden');document.getElementById('direction-markers')?.replaceChildren();}
function start(){scene.network?.leave();scene.network=null;void touch.landscape();let seed=freshMapSeed();try{const last=localStorage.getItem('fogbound-last-map-seed');if(String(seed)===last)seed=(seed+0x9e3779b9)>>>0;localStorage.setItem('fogbound-last-map-seed',String(seed));}catch{}beginMatch(new Match(role,seed));}
function beginMatch(value:Match){match=value;role=value.selectedRole;void touch.landscape();lastUI=0;toastUntil=0;closeOverlay();scene.startMatch(match);document.querySelector('.map-title small')!.textContent='地图种子 '+match.seedLabel;touch.configure(role,match.player.angle);touch.show(true);$('menu').classList.add('hidden');$('header').classList.add('hidden');$('shade').classList.add('hidden');$('hud').classList.remove('hidden');$('spectate').classList.add('hidden');$('key-hints').innerHTML=role==='survivor'?'<span><kbd>WASD</kbd> 移动</span><span><kbd>鼠标</kbd> 视野朝向</span><span><kbd>SHIFT</kbd> 奔跑</span><span><kbd>右键</kbd> 蹲行</span><span><kbd>左键</kbd> 修机</span><span><kbd>E</kbd> 交互</span><span><kbd>SPACE</kbd> 板窗 / 校准</span><span><kbd>Q</kbd> 长按嘲讽</span>':'<span><kbd>WASD</kbd> 移动</span><span><kbd>左键</kbd> 按住蓄力 / 松开攻击</span><span><kbd>SPACE</kbd> 板窗 / 楼梯</span><span><kbd>R</kbd> 抱起</span><span><kbd>E</kbd> 破坏 / 挂钩</span><span><kbd>Q</kbd> 长按嘲讽</span>';}
$('launch').onclick=start;$('nav-play').onclick=()=>closeOverlay();$('nav-guide').onclick=guide;$('nav-settings').onclick=settings;$('pause-btn').onclick=pause;
window.addEventListener('keydown',e=>{if(e.code==='Escape'){if(overlayType==='lobby'||overlayType==='room'){return;}else if(overlayType&&overlayType!=='result')closeOverlay();else pause();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&match&&!scene.network&&!match.finished&&!overlayType)pause();});
window.addEventListener('blur',()=>{if(match&&!scene.network&&!match.finished&&!overlayType)pause();});
function results(m:Match){if(overlayType==='result')return;const escaped=m.survivors.filter(s=>s.life==='escaped').length;const title=m.selectedRole==='killer'?(escaped===0?'无人逃离。':escaped<=2?'猎夜落幕。':'迷雾散去。'):(m.player.life==='escaped'?'你活下来了。':'长夜未尽。');showOverlay('result',`<div class="eyebrow">TRIAL COMPLETE · ${formatTime(m.time)}</div><h2>${title}</h2><p>${m.forfeitRole?'房主房间关闭，'+(m.forfeitRole==='killer'?'杀手':'求生者')+'阵营失败。<br>':''}${escaped} 人逃脱 · ${4-escaped} 人献祭 — 遗忘林地</p><div class="result-list">${m.survivors.map(s=>`<div class="result-row"><span>${escapeHTML(s.name)}${s.id===m.playerId?' · 你':''}</span><span>${lifeNames[s.life]}</span><small>修机 ${s.stats.repair.toFixed(1)} 台 · 救援 ${s.stats.rescues} · 挂钩 ${s.hooks}</small></div>`).join('')}</div><p>杀手命中 ${m.killer.stats.hits} 次 · 总牵制 ${Math.round(m.survivors.reduce((n,s)=>n+s.stats.chase,0))} 秒</p><button class="primary" id="again">再入雾林</button><button class="secondary" id="back">返回营地</button>`);$('again').onclick=()=>{if(scene.network&&!scene.network.closed){scene.network.returnToLobby();}else if(scene.network){menu();roomSetup();}else start();};$('back').onclick=menu;if(scene.network)$('again').textContent=scene.network.closed?'\u8fd4\u56de\u8054\u673a\u8425\u5730':'\u8fd4\u56de\u623f\u95f4';}
function formatTime(t:number){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
scene.onFrame=m=>{
  scene.soundFX.updateVoices(m);
  for(const ev of m.events.splice(0)){if(ev.recipient!==undefined&&ev.recipient!==m.playerId)continue;if(ev.type.startsWith('taunt:')){const [,id,actor]=ev.type.split(':');scene.soundFX.taunt(Number(id),Number(actor),m);continue;}scene.soundFX.event(ev.type,ev.x===undefined||['hook','rescue','death','locker-alert'].includes(ev.type)?1:Math.max(.06,1-dist(m.player,{x:ev.x,y:ev.y!,level:ev.level})/700));if(ev.text){$('toast').textContent=ev.text;toastUntil=m.time+3.5;}}
  if(m.finished){markers.replaceChildren();if(m.deathAnimating){$('hud').classList.add('hidden');touch.show(false);}else results(m);return;}
  if(m.time-lastUI<.08)return;lastUI=m.time;
  const p=m.player;
  renderDirections(m);const repairContext=m.interaction(p);
  const nearTraversal=m.pallets.some(b=>b.state!=='broken'&&dist(p,b)<TUNING.traversal.palletRange)||windowSpots.some(w=>dist(p,w)<TUNING.traversal.windowRange)||m.stairs.some(s=>dist(p,floorOf(p)===floorOf(s.bottom)?s.bottom:s.top)<TUNING.traversal.stairsRange)||drops.some(d=>dist(p,d.top)<TUNING.traversal.dropRange);
  const spaceAction=!m.canEnterHatch(p)&&!m.skill&&(p.life==='carried'||p.life==='hooked'&&p.hooks===1||['healthy','injured'].includes(p.life)&&nearTraversal&&(!repairContext||p.moving));
  const qteAvailable=!!m.skill||p.action.startsWith('repair:')||p.action.startsWith('heal:')||p.life==='hooked'&&p.hooks===2;
  touch.context(!!m.skill,p.life,p.cooldown===0&&repairContext?.kind==='repair'&&(m.generators[repairContext.id].blockedUntil??0)<=m.time?repairContext.id:null,spaceAction,qteAvailable,p.role==='killer'?m.carryAction():null,m.canEnterHatch(p));
  $('objective').innerHTML=m.powered?'<b>↗</b><div><strong>出口已通电</strong><small>出口位于林地东西两侧</small></div>':`<b>${Math.max(0,TUNING.match.requiredGenerators-m.repaired)}</b><div><strong>${role==='survivor'?'修复发电机':'阻止逃生者'}</strong><small>${m.repaired} / ${TUNING.match.requiredGenerators} 已完成 · ${role==='survivor'?'寻找并修复发电机':'追踪 · 击倒 · 献祭'}</small></div>`;
  $('roster').innerHTML=m.survivors.map(s=>{
    const chased=m.isChasing(s),bleed=Math.max(0,1-s.bleed/CONFIG.bleedTime),healing=healingPercent(s);
    return `<div class="survivor-row ${s.id===m.playerId?'me':''}" data-survivor="${s.id}"><div class="portrait ${chased?'being-chased':''}" title="${chased?'正在被追逐':lifeNames[s.life]}" style="color:${s.life==='dead'?'#6f7a70':s.life==='injured'||s.life==='down'?'#c98871':'#c0d3a4'}">${s.life==='dead'?'×':s.life==='escaped'?'↗':s.life==='hooked'?'⌁':'♙'}${chased?'<span class="chase-badge">追逐</span>':''}</div><div class="info">${escapeHTML(s.name)}${s.id===m.playerId?' · 你':''}<small>${lifeNames[s.life]}${s.life==='injured'||s.life==='down'?' · 治疗 '+healing+'%':''}${s.life==='hooked'?' · '+Math.ceil(CONFIG.hookPhase-s.hookTime)+'s':''}</small></div><span class="hookmarks">${'Ⅰ'.repeat(s.hooks)}</span>${s.life==='down'?'<div class="bleed-status" aria-label="剩余失血时间"><span>失血 '+Math.max(0,Math.ceil(CONFIG.bleedTime-s.bleed))+'s</span><div class="bleed-track"><i style="width:'+bleed*100+'%"></i></div></div>':''}</div>`;
  }).join('');
  $('match-time').textContent=`${role==='survivor'?'逃生者':'守林人'} / ${formatTime(m.time)} / ${floorOf(p)===-1?'地下室':(floorOf(p)+1)+' 楼'}`;
  $('timer').textContent=m.endgame>0?`终局 ${formatTime(m.endgame)}`:'';
  $('toast').classList.toggle('hidden',m.time>toastUntil);
  const interaction=m.interaction(p);let label='',progress=-1;
  if(m.canEnterHatch(p)){label='按住 E 立即跳入地窖 · 倒地也可逃生';}
  else if(p.life==='hooked'){label=p.hooks===1?`SPACE 尝试自救 · 成功率 ${TUNING.actions.selfRescueChance*100}%`:'等待救援 · 留意挣扎校准';progress=1-p.hookTime/CONFIG.hookPhase;}
  else if(p.life==='down'){label=`治疗进度 ${healingPercent(p)}% · 按住 E 自我恢复`;progress=healingProgress(p);}
  else if(p.life==='carried'){label='重复按 SPACE 挣脱搬运';progress=p.struggle;}
  else if(m.survivors.some(s=>s.id!==p.id&&s.action===`heal:${p.id}`&&dist(s,p)<TUNING.interactions.healRange)){const healer=m.survivors.find(s=>s.id!==p.id&&s.action===`heal:${p.id}`&&dist(s,p)<TUNING.interactions.healRange)!;label=`${escapeHTML(healer.name)} 正在治疗你 · ${healingPercent(p)}%`;progress=healingProgress(p);}
  else if(p.charge>0){label=p.charge>TUNING.actions.lungeThreshold?'蓄力就绪 · 松开左键突进挥砍':'蓄力中 · 按住左键';progress=p.charge;}
  else if(drops.some(d=>dist(p,d.top)<TUNING.traversal.dropRange)){label='SPACE 从二楼跳落 · 落地短暂停顿';}
  else if(m.stairs.some(s=>dist(p,floorOf(p)===floorOf(s.bottom)?s.bottom:s.top)<TUNING.traversal.stairsRange)){label=`SPACE ${floorOf(p)===-1?'↑ 上楼离开地下室':floorOf(p)===1?'↓ 下到一楼':dist(p,m.basement.stair.top)<TUNING.traversal.stairsRange?'↓ 下地下室 · 血迹楼梯':'↑ 上到二楼'}`;}
  else if(interaction){label=interaction.kind==='repair'?(touch.enabled?'点按修机 · 移动取消':'按住左键 修理发电机'):`按住 E ${interaction.label}${interaction.kind==='heal'?' · '+healingPercent(m.actors[interaction.id])+'%':''}`;progress=interaction.kind==='repair'?m.generators[interaction.id].progress:interaction.kind==='gate'?m.gates[interaction.id].progress:interaction.kind==='heal'?healingProgress(m.actors[interaction.id]):p.progress;}
  else if(m.pallets.some(b=>b.state!=='broken'&&dist(p,b)<TUNING.traversal.palletRange)&&p.role==='survivor')label='SPACE 放下 / 翻越木板';
  else if(windowSpots.some(w=>dist(p,w)<TUNING.traversal.windowRange))label='SPACE 翻越窗户';
  else if(p.role==='killer'&&m.survivors.some(s=>s.life==='down'&&dist(s,p)<TUNING.interactions.pickupRange))label='R 抱起逃生者';
  if(p.cooldown>0&&p.action==='眩晕')label='被木板砸晕';
  if(p.life==='dead'&&m.time-(p.deathAt??-10)>TUNING.match.deathSeconds||p.life==='escaped')label='';
  if(touch.enabled)label=label.replaceAll('SPACE','交互键').replaceAll('按住 E','按住交互').replaceAll('松开左键','松开攻击').replaceAll('按住左键','按住攻击').replaceAll('R 抱起','抱起键');
  const repair=interaction?.kind==='repair'?m.generators[interaction.id]:null,showRepair=!!repair&&p.role==='survivor'&&['healthy','injured'].includes(p.life);
  $('repair-progress').classList.toggle('hidden',!showRepair);
  if(showRepair){progress=-1;if((repair!.blockedUntil??0)>m.time)label='发电机冷却 · '+Math.ceil(repair!.blockedUntil!-m.time)+'秒后可维修';}
  if(showRepair&&repair){const percent=Math.floor(repair.progress*100);$('repair-progress').innerHTML=`<div><strong>${(repair.blockedUntil??0)>m.time?'冷却 '+Math.ceil(repair.blockedUntil!-m.time)+'秒':'发电机维修'}</strong><b>${percent}<small>%</small></b></div><div class="repair-track" role="progressbar" aria-label="发电机维修" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>`;}
  $('prompt').classList.toggle('hidden',!label);$('prompt').innerHTML=label+(progress>=0?`<div class="bar"><div class="fill" style="width:${Math.min(100,progress*100)}%"></div></div>`:'');
  $('skill').querySelector('small')!.textContent=touch.enabled?'\u6307\u9488\u8fdb\u5165\u4eae\u533a\u65f6\u70b9\u6309 QTE \u952e':'\u6307\u9488\u8fdb\u5165\u4eae\u533a\u65f6\u6309 SPACE';$('skill').classList.toggle('hidden',!m.skill);if(m.skill){$('zone').style.left=`${m.skill.start*100}%`;$('zone').style.width=`${(m.skill.end-m.skill.start)*100}%`;$('needle').style.left=`${m.skill.value*100}%`;}
  const danger=role==='survivor'&&p.life!=='dead'&&p.life!=='escaped'?terrorStrength(p,m.killer):0;$('danger').style.opacity=String(danger*.35);const heartbeat=document.getElementById('heartbeat')!;heartbeat.classList.toggle('hidden',danger<=0);heartbeat.textContent=danger>.7?'♥ 心跳急促 · 极近':danger>.35?'♥ 心跳加快 · 正在靠近':'♥ 微弱心跳';heartbeat.style.setProperty('--beat',`${heartbeatProfile(danger).interval}s`);
  if(p.life==='dead'||p.life==='escaped'&&m.time-(p.escapedAt??0)>.9){if($('spectate').classList.contains('hidden')){$('spectate').classList.remove('hidden');$('spectate').innerHTML=`你${p.life==='escaped'?'已逃脱':'已被献祭'} · 正在观战 <button id="next-view">切换队友</button>`;$('next-view').onclick=()=>{const alive=m.active;spectateIndex=(spectateIndex+1)%Math.max(1,alive.length);scene.viewId=alive[spectateIndex]?.id??4;};}if(scene.viewId===p.id||['dead','escaped'].includes(m.actors[scene.viewId].life))scene.viewId=m.active[0]?.id??4;}
};
// Local automation harness for browser smoke checks and diagnosing a trial.
Object.defineProperty(window,'fogbound',{get:()=>({match,scene,start,menu})});


const markers=document.createElement('div');markers.id='direction-markers';document.body.append(markers);
function renderDirections(m:Match){
 const viewer=m.actors[scene.viewId],camera=scene.cameras.main;
 const targets=directionTargets(m);
 markers.replaceChildren();
 for(const target of targets){
  const dx=(target.x-viewer.x)*camera.zoom,dy=(target.y-viewer.y)*camera.zoom;
  const el=document.createElement('div');el.className='direction-marker '+target.kind;
  const arrow=document.createElement('span');arrow.className='direction-arrow';arrow.textContent='\u27a4';arrow.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
  const text=document.createElement('span');text.textContent=target.bearingOnly?target.label:target.label+' · '+Math.round(Math.hypot(target.x-viewer.x,target.y-viewer.y)/10)+'m · '+(floorOf(target)===-1?'地下室':(floorOf(target)+1)+'楼');el.append(arrow,text);if('progress' in target&&typeof target.progress==='number'){const bar=document.createElement('progress');bar.max=1;bar.value=target.progress;bar.setAttribute('aria-label',target.kind==='hook'?'救援进度':'治疗进度');el.append(bar);}markers.append(el);
 }
}
