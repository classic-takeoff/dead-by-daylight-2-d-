import test from 'node:test';
import assert from 'node:assert/strict';
import {blocked,lineClear} from '../src/world';
import {Match,EMPTY_INPUT,CONFIG} from '../src/game';
test('tall fences hide standing and crouched survivors for both roles',()=>{
 const m=new Match('survivor'),s=m.player,k=m.killer;m.terrain=[{x:310,y:270,w:160,h:32,kind:'junk'}];m.survivorAI=()=>{};m.killerAI=()=>{};
 Object.assign(s,{x:400,y:320,angle:-Math.PI/2});Object.assign(k,{x:400,y:240,angle:Math.PI/2});
 assert.equal(m.canSee(k,s),false);m.step(.01,{...EMPTY_INPUT,crouch:true,angle:-Math.PI/2});
 assert.equal(s.crouching,true);assert.equal(m.canSee(k,s),false);assert.equal(m.canSee(s,k),false);
 m.step(.01,{...EMPTY_INPUT,angle:-Math.PI/2});assert.equal(m.canSee(k,s),false);
 Object.assign(s,{x:600,y:650,crouching:true,angle:0});Object.assign(k,{x:700,y:650,angle:Math.PI});assert.equal(m.canSee(k,s),true);
});
test('crouch overrides sprint, stays slow while moving and leaves no running marks',()=>{
 const m=new Match('survivor');m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.player,{x:620,y:650});m.step(.1,{...EMPTY_INPUT,crouch:true,run:true,dx:1});
 assert.equal(m.player.x,620+CONFIG.crouchSpeed*.1);assert.equal(m.player.running,false);assert.equal(m.player.crouching,true);assert.equal(m.traces.some(t=>t.kind==='scratch'),false);
 m.step(.1,{...EMPTY_INPUT,crouch:true});assert.equal(m.player.crouching,true);
});
test('survivors cannot see through high buildings or across floors',()=>{
 const m=new Match('survivor');Object.assign(m.player,{x:700,y:610,crouching:true,angle:0});Object.assign(m.killer,{x:850,y:610,angle:Math.PI});assert.equal(m.canSee(m.player,m.killer),false);
 Object.assign(m.player,{x:820,y:670,level:1});Object.assign(m.killer,{x:820,y:670,level:0});assert.equal(m.canSee(m.player,m.killer),false);
});

test('dropped pallets never block either view, but retain movement and attack collision',()=>{
for(const axis of ['x','y'] as const){
 const m=new Match('survivor'),s=m.player,k=m.killer,p=m.pallets[0];Object.assign(p,{x:650,y:650,level:0,axis,state:'down'});
 const horizontal=axis==='x';Object.assign(s,{x:horizontal?610:650,y:horizontal?650:610,angle:horizontal?0:Math.PI/2,level:0});
 Object.assign(k,{x:horizontal?690:650,y:horizontal?650:690,angle:horizontal?Math.PI:-Math.PI/2,level:0});
 for(const crouching of [false,true]){s.crouching=crouching;assert.equal(m.canSee(s,k),true);assert.equal(m.canSee(k,s),true);}
 assert.equal(blocked(p,10,m.obstacles()),true);assert.equal(lineClear(s,k,m.obstacles()),false);
 p.state='broken';assert.equal(blocked(p,10,m.obstacles()),false);
}
});

