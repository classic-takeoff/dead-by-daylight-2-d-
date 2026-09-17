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
const desktop=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});await desktop.goto('http://127.0.0.1:5192'+prefix+'index.html');await desktop.waitForFunction(()=>window.fogbound?.scene?.art);assert.equal(await desktop.evaluate(()=>window.fogbound.scene.touch.enabled),false);await desktop.close();
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);assert.equal(await page.locator('#rotate-phone').isVisible(),true);await page.screenshot({path:'artifacts/phone-rotate.png'});
await page.setViewportSize({width:844,height:390});await page.locator('#launch').tap();await page.waitForFunction(()=>window.fogbound.match);await page.evaluate(()=>{const m=window.fogbound.match;m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.player,{x:620,y:650});});
assert.equal(await page.locator('[data-control=run]').count(),0);
const cdp=await context.newCDPSession(page),box=await page.locator('[data-control=move]').boundingBox(),origin={x:box.x+box.width/2,y:box.y+box.height/2};
const send=async(type,dx)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x:origin.x+dx,y:origin.y,radiusX:3,radiusY:3,force:1}]});
await send('touchStart',12);assert.equal(await page.evaluate(()=>window.fogbound.scene.touch.read().run),false);
await send('touchMove',32);assert.equal(await page.evaluate(()=>window.fogbound.scene.touch.read().run),true);
await send('touchMove',12);assert.equal(await page.evaluate(()=>window.fogbound.scene.touch.read().run),false);await send('touchEnd',0);
await page.locator('[data-control=crouch]').tap();await send('touchStart',32);await page.waitForTimeout(100);
console.log(await page.evaluate(()=>({state:window.fogbound.scene.touch.read(),paused:window.fogbound.scene.paused,portrait:window.fogbound.scene.touch.portrait,life:window.fogbound.match.player.life,time:window.fogbound.match.time,used:window.fogbound.scene.touch.used})));assert.equal(await page.evaluate(()=>window.fogbound.match.player.crouching),true);assert.equal(await page.evaluate(()=>window.fogbound.scene.touch.read().run),false);
await send('touchEnd',0);await page.evaluate(()=>{const m=window.fogbound.match;Object.assign(m.player,{x:400,y:320,angle:-Math.PI/2});Object.assign(m.killer,{x:400,y:240,angle:Math.PI/2});window.fogbound.scene.touch.configure('survivor',-Math.PI/2);});await page.locator('[data-control=crouch]').tap();await page.waitForTimeout(100);const sight=await page.evaluate(()=>{const m=window.fogbound.match;return [m.canSee(m.killer,m.player),m.canSee(m.player,m.killer)];});assert.deepEqual(sight,[false,true]);await page.screenshot({path:'artifacts/phone-crouch-cover.png'});
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);const time=await page.evaluate(()=>window.fogbound.match.time);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.fogbound.match.time),time);
await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>window.fogbound.match.time)>time);
assert.deepEqual(errors,[]);console.log({desktopUnchanged:true,portraitPaused:true,joystickPaces:true,crouchCover:sight,errors});await context.close();
}finally{await browser.close();server.close();}

