import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),prefix='/g/local/v/release/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.flac':'audio/flac','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}const file=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)));if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(file)]??'text/plain');res.end(readFileSync(file));});await new Promise(r=>server.listen(5192,'127.0.0.1',r));

const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('#launch').click();
const state=await page.evaluate(()=>{const f=window.fogbound,m=f.match,s=m.survivors[1];f.scene.paused=true;m.playerId=4;f.scene.viewId=4;
const stones=m.terrain.filter(w=>w.kind==='rock'),p=m.pallets.find(p=>stones.filter(w=>Math.hypot(p.x-Math.max(w.x,Math.min(w.x+w.w,p.x)),p.y-Math.max(w.y,Math.min(w.y+w.h,p.y)))<30).length===2);window.rockPallet=p.id;
m.survivors.filter(a=>a.id!==s.id).forEach((a,i)=>Object.assign(a,{x:1500+i*40,y:1200}));Object.assign(m.killer,{x:p.x-80,y:p.y+75,level:0});Object.assign(s,{x:p.x+(p.axis==='x'?-36:0),y:p.y+(p.axis==='x'?0:-36),level:0,velocity:p.axis==='x'?{x:112,y:0}:{x:0,y:112},movementAt:m.time});return {stones:stones.length,pallet:p.id};});
assert.equal(state.stones,6);await page.waitForTimeout(80);await page.screenshot({path:'artifacts/rock-pallet-up.png'});
await page.evaluate(()=>{const m=window.fogbound.match,p=m.pallets[window.rockPallet],s=m.survivors[1];p.state='down';m.navigate(s,{x:p.x+(p.axis==='x'?100:0),y:p.y+(p.axis==='x'?0:100)},1/60);});
for(const frame of [0,1,2,3]){const pose=await page.evaluate(frame=>{const m=window.fogbound.match;if(frame)m.step(.16);const s=m.survivors[1];return {action:s.action,kind:s.vaultKind,transition:s.transition};},frame);assert.equal(pose.action,'翻越');assert.equal(pose.kind,'pallet');assert.ok(pose.transition>0);await page.waitForTimeout(50);await page.screenshot({path:'artifacts/ai-vault-'+frame+'.png'});}
console.log({pairedStones:state.stones,AIAnimationFrames:4});
assert.deepEqual(errors,[]);console.log({errors});
}finally{await browser.close();server.close();}
