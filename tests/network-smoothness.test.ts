import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT,actorPosition} from '../src/game';
import {Multiplayer} from '../src/multiplayer';
import {applySnapshot,snapshot,unpack} from '../src/network-state';

test('foreground host advances on every 60 Hz frame; timer does not double simulate',t=>{
 let now=1000;t.mock.method(performance,'now',()=>now);
 Object.defineProperty(globalThis,'document',{configurable:true,value:{hidden:false}});t.after(()=>{Reflect.deleteProperty(globalThis,'document');});
 const net=new Multiplayer(),m=net.match=new Match('survivor',42);
 net.you={client_id:'host',user_id:1,username:'Host',seat:0};net.hostId='host';
 net.slots=[{id:0,clientId:'host',name:'Host',ai:false}];
 m.survivorAI=()=>{};m.killerAI=()=>{};m.terrain=[];
 Object.assign(m.player,{x:600,y:650});
 // Keep this scheduling check independent of async packet compression.
 (net as any).packing=true;
 let previous=m.player.x;
 for(let i=0;i<60;i++){
  now+=1000/60;net.tick(1/60,{...EMPTY_INPUT,dx:1});
  assert.ok(m.player.x>previous);previous=m.player.x;
  (net as any).tickBackground();
 }
 assert.ok(Math.abs(m.time-1)<1e-8);
 now+=300;(net as any).tickBackground();
 assert.ok(Math.abs(m.time-1.3)<1e-8,'timer resumes when frames stop');
 now+=1000/60;net.tick(1/60,EMPTY_INPUT);(net as any).tickBackground();
 assert.ok(Math.abs(m.time-(1.3+1/60))<1e-8);
});

test('guest animation and position advance between snapshots without changing authoritative time',t=>{
 let now=1000;t.mock.method(performance,'now',()=>now);
 const host=new Match('survivor',42),guest=new Match('survivor',42);
 Object.assign(host.player,{x:600,y:650});Object.assign(guest.player,{x:600,y:650});
 host.time=1;applySnapshot(guest,snapshot(host));now+=50;
 host.time=1.05;host.player.x=610;applySnapshot(guest,snapshot(host));
 const frames=[];
 for(let i=0;i<3;i++){now+=16;frames.push({time:guest.renderTime,x:actorPosition(guest.player).x});}
 assert.ok(frames[0].time<frames[1].time&&frames[1].time<frames[2].time);
 assert.ok(frames[0].x<frames[1].x&&frames[1].x<frames[2].x);
 assert.equal(guest.time,1.05);
 now+=10000;assert.equal(guest.renderTime,1.05);assert.equal(actorPosition(guest.player).x,610);
 assert.ok(!snapshot(guest).includes('netDuration'));
});

test('guest sends held controls at 30 Hz and sends one-shot actions only once',()=>{
 const net=new Multiplayer();net.match=new Match('survivor',42);net.hostId='host';
 net.rtc.sdk={peers:new Map([['host',{ready:true}]])} as any;
 const sent:any[]=[];(net as any).direct=(_to:string,p:any)=>sent.push(p);
 for(let i=0;i<60;i++)net.tick(1/60,{...EMPTY_INPUT,dx:1,space:i===0});
 assert.equal(sent.length,30);assert.equal(sent.filter(p=>p.input.space).length,1);
 assert.ok(sent.every(p=>p.input.dx===1));
});

test('WebSocket fallback stays below relay limit and retains one-shot input between sends',()=>{
 const net=new Multiplayer();net.match=new Match('survivor',42);net.hostId='host';
 const sent:any[]=[];(net as any).direct=(_to:string,p:any)=>sent.push(p);
 for(let i=0;i<60;i++)net.tick(1/60,{...EMPTY_INPUT,dx:1,space:i===0});
 assert.equal(sent.length,12);assert.equal(sent.filter(p=>p.input.space).length,1);
});

test('relay congestion holds one-shot controls, then sends latest held input on recovery',()=>{
 const net=new Multiplayer();net.match=new Match('survivor',42);net.hostId='host';
 net.ws={bufferedAmount:20000} as WebSocket;
 const sent:any[]=[];(net as any).direct=(_to:string,p:any)=>sent.push(p);
 net.tick(.08,{...EMPTY_INPUT,space:true,dx:1});
 net.tick(.08,{...EMPTY_INPUT,dx:-1});assert.equal(sent.length,0);
 net.ws={bufferedAmount:0} as WebSocket;net.tick(.08,{...EMPTY_INPUT,dx:-1});
 assert.equal(sent.length,1);assert.equal(sent[0].input.space,true);assert.equal(sent[0].input.dx,-1);
});

test('relay host merges events into an 80ms snapshot and guest applies them once',async()=>{
 const net=new Multiplayer(),m=net.match=new Match('killer',42);
 net.you={client_id:'host',user_id:1,username:'Host',seat:4};net.hostId='host';
 m.survivorAI=()=>{};m.killerAI=()=>{};
 const event={type:'test-event',text:'test',x:600,y:650};
 (net as any).eventQueue.push(event);
 const sent:any[]=[];(net as any).send=(p:any)=>sent.push(p);
 net.tick(.08,EMPTY_INPUT);
 while((net as any).packing)await new Promise(resolve=>setTimeout(resolve,1));
 assert.equal(sent.length,1);assert.equal(sent[0].data.type,'state');
 const state=JSON.parse(await unpack(sent[0].data.payload));assert.deepEqual(state.events,[event]);
 const guest=new Multiplayer();guest.hostId='host';guest.match=new Match('survivor',42);
 await (guest as any).handle({op:'message',from:'host',data:sent[0].data});
 await (guest as any).handle({op:'message',from:'host',data:sent[0].data});
 assert.equal(guest.match.events.filter(e=>e.type==='test-event').length,1);
});

