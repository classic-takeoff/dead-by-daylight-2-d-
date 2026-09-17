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
for(const viewport of [{width:390,height:844},{width:844,height:390}]){
 const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:1}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5192'+prefix+'index.html');
 await page.waitForFunction(()=>window.fogbound?.scene?.art);
 await page.screenshot({path:'artifacts/mobile-menu-'+viewport.width+'.png'});
 await page.locator('#launch').tap();
 await page.evaluate(()=>{const m=window.fogbound.match;m.survivorAI=()=>{};m.killerAI=()=>{};Object.assign(m.player,{x:620,y:650});Object.assign(m.killer,{x:1080,y:650});});
 const controls=page.locator('#touch-controls');await controls.waitFor({state:'visible'});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
 for(const name of ['move','look','interact','space','run','crouch']){const r=await page.locator('[data-control="'+name+'"]').boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height,name);}
 const cdp=await context.newCDPSession(page);
 const pos=async name=>{const r=await page.locator('[data-control="'+name+'"]').boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};};
 const move=await pos('move'),look=await pos('look'),interact=await pos('interact');
 const send=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,p])=>({id,x:p.x,y:p.y,radiusX:3,radiusY:3,force:1}))});
 const points=[[1,{x:move.x+28,y:move.y}],[2,{x:look.x,y:look.y-28}],[3,interact]];
 await send('touchStart',points);await page.waitForTimeout(250);
 const input=await page.evaluate(()=>window.fogbound.scene.touch.read());assert.ok(input.dx>.9);assert.ok(input.interact);assert.ok(Math.abs(input.angle+Math.PI/2)<.05);
 await send('touchEnd',[]);assert.equal(await page.evaluate(()=>window.fogbound.scene.touch.read().dx),0);
 await page.screenshot({path:'artifacts/mobile-play-'+viewport.width+'.png'});
 await page.locator('.hud-pause').tap();assert.equal(await controls.isVisible(),false);await page.locator('#resume').tap();
 await send('touchStart',[[4,{x:move.x+28,y:move.y}]]);await send('touchCancel',[]);assert.equal(await page.evaluate(()=>window.fogbound.scene.touch.read().dx),0);
 await page.evaluate(()=>{const f=window.fogbound;f.scene.touch.configure('killer',0);const m=f.match;m.playerId=4;Object.assign(m.killer,{x:620,y:650,cooldown:0});});
 const attack=await pos('attack');await send('touchStart',[[5,attack]]);await page.waitForTimeout(1150);
 const attackAt=await page.evaluate(()=>window.fogbound.match.killer.attackAt);assert.ok(attackAt>0);
 await page.waitForTimeout(2000);assert.equal(await page.evaluate(()=>window.fogbound.match.killer.attackAt),attackAt);await send('touchEnd',[]);
 await page.evaluate(()=>{const f=window.fogbound,m=f.match;f.scene.viewId=4;Object.assign(m.killer,{x:205,y:710,angle:Math.PI,cooldown:0});m.powered=true;m.gates[0].progress=1;m.gates[0].openedAt=m.time-.7;f.scene.paused=true;});
 await page.screenshot({path:'artifacts/mobile-gate-'+viewport.width+'.png'});
 assert.deepEqual(errors,[]);console.log({viewport,multitouch:true,autoRelease:true,errors});await context.close();
}
}finally{await browser.close();server.close();}
