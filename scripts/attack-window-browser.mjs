import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),prefix='/g/local/v/release/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.flac':'audio/flac','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}const file=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)));if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(file)]??'text/plain');res.end(readFileSync(file));});await new Promise(r=>server.listen(5192,'127.0.0.1',r));

const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('[data-role=killer]').click();await page.locator('#launch').click();await page.waitForFunction(()=>window.fogbound.scene.soundFX.buffers.size===32);
await page.evaluate(()=>{const f=window.fogbound,m=f.match;m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.killer,{x:620,y:650,angle:0,charge:.8});f.scene.paused=true;});
await page.waitForTimeout(80);await page.screenshot({path:'artifacts/narrow-attack.png'});
await page.evaluate(()=>{const f=window.fogbound,m=f.match;m.playerId=0;f.scene.viewId=0;Object.assign(m.player,{x:1090,y:604,crouching:true,angle:Math.PI});Object.assign(m.killer,{x:1040,y:604,angle:0,charge:0});m.attack(1);m.step(.12,{dx:0,dy:0,crouch:true,run:false,interact:false,space:false,special:false,attack:false,charge:0,angle:Math.PI});f.scene.effects=m.events.filter(e=>e.type==='weapon-block').map(e=>({...e,until:m.time+.5}));f.scene.soundFX.event('weapon-block');});
await page.waitForTimeout(80);await page.screenshot({path:'artifacts/window-block.png'});assert.equal(await page.evaluate(()=>window.fogbound.match.player.life),'healthy');assert.deepEqual(errors,[]);console.log({narrowRendered:true,windowBlockRendered:true,errors});
}finally{await browser.close();server.close();}
