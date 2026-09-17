import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5186');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('#launch').click();
 await page.waitForFunction(()=>window.fogbound.scene.soundFX.buffers.has('chase-loop.wav'));
 const music=await page.evaluate(async()=>{
  const {scene,match:m}=window.fogbound;m.survivorAI=()=>{};m.killerAI=()=>{};m.isChasing=()=>true;
  const sound=scene.soundFX,c=sound.context,analyser=c.createAnalyser();sound.output.connect(analyser);
  await new Promise(r=>setTimeout(r,600));const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);
  const result={looping:sound.chaseLoop?.source.loop,duration:sound.buffers.get('chase-loop.wav').duration,rms:Math.sqrt(data.reduce((a,b)=>a+b*b,0)/data.length)};
  delete m.isChasing;sound.stopChase();return result;
 });assert.equal(music.looping,true);assert.ok(music.rms>.005);assert.ok(music.duration<12);
 await page.evaluate(()=>{const {scene,match:m}=window.fogbound;scene.paused=true;const l=m.lockers[0];Object.assign(m.player,{x:l.x,y:l.y+36,angle:Math.PI/2});m.workLocker(m.player,0,.5);});
 await page.waitForTimeout(100);await page.screenshot({path:'artifacts/locker-outside-view.png'});
 assert.equal(await page.evaluate(()=>{const m=window.fogbound.match,p=m.viewpoint(m.player);return m.canSee(m.player,{x:p.x,y:p.y+20});}),true);
 await page.evaluate(()=>{const {match:m,scene}=window.fogbound;m.lockers[0].occupant=null;m.player.lockerId=undefined;m.survivors.forEach((s,i)=>Object.assign(s,{life:'down',x:600+i*100,y:650+(i%2)*80,level:0}));m.step(.03);m.step(1);scene.paused=true;});
 await page.waitForTimeout(100);assert.equal(await page.locator('#overlay').evaluate(e=>e.classList.contains('hidden')),true);
 await page.screenshot({path:'artifacts/four-souls.png'});
 assert.equal(await page.evaluate(()=>window.fogbound.match.survivors.filter(s=>s.deathAt!==undefined).length),4);
 await page.evaluate(()=>{window.fogbound.scene.paused=false;});await page.waitForFunction(()=>document.querySelector('#again'));
 assert.deepEqual(errors,[]);console.log({music,lockerView:true,fourSouls:true,delayedResults:true,errors});
}finally{await browser.close();}
