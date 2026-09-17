import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
async function start(context){const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5186');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('#launch').click();await page.waitForFunction(()=>window.fogbound.scene.soundFX.buffers.size===45);await page.evaluate(()=>{const {scene,match:m}=window.fogbound;m.survivorAI=()=>{};m.killerAI=()=>{};const original=scene.soundFX.taunt.bind(scene.soundFX);window.tauntCalls=[];scene.soundFX.taunt=(...args)=>{window.tauntCalls.push(args.slice(0,2));original(...args);};});return page;}
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await start(context);
 await page.mouse.move(640,400);await page.keyboard.down('q');await page.locator('#taunt-wheel').waitFor();const box=await page.locator('#taunt-wheel').boundingBox();assert.equal(box.x+box.width/2,640);assert.equal(box.y+box.height/2,400);
 await page.keyboard.up('q');assert.ok(await page.locator('#taunt-wheel').isHidden());assert.equal(await page.evaluate(()=>window.tauntCalls.length),0);
 await page.keyboard.down('q');await page.mouse.move(640,305);assert.equal(await page.locator('[data-sector="0"].selected').count(),1);await page.screenshot({path:import.meta.dirname+'/taunt-desktop.png'});await page.keyboard.up('q');await page.waitForFunction(()=>window.tauntCalls.length===1);
 assert.deepEqual(await page.evaluate(()=>window.tauntCalls[0]),[0,0]);
 const gain=await page.evaluate(()=>{const {scene,match:m}=window.fogbound;const a=m.actors[1];Object.assign(a,{x:m.player.x+80,y:m.player.y,level:m.player.level});scene.soundFX.taunt(6,1,m);const voice=scene.soundFX.voices.get(1);const near=voice.gain.gain.value;a.x=m.player.x+650;return {near,durations:[...scene.soundFX.buffers].filter(([name])=>/叮叮叮|哎哟|奶龙|笑|老牧师/.test(name)).map(([name,b])=>({name,duration:b.duration}))};});
 await page.waitForTimeout(250);const far=await page.evaluate(()=>window.fogbound.scene.soundFX.voices.get(1)?.gain.gain.value);assert.ok(far<gain.near*.3);console.log({desktop:true,dynamicAttenuation:true,voices:gain.durations});
 await page.mouse.move(640,400);await page.keyboard.down('q');await page.mouse.move(950,400);await page.keyboard.up('q');await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.tauntCalls.length),2);
 await page.mouse.move(640,400);await page.keyboard.down('q');await page.mouse.move(640,305);await page.keyboard.press('Escape');await page.keyboard.up('q');assert.ok(await page.locator('#taunt-wheel').isHidden());assert.equal(await page.evaluate(()=>window.tauntCalls.length),2);
 const mobile=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'}),phone=await start(mobile);
 await phone.locator('#taunt-button').tap();let r=await phone.locator('#taunt-wheel').boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=844&&r.y+r.height<=390);await phone.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);assert.ok(await phone.locator('#taunt-wheel').isHidden());assert.equal(await phone.evaluate(()=>window.tauntCalls.length),0);
 await phone.locator('#taunt-button').tap();r=await phone.locator('#taunt-wheel').boundingBox();await phone.screenshot({path:import.meta.dirname+'/taunt-mobile.png'});await phone.touchscreen.tap(r.x+r.width/2,r.y+45);await phone.waitForFunction(()=>window.tauntCalls.length===1);assert.ok(await phone.locator('#taunt-wheel').isHidden());
 assert.equal(await phone.evaluate(()=>window.fogbound.scene.match.player.charge),0);
 await phone.locator('#taunt-button').tap();await phone.setViewportSize({width:390,height:844});assert.ok(await phone.locator('#taunt-wheel').isHidden());assert.deepEqual(errors,[]);console.log({mobileOpenCancelPlay:true,rotationCancels:true,pageErrors:errors});
}finally{await browser.close();}

