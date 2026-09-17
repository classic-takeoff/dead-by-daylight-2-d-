import './gamehub-rtc';

type Packet=Record<string,any>;
type SDK={on(event:string,fn:(event:any)=>void):SDK;sendEvent(id:string,data:unknown):boolean;close():void;peers:Map<string,any>};

export class RTCTransport{
  sdk:SDK|null=null;private handlers=new Map<string,Set<(e:any)=>void>>();
  private adapter:any;private closed=false;
  constructor(private sendSignal:(data:unknown)=>void,private receive:(from:string,data:Packet)=>void){
    this.adapter={you:null,room:null,subscribe:(name:string,fn:(e:any)=>void)=>{let set=this.handlers.get(name);if(!set)this.handlers.set(name,set=new Set());set.add(fn);return ()=>set!.delete(fn);},signal:(to:string,data:unknown)=>this.sendSignal({op:'signal',to,data}),iceConfig:async()=>{
      const r=await fetch('/api/v1/rooms/ice-config',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('无法获取 UDP 连接配置');return r.json();
    }};
  }
  async open(){
    const sdk:SDK=await (globalThis as any).GameHubRTC.attach(this.adapter,{unorderedState:true});if(this.closed){sdk.close();return;}this.sdk=sdk;
    // Full snapshots travel on the reliable ordered channel. Nothing is sent on
    // the lossy unordered "state" channel, so no fragment is ever dropped and a
    // snapshot never silently fails to reassemble.
    sdk.on('event',({peerId,data})=>this.receive(peerId,data));
  }
  event(e:any){if(e.you)this.adapter.you=e.you;if(e.room)this.adapter.room=e.room;for(const fn of this.handlers.get(e.op)??[])fn(e);}
  send(to:string,data:Packet){
    if(!this.sdk)return false;
    try{return this.sdk.sendEvent(to,data);}catch{return false;}
  }
  close(){this.closed=true;this.sdk?.close();this.handlers.clear();}
}
