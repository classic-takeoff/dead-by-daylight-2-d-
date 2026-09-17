import {advanceLocal,applyRemoteMove} from './client-motion';
import {TUNING} from './tuning';
﻿import {Match,EMPTY_INPUT,type Input,type Role} from './game';
import {RTCTransport} from './rtc-transport';
import {GAME_ID,PROTOCOL,cleanInput,snapshot,applySnapshot,pack,unpack,forfeit} from './network-state';
type Member={client_id:string;user_id:number;username:string;seat:number};
type Room={code:string;game_id:string;host_id:number;members:Member[]};
export type Slot={id:number;clientId:string|null;name:string;ai:boolean};
export type RoomChat={id:number;name:string;text:string;clientId:string};
export class Multiplayer{
  rtc=new RTCTransport(data=>this.send(data),(from,data)=>{void this.handle({op:'message',from,data}).catch(()=>this.onError('收到无效的联机数据'));});private round=0;
  private lastChatSent=-Infinity;chat:RoomChat[]=[];onChat:()=>void=()=>{};private chatSequence=0;private chatTimes=new Map<string,number>();
  sendChat(text:string){if(this.closed)return false;if(performance.now()-this.lastChatSent<800){this.onError('\u53d1\u9001\u8fc7\u5feb\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');return false;}const value=text.trim().slice(0,160);if(!value)return false;this.lastChatSent=performance.now();if(this.isHost)this.acceptChat(this.hostId,value);else this.direct(this.hostId,{type:'chat-request',text:value});return true;}
  private acceptChat(clientId:string,text:unknown){
   const slot=this.slots.find(s=>s.clientId===clientId);if(!slot||typeof text!=='string')return;
   const value=text.trim().slice(0,160);if(!value||performance.now()-(this.chatTimes.get(clientId)??-Infinity)<800)return;
   this.chatTimes.set(clientId,performance.now());const message={id:++this.chatSequence,clientId,name:slot.name,text:value};this.chat.push(message);this.chat=this.chat.slice(-60);this.broadcast({type:'chat-message',message});this.onChat();
  }
  ws:WebSocket|null=null;room:Room|null=null;you:Member|null=null;hostId='';hostRole:Role='survivor';slots:Slot[]=[];match:Match|null=null;closed=false;
  onLobby:()=>void=()=>{};onStart:(m:Match)=>void=()=>{};onError:(text:string)=>void=()=>{};onEnd:()=>void=()=>{};onDisconnected:()=>void=()=>{};
  private lastServer=performance.now();private background:ReturnType<typeof setInterval>|null=null;private backgroundAt=performance.now();
  private localAt=-Infinity;
  private creating=false;private preferred:Role='survivor';private started=false;private lastHost=performance.now();private timer:ReturnType<typeof setInterval>|null=null;
  private remoteInputs=new Map<number,{input:Input;at:number;seq:number}>();private sendAt=0;private sequence=0;private received=-1;private packing=false;private pending:Input={...EMPTY_INPUT};private eventQueue:Match['events']=[];
  get isHost(){return this.you?.client_id===this.hostId;}
  returnToLobby(){
   if(this.closed||!this.match?.finished)return;
   if(!this.isHost){this.direct(this.hostId,{type:'return-lobby'});return;}
   this.broadcast({type:'reset-lobby'});this.resetRound();this.shareLobby();
  }
  private resetRound(){
   this.match=null;this.started=false;this.remoteInputs.clear();this.pending={...EMPTY_INPUT};this.localAt=0;this.sendAt=0;this.eventQueue=[];
   this.onLobby();
  }
  async open(role:Role,code?:string){
   this.preferred=role;this.creating=!code;
   // ICE failure leaves the existing room transport available.
   await this.rtc.open().catch(()=>{});
   if(!code){const r=await fetch('/api/v1/rooms',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({game_id:GAME_ID,max_players:5})});const body=await r.json();if(!r.ok||body.error)throw Error(body.error??'创建失败，请先登录 GameHub');code=body.room?.code??body.code;if(!code)throw Error('服务器未返回房间号');}
   const url=new URL('/ws/rooms',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
   await new Promise<void>((resolve,reject)=>{
    const ws=this.ws=new WebSocket(url),timeout=setTimeout(()=>{reject(Error('连接房间超时'));this.close();},12000);
    ws.onopen=()=>this.send({op:'join',room:code!.trim().toUpperCase()});
    ws.onerror=()=>{clearTimeout(timeout);reject(Error('无法连接房间服务，请从 GameHub 登录后进入游戏'));};
    ws.onclose=()=>{clearTimeout(timeout);if(!this.closed){if(this.match){if(this.isHost)this.endHost();else this.lostConnection();}else this.onError('房间连接已关闭');}reject(Error('房间连接已关闭'));};
    ws.onmessage=e=>{this.lastServer=performance.now();try{const event=JSON.parse(e.data);if(event.op==='welcome'){clearTimeout(timeout);this.welcome(event);resolve();}else if(event.op==='error'){clearTimeout(timeout);this.onError(event.error);reject(Error(event.error));}else void this.handle(event).catch(()=>this.onError('收到无效的联机数据'));}catch{this.onError('房间数据解析失败');}};
   });
   this.timer=setInterval(()=>{
    this.send({op:'ping'});if(this.isHost)this.broadcast({type:'heartbeat'});
    if(this.match&&!this.isHost&&!this.closed&&performance.now()-this.lastHost>8000){if(performance.now()-this.lastServer<5000)this.endHost();else this.lostConnection();}
   },2000);
   this.backgroundAt=performance.now();
   this.background=setInterval(()=>this.tickBackground(),33);
  }
  private tickBackground(){
   const now=performance.now();
   // Rendering owns the foreground simulation. The timer only takes over when
   // frames stop (hidden tab, paused scene), without advancing the same time twice.
   if(!this.isHost||!this.match||this.closed)return;
   if(!document.hidden&&now-this.localAt<250)return;
   const elapsed=Math.min(1,(now-this.backgroundAt)/1000);this.backgroundAt=now;
   for(let t=0;t<elapsed;t+=1/30)this.tick(Math.min(1/30,elapsed-t),{...EMPTY_INPUT,angle:this.match.player.angle},true);
  }
  private send(data:unknown){if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify(data));}
  private broadcast(data:Record<string,unknown>){
   const peers=(this.room?.members??[]).filter(m=>m.client_id!==this.you?.client_id);
   if(['state','round-events'].includes(data.type as string)&&peers.length&&peers.some(m=>this.rtc.sdk?.peers.get(m.client_id)?.ready)){
    for(const member of peers)if(this.rtc.sdk?.peers.get(member.client_id)?.ready)this.direct(member.client_id,data);
    if(peers.some(m=>!this.rtc.sdk?.peers.get(m.client_id)?.ready))this.send({op:'broadcast',data:{v:PROTOCOL,...data}});
   }else this.send({op:'broadcast',data:{v:PROTOCOL,...data}});
  }
  private direct(to:string,data:Record<string,unknown>){const packet={v:PROTOCOL,...data};if(!['state','input','round-events'].includes(data.type as string)||!this.rtc.send(to,packet))this.send({op:'send',to,data:packet});}
  private welcome(e:{you:Member;room:Room}){
   this.rtc.event({op:'welcome',...e});
   this.you=e.you;this.room=e.room;if(e.room.game_id!==GAME_ID){this.close();throw Error('这不是本游戏的房间');}
   this.hostId=this.creating?e.you.client_id:(e.room.members.find(m=>m.user_id===e.room.host_id)?.client_id??'');
   if(!this.hostId){this.close();throw Error('房主已离开，房间不能加入');}
   if(this.isHost){this.hostRole=this.preferred;this.slots=Array.from({length:5},(_,id)=>({id,clientId:null,name:'空位',ai:false}));const slot=this.slots[this.preferred==='killer'?4:0];slot.clientId=e.you.client_id;slot.name=e.you.username;this.shareLobby();}
   else this.direct(this.hostId,{type:'hello',role:this.preferred});
   this.lastHost=performance.now();this.onLobby();
  }
  private shareLobby(){this.broadcast({type:'lobby',slots:this.slots,hostRole:this.hostRole});this.onLobby();}
  changeSeat(id:number){
   if(this.closed||this.started)return;
   if(this.isHost)this.moveSeat(this.hostId,id);else this.direct(this.hostId,{type:'seat',id});
  }
  private moveSeat(clientId:string,id:number){
   if(this.started||!Number.isInteger(id)||id<0||id>4)return;
   const from=this.slots.find(s=>s.clientId===clientId),to=this.slots[id];
   if(!from||!to||from===to)return;
   if(to.clientId){if(clientId===this.hostId)this.onError('该席位已有玩家，请选择空位或 AI 席位');else this.direct(clientId,{type:'seat-error'});return;}
   const ai=to.ai;to.clientId=from.clientId;to.name=from.name;to.ai=false;
   from.clientId=null;from.ai=ai;from.name=ai?(from.id===4?'AI 守林人':'AI 求生者 '+(from.id+1)):'空位';
   this.hostRole=this.slots[4].clientId===this.hostId?'killer':'survivor';this.shareLobby();
  }
  addAI(id:number){if(!this.isHost||this.started||!this.slots[id]||this.slots[id].clientId)return;const s=this.slots[id];s.ai=!s.ai;s.name=s.ai?(id===4?'AI 守林人':'AI 求生者 '+(id+1)):'空位';this.shareLobby();}
  fillAI(){if(!this.isHost||this.started)return;for(const s of this.slots)if(!s.clientId){s.ai=true;s.name=s.id===4?'AI 守林人':'AI 求生者 '+(s.id+1);}this.shareLobby();}
  start(){
   if(!this.isHost||this.started||this.slots.length!==5||this.slots.some(s=>!s.clientId&&!s.ai))return;
   this.started=true;const seed=crypto.getRandomValues(new Uint32Array(1))[0];this.broadcast({type:'start',seed,slots:this.slots,hostRole:this.hostRole});this.begin(seed);
  }
  private begin(seed:number){
   this.round=seed;this.remoteInputs.clear();this.received=-1;this.sequence=0;
   this.backgroundAt=performance.now();this.localAt=-Infinity;this.sendAt=0;
   const own=this.slots.find(s=>s.clientId===this.you?.client_id);if(!own)throw Error('没有分配到角色');
   const m=this.match=new Match(own.id===4?'killer':'survivor',seed);m.playerId=own.id;m.actors.forEach(a=>{a.name=this.slots[a.id].name;});if(this.isHost)m.onEvent=e=>this.eventQueue.push(e);this.started=true;this.lastHost=performance.now();this.onStart(m);
  }
  private async handle(e:any){
   if(e.op!=='message')this.rtc.event(e);
   if(e.op==='member_joined'){this.room=e.room;this.onLobby();return;}
   if(e.op==='member_left'){
    this.room=e.room;if(e.member.client_id===this.hostId){if(this.match)this.endHost();else{this.onError('房主已关闭房间');this.close();}return;}
    if(this.isHost){const s=this.slots.find(s=>s.clientId===e.member.client_id);if(s){s.clientId=null;s.ai=this.started;s.name=this.started?'AI 接管':'空位';this.remoteInputs.delete(s.id);this.shareLobby();}}return;
   }
   if(e.op!=='message')return;const d=e.data;if(d?.v!==PROTOCOL){if(d?.type==='hello')this.direct(e.from,{type:'version-mismatch'});else if(e.from===this.hostId)this.onError('联机版本不一致，请所有玩家刷新后重新建房');return;}
   if(this.isHost){
    if(d.type==='chat-request'){this.acceptChat(e.from,d.text);return;}
    if(d.type==='seat'){this.moveSeat(e.from,d.id);return;}
    if(d.type==='return-lobby'&&this.slots.some(s=>s.clientId===e.from)){this.returnToLobby();return;}
    if(d.type==='hello'){
     if(this.started){this.direct(e.from,{type:'busy'});return;}
     const member=this.room?.members.find(m=>m.client_id===e.from);if(!member)return;
     if(!this.slots.some(s=>s.clientId===e.from)){const s=(d.role==='killer'&&!this.slots[4].clientId?this.slots[4]:this.slots.find(s=>s.id<4&&!s.clientId));if(!s){this.direct(e.from,{type:'busy'});return;}s.clientId=e.from;s.name=member.username;s.ai=false;}this.shareLobby();this.direct(e.from,{type:'chat-history',messages:this.chat.slice(-10)});
    }else if(d.type==='input'&&this.match&&d.round===this.round){const s=this.slots.find(s=>s.clientId===e.from);if(!s||!Number.isSafeInteger(d.seq))return;const old=this.remoteInputs.get(s.id);if(old&&d.seq<=old.seq)return;
     const input=cleanInput(d.input);applyRemoteMove(this.match,s.id,input,d.motion,performance.now(),old?.at??performance.now());if(old){input.space||=old.input.space;input.attack||=old.input.attack;input.special||=old.input.special;input.taunt??=old.input.taunt;}this.remoteInputs.set(s.id,{input,at:performance.now(),seq:d.seq});}
    return;
   }
   if(e.from!==this.hostId)return;this.lastHost=performance.now();
   if(d.type==='round-events'&&this.match&&d.round===this.round&&Array.isArray(d.events)){this.match.events.push(...d.events.slice(-16));return;}
   if(d.type==='chat-message'){this.chat.push(d.message);this.chat=this.chat.slice(-60);this.onChat();return;}
   if(d.type==='chat-history'){const messages=new Map([...d.messages,...this.chat].map((m:RoomChat)=>[m.id,m]));this.chat=[...messages.values()].sort((a,b)=>a.id-b.id).slice(-60);this.onChat();return;}
   if(d.type==='seat-error'){this.onError('该席位已有玩家，请选择空位或 AI 席位');return;}
   if(d.type==='reset-lobby'){this.resetRound();return;}
   if(d.type==='lobby'){this.slots=d.slots;this.hostRole=d.hostRole;this.onLobby();}
   if(d.type==='start'&&!this.started){this.slots=d.slots;this.hostRole=d.hostRole;this.begin(d.seed);}
   if(d.type==='busy'){this.onError('房间已经开始或所选阵营已满');this.close();}
   if(d.type==='forfeit')this.endHost();
   if(d.type==='state'&&this.match&&d.round===this.round&&Number.isSafeInteger(d.seq)&&d.seq>this.received){const current=this.match;const text=await unpack(d.payload);if(d.seq<=this.received||this.closed||this.match!==current)return;this.received=d.seq;applySnapshot(current,text,current.playerId);}
  }
  private advanceOwn(m:Match,dt:number,input:Input){advanceLocal(m,m.player,input,dt);m.player.angle=input.angle;}
  tick(dt:number,input:Input,fromTimer=false){
   const m=this.match;if(!m)return;
   if(this.closed){m.step(dt);return;}
   if(this.isHost&&!fromTimer){this.localAt=performance.now();this.backgroundAt=this.localAt;}
   if(this.isHost){
    const controls=new Map<number,Input>();for(const s of this.slots)if(s.clientId){const remote=this.remoteInputs.get(s.id);controls.set(s.id,s.clientId===this.you?.client_id?input:remote&&performance.now()-remote.at<500?{...remote.input}:{...EMPTY_INPUT,angle:m.actors[s.id].angle});}
    m.clientMoved=new Set(this.slots.filter(s=>s.clientId&&s.clientId!==this.you?.client_id).map(s=>s.id));
    const before=m.actors.map(a=>({x:a.x,y:a.y,level:a.level,locker:a.lockerId,transition:a.transition,lunge:!!a.lunge}));
    m.humanInputs=controls;m.step(dt,input);
    // A host-driven position/teleport bumps the revision so stale client reports
    // cannot undo it; a plain hit (life change) does not, keeping the victim smooth.
    for(const id of m.clientMoved){const a=m.actors[id],b=before[id];if(a.x!==b.x||a.y!==b.y||a.level!==b.level||a.lockerId!==b.locker||a.transition>b.transition||!!a.lunge!==b.lunge){a.hostView=undefined;a.motionRevision=(a.motionRevision??0)+1;}}
    for(const r of this.remoteInputs.values()){r.input.space=false;r.input.special=false;r.input.attack=false;r.input.taunt=undefined;}
   }else{
    this.advanceOwn(m,dt,input);
    this.pending={...input,space:this.pending.space||input.space,attack:this.pending.attack||input.attack,special:this.pending.special||input.special,taunt:input.taunt??this.pending.taunt};
   }
   // Relay allows 20 messages/s, including events and room traffic. Reserve
   // headroom for those when ICE is unavailable or a peer is still connecting.
   const peers=(this.room?.members??[]).filter(p=>p.client_id!==this.you?.client_id);
   const fast=this.isHost?peers.length>0&&peers.every(p=>this.rtc.sdk?.peers.get(p.client_id)?.ready):!!this.rtc.sdk?.peers.get(this.hostId)?.ready;
   const interval=fast?(this.isHost?1/20:1/30):.08;
   this.sendAt+=dt;if(this.sendAt+1e-9<interval)return;this.sendAt=Math.max(0,this.sendAt-Math.floor((this.sendAt+1e-9)/interval)*interval);
   // Do not queue stale realtime packets behind a congested TCP connection.
   // Keep pending one-shot controls/events until the relay can accept them.
   if(!fast&&this.ws&&this.ws.bufferedAmount>=16384)return;
   if(!this.isHost){const seq=++this.sequence;this.direct(this.hostId,{type:'input',round:this.round,seq,input:this.pending,motion:{x:m.player.x,y:m.player.y,level:m.player.level,revision:m.player.motionRevision??0}});this.pending={...this.pending,space:false,special:false,attack:false,taunt:undefined};}
   else if(!this.packing){this.packing=true;const events=m.events;const queued=this.eventQueue.splice(0).slice(-16);if(fast&&queued.length)this.broadcast({type:'round-events',round:this.round,events:queued});m.events=fast?[]:queued;const text=snapshot(m);m.events=events;const seq=++this.sequence,round=this.round;void pack(text).then(payload=>{if(this.match!==m||this.closed)return;if(payload.length>7700)throw Error('联机状态超过房间包大小');
    // Full snapshots always travel the reliable ordered channel or the TCP relay.
    if(fast)this.broadcast({type:'state',round,seq,payload});else this.send({op:'broadcast',data:{v:PROTOCOL,type:'state',round,seq,payload}});
   }).catch(e=>this.onError(e.message)).finally(()=>{this.packing=false;});}
  }
  private lostConnection(){this.close();this.onDisconnected();}
  endHost(){if(this.closed)return;if(this.match)forfeit(this.match,this.hostRole);this.close();this.onEnd();}
  leave(){if(this.isHost&&this.match&&!this.match.finished){this.broadcast({type:'forfeit'});forfeit(this.match,this.hostRole);}this.close();}
  close(){this.closed=true;this.rtc.close();if(this.timer)clearInterval(this.timer);if(this.background)clearInterval(this.background);this.send({op:'leave'});this.ws?.close();}
}
