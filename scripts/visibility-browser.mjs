import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),prefix='/g/local/v/release/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.flac':'audio/flac','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}const file=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)));if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(file)]??'text/plain');res.end(readFileSync(file));});await new Promise(r=>server.listen(5192,'127.0.0.1',r));

const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('#launch').click();await page.evaluate(()=>{const f=window.fogbound;f.scene.paused=true;f.match.terrain=[];f.scene.drawGround();});
for(const [name,pos] of [['outside',{x:730,y:610,angle:0}],['window',{x:1040,y:604,angle:0}],['door',{x:920,y:680,angle:Math.PI/2}],['cover-left',{x:750,y:1095,angle:0}],['cover-above',{x:875,y:990,angle:Math.PI/2}],['cover-right',{x:1000,y:1095,angle:Math.PI}],['cover-below',{x:875,y:1200,angle:-Math.PI/2}]]){await page.evaluate(pos=>Object.assign(window.fogbound.match.player,pos),pos);await page.waitForTimeout(100);await page.screenshot({path:'artifacts/visibility-'+name+'.png'});}
const frames=await page.evaluate(async()=>{let n=0;const start=performance.now();await new Promise(resolve=>{const frame=()=>{n++;if(performance.now()-start>1000)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});return n;});assert.deepEqual(errors,[]);console.log({wallWindowDoorRendered:true,framesPerSecond:frames,errors});
}finally{await browser.close();server.close();}
