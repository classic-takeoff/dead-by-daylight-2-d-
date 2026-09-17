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
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('[data-role="killer"]').tap();await page.locator('#launch').tap();await page.waitForFunction(()=>window.fogbound.match);
 await page.evaluate(()=>{const m=window.fogbound.match;m.survivorAI=()=>{};m.killerAI=()=>{};m.terrain=[];Object.assign(m.killer,{x:600,y:650,cooldown:0});m.survivors.forEach((s,i)=>Object.assign(s,{x:1500+i*40,y:1200}));});
 assert.equal(await page.locator('[data-control=look]').count(),0);const attack=page.locator('[data-control=attack]'),special=page.locator('[data-control=special]');assert.equal(await attack.isVisible(),true);await page.waitForTimeout(120);assert.equal(await special.isVisible(),false);
 const box=await attack.boundingBox();assert.ok(box.x>700&&box.y>250&&box.y+box.height<=390);
 const zoom=await page.evaluate(()=>{const s=window.fogbound.scene,a=s.viewZoom(),enabled=s.touch.enabled;Object.defineProperty(s.touch,'enabled',{value:false,configurable:true});const b=s.viewZoom();Object.defineProperty(s.touch,'enabled',{value:enabled,configurable:true});return a/b;});assert.ok(Math.abs(zoom-.75)<.001);
 await page.evaluate(()=>{const m=window.fogbound.match;Object.assign(m.survivors[0],{x:630,y:650,life:'down'});});await special.waitFor({state:'visible'});assert.equal(await special.innerText(),'抱起');await special.tap();await page.waitForFunction(()=>window.fogbound.match.carried===0);await page.evaluate(()=>window.fogbound.match.killer.cooldown=2);await special.waitFor({state:'hidden'});
 await page.evaluate(()=>window.fogbound.match.killer.cooldown=0);await special.waitFor({state:'visible'});assert.equal(await special.innerText(),'放下');await special.tap();await page.waitForFunction(()=>window.fogbound.match.carried===null);
 await page.evaluate(()=>{const m=window.fogbound.match;m.killer.cooldown=0;m.emit('test','测试：发电机修复完成，位置已暴露');});await page.waitForTimeout(120);const toast=await page.locator('#toast').boundingBox();assert.ok(toast.y<80&&toast.y+toast.height<110,JSON.stringify(toast));await page.screenshot({path:'artifacts/mobile-top-alert-attack.png'});
 const cdp=await context.newCDPSession(page),move=await page.locator('[data-control=move]').boundingBox();const send=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 await page.evaluate(()=>{const m=window.fogbound.match;m.survivors.forEach((s,i)=>Object.assign(s,{x:1500+i*40,y:1200}));m.killer.cooldown=0;});
 await send('touchStart',[{id:1,x:move.x+move.width/2+28,y:move.y+move.height/2},{id:2,x:box.x+box.width/2,y:box.y+box.height/2}]);
 await send('touchMove',[{id:1,x:move.x+move.width/2+28,y:move.y+move.height/2},{id:2,x:box.x+box.width/2,y:box.y+box.height/2-25}]);
 const input=await page.evaluate(()=>window.fogbound.scene.touch.read());assert.ok(input.dx>.9&&input.charging&&Math.abs(input.angle+Math.PI/2)<.1);await page.waitForTimeout(650);assert.ok(await page.evaluate(()=>window.fogbound.match.killer.attackAt>0));await send('touchEnd',[]);
 await page.evaluate(()=>{const f=window.fogbound,m=f.match;m.playerId=0;f.scene.viewId=0;f.scene.touch.configure('survivor',0);m.hatch.open=true;Object.assign(m.player,{x:m.hatch.x,y:m.hatch.y,level:0,life:'down',cooldown:2});});await page.waitForTimeout(150);assert.match(await page.locator('[data-control=interact]').innerText(),/地窖/);await page.locator('[data-control=interact]').tap();await page.waitForFunction(()=>window.fogbound.match.actors[0].life==='escaped');
 assert.deepEqual(errors,[]);console.log({mobileAttackPosition:true,conditionalCarry:true,multitouchAttack:true,widerKillerView:true,topMessages:true,downedHatch:true,errors});await context.close();
}finally{await browser.close();server.close();}

