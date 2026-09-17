import test from 'node:test';
import assert from 'node:assert/strict';
import {splitState,StateAssembler} from '../src/rtc-transport';

test('actual SDK delivers reordered fragments to assembler instead of dropping them',()=>{
 const sdk=new (globalThis as any).GameHubRTC({subscribe:()=>()=>{}},{unorderedState:true});
 const peer={id:'host',channels:{},rx:-1};sdk.peers.set('host',peer);sdk._member=()=>true;
 const channel:any={label:'state'};sdk._channel(peer,channel);
 const assembler=new StateAssembler();let result:any;
 sdk.on('state',({data}:any)=>{result=assembler.accept(data)??result;});
 const parts=splitState({round:42,seq:1,payload:'A'.repeat(3000)});
 for(const index of [3,1,1,0,2])channel.onmessage({data:JSON.stringify({seq:index,data:parts[index]})});
 assert.equal(result?.payload,'A'.repeat(3000));
});

test('UDP fragments stay below SDK wire limit and reassemble out of order',()=>{
 const data={v:2,type:'state',round:4294967295,seq:Number.MAX_SAFE_INTEGER,payload:'A'.repeat(7700)};
 const parts=splitState(data),a=new StateAssembler();
 for(const p of parts)assert.ok(new TextEncoder().encode(JSON.stringify({seq:Number.MAX_SAFE_INTEGER,data:p})).length<=1200);
 let result;for(const p of parts.reverse())result=a.accept(p);
 assert.equal(result?.payload,data.payload);
});
test('missing and duplicate fragments never apply a partial snapshot; newer frame recovers',()=>{
 const a=new StateAssembler(),parts=splitState({round:42,seq:1,payload:'B'.repeat(3000)});
 assert.equal(a.accept(parts[0]),null);assert.equal(a.accept(parts[0]),null);
 assert.equal(a.accept(parts[2]),null);assert.equal(a.accept(parts[3]),null);
 assert.equal(a.accept({...parts[1],parts:100000}),null);
 assert.equal(a.accept({...parts[1],round:43}),null);
 let result;for(const p of splitState({round:42,seq:2,payload:'new'}))result=a.accept(p);
 assert.equal(result?.payload,'new');
});
