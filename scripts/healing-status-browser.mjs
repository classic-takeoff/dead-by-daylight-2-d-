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
const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('#launch').tap();await page.waitForFunction(()=>window.fogbound.match);
await page.evaluate(()=>{const m=window.fogbound.match;m.survivorAI=()=>{};m.killerAI=()=>{};m.terrain=[];Object.assign(m.survivors[0],{x:600,y:650});Object.assign(m.survivors[1],{x:625,y:650,life:'down',recover:.4,bleed:30});Object.assign(m.survivors[2],{x:600,y:675});Object.assign(m.survivors[3],{x:1500,y:1200});Object.assign(m.killer,{x:1100,y:1200});m.chaseUntil[2]=m.time+3;for(const id of [0,2])m.work(m.survivors[id],{kind:'heal',id:1,target:m.survivors[1],label:''},1.2);});await page.waitForTimeout(150);
assert.match(await page.locator('.direction-marker.heal').innerText(),/60%/);assert.equal(await page.locator('.direction-marker.heal progress').evaluate(el=>el.value),.6);assert.equal(await page.locator('.being-chased').count(),1);assert.equal(await page.locator('[data-survivor="1"] .bleed-track i').evaluate(el=>parseFloat(el.style.width))>45,true);await page.screenshot({path:'artifacts/mobile-shared-healing.png'});
await page.evaluate(()=>{const f=window.fogbound;f.match.playerId=1;f.scene.viewId=1;f.scene.touch.configure('survivor',0);});await page.waitForTimeout(150);assert.match(await page.locator('#prompt').innerText(),/治疗进度 60%/);assert.equal(await page.locator('.being-chased').count(),1);await page.screenshot({path:'artifacts/mobile-downed-healing.png'});assert.deepEqual(errors,[]);console.log({sharedHealingUI:true,bleedInRoster:true,singleChaseIcon:true,errors});await context.close();
}finally{await browser.close();server.close();}
