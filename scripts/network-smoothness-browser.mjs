import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';

// Exercise the actual scene and compressed packets over a local test relay.
let ready=false;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),pages=[await context.newPage(),await context.newPage()],errors=[];
 for(let id=0;id<2;id++){
  const page=pages[id];page.on('pageerror',e=>errors.push(e.message));
  await page.exposeBinding('relay',async(_source,packet)=>{
   if(!ready)return;
   await pages[1-id].evaluate(async({from,data})=>{await window.fogbound.scene.network.handle({op:'message',from,data});},{from:id===0?'host':'guest',data:{v:3,...packet}});
  });
  await page.goto('http://127.0.0.1:5186');await page.locator('#launch').click();
  await page.evaluate(async id=>{
   const {Multiplayer}=await import('/src/multiplayer.ts');
   const {Match,actorPosition}=await import('/src/game.ts');
   const scene=window.fogbound.scene,net=new Multiplayer(),m=new Match(id===0?'killer':'survivor',42);
   m.playerId=id===0?4:0;m.survivorAI=()=>{};m.killerAI=()=>{};m.terrain=[];
   Object.assign(m.player,{x:600,y:id===0?750:650});
   net.you={client_id:id===0?'host':'guest',user_id:id+1,username:'Test',seat:m.playerId};net.hostId='host';net.round=42;
   net.slots=Array.from({length:5},(_,i)=>({id:i,clientId:i===4?'host':i===0?'guest':null,name:'Test',ai:i>0&&i<4}));
   net.match=m;net.backgroundAt=performance.now();net.background=setInterval(()=>net.tickBackground(),33);net.broadcast=p=>{void window.relay(p);};net.direct=(_to,p)=>{void window.relay(p);};
   scene.match=m;scene.network=net;scene.viewId=m.playerId;
   window.samples=[];let last=performance.now();
   const sample=()=>{const now=performance.now();window.samples.push({dt:now-last,time:m.time,visual:m.renderTime,x:actorPosition(m.player).x});last=now;window.sampleId=requestAnimationFrame(sample);};requestAnimationFrame(sample);
  },id);
 }
 ready=true;await pages[1].waitForTimeout(500);for(const page of pages)await page.evaluate(()=>{window.samples=[];});
 await pages[0].keyboard.down('d');await pages[1].keyboard.down('d');
 await pages[1].waitForTimeout(3500);
 const reports=[];
 for(let id=0;id<2;id++){
  await pages[id].keyboard.up('d');
  const samples=await pages[id].evaluate(()=>{cancelAnimationFrame(window.sampleId);return window.samples;});
  const measured=samples.slice(15),deltas=measured.map(s=>s.dt).sort((a,b)=>a-b);
  const changed=measured.slice(1).filter((s,i)=>s.visual>measured[i].visual+1e-6).length/(measured.length-1);
  const report={role:id===0?'host':'guest',frames:measured.length,medianMs:deltas[Math.floor(deltas.length*.5)],p95Ms:deltas[Math.floor(deltas.length*.95)],animationAdvanceRatio:changed,animationHz:changed*(measured.length-1)/(measured.slice(1).reduce((sum,s)=>sum+s.dt,0)/1000)};
  assert.ok(measured.length>60,JSON.stringify(report));assert.ok(report.animationHz>40,JSON.stringify(report));reports.push(report);
 }
 assert.deepEqual(errors,[]);writeFileSync('artifacts/network-smoothness.json',JSON.stringify({transport:'local test relay with production compression',reports},null,2));console.log(reports);
}finally{await browser.close();}




