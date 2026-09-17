import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();await page.goto('http://127.0.0.1:5186');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('#launch').click();await page.waitForFunction(()=>window.fogbound.scene.soundFX.buffers.size===45);
const result=await page.evaluate(async()=>{
 const {scene}=window.fogbound;scene.paused=true;const sound=scene.soundFX,c=sound.context;sound.volume=.65;const analyser=c.createAnalyser();analyser.fftSize=2048;sound.output.connect(analyser);
 const measure=async run=>{await new Promise(r=>setTimeout(r,700));run();let rms=0;const data=new Float32Array(analyser.fftSize);for(let i=0;i<90;i++){await new Promise(r=>setTimeout(r,8));analyser.getFloatTimeDomainData(data);rms=Math.max(rms,Math.sqrt(data.reduce((sum,v)=>sum+v*v,0)/data.length));}return rms;};
 sound.work([{id:0,key:'heal:1',kind:'heal',elapsed:0,intensity:1}]);const healingLoop=sound.workLoops.get('heal:1')?.source.buffer===sound.buffers.get('healing.mp3');sound.work([]);const healingStops=!sound.workLoops.has('heal:1');
 const hit=await measure(()=>sound.event('hit'));
 const far=await measure(()=>{sound.lastBeat=-10;sound.ambient(100,.15,false);});
 const near=await measure(()=>{sound.lastBeat=-10;sound.ambient(100,.95,false);});
 const all=[...sound.buffers].map(([name,b])=>({name,duration:b.duration}));return {healingLoop,healingStops,hit,far,near,state:c.state,samples:all.length,flesh:all.filter(b=>b.name.includes('.wav'))};
});console.log(result);assert.equal(result.state,'running');assert.equal(result.healingLoop,true);assert.equal(result.healingStops,true);assert.ok(result.hit>.01);assert.ok(result.near>result.far*2);assert.equal(result.samples,45);await browser.close();
