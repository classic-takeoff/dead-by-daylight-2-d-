import {TUNING} from './tuning';
import './gamehub-rtc';

type Packet=Record<string,any>;
type SDK={on(event:string,fn:(event:any)=>void):SDK;sendState(id:string,data:unknown):boolean;sendEvent(id:string,data:unknown):boolean;close():void;peers:Map<string,any>};
export function splitState(data:Packet):Packet[]{
 const parts=Math.ceil(data.payload.length/850);
 return Array.from({length:parts},(_,part)=>({...data,type:'state-part',part,parts,payload:data.payload.slice(part*850,(part+1)*850)}));
}
export class StateAssembler{
 private frames=new Map<number,{parts:string[];count:number;at:number;round:number}>();
 accept(d:Packet):Packet|null{
  const now=performance.now();for(const [seq,f] of this.frames)if(now-f.at>1500)this.frames.delete(seq);
  if(!Number.isSafeInteger(d.seq)||!Number.isInteger(d.parts)||d.parts<1||d.parts>10||!Number.isInteger(d.part)||d.part<0||d.part>=d.parts||typeof d.payload!=='string'||d.payload.length>850)return null;
  let f=this.frames.get(d.seq);
  if(!f){if(this.frames.size>=16)this.frames.delete(this.frames.keys().next().value!);f={parts:new Array(d.parts),count:0,at:now,round:d.round};this.frames.set(d.seq,f);}
  if(f.parts.length!==d.parts||f.round!==d.round)return null;
  if(f.parts[d.part]===undefined){f.parts[d.part]=d.payload;f.count++;}
  if(f.count!==d.parts)return null;
  this.frames.delete(d.seq);return {...d,type:'state',payload:f.parts.join('')};
 }
}
export class RTCTransport{
 sdk:SDK|null=null;private handlers=new Map<string,Set<(e:any)=>void>>();
 private adapter:any;private assemblers=new Map<string,StateAssembler>();private closed=false;
 constructor(private sendSignal:(data:unknown)=>void,private receive:(from:string,data:Packet)=>void){
  this.adapter={you:null,room:null,subscribe:(name:string,fn:(e:any)=>void)=>{let set=this.handlers.get(name);if(!set)this.handlers.set(name,set=new Set());set.add(fn);return ()=>set!.delete(fn);},signal:(to:string,data:unknown)=>this.sendSignal({op:'signal',to,data}),iceConfig:async()=>{
   const r=await fetch('/api/v1/rooms/ice-config',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('无法获取 UDP 连接配置');return r.json();
  }};
 }
 async open(){
  const sdk:SDK=await (globalThis as any).GameHubRTC.attach(this.adapter,{unorderedState:true});if(this.closed){sdk.close();return;}this.sdk=sdk;
  sdk.on('state',({peerId,data})=>{if(data?.type!=='state-part')return;let assembler=this.assemblers.get(peerId);if(!assembler)this.assemblers.set(peerId,assembler=new StateAssembler());const packet=assembler.accept(data);if(packet)this.receive(peerId,packet);});
  sdk.on('event',({peerId,data})=>this.receive(peerId,data));
 }
 event(e:any){if(e.you)this.adapter.you=e.you;if(e.room)this.adapter.room=e.room;if(e.op==='member_left')this.assemblers.delete(e.member.client_id);for(const fn of this.handlers.get(e.op)??[])fn(e);}
 send(to:string,data:Packet){
  if(!this.sdk)return false;
  try{
   if(data.type==='state'){
    if(!this.sdk.peers.get(to)?.ready)return false;
    // Periodic reliable full snapshots recover quickly when fragmented UDP frames are lost.
    if(data.seq%TUNING.network.keyframeEvery===0)return this.sdk.sendEvent(to,data);
    // A congested or incomplete frame is disposable; the next snapshot replaces it.
    for(const part of splitState(data))if(!this.sdk.sendState(to,part))break;
    return true;
   }
   return this.sdk.sendEvent(to,data);
  }catch{return false;}
 }
 close(){this.closed=true;this.sdk?.close();this.handlers.clear();this.assemblers.clear();}
}
