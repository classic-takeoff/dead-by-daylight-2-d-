import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5186');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('[data-role="killer"]').click();await page.locator('#launch').click();
await page.evaluate(()=>{const m=window.fogbound.match;m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.killer,{x:620,y:650});m.survivors.forEach((s,i)=>Object.assign(s,{x:1100+i*70,y:850}));});await page.mouse.move(1100,450);await page.mouse.down();await page.waitForTimeout(600);await page.screenshot({path:'artifacts/lunge-ready.png'});await page.mouse.up();await page.waitForFunction(()=>window.fogbound.match.killer.attackCharge>.25);
const stages=[];
for(const age of [.03,.17,.28,.48,.82]){
 await page.evaluate(async age=>{const {match:m,scene}=window.fogbound;scene.paused=false;await new Promise(resolve=>{const tick=()=>{if(m.time-m.killer.attackAt>=age){scene.paused=true;resolve();}else requestAnimationFrame(tick);};requestAnimationFrame(tick);});},age);
 stages.push(await page.evaluate(()=>({age:window.fogbound.match.time-window.fogbound.match.killer.attackAt,x:window.fogbound.match.killer.x})));
 await page.screenshot({path:`artifacts/lunge-${age}.png`});
}
assert.ok(stages[1].x>stages[0].x);assert.ok(stages[2].x>=stages[1].x);assert.ok(stages[4].x-stages[0].x<24);
await page.evaluate(()=>window.fogbound.scene.paused=false);await page.keyboard.press('Escape');await page.locator('#quit').click();await page.locator('[data-role="survivor"]').click();await page.locator('#launch').click();
for(const [label,distance] of [['far',310],['near',40]]){await page.evaluate(({distance})=>{const {match:m,scene}=window.fogbound;scene.paused=true;Object.assign(m.player,{x:620,y:650,angle:0});Object.assign(m.killer,{x:620+distance,y:650});m.time=100;scene.soundFX.lastBeat=100;},{distance});await page.screenshot({path:`artifacts/heart-${label}.png`});}
console.log({stages,errors});await browser.close();assert.deepEqual(errors,[]);


