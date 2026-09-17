import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),prefix='/g/local/v/release/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.flac':'audio/flac','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}const file=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)));if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(file)]??'text/plain');res.end(readFileSync(file));});await new Promise(r=>server.listen(5192,'127.0.0.1',r));

const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('#launch').click();await page.waitForFunction(()=>window.fogbound.scene.soundFX.buffers.size===32);
await page.evaluate(()=>{const f=window.fogbound,m=f.match;m.survivorAI=()=>{};m.killerAI=()=>{};m.terrain=[];Object.assign(m.player,{x:620,y:650,level:0});Object.assign(m.generators[0],{x:650,y:650,level:0,progress:.5});m.nextSkill=100;window.blastSamples=[];const original=f.scene.soundFX.sample.bind(f.scene.soundFX);f.scene.soundFX.sample=(...args)=>{window.blastSamples.push(args[0]);return original(...args);};});
await page.keyboard.down('e');await page.waitForFunction(()=>window.fogbound.match.player.action==='repair:0');await page.evaluate(()=>{const m=window.fogbound.match;m.skill={actor:0,value:0,start:.5,end:.7};m.resolveSkill();});await page.waitForTimeout(120);assert.match(await page.locator('#repair-progress').innerText(),/3/);assert.equal(await page.evaluate(()=>window.fogbound.scene.soundFX.workLoops.size),0);const p=await page.evaluate(()=>window.fogbound.match.generators[0].progress);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.fogbound.match.generators[0].progress),p);
const samples=await page.evaluate(()=>window.blastSamples);for(const name of ['impactSoft_heavy_000','impactMetal_medium_000','impactWood_heavy_001','metalLatch'])assert.ok(samples.includes(name),name);
await page.screenshot({path:'artifacts/generator-cooldown.png'});await page.keyboard.up('e');assert.deepEqual(errors,[]);console.log({explosionLayers:true,workSoundStopped:true,allRepairLocked:true,errors});
}finally{await browser.close();server.close();}
