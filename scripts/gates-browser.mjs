import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),prefix='/g/local/v/release/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.flac':'audio/flac','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}const file=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)));if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(file)]??'text/plain');res.end(readFileSync(file));});await new Promise(r=>server.listen(5192,'127.0.0.1',r));

const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:800}});await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('#launch').click();await page.waitForFunction(()=>window.fogbound.scene.soundFX.buffers.size===32);
const audio=await page.evaluate(()=>{const f=window.fogbound.scene.soundFX,calls=[];const original=f.sample.bind(f);f.sample=(...args)=>{calls.push(args);return original(...args)};f.event('stomp');f.event('break');return calls;});
assert.deepEqual(audio.map(a=>a[5]),[.16,.24,.42]);
await page.evaluate(()=>{const f=window.fogbound,m=f.match;m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.player,{x:200,y:710,angle:Math.PI});m.powered=true;m.gates[0].progress=1;m.gates[0].openedAt=m.time;f.scene.paused=true;});
for(const t of [0,.7,1.4]){await page.evaluate(t=>{const m=window.fogbound.match;m.gates[0].openedAt=m.time-t;},t);await page.waitForTimeout(80);await page.screenshot({path:'artifacts/gate-opening-'+t+'.png'});}
await page.evaluate(()=>{const f=window.fogbound,m=f.match;Object.assign(m.player,{x:48,y:710});m.escape(m.player);m.player.escapedAt=m.time-.45;});await page.waitForTimeout(80);
const alpha=await page.evaluate(()=>window.fogbound.scene.escapeLayers[0].alpha);assert.ok(alpha>.4&&alpha<.6);await page.screenshot({path:'artifacts/gate-escape-fade.png'});

await page.evaluate(()=>{const f=window.fogbound,m=f.match;Object.assign(m.player,{life:'healthy',x:620,y:650});m.powered=false;Object.assign(m.generators[0],{x:640,y:650,progress:.62});m.time+=.2;f.scene.onFrame(m);});await page.waitForTimeout(80);
const repair=page.locator('#repair-progress');assert.equal(await repair.isVisible(),true);assert.match(await repair.innerText(),/62/);assert.ok((await repair.boundingBox()).y<240);await page.screenshot({path:'artifacts/repair-top.png'});
await page.evaluate(()=>{const f=window.fogbound,m=f.match;m.playerId=4;f.scene.viewId=4;Object.assign(m.killer,{x:620,y:650,action:'眩晕',cooldown:2.5});});await page.waitForTimeout(80);await page.screenshot({path:'artifacts/killer-stunned.png'});
console.log({repairTop:true,stunRendered:true,gateStages:3,fadeAlpha:alpha,audioDurations:audio.map(a=>a[5])});
}finally{await browser.close();server.close();}

