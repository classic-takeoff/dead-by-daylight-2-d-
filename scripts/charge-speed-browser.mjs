import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),prefix='/g/local/v/release/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.flac':'audio/flac','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}const file=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)));if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(file)]??'text/plain');res.end(readFileSync(file));});await new Promise(r=>server.listen(5192,'127.0.0.1',r));

const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const mobile of [false,true]){const context=await browser.newContext(mobile?{viewport:{width:844,height:390},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'}:{viewport:{width:1280,height:800}}),page=await context.newPage();await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('[data-role=killer]').click();await page.locator('#launch').click();await page.evaluate(()=>{const m=window.fogbound.match;m.survivorAI=()=>{};Object.assign(m.killer,{x:620,y:650});});
let cdp;if(mobile){cdp=await context.newCDPSession(page);const r=await page.locator('[data-control=attack]').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});}else{await page.mouse.move(900,400);await page.mouse.down();}
const start=await page.evaluate(()=>window.fogbound.match.time);await page.waitForFunction(()=>window.fogbound.match.killer.attackAt>0,{},{timeout:2000});const at=await page.evaluate(()=>window.fogbound.match.killer.attackAt);assert.ok(at-start>=.45&&at-start<.75,at-start);
await page.waitForTimeout(1800);assert.equal(await page.evaluate(()=>window.fogbound.match.killer.attackAt),at);
if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
console.log({mobile,autoReleaseSeconds:Math.round((at-start)*1000)/1000,oneAttack:true});await context.close();}}finally{await browser.close();server.close();}
