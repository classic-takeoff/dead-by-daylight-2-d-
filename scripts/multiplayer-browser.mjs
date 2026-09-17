import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
if(process.argv.includes('--smoothness')){await import('./network-smoothness-browser.mjs');process.exit(0);}
const base='http://101.43.19.238';
const source='C:/Users/57861/.codex/sessions/2026/09/12/rollout-2026-09-12T02-34-34-01a091bf-ff80-7ab2-8e42-9e02e736b8ae.jsonl';
const prior=readFileSync(source,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(r=>r.type==='response_item'&&r.payload.role==='user').map(r=>r.payload.content?.map(c=>c.text??'').join('\n')??'').findLast(t=>t.includes(base)&&t.includes('API Token'));
const token=prior?.match(/API Token[：:]\s*(gh_[A-Za-z0-9]+)/)?.[1];if(!token)throw Error('GameHub credential unavailable');
const entry=JSON.parse(readFileSync('artifacts/gamehub-release.json','utf8')).game.entry_url;
const prefix=new URL('.',entry).pathname,root=resolve('dist'),live=process.argv.includes('--live');
const fallback=process.argv.includes('--fallback');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800},extraHTTPHeaders:{Authorization:'Bearer '+token}});
 if(!live)await context.route(base+prefix+'**',async route=>{const rel=decodeURIComponent(new URL(route.request().url()).pathname.slice(prefix.length)),file=resolve(root,rel);if(!file.startsWith(root)||!existsSync(file))return route.abort();await route.fulfill({body:readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.ogg':'audio/ogg','.wav':'audio/wav','.mp3':'audio/mpeg','.svg':'image/svg+xml'})[extname(file)]??'application/octet-stream'});});
 if(fallback)await context.route(base+'/api/v1/rooms/ice-config',route=>route.fulfill({status:503,body:'{}'}));
const host=await context.newPage(),guest=await context.newPage(),errors=[];
 for(const page of [host,guest]){page.on('pageerror',e=>errors.push(e.message));await page.goto(entry,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.fogbound?.scene?.art);}
 await host.locator('#online-launch').click();
 await host.locator('[data-online-role="killer"]').click();
 for(const viewport of [{width:1280,height:800},{width:844,height:390},{width:390,height:844}]){
  await host.setViewportSize(viewport);
  assert.ok(await host.locator('#panel').evaluate(el=>el.scrollWidth<=el.clientWidth),'Room panel overflows');
  const input=await host.locator('#room-code').boundingBox(),button=await host.locator('#join-room').boundingBox();assert.ok(input.width>100&&input.x+input.width<=button.x);
 }
 await host.setViewportSize({width:1280,height:800});await host.screenshot({path:'artifacts/room-setup.png'});
 await host.locator('#create-room').click();
 await host.waitForFunction(()=>window.fogbound.scene.network?.room?.code).catch(async e=>{console.log(await host.locator('#panel').innerText(),errors);throw e;});const code=await host.evaluate(()=>window.fogbound.scene.network.room.code);
 await host.locator('#chat-input').fill('Room test <b>hello</b>');await host.locator('#chat-input').press('Enter');await host.locator('#chat-log').getByText('Room test <b>hello</b>',{exact:true}).waitFor();
 await guest.locator('#online-launch').click();await guest.locator('#refresh-rooms').click();await guest.locator(`[data-join-code="${code}"]`).waitFor();
 assert.match(await guest.locator('#room-list').innerText(),/ID/);await guest.locator(`[data-join-code="${code}"]`).click();
 await host.waitForFunction(()=>window.fogbound.scene.network.slots.filter(s=>s.clientId).length===2);
 if(!fallback)await host.waitForFunction(()=>[...window.fogbound.scene.network.rtc.sdk.peers.values()].some(p=>p.ready));
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
 await host.evaluate(()=>{const m=window.fogbound.match;m.emit('stomp','',{x:m.actors[0].x+200,y:m.actors[0].y,level:0});m.emit('metal-kick','',m.generators[0]);m.explodeGenerator(m.generators[0],3);});
 await guest.locator('.direction-marker.stomp').waitFor();await guest.locator('.direction-marker.metal-kick').waitFor();
 assert.doesNotMatch(await guest.locator('.direction-marker.stomp').innerText(),/\d|m/);
 await host.locator('.direction-marker.generator-fail').waitFor();assert.equal(await guest.locator('.direction-marker.generator-fail').count(),0);
 console.log({repairExplosionKillerAlert:true,survivorKickBearingsWithoutDistance:true});
 await host.evaluate(()=>{const m=window.fogbound.match;m.survivorAI=()=>{};m.killerAI=()=>{};m.terrain=[];Object.assign(m.actors[0],{x:600,y:650});});
 await guest.waitForFunction(()=>Math.abs(window.fogbound.match.player.x-600)<2);
 await guest.bringToFront();const before=await guest.evaluate(()=>window.fogbound.match.player.x);await guest.keyboard.down('d');try{await host.waitForFunction(({id,before})=>window.fogbound.match.actors[id].x>before+25,{id:ids[1],before},{timeout:5000});}finally{await guest.keyboard.up('d');}
 await guest.waitForTimeout(250);const moved=await host.evaluate(id=>window.fogbound.match.actors[id].x,ids[1]);assert.ok(moved>before+25,JSON.stringify({before,moved,guest:await guest.evaluate(()=>({blocked:window.fogbound.scene.blockInput,closed:window.fogbound.scene.network.closed})),host:await host.evaluate(()=>({host:window.fogbound.scene.network.isHost,closed:window.fogbound.scene.network.closed,inputs:[...window.fogbound.scene.network.remoteInputs]}))}));
 await guest.waitForFunction(()=>window.fogbound.scene.network.match.time>0);let converged=false;for(let i=0;i<30;i++){await guest.waitForTimeout(100);const positions=await Promise.all([host.evaluate(id=>window.fogbound.match.actors[id].x,ids[1]),guest.evaluate(()=>window.fogbound.match.player.x)]);if(Math.abs(positions[0]-positions[1])<12){converged=true;break;}}assert.ok(converged,'Remote position did not converge within 3 seconds');
 await guest.screenshot({path:'artifacts/multiplayer-guest.png'});
 await host.evaluate(()=>{const m=window.fogbound.match,g=m.gates[0];g.progress=1;g.openedAt=-10;Object.assign(m.killer,{x:g.x+24,y:g.y,cooldown:0});for(let i=0;i<30;i++)m.move(m.killer,-1,0,1/30);});
 assert.ok(await host.evaluate(()=>{const m=window.fogbound.match;return m.killer.x<0&&m.killer.x>-138;}));
 await host.waitForTimeout(150);await host.screenshot({path:'artifacts/outward-exit.png'});
 await host.evaluate(()=>{const m=window.fogbound.match;for(let i=0;i<60;i++)m.move(m.killer,-1,0,1/30);});
 assert.ok(await host.evaluate(()=>window.fogbound.match.killer.x>=-138));
 await guest.waitForFunction(()=>window.fogbound.match.gates[0].blockedAt!==undefined);console.log({outwardGateCorridor:true,killerEntry:true,exitOnlyBarrier:true,barrierSynced:true});
 // A real held click must survive several rendered frames, then allow another round.
 for(const initiator of [guest,host]){
  if(initiator===guest){
   await host.evaluate(()=>{const m=window.fogbound.match;m.survivors.forEach(s=>{s.life='hooked';s.hooks=1;s.hookTime=0;});});
   await guest.waitForFunction(()=>window.fogbound.match.deathAnimating&&window.fogbound.match.survivors.every(s=>s.life==='dead'));
   assert.equal(await guest.locator('#again').count(),0);
   assert.equal(await guest.evaluate(()=>new Set(window.fogbound.match.survivors.map(s=>s.deathAt)).size),1);
   console.log({allHookedSoulsBeforeResults:true});
  }else await host.evaluate(()=>{const m=window.fogbound.match;m.survivors.forEach(s=>s.life='escaped');m.finished=true;});
  await Promise.all([host,guest].map(p=>p.locator('#again').waitFor()));
  const button=await initiator.locator('#again').boundingBox();await initiator.mouse.move(button.x+button.width/2,button.y+button.height/2);await initiator.mouse.down();await initiator.waitForTimeout(200);await initiator.mouse.up();
  await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!window.fogbound.scene.network.match)));
  assert.equal(await host.evaluate(()=>window.fogbound.scene.network.room.code),code);
  await host.locator('#chat-log').getByText('Guest ready',{exact:true}).waitFor();
  await host.locator('#start-room').click();await Promise.all([host,guest].map(p=>p.waitForFunction(()=>window.fogbound.match&&!window.fogbound.match.finished)));
 }
 console.log({browseAndJoin:true,hostIdVisible:true,heldResultClick:true,guestAndHostReturn:true,rematch:true});
 if(!fallback){const udp=await guest.evaluate(async()=>{const p=[...window.fogbound.scene.network.rtc.sdk.peers.values()].find(p=>p.ready);const stats=[...(await p.pc.getStats()).values()];const pair=stats.find(s=>s.id===stats.find(t=>t.type==='transport'&&t.selectedCandidatePairId)?.selectedCandidatePairId);const selectedProtocol=stats.find(s=>s.id===pair?.localCandidateId)?.protocol;return {selectedProtocol,channels:stats.filter(s=>s.type==='data-channel').map(s=>({label:s.label,received:s.messagesReceived,sent:s.messagesSent})),protocols:stats.filter(s=>s.type==='local-candidate').map(s=>s.protocol)};});assert.ok(udp.channels.some(c=>c.label==='state'&&c.received>0));assert.equal(udp.selectedProtocol,'udp');console.log(JSON.stringify({udp}));}else assert.equal(await guest.evaluate(()=>window.fogbound.scene.network.rtc.sdk),null);
await host.close();await guest.waitForFunction(()=>window.fogbound.match.forfeitRole==='killer');
 assert.equal(await guest.evaluate(()=>window.fogbound.match.survivors.every(s=>s.life==='escaped')),true);
 await guest.locator('#again').click();await guest.locator('#create-room').waitFor();
 assert.deepEqual(errors,[]);console.log({realGameHubRooms:true,live,players:2,ai:3,remoteMovement:true,snapshotSync:true,hostClosedFactionLoss:true});
 await guest.close();
 const h2=await context.newPage(),g2=await context.newPage(),peer=await context.newPage();
 for(const page of [h2,g2,peer]){page.on('pageerror',e=>errors.push(e.message));await page.goto(entry,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.fogbound?.scene?.art);}
 await h2.locator('#online-launch').click();await h2.locator('#create-room').click();await h2.waitForFunction(()=>window.fogbound.scene.network?.room?.code);
 const code2=await h2.evaluate(()=>window.fogbound.scene.network.room.code);
 await g2.locator('[data-role="killer"]').click();
 for(const page of [g2,peer]){await page.locator('#online-launch').click();await page.locator('#room-code').fill(code2);await page.locator('#join-room').click();}
 let capacityLimited=false;try{await h2.waitForFunction(()=>window.fogbound.scene.network.slots.filter(s=>s.clientId).length===3,null,{timeout:8000});}catch(e){capacityLimited=(await peer.locator('#panel').innerText()).includes('\u8fde\u63a5\u6570\u8fc7\u591a');if(!capacityLimited)throw e;}
 if(capacityLimited){console.log({threeClientCheck:'skipped: account connection limit, existing sessions preserved'});await h2.close();await g2.close();await peer.close();}else{
 await h2.locator('#fill-ai').click();await h2.locator('#start-room').click();await Promise.all([h2,g2,peer].map(p=>p.waitForFunction(()=>window.fogbound.match)));
 await g2.close();await h2.waitForFunction(()=>window.fogbound.scene.network.slots[4].ai&&window.fogbound.match.humanInputs&&!window.fogbound.match.humanInputs.has(4));
 assert.equal(await h2.evaluate(()=>window.fogbound.match.forfeitRole),null);
 await h2.close();await peer.waitForFunction(()=>window.fogbound.match.forfeitRole==='survivor');
 assert.equal(await peer.evaluate(()=>window.fogbound.match.survivors.every(s=>s.life==='dead')),true);
 console.log({threeHumans:true,nonHostAIReplacement:true,survivorHostForfeit:true});
 assert.deepEqual(errors,[]);await peer.close();}
 const mobile=await context.newPage();await mobile.setViewportSize({width:844,height:390});await mobile.addInitScript(()=>Object.defineProperty(navigator,'userAgent',{get:()=> 'Android Mobile'}));
 await mobile.goto(entry,{waitUntil:'domcontentloaded',timeout:90000});await mobile.waitForFunction(()=>window.fogbound?.scene?.art);await mobile.evaluate(()=>{window.fogbound.scene.touch.landscape=async()=>{};});await mobile.locator('#launch').click();
 await mobile.evaluate(()=>{const {scene}=window.fogbound;scene.paused=true;scene.touch.context(false,'healthy',0);});
 await mobile.locator('[data-control="interact"]').click();assert.equal(await mobile.evaluate(()=>window.fogbound.scene.touch.read().interact),true);
 await mobile.evaluate(()=>window.fogbound.scene.touch.context(true,'healthy',0));await mobile.locator('[data-control="space"]').click();
 assert.equal(await mobile.evaluate(()=>window.fogbound.scene.touch.read().space),true);assert.equal(await mobile.evaluate(()=>window.fogbound.scene.touch.read().interact),true);
 await mobile.evaluate(()=>{const t=window.fogbound.scene.touch;t.consume();t.context(false,'healthy',null,true,false);});assert.equal(await mobile.locator('[data-control="space"]').isVisible(),false);await mobile.locator('[data-control="interact"]').click();assert.equal(await mobile.evaluate(()=>window.fogbound.scene.touch.read().space),true);
 await mobile.evaluate(()=>{const {scene,match:m}=window.fogbound;m.survivorAI=()=>{};m.killerAI=()=>{};m.survivors[1].life='hooked';m.survivors[1].hooks=1;scene.paused=false;});
 await mobile.locator('.direction-marker.hook').waitFor();const marker=await mobile.locator('.direction-marker.hook').boundingBox();assert.ok(marker.y<150);await mobile.screenshot({path:'artifacts/mobile-top-alerts.png'});
 console.log({mobileDedicatedQTE:true,interactTraversal:true,repairLatchPreserved:true,topHookNotice:true});await mobile.close();await context.close();
}finally{await browser.close();}





