import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceLocal} from '../src/client-motion';
import {Match,EMPTY_INPUT,actorPosition} from '../src/game';
import {pack,unpack,snapshot} from '../src/network-state';

test('local movement advances the owned actor immediately and is authoritative',()=>{
  const m=new Match('survivor',42);m.terrain=[];Object.assign(m.player,{x:600,y:650});
  advanceLocal(m,m.player,{...EMPTY_INPUT,dx:1},1/60);
  assert.ok(actorPosition(m.player).x>600);
  assert.ok(m.player.x>600,'raw position is mutated, no predicted overlay');
  assert.equal(m.player.predicted,undefined);
  assert.ok(!snapshot(m).includes('predicted'));
});
test('local movement respects collision and yields to traversal or incapacitation',()=>{
  const m=new Match('survivor',42);m.terrain=[{x:620,y:620,w:20,h:60,kind:'wall'}];Object.assign(m.player,{x:600,y:650});
  for(let i=0;i<30;i++)advanceLocal(m,m.player,{...EMPTY_INPUT,dx:1},1/60);
  assert.ok(m.player.x<=610);
  m.player.transition=.5;m.player.action='翻越';const x=m.player.x;advanceLocal(m,m.player,{...EMPTY_INPUT,dx:1},1/60);assert.equal(m.player.x,x);
  m.player.transition=0;m.player.life='hooked';advanceLocal(m,m.player,{...EMPTY_INPUT,dx:1},1/60);assert.equal(m.player.x,x);
});
test('compressed snapshots work without browser CompressionStream or DecompressionStream',async t=>{
  const oldC=globalThis.CompressionStream,oldD=globalThis.DecompressionStream;Reflect.deleteProperty(globalThis,'CompressionStream');Reflect.deleteProperty(globalThis,'DecompressionStream');t.after(()=>{globalThis.CompressionStream=oldC;globalThis.DecompressionStream=oldD;});
  const text=snapshot(new Match('killer',42)),encoded=await pack(text);assert.ok(encoded.length<7700);assert.equal(await unpack(encoded),text);
});
