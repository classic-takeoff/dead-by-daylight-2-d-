import test from 'node:test';
import assert from 'node:assert/strict';
import {ClientPrediction} from '../src/client-prediction';
import {Match,EMPTY_INPUT,actorPosition} from '../src/game';
import {pack,unpack,snapshot} from '../src/network-state';
import {RTCTransport} from '../src/rtc-transport';
import {TUNING} from '../src/tuning';

test('guest movement responds in the first frame while authoritative state waits for the host',t=>{
 let now=1000;t.mock.method(performance,'now',()=>now);const m=new Match('survivor',42),p=new ClientPrediction();m.terrain=[];Object.assign(m.player,{x:600,y:650});
 p.tick(m,1/60,{...EMPTY_INPUT,dx:1});assert.ok(actorPosition(m.player).x>600);assert.equal(m.player.x,600);assert.ok(!snapshot(m).includes('predicted'));
 p.sent(1);now+=80;const previous=actorPosition(m.player);m.player.x=602;p.reconcile(m,1,previous);p.tick(m,1/60,{...EMPTY_INPUT,dx:1});assert.ok(actorPosition(m.player).x>previous.x);
 const pos=actorPosition(m.player);p.tick(m,1/60,EMPTY_INPUT);assert.ok(Math.abs(actorPosition(m.player).x-pos.x)<1);
 now+=1100;p.tick(m,1/60,{...EMPTY_INPUT,dx:1});assert.equal(m.player.predicted,undefined);
});
test('prediction respects collisions and yields immediately to host traversal or incapacitation',()=>{
 const m=new Match('survivor',42),p=new ClientPrediction();m.terrain=[{x:620,y:620,w:20,h:60,kind:'wall'}];Object.assign(m.player,{x:600,y:650});
 for(let i=0;i<30;i++)p.tick(m,1/60,{...EMPTY_INPUT,dx:1});assert.ok(actorPosition(m.player).x<=610);
 m.player.transition=.5;m.player.action='翻越';p.tick(m,1/60,{...EMPTY_INPUT,dx:1});assert.equal(m.player.predicted,undefined);
 m.player.transition=0;m.player.life='hooked';p.tick(m,1/60,{...EMPTY_INPUT,dx:1});assert.equal(m.player.predicted,undefined);
});
test('compressed snapshots work without browser CompressionStream or DecompressionStream',async t=>{
 const oldC=globalThis.CompressionStream,oldD=globalThis.DecompressionStream;Reflect.deleteProperty(globalThis,'CompressionStream');Reflect.deleteProperty(globalThis,'DecompressionStream');t.after(()=>{globalThis.CompressionStream=oldC;globalThis.DecompressionStream=oldD;});
 const text=snapshot(new Match('killer',42)),encoded=await pack(text);assert.ok(encoded.length<7700);assert.equal(await unpack(encoded),text);
});
test('periodic reliable keyframes recover from lost disposable UDP fragments',()=>{
 const rtc=new RTCTransport(()=>{},()=>{}),states:unknown[]=[],events:unknown[]=[];rtc.sdk={peers:new Map([['guest',{ready:true}]]),sendState:(_id:string,d:unknown)=>{states.push(d);return true;},sendEvent:(_id:string,d:unknown)=>{events.push(d);return true;}} as any;
 rtc.send('guest',{type:'state',seq:1,round:42,payload:'A'.repeat(3000)});assert.ok(states.length>1);
 rtc.send('guest',{type:'state',seq:TUNING.network.keyframeEvery,round:42,payload:'A'.repeat(3000)});assert.equal(events.length,1);assert.equal((events[0] as any).payload.length,3000);
});
