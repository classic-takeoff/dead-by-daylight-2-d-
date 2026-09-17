import test from 'node:test';
import assert from 'node:assert/strict';
import {RTCTransport} from '../src/rtc-transport';

test('snapshots travel the reliable ordered channel as a single message',()=>{
  const rtc=new RTCTransport(()=>{},()=>{});const sent:any[]=[];
  rtc.sdk={peers:new Map([['guest',{ready:true}]]),sendEvent:(_id:string,d:unknown)=>{sent.push(d);return true;},sendState:()=>{throw new Error('state channel must not be used');}} as any;
  assert.equal(rtc.send('guest',{type:'state',seq:1,round:42,payload:'A'.repeat(3000)}),true);
  assert.equal(sent.length,1);assert.equal(sent[0].payload.length,3000);
});
test('events also use the reliable channel',()=>{
  const rtc=new RTCTransport(()=>{},()=>{});const sent:any[]=[];
  rtc.sdk={peers:new Map(),sendEvent:(_id:string,d:unknown)=>{sent.push(d);return true;}} as any;
  assert.equal(rtc.send('guest',{type:'round-events',events:[]}),true);assert.equal(sent.length,1);
});
test('send returns false when the SDK is unavailable',()=>{
  const rtc=new RTCTransport(()=>{},()=>{});
  assert.equal(rtc.send('guest',{type:'state'}),false);
});
