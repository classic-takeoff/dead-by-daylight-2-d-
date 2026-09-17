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
await page.evaluate(()=>{const f=window.fogbound,s=f.scene,m=f.match;s.paused=true;s.scene.pause();s.cameras.main.stopFollow();s.cameras.main.setZoom(2*s.renderDensity).centerOn(320,200);const sheet=s.add.graphics().setDepth(100);sheet.fillStyle(0x182120);sheet.fillRect(0,0,640,400);const art=s.art;s.art=sheet;m.time=10;
const states=['idle','walk','charge','attack','stun','wipe','carry','work'];
for(let row=0;row<2;row++)for(let col=0;col<4;col++){const state=states[row*4+col],a={...m.killer,x:80+col*155,y:110+row*170,angle:col*Math.PI/2,action:'',charge:0,cooldown:0,attackAt:0};if(state==='charge')a.charge=.8;if(state==='attack'){a.action='攻击';a.attackAt=9.86;a.attackCharge=1;a.attackAngle=a.angle;}if(state==='stun'){a.action='眩晕';a.cooldown=1;}if(state==='wipe'){a.cooldown=1;a.attackAt=9;a.wipeUntil=11;}if(state==='carry')a.carrying=0;
if(state==='work'){a.progress=.4;s.workerActor(a,a.x,a.y,{kind:'break',target:{x:a.x+20,y:a.y+20}});}else s.killerActor(a,a.x,a.y,state==='walk'?3:0,true);
s.add.text(a.x-35,a.y+48,state,{fontSize:'12px',color:'#dddccc'}).setDepth(101);}
s.art=art;});await page.waitForTimeout(100);await page.screenshot({path:'artifacts/uncanny-poses.png'});
console.log({audio});
assert.deepEqual(errors,[]);console.log({uncannyPoses:8,errors});
}finally{await browser.close();server.close();}



