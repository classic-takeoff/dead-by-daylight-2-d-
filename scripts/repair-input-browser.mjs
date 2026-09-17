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
for(const mobile of [false,true]){
const context=await browser.newContext(mobile?{viewport:{width:844,height:390},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'}:{viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('#launch').click();
await page.evaluate(()=>{const m=window.fogbound.match;m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.player,{x:620,y:650});Object.assign(m.generators[0],{x:650,y:650,level:0,progress:.4});m.nextSkill=100;});await page.waitForTimeout(150);
const progress=()=>page.evaluate(()=>window.fogbound.match.generators[0].progress);
if(!mobile){
 await page.mouse.move(640,400);await page.mouse.down({button:'right'});await page.waitForFunction(()=>window.fogbound.match.player.crouching);await page.mouse.up({button:'right'});await page.waitForFunction(()=>!window.fogbound.match.player.crouching);
 await page.keyboard.down('v');await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.fogbound.match.player.crouching),false);await page.keyboard.up('v');
 const before=await progress();await page.mouse.down();await page.waitForTimeout(300);console.log(await page.evaluate(()=>{const f=window.fogbound;return {paused:f.scene.paused,buttons:f.scene.input.activePointer.buttons,wasTouch:f.scene.input.activePointer.wasTouch,i:f.match.interaction(f.match.player),action:f.match.player.action,life:f.match.player.life}}));await page.mouse.up();assert.ok(await progress()>before);
 const stopped=await progress();await page.waitForTimeout(150);assert.equal(await progress(),stopped);
}else{
 const button=page.locator('[data-control=interact]');await button.tap();const before=await progress();await page.waitForTimeout(350);assert.ok(await progress()>before);assert.equal(await page.evaluate(()=>window.fogbound.scene.touch.read().interact),true);
 await button.tap();const stopped=await progress();await page.waitForTimeout(150);assert.equal(await progress(),stopped);
 await button.tap();await page.waitForTimeout(100);const box=await page.locator('[data-control=move]').boundingBox(),cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:box.x+box.width/2+22,y:box.y+box.height/2}]});await page.waitForTimeout(100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>window.fogbound.scene.touch.read().interact),false);
 const crouch=await page.locator('[data-control=crouch]').boundingBox();assert.ok(crouch.x>422);
 await button.tap();await page.waitForTimeout(100);await page.locator('#pause-btn').tap();assert.equal(await page.evaluate(()=>window.fogbound.scene.touch.read().interact),false);await page.locator('#resume').tap();
}
const box=await page.locator('#repair-progress').boundingBox();assert.ok(box.height<45&&box.width<=240);await page.screenshot({path:'artifacts/repair-input-'+(mobile?'phone':'desktop')+'.png'});assert.deepEqual(errors,[]);console.log({mobile,inputVerified:true,compact:box});await context.close();
}
}finally{await browser.close();server.close();}


