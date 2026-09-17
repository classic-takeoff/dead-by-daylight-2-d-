import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),prefix='/g/local/v/release/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.flac':'audio/flac','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}const file=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)));if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(file)]??'text/plain');res.end(readFileSync(file));});await new Promise(r=>server.listen(5192,'127.0.0.1',r));

const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5192'+prefix+'index.html');await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('#launch').click();
const world=JSON.parse(readFileSync('src/game-config.json','utf8')).world;
const snapshots=[];
for(let i=0;i<2;i++){if(i)await page.evaluate(()=>window.fogbound.start());const snap=await page.evaluate(()=>{const f=window.fogbound,m=f.match;f.scene.paused=true;Object.assign(m.player,{x:960,y:720});f.scene.cameras.main.setZoom(.57);return {seed:m.mapSeed,label:m.seedLabel,terrain:m.terrain,gates:m.gates,pallets:m.pallets.length};});snapshots.push(snap);await page.waitForTimeout(100);await page.screenshot({path:'artifacts/random-map-'+i+'.png'});}
assert.notEqual(snapshots[0].seed,snapshots[1].seed);assert.notDeepEqual(snapshots[0].terrain,snapshots[1].terrain);assert.match(await page.locator('.map-title small').innerText(),new RegExp(snapshots[1].label));await page.locator('#pause-btn').click();assert.match(await page.locator('#panel').innerText(),new RegExp(snapshots[1].label));assert.deepEqual(snapshots[0].gates,snapshots[1].gates);assert.equal(snapshots[0].pallets,23);await page.getByRole('button',{name:'继续对局',exact:true}).click();for(const area of ['shack','upstairs','basement','rocks']){await page.evaluate(({area,world})=>{const f=window.fogbound,m=f.match;f.scene.paused=true;m.player.transition=0;if(area==='shack'){const b=world.buildings[0];Object.assign(m.player,{x:b.x+b.w/2,y:b.y+b.h/2,level:0});}else if(area==='upstairs'){const b=world.upperFloor;Object.assign(m.player,{x:b.x+b.w/2,y:b.y+b.h/2,level:1});}else if(area==='rocks'){const r=world.rocks[0];Object.assign(m.player,{x:r.x-40,y:r.y+r.h/2,level:0});}else Object.assign(m.player,{x:m.basement.room.x+m.basement.room.w/2,y:m.basement.room.y+m.basement.room.h/2,level:-1});},{area,world});await page.waitForTimeout(100);await page.screenshot({path:'artifacts/expanded-'+area+'.png'});}assert.deepEqual(errors,[]);console.log({mapsDiffer:true,seeds:snapshots.map(s=>s.label),gatesFixed:true,pallets:23,errors});
}finally{await browser.close();server.close();}

