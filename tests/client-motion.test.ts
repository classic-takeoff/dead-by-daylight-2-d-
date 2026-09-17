import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT,actorPosition} from '../src/game';
import {advanceLocal,applyRemoteMove,remoteEndpoint} from '../src/client-motion';
import {Multiplayer} from '../src/multiplayer';
import {applySnapshot,snapshot,PROTOCOL} from '../src/network-state';
const input={...EMPTY_INPUT,dx:1,run:true};
function setup(){const m=new Match('survivor',42);m.terrain=[];m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.player,{x:600,y:650,level:0});return m;}

test('host trusts client positions and does not integrate that movement again',async()=>{
  const net=new Multiplayer(),m=net.match=setup();net.you={client_id:'host',user_id:1,username:'Host',seat:4};net.hostId='host';net.slots=[{id:0,clientId:'guest',name:'Guest',ai:false},{id:4,clientId:'host',name:'Host',ai:false}];m.playerId=4;(net as any).packing=true;
  const packet={v:PROTOCOL,type:'input',round:0,seq:1,input,motion:{x:610,y:650,level:0,revision:0}};
  await (net as any).handle({op:'message',from:'guest',data:packet});assert.equal(m.actors[0].x,610);
  net.tick(1/60,EMPTY_INPUT);assert.equal(m.actors[0].x,610);assert.equal(m.actors[0].moving,true);
  await (net as any).handle({op:'message',from:'guest',data:{...packet,motion:{...packet.motion,x:615}}});assert.equal(m.actors[0].x,610,'duplicate sequence ignored');
  await (net as any).handle({op:'message',from:'stranger',data:{...packet,seq:2}});assert.equal(m.actors[0].x,610);
});

test('trusted movement is rejected only for locked actors, stale revisions or floor mismatch',()=>{
  const m=setup(),report=(x:number,extras={})=>({x,y:650,level:0,revision:0,...extras});
  assert.equal(applyRemoteMove(m,0,input,report(610),1000,1000),true);
  assert.equal(applyRemoteMove(m,0,input,report(1000),1010,1000),true,'no anti-cheat distance budget');
  m.player.life='hooked';assert.equal(applyRemoteMove(m,0,input,report(611),1020,1010),false);
  m.player.life='healthy';m.player.transition=1;assert.equal(applyRemoteMove(m,0,input,report(611),1030,1020),false);
  m.player.transition=0;assert.equal(applyRemoteMove(m,0,input,report(611,{level:1}),1040,1030),false);
  m.player.motionRevision=1;assert.equal(applyRemoteMove(m,0,input,report(611),1050,1040),false);
  assert.equal(applyRemoteMove(m,0,input,report(611,{revision:1}),1060,1050),true);
});

test('remote interpolation leads into bounded extrapolation and stops before a wall',t=>{
  let now=1000;t.mock.method(performance,'now',()=>now);const host=setup(),guest=setup();
  Object.assign(host.player,{x:610,moving:true,velocity:{x:100,y:0}});applySnapshot(guest,snapshot(host));
  now+=25;assert.ok(actorPosition(guest.player).x>600&&actorPosition(guest.player).x<610);
  now+=100;const p=actorPosition(guest.player);assert.ok(p.x>610&&p.x<=620);
  now+=1000;assert.equal(actorPosition(guest.player).x,620);assert.equal(guest.player.x,610);
  guest.terrain=[{x:628,y:600,w:10,h:100,kind:'wall'}];assert.ok(remoteEndpoint(guest,guest.player)!.x<=618);
  host.player.life='down';host.player.moving=false;applySnapshot(guest,snapshot(host));assert.equal(guest.player.netExtrapolate,undefined);assert.equal(actorPosition(guest.player).x,610);
  assert.ok(!snapshot(guest).includes('netExtrapolate'));
});

test('host renders accepted movement smoothly',async t=>{
  let now=1000;t.mock.method(performance,'now',()=>now);
  const {renderPosition}=await import('../src/game');const m=setup();
  applyRemoteMove(m,0,input,{x:610,y:650,level:0,revision:0},now,now);
  assert.equal(actorPosition(m.player).x,610);
  assert.equal(renderPosition(m.player).x,600);
  now+=16;assert.ok(renderPosition(m.player).x>600&&renderPosition(m.player).x<610);
  now+=100;assert.equal(renderPosition(m.player).x,610);
  assert.ok(!snapshot(m).includes('hostView'));
});

test('client report cannot set combat state and stale movement cannot undo a host traversal',async()=>{
  const net=new Multiplayer(),m=net.match=setup();net.you={client_id:'host',user_id:1,username:'Host',seat:4};net.hostId='host';net.slots=[{id:0,clientId:'guest',name:'Guest',ai:false},{id:4,clientId:'host',name:'Host',ai:false}];m.playerId=4;(net as any).packing=true;
  const packet={v:PROTOCOL,type:'input',round:0,seq:1,input:EMPTY_INPUT,motion:{x:610,y:650,level:0,revision:0,life:'escaped',hooks:0}};
  await (net as any).handle({op:'message',from:'guest',data:packet});assert.equal(m.actors[0].life,'healthy');
  m.traverse(m.actors[0],{x:900,y:600,level:1},false);m.actors[0].motionRevision=1;
  await (net as any).handle({op:'message',from:'guest',data:{...packet,seq:2}});assert.equal(m.actors[0].x,900);assert.equal(m.actors[0].level,1);
});
