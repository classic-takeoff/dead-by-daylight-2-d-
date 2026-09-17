import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),prefix='/g/local/v/release/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.flac':'audio/flac','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}const file=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)));if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(file)]??'text/plain');res.end(readFileSync(file));});await new Promise(r=>server.listen(5192,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});try{const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);assert.match(await page.title(),/我修我再修/);await page.screenshot({path:'artifacts/release-cover.png'});await page.locator('[data-role="killer"]').click();await page.locator('#launch').click();await page.waitForFunction(()=>window.fogbound.scene.soundFX.buffers.size===32);
const sounds=await page.evaluate(()=>{const f=window.fogbound.scene.soundFX,result=[];const original=f.sample.bind(f);f.sample=(name,...args)=>{result.push(name);return original(name,...args);};f.event('miss');f.event('hit');f.event('break');return {played:result,duration:[...f.buffers].filter(([n])=>n.endsWith('.mp3')).map(([name,b])=>({name,duration:b.duration}))};});assert.deepEqual(sounds.played,['stab but not hit.mp3','stab flesh.mp3','wood break.mp3']);
await page.evaluate(()=>{const {match:m,scene}=window.fogbound;m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.killer,{x:620,y:650});scene.paused=true;});
for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){await page.evaluate(angle=>{const a=window.fogbound.match.killer;a.angle=angle;a.charge=.8;},angle);await page.screenshot({path:`artifacts/release-arm-${Math.round(angle*100)}.png`});}
console.log({nestedDeployment:true,sounds,errors});assert.deepEqual(errors,[]);
}finally{await browser.close();server.close();}
