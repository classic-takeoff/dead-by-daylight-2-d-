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
await page.evaluate(()=>{const f=window.fogbound,m=f.match;f.scene.paused=true;m.terrain=[];Object.assign(m.player,{x:635,y:620});Object.assign(m.killer,{x:1600,y:1200});m.survivors.slice(1).forEach(s=>s.life='escaped');m.time=11;m.pallets=['up','down','broken'].flatMap((state,i)=>['y','x'].map((axis,j)=>({id:i*2+j,x:565+i*70,y:565+j*100,axis,state,droppedAt:10,dropSide:1,brokenAt:10})));});await page.waitForTimeout(100);await page.screenshot({path:'artifacts/pallet-states.png'});
for(const age of [0,.12,.27,.34]){await page.evaluate(age=>{const m=window.fogbound.match;m.pallets[0].state='down';m.pallets[0].droppedAt=10;m.time=10+age;},age);await page.waitForTimeout(60);await page.screenshot({path:'artifacts/pallet-drop-'+age+'.png'});}
assert.deepEqual(errors,[]);console.log({threeDistinctStates:true,bothAxes:true,dropFrames:4,errors});
}finally{await browser.close();server.close();}
