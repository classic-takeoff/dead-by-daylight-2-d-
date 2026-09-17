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
await page.waitForFunction(()=>window.fogbound.scene.soundFX.buffers.size===45);
const audio=await page.evaluate(()=>{const s=window.fogbound.scene,b=s.soundFX.buffers.get('chase-loop.wav');s.soundFX.chaseMusic(true);return {duration:b.duration,channels:b.numberOfChannels};});assert.equal(audio.duration,24);assert.equal(audio.channels,2);
const resolution=await page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return {width:c.width,cssWidth:r.width};});assert.ok(resolution.width/resolution.cssWidth>=1.49);
await page.evaluate(()=>{const f=window.fogbound,s=f.scene,m=f.match;s.paused=true;s.scene.pause();s.cameras.main.stopFollow();s.cameras.main.setZoom(2*s.renderDensity).centerOn(320,200);const sheet=s.add.graphics().setDepth(100);sheet.fillStyle(0x182120);sheet.fillRect(0,0,640,400);const art=s.art;s.art=sheet;m.time=10;m.terrain=[];
for(let row=0;row<2;row++)for(let col=0;col<4;col++){const p={id:row*4+col,x:85+col*155,y:110+row*160,axis:col%2?'x':'y',state:row?'down':'up',droppedAt:9},low=col<2;
const w=p.axis==='x'?{x:p.x-18,y:p.y-64,w:36,h:36,kind:'wall',low}:{x:p.x-64,y:p.y-18,w:36,h:36,kind:'wall',low};m.terrain.push(w);sheet.fillStyle(low?0x6e7568:0x4d5c54);sheet.fillRect(w.x,w.y,w.w,w.h);sheet.lineStyle(2,0x98a190);sheet.strokeRect(w.x,w.y,w.w,w.h);s.drawPallet(p,10);s.add.text(p.x-44,p.y+35,(low?'low ':'high ')+p.axis+' '+p.state,{fontSize:'10px',color:'#dddccc'}).setDepth(101);}
s.art=art;});await page.waitForTimeout(100);await page.screenshot({path:'artifacts/pallet-supports.png'});
await page.setViewportSize({width:1024,height:700});await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>Math.abs(document.querySelector('canvas').width/innerWidth-1.5)<.01));
console.log({resolution});
console.log({audio});
assert.deepEqual(errors,[]);console.log({uncannyPoses:8,errors});
}finally{await browser.close();server.close();}



