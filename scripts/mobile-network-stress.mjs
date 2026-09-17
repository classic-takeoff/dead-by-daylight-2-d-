import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
let ready=false,packets=0,lost=0;const errors=[],timers=new Set();
try{
 const contexts=await Promise.all([0,1,2].map(()=>browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'}))),pages=await Promise.all(contexts.map(c=>c.newPage()));
 const ids=['host','guest1','guest2'];
 for(let id=0;id<3;id++){
  const page=pages[id];page.on('pageerror',e=>errors.push(e.message));
  await page.exposeBinding('relay',(_source,packet)=>{
   if(!ready||!packet.data)return;const targets=packet.op==='broadcast'?ids.filter(v=>v!==ids[id]):[packet.to];
   for(const to of targets){const target=ids.indexOf(to);if(target<0)continue;packets++;
    // Relay simulation: 60-95ms one-way delay, plus 8% dropped state packets.
    if(packet.data.type==='state'&&packets%12===0){lost++;continue;}
    const timer=setTimeout(()=>{timers.delete(timer);void pages[target].evaluate(async({from,data})=>{await window.net.handle({op:'message',from,data});},{from:ids[id],data:packet.data}).catch(e=>errors.push(e.message));},60+(packets%4)*12);timers.add(timer);
   }
  });
  const cdp=await contexts[id].newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto('http://127.0.0.1:5186');await page.locator('#launch').click();
  await page.evaluate(async({id,ids})=>{
   const {Multiplayer}=await import('/src/multiplayer.ts'),{Match,EMPTY_INPUT,actorPosition}=await import('/src/game.ts');
   const scene=window.fogbound.scene,net=window.net=new Multiplayer(),m=new Match(id===0?'killer':'survivor',42);m.playerId=id===0?4:id-1;m.survivorAI=()=>{};m.killerAI=()=>{};m.terrain=[];
   Object.assign(m.killer,{x:100,y:950});Object.assign(m.survivors[0],{x:100,y:1070});Object.assign(m.survivors[1],{x:100,y:1180});
   net.you={client_id:ids[id],user_id:id+1,username:ids[id],seat:m.playerId};net.hostId='host';net.round=42;net.room={code:'LOCAL',members:ids.map((client_id,i)=>({client_id,user_id:i+1,username:client_id,seat:i})),game_id:'06e44bf0434559c5',host_id:1};
   net.slots=Array.from({length:5},(_,i)=>({id:i,clientId:i===4?'host':i<2?ids[i+1]:null,name:'Test',ai:i>=2&&i<4}));net.match=m;net.send=p=>window.relay(p);net.backgroundAt=performance.now();net.background=setInterval(()=>net.tickBackground(),33);
   scene.startMatch(m);scene.network=net;scene.viewId=m.playerId;window.testInput={...EMPTY_INPUT};scene.touch.used=true;scene.touch.read=()=>window.testInput;
   window.samples=[];window.position=()=>actorPosition(m.player);let last=performance.now();
   const sample=()=>{const now=performance.now();window.samples.push({dt:now-last,x:actorPosition(m.player).x,authoritative:m.player.x});last=now;window.sampleId=requestAnimationFrame(sample);};requestAnimationFrame(sample);
  },{id,ids});
 }
 ready=true;await pages[0].waitForTimeout(700);
 const latency=[];
 for(let id=1;id<3;id++)latency.push(await pages[id].evaluate(async()=>{window.samples=[];const x=window.position().x,start=performance.now();window.testInput.dx=1;window.testInput.run=true;while(window.position().x<=x+.1&&performance.now()-start<600)await new Promise(r=>requestAnimationFrame(r));return performance.now()-start;}));
 await pages[0].waitForTimeout(1000);for(const p of pages.slice(1))await p.evaluate(()=>window.testInput.dx=-1);await pages[0].waitForTimeout(800);for(const p of pages.slice(1))await p.evaluate(()=>window.testInput.dx=0);await pages[0].waitForTimeout(600);
 const reports=[];
 for(let id=0;id<3;id++){reports.push(await pages[id].evaluate(id=>{const m=window.net.match,data=window.samples.slice(10),sorted=data.map(s=>s.dt).sort((a,b)=>a-b);return {id,frames:data.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],authoritativeTravel:Math.max(...data.map(s=>s.authoritative))-Math.min(...data.map(s=>s.authoritative)),maxJump:Math.max(...data.slice(1).map((s,i)=>Math.abs(s.x-data[i].x))),settledError:Math.abs(window.position().x-m.player.x),density:document.querySelector('canvas').width/innerWidth};},id));}
 for(const ms of latency)assert.ok(ms<100,'local input response '+ms);for(const r of reports){if(r.id>0)assert.ok(r.authoritativeTravel>45,JSON.stringify(r));assert.ok(r.frames>35,JSON.stringify(r));assert.ok(r.density<=1.01,JSON.stringify(r));assert.ok(r.maxJump<30,JSON.stringify(r));assert.ok(r.settledError<8,JSON.stringify(r));}
 await pages[1].screenshot({path:'artifacts/mobile-network-darkwood.png'});assert.deepEqual(errors,[]);const report={clients:3,cpuThrottle:4,oneWayLatencyMs:'60-96',lostStatePackets:lost,firstMovementMs:latency,reports};writeFileSync('artifacts/mobile-network-stress.json',JSON.stringify(report,null,2));console.log(report);
}finally{ready=false;for(const timer of timers)clearTimeout(timer);await browser.close();}

