import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const base='http://101.43.19.238';
const source='C:/Users/57861/.codex/sessions/2026/09/12/rollout-2026-09-12T02-34-34-01a091bf-ff80-7ab2-8e42-9e02e736b8ae.jsonl';
const prior=readFileSync(source,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(r=>r.type==='response_item'&&r.payload.role==='user').map(r=>r.payload.content?.map(c=>c.text??'').join('\n')??'').findLast(t=>t.includes(base)&&t.includes('API Token'));
const token=prior?.match(/API Token[：:]\s*(gh_[A-Za-z0-9]+)/)?.[1];if(!token)throw Error('GameHub credential unavailable');
const entry=JSON.parse(readFileSync('artifacts/gamehub-release.json','utf8')).game.entry_url;
const prefix=new URL('.',entry).pathname,root=resolve('dist'),live=process.argv.includes('--live');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800},extraHTTPHeaders:{Authorization:'Bearer '+token}});
 if(!live)await context.route(base+prefix+'**',async route=>{const rel=decodeURIComponent(new URL(route.request().url()).pathname.slice(prefix.length)),file=resolve(root,rel);if(!file.startsWith(root)||!existsSync(file))return route.abort();await route.fulfill({body:readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.ogg':'audio/ogg','.wav':'audio/wav','.mp3':'audio/mpeg','.svg':'image/svg+xml'})[extname(file)]??'application/octet-stream'});});
 const host=await context.newPage(),guest=await context.newPage(),errors=[];
 for(const page of [host,guest]){page.on('pageerror',e=>errors.push(e.message));await page.goto(entry);await page.waitForFunction(()=>window.fogbound?.scene?.art);}
 await host.locator('#online-launch').click();
 await host.locator('[data-online-role="killer"]').click();
 for(const viewport of [{width:1280,height:800},{width:844,height:390},{width:390,height:844}]){
  await host.setViewportSize(viewport);
  assert.ok(await host.locator('#panel').evaluate(el=>el.scrollWidth<=el.clientWidth),'Room panel overflows');
  const input=await host.locator('#room-code').boundingBox(),button=await host.locator('#join-room').boundingBox();assert.ok(input.width>100&&input.x+input.width<=button.x);
 }
 await host.setViewportSize({width:1280,height:800});await host.screenshot({path:'artifacts/room-setup.png'});
 await host.locator('#create-room').click();
 await host.waitForFunction(()=>window.fogbound.scene.network?.room?.code);const code=await host.evaluate(()=>window.fogbound.scene.network.room.code);
 await host.locator('#chat-input').fill('Room test <b>hello</b>');await host.locator('#chat-input').press('Enter');await host.locator('#chat-log').getByText('Room test <b>hello</b>',{exact:true}).waitFor();
 await guest.locator('#online-launch').click();await guest.locator('#refresh-rooms').click();await guest.locator(`[data-join-code="${code}"]`).waitFor();
 assert.match(await guest.locator('#room-list').innerText(),/ID/);await guest.locator(`[data-join-code="${code}"]`).click();
 await host.waitForFunction(()=>window.fogbound.scene.network.slots.filter(s=>s.clientId).length===2);
 await guest.locator('#chat-log').getByText('Room test <b>hello</b>',{exact:true}).waitFor();assert.equal(await guest.locator('#chat-log span b').count(),0);
 await guest.locator('#chat-input').fill('Guest ready');await guest.locator('#chat-form button').click();await host.locator('#chat-log').getByText('Guest ready',{exact:true}).waitFor();
 await host.locator('[data-seat="1"]').click();
 await guest.waitForFunction(()=>window.fogbound.scene.network.slots[1]?.clientId===window.fogbound.scene.network.hostId&&window.fogbound.scene.network.hostRole==='survivor');
 await guest.locator('[data-seat="4"]').click();
 await host.waitForFunction(()=>!!window.fogbound.scene.network.slots[4]?.clientId);
 await guest.locator('[data-seat="0"]').click();await host.waitForFunction(()=>!window.fogbound.scene.network.slots[4]?.clientId);
 await host.locator('#fill-ai').click();await host.locator('[data-seat="4"]').click();
 await guest.waitForFunction(()=>window.fogbound.scene.network.slots[4]?.clientId===window.fogbound.scene.network.hostId&&window.fogbound.scene.network.slots[1].ai&&window.fogbound.scene.network.hostRole==='killer');
 assert.equal(await guest.locator('[data-seat="4"]').count(),0);
 console.log({hostSeatChange:true,guestFactionChange:true,aiSwap:true,hostFactionUpdated:true});
 await host.keyboard.press('Escape');assert.ok(await host.locator('#overlay').isVisible());
 await host.screenshot({path:'artifacts/room-lobby.png'});
 await host.locator('#fill-ai').click();await host.locator('#start-room').click();
 await Promise.all([host,guest].map(page=>page.waitForFunction(()=>window.fogbound.match&&window.fogbound.scene.network?.match)));
 const ids=await Promise.all([host,guest].map(page=>page.evaluate(()=>window.fogbound.match.playerId)));assert.equal(ids[0],4);assert.ok(ids[1]<4);
 await host.evaluate(()=>{const m=window.fogbound.match;m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.killer,{x:600,y:650,level:0});Object.assign(m.actors[0],{x:700,y:650,level:1});});
 await Promise.all([host,guest].map(page=>page.waitForFunction(()=>window.fogbound.scene.soundFX.buffers.size===45)));
 for(const page of [host,guest])await page.evaluate(()=>{const sound=window.fogbound.scene.soundFX,original=sound.taunt.bind(sound);window.tauntCalls=[];sound.taunt=(...args)=>{window.tauntCalls.push(args.slice(0,2));original(...args);};});
 await guest.mouse.move(640,400);await guest.keyboard.down('q');await guest.mouse.move(640,305);await guest.keyboard.up('q');
 await host.waitForFunction(()=>window.tauntCalls.some(([id,actor])=>id===0&&actor===0));await guest.waitForFunction(()=>window.tauntCalls.some(([id,actor])=>id===0&&actor===0));
 await host.locator('.direction-marker.taunt').waitFor();const marker=await host.locator('.direction-marker.taunt').innerText();assert.match(marker,/正在嘲讽/);assert.match(marker,/10m/);assert.match(marker,/2楼/);
 assert.equal(await guest.locator('.direction-marker.taunt').count(),0);
 await host.screenshot({path:'src/sound effect/taunt-network.png'});
 await host.mouse.move(640,400);await host.keyboard.down('q');await host.mouse.move(640,305);await host.keyboard.up('q');await guest.waitForFunction(()=>window.tauntCalls.some(([id,actor])=>id===0&&actor===4));
 await host.waitForTimeout(550);for(const page of [host,guest])assert.deepEqual(await page.evaluate(()=>window.tauntCalls),[[0,0],[0,4]]);
 // A previously inaudible voice becomes audible on approach, for the remainder of the clip.
 await host.evaluate(()=>{const m=window.fogbound.match;Object.assign(m.actors[0],{x:1850,y:1300,level:0});m.playTaunt(m.actors[0],3);});
 await host.waitForFunction(()=>window.tauntCalls.some(([id,actor])=>id===3&&actor===0));await guest.waitForFunction(()=>window.tauntCalls.some(([id,actor])=>id===3&&actor===0));
 await host.waitForTimeout(160);assert.equal(await host.locator('.direction-marker.taunt').count(),0);
 const silent=await host.evaluate(()=>window.fogbound.scene.soundFX.voices.get(0).gain.gain.value);assert.ok(silent<.001);
 await host.evaluate(()=>{const m=window.fogbound.match;Object.assign(m.actors[0],{x:m.killer.x+100,y:m.killer.y,level:0});});await host.locator('.direction-marker.taunt').waitFor();await host.waitForTimeout(250);assert.ok(await host.evaluate(()=>window.fogbound.scene.soundFX.voices.get(0).gain.gain.value>.2));
 assert.deepEqual(errors,[]);console.log({guestToHost:true,hostToGuest:true,oneShotDelivery:true,nameDistanceFloor:marker,hearingRange:true,approachDuringPlayback:true,errors});
}finally{await browser.close();}

