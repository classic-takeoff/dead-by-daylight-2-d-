import {readFileSync,writeFileSync} from 'node:fs';
const base='http://101.43.19.238';
const source='C:/Users/57861/.codex/sessions/2026/09/12/rollout-2026-09-12T02-34-34-01a091bf-ff80-7ab2-8e42-9e02e736b8ae.jsonl';
const prior=readFileSync(source,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(r=>r.type==='response_item'&&r.payload.role==='user').map(r=>r.payload.content?.map(c=>c.text??'').join('\n')??'').findLast(t=>t.includes(base)&&t.includes('API Token'));
const token=prior?.match(/API Token[：:]\s*(gh_[A-Za-z0-9]+)/)?.[1];if(!token)throw Error('GameHub credential unavailable');
async function api(path,options={}){const response=await fetch(base+path,{...options,redirect:'error',headers:{Authorization:`Bearer ${token}`,...options.headers},signal:AbortSignal.timeout(45000)});const body=await response.text();let data;try{data=JSON.parse(body);}catch{throw Error(`GameHub HTTP ${response.status}`);}if(!response.ok||data.error)throw Error(data.error??`HTTP ${response.status}`);return data;}
const mode=process.argv[2]??'inspect';
if(mode==='inspect'){
 const data=await api('/api/v1/projects');writeFileSync('artifacts/gamehub-projects.json',JSON.stringify(data,null,2));console.log(data.projects.map(p=>({id:p.id,title:p.title,published:p.published})));
 for(const path of ['/api/v1','/api/docs','/api/v1/docs','/developer']){const response=await fetch(base+path,{redirect:'manual',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});const body=await response.text();console.log({path,status:response.status,length:body.length});if(response.ok)writeFileSync('artifacts/gamehub-doc'+path.replaceAll('/','-')+'.txt',body);}
}
if(mode==='upload'){
 const title='我修我再修',projects=await api('/api/v1/projects'),existing=projects.projects.filter(p=>p.title===title);if(existing.length>1)throw Error('Duplicate project names');
 const form=new FormData();form.set('title',title);form.set('description','单人 1 对 4 像素生存追逐：选择求生者修理发电机、救援与逃生，或扮演持刀杀手追猎。支持板窗博弈、双层地形、鼠标视野和动态心跳。支持键鼠和手机双摇杆触控。');form.set('engine','html');form.set('published','1');form.set('entry_path','index.html');form.set('label','v40-shack-redlight-down-20260917');form.set('changelog','Red stain uses its own positive visibility mask and is fully hidden in dark/occluded regions while remaining visible in lit areas. White shack interior removes partitions, furniture, internal window and ground hook; generator joins the random pool and basement remains probabilistic. Two doors move near opposite corners; doorway pallet and exterior window retained. Four downed survivors no longer trigger instant defeat; crawling, pickup, open-exit escape, bleeding and normal end conditions continue. 144 tests and production build passed; browser pixel comparisons verified red stain masking and shack layout was visually checked.');form.set('file',new Blob([readFileSync('artifacts/gamehub-repair-again-v40.zip')],{type:'application/zip'}),'gamehub-repair-again-v40.zip');if(!existing.length)form.set('cover',new Blob([readFileSync('artifacts/release-cover.png')],{type:'image/png'}),'cover.png');
 const result=await api(existing.length?`/api/v1/projects/${existing[0].id}/versions`:'/api/v1/games',{method:'POST',body:form});writeFileSync('artifacts/gamehub-release.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
if(mode==='upload'||mode==='verify'){
 const {createHash}=await import('node:crypto'),{readdirSync}=await import('node:fs');const receipt=JSON.parse(readFileSync('artifacts/gamehub-release.json','utf8'));const game=receipt.game,entry=new URL(game.entry_url);if(entry.origin!==base||!entry.pathname.startsWith('/g/'))throw Error('Unexpected entry origin');const id=game.id??entry.pathname.split('/')[2];const project=await api(`/api/v1/projects/${id}`);if(project.project.title!=='我修我再修'||project.project.current_version_id!==(receipt.version?.id??game.current_version_id))throw Error('Project/version mismatch');
 const walk=(dir,prefix='')=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name,prefix+e.name+'/'):[prefix+e.name]);const files=walk('dist');const hash=b=>createHash('sha256').update(b).digest('hex');
 let checked=0;for(const file of files){const url=new URL(file.split('/').map(encodeURIComponent).join('/'),entry);const response=await fetch(url,{redirect:'error',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Missing deployed asset '+file);if(hash(Buffer.from(await response.arrayBuffer()))!==hash(readFileSync('dist/'+file)))throw Error('Deployed asset mismatch '+file);if(++checked%10===0)console.log({assets_checked:checked,total:files.length});}
 if(!process.argv.includes('--api-only')){const {chromium}=await import('@playwright/test');const browser=await chromium.launch({channel:'msedge',headless:true});try{const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(base+'/**',route=>route.continue({headers:{...route.request().headers(),Authorization:'Bearer '+token}}));await page.goto(entry.href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.fogbound?.scene?.art);await page.locator('#launch').click();await page.waitForFunction(()=>window.fogbound.scene.soundFX.buffers.size===45,null,{timeout:120000}).catch(async e=>{console.log({audio_loaded:await page.evaluate(()=>window.fogbound.scene.soundFX.buffers.size),errors});throw e;});await page.screenshot({path:'artifacts/gamehub-live.png'});if(errors.length)throw Error(errors.join('; '));console.log(JSON.stringify({live_browser:true,audio_samples:45}));}finally{await browser.close();}}
 console.log(JSON.stringify({verified:true,title:project.project.title,published:project.project.published,files:files.length,play_url:game.play_url,entry_url:entry.href,version_id:(receipt.version?.id??game.current_version_id)}));
}



















