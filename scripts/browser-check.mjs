import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.stack);});page.on('console',msg=>{if(msg.type()==='error')console.log('CONSOLE',msg.text());});
await page.goto('http://127.0.0.1:5186');
await page.screenshot({path:'artifacts/loading.png'});await page.waitForFunction(()=>window.fogbound?.scene?.art);
await page.screenshot({path:'artifacts/menu.png'});
await page.locator('#nav-guide').click();await page.locator('#close-panel').click();
await page.locator('#nav-settings').click();await page.locator('#volume').fill('20');await page.locator('#close-panel').click();
await page.locator('#launch').click();await page.waitForTimeout(300);
const initial=await page.evaluate(()=>({x:window.fogbound.match.player.x,y:window.fogbound.match.player.y}));
await page.keyboard.down('KeyD');await page.keyboard.down('Shift');await page.waitForTimeout(550);await page.keyboard.up('KeyD');await page.keyboard.up('Shift');
const moved=await page.evaluate(()=>window.fogbound.match.player.x);
if(moved<=initial.x+10)throw Error('Movement failed');
await page.screenshot({path:'artifacts/survivor.png'});
await page.keyboard.press('Escape');const time=await page.evaluate(()=>window.fogbound.match.time);await page.waitForTimeout(250);if(await page.evaluate(()=>window.fogbound.match.time)!==time)throw Error('Pause failed');await page.locator('#resume').click();
// Exercise a real hold interaction and its skill check.
await page.evaluate(()=>{const m=window.fogbound.match;const g=m.generators[0];m.player.x=g.x+30;m.player.y=g.y;m.nextSkill=.1;});
await page.keyboard.down('KeyE');await page.waitForFunction(()=>window.fogbound.match.skill!==null);
await page.waitForFunction(()=>{const s=window.fogbound.match.skill;return s&&s.value>s.start&&s.value<s.end;},{},{polling:10});await page.keyboard.press('Space');await page.keyboard.up('KeyE');
await page.keyboard.press('Escape');await page.locator('#quit').click();await page.locator('[data-role="killer"]').click();await page.locator('#launch').click();
await page.waitForTimeout(300);await page.mouse.move(1000,450);await page.mouse.click(1000,450);await page.screenshot({path:'artifacts/killer.png'});
// Both browser roles finish through the actual rules engine at fixed simulation steps.
for(const role of ['killer','survivor']){
 if(role==='survivor'){await page.keyboard.press('Escape');await page.locator('#quit').click();await page.locator('[data-role="survivor"]').click();await page.locator('#launch').click();}
 const result=await page.evaluate(()=>{const m=window.fogbound.match;for(let n=0;n<12000&&!m.finished;n++){const p=m.player;if(p.role==='killer')m.killerAI(.1);else m.survivorAI(p,.1);const action=p.action,progress=p.progress;m.step(.1);p.action=action;p.progress=progress;}return {finished:m.finished,repaired:m.repaired,hits:m.killer.stats.hits,states:m.survivors.map(s=>s.life)};});
 if(!result.finished)throw Error(`${role} never ended: ${JSON.stringify(result)}`);
 await page.waitForSelector('#again');await page.screenshot({path:`artifacts/result-${role}.png`});console.log(role,result);
 if(role==='killer'){await page.locator('#again').click();}
}
await page.locator('#back').click();await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(150);await page.screenshot({path:'artifacts/menu-720.png'});
const bottom=await page.locator('footer').evaluate(e=>e.getBoundingClientRect().bottom);if(bottom>722)throw Error(`Footer overflow: ${bottom}`);
await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(150);await page.screenshot({path:'artifacts/menu-1080.png'});
console.log({errors,moveDelta:moved-initial.x});await browser.close();if(errors.length)process.exit(1);
