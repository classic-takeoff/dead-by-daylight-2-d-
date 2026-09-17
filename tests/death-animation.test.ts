import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,CONFIG} from '../src/game';
import {DEATH_DURATION,deathPose} from '../src/death-animation';
test('four survivors bleeding out simultaneously leave time for all four souls',()=>{
 const m=new Match('survivor',42);m.survivorAI=()=>{};m.killerAI=()=>{};m.survivors.forEach(s=>{s.life='down';s.bleed=CONFIG.bleedTime-.01;});m.step(.03);
 assert.equal(m.finished,true);assert.equal(m.deathAnimating,true);
 assert.ok(m.survivors.every(s=>s.life==='dead'&&s.deathAt===m.time&&s.deathFrom));
 const start=m.time;m.kill(m.player);assert.equal(m.player.deathAt,start);
 m.step(DEATH_DURATION/2);assert.equal(m.deathAnimating,true);m.step(DEATH_DURATION/2+.01);assert.equal(m.deathAnimating,false);
});
test('third hook starts sacrifice animation at the hooked body location',()=>{
 const m=new Match('killer',42),s=m.survivors[0],h=m.hooks[0];s.hooks=2;s.life='carried';m.carried=s.id;m.hang(h);
 assert.equal(s.life,'dead');assert.equal(s.deathAt,m.time);assert.equal(s.deathFrom!.y,s.y-26);
 const early=deathPose(.3),late=deathPose(1.6);assert.ok(late.rise>early.rise);assert.ok(late.bodyAlpha<early.bodyAlpha);assert.ok(late.soulAlpha>0);assert.ok(deathPose(DEATH_DURATION).soulAlpha<1e-8);
});

