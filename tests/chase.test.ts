import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,EMPTY_INPUT} from '../src/game';
test('chase music state covers both roles, holds briefly, and stops for hiding or capture',()=>{
 const m=new Match('survivor',42);m.survivorAI=()=>{};m.killerAI=()=>{};m.terrain=[];
 Object.assign(m.player,{x:600,y:650});Object.assign(m.killer,{x:700,y:650,angle:Math.PI});
 m.step(.1,{...EMPTY_INPUT,dx:1,run:true});assert.equal(m.isChasing(m.player),true);assert.equal(m.isChasing(m.killer),true);assert.equal(m.isChasing(m.survivors[1]),false);
 m.killer.x=1500;m.step(1);assert.equal(m.isChasing(m.player),true);m.step(3);assert.equal(m.isChasing(m.player),false);
 m.chaseUntil[0]=m.time+3;m.player.lockerId=0;assert.equal(m.isChasing(m.killer),false);
 m.player.lockerId=undefined;m.carried=0;assert.equal(m.isChasing(m.killer),false);
 m.carried=null;m.player.life='down';assert.equal(m.isChasing(m.player),false);
 m.player.life='healthy';m.finished=true;assert.equal(m.isChasing(m.killer),false);
});
