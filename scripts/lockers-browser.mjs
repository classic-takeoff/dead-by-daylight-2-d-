import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5186');await page.waitForFunction(()=>window.fogbound?.scene?.art);
 await page.locator('#launch').click();
 await page.evaluate(()=>{const {match:m,scene}=window.fogbound;scene.paused=true;m.terrain=[];scene.drawGround();scene.viewId=4;Object.assign(m.killer,{x:800,y:615,angle:-Math.PI/2});});
 await page.waitForTimeout(100);await page.screenshot({path:'artifacts/lockers-room.png'});
 await page.evaluate(()=>{const {match:m,scene}=window.fogbound;m.terrain=[{x:640,y:620,w:8,h:60,kind:'wall',low:true}];scene.drawGround();Object.assign(m.killer,{x:600,y:650,angle:0});Object.assign(m.survivors[0],{x:680,y:650,crouching:false});});
 await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>window.fogbound.scene.lastSeen.has(0)),true);
 await page.evaluate(()=>{const m=window.fogbound.match;m.survivors[0].crouching=true;m.time+=.2;});await page.waitForTimeout(80);
 const ghost=await page.evaluate(()=>{const {match:m,scene}=window.fogbound;return {hidden:!m.canSee(m.killer,m.survivors[0]),alpha:scene.escapeLayers[0].alpha};});
 assert.equal(ghost.hidden,true);assert.ok(ghost.alpha>0&&ghost.alpha<.55);
 await page.screenshot({path:'artifacts/lockers-afterimage.png'});
 await page.evaluate(()=>{window.fogbound.match.time+=.7;});await page.waitForTimeout(80);
 assert.equal(await page.evaluate(()=>window.fogbound.scene.lastSeen.has(0)),false);
 await page.evaluate(()=>{const {match:m,scene}=window.fogbound;const l=m.lockers[0],s=m.survivors[0];s.crouching=false;s.cooldown=0;Object.assign(s,{x:l.x,y:l.y+36});m.workLocker(s,0,.5);m.playerId=4;Object.assign(m.killer,{x:l.x,y:l.y+36,angle:-Math.PI/2});m.step(.01);scene.paused=true;m.workLocker(m.killer,0,1.2);s.transition=.4;});
 await page.waitForTimeout(100);await page.screenshot({path:'artifacts/lockers-grab.png'});
 assert.equal(await page.evaluate(()=>window.fogbound.match.carried),0);assert.deepEqual(errors,[]);
 console.log({room:true,afterimage:true,grab:true,errors});
}finally{await browser.close();}
